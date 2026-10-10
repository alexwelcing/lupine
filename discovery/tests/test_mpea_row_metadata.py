"""Synthetic author tests; never open the experimental cache."""
import contextlib
import copy
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve()
ROOT = next(p for p in HERE.parents if p.name == "discovery" and (p / "AGENTS.md").is_file())
SOURCE = (HERE.parent.parent / "scripts/mpea_row_metadata.py" if ".cache" in HERE.parts
          else ROOT / "scripts/mpea_row_metadata.py")
spec = importlib.util.spec_from_file_location("mpea_row_author", SOURCE)
m = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = m
spec.loader.exec_module(m)


def field(value):
    return b'"' + value.replace(b'"', b'""') + b'"' if any(c in value for c in (b',', b'"', b'\r', b'\n')) else value


def raw_for(rows, ending=b"\n"):
    tokens = m.load_mapping()
    return ending.join(b','.join(field(c) for c in record) for record in (tokens, *rows)) + ending


def row(**changes):
    values = [b'opaque'] * 23
    for role, token in {"source": b"10.1234/ABC", "formula": b"Fe1Ni2", "test_mode": b"T", "processing": b"CAST", "temperature": b"+025.00", **changes}.items():
        values[m.POSITIONS[role]] = token
    return values


def expected(raw):
    return {"bytes": len(raw), "md5": hashlib.md5(raw).hexdigest(), "sha256": hashlib.sha256(raw).hexdigest()}


def inspect(raw):
    return m.inspect_fixture(raw, expected_blob=expected(raw))


def reseal(report):
    report = copy.deepcopy(report)
    report.pop('content_sha256')
    report['content_sha256'] = m.sha256(m.canonical_bytes(report))
    return report


def metadata(report):
    value = copy.deepcopy(report)
    value.pop('content_sha256')
    value['reference'].pop('expected_blob')
    value.pop('observed')
    for record in value['rows'] or []:
        record['record_id'] = '<whole-source-sha>:' + str(record['ordinal'])
    return value


class ProductionMetadataTests(unittest.TestCase):
    def test_valid_all_five_roles_and_sealed_ids(self):
        raw = raw_for([row(), row(source=b"http://doi.org/10.1234/ABC", formula=b"Ni2Fe1")])
        report = inspect(raw)
        self.assertTrue(m.validate_public_report(report))
        self.assertEqual(report['status'], 'METADATA_ONLY_SCIENTIFIC_SCHEMA_UNRESOLVED')
        self.assertEqual(report['row_count'], 2)
        for i, rec in enumerate(report['rows']):
            self.assertEqual(rec['record_id'], expected(raw)['sha256'] + ':' + str(i))
            self.assertEqual(rec['source']['value'], i)
            self.assertEqual(rec['formula']['value'], i)
            self.assertEqual(rec['temperature']['value'], {'decimal': '+025.00', 'numerator': '25', 'denominator': '1', 'unit': 'degC'})
        self.assertFalse(report['scope']['full_scientific_schema_established'])

    def test_returned_report_does_not_alias_policy_or_caller_identity(self):
        raw = raw_for([row()])
        source = expected(raw)
        report = m.inspect_fixture(raw, expected_blob=source)
        original_policy = copy.deepcopy(m.PROFILE)
        original_blob = dict(m.SOURCE_BLOB)
        report['profile']['allowed_positions']['source'] = 21
        report['reference']['expected_blob']['sha256'] = '0' * 64
        self.assertEqual(m.PROFILE, original_policy)
        self.assertEqual(m.POSITIONS['source'], 20)
        self.assertEqual(source, expected(raw))
        self.assertEqual(m.SOURCE_BLOB, original_blob)
        fresh = m.inspect_fixture(raw, expected_blob=source)
        self.assertEqual(fresh['profile'], original_policy)
        self.assertEqual(fresh['reference']['expected_blob'], source)
        source['sha256'] = '1' * 64
        self.assertEqual(fresh['reference']['expected_blob'], expected(raw))
        production_reference = m._reference(m.SOURCE_BLOB)
        production_reference['expected_blob']['bytes'] = 1
        self.assertEqual(m.SOURCE_BLOB, original_blob)
        self.assertTrue(m.validate_public_report(fresh))

    def test_target_opaque_noninterference_all_eighteen_columns(self):
        baseline = metadata(inspect(raw_for([row()])))
        variants = (b'', b'NaN', b'\xff\x00\xfe', b'"target,\r\nvalue"', b'999999999e99999')
        for position in set(range(23)) - set(m.POSITIONS.values()):
            for token in variants:
                changed = row()
                changed[position] = token
                self.assertEqual(metadata(inspect(raw_for([changed]))), baseline)

    def test_markers_and_ascii_whitespace_all_unresolved(self):
        tokens = tuple(m.MARKERS) + (b' \t\r\n\v\f',)
        report = inspect(raw_for([row(**{role: token for role in m.POSITIONS}) for token in tokens]))
        for rec in report['rows']:
            for role in m.POSITIONS:
                self.assertEqual(rec[role], {'status': 'UNRESOLVED', 'value': None})

    def test_exact_groups_no_normalization_or_unknown_merge(self):
        report = inspect(raw_for([row(formula=x, source=y) for x, y in (
            (b'FeNi', b'10.1234/a'), (b'NiFe', b'https://doi.org/10.1234/a'),
            (b'FeNi', b'10.1234/a'), (b'NaN', b'no doi'), (b'NR', b'other unknown'))]))
        self.assertEqual([r['formula']['value'] for r in report['rows']], [0, 1, 0, None, None])
        self.assertEqual([r['source']['value'] for r in report['rows']], [0, 1, 0, None, None])

    def test_formula_lexical_grammar_no_arithmetic(self):
        accepted = (b'FeNi', b'Fe', b'FeFe', b'Fe0001Ni0.5', b'Na1N1', b'Og0.00000000001')
        rejected = (b'NaN', b'NR', b'Fe0', b'Fe0.0', b'Fe.5', b'Fe1.', b'Fe1e2', b'Fe(Ni)', b' FeNi', b'Xx2', b'fe', b'NaN ', b'Fe\xff')
        for value in accepted:
            self.assertTrue(m._formula(value), value)
        for value in rejected:
            self.assertFalse(m._formula(value), value)
        huge = b'Fe' + b'9' * 10000
        self.assertTrue(m._formula(huge))

    def test_doi_grammar_forms_kept_distinct(self):
        for value in (b'10.1234/a', b'10.123456789/A(B);:_.-x', b'http://doi.org/10.1234/a', b'https://dx.doi.org/10.1234/a'):
            self.assertTrue(m._doi(value), value)
        for value in (b'10.123/a', b'10.1234567890/a', b'10.1234/', b'10.1234/a b', b'HTTPS://doi.org/10.1234/a', b' 10.1234/a', b'10.1234/a\x00', b'10.1234/\xff'):
            self.assertFalse(m._doi(value), value)

    def test_temperature_exact_decimal_limits_no_exponent(self):
        tokens = (b'-0', b'.125', b'1.', b'+001.50', b'1e3', b' 25', b'25 C', b'\xff', b'1' * 65)
        report = inspect(raw_for([row(temperature=x) for x in tokens]))
        self.assertEqual([x['temperature']['status'] for x in report['rows']], ['KNOWN']*4 + ['UNRESOLVED']*4 + ['UNRESOLVED_LIMIT'])
        self.assertEqual(report['rows'][1]['temperature']['value']['denominator'], '8')
        self.assertEqual(report['rows'][3]['temperature']['value']['numerator'], '3')

    def test_invalid_utf8_allowed_metadata_unresolved_without_text_echo(self):
        report = inspect(raw_for([row(**{role: b'\xff\xfe\x00' for role in m.POSITIONS})]))
        self.assertTrue(all(report['rows'][0][r]['status'] == 'UNRESOLVED' for r in m.POSITIONS))
        self.assertNotIn('xff', m.canonical_bytes(report).decode())

    def test_group_before_other_metadata_completeness(self):
        a = inspect(raw_for([row(), row(source=b'10.1234/b', formula=b'Fe2Ni', temperature=b'bad')]))
        b = inspect(raw_for([row(temperature=b'bad'), row(source=b'10.1234/b', formula=b'Fe2Ni', processing=b'bad')]))
        self.assertEqual([(r['source'],r['formula']) for r in a['rows']], [(r['source'],r['formula']) for r in b['rows']])

    def test_late_invalid_framing_and_width_publish_no_prefix(self):
        good = raw_for([row()])
        for suffix in (b'"unclosed', b'onefield\n', b'\n'):
            report = inspect(good + suffix)
            self.assertEqual(report['status'], 'BLOCKED_ROWS')
            self.assertIsNone(report['rows'])
            self.assertIsNone(report['row_count'])
            self.assertFalse(report['scope']['allowed_metadata_processed'])

    def test_source_identity_before_frame_and_real_fixture_block(self):
        raw = raw_for([row()])
        scanner = m.load_scanner()
        with patch.object(m, 'load_scanner', return_value=scanner), patch.object(scanner, '_frame', side_effect=AssertionError('must not frame')):
            for key, value in [('bytes',len(raw)-1), ('md5','0'*32), ('sha256','0'*64)]:
                identity = expected(raw); identity[key] = value
                self.assertEqual(m.inspect_fixture(raw, expected_blob=identity)['status'], 'BLOCKED_SOURCE')
        identity = expected(raw); identity['sha256'] = m.SOURCE_SHA256
        with patch.object(m, 'load_scanner', side_effect=AssertionError('must not load')):
            with self.assertRaisesRegex(m.MetadataError, 'REAL_SOURCE_FORBIDDEN'):
                m.inspect_fixture(raw, expected_blob=identity)

    def test_production_commit_gate_before_any_cache_access(self):
        with patch.object(m, 'frozen_source_identity', side_effect=m.MetadataError('FROZEN_SOURCE_REQUIRED')), patch.object(m, '_bounded_file', side_effect=AssertionError('no reads')):
            with self.assertRaisesRegex(m.MetadataError, 'FROZEN_SOURCE_REQUIRED'):
                m.extract_cache()
        with patch.object(m, '__file__', str(ROOT / '.cache/not-a-frozen-producer.py')):
            with self.assertRaisesRegex(m.MetadataError, 'FROZEN_SOURCE_REQUIRED'):
                m.frozen_source_identity()  # An explicit uncommitted path cannot authorize itself.

    def test_scanner_source_hash_checked_before_exec(self):
        with patch.object(m, '_bounded_file', return_value=b'raise AssertionError("not executed")'):
            with self.assertRaisesRegex(m.MetadataError, 'SCANNER_IDENTITY_CONFLICT'):
                m.load_scanner()

    def test_mapping_capture_verified_before_json_parse(self):
        with patch.object(m, '_bounded_file', return_value=b'{private poison'), patch.object(m, '_json', side_effect=AssertionError('do not parse')):
            with self.assertRaisesRegex(m.MetadataError, 'MAPPING_IDENTITY_CONFLICT'):
                m.load_mapping()

    def test_closed_validator_rejects_resealed_forgeries(self):
        report = inspect(raw_for([row()]))
        edits = [lambda x: x['scope'].update(target_presence_checked=True),
                 lambda x: x['scope'].update(fits=False),
                 lambda x: x['rows'][0]['source'].update(value=True),
                 lambda x: x['rows'][0]['source'].update(value=5),
                 lambda x: x['rows'][0].update(private='doi content'),
                 lambda x: x['rows'][0]['temperature']['value'].update(numerator='24'),
                 lambda x: x.update(row_count=True),
                 lambda x: x['rows'][0].update(ordinal=False),
                 lambda x: x['reference'].update(license='fake'),
                 lambda x: x['profile']['allowed_positions'].update(source=21)]
        for edit in edits:
            altered = copy.deepcopy(report); edit(altered)
            with self.assertRaises(m.MetadataError):
                m.validate_public_report(reseal(altered))

    def test_sink_atomic_no_overwrite_no_symlinks(self):
        report = inspect(raw_for([row()]))
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); output = root/'receipt.json'
            m.write_public(report, output)
            self.assertEqual(output.read_bytes(), m.canonical_bytes(report))
            m.write_public(report, output)
            changed = inspect(raw_for([row(temperature=b'26')]))
            with self.assertRaisesRegex(m.MetadataError, 'PUBLIC_OUTPUT_CONFLICT'):
                m.write_public(changed, output)
            alias = root/'alias'; alias.symlink_to(root, target_is_directory=True)
            with self.assertRaisesRegex(m.MetadataError, 'PUBLIC_OUTPUT_CONFLICT'):
                m.write_public(report, alias/'second.json')
            self.assertEqual(list(root.glob('.mpea-metadata-*')), [])

    def test_sink_publication_failure_leaves_no_partial_destination(self):
        report = inspect(raw_for([row()]))
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)/'receipt.json'
            with patch.object(m.os, 'link', side_effect=OSError('private details')):
                with self.assertRaisesRegex(m.MetadataError, 'PUBLIC_OUTPUT_CONFLICT'):
                    m.write_public(report, output)
            self.assertFalse(output.exists())
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_cli_errors_are_sanitized(self):
        stream = io.StringIO()
        with contextlib.redirect_stdout(stream), patch.object(m, 'extract_cache', side_effect=OSError('private source payload')):
            self.assertEqual(m.main(['--output','unused.json']), 2)
        self.assertEqual(json.loads(stream.getvalue()), {'status':'BLOCKED','reason':'INTERNAL_FAILURE'})
        stream = io.StringIO()
        with contextlib.redirect_stdout(stream):
            self.assertEqual(m.main(['--private-target','secret']),2)
        self.assertNotIn('secret', stream.getvalue())


if __name__ == '__main__':
    unittest.main()
