"""Separate compatible-profile tests; synthetic payloads and public source bytes only."""
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
import subprocess
import unittest
from unittest.mock import patch
import zipfile

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('li_compatible_author', HERE.parent / 'scripts/li_v3_compatible_envelope.py')
M = importlib.util.module_from_spec(spec)
spec.loader.exec_module(M)
CANARY = b'WITHHELD_COMPATIBLE_TARGET_71839'
CT, REL, DOC, SS = M.custody.CT, M.custody.REL, M.custody.DOCREL, M.custody.SS


def parts(canary=CANARY):
    data = {
        '[Content_Types].xml': (f'<Types xmlns="{CT}"><Default Extension="rels" ContentType="{M.custody.REL_TYPE}"/>'
            f'<Override PartName="/xl/workbook.xml" ContentType="{M.custody.MAIN_TYPE}"/>'
            + ''.join(f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="{M.custody.SHEET_TYPE}"/>' for i in range(1,4))
            + '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>'
            + '</Types>').encode(),
        '_rels/.rels': (f'<Relationships xmlns="{REL}"><Relationship Id="rId1" Type="{DOC}officeDocument" Target="xl/workbook.xml"/></Relationships>').encode(),
        'xl/workbook.xml': (f'<workbook xmlns="{SS}" xmlns:r="{DOC[:-1]}"><sheets>'
            + ''.join(f'<sheet name="{name}" sheetId="{i}" r:id="rId{i}"/>' for i,name in enumerate(('Opaque','References','Column Descriptions'),1))
            + '</sheets></workbook>').encode(),
        'xl/_rels/workbook.xml.rels': (f'<Relationships xmlns="{REL}">'
            + ''.join(f'<Relationship Id="rId{i}" Type="{DOC}worksheet" Target="worksheets/sheet{i}.xml"/>' for i in range(1,4))
            + '</Relationships>').encode(),
        'xl/sharedStrings.xml': b'\xff\x00' + canary,
    }
    for i in range(1,4):
        data[f'xl/worksheets/sheet{i}.xml'] = b'\xff\x00<opaque-not-XML>' + canary
    return data


def archive(data=None, flags=2, method=8, *, central_only=False):
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, 'w', compression=method) as output:
        for name, value in (parts() if data is None else data).items():
            output.writestr(name, value)
    raw = bytearray(stream.getvalue())
    central = struct.unpack('<4s4H2LH', raw[-22:])[-2]
    while raw[central:central+4] == b'PK\x01\x02':
        local = struct.unpack_from('<L', raw, central+42)[0]
        struct.pack_into('<H', raw, central+8, flags)
        if not central_only:
            struct.pack_into('<H', raw, local+6, flags)
        central += 46 + sum(struct.unpack_from('<3H', raw, central+28))
    return bytes(raw)


def central_entries(raw):
    result=[]; cursor=struct.unpack('<4s4H2LH', raw[-22:])[-2]
    while raw[cursor:cursor+4] == b'PK\x01\x02':
        result.append(cursor)
        cursor += 46 + sum(struct.unpack_from('<3H', raw, cursor+28))
    return result


class CompatibleTests(unittest.TestCase):
    def setUp(self):
        self.stack=ExitStack(); self.addCleanup(self.stack.close)
        self.stack.enter_context(patch.object(socket,'socket',side_effect=AssertionError('no network')))
        self.stack.enter_context(patch.object(socket,'getaddrinfo',side_effect=AssertionError('no DNS')))

    def inspect(self, raw):
        original=zipfile.ZipFile.open; seen=[]
        def guarded(instance,name,*args,**kwargs):
            actual=name.filename if isinstance(name,zipfile.ZipInfo) else name
            self.assertIn(actual,M.ENVELOPE_MEMBERS)
            seen.append(actual)
            return original(instance,name,*args,**kwargs)
        with patch.object(zipfile.ZipFile,'open',guarded):
            result=M.inspect_synthetic_envelope(raw)
        self.assertEqual(result['schema'],M.SCHEMA)
        self.assertEqual(result['parser_profile'],M.PROFILE)
        self.assertEqual(result['status'],'BLOCKED_SCHEMA')
        self.assertFalse(result['source_identity_verified'])
        self.assertNotIn(CANARY.decode(),json.dumps(result))
        self.assertFalse(result['exposure']['worksheet_cells_decoded'])
        self.assertFalse(result['exposure']['shared_strings_decoded'])
        for key in ('row_count','paired_count','source_group_count','overlap_count'):
            self.assertIsNone(result[key])
        return result,seen

    def test_exact_single_predicate_ast_delta_and_original_bindings(self):
        original_tree=ast.parse((M.ROOT/'scripts/li_v3_custody.py').read_text())
        original=deepcopy(next(n for n in original_tree.body if isinstance(n,ast.FunctionDef) and n.name=='_zip_structure'))
        candidate_tree=ast.parse(Path(M.__file__).read_text())
        candidate=next(n for n in candidate_tree.body if isinstance(n,ast.FunctionDef) and n.name=='_compatible_zip_structure')
        original.name='_compatible_zip_structure'; changed=[]
        old=ast.dump(ast.parse('info.flag_bits & ~0x800',mode='eval').body,include_attributes=False)
        replacement=ast.parse('~(0x806 if info.compress_type == 8 else 0x800)',mode='eval').body
        for node in ast.walk(original):
            if ast.dump(node,include_attributes=False)==old:
                node.right=deepcopy(replacement);changed.append(True)
        self.assertEqual(len(changed),1)
        self.assertEqual(ast.dump(original,include_attributes=False),ast.dump(candidate,include_attributes=False))
        self.assertIs(M._canonical_member,M.custody._canonical_member)
        self.assertIs(M._member_type,M.custody._member_type)
        self.assertIs(M.CustodyError,M.custody.CustodyError)
        self.assertEqual(M.MAX_MEMBERS,M.custody.MAX_MEMBERS)
        self.assertIs(M.ENVELOPE_MEMBERS,M.custody.ENVELOPE_MEMBERS)

    def test_each_option_combination_with_utf8_has_same_envelope_semantics(self):
        for flags in (2,4,6,0x802,0x804,0x806):
            with self.subTest(flags=flags):
                raw=archive(flags=flags);result,seen=self.inspect(raw)
                self.assertEqual(result['engineering_status'],'ENVELOPE_VALID')
                self.assertEqual(seen,list(M.ENVELOPE_MEMBERS))
                self.assertEqual(result['recognized_roles']['References'],{'present':True,'ordinal':2})
                self.assertEqual(M.custody.inspect_synthetic_envelope(raw)['reason'],'ZIP_LAYOUT_UNSUPPORTED')

    def test_original_clear_utf8_profiles_have_unchanged_semantics(self):
        for method in (0,8):
            for flags in (0,0x800):
                raw=archive(flags=flags,method=method)
                old=M.custody.inspect_synthetic_envelope(raw);new,_=self.inspect(raw)
                for key in ('status','engineering_status','reason','member_count','sheet_count','recognized_roles','exposure'):
                    self.assertEqual(new[key],old[key])

    def test_stored_options_and_every_nonoption_flag_reject_before_xml(self):
        cases=[(flags,0) for flags in (2,4,6,0x802)]+[(flag,8) for flag in (1,8,10,14,16,32,64,128,256,512,1024,4096,8192,16384,32768)]
        for flags,method in cases:
            with self.subTest(flags=flags,method=method):
                result,seen=self.inspect(archive(flags=flags,method=method))
                self.assertEqual(result['reason'],'ZIP_LAYOUT_UNSUPPORTED');self.assertEqual(seen,[])

    def test_local_central_flag_mismatch_is_not_cleared(self):
        result,seen=self.inspect(archive(flags=2,central_only=True))
        self.assertEqual(result['reason'],'ZIP_LAYOUT_UNSUPPORTED');self.assertEqual(seen,[])

    def test_later_bad_flags_or_headers_still_reject(self):
        for offset,fmt,value in ((8,'<H',8),(6,'<H',21),(10,'<H',9),(42,'<L',1)):
            raw=bytearray(archive());entry=central_entries(raw)[-1]
            struct.pack_into(fmt,raw,entry+offset,value)
            result,seen=self.inspect(bytes(raw))
            self.assertEqual(result['engineering_status'],'BLOCKED_LAYOUT');self.assertEqual(seen,[])

    def test_old_nonflag_rejections_preserved(self):
        fixtures=[b'bad',archive(flags=0)[:-1]]
        for offset,fmt,value in ((6,'<H',21),(10,'<H',99),(42,'<L',1)):
            raw=bytearray(archive(flags=0));entry=central_entries(raw)[0]
            struct.pack_into(fmt,raw,entry+offset,value);fixtures.append(bytes(raw))
        data=parts();data['../opaque.xml']=b'bad';fixtures.append(archive(data,flags=0))
        data=parts();data.pop('xl/workbook.xml');fixtures.append(archive(data,flags=0))
        for raw in fixtures:
            with self.subTest(size=len(raw)):
                old=M.custody.inspect_synthetic_envelope(raw);new,_=self.inspect(raw)
                self.assertEqual(new['reason'],old['reason'])
                self.assertEqual(new['exposure'],old['exposure'])

    def test_target_and_shared_string_payloads_stay_opaque(self):
        first,seen=self.inspect(archive(parts(CANARY)));second,_=self.inspect(archive(parts(b'OTHER_OPAQUE_999')))
        self.assertEqual(seen,list(M.ENVELOPE_MEMBERS))
        self.assertEqual({k:v for k,v in first.items() if k!='observed'},
                         {k:v for k,v in second.items() if k!='observed'})

    def test_xml_rejections_preserve_started_and_completed_exposure(self):
        data=parts();data['xl/workbook.xml']=data['xl/workbook.xml'].replace(b'<workbook ',b'<workbook unsupported="yes" ')
        result,_=self.inspect(archive(data))
        self.assertEqual(result['reason'],'WORKBOOK_UNSUPPORTED')
        self.assertEqual(result['exposure']['decompression_completed'],list(M.ENVELOPE_MEMBERS))
        self.assertEqual(result['exposure']['xml_decoding_completed'],list(M.ENVELOPE_MEMBERS))
        data=parts();data['[Content_Types].xml']=b'<!DOCTYPE hidden><bad/>'
        result,seen=self.inspect(archive(data))
        self.assertEqual(result['reason'],'XML_PROFILE_UNSUPPORTED')
        self.assertEqual(seen,[M.ENVELOPE_MEMBERS[0]])
        self.assertEqual(result['exposure']['xml_decoding_started'],[M.ENVELOPE_MEMBERS[0]])
        self.assertEqual(result['exposure']['xml_decoding_completed'],[])

    def test_original_xml_size_limit_still_applies(self):
        data=parts();data['[Content_Types].xml']=b' '*(M.custody.MAX_XML_BYTES+1)
        result,seen=self.inspect(archive(data))
        self.assertEqual(result['reason'],'XML_LIMIT')
        self.assertEqual(seen,[M.ENVELOPE_MEMBERS[0]])
        self.assertEqual(result['exposure']['decompression_completed'],[])

    def test_flag_receipt_requires_exact_producer_family_identity_and_exposure(self):
        good=M._expected_flag_receipt();raw=M.custody.canonical(good)
        self.assertEqual(M._validate_flag_receipt(raw),hashlib.sha256(raw).hexdigest())
        changes=[lambda d:d.update(reason='OTHER_OR_MIXED_FLAGS'),
                 lambda d:d['implementation'].update(commit='b'*40),
                 lambda d:d['implementation']['files'].update({'scripts/li_v3_flag_diagnostic.py':'0'*64}),
                 lambda d:d['observed'].update(sha256='0'*64),
                 lambda d:d['capture_identity'].update(receipt_sha256='0'*64),
                 lambda d:d['exposure'].update(flag_family_classified=False),
                 lambda d:d.update(row_count=1),lambda d:d.update(extra=CANARY.decode())]
        for change in changes:
            bad=deepcopy(good);change(bad)
            with self.assertRaisesRegex(M.ProfileError,'FLAG_PREREQUISITE_INVALID'):
                M._validate_flag_receipt(M.custody.canonical(bad))
        with self.assertRaisesRegex(M.ProfileError,'FLAG_PREREQUISITE_INVALID'):
            M._validate_flag_receipt(raw.replace(b'{',b'{"reason":"OTHER",',1))

    def test_unapproved_flag_receipt_blocks_before_private_capture_or_object(self):
        with patch.object(M,'production_context',return_value={'fake':True}), \
             patch.object(M.custody,'_output_directory',return_value=123), \
             patch.object(M.custody,'_absent_at'),patch.object(M.custody.os,'close'), \
             patch.object(M.custody,'_read_relative',return_value=b'not a receipt') as read:
            result=M.envelope('1')
        self.assertEqual(result['reason'],'FLAG_PREREQUISITE_INVALID')
        self.assertEqual(read.call_args_list[0].args[0],M.FLAG_RECEIPT)
        self.assertEqual(read.call_count,1)
        self.assertFalse(result['exposure']['raw_buffer_read_started'])

    def test_all_thirteen_prior_pins_match_actual_tracked_source(self):
        expected={**M.PRIOR_FILES,**M.flag_diagnostic.PRIOR_FILES,**M.header_diagnostic.LEGACY_FILES}
        self.assertEqual(len(expected),13)
        prefix=subprocess.run(['git','rev-parse','--show-prefix'],cwd=M.ROOT,capture_output=True,check=True).stdout.decode().strip()
        for path,digest in expected.items():
            raw=(M.ROOT/path).read_bytes()
            tracked=subprocess.run(['git','show','HEAD:'+prefix+path],cwd=M.ROOT,capture_output=True,check=True).stdout
            self.assertEqual(raw,tracked);self.assertEqual(hashlib.sha256(raw).hexdigest(),digest)

    def test_candidate_guard_precedes_cache_and_closed_cli(self):
        with patch.object(M,'__file__',str(M.ROOT/'.cache/uncommitted_compatible.py')), \
             patch.object(M.custody,'_read_relative') as read:
            result=M.envelope('1')
        self.assertEqual(result['reason'],'FROZEN_SOURCE_REQUIRED');read.assert_not_called()
        for argv in [('envelope','--run','3'),('envelope','--receipt','/tmp/free.json'),('envelope','--run','1','--object','/fake')]:
            with redirect_stdout(io.StringIO()) as out:self.assertEqual(M.main(argv),2)
            self.assertEqual(json.loads(out.getvalue())['reason'],'CLI_ARGUMENT_INVALID')

    def test_fixture_type_size_and_real_source_identity_reject(self):
        for raw,reason in ((bytearray(),'RAW_TYPE_INVALID'),
                           (b'x'*(M.custody.SOURCE_BYTES+1),'SOURCE_SIZE_MISMATCH')):
            with self.assertRaisesRegex(M.custody.CustodyError,reason):
                M.inspect_synthetic_envelope(raw)
        with patch.object(M.hashlib,'sha256') as digest:
            digest.return_value.hexdigest.return_value=M.header_diagnostic.OBJECT_SHA256
            with self.assertRaisesRegex(M.custody.CustodyError,'SYNTHETIC_REAL_SOURCE_FORBIDDEN'):
                M.inspect_synthetic_envelope(b'synthetic identity fixture')

    def test_positive_synthetic_committed_source_context(self):
        commit='a'*40
        files={path:('synthetic source '+path).encode() for path in M.FROZEN_PATHS}
        prior={'commit':commit,'files':dict(M.PRIOR_FILES)}
        def fake_git(command,**kwargs):
            if command==['git','rev-parse','--show-prefix']:raw=b'discovery/\n'
            else:
                self.assertEqual(command[:2],['git','show']);ref=command[2]
                prefix=commit+':discovery/' if ref.startswith(commit+':') else ':discovery/'
                self.assertTrue(ref.startswith(prefix));raw=files[ref[len(prefix):]]
            return subprocess.CompletedProcess(command,0,stdout=raw,stderr=b'')
        with patch.object(M,'__file__',str(M.ROOT/M.FROZEN_PATHS[0])), \
             patch.object(M.flag_diagnostic,'production_context',return_value=prior), \
             patch.object(M.custody,'_read_relative',side_effect=lambda path,cap:files[path]), \
             patch.object(M.subprocess,'run',side_effect=fake_git):
            result=M.production_context()
        self.assertEqual(result['commit'],commit)
        self.assertEqual(result['files'],{path:hashlib.sha256(raw).hexdigest() for path,raw in files.items()})
        self.assertEqual(result['prior_files'],M.PRIOR_FILES)

    def test_partial_object_read_preserves_unknown_exposure(self):
        def fake_read(path,cap):
            if path==M.FLAG_RECEIPT:return M.custody.canonical(M._expected_flag_receipt())
            if path==M.custody.CAPTURE:return b'capture for stubbed validator'
            self.assertEqual(path,M.custody.OBJECT);raise M.custody.CustodyError('FILE_READ_FAILED')
        with patch.object(M,'production_context',return_value={'fake':True}), \
             patch.object(M.custody,'_output_directory',return_value=123),patch.object(M.custody,'_absent_at'), \
             patch.object(M.custody.os,'close'),patch.object(M.header_diagnostic,'_validate_capture'), \
             patch.object(M.custody,'_read_relative',side_effect=fake_read):
            result=M.envelope('1')
        self.assertEqual(result['reason'],'FILE_READ_FAILED')
        self.assertTrue(result['exposure']['raw_buffer_read_started'])
        self.assertIsNone(result['exposure']['target_bearing_source_bytes_read'])
        self.assertFalse(result['exposure']['raw_buffer_read_completed'])


if __name__=='__main__':unittest.main()
