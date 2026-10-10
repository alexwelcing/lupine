"""Independent adversarial wire review using constructed finite panels only."""
from copy import deepcopy
from fractions import Fraction
import json
import unittest
from unittest.mock import patch

from lupine_discovery import decision_pool_io as wire
from lupine_discovery.cli import verify_certificate
from lupine_discovery.evidence import digest


def fixture():
    scenario = 'independent-statistical-panel'
    def scope(quantity):
        return {'scenario_id': scenario, 'quantity': quantity, 'unit': 'synthetic-unit',
                'reference': 'constructed quantity, not physical evidence'}
    def ranked(draw):
        return {'panel_id': draw, 'universe_id': 'four-candidate-universe',
                'feature_manifest_digest': 'a' * 64,
                'candidate_ids': ['a', 'b', 'c', 'd'], 'ranked_ids': ['a', 'b', 'c', 'd']}
    calibration = []
    for index in range(3):
        calibration.append({'panel': ranked(f'cal-{index}'), 'outcomes': {
            'source_reference': 'constructed rational labels; no material experiment',
            'rows': [{'candidate_id': cid, 'score': '0' if position == index else '1', 'constraints': {'g': '0'}}
                     for position, cid in enumerate(('a', 'b', 'c', 'd'))]}})
    return {'schema': 'lupine.discovery.decision_pool_problem.v1',
        'protocol': {'protocol_id': 'independent-protocol', 'scenario_id': scenario,
            'ranker_id': 'declared-ranker', 'ranking_rule_id': 'declared-rule', 'tie_rule_id': 'fixed-ID-order',
            'generator_id': 'constructed-panels', 'freeze_reference': 'urn:declared:freeze',
            'sampling_scope': 'declared panel population; unverified',
            'objective_scope': scope('score'), 'constraint_scopes': {'g': scope('g')},
            'premise_status': 'assumed_unverified'},
        'alpha': '1/2', 'calibration_panels': calibration, 'future_panel': ranked('future')}


def outcomes(value, receipt=None):
    receipt = receipt or wire.decision_pool_certificate(value)
    return {'schema': 'lupine.discovery.decision_pool_outcomes.v1',
        'scenario_id': value['protocol']['scenario_id'], 'problem_digest': receipt['problem_digest'],
        'certificate_digest': receipt['certificate_digest'], 'panel_digest': receipt['future_panel']['panel_digest'],
        'source_reference': 'constructed held-out labels; no material experiment',
        'rows': [{'candidate_id': cid, 'score': score, 'constraints': {'g': '0'}}
                 for cid, score in zip(('a', 'b', 'c', 'd'), ('0', '1', '2', '0'))]}


def large_fixture(panel_count, constraint_count, future_count=1):
    value = fixture()
    p = value['protocol']
    p['constraint_scopes'] = {str(i): {**p['objective_scope'], 'quantity': str(i)} for i in range(constraint_count)}
    ids = [str(i) for i in range(64)]
    value['calibration_panels'] = [{'panel': {
        'panel_id': str(index), 'universe_id': 'same', 'feature_manifest_digest': 'a' * 64,
        'candidate_ids': list(ids), 'ranked_ids': list(ids)}, 'outcomes': {
            'source_reference': 's', 'rows': [{'candidate_id': cid, 'score': 0,
                'constraints': {str(i): 0 for i in range(constraint_count)}} for cid in ids]}}
        for index in range(panel_count)]
    future_ids = [f'f{i}' for i in range(future_count)]
    value['future_panel'] = {'panel_id': 'future', 'universe_id': 'future',
        'feature_manifest_digest': 'a' * 64, 'candidate_ids': list(future_ids), 'ranked_ids': list(future_ids)}
    return value


class DecisionPoolWireIndependentReview(unittest.TestCase):
    def test_raw_decoder_rejects_lossy_ambiguous_and_overbudget_documents(self):
        bad = [
            '{"x": 0.5}', '{"x": 1e0}', '{"x": NaN}', '{"x": Infinity}',
            '{"x": 9007199254740992}', '{"x": true}', '{"x": false}',
            '{"x": 1, "x": 2}', '{"rows": [{"id": "a", "id": "b"}]}',
            '{"x": "unterminated}', b'{"x":"\xff"}',
            '[' * 25 + '0' + ']' * 25,
            '{"text":"' + 'x' * (256 * 1024) + '"}',
        ]
        for raw in bad:
            with self.subTest(prefix=repr(raw[:40])), self.assertRaises((ValueError, TypeError, UnicodeError)):
                wire.loads_decision_pool(raw)

    def test_lexical_depth_preflight_respects_quoted_and_escaped_delimiters(self):
        value = {'text': '[{[{' * 64 + '" \\ still text ' + '}]}]' * 64,
                 'exact': '9007199254740993/7', 'unknown': None}
        self.assertEqual(wire.loads_decision_pool(json.dumps(value)), value)

    def test_actual_prefix_loses_second_tied_minimum_and_keeps_failure_visible(self):
        value = fixture()
        certificate = wire.decision_pool_certificate(value)
        self.assertEqual(certificate['selection']['retained'], ['a', 'b'])
        self.assertEqual(certificate['calibration']['threshold'], '1/2')
        report = wire.decision_pool_replay_report(value, outcomes(value, certificate))
        self.assertEqual(report['decision']['certificate'], certificate)
        audit = report['outcome_audit']
        self.assertEqual(audit['true_minimizer_ids'], ['a', 'd'])
        self.assertEqual(audit['lost_minimizer_ids'], ['d'])
        self.assertIs(audit['all_true_minimizers_retained'], False)
        self.assertIs(audit['threshold_event_holds'], False)
        self.assertEqual(audit['retention_test'], 'feasible_failure')
        self.assertEqual(certificate['protocol']['premise_status'], 'assumed_unverified')
        for name in ('certified_feasible', 'dominated', 'incumbent', 'regret_bound', 'coverage'):
            self.assertNotIn(name, certificate['selection'])

    def test_every_missing_calibration_label_stays_recorded_and_never_filters_n(self):
        for panel_index, candidate_index, quantity in ((0, 0, 'score'), (1, 3, 'g'), (2, 1, 'score')):
            value = fixture()
            row = value['calibration_panels'][panel_index]['outcomes']['rows'][candidate_index]
            if quantity == 'score':
                row['score'] = None
            else:
                row['constraints'][quantity] = None
            certificate = wire.decision_pool_certificate(value)
            calibration = certificate['calibration']
            self.assertEqual((calibration['n'], calibration['complete_count'], calibration['threshold']), (3, 2, None))
            self.assertEqual(calibration['status'], 'incomplete_calibration')
            self.assertEqual(len(calibration['panels']), 3)
            original = calibration['panels'][panel_index]['outcomes']['rows'][candidate_index]
            self.assertIsNone(original['score'] if quantity == 'score' else original['constraints'][quantity])
            self.assertEqual(certificate['selection']['retained'], ['a', 'b', 'c', 'd'])

    def test_optional_malformed_future_fields_and_wrong_binding_reject(self):
        value = fixture()
        certificate = wire.decision_pool_certificate(value)
        truth = outcomes(value, certificate)
        cases = []
        for field in ('problem_digest', 'certificate_digest', 'panel_digest'):
            changed = deepcopy(truth); changed[field] = 'f' * 64; cases.append(changed)
        for field, content in (('latent_world', {'point': []}), ('threshold', '1'), ('calibration_panels', [])):
            changed = deepcopy(truth); changed[field] = content; cases.append(changed)
        changed = deepcopy(truth); changed['rows'].pop(); cases.append(changed)
        changed = deepcopy(truth); changed['rows'][0]['constraints'] = {}; cases.append(changed)
        changed = deepcopy(truth); changed['rows'][0]['constraints']['unknown'] = None; cases.append(changed)
        for changed in cases:
            with self.subTest(keys=tuple(changed)), self.assertRaises((ValueError, TypeError)):
                wire.decision_pool_replay_report(value, changed)

    def test_partial_future_truth_does_not_become_global_or_feasible_success(self):
        value = fixture()
        truth = outcomes(value)
        truth['rows'][-1]['score'] = None
        report = wire.decision_pool_replay_report(value, truth)
        audit = report['outcome_audit']
        for name in ('reported_feasible_ids', 'true_minimizer_ids', 'true_optimum_value',
                     'has_feasible_candidate', 'all_true_minimizers_retained', 'lost_minimizer_ids', 'threshold_event_holds'):
            self.assertIsNone(audit[name])
        self.assertEqual(audit['retention_test'], 'unknown_incomplete_truth')
        self.assertEqual(report['decision']['selection']['retained'], ['a', 'b'])

    def test_vacuous_truth_is_labeled_separately_from_feasible_success(self):
        value = fixture()
        truth = outcomes(value)
        for row in truth['rows']:
            row['constraints']['g'] = '1'
        audit = wire.decision_pool_replay_report(value, truth)['outcome_audit']
        self.assertIs(audit['all_true_minimizers_retained'], True)
        self.assertIs(audit['has_feasible_candidate'], False)
        self.assertIsNone(audit['true_optimum_value'])
        self.assertEqual(audit['true_minimizer_ids'], [])
        self.assertEqual(audit['retention_test'], 'vacuous_no_feasible_candidate')

    def test_derived_links_counts_scores_and_thresholds_are_not_caller_inputs(self):
        for target, field, content in (
            ('root', 'threshold', '0'), ('root', 'n', 0), ('root', 'scores', ['0']),
            ('protocol', 'protocol_digest', 'a' * 64),
            ('future_panel', 'panel_digest', 'a' * 64), ('future_panel', 'protocol_digest', 'a' * 64),
            ('calibration_outcomes', 'panel_digest', 'a' * 64),
        ):
            value = fixture()
            container = value if target == 'root' else value['calibration_panels'][0]['outcomes'] if target == 'calibration_outcomes' else value[target]
            container[field] = content
            with self.subTest(target=target, field=field), self.assertRaises((ValueError, TypeError)):
                wire.decision_pool_certificate(value)

    def test_mixed_scope_draw_and_universe_identity_reject_before_unsupported_fallback(self):
        cases = []
        value = fixture(); value['protocol']['constraint_scopes']['g']['scenario_id'] = 'other'; cases.append(value)
        value = fixture(); value['future_panel']['panel_id'] = 'cal-0'; cases.append(value)
        value = fixture(); value['calibration_panels'][1]['panel']['panel_id'] = 'cal-0'; cases.append(value)
        value = fixture(); value['future_panel']['candidate_ids'].pop(); value['future_panel']['ranked_ids'].pop(); cases.append(value)
        value = fixture(); value['calibration_panels'][0]['outcomes']['rows'][0]['constraints']['g'] = True; cases.append(value)
        value = fixture(); value['calibration_panels'][0]['outcomes']['rows'].pop(); cases.append(value)
        for value in cases:
            value['protocol']['premise_status'] = 'unsupported'
            with self.assertRaises((ValueError, TypeError)):
                wire.decision_pool_certificate(value)

    def test_original_spelling_and_source_only_changes_invalidate_outer_replay_binding(self):
        value = fixture()
        before = wire.decision_pool_certificate(value)
        old_truth = outcomes(value, before)
        variants = []
        changed = deepcopy(value); changed['alpha'] = '0.5'; variants.append(changed)
        changed = deepcopy(value); changed['description'] = 'Metadata only'; variants.append(changed)
        changed = deepcopy(value); changed['calibration_panels'][0]['outcomes']['source_reference'] += ':new'; variants.append(changed)
        changed = deepcopy(value); changed['calibration_panels'].reverse(); variants.append(changed)
        changed = deepcopy(value); changed['future_panel']['feature_manifest_digest'] = 'b' * 64; variants.append(changed)
        for changed in variants:
            after = wire.decision_pool_certificate(changed)
            self.assertEqual(after['selection']['retained'], before['selection']['retained'])
            self.assertNotEqual(after['problem_digest'], before['problem_digest'])
            self.assertNotEqual(after['certificate_digest'], before['certificate_digest'])
            with self.assertRaises(ValueError):
                wire.decision_pool_replay_report(changed, old_truth)

    def test_caller_mutation_during_reveal_cannot_change_the_sealed_experiment(self):
        value = fixture()
        certificate = wire.decision_pool_certificate(value)
        truth = outcomes(value, certificate)
        def reveal():
            value['alpha'] = '1/100'
            value['future_panel']['ranked_ids'].reverse()
            value['calibration_panels'].clear()
            return truth
        report = wire.decision_pool_replay_report(value, reveal)
        self.assertEqual(report['decision']['certificate'], certificate)
        self.assertEqual(report['decision']['selection']['retained'], ['a', 'b'])
        self.assertEqual(report['outcome_audit']['lost_minimizer_ids'], ['d'])

    def test_zero_statistical_threshold_does_not_authorize_infeasibility_claim(self):
        value = fixture()
        for entry in value['calibration_panels']:
            for row in entry['outcomes']['rows']:
                row['constraints']['g'] = '1'
        certificate = wire.decision_pool_certificate(value)
        self.assertEqual(certificate['calibration']['status'], 'finite_conditional')
        self.assertEqual(certificate['calibration']['threshold'], '0')
        self.assertEqual(certificate['selection']['retained'], [])
        self.assertIn('statistical_empty_pool', certificate['selection']['reasons'])
        report = wire.decision_pool_replay_report(value, outcomes(value, certificate))
        self.assertIs(report['outcome_audit']['has_feasible_candidate'], True)
        self.assertEqual(report['outcome_audit']['lost_minimizer_ids'], ['a', 'd'])
        self.assertEqual(report['outcome_audit']['retention_test'], 'feasible_failure')

    def test_future_loader_runs_after_complete_receipt_seal_and_not_for_invalid_input(self):
        value = fixture()
        expected = wire.decision_pool_certificate(value)
        truth = outcomes(value, expected)
        events = []
        original = wire._selection_receipt
        def seal(parsed):
            result = original(parsed)
            self.assertEqual(result['certificate_digest'], digest({key: item for key, item in result.items() if key != 'certificate_digest'}))
            events.append(('sealed', result['certificate_digest']))
            return result
        def read():
            self.assertEqual(events, [('sealed', expected['certificate_digest'])])
            events.append(('future_labels_opened',))
            return truth
        with patch.object(wire, '_selection_receipt', side_effect=seal):
            report = wire.decision_pool_replay_report(value, read)
        self.assertEqual(report['decision']['certificate'], expected)
        self.assertEqual(len(events), 2)
        value['future_panel']['panel_id'] = 'cal-0'
        with patch('builtins.open', side_effect=AssertionError('file opened')), \
             patch.object(wire, '_selection_receipt', side_effect=AssertionError('invalid input reached selection')):
            with self.assertRaises(ValueError):
                wire.decision_pool_replay_report(value, lambda: self.fail('future loader ran for invalid input'))

    def test_aggregate_and_numeric_caps_precede_conversion_even_for_direct_dict_callers(self):
        aggregate = large_fixture(64, 0)
        scalar_count = large_fixture(32, 8)
        for value, message in ((aggregate, 'total calibration and future candidate count'),
                               (scalar_count, 'rational token limit')):
            # Both inputs fit the raw byte cap, so the specific aggregate cap
            # must prevent arithmetic rather than relying on document size.
            self.assertLess(len(json.dumps(value, separators=(',', ':')).encode()), 256 * 1024)
            with patch.object(wire._Numbers, 'convert', side_effect=AssertionError('conversion before preflight')), \
                 self.assertRaisesRegex(ValueError, message):
                wire.parse_decision_pool_problem(value)
        allowed = large_fixture(64, 0, future_count=0)
        parsed = wire.parse_decision_pool_problem(allowed)
        self.assertEqual(sum(len(case.panel.candidate_ids) for case in parsed.calibration_panels), 4096)
        self.assertEqual(parsed.future_panel.candidate_ids, ())

    def test_local_count_and_rational_lexical_caps_precede_conversion(self):
        cases = []
        value = fixture(); value['future_panel']['candidate_ids'] = [str(i) for i in range(65)]
        value['future_panel']['ranked_ids'] = list(value['future_panel']['candidate_ids']); cases.append(value)
        value = fixture(); value['calibration_panels'] = [deepcopy(value['calibration_panels'][0]) for _ in range(65)]; cases.append(value)
        for token in ('9' * 513, ' 1/2', '1e0', '1/0', '1/-2'):
            value = fixture(); value['alpha'] = token; cases.append(value)
        for value in cases:
            with patch.object(wire._Numbers, 'convert', side_effect=AssertionError('conversion before preflight')), \
                 self.assertRaises((ValueError, TypeError)):
                wire.parse_decision_pool_problem(value)

    def test_original_input_and_full_receipt_survive_exact_json_round_trip(self):
        value = fixture()
        value['calibration_panels'][0]['outcomes']['source_reference'] = 'α 🌲 \" \\ <script>declared text</script>'
        value['calibration_panels'][0]['outcomes']['rows'][0]['score'] = str(2**300 + 1) + '/7'
        raw = json.dumps(value, ensure_ascii=False)
        certificate = wire.decision_pool_certificate(wire.loads_decision_pool(raw))
        round_trip = json.loads(json.dumps(certificate, ensure_ascii=False))
        self.assertEqual(round_trip, certificate)
        self.assertEqual(round_trip['certificate_digest'], digest({key: item for key, item in round_trip.items() if key != 'certificate_digest'}))
        self.assertEqual(certificate['calibration']['panels'][0]['outcomes']['rows'][0]['score'], str(Fraction(2**300 + 1, 7)))

    def test_full_verifier_rejects_resealed_originals_assessments_and_claims(self):
        value = fixture()
        original = wire.decision_pool_certificate(value)
        self.assertIs(verify_certificate(value, original)['verified'], True)
        mutations = [
            (('protocol', 'sampling_scope'), 'a different population'),
            (('calibration', 'panels', 0, 'outcomes', 'source_reference'), 'a substituted source'),
            (('calibration', 'panels', 0, 'outcomes', 'rows', 0, 'score'), None),
            (('calibration', 'panels', 0, 'assessment', 'minimizers'), ['d']),
            (('calibration', 'complete_count'), 2),
            (('calibration', 'conditional_guarantee'), 'coverage conditional on this calibration is proven'),
            (('future_panel', 'feature_manifest_digest'), 'f' * 64),
            (('selection', 'retained'), ['a', 'b', 'd']),
            (('physical_attestation',), 'established'),
        ]
        for path, replacement in mutations:
            changed = deepcopy(original)
            container = changed
            for key in path[:-1]:
                container = container[key]
            container[path[-1]] = replacement
            changed['certificate_digest'] = digest({key: item for key, item in changed.items() if key != 'certificate_digest'})
            with self.subTest(path=path), self.assertRaisesRegex(ValueError, 'exact deterministic recomputation'):
                verify_certificate(value, changed)

    def test_full_verifier_is_type_sensitive_when_boolean_equals_original_count(self):
        value = fixture()
        for entry in value['calibration_panels']:
            for row in entry['outcomes']['rows']:
                row['constraints']['g'] = '1'
        original = wire.decision_pool_certificate(value)
        changed = deepcopy(original)
        self.assertEqual(changed['selection']['retained_count'], 0)
        changed['selection']['retained_count'] = False
        # Deliberately leave the original seal in place: ordinary Python dict
        # equality accepts this substitution, but exact JSON identity must not.
        self.assertEqual(changed, original)
        with self.assertRaisesRegex(ValueError, 'exact deterministic recomputation'):
            verify_certificate(value, changed)

    def test_future_success_never_upgrades_unsupported_population_premise(self):
        value = fixture()
        value['protocol']['premise_status'] = 'unsupported'
        certificate = wire.decision_pool_certificate(value)
        report = wire.decision_pool_replay_report(value, outcomes(value, certificate))
        self.assertEqual(certificate['calibration']['status'], 'unsupported_premise')
        self.assertIsNone(certificate['calibration']['threshold'])
        self.assertIsNone(certificate['calibration']['conditional_guarantee'])
        self.assertEqual(certificate['selection']['retained'], ['a', 'b', 'c', 'd'])
        self.assertEqual(report['decision']['certificate'], certificate)
        self.assertEqual(report['outcome_audit']['retention_test'], 'feasible_success')
        self.assertIsNone(report['outcome_audit']['threshold_event_holds'])
        self.assertEqual(report['decision']['selection']['premise_status'], 'unsupported')

    def test_exact_boundary_includes_last_rank_without_lexical_or_rounding_order(self):
        value = fixture()
        # All three calibration maxima are rank two of four. An exactly equal
        # future rank must be included, even with an equivalent decimal alpha.
        for entry in value['calibration_panels']:
            for row in entry['outcomes']['rows']:
                row['score'] = '0' if row['candidate_id'] == 'b' else '1'
        value['alpha'] = '0.500'
        certificate = wire.decision_pool_certificate(value)
        self.assertEqual(certificate['selection']['threshold'], '1/2')
        self.assertEqual(certificate['selection']['retained'], ['a', 'b'])
        truth = outcomes(value, certificate)
        for row in truth['rows']:
            row['score'] = '0' if row['candidate_id'] == 'b' else '1'
        audit = wire.decision_pool_replay_report(value, truth)['outcome_audit']
        self.assertIs(audit['threshold_event_holds'], True)
        self.assertEqual(audit['retention_test'], 'feasible_success')


if __name__ == '__main__':
    unittest.main()
