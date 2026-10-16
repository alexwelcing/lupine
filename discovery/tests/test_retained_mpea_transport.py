"""Constructed, fully resealed retention negatives; no installed artifacts run."""
import base64
from copy import deepcopy
import csv
from hashlib import sha256
import io
import json
import unittest
import zipfile

import test_retained_artifacts as fixtures

v = fixtures.v
RESOURCE = 'lupine_discovery/resources/mpea-t25-v1.json'
ASSET = 'lupine_discovery/web/mpea.js'
# Independently frozen ordered probe contract; never derive this expectation from v.CHECKS.
EXPECTED_CHECKS = [
    'all_packaged_cases_select_verify_replay',
    'known_answer_oracle_and_controls',
    'web_assets_and_original_archive_reports',
    'constrained_negative_results_packaged_and_served',
    'installed_http_cli_agreement',
    'coupled_python_api_and_missing_point_fallback',
    'coupled_projection_and_statistical_guarded_http_replay_agree_with_installed_cli',
    'scoped_projection_translation_and_missing_bound_abstention',
    'direct_statistical_pool_python_api_and_distinct_abstention',
    'training_only_no_go_packaged_and_served',
    'prospective_pool_planning_cli_hypothesis_and_unknown',
    'prospective_zero_failure_resolution_cli_not_observed_power',
    'prospective_planning_http_cli_agreement_and_assets',
    'finite_population_zero_failure_cli_http_exact_scope',
    'optional_mpea_resource_presence_and_http_agreement',
    'mpea_javascript_packaged_and_served',
    'fixed_stored_census_identity_scope_and_http_asset_agreement',
]


class RetainedMpeaTransportTests(unittest.TestCase):
    def setUp(self):
        self.case = fixtures.ArtifactVerifierTests(
            'test_valid_fixture_checks_all_original_blobs_manifest_and_wheel_records')
        self.addCleanup(self.case.doCleanups)
        self.case.setUp()

    @property
    def report(self):
        return self.case.receipt['verification']

    def verify(self):
        self.case.seal()
        return self.case.verify()

    def replace_wheel(self, *, add=None, remove=()):
        # Recompute the complete RECORD independently, then receipt artifact
        # hashes/seals: these failures cannot be explained by stale checksums.
        with zipfile.ZipFile(self.case.wheel_path) as wheel:
            files = {name: wheel.read(name) for name in wheel.namelist()
                     if not name.endswith('.dist-info/RECORD') and name not in remove}
        files.update(add or {})
        record = 'lupine_discovery-0.1.0.dist-info/RECORD'
        text = io.StringIO(newline='')
        writer = csv.writer(text, lineterminator='\n')
        for name, raw in files.items():
            encoded = base64.urlsafe_b64encode(sha256(raw).digest()).rstrip(b'=').decode('ascii')
            writer.writerow([name, 'sha256=' + encoded, str(len(raw))])
        writer.writerow([record, '', ''])
        files[record] = text.getvalue().encode('utf-8')
        with zipfile.ZipFile(self.case.wheel_path, 'w') as wheel:
            for name, raw in files.items():
                wheel.writestr(name, raw)
        self.case.rebind_artifacts()

    def test_all_seventeen_flags_required_without_omission_extra_or_reorder(self):
        expected = list(self.report['checks'])
        self.assertEqual(expected, EXPECTED_CHECKS)
        variants = [expected[:index] + expected[index + 1:] for index in range(len(expected))]
        variants.extend([expected + ['invented_science_verified'], list(reversed(expected))])
        for flags in variants:
            with self.subTest(flags=flags):
                self.report['checks'] = flags
                with self.assertRaisesRegex(v.AuditError, 'flags'):
                    self.verify()

    def test_missing_transport_metadata_fails_with_all_new_flags_present(self):
        del self.report['optional_mpea']
        with self.assertRaisesRegex(v.AuditError, 'metadata shape'):
            self.verify()

    def test_metadata_requires_exact_three_keys_and_types(self):
        original = deepcopy(self.report['optional_mpea'])
        variants = [None, [], False, 1, {**original, 'scientific_verdict': 'GO'},
                    {k: value for k, value in original.items() if k != 'javascript'}]
        for key in original:
            variants.extend({**original, key: invalid} for invalid in (True, 1, None, []))
        for changed in variants:
            with self.subTest(changed=changed):
                self.report['optional_mpea'] = changed
                with self.assertRaisesRegex(v.AuditError, 'metadata shape'):
                    self.verify()

    def test_metadata_rejects_unknown_status_path_and_javascript_claim(self):
        original = deepcopy(self.report['optional_mpea'])
        variants = [{'status': 'passed'}, {'status': 'unavailable'}, {'status': 'ABSENT'},
                    {'resource': '../mpea-t25-v1.json'}, {'resource': 'resources/other.json'},
                    {'javascript': 'physical_performance_certified'}, {'javascript': 'not_checked'}]
        for changed in variants:
            with self.subTest(changed=changed):
                self.report['optional_mpea'] = {**original, **changed}
                with self.assertRaisesRegex(v.AuditError, 'metadata values'):
                    self.verify()

    def test_absent_resource_and_explicit_null_digest_preserve_no_verdict(self):
        result = self.verify()
        audit = result['mpea_transport_audit']
        self.assertIs(audit['optional_resource_present'], False)
        self.assertIsNone(audit['optional_resource_sha256'])
        self.assertIs(audit['scientific_report_semantics_validated'], False)
        self.assertIs(audit['http_agreement_reexecuted'], False)
        self.assertEqual(result['reported_smoke']['optional_mpea'], self.report['optional_mpea'])
        self.assertNotIn('overall_verdict', result)

    def test_present_negative_unknown_report_preserves_only_byte_identity(self):
        raw = json.dumps({'execution_kind': 'synthetic_fixture', 'status': 'BLOCKED',
                          'payload': {'overall_verdict': None, 'negative_control': False,
                                      'exact_value': '1/3'}}).encode('utf-8')
        self.replace_wheel(add={RESOURCE: raw})
        self.report['optional_mpea']['status'] = 'present_exactly_served'
        audit = self.verify()['mpea_transport_audit']
        self.assertIs(audit['optional_resource_present'], True)
        self.assertEqual(audit['optional_resource_sha256'], sha256(raw).hexdigest())
        self.assertIs(audit['scientific_report_semantics_validated'], False)

    def test_self_consistent_unsupported_object_is_not_scientific_validation(self):
        self.replace_wheel(add={RESOURCE: b'{"unsupported":"synthetic shell"}'})
        self.report['optional_mpea']['status'] = 'present_exactly_served'
        result = self.verify()
        self.assertEqual(result['status'], 'PASS')
        self.assertIs(result['mpea_transport_audit']['scientific_report_semantics_validated'], False)

    def test_present_claim_cannot_describe_missing_wheel_resource(self):
        self.report['optional_mpea']['status'] = 'present_exactly_served'
        with self.assertRaisesRegex(v.AuditError, 'presence claim'):
            self.verify()

    def test_absent_claim_cannot_hide_new_resource_after_full_reseal(self):
        self.replace_wheel(add={RESOURCE: b'{}'})
        with self.assertRaisesRegex(v.AuditError, 'presence claim'):
            self.verify()

    def test_missing_or_empty_javascript_fails_after_record_and_receipt_reseal(self):
        self.replace_wheel(remove=(ASSET,))
        with self.assertRaisesRegex(v.AuditError, 'JavaScript is absent'):
            self.verify()
        self.replace_wheel(add={ASSET: b''})
        with self.assertRaisesRegex(v.AuditError, 'JavaScript is empty'):
            self.verify()

    def test_invalid_optional_resource_never_becomes_absence(self):
        self.report['optional_mpea']['status'] = 'present_exactly_served'
        for raw in (b'null', b'[]', b'1', b'true', b'{"x":NaN}', b'{"x":1,"x":2}', b'{bad'):
            with self.subTest(raw=raw):
                self.replace_wheel(add={RESOURCE: raw})
                with self.assertRaises((v.AuditError, json.JSONDecodeError)):
                    self.verify()

    def test_optional_output_is_detached_from_input_claim(self):
        result = self.verify()
        result['reported_smoke']['optional_mpea']['status'] = 'invented'
        self.assertEqual(self.report['optional_mpea']['status'], 'absent')
        self.assertEqual(self.verify()['reported_smoke']['optional_mpea']['status'], 'absent')


if __name__ == '__main__':
    unittest.main()
