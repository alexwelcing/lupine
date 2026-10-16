import dataclasses
from fractions import Fraction
import hashlib
import importlib.util
import itertools
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
import lupine_discovery
if str(ROOT/'src/lupine_discovery') not in lupine_discovery.__path__:
    lupine_discovery.__path__.insert(0,str(ROOT/'src/lupine_discovery'))
from lupine_discovery.representation import l1_distance
SPEC=importlib.util.spec_from_file_location('mpea_feature_tests',ROOT/'scripts/mpea_features.py')
features=importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name]=features
SPEC.loader.exec_module(features)
IDENTITY=hashlib.sha256(b'constructed fixture identity, not an artifact attestation').hexdigest()


def row(i,token,group=0,*,status='TOKEN_GROUP',source_group=0,processing='CAST',identity=IDENTITY):
    return features.FixtureRow(i,identity+':'+str(i),status,group,token,source_group,
                               'UNRESOLVED' if processing is None else 'KNOWN',processing)


def coordinates(result):
    return dict(zip(result.vector.axes,result.vector.values))


class FormulaFeatureTests(unittest.TestCase):
    def test_known_answers_collisions_and_rounding_information_loss(self):
        tokens=(b'Fe1 Ni1',b'Ni1 Fe1',b'Fe2 Ni2',b'Fe1.0 Ni1',b'Fe1 Fe1 Ni2')
        expected=features.parse_formula_coefficients(tokens[0])
        for token in tokens:
            self.assertEqual(features.parse_formula_coefficients(token),expected)
        values=coordinates(expected)
        self.assertEqual(values['Fe'],Fraction(1,2)); self.assertEqual(values['Ni'],Fraction(1,2))
        self.assertEqual(sum(value==0 for value in values.values()),116)
        rounded=coordinates(features.parse_formula_coefficients(b'Fe0.333 Ni1'))
        self.assertEqual(rounded['Fe'],Fraction(333,1333))
        self.assertEqual(Fraction(1,4)-rounded['Fe'],Fraction(1,5332))
        self.assertEqual(l1_distance(features.parse_formula_coefficients(b'Fe1').vector,
                                     features.parse_formula_coefficients(b'Ni1').vector),2)

    def test_independent_decimal_expression_oracle_with_repeated_symbols(self):
        for iron,nickel,second in itertools.product(('0.01','1','2.5','9'),repeat=3):
            token=f'Ni{nickel} Fe{iron} Fe{second}'.encode('ascii')
            result=coordinates(features.parse_formula_coefficients(token))
            total=Fraction(iron)+Fraction(nickel)+Fraction(second)
            self.assertEqual(result['Fe'],(Fraction(iron)+Fraction(second))/total)
            self.assertEqual(result['Ni'],Fraction(nickel)/total)
            self.assertEqual(sum(result.values()),1)

    def test_all118_axes_are_fixed_atomic_number_order(self):
        self.assertEqual(len(features.AXES),118)
        self.assertEqual(features.AXES[:3],('H','He','Li'))
        self.assertEqual(features.AXES[-1],'Og')
        for index,symbol in enumerate(features.AXES):
            vector=features.parse_formula_coefficients((symbol+'1').encode()).vector
            self.assertEqual(vector.values[index],1)
            self.assertEqual(sum(vector.values),1)

    def test_grammar_unknown_is_null_whole_vector(self):
        for token in (*features.MARKERS,b' \t',b'FeNi',b'Fe1Ni1',b'Fe0 Ni1',b'Fe1e0',b'Fe1  Ni1',
                      b'Fe1\tNi1',b' Fe1',b'Fe1 ',b'Xx1',b'Fe.5',b'Fe1.',b'\xff'):
            result=features.parse_formula_coefficients(token)
            self.assertEqual(result.status,'UNRESOLVED'); self.assertIsNone(result.vector)
        for invalid in (None,True,'Fe1',bytearray(b'Fe1')):
            with self.assertRaisesRegex(features.FeatureError,'FORMULA_BYTES_REQUIRED'):
                features.parse_formula_coefficients(invalid)

    def test_numeric_limits_precede_conversion_and_preserve_accepted_boundaries(self):
        for token,reason in ((b'Fe'+b'1'*129,'DIGIT_LIMIT'),
                             (b'Fe0.'+b'0'*64+b'1','SCALE_LIMIT'),
                             (b' '.join([b'Fe1']*257),'TERM_LIMIT'),
                             (b'Fe'+b'1'*16384,'FIELD_LIMIT')):
            with patch.object(features,'int',side_effect=AssertionError('numeric conversion forbidden'),create=True):
                result=features.parse_formula_coefficients(token)
            self.assertEqual(result.status,'UNRESOLVED_LIMIT'); self.assertEqual(result.reason,reason)
            self.assertIsNone(result.vector)
        tokens=(b'Fe'+b'9'*128+b' Ni0.'+b'0'*63+b'1',b' '.join([b'Fe1']*256))
        for token in tokens:
            self.assertEqual(features.parse_formula_coefficients(token).status,'KNOWN')
        # A late oversized term must be detected before converting an earlier valid one.
        with patch.object(features,'int',side_effect=AssertionError('all caps before int'),create=True):
            self.assertEqual(features.parse_formula_coefficients(b'Ni1 Fe'+b'1'*129).reason,'DIGIT_LIMIT')

    def test_processing_unknown_indicator_is_distinct_from_other_and_zero_fill(self):
        unknown=features.encode_processing('UNRESOLVED',None)
        other=features.encode_processing('KNOWN','OTHER')
        self.assertEqual(unknown.indicator,(0,0,0,0,0,1)); self.assertNotEqual(unknown,other)
        for status,category in (('KNOWN',None),('KNOWN','UNRESOLVED'),('UNRESOLVED','OTHER'),('KNOWN','cast')):
            with self.assertRaises(features.FeatureError): features.encode_processing(status,category)
        with self.assertRaises(features.FeatureError):
            features.ProcessingEncoding('KNOWN','CAST',(True,0,0,0,0,0))

    def test_all_rows_and_original_groups_survive_unknown_and_limit_failures(self):
        original=[row(0,b'Fe1 Ni1'),row(1,b'NaN',None,status='UNRESOLVED',source_group=None,processing=None),
                  row(2,b'Fe'+b'1'*129,1,source_group=1),row(3,b'Ni1 Fe1',2,source_group=1)]
        table=features.build_fixture_features(original,fixture_sha256=IDENTITY)
        self.assertEqual([r.record_id for r in table.rows],[r.record_id for r in original])
        self.assertEqual([r.formula_group for r in table.rows],[0,None,1,2])
        self.assertEqual([r.composition.status for r in table.rows],['KNOWN','UNRESOLVED','UNRESOLVED_LIMIT','KNOWN'])
        self.assertIsNone(table.rows[1].composition.vector)
        self.assertIsNone(table.rows[2].composition.vector)
        original.clear(); self.assertEqual(len(table.rows),4)
        with self.assertRaises(dataclasses.FrozenInstanceError): table.rows=()
        with self.assertRaises(dataclasses.FrozenInstanceError): table.rows[0].ordinal=10

    def test_group_identity_mismatch_duplicate_id_and_real_source_fail_closed(self):
        cases=[(row(0,b'Fe1',1),),(row(0,b'Fe1'),row(1,b'Ni1',0)),
               (row(0,b'Fe1'),row(1,b'Fe1',1)),(row(0,b'FeNi'),),
               (row(0,b'Fe1',None,status='UNRESOLVED'),),
               (row(0,b'Fe1'),row(0,b'Fe1')),(row(0,b'Fe1',source_group=2),)]
        for rows in cases:
            with self.assertRaises(features.FeatureError):
                features.build_fixture_features(rows,fixture_sha256=IDENTITY)
        with self.assertRaisesRegex(features.FeatureError,'SYNTHETIC_IDENTITY_REQUIRED'):
            features.build_fixture_features([],fixture_sha256=features.REAL_SOURCE_SHA256)

    def test_public_aggregate_has_original_denominator_without_per_row_channels(self):
        table=features.build_fixture_features([row(0,b'Fe1'),row(1,b'NaN',None,status='UNRESOLVED',processing=None)],fixture_sha256=IDENTITY)
        report=features.aggregate_readiness(table)
        self.assertEqual(report['row_count'],2)
        self.assertEqual(sum(report['composition_status_counts'].values()),2)
        self.assertEqual(report['composition_status_counts'],{'KNOWN':1,'UNRESOLVED':1})
        self.assertEqual(report['processing_category_counts'],{'CAST':1,'UNRESOLVED':1})
        encoded=json.dumps(report)
        for forbidden in ('Fe1',IDENTITY,':0','formula_group','source_group','composition_vector'):
            self.assertNotIn(forbidden,encoded)
        empty=features.aggregate_readiness(features.build_fixture_features([],fixture_sha256=IDENTITY))
        self.assertEqual(empty['row_count'],0); self.assertEqual(empty['composition_status_counts'],{})
        self.assertNotIn('fraction_known',empty)

    def test_derived_table_digest_cannot_be_supplied_or_mutated_and_binds_metadata(self):
        a=features.build_fixture_features([row(0,b'Fe1')],fixture_sha256=IDENTITY)
        b=features.build_fixture_features([row(0,b'Fe1',processing='WROUGHT')],fixture_sha256=IDENTITY)
        self.assertNotEqual(a.table_digest,b.table_digest)
        with self.assertRaises(TypeError): features.FeatureTable(IDENTITY,a.rows,table_digest='0'*64)
        copied=features.FeatureTable(IDENTITY,list(a.rows))
        self.assertEqual(a,copied)
        object.__setattr__(copied,'table_digest','0'*64)
        with self.assertRaisesRegex(features.FeatureError,'FEATURE_TABLE_IDENTITY_CONFLICT'):
            features.aggregate_readiness(copied)

    def test_manual_table_construction_cannot_relabel_inconsistent_groups(self):
        a=features.build_fixture_features([row(0,b'Fe1')],fixture_sha256=IDENTITY)
        conflict=dataclasses.replace(a.rows[0],ordinal=1,record_id=IDENTITY+':1',
                                     composition=features.parse_formula_coefficients(b'Ni1'))
        with self.assertRaisesRegex(features.FeatureError,'FORMULA_GROUP_FEATURE_CONFLICT'):
            features.FeatureTable(IDENTITY,(a.rows[0],conflict))
        with self.assertRaisesRegex(features.FeatureError,'FORMULA_GROUP_ORDER_CONFLICT'):
            features.FeatureTable(IDENTITY,(dataclasses.replace(a.rows[0],formula_group=3),))


if __name__=='__main__': unittest.main()
