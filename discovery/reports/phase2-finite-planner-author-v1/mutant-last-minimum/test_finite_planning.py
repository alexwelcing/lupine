"""Independent finite-world counting and boundary tests; no scientific data."""
from dataclasses import FrozenInstanceError
from fractions import Fraction as F
from itertools import combinations, product
import inspect
import json
import unittest
from unittest.mock import patch

from lupine_discovery.finite_planning import (
    FiniteZeroFailureResolutionPlan, plan_finite_zero_failure_resolution as plan,
)
from lupine_discovery.serialization import encode
from lupine_discovery.study_planning import plan_zero_failure_resolution


def enumerated_worlds(population):
    """Enumerate fixed label worlds and all samples, without the formula under test."""
    samples = [tuple(combinations(range(population), count))
               for count in range(population + 1)]
    worlds = []
    for labels in product((0, 1), repeat=population):
        chances = tuple(F(sum(all(labels[index] == 0 for index in chosen)
                              for chosen in subsets), len(subsets))
                        for subsets in samples)
        worlds.append((sum(labels), chances))
    return worlds


class FinitePlanningWorldTests(unittest.TestCase):
    def test_exhaustive_binary_worlds_and_distinct_subsets_match_null_supremum(self):
        # Every labelled population of sizes 1..7 and every subset are counted.
        # The oracle neither calls math.comb nor evaluates the implementation's
        # hypergeometric formula. Only worlds satisfying the null are included.
        for population in range(1, 8):
            worlds = enumerated_worlds(population)
            ceilings = {F(1, population + 1), F(1, 2),
                        F(2 * population - 1, 2 * population)}
            if population > 1:
                ceilings |= {F(1, population), F(population - 1, population)}
            for rho in sorted(ceilings):
                null_worlds = [(failures, chance) for failures, chance in worlds
                               if F(failures, population) >= rho]
                expected = tuple(max(chance[count] for _, chance in null_worlds)
                                 for count in range(population + 1))
                for eta in (F(1, 20), F(1, 3), F(1, 2)):
                    for cap in range(population + 1):
                        with self.subTest(M=population, rho=rho, eta=eta, cap=cap):
                            value = plan(population, rho, eta, cap)
                            qualifying = [count for count in range(1, cap + 1)
                                          if expected[count] <= eta]
                            minimum = qualifying[0] if qualifying else None
                            self.assertEqual(value.zero_failure_null_bound, expected[cap])
                            self.assertEqual(value.minimum_evaluation_panels, minimum)
                            self.assertEqual(value.minimum_zero_failure_null_bound,
                                             expected[minimum] if minimum else None)
                            self.assertEqual(value.minimum_null_failures,
                                             min(failures for failures, _ in null_worlds))

    def test_hand_counted_without_replacement_differs_from_iid(self):
        # Four IDs, two failures. Of six unordered pairs only the pair of
        # nonfailures has zero failures; an IID calculation instead gives 1/4.
        finite = plan(4, '1/2', '1/5', 2)
        iid = plan_zero_failure_resolution('1/2', '1/5', 2)
        self.assertEqual(finite.zero_failure_null_bound, F(1, 6))
        self.assertEqual(finite.minimum_evaluation_panels, 2)
        self.assertEqual(iid.zero_failure_null_bound, F(1, 4))
        self.assertIsNone(iid.minimum_evaluation_panels)

    def test_ceiling_respects_attainable_fractions_and_exact_jump(self):
        exact = plan(10, '1/5', '1/2', 1)
        above = plan(10, '200000001/1000000000', '1/2', 1)
        below = plan(10, '199999999/1000000000', '1/2', 1)
        self.assertEqual((below.minimum_null_failures, exact.minimum_null_failures,
                          above.minimum_null_failures), (2, 2, 3))
        self.assertEqual(exact.attainable_null_failure_fraction, F(1, 5))
        self.assertEqual(above.attainable_null_failure_fraction, F(3, 10))
        self.assertEqual(exact.zero_failure_null_bound, F(4, 5))
        self.assertEqual(above.zero_failure_null_bound, F(7, 10))

    def test_equality_qualifies_and_just_smaller_significance_does_not(self):
        exact = plan(4, '1/2', '1/6', 2)
        below = plan(4, '1/2', '1/7', 2)
        self.assertEqual(exact.minimum_evaluation_panels, 2)
        self.assertEqual(exact.minimum_zero_failure_null_bound, F(1, 6))
        self.assertIsNone(below.minimum_evaluation_panels)
        self.assertEqual(below.resolution_status, 'insufficient_resolution')

    def test_zero_cap_census_singleton_and_impossible_tail(self):
        empty = plan(4, '1/2', '1/20', 0)
        self.assertEqual(empty.zero_failure_null_bound, 1)
        self.assertIsNone(empty.minimum_evaluation_panels)
        self.assertIsNone(empty.minimum_zero_failure_null_bound)
        # e=M-K_min is still possible; the next sample size makes the zero
        # failure event impossible under every null world, before a census.
        boundary = plan(4, '1/2', '1/20', 2)
        impossible = plan(4, '1/2', '1/20', 3)
        census = plan(4, '1/2', '1/20', 4)
        self.assertEqual(boundary.zero_failure_null_bound, F(1, 6))
        self.assertEqual(impossible.zero_failure_null_bound, 0)
        self.assertEqual(impossible.minimum_evaluation_panels, 3)
        self.assertEqual(census.minimum_evaluation_panels, 3)
        self.assertEqual(census.zero_failure_null_bound, 0)
        singleton = plan(1, '1/2', '1/20', 1)
        self.assertEqual(singleton.minimum_null_failures, 1)
        self.assertEqual(singleton.minimum_evaluation_panels, 1)
        self.assertEqual(singleton.zero_failure_null_bound, 0)

    def test_one_failure_null_has_linear_remaining_fraction(self):
        # With precisely one failing ID, excluding it has probability (M-e)/M.
        for population in range(1, 25):
            for count in range(population + 1):
                value = plan(population, F(1, population + 1), '1/20', count)
                self.assertEqual(value.minimum_null_failures, 1)
                self.assertEqual(value.zero_failure_null_bound,
                                 F(population - count, population))

    def test_minimum_stays_minimum_after_cap_increases(self):
        at = plan(4, '1/2', '1/2', 1)
        later = plan(4, '1/2', '1/2', 4)
        self.assertEqual(at.minimum_evaluation_panels, 1)
        self.assertEqual(later.minimum_evaluation_panels, 1)
        self.assertEqual(later.minimum_zero_failure_null_bound, F(1, 2))
        self.assertEqual(later.zero_failure_null_bound, 0)


class FinitePlanningContractTests(unittest.TestCase):
    def test_frozen_direct_constructor_and_serialization_do_not_promote_claims(self):
        value = FiniteZeroFailureResolutionPlan(4, ' .5 ', '+1/6', 2)
        self.assertEqual(value.loss_ceiling, F(1, 2))
        self.assertEqual(value.significance, F(1, 6))
        self.assertIsInstance(value.premises, tuple)
        with self.assertRaises(FrozenInstanceError):
            value.minimum_evaluation_panels = 1
        encoded = json.loads(json.dumps(encode(value)))
        self.assertEqual(encoded['zero_failure_null_bound'], '1/6')
        self.assertEqual(encoded['attainable_null_failure_fraction'], '1/2')
        self.assertEqual(encoded['adequacy_status'], 'unestablished')
        self.assertEqual(encoded['power_status'], 'not_computed')
        self.assertEqual(encoded['observed_evidence_status'], 'no_observations')
        self.assertEqual(encoded['premise_status'], 'hypothetical_unverified')
        self.assertEqual(encoded['future_population_risk_status'], 'not_established')
        self.assertEqual(encoded['claim_scope'], 'frozen_residual_finite_population_only')
        self.assertEqual(encoded['sampling_design'], 'uniform_without_replacement')
        insufficient = json.loads(json.dumps(encode(plan(4, '1/2', '1/20', 0))))
        self.assertIsNone(insufficient['minimum_evaluation_panels'])
        self.assertIsNone(insufficient['minimum_zero_failure_null_bound'])

    def test_no_outcome_path_or_claim_override_parameters(self):
        self.assertEqual(tuple(inspect.signature(plan).parameters),
                         ('population_panels', 'loss_ceiling', 'significance',
                          'maximum_evaluation_panels'))
        for extra in ('outcomes', 'source_path', 'sample_ids', 'adequacy_status',
                      'premise_status', 'future_population_risk_status'):
            with self.subTest(extra=extra), self.assertRaises(TypeError):
                plan(4, '1/2', '1/20', 2, **{extra: 'unread'})
            with self.subTest(extra=extra), self.assertRaises(TypeError):
                FiniteZeroFailureResolutionPlan(4, '1/2', '1/20', 2,
                                                **{extra: 'unread'})

    def test_counts_reject_bool_noninteger_empty_population_and_oversized_cap(self):
        for value in (True, False, 4.0, '4', None, F(4)):
            with self.subTest(value=value), self.assertRaises(TypeError):
                plan(value, '1/2', '1/20', 0)
            with self.subTest(value=value), self.assertRaises(TypeError):
                plan(4, '1/2', '1/20', value)
        for population in (0, -1, 257, 1 << 100000):
            with self.assertRaises(ValueError):
                plan(population, '1/2', '1/20', 0)
        for cap in (-1, 5, 257, 1 << 100000):
            with self.assertRaises(ValueError):
                plan(4, '1/2', '1/20', cap)

    def test_probabilities_are_validated_even_when_cap_is_zero(self):
        for invalid in (True, False, .5, float('inf'), float('nan'), None, [], {}):
            for position in (1, 2):
                args = [4, '1/2', '1/20', 0]
                args[position] = invalid
                with self.subTest(position=position), self.assertRaises(TypeError):
                    plan(*args)
        for invalid in (0, 1, -1, '1.01', '', 'nan', '1/0', '1//2', '1_000', '1/-2'):
            for position in (1, 2):
                args = [4, '1/2', '1/20', 0]
                args[position] = invalid
                with self.subTest(position=position), self.assertRaises(ValueError):
                    plan(*args)

    def test_resource_checks_precede_unbounded_fraction_parsing(self):
        invalids = ('1e999999999', '1e-999999999', '1E2', '0' * 129,
                    1 << 32, F(1, 1 << 32))
        with patch('lupine_discovery.study_planning.exact',
                   side_effect=AssertionError('invalid resource reached exact parser')):
            for invalid in invalids:
                with self.assertRaises(ValueError):
                    plan(4, invalid, '1/20', 0)
                # Validate rho before testing eta; do not let that legitimate
                # parse obscure whether invalid eta reaches the parser.
                with patch('lupine_discovery.finite_planning._open_probability') as parser:
                    from lupine_discovery.study_planning import _open_probability
                    parser.side_effect = lambda value, name: (
                        F(1, 2) if name == 'loss_ceiling'
                        else _open_probability(value, name))
                    with self.assertRaises(ValueError):
                        plan(4, '1/2', invalid, 0)

    def test_normalized_bit_bound_and_largest_population_remain_exact(self):
        for invalid in ('1/4294967296', '0.0000000001', F(1, 4294967296)):
            with self.assertRaises(ValueError):
                plan(256, invalid, '1/20', 256)
            with self.assertRaises(ValueError):
                plan(256, '1/2', invalid, 256)
        tiny = plan(256, '1/4294967295', '1/4294967295', 256)
        self.assertEqual(tiny.minimum_null_failures, 1)
        self.assertEqual(tiny.minimum_evaluation_panels, 256)
        self.assertEqual(tiny.zero_failure_null_bound, 0)
        middle = plan(256, '1/2', '1/20', 128)
        self.assertLessEqual(middle.zero_failure_null_bound.numerator.bit_length(), 256)
        self.assertLessEqual(middle.zero_failure_null_bound.denominator.bit_length(), 256)
        self.assertLess(len(json.dumps(encode(middle))), 4000)


if __name__ == '__main__':
    unittest.main()
