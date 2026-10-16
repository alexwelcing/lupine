"""Focused common-envelope controls; constructed bytes only, no real authority."""
import copy
from pathlib import Path
import sys,tempfile,unittest
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import mpea_archive_driver as driver
import mpea_archive_custody as custody
from mpea_constructed_fixture import make_case
from test_mpea_production_store import binding


class CompanionObservability(unittest.TestCase):
    def setUp(self):
        (driver.persistence.ROOT/'.cache').mkdir(exist_ok=True)
        self.temp=tempfile.TemporaryDirectory(dir=driver.persistence.ROOT/'.cache',prefix='companion-observability-')
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.output=patch.object(driver.persistence,'OUTPUT_ROOT',self.root/'attempts')
        self.output.start();self.addCleanup(self.output.stop)
        self.stores=[];self.addCleanup(lambda:[store.close() for store in self.stores])

    def store(self,name,kind='SYNTHETIC_FIXTURE'):
        value=driver.persistence.ProductionStageStore(name,binding(),{'bytes':1,'md5':'a'*32,'sha256':'b'*64},execution_kind=kind)
        self.stores.append(value);return value

    def run_case(self,case,name):
        result=driver.run_synthetic(case,name,binding());self.stores.append(result.store);return result

    def specs(self):
        reserved=custody.target_companion_access(('CALIBRATION','EVALUATION'),{'CALIBRATION':120,'EVALUATION':131},captures=1,captured_bytes=42)
        return [('label-routes','allocation',custody.allocation_access()),
            ('development-targets','development',custody.target_companion_access(('DEVELOPMENT',),{'DEVELOPMENT':63},captures=1,captured_bytes=42)),
            ('rank-summary','rank_freeze',custody.rank_summary_access()),
            *[(name,'reserved',reserved) for name in ('calibration-vault','evaluation-vault','secondary-membership','completeness')]]

    def test_all_seven_closed_access_usage_views_and_native_types(self):
        for name,stage,access in self.specs():
            good={'stage':stage,'access':dict(access,execution_scope='synthetic_fixture'),'usage':custody.companion_usage(stage)}
            custody.validate_companion_observability(good,stage,access)
            changes=[]
            for field in ('access','usage'):
                for key in good[field]:
                    item=copy.deepcopy(good);del item[field][key];changes.append(item)
                item=copy.deepcopy(good);item[field]['extra']=None;changes.append(item)
            for path,value in [(('usage','independent_artifact_measurement'),0),
                    (('usage','artifact_wall_seconds'),'0/1'),(('usage','artifact_peak_rss_bytes'),0),
                    (('usage','stage_observation_may_be_unavailable'),1),(('access','stage'),'evaluation')]:
                item=copy.deepcopy(good);item[path[0]][path[1]]=value;changes.append(item)
            item=copy.deepcopy(good)
            role=next(iter(item['access']['decoded_row_counts']))
            item['access']['decoded_row_counts'][role]=False;changes.append(item)
            for item in changes:
                with self.subTest(companion=name,changed=item),self.assertRaises(driver.persistence.ProductionError):
                    custody.validate_companion_observability(item,stage,access)

    def test_constructors_detach_and_refuse_unsupported_role_counts(self):
        counts={'DEVELOPMENT':63}
        value=custody.target_companion_access(('DEVELOPMENT',),counts,captures=1,captured_bytes=42)
        counts['DEVELOPMENT']=0;value['decoded_row_counts']['DEVELOPMENT']=0
        self.assertEqual(value['accumulated_row_counts']['DEVELOPMENT'],63)
        class String(str):pass
        for roles,counts in [(('EVALUATION',),{'EVALUATION':1}),
                (('DEVELOPMENT',),{'DEVELOPMENT':False}),((String('DEVELOPMENT'),),{'DEVELOPMENT':1}),
                (('DEVELOPMENT',),{String('DEVELOPMENT'):1}),(('DEVELOPMENT',),{'DEVELOPMENT':315})]:
            with self.assertRaises(driver.persistence.ProductionError):custody.target_companion_access(roles,counts,captures=1,captured_bytes=42)
        for captures,size in ((False,42),(0,42),(2,42),(1,False),(1,0),(1,332127)):
            with self.assertRaises(driver.persistence.ProductionError):
                custody.target_companion_access(('DEVELOPMENT',),{'DEVELOPMENT':1},captures=captures,captured_bytes=size)
        for stage in ('evaluation',None,True):
            with self.assertRaises(driver.persistence.ProductionError):custody.companion_usage(stage)

    def test_allocation_window_starts_before_payload_and_no_overrides(self):
        events=[]
        class Observation:
            def __init__(self,stage):events.append(('start',stage))
            def finish(self):events.append(('finish',None));return {'observed':True}
        class Store:
            def write_artifact(self,name,payload,**kwargs):events.append(('write',kwargs));return 'identity'
            def commit(self,stage,payload,**kwargs):events.append(('commit',kwargs));return 'stage'
        with patch.object(driver,'StageObservation',Observation):
            proxy=driver.AllocationUsageStore(Store());events.append(('construct_payload',None))
            proxy.write_artifact('label-routes.json',{},schema='lupine.discovery.mpea.label_routes.v1')
            proxy.commit('allocation',{})
        self.assertEqual([event[0] for event in events],['start','construct_payload','write','finish','commit'])
        self.assertEqual(events[2][1]['usage'],custody.companion_usage('allocation'))
        self.assertEqual(events[2][1]['access'],custody.allocation_access())
        for kwargs in ({'access':{}},{'usage':{}},{'schema':'wrong'}):
            options={'schema':'lupine.discovery.mpea.label_routes.v1',**kwargs}
            with self.assertRaises(driver.persistence.ProductionError):proxy.write_artifact('label-routes.json',{},**options)
        with self.assertRaises(driver.persistence.ProductionError):proxy.write_artifact('other.json',{},schema='lupine.discovery.mpea.label_routes.v1')

    def test_usage_excluded_access_included_in_scientific_identity(self):
        store=self.store('preimage');proxy=driver.AllocationUsageStore(store)
        identity=proxy.write_artifact('label-routes.json',{},schema='lupine.discovery.mpea.label_routes.v1')
        value=store.read_artifact('label-routes.json',identity)
        changed=copy.deepcopy(value);changed['usage']['artifact_wall_seconds']='123/1'
        self.assertEqual(driver.io.digest(driver.persistence.scientific_preimage(value)),driver.io.digest(driver.persistence.scientific_preimage(changed)))
        self.assertNotEqual(driver.io.digest(value),driver.io.digest(changed))
        changed=copy.deepcopy(value);changed['access']['decoded_row_counts']['DEVELOPMENT']=1
        self.assertNotEqual(driver.io.digest(driver.persistence.scientific_preimage(value)),driver.io.digest(driver.persistence.scientific_preimage(changed)))

    def test_exact_original_allocation_and_route_import_retains_metadata(self):
        original=self.store('original','PRODUCTION_ARCHIVE');view=driver.AllocationUsageStore(original)
        route=view.write_artifact('label-routes.json',{},schema='lupine.discovery.mpea.label_routes.v1')
        view.commit('allocation',{'route_artifact':route,'role_map_sha256':route['bytes_sha256']},inputs={'label_routes':route})
        stage=original.stage_identity('allocation');stage_raw=original.stage_bytes('allocation');route_raw=original.artifact_bytes('label-routes.json',route)
        reproduced=self.store('reproduction','REPRODUCTION_FIXED_ALLOCATION');view2=driver.AllocationUsageStore(reproduced)
        with patch('os.urandom',side_effect=AssertionError('NO_ENTROPY')):
            view2.import_original_allocation(stage_raw,stage,route_raw,route)
        self.assertEqual(reproduced.stage_bytes('allocation'),stage_raw)
        self.assertEqual(reproduced.artifact_bytes('label-routes.json',route),route_raw)
        self.assertEqual(reproduced.stage_identity('allocation'),stage)
        self.assertIsNotNone(view2.import_usage)
        custody.validate_companion_observability(reproduced.read_artifact('label-routes.json',route),'allocation',custody.allocation_access())

    def test_inadequate_development_keeps_known_counts_and_unavailable_observation(self):
        with patch.object(driver.stage_usage.StageUsage,'start',side_effect=RuntimeError('measurement unavailable')):
            result=self.run_case(make_case(missing_development=True),'inadequate')
        self.assertEqual(result.status,'NO_GO_INSUFFICIENT_DEVELOPMENT',result.reasons)
        driver.validate_result(result)
        for name in ('label-routes.json','development-targets.json'):
            doc=result.store.read_artifact(name,result.store._artifacts[name])
            self.assertIsNone(doc['usage']['artifact_cpu_seconds'])
            self.assertTrue(doc['usage']['stage_observation_may_be_unavailable'])
        dev=result.store.read_artifact('development-targets.json',result.store._artifacts['development-targets.json'])
        self.assertEqual(dev['access']['decoded_row_counts'],{'DEVELOPMENT':63})
        self.assertEqual(dev['access']['mixed_source_captures'],result.source_captures)
        self.assertEqual(dev['access']['mixed_source_captured_bytes'],result.captured_bytes)
        observed=driver.io._loads(result.store.stage_bytes('development'))['usage']
        self.assertEqual(observed['measurement_status'],'UNAVAILABLE');self.assertIsNone(observed['stage_resource'])

    def test_resealed_bad_route_metadata_stops_before_source_capture(self):
        real=driver.persistence.ProductionStageStore.write_artifact
        def write(store,name,payload,**kwargs):
            if name=='label-routes.json':kwargs['access']={}
            return real(store,name,payload,**kwargs)
        with patch.object(driver.persistence.ProductionStageStore,'write_artifact',write),patch.object(custody.parser,'parse_target') as decoder:
            result=self.run_case(make_case(),'bad-route')
        self.assertEqual(result.status,'BLOCKED');self.assertIn('INPUT_IDENTITY_MISMATCH',result.reasons)
        decoder.assert_not_called();self.assertEqual(result.source_captures,0)
        with self.assertRaises(driver.persistence.ProductionError):driver.validate_result(result)

    def test_resealed_bad_development_metadata_stops_before_fit_and_publication(self):
        real=driver.persistence.ProductionStageStore.write_artifact
        def write(store,name,payload,**kwargs):
            if name=='development-targets.json':kwargs['usage']={}
            return real(store,name,payload,**kwargs)
        with patch.object(driver.persistence.ProductionStageStore,'write_artifact',write),patch.object(custody.kernel,'fit_development') as fit:
            result=self.run_case(make_case(),'bad-development')
        self.assertEqual(result.status,'BLOCKED');self.assertIn('INPUT_IDENTITY_MISMATCH',result.reasons)
        fit.assert_not_called();self.assertEqual(result.access,(('DEVELOPMENT',63),))
        with self.assertRaises(driver.persistence.ProductionError):driver.validate_result(result)


if __name__=='__main__':unittest.main()
