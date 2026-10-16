"""Constructed archived-shape fixture; no actual source/features/targets/entropy."""
import copy,json,tempfile,sys,unittest
from pathlib import Path
from unittest.mock import patch
HERE=Path(__file__).resolve();ROOT=next(p for p in HERE.parents if (p/'src/lupine_discovery/decision_pool.py').is_file())
sys.path[:0]=[str(HERE.parents[1]/'scripts'),str(HERE.parent),str(ROOT/'tests')]
import mpea_archive_artifacts as m
from mpea_constructed_fixture import driver as d,make_case
class Views(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        d.storemod.WORKSPACE.mkdir(parents=True,exist_ok=True)
        cls.temp=tempfile.TemporaryDirectory(dir=d.storemod.WORKSPACE,prefix='artifact-constructed-')
        with patch.object(d.storemod,'ATTEMPTS',Path(cls.temp.name)/'attempts'):
            cls.case=make_case();cls.result=d.run_fixture(cls.case,'synthetic')
        cls.payloads={name:json.loads((cls.result.store.path/f'{i:02d}-{name}.json').read_bytes())['payload'] for i,name in enumerate(d.storemod.STAGES)}
        cls.source={'bytes':cls.case.routes.source.byte_count,'md5':cls.case.routes.source.md5,'sha256':cls.case.routes.source.sha256}
        cls.frame=m.profiles.framing(cls.source,1545,23,('DEVELOPMENT',),{'DEVELOPMENT':cls.payloads['development']['aggregate']['row_count']})
        cls.dev=m.development_targets(cls.payloads['development'],cls.frame)
    @classmethod
    def tearDownClass(cls):cls.temp.cleanup()
    def test_development_projection_and_required_keys(self):
        v=self.dev;m.validate_development_targets(v,self.payloads['development'],self.frame)
        self.assertEqual(v['rows'],self.payloads['development']['rows']);self.assertEqual(v['complete_row_count'],63)
        for key in v:
            bad=copy.deepcopy(v);del bad[key]
            with self.assertRaises(m.ArtifactError):m.validate_development_targets(bad,self.payloads['development'],self.frame)
    def test_literal_row_provenance(self):
        value=m.label_provenance(self.payloads['development']['rows'],self.frame)
        self.assertEqual(value,self.dev['row_provenance'])
        first=value[0];row=self.payloads['development']['rows'][0]
        self.assertEqual(first['record_id'],row['record_id'])
        for name,col in (('yield_strength',11),('elongation',13)):
            prop=first['properties'][name]
            self.assertEqual(prop['source_column'],col);self.assertEqual(prop['source_blob'],self.source)
            self.assertEqual(prop['value'],row[name]['value']);self.assertEqual(prop['status'],row[name]['status'])
            self.assertEqual(prop['uncertainty'],'NOT_INTERPRETED');self.assertEqual(prop['pairing'],'CO_RECORDED_NOT_SPECIMEN_VERIFIED')
        bad=copy.deepcopy(self.dev);bad['row_provenance'][0]['properties']['elongation']['source_column']=11
        with self.assertRaises(m.ArtifactError):m.validate_development_targets(bad,self.payloads['development'],self.frame)
    def test_development_consistency_and_bool(self):
        for change in ('count','status','reason','row'):
            compact=copy.deepcopy(self.payloads['development'])
            if change=='count':compact['aggregate']['complete_row_count']=True
            elif change=='status':compact['status']='NO_GO_INSUFFICIENT_DEVELOPMENT'
            elif change=='reason':compact['rows'][0]['yield_strength']['reason']='EMPTY_TOKEN'
            else:compact['rows'][0]['ordinal']=False
            with self.assertRaises(m.ArtifactError):m.development_targets(compact,self.frame)
    def test_rank_exact_views(self):
        compact=self.payloads['rank_freeze'];v=m.rank_freeze(compact,self.dev);m.validate_rank_freeze(v,compact,self.dev)
        self.assertEqual(v['ranks'],compact['ranks']);self.assertEqual(sum(v['fallback_counts'].values()),314)
        self.assertEqual(set(v['full_orders']),{r['panel']['panel_id'] for r in compact['ranks']})
        bad=copy.deepcopy(v);bad['neighbor_or_fallback_records'][0]['neighbors']=[]
        with self.assertRaises(m.ArtifactError):m.validate_rank_freeze(bad,compact,self.dev)
        bad=copy.deepcopy(compact);bad['ranks'][0]['orders']['primary'].append('not-a-member')
        with self.assertRaises(m.ArtifactError):m.rank_freeze(bad,self.dev)
    def test_secondary_empty_literal_restriction(self):
        ranks=self.payloads['rank_freeze']['ranks'];complete=copy.deepcopy(self.payloads['reserved']['complete_ids']);panel=next(iter(complete));complete[panel]=[]
        v=m.secondary_membership(ranks,complete,'a'*64);m.validate_secondary_membership(v,ranks,complete,'a'*64)
        self.assertEqual(len(v['members_by_source_group']),40)
        group=next(r['panel']['source_group'] for r in ranks if r['panel']['panel_id']==panel)
        self.assertEqual(v['members_by_source_group'][group],[])
        self.assertTrue(all(x==[] for x in v['restricted_orders'][group].values()))
        bad=copy.deepcopy(v);del bad['members_by_source_group'][group]
        with self.assertRaises(m.ArtifactError):m.validate_secondary_membership(bad,ranks,complete,'a'*64)
    def test_public_completeness_no_ids_values_and_typed_counts(self):
        reserved=self.payloads['reserved'];total=sum(a['row_count'] for a in reserved['target_aggregates'].values());args=(reserved['complete_ids'],reserved['target_aggregates'],'a'*64,'b'*64,'c'*64,total)
        v=m.completeness(*args);m.validate_completeness(v,*args)
        self.assertEqual(len(v),9);self.assertTrue(v['all_40_endpoints_defined']);self.assertEqual(v['population_counts']['secondary_panels'],40)
        raw=m.canonical(v).decode()
        self.assertFalse(any(record in raw for ids in reserved['complete_ids'].values() for record in ids))
        for key in v:
            bad=copy.deepcopy(v);del bad[key]
            with self.assertRaises(m.ArtifactError):m.validate_completeness(bad,*args)
        bad=copy.deepcopy(v);bad['reserved_primary_panel_count']=True
        with self.assertRaises(m.ArtifactError):m.validate_completeness(bad,*args)
    def test_calibration_exact_views_and_unknown_fields(self):
        compact=self.payloads['calibration'];v=m.calibration(compact);m.validate_calibration(v,compact)
        for key in v:
            bad=copy.deepcopy(v);del bad[key]
            with self.assertRaises(m.ArtifactError):m.validate_calibration(bad,compact)
        for population,plan in zip(('primary','secondary'),compact['plans']):
            self.assertEqual(v['decisions'][population],plan['decisions']);self.assertEqual(v['policy_schedules'][population],plan['schedules'])
        bad=copy.deepcopy(v);bad['future_panels']['primary'][0]['ranked_ids']=[]
        with self.assertRaises(m.ArtifactError):m.validate_calibration(bad,compact)
        bad=copy.deepcopy(compact);bad['plans'][0]['protocol']['unexpected']='x'
        with self.assertRaises(m.ArtifactError):m.calibration(bad)
        bad=copy.deepcopy(compact);bad['all_future_decisions_sealed']=1
        with self.assertRaises(m.ArtifactError):m.calibration(bad)
if __name__=='__main__':unittest.main()
