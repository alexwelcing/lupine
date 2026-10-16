# Projection workbench wrapper

Status: **G12 implemented; release verification is recorded separately**. The
[strict wire adapter](../src/lupine_discovery/projection_io.py) preserves the
original declarations through CLI, guarded HTTP, browser and replay. The
[Python projection adapter](../src/lupine_discovery/projection.py) implements
the translation and abstention rules. The
[projection-field design](projection-field-adapter.md) explains the scientific
premises, and the [coupled wire](coupled-problem.md) supplies the decision engine.

No new field fitting, discrepancy estimation, physical validation, solver, or
scientific benchmark is part of this interface. A user supplies a scoped
relation and its assumptions. The interface keeps those declarations visible;
it does not attest them.

## Why a wrapper is needed

A deterministic Python export of coupled JSON plus a relation sidecar is useful
for developer inspection. It does not satisfy this workbench requirement:
existing coupled verification cannot reconstruct the projection from a sidecar,
and the strict coupled schema has no structured fields for physical contexts,
observation maps, normalizations, source records, or bound bases. A relation
digest in a reference string identifies a sidecar without making it inspectable.

Use a distinct projection wrapper. Its parser constructs the existing
`ProjectionProblem`; `build_projection` remains the only relation translator.
When a finite model exists, prepare deterministic coupled JSON and delegate to
the existing coupled certificate/replay machinery. When no model exists, return
the adapter's explicit all-retained result without manufacturing numerical
input for the coupled engine. The original wrapper remains the decision input
through selection, verification, replay, and export.

## Input schema

Schema: `lupine.discovery.projection_problem.v1`.

The exact top-level keys are `schema`, `projection`, and `screening`, with only
`description` optional. `projection` contains the fields below. Every listed
field is required, including empty arrays/maps and explicit premise/basis
fields; Python constructor defaults are not wire defaults. Unknown keys,
duplicate JSON keys/IDs, unexpected types, and broken scope links are errors.
Outcome values and caller-supplied prepared models are not input fields.

| Record | Exact fields |
| --- | --- |
| `projection` | `scenario_id`, `objective_scope`, `constraint_scopes`, `blocks`, `observations`, `candidates`, `relation_reference`, `anchors`, `sources`, `premise_status` |
| Scope | `scenario_id`, `quantity`, `unit`, `reference` |
| Physical context | `scenario_id`, `material_id`, `composition_id`, `structure_id`, `operating_conditions_id` |
| Field scope | `context`, `model_id`, `model_version`, `observation_family`, `reference_method`, `descriptor_id` |
| Field block | `block_id`, `scope`, `parameter_ids`, `parameter_units`, `offset`, `matrix`, `latent_ids`, `latent_bounds`, `parameterization_reference`, `field_bound_reference`, `source_ids`, `premise_status`, `field_bound_basis` |
| Observation | `observation_id`, `block_id`, `field_scope`, `source_scope`, `nominal`, `weights`, `discrepancy_radius`, `bound_reference`, `source_ids`, `bound_basis`, `premise_status` |
| Quantity use | `observation_id`, `scale`, `offset`, `output_scope`, `conversion_reference`, `source_ids` |
| Candidate | `candidate_id`, `context`, `score`, `constraints` |
| Anchor | `anchor_id`, `observation_id`, `source_scope`, `interval`, `reference`, `source_ids`, `premise_status` |
| Source identity | `source_id`, `reference`, `source_uri`, `sha256` |
| `screening` | `consistency_point`, `proofs`, `limits` |

`constraint_scopes` maps constraint keys to Scope records; candidate
`constraints` maps exactly those keys to QuantityUse records. `score` is a
QuantityUse with output quantity `score`; the objective is already normalized
to minimization. All output constraints mean `g <= 0`. `blocks`, `observations`,
`candidates`, `anchors`, and `sources` are arrays of their corresponding records.

Vectors are arrays of exact scalars. `matrix` is an array of row vectors.
An interval is exactly `[lower, upper]`. Each `latent_bounds` entry is an interval
or explicit `null`; `discrepancy_radius` is a nonnegative exact scalar or `null`.
Anchor `interval` is finite; unavailable anchor information is represented by
not declaring that anchor, not by inserting guessed endpoints. The source hash
is a lowercase SHA-256 string or `null`. No source path or URI is dereferenced.

The only premise values are `assumed_unverified` and `unsupported`.
Both `field_bound_basis` and observation `bound_basis` explicitly use
`declared_bound`, `empirical_residual`, or `missing`. The field's
`parameterization_reference` describes the common image `theta = b + S z`;
`field_bound_reference` describes the finite enclosure. Neither supplies the
other. A finite numeric interval accompanied by `empirical_residual` or
`missing` remains unsupported. A hash, source link, or `declared_bound` label
does not establish physical validity.

Exact number syntax follows the coupled wire: safe JSON integers or quoted
integer/rational/finite-decimal strings; no floats, booleans, exponents,
whitespace-padded numbers, infinities, or nonpositive rational denominators.
Rational outputs are reduced strings. Counts and limits remain bounded integers.

The parser enforces the Python adapter's complete context equality, field-scope
equality, quantity-scope equality, source links, dimensions, and target keys.
It never infers transfer between materials from shared names or arrays. The
whole quantity transformation is `scale * observation + offset`; a negative
scale must transform field and discrepancy coefficients as well as the nominal.
Unsupported nonlinear maps are not silently linearized.

## First-version screening and proof policy

`screening.proofs` must be the literal empty array. A nonempty array is an
explicit unsupported-input error, even if a proof would be valid for the
coupled kernel. Do not discard, reinterpret, or report such input as verified.
This first interface uses only the kernel's existing automatic certificates.
External projection proof ingestion and a projection-domain export command are
not part of v1. The kernel still constructs the exact original P and requested
Qx domains internally, and accepted automatic certificates retain their domain
IDs and complete expressions/multipliers.

`consistency_point` is `null` or an exact vector in the generated coordinate
order: sorted block ID, then each block's declared local latent order, followed
by one discrepancy coordinate for each sorted observation ID. A zero-radius
observation still has its own discrepancy coordinate. An empty vector is a
supplied zero-dimensional point, distinct from `null`.

`limits` has exactly `max_operations`, `max_certificate_terms`,
`max_integer_bits`, and `max_witness_pairs`, using the coupled profile ceilings
listed below. It may only lower those ceilings. Unsupported bounds/premises
cannot be repaired by a consistency point. A point also does not repair an
inconsistent model, attest a reference, or establish a physically actual world.

## Deterministic preparation and identity graph

Use existing canonical JSON hashing and type-sensitive receipt comparison.
Identity is content binding, not a signature or physical attestation.

```text
original projection wire W
  |-- problem_digest = digest(W)
  `-- strict parse --> ProjectionProblem
        |-- adapter_input_digest = build.input_digest
        `-- build_projection --> full relation_record
              |-- relation_digest = build.relation_digest
              |-- unsupported: no model, no derived coupled identities
              `-- finite: CoupledProblem + coordinate/anchor maps
                    |-- kernel_model_digest, P domain_id, Qx domain_ids
                    `-- deterministic coupled wire C + same point/limits
                          |-- derived problem_digest / instance_digest
                          `-- coupled certificate
projection receipt binds W identity, relation, preparation and actual selection
  `-- certificate_digest = digest(receipt excluding certificate_digest)
separate outcomes bind the outer problem_digest and certificate_digest
```

The wire digest preserves accepted scalar spelling/types and array order;
the adapter normalizes immutable records and exact arithmetic. Different wire
spellings may therefore share an adapter/model identity while retaining distinct
outer input identities. All original source/context/reference declarations are
preserved in `relation_record.declarations`, even if they have no effect on the
kernel coefficients. Description, point and limits remain bound by the outer
problem digest.

For finite preparation, construct C without accepting a caller-authored copy:

- Use `lupine.discovery.coupled_problem.v1` and the generated model's scenario,
  candidate expressions, output scopes, latent order/bounds, and anchor rows.
  Serialize generated rationals as reduced strings and records in the adapter's
  deterministic order.
- Every latent has unit `1` and reference
  `projection_relation:<relation_digest>;coordinate:<index>`. The full physical
  normalization remains in the outer relation record.
- Each generated anchor row has its anchor's source unit and reference
  `projection_relation:<relation_digest>;anchor:<anchor_id>`. Keep the complete
  original anchor/reference record in the outer relation.
- `common_world` has the existing common-vector claim, premise
  `assumed_unverified`, basis `bounded_error_model`, and reference
  `projection_relation:<relation_digest>`. It is created only from a finite
  successful adapter build, never as a user-controlled upgrade.
- Copy the exact screening point and requested limits; set proofs to `[]` and
  omit description. Any change to relation metadata changes this derived wire
  identity through its relation references, even when the mathematical domain
  identity is unchanged.

Verification must rerun parsing, preparation, and screening from W. A supplied
receipt's prepared problem, relation record, or nested coupled certificate is
never trusted as a substitute. A profile/engine/adapter version mismatch fails
verification explicitly. No identity edge is obtained from outcome data.

## Certificate shape

Schema: `lupine.discovery.projection_certificate.v1`. Required fields:

| Field | Content |
| --- | --- |
| `engine_version`, `adapter_version`, `profile_id` | Executed implementation and fixed profile identities; initial adapter version `projection-adapter-v1`, profile `projection-local-v1` |
| `scenario_id`, `problem_digest`, `certificate_digest` | Outer scenario and sealing identities |
| `projection` | Exactly `build_status`, `input_digest`, `relation_digest`, `relation_record`, `reasons`; preserve every adapter reason |
| `prepared_problem` | Deterministically generated coupled wire, or `null` when no model exists |
| `coupled_certificate` | Actual existing coupled certificate, or `null` when no model exists |
| `selection` | Exactly the coupled selection keys: `retained`, `certified_feasible`, `interval_infeasible`, `interval_dominated`, `coupled_infeasible`, `coupled_dominated`, `dominance_witnesses` |
| `status` | Adapter abstention status if no model; otherwise actual coupled screening status |
| `execution` | Exactly `requested_limits`, `effective_limits`, `kernel_operations_used`; zero kernel operations when no model is constructed |
| `assumptions`, `physical_attestation` | Common-world, finite-universe and incomplete-search boundaries; physical attestation always `not_established_by_this_program` |

For finite builds, `selection` must equal the nested coupled certificate's
selection, not its box diagnostic. Its accepted proofs, consistency check,
model/domain identities and marginal diagnostics remain in the nested receipt.
For no-model abstention, retain every original candidate ID in sorted order;
all feasibility/exclusion arrays and the witness map are empty. Both prepared
and coupled fields are `null`. Do not create empty-parameter, zero-radius,
zero-score, or arbitrarily wide finite stand-ins merely to reuse a renderer.
There is no operational incumbent, regret bound, or optimality certificate.

Missing/rejected/limited consistency on a finite model still uses the existing
coupled all-retained state. With no supplied proofs, v1 does not promise to find
a contradiction for P: a rejected point alone means consistency is unresolved,
not proved impossible. Boundaries on scientific validity remain unchanged.

## Separate outcomes, including no-model abstention

Outcome schema: `lupine.discovery.projection_outcomes.v1`. Required keys are
`schema`, `scenario_id`, `problem_digest`, `certificate_digest`, and `outcomes`;
only `latent_world` is optional. Rows are exactly `{id, score, constraints}`.
Values are exact scalars or `null`; missing rows/constraint keys remain unknown.
IDs and constraint keys must belong to the original projection universe. Values
refer to the final output quantity scopes, after the declared scale/offset.
Reject duplicates and stale seals.

`latent_world`, if supplied, is exactly
`{kind: "hypothetical_model_world", point: [...]}` in generated normalized
coordinate order. Its shape and numeric syntax are validated even when the
adapter abstains. It is outcome-only evidence, never a new screening point.

Replay must seal the entire projection decision before opening/decoding separate
outcomes, including the no-model path. Bind outcome seals to the **outer**
problem/certificate digests before constructing any internal coupled outcome
view. The original outcome document is retained for its own digest; internally
rebinding already validated values to the nested coupled decision is an explicit
implementation step, not permission to accept stale outer seals.

Replay schema: `lupine.discovery.projection_replay.v1`, with exactly
`schema`, `engine_version`, `problem_digest`, `certificate_digest`,
`outcomes_digest`, `decision`, `outcome_audit`, `provided_world_audit`,
`diagnostics`, `physical_attestation`, and `replay_digest`. `decision` contains
the full outer certificate and its actual selection. `replay_digest` seals all
other replay fields.

- `outcome_audit` always evaluates directly supplied truth against the actual
  retained IDs, using the coupled audit's definitions. Full-universe optimum,
  all tied minimizer IDs and retention claims require every score/constraint
  for every candidate. Empty/no-feasible universes have undefined retention.
  This needs only the original candidate/constraint scope, not a fabricated
  numerical model. Complete retention during abstention is possible but is no
  evidence of useful screening or accurate modeling.
- For a finite model, `provided_world_audit` and marginal diagnostics use the
  existing coupled semantics. A point can match complete or partial reported
  values; its failure does not prove no other point fits. Marginal coverage is
  not common-world support and does not validate discrepancy premises.
- For no model, `provided_world_audit.status` is
  `unavailable_no_prepared_model`, with `point_supplied`,
  `all_quantities_reported`, `checked_quantity_count: 0`, `point_check: null`,
  `mismatches: []`, `common_world_existence: "not_evaluated_no_prepared_model"`,
  and `scientific_validity: "unestablished"`. Empty mismatches do not mean a
  fit. `diagnostics.marginal_coverage` is
  `{status: "unavailable_no_prepared_model", per_candidate: {},
  score_coverage: null, constraint_coverage: null,
  common_world_validity: "not_established"}`; its box selection is `null`.
  No finite coverage, compatibility or regret claim is available.

For both paths, `diagnostics` has exactly `marginal_coverage` and
`box_selection_diagnostic`. A later outcome point or successful retention audit
must never change the original preparation, reasons, status, or retained pool.

## Preflight before adapter expansion

The pure Python API is not the HTTP boundary. Apply a fixed
`projection-local-v1` profile to raw wire and direct dictionary callers before
Fraction conversion, dataclass construction, copying/hashing full relations,
or building generated vectors/rows. Never truncate to fit a limit.

| Resource | v1 ceiling |
| --- | --- |
| Document / JSON nesting / nodes | 256 KiB UTF-8 / depth 24 / 65,536 nodes |
| Candidates / constraint keys | 64 / 8 |
| Blocks / parameters per block / local latents per block | 16 / 16 / 16 |
| Observations / anchors / source records | 16 / 32 / 128 |
| Expanded coordinates D | `sum(len(block.latent_ids)) + len(observations) <= 16` |
| Expanded explicit rows | `2 * len(anchors) <= 64` |
| Structural IDs | 40 characters for candidate, block, parameter, local-latent, observation, anchor, source and constraint IDs; generated IDs must also fit the coupled 128-character ceiling |
| Scope/context identifiers and unit strings / references and URIs | 128 / 2,048 characters |
| Rational strings / total numeric tokens | 512 characters / 16,384 tokens |
| Exact input magnitudes | At most 512 bits per numerator/denominator after bounded lexical parsing |
| Supplied proofs | Exactly zero |
| Requested kernel ceilings | 100,000 operations; 512 certificate terms; 2,048 checked integer bits; 4,096 candidate pairs |
| HTTP worker | Shared nonblocking worker slot; 5 CPU seconds, 10 wall seconds, 256 MiB address space, 2 MiB output |

The raw certificate cap is 2 MiB. `/api/verify` alone allows a 14,156,800-byte
outer envelope so JSON escaping can carry a bounded 256 KiB problem and 2 MiB
certificate. Other HTTP envelopes remain limited to 2 MiB. Separate document
caps are checked after decoding. CLI and browser export coupled/projection
receipts as compact JSON to preserve round trips at the byte boundary; the
original problem download retains its exact submitted text.

Count D using array lengths before expansion, including zero-radius observations
and unsupported/missing-bound records. Validate matrix/vector dimensions and
bounded link sets before arithmetic. Count every normalization, weight,
conversion, bound, anchor and point scalar. Validate generated derived input
against the existing coupled structural/byte/magnitude profile as well. Exact
adapter arithmetic can produce larger integers than its inputs; an oversized
derived wire is a resource/input-profile error, not a reason to round it.

Use the existing outer CLI/HTTP byte/depth guards and extend the isolated worker
dispatch explicitly for the projection schemas. The HTTP wrapper must not call
the pure adapter in the server process before entering the guard. The existing
slot is shared with coupled work; do not create a second unaccounted parallel
worker allowance. A hard time/memory/output failure yields a structured error
and **no decision receipt**. Completed proof-work abstention/partial screening
remains a different state. Unsupported guard platforms refuse HTTP execution.
No URI retrieval, source-file reads, background fitting, or automatic storage
of uploaded data is permitted by this route.

## Workbench and export behavior

Retain the exact submitted raw wrapper in application state. A prepared coupled
problem is a display view, never a replacement for the user's original input.
Display the original context and field scope, parameter units and `b/S`
normalization, observation weights, whole-expression conversions, discrepancy
radius/basis/reference, anchor intervals, and source identities. Render metadata
as text. A source hash may be displayed as declared identity; no checked-source
or physical-validation badge follows merely from its presence.

Reuse the coupled selection/proof panels for finite builds and add a relation
panel above them. No-model builds show all retained IDs, every adapter reason,
and unavailable model/coverage/point-audit states; their relation panel remains
fully inspectable. Keep assumption acceptance, mathematical consistency, and
scientific validity distinct. Input edits invalidate the previous receipt and
outcome binding; resource failures clear pending/stale displayed decisions.

Provide exports for the unchanged original projection problem, the complete
projection certificate, and the complete replay when available. A separately
requested bare coupled export must be labeled a derived mathematical artifact
that does not carry the complete original projection declaration; it is not the
default certificate or replay export. Verification from the original wrapper
and exported receipt must preserve source/scope-only changes as identity changes.

Before G12 implementation is called complete, require focused checks for
metadata-only tampering, missing/empirical bounds, whole-universe fallback,
scope/unit/sign transformations, duplicate/oversized/expansion inputs, explicit
proof rejection, no-model complete/partial outcomes, deferred truth loading,
outcome-point nonrepair, false-common-world loss despite marginal coverage,
worker failures, and desktop/mobile export re-verification. Those checks are
engineering obligations, not a new scientific evaluation or preregistration.
