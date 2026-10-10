"""Source-free public bridge boundaries; registrations/source IDs are fabricated metadata.

The registered-mode test supplies declared public fingerprints only. It never
opens, authenticates, interprets, or allocates the corresponding scientific data.
"""
from dataclasses import replace
from fractions import Fraction
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
ROOT = next(parent for parent in HERE.parents if (parent/'src/lupine_discovery/decision_pool.py').is_file())
MAIN_LOCATION = HERE == ROOT/'tests'
LANE = ROOT if MAIN_LOCATION else ROOT/'.cache/mpea-study-custody'
HELPERS = ROOT/'tests' if MAIN_LOCATION else LANE/'review_production'
TEMP_ROOT = ROOT/'.cache/mpea-public-bridge-tests' if MAIN_LOCATION else LANE/'review_public_bridge'
LEGACY_PATH = ROOT/'tests/fixtures/mpea_bridge_review/bridge-before-binding-fix.py' if MAIN_LOCATION else LANE/'review_public_bridge/bridge-before-binding-fix.py'
for path in (LANE/'scripts', HELPERS):
    sys.path.insert(0, str(path))
if MAIN_LOCATION:
    from mpea_archive_review_constructed_case import make_case
    from test_mpea_production_store_review import registration, identity
else:
    from constructed_archive_case import make_case
    from test_production_store_review import registration, identity
import mpea_archive_driver as driver
import mpea_archive_report as bridge

METADATA = {name: identity(name, False) for name in ('mapping','metadata_b','formula_c')}


class IndependentBridgeBoundaryReview(unittest.TestCase):
    def setUp(self):
        TEMP_ROOT.mkdir(parents=True, exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=TEMP_ROOT, prefix='boundary-')
        self.addCleanup(self.temp.cleanup)
        self.patch = patch.object(driver.persistence, 'OUTPUT_ROOT', Path(self.temp.name)/'attempts')
        self.patch.start(); self.addCleanup(self.patch.stop)

    def run_case(self, name, **kwargs):
        result = driver.run_synthetic(make_case(), name, registration(), **kwargs)
        self.addCleanup(result.store.close)
        return result

    def test_development_decoder_interruption_keeps_unknown_counts_and_no_verdict(self):
        calls=[]
        original=driver.custody.parser.parse_target
        def interrupted(raw, name):
            calls.append(name)
            if len(calls)==3: raise driver.persistence.ProductionError('INTERNAL_FAILURE')
            return original(raw,name)
        with patch.object(driver.custody.parser,'parse_target',side_effect=interrupted):
            result=self.run_case('partial-development')
        self.assertEqual(result.status,'BLOCKED')
        self.assertEqual(len(calls),3)
        value=bridge.project(result,metadata_identities=METADATA).as_dict()
        self.assertIsNone(value['payload']['target_status_counts']['DEVELOPMENT'])
        for key in ('accumulated_bundles','decoded_bundles','interpreted_bundles'):
            self.assertIsNone(value['access']['counts'][key]['DEVELOPMENT'])
        self.assertEqual(value['access']['counts']['mixed_source_captures'],1)
        self.assertIsNone(value['payload']['overall_verdict'])

    def test_post_development_pre_model_interruption_has_no_invented_model_count(self):
        def checkpoint(event):
            if event.get('stage')=='development': raise driver.persistence.ProductionError('INTERNAL_FAILURE')
        result=self.run_case('after-development',checkpoint=checkpoint)
        self.assertEqual(result.status,'BLOCKED')
        value=bridge.project(result,metadata_identities=METADATA).as_dict()
        self.assertEqual(value['payload']['target_status_counts']['DEVELOPMENT']['row_count'],63)
        self.assertIsNone(value['access']['counts']['model_visible_bundles'])
        self.assertEqual(value['access']['counts']['calibrator_visible_bundles'],0)
        self.assertEqual(value['payload']['completed_policy_runs'],0)
        self.assertIsNone(value['payload']['overall_verdict'])

    def test_completed_development_parse_survives_missing_stage_receipt_in_access_counts(self):
        original=driver.persistence.ProductionStageStore.commit
        def broken(store,stage,*args,**kwargs):
            if stage=='development': raise driver.persistence.ProductionError('CACHE_IO_FAILURE')
            return original(store,stage,*args,**kwargs)
        with patch.object(driver.persistence.ProductionStageStore,'commit',broken):
            result=self.run_case('completed-parse-no-seal')
        self.assertEqual(result.status,'BLOCKED')
        self.assertEqual(result.store.stages,('allocation','input_freeze'))
        self.assertEqual(result.access,(('DEVELOPMENT',63),))
        value=bridge.project(result,metadata_identities=METADATA).as_dict()
        for key in ('accumulated_bundles','decoded_bundles','interpreted_bundles'):
            self.assertEqual(value['access']['counts'][key]['DEVELOPMENT'],63)
        self.assertIsNone(value['payload']['target_status_counts']['DEVELOPMENT'])
        self.assertIsNone(value['payload']['overall_verdict'])

    def test_partial_development_without_a_seal_does_not_become_zero_reads(self):
        original_commit=driver.persistence.ProductionStageStore.commit
        original_parse=driver.custody.parser.parse_target
        calls=[]
        def broken(store,stage,*args,**kwargs):
            if stage=='development': raise driver.persistence.ProductionError('CACHE_IO_FAILURE')
            return original_commit(store,stage,*args,**kwargs)
        def interrupted(raw,name):
            calls.append(name)
            if len(calls)==3: raise driver.persistence.ProductionError('INTERNAL_FAILURE')
            return original_parse(raw,name)
        with patch.object(driver.persistence.ProductionStageStore,'commit',broken),patch.object(driver.custody.parser,'parse_target',side_effect=interrupted):
            result=self.run_case('partial-parse-no-seal')
        self.assertEqual(result.status,'BLOCKED')
        self.assertEqual(len(calls),3)
        self.assertEqual(result.access,())
        self.assertEqual(result.store.stages,('allocation','input_freeze'))
        value=bridge.project(result,metadata_identities=METADATA).as_dict()
        for key in ('accumulated_bundles','decoded_bundles','interpreted_bundles'):
            self.assertIsNone(value['access']['counts'][key]['DEVELOPMENT'])

    def test_partial_reserved_persistence_preserves_completed_role_count(self):
        original=driver.persistence.ProductionStageStore.write_artifact
        def broken(store,name,*args,**kwargs):
            if name=='evaluation-vault.json': raise driver.persistence.ProductionError('CACHE_IO_FAILURE')
            return original(store,name,*args,**kwargs)
        with patch.object(driver.persistence.ProductionStageStore,'write_artifact',broken):
            result=self.run_case('reserved-vault-failure')
        self.assertEqual(result.status,'BLOCKED')
        self.assertEqual(result.access,(('DEVELOPMENT',63),('CUSTODIAN_CALIBRATION',120)))
        value=bridge.project(result,metadata_identities=METADATA).as_dict()
        for key in ('accumulated_bundles','decoded_bundles','interpreted_bundles'):
            self.assertEqual(value['access']['counts'][key]['CALIBRATION'],120)
            self.assertIsNone(value['access']['counts'][key]['EVALUATION'])
        self.assertIsNone(value['payload']['target_status_counts']['CALIBRATION'])
        self.assertEqual(value['access']['counts']['policy_bundle_requests'],0)
        self.assertIsNone(value['payload']['overall_verdict'])

    def test_registered_original_and_reproduction_early_status_science_match(self):
        case=make_case()
        # Metadata-only envelope control: no genuine registration authority or
        # actual source read is requested by this source-free store constructor.
        count,md5,sha=bridge.report.REGISTERED_SOURCE
        declared=dict(bytes=count,md5=md5,sha256=sha)
        original=driver.persistence.ProductionStageStore('declared-original',registration(),declared,execution_kind='PRODUCTION_ARCHIVE')
        reproduced=driver.persistence.ProductionStageStore('declared-reproduction',registration(),declared,execution_kind='REPRODUCTION_FIXED_ALLOCATION')
        for store in (original,reproduced): self.addCleanup(store.close)
        context=driver.custody.RouteContext(case.routes.header,case.routes.rows)
        route=original.write_artifact('label-routes.json',driver.custody._route_payload(context,'c'*64),schema='lupine.discovery.mpea.label_routes.v1')
        original.commit('allocation',dict(route_artifact=route,role_map_sha256=route['bytes_sha256']),inputs={'label_routes':route})
        reproduced.import_original_allocation(original.stage_bytes('allocation'),original.stage_identity('allocation'),original.artifact_bytes('label-routes.json',route),route)
        results=[]
        for store,wall in ((original,1),(reproduced,99)):
            store.commit('input_freeze',{'available':None},status='BLOCKED',reasons=('INTERNAL_FAILURE',),usage={'wall':Fraction(wall)})
            # Explicit source-free result-factory control. This does not invoke
            # the source reader or claim an authenticated production execution.
            result=driver._seal_result(driver.ArchiveResult('BLOCKED',store,None,(),None,(),None,
                {role:None for role in driver.helpers.ROLES},(),('INTERNAL_FAILURE',)))
            results.append(bridge.project(result,metadata_identities=METADATA,
                usage=bridge.report.Usage(Fraction(wall),None,None)))
        one,two=(r.as_dict() for r in results)
        self.assertEqual(one['scientific_sha256'],two['scientific_sha256'])
        self.assertNotEqual(one['content_sha256'],two['content_sha256'])
        self.assertEqual(one['execution_kind'],'registered_original')
        self.assertEqual(two['execution_kind'],'registered_reproduction')
        self.assertIsNone(one['payload']['overall_verdict'])
        self.assertEqual(one['access']['counts']['mixed_source_captures'],0)

    def test_issued_result_nested_aggregate_mutation_is_rejected(self):
        result=driver.run_synthetic(make_case(missing_development=True),'nested-mutation',registration())
        self.addCleanup(result.store.close)
        counts=result.aggregates['DEVELOPMENT']['status_counts']['yield_strength']
        counts['UNDECLARED_STATUS']=1
        try:
            with self.assertRaises(driver.persistence.ProductionError):
                bridge.project(result,metadata_identities=METADATA)
        finally:
            del counts['UNDECLARED_STATUS']
        self.assertEqual(bridge.project(result,metadata_identities=METADATA).document['status'],'NO_GO_INSUFFICIENT_DEVELOPMENT')

    def test_equivalent_semantic_vault_inputs_preserve_reserved_stage_identity(self):
        changed=registration();changed.update(engineering_receipt_sha256='d'*64,
            ci_receipt_sha256='e'*64,receipt=identity('different-operational-wrapper'))
        source=dict(bytes=12,md5='a'*32,sha256='b'*64)
        first=driver.persistence.ProductionStageStore('semantic-original',registration(),source,execution_kind='PRODUCTION_ARCHIVE')
        second=driver.persistence.ProductionStageStore('semantic-copy',changed,source,execution_kind='REPRODUCTION_FIXED_ALLOCATION')
        for store in (first,second): self.addCleanup(store.close)
        vaults=[]
        for store in (first,second):
            for stage in driver.persistence.STAGES[:4]: store.commit(stage,{'fixed':True})
            vault=store.write_artifact('calibration-vault.json',{'rows':[]},schema='lupine.discovery.mpea.target_vault.v1')
            vaults.append(vault)
            store.commit('reserved',{'vault_identities':{'CALIBRATION':vault['scientific_sha256']}},inputs={'calibration_vault':vault})
        self.assertNotEqual(vaults[0]['bytes_sha256'],vaults[1]['bytes_sha256'])
        self.assertEqual(vaults[0]['scientific_sha256'],vaults[1]['scientific_sha256'])
        self.assertEqual(first.scientific_digests(),second.scientific_digests())


if __name__=='__main__': unittest.main()
