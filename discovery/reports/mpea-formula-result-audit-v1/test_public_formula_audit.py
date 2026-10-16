from copy import deepcopy
import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('public_formula_audit',Path(__file__).with_name('check_public_formula.py'))
a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)


def item(group):return {'status':'UNRESOLVED','value':None} if group is None else {'status':'TOKEN_GROUP','value':group}


def row(i,formula,source,temp=('25','1'),mode='T'):
    return {'ordinal':i,'record_id':'a'*64+':'+str(i),'formula':item(formula),'source':item(source),
            'test_mode':{'status':'KNOWN','value':mode},'temperature':{'status':'UNRESOLVED','value':None} if temp is None else
            {'status':'KNOWN','value':{'decimal':'25.00' if temp==('25','1') else 'ignored spelling','numerator':temp[0],'denominator':temp[1],'unit':'degC'}}}


class PublicAuditIndependentTests(unittest.TestCase):
    def test_hand_counted_lexical_overlap_unknowns_and_two_pair_denominators(self):
        rows=[row(0,0,0),row(1,0,1),row(2,0,None),row(3,1,0),row(4,1,1),row(5,2,None),row(6,None,2)]
        result=a.summarize(rows)
        self.assertEqual((result['rows'],result['formula_recognized_rows'],result['formula_unresolved_rows']),(7,6,1))
        self.assertEqual((result['formula_lexical_groups'],result['source_lexical_groups'],result['source_unresolved_rows']),(3,3,2))
        self.assertEqual(result['formula_group_size_histogram'],[{'size':1,'groups':1},{'size':2,'groups':1},{'size':3,'groups':1}])
        overlap=result['cross_source_lexical_overlap']
        self.assertEqual((overlap['formula_groups'],overlap['rows_in_overlapping_formula_groups'],overlap['recognized_source_rows_in_overlapping_formula_groups'],overlap['unresolved_source_rows_in_overlapping_formula_groups']),(2,5,4,1))
        self.assertEqual(overlap['distinct_source_group_pairs_sharing_formula_group'],1)
        self.assertEqual(overlap['formula_group_by_source_pair_incidences'],2)
        self.assertEqual(result['known_source_count_per_formula_group_histogram'],[{'size':0,'groups':1},{'size':2,'groups':2}])

    def test_join_is_original_source_order_identity_not_group_equivalence(self):
        rows=[row(0,0,0),row(1,0,1)]
        metadata={'observed':{'sha256':'a'*64},'row_count':2,'rows':deepcopy(rows)}
        formula=deepcopy(metadata)
        for r in metadata['rows']:r['formula']=item(None)
        self.assertEqual([r['formula'] for r in a.join_rows(formula,metadata)],[item(0),item(0)])
        for mutate in (lambda f:f['rows'].reverse(),lambda f:f['rows'][1].update(record_id=f['rows'][0]['record_id']),
                       lambda f:f['observed'].update(sha256='b'*64),lambda f:f.update(row_count=1),
                       lambda f:f['rows'][0].update(ordinal=False)):
            bad=deepcopy(formula);mutate(bad)
            with self.assertRaises(ValueError):a.join_rows(bad,metadata)

    def test_exact_temperature_cohort_no_float_tolerance_or_unknown_inclusion(self):
        rows=[row(0,0,0),row(1,0,1,('50','2')),row(2,0,0,('24999','1000')),
              row(3,1,1,None),row(4,1,1,mode='C')]
        chosen=[r for r in rows if a.is_tensile(r) and a.is_exact25(r)]
        self.assertEqual([r['ordinal'] for r in chosen],[0,1])
        self.assertEqual(a.summarize(chosen)['rows'],2)
        bad=deepcopy(rows[0]);bad['temperature']['value']['unit']='K'
        with self.assertRaisesRegex(ValueError,'temperature_unit'):a.is_exact25(bad)

    def test_empty_and_all_unknown_groups_do_not_create_a_shared_unknown_source(self):
        self.assertEqual(a.summarize([])['rows'],0)
        result=a.summarize([row(0,0,None),row(1,0,None),row(2,None,None)])
        self.assertEqual(result['source_lexical_groups'],0)
        self.assertEqual(result['source_unresolved_rows'],3)
        self.assertEqual(result['cross_source_lexical_overlap']['formula_groups'],0)

    def test_strict_public_json_rejects_duplicate_keys_and_numeric_extensions(self):
        for raw in (b'{"x":1,"x":2}',b'{"x":NaN}',b'{"x":0.5}',b'{"x":"\xff"}'):
            with self.assertRaises((ValueError,UnicodeError)):a.decode(raw)


if __name__=='__main__':unittest.main()
