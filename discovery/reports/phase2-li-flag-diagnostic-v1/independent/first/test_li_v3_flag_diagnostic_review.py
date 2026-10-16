"""Independent synthetic first-flag and custody-guard challenges; no actual source."""
from __future__ import annotations

from contextlib import ExitStack, redirect_stdout
import hashlib
import importlib.util
import io
import itertools
from pathlib import Path
import struct
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import zlib

sys.dont_write_bytecode = True
ROOT = next(p for p in Path(__file__).absolute().parents
            if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
CANDIDATE = ROOT / '.cache/phase2-li-flags-candidate-v1/promotion/scripts/li_v3_flag_diagnostic.py'
TRACKED = ROOT / 'scripts/li_v3_flag_diagnostic.py'
SOURCE = TRACKED if TRACKED.is_file() else CANDIDATE

def forbidden(*args, **kwargs):
    raise AssertionError('FORBIDDEN_EXTERNAL_OR_PAYLOAD_ACCESS')

# Prevent network even while importing the candidate and unchanged dependencies.
with ExitStack() as guards:
    for name in ['socket.socket', 'socket.create_connection', 'socket.getaddrinfo',
                 'urllib.request.urlopen']:
        guards.enter_context(patch(name, side_effect=forbidden))
    spec = importlib.util.spec_from_file_location('independent_li_flag_candidate', SOURCE)
    diagnostic = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(diagnostic)

NAMES = ('[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml',
         'xl/_rels/workbook.xml.rels')


def entry(name, flags=0, method=0, payload=b'<not-xml CANARY_A>', **changes):
    result = {'name': name, 'flags': flags, 'method': method, 'payload': payload}
    result.update(changes)
    return result


def archive(entries, order=None):
    """Independent header framing; opaque bodies are intentionally not valid XML."""
    locals_, centrals, offset = [], [], 0
    for record in entries:
        name = record['name'].encode('ascii')
        payload = record['payload']; size = len(payload); crc = zlib.crc32(payload)
        flags = record['flags']; method = record['method']
        local = struct.pack('<4s5H3L2H', b'PK\x03\x04', 20,
                            record.get('local_flags', flags), record.get('local_method', method),
                            0, 33, crc, size, size, len(name), 0) + name + payload
        central = struct.pack('<4s6H3L5H2L', b'PK\x01\x02', 20, 20, flags, method,
                              0, 33, crc, size, size, len(name), 0, 0, 0, 0, 0,
                              record.get('header_offset', offset)) + name
        locals_.append(local); centrals.append(central); offset += len(local)
    directory = b''.join(centrals[i] for i in (order if order is not None else range(len(centrals))))
    return b''.join(locals_) + directory + struct.pack('<4s4H2LH', b'PK\x05\x06', 0, 0,
                                                    len(entries), len(entries), len(directory), offset, 0)


def fixture(flags, method=8, **changes):
    return archive([entry(NAMES[0], flags, method, **changes),
                    *[entry(name) for name in NAMES[1:]]])


OPTION_SETS = {2, 4, 6, 2050, 2052, 2054}
DESCRIPTOR_SETS = {0: {8, 2056}, 8: {8, 10, 12, 14, 2056, 2058, 2060, 2062}}


def expected_family(flags, method):
    # Enumerated accepted sets rather than the implementation's complement masks.
    if any(flags & (1 << bit) for bit in (0, 6, 13)):
        return 'ENCRYPTION_OR_HEADER_MASKING_PRESENT'
    if method == 8 and flags in OPTION_SETS:
        return 'DEFLATE_OPTION_FLAGS_ONLY'
    if flags in DESCRIPTOR_SETS.get(method, set()):
        return 'DATA_DESCRIPTOR_WITH_SUPPORTED_METHOD'
    return 'OTHER_OR_MIXED_FLAGS'


class FlagDiagnosticIndependentReview(unittest.TestCase):
    def setUp(self):
        self.guards = ExitStack(); self.addCleanup(self.guards.close)
        self.denied = []
        self.slot_requests = []
        for name in ['socket.socket', 'socket.create_connection', 'socket.getaddrinfo',
                     'urllib.request.urlopen', 'zipfile.ZipFile.open', 'zipfile.ZipFile.read',
                     'zipfile.ZipFile.extract', 'zipfile.ZipFile.extractall',
                     'zlib.decompress', 'zlib.decompressobj', 'bz2.decompress', 'lzma.decompress',
                     'xml.etree.ElementTree.fromstring', 'xml.etree.ElementTree.parse']:
            self.denied.append(self.guards.enter_context(patch(name, side_effect=forbidden)))
        self.guards.enter_context(patch.object(diagnostic.subprocess, 'run', side_effect=forbidden))
        for name in ['_read_relative', '_read_at', '_receipt_path', '_output_directory', '_write_at', '_open_once']:
            self.guards.enter_context(patch.object(diagnostic.custody, name, side_effect=forbidden))

    def tearDown(self):
        for guard in self.denied:
            self.assertEqual(guard.call_count, 0, 'A forbidden API was attempted, even if caught.')

    def assert_closed(self, report):
        self.assertEqual(set(report), {'schema', 'status', 'reason', 'legacy_zip_reason', 'profile',
            'synthetic_fixture', 'source_identity_verified', 'implementation', 'capture_identity',
            'observed', 'exposure', 'row_count', 'paired_count', 'source_group_count', 'overlap_count',
            'overlap_status', 'prior_diagnostic_reason'})
        self.assertEqual(report['schema'], 'lupine.discovery.li_v3.flag_diagnostic.v1')
        self.assertEqual(report['status'], 'BLOCKED_SCHEMA')
        self.assertEqual(report['profile'], 'li_v3.first_flag_family.v1')
        self.assertIs(report['synthetic_fixture'], True)
        self.assertIs(report['source_identity_verified'], False)
        for key in ['implementation','capture_identity','observed','row_count','paired_count','source_group_count','overlap_count']:
            self.assertIsNone(report[key])
        self.assertEqual(report['overlap_status'], 'NOT_ASSESSED')
        exposure = report['exposure']
        self.assertEqual(set(exposure), {'raw_buffer_read_started','raw_buffer_read_completed',
            'target_bearing_source_bytes_read','header_checks_started','header_checks_completed',
            'directory_name_decoding_started','directory_name_decoding_completed','member_names_published',
            'members_decompressed','xml_decoded','worksheet_cells_decoded','shared_strings_decoded',
            'target_numeric_validity_checked','scientific_eligibility_decisions','sampling_independence_established',
            'fits','splits','flag_entry_reparse_started','flag_entry_reparse_completed','flag_family_classified'})
        for key in ['raw_buffer_read_started','raw_buffer_read_completed','target_bearing_source_bytes_read',
                    'member_names_published','xml_decoded','worksheet_cells_decoded','shared_strings_decoded',
                    'target_numeric_validity_checked','scientific_eligibility_decisions','sampling_independence_established']:
            self.assertIs(exposure[key], False)
        self.assertEqual(exposure['members_decompressed'], [])
        self.assertEqual((exposure['fits'],exposure['splits']), (0,0))

    def test_enumerated_flag_families_across_methods(self):
        bits = (0,1,2,3,5,6,11,13,15)
        flags_set = {sum((1 << bit) for bit, on in zip(bits, choices) if on)
                     for choices in itertools.product([False,True], repeat=len(bits))}
        flags_set.update(1 << bit for bit in range(16))
        flags_set.update((1 << bit) | 0x800 for bit in range(16))
        # 526 distinct masks, including every individual flag and UTF-8 coexistence.
        for method in [0,6,8,9,14,93]:
            for flags in sorted(flags_set - {0,0x800}):
                with self.subTest(flags=flags, method=method):
                    report = diagnostic.inspect_synthetic_flags(fixture(flags,method))
                    self.assertEqual(report['reason'], expected_family(flags,method))
                    self.assertEqual(report['prior_diagnostic_reason'], 'MEMBER_FLAGS')
                    self.assertEqual(report['legacy_zip_reason'], 'ZIP_LAYOUT_UNSUPPORTED')
                    self.assertIs(report['exposure']['flag_family_classified'], True)

    def test_closed_projection_and_opaque_canary_invariance(self):
        a = [entry(NAMES[0],6,8), *[entry(name) for name in NAMES[1:]],
             entry('xl/worksheets/sheet123.xml',payload=b'OUTCOME_CANARY_A'),
             entry('xl/sharedStrings.xml',payload=b'<INVALID SECRET_A>')]
        b = [entry(NAMES[0],6,8,payload=b'ANOTHER_OPAQUE_TARGET_CANARY'),
             *[entry(name,payload=b'INVALID_XML_SECRET_B') for name in NAMES[1:]],
             entry('xl/worksheets/sheet789.xml',payload=b'OUTCOME_CANARY_B_99999'),
             entry('xl/sharedStrings.xml',payload=b'<!DOCTYPE BAD_SECRET>')]
        first = diagnostic.inspect_synthetic_flags(archive(a)); second = diagnostic.inspect_synthetic_flags(archive(b))
        self.assert_closed(first); self.assertEqual(first,second)
        text = diagnostic.custody.canonical(first)
        for secret in [b'CANARY',b'SECRET',b'sheet123',b'sheet789',b'sharedStrings',b'flag_bits',b'compress_type']:
            self.assertNotIn(secret,text)
        first['exposure']['members_decompressed'].append('MUTATION')
        self.assertEqual(second,diagnostic.inspect_synthetic_flags(archive(b)))

    def test_selects_first_failure_by_local_offset_not_directory_order_or_severity(self):
        records = [entry(NAMES[0]),entry(NAMES[1],2,8),entry(NAMES[2],1,0),entry(NAMES[3])]
        report = diagnostic.inspect_synthetic_flags(archive(records,order=[2,3,1,0]))
        self.assertEqual(report['reason'],'DEFLATE_OPTION_FLAGS_ONLY')
        records[1] = entry(NAMES[1],1,0);records[2] = entry(NAMES[2],2,8)
        self.assertEqual(diagnostic.inspect_synthetic_flags(archive(records,order=[2,3,1,0]))['reason'],
                         'ENCRYPTION_OR_HEADER_MASKING_PRESENT')

    def test_earlier_nonflag_failures_prevent_later_flag_disclosure(self):
        cases = [(entry('../EARLIER_CANARY'), 'MEMBER_PATH_PROFILE'),
                 (entry(NAMES[0],0,14), 'MEMBER_COMPRESSION'),
                 (entry(NAMES[0],0,0,local_flags=8), 'LOCAL_HEADER_AGREEMENT')]
        for first, prior in cases:
            with self.subTest(prior=prior):
                raw=archive([first,entry(NAMES[1],1,0),entry(NAMES[2]),entry(NAMES[3])])
                report=diagnostic.inspect_synthetic_flags(raw)
                self.assertEqual(report['reason'],'EXPECTED_FLAG_FAILURE_NOT_REPRODUCED')
                self.assertEqual(report['prior_diagnostic_reason'],prior)
                self.assertIs(report['exposure']['flag_entry_reparse_started'],False)
                self.assertNotIn('CANARY',str(report))

    def test_empty_or_utf8_only_flags_do_not_invent_the_expected_failure(self):
        for flags in [0,0x800]:
            report=diagnostic.inspect_synthetic_flags(fixture(flags,0))
            self.assert_closed(report)
            self.assertEqual(report['reason'],'EXPECTED_FLAG_FAILURE_NOT_REPRODUCED')
            self.assertEqual(report['prior_diagnostic_reason'],'HEADER_PROFILE_ACCEPTED')
            self.assertIs(report['exposure']['header_checks_completed'],True)
            self.assertIs(report['exposure']['flag_entry_reparse_started'],False)

    def test_descriptor_category_proves_no_descriptor_or_local_agreement(self):
        # No descriptor bytes are present and local flags deliberately disagree.
        report=diagnostic.inspect_synthetic_flags(fixture(0x80e,8,local_flags=0))
        self.assertEqual(report['reason'],'DATA_DESCRIPTOR_WITH_SUPPORTED_METHOD')
        self.assertIs(report['exposure']['header_checks_completed'],False)
        self.assert_closed(report)

    def test_reparse_failure_is_constant_and_exposure_is_not_completed(self):
        with patch.object(diagnostic.header_diagnostic,'_classify',return_value='MEMBER_FLAGS'), \
             patch.object(diagnostic.zipfile,'ZipFile',side_effect=ValueError('SECRET_CANARY')):
            report=diagnostic.inspect_synthetic_flags(b'SYNTHETIC_BUFFER')
        self.assertEqual(report['reason'],'FLAG_METADATA_PARSE_FAILED')
        self.assertIs(report['exposure']['flag_entry_reparse_started'],True)
        self.assertIs(report['exposure']['flag_entry_reparse_completed'],False)
        self.assertIs(report['exposure']['flag_family_classified'],False)
        self.assertNotIn('SECRET_CANARY',str(report))

    def test_input_bounds_types_and_faked_actual_identity_reject_before_parsing(self):
        with patch.object(diagnostic,'_inspect',side_effect=forbidden) as inspect:
            for value in [None,False,'PATH',bytearray(b'x'),memoryview(b'x')]:
                with self.assertRaisesRegex(diagnostic.custody.CustodyError,'^RAW_TYPE_INVALID$'):
                    diagnostic.inspect_synthetic_flags(value)
            with self.assertRaisesRegex(diagnostic.custody.CustodyError,'^SOURCE_SIZE_MISMATCH$'):
                diagnostic.inspect_synthetic_flags(bytes(diagnostic.custody.SOURCE_BYTES+1))
            with patch.object(diagnostic.hashlib,'sha256',return_value=SimpleNamespace(hexdigest=lambda:diagnostic.header_diagnostic.OBJECT_SHA256)):
                with self.assertRaisesRegex(diagnostic.custody.CustodyError,'^SYNTHETIC_REAL_SOURCE_FORBIDDEN$'):
                    diagnostic.inspect_synthetic_flags(b'NOT_REAL_SOURCE')
            with patch.object(diagnostic.hashlib,'md5',return_value=SimpleNamespace(hexdigest=lambda:diagnostic.custody.SOURCE_MD5)):
                with self.assertRaisesRegex(diagnostic.custody.CustodyError,'^SYNTHETIC_REAL_SOURCE_FORBIDDEN$'):
                    diagnostic.inspect_synthetic_flags(bytes(diagnostic.custody.SOURCE_BYTES))
            inspect.assert_not_called()

    def test_malformed_headers_and_member_limit_do_not_reparse(self):
        for raw,prior in [(b'x','HEADER_TOO_SHORT'),(bytes(22),'END_RECORD_PROFILE'),
                          (archive([]),'MEMBER_LIMIT'),
                          (archive([entry('xl/worksheets/sheet%d.xml'%i) for i in range(1,130)]),'MEMBER_LIMIT')]:
            report=diagnostic.inspect_synthetic_flags(raw)
            self.assertEqual(report['prior_diagnostic_reason'],prior)
            self.assertEqual(report['reason'],'EXPECTED_FLAG_FAILURE_NOT_REPRODUCED')
            self.assertIs(report['exposure']['flag_entry_reparse_started'],False)

    def test_all_nine_prior_frozen_pins_match_public_source_bytes(self):
        old={**diagnostic.header_diagnostic.LEGACY_FILES,**diagnostic.PRIOR_FILES}
        self.assertEqual(len(old),9)
        for relative,expected in old.items():
            with self.subTest(path=relative):
                self.assertEqual(hashlib.sha256((ROOT/relative).read_bytes()).hexdigest(),expected)

    def test_ignored_path_blocks_before_prior_guard_git_or_cache(self):
        with patch.object(diagnostic,'__file__',str(ROOT/'.cache/forbidden-candidate.py')), \
             patch.object(diagnostic.header_diagnostic,'production_context',side_effect=forbidden) as prior:
            with self.assertRaisesRegex(diagnostic.custody.CustodyError,'^FROZEN_SOURCE_REQUIRED$'):
                diagnostic.production_context()
            prior.assert_not_called()

    def fake_context(self, changed_prior=False, changed_blob=False):
        stack=ExitStack()
        prior={'commit':'a'*40,'files':dict(diagnostic.PRIOR_FILES)}
        if changed_prior:prior['files']['tests/test_li_v3_zip_diagnostic_review.py']='0'*64
        fake={path:('SYNTHETIC_SOURCE:'+path).encode() for path in diagnostic.FROZEN_PATHS}
        def git(command,**kwargs):
            if command==['git','rev-parse','--show-prefix']:return SimpleNamespace(stdout=b'discovery/\n')
            ref=command[2]
            for path,data in fake.items():
                if ref in ['a'*40+':discovery/'+path,':discovery/'+path]:
                    return SimpleNamespace(stdout=b'CHANGED' if changed_blob and ref.startswith(':') else data)
            raise AssertionError('UNEXPECTED_GIT')
        stack.enter_context(patch.object(diagnostic,'__file__',str(ROOT/diagnostic.FROZEN_PATHS[0])))
        stack.enter_context(patch.object(diagnostic.header_diagnostic,'production_context',return_value=prior))
        stack.enter_context(patch.object(diagnostic.custody,'_read_relative',side_effect=lambda path,cap:fake[path]))
        stack.enter_context(patch.object(diagnostic.subprocess,'run',side_effect=git))
        return stack,fake

    def test_positive_stubbed_production_context_and_changed_pin_or_index_fail_closed(self):
        stack,fake=self.fake_context()
        with stack:
            result=diagnostic.production_context()
            self.assertEqual(result['files'],{p:hashlib.sha256(v).hexdigest() for p,v in fake.items()})
            self.assertEqual(result['prior_files'],diagnostic.PRIOR_FILES)
            result['prior_files'].clear()
            self.assertEqual(diagnostic.production_context()['prior_files'],diagnostic.PRIOR_FILES)
        for kwargs in [{'changed_prior':True},{'changed_blob':True}]:
            stack,_=self.fake_context(**kwargs)
            with stack,self.assertRaisesRegex(diagnostic.custody.CustodyError,'^FROZEN_SOURCE_REQUIRED$'):
                diagnostic.production_context()

    def fake_diagnose(self,read,validate=True,verify=True):
        stack=ExitStack();written=[]
        stack.enter_context(patch.object(diagnostic,'production_context',return_value={'mode':'synthetic_guard_stub'}))
        stack.enter_context(patch.object(diagnostic.custody,'_receipt_path',side_effect=lambda path:self.slot_requests.append(path) or Path(path)))
        stack.enter_context(patch.object(diagnostic.custody,'_output_directory',return_value=123))
        stack.enter_context(patch.object(diagnostic.custody,'_absent_at'))
        stack.enter_context(patch.object(diagnostic.custody.os,'close'))
        stack.enter_context(patch.object(diagnostic.custody,'_read_relative',side_effect=read))
        if validate:stack.enter_context(patch.object(diagnostic.header_diagnostic,'_validate_capture',return_value={'observed':{'synthetic_stub':True}}))
        if verify:stack.enter_context(patch.object(diagnostic.custody,'_verify_source',side_effect=lambda raw,expected:self.assertEqual(expected,diagnostic.header_diagnostic.OBJECT_SHA256)))
        stack.enter_context(patch.object(diagnostic.custody,'_write_at',side_effect=lambda *args:written.append(args)))
        return stack,written

    def test_pinned_capture_rejection_happens_before_object_read(self):
        reads=[]
        def read(path,cap):
            reads.append(path)
            if path!=diagnostic.custody.CAPTURE:raise AssertionError('OBJECT_READ_FORBIDDEN')
            return b'{}'
        stack,written=self.fake_diagnose(read,validate=False)
        with stack:report=diagnostic.diagnose('1')
        self.assertEqual(report['reason'],'CAPTURE_RECEIPT_INVALID')
        self.assertEqual(reads,[diagnostic.custody.CAPTURE]);self.assertEqual(written,[])
        self.assertIs(report['exposure']['raw_buffer_read_started'],False)

    def test_failed_object_read_preserves_unknown_exposure_and_checksum_failure_stays_blocked(self):
        def failed(path,cap):
            if path==diagnostic.custody.CAPTURE:return b'SYNTHETIC_CAPTURE'
            raise diagnostic.custody.CustodyError('SOURCE_READ_BLOCKED')
        stack,written=self.fake_diagnose(failed)
        with stack:report=diagnostic.diagnose('1')
        self.assertEqual(report['reason'],'SOURCE_READ_BLOCKED');self.assertEqual(written,[])
        self.assertIs(report['exposure']['raw_buffer_read_started'],True)
        self.assertIs(report['exposure']['raw_buffer_read_completed'],False)
        self.assertIsNone(report['exposure']['target_bearing_source_bytes_read'])
        stack,written=self.fake_diagnose(lambda path,cap:b'SYNTHETIC_TOO_SHORT',verify=False)
        with stack:report=diagnostic.diagnose('2')
        self.assertEqual(report['reason'],'SOURCE_SIZE_MISMATCH');self.assertEqual(written,[])
        self.assertIs(report['exposure']['raw_buffer_read_completed'],True)
        self.assertIs(report['source_identity_verified'],False)
        self.assertIsNone(report['observed'])

    def test_stubbed_production_uses_fixed_slots_and_never_claims_schema_readiness(self):
        raw=fixture(6,8);read_calls=[]
        def read(path,cap):
            read_calls.append((path,cap))
            return b'SYNTHETIC_CAPTURE' if path==diagnostic.custody.CAPTURE else raw
        for run in ['1','2']:
            stack,written=self.fake_diagnose(read)
            with stack:report=diagnostic.diagnose(run)
            self.assertEqual(report['status'],'BLOCKED_SCHEMA')
            self.assertEqual(report['reason'],'DEFLATE_OPTION_FLAGS_ONLY')
            self.assertEqual(len(written),1)
            self.assertEqual(written[0][1],'public.json')
            self.assertEqual(written[0][2],diagnostic.custody.canonical(report))
            self.assertIs(report['exposure']['worksheet_cells_decoded'],False)
        self.assertEqual(self.slot_requests,['.cache/li-v3-custody/flag-diagnostic-v1/1/public.json','.cache/li-v3-custody/flag-diagnostic-v1/2/public.json'])
        self.assertEqual(read_calls,[(diagnostic.custody.CAPTURE,65536),(diagnostic.custody.OBJECT,diagnostic.custody.SOURCE_BYTES)]*2)
        for invalid in [None,True,1,'0','3','CANARY_PATH']:
            report=diagnostic.diagnose(invalid)
            self.assertEqual(report['reason'],'CLI_ARGUMENT_INVALID')
            self.assertNotIn('CANARY_PATH',str(report))

    def test_cli_error_uses_constant_output_without_input_echo(self):
        output=io.StringIO()
        with redirect_stdout(output):code=diagnostic.main(['diagnose','--run','SECRET_CANARY'])
        self.assertEqual(code,2);self.assertNotIn('SECRET_CANARY',output.getvalue())
        self.assertIn('CLI_ARGUMENT_INVALID',output.getvalue())


if __name__=='__main__':
    unittest.main()
