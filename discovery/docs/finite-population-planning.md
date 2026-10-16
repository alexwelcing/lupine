# Prospective zero-failure resolution for a fixed finite archive

`lupine_discovery.finite_planning` provides a separate exact planning contract
for a frozen, complete residual panel population. Probability comes from
uniformly sampling distinct panel IDs without replacement. It does not require
IID failure labels, and it does not turn a finite-archive conclusion into a
claim about new materials, future panels, or an underlying scientific population.
The [IID zero-failure planner](study-planning.md) retains its different contract.

```python
from lupine_discovery.finite_planning import plan_finite_zero_failure_resolution

plan = plan_finite_zero_failure_resolution(4, '1/2', '1/6', 2)
assert plan.minimum_null_failures == 2
assert str(plan.attainable_null_failure_fraction) == '1/2'
assert plan.minimum_evaluation_panels == 2
assert str(plan.zero_failure_null_bound) == '1/6'
assert plan.power_status == 'not_computed'
```

## Compiled mathematical scope

[LupineFinitePlanning](../formal/LupineFinitePlanning.lean) now proves 13
finite-count statements underlying the bound: exact favorable subsets and
ratio, failure-count antitonicity, the attained `ceil(rho*M)` null maximum,
the zero boundary and census resolution. The companion
[LupineFinitePlanningMonotone](../formal/LupineFinitePlanningMonotone.lean)
proves four further statements: evaluation-size nonincrease, exact cap
feasibility, and the unique first qualifying positive count. See the
[actual verification](../formal/VERIFICATION.md) for executed module builds and
audits; this theorem map alone does not attest an integrated build.
The proofs quantify over arbitrary finite counts; the implementation cap is
separate. The mathematical minimum characterization does not prove the Python
minimum-count loop or a Python/Lean refinement, and neither module establishes
that a scientific experiment satisfies the sampling and fixed-label premises
below.

## Frozen finite-frame assumptions

After calibration and policy freeze, define a residual frame of `M` distinct
panel IDs and one complete binary failure endpoint for each ID. The frame,
policy, endpoint, and labels must remain fixed while evaluating the subset.
Conditional on this fixed state, select a fixed number `e` of IDs uniformly
without replacement: every size-`e` subset has the same probability. Do not
drop selected panels, redraw favorable samples, tune the policy, change labels
through intervention, choose `e` after outcomes, or silently repeat the test.
Any procedure with additional selection or multiplicity needs its own analysis.

The conditional statement fixes policy, calibration, and the residual frame;
it still averages over the random evaluation draw. One may seal the actual
allocation transcript for audit, but conditioning additionally on that entire
realized subset/order removes the random draw and does not retain this same
sampling probability.

These assumptions concern the sampling design and fixed endpoints. Correlated
panel labels do not by themselves invalidate the finite counting argument.
However, duplicating one measurement under multiple IDs changes the population
and does not create independent information or justify duplicated acquisition
cost. The frame, complete endpoint observability, unique measurement accounting,
scope, and scientific relevance still require an external evidence audit.
Uniform sampling of IDs does not attest physical independence.

## Exact null bound and minimum positive sample size

Let `K` be the fixed but unobserved number of failing IDs. For a proposed
failure-fraction ceiling `rho`, the null is `K/M >= rho`. The smallest attainable
null count is

\[
K_{\min}=\lceil\rho M\rceil.
\]

For a fixed null world with `K` failures, a uniformly selected size-`e` subset
has zero failures with probability

\[
\frac{\binom{M-K}{e}}{\binom{M}{e}}.
\]

Here the numerator is zero if `e > M-K`. Increasing `K` cannot add all-success
subsets, so the supremum over the null is attained at `K_min`:

\[
G_e = \frac{\binom{M-K_{\min}}{e}}{\binom{M}{e}}.
\]

For fixed `M` and `K_min`, `G_e` is nonincreasing over `0 <= e <= M`.
For a cap within this range, a qualifying positive count exists exactly
when the cap is positive and `G_cap <= eta`. If feasible, there is a unique
first positive qualifying count: all earlier positive counts have
`G_e > eta`, and every later count through `M` has `G_e <= eta`. This is
a mathematical characterization; correctness of the executable search
remains a separate implementation obligation.

The planner reports the exact rational `G_e` at the caller's cap and the smallest
positive `e` within that cap satisfying `G_e <= eta`. Equality qualifies. At cap
zero the bound is one and both minimum fields are null. Since `rho > 0`,
`K_min >= 1`; the bound becomes zero at `M-K_min+1` and remains zero through
the census `e=M`. Thus a qualifying count always exists within a complete
census, but it may not exist within the caller's smaller cap. A zero bound
means zero failures is impossible under the finite-frame null at that sample
size. It does not mean the actual endpoint is known or future risk is zero.

The null boundary usually lies on a discrete grid. For example, `M=10` and
`rho=0.200000001` require at least three failing IDs, so the least attainable
null failure fraction is `3/10`. The planner exposes both the requested ceiling
and `attainable_null_failure_fraction`; it does not silently replace the
scientific target with the rounded grid point.

With four IDs and two failures, exactly one of the six distinct pairs avoids
both failures. The finite-frame zero-failure probability is `1/6`. An IID model
with common failure probability `1/2` instead gives `1/4`. These are different
sampling models, and the finite planner does not substitute for the IID API.

## Claims and engineering boundaries

The output is a frozen dataclass. Exact probabilities are `Fraction` values;
the existing `serialization.encode` renders them as rational strings and
preserves unknown minimum fields as null. No special float conversion is used.
The entrypoint accepts only four prospective numeric inputs; no source path,
outcomes, panel IDs, fitted model, calibration data, or claim override is an
input. No archive is read and no sample is drawn by this module.

`resolution_status` describes whether the cap can resolve the null **if zero
failures occur**. `adequacy_status` remains `unestablished`, `power_status` is
`not_computed`, `observed_evidence_status` is `no_observations`, and
`premise_status` is `hypothetical_unverified`. `sampling_design` names the
assumed design; it is not evidence that an actual randomization followed it.
`future_population_risk_status` remains `not_established`. These results do not
certify conditional conformal coverage, physical measurement validity, useful
pool reduction, or scientific superiority. The arithmetic is neither observed
power nor an executed hypothesis test.

`population_panels` must be an integer in `[1,256]`. The evaluation cap must
be an integer in `[0,population_panels]`. Booleans and floats are rejected.
`loss_ceiling` and `significance` must lie strictly between zero and one; this
API deliberately excludes endpoints even though separate endpoint mathematics
can be defined. Both accept bounded exact fractions and plain rational/decimal
strings under the existing planner rules: at most 128 text characters, no
exponent notation, and normalized numerator/denominator at most 32 bits.

The implementation evaluates at most 256 combination ratios. Since
`binom(M,e) <= 2**M`, every probability numerator and denominator is bounded
by 257 bits for `M <= 256`; no large exponent depends on user text. These are
engineering bounds, not limits on the counting theorem. Author tests compare
the implementation with explicit enumeration of all binary populations and
all subsets for small frames. Such checks validate executable arithmetic;
they are not scientific observations, a Lean build, or a proof of Python
refinement from Lean.
