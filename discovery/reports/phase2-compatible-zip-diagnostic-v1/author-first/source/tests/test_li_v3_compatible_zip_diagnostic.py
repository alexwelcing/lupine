"""Author checks for the compatible-header diagnostic; synthetic bytes only."""
from contextlib import ExitStack, redirect_stdout
from copy import deepcopy
import ast
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
import zipfile

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location('compatible_diagnostic_author',
    HERE.parent / 'scripts/li_v3_compatible_zip_diagnostic.py')
M = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)
CANARY = b'PRIVATE_OPAQUE_PAYLOAD_72913'


def archive(payload=CANARY, method=8):
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, 'w', compression=method) as output:
        for name in M.compatible.ENVELOPE_MEMBERS:
            output.writestr(name, b'\xff\x00' + payload)
    return stream.getvalue()


def entries(raw):
    cursor = struct.unpack_from('<L', raw, len(raw) - 6)[0]
    result = []
    while raw[cursor:cursor + 4] == b'PK\x01\x02':
        result.append((cursor, struct.unpack_from('<L', raw, cursor + 42)[0]))
        cursor += 46 + sum(struct.unpack_from('<3H', raw, cursor + 28))
    return result


def changed(raw, *changes):
    result = bytearray(raw)
    for offset, fmt, value in changes:
        struct.pack_into(fmt, result, offset, value)
    return bytes(result)


class CompatibleDiagnosticAuthorTests(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.stack.enter_context(patch.object(socket, 'socket', side_effect=AssertionError('no network')))
        self.stack.enter_context(patch.object(socket, 'getaddrinfo', side_effect=AssertionError('no DNS')))

    def inspect(self, raw):
        with ExitStack() as guard:
            for name in ('open', 'read', 'extract', 'extractall', 'testzip'):
                guard.enter_context(patch.object(zipfile.ZipFile, name,
                    side_effect=AssertionError('member access forbidden')))
            report = M.inspect_synthetic_headers(raw)
        self.assertEqual(report['schema'], M.SCHEMA)
        self.assertEqual(report['status'], 'BLOCKED_SCHEMA')
        self.assertTrue(report['synthetic_fixture'])
        self.assertFalse(report['source_identity_verified'])
        for key in ('row_count', 'paired_count', 'source_group_count', 'overlap_count'):
            self.assertIsNone(report[key])
        self.assertEqual(report['overlap_status'], 'NOT_ASSESSED')
        self.assertEqual(report['exposure']['members_decompressed'], [])
        for key in ('xml_decoded', 'worksheet_cells_decoded', 'shared_strings_decoded',
                    'target_numeric_validity_checked', 'scientific_eligibility_decisions',
                    'sampling_independence_established', 'member_names_published'):
            self.assertFalse(report['exposure'][key])
        self.assertNotIn(CANARY.decode(), json.dumps(report))
        self.assertEqual(report['categories'], report['primary_categories'] + report['supplementary_local_categories'])
        return report

    def test_predicate_ast_correspondence_and_all_seventeen_predecessor_pins(self):
        old = ast.parse((M.ROOT / 'scripts/li_v3_compatible_envelope.py').read_text())
        old = next(n for n in old.body if isinstance(n, ast.FunctionDef) and n.name == '_compatible_zip_structure')
        groups = [tuple(ast.dump(p, include_attributes=False) for p in n.test.values)
                  for n in ast.walk(old) if isinstance(n, ast.If)
                  and isinstance(n.test, ast.BoolOp) and isinstance(n.test.op, ast.Or)]
        candidate = ast.parse(Path(M.__file__).read_text())
        candidate_groups = []
        for node in ast.walk(candidate):
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == '_failed':
                candidate_groups.append(tuple(ast.dump(p.elts[0], include_attributes=False) for p in node.args[0].elts))
        self.assertEqual(len(groups), 6)
        self.assertEqual(len(candidate_groups), 6)
        # Only the four-name constant is module-qualified in the separate diagnostic.
        def normalize(group):
            return tuple(value.replace("Attribute(value=Name(id='compatible', ctx=Load()), attr='ENVELOPE_MEMBERS', ctx=Load())",
                                       "Name(id='ENVELOPE_MEMBERS', ctx=Load())") for value in group)
        self.assertEqual(set(map(normalize, groups)), set(map(normalize, candidate_groups)))
        pins = {**M.PRIOR_FILES, **M.compatible.PRIOR_FILES,
                **M.compatible.flag_diagnostic.PRIOR_FILES, **M.header_diagnostic.LEGACY_FILES}
        self.assertEqual(len(pins), 17)
        for name, digest in pins.items():
            self.assertEqual(hashlib.sha256((M.ROOT / name).read_bytes()).hexdigest(), digest, name)

    def test_header_acceptance_is_opaque_to_payload_and_not_xml_validity(self):
        first = self.inspect(archive())
        second = self.inspect(archive(b'OTHER_OPAQUE_NON_XML_CONTENT'))
        self.assertEqual(first, second)
        self.assertEqual(first['reason'], 'HEADER_PROFILE_ACCEPTED')
        self.assertTrue(first['exposure']['header_checks_completed'])
        self.assertTrue(first['exposure']['archive_close_completed'])

    def test_methods_and_allowed_option_bits_match_frozen_primary_verdict(self):
        for method in (0, 8):
            raw = archive(method=method)
            for flags in (0, 2, 4, 6, 0x800, 0x802, 0x804, 0x806, 1, 8, 0x1000):
                edits = [(offset, '<H', flags) for central, local in entries(raw)
                         for offset in (central + 8, local + 6)]
                fixture = changed(raw, *edits)
                report = self.inspect(fixture)
                try:
                    opened, _ = M.compatible._compatible_zip_structure(fixture)
                    opened.close()
                    expected = 'HEADER_PROFILE_ACCEPTED'
                except M.custody.CustodyError as error:
                    expected = str(error)
                self.assertEqual(report['compatible_reason'], expected)

    def test_multiple_central_failures_and_supplementary_local_agreement(self):
        raw = archive(); central, local = entries(raw)[0]
        result = self.inspect(changed(raw, (central + 8, '<H', 8), (central + 6, '<H', 21)))
        self.assertEqual(result['primary_categories'], ['MEMBER_FLAGS', 'MEMBER_VERSION'])
        self.assertEqual(result['supplementary_local_categories'], ['LOCAL_VERSION_AGREEMENT', 'LOCAL_FLAGS_AGREEMENT'])
        self.assertEqual(result['first_rejection_stage'], 'entry_central')
        self.assertEqual(result['same_entry_local_checks'], 'CHECKED')

    def test_offset_failure_prevents_additional_local_parse_and_later_traversal(self):
        raw = archive(); first = entries(raw)[0]
        fixture = changed(raw, (first[0] + 42, '<L', 1), (first[0] + 8, '<H', 8))
        with patch.object(M, '_local_failures', side_effect=AssertionError('unsafe local access')) as local:
            result = self.inspect(fixture)
        local.assert_not_called()
        self.assertEqual(result['primary_categories'], ['MEMBER_FLAGS', 'LOCAL_OFFSET_LAYOUT'])
        self.assertEqual(result['same_entry_local_checks'], 'NOT_SAFE_OFFSET')
        self.assertEqual(result['supplementary_local_categories'], [])

    def test_each_local_field_is_reported_and_later_member_is_not_visited(self):
        raw = archive(); central, local = entries(raw)[0]
        cases = ((0, '<4s', b'BAD!', 'LOCAL_SIGNATURE'),
                 (4, '<H', 21, 'LOCAL_VERSION_AGREEMENT'),
                 (6, '<H', 8, 'LOCAL_FLAGS_AGREEMENT'),
                 (8, '<H', 99, 'LOCAL_METHOD_AGREEMENT'),
                 (10, '<H', 0, 'LOCAL_TIME_AGREEMENT'),
                 (12, '<H', 0, 'LOCAL_DATE_AGREEMENT'),
                 (14, '<L', 0, 'LOCAL_CRC_AGREEMENT'),
                 (18, '<L', 0, 'LOCAL_COMPRESSED_SIZE_AGREEMENT'),
                 (22, '<L', 0, 'LOCAL_UNCOMPRESSED_SIZE_AGREEMENT'),
                 (28, '<H', 1, 'LOCAL_EXTRA_PRESENT'))
        for offset, fmt, value, category in cases:
            with self.subTest(category=category):
                original = struct.unpack_from(fmt, raw, local + offset)[0]
                if original == value:
                    value = 1
                fixture = changed(raw, (local + offset, fmt, value))
                with patch.object(M.custody, '_canonical_member', wraps=M.custody._canonical_member) as name:
                    report = self.inspect(fixture)
                self.assertIn(category, report['primary_categories'])
                self.assertEqual(report['first_rejection_stage'], 'entry_local')
                self.assertEqual(name.call_count, 1)

    def test_end_record_aggregation_and_raw_type_resource_guards(self):
        raw = archive(); end = len(raw) - 22
        result = self.inspect(changed(raw, (end + 4, '<H', 1), (end + 6, '<H', 2),
                                     (end + 8, '<H', 3), (end + 20, '<H', 1)))
        self.assertEqual(result['primary_categories'], ['END_DISK', 'DIRECTORY_DISK', 'END_COMMENT', 'END_ENTRY_COUNT'])
        self.assertFalse(result['exposure']['directory_name_decoding_started'])
        self.assertEqual(self.inspect(b'bad')['reason'], 'HEADER_TOO_SHORT')
        for value, code in ((bytearray(b'bad'), 'RAW_TYPE_INVALID'), (True, 'RAW_TYPE_INVALID'),
                            (b'x' * (M.custody.SOURCE_BYTES + 1), 'SOURCE_SIZE_MISMATCH')):
            with self.assertRaisesRegex(M.custody.CustodyError, '^' + code + '$'):
                M.inspect_synthetic_headers(value)
        with patch.object(M.hashlib, 'sha256', return_value=types.SimpleNamespace(hexdigest=lambda: M.header_diagnostic.OBJECT_SHA256)):
            with self.assertRaisesRegex(M.custody.CustodyError, '^SYNTHETIC_REAL_SOURCE_FORBIDDEN$'):
                M.inspect_synthetic_headers(b'fixture')

    def test_parse_and_cleanup_faults_are_closed_and_preserve_exposure(self):
        raw = archive()
        with patch.object(zipfile.ZipFile, 'infolist', side_effect=RuntimeError(CANARY.decode())):
            report = self.inspect(raw)
        self.assertEqual(report['reason'], 'HEADER_PARSE_ERROR')
        self.assertTrue(report['exposure']['directory_name_decoding_started'])
        self.assertFalse(report['exposure']['directory_name_decoding_completed'])
        self.assertTrue(report['exposure']['archive_close_completed'])
        close = zipfile.ZipFile.close
        def failing_close(instance):
            close(instance)
            raise RuntimeError(CANARY.decode())
        with patch.object(zipfile.ZipFile, 'close', failing_close):
            report = self.inspect(raw)
        self.assertEqual(report['reason'], 'HEADER_PROFILE_ACCEPTED')
        self.assertTrue(report['exposure']['header_checks_completed'])
        self.assertTrue(report['exposure']['archive_close_started'])
        self.assertFalse(report['exposure']['archive_close_completed'])
        self.assertEqual(report['exposure']['archive_close_error'], 'ARCHIVE_CLOSE_FAILED')

    def test_supplementary_parse_fault_does_not_replace_primary_failure(self):
        raw = archive(); central, _ = entries(raw)[0]
        with patch.object(M, '_local_failures', side_effect=RuntimeError(CANARY.decode())):
            report = self.inspect(changed(raw, (central + 8, '<H', 8)))
        self.assertEqual(report['reason'], 'MEMBER_FLAGS')
        self.assertEqual(report['same_entry_local_checks'], 'PARSE_ERROR')
        self.assertEqual(report['supplementary_local_categories'], [])

    def test_reports_do_not_alias_future_reports_or_trusted_state(self):
        expected = self.inspect(archive())
        altered = deepcopy(expected)
        def damage(value):
            if isinstance(value, dict):
                for child in list(value.values()):
                    damage(child)
                value['UNTRUSTED'] = CANARY.decode()
            elif isinstance(value, list):
                value.append(CANARY.decode())
        damage(altered)
        # Also mutate a genuine returned report, not just its detached copy.
        damage(expected)
        report = self.inspect(archive())
        self.assertNotIn('UNTRUSTED', json.dumps(report))

    def test_ignored_source_guard_fails_before_git_or_prior_context(self):
        with patch.object(M, '__file__', str(M.ROOT / '.cache/unpublished.py')):
            with patch.object(M.compatible, 'production_context', side_effect=AssertionError('prior guard reached')) as prior:
                with patch.object(M.subprocess, 'run', side_effect=AssertionError('git reached')) as git:
                    with self.assertRaisesRegex(M.custody.CustodyError, '^FROZEN_SOURCE_REQUIRED$'):
                        M.production_context()
        prior.assert_not_called(); git.assert_not_called()

    def test_positive_synthetic_production_context_and_changed_pin_rejection(self):
        data = {path: ('synthetic source ' + path).encode() for path in M.FROZEN_PATHS}
        commit = 'a' * 40
        def git(args, **kwargs):
            if args[1:] == ['rev-parse', '--show-prefix']:
                return types.SimpleNamespace(stdout=b'discovery/\n')
            ref = args[-1]
            path = ref.split(':discovery/', 1)[1]
            return types.SimpleNamespace(stdout=data[path])
        with ExitStack() as stack:
            stack.enter_context(patch.object(M, '__file__', str(M.ROOT / M.FROZEN_PATHS[0])))
            prior = stack.enter_context(patch.object(M.compatible, 'production_context',
                return_value={'files': dict(M.PRIOR_FILES), 'commit': commit}))
            stack.enter_context(patch.object(M.custody, '_read_relative', side_effect=lambda name, cap: data[name]))
            stack.enter_context(patch.object(M.subprocess, 'run', side_effect=git))
            result = M.production_context()
            self.assertEqual(result['files'], {k: hashlib.sha256(v).hexdigest() for k, v in data.items()})
            prior.return_value = {'files': {}, 'commit': commit}
            with self.assertRaisesRegex(M.custody.CustodyError, '^FROZEN_SOURCE_REQUIRED$'):
                M.production_context()

    def production_stubs(self, raw=None, *, read_error=None, bad_prerequisite=False, close_error=False):
        raw = archive() if raw is None else raw
        prerequisite = b'EXPLICIT_SYNTHETIC_PREREQUISITE'
        calls, written = [], []
        def read(name, cap):
            calls.append(name)
            if name == M.PREREQUISITE:
                return prerequisite + (b'changed' if bad_prerequisite else b'')
            if name == M.custody.CAPTURE:
                return b'EXPLICIT_SYNTHETIC_CAPTURE'
            if name == M.custody.OBJECT:
                if read_error:
                    raise M.custody.CustodyError(read_error)
                return raw
            raise AssertionError('unexpected path')
        stack = ExitStack(); self.addCleanup(stack.close)
        stack.enter_context(patch.object(M, 'PREREQUISITE_SHA256', hashlib.sha256(prerequisite).hexdigest()))
        stack.enter_context(patch.object(M, 'production_context', return_value={'mode': 'synthetic_guard_fixture'}))
        stack.enter_context(patch.object(M.custody, '_receipt_path', return_value=Path('/synthetic/public.json')))
        stack.enter_context(patch.object(M.custody, '_output_directory', return_value=98765))
        stack.enter_context(patch.object(M.custody, '_absent_at'))
        stack.enter_context(patch.object(M.custody, '_read_relative', side_effect=read))
        stack.enter_context(patch.object(M.header_diagnostic, '_validate_capture', return_value=None))
        stack.enter_context(patch.object(M.custody, '_verify_source', return_value={'synthetic': True}))
        stack.enter_context(patch.object(M.custody, '_write_at', side_effect=lambda fd, name, data: written.append(data)))
        stack.enter_context(patch.object(M.custody.os, 'close', side_effect=RuntimeError(CANARY.decode()) if close_error else None))
        return calls, written

    def test_production_prerequisite_precedes_capture_and_object(self):
        calls, written = self.production_stubs(bad_prerequisite=True)
        result = M.diagnose('1')
        self.assertEqual(result['reason'], 'COMPATIBLE_PREREQUISITE_INVALID')
        self.assertEqual(result['status'], 'BLOCKED_GUARD')
        self.assertEqual(calls, [M.PREREQUISITE])
        self.assertEqual(written, [])
        self.assertFalse(result['exposure']['raw_buffer_read_started'])

    def test_production_success_is_still_schema_blocked_and_exclusive_output(self):
        calls, written = self.production_stubs()
        result = M.diagnose('2')
        self.assertEqual(calls, [M.PREREQUISITE, M.custody.CAPTURE, M.custody.OBJECT])
        self.assertEqual(len(written), 1)
        self.assertEqual(json.loads(written[0]), result)
        self.assertEqual(result['status'], 'BLOCKED_SCHEMA')
        self.assertTrue(result['exposure']['target_bearing_source_bytes_read'])
        with patch.object(M.custody, '_absent_at', side_effect=M.custody.CustodyError('OUTPUT_CONFLICT')):
            result = M.diagnose('2')
        self.assertEqual(result['reason'], 'OUTPUT_CONFLICT')
        self.assertEqual(len(written), 1)

    def test_partial_raw_read_and_output_close_errors_preserve_known_exposure(self):
        self.production_stubs(read_error='FILE_READ_FAILED')
        report = M.diagnose('1')
        self.assertEqual(report['reason'], 'FILE_READ_FAILED')
        self.assertTrue(report['exposure']['raw_buffer_read_started'])
        self.assertFalse(report['exposure']['raw_buffer_read_completed'])
        self.assertIsNone(report['exposure']['target_bearing_source_bytes_read'])
        self.production_stubs(close_error=True)
        report = M.diagnose('1')
        self.assertEqual(report['reason'], 'INTERNAL_FAILURE')
        self.assertEqual(report['status'], 'BLOCKED_GUARD')
        self.assertTrue(report['exposure']['raw_buffer_read_completed'])
        self.assertTrue(report['exposure']['directory_name_decoding_completed'])
        self.assertNotIn(CANARY.decode(), json.dumps(report))

    def test_cli_rejects_unrecognized_paths_and_never_prints_exception_text(self):
        stream = io.StringIO()
        with redirect_stdout(stream):
            result = M.main(['diagnose', '--run', '1', '--source', CANARY.decode()])
        self.assertEqual(result, 2)
        self.assertEqual(json.loads(stream.getvalue()), {'status': 'BLOCKED_GUARD', 'reason': 'CLI_ARGUMENT_INVALID'})


if __name__ == '__main__':
    unittest.main()
