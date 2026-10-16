"""Independent direct-world and finite-probability review of decision pools.

The oracle evaluates complete constructed truth without runtime scoring helpers.
Its negative controls preserve failed stronger interpretations explicitly.
"""
from dataclasses import FrozenInstanceError, fields, replace
from fractions import Fraction as F
from itertools import combinations_with_replacement, permutations, product
import inspect
import unittest

from lupine_discovery import decision_pool as pool
from lupine_discovery.evidence import Scope
from scripts.audit_decision_pool import (
    counterexample_audit, leave_one_out_audit, prefix_oracle, rank_oracle,
    threshold_oracle, truth_oracle, weighted_exchangeable_audit,
)


def protocol(keys=('g',), premise='assumed_unverified'):
    return pool.PoolProtocol('review-protocol', 'review-scenario', 'frozen-ranker',
        'fixed-rule', 'ordinal-id-ties', 'fixed-generator', 'urn:frozen:synthetic',
        'Declared finite panel population; not physically established',
        Scope('review-scenario', 'score', 'synthetic-unit', 'minimize'),
        {key: Scope('review-scenario', key, 'synthetic-unit', 'nonpositive') for key in keys}, premise)


def panel(p, draw, count, ranking=None, universe=None):
    ids = tuple(f'x{i}' for i in range(count))
    return pool.RankedPanel(draw, universe or 'universe-' + draw, p.protocol_digest,
                            'a' * 64, ids, ids if ranking is None else ranking)


def records(p, ranked, scores, constraints=None):
    constraints = constraints if constraints is not None else [dict.fromkeys(p.constraint_scopes, 0) for _ in scores]
    outcomes = pool.PanelOutcomes(ranked.panel_digest, 'urn:constructed:truth', tuple(
        pool.PanelOutcome(cid, score, values) for cid, score, values in zip(ranked.candidate_ids, scores, constraints)))
    return pool.CalibrationPanel(ranked, outcomes)


def record_with_score(p, draw, score):
    score = F(score)
    if score == 0:
        return records(p, panel(p, draw, 0), [])
    ranked = panel(p, draw, score.denominator)
    values = [0 if index + 1 == score.numerator else 1 for index in range(score.denominator)]
    return records(p, ranked, values)


def independent_truth(record):
    return truth_oracle(record.panel.candidate_ids, record.panel.ranked_ids,
        {row.candidate_id: row.score for row in record.outcomes.rows},
        {row.candidate_id: row.constraints for row in record.outcomes.rows})


class DecisionPoolIndependentReview(unittest.TestCase):
    def test_exhaustive_small_complete_worlds_all_ties_and_multiple_constraints(self):
        checked = 0
        for m, constraint_count in ((0, 0), (1, 0), (2, 0), (3, 0), (1, 1), (2, 1), (3, 1), (2, 2)):
            keys = tuple(f'g{i}' for i in range(constraint_count))
            p = protocol(keys)
            ids = tuple(f'x{i}' for i in range(m))
            domain = (-1, 0, 1) if constraint_count <= 1 else (-1, 1)
            for ordering in permutations(ids):
                ranked = panel(p, 'direct-world', m, ordering)
                for objective in product((-1, 0, 1), repeat=m):
                    for values in product(domain, repeat=m * constraint_count):
                        constraints = [dict(zip(keys, values[index * constraint_count:(index + 1) * constraint_count])) for index in range(m)]
                        record = records(p, ranked, objective, constraints)
                        expected = independent_truth(record)
                        actual = pool.assess_panel(p, ranked, record.outcomes)
                        self.assertEqual((actual.status, actual.m, actual.feasible, actual.minimizers, actual.score),
                            ('complete', m, expected['feasible'], expected['minimizers'], expected['score']))
                        for threshold in (F(0), F(1, 3), F(1, 2), F(2, 3), F(1)):
                            kept = set(prefix_oracle(ordering, threshold))
                            self.assertEqual(set(expected['minimizers']) <= kept, expected['score'] <= threshold)
                        checked += 1
        self.assertEqual(checked, 5017)

    def test_runtime_prefix_matches_independent_fraction_comparison_for_variable_m(self):
        p = protocol()
        for threshold in (F(0), F(1, 5), F(1, 3), F(1, 2), F(2, 3), F(1)):
            calibration = pool.calibrate_panels(p, [record_with_score(p, 'cal', threshold)], F(1, 2))
            self.assertEqual(calibration.threshold, threshold)
            for m in range(10):
                ranked = panel(p, f'future-{m}', m, tuple(reversed(tuple(f'x{i}' for i in range(m)))))
                decision = pool.select_pool(calibration, ranked)
                self.assertEqual(decision.retained, prefix_oracle(ranked.ranked_ids, threshold))
                self.assertEqual(len(decision.retained), m * threshold.numerator // threshold.denominator)

    def test_pointwise_leave_one_out_count_and_runtime_quantiles(self):
        p, alphabet = protocol(), (F(0), F(1, 3), F(2, 3), F(1))
        audit = leave_one_out_audit()
        self.assertEqual(audit['left_out_comparisons'], 4200)
        for n in range(2, 5):
            for vector in combinations_with_replacement(alphabet, n):
                population = [record_with_score(p, f'draw-{i}', value) for i, value in enumerate(vector)]
                for k in range(1, n):
                    failures = 0
                    for index, future in enumerate(population):
                        alpha = F(n - k, n)
                        calibration = pool.calibrate_panels(p, population[:index] + population[index + 1:], alpha)
                        decision = pool.select_pool(calibration, future.panel)
                        other_scores = vector[:index] + vector[index + 1:]
                        self.assertEqual(calibration.k, k)
                        self.assertEqual(calibration.threshold, threshold_oracle(other_scores, alpha))
                        lost = not set(independent_truth(future)['minimizers']) <= set(decision.retained)
                        self.assertEqual(lost, vector[index] > calibration.threshold)
                        failures += lost
                    self.assertLessEqual(failures, n - k)

    def test_nonuniform_symmetric_finite_law_runtime_failure_bound(self):
        p, alphabet = protocol(), (F(0), F(1, 3), F(2, 3), F(1))
        expected = weighted_exchangeable_audit()
        self.assertEqual(expected['world_count'], 64)
        for k, expected_risk in ((1, F(59, 116)), (2, F(25, 116))):
            weighted_failure, total = 0, 0
            for vector in product(alphabet, repeat=3):
                weight = 1 + vector.count(F(0)) ** 2 + 2 * vector.count(F(1))
                population = [record_with_score(p, f'draw-{i}', value) for i, value in enumerate(vector)]
                calibration = pool.calibrate_panels(p, population[:2], F(3 - k, 3))
                decision = pool.select_pool(calibration, population[2].panel)
                lost = not set(independent_truth(population[2])['minimizers']) <= set(decision.retained)
                weighted_failure += weight * lost
                total += weight
            self.assertEqual(F(weighted_failure, total), expected_risk)
            self.assertLessEqual(expected_risk, F(3 - k, 3))

    def test_exchangeable_feasible_conditional_coverage_can_be_zero(self):
        p = protocol()
        population = [records(p, panel(p, f'draw-{i}', 2), [1, 0], [{'g': 1}, {'g': 1}]) for i in range(19)]
        population.append(records(p, panel(p, 'draw-19', 2), [1, 0]))
        successes, feasible_count, feasible_successes = 0, 0, 0
        for index, future in enumerate(population):
            calibration = pool.calibrate_panels(p, population[:index] + population[index + 1:], F(1, 20))
            decision = pool.select_pool(calibration, future.panel)
            truth = independent_truth(future)
            retained = set(truth['minimizers']) <= set(decision.retained)
            successes += retained
            feasible_count += bool(truth['feasible'])
            feasible_successes += bool(truth['feasible']) and retained
            if truth['feasible']:
                self.assertEqual((calibration.status, calibration.threshold, decision.retained), ('finite_conditional', F(0), ()))
                self.assertIn('statistical_empty_pool', decision.reasons)
        self.assertEqual((F(successes, 20), feasible_count, feasible_successes), (F(19, 20), 1, 0))

    def test_realized_calibration_conditional_failure_and_shift_controls(self):
        p = protocol()
        low, high = record_with_score(p, 'low', F(1, 2)), record_with_score(p, 'high', F(1))
        failures = []
        for calibration_record, future in ((low, high), (high, low)):
            calibration = pool.calibrate_panels(p, [calibration_record], F(1, 2))
            decision = pool.select_pool(calibration, future.panel)
            failures.append(not set(independent_truth(future)['minimizers']) <= set(decision.retained))
        self.assertEqual(failures, [True, False])
        self.assertEqual(F(sum(failures), 2), F(1, 2))
        # Repeating only the high-score future is a shifted law, not protected
        # by the earlier exchangeable two-order argument.
        calibration = pool.calibrate_panels(p, [low], F(1, 2))
        for index in range(3):
            future = record_with_score(p, f'shifted-{index}', F(1))
            self.assertFalse(set(independent_truth(future)['minimizers']) <= set(pool.select_pool(calibration, future.panel).retained))
        self.assertEqual(counterexample_audit()['wrong_best_rank_target']['lost_minimizers'], ['last'])

    def test_all_minimizer_maximum_and_weak_boundary_detect_wrong_targets(self):
        p = protocol()
        ranked = panel(p, 'ties', 3)
        tied = records(p, ranked, [0, 1, 0])
        assessment = pool.assess_panel(p, ranked, tied.outcomes)
        self.assertEqual((assessment.minimizers, assessment.score), (('x0', 'x2'), F(1)))
        calibration = pool.calibrate_panels(p, [record_with_score(p, 'cal', F(1, 3))], F(1, 2))
        decision = pool.select_pool(calibration, ranked)
        self.assertEqual(decision.retained, ('x0',))
        self.assertFalse(set(assessment.minimizers) <= set(decision.retained))

    def test_missing_each_label_abstains_without_reducing_n_even_if_infeasible(self):
        p = protocol(('g', 'h'))
        complete = record_with_score(p, 'complete', F(1, 2))
        ranked = panel(p, 'incomplete', 3)
        for row_index, quantity in product(range(3), ('score', 'g', 'h')):
            values, constraints = [0, 1, 0], [{'g': 1, 'h': -1} for _ in range(3)]
            if quantity == 'score':
                values[row_index] = None
            else:
                constraints[row_index][quantity] = None
            partial = records(p, ranked, values, constraints)
            assessment = pool.assess_panel(p, ranked, partial.outcomes)
            self.assertEqual(assessment.missing, ((f'x{row_index}', quantity),))
            self.assertEqual((assessment.score, assessment.feasible, assessment.minimizers), (None, None, None))
            calibration = pool.calibrate_panels(p, [complete, partial], F(1, 2))
            self.assertEqual((calibration.n, calibration.complete_count, calibration.k, calibration.threshold), (2, 1, 2, None))
            self.assertEqual(calibration.panels, (complete, partial))
            self.assertEqual(calibration.status, 'incomplete_calibration')
            future = panel(p, 'future', 3, ('x2', 'x0', 'x1'))
            self.assertEqual(pool.select_pool(calibration, future).retained, future.ranked_ids)
        hidden_last_tie = records(p, ranked, [0, 1, None])
        self.assertIsNone(pool.assess_panel(p, ranked, hidden_last_tie.outcomes).score)

    def test_unsupported_plus_incomplete_keeps_all_reasons_and_validates_every_record(self):
        p = protocol(premise='unsupported')
        record = records(p, panel(p, 'unknown', 1), [None])
        calibration = pool.calibrate_panels(p, [record], F(1, 4))
        self.assertEqual(calibration.status, 'unsupported_premise')
        self.assertEqual(set(calibration.reasons), {'unsupported_sampling_premise', 'incomplete_calibration_truth', 'required_rank_exceeds_calibration_count'})
        decision = pool.select_pool(calibration, panel(p, 'future', 4))
        self.assertEqual(len(decision.retained), 4)
        self.assertIsNone(decision.threshold)
        self.assertIsNone(decision.conditional_guarantee)
        wrong_keys = records(p, panel(p, 'bad', 1), [None], [{'other': 1}])
        with self.assertRaises(ValueError):
            pool.calibrate_panels(p, [wrong_keys], F(1, 2))

    def test_resolution_exact_boundaries_and_full_finite_threshold_are_distinct(self):
        p = protocol()
        for n in (0, 1, 2, 18, 19):
            data = [record_with_score(p, f'cal-{i}', F(1, 3)) for i in range(n)]
            for alpha in (F(1, 20), F(1, 3), F(1, 2), F(999, 1000)):
                calibration = pool.calibrate_panels(p, data, alpha)
                self.assertEqual(calibration.k, rank_oracle(n, alpha))
                self.assertEqual(calibration.threshold, threshold_oracle([F(1, 3)] * n, alpha))
                expected = 'insufficient_calibration' if calibration.k > n else 'finite_conditional'
                self.assertEqual(calibration.status, expected)
        data = [record_with_score(p, f'cal-{i}', F(1, 3)) for i in range(19)]
        for alpha, status in ((F(1, 20) - F(1, 10**20), 'insufficient_calibration'),
                              (F(1, 20), 'finite_conditional'), (F(1, 20) + F(1, 10**20), 'finite_conditional')):
            self.assertEqual(pool.calibrate_panels(p, data, alpha).status, status)
        finite_full = pool.calibrate_panels(p, [record_with_score(p, 'last-ranked', F(1))], F(1, 2))
        self.assertEqual((finite_full.status, finite_full.threshold), ('finite_conditional', F(1)))
        self.assertIn('no_pool_reduction', finite_full.reasons)

    def test_empty_infeasible_unknown_and_statistical_empty_are_distinct(self):
        p = protocol()
        empty = records(p, panel(p, 'empty', 0), [])
        infeasible = records(p, panel(p, 'infeasible', 1), [0], [{'g': 1}])
        unknown = records(p, panel(p, 'unknown', 1), [None])
        assessments = [pool.assess_panel(p, record.panel, record.outcomes) for record in (empty, infeasible, unknown)]
        self.assertEqual([item.reason for item in assessments], ['empty_universe', 'no_feasible_candidate', 'missing_truth'])
        self.assertEqual([item.score for item in assessments], [F(0), F(0), None])
        calibration = pool.calibrate_panels(p, [infeasible], F(1, 2))
        future = records(p, panel(p, 'feasible-future', 2), [0, 1])
        decision = pool.select_pool(calibration, future.panel)
        self.assertEqual(decision.retained, ())
        self.assertIn('statistical_empty_pool', decision.reasons)
        self.assertNotIn('future_universe_empty', decision.reasons)
        self.assertEqual(independent_truth(future)['feasible'], ('x0', 'x1'))
        empty_decision = pool.select_pool(calibration, panel(p, 'empty-future', 0))
        self.assertIn('future_universe_empty', empty_decision.reasons)
        self.assertNotIn('statistical_empty_pool', empty_decision.reasons)

    def test_original_records_copied_and_public_results_immutable(self):
        mapping = {'g': Scope('review-scenario', 'g', 'u', 'reference')}
        p = replace(protocol(), constraint_scopes=mapping)
        identity = p.protocol_digest
        mapping.clear()
        self.assertEqual(p.protocol_digest, identity)
        self.assertEqual(tuple(p.constraint_scopes), ('g',))
        ids, order = ['x1', 'x0'], ['x1', 'x0']
        ranked = pool.RankedPanel('mutable', 'universe', p.protocol_digest, 'a' * 64, ids, order)
        values = {'g': '-0.25'}
        first = pool.PanelOutcome('x0', '1/7', values)
        rows = [first, pool.PanelOutcome('x1', '1/7', {'g': 0})]
        outcomes = pool.PanelOutcomes(ranked.panel_digest, 'urn:truth', rows)
        data = [pool.CalibrationPanel(ranked, outcomes)]
        calibration = pool.calibrate_panels(p, data, F(1, 2))
        before = calibration.calibration_digest
        ids.append('new'); order.reverse(); values['g'] = 99; rows.clear(); data.clear()
        self.assertEqual(calibration.calibration_digest, before)
        self.assertEqual(calibration.panels[0].panel.ranked_ids, ('x1', 'x0'))
        self.assertEqual(calibration.panels[0].outcomes.rows[0].constraints['g'], F(-1, 4))
        with self.assertRaises(TypeError):
            first.constraints['g'] = 2
        with self.assertRaises(FrozenInstanceError):
            calibration.threshold = F(0)
        for cls in (pool.PanelScore, pool.PoolCalibration, pool.PoolDecision):
            allowed = {'protocol', 'panel', 'outcomes'} if cls is pool.PanelScore else {'protocol', 'panels', 'alpha'} if cls is pool.PoolCalibration else {'calibration', 'panel'}
            self.assertEqual({item.name for item in fields(cls) if item.init}, allowed)

    def test_metadata_and_semantic_mapping_identity_rules(self):
        p = protocol(('g', 'h'))
        self.assertEqual(p.protocol_digest, replace(p, constraint_scopes=dict(reversed(tuple(p.constraint_scopes.items())))).protocol_digest)
        for key in ('ranker_id', 'ranking_rule_id', 'tie_rule_id', 'generator_id', 'freeze_reference', 'sampling_scope'):
            self.assertNotEqual(p.protocol_digest, replace(p, **{key: getattr(p, key) + ':changed'}).protocol_digest)
        ranked = panel(p, 'draw', 2)
        self.assertEqual(ranked.panel_digest, replace(ranked, candidate_ids=tuple(reversed(ranked.candidate_ids))).panel_digest)
        for change in ({'ranked_ids': ('x1', 'x0')}, {'feature_manifest_digest': 'b' * 64}, {'universe_id': 'changed'}, {'panel_id': 'changed'}):
            self.assertNotEqual(ranked.panel_digest, replace(ranked, **change).panel_digest)
        truth = records(p, ranked, [0, 1], [{'g': 0, 'h': -1}, {'h': 1, 'g': -1}]).outcomes
        reordered = replace(truth, rows=tuple(reversed(truth.rows)))
        self.assertEqual(truth.outcomes_digest, reordered.outcomes_digest)
        changed = replace(truth, source_reference='urn:other')
        self.assertNotEqual(truth.outcomes_digest, changed.outcomes_digest)
        before = pool.calibrate_panels(p, [pool.CalibrationPanel(ranked, truth)], F(1, 2))
        after = pool.calibrate_panels(p, [pool.CalibrationPanel(ranked, changed)], F(1, 2))
        self.assertEqual(before.threshold, after.threshold)
        self.assertNotEqual(before.calibration_digest, after.calibration_digest)
        future = panel(p, 'future', 3)
        self.assertNotEqual(pool.select_pool(before, future).decision_digest,
                            pool.select_pool(after, future).decision_digest)

    def test_universe_draw_scope_and_label_identity_mismatches_reject(self):
        p = protocol()
        case = records(p, panel(p, 'cal', 2, universe='same'), [0, 1])
        calibration = pool.calibrate_panels(p, [case], F(1, 2))
        with self.assertRaises(ValueError):
            pool.calibrate_panels(p, [case, case], F(1, 2))
        with self.assertRaises(ValueError):
            pool.select_pool(calibration, case.panel)
        with self.assertRaises(ValueError):
            pool.select_pool(calibration, panel(p, 'new', 3, universe='same'))
        with self.assertRaises(ValueError):
            pool.calibrate_panels(p, [case, records(p, panel(p, 'new', 3, universe='same'), [0, 1, 2])], F(1, 2))
        self.assertEqual(len(pool.select_pool(calibration, panel(p, 'new', 2, universe='same')).original_ids), 2)
        for changed in (replace(case.panel, protocol_digest='f' * 64),):
            with self.assertRaises(ValueError):
                pool.select_pool(calibration, changed)
        for rows in ((case.outcomes.rows[0],), (*case.outcomes.rows, pool.PanelOutcome('extra', 0, {'g': 0}))):
            with self.assertRaises(ValueError):
                pool.assess_panel(p, case.panel, pool.PanelOutcomes(case.panel.panel_digest, 'urn:truth', rows))
        with self.assertRaises(ValueError):
            pool.assess_panel(p, case.panel, replace(case.outcomes, panel_digest='f' * 64))
        with self.assertRaises(ValueError):
            pool.RankedPanel('bad', 'u', p.protocol_digest, 'a' * 64, ('x0', 'x1'), ('x0', 'x0'))

    def test_future_truth_is_absent_from_selection_and_cannot_repair_a_loss(self):
        p = protocol()
        calibration = pool.calibrate_panels(p, [record_with_score(p, 'cal', F(1, 2))], F(1, 2))
        ranked = panel(p, 'future', 4)
        decision = pool.select_pool(calibration, ranked)
        sealed = decision.decision_digest
        self.assertEqual(tuple(inspect.signature(pool.select_pool).parameters), ('calibration', 'future_panel'))
        for values, retained in (([0, 1, 2, 3], True), ([3, 2, 1, 0], False)):
            truth = records(p, ranked, values)
            assessment = pool.assess_panel(p, ranked, truth.outcomes)
            self.assertEqual(set(assessment.minimizers) <= set(decision.retained), retained)
            self.assertEqual(pool.select_pool(calibration, ranked).decision_digest, sealed)
        with self.assertRaises(TypeError):
            pool.select_pool(calibration, ranked, outcomes=truth.outcomes)
        for absent in ('incumbent', 'regret_bound', 'certified_feasible', 'interval_coverage', 'candidate_probability'):
            self.assertFalse(hasattr(decision, absent))

    def test_exact_inputs_reject_float_boolean_endpoints_and_generators(self):
        p = protocol()
        for alpha in (False, True, 0.5, 0, 1, '-1/10', 'NaN'):
            with self.assertRaises((TypeError, ValueError)):
                pool.calibrate_panels(p, [], alpha)
        for scalar in (False, True, 0.5, float('inf'), 'NaN'):
            with self.assertRaises((TypeError, ValueError)):
                pool.PanelOutcome('x', None, {'g': scalar})
        with self.assertRaises(TypeError):
            pool.calibrate_panels(p, (value for value in ()), F(1, 2))
        with self.assertRaises(TypeError):
            pool.RankedPanel('bad', 'u', p.protocol_digest, 'a' * 64, (str(i) for i in range(2)), ('0', '1'))


if __name__ == '__main__':
    unittest.main()
