"""Independent synthetic-only review; never open the real MPEA cache."""
from contextlib import redirect_stdout, redirect_stderr
from copy import deepcopy
from hashlib import md5, sha256
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
import urllib.request
from unittest.mock import patch


ROOT = next(p for p in Path(__file__).resolve().parents
            if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/mpea_header_labels.py'
spec = importlib.util.spec_from_file_location('mpea_header_labels_independent_review', SCRIPT)
m = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = m
with patch.object(urllib.request.OpenerDirector, 'open', side_effect=AssertionError('network forbidden')):
    spec.loader.exec_module(m)

KNOWN = frozenset({'PROPERTY: Type of phases', 'PROPERTY: Type of test',
                   'PROPERTY: Elongation (%)', 'DOI', 'FORMULA', 'YS (MPa)',
                   'UTS (MPa)', 'Elongation (%)'})
BODY = b'\xff\xfe\x00"malformed,PRIVATE_BODY_873641.993\n'


def identity(raw):
    return {'bytes': len(raw), 'md5': md5(raw).hexdigest(), 'sha256': sha256(raw).hexdigest()}


def redacted(tokens, *, bom=False, terminator='LF'):
    return {'column_count': len(tokens), 'bom': bom, 'terminator': terminator,
            'columns': [{'position': i, 'status': 'RECOGNIZED' if token in KNOWN else 'UNKNOWN_COLUMN',
                         'token': token if token in KNOWN else None} for i, token in enumerate(tokens)]}


def inspect(raw, tokens, **kwargs):
    return m.inspect_fixture(raw, expected_blob=identity(raw), initial_header=redacted(tokens, **kwargs))


def reseal(report):
    report['content_sha256'] = m.sha256(m.canonical_bytes({k: v for k, v in report.items() if k != 'content_sha256'}))
    return report


class HeaderLabelsIndependentReview(unittest.TestCase):
    def setUp(self):
        self.network = patch.object(urllib.request.OpenerDirector, 'open', side_effect=AssertionError('network forbidden'))
        self.network.start()
        self.addCleanup(self.network.stop)

    def assert_no_scientific_promotion(self, report):
        self.assertTrue(m.validate_public_report(report))
        self.assertEqual(report['status'], 'BLOCKED_SCHEMA')
        self.assertEqual(report['reason'], 'SCHEMA_UNCONFIRMED')
        for key in ('data_rows_decoded', 'row_metadata_extracted', 'target_numeric_validity_checked',
                    'full_schema_established', 'scientific_eligibility_decisions'):
            self.assertIs(report['scope'][key], False)
        self.assertIsNone(report['scope']['row_count'])
        self.assertIsNone(report['scope']['numeric_completeness'])
        self.assertEqual((report['scope']['fits'], report['scope']['splits']), (0, 0))
        self.assertNotIn('PRIVATE_BODY_', m.canonical_bytes(report).decode('ascii'))

    def test_logical_first_record_and_escaped_unicode_are_disclosed_without_body_decode(self):
        tokens = ['DOI', 'unknown,comma', 'unknown\nline', 'unknown\r\nline', 'quote"slash\\🌲', '<script>header</script>']
        header = 'DOI,"unknown,comma","unknown\nline","unknown\r\nline","quote""slash\\🌲",<script>header</script>\r\n'
        raw = header.encode() + BODY
        report = inspect(raw, tokens, terminator='CRLF')
        self.assert_no_scientific_promotion(report)
        self.assertEqual([row['token'] for row in report['header']['columns']], tokens)
        public = m.canonical_bytes(report)
        self.assertTrue(public.isascii())
        self.assertNotIn('🌲'.encode(), public)
        self.assertIn(b'unknown\\nline', public)
        self.assertEqual(json.loads(public)['header'], report['header'])

    def test_bom_eof_and_full_recognized_header_remain_schema_blocked(self):
        cases = [(b'\xef\xbb\xbfDOI,FORMULA\r\n' + BODY, ['DOI', 'FORMULA'], True, 'CRLF'),
                 (b'DOI,FORMULA', ['DOI', 'FORMULA'], False, 'EOF'),
                 ((','.join(sorted(KNOWN)) + '\n').encode() + BODY, sorted(KNOWN), False, 'LF')]
        for raw, tokens, bom, terminator in cases:
            with self.subTest(terminator=terminator, bom=bom):
                self.assert_no_scientific_promotion(inspect(raw, tokens, bom=bom, terminator=terminator))

    def test_whole_body_size_md5_and_sha_must_match_before_scanner(self):
        raw = b'DOI,synthetic_unknown\n' + BODY
        parser = m.load_parser()
        expected = identity(raw)
        changes = [('bytes', expected['bytes'] + 1), ('md5', '0' * 32), ('sha256', '0' * 64)]
        with patch.object(m, 'load_parser', return_value=parser), \
             patch.object(parser, 'scan_header', side_effect=AssertionError('unverified blob reached scanner')) as scanner:
            for key, value in changes:
                wrong = dict(expected); wrong[key] = value
                report = m.inspect_fixture(raw, expected_blob=wrong, initial_header=redacted(['DOI', 'synthetic_unknown']))
                self.assertEqual(report['status'], 'BLOCKED_SOURCE')
                self.assertIsNone(report['header'])
                self.assertIs(report['scope']['header_decode_attempted'], False)
            changed_body = raw[:-1] + b'x'
            report = m.inspect_fixture(changed_body, expected_blob=expected, initial_header=redacted(['DOI', 'synthetic_unknown']))
            self.assertEqual(report['status'], 'BLOCKED_SOURCE')
            scanner.assert_not_called()

    def test_initial_redacted_record_mismatch_never_discloses_labels(self):
        raw = b'DOI,synthetic_unknown\n' + BODY
        variants = [redacted(['FORMULA', 'synthetic_unknown']), redacted(['DOI', 'synthetic_unknown'], bom=True),
                    redacted(['DOI', 'synthetic_unknown'], terminator='CRLF'), redacted(['DOI'])]
        for initial in variants:
            report = m.inspect_fixture(raw, expected_blob=identity(raw), initial_header=initial)
            self.assertEqual(report['status'], 'BLOCKED_HEADER')
            self.assertEqual(report['reason'], 'INITIAL_HEADER_MISMATCH')
            self.assertIsNone(report['header'])
            self.assertNotIn('synthetic_unknown', m.canonical_bytes(report).decode())

    def test_malformed_header_fails_closed_without_body_or_partial_label_output(self):
        for header in (b'DOI,DOI\n', b'DOI,,FORMULA\n', b'"DOI"junk,FORMULA\n',
                       b'DOI,\xff\n', b'DOI,\x00\n', b'"never closes\n', b'DOI\rFORMULA\n'):
            report = m.inspect_fixture(header + BODY, expected_blob=identity(header + BODY), initial_header=redacted(['DOI', 'unknown']))
            self.assertEqual(report['status'], 'BLOCKED_HEADER')
            self.assertIsNone(report['header'])
            self.assertIs(report['scope']['first_record_labels_disclosed'], False)

    def test_synthetic_entry_point_refuses_real_source_identity_before_parser_import(self):
        expected = identity(b'DOI\n'); expected['sha256'] = m.SOURCE_SHA256
        with patch.object(m, 'load_parser', side_effect=AssertionError('real identity reached parser')):
            with self.assertRaisesRegex(m.DisclosureError, 'SOURCE_IDENTITY_CONFLICT'):
                m.inspect_fixture(b'DOI\n', expected_blob=expected, initial_header=redacted(['DOI']))

    def test_production_gate_precedes_parser_receipts_and_any_cache_access(self):
        with patch.object(m, 'frozen_source_identity', side_effect=m.DisclosureError('FROZEN_SOURCE_REQUIRED')), \
             patch.object(m, 'load_parser', side_effect=AssertionError('parser opened before gate')), \
             patch.object(m, '_bounded_file', side_effect=AssertionError('file read before gate')):
            with self.assertRaisesRegex(m.DisclosureError, 'FROZEN_SOURCE_REQUIRED'):
                m.disclose_cache('/definitely-not-a-real-cache')

    def test_pinned_receipt_failure_precedes_cache_resolution(self):
        parser = m.load_parser()
        with patch.object(m, 'frozen_source_identity', return_value={'unused': 'synthetic control'}), \
             patch.object(m, 'load_parser', return_value=parser), \
             patch.object(m, 'verify_initial_receipts', side_effect=m.DisclosureError('INITIAL_RECEIPT_CONFLICT')), \
             patch.object(parser, 'cache_root', side_effect=AssertionError('cache touched before receipt check')):
            with self.assertRaisesRegex(m.DisclosureError, 'INITIAL_RECEIPT_CONFLICT'):
                m.disclose_cache('/definitely-not-a-real-cache')

    def test_production_cache_read_uses_exact_one_byte_sentinel_bound_once(self):
        parser = m.load_parser()
        raw = b'DOI,synthetic_unknown\n' + BODY
        reads = []
        class RecordingBytes(io.BytesIO):
            def read(self, size=-1):
                reads.append(size)
                return super().read(size)
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / 'constructed.csv'
            destination.write_bytes(raw)
            with patch.object(m, 'frozen_source_identity', return_value={'unused': 'synthetic control'}), \
                 patch.object(m, 'load_parser', return_value=parser), \
                 patch.object(m, 'verify_initial_receipts', return_value={'unused': 'synthetic reference'}), \
                 patch.object(parser, 'cache_root', return_value=Path(directory)), \
                 patch.object(parser, '_object_path', return_value=destination), \
                 patch.object(Path, 'open', return_value=RecordingBytes(raw)) as opened, \
                 patch.object(m, '_inspect', side_effect=lambda captured, *_: captured):
                observed = m.disclose_cache(directory)
            self.assertEqual(observed, raw)
            self.assertEqual(reads, [m.SOURCE_BYTES + 1])
            opened.assert_called_once_with('rb')

    def test_parser_source_hash_is_checked_before_any_source_execution(self):
        malicious = b'raise AssertionError("unverified parser executed")\n'
        with patch.object(m, '_bounded_file', return_value=malicious):
            with self.assertRaisesRegex(m.DisclosureError, 'PARSER_IDENTITY_CONFLICT'):
                m.load_parser()

    def test_resealed_flags_counts_and_extra_payload_channels_are_rejected(self):
        original = inspect(b'DOI,synthetic_unknown\n' + BODY, ['DOI', 'synthetic_unknown'])
        cases = []
        for key, value in [('data_rows_decoded', True), ('full_schema_established', True),
                           ('scientific_eligibility_decisions', True), ('fits', False),
                           ('row_count', 0), ('numeric_completeness', {'secret': 'body'}),
                           ('initial_receipts_verified', True)]:
            changed = deepcopy(original); changed['scope'][key] = value; cases.append(changed)
        changed = deepcopy(original); changed['header']['column_count'] = True; cases.append(changed)
        changed = deepcopy(original); changed['header']['columns'][0]['position'] = False; cases.append(changed)
        changed = deepcopy(original); changed['header']['columns'][0]['body'] = 'arbitrary'; cases.append(changed)
        changed = deepcopy(original); changed['observed']['bytes'] = True; cases.append(changed)
        changed = deepcopy(original); changed['status'] = 'READY'; cases.append(changed)
        for changed in cases:
            with self.assertRaisesRegex(m.DisclosureError, 'PUBLIC_SCHEMA_INVALID'):
                m.validate_public_report(reseal(changed))

    def test_public_write_is_escaped_idempotent_and_refuses_conflict_and_symlink(self):
        original = inspect(b'DOI,"synthetic\nlabel"\n' + BODY, ['DOI', 'synthetic\nlabel'])
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / 'report.json'
            m.write_public(original, path)
            first = path.read_bytes()
            self.assertTrue(first.isascii())
            self.assertEqual(json.loads(first), original)
            m.write_public(original, path)
            self.assertEqual(path.read_bytes(), first)
            path.write_bytes(b'preserved previous report')
            with self.assertRaisesRegex(m.DisclosureError, 'PUBLIC_OUTPUT_CONFLICT'):
                m.write_public(original, path)
            self.assertEqual(path.read_bytes(), b'preserved previous report')
            alias = Path(temporary) / 'alias.json'; alias.symlink_to(path)
            with self.assertRaisesRegex(m.DisclosureError, 'PUBLIC_OUTPUT_CONFLICT'):
                m.write_public(original, alias)

    def test_cli_never_prints_labels_cache_paths_or_arbitrary_exception_text(self):
        canary = 'PRIVATE_EXCEPTION_OR_PATH_556729'
        for error in (RuntimeError(canary), m.DisclosureError(canary), m.DisclosureError('CACHE_MISSING')):
            out, err = io.StringIO(), io.StringIO()
            with patch.object(m, 'disclose_cache', side_effect=error), redirect_stdout(out), redirect_stderr(err):
                code = m.main(['--cache', '/' + canary, '--output', '/' + canary])
            self.assertEqual(code, 2)
            self.assertNotIn(canary, out.getvalue() + err.getvalue())
            self.assertEqual(json.loads(out.getvalue())['status'], 'BLOCKED')


if __name__ == '__main__':
    unittest.main()
