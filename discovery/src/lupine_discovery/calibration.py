"""Exact finite-pool calibration arithmetic with unverified explicit premises.

No output establishes exchangeability, physical validity, or interval soundness.
Unbounded outcomes are diagnostics and cannot be passed to the finite core.
"""
from collections.abc import Sequence
from dataclasses import dataclass, field
from fractions import Fraction

from .core import exact


PREMISES = (
    'For each scalar target and candidate, calibration and new nonconformity scores are exchangeable.',
    'The predictor and nonconformity rule are frozen independently of calibration labels.',
    'Candidate generation and pool scope preserve the required marginal validity conditions.',
    'Recorded targets represent the intended outcomes; physical validity is not established here.',
)


def _count(value, name, minimum):
    if isinstance(value, bool) or not isinstance(value, int):
        raise TypeError(f'{name} must be an integer')
    if value < minimum:
        raise ValueError(f'{name} must be at least {minimum}')
    return value


def _probability(value, name):
    value = exact(value)
    if not 0 < value < 1:
        raise ValueError(f'{name} must be strictly between zero and one')
    return value


def _ceil(value: Fraction) -> int:
    return -(-value.numerator // value.denominator)


def split_conformal_rank(calibration_count: int, epsilon) -> int:
    """One-based conservative order-statistic rank; n+1 means unbounded."""
    n = _count(calibration_count, 'calibration_count', 0)
    epsilon = _probability(epsilon, 'epsilon')
    return _ceil((n + 1) * (1 - epsilon))


@dataclass(frozen=True)
class CalibrationPlan:
    calibration_count: int
    candidate_count: int
    target_count: int
    delta: Fraction
    event_count: int = field(init=False)
    epsilon: Fraction = field(init=False)
    rank: int = field(init=False)
    minimum_finite_calibration_count: int = field(init=False)
    outcome_kind: str = field(init=False)
    premises: tuple[str, ...] = field(default=PREMISES, init=False)
    premise_status: str = field(default='assumed_unverified', init=False)
    guarantee_status: str = field(default='conditional_arithmetic_only', init=False)

    def __post_init__(self):
        n = _count(self.calibration_count, 'calibration_count', 0)
        m = _count(self.candidate_count, 'candidate_count', 1)
        p = _count(self.target_count, 'target_count', 1)
        delta = _probability(self.delta, 'delta')
        events = m * p
        epsilon = delta / events
        rank = split_conformal_rank(n, epsilon)
        object.__setattr__(self, 'delta', delta)
        object.__setattr__(self, 'event_count', events)
        object.__setattr__(self, 'epsilon', epsilon)
        object.__setattr__(self, 'rank', rank)
        object.__setattr__(self, 'minimum_finite_calibration_count', _ceil(1 / epsilon) - 1)
        object.__setattr__(self, 'outcome_kind', 'finite' if rank <= n else 'unbounded')


def plan_calibration(calibration_count: int, candidate_count: int, delta,
                     target_count: int = 1) -> CalibrationPlan:
    """Allocate delta/(candidates*targets), counting score plus constraints.

    target_count is the number of scalar targets per candidate, including score.
    Each target needs its own residual calibration with the plan's sample count.
    No independence between targets or candidates is required by the union bound.
    """
    return CalibrationPlan(calibration_count, candidate_count, target_count, delta)


@dataclass(frozen=True)
class CalibrationOutcome:
    plan: CalibrationPlan
    radius: Fraction | None
    outcome_kind: str = field(init=False)
    reason: str = field(init=False)

    def __post_init__(self):
        if not isinstance(self.plan, CalibrationPlan):
            raise TypeError('plan must be a CalibrationPlan')
        if self.plan.outcome_kind == 'unbounded':
            if self.radius is not None:
                raise ValueError('unbounded outcome cannot have a finite radius')
            reason = 'required_rank_exceeds_calibration_count'
        else:
            if self.radius is None:
                raise ValueError('finite outcome requires a radius')
            radius = exact(self.radius)
            if radius < 0:
                raise ValueError('radius must be nonnegative')
            object.__setattr__(self, 'radius', radius)
            reason = 'finite_order_statistic_under_unverified_premises'
        object.__setattr__(self, 'outcome_kind', self.plan.outcome_kind)
        object.__setattr__(self, 'reason', reason)


def calibrate(residuals: Sequence[Fraction], plan: CalibrationPlan) -> CalibrationOutcome:
    """Calibrate one scalar target from nonnegative absolute-error scores.

    Validates all scores even when rank is unbounded; never clamps to sample max.
    """
    if not isinstance(plan, CalibrationPlan):
        raise TypeError('plan must be a CalibrationPlan')
    if not isinstance(residuals, Sequence) or isinstance(residuals, (str, bytes, bytearray)):
        raise TypeError('residuals must be a sequence of scores, excluding text and bytes')
    scores = tuple(exact(value) for value in residuals)
    if len(scores) != plan.calibration_count:
        raise ValueError('residual count does not match plan')
    if any(value < 0 for value in scores):
        raise ValueError('absolute-error residuals must be nonnegative')
    radius = sorted(scores)[plan.rank - 1] if plan.outcome_kind == 'finite' else None
    return CalibrationOutcome(plan, radius)
