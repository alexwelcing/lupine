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

ROOT = next(p for p in Path(__file__).absolute().parents
            if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
CANDIDATE = '.cache' in Path(__file__).parts
SOURCE = ROOT / ('.cache/phase2-growth-predicate-production-v1/promotion/scripts/li_v3_growth_predicate_audit.py'
                 if CANDIDATE else 'scripts/li_v3_growth_predicate_audit.py')
spec = importlib.util.spec_from_file_location('growth_predicate_production_author', SOURCE)
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


    def test_incoming_overlap_blocks_even_outgoing_owner(self):
        r = self.check(packed([{'l': {10: len(shape()) + 5}},
                               {'l': {10: 5, 6: 19}}, {}, {}])[0], 'LOCAL_EXTRA_DECLARED_SPAN_AGREEMENT')
        self.assertEqual(r['families']['LOCAL_CRC_AGREEMENT']['status'], 'INCOMPLETE_NO_FAILURE_OBSERVED')
        self.assertIn('NOT_CHECKED_AMBIGUOUS_ASSOCIATION', r['families']['LOCAL_CRC_AGREEMENT']['dependencies'])


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



from copy import deepcopy
import os
import tempfile
from types import SimpleNamespace


def prior_identity(commit='a' * 40):
    return {'mode': 'committed_source', 'commit': commit,
            **{key: dict(value) for key, value in M.PRIOR_GROUPS.items()}}


def current_identity(commit='a' * 40):
    return {'mode': 'committed_source', 'commit': commit,
            'files': {path: '0' * 64 for path in M.FROZEN_PATHS},
            **{('growth_envelope_files' if key == 'files' else key): dict(value)
               for key, value in M.PRIOR_GROUPS.items()}}


def prerequisite():
    report = M.G31._new_report(b'', False, prior_identity(M.PREREQUISITE_PRODUCER))
    report.update(source_identity_verified=True, engineering_status='BLOCKED_LAYOUT',
                  reason='ZIP_LAYOUT_UNSUPPORTED')
    e = report['exposure']
    for key in ('raw_buffer_read_started', 'raw_buffer_read_completed', 'target_bearing_source_bytes_read',
                'central_directory_preflight_started', 'central_directory_preflight_completed',
                'archive_open_started', 'archive_open_completed', 'directory_name_decoding_started',
                'directory_name_decoding_completed', 'header_checks_started', 'archive_close_started',
                'archive_close_completed'):
        e[key] = True
    for key in ('local_extra_areas_completed', 'local_growth_fixed_words_interpreted',
                'local_growth_padding_scans_started', 'local_growth_padding_scans_completed'):
        e[key] = 3
    return M.custody.canonical(report)


class ProductionTests(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack(); self.addCleanup(self.stack.close)
        self.temp = self.stack.enter_context(tempfile.TemporaryDirectory())
        self.root = Path(self.temp) / 'discovery'; self.root.mkdir()
        self.output = self.root / 'output'; self.output.mkdir()
        self.prior = prerequisite()
        self.identity = current_identity()
        self.raw = packed([{'extra': shape(padding=b'\x00' * 512)} for _ in range(3)] + [{'c': {3: 1}}])[0]
        self.reads = []; self.seen = []
        self.contexts = []
        self.stack.enter_context(patch.object(M, 'ROOT', self.root))
        self.stack.enter_context(patch.object(M.custody, 'ROOT', self.root))
        self.stack.enter_context(patch.object(M, 'production_context', self.context))
        self.stack.enter_context(patch.object(M, 'PREREQUISITE_SHA256', hashlib.sha256(self.prior).hexdigest()))
        self.stack.enter_context(patch.object(M.custody, '_output_directory', lambda path: os.open(self.output, os.O_RDONLY | os.O_DIRECTORY)))
        self.stack.enter_context(patch.object(M.custody, '_read_relative', self.read))
        self.stack.enter_context(patch.object(M.G31.header_diagnostic, '_validate_capture', lambda raw: self.assertEqual(raw, b'GENERATED_CAPTURE')))
        self.stack.enter_context(patch.object(M.custody, '_verify_source', self.verify))
        for target, attr in ((socket, 'socket'), (socket, 'getaddrinfo'), (zipfile.ZipFile, 'open'), (M.G31.custody, '_xml')):
            self.stack.enter_context(patch.object(target, attr, side_effect=AssertionError('FORBIDDEN_PRIVATE_OPERATION')))

    def context(self):
        self.contexts.append(True)
        return deepcopy(self.identity)

    def read(self, path, cap):
        self.reads.append(path)
        if path == M.PREREQUISITE:
            return self.prior
        if path == M.custody.CAPTURE:
            return b'GENERATED_CAPTURE'
        if path == M.custody.OBJECT:
            self.assertEqual(cap, M.MAX_BYTES)
            return self.raw
        raise AssertionError('unexpected generated read')

    def verify(self, raw, expected):
        self.assertIs(raw, self.raw); self.seen.append(id(raw))
        self.assertEqual(expected, M.G31.header_diagnostic.OBJECT_SHA256)
        return {'bytes': len(raw), 'md5': hashlib.md5(raw).hexdigest(), 'sha256': hashlib.sha256(raw).hexdigest()}

    def run_audit(self):
        report = M.audit('1')
        self.assertNotIn(CANARY.decode(), json.dumps(report))
        self.assertLessEqual(len(M.custody.canonical(report)), M.MAX_RECEIPT)
        self.assertFalse(report['archive_accepted'])
        self.assertEqual(report['fits'], 0); self.assertEqual(report['splits'], 0)
        return report

    def test_generated_success_exact_pure_projection_and_single_buffer(self):
        expected = M.inspect_synthetic_headers(self.raw, selected_growth=True)
        original_selected, original_classify, original_aggregate = M.G31._selected_growth, M._classify, M._aggregate
        def selected(raw, report):
            self.assertIs(raw, self.raw); self.seen.append(id(raw)); return original_selected(raw, report)
        def classify(raw, report, **kwargs):
            self.assertIs(raw, self.raw); self.seen.append(id(raw)); return original_classify(raw, report, **kwargs)
        def aggregate(raw, *args):
            self.assertIs(raw, self.raw); self.seen.append(id(raw)); return original_aggregate(raw, *args)
        with patch.object(M.G31, '_selected_growth', selected), patch.object(M, '_classify', classify), patch.object(M, '_aggregate', aggregate):
            report = self.run_audit()
        self.assertEqual(report['status'], 'BLOCKED_SCHEMA')
        self.assertEqual(report['reason'], 'HEADER_PREDICATE_AUDIT_COMPLETE')
        self.assertEqual(report['first_rejection']['category'], 'MEMBER_FLAGS')
        self.assertEqual(self.reads.count(M.custody.OBJECT), 1)
        self.assertEqual(len(self.contexts), 3)
        self.assertEqual(self.seen, [id(self.raw)] * 4)
        self.assertEqual((self.output / 'public.json').read_bytes(), M.custody.canonical(report))
        self.assertTrue((self.output / 'reservation.json').is_file())
        projected = {key: value for key, value in report.items() if key in expected}
        projected['schema'] = expected['schema']; projected['synthetic_fixture'] = True
        self.assertEqual(projected, expected)

    def test_expected_predecessor_gate_before_aggregate(self):
        self.raw = packed([{'extra': shape(padding=b'\x00' * 512)} for _ in range(3)] + [{}])[0]
        with patch.object(M, '_aggregate', side_effect=AssertionError('must not aggregate unexpected pass')):
            report = self.run_audit()
        self.assertEqual(report['reason'], 'G31_PREDECESSOR_MISMATCH')
        self.assertEqual(report['first_rejection']['category'], 'HEADER_PROFILE_ACCEPTED')
        self.assertFalse(report['aggregate_exposure']['aggregate_traversal_started'])
        self.assertFalse((self.output / 'public.json').exists())

    def test_exact_completed_area_progress_is_required(self):
        self.raw = packed([{'extra': shape(padding=b'\x00' * 512)}, {}, {}, {'c': {3: 1}}])[0]
        report = self.run_audit()
        self.assertEqual(report['reason'], 'G31_PREDECESSOR_MISMATCH')
        self.assertEqual(report['exposure']['local_extra_areas_completed'], 1)
        self.assertFalse(report['aggregate_exposure']['aggregate_traversal_started'])

    def test_first_guard_failure_before_cache(self):
        with patch.object(M, 'production_context', side_effect=M.custody.CustodyError('FROZEN_SOURCE_REQUIRED')):
            report = self.run_audit()
        self.assertEqual(report['reason'], 'FROZEN_SOURCE_REQUIRED')
        self.assertEqual(self.reads, [])
        self.assertFalse(report['operation_exposure']['reservation_created'])

    def test_context_drift_before_target_and_before_output(self):
        for ordinal in (2, 3):
            with self.subTest(ordinal=ordinal):
                self.reads.clear(); self.contexts.clear()
                for p in self.output.iterdir(): p.unlink()
                counter = []
                def drift():
                    counter.append(True)
                    return current_identity('b' * 40 if len(counter) == ordinal else 'a' * 40)
                with patch.object(M, 'production_context', drift):
                    report = self.run_audit()
                self.assertEqual(report['reason'], 'SOURCE_CONTEXT_CHANGED')
                self.assertEqual(self.reads.count(M.custody.OBJECT), 0 if ordinal == 2 else 1)
                self.assertFalse((self.output / 'public.json').exists())

    def test_wrong_prerequisite_producer_before_target(self):
        value = json.loads(self.prior); value['implementation']['commit'] = 'f' * 40
        self.prior = M.custody.canonical(value)
        with patch.object(M, 'PREREQUISITE_SHA256', hashlib.sha256(self.prior).hexdigest()):
            report = self.run_audit()
        self.assertEqual(report['reason'], 'G31_PREREQUISITE_INVALID')
        self.assertNotIn(M.custody.OBJECT, self.reads)

    def test_changed_prerequisite_bytes_before_capture(self):
        self.prior += b'\n'
        report = self.run_audit()
        self.assertEqual(report['reason'], 'G31_PREREQUISITE_INVALID')
        self.assertEqual(self.reads, [M.PREREQUISITE])

    def test_capture_failure_before_target(self):
        with patch.object(M.G31.header_diagnostic, '_validate_capture', side_effect=M.custody.CustodyError('CAPTURE_RECEIPT_INVALID')):
            report = self.run_audit()
        self.assertEqual(report['reason'], 'CAPTURE_RECEIPT_INVALID')
        self.assertNotIn(M.custody.OBJECT, self.reads)

    def test_partial_read_exposure_and_reserved_failure(self):
        original = self.read
        def read(path, cap):
            if path == M.custody.OBJECT:
                self.reads.append(path); raise M.custody.CustodyError('FILE_READ_FAILED')
            return original(path, cap)
        with patch.object(M.custody, '_read_relative', read):
            report = self.run_audit()
        self.assertEqual(report['reason'], 'FILE_READ_FAILED')
        self.assertTrue(report['operation_exposure']['raw_buffer_read_started'])
        self.assertFalse(report['operation_exposure']['raw_buffer_read_completed'])
        self.assertIsNone(report['operation_exposure']['target_bearing_source_bytes_read'])
        self.assertTrue((self.output / 'reservation.json').exists())
        reads = list(self.reads)
        self.assertEqual(self.run_audit()['reason'], 'OUTPUT_CONFLICT')
        self.assertEqual(self.reads, reads)

    def test_source_digest_failure_retains_read(self):
        with patch.object(M.custody, '_verify_source', side_effect=M.custody.CustodyError('SOURCE_SHA256_MISMATCH')):
            report = self.run_audit()
        self.assertEqual(report['reason'], 'SOURCE_SHA256_MISMATCH')
        self.assertTrue(report['operation_exposure']['raw_buffer_read_completed'])
        self.assertFalse(report['source_identity_verified'])
        self.assertFalse(report['exposure']['header_checks_started'])

    def test_repeated_completed_slot_stops_before_target(self):
        self.run_audit(); reads = list(self.reads)
        report = self.run_audit()
        self.assertEqual(report['reason'], 'OUTPUT_CONFLICT')
        self.assertEqual(self.reads, reads)

    def test_public_symlink_stops_before_cache(self):
        target = self.root / 'untouched'; target.write_bytes(b'original')
        (self.output / 'public.json').symlink_to(target)
        report = self.run_audit()
        self.assertEqual(report['reason'], 'OUTPUT_CONFLICT')
        self.assertEqual(self.reads, [])
        self.assertEqual(target.read_bytes(), b'original')

    def test_partial_reservation_stays_consumed_and_exposed(self):
        original = M.custody._write_at
        def write(fd, name, raw):
            original(fd, name, b'partial')
            raise M.custody.CustodyError('FILE_WRITE_FAILED')
        with patch.object(M.custody, '_write_at', write):
            report = self.run_audit()
        self.assertEqual(report['reason'], 'FILE_WRITE_FAILED')
        self.assertTrue(report['operation_exposure']['reservation_write_attempted'])
        self.assertTrue(report['operation_exposure']['reservation_may_exist'])
        self.assertFalse(report['operation_exposure']['reservation_created'])
        self.assertEqual(self.reads, [])
        self.assertEqual(self.run_audit()['reason'], 'OUTPUT_CONFLICT')
        self.assertEqual(self.reads, [])


    def test_partial_public_write_preserves_facts(self):
        original = M.custody._write_at
        def write(fd, name, raw):
            if name == 'public.json':
                original(fd, name, b'partial'); raise M.custody.CustodyError('FILE_WRITE_FAILED')
            original(fd, name, raw)
        with patch.object(M.custody, '_write_at', write):
            report = self.run_audit()
        self.assertEqual(report['reason'], 'FILE_WRITE_FAILED')
        self.assertTrue(report['source_identity_verified'])
        self.assertEqual(report['first_rejection']['category'], 'MEMBER_FLAGS')
        self.assertTrue(report['operation_exposure']['output_write_attempted'])
        self.assertTrue(report['operation_exposure']['output_may_exist'])
        self.assertEqual((self.output / 'public.json').read_bytes(), b'partial')

    def test_owned_archive_cleanup_preserves_primary(self):
        original = zipfile.ZipFile.close; counter = []
        def close(archive):
            if archive.fp is None: return
            counter.append(True)
            if len(counter) == 2: raise RuntimeError('PRIVATE_CLEANUP_ERROR')
            return original(archive)
        with patch.object(zipfile.ZipFile, 'close', close):
            report = self.run_audit()
        self.assertEqual(report['reason'], 'ARCHIVE_CLOSE_FAILED')
        self.assertEqual(report['first_rejection']['category'], 'MEMBER_FLAGS')
        self.assertFalse(report['diagnostic_complete'])
        self.assertNotIn('PRIVATE_CLEANUP_ERROR', json.dumps(report))

    def test_closed_identity_rejects_oversized_untrusted_context(self):
        self.identity['arbitrary'] = 'PRIVATE_CONTEXT' * 10000
        report = self.run_audit()
        self.assertEqual(report['reason'], 'FROZEN_SOURCE_REQUIRED')
        self.assertIsNone(report['implementation'])
        self.assertEqual(self.reads, [])

    def test_public_cap_is_enforced(self):
        with self.assertRaisesRegex(M.AuditError, 'PUBLIC_RECEIPT_LIMIT'):
            M._canonical_public({'x': 'a' * M.MAX_RECEIPT})

    def test_bad_run_never_calls_guard(self):
        for run in ('../1', 1, '', None):
            report = M.audit(run)
            self.assertEqual(report['reason'], 'CLI_ARGUMENT_INVALID')
        self.assertEqual(self.contexts, []); self.assertEqual(self.reads, [])


class ContextTests(unittest.TestCase):
    def test_generated_worktree_index_head_and_prior_guards(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / 'discovery'; root.mkdir()
            files = {path: ('GENERATED_' + path).encode() for path in M.FROZEN_PATHS}
            cases = [None, 'worktree', 'index', 'head', 'prior']
            for case in cases:
                with self.subTest(case=case):
                    reads = []
                    def read(path, cap):
                        self.assertIn(path, files); reads.append(path)
                        return files[path] + (b'changed' if case == 'worktree' else b'')
                    def git(args, **kwargs):
                        self.assertEqual(kwargs['cwd'], root)
                        if args[1:] == ['rev-parse', '--show-prefix']: raw = b''
                        elif args[1:] == ['rev-parse', 'HEAD']: raw = (('b' if case == 'head' else 'a') * 40).encode()
                        elif args[1] == 'show':
                            reference = args[2]; path = reference.split(':', 1)[1]
                            raw = files[path] + (b'changed' if case == 'index' and reference.startswith(':') else b'')
                        else: raise AssertionError('unexpected generated git command')
                        return SimpleNamespace(stdout=raw)
                    prior = prior_identity()
                    if case == 'prior': prior['files'] = {}
                    with patch.object(M, 'ROOT', root), patch.object(M, '__file__', str(root / M.FROZEN_PATHS[0])), patch.object(M.G31, 'production_context', return_value=prior), patch.object(M.custody, '_read_relative', read), patch.object(M.subprocess, 'run', git):
                        if case is None:
                            identity = M.production_context()
                            self.assertEqual(identity['files'], {p: hashlib.sha256(v).hexdigest() for p,v in files.items()})
                        else:
                            with self.assertRaisesRegex(M.custody.CustodyError, 'FROZEN_SOURCE_REQUIRED'):
                                M.production_context()
                    self.assertTrue(set(reads).issubset(M.FROZEN_PATHS))


if __name__ == '__main__':
    unittest.main(verbosity=2)
