"""Runner tests use only synthetic temporary storage and mocked transport."""
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
SOURCE=Path(os.environ['BAM_RUNNER_PATH'])
spec=importlib.util.spec_from_file_location('independent_bam_runner',SOURCE)
runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner)
FIXED_URL='https://zenodo.org/api/records/17846617/files/2025-12_HT-Tensile-reference-data-CMSX-6_v1.0.xlsx/content'

class SyntheticBlocked(Exception): pass

class Response:
    def __init__(self, body=b'SYNTHETIC_BODY', *, status=200,url=FIXED_URL,encoding=None,fail_after_first=False):
        self.status=status;self.url=url;self.headers={'Content-Type':'application/octet-stream','Content-Length':str(len(body))}
        if encoding:self.headers['Content-Encoding']=encoding
        self.stream=io.BytesIO(body);self.fail_after_first=fail_after_first;self.reads=0;self.read_lengths=[]
    def __enter__(self):return self
    def __exit__(self,*args):return False
    def geturl(self):return self.url
    def read(self,n):
        self.reads+=1;self.read_lengths.append(n)
        if self.fail_after_first and self.reads>1:raise OSError('SYNTHETIC_READ_ERROR_CANARY')
        return self.stream.read(n)

class IndependentRunnerTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(prefix='synthetic-runner-',dir=HERE)
        self.base=Path(self.temp.name)
        marker=self.base/'synthetic-marker';marker.write_bytes(b'fixed synthetic input')
        scope={'frozen_inputs':[{'path':str(marker),'bytes':len(marker.read_bytes()),'sha256':hashlib.sha256(marker.read_bytes()).hexdigest()}]}
        (self.base/'scope.json').write_text(json.dumps(scope))
        self.readermodule=types.ModuleType('workbook_reader')
        self.readermodule.Blocked=SyntheticBlocked
        self.readermodule.fresh_exposure=lambda:{'zip_parse_started':False}
        self.readermodule.inspect_workbook=mock.Mock(return_value=({'status':'WORKBOOK_DOCUMENTARY_PROJECTED'},{'synthetic':'INTERNAL_PROJECTION_CANARY'}))
        self.stack=contextlib.ExitStack()
        self.stack.enter_context(mock.patch.object(runner,'BASE',self.base))
        self.stack.enter_context(mock.patch.object(sys,'argv',['synthetic-runner']))
        self.stack.enter_context(mock.patch.dict(sys.modules,{'workbook_reader':self.readermodule}))
        self.stack.enter_context(mock.patch('socket.socket',side_effect=AssertionError('NETWORK_FORBIDDEN')))
        self.output=io.StringIO();self.stack.enter_context(contextlib.redirect_stdout(self.output))
    def tearDown(self):self.stack.close();self.temp.cleanup()
    def run_with(self,response=None,side_effect=None):
        opener=mock.Mock()
        def open_mock(request,timeout):
            self.assertTrue((self.base/'request-slot.json').exists())
            slot=json.loads((self.base/'request-slot.json').read_text())
            self.assertEqual(slot['status'],'RESERVED_BEFORE_REQUEST')
            self.assertTrue(slot['request_attempt_or_completion_unknown_without_acquisition_receipt'])
            self.assertEqual(request.full_url,FIXED_URL)
            self.assertEqual(request.get_method(),'GET')
            self.assertEqual(request.get_header('Accept-encoding'),'identity')
            self.assertEqual(timeout,30)
            if side_effect:raise side_effect
            return response
        opener.open.side_effect=open_mock
        with mock.patch.object(runner.urllib.request,'build_opener',return_value=opener) as build:
            runner.main()
        self.assertEqual(build.call_count,1)
        self.assertEqual(opener.open.call_count,1)
        return json.loads((self.base/'acquisition.json').read_text()),json.loads((self.base/'result.json').read_text())
    def test_identity_match_only_then_inspection_and_public_canary_exclusion(self):
        body=b'SYNTHETIC_BODY_CANARY'
        with mock.patch.object(runner,'EXPECTED_BYTES',len(body)),mock.patch.object(runner,'EXPECTED_MD5',hashlib.md5(body).hexdigest()):
            receipt,result=self.run_with(Response(body))
        self.assertEqual(receipt['status'],'ACQUIRED_IDENTITY_MATCH')
        self.assertEqual(result['status'],'WORKBOOK_DOCUMENTARY_PROJECTED')
        self.readermodule.inspect_workbook.assert_called_once()
        self.assertNotIn('CANARY',self.output.getvalue())
        self.assertEqual((self.base/'workbook.xlsx').read_bytes(),body)
    def test_source_guard_before_slot_and_transport(self):
        (self.base/'synthetic-marker').write_bytes(b'tampered')
        with mock.patch.object(runner.urllib.request,'build_opener') as build,self.assertRaisesRegex(SystemExit,'FROZEN_INPUT_MISMATCH'):runner.main()
        build.assert_not_called();self.assertFalse((self.base/'request-slot.json').exists())
    def test_reserved_slot_blocks_transport(self):
        (self.base/'request-slot.json').write_text('{}')
        with mock.patch.object(runner.urllib.request,'build_opener') as build,self.assertRaisesRegex(SystemExit,'FIXED_OUTPUT_SLOT_UNAVAILABLE'):runner.main()
        build.assert_not_called()
    def test_interrupt_after_reservation_prevents_second_request(self):
        with self.assertRaises(KeyboardInterrupt):self.run_with(side_effect=KeyboardInterrupt())
        self.assertTrue((self.base/'request-slot.json').exists())
        self.assertFalse((self.base/'acquisition.json').exists())
        with mock.patch.object(runner.urllib.request,'build_opener') as build,self.assertRaisesRegex(SystemExit,'FIXED_OUTPUT_SLOT_UNAVAILABLE'):runner.main()
        build.assert_not_called()
    def test_fsync_failure_prevents_transport_and_reserves_slot(self):
        with mock.patch.object(runner.os,'fsync',side_effect=OSError('synthetic fsync failure')),mock.patch.object(runner.urllib.request,'build_opener') as build,self.assertRaises(OSError):runner.main()
        build.assert_not_called();self.assertTrue((self.base/'request-slot.json').exists())
    def test_fixed_production_constants(self):
        self.assertEqual(runner.URL,FIXED_URL);self.assertEqual(runner.EXPECTED_BYTES,54960)
        self.assertEqual(runner.EXPECTED_MD5,'e85ef58139a68592f36452de195a0a10')
    def test_no_redirect_handler(self):
        self.assertIsNone(runner.NoRedirect().redirect_request(None,None,302,'redirect',{},'https://invalid.example'))
    def test_redirect_http_error_does_not_read_body_or_retry(self):
        errorbody=mock.Mock()
        err=urllib.error.HTTPError(FIXED_URL,302,'redirect',{'Location':'https://invalid.example'},errorbody)
        receipt,result=self.run_with(side_effect=err)
        self.assertEqual(receipt['status'],'BLOCKED_HTTP');self.assertFalse(receipt['error_body_read']);errorbody.read.assert_not_called()
        self.readermodule.inspect_workbook.assert_not_called()
    def test_route_mismatch_before_read(self):
        response=Response(url='https://invalid.example/wrong')
        receipt,result=self.run_with(response)
        self.assertEqual(receipt['reason'],'HTTP_ROUTE_MISMATCH');self.assertEqual(response.reads,0)
        self.readermodule.inspect_workbook.assert_not_called()
    def test_content_encoding_before_read(self):
        response=Response(encoding='gzip');receipt,result=self.run_with(response)
        self.assertEqual(receipt['reason'],'CONTENT_ENCODING');self.assertEqual(response.reads,0)
        self.readermodule.inspect_workbook.assert_not_called()
    def test_partial_read_receipt(self):
        response=Response(b'x'*9000,fail_after_first=True);receipt,result=self.run_with(response)
        self.assertEqual(receipt['status'],'BLOCKED_TRANSPORT_OR_READ');self.assertTrue(receipt['body_read_started']);self.assertFalse(receipt['body_read_completed'])
        self.assertEqual(receipt['retained_partial_bytes'],8192)
        self.assertNotIn('SYNTHETIC_READ_ERROR_CANARY',self.output.getvalue())
        self.readermodule.inspect_workbook.assert_not_called()
    def test_short_body_and_hash_mismatch_block_inspection(self):
        receipt,result=self.run_with(Response(b'wrong'))
        self.assertEqual(receipt['reason'],'BODY_IDENTITY');self.assertTrue(receipt['body_read_completed'])
        self.readermodule.inspect_workbook.assert_not_called()
    def test_oversize_reads_at_most_cap_plus_one(self):
        response=Response(b'x'*60000);receipt,result=self.run_with(response)
        self.assertEqual(receipt['bytes'],54961);self.assertFalse(receipt['body_read_completed'])
        self.assertEqual(response.stream.tell(),54961)
        self.readermodule.inspect_workbook.assert_not_called()
    def test_parser_exception_class_only_no_canary(self):
        body=b'synthetic';self.readermodule.inspect_workbook.side_effect=ValueError('PARSER_SECRET_CANARY')
        with mock.patch.object(runner,'EXPECTED_BYTES',len(body)),mock.patch.object(runner,'EXPECTED_MD5',hashlib.md5(body).hexdigest()):receipt,result=self.run_with(Response(body))
        self.assertEqual(result['reason'],'PARSER_EXCEPTION');self.assertEqual(result['error_type'],'ValueError')
        self.assertNotIn('PARSER_SECRET_CANARY',self.output.getvalue())
        self.assertFalse((self.base/'internal-workbook-projection.json').exists())

if __name__=='__main__':unittest.main(verbosity=2)
