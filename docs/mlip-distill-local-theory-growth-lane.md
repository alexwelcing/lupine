> ⚠️ **Provisional — replay-only candidate.** The v3 row-hybrid policy described here
> has passed local replay only. It is not a promoted cloud policy until a fresh Cloud Run
> canary confirms the same no-regression verdict with the new policy hash.

# MLIP Distill Local Theory Growth Lane

## Why

The support-floor v2 canary is a production candidate because it preserved the
six MPtrj broad-DFT wins and turned CHGNet negative transfer into a safe
refusal. It is not the ceiling. The next ribbon should chase larger physical
accuracy lift while treating every Lean/Kimi mismatch as a proof obligation that
must either become a runtime signal or be explicitly scoped out.

## Current Evidence

- Cloud canary: `mptrj-dft-broad-paired-accuracy-v1`, promotion-canary scope.
- Result: 16 / 16 cells complete, 8 paired comparisons measured, 6 improved,
  2 unchanged, 0 regressed.
- The improved pairs are MACE-MP-0, ORB-v3, and SevenNet on energy-volume and
  relaxation-stability.
- CHGNet is unchanged because `min_ribbon_support_error_before = 0.05` blocks a
  residual ribbon when the backend already sits close to the DFT support labels.
- Local row-hybrid v3 replay:
  `library-site/src/reports/assets/mlip/mptrj-broad-dft-row-hybrid-v3-replay-summary.json`.
  Result: 8 / 8 pairs measured, 6 improved, 2 unchanged, 0 regressed, mean pair
  lift `25.57%`. This preserves v2 energy wins and adds a relaxation-specific
  override for larger MACE/ORB/SevenNet relaxation gains.

## What Changes For v3

The local hill-climb now scores candidates by more than mean normalized
accuracy:

- `relative_lift_mean`: row-native physical error reduction, so large material
  improvements matter.
- `relative_lift_min` and `accuracy_delta_min`: worst-case local damage.
- `regression_rate`: any case-level regression is visible and heavily penalized.
- `group_relative_lift_mean`, `group_relative_lift_min`, and
  `group_regression_rate`: the same idea aggregated at the published cell/pair
  surface, so local search cannot optimize away from the report contract.
- `theorem_development_lanes`: each candidate report records the Kimi/Lean lane
  it is trying to satisfy.

This keeps the loop honest: a ribbon cannot hide one bad backend behind a strong
average.

## Lean Errors As Development Fuel

The Kimi Lean project currently fails before theorem checking on type/import
drift in `MLIPAcceleration/CoreDefinitions.lean`: unknown `Real`, missing
`Real.sqrt`, unresolved `Nat`/natural-number instances, and definitions such as
`MPLayer`, `FoundationMLIP`, and `layerwiseDistance` not being available when
later terms need them.

Those are not release blockers for Distill Accuracy. They are valuable because
they identify the missing bridge:

| Lean/Kimi obligation | Runtime proxy now | v3 development target |
| --- | --- | --- |
| Vandermonde / thin residual spectrum | residual ribbon PR, eigenvalues, matrix rank | Prefer candidates with stable low-rank support residuals. |
| Two-mode inference | support/eval distance, ribbon feature distance | Correct inside the tube; refuse outside it. |
| Accuracy commitment | per-case lift, no-regression gate | Optimize worst-case-safe gain locally before cloud spend. |
| Layerwise acceleration | currently `outer_loop_proxy` | Defer exact layer hooks until a backend adapter exposes descriptors. |

## Local Iteration Command

Use completed cloud artifacts as sealed local replay cases:

```powershell
python tools\mlip_distill_growth_loop.py `
  --campaign data\mlip_benchmarks\evidence_campaigns\mptrj_lane_b_paired_accuracy_v1.json `
  --scope promotion-canary `
  --objective accuracy `
  --rounds 5 `
  --beam-width 8 `
  --report-top-k 24 `
  --weight-mode high-error `
  --atlas-distill-bin atlas-distill\target\release\atlas-distill.exe `
  --out-dir tmp\mlip-distill-growth\mptrj-v3-local-theory-lane
```

Cloud promotion remains gated:

- no pair-level regression;
- positive mean relative lift;
- no increase in CHGNet error;
- theorem lanes present in the report;
- replay green before any GCP rerun.

Case-level regressions are tracked separately as a theory-development signal.
They do not automatically block a pair-level candidate, but they point to the
next feature-distance/refusal refinement.

The row-hybrid v3 candidate has passed replay only. It should remain a candidate
until a fresh Cloud Run canary confirms the same 6 improved / 2 unchanged /
0 regressed verdict with the new policy hash.
