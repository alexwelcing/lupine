"""Synthetic public receipts only; no experimental source/cache access."""
from contextlib import ExitStack, redirect_stdout
from copy import deepcopy
from hashlib import md5, sha256
import importlib.util
import io
import json
import os
from pathlib import Path
import socket
import tempfile
import unittest
import urllib.request
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parent.parent / 'scripts/mpea_metadata_summary.py'
spec = importlib.util.spec_from_file_location('metadata_summary_review', SCRIPT)
s = importlib.util.module_from_spec(spec)
spec.loader.exec_module(s)


def quote(token):
    return b'"' + token.replace(b'"', b'""') + b'"' if any(c in token for c in (b',', b'"', b'\r', b'\n')) else token


def fixture(producer, rows=(), tail=b''):
    records = [producer.load_mapping()]
    for changes in rows:
        record = [b'UNREAD_OPAQUE_639' for _ in range(23)]
        defaults = {'source': b'10.1234/A', 'formula': b'FeNi', 'processing': b'CAST',
                    'test_mode': b'T', 'temperature': b'25.0'}
        for role, value in {**defaults, **changes}.items():
            record[producer.POSITIONS[role]] = value
        records.append(record)
    raw = b'\n'.join(b','.join(map(quote, record)) for record in records) + b'\n' + tail
    blob = {'bytes': len(raw), 'md5': md5(raw).hexdigest(), 'sha256': sha256(raw).hexdigest()}
    return producer.inspect_fixture(raw, expected_blob=blob)


def reseal(report):
    report['content_sha256'] = s.sha256(s.canonical_bytes({k: v for k, v in report.items() if k != 'content_sha256'}))
    return report


class MetadataSummaryReview(unittest.TestCase):
    def setUp(self):
        self.guards = ExitStack()
        self.addCleanup(self.guards.close)
        for obj, name in ((urllib.request, 'urlopen'), (urllib.request.OpenerDirector, 'open'),
                          (socket, 'create_connection')):
            self.guards.enter_context(patch.object(obj, name, side_effect=AssertionError('network forbidden')))
        self.producer = s.load_validator()
        self.guards.enter_context(patch.object(self.producer, 'extract_cache', side_effect=AssertionError('cache forbidden')))
        self.guards.enter_context(patch.object(s, 'load_validator', return_value=self.producer))

    def summary(self, report):
        return s.summarize_bytes(s.canonical_bytes(report))

    def test_independent_every_row_oracle_duplicates_unknowns_modes_and_combinations(self):
        unknown = {role: b'NR' for role in s.ROLES}
        report = fixture(self.producer, [{}, {}, {'temperature': b'25.00'},
            {'source': b'10.1234/B', 'formula': b'NiFe', 'test_mode': b'C',
             'processing': b'ANNEAL', 'temperature': b'-0.5'},
            {**unknown, 'temperature': b'9' * 65}, unknown])
        result = self.summary(report)
        counts = result['counts']
        self.assertEqual(result['row_denominator'], 6)
        self.assertEqual(counts['role_status_counts'], {
            'source': {'TOKEN_GROUP': 4, 'UNRESOLVED': 2},
            'formula': {'TOKEN_GROUP': 4, 'UNRESOLVED': 2},
            'test_mode': {'KNOWN': 4, 'UNRESOLVED': 2},
            'processing': {'KNOWN': 4, 'UNRESOLVED': 2},
            'temperature': {'KNOWN': 4, 'UNRESOLVED': 1, 'UNRESOLVED_LIMIT': 1}})
        for role in ('source', 'formula'):
            value = counts['lexical_token_groups'][role]
            self.assertEqual((value['rows_total'], value['assigned_rows'], value['unresolved_rows'], value['group_count']), (6, 4, 2, 2))
            self.assertEqual(value['groups'], [{'group_id': 0, 'rows': 3}, {'group_id': 1, 'rows': 1}])
            self.assertEqual(value['size_histogram'], [{'rows_per_group': 1, 'groups': 1}, {'rows_per_group': 3, 'groups': 1}])
        self.assertEqual(counts['categories']['test_mode'], {'rows_total': 6, 'known': {'T': 3, 'C': 1}, 'unresolved_rows': 2})
        self.assertEqual(counts['categories']['processing']['known'], {'CAST': 3, 'POWDER': 0, 'WROUGHT': 0, 'ANNEAL': 1, 'OTHER': 0})
        self.assertEqual(counts['test_temperature']['exact_value_histogram'], [
            {'numerator': '-1', 'denominator': '2', 'unit': 'degC', 'rows': 1, 'spellings': [{'decimal': '-0.5', 'rows': 1}]},
            {'numerator': '25', 'denominator': '1', 'unit': 'degC', 'rows': 3,
             'spellings': [{'decimal': '25.0', 'rows': 2}, {'decimal': '25.00', 'rows': 1}]}])
        combinations = counts['declared_five_role_combinations']
        self.assertEqual(len(combinations), 5)
        self.assertEqual(sorted(row['rows'] for row in combinations), [1, 1, 1, 1, 2])
        for role, states in counts['role_status_counts'].items():
            for state, count in states.items():
                self.assertEqual(sum(item['rows'] for item in combinations if item['metadata'][role]['status'] == state), count)
        self.assertFalse(result['scope']['eligibility_decisions'])
        self.assertFalse(result['scope']['physical_readiness_established'])

    def test_exact_lexical_groups_stay_distinct_without_raw_token_export(self):
        report = fixture(self.producer, [
            {'formula': b'FeNi', 'source': b'10.1234/A'},
            {'formula': b'NiFe', 'source': b'https://doi.org/10.1234/A'},
            {'formula': b'Fe1Ni', 'source': b'10.1234/a'},
            {'formula': b'FeNi', 'source': b'10.1234/A'}])
        result = self.summary(report)
        for role in ('source', 'formula'):
            groups = result['counts']['lexical_token_groups'][role]
            self.assertEqual(groups['groups'], [{'group_id': 0, 'rows': 2}, {'group_id': 1, 'rows': 1}, {'group_id': 2, 'rows': 1}])
            self.assertIn('lexical_token_groups', groups['kind'])
        raw = s.canonical_bytes(result)
        for token in (b'FeNi', b'NiFe', b'Fe1Ni', b'10.1234/A', b'10.1234/a', b'UNREAD_OPAQUE_639'):
            self.assertNotIn(token, raw)
            self.assertNotIn(sha256(token).hexdigest().encode(), raw)

    def test_temperature_numeric_histogram_is_exact_and_spelling_preserving(self):
        tokens = (b'.5', b'0.50', b'+00.500', b'-0', b'0.00', b'-0.125', b'1e2', b'1/2', b'25 C', b'\xff')
        result = self.summary(fixture(self.producer, [{'temperature': token} for token in tokens]))
        temp = result['counts']['test_temperature']
        self.assertEqual((temp['rows_total'], temp['known_rows'], temp['unresolved_rows']), (10, 6, 4))
        self.assertEqual([(r['numerator'], r['denominator'], r['rows']) for r in temp['exact_value_histogram']],
                         [('-1', '8', 1), ('0', '1', 2), ('1', '2', 3)])
        self.assertEqual(temp['exact_value_histogram'][2]['spellings'],
                         [{'decimal': '+00.500', 'rows': 1}, {'decimal': '.5', 'rows': 1}, {'decimal': '0.50', 'rows': 1}])
        self.assertEqual(len(result['counts']['declared_five_role_combinations']), 7)

    def test_all_unresolved_metadata_preserves_rows_without_inventing_groups(self):
        rows = [{role: token for role in s.ROLES} for token in (b'NR', b'', b'\xff\x00', b' NaN ')]
        result = self.summary(fixture(self.producer, rows))
        self.assertEqual(result['row_denominator'], 4)
        for role in s.ROLES:
            self.assertEqual(result['counts']['role_status_counts'][role]['UNRESOLVED'], 4)
        self.assertEqual(result['counts']['lexical_token_groups']['formula']['group_count'], 0)
        self.assertEqual(result['counts']['lexical_token_groups']['source']['groups'], [])
        self.assertEqual(len(result['counts']['declared_five_role_combinations']), 1)
        self.assertEqual(result['counts']['declared_five_role_combinations'][0]['rows'], 4)

    def test_empty_success_and_late_blocked_input_have_different_denominators(self):
        empty = self.summary(fixture(self.producer))
        blocked = self.summary(fixture(self.producer, [{}], tail=b'one,two\n'))
        self.assertEqual((empty['status'], empty['row_denominator']), ('PUBLIC_METADATA_COUNTS_ONLY', 0))
        self.assertEqual(empty['counts']['declared_five_role_combinations'], [])
        self.assertEqual(empty['counts']['lexical_token_groups']['source']['group_count'], 0)
        self.assertEqual((blocked['status'], blocked['input']['status']), ('UNAVAILABLE_BLOCKED_INPUT', 'BLOCKED_ROWS'))
        self.assertIsNone(blocked['row_denominator']); self.assertIsNone(blocked['counts'])

    def test_blocked_source_is_not_changed_into_zero_or_success(self):
        report = fixture(self.producer, [{}])
        report['reference']['expected_blob']['md5'] = '0' * 32
        report.update(status='BLOCKED_SOURCE', reason='SOURCE_IDENTITY_CONFLICT', rows=None, row_count=None)
        for key in ('observation_byte_framing_attempted', 'all_observation_rows_framed', 'allowed_metadata_processed', 'all_rows_preserved'):
            report['scope'][key] = False
        result = self.summary(reseal(report))
        self.assertEqual(result['input']['reason'], 'SOURCE_IDENTITY_CONFLICT')
        self.assertIsNone(result['row_denominator']); self.assertIsNone(result['counts'])

    def test_unsealed_mutation_and_resealed_invalid_claims_are_rejected(self):
        baseline = fixture(self.producer, [{}])
        bad = deepcopy(baseline); bad['rows'][0]['test_mode']['value'] = 'C'
        with self.assertRaisesRegex(s.SummaryError, 'INVALID_RECEIPT'): self.summary(bad)
        mutations = (
            lambda v: v.update(row_count=2), lambda v: v.update(row_count=True),
            lambda v: v.update(status='SCIENTIFICALLY_READY'),
            lambda v: v['observed'].update(sha256='0' * 64),
            lambda v: v['rows'][0].update(ordinal=1),
            lambda v: v['rows'][0].update(record_id='forged:0'),
            lambda v: v['rows'][0]['formula'].update(value=2),
            lambda v: v['rows'][0]['formula'].update(value=True),
            lambda v: v['rows'][0]['temperature']['value'].update(unit='K'),
            lambda v: v['rows'][0]['temperature']['value'].update(numerator='26'),
            lambda v: v['rows'][0]['temperature']['value'].update(decimal='1e2'),
            lambda v: v['rows'][0]['source'].update(raw='FORBIDDEN_PRIVATE_TOKEN'),
            lambda v: v['rows'][0]['test_mode'].update(value='\u0422'),
            lambda v: v['rows'][0]['processing'].update(value='CAST\nPRIVATE'),
            lambda v: v['scope'].update(target_presence_computed=True),
            lambda v: v['reference'].update(mapping_sha256='0' * 64),
        )
        for i, mutate in enumerate(mutations):
            bad = deepcopy(baseline); mutate(bad)
            with self.subTest(i=i), self.assertRaisesRegex(s.SummaryError, 'INVALID_RECEIPT'):
                self.summary(reseal(bad))

    def test_duplicate_rows_count_but_duplicate_record_id_is_invalid(self):
        report = fixture(self.producer, [{}, {}])
        self.assertEqual(self.summary(report)['row_denominator'], 2)
        report['rows'][1]['record_id'] = report['rows'][0]['record_id']
        with self.assertRaisesRegex(s.SummaryError, 'INVALID_RECEIPT'): self.summary(reseal(report))

    def test_json_preflight_rejects_unsafe_numbers_duplicate_keys_depth_and_encoding(self):
        for raw in (b'{"x":1,"x":2}', b'{"x":0.5}', b'{"x":NaN}', b'{"x":Infinity}',
                    b'{"x":9007199254740992}', b'{"x":' + b'[' * 32 + b'0' + b']' * 32 + b'}',
                    b'{"x":"\xff"}', b'Name,Formula\nPRIVATE,PRIVATE\n', b'[]'):
            with self.subTest(raw=raw[:30]), self.assertRaises(s.SummaryError): s.summarize_bytes(raw)
        with patch.object(s, 'MAX_DOCUMENT_BYTES', 8):
            with self.assertRaisesRegex(s.SummaryError, 'INPUT_LIMIT'): s.summarize_bytes(b'{"hello":1}')

    def test_preflight_ignores_braces_inside_valid_strings(self):
        raw = b'{"text":"[{}]\\\"[]"}'
        self.assertEqual(s._decode_report(raw), {'text': '[{}]"[]'})

    def test_input_bytes_identity_is_distinct_from_canonical_receipt_identity(self):
        report = fixture(self.producer, [{}])
        compact = s.canonical_bytes(report)
        pretty = json.dumps(report, indent=2).encode()
        first, second = s.summarize_bytes(compact), s.summarize_bytes(pretty)
        self.assertEqual(first['counts'], second['counts'])
        self.assertEqual(first['input']['content_sha256'], second['input']['content_sha256'])
        self.assertNotEqual(first['input']['file_sha256'], second['input']['file_sha256'])
        self.assertEqual(first['input']['file_sha256'], sha256(compact).hexdigest())
        self.assertEqual(first['implementation']['summarizer_sha256'], sha256(SCRIPT.read_bytes()).hexdigest())

    def test_exact_repeat_and_returned_aliases_do_not_modify_future_results(self):
        raw = s.canonical_bytes(fixture(self.producer, [{}]))
        first = s.summarize_bytes(raw)
        self.assertEqual(s.canonical_bytes(first), s.canonical_bytes(s.summarize_bytes(raw)))
        first['scope']['fits'] = 999
        first['input']['reference']['expected_blob']['sha256'] = '0' * 64
        first['counts']['categories']['test_mode']['known']['T'] = 999
        self.assertEqual(s.summarize_bytes(raw)['counts']['categories']['test_mode']['known']['T'], 1)
        self.assertEqual(s.SCOPE['fits'], 0)

    def test_validator_is_pinned_before_any_execution(self):
        real = s._read_regular
        def changed(path, cap, error):
            return b'raise AssertionError("unverified source executed")\n' if Path(path) == s.VALIDATOR_PATH else real(path, cap, error)
        # Bypass this test class's cached-validator mock to exercise original loader.
        with patch.object(s, '_read_regular', side_effect=changed):
            with self.assertRaisesRegex(s.SummaryError, 'VALIDATOR_IDENTITY_CONFLICT'):
                ORIGINAL_LOADER()

    def test_input_path_rejects_raw_cache_csv_symlink_directory_before_read(self):
        with patch.object(s, '_read_regular', side_effect=AssertionError('forbidden input opened')):
            for path in (s.ROOT / '.cache/mpea-custody/renamed.json', Path('/tmp/not-a-report.csv')):
                with self.assertRaisesRegex(s.SummaryError, 'INPUT_PATH_INVALID'): s.summarize_file(path)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); original = root / 'original.json'
            original.write_bytes(s.canonical_bytes(fixture(self.producer, [{}])))
            (root / 'link.json').symlink_to(original)
            (root / 'folder.json').mkdir()
            for path in (root / 'link.json', root / 'folder.json'):
                with self.assertRaises(s.SummaryError): s.summarize_file(path)

    def test_file_replacement_after_read_cannot_change_hashed_or_summarized_bytes(self):
        first = s.canonical_bytes(fixture(self.producer, [{}]))
        second = s.canonical_bytes(fixture(self.producer, [{}, {}]))
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'report.json'; path.write_bytes(first)
            real = s._read_regular
            def replace_after_read(input_path, cap, error):
                captured = real(input_path, cap, error)
                if input_path == path: path.write_bytes(second)
                return captured
            with patch.object(s, '_read_regular', side_effect=replace_after_read): result = s.summarize_file(path)
            self.assertEqual(result['row_denominator'], 1)
            self.assertEqual(result['input']['file_sha256'], sha256(first).hexdigest())
            self.assertEqual(path.read_bytes(), second)

    def test_atomic_sink_idempotent_conflicts_symlinks_and_late_failure(self):
        summary = self.summary(fixture(self.producer, [{}]))
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); path = root / 'summary.json'
            s.write_summary(summary, path); first = path.read_bytes()
            s.write_summary(summary, path); self.assertEqual(path.read_bytes(), first)
            with self.assertRaisesRegex(s.SummaryError, 'OUTPUT_CONFLICT'):
                s.write_summary(self.summary(fixture(self.producer, [{}, {}])), path)
            self.assertEqual(path.read_bytes(), first)
            (root / 'link.json').symlink_to(path)
            with self.assertRaisesRegex(s.SummaryError, 'OUTPUT_CONFLICT'): s.write_summary(summary, root / 'link.json')
            for name in ('fsync', 'link'):
                with patch.object(s.os, name, side_effect=OSError('PRIVATE_FAILURE')):
                    with self.assertRaisesRegex(s.SummaryError, 'OUTPUT_CONFLICT'):
                        s.write_summary(summary, root / 'failed.json')
                self.assertFalse((root / 'failed.json').exists())
                self.assertEqual(sorted(p.name for p in root.iterdir()), ['link.json', 'summary.json'])

    def test_summary_sink_rejects_changed_seal_and_escapes_nonascii(self):
        summary = self.summary(fixture(self.producer, [{}]))
        summary['row_denominator'] = 5
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'bad.json'
            with self.assertRaisesRegex(s.SummaryError, 'OUTPUT_CONFLICT'): s.write_summary(summary, path)
            self.assertFalse(path.exists())
        self.assertEqual(s.canonical_bytes({'x': '\u2028\x00'}), b'{"x":"\\u2028\\u0000"}\n')

    def test_cli_success_blocked_and_sanitized_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for report, expected in ((fixture(self.producer, [{}]), 0), (fixture(self.producer, [{}], tail=b'bad\n'), 2)):
                path = root / ('in' + str(expected) + '.json'); path.write_bytes(s.canonical_bytes(report))
                output = root / ('out' + str(expected) + '.json')
                with redirect_stdout(io.StringIO()) as stream:
                    self.assertEqual(s.main(['--input', str(path), '--output', str(output)]), expected)
                self.assertTrue(output.exists()); self.assertIn('summary_sha256', json.loads(stream.getvalue()))
            with redirect_stdout(io.StringIO()) as stream:
                self.assertEqual(s.main(['--input', 'PRIVATE.csv', '--output', str(root / 'fail.json')]), 2)
            self.assertEqual(json.loads(stream.getvalue()), {'status': 'BLOCKED', 'reason': 'INPUT_PATH_INVALID'})
            self.assertFalse((root / 'fail.json').exists())
            self.assertNotIn('PRIVATE', stream.getvalue())


ORIGINAL_LOADER = s.load_validator
if __name__ == '__main__':
    unittest.main()
