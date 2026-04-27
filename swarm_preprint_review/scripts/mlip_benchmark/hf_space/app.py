"""glim-mlip-bench - HF ZeroGPU Space exposing MLIP elastic predictions."""
from __future__ import annotations
import os
import gradio as gr
from elastic import ElasticResult, elastic_constants

try:
    import spaces
    HAS_SPACES = hasattr(spaces, "GPU")
except ImportError:
    HAS_SPACES = False

DEFAULT_MLIPS = ("chgnet", "mace_mp0", "m3gnet")
DEFAULT_ELEMENTS = ("Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb",
                    "Fe", "Cr", "Mo", "W", "V", "Nb", "Ta")
_CALC_CACHE: dict[str, object] = {}


def _gpu_decorator(fn):
    if HAS_SPACES:
        return spaces.GPU(duration=120)(fn)
    return fn


def _get_calculator(mlip_id: str):
    if mlip_id in _CALC_CACHE:
        return _CALC_CACHE[mlip_id]
    from calculators import make_calculator
    calc = make_calculator(mlip_id)
    _CALC_CACHE[mlip_id] = calc
    return calc


def _result_to_record(result: ElasticResult, mlip_id: str, mlip_label: str,
                      references: dict[str, float] | None) -> list[dict]:
    from datetime import datetime, timezone
    ts = datetime.now(timezone.utc).isoformat()
    refs = references or {}
    pred_map = [("C11", result.c11, "GPa"), ("C12", result.c12, "GPa"),
                ("C44", result.c44, "GPa"), ("a0", result.a0, "A")]
    records = []
    for prop, pred, unit in pred_map:
        ref = refs.get(prop)
        record = {
            "record_id": f"{result.element}_{mlip_id}_{prop}_{ts.replace(':','-').replace('.','-')}",
            "element": result.element,
            "potential_id": mlip_id,
            "potential_label": mlip_label,
            "pair_style": "mlip",
            "property": prop,
            "reference": ref,
            "predicted": pred,
            "unit": unit,
            "provenance": "hf-space",
            "agent_id": "glim-mlip-bench",
            "timestamp": ts,
        }
        if ref is not None:
            record["error"] = (pred - ref) / ref if ref != 0 else None
        records.append(record)
    return records


def predict(element: str, mlip: str = "chgnet"):
    try:
        calc = _get_calculator(mlip)
        result = elastic_constants(element, calc)
        return {
            "element": result.element,
            "structure": result.structure,
            "a0": result.a0,
            "c11": result.c11,
            "c12": result.c12,
            "c44": result.c44,
        }
    except Exception as e:
        return {"error": str(e), "element": element, "mlip": mlip}


@_gpu_decorator
def predict_batch(elements_csv: str, mlips_csv: str = "chgnet",
                  references_json: str = "{}") -> list[dict]:
    import json
    elements = [e.strip() for e in elements_csv.split(",") if e.strip()]
    mlips = [m.strip() for m in mlips_csv.split(",") if m.strip()]
    refs = json.loads(references_json) if references_json.strip() else {}
    out: list[dict] = []
    for mlip in mlips:
        try:
            calc = _get_calculator(mlip)
        except Exception as e:
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
                    out.append({"element": result.element, "mlip": mlip,
                                "structure": result.structure, "a0": result.a0,
                                "c11": result.c11, "c12": result.c12, "c44": result.c44})
            except Exception as e:
                out.append({"error": str(e), "element": el, "mlip": mlip})
    return out


with gr.Blocks(title="glim-mlip-bench") as demo:
    gr.Markdown("# glim-mlip-bench\nZeroGPU MLIP elastic-constant predictions (C11, C12, C44, a0)")
    with gr.Tabs():
        with gr.TabItem("Single prediction"):
            single_element = gr.Dropdown(choices=list(DEFAULT_ELEMENTS), value="Al", label="element")
            single_mlip = gr.Dropdown(choices=list(DEFAULT_MLIPS) + ["emt"], value="chgnet", label="mlip")
            single_out = gr.JSON(label="result")
            single_btn = gr.Button("Predict", variant="primary")
            single_btn.click(fn=predict, inputs=[single_element, single_mlip],
                             outputs=single_out, api_name="predict")
        with gr.TabItem("Batch prediction"):
            batch_elements = gr.Textbox(value=",".join(DEFAULT_ELEMENTS), label="elements (comma-separated)")
            batch_mlips = gr.Textbox(value="chgnet", label="mlips (comma-separated)")
            batch_refs = gr.Textbox(value="{}", label="references JSON")
            batch_out = gr.JSON(label="records")
            batch_btn = gr.Button("Predict batch", variant="primary")
            batch_btn.click(fn=predict_batch, inputs=[batch_elements, batch_mlips, batch_refs],
                            outputs=batch_out, api_name="predict_batch")

if __name__ == "__main__":
    demo.launch()
