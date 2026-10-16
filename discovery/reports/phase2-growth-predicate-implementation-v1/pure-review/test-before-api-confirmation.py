"""Independent generated ZIP checks. Never invokes a production reader/guard."""
from contextlib import ExitStack
from copy import deepcopy
import importlib.util
import json
import os
from pathlib import Path
import socket
import struct
import subprocess
import sys
import unittest
from unittest.mock import patch
import zipfile

from generated_zip import baseline, entry, growth_extra, pack, REQUIRED, CANARY

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
import li_v3_growth_envelope as original
candidate_path = Path(os.environ['PREDICATE_CANDIDATE'])
spec = importlib.util.spec_from_file_location('reviewed_growth_predicate', candidate_path)
candidate = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = candidate
spec.loader.exec_module(candidate)

FAILURE_STATUSES = {'FAILURES_OBSERVED', 'FAILURES_AND_INCOMPLETE'}
DEPENDENCIES = {'CHECKED', 'NOT_CHECKED_UNSAFE_BOUNDS',
                'NOT_CHECKED_AMBIGUOUS_ASSOCIATION', 'NOT_CHECKED_EARLIER_PARSE_BLOCK',
                'NOT_APPLICABLE'}
STATUSES = FAILURE_STATUSES | {'ALL_APPLICABLE_CHECKS_PASS',
                             'INCOMPLETE_NO_FAILURE_OBSERVED', 'NOT_APPLICABLE'}

class PredicateReview(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.events = []
        def forbidden(*args, **kwargs):
            self.events.append('forbidden_scope')
            raise AssertionError('PRIVATE_EXCEPTION_CANARY_DO_NOT_PRINT')
        self.stack.enter_context(patch.object(original.custody, '_xml', forbidden))
        self.stack.enter_context(patch.object(original, 'production_context', forbidden))
        self.stack.enter_context(patch.object(original.growth, 'production_context', forbidden))
        self.stack.enter_context(patch.object(subprocess, 'run', forbidden))
        self.stack.enter_context(patch.object(socket, 'socket', forbidden))
        for name in ('open', 'read', 'extract', 'extractall', 'testzip'):
            self.stack.enter_context(patch.object(zipfile.ZipFile, name, forbidden))

    def tearDown(self):
        self.assertEqual(self.events, [], 'Forbidden scope was attempted')

    def oracle(self, raw):
        report = original._new_report(raw, True, {'mode':'synthetic_fixture', 'commit':None,'files':{}})
        holder = []
        try:
            original._growth_zip_structure(raw, report['exposure'], holder)
            return None
        except (original.CustodyError, original.GrowthEnvelopeError) as exc:
            return str(exc)
        finally:
            for archive in holder:
                archive.close()

    def inspect(self, raw, *, selected_growth=False):
        result = candidate.inspect_synthetic_headers(raw, selected_growth=selected_growth)
        self.assertEqual(result['status'], 'BLOCKED_SCHEMA')
        self.assertIs(result['archive_accepted'], False)
        self.assertIsNone(result['scientific_counts'])
        self.assertEqual(result['fits'], 0)
        self.assertEqual(result['splits'], 0)
        self.assertLessEqual(len(json.dumps(result).encode()), 65536)
        serial = json.dumps(result)
        for canary in (CANARY.decode(), 'PRIVATE_EXCEPTION_CANARY_DO_NOT_PRINT',
                       'OPAQUE_NAME_CANARY_1729', 'OPAQUE_EXTRA_CANARY_1729'):
            self.assertNotIn(canary, serial)
        for name, item in result['families'].items():
            self.assertIn(item['status'], STATUSES, name)
            self.assertLessEqual(set(item['dependencies']), DEPENDENCIES, name)
        return result

    def same_oracle(self, raw, result):
        self.assertEqual(result['first_rejection']['g31_reason'], self.oracle(raw))

    def family_fails(self, result, name):
        self.assertIn(result['families'][name]['status'], FAILURE_STATUSES, name)

    def test_header_valid_baseline_is_not_archive_or_science_acceptance(self):
        raw, _ = pack(baseline())
        result = self.inspect(raw)
        self.assertEqual(result['scope'], 'G31_HEADERS_ONLY')
        self.same_oracle(raw, result)
        self.assertIsNone(result['first_rejection']['g31_reason'])
        for family, item in result['families'].items():
            self.assertNotIn(item['status'], FAILURE_STATUSES, family)
            self.assertFalse(item['partial'], family)

    def test_exact_central_predicate_order_and_single_faults(self):
        changes = [
            ('MEMBER_FLAGS', {'flags':1}),
            ('MEMBER_COMPRESSION', {'method':12}),
            ('MEMBER_VERSION', {'version':21}),
            ('MEMBER_FILE_TYPE', {'external':0o120777 << 16}),
            ('MEMBER_DIRECTORY_ATTRIBUTE', {'external':0x10}),
            ('STORED_SIZE_MISMATCH', {'size':len(CANARY)+1}),
            ('LOCAL_OFFSET_LAYOUT', {'offset':1}),
        ]
        for expected, change in changes:
            with self.subTest(expected=expected):
                rows=baseline(); rows[0]['central'].update(change)
                raw,_=pack(rows); result=self.inspect(raw)
                self.assertEqual(result['first_rejection']['category'],expected)
                self.same_oracle(raw,result); self.family_fails(result,expected)
        rows=baseline(); rows[0]['central'].update(flags=1,method=12,version=21,external=0x10)
        raw,_=pack(rows); result=self.inspect(raw)
        self.assertEqual(result['first_rejection']['category'],'MEMBER_FLAGS')
        self.same_oracle(raw,result)
        for name in ('MEMBER_FLAGS','MEMBER_COMPRESSION','MEMBER_VERSION','MEMBER_DIRECTORY_ATTRIBUTE'):
            self.family_fails(result,name)

    def test_exact_local_predicate_order_and_single_faults(self):
        changes=[('LOCAL_SIGNATURE',{'signature':b'NOPE'}),
                 ('LOCAL_VERSION_AGREEMENT',{'version':21}),
                 ('LOCAL_FLAGS_AGREEMENT',{'flags':2}),
                 ('LOCAL_TIME_AGREEMENT',{'time':1}),
                 ('LOCAL_DATE_AGREEMENT',{'date':34}),
                 ('LOCAL_METHOD_AGREEMENT',{'method':8}),
                 ('LOCAL_CRC_AGREEMENT',{'crc':9}),
                 ('LOCAL_COMPRESSED_SIZE_AGREEMENT',{'compressed':len(CANARY)+1}),
                 ('LOCAL_UNCOMPRESSED_SIZE_AGREEMENT',{'size':len(CANARY)+1}),
                 ('LOCAL_NAME_AGREEMENT',{'name':b'XContent_Types].xml'}),
                 ('MEMBER_DATA_BOUNDS',{'extra_length':65535})]
        for expected,change in changes:
            with self.subTest(expected=expected):
                rows=baseline(); rows[0]['local'].update(change)
                raw,_=pack(rows); result=self.inspect(raw)
                self.assertEqual(result['first_rejection']['category'],expected)
                self.same_oracle(raw,result); self.family_fails(result,expected)
        rows=baseline();rows[0]['local'].update(version=21,crc=7,method=8)
        raw,_=pack(rows);result=self.inspect(raw)
        self.assertEqual(result['first_rejection']['category'],'LOCAL_VERSION_AGREEMENT')
        self.same_oracle(raw,result)
        for name in ('LOCAL_VERSION_AGREEMENT','LOCAL_CRC_AGREEMENT','LOCAL_METHOD_AGREEMENT'):
            self.family_fails(result,name)

    def test_name_and_member_kind_order(self):
        cases=[(b'../OPAQUE_NAME_CANARY_1729','MEMBER_PATH_PROFILE'),
               (b'OPAQUE_NAME_CANARY_1729','MEMBER_KIND_PROFILE')]
        for name,expected in cases:
            with self.subTest(expected=expected):
                rows=baseline();rows[0]['name']=name
                raw,_=pack(rows);result=self.inspect(raw)
                self.assertEqual(result['first_rejection']['category'],expected)
                self.same_oracle(raw,result);self.family_fails(result,expected)
        rows=baseline();rows[1]['name']=rows[0]['name']
        raw,_=pack(rows);result=self.inspect(raw)
        self.assertEqual(result['first_rejection']['category'],'MEMBER_NAME_DUPLICATE')
        self.same_oracle(raw,result);self.family_fails(result,'MEMBER_NAME_DUPLICATE')

    def test_early_local_and_late_central_faults_both_observed(self):
        rows=baseline();rows[0]['local']['crc']=1;rows[-1]['central']['version']=21
        raw,_=pack(rows);result=self.inspect(raw)
        self.assertEqual(result['first_rejection']['category'],'LOCAL_CRC_AGREEMENT')
        self.family_fails(result,'LOCAL_CRC_AGREEMENT')
        self.family_fails(result,'MEMBER_VERSION');self.same_oracle(raw,result)

    def test_unsafe_name_does_not_hide_later_safe_metadata(self):
        rows=baseline();rows[0]['name']=b'../OPAQUE_NAME_CANARY_1729'
        rows[-1]['central']['external']=0x10
        raw,_=pack(rows);result=self.inspect(raw)
        self.assertEqual(result['first_rejection']['category'],'MEMBER_PATH_PROFILE')
        self.family_fails(result,'MEMBER_DIRECTORY_ATTRIBUTE');self.same_oracle(raw,result)

    def test_duplicate_local_offsets_are_not_successful_association(self):
        rows=baseline();rows[1]['central']['offset']=0;rows[-1]['local']['version']=21
        raw,_=pack(rows);result=self.inspect(raw)
        self.same_oracle(raw,result);self.family_fails(result,'LOCAL_OFFSET_LAYOUT')
        family=result['families']['LOCAL_SIGNATURE']
        self.assertTrue(family['partial'])
        self.assertIn('NOT_CHECKED_AMBIGUOUS_ASSOCIATION',family['dependencies'])
        self.assertNotEqual(family['status'],'ALL_APPLICABLE_CHECKS_PASS')
        self.family_fails(result,'LOCAL_VERSION_AGREEMENT')

    def test_overlap_stops_ambiguous_local_reads_but_keeps_later_entry(self):
        rows=baseline(); enlarged=len(CANARY)+8
        rows[0]['local'].update(compressed=enlarged,size=enlarged)
        rows[0]['central'].update(compressed=enlarged,size=enlarged)
        rows[-1]['local']['date']=34
        raw,_=pack(rows);result=self.inspect(raw)
        self.same_oracle(raw,result);self.family_fails(result,'LOCAL_OFFSET_LAYOUT')
        self.assertTrue(result['families']['LOCAL_SIGNATURE']['partial'])
        self.family_fails(result,'LOCAL_DATE_AGREEMENT')

    def test_out_of_range_offset_and_unsigned_extreme_are_incomplete(self):
        for offset in (0xffffffff,0xfffffffe):
            with self.subTest(offset=offset):
                rows=baseline();rows[-1]['central']['offset']=offset
                raw,_=pack(rows);result=self.inspect(raw);self.same_oracle(raw,result)
                self.family_fails(result,'LOCAL_OFFSET_LAYOUT')
                signature=result['families']['LOCAL_SIGNATURE']
                self.assertTrue(signature['partial'])
                self.assertIn('NOT_CHECKED_UNSAFE_BOUNDS',signature['dependencies'])

    def test_local_variable_span_overflow_does_not_interpret_growth(self):
        rows=baseline();rows[-1]['local']['extra_length']=65535
        raw,_=pack(rows);result=self.inspect(raw);self.same_oracle(raw,result)
        self.family_fails(result,'MEMBER_DATA_BOUNDS')
        family=result['families']['LOCAL_EXTRA_SINGLE_A220']
        self.assertTrue(family['partial'])
        self.assertIn('NOT_CHECKED_UNSAFE_BOUNDS',family['dependencies'])

    def test_raw_central_extra_comment_and_bad_signature_stop_framing(self):
        for change in ({'extra':b'OPAQUE_EXTRA_CANARY_1729'},
                       {'comment':b'OPAQUE_EXTRA_CANARY_1729'},
                       {'signature':b'NOPE'}, {'name_length':65535}):
            with self.subTest(change=tuple(change)):
                rows=baseline();rows[-1]['central'].update(change)
                raw,_=pack(rows);result=self.inspect(raw);self.same_oracle(raw,result)
                self.assertEqual(result['first_rejection']['g31_reason'],
                                 'CENTRAL_DIRECTORY_DECLARATION_INVALID')
                self.assertNotEqual(result['families']['LOCAL_SIGNATURE']['status'],
                                    'ALL_APPLICABLE_CHECKS_PASS')

    def test_final_alignment_and_missing_required_members(self):
        raw,_=pack(baseline(),gap=b'GAP')
        result=self.inspect(raw);self.same_oracle(raw,result)
        self.assertEqual(result['first_rejection']['category'],'LOCAL_DIRECTORY_ALIGNMENT')
        self.family_fails(result,'LOCAL_DIRECTORY_ALIGNMENT')
        rows=baseline();del rows[2]
        raw,_=pack(rows);result=self.inspect(raw);self.same_oracle(raw,result)
        self.assertEqual(result['first_rejection']['category'],'REQUIRED_MEMBERS_ABSENT')
        self.family_fails(result,'REQUIRED_MEMBERS_ABSENT')

    def test_growth_signature_and_padding_failures_preserve_later_checks(self):
        cases=[('LOCAL_GROWTH_SIGNATURE',growth_extra(signature=0xA029)),
               ('LOCAL_GROWTH_ZERO_PADDING',growth_extra(padding=b'\0x\0')),
               ('LOCAL_EXTRA_SINGLE_A220',growth_extra(identifier=0xCAFE))]
        for expected,extra in cases:
            with self.subTest(expected=expected):
                rows=baseline();rows[0]['extra']=extra;rows[-1]['central']['flags']=1
                raw,_=pack(rows);result=self.inspect(raw);self.same_oracle(raw,result)
                self.assertEqual(result['first_rejection']['category'],expected)
                self.family_fails(result,expected);self.family_fails(result,'MEMBER_FLAGS')

    def test_withheld_padding_word_and_body_content_do_not_change_categories(self):
        projections=[]
        for word in (0,1,32767,32768,65535):
            rows=baseline();rows[0]['extra']=growth_extra(padval=word)
            rows[-1]['body']=bytes([word%256])*len(CANARY)
            raw,_=pack(rows);result=self.inspect(raw)
            projections.append({key:result[key] for key in
                                ('first_rejection','families','scope','status','archive_accepted')})
        self.assertTrue(all(item==projections[0] for item in projections))

    def test_multiple_early_and_late_faults_keep_original_first_order(self):
        rows=baseline();rows[0]['central']['flags']=1
        rows[1]['local']['crc']=7;rows[-1]['local']['time']=1
        raw,_=pack(rows);result=self.inspect(raw);self.same_oracle(raw,result)
        self.assertEqual(result['first_rejection']['category'],'MEMBER_FLAGS')
        for name in ('MEMBER_FLAGS','LOCAL_CRC_AGREEMENT','LOCAL_TIME_AGREEMENT'):
            self.family_fails(result,name)

    def test_ordered_directory_entries_do_not_assume_central_storage_order(self):
        rows=baseline();rows[1]['local']['crc']=11;rows[-1]['central']['version']=21
        raw,_=pack(rows,central_order=list(reversed(range(len(rows)))))
        result=self.inspect(raw);self.same_oracle(raw,result)
        self.assertEqual(result['first_rejection']['category'],'LOCAL_CRC_AGREEMENT')
        self.family_fails(result,'MEMBER_VERSION')

if __name__=='__main__':
    unittest.main(verbosity=2)
