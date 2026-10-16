"""Independent generated-documentary-layout challenges; no actual source inputs."""
import contextlib
import gc
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import struct
import unittest
from unittest import mock
import zipfile
import zlib

ROOT = next(p for p in Path(__file__).resolve().parents if p.name == 'discovery')
CANDIDATE = ROOT / '.cache/phase2-li-layout-candidate-v1/documentary-localization-v1/li_v3_layout_localization.py'
SPEC = importlib.util.spec_from_file_location('independent_documentary_layout_candidate', CANDIDATE)
M = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)
SS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
DOC = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
CT = 'http://schemas.openxmlformats.org/package/2006/content-types'
MAIN = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml'
SHEET = 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml'
RELTYPE = 'application/vnd.openxmlformats-package.relationships+xml'
SST = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml'
ROLES = ('References', 'Column Descriptions')
ENV = ('[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels')
OPS = ('worksheet_read', 'worksheet_decompression', 'worksheet_utf8_decode', 'worksheet_xml_parse', 'worksheet_structure_traversal')


def sheet(body='<sheetData/>', prefix='', suffix=''):
    return (prefix + '<worksheet xmlns="' + SS + '">' + body + '</worksheet>' + suffix).encode()


def col(number):
    chars = []
    while number:
        number, digit = divmod(number - 1, 26)
        chars.append(chr(65 + digit))
    return ''.join(reversed(chars))


def package(reference=None, description=None, *, sheet_specs=None, relation_specs=None,
            opaque=b'UNREAD_ENDPOINT_CANARY\xff<not-xml', change=None):
    """Independent ZIP records: local growth field only, exact ordinary directory."""
    if reference is None:
        reference = sheet('<sheetData><row r="3"><c r="D3" t="s"><v>not-an-index</v></c></row></sheetData>')
    if description is None:
        description = sheet('<sheetData><row r="7"><c r="A7"/></row></sheetData>')
    if sheet_specs is None:
        sheet_specs = [('Column Descriptions', '104', 'last'), ('Unselected', '18', 'other'), ('References', '999', 'first')]
    if relation_specs is None:
        relation_specs = [('first', 'worksheets/sheet7.xml', 'worksheet', None),
                          ('other', 'worksheets/sheet2.xml', 'worksheet', None),
                          ('last', '/xl/worksheets/sheet9.xml', 'worksheet', None)]
    names = list(ENV) + ['xl/worksheets/sheet2.xml', 'xl/worksheets/sheet7.xml', 'xl/worksheets/sheet9.xml', 'xl/sharedStrings.xml']
    types = {name: SHEET for name in names[4:7]}
    types.update({'xl/workbook.xml': MAIN, 'xl/sharedStrings.xml': SST})
    content = ('<Types xmlns="' + CT + '"><Default Extension="rels" ContentType="' + RELTYPE + '"/>' + ''.join('<Override PartName="/' + n + '" ContentType="' + t + '"/>' for n, t in types.items()) + '</Types>').encode()
    rootrels = ('<Relationships xmlns="' + REL + '"><Relationship Id="root" Type="' + DOC + '/officeDocument" Target="xl/workbook.xml"/></Relationships>').encode()
    workbook = ('<workbook xmlns="' + SS + '" xmlns:r="' + DOC + '"><sheets>' + ''.join('<sheet name="' + name + '" sheetId="' + sid + '" r:id="' + rid + '"/>' for name, sid, rid in sheet_specs) + '</sheets></workbook>').encode()
    relationships = ('<Relationships xmlns="' + REL + '">' + ''.join('<Relationship Id="' + rid + '" Type="' + DOC + '/' + kind + '" Target="' + target + '"' + ('' if mode is None else ' TargetMode="' + mode + '"') + '/>' for rid, target, kind, mode in relation_specs) + '</Relationships>').encode()
    entries = list(zip(names, [content, rootrels, workbook, relationships, opaque, reference, description, opaque]))
    if change:
        entries = change(entries)
    local, central = bytearray(), bytearray()
    for index, (name, data) in enumerate(entries):
        name = name.encode('ascii')
        compressor = zlib.compressobj(9, zlib.DEFLATED, -15)
        compressed = compressor.compress(data) + compressor.flush()
        crc = zlib.crc32(data) & 0xffffffff
        extra = struct.pack('<HHHH', 0xa220, 4, 0xa028, 65535) if index == 0 else b''
        offset = len(local)
        local += struct.pack('<4s5H3L2H', b'PK\x03\x04', 20, 0, 8, 0, 33, crc, len(compressed), len(data), len(name), len(extra)) + name + extra + compressed
        central += struct.pack('<4s6H3L5H2L', b'PK\x01\x02', 20, 20, 0, 8, 0, 33, crc, len(compressed), len(data), len(name), 0, 0, 0, 0, 0, offset) + name
    return bytes(local + central + struct.pack('<4s4H2LH', b'PK\x05\x06', 0, 0, len(entries), len(entries), len(central), len(local), 0))


class IndependentLayoutReview(unittest.TestCase):
    def call(self, raw):
        return M.inspect_synthetic_layout(raw)

    def good(self, raw):
        report = self.call(raw)
        self.assertEqual(report['reason'], 'LAYOUT_LOCALIZED', report)
        self.assertEqual(report['engineering_status'], 'LAYOUT_LOCALIZED')
        self.assertEqual(report['status'], 'BLOCKED_SCHEMA')
        self.assertEqual(set(report['roles']), set(ROLES))
        return report

    def bad(self, raw, reason=None):
        report = self.call(raw)
        self.assertIsNone(report['roles'])
        self.assertNotEqual(report['engineering_status'], 'LAYOUT_LOCALIZED')
        self.assertEqual(report['status'], 'BLOCKED_SCHEMA')
        if reason:
            self.assertEqual(report['reason'], reason)
        return report

    def test_relationship_binding_ignores_sheet_id_and_ordinal(self):
        report = self.good(package())
        self.assertEqual(report['roles']['References']['cells'], [{'coordinate': 'D3', 'declared_type': 's', 'formula_element_present': False}])
        self.assertEqual(report['roles']['Column Descriptions']['cells'], [{'coordinate': 'A7', 'declared_type': 'absent', 'formula_element_present': False}])
        swapped = [('References', '3', 'last'), ('Unselected', '20', 'other'), ('Column Descriptions', '71', 'first')]
        new = self.good(package(sheet_specs=swapped))
        self.assertEqual(new['roles']['References']['cells'][0]['coordinate'], 'A7')
        self.assertEqual(new['roles']['Column Descriptions']['cells'][0]['coordinate'], 'D3')

    def test_exact_six_member_reads_and_no_opaque_payload_access(self):
        opened = []
        real = zipfile.ZipFile.open
        def opening(archive, name, *args, **kwargs):
            actual = name.filename if isinstance(name, zipfile.ZipInfo) else name
            opened.append(actual)
            self.assertIn(actual, ENV + ('xl/worksheets/sheet7.xml', 'xl/worksheets/sheet9.xml'))
            return real(archive, name, *args, **kwargs)
        with mock.patch.object(zipfile.ZipFile, 'open', opening):
            self.good(package())
        self.assertEqual(opened, list(ENV) + ['xl/worksheets/sheet7.xml', 'xl/worksheets/sheet9.xml'])

    def test_complete_closed_public_shape_and_exposure_scope(self):
        report = self.good(package())
        expected = {'schema','parser_profile','synthetic_fixture','production_binding','status','engineering_status','reason','validation_reason_before_cleanup','roles','envelope_exposure','worksheet_exposure','shared_strings_decompressed','shared_string_index_resolved','numeric_outcome_interpretation','formula_evaluation','scientific_eligibility_decisions','sampling_independence_established','row_count','paired_count','source_group_count','overlap_count','independent_panel_count','overlap_status','fits','splits'}
        self.assertEqual(set(report), expected)
        self.assertIsNone(report['production_binding'])
        self.assertNotIn('worksheet_cells_decoded', report)
        envkeys = {'decompression_started','decompression_completed','xml_decoding_started','xml_decoding_completed','worksheet_cells_decoded','shared_strings_decoded','formulas_executed','target_numeric_validity_checked','scientific_eligibility_decisions','sampling_independence_established','fits','splits'}
        self.assertEqual(set(report['envelope_exposure']), envkeys)
        self.assertFalse(report['envelope_exposure']['worksheet_cells_decoded'])
        for role in ROLES:
            self.assertEqual(set(report['roles'][role]), {'binding_status','cells','merges'})
            state = report['worksheet_exposure'][role]
            self.assertEqual(set(state), {op+'_'+phase for op in OPS for phase in ('started','completed')} | {'character_data_state'})
            self.assertTrue(all(state[op+'_'+phase] for op in OPS for phase in ('started','completed')))
            self.assertEqual(state['character_data_state'], 'PRIVATE_XML_DECODE_COMPLETED')
        for key in ('row_count','paired_count','source_group_count','overlap_count','independent_panel_count'):
            self.assertIsNone(report[key])
        for key in ('shared_strings_decompressed','shared_string_index_resolved','numeric_outcome_interpretation','formula_evaluation','scientific_eligibility_decisions','sampling_independence_established'):
            self.assertIs(report[key], False)
        self.assertEqual((report['fits'], report['splits'], report['overlap_status']), (0,0,'NOT_ASSESSED'))

    def test_all_storage_declarations_and_opaque_scalar_semantics(self):
        types = [None, 'b', 'd', 'e', 'inlineStr', 'n', 's', 'str']
        cells = []
        for i, kind in enumerate(types, 1):
            attrs = '' if kind is None else ' t="' + kind + '"'
            payload = '<is><t>canary inline</t></is>' if kind == 'inlineStr' else '<v>not a valid scalar or SST index</v>'
            cells.append('<c r="'+col(i)+'1"'+attrs+'>'+payload+'</c>')
        report = self.good(package(sheet('<sheetData><row r="1">'+''.join(cells)+'</row></sheetData>')))
        self.assertEqual([c['declared_type'] for c in report['roles']['References']['cells']], ['absent','b','d','e','inlineStr','n','s','str'])
        self.assertNotIn('not a valid scalar', json.dumps(report))

    def test_canary_content_and_unselected_payload_invariance(self):
        def raw(token):
            body = '<dimension ref="'+token+'"/><sheetData><row r="2" s="'+token+'"><c r="B2" t="s"><f t="shared" si="'+token+'" ref="'+token+'">'+token+'</f><v>'+token+'</v></c><c r="C2" t="inlineStr"><is><r><rPr><color rgb="'+token+'"/></rPr><t xml:space="preserve">'+token+'</t></r></is></c></row></sheetData><headerFooter><oddHeader>'+token+'</oddHeader></headerFooter>'
            return package(sheet(body), opaque=(token+'\x00NOT_XML').encode())
        first = self.good(raw('ONE_PRIVATE_CANARY'))
        second = self.good(raw('TWO_DIFFERENT_PRIVATE_CANARY'))
        self.assertEqual(first, second)
        for token in ('ONE_PRIVATE_CANARY','TWO_DIFFERENT_PRIVATE_CANARY','inspected_xml_bytes','sheet7.xml','first'):
            self.assertNotIn(token, json.dumps(first))
        self.assertTrue(first['roles']['References']['cells'][0]['formula_element_present'])

    def test_empty_sparse_sorted_and_boundary_coordinates(self):
        self.assertEqual(self.good(package(sheet(), sheet()))['roles']['References']['cells'], [])
        body = '<sheetData><row r="1048576"><c r="XFD1048576"/></row><row r="2"><c r="AA2"/><c r="Z2"/><c r="A2"/></row><row r="1"/></sheetData>'
        result = self.good(package(sheet(body)))['roles']['References']['cells']
        self.assertEqual([c['coordinate'] for c in result], ['A2','Z2','AA2','XFD1048576'])

    def test_coordinate_row_and_duplicate_failures(self):
        cases = [('<row r="0"/>','NONCANONICAL_ROW_REF'),('<row r="01"/>','NONCANONICAL_ROW_REF'),('<row r="1048577"/>','NONCANONICAL_ROW_REF'),('<row/>','WORKSHEET_PROFILE_UNSUPPORTED'),('<row r="1"><c/></row>','WORKSHEET_PROFILE_UNSUPPORTED'),('<row r="1"><c r="A2"/></row>','ROW_CELL_MISMATCH'),('<row r="1"/><row r="1"/>','DUPLICATE_ROW_REF'),('<row r="1"><c r="A1"/><c r="A1"/></row>','DUPLICATE_CELL_REF')]
        for coordinate in ('a1','$A$1','A01','A0','A1048577','XFE1','AAAA1','A1:B2',' A1','A1 '):
            cases.append(('<row r="1"><c r="'+coordinate+'"/></row>','NONCANONICAL_CELL_REF'))
        for fragment, reason in cases:
            with self.subTest(fragment=fragment):
                self.bad(package(sheet('<sheetData>'+fragment+'</sheetData>')),reason)

    def test_merge_inventory_order_and_unrepresented_cells(self):
        body = '<sheetData/><mergeCells count="3"><mergeCell ref="XFC1048576:XFD1048576"/><mergeCell ref="D2:F2"/><mergeCell ref="A1:A3"/></mergeCells>'
        out = self.good(package(sheet(body)))['roles']['References']
        self.assertEqual(out['cells'], [])
        self.assertEqual(out['merges'], [{'start_coordinate':'A1','end_coordinate':'A3'},{'start_coordinate':'D2','end_coordinate':'F2'},{'start_coordinate':'XFC1048576','end_coordinate':'XFD1048576'}])

    def test_merge_failure_and_count_boundaries(self):
        for value in ('A1','A1:A1','B2:A3','A3:B2','$A1:B2','A01:B2','A1:XFE2','A1:B2:C3'):
            with self.subTest(value=value):
                self.bad(package(sheet('<sheetData/><mergeCells><mergeCell ref="'+value+'"/></mergeCells>')),'MERGE_RANGE_INVALID')
        for pairs in (('A1:B2','B2:C3'),('A1:B2','A1:B2'),('A1:D4','B2:C3')):
            self.bad(package(sheet('<sheetData/><mergeCells>'+''.join('<mergeCell ref="'+x+'"/>' for x in pairs)+'</mergeCells>')),'MERGE_OVERLAP')
        for count in ('01','-1','1025','1'):
            self.bad(package(sheet('<sheetData/><mergeCells count="'+count+'"/>')),'MERGE_RANGE_INVALID')
        self.good(package(sheet('<sheetData/><mergeCells count="0"/>')))

    def test_unknown_conflicting_and_duplicate_cell_forms(self):
        for attr in (' t="absent"',' t="number"',' foreign="x"'):
            self.bad(package(sheet('<sheetData><row r="1"><c r="A1"'+attr+'/></row></sheetData>')))
        for attrs, children in [('', '<v/><v/>'),('', '<f/><f/>'),('', '<is/>'),(' t="inlineStr"','<v/>'),(' t="inlineStr"','<f/>'),(' t="inlineStr"','<is/><v/>'),(' t="inlineStr"','<is/><is/>')]:
            self.bad(package(sheet('<sheetData><row r="1"><c r="A1"'+attrs+'>'+children+'</c></row></sheetData>')),'WORKSHEET_PROFILE_UNSUPPORTED')
        self.good(package(sheet('<sheetData><row r="1"><c r="A1" t="inlineStr"/><c r="B1"><f t="shared"/><v/></c></row></sheetData>')))

    def test_grammar_namespace_ancestry_text_and_multiplicity(self):
        fragments = ['<sheetData/><sheetData/>','<dimension/><dimension/><sheetData/>','<row r="1"/><sheetData/>','<sheetData><c r="A1"/></sheetData>','<sheetData><row r="1"><c r="A1"><v><c r="B1"/></v></c></row></sheetData>','<sheetData/><extLst/>','<sheetData/><hyperlinks/>','<sheetData xmlns="urn:foreign"/>','<sheetData>NONSPACE</sheetData>','<sheetData/><headerFooter><oddHeader>x</oddHeader>TAIL</headerFooter>','<sheetData><row r="1"><c r="A1"><v>x</v>TAIL</c></row></sheetData>','<sheetData/><dimension xmlns:f="urn:foreign" f:ref="A1"/>','<sheetData/><mergeCells><mergeCell ref="A1:B2"><c r="A1"/></mergeCell></mergeCells>']
        for fragment in fragments:
            with self.subTest(fragment=fragment):
                self.bad(package(sheet(fragment)),'WORKSHEET_PROFILE_UNSUPPORTED')
        self.bad(package(sheet('')),'WORKSHEET_PROFILE_UNSUPPORTED')
        self.good(package(sheet('<sheetViews><sheetView><selection/><selection/></sheetView></sheetViews><sheetData/>')))
        self.good(package(sheet('<sheetData/>').replace(b'<worksheet ',b'<worksheet xmlns:unused="urn:foreign" ')))

    def test_xml_declaration_dtd_entities_pi_comments_cdata_and_encoding(self):
        for prefix in ('<!DOCTYPE worksheet [<!ENTITY probe "CANARY">]>','<?probe CANARY?>','<!--CANARY-->'):
            self.bad(package(sheet(prefix=prefix)),'WORKSHEET_PROFILE_UNSUPPORTED')
        for body in ('<sheetData/><![CDATA[CANARY]]>','<sheetData/><?probe CANARY?>','<sheetData/><!--CANARY-->'):
            self.bad(package(sheet(body)),'WORKSHEET_PROFILE_UNSUPPORTED')
        self.bad(package(sheet(prefix='<?xml version="1.0" encoding="ISO-8859-1"?>')),'WORKSHEET_PROFILE_UNSUPPORTED')
        self.good(package(sheet(prefix='\ufeff<?xml version="1.0" encoding="UTF-8"?>')))
        self.good(package(sheet('<sheetData><row r="1"><c r="A1"><v>&lt;!NOT_MARKUP &amp; &#65;</v></c></row></sheetData>')))
        self.bad(package(sheet().decode().encode('utf-16')))

    def test_missing_duplicate_aliased_and_external_roles(self):
        self.bad(package(sheet_specs=[('References','1','first'),('Other','2','last'),('Unselected','3','other')]),'ROLE_ABSENT_OR_NONUNIQUE')
        variants = [ [('References','1','first'),('References','2','last'),('Unselected','3','other')], [('References','1','first'),('Column Descriptions','2','first'),('Unselected','3','other')] ]
        for specs in variants:
            self.bad(package(sheet_specs=specs),'ENVELOPE_REVALIDATION_FAILED')
        normal = [('first','worksheets/sheet7.xml','worksheet',None),('other','worksheets/sheet2.xml','worksheet',None)]
        for target,kind,mode in [('worksheets/sheet7.xml','worksheet',None),('https://example.invalid/a','worksheet','External'),('sharedStrings.xml','sharedStrings',None),('worksheets/missing.xml','worksheet',None)]:
            self.bad(package(relation_specs=normal+[('last',target,kind,mode)]),'ENVELOPE_REVALIDATION_FAILED')

    def test_same_buffer_envelope_revalidation_blocks_changed_headers(self):
        raw = bytearray(package())
        struct.pack_into('<H',raw,6,1)
        report = self.bad(bytes(raw),'ENVELOPE_REVALIDATION_FAILED')
        self.assertTrue(all(not state['worksheet_read_started'] for state in report['worksheet_exposure'].values()))
        raw = bytearray(package())
        directory = struct.unpack_from('<L',raw,len(raw)-6)[0]
        cursor = directory
        while raw[cursor:cursor+4] == b'PK\x01\x02':
            last = cursor
            cursor += 46 + struct.unpack_from('<H',raw,cursor+28)[0]
        struct.pack_into('<H',raw,last+32,1)
        self.bad(bytes(raw),'ENVELOPE_REVALIDATION_FAILED')

    def test_second_role_failure_is_atomic_with_honest_decode_state(self):
        report = self.bad(package(description=b'\xffPRIVATE_DECODE_CANARY'),'WORKSHEET_UTF8_FAILED')
        first, second = (report['worksheet_exposure'][role] for role in ROLES)
        self.assertTrue(first['worksheet_xml_parse_completed'])
        self.assertTrue(first['worksheet_structure_traversal_completed'])
        self.assertTrue(second['worksheet_read_completed'])
        self.assertTrue(second['worksheet_decompression_completed'])
        self.assertTrue(second['worksheet_utf8_decode_started'])
        self.assertFalse(second['worksheet_utf8_decode_completed'])
        self.assertEqual(second['character_data_state'],'MAY_HAVE_BEEN_DECODED')
        self.assertFalse(second['worksheet_xml_parse_started'])
        self.assertNotIn('PRIVATE_DECODE_CANARY',json.dumps(report))

    def test_malformed_xml_preserves_completed_utf8_and_partial_traversal(self):
        raw = sheet('<sheetData><row r="1"><c r="A1"><v>CANARY</v></c></row></sheetData>')[:-5]
        report = self.bad(package(description=raw),'WORKSHEET_PARSE_FAILED')
        state = report['worksheet_exposure'][ROLES[1]]
        self.assertTrue(state['worksheet_utf8_decode_completed'])
        self.assertEqual(state['character_data_state'],'PRIVATE_XML_DECODE_COMPLETED')
        self.assertTrue(state['worksheet_xml_parse_started'])
        self.assertFalse(state['worksheet_xml_parse_completed'])
        self.assertTrue(state['worksheet_structure_traversal_started'])
        self.assertFalse(state['worksheet_structure_traversal_completed'])
        self.assertNotIn('CANARY',json.dumps(report))

    def test_partial_read_and_stream_close_failures_withhold_both_roles(self):
        real = zipfile.ZipFile.open
        class FaultStream:
            def __init__(self, stream, on_close): self.stream,self.on_close=stream,on_close
            def __enter__(self): return self
            def read(self, size):
                if self.on_close:return self.stream.read(size)
                self.stream.read(7)
                raise OSError('PRIVATE_READ_CANARY')
            def __exit__(self,*args):
                self.stream.close()
                if self.on_close:raise OSError('PRIVATE_CLOSE_CANARY')
        for close in (False,True):
            def opening(archive,name,*args,**kwargs):
                stream=real(archive,name,*args,**kwargs)
                return FaultStream(stream,close) if name=='xl/worksheets/sheet9.xml' else stream
            with mock.patch.object(zipfile.ZipFile,'open',opening):
                report=self.bad(package(),'WORKSHEET_READ_FAILED')
            state=report['worksheet_exposure'][ROLES[1]]
            self.assertTrue(state['worksheet_read_started'])
            self.assertTrue(state['worksheet_decompression_started'])
            self.assertFalse(state['worksheet_read_completed'])
            self.assertFalse(state['worksheet_utf8_decode_started'])
            self.assertTrue(report['worksheet_exposure'][ROLES[0]]['worksheet_xml_parse_completed'])
            self.assertNotIn('PRIVATE_READ_CANARY',json.dumps(report))
            self.assertNotIn('PRIVATE_CLOSE_CANARY',json.dumps(report))

    def test_owned_archive_cleanup_failure_clears_layout_and_suppresses_retry(self):
        original=M.envelope._growth_zip_structure
        held=[]
        def structure(raw,exposure,holder):
            result=original(raw,exposure,holder)
            owned=holder[0]
            held.append(owned)
            real_close=owned.close
            def fail_close():
                if owned.fp is not None:raise OSError('PRIVATE_ARCHIVE_CLOSE_CANARY')
                return real_close()
            owned.close=fail_close
            return result
        stderr=io.StringIO()
        with contextlib.redirect_stderr(stderr),mock.patch.object(M.envelope,'_growth_zip_structure',structure):
            report=self.bad(package(),'ARCHIVE_CLOSE_FAILED')
            self.assertEqual(report['validation_reason_before_cleanup'],'LAYOUT_LOCALIZED')
            self.assertTrue(all(x['worksheet_xml_parse_completed'] for x in report['worksheet_exposure'].values()))
            self.assertIsNone(held[0].fp)
            # Realistic still-open fault: a detached fp makes later close harmless.
            held.clear()
            gc.collect()
        self.assertEqual(stderr.getvalue(),'')
        self.assertNotIn('PRIVATE_ARCHIVE_CLOSE_CANARY',json.dumps(report))

    def test_cell_count_exact_boundary(self):
        def raw(count):
            cells=''.join('<c r="'+col(i)+'1"/>' for i in range(1,count+1))
            return package(sheet('<sheetData><row r="1">'+cells+'</row></sheetData>'))
        self.assertEqual(len(self.good(raw(8192))['roles']['References']['cells']),8192)
        self.bad(raw(8193),'LAYOUT_LIMIT')

    def test_merge_count_exact_boundary(self):
        def raw(count):
            merges=''.join('<mergeCell ref="A'+str(i)+':B'+str(i)+'"/>' for i in range(1,count+1))
            return package(sheet('<sheetData/><mergeCells>'+merges+'</mergeCells>'))
        self.assertEqual(len(self.good(raw(1024))['roles']['References']['merges']),1024)
        self.bad(raw(1025),'LAYOUT_LIMIT')

    def test_node_count_exact_boundary_without_tree_materialization(self):
        def raw(nodes):
            # Seven enclosing elements plus repeated permitted rPr children.
            body='<sheetData><row r="1"><c r="A1" t="inlineStr"><is><r><rPr>'+('<b/>'*(nodes-7))+'</rPr></r></is></c></row></sheetData>'
            return package(sheet(body))
        self.good(raw(65536))
        self.bad(raw(65537),'LAYOUT_LIMIT')

    def test_attribute_limits_and_controlled_depth_bound(self):
        self.good(package(sheet('<sheetData/><dimension ref="'+('x'*1024)+'"/>')))
        self.bad(package(sheet('<sheetData/><dimension ref="'+('x'*1025)+'"/>')),'LAYOUT_LIMIT')
        self.bad(package(sheet('<sheetData/><dimension '+('x'*257)+'="a"/>')),'LAYOUT_LIMIT')
        attrs=' '.join('a'+str(i)+'="x"' for i in range(33))
        self.bad(package(sheet('<sheetData/><dimension '+attrs+'/>')),'LAYOUT_LIMIT')
        # The frozen grammar has finite depth below64; reduced-cap injection tests enforcement only.
        with mock.patch.dict(M.BOUNDS,{'xml_depth_each':3}):
            self.bad(package(sheet('<sheetData><row r="1"><c r="A1"/></row></sheetData>')),'LAYOUT_LIMIT')

    def test_decompressed_byte_boundary_and_total_counter(self):
        template=sheet('<sheetData><row r="1"><c r="A1"><v></v></c></row></sheetData>')
        filler=b'x'*(2097152-len(template))
        exact=template.replace(b'<v></v>',b'<v>'+filler+b'</v>')
        self.assertEqual(len(exact),2097152)
        self.good(package(exact,exact))
        self.bad(package(exact.replace(b'<v>',b'<v>x',1)),'LAYOUT_LIMIT')
        with mock.patch.dict(M.BOUNDS,{'new_worksheet_decompressed_bytes_total':len(sheet())*2-1}):
            self.bad(package(sheet(),sheet()),'LAYOUT_LIMIT')

    def test_public_output_cap_and_report_detachment(self):
        baseline=self.good(package())
        limit=len(M.canonical(baseline))
        with mock.patch.dict(M.BOUNDS,{'canonical_public_receipt_bytes':limit}):
            self.good(package())
        with mock.patch.dict(M.BOUNDS,{'canonical_public_receipt_bytes':limit-1}):
            self.bad(package(),'PUBLIC_OUTPUT_LIMIT')
        baseline['roles']['References']['cells'][0]['coordinate']='CANARY'
        baseline['envelope_exposure']['decompression_started'].append('CANARY')
        baseline['worksheet_exposure']['References']['character_data_state']='CANARY'
        self.assertNotIn('CANARY',json.dumps(self.good(package())))

    def test_input_bounds_and_actual_identity_refusal_without_actual_input(self):
        for value in (None,True,1,'bytes',bytearray(b'zip'),memoryview(b'zip')):
            self.bad(value,'RAW_TYPE_INVALID')
        self.bad(b'x'*183879,'SOURCE_SIZE_MISMATCH')
        fake=mock.Mock();fake.hexdigest.return_value=M.envelope.header_diagnostic.OBJECT_SHA256
        with mock.patch.object(M.hashlib,'sha256',return_value=fake):
            self.bad(b'only generated bytes','SYNTHETIC_REAL_SOURCE_FORBIDDEN')
        fake=mock.Mock();fake.hexdigest.return_value=M.custody.SOURCE_MD5
        with mock.patch.object(M.hashlib,'md5',return_value=fake):
            self.bad(b'x'*183878,'SYNTHETIC_REAL_SOURCE_FORBIDDEN')
        self.assertIsNone(M.PRODUCTION_BINDING)
        for name in ('production_context','diagnose','main','envelope'):
            self.assertFalse(callable(getattr(M,name,None)))

    def test_frozen_grammar_and_bounds_match_published_proposal(self):
        proposal=json.loads((ROOT/'reports/phase2-li-layout-localization-design-v1/proposal.json').read_text())
        expected={name:{key:rule[key] for key in ('attributes','children','required') if key in rule} for name,rule in proposal['worksheet_profile']['grammar'].items()}
        self.assertEqual(M.GRAMMAR,expected)
        self.assertEqual(M.BOUNDS,{key:value for key,value in proposal['bounds'].items() if type(value) is int})
        self.assertEqual(M.CELL_TYPES,proposal['worksheet_profile']['declared_cell_types'])
        self.assertEqual(M.OPAQUE_LEAVES,proposal['worksheet_profile']['text_and_tail_policy']['opaque_text_allowed_only'])
        self.assertEqual(M.ENVELOPE_EXPOSURE_KEYS,proposal['exposure_contract']['public_envelope_exposure_fields'])


if __name__=='__main__':
    unittest.main(verbosity=2)
