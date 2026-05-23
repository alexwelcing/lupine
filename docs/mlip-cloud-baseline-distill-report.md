# MLIP Cloud Baseline and Distill: First Real 5x5 Results

On May 23, 2026, Lupine completed its first real cloud MLIP baseline grid and used it to test the first Distill interventions against the same sealed scoring contract.

This matters because the result is no longer a smoke test. The baseline grid ran five MLIP backends across five physics rows, with all 25 baseline cells completed through the same Cloud Run runner surface that future GCP and HPC campaigns can reproduce. Distill then entered the loop as an active runtime layer, not a post-hoc dashboard, and produced the first backend-diverse energy accuracy wins.

## What Ran

The cloud campaign used the MLIP runner jobs built from image tag `distill-b7e84b3bc`. The baseline grid covered:

| MLIP | Energy | Forces | Stress | Elastic | Relaxation |
| --- | ---: | ---: | ---: | ---: | ---: |
| CHGNet | 0.1035 | 0.1649 | 0.4311 | 48.8708 | 0.0557 |
| M3GNet | 0.4403 | 0.6262 | 1022.3483 | 21634.7398 | 0.6683 |
| MACE | 0.4116 | 0.2644 | 0.5669 | 35.5238 | 0.5604 |
| ORB-v3 | 0.4295 | 0.1240 | 0.2801 | 16.1451 | 0.5327 |
| SevenNet | 0.3997 | 0.1957 | 0.3536 | 38.5337 | 0.5750 |

Lower is better in each row. The row metrics are not interchangeable units: energy is eV per atom MAE, forces are eV per Angstrom RMSE, stress and elastic are GPa MAE, and relaxation is the sealed relaxation penalty.

The important operational result is that the 25-cell baseline is complete. It gives us a cloud-reproducible reference surface for comparing future Distill versions and future foundation MLIPs.

![Row-rank heatmap for the 25-cell MLIP cloud baseline](/reports/assets/mlip-cloud-baseline-heatmap.svg)

The heatmap makes the baseline useful at a glance: CHGNet is strongest on energy and relaxation, ORB-v3 is strongest on forces, stress, and elastic, and the M3GNet stress/elastic cells are bright warnings rather than numbers to smooth away.

## Distill Results

The first cloud Distill run tested triplets for MACE and SevenNet. A triplet means the same MLIP and same sealed fixture were scored three ways: baseline, `distill_accuracy`, and `distill_accuracy_accelerate`.

| Cell | Baseline | Distill Accuracy | Distill Accuracy + Accelerate | Verdict |
| --- | ---: | ---: | ---: | --- |
| MACE energy | 0.4116 | 0.2038 | 0.2038 | Reproduced accuracy win |
| SevenNet energy | 0.3997 | 0.3046 | 0.2773 | Backend-diverse accuracy win |
| MACE stress | 0.5669 | 0.9331 | 0.7645 | Not promoted |
| MACE forces | 0.2644 | no material change | no material change | Needs vector policy work |
| MACE relaxation | 0.5604 | no material change | no material change | Needs active optimizer guard |
| MACE elastic | 35.5238 | no support/no-op | no support/no-op | Needs support fixture |

The energy wins are the current positive result. MACE energy improved by about 50 percent against baseline, and SevenNet energy improved as well, with the accelerate policy giving the best SevenNet energy score in this run.

The stress result is also valuable: it blocked promotion. The local stress improvement did not transfer cleanly into the cloud run, which means the row-specific policy needs stronger calibration before it can be treated as a general Distill capability.

![Distill triplet score ratios for MACE energy, SevenNet energy, and MACE stress](/reports/assets/mlip-distill-triplets.svg)

The normalized triplet chart is the cleanest current claim surface. The two energy cells move below baseline, while MACE stress moves above baseline and should stay blocked.

## What This Proves

This run proves that the system can now do the real loop:

1. Establish a cloud baseline with multiple MLIPs and multiple physics rows.
2. Apply a Distill runtime intervention without changing the underlying MLIP.
3. Compare baseline, Distill Accuracy, and Distill Accuracy + Accelerate under one scoring contract.
4. Preserve failed or non-transferable interventions as evidence instead of burying them.

That is the right shape for the product. A researcher should be able to run their normal MLIP stack while Lupine adds a governed correction and policy layer that can improve, refuse, backtrack, or expose a fault line during the run.

## What We Are Not Claiming Yet

We are not yet claiming broad 5x5x3 superiority. The complete cloud baseline exists, but Distill has only been validated on a small subset of triplets.

We are also not claiming a speed win yet. On small fixtures, support fitting, runner startup, and artifact I/O can dominate runtime. The first acceleration policy is structurally useful, but the speed claim needs larger cells, warmer runners, and cleaner checkpoint behavior before it becomes publishable.

![5x5x3 evidence surface showing baseline complete and early Distill coverage](/reports/assets/mlip-5x5x3-coverage.svg)

This is the honest state of the campaign: the baseline plane is full, the Distill planes have real promoted cells, and most of the 5x5x3 surface remains intentionally unclaimed until the row policies earn it.

## Lessons From The Run

- Energy correction is the first strong lane. It transferred across MACE and SevenNet.
- Stress needs a stricter row policy. A correction that looks good locally can fail when model precision, fixture path, or cloud loading behavior shifts.
- Elastic needs a real support fixture. The current path can complete baseline scoring, but Distill elastic cannot promote without non-overlapping support structures.
- M3GNet stress and elastic are outliers by orders of magnitude. That may be a unit, fixture, model, or backend-contract issue and should be investigated before using those rows in a headline claim.
- Checkpointing needs backoff and batching. Concurrent GCS checkpoint flushes hit `429 Too Many Requests`; disabling checkpoints unblocked the baseline, but the durable fix is retry-aware artifact writing.

## Next Step

The next publishable target is not just "run more cells." It is to turn this into a robust Distill hill climb:

1. Keep the 25-cell cloud baseline as the reference.
2. Expand Distill triplets first where energy wins transfer cleanly.
3. Build row-specific policies for stress, forces, elastic, and relaxation.
4. Promote only interventions that beat baseline on sealed eval data.
5. Use Phoenix and the app report as the evidence home, while the Rust Distill engine owns the inner-loop decisions.

The first cloud result is encouraging because it is honest: the baseline is complete, Distill already has real energy wins, and the rows that are not ready are visible. That is exactly the kind of surface we need before asking larger labs to run bigger, more valuable workloads through the same contract.
