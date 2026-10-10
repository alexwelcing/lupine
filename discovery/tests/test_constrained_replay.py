import copy
from dataclasses import replace
from fractions import Fraction
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from lupine_discovery.calibration import plan_calibration
from lupine_discovery.core import Interval


SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'constrained_replay.py'
SPEC = importlib.util.spec_from_file_location('constrained_replay_test_module', SCRIPT)
replay = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = replay
SPEC.loader.exec_module(replay)


def freeze_fixture(roles=('primary',), unbounded=False):
    """Public synthetic targets only; never imports or reads archived targets."""
    panels, targets = [], {}
    counters = {'primary': 0, 'shift': 0}
    for panel_number, role in enumerate(roles):
        panel_id = f'{role}-{counters[role]:03d}'
        counters[role] += 1
        candidates, panel_targets = [], {}
        for index in range(20):
            jid = f'JVASP-{1000*panel_number + index + 1}'
            gap = Fraction(min(index, 18), 2)  # two exact tied optima
            formation = Fraction(1 if index % 5 == 0 else -1)
            candidates.append({'jid': jid, 'neighbors': [f'JVASP-{90000+j}' for j in range(5)],
                               'predicted_gap': str(gap), 'predicted_formation': str(formation),
                               'nearest_gap': str(-gap), 'nearest_formation': str(formation),
                               'score_interval': None if unbounded else [str(-gap), str(-gap)],
                               'constraint_interval': None if unbounded else [str(formation), str(formation)]})
            panel_targets[jid] = {'gap': str(gap), 'formation': str(formation)}
        nominal = [row['jid'] for row in sorted(candidates, key=lambda row: (
            Fraction(row['predicted_formation']) > 0, max(Fraction(row['predicted_formation']), 0),
            -Fraction(row['predicted_gap']), row['jid']))]
        nearest = [row['jid'] for row in sorted(candidates, key=lambda row: (
            Fraction(row['nearest_formation']) > 0, max(Fraction(row['nearest_formation']), 0),
            -Fraction(row['nearest_gap']), row['jid']))]
        panels.append({'id': panel_id, 'role': role,
                       'operational_status': 'abstain_unsupported_scope' if role == 'shift' else
                       'abstain_unbounded' if unbounded else 'conditional_finite',
                       'candidates': candidates, 'nominal_order': nominal, 'nearest_order': nearest,
                       'random_orders': {str(seed): sorted(panel_targets, key=lambda jid: (
                           replay.H(f'random-{seed}', panel_id + '\n' + jid), jid)) for seed in range(100)}})
        targets[panel_id] = panel_targets
    plan = plan_calibration(10 if unbounded else 399, 20, '1/10', target_count=2)
    freeze = {'schema': 'lupine.discovery.constrained.freeze.v1', 'protocol_id': replay.PROTOCOL_ID,
              'protocol_commit': 'synthetic-not-a-science-run', 'protocol_sha256': 'synthetic',
              'source_receipt_sha256': 'synthetic-source', 'metadata_sha256': 'synthetic-metadata',
              'target_seal': {'path': 'evaluation-targets.json', 'sha256': 'synthetic-targets'},
              'receipt_sha256': 'synthetic-freeze', 'model_digest': 'synthetic-model',
              'summary': {'selected': {'train': 5, 'calibration': plan.calibration_count}},
              'calibration': {'count': plan.calibration_count, 'rank': plan.rank,
                              'candidate_count': 20, 'target_count': 2, 'delta': '1/10', 'epsilon': '1/400',
                              'outcome_kind': plan.outcome_kind,
                              'gap_radius': None if unbounded else '0',
                              'formation_radius': None if unbounded else '0'},
              'panels': panels}
    return freeze, {'schema': 'lupine.discovery.constrained.targets.v1',
                    'protocol_id': replay.PROTOCOL_ID, 'panels': targets}


def run_synthetic(freeze, targets, temp_path, validation=None, opened=None):
    def open_targets(path, verified):
        if opened is not None:
            opened.append('targets')
        if not list(Path(path).parent.glob('replay-execution-*.json')):
            raise AssertionError('execution identity was not saved before target access')
        if verified != freeze:
            raise AssertionError('target opener received a different freeze')
        return copy.deepcopy(targets)
    tools = SimpleNamespace(verify_freeze=lambda path: copy.deepcopy(freeze),
                            read_verified_json=lambda path, checksum: {
                                'license': 'CC BY 4.0', 'author': 'synthetic fixture',
                                'source_kind': 'synthetic_not_archive_accuracy'},
                            open_sealed_targets=open_targets)
    with patch.object(replay, '_protocol_tools', return_value=tools):
        return replay.run_replay(Path(temp_path) / 'freeze.json', engineering_validation=validation)


class ConstrainedReplayTests(unittest.TestCase):
    def test_frozen_orders_exact_orientation_scope_and_calibration(self):
        freeze, _ = freeze_fixture(('primary', 'shift'))
        panels = replay.parse_panels(freeze)
        self.assertEqual(len(panels), 2)
        self.assertEqual(panels[0].nominal_order[:2], ('JVASP-19', 'JVASP-20'))
        self.assertEqual(panels[0].candidates[0].formation.lower, 1)
        for mutator in (
                lambda value: value['panels'][0]['nominal_order'].reverse(),
                lambda value: value['panels'][0]['nearest_order'].reverse(),
                lambda value: value['panels'][0]['random_orders']['0'].reverse(),
                lambda value: value['calibration'].__setitem__('rank', 1),
                lambda value: value['calibration'].__setitem__('epsilon', '1/10'),
                lambda value: value['panels'][0]['candidates'][0].__setitem__('truth', 'forbidden'),
                lambda value: value['panels'][0]['candidates'][0].__setitem__('score_interval', ['0', '1']),
                lambda value: value['panels'][1].__setitem__('operational_status', 'conditional_finite')):
            invalid = copy.deepcopy(freeze)
            mutator(invalid)
            with self.assertRaises(ValueError):
                replay.parse_panels(invalid)
        unbounded, _ = freeze_fixture(unbounded=True)
        self.assertEqual(replay.parse_panels(unbounded)[0].operational_status, 'abstain_unbounded')
        unbounded['calibration']['gap_radius'] = '0'
        with self.assertRaises(ValueError):
            replay.parse_panels(unbounded)

    def test_oracle_rejects_unselected_cross_policy_duplicate_and_excess_access(self):
        reads, log = [], []
        def read(jid):
            reads.append(jid)
            return replay.Target(Fraction(3), Fraction(-1))
        oracle = replay.PolicyOracle('primary-000', 'interval', ('JVASP-1', 'JVASP-2'), read, log, 1)
        with self.assertRaises(PermissionError):
            oracle.reveal(replay.RevealRequest('primary-000', 'interval', 'JVASP-1', 1))
        with self.assertRaises(PermissionError):
            oracle.authorize('primary-000', 'nominal_5nn', 'JVASP-1')
        with self.assertRaises(PermissionError):
            oracle.authorize('shift-000', 'interval', 'JVASP-1')
        with self.assertRaises(PermissionError):
            oracle.authorize('primary-000', 'interval', 'JVASP-999')
        request = oracle.authorize('primary-000', 'interval', 'JVASP-1')
        with self.assertRaises(PermissionError):
            oracle.reveal(replace(request, jid='JVASP-2'))
        self.assertEqual(reads, [])
        observed = oracle.reveal(request)
        self.assertEqual(observed.gap, 3)
        self.assertEqual(reads, ['JVASP-1'])
        with self.assertRaises(PermissionError):
            oracle.reveal(request)
        with self.assertRaises(PermissionError):
            oracle.authorize('primary-000', 'interval', 'JVASP-1')
        with self.assertRaises(PermissionError):
            oracle.authorize('primary-000', 'interval', 'JVASP-2')
        self.assertEqual(oracle.count, 1)
        self.assertEqual(len(log), 1)

    def test_policy_history_cannot_cross_owner_and_targets_are_not_in_view(self):
        freeze, _ = freeze_fixture()
        panel = replay.parse_panels(freeze)[0]
        observation = replay.Observation(panel.panel_id, 'nominal_5nn', panel.ids[0], Fraction(3), Fraction(-1))
        with self.assertRaises(PermissionError):
            replay.PolicyView(panel, 'interval', (observation,))
        own = replace(observation, policy_id='interval')
        with self.assertRaises(PermissionError):
            replay.PolicyView(panel, 'interval', (own, own))
        with self.assertRaises(TypeError):
            replay.PolicyView(panel, 'interval', [own])
        view = replay.PolicyView(panel, 'interval', ())
        self.assertFalse(hasattr(view, 'targets'))
        self.assertEqual(replay.choose_next(view)['jid'], 'JVASP-19')

    def test_vault_blocks_full_audit_until_all_103_policy_budgets_finish(self):
        freeze, targets = freeze_fixture()
        panel = replay.parse_panels(freeze)[0]
        log = []
        vault = replay.TargetVault(targets, (panel,), log)
        with self.assertRaises(PermissionError):
            vault.audit_all()
        for policy in replay.POLICIES:
            oracle = vault.oracle(panel.panel_id, policy)
            with self.assertRaises(PermissionError):
                vault.finish(oracle)
            replay.run_policy(panel, policy, oracle)
            vault.finish(oracle)
            if policy != replay.POLICIES[-1]:
                with self.assertRaises(PermissionError):
                    vault.audit_all()
        truth = vault.audit_all()
        self.assertEqual(len(truth[panel.panel_id]), 20)
        self.assertEqual(log[-1]['event'], 'post_run_full_target_audit')
        self.assertEqual(sum(entry['event'] == 'oracle_reveal' for entry in log), 2060)
        with self.assertRaises(PermissionError):
            vault.audit_all()
        with self.assertRaises(PermissionError):
            vault.oracle(panel.panel_id, 'interval')

    def test_shift_and_unbounded_retain_every_unrevealed_and_schedule_nominal(self):
        for role, unbounded in (('shift', False), ('primary', True)):
            freeze, targets = freeze_fixture((role,), unbounded=unbounded)
            panel = replay.parse_panels(freeze)[0]
            vault = replay.TargetVault(targets, (panel,), [])
            interval = replay.run_policy(panel, 'interval', vault.oracle(panel.panel_id, 'interval'))
            nominal = replay.run_policy(panel, 'nominal_5nn', vault.oracle(panel.panel_id, 'nominal_5nn'))
            self.assertEqual([event['jid'] for event in interval['events']],
                             [event['jid'] for event in nominal['events']])
            for state in interval['budgets'].values():
                selection = state['selection']
                self.assertTrue(set(panel.ids) - set(state['revealed_ids']) <= set(selection['retained']))
                self.assertIsNone(selection['regret_bound'])
                self.assertIsNone(selection['unmeasured_guarantee'])
                self.assertTrue(set(selection['certified_feasible']) <= set(state['revealed_ids']))
            self.assertTrue(all(event['reason'] == 'abstention_nominal_order' for event in interval['events']))

    def test_fallback_pays_bundle_cost_and_tied_incumbents_are_preserved(self):
        freeze, targets = freeze_fixture()
        panel = replay.parse_panels(freeze)[0]
        vault = replay.TargetVault(targets, (panel,), [])
        run = replay.run_policy(panel, 'interval', vault.oracle(panel.panel_id, 'interval'))
        self.assertEqual(run['budgets']['2']['incumbent_ids'], ['JVASP-19', 'JVASP-20'])
        self.assertEqual(run['budgets']['0']['incumbent_ids'], [])
        self.assertFalse(run['budgets']['0']['verified_feasible_hit'])
        self.assertEqual(run['fallback_count'], 18)
        self.assertEqual(run['target_bundles'], 20)
        self.assertEqual(len({event['jid'] for event in run['events']}), 20)
        self.assertEqual(run['events'][2]['reason'], 'fallback_outside_pool')

    def test_truth_oracle_constraint_zero_ties_and_no_feasible_stratum(self):
        targets = {'a': replay.Target(Fraction(4), Fraction(0)),
                   'b': replay.Target(Fraction(4), Fraction(-1)),
                   'c': replay.Target(Fraction(99), Fraction(1))}
        truth = replay.truth_summary(targets)
        self.assertEqual(truth['optimum_ids'], ['a', 'b'])
        self.assertEqual(truth['feasible_count'], 2)
        no_feasible = replay.truth_summary({'c': targets['c']})
        self.assertIsNone(no_feasible['archive_optimum_gap'])
        self.assertEqual(no_feasible['optimum_ids'], [])
        self.assertEqual(no_feasible['status'], 'no_feasible_truth')

    def test_exact_paired_sign_test_denominators_and_threshold(self):
        def panel(left, right):
            return {'policies': {name: {'budgets': {'4': {'within_0_1_ev_success': value}}}
                                 for name, value in (('interval', left), ('nominal_5nn', right))}}
        result = replay.paired_comparison([panel(True, False), panel(False, True), panel(True, True),
                                           panel(None, None)], 'nominal_5nn')
        self.assertEqual((result['wins'], result['losses'], result['ties']), (1, 1, 1))
        self.assertEqual(result['feasible_panel_denominator'], 3)
        self.assertEqual(result['excluded_no_feasible_panels'], 1)
        self.assertEqual(result['one_sided_sign_test_p'], '3/4')
        self.assertEqual(result['paired_success_fraction_difference'], '0')
        six_wins = replay.paired_comparison([panel(True, False)] * 6, 'nominal_5nn')
        self.assertEqual(six_wins['one_sided_sign_test_p'], '1/64')
        self.assertTrue(six_wins['provisional_p_gate'])
        self.assertEqual(replay.paired_comparison([panel(True, True)] * 10, 'nominal_5nn')['one_sided_sign_test_p'], '1')
        self.assertEqual(replay.paired_comparison([panel(False, True)] * 6, 'nominal_5nn')['one_sided_sign_test_p'], '1')

    def test_unsound_control_and_audit_expose_lost_optimum_false_exclusion(self):
        self.assertTrue(replay.injected_unsound_control()['lost_optimum_exposed'])
        self.assertFalse(replay.injected_unsound_control()['counted_as_archive_accuracy'])
        freeze, payload = freeze_fixture()
        panel = replay.parse_panels(freeze)[0]
        targets = {jid: replay.Target(Fraction(row['gap']), Fraction(row['formation']))
                   for jid, row in payload['panels'][panel.panel_id].items()}
        # A candidate initially certified infeasible is actually the best feasible.
        targets['JVASP-1'] = replay.Target(Fraction(100), Fraction(-1))
        truth = replay.truth_summary(targets)
        selection = replay.current_selection(replay.PolicyView(panel, 'interval', ()))
        audit = replay.screening_audit(selection, targets, truth)
        self.assertEqual(audit['lost_optimum_ids'], ['JVASP-1'])
        self.assertEqual(audit['false_infeasibility_exclusions'], ['JVASP-1'])
        self.assertTrue(audit['conditional_regret_bound_violation'])
        coverage = replay.coverage_audit(panel, targets)
        self.assertFalse(coverage['panel_simultaneous'])
        self.assertEqual({row['property'] for row in coverage['misses']}, {'gap', 'formation'})

    def test_end_to_end_synthetic_replay_equal_budgets_and_gate_honesty(self):
        freeze, targets = freeze_fixture(('primary', 'shift'))
        with tempfile.TemporaryDirectory() as directory:
            report = run_synthetic(freeze, targets, directory)
        self.assertEqual(report['resources']['target_bundles'], 4120)
        self.assertEqual(report['resources']['policy_run_count'], 206)
        self.assertEqual(report['gates']['engineering_integrity']['status'], 'OPEN')
        self.assertEqual(report['gates']['nontrivial_constrained_evidence']['status'], 'OPEN')
        self.assertEqual(report['gates']['recommendation_value']['status'], 'FAIL')
        self.assertEqual(report['gates']['shift_behavior']['status'], 'PASS')
        self.assertEqual(report['arms']['primary']['panel_simultaneous_coverage']['fraction'], '1')
        self.assertEqual(report['arms']['shift']['interval_coverage_scope'], 'unsupported_transfer_diagnostic')
        self.assertEqual(report['premise_status']['shift'], 'unsupported_scope')
        self.assertEqual(report['training_calibration_cost']['training_target_bundles'], 5)
        self.assertEqual(report['training_calibration_cost']['calibration_target_bundles'], 399)
        self.assertEqual(report['source']['license'], 'CC BY 4.0')
        self.assertEqual(report['oracle_access_log'][-1]['event'], 'post_run_full_target_audit')
        self.assertEqual(report['oracle_access_log'][1]['event'], 'execution_receipt_saved_before_targets')
        for panel in report['panels']:
            for run in panel['policies'].values():
                self.assertTrue(run['budgets']['20']['all_optima_recovered'])
                self.assertFalse(run['budgets']['0']['within_0_1_ev_success'])
                self.assertEqual(run['budgets']['20']['reveal_count'], 20)
        sensitivity = report['arms']['primary']['random_sensitivity']
        self.assertFalse(sensitivity['independent_experiments'])
        self.assertEqual(sensitivity['budgets']['20']['within_0_1_ev_success_mean'], '1')
        self.assertEqual(report['scientific_result_sha256'], replay.scientific_result_identity(report))
        moved = copy.deepcopy(report)
        moved['resources']['elapsed_cpu_seconds'] = '999'
        moved['reproduction']['command'] = ['different-machine-path']
        moved['execution_receipt']['path'] = 'different-path.json'
        moved['gates']['engineering_integrity']['validation']['receipt_sha256'] = 'different-log-location'
        self.assertEqual(replay.scientific_result_identity(report), replay.scientific_result_identity(moved))
        moved['arms']['primary']['policy_curves']['random_99']['4']['within_0_1_ev_success']['numerator'] += 1
        self.assertNotEqual(replay.scientific_result_identity(report), replay.scientific_result_identity(moved))
        boundaries = copy.deepcopy(report['arms'])
        primary = boundaries['primary']
        primary.update(panel_count=40, candidate_count=800, infeasible_candidate_count=40,
                       mixed_feasibility_panel_count=10, median_retained_fraction='4/5',
                       actually_infeasible_certified_incumbent_count=0)
        primary['panel_simultaneous_coverage']['fraction'] = '9/10'
        primary['all_optimum_retention']['fraction'] = '19/20'
        gates = replay.acceptance_gates(report['panels'], boundaries, {'status': 'verified_passed'},
                                         {'runtime_check': True})
        self.assertEqual(gates['engineering_integrity']['status'], 'PASS')
        self.assertEqual(gates['nontrivial_constrained_evidence']['status'], 'PASS')
        self.assertEqual(gates['observed_primary_screening']['status'], 'PASS')
        primary['panel_simultaneous_coverage']['fraction'] = '8999/10000'
        gates = replay.acceptance_gates(report['panels'], boundaries, {'status': 'verified_passed'},
                                         {'runtime_check': True})
        self.assertEqual(gates['observed_primary_screening']['status'], 'FAIL')

    def test_no_feasible_panels_do_not_become_vacuous_success(self):
        freeze, targets = freeze_fixture()
        for row in targets['panels']['primary-000'].values():
            row['formation'] = '1'
        with tempfile.TemporaryDirectory() as directory:
            report = run_synthetic(freeze, targets, directory)
        arm = report['arms']['primary']
        self.assertEqual(arm['no_feasible_panel_count'], 1)
        self.assertEqual(arm['all_optimum_retention']['denominator'], 0)
        self.assertIsNone(arm['all_optimum_retention']['fraction'])
        for policy in replay.POLICIES:
            state = report['panels'][0]['policies'][policy]['budgets']['20']
            self.assertIsNone(state['within_0_1_ev_success'])
            self.assertIsNone(state['all_optima_recovered'])
            self.assertIsNone(state['simple_regret'])
            self.assertFalse(state['verified_feasible_hit'])
        hit = arm['policy_curves']['interval']['20']['feasible_hit']
        self.assertEqual((hit['numerator'], hit['denominator']), (0, 1))

    def test_freeze_and_execution_validation_fail_before_target_opener(self):
        targets = unittest.mock.Mock(side_effect=AssertionError('target opener was touched'))
        tools = SimpleNamespace(verify_freeze=unittest.mock.Mock(side_effect=ValueError('broken freeze seal')),
                                open_sealed_targets=targets)
        with tempfile.TemporaryDirectory() as directory, patch.object(replay, '_protocol_tools', return_value=tools):
            with self.assertRaisesRegex(ValueError, 'broken freeze seal'):
                replay.run_replay(Path(directory) / 'freeze.json')
        targets.assert_not_called()
        freeze, target_payload = freeze_fixture()
        invalid = copy.deepcopy(freeze)
        invalid['panels'][0]['candidates'][0]['predicted_gap'] = '9999'
        opened = []
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(ValueError):
                run_synthetic(invalid, target_payload, directory, opened=opened)
        self.assertEqual(opened, [])

    def test_engineering_receipt_binds_sources_and_result_log(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            names = ['scripts/constrained_benchmark.py', 'scripts/constrained_replay.py',
                     'tests/test_constrained_benchmark.py', 'tests/test_constrained_replay.py']
            for name in names:
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text('# synthetic test-bound source\n')
            log = root / '.cache' / 'test.log'
            log.parent.mkdir()
            log.write_text('Ran 4 tests\nOK\n')
            receipt = {'schema': 'lupine.discovery.engineering-validation.v1', 'status': 'passed',
                       'command': ['python', '-m', 'unittest'], 'exit_code': 0,
                       'source_sha256': {name: hashlib.sha256((root / name).read_bytes()).hexdigest()
                                         for name in names},
                       'result_log_path': '.cache/test.log',
                       'result_log_sha256': hashlib.sha256(log.read_bytes()).hexdigest(), 'test_count': 4}
            verified = replay.verify_engineering_validation(receipt, root)
            self.assertEqual(verified['status'], 'verified_passed')
            (root / names[1]).write_text('# changed after testing\n')
            with self.assertRaisesRegex(ValueError, 'changed'):
                replay.verify_engineering_validation(receipt, root)

    def test_exhausted_resource_budget_checkpoints_before_target_open(self):
        freeze, targets = freeze_fixture()
        opened = []
        with tempfile.TemporaryDirectory() as directory, patch.object(replay, 'COMPUTATION_BUDGET_SECONDS', 0):
            with self.assertRaises(replay.ComputationBudgetExceeded):
                run_synthetic(freeze, targets, directory, opened=opened)
            checkpoints = list(Path(directory).glob('replay-incomplete-*.json'))
            self.assertEqual(len(checkpoints), 1)
            checkpoint = json.loads(checkpoints[0].read_text())
            self.assertFalse(checkpoint['post_run_full_audit_opened'])
            self.assertEqual(checkpoint['completed_policy_runs'], {})
        self.assertEqual(opened, [])

    def test_existing_report_is_preserved_without_new_target_access(self):
        with tempfile.TemporaryDirectory() as directory:
            report = Path(directory) / 'existing-report.json'
            report.write_text('preserve this earlier result\n')
            with patch.object(replay, '_protocol_tools', side_effect=AssertionError('should not start a rerun')):
                with self.assertRaises(FileExistsError):
                    replay.run_replay(Path(directory) / 'freeze.json', output_path=report)
            self.assertEqual(report.read_text(), 'preserve this earlier result\n')

    def test_freeze_resource_timing_is_bound_to_actual_freeze_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'freeze.json'
            path.write_text('synthetic-frozen-bytes\n')
            timing = {'freeze_sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                      'elapsed_seconds': '17/2', 'peak_rss_kib_linux': 12345}
            (path.parent / 'freeze-execution.json').write_text(json.dumps(timing))
            observed = replay._freeze_timing(path)
            self.assertTrue(observed['available'])
            self.assertEqual(observed['elapsed_seconds'], '17/2')
            path.write_text('changed-frozen-bytes\n')
            with self.assertRaisesRegex(ValueError, 'current frozen file'):
                replay._freeze_timing(path)


if __name__ == '__main__':
    unittest.main()
