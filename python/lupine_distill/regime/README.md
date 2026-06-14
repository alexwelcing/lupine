# `lupine_distill.regime`

A-priori regime gating for distill ribbons.

## Purpose

The post-hoc `lupine_distill.uplift` gate measures gain against an oracle and then promotes, reviews, or rejects. This package is its upstream complement: it decides whether a ribbon may apply *at all* from the ribbon's provenance alone, with no oracle. It is the safety filter that makes distill safe on novel materials and the diagnose-fix-re-prove loop repeatable.

The gate is grounded in the proven negative-transfer theorem (T3, `ContextSpecificProof.context_correction_does_not_transfer`).

## Key modules

| Module | Key classes / functions |
|---|---|
| `gate.py` | `regime_gate()`, `RibbonProvenance`, `CellFingerprint`, `GateDecision`, `parse_reference_family()`, `parse_metric_kind()` |
| `score.py` | `score_gate()`, `DominanceReport`, `ScoredCell` |

## Import

```python
from lupine_distill.regime import RibbonProvenance, CellFingerprint, regime_gate
from lupine_distill.regime.score import score_gate, DominanceReport
```

## Example

```python
from lupine_distill.regime import RibbonProvenance, CellFingerprint, regime_gate

provenance = RibbonProvenance(
    ribbon_id="ni-stress-v1",
    reference_families=frozenset({"mptrj_dft"}),
    fit_rows=frozenset({"Ni-fcc"}),
    calibration_band={"gpa_mae": (0.1, 5.0)},
)
fp = CellFingerprint(
    material="Ni",
    row="Ni-fcc",
    mlip="mace-mp-0",
    reference_family="mptrj_dft",
    metric_kind="gpa_mae",
    baseline_error=2.0,
)
print(regime_gate(provenance, fp).decision)  # "apply", "review", or "refuse"
```

See [`python/README.md`](../../README.md) for the full package overview.
