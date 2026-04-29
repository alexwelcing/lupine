"""Stdin/stdout JSON bridge between the Rust `lupine-distill` engine and DSPy.

Protocol:
    Request:  one JSON object on stdin with a `command` discriminator
              (theorize | analyze | design | mine).
    Response: one JSON object on stdout
              {"success": bool, "command": str, "data": ..., "error": str?}.

The Rust caller (`lupine-distill/src/bridge/mod.rs`) parses the LAST line of
stdout that begins with `{`, so handlers may emit logging to stderr (or to
earlier stdout lines) without corrupting the response.

Per the architectural directive, every uncaught exception is converted to a
structured error response so the Rust orchestrator never panics on malformed
output.
"""

from __future__ import annotations

import json
import logging
import sys
import traceback
import uuid
from typing import Any, Callable

logger = logging.getLogger("lupine_dspy.bridge")


def _ok(command: str, data: Any) -> dict[str, Any]:
    return {"success": True, "command": command, "data": data}


def _err(command: str, message: str) -> dict[str, Any]:
    return {"success": False, "command": command, "error": message}


def _emit(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload, default=_json_default))
    sys.stdout.write("\n")
    sys.stdout.flush()


def _json_default(obj: Any) -> Any:
    """Serialize Pydantic models, enums, and other DSPy-typed outputs."""
    dump = getattr(obj, "model_dump", None)
    if callable(dump):
        return dump()
    if hasattr(obj, "value"):
        return obj.value
    if hasattr(obj, "__dict__"):
        return obj.__dict__
    return str(obj)


def _ensure_lm_configured() -> str:
    """Resolve and configure the active LM. Returns a display string."""
    from .models import resolve_model

    config = resolve_model()
    return config.model_string


# ─── Handlers ────────────────────────────────────────────────


def handle_theorize(req: dict[str, Any]) -> dict[str, Any]:
    """Generate a new hypothesis from manifold + summary statistics."""
    from .modules import TheoristModule
    from .schemas import ManifoldResult, UniversalAlignmentResult

    model = _ensure_lm_configured()
    logger.info("theorize via %s", model)

    element = str(req.get("element") or "all")
    summary = req.get("data_summary") or {}
    existing = list(req.get("existing_hypotheses") or [])

    manifolds: list[ManifoldResult] = []
    for m in summary.get("manifolds", []) or []:
        explained = m.get("explained_variance") or []
        manifolds.append(
            ManifoldResult(
                potential=str(m.get("label") or m.get("pair_style") or element),
                n_materials=int(m.get("n_potentials") or 0),
                n_properties=int(m.get("n_properties") or 0),
                participation_ratio=float(m.get("participation_ratio") or 0.0),
                top_eigenvalue_fraction=float(explained[0]) if explained else 0.0,
                is_hyper_ribbon=bool(m.get("is_ribbon")),
                principal_direction=list(m.get("principal_direction") or []),
            )
        )

    alignments: list[UniversalAlignmentResult] = []
    for a in summary.get("alignments", []) or []:
        cos = float(a.get("cosine_similarity") or 0.0)
        alignments.append(
            UniversalAlignmentResult(
                potential_a=str(a.get("potential_a") or ""),
                potential_b=str(a.get("potential_b") or ""),
                cosine_similarity=cos,
                is_aligned=abs(cos) > 0.9,
            )
        )

    theorist = TheoristModule()
    pred = theorist(
        manifold_results=manifolds,
        alignment_results=alignments,
        existing_hypotheses=existing,
        element_context=f"element={element}; totals={summary.get('totals', {})}",
    )
    h = pred.hypothesis

    return {
        "hypothesis_id": h.hypothesis_id or f"H-{uuid.uuid4().hex[:8]}",
        "type": h.hypothesis_type.value if hasattr(h.hypothesis_type, "value") else str(h.hypothesis_type),
        "title": (h.description or "").split(".")[0][:120],
        "description": h.description,
        "testable_prediction": h.testable_prediction,
        "required_experiments": list(h.required_experiments or []),
        "confidence": float(h.confidence),
        "model": model,
    }


def handle_analyze(req: dict[str, Any]) -> dict[str, Any]:
    """Screen for Simpson's paradox / ecological fallacy."""
    from .modules import CausalAnalystModule

    model = _ensure_lm_configured()
    logger.info("analyze via %s", model)

    element = str(req.get("element") or "all")
    error_vectors = req.get("error_vectors") or []
    correlations = req.get("correlations") or {}

    if isinstance(correlations, list):
        stratified: dict[str, float] = {}
        pooled = 0.0
        for entry in correlations:
            if not isinstance(entry, dict):
                continue
            if entry.get("group") in (None, "", "pooled"):
                pooled = float(entry.get("pearson_r") or pooled)
            else:
                stratified[str(entry["group"])] = float(entry.get("pearson_r") or 0.0)
    elif isinstance(correlations, dict):
        pooled = float(correlations.get("pooled") or correlations.get("pooled_r") or 0.0)
        stratified = {
            str(k): float(v)
            for k, v in (correlations.get("stratified") or correlations.get("by_group") or {}).items()
        }
    else:
        pooled = 0.0
        stratified = {}

    n_records = len(error_vectors) if isinstance(error_vectors, list) else 0
    summary_text = (
        f"element={element}; n_error_vectors={n_records}; "
        f"pooled_r={pooled:.4f}; stratified_groups={len(stratified)}"
    )

    causal = CausalAnalystModule()
    pred = causal(
        records_summary=summary_text,
        pooled_correlation=pooled,
        stratified_correlations=stratified,
    )

    return {
        "paradox_detected": bool(pred.paradox_detected),
        "explanation": str(pred.explanation),
        "recommended_stratification": list(pred.recommended_stratification or []),
        "pooled_correlation": pooled,
        "n_groups_examined": len(stratified),
        "model": model,
    }


def handle_design(req: dict[str, Any]) -> dict[str, Any]:
    """Design a maximally discriminative experiment."""
    from .modules import ExperimentDesignerModule
    from .schemas import Hypothesis, HypothesisType

    model = _ensure_lm_configured()
    logger.info("design via %s", model)

    hypothesis_id = str(req.get("hypothesis_id") or f"H-{uuid.uuid4().hex[:8]}")
    hypothesis_text = str(req.get("hypothesis_text") or "")
    available_elements = list(req.get("available_elements") or [])
    available_pair_styles = list(req.get("available_pair_styles") or [])

    hypothesis = Hypothesis(
        hypothesis_id=hypothesis_id,
        hypothesis_type=HypothesisType.HYPER_RIBBON,
        description=hypothesis_text,
        testable_prediction=hypothesis_text,
        required_experiments=[],
        confidence=0.5,
    )

    available = [f"{e}/{p}" for e in available_elements for p in available_pair_styles] or available_elements

    designer = ExperimentDesignerModule()
    pred = designer(
        hypothesis=hypothesis,
        available_potentials=available,
        completed_experiments=[],
    )
    exp = pred.experiment

    return {
        "experiment_id": exp.experiment_id,
        "element": exp.element,
        "potential_label": exp.potential_label,
        "pair_style": exp.pair_style,
        "structure": exp.structure.value if hasattr(exp.structure, "value") else str(exp.structure),
        "discriminative_property": exp.discriminative_property,
        "test_strategy": exp.test_strategy,
        "priority_score": float(exp.priority_score),
        "reasoning": str(pred.reasoning),
        "model": model,
    }


def handle_mine(req: dict[str, Any]) -> dict[str, Any]:
    """Extract benchmark records from a paper abstract."""
    from .modules import LiteratureMinerModule

    model = _ensure_lm_configured()
    logger.info("mine via %s", model)

    title = str(req.get("title") or "")
    abstract = str(req.get("abstract_text") or "")
    doi = req.get("doi")

    miner = LiteratureMinerModule()
    pred = miner(
        paper_text=f"Title: {title}\n\nAbstract: {abstract}",
        potential_label=title[:80] or "unknown",
        element="",
    )

    records = [
        {
            "element": r.element,
            "potential_id": r.potential_id,
            "potential_label": r.potential_label,
            "pair_style": r.pair_style,
            "property": r.property,
            "reference": float(r.reference),
            "predicted": float(r.predicted),
            "unit": r.unit,
        }
        for r in (pred.records or [])
    ]

    return {
        "doi": doi,
        "records": records,
        "confidence_notes": str(pred.confidence_notes),
        "n_extracted": len(records),
        "model": model,
    }


HANDLERS: dict[str, Callable[[dict[str, Any]], dict[str, Any]]] = {
    "theorize": handle_theorize,
    "analyze": handle_analyze,
    "design": handle_design,
    "mine": handle_mine,
}


def main() -> int:
    logging.basicConfig(
        level=logging.WARNING,
        stream=sys.stderr,
        format="%(asctime)s [bridge] %(levelname)s %(name)s: %(message)s",
    )

    raw = sys.stdin.read().strip()
    if not raw:
        _emit(_err("", "empty stdin — bridge expects one JSON request"))
        return 1

    try:
        req = json.loads(raw)
    except json.JSONDecodeError as exc:
        _emit(_err("", f"invalid JSON on stdin: {exc}"))
        return 1

    if not isinstance(req, dict):
        _emit(_err("", "request must be a JSON object with a `command` field"))
        return 1

    command = str(req.get("command") or "")
    handler = HANDLERS.get(command)
    if handler is None:
        _emit(_err(command, f"unknown command '{command}'. allowed: {sorted(HANDLERS)}"))
        return 1

    try:
        data = handler(req)
        _emit(_ok(command, data))
        return 0
    except Exception:
        tb = traceback.format_exc()
        logger.error("handler '%s' failed:\n%s", command, tb)
        _emit(_err(command, tb))
        return 1


if __name__ == "__main__":
    sys.exit(main())
