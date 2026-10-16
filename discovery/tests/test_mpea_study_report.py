"""Closed public projection controls; only constructed kernel records are used."""
from dataclasses import FrozenInstanceError, fields, replace
from fractions import Fraction as F
from hashlib import sha256
import copy
import json
from pathlib import Path
import sys
import unittest

TEST_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = next(parent for parent in Path(__file__).resolve().parents
    if (parent/'src/lupine_discovery/decision_pool.py').is_file() and (parent/'scripts/mpea_features.py').is_file())
for directory in reversed((TEST_ROOT/'scripts',TEST_ROOT/'tests',REPOSITORY/'scripts',REPOSITORY/'src')):
    if str(directory) not in sys.path:
        sys.path.insert(0,str(directory))
import mpea_study as k
import mpea_study_report as p
from test_mpea_study import fixtures, replay
if Path(p.__file__).resolve() != TEST_ROOT/'scripts/mpea_study_report.py':
    raise RuntimeError('projector module identity mismatch')


def target_summary(group_rows, unknown_reason='EMPTY_TOKEN'):
    statuses={name:dict.fromkeys(p.TARGET_REASONS,0) for name in p.TARGET_NAMES}
    reasons={name:dict.fromkeys(p.ALL_TARGET_REASONS,0) for name in p.TARGET_NAMES}
    state=next(state for state,codes in p.TARGET_REASONS.items() if unknown_reason in codes)
    for _,row in group_rows:
        for name in p.TARGET_NAMES:
            valid=getattr(row,name) is not None
            statuses[name]['VALID' if valid else state]+=1
            reasons[name]['FINITE_NONNEGATIVE_RECORDED_POINT' if valid else unknown_reason]+=1
    return p.TargetAggregates(len(group_rows),sum(row.complete for _,row in group_rows),
        len({group for group,row in group_rows if row.complete}),statuses,reasons)


def context(evaluation, unknown_reason='EMPTY_TOKEN'):
    plan=evaluation.primary.plan
    groups={
        'DEVELOPMENT':tuple((r.feature.source_group,r.targets) for r in plan.fit.development),
        'CALIBRATION':tuple((panel.panel.source_group,row) for panel in plan.calibration_panels for row in plan.calibration_targets[panel.panel.panel_id]),
        'EVALUATION':tuple((panel.panel.source_group,row) for panel in plan.future_panels for row in evaluation.primary.truth[panel.panel.panel_id])}
    role_counts={role:p.RoleCounts(len(rows),len({g for g,_ in rows})) for role,rows in groups.items()}
    counts={role:len(rows) for role,rows in groups.items()}
    identity=lambda n:p.ArtifactIdentity(sha256(('bytes-'+n).encode()).hexdigest(),sha256(('content-'+n).encode()).hexdigest(),sha256(('science-'+n).encode()).hexdigest())
    registration=p.RegistrationSummary('a'*40,'1'*64,'2'*64,'3'*64,'4'*64,'5'*64,identity('registration'))
    return p.PublicContext(registration,p.SourceIdentity(1000,'6'*32,'7'*64),
        {name:identity(name) for name in p.INPUT_NAMES},'synthetic_fixture',
        p.FunnelCounts(1545,sum(counts.values()),sum(c.source_groups for c in role_counts.values()),1545-sum(counts.values()),0),
        role_counts,{role:target_summary(rows,unknown_reason) for role,rows in groups.items()},
        p.AccessCounts(1,1000,counts,counts,counts,counts['DEVELOPMENT'],counts['CALIBRATION'],
            evaluation.costs['policy_bundle_requests'],counts['EVALUATION']),p.Usage(F(3,2),F(1),4096))


def evaluated(*,missing=(),all_infeasible=False,future_values=(10,10),m=2):
    secondary,truth=fixtures(m=m,missing=missing,all_infeasible=all_infeasible,future_values=future_values)
    return k.evaluate_study(replay(replace(secondary,population='primary'),truth),replay(secondary,truth))


class PublicReportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.evaluation=evaluated()
        cls.context=context(cls.evaluation)
        cls.projection=p.project_evaluation(cls.evaluation,cls.context)

    def test_complete_closed_projection_preserves_gates_960_runs_and_all_controls(self):
        report=self.projection.as_dict(); payload=report['payload']; evaluation=self.evaluation
        self.assertEqual(report['status'],'COMPLETE')
        self.assertEqual(report['reasons'],[])
        self.assertEqual(payload['overall_verdict'],'NO_GO_ARCHIVAL_USEFULNESS')
        self.assertEqual(payload['run_accounting'],dict(scheduled_runs=960,completed_runs=960,populations=2,assigned_panels_per_population=20,policies_per_panel=24))
        self.assertEqual(payload['failed_gates'],list(evaluation.failed_gates))
        self.assertEqual(payload['gate_checks'],dict(evaluation.gate_checks))
        self.assertEqual(payload['gate_margins']['pool_size'],'20/1')
        self.assertEqual(payload['derived_threshold']['value'],'1/1')
        for pop in ('primary','secondary'):
            self.assertEqual(set(payload['policy_metrics'][pop]),set(k.POLICIES))
            for policy in k.POLICIES:
                item=payload['policy_metrics'][pop][policy]
                self.assertEqual(item['scheduled_runs'],20)
                self.assertEqual(item['completed_runs'],20)
                self.assertEqual([r['requested_cap'] for r in item['budget_snapshots']],list(k.BUDGETS))
                self.assertEqual(item['same_actual_pool_cost']['assigned_panels']['actual_bundle_cost']['sum'],'20/1')
        pool=payload['population_metrics']['secondary']['pool']['observed_feasible_panels']
        self.assertEqual(pool['all_optima_retained']['success_count'],0)
        self.assertEqual(pool['any_optimum_hit']['success_count'],20)
        self.assertEqual(pool['regret']['mean'],'0/1')
        self.assertEqual(payload['fallback_counts']['DEVELOPMENT']['row_count'],50)
        self.assertEqual(payload['costs']['policy_bundle_requests'],1880)

    def test_every_cap_binary_numerator_has_direct_aggregate_oracle(self):
        report=self.projection.as_dict()['payload']
        for pop,replay_result in (('primary',self.evaluation.primary),('secondary',self.evaluation.secondary)):
            for policy in k.POLICIES:
                for slot,cap in zip(report['policy_metrics'][pop][policy]['budget_snapshots'],k.BUDGETS):
                    stats=slot['metrics']['assigned_panels']
                    observed=[panel.policies[policy].snapshots[cap] for panel in replay_result.panels]
                    for field in ('any_optimum_hit','all_optima_retained','feasible_hit'):
                        self.assertEqual(stats[field]['success_count'],sum(getattr(m,field) for m in observed))
                        self.assertEqual(stats[field]['known_count'],20)
                    self.assertEqual(F(stats['actual_bundle_cost']['sum']),sum(m.actual_cost for m in observed))
                    self.assertEqual(stats['panel_count'],20)

    def test_no_private_strings_or_per_record_fields_escape(self):
        raw=self.projection.canonical_bytes()
        self.assertEqual(tuple(field.name for field in fields(self.projection)),('document',))
        self.assertFalse(hasattr(self.projection,'evaluation'))
        self.assertFalse(hasattr(self.projection,'context'))
        forbidden=set()
        for frozen in self.evaluation.primary.plan.calibration_panels+self.evaluation.primary.plan.future_panels:
            forbidden.add(frozen.panel.panel_id)
            forbidden.add(frozen.panel.source_group)
            for row in frozen.panel.rows:
                forbidden.add(row.record_id)
        for row in self.evaluation.primary.plan.fit.development:
            forbidden.add(row.feature.record_id); forbidden.add(row.feature.source_group)
        for token in forbidden:
            self.assertNotIn(('"'+token+'"').encode(),raw)
        keys=set()
        def visit(value):
            if isinstance(value,dict):
                keys.update(value)
                if 'rows' in value:
                    self.assertIs(type(value['rows']),int)
                for item in value.values():visit(item)
            elif isinstance(value,list):
                for item in value:visit(item)
        visit(json.loads(raw))
        self.assertFalse(keys & {'record_id','ordinal','source_group','panel_id','neighbors','predictions','observations','truth','ranked_ids','order','retained','cell_hash','token_hash','path','exception','traceback'})
        # Role counts use an aggregate rows count, so only forbidden raw-row arrays count.

    def test_exact_wire_and_seals_reject_resealed_injections_and_bool_counts(self):
        original=self.projection.as_dict()
        self.assertTrue(p.validate_public_report(original,self.projection))
        def mutate(value):
            value['payload']['private_records']=['forbidden']
        mutations=(mutate,
            lambda v:v['payload']['run_accounting'].__setitem__('populations',True),
            lambda v:v['payload']['derived_threshold'].__setitem__('value','1'),
            lambda v:v.__setitem__('exception','SECRET'),
            lambda v:v['payload']['failed_gates'].clear())
        for mutation in mutations:
            value=copy.deepcopy(original); mutation(value)
            value['content_sha256']=p._hash({key:item for key,item in value.items() if key!='content_sha256'})
            with self.assertRaises(p.ReportError):p.validate_public_report(value,self.projection)
        before=dict(original); seal=before.pop('content_sha256')
        self.assertEqual(seal,p._hash(before))
        self.assertLess(len(self.projection.canonical_bytes()),p.MAX_PUBLIC_BYTES)
        with self.assertRaises(TypeError):self.projection.document['payload']['costs']['development_unique_bundles']=0
        with self.assertRaises(FrozenInstanceError):self.projection.context=None

    def test_untrusted_report_depth_floats_and_oversize_are_rejected(self):
        for bad in (float('nan'),1.0,1<<10000):
            value=self.projection.as_dict();value['payload']['costs']['policy_bundle_requests']=bad
            with self.assertRaises(p.ReportError):p.validate_public_report(value,self.projection)
        value=self.projection.as_dict();current=value
        for _ in range(40):current['nested']={};current=current['nested']
        with self.assertRaises(p.ReportError):p.validate_public_report(value,self.projection)
        value=self.projection.as_dict();value['exception']='x'*5001
        with self.assertRaises(p.ReportError):p.validate_public_report(value,self.projection)
        # Rational-shaped long strings are allowed only at declared scalar slots,
        # and deterministic verification still rejects an altered rational value.
        value=self.projection.as_dict();value['payload']['derived_threshold']['value']='1'+'0'*2400+'/1'
        with self.assertRaises(p.ReportError):p.validate_public_report(value,self.projection)

    def test_count_status_and_capture_mismatch_cannot_be_reported(self):
        c=self.context
        with self.assertRaises(p.ReportError):
            p.project_evaluation(self.evaluation,replace(c,access=replace(c.access,policy_bundle_requests=0)))
        with self.assertRaises(p.ReportError):
            p.project_evaluation(self.evaluation,replace(c,access=replace(c.access,mixed_source_bytes=0)))
        with self.assertRaises(p.ReportError):
            p.project_evaluation(self.evaluation,replace(c,inputs={**c.inputs,'evaluation':None}))
        target=c.target_aggregates['EVALUATION']
        with self.assertRaises(p.ReportError):replace(target,complete_row_count=39)
        with self.assertRaises(p.ReportError):replace(c,inputs={**c.inputs,'record_hash':'a'*64})
        with self.assertRaises(p.ReportError):p.SourceIdentity(True,'a'*32,'b'*64)
        with self.assertRaises(p.ReportError):p.Usage(0.1,None,None)
        with self.assertRaises(p.ReportError):p.ArtifactIdentity('raw target',None,None)

    def test_usage_and_volatile_input_byte_changes_do_not_change_scientific_identity(self):
        first=self.projection.as_dict(); c=self.context
        inputs=dict(c.inputs); inputs['replay']=replace(inputs['replay'],bytes_sha256='d'*64,content_sha256='e'*64)
        other=p.project_evaluation(self.evaluation,replace(c,inputs=inputs,usage=p.Usage(F(999),None,None),
            registration=replace(c.registration,engineering_receipt_sha256='f'*64,ci_receipt_sha256='e'*64)))
        self.assertEqual(first['scientific_sha256'],other.document['scientific_sha256'])
        self.assertNotEqual(first['content_sha256'],other.document['content_sha256'])
        changed=dict(c.inputs);changed['replay']=replace(changed['replay'],scientific_sha256='d'*64)
        other=p.project_evaluation(self.evaluation,replace(c,inputs=changed))
        self.assertNotEqual(first['scientific_sha256'],other.document['scientific_sha256'])

    def test_failure_metadata_rejects_impossible_counts_without_inventing_unknowns(self):
        c=self.context
        with self.assertRaises(p.ReportError):replace(c.target_aggregates['DEVELOPMENT'],complete_source_group_count=0)
        with self.assertRaises(p.ReportError):p.RoleCounts(1,0)
        with self.assertRaises(p.ReportError):replace(c.access,mixed_source_captures=0)
        for field,role in (('model_visible_bundles','DEVELOPMENT'),('calibrator_visible_bundles','CALIBRATION'),
                           ('auditor_unique_bundles','EVALUATION')):
            with self.assertRaises(p.ReportError):
                replace(c,access=replace(c.access,**{field:c.role_counts[role].rows+1}))
        for name in ('accumulated_bundles','decoded_bundles','interpreted_bundles'):
            with self.assertRaises(p.ReportError):
                replace(c,access=replace(c.access,**{name:{**getattr(c.access,name),'DEVELOPMENT':49}}))
        # A completed target summary cannot substitute a strict parsed subset.
        rows=self.evaluation.primary.plan.fit.development[:49]
        summary=target_summary(tuple((r.feature.source_group,r.targets) for r in rows))
        with self.assertRaises(p.ReportError):
            replace(c,target_aggregates={**c.target_aggregates,'DEVELOPMENT':summary})
        # Known consumer counts cannot exceed a known interpretation count even
        # when a summary has not been sealed. Missing counters remain unknown.
        empty=dict.fromkeys(p.ROLES)
        access=replace(c.access,accumulated_bundles={**empty,'DEVELOPMENT':7},
            decoded_bundles={**empty,'DEVELOPMENT':7},interpreted_bundles={**empty,'DEVELOPMENT':7},
            model_visible_bundles=8,calibrator_visible_bundles=None,auditor_unique_bundles=None)
        with self.assertRaises(p.ReportError):replace(c,target_aggregates=empty,access=access)
        access=replace(access,accumulated_bundles=empty,decoded_bundles=empty,interpreted_bundles=empty,
            model_visible_bundles=None,policy_bundle_requests=None,mixed_source_captures=1,mixed_source_bytes=0)
        # An attempted capture can fail after obtaining an empty buffer. Zero
        # captures, in contrast, cannot account for positive captured bytes.
        partial=replace(c,target_aggregates=empty,access=access)
        self.assertIsNone(partial.access.interpreted_bundles['DEVELOPMENT'])
        self.assertEqual(partial.access.mixed_source_bytes,0)

    def test_unknown_counts_preserve_original_denominator_and_explicit_parser_reasons(self):
        evaluation=evaluated(missing=((20,0),))
        c=context(evaluation)
        first=p.project_evaluation(evaluation,c).as_dict()['payload']
        primary=first['population_metrics']['primary']
        self.assertEqual(primary['counts']['assigned_panels'],20)
        self.assertEqual(primary['counts']['unknown_panels'],1)
        metric=primary['pool']['assigned_panels']['all_optima_retained']
        self.assertEqual((metric['panel_denominator'],metric['known_count'],metric['unavailable_count']),(20,19,1))
        self.assertEqual(metric['unavailable_reasons']['TRUTH_UNKNOWN'],1)
        self.assertFalse(first['all_40_primary_endpoints_defined'])
        self.assertEqual(first['calibration_summary']['primary']['status'],'unsupported_premise')
        self.assertIsNone(first['calibration_summary']['primary']['threshold'])
        second=p.project_evaluation(evaluation,context(evaluation,unknown_reason='NEGATIVE_YS'))
        self.assertNotEqual(p.project_evaluation(evaluation,c).document['scientific_sha256'],second.document['scientific_sha256'])
        self.assertEqual(second.document['payload']['target_status_counts']['EVALUATION']['target_reason_counts']['yield_strength']['NEGATIVE_YS'],1)
        self.assertEqual(first['population_metrics']['secondary']['counts']['population_unknown_candidate_total'],0)

    def test_unavailable_gates_and_empty_secondary_are_not_zero_metrics(self):
        evaluation=evaluated(missing=((20,0),(20,1)),all_infeasible=True,future_values=(0,0))
        report=p.project_evaluation(evaluation,context(evaluation)).as_dict()['payload']
        self.assertIsNone(report['component_verdicts']['pool_usefulness'])
        self.assertIsNone(report['component_verdicts']['ranking_usefulness'])
        self.assertIsNone(report['gate_margins']['pool_recall'])
        self.assertNotIn('POOL_RECALL_BELOW_9_10',report['failed_gates'])
        secondary=report['population_metrics']['secondary']
        self.assertEqual(secondary['counts']['empty_panels'],1)
        self.assertEqual(secondary['pool_fraction_assigned']['unavailable_reasons']['EMPTY_PANEL'],1)
        feasible=secondary['pool']['observed_feasible_panels']
        self.assertEqual(feasible['panel_count'],0)
        self.assertIsNone(feasible['regret']['sum'])
        self.assertIsNone(feasible['any_optimum_hit']['rate'])

    def test_blocked_and_partial_payloads_never_fabricate_performance(self):
        c=self.context
        inputs={name:identity if name not in p.STAGES or p.STAGES.index(name)<=p.STAGES.index('calibration') else None for name,identity in c.inputs.items()}
        context_=replace(c,inputs=inputs,access=replace(c.access,policy_bundle_requests=17,auditor_unique_bundles=None))
        result=p.project_unavailable(context_,'INCOMPLETE',('WORKER_INTERRUPTED',),'calibration',7).as_dict()
        self.assertEqual(result['status'],'INCOMPLETE')
        self.assertEqual(result['payload']['completed_policy_runs'],7)
        self.assertEqual(result['access']['counts']['policy_bundle_requests'],17)
        for name in ('calibration_summary','population_metrics','policy_metrics','gate_margins','failed_gates','overall_verdict'):
            self.assertIsNone(result['payload'][name])
        with self.assertRaises(p.ReportError):
            p.project_unavailable(c,'INCOMPLETE',('WORKER_INTERRUPTED',),'calibration',7)
        with self.assertRaises(p.ReportError):
            p.project_unavailable(context_,'BLOCKED',('private exception text',),'calibration',0)
        early=p.PublicContext(None,None,dict.fromkeys(p.INPUT_NAMES),'synthetic_fixture',None,
            dict.fromkeys(p.ROLES),dict.fromkeys(p.ROLES),p.AccessCounts(0,0,dict.fromkeys(p.ROLES),dict.fromkeys(p.ROLES),dict.fromkeys(p.ROLES),None,None,None,None),p.Usage(None,None,None))
        blocked=p.project_unavailable(early,'BLOCKED',('REGISTRATION_MISSING',),None,0).as_dict()
        self.assertIsNone(blocked['payload']['funnel'])
        self.assertIsNone(blocked['registration'])
        self.assertIsNone(blocked['usage']['wall_seconds'])
        self.assertEqual(blocked['access']['counts']['mixed_source_captures'],0)

    def test_registered_reproduction_mode_is_not_a_new_scientific_result(self):
        inputs={name:None for name in p.INPUT_NAMES}
        c=replace(self.context,inputs=inputs,execution_kind='registered_original',
            source=p.SourceIdentity(*p.REGISTERED_SOURCE),funnel_counts=None,role_counts=dict.fromkeys(p.ROLES),
            target_aggregates=dict.fromkeys(p.ROLES),access=p.AccessCounts(0,0,dict.fromkeys(p.ROLES),dict.fromkeys(p.ROLES),dict.fromkeys(p.ROLES),None,None,None,None))
        first=p.project_unavailable(c,'BLOCKED',('REGISTRATION_MISMATCH',),None,0)
        second=p.project_unavailable(replace(c,execution_kind='registered_reproduction'),
            'BLOCKED',('REGISTRATION_MISMATCH',),None,0)
        self.assertEqual(first.document['scientific_sha256'],second.document['scientific_sha256'])
        self.assertNotEqual(first.document['content_sha256'],second.document['content_sha256'])
        synthetic=p.project_unavailable(replace(c,execution_kind='synthetic_fixture'),
            'BLOCKED',('REGISTRATION_MISMATCH',),None,0)
        self.assertNotEqual(first.document['scientific_sha256'],synthetic.document['scientific_sha256'])
        with self.assertRaisesRegex(p.ReportError,'SOURCE_IDENTITY_MISMATCH'):
            replace(c,source=self.context.source)
        with self.assertRaisesRegex(p.ReportError,'METADATA_COUNT_MISMATCH'):
            replace(c,funnel_counts=self.context.funnel_counts)

    def test_failure_availability_and_access_require_the_correct_predecessor(self):
        base=self.context
        def partial(last):
            index=-1 if last is None else p.STAGES.index(last)
            inputs={name:identity if name not in p.STAGES or p.STAGES.index(name)<=index else None for name,identity in base.inputs.items()}
            return replace(base,inputs=inputs,target_aggregates=dict.fromkeys(p.ROLES),
                access=p.AccessCounts(0,0,dict.fromkeys(p.ROLES),dict.fromkeys(p.ROLES),dict.fromkeys(p.ROLES),None,None,None,None))
        for last,role in (('input_freeze','DEVELOPMENT'),('rank_freeze','CALIBRATION'),('rank_freeze','EVALUATION')):
            c=partial(last)
            with self.assertRaisesRegex(p.ReportError,'STAGE_ORDER_VIOLATION'):
                p.project_unavailable(replace(c,target_aggregates={**c.target_aggregates,role:base.target_aggregates[role]}),
                    'BLOCKED',('WORKER_INTERRUPTED',),last,0)
        for last,field in ((None,'model_visible_bundles'),('input_freeze','model_visible_bundles'),
            ('development','calibrator_visible_bundles'),('reserved','policy_bundle_requests'),('calibration','auditor_unique_bundles')):
            c=partial(last)
            with self.assertRaisesRegex(p.ReportError,'STAGE_ORDER_VIOLATION'):
                p.project_unavailable(replace(c,access=replace(c.access,**{field:1})),
                    'BLOCKED',('WORKER_INTERRUPTED',),last,0)
        # An authorized partial development parse can truthfully report cell
        # access before its completion seal, while its summary is unavailable.
        c=partial('input_freeze')
        access=replace(c.access,mixed_source_captures=1,mixed_source_bytes=1000,
            accumulated_bundles=dict(DEVELOPMENT=7,CALIBRATION=None,EVALUATION=None),
            decoded_bundles=dict(DEVELOPMENT=6,CALIBRATION=None,EVALUATION=None),
            interpreted_bundles=dict(DEVELOPMENT=5,CALIBRATION=None,EVALUATION=None))
        projected=p.project_unavailable(replace(c,access=access),'INCOMPLETE',('WORKER_INTERRUPTED',),'input_freeze',0)
        self.assertIsNone(projected.document['payload']['target_status_counts']['DEVELOPMENT'])
        self.assertEqual(projected.document['access']['counts']['interpreted_bundles']['DEVELOPMENT'],5)
        # No cryptic later identity can replace a missing predecessor seal.
        c=partial('reserved');bad=dict(c.inputs);bad['development']=None
        with self.assertRaisesRegex(p.ReportError,'INPUT_IDENTITY_MISMATCH'):
            p.project_unavailable(replace(c,inputs=bad),'BLOCKED',('WORKER_INTERRUPTED',),'reserved',0)

    def test_insufficient_development_preserves_real_counts_without_downstream_metrics(self):
        c=self.context; rows=self.evaluation.primary.plan.fit.development[:49]
        summary=target_summary(tuple((r.feature.source_group,r.targets) for r in rows))
        role_counts=dict(c.role_counts);role_counts['DEVELOPMENT']=p.RoleCounts(49,15)
        targets=dict.fromkeys(p.ROLES);targets['DEVELOPMENT']=summary
        inputs={name:identity if name not in p.STAGES or p.STAGES.index(name)<=p.STAGES.index('development') else None for name,identity in c.inputs.items()}
        access=p.AccessCounts(1,1000,dict(DEVELOPMENT=49,CALIBRATION=None,EVALUATION=None),dict(DEVELOPMENT=49,CALIBRATION=None,EVALUATION=None),dict(DEVELOPMENT=49,CALIBRATION=None,EVALUATION=None),None,None,None,None)
        early=replace(c,inputs=inputs,funnel_counts=p.FunnelCounts(1545,129,55,1416,0),role_counts=role_counts,target_aggregates=targets,access=access)
        report=p.project_unavailable(early,'NO_GO_INSUFFICIENT_DEVELOPMENT',('DEVELOPMENT_ROWS_BELOW_50',),'development',0).as_dict()
        self.assertEqual(report['payload']['target_status_counts']['DEVELOPMENT']['complete_row_count'],49)
        self.assertIsNone(report['payload']['overall_verdict'])
        self.assertIsNone(report['payload']['target_status_counts']['CALIBRATION'])
        with self.assertRaises(p.ReportError):
            p.project_unavailable(early,'NO_GO_INSUFFICIENT_DEVELOPMENT',('DEVELOPMENT_GROUPS_BELOW_15',),'development',0)
        for last in (None,'input_freeze'):
            inputs={name:identity if name not in p.STAGES or (last is not None and p.STAGES.index(name)<=p.STAGES.index(last)) else None for name,identity in early.inputs.items()}
            with self.assertRaises(p.ReportError):
                p.project_unavailable(replace(early,inputs=inputs),'NO_GO_INSUFFICIENT_DEVELOPMENT',('DEVELOPMENT_ROWS_BELOW_50',),last,0)
        with self.assertRaisesRegex(p.ReportError,'STAGE_ORDER_VIOLATION'):
            p.project_unavailable(replace(early,access=replace(early.access,model_visible_bundles=49)),
                'NO_GO_INSUFFICIENT_DEVELOPMENT',('DEVELOPMENT_ROWS_BELOW_50',),'development',0)


if __name__=='__main__':
    unittest.main()
