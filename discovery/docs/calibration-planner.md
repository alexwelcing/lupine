# Exact calibration planning

The optional `lupine_discovery.calibration` module implements the arithmetic described in [joint-coverage-design.md](joint-coverage-design.md). It plans a uniform Bonferroni allocation and computes one scalar target's nonnegative residual order statistic. Its outputs are conditional diagnostics with **unverified assumptions**. They do not establish exchangeability, physical validity, simultaneous interval soundness, or optimizer retention. No probability theorem has been compiled in Lean, and this module is not a refinement of a formally verified probability implementation.

The finite selector and archived benchmark remain unchanged. The CLI and workbench now accept [calibrated problems](calibrated-problem.md): finite radii with explicitly unverified premises produce an ordinary interval problem, while unbounded radii or unsupported sampling retain the whole candidate universe without entering the finite `Interval` core.

## API and interpretation

```python
from fractions import Fraction
from lupine_discovery.calibration import plan_calibration, calibrate

plan = plan_calibration(
    calibration_count=39,
    candidate_count=2,
    delta='1/5',
    target_count=2,  # score plus one constraint for each candidate
)
outcome = calibrate([Fraction(i, 10) for i in range(39)], plan)
assert plan.event_count == 4
assert plan.epsilon == Fraction(1, 20)
assert plan.rank == 38
assert outcome.outcome_kind == 'finite'
assert outcome.radius == Fraction(37, 10)
assert plan.premise_status == 'assumed_unverified'
```

`target_count` includes the score and every scalar constraint target. With m candidates and p targets each, the planner budgets `epsilon = delta/(m*p)` for each scalar target event. Their event budgets sum exactly to delta. Independence between candidates or targets is unnecessary for the union bound; individually valid marginal probability premises are still necessary. Each target must be calibrated separately from its own residual scores. This narrowly scoped API assumes equal calibration sample counts and an equal allocation; heterogeneous budgets and sample sizes require a separate design.

`split_conformal_rank(n, epsilon)` returns the exact one-based rank `ceil((n+1)*(1-epsilon))`. `plan_calibration(n, m, delta, target_count=1)` returns a frozen `CalibrationPlan` with the input counts, exact delta and epsilon, total event count, rank, minimum calibration count for a finite threshold, expected outcome kind, and immutable premise/status diagnostics. `calibrate(residuals, plan)` checks the sample count and nonnegative scores and returns a frozen `CalibrationOutcome` holding its plan, outcome kind, reason, and optional radius. A finite radius is the kth sorted score, including conservative ties. Finite thresholds may still be too wide to be useful.

All probability and residual arithmetic uses `Fraction`. Rational strings and integers are accepted through the same exact conversion rules as the core; floating-point values, booleans, and nonfinite inputs are rejected. Counts must be integers, with n >= 0, m >= 1, and p >= 1. Both delta and standalone epsilon must lie strictly between zero and one; endpoints are deliberately outside this API. Negative residual scores are invalid because the input is an absolute-error nonconformity score rather than a signed residual. All scores are checked even for an unbounded plan. Residuals must be a `collections.abc.Sequence` of scalar scores, such as a list or tuple; rational strings are accepted as individual elements. A scalar string, bytes, bytearray, mapping, or generator is rejected rather than interpreted as scores. A residual count mismatch is an error.

The finite rank condition is `epsilon >= 1/(n+1)`, equivalently `n >= ceil(1/epsilon)-1`. Rank computation uses integer numerator/denominator arithmetic, so a rational epsilon just below 1/(n+1) correctly forces the unbounded case without rounding it to the boundary.

## Explicit unbounded outcomes

If k=n+1, the module produces:

```python
plan = plan_calibration(54, 68, '0.05')
outcome = calibrate([Fraction(1)] * 54, plan)
assert outcome.outcome_kind == 'unbounded'
assert outcome.radius is None
assert outcome.reason == 'required_rank_exceeds_calibration_count'
```

`outcome_kind='unbounded'` and `radius=None` form an explicit machine-readable result. No floating-point infinity or finite maximum-residual clamp is substituted. Zero calibration examples likewise produce an unbounded plan and an unbounded outcome when supplied an empty residual sequence. No finite radius can be attached to an unbounded `CalibrationOutcome`. This state represents the unbounded conformal threshold, rather than a zero radius or a failed numeric calculation.

At delta=0.05 with one target per candidate, the documented gap dimensions m=888, n=913 require rank 914 and an unbounded outcome. The steel dimensions m=68, n=54 require rank 55 and an unbounded outcome. Finite thresholds at those budgets require at least 17,759 and 1,359 calibration examples respectively. These are planning calculations using the recorded dimensions, **not empirical claims or new coverage guarantees for either pilot**. Additional constraint targets tighten the per-event allocation and may turn a previously finite plan into an unbounded one.

## Assumptions remain visible

Every plan records four unverified premises: calibration/new-score exchangeability for each candidate and scalar target; a predictor and nonconformity rule frozen independently of calibration labels; candidate generation and scope preserving marginal validity; and recorded outcomes matching the intended target, without this module establishing physical validity. The immutable `premise_status='assumed_unverified'` and `guarantee_status='conditional_arithmetic_only'` remain present for finite and unbounded plans. A caller cannot upgrade them by passing a boolean saying exchangeability holds.

Arbitrary optimizer-generated candidates, adaptive calibration reuse, and correlated composition-group splits need their own justification. A finite order statistic does not supply it. The existing negative archived pilots remain unchanged: their simultaneously sound interval premises were refuted on observed test outcomes. The implementation computes the conservative budget and order statistic; it neither assesses nor proves the underlying sampling assumptions.

## Focused verification

Executed:

```sh
PYTHONPATH=src python -m unittest discover -s tests -p 'test_calibration.py'
```

All five tests passed. They check the two documented unbounded pilot plans; a finite multi-target allocation and kth residual; exact near-boundary rational ranks, ties, and empty calibration; exhaustive rational rank/resolution comparisons over small n; and invalid inputs, unclamped unbounded responses, and frozen diagnostics. These tests verify software arithmetic and state handling, not physical or probabilistic validity.
