"""Independent finite-world and boundary checks for prospective planning.

These synthetic tests establish arithmetic conformance, not scientific power,
sampling validity, physical validity, or usefulness on any archived dataset.
The oracles do not import production probability or rank helpers.
"""
from fractions import Fraction as F
from itertools import product
import unittest

from lupine_discovery.study_planning import (
    plan_pool_threshold, plan_zero_failure_resolution,
)


def rank_from_integer_inequalities(n, alpha):
    """Find the first admissible rank directly, without ceiling arithmetic."""
    for position in range(1, n + 2):
        if position * alpha.denominator >= (
                (n + 1) * (alpha.denominator - alpha.numerator)):
            return position
    raise AssertionError('an admissible rank must exist')


def iid_world_probability(n, alpha, cutoff, probability):
    """Enumerate labeled Bernoulli worlds, including ties at the cutoff.

    Good worlds have a score exactly equal to the cutoff, so replacing weak
    threshold inclusion with strict comparison changes this oracle's result.
    No binomial coefficients, grouped-success counts, or production helpers
    are used to compute the event mass.
    """
    rank = rank_from_integer_inequalities(n, alpha)
    mass = F(0)
    total_mass = F(0)
    for world in product((False, True), repeat=n):
        weight = F(1)
        for good in world:
            weight *= probability if good else 1 - probability
        scores = sorted(cutoff if good else F(1) for good in world)
        threshold = scores[rank - 1] if rank <= n else F(1)
        total_mass += weight
        if threshold <= cutoff:
            mass += weight
    if total_mass != 1:
        raise AssertionError('oracle world masses must sum to one')
    return mass


def zero_failure_integer_oracle(rho, eta, maximum):
    """Exact null-event inequality via integer powers, with no probabilities."""
    for size in range(1, maximum + 1):
        left = (rho.denominator - rho.numerator) ** size * eta.denominator
        right = rho.denominator ** size * eta.numerator
        if left <= right:
            return size
    return None


class StudyPlanningIndependentReviewTests(unittest.TestCase):
    def test_exact_iid_event_against_all_small_labeled_worlds(self):
        checked = 0
        for n in range(8):
            for alpha in (F(1, 7), F(1, 2), F(3, 4)):
                for cutoff in (F(0), F(2, 3)):
                    for probability in (F(0), F(1, 3), F(1, 2), F(1)):
                        result = plan_pool_threshold(n, alpha, cutoff, probability)
                        expected = iid_world_probability(n, alpha, cutoff, probability)
                        self.assertEqual(result.threshold_event_probability, expected)
                        self.assertEqual(result.rank, rank_from_integer_inequalities(n, alpha))
                        self.assertEqual(result.adequacy_status, 'unestablished')
                        self.assertEqual(result.calibrated_guarantee_status,
                                         'not_established_by_planning')
                        checked += 1
        self.assertEqual(checked, 192)

    def test_finite_rank_equality_boundary_and_bad_score_capacity(self):
        for n in range(1, 32):
            boundary = F(1, n + 1)
            at = plan_pool_threshold(n, boundary, F(3, 4))
            below = plan_pool_threshold(n, boundary - F(1, 100000), F(3, 4))
            self.assertEqual((at.rank, at.finite_rank, at.tolerated_above_cutoff),
                             (n, True, 0))
            self.assertEqual(at.minimum_finite_calibration_count, n)
            self.assertIsNone(at.threshold_event_probability)
            self.assertEqual(at.planning_status, 'probability_unspecified')
            self.assertEqual((below.rank, below.finite_rank), (n + 1, False))
            self.assertIsNone(below.tolerated_above_cutoff)
            self.assertEqual(below.threshold_event_probability, 0)
            for alpha in (F(1, 5), F(1, 2), F(4, 5)):
                result = plan_pool_threshold(n, alpha, F(1, 2))
                if result.finite_rank:
                    # Direct integer floor, independently checking n-k identity.
                    expected = ((n + 1) * alpha.numerator // alpha.denominator) - 1
                    self.assertEqual(result.tolerated_above_cutoff, expected)

    def test_rank_jump_can_reduce_probability_when_sample_count_increases(self):
        p = F(19, 20)
        nineteen = plan_pool_threshold(19, F(1, 10), F(3, 4), p)
        twenty = plan_pool_threshold(20, F(1, 10), F(3, 4), p)
        # There may be zero or one bad score. Count those labeled worlds directly.
        expected_nineteen = p ** 19 + sum((1 - p) * p ** 18 for _ in range(19))
        expected_twenty = p ** 20 + sum((1 - p) * p ** 19 for _ in range(20))
        self.assertEqual((nineteen.rank, twenty.rank), (18, 19))
        self.assertEqual(nineteen.threshold_event_probability, expected_nineteen)
        self.assertEqual(twenty.threshold_event_probability, expected_twenty)
        self.assertEqual(expected_twenty / expected_nineteen, F(741, 760))
        self.assertLess(twenty.threshold_event_probability,
                        nineteen.threshold_event_probability)

    def test_exchangeability_does_not_supply_the_iid_probability(self):
        cutoff = F(1, 2)
        result = plan_pool_threshold(2, F(1, 2), cutoff, F(1, 2))
        # Each coordinate has Pr(R <= cutoff)=1/2. Both atoms are invariant
        # under every coordinate permutation, but the coordinates are dependent.
        law = (((cutoff, cutoff), F(1, 2)), ((F(1), F(1)), F(1, 2)))
        for coordinate in range(2):
            self.assertEqual(sum(weight for scores, weight in law
                                 if scores[coordinate] <= cutoff), F(1, 2))
        correlated_event_mass = sum(weight for scores, weight in law
                                    if sorted(scores)[1] <= cutoff)
        self.assertEqual(correlated_event_mass, F(1, 2))
        self.assertEqual(result.threshold_event_probability, F(1, 4))
        self.assertNotEqual(result.threshold_event_probability, correlated_event_mass)
        self.assertEqual(result.planning_status, 'hypothetical_iid')

    def test_no_count_guarantees_reduction_without_a_score_law(self):
        # All-score-one laws always fail a cutoff below one. A missing law
        # is not silently replaced by an estimate derived from the sample count.
        for n in (0, 1, 9, 20, 256):
            all_scores_one = plan_pool_threshold(n, F(1, 10), F(99, 100), F(0))
            unspecified = plan_pool_threshold(n, F(1, 10), F(99, 100))
            self.assertEqual(all_scores_one.threshold_event_probability, 0)
            self.assertEqual(unspecified.adequacy_status, 'unestablished')
            if unspecified.finite_rank:
                self.assertIsNone(unspecified.threshold_event_probability)

    def test_zero_failure_resolution_against_integer_inequality_oracle(self):
        checked = 0
        for rho in (F(1, 20), F(1, 10), F(1, 3), F(2, 3)):
            for eta in (F(1, 20), F(1, 4), F(1, 2)):
                for maximum in (0, 1, 5, 28, 29, 58, 59, 256):
                    expected = zero_failure_integer_oracle(rho, eta, maximum)
                    result = plan_zero_failure_resolution(rho, eta, maximum)
                    self.assertEqual(result.minimum_evaluation_panels, expected)
                    self.assertEqual(result.zero_failure_null_bound, (1 - rho) ** maximum)
                    self.assertEqual(result.minimum_zero_failure_null_bound,
                                     None if expected is None else (1 - rho) ** expected)
                    self.assertEqual(result.power_status, 'not_computed')
                    self.assertEqual(result.observed_evidence_status, 'no_observations')
                    checked += 1
        self.assertEqual(checked, 96)

    def test_exact_zero_failure_boundary_and_bounded_no_solution(self):
        # Equality must pass; immediately stricter significance must require
        # another observation. This does not use approximate logarithms.
        for exponent in range(1, 20):
            eta = F(1, 2 ** exponent)
            at = plan_zero_failure_resolution(F(1, 2), eta, exponent)
            below = plan_zero_failure_resolution(F(1, 2), eta - F(1, 2 ** (exponent + 1)), exponent)
            self.assertEqual(at.minimum_evaluation_panels, exponent)
            self.assertEqual(at.minimum_zero_failure_null_bound, eta)
            self.assertIsNone(below.minimum_evaluation_panels)
            self.assertEqual(below.resolution_status, 'insufficient_resolution')
        self.assertEqual(plan_zero_failure_resolution(F(1, 10), F(1, 20), 29)
                         .minimum_evaluation_panels, 29)
        self.assertIsNone(plan_zero_failure_resolution(F(1, 10), F(1, 20), 28)
                          .minimum_evaluation_panels)
        self.assertEqual(plan_zero_failure_resolution(F(1, 20), F(1, 20), 59)
                         .minimum_evaluation_panels, 59)
        bounded = plan_zero_failure_resolution(F(1, 1000), F(1, 20), 256)
        self.assertIsNone(bounded.minimum_evaluation_panels)
        self.assertEqual(bounded.power_status, 'not_computed')

    def test_fixed_count_and_probability_input_resource_boundaries(self):
        for count in (-1, 257, 10 ** 100):
            with self.assertRaises(ValueError):
                plan_pool_threshold(count, '1/2', '1/2')
            with self.assertRaises(ValueError):
                plan_zero_failure_resolution('1/2', '1/2', count)
        for count in (True, False, 2.0, '2'):
            with self.assertRaises(TypeError):
                plan_pool_threshold(count, '1/2', '1/2')
            with self.assertRaises(TypeError):
                plan_zero_failure_resolution('1/2', '1/2', count)
        for numeric in (True, False, 0.5, float('nan'), float('inf')):
            for position in range(3):
                values = ['1/2', '1/2', '1/2']
                values[position] = numeric
                with self.assertRaises(TypeError):
                    plan_pool_threshold(2, *values)
            with self.assertRaises(TypeError):
                plan_zero_failure_resolution(numeric, '1/2', 2)
        for oversized in ('1e999999999', '1e-999999999', '0.' + '0' * 10000 + '1',
                          str(2 ** 32), '1/' + str(2 ** 32), F(1, 2 ** 32)):
            with self.assertRaises(ValueError):
                plan_pool_threshold(2, '1/2', '1/2', oversized)
            with self.assertRaises(ValueError):
                plan_zero_failure_resolution(oversized, '1/2', 2)
        # Maximum permitted denominator is accepted without rounding.
        permitted = F(1, 2 ** 32 - 1)
        self.assertEqual(plan_pool_threshold(2, '1/2', '1/2', permitted)
                         .threshold_event_probability, permitted ** 2)


if __name__ == '__main__':
    unittest.main()
