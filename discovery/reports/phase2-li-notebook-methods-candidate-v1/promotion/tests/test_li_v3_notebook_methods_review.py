"""Independent synthetic static-inventory and custody-boundary regression checks.

No actual notebook, workbook, private custody file or network operation is used.
"""
from contextlib import ExitStack, contextmanager, redirect_stderr, redirect_stdout
import copy
import hashlib
import importlib.util
import io
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
            if (p / 'scripts/li_v3_custody.py').is_file() and (p / 'AGENTS.md').is_file())
sys.path.insert(0, str(ROOT / 'scripts'))
SOURCE = Path(os.environ.get('LUPINE_NOTEBOOK_METHODS_CANDIDATE', ROOT / 'scripts/li_v3_notebook_methods.py'))
spec = importlib.util.spec_from_file_location('independent_li_notebook_methods_candidate', SOURCE)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
REAL_OPEN_ONCE = m.custody._open_once


def fixture(code='', marker='INDEPENDENT_PRIVATE_CANARY', extra_cells=()):
    return json.dumps({'nbformat': 4, 'nbformat_minor': 5,
        'metadata': {'arbitrary': marker, 'nested': [marker, {'value': marker}]},
        'cells': [{'cell_type': 'code', 'source': code, 'execution_count': 98234751,
                   'outputs': [{'output_type': 'display_data', 'data': {'text/plain': marker,
                                'image/png': marker}, 'metadata': {'value': marker}},
                               {'output_type': 'error', 'ename': marker, 'evalue': marker,
                                'traceback': [marker]}], 'metadata': {'marker': marker}},
                  {'cell_type': 'markdown', 'source': marker, 'attachments': {'private': marker}},
                  {'cell_type': 'raw', 'source': [marker]}, *extra_cells]}).encode()


def inventory(raw):
    result = m.inspect_synthetic_notebook(raw)
    if result['engineering_status'] != 'STATIC_API_INVENTORY_COMPLETE':
        raise AssertionError(result['reason'])
    return result['inventory']


class NotebookMethodsIndependentTests(unittest.TestCase):
    def setUp(self):
        self.safety = ExitStack()
        self.addCleanup(self.safety.close)
        for name in ('_open_once', '_read_relative', '_write_at', '_directory',
                     '_output_directory', '_absent_at'):
            self.safety.enter_context(patch.object(m.custody, name,
                side_effect=AssertionError('Unmocked external operation: ' + name)))

    def assert_closed(self, report, *canaries):
        public = m.custody.canonical(report).decode()
        for value in ('INDEPENDENT_PRIVATE_CANARY', '98234751', *canaries):
            self.assertNotIn(value, public)
        self.assertEqual(report['status'], 'BLOCKED_SCHEMA')
        self.assertFalse(report['scientific_schema_approved'])
        for key in ('notebook_code_executed', 'raw_code_disclosed', 'output_values_disclosed'):
            self.assertFalse(report['exposure'][key])

    @contextmanager
    def production_fixture(self, raw=None, *, receipt=None, reader_error=None):
        raw = fixture('import pandas\nx.read_excel("SEALED_PATH", header=938745)') if raw is None else raw
        identity = {'mode': 'committed_source', 'commit': 'a' * 40,
                    'files': {name: 'b' * 64 for name in m.FROZEN_PATHS},
                    'prior_files': dict(m.PRIOR_FILES)}
        events, writes = [], []
        with ExitStack() as stack:
            stack.enter_context(patch.object(m, 'SOURCE_BYTES', len(raw)))
            stack.enter_context(patch.object(m, 'BLOB', m._blob(raw)))
            source = m._verify(raw)
            stored_receipt = m.custody.canonical(m._capture_report(identity, source)) if receipt is None else receipt
            def context():
                events.append(('guard',))
                return identity
            def reader(path, cap):
                events.append(('read', path, cap))
                if path == m.CAPTURE:
                    return stored_receipt
                if path == m.OBJECT:
                    if reader_error is not None:
                        raise reader_error
                    return raw
                raise AssertionError('Unexpected read')
            def writer(directory, name, value):
                writes.append((directory, name, value))
                events.append(('write', name))
            stack.enter_context(patch.object(m, 'production_context', side_effect=context))
            stack.enter_context(patch.object(m.custody, '_read_relative', side_effect=reader))
            stack.enter_context(patch.object(m.custody, '_output_directory', side_effect=lambda p: events.append(('output', str(p))) or 101))
            stack.enter_context(patch.object(m.custody, '_directory', return_value=102))
            stack.enter_context(patch.object(m.custody, '_absent_at', side_effect=lambda d,n: events.append(('absent', n))))
            stack.enter_context(patch.object(m.custody, '_write_at', side_effect=writer))
            stack.enter_context(patch.object(m.os, 'close'))
            yield types.SimpleNamespace(raw=raw, identity=identity, source=source,
                                        receipt=stored_receipt, events=events, writes=writes)

    def test_container_and_code_canaries_are_invariant(self):
        code1 = 'import pandas as ALPHA_ALIAS\nx.read_excel("ALPHA_PATH", sheet_name="ALPHA_SHEET", header=327819)\n# ALPHA_COMMENT\nx = "ALPHA_LITERAL"'
        code2 = 'import pandas as OMEGA_ALIAS\nx.read_excel("OMEGA_PATH", sheet_name="OMEGA_SHEET", header=918273)\n# OMEGA_COMMENT\nx = "OMEGA_LITERAL"'
        one = m.inspect_synthetic_notebook(fixture(code1, 'ALPHA_CONTAINER'))
        two = m.inspect_synthetic_notebook(fixture(code2, 'OMEGA_CONTAINER'))
        self.assertEqual(one, two)
        self.assert_closed(one, 'ALPHA', 'OMEGA', '327819', '918273')

    def test_unknown_names_and_aliases_are_never_disclosed(self):
        raw = fixture('import PRIVATE_MODULE as PRIVATE_ALIAS\nfrom .pandas import PRIVATE_ITEM\nPRIVATE_CALL(PRIVATE_KEY=918273)\n'
                      'x.read_excel(PRIVATE_KEY=PRIVATE_VALUE)\nfrom pandas import PRIVATE_ATTRIBUTE')
        result = m.inspect_synthetic_notebook(raw)
        self.assertEqual(result['inventory']['known_import_categories'], ['pandas'])
        self.assertTrue(result['inventory']['unreported_imports_present'])
        self.assertTrue(result['inventory']['unreported_calls_present'])
        self.assertEqual(result['inventory']['syntactic_calls'], [{'syntactic_call_name': 'read_excel',
            'parameters': [], 'unreported_arguments_present': True}])
        self.assert_closed(result, 'PRIVATE_', '918273')

    def test_expression_kinds_disclose_shapes_without_values(self):
        cases = [('123456', 'literal_scalar'), ('"PRIVATE_LITERAL"', 'literal_scalar'),
                 ('None', 'literal_scalar'), ('["PRIVATE_ITEM"]', 'literal_container'),
                 ('{"PRIVATE_KEY": 123456}', 'literal_container'), ('PRIVATE_NAME', 'name'),
                 ('PRIVATE_RECEIVER.value', 'attribute'), ('PRIVATE_TABLE["PRIVATE_COLUMN"]', 'subscript'),
                 ('PRIVATE_FUNCTION()', 'call'), ('-123456', 'other_expression'),
                 ('lambda: "PRIVATE_VALUE"', 'other_expression')]
        for expression, kind in cases:
            with self.subTest(kind=kind, expression=expression):
                report = m.inspect_synthetic_notebook(fixture('x.read_excel(header=' + expression + ')'))
                call = report['inventory']['syntactic_calls'][0]
                self.assertEqual(call['parameters'], [{'name': 'header', 'syntax': 'keyword', 'kind': kind}])
                self.assert_closed(report, 'PRIVATE_', '123456')

    def test_star_args_and_keyword_expansion_remain_unresolved(self):
        for code in ['x.read_excel(*PRIVATE_ARGS, "PRIVATE_TAIL")',
                     'x.read_excel("PRIVATE_FIRST", *PRIVATE_ARGS)',
                     'x.read_excel(**PRIVATE_KWARGS)', 'x.split(*PRIVATE_ARGS, **PRIVATE_KWARGS)']:
            with self.subTest(code=code):
                report = m.inspect_synthetic_notebook(fixture(code))
                call = report['inventory']['syntactic_calls'][0]
                self.assertEqual(call['parameters'], [])
                self.assertTrue(call['unreported_arguments_present'])
                self.assert_closed(report, 'PRIVATE_')
        call = inventory(fixture('x.read_excel(*PRIVATE_ARGS, header=123456, **PRIVATE_KWARGS)'))['syntactic_calls'][0]
        self.assertEqual(call['parameters'], [{'name': 'header', 'syntax': 'keyword', 'kind': 'literal_scalar'}])
        self.assertTrue(call['unreported_arguments_present'])

    def test_positional_slots_and_extra_arguments_remain_syntactic(self):
        call = inventory(fixture('x.read_excel("PRIVATE_FILE", "PRIVATE_SHEET", 123456)'))['syntactic_calls'][0]
        self.assertEqual([x['name'] for x in call['parameters']], ['position_1', 'position_2'])
        self.assertTrue(call['unreported_arguments_present'])
        call = inventory(fixture('x.split(X, y, groups)'))['syntactic_calls'][0]
        self.assertEqual([x['name'] for x in call['parameters']], ['position_1', 'position_2', 'position_3'])
        self.assertFalse(call['unreported_arguments_present'])
        for name in ('train_test_split', 'groupby', 'merge', 'join', 'dropna'):
            call = inventory(fixture(name + '("PRIVATE_POSITIONAL")'))['syntactic_calls'][0]
            self.assertEqual(call['parameters'], [])
            self.assertTrue(call['unreported_arguments_present'])

    def test_all_closed_names_and_keywords_have_closed_shapes(self):
        for name, keys in m.PARAMETERS.items():
            arguments = ','.join(key + '=123456' for key in keys)
            result = inventory(fixture('PRIVATE_RECEIVER.' + name + '(' + arguments + ')'))
            self.assertEqual(len(result['syntactic_calls']), 1)
            call = result['syntactic_calls'][0]
            self.assertEqual(call['syntactic_call_name'], name)
            self.assertEqual([p['name'] for p in call['parameters']], sorted(keys))
            self.assertTrue(all(p['kind'] == 'literal_scalar' for p in call['parameters']))
            self.assertFalse(call['unreported_arguments_present'])
        for name in m.IMPORTS:
            self.assertEqual(inventory(fixture('import ' + name))['known_import_categories'], [name])

    def test_dead_code_fake_receiver_and_dedup_have_no_runtime_claim(self):
        one = fixture('if False:\n fake.groupby(by="PRIVATE_GROUP")\n')
        repeated = fixture('if False:\n fake.groupby(by="PRIVATE_GROUP")\n'
                           'def unused():\n another.groupby(by="OTHER_GROUP")\n')
        self.assertEqual(inventory(one), inventory(repeated))
        self.assertFalse(inventory(one)['runtime_binding_or_execution_established'])

    def test_code_is_not_evaluated_or_executed(self):
        with patch('os.system', side_effect=AssertionError('execution')), \
             patch('builtins.eval', side_effect=AssertionError('eval')), \
             patch('builtins.exec', side_effect=AssertionError('exec')):
            report = m.inspect_synthetic_notebook(fixture('__import__("os").system("PRIVATE_COMMAND")\n'
                                                        'raise Exception("PRIVATE_EXCEPTION")'))
        self.assertEqual(report['engineering_status'], 'STATIC_API_INVENTORY_COMPLETE')
        self.assert_closed(report, 'PRIVATE_')

    def test_bad_json_keys_utf8_and_constants_fail_without_inventory(self):
        for raw in (b'{"a":1,"a":2}', b'{"x":{"a":1,"a":2}}', b'{"x":NaN}',
                    b'{"x":Infinity}', b'{"x":-Infinity}', b'\xff', b'{"PRIVATE_SECRET":'):
            with self.subTest(raw_prefix=raw[:20]):
                result = m.inspect_synthetic_notebook(raw)
                self.assertEqual(result['reason'], 'JSON_INVALID')
                self.assertIsNone(result['inventory'])
                self.assertTrue(result['exposure']['json_container_parse_started'])
                self.assertFalse(result['exposure']['json_container_parse_completed'])
                self.assert_closed(result, 'PRIVATE_SECRET')

    def test_deep_valid_json_rejects_as_parse_or_non_notebook_without_disclosure(self):
        # Parser recursion capacity varies by Python runtime; the JSON is syntactically valid.
        result = m.inspect_synthetic_notebook(b'[' * 2000 + b']' * 2000)
        self.assertIn(result['reason'], ('JSON_INVALID', 'NOTEBOOK_PROFILE_UNSUPPORTED'))
        self.assertIsNone(result['inventory'])
        self.assertTrue(result['exposure']['json_container_parse_started'])
        self.assertEqual(result['exposure']['json_container_parse_completed'],
                         result['reason'] == 'NOTEBOOK_PROFILE_UNSUPPORTED')
        self.assertFalse(result['exposure']['code_ast_parse_started'])
        self.assert_closed(result)

    def test_parser_warning_channel_does_not_disclose_literal_or_source(self):
        code = "x.read_excel(sheet_name='" + "\\q" + "PRIVATE_WARNING_CANARY')"
        stderr, stdout = io.StringIO(), io.StringIO()
        with warnings.catch_warnings():
            warnings.simplefilter('always')
            filters = list(warnings.filters)
            with redirect_stderr(stderr), redirect_stdout(stdout):
                result = m.inspect_synthetic_notebook(fixture(code))
            self.assertEqual(warnings.filters, filters)
        self.assertEqual(result['engineering_status'], 'STATIC_API_INVENTORY_COMPLETE')
        self.assertEqual(stderr.getvalue(), '')
        self.assertEqual(stdout.getvalue(), '')
        self.assert_closed(result, 'PRIVATE_WARNING_CANARY', '\\q')

    def test_malformed_notebook_structure_and_versions_fail(self):
        base = {'nbformat': 4, 'nbformat_minor': 5, 'cells': []}
        cases = [None, [], {}, dict(base, nbformat=True), dict(base, nbformat_minor=True),
                 dict(base, nbformat=3), dict(base, nbformat_minor=-1), dict(base, nbformat_minor=6),
                 dict(base, cells={}), dict(base, cells=[None]),
                 dict(base, cells=[{'cell_type': 'PRIVATE_KIND', 'source': ''}]),
                 dict(base, cells=[{'cell_type': 'code', 'source': [1]}]),
                 dict(base, cells=[{'cell_type': 'markdown', 'source': None}]),
                 dict(base, cells=[{'cell_type': 'code'}])]
        for obj in cases:
            with self.subTest(obj_type=type(obj).__name__):
                result = m.inspect_synthetic_notebook(json.dumps(obj).encode())
                self.assertEqual(result['reason'], 'NOTEBOOK_PROFILE_UNSUPPORTED')
                self.assertIsNone(result['inventory'])
                self.assertTrue(result['exposure']['json_container_parse_completed'])
                self.assert_closed(result, 'PRIVATE_KIND')

    def test_code_syntax_failure_discards_prior_partial_inventory(self):
        for bad in ('%matplotlib inline', '!PRIVATE_COMMAND', 'x =', 'x = "PRIVATE_SECRET'):
            raw = fixture('import pandas\nx.groupby(by="PRIVATE_GROUP")', extra_cells=[
                          {'cell_type': 'code', 'source': bad}])
            result = m.inspect_synthetic_notebook(raw)
            self.assertEqual(result['reason'], 'CODE_SYNTAX_UNSUPPORTED')
            self.assertIsNone(result['inventory'])
            self.assertTrue(result['exposure']['code_ast_parse_started'])
            self.assertFalse(result['exposure']['code_ast_parse_completed'])
            self.assert_closed(result, 'PRIVATE_', 'matplotlib')

    def test_size_cell_code_node_and_depth_limits_fail_closed(self):
        cases = [b' ' * (512 * 1024 + 1), fixture('#' + 'a' * (256 * 1024)),
                 json.dumps({'nbformat':4,'nbformat_minor':5,'cells':[
                     {'cell_type':'raw','source':''} for _ in range(513)]}).encode(),
                 fixture('x\n' * 18000), fixture('x=' + '+'.join(['1'] * 200))]
        for raw in cases:
            with self.subTest(size=len(raw)):
                result = m.inspect_synthetic_notebook(raw)
                self.assertIn(result['reason'], ('STATIC_LIMIT', 'NOTEBOOK_PROFILE_UNSUPPORTED'))
                self.assertIsNone(result['inventory'])
                self.assert_closed(result)
        for raw in (None, bytearray(b'{}'), '{}'):
            self.assertEqual(m.inspect_synthetic_notebook(raw)['reason'], 'STATIC_LIMIT')

    def test_synthetic_real_blob_guard_precedes_container_parse(self):
        with patch.object(m, '_blob', return_value=m.BLOB), \
             patch.object(m, '_inspect', side_effect=AssertionError('parse forbidden')):
            result = m.inspect_synthetic_notebook(b'SYNTHETIC_BYTES')
        self.assertEqual(result['reason'], 'SYNTHETIC_REAL_SOURCE_FORBIDDEN')
        self.assertFalse(result['exposure']['json_container_parse_started'])

    def test_synthetic_type_and_size_bounds_precede_hash_traversal(self):
        with patch.object(m, '_blob', side_effect=AssertionError('hash before cap')):
            for raw in (None, '{}', bytearray(b'{}'), b' ' * (512 * 1024 + 1)):
                result = m.inspect_synthetic_notebook(raw)
                self.assertEqual(result['reason'], 'STATIC_LIMIT')
                self.assertFalse(result['exposure']['json_container_parse_started'])
        with patch.object(m, '_blob', return_value=m.BLOB):
            result = m.inspect_synthetic_notebook(b'SYNTHETIC_BYTES')
        self.assertTrue(result['exposure']['target_bearing_source_bytes_read'])

    def test_no_code_container_has_no_ast_start_or_completion(self):
        for cells in ([], [{'cell_type': 'markdown', 'source': 'PRIVATE_TEXT'}],
                      [{'cell_type': 'raw', 'source': ['PRIVATE_TEXT']}]):
            raw = json.dumps({'nbformat': 4, 'nbformat_minor': 5, 'cells': cells}).encode()
            result = m.inspect_synthetic_notebook(raw)
            self.assertEqual(result['engineering_status'], 'STATIC_API_INVENTORY_COMPLETE')
            self.assertTrue(result['exposure']['json_container_parse_completed'])
            self.assertFalse(result['exposure']['code_ast_parse_started'])
            self.assertFalse(result['exposure']['code_ast_parse_completed'])
            self.assert_closed(result, 'PRIVATE_TEXT')

    def test_invalid_actions_and_source_guard_precede_external_access(self):
        for args in [('invalid', None), ('capture', '1'), ('inspect', None), ('inspect', '3'), ('inspect', '../1')]:
            result = m.run(*args)
            self.assertEqual(result['reason'], 'CLI_ARGUMENT_INVALID')
            self.assertFalse(result['exposure']['target_bearing_source_bytes_read'])
        with patch.object(m, '__file__', str(ROOT / '.cache/ignored-candidate.py')), \
             patch.object(m.custody, 'production_context', side_effect=AssertionError('prior guard must not run')):
            for args in [('capture', None), ('inspect', '1')]:
                result = m.run(*args)
                self.assertEqual(result['reason'], 'FROZEN_SOURCE_REQUIRED')
                self.assertFalse(result['exposure']['target_bearing_source_bytes_read'])

    def test_actual_prior_five_pins_match_public_head_and_worktree(self):
        prefix = subprocess.run(['git','rev-parse','--show-prefix'],cwd=ROOT,check=True,
                                capture_output=True).stdout.decode().strip()
        self.assertEqual(len(m.PRIOR_FILES), 5)
        for relative, digest in m.PRIOR_FILES.items():
            raw = (ROOT / relative).read_bytes()
            committed = subprocess.run(['git','show','HEAD:' + prefix + relative],cwd=ROOT,
                                       check=True,capture_output=True).stdout
            self.assertEqual(raw, committed)
            self.assertEqual(hashlib.sha256(raw).hexdigest(), digest)

    def test_synthetic_guard_checks_each_new_worktree_head_index_and_old_pin(self):
        payload = {p: ('SYNTHETIC_PUBLIC_' + p).encode() for p in m.FROZEN_PATHS}
        prior = {'commit':'a'*40,'files':dict(m.PRIOR_FILES)}
        for mismatch in [None, *[(p, where) for p in m.FROZEN_PATHS for where in ('head','index')]]:
            def git(args, **kwargs):
                if args[1:] == ['rev-parse','--show-prefix']:
                    return types.SimpleNamespace(stdout=b'discovery/\n')
                key = args[2].split(':',1)[1].removeprefix('discovery/')
                location = 'index' if args[2].startswith(':') else 'head'
                return types.SimpleNamespace(stdout=b'CHANGED' if mismatch == (key,location) else payload[key])
            with patch.object(m,'__file__',str(ROOT / m.FROZEN_PATHS[0])), \
                 patch.object(m.custody,'production_context',return_value=prior), \
                 patch.object(m.custody,'_read_relative',side_effect=lambda p,cap:payload[p]), \
                 patch.object(m.subprocess,'run',side_effect=git):
                if mismatch is None:
                    context=m.production_context()
                    self.assertEqual(context['files'],{p:hashlib.sha256(v).hexdigest() for p,v in payload.items()})
                else:
                    with self.assertRaisesRegex(m.custody.CustodyError,'^FROZEN_SOURCE_REQUIRED$'):
                        m.production_context()
        changed=copy.deepcopy(prior);changed['files'][next(iter(changed['files']))]='0'*64
        with patch.object(m,'__file__',str(ROOT / m.FROZEN_PATHS[0])), \
             patch.object(m.custody,'production_context',return_value=changed):
            with self.assertRaisesRegex(m.custody.CustodyError,'^FROZEN_SOURCE_REQUIRED$'):
                m.production_context()

    def test_fixed_transport_requests_identity_encoding_and_disables_redirects(self):
        expected='https://raw.githubusercontent.com/avakanski/Subsized-Specimens-Tensile-Properties/d19b15127c8ae1be49308c29eac718b609ad895c/Sample_Code.ipynb'
        self.assertEqual(m.URL,expected)
        calls=[]
        class Opener:
            def open(self,request,timeout):
                calls.append((request.full_url,request.get_method(),request.get_header('Accept-encoding'),timeout))
                return 'SYNTHETIC_RESPONSE'
        def build(handler):
            self.assertIsInstance(handler,m.custody._NoRedirect)
            self.assertIsNone(handler.redirect_request(None,None,302,'ignored',{},'https://invalid.example'))
            return Opener()
        with patch.object(m.custody,'build_opener',side_effect=build):
            self.assertEqual(REAL_OPEN_ONCE(m.URL),'SYNTHETIC_RESPONSE')
        self.assertEqual(calls,[(expected,'GET','identity',30)])

    def test_fetch_status_encoding_and_partial_read_exposure(self):
        class Response:
            def __init__(self,status=200,encoding='identity',failure=None):
                self.status=status;self.headers={'Content-Encoding':encoding};self.failure=failure
                self.reads=[];self.closed=False
            def read(self,cap):
                self.reads.append(cap)
                if self.failure:raise self.failure
                return b'SYNTHETIC_BYTES'
            def close(self):self.closed=True
        for status,encoding,expected in [(301,'identity','FETCH_STATUS_INVALID'),(302,'identity','FETCH_STATUS_INVALID'),
                                         (403,'identity','FETCH_STATUS_INVALID'),(200,'gzip','FETCH_ENCODING_INVALID')]:
            response=Response(status,encoding);report=m._base()
            with patch.object(m.custody,'_open_once',return_value=response) as fetch:
                with self.assertRaisesRegex(m.custody.CustodyError,'^'+expected+'$'):m._fetch(report)
            fetch.assert_called_once_with(m.URL);self.assertEqual(response.reads,[]);self.assertTrue(response.closed)
            self.assertFalse(report['exposure']['target_bearing_source_bytes_read'])
        response=Response(failure=OSError('PRIVATE_PARTIAL_READ'));report=m._base()
        with patch.object(m.custody,'_open_once',return_value=response):
            with self.assertRaisesRegex(m.custody.CustodyError,'^FETCH_FAILED$'):m._fetch(report)
        self.assertIsNone(report['exposure']['target_bearing_source_bytes_read'])
        self.assertEqual(response.reads,[m.SOURCE_BYTES+1]);self.assertTrue(response.closed)
        response=Response();report=m._base()
        with patch.object(m.custody,'_open_once',return_value=response):
            self.assertEqual(m._fetch(report),b'SYNTHETIC_BYTES')
        self.assertTrue(report['exposure']['target_bearing_source_bytes_read'])

    def test_exact_source_identity_rejects_wrong_type_size_and_blob(self):
        for raw in (b'', b'x'*(m.SOURCE_BYTES-1), b'x'*m.SOURCE_BYTES,
                    b'x'*(m.SOURCE_BYTES+1), 'not bytes'):
            with self.assertRaisesRegex(m.MethodsError,'^NOTEBOOK_IDENTITY_INVALID$'):m._verify(raw)
        with self.production_fixture() as f:
            self.assertEqual(m._verify(f.raw),f.source)

    def test_capture_receipt_is_canonical_closed_and_source_bound(self):
        with self.production_fixture() as f:
            self.assertEqual(m._capture_identity(f.receipt,f.identity),f.source)
            base=json.loads(f.receipt)
            mutations=[]
            for path,value in [(('extra',),'PRIVATE_VALUE'),(('synthetic',),True),
                (('implementation','files'),{}),(('implementation','prior_files'),{}),
                (('implementation','commit'),'not_a_commit'),(('source','commit'),'b'*40),
                (('source','git_blob_sha1'),'b'*40),(('source','bytes'),len(f.raw)+1),
                (('source','bytes'),float(len(f.raw))),(('source','bytes'),True),
                (('source','sha256'),'bad'),(('exposure','notebook_code_executed'),True),
                (('engineering_status',),'STATIC_API_INVENTORY_COMPLETE')]:
                obj=copy.deepcopy(base);target=obj
                for key in path[:-1]:target=target[key]
                target[path[-1]]=value;mutations.append(m.custody.canonical(obj))
            mutations.extend([json.dumps(base).encode(),f.receipt+b' ',b'{}'])
            for raw in mutations:
                with self.assertRaisesRegex(m.MethodsError,'^CAPTURE_INVALID$'):m._capture_identity(raw,f.identity)
            historical=copy.deepcopy(base);historical['implementation']['commit']='d'*40
            self.assertEqual(m._capture_identity(m.custody.canonical(historical),f.identity),f.source)

    def test_invalid_receipt_blocks_before_raw_object_or_parser(self):
        with self.production_fixture(receipt=b'{}') as f, \
             patch.object(m,'_inspect',side_effect=AssertionError('parse forbidden')):
            result=m.run('inspect','1')
        self.assertEqual([e[1] for e in f.events if e[0]=='read'],[m.CAPTURE])
        self.assertEqual(result['reason'],'CAPTURE_INVALID')
        self.assertFalse(result['exposure']['target_bearing_source_bytes_read'])
        self.assertEqual(f.events[0],('guard',));self.assert_closed(result)

    def test_partial_object_read_keeps_unknown_completion(self):
        with self.production_fixture(reader_error=m.custody.CustodyError('FILE_READ_FAILED')) as f:
            result=m.run('inspect','1')
        self.assertEqual(result['reason'],'FILE_READ_FAILED')
        self.assertIsNone(result['exposure']['target_bearing_source_bytes_read'])
        self.assertFalse(result['exposure']['json_container_parse_started'])
        self.assertEqual([e[1] for e in f.events if e[0]=='read'],[m.CAPTURE,m.OBJECT])
        self.assert_closed(result)

    def test_production_simulation_checks_receipt_identity_then_parses(self):
        with self.production_fixture() as f:
            result=m.run('inspect','2')
        self.assertEqual(result['engineering_status'],'STATIC_API_INVENTORY_COMPLETE')
        self.assertEqual([e[1] for e in f.events if e[0]=='read'],[m.CAPTURE,m.OBJECT])
        self.assertEqual(f.events[0],('guard',));self.assertEqual(result['source'],f.source)
        self.assertTrue(result['exposure']['json_container_parse_completed'])
        self.assertTrue(result['exposure']['code_ast_parse_completed'])
        self.assertEqual(len(f.writes),1);self.assertEqual(f.writes[0][1],'public.json')
        self.assertEqual(json.loads(f.writes[0][2]),result)
        self.assert_closed(result,'SEALED_PATH','938745')

    def test_production_object_identity_mismatch_blocks_before_parser(self):
        with self.production_fixture() as f, \
             patch.object(m,'_verify',side_effect=m.MethodsError('NOTEBOOK_IDENTITY_INVALID')), \
             patch.object(m,'_inspect',side_effect=AssertionError('parse forbidden')):
            result=m.run('inspect','1')
        self.assertEqual(result['reason'],'NOTEBOOK_IDENTITY_INVALID')
        self.assertTrue(result['exposure']['target_bearing_source_bytes_read'])
        self.assertFalse(result['exposure']['json_container_parse_started'])
        self.assert_closed(result)

    def test_capture_simulation_stores_exact_bytes_without_parsing(self):
        with self.production_fixture() as f, \
             patch.object(m,'_fetch',return_value=f.raw), \
             patch.object(m,'_inspect',side_effect=AssertionError('capture must not parse')):
            result=m.run('capture')
        self.assertEqual(result['engineering_status'],'CAPTURE_VERIFIED')
        self.assertFalse(result['exposure']['json_container_parse_started'])
        self.assertEqual([w[1] for w in f.writes],[Path(m.OBJECT).name,Path(m.CAPTURE).name,'public.json'])
        self.assertEqual(f.writes[0][2],f.raw);self.assertEqual(f.writes[1][2],m.custody.canonical(result))
        self.assert_closed(result,'SEALED_PATH','938745')

    def test_output_conflict_stops_before_network_or_private_read(self):
        with self.production_fixture() as f, \
             patch.object(m.custody,'_absent_at',side_effect=m.custody.CustodyError('OUTPUT_CONFLICT')):
            result=m.run('capture')
        self.assertEqual(result['reason'],'OUTPUT_CONFLICT')
        self.assertFalse(any(e[0]=='read' for e in f.events));self.assertEqual(f.writes,[])
        self.assertFalse(result['exposure']['target_bearing_source_bytes_read'])


if __name__ == '__main__':
    unittest.main()
