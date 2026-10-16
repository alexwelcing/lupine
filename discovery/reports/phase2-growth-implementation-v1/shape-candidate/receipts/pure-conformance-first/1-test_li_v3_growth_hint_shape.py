"""Author synthetic checks; no actual archive, production guard or network."""
from contextlib import ExitStack
import hashlib
import copy
import importlib.util
import io
import json
from pathlib import Path
import struct
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import zlib

ROOT = next(p for p in Path(__file__).absolute().parents
            if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
SOURCE = Path(__file__).absolute().parents[1] / 'scripts/li_v3_growth_hint_shape.py'
if not SOURCE.is_file():
    SOURCE = ROOT / 'scripts/li_v3_growth_hint_shape.py'
SPEC = importlib.util.spec_from_file_location('growth_hint_author_candidate', SOURCE)
candidate = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(candidate)


def record(payload, identifier=0xA220):
    return struct.pack('<HH', identifier, len(payload)) + payload


def hint(initial=0, padding=b'', signature=0xA028):
    return record(struct.pack('<HH', signature, initial) + padding)


def archive(extras, names=None, body=b'OPAQUE_MEMBER_CANARY'):
    """Build stored ZIP headers independently without using a ZIP reader/writer."""
    names = names or [f'xl/worksheets/sheet{i+1}.xml'.encode() for i in range(len(extras))]
    local, directory = bytearray(), bytearray()
    for name, extra in zip(names, extras):
        offset = len(local)
        crc = zlib.crc32(body)
        local.extend(struct.pack('<4s5H3L2H', b'PK\x03\x04', 20, 0, 0, 0, 33,
                                 crc, len(body), len(body), len(name), len(extra)))
        local.extend(name + extra + body)
        directory.extend(struct.pack('<4s6H3L5H2L', b'PK\x01\x02', 20, 20, 0, 0,
                                     0, 33, crc, len(body), len(body), len(name),
                                     0, 0, 0, 0, 0, offset))
        directory.extend(name)
    return bytes(local + directory + struct.pack('<4s4H2LH', b'PK\x05\x06',
                 0, 0, len(extras), len(extras), len(directory), len(local), 0))


class GrowthHintShapeTests(unittest.TestCase):
    def inspect(self, extra, **kwargs):
        return candidate.inspect_synthetic_growth_hint(archive([extra], **kwargs))

    def assert_blocked_science(self, result):
        self.assertEqual(result['status'], 'BLOCKED_SCHEMA')
        self.assertEqual(result['production_prerequisite_status'], 'UNBOUND')
        self.assertEqual(result['initial_padding_semantics'], 'UNBOUND')
        self.assertFalse(result['archive_acceptance_established'])
        self.assertEqual(result['scientific_evaluation_status'], 'BLOCKED')
        self.assertFalse(result['source_identity_verified'])
        self.assertNotIn('field_headers', result)

    def test_empty_padding_matches_without_meaning_or_admission(self):
        result = self.inspect(hint(65535))
        self.assertEqual(result['reason'], 'GROWTH_HINT_SHAPE_MATCH')
        self.assertTrue(result['signature_matches'])
        self.assertTrue(result['padding_all_zero'])
        self.assertTrue(result['exposure']['growth_hint_payload_interpretation_completed'])
        self.assert_blocked_science(result)

    def test_all_unsigned_initial_values_are_withheld_and_unconstrained(self):
        results = [self.inspect(hint(value, b'\0' * 7))
                   for value in (0, 1, 7, 255, 256, 32768, 65535)]
        for result in results:
            self.assertEqual(result, results[0])
            self.assertEqual(result['reason'], 'GROWTH_HINT_SHAPE_MATCH')

    def test_short_payloads_never_read_fixed_words(self):
        for size in range(4):
            with self.subTest(size=size):
                result = self.inspect(record(b'x' * size))
                self.assertEqual(result['reason'], 'GROWTH_PAYLOAD_TOO_SHORT')
                self.assertFalse(result['payload_length_at_least_four'])
                self.assertFalse(result['exposure']['local_extra_payload_interpreted'])
                self.assertIsNone(result['signature_matches'])

    def test_signature_is_little_endian_and_exact(self):
        for signature in (0, 0x28A0, 0xA027, 0xFFFF):
            with self.subTest(signature=signature):
                result = self.inspect(hint(32768, b'SECRET_PADDING', signature))
                self.assertEqual(result['reason'], 'GROWTH_SIGNATURE_MISMATCH')
                self.assertFalse(result['signature_matches'])
                self.assertIsNone(result['padding_all_zero'])
                self.assertTrue(result['exposure']['growth_hint_fixed_words_interpreted'])
                self.assertFalse(result['exposure']['growth_hint_padding_scan_started'])

    def test_nonzero_padding_at_each_position_is_rejected(self):
        for index in range(17):
            data = bytearray(17)
            data[index] = 255
            result = self.inspect(hint(17, bytes(data)))
            self.assertEqual(result['reason'], 'GROWTH_PADDING_NONZERO')
            self.assertFalse(result['padding_all_zero'])
            self.assertTrue(result['exposure']['growth_hint_padding_scan_completed'])
            self.assert_blocked_science(result)

    def test_only_one_total_record_is_eligible(self):
        for extra in (record(b'\0' * 4, 0), record(b'\0' * 4, 1),
                      record(b'\0' * 4, 0xFFFF), hint() + hint(),
                      hint() + record(b'', 0x1234), record(b'', 0x1234) + hint()):
            result = self.inspect(extra)
            self.assertEqual(result['reason'], 'GROWTH_FIELD_SELECTION_BLOCKED')
            self.assertFalse(result['exactly_one_a220_record'])
            self.assertFalse(result['exposure']['growth_hint_payload_interpretation_started'])

    def test_malformed_or_capped_tlv_never_enters_payload(self):
        malformed = (b'\x20', b'\x20\xa2', b'\x20\xa2\x04',
                     b'\x20\xa2\x04\x00x', hint() + b'x', record(b'', 7) * 257)
        for extra in malformed:
            result = self.inspect(extra)
            self.assertEqual(result['reason'], 'GROWTH_PREDECESSOR_BLOCKED')
            self.assertIsNone(result['exactly_one_a220_record'])
            self.assertFalse(result['exposure']['growth_hint_locator_started'])

    def test_first_middle_and_late_selected_span(self):
        for count in (1, 2, 8, 128):
            result = candidate.inspect_synthetic_growth_hint(archive(
                [b''] * (count - 1) + [hint(65535, b'\0' * 3)]))
            self.assertEqual(result['reason'], 'GROWTH_HINT_SHAPE_MATCH')

    def test_later_extra_is_not_claimed_validated(self):
        result = candidate.inspect_synthetic_growth_hint(archive(
            [hint(), record(b'UNKNOWN_LATER_PAYLOAD', 0xFFFF)]))
        self.assertEqual(result['reason'], 'GROWTH_HINT_SHAPE_MATCH')
        self.assertFalse(result['archive_acceptance_established'])
        self.assertEqual(result['initial_padding_semantics'], 'UNBOUND')

    def test_maximum_extra_span_and_null_remainder(self):
        extra = hint(65535, b'\0' * (65535 - 8))
        self.assertEqual(len(extra), 65535)
        result = self.inspect(extra)
        self.assertEqual(result['reason'], 'GROWTH_HINT_SHAPE_MATCH')
        self.assertTrue(result['padding_all_zero'])

    def test_member_names_and_data_are_not_disclosed(self):
        result = self.inspect(hint(59117, b'PAYLOAD_CANARY'),
                              names=[b'xl/worksheets/sheet8912374.xml'], body=b'CELL_CANARY')
        raw = json.dumps(result, sort_keys=True)
        for token in ('PAYLOAD_CANARY', 'sheet8912374', 'CELL_CANARY', '59117'):
            self.assertNotIn(token, raw)
        self.assertEqual(result['reason'], 'GROWTH_PADDING_NONZERO')

    def test_production_and_content_apis_are_not_invoked(self):
        raw = archive([hint(32768, b'\0' * 11)])
        forbidden = [(candidate.predecessor, 'production_context'),
                     (candidate.predecessor, 'diagnose'),
                     (candidate.predecessor.custody, '_read_relative'),
                     (candidate.predecessor.custody, '_verify_source')]
        with ExitStack() as stack:
            for obj, name in forbidden:
                stack.enter_context(patch.object(obj, name, side_effect=AssertionError(name)))
            for name in ('zipfile.ZipFile.open', 'zipfile.ZipFile.read',
                         'zipfile.ZipFile.extract', 'urllib.request.urlopen',
                         'socket.create_connection', 'subprocess.run'):
                stack.enter_context(patch(name, side_effect=AssertionError(name)))
            result = candidate.inspect_synthetic_growth_hint(raw)
        self.assertEqual(result['reason'], 'GROWTH_HINT_SHAPE_MATCH')

    def test_bad_input_types_and_size_fail_before_hash(self):
        for raw in (None, '', bytearray(), memoryview(b''), 1, True,
                    b'x' * (candidate.predecessor.custody.SOURCE_BYTES + 1)):
            with patch('hashlib.sha256', side_effect=AssertionError('hash forbidden')):
                with self.assertRaises(candidate.predecessor.custody.CustodyError):
                    candidate.inspect_synthetic_growth_hint(raw)

    def test_known_actual_identity_rejected_without_actual_bytes(self):
        fake = unittest.mock.Mock()
        fake.hexdigest.return_value = candidate.predecessor.header_diagnostic.OBJECT_SHA256
        with patch('hashlib.sha256', return_value=fake):
            with self.assertRaisesRegex(candidate.predecessor.custody.CustodyError,
                                        '^SYNTHETIC_REAL_SOURCE_FORBIDDEN$'):
                candidate.inspect_synthetic_growth_hint(b'FAKE_TEST_BYTES')

    def test_second_locator_failure_preserves_prior_exposure(self):
        original = candidate.predecessor._locate
        calls = 0
        def second_failure(*args):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise RuntimeError('SECRET_EXCEPTION_CANARY')
            return original(*args)
        with patch.object(candidate.predecessor, '_locate', side_effect=second_failure):
            result = self.inspect(hint())
        self.assertEqual(result['reason'], 'GROWTH_PAYLOAD_INSPECTION_FAILED')
        self.assertTrue(result['exposure']['local_header_locator_completed'])
        self.assertTrue(result['exposure']['growth_hint_locator_started'])
        self.assertFalse(result['exposure']['growth_hint_locator_completed'])
        self.assertFalse(result['exposure']['growth_hint_payload_interpretation_started'])
        self.assertNotIn('SECRET_EXCEPTION_CANARY', json.dumps(result))

    def test_predecessor_rejection_retains_its_reason(self):
        result = candidate.inspect_synthetic_growth_hint(b'NOT_A_ZIP')
        self.assertEqual(result['reason'], 'GROWTH_PREDECESSOR_BLOCKED')
        self.assertNotEqual(result['predecessor_reason'], 'LOCAL_EXTRA_HEADERS_COMPLETE')
        self.assertFalse(result['exposure']['growth_hint_locator_started'])
        self.assert_blocked_science(result)

    def test_frozen_twenty_five_source_bytes_match(self):
        self.assertEqual(len(candidate.PREDECESSOR_FILES), 25)
        self.assertEqual(candidate.PREDECESSOR_FILES[
            'tests/test_li_v3_local_extra_headers_review.py'],
            '570dc7f3cfabb094550b8f1c5fed8f4f801d832dc8003611fc6638a8285a468e')
        for path, expected in candidate.PREDECESSOR_FILES.items():
            self.assertEqual(hashlib.sha256((ROOT / path).read_bytes()).hexdigest(), expected)

    def test_detached_reports_and_unchanged_predecessor_constants(self):
        first = self.inspect(hint())
        first['predecessor_classification'].clear()
        first['exposure'].clear()
        second = self.inspect(hint())
        self.assertEqual(second['predecessor_classification'],
                         candidate.predecessor.EXPECTED_CLASSIFICATION)
        self.assertTrue(second['exposure']['growth_hint_fixed_words_interpreted'])
        self.assertNotIn('GROWTH_PREREQUISITE_INVALID', candidate.custody.ERRORS)


def prior_identity(commit=None):
    return {'mode': 'committed_source',
            'commit': commit or candidate.PREREQUISITE_PRODUCER,
            **copy.deepcopy(candidate.EXPECTED_PRIOR_GROUPS)}


def prerequisite_fixture():
    """Generated public-shaped fixture, never a read of the actual prerequisite."""
    value = candidate.predecessor.inspect_synthetic_local_extra(
        archive([hint(0, b'\0' * 512)]))
    value.update(synthetic_fixture=False, source_identity_verified=True,
                 implementation=prior_identity())
    for key in ('raw_buffer_read_started', 'raw_buffer_read_completed',
                'target_bearing_source_bytes_read'):
        value['exposure'][key] = True
    return value


class ProductionBindingTests(unittest.TestCase):
    def setUp(self):
        self.raw = archive([hint(65535, b'\0' * 512)])
        self.receipt = candidate.custody.canonical(prerequisite_fixture())
        self.events, self.writes = [], []
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        # Every filesystem/source guard dependency is stubbed before diagnose.
        self.stack.enter_context(patch.object(candidate, 'production_context',
            side_effect=lambda: self.events.append('guard') or {'test': 'mocked'}))
        self.read = self.stack.enter_context(patch.object(candidate.custody,
            '_read_relative', side_effect=self.fake_read))
        original_sha = candidate.custody.sha256
        # Only the generated fixture receipt's hash is bridged. Real identity
        # rejection is tested independently below; this exercises inner guards.
        self.stack.enter_context(patch.object(candidate.custody, 'sha256',
            side_effect=lambda raw: candidate.PREREQUISITE_SHA256
            if raw == self.receipt else original_sha(raw)))
        self.stack.enter_context(patch.object(candidate.custody, '_receipt_path',
            side_effect=lambda path: Path('/FAKE') / path))
        self.stack.enter_context(patch.object(candidate.custody, '_output_directory',
            side_effect=lambda path: self.events.append('output') or 998))
        self.absent = self.stack.enter_context(patch.object(candidate.custody,
            '_absent_at', side_effect=lambda *args: self.events.append('absent')))
        self.stack.enter_context(patch.object(candidate.predecessor.header_diagnostic,
            '_validate_capture', side_effect=lambda raw: self.events.append('capture_checked')))
        self.verify = self.stack.enter_context(patch.object(candidate.custody,
            '_verify_source', side_effect=lambda *args: self.events.append('identity') or {}))
        self.writer = self.stack.enter_context(patch.object(candidate.custody,
            '_write_at', side_effect=self.fake_write))
        self.closer = self.stack.enter_context(patch.object(candidate.custody.os,
            'close', side_effect=lambda fd: self.events.append('close')))
        for name in ('urllib.request.urlopen', 'socket.create_connection',
                     'subprocess.run', 'zipfile.ZipFile.open', 'zipfile.ZipFile.read'):
            self.stack.enter_context(patch(name, side_effect=AssertionError('forbidden IO')))

    def fake_read(self, path, cap):
        if path == candidate.PREREQUISITE:
            self.events.append('public')
            self.assertEqual(cap, 65536)
            return self.receipt
        if path == candidate.custody.CAPTURE:
            self.events.append('capture')
            return b'SYNTHETIC_CAPTURE'
        if path == candidate.custody.OBJECT:
            self.events.append('raw')
            self.assertEqual(cap, candidate.custody.SOURCE_BYTES)
            return self.raw
        raise AssertionError('unexpected source path')

    def fake_write(self, fd, name, raw):
        self.events.append('write')
        self.writes.append(raw)

    def test_exact_order_and_same_buffer_shape(self):
        original = candidate.predecessor._inspect
        def inspect(raw, report):
            self.assertIs(raw, self.raw)
            self.events.append('g29')
            return original(raw, report)
        with patch.object(candidate.predecessor, '_inspect', side_effect=inspect):
            report = candidate.diagnose('1')
        self.assertEqual(report['reason'], 'GROWTH_HINT_SHAPE_MATCH')
        self.assertEqual(self.events, ['guard', 'public', 'output', 'absent',
            'capture', 'capture_checked', 'raw', 'identity', 'g29', 'write', 'close'])
        self.assertEqual(report['production_prerequisite_status'], 'VERIFIED')
        self.assertEqual(report['schema'], candidate.PRODUCTION_SCHEMA)
        self.assertTrue(report['source_identity_verified'])
        self.assertEqual(report['status'], 'BLOCKED_SCHEMA')
        self.assertFalse(report['archive_acceptance_established'])
        self.assertEqual(self.writes, [candidate.custody.canonical(report)])
        self.assertNotIn('field_headers', report)

    def test_invalid_run_stops_before_all_dependencies(self):
        for run in ('0', '3', '../1', 1, True, None):
            report = candidate.diagnose(run)
            self.assertEqual(report['reason'], 'CLI_ARGUMENT_INVALID')
        self.assertEqual(self.events, [])

    def test_invalid_public_identity_stops_before_output_or_private_reads(self):
        self.read.side_effect = lambda *args: b'PUBLIC_CANARY_NOT_THE_FIXED_RECEIPT'
        report = candidate.diagnose('1')
        self.assertEqual(report['reason'], 'GROWTH_PREREQUISITE_INVALID')
        self.assertEqual(self.events, ['guard'])
        self.assertFalse(report['exposure']['raw_buffer_read_started'])

    def test_existing_slot_stops_before_capture_and_raw(self):
        self.absent.side_effect = candidate.custody.CustodyError('OUTPUT_CONFLICT')
        report = candidate.diagnose('2')
        self.assertEqual(report['status'], 'BLOCKED_GUARD')
        self.assertNotIn('capture', self.events)
        self.assertNotIn('raw', self.events)
        self.assertEqual(self.events[-1], 'close')

    def test_capture_failure_never_starts_raw_read(self):
        original_read = self.fake_read
        def read(path, cap):
            if path == candidate.custody.CAPTURE:
                raise RuntimeError('PRIVATE_CAPTURE_EXCEPTION_CANARY')
            return original_read(path, cap)
        self.read.side_effect = read
        report = candidate.diagnose('1')
        self.assertEqual(report['reason'], 'INTERNAL_FAILURE')
        self.assertFalse(report['exposure']['raw_buffer_read_started'])
        self.assertNotIn('PRIVATE_CAPTURE_EXCEPTION_CANARY', json.dumps(report))

    def test_partial_raw_read_preserves_unknown_exposure(self):
        original_read = self.fake_read
        def read(path, cap):
            if path == candidate.custody.OBJECT:
                raise RuntimeError('PRIVATE_PARTIAL_READ_CANARY')
            return original_read(path, cap)
        self.read.side_effect = read
        report = candidate.diagnose('1')
        self.assertTrue(report['exposure']['raw_buffer_read_started'])
        self.assertFalse(report['exposure']['raw_buffer_read_completed'])
        self.assertIsNone(report['exposure']['target_bearing_source_bytes_read'])
        self.assertFalse(report['source_identity_verified'])
        self.assertEqual(self.writes, [])

    def test_raw_identity_failure_prevents_predecessor_and_payload(self):
        self.verify.side_effect = candidate.custody.CustodyError('SOURCE_SHA256_MISMATCH')
        with patch.object(candidate.predecessor, '_inspect',
                          side_effect=AssertionError('must not inspect')) as inspect:
            report = candidate.diagnose('1')
        inspect.assert_not_called()
        self.assertTrue(report['exposure']['raw_buffer_read_completed'])
        self.assertTrue(report['exposure']['target_bearing_source_bytes_read'])
        self.assertFalse(report['source_identity_verified'])
        self.assertFalse(report['exposure']['growth_hint_payload_interpretation_started'])

    def test_same_buffer_field_disagreement_blocks_before_payload(self):
        for extra in (hint(), hint(0, b'\0' * 511), hint() + hint(),
                      record(b'\0' * 516, 0xFFFF)):
            with self.subTest(size=len(extra)):
                self.raw = archive([extra])
                report = candidate.diagnose('1')
                self.assertEqual(report['reason'], 'GROWTH_PREDECESSOR_FIELDS_MISMATCH')
                self.assertFalse(report['exposure']['growth_hint_payload_interpretation_started'])
                self.assertIsNone(report['signature_matches'])

    def test_predecessor_failure_never_promotes_stale_success(self):
        self.raw = b'NOT_A_ZIP'
        report = candidate.diagnose('1')
        self.assertEqual(report['reason'], 'GROWTH_PREDECESSOR_BLOCKED')
        self.assertNotEqual(report['predecessor_reason'], 'LOCAL_EXTRA_HEADERS_COMPLETE')
        self.assertFalse(report['exposure']['growth_hint_payload_interpretation_started'])
        self.assertEqual(report['status'], 'BLOCKED_SCHEMA')

    def test_write_failure_retains_payload_exposure_but_clears_shape(self):
        self.writer.side_effect = RuntimeError('WRITE_CANARY')
        report = candidate.diagnose('1')
        self.assertEqual(report['status'], 'BLOCKED_GUARD')
        self.assertTrue(report['exposure']['growth_hint_payload_interpretation_completed'])
        self.assertIsNone(report['signature_matches'])
        self.assertEqual(report['growth_hint_shape'], 'NOT_ESTABLISHED')
        self.assertNotIn('WRITE_CANARY', json.dumps(report))

    def test_close_failure_does_not_rewrite_successful_receipt(self):
        self.closer.side_effect = RuntimeError('CLOSE_CANARY')
        report = candidate.diagnose('1')
        self.assertEqual(report['status'], 'BLOCKED_GUARD')
        self.assertEqual(report['reason'], 'INTERNAL_FAILURE')
        self.assertTrue(report['exposure']['growth_hint_padding_scan_completed'])
        self.assertIsNone(report['padding_all_zero'])
        self.assertEqual(len(self.writes), 1)
        self.assertEqual(json.loads(self.writes[0])['reason'], 'GROWTH_HINT_SHAPE_MATCH')
        self.assertNotEqual(self.writes[0], candidate.custody.canonical(report))


class GuardValidationTests(unittest.TestCase):
    def test_unbound_source_path_rejected_before_predecessor_or_io(self):
        with patch.object(candidate, '__file__', str(ROOT / '.cache/ignored.py')), \
             patch.object(candidate.predecessor, 'production_context') as prior, \
             patch.object(candidate.custody, '_read_relative') as read, \
             patch.object(candidate.subprocess, 'run') as git:
            with self.assertRaisesRegex(candidate.custody.CustodyError,
                                        '^FROZEN_SOURCE_REQUIRED$'):
                candidate.production_context()
        prior.assert_not_called()
        read.assert_not_called()
        git.assert_not_called()

    def test_source_guard_checks_own_four_index_commit_and_head(self):
        prior = prior_identity('a' * 40)
        calls = []
        def git(command, **kwargs):
            self.assertEqual(kwargs['timeout'], 15)
            self.assertTrue(kwargs['check'])
            calls.append(command)
            if command[1:] == ['rev-parse', '--show-prefix']:
                return SimpleNamespace(stdout=b'discovery/\n')
            if command[1:] == ['rev-parse', 'HEAD']:
                return SimpleNamespace(stdout=(prior['commit'] + '\n').encode())
            return SimpleNamespace(stdout=b'SYNTHETIC_OWN_FILE')
        with patch.object(candidate, '__file__', str(ROOT / candidate.FROZEN_PATHS[0])), \
             patch.object(candidate.predecessor, 'production_context', return_value=prior), \
             patch.object(candidate.custody, '_read_relative', return_value=b'SYNTHETIC_OWN_FILE'), \
             patch.object(candidate.subprocess, 'run', side_effect=git):
            result = candidate.production_context()
        self.assertEqual(len(calls), 10)
        self.assertEqual(set(result['files']), set(candidate.FROZEN_PATHS))
        self.assertEqual(result['local_extra_files'], prior['files'])
        result['local_extra_files'].clear()
        self.assertEqual(prior['files'], candidate.EXPECTED_PRIOR_GROUPS['files'])

    def test_source_guard_rejects_drift_and_wrong_prior_without_private_reads(self):
        for mode in ('prior', 'index', 'head'):
            with self.subTest(mode=mode):
                prior = prior_identity('a' * 40)
                if mode == 'prior':
                    prior['files'] = {}
                def git(command, **kwargs):
                    if command[1:] == ['rev-parse', '--show-prefix']:
                        return SimpleNamespace(stdout=b'discovery/\n')
                    if command[1:] == ['rev-parse', 'HEAD']:
                        return SimpleNamespace(stdout=b'b' * 40 + b'\n')
                    raw = b'FILE'
                    if mode == 'index' and command[2].startswith(':'):
                        raw = b'DRIFT'
                    return SimpleNamespace(stdout=raw)
                with patch.object(candidate, '__file__', str(ROOT / candidate.FROZEN_PATHS[0])), \
                     patch.object(candidate.predecessor, 'production_context', return_value=prior), \
                     patch.object(candidate.custody, '_read_relative', return_value=b'FILE'), \
                     patch.object(candidate.subprocess, 'run', side_effect=git):
                    with self.assertRaisesRegex(candidate.custody.CustodyError,
                                                '^FROZEN_SOURCE_REQUIRED$'):
                        candidate.production_context()

    def test_fixed_prerequisite_hash_and_types_fail_closed(self):
        for raw in (b'{}\n', b'', b'x' * 65537, '', bytearray(b'{}')):
            with self.assertRaisesRegex(candidate.GrowthHintError,
                                        '^GROWTH_PREREQUISITE_INVALID$'):
                candidate._validate_prerequisite(raw)

    def test_prerequisite_inner_semantics_under_explicit_hash_stub(self):
        value = prerequisite_fixture()
        cases = [value]
        for mutator in (
            lambda v: v.update(source_identity_verified=1),
            lambda v: v.update(synthetic_fixture=0),
            lambda v: v.update(status='PASS'),
            lambda v: v['implementation'].update(commit='0' * 40),
            lambda v: v['implementation'].update(extra={}),
            lambda v: v['implementation']['files'].clear(),
            lambda v: v.update(field_headers=[{'header_id': 41504.0, 'data_size': 516}]),
            lambda v: v.update(field_headers=[{'header_id': 41504, 'data_size': 515}]),
            lambda v: v['exposure'].update(local_extra_payload_interpreted=True),
            lambda v: v['exposure'].update(raw_buffer_read_completed=1),
            lambda v: v['exposure'].update(archive_close_error='LEAK_CANARY'),
            lambda v: v['exposure'].update(members_decompressed=['CANARY'])):
            changed = copy.deepcopy(value)
            mutator(changed)
            cases.append(changed)
        with patch.object(candidate.custody, 'sha256', return_value=candidate.PREREQUISITE_SHA256):
            self.assertEqual(candidate._validate_prerequisite(candidate.custody.canonical(cases[0])),
                             candidate.PREREQUISITE_SHA256)
            for changed in cases[1:]:
                with self.assertRaisesRegex(candidate.GrowthHintError,
                                            '^GROWTH_PREREQUISITE_INVALID$'):
                    candidate._validate_prerequisite(candidate.custody.canonical(changed))
            with self.assertRaises(candidate.GrowthHintError):
                candidate._validate_prerequisite(json.dumps(value).encode())

    def test_cli_errors_have_no_argument_or_exception_echo(self):
        for args in (['CANARY_ACTION'], ['diagnose', '--run', 'CANARY_SLOT']):
            out = io.StringIO()
            with patch('sys.stdout', out), patch.object(candidate, 'diagnose') as diagnose:
                status = candidate.main(args)
            diagnose.assert_not_called()
            self.assertEqual(status, 2)
            value = json.loads(out.getvalue())
            self.assertEqual(value['reason'], 'CLI_ARGUMENT_INVALID')
            self.assertNotIn('CANARY', out.getvalue())


if __name__ == '__main__':
    unittest.main()
