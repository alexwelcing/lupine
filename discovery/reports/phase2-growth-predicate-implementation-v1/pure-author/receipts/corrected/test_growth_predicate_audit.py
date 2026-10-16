"""Packed generated fixtures only; closed category/order and safe dependency challenges."""
from contextlib import ExitStack
import hashlib
import importlib.util
import json
from pathlib import Path
import socket
import struct
import sys
import unittest
from unittest.mock import patch
import zipfile

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('growth_predicate_candidate', HERE / 'growth_predicate_audit.py')
M = importlib.util.module_from_spec(spec)
spec.loader.exec_module(M)
NAMES = ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels']
CANARY = b'PRIVATE_OUTCOME_984273'


def shape(initial=0, padding=b'\x00\x00'):
    body = struct.pack('<HH', 0xA028, initial) + padding
    return struct.pack('<HH', 0xA220, len(body)) + body


def packed(entries=None, *, gap=b'', tail=b'', end_override=None):
    entries = [{} for _ in NAMES] if entries is None else entries
    local, central = bytearray(gap), bytearray()
    positions = []
    for i, entry in enumerate(entries):
        name = entry.get('name', NAMES[i % len(NAMES)]).encode('cp437')
        body = CANARY
        extra = entry.get('extra', shape() if i == 0 else b'')
        offset = len(local)
        positions.append(offset)
        l = [b'PK\x03\x04', 20, 0, 0, 0, 33, 42, len(body), len(body), len(name), len(extra)]
        c = [b'PK\x01\x02', 20, 20, 0, 0, 0, 33, 42, len(body), len(body), len(name), 0, 0, 0, 0, 0, offset]
        for field, value in entry.get('l', {}).items():
            l[field] = value
        for field, value in entry.get('c', {}).items():
            c[field] = value
        local += struct.pack('<4s5H3L2H', *l) + entry.get('local_name', name) + extra + body
        central += struct.pack('<4s6H3L5H2L', *c) + name + entry.get('central_extra', b'') + entry.get('central_comment', b'')
    local += tail
    e = [b'PK\x05\x06', 0, 0, len(entries), len(entries), len(central), len(local), 0]
    for field, value in (end_override or {}).items():
        e[field] = value
    return bytes(local + central + struct.pack('<4s4H2LH', *e)), positions


def oracle(raw):
    report = M.G31._new_report(raw, True, {'mode': 'synthetic_fixture'})
    holder = []
    try:
        M.G31._growth_zip_structure(raw, report['exposure'], holder)
        return 'HEADER_PROFILE_ACCEPTED'
    except (M.G31.CustodyError, M.G31.GrowthEnvelopeError) as error:
        return str(error)
    finally:
        for archive in holder:
            archive.close()


class AuditTests(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        for target, attr in ((socket, 'socket'), (socket, 'getaddrinfo'), (zipfile.ZipFile, 'open'),
                             (M.G31.custody, '_xml'), (M.G31.custody, '_read_relative'),
                             (M.G31, 'production_context'), (M.G31.growth, 'production_context')):
            self.stack.enter_context(patch.object(target, attr, side_effect=AssertionError('FORBIDDEN_PRIVATE_OPERATION')))

    def check(self, raw, category=None):
        report = M.inspect_synthetic_headers(raw)
        self.assertEqual(report['first_rejection']['g31_reason'], oracle(raw))
        if category:
            self.assertEqual(report['first_rejection']['category'], category)
        self.assertFalse(report['archive_accepted'])
        self.assertEqual(report['status'], 'BLOCKED_SCHEMA')
        self.assertEqual(report['fits'], 0)
        self.assertEqual(report['splits'], 0)
        self.assertIsNone(report['scientific_counts'])
        serialized = json.dumps(report)
        for canary in [CANARY.decode(), *NAMES, 'FORBIDDEN_PRIVATE_OPERATION']:
            self.assertNotIn(canary, serialized)
        self.assertLess(len(serialized.encode()), M.MAX_RECEIPT)
        for exposure in (report['exposure'], report['aggregate_exposure']):
            for field in ('member_opens', 'decompressed_bytes', 'xml_parses', 'worksheet_decodes', 'shared_string_decodes', 'formula_evaluations'):
                self.assertEqual(exposure[field], 0)
        self.assertEqual(set(report['families']), set(M.FAMILIES))
        return report

    def test_header_valid_never_opens_member(self):
        report = self.check(packed()[0], 'HEADER_PROFILE_ACCEPTED')
        self.assertTrue(report['diagnostic_complete'])
        self.assertEqual(report['aggregate_status'], 'ALL_APPLICABLE_CHECKS_PASS')
        self.assertTrue(report['exposure']['archive_close_completed'])

    def test_eocd_order_and_bounds(self):
        self.check(b'abc', 'HEADER_TOO_SHORT')
        for field, value, category in [(0, b'FAIL', 'END_SIGNATURE'), (1, 1, 'END_DISK'),
                (2, 1, 'DIRECTORY_DISK'), (7, 1, 'END_COMMENT'),
                (3, 3, 'END_ENTRY_COUNT'), (6, 0, 'DIRECTORY_END_ALIGNMENT')]:
            with self.subTest(category=category):
                self.check(packed(end_override={field: value})[0], category)
        self.check(packed(entries=[])[0], 'MEMBER_LIMIT')

    def test_path_and_kind(self):
        for name, expected in [('../private', 'MEMBER_PATH_PROFILE'), ('unknown.xml', 'MEMBER_KIND_PROFILE'),
                               ('/x', 'MEMBER_PATH_PROFILE'), ('x%20', 'MEMBER_PATH_PROFILE')]:
            with self.subTest(name=name):
                self.check(packed([{'name': name}, {}, {}, {}])[0], expected)

    def test_duplicate_name(self):
        self.check(packed([{}, {'name': NAMES[0]}, {}, {}])[0], 'MEMBER_NAME_DUPLICATE')

    def test_central_predicates(self):
        cases = [(3, 1, 'MEMBER_FLAGS'), (4, 12, 'MEMBER_COMPRESSION'), (2, 21, 'MEMBER_VERSION'),
                 (15, 0xA000 << 16, 'MEMBER_FILE_TYPE'), (15, 0x10, 'MEMBER_DIRECTORY_ATTRIBUTE'),
                 (9, 123, 'STORED_SIZE_MISMATCH'), (16, 1, 'LOCAL_OFFSET_LAYOUT')]
        for field, value, category in cases:
            with self.subTest(category=category):
                self.check(packed([{'c': {field: value}}, {}, {}, {}])[0], category)

    def test_central_extra_comment_preflight(self):
        for entry, category in [({'central_extra': b'1234', 'c': {11: 4}}, 'CENTRAL_EXTRA_PRESENT'),
                                ({'central_comment': b'a', 'c': {12: 1}}, 'CENTRAL_COMMENT_PRESENT')]:
            r = self.check(packed([entry, {}, {}, {}])[0], category)
            self.assertEqual(r['families'][category]['status'], 'FAILURES_AND_INCOMPLETE')
            self.assertFalse(r['exposure']['archive_open_started'])

    def test_local_predicates(self):
        cases = [(0, b'FAIL', 'LOCAL_SIGNATURE'), (1, 21, 'LOCAL_VERSION_AGREEMENT'),
                 (2, 8, 'LOCAL_FLAGS_AGREEMENT'), (4, 1, 'LOCAL_TIME_AGREEMENT'),
                 (5, 34, 'LOCAL_DATE_AGREEMENT'), (3, 8, 'LOCAL_METHOD_AGREEMENT'),
                 (6, 13, 'LOCAL_CRC_AGREEMENT'), (7, 1, 'LOCAL_COMPRESSED_SIZE_AGREEMENT'),
                 (8, 1, 'LOCAL_UNCOMPRESSED_SIZE_AGREEMENT')]
        for field, value, category in cases:
            with self.subTest(category=category):
                self.check(packed([{'l': {field: value}}, {}, {}, {}])[0], category)
        self.check(packed([{'local_name': b'x' * len(NAMES[0])}, {}, {}, {}])[0], 'LOCAL_NAME_AGREEMENT')
        self.check(packed([{'l': {10: 65535}}, {}, {}, {}])[0], 'MEMBER_DATA_BOUNDS')

    def test_growth_categories_and_order(self):
        cases = [(b'x', 'LOCAL_EXTRA_DECLARED_SPAN_AGREEMENT'),
                 (struct.pack('<HH', 7, 1) + b'x', 'LOCAL_EXTRA_SINGLE_A220'),
                 (struct.pack('<HH', 0xA220, 1) + b'x', 'LOCAL_GROWTH_PAYLOAD_MINIMUM'),
                 (struct.pack('<HH', 0xA220, 9) + b'1234', 'LOCAL_EXTRA_DECLARED_SPAN_AGREEMENT'),
                 (struct.pack('<HHHH', 0xA220, 4, 1, 7), 'LOCAL_GROWTH_SIGNATURE'),
                 (shape(padding=b'\x00x'), 'LOCAL_GROWTH_ZERO_PADDING')]
        for extra, category in cases:
            with self.subTest(category=category):
                self.check(packed([{'extra': extra}, {}, {}, {}])[0], category)

    def test_initial_padding_is_unbound(self):
        for initial in (0, 1, 7, 65535):
            r = self.check(packed([{'extra': shape(initial)}, {}, {}, {}])[0], 'HEADER_PROFILE_ACCEPTED')
            self.assertEqual(r['initial_padding_semantics'], 'UNBOUND')

    def test_later_independent_faults(self):
        r = self.check(packed([{'c': {3: 1}}, {}, {'l': {6: 43}}, {'extra': shape(padding=b'x')}])[0], 'MEMBER_FLAGS')
        for family in ('MEMBER_FLAGS', 'LOCAL_CRC_AGREEMENT', 'LOCAL_GROWTH_ZERO_PADDING'):
            self.assertEqual(r['families'][family]['status'], 'FAILURES_OBSERVED')
        self.assertTrue(r['aggregate_exposure']['aggregate_traversal_completed'])

    def test_duplicate_offset_skips_ambiguous_local_but_later_independent_fault(self):
        r = self.check(packed([{}, {'c': {16: 0}}, {'l': {6: 43}}, {}])[0], 'LOCAL_OFFSET_LAYOUT')
        self.assertIn('NOT_CHECKED_AMBIGUOUS_ASSOCIATION', r['families']['LOCAL_SIGNATURE']['dependencies'])
        self.assertEqual(r['families']['LOCAL_CRC_AGREEMENT']['status'], 'FAILURES_AND_INCOMPLETE')
        self.assertFalse(r['diagnostic_complete'])

    def test_uint_offset_no_speculative_reads(self):
        r = self.check(packed([{'c': {16: 0xFFFFFFFF}}, {}, {}, {}])[0], 'LOCAL_OFFSET_LAYOUT')
        self.assertTrue(r['families']['LOCAL_SIGNATURE']['partial'])
        self.assertLess(r['aggregate_exposure']['aggregate_fixed_local_headers_interpreted'], 4)

    def test_overlap_keeps_central_checks(self):
        r = self.check(packed([{}, {'c': {16: 5, 3: 1}}, {}, {}])[0], 'MEMBER_FLAGS')
        self.assertEqual(r['families']['MEMBER_FLAGS']['status'], 'FAILURES_OBSERVED')
        self.assertTrue(r['families']['LOCAL_SIGNATURE']['partial'])
        self.assertEqual(r['aggregate_exposure']['aggregate_fixed_local_headers_interpreted'], 2)

    def test_directory_totals(self):
        self.check(packed(tail=b'x')[0], 'LOCAL_DIRECTORY_ALIGNMENT')
        self.check(packed([{}, {}, {}])[0], 'REQUIRED_MEMBERS_ABSENT')

    def test_preliminary_scope_is_explicit(self):
        r = M.inspect_synthetic_headers(packed()[0], selected_growth=True)
        self.assertEqual(r['scope'], 'G29_G30_AND_G31_HEADERS')
        self.assertEqual(r['first_rejection']['category'], 'HEADER_PROFILE_ACCEPTED')
        self.assertEqual(r['selected_growth']['reason'], 'GROWTH_HINT_SHAPE_MATCH')

    def test_unreached_header_stage_flags(self):
        r = M.inspect_synthetic_headers(b'abc', selected_growth=True)
        self.assertFalse(r['exposure']['header_checks_started'])
        self.assertFalse(r['aggregate_exposure']['header_checks_started'])
        r = self.check(packed(end_override={1: 1})[0], 'END_DISK')
        self.assertTrue(r['exposure']['header_checks_started'])
        self.assertFalse(r['aggregate_exposure']['header_checks_started'])

    def test_read_fixed_fields_survive_later_extent_ambiguity(self):
        r = self.check(packed([{'l': {7: len(CANARY) + 1}}, {}, {}, {}])[0], 'LOCAL_COMPRESSED_SIZE_AGREEMENT')
        self.assertTrue(r['families']['LOCAL_COMPRESSED_SIZE_AGREEMENT']['status'].startswith('FAILURES'))
        r = self.check(packed([{'l': {10: 65535}}, {}, {}, {}])[0], 'MEMBER_DATA_BOUNDS')
        self.assertTrue(r['families']['MEMBER_DATA_BOUNDS']['status'].startswith('FAILURES'))
        self.assertTrue(r['families']['LOCAL_GROWTH_SIGNATURE']['partial'])

    def test_bad_signature_blocks_variable_interpretation(self):
        r = self.check(packed([{'l': {0: b'FAIL'}}, {}, {}, {}])[0], 'LOCAL_SIGNATURE')
        self.assertIn('NOT_CHECKED_EARLIER_PARSE_BLOCK', r['families']['LOCAL_NAME_AGREEMENT']['dependencies'])
        self.assertIn('NOT_CHECKED_EARLIER_PARSE_BLOCK', r['families']['LOCAL_GROWTH_SIGNATURE']['dependencies'])
        self.assertEqual(r['aggregate_exposure']['local_growth_fixed_words_interpreted'], 0)


    def test_wrong_outer_id_blocks_payload_interpretation(self):
        extra = struct.pack('<HHHH', 7, 4, 0xA028, 0)
        r = self.check(packed([{'extra': extra}, {}, {}, {}])[0], 'LOCAL_EXTRA_SINGLE_A220')
        self.assertEqual(r['families']['LOCAL_EXTRA_SINGLE_A220']['status'], 'FAILURES_OBSERVED')
        self.assertIn('NOT_CHECKED_EARLIER_PARSE_BLOCK', r['families']['LOCAL_GROWTH_SIGNATURE']['dependencies'])
        self.assertIn('NOT_CHECKED_EARLIER_PARSE_BLOCK', r['families']['LOCAL_GROWTH_ZERO_PADDING']['dependencies'])
        self.assertEqual(r['aggregate_exposure']['local_growth_fixed_words_interpreted'], 0)


    def test_reject_types_limits_and_known_identity(self):
        for raw in (bytearray(b'a'), 'a', b'x' * (M.MAX_BYTES + 1)):
            with self.assertRaises(ValueError):
                M.inspect_synthetic_headers(raw)
        with patch.object(M.hashlib, 'sha256') as digest:
            digest.return_value.hexdigest.return_value = M.G31.header_diagnostic.OBJECT_SHA256
            with self.assertRaisesRegex(ValueError, 'SYNTHETIC_REAL_SOURCE_FORBIDDEN'):
                M.inspect_synthetic_headers(b'generated')

    def test_cleanup_failure_preserves_primary(self):
        raw = packed([{'c': {3: 1}}, {}, {}, {}])[0]
        with patch.object(zipfile.ZipFile, 'close', side_effect=RuntimeError('PRIVATE_CLOSE_ERROR')):
            r = M.inspect_synthetic_headers(raw)
        self.assertEqual(r['first_rejection']['category'], 'MEMBER_FLAGS')
        self.assertEqual(r['exposure']['archive_close_error'], 'ARCHIVE_CLOSE_FAILED')
        self.assertFalse(r['diagnostic_complete'])
        self.assertNotIn('PRIVATE_CLOSE_ERROR', json.dumps(r))


if __name__ == '__main__':
    unittest.main(verbosity=2)
