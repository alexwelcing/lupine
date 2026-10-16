"""Exact, bounded prospective arithmetic; no observed outcomes or evidence claims.

The IID probabilities in this module are hypothetical assumptions supplied by
the caller. They are stronger than exchangeability and are never attested here.
"""
from dataclasses import dataclass, field
from fractions import Fraction
from math import comb
import re

from .calibration import split_conformal_rank
from .core import exact


MAXIMUM_PANEL_COUNT = 256
MAXIMUM_INPUT_BITS = 32
MAXIMUM_NUMERIC_TEXT_LENGTH = 128

# Deliberately exclude exponents: a short string such as "1e999999999" must
# never reach Fraction. The length check also precedes regex and parsing work.
_PLAIN_EXACT_NUMBER = re.compile(
    r'[+-]?(?:[0-9]+/[0-9]+|[0-9]+(?:\.[0-9]*)?|\.[0-9]+)\Z'
)

POOL_THRESHOLD_PREMISES = (
    'Prospective calibration panels have complete scores under a frozen scoring rule and fixed scope.',
    'The scoring rule is frozen independently of the prospective calibration panels.',
    'If supplied, p is a hypothetical common probability Pr(R <= cutoff), not an estimate established here.',
    'The binomial calculation assumes IID score events conditional on the frozen rule; exchangeability alone is insufficient.',
    'The event concerns the calibration threshold, not conditional coverage after selecting calibration outcomes.',
)

ZERO_FAILURE_PREMISES = (
    'A fixed binary failure endpoint and decision rule are frozen independently of prospective evaluation panels.',
    'Panel failure events are IID conditional on the frozen rule, with a common failure probability.',
    'All panels in the frozen evaluation population count; there is no conditioning on observed feasibility.',
    'Zero failures is a hypothetical best-case outcome, not an observed result or an independence attestation.',
)


def _bounded_count(value, name):
    if isinstance(value, bool) or not isinstance(value, int):
        raise TypeError(f'{name} must be an integer')
    if not 0 <= value <= MAXIMUM_PANEL_COUNT:
        raise ValueError(f'{name} must be between 0 and {MAXIMUM_PANEL_COUNT}')
    return value


def _bounded_exact(value, name):
    if isinstance(value, bool) or not isinstance(value, (int, str, Fraction)):
        raise TypeError(f'{name} must be Fraction, int, or a plain rational/decimal string')
    if isinstance(value, str):
        if len(value) > MAXIMUM_NUMERIC_TEXT_LENGTH:
            raise ValueError(f'{name} exceeds the numeric text length bound')
        if _PLAIN_EXACT_NUMBER.fullmatch(value.strip()) is None:
            raise ValueError(f'{name} must use plain integer, rational, or decimal notation without exponents')
    elif isinstance(value, int):
        if value.bit_length() > MAXIMUM_INPUT_BITS:
            raise ValueError(f'{name} exceeds the exact input bit bound')
    elif (value.numerator.bit_length() > MAXIMUM_INPUT_BITS
          or value.denominator.bit_length() > MAXIMUM_INPUT_BITS):
        raise ValueError(f'{name} exceeds the exact input bit bound')
    try:
        parsed = exact(value)
    except (ValueError, ZeroDivisionError) as error:
        raise ValueError(f'{name} is not a valid exact number') from error
    if (parsed.numerator.bit_length() > MAXIMUM_INPUT_BITS
            or parsed.denominator.bit_length() > MAXIMUM_INPUT_BITS):
        raise ValueError(f'{name} exceeds the exact input bit bound')
    return parsed


def _open_probability(value, name):
    parsed = _bounded_exact(value, name)
    if not 0 < parsed < 1:
        raise ValueError(f'{name} must be strictly between zero and one')
    return parsed


def _binomial_tail(n, rank, probability):
    # All terms share denominator b**n. Integer accumulation avoids rounding
    # and keeps the final numerator/denominator within 256 * 32 bits.
    a, b = probability.numerator, probability.denominator
    numerator = sum(comb(n, j) * a ** j * (b - a) ** (n - j)
                    for j in range(rank, n + 1))
    return Fraction(numerator, b ** n)


@dataclass(frozen=True)
class PoolThresholdPlan:
    calibration_count: int
    alpha: Fraction
    cutoff: Fraction
    iid_score_probability: Fraction | None = None
    rank: int = field(init=False)
    minimum_finite_calibration_count: int = field(init=False)
    finite_rank: bool = field(init=False)
    tolerated_above_cutoff: int | None = field(init=False)
    threshold_event_probability: Fraction | None = field(init=False)
    planning_status: str = field(init=False)
    adequacy_status: str = field(default='unestablished', init=False)
    calibrated_guarantee_status: str = field(default='not_established_by_planning', init=False)
    premise_status: str = field(default='hypothetical_unverified', init=False)
    event: str = field(default='tau <= cutoff', init=False)
    premises: tuple[str, ...] = field(default=POOL_THRESHOLD_PREMISES, init=False)
    maximum_panel_count: int = field(default=MAXIMUM_PANEL_COUNT, init=False)
    maximum_input_bits: int = field(default=MAXIMUM_INPUT_BITS, init=False)

    def __post_init__(self):
        n = _bounded_count(self.calibration_count, 'calibration_count')
        alpha = _open_probability(self.alpha, 'alpha')
        cutoff = _bounded_exact(self.cutoff, 'cutoff')
        if not 0 <= cutoff < 1:
            raise ValueError('cutoff must be at least zero and strictly less than one')
        probability = self.iid_score_probability
        if probability is not None:
            probability = _bounded_exact(probability, 'iid_score_probability')
            if not 0 <= probability <= 1:
                raise ValueError('iid_score_probability must be between zero and one')
        rank = split_conformal_rank(n, alpha)
        finite = rank <= n
        if not finite:
            event_probability = Fraction(0)
            status = 'rank_infeasible'
        elif probability is None:
            event_probability = None
            status = 'probability_unspecified'
        else:
            event_probability = _binomial_tail(n, rank, probability)
            status = 'hypothetical_iid'
        object.__setattr__(self, 'alpha', alpha)
        object.__setattr__(self, 'cutoff', cutoff)
        object.__setattr__(self, 'iid_score_probability', probability)
        object.__setattr__(self, 'rank', rank)
        object.__setattr__(self, 'minimum_finite_calibration_count',
                           -(-alpha.denominator // alpha.numerator) - 1)
        object.__setattr__(self, 'finite_rank', finite)
        object.__setattr__(self, 'tolerated_above_cutoff', n - rank if finite else None)
        object.__setattr__(self, 'threshold_event_probability', event_probability)
        object.__setattr__(self, 'planning_status', status)


def plan_pool_threshold(calibration_count, alpha, cutoff,
                        iid_score_probability=None) -> PoolThresholdPlan:
    """Plan Pr(tau <= cutoff) for complete scores and a prospective fixed n.

    The optional p supplies a hypothetical IID law. A missing p leaves the
    probability unknown unless the rank is infeasible, when the event is
    deterministically impossible. No finite rank establishes a useful cutoff,
    and this probability need not increase with calibration_count.
    """
    return PoolThresholdPlan(calibration_count, alpha, cutoff, iid_score_probability)


@dataclass(frozen=True)
class ZeroFailureResolutionPlan:
    loss_ceiling: Fraction
    significance: Fraction
    maximum_evaluation_panels: int
    minimum_evaluation_panels: int | None = field(init=False)
    zero_failure_null_bound: Fraction = field(init=False)
    minimum_zero_failure_null_bound: Fraction | None = field(init=False)
    resolution_status: str = field(init=False)
    power_status: str = field(default='not_computed', init=False)
    observed_evidence_status: str = field(default='no_observations', init=False)
    premise_status: str = field(default='hypothetical_unverified', init=False)
    null_hypothesis: str = field(default='common panel failure probability >= loss_ceiling', init=False)
    premises: tuple[str, ...] = field(default=ZERO_FAILURE_PREMISES, init=False)
    maximum_panel_count: int = field(default=MAXIMUM_PANEL_COUNT, init=False)
    maximum_input_bits: int = field(default=MAXIMUM_INPUT_BITS, init=False)

    def __post_init__(self):
        maximum = _bounded_count(self.maximum_evaluation_panels, 'maximum_evaluation_panels')
        rho = _open_probability(self.loss_ceiling, 'loss_ceiling')
        eta = _open_probability(self.significance, 'significance')
        chance = Fraction(1)
        minimum = None
        minimum_bound = None
        for count in range(1, maximum + 1):
            chance *= 1 - rho
            if minimum is None and chance <= eta:
                minimum = count
                minimum_bound = chance
        object.__setattr__(self, 'loss_ceiling', rho)
        object.__setattr__(self, 'significance', eta)
        object.__setattr__(self, 'minimum_evaluation_panels', minimum)
        object.__setattr__(self, 'zero_failure_null_bound', chance)
        object.__setattr__(self, 'minimum_zero_failure_null_bound', minimum_bound)
        object.__setattr__(self, 'resolution_status',
                           'sufficient_zero_failure_resolution' if minimum is not None
                           else 'insufficient_resolution')


def plan_zero_failure_resolution(loss_ceiling, significance,
                                 maximum_evaluation_panels) -> ZeroFailureResolutionPlan:
    """Find the first e >= 1 with (1-rho)**e <= eta within the input bound.

    This is exact best-case zero-failure resolution under a hypothetical IID
    null, not statistical power, observed evidence, or an estimate of risk.
    """
    return ZeroFailureResolutionPlan(loss_ceiling, significance, maximum_evaluation_panels)
