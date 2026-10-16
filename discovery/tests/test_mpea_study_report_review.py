"""Independent source-shaped synthetic public-report controls; no science data."""
from dataclasses import FrozenInstanceError, fields, replace
from fractions import Fraction as F
from hashlib import sha256
import copy
import json
from pathlib import Path
import sys
import unittest

LANE=Path(__file__).resolve().parents[1]
PROJECT=next(path for path in Path(__file__).resolve().parents if (path/'src/lupine_discovery/decision_pool.py').is_file())
for directory in (PROJECT/'src',PROJECT/'scripts',LANE/'scripts'):sys.path.insert(0,str(directory))
import mpea_study as k
import mpea_study_report as p
from lupine_discovery.representation import NormalizedVector


def digest(text):return sha256(text.encode('ascii')).hexdigest()
def identity(name,science=True):return p.ArtifactIdentity(digest('bytes-'+name),digest('content-'+name),digest('science-'+name) if science else None)
def vector(x):return NormalizedVector(k.AXES,(F(x),1-F(x))+(F(0),)*116)
def feature(i,group,x):return k.FeatureRow(f'PRIVATE_RECORD_{i}',i,group,vector(x),'CAST')


def make_evaluation(missing=(),infeasible=False,infeasible_ys=F(100)):
    development=[]
    for i in range(74):
        row=feature(i,f'PRIVATE_DEVELOPMENT_SOURCE_{i%35}',0 if i<10 else 1)
        development.append(k.DevelopmentRow(row,k.Targets(row.record_id,F(100 if i<10 else 10),F(0 if i<10 else 10))))
    fit=k.fit_development(development);panels=[];labels={}
    for j in range(40):
        ordinals=tuple(range(100+6*j,106+6*j))
        good=max(ordinals,key=lambda i:digest('mpea-t25-archive-option-v1\0tie\0'+f'PRIVATE_RECORD_{i}'))
        rows=tuple(feature(i,f'PRIVATE_RESERVED_SOURCE_{j}',1 if i==good else 0) for i in ordinals)
        panel=k.AssignedPanel(f'PRIVATE_PANEL_{j:02d}',f'PRIVATE_RESERVED_SOURCE_{j}',rows)
        frozen=k.rank_panel(fit,panel);panels.append(frozen)
        labels[panel.panel_id]=tuple(k.Targets(row.record_id,None if (j,index) in missing else F(90 if row.ordinal==good else infeasible_ys),
            F(0 if infeasible else 10 if row.ordinal==good else 0)) for index,row in enumerate(rows))
    manifest=k.ReservedCompleteness(tuple(panel.panel for panel in panels),
        {name:tuple(row.record_id for row in rows if row.complete) for name,rows in labels.items()})
    truth={panel.panel.panel_id:labels[panel.panel.panel_id] for panel in panels[20:]}
    def replay(population):
        plan=k.calibrate_population(fit,tuple(panels[:20]),{panel.panel.panel_id:labels[panel.panel.panel_id] for panel in panels[:20]},
            tuple(panels[20:]),manifest,population,'assumed_unverified','a'*64,
            'PRIVATE_OBJECTIVE_REFERENCE','PRIVATE_CONSTRAINT_REFERENCE','PRIVATE_VAULT_REFERENCE')
        indexed={name:{row.record_id:row for row in rows} for name,rows in truth.items()}
        runs=tuple(k.PolicyRun(plan.plan_digest,schedule.panel_id,schedule.policy_id,schedule.decision_digest,
            tuple(indexed[schedule.panel_id][name] for name in schedule.reveal_ids)) for schedule in plan.schedules)
        return k.audit_replay(plan,runs,truth)
    return k.evaluate_study(replay('primary'),replay('secondary'))


def groups_for(evaluation):
    plan=evaluation.primary.plan
    return {'DEVELOPMENT':tuple((row.feature.source_group,row.targets) for row in plan.fit.development),
            'CALIBRATION':tuple((panel.panel.source_group,row) for panel in plan.calibration_panels for row in plan.calibration_targets[panel.panel.panel_id]),
            'EVALUATION':tuple((panel.panel.source_group,row) for panel in plan.future_panels for row in evaluation.primary.truth[panel.panel.panel_id])}


def target_summary(rows,reason='EMPTY_TOKEN'):
    statuses={quantity:{state:0 for state in p.TARGET_REASONS} for quantity in p.TARGET_NAMES}
    reasons={quantity:{code:0 for code in p.ALL_TARGET_REASONS} for quantity in p.TARGET_NAMES}
    unknown_state=next(state for state,codes in p.TARGET_REASONS.items() if reason in codes)
    for _,row in rows:
        for quantity in p.TARGET_NAMES:
            if getattr(row,quantity) is None:state,code=unknown_state,reason
            else:state,code='VALID','FINITE_NONNEGATIVE_RECORDED_POINT'
            statuses[quantity][state]+=1;reasons[quantity][code]+=1
    return p.TargetAggregates(len(rows),sum(row.complete for _,row in rows),len({group for group,row in rows if row.complete}),statuses,reasons)


def context_for(evaluation,mode='synthetic_fixture',reason='EMPTY_TOKEN'):
    groups=groups_for(evaluation);counts={role:len(rows) for role,rows in groups.items()}
    roles={role:p.RoleCounts(len(rows),len({group for group,_ in rows})) for role,rows in groups.items()}
    registration=p.RegistrationSummary('b'*40,digest('protocol'),digest('contract'),digest('implementation'),digest('engineering'),digest('ci'),identity('registration'))
    source=p.SourceIdentity(*p.REGISTERED_SOURCE) if mode!='synthetic_fixture' else p.SourceIdentity(1000,'c'*32,'d'*64)
    return p.PublicContext(registration,source,{name:identity(name) for name in p.INPUT_NAMES},mode,
        p.FunnelCounts(1545,314,75,1231,0),roles,{role:target_summary(rows,reason) for role,rows in groups.items()},
        p.AccessCounts(2,2*source.byte_count,counts,counts,counts,74,120,evaluation.costs['policy_bundle_requests'],120),
        p.Usage(F(3,2),F(1,2),8192))


def failure_context(base,last=None):
    stage_index=-1 if last is None else p.STAGES.index(last)
    inputs={name:value if name not in p.STAGES or p.STAGES.index(name)<=stage_index else None for name,value in base.inputs.items()}
    return replace(base,inputs=inputs,target_aggregates=dict.fromkeys(p.ROLES),
        access=p.AccessCounts(0,0,dict.fromkeys(p.ROLES),dict.fromkeys(p.ROLES),dict.fromkeys(p.ROLES),None,None,None,None))


def canonical(value):return (json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False)+'\n').encode('ascii')


class IndependentProjectorReview(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.evaluation=make_evaluation();cls.context=context_for(cls.evaluation)
        cls.projection=p.project_evaluation(cls.evaluation,cls.context)

    def test_source_shaped_314_rows_75_groups_and_960_actual_policy_runs(self):
        document=self.projection.as_dict();payload=document['payload']
        self.assertEqual(payload['funnel']['counts']['source_rows'],1545)
        self.assertEqual(payload['funnel']['counts']['condition_rows'],314)
        self.assertEqual(payload['funnel']['counts']['condition_source_groups'],75)
        self.assertEqual(tuple(payload['funnel']['roles'][role]['source_groups'] for role in p.ROLES),(35,20,20))
        self.assertEqual(payload['run_accounting'],{'scheduled_runs':960,'completed_runs':960,'populations':2,'assigned_panels_per_population':20,'policies_per_panel':24})
        self.assertEqual(payload['overall_verdict'],self.evaluation.overall_verdict)
        self.assertEqual(document['status'],'COMPLETE');self.assertEqual(document['reasons'],[])
        self.assertEqual(payload['derived_threshold']['value'],'10/1')
        for role in p.ROLES:
            self.assertEqual(payload['fallback_counts'][role]['row_count'],self.context.role_counts[role].rows)
            self.assertEqual(sum(payload['fallback_counts'][role]['primary'].values()),self.context.role_counts[role].rows)
        self.assertEqual(payload['kernel_evaluation_sha256'],self.evaluation.evaluation_digest)

    def test_every_policy_budget_view_matches_independent_aggregate_arithmetic(self):
        payload=self.projection.as_dict()['payload']
        for population,replay in (('primary',self.evaluation.primary),('secondary',self.evaluation.secondary)):
            controls=payload['policy_metrics'][population]
            self.assertEqual(set(controls),set(k.POLICIES))
            for policy in k.POLICIES:
                self.assertEqual((controls[policy]['scheduled_runs'],controls[policy]['completed_runs']),(20,20))
                self.assertEqual([slot['requested_cap'] for slot in controls[policy]['budget_snapshots']],list(k.BUDGETS))
                views=[(slot['metrics'],[panel.policies[policy].snapshots[cap] for panel in replay.panels])
                    for slot,cap in zip(controls[policy]['budget_snapshots'],k.BUDGETS)]
                views += [(controls[policy]['same_actual_pool_cost'],[panel.policies[policy].at_pool_cost for panel in replay.panels]),
                          (controls[policy]['final'],[panel.policies[policy].final for panel in replay.panels])]
                for view,metrics in views:
                    stats=view['assigned_panels'];self.assertEqual(stats['panel_count'],20)
                    for field in ('any_optimum_hit','all_optima_retained','feasible_hit'):
                        known=[getattr(item,field) for item in metrics if getattr(item,field) is not None]
                        summary=stats[field]
                        self.assertEqual(summary['success_count'],sum(known));self.assertEqual(summary['known_count'],len(known))
                        self.assertEqual(summary['panel_denominator'],20)
                        self.assertEqual(F(summary['rate']),F(sum(known),len(known)))
                    for report_field,kernel_field in (('actual_bundle_cost','actual_cost'),('regret','regret'),('first_optimum_cost','first_optimum_cost')):
                        values=[F(getattr(item,kernel_field)) for item in metrics if getattr(item,kernel_field) is not None]
                        summary=stats[report_field]
                        self.assertEqual(summary['known_count'],len(values));self.assertEqual(summary['unavailable_count'],20-len(values))
                        self.assertEqual(summary['sum'],None if not values else f'{sum(values,F(0)).numerator}/{sum(values,F(0)).denominator}')
                        if values:self.assertEqual(F(summary['mean']),sum(values,F(0))/len(values))
                        else:self.assertIsNone(summary['mean'])

    def test_calibration_and_gate_summaries_preserve_registered_values_and_reasons(self):
        payload=self.projection.as_dict()['payload']
        for population,replay in (('primary',self.evaluation.primary),('secondary',self.evaluation.secondary)):
            summary=payload['calibration_summary'][population]
            self.assertEqual((summary['n'],summary['k'],summary['alpha']),(20,19,'1/10'))
            self.assertEqual(summary['threshold'],'1/6')
            self.assertEqual(summary['premise_status'],'assumed_unverified')
            self.assertEqual(summary['score_histogram'],[{'score':'1/6','count':20}])
            self.assertEqual(sum(summary['decision_counts'].values()),20)
            self.assertEqual(summary['decision_counts']['proper_nonempty_reduction'],20)
            self.assertEqual(summary['reasons'],list(replay.plan.calibration.reasons))
        self.assertEqual(payload['gate_checks'],dict(self.evaluation.gate_checks))
        self.assertEqual(payload['gate_reasons'],{key:list(value) for key,value in self.evaluation.gate_reasons.items()})
        self.assertEqual(payload['failed_gates'],list(self.evaluation.failed_gates))
        self.assertEqual(payload['gate_denominators'],dict(self.evaluation.denominators))

    def test_private_row_source_reference_and_member_channels_never_escape(self):
        raw=self.projection.canonical_bytes()
        for private in (b'PRIVATE_RECORD_',b'PRIVATE_PANEL_',b'PRIVATE_DEVELOPMENT_SOURCE_',b'PRIVATE_RESERVED_SOURCE_',
                        b'PRIVATE_OBJECTIVE_REFERENCE',b'PRIVATE_CONSTRAINT_REFERENCE',b'PRIVATE_VAULT_REFERENCE'):
            self.assertNotIn(private,raw)
        forbidden={'record_id','ordinal','source_group','panel_id','composition','neighbors','predictions','observations','truth','ranked_ids','order','retained','cell_hash','token_hash','path','exception','traceback'}
        pending=[self.projection.as_dict()]
        while pending:
            value=pending.pop()
            if isinstance(value,dict):
                self.assertFalse(set(value)&forbidden);pending.extend(value.values())
                if 'rows' in value:self.assertIs(type(value['rows']),int)
            elif isinstance(value,list):pending.extend(value)
        self.assertEqual(tuple(field.name for field in fields(self.projection)),('document',))
        self.assertFalse(hasattr(self.projection,'evaluation'));self.assertFalse(hasattr(self.projection,'context'))

    def test_public_document_is_deeply_immutable_and_fresh_copies_do_not_alias(self):
        before=self.projection.canonical_bytes();copy_=self.projection.as_dict()
        copy_['payload']['failed_gates'].append('INJECTED')
        self.assertEqual(self.projection.canonical_bytes(),before)
        with self.assertRaises(TypeError):self.projection.document['payload']['costs']['policy_bundle_requests']=0
        with self.assertRaises(FrozenInstanceError):self.projection.document={}
        with self.assertRaises(TypeError):p.PublicProjection(document={})

    def test_resealed_fields_types_and_scope_promotions_are_rejected(self):
        changes=[lambda v:v.update(extra='PRIVATE'),lambda v:v['payload'].update(rows=['PRIVATE']),
                 lambda v:v['payload']['run_accounting'].update(populations=True),
                 lambda v:v['payload']['derived_threshold'].update(value='10'),
                 lambda v:v['payload']['scope'].update(physical_attestation='verified'),
                 lambda v:v['payload']['policy_metrics']['secondary'].pop('random_19'),
                 lambda v:v['payload']['gate_checks'].update(pool_recall=False),
                 lambda v:v['payload'].update(kernel_evaluation_sha256='0'*64)]
        for change in changes:
            document=self.projection.as_dict();change(document)
            document['content_sha256']=sha256(canonical({key:value for key,value in document.items() if key!='content_sha256'})).hexdigest()
            with self.assertRaises(p.ReportError):p.validate_public_report(document,self.projection)
        self.assertTrue(p.validate_public_report(self.projection.as_dict(),self.projection))

    def test_wire_contains_exact_rationals_and_whole_content_seal(self):
        document=self.projection.as_dict();seal=document.pop('content_sha256')
        self.assertEqual(seal,sha256(canonical(document)).hexdigest())
        self.assertEqual(document['usage']['wall_seconds'],'3/2')
        self.assertEqual(document['payload']['policy_metrics']['primary']['stopped']['budget_snapshots'][0]['metrics']['assigned_panels']['actual_bundle_cost']['sum'],'0/1')
        self.assertLess(len(self.projection.canonical_bytes()),8*1024*1024)
        for bad in (True,1.0,float('nan'),'PRIVATE',-1):
            with self.assertRaises(p.ReportError):p.RoleCounts(bad,0)
        for bad in (0,0.0,F(-1)):
            with self.assertRaises(p.ReportError):p.Usage(bad,None,None)

    def test_scientific_identity_excludes_only_documented_volatile_bindings(self):
        original=self.projection.document
        inputs=dict(self.context.inputs);inputs['replay']=replace(inputs['replay'],bytes_sha256='1'*64,content_sha256='2'*64)
        context=replace(self.context,inputs=inputs,usage=p.Usage(F(999),None,None),
            registration=replace(self.context.registration,engineering_receipt_sha256='3'*64,ci_receipt_sha256='4'*64,receipt=identity('other-registration-wrapper')))
        newer=p.project_evaluation(self.evaluation,context).document
        self.assertEqual(original['scientific_sha256'],newer['scientific_sha256'])
        self.assertNotEqual(original['content_sha256'],newer['content_sha256'])
        self.assertEqual(newer['inputs']['replay']['bytes_sha256'],'1'*64)
        self.assertEqual(newer['registration']['engineering_receipt_sha256'],'3'*64)
        for field in ('commit','protocol_sha256','contract_sha256','implementation_manifest_sha256'):
            changed=replace(self.context.registration,**{field:'e'*(40 if field=='commit' else 64)})
            newer=p.project_evaluation(self.evaluation,replace(self.context,registration=changed)).document
            self.assertNotEqual(original['scientific_sha256'],newer['scientific_sha256'])
        inputs=dict(self.context.inputs);inputs['replay']=replace(inputs['replay'],scientific_sha256='f'*64)
        self.assertNotEqual(original['scientific_sha256'],p.project_evaluation(self.evaluation,replace(self.context,inputs=inputs)).document['scientific_sha256'])

    def test_changed_private_targets_cannot_keep_scientific_identity_with_reused_context(self):
        # Alter only recorded YS on known-infeasible synthetic rows. No aggregate
        # metadata counts, constraint truths, optima or policy outcomes change.
        altered=make_evaluation(infeasible_ys=F(101))
        report=p.project_evaluation(altered,self.context).as_dict()
        original=self.projection.as_dict()
        self.assertEqual(original['payload']['target_status_counts'],report['payload']['target_status_counts'])
        self.assertEqual(original['payload']['policy_metrics'],report['payload']['policy_metrics'])
        self.assertEqual(original['payload']['gate_checks'],report['payload']['gate_checks'])
        self.assertEqual(original['inputs'],report['inputs'])
        self.assertNotEqual(original['payload']['kernel_evaluation_sha256'],report['payload']['kernel_evaluation_sha256'])
        self.assertNotEqual(original['scientific_sha256'],report['scientific_sha256'])
        with self.assertRaises(p.ReportError):p.validate_public_report(report,self.projection)

    def test_empty_failed_capture_and_unknown_counters_are_not_fabricated(self):
        context=failure_context(self.context,'input_freeze')
        context=replace(context,access=replace(context.access,mixed_source_captures=1,mixed_source_bytes=0))
        report=p.project_unavailable(context,'BLOCKED',('SOURCE_IDENTITY_MISMATCH',),'input_freeze',0).as_dict()
        self.assertEqual(report['access']['counts']['mixed_source_captures'],1)
        self.assertEqual(report['access']['counts']['mixed_source_bytes'],0)
        self.assertIsNone(report['access']['counts']['interpreted_bundles']['DEVELOPMENT'])
        self.assertIsNone(report['payload']['target_status_counts']['DEVELOPMENT'])

    def test_inputs_without_scientific_seals_fall_back_to_exact_byte_identity(self):
        inputs=dict(self.context.inputs);inputs['mapping']=identity('mapping-no-science',False)
        first=p.project_evaluation(self.evaluation,replace(self.context,inputs=inputs)).document
        inputs['mapping']=replace(inputs['mapping'],bytes_sha256='8'*64)
        second=p.project_evaluation(self.evaluation,replace(self.context,inputs=inputs)).document
        self.assertNotEqual(first['scientific_sha256'],second['scientific_sha256'])

    def test_registered_modes_require_actual_shape_and_preserve_execution_scope(self):
        registered=context_for(self.evaluation,'registered_original')
        first=p.project_evaluation(self.evaluation,registered).document
        second=p.project_evaluation(self.evaluation,replace(registered,execution_kind='registered_reproduction')).document
        self.assertEqual(first['scientific_sha256'],second['scientific_sha256'])
        self.assertNotEqual(first['content_sha256'],second['content_sha256'])
        synthetic=p.project_evaluation(self.evaluation,replace(registered,execution_kind='synthetic_fixture')).document
        self.assertNotEqual(first['scientific_sha256'],synthetic['scientific_sha256'])
        with self.assertRaisesRegex(p.ReportError,'SOURCE_IDENTITY_MISMATCH'):
            replace(registered,source=self.context.source)
        with self.assertRaisesRegex(p.ReportError,'METADATA_COUNT_MISMATCH'):
            replace(registered,funnel_counts=p.FunnelCounts(1545,313,75,1232,0))
        with self.assertRaisesRegex(p.ReportError,'METADATA_COUNT_MISMATCH'):
            replace(registered,role_counts={**registered.role_counts,'DEVELOPMENT':p.RoleCounts(74,34)})

    def test_missingness_reasons_are_explicit_and_primary_unknowns_keep_denominators(self):
        evaluation=make_evaluation(missing=((20,0),));context=context_for(evaluation)
        first=p.project_evaluation(evaluation,context).as_dict()
        primary=first['payload']['population_metrics']['primary']
        self.assertEqual(primary['counts']['assigned_panels'],20)
        self.assertEqual(primary['counts']['original_candidate_total'],120)
        metric=primary['pool']['assigned_panels']['all_optima_retained']
        self.assertEqual((metric['known_count'],metric['unavailable_count'],metric['panel_denominator']),(19,1,20))
        self.assertEqual(metric['unavailable_reasons']['TRUTH_UNKNOWN'],1)
        self.assertEqual(first['payload']['calibration_summary']['primary']['status'],'unsupported_premise')
        self.assertIsNone(first['payload']['calibration_summary']['primary']['threshold'])
        changed=context_for(evaluation,reason='NEGATIVE_YS')
        second=p.project_evaluation(evaluation,changed).as_dict()
        self.assertNotEqual(first['scientific_sha256'],second['scientific_sha256'])
        self.assertEqual(second['payload']['target_status_counts']['EVALUATION']['target_reason_counts']['yield_strength']['NEGATIVE_YS'],1)

    def test_empty_secondary_and_no_feasible_denominators_are_unavailable(self):
        evaluation=make_evaluation(missing=tuple((20,i) for i in range(6)),infeasible=True)
        document=p.project_evaluation(evaluation,context_for(evaluation)).as_dict()
        payload=document['payload'];secondary=payload['population_metrics']['secondary']
        self.assertEqual(secondary['counts']['empty_panels'],1)
        self.assertEqual(secondary['pool_fraction_assigned']['unavailable_reasons']['EMPTY_PANEL'],1)
        self.assertIsNone(secondary['pool']['observed_feasible_panels']['regret']['mean'])
        self.assertIsNone(payload['component_verdicts']['pool_usefulness'])
        self.assertIsNone(payload['component_verdicts']['ranking_usefulness'])
        self.assertIsNone(payload['gate_margins']['pool_recall'])
        self.assertNotIn('POOL_RECALL_BELOW_9_10',payload['failed_gates'])
        for policy in k.POLICIES:self.assertEqual(payload['policy_metrics']['secondary'][policy]['completed_runs'],20)

    def test_failure_forms_preserve_stage_access_and_never_emit_performance(self):
        for last in (None,'allocation','input_freeze','development','rank_freeze','reserved','calibration','replay'):
            context=failure_context(self.context,last)
            report=p.project_unavailable(context,'INCOMPLETE',('WORKER_INTERRUPTED',),last,0).as_dict()
            self.assertEqual(report['payload']['last_sealed_stage'],last)
            for key in ('calibration_summary','population_metrics','policy_metrics','gate_denominators','gate_margins','gate_checks','gate_reasons','failed_gates','component_verdicts','component_reasons','overall_verdict'):
                self.assertIsNone(report['payload'][key])
            self.assertIsNone(report['payload']['target_status_counts']['EVALUATION'])
            self.assertEqual(report['access']['counts']['mixed_source_captures'],0)
        early=replace(failure_context(self.context),registration=None,source=None,funnel_counts=None,role_counts=dict.fromkeys(p.ROLES),inputs=dict.fromkeys(p.INPUT_NAMES))
        blocked=p.project_unavailable(early,'BLOCKED',('REGISTRATION_MISSING',),None,0).as_dict()
        self.assertIsNone(blocked['registration']);self.assertIsNone(blocked['source']);self.assertIsNone(blocked['payload']['funnel'])

    def test_later_identity_summary_or_access_cannot_appear_before_its_predecessor(self):
        for last in (None,'allocation','input_freeze','development','rank_freeze','reserved','calibration'):
            context=failure_context(self.context,last)
            for stage in p.STAGES[(0 if last is None else p.STAGES.index(last)+1):]:
                with self.assertRaisesRegex(p.ReportError,'INPUT_IDENTITY_MISMATCH'):
                    p.project_unavailable(replace(context,inputs={**context.inputs,stage:identity('forbidden-'+stage)}),'BLOCKED',('WORKER_INTERRUPTED',),last,0)
        for last,field in (('input_freeze','model_visible_bundles'),('development','calibrator_visible_bundles'),('reserved','policy_bundle_requests'),('calibration','auditor_unique_bundles')):
            context=failure_context(self.context,last)
            with self.assertRaises(p.ReportError):
                p.project_unavailable(replace(context,access=replace(context.access,**{field:1})),'INCOMPLETE',('WORKER_INTERRUPTED',),last,0)
        context=failure_context(self.context,'input_freeze')
        with self.assertRaises(p.ReportError):
            p.project_unavailable(replace(context,target_aggregates={**context.target_aggregates,'DEVELOPMENT':self.context.target_aggregates['DEVELOPMENT']}),'INCOMPLETE',('WORKER_INTERRUPTED',),'input_freeze',0)

    def test_authorized_partial_decoder_counters_stay_distinct_from_unknown_summary(self):
        context=failure_context(self.context,'input_freeze')
        context=replace(context,access=replace(context.access,mixed_source_captures=1,mixed_source_bytes=900,
            accumulated_bundles=dict(DEVELOPMENT=7,CALIBRATION=None,EVALUATION=None),
            decoded_bundles=dict(DEVELOPMENT=6,CALIBRATION=None,EVALUATION=None),
            interpreted_bundles=dict(DEVELOPMENT=5,CALIBRATION=None,EVALUATION=None)))
        report=p.project_unavailable(context,'INCOMPLETE',('WORKER_INTERRUPTED',),'input_freeze',0).as_dict()
        self.assertIsNone(report['payload']['target_status_counts']['DEVELOPMENT'])
        self.assertEqual(report['access']['counts']['interpreted_bundles']['DEVELOPMENT'],5)
        self.assertEqual(report['access']['counts']['mixed_source_bytes'],900)
        self.assertIsNone(report['payload']['overall_verdict'])

    def test_contradictory_known_capture_visibility_and_summary_counts_are_rejected(self):
        context=failure_context(self.context,'development')
        for access in (dict(mixed_source_captures=0,mixed_source_bytes=1),
                       dict(model_visible_bundles=75),dict(calibrator_visible_bundles=121),dict(auditor_unique_bundles=121)):
            with self.assertRaises(p.ReportError):
                p.project_unavailable(replace(context,access=replace(context.access,**access)),'INCOMPLETE',('WORKER_INTERRUPTED',),'development',0)
        counts=dict(DEVELOPMENT=1,CALIBRATION=None,EVALUATION=None)
        with self.assertRaises(p.ReportError):
            p.project_unavailable(replace(context,target_aggregates={**context.target_aggregates,'DEVELOPMENT':self.context.target_aggregates['DEVELOPMENT']},
                access=replace(context.access,accumulated_bundles=counts,decoded_bundles=counts,interpreted_bundles=counts)),
                'INCOMPLETE',('WORKER_INTERRUPTED',),'development',0)

    def test_reason_vocabulary_and_target_status_intersection_are_closed(self):
        target=self.context.target_aggregates['DEVELOPMENT']
        for complete,groups in ((1,0),(0,1),(75,35)):
            with self.assertRaises(p.ReportError):replace(target,complete_row_count=complete,complete_source_group_count=groups)
        for role in p.ROLES:
            wrong=dict(self.context.role_counts);wrong[role]=p.RoleCounts(0,0)
            with self.assertRaises(p.ReportError):replace(self.context,role_counts=wrong)
        reasons={key:dict(value) for key,value in target.target_reason_counts.items()}
        reasons['yield_strength']['PRIVATE_RAW_TOKEN']=0
        with self.assertRaises(p.ReportError):replace(target,target_reason_counts=reasons)
        for status,reasons in (('COMPLETE',('WORKER_INTERRUPTED',)),('BLOCKED',()),('BLOCKED',('PRIVATE_EXCEPTION',)),('BLOCKED',('WORKER_INTERRUPTED','WORKER_INTERRUPTED'))):
            with self.assertRaises(p.ReportError):p.project_unavailable(failure_context(self.context),status,reasons,None,0)

    def test_inadequate_development_requires_real_failed_counts_no_model_consumption(self):
        base=failure_context(self.context,'development');rows=groups_for(self.evaluation)['DEVELOPMENT']
        # Keep all74 original development rows, but only49 pairs complete.
        partial=tuple((group,row if index<49 else replace(row,yield_strength=None)) for index,(group,row) in enumerate(rows))
        summary=target_summary(partial)
        counts=dict(DEVELOPMENT=74,CALIBRATION=None,EVALUATION=None)
        context=replace(base,target_aggregates={**base.target_aggregates,'DEVELOPMENT':summary},
            access=replace(base.access,mixed_source_captures=1,mixed_source_bytes=1000,accumulated_bundles=counts,decoded_bundles=counts,interpreted_bundles=counts))
        report=p.project_unavailable(context,'NO_GO_INSUFFICIENT_DEVELOPMENT',('DEVELOPMENT_ROWS_BELOW_50',),'development',0).as_dict()
        self.assertEqual(report['payload']['target_status_counts']['DEVELOPMENT']['row_count'],74)
        self.assertEqual(report['payload']['target_status_counts']['DEVELOPMENT']['complete_row_count'],49)
        self.assertIsNone(report['payload']['overall_verdict'])
        with self.assertRaises(p.ReportError):
            p.project_unavailable(context,'NO_GO_INSUFFICIENT_DEVELOPMENT',('DEVELOPMENT_GROUPS_BELOW_15',),'development',0)
        with self.assertRaises(p.ReportError):
            p.project_unavailable(replace(context,access=replace(context.access,model_visible_bundles=74)),
                'NO_GO_INSUFFICIENT_DEVELOPMENT',('DEVELOPMENT_ROWS_BELOW_50',),'development',0)

    def test_untrusted_floats_cycles_deep_nesting_and_excess_size_fail_closed(self):
        for value in (float('nan'),float('inf'),1.0,1<<10000):
            document=self.projection.as_dict();document['payload']['costs']['policy_bundle_requests']=value
            with self.assertRaises(p.ReportError):p.validate_public_report(document,self.projection)
        document=self.projection.as_dict();document['cycle']=document
        with self.assertRaises(p.ReportError):p.validate_public_report(document,self.projection)
        document=self.projection.as_dict();item=document
        for _ in range(34):item['extra']={};item=item['extra']
        with self.assertRaises(p.ReportError):p.validate_public_report(document,self.projection)
        document=self.projection.as_dict();document['private']='x'*5001
        with self.assertRaises(p.ReportError):p.validate_public_report(document,self.projection)


if __name__=='__main__':unittest.main()
