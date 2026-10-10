import copy
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/constrained_dashboard.py'
SPEC = importlib.util.spec_from_file_location('constrained_dashboard_test_module', SCRIPT)
dashboard = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(dashboard)


def seal(report):
    result = copy.deepcopy(report)
    result.pop('report_content_sha256', None)
    result['scientific_result_sha256'] = dashboard.replay.scientific_result_identity(result)
    result['report_content_sha256'] = dashboard.replay.digest(result)
    return result


def panel(panel_id, role='primary', failed=True):
    scope = 'primary_conditional' if role == 'primary' else 'unsupported_transfer_diagnostic'
    coverage = {'available': True, 'scope': scope, 'panel_simultaneous': not failed,
                'misses': [{'jid': 'J-1', 'property': 'gap', 'lower': '0', 'upper': '1', 'truth': '2'},
                           {'jid': 'J-2', 'property': 'formation', 'lower': '-1', 'upper': '0', 'truth': '1'}] if failed else []}
    screening = {'lost_optimum_ids': ['J-1'] if failed else [],
                 'all_optimum_retained': not failed,
                 'false_infeasibility_exclusions': ['J-2'] if failed else [],
                 'conditional_regret_bound_violation': True if failed else None,
                 'certified_incumbent_true_regret': '3/2' if failed else None,
                 'selection': {'incumbent': 'J-3' if failed else None, 'regret_bound': '1' if failed else None}}
    operational = screening if role == 'primary' else {
        'lost_optimum_ids': [], 'all_optimum_retained': True,
        'false_infeasibility_exclusions': [], 'conditional_regret_bound_violation': None,
        'certified_incumbent_true_regret': None, 'selection': {'incumbent': None, 'regret_bound': None}}
    return {'panel_id': panel_id, 'role': role,
            'operational_status': 'conditional_finite' if role == 'primary' else 'abstain_unsupported_scope',
            'truth': {'population_count': 20, 'feasible_count': 4},
            'coverage': coverage, 'screening': operational,
            'unsupported_transfer_diagnostic': None if role == 'primary' else {
                'label': 'unsupported_transfer_diagnostic', 'coverage': copy.deepcopy(coverage),
                'screening': screening},
            'policies': {'synthetic_event_marker': 'Detailed per-policy values belong only to the local full artifact.'}}


def report_fixture():
    undefined = {'numerator': 0, 'denominator': 0, 'fraction': None, 'undefined': 2}
    measured = {'numerator': 1, 'denominator': 2, 'fraction': '1/2', 'undefined': 0}
    curves = {policy: {str(budget): {
        'feasible_hit': copy.deepcopy(undefined if budget == 0 else measured),
        'within_0_1_ev_success': copy.deepcopy(undefined if budget == 0 else measured),
        'simple_regret_mean_when_found': None if budget == 0 else '7/13',
        'simple_regret_defined_count': 0 if budget == 0 else 2,
    } for budget in dashboard.replay.BUDGETS} for policy in dashboard.replay.POLICIES}
    sensitivity = {'primary_seed': 0, 'all_seed_curves': 'policy_curves.random_0 through random_99',
                   'independent_experiments': False,
                   'budgets': {'0': {'seed_count': 100, 'defined_seed_count': 0,
                                     'within_0_1_ev_success_mean': None,
                                     'metrics': {'feasible_hit': {'defined_seed_count': 0, 'mean': None}}},
                               '4': {'seed_count': 100, 'defined_seed_count': 100,
                                     'within_0_1_ev_success_mean': '137/200',
                                     'metrics': {'feasible_hit': {'defined_seed_count': 100, 'mean': '4/5'}}}}}
    arm = {'panel_count': 2, 'candidate_count': 40,
           'panel_simultaneous_coverage': {'numerator': 1, 'denominator': 2, 'fraction': '1/2'},
           'all_optimum_retention': {'numerator': 1, 'denominator': 2, 'fraction': '1/2'},
           'lost_optimum_count': 1, 'false_infeasibility_exclusion_count': 1,
           'policy_curves': curves, 'random_sensitivity': sensitivity,
           'paired_budget4': {'random_0': {'wins': 1, 'losses': 2, 'ties': 0,
                                           'gain_at_least_10_percentage_points': False,
                                           'paired_success_fraction_difference': '-1/3',
                                           'provisional_p_gate': False}},
           'retained_fraction_unavailable': None}
    report = {
        'schema': 'lupine.discovery.constrained.replay.v1',
        'protocol_id': 'jarvis-gap-formation-v1', 'protocol_commit': 'synthetic-protocol',
        'protocol_sha256': 'synthetic-protocol-digest', 'format_amendment_commit': 'synthetic-amendment',
        'format_amendment_sha256': 'synthetic-amendment-digest', 'source_format': 'synthetic',
        'source': {'source_kind': 'synthetic_not_a_scientific_run', 'license': 'fixture', 'unit': 'µ'},
        'source_receipt_sha256': 'synthetic-source', 'metadata_sha256': 'synthetic-metadata',
        'model_digest': 'synthetic-model', 'prediction_sha256': 'synthetic-predictions',
        'freeze_receipt_sha256': 'synthetic-freeze',
        'target_seal': {'path': '.cache/targets.json', 'sha256': 'synthetic-targets'},
        'execution_receipt': {'sha256': 'synthetic-execution', 'path': '.cache/execution.json'},
        'calibration': {'count': 399, 'gap_radius': '1/3', 'formation_radius': '2/3'},
        'training_calibration_cost': {'training_target_bundles': 200, 'calibration_target_bundles': 399},
        'resources': {'elapsed_cpu_seconds': '1.25', 'target_bundles': 8240,
                      'freeze_timing': {'available': False, 'elapsed_seconds': None}},
        'interpretation': 'SYNTHETIC projection test; failed gates do not establish superiority.',
        'primary_comparison_budget': 4, 'budgets': list(dashboard.replay.BUDGETS),
        'policies': list(dashboard.replay.POLICIES),
        'panels': [panel('primary-000'), panel('primary-001', failed=False), panel('shift-000', 'shift')],
        'arms': {'primary': copy.deepcopy(arm), 'shift': copy.deepcopy(arm)},
        'gates': {
            'engineering_integrity': {'status': 'OPEN', 'checks': {'executed_engineering_validation': None}},
            'observed_primary_screening': {'status': 'FAIL', 'checks': {'retained': False, 'coverage': False},
                                           'claim': 'Observed gates only.'},
            'recommendation_value': {'status': 'FAIL', 'checks': {'gain': False, 'uncertain': None},
                                     'scientific_interpretation': 'BLOCKED pending engineering integrity evidence'},
        },
        'negative_control': {'lost_optimum_exposed': True, 'counted_as_archive_success': False},
        'oracle_access_log': [{'event': 'synthetic_reveal', 'jid': 'J-1'}],
        'oracle_access_log_sha256': 'synthetic-log',
        'reproduction': {'command': ['python', 'scripts/constrained_replay.py', '.cache/freeze.json']},
    }
    return seal(report)


class ConstrainedDashboardTests(unittest.TestCase):
    def build(self, root, report=None, raw=None):
        source = root / 'raw.json'
        if raw is None:
            raw = (json.dumps(report or report_fixture(), indent=2, ensure_ascii=False) + '\n\n').encode()
        source.write_bytes(raw)
        output, resource, full = root / 'reports/dashboard.json', root / 'resource/dashboard.json', root / '.cache/full.json.gz'
        result = dashboard.build_dashboard(source, output, resource, full)
        return result, source, output, resource, full

    def test_projection_preserves_failed_gates_all_numerators_and_sensitivity(self):
        original = report_fixture()
        unchanged = copy.deepcopy(original)
        with tempfile.TemporaryDirectory() as temp:
            result, _, output, resource, _ = self.build(Path(temp), original)
            self.assertEqual(output.read_bytes(), resource.read_bytes())
        self.assertEqual(original, unchanged)
        self.assertEqual(result['schema'], 'lupine.discovery.constrained.dashboard.v1')
        self.assertEqual(result['gates'], original['gates'])
        self.assertEqual(result['interpretation'], original['interpretation'])
        for field in ('source', 'calibration', 'training_calibration_cost', 'resources', 'format_amendment_commit',
                      'format_amendment_sha256', 'protocol_sha256', 'model_digest', 'execution_receipt',
                      'scientific_result_sha256', 'negative_control'):
            self.assertEqual(result[field], original[field])
        for role in ('primary', 'shift'):
            original_arm, projected_arm = original['arms'][role], result['arms'][role]
            for field, value in original_arm.items():
                if field not in ('policy_curves', 'random_sensitivity'):
                    self.assertEqual(projected_arm[field], value)
            self.assertEqual(set(projected_arm['policy_curves']), set(dashboard.DISPLAY_POLICIES))
            for policy in dashboard.DISPLAY_POLICIES:
                self.assertEqual(projected_arm['policy_curves'][policy], original_arm['policy_curves'][policy])
            for key, val in original_arm['random_sensitivity'].items():
                if key != 'all_seed_curves':
                    self.assertEqual(projected_arm['random_sensitivity'][key], val)
            self.assertIn('local_reproducible_artifact_not_bundled', projected_arm['random_sensitivity']['all_seed_curves'].values())
        self.assertNotIn('panels', result)
        self.assertNotIn('oracle_access_log', result)
        self.assertNotIn('report_content_sha256', result)
        self.assertEqual(result['dashboard_content_sha256'], dashboard.replay.digest({
            key: value for key, value in result.items() if key != 'dashboard_content_sha256'}))

    def test_deterministic_gzip_recovers_exact_original_bytes(self):
        with tempfile.TemporaryDirectory() as temp:
            result, source, output, resource, full = self.build(Path(temp))
            raw, compressed = source.read_bytes(), full.read_bytes()
            self.assertEqual(gzip.decompress(compressed), raw)
            self.assertEqual(compressed, dashboard.deterministic_gzip(raw))
            identity = result['full_report_identity']
            self.assertEqual(identity['compressed_sha256'], hashlib.sha256(compressed).hexdigest())
            self.assertEqual(identity['uncompressed_sha256'], hashlib.sha256(raw).hexdigest())
            self.assertEqual(identity['compressed_bytes'], len(compressed))
            self.assertEqual(identity['uncompressed_bytes'], len(raw))
            self.assertEqual(identity['distribution'], 'local_reproducible_artifact_not_bundled')
            dashboard.build_dashboard(source, output, resource, full)
            self.assertEqual(full.read_bytes(), compressed)
            self.assertEqual(source.read_bytes(), raw)

    def test_tampering_is_rejected_before_any_output_write(self):
        for attack in ('content', 'scientific', 'missing_seal', 'float', 'duplicate_key'):
            with self.subTest(attack=attack), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                value = report_fixture()
                if attack in ('content', 'scientific'):
                    value['gates']['recommendation_value']['checks']['gain'] = True
                    if attack == 'scientific':
                        value.pop('report_content_sha256')
                        value['report_content_sha256'] = dashboard.replay.digest(value)
                elif attack == 'missing_seal':
                    del value['report_content_sha256']
                raw = json.dumps(value).encode()
                if attack == 'float': raw = raw.replace(b'"primary_comparison_budget": 4', b'"primary_comparison_budget": 4.0')
                if attack == 'duplicate_key': raw = b'{"schema":"duplicate",' + raw[1:]
                source = root / 'raw.json'
                source.write_bytes(raw)
                with self.assertRaises((ValueError, TypeError)):
                    dashboard.build_dashboard(source, root / 'new/output.json', root / 'new/resource.json', root / 'new/full.gz')
                self.assertFalse((root / 'new').exists())
                self.assertEqual(source.read_bytes(), raw)

    def test_missing_and_undefined_values_are_preserved_without_zero_invention(self):
        original = report_fixture()
        del original['arms']['primary']['candidate_count']
        del original['arms']['primary']['policy_curves']['interval']['4']['simple_regret_defined_count']
        original = seal(original)
        with tempfile.TemporaryDirectory() as temp:
            result, *_ = self.build(Path(temp), original)
        self.assertNotIn('candidate_count', result['arms']['primary'])
        self.assertNotIn('simple_regret_defined_count', result['arms']['primary']['policy_curves']['interval']['4'])
        undefined = result['arms']['primary']['policy_curves']['interval']['0']['within_0_1_ev_success']
        self.assertEqual(undefined, {'numerator': 0, 'denominator': 0, 'fraction': None, 'undefined': 2})
        self.assertIsNone(result['arms']['primary']['random_sensitivity']['budgets']['0']['within_0_1_ev_success_mean'])

    def test_all_failure_panels_and_misses_are_kept_diagnostics_separate(self):
        original = report_fixture()
        original['panels'] = [panel(f'primary-{index:03d}') for index in range(75)] + [panel('shift-000', 'shift')]
        original['panels'][0]['coverage']['misses'] *= 20
        original = seal(original)
        with tempfile.TemporaryDirectory() as temp:
            result, *_ = self.build(Path(temp), original)
        failures = result['failure_panels']
        for category in dashboard.FAILURE_KINDS:
            self.assertEqual(len(failures['primary'][category]), 75)
            self.assertEqual(len(failures['shift'][category]), 0)
            self.assertEqual(len(failures['unsupported_transfer_diagnostic'][category]), 1)
        self.assertEqual(len(failures['primary']['interval_miss'][0]['misses']), 40)
        self.assertEqual(failures['primary']['regret_violation'][0]['certified_incumbent_true_regret'], '3/2')
        self.assertEqual(failures['primary']['lost_optimum'][-1]['panel_id'], 'primary-074')

    def test_incomplete_full_curves_and_raw_payload_tables_rejected(self):
        for attack in ('missing_seed', 'raw_table', 'truncated_failures'):
            original = report_fixture()
            if attack == 'missing_seed': del original['arms']['primary']['policy_curves']['random_99']
            elif attack == 'raw_table': original['evaluation_targets'] = [{'jid': 'J-1', 'gap': 2}]
            else: del original['panels'][0]['screening']['lost_optimum_ids']
            original = seal(original)
            with self.subTest(attack=attack), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                with self.assertRaises(ValueError): self.build(root, original)
                self.assertFalse((root / 'reports').exists())

    def test_source_cannot_be_replaced_and_byte_identity_not_scientific_identity(self):
        original = report_fixture()
        altered_metadata = copy.deepcopy(original)
        altered_metadata['resources']['elapsed_cpu_seconds'] = '998.125'
        altered_metadata['reproduction']['command'][-1] = '/a/different/local/path/freeze.json'
        altered_metadata = seal(altered_metadata)
        self.assertEqual(original['scientific_result_sha256'], altered_metadata['scientific_result_sha256'])
        self.assertNotEqual(original['report_content_sha256'], altered_metadata['report_content_sha256'])
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / 'raw.json'
            raw = json.dumps(original).encode()
            source.write_bytes(raw)
            with self.assertRaises(ValueError):
                dashboard.build_dashboard(source, source, root / 'resource.json', root / 'full.gz')
            self.assertEqual(source.read_bytes(), raw)

    def test_cli_projects_synthetic_report_without_archive_access(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / 'raw.json'
            source.write_text(json.dumps(report_fixture()))
            command = [sys.executable, str(SCRIPT), str(source), '--output', str(root / 'out.json'),
                       '--resource', str(root / 'resource.json'), '--full-artifact', str(root / '.cache/full.gz')]
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            receipt = json.loads(result.stdout)
            self.assertEqual(receipt['full_report_identity']['distribution'], 'local_reproducible_artifact_not_bundled')
            self.assertTrue((root / '.cache/full.gz').exists())


if __name__ == '__main__':
    unittest.main()
