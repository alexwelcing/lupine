"""Synthetic-only ZIP diagnostic tests. Never read the captured object."""
from contextlib import ExitStack, redirect_stdout
from copy import deepcopy
import importlib.util
import io
import json
from pathlib import Path
import socket
import stat
import struct
import unittest
from unittest.mock import patch
import warnings
import zipfile

HERE = Path(__file__).resolve().parent
SCRIPT = HERE.parent / 'scripts/li_v3_zip_diagnostic.py'
spec = importlib.util.spec_from_file_location('li_zip_diagnostic_author', SCRIPT)
M = importlib.util.module_from_spec(spec)
spec.loader.exec_module(M)
CANARY = b'SEALED_NUMERIC_OUTCOME_CANARY_99217'


def fixture(*, extra=b'', comment=b'', name=None, kind=None, compression=zipfile.ZIP_STORED, omit=False):
    stream = io.BytesIO()
    names = list(M.custody.ENVELOPE_MEMBERS)
    if omit:
        names.pop()
    if name is not None:
        names.append(name)
    with warnings.catch_warnings():
        warnings.simplefilter('ignore', UserWarning)
        with zipfile.ZipFile(stream, 'w', compression=compression) as archive:
            for index, member in enumerate(names):
                info = zipfile.ZipInfo(member)
                info.compress_type = compression
                if index == 0:
                    info.extra, info.comment = extra, comment
                    if kind is not None:
                        info.external_attr = kind << 16
                archive.writestr(info, CANARY + b' <not-XML-or-model-output>')
    return stream.getvalue()


def change(raw, where, offset, fmt, value):
    result = bytearray(raw)
    start = 0 if where == 'local' else struct.unpack('<4s4H2LH', raw[-22:])[-2]
    struct.pack_into(fmt, result, start + offset, value)
    return bytes(result)


def legacy(raw):
    try:
        archive, _ = M.custody._zip_structure(raw)
        archive.close()
        return 'HEADER_PROFILE_ACCEPTED'
    except M.custody.CustodyError as error:
        return str(error)


class DiagnosticTests(unittest.TestCase):
    def setUp(self):
        self.guards = ExitStack()
        self.addCleanup(self.guards.close)
        self.guards.enter_context(patch.object(socket, 'socket', side_effect=AssertionError('network forbidden')))
        self.guards.enter_context(patch.object(socket, 'getaddrinfo', side_effect=AssertionError('network forbidden')))

    def inspect(self, raw):
        with ExitStack() as stack:
            for method in ('open', 'read', 'extract', 'extractall', 'testzip'):
                stack.enter_context(patch.object(zipfile.ZipFile, method, side_effect=AssertionError('payload forbidden')))
            result = M.inspect_synthetic_zip(raw)
            expected = legacy(raw)
        self.assertEqual(result['legacy_zip_reason'], expected)
        self.assertIn(result['reason'], M.REASONS)
        self.assertEqual(result['status'], 'BLOCKED_SCHEMA')
        self.assertFalse(result['source_identity_verified'])
        self.assertEqual(result['exposure']['members_decompressed'], [])
        self.assertFalse(result['exposure']['member_names_published'])
        serialized = json.dumps(result)
        self.assertNotIn(CANARY.decode(), serialized)
        for member in M.custody.ENVELOPE_MEMBERS:
            self.assertNotIn(member, serialized)
        for field in ('row_count', 'paired_count', 'source_group_count', 'overlap_count'):
            self.assertIsNone(result[field])
        return result

    def test_stored_and_deflated_headers_accept_without_payload_reads(self):
        for compression in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED):
            with self.subTest(compression=compression):
                self.assertEqual(self.inspect(fixture(compression=compression))['reason'], 'HEADER_PROFILE_ACCEPTED')

    def test_corrupt_payload_is_not_interpreted(self):
        raw = bytearray(fixture(compression=zipfile.ZIP_DEFLATED))
        name_length, extra_length = struct.unpack_from('<2H', raw, 26)
        start = 30 + name_length + extra_length
        raw[start:start + 5] = b'XXXXX'
        self.assertEqual(self.inspect(bytes(raw))['reason'], 'HEADER_PROFILE_ACCEPTED')

    def test_extras_comments_and_kind_are_distinguished(self):
        cases = [(fixture(extra=b'\xfe\xca\x00\x00'), 'CENTRAL_EXTRA_PRESENT'),
                 (fixture(comment=CANARY), 'CENTRAL_COMMENT_PRESENT'),
                 (fixture(kind=stat.S_IFLNK | 0o777), 'MEMBER_FILE_TYPE')]
        for raw, expected in cases:
            with self.subTest(expected=expected):
                self.assertEqual(self.inspect(raw)['reason'], expected)

    def test_path_kind_duplicate_missing_do_not_publish_names(self):
        for name, expected in [('../' + CANARY.decode(), 'MEMBER_PATH_PROFILE'),
                               ('xl/' + CANARY.decode(), 'MEMBER_KIND_PROFILE'),
                               ('xl/workbook.xml', 'MEMBER_NAME_OR_DUPLICATE')]:
            with self.subTest(expected=expected):
                self.assertEqual(self.inspect(fixture(name=name))['reason'], expected)
        self.assertEqual(self.inspect(fixture(omit=True))['reason'], 'REQUIRED_MEMBERS_ABSENT')

    def test_central_first_failure_categories(self):
        raw = fixture()
        cases = [(8, '<H', 1, 'MEMBER_FLAGS'), (10, '<H', 99, 'MEMBER_COMPRESSION'),
                 (6, '<H', 21, 'MEMBER_VERSION'), (24, '<L', 999, 'STORED_SIZE_MISMATCH'),
                 (42, '<L', 1, 'LOCAL_OFFSET_LAYOUT')]
        for offset, fmt, value, expected in cases:
            with self.subTest(expected=expected):
                self.assertEqual(self.inspect(change(raw, 'central', offset, fmt, value))['reason'], expected)

    def test_local_first_failure_categories(self):
        raw = fixture()
        cases = [(4, '<H', 21, 'LOCAL_HEADER_AGREEMENT'),
                 (28, '<H', 1, 'LOCAL_EXTRA_PRESENT'),
                 (26, '<H', 1, 'LOCAL_NAME_AGREEMENT')]
        for offset, fmt, value, expected in cases:
            with self.subTest(expected=expected):
                self.assertEqual(self.inspect(change(raw, 'local', offset, fmt, value))['reason'], expected)

    def test_malformed_truncated_and_count_bound(self):
        self.assertEqual(self.inspect(b'notzip')['reason'], 'HEADER_TOO_SHORT')
        self.assertEqual(self.inspect(fixture()[:-1])['reason'], 'END_RECORD_PROFILE')
        raw = bytearray(fixture())
        struct.pack_into('<2H', raw, len(raw) - 14, 129, 129)
        self.assertEqual(self.inspect(bytes(raw))['reason'], 'MEMBER_LIMIT')
        raw = bytearray(fixture())
        directory = struct.unpack('<4s4H2LH', raw[-22:])[-2]
        raw[directory:directory + 4] = b'xxxx'
        self.assertEqual(self.inspect(bytes(raw))['reason'], 'HEADER_PARSE_ERROR')

    def test_first_failure_order_keeps_central_before_local(self):
        raw = change(fixture(extra=b'\xfe\xca\x00\x00'), 'local', 4, '<H', 99)
        self.assertEqual(self.inspect(raw)['reason'], 'CENTRAL_EXTRA_PRESENT')
        raw = change(raw, 'central', 8, '<H', 1)
        self.assertEqual(self.inspect(raw)['reason'], 'MEMBER_FLAGS')

    def test_fixture_bounds_and_real_identity_rejection(self):
        for raw, expected in [(bytearray(), 'RAW_TYPE_INVALID'),
                              (b'x' * (M.custody.SOURCE_BYTES + 1), 'SOURCE_SIZE_MISMATCH')]:
            with self.assertRaisesRegex(M.custody.CustodyError, expected):
                M.inspect_synthetic_zip(raw)
        # Fake digest result exercises the real-identity branch without real bytes.
        with patch.object(M.hashlib, 'sha256') as digest:
            digest.return_value.hexdigest.return_value = M.OBJECT_SHA256
            with self.assertRaisesRegex(M.custody.CustodyError, 'SYNTHETIC_REAL_SOURCE_FORBIDDEN'):
                M.inspect_synthetic_zip(b'fake')

    def test_invalid_capture_rejected_without_private_reads(self):
        with self.assertRaisesRegex(M.custody.CustodyError, 'CAPTURE_RECEIPT_INVALID'):
            M._validate_capture(b'{"fake":"capture"}\n')
        with patch.object(M, 'production_context', return_value={'fixture': True}), \
             patch.object(M.custody, '_output_directory', return_value=123), \
             patch.object(M.custody, '_absent_at'), \
             patch.object(M.custody.os, 'close'), \
             patch.object(M.custody, '_read_relative', return_value=b'fake') as read:
            report = M.diagnose('1')
        self.assertEqual(report['reason'], 'CAPTURE_RECEIPT_INVALID')
        self.assertEqual(read.call_args_list[0].args[0], M.custody.CAPTURE)
        self.assertEqual(read.call_count, 1)
        self.assertFalse(report['exposure']['raw_buffer_read_started'])

    def test_candidate_guard_precedes_cache_and_network(self):
        with patch.object(M, '__file__', str(M.ROOT / '.cache/uncommitted_candidate.py')), \
             patch.object(M.custody, '_read_relative', side_effect=AssertionError('no cache')) as read, \
             patch.object(M.custody, '_output_directory', side_effect=AssertionError('no writes')) as output:
            report = M.diagnose('1')
        self.assertEqual(report['status'], 'BLOCKED_GUARD')
        self.assertEqual(report['reason'], 'FROZEN_SOURCE_REQUIRED')
        read.assert_not_called()
        output.assert_not_called()

    def test_partial_object_read_preserves_unknown_exposure(self):
        def fake_read(path, cap):
            if path == M.custody.CAPTURE:
                return b'fake receipt supplied to mocked validator'
            self.assertEqual(path, M.custody.OBJECT)
            raise M.custody.CustodyError('FILE_READ_FAILED')
        with patch.object(M, 'production_context', return_value={'fixture': True}), \
             patch.object(M.custody, '_output_directory', return_value=123), \
             patch.object(M.custody, '_absent_at'), \
             patch.object(M.custody.os, 'close'), \
             patch.object(M, '_validate_capture', return_value={'observed': {}}), \
             patch.object(M.custody, '_read_relative', side_effect=fake_read):
            report = M.diagnose('1')
        self.assertEqual(report['reason'], 'FILE_READ_FAILED')
        self.assertTrue(report['exposure']['raw_buffer_read_started'])
        self.assertFalse(report['exposure']['raw_buffer_read_completed'])
        self.assertIsNone(report['exposure']['target_bearing_source_bytes_read'])
        self.assertFalse(report['exposure']['header_checks_started'])

    def test_closed_cli_no_input_or_output_overrides(self):
        for argv in [('diagnose', '--run', '3'), ('diagnose', '--run', '1', '--object', '/fake'),
                     ('diagnose', '--run', '1', '--url', 'https://invalid.example'),
                     ('diagnose', '--receipt', '/tmp/result.json')]:
            with self.subTest(argv=argv), redirect_stdout(io.StringIO()) as output:
                self.assertEqual(M.main(argv), 2)
            self.assertEqual(json.loads(output.getvalue())['reason'], 'CLI_ARGUMENT_INVALID')


if __name__ == '__main__':
    unittest.main()
