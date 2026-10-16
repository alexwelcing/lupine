# Prospective threshold and zero-failure planning

`lupine_discovery.study_planning` supplies exact arithmetic for designing a new,
unexposed study. It accepts counts and hypothetical probabilities, with no
dataset path, outcome array, fitted model, or calibration scores. Its results
do not revise the completed archival studies: scientific usefulness remains
**NO_GO** for the frozen MPEA evaluation. A new independent study needs a new
prospectively frozen protocol and evidence source.

The two entrypoints return frozen dataclasses. Their probabilities are Python
`Fraction` values, and their premises are immutable tuples. This increment
adds executable arithmetic and boundary tests; it does not add a Lean theorem
or prove refinement of Python from Lean.

## Threshold event for complete prospective calibration scores

```python
from lupine_discovery.study_planning import plan_pool_threshold

plan = plan_pool_threshold(19, '1/10', '3/4', '19/20')
assert plan.rank == 18
assert plan.tolerated_above_cutoff == 1
```

Let `n` be the number of complete calibration panel scores, `alpha` the
miscoverage parameter, and `c` a fixed cutoff in `[0, 1)`. The conservative
split-conformal order-statistic rank is

\[
k = \lceil (n+1)(1-\alpha) \rceil.
\]

For `k <= n`, the threshold `tau` is the `k`th smallest score. The event
`tau <= c` is exactly the event that at least `k` calibration scores are at
most `c`; at most `n-k` scores may exceed `c`. If `k > n`, no observed order
statistic is available. The existing [normalized-rank bounded-score pool
rule](decision-pool-calibration-design.md) sets `tau=1` and returns the whole
universe in this branch, so `tau <= c` has probability zero for `c < 1`. That
arithmetic zero does not certify calibration validity, screening, or physical
truth.

The minimum count permitting a finite rank is
`ceil(1/alpha) - 1`. It can exceed this implementation's engineering limit of
256 panels. A finite rank alone says nothing about whether the realized
threshold is below one. For example, a complete score law with every score
equal to one has a finite threshold of one whenever the rank is feasible;
every cutoff below one fails, at every such calibration count. More panels
cannot repair that score law.

The optional `iid_score_probability=p` declares the hypothetical probability
`Pr(R <= c)`. Conditional on the frozen scoring rule, the planner assumes the
prospective score events are independent and identically distributed. Under
that assumption it computes the exact probability

\[
\Pr(\tau\le c) = \sum_{j=k}^{n} {n\choose j}p^j(1-p)^{n-j}.
\]

The planner does not infer `p` from the count or cutoff, and it does not verify
the IID assumption. Exchangeability alone, which can support the usual
marginal conformal statement, does not justify this binomial law. Perfectly
dependent but exchangeable score events are a counterexample.

With no supplied `p`, `threshold_event_probability` is `None` for a finite
rank. For an infeasible rank it is the deterministic zero described above.
`adequacy_status` stays `unestablished`: no requested probability target or
empirical calibration law has been established. Even with `p`, the output is a
hypothetical threshold-event calculation, not proof of candidate retention or
scientific usefulness. A cutoff of zero is accepted, but a successful event
at zero may produce empty statistical pools; vacuous retention in infeasible
panels does not establish useful discovery.

The threshold-event probability is **not monotone in `n`**. At `alpha=1/10`
and `p=19/20`, counts 19 and 20 require ranks 18 and 19 respectively, each
tolerating only one score above the cutoff. The additional panel can create
another failure, so the probability decreases. Their exact probability ratio
is `P_20/P_19 = 741/760`. This increment therefore evaluates a supplied count;
it does not search for a minimum sample size for a target threshold probability.

Do not select calibration realizations, alter the frozen rule, redraw panels,
or tune a cutoff after exposure and then read the original marginal coverage
statement as conditional coverage on that selection. The planner does not
authorize such a procedure.

### Relating a threshold to a candidate budget

For a pool defined by normalized ranks `j/m <= tau`, with ranks `j=1,...,m`,
the pool has `floor(m*tau)` members when `0 <= tau <= 1`. For an integer budget
`0 <= B < m`, `tau <= B/m` is a **sufficient** condition for at most `B`
members. The exact cap condition is the weaker **strict** inequality
`tau < (B+1)/m`. These differ at the upper boundary and between grid points;
the planner's weak event `tau <= cutoff` must not be mislabeled as the exact
cap event. This arithmetic applies to that normalized-rank pool rule, not to
an arbitrary interval selector or an unknown number of feasible candidates.

## Best-case zero-failure resolution

```python
from lupine_discovery.study_planning import plan_zero_failure_resolution

plan = plan_zero_failure_resolution('1/10', '1/20', 100)
assert plan.minimum_evaluation_panels == 29
assert plan.power_status == 'not_computed'
assert plan.observed_evidence_status == 'no_observations'
```

Let `rho` be a proposed failure-probability ceiling and `eta` a significance
level, both strictly between zero and one. Define one binary failure endpoint
on each prospective evaluation panel, with a frozen rule and fixed population.
Conditional on that rule, assume IID failure indicators with common failure
probability `q`. Under the null hypothesis `q >= rho`, the probability of zero
failures in `e` panels is bounded by

\[
q\ge\rho\quad\Longrightarrow\quad
\Pr_q(0\text{ failures})=(1-q)^e\le(1-\rho)^e.
\]

The planner finds the smallest integer `e >= 1` within
`maximum_evaluation_panels` for which `(1-rho)^e <= eta`. Equality qualifies.
At `eta=1/20`, `rho=1/10` needs 29 panels and `rho=1/20` needs 59. These are
the smallest counts for resolving the null **if zero failures occur**; they
are not power calculations. Actual power needs a specified alternative law
and a complete rejection rule. This module neither estimates a true risk nor
uses observed failures or certifies any material.

`zero_failure_null_bound` is the exact best-case null probability bound at the
configured maximum count. `minimum_zero_failure_null_bound` is the bound at
the first qualifying count, or `None` if there is none. At a maximum of zero,
the first field is one and the minimum fields are `None`. An
`insufficient_resolution` result means no qualifying count exists **within
the requested cap**, not that larger studies are impossible.

The evaluation population must be frozen before outcomes. All its panels
count; conditioning on observed feasibility, omitting failures, or treating
correlated measurements from one source as independent panels invalidates
the stated calculation. Independence and complete endpoint observability are
assumptions requiring evidence outside the planner.

## Exactness and engineering limits

Counts must be integers in `[0, 256]`. Booleans, floats, negative counts, and
larger counts are rejected. Numeric inputs accept `Fraction`, integers, and
plain integer/rational/decimal strings such as `'1/10'`, `'.1'`, or `'0.10'`.
Exponent notation is deliberately unsupported. Strings longer than 128
characters and exponent strings are rejected before `Fraction` parsing;
already constructed integers and fractions are checked before conversion.
Each normalized input numerator and denominator must fit in 32 bits.

These are resource bounds, not mathematical limits or scientific claims.
An exact probability denominator raised to at most 256 has at most 8192 bits,
so its decimal representation remains below Python's default 4300-digit
integer conversion limit. Arithmetic uses rational and integer operations
throughout; it neither rounds logarithms to select a count nor converts the
tail probabilities to floating point.

The planner checks every supplied input even when the rank is infeasible.
Unknown score laws remain explicit, and no field attests independence,
physical validity, or scientific superiority.
