# Calibrated problems and whole-universe abstention

The `lupine.discovery.calibrated_problem.v1` input lets the workbench or CLI accept
frozen nominal predictions and absolute-error calibration scores. It either
constructs finite conditional intervals and uses the existing exact selector, or
retains the entire candidate universe. It never replaces an unavailable radius
with the largest observed residual or a large finite constant.

This is an arithmetic and decision interface. A predictor identifier, calibration
identifier, sampling-scope declaration, or receipt hash does not establish
exchangeability, predictor independence, physical validity, or provenance.

## Input contract

```json
{
  "schema": "lupine.discovery.calibrated_problem.v1",
  "scenario": {
    "id": "illustrative-calibration-v1",
    "objective": {
      "unit": "utility",
      "reference": "synthetic demonstration",
      "direction": "minimize"
    },
    "constraints": {}
  },
  "candidates": [
    {"id": "a", "score": "0", "constraints": {}},
    {"id": "b", "score": "4", "constraints": {}}
  ],
  "calibration": {
    "delta": "1/2",
    "predictor_id": "frozen-demo-predictor-v1",
    "calibration_id": "demo-absolute-errors-v1",
    "sampling_scope": "Illustrative synthetic values; independence is not verified",
    "premise_status": "assumed_unverified",
    "residuals": {"score": ["1", "0", "1/2"]}
  }
}
```

Only `description`, a string, is optional at the top level. Every object rejects
extra fields. Outcomes and asserted guarantee fields are forbidden in selection
input. Candidates must form a nonempty array with unique nonempty IDs; their
constraint keys must exactly match the scenario. Scenario units and references
must be nonempty strings. `score` is reserved for the objective, and maximization
must first be explicitly normalized to minimization. Constraints mean `g <= 0`.

Predictions and residuals use JSON integers or quoted exact rational/decimal
strings. JSON floating point values, booleans as numbers, duplicate object keys,
and negative absolute-error residuals are rejected. Every scalar target,
including every constraint, needs its own residual array. Arrays must have equal
sample counts; empty arrays are accepted and force an unbounded result. Invalid
data is rejected even when the declared sampling premise is unsupported.

`predictor_id`, `calibration_id`, and `sampling_scope` must be nonempty strings.
The only premise statuses are `assumed_unverified` and `unsupported`. There is no
input status that turns a user declaration into verified scientific evidence.

## Arithmetic and decision

With `m` candidates, `p` scalar targets (one score plus all constraints), and `n`
residuals per target, the program derives all counts from input and uses:

```
event_count = m * p
epsilon = delta / event_count
rank = ceil((n + 1) * (1 - epsilon))
minimum_finite_calibration_count = ceil(1 / epsilon) - 1
```

`0 < delta < 1` is required. Counts and denominators cannot be supplied by the
caller. Each target's radius is its one-based `rank` order statistic. If that
rank is `n + 1`, the radius is unbounded (`null`), never clamped. The usual
split-conformal marginal argument and union bound require the recorded sampling
premises, including exchangeability and predictor freezing independently of
calibration labels; this program does not verify those premises. Dependence
between candidate events does not invalidate the union-bound arithmetic.

On the certificate wire, `minimum_finite_calibration_count` is always an exact
integer **string**, including small values such as `"9"`. This derived diagnostic
can exceed JavaScript's exact integer range even for a one-candidate problem.
Input-sized counts (`calibration_count`, `candidate_count`, `target_count`,
`event_count`, and `rank`) remain JSON integers; exact budgets and radii are
rational strings. The underlying Python planner keeps its count fields as integers.

For finite radii and `assumed_unverified`, each interval is exactly
`[nominal - radius, nominal + radius]`. The ordinary selector runs on that
prepared problem, with its existing implication conditional on all intervals
containing their intended true values. The example yields radius `1`, intervals
`[-1,1]` and `[3,5]`, retained candidate `a`, and conditional regret bound `2`.
It does not establish a physical or probabilistic attestation.

If any radius is unbounded, or the sampling premise is `unsupported`, the
decision abstains from pruning. It retains all sorted candidate IDs, records no
certified feasibility or infeasibility, and has no incumbent, score threshold,
regret bound, or prepared interval problem. With unsupported sampling, a finite
arithmetic diagnostic may still be reported, but it is never used for pruning.

## Certificate contract

Output schema is `lupine.discovery.calibrated_certificate.v1`. The existing
certificate fields remain available: `selection`, `reasons`, `measurement_queue`,
`evidence_assessment`, `assumptions`, and `physical_attestation`. The last always
remains `not_established_by_this_program`; missing physical evidence stays
missing. The `problem_digest` seals the original calibrated input, including its
scope declarations, and `certificate_digest` seals the complete output payload.

Additional fields are:

| Field | Meaning |
| --- | --- |
| `calibration.status` | `finite_conditional` or `abstained` |
| `calibration.premise_status` | The original unverified or unsupported declaration |
| `calibration.reasons` | Empty when finite; otherwise `sampling_scope_unsupported` and/or `required_rank_exceeds_calibration_count` |
| `calibration.plan` | Counts, exact budget, required rank, finite-sample requirement, outcome kind, and explicit premises |
| `calibration.targets` | Each target's `radius`, `outcome_kind`, and arithmetic `reason` |
| `calibration.predictor_id`, `calibration.calibration_id`, `calibration.sampling_scope` | Original declarations |
| `prepared_problem` | A valid ordinary interval problem for finite conditional decisions, or `null` for abstention |

The abstention measurement queue is a deterministic ID ordering, not a ranking
guarantee. Its `possible_feasible` field includes all IDs because feasibility is
unresolved by this calibration route, including when nominal predictions look
clearly unfavorable. `certified_feasible`, `certified_infeasible`, and `dominated`
are empty.

## Verification and separate outcome replay

Existing commands accept either problem schema:

```sh
lupine-discovery select calibrated.json --output certificate.json
lupine-discovery verify calibrated.json certificate.json
lupine-discovery replay calibrated.json outcomes.json
```

Verification recomputes the entire result, including type-sensitive JSON identity
for calibrated count fields. It does not certify source truth or independence.
Ordinary interval-problem certificate output remains unchanged.

Replay accepts the existing `lupine.discovery.outcomes.v1` schema, bound to the
**original calibrated problem digest**, with its matching scenario ID. The
decision is fixed before outcomes are parsed. Finite replay evaluates the
prepared intervals and verifies that selection matches the sealed decision.
An empirical coverage success or failure never changes the calibration premise
status or the original selection.

Abstention replay audits the actual all-retained decision without calling an
interval selector. It validates truth IDs and constraint scope, reports missing
truth and observed feasible outcomes, and reports true optima only when the
whole finite universe has complete truth. It reports:

```
certification_state = "abstained_no_interval_certificate"
empirical_soundness = "not_evaluated_abstention"
score_coverage = constraint_coverage = null
score_coverage_count = constraint_coverage_count = 0
incumbent_regret = regret_bound_holds = null
```

Each per-candidate interval-coverage result is also `null`. Complete truth with
no feasible candidate yields an empty minimizer list and `null` retention, not a
claimed discovery success. With feasible complete truth, all-optimum retention
is expected from retaining everyone; it provides no evidence of useful pool
reduction.

## Verification evidence

`python -m unittest discover -s tests -p test_calibrated.py -v` exercises exact
allocation, strict boundaries, both abstention causes, receipt tampering, stale
scope seals, separate outcome binding, and CLI round trips. An independent
enumeration of 729 sound finite worlds checks minimizer retention and regret.
Negative controls change outcomes to expose false interval premises without
changing the previously selected pool. These are software checks; they are not
independent experimental validation of a predictor.
