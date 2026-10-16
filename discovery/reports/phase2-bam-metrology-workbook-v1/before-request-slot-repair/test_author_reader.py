"""Synthetic fixtures only; no actual source workbook or network."""
import io
import socket
import unittest
from unittest.mock import patch
import zipfile
import workbook_reader as reader

M, R, O, C = reader.MAIN, reader.REL, reader.OFFICE, reader.CT

def archive(parts):
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, value in parts.items():
            z.writestr(name, value)
    return stream.getvalue()

def parts(cells='<c r="A1" t="inlineStr"><is><t>Rm</t></is></c><c r="B1"><v>42</v></c>'):
    return {
        '[Content_Types].xml': f'<Types xmlns="{C}"><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
        '_rels/.rels': f'<Relationships xmlns="{R}"><Relationship Id="r1" Type="{O}/officeDocument" Target="xl/workbook.xml"/></Relationships>',
        'xl/workbook.xml': f'<workbook xmlns="{M}" xmlns:r="{O}"><sheets><sheet name="Synthetic" sheetId="1" r:id="r1"/></sheets></workbook>',
        'xl/_rels/workbook.xml.rels': f'<Relationships xmlns="{R}"><Relationship Id="r1" Type="{O}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
        'xl/worksheets/sheet1.xml': f'<worksheet xmlns="{M}"><sheetData><row r="1">{cells}</row></sheetData><mergeCells><mergeCell ref="A2:B2"/></mergeCells></worksheet>',
    }

class AuthorReaderTests(unittest.TestCase):
    def inspect(self, data):
        exposure = reader.fresh_exposure()
        with patch.object(socket, 'socket', side_effect=AssertionError('network prohibited')):
            summary, result = reader.inspect_workbook(data, exposure)
        return summary, result, exposure

    def test_literals_and_merges_are_preserved_without_fill(self):
        summary, result, exp = self.inspect(archive(parts()))
        self.assertEqual(summary['cells'], 2)
        self.assertEqual(result['sheets'][0]['cells'][1]['resolved_text_or_raw_number'], '42')
        self.assertFalse(result['sheets'][0]['cells'][1]['numeric_or_date_conversion'])
        self.assertEqual(result['sheets'][0]['merged_ranges'], ['A2:B2'])
        self.assertEqual(exp['xml_parses_started'], exp['xml_parses_completed'])

    def test_formula_cache_is_unverified_not_executed(self):
        cells='<c r="A1"><f>1+1</f><v>99</v></c>'
        summary, result, _ = self.inspect(archive(parts(cells)))
        cell=result['sheets'][0]['cells'][0]
        self.assertEqual(summary['formula_cells'],1)
        self.assertEqual(cell['formula']['text'],'1+1')
        self.assertEqual(cell['raw_v'],'99')
        self.assertEqual(cell['value_role'],'STORED_UNVERIFIED_FORMULA_CACHE')
        self.assertFalse(cell['formula']['executed'])

    def test_external_hyperlink_is_retained_without_fetch(self):
        p=parts();p['xl/worksheets/_rels/sheet1.xml.rels']=f'<Relationships xmlns="{R}"><Relationship Id="web" Type="{O}/hyperlink" Target="https://example.invalid/canary" TargetMode="External"/></Relationships>'
        summary,result,_=self.inspect(archive(p))
        self.assertEqual(summary['external_relationships_seen_in_parsed_parts'],1)
        self.assertFalse(result['external_relationships'][0]['followed'])

    def test_shared_strings_styles_and_comments(self):
        p=parts('<c r="A1" t="s" s="0"><v>0</v></c>')
        p['xl/_rels/workbook.xml.rels']=f'<Relationships xmlns="{R}"><Relationship Id="r1" Type="{O}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="s" Type="{O}/sharedStrings" Target="sharedStrings.xml"/><Relationship Id="f" Type="{O}/styles" Target="styles.xml"/></Relationships>'
        p['xl/sharedStrings.xml']=f'<sst xmlns="{M}"><si><r><t>U</t></r><r><t> (%)</t></r></si></sst>'
        p['xl/styles.xml']=f'<styleSheet xmlns="{M}"><numFmts><numFmt numFmtId="164" formatCode="0.0%"/></numFmts><cellXfs><xf numFmtId="164"/></cellXfs></styleSheet>'
        p['xl/worksheets/_rels/sheet1.xml.rels']=f'<Relationships xmlns="{R}"><Relationship Id="c" Type="{O}/comments" Target="../comments1.xml"/></Relationships>'
        p['xl/comments1.xml']=f'<comments xmlns="{M}"><authors><author>PRIVATE CONTACT CANARY</author></authors><commentList><comment ref="A1" authorId="0"><text><t>synthetic note</t></text></comment></commentList></comments>'
        _,result,_=self.inspect(archive(p))
        self.assertEqual(result['sheets'][0]['cells'][0]['resolved_text_or_raw_number'],'U (%)')
        self.assertEqual(result['custom_number_formats']['164'],'0.0%')
        self.assertEqual(result['sheets'][0]['comments'][0]['text'],'synthetic note')
        self.assertNotIn('PRIVATE CONTACT CANARY',str(result))

    def test_doctype_entity_blocks_before_parser(self):
        p=parts();p['xl/worksheets/sheet1.xml']='<!DOCTYPE worksheet [<!ENTITY x SYSTEM "https://example.invalid/private">]>'+p['xl/worksheets/sheet1.xml']
        exp=reader.fresh_exposure()
        with self.assertRaisesRegex(reader.Blocked,'XML_DECLARATION_FORBIDDEN'):
            reader.inspect_workbook(archive(p),exp)
        self.assertGreater(exp['xml_decodes_completed'],exp['xml_parses_completed'])

    def test_utf16_does_not_bypass_declaration_guard(self):
        p=parts();p['xl/worksheets/sheet1.xml']=p['xl/worksheets/sheet1.xml'].encode('utf-16')
        with self.assertRaises(UnicodeDecodeError):self.inspect(archive(p))

    def test_macro_member_and_content_type_block(self):
        p=parts();p['xl/vbaProject.bin']=b'opaque'
        with self.assertRaisesRegex(reader.Blocked,'ACTIVE_CONTENT'):self.inspect(archive(p))
        p=parts();p['[Content_Types].xml']=p['[Content_Types].xml'].replace('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml','application/vnd.ms-excel.sheet.macroEnabled.main+xml')
        with self.assertRaisesRegex(reader.Blocked,'ACTIVE_CONTENT'):self.inspect(archive(p))

    def test_member_expansion_bound_prevents_xml_open(self):
        p=parts();p['opaque.xml']=b'X'*(reader.MAX_PART+1)
        exp=reader.fresh_exposure()
        with self.assertRaisesRegex(reader.Blocked,'MEMBER_SIZE'):reader.inspect_workbook(archive(p),exp)
        self.assertEqual(exp['xml_part_reads_started'],0)

    def test_unknown_shared_string_and_duplicate_cell_block(self):
        with self.assertRaisesRegex(reader.Blocked,'SHARED_STRING_INDEX'):self.inspect(archive(parts('<c r="A1" t="s"><v>0</v></c>')))
        with self.assertRaisesRegex(reader.Blocked,'CELL_REFERENCE'):self.inspect(archive(parts('<c r="A1"/><c r="A1"/>')))

    def test_outside_relationship_and_truncated_xml_block(self):
        p=parts();p['xl/_rels/workbook.xml.rels']=p['xl/_rels/workbook.xml.rels'].replace('worksheets/sheet1.xml','../../outside.xml')
        with self.assertRaisesRegex(reader.Blocked,'RELATIONSHIP_TARGET'):self.inspect(archive(p))
        p=parts();p['xl/worksheets/sheet1.xml']=p['xl/worksheets/sheet1.xml'][:-3]
        with self.assertRaises(reader.ET.ParseError):self.inspect(archive(p))

    def test_deep_xml_blocks(self):
        p=parts();p['xl/worksheets/sheet1.xml']=f'<worksheet xmlns="{M}">'+'<x>'*65+'</x>'*65+'</worksheet>'
        with self.assertRaisesRegex(reader.Blocked,'XML_COMPLEXITY'):self.inspect(archive(p))

if __name__ == '__main__':
    unittest.main(verbosity=2)
