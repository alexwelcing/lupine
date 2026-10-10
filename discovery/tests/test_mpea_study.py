"""Synthetic known answers, independently chosen truth controls, no source reads."""
from dataclasses import FrozenInstanceError, replace
from fractions import Fraction as F
from hashlib import sha256
from itertools import product
import unittest
from pathlib import Path
import sys

# Standalone discovery works both in this ignored lane and after exact source
# promotion to repository scripts/. Never borrow path setup from another test.
TEST_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = next(parent for parent in Path(__file__).resolve().parents
    if (parent / 'src/lupine_discovery/decision_pool.py').is_file()
    and (parent / 'scripts/mpea_features.py').is_file())
SCRIPT = TEST_ROOT / 'scripts/mpea_study.py'
if not SCRIPT.is_file():
    raise RuntimeError('study kernel source is missing')
for directory in reversed((TEST_ROOT / 'scripts', REPOSITORY / 'scripts', REPOSITORY / 'src')):
    if str(directory) not in sys.path:
        sys.path.insert(0, str(directory))

import mpea_study as s
if Path(s.__file__).resolve() != SCRIPT.resolve():
    raise RuntimeError('study kernel module identity mismatch')
from lupine_discovery.representation import NormalizedVector


def vector(x=F(1)):
    return NormalizedVector(s.AXES, (x, 1-x) + (F(0),)*116)


def feature(ordinal, source=None, composition='known', processing='CAST', name=None):
    return s.FeatureRow(name or 'row-' + str(ordinal), ordinal, source or 'group-' + str(ordinal),
        vector() if composition == 'known' else composition, processing)


def training(*, known=True):
    # Exactly 50 complete records across 15 groups; nonconstant lower medians.
    return tuple(s.DevelopmentRow(feature(i+1, 'dev-' + str(i % 15), 'known' if known else None),
        s.Targets('row-' + str(i+1), F(i), F(i))) for i in range(50))


def simple_training():
    return tuple(s.DevelopmentRow(feature(i+1, 'dev-' + str(i % 15)),
        s.Targets('row-' + str(i+1), F(10), F(1))) for i in range(50))


def fixtures(m=2, missing=(), population='secondary', sampling='assumed_unverified',
             calibration_optimum_rank=1, future_values=None, all_infeasible=False):
    fit = s.fit_development(simple_training())
    panels = tuple(s.AssignedPanel('panel-' + str(j), 'reserved-' + str(j),
        tuple(feature(51+j*m+i, 'reserved-' + str(j)) for i in range(m))) for j in range(40))
    frozen = tuple(s.rank_panel(fit, p) for p in panels)
    labels = {}
    for j,p in enumerate(frozen):
        rank = p.orders['primary']
        rows = []
        for i,name in enumerate(rank):
            ys = F(10 if i == calibration_optimum_rank-1 else 0)
            if j >= 20 and future_values is not None:
                ys = F(future_values[i])
            elong = F(0 if all_infeasible else 1)
            if (j,i) in missing:
                ys = None
            rows.append(s.Targets(name, ys, elong))
        labels[p.panel.panel_id] = tuple(rows)
    complete = s.ReservedCompleteness(panels, {k: tuple(r.record_id for r in rows if r.complete) for k,rows in labels.items()})
    plan = s.calibrate_population(fit, frozen[:20], {p.panel.panel_id: labels[p.panel.panel_id] for p in frozen[:20]},
        frozen[20:], complete, population, sampling, 'a'*64, 'column 11: recorded YS MPa',
        'column 13: lower-development-median threshold; percentage points', 'synthetic complete target vault')
    return plan, {p.panel.panel_id: labels[p.panel.panel_id] for p in frozen[20:]}


def replay(plan, truth):
    lookups = {key: {r.record_id:r for r in rows} for key,rows in truth.items()}
    runs = tuple(s.PolicyRun(plan.plan_digest, sc.panel_id, sc.policy_id, sc.decision_digest,
        tuple(lookups[sc.panel_id][name] for name in sc.reveal_ids)) for sc in plan.schedules)
    return s.audit_replay(plan, runs, truth)


class ExactPredictorTests(unittest.TestCase):
    def test_lower_median_complete_rows_only_and_fixed_adequacy(self):
        rows = training()
        fit = s.fit_development(rows)
        self.assertEqual((fit.threshold,fit.global_medians), (F(24),(F(24),F(24))))
        incomplete = s.DevelopmentRow(feature(100,'unused'),s.Targets('row-100',F(999),None))
        self.assertEqual(s.fit_development(rows+(incomplete,)).threshold,F(24))
        rejected = s.fit_development(rows[:49])
        self.assertEqual(rejected.status,'NO_GO_INSUFFICIENT_DEVELOPMENT')
        self.assertEqual(rejected.reasons,('DEVELOPMENT_ROWS_BELOW_50',))
        self.assertIsNone(rejected.threshold)
        one_group = tuple(s.DevelopmentRow(replace(r.feature,source_group='one'),r.targets) for r in rows)
        self.assertEqual(s.fit_development(one_group).reasons,('DEVELOPMENT_GROUPS_BELOW_15',))
        with self.assertRaises(s.StudyError):
            s.predict(rejected,feature(101))

    def test_distinct_source_representatives_and_numeric_ordinal_ties(self):
        rows = training()
        fit = s.fit_development(rows)
        prediction = s.predict(fit,feature(101))
        # All distances tie; representatives from 15 sources are original ordinals1..15.
        self.assertEqual(prediction.neighbors,tuple(('row-'+str(i),F(0)) for i in range(1,6)))
        self.assertEqual((prediction.yield_strength,prediction.elongation),(F(2),F(2)))
        self.assertEqual(prediction.route,'FIVE_GROUP_NEIGHBORS')
        # Later same-source row can have arbitrarily better targets, never enters by target.
        amended = list(rows)
        amended[15] = s.DevelopmentRow(rows[15].feature,s.Targets('row-16',F(999),F(999)))
        self.assertEqual(s.predict(s.fit_development(amended),feature(101)).neighbors,prediction.neighbors)

    def test_nearest_per_source_then_exact_five_group_mean(self):
        rows = list(training())
        rows[0] = s.DevelopmentRow(replace(rows[0].feature,composition=vector(F(0))),rows[0].targets)
        fit = s.fit_development(rows)
        p = s.predict(fit,feature(101))
        self.assertEqual(tuple(x[0] for x in p.neighbors),('row-2','row-3','row-4','row-5','row-6'))
        self.assertEqual(p.yield_strength,F(3))
        self.assertEqual(s.composition_distance(vector(F(1,3)),vector(F(4,5))),F(14,15))

    def test_fewer_neighbors_and_all_fallback_routes(self):
        unknown = list(training(known=False))
        fit = s.fit_development(unknown)
        p = s.predict(fit,feature(101))
        self.assertEqual(p.route,'NO_KNOWN_DEVELOPMENT_COMPOSITION_PROCESSING')
        self.assertEqual(p.yield_strength,F(24))
        p = s.predict(fit,feature(102,composition=None,processing='UNRESOLVED'))
        self.assertEqual(p.route,'UNKNOWN_COMPOSITION_PROCESSING')
        self.assertEqual(p.processing_route,'GLOBAL_MEDIAN_EMPTY_CATEGORY')
        unknown[0]=s.DevelopmentRow(replace(unknown[0].feature,composition=vector()),unknown[0].targets)
        p=s.predict(s.fit_development(unknown),feature(103))
        self.assertEqual(p.route,'FEWER_GROUP_NEIGHBORS')
        self.assertEqual(p.yield_strength,F(0))
        # Explicit UNRESOLVED has its own category, not OTHER.
        unknown[1]=s.DevelopmentRow(replace(unknown[1].feature,processing='UNRESOLVED'),unknown[1].targets)
        p=s.predict(s.fit_development(unknown),feature(104,composition=None,processing='UNRESOLVED'))
        self.assertEqual(p.processing_route,'CATEGORY_MEDIAN')
        self.assertEqual(p.processing_yield_strength,F(1))

    def test_target_strictness_immutable_originals_and_resource_bounds(self):
        for bad in (False,0,0.0,'1',F(-1),F(1<<512)):
            with self.assertRaises(s.StudyError):
                s.Targets('x',bad,F(0))
        self.assertTrue(s.Targets('x',F(0),F(0)).complete)
        with self.assertRaises(s.StudyError):
            s.FeatureRow('x',True,'g',None,'CAST')
        with self.assertRaises(s.StudyError):
            s.FeatureRow('x',1,'g',NormalizedVector(('x',),(F(1),)),'CAST')
        a=F(1, (1<<8191)-1)
        b=F(1, (1<<8191)-2)
        with self.assertRaisesRegex(s.StudyError,'ARITHMETIC_LIMIT'):
            s.add(a,b)
        self.assertEqual(s.add(a,-a),0)
        self.assertEqual(s.multiply(F(1<<8191),F(1,1<<8191)),1)
        with self.assertRaisesRegex(s.StudyError,'ARITHMETIC_LIMIT'):
            s.multiply(F(1<<8191),F(2))
        rows=list(training())
        fit=s.fit_development(rows)
        rows.clear()
        self.assertEqual(len(fit.development),50)
        with self.assertRaises(TypeError):
            fit.processing_medians['CAST']=(F(0),F(0))
        with self.assertRaises(FrozenInstanceError):
            fit.threshold=F(0)

    def test_prediction_known_answer_independent_simplex_worlds(self):
        # Two varying axes; independent direct Fraction L1 and source grouping.
        rows=list(training())
        for i,row in enumerate(rows):
            rows[i]=s.DevelopmentRow(replace(row.feature,composition=vector(F(i%7,6))),row.targets)
        fit=s.fit_development(rows)
        for n in range(13):
            q=F(n,12)
            expected={}
            for row in rows:
                distance=2*abs(q-row.feature.composition.values[0])
                item=(distance,row.feature.ordinal,row)
                if row.feature.source_group not in expected or item[:2]<expected[row.feature.source_group][:2]:
                    expected[row.feature.source_group]=item
            chosen=sorted(expected.values(),key=lambda x:x[:2])[:5]
            prediction=s.predict(fit,feature(101,composition=vector(q)))
            self.assertEqual(prediction.yield_strength,sum(x[2].targets.yield_strength for x in chosen)/5)
            self.assertEqual(prediction.neighbors,tuple((x[2].feature.record_id,x[0]) for x in chosen))

    def test_primary_feasibility_direction_and_objective_only_control(self):
        rows=[]
        for i in range(50):
            low=i<10
            row=feature(i+1,'dev-'+str(i%15),composition=vector(F(0) if low else F(1)))
            rows.append(s.DevelopmentRow(row,s.Targets(row.record_id,F(100 if low else 10),F(0 if low else 2))))
        fit=s.fit_development(rows)
        self.assertEqual(fit.threshold,2)
        panel=s.AssignedPanel('p','g',(feature(101,'g',composition=vector(F(0))),
                                      feature(102,'g',composition=vector(F(1)))))
        ranked=s.rank_panel(fit,panel)
        self.assertEqual(ranked.orders['primary'],('row-102','row-101'))
        self.assertEqual(ranked.orders['objective_only'],('row-101','row-102'))
        self.assertEqual(tuple((p.yield_strength,p.elongation) for p in ranked.predictions),((F(100),F(0)),(F(10),F(2))))
        # Equality is feasible; changing <=/strictness would reverse the primary order.
        self.assertEqual(ranked.predictions[1].elongation,fit.threshold)

    def test_original_zero_based_ordinal_boundary(self):
        row=feature(0)
        self.assertEqual(row.ordinal,0)
        self.assertEqual(feature(1544).ordinal,1544)
        for ordinal in (-1,1545):
            with self.assertRaises(s.StudyError):
                feature(ordinal)
        rows=list(training())
        rows[0]=s.DevelopmentRow(feature(0,'dev-0'),s.Targets('row-0',F(0),F(0)))
        prediction=s.predict(s.fit_development(rows),feature(101))
        self.assertEqual(prediction.neighbors[0],('row-0',F(0)))

    def test_frozen_rank_hash_rules_no_label_input(self):
        fit=s.fit_development(training())
        panel=s.AssignedPanel('p','g',tuple(feature(i,'g',composition=None) for i in (101,102,103)))
        frozen=s.rank_panel(fit,panel)
        expected=tuple(r.record_id for r in sorted(panel.rows,key=lambda r:(sha256(
            b'mpea-t25-archive-option-v1\0tie\0'+r.record_id.encode()).hexdigest(),r.ordinal)))
        self.assertEqual(frozen.orders['primary'],expected)
        self.assertEqual(frozen.orders['objective_only'],expected)
        for seed in range(20):
            expected=tuple(r.record_id for r in sorted(panel.rows,key=lambda r:(sha256(
                b'mpea-t25-archive-option-v1\0random-'+str(seed).encode()+b'\0'+r.record_id.encode()).hexdigest(),r.ordinal)))
            self.assertEqual(frozen.orders['random_'+str(seed)],expected)
        with self.assertRaises(TypeError):
            frozen.orders['primary']=()


class CalibrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.plan,cls.truth=fixtures()

    def test_exact_rank_and_weak_tied_optimum_score(self):
        plan=self.plan
        self.assertEqual((plan.calibration.n,plan.calibration.k,plan.calibration.threshold),(20,19,F(1,2)))
        self.assertEqual(len(plan.schedules),480)
        self.assertTrue(all(len(d.retained)==1 for d in plan.decisions))
        changed={k:tuple(s.Targets(r.record_id,F(10),r.elongation) for r in rows)
            for k,rows in plan.calibration_targets.items()}
        tie=replace(plan,calibration_targets=changed)
        self.assertEqual(tie.calibration.threshold,F(1))
        self.assertTrue(all(len(d.retained)==2 for d in tie.decisions))
        # Exactly two worst-ranked calibration optima suffice to force rank19 to1.
        changed=dict(plan.calibration_targets)
        for frozen in plan.calibration_panels[:2]:
            rows=changed[frozen.panel.panel_id]
            changed[frozen.panel.panel_id]=tuple(s.Targets(r.record_id,F(10),r.elongation) for r in rows)
        self.assertEqual(replace(plan,calibration_targets=changed).calibration.threshold,1)

    def test_all40_missing_evaluation_forces_primary_unsupported(self):
        primary,truth=fixtures(missing=((20,0),),population='primary')
        self.assertEqual(primary.calibration.complete_count,20)
        self.assertEqual(primary.calibration.status,'unsupported_premise')
        self.assertIsNone(primary.calibration.threshold)
        self.assertTrue(all(len(d.retained)==2 for d in primary.decisions))
        self.assertIn('PRIMARY_ENDPOINTS_UNDEFINED',primary.reasons)
        secondary=replace(primary,population='secondary')
        self.assertEqual(secondary.calibration.status,'finite_conditional')
        original=primary.future_panels[0]
        keep=set(primary.completeness.complete_ids[original.panel.panel_id])
        for policy in s.FULL_POLICIES:
            self.assertEqual(secondary.orders[original.panel.panel_id][policy],tuple(x for x in original.orders[policy] if x in keep))
        audit=replay(primary,truth)
        self.assertEqual(audit.counts['unknown_panels'],1)
        unknown=audit.panels[0]
        self.assertIsNone(unknown.pool.all_optima_retained)
        self.assertIsNone(unknown.pool.feasible_hit)
        self.assertEqual(unknown.pool.observed_known_feasible_count,2)
        self.assertTrue(unknown.pool.whole_universe_retained)
        self.assertEqual(audit.macro_rates['pool_all_optima_feasible'].denominator,19)

    def test_incomplete_calibration_reasons_preserved_and_secondary_empty(self):
        primary,_=fixtures(missing=((0,0),(0,1),(20,0),(20,1)),population='primary')
        self.assertIn('incomplete_calibration_truth',primary.calibration.reasons)
        self.assertIn('unsupported_sampling_premise',primary.calibration.reasons)
        secondary=replace(primary,population='secondary')
        self.assertEqual(secondary.calibration.n,20)
        self.assertEqual(secondary.calibration.scores[0].score,0)
        self.assertEqual(secondary.decisions[0].m,0)
        self.assertEqual(secondary.orders[secondary.future_panels[0].panel.panel_id]['primary'],())
        self.assertEqual(sum(sc.panel_id==secondary.future_panels[0].panel.panel_id for sc in secondary.schedules),24)

    def test_future_numeric_truth_cannot_change_the_frozen_selection(self):
        # Completeness stays identical; future numeric values never enter the plan.
        first,truth1=fixtures(future_values=(0,999))
        second,truth2=fixtures(future_values=(999,0))
        self.assertEqual(first.plan_digest,second.plan_digest)
        self.assertEqual(tuple(d.decision_digest for d in first.decisions),tuple(d.decision_digest for d in second.decisions))
        self.assertNotEqual(replay(first,truth1).replay_digest,replay(second,truth2).replay_digest)
        self.assertEqual(replay(first,truth1).panels[0].pool.any_optimum_hit,0)
        self.assertEqual(replay(second,truth2).panels[0].pool.any_optimum_hit,1)

    def test_sampling_unsupported_is_never_promoted(self):
        plan=replace(self.plan,sampling_premise='unsupported')
        self.assertEqual(plan.calibration.status,'unsupported_premise')
        self.assertIsNone(plan.calibration.threshold)
        self.assertTrue(all(len(d.retained)==2 for d in plan.decisions))

    def test_complete_manifest_and_role_membership_conflicts_rejected(self):
        plan=self.plan
        with self.assertRaises(s.StudyError):
            replace(plan,calibration_panels=plan.calibration_panels[:-1])
        with self.assertRaises(s.StudyError):
            replace(plan,future_panels=plan.calibration_panels)
        with self.assertRaises(s.StudyError):
            s.ReservedCompleteness(plan.completeness.panels[:-1],plan.completeness.complete_ids)
        wrong=dict(plan.completeness.complete_ids)
        wrong[plan.completeness.panels[0].panel_id]=('foreign',)
        with self.assertRaises(s.StudyError):
            s.ReservedCompleteness(plan.completeness.panels,wrong)
        wrong=dict(plan.calibration_targets)
        name=next(iter(wrong))
        wrong[name]=wrong[name][:-1]
        with self.assertRaises(s.StudyError):
            replace(plan,calibration_targets=wrong)
        with self.assertRaises(s.StudyError):
            replace(plan,freeze_reference='stale')

    def test_zero_threshold_is_statistical_empty_and_can_lose_future_optimum(self):
        plan,truth=fixtures(all_infeasible=True)
        self.assertEqual(plan.calibration.threshold,0)
        truth={k:tuple(s.Targets(r.record_id,r.yield_strength,F(1)) for r in rows) for k,rows in truth.items()}
        result=replay(plan,truth)
        self.assertEqual(result.panels[0].pool_size,0)
        self.assertEqual(result.panels[0].pool.all_optima_retained,0)
        self.assertIsNone(result.panels[0].pool.regret)
        self.assertEqual(result.panels[0].pool.reason,'NO_FEASIBLE_REVEAL')
        self.assertIn('statistical_empty_pool',plan.decisions[0].reasons)


class ReplayTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.plan,cls.truth=fixtures(future_values=(10,10))
        cls.audit=replay(cls.plan,cls.truth)

    def test_all_ties_lost_optimum_and_equal_cost_controls(self):
        panel=self.audit.panels[0]
        self.assertEqual(panel.pool.any_optimum_hit,1)
        self.assertEqual(panel.pool.all_optima_retained,0)
        self.assertEqual(panel.pool.regret,0)
        self.assertEqual(panel.pool_fraction,F(1,2))
        for policy in s.POLICIES:
            self.assertEqual(panel.policies[policy].at_pool_cost.actual_cost,1)
        self.assertEqual(panel.policies['primary'].at_pool_cost,panel.policies['stopped'].at_pool_cost)
        self.assertEqual(panel.policies['primary'].snapshots[4].actual_cost,2)
        self.assertEqual(panel.policies['stopped'].snapshots[4].actual_cost,1)
        self.assertEqual(self.audit.costs['scheduled_policy_runs'],480)
        self.assertEqual(self.audit.costs['policy_bundle_requests'],20*(23*2+1))

    def test_stale_missing_outoforder_duplicate_and_rewritten_reveals(self):
        audit=self.audit
        for invalid in (audit.runs[:-1],audit.runs+(audit.runs[0],)):
            with self.assertRaisesRegex(s.StudyError,'REPLAY_INCOMPLETE'):
                s.audit_replay(audit.plan,invalid,audit.truth)
        changed=list(audit.runs)
        for replacement in (replace(changed[0],plan_digest='b'*64),
                            replace(changed[0],decision_digest='b'*64)):
            with self.assertRaisesRegex(s.StudyError,'STALE_OR_INVALID_DECISION'):
                s.audit_replay(audit.plan,(replacement,)+tuple(changed[1:]),audit.truth)
        first=changed[0]
        for observations in (tuple(reversed(first.observations)),first.observations[:-1],
                (replace(first.observations[0],yield_strength=F(99)),)+first.observations[1:]):
            replacement=replace(first,observations=observations)
            with self.assertRaisesRegex(s.StudyError,'REPLAY_REQUEST_INVALID'):
                s.audit_replay(audit.plan,(replacement,)+tuple(changed[1:]),audit.truth)

    def test_truth_incomplete_must_match_original_roleblind_membership(self):
        truth=dict(self.truth)
        key=next(iter(truth))
        truth[key]=(replace(truth[key][0],elongation=None),)+truth[key][1:]
        with self.assertRaisesRegex(s.StudyError,'METADATA_LINKAGE_CONFLICT'):
            s.audit_replay(self.plan,self.audit.runs,truth)
        with self.assertRaises(TypeError):
            self.audit.panels[0].policies['primary']=None

    def test_empty_and_infeasible_metrics_and_unknown_never_zero(self):
        threshold=F(1)
        empty=s._metrics((),(),threshold)
        self.assertEqual((empty.any_optimum_hit,empty.all_optima_retained),(0,1))
        self.assertEqual(empty.reason,'EMPTY_PANEL')
        bad=(s.Targets('a',F(4),F(0)),)
        result=s._metrics(bad,bad,threshold)
        self.assertEqual(result.reason,'NO_FEASIBLE_CANDIDATE')
        self.assertIsNone(result.regret)
        self.assertIsNone(result.first_optimum_cost)
        unknown=(s.Targets('a',None,F(2)),)
        result=s._metrics(unknown,unknown,threshold)
        self.assertIsNone(result.any_optimum_hit)
        self.assertIsNone(result.feasible_hit)
        self.assertEqual(result.observed_known_feasible_count,1)
        self.assertEqual(result.first_optimum_reason,'TRUTH_UNKNOWN')
        self.assertIsNone(s.Rate(0,0).value)

    def test_independent_full_truth_metric_oracle_exhaustive(self):
        # All 81 two-row worlds: objective, feasibility and ties independently enumerated.
        for a,b in product(product(range(3),range(3)), repeat=2):
            rows=(s.Targets('a',F(a[0]),F(a[1])),s.Targets('b',F(b[0]),F(b[1])))
            feasible=[r for r in rows if r.elongation>=1]
            optima=set() if not feasible else {r.record_id for r in feasible if r.yield_strength==max(x.yield_strength for x in feasible)}
            for selected in ((),rows[:1],rows[1:],rows):
                result=s._metrics(rows,selected,F(1))
                names={r.record_id for r in selected}
                self.assertEqual(result.any_optimum_hit,int(bool(optima&names)))
                self.assertEqual(result.all_optima_retained,int(optima<=names))
                revealed=[r.yield_strength for r in selected if r.elongation>=1]
                expected=max(r.yield_strength for r in feasible)-max(revealed) if feasible and revealed else None
                self.assertEqual(result.regret,expected)

    def test_gates_preserve_all_failures_no_inflation_by_ties_or_small_panels(self):
        secondary=self.audit
        primary_plan=replace(self.plan,population='primary')
        primary=replay(primary_plan,self.truth)
        report=s.evaluate_study(primary,secondary)
        self.assertEqual(report.overall_verdict,'NO_GO_ARCHIVAL_USEFULNESS')
        self.assertEqual(report.denominators['discovery_secondary_panels'],20)
        self.assertEqual(report.margins['pool_recall'],-180)
        self.assertEqual(report.margins['pool_size'],F(20))
        self.assertIn('POOL_RECALL_BELOW_9_10',report.failed_gates)
        self.assertIn('RANKING_RANDOM_MARGIN_BELOW_1_10',report.failed_gates)
        self.assertIn('RANKING_NOT_ABOVE_PROCESSING',report.failed_gates)
        self.assertIn('RANKING_NOT_ABOVE_OBJECTIVE_ONLY',report.failed_gates)
        self.assertEqual(report.costs['evaluation_unique_bundles'],40)
        self.assertEqual(report.costs['development_unique_bundles'],50)
        self.assertEqual(report.denominators['scheduled_policy_runs'],960)

    def test_every_gate_equality_boundary_exactly(self):
        # F=D=10, recall9/10, mean fraction3/4, random improvement1/10.
        margins,checks=s._gate_values(10,10,9,F(15,2),8,7,7,140,True)
        self.assertEqual(margins,dict(adequacy=0,pool_recall=0,pool_size=F(0),
            ranking_random=0,ranking_processing=1,ranking_objective_only=1))
        self.assertTrue(all(checks.values()))
        for args,key in (((10,9,9,F(15,2),8,7,7,140,True),'adequacy'),
                         ((10,10,8,F(15,2),8,7,7,140,True),'pool_recall'),
                         ((10,10,9,F(15,2)+F(1,1000),8,7,7,140,True),'pool_size'),
                         ((10,10,9,F(15,2),8,7,7,140,False),'pool_status'),
                         ((10,10,9,F(15,2),8,7,7,141,True),'ranking_random'),
                         ((10,10,9,F(15,2),8,8,7,140,True),'ranking_processing'),
                         ((10,10,9,F(15,2),8,7,8,140,True),'ranking_objective_only')):
            self.assertFalse(s._gate_values(*args)[1][key])
        for args in ((0,0,0,F(0),0,0,0,0,True),):
            margins,checks=s._gate_values(*args)
            self.assertIsNone(margins['pool_size'])
            self.assertIsNone(margins['ranking_random'])
            self.assertFalse(checks['pool_recall'])
        with self.assertRaises(s.StudyError):
            s._gate_values(10,10,11,F(0),0,0,0,0,True)

    def test_available_pool_but_unavailable_singleton_discovery(self):
        plan,truth=fixtures(m=1)
        report=s.evaluate_study(replay(replace(plan,population='primary'),truth),replay(plan,truth))
        self.assertEqual(report.denominators['feasible_secondary_panels'],20)
        self.assertEqual(report.denominators['discovery_secondary_panels'],0)
        self.assertIs(report.component_verdicts['pool_usefulness'],False)
        self.assertIsNone(report.component_verdicts['ranking_usefulness'])
        self.assertIn('POOL_MEAN_FRACTION_ABOVE_3_4',report.failed_gates)
        self.assertNotIn('RANKING_NOT_ABOVE_PROCESSING',report.failed_gates)
        self.assertEqual(report.component_reasons['ranking_usefulness'],('SECONDARY_DISCOVERY_PANELS_BELOW_10',))
        self.assertEqual(report.overall_verdict,'NO_GO_ARCHIVAL_USEFULNESS')

    def test_empty_feasible_denominators_cannot_pass(self):
        plan,truth=fixtures(all_infeasible=True)
        report=s.evaluate_study(replay(replace(plan,population='primary'),truth),replay(plan,truth))
        self.assertEqual(report.denominators['feasible_secondary_panels'],0)
        self.assertIsNone(report.margins['pool_recall'])
        self.assertIsNone(report.margins['ranking_random'])
        self.assertFalse(report.component_verdicts['adequacy'])
        self.assertIsNone(report.component_verdicts['pool_usefulness'])
        self.assertIsNone(report.component_verdicts['ranking_usefulness'])
        self.assertEqual(report.gate_reasons['pool_recall'],('NO_FEASIBLE_CANDIDATE',))
        self.assertEqual(report.component_reasons['ranking_usefulness'],('SECONDARY_DISCOVERY_PANELS_BELOW_10',))
        self.assertNotIn('POOL_RECALL_BELOW_9_10',report.failed_gates)
        self.assertNotIn('POOL_MEAN_FRACTION_ABOVE_3_4',report.failed_gates)
        self.assertNotIn('RANKING_RANDOM_MARGIN_BELOW_1_10',report.failed_gates)
        self.assertFalse(report.gate_checks['pool_recall'])
        self.assertFalse(report.gate_checks['ranking_random'])
        self.assertEqual(report.overall_verdict,'NO_GO_ARCHIVAL_USEFULNESS')


if __name__ == '__main__':
    unittest.main()
