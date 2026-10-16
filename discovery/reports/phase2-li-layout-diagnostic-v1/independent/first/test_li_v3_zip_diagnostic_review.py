"""Independent synthetic header-only diagnostic regression fixtures.

No source workbook, private source cache, network, decompression or XML reads.
"""
from contextlib import ExitStack
import copy
import importlib.util
import io
import json
import os
from pathlib import Path
import socket
import stat
import struct
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
import zlib


ROOT = next(p for p in Path(__file__).resolve().parents
            if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
REVIEW = ROOT / '.cache/phase2-li-layout-review-v1'
TARGET = ROOT / 'scripts/li_v3_zip_diagnostic.py'
if not TARGET.is_file():
    TARGET = ROOT / '.cache/phase2-li-layout-candidate-v1/promotion/scripts/li_v3_zip_diagnostic.py'
SPEC = importlib.util.spec_from_file_location('independent_li_zip_diagnostic', TARGET)
diagnostic = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(diagnostic)


REQUIRED = ('[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml',
            'xl/_rels/workbook.xml.rels')


def fixture(names=REQUIRED, changes=None, end_changes=None, central_order=None):
    """Build explicit ZIP headers; even deflate payloads are opaque invalid bytes."""
    changes = changes or {}
    local_parts, central_parts = [], []
    offset = 0
    for index, name in enumerate(names):
        fields = {
            'central_name': name.encode('ascii'), 'local_name': name.encode('ascii'),
            'payload': b'OPAQUE_PAYLOAD_CANARY_NOT_XML_NOT_DEFLATE',
            'method': 0, 'flags': 0, 'version': 20, 'extra': b'', 'comment': b'',
            'local_extra': b'', 'crc': 0, 'external_attr': (stat.S_IFREG | 0o600) << 16,
        }
        fields.update(changes.get(index, {}))
        payload = fields['payload']
        compressed = fields.get('compressed', len(payload))
        uncompressed = fields.get('uncompressed', len(payload))
        local = struct.pack(
            '<4s5H3L2H', fields.get('local_signature', b'PK\x03\x04'),
            fields.get('local_version', fields['version']),
            fields.get('local_flags', fields['flags']), fields.get('local_method', fields['method']),
            fields.get('local_time', 0), fields.get('local_date', 33),
            fields.get('local_crc', fields['crc']), fields.get('local_compressed', compressed),
            fields.get('local_uncompressed', uncompressed), len(fields['local_name']), len(fields['local_extra']))
        local += fields['local_name'] + fields['local_extra'] + payload
        central = struct.pack(
            '<4s6H3L5H2L', b'PK\x01\x02', 20, fields['version'], fields['flags'], fields['method'],
            0, 33, fields['crc'], compressed, uncompressed, len(fields['central_name']), len(fields['extra']),
            len(fields['comment']), 0, 0, fields['external_attr'], fields.get('offset', offset))
        central += fields['central_name'] + fields['extra'] + fields['comment']
        local_parts.append(local)
        central_parts.append(central)
        offset += len(local)
    if central_order is not None:
        central_parts = [central_parts[i] for i in central_order]
    body, directory = b''.join(local_parts), b''.join(central_parts)
    end = {'signature': b'PK\x05\x06', 'disk': 0, 'directory_disk': 0,
           'disk_count': len(names), 'count': len(names), 'directory_size': len(directory),
           'directory_offset': len(body), 'comment': 0}
    end.update(end_changes or {})
    return body + directory + struct.pack('<4s4H2LH', *end.values())


def guarded_context():
    stack = ExitStack()
    stack.forbidden_calls = []
    forbidden = AssertionError('FORBIDDEN_DECOMPRESSION_XML_OR_NETWORK')
    for owner, name in (
        (zipfile.ZipFile, 'open'), (zipfile.ZipFile, 'read'),
        (zipfile.ZipFile, 'extract'), (zipfile.ZipFile, 'extractall'),
        (zipfile, '_get_decompressor'), (zlib, 'decompress'), (zlib, 'decompressobj'),
        (ET, 'fromstring'), (ET, 'parse'), (socket, 'socket'), (socket, 'getaddrinfo'),
        (urllib.request, 'urlopen'),
    ):
        stack.forbidden_calls.append(stack.enter_context(patch.object(owner, name, side_effect=forbidden)))
    return stack


class HeaderDiagnosticIndependentReview(unittest.TestCase):
    def setUp(self):
        REVIEW.mkdir(exist_ok=True)
        self.guards = guarded_context()
        self.addCleanup(self.guards.close)
        self.addCleanup(self.assert_no_forbidden_calls)

    def assert_no_forbidden_calls(self):
        for forbidden in self.guards.forbidden_calls:
            forbidden.assert_not_called()

    def compare(self, raw, reason):
        try:
            archive, _names = diagnostic.custody._zip_structure(raw)
        except diagnostic.custody.CustodyError as error:
            legacy_reason = str(error)
        else:
            archive.close()
            legacy_reason = 'HEADER_PROFILE_ACCEPTED'
        report = diagnostic.inspect_synthetic_zip(raw)
        self.assertEqual(report['reason'], reason)
        self.assertEqual(report['legacy_zip_reason'], legacy_reason)
        self.assertEqual(report['status'], 'BLOCKED_SCHEMA')
        self.assertFalse(report['source_identity_verified'])
        self.assertIsNone(report['observed'])
        self.assertIsNone(report['capture_identity'])
        self.assertIsNone(report['implementation'])
        self.assertEqual(report['exposure']['members_decompressed'], [])
        for field in ('xml_decoded', 'worksheet_cells_decoded', 'shared_strings_decoded',
                      'target_numeric_validity_checked', 'scientific_eligibility_decisions',
                      'sampling_independence_established'):
            self.assertIs(report['exposure'][field], False)
        for field in ('row_count', 'paired_count', 'source_group_count', 'overlap_count'):
            self.assertIsNone(report[field])
        self.assertEqual(report['exposure']['fits'], 0)
        self.assertEqual(report['exposure']['splits'], 0)
        return report

    def test_stored_and_invalid_deflate_payloads_are_opaque_and_never_schema_approval(self):
        stored = self.compare(fixture(), 'HEADER_PROFILE_ACCEPTED')
        deflated = self.compare(fixture(changes={i: {'method': 8} for i in range(4)}),
                                'HEADER_PROFILE_ACCEPTED')
        self.assertEqual(stored, deflated)
        self.assertTrue(stored['exposure']['header_checks_completed'])
        self.assertTrue(stored['exposure']['directory_name_decoding_completed'])

    def test_payload_name_and_comment_canaries_have_only_closed_categorical_projection(self):
        payloads = [b'FIRST_PAYLOAD_CANARY', b'SECOND_PAYLOAD_CANARY_WITH_A_DIFFERENT_LENGTH']
        reports = [self.compare(fixture(changes={1: {'payload': p}}), 'HEADER_PROFILE_ACCEPTED')
                   for p in payloads]
        self.assertEqual(*reports)
        names = ['FIRST_UNKNOWN_NAME_CANARY.xml', 'SECOND_UNKNOWN_NAME_CANARY.xml']
        reports = [self.compare(fixture((name,)), 'MEMBER_KIND_PROFILE') for name in names]
        self.assertEqual(*reports)
        comments = [b'FIRST_CENTRAL_COMMENT_CANARY', b'SECOND_CENTRAL_COMMENT_CANARY']
        reports = [self.compare(fixture(changes={0: {'comment': value}}), 'CENTRAL_COMMENT_PRESENT')
                   for value in comments]
        self.assertEqual(*reports)
        serialized = json.dumps(reports)
        self.assertNotIn('CANARY', serialized)
        self.assertEqual(set(reports[0]), {
            'schema', 'status', 'reason', 'legacy_zip_reason', 'profile', 'synthetic_fixture',
            'source_identity_verified', 'implementation', 'capture_identity', 'observed',
            'exposure', 'row_count', 'paired_count', 'source_group_count', 'overlap_count', 'overlap_status'})

    def test_compound_first_failure_order_and_local_offset_sort_match_frozen_guard(self):
        # Each later failure is independently real but must not displace the first.
        cases = [
            (fixture(('unknown-canary.xml',), {0: {'flags': 1}}), 'MEMBER_KIND_PROFILE'),
            (fixture(changes={0: {'flags': 1, 'method': 9}}), 'MEMBER_FLAGS'),
            (fixture(changes={0: {'method': 9, 'version': 21}}), 'MEMBER_COMPRESSION'),
            (fixture(changes={0: {'version': 21, 'extra': b'\xfe\xca\x00\x00'}}), 'MEMBER_VERSION'),
            (fixture(changes={0: {'extra': b'\xfe\xca\x00\x00', 'comment': b'CANARY'}}), 'CENTRAL_EXTRA_PRESENT'),
            (fixture(changes={0: {'local_flags': 1, 'local_extra': b'CANARY'}}), 'LOCAL_HEADER_AGREEMENT'),
            (fixture(changes={0: {'local_extra': b'CANARY', 'local_name': b'WRONG'}}), 'LOCAL_EXTRA_PRESENT'),
            # Central ordering is deliberately reversed: the lowest local offset wins.
            (fixture(changes={0: {'flags': 1}, 1: {'method': 9}}, central_order=[3, 2, 1, 0]), 'MEMBER_FLAGS'),
            # Constructor parses every central entry before checking any member profile.
            (fixture(changes={0: {'flags': 1}, 3: {'extra': b'\xfe\xca\xff\xff'}}), 'HEADER_PARSE_ERROR'),
        ]
        for raw, reason in cases:
            with self.subTest(reason=reason):
                self.compare(raw, reason)

    def test_boundaries_members_and_local_header_disagreements_match_frozen_guard(self):
        cases = [
            (b'', 'HEADER_TOO_SHORT'),
            (b'X' * 22, 'END_RECORD_PROFILE'),
            (fixture(end_changes={'signature': b'NOPE', 'count': 0}), 'END_RECORD_PROFILE'),
            (fixture((), end_changes={'count': 0}), 'MEMBER_LIMIT'),
            (fixture(tuple('xl/worksheets/sheet%d.xml' % i for i in range(1, 130))), 'MEMBER_LIMIT'),
            (fixture(('[Content_Types].xml',)), 'REQUIRED_MEMBERS_ABSENT'),
            (fixture(('[Content_Types].xml', '[Content_Types].xml')), 'MEMBER_NAME_OR_DUPLICATE'),
            (fixture(('../CANARY',)), 'MEMBER_PATH_PROFILE'),
            (fixture(changes={0: {'external_attr': stat.S_IFLNK << 16}}), 'MEMBER_FILE_TYPE'),
            (fixture(changes={0: {'uncompressed': 1}}), 'STORED_SIZE_MISMATCH'),
            (fixture(changes={0: {'offset': 1}}), 'LOCAL_OFFSET_LAYOUT'),
            (fixture(changes={0: {'local_name': b'WRONG'}}), 'LOCAL_NAME_AGREEMENT'),
            (fixture(changes={0: {'compressed': 1000000, 'uncompressed': 1000000}}), 'MEMBER_DATA_BOUNDS'),
        ]
        for raw, reason in cases:
            with self.subTest(reason=reason):
                self.compare(raw, reason)
        for bad in (bytearray(b''), '', None, True):
            with self.subTest(type=type(bad).__name__), self.assertRaisesRegex(diagnostic.custody.CustodyError, 'RAW_TYPE_INVALID'):
                diagnostic.inspect_synthetic_zip(bad)
        with self.assertRaisesRegex(diagnostic.custody.CustodyError, 'SOURCE_SIZE_MISMATCH'):
            diagnostic.inspect_synthetic_zip(b'X' * (diagnostic.custody.SOURCE_BYTES + 1))

    def capture_fixture(self):
        files = {name: diagnostic.custody.sha256((ROOT / name).read_bytes())
                 for name in diagnostic.custody.FROZEN_PATHS}
        self.assertEqual(files, diagnostic.LEGACY_FILES)
        identity = {'mode': 'committed_source', 'commit': '5addf4f80e345afa50a4bcc26b9db24d220a3af5',
                    'files': files}
        observed = {'bytes': 183878, 'md5': '041bbe095c54615e5a3c289facb18ce5',
                    'sha256': '9741f826f6a97db7c2c0efa89820d3bdae43e8beb53cafd893ccdf0bb74f64fa'}
        report = diagnostic.custody._capture_report(identity, observed)
        raw = diagnostic.custody.canonical(report)
        self.assertEqual(diagnostic.custody.sha256(raw),
                         '13f6f1b0354d15a214169cdd52e58d5349a30b6c2f481f793f9d3af12fb28009')
        return report, raw

    def fake_new_identity(self):
        return {'mode': 'committed_source', 'commit': 'a' * 40,
                'files': {name: 'b' * 64 for name in diagnostic.FROZEN_PATHS},
                'legacy_files': dict(diagnostic.LEGACY_FILES)}

    def test_exact_old_capture_bridge_rejects_changed_identities_before_object_access(self):
        captured, good = self.capture_fixture()
        self.assertEqual(diagnostic._validate_capture(good), captured)
        variants = [good + b' ', good.replace(b'"status":', b'"extra_claim":false,"status":')]
        for field in ('commit',):
            changed = copy.deepcopy(captured); changed['implementation'][field] = 'c' * 40
            variants.append(diagnostic.custody.canonical(changed))
        changed = copy.deepcopy(captured); changed['observed']['sha256'] = 'd' * 64
        variants.append(diagnostic.custody.canonical(changed))
        for path in diagnostic.custody.FROZEN_PATHS:
            changed = copy.deepcopy(captured); changed['implementation']['files'][path] = 'e' * 64
            variants.append(diagnostic.custody.canonical(changed))
        with tempfile.TemporaryDirectory(dir=REVIEW) as temporary:
            for raw in variants:
                with self.subTest(receipt_variant=variants.index(raw)):
                    fd = os.open(temporary, os.O_RDONLY | os.O_DIRECTORY)
                    def read(relative, _cap):
                        self.assertEqual(relative, diagnostic.custody.CAPTURE)
                        return raw
                    with patch.object(diagnostic, 'production_context', return_value=self.fake_new_identity()), \
                         patch.object(diagnostic.custody, '_output_directory', return_value=fd), \
                         patch.object(diagnostic.custody, '_read_relative', side_effect=read) as reads, \
                         patch.object(diagnostic.custody, '_verify_source') as verify, \
                         patch.object(diagnostic, '_classify') as classify:
                        result = diagnostic.diagnose('1')
                    self.assertEqual(result['reason'], 'CAPTURE_RECEIPT_INVALID')
                    self.assertEqual(reads.call_count, 1)
                    verify.assert_not_called(); classify.assert_not_called()

    def test_candidate_location_and_output_conflict_refuse_before_private_input(self):
        candidate_path = REVIEW / 'never-a-production-script.py'
        with patch.object(diagnostic, '__file__', str(candidate_path)), \
             patch.object(diagnostic.custody, 'production_context') as old_context, \
             patch.object(diagnostic.custody, '_read_relative') as reads:
            result = diagnostic.diagnose('1')
        self.assertEqual(result['reason'], 'FROZEN_SOURCE_REQUIRED')
        old_context.assert_not_called(); reads.assert_not_called()
        for bad in ('0', '3', '../1', 1, None, True):
            with patch.object(diagnostic, 'production_context') as context:
                result = diagnostic.diagnose(bad)
            self.assertEqual(result['reason'], 'CLI_ARGUMENT_INVALID')
            context.assert_not_called()
        with tempfile.TemporaryDirectory(dir=REVIEW) as temporary:
            directory = Path(temporary)
            (directory / 'public.json').symlink_to(directory / 'not-a-real-source')
            fd = os.open(directory, os.O_RDONLY | os.O_DIRECTORY)
            with patch.object(diagnostic, 'production_context', return_value=self.fake_new_identity()), \
                 patch.object(diagnostic.custody, '_output_directory', return_value=fd), \
                 patch.object(diagnostic.custody, '_read_relative') as reads:
                result = diagnostic.diagnose('1')
            self.assertEqual(result['reason'], 'OUTPUT_CONFLICT')
            reads.assert_not_called()
            self.assertTrue((directory / 'public.json').is_symlink())

    def test_verified_capture_still_requires_exact_object_and_partial_read_stays_unknown(self):
        _captured, good = self.capture_fixture()
        with tempfile.TemporaryDirectory(dir=REVIEW) as temporary:
            for partial in (False, True):
                with self.subTest(partial=partial):
                    fd = os.open(temporary, os.O_RDONLY | os.O_DIRECTORY)
                    calls = []
                    def read(relative, cap):
                        calls.append((relative, cap))
                        if relative == diagnostic.custody.CAPTURE:
                            return good
                        self.assertEqual(relative, diagnostic.custody.OBJECT)
                        if partial:
                            raise diagnostic.custody.CustodyError('FILE_READ_FAILED')
                        return b'SYNTHETIC_WRONG_OBJECT'
                    with patch.object(diagnostic, 'production_context', return_value=self.fake_new_identity()), \
                         patch.object(diagnostic.custody, '_output_directory', return_value=fd), \
                         patch.object(diagnostic.custody, '_read_relative', side_effect=read), \
                         patch.object(diagnostic.custody, '_verify_source', side_effect=diagnostic.custody.CustodyError('SOURCE_SHA256_MISMATCH')) as verify, \
                         patch.object(diagnostic, '_classify') as classify:
                        result = diagnostic.diagnose('1')
                    self.assertEqual(calls, [(diagnostic.custody.CAPTURE, 65536),
                                             (diagnostic.custody.OBJECT, 183878)])
                    self.assertFalse(result['source_identity_verified'])
                    self.assertTrue(result['exposure']['raw_buffer_read_started'])
                    if partial:
                        self.assertEqual(result['reason'], 'FILE_READ_FAILED')
                        self.assertFalse(result['exposure']['raw_buffer_read_completed'])
                        self.assertIsNone(result['exposure']['target_bearing_source_bytes_read'])
                        verify.assert_not_called()
                    else:
                        self.assertEqual(result['reason'], 'SOURCE_SHA256_MISMATCH')
                        self.assertTrue(result['exposure']['raw_buffer_read_completed'])
                        self.assertTrue(result['exposure']['target_bearing_source_bytes_read'])
                        verify.assert_called_once_with(b'SYNTHETIC_WRONG_OBJECT',
                                                       '9741f826f6a97db7c2c0efa89820d3bdae43e8beb53cafd893ccdf0bb74f64fa')
                    classify.assert_not_called()

    def test_new_committed_source_gate_rejects_old_digest_or_index_change(self):
        canonical_path = ROOT / diagnostic.FROZEN_PATHS[0]
        old_identity = {'mode': 'committed_source', 'commit': 'a' * 40,
                        'files': dict(diagnostic.LEGACY_FILES)}
        changed = copy.deepcopy(old_identity)
        changed['files'][diagnostic.custody.FROZEN_PATHS[0]] = '0' * 64
        with patch.object(diagnostic, '__file__', str(canonical_path)), \
             patch.object(diagnostic.custody, 'production_context', return_value=changed), \
             patch.object(diagnostic.custody, '_read_relative') as reads, \
             patch.object(diagnostic.subprocess, 'run') as git:
            with self.assertRaisesRegex(diagnostic.custody.CustodyError, 'FROZEN_SOURCE_REQUIRED'):
                diagnostic.production_context()
        reads.assert_not_called(); git.assert_not_called()
        fixture_sources = {name: ('SYNTHETIC_COMMITTED_SOURCE:' + name).encode()
                           for name in diagnostic.FROZEN_PATHS}
        def git_response(command, **_kwargs):
            if command == ['git', 'rev-parse', '--show-prefix']:
                stdout = b'discovery/\n'
            else:
                self.assertEqual(command[:2], ['git', 'show'])
                relative = command[2].split(':discovery/', 1)[1]
                stdout = fixture_sources[relative]
                if command[2].startswith(':') and relative == diagnostic.FROZEN_PATHS[2]:
                    stdout += b'CHANGED_IN_INDEX'
            return subprocess.CompletedProcess(command, 0, stdout=stdout, stderr=b'')
        with patch.object(diagnostic, '__file__', str(canonical_path)), \
             patch.object(diagnostic.custody, 'production_context', return_value=old_identity), \
             patch.object(diagnostic.custody, '_read_relative', side_effect=lambda path, cap: fixture_sources[path]), \
             patch.object(diagnostic.subprocess, 'run', side_effect=git_response):
            with self.assertRaisesRegex(diagnostic.custody.CustodyError, 'FROZEN_SOURCE_REQUIRED'):
                diagnostic.production_context()


if __name__ == '__main__':
    unittest.main()
