"""Source-free synthetic checks for the supplemental formula-only boundary."""
import copy
import hashlib
import importlib.util
from io import StringIO
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('formula_tokens_test', ROOT/'scripts/mpea_formula_tokens.py')
formula = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(formula)


def blob(raw):
    return {'bytes':len(raw),'md5':hashlib.md5(raw).hexdigest(),'sha256':hashlib.sha256(raw).hexdigest()}


def csv_cell(raw):
    return b'"'+raw.replace(b'"',b'""')+b'"' if any(c in raw for c in (b',',b'"',b'\n',b'\r')) else raw


def fixture(tokens, substitutions=None):
    mapping=json.loads((formula.ROOT/'docs/mpea-column-mapping-v1.json').read_text())
    rows=[[c['token'].encode() for c in mapping['columns']]]
    for token in tokens:
        row=[b'opaque' for _ in range(23)]
        row[1]=token
        for index,value in (substitutions or {}).items():
            row[index]=value
        rows.append(row)
    return b'\n'.join(b','.join(csv_cell(c) for c in row) for row in rows)+b'\n'


def inspect(raw):
    return formula.inspect_fixture(raw, expected_blob=blob(raw))


def reseal(report):
    report['content_sha256']=formula.sha256(formula.canonical_bytes({k:v for k,v in report.items() if k!='content_sha256'}))
    return report


class FormulaTokenTests(unittest.TestCase):
    def test_exact_new_grammar_and_all_modern_symbols(self):
        accepted=[b'Al1 Co0.5 Cr1 Fe1 Ni1',b'Fe1',b'Ni1 Fe1',b'Fe1 Fe2',b'Fe000.010',b'C01']
        for token in accepted:
            self.assertTrue(formula.recognizes_formula(token),token)
        self.assertEqual(len(formula.ELEMENTS),118)
        for symbol in formula.ELEMENTS:
            self.assertTrue(formula.recognizes_formula(symbol+b'1'))
        rejected=[b'FeNi',b'Fe1Ni1',b'Fe Ni',b'Fe1 Ni',b' Fe1',b'Fe1 ',b'Fe1  Ni1',
                  b'Fe1\tNi1',b'Fe1\nNi1',b'Fe1\xc2\xa0Ni1',b'fe1',b'Xx1',b'Fe0',b'Fe0.000',
                  b'Fe-1',b'Fe+1',b'Fe.5',b'Fe1.',b'Fe1e-3',b'(Fe1)',b'Fe1\x00',b'\xff1']
        for token in rejected:
            self.assertFalse(formula.recognizes_formula(token),token)

    def test_missing_marker_precedence_and_no_type_coercion(self):
        for token in [*formula.MARKERS,b' \t\r\n\v\f',b'   ',b'NaN']:
            self.assertFalse(formula.recognizes_formula(token))
        for value in ('Fe1',None,True,bytearray(b'Fe1'),1):
            self.assertFalse(formula.recognizes_formula(value))
        self.assertFalse(formula.recognizes_formula(b'Fe'+b'1'*16384))

    def test_all_rows_exact_token_groups_no_composition_equivalence(self):
        tokens=[b'Fe1 Ni1',b'Ni1 Fe1',b'Fe1.0 Ni1',b'Fe1 Ni1',b'FeNi',b'',b'NaN',b'Fe1 Fe2']
        raw=fixture(tokens)
        report=inspect(raw)
        self.assertEqual(report['row_count'],len(tokens))
        self.assertEqual([r['formula']['value'] for r in report['rows']],[0,1,2,0,None,None,None,3])
        self.assertEqual([r['record_id'] for r in report['rows']],[blob(raw)['sha256']+':'+str(i) for i in range(len(tokens))])
        self.assertEqual(report['reference']['original_formula_recognized_rows'],0)
        self.assertEqual(report['reference']['original_metadata_rows'],1545)
        encoded=formula.canonical_bytes(report)
        for token in (b'Fe1 Ni1',b'Fe1.0',b'Ni1 Fe1'):
            self.assertNotIn(token,encoded)
        self.assertTrue(formula.validate_public_report(report))

    def test_all_other_observation_cells_remain_none_and_helpers_unused(self):
        helper=formula.load_helpers()
        scanner=helper.load_scanner()
        original=scanner._frame
        calls=[]
        def frame(raw,mapping):
            self.assertEqual([r.index for r in mapping.columns],[1])
            records=original(raw,mapping)
            calls.append(records)
            self.assertTrue(all(cell is None for row in records for i,cell in enumerate(row) if i!=1))
            return records
        with patch.object(formula,'load_helpers',return_value=helper),patch.object(helper,'load_scanner',return_value=scanner),\
                patch.object(scanner,'_frame',side_effect=frame),\
                patch.object(scanner,'_temperature',side_effect=AssertionError('temperature processing forbidden')),\
                patch.object(scanner,'_identity_groups',side_effect=AssertionError('other grouping forbidden')),\
                patch.object(helper,'_inspect',side_effect=AssertionError('legacy extraction forbidden')),\
                patch.object(helper,'_groups',side_effect=AssertionError('legacy grouping forbidden')):
            inspect(fixture([b'Fe1 Ni1']))
        self.assertEqual(len(calls),1)

    def test_opaque_substitutions_leave_formula_results_invariant(self):
        tokens=[b'Fe1 Ni1',b'FeNi',b'Fe1 Ni1',b'Ni1 Fe1']
        expected=[r['formula'] for r in inspect(fixture(tokens))['rows']]
        for position in range(23):
            if position==1:
                continue
            for value in (b'',b'\xff\x00',b'a,"b\nopaque'):
                with self.subTest(position=position,value=value):
                    report=inspect(fixture(tokens,{position:value}))
                    self.assertEqual([r['formula'] for r in report['rows']],expected)
                    self.assertFalse(report['scope']['nonformula_observation_cells_accumulated'])

    def test_framing_caps_and_late_failure_never_publish_prefix(self):
        for raw in (fixture([b'Fe1'])+b'"unterminated',fixture([b'Fe1'])+b'\n',
                    fixture([b'Fe1'],{22:b'x'*16385})):
            report=inspect(raw)
            self.assertEqual(report['status'],'BLOCKED_ROWS')
            self.assertIsNone(report['rows'])
            self.assertIsNone(report['row_count'])
            self.assertTrue(report['scope']['observation_byte_framing_attempted'])
            self.assertFalse(report['scope']['all_observation_rows_framed'])
        self.assertEqual(inspect(fixture([]))['rows'],[])
        self.assertEqual(inspect(fixture([b'Fe1'])[:-1])['row_count'],1)

    def test_source_identity_conflict_never_frames(self):
        raw=fixture([b'Fe1'])
        expected=blob(raw); expected['md5']='0'*32
        helper=formula.load_helpers()
        scanner=helper.load_scanner()
        with patch.object(formula,'load_helpers',return_value=helper),patch.object(helper,'load_scanner',return_value=scanner),\
                patch.object(scanner,'_frame',side_effect=AssertionError('must not frame')):
            report=formula.inspect_fixture(raw,expected_blob=expected)
        self.assertEqual(report['status'],'BLOCKED_SOURCE')
        self.assertFalse(report['scope']['observation_byte_framing_attempted'])

    def test_known_real_source_rejected_before_loading_helpers(self):
        with patch.object(formula,'load_helpers',side_effect=AssertionError('must not load')):
            with self.assertRaisesRegex(formula.FormulaError,'REAL_SOURCE_FORBIDDEN'):
                formula.inspect_fixture(b'synthetic',expected_blob=formula.SOURCE_BLOB)
        raw=fixture([b'Fe1']); expected=blob(raw)
        with patch.object(formula,'sha256',return_value=formula.SOURCE_SHA256),\
                patch.object(formula,'load_helpers',side_effect=AssertionError('must not load')):
            with self.assertRaisesRegex(formula.FormulaError,'REAL_SOURCE_FORBIDDEN'):
                formula.inspect_fixture(raw,expected_blob=expected)

    def test_production_gate_fails_in_scratch_before_any_cache_read(self):
        original=formula._bounded_file
        calls=[]
        def read(path,*args):
            self.assertNotEqual(Path(path),formula.CACHE_PATH)
            calls.append(Path(path))
            return original(path,*args)
        with patch.object(formula,'_bounded_file',side_effect=read),\
                patch.object(formula,'__file__',str(formula.ROOT/'.cache/nonproduction/mpea_formula_tokens.py')):
            with self.assertRaisesRegex(formula.FormulaError,'FROZEN_SOURCE_REQUIRED'):
                formula.extract_cache()
        self.assertTrue(calls)

    def test_hash_checked_helper_and_public_reference_tampering_fails(self):
        original=formula._bounded_file
        for changed in (formula.HELPER_PATH,*formula.REFERENCE_PINS):
            def read(path,*args):
                result=original(path,*args)
                return result+b' ' if Path(path)==formula.ROOT/changed else result
            with self.subTest(changed=changed),patch.object(formula,'_bounded_file',side_effect=read):
                with self.assertRaises(formula.FormulaError):
                    inspect(fixture([b'Fe1']))

    def test_resealed_raw_channels_and_semantic_promotions_rejected(self):
        original=inspect(fixture([b'Fe1',b'Fe2']))
        changes=[lambda r:r['rows'][0].update(raw_formula='Fe1'),
                 lambda r:r['rows'][0]['formula'].update(value=True),
                 lambda r:r['rows'][0]['formula'].update(value=1),
                 lambda r:r['scope'].update(target_presence_checked=True),
                 lambda r:r['scope'].update(fits=False),
                 lambda r:r.update(row_count=True),
                 lambda r:r['reference'].update(original_formula_recognized_rows=1),
                 lambda r:r['profile'].update(legacy_grammar_union=True),
                 lambda r:r['rows'][0].update(record_id='other:0')]
        for change in changes:
            report=copy.deepcopy(original); change(report); reseal(report)
            with self.assertRaisesRegex(formula.FormulaError,'PUBLIC_SCHEMA_INVALID'):
                formula.validate_public_report(report)

    def test_publication_idempotent_conflict_symlink_and_failed_flush(self):
        report=inspect(fixture([b'Fe1']))
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory); target=root/'report.json'
            formula.write_public(report,target); before=target.read_bytes()
            formula.write_public(report,target); self.assertEqual(target.read_bytes(),before)
            other=inspect(fixture([b'Ni1']))
            with self.assertRaisesRegex(formula.FormulaError,'PUBLIC_OUTPUT_CONFLICT'):
                formula.write_public(other,target)
            linked=root/'linked'; linked.symlink_to(target)
            with self.assertRaises(formula.FormulaError):
                formula.write_public(report,linked)
            failed=root/'failed.json'
            with patch.object(formula.os,'fsync',side_effect=OSError('private message')):
                with self.assertRaisesRegex(formula.FormulaError,'PUBLIC_OUTPUT_CONFLICT'):
                    formula.write_public(report,failed)
            self.assertFalse(failed.exists())
            self.assertFalse(list(root.glob('.mpea-formula-*')))

    def test_cli_success_stays_unresolved_and_errors_are_sanitized(self):
        report=inspect(fixture([b'Fe1']))
        with tempfile.TemporaryDirectory() as directory,patch.object(formula,'extract_cache',return_value=report),\
                patch('sys.stdout',new_callable=StringIO) as stream:
            code=formula.main(['--output',str(Path(directory)/'result.json')])
            self.assertEqual(code,2)
            self.assertEqual(set(json.loads(stream.getvalue())),{'status','reason','receipt_sha256'})
        with patch.object(formula,'extract_cache',side_effect=ValueError('private raw formula!')),\
                patch('sys.stdout',new_callable=StringIO) as stream:
            self.assertEqual(formula.main(['--output','unused']),2)
            self.assertEqual(json.loads(stream.getvalue()),{'status':'BLOCKED','reason':'INTERNAL_FAILURE'})

    def test_changed_output_parent_cannot_delete_unrelated_file_during_cleanup(self):
        report=inspect(fixture([b'Fe1']))
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory); parent=root/'sink'; parent.mkdir()
            moved=root/'moved'; outside=root/'outside'; outside.mkdir()
            sentinels=[]
            def swap(_fd):
                temporary=next(parent.glob('.mpea-formula-*'))
                parent.rename(moved); parent.symlink_to(outside,target_is_directory=True)
                sentinel=outside/temporary.name; sentinel.write_text('preserve')
                sentinels.append(sentinel)
            with patch.object(formula.os,'fsync',side_effect=swap):
                with self.assertRaisesRegex(formula.FormulaError,'PUBLIC_OUTPUT_CONFLICT'):
                    formula.write_public(report,parent/'report.json')
            self.assertEqual(sentinels[0].read_text(),'preserve')
            self.assertFalse(list(moved.iterdir()))
            self.assertFalse((outside/'report.json').exists())


if __name__=='__main__':
    unittest.main()
