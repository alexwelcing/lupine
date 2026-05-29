# MLIP Spectral v4 Foundation Gate

Status: foundation locked for diagnostic replay; not a policy claim; not a
universality claim.

## Purpose

Spectral v4 exists to test a specific hyper-ribbon prediction before we build a
new correction policy or spend on another Cloud Run canary:

> The useful correction signal for energy-volume should concentrate in the
> orthogonal complement of the stiff feature axis, while stiff-axis motion should
> stay bounded.

The first diagnostic artifact supports that prediction on the completed
MPtrj broad-DFT promotion canary, but it is deliberately scoped as replay
evidence. It does not authorize a policy claim, a cloud canary, or any claim
that the manifold is universal.

## Frozen Artifact Contract

Artifact schema: `lupine.distill.subspace_diagnostic.v1`

Current artifact:

`library-site/src/reports/assets/mlip/mptrj-spectral-v4-subspace-diagnostics.json`

Required boundaries:

- `diagnostic_scope` must be `completed_cloud_artifact_replay_no_training_claim`.
- `basis_space` must be `feature`.
- `ribbon_version` must be `hyperribbon-mptrj-spectral-v4`.
- `summary.policy_claim_allowed` must be `false`.
- `summary.cloud_canary_allowed` must be `false`.
- `summary.universal_manifold_claim_allowed` must be `false`.
- `summary.universality_gate_status` must be `blocked_by_surface_area`.
- `summary.coverage` must state the exact canary surface area.
- Every fitted cell must include complement fraction, stiff-axis fraction,
  projection distance, projected support lift, participation ratio, singular
  values, and theorem-development lanes.

Required theorem lanes:

- `stiff_axis_preservation`
- `orthogonal_complement_lift`
- `projection_tube_refusal`
- `vandermonde_decay`

## Locked Result

The May 27, 2026 diagnostic over completed MPtrj promotion-canary baseline
artifacts produced:

- `8 / 8` cells measured.
- Coverage: `4 mlips x 2 calculation types`.
- Overall mean complement residual fraction: `0.7253151505`.
- Overall mean stiff-axis residual fraction: `0.2746848495`.
- `6 / 8` cells complement-supported at threshold `0.5`.
- Foundation gate: `locked`.
- Universality gate: `blocked_by_surface_area`.
- Universal manifold claim allowed: `false`.
- Validation: `passed`.

The energy-volume row is the breakthrough lane:

| MLIP | Complement Residual Fraction | Stiff-Axis Residual Fraction |
| --- | ---: | ---: |
| MACE-MP-0 | `0.9869584089` | `0.0130415911` |
| CHGNet | `0.9999834801` | `0.0000165199` |
| ORB-v3 | `0.9935789283` | `0.0064210717` |
| SevenNet | `0.9985869322` | `0.0014130678` |

Energy-volume row summary:

- `4 / 4` measured MLIPs are complement-supported.
- Mean complement residual fraction: `0.9947769374`.
- Minimum complement residual fraction: `0.9869584089`.
- Mean projected support lift: `0.4968439286`.
- Interpretation: `projected_ribbon_candidate`.

Relaxation is not yet a single clean projected lane:

- `2 / 4` measured MLIPs are complement-supported.
- Mean complement residual fraction: `0.4558533637`.
- Interpretation: `mixed_or_stiff_axis_dominated`.

This distinction matters. v4 should initially treat energy-volume as the clean
projected-ribbon candidate and force relaxation through refusal or a separate
row-specific lane where the stiff-axis component dominates.

## What This Does Not Prove

This artifact does not prove manifold universality. The current surface area is
too small:

- MLIPs measured: MACE-MP-0, CHGNet, ORB-v3, SevenNet.
- Calculation types measured: energy-volume and relaxation-stability.
- Missing rows from the full 5x5 baseline: forces, stress, elastic constants.
- Missing or held MLIPs include M3GNet and UMA.

The correct public wording is:

> In the MPtrj promotion-canary replay, energy-volume residual correction signal
> concentrates in the orthogonal complement across four measured MLIPs.

The incorrect wording is:

> The hyper-ribbon manifold is universal across MLIPs and calculation types.

## Reproducible Commands

Regenerate the artifact from completed cloud baseline artifacts:

```powershell
python tools/mlip_subspace_diagnostics.py `
  --campaign data/mlip_benchmarks/evidence_campaigns/mptrj_lane_b_paired_accuracy_v1.json `
  --scope promotion-canary `
  --variant-id baseline `
  --output library-site/src/reports/assets/mlip/mptrj-spectral-v4-subspace-diagnostics.json
```

Validate without reading cloud artifacts:

```powershell
python tools/mlip_subspace_diagnostics.py `
  --validate library-site/src/reports/assets/mlip/mptrj-spectral-v4-subspace-diagnostics.json `
  --fail-on-validation-error
```

The validation output must be:

```json
{
  "schema": "lupine.distill.subspace_diagnostic.validation.v1",
  "status": "passed",
  "errors": []
}
```

## Promotion Boundary

Do not run a Cloud Run canary from this artifact alone.

The next gate is a local projected-ribbon replay over the same completed cloud
artifacts. That replay must show:

- no pair regressions versus v3;
- bounded stiff-axis signal and drift;
- accepted corrections inside the projection tube;
- positive energy-volume complement lift;
- explicit refusal for stiff-dominated relaxation cases.

Only after that replay passes should we consider a Cloud Run canary.
