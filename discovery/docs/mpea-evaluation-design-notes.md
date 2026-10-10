# MPEA evaluation design notes

Status: **design notes, not a preregistered protocol**. No scientific task,
threshold, temperature bin, source exclusion, split, ranker or performance
acceptance criterion is selected here. All usable counts remain unknown.

These notes follow the [operating-condition source audit](operating-condition-source-audit.md),
[schema evidence review](mpea-schema-evidence.md), and
[custody readiness record](../reports/mpea-custody-readiness-v1.md), and consider
the existing [direct statistical pool design](decision-pool-calibration-design.md).
They do not change those records or authorize observation decoding. A separately
reviewed schema mapping and committed metadata-extraction specification must
precede row metadata; a subsequently frozen evaluation protocol must precede
performance-target disclosure.

## Information boundary and claim scope

The reviewer read only the goal and public project audit/design documents.
No raw MPEA cache, undisclosed header labels, observation records, performance
targets or upstream notebooks were opened for this review. No fit or split ran.
This is metadata-informed planning, not validation on independent experiments.

The project has already accessed historical papers containing numerical results,
as documented in the source audit. Therefore an eventual target-redacted archive
evaluation must not claim that the researchers have never encountered any
relevant published performance information. Untouched evaluation targets mean
the selected observation-level targets have not been disclosed or used to tune
the frozen protocol; their historical publication does not make them genuinely
prospective evidence. A future experiment measured after the frozen recommendation
would be a different evidence tier. Known historical exposure must remain in the
protocol record, and affected records cannot be silently removed after results.

The strongest next lead is a **held-out-study archival recovery** task: recover
recorded strength–ductility tradeoffs within explicitly declared test conditions.
This can test a representation-independent recommendation engine without claiming
new-material validity, plant qualification, or successful temperature extrapolation.
The published approximately 1,545 records, 630 compositions and 265 articles are
source-reported scale, not audited usable counts. Counts of paired tensile records,
independent studies, valid condition groups and complete calibration panels are
all unknown.

## Proposed task structure, to be frozen later

An archival record should retain its composition, processing description, loading
mode, temperature and source identity. Shared composition or temperature alone
does not justify merging separate property observations into a joint specimen.
The eventual protocol must determine whether co-recorded properties support its
declared record-level target; if pairing is unresolved, a single-property or
otherwise narrower task is preferable to manufactured joint truth.

A candidate task would maximize recorded tensile yield strength subject to a
recorded tensile elongation threshold. An engineering requirement claim needs an
externally supported use case fixed before target disclosure. A clearly declared
relative archival-recovery benchmark may instead use a predeclared rule computed
exclusively from training targets, such as a fixed training quantile. Its quantile,
tie handling and missingness rules must be frozen before any row targets are
opened; neither calibration nor evaluation quantities may determine the threshold,
and the quantile cannot be chosen after inspecting performance. Such a relative
threshold implies no plant suitability. Compression requires a separate task
because its strain endpoint differs. Exact temperature strata, minimum panel sizes, and acceptance
criteria likewise need an external rationale or a clearly declared archival
sampling purpose. These notes select none of them.

Freeze original study/DOI identities and composition-normalization rules from
permitted metadata. Study holdout is a useful primary evaluation; composition or
family holdout is a distinct stress test. Shared compositions across studies are
potential leakage paths. A protocol may use connected components across these
identities if enough groups remain, or explicitly report the narrower study-only
holdout. Neither procedure establishes row or panel exchangeability automatically.
Grouping and allocation rules must precede target disclosure and preserve all
record identities, including malformed, ambiguous and incomplete records.

Sparse operating conditions need visible denominators. Freeze condition rules
before outcomes, report every declared stratum and do not choose favorable bins
after observing ranker success. Missing strain rate, specimen identifiers or full
processing descriptions can limit physical comparability without prohibiting an
honestly scoped archival-record recovery exercise.

## Fair comparison and outcome handling

Select and tune a ranking procedure using training/development evidence only,
then freeze its features, preprocessing, tie rule, model and panel generator.
Calibration labels assess the frozen ranking; they must not select a favorable
ranking procedure. Seal each future panel and actual selected pool before its
performance outcomes are opened.

Compare the direct pool against nominal ranking, random ordering and an appropriate
simple scoped baseline. Use the same candidate universe, permitted information,
training data and measurement bundles. Reveal one objective-plus-required-constraint
bundle at the same cost for each policy unless an externally justified cost model
is frozen. Use a predeclared budget grid and recorded random seeds; do not report
only the best random seed or the most favorable budget.

Pool-screening metrics include every tied feasible optimum retained, at least one
optimum retained, absolute and fractional pool size, and empty-pool behavior.
Acquisition metrics include feasible discoveries, best feasible score, regret
and bundles needed to recover an optimum at equal budgets. A truncation to an
acquisition budget is a separate policy: it inherits no all-minimizer guarantee
from the original statistical pool. Study-level summaries and uncertainty estimates
must reflect correlated records; repeated overlapping panels are not independent
experimental observations.

Complete labels are required to score a direct-pool calibration panel. They are
not permission to drop difficult panels. Freeze identities and allocation first,
preserve unknown targets and record all incomplete panels with the implemented
abstention behavior. Do not impute truth, join unrelated experiments, or calibrate
on just the known panel scores. Report the complete-case descriptive population
and its selection limitations separately; do not silently redefine the registered
sampling law after completeness is revealed.

## Scientific gates and narrower alternatives

Before an executable protocol, establish exact selected-column meanings and units,
experimental versus calculated provenance, tension/compression semantics, stable
source/composition identities, missing-value handling, the proposed pairing scope,
and a target-free feature/ranking boundary. These are scientific and technical
go/no-go checks. An ambiguous property cannot become a measurement merely because
a parser accepts its token. A release hash establishes identity, not physical truth.

Full strain-rate, specimen and processing metadata are desirable. If unavailable,
they block matched physical-performance or operating-condition-transfer claims,
but may leave a narrower historical record-recovery task defensible. The protocol
should explicitly choose that scope rather than wait indefinitely for unavailable
ideal metadata or pretend the missing variables are controlled.

Panel exchangeability is currently unknown. Held-out-study observations therefore
support empirical results, not a deployment probability guarantee. A separately
specified random-permutation experiment over fixed eligible archival panels could
support a finite-archive random-panel law; it would not establish future-study
exchangeability. Any eligibility filtering and its target exposure need to be
declared before such a construction, without overriding the existing custody
rules or relabeling archival completeness as prospective sampling.

A later protocol should preregister useful pool reduction and all-optima-loss
criteria, sufficient complete study panels, equal-budget comparisons, missingness
rules and an explicit negative-result decision. Their numerical values or
training-only derivation rules require the stated engineering or relative archival
scope and permitted metadata, not calibration/evaluation outcome-driven tuning. If source
semantics or paired-panel availability do not support the desired task, preserve
the readiness finding and execute an honestly narrower evaluation where possible.
No recommendation-quality or superiority conclusion follows from these notes.

## A separately declared complete-record secondary population

A separately preregistered complete-record archival population could support a
valid secondary recovery evaluation. This is a design distinction, not a
registered population, an executed eligibility decision or permission to read
rows. No actual observation rows or targets were read, and no numeric parameters
are selected by this addition. All usable counts remain unknown.

Assign and preserve every original record identity and study allocation before
target-presence assessment. Before target access, a future protocol must freeze
the required quantities, semantic eligibility, numeric parsing and missingness
criteria, and the rule for generating secondary panels. These rules must cover
malformed values, ambiguous units, duplicate observations and unresolved pairing.
Completeness means interpretable measurements of the declared quantities, not
merely nonempty cells. The rules can be frozen before target access even though
actual eligibility membership becomes known afterward.

A custodian could then determine complete-record eligibility without exposing
numeric performance values to ranking or task-selection decisions. After that
eligible population is formed, declare its panels using the already frozen rule.
This differs from declaring calibration panels, discovering incomplete outcomes
and dropping the difficult panels or calibrating only their known scores. Once
secondary panels are declared, preserve every panel and retain the direct-pool
incomplete-panel abstention behavior. Do not reallocate studies or strata after
seeing eligibility counts to obtain more favorable or larger splits.

Training targets alone may fit the ranker and apply any preregistered
training-derived threshold rule. Calibration and evaluation targets may not
choose the task, ranker, subgroup, panel rule or threshold. The secondary task's
estimand is recovery among records with the required reported outcomes, not
performance over the entire original archive or future materials.

Report the full eligibility funnel from all original records, with exclusion
reasons, preserved study allocations, condition counts, and metadata distributions
of included and excluded records. Incomplete records remain part of the broader
readiness result. Complete-case selection may reflect publication practices or
unobserved performance; missingness must not be assumed random. Success in this
secondary population cannot establish success for incomplete records.

Fixed panel generation does not establish exchangeability. Direct-pool results
would remain empirical unless a separately justified sampling law supports their
probabilistic interpretation. A complete-record secondary protocol must be
identified as a new, selected archival population, never as a retrospective
repair of already declared incomplete calibration panels or evidence of
deployment coverage.

## Pool stopping is distinct from ranking improvement

The direct pool's weak ordinal test `rank <= tau*m` retains the prefix of length
`K=floor(tau*m)` under a frozen ranking pi. The floor follows from integer ordinal
ranks; it is not a ceiling or rounded budget. A frozen deterministic tie rule
assigns unique ordinals to equal predicted scores. True objective ties remain
distinct: all-optima retention must include every tied feasible optimum.

At a nonnegative integer budget cap b, acquisition in this prefix following pi
reveals its first `min(b,K)` candidates. Untruncated nominal acquisition following
the same pi reveals its first `min(b,m)` candidates. The observations are identical
through K; thereafter the stopped pool's revealed set is a subset of nominal's.
Thus this same-order pool cannot improve feasible discoveries, feasible hit,
any-optimum or all-optima recovery, best feasible score, or regret at matched
budget caps. These discovery metrics are monotone under additional observations;
no feasible discovery leaves best feasible score/regret undefined unless a
predeclared reporting convention supplies a sentinel.

An empty prefix reveals nothing and is not an infeasibility certificate. An
infeasible panel has vacuous optimum retention, which must be separated from
useful recovery. An empty universe has no discovery opportunity; whole-universe
fallback is identical to nominal at every budget. Budgets beyond the universe
size add no observations. None of these cases creates a same-order advantage.

For b>K, stopping spends fewer bundles than nominal under the same cap. This is
a cost/recall tradeoff, not superiority at equal actual measurement spend. At
actual spend K, both policies have observed exactly the same prefix. Account
separately for calibration-label overhead and any declared bundle-cost model;
unused budget or omitted calibration cost cannot establish measurement efficiency.

A future protocol should distinguish pool reduction with all-optima recall and
stopping cost from ranking quality against random or simpler scoped baselines.
The same-pi comparison is an equivalence control, not a superiority target.
Direct calibration may justify a stopping threshold conditional on its score-law
premises; it does not improve pi's candidate order. A distinct acquisition rule,
such as training-only feasibility prioritization or diversity, would need its
own freeze before calibration/evaluation outcomes. Compare that same rule on the
full universe and the pool, with nominal/random controls, and attribute any
advantage to the combined policy rather than calibration alone. Do not change
ranking after calibration or evaluation results to escape the equivalence.

This section records an arithmetic design implication only. It selects no
numeric protocol parameters and reads no raw inputs, undisclosed rows or targets.
