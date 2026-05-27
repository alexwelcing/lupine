# MPtrj Broad-DFT MLIP Promotion Canary

- **Status:** Cloud Run canary completed; promotion blocked by CHGNet negative transfer
- **Generated:** 2026-05-27
- **Campaign:** `mptrj-dft-broad-paired-accuracy-v1`
- **Artifact:** `library-site/src/reports/assets/mlip/mptrj-broad-dft-promotion-canary-summary.json`

## Why This Matters

Nickel is a controlled first lane, not the limit of the Distill claim. This
canary asks whether the same paired evidence contract can show improvement on a
non-Ni, broad DFT trajectory fixture from MPtrj across several MLIP backends.

The answer is mixed in the useful way. MACE, ORB, and SevenNet improve on both
energy-volume and relaxation-stability. CHGNet regresses on both rows. The
promotion gate therefore blocks the ribbon from flagship claims instead of
averaging the gains into a misleading story.

## Result

| Row | MLIP | Baseline error | Distill error | Lift | Verdict |
| --- | --- | ---: | ---: | ---: | --- |
| Energy-volume | MACE-MP-0 | 0.4116 eV/atom MAE | 0.2038 eV/atom MAE | 50.49% | Improved |
| Energy-volume | CHGNet | 0.1035 eV/atom MAE | 0.1325 eV/atom MAE | -27.99% | Regressed |
| Energy-volume | ORB-v3 | 0.4295 eV/atom MAE | 0.4237 eV/atom MAE | 1.35% | Improved |
| Energy-volume | SevenNet | 0.3997 eV/atom MAE | 0.2795 eV/atom MAE | 30.06% | Improved |
| Relaxation stability | MACE-MP-0 | 0.5604 penalty | 0.3866 penalty | 31.02% | Improved |
| Relaxation stability | CHGNet | 0.0557 penalty | 0.0798 penalty | -43.34% | Regressed |
| Relaxation stability | ORB-v3 | 0.5327 penalty | 0.3365 penalty | 36.83% | Improved |
| Relaxation stability | SevenNet | 0.5750 penalty | 0.3972 penalty | 30.92% | Improved |

Summary: 16 / 16 cells completed, 8 paired comparisons measured, 6 improved,
2 regressed, 0 missing. The gate verdict is
`blocked_negative_transfer`.

## Interpretation

This is stronger science than a clean-looking average. The current MPtrj global
support ribbon transfers well to three backends, but CHGNet starts from a much
stronger baseline on this fixture and the residual correction overshoots it.
That is exactly the fault line the flywheel should expose before we make a
paper or launch claim.

The next ribbon should be material-family or backend aware. At minimum, it
needs to recognize when a backend already sits close to the DFT labels and
should refuse correction unless support diagnostics show a real lift. The
rerun should use the same shared raw prediction checkpoints where possible, so
we test the ribbon decision rather than paying again for ambiguous model drift.

## Evidence Contract

- Fixture: `canonical-structures-v2`
- Fixture hash:
  `sha256:5f9cde3b94a44f030eb449b548440e6cbb6aac1d53db1d7698682e8a3a321b4c`
- Support fixture: `canonical-distill-support-mptrj-train-plus-elastic-v1`
- Support hash:
  `sha256:755d69e522227d5d9cd3566fde697b7c30d395b6b5ff30212b5758bf6708148c`
- Policy: `hyperribbon-mptrj-global-support-v1-accuracy`
- Policy hash:
  `sha256:bb7e8759a7b418636d13a9111e6b9174068f621d2fdaa5ca6a00b01f0481b64c`
- Cloud Run executions:
  `mlip-cell-mace-nfxrd`, `mlip-cell-chgnet-qz96k`,
  `mlip-cell-orb-pnq4m`, `mlip-cell-sevennet-qnkt9`
- Artifact prefix:
  `gs://shed-489901-atlas-outputs/mlip-evidence/mptrj-dft-broad-paired-accuracy-v1`

## Next Gate

Do not launch this as the flagship accuracy result. Fit a backend-aware MPtrj
ribbon, replay against completed cloud predictions, then rerun the four-MLIP
canary with the same rule: all paired cells must complete, every
baseline/Distill pair must share a raw prediction checkpoint, no pair may
regress, and acceleration remains out of scope until accuracy is locked.
