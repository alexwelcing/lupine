"""Independent synthetic predictor/calibration/replay controls. No archive access."""
from dataclasses import FrozenInstanceError, replace
from fractions import Fraction as F
from hashlib import sha256
from itertools import combinations, product
from pathlib import Path
import ast
import sys
import unittest

LANE = Path(__file__).resolve().parents[1]
PROJECT = next(path for path in Path(__file__).resolve().parents
               if path.name == 'discovery' and (path/'AGENTS.md').is_file())
for directory in (PROJECT/'src', PROJECT/'scripts', LANE/'scripts'):
    sys.path.insert(0, str(directory))

import mpea_study as s
from lupine_discovery.representation import NormalizedVector


def vector(x):
    return NormalizedVector(s.AXES, (F(x), 1-F(x)) + (F(0),)*116)


def feature(i, group, x=F(1), category='CAST', name=None):
    return s.FeatureRow(name or f'observation-{i}', i, group, None if x is None else vector(x), category)


def development():
    result=[]
    for i in range(50):
        row=feature(i, f'development-{i%15}', F(0) if i<10 else F(1))
        result.append(s.DevelopmentRow(row,s.Targets(row.record_id,F(100 if i<10 else 10),F(0 if i<10 else 10))))
    return tuple(result)


def independent_hash(tag, record_id):
    return sha256(('mpea-t25-archive-option-v1\x00'+tag+'\x00'+record_id).encode('utf-8')).hexdigest()


def make_world():
    fit=s.fit_development(development())
    panels=[];labels={};good_ids={}
    for j in range(40):
        ordinals=tuple(range(100+6*j,106+6*j))
        # A constructed positive control: useful low-strength feasible candidate
        # is last in the frozen processing/hash-tie order, not selected from data.
        best=max(ordinals,key=lambda i:(independent_hash('tie',f'observation-{i}'),i))
        rows=tuple(feature(i,f'reserved-{j}',F(1) if i==best else F(0)) for i in ordinals)
        panel=s.AssignedPanel(f'panel-{j:02d}',f'reserved-{j}',rows)
        panels.append(s.rank_panel(fit,panel));good_ids[panel.panel_id]=f'observation-{best}'
        labels[panel.panel_id]=tuple(s.Targets(row.record_id,F(90 if row.ordinal==best else 100),F(10 if row.ordinal==best else 0)) for row in rows)
    return fit,tuple(panels),labels,good_ids


def plan_for(fit,panels,labels,population='secondary',premise='assumed_unverified'):
    completeness=s.ReservedCompleteness(tuple(p.panel for p in panels),
        {key:tuple(row.record_id for row in rows if row.complete) for key,rows in labels.items()})
    return s.calibrate_population(fit,panels[:20],{p.panel.panel_id:labels[p.panel.panel_id] for p in panels[:20]},
        panels[20:],completeness,population,premise,'3'*64,'constructed column11 YS MPa',
        'constructed column13 E percentage points and frozen threshold','constructed later audit vault')


def runs_for(plan,truth):
    index={name:{row.record_id:row for row in rows} for name,rows in truth.items()}
    return tuple(s.PolicyRun(plan.plan_digest,schedule.panel_id,schedule.policy_id,schedule.decision_digest,
        tuple(index[schedule.panel_id][name] for name in schedule.reveal_ids)) for schedule in plan.schedules)


def exact_metric_oracle(truth,revealed,threshold):
    assert all(row.complete for row in truth)
    feasible=[row for row in truth if row.elongation>=threshold]
    best=max([row.yield_strength for row in feasible],default=None)
    optima={row.record_id for row in feasible if row.yield_strength==best}
    seen={row.record_id for row in revealed}
    observed=[row for row in revealed if row.elongation>=threshold]
    observed_best=max([row.yield_strength for row in observed],default=None)
    return {'actual_cost':len(revealed),'any_optimum_hit':int(bool(optima & seen)),
            'all_optima_retained':int(optima<=seen),'feasible_hit':int(bool(observed)),
            'best_feasible_yield_strength':observed_best,
            'regret':None if best is None or observed_best is None else best-observed_best,
            'first_optimum_cost':next((i for i,row in enumerate(revealed,1) if row.record_id in optima),None),
            'whole_universe_retained':seen=={row.record_id for row in truth}}


class IndependentPredictorReview(unittest.TestCase):
    def test_source_balanced_representatives_against_direct_fraction_oracle(self):
        rows=[]
        for i in range(60):
            x=F((7*i)%17,16)
            row=feature(i,f'source-{i%15}',x,name=f'reverse-{1000-i}')
            rows.append(s.DevelopmentRow(row,s.Targets(row.record_id,F((i*11)%97,3),F((i*13)%59,7))))
        fit=s.fit_development(list(reversed(rows)))
        for step in range(17):
            q=F(step,16);query=feature(1000,'query',q)
            nearest=[]
            for group in {row.feature.source_group for row in rows}:
                candidates=[row for row in rows if row.feature.source_group==group]
                winner=min(candidates,key=lambda row:(2*abs(row.feature.composition.values[0]-q),row.feature.ordinal))
                nearest.append(winner)
            selected=sorted(nearest,key=lambda row:(2*abs(row.feature.composition.values[0]-q),row.feature.ordinal))[:5]
            predicted=s.predict(fit,query)
            self.assertEqual(predicted.neighbors,tuple((row.feature.record_id,2*abs(row.feature.composition.values[0]-q)) for row in selected))
            self.assertEqual(predicted.yield_strength,sum((row.targets.yield_strength for row in selected),F(0))/5)
            self.assertEqual(predicted.elongation,sum((row.targets.elongation for row in selected),F(0))/5)
            self.assertEqual(len({row.feature.source_group for row in selected}),5)

    def test_zero_based_numeric_ties_and_not_string_or_label_ties(self):
        rows=[]
        for i in range(50):
            row=feature(i,f'source-{i%15}',F(1),name=f'name-{999-i}')
            rows.append(s.DevelopmentRow(row,s.Targets(row.record_id,F(i),F(i))))
        predicted=s.predict(s.fit_development(rows),feature(1500,'query'))
        self.assertEqual(predicted.neighbors,tuple((f'name-{999-i}',F(0)) for i in range(5)))
        self.assertEqual((predicted.yield_strength,predicted.elongation),(F(2),F(2)))
        rows[15]=s.DevelopmentRow(rows[15].feature,s.Targets(rows[15].feature.record_id,F(999),F(999)))
        self.assertEqual(s.predict(s.fit_development(rows),feature(1500,'query')).neighbors,predicted.neighbors)

    def test_lower_medians_are_endpoint_separate_complete_record_weighted(self):
        rows=[]
        for i in range(50):
            row=feature(i,f'source-{i%15}',None,'OTHER' if i<2 else 'CAST')
            rows.append(s.DevelopmentRow(row,s.Targets(row.record_id,F(i),F(100-i))))
        partial=feature(100,'partial',None,'OTHER')
        rows.append(s.DevelopmentRow(partial,s.Targets(partial.record_id,F(10000),None)))
        fit=s.fit_development(rows)
        self.assertEqual(fit.global_medians,(F(24),F(75)))
        self.assertEqual(fit.threshold,F(75))
        self.assertEqual(fit.processing_medians['OTHER'],(F(0),F(99)))
        self.assertEqual(len(fit.complete_rows),50);self.assertEqual(len(fit.development),51)
        self.assertEqual(fit.complete_source_count,15)

    def test_adequacy_reports_both_failures_without_medians(self):
        rows=development()[:12]
        fit=s.fit_development(rows)
        self.assertEqual(fit.reasons,('DEVELOPMENT_ROWS_BELOW_50','DEVELOPMENT_GROUPS_BELOW_15'))
        self.assertIsNone(fit.threshold);self.assertIsNone(fit.global_medians)
        self.assertEqual(dict(fit.processing_medians),{})
        with self.assertRaisesRegex(s.StudyError,'NO_GO_INSUFFICIENT_DEVELOPMENT'):
            s.predict(fit,feature(1000,'query'))

    def test_unknown_and_fewer_source_fallbacks_preserve_categories(self):
        rows=[s.DevelopmentRow(replace(row.feature,composition=None,processing='OTHER'),row.targets) for row in development()]
        rows[0]=s.DevelopmentRow(replace(rows[0].feature,processing='UNRESOLVED'),s.Targets(rows[0].feature.record_id,F(7),F(8)))
        fit=s.fit_development(rows)
        unknown=s.predict(fit,feature(1000,'q',None,'UNRESOLVED'))
        self.assertEqual((unknown.route,unknown.processing_route,unknown.yield_strength),('UNKNOWN_COMPOSITION_PROCESSING','CATEGORY_MEDIAN',F(7)))
        no_known=s.predict(fit,feature(1001,'q',F(1),'CAST'))
        self.assertEqual(no_known.route,'NO_KNOWN_DEVELOPMENT_COMPOSITION_PROCESSING')
        self.assertEqual(no_known.processing_route,'GLOBAL_MEDIAN_EMPTY_CATEGORY')
        rows[0]=s.DevelopmentRow(replace(rows[0].feature,composition=vector(1)),rows[0].targets)
        rows[1]=s.DevelopmentRow(replace(rows[1].feature,composition=vector(0)),s.Targets(rows[1].feature.record_id,F(3),F(4)))
        few=s.predict(s.fit_development(rows),feature(1002,'q',F(1,2)))
        self.assertEqual(few.route,'FEWER_GROUP_NEIGHBORS');self.assertEqual(len(few.neighbors),2)
        self.assertEqual((few.yield_strength,few.elongation),(F(5),F(6)))

    def test_exact_hash_and_primary_constraint_direction(self):
        fit=s.fit_development(development())
        panel=s.AssignedPanel('test','group',(feature(500,'group',F(0)),feature(501,'group',F(1))))
        frozen=s.rank_panel(fit,panel)
        self.assertEqual(frozen.orders['primary'],('observation-501','observation-500'))
        self.assertEqual(frozen.orders['objective_only'],('observation-500','observation-501'))
        for tag in ('tie',)+tuple(f'random-{i}' for i in range(20)):
            self.assertEqual(s.rank_hash(tag,'observation-500'),independent_hash(tag,'observation-500'))
        for seed in range(20):
            expected=tuple(row.record_id for row in sorted(panel.rows,key=lambda row:(independent_hash(f'random-{seed}',row.record_id),row.ordinal)))
            self.assertEqual(frozen.orders[f'random_{seed}'],expected)
        self.assertEqual(frozen.predictions[1].elongation,fit.threshold)

    def test_strict_input_types_immutability_and_arithmetic_rejection(self):
        for invalid in (True,0,1.0,'1',F(-1),F(1<<512),F(1,(1<<512)+1)):
            with self.assertRaises(s.StudyError): s.Targets('id',invalid,F(0))
        self.assertTrue(s.Targets('id',F(0),F(0)).complete)
        for ordinal in (True,-1,1545):
            with self.assertRaises(s.StudyError): feature(ordinal,'g')
        self.assertEqual(feature(0,'g').ordinal,0);self.assertEqual(feature(1544,'g').ordinal,1544)
        with self.assertRaises(s.StudyError):
            s.DevelopmentRow(feature(10,'g'),s.Targets('different',F(1),F(1)))
        large=F(1<<8191)
        self.assertEqual(s.multiply(large,1/large),F(1))
        self.assertEqual(s.add(large,-large),F(0))
        with self.assertRaisesRegex(s.StudyError,'ARITHMETIC_LIMIT'): s.multiply(large,F(2))
        with self.assertRaisesRegex(s.StudyError,'ARITHMETIC_LIMIT'): s.add(F(1,(1<<8191)-1),F(1,(1<<8191)-2))
        original=list(development());fit=s.fit_development(original);original.clear()
        self.assertEqual(len(fit.development),50)
        with self.assertRaises(FrozenInstanceError): fit.threshold=F(0)
        with self.assertRaises(TypeError): fit.processing_medians['CAST']=(F(0),F(0))


class IndependentStudyReview(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fit,cls.panels,cls.labels,cls.good=make_world()
        cls.primary=plan_for(cls.fit,cls.panels,cls.labels,'primary')
        cls.secondary=plan_for(cls.fit,cls.panels,cls.labels,'secondary')
        cls.truth={p.panel.panel_id:cls.labels[p.panel.panel_id] for p in cls.panels[20:]}
        cls.primary_runs=runs_for(cls.primary,cls.truth)
        cls.secondary_runs=runs_for(cls.secondary,cls.truth)
        cls.primary_replay=s.audit_replay(cls.primary,cls.primary_runs,cls.truth)
        cls.secondary_replay=s.audit_replay(cls.secondary,cls.secondary_runs,cls.truth)

    def test_actual_20_panel_alpha_and_24_policy_schedule(self):
        plan=self.secondary
        self.assertEqual((plan.calibration.n,plan.calibration.k,plan.calibration.threshold),(20,19,F(1,6)))
        self.assertEqual(len(plan.schedules),480)
        self.assertEqual(len(set((sc.panel_id,sc.policy_id) for sc in plan.schedules)),480)
        self.assertEqual(set(sc.policy_id for sc in plan.schedules),set(s.POLICIES))
        self.assertEqual(plan.protocol.premise_status,'assumed_unverified')
        for frozen,decision in zip(plan.future_panels,plan.decisions):
            self.assertEqual(decision.retained,frozen.orders['primary'][:1])

    def test_constructed_positive_control_requires_both_real_replay_populations(self):
        evaluation=s.evaluate_study(self.primary_replay,self.secondary_replay)
        self.assertEqual(evaluation.overall_verdict,'GO_DESIGN_INDEPENDENT_STUDY')
        self.assertEqual(evaluation.failed_gates,())
        self.assertEqual(evaluation.denominators['scheduled_policy_runs'],960)
        self.assertEqual(evaluation.denominators['feasible_secondary_panels'],20)
        self.assertEqual(evaluation.denominators['discovery_secondary_panels_larger_than_four'],20)
        self.assertEqual(evaluation.denominators['ranking_primary_hits'],20)
        self.assertEqual(evaluation.denominators['ranking_processing_hits'],0)
        self.assertEqual(evaluation.denominators['ranking_objective_only_hits'],0)
        self.assertEqual(evaluation.costs['development_unique_bundles'],50)
        self.assertEqual(evaluation.costs['calibration_unique_bundles'],120)
        self.assertEqual(evaluation.costs['evaluation_unique_bundles'],120)
        with self.assertRaises(s.StudyError): s.evaluate_study(self.secondary_replay,self.primary_replay)
        with self.assertRaisesRegex(s.StudyError,'REPLAY_INCOMPLETE'): s.evaluate_study(None,self.secondary_replay)

    def test_all_policy_snapshots_match_independent_complete_truth_oracle(self):
        lookup={(run.panel_id,run.policy_id):run for run in self.secondary_runs}
        for audit in self.secondary_replay.panels:
            truth=self.truth[audit.panel_id]
            self.assertEqual(set(audit.policies),set(s.POLICIES))
            for policy in s.POLICIES:
                observed=lookup[audit.panel_id,policy].observations
                for cap in s.BUDGETS:
                    expected=exact_metric_oracle(truth,observed[:cap],self.fit.threshold)
                    actual=audit.policies[policy].snapshots[cap]
                    for key,value in expected.items(): self.assertEqual(getattr(actual,key),value)
                expected=exact_metric_oracle(truth,observed[:audit.pool_size],self.fit.threshold)
                for key,value in expected.items(): self.assertEqual(getattr(audit.policies[policy].at_pool_cost,key),value)

    def test_same_actual_cost_primary_and_stopped_are_identical(self):
        for panel in self.secondary_replay.panels:
            self.assertEqual(panel.pool_size,1)
            self.assertEqual(panel.policies['primary'].at_pool_cost,panel.policies['stopped'].at_pool_cost)
            self.assertEqual(panel.policies['stopped'].snapshots[4].actual_cost,1)
            self.assertEqual(panel.policies['primary'].snapshots[4].actual_cost,4)
            self.assertEqual(panel.policies['stopped'].final.actual_cost,1)
            self.assertEqual(panel.policies['primary'].final.actual_cost,6)
        expected=20*(23*6+1)
        self.assertEqual(self.secondary_replay.costs['policy_bundle_requests'],expected)

    def test_one_future_unknown_forces_primary_unsupported_and_keeps_unknown_metrics(self):
        labels=dict(self.labels);pid=self.panels[20].panel.panel_id;good=self.good[pid]
        labels[pid]=tuple(replace(row,yield_strength=None) if row.record_id==good else row for row in labels[pid])
        plan=plan_for(self.fit,self.panels,labels,'primary')
        self.assertEqual(plan.calibration.complete_count,20)
        self.assertEqual(plan.calibration.status,'unsupported_premise')
        self.assertEqual(plan.protocol.premise_status,'unsupported')
        self.assertTrue(all(len(decision.retained)==6 for decision in plan.decisions))
        truth={panel.panel.panel_id:labels[panel.panel.panel_id] for panel in self.panels[20:]}
        audited=s.audit_replay(plan,runs_for(plan,truth),truth)
        first=audited.panels[0]
        self.assertEqual(first.truth_status,'UNKNOWN')
        self.assertIsNone(first.pool.any_optimum_hit);self.assertIsNone(first.pool.all_optima_retained)
        self.assertIsNone(first.pool.regret);self.assertIsNone(first.pool.feasible_hit)
        self.assertEqual(first.pool.observed_known_feasible_count,1)
        self.assertTrue(first.pool.whole_universe_retained)
        self.assertEqual(audited.counts['assigned_panels'],20)
        self.assertEqual(audited.counts['original_unknown_candidate_total'],1)
        self.assertEqual(audited.counts['population_unknown_candidate_total'],1)
        self.assertEqual(audited.macro_rates['pool_all_optima_feasible'].denominator,19)
        # Same all-40 manifest after swapping roles cannot regain primary support.
        swapped=self.panels[20:]+self.panels[:20]
        self.assertEqual(plan_for(self.fit,swapped,labels,'primary').protocol.premise_status,'unsupported')

    def test_secondary_is_literal_restriction_and_empty_panels_remain(self):
        labels=dict(self.labels)
        for index in (0,20):
            pid=self.panels[index].panel.panel_id
            labels[pid]=tuple(replace(row,elongation=None) for row in labels[pid])
        secondary=plan_for(self.fit,self.panels,labels)
        self.assertEqual(secondary.calibration.n,20)
        self.assertEqual(secondary.calibration.status,'finite_conditional')
        self.assertEqual(secondary.decisions[0].original_ids,())
        for frozen in self.panels:
            keep=set(secondary.completeness.complete_ids[frozen.panel.panel_id])
            for policy in s.FULL_POLICIES:
                self.assertEqual(secondary.orders[frozen.panel.panel_id][policy],tuple(x for x in frozen.orders[policy] if x in keep))
        truth={p.panel.panel_id:labels[p.panel.panel_id] for p in self.panels[20:]}
        replay=s.audit_replay(secondary,runs_for(secondary,truth),truth)
        first=replay.panels[0]
        self.assertEqual((first.original_candidate_count,first.candidate_count,first.pool_size),(6,0,0))
        self.assertIsNone(first.pool_fraction);self.assertEqual(first.pool_fraction_reason,'EMPTY_PANEL')
        self.assertEqual(first.pool.any_optimum_hit,0);self.assertEqual(first.pool.all_optima_retained,1)
        self.assertEqual(replay.counts['assigned_panels'],20)
        self.assertEqual(replay.counts['original_candidate_total'],120)
        self.assertEqual(replay.counts['population_candidate_total'],114)
        self.assertEqual(replay.counts['original_unknown_candidate_total'],6)
        self.assertEqual(replay.counts['population_unknown_candidate_total'],0)
        self.assertEqual(sum(len(run.observations)==0 for run in replay.runs),24)

    def test_two_score_one_calibration_panels_force_tau_one_and_keep_ties(self):
        labels=dict(self.labels)
        for frozen in self.panels[:2]:
            pid=frozen.panel.panel_id
            labels[pid]=tuple(s.Targets(row.record_id,F(9),F(10)) for row in labels[pid])
        changed=plan_for(self.fit,self.panels,labels)
        self.assertEqual(changed.calibration.threshold,F(1))
        self.assertTrue(all(len(decision.retained)==6 for decision in changed.decisions))

    def test_all_infeasible_calibration_yields_statistical_empty_not_certificate(self):
        labels=dict(self.labels)
        for frozen in self.panels[:20]:
            pid=frozen.panel.panel_id;labels[pid]=tuple(replace(row,elongation=F(0)) for row in labels[pid])
        changed=plan_for(self.fit,self.panels,labels)
        self.assertEqual(changed.calibration.threshold,F(0))
        self.assertEqual(changed.calibration.status,'finite_conditional')
        self.assertTrue(all(decision.retained==() for decision in changed.decisions))
        replay=s.audit_replay(changed,runs_for(changed,self.truth),self.truth)
        self.assertEqual(replay.counts['feasible_panels'],20)
        self.assertEqual(replay.macro_rates['pool_all_optima_feasible'].value,F(0))

    def test_losing_a_tied_optimum_can_have_zero_regret_and_fails_pool_gate(self):
        labels=dict(self.labels)
        for frozen in self.panels[20:]:
            pid=frozen.panel.panel_id;late=frozen.orders['primary'][-1]
            labels[pid]=tuple(s.Targets(row.record_id,F(90),F(10)) if row.record_id==late else row for row in labels[pid])
        primary=plan_for(self.fit,self.panels,labels,'primary');secondary=plan_for(self.fit,self.panels,labels)
        self.assertEqual(secondary.plan_digest,self.secondary.plan_digest)
        truth={p.panel.panel_id:labels[p.panel.panel_id] for p in self.panels[20:]}
        a=s.audit_replay(primary,runs_for(primary,truth),truth);b=s.audit_replay(secondary,runs_for(secondary,truth),truth)
        for panel in b.panels:
            self.assertEqual(panel.pool.any_optimum_hit,1);self.assertEqual(panel.pool.all_optima_retained,0)
            self.assertEqual(panel.pool.regret,F(0))
        verdict=s.evaluate_study(a,b)
        self.assertEqual(verdict.overall_verdict,'NO_GO_ARCHIVAL_USEFULNESS')
        self.assertIn('POOL_RECALL_BELOW_9_10',verdict.failed_gates)

    def test_replay_requires_all_480_runs_even_zero_cost_and_exact_seals(self):
        for bad in (self.secondary_runs[:-1],self.secondary_runs+(self.secondary_runs[0],),
                    (self.secondary_runs[0],)*480):
            with self.assertRaisesRegex(s.StudyError,'REPLAY_INCOMPLETE'):
                s.audit_replay(self.secondary,bad,self.truth)
        first=self.secondary_runs[0]
        for field in ('plan_digest','decision_digest'):
            bad=(replace(first,**{field:'0'*64}),)+self.secondary_runs[1:]
            with self.assertRaisesRegex(s.StudyError,'STALE_OR_INVALID_DECISION'):
                s.audit_replay(self.secondary,bad,self.truth)
        reordered=replace(first,observations=tuple(reversed(first.observations)))
        with self.assertRaisesRegex(s.StudyError,'REPLAY_REQUEST_INVALID'):
            s.audit_replay(self.secondary,(reordered,)+self.secondary_runs[1:],self.truth)
        wrong=replace(first,observations=(replace(first.observations[0],yield_strength=F(12345)),)+first.observations[1:])
        with self.assertRaisesRegex(s.StudyError,'REPLAY_REQUEST_INVALID'):
            s.audit_replay(self.secondary,(wrong,)+self.secondary_runs[1:],self.truth)

    def test_later_truth_requires_every_original_id_and_completeness_consistency(self):
        pid=self.panels[20].panel.panel_id
        missing=dict(self.truth);missing[pid]=missing[pid][:-1]
        with self.assertRaises(s.StudyError): s.audit_replay(self.secondary,self.secondary_runs,missing)
        unknown=dict(self.truth);unknown[pid]=(replace(unknown[pid][0],yield_strength=None),)+unknown[pid][1:]
        with self.assertRaisesRegex(s.StudyError,'METADATA_LINKAGE_CONFLICT'):
            s.audit_replay(self.secondary,self.secondary_runs,unknown)
        with self.assertRaises(s.StudyError):
            replace(self.secondary,calibration_targets={})
        with self.assertRaises(s.StudyError):
            s.ReservedCompleteness(tuple(p.panel for p in self.panels[:-1]),dict(self.secondary.completeness.complete_ids))

    def test_fixed_gate_boundaries_and_no_empty_denominator_success(self):
        margins,checks=s._gate_values(10,10,9,F(15,2),7,6,6,120,True)
        self.assertTrue(all(checks.values()))
        self.assertEqual(margins['pool_recall'],0);self.assertEqual(margins['pool_size'],0)
        self.assertEqual(margins['ranking_random'],0)
        for args,key in (((10,10,8,F(15,2),7,6,6,120,True),'pool_recall'),
                         ((10,10,9,F(15,2)+F(1,100),7,6,6,120,True),'pool_size'),
                         ((10,10,9,F(15,2),7,7,6,120,True),'ranking_processing'),
                         ((10,10,9,F(15,2),7,6,7,120,True),'ranking_objective_only'),
                         ((10,10,9,F(15,2),7,6,6,121,True),'ranking_random'),
                         ((10,9,9,F(15,2),7,6,6,120,True),'adequacy'),
                         ((10,10,9,F(15,2),7,6,6,120,False),'pool_status')):
            self.assertFalse(s._gate_values(*args)[1][key])
        margins,checks=s._gate_values(0,0,0,F(0),0,0,0,0,True)
        self.assertFalse(checks['adequacy']);self.assertFalse(checks['pool_recall']);self.assertFalse(checks['ranking_random'])
        self.assertIsNone(margins['pool_recall']);self.assertIsNone(margins['ranking_random'])
        self.assertIsNone(s.Rate(0,0).value)

    def test_metrics_exhaustive_small_complete_worlds_against_independent_oracle(self):
        possibilities=tuple(product((F(0),F(2)),(F(0),F(1))))
        for values in product(possibilities,repeat=3):
            truth=tuple(s.Targets(f'row-{i}',ys,elong) for i,(ys,elong) in enumerate(values))
            for count in range(4):
                for indices in combinations(range(3),count):
                    revealed=tuple(truth[i] for i in indices)
                    observed=s._metrics(truth,revealed,F(1))
                    expected=exact_metric_oracle(truth,revealed,F(1))
                    for key,value in expected.items(): self.assertEqual(getattr(observed,key),value)
        empty=s._metrics((),(),F(1))
        self.assertEqual((empty.any_optimum_hit,empty.all_optima_retained),(0,1))
        self.assertIsNone(empty.regret);self.assertEqual(empty.first_optimum_reason,'EMPTY_PANEL')

    def test_no_feasible_panels_exposes_unavailable_components_not_threshold_failures(self):
        labels=dict(self.labels)
        for frozen in self.panels[20:]:
            pid=frozen.panel.panel_id
            labels[pid]=tuple(replace(row,elongation=F(0)) for row in labels[pid])
        primary=plan_for(self.fit,self.panels,labels,'primary');secondary=plan_for(self.fit,self.panels,labels)
        truth={p.panel.panel_id:labels[p.panel.panel_id] for p in self.panels[20:]}
        a=s.audit_replay(primary,runs_for(primary,truth),truth);b=s.audit_replay(secondary,runs_for(secondary,truth),truth)
        result=s.evaluate_study(a,b)
        self.assertEqual(result.overall_verdict,'NO_GO_ARCHIVAL_USEFULNESS')
        self.assertIsNone(result.component_verdicts['pool_usefulness'])
        self.assertIsNone(result.component_verdicts['ranking_usefulness'])
        self.assertEqual(result.component_reasons['pool_usefulness'],('NO_FEASIBLE_CANDIDATE',))
        self.assertEqual(result.component_reasons['ranking_usefulness'],('SECONDARY_DISCOVERY_PANELS_BELOW_10',))
        self.assertEqual(set(result.failed_gates),{'NO_FEASIBLE_CANDIDATE','SECONDARY_DISCOVERY_PANELS_BELOW_10'})
        self.assertEqual(b.counts['complete_infeasible_panels'],20)
        self.assertEqual(b.macro_rates['pool_all_optima_complete'].value,F(1))
        self.assertIsNone(b.macro_rates['pool_all_optima_feasible'].value)

    def test_feasible_singletons_leave_ranking_unavailable_but_pool_failure_defined(self):
        labels=dict(self.labels)
        for frozen in self.panels[20:]:
            pid=frozen.panel.panel_id
            labels[pid]=tuple(replace(row,yield_strength=None) if row.record_id!=self.good[pid] else row for row in labels[pid])
        primary=plan_for(self.fit,self.panels,labels,'primary');secondary=plan_for(self.fit,self.panels,labels)
        truth={p.panel.panel_id:labels[p.panel.panel_id] for p in self.panels[20:]}
        a=s.audit_replay(primary,runs_for(primary,truth),truth);b=s.audit_replay(secondary,runs_for(secondary,truth),truth)
        result=s.evaluate_study(a,b)
        self.assertEqual(result.denominators['feasible_secondary_panels'],20)
        self.assertEqual(result.denominators['discovery_secondary_panels'],0)
        self.assertIs(result.component_verdicts['pool_usefulness'],False)
        self.assertIsNone(result.component_verdicts['ranking_usefulness'])
        self.assertIn('POOL_RECALL_BELOW_9_10',result.failed_gates)
        for code in ('RANKING_RANDOM_MARGIN_BELOW_1_10','RANKING_NOT_ABOVE_PROCESSING','RANKING_NOT_ABOVE_OBJECTIVE_ONLY'):
            self.assertNotIn(code,result.failed_gates)
        self.assertEqual(result.component_reasons['ranking_usefulness'],('SECONDARY_DISCOVERY_PANELS_BELOW_10',))
        self.assertTrue(all(panel.candidate_count==1 and panel.pool_size==0 for panel in b.panels))

    def test_explicit_unsupported_sampling_cannot_be_promoted_by_complete_secondary(self):
        plan=replace(self.secondary,sampling_premise='unsupported')
        self.assertEqual(plan.calibration.status,'unsupported_premise')
        self.assertTrue(all(len(decision.retained)==6 for decision in plan.decisions))
        self.assertIn('SAMPLING_PREMISE_UNSUPPORTED',plan.reasons)

    def test_source_has_no_file_io_cli_allocator_or_entropy_provider(self):
        path=Path(s.__file__);tree=ast.parse(path.read_text())
        imported={alias.name.split('.')[0] for node in ast.walk(tree) if isinstance(node,(ast.Import,ast.ImportFrom)) for alias in node.names}
        imports_from={node.module.split('.')[0] for node in ast.walk(tree) if isinstance(node,ast.ImportFrom) and node.module}
        calls={node.func.id for node in ast.walk(tree) if isinstance(node,ast.Call) and isinstance(node.func,ast.Name)}
        self.assertFalse((imported|imports_from)&{'os','pathlib','subprocess','requests','argparse','random','secrets'})
        self.assertFalse(calls&{'open','Path','eval','exec','urandom'})
        self.assertNotIn('__main__',path.read_text())


if __name__=='__main__': unittest.main()
