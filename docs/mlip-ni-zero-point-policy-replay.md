# Ni Zero-Point Policy Replay And Canary

**Status:** local replay gate passed; Cloud Run promotion canary passed  
**Generated:** 2026-05-27  
**Campaign:** `ni-fcc-eam-home-turf-paired-accuracy-v1`  
**Replay artifact:** `library-site/src/reports/assets/mlip/ni-paired-accuracy-zero-point-replay-summary.json`  
**Cloud canary artifact:** `library-site/src/reports/assets/mlip/ni-paired-accuracy-promotion-canary-summary.json`

## Why This Matters

The first full Ni paired run rejected our broad transfer ribbon: no measured
pair improved and ten pairs regressed. That was not a launch failure; it was the
system doing its job. The artifacts showed that the prior support family was
not appropriate for pure Ni, so the next question became sharper:

Can a same-material, non-overlapping Ni support ribbon improve energy and
relaxation accuracy without changing the MLIP or rerunning raw predictions?

The answer from local replay was yes enough to justify a new Cloud Run canary.
The rebuilt MACE, CHGNet, and ORB Cloud Run jobs then confirmed the same
direction: six improved canary pairs, zero regressions.

## Result

| Measure | Replay | Cloud canary |
| --- | ---: | ---: |
| Canary pairs | 6 | 6 |
| Improved pairs | 6 | 6 |
| Regressed pairs | 0 | 0 |
| Mean relative error lift | 75.12% | about 75% |
| Policy mode applied | `material_family_zero_point` | `material_family_zero_point` |
| Claim status | Spend gate passed | Accuracy canary passed |

## Pair Table

| Row | MLIP | Baseline error | Cloud Distill error | Lift |
| --- | --- | ---: | ---: | ---: |
| Energy-volume | MACE-MP-0 | 1.2803 | 0.3200 | 75.01% |
| Relaxation stability | MACE-MP-0 | 1.2798 | 0.3184 | 75.12% |
| Energy-volume | CHGNet | 1.2943 | 0.3236 | 75.00% |
| Relaxation stability | CHGNet | 1.2930 | 0.3196 | 75.28% |
| Energy-volume | ORB-v3 | 1.0438 | 0.2608 | 75.01% |
| Relaxation stability | ORB-v3 | 1.0427 | 0.2575 | 75.31% |

## Interpretation

The old policy treated all large energy corrections as dangerous. The Ni canary
showed a more specific case: the support set and sealed evaluation set share the
same material family, have no structural leakage, pass exact support/eval
distance, and show roughly 99.5-99.9% support lift. In that case, the correction
is best treated as a guarded energy zero-point alignment, not ordinary
cross-material transfer.

The Rust policy now keeps the old `max_energy_bias_ev_per_atom` cap for normal
corrections and adds a separate
`max_energy_zero_point_shift_ev_per_atom` path that requires:

- energy or relaxed-energy row only
- same material-root overlap
- exact support/eval distance gate
- high support-lift threshold
- bounded ribbon feature distance

## Next Gate

Promote the Ni material-family ribbon to the full 5x5 paired accuracy run. The
promotion rule stays strict: paired baseline and Distill cells must share raw
prediction checkpoints, every pair must be measured, and no pair may regress.
Acceleration remains out of scope until accuracy is locked.
