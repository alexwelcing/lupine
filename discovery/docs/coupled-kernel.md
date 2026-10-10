# Exact conservative screening with shared affine uncertainty

`lupine_discovery.coupled` implements a pure Python certificate kernel for the
conservative part of the [coupled-evidence design](coupled-evidence-design.md).
It can remove candidates that independent score intervals cannot distinguish,
using exact shared-variable cancellation or supplied rational linear proofs.
It does not implement a general LP solver, complete possible-optimum search,
wire parsing or a workbench itself. The separate [coupled adapter](coupled-problem.md)
now supplies strict JSON/CLI and guarded HTTP integration. No scientific
benchmark result is changed by this addition.

All screening claims are conditional on a common latent vector representing the
actual quantities in the declared scenario. A checked feasible point establishes
that the mathematical model is consistent; it does not establish that this
model describes reality.

## Small executable example

```python
from lupine_discovery.core import Interval
from lupine_discovery.coupled import (
    Affine, CoupledCandidate, CoupledProblem, screen_coupled,
)
from lupine_discovery.evidence import Scope

problem = CoupledProblem(
    scenario_id="synthetic-shared-trend",
    latent_ids=("t",),
    latent_bounds=(Interval(0, 2),),
    objective_scope=Scope("synthetic-shared-trend", "score", "utility", "fixture"),
    constraint_scopes={},
    candidates=(
        CoupledCandidate("A", Affine((1,), 1), {}),  # t + 1
        CoupledCandidate("B", Affine((1,), 0), {}),  # t
    ),
)

result = screen_coupled(problem, consistency_point=(0,))
assert result.box_selection_diagnostic.retained == ("A", "B")
assert result.retained == ("B",)
assert result.exclusion_certificates["A"].improvement.upper == -1

# The same model without verified consistency cannot prune operationally.
assert screen_coupled(problem).retained == ("A", "B")
```

The score intervals `[1,3]` and `[0,2]` overlap. Their common variable cancels in
`score_B-score_A=-1`, supplying a strict exclusion witness. The returned proof
records the exact expression, bound, and candidate-specific domain; no sampled
objective values or outcome labels enter the decision.

## Public data model

All public records are frozen dataclasses. Sequences are copied to tuples and
maps to immutable snapshots. Exact scalar inputs accept `Fraction`, integers,
or rational/decimal strings; floats and numeric booleans are rejected.

| Type | Fields and meaning |
| --- | --- |
| `Affine` | `coefficients`, `constant`; represents their dot product with the shared latent vector plus the constant |
| `LinearRow` | `row_id`, `coefficients`, `upper`; represents a non-strict linear inequality |
| `CoupledCandidate` | `candidate_id`, `score`, `constraints`; every quantity is affine in the same coordinates |
| `CoupledProblem` | Scenario, latent IDs/bounds, objective and constraint scopes, candidates, optional coupling rows, premise status, and relation basis |
| `Domain` | Whole-problem digest, optional feasible-candidate ID, latent IDs, immutable rows, and computed domain identity |
| `UpperBoundCertificate` | Domain identity, exact affine expression, claimed upper bound, and nonnegative row multipliers |
| `InfeasibilityCertificate` | Domain identity, nonnegative row multipliers, and optional `candidate_id` (`None` means the common domain) |
| `DominanceCertificate` | Excluded candidate ID, witness ID, one upper-bound certificate per witness constraint, and an improvement certificate |
| `Limits` | Operation, certificate-term, exact-integer-bit, and candidate-pair limits |

Coefficients must have the declared latent dimension. Candidate IDs, latent IDs,
and row IDs must be unique; IDs and scope strings must be nonempty. Every
candidate must use exactly the problem's constraint keys. Quantity scopes must
match the declared scenario and their key; `score` is reserved for the objective.
All objectives are minimized and all constraints mean `g<=0`. Maps are
normalized in sorted key order, including constraints, scopes, and multipliers.
Equivalent mapping insertion orders therefore use the same arithmetic and
checking order, including when an intermediate resource limit is reached.

The kernel checks numeric dimensions and declared quantity scopes. It does not
infer dimensional physics, ingest citations, verify source provenance, or
establish whether a row is scientifically justified. The coordinate convention
is **dimensionless normalized latent variables**. Each quantity's affine
coefficients and constant carry that quantity's declared `Scope.unit`; linear
domain rows constrain the normalized coordinates. Latent IDs identify
coordinates, and their normalization and scientific interpretation must be
supplied and justified outside this arithmetic kernel. No physical unit
conversion or dimensional compatibility is inferred from an ID or unit string.

`premise_status` permits only `assumed_unverified` or `unsupported`. No input
flag upgrades a premise to established truth. The permitted `relation_basis`
values are `declared_affine_assumption`, `bounded_error_model`, and
`learned_correlation`. A learned-correlation declaration always disables
operational pruning in this route, even if its premise-status field says
`assumed_unverified`. Declaring an error model still does not prove its bounds.

## Domains and identity

`make_domain(problem)` constructs the common domain `P`. For each latent it adds
the two finite coordinate-bound rows, then the explicitly supplied coupling
rows. User row IDs beginning with `@` are forbidden; that namespace belongs to
generated rows.

`make_domain(problem, feasible_candidate_id="A")` constructs `QA`, the same
domain intersected with every constraint of candidate `A`. An affine constraint
`h^T z+k<=0` becomes the exact row `h^T z<=-k`. The row IDs are:

```
@box-lower:0, @box-upper:0, ...
@feasible:0, @feasible:1, ...
```

Feasibility rows follow sorted constraint keys. A certificate's domain identity
binds the complete normalized problem, the candidate defining the domain, all
latent IDs, and every row. Changing a unit, reference, candidate, affine
expression, coupling row, or original universe invalidates that identity. This
is normalized Python-model identity, not a claim about original JSON bytes;
the separate wire adapter also seals the complete original JSON and its scoped instance.

Every proof keeps the original universe and its original domains. If a witness
is later excluded, its earlier strict comparison remains meaningful. An
`A -> B -> C` exclusion chain can therefore be valid without shrinking the
domain when `B` is removed.

## Exact certificate checking

For rows `M_r z<=u_r`, `check_upper_bound(domain, certificate)` verifies:

```
lambda_r >= 0
sum_r lambda_r * M_r = expression.coefficients
sum_r lambda_r * u_r + expression.constant <= certificate.upper
```

`check_infeasibility(domain, certificate)` verifies:

```
lambda_r >= 0
sum_r lambda_r * M_r = 0
sum_r lambda_r * u_r < 0
```

Every sparse multiplier key must name a row in the exact bound domain; omitted
rows have multiplier zero. Negative multipliers, unknown rows, wrong dimensions,
and insufficient bounds are rejected. The contradiction inequality is strict:
`0<=0` does not prove infeasibility.

An infeasibility certificate must also name the domain's candidate:
`InfeasibilityCertificate(domain.domain_id, multipliers, candidate_id="A")`
for `QA`, or omit `candidate_id` for `P`. This explicit routing label is checked
against the domain identity; it cannot redirect a proof to another candidate.

`check_point(domain, point)` verifies an exact rational point against every row.
An invalid point is rejected; its failure does not prove the domain empty.

`check_dominance(problem, certificate)` reconstructs the domain `Qx` for the
specified excluded candidate. It checks that the certificate names actual
candidates, contains exactly the witness's constraint keys, proves the actual
witness constraints nonpositive, and proves the actual expression
`score_witness-score_x` has a **strictly negative** upper bound. Every nested
certificate must bind this same `Qx`. A proof about another candidate, another
expression, or another domain cannot be repurposed.

Feasibility is conditional on `x` being feasible: a valid witness need not be
feasible throughout `P`. Consequently such a witness does not automatically
appear in the result's global `certified_feasible` list.

The standalone checkers return `CheckResult` with status:

- `verified`: the requested arithmetic certificate is sound in the bound domain.
- `rejected`: invalid identity, shape, exact input, or proof arithmetic.
- `not_applicable`: a valid bound does not establish witness feasibility or a
  strict improvement; in particular, tied optima remain possible.
- `unresolved`: a stated checking budget prevented completion.

Standalone verification is not authorization for operational pruning. A bound
over an empty domain can be mathematically valid. `screen_coupled` applies the
separate common-premise and consistency gates before using exclusions.

## Screening, abstention, and explicit proofs

```python
screen_coupled(problem, consistency_point=None, proofs=(), limits=Limits())
```

Screening first computes an interval-box selection from exact affine ranges over
the declared coordinate box. This is recorded as `box_selection_diagnostic`.
It is not operational when the new model's premise or consistency gate is closed:
the box bounds came from that same model, not independently established input.

| `coupling_status` | Operational behavior |
| --- | --- |
| `unsupported_all_retained` | Unsupported premise or learned-correlation basis: retain all IDs and make no operational feasibility/exclusion claims |
| `consistency_unresolved_all_retained` | Missing, rejected, or unchecked common point: retain all IDs |
| `proved_inconsistent_all_retained` | Verified contradiction for `P`: report inconsistent premises and retain all IDs; this is not material-universe infeasibility |
| `conditional_screened` | Assumed premise and verified common point; apply interval screening and verified conservative exclusions |
| `conditional_partially_screened` | Those gates passed, but checking/search was limited; keep all candidates not already validly excluded |

An optional supplied `InfeasibilityCertificate` for `P` can distinguish proved
inconsistency from a merely bad consistency point. A contradiction for `Qx`
instead proves that candidate `x` can never be feasible in the accepted model.
The domains have distinct identities and cannot be confused.

The `proofs` sequence accepts infeasibility certificates and dominance
certificates. Common-domain contradiction proofs are checked first in their
supplied order, then candidate proofs in their supplied order, then automatic
witness search in sorted candidate/witness order. The input proof sequence is
an ordered part of the invocation: changing its order can change which work
finishes within a shared budget. Reproducing a bounded run requires that same
sequence, consistency point, and limits. `problem_digest` identifies the model,
not this complete invocation; no run-receipt protocol is implemented here.
Each assessment records its source, candidate/witness IDs, normalized certificate
digest, and check result. Accepted coupled exclusions include their full
immutable certificate. Rejected certificates never exclude anything.

With the gates open, the result separately records `interval_infeasible`,
`interval_dominated`, `coupled_infeasible`, and `coupled_dominated`. Its
`certified_feasible` entries come from the active interval baseline and remain
conditional on the model premise. With the gates closed all these operational
collections are empty, even if the diagnostic box selector would have pruned.
`physical_attestation` always remains `not_established_by_this_program`.

## Automatic search and its limits

`simple_upper_certificate(domain, expression)` builds a rational certificate
from signed coordinate-bound rows. Shared affine coefficients cancel before
this operation. It also considers an individual domain row whose coefficient
vector exactly matches the expression's coefficient vector. This permits
directly using an admitted coupling row or a `Qx` feasibility row.

Generated certificates pass through the same exact verifier as supplied ones.
The producer does not solve a linear program, search arbitrary row combinations,
or enumerate possible-optimum disjunctions. A valid supplied combination can
therefore prove something the automatic producer misses. For example, rows
`u<=1/4` and `v<=1/4` together prove `u+v-3/4<=-1/4` by adding both with
multiplier one.

Even complete candidate-pair search is not a complete possible-optimum decision.
For `X=1/2`, `Y=t`, and `Z=-t` on `[-1,1]`, neither alternative always beats `X`,
although one of them does at every point. This kernel conservatively retains
`X`; it does not infer that every retained candidate has a coupled-world optimum
witness.

`Limits` bounds certificate terms, checked integer sizes, accounted exact proof
arithmetic, and attempted candidate pairs. Checking/search exhaustion yields an
unresolved assessment, never a rounded certificate or a forced ranking. Already
verified exclusions remain valid when later search stops. If consistency cannot
be checked within its budget, the whole universe is retained.

These are **proof-work limits**, not end-to-end runtime or memory guarantees.
Input construction, model normalization, domain hashing, and interval-box
construction are outside the arithmetic counter. A screen constructs and hashes
the base domain once, reuses its problem identity and coordinate rows, and
lazily caches only candidate domains needed by a supplied certificate or an
attempted pair. A zero pair limit constructs no candidate domains unless an
explicit certificate requires one. Hashing each requested domain still processes
its rows; the representation is dense. Even an unsupported premise computes
the diagnostic box selection before returning all IDs, so abstention is not a
constant-cost path. There is no untrusted network
interface for this module. A future wire route must add its own request-size,
dimension, model-complexity, and execution controls before exposing these pure
functions.

## Verification and remaining obligations

The focused tests run with:

```sh
python -m unittest discover -s tests -p test_coupled.py -v
```

They include 600 independently evaluated rational worlds; strict error/tie
boundaries; conditional witness feasibility; explicit multirow certificates;
candidate-domain contradictions; invalid dual signs and coefficients; stale
domains/scopes; fixed-domain exclusion chains; immutable snapshots; exactness
and dimension validation; lazy domain construction; bounded-check invariance to
mapping insertion order; and resource-limited abstention. Negative cases also
show that an inconsistent or unsupported affine model cannot turn a smaller
diagnostic box pool into operational exclusions.

[LupineCoupled.lean](../formal/LupineCoupled.lean) formalizes the corresponding
nonnegative-combination, contradiction, conditional-witness, and common-world
retention rules, including tied minima and inactive whole-universe retention.
The [formal inventory](../formal/theorem-inventory.json) and
[verification record](../formal/VERIFICATION.md) record the actual compiled
statements. These are not a formal refinement proof of the Python implementation.

No complete solver, proof of physical affine coupling, learned-correlation
guarantee, independent scientific replication, or improvement to the frozen
JARVIS benchmark is established here. Those claims require additional work and
cannot be inferred from the synthetic cancellation example.
