# MPEA T25 executable study contract v1

Companion to `mpea-t25-archival-protocol-v1.md`, protocol ID
`mpea-t25-archival-v1`. **Prospective implementation specification only.** No
actual source allocation, entropy draw, feature extraction, target interpretation
or fit is authorized by this scratch document. The reviewed option and generic
permutation helper remain unchanged. A published registration checkpoint binding
both study documents, implementation, tests and green CI must precede the first
production allocation or target interpretation.

## 1. Implementation and custody boundaries

Implement a source-specific orchestrator, provisionally `scripts/mpea_archival.py`,
with pure helpers and immutable typed results. Keep `decision_pool.py` unchanged.
The orchestrator consumes the separately frozen feature adapter; it must not
reparse formulas, invent descriptors, alter existing custody producers or loosen
the workbench's wire limits. All examples and tests before registration use
constructed sources and metadata. Synthetic injection APIs cannot be reached by
the production CLI.

Distinguish three kinds of access: capture of mixed source bytes; accumulation
and decoding of an authorized target cell; and access to an interpreted target by
the model, calibrator or evaluator. Captured bytes already contain all targets.
Never claim that capturing/hash-verifying the source leaves target bytes unread.
The scientific boundary is that unauthorized cells are not accumulated, decoded,
classified or supplied to an earlier-stage consumer. It is an auditable process
boundary, not protection from a malicious operator with access to the same disk.

Production is cache-only. Capture the existing pinned 332126-byte source once,
verify its size, whole-blob SHA-256 and legacy MD5 before framing it, then frame
that same immutable buffer. No network, redirect, replacement version or guessed
filename belongs to this runner. The SHA-256 in the scientific protocol is the
identity authority; MD5 is retained for correspondence with upstream metadata.
Do not call an existing verifier that decodes all CSV cells or opens calibration
or evaluation labels merely to check an input's identity.

Use a new, nonexisting descendant of `.cache/mpea-archival/` per execution attempt.
Reject paths escaping that root, symlinks in an output path, existing outputs and
overwrites. The exclusive attempt-start marker binds the registration and whether
this is the single production allocation or reproduction of a specified sealed
allocation. A repository-local registry prevents accidental second allocation
for the same registration. It does not attest absence of another operator or
machine. Partial output and failure receipts remain immutable. Reproduction uses
the existing allocation transcript, never new entropy.

Public outputs contain only explicitly allowlisted aggregate metrics, identities,
closed reason codes and scope text. Per-record features, labels, memberships,
neighbor IDs, predictions, orders and reveal ledgers stay in the ignored cache.
Whole-artifact identities may be published. Do not publish per-cell hashes,
token hashes, arbitrary source strings, source snippets, raw exception messages,
tracebacks or local target-bearing paths. Exact rational thresholds and aggregate
target statistics are permitted only after the relevant authorized study stage;
they are labeled derived quantities, not redacted metadata.

## 2. Common artifact envelope and validation

Every persisted artifact has an exact versioned schema and rejects unknown keys.
The common fields are `schema`, `protocol_id`, `stage`, `status`, `reasons`,
`registration`, `source`, `inputs`, `payload`, `access`, `usage`,
`scientific_sha256`, and `content_sha256`. Private artifacts additionally carry
the declared private payload; this is not a license to include it in public
projection. Registration binds the two document byte hashes, published commit,
all executing source/dependency hashes, source-bound engineering receipt and
the required successful CI runs for that exact commit. A moving branch's green
status is insufficient. No self-referential commit is embedded in a document;
the subsequent registration receipt supplies these actual identities.

`source` is exactly the pinned bytes/MD5/SHA-256 triple. `inputs` is a fixed
schema-specific map of relative artifact IDs to whole-file byte hashes and
content seals. Each successor binds the exact predecessor bytes. The scientific
digest covers protocol/source/input scientific identities and the stage's exact
scientific payload; it excludes attempt paths, elapsed time, RSS and timestamps.
The content seal covers the complete canonical object except `content_sha256`.
Any report changing a failure to success therefore changes its scientific seal.
References inside generic runtime objects use predecessor scientific digests,
never volatile timing or attempt-path identities. Enclosing custody receipts
still bind whole predecessor file bytes. Reproduction compares scientific stage
digests and separately reports any complete-file difference; it does not require
machine usage receipts to be byte-identical.

Use canonical UTF-8 JSON with sorted keys, no insignificant whitespace and one
trailing newline for files. Rationals are reduced strings `p/q`, including `0/1`
and integers as `p/1`; integers used as counts/ordinals remain JSON integers.
Reject duplicate keys, nonfinite JSON constants, binary-float quantities and
bool-as-int substitutions. Capture, hash and parse each input from the same
bytes. Validate nested original records and their recomputed seals, not just an
outer schema or equality between two unvalidated receipt shells. Public writers
validate exact structure, types, allowed digest slots and fixed scope statements
before writing. A sealed unsupported claim is still invalid.

File caps are 32 MiB per private stage artifact, 8 MiB per public artifact,
depth 32, 1000000 JSON nodes and strings of at most 2048 characters unless a
narrow schema field has a smaller limit. Declared derived-rational slots alone
allow up to 5000 ASCII characters for the 8192-bit arithmetic profile; no free
text or arbitrary nested field inherits that exception. Rational strings are length
checked before integer conversion and bounded as specified below. Source CSV
has its separate fixed 332126-byte identity. Failures are constant codes and
never silently truncate an artifact or preserve a successful prefix as COMPLETE.

At implementation freeze, the following are required payload members, with no
unregistered optional extension fields. A structured member expands into a
strict named schema in the implementation; public/private projections are separate
schemas, not a mode that merely hides arbitrary keys at display time.

| Artifact payload | Required members |
| --- | --- |
| `allocation.v1` (private) | `execution_kind`, `route_artifact`, `condition_cohort`, `development_group_ids`, `reserved_group_ids`, `sampler_receipt`, `calibration_group_ids`, `evaluation_group_ids`, `role_map_sha256`, `allocation_attempt_id` |
| `label_routes.v1` (private) | `original_row_routes`, `authorized_target_positions`, `mapping_identity`, `condition_rule`, `source_group_role_map` |
| `input_freeze.v1` (private; aggregate projection public) | `feature_artifact`, `metadata_receipts`, `mapping`, `profile`, `label_route_seal`, `funnel_counts`, `role_counts`, `overlap_counts`, `original_membership` |
| `development_targets.v1` (private; status counts public) | `rows`, `target_profile`, `status_counts`, `complete_row_count`, `complete_group_count`, `adequacy`, `source_framing` |
| `rank_freeze.v1` (private; aggregate projection public) | `threshold`, `development_membership`, `processing_medians`, `predictions`, `neighbor_or_fallback_records`, `full_orders`, `fallback_counts`, `predictor_profile` |
| `completeness.v1` (public) | `reserved_primary_panel_count`, `reserved_primary_row_count`, `all_40_endpoints_defined`, `target_status_counts`, `population_counts`, `secondary_membership_artifact`, `calibration_vault_identity`, `evaluation_vault_identity`, `scope` |
| `target_vault.v1` (private, separate files per role) | `role`, `rows`, `target_profile`, `row_count`, `source_framing`, `rank_freeze_scientific_sha256` |
| `secondary_membership.v1` (private) | `members_by_source_group`, `restricted_orders`, `membership_rule`, `rank_freeze_scientific_sha256` |
| `calibration.v1` (private; aggregate projection public) | `protocols`, `calibrations`, `future_panels`, `decisions`, `policy_schedules`, `all_future_decisions_sealed`, `scope` |
| `evaluation.v1` (public) | `funnel`, `target_status_counts`, `calibration_summary`, `population_metrics`, `policy_metrics`, `gate_denominators`, `gate_margins`, `failed_gates`, `component_verdicts`, `overall_verdict`, `costs`, `scope` |

`role_map_sha256` is a whole-route-artifact identity, not a per-target hash.
Write the separate label-routes artifact first, then bind its bytes in the
allocation receipt; it does not contain an allocation-receipt back-reference.
The public membership/vault fields contain only whole artifact identities and
counts, never row IDs or value hashes. `access` records actor/stage, authorized
target column positions and accumulated/decoded/interpreted row-bundle counts;
separate mixed-source capture from those counts. `usage` records resource costs.
Failure envelopes use the same identity fields but no fabricated downstream
payload: unavailable outputs are null and incomplete stages are explicit.

## 3. Stage APIs, permitted reads and receipts

The names below are the implementation handoff; representation may use frozen
dataclasses internally. Production CLI subcommands expose the same transitions.
There is no unrestricted `read_all_targets` command.

| Stage/API | Inputs and permitted target access | Required output and next-stage gate |
| --- | --- | --- |
| `verify_registration(path)` | Published source/docs/tests/CI/engineering receipts; public source and mapping metadata only | `RegistrationIdentity`; exact source-origin and pre/post hash checks; no data access if unregistered or dirty |
| `allocate(metadata, registration, attempt)` | Pinned G15B/C metadata; no source CSV or target files; the sole production `os.urandom` callback | `allocation.v1`, complete 1545-row route manifest and transcript; immutable before target custody |
| `prepare_inputs(features, allocation, registration)` | Verified private `local_features.v1` plus linked public metadata; no target cells | `input_freeze.v1`, role-blind feature/overlap audit, source-bound label-route seal; all input/row counts independently verified |
| `parse_development(source_bytes, routes, input_freeze)` | Only columns 11 and 13 of T25 rows assigned DEVELOPMENT; no other cell is accumulated or decoded | Private `development_targets.v1`; aggregate status/count receipt, completeness adequacy result; source framing must finish successfully |
| `fit_and_freeze(development, features, input_freeze)` | Development labels and frozen features only | Private `rank_freeze.v1` containing threshold, predictor and every full order for all 314 rows; public aggregate freeze receipt; immutable before reserved labels |
| `assess_reserved(source_bytes, routes, rank_freeze)` | Uniform target parsing of T25 rows in all 40 reserved source groups, without conditioning parser or eligibility on CALIBRATION versus EVALUATION | Separate private calibration/evaluation label vaults, private secondary memberships, public `completeness.v1`; all-40 primary endpoint-defined boolean and both population counts |
| `calibrate_and_seal(calibration_vault, rank_freeze, completeness)` | Calibration numeric labels only; evaluation membership/aggregate all-defined status but no evaluation numeric vault | `calibration.v1`, all 20 future decisions for each population and immutable policy orders/budgets; sealed jointly before any evaluator reveal |
| `replay_and_audit(decision_freeze, evaluation_vault)` | Policy-specific requested row bundles, then complete evaluator truth after every scheduled policy run finishes | Private reveal/audit ledger, aggregate `evaluation.v1`, exact gate verdict; no new decision, model or threshold |
| `reproduce(registration, sealed_allocation, source, features, new_attempt)` | Same stage boundaries in a fresh process; no entropy call | Independent computational receipt comparing scientific stage digests; same archived experiment, not a second scientific sample |

After an incomplete development stage, preserve all funnel/status counts but do
not open reserved labels. After any resource/source/identity failure, later-stage
capabilities are unavailable. Returning a result object is not permission to
skip the immutable predecessor write and verification. Tests must intercept both
file reads and target-decoder entry calls to challenge this order.

## 4. Allocation, original identities and source framing

Reconstruct the 314-row T25 cohort from the pinned metadata, with exactly 75 known
source-token groups, independently of feature or target completeness. Recheck
all 1545 original ordinal/record IDs and their one-to-one G15B/C links. Rows are
identified by the source SHA-256 plus colon plus canonical zero-based decimal
ordinal. A source group is the existing exact-token equality number, not a
normalized DOI, inferred study or chemically connected component. Do not combine
unknown source tokens. No source title/free text is needed by the study.

Apply the scientific document's literal hash salt and development sort. The
remaining 40 numeric group IDs, ascending, feed the unchanged reviewed helper
`sample_permutation`. Its inner schema remains
`lupine.permutation-allocation.fixture.v1`; the outer production study receipt
binds the real metadata universe and declared `os.urandom` route. It does not
rename the helper's synthetic identity or change either false attestation flag.
The source registration pins the helper, README, tests and engineering receipt.
The outer receipt explicitly declares `execution_kind=PRODUCTION_ARCHIVE` for
the real run and `REPRODUCTION_FIXED_ALLOCATION` for replay. The inherited inner
schema name is a legacy generic-helper identifier, not a claim that the actual
IDs or bytes are synthetic. Do not change the reviewed helper to hide this
distinction or describe its false attestation flags as evidence of a uniform law.
Reproduction references the byte-identical original production allocation as
an input. Its REPRODUCTION_FIXED_ALLOCATION execution receipt is separate; it
does not rewrite the original allocation's kind or recompute its scientific seal.
For this use verify exactly 40!, 160 mask bits, 20 requested bytes and cap 128.

Persist and fsync the attempt-start marker and each request marker before the
callback. Persist each complete returned draw and disposition before allowing
the next callback or publishing an allocation. Recompute masked indices and
factorial rank/unrank when verifying a transcript. A kill between requesting
entropy and sealing a complete response makes the allocation INCOMPLETE; never
replace it with another draw sequence under the same registration. Preserve
the helper's provider/type/length/cap failures with constant reasons. Synthetic
tests may inject a callback; the production route has no provider/seed switch.

The route table assigns roles to every original row sharing a selected source
group, but separately marks whether the T25 condition grants target access.
Original non-T25 rows remain target-inaccessible even if their source is active.
The pre-label route seal binds source bytes, mapping, original ordinal, requested
column positions and role. It seals target locations without parsing their cells.
Do not hash individual cells. The immutable allocation and input-freeze receipts
must be closed, hash-verified and persisted before target parsing starts.

Reuse the frozen structural CSV framing rules and column mapping. Verify the
complete first logical record, 23 fields in every data row and all 1545 records;
late framing/count failure invalidates the whole parse, not just the last row.
The scanner decides from ordinal/route/column position whether to accumulate a
cell **before** unescaping or decoding its content. Unselected fields are only
framed, with inherited byte/framing resource limits. No global UTF-8 decoding,
`csv.reader` over decoded body, logging or classification of unselected fields.
Correctly framed invalid UTF-8 or target canaries outside the allowed routes
must not reach a text/numeric decoder. Framing itself still observes syntax bytes.
Positions 11 and 13 are zero-based. Preserve framing caps of 4096 data records,
128 columns, 16384 bytes per field and 65536 bytes per logical record, as in
the original scanner; the actual pinned 1545-record/23-column counts are stricter
identity checks. A new registered route-aware scanner may implement the same
framing state machine with different authorized-cell sinks. Do not modify or
misdescribe the historical metadata scanner as already providing this target API.

## 5. Exact target parser and semantic outcomes

`parse_target(selected_cell_bytes, target_name)` returns an immutable object
`{status, reason, value}`. Only VALID has a Fraction value. Both targets use the
same lexical/resource rules. Column identity supplies the unit; no unit string
in a cell is interpreted. After CSV quote-unescaping, find the span remaining
after ASCII space and tab trimming, without decoding an unbounded string. An
empty span is MISSING. Do not trim CR/LF, Unicode whitespace or arbitrary bytes.

For nonempty spans, apply these checks in this order:

1. More than 128 bytes: `UNRESOLVED_LIMIT/TOKEN_BYTES_LIMIT`. No numeric conversion.
2. Any non-ASCII byte: `UNSUPPORTED_LEXICAL/NON_ASCII_TOKEN`.
3. Case-insensitive ASCII full match of signed `nan`, `inf` or `infinity`:
   `UNSUPPORTED_NONFINITE/NONFINITE_TOKEN`. No float or Decimal construction.
4. Require full match of `[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?`.
   Failure is `UNSUPPORTED_LEXICAL/NOT_POINT_DECIMAL`. Thus `.5`, `1.`, `+1`
   and scientific notation are accepted; fractions, intervals, inequalities,
   uncertainty text, units, commas, internal whitespace and percentages are not.
5. Count mantissa digits, exponent digits and fractional places before `int`,
   `Fraction`, powers or conversion: at most 128 mantissa digits, at most three
   exponent digits including leading zeros, and exponent absolute value at most
   256. Accumulate the at-most-three exponent digits with a bounded digit loop.
   Excess is `UNRESOLVED_LIMIT/DECIMAL_DIGIT_LIMIT` or `EXPONENT_LIMIT`.
6. Form the exact integer mantissa and power `p=exponent-fractional_places` only
   after those caps. Require `abs(p)<=384` before any `10**abs(p)`. Intermediate
   integer cap is 2048 bits. Form the exact rational, reduce it and require both
   numerator and denominator to have at most 512 bits. Excess gives
   `UNRESOLVED_LIMIT/TARGET_BITS_LIMIT`, never rounding/clipping.
7. A negative nonzero value gives `SEMANTIC_CONFLICT/NEGATIVE_YS` or
   `SEMANTIC_CONFLICT/NEGATIVE_ELONGATION`. Zero, including `-0` and `-0e2`, is
   VALID and canonicalized to `0/1`; syntax/exponent caps still apply before a
   zero shortcut. Nonnegative finite values within the profile are VALID.

VALID has reason `FINITE_NONNEGATIVE_RECORDED_POINT`. MISSING has reason
`EMPTY_TOKEN`. No other value denotes missing. These are operational states of
the declared endpoint, not findings about the specimen or publication. Resource
and grammar failures preserve the primary record and yield no numeric endpoint;
they do not authorize fallback parsers, repair, recoding or row substitution.
Secondary membership is exactly VALID for both YS and E after this parser.

Each private label row records original identity, source column, status/reason,
exact value or null, source blob and parser version. It records fixed uncertainty
status `NOT_INTERPRETED` and pairing status `CO_RECORDED_NOT_SPECIMEN_VERIFIED`.
No zero-error uncertainty, yield-offset definition or reference endpoint is
implied. An absent component maps to `None` in `PanelOutcome`; a known objective
may remain known while its constraint is unknown, but the primary panel score
is then incomplete. Preserve both target statuses separately.

## 6. Feature input, predictor freeze and exact arithmetic

Consume `lupine.discovery.mpea.local_features.v1` via its frozen validator. Bind
its whole bytes, content seal, producer commit/source identity, declared profile,
all linked G15B/C receipts and source record links. Required row fields are
`ordinal`, `record_id`, copied metadata, `composition.{status,reason,values}` and
`processing_indicator`. The 118 atomic-number axes and ordered categories
CAST/POWDER/WROUGHT/ANNEAL/OTHER/UNRESOLVED must match the registered feature profile.
Known composition values are exact nonnegative rationals summing to one; null
composition is not a zero vector. The study does not obtain formulas from group
IDs, reparse source cells or revise this separately frozen profile.

Before development labels, aggregate lexical, normalized-composition and combined
descriptor overlaps for every fixed role/role pair, preserving unresolved rows.
Unknown vectors do not form a shared descriptor group. Keep source-token overlap
and descriptor overlap distinct. No overlap result changes allocation or scope.

Build complete development rows using both target VALID states. Check the fixed
50-row/15-source adequacy criteria before medians or fitting. Lower median of
an n-element ascending exact list is element at zero-based index `(n-1)//2`.
Use the exact predictor in the scientific protocol: one closest known-composition
complete row per source group, then five representatives, ties by numeric
original ordinal. Neighbors are ordered with exact Fraction L1 distances; no
float, approximate search, ID lexicographic shortcut or target-informed neighbor
tie is allowed. Development queries also follow this literal rule; their unused
in-sample predictions are not development validation or evaluation evidence.

The freeze records private neighbor IDs/distances or the precise fallback route,
predictions for each original T25 record, threshold, all full policy orders and
input identities. Public outputs include only counts by fallback route and
whole-artifact seals. Fallback routes are `FIVE_GROUP_NEIGHBORS`,
`FEWER_GROUP_NEIGHBORS`, `UNKNOWN_COMPOSITION_PROCESSING`, and
`NO_KNOWN_DEVELOPMENT_COMPOSITION_PROCESSING`; the separate processing fit records
`CATEGORY_MEDIAN` versus `GLOBAL_MEDIAN_EMPTY_CATEGORY` without source text.
No radius or uncertainty interval is inferred from these means or medians.

Use exact Python Fractions through ranking, calibration and metrics. Derived
arithmetic has an explicit 8192-bit reduced numerator/denominator ceiling and
16385-bit temporary integer ceiling, checked before unbounded operations. Inputs
must first satisfy the smaller feature/target caps. Exhausting derived arithmetic
blocks the entire dependent computation as `ARITHMETIC_LIMIT`; it never changes
membership, substitutes floats or excludes one troublesome candidate. This is a
bounded study worker using the generic Python API, not a relaxation of the
existing workbench JSON profile or its 512-bit wire limits.

## 7. Reserved custody, generic calibration and future seals

After rank-freeze validation, apply the same target parser to all 40 reserved
groups. The custodian computes primary `all_40_endpoints_defined` without using
calibration/evaluation roles to decide membership, syntax or completeness. It is
true iff every required target in those 40 primary panels is VALID. Retain both
the all-40 count and original row denominator. A false result sets primary
premise to `unsupported`, even if all realized calibration labels are complete.
Missing or unparseable endpoints are not assigned score zero. If source framing
fails, no completeness result is published.

The custodian seals separate calibration and evaluation numeric vaults. It may
emit secondary memberships and aggregate completeness states to the calibrator,
because the role-blind definition was frozen in advance. This is disclosed
held-out missingness access, not held-out numeric access or untouched metadata.
The calibrator cannot open the evaluation numeric vault. Secondary ranks are
literal restrictions of frozen full ranks; zero-member panels remain panels.
Membership and all-40 checks are fixed functions of the whole reserved archive,
not filters conditioned on favorable calibration scores or feasibility.

For each population construct the existing generic objects:

```
PoolProtocol(protocol_id="mpea-t25-archival-v1/<population>",
  scenario_id="mpea-t25-archival-v1/<population>",
  ranker_id="composition-source-balanced-5nn-v1",
  ranking_rule_id="predicted-feasible-first-ys-desc-v1",
  tie_rule_id="sha256-tie-then-original-ordinal-v1",
  generator_id="fixed40-uniform-permutation-20cal-20eval-v1",
  freeze_reference=<rank-freeze scientific digest>,
  sampling_scope=<fixed registered scope text>,
  objective_scope=Scope(scenario_id, "score", "MPa", <source/column11 reference>),
  constraint_scopes={"elongation": Scope(scenario_id, "elongation",
    "percentage_points", <source/column13/threshold-freeze reference>)},
  premise_status="assumed_unverified" or "unsupported")
```

The exact `sampling_scope` is: `Fixed archived source-token panels; conditional
uniform permutation of 40 reserved groups after a fixed development fit;
single-future-panel marginal scope; no study independence or physical attestation.`
No new probability status is introduced. Primary uses assumed_unverified only
when all 40 endpoints are defined and allocation/input checks complete; secondary
uses it for its fixed role-blind complete-record population. Any unsupported
sampling law gives unsupported status and all-universe pools; source integrity
failure blocks execution rather than manufacturing a valid fallback receipt.

Use `RankedPanel`, `PanelOutcome`, `PanelOutcomes`, `CalibrationPanel`,
`calibrate_panels(alpha=Fraction(1,10))` and `select_pool` unchanged. Each protocol
receives exactly 20 calibration panels, including empty secondary panels. Panel
IDs bind protocol/population/assigned role/source group; universe IDs bind
protocol/population/source group. The feature digest binds the exact feature and
rank input manifest. Objective is `-YS`, constraint is `T_E-E`; unavailable
components are `None`. Outcome references bind source columns, parser and exact
private vault artifact. Full original objects and all computed inner seals are
retained in private receipts, not replaced by schema-only summaries.

Seal all 40 future pool decisions, their future memberships/orders and all fixed
policy/budget schedules before the evaluator obtains any target reveal. Verify
each decision's original protocol, calibration assessments, threshold and future
panel identity against frozen inputs. No recycled receipt, stale threshold,
cross-population membership or supplied `verify=true` is trusted. Calibration
uncertainty is represented by existing premise/status fields, not a fitted
physical discrepancy bound.

## 8. Replay, truth audit and exact denominators

Every evaluation panel/population has 24 policy runs and receives a completed
ledger entry, including empty panels and the stopped policy with K=0. There are
960 scheduled runs (20 panels times two populations times 24 policies). A
policy's fixed order is sealed before reveals. An oracle accepts only its next
scheduled original record ID; it binds policy, panel, decision and request ordinal
and debits one bundle before returning its YS/E states. A repeated/foreign/out-of-
order request is a hard failure, never free look-ahead. No policy can read another
policy's history or the complete truth vault. The evaluator may share custody
storage while enforcing these consumer capabilities; disclose this architecture.

Full orders run through `min(m,32)` reveals, which covers the current pinned
primary maximum m=25; stopped order runs through K. A changed cohort maximum or
count is a source/metadata mismatch, not a request to raise a cap. Record snapshots
at caps 0,1,2,4,8,16,32 and each panel's K for all controls, retaining the distinction
between requested cap and actual cost. The stopped order at cap b has actual
cost `min(b,K)`; do not call that equal spend with a full order costing more.
The first-optimum cost is null with reason NOT_REACHED if the policy did not
reach any optimum, and UNKNOWN if complete panel truth is unavailable. Full
truth becomes available to the aggregate auditor only after every run is sealed.

Let M be a complete panel's full feasible tied-optimum set, R a revealed or
retained set, and m its registered size. For nonempty M, any-optimum hit is
`1[intersection(R,M) nonempty]`; all-optima retention is `1[M subset R]`.
Feasible-hit concerns at least one revealed feasible row, which need not be an
optimum. Best feasible YS is the largest revealed feasible YS; regret is full
best feasible YS minus this value only when both exist. Do not assign regret zero
or infinity when no feasible candidate was revealed.

For a complete infeasible/empty panel, any-optimum hit is 0, all-optima retention
is vacuously 1 and score is 0; best/regret and first-optimum cost are not applicable.
Report these counts outside the feasible-panel discovery denominator. For an
incomplete primary panel, optimum/feasibility-complete/retention/regret metrics
are UNKNOWN even if some useful reveals exist. Observed known-feasible rows may
be counted explicitly as observations, never as complete recall. Whole-universe
set inclusion remains a deterministic fact, not measured discovery. For m=0,
K/m is null with reason EMPTY_PANEL, not 0; all gate denominators below exclude
empty panels through their feasibility definition.

Final denominators and gates are exact:

- All evaluation and funnel counts use the 20 assigned panels per population,
  all original 314 condition records and all 1545 source records as appropriate.
  No endpoint or feature failure changes these original denominators.
- F is the set of secondary evaluation panels with at least one feasible row;
  D is `{p in F: m_p>=2}`. Adequacy is `|D|>=10`. Record |F|, |D| and the number
  in D with m>4; no complete-case or feasibility conditional coverage is claimed.
- Pool recall passes iff `10*sum_F all_optima_retained >= 9*|F|`.
  Pool size passes iff `4*sum_F Fraction(K_p,m_p) <= 3*|F|`.
  Secondary calibration must be exactly `finite_conditional`.
- At cap 4 define integer A, P and O as the any-optimum hits over D for primary,
  processing and objective-only full orders, and R as the sum of hits over all
  20 hash controls over D. The gates are `20*A-R >= 2*|D|`, `A>P` and `A>O`.
  Thus the first is an exact 1/10 macro hit-rate improvement. Empty D makes
  metrics unavailable and adequacy fail, never a zero-denominator pass.
- Publish each signed integer/rational gate margin and every failed gate.
  Both pool and ranking usefulness plus adequacy and complete execution are
  necessary for GO. A model cannot win by one target metric or one favorable cap.

The report includes macro rates on their explicit panel denominators and
separately labeled candidate totals, not an unlabeled pooled rate. All alternative
caps, primary unknown outcomes, fallback counts, secondary selection counts,
infeasible/empty dilution and negative findings remain visible. There is no
normalization by the number of successful controls or completed policy runs.

## 9. Closed status and reason vocabulary

Study stage status is one of COMPLETE, BLOCKED, INCOMPLETE, or
NO_GO_INSUFFICIENT_DEVELOPMENT. Final completed verdict is
GO_DESIGN_INDEPENDENT_STUDY or NO_GO_ARCHIVAL_USEFULNESS. The latter may coexist
with ranking-only or pool-only passing component gates, never implied deployment.
An incomplete/blocked run has no overall success/failure performance verdict.
No free-text exception is a reason. Fixed explanatory prose is source-bound.

Structural/operational reasons are REGISTRATION_MISSING, REGISTRATION_MISMATCH,
CI_NOT_PASSED, ENGINEERING_NOT_PASSED, IMPLEMENTATION_MISMATCH,
SOURCE_IDENTITY_MISMATCH, INPUT_IDENTITY_MISMATCH, METADATA_LINKAGE_CONFLICT,
METADATA_COUNT_MISMATCH, SCHEMA_INVALID, CSV_FRAMING_INVALID, CSV_COUNT_MISMATCH,
OUTPUT_PATH_INVALID, OUTPUT_ALREADY_EXISTS, CACHE_IO_FAILURE,
ALLOCATION_ALREADY_ATTEMPTED, ALLOCATION_TRANSCRIPT_INVALID,
ALLOCATION_PROVIDER_FAILURE, ALLOCATION_DRAW_LIMIT, ALLOCATION_INTERRUPTED,
FEATURE_PROFILE_MISMATCH, STAGE_ORDER_VIOLATION, UNAUTHORIZED_TARGET_ACCESS,
DEVELOPMENT_ROWS_BELOW_50, DEVELOPMENT_GROUPS_BELOW_15,
DOCUMENTED_ENDPOINT_CONFLICT, ARITHMETIC_LIMIT, WALL_TIME_LIMIT, RSS_LIMIT,
WORKER_INTERRUPTED, STALE_OR_INVALID_DECISION, REPLAY_REQUEST_INVALID,
REPLAY_INCOMPLETE and INTERNAL_FAILURE. Lower-level sanitized sampler reasons
remain in their declared inner enum. Target states/reasons are exactly those
in section 5; feature reasons remain the separately pinned feature schema.

Scope/metric/gate reasons are PRIMARY_ENDPOINTS_UNDEFINED,
PRIMARY_ALL_40_ENDPOINTS_DEFINED, SECONDARY_COMPLETE_RECORD_POPULATION,
SAMPLING_PREMISE_ASSUMED_UNVERIFIED, SAMPLING_PREMISE_UNSUPPORTED,
TRUTH_UNKNOWN, EMPTY_PANEL, NO_FEASIBLE_CANDIDATE, NO_FEASIBLE_REVEAL,
NOT_REACHED, SECONDARY_DISCOVERY_PANELS_BELOW_10, POOL_RECALL_BELOW_9_10,
POOL_MEAN_FRACTION_ABOVE_3_4, POOL_STATUS_NOT_FINITE_CONDITIONAL,
RANKING_RANDOM_MARGIN_BELOW_1_10, RANKING_NOT_ABOVE_PROCESSING,
RANKING_NOT_ABOVE_OBJECTIVE_ONLY and ALL_USEFULNESS_GATES_PASSED.
Generic decision_pool status/reason/guarantee values remain verbatim from the
pinned runtime, including unsupported/incomplete reasons together where present;
do not translate them into stronger evidence statuses or hide one behind another.

## 10. Resource, engineering and prospective registration gates

Record stage CPU/wall time and peak RSS separately from scientific digests.
From the first development-target decoder entry through final report, a production
supervisor enforces a 3600-second total wall cap and 2 GiB RSS; stage restarts do
not reset the budget. The source-specific worker has no network route. Persist
completed stage/checkpoint receipts and a constant failure receipt on timeout,
memory exhaustion or interruption; no valid predecessor implies a valid later
result. Do not label a killed worker as source drift. Reproduction has its own
declared run budget and the same scientific inputs, not a fresh allocation.

Required synthetic checks before freeze/CI and before the first real run:

1. Source pin and same-buffer verification before parsing; malformed/replaced
   bytes, stale metadata IDs, late CSV errors and changed row counts block the
   whole stage without raw snippets, partial successes or silent record loss.
2. All original rows preserved; exact T25/source routing; no target decoder for
   other-condition or unauthorized roles. Invalid UTF-8/canaries in unselected
   cells stay unobserved by decoders/logs. Development fits cannot open reserved
   target vaults or call their decoder even for a digest check.
3. Decimal grammar boundaries, exponent preflight before powers, signed zero,
   negative conflict, nonfinite, uncertainty/range strings and every resource
   cap. Vary unsupported tokens without changing the declared parser or cohort.
4. Sampler rank/unrank and transcript checks, first accepted draw, late rejection,
   provider exception and interrupted durable ledger; no entropy in reproduction
   and no alternate draw after an already attempted allocation.
5. Exact feature origin/profile and all row links; preserved overlap and unknown
   vectors; nearest representative per source, equal-distance/ordinal ties,
   fewer-than-five neighbors, all fallback branches and even-n lower medians.
   Independently hand-computed rational toy predictions must match exactly.
6. Freeze precedes every reserved decode; all-40 check is invariant to swapping
   cal/eval roles. One undefined evaluation endpoint alone forces primary
   unsupported/all-universe even with 20 complete calibration panels. Secondary
   membership/order is role-blind and preserves empty panels.
7. Complete runtime calibration examples: tied optima, alpha1/10 rank19, two
   score-one panels forcing tau1, empty score0, unsupported/incomplete precedence,
   tau0 statistical empty, variable panel sizes and exact weak-prefix boundary.
8. Every future decision sealed before first reveal; stale/cross-panel/rewritten
   receipts rejected; exact original raw input identity distinct from canonical
   model digest; all 960 runs including empty runs required before truth audit.
9. Same-order stopped/full controls identical through K; constructed strict
   ranking improvement/failure; all gate equality boundaries and zero-denominator
   cases; missing primary truth never becomes success or invented regret.
10. Public allowlist/sink rejects rows, IDs, target text, per-value hashes, extra
    fields and stronger scope claims; sentinel exceptions and failed subprocesses
    produce only closed reasons. No outputs outside the ignored cache except
    validated aggregate receipts selected for later publication.
11. Actual-source-shaped synthetic end-to-end run exercises active read guards,
    exact arithmetic and subprocess resource checkpoints, followed by fresh-process
    reproduction of identical scientific digests. Synthetic counts may be injected
    only through a fixture API; production count/source/rule constants cannot.

The engineering receipt binds test source and all executed implementation files
before/after, actual command, exit code and final passed summary with no skipped
tests. Registration requires independent source review and all required project
CI checks for the published exact commit. This contract does not assert those
future checks have happened. Stage code, production CLI, registration receipt,
feature artifact and actual allocation are still prerequisites, not hidden
assumptions or invitations to read targets now.
