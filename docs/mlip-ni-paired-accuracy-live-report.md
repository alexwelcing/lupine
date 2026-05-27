# Ni Paired Accuracy Live Report

**Status:** rejected candidate: negative transfer detected
**Generated:** 2026-05-27T12:58:20Z
**Campaign:** `ni-fcc-eam-home-turf-paired-accuracy-v1`
**Fixture hash:** `sha256:0a51d5b58f68e169478b290954da4729e33d9d37c2b65a3084e60ad5c1edd16b`

## Why This Run Exists

The previous 25-cell baseline showed that our cloud MLIP runner can score five
models across five physics rows. This run asks a stricter question: can Lupine
Distill Accuracy improve the same MLIP on the same sealed Ni fcc EAM-home-turf
fixture while sharing raw-prediction evidence with the paired baseline?

That pairing matters. For each `(row, MLIP)`, the baseline cell writes the raw
prediction checkpoint and the Distill cell reads that same checkpoint. A claimed
accuracy lift therefore has to come from the Distill policy layer, not a changed
model invocation, changed fixture, or untracked rerun.

## Live Summary

| Measure | Value |
| --- | ---: |
| Total cells | 50 |
| Completed cells | 50 |
| Failed cells | 0 |
| Missing cells | 0 |
| Total paired comparisons | 25 |
| Measured paired comparisons | 25 |
| Improved pairs | 0 |
| Regressed pairs | 10 |

## Current Interpretation

At this snapshot, `25` paired comparisons have both baseline and
Distill artifacts. `0` improve, `10` regress, and the
remaining rows are awaiting artifacts or explicit failures. No missing cell is
treated as a win.

The returned evidence is currently a negative-transfer finding: 25 pairs are measured, 10 regress, 15 are unchanged, and none improve. That is still useful because the system has caught a ribbon that should refuse or adapt before it is promoted for this material lane.

## Flagship Promotion Gate

**Result:** blocked. This campaign is evidence for ribbon rejection, not launch promotion.

- no paired comparison may regress
- at least one paired comparison must improve
- energy-volume and relaxation rows may not regress

**Required next action:** reject this ribbon for flagship claims; fit a material-family-aware canary and require zero regressions before rerun


## Pair Table

| Row | MLIP | Baseline error | Distill error | Lift | Verdict |
| --- | --- | ---: | ---: | ---: | --- |
| Elastic constants | chgnet | 27.711 | 27.711 | 0.0% | unchanged |
| Elastic constants | m3gnet | 30118.04 | 30118.04 | 0.0% | unchanged |
| Elastic constants | mace-mp-0 | 22.653 | 22.653 | 0.0% | unchanged |
| Elastic constants | orb-v3 | 8.0001 | 8.0001 | 0.0% | unchanged |
| Elastic constants | sevennet | 26.740 | 26.740 | 0.0% | unchanged |
| Energy-volume | chgnet | 1.2943 | 1.3005 | -0.5% | distill regressed |
| Energy-volume | m3gnet | 1.2877 | 1.4476 | -12.4% | distill regressed |
| Energy-volume | mace-mp-0 | 1.2803 | 1.4168 | -10.7% | distill regressed |
| Energy-volume | orb-v3 | 1.0438 | 1.2133 | -16.2% | distill regressed |
| Energy-volume | sevennet | 1.3151 | 1.3696 | -4.1% | distill regressed |
| Forces | chgnet | 0.1054 | 0.1054 | -0.0% | unchanged |
| Forces | m3gnet | 0.0487 | 0.0487 | -0.0% | unchanged |
| Forces | mace-mp-0 | 0.0825 | 0.0825 | 0.0% | unchanged |
| Forces | orb-v3 | 0.0684 | 0.0684 | 0.0% | unchanged |
| Forces | sevennet | 0.0391 | 0.0391 | 0.0% | unchanged |
| Relaxation stability | chgnet | 1.2930 | 1.2943 | -0.1% | distill regressed |
| Relaxation stability | m3gnet | 1.2865 | 1.3968 | -8.6% | distill regressed |
| Relaxation stability | mace-mp-0 | 1.2798 | 1.4025 | -9.6% | distill regressed |
| Relaxation stability | orb-v3 | 1.0427 | 1.2328 | -18.2% | distill regressed |
| Relaxation stability | sevennet | 1.3138 | 1.4340 | -9.1% | distill regressed |
| Stress | chgnet | 1.4479 | 1.4479 | 0.0% | unchanged |
| Stress | m3gnet | 285.89 | 285.89 | 0.0% | unchanged |
| Stress | mace-mp-0 | 0.8611 | 0.8611 | 0.0% | unchanged |
| Stress | orb-v3 | 1.1324 | 1.1324 | 0.0% | unchanged |
| Stress | sevennet | 1.4846 | 1.4846 | 0.0% | unchanged |

## Evidence Contract

- Source packet: `data/mlip_benchmarks/manifest_sources.json`
- Campaign spec:
  `data/mlip_benchmarks/evidence_campaigns/ni_lane_a_paired_accuracy_v1.json`
- Live summary artifact:
  `library-site/src/reports/assets/mlip/ni-paired-accuracy-live-summary.json`
- Artifact prefix: `gs://shed-489901-atlas-outputs/mlip-evidence/ni-fcc-eam-home-turf-paired-accuracy-v1`
- Batch prefix: `gs://shed-489901-atlas-inputs/mlip-evidence/ni-fcc-eam-home-turf-paired-accuracy-v1/batches`

## Release Read

This is a paper surface only to the extent the returned artifacts justify it.
When the campaign is partial, the report is still useful because it shows which
rows returned, which failed, and where the next Distill ribbon should focus. The
publication claim should be made only from measured pairs.
