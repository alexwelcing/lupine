"""Synthetic storage and transport only; no NIST/empirical source request."""
import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest import mock
import urllib.error

HERE=Path(__file__).resolve().parent
SOURCE=Path(os.environ['NIST_RUNNER_PATH'])
FIXED_URLS=[('section5','https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-5-combined-standard-uncertainty'),('section6','https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-6-expanded-uncertainty')]
def load_runner():
    spec=importlib.util.spec_from_file_location('independent_nist_runner',SOURCE)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
runner=load_runner()
class SyntheticBlocked(Exception):pass
class Response:
    def __init__(self,url,body=b'<p>Synthetic</p>',content_type='text/html; charset=UTF-8',encoding=None,partial_error=False):
        self.status=200;self.url=url;self.stream=io.BytesIO(body);self.reads=0;self.partial_error=partial_error
        self.headers={'Content-Type':content_type}
        if encoding:self.headers['Content-Encoding']=encoding
    def geturl(self):return self.url
    def __enter__(self):return self
    def __exit__(self,*args):return False
    def read(self,n):
        self.reads+=1
        if self.partial_error and self.reads>1:raise OSError('PARTIAL_ERROR_CANARY')
        return self.stream.read(min(n,3) if self.partial_error else n)

class IndependentRunnerTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(prefix='synthetic-',dir=HERE);self.base=Path(self.temp.name)
        marker=self.base/'marker';marker.write_bytes(b'synthetic frozen source')
        (self.base/'scope.json').write_text(json.dumps({'frozen_inputs':[{'path':'marker','bytes':len(marker.read_bytes()),'sha256':hashlib.sha256(marker.read_bytes()).hexdigest()}]}))
        self.parser=types.ModuleType('html_projection');self.parser.MAX_BYTES=64;self.parser.Blocked=SyntheticBlocked
        self.parser.project=mock.Mock(return_value={'title':'Synthetic','blocks':[{'text':'INTERNAL_PROJECTION_CANARY'}]})
        self.stack=contextlib.ExitStack();self.stack.enter_context(mock.patch.object(runner,'BASE',self.base));self.stack.enter_context(mock.patch.object(sys,'argv',['synthetic']))
        self.stack.enter_context(mock.patch.dict(sys.modules,{'html_projection':self.parser}));self.stack.enter_context(mock.patch('socket.socket',side_effect=AssertionError('NETWORK_FORBIDDEN')))
        self.output=io.StringIO();self.stack.enter_context(contextlib.redirect_stdout(self.output))
    def tearDown(self):self.stack.close();self.temp.cleanup()
    def invoke(self,responses):
        opener=mock.Mock();pending=iter(responses);calls=[]
        def mocked_open(request,timeout):
            slot=json.loads((self.base/'request-slot.json').read_text());self.assertEqual(slot['maximum_requests'],2);self.assertTrue(slot['reservation_does_not_prove_attempt'])
            self.assertEqual(request.full_url,FIXED_URLS[len(calls)][1]);self.assertEqual(request.get_method(),'GET');self.assertEqual(request.get_header('Accept-encoding'),'identity');self.assertEqual(timeout,30)
            calls.append(request.full_url);item=next(pending)
            if isinstance(item,BaseException):raise item
            return item
        opener.open.side_effect=mocked_open
        with mock.patch.object(runner.urllib.request,'build_opener',return_value=opener):runner.main()
        result=json.loads((self.base/'operation.json').read_text());self.assertEqual(len(calls),result['attempted_requests']);return result,calls
    def test_two_fixed_requests_success(self):
        result,calls=self.invoke([Response(u) for _,u in FIXED_URLS])
        self.assertEqual(calls,[u for _,u in FIXED_URLS]);self.assertEqual(result['unattempted_scoped_sources'],[])
        self.assertEqual(self.parser.project.call_count,2);self.assertNotIn('INTERNAL_PROJECTION_CANARY',self.output.getvalue())
        for item in result['results']:self.assertTrue(item['decode_completed']);self.assertTrue(item['parse_completed'])
    def test_frozen_urls_and_no_redirect(self):
        self.assertEqual(runner.URLS,FIXED_URLS);self.assertIsNone(runner.NoRedirect().redirect_request(None,None,302,'redirect',{},'https://invalid.example'))
    def test_first_http_failure_stops_second(self):
        stream=mock.Mock();error=urllib.error.HTTPError(FIXED_URLS[0][1],403,'blocked',{},stream)
        result,calls=self.invoke([error]);self.assertEqual(len(calls),1);self.assertEqual(result['unattempted_scoped_sources'],['section6']);stream.read.assert_not_called();self.parser.project.assert_not_called()
    def test_redirect_failure_stops_without_body_read(self):
        stream=mock.Mock();error=urllib.error.HTTPError(FIXED_URLS[0][1],302,'redirect',{'Location':'https://invalid.example'},stream)
        result,calls=self.invoke([error]);self.assertEqual(result['results'][0]['status'],'BLOCKED_HTTP');self.assertTrue(result['results'][0]['redirect_location_present']);stream.read.assert_not_called()
    def test_route_mismatch_no_body(self):
        response=Response('https://invalid.example/wrong');result,_=self.invoke([response]);self.assertEqual(response.reads,0);self.assertEqual(result['results'][0]['reason'],'HTTP_ROUTE')
    def test_content_gate_no_body(self):
        response=Response(FIXED_URLS[0][1],encoding='gzip');result,_=self.invoke([response]);self.assertEqual(response.reads,0);self.assertEqual(result['results'][0]['reason'],'CONTENT_TYPE_OR_ENCODING')
    def test_utf8_failure_honest_stages(self):
        result,_=self.invoke([Response(FIXED_URLS[0][1],body=b'\xff')]);receipt=result['results'][0]
        self.assertEqual(receipt['reason'],'UTF8_DECODE');self.assertTrue(receipt['decode_started']);self.assertFalse(receipt['decode_completed']);self.assertFalse(receipt['parse_started']);self.parser.project.assert_not_called()
    def test_nul_failure_before_parse(self):
        result,_=self.invoke([Response(FIXED_URLS[0][1],body=b'<\x00p\x00>')]);receipt=result['results'][0]
        self.assertEqual(receipt['reason'],'TEXT_ENCODING');self.assertTrue(receipt['decode_completed']);self.assertFalse(receipt['parse_started']);self.parser.project.assert_not_called()
    def test_parser_failure_stops_and_no_exception_canary(self):
        self.parser.project.side_effect=ValueError('PARSER_ERROR_CANARY');result,_=self.invoke([Response(FIXED_URLS[0][1])]);receipt=result['results'][0]
        self.assertEqual(receipt['reason'],'UNCLASSIFIED_EXCEPTION');self.assertTrue(receipt['parse_started']);self.assertFalse(receipt['parse_completed']);self.assertNotIn('PARSER_ERROR_CANARY',self.output.getvalue());self.assertEqual(result['unattempted_scoped_sources'],['section6'])
    def test_read_cap_and_retention(self):
        response=Response(FIXED_URLS[0][1],body=b'x'*100);result,_=self.invoke([response]);receipt=result['results'][0]
        self.assertEqual(receipt['bytes'],65);self.assertEqual(response.stream.tell(),65);self.assertEqual(receipt['reason'],'BODY_SIZE');self.assertFalse(receipt['body_read_completed']);self.assertFalse(receipt['decode_started'])
    def test_partial_read_retained(self):
        result,_=self.invoke([Response(FIXED_URLS[0][1],body=b'abcdefghi',partial_error=True)]);receipt=result['results'][0]
        self.assertEqual(receipt['retained_partial_bytes'],3);self.assertFalse(receipt['body_read_completed']);self.assertTrue(receipt['possible_partial_body_read']);self.assertNotIn('PARTIAL_ERROR_CANARY',self.output.getvalue())
    def test_interrupt_reserves_slot_and_reinvoke_blocks(self):
        with self.assertRaises(KeyboardInterrupt):self.invoke([KeyboardInterrupt()])
        self.assertTrue((self.base/'request-slot.json').exists())
        with mock.patch.object(runner.urllib.request,'build_opener') as build,self.assertRaisesRegex(SystemExit,'REQUEST_SLOT_UNAVAILABLE'):runner.main()
        build.assert_not_called()
    def test_fsync_failure_no_transport(self):
        with mock.patch.object(runner.os,'fsync',side_effect=OSError('fsync')),mock.patch.object(runner.urllib.request,'build_opener') as build,self.assertRaises(OSError):runner.main()
        build.assert_not_called();self.assertTrue((self.base/'request-slot.json').exists())
    def test_parser_import_after_guard_including_module_load(self):
        trap=types.ModuleType('html_projection')
        trap.__getattr__=lambda name:(_ for _ in ()).throw(AssertionError('PARSER_IMPORTED_BEFORE_GUARD'))
        (self.base/'marker').write_bytes(b'changed')
        with mock.patch.dict(sys.modules,{'html_projection':trap}),mock.patch.object(runner.urllib.request,'build_opener') as build:
            module=load_runner();module.BASE=self.base
            with self.assertRaisesRegex(SystemExit,'FROZEN_INPUT_MISMATCH'):module.main()
        build.assert_not_called();self.assertFalse((self.base/'request-slot.json').exists())

if __name__=='__main__':unittest.main(verbosity=2)
