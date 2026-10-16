"""Prospective planning boundaries and bounded exact input handling."""
from dataclasses import FrozenInstanceError, asdict
from fractions import Fraction
import json
import unittest
from unittest.mock import patch

from lupine_discovery.study_planning import (
    MAXIMUM_INPUT_BITS, MAXIMUM_PANEL_COUNT, MAXIMUM_NUMERIC_TEXT_LENGTH,
    PoolThresholdPlan, ZeroFailureResolutionPlan,
    plan_pool_threshold, plan_zero_failure_resolution,
)


class PoolThresholdPlanningTests(unittest.TestCase):
    def test_no_calibration_is_infeasible_even_if_every_score_would_succeed(self):
        for probability in (None, 0, 1):
            plan = plan_pool_threshold(0, '1/10', '1/2', probability)
            self.assertEqual(plan.rank, 1)
            self.assertFalse(plan.finite_rank)
            self.assertIsNone(plan.tolerated_above_cutoff)
            self.assertEqual(plan.threshold_event_probability, 0)
            self.assertEqual(plan.planning_status, 'rank_infeasible')
            self.assertEqual(plan.calibrated_guarantee_status, 'not_established_by_planning')

    def test_finite_rank_boundary_does_not_supply_a_probability(self):
        below = plan_pool_threshold(8, '0.1', '3/4')
        boundary = plan_pool_threshold(9, '0.1', '3/4')
        self.assertEqual(below.minimum_finite_calibration_count, 9)
        self.assertFalse(below.finite_rank)
        self.assertTrue(boundary.finite_rank)
        self.assertEqual(boundary.rank, 9)
        self.assertEqual(boundary.tolerated_above_cutoff, 0)
        self.assertIsNone(boundary.threshold_event_probability)
        self.assertEqual(boundary.planning_status, 'probability_unspecified')
        self.assertEqual(boundary.adequacy_status, 'unestablished')
        tiny_alpha = plan_pool_threshold(256, '1/4294967295', '1/2')
        self.assertEqual(tiny_alpha.minimum_finite_calibration_count, 4294967294)
        self.assertFalse(tiny_alpha.finite_rank)

    def test_fair_coin_worlds_have_hand_counted_probabilities(self):
        # Of eight equiprobable triples, four have at least two successes.
        three = plan_pool_threshold(3, '1/2', '1/2', '1/2')
        self.assertEqual(three.rank, 2)
        self.assertEqual(three.threshold_event_probability, Fraction(4, 8))
        # Of sixteen quadruples, the four single-failure worlds and the
        # all-success world have at least three successes.
        four = plan_pool_threshold(4, '1/2', '1/2', '1/2')
        self.assertEqual(four.rank, 3)
        self.assertEqual(four.threshold_event_probability, Fraction(5, 16))

    def test_probability_can_decrease_when_one_calibration_panel_is_added(self):
        nineteen = plan_pool_threshold(19, '1/10', '3/4', '19/20')
        twenty = plan_pool_threshold(20, '1/10', '3/4', '19/20')
        self.assertEqual((nineteen.rank, twenty.rank), (18, 19))
        self.assertEqual((nineteen.tolerated_above_cutoff, twenty.tolerated_above_cutoff), (1, 1))
        self.assertLess(twenty.threshold_event_probability, nineteen.threshold_event_probability)
        # Coupled-world difference: the first 19 contain one failure and the
        # added panel fails. The 19-panel rule passes; the 20-panel rule fails.
        self.assertEqual(nineteen.threshold_event_probability - twenty.threshold_event_probability,
                         19 * Fraction(19, 20) ** 18 * Fraction(1, 20) ** 2)

    def test_all_score_one_law_defeats_every_nontrivial_cutoff(self):
        for cutoff in (0, '1/2', '4294967294/4294967295'):
            plan = plan_pool_threshold(99, '1/10', cutoff, 0)
            self.assertTrue(plan.finite_rank)
            self.assertEqual(plan.threshold_event_probability, 0)
            self.assertEqual(plan.adequacy_status, 'unestablished')

    def test_endpoint_probabilities_and_cutoff_do_not_invent_a_cdf(self):
        for probability in (0, 1):
            plan = plan_pool_threshold(9, '1/10', 0, probability)
            self.assertEqual(plan.threshold_event_probability, probability)
            self.assertEqual(plan.planning_status, 'hypothetical_iid')
        low = plan_pool_threshold(9, '1/10', '1/4', '3/4')
        high = plan_pool_threshold(9, '1/10', '3/4', '3/4')
        self.assertEqual(low.threshold_event_probability, high.threshold_event_probability)
        self.assertNotEqual(low.cutoff, high.cutoff)


class ZeroFailureResolutionTests(unittest.TestCase):
    def test_known_29_and_59_panel_resolutions(self):
        for ceiling, expected in [('1/10', 29), ('1/20', 59)]:
            plan = plan_zero_failure_resolution(ceiling, '1/20', 100)
            self.assertEqual(plan.minimum_evaluation_panels, expected)
            self.assertLessEqual(plan.minimum_zero_failure_null_bound, Fraction(1, 20))
            self.assertGreater((1 - Fraction(ceiling)) ** (expected - 1), Fraction(1, 20))
            self.assertEqual(plan.zero_failure_null_bound, (1 - Fraction(ceiling)) ** 100)
            self.assertEqual(plan.resolution_status, 'sufficient_zero_failure_resolution')
            self.assertEqual(plan.power_status, 'not_computed')
            self.assertEqual(plan.observed_evidence_status, 'no_observations')

    def test_empty_budget_and_insufficient_cap_are_not_global_impossibility(self):
        empty = plan_zero_failure_resolution('1/10', '1/20', 0)
        self.assertIsNone(empty.minimum_evaluation_panels)
        self.assertIsNone(empty.minimum_zero_failure_null_bound)
        self.assertEqual(empty.zero_failure_null_bound, 1)
        limited = plan_zero_failure_resolution('1/10', '1/20', 28)
        self.assertIsNone(limited.minimum_evaluation_panels)
        self.assertEqual(limited.resolution_status, 'insufficient_resolution')
        self.assertGreater(limited.zero_failure_null_bound, Fraction(1, 20))
        sufficient = plan_zero_failure_resolution('1/10', '1/20', 29)
        self.assertEqual(sufficient.minimum_evaluation_panels, 29)

    def test_exact_equality_qualifies_without_a_float_boundary(self):
        equal = plan_zero_failure_resolution('1/2', '1/8', 3)
        self.assertEqual(equal.minimum_evaluation_panels, 3)
        self.assertEqual(equal.minimum_zero_failure_null_bound, Fraction(1, 8))
        just_below = plan_zero_failure_resolution('1/2', '1/9', 4)
        self.assertEqual(just_below.minimum_evaluation_panels, 4)
        self.assertEqual(just_below.minimum_zero_failure_null_bound, Fraction(1, 16))


class PlannerInputAndOutputTests(unittest.TestCase):
    def test_plain_exact_spellings_and_frozen_public_constructors(self):
        plan = PoolThresholdPlan(9, ' .1 ', '+3/4', Fraction(19, 20))
        self.assertEqual(plan.alpha, Fraction(1, 10))
        self.assertEqual(plan.cutoff, Fraction(3, 4))
        self.assertIsInstance(plan.premises, tuple)
        with self.assertRaises(FrozenInstanceError):
            plan.alpha = Fraction(1, 2)
        resolution = ZeroFailureResolutionPlan('0.10', '.05', 29)
        self.assertEqual(resolution.loss_ceiling, Fraction(1, 10))
        with self.assertRaises(FrozenInstanceError):
            resolution.minimum_evaluation_panels = 1
        with self.assertRaises(ValueError):
            PoolThresholdPlan(257, '1/10', '1/2')
        with self.assertRaises(ValueError):
            ZeroFailureResolutionPlan('1/10', '1/20', -1)

    def test_count_and_probability_types(self):
        for count in (True, False, 1.0, '9', None):
            with self.subTest(count=count):
                with self.assertRaises(TypeError):
                    plan_pool_threshold(count, '1/10', '1/2')
                with self.assertRaises(TypeError):
                    plan_zero_failure_resolution('1/10', '1/20', count)
        for invalid in (True, False, .1, float('inf'), float('nan'), None, [], {}):
            with self.subTest(invalid=invalid):
                with self.assertRaises(TypeError):
                    plan_pool_threshold(9, invalid, '1/2')
                with self.assertRaises(TypeError):
                    plan_zero_failure_resolution('1/10', invalid, 29)
        for invalid in (0, 1, -1, '1.01'):
            with self.assertRaises(ValueError):
                plan_pool_threshold(9, invalid, '1/2')
            with self.assertRaises(ValueError):
                plan_zero_failure_resolution(invalid, '1/20', 29)

    def test_cutoff_and_cdf_ranges_are_checked_even_for_infeasible_rank(self):
        for invalid in (1, -1, '1.01'):
            with self.assertRaises(ValueError):
                plan_pool_threshold(0, '1/10', invalid)
        for invalid in (-1, '1.01'):
            with self.assertRaises(ValueError):
                plan_pool_threshold(0, '1/10', '1/2', invalid)
        for invalid in (True, .5):
            with self.assertRaises(TypeError):
                plan_pool_threshold(0, '1/10', '1/2', invalid)
        for invalid in ('', 'nan', '1/0', '1//2', '1_000', '1/-2'):
            with self.assertRaises(ValueError):
                plan_pool_threshold(9, invalid, '1/2')

    def test_large_or_exponent_inputs_are_rejected_before_fraction_parser(self):
        invalids = ('1e999999999', '1e-999999999', '1E2',
                    '0' * (MAXIMUM_NUMERIC_TEXT_LENGTH + 1),
                    1 << MAXIMUM_INPUT_BITS, Fraction(1, 1 << MAXIMUM_INPUT_BITS))
        with patch('lupine_discovery.study_planning.exact',
                   side_effect=AssertionError('unbounded input reached Fraction parser')):
            for invalid in invalids:
                with self.subTest(invalid=str(invalid)[:50]):
                    with self.assertRaises(ValueError):
                        plan_pool_threshold(9, invalid, '1/2')
            for count in (-1, MAXIMUM_PANEL_COUNT + 1, 1 << 100000):
                with self.assertRaises(ValueError):
                    plan_pool_threshold(count, '1/10', '1/2')
                with self.assertRaises(ValueError):
                    plan_zero_failure_resolution('1/10', '1/20', count)

    def test_normalized_exact_bits_and_maximum_result_remain_serializable(self):
        for invalid in ('1/4294967296', '0.0000000001', Fraction(1, 4294967296)):
            with self.assertRaises(ValueError):
                plan_pool_threshold(9, invalid, '1/2')
        plan = plan_pool_threshold(256, '1/2', '1/2', '4294967294/4294967295')
        tail = plan.threshold_event_probability
        self.assertLessEqual(tail.numerator.bit_length(), 256 * 32)
        self.assertLessEqual(tail.denominator.bit_length(), 256 * 32)
        encoded = json.dumps(asdict(plan), default=str)
        self.assertIn('hypothetical_iid', encoded)
        self.assertLess(len(str(tail.numerator)), 4300)
        self.assertLess(len(str(tail.denominator)), 4300)
        resolution = plan_zero_failure_resolution('1/4294967295', '1/20', 256)
        json.dumps(asdict(resolution), default=str)
        self.assertIsNone(resolution.minimum_evaluation_panels)


if __name__ == '__main__':
    unittest.main()
