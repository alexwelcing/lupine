"""Exact prospective zero-failure resolution in a frozen finite panel frame.

Probability refers only to uniformly sampling distinct IDs without replacement.
No IID outcome model, observed archive result, or future-population risk is
established by this arithmetic. The separate IID planner retains its contract.
"""
from dataclasses import dataclass, field
from fractions import Fraction
from math import comb

from .study_planning import (
    MAXIMUM_INPUT_BITS, MAXIMUM_PANEL_COUNT, _bounded_count, _open_probability,
)


FINITE_ZERO_FAILURE_PREMISES = (
    'After calibration and policy freeze, the complete residual population is a fixed finite frame of distinct panel IDs, frozen before evaluation selection.',
    'A fixed decision policy and one complete binary failure endpoint per panel are frozen before evaluation selection.',
    'Every subset of the chosen size is equally likely: panel IDs are sampled uniformly without replacement, independently of their failure labels.',
    'The probability conditions on the frozen policy, calibration and residual frame, not on the realized evaluation subset or its full allocation transcript.',
    'The sample size is fixed before evaluation outcomes; all selected panels count, with no adaptive stopping, outcome-dependent exclusion, redraw, policy tuning, or unaccounted repeated testing.',
    'Population membership and endpoint labels remain fixed, with no intervention changing those labels; no IID model for panel failures is assumed.',
    'Zero failures is a hypothetical outcome, not an observed result or an attestation of these sampling premises.',
    'The conclusion concerns only the frozen residual finite population, not an unsampled or future population.',
)


def _zero_failure_tail(population, failures, count):
    """Uniform-subset probability, with impossible zero-failure events explicit."""
    nonfailures = population - failures
    if count > nonfailures:
        return Fraction(0)
    return Fraction(comb(nonfailures, count), comb(population, count))


@dataclass(frozen=True)
class FiniteZeroFailureResolutionPlan:
    population_panels: int
    loss_ceiling: Fraction
    significance: Fraction
    maximum_evaluation_panels: int
    minimum_null_failures: int = field(init=False)
    attainable_null_failure_fraction: Fraction = field(init=False)
    minimum_evaluation_panels: int | None = field(init=False)
    zero_failure_null_bound: Fraction = field(init=False)
    minimum_zero_failure_null_bound: Fraction | None = field(init=False)
    resolution_status: str = field(init=False)
    adequacy_status: str = field(default='unestablished', init=False)
    power_status: str = field(default='not_computed', init=False)
    observed_evidence_status: str = field(default='no_observations', init=False)
    premise_status: str = field(default='hypothetical_unverified', init=False)
    future_population_risk_status: str = field(default='not_established', init=False)
    claim_scope: str = field(default='frozen_residual_finite_population_only', init=False)
    sampling_design: str = field(default='uniform_without_replacement', init=False)
    null_hypothesis: str = field(
        default='fixed finite-population failure fraction >= loss_ceiling', init=False)
    premises: tuple[str, ...] = field(default=FINITE_ZERO_FAILURE_PREMISES, init=False)
    maximum_panel_count: int = field(default=MAXIMUM_PANEL_COUNT, init=False)
    maximum_input_bits: int = field(default=MAXIMUM_INPUT_BITS, init=False)

    def __post_init__(self):
        population = _bounded_count(self.population_panels, 'population_panels')
        if population == 0:
            raise ValueError('population_panels must be positive')
        maximum = _bounded_count(self.maximum_evaluation_panels,
                                 'maximum_evaluation_panels')
        if maximum > population:
            raise ValueError('maximum_evaluation_panels cannot exceed population_panels')
        rho = _open_probability(self.loss_ceiling, 'loss_ceiling')
        eta = _open_probability(self.significance, 'significance')
        minimum_failures = (rho.numerator * population) // rho.denominator
        chance = Fraction(1)
        minimum = None
        minimum_bound = None
        for count in range(1, maximum + 1):
            chance = _zero_failure_tail(population, minimum_failures, count)
            if minimum is None and chance <= eta:
                minimum = count
                minimum_bound = chance
        object.__setattr__(self, 'loss_ceiling', rho)
        object.__setattr__(self, 'significance', eta)
        object.__setattr__(self, 'minimum_null_failures', minimum_failures)
        object.__setattr__(self, 'attainable_null_failure_fraction',
                           Fraction(minimum_failures, population))
        object.__setattr__(self, 'minimum_evaluation_panels', minimum)
        object.__setattr__(self, 'zero_failure_null_bound', chance)
        object.__setattr__(self, 'minimum_zero_failure_null_bound', minimum_bound)
        object.__setattr__(self, 'resolution_status',
                           'sufficient_zero_failure_resolution' if minimum is not None
                           else 'insufficient_resolution')


def plan_finite_zero_failure_resolution(population_panels, loss_ceiling,
                                        significance, maximum_evaluation_panels
                                        ) -> FiniteZeroFailureResolutionPlan:
    """Find the first positive e with an exact finite-frame null tail <= eta.

    For K_min=ceil(rho*M), the tail is C(M-K_min,e)/C(M,e), or zero when
    e>M-K_min. Its probability is over uniform sampling of distinct IDs from
    a fixed complete residual population. This is hypothetical resolution,
    not power, an observed test, or a guarantee about future panels.
    """
    return FiniteZeroFailureResolutionPlan(
        population_panels, loss_ceiling, significance, maximum_evaluation_panels)
