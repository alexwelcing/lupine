# `lupine_distill.odf`

Open Distillation Factory (ODF) promotion machinery.

## Purpose

This package holds the ATLAS-aware promotion gate and theorem-aware model-card emitter. It is the canonical Python implementation of the formal-verification check in the OperatorPack promotion pipeline.

## Key modules

| Module | Key classes / functions |
|---|---|
| `promotion_gate.py` | `evaluate_promotion()`, `evaluate()`, `CandidateMetadata`, `GateResult`, `PromotionDecision` |
| `model_card.py` | `emit_model_card()`, `ModelCard`, `TheoremInventory` |
| `schema_bridge.py` | `FormalContract`, re-exports of canonical schemas from `lupine_distill.schemas` |

## Import

```python
from lupine_distill.odf.promotion_gate import evaluate_promotion
from lupine_distill.odf.model_card import emit_model_card
```

## Example

```python
from lupine_distill.odf.promotion_gate import evaluate_promotion

result = evaluate_promotion({
    "model_id": "mace-mp-0",
    "distill_version": 1,
    "overall_uplift_pct": 7.5,
    "atlas_theorem_refs": [
        "OpenDistillationFactory.Materials.Theory.ContextSpecificProof",
    ],
    "formal_properties": ["scope_invariant"],
})
print(result.decision)  # "promote", "review", or "reject"
```

See [`python/README.md`](../../README.md) for the full package overview.
