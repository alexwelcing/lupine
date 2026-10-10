# Closed aggregate study report projector

Status: reviewed constructed-data implementation; real-study production remains unregistered. No actual feature table, allocation,
source archive or performance target is read by this module or its tests. The
reviewed predictor/evaluator kernel remains byte-for-byte unchanged. Production
execution still requires the separate registration, source freeze, engineering
checks and successful CI specified by the prospective study protocol.

`scripts/mpea_study_report.py` is a pure source-specific adapter. It consumes an
immutable, completed `mpea_study.StudyEvaluation` plus explicit upstream aggregate
metadata. It performs no reading, writing, target parsing, fitting, allocation,
neighbor search, or access-capability enforcement. The separate custody driver
must validate sources/stages and publish with its reviewed atomic writer.

## API and data boundary

`project_evaluation(evaluation, context)` returns a frozen `PublicProjection`.
`project_unavailable(context, status, reasons, last_sealed_stage,
completed_policy_runs)` produces a separate unavailable-stage projection.
`PublicProjection` retains **only the immutable public document**, not the
private evaluation or context objects used to derive it. It cannot be constructed
from a caller-supplied document. Use `.as_dict()` for a fresh JSON-compatible
copy, or `.canonical_bytes()` for sorted compact ASCII JSON with one newline.
No caller-supplied serialization callback is used.

`validate_public_report(value, expected_projection)` compares exact canonical
bytes, including JSON type distinctions, against a projection reconstructed from
the original typed private evaluation and explicit metadata. It rejects extra
keys, changed conclusions, injected free text, bool/count substitutions and
resealed tampering. This is deterministic reconstruction, not a standalone proof
from a receipt shell. A public-only reader can check identity and inspect the
schema but cannot verify private aggregation or physical truth from a digest.

All metadata dataclasses validate exact field types, fixed keys and finite count
bounds. Sequences/maps are copied and made immutable. Their closed shapes are:

- `ArtifactIdentity(bytes_sha256, content_sha256, scientific_sha256)` has one
  required whole-file SHA-256 and two explicit optional seals. Missing seals are
  `None`; the projector does not invent them. Only declared whole-artifact slots
  exist; there are no per-cell or per-value identity slots.
- `SourceIdentity(byte_count, md5, sha256)` records the supplied whole-source
  identity. It does not claim that this projector opened or authenticated it.
- `RegistrationSummary(commit, protocol_sha256, contract_sha256,
  implementation_manifest_sha256, engineering_receipt_sha256,
  ci_receipt_sha256, receipt)` binds explicit external registration identities.
  It does not independently query Git, CI or a source registry.
- `FunnelCounts(source_rows, condition_rows, condition_source_groups,
  out_of_scope_rows, unresolved_source_rows)` preserves original rows. The three
  row categories must sum to `source_rows`.
- `RoleCounts(rows, source_groups)` uses exactly the roles `DEVELOPMENT`,
  `CALIBRATION`, `EVALUATION`. Counts refer to original primary records.
  Positive row membership requires at least one source group.
- `TargetAggregates(row_count, complete_row_count,
  complete_source_group_count, target_status_counts, target_reason_counts)`
  uses exactly `yield_strength` and `elongation`, the parser's six status names
  and its complete closed reason vocabulary. Counts must sum, each reason must
  belong to its status, negative-endpoint reasons must match their quantity,
  and complete-row count must lie within the possible intersection of the two
  VALID sets. Positive complete-row count requires at least one complete source
  group. An unparsed role has `None`, not fabricated zero status counts.
- `AccessCounts(mixed_source_captures, mixed_source_bytes,
  accumulated_bundles, decoded_bundles, interpreted_bundles,
  model_visible_bundles, calibrator_visible_bundles, policy_bundle_requests,
  auditor_unique_bundles)` distinguishes mixed byte capture from target-cell
  processing and consumer access. The three maps use all three roles with
  explicit counts or `None`. Unknown counters are not replaced by zero.
  Zero captures cannot have positive captured bytes. A failed capture may obtain
  an empty or incorrect-size buffer, so failure byte totals need not equal the
  supplied expected source size. Unique consumer visibility cannot exceed known
  original role membership or known interpreted-bundle counts.
- `Usage(wall_seconds, cpu_seconds, peak_rss_bytes)` permits exact nonnegative
  Fraction seconds and bounded integer RSS, each independently `None` when not
  supplied. These are supplied measurements, not inferred from result counts.
- `PublicContext(registration, source, inputs, execution_kind, funnel_counts,
  role_counts, target_aggregates, access, usage)` has only those fields.
  Registration, source and funnel may be unavailable in a failure context.
  `execution_kind` is `synthetic_fixture`, `registered_original`, or
  `registered_reproduction`; naming a mode is not production authorization.

`inputs` always contains the exact keys `feature`, `mapping`, `metadata_b`,
`formula_c`, `allocation`, `input_freeze`, `development`, `rank_freeze`, `reserved`,
`calibration`, `replay`, `evaluation`. Each value is an `ArtifactIdentity` or
explicit `None`. Complete reports require all identities and metadata, and
cross-check role rows/groups, complete rows/groups and each target's VALID count
against the private evaluation. Parser reasons behind an unknown numeric value
cannot be reconstructed from the kernel; they remain explicit, identity-bound
upstream aggregate declarations. They are never inferred as MISSING.

For a complete report, all accumulated/decoded/interpreted role counts must equal
original role membership. Model, calibrator, policy and auditor counts must agree
with the kernel's fixed logical access totals. Captured bytes must equal supplied
capture count times source size, with at least one capture. Registered modes also
require the protocol-pinned 332126-byte/MD5/SHA-256 source identity and the
fixed 1545-row source, 314-row cohort, 75 condition source groups and
35/20/20 role split. Synthetic tests may use smaller constructed cohorts, and
are labeled synthetic. Actual source/hash/schema authentication remains upstream.

## Complete report

The schema is `lupine.discovery.mpea.evaluation_public.v1`. Its common envelope
contains protocol/stage/status/reasons, registration, source, exact input identity
slots, execution kind, payload, access, usage, scientific seal and content seal.
`status=COMPLETE` and top-level `reasons=[]` mean execution completed; a scientific
NO_GO remains visible in the payload and is never relabeled as execution failure.

The payload is constructed from a fixed allowlist: funnel, target status/reason
counts, the derived lower-development-median threshold and unit, all-40 primary
completeness, per-role fallback counts, both calibration summaries, both population
summaries, all policy summaries, gate denominators/margins/checks/reasons, every
failed gate, component verdicts/reasons, overall verdict, logical costs, 960-run
accounting, whole-kernel evaluation identity and fixed scope statements.

Calibration summaries retain n=20, rank=19, exact alpha/threshold, status,
unverified/unsupported premise, every generic and study reason, the exact generic
single-panel marginal claim when applicable, an aggregate score histogram,
unknown/empty/infeasible calibration counts and four disjoint future decision
size classes. They contain no panel IDs or per-panel score list.

Population summaries preserve original and secondary candidate denominators,
complete/unknown/empty/infeasible/feasible panel counts, pool fractions with empty
values unavailable, logical costs, and aggregate pool outcome metrics. All 24
policies are retained for each population, with every cap 0,1,2,4,8,16,32 plus the
same-actual-K view and final view. Every policy has 20 scheduled and completed
runs, including zero-cost and empty-panel runs: two populations times 20 panels
times 24 policies is 960. No failed control is dropped from an average.

Each metric view reports both all assigned panels and the observed feasible-panel
subset. Binary metrics expose success count, known count, original panel
denominator, unavailable count/reasons and an exact rate only if a denominator
exists. Numeric aggregates expose the same counts plus exact sum/mean only when
at least one value exists. Thus a mean first-optimum cost is explicitly a mean
among panels where that cost is defined; NOT_REACHED remains counted separately.
Unknown outcomes, complete infeasibility, empty panels, absent feasible reveals
and unreached optima are not converted into zeros. Defined zero regret remains
separate from all-tied-optima retention. Observed known-feasible row totals and
whole-universe set retention counts remain separate from global discovery claims.

Fallback counts for reserved roles come from frozen predictions. Development
route counts use only known/unknown query composition, the number of complete
known-composition development source groups and the already-fitted category map.
The projector does not repeat prediction or fitting. No neighbor IDs, individual
predictions or development rows are returned.

Gate margins and explicit availability reasons are preserved unchanged. Empty F
or D produces unavailable usefulness components and false proceed checks, not a
vacuous pass or an invented below-threshold observation. The only possible
positive verdict remains `GO_DESIGN_INDEPENDENT_STUDY`, with no deployment or
physical-validity interpretation.

## Blocked, incomplete and inadequate development

The separate schema is `lupine.discovery.mpea.unavailable_public.v1`. Only closed
statuses `BLOCKED`, `INCOMPLETE`, `NO_GO_INSUFFICIENT_DEVELOPMENT` and closed
structural/operational reasons are accepted. It preserves actual supplied funnel,
parsed status counts, access/resource counts, last sealed stage and completed
policy-run count. A stage identity cannot appear after the declared last sealed
stage, and each predecessor through that stage must be present. Target summaries
require sealed development/reserved stages and the full original role row count;
any supplied known accumulation/decoding/interpretation count must agree with
that completed summary. Positive development cell counters
require an input-freeze seal; reserved cell counters require a rank-freeze seal.
This permits truthful partial parser-access counters after an authorized read
begins while withholding an unsealed aggregate summary. Model visibility requires
a development seal; calibrator visibility requires reserved; policy requests and
completed runs require calibration; auditor visibility requires replay. Source
capture also requires input-freeze. These are explicit prospective projector
consistency checks, not a change to the original protocol bytes or an independent
proof of active access enforcement.

Calibration summaries, population/policy performance, gates and overall verdict
are all `None`. No downstream result is reconstructed from a partial prefix. For
insufficient development, the supplied complete development counts must actually
fail the fixed 50-row or 15-source checks and the exact failed reasons must match;
the last sealed stage must be development, reserved target summaries/access must
remain unavailable or unaccessed, and model/calibrator/policy/auditor consumption
must be absent. Adequacy is assessed from parser aggregates before model access. These are halted-stage
receipts, not completed archival usefulness verdicts.

## Exact serialization, identity and disclosure limits

Counts remain JSON integers. Every Fraction is a reduced `p/q` string, including
`0/1` and integer-valued `p/1`. No binary float is accepted. The public document is
bounded by 8 MiB, depth 32 and one million nodes. Ordinary keys/strings are capped
at 2048 characters; only declared rational scalar slots permit up to 5000 ASCII
characters. These caps are checked before JSON encoding; exact encoded size is
checked before a document is accepted. Derived arithmetic uses the unchanged
kernel's 8192-bit reduced and 16385-bit temporary profiles. A failure produces no
successful report prefix. This is not an OS wall-time or RSS guarantee.

The scientific digest binds protocol/source/implementation identities, input
scientific identities and the exact public scientific payload/access counts. For
an input with no scientific seal it binds that input's whole-file bytes instead.
It excludes usage, volatile upstream byte/content seals where a scientific seal
exists, and engineering/CI receipt identities; those remain in the content seal.
Original and reproduction modes share the registered-study scientific scope,
while synthetic scope stays distinct. The content seal binds the full document
except itself, including execution kind and supplied usage. Byte identity and
scientific-result identity therefore answer different questions.

Only whole-artifact digests, fixed text and aggregate results are admitted. There
are no free-text exception/source/path fields, membership arrays, original record
IDs, per-cell/token hashes or raw quantities. Derived threshold and aggregate
recorded-target statistics are explicitly labeled derived quantities and become
available only in the completed-evaluation projection. Aggregate output is not
a differential-privacy mechanism, evidence of specimen independence, or physical
truth attestation.

Focused synthetic tests run without import side effects:

```
python -m unittest discover -s tests -p 'test_mpea_study_report*.py' -v
```
