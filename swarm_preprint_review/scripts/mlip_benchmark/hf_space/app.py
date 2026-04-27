"""glim-mlip-bench — HF ZeroGPU Space exposing MLIP elastic predictions.

Deployed at: huggingface.co/spaces/<HF_USERNAME>/glim-mlip-bench
Hardware: ZeroGPU (A100 40 GB, shared queue, ~5 min/call max — free for HF Pro)

Two endpoints, both callable as Gradio JSON APIs:
  predict        — single (element, mlip) → ElasticResult dict
  predict_batch  — comma-separated elements + mlips → list of records

The records returned by `predict_batch` follow the exact `BenchmarkRecord`
schema used by the glim-think worker's `/ingest/batch` route, so the output
of one Space call can be POSTed straight to the worker without massaging.

Why this exists: the local Python 3.14 / ASE / spglib environment on the
dev workstation is broken; CI installs of CHGNet/MACE/M3GNet take 5 min of
cold cache time per workflow run; and the worker can't run PyTorch. A
ZeroGPU Space owns the heavy compute substrate once, and everything else
calls it via HTTP.
"""
from __future__ import annotations

import os

import gradio as gr

# `calculators.py` and `elastic.py` are vendored next to this file so the
# Space is self-contained (the originals live one directory up in the parent
# repo at swarm_preprint_review/scripts/mlip_benchmark/, and are kept in sync
# at deploy time).
from elastic import ElasticResult, elastic_constants

try:
    import spaces  # type: ignore  # provided by HF Spaces runtime when ZeroGPU is enabled
    HAS_SPACES = hasattr(spaces, "GPU")
except ImportError:
    HAS_SPACES = False

# Default MLIP set surfaced in the UI; the API accepts any id from
# calculators.CALCULATORS regardless of UI selection.
DEFAULT_MLIPS = ("chgnet", "mace_mp0", "m3gnet")
DEFAULT_ELEMENTS = ("Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb",
                    "Fe", "Cr", "Mo", "W", "V", "Nb", "Ta")

# Cache loaded calculators so successive ZeroGPU calls in the same session
# don't pay model-download cost twice. Keys are MLIP ids.
_CALC_CACHE: dict[str, object] = {}


def _gpu_decorator(fn):
    """Apply @spaces.GPU when the Space runtime is available; identity otherwise.

    `duration` chosen for worst-case (MACE-MP-0 cold cache + relax + elastic)
    of one element. Batch endpoint multiplies internally and re-applies.
    """
    if HAS_SPACES:
        return spaces.GPU(duration=120)(fn)
    return fn


def _get_calculator(mlip_id: str):
    """Lazy-init + cache the ASE Calculator for the requested MLIP."""
    if mlip_id in _CALC_CACHE:
        return _CALC_CACHE[mlip_id]
    from calculators import make_calculator
    calc = make_calculator(mlip_id)
    _CALC_CACHE[mlip_id] = calc
    return calc


def _result_to_record(result: ElasticResult, mlip_id: str, mlip_label: str,
                      references: dict[str, float] | None) -> list[dict]:
    """Convert one ElasticResult into BenchmarkRecord dicts ready for ingest."""
    from datetime import datetime, timezone
    ts = datetime.now(timezone.utc).isoformat()
    safe_ts = ts.replace(":", "-").replace(".", "-")
    refs = references or {}
    pred_map: list[tuple[str, float, str]] = [
        ("C11", result.c11, "GPa"),
        ("C12", result.c12, "GPa"),
        ("C44", result.c44, "GPa"),
        ("a0",  result.a0,  "A"),
    ]
    out = []
    for prop, predicted, unit in pred_map:
        ref = refs.get(prop)
        if ref is None:
            continue
        out.append({
            "recordId": f"mlip_{mlip_id}_{result.element}_{prop}_{safe_ts}",
            "element": result.element,
            "potentialId": mlip_id,
            "potentialLabel": mlip_label,
            "pairStyle": "mlip",
            "property": prop,
            "reference": ref,
            "predicted": predicted,
            "unit": unit,
            "provenance": {
                "source": "hf_space/glim-mlip-bench",
                "structure": result.structure,
                "harness_version": "0.1.0",
            },
            "agentId": "hf_space_runner",
            "timestamp": ts,
        })
    return out


@_gpu_decorator
def predict(element: str, mlip: str = "chgnet") -> dict:
    """Predict elastic constants for one (element, MLIP) pair.

    Returns: {element, mlip, structure, a0, c11, c12, c44, energy_per_atom}
    On error: {error: "...", element, mlip}
    """
    try:
        calc = _get_calculator(mlip)
        result = elastic_constants(element, calc)
        return {
            "element": result.element,
            "mlip": mlip,
            "structure": result.structure,
            "a0": result.a0,
            "c11": result.c11,
            "c12": result.c12,
            "c44": result.c44,
            "energy_per_atom": result.energy_per_atom,
        }
    except Exception as e:  # noqa: BLE001 — propagate to caller as JSON
        return {"error": str(e), "element": element, "mlip": mlip}


@_gpu_decorator
def predict_batch(elements_csv: str, mlips_csv: str = "chgnet",
                  references_json: str = "{}") -> list[dict]:
    """Predict elastic constants for a Cartesian product of elements × mlips.

    `references_json`: optional JSON string of {element: {prop: ref_value}};
    when provided, the output is BenchmarkRecord dicts (ready for /ingest/batch)
    instead of raw ElasticResults.

    Returns: list of records (one per element × mlip × property when references
    are provided; otherwise one per element × mlip).
    """
    import json
    elements = [e.strip() for e in elements_csv.split(",") if e.strip()]
    mlips = [m.strip() for m in mlips_csv.split(",") if m.strip()]
    try:
        refs = json.loads(references_json) if references_json.strip() else {}
    except json.JSONDecodeError:
        refs = {}

    out: list[dict] = []
    for mlip in mlips:
        try:
            calc = _get_calculator(mlip)
        except Exception as e:  # noqa: BLE001
            for el in elements:
                out.append({"error": f"calculator init: {e}", "element": el, "mlip": mlip})
            continue
        for el in elements:
            try:
                result = elastic_constants(el, calc)
                if refs.get(el):
                    label = f"{mlip} (HF Space)"
                    out.extend(_result_to_record(result, mlip, label, refs[el]))
                else:
                    out.append({
                        "element": result.element, "mlip": mlip,
                        "structure": result.structure, "a0": result.a0,
                        "c11": result.c11, "c12": result.c12, "c44": result.c44,
                    })
            except Exception as e:  # noqa: BLE001
                out.append({"error": str(e), "element": el, "mlip": mlip})
    return out


with gr.Blocks(title="glim-mlip-bench") as demo:
    gr.Markdown(
        "# glim-mlip-bench\n"
        "Predict elastic constants (C11, C12, C44, a0) for cubic metals "
        "using foundation MLIPs.\n\n"
        "**Models:** CHGNet · MACE-MP-0 · M3GNet · ASE EMT (smoke)\n"
        "**Elements:** " + ", ".join(DEFAULT_ELEMENTS) + "\n\n"
        "Companion to the [Lupine Materials Science](https://github.com/alexwelcing/lupine) "
        "research pipeline. Output records match the glim-think worker's "
        "`BenchmarkRecord` schema and can be POSTed directly to "
        "`/ingest/batch`."
    )
    with gr.Tab("Single prediction"):
        single_element = gr.Dropdown(choices=list(DEFAULT_ELEMENTS), value="Al", label="element")
        single_mlip = gr.Dropdown(choices=list(DEFAULT_MLIPS) + ["emt"], value="chgnet", label="mlip")
        single_out = gr.JSON(label="result")
        single_btn = gr.Button("Predict", variant="primary")
        single_btn.click(fn=predict, inputs=[single_element, single_mlip],
                         outputs=single_out, api_name="predict")
    with gr.Tab("Batch prediction"):
        batch_elements = gr.Textbox(value=",".join(DEFAULT_ELEMENTS), label="elements (comma-separated)")
        batch_mlips = gr.Textbox(value="chgnet", label="mlips (comma-separated)")
        batch_refs = gr.Textbox(value="{}",
                                label="references JSON (optional — when provided, output is BenchmarkRecord schema)")
        batch_out = gr.JSON(label="records")
        batch_btn = gr.Button("Predict batch", variant="primary")
        batch_btn.click(fn=predict_batch, inputs=[batch_elements, batch_mlips, batch_refs],
                        outputs=batch_out, api_name="predict_batch")

if __name__ == "__main__":
    demo.queue().launch()
