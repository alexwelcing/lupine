"""Synthetic HTML only; no guidance source or network access."""
import importlib.util
import json
import os
from pathlib import Path
import unittest
from unittest import mock

HERE=Path(__file__).resolve().parent
SOURCE=Path(os.environ.get('NIST_PARSER_PATH',str(HERE/'initial-source/html_projection.py')))
spec=importlib.util.spec_from_file_location('nist_synthetic_parser',SOURCE)
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)

class IndependentParserTests(unittest.TestCase):
    def test_title_blocks_entities_lines_and_no_link_following(self):
        result=p.project(b'<title> Synthetic &amp; title </title>\n<h1>Heading</h1>\n<p> A <a href="https://invalid.example/NO_FETCH">link</a> &lt; text. </p>')
        self.assertEqual(result['title'],'Synthetic & title')
        self.assertEqual([b['text'] for b in result['blocks']],['Heading','A link < text.'])
        self.assertEqual([b['line'] for b in result['blocks']],[2,3])
        self.assertNotIn('invalid.example',json.dumps(result))
    def test_skipped_containers_exclude_canaries(self):
        for tag in ('script','style','noscript','svg','template'):
            with self.subTest(tag=tag):
                out=p.project(('<p>before</p><'+tag+'><p>HIDDEN_CANARY</p></'+tag+'><p>after</p>').encode())
                self.assertNotIn('HIDDEN_CANARY',json.dumps(out))
                self.assertEqual([b['text'] for b in out['blocks']],['before','after'])
    def test_malformed_parent_close_cannot_escape_skipped_container(self):
        for tag in ('template','noscript','svg'):
            with self.subTest(tag=tag):
                raw=('<div><'+tag+'></div><p>HIDDEN_CANARY</p></'+tag+'><p>after</p>').encode()
                try:out=p.project(raw)
                except p.Blocked:continue
                self.assertNotIn('HIDDEN_CANARY',json.dumps(out))
    def test_nested_skip_containers(self):
        out=p.project(b'<p>before<template><svg><text>CANARY</text></svg></template>after</p>')
        self.assertEqual([b['text'] for b in out['blocks']],['beforeafter'])
    def test_images_do_not_invent_equations_from_alt_or_url(self):
        out=p.project(b'<p>Equation <img src="https://invalid.example/EQUATION_CANARY" alt="ALT_EQUATION_CANARY"> omitted.</p>')
        self.assertNotIn('CANARY',json.dumps(out));self.assertIn('equations carried only by images may be absent',out['scope'])
    def test_unclosed_html_is_static_recovery_not_validation(self):
        out=p.project(b'<div><p>unfinished')
        self.assertEqual([b['text'] for b in out['blocks']],['unfinished'])
    def test_utf8_bom_and_unicode(self):
        self.assertEqual(p.project(b'\xef\xbb\xbf<p>\xce\xbc</p>')['blocks'][0]['text'],'μ')
    def test_utf8_decode_failure(self):
        with self.assertRaises(UnicodeDecodeError):p.project(b'<p>\xff</p>')
    def test_utf16_nul_before_html_parser(self):
        with mock.patch.object(p,'Projection') as parser,self.assertRaises(p.Blocked):p.project('<p>x</p>'.encode('utf-16le'))
        parser.assert_not_called()
    def test_type_and_size_before_parser(self):
        for raw in ('not bytes',b'',b'x'*(p.MAX_BYTES+1)):
            with self.subTest(kind=type(raw).__name__),mock.patch.object(p,'Projection') as parser,self.assertRaises(p.Blocked):p.project(raw)
            parser.assert_not_called()
    def test_tag_limit(self):
        with mock.patch.object(p,'MAX_TAGS',2),self.assertRaisesRegex(p.Blocked,'HTML_COMPLEXITY'):p.project(b'<br><br><br>')
    def test_depth_limit(self):
        with mock.patch.object(p,'MAX_DEPTH',2),self.assertRaisesRegex(p.Blocked,'HTML_COMPLEXITY'):p.project(b'<div><div><p>x</p></div></div>')
    def test_block_limit(self):
        with mock.patch.object(p,'MAX_BLOCKS',1),self.assertRaisesRegex(p.Blocked,'HTML_BLOCK_LIMIT'):p.project(b'<p>x</p><p>y</p>')
    def test_unknown_entities_not_externally_resolved(self):
        out=p.project(b'<!DOCTYPE html SYSTEM "https://invalid.example/DTD_CANARY"><p>&unknown;</p>')
        self.assertEqual(out['blocks'][0]['text'],'&unknown;');self.assertNotIn('DTD_CANARY',json.dumps(out))

if __name__=='__main__':unittest.main(verbosity=2)
