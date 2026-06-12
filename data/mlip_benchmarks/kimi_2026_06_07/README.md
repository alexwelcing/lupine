# Kimi MLIP Evidence Import, 2026-06-07

This directory contains the curated evidence imported from
`archive/kimi-workspace-export/`. It is intentionally smaller than the export dump:
cache files, bytecode, nested git metadata, business/relocation notes, and
immature standalone packages were left in quarantine.

## Kept Artifacts

| File | Role |
| --- | --- |
| `cross_mlip_cloud_v7_results.json` | Primary GCP Cloud Run result for 15 elements x 3 MLIPs. |
| `cross_mlip_cloud_v7_analysis.txt` | Human-readable summary of v7 correlations and ensemble PR. |
| `irrep_vandermonde_mace_mp0.json` | Pre-registered MACE irrep-basis Vandermonde result. |
| `real_early_exit_mace_mp0.json` | Real CUDA-timed MACE early-exit result. |
| `simulated_acceleration_mace_mp0.json` | Earlier idealized acceleration benchmark, retained for contrast. |
| `md_force_error_correlation.json` | Layerwise-distance versus force-error evidence. |
| `md_active_learning_curve.json` | Active-learning coverage-distance curve. |
| `md_hybrid_decision.json` | Mixed-reference hybrid refusal policy ROC data. |
| `md_element_specific_hybrid.json` | Cu-only reference counterexample for the hybrid policy. |
| `followup_agenda.json` | Deterministic research/code queue generated from the validated evidence. |

## Validation

Run the cheap evidence contract:

```powershell
python tools/mlip_kimi_evidence.py --check
python -m pytest tools/test_mlip_kimi_evidence.py
```

Refresh the agenda packet after changing evidence contracts:

```powershell
python tools/mlip_kimi_evidence.py --write-agenda
```

The checks preserve both positive and negative findings: 45 elastic-constant
calculations, the Fe/Al/W low-correlation sentinels, physical-instability flags,
the irrep threshold failure, and the real early-exit gap from the idealized
speedup bound. They also derive two local follow-up metrics: bootstrap
confidence intervals for the 3-MLIP ensemble PR table and a force-calibrated
refusal shape check over the imported force-MAE rows.
