"""Author synthetic checks; no actual archive, production guard or network."""
from contextlib import ExitStack
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import struct
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
    names = names or [f'item{i}.xml'.encode() for i in range(len(extras))]
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
                              names=[b'NAME_CANARY.xml'], body=b'CELL_CANARY')
        raw = json.dumps(result, sort_keys=True)
        for token in ('PAYLOAD_CANARY', 'NAME_CANARY', 'CELL_CANARY', '59117'):
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

    def test_no_production_interface_and_detached_reports(self):
        self.assertIsNone(candidate.PRODUCTION_PREREQUISITE)
        for name in ('production_context', 'diagnose', 'capture', 'main'):
            self.assertFalse(hasattr(candidate, name))
        first = self.inspect(hint())
        first['source'].clear()
        first['exposure'].clear()
        second = self.inspect(hint())
        self.assertTrue(second['source'])
        self.assertTrue(second['exposure']['growth_hint_fixed_words_interpreted'])
        self.assertIsNone(candidate.PRODUCTION_PREREQUISITE)


if __name__ == '__main__':
    unittest.main()
