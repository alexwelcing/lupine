"""Constructed gate-predicate checks; never execute the release recorder."""
import ast
from copy import deepcopy
from hashlib import sha256
import io
from pathlib import Path
import unittest
import zipfile

HERE = Path(__file__).resolve().parent
PIN = 'd93769b07fba52f9bc95dbed92c5303aa8344867e7a663d0ca58cff7af2ba274'
CLAIM = {'resource': 'resources/mpea-t25-v1.json', 'status': 'present_exactly_served',
         'javascript': 'packaged_and_exactly_served'}
NAME = 'lupine_discovery/resources/mpea-t25-v1.json'
recorder_tree = ast.parse((HERE / 'run-next.py').read_text())
namespace = {'EXPECTED_RESOURCE_SHA256': PIN}
node = next(n for n in recorder_tree.body if isinstance(n, ast.FunctionDef)
            and n.name == 'reviewed_transport_checks')
exec(compile(ast.Module(body=[node], type_ignores=[]), '<extracted gate predicate>', 'exec'), namespace)
checks = namespace['reviewed_transport_checks']
audit_tree = ast.parse((HERE / 'audit-wheel-source-present-v1.py').read_text())
archive = next(n for n in audit_tree.body if isinstance(n, ast.With))
body = archive.body
start = next(i for i,n in enumerate(body) if isinstance(n, ast.Assign)
             and isinstance(n.targets[0], ast.Name) and n.targets[0].id == 'reviewed_name')
end = next(i for i,n in enumerate(body) if isinstance(n, ast.Assign)
           and isinstance(n.targets[0], ast.Name) and n.targets[0].id == 'generated')
block = compile(ast.Module(body=body[start:end], type_ignores=[]), '<extracted audit block>', 'exec')


def fixture():
    return ({'verification': {'optional_mpea': dict(CLAIM)}},
            {'status': 'PASS', 'mpea_transport_audit': {
                'optional_resource_present': True, 'optional_resource_sha256': PIN}},
            {'status': 'PASS', 'reviewed_mpea_resource': {
                'sha256': PIN, 'wheel_equals_source_bytes': True,
                'recorded_http_value_agreement': True}})


def audit_fixture(*, source_raw=b'{"status":"constructed_negative"}\n',
                  wheel_raw=b'{"status":"constructed_negative"}\n',
                  expected=None, claim=None, present=True):
    # Only this isolated AST block uses a constructed hash, never the runnable gate.
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w') as target:
        if present:
            target.writestr(NAME, wheel_raw)
    with zipfile.ZipFile(io.BytesIO(buffer.getvalue())) as wheel:
        scope = {'wheel': wheel, 'wheel_runtime': set(wheel.namelist()),
                 'source_runtime': {NAME: source_raw}, 'prefix': 'lupine-source/discovery/src/',
                 'receipt': {'verification': {'optional_mpea': CLAIM if claim is None else claim}},
                 'sha': lambda raw: sha256(raw).hexdigest(),
                 'EXPECTED_RESOURCE_SHA256': sha256(wheel_raw).hexdigest() if expected is None else expected}
        exec(block, scope)
        return scope['reviewed']


class RecorderPreparationTests(unittest.TestCase):
    def test_complete_transport_evidence(self):
        self.assertTrue(all(checks(*fixture()).values()))

    def test_absent_or_incomplete_evidence_never_passes(self):
        self.assertFalse(any(checks(None, None, None).values()))
        for position in range(3):
            values = list(fixture()); values[position] = None
            self.assertFalse(all(checks(*values).values()))

    def test_absent_installed_claim_and_extra_verdict_fail(self):
        for modification in ({'status': 'absent'}, {'scientific_verdict': 'PASS'}):
            values = list(fixture())
            values[0]['verification']['optional_mpea'].update(modification)
            self.assertFalse(all(checks(*values).values()))

    def test_wrong_resource_digest_in_either_auditor_fails(self):
        for position, key in ((1, 'mpea_transport_audit'), (2, 'reviewed_mpea_resource')):
            values = list(fixture())
            field = 'optional_resource_sha256' if position == 1 else 'sha256'
            values[position][key][field] = '0' * 64
            self.assertFalse(all(checks(*values).values()))

    def test_claim_boolean_must_be_true_not_one(self):
        for position, key, field in ((1, 'mpea_transport_audit', 'optional_resource_present'),
                                    (2, 'reviewed_mpea_resource', 'wheel_equals_source_bytes'),
                                    (2, 'reviewed_mpea_resource', 'recorded_http_value_agreement')):
            for invalid in (1, False, None, 'true'):
                values = list(fixture()); values[position][key][field] = invalid
                self.assertFalse(all(checks(*values).values()))

    def test_failed_auditor_never_replaced_by_matching_digest(self):
        for position in (1, 2):
            values = list(fixture()); values[position]['status'] = 'FAIL'
            self.assertFalse(all(checks(*values).values()))

    def test_constructed_byte_identity_keeps_transport_only_scope(self):
        result = audit_fixture()
        self.assertTrue(result['wheel_equals_source_bytes'])
        self.assertFalse(result['http_reexecuted_by_this_auditor'])
        self.assertFalse(result['scientific_report_semantics_validated'])

    def test_missing_resource_rejected(self):
        with self.assertRaises(AssertionError):
            audit_fixture(present=False)

    def test_wrong_expected_digest_rejected(self):
        with self.assertRaises(AssertionError):
            audit_fixture(expected='0' * 64)

    def test_equal_json_different_source_bytes_rejected(self):
        with self.assertRaises(AssertionError):
            audit_fixture(source_raw=b'{ "status": "constructed_negative" }\n')

    def test_absent_or_extra_receipt_claim_rejected(self):
        for claim in ({**CLAIM, 'status': 'absent'}, {**CLAIM, 'verdict': 'PASS'}):
            with self.assertRaises(AssertionError):
                audit_fixture(claim=claim)

    def test_pins_match_in_both_runnable_sources(self):
        for tree in (recorder_tree, audit_tree):
            assignments = [n for n in tree.body if isinstance(n, ast.Assign)
                           and any(isinstance(t, ast.Name) and t.id == 'EXPECTED_RESOURCE_SHA256' for t in n.targets)]
            self.assertEqual(len(assignments), 1)
            self.assertEqual(ast.literal_eval(assignments[0].value), PIN)


if __name__ == '__main__':
    unittest.main(verbosity=2)
