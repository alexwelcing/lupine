from dataclasses import FrozenInstanceError, fields, replace
from fractions import Fraction as F
from itertools import combinations_with_replacement, product
import unittest

from lupine_discovery.decision_pool import (
    CalibrationPanel, PanelOutcome, PanelOutcomes, PanelScore, PoolCalibration,
    PoolDecision, PoolProtocol, RankedPanel, assess_panel, calibrate_panels, select_pool,
)
from lupine_discovery.evidence import Scope


SID = 'synthetic-panel-law'


def protocol(keys=('g',), **changes):
    values = dict(protocol_id='protocol', scenario_id=SID, ranker_id='frozen-model-v1',
                  ranking_rule_id='fixed-order-v1', tie_rule_id='ID-order', generator_id='panel-generator-v1',
                  freeze_reference='synthetic frozen model and feature manifest',
                  sampling_scope='hypothetical exchangeable finite panels; unverified',
                  objective_scope=Scope(SID, 'score', 'synthetic cost', 'minimize'),
                  constraint_scopes={key: Scope(SID, key, 'margin', 'feasible iff <=0') for key in keys})
    values.update(changes)
    return PoolProtocol(**values)


def panel(p, draw, ranked=('a', 'b'), universe='shared-universe'):
    return RankedPanel(draw, universe, p.protocol_digest, 'a' * 64, tuple(sorted(ranked)), ranked)


def outcomes(q, values, source='synthetic truth'):
    return PanelOutcomes(q.panel_digest, source,
                         tuple(PanelOutcome(name, score, constraints)
                               for name, (score, constraints) in values.items()))


def case_for_score(p, draw, numerator, denominator=2):
    """Construct a synthetic truth table whose worst optimum rank is numerator/d."""
    names = tuple(f'x{i}' for i in range(denominator))
    q = panel(p, draw, names, f'synthetic-size-{denominator}')
    values = {name: (0 if i + 1 == numerator else 1,
                     {key: -1 if numerator else 1 for key in p.constraint_scopes})
              for i, name in enumerate(names)}
    if numerator == 0 and not p.constraint_scopes:
        raise ValueError('zero score requires an empty or infeasible panel')
    return CalibrationPanel(q, outcomes(q, values))


def direct_oracle(q, truth):
    """Pairwise definition, independent of production score/quantile helpers."""
    raw = {row.candidate_id: (row.score, tuple(row.constraints.values())) for row in truth.rows}
    feasible = tuple(sorted(name for name, (_, margins) in raw.items()
                            if all(value <= 0 for value in margins)))
    optimum = tuple(name for name in feasible
                    if all(raw[name][0] <= raw[other][0] for other in feasible))
    last = 0
    for position, name in enumerate(q.ranked_ids, 1):
        if name in optimum:
            last = position
    score = F(last, len(q.candidate_ids)) if q.candidate_ids else F(0)
    return feasible, optimum, score


class DecisionPoolTests(unittest.TestCase):
    def test_complete_rational_worlds_match_independent_all_ties_oracle(self):
        p = protocol()
        q = panel(p, 'oracle', ('c', 'a', 'b'))
        checked = 0
        for scores in product((F(-1, 2), F(0), F(1, 3)), repeat=3):
            for margins in product((-1, 0, 1), repeat=3):
                truth = outcomes(q, {name: (scores[i], {'g': margins[i]})
                                     for i, name in enumerate(('a', 'b', 'c'))})
                expected = direct_oracle(q, truth)
                result = assess_panel(p, q, truth)
                self.assertEqual((result.feasible, result.minimizers, result.score), expected)
                self.assertEqual((result.status, result.missing, result.m), ('complete', (), 3))
                self.assertTrue(0 <= result.score <= 1)
                checked += 1
        self.assertEqual(checked, 729)

    def test_all_true_ties_use_worst_rank_with_and_without_constraints(self):
        for keys in ((), ('g',)):
            p = protocol(keys)
            q = panel(p, 'all-tied', ('b', 'a', 'c'))
            truth = outcomes(q, {name: (7, {key: 0 for key in keys}) for name in q.candidate_ids})
            result = assess_panel(p, q, truth)
            self.assertEqual((result.minimizers, result.score), (('a', 'b', 'c'), 1))
            calibration = calibrate_panels(p, (CalibrationPanel(q, truth),), '1/2')
            decision = select_pool(calibration, panel(p, 'future', q.ranked_ids))
            self.assertEqual(decision.retained, q.ranked_ids)
            self.assertEqual(calibration.status, 'finite_conditional')
            self.assertIn('no_pool_reduction', calibration.reasons)
        p = protocol()
        q = panel(p, 'end-ties', ('a', 'b', 'c'))
        truth = outcomes(q, {'a': (0, {'g': -1}), 'b': (1, {'g': -1}), 'c': (0, {'g': -1})})
        self.assertEqual(assess_panel(p, q, truth).score, 1)

    def test_empty_universe_infeasibility_and_statistical_empty_pool_are_distinct(self):
        p = protocol()
        empty = panel(p, 'empty', (), 'empty-universe')
        empty_truth = outcomes(empty, {})
        assessment = assess_panel(p, empty, empty_truth)
        self.assertEqual((assessment.reason, assessment.score, assessment.minimizers), ('empty_universe', 0, ()))
        infeasible = case_for_score(p, 'infeasible', 0)
        self.assertEqual(assess_panel(p, infeasible.panel, infeasible.outcomes).reason, 'no_feasible_candidate')
        calibration = calibrate_panels(p, (infeasible,), '1/2')
        decision = select_pool(calibration, panel(p, 'future'))
        self.assertEqual((decision.threshold, decision.retained), (0, ()))
        self.assertIn('statistical_empty_pool', decision.reasons)
        self.assertNotIn('future_universe_empty', decision.reasons)
        empty_decision = select_pool(calibration, replace(empty, panel_id='future-empty'))
        self.assertIn('future_universe_empty', empty_decision.reasons)
        self.assertNotIn('statistical_empty_pool', empty_decision.reasons)

    def test_exact_ranks_and_resolution_against_integer_search_oracle(self):
        p = protocol()
        for n in range(8):
            cases = tuple(case_for_score(p, f'c{i}', i % 4, 3) for i in range(n))
            boundary = F(1, n + 1)
            alphas = (F(1, 7), F(1, 2), F(9, 10), boundary, boundary - F(1, 1000), boundary + F(1, 1000))
            for alpha in alphas:
                if not 0 < alpha < 1:
                    continue
                result = calibrate_panels(p, cases, alpha)
                k = next(j for j in range(1, n + 2) if j * alpha.denominator >=
                         (n + 1) * (alpha.denominator - alpha.numerator))
                expected = sorted(F(i % 4, 3) for i in range(n))[k - 1] if k <= n else F(1)
                self.assertEqual((result.n, result.complete_count, result.k, result.threshold), (n, n, k, expected))
                self.assertEqual(result.status, 'finite_conditional' if k <= n else 'insufficient_calibration')
        one = (case_for_score(p, 'zero', 0),)
        too_small = calibrate_panels(p, one, F(1, 2) - F(1, 10**40))
        self.assertEqual((too_small.k, too_small.threshold), (2, 1))
        self.assertEqual(select_pool(too_small, panel(p, 'future')).retained, ('a', 'b'))

    def test_variable_sizes_and_weak_rational_threshold(self):
        p = protocol()
        cases = tuple(case_for_score(p, f'c{i}', i, 4) for i in (1, 2, 3))
        calibration = calibrate_panels(p, cases, '1/2')
        self.assertEqual((calibration.k, calibration.threshold), (2, F(1, 2)))
        for m in range(10):
            q = panel(p, f'future-{m}', tuple(str(i) for i in range(m)), f'u-{m}')
            result = select_pool(calibration, q)
            self.assertEqual(result.retained, q.ranked_ids[:m // 2])
            self.assertEqual(result.m, m)

    def test_leave_one_out_failure_count_on_all_small_score_multisets(self):
        p = protocol()
        checked = 0
        for size in range(2, 6):
            for numerators in combinations_with_replacement((0, 1, 2), size):
                cases = tuple(case_for_score(p, f'draw{i}', value) for i, value in enumerate(numerators))
                for k in range(1, size):
                    failures = 0
                    for left_out, test_case in enumerate(cases):
                        calibration = calibrate_panels(p, cases[:left_out] + cases[left_out + 1:], F(size - k, size))
                        self.assertEqual(calibration.k, k)
                        actual = select_pool(calibration, test_case.panel)
                        _, optimum, _ = direct_oracle(test_case.panel, test_case.outcomes)
                        failures += not set(optimum) <= set(actual.retained)
                    self.assertLessEqual(failures, size - k)
                    checked += 1
        self.assertEqual(checked, 155)

    def test_every_missing_label_preserves_original_records_and_prevents_quantile(self):
        p = protocol(('g', 'h'))
        q = panel(p, 'possibly-incomplete')
        known = case_for_score(p, 'known', 1)
        for mask in product((False, True), repeat=6):
            values = ((None if missing else value) for missing, value in zip(mask, (0, -1, 0, 1, 1, -1)))
            a_s, a_g, a_h, b_s, b_g, b_h = values
            truth = outcomes(q, {'a': (a_s, {'g': a_g, 'h': a_h}), 'b': (b_s, {'g': b_g, 'h': b_h})})
            result = calibrate_panels(p, (CalibrationPanel(q, truth), known), '1/2')
            self.assertEqual((result.n, len(result.panels), result.k), (2, 2, 2))
            self.assertEqual(result.complete_count, 1 if any(mask) else 2)
            self.assertEqual(result.panels[0].outcomes.outcomes_digest, truth.outcomes_digest)
            if any(mask):
                self.assertEqual(result.status, 'incomplete_calibration')
                self.assertIsNone(result.threshold)
                self.assertIsNone(result.scores[0].minimizers)
                self.assertIsNone(result.scores[0].feasible)
                self.assertIsNone(result.scores[0].score)
                self.assertEqual(len(result.scores[0].missing), sum(mask))
                self.assertEqual(select_pool(result, panel(p, 'future')).retained, ('a', 'b'))

    def test_unsupported_incomplete_and_insufficient_reasons_all_survive(self):
        p = protocol(premise_status='unsupported')
        q = panel(p, 'incomplete')
        truth = outcomes(q, {'a': (None, {'g': 1}), 'b': (0, {'g': 1})})
        result = calibrate_panels(p, (CalibrationPanel(q, truth),), '1/100')
        self.assertEqual(result.status, 'unsupported_premise')
        self.assertIsNone(result.threshold)
        self.assertEqual(set(result.reasons), {'unsupported_sampling_premise', 'incomplete_calibration_truth',
                                              'required_rank_exceeds_calibration_count'})
        decision = select_pool(result, panel(p, 'future', ('b', 'a')))
        self.assertEqual(decision.retained, ('b', 'a'))
        self.assertEqual(decision.premise_status, 'unsupported')
        self.assertIsNone(decision.conditional_guarantee)
        complete_zero = calibrate_panels(p, (case_for_score(p, 'zero', 0),), '1/2')
        self.assertEqual((complete_zero.scores[0].score, complete_zero.threshold), (0, None))
        self.assertEqual(select_pool(complete_zero, panel(p, 'another')).retained, ('a', 'b'))
        assumed = protocol()
        no_data = calibrate_panels(assumed, (), '1/20')
        self.assertEqual((no_data.n, no_data.k, no_data.status, no_data.threshold),
                         (0, 1, 'insufficient_calibration', 1))

    def test_rankings_are_required_exact_permutations(self):
        p = protocol()
        q = panel(p, 'q')
        for ranked in (None, (), ('a',), ('a', 'a'), ('a', 'c'), ('a', 'b', 'c'), 'ab', {'a': 1}, iter(('a', 'b'))):
            with self.subTest(ranked=ranked), self.assertRaises((ValueError, TypeError)):
                replace(q, ranked_ids=ranked)
        for ids in (('a', 'a'), ('a', True), ('a', ''), 'ab'):
            with self.subTest(ids=ids), self.assertRaises((ValueError, TypeError)):
                replace(q, candidate_ids=ids)
        with self.assertRaises(TypeError):
            RankedPanel('q', 'u', p.protocol_digest, 'a' * 64, ('a', 'b'))

    def test_strict_exact_values_containers_and_scope_fields(self):
        p = protocol()
        q = panel(p, 'q')
        for value in (True, False, 0.0, float('inf'), float('nan'), 'NaN', '1/0', object()):
            with self.subTest(value=value), self.assertRaises((TypeError, ValueError, ZeroDivisionError)):
                PanelOutcome('a', value, {'g': None})
            with self.subTest(value=value), self.assertRaises((TypeError, ValueError, ZeroDivisionError)):
                PanelOutcome('a', None, {'g': value})
        for alpha in (0, 1, -1, 2, True, 0.5, 'NaN'):
            with self.subTest(alpha=alpha), self.assertRaises((TypeError, ValueError)):
                calibrate_panels(p, (), alpha)
        for value in ('x', {}, iter(()), None):
            with self.subTest(value=value), self.assertRaises(TypeError):
                calibrate_panels(p, value, '1/2')
            with self.subTest(value=value), self.assertRaises(TypeError):
                PanelOutcomes(q.panel_digest, 'source', value)
        for scopes in ({'score': p.objective_scope}, {'g': Scope('wrong', 'g', 'u', 'r')},
                       {'g': Scope(SID, 'h', 'u', 'r')}, {'g': Scope(SID, 'g', True, 'r')}, []):
            with self.subTest(scopes=scopes), self.assertRaises((TypeError, ValueError)):
                replace(p, constraint_scopes=scopes)
        for change in ({'sampling_scope': ''}, {'ranker_id': False}, {'premise_status': 'verified'},
                       {'objective_scope': Scope(SID, 'g', 'u', 'r')}):
            with self.subTest(change=change), self.assertRaises((TypeError, ValueError)):
                replace(p, **change)
        with self.assertRaises(TypeError):
            assess_panel(p, q, None)

    def test_outcome_rows_scope_and_identity_mismatches_reject(self):
        p = protocol()
        q = panel(p, 'q')
        valid = outcomes(q, {'a': (0, {'g': -1}), 'b': (1, {'g': -1})})
        for rows in (valid.rows[:1], (*valid.rows, PanelOutcome('c', 1, {'g': 0})), (*valid.rows, valid.rows[0])):
            with self.subTest(rows=rows), self.assertRaises(ValueError):
                assess_panel(p, q, PanelOutcomes(q.panel_digest, 'source', rows))
        with self.assertRaises(ValueError):
            assess_panel(p, replace(q, ranked_ids=('b', 'a')), valid)
        with self.assertRaises(ValueError):
            assess_panel(replace(p, ranker_id='changed'), q, valid)
        for margins in ({}, {'g': None, 'hidden': None}):
            broken = outcomes(q, {'a': (None, margins), 'b': (None, {'g': None})})
            with self.assertRaises(ValueError):
                calibrate_panels(p, (CalibrationPanel(q, broken),), '1/2')
        for bad in ('x', 'A' * 64, '', 1):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                replace(q, feature_manifest_digest=bad)

    def test_draw_identity_and_universe_membership_are_bound_separately(self):
        p = protocol()
        a = case_for_score(p, 'first', 1)
        b = case_for_score(p, 'second', 1)
        result = calibrate_panels(p, (a, b), '1/2')
        self.assertEqual(result.n, 2)
        self.assertEqual(result.panels[0].panel.universe_id, result.panels[1].panel.universe_id)
        later = case_for_score(p, 'third', 1)
        self.assertEqual(select_pool(result, later.panel).retained, ('x0',))
        with self.assertRaises(ValueError):
            calibrate_panels(p, (a, a), '1/2')
        with self.assertRaises(ValueError):
            select_pool(result, a.panel)
        other_q = panel(p, 'other', ('different',), a.panel.universe_id)
        other = CalibrationPanel(other_q, outcomes(other_q, {'different': (0, {'g': 0})}))
        with self.assertRaises(ValueError):
            calibrate_panels(p, (a, other), '1/2')
        with self.assertRaises(ValueError):
            select_pool(result, other_q)
        with self.assertRaises(ValueError):
            select_pool(result, panel(protocol(ranker_id='new'), 'future'))

    def test_semantic_mapping_order_and_metadata_identity(self):
        p = protocol(('g', 'h'))
        p_reordered = replace(p, constraint_scopes=dict(reversed(tuple(p.constraint_scopes.items()))))
        self.assertEqual(p.protocol_digest, p_reordered.protocol_digest)
        q = panel(p, 'q')
        truth = outcomes(q, {'a': ('1/2', {'g': '-1/2', 'h': 0}), 'b': (1, {'h': -1, 'g': 0})})
        reordered = PanelOutcomes(q.panel_digest, truth.source_reference,
                                 tuple(PanelOutcome(row.candidate_id, row.score,
                                                    dict(reversed(tuple(row.constraints.items()))))
                                       for row in reversed(truth.rows)))
        self.assertEqual(truth.outcomes_digest, reordered.outcomes_digest)
        self.assertEqual(q.panel_digest, replace(q, candidate_ids=('b', 'a')).panel_digest)
        base = calibrate_panels(p, (CalibrationPanel(q, truth),), '1/2')
        changed = calibrate_panels(p, (CalibrationPanel(q, replace(truth, source_reference='other source')),), '1/2')
        future = panel(p, 'future')
        self.assertEqual(base.threshold, changed.threshold)
        self.assertNotEqual(base.calibration_digest, changed.calibration_digest)
        self.assertNotEqual(select_pool(base, future).decision_digest, select_pool(changed, future).decision_digest)
        self.assertNotEqual(p.protocol_digest, replace(p, freeze_reference='new frozen metadata').protocol_digest)

    def test_immutable_inputs_outputs_and_non_overridable_derived_fields(self):
        scopes = {'g': Scope(SID, 'g', 'u', 'r')}
        p = protocol(constraint_scopes=scopes)
        ids, ranks = ['b', 'a'], ['b', 'a']
        q = RankedPanel('q', 'u', p.protocol_digest, 'b' * 64, ids, ranks)
        margins = {'g': -1}
        rows = [PanelOutcome('a', 0, margins), PanelOutcome('b', 1, margins)]
        truth = PanelOutcomes(q.panel_digest, 'source', rows)
        cases = [CalibrationPanel(q, truth)]
        result = calibrate_panels(p, cases, '1/2')
        decision = select_pool(result, replace(q, panel_id='future'))
        identity = decision.decision_digest
        scopes.clear()
        ids.clear()
        ranks.clear()
        margins['g'] = 100
        rows.clear()
        cases.clear()
        self.assertEqual(decision.decision_digest, identity)
        self.assertEqual(decision.retained, ('b', 'a'))
        self.assertEqual(result.panels[0].outcomes.rows[0].constraints['g'], -1)
        with self.assertRaises(TypeError):
            p.constraint_scopes['other'] = p.objective_scope
        with self.assertRaises(TypeError):
            result.panels[0].outcomes.rows[0].constraints['g'] = 5
        for obj, name, value in ((decision, 'retained', ()), (result, 'threshold', 0),
                                 (result.scores[0], 'score', 0), (q, 'ranked_ids', ())):
            with self.assertRaises(FrozenInstanceError):
                setattr(obj, name, value)
        with self.assertRaises(TypeError):
            PoolCalibration(p, result.panels, '1/2', threshold=0)
        with self.assertRaises(TypeError):
            PoolDecision(result, decision.panel, retained=())
        with self.assertRaises(TypeError):
            PanelScore(p, q, truth, score=0)
        with self.assertRaises(ValueError):
            replace(result, threshold=0)

    def test_future_truth_does_not_change_selection_or_promote_its_claim(self):
        p = protocol()
        calibration = calibrate_panels(p, (case_for_score(p, 'c', 1),), '1/2')
        future = panel(p, 'future')
        before = select_pool(calibration, future)
        truths = [outcomes(future, {'a': (0, {'g': -1}), 'b': (1, {'g': -1})}),
                  outcomes(future, {'a': (1, {'g': -1}), 'b': (0, {'g': -1})})]
        successes = []
        for truth in truths:
            assessed = assess_panel(p, future, truth)
            successes.append(set(assessed.minimizers) <= set(before.retained))
            self.assertEqual(select_pool(calibration, future).decision_digest, before.decision_digest)
        self.assertEqual(successes, [True, False])
        self.assertEqual(before.premise_status, 'assumed_unverified')
        self.assertEqual(before.guarantee_status, 'conditional_single_panel_marginal')
        self.assertEqual(before.physical_attestation, 'not_established_by_this_program')
        self.assertIn('one future finite panel', before.conditional_guarantee)
        forbidden = {'feasible', 'certified_feasible', 'incumbent', 'regret', 'regret_bound', 'interval_coverage'}
        self.assertFalse(forbidden & {item.name for item in fields(PoolDecision)})

    def test_exchangeable_twenty_panel_counterexample_has_zero_feasible_conditional_retention(self):
        p = protocol()
        cases = tuple(case_for_score(p, f'draw{i}', 2 if i == 19 else 0) for i in range(20))
        successes, feasible_successes, feasible_tests = 0, 0, 0
        for index, future in enumerate(cases):
            calibration = calibrate_panels(p, cases[:index] + cases[index + 1:], '1/20')
            self.assertEqual((calibration.n, calibration.k), (19, 19))
            decision = select_pool(calibration, future.panel)
            _, optimum, _ = direct_oracle(future.panel, future.outcomes)
            retained = set(optimum) <= set(decision.retained)
            successes += retained
            if optimum:
                feasible_tests += 1
                feasible_successes += retained
                self.assertEqual((calibration.threshold, decision.retained), (0, ()))
        self.assertEqual((F(successes, 20), F(feasible_successes, feasible_tests)), (F(19, 20), 0))

    def test_exchangeable_two_panel_counterexample_is_not_calibration_conditional(self):
        p = protocol()
        cases = (case_for_score(p, 'low', 1), case_for_score(p, 'high', 2))
        failures = []
        for index in (0, 1):
            calibration = calibrate_panels(p, (cases[index],), '1/2')
            future = cases[1 - index]
            decision = select_pool(calibration, future.panel)
            _, optimum, _ = direct_oracle(future.panel, future.outcomes)
            failures.append(not set(optimum) <= set(decision.retained))
        self.assertEqual(failures, [True, False])
        self.assertEqual(F(sum(failures), 2), F(1, 2))

    def test_shifted_score_law_and_budget_truncation_are_actual_failures(self):
        p = protocol()
        calibration = calibrate_panels(p, tuple(case_for_score(p, f'c{i}', 1, 3) for i in range(3)), '1/2')
        shifted = case_for_score(p, 'shifted', 3, 3)
        decision = select_pool(calibration, shifted.panel)
        _, optimum, _ = direct_oracle(shifted.panel, shifted.outcomes)
        self.assertFalse(set(optimum) <= set(decision.retained))
        calibration = calibrate_panels(p, (case_for_score(p, 'budget-cal', 2, 3),), '1/2')
        future = case_for_score(p, 'budget-test', 2, 3)
        full = select_pool(calibration, future.panel)
        _, optimum, _ = direct_oracle(future.panel, future.outcomes)
        self.assertTrue(set(optimum) <= set(full.retained))
        self.assertFalse(set(optimum) <= set(full.retained[:1]))


if __name__ == '__main__':
    unittest.main()
