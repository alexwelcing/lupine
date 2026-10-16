"""Author synthetic tests for the separately frozen local-extra header inventory."""
from contextlib import ExitStack, redirect_stderr
import copy
import gc
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import socket
import struct
import types
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET
import zipfile
import zlib

ROOT = next(p for p in Path(__file__).absolute().parents
            if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
CANDIDATE = ROOT / '.cache/phase2-li-local-extra-candidate-v1/promotion/scripts/li_v3_local_extra_headers.py'
SOURCE = CANDIDATE if '.cache' in Path(__file__).parts else ROOT / 'scripts/li_v3_local_extra_headers.py'
spec = importlib.util.spec_from_file_location('li_local_extra_author', SOURCE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def field(identifier, body=b''):
    return struct.pack('<HH', identifier, len(body)) + body


def archive(entries):
    """Write only fixed ZIP structures; data bytes need not be readable members."""
    local, central, positions = bytearray(), bytearray(), []
    for name, extra, data in entries:
        encoded = name.encode('ascii')
        position = len(local)
        positions.append(position)
        local += struct.pack('<4s5H3L2H', b'PK\x03\x04', 20, 0, 0, 0, 33,
                             0, len(data), len(data), len(encoded), len(extra))
        local += encoded + extra + data
        central += struct.pack('<4s6H3L5H2L', b'PK\x01\x02', 20, 20, 0, 0, 0, 33,
                               0, len(data), len(data), len(encoded), 0, 0, 0, 0, 0, position)
        central += encoded
    return bytes(local + central + struct.pack('<4s4H2LH', b'PK\x05\x06', 0, 0,
        len(entries), len(entries), len(central), len(local), 0)), positions


def one(extra, name='[Content_Types].xml', data=b'opaque member bytes'):
    return archive([(name, extra, data)])[0]


class LocalExtraAuthorTests(unittest.TestCase):
    def setUp(self):
        self.guards = ExitStack()
        for target in ('socket.socket', 'socket.getaddrinfo', 'urllib.request.urlopen'):
            self.guards.enter_context(patch(target, side_effect=AssertionError('network forbidden')))
        self.addCleanup(self.guards.close)

    def complete(self, raw, expected):
        result = module.inspect_synthetic_local_extra(raw)
        self.assertEqual(result['reason'], 'LOCAL_EXTRA_HEADERS_COMPLETE')
        self.assertEqual(result['status'], 'BLOCKED_SCHEMA')
        self.assertEqual(result['field_headers'], expected)
        self.assertEqual(result['predecessor_classification'], module.EXPECTED_CLASSIFICATION)
        exposure = result['exposure']
        for key in ('archive_close_started', 'archive_close_completed',
                    'local_header_locator_started', 'local_header_locator_completed',
                    'local_extra_header_walk_started', 'local_extra_header_walk_completed'):
            self.assertIs(exposure[key], True)
        self.assertIsNone(exposure['archive_close_error'])
        self.assertIs(exposure['local_extra_payload_interpreted'], False)
        self.assertEqual(exposure['members_decompressed'], [])
        self.assertIs(exposure['xml_decoded'], False)
        for key in ('row_count', 'paired_count', 'source_group_count', 'overlap_count'):
            self.assertIsNone(result[key])
        self.assertEqual(exposure['fits'], 0)
        self.assertEqual(exposure['splits'], 0)
        return result

    def test_first_middle_and_later_entry_stop(self):
        expected = [{'header_id': 0xA220, 'data_size': 3}]
        extra = field(0xA220, b'abc')
        self.complete(one(extra), expected)
        raw, _ = archive([('[Content_Types].xml', b'', b'not XML'),
                          ('xl/workbook.xml', extra, b'not XML'),
                          ('unknown-later.bin', b'bad', b'private canary')])
        self.complete(raw, expected)

    def test_unsigned_order_duplicates_zero_and_no_recursive_parse(self):
        extra = field(65535) + field(10, field(1, b'nested')) + field(65535, b'x')
        self.complete(one(extra), [{'header_id': 65535, 'data_size': 0},
            {'header_id': 10, 'data_size': 10}, {'header_id': 65535, 'data_size': 1}])

    def test_opaque_payload_member_and_name_canaries_invariant(self):
        first = one(field(0x7075, b'SECRET_ALPHA'), 'xl/worksheets/sheet1.xml', b'FIRST_SECRET')
        second = one(field(0x7075, b'SECRET_BRAVO'), 'xl/worksheets/sheet2.xml', b'OTHER_SECRET')
        a = self.complete(first, [{'header_id': 0x7075, 'data_size': 12}])
        b = self.complete(second, [{'header_id': 0x7075, 'data_size': 12}])
        self.assertEqual(a, b)
        encoded = module.custody.canonical(a)
        for token in (b'SECRET', b'sheet1', b'7075'):
            self.assertNotIn(token, encoded)

    def test_header_and_declared_data_truncation_discard_partial(self):
        cases = [(field(2) + b'x' * n, 'EXTRA_HEADER_TRUNCATED') for n in (1, 2, 3)]
        cases += [(field(2) + struct.pack('<HH', 3, 5) + b'abcd', 'EXTRA_DATA_TRUNCATED')]
        for extra, reason in cases:
            with self.subTest(reason=reason, length=len(extra)):
                result = module.inspect_synthetic_local_extra(one(extra))
                self.assertEqual(result['reason'], reason)
                self.assertIsNone(result['field_headers'])
                self.assertTrue(result['exposure']['local_extra_header_walk_started'])
                self.assertFalse(result['exposure']['local_extra_header_walk_completed'])

    def test_record_limit_precedes_tail_and_exact_limit_succeeds(self):
        extra = field(7) * 256
        self.complete(one(extra), [{'header_id': 7, 'data_size': 0}] * 256)
        for tail in (b'x', b'xy', b'xyz', field(8), struct.pack('<HH', 8, 65535)):
            result = module.inspect_synthetic_local_extra(one(extra + tail))
            self.assertEqual(result['reason'], 'EXTRA_RECORD_LIMIT')
            self.assertIsNone(result['field_headers'])

    def test_maximum_extra_span_exact_and_one_byte_data_overrun(self):
        extra = field(123, b'x' * 65531)
        self.assertEqual(len(extra), 65535)
        self.complete(one(extra), [{'header_id': 123, 'data_size': 65531}])
        invalid = struct.pack('<HH', 123, 65532) + b'x' * 65531
        result = module.inspect_synthetic_local_extra(one(invalid))
        self.assertEqual(result['reason'], 'EXTRA_DATA_TRUNCATED')
        self.assertIsNone(result['field_headers'])

    def test_mixed_prior_and_other_prior_paths_never_locate(self):
        raw = bytearray(one(field(1)))
        struct.pack_into('<H', raw, 10, 1)  # local time disagreement plus extra
        for value in (bytes(raw), one(b''), b''):
            with patch.object(module, '_locate', side_effect=AssertionError('must not locate')) as locate:
                report = module.inspect_synthetic_local_extra(value)
            self.assertEqual(report['reason'], 'PREDECESSOR_PATH_MISMATCH')
            self.assertIsNone(report['field_headers'])
            self.assertFalse(report['exposure']['local_header_locator_started'])
            locate.assert_not_called()

    def test_exact_predecessor_shape_and_successful_close_required(self):
        raw = one(field(1))
        def forged(_raw, exposure):
            return copy.deepcopy(module.EXPECTED_CLASSIFICATION)
        with patch.object(module.diagnostic, '_classify', side_effect=forged):
            report = module.inspect_synthetic_local_extra(raw)
        self.assertEqual(report['reason'], 'PREDECESSOR_CLEANUP_FAILED')
        self.assertIsNone(report['field_headers'])
        self.assertFalse(report['exposure']['local_header_locator_started'])
        def extra_key(_raw, exposure):
            result = forged(_raw, exposure)
            result['unsupported'] = True
            return result
        with patch.object(module.diagnostic, '_classify', side_effect=extra_key):
            report = module.inspect_synthetic_local_extra(raw)
        self.assertEqual(report['reason'], 'PREDECESSOR_PATH_MISMATCH')

    def test_locator_defensive_bounds_and_missing_target(self):
        raw = one(field(1))
        malformed = []
        for position, value in ((0, b'FAIL'), (26, struct.pack('<H', 65535)),
                                (28, struct.pack('<H', 65535)), (18, struct.pack('<L', 0xffffffff))):
            candidate = bytearray(raw)
            candidate[position:position + len(value)] = value
            malformed.append(bytes(candidate))
        malformed += [b'', one(b'')]
        for candidate in malformed:
            exposure = module._base(True)['exposure']
            with self.assertRaisesRegex(module.LocalExtraError, '^LOCAL_EXTRA_LOCATOR_MISMATCH$'):
                module._locate(candidate, exposure)
            self.assertTrue(exposure['local_header_locator_started'])
            self.assertFalse(exposure['local_header_locator_completed'])
        for start, end in ((0, 0), (-1, 2), (False, 2), (0, 65536), (0, 70000)):
            with self.assertRaisesRegex(module.LocalExtraError, '^LOCAL_EXTRA_LOCATOR_MISMATCH$'):
                module._walk(b'x' * 65536, start, end, module._base(True)['exposure'])

    def test_no_member_decompression_or_xml_apis(self):
        raw = one(field(1, b'bad XML and opaque extras'))
        with ExitStack() as stack:
            for name in ('open', 'read', 'extract', 'extractall', 'testzip'):
                stack.enter_context(patch.object(zipfile.ZipFile, name, side_effect=AssertionError('member forbidden')))
            stack.enter_context(patch.object(ET, 'fromstring', side_effect=AssertionError('XML forbidden')))
            for name in ('decompress', 'decompressobj'):
                stack.enter_context(patch.object(zlib, name, side_effect=AssertionError('inflate forbidden')))
            self.complete(raw, [{'header_id': 1, 'data_size': 25}])

    def test_archive_close_failure_retains_exposure_and_no_stderr(self):
        original = zipfile.ZipFile.close
        def fail_open_archive(archive):
            if archive.fp is not None and archive.mode == 'r':
                raise RuntimeError('PRIVATE_CLOSE_CANARY')
            return original(archive)
        stderr = io.StringIO()
        with redirect_stderr(stderr), patch.object(zipfile.ZipFile, 'close', fail_open_archive):
            report = module.inspect_synthetic_local_extra(one(field(3)))
            gc.collect()
        self.assertEqual(stderr.getvalue(), '')
        self.assertEqual(report['reason'], 'PREDECESSOR_CLEANUP_FAILED')
        self.assertEqual(report['predecessor_classification'], module.EXPECTED_CLASSIFICATION)
        self.assertTrue(report['exposure']['directory_name_decoding_completed'])
        self.assertEqual(report['exposure']['archive_close_error'], 'ARCHIVE_CLOSE_FAILED')
        self.assertFalse(report['exposure']['local_header_locator_started'])
        self.assertNotIn(b'PRIVATE_CLOSE_CANARY', module.custody.canonical(report))

    def test_parse_failure_keeps_started_flags_and_constant_error(self):
        with patch.object(module.struct, 'unpack_from', side_effect=RuntimeError('PRIVATE_PARSE_CANARY')):
            report = module.inspect_synthetic_local_extra(one(field(5)))
        self.assertEqual(report['reason'], 'LOCAL_EXTRA_PARSE_FAILED')
        self.assertTrue(report['exposure']['local_header_locator_started'])
        self.assertTrue(report['exposure']['archive_close_completed'])
        self.assertIsNone(report['field_headers'])
        self.assertNotIn(b'PRIVATE_PARSE_CANARY', module.custody.canonical(report))

    def test_synthetic_types_bounds_and_real_identity_rejection(self):
        for raw in (None, bytearray(), memoryview(b''), '', 1):
            with self.assertRaisesRegex(module.custody.CustodyError, '^RAW_TYPE_INVALID$'):
                module.inspect_synthetic_local_extra(raw)
        with self.assertRaisesRegex(module.custody.CustodyError, '^SOURCE_SIZE_MISMATCH$'):
            module.inspect_synthetic_local_extra(b'x' * (module.custody.SOURCE_BYTES + 1))
        raw = one(field(5))
        with patch.object(module.header_diagnostic, 'OBJECT_SHA256', hashlib.sha256(raw).hexdigest()):
            with self.assertRaisesRegex(module.custody.CustodyError, '^SYNTHETIC_REAL_SOURCE_FORBIDDEN$'):
                module.inspect_synthetic_local_extra(raw)
        with patch.object(module.custody, 'SOURCE_BYTES', len(raw)), patch.object(
                module.custody, 'SOURCE_MD5', hashlib.md5(raw).hexdigest()):
            with self.assertRaisesRegex(module.custody.CustodyError, '^SYNTHETIC_REAL_SOURCE_FORBIDDEN$'):
                module.inspect_synthetic_local_extra(raw)

    def test_prior_source_pins_equal_unchanged_public_files(self):
        for path, expected in module.PRIOR_FILES.items():
            self.assertEqual(hashlib.sha256((ROOT / path).read_bytes()).hexdigest(), expected, path)
        maps = (module.PRIOR_FILES, module.diagnostic.PRIOR_FILES, module.compatible.PRIOR_FILES,
                module.compatible.flag_diagnostic.PRIOR_FILES, module.header_diagnostic.LEGACY_FILES)
        self.assertEqual(sum(map(len, maps)), 21)

    def test_ignored_path_blocks_before_prior_git_or_private_io(self):
        with patch.object(module, '__file__', str(ROOT / '.cache/forbidden-local-extra.py')), \
                patch.object(module.diagnostic, 'production_context', side_effect=AssertionError('prior forbidden')) as prior, \
                patch.object(module.subprocess, 'run', side_effect=AssertionError('git forbidden')), \
                patch.object(module.custody, '_read_relative', side_effect=AssertionError('read forbidden')):
            with self.assertRaisesRegex(module.custody.CustodyError, '^FROZEN_SOURCE_REQUIRED$'):
                module.production_context()
        prior.assert_not_called()

    def test_positive_synthetic_source_context_and_detached_maps(self):
        commit = 'a' * 40
        prior = {'commit': commit, 'files': dict(module.PRIOR_FILES)}
        files = {path: ('fixture ' + path).encode() for path in module.FROZEN_PATHS}
        def fake_git(args, **kwargs):
            self.assertEqual(kwargs['timeout'], 15)
            if args[1:] == ['rev-parse', '--show-prefix']:
                return types.SimpleNamespace(stdout=b'discovery/\n')
            self.assertEqual(args[1], 'show')
            path = args[2].split(':', 1)[1].removeprefix('discovery/')
            return types.SimpleNamespace(stdout=files[path])
        with patch.object(module, '__file__', str(ROOT / module.FROZEN_PATHS[0])), \
                patch.object(module.diagnostic, 'production_context', return_value=prior), \
                patch.object(module.custody, '_read_relative', side_effect=lambda path, cap: files[path]), \
                patch.object(module.subprocess, 'run', side_effect=fake_git):
            context = module.production_context()
        self.assertEqual(context['files'], {path: hashlib.sha256(raw).hexdigest() for path, raw in files.items()})
        context['diagnostic_files'].clear()
        self.assertEqual(len(module.PRIOR_FILES), 4)
        prior['files'] = {}
        with patch.object(module, '__file__', str(ROOT / module.FROZEN_PATHS[0])), \
                patch.object(module.diagnostic, 'production_context', return_value=prior):
            with self.assertRaisesRegex(module.custody.CustodyError, '^FROZEN_SOURCE_REQUIRED$'):
                module.production_context()

    def test_exact_prerequisite_hash_then_producer_and_no_false_semantics(self):
        raw = json.dumps({'implementation': {'commit': module.PREREQUISITE_PRODUCER}}).encode()
        with self.assertRaisesRegex(module.LocalExtraError, '^LOCAL_EXTRA_PREREQUISITE_INVALID$'):
            module._validate_prerequisite(raw)
        with patch.object(module, 'PREREQUISITE_SHA256', hashlib.sha256(raw).hexdigest()):
            self.assertEqual(module._validate_prerequisite(raw), hashlib.sha256(raw).hexdigest())
            with patch.object(module, 'PREREQUISITE_PRODUCER', 'b' * 40):
                with self.assertRaisesRegex(module.LocalExtraError, '^LOCAL_EXTRA_PREREQUISITE_INVALID$'):
                    module._validate_prerequisite(raw)

    def production_fixture(self, write_error=None, close_error=None, read_error=None):
        raw = one(field(9, b'abc'))
        prerequisite = module.custody.canonical({'implementation': {'commit': module.PREREQUISITE_PRODUCER}})
        calls, written = [], []
        def read(path, cap):
            calls.append(path)
            if path == module.PREREQUISITE:
                return prerequisite
            if path == module.custody.CAPTURE:
                return b'fixture capture'
            self.assertEqual(path, module.custody.OBJECT)
            if read_error:
                raise read_error
            return raw
        def write(fd, name, data):
            written.append(data)
            if write_error:
                raise write_error
        with ExitStack() as stack:
            stack.enter_context(patch.object(module, 'production_context', return_value={'fixture': True}))
            stack.enter_context(patch.object(module, 'PREREQUISITE_SHA256', hashlib.sha256(prerequisite).hexdigest()))
            stack.enter_context(patch.object(module.custody, '_receipt_path', return_value=Path('/synthetic/public.json')))
            stack.enter_context(patch.object(module.custody, '_output_directory', return_value=123))
            stack.enter_context(patch.object(module.custody, '_absent_at'))
            stack.enter_context(patch.object(module.custody, '_read_relative', side_effect=read))
            stack.enter_context(patch.object(module.header_diagnostic, '_validate_capture'))
            stack.enter_context(patch.object(module.compatible, '_capture_identity', return_value={'fixture': True}))
            stack.enter_context(patch.object(module.custody, '_verify_source', return_value={'fixture': True}))
            stack.enter_context(patch.object(module.custody, '_write_at', side_effect=write))
            stack.enter_context(patch.object(module.custody.os, 'close', side_effect=close_error))
            report = module.diagnose('1')
        return report, calls, written

    def test_simulated_production_orders_prerequisite_capture_object(self):
        report, calls, written = self.production_fixture()
        self.assertEqual(calls, [module.PREREQUISITE, module.custody.CAPTURE, module.custody.OBJECT])
        self.assertEqual(report['reason'], 'LOCAL_EXTRA_HEADERS_COMPLETE')
        self.assertEqual(json.loads(written[0]), report)
        self.assertTrue(report['exposure']['target_bearing_source_bytes_read'])

    def test_write_close_and_partial_read_errors_preserve_exposure(self):
        for fault in ({'write_error': module.custody.CustodyError('FILE_WRITE_FAILED')},
                      {'close_error': RuntimeError('PRIVATE_DESCRIPTOR_CANARY')}):
            report, _, _ = self.production_fixture(**fault)
            self.assertEqual(report['status'], 'BLOCKED_GUARD')
            self.assertTrue(report['exposure']['local_extra_header_walk_completed'])
            self.assertTrue(report['exposure']['target_bearing_source_bytes_read'])
            self.assertIsNone(report['field_headers'])
            self.assertNotIn(b'PRIVATE_DESCRIPTOR_CANARY', module.custody.canonical(report))
        report, _, written = self.production_fixture(read_error=module.custody.CustodyError('FILE_READ_FAILED'))
        self.assertEqual(report['reason'], 'FILE_READ_FAILED')
        self.assertTrue(report['exposure']['raw_buffer_read_started'])
        self.assertFalse(report['exposure']['raw_buffer_read_completed'])
        self.assertIsNone(report['exposure']['target_bearing_source_bytes_read'])
        self.assertEqual(written, [])


if __name__ == '__main__':
    unittest.main()
