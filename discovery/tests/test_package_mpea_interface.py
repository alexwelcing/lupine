"""Constructed installed-resource/HTTP probes; no wheel build or scientific data.

Execute the exact helper embedded in the isolated-wheel PROBE, against real
temporary resource files and loopback HTTP responses. This is transport evidence,
not validation of scientific report schemas or an installed-wheel execution.
"""
import ast
from copy import deepcopy
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import importlib.util
import json
from pathlib import Path
import tempfile
import threading
import unittest
from urllib.request import urlopen


SOURCE = Path(__file__).resolve().parents[1] / 'scripts/package_smoke.py'
ROOT = next(p for p in Path(__file__).resolve().parents
            if (p / 'src/lupine_discovery/decision_pool.py').is_file())
spec = importlib.util.spec_from_file_location('package_mpea_interface', SOURCE)
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)
tree = ast.parse(smoke.PROBE)
functions = [node for node in tree.body if isinstance(node, ast.FunctionDef)
             and node.name == 'check_optional_mpea']
assert len(functions) == 1
namespace = {'json': json, 'urlopen': urlopen}
exec(compile(ast.Module(body=functions, type_ignores=[]), str(SOURCE) + ':PROBE', 'exec'), namespace)
check = namespace['check_optional_mpea']


class PackageMpeaInterfaceTests(unittest.TestCase):
    def setUp(self):
        directory = ROOT / '.cache/reviewer-controls'
        directory.mkdir(parents=True, exist_ok=True)
        self.temporary = tempfile.TemporaryDirectory(dir=directory, prefix='mpea-package-')
        self.addCleanup(self.temporary.cleanup)
        self.resources = Path(self.temporary.name)
        (self.resources / 'resources').mkdir()
        (self.resources / 'web').mkdir()
        self.report_path = self.resources / 'resources/mpea-t25-v1.json'
        self.asset_path = self.resources / 'web/mpea.js'
        self.asset = b'window.LupineMpea = Object.freeze({render() {}});\n'
        self.asset_path.write_bytes(self.asset)
        self.served_asset = self.asset
        self.asset_status = 200
        self.observed = {'unrelated_report': {'status': 'constructed'}}
        self.requested = []
        owner = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def do_GET(self):
                owner.requested.append(self.path)
                if self.path == '/mpea.js':
                    status, raw = owner.asset_status, owner.served_asset
                elif self.path == '/api/benchmarks':
                    status, raw = 200, json.dumps(owner.observed, ensure_ascii=True).encode('ascii')
                else:
                    status, raw = 404, b''
                self.send_response(status)
                self.send_header('Content-Length', str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)

        self.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever,
                                       kwargs={'poll_interval': 0.01}, daemon=True)
        self.thread.start()
        self.addCleanup(self.stop_server)
        self.url = 'http://127.0.0.1:' + str(self.server.server_address[1])

    def stop_server(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)

    def report(self):
        return {'schema': 'lupine.discovery.mpea.unavailable_public.v1',
                'status': 'BLOCKED', 'execution_kind': 'synthetic_fixture',
                'reasons': ['REGISTRATION_MISMATCH'],
                'payload': {'overall_verdict': None, 'panels': None}}

    def package(self, value):
        self.report_path.write_text(json.dumps(value, ensure_ascii=False), encoding='utf-8')
        self.observed['mpea_archived'] = deepcopy(value)

    def invoke(self):
        with urlopen(self.url + '/api/benchmarks') as response:
            observed = json.load(response)
        return check(self.resources, observed, self.url)

    def test_absence_stays_absent_and_still_checks_javascript(self):
        result = self.invoke()
        self.assertEqual(result, {'resource': 'resources/mpea-t25-v1.json', 'status': 'absent',
                                  'javascript': 'packaged_and_exactly_served'})
        self.assertNotIn('mpea_archived', self.observed)
        self.assertEqual(self.requested, ['/api/benchmarks', '/mpea.js'])
        self.assertFalse(self.report_path.exists())

    def test_absent_resource_rejects_invented_report(self):
        self.observed['mpea_archived'] = self.report()
        with self.assertRaisesRegex(AssertionError, 'invented'):
            self.invoke()

    def test_absent_resource_rejects_null_placeholder(self):
        self.observed['mpea_archived'] = None
        with self.assertRaisesRegex(AssertionError, 'invented'):
            self.invoke()

    def test_present_unavailable_report_retains_scope_and_null_verdict(self):
        original = self.report()
        self.package(original)
        before = self.report_path.read_bytes()
        result = self.invoke()
        self.assertEqual(result['status'], 'present_exactly_served')
        self.assertEqual(self.observed['mpea_archived'], original)
        self.assertEqual(self.report_path.read_bytes(), before)
        self.assertNotIn('overall_verdict', result)

    def test_present_negative_result_never_requires_pass(self):
        value = self.report()
        value.update(schema='lupine.discovery.mpea.evaluation_public.v1', status='COMPLETE')
        value['payload'] = {'overall_verdict': 'NO_GO', 'retained_count': 0, 'unknown': None}
        self.package(value)
        self.assertEqual(self.invoke()['status'], 'present_exactly_served')
        self.assertEqual(self.observed['mpea_archived']['payload']['overall_verdict'], 'NO_GO')

    def test_present_resource_must_be_served(self):
        self.package(self.report())
        del self.observed['mpea_archived']
        with self.assertRaisesRegex(AssertionError, 'missing from HTTP'):
            self.invoke()

    def test_rejects_changed_nested_value_or_dropped_unknown(self):
        for payload in ({'overall_verdict': 'GO', 'panels': None}, {'overall_verdict': None}):
            with self.subTest(payload=payload):
                self.package(self.report())
                self.observed['mpea_archived']['payload'] = payload
                with self.assertRaisesRegex(AssertionError, 'differs'):
                    self.invoke()

    def test_rejects_bool_integer_and_integer_float_substitution(self):
        for original, changed in ((1, True), (0, False), (1, 1.0)):
            with self.subTest(original=original, changed=changed):
                value = self.report()
                value['payload']['count'] = original
                self.package(value)
                self.observed['mpea_archived']['payload']['count'] = changed
                with self.assertRaisesRegex(AssertionError, 'differs'):
                    self.invoke()

    def test_exact_strings_unicode_and_object_key_order_round_trip(self):
        value = self.report()
        value['payload'] = {'label': 'β < & "', 'rate': '1/3', 'count': 9007199254740993}
        self.package(value)
        self.observed['mpea_archived'] = dict(reversed(list(value.items())))
        self.assertEqual(self.invoke()['status'], 'present_exactly_served')
        self.observed['mpea_archived']['payload']['rate'] = '0.3333333333333333'
        with self.assertRaisesRegex(AssertionError, 'differs'):
            self.invoke()

    def test_array_order_is_not_normalized(self):
        value = self.report()
        value['payload']['ids'] = ['A', 'B']
        self.package(value)
        self.observed['mpea_archived']['payload']['ids'].reverse()
        with self.assertRaisesRegex(AssertionError, 'differs'):
            self.invoke()

    def test_invalid_report_resource_does_not_become_absence(self):
        self.report_path.write_bytes(b'{bad JSON')
        with self.assertRaises(json.JSONDecodeError):
            self.invoke()

    def test_null_or_scalar_packaged_resource_rejected(self):
        for value in (None, [], 0, True):
            with self.subTest(value=value):
                self.package(value)
                with self.assertRaisesRegex(AssertionError, 'JSON object'):
                    self.invoke()

    def test_nonfinite_json_cannot_receive_exact_agreement(self):
        value = self.report()
        value['payload']['rate'] = float('nan')
        self.package(value)
        with self.assertRaises(ValueError):
            self.invoke()

    def test_missing_empty_or_changed_packaged_javascript_fails(self):
        self.asset_path.unlink()
        with self.assertRaises(FileNotFoundError):
            self.invoke()
        self.asset_path.write_bytes(b'')
        with self.assertRaisesRegex(AssertionError, 'missing'):
            self.invoke()
        self.asset_path.write_bytes(self.asset + b'// packaged change\n')
        with self.assertRaisesRegex(AssertionError, 'differs'):
            self.invoke()

    def test_same_length_http_javascript_tamper_fails(self):
        self.served_asset = self.asset.replace(b'render', b'xender')
        with self.assertRaisesRegex(AssertionError, 'differs'):
            self.invoke()

    def test_real_probe_invokes_helper_and_emits_only_transport_metadata(self):
        calls = [n for n in ast.walk(tree) if isinstance(n, ast.Call)
                 and isinstance(n.func, ast.Name) and n.func.id == 'check_optional_mpea']
        self.assertEqual(len(calls), 1)
        self.assertEqual([arg.id for arg in calls[0].args], ['resources', 'observed_reports', 'url'])
        self.assertIn("'optional_mpea': mpea_check", smoke.PROBE)
        self.assertIn("'mpea.js'", smoke.PROBE)


if __name__ == '__main__':
    unittest.main()
