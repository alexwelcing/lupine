"""Synthetic regressions for independently discovered pre-acquisition gaps."""
import unittest
from test_author_reader import archive, parts, M, C
import workbook_reader as reader

class ReaderRepairTests(unittest.TestCase):
    def test_nul_separated_utf16_with_entity_never_reaches_part_parser(self):
        for declaration in ('', '<!DOCTYPE worksheet [<!ENTITY x "fixture">]>'):
            p=parts();p['xl/worksheets/sheet1.xml']=(declaration+p['xl/worksheets/sheet1.xml']).encode('utf-16le')
            exposure=reader.fresh_exposure()
            with self.assertRaisesRegex(reader.Blocked,'XML_NUL_ENCODING'):reader.inspect_workbook(archive(p),exposure)
            self.assertEqual(exposure['xml_parses_started'],4)
            self.assertEqual(exposure['xml_decodes_completed'],5)

    def test_neutral_ole_or_embedded_package_content_type_blocks(self):
        for content in ('application/vnd.openxmlformats-officedocument.oleObject','application/vnd.openxmlformats-officedocument.package'):
            p=parts();p['neutral.bin']=b'opaque';p['[Content_Types].xml']=p['[Content_Types].xml'].replace('</Types>',f'<Override PartName="/neutral.bin" ContentType="{content}"/></Types>')
            with self.assertRaisesRegex(reader.Blocked,'ACTIVE_CONTENT'):reader.inspect_workbook(archive(p),reader.fresh_exposure())

    def test_ambiguous_text_or_scalar_layout_is_not_silently_projected(self):
        cases=[('<c r="A1" t="inlineStr"><is><t>a</t><t>b</t></is></c>','RICH_TEXT_LAYOUT'),
               ('<c r="A1" t="inlineStr"><is><r><t>a</t><t>b</t></r></is></c>','RICH_TEXT_LAYOUT'),
               ('<c r="A1" t="inlineStr"><is><t>a<x>b</x></t></is></c>','RICH_TEXT_LAYOUT'),
               ('<c r="A1"><v>4</v><is><t>hidden</t></is></c>','CELL_COMPONENT_LAYOUT'),
               ('<c r="A1"><v>4<x>5</x></v></c>','CELL_COMPONENT_LAYOUT'),
               ('<c r="A1"><f>SUM(<x>A1</x>)</f></c>','CELL_COMPONENT_LAYOUT')]
        for text,code in cases:
            with self.subTest(code=code,text=text):
                with self.assertRaisesRegex(reader.Blocked,code):reader.inspect_workbook(archive(parts(text)),reader.fresh_exposure())

if __name__=='__main__':unittest.main(verbosity=2)
