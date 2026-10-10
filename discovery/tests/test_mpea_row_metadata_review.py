"""Independent production-wrapper review using public mapping + synthetic rows."""
from contextlib import ExitStack, redirect_stdout
from copy import deepcopy
from hashlib import md5, sha256
import importlib.util
import io
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import unittest
import urllib.request
from unittest.mock import patch

HERE = Path(__file__).resolve()
ROOT = next(p for p in HERE.parents if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
SCRIPT = HERE.parent.parent / 'scripts/mpea_row_metadata.py' if '.cache' in HERE.parts else ROOT / 'scripts/mpea_row_metadata.py'
spec = importlib.util.spec_from_file_location('mpea_row_wrapper_independent_review', SCRIPT)
m = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = m
with patch.object(urllib.request.OpenerDirector, 'open', side_effect=AssertionError('network forbidden')):
    spec.loader.exec_module(m)


def quote(token):
    return b'"' + token.replace(b'"', b'""') + b'"' if any(c in token for c in (b',', b'"', b'\r', b'\n')) else token


def row(**changes):
    values = [b'PRIVATE_OPAQUE_772931'] * 23
    defaults = {'formula': b'Fe1Ni2', 'processing': b'CAST', 'test_mode': b'T',
                'temperature': b'+025.00', 'source': b'10.1234/PRIVATE_SOURCE'}
    for role, token in {**defaults, **changes}.items():
        values[m.POSITIONS[role]] = token
    return values


def raw_for(rows, *, ending=b'\n', terminated=True):
    # These are the already public, hash-pinned header labels, never source rows.
    raw = ending.join(b','.join(quote(token) for token in record) for record in (m.load_mapping(), *rows))
    return raw + ending if terminated else raw


def blob(raw):
    return {'bytes': len(raw), 'md5': md5(raw).hexdigest(), 'sha256': sha256(raw).hexdigest()}


def inspect(raw):
    return m.inspect_fixture(raw, expected_blob=blob(raw))


def reseal(value):
    value['content_sha256'] = m.sha256(m.canonical_bytes({k: v for k, v in value.items() if k != 'content_sha256'}))
    return value


def normalized_metadata(report):
    value = deepcopy(report)
    del value['observed'], value['reference']['expected_blob'], value['content_sha256']
    for record in value['rows'] or []:
        record['record_id'] = 'whole-artifact:' + str(record['ordinal'])
    return value


class ProductionWrapperIndependentReview(unittest.TestCase):
    def setUp(self):
        self.guards = ExitStack()
        self.addCleanup(self.guards.close)
        self.guards.enter_context(patch.object(urllib.request.OpenerDirector, 'open', side_effect=AssertionError('network forbidden')))
        self.guards.enter_context(patch.object(urllib.request, 'urlopen', side_effect=AssertionError('network forbidden')))
        self.guards.enter_context(patch.object(socket, 'create_connection', side_effect=AssertionError('network forbidden')))

    def test_all_opaque_columns_invalid_utf8_nul_presence_and_csv_content_are_noninterfering(self):
        baseline = normalized_metadata(inspect(raw_for([row(), row(source=b'10.1234/SECOND', formula=b'NiFe')])) )
        variants = (b'', b' ', b'\t', b'NaN', b'NR', b'0', b'-99.5', b'1e999999', b'1-2',
                    b'\xff\xfe', b'\x00', b'\xf0\x28\x8c\x28', b'quote"comma,', b'line\nline', b'line\r\nline')
        positions = sorted(set(range(23)) - set(m.POSITIONS.values()))
        for position in positions:
            for token in variants:
                values = [row(), row(source=b'10.1234/SECOND', formula=b'NiFe')]
                for value in values:
                    value[position] = token
                result = inspect(raw_for(values))
                with self.subTest(position=position, variant=variants.index(token)):
                    self.assertEqual(normalized_metadata(result), baseline)
                    self.assertTrue(m.validate_public_report(result))

    def test_no_raw_formula_doi_target_or_individual_digest_is_public(self):
        values = [row(), row(source=b'10.1234/SECOND_PRIVATE_SOURCE', formula=b'Co3Cr7')]
        report = inspect(raw_for(values))
        rendered = m.canonical_bytes(report).decode('ascii')
        for value in values:
            for position in (0, 1, 2, 5, 11, 20, 22):
                private = value[position]
                self.assertNotIn(private.decode('ascii'), rendered)
                self.assertNotIn(md5(private).hexdigest(), rendered)
                self.assertNotIn(sha256(private).hexdigest(), rendered)

    def test_marker_policy_precedes_formula_recognition_and_never_creates_unknown_groups(self):
        tokens = (b'', b'NaN', b'nan', b'NAN', b'NA', b'N/A', b'NR', b'None', b'null', b'-', b' \t\r\n\v\f', b'\xff\x00')
        values = [row(**{role: token for role in m.POSITIONS}) for token in tokens]
        report = inspect(raw_for(values))
        self.assertEqual(report['row_count'], len(tokens))
        for record in report['rows']:
            for role in m.POSITIONS:
                self.assertEqual(record[role], {'status': 'UNRESOLVED', 'value': None})
        follow = inspect(raw_for([*values, row(), row()]))
        self.assertEqual([record['source']['value'] for record in follow['rows'][-2:]], [0, 0])
        self.assertEqual([record['formula']['value'] for record in follow['rows'][-2:]], [0, 0])

    def test_lexical_identity_groups_do_not_normalize_or_depend_on_condition_completeness(self):
        formulas = (b'FeNi', b'NiFe', b'Fe1Ni', b'FeNi', b'Fe0', b'Fe0.5Ni', b'Fe.5Ni', b'Fe1e2')
        sources = (b'10.1234/A', b'https://doi.org/10.1234/A', b'10.1234/a', b'10.1234/A', b' 10.1234/A',
                   b'http://dx.doi.org/10.1234/A', b'10.123/A', b'10.1234567890/A')
        values = [row(formula=f, source=s) for f, s in zip(formulas, sources)]
        report = inspect(raw_for(values))
        self.assertEqual([r['formula']['value'] for r in report['rows']], [0, 1, 2, 0, None, 3, None, None])
        self.assertEqual([r['source']['value'] for r in report['rows']], [0, 1, 2, 0, None, 3, None, None])
        changed = deepcopy(values)
        for record in changed:
            for role in ('processing', 'test_mode', 'temperature'):
                record[m.POSITIONS[role]] = b'\xffUNRESOLVED'
        other = inspect(raw_for(changed))
        self.assertEqual([(r['source'], r['formula']) for r in other['rows']],
                         [(r['source'], r['formula']) for r in report['rows']])

    def test_exact_decimal_lexical_and_temperature_limit_states_are_preserved(self):
        tokens = (b'-0', b'.125', b'+001.50', b'1.', b'9' * 64, b'9' * 65, b'1e2', b'1/2', b'25 C', b' 25', b'\xff')
        report = inspect(raw_for([row(temperature=token) for token in tokens]))
        self.assertEqual([r['temperature']['status'] for r in report['rows']],
                         ['KNOWN'] * 5 + ['UNRESOLVED_LIMIT'] + ['UNRESOLVED'] * 5)
        self.assertEqual(report['rows'][1]['temperature']['value'],
                         {'decimal': '.125', 'numerator': '1', 'denominator': '8', 'unit': 'degC'})
        self.assertEqual(report['rows'][2]['temperature']['value']['numerator'], '3')
        self.assertEqual(report['rows'][2]['temperature']['value']['denominator'], '2')

    def test_late_failure_is_closed_and_never_exposes_successful_prefix(self):
        prefix = raw_for([row(), row(source=b'10.1234/SECOND')])
        for suffix in (b'\n', b'one,two\n', b'"unclosed\n', b'a"b,' + b',' * 21 + b'\n'):
            report = inspect(prefix + suffix)
            self.assertEqual(report['status'], 'BLOCKED_ROWS')
            self.assertIsNone(report['rows']); self.assertIsNone(report['row_count'])
            self.assertIs(report['scope']['observation_byte_framing_attempted'], True)
            self.assertIs(report['scope']['all_observation_rows_framed'], False)
            self.assertIs(report['scope']['allowed_metadata_processed'], False)
            self.assertNotIn('TOKEN_GROUP', m.canonical_bytes(report).decode())
        no_end = raw_for([row()], terminated=False)
        self.assertEqual(inspect(no_end)['row_count'], 1)
        self.assertEqual(inspect(no_end + b'\r\n')['row_count'], 1)

    def test_wrapped_scanner_raw_field_record_and_row_caps_are_exact_and_never_truncate(self):
        def blocked(raw, reason):
            report = inspect(raw)
            self.assertEqual(report['status'], 'BLOCKED_ROWS')
            self.assertEqual(report['reason'], reason)
            self.assertIsNone(report['rows']); self.assertIsNone(report['row_count'])
            self.assertIs(report['scope']['allowed_metadata_processed'], False)
            self.assertIs(report['scope']['all_rows_preserved'], False)

        ordinary = row(); ordinary[0] = b'x' * 16384
        self.assertEqual(inspect(raw_for([ordinary]))['row_count'], 1)
        ordinary[0] += b'x'
        blocked(raw_for([row(), ordinary]), 'FIELD_LIMIT')

        quoted = row(); quoted[-1] = b'"' * 8191
        self.assertEqual(len(quote(quoted[-1])), 16384)
        for terminated in (False, True):
            self.assertEqual(inspect(raw_for([quoted], terminated=terminated))['row_count'], 1)
        quoted[-1] += b'"'
        blocked(raw_for([row(), quoted]), 'FIELD_LIMIT')

        # Four opaque fields consume the raw record budget, including all22
        # commas. The final field is empty, exercising delimiter-at-EOF rules.
        at_cap = [b''] * 23
        for position in (0, 2, 4): at_cap[position] = b'x' * 16384
        at_cap[5] = b'x' * (65536 - 3 * 16384 - 22)
        self.assertEqual(len(b','.join(at_cap)), 65536)
        beyond = deepcopy(at_cap); beyond[5] += b'x'
        self.assertEqual(len(b','.join(beyond)), 65537)
        for terminated in (False, True):
            self.assertEqual(inspect(raw_for([at_cap], terminated=terminated))['row_count'], 1)
            blocked(raw_for([row(), beyond], terminated=terminated), 'RECORD_LIMIT')

        values = [[b''] * 23] * 4096
        report = inspect(raw_for(values))
        self.assertEqual(report['row_count'], 4096)
        self.assertEqual(report['rows'][-1]['ordinal'], 4095)
        blocked(raw_for([*values, [b''] * 23]), 'ROW_LIMIT')

    def test_source_limit_and_header_mutations_fail_before_metadata_processing(self):
        raw = raw_for([row()])
        with patch.object(m, 'load_mapping', side_effect=AssertionError('oversized source reached mapping')):
            with self.assertRaisesRegex(m.MetadataError, 'SOURCE_IDENTITY_CONFLICT'):
                m.inspect_fixture(b'x' * 332127, expected_blob=blob(raw))
        header = m.load_mapping()
        changed = raw.replace(header[0], b'INDEPENDENT_CHANGED_HEADER', 1)
        report = inspect(changed)
        self.assertEqual((report['status'], report['reason']), ('BLOCKED_ROWS', 'HEADER_MISMATCH'))
        self.assertIsNone(report['rows']); self.assertIsNone(report['row_count'])
        self.assertIs(report['scope']['allowed_metadata_processed'], False)

    def test_source_binding_before_frame_and_both_real_identity_guards(self):
        raw = raw_for([row()])
        scanner = m.load_scanner()
        with patch.object(m, 'load_scanner', return_value=scanner), \
             patch.object(scanner, '_frame', side_effect=AssertionError('unverified bytes framed')):
            for key, replacement in (('bytes', len(raw)-1), ('md5', '0'*32), ('sha256', '0'*64)):
                expected = blob(raw); expected[key] = replacement
                result = m.inspect_fixture(raw, expected_blob=expected)
                self.assertEqual(result['status'], 'BLOCKED_SOURCE')
                self.assertIsNone(result['rows'])
        expected = blob(raw); expected['sha256'] = m.SOURCE_SHA256
        with patch.object(m, 'load_mapping', side_effect=AssertionError('real fixture reached mapping')):
            with self.assertRaisesRegex(m.MetadataError, 'REAL_SOURCE_FORBIDDEN'):
                m.inspect_fixture(raw, expected_blob=expected)
            with patch.object(m, 'sha256', return_value=m.SOURCE_SHA256):
                with self.assertRaisesRegex(m.MetadataError, 'REAL_SOURCE_FORBIDDEN'):
                    m.inspect_fixture(raw, expected_blob=blob(raw))

    def test_mapping_and_scanner_captured_bytes_are_hashed_before_interpretation(self):
        with patch.object(m, '_bounded_file', return_value=b'{PRIVATE_UNTRUSTED_SOURCE'), \
             patch.object(m, '_json', side_effect=AssertionError('unverified JSON parsed')):
            with self.assertRaisesRegex(m.MetadataError, 'MAPPING_IDENTITY_CONFLICT'):
                m.load_mapping()
        with patch.object(m, '_bounded_file', return_value=b'raise AssertionError("untrusted executed")'):
            with self.assertRaisesRegex(m.MetadataError, 'SCANNER_IDENTITY_CONFLICT'):
                m.load_scanner()

    def test_commit_mapping_and_scanner_gates_all_precede_cache_read(self):
        for failure in ('commit', 'mapping', 'scanner'):
            events = []
            def gate():
                events.append('commit')
                if failure == 'commit': raise m.MetadataError('FROZEN_SOURCE_REQUIRED')
                return {}
            def mapping_gate():
                events.append('mapping')
                if failure == 'mapping': raise m.MetadataError('MAPPING_IDENTITY_CONFLICT')
                return ()
            def scanner_gate():
                events.append('scanner')
                raise m.MetadataError('SCANNER_IDENTITY_CONFLICT')
            with patch.object(m, 'frozen_source_identity', side_effect=gate), \
                 patch.object(m, 'load_mapping', side_effect=mapping_gate), \
                 patch.object(m, 'load_scanner', side_effect=scanner_gate), \
                 patch.object(m, '_bounded_file', side_effect=AssertionError('cache opened before all gates')):
                with self.assertRaises(m.MetadataError): m.extract_cache()
            self.assertEqual(events, ['commit', 'mapping', 'scanner'][:('commit', 'mapping', 'scanner').index(failure)+1])

    def test_real_git_gate_checks_clean_missing_dirty_symlink_and_historical_pins(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary) / 'discovery'; root.mkdir()
            (root / 'AGENTS.md').write_text('synthetic repository\n')
            for relative in m.FROZEN_PATHS:
                path = root / relative; path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text('synthetic committed fixture: ' + relative + '\n')
            def git(*args):
                return subprocess.run(['git', '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', *args],
                                      cwd=root, check=True, capture_output=True).stdout
            git('init', '-q'); git('add', '.')
            git('-c', 'user.name=Independent Review', '-c', 'user.email=review@example.invalid', 'commit', '-qm', 'synthetic mapping')
            mapping_commit = git('rev-parse', 'HEAD').decode().strip()
            pins = {path: sha256((root / path).read_bytes()).hexdigest() for path in m.PRIOR_PINS}
            scanner_hash = sha256((root / m.NEW_PATHS[1]).read_bytes()).hexdigest()
            with patch.object(m, 'ROOT', root), patch.object(m, '__file__', str(root / m.NEW_PATHS[0])), \
                 patch.object(m, 'MAPPING_COMMIT', mapping_commit), patch.object(m, 'PRIOR_PINS', pins), \
                 patch.object(m, 'SCANNER_SHA256', scanner_hash):
                clean = m.frozen_source_identity()
                self.assertEqual(clean['commit'], mapping_commit)
                self.assertEqual(set(clean['files']), set(m.FROZEN_PATHS))
                for relative in (m.NEW_PATHS[-1], next(iter(m.PRIOR_PINS))):
                    path = root / relative; original = path.read_bytes()
                    for variant in ('dirty', 'missing', 'symlink'):
                        if variant == 'dirty': path.write_bytes(original + b'changed')
                        elif variant == 'missing': path.unlink()
                        else:
                            path.unlink(); target = root / 'same-bytes'; target.write_bytes(original); path.symlink_to(target)
                        with self.subTest(path=relative, variant=variant), self.assertRaisesRegex(m.MetadataError, 'FROZEN_SOURCE_REQUIRED'):
                            m.frozen_source_identity()
                        if path.is_symlink(): path.unlink()
                        path.write_bytes(original)
                prior = root / next(iter(m.PRIOR_PINS)); prior.write_bytes(b'newly committed replacement')
                git('add', '.'); git('-c', 'user.name=Independent Review', '-c', 'user.email=review@example.invalid', 'commit', '-qm', 'changed prior')
                # Even repinning a newly committed replacement cannot erase the
                # original mapping-commit comparison.
                changed_pins = dict(pins); changed_pins[str(prior.relative_to(root))] = sha256(prior.read_bytes()).hexdigest()
                with patch.object(m, 'PRIOR_PINS', changed_pins), self.assertRaisesRegex(m.MetadataError, 'FROZEN_SOURCE_REQUIRED'):
                    m.frozen_source_identity()

    def test_bounded_regular_file_reader_makes_one_332127_byte_read_and_rejects_special_paths(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); path = root / 'constructed.csv'; path.write_bytes(b'constructed bytes')
            original_fdopen = m.os.fdopen; sizes = []
            class Stream:
                def __init__(self, fd, mode): self.stream = original_fdopen(fd, mode)
                def __enter__(self): return self
                def __exit__(self, *args): self.stream.close()
                def fileno(self): return self.stream.fileno()
                def read(self, size): sizes.append(size); return self.stream.read(size)
            with patch.object(m.os, 'fdopen', side_effect=Stream):
                self.assertEqual(m._bounded_file(path, m.SOURCE_BYTES, 'CACHE_READ_FAILED'), b'constructed bytes')
            self.assertEqual(sizes, [332127])
            link = root / 'link.csv'; link.symlink_to(path)
            alias = root / 'alias'; alias.symlink_to(root, target_is_directory=True)
            fifo = root / 'fifo'; os.mkfifo(fifo)
            for forbidden in (link, alias / path.name, fifo, root):
                with self.subTest(kind=forbidden.name), self.assertRaisesRegex(m.MetadataError, 'CACHE_READ_FAILED'):
                    m._bounded_file(forbidden, m.SOURCE_BYTES, 'CACHE_READ_FAILED')
            path.write_bytes(b'x' * (m.SOURCE_BYTES + 1))
            with self.assertRaisesRegex(m.MetadataError, 'CACHE_READ_FAILED'):
                m._bounded_file(path, m.SOURCE_BYTES, 'CACHE_READ_FAILED')

    def test_cache_replacement_after_capture_cannot_change_framed_buffer(self):
        raw = raw_for([row()]); tokens = m.load_mapping(); scanner = m.load_scanner()
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / 'constructed.csv'; destination.write_bytes(raw)
            original_reader = m._bounded_file
            calls = []
            def capture(path, cap, error):
                self.assertEqual(Path(path), destination); calls.append((cap, error))
                captured = original_reader(path, cap, error)
                destination.write_bytes(b'PRIVATE_REPLACEMENT_BODY')
                return captured
            with patch.object(m, 'CACHE_PATH', destination), patch.object(m, 'SOURCE_BLOB', blob(raw)), \
                 patch.object(m, 'frozen_source_identity', return_value={'mode': 'synthetic_fixture', 'commit': None, 'files': {}}), \
                 patch.object(m, 'load_mapping', return_value=tokens), patch.object(m, 'load_scanner', return_value=scanner), \
                 patch.object(m, '_bounded_file', side_effect=capture):
                report = m.extract_cache()
            self.assertEqual(calls, [(332126, 'CACHE_READ_FAILED')])
            self.assertEqual(report['observed'], blob(raw))
            self.assertEqual(report['row_count'], 1)
            self.assertNotIn('PRIVATE_REPLACEMENT_BODY', m.canonical_bytes(report).decode())

    def test_report_and_caller_mutations_do_not_alias_fixed_policies_or_later_reports(self):
        raw = raw_for([row()]); expected = blob(raw)
        policy, pins, positions = deepcopy(m.PROFILE), deepcopy(m.PRIOR_PINS), dict(m.POSITIONS)
        report = m.inspect_fixture(raw, expected_blob=expected)
        expected['bytes'] = 0
        self.assertEqual(report['reference']['expected_blob'], blob(raw))
        report['profile']['allowed_positions']['source'] = 21
        report['scope']['fits'] = 99
        report['reference']['expected_blob']['sha256'] = '0' * 64
        self.assertEqual(m.PROFILE, policy); self.assertEqual(m.PRIOR_PINS, pins); self.assertEqual(m.POSITIONS, positions)
        fresh = inspect(raw)
        self.assertTrue(m.validate_public_report(fresh))
        self.assertEqual(fresh['profile'], policy)

    def test_resealed_claims_types_extra_channels_and_temperature_disagreements_reject(self):
        original = inspect(raw_for([row(), row()]))
        changes = (
            (('scope', 'target_presence_checked'), True), (('scope', 'fits'), False),
            (('scope', 'sampling_independence_established'), True), (('scope', 'all_rows_preserved'), False),
            (('row_count',), True), (('rows', 0, 'ordinal'), False),
            (('rows', 0, 'record_id'), '0'*64 + ':0'), (('rows', 0, 'source', 'value'), True),
            (('rows', 0, 'source', 'value'), 1), (('rows', 0, 'source', 'raw'), 'PRIVATE_SOURCE'),
            (('rows', 0, 'temperature', 'value', 'numerator'), '250'),
            (('rows', 0, 'temperature', 'value', 'denominator'), '01'),
            (('rows', 0, 'temperature', 'value', 'decimal'), '25e0'),
            (('rows', 0, 'temperature', 'value', 'unit'), 'K'),
            (('reference', 'mapping_sha256'), '0'*64), (('profile', 'allowed_positions', 'source'), 21),
        )
        for path, replacement in changes:
            forged = deepcopy(original); target = forged
            for key in path[:-1]: target = target[key]
            target[path[-1]] = replacement
            with self.subTest(path=path), self.assertRaisesRegex(m.MetadataError, 'PUBLIC_SCHEMA_INVALID'):
                m.validate_public_report(reseal(forged))

    def test_atomic_sink_preserves_existing_files_and_leaves_nothing_on_late_write_failure(self):
        report = inspect(raw_for([row()]))
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); destination = root / 'receipt.json'
            with patch.object(m.os, 'fsync', side_effect=OSError('PRIVATE_IO_ERROR')):
                with self.assertRaisesRegex(m.MetadataError, 'PUBLIC_OUTPUT_CONFLICT'):
                    m.write_public(report, destination)
            self.assertEqual(list(root.iterdir()), [])
            m.write_public(report, destination)
            original = destination.read_bytes()
            m.write_public(report, destination)
            self.assertEqual(destination.read_bytes(), original)
            destination.write_bytes(b'PRESERVE_EXISTING')
            with self.assertRaisesRegex(m.MetadataError, 'PUBLIC_OUTPUT_CONFLICT'):
                m.write_public(report, destination)
            self.assertEqual(destination.read_bytes(), b'PRESERVE_EXISTING')
            link = root / 'alias'; link.symlink_to(destination)
            with self.assertRaisesRegex(m.MetadataError, 'PUBLIC_OUTPUT_CONFLICT'):
                m.write_public(report, link)

    def test_cli_has_no_cache_override_or_unsanitized_failure_and_stays_unresolved(self):
        canary = 'PRIVATE_UNPRINTABLE_PATH_334591'
        for args in (['--cache', canary, '--output', canary], ['--allow-real', '--output', canary]):
            output = io.StringIO()
            with redirect_stdout(output), patch.object(m, 'extract_cache', side_effect=AssertionError('invalid CLI opened cache')):
                self.assertEqual(m.main(args), 2)
            self.assertEqual(json.loads(output.getvalue()), {'status': 'BLOCKED', 'reason': 'CLI_ARGUMENT_INVALID'})
        output = io.StringIO()
        with redirect_stdout(output), patch.object(m, 'extract_cache', side_effect=OSError(canary)):
            self.assertEqual(m.main(['--output', canary]), 2)
        self.assertNotIn(canary, output.getvalue())


if __name__ == '__main__':
    unittest.main()
