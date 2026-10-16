"""Synthetic-only static notebook contract and public frozen-source checks."""
import contextlib
import hashlib
import io
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import types
import unittest
import warnings
from unittest.mock import patch

ROOT = next(p for p in Path(__file__).absolute().parents
            if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
sys.path.insert(0, str(ROOT / 'scripts'))
SOURCE = Path(os.environ.get('LUPINE_NOTEBOOK_METHODS_CANDIDATE', ROOT / 'scripts/li_v3_notebook_methods.py'))
spec = importlib.util.spec_from_file_location('li_notebook_methods_author_candidate', SOURCE)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def notebook(code='', canary='SEALED_SYNTHETIC_CANARY'):
    return json.dumps({'nbformat': 4, 'nbformat_minor': 5,
                       'metadata': {'private': canary}, 'cells': [
                           {'cell_type': 'markdown', 'source': [canary], 'attachments': {'x': canary}},
                           {'cell_type': 'code', 'source': [code], 'outputs': [{'text': canary}],
                            'execution_count': 987654321}]}).encode()


class NotebookMethodsTests(unittest.TestCase):
    def test_closed_known_inventory_and_parameters(self):
        raw = notebook("import pandas as secret_alias\nfrom sklearn.model_selection import train_test_split\n"
                       "df = secret_alias.read_excel('SECRET_PATH', sheet_name='SECRET_SHEET', header=739281)\n"
                       "train_test_split(df, test_size=0.17291, random_state=239481, stratify=df['SECRET_GROUP'])\n"
                       "df.groupby(by=['SECRET_GROUP'], dropna=False).dropna(subset=['SECRET_TARGET'])")
        report = m.inspect_synthetic_notebook(raw)
        self.assertEqual(report['engineering_status'], 'STATIC_API_INVENTORY_COMPLETE')
        self.assertEqual(report['status'], 'BLOCKED_SCHEMA')
        self.assertFalse(report['scientific_schema_approved'])
        self.assertEqual(report['inventory']['known_import_categories'], ['pandas', 'sklearn.model_selection'])
        names = {c['syntactic_call_name'] for c in report['inventory']['syntactic_calls']}
        self.assertEqual(names, {'read_excel', 'train_test_split', 'groupby', 'dropna'})
        public = json.dumps(report)
        for forbidden in ['SECRET_', 'secret_alias', '739281', '0.17291', '239481', '987654321']:
            self.assertNotIn(forbidden, public)

    def test_canary_invariance_every_region_and_constants(self):
        first = notebook("x = 1234567\nobj.read_excel('ALPHA', sheet_name='ALPHA', header=1234567)\n# ALPHA", 'ALPHA')
        second = notebook("x = 7654321\nobj.read_excel('OMEGA', sheet_name='OMEGA', header=7654321)\n# OMEGA", 'OMEGA')
        self.assertEqual(m.inspect_synthetic_notebook(first), m.inspect_synthetic_notebook(second))

    def test_unknown_names_and_parameter_names_withheld(self):
        result = m.inspect_synthetic_notebook(notebook('import secret_outcome_123456\n'
            'secret_call_123456(secret_kw=321)\nobj.read_excel(secret_kw_123456=[123,456])'))
        inventory = result['inventory']
        self.assertTrue(inventory['unreported_imports_present'])
        self.assertTrue(inventory['unreported_calls_present'])
        self.assertTrue(inventory['syntactic_calls'][0]['unreported_arguments_present'])
        self.assertNotIn('123456', json.dumps(result))

    def test_starred_positions_not_assigned_to_api_slots(self):
        report = m.inspect_synthetic_notebook(notebook("obj.read_excel(*opaque, 'later')"))
        call = report['inventory']['syntactic_calls'][0]
        self.assertEqual(call['parameters'], [])
        self.assertTrue(call['unreported_arguments_present'])

    def test_method_name_is_not_runtime_binding(self):
        report = m.inspect_synthetic_notebook(notebook("class Fake:\n def groupby(self, by): return by\nFake().groupby(by=42)"))
        self.assertFalse(report['inventory']['runtime_binding_or_execution_established'])
        self.assertIn('groupby', [x['syntactic_call_name'] for x in report['inventory']['syntactic_calls']])

    def test_unsupported_magic_retains_exposure_and_no_partial_inventory(self):
        raw = json.dumps({'nbformat': 4, 'nbformat_minor': 5, 'cells': [
            {'cell_type': 'code', 'source': 'import pandas'},
            {'cell_type': 'code', 'source': '%matplotlib inline\nSECRET_VALUE'}]}).encode()
        result = m.inspect_synthetic_notebook(raw)
        self.assertEqual(result['reason'], 'CODE_SYNTAX_UNSUPPORTED')
        self.assertIsNone(result['inventory'])
        self.assertTrue(result['exposure']['json_container_parse_completed'])
        self.assertTrue(result['exposure']['code_ast_parse_started'])
        self.assertFalse(result['exposure']['code_ast_parse_completed'])
        self.assertNotIn('SECRET_VALUE', json.dumps(result))

    def test_duplicate_keys_nonfinite_json_and_bad_utf8_fail_closed(self):
        for raw in [b'{"nbformat":4,"nbformat":4}', b'{"value":NaN}', b'{"value":Infinity}', b'\xff']:
            with self.subTest(raw=raw):
                result = m.inspect_synthetic_notebook(raw)
                self.assertEqual(result['reason'], 'JSON_INVALID')
                self.assertIsNone(result['inventory'])
                self.assertTrue(result['exposure']['json_container_parse_started'])
                self.assertFalse(result['exposure']['json_container_parse_completed'])

    def test_unsupported_notebook_structure_and_resource_limits(self):
        for obj in [{'nbformat': True, 'nbformat_minor': 5, 'cells': []},
                    {'nbformat': 4, 'nbformat_minor': 99, 'cells': []},
                    {'nbformat': 4, 'nbformat_minor': 5, 'cells': [{'cell_type': 'unknown', 'source': ''}]},
                    {'nbformat': 4, 'nbformat_minor': 5, 'cells': [{'cell_type': 'code', 'source': [42]}]}]:
            self.assertEqual(m.inspect_synthetic_notebook(json.dumps(obj).encode())['reason'], 'NOTEBOOK_PROFILE_UNSUPPORTED')
        self.assertEqual(m.inspect_synthetic_notebook(b' ' * (512*1024+1))['reason'], 'STATIC_LIMIT')
        self.assertEqual(m.inspect_synthetic_notebook(notebook('x\n' * 20000))['reason'], 'STATIC_LIMIT')

    def test_code_is_never_executed(self):
        with patch('os.system', side_effect=AssertionError('execute')), \
             patch.object(m.subprocess, 'run', side_effect=AssertionError('process')), \
             patch.object(m.custody, '_open_once', side_effect=AssertionError('network')):
            result = m.inspect_synthetic_notebook(notebook("__import__('os').system('FORBIDDEN')\nraise RuntimeError('SECRET')"))
        self.assertEqual(result['engineering_status'], 'STATIC_API_INVENTORY_COMPLETE')
        self.assertFalse(result['exposure']['notebook_code_executed'])
        self.assertNotIn('FORBIDDEN', json.dumps(result))

    def test_real_blob_forbidden_through_synthetic_interface(self):
        with patch.object(m, '_blob', return_value=m.BLOB):
            result = m.inspect_synthetic_notebook(b'not actual source')
        self.assertEqual(result['reason'], 'SYNTHETIC_REAL_SOURCE_FORBIDDEN')
        self.assertFalse(result['exposure']['json_container_parse_started'])

    def test_prior_pins_match_tracked_public_source(self):
        for path, digest in m.PRIOR_FILES.items():
            raw = (ROOT / path).read_bytes()
            committed = subprocess.run(['git', 'show', 'HEAD:discovery/' + path], cwd=ROOT,
                                       check=True, capture_output=True).stdout
            self.assertEqual(raw, committed)
            self.assertEqual(hashlib.sha256(raw).hexdigest(), digest)

    def test_ignored_source_guard_before_cache_or_network(self):
        with patch.object(m, '__file__', str(ROOT / '.cache/ignored/script.py')), \
             patch.object(m.custody, 'production_context', side_effect=AssertionError('source read')), \
             patch.object(m.custody, '_read_relative', side_effect=AssertionError('cache')), \
             patch.object(m.custody, '_open_once', side_effect=AssertionError('network')):
            report = m.run('capture')
        self.assertEqual(report['reason'], 'FROZEN_SOURCE_REQUIRED')
        self.assertFalse(report['exposure']['target_bearing_source_bytes_read'])

    def test_positive_synthetic_source_context_and_index_mismatch(self):
        payload = {p: ('PUBLIC_SYNTHETIC:' + p).encode() for p in m.FROZEN_PATHS}
        prior = {'commit': 'a'*40, 'files': dict(m.PRIOR_FILES)}
        def fake_git(args, **kwargs):
            if args[1:] == ['rev-parse', '--show-prefix']:
                return types.SimpleNamespace(stdout=b'discovery/\n')
            key = args[2].split(':',1)[1].removeprefix('discovery/')
            return types.SimpleNamespace(stdout=payload[key])
        with patch.object(m, '__file__', str(ROOT / m.FROZEN_PATHS[0])), \
             patch.object(m.custody, 'production_context', return_value=prior), \
             patch.object(m.custody, '_read_relative', side_effect=lambda path, cap: payload[path]), \
             patch.object(m.subprocess, 'run', side_effect=fake_git):
            result = m.production_context()
            self.assertEqual(result['files'], {p: hashlib.sha256(raw).hexdigest() for p,raw in payload.items()})
            with patch.object(m.subprocess, 'run', return_value=types.SimpleNamespace(stdout=b'changed')):
                with self.assertRaises(m.custody.CustodyError):
                    m.production_context()

    def test_fixed_fetch_no_redirect_and_partial_exposure(self):
        class Response:
            status=302
            headers={}
            def close(self): pass
            def read(self, cap): raise AssertionError('redirect body read')
        report=m._base()
        with patch.object(m.custody, '_open_once', return_value=Response()) as call:
            with self.assertRaises(m.custody.CustodyError): m._fetch(report)
        call.assert_called_once_with(m.URL)
        self.assertFalse(report['exposure']['target_bearing_source_bytes_read'])
        Response.status=200
        Response.read=lambda self, cap: (_ for _ in ()).throw(OSError('SECRET_PARTIAL'))
        with patch.object(m.custody, '_open_once', return_value=Response()):
            with self.assertRaises(m.custody.CustodyError): m._fetch(report)
        self.assertIsNone(report['exposure']['target_bearing_source_bytes_read'])

    def test_capture_bridge_rejects_extra_keys_and_changed_identity(self):
        identity={'mode':'committed_source','commit':'a'*40,'files':{'fake':'b'*64},'prior_files':dict(m.PRIOR_FILES)}
        source={'repository':'avakanski/Subsized-Specimens-Tensile-Properties','commit':m.COMMIT,
                'path':'Sample_Code.ipynb','git_blob_sha1':m.BLOB,'bytes':m.SOURCE_BYTES,'sha256':'c'*64}
        raw=m.custody.canonical(m._capture_report(identity,source))
        self.assertEqual(m._capture_identity(raw,identity),source)
        obj=json.loads(raw); obj['secret']='DO_NOT_ECHO'
        with self.assertRaises(m.MethodsError): m._capture_identity(m.custody.canonical(obj),identity)
        with self.assertRaises(m.MethodsError): m._capture_identity(raw,dict(identity,files={}))

    def test_parser_warning_does_not_disclose_literal_to_stderr(self):
        stream=io.StringIO()
        with contextlib.redirect_stderr(stream), warnings.catch_warnings():
            warnings.simplefilter('always')
            result=m.inspect_synthetic_notebook(notebook("value = '\\qSYNTHETIC_LITERAL_CANARY'"))
        self.assertEqual(result['engineering_status'],'STATIC_API_INVENTORY_COMPLETE')
        self.assertEqual(stream.getvalue(),'')
        self.assertNotIn('SYNTHETIC_LITERAL_CANARY',json.dumps(result))

    def test_no_code_cells_do_not_claim_ast_access(self):
        for cells in [[], [{'cell_type':'markdown','source':'OPAQUE_MARKDOWN'}]]:
            raw=json.dumps({'nbformat':4,'nbformat_minor':5,'cells':cells}).encode()
            report=m.inspect_synthetic_notebook(raw)
            self.assertEqual(report['engineering_status'],'STATIC_API_INVENTORY_COMPLETE')
            self.assertFalse(report['exposure']['code_ast_parse_started'])
            self.assertFalse(report['exposure']['code_ast_parse_completed'])
            self.assertEqual(report['inventory']['syntactic_calls'],[])

    def test_float_capture_size_forgery_rejected(self):
        identity={'mode':'committed_source','commit':'a'*40,'files':{},'prior_files':dict(m.PRIOR_FILES)}
        source={'repository':'avakanski/Subsized-Specimens-Tensile-Properties','commit':m.COMMIT,
                'path':'Sample_Code.ipynb','git_blob_sha1':m.BLOB,'bytes':float(m.SOURCE_BYTES),'sha256':'c'*64}
        with self.assertRaises(m.MethodsError):
            m._capture_identity(m.custody.canonical(m._capture_report(identity,source)),identity)

    def test_synthetic_size_and_type_guard_precedes_hash(self):
        with patch.object(m, '_blob', side_effect=AssertionError('hash after invalid input')):
            for raw in [b' ' * (512*1024+1), 'not bytes', None]:
                result=m.inspect_synthetic_notebook(raw)
                self.assertEqual(result['reason'],'STATIC_LIMIT')
                self.assertFalse(result['exposure']['target_bearing_source_bytes_read'])
        with patch.object(m, '_blob', return_value=m.BLOB):
            result=m.inspect_synthetic_notebook(b'synthetic hash stand-in')
        self.assertTrue(result['exposure']['target_bearing_source_bytes_read'])
        self.assertFalse(result['exposure']['json_container_parse_started'])

    def test_invalid_capture_precedes_raw_object_read(self):
        identity={'mode':'committed_source','commit':'a'*40,'files':{},'prior_files':dict(m.PRIOR_FILES)}
        reads=[]
        def read(path, cap):
            reads.append(path)
            if path == m.CAPTURE: return b'{}'
            raise AssertionError('object read after bad capture')
        with patch.object(m,'production_context',return_value=identity), \
             patch.object(m.custody,'_output_directory',return_value=123), \
             patch.object(m.custody,'_absent_at'), patch.object(m.custody,'_write_at'), \
             patch.object(m.custody,'_read_relative',side_effect=read), patch.object(m.os,'close'):
            result=m.run('inspect','1')
        self.assertEqual(reads,[m.CAPTURE]); self.assertEqual(result['reason'],'CAPTURE_INVALID')
        self.assertFalse(result['exposure']['target_bearing_source_bytes_read'])


if __name__ == '__main__':
    unittest.main()
