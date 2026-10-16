"""Independent synthetic-only tests. Never acquires or opens the BAM workbook."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import stat
import struct
import unittest
from unittest import mock
import warnings
import zipfile

HERE = Path(__file__).resolve().parent
SOURCE = Path(os.environ.get('BAM_READER_PATH', str(HERE / 'initial-source/workbook_reader.py')))
spec = importlib.util.spec_from_file_location('independent_bam_reader', SOURCE)
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)
M, R, O, C = reader.MAIN, reader.REL, reader.OFFICE, reader.CT

def rels(entries):
    return '<Relationships xmlns="%s">%s</Relationships>' % (R, ''.join('<Relationship Id="%s" Type="%s" Target="%s"%s/>' % (rid, O + '/' + kind, target, (' TargetMode="%s"' % mode) if mode else '') for rid,kind,target,mode in entries))

def parts(cells='<c r="A1"><v>7</v></c>', *, extras=None):
    result = {
        '[Content_Types].xml': '<Types xmlns="%s"><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>' % C,
        '_rels/.rels': rels([('root','officeDocument','xl/workbook.xml',None)]),
        'xl/workbook.xml': '<workbook xmlns="%s" xmlns:r="%s"><sheets><sheet name="SYNTHETIC_SHEET_CANARY" sheetId="1" state="hidden" r:id="r1"/></sheets></workbook>' % (M,O),
        'xl/_rels/workbook.xml.rels': rels([('r1','worksheet','worksheets/sheet1.xml',None)]),
        'xl/worksheets/sheet1.xml': '<worksheet xmlns="%s"><sheetData><row r="1">%s</row></sheetData><mergeCells><mergeCell ref="A1:B1"/></mergeCells></worksheet>' % (M,cells),
    }
    if extras:
        result.update(extras)
    return result

def archive(mapping, extra_entries=()):
    stream=io.BytesIO()
    with warnings.catch_warnings():
        warnings.simplefilter('ignore', UserWarning)
        with zipfile.ZipFile(stream,'w',compression=zipfile.ZIP_DEFLATED) as z:
            for name,value in list(mapping.items()) + list(extra_entries):
                z.writestr(name, value.encode('utf-8') if isinstance(value,str) else value)
    return stream.getvalue()

class IndependentReaderTests(unittest.TestCase):
    def inspect(self, mapping, exposure=None):
        return reader.inspect_workbook(archive(mapping), exposure or reader.fresh_exposure())

    def blocked(self, mapping, code=None):
        with self.assertRaises(reader.Blocked) as caught:
            self.inspect(mapping)
        if code:
            self.assertEqual(str(caught.exception),code)

    def test_positive_formula_cache_shared_inline_hidden_merge_comment_external(self):
        cells='<c r="A1" t="s"><v>0</v></c><c r="B1" t="inlineStr"><is><r><t>INLINE_</t></r><r><t>CANARY</t></r></is></c><c r="C1" s="0"><f t="shared" si="0">1+SYNTHETIC_FORMULA_CANARY</f><v>123</v></c><c r="D1"/>'
        p=parts(cells)
        p['xl/_rels/workbook.xml.rels']=rels([('r1','worksheet','worksheets/sheet1.xml',None),('ss','sharedStrings','sharedStrings.xml',None),('style','styles','styles.xml',None),('ext','externalLink','https://invalid.example/EXTERNAL_CANARY','External')])
        p['xl/sharedStrings.xml']='<sst xmlns="%s"><si><t>SHARED_CANARY</t></si></sst>' % M
        p['xl/styles.xml']='<styleSheet xmlns="%s"><numFmts><numFmt numFmtId="164" formatCode="0.00"/></numFmts><cellXfs><xf numFmtId="164"/></cellXfs></styleSheet>' % M
        p['xl/worksheets/_rels/sheet1.xml.rels']=rels([('comment','comments','../comments1.xml',None)])
        p['xl/comments1.xml']='<comments xmlns="%s"><authors><author>CONTACT_CANARY</author></authors><commentList><comment ref="A1" authorId="0"><text><t>COMMENT_CANARY</t></text></comment></commentList></comments>' % M
        exposure=reader.fresh_exposure()
        summary,projection=self.inspect(p,exposure)
        self.assertEqual(summary['cells'],4)
        self.assertEqual(summary['formula_cells'],1)
        self.assertEqual(summary['external_relationships_followed'],0)
        self.assertFalse(summary['blind_predictive_benchmark_eligible'])
        self.assertNotIn('CANARY',json.dumps(summary))
        self.assertNotIn('CONTACT_CANARY',json.dumps(projection))
        sheet=projection['sheets'][0]
        self.assertEqual(sheet['state'],'hidden')
        self.assertEqual(sheet['merged_ranges'],['A1:B1'])
        self.assertEqual(sheet['cells'][0]['resolved_text_or_raw_number'],'SHARED_CANARY')
        self.assertEqual(sheet['cells'][1]['resolved_text_or_raw_number'],'INLINE_CANARY')
        self.assertEqual(sheet['cells'][2]['raw_v'],'123')
        self.assertEqual(sheet['cells'][2]['formula']['attributes'],{'t':'shared','si':'0'})
        self.assertEqual(sheet['cells'][2]['value_role'],'STORED_UNVERIFIED_FORMULA_CACHE')
        self.assertFalse(sheet['cells'][2]['formula']['executed'])
        self.assertIsNone(sheet['cells'][3]['raw_v'])
        self.assertEqual(exposure['xml_parses_completed'],8)

    def test_optional_utf8_bom(self):
        p=parts(); p['xl/workbook.xml']=b'\xef\xbb\xbf'+p['xl/workbook.xml'].encode()
        self.assertEqual(self.inspect(p)[0]['sheets'],1)

    def test_utf16le_without_bom_is_rejected_before_parser(self):
        p=parts(); p['[Content_Types].xml']=p['[Content_Types].xml'].encode('utf-16le')
        exposure=reader.fresh_exposure()
        with self.assertRaises(Exception):
            self.inspect(p,exposure)
        self.assertEqual(exposure['xml_parses_started'],0)

    def test_utf16le_doctype_entity_without_bom_rejected_before_parser(self):
        p=parts(); p['[Content_Types].xml']=('<!DOCTYPE Types [<!ENTITY x "UTF16_ENTITY_CANARY">]>'+p['[Content_Types].xml']).encode('utf-16le')
        exposure=reader.fresh_exposure()
        with self.assertRaises(Exception):
            self.inspect(p,exposure)
        self.assertEqual(exposure['xml_parses_started'],0)

    def test_utf16_with_bom_rejects_decode(self):
        p=parts(); p['[Content_Types].xml']=p['[Content_Types].xml'].encode('utf-16')
        with self.assertRaises(UnicodeDecodeError): self.inspect(p)

    def test_declared_non_utf8(self):
        p=parts(); p['[Content_Types].xml']='<?xml version="1.0" encoding="iso-8859-1"?>'+p['[Content_Types].xml']
        self.blocked(p,'XML_ENCODING_DECLARATION')

    def test_doctype_rejected_before_parse(self):
        p=parts(); p['[Content_Types].xml']='<!DOCTYPE Types [<!ENTITY x "ENTITY_CANARY">]>'+p['[Content_Types].xml']
        exposure=reader.fresh_exposure()
        with self.assertRaises(reader.Blocked): self.inspect(p,exposure)
        self.assertEqual(exposure['xml_parses_started'],0)
        self.assertEqual(exposure['xml_decodes_completed'],1)

    def test_bad_xml_honest_parse_exposure(self):
        p=parts(); p['[Content_Types].xml']='<'
        exposure=reader.fresh_exposure()
        with self.assertRaises(Exception): self.inspect(p,exposure)
        self.assertEqual(exposure['xml_parses_started'],1)
        self.assertEqual(exposure['xml_parses_completed'],0)

    def test_xml_depth_bound(self):
        p=parts(); p['[Content_Types].xml']='<Types xmlns="%s">%s%s</Types>' % (C,'<x>'*64,'</x>'*64)
        self.blocked(p,'XML_COMPLEXITY')

    def test_xml_node_bound(self):
        with mock.patch.object(reader,'MAX_NODES',4): self.blocked(parts(),'XML_COMPLEXITY')

    def test_part_uncompressed_bound(self):
        p=parts();p['unread.txt']=b'x'*(reader.MAX_PART+1)
        self.blocked(p,'MEMBER_SIZE')

    def test_total_uncompressed_bound(self):
        p=parts();p.update({'unread%d.txt'%i:b'x'*reader.MAX_PART for i in range(4)})
        self.blocked(p,'TOTAL_MEMBER_SIZE')

    def test_archive_size(self):
        for raw in (b'',b'x'*(reader.MAX_ARCHIVE+1),'not bytes'):
            with self.subTest(kind=type(raw).__name__),self.assertRaises(reader.Blocked): reader.inspect_workbook(raw,reader.fresh_exposure())

    def test_duplicate_member(self):
        with self.assertRaisesRegex(reader.Blocked,'DUPLICATE_MEMBER'): reader.inspect_workbook(archive(parts(),[('xl/workbook.xml','duplicate')]),reader.fresh_exposure())

    def test_member_count(self):
        p=parts();p.update({'extra%d'%i:'' for i in range(124)})
        self.blocked(p,'MEMBER_COUNT')

    def test_member_names(self):
        for name in ('../evil','a/../evil','/absolute','a//b','a\\b','a/./b'):
            with self.subTest(name=name): self.blocked(parts(extras={name:''}),'MEMBER_NAME')

    def test_symlink(self):
        z=zipfile.ZipInfo('symlink');z.create_system=3;z.external_attr=(stat.S_IFLNK|0o777)<<16
        with self.assertRaisesRegex(reader.Blocked,'MEMBER_KIND'): reader.inspect_workbook(archive(parts(),[(z,'target')]),reader.fresh_exposure())

    def test_encryption_flag(self):
        raw=bytearray(archive(parts()));start=raw.index(b'PK\x01\x02');flag=struct.unpack_from('<H',raw,start+8)[0];struct.pack_into('<H',raw,start+8,flag|1)
        with self.assertRaisesRegex(reader.Blocked,'ENCRYPTED_MEMBER'): reader.inspect_workbook(bytes(raw),reader.fresh_exposure())

    def test_unsupported_compression(self):
        raw=bytearray(archive(parts()));start=raw.index(b'PK\x01\x02');struct.pack_into('<H',raw,start+10,12)
        with self.assertRaisesRegex(reader.Blocked,'COMPRESSION_METHOD'): reader.inspect_workbook(bytes(raw),reader.fresh_exposure())

    def test_crc_mismatch(self):
        raw=bytearray(archive(parts()));start=raw.index(b'PK\x01\x02');struct.pack_into('<I',raw,start+16,0)
        with self.assertRaises(zipfile.BadZipFile): reader.inspect_workbook(bytes(raw),reader.fresh_exposure())

    def test_active_member_names(self):
        for name in ('xl/vbaProject.bin','xl/macrosheets/s1.xml','xl/activeX/a.xml','xl/embeddings/a.bin'):
            with self.subTest(name=name): self.blocked(parts(extras={name:''}),'ACTIVE_CONTENT')

    def test_active_content_type(self):
        p=parts();p['[Content_Types].xml']=p['[Content_Types].xml'].replace('spreadsheetml.sheet.main+xml','spreadsheetml.sheet.macroEnabled.main+xml')
        self.blocked(p,'ACTIVE_CONTENT')

    def test_embedding_content_type_even_under_neutral_name(self):
        p=parts();p['[Content_Types].xml']=p['[Content_Types].xml'].replace('</Types>','<Override PartName="/xl/neutral.bin" ContentType="application/vnd.openxmlformats-officedocument.oleObject"/></Types>');p['xl/neutral.bin']=b'not executed'
        self.blocked(p,'ACTIVE_CONTENT')

    def test_internal_relationship_traversal(self):
        p=parts();p['xl/_rels/workbook.xml.rels']=rels([('r1','worksheet','../../outside',None)])
        self.blocked(p,'RELATIONSHIP_TARGET')

    def test_duplicate_relationship_identity(self):
        p=parts();p['xl/_rels/workbook.xml.rels']=rels([('r1','worksheet','worksheets/sheet1.xml',None)]*2)
        self.blocked(p,'RELATIONSHIP_IDENTITY')

    def test_external_worksheet_not_followed(self):
        p=parts();p['xl/_rels/workbook.xml.rels']=rels([('r1','worksheet','https://invalid.example/WORKSHEET','External')])
        self.blocked(p,'WORKSHEET_RELATIONSHIP')

    def test_shared_string_bounds(self):
        self.blocked(parts('<c r="A1" t="s"><v>0</v></c>'),'SHARED_STRING_INDEX')

    def test_duplicate_cell_components(self):
        for fragment in ('<v>1</v><v>2</v>','<f>A1</f><f>A2</f>','<is/><is/>'):
            with self.subTest(fragment=fragment): self.blocked(parts('<c r="A1">'+fragment+'</c>'),'DUPLICATE_CELL_COMPONENT')

    def test_duplicate_reference(self):
        self.blocked(parts('<c r="A1"/><c r="A1"/>'),'CELL_REFERENCE')

    def test_inline_value_conflict(self):
        self.blocked(parts('<c r="A1" t="inlineStr"><is><t>x</t></is><v>2</v></c>'),'INLINE_STRING_LAYOUT')

    def test_mixed_rich_text(self):
        self.blocked(parts('<c r="A1" t="inlineStr"><is><t>x</t><r><t>y</t></r></is></c>'),'MIXED_RICH_TEXT_LAYOUT')

    def test_unknown_cell_type_and_style(self):
        self.blocked(parts('<c r="A1" t="unknown"/>'),'CELL_TYPE')
        self.blocked(parts('<c r="A1" s="0"/>'),'CELL_STYLE_INDEX')

    def test_formula_size_bound(self):
        self.blocked(parts('<c r="A1"><f>'+('x'*(reader.MAX_TEXT+1))+'</f></c>'),'FORMULA_TEXT_LIMIT')

    def test_wrong_namespace_rejected(self):
        p=parts();p['xl/workbook.xml']=p['xl/workbook.xml'].replace(M,'urn:not-transitional')
        self.blocked(p,'XML_ROOT')

if __name__=='__main__':
    unittest.main(verbosity=2)
