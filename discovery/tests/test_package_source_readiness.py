"""Adversarial snapshot/transport checks for the exact installed probe helper."""
import ast
from copy import deepcopy
from hashlib import sha256
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'scripts/package_smoke.py'
module = ast.parse(SOURCE.read_text())
probe = next(n.value.value for n in module.body if isinstance(n, ast.Assign)
             and any(isinstance(t, ast.Name) and t.id == 'PROBE' for t in n.targets))
functions = [n for n in ast.parse(probe).body if isinstance(n, ast.FunctionDef)
             and n.name == 'check_source_readiness']
assert len(functions) == 1
namespace = {'json': json, 'sha256': sha256}
exec(compile(ast.Module(body=functions, type_ignores=[]), str(SOURCE) + ':PROBE', 'exec'), namespace)
check = namespace['check_source_readiness']


class PackageSourceReadinessTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.resources = Path(self.temporary.name)
        self.path = self.resources / 'resources/source-readiness-v1.json'
        self.path.parent.mkdir()
        self.raw = (ROOT / 'src/lupine_discovery/resources/source-readiness-v1.json').read_bytes()
        self.path.write_bytes(self.raw)
        self.report = json.loads(self.raw)
        self.cli = deepcopy(self.report)
        self.http = {'source_readiness': deepcopy(self.report)}
        self.asset_path = self.resources / 'web/source-readiness.js'
        self.asset_path.parent.mkdir()
        self.asset_path.write_bytes(b'// Constructed transport asset, never executed.\n')
        self.asset = self.asset_path.read_bytes()
        self.status = 200
        self.requests = []

    def invoke(self):
        owner = self
        class Response:
            def __enter__(self):
                self.status = owner.status
                return self
            def __exit__(self, *args):
                pass
            def read(self):
                return owner.asset
        def open_url(url, timeout):
            owner.requests.append((url, timeout))
            return Response()
        with patch.dict(namespace, {'urlopen': open_url}):
            return check(self.resources, self.http, 'http://127.0.0.1:1', self.cli)

    def test_exact_negative_snapshot_is_accepted_without_promoting_science(self):
        self.invoke()
        self.assertEqual(self.requests, [('http://127.0.0.1:1/source-readiness.js', 10)])
        self.assertTrue(all(x['scientific_admission'] == 'NOT_ADMITTED' for x in self.cli['sources']))

    def test_missing_resource_cannot_become_empty_success(self):
        self.path.unlink()
        with self.assertRaises(FileNotFoundError):
            self.invoke()
        self.assertEqual(self.requests, [])

    def test_jointly_forged_scientific_claim_fails_even_when_transports_agree(self):
        self.report['sources'][0]['scientific_admission'] = 'ADMITTED'
        self.path.write_text(json.dumps(self.report))
        self.cli = deepcopy(self.report)
        self.http['source_readiness'] = deepcopy(self.report)
        with self.assertRaisesRegex(AssertionError, 'resource changed'):
            self.invoke()

    def test_stale_snapshot_is_rejected_even_when_transports_agree(self):
        self.report['snapshot_commit'] = '0' * 40
        self.path.write_text(json.dumps(self.report))
        self.cli = deepcopy(self.report)
        self.http['source_readiness'] = deepcopy(self.report)
        with self.assertRaisesRegex(AssertionError, 'resource changed'):
            self.invoke()

    def test_cli_failure_object_cannot_substitute_for_installed_snapshot(self):
        self.cli = {'schema': 'lupine.source-readiness.unavailable.v1', 'status': 'UNAVAILABLE'}
        with self.assertRaisesRegex(AssertionError, 'CLI differs'):
            self.invoke()

    def test_missing_or_null_http_payload_fails(self):
        for value in ({}, {'source_readiness': None}):
            with self.subTest(value=value):
                self.http = value
                with self.assertRaisesRegex(AssertionError, 'HTTP'):
                    self.invoke()

    def test_dropped_exposure_or_claim_change_fails(self):
        for field, value in [('exposure', []), ('status', 'READY'), ('scientific_admission', 'ADMITTED')]:
            with self.subTest(field=field):
                self.http = {'source_readiness': deepcopy(self.report)}
                self.http['source_readiness']['sources'][0][field] = value
                with self.assertRaisesRegex(AssertionError, 'HTTP differs'):
                    self.invoke()

    def test_object_key_order_does_not_change_transport_identity(self):
        self.cli = dict(reversed(list(self.report.items())))
        self.http['source_readiness'] = dict(reversed(list(self.report.items())))
        self.invoke()

    def test_changed_array_order_is_not_silently_normalized(self):
        self.http['source_readiness']['sources'].reverse()
        with self.assertRaisesRegex(AssertionError, 'HTTP differs'):
            self.invoke()

    def test_empty_asset_fails(self):
        self.asset_path.write_bytes(b'')
        with self.assertRaisesRegex(AssertionError, 'JavaScript missing'):
            self.invoke()

    def test_http_asset_must_match_packaged_asset(self):
        self.asset += b'// changed\n'
        with self.assertRaisesRegex(AssertionError, 'HTTP asset differs'):
            self.invoke()

    def test_http_error_status_fails_even_with_identical_asset(self):
        self.status = 404
        with self.assertRaisesRegex(AssertionError, 'HTTP asset differs'):
            self.invoke()


if __name__ == '__main__':
    unittest.main()
