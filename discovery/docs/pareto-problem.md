# Pareto problems, certificates, and separate outcome replay

`lupine.discovery.pareto_problem.v1` screens a finite candidate universe with any
nonempty finite set of minimized objectives. It preserves tradeoffs and exact
objective ties. It excludes a candidate only through a certified constraint
violation or a certified-feasible witness whose worst values dominate that
candidate's best values. The guarantee remains conditional on all supplied
intervals being sound in their declared scientific scope.

The returned pool can contain truly dominated candidates when the intervals are
too broad to prove exclusion. Its purpose is to preserve the entire true
feasible Pareto frontier, not to assert that the retained set is already that
frontier. It defines no scalar winner, objective weights, threshold, or regret
bound.

## Problem contract

```json
{
  "schema": "lupine.discovery.pareto_problem.v1",
  "scenario": {
    "id": "tradeoff-demo-v1",
    "objectives": {
      "cost": {"unit": "cost", "reference": "synthetic fixture", "direction": "minimize"},
      "failure": {"unit": "rate", "reference": "synthetic fixture", "direction": "minimize"}
    },
    "constraints": {
      "margin": {"unit": "utility", "reference": "signed feasibility margin"}
    }
  },
  "candidates": [
    {"id": "a", "objectives": {"cost": ["0", "0"], "failure": ["3", "3"]}, "constraints": {"margin": ["-1", "-1"]}},
    {"id": "b", "objectives": {"cost": ["3", "3"], "failure": ["0", "0"]}, "constraints": {"margin": ["-1", "-1"]}},
    {"id": "dominated", "objectives": {"cost": ["4", "4"], "failure": ["4", "4"]}, "constraints": {"margin": ["-1", "-1"]}}
  ]
}
```

Every objective must declare `direction: "minimize"`; normalize maximization
explicitly before submission. Constraint values mean `g <= 0`. Scenario IDs,
quantity names, units, references, and candidate IDs must be nonempty strings.
Candidate IDs must be unique. Each candidate must have exactly the objective and
constraint keys declared by the scenario. An empty candidate universe is valid;
an empty objective declaration is not.

Objective and constraint names must be disjoint because evidence uses one flat
quantity namespace. For example, an objective named `temperature` and a
constraint also named `temperature` are rejected even if their unit strings
match. Give distinct quantities distinct names and references.

Intervals are two-element arrays of exact JSON integers or rational/decimal
strings. Inverted intervals, floats, numeric booleans, duplicate JSON keys, and
unknown fields are rejected. Top-level optional fields are `description` (a
string) and `evidence` (the existing evidence-record array). A candidate may
include `evidence`, mapping quantity names to evidence-ID arrays. Every linked
record must match that quantity's scenario ID, name, unit, and reference exactly.
Missing, assumed, and rejected evidence remain visible. Linkage never proves
physical enclosure validity.

## Selection and certificate

For a possible-feasible candidate `x`, witness `w` can exclude it only if:

```
every constraint upper bound of w <= 0
every objective upper bound of w <= the corresponding lower bound of x
at least one objective upper bound of w < the corresponding lower bound of x
```

One strict coordinate is necessary. Candidates with identical true objective
vectors remain distinct tied members of the frontier. A witness with uncertain
feasibility cannot exclude anyone. Witness IDs are chosen deterministically
among candidates satisfying this condition; their ordering is not an objective
preference.

The `lupine.discovery.pareto_certificate.v1` response has the shared
`engine_version`, `scenario_id`, `problem_digest`, `certificate_digest`, `claim`,
`physical_attestation`, `reasons`, `evidence_assessment`, `measurement_queue`, and
`assumptions` fields. Its `selection` contains:

| Field | Meaning |
| --- | --- |
| `certified_feasible` | Every constraint upper bound is nonpositive |
| `possible_feasible` | Every constraint lower bound is nonpositive |
| `retained` | Possibly feasible candidates without a proved dominance exclusion |
| `certified_infeasible` | Candidates with a positive constraint lower bound |
| `dominated` | Candidates excluded using a certified-feasible dominance witness |
| `dominance_witnesses` | Map from excluded candidate ID to its witness ID |

ID arrays are sorted. No scalar `incumbent`, `threshold`, or `regret_bound` field
is present. The measurement queue is the retained IDs in deterministic order,
with kind `deterministic_id_order_not_an_objective_ranking`.

For a dominance exclusion, `reasons[id]` has reason
`certified_feasible_bound_dominance`, its `witness`, and `strict_objectives`, the
names of coordinates having strict bound separation. Constraint exclusions use
`constraint_lower_bound_positive` plus the violated bound names. Retained
candidates use `retained_not_proven_dominated_or_infeasible`.

The example retains `a` and `b`, and excludes `dominated` with witness `a`.
All receipts remain `physical_attestation: "not_established_by_this_program"`.
Receipt verification checks exact deterministic recomputation and identity, not
source truth or training independence. Existing scalar and calibrated receipt
formats remain unchanged.

## Outcome contract and partial information

Outcomes are submitted separately using `lupine.discovery.pareto_outcomes.v1`:

```json
{
  "schema": "lupine.discovery.pareto_outcomes.v1",
  "scenario_id": "tradeoff-demo-v1",
  "problem_digest": "COPY_THE_ORIGINAL_PROBLEM_DIGEST_FROM_THE_CERTIFICATE",
  "outcomes": [
    {"id": "a", "objectives": {"cost": "0", "failure": "3"}, "constraints": {"margin": "-1"}},
    {"id": "b", "objectives": {"cost": "3", "failure": null}, "constraints": {"margin": "-1"}}
  ]
}
```

The digest must match the original problem, and the scenario ID must also match.
Rows, individual quantity keys, and values may be absent or `null` to represent
unknown truth. A present row must include both `objectives` and `constraints`
objects, which may be empty. Unknown candidate IDs, duplicate IDs, unknown
quantity names, scope crossover, floats, and extra fields are errors. Zero is a
measured value, never a missing-value marker.

The decision and its certificate are fixed before outcomes are parsed. Replay
does not use a revealed outcome to improve the prediction or change membership.

## Replay semantics

`lupine.discovery.pareto_replay.v1` includes the original `problem_digest`, the
`outcomes_digest`, and an `evaluation` object. The object includes:

| Field | Meaning |
| --- | --- |
| `selection` | The exact decision made before outcome parsing |
| `per_candidate` | Objective/constraint coverage maps, `truth_complete`, and tri-state `true_feasible` |
| `objective_coverage` | Per-objective covered fractions, or `null` when none were observed |
| `objective_coverage_count` | Separate observation denominator for each objective |
| `constraint_coverage`, `constraint_coverage_count` | Aggregate observed constraint coverage and its denominator |
| `outcome_completeness`, `missing_truth_ids` | Whether every objective and constraint is known for every candidate |
| `observed_pareto_front` | Frontier among observed candidates with complete objective vectors and known feasibility |
| `observed_front_scope` | Explicitly limits the observational frontier to those candidates |
| `true_pareto_front` | Whole-universe feasible frontier only with complete truth; otherwise `null` |
| `all_true_pareto_candidates_retained` | Whether that whole frontier was retained; otherwise `null` |
| `dominance_witness_correctness` | Whether each exclusion witness is truly feasible and truly dominates its target, or `null` if unresolved |
| `certified_rejection_correctness` | Whether each constraint-excluded candidate is truly infeasible, or `null` |
| `excluded_pareto_correctness` | For complete truth with a nonempty frontier, whether each excluded candidate is outside that frontier |
| `pool_fraction` | Exact retained fraction, or `null` for an empty universe |

A candidate is truly infeasible if any observed constraint is positive, even
when another constraint is unknown. It is known feasible only if every
constraint is known and nonpositive; otherwise feasibility is `null`. With no
constraints, feasibility is vacuously true, but objective truth can still be
missing. Whole-front identification conservatively requires all objectives and
constraints even for candidates already observed to be infeasible.

`dominance_witness_correctness` reports false immediately when the witness is
known infeasible. Otherwise it waits for complete objective vectors and known
witness feasibility, then checks weak coordinatewise dominance with one strict
coordinate. Unknown witness checks do not become successful checks.

Any observed objective or constraint interval miss makes
`empirical_soundness: "refuted_on_observed_outcomes"`, even in a partial archive.
Complete observed coverage is `supported_on_complete_finite_archive`; incomplete
truth with no observed miss is `unresolved_missing_outcomes`. An empty universe
is `not_evaluated_empty_universe`. These labels describe interval coverage on
the supplied archive, not exchangeability or future physical validity.

Complete truth with no feasible candidates produces an empty frontier and
`null` retention. Unknown coverage stays `null`, with denominator zero, rather
than becoming perfect coverage. The example's missing objective and missing
candidate prevent any claim about its whole-universe true frontier.

## Commands and verification

```sh
lupine-discovery select pareto.json --output certificate.json
lupine-discovery verify pareto.json certificate.json
lupine-discovery replay pareto.json outcomes.json
python -m unittest discover -s tests -p test_pareto_io.py -v
```

The integration tests include an independent frontier oracle across 256 sound
finite worlds, tradeoffs and tied vectors, exact arithmetic beyond binary-float
resolution, partial and all-null outcomes, stale seals, scope conflicts, and
CLI round trips. Separate negative controls deliberately violate objective or
constraint intervals and expose lost true frontier members. These complement
the [kernel checks and conditional mathematics](pareto.md); none is a physical
validation of an unknown material.
