"""Independent compatible-envelope review; synthetic buffers and stubbed guards only."""
from contextlib import ExitStack, redirect_stdout
from copy import deepcopy
import hashlib
import importlib.util
import io
import itertools
import json
from pathlib import Path
import stat
import struct
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import zipfile
import zlib

ROOT = next(p for p in Path(__file__).absolute().parents
            if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
CANDIDATE = ROOT / 'scripts/li_v3_compatible_envelope.py'
if not CANDIDATE.is_file():
    CANDIDATE = ROOT / '.cache/phase2-li-compatible-envelope-candidate-v1/promotion/scripts/li_v3_compatible_envelope.py'
COMPONENTS = ('[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels')
MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
DOC = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/'
PKG = 'http://schemas.openxmlformats.org/package/2006/relationships'
CT = 'http://schemas.openxmlformats.org/package/2006/content-types'
CANARIES = ('TARGET_PRIVATE_A_3179', 'TARGET_PRIVATE_B_6428')
module = None


def denied(*_args, **_kwargs):
    raise AssertionError('independent review forbids network, real custody and opaque-member reads')


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True,
                       allow_nan=False) + '\n').encode('ascii')


def setUpModule():
    global module
    sys.dont_write_bytecode = True
    stack = ExitStack()
    unittest.addModuleCleanup(stack.close)
    for name in ('socket.socket', 'socket.getaddrinfo', 'socket.create_connection'):
        stack.enter_context(patch(name, side_effect=denied))
    spec = importlib.util.spec_from_file_location('independent_compatible_candidate', CANDIDATE)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    unittest.addModuleCleanup(sys.modules.pop, spec.name, None)
    spec.loader.exec_module(module)


def parts(canary=CANARIES[0], absolute=False):
    opaque = [(f'xl/worksheets/sheet{i}.xml', 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml') for i in range(1, 4)]
    opaque += [('xl/sharedStrings.xml', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml'),
               ('xl/comments1.xml', 'application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml'),
               ('xl/media/image1.png', 'image/png')]
    result = {}
    result[COMPONENTS[0]] = (f'<Types xmlns="{CT}">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        + ''.join(f'<Override PartName="/{name}" ContentType="{kind}"/>' for name, kind in opaque)
        + '</Types>').encode()
    result[COMPONENTS[1]] = (f'<Relationships xmlns="{PKG}"><Relationship Id="root" '
        f'Type="{DOC}officeDocument" Target="' + ('/' if absolute else '') + 'xl/workbook.xml"/></Relationships>').encode()
    result[COMPONENTS[2]] = (f'<workbook xmlns="{MAIN}" xmlns:r="{DOC[:-1]}"><sheets>'
        + ''.join(f'<sheet name="{name}" sheetId="{i}" r:id="s{i}"/>'
                  for i, name in enumerate((canary, 'References', 'Column Descriptions'), 1))
        + '</sheets></workbook>').encode()
    result[COMPONENTS[3]] = (f'<Relationships xmlns="{PKG}">'
        + ''.join(f'<Relationship Id="s{i}" Type="{DOC}worksheet" Target="'
                  + ('/xl/' if absolute else '') + f'worksheets/sheet{i}.xml"/>' for i in range(1, 4))
        + f'<Relationship Id="strings" Type="{DOC}sharedStrings" Target="'
        + ('/xl/' if absolute else '') + 'sharedStrings.xml"/></Relationships>').encode()
    for name, _ in opaque:
        result[name] = (canary + ' <invalid-XML-and-image <f>SECRET_FORMULA()</f>').encode()
    return result


def entry(name, raw, flags=6, method=8, **changes):
    if method == 8:
        compressor = zlib.compressobj(wbits=-15)
        payload = compressor.compress(raw) + compressor.flush()
    else:
        payload = raw
    value = dict(name=name, payload=payload, flags=flags, method=method,
                 crc=zlib.crc32(raw), size=len(raw), version=20, time=0, date=33,
                 extra=b'', comment=b'', attrs=(stat.S_IFREG | 0o600) << 16)
    value.update(changes)
    return value


def archive(entries, *, central_reverse=False):
    """Independent local/central writer; no production parser or ZIP writer helper."""
    local, central = bytearray(), []
    for item in entries:
        name = item['name'].encode('utf-8')
        local_name = item.get('local_name', name)
        extra = item.get('local_extra', b'')
        compressed = item.get('compressed', len(item['payload']))
        local_values = [item.get('local_version', item['version']),
                        item.get('local_flags', item['flags']), item.get('local_method', item['method']),
                        item.get('local_time', item['time']), item.get('local_date', item['date']),
                        item.get('local_crc', item['crc']), item.get('local_compressed', compressed),
                        item.get('local_size', item['size']), len(local_name), len(extra)]
        offset = len(local)
        local += struct.pack('<4s5H3L2H', b'PK\x03\x04', *local_values)
        local += local_name + extra + item['payload']
        cextra, comment = item['extra'], item['comment']
        central.append(struct.pack('<4s6H3L5H2L', b'PK\x01\x02', 20, item['version'],
            item['flags'], item['method'], item['time'], item['date'], item['crc'], compressed,
            item['size'], len(name), len(cextra), len(comment), 0, 0, item['attrs'],
            item.get('offset', offset)) + name + cextra + comment)
    directory = b''.join(reversed(central) if central_reverse else central)
    return bytes(local) + directory + struct.pack('<4s4H2LH', b'PK\x05\x06', 0, 0,
        len(entries), len(entries), len(directory), len(local), 0)


def fixture(data=None, flags=6, method=8, **kwargs):
    return archive([entry(name, raw, flags, method) for name, raw in (data or parts()).items()], **kwargs)


class IndependentCompatibleEnvelopeReview(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.forbidden = []
        for name in ('socket.socket', 'socket.getaddrinfo', 'socket.create_connection',
                     'urllib.request.urlopen', 'zipfile.ZipFile.read',
                     'zipfile.ZipFile.extract', 'zipfile.ZipFile.extractall'):
            self.forbidden.append(self.stack.enter_context(patch(name, side_effect=denied)))
        for name in ('_read_relative', '_read_at', '_receipt_path', '_output_directory', '_write_at', '_open_once'):
            self.forbidden.append(self.stack.enter_context(patch.object(module.custody, name, side_effect=denied)))
        self.forbidden.append(self.stack.enter_context(patch.object(module.subprocess, 'run', side_effect=denied)))
        self.opens = []
        original = zipfile.ZipFile.open
        def restricted(instance, name, *args, **kwargs):
            name = name.filename if isinstance(name, zipfile.ZipInfo) else name
            self.opens.append(name)
            if name not in COMPONENTS:
                denied()
            return original(instance, name, *args, **kwargs)
        self.stack.enter_context(patch.object(zipfile.ZipFile, 'open', restricted))

    def tearDown(self):
        for mock in self.forbidden:
            self.assertEqual(mock.call_count, 0, 'Forbidden call attempted, even if caught')
        self.assertTrue(all(name in COMPONENTS for name in self.opens))

    def assert_closed(self, report):
        self.assertEqual(report['schema'], 'lupine.discovery.li_v3.compatible_envelope.v1')
        self.assertEqual(report['status'], 'BLOCKED_SCHEMA')
        self.assertEqual(report['parser_profile'], 'li_v3.xlsx_envelope.deflate_options.v1')
        for key in ('row_count', 'paired_count', 'source_group_count', 'overlap_count'):
            self.assertIsNone(report[key])
        self.assertEqual(report['overlap_status'], 'NOT_ASSESSED')
        exposure = report['exposure']
        for key in ('worksheet_cells_decoded', 'shared_strings_decoded', 'formulas_executed',
                    'target_numeric_validity_checked', 'scientific_eligibility_decisions',
                    'sampling_independence_established'):
            self.assertIs(exposure[key], False)
        self.assertEqual((exposure['fits'], exposure['splits']), (0, 0))
        for canary in CANARIES:
            self.assertNotIn(canary, json.dumps(report))

    def test_each_option_combination_and_stored_utf8_have_only_four_xml_reads(self):
        for method, flags in [(8, f) for f in (0, 2, 4, 6, 2048, 2050, 2052, 2054)] + [(0, 0), (0, 2048)]:
            with self.subTest(method=method, flags=flags):
                self.opens.clear()
                raw = fixture(flags=flags, method=method)
                report = module.inspect_synthetic_envelope(raw)
                self.assert_closed(report)
                self.assertEqual(report['engineering_status'], 'ENVELOPE_VALID')
                self.assertEqual(report['reason'], 'SCHEMA_UNCONFIRMED')
                self.assertEqual(self.opens, list(COMPONENTS))
                for key in ('decompression_started', 'decompression_completed', 'xml_decoding_started', 'xml_decoding_completed'):
                    self.assertEqual(report['exposure'][key], list(COMPONENTS))
                self.assertEqual(report['recognized_roles'], {'References': {'present': True, 'ordinal': 2},
                    'Column Descriptions': {'present': True, 'ordinal': 3}})
                if flags not in (0, 2048):
                    with self.assertRaises(module.custody.CustodyError):
                        module.custody._zip_structure(raw)

    def test_opaque_canary_and_unknown_sheet_names_do_not_change_semantic_projection(self):
        reports = [module.inspect_synthetic_envelope(fixture(parts(canary))) for canary in CANARIES]
        for report in reports:
            self.assert_closed(report)
        self.assertEqual({k: v for k, v in reports[0].items() if k != 'observed'},
                         {k: v for k, v in reports[1].items() if k != 'observed'})
        reports[0]['source']['redirect'].clear()
        reports[0]['recognized_roles']['References']['present'] = False
        self.assertEqual(module.inspect_synthetic_envelope(fixture(parts(CANARIES[1]))), reports[1])

    def test_all_other_single_flag_bits_and_methods_block_before_decompression(self):
        combinations = [(8, (1 << bit) | 6) for bit in range(16) if bit not in (1, 2, 11)]
        combinations += [(0, flag) for flag in (2, 4, 6, 2050, 2052, 2054)]
        combinations += [(method, 6) for method in (6, 9, 14, 93)]
        for method, flags in combinations:
            with self.subTest(method=method, flags=flags):
                self.opens.clear()
                report = module.inspect_synthetic_envelope(fixture(flags=flags, method=method))
                self.assert_closed(report)
                self.assertEqual(report['engineering_status'], 'BLOCKED_LAYOUT')
                self.assertEqual(self.opens, [])

    def test_later_bad_headers_and_every_local_central_agreement_remain_checked(self):
        mutations = [dict(local_version=19), dict(local_flags=2), dict(local_method=0),
            dict(local_time=1), dict(local_date=34), dict(local_crc=1), dict(local_compressed=1),
            dict(local_size=1), dict(local_name=b'WRONG_NAME'), dict(local_extra=b'\0\0'),
            dict(extra=b'\0\0\0\0'), dict(comment=b'comment'), dict(version=21),
            dict(attrs=stat.S_IFLNK << 16), dict(attrs=0x10), dict(offset=1), dict(flags=14),
            dict(name='../escape.xml'), dict(name='unknown.bin')]
        for changes in mutations:
            with self.subTest(changes=changes):
                self.opens.clear()
                entries = [entry(name, raw) for name, raw in parts().items()]
                # A first acceptable option flag cannot whitelist later entries.
                entries[-1].update(changes)
                report = module.inspect_synthetic_envelope(archive(entries, central_reverse=True))
                self.assert_closed(report)
                self.assertEqual(report['engineering_status'], 'BLOCKED_LAYOUT')
                self.assertEqual(self.opens, [])
        entries = [entry(name, raw, flags=0, method=0) for name, raw in parts().items()]
        entries[-1]['size'] += 1
        report = module.inspect_synthetic_envelope(archive(entries))
        self.assertEqual(report['reason'], 'ZIP_LAYOUT_UNSUPPORTED')

    def test_duplicate_required_absence_and_member_limit_remain_closed(self):
        base = [entry(name, raw) for name, raw in parts().items()]
        variants = [base + [base[-1]], base[1:], [],
                    [entry(f'xl/worksheets/sheet{i}.xml', b'x') for i in range(1, 130)]]
        for entries in variants:
            with self.subTest(count=len(entries)):
                report = module.inspect_synthetic_envelope(archive(entries))
                self.assert_closed(report)
                self.assertEqual(report['engineering_status'], 'BLOCKED_LAYOUT')
        self.assertEqual(self.opens, [])

    def test_unchanged_xml_profile_limits_and_partial_exposure(self):
        examples = [(b'<!DOCTYPE a [<!ENTITY x "SECRET">]><a/>', 'XML_PROFILE_UNSUPPORTED'),
                    ('<?xml version="1.0" encoding="UTF-16"?><a/>'.encode('utf-16'), 'XML_INVALID'),
                    (b'<a>' * 65 + b'</a>' * 65, 'XML_LIMIT'),
                    (b' ' * (module.custody.MAX_XML_BYTES + 1), 'XML_LIMIT'),
                    (b'<a>' + b'<b/>' * 65536 + b'</a>', 'XML_LIMIT')]
        for raw, reason in examples:
            with self.subTest(reason=reason, size=len(raw)):
                data = parts()
                data[COMPONENTS[0]] = raw
                report = module.inspect_synthetic_envelope(fixture(data))
                self.assert_closed(report)
                self.assertEqual(report['reason'], reason)
                self.assertEqual(report['exposure']['decompression_started'], [COMPONENTS[0]])
                self.assertEqual(report['exposure']['xml_decoding_completed'], [])
                self.assertEqual(report['exposure']['decompression_completed'], [] if len(raw) > module.custody.MAX_XML_BYTES else [COMPONENTS[0]])

    def test_relationship_external_unknown_and_unsupported_workbook_stay_blocked(self):
        absolute = module.inspect_synthetic_envelope(fixture(parts(absolute=True)))
        self.assertEqual(absolute['engineering_status'], 'ENVELOPE_VALID')
        for which, before, after in [(COMPONENTS[1], b'Target="xl/workbook.xml"', b'Target="https://invalid.example/secret" TargetMode="External"'),
                                     (COMPONENTS[3], b'worksheets/sheet1.xml', b'../worksheets/sheet1.xml'),
                                     (COMPONENTS[2], b'<sheets>', b'<definedNames/><sheets>')]:
            data = parts()
            data[which] = data[which].replace(before, after)
            report = module.inspect_synthetic_envelope(fixture(data))
            self.assert_closed(report)
            self.assertEqual(report['engineering_status'], 'BLOCKED_LAYOUT')

    def test_synthetic_type_bounds_and_actual_identity_guards_precede_parser(self):
        with patch.object(module, '_inspect_envelope', side_effect=denied) as parse:
            for bad in (None, False, 'PATH', bytearray(b'x'), memoryview(b'x')):
                with self.assertRaisesRegex(module.CustodyError, '^RAW_TYPE_INVALID$'):
                    module.inspect_synthetic_envelope(bad)
            with self.assertRaisesRegex(module.CustodyError, '^SOURCE_SIZE_MISMATCH$'):
                module.inspect_synthetic_envelope(bytes(module.custody.SOURCE_BYTES + 1))
            with patch.object(module.hashlib, 'sha256', return_value=SimpleNamespace(hexdigest=lambda: module.header_diagnostic.OBJECT_SHA256)):
                with self.assertRaisesRegex(module.CustodyError, '^SYNTHETIC_REAL_SOURCE_FORBIDDEN$'):
                    module.inspect_synthetic_envelope(b'SYNTHETIC_NOT_ACTUAL')
            with patch.object(module.hashlib, 'md5', return_value=SimpleNamespace(hexdigest=lambda: module.custody.SOURCE_MD5)):
                with self.assertRaisesRegex(module.CustodyError, '^SYNTHETIC_REAL_SOURCE_FORBIDDEN$'):
                    module.inspect_synthetic_envelope(bytes(module.custody.SOURCE_BYTES))
            parse.assert_not_called()

    def test_all_thirteen_prior_pins_match_current_public_source(self):
        pins = {**module.PRIOR_FILES, **module.flag_diagnostic.PRIOR_FILES, **module.header_diagnostic.LEGACY_FILES}
        self.assertEqual(len(pins), 13)
        for name, digest in pins.items():
            with self.subTest(path=name):
                self.assertEqual(hashlib.sha256((ROOT / name).read_bytes()).hexdigest(), digest)

    def test_ignored_location_blocks_before_git_prior_guard_or_cache(self):
        with patch.object(module, '__file__', str(ROOT / '.cache/not-production.py')), \
             patch.object(module.flag_diagnostic, 'production_context', side_effect=denied) as prior:
            with self.assertRaisesRegex(module.CustodyError, '^FROZEN_SOURCE_REQUIRED$'):
                module.production_context()
            prior.assert_not_called()

    def test_positive_stubbed_source_guard_and_modified_pin_or_index_fail_closed(self):
        for change in (None, 'prior', 'index'):
            with self.subTest(change=change), ExitStack() as stack:
                prior = {'commit': 'a' * 40, 'files': dict(module.PRIOR_FILES)}
                if change == 'prior':
                    prior['files']['scripts/li_v3_flag_diagnostic.py'] = '0' * 64
                blobs = {name: ('SYNTHETIC_SOURCE:' + name).encode() for name in module.FROZEN_PATHS}
                def git(args, **kwargs):
                    if args == ['git', 'rev-parse', '--show-prefix']:
                        return SimpleNamespace(stdout=b'discovery/\n')
                    for name, raw in blobs.items():
                        if args[2] in ('a' * 40 + ':discovery/' + name, ':discovery/' + name):
                            return SimpleNamespace(stdout=b'CHANGED' if change == 'index' and args[2].startswith(':') else raw)
                    raise AssertionError('Unexpected Git stub call')
                stack.enter_context(patch.object(module, '__file__', str(ROOT / module.FROZEN_PATHS[0])))
                stack.enter_context(patch.object(module.flag_diagnostic, 'production_context', return_value=prior))
                stack.enter_context(patch.object(module.custody, '_read_relative', side_effect=lambda name, cap: blobs[name]))
                stack.enter_context(patch.object(module.subprocess, 'run', side_effect=git))
                if change:
                    with self.assertRaisesRegex(module.CustodyError, '^FROZEN_SOURCE_REQUIRED$'):
                        module.production_context()
                else:
                    result = module.production_context()
                    self.assertEqual(result['files'], {name: hashlib.sha256(raw).hexdigest() for name, raw in blobs.items()})
                    result['prior_files'].clear()
                    result['header_files'].clear()
                    result['legacy_files'].clear()
                    again = module.production_context()
                    self.assertEqual(again['prior_files'], module.PRIOR_FILES)
                    self.assertEqual(len(again['header_files']), 4)
                    self.assertEqual(len(again['legacy_files']), 5)

    def test_expected_flag_receipt_closed_claims_pin_and_detached_values(self):
        report = module._expected_flag_receipt()
        self.assertEqual(report['status'], 'BLOCKED_SCHEMA')
        self.assertEqual(report['reason'], 'DEFLATE_OPTION_FLAGS_ONLY')
        self.assertEqual(report['prior_diagnostic_reason'], 'MEMBER_FLAGS')
        self.assertEqual(report['implementation']['commit'], 'f7c6ccd04b535f8830f07905b51a5dc2c8a6ca4f')
        self.assertEqual(report['observed'], {'bytes': 183878, 'md5': '041bbe095c54615e5a3c289facb18ce5',
            'sha256': '9741f826f6a97db7c2c0efa89820d3bdae43e8beb53cafd893ccdf0bb74f64fa'})
        true = {'raw_buffer_read_started', 'raw_buffer_read_completed', 'target_bearing_source_bytes_read',
                'header_checks_started', 'directory_name_decoding_started', 'directory_name_decoding_completed',
                'flag_entry_reparse_started', 'flag_entry_reparse_completed', 'flag_family_classified'}
        self.assertEqual({name for name, value in report['exposure'].items() if value is True}, true)
        self.assertIs(report['exposure']['header_checks_completed'], False)
        self.assertEqual(report['exposure']['members_decompressed'], [])
        for key in ('row_count', 'paired_count', 'source_group_count', 'overlap_count'):
            self.assertIsNone(report[key])
        raw = canonical(report)
        self.assertEqual(module._validate_flag_receipt(raw), hashlib.sha256(raw).hexdigest())
        for path, replacement in [(('reason',), 'DATA_DESCRIPTOR_WITH_SUPPORTED_METHOD'),
                (('implementation', 'commit'), '0' * 40), (('observed', 'sha256'), '0' * 64),
                (('source_identity_verified',), False), (('row_count',), 0),
                (('exposure', 'header_checks_completed'), True), (('exposure', 'worksheet_cells_decoded'), True),
                (('exposure', 'flag_family_classified'), False), (('capture_identity', 'receipt_sha256'), '0' * 64)]:
            value = deepcopy(report)
            target = value
            for key in path[:-1]:
                target = target[key]
            target[path[-1]] = replacement
            with self.assertRaisesRegex(module.ProfileError, '^FLAG_PREREQUISITE_INVALID$'):
                module._validate_flag_receipt(canonical(value))
        for bad in (None, raw.decode(), raw + b' ', raw.replace(b'{', b'{"status":"BLOCKED_SCHEMA",', 1),
                    canonical({**report, 'physical_truth': True})):
            with self.assertRaisesRegex(module.ProfileError, '^FLAG_PREREQUISITE_INVALID$'):
                module._validate_flag_receipt(bad)
        report['implementation']['files'].clear()
        report['capture_identity']['files'].clear()
        self.assertEqual(canonical(module._expected_flag_receipt()), raw)

    def stub_envelope(self, read, validate_capture=True, verify_source=True, absent_error=False):
        stack, writes, slots = ExitStack(), [], []
        stack.enter_context(patch.object(module, 'production_context', return_value={'mode': 'synthetic_guard_stub'}))
        stack.enter_context(patch.object(module.custody, '_receipt_path', side_effect=lambda path: slots.append(path) or Path(path)))
        stack.enter_context(patch.object(module.custody, '_output_directory', return_value=123))
        stack.enter_context(patch.object(module.custody, '_absent_at', side_effect=module.CustodyError('OUTPUT_CONFLICT') if absent_error else None))
        stack.enter_context(patch.object(module.custody.os, 'close'))
        stack.enter_context(patch.object(module.custody, '_read_relative', side_effect=read))
        stack.enter_context(patch.object(module.custody, '_write_at', side_effect=lambda *args: writes.append(args)))
        if validate_capture:
            stack.enter_context(patch.object(module.header_diagnostic, '_validate_capture', return_value={'synthetic': True}))
        if verify_source:
            stack.enter_context(patch.object(module.custody, '_verify_source', side_effect=lambda raw, sha: self.assertEqual(sha, module.header_diagnostic.OBJECT_SHA256)))
        return stack, writes, slots

    def test_forged_or_missing_flag_receipt_blocks_before_capture_and_object(self):
        for raw in (b'{}', canonical({**module._expected_flag_receipt(), 'reason': 'OTHER_OR_MIXED_FLAGS'})):
            reads = []
            def read(path, cap):
                reads.append(path)
                self.assertEqual(path, module.FLAG_RECEIPT)
                return raw
            stack, writes, _ = self.stub_envelope(read)
            with stack:
                report = module.envelope('1')
            self.assertEqual(report['reason'], 'FLAG_PREREQUISITE_INVALID')
            self.assertEqual(reads, [module.FLAG_RECEIPT])
            self.assertEqual(writes, [])
            self.assertIs(report['exposure']['raw_buffer_read_started'], False)

    def test_capture_rejection_and_partial_read_exposure_preserve_unknowns(self):
        valid_flag = canonical(module._expected_flag_receipt())
        for failure in ('capture', 'read', 'identity'):
            reads = []
            def read(path, cap):
                reads.append(path)
                if path == module.FLAG_RECEIPT:
                    return valid_flag
                if path == module.custody.CAPTURE:
                    return b'{}'
                if failure == 'read':
                    raise module.CustodyError('FILE_READ_FAILED')
                return b'SYNTHETIC_TOO_SHORT'
            stack, writes, _ = self.stub_envelope(read, validate_capture=failure != 'capture', verify_source=failure != 'identity')
            with stack:
                report = module.envelope('1')
            self.assertEqual(writes, [])
            self.assertEqual(report['status'], 'BLOCKED_GUARD')
            self.assertIs(report['source_identity_verified'], False)
            self.assertIsNone(report['observed'])
            if failure == 'capture':
                self.assertEqual(report['reason'], 'CAPTURE_RECEIPT_INVALID')
                self.assertEqual(reads, [module.FLAG_RECEIPT, module.custody.CAPTURE])
                self.assertIs(report['exposure']['raw_buffer_read_started'], False)
            elif failure == 'read':
                self.assertEqual(report['reason'], 'FILE_READ_FAILED')
                self.assertIs(report['exposure']['raw_buffer_read_started'], True)
                self.assertIs(report['exposure']['raw_buffer_read_completed'], False)
                self.assertIsNone(report['exposure']['target_bearing_source_bytes_read'])
            else:
                self.assertEqual(report['reason'], 'SOURCE_SIZE_MISMATCH')
                self.assertIs(report['exposure']['raw_buffer_read_completed'], True)
                self.assertIs(report['exposure']['target_bearing_source_bytes_read'], True)

    def test_positive_fully_stubbed_path_fixed_slots_and_exclusive_conflict(self):
        flag = canonical(module._expected_flag_receipt())
        raw = fixture()
        for run in ('1', '2'):
            reads = []
            def read(path, cap):
                reads.append((path, cap))
                return flag if path == module.FLAG_RECEIPT else b'SYNTHETIC_CAPTURE' if path == module.custody.CAPTURE else raw
            stack, writes, slots = self.stub_envelope(read)
            with stack:
                report = module.envelope(run)
            self.assert_closed(report)
            self.assertEqual(report['engineering_status'], 'ENVELOPE_VALID')
            self.assertEqual(report['flag_receipt_sha256'], hashlib.sha256(flag).hexdigest())
            self.assertEqual(report['flag_producer_commit'], module.FLAG_PRODUCER_COMMIT)
            self.assertEqual(slots, [f'.cache/li-v3-custody/compatible-envelope-v1/{run}/public.json'])
            self.assertEqual(reads, [(module.FLAG_RECEIPT, 65536), (module.custody.CAPTURE, 65536),
                                    (module.custody.OBJECT, module.custody.SOURCE_BYTES)])
            self.assertEqual(writes, [(123, 'public.json', canonical(report))])
        stack, writes, _ = self.stub_envelope(denied, absent_error=True)
        with stack:
            report = module.envelope('1')
        self.assertEqual(report['reason'], 'OUTPUT_CONFLICT')
        self.assertEqual(writes, [])

    def test_invalid_run_and_cli_never_echo_input_or_read_custody(self):
        for run in (None, False, 1, '3', '../../SECRET_CANARY'):
            report = module.envelope(run)
            self.assertEqual(report['reason'], 'CLI_ARGUMENT_INVALID')
            self.assertNotIn('SECRET_CANARY', str(report))
        output = io.StringIO()
        with redirect_stdout(output):
            result = module.main(['envelope', '--run', 'SECRET_CANARY'])
        self.assertEqual(result, 2)
        self.assertNotIn('SECRET_CANARY', output.getvalue())
        self.assertIn('CLI_ARGUMENT_INVALID', output.getvalue())


if __name__ == '__main__':
    unittest.main()
