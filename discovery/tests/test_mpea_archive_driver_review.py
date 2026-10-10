"""Independent constructed-source workflow controls, no actual scientific data."""
from dataclasses import replace
from fractions import Fraction as F
from hashlib import sha256
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

HERE=Path(__file__).resolve().parent
ROOT=next(parent for parent in HERE.parents if (parent/'src/lupine_discovery/decision_pool.py').is_file()
          and (parent/'scripts/mpea_features.py').is_file())
for path in (ROOT/'src',ROOT/'scripts',ROOT/'tests',HERE):sys.path.insert(0,str(path))
CONTROL_ROOT=ROOT/'.cache/reviewer-controls'
from mpea_archive_review_constructed_case import make_case
from test_mpea_production_store_review import registration
import mpea_archive_driver as d
import mpea_archive_custody as c


def declared_input_identities(case):
    return {'feature':dict(case.feature_identity),'label_routes':dict(case.route_identity),
            **{key:dict(value) for key,value in case.input_context['metadata_receipts'].items()}}


class IndependentArchiveDriverReview(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        CONTROL_ROOT.mkdir(mode=0o700,parents=True,exist_ok=True)
        cls.temp=tempfile.TemporaryDirectory(dir=CONTROL_ROOT,prefix='archive-core-driver-')
        cls.patch=patch.object(d.persistence,'OUTPUT_ROOT',Path(cls.temp.name)/'attempts');cls.patch.start()
        cls.case=make_case();cls.events=[];cls.decoder_stages=[];cls.consumer_stages=[]
        parser=c.parser.parse_target;fit=d.helpers.kernel.fit_development;rank=d.helpers.kernel.rank_panel
        state={'last':None,'target_begin':False}
        def checkpoint(event):
            cls.events.append(dict(event))
            if event['event']=='STAGE_SEALED':state['last']=event['stage']
            if event['event']=='TARGET_PHASE_BEGIN':state['target_begin']=True
        def decode(raw,name):
            if not state['target_begin']:raise AssertionError('decoder entered before target marker')
            if b'UNAUTHORIZED' in raw:raise AssertionError('outside-condition target reached decoder')
            cls.decoder_stages.append(state['last']);return parser(raw,name)
        def fit_guard(*args,**kwargs):
            cls.consumer_stages.append(('fit',state['last']));return fit(*args,**kwargs)
        def rank_guard(*args,**kwargs):
            cls.consumer_stages.append(('rank',state['last']));return rank(*args,**kwargs)
        with patch.object(c.parser,'parse_target',side_effect=decode),patch.object(d.helpers.kernel,'fit_development',side_effect=fit_guard),patch.object(d.helpers.kernel,'rank_panel',side_effect=rank_guard):
            cls.result=d.run_synthetic(cls.case,'complete',registration(),checkpoint=checkpoint,sampling_premise='assumed_unverified')

    @classmethod
    def tearDownClass(cls):
        cls.result.store.close();cls.patch.stop();cls.temp.cleanup()

    def artifact(self,result,stage):
        index=d.persistence.STAGES.index(stage)
        return result.store.read_artifact(f'stage-{index:02d}-{stage.replace("_","-")}.json',result.store.stage_identity(stage))

    def run_case(self,case,name,**kwargs):
        result=d.run_synthetic(case,name,registration(),**kwargs);self.addCleanup(result.store.close);return result

    def prepared(self,case,name):
        source=case.routes.source
        store=d.persistence.ProductionStageStore(name,registration(),{'bytes':source.byte_count,'md5':source.md5,'sha256':source.sha256},execution_kind='SYNTHETIC_FIXTURE')
        self.addCleanup(store.close);allocation_store=d.AllocationUsageStore(store)
        routes=c.RouteContext(case.routes.header,case.routes.rows)
        route=allocation_store.write_artifact('label-routes.json',c._route_payload(routes,'c'*64),schema='lupine.discovery.mpea.label_routes.v1')
        allocation_store.commit('allocation',{'route_artifact':route,'role_map_sha256':route['bytes_sha256']},inputs={'label_routes':route})
        archive=c.fixture_case(case,store,store.stage_identity('allocation'),route)
        return archive,store

    def test_complete_actual_shaped_workflow_and_ordered_consumer_boundaries(self):
        self.assertEqual(self.result.status,'COMPLETE',self.result.reasons)
        self.assertEqual(self.result.store.stages,d.persistence.STAGES)
        self.assertEqual([e['stage'] for e in self.events if e['event']=='STAGE_SEALED'],list(d.persistence.STAGES))
        self.assertEqual(self.events[2],{'event':'TARGET_PHASE_BEGIN'})
        self.assertEqual(self.decoder_stages,['input_freeze']*126+['rank_freeze']*502)
        self.assertEqual(self.consumer_stages,[('fit','development')]+[('rank','development')]*75)
        self.assertEqual((self.result.source_captures,self.result.captured_bytes),(1,len(self.case.raw)))
        self.assertEqual(self.result.access,(('DEVELOPMENT',63),('CUSTODIAN_CALIBRATION',120),('CUSTODIAN_EVALUATION',131),
            ('CALIBRATION_VAULT_OPEN',120),('EVALUATION_VAULT_OPEN',131),('EVALUATION_VAULT_OPEN',131)))

    def test_all_960_ledgers_and_every_original_condition_row_remain_bound(self):
        replay=self.artifact(self.result,'replay')['payload']
        self.assertEqual(replay['completed_policy_runs'],960);self.assertIs(replay['all_policy_runs_complete'],True)
        self.assertEqual(tuple(map(len,replay['runs'])),(480,480))
        for plan,runs in zip(self.result.plans,replay['runs']):
            self.assertEqual(len(plan.schedules),480)
            self.assertEqual({(run['panel_id'],run['policy_id']) for run in runs},
                {(schedule.panel_id,schedule.policy_id) for schedule in plan.schedules})
            self.assertEqual(len(plan.future_panels),20);self.assertEqual(len(plan.calibration_panels),20)
        frozen=self.artifact(self.result,'input_freeze')['payload']
        self.assertEqual(frozen['original_rows'],1545);self.assertEqual(len(frozen['features']),314)
        self.assertEqual({row['record_id'] for row in frozen['features']},{row.record_id for row in self.case.features})
        self.assertEqual(self.artifact(self.result,'evaluation')['payload']['evaluation']['evaluation_digest'],self.result.evaluation.evaluation_digest)

    def test_every_reserved_order_is_frozen_before_targets_and_secondary_is_literal_restriction(self):
        frozen=self.artifact(self.result,'rank_freeze')['payload'];self.assertEqual(len(frozen['ranks']),75)
        rank_map={item['panel']['panel_id']:item for item in frozen['ranks']}
        secondary=self.result.plans[1]
        for panel in secondary.future_panels:
            original=rank_map[panel.panel.panel_id]
            self.assertEqual(original['rank_digest'],panel.rank_digest)
            for policy in d.helpers.kernel.FULL_POLICIES:
                retained=set(secondary.completeness.complete_ids[panel.panel.panel_id])
                expected=tuple(record for record in original['orders'][policy] if record in retained)
                schedule=next(s for s in secondary.schedules if s.panel_id==panel.panel.panel_id and s.policy_id==policy)
                self.assertEqual(schedule.order,expected)

    def test_failed_complete_source_framing_decodes_no_target_and_preserves_stage_prefix(self):
        with patch.object(c.parser,'parse_target',side_effect=AssertionError('unexpected decoder')) as decoder:
            result=self.run_case(make_case(late_malformed=True),'late-framing')
        self.assertEqual(result.status,'BLOCKED');self.assertIn(result.reasons[0],('CSV_COUNT_MISMATCH','CSV_FRAMING_INVALID'))
        decoder.assert_not_called();self.assertEqual(result.access,())
        self.assertEqual(result.store.stages,('allocation','input_freeze','development'))
        self.assertEqual(self.artifact(result,'development')['status'],'BLOCKED')
        self.assertFalse((result.store.path/'calibration-vault.json').exists())

    def test_inadequate_development_has_no_model_or_reserved_access(self):
        with patch.object(d.helpers.kernel,'fit_development',side_effect=AssertionError('unexpected fit')) as fit:
            result=self.run_case(make_case(missing_development=True),'inadequate')
        self.assertEqual(result.status,'NO_GO_INSUFFICIENT_DEVELOPMENT');fit.assert_not_called()
        self.assertEqual(set(result.reasons),{'DEVELOPMENT_ROWS_BELOW_50','DEVELOPMENT_GROUPS_BELOW_15'})
        self.assertEqual(result.access,(('DEVELOPMENT',63),));self.assertIsNone(result.evaluation)
        self.assertEqual(result.aggregates['DEVELOPMENT']['row_count'],63)
        self.assertIsNone(result.aggregates['CALIBRATION']);self.assertIsNone(result.aggregates['EVALUATION'])

    def test_corrupt_rank_receipt_blocks_reserved_decode_and_future_vault_creation(self):
        decoded=[];parse=c.parser.parse_target
        def trace(raw,name):decoded.append(name);return parse(raw,name)
        def checkpoint(event):
            if event.get('stage')=='rank_freeze':
                path=Path(self.temp.name)/'attempts'/'rank-drift'/'stage-03-rank-freeze.json'
                path.write_bytes(path.read_bytes()+b' ')
        with patch.object(c.parser,'parse_target',side_effect=trace):
            result=self.run_case(self.case,'rank-drift',checkpoint=checkpoint)
        self.assertEqual(result.status,'BLOCKED');self.assertEqual(len(decoded),126)
        self.assertEqual(result.reasons,('INPUT_IDENTITY_MISMATCH',))
        self.assertFalse((result.store.path/'evaluation-vault.json').exists())
        self.assertEqual(result.access,(('DEVELOPMENT',63),))
        # A typed unavailable result preserves the incident, but its corrupt
        # persisted prefix must never be accepted for downstream publication.
        with self.assertRaises((d.persistence.ProductionError,c.io.StageError)):
            d.validate_result(result)

    def test_source_size_md5_and_sha_are_checked_before_any_framing(self):
        for index,change in enumerate((lambda raw:raw[:-1],lambda raw:raw+b'X',lambda raw:raw.replace(b'opaque',b'opaquE',1))):
            case,store=self.prepared(self.case,'source-'+str(index));store.commit('input_freeze',case.input_payload,inputs=declared_input_identities(case))
            loader=lambda:change(self.case.raw)
            custodian=c.ArchiveCustodian(case,store,loader,authority=c._AUTHORITY)
            with patch.object(c.parser,'_authorized_cells',side_effect=AssertionError('unexpected framing')) as frame:
                with self.assertRaises(d.persistence.ProductionError):custodian.development()
                frame.assert_not_called()
            self.assertEqual(custodian.access,[])

    def test_input_receipt_or_missing_predecessor_blocks_source_loader(self):
        for index,sealed in enumerate((False,True)):
            case,store=self.prepared(self.case,'freeze-'+str(index))
            if sealed:store.commit('input_freeze',dict(case.input_payload,condition_rows=313),inputs=declared_input_identities(case))
            reads=[]
            custodian=c.ArchiveCustodian(case,store,lambda:(reads.append(1),self.case.raw)[1],authority=c._AUTHORITY)
            with self.assertRaises((d.persistence.ProductionError,c.io.StageError)):custodian.development()
            self.assertEqual(reads,[])

    def test_development_capability_cannot_be_reused_after_successful_decode(self):
        case,store=self.prepared(self.case,'reuse');store.commit('input_freeze',case.input_payload,inputs=declared_input_identities(case))
        custodian=c.fixture_custodian(self.case,case,store)
        self.assertEqual(len(custodian.development()),63)
        with self.assertRaises(d.persistence.ProductionError):custodian.development()
        self.assertEqual(custodian.captures,1)

    def test_unknown_vectors_are_excluded_from_equality_groups_and_processing_is_explicit(self):
        rows=tuple(replace(row,composition=None) if index%2 else row for index,row in enumerate(self.case.features))
        routes=c.RouteContext(self.case.routes.header,self.case.routes.rows)
        formulas={row.record_id:None if index%3==0 else index%5 for index,row in enumerate(rows)}
        result=c.overlap_metadata(rows,routes,formulas)['equalities']
        self.assertEqual(result['normalized_composition']['unresolved_rows'],157)
        self.assertEqual(result['combined_descriptor']['unresolved_rows'],157)
        self.assertEqual(result['formula_token']['unresolved_rows'],105)
        known={tuple(row.composition.values) for row in rows if row.composition is not None}
        self.assertEqual(result['normalized_composition']['known_groups'],len(known))
        self.assertEqual(result['source_token']['cross_role_groups'],0)

    def test_ordinary_long_rational_looking_strings_cannot_get_typed_fraction_budget(self):
        number=F(10**2100+1,3)
        text=f'{number.numerator}/{number.denominator}'
        self.assertGreater(len(text),2048)
        with self.assertRaises(d.persistence.ProductionError):c.bounded({'ordinary':text})
        self.assertEqual(c.bounded({'threshold':number})['threshold'],text)

    def test_all_reserved_unknowns_keep_primary_universe_and_every_empty_secondary_ledger(self):
        result=self.run_case(make_case(all_reserved_missing=True),'unknown-reserved',sampling_premise='assumed_unverified')
        self.assertEqual(result.status,'COMPLETE',result.reasons)
        self.assertIs(result.completeness.all_defined,False)
        primary,secondary=result.plans
        self.assertEqual(primary.calibration.status,'unsupported_premise')
        self.assertTrue(all(len(decision.retained)==len(panel.panel.rows) for decision,panel in zip(primary.decisions,primary.future_panels)))
        self.assertTrue(all(not values for values in secondary.completeness.complete_ids.values()))
        self.assertTrue(all(not schedule.order and not schedule.reveal_ids for schedule in secondary.schedules))
        self.assertEqual(self.artifact(result,'replay')['payload']['completed_policy_runs'],960)
        self.assertEqual(result.evaluation.denominators['feasible_secondary_panels'],0);self.assertEqual(result.evaluation.denominators['discovery_secondary_panels'],0)
        self.assertIsNone(result.evaluation.component_verdicts['pool_usefulness'])
        self.assertIsNone(result.evaluation.component_verdicts['ranking_usefulness'])

    def test_invalid_or_stale_population_plans_never_open_future_vault(self):
        source=self.case.routes.source
        store=d.persistence.ProductionStageStore('plan-validation',registration(),
            {'bytes':source.byte_count,'md5':source.md5,'sha256':source.sha256},execution_kind='SYNTHETIC_FIXTURE')
        self.addCleanup(store.close)
        allocation_store=d.AllocationUsageStore(store)
        allocation=self.artifact(self.result,'allocation')
        route_identity=allocation['payload']['route_artifact']
        route_payload=self.result.store.read_artifact('label-routes.json',route_identity)['payload']
        self.assertEqual(allocation_store.write_artifact('label-routes.json',route_payload,
            schema='lupine.discovery.mpea.label_routes.v1'),route_identity)
        for stage in d.persistence.STAGES[:6]:
            envelope=self.artifact(self.result,stage)
            store.commit(stage,envelope['payload'],inputs={key:value for key,value in envelope['inputs'].items() if key!='previous'})
        case=c.fixture_case(self.case,store,store.stage_identity('allocation'),route_identity)
        custodian=c.fixture_custodian(self.case,case,store)
        changed=replace(self.result.plans[0],freeze_reference='d'*64)
        self.assertNotEqual(changed.plan_digest,self.result.plans[0].plan_digest)
        invalid=(list(self.result.plans),tuple(reversed(self.result.plans)),
            (changed,self.result.plans[1]),())
        with patch.object(custodian,'_open',side_effect=AssertionError('future vault opened for unsealed plan')) as opened:
            for plans in invalid:
                with self.assertRaises(d.persistence.ProductionError) as error:custodian.evaluator(plans)
                self.assertEqual(error.exception.code,'STALE_OR_INVALID_DECISION')
            opened.assert_not_called()
        self.assertEqual(custodian.access,[]);self.assertEqual(custodian.captures,0)

    def test_fresh_process_same_constructed_fixed_roles_reproduces_every_scientific_stage(self):
        environment=os.environ.copy();environment.pop('PYTHONPATH',None)
        process=subprocess.run([sys.executable,str(HERE/'mpea_archive_review_reproduction.py'),self.temp.name],
            stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=environment,timeout=150,check=False)
        self.assertEqual(process.returncode,0,process.stderr.decode())
        result=json.loads(process.stdout)
        self.assertEqual(result['status'],'COMPLETE',result['reasons'])
        self.assertEqual(result['scientific_digests'],[list(pair) for pair in self.result.store.scientific_digests()])
        # This child independently recomputes the same constructed fixed roles.
        # It does not import allocation bytes: each receipt binds its own measured
        # usage while all scientific fields and exact role metadata must agree.
        parent=self.artifact(self.result,'allocation');child=result['allocation_envelope']
        source=self.case.routes.source
        expected_source={'bytes':source.byte_count,'md5':source.md5,'sha256':source.sha256}
        d.persistence.verify_envelope(child,registration(),expected_source,execution_scope='synthetic_fixture')
        child_raw=d.io.canonical(child);parent_raw=self.result.store.stage_bytes('allocation')
        self.assertEqual(result['allocation_identity'],{'bytes_sha256':sha256(child_raw).hexdigest(),
            'content_sha256':child['content_sha256'],'scientific_sha256':child['scientific_sha256']})
        self.assertEqual(self.result.store.stage_identity('allocation'),{'bytes_sha256':sha256(parent_raw).hexdigest(),
            'content_sha256':parent['content_sha256'],'scientific_sha256':parent['scientific_sha256']})
        self.assertEqual(d.io.canonical(child['source']),d.io.canonical(expected_source))
        self.assertEqual(d.io.canonical(d.persistence.scientific_preimage(child)),
            d.io.canonical(d.persistence.scientific_preimage(parent)))
        self.assertEqual(child['scientific_sha256'],parent['scientific_sha256'])
        parent_route=parent['payload']['route_artifact']
        self.assertEqual(result['label_routes_identity'],parent_route)
        self.assertEqual(result['label_routes_bytes_sha256'],parent_route['bytes_sha256'])
        self.assertEqual(result['label_routes_bytes_sha256'],sha256(self.result.store.artifact_bytes('label-routes.json',parent_route)).hexdigest())
        # Canonical whole receipts differ exactly when their usage differs. The
        # genuine fixed-allocation import test separately requires byte equality.
        same_usage=d.io.canonical(child['usage'])==d.io.canonical(parent['usage'])
        self.assertEqual(child_raw==parent_raw,same_usage)
        self.assertEqual(child['content_sha256']==parent['content_sha256'],same_usage)
        self.assertEqual(result['allocation_identity']['bytes_sha256']==self.result.store.stage_identity('allocation')['bytes_sha256'],same_usage)
        self.assertEqual(d.io.canonical({k:v for k,v in child.items() if k not in ('usage','content_sha256')}),
            d.io.canonical({k:v for k,v in parent.items() if k not in ('usage','content_sha256')}))
        self.assertEqual(result['evaluation_digest'],self.result.evaluation.evaluation_digest)
        self.assertEqual((result['source_captures'],result['captured_bytes']),(1,len(self.case.raw)))


class IndependentRegistrationHandoffReview(unittest.TestCase):
    def test_unissued_or_synthetic_registration_stops_before_source_or_feature_read(self):
        authority=object()
        class RegistrationIdentity:
            def __init__(self,mode,issued):self.mode=mode;self._authority=authority if issued else None
        module=SimpleNamespace(RegistrationIdentity=RegistrationIdentity,_AUTHORITY=authority,
            verify_registered_sources=lambda _:self.fail('untrusted registration reached source verifier'))
        for mode,issued in (('SYNTHETIC',True),('PARENT_LIVE',False),('WORKER_PARENT_TRUST',False),('UNKNOWN',True)):
            registration_=RegistrationIdentity(mode,issued)
            with patch.object(c,'capture',side_effect=AssertionError('unexpected input read')) as capture:
                with self.assertRaises(d.persistence.ProductionError):
                    c.prepare_registered(registration_,None,None,None,None,registration_module=module)
                with self.assertRaises(d.persistence.ProductionError):
                    c.registered_custodian(None,None,registration_,registration_module=module)
                capture.assert_not_called()

    def test_registered_flow_passes_full_manifest_preflight_to_each_seal(self):
        # This is deliberately a source-free wiring test. Authentication itself
        # belongs to the separately reviewed parent/worker registration verifier.
        events=[];registration_=object();case=object();custodian=object();answer=object()
        module=SimpleNamespace(verify_registered_sources=lambda value:events.append(value))
        def execute(case_arg,store,custodian_arg,*,sampling_premise,checkpoint,preflight,allocation_marker_emitted,
                    input_observation,allocation_import_usage):
            self.assertIs(case_arg,case);self.assertIs(custodian_arg,custodian)
            self.assertEqual(sampling_premise,'unsupported');self.assertTrue(callable(preflight))
            self.assertIs(allocation_marker_emitted,False)
            self.assertIsInstance(input_observation,d.StageObservation)
            self.assertIsNone(allocation_import_usage)
            preflight();return answer
        with patch.object(c,'prepare_registered',return_value=case),patch.object(c,'registered_custodian',return_value=custodian),patch.object(d,'_execute',side_effect=execute):
            actual=d.run_registered(registration_,None,SimpleNamespace(sampling_premise='unsupported'),None,None,
                registration_module=module,checkpoint=lambda _:None)
        self.assertIs(actual,answer);self.assertEqual(events,[registration_,registration_])


if __name__=='__main__':unittest.main()
