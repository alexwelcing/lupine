"""Author generated-byte checks; no actual custody or production context."""
from contextlib import ExitStack, redirect_stderr
from copy import deepcopy
import gc
import hashlib
import io
import json
from pathlib import Path
import socket
import struct
import unittest
from unittest.mock import patch
import zipfile

import li_v3_layout_localization as M
import generated_zip as fixture

NS = M.NAMESPACE
CANARY = 'PRIVATE_LAYOUT_CANARY_857219'
FIXED = list(M.envelope.ENVELOPE_MEMBERS)


def worksheet(body='<sheetData/>', declaration=''):
    return (declaration + '<worksheet xmlns="' + NS + '">' + body + '</worksheet>').encode()


def book(first=None, second=None, **archive_options):
    entries = fixture.parts()
    entries = [(name, worksheet() if name in ('xl/worksheets/sheet2.xml', 'xl/worksheets/sheet3.xml') else data)
               for name, data in entries]
    replacements = {'xl/worksheets/sheet2.xml': first, 'xl/worksheets/sheet3.xml': second}
    entries = [(name, replacements.get(name) if replacements.get(name) is not None else body)
               for name, body in entries]
    return fixture.archive(entries, **archive_options)[0]


class LayoutAuthorTests(unittest.TestCase):
    def setUp(self):
        self.guards = ExitStack()
        self.addCleanup(self.guards.close)
        for obj, name in ((socket, 'socket'), (socket, 'getaddrinfo'),
                          (M.custody, '_read_relative'), (M.envelope, 'production_context'),
                          (M.envelope.growth, 'production_context')):
            self.guards.enter_context(patch.object(obj, name, side_effect=AssertionError('forbidden actual operation')))

    def inspect(self, raw):
        opened = []
        original = zipfile.ZipFile.open
        def bounded(instance, name, *args, **kwargs):
            actual = name.filename if isinstance(name, zipfile.ZipInfo) else name
            self.assertIn(actual, FIXED + ['xl/worksheets/sheet2.xml', 'xl/worksheets/sheet3.xml'])
            opened.append(actual)
            return original(instance, name, *args, **kwargs)
        with patch.object(zipfile.ZipFile, 'open', bounded):
            report = M.inspect_synthetic_layout(raw)
        self.assertEqual(report['status'], 'BLOCKED_SCHEMA')
        self.assertTrue(report['synthetic_fixture'])
        self.assertIsNone(report['production_binding'])
        self.assertEqual(set(report['envelope_exposure']), set(M.ENVELOPE_EXPOSURE_KEYS))
        self.assertNotIn('inspected_xml_bytes', report['envelope_exposure'])
        self.assertNotIn(CANARY, M.canonical(report).decode())
        for key in ('row_count', 'paired_count', 'source_group_count', 'overlap_count', 'independent_panel_count'):
            self.assertIsNone(report[key])
        for key in ('shared_strings_decompressed', 'shared_string_index_resolved', 'numeric_outcome_interpretation',
                    'formula_evaluation', 'scientific_eligibility_decisions', 'sampling_independence_established'):
            self.assertIs(report[key], False)
        self.assertEqual(report['fits'], 0)
        self.assertEqual(report['splits'], 0)
        return report, opened

    def accepted(self, raw):
        report, opened = self.inspect(raw)
        self.assertEqual(report['reason'], 'LAYOUT_LOCALIZED')
        self.assertEqual(report['engineering_status'], 'LAYOUT_LOCALIZED')
        self.assertEqual(opened, FIXED + ['xl/worksheets/sheet2.xml', 'xl/worksheets/sheet3.xml'])
        self.assertEqual(set(report['roles']), set(M.ROLES))
        for role in M.ROLES:
            self.assertEqual(report['roles'][role]['binding_status'], 'EXACT_VALIDATED_WORKBOOK_RELATIONSHIP')
            state = report['worksheet_exposure'][role]
            for operation in M.OPERATIONS:
                self.assertTrue(state[operation + '_started'])
                self.assertTrue(state[operation + '_completed'])
        return report

    def blocked(self, raw, reason=None):
        report, opened = self.inspect(raw)
        self.assertIsNone(report['roles'])
        if reason is not None:
            self.assertEqual(report['reason'], reason)
        return report, opened

    def test_empty_roles_are_complete_inventory_not_scientific_readiness(self):
        report = self.accepted(book())
        for role in M.ROLES:
            self.assertEqual(report['roles'][role]['cells'], [])
            self.assertEqual(report['roles'][role]['merges'], [])

    def test_sparse_unordered_coordinates_sorted_with_absent_type_preserved(self):
        data = worksheet('<dimension ref="A1:XFD1048576"/><sheetData><row r="1048576"><c r="XFD1048576"/></row>'
                         '<row r="2"><c r="AA2" t="s"><v>UNVALIDATED_INDEX</v></c><c r="A2"/></row><row r="1"/></sheetData>')
        report = self.accepted(book(data))
        self.assertEqual(report['roles']['References']['cells'], [
            {'coordinate': 'A2', 'declared_type': 'absent', 'formula_element_present': False},
            {'coordinate': 'AA2', 'declared_type': 's', 'formula_element_present': False},
            {'coordinate': 'XFD1048576', 'declared_type': 'absent', 'formula_element_present': False}])

    def test_each_closed_cell_type_and_explicit_empty_cell(self):
        cells = ''.join(f'<c r="{chr(65+i)}1"' + ('' if t == 'absent' else f' t="{t}"') + '/>'
                        for i, t in enumerate(M.CELL_TYPES))
        report = self.accepted(book(worksheet('<sheetData><row r="1">' + cells + '</row></sheetData>')))
        self.assertEqual([c['declared_type'] for c in report['roles']['References']['cells']], M.CELL_TYPES)

    def test_opaque_values_inline_text_formula_and_shared_index_invariance(self):
        def contents(value):
            return worksheet('<sheetData><row r="1"><c r="A1" t="n"><v>' + value + '</v></c>'
                '<c r="B1" t="s"><v>' + value + '</v></c><c r="C1" t="str"><f t="shared" ref="A1:XFD999" si="' + value + '">' + value + '</f><v>' + value + '</v></c>'
                '<c r="D1" t="inlineStr"><is><r><rPr><b/><color rgb="' + value + '"/></rPr><t xml:space="preserve">' + value + '</t></r></is></c></row></sheetData>')
        first = self.accepted(book(contents(CANARY), contents(CANARY)))
        second = self.accepted(book(contents('DIFFERENT_STRING_123'), contents('OTHER_TEXT')))
        self.assertEqual(first, second)
        self.assertTrue(first['roles']['References']['cells'][2]['formula_element_present'])
        self.assertFalse(first['roles']['References']['cells'][0]['formula_element_present'])

    def test_role_resolution_uses_actual_rid_not_sheetid_or_position(self):
        entries = dict(fixture.parts())
        entries['xl/worksheets/sheet2.xml'] = worksheet('<sheetData><row r="7"><c r="C7"/></row></sheetData>')
        entries['xl/worksheets/sheet3.xml'] = worksheet('<sheetData><row r="5"><c r="B5"/></row></sheetData>')
        ss, doc = M.custody.SS, M.custody.DOCREL[:-1]
        entries['xl/workbook.xml'] = (f'<workbook xmlns="{ss}" xmlns:r="{doc}"><sheets>'
            '<sheet name="Column Descriptions" sheetId="900" r:id="rId3"/>'
            '<sheet name="HiddenTarget" sheetId="888" r:id="rId1"/>'
            '<sheet name="References" sheetId="17" r:id="rId2"/>'
            '</sheets></workbook>').encode()
        report = self.accepted(fixture.archive(list(entries.items()))[0])
        self.assertEqual(report['roles']['References']['cells'][0]['coordinate'], 'C7')
        self.assertEqual(report['roles']['Column Descriptions']['cells'][0]['coordinate'], 'B5')

    def test_role_alias_missing_duplicate_and_external_relationship_block(self):
        for before, after in ((b'References', b'references'), (b'References', b'Unknown'),
                              (b'Column Descriptions', b'References')):
            entries = [(name, data.replace(before, after) if name == 'xl/workbook.xml' else data)
                       for name, data in fixture.parts()]
            _, opened = self.blocked(fixture.archive(entries)[0])
            self.assertTrue(all(name in FIXED for name in opened))
        entries = [(name, data.replace(b'Target="worksheets/sheet2.xml"', b'TargetMode="External" Target="worksheets/sheet2.xml"')
                    if name == 'xl/_rels/workbook.xml.rels' else data) for name, data in fixture.parts()]
        self.blocked(fixture.archive(entries)[0], 'ENVELOPE_REVALIDATION_FAILED')

    def test_package_absolute_targets_follow_existing_validator(self):
        entries = dict(fixture.parts())
        entries['xl/worksheets/sheet2.xml'] = entries['xl/worksheets/sheet3.xml'] = worksheet()
        entries['xl/_rels/workbook.xml.rels'] = entries['xl/_rels/workbook.xml.rels'].replace(b'Target="worksheets/', b'Target="/xl/worksheets/')
        self.accepted(fixture.archive(list(entries.items()))[0])

    def test_prior_zip_local_growth_and_central_preflight_still_required(self):
        for extras in ({}, {0: fixture.shape(signature=1)}, {0: fixture.shape(), 7: fixture.shape(signature=1)}):
            _, opened = self.blocked(book(extras=extras), 'ENVELOPE_REVALIDATION_FAILED')
            self.assertEqual(opened, [])
        raw = bytearray(book());last = fixture.central_positions(raw)[-1]
        struct.pack_into('<H', raw, last + 32, 1)
        _, opened = self.blocked(bytes(raw), 'ENVELOPE_REVALIDATION_FAILED')
        self.assertEqual(opened, [])

    def test_coordinate_domain_and_row_agreement_failures(self):
        bads = ['a1', '$A$1', 'A01', 'A0', 'XFE1', 'A1048577', 'AAAA1', 'A1:B2', '1A', 'A+1', '']
        for value in bads:
            with self.subTest(value=value):
                self.blocked(book(worksheet(f'<sheetData><row r="1"><c r="{value}"/></row></sheetData>')), 'NONCANONICAL_CELL_REF')
        self.blocked(book(worksheet('<sheetData><row r="1"><c r="A2"/></row></sheetData>')), 'ROW_CELL_MISMATCH')

    def test_row_missing_noncanonical_and_duplicate_cells(self):
        for value in ('0', '01', '1048577', '+1'):
            self.blocked(book(worksheet(f'<sheetData><row r="{value}"/></sheetData>')), 'NONCANONICAL_ROW_REF')
        for body in ('<sheetData><row/></sheetData>', '<sheetData><row r="1"><c/></row></sheetData>'):
            self.blocked(book(worksheet(body)), 'WORKSHEET_PROFILE_UNSUPPORTED')
        self.blocked(book(worksheet('<sheetData><row r="1"/><row r="1"/></sheetData>')), 'DUPLICATE_ROW_REF')
        self.blocked(book(worksheet('<sheetData><row r="1"><c r="A1"/><c r="A1"/></row></sheetData>')), 'DUPLICATE_CELL_REF')

    def test_conflicting_cell_children_and_unknown_types(self):
        for attr, children in [('t="inlineStr"','<v/>'), ('t="inlineStr"','<f/>'), ('','<is/>'),
                               ('t="s"','<is/>'), ('','<v/><v/>'), ('','<f/><f/>'),
                               ('t="inlineStr"','<is/><is/>'), ('t="inlineStr"','<is/><v/>')]:
            self.blocked(book(worksheet(f'<sheetData><row r="1"><c r="A1" {attr}>{children}</c></row></sheetData>')), 'WORKSHEET_PROFILE_UNSUPPORTED')
        for attr in ('t=""', 't="absent"', 't="unknown"'):
            self.blocked(book(worksheet(f'<sheetData><row r="1"><c r="A1" {attr}/></row></sheetData>')), 'CELL_TYPE_UNSUPPORTED')

    def test_merge_order_sparse_endpoints_and_no_expansion(self):
        data = worksheet('<sheetData/><mergeCells count="2"><mergeCell ref="C8:XFD9"/><mergeCell ref="A1:B2"/></mergeCells>')
        report = self.accepted(book(data))
        self.assertEqual(report['roles']['References']['cells'], [])
        self.assertEqual(report['roles']['References']['merges'], [
            {'start_coordinate':'A1','end_coordinate':'B2'}, {'start_coordinate':'C8','end_coordinate':'XFD9'}])

    def test_merge_degenerate_reversed_duplicate_overlap_and_count(self):
        for ref in ('A1:A1','B2:A1','B1:A2','A0:B1','A1','A1:B2:C3','$A$1:B2'):
            self.blocked(book(worksheet(f'<sheetData/><mergeCells><mergeCell ref="{ref}"/></mergeCells>')), 'MERGE_RANGE_INVALID')
        for ref in ('A1:B2','B2:C3','A2:B3','B1:C1'):
            self.blocked(book(worksheet(f'<sheetData/><mergeCells><mergeCell ref="A1:B2"/><mergeCell ref="{ref}"/></mergeCells>')), 'MERGE_OVERLAP')
        for count in ('0','2','01','-1','1025'):
            self.blocked(book(worksheet(f'<sheetData/><mergeCells count="{count}"><mergeCell ref="A1:B1"/></mergeCells>')), 'MERGE_RANGE_INVALID')

    def test_unknown_namespaces_attributes_and_reserved_ancestry(self):
        for body in ('<sheetData><c r="A1"/></sheetData>', '<sheetData><row r="1"><v/></row></sheetData>',
                     '<sheetData/><extLst/>', '<sheetData/><hyperlinks/>', '<sheetData/><sheetData/>',
                     '<sheetData xmlns="urn:foreign"/>', '<sheetData><row r="1" unknown="x"/></sheetData>',
                     '<sheetData><row r="1"><c r="A1"><v xmlns:x="urn:foreign" x:a="1"/></c></row></sheetData>'):
            self.blocked(book(worksheet(body)), 'WORKSHEET_PROFILE_UNSUPPORTED')
        self.blocked(book(worksheet('')), 'WORKSHEET_PROFILE_UNSUPPORTED')

    def test_whitespace_and_opaque_leaf_text_rules(self):
        self.accepted(book(worksheet('<sheetData> \t\r\n<row r="1"><c r="A1"><v>any text &amp; value</v></c></row></sheetData>')))
        for body in ('<sheetData>unallowed</sheetData>', '<sheetData>\u00a0</sheetData>',
                     '<sheetData><row r="1"/>tail</sheetData>', '<sheetData><row r="1"><c r="A1"><v>ok</v>tail</c></row></sheetData>'):
            self.blocked(book(worksheet(body)), 'WORKSHEET_PROFILE_UNSUPPORTED')

    def test_metadata_subtrees_are_bounded_opaque_and_not_projected(self):
        metadata = ('<sheetPr codeName="PRIVATE"><tabColor rgb="ANY"/><outlinePr summaryBelow="opaque"/><pageSetUpPr/></sheetPr>'
                    '<dimension ref="not-a-range"/><sheetViews><sheetView workbookViewId="opaque"><pane/><selection sqref="opaque"/></sheetView></sheetViews>'
                    '<sheetFormatPr defaultRowHeight="opaque"/><cols><col width="opaque"/></cols><printOptions/><pageMargins/><pageSetup/>'
                    '<headerFooter><oddHeader>private text</oddHeader><oddFooter/><evenHeader/><evenFooter/><firstHeader/><firstFooter/></headerFooter>')
        report = self.accepted(book(worksheet(metadata + '<sheetData/>')))
        self.assertEqual(report, self.accepted(book()))

    def test_utf8_bom_declaration_and_malformed_encoding_exposure(self):
        for declaration in ('', '\ufeff', '<?xml version="1.0" encoding="UTF-8"?>', '\ufeff<?xml version="1.0" encoding="utf-8"?>'):
            self.accepted(book(worksheet(declaration=declaration)))
        report, _ = self.blocked(book(worksheet() + b'\xff'), 'WORKSHEET_UTF8_FAILED')
        state = report['worksheet_exposure']['References']
        self.assertTrue(state['worksheet_utf8_decode_started']);self.assertFalse(state['worksheet_utf8_decode_completed'])
        self.assertEqual(state['character_data_state'], 'MAY_HAVE_BEEN_DECODED')
        self.blocked(book(worksheet().decode().encode('utf-16')), 'WORKSHEET_UTF8_FAILED')

    def test_dtd_entities_pi_comments_cdata_and_alternate_encoding_block(self):
        for content in (b'<!DOCTYPE worksheet [<!ENTITY x "x">]>' + worksheet(), b'<?pi private?>' + worksheet(),
                        worksheet('<sheetData/><!--comment-->'), worksheet('<sheetData><![CDATA[x]]></sheetData>'),
                        worksheet(declaration='<?xml version="1.0" encoding="iso-8859-1"?>')):
            report, _ = self.blocked(book(content), 'WORKSHEET_PROFILE_UNSUPPORTED')
            state = report['worksheet_exposure']['References']
            self.assertTrue(state['worksheet_utf8_decode_completed']);self.assertFalse(state['worksheet_xml_parse_started'])

    def test_malformed_xml_preserves_complete_private_text_decode(self):
        report, _ = self.blocked(book(worksheet()[:-3]), 'WORKSHEET_PARSE_FAILED')
        state = report['worksheet_exposure']['References']
        self.assertTrue(state['worksheet_utf8_decode_completed']);self.assertTrue(state['worksheet_xml_parse_started'])
        self.assertFalse(state['worksheet_xml_parse_completed']);self.assertTrue(state['worksheet_structure_traversal_started'])

    def test_second_role_failure_never_publishes_first_inventory(self):
        report, opened = self.blocked(book(worksheet('<sheetData><row r="1"><c r="A1"/></row></sheetData>'), b'bad xml'), 'WORKSHEET_PARSE_FAILED')
        self.assertEqual(opened, FIXED + ['xl/worksheets/sheet2.xml','xl/worksheets/sheet3.xml'])
        self.assertTrue(report['worksheet_exposure']['References']['worksheet_structure_traversal_completed'])
        self.assertFalse(report['worksheet_exposure']['Column Descriptions']['worksheet_structure_traversal_completed'])

    def test_explicit_cells_8192_boundary_and_next_cell_block(self):
        def cells(count):
            return worksheet('<sheetData>' + ''.join(f'<row r="{i}"><c r="A{i}"/></row>' for i in range(1,count+1)) + '</sheetData>')
        report = self.accepted(book(cells(8192)))
        self.assertEqual(len(report['roles']['References']['cells']),8192)
        self.blocked(book(cells(8193)), 'LAYOUT_LIMIT')

    def test_node_count_65536_boundary_and_next_node_block(self):
        exact = worksheet('<cols>' + '<col/>'*65533 + '</cols><sheetData/>')
        self.accepted(book(exact))
        over = worksheet('<cols>' + '<col/>'*65534 + '</cols><sheetData/>')
        self.blocked(book(over), 'LAYOUT_LIMIT')

    def test_byte_cap_exact_and_overrun_bounded_before_decode(self):
        prefix = '<sheetData><row r="1"><c r="A1"><v>'
        suffix = '</v></c></row></sheetData>'
        overhead = len(worksheet(prefix + suffix))
        exact = worksheet(prefix + 'x'*(2097152-overhead) + suffix)
        self.assertEqual(len(exact),2097152)
        self.accepted(book(exact,exact))
        report,_ = self.blocked(book(exact+b' '),'LAYOUT_LIMIT')
        state=report['worksheet_exposure']['References']
        self.assertTrue(state['worksheet_read_started']);self.assertFalse(state['worksheet_read_completed'])
        self.assertFalse(state['worksheet_utf8_decode_started'])

    def test_attribute_and_depth_limits_without_cap_relaxation(self):
        self.accepted(book(worksheet('<sheetPr codeName="'+'x'*1024+'"/><sheetData/>')))
        self.blocked(book(worksheet('<sheetPr codeName="'+'x'*1025+'"/><sheetData/>')), 'LAYOUT_LIMIT')
        # Lowered synthetic bounds exercise otherwise redundant depth/attribute guards.
        with patch.dict(M.BOUNDS, {'xml_depth_each':2}):
            self.blocked(book(worksheet('<sheetData><row r="1"/></sheetData>')), 'LAYOUT_LIMIT')
        with patch.dict(M.BOUNDS, {'attributes_per_element':1}):
            self.blocked(book(worksheet('<sheetData><row r="1" hidden="0"/></sheetData>')), 'LAYOUT_LIMIT')

    def test_namespace_declarations_count_with_attributes_and_reset_per_element(self):
        def declarations(count):
            return ''.join(f' xmlns:p{i}="urn:unused:{i}"' for i in range(count))
        # Default namespace plus 31 unused declarations equals32.
        valid=(f'<worksheet xmlns="{NS}"'+declarations(31)+'><sheetData><row r="1"'
               +declarations(31)+'><c r="A1"/></row></sheetData></worksheet>').encode()
        self.accepted(book(valid))
        for body in ((f'<worksheet xmlns="{NS}"'+declarations(32)+'><sheetData/></worksheet>').encode(),
                     worksheet('<sheetData><row r="1"'+declarations(32)+'/></sheetData>')):
            report,_=self.blocked(book(body),'LAYOUT_LIMIT')
            state=report['worksheet_exposure']['References']
            self.assertTrue(state['worksheet_structure_traversal_started'])
            self.assertFalse(state['worksheet_structure_traversal_completed'])
            self.assertFalse(state['worksheet_xml_parse_completed'])
            self.assertTrue(state['worksheet_utf8_decode_completed'])

    def test_namespace_prefix_and_uri_exact_caps_and_partial_callback_exposure(self):
        def namespace(prefix,uri):
            return (f'<worksheet xmlns="{NS}" xmlns:{prefix}="{uri}"><sheetData/></worksheet>').encode()
        self.accepted(book(namespace('p'*250,'u'*1024)))
        for prefix,uri in (('p'*251,'urn:short'),('short','u'*1025)):
            report,_=self.blocked(book(namespace(prefix,uri)),'LAYOUT_LIMIT')
            state=report['worksheet_exposure']['References']
            self.assertEqual(state['character_data_state'],'PRIVATE_XML_DECODE_COMPLETED')
            self.assertTrue(state['worksheet_xml_parse_started'])
            self.assertTrue(state['worksheet_structure_traversal_started'])
            self.assertFalse(state['worksheet_xml_parse_completed'])
            self.assertFalse(state['worksheet_structure_traversal_completed'])
            self.assertNotIn(uri,M.canonical(report).decode())

    def test_merge_limit_exact_and_next_rectangle_block(self):
        def body(count):
            return worksheet('<sheetData/><mergeCells>' + ''.join(f'<mergeCell ref="A{i}:B{i}"/>' for i in range(1,count+1)) + '</mergeCells>')
        report=self.accepted(book(body(1024)));self.assertEqual(len(report['roles']['References']['merges']),1024)
        self.blocked(book(body(1025)), 'LAYOUT_LIMIT')

    def test_output_cap_is_atomic_and_reports_closed_reason(self):
        with patch.dict(M.BOUNDS, {'canonical_public_receipt_bytes':4000}):
            data=worksheet('<sheetData>'+''.join(f'<row r="{i}"><c r="A{i}"/></row>' for i in range(1,60))+'</sheetData>')
            report,_=self.blocked(book(data),'PUBLIC_OUTPUT_LIMIT')
            self.assertLess(len(M.canonical(report)),4000)

    def test_partial_member_read_error_has_no_false_completion_or_exception_text(self):
        old=zipfile.ZipFile.open
        def opening(instance,name,*args,**kwargs):
            if name=='xl/worksheets/sheet3.xml':raise OSError(CANARY)
            return old(instance,name,*args,**kwargs)
        with patch.object(zipfile.ZipFile,'open',opening):report,_=self.blocked(book(),'WORKSHEET_READ_FAILED')
        state=report['worksheet_exposure']['Column Descriptions']
        self.assertTrue(state['worksheet_read_started']);self.assertFalse(state['worksheet_read_completed'])
        self.assertFalse(state['worksheet_utf8_decode_started'])

    def test_archive_cleanup_failure_blocks_and_suppresses_private_stderr(self):
        original=zipfile.ZipFile.close;seen=[]
        def closing(instance):
            if instance.mode=='r' and instance.fp is not None:
                seen.append(instance)
                if len(seen)==2:raise OSError(CANARY)
            return original(instance)
        stderr=io.StringIO()
        with redirect_stderr(stderr),patch.object(zipfile.ZipFile,'close',closing):
            report,_=self.blocked(book(),'ARCHIVE_CLOSE_FAILED');gc.collect()
        self.assertEqual(stderr.getvalue(),'')
        self.assertEqual(report['validation_reason_before_cleanup'],'LAYOUT_LOCALIZED')
        self.assertTrue(report['worksheet_exposure']['Column Descriptions']['worksheet_structure_traversal_completed'])

    def test_type_size_and_known_actual_identity_rejected_before_archive(self):
        for value in (None, 'text', bytearray(b''), 1):
            report,opened=self.blocked(value,'RAW_TYPE_INVALID');self.assertEqual(opened,[])
        self.blocked(b'0'*(M.custody.SOURCE_BYTES+1),'SOURCE_SIZE_MISMATCH')
        with patch.object(M.hashlib,'sha256') as digest:
            digest.return_value.hexdigest.return_value=M.envelope.header_diagnostic.OBJECT_SHA256
            report,opened=self.blocked(b'generated','SYNTHETIC_REAL_SOURCE_FORBIDDEN')
        self.assertEqual(opened,[])

    def test_public_projection_keys_and_no_content_hash_length_fields(self):
        report=self.accepted(book(worksheet('<sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>'+CANARY+'</t></is></c></row></sheetData>')))
        for role, value in report['roles'].items():
            self.assertEqual(set(value), {'binding_status','cells','merges'})
            for cell in value['cells']:
                self.assertEqual(set(cell), {'coordinate','declared_type','formula_element_present'})
        encoded=M.canonical(report).decode()
        for forbidden in ('sha256','md5','fingerprint','byte_length','character_length','formula_body','content_length'):
            self.assertNotIn(forbidden,encoded)

    def test_exact_design_grammar_bounds_and_unchanged_g31_source_pin(self):
        root=M.ROOT
        proposal=json.loads((root/'reports/phase2-li-layout-localization-design-v1/proposal.json').read_bytes())
        self.assertEqual(M.GRAMMAR, {k:{x:v for x,v in spec.items() if x in ('attributes','children','required')}
                                   for k,spec in proposal['worksheet_profile']['grammar'].items()})
        self.assertEqual(M.BOUNDS,{k:v for k,v in proposal['bounds'].items() if type(v) is int})
        self.assertEqual(hashlib.sha256((root/'scripts/li_v3_growth_envelope.py').read_bytes()).hexdigest(),
                         'f50069d028526ea045441a2e574a26192a210ff78ba34f5170777d32f5692ec3')
        self.assertIsNone(M.PRODUCTION_BINDING)
        self.assertFalse(hasattr(M,'production_context'))


if __name__ == '__main__':
    unittest.main()
