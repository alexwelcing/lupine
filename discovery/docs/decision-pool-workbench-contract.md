# Decision-pool workbench contract

Status: **G16 implemented; release verification is recorded separately.** The
[strict adapter](../src/lupine_discovery/decision_pool_io.py), CLI dispatch,
guarded HTTP path, browser view and three synthetic catalogue entries implement
this contract. The exact
[Python API](../src/lupine_discovery/decision_pool.py) is frozen. Its
[calibration design](decision-pool-calibration-design.md) supplies the argument,
assumptions, counterexamples and existing synthetic checks. The five
existing modes and their schemas, fixtures, results and interpretation stay
unchanged.

This is a separate statistical pool rule. It uses a supplied, externally frozen
ranking and complete calibration-panel labels to choose a prefix for one future
finite panel. It does not fit a ranker, prepare intervals, establish physical
truth, certify candidate feasibility, or produce an incumbent or regret bound.
The future outcome document is unavailable to selection. A receipt binds the
declared experiment; it cannot establish that its sampling or freezing history
actually occurred.

## Operations and information boundary

Adapter module: `decision_pool_io.py`. Public names parallel the
projection wrapper without changing the pure API:

```python
loads_decision_pool(raw_text_or_bytes)
parse_decision_pool_problem(value)
decision_pool_certificate(value)
decision_pool_replay_report(value, outcomes_or_zero_argument_loader)
parse_decision_pool_outcomes(value, parsed_problem, problem_digest, certificate_digest)
```

The parser validates all records and resource limits, constructs the existing
`PoolProtocol`, `RankedPanel`, `PanelOutcomes` and `CalibrationPanel` objects,
then calls `calibrate_panels` and `select_pool`. It accepts no supplied `R_i`,
`n`, `k`, threshold, assessment, retained set, or guarantee. Selection never
accepts a future outcome argument. Calibration labels are selection inputs and
are explicitly visible as such; they are not the hidden future answers.

Replay must first recompute and seal the complete decision receipt. Only then
may it invoke its outcome loader, parse future labels, check their identities,
and call `assess_panel` on the exact selected future panel. A callable is the
required CLI/HTTP integration path. Passing an already loaded value is useful
for direct Python callers, but does not by itself prove when that caller opened
the labels. Do not claim otherwise.

## Strict input wire

Schema: `lupine.discovery.decision_pool_problem.v1`.

Exact required top-level fields:

```text
schema, protocol, alpha, calibration_panels, future_panel
```

Only `description` is optional. Every field below is required, including empty
arrays/maps and explicit premise status. Python defaults are not wire defaults.
Unknown fields, duplicate JSON keys, duplicate IDs, invalid permutations,
unexpected types and inconsistent identity links are errors. There is no
automatic ranking, calibration subsampling, label imputation, source retrieval,
scope coercion, or fallback to another screening mode.

| Record | Exact input fields |
| --- | --- |
| `protocol` | `protocol_id`, `scenario_id`, `ranker_id`, `ranking_rule_id`, `tie_rule_id`, `generator_id`, `freeze_reference`, `sampling_scope`, `objective_scope`, `constraint_scopes`, `premise_status` |
| Quantity scope | `scenario_id`, `quantity`, `unit`, `reference` |
| Ranked panel | `panel_id`, `universe_id`, `feature_manifest_digest`, `candidate_ids`, `ranked_ids` |
| Calibration entry | `panel`, `outcomes` |
| Nested calibration outcomes | `source_reference`, `rows` |
| Outcome row | `candidate_id`, `score`, `constraints` |

`calibration_panels` is an ordered array of calibration entries. `future_panel`
is one ranked-panel record. `alpha` is an exact scalar strictly between zero and
one. `score` and every constraint outcome are exact scalars or explicit `null`.
Numeric JSON integers must lie in the browser-safe range. Larger integers and
finite decimals use quoted exact strings; rational strings use a positive
denominator. Reject floats, booleans, exponents, nonfinite values and padded
numeric strings. Output rationals are reduced strings; bounded counts are
JSON integers. Display alpha and thresholds as exact text.

The objective has quantity `score` and is minimized. Every constraint means
`g <= 0`; its map key must equal its scope quantity. All scopes have the
protocol's scenario. `score` cannot also be a constraint. No conversion or
cross-scenario inference is part of this mode.

Only `assumed_unverified` and `unsupported` are valid premise statuses.
`freeze_reference` must identify the externally frozen ranker, features,
preprocessing, training state and relevant protocol/version records. The API's
assumption also requires the risk budget and calibration count to have been
fixed independently of calibration labels. The wrapper binds their submitted
values; it cannot verify their historical independence. `sampling_scope` is a
required declaration of the panel population, not a checked statistical law.

The full supplied protocol, every calibration panel, every original source
reference, every label/null and the future ranking remain available in the
receipt. Do not replace calibration records with a score list or only the
panels attaining the quantile. `source_reference`, scope references and
`feature_manifest_digest` are declarations; they do not certify a source,
license, label quality, training independence, or physical provenance.

### Identity and completeness rules inherited from the API

- Each ranked panel is constructed with the digest of the single reconstructed
  root protocol. Its `ranked_ids` must be an exact permutation of unique `candidate_ids`.
  The API canonicalizes the universe to sorted IDs while preserving ranking
  order. Ordinals and panel size are derived, never submitted separately.
- `panel_id` identifies a draw; `universe_id` identifies membership. Duplicate
  calibration draw IDs and reuse of a calibration draw as the future draw are
  errors. Repeated universes under distinct draw IDs are permitted, provided
  their membership is identical. Such reuse remains visible and is not itself
  evidence of exchangeability or independence.
- Calibration outcomes are constructed with the digest of their structurally
  enclosing, reconstructed exact ranked panel.
  Every candidate has exactly one row and every declared constraint has exactly
  one entry. Omitted/extra/duplicate rows or keys are errors. **Missing truth is
  represented by explicit null values**, including an entirely unknown row.
  The wrapper must not turn a malformed record into an abstention receipt.
- All labels and links are validated even under unsupported premises or when
  another label is unknown. No difficult or incomplete panel is dropped.
  `n` is the total supplied calibration count, with a separate `complete_count`.
- The empty universe with empty outcome rows is complete. A nonempty panel
  with no feasible candidate has a different reason. Both have panel score
  zero. Incomplete truth has unknown score, feasible set and minimizer set.

All internal constructor links are derived from the complete co-located input
records. A caller cannot supply or override `protocol_digest`, `panel_digest`, `outcomes_digest`,
`assessment_digest`, `calibration_digest` or `decision_digest` as derived fields
inside the original problem. In particular, protocol and panel identities
must be reconstructed, not trusted from a copied receipt. The receipt exposes
the same normalized identities as the Python API. The full original declarations
remain bound by the outer problem digest, so deriving these links does not
discard source or ranking custody. This also lets users edit their own input
without first calculating private Python identity digests. No identity-only
CLI command is required for the first version.

## Receipt and identity graph

Schema: `lupine.discovery.decision_pool_certificate.v1`.

Use the existing canonical digest function and strict, type-sensitive receipt
comparison. The outer `problem_digest = digest(original_wire_value)` preserves
accepted scalar spelling/types, array order and description. JSON whitespace
is not hashed; the browser nevertheless preserves it in its paired Problem
download. Semantic Python identities keep the API's existing normalization:

```text
original wire W -- problem_digest
  protocol -------- protocol_digest
  calibration entries, in supplied order
    panel --------- panel_digest (includes ordered ranking and feature manifest)
    outcomes ------ outcomes_digest (includes source reference and every null)
    assessed truth - assessment_digest
  exact alpha + all assessments ------ calibration_digest
  future ranked panel --------------- panel_digest
  calibration + future panel -------- decision_digest
complete wire receipt --------------- certificate_digest
```

Reordering calibration entries may preserve the numeric threshold but changes
the ordered calibration identity. Reordering outcome rows can preserve their
normalized identity while changing the outer wire identity. Metadata-only
changes propagate according to the existing API identities; no hash is a
signature or scientific attestation.

Required receipt structure:

| Field | Content |
| --- | --- |
| `schema`, `engine_version`, `adapter_version`, `profile_id` | Wire/runtime identity; adapter `decision-pool-adapter-v1`, profile `decision-pool-local-v1` |
| `scenario_id`, `problem_digest`, `certificate_digest` | Original scenario and complete outer seals |
| `protocol` | Complete normalized protocol with derived `protocol_digest` |
| `calibration` | `alpha`, `n`, `complete_count`, `k`, `threshold`, `status`, `premise_status`, `reasons`, `guarantee_status`, `conditional_guarantee`, `calibration_digest`, `panels` |
| `future_panel` | Complete normalized ranked panel with derived `panel_digest` |
| `selection` | `m`, `original_ids`, `ranked_ids`, ordered `retained`, `not_retained`, `retained_count`, `retained_fraction`, `threshold`, `calibration_status`, `premise_status`, `reasons`, `guarantee_status`, `conditional_guarantee`, `decision_digest` |
| `assumptions`, `physical_attestation` | Existing API premises verbatim and `not_established_by_this_program` |

`certificate_digest` hashes all other receipt fields. `calibration.panels` is an
ordered array of exact `{panel, outcomes, assessment}` entries. A normalized
panel and outcome record include their derived identities. Each calibration assessment
contains only `panel_digest`, `outcomes_digest`, `assessment_digest`, `status`,
`reason`, `m`, `score`, `feasible`, `minimizers` and complete `missing` pairs.
The enclosing receipt supplies the shared protocol. Preserve each original
calibration record exactly once; do not recursively serialize the same
protocol and labels through both `PoolCalibration` and every `PanelScore`.

`not_retained` is the ranking-ordered complement of the actual retained pool.
It means outside the selected statistical prefix, never infeasible or
dominated. `retained_fraction` is exact `retained_count/m` or `null` for an empty
universe. `original_ids` is canonical sorted membership; `ranked_ids` and
`retained` keep the ranker's order. Do not sort the retained pool for display or
export without explicitly preserving its operational order.

Use a small explicit projection of the existing dataclasses into this receipt;
do not extend or reinterpret the pure API. Derived counts/fractions are
presentation diagnostics, not new mathematical certificates. Do not add
selection or guarantee fields named `certified_feasible`, `possible_feasible`,
`certified_infeasible`, `dominated`, `incumbent`, `regret_bound`, or interval
`coverage`. This does not reserve extra user-defined quantity names: constraint
map keys keep the pure API's existing rule that only `score` is reserved.

Verification reparses W, recomputes every calibration assessment and the actual
future selection, and compares the complete regenerated receipt. It does not
accept a supplied score list, threshold, normalized receipt input, or retained
set as an alternative reconstruction source. Wrong versions/profile/seals or
extra/missing fields fail. Verification establishes identity and exact runtime
recomputation only; it cannot verify the sampling law or physical truth.

## Operational statuses and claim language

Preserve the existing precedence and every applicable reason:

| Primary calibration status | Threshold | Actual future pool | Permitted claim |
| --- | --- | --- | --- |
| `unsupported_premise` | `null` | Entire ranked universe | No calibrated guarantee |
| `incomplete_calibration` | `null` | Entire ranked universe | No calibrated guarantee; missing values and all panels remain recorded |
| `insufficient_calibration` | Exact `1` | Entire ranked universe | Deterministic retention by returning everyone, using the universal score bound |
| `finite_conditional` | Exact kth score | Weak prefix `rank <= m * threshold` | Single-future-panel marginal retention under the stated unverified premises |

Unsupported plus incomplete input records both reason codes, with unsupported
as the primary status. `k > n` may also remain a diagnostic reason, but it must
not override missing labels or unsupported premises. A finite threshold of one
is still `finite_conditional`, with `no_pool_reduction`. `n=0` with assumed
premises is insufficient calibration. These are distinct outcomes.

The finite statement is marginal over calibration and **one** future panel
under the declared exchangeable score law and additive probability. It is not
a verified probability for this realized pool, conditional coverage given this
calibration set, protection conditional on feasibility or a family, a
per-candidate probability, or a simultaneous/adaptive-query guarantee. Preserve
the API's conditional guarantee text and these limitations beside any risk
display. A successful replay cannot upgrade `assumed_unverified`.

Full-universe retention in the first two rows trivially loses no candidate by
set inclusion, but must not be presented as a calibrated probability result.
An empty statistical prefix in a nonempty universe is not a proof that the
panel is infeasible. An empty universe is a separate state. Do not silently add
top-one, truncate the prefix to a budget, intersect it with another selector,
or relabel omitted candidates as failures of a physical constraint.

## Separate future outcomes and replay

Schema: `lupine.discovery.decision_pool_outcomes.v1`.

Exact required fields:

```text
schema, scenario_id, problem_digest, certificate_digest,
panel_digest, source_reference, rows
```

The future document supplies its required `panel_digest` explicitly, unlike
structurally nested calibration outcomes. It binds the exact future panel,
has its own required `source_reference`,
and contains every candidate/constraint with explicit nulls for unknown values.
There is no `latent_world`, consistency point, imputed truth, interval, or
calibration-replacement field. Reject wrong outer seals, scenario, decision,
panel, rows, scopes and unexpected fields after selection has been sealed.
The certificate binds `decision_digest`; no redundant caller decision override
is accepted in this future document.

Replay schema: `lupine.discovery.decision_pool_replay.v1`.

Required top-level fields are `schema`, `engine_version`, `problem_digest`,
`certificate_digest`, `outcomes_digest`, `decision`, `reported_outcomes`,
`outcome_audit`, `interpretation`, `physical_attestation`, and `replay_digest`.
`outcomes_digest` binds the complete original future wire value.
`reported_outcomes` preserves the normalized original PanelOutcomes record and
its distinct API `outcomes_digest`; do not confuse the two identities.
`decision` contains the full original certificate and its actual selection.
`replay_digest` hashes all other replay fields.

The audit is computed from `assess_panel` and comparison with the already fixed
pool, with these exact fields:

```text
assessment_digest, status, reason, m, missing,
reported_feasible_ids, true_minimizer_ids, true_optimum_value,
worst_minimizer_rank_fraction, has_feasible_candidate,
all_true_minimizers_retained, lost_minimizer_ids, retention_test,
threshold_event_holds, retained_count, retained_fraction
```

- `status`, `reason`, `missing`, `m`, and the worst-rank score follow the
  assessment. With incomplete truth, all global feasible/minimizer/optimum,
  retention, lost-ID and threshold-event conclusions are `null`. `missing`
  enumerates the unavailable candidate/quantity pairs. Do not infer a complete
  optimum set from an observed best row or partially positive constraint.
- With complete feasible truth, report all feasible IDs, every true tied
  minimizer, exact optimum value and all lost minimizer IDs. The retention flag
  tests the actual pool, including any all-retained fallback. Its
  `retention_test` is `feasible_success` or `feasible_failure`.
- Complete truth with no feasible candidate gives logical retention `true`,
  empty minimizer/lost lists and no optimum value. `retention_test` is
  `vacuous_no_feasible_candidate` or `vacuous_empty_universe`, matching the
  separate assessment reason. This is not a successful discovery. Incomplete
  truth uses `unknown_incomplete_truth`.
- `threshold_event_holds` compares the exact assessment score to the actual
  threshold only when complete truth and a non-null operational threshold are
  present. Otherwise it is `null`. It is one realized predicate, not an
  estimated coverage probability. It must not replace the actual pool audit.
- Pool count/fraction describe the fixed decision; they are not the number or
  financial cost of completed measurements. The provided labels can support
  displayed counts of panels, candidates, label slots and missing slots. Actual
  acquisition costs remain unavailable in v1, rather than inferred from a pool
  size or source reference.

`interpretation` explicitly says that the audit concerns supplied finite-panel
truth, a realized failure can occur under the marginal theorem, and neither
success nor failure alone verifies/refutes the exchangeability assumption.
Empty-minimizer successes never enter a feasible-panel success denominator.
The first wrapper has no aggregate coverage endpoint; a future aggregate must
report total, complete, unknown, feasible, infeasible and empty-panel counts,
the two retention denominators and every failure. No favorable aggregate can
hide a realized lost optimum.

## CLI, HTTP and browser behavior

Extend existing schema dispatch only after adapter/review readiness:

```sh
python -m lupine_discovery select decision-pool-problem.json --output decision-pool-certificate.json
python -m lupine_discovery verify decision-pool-problem.json decision-pool-certificate.json
python -m lupine_discovery replay decision-pool-problem.json decision-pool-outcomes.json --output decision-pool-replay.json
python -m lupine_discovery serve --port 8765
```

The command/argument forms above use the existing CLI, including `--output`.
Release verification must exercise this mode through those commands. No new ranker, calibrate-only command,
proof-domain command or remote service is needed. CLI help must call this a
statistical pool and link its separate premises. Replay opens its second path
through a deferred loader only after the receipt has been sealed.

HTTP uses the existing raw envelopes and one shared guarded-worker slot:

```text
POST /api/select                 {problem_raw}
POST /api/replay                 {problem_raw, outcomes_raw}
POST /api/verify                 {problem_raw, certificate_raw}
POST /api/cases/{id}/replay       {problem_raw}
```

The HTTP parent never builds a protocol, calibration or decision. The guarded
child dispatches the new schema and validates the required identity links and
outer seals. Reject nested `{problem: ...}` for this mode instead of allowing
an unguarded legacy path. Built-in replay must seal a selection before its
case-specific outcome loader opens the answer resource. A changed original
input cannot use a packaged answer sealed to the old decision. Do not expose
the mode on a platform without the required guard.

The browser keeps original raw W and the full outer receipt in state. Paired
Problem and Certificate downloads retain exact submitted problem text and
compact receipt JSON; full replay export keeps the outer replay intact. No
calibration assessment is flattened into an interval or coupled certificate.
Edits, rebuilds, failed requests and stale revisions clear/disable the same
exports as existing modes. Future file reads use the current monotonic replay
request token: clear the previous replay before reading, then ignore old reads
or responses, including failed reads. New mode dispatch must not regress this
boundary.

Minimum accessible presentation:

1. **Statistical candidate pool** with the actual ordered pool, universe size,
   retained count/fraction, exact alpha, `n`, complete count, `k`, threshold and
   reason codes. Unsupported/incomplete titles say **Screening withheld**.
   Insufficient calibration says **All retained · insufficient calibration**;
   finite threshold one says **All retained · finite threshold**. A nonempty
   universe with threshold zero says **Empty statistical pool**, immediately
   followed by “This does not establish infeasibility.”
2. A protocol panel with every ranker/ranking/tie/generator identity, freeze
   reference, panel sampling scope, quantity scope and premise status. Text and
   hashes are displayed as declarations; arbitrary metadata is not executable
   HTML or a fetched URL.
3. A complete calibration table in original panel order: draw/universe IDs,
   source reference, panel/outcome/assessment identities, `m`, completeness,
   exact score and missing labels. Expandable details preserve every original
   row, ranking and scope. No default filter hides incomplete/infeasible panels.
4. An accessible ranked candidate table: ID, exact ordinal/rank fraction,
   retained/outside-prefix decision and reason. No predicted score, interval,
   per-candidate confidence, feasibility color, or regret is manufactured.
5. A reveal-only future audit with loss prominent, all lost tied minima, the
   unchanged actual pool, completeness and vacuity labels. Marginal-statement
   language remains adjacent and cannot turn the loss into a passing result.

Use scrollable, keyboard-accessible tables at narrow widths and wrap long
identities. No chart or client-side arithmetic is required. Existing known-answer
suite counts and scientific archive/training panels remain unchanged; the new
three cases are clearly synthetic demonstrations in their own catalogue group.

## Bounded local profile

Profile `decision-pool-local-v1` is intentionally modest. It bounds an initial
interface, not the mathematical universe. Limits reject input; they never
silently drop records or turn a truncated experiment into calibration.

| Limit | Ceiling |
| --- | --- |
| Raw problem or separate future outcomes | 256 KiB each |
| Certificate or successful worker response | 2 MiB; compact JSON exports |
| JSON nesting / parsed nodes | 24 / 65,536 |
| Calibration panels | 64 |
| Candidates in any one panel, including future | 64 |
| Total calibration and future candidate slots | 4,096 |
| Declared constraints | 8, plus one objective |
| Exact rational tokens in one document | 16,384 |
| Numeric token length / reduced numerator and denominator | 512 characters / 512 bits each |
| IDs and map keys / text references and description | 128 / 2,048 characters |
| Digest text | Exactly 64 lowercase hexadecimal characters |
| Guarded wall / CPU / address space | Existing 10 seconds / 5 seconds / 256 MiB |
| Worker stdout / stderr | Existing 2 MiB / 16 KiB |
| Concurrent guarded operations | Existing single slot shared with coupled and projection |

All limits apply together: for example, the rational-token and raw-byte ceilings
can reject a fully populated 4,096-row request before the row-count ceiling is
reached. The row count is not a promise that all quantity/text combinations at
that count fit the profile. No change to an existing mode's caps is implied.

Apply quote-aware byte/depth checks before the bounded decoder; reject duplicate
keys and unsafe numeric tokens during decoding. Validate all array counts,
record shapes, identities and numeric token lengths before `Fraction`
construction or dataclass normalization. Direct dict callers receive equivalent
structural/lexical checks; they cannot bypass limits by avoiding the JSON
loader. No caller can raise the profile's ceilings.

Generic CLI schema dispatch may still apply its existing 2 MiB/depth32 prepass
before its generic JSON decode, then apply this mode's stricter profile before
exact conversion. Do not claim a 256 KiB check preceded every generic decode.
The CLI's direct adapter path is structurally bounded but is not itself a hard
process-time/memory guarantee. HTTP uses the actual guarded child. Outer HTTP
body caps must account for JSON escaping of the raw documents, while retaining
the per-document caps above; do not shrink the verifier's useful certificate
limit through its transport envelope.

A timeout, memory/output limit, worker crash, invalid input or unavailable
guard returns a structured error with no decision receipt. None is a
statistical all-retained result. Schema-only or partially sealed child output
must not be accepted. Test shared-slot release, bounded output reads, process
group cleanup and no stale downloads. A large valid receipt must still be
verifiable after browser export. Resource limits are not a promise that every
combination of individually permitted dimensions completes successfully.

## Three synthetic demonstrations

All fixtures must be generated from the real adapter after it is frozen,
including canonical identities and sealed separate future outcomes. Use
literal constructed quantity scopes, explicit source references such as
“constructed rational labels; no material experiment”, and feature manifests
of synthetic declared records. No invented scientist, measurement or source
attestation is appropriate.

| Case ID | Calibration and ranking | Future truth and required display |
| --- | --- | --- |
| `decision-pool-ranked-ties` | Three complete four-candidate panels, ranks `a,b,c,d`, panel scores `1/4,1/2,3/4`; alpha `1/2`, so `n=3,k=2,tau=1/2`. Construct the unique calibration optimum at ranks 1, 2 and 3 respectively. | Four candidates ranked `a,b,c,d`, all feasible; scores `0,1,0,2`. Retain exactly `a,b`, including the threshold boundary. Replay reports tied minima `a,c`, lost ID `c`, and failed all-optimum retention even though one optimum remains. |
| `decision-pool-missing-label` | Same declared rankings/count/alpha, but an explicit calibration objective or constraint value is null. Preserve the incomplete panel and all source rows. | Retain all four future IDs with `incomplete_calibration`, null threshold, and no calibrated guarantee. Separate complete future truth can report actual retention without upgrading the calibration premise. |
| `decision-pool-feasible-failure` | Nineteen complete two-candidate panels with no feasible candidate: each has `g=1` for both IDs, hence score zero. Alpha `1/20`, `n=19,k=19,tau=0`; future ranking is `first,last`. | Future `first` has `g=1`; `last` has `g=0` and is the unique feasible optimum. Actual pool is empty. Replay reports `feasible_failure` and lost ID `last`; it never calls the empty pool an infeasibility certificate. |

The third case is the failing held-out role in the design's uniformly permuted
20-panel counterexample: 19 positions give vacuous retention and the feasible
position fails. The finite law has marginal retention `19/20` and feasible-panel
retention zero. The single replay does not itself execute or establish that
20-position calculation. Link the independently checked counterexample as
context, label the catalogue case a constructed realized failure, and keep its
failure visible. Do not use the 19 infeasible calibration panels as if they
were 19 successful held-out evaluations. No interval-coverage metric belongs
on this screen.

Three catalogue entries do not exhaust state coverage. Tests must additionally
cover unsupported alone and combined with missing labels, insufficient count
including `n=0`, finite `tau=1`, empty future universes, incomplete future truth,
zero constraints, exact risk-resolution boundaries and arbitrary ranking order.

## Acceptance checks and handoff decisions

Required implementation evidence before publication:

- Frozen Python identities match strict wire reconstruction; metadata/alpha,
  ranking, source reference, feature manifest and null changes affect the
  correct seals. Normalization never lets a stale outer receipt verify.
- Invalid rankings/scopes/digests, dropped panels/rows/keys, duplicate draws,
  conflicting universe membership and caller-supplied derived fields reject.
  Unsupported input does not skip remaining validation. Every null position
  causes the prescribed calibration fallback; complete-count filtering cannot
  produce a smaller operational pool.
- Status precedence, all reason codes, exact `k`, weak threshold, all tied
  minima, threshold zero/one, empty/vacuous/unknown states and true rank order
  conform to independent oracles and the frozen Python API.
- Deferred loader probes establish receipt sealing before future file read;
  different future truths cannot change that receipt. Tampered outcome seals
  reject. Replay of the counterexample records the actual failure.
- Guard limits, shared concurrency, invalid-output rejection and cleanup work
  for the new dispatch without regressing coupled/projection. The five existing
  modes, catalogue fixtures, known-answer counts and archived results retain
  their existing behavior.
- Chromium checks all three cases, all-retained states via explicit synthetic
  uploads, exact paired export plus real CLI verification, complete replay
  export, failed/reversed file reads, rebuild/input/revision invalidation,
  metadata-as-text, and desktop/mobile accessibility. Source hashes and actual
  command results accompany the final report; design prose is not verification.

The explicit receipt field projection and replay reason strings were agreed
before UI implementation. The pure API and its identities remain unchanged.
Changes to local counts/lexical ceilings require boundary execution and an
updated profile, rather than a claim of untested capacity.
The shared worker's response validator must bind this new receipt and replay
graph without confusing a successful all-retained scientific status with an
execution failure. No scientific population, trained ranker, empirical coverage
result, new theorem, or Python-to-Lean refinement is claimed by this integration.

The source-bound Chromium run in [browser_smoke.py](../scripts/browser_smoke.py)
passed all 46 checks with zero JavaScript errors, preserving the previous 35
checks. Its 38 tracked runtime/web/resource hashes were unchanged before and
after execution. The added checks cover six-schema paired downloads verified
by the real CLI, complete statistical replay export, the three synthetic cases,
status precedence, exact resolution, empty/vacuous/partial truth, metadata and
rank order, stale/error/read-race protection, keyboard access and mobile layout.
Desktop and mobile screenshots were inspected. A first passing run was retained
separately; one unique-optimum failure sentence was clarified before the final
source-bound rerun. These are local engineering checks, not scientific coverage
measurements or physical validation.
