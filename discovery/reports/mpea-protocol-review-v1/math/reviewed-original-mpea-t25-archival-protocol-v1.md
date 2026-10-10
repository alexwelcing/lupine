# MPEA T25 archival recovery protocol v1

Protocol ID: `mpea-t25-archival-v1`. Status: **ready for prospective review;
not registered or executable until source freeze and green CI**. This file and
`mpea-t25-implementation-contract-v1.md` jointly define the study. Both must be
committed with the final implementation/test identities before actual allocation
or target interpretation. No actual group allocation, OS entropy draw, formula
feature extraction, target interpretation or fit was performed to write them.
The reviewed `archival-recovery-option.md` remains unchanged.

## Question and permitted conclusion

Recover the largest recorded tensile yield strength among archived database
rows declared as tensile tests at exactly 25°C whose co-recorded total tensile
elongation is at least the declared threshold. The threshold is the lower development
median, fixed below. Separately test a calibrated stopping prefix of that same
ranker. This is a prospective specification of a retrospective archive test,
not a prospective material experiment, new-material discovery, plant requirement,
chemical novelty test or physical qualification.

The candidate is a database record, not an established distinct specimen or
material. Uncertainty, yield-offset convention, strain rate, complete processing
history and same-specimen pairing are not established. Two columns in one row
are treated as a declared archival tuple, not proof of joint physical truth.
Historical paper exposure is disclosed; newly guarded observation-level targets
must not be described as information that no researcher could ever have seen.

## Source and all metadata already inspected

The only source version is Figshare DOI `10.6084/m9.figshare.12642953.v9`, file
25797305, CC BY 4.0, 332126 bytes, MD5 `6d29eb6018157b863ca0033ccec936d5`, SHA-256
`c5504d93fd324d1be26cf814d0694ee9ee95578d68a0b38aba6813b939fa2c5d`.
The final source manifest binds the following existing evidence, never a moving
dataset URL or a replacement archive:

| Evidence | Exact byte identity or frozen source identity |
| --- | --- |
| G15B row metadata `reports/mpea-row-metadata-v1.json` | SHA256 `36e9831f2a015b2c295ce6228dd9b7bce5ba7df0f2645c343da2134ab7898c55`; producer `ec32247f404d7d2b0a916ff7012bded2accb48c8` |
| Public metadata summary `reports/mpea-metadata-summary-v1.json` | SHA256 `ddb67b50771bd12292517acd05299adcb3066ab90e0c26936639b3c2be3c8a8a` |
| G15C supplement `reports/mpea-formula-tokens-v1.json` | SHA256 `ce2b8d12464bac1c5e9533e136f09b3b65761188609279b40a78f31dbcc6d3a7`; producer `a1e47024898072111f80e3ff911026306a50df2b` |
| Complete column mapping | `docs/mpea-column-mapping-v1.{md,json}`, mapping commit `d169b1070eaec916ebf9af221aa4596dd4b2cb1d`; JSON SHA256 `812255e53cceec8c66bd2a4b11d5d1e556941a053c888a7970cf2e3ec6728f97` |
| Formula/source description | `docs/mpea-formula-format-evidence.md` and its evidence receipt; producer-format code `d31e2510cccc3fb9e79d43ad62652f64ef8c2c5e` |
| Prior design/mathematics | `docs/mpea-evaluation-design-notes.md`, `decision-pool-calibration-design.md`, `decision-pool-workbench-contract.md`, `finite-exchangeability.md`; reviewed option SHA256 `49a2682412aff4b764ffa2c23d9ade1f06858e12dee699897e2f04e35b9fd8b7` |

The full paper XML had been acquired earlier in the project. The cited mapping
selected Data Records prose/list; historical numeric paper exposure is not
denied. This protocol preparation did not retrieve a new paper, raw archive,
notebook or target table. It did read the named public metadata, their schema
documents, the collaborating feature-contract draft and generic runtime/sampler
source. A source manifest records their exact bytes at registration.

The metadata progression is retained: initial header-only custody withheld
unknown spellings; a separate committed first-record disclosure exposed 23 labels;
G15B then framed all 1545 rows and selected five metadata roles. Its formula
grammar recognized 0/1545. Public producer-format research documented explicit
space-separated element/count terms; separately frozen G15C recognized 1545/1545
rows in 630 exact lexical groups. G15B remains unchanged. No coefficient vector,
target completeness or numeric target was obtained from those stages.

The selected metadata scope was fixed in the reviewed option before inspecting
G15C overlap: 1545 total rows; 358 declared tensile; 314 tensile/exact 25°C rows in 75
source-token groups. G15C joins all original IDs/ordinals; the 314 rows contain 106
exact formula-token groups, of which 12 span multiple source tokens and cover 131
rows across 40 source-token groups. Scope, ranker, allocations, threshold and gates
were not changed in response. These are lexical counts, not compositions,
independent studies, complete target pairs or eligibility counts.

## Population, target and missingness

Preserve every original `source_sha256:ordinal` identity in a 1545-row funnel.
The target scope is exactly `test_mode=T` and exact rational temperature 25°C
under G15B. Unknown processing or formula never excludes a condition-eligible
row. All other rows retain outside-condition/unresolved reasons and have no
target access under this protocol. No cross-row target joins or deduplication.

Use only column 11, `PROPERTY: YS (MPa)`, and column 13,
`PROPERTY: Elongation (%)`. The latter is total tensile failure elongation;
column 14 plastic elongation is not a substitute. Set `s=-YS` in MPa and
`g=T_E-E` in percentage points; E=7 means 7%, not 0.07. Minimize s subject to g<=0,
so elongation exactly equal to the threshold is feasible.
All equally largest feasible recorded YS values are true tied optima of the
declared archive endpoint. Use exact equality, no tolerance.
Column positions throughout this protocol are zero-based, matching the frozen
23-column mapping; ordinals are also zero-based.

The implementation contract specifies a full-string ASCII finite decimal
parser. Blank means missing. Unsupported tokens, explicit nonfinite tokens,
resource limits and negative-value conflicts are distinct. Zero, including
signed zero after exact conversion, is valid. No numeric value is inferred to
mean missing, no value is imputed, and no nonempty unsupported token is silently
declared missing. This is an explicit recorded-point endpoint convention, not
confirmation of undocumented source coding or measurement accuracy. Evidence of
an incompatible documented numeric missing code is a semantic block requiring
a new version before labels are used; never retrofit a code after seeing results.
Do not extract endpoints from uncertainty intervals, inequalities or unit text.

Each of the 75 source-token groups defines one primary panel containing all its
condition-eligible records, regardless of target status. Keep singleton and
incomplete panels. A separately registered secondary panel is the subset of the
same group's records having both required targets in `VALID` state. Keep all
source allocations and all panels, including empty secondary panels. Completeness
may depend on reporting practices or performance; this is a selected population.
It supplies no result for excluded primary records. Unknown feature vectors do
not affect target completeness or secondary membership.

## Allocation and information order

No actual allocation exists yet. `H(tag,key)` is SHA-256 of UTF8
`mpea-t25-archive-option-v1`, byte 0, UTF8(tag), byte 0, UTF8(key), concatenated.
This salt is retained literally from the reviewed option. Group keys are
`archive_sha256:canonical_decimal_source_group_id`. Sort the 75 groups by
`(H("development",key), numeric_group_id)` and designate the first 35 development.
Do not retry for preferred row counts, overlaps or target availability.

Pass the remaining 40 sorted numeric IDs to the reviewed
`sample_permutation(sorted_ids, byte_source)` primitive. The production wrapper
uses explicit `os.urandom`; no user seed, alternate provider or hash-order fallback.
For 40 IDs each request is 20 bytes; keep 160 bits, reject integers>=40!, cap 128
draws, and use lexicographic factorial unranking. First 20 accepted-permutation
IDs are calibration and last 20 evaluation. Keep the exact transcript. A blocked
sampler blocks the study. Reproduction replays the committed transcript; it
does not draw again. There is one actual allocation per registered version.

Write the complete role map and source-bound label-route seal before any target
cell is accumulated or text-decoded. Every row sharing an active source token
inherits its role, including other-condition rows that remain target-inaccessible.
Other source groups are `OUT_OF_SCOPE_TARGET_UNOPENED`; the single unresolved
source row keeps its own unresolved identity. The entire source-byte seal plus
the role map seals held-out label locations before development; it does not
require decoding them. Whole mixed source bytes have crossed custody previously.

The frozen sequence is: registration/CI → allocation → feature-overlap audit →
development-only target custody → predictor/threshold/full-rank freeze →
role-blind reserved-population completeness custody → calibration and all future
pool seals → guarded equal-budget replay → complete evaluator audit and report.
No stage may skip or silently rerun a predecessor. Source/receipt mismatches
block dependent work. Calibration/evaluation numbers cannot choose the model,
threshold, task, features, allocation, policy or gate. Complete-record membership
is produced only after ranks are frozen, with uniform predeclared rules.

## Frozen predictor and threshold

Require at least 50 complete development records from at least 15 source-token
groups; otherwise `NO_GO_INSUFFICIENT_DEVELOPMENT`. There is no target-dependent
choice of model or tuning grid. Sort all complete development E values and take
one-based rank `(n+1)//2` for `T_E`. This is the lower median for even n. Records
receive equal weight for the threshold; do not switch to group weighting.

Consume only the separately frozen feature artifact: exact positive declared
coefficients summed by element, normalized by their positive total over 118
atomic-number axes; formula/source token identities; and declared processing
category. Coefficient normalization does not recover pre-rounding chemistry.
Source titles/year, measured microstructure, grain size, interstitials, ROM
columns and target status are not prediction features. Per-row vectors remain
local because they disclose composition information beyond opaque grouping.

For a query with a known vector, compute exact L1 distances to complete development
rows with known vectors. Within each development source group choose the row
minimizing `(distance, numeric_ordinal)`. Sort these representatives by that same
pair; take five, or all if fewer. Predict YS and E as separate exact unweighted
means over the same neighbors. If the query vector is unknown or no usable
representative exists, invoke the processing baseline. No row is dropped.

The processing baseline takes the separate lower medians of YS and E among
complete development records in the query's declared processing category.
Categories are CAST, POWDER, WROUGHT, ANNEAL, OTHER and explicit UNRESOLVED
metadata state. If that category has no complete development row, use global
complete-development medians. UNRESOLVED is not OTHER or a physical method.

Primary rank `pi` sorts by `(0 if predicted_E>=T_E else 1, -predicted_YS,
H("tie",record_id), numeric_ordinal)`. The processing control uses the same key
with its own predictions. The objective-only control sorts by
`(-primary_predicted_YS,H("tie",record_id),numeric_ordinal)`. No truth is used.
Secondary orders restrict the already frozen full orders to secondary membership;
they do not refit or rerank using targets. True YS ties retain all optima; the
deterministic prediction tie rule only gives unique ordinal ranks.

## Statistical pools and claim boundary

Use the existing generic `decision_pool` API unchanged, with one protocol per
population, exact alpha 1/10 and 20 assigned calibration panels. Require every
reserved primary panel's endpoint to be defined before the primary finite-score
law is supported as an assumption. A role-blind custodian checks all 40 after
rank freeze. If any required primary target is not VALID, use primary
`premise_status="unsupported"` and whole-universe future pools. Complete realized
calibration alone is insufficient. Retain both unsupported and incomplete-calibration
reason codes where applicable; do not invent unknown scores.

Every secondary panel has a defined score by construction, including empty score 0.
The conditional mode for either eligible population always uses
`premise_status="assumed_unverified"`, even after sampler/source tests pass.
No implementation attests uniform OS entropy, actual sample generation,
independent studies, physical truth or a stronger probability status.

For a complete panel, score is 0 if infeasible/empty; otherwise it is the maximum
normalized rank of every feasible tied optimum. Calibration uses ascending
rank 19 of 20 scores. The selected pool is the weak prefix of length
`floor(tau*m)`. An empty pool is not an infeasibility certificate. Two calibration
scores equal to 1 force tau=1. Feasible singletons score 1 irrespective of model quality;
there are 17 primary singleton panels before missingness. Preserve them.

Conditional on independent uniform entropy, successful capped sampling, a fixed
development fit, role-blind eligibility and a defined fixed 40-score population,
the 20 calibration scores plus one designated future score are exchangeable under
the finite permutation law. The mathematical all-optima loss bound is 2/21<=1/10
for that single future archive panel. It is not conditional on observed calibration,
feasibility, family or material, not joint over 20 evaluations/populations, and
not a future-study/deployment guarantee. Empty/infeasible panels dilute marginal
retention without supplying discovery evidence. Report their counts separately.

## Policies, costs, metrics and exact gates

For each of 20 evaluation panels in each population, execute 24 fixed policies:
full primary `pi`; stopped calibrated prefix in that same order; full processing
order; full objective-only order; and 20 hash controls for seed 0..19, sorted by
`(H("random-<seed>",record_id), numeric_ordinal)` using canonical decimal seed.
Hash orders are deterministic controls, not a proven IID random sample.

Cost is one requested row's YS+E bundle, including an unresolved bundle. Use
caps 0, 1, 2, 4, 8, 16, 32, truncated at panel size, and report actual prefix size K.
Each policy sees only its own reveals; none adapts its order or refits. Controls
must also be evaluated at that panel's K for the stopping comparison. Report
unique development/calibration/custodian target-access costs and per-policy
reveal counts separately; exclude neither missing requests nor calibration cost.
These are archival lookup units, not physical experiment costs.

The stopped prefix and full primary order are identical up to K; afterward the
stopped policy has a subset. They cannot establish an equal-budget recovery
advantage. At actual spend K they are identical. Ranking improvement is assessed
only among full orders; calibration is assessed for stopping size/recall.

Report both population funnels, original denominators, target reason counts,
empty/nonempty/complete/incomplete/feasible/infeasible panels, tau/k/n, retained
counts/fractions, all/any-optimum retention, feasible discoveries, first-optimum
cost, best feasible YS and regret at every cap. Incomplete primary truth yields
UNKNOWN metrics, never false success/failure or an invented retention rate.
No feasible reveal means best/regret undefined and feasible-hit 0. Empty and
infeasible complete panels have vacuous optimum retention but no useful discovery.
Whole-universe set inclusion is distinct from evaluated feasible discovery.

Use exact source-panel macro averages; report candidate-weighted totals separately.
Do not treat 20 hash controls, shared-calibration panels or repeated reproduction
as independent scientific observations. No IID binomial confidence bound or
deployment significance claim is specified.

Define F as all secondary evaluation panels with at least one feasible record;
define D as those in F with size>=2. Require |D|>=10 or report inadequacy. Gates:

1. Complete execution, all 20 evaluation panels in each population, fixed identities.
2. Pool: `10*all_optima_retained_count(F)>=9*|F|`, mean `K/m` over F<=3/4,
   and secondary calibration status exactly `finite_conditional`.
3. Ranking at cap 4: over D, primary any-optimum hit rate minus the mean of the
   twenty hash-control hit rates >=1/10; primary rate strictly exceeds both
   processing and objective-only rates. Ties are not improvement. Every other
   cap remains reported. Count panels with m>4; smaller full-order panels cannot
   distinguish these controls at cap 4. Do not change cap to avoid a power limit.

`GO_DESIGN_INDEPENDENT_STUDY` requires adequacy plus both usefulness gates;
otherwise the completed result is `NO_GO_ARCHIVAL_USEFULNESS`, with every failed
gate. A ranking-only or pool-only pass remains separately visible. A secondary
GO never implies primary/full-population success. A GO supports a further
independent-data design, not deployment or material qualification.

Limit the study computation from development parsing through final evaluation
to 3600 seconds wall time and 2 GiB peak RSS in one bounded run, using exact arithmetic.
No remote compute/DFT, automatic retries, model substitutions or partial-result
GO. Preserve checkpoints on resource failure. A fresh process may reproduce
the same sealed allocation and inputs; its output is computational reproduction,
not a new scientific draw. Actual costs and any deviation must be reported.

## Stop and revision rules

Any source/semantic conflict, failed CI/engineering gate, malformed role/panel
identity, unavailable feature artifact, exhausted allocation provider or resource
limit blocks the dependent stage under the closed vocabulary in the contract.
Incomplete data are retained under the declared primary/secondary rules, not a
reason to redraw, refill, exclude a source, change temperature, lower adequacy,
or retune the model/threshold. Exact-token and normalized-descriptor overlaps
are reported before targets; they do not trigger automatic split repair.
Source-only holdout is the claim. Chemical/component holdout needs a new protocol.

The final registration receipt must bind these two documents, feature/parser/
allocation/runtime sources, dependencies, actual test logs and a published
commit with green CI. Neither this draft nor the prior option grants target
access. A scientific revision after any performance exposure must retain this
version, enumerate exposure, and make no newly untouched-data claim.

## Implementation prerequisites and retained unknowns

The decisions above are fixed for the proposed version; no routine scientific
choice is delegated to an operator after label access. The remaining execution
prerequisites are concrete: a frozen feature producer and linked private feature
artifact; the route-aware target parser and guarded stage orchestrator; synthetic
and independent engineering checks; and published source registration with green
CI. The exact actual source-group allocation and target completeness are future
outputs, not parameters to choose for a favorable result. Do not compute them
while this document remains unregistered.

Unestablished same-specimen pairing, yield-offset convention, measurement
uncertainty, underlying pre-rounding chemistry and source independence remain
limitations of the declared archival endpoint. The conditional permutation
argument does not resolve them. A documented incompatible endpoint or missing
code is a semantic block; the absence of such documentation does not establish
that the archive is accurate. Empty, insufficient, missing, unsupported, slow or
unhelpful results are legitimate outcomes, with the stated failure receipts and
no automatic alternate study.
