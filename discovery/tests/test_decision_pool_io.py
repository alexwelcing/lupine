"""Exact wrapper and CLI checks; public examples are not physical validation."""
from copy import deepcopy
from fractions import Fraction
from io import StringIO
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from lupine_discovery import cli
from lupine_discovery.benchmarks import case_catalog, get_case, get_case_outcomes
from lupine_discovery.decision_pool_io import (
    decision_pool_certificate, decision_pool_replay_report, parse_decision_pool_problem,
)
from lupine_discovery.evidence import digest


CASE_IDS = ('decision-pool-ranked-ties', 'decision-pool-missing-label', 'decision-pool-feasible-failure')


def problem():
    return get_case(CASE_IDS[0])['problem']


def truth_for(value, rows=None):
    certificate = decision_pool_certificate(value)
    return {'schema': 'lupine.discovery.decision_pool_outcomes.v1',
            'scenario_id': value['protocol']['scenario_id'], 'problem_digest': certificate['problem_digest'],
            'certificate_digest': certificate['certificate_digest'],
            'panel_digest': certificate['future_panel']['panel_digest'],
            'source_reference': 'Independent constructed labels in this test.',
            'rows': rows if rows is not None else [
                {'candidate_id': cid, 'score': str(index), 'constraints': {'g': '0'}}
                for index, cid in enumerate(value['future_panel']['candidate_ids'])]}


def sealed(value, key):
    return value[key] == digest({name: item for name, item in value.items() if name != key})


class DecisionPoolIOTests(unittest.TestCase):
    def test_packaged_receipts_recompute_and_failures_match_direct_truth_oracle(self):
        catalog_ids = {entry['id'] for entry in case_catalog()}
        self.assertTrue(set(CASE_IDS) <= catalog_ids)
        resources = Path(__file__).parents[1] / 'src/lupine_discovery/resources'
        for case_id in CASE_IDS:
            value = get_case(case_id)['problem']
            before = deepcopy(value)
            receipt = cli.certificate(value)
            stored = json.loads((resources / 'certificates' / f'{case_id}.json').read_text())
            self.assertEqual(receipt, stored)
            self.assertTrue(cli.verify_certificate(value, stored)['verified'])
            raw = get_case_outcomes(case_id, value)
            replay = cli.replay_report(value, lambda: raw)
            feasible = [row for row in raw['rows'] if all(Fraction(v) <= 0 for v in row['constraints'].values())]
            optimum = min((Fraction(row['score']) for row in feasible), default=None)
            minima = sorted(row['candidate_id'] for row in feasible if Fraction(row['score']) == optimum)
            retained = receipt['selection']['retained']
            self.assertEqual(replay['outcome_audit']['true_minimizer_ids'], minima)
            self.assertEqual(replay['outcome_audit']['lost_minimizer_ids'], [cid for cid in minima if cid not in retained])
            self.assertEqual(replay['outcome_audit']['all_true_minimizers_retained'], all(cid in retained for cid in minima))
            self.assertTrue(sealed(receipt, 'certificate_digest'))
            self.assertTrue(sealed(replay, 'replay_digest'))
            self.assertEqual(replay['outcomes_digest'], digest(raw))
            self.assertEqual(value, before)
        self.assertEqual(cli.certificate(problem())['selection']['retained'], ['a', 'b'])

    def test_original_calibration_records_are_preserved_without_recursive_duplication(self):
        value = problem()
        receipt = decision_pool_certificate(value)
        self.assertEqual(receipt['calibration']['n'], len(value['calibration_panels']))
        for original, entry in zip(value['calibration_panels'], receipt['calibration']['panels']):
            self.assertEqual(set(entry), {'panel', 'outcomes', 'assessment'})
            self.assertEqual(entry['panel']['protocol_digest'], receipt['protocol']['protocol_digest'])
            self.assertEqual(entry['outcomes']['panel_digest'], entry['panel']['panel_digest'])
            self.assertEqual(entry['assessment']['panel_digest'], entry['panel']['panel_digest'])
            self.assertEqual(entry['assessment']['outcomes_digest'], entry['outcomes']['outcomes_digest'])
            self.assertEqual(entry['outcomes']['source_reference'], original['outcomes']['source_reference'])
            self.assertEqual(entry['outcomes']['rows'], original['outcomes']['rows'])
            self.assertNotIn('protocol', entry['assessment'])
            self.assertNotIn('outcomes', entry['assessment'])
        self.assertEqual(receipt['selection']['ranked_ids'], value['future_panel']['ranked_ids'])
        self.assertEqual(receipt['selection']['retained_fraction'], '1/2')

    def test_canonical_universe_and_rows_do_not_erase_declared_ranking(self):
        value = problem()
        first = decision_pool_certificate(value)
        changed = deepcopy(value)
        changed['future_panel']['candidate_ids'].reverse()
        for case in changed['calibration_panels']:
            case['panel']['candidate_ids'].reverse()
            case['outcomes']['rows'].reverse()
        second = decision_pool_certificate(changed)
        self.assertNotEqual(first['problem_digest'], second['problem_digest'])
        self.assertEqual(first['calibration'], second['calibration'])
        self.assertEqual(first['future_panel'], second['future_panel'])
        self.assertEqual(first['selection'], second['selection'])
        changed['future_panel']['ranked_ids'].reverse()
        third = decision_pool_certificate(changed)
        self.assertEqual(third['selection']['retained'], ['d', 'c'])
        self.assertNotEqual(third['future_panel']['panel_digest'], second['future_panel']['panel_digest'])

    def test_all_complete_ties_force_full_threshold_and_variable_future_size(self):
        value = problem()
        for case in value['calibration_panels']:
            for row in case['outcomes']['rows']:
                row['score'] = '7/3'
        value['future_panel']['universe_id'] = 'different-size-universe'
        value['future_panel']['candidate_ids'] = ['only']
        value['future_panel']['ranked_ids'] = ['only']
        receipt = decision_pool_certificate(value)
        self.assertEqual([entry['assessment']['score'] for entry in receipt['calibration']['panels']], ['1'] * 3)
        self.assertEqual(receipt['calibration']['threshold'], '1')
        self.assertEqual(receipt['selection']['retained'], ['only'])
        self.assertEqual(receipt['selection']['guarantee_status'], 'conditional_single_panel_marginal')

    def test_variable_panel_sizes_use_each_original_denominator(self):
        value = problem()
        # Scores 1/2, 2/3, 1/4, whose second order statistic is 1/2.
        for index, (count, best) in enumerate(((2, 0), (3, 1), (4, 0))):
            case = value['calibration_panels'][index]
            ids = list('abcd')[:count]
            case['panel']['universe_id'] = f'universe-{count}'
            case['panel']['candidate_ids'] = list(ids)
            case['panel']['ranked_ids'] = list(ids)
            case['outcomes']['rows'] = [{'candidate_id': cid, 'score': '0' if i == best else '1', 'constraints': {'g': '0'}} for i, cid in enumerate(ids)]
        receipt = decision_pool_certificate(value)
        self.assertEqual([p['assessment']['score'] for p in receipt['calibration']['panels']], ['1/2', '2/3', '1/4'])
        self.assertEqual(receipt['calibration']['threshold'], '1/2')

    def test_insufficient_calibration_and_unsupported_missing_have_distinct_states(self):
        value = problem()
        value['calibration_panels'] = []
        receipt = decision_pool_certificate(value)
        self.assertEqual((receipt['calibration']['n'], receipt['calibration']['k']), (0, 1))
        self.assertEqual(receipt['calibration']['status'], 'insufficient_calibration')
        self.assertEqual(receipt['selection']['threshold'], '1')
        self.assertEqual(receipt['selection']['guarantee_status'], 'deterministic_all_universe')
        value = get_case(CASE_IDS[1])['problem']
        value['protocol']['premise_status'] = 'unsupported'
        value['alpha'] = '1/1000'
        receipt = decision_pool_certificate(value)
        self.assertEqual(receipt['calibration']['status'], 'unsupported_premise')
        self.assertIsNone(receipt['selection']['threshold'])
        self.assertEqual(receipt['selection']['retained'], ['a', 'b', 'c', 'd'])
        self.assertEqual(len(receipt['calibration']['reasons']), 3)
        self.assertEqual(receipt['calibration']['complete_count'], 2)
        replay = decision_pool_replay_report(value, truth_for(value))
        self.assertIsNone(replay['outcome_audit']['threshold_event_holds'])
        self.assertEqual(replay['decision']['certificate']['calibration']['status'], 'unsupported_premise')

    def test_empty_future_never_divides_by_zero_or_claims_feasible_success(self):
        value = problem()
        value['future_panel']['universe_id'] = 'empty-universe'
        value['future_panel']['candidate_ids'] = []
        value['future_panel']['ranked_ids'] = []
        receipt = decision_pool_certificate(value)
        self.assertEqual(receipt['selection']['retained'], [])
        self.assertIsNone(receipt['selection']['retained_fraction'])
        report = decision_pool_replay_report(value, truth_for(value, []))
        audit = report['outcome_audit']
        self.assertEqual(audit['retention_test'], 'vacuous_empty_universe')
        self.assertEqual(audit['worst_minimizer_rank_fraction'], '0')
        self.assertIs(audit['all_true_minimizers_retained'], True)
        self.assertIs(audit['has_feasible_candidate'], False)
        self.assertIsNone(audit['true_optimum_value'])

    def test_partial_future_changes_audit_only_and_never_recalibrates(self):
        value = problem()
        receipt = decision_pool_certificate(value)
        known = truth_for(value)
        unknown = deepcopy(known)
        unknown['rows'][0]['constraints']['g'] = None
        complete_report = decision_pool_replay_report(value, known)
        partial_report = decision_pool_replay_report(value, unknown)
        self.assertEqual(complete_report['decision'], partial_report['decision'])
        self.assertEqual(partial_report['decision']['certificate'], receipt)
        self.assertEqual(partial_report['outcome_audit']['missing'], [['a', 'g']])
        self.assertIsNone(partial_report['outcome_audit']['all_true_minimizers_retained'])
        self.assertNotEqual(complete_report['replay_digest'], partial_report['replay_digest'])

    def test_type_sensitive_verify_rejects_count_bool_swap_and_resealed_edit(self):
        value = problem()
        receipt = decision_pool_certificate(value)
        for field, replacement in (('m', False), ('retained', ['a', 'b', 'c'])):
            forged = deepcopy(receipt)
            forged['selection'][field] = replacement
            forged['certificate_digest'] = digest({key: item for key, item in forged.items() if key != 'certificate_digest'})
            with self.assertRaises(ValueError):
                cli.verify_certificate(value, forged)
        value['future_panel']['universe_id'] = 'empty'
        value['future_panel']['candidate_ids'] = []
        value['future_panel']['ranked_ids'] = []
        forged = decision_pool_certificate(value)
        forged['selection']['m'] = False  # Python False == 0; exact JSON still differs.
        with self.assertRaises(ValueError):
            cli.verify_certificate(value, forged)

    def test_parser_results_are_frozen_and_independent_of_original_containers(self):
        value = problem()
        parsed = parse_decision_pool_problem(value)
        old_digest = parsed.problem_digest
        value['protocol']['constraint_scopes'].clear()
        value['future_panel']['ranked_ids'].reverse()
        value['calibration_panels'][0]['outcomes']['rows'].clear()
        self.assertEqual(parsed.future_panel.ranked_ids, ('a', 'b', 'c', 'd'))
        self.assertEqual(len(parsed.calibration_panels[0].outcomes.rows), 4)
        self.assertEqual(parsed.problem_digest, old_digest)
        with self.assertRaises((AttributeError, TypeError)):
            parsed.alpha = Fraction(1, 100)
        with self.assertRaises(TypeError):
            parsed.protocol.constraint_scopes['new'] = parsed.protocol.objective_scope

    def test_cli_roundtrip_all_fixtures_uses_compact_receipt_and_preserves_failures(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for case_id in CASE_IDS:
                value = get_case(case_id)['problem']
                truth = get_case_outcomes(case_id, value)
                paths = {name: root / f'{case_id}-{name}.json' for name in ('problem','outcomes','receipt','replay')}
                paths['problem'].write_text(json.dumps(value))
                paths['outcomes'].write_text(json.dumps(truth))
                self.assertEqual(cli.main(['select', str(paths['problem']), '--output', str(paths['receipt'])]), 0)
                raw = paths['receipt'].read_text()
                self.assertEqual(len(raw.splitlines()), 1)
                with patch('sys.stdout', new=StringIO()) as output:
                    self.assertEqual(cli.main(['verify', str(paths['problem']), str(paths['receipt'])]), 0)
                    self.assertIs(json.loads(output.getvalue())['verified'], True)
                self.assertEqual(cli.main(['replay', str(paths['problem']), str(paths['outcomes']), '--output', str(paths['replay'])]), 0)
                result = json.loads(paths['replay'].read_text())
                self.assertEqual(result, decision_pool_replay_report(value, truth))

    def test_cli_seals_before_opening_future_path_and_invalid_problem_opens_no_truth(self):
        value = problem()
        truth = truth_for(value)
        from lupine_discovery import decision_pool_io as wire
        events = []
        original = wire._selection_receipt
        def seal(parsed):
            receipt = original(parsed)
            events.append('sealed')
            return receipt
        with tempfile.TemporaryDirectory() as directory:
            original_path = Path(directory) / 'problem.json'
            truth_path = Path(directory) / 'truth.json'
            original_path.write_text(json.dumps(value))
            truth_path.write_text(json.dumps(truth))
            read = cli._read_document
            def bounded_read(path, **kwargs):
                if path == truth_path:
                    self.assertEqual(events, ['sealed'])
                    events.append('truth-opened')
                return read(path, **kwargs)
            with patch.object(wire, '_selection_receipt', side_effect=seal), patch.object(cli, '_read_document', side_effect=bounded_read), patch('sys.stdout', new=StringIO()):
                self.assertEqual(cli.main(['replay', str(original_path), str(truth_path)]), 0)
            self.assertEqual(events, ['sealed', 'truth-opened'])
            value['future_panel']['ranked_ids'].pop()
            original_path.write_text(json.dumps(value))
            events.clear()
            with patch.object(cli, '_read_document', side_effect=bounded_read), patch('sys.stderr', new=StringIO()):
                self.assertEqual(cli.main(['replay', str(original_path), str(truth_path)]), 2)
            self.assertEqual(events, [])


if __name__ == '__main__':
    unittest.main()
