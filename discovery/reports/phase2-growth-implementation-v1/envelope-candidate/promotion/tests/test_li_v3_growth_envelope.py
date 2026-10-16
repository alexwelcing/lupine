"""Generated-fixture author checks; no actual source or production context."""
from contextlib import ExitStack, redirect_stderr
from copy import deepcopy
import ast
import gc
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import socket
import struct
import sys
import unittest
from unittest.mock import patch
import zipfile
import zlib

ROOT = next(p for p in Path(__file__).absolute().parents
            if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
CANDIDATE = '.cache' in Path(__file__).parts

def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module

if CANDIDATE:
    growth_source = ROOT / '.cache/phase2-growth-hint-production-candidate-v1/promotion/scripts/li_v3_growth_hint_shape.py'
    assert hashlib.sha256(growth_source.read_bytes()).hexdigest() == '1a2bd6443bfe090ab3264b82b60f105cfad16f40182b716f032fd773a2e8354a'
    load('li_v3_growth_hint_shape', growth_source)
SOURCE = ROOT / ('.cache/phase2-growth-envelope-candidate-v1/promotion/scripts/li_v3_growth_envelope.py'
                 if CANDIDATE else 'scripts/li_v3_growth_envelope.py')
M = load('growth_envelope_author', SOURCE)
CANARY = b'UNPUBLISHED_OUTCOME_882773'


def parts(sheet_count=3, shared=True, canary=CANARY):
    ct,rel,doc,ss = M.custody.CT,M.custody.REL,M.custody.DOCREL,M.custody.SS
    names=['HiddenTarget','References','Column Descriptions']
    names += [f'PrivateSheet{i}' for i in range(4,sheet_count+1)]
    data = {
        '[Content_Types].xml': (f'<Types xmlns="{ct}"><Default Extension="rels" ContentType="{M.custody.REL_TYPE}"/>'
            f'<Override PartName="/xl/workbook.xml" ContentType="{M.custody.MAIN_TYPE}"/>'
            + ''.join(f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="{M.custody.SHEET_TYPE}"/>' for i in range(1,sheet_count+1))
            + ('<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' if shared else '')
            + '</Types>').encode(),
        '_rels/.rels': (f'<Relationships xmlns="{rel}"><Relationship Id="rId1" Type="{doc}officeDocument" Target="xl/workbook.xml"/></Relationships>').encode(),
        'xl/workbook.xml': (f'<workbook xmlns="{ss}" xmlns:r="{doc[:-1]}"><sheets>'
            + ''.join(f'<sheet name="{name}" sheetId="{i}" r:id="rId{i}"/>' for i,name in enumerate(names[:sheet_count],1))
            + '</sheets></workbook>').encode(),
        'xl/_rels/workbook.xml.rels': (f'<Relationships xmlns="{rel}">'
            + ''.join(f'<Relationship Id="rId{i}" Type="{doc}worksheet" Target="worksheets/sheet{i}.xml"/>' for i in range(1,sheet_count+1))
            + '</Relationships>').encode(),
    }
    for i in range(1,sheet_count+1):data[f'xl/worksheets/sheet{i}.xml']=b'\xff<not-decoded>'+canary
    if shared:data['xl/sharedStrings.xml']=b'\x00\xff<not-decoded>'+canary
    return list(data.items())


def field(body=b'\x28\xa0\x00\x00', identifier=0xA220):
    return struct.pack('<HH',identifier,len(body))+body


def shape(padding=4, initial=0, signature=0xA028):
    return field(struct.pack('<HH',signature,initial)+b'\x00'*padding)


def archive(data=None, extras=None, central_extras=None, method=8, flags=2):
    data=parts() if data is None else data
    extras={0:shape()} if extras is None else extras
    central_extras={} if central_extras is None else central_extras
    local=bytearray();central=bytearray();positions=[]
    for index,(name,body) in enumerate(data):
        encoded=name.encode('utf-8' if flags&0x800 else 'cp437')
        compressed=body
        if method==8:
            encoder=zlib.compressobj(level=6,wbits=-15)
            compressed=encoder.compress(body)+encoder.flush()
        crc=zlib.crc32(body)&0xffffffff
        extra=extras.get(index,b'');central_extra=central_extras.get(index,b'')
        offset=len(local);positions.append(offset)
        local+=struct.pack('<4s5H3L2H',b'PK\x03\x04',20,flags,method,0,33,crc,len(compressed),len(body),len(encoded),len(extra))
        local+=encoded+extra+compressed
        central+=struct.pack('<4s6H3L5H2L',b'PK\x01\x02',20,20,flags,method,0,33,crc,len(compressed),len(body),len(encoded),len(central_extra),0,0,0,0,offset)
        central+=encoded+central_extra
    result=bytes(local+central+struct.pack('<4s4H2LH',b'PK\x05\x06',0,0,len(data),len(data),len(central),len(local),0))
    return result,positions


def central_positions(raw):
    cursor=struct.unpack_from('<L',raw,len(raw)-6)[0];result=[]
    while raw[cursor:cursor+4]==b'PK\x01\x02':
        result.append(cursor);cursor+=46+sum(struct.unpack_from('<3H',raw,cursor+28))
    return result


class GrowthEnvelopeAuthorTests(unittest.TestCase):
    def setUp(self):
        self.guards=ExitStack();self.addCleanup(self.guards.close)
        self.guards.enter_context(patch.object(socket,'socket',side_effect=AssertionError('network forbidden')))
        self.guards.enter_context(patch.object(socket,'getaddrinfo',side_effect=AssertionError('DNS forbidden')))
        self.guards.enter_context(patch.object(M.custody,'_read_relative',side_effect=AssertionError('private source forbidden')))
        self.guards.enter_context(patch.object(M,'production_context',side_effect=AssertionError('production guard forbidden')))
        self.guards.enter_context(patch.object(M.growth,'production_context',side_effect=AssertionError('production guard forbidden')))

    def inspect(self, raw):
        opened=[];old_open=zipfile.ZipFile.open
        def bounded(instance,name,*args,**kwargs):
            actual=name.filename if isinstance(name,zipfile.ZipInfo) else name
            self.assertIn(actual,M.ENVELOPE_MEMBERS);opened.append(actual)
            return old_open(instance,name,*args,**kwargs)
        with patch.object(zipfile.ZipFile,'open',bounded):report=M.inspect_synthetic_envelope(raw)
        self.assertEqual(report['status'],'BLOCKED_SCHEMA')
        self.assertFalse(report['source_identity_verified'])
        self.assertEqual(report['initial_padding_semantics'],'UNBOUND')
        self.assertNotIn(CANARY.decode(),json.dumps(report))
        for key in ('row_count','paired_count','source_group_count','overlap_count'):self.assertIsNone(report[key])
        for key in ('worksheet_cells_decoded','shared_strings_decoded','formulas_executed','target_numeric_validity_checked','scientific_eligibility_decisions','sampling_independence_established'):self.assertFalse(report['exposure'][key])
        self.assertEqual(report['exposure']['fits'],0);self.assertEqual(report['exposure']['splits'],0)
        return report,opened

    def accepted(self,raw):
        report,opened=self.inspect(raw)
        self.assertEqual(report['reason'],'SCHEMA_UNCONFIRMED')
        self.assertEqual(report['engineering_status'],'ENVELOPE_VALID')
        self.assertTrue(report['archive_profile_accepted'])
        self.assertEqual(opened,list(M.ENVELOPE_MEMBERS))
        self.assertTrue(report['exposure']['header_checks_completed'])
        self.assertTrue(report['exposure']['archive_close_completed'])
        self.assertIsNone(report['exposure']['archive_close_error'])
        self.assertTrue(report['exposure']['selected_growth']['archive_close_completed'])
        self.assertEqual(report['selected_growth_check']['reason'],'GROWTH_HINT_SHAPE_MATCH')
        return report

    def test_minimal_shape_and_documentary_roles(self):
        report=self.accepted(archive()[0])
        self.assertEqual(report['member_count'],8);self.assertEqual(report['sheet_count'],3)
        self.assertEqual(report['recognized_roles']['References'],{'present':True,'ordinal':2})
        self.assertEqual(report['recognized_roles']['Column Descriptions'],{'present':True,'ordinal':3})
        self.assertEqual(report['exposure']['local_extra_areas_started'],1)
        self.assertEqual(report['exposure']['local_extra_areas_completed'],1)

    def test_every_supported_method_flag_combination(self):
        for method,flags in [(0,x) for x in (0,0x800)]+[(8,x) for x in (0,2,4,6,0x800,0x802,0x804,0x806)]:
            with self.subTest(method=method,flags=flags):self.accepted(archive(method=method,flags=flags)[0])

    def test_every_local_area_checked_and_empty_areas_remain_allowed(self):
        for target in range(8):
            with self.subTest(target=target):
                report=self.accepted(archive(extras={target:shape(initial=65535)})[0])
                self.assertEqual(report['exposure']['local_extra_areas_completed'],1)
        report=self.accepted(archive(extras={i:shape(i,65535-i) for i in range(8)})[0])
        self.assertEqual(report['exposure']['local_extra_areas_completed'],8)
        self.assertEqual(report['exposure']['local_growth_padding_scans_completed'],8)

    def test_later_nonzero_payload_rejects_after_earlier_interpretation(self):
        for target in range(1,8):
            with self.subTest(target=target):
                bad=field(b'\x28\xa0\xff\xff\x00\x01')
                report,opened=self.inspect(archive(extras={0:shape(),target:bad})[0])
                self.assertEqual(report['reason'],'LOCAL_GROWTH_SHAPE_UNSUPPORTED')
                self.assertEqual(opened,[]);self.assertFalse(report['archive_profile_accepted'])
                self.assertIsNone(report['member_count']);self.assertIsNone(report['recognized_roles'])
                exposure=report['exposure']
                self.assertEqual(exposure['local_extra_areas_started'],2)
                self.assertEqual(exposure['local_extra_areas_completed'],1)
                self.assertEqual(exposure['local_growth_padding_scans_completed'],2)
                self.assertTrue(exposure['local_growth_payload_interpretation_started'])
                self.assertFalse(exposure['local_growth_payload_interpretation_completed'])
                self.assertTrue(exposure['archive_close_completed'])

    def test_later_unknown_duplicate_truncated_or_short_records_block(self):
        cases=[field(identifier=7),shape()+shape(),shape()+b'\x00',b'\x20\xa2\x04',
               field(b''),field(b'\x28'),field(b'\x28\xa0\x00'),shape(signature=0),
               struct.pack('<HH',0xA220,5)+b'\x28\xa0\x00\x00']
        for extra in cases:
            with self.subTest(extra=extra.hex()):
                report,opened=self.inspect(archive(extras={0:shape(),7:extra})[0])
                self.assertEqual(report['reason'],'LOCAL_GROWTH_SHAPE_UNSUPPORTED');self.assertEqual(opened,[])
                self.assertTrue(report['exposure']['archive_close_completed'])

    def test_initial_value_unbound_and_empty_current_padding(self):
        values=[]
        for initial in (0,1,512,65535):
            report=self.accepted(archive(extras={0:shape(0,initial),7:shape(5,initial)})[0])
            values.append({k:v for k,v in report.items() if k!='observed'})
        self.assertTrue(all(v==values[0] for v in values))

    def test_maximum_local_extra_and_declared_length_overrun(self):
        extra=shape(65527,65535);self.assertEqual(len(extra),65535)
        self.accepted(archive(extras={0:extra})[0])
        bad=bytearray(extra);struct.pack_into('<H',bad,2,65532)
        report,opened=self.inspect(archive(extras={0:shape(),7:bytes(bad)})[0])
        self.assertEqual(report['reason'],'LOCAL_GROWTH_SHAPE_UNSUPPORTED');self.assertEqual(opened,[])

    def test_padding_scan_reads_full_remainder_after_first_nonzero(self):
        class Observed(bytes):
            def __getitem__(self,key):
                if type(key) is int:seen.append(key)
                return super().__getitem__(key)
        raw=Observed(field(b'\x28\xa0\x00\x00\xff\x00\x00\x00'));seen=[]
        exposure=M._new_report(b'',True,None)['exposure']
        with self.assertRaisesRegex(M.GrowthEnvelopeError,'LOCAL_GROWTH_SHAPE_UNSUPPORTED'):
            M._local_growth_shape(raw,0,len(raw),exposure)
        self.assertEqual(seen,list(range(8,len(raw))))
        self.assertEqual(exposure['local_growth_padding_scans_completed'],1)

    def test_local_span_bounds_reject_before_payload_words(self):
        raw=shape()
        for start,end in ((False,len(raw)),(0,True),(-1,4),(0,0),(0,len(raw)+1),(0,65536)):
            exposure=M._new_report(b'',True,None)['exposure']
            with self.assertRaisesRegex(M.GrowthEnvelopeError,'LOCAL_GROWTH_SHAPE_UNSUPPORTED'):
                M._local_growth_shape(raw,start,end,exposure)
            self.assertFalse(exposure['local_growth_payload_interpretation_started'])

    def test_central_extras_and_comments_remain_rejected(self):
        for target in (0,7):
            for extra in (b'x',shape(),field(b'',identifier=0xffff)):
                report,opened=self.inspect(archive(central_extras={target:extra})[0])
                self.assertFalse(report['archive_profile_accepted']);self.assertEqual(opened,[])
        raw=bytearray(archive()[0]);entry=central_positions(raw)[-1]
        struct.pack_into('<H',raw,entry+32,1)
        report,opened=self.inspect(bytes(raw));self.assertFalse(report['archive_profile_accepted']);self.assertEqual(opened,[])

    def test_retained_central_predicate_mutations_reject_before_xml(self):
        changes=[(6,'<H',21),(8,'<H',1),(8,'<H',8),(10,'<H',99),
                 (42,'<L',1),(38,'<L',0o120777<<16),(38,'<L',16)]
        for delta,fmt,value in changes:
            with self.subTest(delta=delta,value=value):
                raw=bytearray(archive()[0]);entry=central_positions(raw)[-1]
                struct.pack_into(fmt,raw,entry+delta,value)
                report,opened=self.inspect(bytes(raw));self.assertFalse(report['archive_profile_accepted']);self.assertEqual(opened,[])

    def test_raw_central_preflight_complete_exact_boundaries(self):
        raw=archive()[0]
        count=struct.unpack_from('<H',raw,len(raw)-12)[0]
        size,start=struct.unpack_from('<LL',raw,len(raw)-10)
        exposure=M._new_report(b'',True,None)['exposure']
        with patch.object(zipfile.ZipFile,'__init__',side_effect=AssertionError('preflight must not open')):
            M._raw_central_directory(raw,count,start,size,exposure)
        self.assertTrue(exposure['central_directory_preflight_started'])
        self.assertTrue(exposure['central_directory_preflight_completed'])
        self.assertFalse(exposure['archive_open_started'])

    def test_raw_central_preflight_declared_span_signature_count_and_tail(self):
        raw=archive()[0];positions=central_positions(raw)
        count=struct.unpack_from('<H',raw,len(raw)-12)[0]
        size,start=struct.unpack_from('<LL',raw,len(raw)-10)
        cases=[]
        for index in (0,1,len(positions)-1):
            for delta in (28,30,32):
                for increment in (1,255,65500):
                    bad=bytearray(raw)
                    value=struct.unpack_from('<H',bad,positions[index]+delta)[0]
                    struct.pack_into('<H',bad,positions[index]+delta,value+increment)
                    cases.append((bytes(bad),count,start,size))
            bad=bytearray(raw);bad[positions[index]:positions[index]+4]=b'FAIL'
            cases.append((bytes(bad),count,start,size))
        cases.extend((raw,c,start,size) for c in (0,1,count-1,count+1,129,False))
        cases.extend((raw,count,s,z) for s,z in ((-1,size),(start,-1),(True,size),(start,False),
                                                      (start+1,size-1),(start,size-1),(start,size+1)))
        cases.append((raw[:-22]+b'x'+raw[-22:],count,start,size+1))
        # A fixed record with only 45 remaining bytes cannot be unpacked.
        cases.append((raw[:start]+raw[start:start+45]+raw[-22:],1,start,45))
        for index,(buffer,c,s,z) in enumerate(cases):
            with self.subTest(case=index):
                exposure=M._new_report(b'',True,None)['exposure']
                with patch.object(zipfile.ZipFile,'__init__',side_effect=AssertionError('preflight must not open')):
                    with self.assertRaisesRegex(M.GrowthEnvelopeError,'CENTRAL_DIRECTORY_DECLARATION_INVALID'):
                        M._raw_central_directory(buffer,c,s,z,exposure)
                self.assertTrue(exposure['central_directory_preflight_started'])
                self.assertFalse(exposure['central_directory_preflight_completed'])
                self.assertFalse(exposure['archive_open_started'])

    def test_final_declared_comment_gap_is_blocked_before_new_archive(self):
        raw=bytearray(archive()[0]);entry=central_positions(raw)[-1]
        struct.pack_into('<H',raw,entry+32,1)
        report,opened=self.inspect(bytes(raw));exposure=report['exposure']
        self.assertEqual(report['reason'],'CENTRAL_DIRECTORY_DECLARATION_INVALID')
        self.assertTrue(exposure['central_directory_preflight_started'])
        self.assertFalse(exposure['central_directory_preflight_completed'])
        self.assertTrue(exposure['selected_growth']['archive_close_completed'])
        self.assertFalse(exposure['archive_open_started'])
        self.assertFalse(exposure['archive_close_started'])
        self.assertIsNone(report['member_count']);self.assertEqual(opened,[])

    def test_retained_local_predicate_mutations_reject_before_xml(self):
        changes=[(0,'<4s',b'FAIL'),(4,'<H',21),(6,'<H',8),(8,'<H',0),
                 (10,'<H',1),(12,'<H',34),(14,'<L',1),(18,'<L',0xffffffff),
                 (22,'<L',0xffffffff),(26,'<H',65535),(28,'<H',65535)]
        for delta,fmt,value in changes:
            with self.subTest(delta=delta):
                raw,positions=archive();raw=bytearray(raw);struct.pack_into(fmt,raw,positions[-1]+delta,value)
                report,opened=self.inspect(bytes(raw));self.assertFalse(report['archive_profile_accepted']);self.assertEqual(opened,[])

    def test_end_record_count_alignment_comment_and_truncation_reject(self):
        raw=archive()[0]
        bads=[b'',raw[:-1],raw+b'comment']
        for offset,fmt,value in ((0,'<4s',b'FAIL'),(4,'<H',1),(6,'<H',1),(8,'<H',1),(10,'<H',129),(12,'<L',1),(16,'<L',1),(20,'<H',1)):
            bad=bytearray(raw);struct.pack_into(fmt,bad,len(bad)-22+offset,value);bads.append(bytes(bad))
        for bad in bads:
            report,opened=self.inspect(bad);self.assertFalse(report['archive_profile_accepted']);self.assertEqual(opened,[])

    def test_paths_unknown_members_duplicates_and_required_members(self):
        base=parts();cases=[base+[(name,b'ignored') ] for name in ('../secret.xml','xl/unknown.bin','xl/worksheets/sheet1.xml')]
        cases.append([(name,body) for name,body in base if name!='xl/workbook.xml'])
        for data in cases:
            report,opened=self.inspect(archive(data)[0]);self.assertFalse(report['archive_profile_accepted']);self.assertEqual(opened,[])

    def test_128_member_boundary_and_129_rejection(self):
        self.accepted(archive(parts(124,False))[0])
        report,opened=self.inspect(archive(parts(125,False))[0]);self.assertFalse(report['archive_profile_accepted']);self.assertEqual(opened,[])

    def test_only_four_xml_members_and_opaque_payload_invariance(self):
        a=self.accepted(archive(parts(canary=b'FIRST_TARGET_UNKNOWN'))[0])
        b=self.accepted(archive(parts(canary=b'OTHER_TARGET_UNKNOWN'))[0])
        self.assertEqual({k:v for k,v in a.items() if k!='observed'}, {k:v for k,v in b.items() if k!='observed'})
        self.assertEqual(a['exposure']['decompression_completed'],list(M.ENVELOPE_MEMBERS))
        self.assertEqual(a['exposure']['xml_decoding_completed'],list(M.ENVELOPE_MEMBERS))

    def test_partial_xml_failure_retains_progress(self):
        for index in range(4):
            data=parts();data[index]=(data[index][0],b'<!DOCTYPE secret><bad/>')
            report,opened=self.inspect(archive(data)[0])
            self.assertEqual(report['reason'],'XML_PROFILE_UNSUPPORTED')
            self.assertEqual(opened,list(M.ENVELOPE_MEMBERS[:index+1]))
            self.assertEqual(report['exposure']['xml_decoding_completed'],list(M.ENVELOPE_MEMBERS[:index]))
            self.assertEqual(report['exposure']['xml_decoding_started'],list(M.ENVELOPE_MEMBERS[:index+1]))
            self.assertTrue(report['exposure']['archive_close_completed']);self.assertFalse(report['archive_profile_accepted'])

    def test_unchanged_xml_limit_and_semantic_helper_failures(self):
        fixtures=[]
        data=parts();data[0]=(data[0][0],b' '*(M.custody.MAX_XML_BYTES+1));fixtures.append((data,'XML_LIMIT'))
        data=parts();data[0]=(data[0][0],b'<wrong/>');fixtures.append((data,'CONTENT_TYPES_UNSUPPORTED'))
        data=parts();data[1]=(data[1][0],b'<wrong/>');fixtures.append((data,'RELATIONSHIP_UNSUPPORTED'))
        data=parts();data[2]=(data[2][0],b'<wrong/>');fixtures.append((data,'WORKBOOK_UNSUPPORTED'))
        for data,reason in fixtures:
            report,_=self.inspect(archive(data)[0]);self.assertEqual(report['reason'],reason);self.assertFalse(report['archive_profile_accepted'])

    def test_initial_same_buffer_check_precedes_new_archive(self):
        raw=archive()[0];seen=[];original=M.growth._inspect_payload
        def track(buffer,report,fields):seen.append(buffer);return original(buffer,report,fields)
        with patch.object(M.growth,'_inspect_payload',side_effect=track):self.accepted(raw)
        self.assertEqual(len(seen),1);self.assertIs(seen[0],raw);self.assertIs(type(raw),bytes)
        with patch.object(M,'_growth_zip_structure',side_effect=AssertionError('must not advance')) as later:
            report,_=self.inspect(archive(extras={0:shape(signature=1)})[0])
        later.assert_not_called();self.assertEqual(report['reason'],'GROWTH_PREDECESSOR_BLOCKED')

    def test_initial_cleanup_failure_is_separate_and_stops(self):
        original=zipfile.ZipFile.close
        def fail(instance):
            if instance.mode=='r' and instance.fp is not None:raise RuntimeError('PRIVATE_CLOSE_MESSAGE')
            return original(instance)
        stderr=io.StringIO()
        with redirect_stderr(stderr),patch.object(zipfile.ZipFile,'close',fail):
            report,_=self.inspect(archive()[0]);gc.collect()
        self.assertEqual(stderr.getvalue(),'');self.assertEqual(report['reason'],'GROWTH_PREDECESSOR_BLOCKED')
        self.assertEqual(report['exposure']['selected_growth']['archive_close_error'],'ARCHIVE_CLOSE_FAILED')
        self.assertFalse(report['exposure']['archive_open_started'])
        self.assertNotIn('PRIVATE_CLOSE_MESSAGE',json.dumps(report))

    def test_new_archive_is_owned_before_infolist_failure(self):
        original_init=zipfile.ZipFile.__init__;original_info=zipfile.ZipFile.infolist;created=[]
        def init(instance,*args,**kwargs):original_init(instance,*args,**kwargs);created.append(instance)
        def infolist(instance):
            if len(created)==2:raise RuntimeError('PRIVATE_INFOLIST_MESSAGE')
            return original_info(instance)
        with patch.object(zipfile.ZipFile,'__init__',init),patch.object(zipfile.ZipFile,'infolist',infolist):report,_=self.inspect(archive()[0])
        self.assertEqual(len(created),2);self.assertTrue(all(a.fp is None for a in created))
        self.assertEqual(report['reason'],'ZIP_INVALID');self.assertTrue(report['exposure']['archive_close_completed'])
        self.assertFalse(report['exposure']['header_checks_completed']);self.assertIsNone(report['member_count'])

    def test_header_failure_after_open_closes_archive(self):
        original=zipfile.ZipFile.__init__;created=[]
        def init(instance,*args,**kwargs):original(instance,*args,**kwargs);created.append(instance)
        raw=bytearray(archive()[0]);entry=central_positions(raw)[-1];struct.pack_into('<H',raw,entry+6,21)
        with patch.object(zipfile.ZipFile,'__init__',init):report,_=self.inspect(bytes(raw))
        self.assertEqual(len(created),2);self.assertTrue(all(a.fp is None for a in created))
        self.assertEqual(report['reason'],'ZIP_LAYOUT_UNSUPPORTED');self.assertTrue(report['exposure']['archive_close_completed'])

    def test_later_close_failure_overrides_success_without_stderr(self):
        original=zipfile.ZipFile.close;seen=[]
        def close(instance):
            if instance.mode=='r' and instance.fp is not None:
                seen.append(instance)
                if len(seen)==2:raise RuntimeError('PRIVATE_CLOSE_MESSAGE')
            return original(instance)
        stderr=io.StringIO()
        with redirect_stderr(stderr),patch.object(zipfile.ZipFile,'close',close):
            report,_=self.inspect(archive()[0]);gc.collect()
        self.assertEqual(stderr.getvalue(),'');self.assertEqual(report['engineering_status'],'BLOCKED_CLEANUP')
        self.assertEqual(report['reason'],'ARCHIVE_CLOSE_FAILED');self.assertFalse(report['archive_profile_accepted'])
        self.assertEqual(report['validation_reason_before_cleanup'],'SCHEMA_UNCONFIRMED')
        self.assertTrue(report['exposure']['envelope_checks_completed'])
        self.assertTrue(report['exposure']['selected_growth']['archive_close_completed'])
        self.assertFalse(report['exposure']['archive_close_completed']);self.assertIsNone(report['recognized_roles'])

    def test_close_failure_retains_prior_xml_reason(self):
        original=zipfile.ZipFile.close;count=[0]
        def close(instance):
            if instance.mode=='r' and instance.fp is not None:
                count[0]+=1
                if count[0]==2:raise RuntimeError('private')
            return original(instance)
        data=parts();data[0]=(data[0][0],b'bad xml')
        with patch.object(zipfile.ZipFile,'close',close):report,_=self.inspect(archive(data)[0])
        self.assertEqual(report['validation_reason_before_cleanup'],'XML_INVALID')
        self.assertEqual(report['reason'],'ARCHIVE_CLOSE_FAILED')
        self.assertEqual(report['exposure']['xml_decoding_started'],[M.ENVELOPE_MEMBERS[0]])
        self.assertEqual(report['exposure']['xml_decoding_completed'],[])

    def test_source_bounds_and_actual_identity_rejection(self):
        for raw,reason in ((bytearray(),'RAW_TYPE_INVALID'),(b'x'*(M.custody.SOURCE_BYTES+1),'SOURCE_SIZE_MISMATCH')):
            with self.assertRaisesRegex(M.CustodyError,reason):M.inspect_synthetic_envelope(raw)
        raw=archive()[0]
        with patch.object(M.header_diagnostic,'OBJECT_SHA256',hashlib.sha256(raw).hexdigest()):
            with self.assertRaisesRegex(M.CustodyError,'SYNTHETIC_REAL_SOURCE_FORBIDDEN'):M.inspect_synthetic_envelope(raw)
        with patch.object(M.custody,'SOURCE_BYTES',len(raw)),patch.object(M.custody,'SOURCE_MD5',hashlib.md5(raw).hexdigest()):
            with self.assertRaisesRegex(M.CustodyError,'SYNTHETIC_REAL_SOURCE_FORBIDDEN'):M.inspect_synthetic_envelope(raw)

    def test_old_predicates_preserved_by_exact_ast_delta(self):
        oldraw=(ROOT/'scripts/li_v3_compatible_envelope.py').read_bytes()
        self.assertEqual(hashlib.sha256(oldraw).hexdigest(),'e771b3fc2a66d6e2ff3a26d8aae88b7a2915ac908907908316e697997761c847')
        old=deepcopy(next(n for n in ast.parse(oldraw).body if isinstance(n,ast.FunctionDef) and n.name=='_compatible_zip_structure'))
        new=deepcopy(next(n for n in ast.parse(SOURCE.read_bytes()).body if isinstance(n,ast.FunctionDef) and n.name=='_growth_zip_structure'))
        removed=[]
        for node in ast.walk(old):
            if isinstance(node,ast.BoolOp):
                keep=[]
                for value in node.values:
                    if isinstance(value,ast.Name) and value.id=='extra_len':removed.append(value)
                    else:keep.append(value)
                node.values=keep
        self.assertEqual(len(removed),1)
        class Strip(ast.NodeTransformer):
            def visit_Assign(self,node):
                if any(isinstance(t,ast.Subscript) and isinstance(t.value,ast.Name) and t.value.id=='exposure' for t in node.targets):return None
                return self.generic_visit(node)
            def visit_Expr(self,node):
                if isinstance(node.value,ast.Call) and isinstance(node.value.func,ast.Attribute) and isinstance(node.value.func.value,ast.Name) and node.value.func.value.id=='holder':return None
                if isinstance(node.value,ast.Call) and isinstance(node.value.func,ast.Name) and node.value.func.id=='_raw_central_directory':
                    self_outer.assertEqual([x.id for x in node.value.args],['raw','count','directory_offset','directory_size','exposure'])
                    self_outer.assertEqual(node.value.keywords,[])
                    return None
                return self.generic_visit(node)
            def visit_If(self,node):
                if isinstance(node.test,ast.Name) and node.test.id=='extra_len':
                    self_outer.assertEqual(len(node.body),1)
                    self_outer.assertEqual(node.body[0].value.func.id,'_local_growth_shape')
                    return None
                return self.generic_visit(node)
            def visit_ExceptHandler(self,node):
                if isinstance(node.type,ast.Tuple):
                    self_outer.assertEqual([x.id for x in node.type.elts],['CustodyError','GrowthEnvelopeError'])
                    node.type=ast.Name(id='CustodyError',ctx=ast.Load())
                return self.generic_visit(node)
        self_outer=self;new=Strip().visit(new);new.name=old.name;new.args=deepcopy(old.args)
        self.assertEqual(ast.dump(old,include_attributes=False),ast.dump(new,include_attributes=False))

    def test_prior_source_pins_and_xml_helper_bindings(self):
        for relative,pin in M.growth.PREDECESSOR_FILES.items():
            self.assertEqual(hashlib.sha256((ROOT/relative).read_bytes()).hexdigest(),pin)
        for relative,pin in M.GROWTH_FILES.items():
            path=ROOT/relative
            if CANDIDATE:path=ROOT/'.cache/phase2-growth-hint-production-candidate-v1/promotion'/relative
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(),pin)
        self.assertEqual(set(M.GROWTH_FILES),set(M.growth.FROZEN_PATHS))
        self.assertIs(M._canonical_member,M.compatible._canonical_member)
        self.assertIs(M._member_type,M.compatible._member_type)
        self.assertIs(M.ENVELOPE_MEMBERS,M.custody.ENVELOPE_MEMBERS)

    def test_no_extra_growth_shape_does_not_bypass_exact_initial_gate(self):
        report,opened=self.inspect(archive(extras={})[0])
        self.assertFalse(report['archive_profile_accepted']);self.assertEqual(opened,[])
        self.assertEqual(report['reason'],'GROWTH_PREDECESSOR_BLOCKED')
        self.assertFalse(report['exposure']['archive_open_started'])


if __name__=='__main__':unittest.main()
