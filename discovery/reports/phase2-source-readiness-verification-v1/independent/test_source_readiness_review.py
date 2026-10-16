"""Independent generated input and wire-projection checks; no source operations."""
import contextlib
import copy
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from lupine_discovery import cli, server, source_readiness as subject

FIXTURE = Path(__file__).with_name('source-readiness-v1.json').read_bytes()
VALUE = json.loads(FIXTURE)

class Reader:
    def __init__(self, raw=FIXTURE, error=None): self.raw,self.error,self.requested = raw,error,[]
    def joinpath(self, *parts):
        if '/'.join(parts) != 'resources/source-readiness-v1.json': raise AssertionError('unexpected resource')
        return self
    def open(self, mode):
        if mode != 'rb': raise AssertionError('unexpected mode')
        if self.error: raise self.error
        owner = self
        class Handle(io.BytesIO):
            def read(self, size=-1):
                owner.requested.append(size)
                if size != 32769: raise AssertionError('unbounded read')
                return super().read(size)
        return Handle(self.raw)

class MissingOptional:
    def joinpath(self,*_):return self
    def is_file(self):return False

class SourceReadinessIndependentTests(unittest.TestCase):
    def invalid(self, value):
        with self.assertRaises(subject.SourceReadinessError) as caught:
            subject.validate_source_readiness(value)
        self.assertEqual(str(caught.exception),'SOURCE_READINESS_RESOURCE_INVALID')

    def test_valid_wire_order_whitespace_and_detached_return(self):
        for raw in (FIXTURE,json.dumps(VALUE,sort_keys=True,separators=(',',':')).encode(),
                    (' \n'+json.dumps(VALUE,indent=3)+'\n\t').encode()):
            self.assertEqual(subject.loads_source_readiness(raw),VALUE)
        original = copy.deepcopy(VALUE)
        returned = subject.validate_source_readiness(original)
        original['sources'][0]['blockers'][0] = 'MUTATED INPUT'
        returned['sources'][1]['evidence_urls'].clear()
        self.assertEqual(subject.loads_source_readiness(FIXTURE),VALUE)

    def test_closed_top_level_and_source_members(self):
        for key in VALUE:
            value=copy.deepcopy(VALUE);del value[key]
            with self.subTest(top_missing=key):self.invalid(value)
        class StringSubclass(str): pass
        for key in ('schema','snapshot_commit'):
            value=copy.deepcopy(VALUE);value[key]=StringSubclass(value[key]);self.invalid(value)
        value=copy.deepcopy(VALUE);value['scientific_admission']='ADMITTED';self.invalid(value)
        for key in VALUE['sources'][0]:
            value=copy.deepcopy(VALUE);del value['sources'][0][key]
            with self.subTest(source_missing=key):self.invalid(value)
        value=copy.deepcopy(VALUE);value['sources'][0]['unknown']=None;self.invalid(value)
        value=copy.deepcopy(VALUE);value['sources'].reverse();self.invalid(value)
        for bad in (None,False,[],{},'ready',1):
            with self.subTest(bad=bad):self.invalid(bad)

    def test_forged_status_admission_and_bounded_scalar_values(self):
        for field in ('status','scientific_admission','title','license_declaration'):
            for bad in ('ADMITTED','READY',True,1,None,'',' leading','trailing ','\x00','é','x'*1025):
                value=copy.deepcopy(VALUE);value['sources'][0][field]=bad
                with self.subTest(field=field,bad=str(bad)[:24]):self.invalid(value)
        value=copy.deepcopy(VALUE);value['snapshot_commit']='0'*40;self.invalid(value)
        for bad in ([],['x']*17,[None],['Unknown, therefore ready.']):
            value=copy.deepcopy(VALUE);value['sources'][0]['blockers']=bad;self.invalid(value)

    def test_safe_looking_semantic_rewrites_and_injection_are_rejected(self):
        edits=('All source checks completed successfully.','No outcomes were exposed.',
               '<img src=x onerror="globalThis.__injected=true">',
               'Scientific inference has been established.')
        for text in edits:
            value=copy.deepcopy(VALUE);value['sources'][0]['completed_actions'][0]=text
            with self.subTest(text=text):self.invalid(value)
        prefix='https://github.com/alexwelcing/lupine/blob/'+VALUE['snapshot_commit']+'/discovery/'
        for url in ('javascript:alert(1)','data:text/html,test','https://github.com.evil.invalid/a',
                    'https://github.com@evil.invalid/a',prefix+'../secret',prefix+'reports/other.md',
                    prefix+'reports/a.md?secret=1',prefix+'reports/a.md#x'):
            value=copy.deepcopy(VALUE);value['sources'][0]['evidence_urls']=[url]
            with self.subTest(url=url):self.invalid(value)

    def test_strict_raw_decoder_and_resource_limits(self):
        cases=(b'',b'null',b'{}{}',b'\xff',bytearray(FIXTURE),FIXTURE.decode(),
               b' '*32769,b'['*9+b']'*9,b'{"schema":"x","schema":"y"}',
               b'{"x":NaN}',b'{"x":Infinity}',b'{"x":1e999999}',
               b'{"x":'+b'9'*5000+b'}',b'{"x":"\\ud800"}')
        for raw in cases:
            with self.subTest(raw=repr(raw)[:50]):
                with self.assertRaises(subject.SourceReadinessError) as caught:subject.loads_source_readiness(raw)
                self.assertEqual(caught.exception.code,'SOURCE_READINESS_RESOURCE_INVALID')
        duplicate=FIXTURE.replace(b'"id": "li-tensile-v3"',b'"id": "li-tensile-v3", "id": "li-tensile-v3"',1)
        self.assertNotEqual(duplicate,FIXTURE)
        with self.assertRaises(subject.SourceReadinessError):subject.loads_source_readiness(duplicate)

    def test_loader_reads_only_fixed_resource_bounded_once(self):
        reader=Reader()
        with patch.object(subject,'files',return_value=reader) as located:
            self.assertEqual(subject.load_source_readiness(),VALUE)
        located.assert_called_once_with('lupine_discovery')
        self.assertEqual(reader.requested,[32769])
        reader=Reader(b' '*32769+b'PRIVATE_CANARY')
        with patch.object(subject,'files',return_value=reader):
            result=subject.source_readiness_report()
        self.assertEqual(result['status'],'INVALID')
        self.assertNotIn('PRIVATE_CANARY',json.dumps(result));self.assertEqual(reader.requested,[32769])

    def test_failure_states_no_stale_snapshot_or_exception_text(self):
        for error,status,reason in ((FileNotFoundError('PRIVATE_PATH'),'UNAVAILABLE','MISSING'),
                                   (PermissionError('PRIVATE_PATH'),'UNAVAILABLE','UNREADABLE'),
                                   (OSError('PRIVATE_PATH'),'UNAVAILABLE','UNREADABLE')):
            with patch.object(subject,'files',return_value=Reader()):self.assertEqual(subject.source_readiness_report(),VALUE)
            with patch.object(subject,'files',return_value=Reader(error=error)):
                result=subject.source_readiness_report()
            self.assertEqual(result,{'schema':'lupine.source-readiness.unavailable.v1','status':status,
                'reason':'SOURCE_READINESS_RESOURCE_'+reason,'scientific_admission':'NOT_ADMITTED'})
            self.assertNotIn('sources',result);self.assertNotIn('PRIVATE',json.dumps(result))

    def test_cli_server_object_equality_for_success_and_each_failure(self):
        readers=(Reader(),Reader(error=FileNotFoundError('canary')),Reader(error=PermissionError('canary')),Reader(b'{}'))
        for reader in readers:
            with self.subTest(error=type(reader.error).__name__,raw=reader.raw[:1]):
                stdout=io.StringIO()
                with patch.object(subject,'files',return_value=reader),contextlib.redirect_stdout(stdout):
                    code=cli.main(['source-readiness'])
                cli_value=json.loads(stdout.getvalue())
                self.assertEqual(stdout.getvalue(),json.dumps(cli_value,sort_keys=True,ensure_ascii=True,allow_nan=False,indent=2)+'\n')
                with patch.object(subject,'files',return_value=reader),patch.object(server,'files',return_value=MissingOptional()),patch.object(server,'run_known_answers',return_value={'generated':True}),patch.object(server,'archived_reports',return_value=[]):
                    wire=server.benchmark_report()
                self.assertEqual(wire['source_readiness'],cli_value)
                self.assertEqual(wire['release_status'],'research_preview_not_release_certified')
                self.assertEqual(code,0 if cli_value.get('schema')=='lupine.source-readiness.v1' else 2)
                if code:self.assertNotIn('sources',cli_value)

    def test_cli_output_and_no_source_path_or_retry_option(self):
        with tempfile.TemporaryDirectory() as folder:
            dest=Path(folder)/'report.json'
            with patch.object(subject,'files',return_value=Reader()),contextlib.redirect_stdout(io.StringIO()) as stdout:
                code=cli.main(['source-readiness','--output',str(dest)])
            self.assertEqual(code,0);self.assertEqual(stdout.getvalue(),'');self.assertEqual(json.loads(dest.read_bytes()),VALUE)
        for extra in (['--source','/private'],['--url','https://invalid.invalid/'],['--retry']):
            with patch.object(subject,'files',side_effect=AssertionError('must not read')),contextlib.redirect_stderr(io.StringIO()):
                with self.assertRaises(SystemExit) as caught:cli.main(['source-readiness']+extra)
            self.assertEqual(caught.exception.code,2)

    def test_readiness_claims_remain_blocked_and_exposure_explicit(self):
        self.assertEqual([s['status'] for s in VALUE['sources']],['BLOCKED_SCHEMA','BLOCKED_ACCESS'])
        self.assertTrue(all(s['scientific_admission']=='NOT_ADMITTED' for s in VALUE['sources']))
        li,dryad=VALUE['sources']
        self.assertIn('tensile',li['title']);self.assertNotIn('creep',json.dumps(li).lower())
        self.assertIn('five XML parses started and four completed',json.dumps(li['exposure']))
        self.assertIn('A2: NOT_RUN.',li['unexecuted_actions'])
        self.assertIn('HTTP 403',json.dumps(dryad));self.assertIn('unknown',json.dumps(dryad['blockers']))
        self.assertIn('Archived density-functional perturbation',dryad['data_kind'])
        self.assertIn('Earlier qualitative paper exposure',json.dumps(dryad['exposure']))

if __name__=='__main__':unittest.main(verbosity=2)
