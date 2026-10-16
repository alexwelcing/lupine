"""Independent persistent-driver boundary tests with constructed source bytes."""
from dataclasses import replace
from fractions import Fraction
from hashlib import sha256
import json
from pathlib import Path
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
from mpea_review_constructed_case import d,make_case


class DriverReview(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory(prefix='constructed-',dir=HERE)
        cls.root=Path(cls.temp.name)
        cls.attempts=cls.root/'attempts'
        cls.patcher=patch.object(d.storemod,'ATTEMPTS',cls.attempts);cls.patcher.start()
        cls.case=make_case()
        cls.sequence=[];cls.runs=[];cls.decoded=[];cls.truth=None
        original_parse=d.custody.parse_fixture_targets
        original_target=d.custody.parse_target
        original_fit=d.kernel.fit_development
        original_finish=d.PolicyOracle.finish
        original_audit=d.FixtureCustodian.audit_truth
        def parse(raw,routes,roles):
            stage_files=tuple(sorted(p.name for p in (cls.attempts/'baseline').glob('[0-9][0-9]-*.json')))
            cls.sequence.append(('parse',roles,stage_files))
            return original_parse(raw,routes,roles)
        def target(raw,name):
            cls.decoded.append((raw,name))
            return original_target(raw,name)
        def fit(rows):
            cls.sequence.append(('fit',tuple(row.feature.record_id for row in rows),
                                 (cls.attempts/'baseline/02-development.json').exists()))
            return original_fit(rows)
        def finish(oracle):
            result=original_finish(oracle);cls.runs.append(result);return result
        def audit(custodian,evaluator):
            cls.sequence.append(('audit',evaluator.complete,(cls.attempts/'baseline/06-replay.json').exists()))
            cls.truth=original_audit(custodian,evaluator);return cls.truth
        with patch.object(d.custody,'parse_fixture_targets',side_effect=parse),patch.object(d.custody,'parse_target',side_effect=target),patch.object(d.kernel,'fit_development',side_effect=fit),patch.object(d.PolicyOracle,'finish',finish),patch.object(d.FixtureCustodian,'audit_truth',audit):
            cls.result=d.run_fixture(cls.case,'baseline',sampling_premise='assumed_unverified')
        cls.serial=0
        cls.baseline={stage:json.loads((cls.result.store.path/f'{i:02d}-{stage}.json').read_bytes())
                      for i,stage in enumerate(d.storemod.STAGES)}

    @classmethod
    def tearDownClass(cls):
        if hasattr(cls,'result'):cls.result.store.close()
        cls.patcher.stop();cls.temp.cleanup()

    def code(self,expected,fn,*args,**kwargs):
        with self.assertRaises(d.storemod.StageError) as caught:fn(*args,**kwargs)
        self.assertEqual(caught.exception.code,expected)
        self.assertEqual(str(caught.exception),expected)

    def prepare(self,*,through='calibration',calibration_mutator=None):
        type(self).serial+=1
        store=d.storemod.FixtureStageStore('manual-'+str(self.serial),self.case.routes.source,d.implementation_identity())
        self.addCleanup(store.close)
        custodian=d.FixtureCustodian(self.case,store)
        for stage in d.storemod.STAGES[:4]:
            store.commit(stage,self.baseline[stage]['payload'])
        if through=='rank_freeze':return store,custodian
        panels=tuple(rank.panel for rank in self.result.ranks if rank.panel.source_group in
            {str(route.source_group) for route in self.case.routes.rows if route.role in ('CALIBRATION','EVALUATION') and route.condition_eligible})
        custodian.reserved(panels,store.scientific_digests()[-1][1])
        store.commit('reserved',self.baseline['reserved']['payload'])
        if through=='reserved':return store,custodian
        payload=json.loads(json.dumps(self.baseline['calibration']['payload']))
        if calibration_mutator is not None:calibration_mutator(payload)
        store.commit('calibration',payload)
        return store,custodian

    def test_complete_shape_all960_runs_and_access_order(self):
        self.assertEqual(self.result.status,'COMPLETE')
        self.assertEqual(self.result.store.stages,d.storemod.STAGES)
        self.assertEqual(len(self.case.routes.rows),1545)
        self.assertEqual(len(self.case.features),314)
        self.assertEqual(len(self.result.ranks),75)
        self.assertEqual(len(self.runs),960)
        self.assertEqual({plan.population for plan in self.result.plans},{'primary','secondary'})
        for plan in self.result.plans:
            runs=[run for run in self.runs if run.plan_digest==plan.plan_digest]
            self.assertEqual(len(runs),480)
            self.assertEqual({(r.panel_id,r.policy_id) for r in runs},
                             {(s.panel_id,s.policy_id) for s in plan.schedules})
            schedules={(s.panel_id,s.policy_id):s for s in plan.schedules}
            for run in runs:
                self.assertEqual(tuple(row.record_id for row in run.observations),schedules[run.panel_id,run.policy_id].reveal_ids)
        parsing=[event for event in self.sequence if event[0]=='parse']
        self.assertEqual([e[1] for e in parsing],[frozenset({'DEVELOPMENT'}),frozenset({'CALIBRATION','EVALUATION'})])
        self.assertEqual(parsing[0][2][-1],'01-input_freeze.json')
        self.assertEqual(parsing[1][2][-1],'03-rank_freeze.json')
        fit=next(event for event in self.sequence if event[0]=='fit')
        self.assertTrue(fit[2])
        self.assertEqual(set(fit[1]),{r.record_id for r in self.case.routes.rows if r.condition_eligible and r.role=='DEVELOPMENT'})
        self.assertEqual(len(self.decoded),628)
        self.assertTrue(all(b'UNAUTHORIZED' not in raw and all(byte<128 for byte in raw) for raw,_ in self.decoded))
        self.assertEqual(next(e for e in self.sequence if e[0]=='audit'),('audit',True,True))

    def test_bound_oracles_reject_cross_policy_copies_order_duplicates_and_early_finish(self):
        store,custodian=self.prepare()
        evaluator=custodian.evaluator(self.result.plans)
        plan=self.result.plans[0];a,b=plan.schedules[:2]
        oa=evaluator.policy(plan.plan_digest,a.panel_id,a.policy_id)
        ob=evaluator.policy(plan.plan_digest,b.panel_id,b.policy_id)
        self.code('REPLAY_REQUEST_INVALID',evaluator.policy,plan.plan_digest,a.panel_id,a.policy_id)
        self.code('REPLAY_REQUEST_INVALID',oa.request,a.reveal_ids[1])
        self.code('REPLAY_INCOMPLETE',oa.finish)
        token=oa.request(a.reveal_ids[0])
        self.code('REPLAY_REQUEST_INVALID',oa.request,a.reveal_ids[0])
        self.code('REPLAY_REQUEST_INVALID',ob.reveal,token)
        self.code('REPLAY_REQUEST_INVALID',oa.reveal,replace(token))
        self.code('REPLAY_REQUEST_INVALID',oa.reveal,replace(token,ordinal=True))
        fake=d.PolicyOracle(evaluator,(plan.plan_digest,a.panel_id,a.policy_id))
        self.code('REPLAY_REQUEST_INVALID',fake.request,a.reveal_ids[0])
        self.assertEqual(oa.history(),());self.assertEqual(ob.history(),())
        value=oa.reveal(token)
        self.assertEqual(value.record_id,a.reveal_ids[0])
        self.assertEqual(ob.history(),())
        self.code('REPLAY_REQUEST_INVALID',oa.reveal,token)
        self.code('REPLAY_REQUEST_INVALID',oa.request,a.reveal_ids[0])
        self.code('STAGE_ORDER_VIOLATION',custodian.audit_truth,evaluator)
        store.commit('replay',{'all_policy_runs_complete':True,'completed_policy_runs':960,'runs':[]})
        self.code('REPLAY_INCOMPLETE',custodian.audit_truth,evaluator)

    def test_same_looking_tokens_from_fresh_attempt_are_rejected(self):
        _,one=self.prepare();_,two=self.prepare()
        e1=one.evaluator(self.result.plans);e2=two.evaluator(self.result.plans)
        plan=self.result.plans[0];schedule=plan.schedules[0]
        o1=e1.policy(plan.plan_digest,schedule.panel_id,schedule.policy_id)
        o2=e2.policy(plan.plan_digest,schedule.panel_id,schedule.policy_id)
        t1=o1.request(schedule.reveal_ids[0]);t2=o2.request(schedule.reveal_ids[0])
        self.assertEqual(t1,t2)
        self.code('REPLAY_REQUEST_INVALID',o1.reveal,t2)
        self.assertEqual(o1.history(),())
        self.assertEqual(o1.reveal(t1).record_id,t1.record_id)

    def test_stale_or_resealed_plans_reject_before_evaluation_vault_open(self):
        store,custodian=self.prepare()
        plans=self.result.plans
        forged_schedule=replace(plans[0].schedules[0],order=tuple(reversed(plans[0].schedules[0].order)),
                                reveal_ids=tuple(reversed(plans[0].schedules[0].reveal_ids)))
        fake=SimpleNamespace(population=plans[0].population,plan_digest=plans[0].plan_digest,
                             schedules=(forged_schedule,)+plans[0].schedules[1:])
        with patch.object(custodian,'_open',side_effect=AssertionError('evaluation must remain sealed')):
            for invalid in ((fake,plans[1]),tuple(reversed(plans)),list(plans),(),
                            (replace(plans[0],freeze_reference='0'*64),plans[1])):
                self.code('STALE_OR_INVALID_DECISION',custodian.evaluator,invalid)
        def alter(payload):payload['plans'][0]['schedules'][0]['decision_digest']='a'*64
        _,resealed=self.prepare(calibration_mutator=alter)
        with patch.object(resealed,'_open',side_effect=AssertionError('resealed invalid schedule must remain sealed')):
            self.code('STALE_OR_INVALID_DECISION',resealed.evaluator,plans)

    def test_stale_rank_and_panel_set_reject_before_reserved_decoder(self):
        store,custodian=self.prepare(through='rank_freeze')
        panels=tuple(rank.panel for rank in self.result.ranks if rank.panel.source_group in
            {str(route.source_group) for route in self.case.routes.rows if route.role in ('CALIBRATION','EVALUATION') and route.condition_eligible})
        with patch.object(d.custody,'parse_fixture_targets',side_effect=AssertionError('reserved decoder not authorized')):
            with self.assertRaises(d.storemod.StageError):custodian.reserved(panels,'0'*64)
        store,custodian=self.prepare(through='rank_freeze')
        with patch.object(d.custody,'parse_fixture_targets',side_effect=AssertionError('panel mismatch before targets')):
            with self.assertRaises(d.storemod.StageError):custodian.reserved(panels[:-1],store.scientific_digests()[-1][1])

    def test_calibration_never_opens_evaluation_and_vault_replacement_fails(self):
        store,custodian=self.prepare(through='reserved')
        original=store._read_exact;opened=[]
        def read(path,expected):opened.append(path.name);return original(path,expected)
        with patch.object(store,'_read_exact',side_effect=read):
            calibration=custodian.calibration()
        self.assertNotIn('evaluation-vault.json',opened)
        self.assertEqual(sum(map(len,calibration.values())),120)
        self.code('STAGE_ORDER_VIOLATION',custodian.evaluator,self.result.plans)
        vault=store.path/'calibration-vault.json'
        before=vault.read_bytes();vault.write_bytes(before.replace(b'CALIBRATION',b'EVALUATION_',1))
        self.code('INPUT_IDENTITY_MISMATCH',custodian.calibration)

    def test_late_framing_failure_has_no_numeric_prefix_or_model_input(self):
        with (patch.object(d.custody,'parse_target',side_effect=AssertionError('no decoder before complete framing')),
              patch.object(d.kernel,'fit_development',side_effect=AssertionError('no model before framing'))):
            self.code('CSV_COUNT_MISMATCH',d.run_fixture,make_case(late_malformed=True),'late-bad')
        path=self.attempts/'late-bad'
        failure=json.loads((path/'02-development.json').read_bytes())
        self.assertEqual(failure['status'],'BLOCKED')
        self.assertFalse((path/'03-rank_freeze.json').exists())
        self.assertFalse((path/'evaluation-vault.json').exists())

    def test_no_go_development_has_no_model_or_reserved_target_access(self):
        calls=[];original=d.custody.parse_fixture_targets
        def parse(raw,routes,roles):calls.append(roles);return original(raw,routes,roles)
        with patch.object(d.custody,'parse_fixture_targets',side_effect=parse),patch.object(d.kernel,'fit_development',side_effect=AssertionError('inadequate labels must not fit')):
            result=d.run_fixture(make_case(missing_development=True),'no-go')
        self.addCleanup(result.store.close)
        self.assertEqual(result.status,'NO_GO_INSUFFICIENT_DEVELOPMENT')
        self.assertIsNone(result.fit);self.assertIsNone(result.evaluation)
        self.assertEqual(calls,[frozenset({'DEVELOPMENT'})])
        self.assertEqual(result.store.stages,('allocation','input_freeze','development'))
        self.assertEqual(result.aggregates['DEVELOPMENT']['row_count'],63)
        self.assertEqual(result.aggregates['DEVELOPMENT']['complete_row_count'],0)
        self.assertFalse((result.store.path/'evaluation-vault.json').exists())

    def test_one_evaluation_group_missing_invalidates_all40_primary_but_keeps_empty_secondary(self):
        result=d.run_fixture(make_case(missing_evaluation=55),'one-missing',sampling_premise='assumed_unverified')
        self.addCleanup(result.store.close)
        self.assertFalse(result.completeness.all_defined)
        primary,secondary=result.plans
        self.assertEqual(primary.protocol.premise_status,'unsupported')
        self.assertTrue(all(set(decision.retained)==set(decision.original_ids) and len(decision.retained)==len(decision.original_ids) for decision in primary.decisions))
        self.assertEqual(len(secondary.ranked_future),20)
        self.assertEqual(sum(not p.candidate_ids for p in secondary.ranked_future),1)
        self.assertEqual(result.aggregates['CALIBRATION']['complete_row_count'],120)
        self.assertEqual(len(secondary.schedules),480)

    def test_all_empty_secondary_still_finishes480_empty_runs_and_undefined_rates(self):
        result=d.run_fixture(make_case(all_reserved_missing=True),'all-missing',sampling_premise='assumed_unverified')
        self.addCleanup(result.store.close)
        self.assertEqual(len(result.plans[1].schedules),480)
        self.assertTrue(all(not s.reveal_ids for s in result.plans[1].schedules))
        self.assertTrue(all(not p.candidate_ids for p in result.plans[1].ranked_future))
        self.assertIsNone(result.evaluation.component_verdicts['pool_usefulness'])
        replay=json.loads((result.store.path/'06-replay.json').read_bytes())['payload']
        self.assertTrue(replay['all_policy_runs_complete']);self.assertEqual(replay['completed_policy_runs'],960)

    def test_incomplete_or_duplicate_ledgers_are_rejected_by_final_audit(self):
        plan=self.result.plans[0]
        runs=tuple(run for run in self.runs if run.plan_digest==plan.plan_digest)
        for bad in (runs[:-1],runs[:-1]+(runs[0],),()):
            with self.assertRaises(d.kernel.StudyError):d.kernel.audit_replay(plan,bad,self.truth)

    def test_sanitized_failures_preserve_exact_prefix_without_reserved_vault(self):
        with patch.object(d.kernel,'rank_panel',side_effect=RuntimeError('PRIVATE_SYNTHETIC_CANARY')):
            self.code('INTERNAL_FAILURE',d.run_fixture,self.case,'failed-rank')
        path=self.attempts/'failed-rank'
        self.assertEqual(tuple(p.name for p in sorted(path.glob('[0-9][0-9]-*.json'))),
                         ('00-allocation.json','01-input_freeze.json','02-development.json','03-rank_freeze.json'))
        raw=(path/'03-rank_freeze.json').read_bytes()
        self.assertNotIn(b'PRIVATE_SYNTHETIC_CANARY',raw)
        self.assertEqual(json.loads(raw)['status'],'BLOCKED')
        self.assertFalse((path/'evaluation-vault.json').exists())

    def test_source_change_blocks_before_first_target_phase_and_rationals_are_closed(self):
        before=d.implementation_identity();changed=dict(before);changed['mpea_fixture_driver']='e'*64
        with patch.object(d,'implementation_identity',side_effect=[before,before,changed,changed]),patch.object(d.custody,'parse_fixture_targets',side_effect=AssertionError('no target entry')):
            self.code('IMPLEMENTATION_MISMATCH',d.run_fixture,self.case,'changed-implementation')
        self.assertTrue((self.attempts/'changed-implementation/00-allocation.json').exists())
        self.assertFalse((self.attempts/'changed-implementation/01-input_freeze.json').exists())
        for value in ('1/00','1/000','00/1','1/01','2/2',True,1,{},'1/'+'9'*156):
            self.code('SCHEMA_INVALID',d._rational,value)
        self.assertEqual(d._rational('0/1'),Fraction(0))

    def test_resealed_input_metadata_cannot_authorize_development_decoding(self):
        for corrupted_stage in ('allocation','input_freeze'):
            with self.subTest(stage=corrupted_stage):
                type(self).serial+=1
                store=d.storemod.FixtureStageStore('bad-input-'+str(self.serial),self.case.routes.source,d.implementation_identity())
                self.addCleanup(store.close)
                custodian=d.FixtureCustodian(self.case,store)
                for stage in ('allocation','input_freeze'):
                    payload=json.loads(json.dumps(self.baseline[stage]['payload']))
                    if stage==corrupted_stage:
                        if stage=='allocation':payload['routes']['routes'][0]['condition_eligible']=False
                        else:payload['features'][0]['ordinal']=False
                    store.commit(stage,payload)
                with patch.object(d.custody,'parse_fixture_targets',side_effect=AssertionError('wrong input metadata must not authorize decoder')):
                    self.code('INPUT_IDENTITY_MISMATCH',custodian.development)

    def test_two_fresh_processes_reproduce_all_eight_stage_scientific_digests(self):
        child=('import sys,json;from pathlib import Path;sys.path.insert(0,sys.argv[1]);'
               'from mpea_review_constructed_case import d,make_case;d.storemod.ATTEMPTS=Path(sys.argv[2]);'
               'r=d.run_fixture(make_case(),sys.argv[3]);'
               'print(json.dumps(r.store.scientific_digests()));r.store.close()')
        answers=[]
        for attempt in ('fresh-a','fresh-b'):
            completed=subprocess.run([sys.executable,'-c',child,str(HERE),str(self.attempts),attempt],
                stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=60,check=False)
            self.assertEqual(completed.returncode,0,completed.stderr.decode())
            answers.append(json.loads(completed.stdout))
        self.assertEqual(answers[0],answers[1]);self.assertEqual(len(answers[0]),8)


if __name__=='__main__':unittest.main()
