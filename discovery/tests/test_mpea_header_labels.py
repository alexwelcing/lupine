"""Synthetic disclosure and provenance tests; never open the real CSV cache."""
from __future__ import annotations

from contextlib import redirect_stdout
from copy import deepcopy
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import urllib.request
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/mpea_header_labels.py"
spec = importlib.util.spec_from_file_location("mpea_label_producer_tests", SCRIPT)
m = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = m
with patch.object(urllib.request.OpenerDirector, "open", side_effect=AssertionError("network forbidden")):
    spec.loader.exec_module(m)
    p = m.load_parser()


def blob(raw):
    return {"bytes": len(raw), "md5": hashlib.md5(raw).hexdigest(), "sha256": hashlib.sha256(raw).hexdigest()}


def prior(raw):
    return p.inspect_bytes(raw, p.SourceSpec(9, 25797305, "MPEA_dataset.csv", len(raw), hashlib.md5(raw).hexdigest()))["header"]


def inspect(raw, *, header=None, expected=None):
    return m.inspect_fixture(raw, expected_blob=blob(raw) if expected is None else expected,
                             initial_header=prior(raw) if header is None else header)


def reseal(report):
    report.pop("content_sha256", None)
    report["content_sha256"] = m.sha256(m.canonical_bytes(report))
    return report


class MPEAHeaderLabelTests(unittest.TestCase):
    def test_unknown_labels_are_exact_but_body_never_disclosed(self):
        raw = b'DOI," Unknown, label ",FORMULA\nPRIVATE_BODY_881219\xff\x00'
        result = inspect(raw)
        self.assertEqual(result["status"], "BLOCKED_SCHEMA")
        self.assertEqual(result["reason"], "SCHEMA_UNCONFIRMED")
        self.assertEqual(result["header"]["columns"], [
            {"position": 0, "token": "DOI"}, {"position": 1, "token": " Unknown, label "},
            {"position": 2, "token": "FORMULA"}])
        self.assertNotIn("PRIVATE_BODY", json.dumps(result))
        self.assertFalse(result["scope"]["data_rows_decoded"])
        self.assertFalse(result["scope"]["full_schema_established"])

    def test_unicode_quotes_and_embedded_newlines_are_json_escaped(self):
        raw = '\ufeffDOI,"⛄\r\nname""quoted",FORMULA\r\n\udcff'.encode('utf-8',errors='surrogateescape')
        result = inspect(raw)
        rendered = m.canonical_bytes(result)
        self.assertTrue(result["header"]["bom"])
        self.assertEqual(result["header"]["terminator"], "CRLF")
        self.assertEqual(result["header"]["columns"][1]["token"], '⛄\r\nname"quoted')
        self.assertNotIn('⛄'.encode(), rendered)
        self.assertIn(b'\\u26c4\\r\\nname\\"quoted', rendered)
        self.assertEqual(json.loads(rendered), result)

    def test_body_change_only_changes_whole_identity(self):
        left = inspect(b'DOI,unknown\n10,PRIVATE_BODY_A')
        right = inspect(b'DOI,unknown\n\xff\x00PRIVATE_BODY_B')
        self.assertEqual(left["header"], right["header"])
        self.assertEqual(left["scope"], right["scope"])
        self.assertNotEqual(left["observed"], right["observed"])

    def test_byte_md5_sha_mismatches_fail_before_header_scan(self):
        raw = b'DOI,unknown\nPRIVATE_BODY'
        header = prior(b'DOI,unknown\n')
        for key, replacement in (("bytes", len(raw)+1), ("md5", "0"*32), ("sha256", "0"*64)):
            expected = blob(raw)
            expected[key] = replacement
            with self.subTest(key=key), patch.object(p, "scan_header", side_effect=AssertionError("no scan")) as scan, \
                 patch.object(m, "load_parser", return_value=p):
                result = m.inspect_fixture(raw, expected_blob=expected, initial_header=header)
            scan.assert_not_called()
            self.assertEqual(result["status"], "BLOCKED_SOURCE")
            self.assertIsNone(result["header"])
            self.assertFalse(result["scope"]["header_decode_attempted"])

    def test_redacted_layout_count_known_positions_and_framing_are_bound(self):
        raw = b'DOI,unknown,FORMULA\nPRIVATE_BODY'
        header = prior(raw)
        mutations = []
        count = deepcopy(header)
        count['columns'].append({'position':3,'status':'UNKNOWN_COLUMN','token':None})
        count['column_count'] = 4
        mutations.append(count)
        position = deepcopy(header)
        position['columns'][0]['token'] = 'YS (MPa)'
        mutations.append(position)
        framing = deepcopy(header)
        framing['terminator'] = 'CRLF'
        mutations.append(framing)
        bom = deepcopy(header)
        bom['bom'] = True
        mutations.append(bom)
        for mutated in mutations:
            result = inspect(raw, header=mutated)
            self.assertEqual(result['reason'], 'INITIAL_HEADER_MISMATCH')
            self.assertIsNone(result['header'])
            self.assertNotIn('PRIVATE_BODY', json.dumps(result))

    def test_malformed_header_cannot_return_partial_labels(self):
        expected_header = prior(b'DOI,unknown\n')
        for raw in (b'DOI,"unterminated\nPRIVATE_BODY', b'DOI,DOI\n', b'DOI,\xff\n', b'DOI,""\n'):
            with self.subTest(length=len(raw)):
                result = inspect(raw, header=expected_header)
                self.assertEqual(result['status'], 'BLOCKED_HEADER')
                self.assertIsNone(result['header'])
                self.assertFalse(result['scope']['first_record_labels_disclosed'])

    def test_original_parser_caps_are_retained(self):
        at_limit = 'DOI,' + 'λ' * 256 + '\n'
        self.assertEqual(inspect(at_limit.encode())['status'], 'BLOCKED_SCHEMA')
        over = ('DOI,' + 'λ' * 257 + '\n').encode()
        result = inspect(over, header=prior(at_limit.encode()))
        self.assertEqual(result['reason'], 'HEADER_LIMIT')
        self.assertIsNone(result['header'])

    def test_fixture_helper_refuses_actual_whole_source_identity(self):
        with self.assertRaisesRegex(m.DisclosureError, 'SOURCE_IDENTITY_CONFLICT'):
            m.inspect_fixture(b'DOI\n', expected_blob={'bytes':m.SOURCE_BYTES,'md5':m.SOURCE_MD5,
                                                       'sha256':m.SOURCE_SHA256}, initial_header=m._initial_header())

    def test_no_network_during_parser_import_or_fixture_execution(self):
        with patch.object(urllib.request.OpenerDirector, 'open', side_effect=AssertionError('network forbidden')) as network:
            result = inspect(b'DOI,unknown\n\xff')
        network.assert_not_called()
        self.assertEqual(result['status'], 'BLOCKED_SCHEMA')

    def test_production_checkpoint_fails_before_parser_or_cache_open(self):
        with patch.object(m, '__file__', str(m.ROOT/'.cache/fixture-source.py')), \
             patch.object(m, 'load_parser', side_effect=AssertionError('no parser before gate')) as loader:
            with self.assertRaisesRegex(m.DisclosureError, 'FROZEN_SOURCE_REQUIRED'):
                m.disclose_cache()
        loader.assert_not_called()

    def test_initial_receipt_failure_precedes_cache_open(self):
        with patch.object(m, 'frozen_source_identity', return_value={}), patch.object(m, 'load_parser', return_value=p), \
             patch.object(m, 'verify_initial_receipts', side_effect=m.DisclosureError('INITIAL_RECEIPT_CONFLICT')), \
             patch.object(p, 'cache_root', side_effect=AssertionError('no cache')) as cache:
            with self.assertRaisesRegex(m.DisclosureError, 'INITIAL_RECEIPT_CONFLICT'):
                m.disclose_cache()
        cache.assert_not_called()

    def test_initial_receipt_capture_is_hashed_before_decode_and_validated(self):
        implementation = {'mode':'committed_source','commit':m.ORIGINAL_COMMIT,'files':m.ORIGINAL_FILES}
        captured = {}
        for action, relative in zip(('acquire','header'),m.RECEIPTS):
            record = p._base(None,p.SOURCE,implementation,action)
            record.update(observed=m._reference()['expected_blob'],source_verified=True)
            record['scope']['dataset_bytes_acquired'] = True
            if action == 'acquire':
                record.update(status='CAPTURED',reason='CAPTURE_VERIFIED')
            else:
                record.update(status='BLOCKED_SCHEMA',reason='SCHEMA_UNCONFIRMED',header=m._initial_header())
                record['scope']['header_decode_attempted'] = True
            raw = p.canonical_bytes(p._seal(record,p.SOURCE))
            self.assertEqual(m.sha256(raw),m.RECEIPTS[relative])
            captured[relative] = raw
        def read(path,*args,**kwargs):return captured[str(path.relative_to(m.ROOT))]
        with patch.object(m,'_bounded_file',side_effect=read) as reader:
            self.assertEqual(m.verify_initial_receipts(p),m._reference())
        self.assertEqual(reader.call_count,2)
        with patch.object(m,'_bounded_file',return_value=b'PRIVATE_CHANGED_RECEIPT'), \
             patch.object(m.json,'loads',side_effect=AssertionError('no decode')) as decode:
            with self.assertRaisesRegex(m.DisclosureError,'INITIAL_RECEIPT_CONFLICT'):
                m.verify_initial_receipts(p)
        decode.assert_not_called()

    def test_cache_replacement_after_capture_does_not_change_decoded_header(self):
        raw=b'DOI,original-label\nPRIVATE_BODY'
        reference=m._reference()
        reference.update(expected_blob=blob(raw),initial_header=prior(raw),initial_receipt_sha256=None)
        identity={'mode':'synthetic_fixture','commit':None,'files':{}}
        with tempfile.TemporaryDirectory() as directory:
            cache=Path(directory)
            path=cache/'synthetic.csv'
            path.write_bytes(raw)
            scan=p.scan_header
            def replace(captured):
                path.write_bytes(b'DOI,replacement-label\nPRIVATE_REPLACEMENT')
                self.assertEqual(captured,raw)
                return scan(captured)
            with patch.object(m,'frozen_source_identity',return_value=identity), \
                 patch.object(m,'load_parser',return_value=p),patch.object(m,'verify_initial_receipts',return_value=reference), \
                 patch.object(p,'cache_root',return_value=cache),patch.object(p,'_object_path',return_value=path), \
                 patch.object(p,'scan_header',side_effect=replace):
                report=m.disclose_cache()
            self.assertIn(b'replacement-label',path.read_bytes())
        self.assertEqual(report['observed'],blob(raw))
        self.assertEqual(report['header']['columns'][1]['token'],'original-label')
        self.assertNotIn('replacement-label',json.dumps(report))

    def test_import_hash_precedes_compile_and_compiles_captured_bytes(self):
        with patch.object(m, '_bounded_file', return_value=b'PRIVATE_CHANGED_SOURCE'), \
             patch.object(m, 'compile', side_effect=AssertionError('no compilation'), create=True) as compiler:
            with self.assertRaisesRegex(m.DisclosureError, 'PARSER_IDENTITY_CONFLICT'):
                m.load_parser()
        compiler.assert_not_called()
        raw = (m.ROOT/'scripts/mpea_custody.py').read_bytes()
        original_compile = compile
        captured = []
        def capture(source, path, mode):
            captured.append(source)
            return original_compile(source,path,mode)
        with patch.object(m, '_bounded_file', return_value=raw) as reader, patch.object(m, 'compile', side_effect=capture, create=True):
            parser = m.load_parser()
        reader.assert_called_once()
        self.assertEqual(captured, [raw])
        self.assertEqual(parser.MAX_COLUMNS,128)

    def test_closed_receipt_rejects_resealed_claims_and_hidden_fields(self):
        original = inspect(b'DOI,unknown\nPRIVATE_BODY')
        changes = [lambda x:x.update(status='COMPLETE_SCHEMA'),
                   lambda x:x['scope'].update(full_schema_established=True),
                   lambda x:x['scope'].update(fits=True),
                   lambda x:x['scope'].update(row_count=1),
                   lambda x:x['header']['columns'][0].update(position=False),
                   lambda x:x['header']['columns'][0].update(private='PRIVATE_BODY'),
                   lambda x:x['reference'].update(extra='PRIVATE_BODY'),
                   lambda x:x['parser_profile'].update(max_columns=True),
                   lambda x:x['implementation'].update(private='PRIVATE_BODY')]
        for change in changes:
            forged=deepcopy(original)
            change(forged)
            with self.assertRaisesRegex(m.DisclosureError,'PUBLIC_SCHEMA_INVALID'):
                m.validate_public_report(reseal(forged))

    def test_sink_revalidation_no_overwrite_or_symlink(self):
        report=inspect(b'DOI,unknown\nPRIVATE_BODY')
        with tempfile.TemporaryDirectory() as directory:
            output=Path(directory)/'receipt.json'
            m.write_public(report,output)
            before=output.read_bytes()
            m.write_public(report,output)
            self.assertEqual(before,output.read_bytes())
            forged=deepcopy(report)
            forged['scope']['data_rows_decoded']=True
            with self.assertRaisesRegex(m.DisclosureError,'PUBLIC_SCHEMA_INVALID'):
                m.write_public(reseal(forged),output)
            output.write_bytes(b'PRESERVE')
            with self.assertRaisesRegex(m.DisclosureError,'PUBLIC_OUTPUT_CONFLICT'):
                m.write_public(report,output)
            self.assertEqual(output.read_bytes(),b'PRESERVE')
            link=Path(directory)/'link.json'
            link.symlink_to(output)
            with self.assertRaisesRegex(m.DisclosureError,'PUBLIC_OUTPUT_CONFLICT'):
                m.write_public(report,link)

    def test_clean_commit_provenance_and_dirty_rejection_on_synthetic_repo(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)/'discovery'
            root.mkdir()
            (root/'AGENTS.md').write_text('synthetic fixture\n')
            for relative in m.FROZEN_PATHS:
                path=root/relative
                path.parent.mkdir(parents=True,exist_ok=True)
                path.write_text('synthetic '+relative+'\n')
            originals={key:m.sha256((root/key).read_bytes()) for key in m.ORIGINAL_FILES}
            receipts={key:m.sha256((root/key).read_bytes()) for key in m.RECEIPTS}
            def git(*args):return subprocess.run(['git',*args],cwd=root,check=True,capture_output=True).stdout
            git('init','-q')
            git('add','.')
            git('-c','user.name=Custody Test','-c','user.email=test@example.invalid','commit','-qm','synthetic')
            with patch.object(m,'ROOT',root),patch.object(m,'__file__',str(root/m.NEW_PATHS[0])), \
                 patch.object(m,'ORIGINAL_FILES',originals),patch.object(m,'RECEIPTS',receipts):
                identity=m.frozen_source_identity()
                self.assertEqual(identity['commit'],git('rev-parse','HEAD').decode().strip())
                self.assertEqual(set(identity['files']),set(m.FROZEN_PATHS))
                (root/m.NEW_PATHS[-1]).write_text('changed amendment\n')
                with self.assertRaisesRegex(m.DisclosureError,'FROZEN_SOURCE_REQUIRED'):
                    m.frozen_source_identity()

    def test_cli_failure_never_prints_exception_content(self):
        stdout=io.StringIO()
        with redirect_stdout(stdout),patch.object(m,'disclose_cache',side_effect=OSError('PRIVATE_BODY')):
            code=m.main(['--output','synthetic-not-created.json'])
        self.assertEqual(code,2)
        self.assertEqual(json.loads(stdout.getvalue()),{'status':'BLOCKED','reason':'INTERNAL_FAILURE'})
        self.assertNotIn('PRIVATE_BODY',stdout.getvalue())


if __name__=='__main__':
    unittest.main()
