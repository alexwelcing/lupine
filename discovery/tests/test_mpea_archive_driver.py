"""Only constructed archive bytes; no production authority, source or entropy."""
from dataclasses import replace
import copy
from fractions import Fraction
from hashlib import sha256
from pathlib import Path
import sys,tempfile,unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import mpea_archive_driver as driver
import mpea_archive_custody as custody
import mpea_archive_report as bridge
from mpea_constructed_fixture import make_case
from test_mpea_production_store import binding


class ArchiveDriverTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(dir=driver.persistence.ROOT/'.cache',prefix='archive-fixture-')
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.patch=patch.object(driver.persistence,'OUTPUT_ROOT',self.root/'attempts')
        self.patch.start();self.addCleanup(self.patch.stop)
        self.closed=[];self.addCleanup(lambda:[store.close() for store in self.closed])

    def run_case(self,case,name='run',**kwargs):
        result=driver.run_synthetic(case,name,binding(),**kwargs);self.closed.append(result.store);return result

    def prepare(self,original,name='manual'):
        source={'bytes':original.routes.source.byte_count,'md5':original.routes.source.md5,'sha256':original.routes.source.sha256}
        store=driver.persistence.ProductionStageStore(name,binding(),source,execution_kind='SYNTHETIC_FIXTURE');self.closed.append(store)
        allocation_store=driver.AllocationUsageStore(store)
        routes=custody.RouteContext(original.routes.header,original.routes.rows)
        route=allocation_store.write_artifact('label-routes.json',custody._route_payload(routes,'c'*64),schema='lupine.discovery.mpea.label_routes.v1')
        allocation_store.commit('allocation',{'route_artifact':route,'role_map_sha256':route['bytes_sha256']},inputs={'label_routes':route})
        case=custody.fixture_case(original,store,store.stage_identity('allocation'),route)
        store.commit('input_freeze',case.input_payload,inputs={name:dict(value) for name,value in case.input_context['metadata_receipts'].items()})
        return case,store,custody.fixture_custodian(original,case,store)

    def test_full_archive_envelopes_only_authorized_role_access(self):
        case=make_case();events=[];calls=[];original=custody.parser.parse_target
        def traced(raw,name):calls.append(name);return original(raw,name)
        with patch.object(custody.parser,'parse_target',side_effect=traced):
            result=self.run_case(case,checkpoint=events.append)
        self.assertEqual(result.status,'COMPLETE',result.reasons)
        self.assertEqual(result.store.stages,driver.persistence.STAGES)
        self.assertEqual([e['stage'] for e in events if e['event']=='STAGE_SEALED'],list(driver.persistence.STAGES))
        self.assertEqual(events[2],{'event':'TARGET_PHASE_BEGIN'})
        self.assertEqual(len(calls),628);self.assertEqual(result.source_captures,1)
        self.assertEqual(result.captured_bytes,len(case.raw))
        self.assertEqual(sum(len(plan.schedules) for plan in result.plans),960)
        self.assertLess(sum(p.stat().st_size for p in result.store.path.glob('*.json')),32*1048576)
        for stage in driver.persistence.STAGES:
            receipt=driver.io._loads(result.store.stage_bytes(stage))
            observed=receipt['usage']['stage_resource']
            self.assertEqual(receipt['usage']['measurement_status'],'OBSERVED')
            self.assertEqual(observed['stage'],stage)
            self.assertIsNone(observed['within_stage_peak_rss_bytes'])
            self.assertEqual(observed['within_stage_peak_rss_status'],'NOT_MEASURED')
        expected={
            'input_freeze':{'feature_artifact','metadata_receipts','mapping','profile','label_route_seal','funnel_counts','role_counts','overlap_counts','original_membership'},
            'rank_freeze':{'threshold','development_membership','processing_medians','predictions','neighbor_or_fallback_records','full_orders','fallback_counts','predictor_profile'},
            'calibration':{'protocols','calibrations','future_panels','decisions','policy_schedules','all_future_decisions_sealed','scope'}}
        for stage,required in expected.items():self.assertLessEqual(required,set(driver.io._loads(result.store.stage_bytes(stage))['payload']))
        calibration=driver.io._loads(result.store.stage_bytes('calibration'))['payload']
        driver.decision_views.validate_calibration_payload(calibration)
        for plan in result.plans:
            for row,decision in zip(calibration['decisions'][plan.population],plan.decisions):
                self.assertEqual({key:row[key] for key in driver.decision_views.FIELDS},
                    driver.io.normalize({key:getattr(decision,key) for key in driver.decision_views.FIELDS}))
                self.assertEqual(row['panel_digest'],decision.panel.panel_digest)
                self.assertEqual(row['calibration_digest'],decision.calibration.calibration_digest)
        for field in driver.decision_views.FIELDS+driver.decision_views.LINKS:
            changed=copy.deepcopy(calibration);del changed['decisions']['primary'][0][field]
            with self.assertRaises(driver.artifacts.ArtifactError):driver.decision_views.validate_calibration_payload(changed)
        changed=copy.deepcopy(calibration);changed['decisions']['primary'][0]['conditional_guarantee']='UNSUPPORTED_NEW_CLAIM'
        with self.assertRaises(driver.artifacts.ArtifactError):driver.decision_views.validate_calibration_payload(changed)
        compact={key:calibration[key] for key in ('plan_digests','all_future_decisions_sealed','plans')}
        projected=driver.decision_views.complete_calibration_payload(compact,result.plans)
        storage=copy.deepcopy(driver.decision_views.STORAGE)
        projected['generic_object_storage']['decision_links'].append('UNREGISTERED_LINK')
        self.assertEqual(driver.decision_views.STORAGE,storage)
        with self.assertRaises(driver.artifacts.ArtifactError):driver.decision_views.validate_calibration_payload(projected)
        changed=copy.deepcopy(compact);changed['plans'][0]['fit_digest']='0'*64
        with self.assertRaises(driver.artifacts.ArtifactError):driver.decision_views.complete_calibration_payload(changed,result.plans)
        rank_payload=driver.io._loads(result.store.stage_bytes('rank_freeze'))['payload']
        summary=driver.io._loads((result.store.path/'rank-summary.json').read_bytes())
        self.assertEqual(summary['payload'],custody.public_rank_summary(rank_payload,result.store.stage_identity('rank_freeze')['scientific_sha256']))
        self.assertNotIn(case.features[0].record_id,driver.io.canonical(summary).decode())
        for name,required in {
            'development-targets.json':{'rows','target_profile','status_counts','complete_row_count','complete_group_count','adequacy','source_framing'},
            'secondary-membership.json':{'members_by_source_group','restricted_orders','membership_rule','rank_freeze_scientific_sha256'},
            'completeness.json':{'reserved_primary_panel_count','reserved_primary_row_count','all_40_endpoints_defined','target_status_counts','population_counts','secondary_membership_artifact','calibration_vault_identity','evaluation_vault_identity','scope'}}.items():
            doc=driver.io._loads((result.store.path/name).read_bytes());self.assertLessEqual(required,set(doc['payload']))
            self.assertEqual(doc['access']['actor'],'target_custodian')
        public_completeness=driver.io._loads((result.store.path/'completeness.json').read_bytes())
        self.assertNotIn(case.features[0].record_id,driver.io.canonical(public_completeness).decode())
        identities={name:driver.io._loads(result.store.stage_bytes('input_freeze'))['payload']['metadata_receipts'][name] for name in ('mapping','metadata_b','formula_c')}
        projected=bridge.project(result,metadata_identities=identities)
        self.assertEqual(projected.as_dict()['status'],'COMPLETE')
        self.assertEqual(projected.as_dict()['execution_kind'],'synthetic_fixture')
        self.assertNotIn(case.features[0].record_id,projected.canonical_bytes().decode())
        written=bridge.write(result,projected)
        self.assertEqual(written['bytes_sha256'],sha256((result.store.path/'public-report.json').read_bytes()).hexdigest())

    def test_insufficient_development_never_opens_reserved(self):
        result=self.run_case(make_case(missing_development=True))
        self.assertEqual(result.status,'NO_GO_INSUFFICIENT_DEVELOPMENT')
        self.assertEqual(result.store.stages,('allocation','input_freeze','development'))
        self.assertEqual(result.access,(('DEVELOPMENT',63),))
        self.assertIsNone(result.fit);self.assertIsNone(result.aggregates['CALIBRATION'])
        self.assertFalse((result.store.path/'evaluation-vault.json').exists())
        identities={name:driver.io._loads(result.store.stage_bytes('input_freeze'))['payload']['metadata_receipts'][name] for name in ('mapping','metadata_b','formula_c')}
        document=bridge.project(result,metadata_identities=identities).as_dict()
        self.assertEqual(document['status'],'NO_GO_INSUFFICIENT_DEVELOPMENT')
        self.assertIsNone(document['payload']['overall_verdict'])
        self.assertIsNone(document['payload']['population_metrics'])

    def test_exact_source_identity_checked_before_framing_or_decode(self):
        original=make_case();case,store,custodian=self.prepare(original)
        malformed=custody.ArchiveCustodian(case,store,lambda:original.raw+b'X',authority=custody._AUTHORITY)
        with patch.object(custody.parser,'_authorized_cells',side_effect=AssertionError('UNAUTHORIZED')) as frame:
            with self.assertRaises(driver.persistence.ProductionError):malformed.development()
            frame.assert_not_called()
        self.assertEqual(malformed.captures,1)

    def test_route_input_and_rank_validation_precede_decoder(self):
        original=make_case();case,store,custodian=self.prepare(original)
        store._sealed[1][2]['bytes_sha256']='0'*64
        with patch.object(custody.parser,'parse_target',side_effect=AssertionError('NO_DECODE')) as parse:
            with self.assertRaises((driver.persistence.ProductionError,custody.io.StageError)):custodian.development()
            parse.assert_not_called()
        self.assertEqual(custodian.captures,0)

    def test_capture_rejects_symlink_fifo_limits_and_closed_errors(self):
        path=self.root/'file';path.write_bytes(b'0123456789')
        self.assertEqual(custody.capture(path,10),b'0123456789')
        with self.assertRaises(driver.persistence.ProductionError):custody.capture(path,9)
        linked=self.root/'link';linked.symlink_to(path)
        with self.assertRaises(driver.persistence.ProductionError):custody.capture(linked,10)
        import os
        fifo=self.root/'fifo';os.mkfifo(fifo)
        with self.assertRaises(driver.persistence.ProductionError):custody.capture(fifo,10)

    def test_overlap_unknowns_and_feature_class_conversion(self):
        original=make_case(unknown_features=True);routes=custody.RouteContext(original.routes.header,original.routes.rows)
        formulas={row.record_id:0 for row in original.features}
        audit=custody.overlap_metadata(original.features,routes,formulas)
        self.assertEqual(audit['equalities']['normalized_composition']['known_groups'],0)
        self.assertEqual(audit['equalities']['normalized_composition']['unresolved_rows'],314)
        self.assertEqual(audit['equalities']['formula_token']['cross_role_groups'],1)
        self.assertEqual(audit['equalities']['source_token']['cross_role_groups'],0)
        local={'rows':[{'ordinal':r.ordinal,'record_id':r.record_id,'composition':{'values':['1/3','2/3']+['0']*116},'metadata':{'processing':{'status':'UNRESOLVED','value':None}}} for r in routes.rows]}
        features=custody.convert_feature_rows(local,routes)
        self.assertEqual(len(features),314)
        self.assertIs(type(features[0].composition),custody.kernel.NormalizedVector)
        self.assertEqual(features[0].composition.values[0],Fraction(1,3))

    def test_case_substitution_and_mutable_snapshots_rejected(self):
        original=make_case();case,store,custodian=self.prepare(original)
        changed=replace(case,features=(replace(case.features[0],composition=None),)+case.features[1:])
        with self.assertRaises(driver.persistence.ProductionError):custody.validate_case(changed)
        with self.assertRaises(TypeError):case.input_payload['features'][0]['composition']=None
        with self.assertRaises(TypeError):case.source['sha256']='0'*64
        custody.validate_case(case)

    def test_registered_authority_denied_before_any_input_read(self):
        class Fake:
            class RegistrationIdentity:pass
            _AUTHORITY=object()
        with patch.object(custody,'capture',side_effect=AssertionError('FORBIDDEN_READ')) as read:
            with self.assertRaises(driver.persistence.ProductionError):
                custody.prepare_registered(object(),None,None,None,None,registration_module=Fake)
            read.assert_not_called()

    def test_ordinary_string_cap_no_target_exception_echo(self):
        with self.assertRaises(driver.persistence.ProductionError):custody.bounded({'ordinary':'X'*2049})
        with self.assertRaises(driver.persistence.ProductionError):custody.bounded({'ordinary':'1'+'0'*2050+'/3'})
        result=self.run_case(make_case(),checkpoint=lambda _:(_ for _ in ()).throw(ValueError('SECRET_TARGET_CANARY')))
        self.assertEqual(result.status,'BLOCKED');self.assertEqual(result.reasons,('INTERNAL_FAILURE',))
        self.assertNotIn('SECRET_TARGET_CANARY',str(result.reasons))

    def test_failed_resource_observation_is_unknown_not_zero(self):
        with patch.object(driver.stage_usage.StageUsage,'start',side_effect=ValueError('SECRET_RESOURCE')):
            result=self.run_case(make_case(missing_development=True))
        self.assertEqual(result.status,'NO_GO_INSUFFICIENT_DEVELOPMENT')
        for stage in result.store.stages:
            usage=driver.io._loads(result.store.stage_bytes(stage))['usage']
            self.assertEqual(usage['measurement_status'],'UNAVAILABLE')
            self.assertIsNone(usage['stage_resource'])
            self.assertEqual(usage['measurement_reason'],'USAGE_OBSERVATION_UNAVAILABLE')
            self.assertNotIn('SECRET_RESOURCE',driver.io.canonical(usage).decode())

    def test_only_trusted_kernel_error_arguments_receive_closed_mapping(self):
        self.assertEqual(driver.error_code(driver.helpers.kernel.StudyError('ARITHMETIC_LIMIT')),'ARITHMETIC_LIMIT')
        self.assertEqual(driver.error_code(driver.helpers.kernel.StudyError('PRIVATE_UNKNOWN')),'INTERNAL_FAILURE')
        self.assertEqual(driver.error_code(ValueError('ARITHMETIC_LIMIT')),'INTERNAL_FAILURE')
        self.assertEqual(driver.error_code(driver.helpers.kernel.StudyError('ARITHMETIC_LIMIT','PRIVATE_UNKNOWN')),'INTERNAL_FAILURE')


if __name__=='__main__':unittest.main()
