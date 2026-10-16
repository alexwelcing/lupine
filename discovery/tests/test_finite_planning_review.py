"""Independent finite sampling oracles; no scientific archive inputs."""
from collections import defaultdict
from dataclasses import FrozenInstanceError, fields, replace
from fractions import Fraction
import importlib.util
import itertools
import json
from pathlib import Path
import sys
import unittest
from unittest import mock

ROOT = next(p for p in Path(__file__).absolute().parents
            if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
sys.path.insert(0, str(ROOT / 'src'))
import lupine_discovery.study_planning as iid
from lupine_discovery.serialization import encode

TRACKED = ROOT / 'src/lupine_discovery/finite_planning.py'
CANDIDATE = ROOT / '.cache/phase2-finite-planner-candidate-v1/promotion/src/lupine_discovery/finite_planning.py'
SOURCE = TRACKED if TRACKED.is_file() else CANDIDATE
SPEC = importlib.util.spec_from_file_location('lupine_discovery._finite_planning_independent_review', SOURCE)
module = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = module
SPEC.loader.exec_module(module)
plan = module.plan_finite_zero_failure_resolution
COUNTERS = {'finite_null_cases': 0, 'sequential_draw_distributions': 0}


def draw_distributions(population, failures):
    """Count sequential remaining-good/bad branches, never combinations/ceil."""
    levels = [{0: Fraction(1)}]
    for drawn in range(population):
        next_level = defaultdict(Fraction)
        for failed_draws, mass in levels[-1].items():
            bad_left = failures - failed_draws
            good_left = population - failures - (drawn - failed_draws)
            if bad_left:
                next_level[failed_draws + 1] += mass * Fraction(bad_left, population - drawn)
            if good_left:
                next_level[failed_draws] += mass * Fraction(good_left, population - drawn)
        levels.append(dict(next_level))
    return levels


class FinitePlanningIndependentReview(unittest.TestCase):
    def test_sequential_draw_oracle_over_every_small_null_world(self):
        for size in range(1, 9):
            worlds = {bad: draw_distributions(size, bad) for bad in range(size + 1)}
            for levels in worlds.values():
                for pmf in levels:
                    self.assertEqual(sum(pmf.values()), 1)
                    self.assertTrue(all(mass >= 0 for mass in pmf.values()))
                    COUNTERS['sequential_draw_distributions'] += 1
            ceilings = {Fraction(j, 2 * size + 1) for j in range(1, 2 * size + 1)}
            ceilings.update(Fraction(j, size) for j in range(1, size))
            for rho in sorted(ceilings):
                null_counts = [bad for bad in worlds if Fraction(bad, size) >= rho]
                bounds = [max(worlds[bad][draws].get(0, Fraction(0)) for bad in null_counts)
                          for draws in range(size + 1)]
                etas = {Fraction(1, 3), Fraction(1, 2), Fraction(2, 3)}
                etas.update(bound for bound in bounds if 0 < bound < 1)
                for eta in sorted(etas):
                    for cap in range(size + 1):
                        with self.subTest(size=size, rho=rho, eta=eta, cap=cap):
                            result = plan(size, rho, eta, cap)
                            minimum = next((e for e in range(1, cap + 1) if bounds[e] <= eta), None)
                            self.assertEqual(result.minimum_null_failures, min(null_counts))
                            self.assertEqual(result.attainable_null_failure_fraction,
                                             Fraction(min(null_counts), size))
                            self.assertEqual(result.zero_failure_null_bound, bounds[cap])
                            self.assertEqual(result.minimum_evaluation_panels, minimum)
                            self.assertEqual(result.minimum_zero_failure_null_bound,
                                             None if minimum is None else bounds[minimum])
                            self.assertEqual(result.resolution_status,
                                'insufficient_resolution' if minimum is None
                                else 'sufficient_zero_failure_resolution')
                            COUNTERS['finite_null_cases'] += 1

    def test_grid_ceiling_and_equality_are_not_rounded_or_strict(self):
        at = plan(10, '0.2', '1/2', 1)
        above = plan(10, '0.200000001', '1/2', 1)
        self.assertEqual((at.minimum_null_failures, above.minimum_null_failures), (2, 3))
        self.assertEqual((at.zero_failure_null_bound, above.zero_failure_null_bound),
                         (Fraction(4, 5), Fraction(7, 10)))
        self.assertEqual(above.loss_ceiling, Fraction(200000001, 1000000000))
        self.assertEqual(above.attainable_null_failure_fraction, Fraction(3, 10))
        equality = plan(4, '1/2', '1/6', 4)
        self.assertEqual(equality.minimum_evaluation_panels, 2)
        self.assertEqual(equality.minimum_zero_failure_null_bound, Fraction(1, 6))
        self.assertEqual(equality.zero_failure_null_bound, 0)
        below = plan(4, '1/2', Fraction(1, 6) - Fraction(1, 1000000), 2)
        self.assertIsNone(below.minimum_evaluation_panels)
        self.assertIsNone(below.minimum_zero_failure_null_bound)

    def test_caps_empty_sample_census_and_singleton(self):
        for size in (1, 2, 7, 256):
            for rho in (Fraction(1, 2**32 - 1), Fraction(1, 2), Fraction(2**32 - 2, 2**32 - 1)):
                zero = plan(size, rho, '1/2', 0)
                self.assertEqual(zero.zero_failure_null_bound, 1)
                self.assertIsNone(zero.minimum_evaluation_panels)
                self.assertIsNone(zero.minimum_zero_failure_null_bound)
                census = plan(size, rho, Fraction(1, 2**32 - 1), size)
                self.assertEqual(census.zero_failure_null_bound, 0)
                self.assertLessEqual(census.minimum_evaluation_panels,
                                     size - census.minimum_null_failures + 1)
                capped = plan(size, rho, Fraction(1, 2**32 - 1), census.minimum_evaluation_panels - 1)
                self.assertIsNone(capped.minimum_evaluation_panels)
        one = plan(1, '1/2', '1/2', 1)
        self.assertEqual((one.minimum_evaluation_panels, one.zero_failure_null_bound), (1, 0))

    def test_sampling_model_counterexamples_and_iid_stays_distinct(self):
        finite = plan(4, '1/2', '1/6', 2)
        independent = iid.plan_zero_failure_resolution('1/2', '1/6', 2)
        self.assertEqual(finite.zero_failure_null_bound, Fraction(1, 6))
        self.assertEqual(independent.zero_failure_null_bound, Fraction(1, 4))
        self.assertEqual(finite.minimum_evaluation_panels, 2)
        self.assertIsNone(independent.minimum_evaluation_panels)
        # Exhaust labelled permutations in a shared-threshold countermodel.
        loss_count = defaultdict(int)
        for allocation in itertools.permutations((Fraction(1, 3), Fraction(2, 3), Fraction(1))):
            loss_count[sum(value > allocation[0] for value in allocation[1:])] += 1
        self.assertEqual(dict(loss_count), {2: 2, 1: 2, 0: 2})
        self.assertEqual(Fraction(loss_count[0], 6), Fraction(1, 3))
        self.assertNotEqual(Fraction(loss_count[0], 6), independent.zero_failure_null_bound)
        self.assertEqual(finite.sampling_design, 'uniform_without_replacement')
        self.assertFalse(hasattr(independent, 'population_panels'))

    def test_maximum_input_and_arithmetic_resource_bounds(self):
        actual_comb = module.comb
        calls = []
        def counted_comb(a, b):
            self.assertTrue(0 <= b <= a <= 256)
            value = actual_comb(a, b)
            self.assertLessEqual(value.bit_length(), 257)
            calls.append((a, b))
            return value
        with mock.patch.object(module, 'comb', side_effect=counted_comb), \
                mock.patch.object(module, '_zero_failure_tail', wraps=module._zero_failure_tail) as tail:
            result = plan(256, Fraction(1, 2**32 - 1), Fraction(1, 2**32 - 1), 256)
        self.assertEqual(result.minimum_evaluation_panels, 256)
        self.assertEqual(result.minimum_null_failures, 1)
        self.assertLessEqual(tail.call_count, 256)
        self.assertLessEqual(len(calls), 512)
        for value in (result.zero_failure_null_bound, result.minimum_zero_failure_null_bound):
            self.assertLessEqual(value.numerator.bit_length(), 257)
            self.assertLessEqual(value.denominator.bit_length(), 257)

    def test_invalid_values_rejected_even_at_empty_cap_before_arithmetic(self):
        invalid_counts = (True, False, 1.0, Fraction(1), '1', None, [], {}, -1, 257)
        with mock.patch.object(module, '_zero_failure_tail', side_effect=AssertionError('arithmetic reached')):
            for count in invalid_counts:
                for constructor in (plan, module.FiniteZeroFailureResolutionPlan):
                    with self.subTest(count=repr(count), constructor=constructor.__name__):
                        with self.assertRaises((TypeError, ValueError)):
                            constructor(count, '1/2', '1/2', 0)
                        with self.assertRaises((TypeError, ValueError)):
                            constructor(8, '1/2', '1/2', count)
            for bad in (0, 1, -1, '0', '1', '1/0', True, False, .5, None, [], {},
                        Fraction(1, 2**32), Fraction(2**32, 2**32 + 1)):
                for position in (1, 2):
                    args = [8, '1/2', '1/2', 0]
                    args[position] = bad
                    with self.subTest(bad=repr(bad), position=position):
                        with self.assertRaises((TypeError, ValueError)):
                            plan(*args)
            for args in ((0, '1/2', '1/2', 0), (3, '1/2', '1/2', 4)):
                with self.assertRaises(ValueError):
                    plan(*args)

    def test_syntax_and_bit_guards_precede_fraction_parser(self):
        malformed = ('1e999999999', '0x1', 'NaN', 'Infinity', '1_000', '1/2/3',
                     '  ' + '0' * 129, 'x' * 129, Fraction(1, 2**32), 2**32, True, .5)
        def valid_fixture_only(value):
            if value == '1/2':
                return Fraction(1, 2)
            raise AssertionError('unsafe parse reached')
        with mock.patch.object(iid, 'exact', side_effect=valid_fixture_only):
            for value in malformed:
                for position in (1, 2):
                    args = [4, '1/2', '1/2', 0]
                    args[position] = value
                    with self.subTest(value=repr(value), position=position):
                        with self.assertRaises((TypeError, ValueError)):
                            plan(*args)

    def test_claims_unknowns_frozen_constructor_and_exact_serialization(self):
        zero = plan(3, '0.333333333', '1/3', 0)
        complete = plan(3, Fraction(1, 3), Fraction(1, 3), 3)
        for result in (zero, complete):
            self.assertEqual(result.adequacy_status, 'unestablished')
            self.assertEqual(result.power_status, 'not_computed')
            self.assertEqual(result.observed_evidence_status, 'no_observations')
            self.assertEqual(result.premise_status, 'hypothetical_unverified')
            self.assertEqual(result.future_population_risk_status, 'not_established')
            self.assertEqual(result.claim_scope, 'frozen_residual_finite_population_only')
            self.assertIn('fixed finite-population failure fraction >= loss_ceiling', result.null_hypothesis)
            with self.assertRaises(FrozenInstanceError):
                result.power_status = 'observed'
            with self.assertRaises(TypeError):
                module.FiniteZeroFailureResolutionPlan(3, '1/3', '1/3', 2, power_status='observed')
        self.assertEqual(complete.minimum_evaluation_panels, 2)
        payload = encode(complete)
        self.assertEqual(payload['minimum_zero_failure_null_bound'], '1/3')
        self.assertEqual(payload['zero_failure_null_bound'], '0')
        self.assertIsNone(encode(zero)['minimum_evaluation_panels'])
        self.assertIsNone(encode(zero)['minimum_zero_failure_null_bound'])
        self.assertEqual(set(payload), {item.name for item in fields(complete)})
        json.loads(json.dumps(payload, allow_nan=False))
        with self.assertRaises(ValueError):
            replace(complete, maximum_evaluation_panels=4)
        with self.assertRaises(TypeError):
            plan(3, '1/3', '1/3', 2, source_path='never-read')
        words = ' '.join(complete.premises)
        for clause in ('without replacement', 'not on the realized evaluation subset',
                       'no adaptive stopping', 'no intervention', 'not an observed result',
                       'not an unsampled or future population'):
            self.assertIn(clause, words)

    def test_numeric_api_requires_no_file_network_or_process_access(self):
        with mock.patch('builtins.open', side_effect=AssertionError('file access')), \
                mock.patch.object(Path, 'read_bytes', side_effect=AssertionError('file access')), \
                mock.patch.object(Path, 'read_text', side_effect=AssertionError('file access')), \
                mock.patch('socket.socket', side_effect=AssertionError('network access')), \
                mock.patch('subprocess.run', side_effect=AssertionError('process access')):
            result = plan(4, '1/2', '1/6', 2)
        self.assertEqual(result.minimum_zero_failure_null_bound, Fraction(1, 6))


if __name__ == '__main__':
    program = unittest.main(verbosity=2, exit=False)
    print(json.dumps({'independent_oracle_counts': COUNTERS}, sort_keys=True))
    raise SystemExit(0 if program.result.wasSuccessful() else 1)
