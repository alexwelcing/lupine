# Frozen constrained benchmark: executed result

Executed 2026-10-10. **The engineering and unsupported-scope behavior pass;
the predeclared useful-screening and recommendation-value gates fail.** This
is a completed negative experiment. It does not validate predictive superiority
or a material for power-plant service.

The [compact measured report](constrained-v1.json) is also bundled into the
workbench. It preserves gate checks, denominators, missing values, failure
lists, four comparison curves and the 100-seed random sensitivity analysis.
The full local report preserves every policy's acquisition history and revealed
archived target values. Raw source archives and the full report stay in the
ignored cache; the reproduction workflow regenerates them.

## What was frozen and evaluated

The [protocol](../docs/constrained-benchmark-protocol.md) and
[source audit](../docs/constrained-source-audit.md) were committed as
`b5d432d1e7123ae8c33d48bbef2e04c44de7b37c` before target acquisition. The task
maximizes recorded optB88-vdW band gap subject to recorded formation energy
per atom being nonpositive. The source is NIST JARVIS, Figshare version 11,
[DOI 10.6084/m9.figshare.6815699.v11](https://doi.org/10.6084/m9.figshare.6815699.v11),
under CC BY 4.0; see the source audit for attribution and the source paper.
These are archived calculations, with no new DFT. Formation energy relative
to elemental references is not convex-hull stability, synthesis feasibility,
corrosion resistance, or evidence of operating-temperature performance.

The first strict source import was **BLOCKED** by nonfinite JSON tokens in an
unused auxiliary field. Its [receipt](constrained-strict-blocked-v1.json) and
[source identity](constrained-strict-source-v1.json) remain preserved. An
[additive format amendment](../docs/constrained-format-amendment.md) was
committed as `e04c5d6cca8e677cadc0cefa4208f2625d89e227` before the compatible
retry. It admits three typed invalid sentinels in the raw parser, while keeping
generated data strict and preserving every scientific choice. Earlier full
source records had been parsed before the strict failure; this chronology is
not prospective or independently blind evaluation. No completed freeze or
evaluation metrics existed before the amendment.

Metadata-selected composition representatives yielded 4,096 training rows,
2,048 calibration rows, and 1,000 evaluation candidates in each arm. The
oxygen-free primary arm and oxygen-containing shift arm each contain fifty
20-candidate panels. Exact composition-distance 5-neighbor predictions,
1-neighbor comparisons, all tie rules, risk budgets, panel assignments,
acquisition budgets and acceptance thresholds were fixed before replay.

Every reveal buys both objective and constraint for one candidate. All 103
policies receive their own history at equal budgets 0, 1, 2, 4, 8 and 20. The
full evaluator inspects complete truth only after policy decisions finish.
This is an enforced software boundary on public retrospective data, not proof
of independent blinding. Sampling premises remain unverified.

## Results

| Predeclared gate | Result | Reason |
|---|---|---|
| Engineering integrity | PASS | Source/freeze identities and required engineering receipts verify; guarded replay completed |
| Nontrivial constrained evidence | PASS | 50 primary panels, 222/1,000 infeasible candidates, all 50 panels mixed |
| Observed primary screening | FAIL | All 1,000 candidates retained; median pool fraction 1 exceeds the maximum 0.8 |
| Recommendation value | FAIL | Budget-four gain over nominal 5NN is 4 percentage points, below 10; paired sign p=5/16 exceeds 1/60 |
| Shift behavior | PASS | All 50 unsupported panels abstain from screening; every candidate retained |

In the primary arm, 49/50 panels have simultaneous interval coverage, and
50/50 retain every feasible optimum. No certified incumbent is infeasible,
and no defined regret bound is violated in this run. Retaining the entire
universe makes optimum retention uninformative about useful screening.

At the predeclared primary comparison budget of four reveals per panel:

| Policy | Within 0.1 eV of best feasible answer | Finds any feasible candidate | Mean regret among panels with a feasible find |
|---|---:|---:|---:|
| Interval acquisition | 42/50 (84%) | 50/50 | 0.18628 eV |
| Nominal 5NN | 40/50 (80%) | 50/50 | 0.29992 eV |
| Nominal 1NN | 27/50 (54%) | 50/50 | 0.74756 eV |
| Fixed random seed 0 | 13/50 (26%) | 49/50 | 18951/9800 eV |

Interval versus nominal 5NN has 3 winning panels, 1 losing panel and 46 ties
on the near-optimal-success indicator. The one-sided paired sign result is
5/16. Better observed results against 1NN and random ordering do not override
the failed nominal comparison, nor establish panel independence. The measured
curves and all random sensitivity seeds remain in the compact report.

Operational shift handling retains all 1,000 oxygen-containing candidates and
issues no interval guarantee. A separate diagnostic that transfers the finite
primary calibration intervals covers only 18/50 shift panels simultaneously.
This diagnostic has unsupported premises; it is not operational certified
coverage. Interval and nominal acquisition each succeed in 21/50 shift panels
at budget four. Abstention is successful scope handling, not shift prediction.

## Calibration and computational cost

The exact uniform allocation is 1/400 per candidate/property event, with
calibration order statistic 2,044 of 2,048 residuals. The gap radius is
`15197/2500` eV (6.0788); formation-energy radius is `1466399/500000` eV/atom
(2.932798). Finite arithmetic does not establish the exchangeability premise.

The original freeze took 125.4842 seconds wall time and recorded 183,096 KiB
peak Linux RSS. Replay completed 10,300 policy runs and 206,000 revealed target
bundles, recording 99.663133 seconds CPU, 199.577220 seconds wall time and
565,220 KiB peak RSS through metric normalization. Final serialization is
outside those replay timings. These are machine-specific engineering costs,
not a comparison with laboratory acquisition or new DFT costs.

## Identity and reproduction

| Artifact | SHA-256 |
|---|---|
| Protocol | `1a61c76865525b62ad7ea7555b87e0fb334e8e2cc9a6db9ad18bd820199adef0` |
| Compatible freeze file | `7490a580796566bb972e52394816b680b472e46d83566a22f415168582ac49b6` |
| Predictions | `530b13400aa1b6b97b3362f76358cfd2bce5a8610221f3fc69da3ec39323c343` |
| Scientific result (operational fields excluded) | `cd6308600c90b431f8ce22b9aeee196ab747e4e8e84ca18809120043dc0ba900` |
| Full report file bytes | `ac3f6f4f7d031b7683de7fb9ba0b060b23aff0e9c58c111d48ab141928961e38` |
| Full report content identity | `b4e26889a16bf91ec52c1d6f183de77473a1c41d2aafaad3a629aa72e63e00b8` |
| Oracle access log | `7930df6bb3e36588044066e26daf29b52c3048934a4008b378100e9526ecc550` |

The [engineering receipt](constrained-engineering-validation.json) binds 34
passed constrained tests to unchanged implementation and test bytes before
opening the evaluation partition. Its original log path names a local cache;
an identical [log copy](constrained-engineering-tests.txt) is published here.
The complete [reproduction command](../docs/constrained-reproduce.md) creates
a new guarded receipt, rather than pretending the old local path exists in a
new checkout. A prefix in the original full report's `reproduction.command`
omits required arguments; use the complete documented workflow.

A [fresh noneditable wheel reproduction](constrained-reproduction.json)
rebuilt the source partition, predictions, calibration and freeze from only
the original verified raw bytes. All six compared artifact hashes match.
It ran on the same host in a new isolated virtual environment and did not
execute outcome replay. It is computational reproducibility evidence, not an
independent research-group replication.

The separate [complete workflow rerun](constrained-workflow-reproduction-v1.json)
then rebuilt acquisition, freeze, verification, source-bound engineering tests,
all policy replays and the dashboard in a fresh work directory. Its scientific
digest matches exactly. An [independent arithmetic audit](constrained-independent-audit.json)
reconstructed all 10,300 histories and 61,800 budget snapshots and confirmed
the negative gate decisions without importing selector or replay helpers.

The completed [interval-bottleneck diagnosis](../docs/interval-bottleneck.md)
finds only four certified-feasible primary candidates, across four panels,
and a common objective-interval intersection in every panel. Both feasibility
uncertainty and score overlap block pruning. This posthoc diagnosis uses the
frozen predictions and permitted calibration labels without opening evaluation
targets or truth reports.

The next task is to diagnose the width and feasibility bottleneck using frozen
predictions and permitted training/calibration evidence, then preregister a
changed method on fresh evaluation data. Reusing these outcomes for design
makes that analysis posthoc; it cannot produce a new untouched-test claim.
