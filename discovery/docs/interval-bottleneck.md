# Why the first frozen pool retains every candidate

The initial primary pool contains all 1,000 candidates because the supplied
intervals cannot exclude anyone. There are **four certified-feasible candidates**,
one in each of four panels. The remaining 46 panels have no certified incumbent.
Even the four panels with incumbents cannot prune by score: their score intervals
overlap too widely. Both feasibility uncertainty and score uncertainty matter.

This is a **post-hoc diagnosis after the first evaluation was opened**. It uses
the original verified prediction freeze, metadata, and permitted calibration
labels. The diagnostic process did not open the evaluation-target file or any
evaluation truth report. It changes no protocol, predictor, calibration, policy,
gate, or benchmark result and supplies no new coverage validation.

The exact, machine-readable result is
[`reports/interval-bottleneck-v1.json`](../reports/interval-bottleneck-v1.json).
The source task remains the archived JARVIS optB88vdW band-gap objective with
formation energy at most zero relative to elemental references. This constraint
is not a hull, synthesizability, corrosion, or power-plant service certificate.

## Exact decision geometry

Let `bhat` be predicted band gap, `ghat` predicted formation energy, and let the
frozen symmetric radii be `qb` and `qg`. The selector minimizes minus band gap:

```
score interval       = [-bhat - qb, -bhat + qb]
constraint interval  = [ ghat - qg,  ghat + qg]
certified feasible   iff ghat + qg <= 0
possibly feasible    iff ghat - qg <= 0
```

When an incumbent exists, its score upper endpoint `B` is the smallest upper
endpoint among certified-feasible candidates. A possibly feasible candidate is
pruned exactly when `score_lower - B > 0`. Equality is retained. When an incumbent
does not exist, every possibly feasible candidate is retained.

The frozen radii are `qb = 15197/2500 = 6.0788 eV` and
`qg = 1466399/500000 = 2.932798 eV/atom`. For the 50 primary panels:

| Initial condition | Count |
| --- | ---: |
| Candidates | 1,000 |
| Nominally feasible (`ghat <= 0`) | 790 |
| Certified feasible under the supplied bounds | 4 |
| Possibly feasible under the supplied bounds | 1,000 |
| Feasibility unresolved | 996 |
| Certified infeasible | 0 |
| Panels with a certified incumbent | 4 |
| Panels without a certified incumbent | 46 |
| Candidates pruned by score | 0 |
| Retained candidates | 1,000 |

The formation predictions range from `-3.248288` to `1.672802 eV/atom`.
Certification requires a prediction at most `-2.932798`, which only four satisfy.
Of 790 nominally feasible candidates, 786 lack that certificate. Every prediction
is below the possibility threshold `+2.932798`; even the smallest possibility
margin is `314999/250000 = 1.259996 eV/atom`. Consequently none can be excluded by
the constraint. The certification margin `-(ghat + qg)` ranges from `-4.6056` to
`0.31549 eV/atom`; a nonnegative value is required for certification.

The score interval width is `2*qb = 12.1576 eV`. Within-panel predicted gap spans
range from `0.5308` to `4.7048 eV`, all smaller than that width. Every panel
therefore has a nonempty intersection shared by all score intervals; the narrowest
such intersection is still `7.4528 eV` wide. This alone prevents strict score
separation whenever an incumbent exists. Directly checking the four incumbent
panels confirms it: even their largest strict pruning margin is
`-5127/625 = -8.2032 eV`, far below the required positive value. No equality-edge
case explains the result.

These facts concern input intervals and the exact selector. They do not assert
that any individual interval actually covers its archived target.

## What the permitted calibration evidence says

The original joint allocation uses `epsilon = 1/400` per target/candidate, for
20 candidates and two targets at panel risk `delta = 1/10`. Its order statistic
is rank 2,044 of 2,048 calibration residuals. This demands extreme-tail control;
an attractive median or average residual is insufficient. The panel-level risk
allocation is not a simultaneous guarantee over all 50 primary panels.

| Absolute calibration residual | Gap (eV) | Formation (eV/atom) |
| --- | ---: | ---: |
| Median | 0 | 0.198476 |
| 90th percentile | 1.1284 | 0.69678 |
| 95th percentile | 1.7108 | 0.969404 |
| 99th percentile | 3.508 | 1.5754 |
| Applied radius, rank 2,044 | 6.0788 | 2.932798 |
| Maximum | 7.0774 | 3.912076 |

Each target has four residuals strictly above its applied radius and one equal
to it. Percentiles here are exact nearest-rank descriptive statistics; medians
average the middle pair. The report keeps rational values, including exact means.
No training fit residual is represented as an out-of-sample error estimate.

Calibration compositions have median nearest-training atomic-fraction L1
distance `1/2`, with distances ranging from `6/187` to `1`. Descriptive distance
buckets do not support simply treating proximity as a universal error bound:
the closest nonempty bucket `(0,1/4]` has a gap-residual 99th percentile of
`5.3754 eV`, compared with `2.4016 eV` in `(1/2,1]`. The closest bucket has only
304 examples, below the original 399-example minimum for a finite order statistic
at this error allocation. The middle and far buckets have 1,247 and 497 examples.
These post-hoc bins neither establish conditional coverage nor authorize new
group-specific radii. No evaluation residuals were used for this diagnosis.

## Sensitivity controls, not new calibrated results

The following controls contract intervals around the same frozen prediction
centers. They test decision geometry only. They have **no replacement calibration,
coverage claim, target-accuracy measurement, optimum-retention measurement, or
feasible-hit measurement**. The shift arm continues to abstain as unsupported.

| Score radius multiplier | Constraint radius multiplier | Certified feasible | Possible | Panels with incumbent | Retained |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | 4 | 1,000 | 4 | 1,000 |
| 1/2 | 1 | 4 | 1,000 | 4 | 1,000 |
| 1/4 | 1 | 4 | 1,000 | 4 | 967 |
| 1 | 1/2 | 66 | 999 | 41 | 999 |
| 1 | 1/4 | 200 | 985 | 49 | 985 |
| 1/2 | 1/2 | 66 | 999 | 41 | 999 |
| 1/4 | 1/4 | 200 | 985 | 49 | 840 |
| 0 | 0 | 790 | 790 | 50 | 50 |

Halving score uncertainty alone does nothing. Halving constraint uncertainty
creates many incumbents but leaves score overlap intact. Even quartering both
radii retains 840 candidates. The zero-radius row is only the point-prediction
limit; its 50-candidate pool is not a justified or validated recommendation pool.

The [compiled scalar sharpness result](sharpness.md) explains why changing only
the selector cannot generally fix this. Every retained candidate is a feasible
global minimizer in some world compatible with the supplied Cartesian interval
box. A pool preserving **all tied feasible minimizers in every such world** must
retain it. Different candidates can require different witness worlds. No claim
of physical attainability or statistical independence is involved. Smaller
justified pools require additional information, such as tighter validated bounds
or sound relations that rule out combinations allowed by the current box.

## Highest-value next experiment

The next experiment should target **joint extreme-tail prediction error relative
to feasibility and objective margins**, rather than adjust the selector or lower
the declared coverage level after seeing this outcome. The existing calibration
set has now supplied development evidence and must not serve as untouched
confirmation for that choice.

A concrete next development experiment is five-fold, composition-group-disjoint
cross-validation within the existing 4,096 training representatives. Freeze the
fold hash and a small comparison before running it: the existing 5NN predictor
and a ridge regressor on full element-fraction vectors with a declared, finite
regularization grid. Fit any preprocessing only inside the training folds.
Record the same two target errors, their upper-tail order statistics, and the
relationship between nominal margins and held-out errors. Do not select using
the already opened primary or oxygen-shift targets. A linear model is an
inexpensive, reproducible test of whether learning element contributions improves
on equal-weight composition neighbors; it is not presumed to succeed.

Any proposed residual scale model must also be learned using training-only
out-of-fold residuals and frozen before a new calibration allocation. The observed
nonmonotone distance tails rule out assuming that nearest-neighbor distance alone
justifies such a scale. With roughly 819 records per development fold, the
extreme quantile itself remains noisy; report that instability and do not turn
an apparent tail improvement into a coverage certificate.

Only if development evidence supports a useful improvement should a new protocol
allocate sufficient, previously unused composition groups to fresh calibration
and evaluation, before their authorized target access. Preserve this benchmark
and its failed utility gates. An unused-label allocation in the same public
archive still cannot be called prospective or an independent research-group
replication. No fresh evaluation or model fitting was run for this diagnosis.

## Reproduce and inspect

From `discovery/`, with the original acquired cache present:

```sh
python -m unittest discover -s tests -p test_frozen_pool_diagnosis.py -v
python scripts/diagnose_frozen_pool.py \
  .cache/constrained/jarvis-gap-formation-v1-format-compat/freeze.json \
  --output reports/interval-bottleneck-v1.json
```

The diagnostic verifies the original protocol, amendment, producer source,
custody, metadata, training/calibration inputs, and prediction seals. It recomputes
pool membership with exact fractions and checks its membership digest against
the frozen operational pool. It recomputes calibration residuals and verifies
the declared order-statistic radii. Outputs are immutable: identical reproduction
is accepted; changed contents require a separate artifact.

Seven tests pass, including separate score/constraint/no-incumbent cases,
strict-boundary ties, exact summaries, calibration-rank binding, and an end-to-end
synthetic finite freeze. The integration test blocks evaluation-target and truth
report reads and rejects modified prediction seals. The actual execution also
used a JSON read allowlist and blocked the evaluation opener. It read only
`freeze`, custody/source receipts, representatives, metadata, training labels,
calibration labels, predictions, and its own output JSON. Training labels are
read by the original verifier; only calibration labels enter this diagnosis.

| Identity | SHA-256 |
| --- | --- |
| Frozen input file | `7490a580796566bb972e52394816b680b472e46d83566a22f415168582ac49b6` |
| Frozen prediction file | `530b13400aa1b6b97b3362f76358cfd2bce5a8610221f3fc69da3ec39323c343` |
| Diagnostic script | `259213dfcd6ebc249a62364a36cc4e57e789b9dddcad24f964876734d07dff79` |
| Diagnostic report | `04ac1b4841e5fbd335bbc9c12867b1cba6755df02aa474d90ca6fd871cdefb22` |

The report contains complete input hashes and protocol identities. Hashes bind
the calculation and its inputs; they do not establish scientific validity.
