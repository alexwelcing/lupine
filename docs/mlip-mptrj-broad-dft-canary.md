# MPtrj Broad-DFT MLIP Promotion Canary

- **Status:** Cloud Run support-floor v2 canary completed and eligible; row-hybrid v3 replay is the next cloud candidate
- **Generated:** 2026-05-27
- **Campaign:** `mptrj-dft-broad-paired-accuracy-v1`
- **Cloud artifact:** `library-site/src/reports/assets/mlip/mptrj-broad-dft-promotion-canary-summary.json`
- **v3 replay artifact:** `library-site/src/reports/assets/mlip/mptrj-broad-dft-row-hybrid-v3-replay-summary.json`

## Why This Matters

Nickel is a controlled first lane, not the limit of the Distill claim. This
canary asks whether the same paired evidence contract can show improvement on a
non-Ni, broad DFT trajectory fixture from MPtrj across several MLIP backends.

The first global ribbon improved MACE, ORB, and SevenNet but regressed CHGNet.
The support-floor v2 policy fixed that failure without a CHGNet exception:
CHGNet now refuses correction because its support residual is already below the
physical floor. That gives us a clean cloud result: six improved pairs, two
safe holds, zero regressions.

## Cloud Result: Support-Floor v2

| Row | MLIP | Baseline error | Distill error | Lift | Verdict |
| --- | --- | ---: | ---: | ---: | --- |
| Energy-volume | MACE-MP-0 | 0.4116 eV/atom MAE | 0.2038 eV/atom MAE | 50.49% | Improved |
| Energy-volume | CHGNet | 0.1035 eV/atom MAE | 0.1035 eV/atom MAE | 0.00% | Safe hold |
| Energy-volume | ORB-v3 | 0.4295 eV/atom MAE | 0.4233 eV/atom MAE | 1.44% | Improved |
| Energy-volume | SevenNet | 0.3997 eV/atom MAE | 0.2795 eV/atom MAE | 30.06% | Improved |
| Relaxation stability | MACE-MP-0 | 0.5604 penalty | 0.3866 penalty | 31.02% | Improved |
| Relaxation stability | CHGNet | 0.0557 penalty | 0.0557 penalty | 0.00% | Safe hold |
| Relaxation stability | ORB-v3 | 0.5327 penalty | 0.3365 penalty | 36.83% | Improved |
| Relaxation stability | SevenNet | 0.5750 penalty | 0.3972 penalty | 30.92% | Improved |

Summary: 16 / 16 cells completed, 8 paired comparisons measured, 6 improved,
2 unchanged, 0 regressed. The gate verdict is
`promotable_accuracy_candidate`.

## Local v3 Replay

The next local iteration keeps the v2 energy behavior, then adds a
`relaxation_stability` row override. It is intentionally not the default cloud
policy yet.

Replay result: 8 / 8 pairs measured, 6 improved, 2 unchanged, 0 regressed.
Mean pair lift improves from about 22.6% in v2 replay to 25.6% in v3 replay.

| Row | MLIP | v2 Distill | v3 replay | v3 lift |
| --- | --- | ---: | ---: | ---: |
| Relaxation stability | MACE-MP-0 | 0.3866 | 0.3286 | 41.36% |
| Relaxation stability | ORB-v3 | 0.3365 | 0.3200 | 39.94% |
| Relaxation stability | SevenNet | 0.3972 | 0.3380 | 41.23% |

## Interpretation

This is the growth loop working correctly. The v1 failure became a v2 refusal
guard. Then local replay found that energy and relaxation want different policy
settings. That row-aware split is exactly the kind of product behavior
researchers need: Distill changes the outcome only where the evidence says the
runtime is inside the support tube, and it refuses an already-strong baseline
instead of forcing a correction.

## Evidence Contract

- Fixture: `canonical-structures-v2`
- Fixture hash:
  `sha256:5f9cde3b94a44f030eb449b548440e6cbb6aac1d53db1d7698682e8a3a321b4c`
- Support fixture: `canonical-distill-support-mptrj-train-plus-elastic-v1`
- Support hash:
  `sha256:755d69e522227d5d9cd3566fde697b7c30d395b6b5ff30212b5758bf6708148c`
- Cloud policy: `hyperribbon-mptrj-support-floor-v2-accuracy`
- Candidate replay policy: `hyperribbon-mptrj-row-hybrid-v3-accuracy`
- Artifact prefix:
  `gs://shed-489901-atlas-outputs/mlip-evidence/mptrj-dft-broad-paired-accuracy-v1`

## Next Gate

Run the four-MLIP MPtrj Cloud Run canary with
`hyperribbon-mptrj-row-hybrid-v3-accuracy`. It must preserve the same rule:
all paired cells complete, every baseline/Distill pair shares a raw prediction
checkpoint, no pair may regress, CHGNet must remain unchanged or improve, and
acceleration remains out of scope until accuracy is locked.
