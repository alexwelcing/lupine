"""Synthetic central-flag semantics and fixed-source guard tests; no real archive."""
from contextlib import ExitStack, redirect_stdout
import importlib.util
import io
import json
from pathlib import Path
import socket
import struct
import unittest
from unittest.mock import patch
import zipfile

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('li_flag_author', HERE.parent / 'scripts/li_v3_flag_diagnostic.py')
M = importlib.util.module_from_spec(spec)
spec.loader.exec_module(M)
CANARY = 'FLAG_CUSTODY_SEALED_OUTCOME_53119'


def fixture(flags=2, method=8, *, second=None, unsafe_name=None):
    stream = io.BytesIO()
    names = list(M.custody.ENVELOPE_MEMBERS)
    if unsafe_name is not None:
        names[0] = unsafe_name
    with zipfile.ZipFile(stream, 'w', compression=zipfile.ZIP_STORED) as archive:
        for name in names:
            archive.writestr(name, (CANARY + ' opaque-not-XML').encode())
    raw = bytearray(stream.getvalue())
    start = struct.unpack('<4s4H2LH', raw[-22:])[-2]
    locations = []
    for index in range(len(names)):
        locations.append(start)
        lengths = struct.unpack_from('<3H', raw, start + 28)
        start += 46 + sum(lengths)
    struct.pack_into('<2H', raw, locations[0] + 8, flags, method)
    if second is not None:
        struct.pack_into('<2H', raw, locations[1] + 8, *second)
    return bytes(raw)


class FlagTests(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.stack.enter_context(patch.object(socket, 'socket', side_effect=AssertionError('network forbidden')))
        self.stack.enter_context(patch.object(socket, 'getaddrinfo', side_effect=AssertionError('DNS forbidden')))

    def inspect(self, raw):
        with ExitStack() as stack:
            guards = [stack.enter_context(patch.object(zipfile.ZipFile, name, side_effect=AssertionError('no payload')))
                      for name in ('open', 'read', 'extract', 'extractall', 'testzip')]
            result = M.inspect_synthetic_flags(raw)
            for guard in guards:
                guard.assert_not_called()
        self.assertEqual(result['status'], 'BLOCKED_SCHEMA')
        self.assertFalse(result['source_identity_verified'])
        self.assertIn(result['reason'], M.DIAGNOSTIC_REASONS)
        self.assertEqual(result['exposure']['members_decompressed'], [])
        self.assertFalse(result['exposure']['xml_decoded'])
        self.assertFalse(result['exposure']['member_names_published'])
        self.assertNotIn(CANARY, json.dumps(result))
        for field in ('row_count', 'paired_count', 'source_group_count', 'overlap_count'):
            self.assertIsNone(result[field])
        return result

    def test_deflate_all_option_combinations_and_utf8(self):
        for flags in (2, 4, 6, 0x802, 0x804, 0x806):
            with self.subTest(flags=flags):
                result = self.inspect(fixture(flags))
                self.assertEqual(result['reason'], 'DEFLATE_OPTION_FLAGS_ONLY')
                self.assertEqual(result['prior_diagnostic_reason'], 'MEMBER_FLAGS')
                self.assertEqual(result['legacy_zip_reason'], 'ZIP_LAYOUT_UNSUPPORTED')
                self.assertTrue(result['exposure']['flag_family_classified'])
                self.assertFalse(result['exposure']['header_checks_completed'])

    def test_encryption_and_masking_precede_descriptor_or_reserved(self):
        for flags in (1, 64, 8192, 9, 73, 0x200a, 0x8041, 0xffff):
            with self.subTest(flags=flags):
                self.assertEqual(self.inspect(fixture(flags))['reason'], 'ENCRYPTION_OR_HEADER_MASKING_PRESENT')

    def test_descriptor_declaration_masks_are_method_specific(self):
        for flags, method in ((8, 0), (0x808, 0), (8, 8), (10, 8), (12, 8), (14, 8), (0x80e, 8)):
            with self.subTest(flags=flags, method=method):
                self.assertEqual(self.inspect(fixture(flags, method))['reason'], 'DATA_DESCRIPTOR_WITH_SUPPORTED_METHOD')
        for flags, method in ((10, 0), (8, 9), (8, 14), (24, 8), (40, 8)):
            with self.subTest(flags=flags, method=method):
                self.assertEqual(self.inspect(fixture(flags, method))['reason'], 'OTHER_OR_MIXED_FLAGS')

    def test_other_methods_reserved_and_patched_bits_do_not_become_deflate(self):
        for flags, method in ((2, 0), (2, 6), (2, 9), (2, 14), (6, 99),
                              (16, 8), (32, 8), (128, 8), (256, 8), (512, 8),
                              (1024, 8), (4096, 8), (16384, 8), (32768, 8), (34, 8)):
            with self.subTest(flags=flags, method=method):
                self.assertEqual(self.inspect(fixture(flags, method))['reason'], 'OTHER_OR_MIXED_FLAGS')

    def test_clear_or_utf8_only_flags_do_not_get_a_family(self):
        for flags in (0, 0x800):
            # Stored method keeps all unrelated local/header predicates valid.
            result = self.inspect(fixture(flags, 0))
            self.assertEqual(result['reason'], 'EXPECTED_FLAG_FAILURE_NOT_REPRODUCED')
            self.assertFalse(result['exposure']['flag_family_classified'])
            self.assertFalse(result['exposure']['flag_entry_reparse_started'])

    def test_earlier_rejection_is_preserved(self):
        result = self.inspect(fixture(2, unsafe_name='../' + CANARY))
        self.assertEqual(result['prior_diagnostic_reason'], 'MEMBER_PATH_PROFILE')
        self.assertEqual(result['reason'], 'EXPECTED_FLAG_FAILURE_NOT_REPRODUCED')
        self.assertFalse(result['exposure']['flag_entry_reparse_started'])
        result = self.inspect(b'not-a-zip')
        self.assertEqual(result['prior_diagnostic_reason'], 'HEADER_TOO_SHORT')

    def test_later_members_and_local_flags_are_not_claimed_valid(self):
        result = self.inspect(fixture(2, second=(1, 8)))
        self.assertEqual(result['reason'], 'DEFLATE_OPTION_FLAGS_ONLY')
        self.assertFalse(result['exposure']['header_checks_completed'])
        # Fixture local flags/method remain zero/stored, unlike central flags.
        self.assertEqual(result['legacy_zip_reason'], 'ZIP_LAYOUT_UNSUPPORTED')

    def test_second_metadata_parse_failure_is_closed_and_exposure_honest(self):
        raw = fixture()
        real = zipfile.ZipFile
        calls = []
        def wrapped(*args, **kwargs):
            calls.append(True)
            if len(calls) == 2:
                raise RuntimeError(CANARY)
            return real(*args, **kwargs)
        with patch.object(zipfile, 'ZipFile', side_effect=wrapped):
            result = M.inspect_synthetic_flags(raw)
        self.assertEqual(result['reason'], 'FLAG_METADATA_PARSE_FAILED')
        self.assertTrue(result['exposure']['flag_entry_reparse_started'])
        self.assertFalse(result['exposure']['flag_entry_reparse_completed'])
        self.assertNotIn(CANARY, json.dumps(result))

    def test_synthetic_types_size_and_real_identity_guard(self):
        for value, reason in [(bytearray(), 'RAW_TYPE_INVALID'),
                              (b'x' * (M.custody.SOURCE_BYTES + 1), 'SOURCE_SIZE_MISMATCH')]:
            with self.assertRaisesRegex(M.custody.CustodyError, reason):
                M.inspect_synthetic_flags(value)
        with patch.object(M.hashlib, 'sha256') as digest:
            digest.return_value.hexdigest.return_value = M.header_diagnostic.OBJECT_SHA256
            with self.assertRaisesRegex(M.custody.CustodyError, 'SYNTHETIC_REAL_SOURCE_FORBIDDEN'):
                M.inspect_synthetic_flags(b'fake identity fixture')

    def test_ignored_candidate_and_changed_prior_source_stop_before_cache(self):
        with patch.object(M, '__file__', str(M.ROOT / '.cache/fake_candidate.py')), \
             patch.object(M.custody, '_read_relative') as read, \
             patch.object(M.custody, '_output_directory') as output:
            result = M.diagnose('1')
        self.assertEqual(result['reason'], 'FROZEN_SOURCE_REQUIRED')
        read.assert_not_called(); output.assert_not_called()
        with patch.object(M, '__file__', str(M.ROOT / M.FROZEN_PATHS[0])), \
             patch.object(M.header_diagnostic, 'production_context', return_value={'files': {}}), \
             patch.object(M.custody, '_read_relative') as read:
            result = M.diagnose('1')
        self.assertEqual(result['reason'], 'FROZEN_SOURCE_REQUIRED')
        read.assert_not_called()

    def test_capture_conflict_and_failed_partial_read_do_not_disclose(self):
        with patch.object(M, 'production_context', return_value={'fixture': True}), \
             patch.object(M.custody, '_output_directory', return_value=123), \
             patch.object(M.custody, '_absent_at', side_effect=M.custody.CustodyError('OUTPUT_CONFLICT')), \
             patch.object(M.custody.os, 'close'), \
             patch.object(M.custody, '_read_relative') as read:
            result = M.diagnose('1')
        self.assertEqual(result['reason'], 'OUTPUT_CONFLICT'); read.assert_not_called()
        def fake_read(path, cap):
            if path == M.custody.CAPTURE:
                return b'fake receipt for stub validator'
            self.assertEqual(path, M.custody.OBJECT)
            raise M.custody.CustodyError('FILE_READ_FAILED')
        with patch.object(M, 'production_context', return_value={'fixture': True}), \
             patch.object(M.custody, '_output_directory', return_value=123), \
             patch.object(M.custody, '_absent_at'), patch.object(M.custody.os, 'close'), \
             patch.object(M.header_diagnostic, '_validate_capture', return_value={'observed': {}}), \
             patch.object(M.custody, '_read_relative', side_effect=fake_read):
            result = M.diagnose('1')
        self.assertEqual(result['reason'], 'FILE_READ_FAILED')
        self.assertIsNone(result['exposure']['target_bearing_source_bytes_read'])
        self.assertTrue(result['exposure']['raw_buffer_read_started'])
        self.assertFalse(result['exposure']['raw_buffer_read_completed'])
        self.assertFalse(result['exposure']['header_checks_started'])

    def test_cli_has_no_source_or_arbitrary_output_override(self):
        for argv in [('diagnose', '--run', '3'), ('diagnose', '--run', '1', '--object', '/fake'),
                     ('diagnose', '--run', '1', '--url', 'https://invalid.example'),
                     ('diagnose', '--receipt', '/tmp/arbitrary.json')]:
            with self.subTest(argv=argv), redirect_stdout(io.StringIO()) as out:
                self.assertEqual(M.main(argv), 2)
            self.assertEqual(json.loads(out.getvalue())['reason'], 'CLI_ARGUMENT_INVALID')


if __name__ == '__main__':
    unittest.main()
