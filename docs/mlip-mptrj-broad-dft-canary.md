# MPtrj Broad-DFT MACE Promotion Canary

**Status:** Cloud Run promotion canary passed  
**Generated:** 2026-05-27  
**Campaign:** `mptrj-dft-broad-paired-accuracy-v1`  
**Artifact:** `library-site/src/reports/assets/mlip/mptrj-broad-dft-mace-promotion-canary-summary.json`

## Why This Matters

Nickel is a controlled first lane, not the limit of the Distill claim. This
canary asks whether the same paired evidence contract can show improvement on a
non-Ni, broad DFT trajectory fixture from MPtrj.

The answer is yes for this first MACE tranche: energy-volume and
relaxation-stability both improve, with zero regressions, while sharing the
same raw prediction checkpoints between baseline and Distill Accuracy.

## Result

| Row | MLIP | Baseline error | Distill error | Lift |
| --- | --- | ---: | ---: | ---: |
| Energy-volume | MACE-MP-0 | 0.4116 eV/atom MAE | 0.2038 eV/atom MAE | 50.49% |
| Relaxation stability | MACE-MP-0 | 0.5604 penalty | 0.3866 penalty | 31.02% |

## Interpretation

This is the first clean non-Ni transfer evidence in the current release lane.
It does not prove universality by itself, but it materially changes the paper
story: Distill is no longer supported only by the Ni material-family
zero-point canary. The broad MPtrj lane uses DFT trajectory labels and mixed
chemistries, so it is a better stress test of the general runtime claim.

The campaign remains deliberately conservative. Only MACE is enabled in this
first canary because it already passed the local and cloud MPtrj support path.
The next tranche should widen to CHGNet, ORB, SevenNet, and then the full 5x5
paired grid under the same zero-regression gate.

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
- Cloud Run execution: `mlip-cell-mace-nfxrd`
- Artifact prefix:
  `gs://shed-489901-atlas-outputs/mlip-evidence/mptrj-dft-broad-paired-accuracy-v1`

## Next Gate

Widen this exact campaign to more MLIPs before making a broad publication
claim. The promotion rule stays strict: all paired cells must complete, every
baseline/Distill pair must share a raw prediction checkpoint, no pair may
regress, and acceleration remains out of scope until accuracy is locked.
