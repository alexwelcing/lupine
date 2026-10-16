# MPEA tensile archival recovery: prospective protocol option

**Draft option only. Not registered, not a frozen scientific protocol, and not
authorization to decode targets.** No split was executed, random allocation
drawn, model fitted, or target acquired/read for this document. Final registration
requires the reviewed G15C metadata evidence and an explicit feature-encoding
contract; G15C metadata is now available, but features are not. All numerical design choices below are proposals to
freeze before target interpretation; none was selected from performance results.

The proposed question is: **among historical database records declared as
tensile tests at exactly 25°C, can a frozen ranker recover the largest recorded
yield strength among records whose reported total elongation exceeds a
training-derived threshold?** A separate calibrated-prefix analysis asks how much
of a panel can be stopped while retaining all its recorded feasible tied optima.
These are archival recovery and stopping questions, not plant qualification,
prospective material discovery, specimen-level joint measurement validation, or
evidence for temperature extrapolation.

## 1. Observed metadata, source identity and information limits

Only the published G15B metadata/summary and newly authorized G15C supplement, the named schema/formula/design
documents, existing mathematical-runtime documentation and the collaborating
feature-adapter draft were used. No raw
cache, CSV, target-bearing notebook, new paper response or performance analysis
was opened. Prior project exposure to papers containing historical numerical
results remains disclosed in the cited source documents. This option cannot
claim that the researchers have never encountered relevant published values.

| Current public metadata fact | Count |
| --- | ---: |
| All preserved archive rows | 1,545 |
| Rows with recognized exact source-token groups | 1,544, in 264 groups |
| Unresolved source identity | 1 row, kept separately |
| Declared tensile rows | 358 |
| Tensile rows at exactly 25°C | 314, in 75 source-token groups |
| Source-group panel sizes within that cohort | 17×1, 8×2, 10×3, 13×4, 6×5, 7×6, 8×7, 3×8, 2×11, 1×25 |
| Processing in that cohort | WROUGHT 191, CAST 75, ANNEAL 29, OTHER 11, unresolved 7, POWDER 1 |
| Formulas recognized by frozen G15B | 0 of 1,545 |
| Formulas recognized by the separate G15C supplement | 1,545 of 1,545; 630 exact token groups |
| G15C exact formula-token groups within the 314-row cohort | 106 |
| Cohort formula-token groups spanning multiple source tokens | 12; 131 rows across 40 source-token groups |

The exact-25°C choice uses the declared numeric condition without combining
different temperatures into a manufactured matched condition. It is a narrow
archival design choice informed by these metadata, not a universal definition
of room temperature. Strain rate, specimen dimensions and complete thermal/
processing histories remain uncontrolled. The count 314 is **not** a count of
complete target pairs, specimens or usable independent experiments.

Source is Figshare `10.6084/m9.figshare.12642953.v9`, CC BY 4.0. The bound source
has 332,126 bytes, MD5 `6d29eb6018157b863ca0033ccec936d5` and whole-blob SHA-256
`c5504d93fd324d1be26cf814d0694ee9ee95578d68a0b38aba6813b939fa2c5d`.
The row-metadata producer commit is
`ec32247f404d7d2b0a916ff7012bded2accb48c8`; semantic mapping commit is
`d169b1070eaec916ebf9af221aa4596dd4b2cb1d`.

Inputs for this design:

- `reports/mpea-row-metadata-v1.json`, byte SHA-256
  `36e9831f2a015b2c295ce6228dd9b7bce5ba7df0f2645c343da2134ab7898c55`.
- `reports/mpea-metadata-summary-v1.json`, byte SHA-256
  `ddb67b50771bd12292517acd05299adcb3066ab90e0c26936639b3c2be3c8a8a`.
- `reports/mpea-formula-tokens-v1.json`, byte SHA-256
  `ce2b8d12464bac1c5e9533e136f09b3b65761188609279b40a78f31dbcc6d3a7`,
  produced at commit `a1e47024898072111f80e3ff911026306a50df2b`.
- `docs/mpea-column-mapping-v1.md`, `mpea-formula-format-evidence.md`,
  `mpea-evaluation-design-notes.md`, `decision-pool-calibration-design.md`,
  `decision-pool-workbench-contract.md`, and `finite-exchangeability.md`.
- Design-only alignment with
  `../mpea-feature-contract/formula-feature-adapter-contract.md` in ignored
  scratch. That draft is not an executed, published or frozen feature adapter.

The inventory accompanying this draft hashes those documents and records the
metadata-only calculations. The G15C supplement was authorized for this design
after the initial option was written. Its record IDs/ordinals join exactly to
all 1,545 G15B rows. It adds lexical recognition evidence and does not alter the
G15B zero-recognition result. The source-token allocation design, condition,
ranker, threshold and gates were left unchanged after this metadata update:
cross-source exact-token overlap is a disclosed limitation of source-only
holdout, not permission to silently redesign it. No actual split/role overlap
was computed. The supplement supplies no numeric coefficient vector, paired
target, specimen identity or chemical-equivalence evidence.

## 2. Candidate, objective and constraint

A candidate is one immutable source-bound database row, identified by archive
SHA-256 plus zero-based ordinal. It is not a chemical formula or a distinct
physical material. Never join values across rows, average duplicate-looking
observations, select a favorable replicate, or treat two records as the same
specimen because their composition/source/temperature fields match.

Use column 11 `PROPERTY: YS (MPa)` as recorded tensile yield strength `Y(x)`.
Use column 13 `PROPERTY: Elongation (%)` as recorded total tensile failure
elongation `E(x)`. Do not substitute plastic elongation (column 14), UTS,
compression strain, a ROM estimate, or an inferred engineering quantity.
YS offset convention, measurement uncertainty and actual same-specimen pairing
are not established. The endpoint is explicitly the **co-recorded database
pair**, not joint physical truth on an identified specimen.

In exact runtime units:

```
score(x) = -Y(x)                    # MPa; minimize
constraint(x) = T_E - E(x) <= 0     # percentage points; E=7 means 7 percent
```

Derive `T_E` from complete eligible training records only: sort their recorded
`E` values ascending and take one-based rank `ceil(n_train/2)`. This is the
nearest-rank 50th percentile, the lower median for even `n_train`; no averaging,
interpolation, or post-result quantile choice. Records, not source groups, have
equal weight for this declared threshold. Feasibility uses weak `E >= T_E`.
The threshold defines a relative training-archive endpoint and has **no external
engineering requirement interpretation**. No new paper research is needed to
justify a plant-specific elongation cutoff because none is claimed.

True optima include every feasible record with exactly equal largest parsed
`Y`; no fitted or outcome-chosen tolerance. Reported rounded ties are ties in
the database endpoint, not proof that underlying physical strengths are equal.

## 3. Preserve the full population; declare a secondary population in advance

Keep a stage0 ledger of all 1,545 identities and metadata states. The fixed
condition filter selects `test_mode=T` and exact rational temperature25 for the
314-row archival task. Every other row remains in the funnel with condition
outside-scope or unresolved reasons; its performance targets remain unopened.
Unknown processing/formula never removes a condition-eligible row.

Before target parsing, assign every source token a role. All rows sharing an
active source token inherit its allocation, including rows outside the chosen
condition; those extra rows are not training supplements. Other source groups
are `OUT_OF_SCOPE_TARGET_UNOPENED`. The unresolved-source row remains its own
unresolved identity, not a shared unknown group. In this observed cohort all 314
rows have recognized source-token groups; a future input-identity mismatch
blocks this version rather than silently inventing new allocations.

**Primary full-record population:** one panel per active source-token group,
containing every condition-eligible row assigned to that group. Keep all 75
panels, including singletons and any panel with unknown outcomes. If any of the
40 reserved primary panels has an undefined required recorded endpoint, the
primary finite-score law is unsupported and every primary future panel receives
the whole-universe fallback. Missing assigned calibration labels also retain the
runtime's incomplete-calibration reason; unsupported-premise status takes its
existing precedence. Do not drop a panel, reduce `n`, score the unknown panel as
zero, or claim a finite calibrated guarantee. For an
incomplete evaluation panel, truth-dependent recovery metrics are `UNKNOWN`,
not success or failure. Count the retained set and unresolved labels explicitly.

**Secondary complete-record population:** predeclare the same source allocations,
then let a sealed custodian determine which rows have both required interpretable
values under a frozen target parser. Each panel is the subset of its original
source-group panel passing this rule. It may be empty; preserve it. Do not move
groups, replace missing rows or regenerate panels to improve completeness.
This population is selected by reporting/semantic completeness and may be
performance-dependent. Its results do not extend to the full314 rows.

Proposed target parsing rule, to be implemented and tested before authorization:
accept a fully matched finite decimal literal, with optional sign and decimal
exponent, interpreted exactly as a rational in the declared column unit. Bound
decoded token length at 128 characters and numerator/denominator bit lengths
at 512. Strip only surrounding ASCII space/tab. Blank, nonfinite, interval,
inequality, uncertainty-annotated, unit-suffixed or otherwise unrecognized
tokens remain unresolved; do not take a convenient number from free text.
Negative YS or negative total tensile elongation is a semantic conflict and
fails secondary eligibility. Zero is numerically allowed in this proposed rule;
the final source-semantic gate must first establish that zero is not a documented
missing-value code for the selected columns. There is no empirical outlier
cutoff, strength minimum, upper percentile trim or E<=100 assumption. Preserve
all rejection reason counts. These rules are prospective choices, not observations
about actual target syntax. Resource-limit failures are visible, not missingness
silently repaired with a different parser.

Actual paired-value counts, syntax compatibility, reference ambiguity, and
completeness are unknown today. A fully quantified physically matched benchmark
would require pairing/condition evidence beyond this row-level recovery scope.

## 4. Allocation, panels and the limited probability claim

Propose 35 source-token groups for development and 40 reserved groups. Define
`H(tag,key)` as SHA-256 of the UTF-8 prefix `mpea-t25-archive-option-v1`, one
NUL byte, the UTF-8 tag, one NUL byte, and the UTF-8 key, concatenated in that
order. A group key is the pinned archive SHA, a colon and the canonical decimal
source-group ID, with no whitespace or leading zeroes except the ID 0 itself.
Sort the 75 groups by `(H("development",key), numeric_group_id)`; the first 35
are development. This deterministic choice must be written into the final
protocol, not retried for favorable sizes or results. Do not execute it now.

Before any target parsing, uniformly permute the remaining 40 groups; first 20
are calibration and last 20 evaluation. Concretely, let `q=40!` and
`w=bit_length(q-1)`. Draw `ceil(w/8)` bytes from the operating-system entropy
source, interpret as an unsigned big-endian integer, mask the unused high bits,
and accept only values `u<q`. Allow at most 128 draws; otherwise preserve
`NO_GO_RANDOM_ALLOCATION`. Decode the accepted integer into its lexicographic
permutation of the sorted 40 numeric group IDs by factorial unranking. Save all
draw bytes, the accepted index, full permutation and immutable allocation receipt
for exact replay. Conditional on independent uniform source bytes and completing
within the cap, the accepted permutation is uniform; this is an explicit entropy
premise, not an empirical property established by the archive. Review/test this
implementation before use. A fixed hash sort called “random” is not that proof.
There are no seed/permutation retries based on counts or outcomes.
Metadata group sizes remain variable and each group has
one panel, not one panel per row or repeated overlapping resample.

The narrow finite-archive interpretation is possible **conditional on** a uniform
permutation law, fixed development data/threshold/ranker, fixed source panels,
and role-blind completeness/ranking rules. Under those conditions any 20
calibration scores and one designated remaining evaluation score form an
exchangeable sample without replacement from the fixed 40-panel population.
Within-panel dependence, between-source dependence and varying panel sizes do
not invalidate that explicitly constructed finite permutation law. They do
block simply declaring the archive 75 independent scientific draws. Random
allocation does not make the historical panels representative of future studies.

The complete-record secondary supplies a defined score for each of its fixed
40 panels, including score 0 for an empty panel. The primary full-record
population supplies this score vector only if **every** required endpoint in
all 40 reserved panels is defined. Complete realized calibration alone is
insufficient: it neither defines the remaining scores nor justifies conditioning
the theorem on a favorable allocation. After the rank freeze, a predeclared
role-blind custodian check over the entire 40-panel primary population may report
only the required all-defined boolean and missingness reasons. If false, mark
the primary law `unsupported` and keep every future candidate. Do not assign
latent truth or unknown scores to make a score law exist. A true all-defined
boolean is invariant under the role permutation; it still does not attest the
entropy premise or permit a stronger runtime status than `assumed_unverified`.

Use exact `alpha=1/10`, `n=20`, `k=ceil(21*9/10)=19`. For a complete panel:

```
R = 0                                  if there are no feasible records
R = max(rank(x)/m for x in all_optima)   otherwise
tau = calibration score at ascending rank 19
pool = first floor(tau*m) ranked records
```

This is marginal retention of all recorded tied optima for **one** random
future archival panel, with conditional mathematical failure bound 2/21<=1/10
under the stated law. It is not a guarantee for each observed panel, conditional
on the realized calibration set, conditional on feasibility, or simultaneously
across all 20 evaluation panels or jointly across the two population analyses.
No binomial confidence interval may treat those
20 dependent draws as IID deployment trials. The conditional finite-archive mode
must always retain `premise_status="assumed_unverified"`, including after a
sampler's source/tests have been audited. Such checks do not attest uniform OS
entropy, the actual generation mechanism, or any new stronger premise status.
State the explicit entropy and frozen-score-law premises alongside the
conditional implication and empirical results. If the declared law is
unsupported, use `premise_status="unsupported"` and the runtime's whole-universe
fallback. Successful replay cannot upgrade either premise status.

The secondary population's empty panels have no candidates and score 0; nonempty
infeasible panels also score 0. Both contribute to the declared n=20 and to the
finite law, but supply no discovery evidence. Report those counts separately.
At least two calibration scores equal to1 force the proposed rank 19 threshold
to1. A feasible singleton has score 1 regardless of model quality. There are 17
singleton panels before missingness, so this is a material risk of no reduction,
not grounds to remove those panels. `tau=0` produces empty statistical pools,
not an infeasibility certificate. If a genuinely different authorized version
has n<9 at alpha 1/10, finite calibration is impossible; use whole-universe fallback,
never lower n by silently discarding incomplete panels. This option itself
preserves its assigned 20 panels in both populations.

## 5. Small frozen ranker and controls

No hyperparameter grid or outcome-driven model selection is proposed. Fit one
exact, composition-based five-nearest-neighbor predictor and one simple processing
baseline using complete development records only. Require at least 50 complete
development records from at least 15 distinct source-token groups before fitting;
otherwise report `NO_GO_INSUFFICIENT_DEVELOPMENT` and preserve the funnel. Those
are modest pilot adequacy gates, not statistical coverage thresholds.

The future feature contract must explicitly permit conversion of recognized
declared formula coefficients to `a_e/sum(a)` as exact rationals, combining
repeated element symbols by exact addition. Treat these as
normalized declared-coefficient descriptors, not verified exact atomic percent.
The documented producer rounds ratios, and its actual v9 execution lineage is
unestablished. Features use the 118 element coordinates in the feature contract's
fixed atomic-number order and nothing measured in target columns. No microstructure,
grain size, interstitial measurements, ROM values, reference title/year or
source-group ID enters the predictor. Processing is the existing five recognized
categories plus an explicit unresolved category.

G15C's opaque groups do not contain reconstructible descriptors. A separate
authorized formula-feature pass is necessary. Keep its per-row coefficient
vectors, source tokens and model inputs in an ignored local artifact; publish
aggregate overlap/readiness counts only. A 118-coordinate vector discloses
normalized composition information even though it contains no performance
target, and is not automatically authorized by an opaque metadata receipt.
Adopt the separately reviewed feature adapter's fixed lexical/resource profile;
feature failures preserve the row and its entire unknown-vector state.

For a query with a permitted descriptor, compute exact L1 distance to all
complete development rows with permitted descriptors. Within each development
source group take its closest row, breaking ties by numeric source ordinal.
Take the closest five distinct source groups (or all if fewer), tie-breaking by
distance then chosen row ordinal. Predict YS and total elongation by the exact
unweighted means over those rows. This reduces duplicate-publication weighting;
it does not prove independence. If the query descriptor or all usable neighbors
are unavailable, use the frozen processing baseline rather than excluding it.

The processing baseline predicts each quantity by its separate nearest-rank
median among complete development rows in the same processing category; use
the global complete-development medians if that category has no such rows.
Unknown processing is an explicit category, not a best-performing substitute.
Record descriptor availability, effective neighbor count and fallback rates.

Primary rank `pi` orders predicted-feasible rows first (`predicted E >= T_E`),
then predicted YS descending, then `(H("tie", record_id), numeric ordinal)`.
These are unique ordinal ranks; predicted ties and true endpoint ties differ.
Freeze predictions and full ranks for every primary panel. Secondary ranks
restrict this same order to its complete-record subset; no refit or reranking
using secondary outcomes.

Controls, all fixed and all reported:

1. Full-universe acquisition under primary `pi` (nominal-order control).
2. Its calibrated prefix, acquired in the same `pi` order and then stopped.
3. Full-universe processing-median ranking with the same predicted-feasibility/
   predicted-strength/tie rule.
4. Full-universe objective-only order using the primary predictor's predicted
   YS and the same tie rule (no predicted-feasibility prioritization).
5. Twenty deterministic hash-order controls, seed integers 0..19, sorted by
   `H("random-<seed>",record_id)` then ordinal. Report every seed and their
   mean; do not select the best seed or call SHA sorting a proven IID random law.

One cost unit is revelation of one row's YS-plus-total-elongation bundle. Count
missing bundles as requested observations; missingness cannot buy a cheaper
budget. This is a retrospective lookup-budget convention, not a physical
experiment cost estimate. Use common integer caps `0,1,2,4,8,16,32`, truncated
at panel size, plus the actual selected-prefix length. Compare all policies on
the identical row population with the same outcome vault; no policy sees another
policy's acquired outcomes. No policy retrains adaptively.

The same-order prefix **cannot improve discovery at matched caps** over its full
order: up to K observations they are identical; after K the stopped policy has
a subset. At equal actual spend K they are identical. It is an equivalence/
stopping control, not a superiority target. Ranking quality is evaluated using
the full-universe primary order against processing, objective-only and hash
controls. Attribute any advantage to that ranking, not calibration.

Cap the local implementation at one 60-minute, 2 GiB run, exact arithmetic, no
new DFT, no remote compute and no automatic model retries. Freeze both predictors
and all their YS/elongation predictions once. A repeated process is an
engineering reproduction of those choices,
not another independent scientific observation. Save checkpoints if a resource
cap blocks completion; no partial scientific GO.

## 6. Freeze and access sequence

1. **Metadata/schema gate:** retain G15B and bind the now-authorized public G15C
   receipt as a separate supplement. Freeze source/mapping identities, descriptor
   interpretation, target parser, scope and every choice above after review.
   Record all exposure history. This draft does not perform that gate.
2. **Pre-label allocation:** write the 1,545-row funnel and all source roles,
   including the 35/20/20 assignment and both panel-generator definitions, before
   any target cell is text-decoded. Capture role-separated target-bearing bytes
   into an ignored custodian vault and seal whole artifacts, without publishing
   per-cell hashes or numeric content. Mixed source bytes have already crossed
   custody; do not describe that as “target bytes never acquired.”
3. **Development only:** expose the allowed development targets, compute the
   fixed threshold and adequacy gate, fit the declared predictors, and seal
   models, all allowed features, predictions, ranks, code and environment.
   Calibration/evaluation numeric targets remain inaccessible to ranker/model
   selection. The ranker cannot use their allocation roles as features.
4. **Custodian completeness:** after the rank freeze, decode held target cells
   under the committed uniform parser, seal evaluation values, and generate
   the entire 40-primary-panel all-defined boolean, secondary membership and
   reason counts. This is explicitly target-derived
   membership. It may not alter threshold, ranker, allocation or task. Numeric
   evaluation values stay unavailable to recommendation/research selection.
5. **Calibration and decision:** open assigned calibration labels only; execute
   the primary fallback policy and separately calibrated secondary policy.
   Seal both original panel manifests, calibration receipts, thresholds and all
   future-panel pools before revealing any evaluation value to replay policies.
6. **Replay once:** execute all predeclared policies and budgets. Open complete
   evaluator truth only after original decisions are sealed, preserve incomplete
   and empty panels, and report all failures and costs. Preserve any execution
   deviation; do not redesign after evaluation under the same protocol identity.

The future custodian necessarily processes numeric held-out values to establish
secondary eligibility. Distinguish that machine exposure from investigator/model
access and from the later guarded policy reveal. A claimed access boundary needs
source-bound receipts and adversarial tests, not an assertion of blindness.

## 7. Metrics, denominators and prospective GO/NO-GO option

Publish one funnel from 1,545 → declared tensile → exact25°C → source roles →
interpretable required pairs → secondary rows/panels. Report every reason,
processing distribution and descriptor-availability rate at each applicable
stage. Never replace the 314 primary denominator with the secondary denominator.
For each population and role, report empty, nonempty, complete, incomplete,
feasible and infeasible panel counts separately; unknown is not infeasible.

Report `tau`, rank, all calibration scores, absolute/fractional retained size,
zero/full-pool counts, all-optima and any-optimum retention, feasible discoveries,
and first-optimum reveal cost. At each budget report best recorded feasible YS
and regret to the panel's true best only when both are defined. A run with no
observed feasible record has undefined best/regret and an explicit feasible-hit0;
do not assign zero regret. All incomplete-truth metrics stay unknown. For primary
full-population retention, report counts of established successes, failures and
unknowns against the original panel denominator. Do not invent a full-population
retention rate when missing archived quantities leave its endpoint undefined.
A hypothetical completion range is not an observed archival metric and is not
needed for this option. Label purely set-inclusion retention from keeping the
whole universe separately from evaluated retention or feasible discovery.

Use source-panel macro summaries, retain per-panel outcomes, and report candidate-
weighted totals separately. Hash seeds are controls, not extra independent
replicates. Descriptive source-panel variation is not a confidence interval for
future materials. Do not use nominal binomial bounds on the shared-calibration,
finite-archive dependent evaluation panels.

Proposed **pilot progression gates**, deliberately distinct from coverage proof:

- Execution must complete with fixed source/code/model identities, all 20 assigned
  evaluation panels present, and all negative/unknown results preserved.
- At least10 secondary evaluation panels must be nonempty, feasible and have
  at least 2 records. Otherwise useful-recovery evidence is inadequate: NO_GO,
  even if vacuous marginal retention is high.
- Pool usefulness: at least 90% all-optima retention among **all** secondary
  feasible evaluation panels, mean retained fraction at most3/4 on those panels,
  and no incomplete-calibration fallback. Empty/infeasible panels cannot satisfy
  this usefulness gate. This is an observed pilot criterion, not 90% conditional
  coverage certification or a bound on future feasible panels.
- Ranking usefulness, separately: at cap 4, macro any-optimum hit over secondary
  feasible panels of size>=2 must exceed the twenty-hash-order mean by at least
  1/10, and strictly exceed both processing and objective-only controls.
  Comparisons use exact counts/rationals and ties do not count as improvement.
  All other fixed budgets and controls remain reported whether favorable or not.
  Also report the number of panels larger than 4: smaller complete feasible
  panels are exhausted by this cap and cannot distinguish the full-order
  controls. A small or zero attainable contrast remains a limitation/NO_GO,
  not permission to change the budget after seeing outcomes.
- A scientific progression GO requires both usefulness gates. A pool-only or
  ranking-only pass is reported as such, not collapsed into a stronger claim.
  Primary incompleteness still forbids claiming success on the full population.

Failure means retain a completed negative result or an explicit execution/
semantic/readiness block. Do not change threshold, temperature, panel sizes,
singleton handling, source allocation, models, numerical precision or gates to
obtain a pass. A GO would support designing a further independent-data study;
it would not qualify a plant material or establish new-material superiority.

## 8. Decisions that can be made now versus prerequisites

**Implementable design choices:** exact25°C/T scope; source-bound row objective;
training-only median constraint; full-population ledger and independent secondary
definition; 35/20/20 source-token allocation with archived permutation; one panel
per group; alpha 1/10; exact5NN/processing baselines; fixed budget grid; all-ties
metrics; no same-order superiority claim; explicit negative-result gates.
These remain unregistered proposals until the complete protocol is frozen.

**Genuine prerequisites:** fixed descriptor grammar/semantics and authorized
feature execution (lexical G15C recognition is now established separately);
documented target missing-value conventions (including any numeric sentinels),
target decoding/eligibility implementation and synthetic adversarial review;
source-bound vault/access design; audited random-allocation implementation and
its narrow law claim; code/environment/time/RSS receipts; and actual eligible
training/calibration/evaluation counts, which are unavailable before authorized
custody. Discovery of unsuitable target syntax or inadequate counts produces a
reported stop, not an automatic repair to this version.

**Limitations that do not require waiting indefinitely for the archival task:**
no verified specimen pairing, full strain rate/processing history, exact formula
chemistry, independent-study identity, future-study exchangeability or plant
requirement. These block stronger physical/transfer claims; they do not prevent
an explicitly row-level, selected historical recovery experiment.

Before label access, audit exact formula-token overlap across allocated roles
and descriptor equality caused by coefficient normalization/rounding, using only
authorized feature metadata. Preserve those overlaps; do not use DOI tokens or
composition tokens as evidence of independent studies/chemical novelty. Source-
only holdout is the declared scope. A connected-component holdout joining source
and composition groups would be a distinct, separately registered stress test;
it must not silently replace this allocation after observing an inconvenient
overlap pattern or result. No target-based source exclusions are authorized.
