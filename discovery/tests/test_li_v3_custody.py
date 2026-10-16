"""Synthetic envelope/capture boundaries; never acquire the Li workbook."""
import contextlib
import copy
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import socket
import stat
import struct
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile


SCRIPT = Path(__file__).absolute().parents[1] / 'scripts/li_v3_custody.py'
SPEC = importlib.util.spec_from_file_location('_li_v3_custody_author_test', SCRIPT)
custody = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(custody)
CT = 'http://schemas.openxmlformats.org/package/2006/content-types'
R = 'http://schemas.openxmlformats.org/package/2006/relationships'
D = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/'
S = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
CANARY = b'WITHHELD_TARGET_93821.25_DO_NOT_PUBLISH'


def fixture_parts():
    types = {
        'xl/workbook.xml': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml',
        **{f'xl/worksheets/sheet{i}.xml': 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml'
           for i in range(1, 4)},
        'xl/sharedStrings.xml': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml',
        'xl/styles.xml': 'application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml',
        'xl/theme/theme1.xml': 'application/vnd.openxmlformats-officedocument.theme+xml',
        'xl/calcChain.xml': 'application/vnd.openxmlformats-officedocument.spreadsheetml.calcChain+xml',
        'docProps/core.xml': 'application/vnd.openxmlformats-package.core-properties+xml',
        'docProps/app.xml': 'application/vnd.openxmlformats-officedocument.extended-properties+xml',
        'docProps/custom.xml': 'application/vnd.openxmlformats-officedocument.custom-properties+xml',
        'xl/comments1.xml': 'application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml',
        'xl/drawings/drawing1.xml': 'application/vnd.openxmlformats-officedocument.drawing+xml',
        'xl/drawings/vmlDrawing1.vml': 'application/vnd.openxmlformats-officedocument.vmlDrawing',
        'xl/media/image1.png': 'image/png',
    }
    parts = {name: b'\xff\x00<malformedXML>' + CANARY for name in types if name != 'xl/workbook.xml'}
    parts['xl/worksheets/_rels/sheet1.xml.rels'] = b'\xff' + CANARY
    parts['xl/drawings/_rels/drawing1.xml.rels'] = b'\xff' + CANARY
    parts['[Content_Types].xml'] = (
        f'<Types xmlns="{CT}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        + ''.join(f'<Override PartName="/{name}" ContentType="{kind}"/>' for name, kind in types.items())
        + '</Types>').encode()
    parts['_rels/.rels'] = (
        f'<Relationships xmlns="{R}"><Relationship Id="rId1" Type="{D}officeDocument" '
        'Target="xl/workbook.xml"/></Relationships>').encode()
    parts['xl/workbook.xml'] = (
        f'<workbook xmlns="{S}" xmlns:r="{D[:-1]}"><sheets>'
        '<sheet name="WITHHELD_NAME_01" sheetId="1" r:id="rId1"/>'
        '<sheet name="References" sheetId="2" r:id="rId2" state="hidden"/>'
        '<sheet name="Column Descriptions" sheetId="3" r:id="rId3" state="veryHidden"/>'
        '</sheets></workbook>').encode()
    parts['xl/_rels/workbook.xml.rels'] = (
        f'<Relationships xmlns="{R}">'
        + ''.join(f'<Relationship Id="rId{i}" Type="{D}worksheet" Target="worksheets/sheet{i}.xml"/>'
                  for i in range(1, 4)) + '</Relationships>').encode()
    return parts


def archive(parts=None, compression=zipfile.ZIP_DEFLATED):
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, 'w', compression=compression) as output:
        for name, raw in (fixture_parts() if parts is None else parts).items():
            output.writestr(name, raw)
    return stream.getvalue()


class Response:
    def __init__(self, status, headers=None, raw=b''):
        self.status, self.headers, self.raw = status, headers or {}, raw
        self.read_sizes = []
        self.closed = False

    def read(self, size):
        self.read_sizes.append(size)
        return self.raw[:size]

    def close(self):
        self.closed = True


class LiCustodyTests(unittest.TestCase):
    def setUp(self):
        self.stack = contextlib.ExitStack()
        for target in ('socket.socket', 'socket.create_connection', 'socket.getaddrinfo'):
            self.stack.enter_context(patch(target, side_effect=AssertionError('NETWORK_FORBIDDEN_IN_TEST')))
        self.addCleanup(self.stack.close)

    def test_valid_envelope_only_opens_four_members_and_masks_opaque_canaries(self):
        raw = archive()
        opened = []
        original = zipfile.ZipFile.open
        def record(instance, name, *args, **kwargs):
            opened.append(name)
            return original(instance, name, *args, **kwargs)
        with patch.object(zipfile.ZipFile, 'open', record):
            report = custody.inspect_synthetic_envelope(raw)
        self.assertEqual(report['engineering_status'], 'ENVELOPE_VALID')
        self.assertEqual(report['status'], 'BLOCKED_SCHEMA')
        self.assertEqual(opened, list(custody.ENVELOPE_MEMBERS))
        self.assertEqual(report['recognized_roles'], {
            'References': {'present': True, 'ordinal': 2},
            'Column Descriptions': {'present': True, 'ordinal': 3}})
        self.assertEqual(report['sheet_count'], 3)
        serialized = custody.canonical(report)
        self.assertNotIn(CANARY, serialized)
        self.assertNotIn(b'WITHHELD_NAME_01', serialized)
        for field in ('row_count', 'paired_count', 'source_group_count', 'overlap_count'):
            self.assertIsNone(report[field])
        for field in ('worksheet_cells_decoded', 'shared_strings_decoded', 'formulas_executed',
                      'target_numeric_validity_checked', 'scientific_eligibility_decisions'):
            self.assertFalse(report['exposure'][field])

    def test_every_opaque_component_can_change_without_changing_envelope_semantics(self):
        before_parts = fixture_parts()
        before = custody.inspect_synthetic_envelope(archive(before_parts))
        for name in set(before_parts) - set(custody.ENVELOPE_MEMBERS):
            after_parts = dict(before_parts)
            after_parts[name] = b'<!DOCTYPE hidden [<!ENTITY leak SYSTEM "file:///secret">]>' + CANARY[::-1]
            after = custody.inspect_synthetic_envelope(archive(after_parts))
            self.assertNotEqual(before['observed']['sha256'], after['observed']['sha256'])
            expected = {k: v for k, v in before.items() if k != 'observed'}
            actual = {k: v for k, v in after.items() if k != 'observed'}
            self.assertEqual(actual, expected, name)

    def test_package_absolute_relationships_are_supported_without_filesystem_resolution(self):
        parts = fixture_parts()
        parts['_rels/.rels'] = parts['_rels/.rels'].replace(b'Target="xl/', b'Target="/xl/')
        parts['xl/_rels/workbook.xml.rels'] = parts['xl/_rels/workbook.xml.rels'].replace(
            b'Target="worksheets/', b'Target="/xl/worksheets/')
        self.assertEqual(custody.inspect_synthetic_envelope(archive(parts))['engineering_status'], 'ENVELOPE_VALID')

    def test_source_identity_and_inventory_changes_fail_closed(self):
        custody._validate_inventory(custody.canonical(custody.EXPECTED_INVENTORY))
        for field, value in [('version', 4), ('license', 'unknown'), ('declared_bytes', 183877),
                             ('declared_md5', '0' * 32)]:
            inventory = copy.deepcopy(custody.EXPECTED_INVENTORY)
            inventory[field] = value
            with self.assertRaisesRegex(custody.CustodyError, '^INVENTORY_INVALID$'):
                custody._validate_inventory(custody.canonical(inventory))
        with self.assertRaisesRegex(custody.CustodyError, '^SOURCE_SIZE_MISMATCH$'):
            custody._verify_source(b'wrong')
        with self.assertRaisesRegex(custody.CustodyError, '^SOURCE_MD5_MISMATCH$'):
            custody._verify_source(b'x' * custody.SOURCE_BYTES)

    def test_public_report_mutation_cannot_alias_trusted_inventory(self):
        before = custody.canonical(custody.EXPECTED_INVENTORY)
        report = custody.inspect_synthetic_envelope(archive())
        report['source']['redirect']['host'] = 'changed.invalid'
        report['source']['unresolved_publication_counts']['archive_records'] = 1
        self.assertEqual(custody.canonical(custody.EXPECTED_INVENTORY), before)
        self.assertEqual(custody.inspect_synthetic_envelope(archive())['source'], json.loads(before))
        self.assertEqual(hashlib.sha256(before).hexdigest(), custody.INVENTORY_SHA256)

    def test_capture_receipt_is_closed_and_types_flags_and_identity_are_validated(self):
        identity = {'mode': 'committed_source', 'commit': '1' * 40,
                    'files': {name: '2' * 64 for name in custody.FROZEN_PATHS}}
        observed = {'bytes': custody.SOURCE_BYTES, 'md5': custody.SOURCE_MD5, 'sha256': '3' * 64}
        original = custody._capture_report(identity, observed)
        custody._validate_capture_receipt(custody.canonical(original), identity)
        changes = [(('extra',), 'unsupported'), (('source_identity_verified',), False),
                   (('row_count',), 1050), (('exposure', 'fits'), False),
                   (('exposure', 'worksheet_cells_decoded'), True),
                   (('implementation', 'mode'), 'synthetic_fixture'),
                   (('implementation', 'commit'), None), (('observed', 'bytes'), True),
                   (('source', 'redirect', 'host'), 'changed.invalid')]
        for path, value in changes:
            changed = copy.deepcopy(original)
            cursor = changed
            for key in path[:-1]:
                cursor = cursor[key]
            cursor[path[-1]] = value
            with self.assertRaisesRegex(custody.CustodyError, '^CAPTURE_RECEIPT_INVALID$'):
                custody._validate_capture_receipt(custody.canonical(changed), identity)
        duplicate = custody.canonical(original).replace(b'"action":"capture"', b'"action":"other","action":"capture"')
        with self.assertRaisesRegex(custody.CustodyError, '^CAPTURE_RECEIPT_INVALID$'):
            custody._validate_capture_receipt(duplicate, identity)

    def test_modified_local_headers_encryption_and_macro_profile_are_rejected(self):
        raw = archive()
        for offset in (4, 6, 10, 12, 14, 18, 22):
            changed = bytearray(raw)
            changed[offset] ^= 1
            self.assertEqual(custody.inspect_synthetic_envelope(bytes(changed))['engineering_status'], 'BLOCKED_LAYOUT')
        parts = fixture_parts()
        parts['xl/vbaProject.bin'] = CANARY
        self.assertEqual(custody.inspect_synthetic_envelope(archive(parts))['engineering_status'], 'BLOCKED_LAYOUT')
        parts = fixture_parts()
        parts['[Content_Types].xml'] = parts['[Content_Types].xml'].replace(
            b'spreadsheetml.sheet.main+xml', b'ms-excel.sheet.macroEnabled.main+xml')
        self.assertEqual(custody.inspect_synthetic_envelope(archive(parts))['engineering_status'], 'BLOCKED_LAYOUT')

    def test_xml_depth_bomb_entity_and_unknown_extensions_do_not_leak(self):
        payloads = [b'<!DOCTYPE workbook [<!ENTITY x "' + CANARY + b'">]><workbook>&x;</workbook>',
                    b'<x>' * 65 + b'</x>' * 65,
                    b'<x>' + b' ' * (custody.MAX_XML_BYTES + 1) + b'</x>',
                    b'<workbook xmlns="unknown">' + CANARY + b'</workbook>']
        for payload in payloads:
            parts = fixture_parts()
            parts['xl/workbook.xml'] = payload
            report = custody.inspect_synthetic_envelope(archive(parts))
            self.assertEqual(report['engineering_status'], 'BLOCKED_LAYOUT')
            self.assertEqual(report['status'], 'BLOCKED_SCHEMA')
            self.assertNotIn(CANARY, custody.canonical(report))
            self.assertNotIn('xl/_rels/workbook.xml.rels', report['exposure']['decompression_started'])

    def test_external_duplicate_and_unknown_workbook_relationships_block(self):
        for old, new in [(b'Target="worksheets/sheet1.xml"', b'Target="https://example.invalid/secret" TargetMode="External"'),
                         (b'Id="rId2"', b'Id="rId1"'),
                         (b'/worksheet"', b'/externalLink"')]:
            parts = fixture_parts()
            parts['xl/_rels/workbook.xml.rels'] = parts['xl/_rels/workbook.xml.rels'].replace(old, new)
            self.assertEqual(custody.inspect_synthetic_envelope(archive(parts))['engineering_status'], 'BLOCKED_LAYOUT')
        parts = fixture_parts()
        parts['xl/workbook.xml'] = parts['xl/workbook.xml'].replace(b'name="References"', b'name="WITHHELD_NAME_01"')
        self.assertEqual(custody.inspect_synthetic_envelope(archive(parts))['engineering_status'], 'BLOCKED_LAYOUT')

    def test_one_fixed_redirect_and_bounded_body_read(self):
        signed = 'https://' + custody.REDIRECT_HOST + custody.REDIRECT_PATH + '?PRIVATE_SIGNATURE_CANARY'
        first, second = Response(302, {'Location': signed}), Response(200, raw=b'fixture')
        with patch.object(custody, '_open_once', side_effect=[first, second]) as transport:
            self.assertEqual(custody._fetch_fixed(), b'fixture')
        self.assertEqual([call.args[0] for call in transport.call_args_list], [custody.DOWNLOAD_URL, signed])
        self.assertEqual(first.read_sizes, [])
        self.assertEqual(second.read_sizes, [custody.SOURCE_BYTES + 1])
        self.assertTrue(first.closed and second.closed)
        for location in [signed.replace('https:', 'http:'), signed.replace('rgw.cscs.ch', 'other.invalid'),
                         signed + '#fragment', signed.replace('/data?', '/other?'),
                         signed.replace('rgw.cscs.ch', 'rgw.cscs.ch:443')]:
            response = Response(302, {'Location': location})
            with patch.object(custody, '_open_once', return_value=response) as transport:
                with self.assertRaisesRegex(custody.CustodyError, '^REDIRECT_INVALID$'):
                    custody._fetch_fixed()
                self.assertEqual(transport.call_count, 1)
                self.assertEqual(response.read_sizes, [])
        for second in [Response(302, {'Location': signed}), Response(200, {'Content-Encoding': 'gzip'}),
                       Response(200, raw=b'x' * (custody.SOURCE_BYTES + 1))]:
            with patch.object(custody, '_open_once', side_effect=[Response(302, {'Location': signed}), second]):
                with self.assertRaises(custody.CustodyError):
                    custody._fetch_fixed()

    def test_capture_and_envelope_guards_run_before_network_or_cache(self):
        with patch.object(custody, '__file__', str(SCRIPT.parent / 'ignored-not-production.py')):
            with patch.object(custody, '_fetch_fixed', side_effect=AssertionError('network called')):
                with patch.object(custody, '_read_relative', side_effect=AssertionError('cache read')):
                    for action in (custody.capture, custody.envelope):
                        with self.assertRaisesRegex(custody.CustodyError, '^FROZEN_SOURCE_REQUIRED$'):
                            action('.cache/li-v3-custody/review/public.json')

    def test_descriptor_io_is_bounded_regular_private_nonoverwriting_and_nofollow(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = custody._directory(Path(tmp))
            try:
                custody._write_at(directory, 'value', b'abc')
                self.assertEqual(stat.S_IMODE(os.stat(Path(tmp) / 'value').st_mode), 0o600)
                self.assertEqual(custody._read_at(directory, 'value', 3), b'abc')
                with self.assertRaises(custody.CustodyError): custody._read_at(directory, 'value', 2)
                with self.assertRaisesRegex(custody.CustodyError, '^OUTPUT_CONFLICT$'):
                    custody._write_at(directory, 'value', b'changed')
                os.symlink('value', Path(tmp) / 'link')
                with self.assertRaises(custody.CustodyError): custody._read_at(directory, 'link', 3)
                with self.assertRaises(custody.CustodyError): custody._write_at(directory, 'link', b'changed')
                os.mkdir(Path(tmp) / 'folder')
                with self.assertRaises(custody.CustodyError): custody._read_at(directory, 'folder', 3)
                os.mkfifo(Path(tmp) / 'fifo')
                with self.assertRaises(custody.CustodyError): custody._read_at(directory, 'fifo', 3)
                os.symlink(Path(tmp) / 'folder', Path(tmp) / 'ancestor')
                with self.assertRaises(custody.CustodyError): custody._directory(Path(tmp) / 'ancestor')
                self.assertEqual((Path(tmp) / 'value').read_bytes(), b'abc')
            finally:
                os.close(directory)

    def test_synthetic_api_cannot_enable_production_or_accept_arbitrary_objects(self):
        with patch.object(custody, '_open_once', side_effect=AssertionError('network called')):
            for value in (None, 'file.xlsx', Path('/unused'), bytearray(b'PK')):
                with self.assertRaisesRegex(custody.CustodyError, '^RAW_TYPE_INVALID$'):
                    custody.inspect_synthetic_envelope(value)
            with self.assertRaises(TypeError):
                custody.inspect_synthetic_envelope(archive(), production=True)
            with self.assertRaisesRegex(custody.CustodyError, '^SOURCE_SIZE_MISMATCH$'):
                custody.inspect_synthetic_envelope(b'x' * (custody.SOURCE_BYTES + 1))


if __name__ == '__main__':
    unittest.main()
