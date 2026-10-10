# Synthetic prospective MPEA study kernel

Status: synthetic implementation for review. No production reader, real feature
artifact, allocation, source archive, calibration labels or evaluation labels
has been accessed by this lane. This module does not authorize production use.
The independently reviewed feature reader and generic runtime remain unchanged.

The source is `scripts/mpea_study.py` in this scratch lane. Import it with the
main repository `src` and `scripts` directories on `PYTHONPATH`; it reuses the
unchanged `decision_pool` types, `NormalizedVector`, and the feature adapter's
118 atomic-number axes and six explicit processing categories. It has no main
entry point, file IO, target parser, entropy source or allocation machinery.

## Contract and ownership

This implements the predictor and evaluator portions of the prospective
`mpea-t25-archival-v1` protocol. The reviewed protocol and implementation contract
live in `.cache/mpea-protocol-design/`. The separate custody owner supplies
validated original records, parsed VALID Fraction or unknown endpoints, assigned
panels, the role-blind completeness manifest, and original artifact references.
Custody retains every original endpoint status/reason that this numerical layer
represents by `None`. Original ordinals are **zero-based 0 through 1544**.

This kernel checks record identity, numeric exactness, internal membership,
source-disjoint assigned panels and fixed replay order. It does not authenticate
an external freeze reference or establish specimen, composition, study or
physical independence. It does not enforce process isolation or when a caller
first learned a number. The custody wrapper must seal ranks before reserved
label parsing, seal all decisions/schedules before policy reveals, and release
full evaluator truth only after every policy finishes. Passing all private truth
directly to `audit_replay` is appropriate for a later auditor, not a capability
boundary for an active policy.

## Python API

All input sequences are copied to tuples, mappings to read-only mappings, and
all public dataclasses are frozen. Output collections returned by the kernel are
immutable. Derived fit, rank, calibration, schedule, replay and gate fields have
`init=False`; a caller cannot supply a fabricated derived result through normal
constructors. This is ordinary Python API validation, not a defense against
arbitrary Python memory mutation or hostile monkeypatching.

- `FeatureRow(record_id, ordinal, source_group, composition, processing)` takes a
  complete 118-axis `NormalizedVector` or whole-vector `None`. Unknown vectors
  remain in their original panels. `source_group` is an explicit opaque string;
  the custody adapter uses canonical decimal strings for original opaque group
  integers without assigning chemical or study meaning.
- `Targets(record_id, yield_strength, elongation)` permits only nonnegative
  exact `Fraction` values or `None`; boolean, integer, float and string inputs are
  rejected. Exact zero is valid. Each supplied numerator/denominator is at most
  512 bits. The separate target parser maps row-local negative or decimal-limit
  cells to `None` while preserving their original status/reason; such rows remain
  in the primary population. Rejection of a negative numeric `Targets` argument
  is defensive API validation, not a rule to abort parsing those source rows.
  Target units and interpretations remain the source-specific caller's
  explicit recorded YS in MPa and elongation in percentage points.
- `DevelopmentRow(feature, targets)` binds the same original record ID.
  `fit_development(rows)` returns a `StudyFit` preserving every original row.
  It requires at least 50 complete rows across 15 source groups before fitting.
  Otherwise status is `NO_GO_INSUFFICIENT_DEVELOPMENT`, reasons list both failed
  criteria, and medians/threshold are unavailable. Partial rows cannot contribute
  one endpoint to a fit.
- `predict(fit, query)` returns exact predictions, the neighbor IDs/distances and
  the primary and processing fallback routes. Threshold and category/global
  baseline values are separate lower medians at index `(n-1)//2`. The primary
  model takes the closest complete known-composition row per development source,
  using exact L1 and then the original numeric ordinal. It takes five distinct
  sources, or every available source when fewer than five exist, and computes
  the unweighted mean of both recorded endpoints on the same neighbors. Unknown
  composition or no usable development composition uses the fixed processing
  median, falling back to global medians only for an empty processing category.
- `AssignedPanel(panel_id, source_group, rows)` binds up to 25 original rows.
  `rank_panel(fit, panel)` returns a `FrozenPanel` with all 23 full orders and
  the private prediction provenance. Primary rank is predicted `E >= threshold`
  first, descending predicted YS, fixed SHA-256 tie hash, then original ordinal.
  Processing and objective-only controls use the declared alternative keys.
  All 20 hash controls use the protocol's exact prefix/tag/NUL convention.
- `ReservedCompleteness(panels, complete_ids)` requires exactly 40 nonempty,
  source-disjoint original primary panels. The complete-ID mapping must cover
  every panel and contain only its original IDs. It derives `all_defined`.
  This object contains no target values and cannot silently omit an incomplete
  panel. Empty secondary panels are produced later by literal restriction.
- `calibrate_population(fit, calibration_panels, calibration_targets,
  future_panels, completeness, population, sampling_premise, freeze_reference,
  objective_reference, constraint_reference, outcome_reference)` requires 20
  calibration and 20 future `FrozenPanel` records with the same fit, exactly the
  manifest's 40 original panels, disjoint original IDs/ordinals/source groups,
  and no overlap with development. Calibration target rows must cover each
  original calibration ID, including explicit unknowns, and agree with the
  complete-ID manifest. Reference strings and a declared SHA-256 freeze reference
  are retained and identity-bound; only external custody can verify their
  connection to an actual archived artifact.

For population `primary`, an incomplete row anywhere among the reserved 40
forces the sampling premise to `unsupported`. Complete calibration alone is
insufficient. `secondary` uses complete-ID subsets and literally filters every
frozen order, including empty panels. Unsupported caller premises remain
unsupported in both populations. Generic calibration is unchanged: score is
`-YS`, constraint is `threshold - E`, alpha is exactly `1/10`, all 20 calibration
panels remain, and the required rank is 19. It retains all tied optima through
weak threshold comparison. Zero threshold can yield a **statistical empty pool**;
it is not an infeasibility certificate. Generic unsupported/incomplete reasons
remain visible alongside study-level reasons.

The `PopulationPlan` contains original inputs, generic protocol/calibration,
future panels and decisions, every restricted order, and 480 sealed schedules.
Schedules bind panel, policy, original ordered IDs, decision digest and snapshot
caps. `primary`, `processing`, `objective_only` and `random_0` through `random_19`
are full policies; `stopped` is the exact primary calibrated prefix. A changed
panel maximum above 25 is rejected, rather than silently raising the registered
32-request cap. The wrapper must additionally establish the actual fixed source
funnel, 314-row condition cohort and 35 development source groups.

## Replay and exact denominators

`PolicyRun(plan_digest, panel_id, policy_id, decision_digest, observations)`
records an ordered, non-repeated sequence of immutable `Targets` rows.
`audit_replay(plan, runs, truth)` requires all 480 schedules, including zero-cost
runs, and exact scheduled ID prefixes. It rejects stale seals, duplicate/missing
runs, out-of-order/repeated/foreign requests and disagreement with later truth.
The later truth mapping must contain each original primary future row, including
unknowns, even for a secondary replay; its complete-ID set must agree with the
original role-blind completeness manifest before restriction.

Each panel audit retains every policy snapshot at caps 0,1,2,4,8,16,32, plus a
separately labeled same-actual-K snapshot for **every** policy. Stopped actual
cost is `min(cap,K)`; a full policy's cost is `min(cap,m)`. The stopped and full
primary orders are identical through K and receive identical same-cost metrics.
One bundle request costs one logical unit even when an endpoint is unknown.
Costs count logical requests, not physical experiments, CPU time, API calls or
a proof that a source cell was read exactly once.

Complete truth determines all feasible tied YS maximizers. Any-optimum hit and
all-optima retention are distinct. Regret is only defined when the full feasible
optimum and a revealed feasible best both exist. A tie can give regret zero
while losing another true optimum. No feasible reveal gives undefined regret,
not infinity or zero. Empty and complete infeasible panels have hit zero and
vacuous all-optima retention one; their best value and first-optimum cost remain
not applicable. Empty `K/m` is unavailable with `EMPTY_PANEL`.

Incomplete primary truth leaves global optimum, feasible-hit, retention and
regret unavailable. Observed rows with known `E >= threshold` are counted
separately even when YS is unknown. Whole-universe set retention is a separate
set fact, never measured discovery. Original unknown counts and secondary
population unknown counts are distinct. Macro rates expose their exact
numerator and denominator; a zero denominator produces `None`. Original 20-panel
counts, complete/unknown/infeasible/empty dilution, candidate totals and all
alternative-cap policy rates are retained.

`evaluate_study(primary_replay, secondary_replay)` requires both complete replay
objects, the same original fit/panels/labels/completeness/references, and the same
later truth. It computes F, D, every predefined gate margin, every failed gate,
component outcomes and the completed overall verdict. The pure gate arithmetic
uses exact inequalities: at least ten discovery panels, 9/10 all-optima pool
recall, mean pool fraction at most 3/4, finite conditional secondary calibration,
1/10 improvement over the average of all 20 hash controls at cap four, and strict
improvement over both processing and objective-only controls. Empty denominators
cannot pass. Empty F leaves pool-usefulness `None` with
`NO_FEASIBLE_CANDIDATE`; empty D leaves ranking-usefulness `None` with
`SECONDARY_DISCOVERY_PANELS_BELOW_10`. Required-to-proceed gate booleans remain
false, while per-gate/component reasons distinguish unavailable metrics from
observed threshold failures. Unavailable metrics do not receive misleading
below-threshold reason codes; calibration status is still reported separately. An incomplete ledger raises `REPLAY_INCOMPLETE`; it cannot create an
overall performance verdict. The custody wrapper must preserve its partial run
ledger and emit the corresponding INCOMPLETE stage receipt.

The only possible positive completed verdict is `GO_DESIGN_INDEPENDENT_STUDY`.
It does not claim a measured deployment success or physical validity. Statistical
pool coverage remains a **conditional single-future-panel marginal** statement,
not a simultaneous guarantee over 20 evaluation panels or coverage conditional
on the observed calibration set, secondary eligibility or feasibility.

## Arithmetic and privacy limits

Feature inputs keep their original 1024-bit profile. The study arithmetic allows
8192-bit reduced rational numerators/denominators and 16385-bit temporary
integers. Multiplication, integer addition and rational operations check bounds
before unbounded products/sums. Exact cancellation can succeed within those
limits. Exceeding a limit raises `ARITHMETIC_LIMIT` for the whole dependent
calculation; it never substitutes floats, skips a row or changes a denominator.
Zero-coordinate differences are skipped algebraically. This is an arithmetic
profile, not a total time/memory bound; the future guarded worker owns those.

Returned objects contain **private row IDs, targets, features and predictions**.
Do not publish their direct dataclass encoding. A separate closed public report
projector must emit only the protocol-authorized aggregates and whole-artifact
identities. No actual MPEA artifact is needed to run the synthetic test suite:

```
PYTHONPATH=.cache/mpea-study-engine/scripts:scripts:src \
  python -m unittest discover -s .cache/mpea-study-engine/tests -v
```

The tests include independently computed source-balanced neighbor means, L1
known answers, signed ranking direction, threshold equality, exact hash rules,
lower-median controls, all fallback routes, missing-label and tied-optimum
countercontrols, invalid ledgers, exact gate boundaries, zero denominators,
independent complete-world metric enumeration and future-label noninterference.
These are implementation checks, not a new scientific experiment, an empirical
coverage estimate, or a Python-to-Lean refinement proof.
