# Proposed coupled workbench contract

Status: **design only**. This document specifies a small adapter around the
existing [pure kernel](coupled-kernel.md); it implements no parser, CLI command,
HTTP route, catalog case, or UI mode. The current 19 built-in cases remain
unchanged. No archived scientific result or physical claim changes.

The first adapter should expose conservative screening with shared affine
uncertainty, explicit proof checking, and separate outcome auditing. It should
not add an optimizer, infer coupling from correlations, decide every candidate's
possible optimality, or promote a feasible model point into scientific evidence.

## The claim that must remain visible

One **common** latent vector in the declared domain must represent **all** actual
candidate scores and constraints in this scenario. This is an assumption about
the material model. A checked rational point proves only that the mathematical
domain is nonempty. These are distinct facts and require distinct UI labels.

Operational screening requires both the kernel's accepted assumption mode and
a checked common-domain consistency point. Unsupported assumptions, a learned
correlation basis, missing/rejected/unchecked consistency, and proved model
inconsistency retain the entire input universe. The box selection derived from
that same model remains a diagnostic, even when it is much smaller.

## Strict input and identity

Proposed problem schema: `lupine.discovery.coupled_problem.v1`.

Required top-level fields are `schema`, `scenario`, `latent_variables`,
`candidates`, `rows`, `common_world`, and `screening`. Only `description` is
optional. Reject unknown fields at every level, duplicate JSON object keys,
duplicate IDs, and dimension or scope mismatches. Outcomes are never a problem
field. All objectives are explicitly normalized to minimization; all constraints
mean `g <= 0`.

```json
{
  "schema": "lupine.discovery.coupled_problem.v1",
  "scenario": {
    "id": "coupled-shared-trend",
    "objective": {
      "direction": "minimize",
      "unit": "synthetic utility",
      "reference": "constructed example"
    },
    "constraints": {}
  },
  "latent_variables": [
    {"id": "t", "bounds": ["0", "2"], "unit": "1", "reference": "dimensionless normalized fixture coordinate"}
  ],
  "candidates": [
    {"id": "A", "score": {"coefficients": ["1"], "constant": "1"}, "constraints": {}},
    {"id": "B", "score": {"coefficients": ["1"], "constant": "0"}, "constraints": {}}
  ],
  "rows": [],
  "common_world": {
    "claim": "one_common_latent_vector_represents_all_quantities",
    "premise_status": "assumed_unverified",
    "relation_basis": "declared_affine_assumption",
    "reference": "synthetic assumption, not measured evidence"
  },
  "screening": {
    "consistency_point": ["0"],
    "proofs": [],
    "limits": {
      "max_operations": 100000,
      "max_certificate_terms": 512,
      "max_integer_bits": 2048,
      "max_witness_pairs": 4096
    }
  }
}
```

The example is valid under this **proposed** schema, not an input currently
accepted by the CLI. An affine record always has exactly `coefficients` and
`constant`, with one coefficient per latent in the declared order. Constraint
specifications reuse the existing `{unit, reference}` shape. Each candidate uses
exactly those constraint keys; `score` is reserved. A coupling row has exactly
`{id, coefficients, upper, unit, reference}` and means
`coefficients · z <= upper`. User row IDs beginning with `@` are forbidden.

Latent coordinates are dimensionless and normalized: each latent `unit` must be
the literal `"1"`, and its reference describes the normalization. A coefficient
and constant in a candidate's affine quantity carry that quantity's declared
unit. Latent normalization descriptions and row units/references are declared
metadata; the adapter binds them into identity but does not prove dimensional
physics or the scientific justification of a relation. No citation lookup or
provenance attestation is implicit. Approximate relations or normalizations need
explicit bounded error coordinates rather than rounded coefficients presented
as exact laws.

`common_world.claim` has only the literal value above. Permitted premise statuses
are `assumed_unverified` and `unsupported`; permitted bases are the kernel's
`declared_affine_assumption`, `bounded_error_model`, and `learned_correlation`.
There is no input value meaning “scientifically verified.” A learned-correlation
basis always closes the operational gate. `consistency_point` is `null` or an
exact vector. An empty vector is a valid explicit point for dimension zero and
must not be confused with a missing point.

Exact scalars accept JSON integers within the browser-safe integer range, or
strings containing an integer, rational with positive denominator, or finite
decimal. Reject numeric floats, booleans, NaN/infinities, zero denominators,
whitespace padding, and exponent notation in this first wire version. Require
quoted strings for larger integers. Apply lexical-size limits before `Fraction`
construction; serialize every rational result as a reduced rational string.
Bounded counts and work limits remain JSON integers. An illustrative chart may
approximate positions but must display exact endpoints and never make decisions.

Use four identities without conflating them:

| Identity | Bound content |
| --- | --- |
| `problem_digest` | Existing canonical JSON digest of the complete accepted wire input, including the ordered supplied proofs, consistency point, requested limits, and optional description |
| `instance_digest` | Digest of the wire projection `schema, scenario, latent_variables, candidates, rows, common_world`; excludes `screening` and `description` to avoid self-referential proof seals |
| `kernel_model_digest` | The current kernel's normalized `CoupledProblem` digest, exposed separately rather than renamed into a wire-input identity |
| `domain_id` | Kernel identity of `P` or the particular `Qx`, including the original model, latent coordinates, and generated rows |

Wire digests retain accepted numeric spelling/type through the existing canonical
JSON convention; mathematical equivalence need not imply equal wire identity.
Object-key order does not matter, while array order does. In particular,
reordering proofs or changing limits can change which exclusions are established
before a work budget expires, so it changes the sealed decision input. Changing
a latent unit or row reference changes `instance_digest`, even though those
annotations are outside the pure kernel's normalized model. No hash proves truth.

## Supplied certificates and domain discovery

`screening.proofs` is an ordered array of tagged records with unique local `id`
labels. Each record includes the exact `instance_digest`. Labels are for audit
navigation; the complete normalized certificate also has a digest.

- An `infeasibility` record contains `id`, `kind`, `instance_digest`,
  `candidate_id`, `domain_id`, and `multipliers`. `candidate_id: null` explicitly
  targets common domain `P`; a candidate ID targets exactly that candidate's
  `Qx`. Both the selector and domain identity must agree. A contradiction for
  `P` reports inconsistent premises, never an infeasible material universe.
- A `dominance` record contains `id`, `kind`, `instance_digest`, `candidate_id`,
  `witness_id`, `feasibility`, and `improvement`. Its latter two fields map to the
  existing `DominanceCertificate` structure. Every nested upper-bound record is
  exactly `{domain_id, expression, upper, multipliers}`. The feasibility map
  contains exactly the witness's constraint keys; the improvement expression is
  exactly `score_witness - score_candidate`. All nested bounds use that excluded
  candidate's original `Qx`.

Multipliers are a sparse map from row IDs to exact nonnegative rationals;
omission means zero. Empty multipliers can prove a constant bound. A claimed
improvement upper bound of zero does not exclude a tie. Proofs never add domain
rows, redefine the objective, shrink the original universe, or supply their own
trusted solver status. Preserve rejected and unresolved proof assessments.

Well-formed but stale domains, wrong candidate scopes, negative multipliers, or
false proof arithmetic yield a recorded rejection and no exclusion. Invalid wire
shapes or non-exact inputs reject the request. When the kernel closes a premise
or consistency gate before reaching a supplied candidate proof, the adapter must
mark it `not_checked` with the gate reason; it must not invent a successful check.
The kernel's `verified`, `rejected`, `not_applicable`, and `unresolved` outcomes
otherwise retain their meanings.

An instance-envelope mismatch is recorded as `rejected` before any kernel proof
execution. Preserve each supplied proof's zero-based `input_index` and external
`id` in every adapter assessment, including envelope rejection and gate-skipped
`not_checked` results. Do not match assessments only by candidate or witness ID:
multiple supplied proofs can target the same pair with different content.
Repeated normalized proofs under different local IDs still have distinct input
occurrences. Join them by execution occurrence and input index, never by a
digest-only map that overwrites an earlier entry. Preserve the kernel's current
ordering: common-domain contradiction checks precede candidate-specific proofs;
within each phase the relevant input order matters. A proof skipped after an
earlier contradiction is not retroactively verified by that earlier result.

The selected integration design uses a dedicated read-only CLI command to make
external proof generation practical without a circular seal:

```sh
lupine-discovery coupled-domains problem.json --output domains.json
```

It would emit `lupine.discovery.coupled_domains.v1`, the wire instance and kernel
model digests, `P`, and every candidate's `Qx`, including exact row IDs and rows.
It builds no exclusion and reads no outcomes. Users first request domains with
an empty proof list, then insert their separately generated proofs. The instance
and domain identities remain unchanged; the complete `problem_digest` changes.
Domain construction is subject to the same preflight and execution limits as
selection. This command is part of the chosen proposed contract, not an existing
CLI capability.

## Selection receipt, CLI, and verification

Existing `select`, `verify`, and `replay` commands should dispatch on the new
schema. Existing scalar, calibrated, and Pareto behavior remains separate. No
new top-level mode silently transforms the input into independent intervals.

Proposed receipt schema: `lupine.discovery.coupled_certificate.v1`.

| Receipt field | Required meaning |
| --- | --- |
| `engine_version`, `scenario_id`, `problem_digest`, `certificate_digest` | Same sealing conventions as current receipts; the certificate digest excludes only itself |
| `model_identity` | `instance_digest`, `kernel_model_digest`, and common `domain_id` |
| `common_world` | Echo the declared premise and relation basis; keep scientific validity `unestablished` |
| `coupling` | Actual kernel `coupling_status` and complete consistency `CheckResult`; echo the supplied point separately, never as an outcome |
| `selection` | Actual retained IDs, globally certified-feasible IDs, four interval/coupled exclusion categories, and coupled witness IDs |
| `exclusion_certificates` | Complete accepted typed certificates, with candidate/domain binding and exact expressions/multipliers |
| `proof_assessments` | All supplied-proof dispositions plus actual automatic assessments; include source, supplied index/ID where applicable, digest, domain, reason, and work count |
| `execution` | Profile ID, ordered supplied-proof digests, requested/effective limits, and measured kernel operations used |
| `diagnostics` | Derived marginal intervals and `box_selection_diagnostic`, explicitly outside the operational selection when the gate is closed |
| `assumptions`, `physical_attestation` | Common-world premise, finite-universe scope, incomplete search, and `not_established_by_this_program` |

Do not expose a coupled operational incumbent, scalar regret bound, robust
optimality flag, or possible-optimum certificate: this kernel does not return
those claims. In particular, a witness feasible on `Qx` must not be labeled
globally feasible over `P`. Any incumbent or regret field inherited from the box
selector stays inside the clearly labeled diagnostic object in this version.

`verify` must reparse the exact problem, reconstruct domains, rerun with the
same ordered proofs/point/limits and profile, and compare type-sensitive
canonical receipt identities. Python equality alone is insufficient because
`True == 1`. A mismatched engine/profile version is an explicit verification
failure or unsupported-version result, never silently accepted equivalence.
Verification establishes identity and executable recomputation, not physical
validity or formal refinement of Python from Lean.

## Separate outcomes and common-world auditing

Proposed outcome schema: `lupine.discovery.coupled_outcomes.v1` with exactly
`schema`, `scenario_id`, `problem_digest`, `certificate_digest`, and `outcomes`;
optional `latent_world`. Each outcome row is `{id, score, constraints}`, with
exact scalar strings/integers or `null` for unknown values. Missing rows or
constraint keys are also unknown; unknown IDs/keys and duplicates are rejected.

`replay problem.json outcomes.json` must seal the actual coupled selection
**before opening or parsing the outcome payload**, then validate both outcome
digests. The same order applies to a later built-in reveal route. Changing a
proof, consistency point, limit, premise, or scope invalidates an outcome seal.
Never rerun the independent interval selector and call its pool the coupled
decision. Never insert an outcome-provided latent point into screening.

Proposed replay schema: `lupine.discovery.coupled_replay.v1`. Separate the report
into `decision`, `outcome_audit`, `provided_world_audit`, and `diagnostics`:

- `decision` binds the original certificate and actual retained/excluded IDs.
- `outcome_audit` evaluates actual supplied scores and constraints directly. It
  reports completeness, per-candidate observed feasibility, complete-case true
  feasible optimum and all exactly tied minimizers, retained/lost optimum IDs,
  and `all_true_minimizers_retained`. The last three full-universe claims are
  `null` until every declared quantity for every candidate is known. If complete
  truth contains no feasible candidate, optimum retention is undefined, not a
  vacuous success. Failed exclusions remain visible. Retaining all candidates
  can pass retention without demonstrating any screening benefit.
- `provided_world_audit` is absent/unavailable unless the outcome file supplies
  `latent_world: {"kind": "hypothetical_model_world", "point": [...]}`. Check
  that point against `P`, then compare affine evaluations with every available
  observed quantity. Record checked quantity count and every mismatch. A valid
  point with no outcomes is only model consistency. A valid point matching all
  complete recorded values establishes compatibility of those finite recorded
  values with that point; it does not establish physical truth, future validity,
  or observational provenance. A failing point does not prove that no other
  common point can fit the observations. No latent-point solver is added.
- `diagnostics` may audit marginal box coverage. Full marginal coverage does
  **not** establish a common world. Keep operational and diagnostic retention
  separate, especially when premise gating retains the whole universe.

Use explicit statuses such as `not_supplied`, `provided_point_outside_domain`,
`provided_point_matches_reported_values`, `provided_point_mismatch`, and
`unresolved_by_work_limit`. Separately record whether all quantities were
reported. Do not reuse `supported_on_complete_finite_archive` as a blanket label
for affine/common-world validity merely because marginal intervals covered the
archive. The selection-time consistency point and the optional outcome-world
point are different input roles even if their numeric values happen to agree.

## Workbench states and three proposed demonstrations

Expose the original affine expressions, latent bounds, coupling rows, premise
reference, model-consistency result, and exact proof assessments. A retained
candidate is unresolved, not necessarily a possible minimizer. Preserve raw
uploaded JSON when submitting or exporting; derived box intervals are a view,
never a replacement problem with a different seal.

| Kernel state | Main view | Diagnostic treatment |
| --- | --- | --- |
| `conditional_screened` | Conditional coupled pool, with exact exclusion witnesses | Separate box pool for comparison; no scientific improvement claim |
| `conditional_partially_screened` | Conditional partial screening; keep every candidate not validly excluded; expose budget reason | Do not describe search as complete |
| `unsupported_all_retained` | Screening withheld; all original IDs retained; no operational feasibility/exclusion claims | Collapsed and labeled model-derived box diagnostic |
| `consistency_unresolved_all_retained` | Model consistency unestablished; all IDs retained; distinguish missing, rejected, and limited point checks | A smaller box pool must not replace the actual pool |
| `proved_inconsistent_all_retained` | Model premises inconsistent; all IDs retained | Never “no materials are feasible” |

The consistency display must say “exact point in the mathematical domain,” not
“confirmed physical world.” The common-world premise remains separately labeled
assumed/unverified or unsupported. Use “feasible whenever A is feasible” for a
conditional witness over `QA`. Empty/unknown results and resource failures have
text labels, not only colored badges. Desktop and mobile tables retain exact
strings, labeled scopes, accessible proof details, and exportable receipts.

Propose these **three** initial synthetic demos; the edits below are exact
transformations of the complete JSON example above, not current catalog entries:

| ID / input | Expected operational state and pool | Separate known outcomes |
| --- | --- | --- |
| `coupled-shared-trend`: example unchanged | Verified model point; box retains A/B, coupled pool retains B; automatic strict improvement is `-1` | Scores A=`1`, B=`0`, empty constraints; optional outcome-world point `["0"]` matches these constructed values |
| `coupled-missing-point`: change scenario ID; A's constant to `3`; `consistency_point` to `null` | Whole universe A/B retained; box diagnostic alone would retain B; no operational exclusion or feasibility claims | Scores A=`3`, B=`0`; retention succeeds trivially, screening remains withheld; an outcome-world point must not repair the prior decision |
| `coupled-learned-relation`: change scenario ID; A's constant to `3`; `relation_basis` to `learned_correlation`; keep supplied point `["0"]` | Unsupported whole-universe retention A/B, even with a point present; the kernel may not check that point after closing the premise gate | Scores A=`0`, B=`2`; true optimum A is retained. This deliberately unsound model is a synthetic scope/failure control, not predictive accuracy |

Generate actual instance, domain, receipt, and outcome digests after adapter
implementation; never insert fabricated digest placeholders into runnable
fixtures. No output above is a claim that the proposed wire parser was executed.

Necessary regression variants do not require more initial UI cases:

- Keep the first model and its selection-time point, but supply observed scores
  A=`1`, B=`2`. Both box intervals contain these values; coupled screening loses
  actual optimum A. The common affine relation is false for this recorded
  example. Replay must expose the loss despite mathematical consistency and
  marginal coverage, and must not silently substitute the point's model values.
- Add independent bounded errors at the documented tie threshold: a proved
  improvement upper bound of exactly zero must retain both possible ties.
- Give a verified contradiction for `P` versus a candidate-bound contradiction
  for `Qx`: only the latter can exclude a candidate once the common gate passes.
- Supply a proof requiring a multirow combination the automatic producer does
  not discover. Record actual accepted/rejected/not-checked disposition and
  show the supplied proof separately from automatic search.

## Proposed limits before any HTTP exposure

The pure kernel's arithmetic counter does not cover parsing, normalization,
hashing, domain construction, or initial interval arithmetic. A work-limit field
alone is not an adequate web boundary. Start with one fixed local profile,
`coupled-local-v1`, and reject over-limit input rather than silently truncating it:

| Resource | Proposed initial ceiling |
| --- | --- |
| Coupled input document | 256 KiB UTF-8, including proofs; apply the existing outer HTTP cap as well |
| JSON nesting / scalar string | Depth 24 / 512 characters before rational conversion |
| Candidate count / latent dimension / constraints | 64 / 16 / 8; zero latents and zero constraints are valid |
| Additional coupling rows / supplied proofs | 64 / 64 |
| Total rational tokens / supplied multiplier entries | 16,384 / 4,096 across the whole document |
| Input numerator/denominator magnitude | At most 512 bits each after exact parsing; bounded lexical form checked first |
| Kernel work ceilings | 100,000 operations; 512 terms per certificate; 2,048-bit checked arithmetic; 4,096 attempted witness pairs |
| Worker / response | One coupled worker at a time; proposed 5 CPU seconds, 10 wall seconds, 256 MiB address-space limit where enforceable, and 2 MiB response cap |

These are conservative **proposed engineering limits**, not measured performance
guarantees. Profile values need adversarial measurement before enabling a route.
Requested kernel limits may only lower these ceilings; reject higher requests.
Reject IDs/references that are empty or over a documented bounded string length
(proposed 128 / 2,048 characters). Count nested feasibility certificates in term
and token totals. Check body/token/depth limits before expensive conversion and
recursive traversal; do not depend on a post-`Fraction` size check. Ensure the
generic `/api/select` dispatcher cannot bypass the coupled preflight limits.

The selected shared boundary is layered: every CLI input and outer HTTP request
first has a 2 MiB byte cap and a quote-aware depth-32 predecode check. Generic
JSON decoding may precede coupled-schema dispatch within that boundary. The
coupled adapter then applies its 256 KiB/depth-24/full structural profile before
rational conversion or model normalization, including for direct dictionary
callers. This does not claim that the stricter 256 KiB ceiling applies before
every generic JSON decode. The uniform CLI ceiling is an intentional new
restriction, matching the existing outer HTTP body limit. HTTP coupled parsing
and computation remain inside the guarded worker after generic dispatch.

Use a separate worker for the uncharged construction/hashing work as well as
proof checking. Kill the worker on hard time/memory/output limits, discard partial
output, and return a structured resource error with **no valid receipt**. The UI
clears pending results and offers a smaller input/lower search budget; it does
not render a stale certificate as the new result. A completed kernel result with
an unresolved proof-work assessment is different: it can preserve earlier verified
exclusions, or retain all IDs if consistency was not established. If the runtime
cannot enforce the chosen execution boundary, refuse the new HTTP mode until an
equivalent guard exists; never silently execute it in the server process.
Continue loopback binding, same-origin guards, no network
lookups, and no automatic storage of uploaded problems or outcomes.

## Decisions still needing kernel/backend coordination

1. **Identity normalization:** freeze the exact wire projection and versioned
   profile before storing receipts. The dedicated `coupled-domains` CLI is the
   selected design; its manifest must preserve original domains and avoid
   proof-seal circularity. Backend conformance tests must pin exact identities.
2. **Proof assessment joins:** implement the chosen index/ID-preserving mapping,
   pre-kernel rejection of wrong instance envelopes, and explicit gate-skipped
   `not_checked` results. Do not assign “verified” to a supplied proof merely
   because an automatic proof later excludes the same candidate.
3. **Work enforcement:** measure the proposed ceilings, implement a guarded worker,
   and settle portable memory enforcement and shared-route preflight behavior
   before adding an HTTP mode. The current pure kernel's limits cannot supply
   these guarantees by themselves.
4. **Replay completeness:** the first wire version deliberately requires every
   declared quantity for full optimum claims. A later mathematically justified
   partial-truth rule or common-world feasibility solver needs separate design
   and tests; do not infer it from marginal coverage or one rejected point.
5. **Evidence scope:** typed scientific provenance and certified bounded-error
   models are future work. Plain reference strings and accepted relation-basis
   enums keep assumptions visible but do not establish them.

Before adding the mode to the interface, require strict-wire and stale-seal tests,
actual-pool replay tests, the false-common-world negative control, gate-closed
whole-universe tests, explicit-proof and tie tests, worker exhaustion checks, and
desktop/mobile export re-verification. Passing these engineering checks would
establish the behavior of this adapter on its tested inputs; it would not change
the open scientific validation obligations.
