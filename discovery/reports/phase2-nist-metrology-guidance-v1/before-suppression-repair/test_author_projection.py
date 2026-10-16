"""Synthetic HTML behavior only; no official page or external request."""
import unittest,socket
from unittest.mock import patch
import html_projection as reader

class ProjectionTests(unittest.TestCase):
    def project(self,raw):
        with patch.object(socket,'socket',side_effect=AssertionError('no network')):
            return reader.project(raw)
    def test_static_text_and_entity_normalization(self):
        j=self.project(b'<html><head><title>NIST &amp; test</title></head><body><h1>Section 5</h1><p>Combined <strong>standard</strong> uncertainty&nbsp; u.</p></body></html>')
        self.assertEqual(j['title'],'NIST & test')
        self.assertEqual([b['text'] for b in j['blocks']],['Section 5','Combined standard uncertainty u.'])
        self.assertTrue(j['text_whitespace_normalized'])
    def test_active_or_image_content_never_becomes_text(self):
        j=self.project(b'<p>before<script>evil()</script><style>secret</style><template>hidden</template><svg><text>drawing</text></svg><noscript>other</noscript><img src="https://example.invalid/equation" alt="opaque formula">after</p>')
        self.assertEqual([b['text'] for b in j['blocks']],['beforeafter'])
    def test_no_external_resolution_or_instruction_execution(self):
        j=self.project(b'<!DOCTYPE html SYSTEM "https://example.invalid/private"><p>&notarealentity; ordinary documentary text</p>')
        self.assertIn('ordinary documentary text',j['blocks'][0]['text'])
    def test_fixed_size_type_and_encoding_rejections(self):
        for raw in [b'',b'x'*(reader.MAX_BYTES+1),'not bytes']:
            with self.assertRaisesRegex(reader.Blocked,'BODY_SIZE'):self.project(raw)
        with self.assertRaises(UnicodeDecodeError):self.project(b'<p>\xff</p>')
        with self.assertRaisesRegex(reader.Blocked,'TEXT_ENCODING'):self.project('<p>text</p>'.encode('utf-16le'))
    def test_finite_parser_limits(self):
        with patch.object(reader,'MAX_TAGS',2):
            with self.assertRaisesRegex(reader.Blocked,'HTML_COMPLEXITY'):self.project(b'<a><b><c>x</c></b></a>')
        with patch.object(reader,'MAX_DEPTH',2):
            with self.assertRaisesRegex(reader.Blocked,'HTML_COMPLEXITY'):self.project(b'<a><b><c>x</c></b></a>')
        with patch.object(reader,'MAX_BLOCKS',1):
            with self.assertRaisesRegex(reader.Blocked,'HTML_BLOCK_LIMIT'):self.project(b'<p>a</p><p>b</p>')
    def test_incomplete_markup_has_explicit_static_projection_only(self):
        j=self.project(b'<div><p>public guidance')
        self.assertEqual(j['blocks'][0]['text'],'public guidance')
        self.assertIn('Static text blocks only',j['scope'])

if __name__=='__main__':unittest.main(verbosity=2)
