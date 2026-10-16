"""Generated author fixtures. No actual source/cache/production invocation."""
from contextlib import ExitStack, redirect_stderr
from copy import deepcopy
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import socket
import struct
import subprocess
import sys
import unittest
from unittest.mock import patch
import zipfile
import zlib

HERE = Path(__file__).resolve().parent
DISCOVERY = next(p for p in HERE.parents if p.name == 'discovery' and (p/'AGENTS.md').is_file())
SOURCE = DISCOVERY/'scripts/li_v3_readiness.py'
spec = importlib.util.spec_from_file_location('readiness_author', SOURCE)
M = importlib.util.module_from_spec(spec); spec.loader.exec_module(M)
CT, REL, DOC, SS = M.custody.CT, M.custody.REL, M.custody.DOCREL, M.custody.SS
REF_TEXT = 'Reference key.'
ROW_TEXT = 'One record is one tensile test.'
END_TEXT = 'Strength in MPa and elongation in percent.'
COND_TEXT = 'Conditions belong to the same test.'
MISS_TEXT = 'Blank endpoints have unknown validity.'
CANARY = 'UNSELECTED_NUMERICAL_ENDPOINT_813581'


def cell(coordinate, text, kind='inlineStr'):
    if kind == 'inlineStr':
        return f'<c r="{coordinate}" t="inlineStr"><is><t>{text}</t></is></c>'
    return f'<c r="{coordinate}" t="{kind}"><v>{text}</v></c>'


def sheet(rows):
    return f'<worksheet xmlns="{SS}"><sheetData>{rows}</sheetData></worksheet>'.encode()


def parts():
    names = ['References', 'Column Descriptions', 'Records']
    items = [
      ('[Content_Types].xml', b''),
      ('_rels/.rels', f'<Relationships xmlns="{REL}"><Relationship Id="book" Type="{DOC}officeDocument" Target="xl/workbook.xml"/></Relationships>'.encode()),
      ('xl/workbook.xml', (f'<workbook xmlns="{SS}" xmlns:r="{DOC[:-1]}"><sheets>' + ''.join(f'<sheet name="{n}" sheetId="{i}" r:id="s{i}"/>' for i,n in enumerate(names,1)) + '</sheets></workbook>').encode()),
      ('extras/opaque.dat', b'OPAQUE_PAYLOAD_CANARY_112358'),
      ('xl/_rels/workbook.xml.rels', (f'<Relationships xmlns="{REL}">' + ''.join(f'<Relationship Id="s{i}" Type="{DOC}worksheet" Target="worksheets/sheet{i}.xml"/>' for i in range(1,4)) + f'<Relationship Id="strings" Type="{DOC}sharedStrings" Target="sharedStrings.xml"/></Relationships>').encode()),
      ('extras/_rels/opaque.dat.rels', f'<Relationships xmlns="{REL}"/>'.encode()),
      ('xl/worksheets/sheet1.xml', sheet('<row r="1">' + cell('A1',REF_TEXT) + '</row>')),
      ('xl/worksheets/sheet2.xml', sheet(''.join(f'<row r="{i}">{cell("A"+str(i), text)}</row>' for i,text in enumerate([ROW_TEXT,END_TEXT,COND_TEXT,MISS_TEXT],1)))),
      ('xl/worksheets/sheet3.xml', sheet('<row r="1">'+cell('A1','Reference')+'</row><row r="2">'+cell('A2','R1')+cell('B2','T1')+cell('C2','433','n')+cell('D2','12','n')+'</row><row r="3">'+cell('A3','R2')+cell('B3','T2')+cell('C3',CANARY,'str')+'</row><row r="4"/>')),
      ('xl/sharedStrings.xml', f'<sst xmlns="{SS}" uniqueCount="2"><si><t>{REF_TEXT}</t></si><si><t>R1</t></si></sst>'.encode()),
    ]
    declaration = f'<Types xmlns="{CT}"><Default Extension="rels" ContentType="{M.custody.REL_TYPE}"/><Default Extension="dat" ContentType="application/octet-stream"/>'
    for name,_ in items:
        if name == '[Content_Types].xml' or name.endswith('.rels') or name.endswith('.dat'):
            continue
        declaration += f'<Override PartName="/{name}" ContentType="{M.custody._member_type(name)}"/>'
    declaration += '</Types>'
    items[0] = (items[0][0], declaration.encode())
    return items


def replace(items, name, body):
    return [(n, body if n == name else b) for n,b in items]


def packed(items=None):
    items = parts() if items is None else items
    local, central = bytearray(), bytearray()
    for i,(name,body) in enumerate(items):
        filename = name.encode('ascii')
        compression = zlib.compressobj(level=6,wbits=-15)
        compressed = compression.compress(body)+compression.flush()
        crc = zlib.crc32(body)&0xffffffff
        extra = struct.pack('<HHHH',0xA220,516,0xA028,0)+bytes(512) if i in (0,1,2,4,5) else b''
        offset = len(local)
        local += struct.pack('<4s5H3L2H',b'PK\x03\x04',20,2,8,0,33,crc,len(compressed),len(body),len(filename),len(extra))+filename+extra+compressed
        central += struct.pack('<4s6H3L5H2L',b'PK\x01\x02',20,20,2,8,0,33,crc,len(compressed),len(body),len(filename),0,0,0,0,0,offset)+filename
    return bytes(local+central+struct.pack('<4s4H2LH',b'PK\x05\x06',0,0,len(items),len(items),len(central),len(local),0))


def expected(raw):
    # Frozen predecessor oracle runs outside the candidate tested path; not its implementation.
    return M.diagnostic.inspect_synthetic_headers(raw, selected_growth=True)


def doc_binding(raw, layout):
    rows = [('reference','References','A1','REFERENCE_KEY',REF_TEXT),
            ('rowunit','Column Descriptions','A1','ROW_UNIT',ROW_TEXT),
            ('endpoints','Column Descriptions','A2','ENDPOINT_DEFINITION',END_TEXT),
            ('conditions','Column Descriptions','A3','CONDITION_SCOPE',COND_TEXT),
            ('missing','Column Descriptions','A4','MISSINGNESS',MISS_TEXT)]
    return {'schema':'li_v3.documentary_binding.v1','source_sha256':hashlib.sha256(raw).hexdigest(),
            'prior_layout_sha256':hashlib.sha256(M.canonical(layout)).hexdigest(),
            'fields':[{'field_id':i,'role':r,'coordinate':c,'meaning':m,'unit':None,
                       'review':'DOCUMENTARY','required':True,'allowed_texts':[t],'disclose_text':False}
                      for i,r,c,m,t in rows]}


def frame_binding(raw, layout, documentary, binding):
    return {'schema':'li_v3.frame_binding.v1','source_sha256':hashlib.sha256(raw).hexdigest(),
            'prior_layout_sha256':hashlib.sha256(M.canonical(layout)).hexdigest(),
            'prior_documentary_sha256':hashlib.sha256(M.canonical(documentary)).hexdigest(),
            'documentary_binding':binding,'required_documentary_fields':[f['field_id'] for f in binding['fields']],
            'row_unit':'SINGLE_TEST','record_roles':[{'role_id':'records','sheet_name':'Records',
              'row_classes':[{'row':i,'class':c} for i,c in [(1,'HEADER'),(2,'DATA'),(3,'DATA'),(4,'BLANK')]],
              'metadata_columns':[{'field_id':'reference','column':'A','meaning':'REFERENCE_KEY','required':True},
                                  {'field_id':'test','column':'B','meaning':'TEST_ID','required':True}],
              'endpoint_columns':[{'endpoint_id':'strength','column':'C'},{'endpoint_id':'elongation','column':'D'}]}],
            'excluded_sheets':[],'reference_field':'reference','reference_keys':['R1','R2'],'overlap_manifest':None}


class ReadinessAuthorTests(unittest.TestCase):
    def setUp(self):
        self.stack=ExitStack();self.addCleanup(self.stack.close)
        for target,name in ((socket,'socket'),(socket,'getaddrinfo'),(subprocess,'run'),(subprocess,'Popen'),
                            (M.custody,'_read_relative'),(M.envelope,'production_context'),
                            (M.diagnostic,'production_context')):
            self.stack.enter_context(patch.object(target,name,side_effect=AssertionError('FORBIDDEN_OPERATION')))

    def layout(self, items=None):
        raw=packed(items); projection=expected(raw)
        return raw,projection,M.inspect_synthetic_layout(raw,expected_diagnostic=projection)

    def stages(self, items=None):
        raw,projection,layout=self.layout(items)
        self.assertEqual(layout['reason'],'LAYOUT_READY_MAPPING_UNBOUND',layout)
        binding=doc_binding(raw,layout)
        doc=M.inspect_synthetic_documentary(raw,binding,expected_diagnostic=projection,prior_layout=layout)
        self.assertEqual(doc['reason'],'DOCUMENTARY_MAPPING_COMPLETE_WITH_EXPLICIT_UNKNOWNS',doc)
        frame=frame_binding(raw,layout,doc,binding)
        return raw,projection,layout,binding,doc,frame

    def reject(self, report, reason=None):
        self.assertEqual(report['engineering_status'],'NO_GO',report)
        if reason:self.assertEqual(report['reason'],reason,report)
        for field in ('package','roles','documentary','frame'):self.assertIsNone(report[field])
        self.assertEqual(report['status'],'BLOCKED_SCHEMA')
        self.assertFalse(report['numeric_outcome_interpretation'])
        self.assertEqual(report['fits'],0);self.assertEqual(report['splits'],0)

    def test_complete_layout_exact_member_access(self):
        raw=packed();projection=expected(raw);opened=[];old=zipfile.ZipFile.open
        def watch(z,name,*a,**k):opened.append(name);return old(z,name,*a,**k)
        with patch.object(zipfile.ZipFile,'open',watch):report=M.inspect_synthetic_layout(raw,expected_diagnostic=projection)
        self.assertEqual(report['reason'],'LAYOUT_READY_MAPPING_UNBOUND',report)
        self.assertEqual(len(opened),7);self.assertEqual(len(set(opened)),7)
        self.assertNotIn('extras/opaque.dat',opened);self.assertNotIn('xl/worksheets/sheet3.xml',opened)
        self.assertTrue(report['exposure']['archive_open_completed']);self.assertTrue(report['exposure']['archive_close_completed'])
        self.assertEqual(report['package']['opaque_parts'],1)

    def test_documentary_and_complete_frame(self):
        raw,p,l,b,d,f=self.stages()
        report=M.inspect_synthetic_frame(raw,f,expected_diagnostic=p,prior_layout=l,prior_documentary=d)
        self.assertEqual(report['reason'],'METADATA_FRAME_READY_FOR_SEPARATE_LABEL_RULE',report)
        self.assertEqual(report['frame']['physical_explicit_rows'],4)
        self.assertEqual(report['frame']['class_counts']['DATA'],2)
        self.assertIsNone(report['frame']['paired_count'])
        self.assertFalse(report['frame']['rows'][2]['endpoint_structure']['elongation']['cell_present'])
        self.assertNotIn(CANARY,json.dumps(report))
        public_payload={key:report[key] for key in ('package','roles','documentary','frame')}
        self.assertNotIn('433',json.dumps(public_payload))
        self.assertTrue(all(x['text'] is None for x in d['documentary']['fields']))

    def test_expected_mismatch_before_xml(self):
        raw=packed();p=expected(raw);p['aggregate_exposure']['local_extra_areas_completed']-=1
        with patch.object(zipfile.ZipFile,'open',side_effect=AssertionError('NO_XML')):
            report=M.inspect_synthetic_layout(raw,expected_diagnostic=p)
            self.reject(report,'EXPECTED_DIAGNOSTIC_MISMATCH')
        self.assertTrue(report['exposure']['header_replay_started'])
        self.assertTrue(report['exposure']['header_replay_completed'])
        self.assertFalse(report['exposure']['archive_open_started'])

    def test_invalid_expected_schema_before_xml(self):
        raw=packed();p=expected(raw);p['extra']='RAW_CANARY'
        with patch.object(zipfile.ZipFile,'open',side_effect=AssertionError('NO_XML')):
            report=M.inspect_synthetic_layout(raw,expected_diagnostic=p)
            self.reject(report,'EXPECTED_DIAGNOSTIC_INVALID')
        self.assertFalse(report['exposure']['header_replay_started'])
        self.assertFalse(report['exposure']['header_replay_completed'])

    def test_same_raw_identity_to_replay_and_header(self):
        raw=packed();p=expected(raw);seen=[];old=M.diagnostic.inspect_synthetic_headers;header=M._package_zip_structure
        def replay(value,**kwargs):seen.append(value is raw);return old(value,**kwargs)
        def body(value,*a):seen.append(value is raw);return header(value,*a)
        with patch.object(M.diagnostic,'inspect_synthetic_headers',replay),patch.object(M,'_package_zip_structure',body):
            report=M.inspect_synthetic_layout(raw,expected_diagnostic=p)
        self.assertEqual(seen,[True,True]);self.assertEqual(report['engineering_status'],'COMPLETE')

    def test_case_collision_and_prefix_collision(self):
        for extra in ('EXTRAS/OPAQUE.DAT','extras/opaque.dat/nested'):
            items=parts()+[(extra,b'opaque')]
            _,_,report=self.layout(items);self.reject(report)
            self.assertEqual(report['exposure']['member_opens_started'],0)

    def test_invalid_opc_names(self):
        for name in ('extras/bad space.dat','extras/bad#.dat','extras/final./x.dat'):
            items=[(name if n=='extras/opaque.dat' else n,b) for n,b in parts()]
            _,_,report=self.layout(items);self.reject(report,'PART_NAME_UNSUPPORTED')

    def test_media_type_override_precedence_and_case(self):
        items=parts();ct=items[0][1].replace(b'</Types>',b'<Override PartName="/EXTRAS/OPAQUE.DAT" ContentType="application/custom"/></Types>')
        _,_,report=self.layout(replace(items,'[Content_Types].xml',ct))
        self.assertEqual(report['engineering_status'],'COMPLETE',report)

    def test_duplicate_case_default(self):
        items=parts();ct=items[0][1].replace(b'</Types>',b'<Default Extension="DAT" ContentType="application/octet-stream"/></Types>')
        self.reject(self.layout(replace(items,'[Content_Types].xml',ct))[2],'CONTENT_TYPES_UNSUPPORTED')

    def test_media_types_stream_override_forbidden(self):
        items=parts();ct=items[0][1].replace(b'</Types>',b'<Override PartName="/[Content_Types].xml" ContentType="application/xml"/></Types>')
        self.reject(self.layout(replace(items,'[Content_Types].xml',ct))[2],'CONTENT_TYPES_UNSUPPORTED')

    def test_ordinary_relationship_media_type_forbidden(self):
        items=parts();ct=items[0][1].replace(b'application/octet-stream',M.custody.REL_TYPE.encode())
        self.reject(self.layout(replace(items,'[Content_Types].xml',ct))[2],'CONTENT_TYPES_UNSUPPORTED')

    def test_known_type_not_relaxed(self):
        items=parts();ct=items[0][1].replace(M.custody.MAIN_TYPE.encode(),b'application/custom')
        self.reject(self.layout(replace(items,'[Content_Types].xml',ct))[2],'CONTENT_TYPES_UNSUPPORTED')

    def test_unknown_http_type_uppercase_host_and_relative_target(self):
        items=parts();body=f'<Relationships xmlns="{REL}"><Relationship Id="a" Type="https://EXAMPLE.invalid/type" Target="../xl/worksheets/sheet3.xml"/></Relationships>'.encode()
        _,_,report=self.layout(replace(items,'extras/_rels/opaque.dat.rels',body))
        self.assertEqual(report['engineering_status'],'COMPLETE',report)

    def test_external_escape_dangling_relationships_target(self):
        for target,mode in [('https://x.invalid/x','External'),('../../escape.dat','Internal'),('missing.dat','Internal'),('_rels/opaque.dat.rels','Internal')]:
            body=f'<Relationships xmlns="{REL}"><Relationship Id="a" Type="https://example.invalid/type" Target="{target}" TargetMode="{mode}"/></Relationships>'.encode()
            self.reject(self.layout(replace(parts(),'extras/_rels/opaque.dat.rels',body))[2],'RELATIONSHIP_UNSUPPORTED')

    def test_known_root_relationship_type_still_strict(self):
        items=parts();body=items[1][1].replace((DOC+'officeDocument').encode(),b'https://example.invalid/type')
        self.reject(self.layout(replace(items,'_rels/.rels',body))[2],'KNOWN_WORKBOOK_PROFILE_BLOCKED')

    def test_opaque_payload_invariance(self):
        a=self.layout()[2];b=self.layout(replace(parts(),'extras/opaque.dat',b'OTHER_OPAQUE_CANARY'))[2]
        a['source_sha256']=b['source_sha256']=None
        self.assertEqual(a,b);self.assertNotIn('OPAQUE_PAYLOAD_CANARY',json.dumps(a))

    def test_xml_entity_and_namespace_caps(self):
        items=parts();body=b'<!DOCTYPE Types [<!ENTITY bad "CANARY">]>'+items[0][1]
        self.reject(self.layout(replace(items,'[Content_Types].xml',body))[2],'XML_PROFILE_UNSUPPORTED')
        attrs=' '.join(f'xmlns:p{i}="urn:{i}"' for i in range(33))
        body=f'<Relationships xmlns="{REL}" {attrs}/>'.encode()
        self.reject(self.layout(replace(items,'extras/_rels/opaque.dat.rels',body))[2],'XML_LIMIT')

    def test_layout_atomic_second_role_failure(self):
        self.reject(self.layout(replace(parts(),'xl/worksheets/sheet2.xml',b'<notworksheet/>'))[2],'WORKSHEET_PROFILE_UNSUPPORTED')

    def test_explicit_documentary_text_disclosure(self):
        raw,p,l,b,d,f=self.stages();b['fields'][0]['disclose_text']=True
        report=M.inspect_synthetic_documentary(raw,b,expected_diagnostic=p,prior_layout=l)
        self.assertEqual(report['documentary']['fields'][0]['text'],REF_TEXT)
        self.assertEqual(report['documentary']['fields'][0]['assertion'],'MANIFEST_ASSERTION')

    def test_unreviewed_text_and_mixed_binding_block(self):
        raw,p,l,b,d,f=self.stages();b['fields'][0]['allowed_texts']=['different reviewed text']
        self.reject(M.inspect_synthetic_documentary(raw,b,expected_diagnostic=p,prior_layout=l),'DOCUMENTARY_TEXT_UNREVIEWED')
        b['fields'][0]['review']='MIXED'
        self.reject(M.inspect_synthetic_documentary(raw,b,expected_diagnostic=p,prior_layout=l),'DOCUMENTARY_MIXED_ROLE')

    def test_optional_unresolved_semantics(self):
        raw,p,l,b,d,f=self.stages();b['fields'][0].update(review='UNRESOLVED',required=False,allowed_texts=[])
        report=M.inspect_synthetic_documentary(raw,b,expected_diagnostic=p,prior_layout=l)
        self.assertEqual(report['documentary']['fields'][0]['assertion'],'UNRESOLVED')

    def test_shared_strings_are_bound_and_not_whole_table_disclosed(self):
        items=parts();body=sheet('<row r="1">'+cell('A1','0','s')+'</row>')
        raw,p,l,b,d,f=self.stages(replace(items,'xl/worksheets/sheet1.xml',body))
        self.assertEqual(d['documentary']['fields'][0]['declared_type'],'s')
        self.assertNotIn('R1',json.dumps(d))

    def test_bad_shared_index_and_formula_text_block(self):
        for content in (cell('A1','99','s'),'<c r="A1" t="inlineStr"><f>SECRET()</f><is><t>Reference key.</t></is></c>'):
            items=replace(parts(),'xl/worksheets/sheet1.xml',sheet('<row r="1">'+content+'</row>'))
            raw,p,l=self.layout(items)
            if l['engineering_status']=='NO_GO':self.reject(l);continue
            b=doc_binding(raw,l)
            self.reject(M.inspect_synthetic_documentary(raw,b,expected_diagnostic=p,prior_layout=l))

    def test_merged_selected_documentary_cell_blocked(self):
        items=parts();body=items[6][1].replace(b'</worksheet>',b'<mergeCells count="1"><mergeCell ref="A1:B1"/></mergeCells></worksheet>')
        raw,p,l=self.layout(replace(items,'xl/worksheets/sheet1.xml',body));b=doc_binding(raw,l)
        self.reject(M.inspect_synthetic_documentary(raw,b,expected_diagnostic=p,prior_layout=l),'SELECTED_CELL_MERGED')

    def test_forged_prior_nested_exposure(self):
        raw,p,l,b,d,f=self.stages();l=deepcopy(l);l['exposure']['invented']=True
        b['prior_layout_sha256']=hashlib.sha256(M.canonical(l)).hexdigest()
        self.reject(M.inspect_synthetic_documentary(raw,b,expected_diagnostic=p,prior_layout=l),'PRIOR_RECEIPT_INVALID')

    def test_forged_prior_layout_payload_recomputed(self):
        raw,p,l,b,d,f=self.stages();l=deepcopy(l);l['roles']['References']['cells'][0]['declared_type']='n'
        b['prior_layout_sha256']=hashlib.sha256(M.canonical(l)).hexdigest()
        self.reject(M.inspect_synthetic_documentary(raw,b,expected_diagnostic=p,prior_layout=l),'PRIOR_RECEIPT_INVALID')

    def test_forged_documentary_payload_recomputed(self):
        raw,p,l,b,d,f=self.stages();d=deepcopy(d);d['documentary']['fields'][0]['unit']='MPa'
        f['prior_documentary_sha256']=hashlib.sha256(M.canonical(d)).hexdigest()
        self.reject(M.inspect_synthetic_frame(raw,f,expected_diagnostic=p,prior_layout=l,prior_documentary=d),'PRIOR_RECEIPT_INVALID')

    def test_frame_no_row_trimming(self):
        raw,p,l,b,d,f=self.stages();f['record_roles'][0]['row_classes'].pop()
        self.reject(M.inspect_synthetic_frame(raw,f,expected_diagnostic=p,prior_layout=l,prior_documentary=d),'FRAME_COVERAGE_MISMATCH')

    def test_frame_blank_cannot_hide_nonempty_row(self):
        raw,p,l,b,d,f=self.stages();f['record_roles'][0]['row_classes'][1]['class']='BLANK'
        self.reject(M.inspect_synthetic_frame(raw,f,expected_diagnostic=p,prior_layout=l,prior_documentary=d),'FRAME_BLANK_CONTRADICTION')

    def test_endpoint_column_cannot_be_metadata(self):
        raw,p,l,b,d,f=self.stages();f['record_roles'][0]['metadata_columns'][0]['column']='C'
        self.reject(M.inspect_synthetic_frame(raw,f,expected_diagnostic=p,prior_layout=l,prior_documentary=d),'FRAME_ENDPOINT_METADATA_COLLISION')

    def test_completed_negative_readiness_preserves_rows(self):
        raw,p,l,b,d,f=self.stages();f['row_unit']='UNKNOWN'
        report=M.inspect_synthetic_frame(raw,f,expected_diagnostic=p,prior_layout=l,prior_documentary=d)
        self.assertEqual(report['engineering_status'],'COMPLETE')
        self.assertEqual(report['reason'],'NO_GO_UNRESOLVED_PREMISE');self.assertEqual(len(report['frame']['rows']),4)

    def test_overlap_only_declared_key_not_physical_identity(self):
        raw,p,l,b,d,f=self.stages();f['overlap_manifest']={'schema':'li_v3.target_redacted_overlap.v1','authenticated':True,'identity_sha256':'a'*64,'field_id':'test','exposed_keys':['T1']}
        report=M.inspect_synthetic_frame(raw,f,expected_diagnostic=p,prior_layout=l,prior_documentary=d)
        self.assertEqual(report['frame']['rows'][1]['overlap'],'DECLARED_PROVENANCE_KEY_MATCH')
        self.assertEqual(report['frame']['physical_independence'],'NOT_ESTABLISHED')

    def test_read_failure_retains_exposure(self):
        raw=packed();p=expected(raw)
        with patch.object(zipfile.ZipFile,'open',side_effect=OSError('PRIVATE_CANARY')):
            report=M.inspect_synthetic_layout(raw,expected_diagnostic=p)
        self.reject(report,'METADATA_READ_FAILED')
        self.assertTrue(report['exposure']['archive_open_completed']);self.assertEqual(report['exposure']['member_opens_started'],1)
        self.assertNotIn('PRIVATE_CANARY',json.dumps(report))

    def test_close_failure_clears_payload_and_preserves_reason(self):
        raw=packed();p=expected(raw);old=zipfile.ZipFile.close
        def close(z):
            was_open=z.fp is not None
            old(z)
            if was_open and getattr(z,'_readiness_owned',False):raise OSError('PRIVATE_CLOSE')
        original=M._package_zip_structure
        def owned(*args):
            result=original(*args);result[0]._readiness_owned=True;return result
        errors=io.StringIO()
        with redirect_stderr(errors),patch.object(M,'_package_zip_structure',owned),patch.object(zipfile.ZipFile,'close',close):
            report=M.inspect_synthetic_layout(raw,expected_diagnostic=p)
        self.assertEqual(errors.getvalue(),'')
        self.reject(report,'ARCHIVE_CLOSE_FAILED');self.assertEqual(report['validation_reason_before_cleanup'],'LAYOUT_READY_MAPPING_UNBOUND')
        self.assertNotIn('PRIVATE_CLOSE',json.dumps(report))

    def test_output_cap_clears_payload(self):
        raw=packed();p=expected(raw)
        with patch.dict(M.LIMITS,{'output':2000}):report=M.inspect_synthetic_layout(raw,expected_diagnostic=p)
        self.reject(report,'PUBLIC_OUTPUT_LIMIT')

    def test_invalid_raw_and_bounds(self):
        self.reject(M.inspect_synthetic_layout(bytearray(b'bad'),expected_diagnostic={}), 'RAW_TYPE_INVALID')
        self.reject(M.inspect_synthetic_layout(bytes(M.custody.SOURCE_BYTES+1),expected_diagnostic={}), 'SOURCE_SIZE_MISMATCH')

    def test_source_binding_drift(self):
        raw,p,l,b,d,f=self.stages();b['source_sha256']='0'*64
        self.reject(M.inspect_synthetic_documentary(raw,b,expected_diagnostic=p,prior_layout=l),'SOURCE_BINDING_MISMATCH')

    def test_all_runtime_sources_remain_unchanged(self):
        manifest=json.loads((M.ROOT/'reports/runtime-manifest.json').read_text())['files']
        self.assertGreaterEqual(len(manifest),335)
        for name,digest in manifest.items():self.assertEqual(hashlib.sha256((M.ROOT/name).read_bytes()).hexdigest(),digest,name)


if __name__=='__main__':unittest.main(verbosity=2)
