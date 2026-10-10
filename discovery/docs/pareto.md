# Exact multiobjective candidate pools

`lupine_discovery.pareto` screens a finite universe against any nonempty set of
minimized objectives. It returns a pool that contains every feasible Pareto
optimum **if every objective and constraint interval contains the intended true
value**. It does not infer physical interval soundness, scalarize tradeoffs, or
select a unique winner.

```python
from lupine_discovery.core import Interval
from lupine_discovery.pareto import ParetoCandidate, select_pareto

candidates = [
    ParetoCandidate("low-cost", {"cost": Interval(1, 1), "failure": Interval(3, 3)}, {}),
    ParetoCandidate("low-failure", {"cost": Interval(3, 3), "failure": Interval(1, 1)}, {}),
    ParetoCandidate("worse", {"cost": Interval(4, 5), "failure": Interval(4, 5)}, {}),
]
result = select_pareto(candidates)
assert result.retained == ("low-cost", "low-failure")
assert dict(result.dominance_witnesses) == {"worse": "low-cost"}
```

All candidates share exactly the same objective keys and constraint keys.
Every constraint means `g <= 0`; maximize an objective only after explicitly
negating both the value and interval endpoints. Values use `Fraction`, integer,
or rational-string endpoints through the existing `Interval` type. Floats,
infinite endpoints, inverted intervals, duplicate IDs, empty objective sets,
and mismatched scopes are rejected. An empty candidate universe is valid.

## Screening rule

Let `L_j(x), U_j(x)` enclose objective `j` and `l_k(x), u_k(x)` enclose constraint
`k`. Define:

- `F- = {x : every u_k(x) <= 0}`, the certified-feasible candidates.
- `F+ = {x : every l_k(x) <= 0}`, the possibly feasible candidates.
- `W(w,x)` holds when `w` is in `F-`, `U_j(w) <= L_j(x)` for every objective,
  and `U_j(w) < L_j(x)` for at least one objective.
- The retained pool is `{x in F+ : no w satisfies W(w,x)}`.

For any sound realization, `F-` is contained in the true feasible set and that
set is contained in `F+`. Every `W(w,x)` supplies a truly feasible candidate
whose objectives are all no worse than `x` and at least one is better. Therefore
a truly feasible Pareto optimum cannot be excluded. Equal objective vectors do
not dominate each other; all tied optima remain. Crossing objective vectors
remain even when one candidate ranks first under a particular weighted sum.

Possible feasibility alone is insufficient for an exclusion witness. If no
candidate is certified feasible, every possibly feasible candidate remains.
Empty `F+` certifies infeasibility only of the supplied finite universe. An
excluded candidate can be infeasible or dominated; these two output categories
are disjoint. A dominated candidate's witness may itself be dominated by
another candidate; it still supplies a valid feasible exclusion witness.

## Runtime API and certificates

`ParetoCandidate(candidate_id, objectives, constraints)` and `ParetoSelection`
are frozen dataclasses. Candidate mappings are copied into immutable snapshots.
The selection fields `certified_feasible`, `possible_feasible`, `retained`,
`certified_infeasible`, and `dominated` are sorted tuples of IDs.
`dominance_witnesses` is an immutable mapping from each dominated candidate ID
to one qualifying certified-feasible witness ID. If several qualify, the
lexically smallest ID is selected for reproducibility; objective rankings are
unaffected. No scalar incumbent, threshold, or regret field is returned.

The exact algorithm compares possibly feasible candidates against certified
feasible witnesses, with worst-case quadratic candidate count and linear
objective count. This version deliberately favors a directly inspectable rule.
The retained pool is a safe superset, not necessarily the true Pareto front,
and no arbitrary top-k truncation is part of this API. Unbounded or missing
intervals require a separate conservative wrapper; this finite core does not
substitute fabricated finite endpoints.

## Refinement

`validate_pareto_refinement(before, after)` requires the same candidate IDs,
objective keys, and constraint keys, with every interval tightened inside its
previous interval. `refine_pareto_selection(before, after)` validates and then
returns the new selection. Under this arithmetic relation:

- Certified feasibility can only grow; possible feasibility can only shrink.
- Every previous dominance witness remains valid: its upper bounds decrease,
  the excluded candidate's lower bounds increase, and a strict coordinate
  stays strict.
- The retained pool can only shrink.

The caller must establish that the intervals refer to the same physical units,
reference states, operating conditions, and outcomes. Matching field names
does not prove semantic compatibility or the soundness of either interval set.

## Executable evidence

Run `python -m unittest discover -s tests -p 'test_pareto.py' -v`.
The suite checks all 46,656 two-candidate, two-objective, one-constraint interval
problems over endpoints `{-1,0,1}` and all 1,000,000 contained integer worlds.
An independent oracle computes true feasible Pareto fronts directly from true
values; it never consults selector witnesses or interval endpoints. Every
reported exclusion witness is also checked against every compatible world.
Additional checks cover exact ties, tradeoffs, unknown feasibility, empty and
infeasible universes, deterministic witnesses, rational distinctions erased by
binary floating point, invalid scopes, scalar compatibility, and tightening.
A separate negative control deliberately supplies unsound bounds and confirms
that a true optimum is lost; this is not counted as sound-world evidence.

These finite tests are software evidence. The mathematical implication is
conditional on sound intervals; neither tests nor a Lean theorem establish a
particular materials predictor's physical accuracy. The runtime is not claimed
to be a formally proved refinement of Lean.
