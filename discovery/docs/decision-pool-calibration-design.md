# Research design and Python prototype: calibrating a candidate pool directly

**Status: exact Python-only prototype; scientific premises remain unverified.**
[decision_pool.py](../src/lupine_discovery/decision_pool.py) implements this
separate statistical pool-selection rule. It adds no wire schema, UI mode,
trained ranking, or scientific benchmark result. No scientific targets were
opened and no model was fitted for this inquiry. The argument below was
independently reviewed; focused and independent synthetic software checks are
recorded at the end. Formal proof scope is maintained separately, and there is
no Python-to-Lean refinement proof or verified deployment sampling law.

The proposal can bound the probability of losing **any true feasible tied
minimizer in one future finite panel**, provided complete calibration panels and
the future panel have the required exchangeable score law under one frozen
ranking procedure. It need not construct simultaneous score/constraint
intervals. Its principal costs are complete panel labels and a defensible panel
sampling law. It can still retain every candidate, and its marginal guarantee
can coexist with failure on every panel that has a feasible candidate.

The prototype exposes the narrow rule; scientific use still requires the
specified panel protocol and evidence. Do not replace the interval selector, reinterpret
existing calibration rows as panels, or attach this guarantee to an existing
archive retrospectively. This is a split-conformal construction for a nested
family of pools, not a claim of a new general probability principle or superior
scientific performance.

For context, Angelopoulos and Bates describe the general score/quantile/weak
inclusion construction in Section 1.1 (pages 5–6) of
[A Gentle Introduction to Conformal Prediction and Distribution-Free Uncertainty
Quantification](https://arxiv.org/abs/2107.07511v6), arXiv:2107.07511v6. The
[PDF](https://arxiv.org/pdf/2107.07511v6) was retrieved and its text inspected on
2026-10-10; the retrieved PDF has SHA-256
`c69aa191d8363c25b36685db4adb7e6980e55ee39892fd3626206c16e1e0efa1`.
Their introduction (page 4) explains that “the probability is marginal (averaged)
over the randomness in the calibration and test points.” Section 3.1 (pages
12–13) distinguishes
feature-conditional coverage, saying “conformal procedures are not guaranteed
to satisfy (7),” where (7) conditions on the test input. It separately states:
“The key idea is that the coverage of conformal prediction conditionally on the
calibration set is a random quantity.” These are different conditionings, and
neither is replaced here by a per-material certainty claim. The task-specific
contribution of this draft is the all-minimizer score, its bridge to a ranked
candidate pool, and the proposed scientific protocol. The primer does not
validate those scientific premises or any Lupine result. The lower-bound proof
below is self-contained and does not import an upper-coverage claim that would
need additional tie handling. The calibration-conditional quotation is from
Section 3.2 (page 14).

## Objects, target, and information boundary

A panel `Q` contains a finite candidate universe `U(Q)` of size `m(Q)`, the
scenario and observable information used for ranking, and full recorded truth
for one scalar objective `s_Q(x)` and each constraint `g_Qj(x) <= 0`. Empty
constraint sets make every candidate feasible. Objective normalization,
constraint thresholds, units, scientific jurisdiction, and the meaning of
recorded truth belong to the frozen protocol.

Define

```
F(Q) = {x in U(Q) : every g_Qj(x) <= 0}
M(Q) = {x in F(Q) : s_Q(x) <= s_Q(y) for every y in F(Q)}.
```

`M(Q)` includes every feasible tied global minimizer of this finite universe.
It is empty exactly when `F(Q)` is empty. It says nothing about materials absent
from the panel. Finite real scores are assumed; no optimum is invented for an
empty universe or an infeasible panel.

For nonempty panels, a deterministic ranking rule assigns each candidate a
unique ordinal

```
r_Q : U(Q) -> {1, ..., m(Q)}.
```

The rule, model, features, preprocessing, candidate-generation procedure, and
deterministic tie-breaking are frozen outside the calibration labels. They must
run with information available before the future truth is revealed. Predicted
score ties can be broken by a frozen ID rule; these are distinct from ties in
the true constrained objective. Calibration truth is used to evaluate `M(Q)`,
never to rank that same panel or choose a favorable ranking rule.

Define the exact scalar score

```
R(Q) = 0                                      if M(Q) is empty
R(Q) = max {r_Q(x)/m(Q) : x in M(Q)}           otherwise.
```

Thus `0 <= R(Q) <= 1`. The empty case is defined before division: an empty
universe has no ranks and no `0/0`. A nonempty minimizer set has positive score.
Using the maximum over **all** minimizers is essential. Calibrating the best
ranked optimum instead addresses the different goal of keeping at least one.

For `tau` in `[0,1]`, define the nested family

```
Pool(Q, tau) = empty                          if m(Q) = 0
Pool(Q, tau) = {x : r_Q(x) <= m(Q)*tau}        otherwise.
```

All boundary candidates are included. Its size is exactly `floor(m(Q)*tau)`
under the unique ordinal convention. Integer/rational comparison implements
the predicate without rounding a threshold. The deterministic bridge is

```
M(Q) is a subset of Pool(Q, tau)  iff  R(Q) <= tau.
```

For a nonempty minimizer set this follows by taking its maximum rank. For an
empty set, both statements hold because `tau >= 0`. This bridge requires no
smoothness, interval, independence-within-panel, or material descriptor
assumption. Its truth labels and universe must nevertheless mean what the
scientific protocol claims they mean.

## Calibration rule and finite-sample statement

Fix an exact risk budget `0 < alpha < 1` and a calibration count `n` before
inspecting the calibration labels. Let `Q_1,...,Q_n` be calibration panels,
with every required score and
constraint label available. Compute `R_i = R(Q_i)` using the frozen ranking.
Set

```
N = n + 1
k = ceil(N*(1-alpha)).

if k <= n: tau = kth smallest of R_1,...,R_n
if k > n:  tau = 1, and explicitly return the entire future universe.
```

The second branch includes `n=0`. Here `1` is a proved upper bound for every
possible panel score, not a clamp to the largest observed calibration value.
This differs from an unbounded regression residual, where no finite universal
upper bound exists. A finite order statistic equal to `1` also retains the
entire universe; record that as an uninformative finite result, distinct from
insufficient calibration resolution.

The required probabilistic premise is exchangeability of
`(R_1,...,R_n,R_new)` under an additive probability law, with the score functions
and events measurable. Exchangeability of the
whole panels, conditional on independently frozen training/ranking information,
is a sufficient way to obtain it. Conditional exchangeability on that external
information gives the statement conditional on that information; the statement
can then be averaged over it. It is **not** conditioning on the observed
calibration scores or on a particular future material.

Under that premise, for `k <= n`,

```
Pr(M(Q_new) subset Pool(Q_new,tau)) >= k/(n+1) >= 1-alpha

Pr(any true feasible tied minimizer is lost)
    <= (n+1-k)/(n+1)
     = floor((n+1)*alpha)/(n+1)
    <= alpha.
```

For `k>n`, retention is deterministic because the output is the whole universe.
This is an exact finite-sample lower bound, not an assertion that coverage is
exactly `1-alpha`. Score ties may make the bound conservative.

To prove the finite branch, fix any vector of `N` scores. For each index `i`,
let `tau_-i` be the kth smallest of the other `N-1` scores. A leave-one-out
failure `R_i > tau_-i` occurs exactly when at least `k` other scores are
strictly smaller than `R_i`. At least the first `k` indices in a nondecreasing
sort, breaking ties arbitrarily, have fewer than `k` strictly smaller scores.
Therefore

```
sum_i 1{R_i > tau_-i} <= N-k
```

holds for every score vector. Exchangeability makes the `N` failure
probabilities equal. Taking expectations and dividing by `N` gives the claimed
bound for the future index. Apply the deterministic bridge to obtain
all-minimizer retention. Weak pool inclusion is why ties do not invalidate the
counting step. No independence among candidates, objectives, constraints, or
panels was used; the exchangeability and additive probability premises were.

The existing [risk module](../formal/LupineRisk.lean) admits normalized monotone
subadditive capacities, which are enough for its union-bound results. That
general abstraction alone does not justify this averaging argument. A future
formalization must supply an additive probability law, or first prove the
finite uniform-permutation instance and explicitly state its scope.

## Resolution, ties, panel size, and empty decisions

The finite-rank condition is

```
k <= n  iff  alpha >= 1/(n+1)
        iff  n >= ceil(1/alpha)-1.
```

At `alpha=1/20`, 19 complete panels permit a finite threshold, namely their
largest score; 18 do not. At `n=19, alpha=1/10`, `k=18`. These are arithmetic
resolution statements, not useful-pool guarantees. The initial API should
reject risk endpoints `0` and `1` rather than introduce an implicit zero order
statistic or inconsistent endpoint conventions.

Variable panel size is permitted: the normalized score is computed separately
inside each panel before calibration. For example, with calibration scores
`1/4, 1/2, 3/4`, `n=3, alpha=1/2` gives `k=2` and `tau=1/2`. A future panel of
six candidates retains ranks 1 through 3. If its true minimizers have ranks
2 and 5, it fails all-optimum retention because `R_new=5/6`. Such a realized
failure is compatible with a marginal risk statement; it must remain visible
in replay.

Normalization does not make an arbitrary change in panel size or candidate
generation exchangeable. Nor does it control absolute experimental cost:
`tau=1/10` retains 10 candidates from 100 and 100,000 from 1,000,000. Adding
irrelevant candidates can change ranks, fractions, and apparent utility. Freeze
and report the complete panel-generation rule and report absolute pool sizes
as well as fractions.

If every candidate is feasible and tied for best, `R=1` regardless of ranking.
Likewise, a unique optimum always placed last has `R=1`. A distribution supported
on either kind of panel forces `tau=1` for every finite calibration size. More
calibration alone cannot fix a useless ranking or the all-ties requirement.

If `tau=0`, every nonempty future universe receives an empty statistical pool.
That is **not** a certificate of infeasibility: it only means the calibrated
prefix has size zero. An empty universe also returns an empty pool, but has no
candidate to lose. Outputs and replay must distinguish these cases. A declared
policy that enlarges a nonempty panel's empty pool to its top-ranked candidate
preserves the theorem by set inclusion; it changes utility and must be visible.
No arbitrary truncation has the same protection.

## Two counterexamples to stronger interpretations

**Marginal retention need not protect feasible panels conditionally.** Consider
20 fixed, nonempty panels in a uniformly random order. Nineteen have no feasible
candidate, hence score `0`. The remaining panel has a unique feasible optimum
at rank `m`, hence score `1`. Use the first 19 for calibration, the last for
testing, and `alpha=1/20`, so `k=19`.

Whenever the feasible panel is the test panel, all calibration scores are zero,
the pool is empty, and retention fails. This happens with probability `1/20`.
Whenever an infeasible panel is tested, retention is vacuously true. Overall
retention is exactly `19/20`, satisfying the theorem, while retention conditional
on a feasible test panel is zero. Report feasible and infeasible panel counts
and utility separately. Do not turn vacuous successes into evidence of useful
materials discovery or claim conditional coverage from those reports.

**The guarantee is not conditional on the realized calibration set.** Let a
pair of feasible panels with scores `1/2` and `1` arrive in uniformly random
order. With `n=1, alpha=1/2`, the threshold is the calibration score. Overall
failure probability is `1/2`. Conditional on observing calibration score `1/2`,
the future panel fails with probability one. A realized receipt cannot mean
“this particular pool has a verified failure probability at most alpha.”

These examples satisfy exchangeability and do not refute the theorem. They
refute stronger meanings that a product or report might mistakenly attach to
it. A conditional-on-feasibility target would require a separately designed
sampling/calibration argument; deleting infeasible panels after inspection is
not a justification by itself.

## Complete labels, missingness, and the sampling unit

For this initial proposal, every calibration panel is complete before its
score is admitted. An observed best candidate is not necessarily the true best,
and an observed unique optimum can have an unobserved tie at the last rank.
Unknown constraints can change both feasibility and the minimizer set. Missing
truth is never represented by `R=0`, a shorter universe, or a smaller
denominator. A panel with missing labels is not an empty or infeasible panel.

The complete-panel requirement is deliberately simple. Mathematically, a
separately valid exclusion argument could sometimes establish `M(Q)` without
every scalar label; that is another protocol and is not supplied here. Recorded
rounded or noisy outcomes also require a declared target: equality of reported
values is not proof of equality of unknown physical values. Freeze exact tie
semantics and never choose a tolerance after seeing which optima would be lost.

Dropping incomplete panels can select an easier population. A complete-case
sample is suitable only if the required relation to the deployment population
is justified. If missingness prevents that justification, the initial design
must abstain and retain the full universe, or reject calibration construction.
It must not silently decrease `n` and present the resulting statistic as a
repaired coverage argument.

There is a possible conservative extension, not part of this initial proposal:
retain every predeclared calibration draw and upper-bound an unobservable score
by `1`. If the *underlying true* panel scores are exchangeable and each substituted
calibration score is at least its true score pointwise, monotonicity of order
statistics makes the resulting threshold no smaller than the complete-truth
threshold. The retention bound is preserved, potentially with much larger
pools. This does not repair label-dependent panel selection, unknown sampling
scope, or physical target error. It needs its own explicit receipt and tests.

Here `n` counts panel observations under the declared sampling mechanism, not
candidate rows, atoms, model seeds, or repeated computations. Within-panel
dependence is unrestricted. Dependence or overlap across panels is not
automatically fatal: a uniform random permutation of a finite panel population
is exchangeable, as the counterexamples show. But shared materials, arbitrary
overlapping windows, repeated references, a group split, or an archive's
publication do not establish exchangeability. Artificially resampling a fixed
archive can define a valid archive-resampling target while providing no
coverage claim for new physical materials outside that target.

## Costs and comparison with the current engine

One scalar panel score directly targets the all-optimum event, so this route
does not allocate `alpha/(m*p)` across `m` candidates and `p` scalar properties.
That is a different calibration target from the
[joint interval design](joint-coverage-design.md), not a free improvement at
the same evidence budget. Complete labels typically cost

```
sum_over_calibration_panels m_i * (1 + number_of_constraints_i)
```

scalar target values, plus ranking, provenance, and completeness checks. With
several constraints, compute feasible sets and minima in linear label work;
ranking and an ordinary order-statistic implementation add sorting work. A
separate untouched evaluation set has an additional label cost. Published
complete panels may avoid new DFT for retrospective development, but do not
supply missing measurements or the deployment sampling premise.

If measurement costs vary, report the sum of retained candidates' declared
costs, not only their count. A cost-aware nested family could be studied later;
the ordinal-fraction score above does not control it. If a budget cannot cover
the returned pool, report budget insufficiency. Evaluating a prefix first is a
scheduling choice; claiming the shortened prefix retains the same guarantee
is incorrect. Pool enlargement preserves retention; intersection or truncation
requires an additional argument. An intersected statistically justified filter
can introduce another risk budget rather than inherit this one unchanged.

The [interval-box sharpness result](sharpness.md) says no smaller pool preserves
all minima in every compatible interval world using those bounds alone. This
proposal changes the claim: it assumes a panel sampling law and allows a
specified marginal frequency of failure. It does not defeat that lower bound,
prove any candidate feasible, supply a numerical regret bound, validate a
physical surrogate, or narrow an interval. A future output must therefore use
its own statistical contract, not the existing interval certificate's
feasibility or regret fields.

For `B` future decisions, single-panel coverage does not imply simultaneous
coverage at the same `alpha`. If each decision separately satisfies the stated
premises at preallocated risk `alpha_b`, a union bound gives simultaneous
failure at most `sum_b alpha_b`, without independence between decisions. The
simple equal allocation `alpha_b=delta/B` requires at least
`ceil(B/delta)-1` calibration panels for a finite order statistic. This is a
sufficient composition route, not an optimality statement. Adaptive queries,
retraining, changed families, or stopping rules need their own justification.

## Prototype boundary and future scientific evaluation

The implemented prototype is a separate exact Python API
with three operations: evaluate complete calibration panels under a sealed
ranking; compute the rank and threshold; select and seal a future prefix before
opening its truth. It accepts exact rational outcome labels and explicit ranking
permutations, rejects floats and unspecified ranking tie-breaking, and derives `n` and
`m` from validated records. True objective ties remain valid and are all included
in the target. Any precomputed panel score needs the complete score-generation
receipt; a number by itself does not prove label completeness or sampling.

A receipt should bind the panel universe and candidate IDs, ranker/model and
feature versions, tie rule, candidate-generation and sampling protocol, target
and scope definitions, calibration panel identities and truth manifests,
`alpha`, all calibration scores, `n`, `k`, `tau`, the exact ordered pool, and
the reason for any full-universe response. Keep `assumed_unverified` separate
from unsupported premises. Neither a digest nor a successful replay may upgrade
exchangeability to an established physical fact.

Incomplete calibration truth and an unsupported sampling premise produce no
conditional screening claim and retain every original candidate operationally.
Unavailable or invalid rankings, incompatible scopes, and invalid syntax or
identity are input errors; the API never infers a replacement ranking. The insufficient-rank
branch is a valid all-universe mathematical result and needs a different reason.
An available finite threshold may also select the entire universe. Do not merge
these three situations into one apparently successful screening result.

Replay should compute the actual pool first and then read independent outcomes.
Only complete relevant truth can establish the true minimizer set and global
all-optimum retention; partial truth leaves that result unknown. Report all
tied optima and any lost IDs, feasible-panel status, retained count/fraction and
cost, no-feasible and empty-universe cases, and actual measurement budget. An
empty minimizer set makes logical retention vacuous; count it separately from
the feasible-panel retention denominator. No empirical test set establishes the
exchangeability premise merely by passing a nominal rate threshold.

Before any scientific result is claimed, the protocol needs:

1. A defined deployment panel population, scientific target, universe-generation
   mechanism, panel size distribution, and train/calibration/evaluation split
   with explicit leakage and repeated-identity rules.
2. A frozen ranker, preprocessing, tie convention, risk budget, candidate scopes,
   baseline methods, utility metrics, and allowed stopping/selection decisions.
   Tuning among rankers using calibration retention or pool sizes consumes those
   labels; use new calibration after tuning, or prove a different procedure.
3. Complete calibration and separately reserved evaluation panels, with unknown
   values and source disagreements preserved. Report the full panel manifest,
   label acquisition cost, all failed panels, and any population restrictions.
4. Exact implementation tests and a formal or independently checked version of
   the counting argument. The synthetic checks recorded below exercise the
   implementation; protocol-level leakage controls and application validation
   remain requirements, not findings from those checks.
5. A preregistered comparison at equal labeling and deployment budgets against
   whole-universe retention and simple frozen ranking prefixes. Any comparison
   with the interval engine must distinguish its different assumptions and
   claims. Report both pool reduction and failures, with feasible-panel and
   family/size diagnostics; subgroup diagnostics do not create subgroup coverage.

The prototype target is general finite-panel all-minimizer retention under a
declared frozen score law. A scientific panel population remains to be chosen
and justified. If complete exchangeable panels are unavailable, more code does
not resolve the missing premise.

## Required negative controls and proof checks

| Probe | Required consequence |
| --- | --- |
| Exhaustive small score multisets with `0`, repeated fractions, and `1` | Leave-one-out failures never exceed `N-k`; weak ties are retained. |
| Rank just below the finite-resolution boundary, including `n=0` | Whole universe; never substitute the maximum observed score. |
| Two true tied optima at ranks 1 and `m` | Score is `1`; using the minimum rank must be detected as a wrong target. |
| Equal scores at the threshold | Strict `<` selection must fail a test; exact `<=` must include them. |
| Empty universe, nonempty infeasible panel, and unknown labels | Distinct states; only the first two establish an empty minimizer set. |
| Variable `m` with the same rational threshold | Pool size is `floor(m*tau)` with no floating-point boundary error. |
| Reverse ranking, or unique optima always last | Validity need not improve utility; all-universe output is preserved. |
| The 20-panel exchangeable counterexample above | Marginal retention passes; conditional-on-feasibility retention fails. |
| Calibrate on early-ranked optima, deploy only last-ranked optima | Distribution shift can cause certain failure; no unconditional deployment guarantee survives. |
| Hide the last-ranked true optimum or drop difficult incomplete panels | Completeness/sampling gate rejects or abstains; score is not silently reduced. |
| Select a ranker using these same calibration labels | Protocol records leakage; a small calibrated pool is not validation. |
| Cut a valid pool to meet a smaller measurement budget | Lost optimum remains a failure; the original guarantee is not inherited. |
| Reorder input rows under fixed rank ties and exact arithmetic | Identity and ranking conventions determine reproducible output. |
| Reuse one receipt for many adaptive queries | Single-panel risk is not relabeled as a simultaneous risk bound. |

The mathematical conclusion is a valid conditional route to a **statistical**
candidate pool. Scientific usefulness, an appropriate application sampling unit,
complete label availability, and deployment resource requirements remain open.
The synthetic checks below provide bounded software evidence, not an exhaustive
correctness proof or a hard time/memory guarantee.
There is no claim of improvement on JARVIS, any frozen Lupine benchmark, or a
new material-discovery task.

## Implemented Python API contract

The target is general finite-panel all-minimizer retention under the declared
frozen score law. No dataset or scientific jurisdiction is selected by this
contract. The following API is implemented in `decision_pool.py`. It
stays separate from interval/coupled certificates and has no wire or UI surface.

Use frozen dataclasses, copy sequences to tuples, copy mappings in sorted-key
order into immutable mappings, and apply the existing exact scalar rules:
integers, rational/decimal strings, and `Fraction` are accepted; booleans,
floats, nonfinite values, generators, and inappropriate containers are rejected.
Exact source scopes use the existing `Scope` record. All IDs and references
must be nonempty; digest fields must be lowercase SHA-256 strings. Digests bind
canonical exact records and do not attest training independence or physical
truth. Input order of a semantic mapping does not change identity.

Input constructors:

```python
PoolProtocol(
    protocol_id, scenario_id,
    ranker_id, ranking_rule_id, tie_rule_id, generator_id,
    freeze_reference, sampling_scope,
    objective_scope, constraint_scopes,
    premise_status='assumed_unverified',
)

RankedPanel(
    panel_id, universe_id, protocol_digest, feature_manifest_digest,
    candidate_ids, ranked_ids,
)

PanelOutcome(candidate_id, score, constraints)
PanelOutcomes(panel_digest, source_reference, rows)
CalibrationPanel(panel, outcomes)
```

`PoolProtocol` binds the model/ranking and tie conventions separately from the
candidate generator. `freeze_reference` identifies the externally frozen model,
features, preprocessing, training state, and their source/version manifest.
`sampling_scope` states the intended panel law; it is a required declaration,
not a verified property. Objective scope must have quantity `score`; constraint
keys are disjoint from `score`, match their quantity scopes, and share the
protocol's scenario. Only `assumed_unverified` and `unsupported` are accepted
premise statuses. The prototype does not infer compatibility across scopes.

`RankedPanel.candidate_ids` is a canonical sorted universe with unique IDs;
`ranked_ids` is an exact ordered permutation of it. Empty tuples are valid.
Ordinal ranks are derived from the permutation, never caller-supplied fractions
or a caller-supplied `m`. `panel_id` identifies the panel observation/draw;
`universe_id` identifies its declared membership universe. Reusing a universe
identity with conflicting membership in one calibration/selection operation is
an error. The same candidate can appear across compatible panels; that is not
evidence for or against exchangeability by itself. Ranking and universe
identities bind all these declarations. A protocol mismatch is an input error,
not a reason to reinterpret one population as another.

`PanelOutcomes` binds the exact ranked-panel digest and source reference. It has
exactly one row for each declared candidate and exactly the declared constraint
keys. Unknown values are explicit `None`, including an entirely unknown row;
omitted, duplicate, or extra IDs/constraint keys are rejected. Known positive
constraints never become zero. All fields are validated even when another
label is unknown or a premise is unsupported. Empty universe plus empty rows
is complete. No missing value is filled from another panel or nominal predictor.

Operations:

```python
assess_panel(protocol, panel, outcomes) -> PanelScore
calibrate_panels(protocol, panels, alpha) -> PoolCalibration
select_pool(calibration, future_panel) -> PoolDecision
```

`assess_panel` returns the bound input identities, candidate count, explicit
missing `(candidate_id, quantity)` pairs, and a completeness status. Complete
truth yields the exact feasible IDs, every tied minimizer ID, and `R`; empty or
infeasible panels yield `R=0` with a distinct empty-minimizer reason. Any missing
required label yields `R=None` and unknown global minimizer/feasible-set fields,
even if a partial observation might support a narrower fact. These fields are
assessments of supplied truth, not feasibility certificates for unknown future
candidates. Keeping the first implementation strict avoids an implicit partial
identification algorithm.

`calibrate_panels` accepts a finite sequence of `CalibrationPanel` records and
recomputes every assessment. It does not accept a free-standing list of caller
scores, precomputed `tau`, or a declared smaller count. Duplicate panel-draw IDs
are rejected; any repeated underlying universe remains recorded. It derives
the total count `n`, a separate complete-count diagnostic, and `k`, preserving
every record. The
declared fixed-count protocol must match the supplied experiment; the function
cannot prove that the caller did not select records using hidden labels.

Here `n` is **the total supplied panel count**, not the complete-count diagnostic.
If any assessment is incomplete, no order statistic is used operationally.
`PoolCalibration` preserves the immutable protocol, original panel/outcome
records, their derived scores, input/content identities, exact `alpha`, `n`,
complete count, `k`, threshold, status, and all applicable reason codes. Derived
fields are constructed from the validated original inputs and are not writable
constructor parameters. The primary status follows this precedence:

| Primary status | Threshold | Operational consequence |
| --- | --- | --- |
| `unsupported_premise` | `None` | Keep the entire future universe; do not claim a calibrated bound. |
| `incomplete_calibration` | `None` | Keep the entire future universe; never sort only the known scores. |
| `insufficient_calibration` (`k>n`) | Exact `1` | Keep the entire future universe using the score's proved universal bound. |
| `finite_conditional` | Exact kth score | Apply the weak rank threshold under unverified statistical premises. |

For example, unsupported premises plus an incomplete panel record both reasons,
although the primary status is `unsupported_premise`. For valid `n=0` with
assumed premises, the status is `insufficient_calibration`. The result never
upgrades the protocol's premise status. A finite threshold of `1` remains
`finite_conditional` with a separate `no_pool_reduction` diagnostic.

`select_pool` accepts no future outcomes. It validates the new panel against
the frozen protocol and calibration records, rejects a reused calibration
panel-draw ID, and returns `PoolDecision` with the bound calibration/panel
identities, premise/calibration statuses, all original IDs, ordered retained
IDs, derived `m`, threshold, and reasons. The declared population may sample the
same universe again; its new draw must have its own panel ID. Unsupported or
incomplete calibration retains every original ID without fabricating a finite
threshold. Insufficient calibration uses the explicit full-universe branch.
The finite branch compares `rank <= m*tau` exactly and preserves every boundary
rank. It does not automatically add top-one or enforce a measurement budget.

An empty future universe and a nonempty universe whose finite threshold returns
an empty pool get different reasons. Neither an empty statistical prefix nor a
discarded ID is called infeasible. There is no incumbent, feasibility guarantee,
interval coverage, regret bound, per-candidate probability, or upgraded physical
attestation. The minimum prototype need not provide a replay API: an independent
test oracle can compare its sealed pool with subsequently supplied complete
truth. A later replay interface must preserve this same information boundary.

In addition to the scientific control table above, the executable test map is:

| Area | Independent check |
| --- | --- |
| Exact target | Enumerate feasible sets and tied minima directly from complete rational worlds; compare maximum ordinal fractions, including no constraints. |
| Counting lemma | Enumerate small multisets of rational panel scores and every left-out index; assert the pointwise failure-count bound independently of calibration helpers. |
| Calibration arithmetic | Derive ceiling and kth order with a separate integer oracle; test risk just above/below `1/(n+1)`, duplicates, `n=0`, and thresholds `0` and `1`. |
| Missing truth | Replace each objective/constraint entry with `None`; preserve all records/counts and require full-universe operational fallback, including otherwise obviously infeasible rows. |
| Information boundary | Show future truth changes neither calibration nor selection; assess it only after retaining the actual selected IDs. |
| Scope and identity | Wrong protocol/panel digests, conflicting universe membership, unknown quantities, omitted/duplicate rows, invalid rank permutations, and repeated draw IDs reject; metadata-only changes alter the appropriate identities. |
| Premise states | Unsupported always keeps all IDs, including cases whose numerical quantile would be tiny; no status can be upgraded by a successful known-answer audit. |
| Immutability | Mutating caller lists/maps after construction does not change results; public returned collections and derived fields cannot be assigned normally. |
| Statistical limits | Execute the two exchangeable counterexamples and an explicit shifted-law failure; report exactly which stronger statement fails. |

These tests establish arithmetic and implementation conformance on their tested
cases. They cannot verify an application population's exchangeability, recover
unobserved scientific labels, or prove the Python implementation refines Lean.

## Executed synthetic verification

[test_decision_pool.py](../tests/test_decision_pool.py) passed all 18 focused
tests. An independent pairwise oracle checks the assessment of every tied
feasible minimizer in 729 complete rational worlds. Other checks cover 64
missing-label patterns, 155 small leave-one-out multiset/rank configurations,
exact resolution boundaries, variable panel sizes, all ties, empty universes,
unsupported premises, immutable inputs/results, identity propagation, invalid
rankings/scopes, and forbidden overrides of derived fields. Both exchangeable
counterexamples and shifted-law/budget-truncation failures are executable tests.

[test_decision_pool_review.py](../tests/test_decision_pool_review.py) separately
passed 16 independent tests against the same runtime source. Its reviewer
reported 5,017 complete-world oracle cases plus finite-law/counting controls,
missing-label handling, strict identity checks, and immutable exact results.
The suites have overlapping coverage and their counts must not be added as
independent scientific observations.

```sh
python -m unittest discover -s tests -p test_decision_pool.py -v
python -m unittest discover -s tests -p test_decision_pool_review.py -v
```

The reviewed runtime source SHA-256 is
`76e96165102ebe8c3785f510d169b5d393838fb144f9c4275ffdb0aa6c21f1f9`.
These checks read only synthetic records. No archived target tables, train/test
splits, existing selectors, or benchmark results changed. The runtime deliberately
does not infer a missing ranking, detect an undeclared label leak, attest a
source, or establish the declared sampling law. Its cost grows with record
counts and rational bit lengths; no end-to-end execution or memory cap is claimed.
