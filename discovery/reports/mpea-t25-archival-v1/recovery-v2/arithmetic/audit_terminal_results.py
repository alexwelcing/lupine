"""Independent exact arithmetic audit, usable only after both attempts terminate.

Standard library only. Never imports a producer, fits a model, reads source CSV
or feature files, allocates, or writes back into an attempt. The explicit terminal
manifest is supplied by the parent only after its execution authorization.
"""
from collections import Counter
from fractions import Fraction
from hashlib import sha256
import argparse
import json
import os
from pathlib import Path
import re
import stat

F = Fraction
CAPS = (0, 1, 2, 4, 8, 16, 32)
POLICIES = ('primary', 'stopped', 'processing', 'objective_only') + tuple('random_'+str(i) for i in range(20))
STAGES = ('allocation', 'input_freeze', 'development', 'rank_freeze', 'reserved', 'calibration', 'replay', 'evaluation')
ROLES = ('DEVELOPMENT', 'CALIBRATION', 'EVALUATION')
REASONS = ('TRUTH_UNKNOWN', 'EMPTY_PANEL', 'NO_FEASIBLE_CANDIDATE', 'NO_FEASIBLE_REVEAL', 'NOT_REACHED')
SOURCE = {'bytes': 332126, 'md5': '6d29eb6018157b863ca0033ccec936d5', 'sha256': 'c5504d93fd324d1be26cf814d0694ee9ee95578d68a0b38aba6813b939fa2c5d'}
ALLOWED = {'attempt-result.json', 'public-report.json', 'development-targets.json',
           'calibration-vault.json', 'evaluation-vault.json'} | {
    'stage-%02d-%s.json' % (i, name.replace('_', '-')) for i, name in enumerate(STAGES)
    if name in ('development', 'reserved', 'calibration', 'replay', 'evaluation')}


class AuditError(ValueError):
    """Codes only: never include private row IDs, values or exception text."""


def need(condition, code='AUDIT_MISMATCH'):
    if not condition:
        raise AuditError(code)


def wire(x):
    if type(x) is F:
        return f'{x.numerator}/{x.denominator}'
    if type(x) in (tuple, list):
        return [wire(y) for y in x]
    if type(x) is dict:
        return {k: wire(v) for k, v in x.items()}
    return x


def canonical(x):
    return (json.dumps(wire(x), sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False)+'\n').encode()


def digest(x):
    return sha256(canonical(x)).hexdigest()


def equal(a, b, code='ARITHMETIC_MISMATCH'):
    need(canonical(a) == canonical(b), code)


def rational(x):
    need(type(x) is str and len(x) <= 5000 and re.fullmatch(r'-?(0|[1-9][0-9]*)/[1-9][0-9]*', x) is not None, 'EXACT_SCALAR_INVALID')
    n, d = x.split('/')
    need(len(n) <= 2468 and len(d) <= 2467, 'EXACT_SCALAR_LIMIT')
    q = F(int(n), int(d))
    need(max(abs(q.numerator).bit_length(), q.denominator.bit_length()) <= 8192, 'EXACT_SCALAR_LIMIT')
    equal(wire(q), x, 'EXACT_SCALAR_INVALID')
    return q


def target_rows(rows):
    """Read final parser states, never reinterpret raw lexical targets."""
    need(type(rows) is list and len(rows) <= 314)
    result = {}
    for row in rows:
        rid = row['record_id']
        need(type(rid) is str and rid not in result)
        values = []
        for field in ('yield_strength', 'elongation'):
            state = row[field]
            need(type(state) is dict and set(state) == {'status', 'reason', 'value'})
            q = rational(state['value']) if state['status'] == 'VALID' else None
            need((q is not None and q >= 0) or state['value'] is None)
            values.append(q)
        result[rid] = tuple(values)
    return result


def metrics(truth, observed, threshold):
    """Finite-set definitions, with complete truth required for global optima."""
    need(len(observed) == len(set(observed)) and set(observed) <= set(truth))
    known_feasible = [name for name in observed if truth[name][1] is not None and truth[name][1] >= threshold]
    base = dict(actual_cost=len(observed), observed_known_feasible_count=len(known_feasible),
                whole_universe_retained=set(observed) == set(truth))
    if any(y is None or e is None for y, e in truth.values()):
        return dict(base, truth_status='UNKNOWN', reason='TRUTH_UNKNOWN', any_optimum_hit=None,
            all_optima_retained=None, feasible_hit=None, best_feasible_yield_strength=None,
            regret=None, first_optimum_cost=None, first_optimum_reason='TRUTH_UNKNOWN')
    feasible = {name: y for name, (y, e) in truth.items() if e >= threshold}
    if not feasible:
        why = 'EMPTY_PANEL' if not truth else 'NO_FEASIBLE_CANDIDATE'
        return dict(base, truth_status='COMPLETE', reason=why, any_optimum_hit=0,
            all_optima_retained=1, feasible_hit=0, best_feasible_yield_strength=None,
            regret=None, first_optimum_cost=None, first_optimum_reason=why)
    best = max(feasible.values())
    optimum = {name for name, value in feasible.items() if value == best}
    achieved = max((feasible[name] for name in observed if name in feasible), default=None)
    first = next((index for index, name in enumerate(observed, 1) if name in optimum), None)
    return dict(base, truth_status='COMPLETE', reason='NO_FEASIBLE_REVEAL' if achieved is None else None,
        any_optimum_hit=int(bool(optimum.intersection(observed))), all_optima_retained=int(optimum <= set(observed)),
        feasible_hit=int(bool(known_feasible)), best_feasible_yield_strength=achieved,
        regret=None if achieved is None else best-achieved, first_optimum_cost=first,
        first_optimum_reason='NOT_REACHED' if first is None else None)


def summary(values, reasons=None, binary=False):
    known = [F(value) for value in values if value is not None]
    why = dict.fromkeys(REASONS, 0)
    if reasons is not None:
        need(len(values) == len(reasons))
        for value, reason in zip(values, reasons):
            if value is None:
                need(reason in why)
                why[reason] += 1
    out = dict(panel_denominator=len(values), known_count=len(known), unavailable_count=len(values)-len(known), unavailable_reasons=why)
    if binary:
        need(all(x in (0, 1) for x in known))
        out.update(success_count=sum(map(int, known)), rate=sum(known, F())/len(known) if known else None)
    else:
        out.update(sum=sum(known, F()) if known else None, mean=sum(known, F())/len(known) if known else None)
    return out


def metric_group(panels, values):
    out = dict(panel_count=len(panels), truth_complete_count=sum(p['truth_status']=='COMPLETE' for p in panels),
        truth_unknown_count=sum(p['truth_status']=='UNKNOWN' for p in panels),
        empty_count=sum(p['candidate_count']==0 for p in panels),
        complete_infeasible_count=sum(p['candidate_count']>0 and p['feasible_count']==0 for p in panels),
        feasible_count=sum(bool(p['feasible_count']) for p in panels),
        actual_bundle_cost=summary([m['actual_cost'] for m in values]),
        observed_known_feasible_row_total=sum(m['observed_known_feasible_count'] for m in values),
        whole_universe_retained_panel_count=sum(m['whole_universe_retained'] for m in values))
    for key in ('any_optimum_hit', 'all_optima_retained', 'feasible_hit'):
        out[key] = summary([m[key] for m in values], ['TRUTH_UNKNOWN' if p['truth_status']=='UNKNOWN' else None for p in panels], True)
    for key in ('best_feasible_yield_strength', 'regret', 'first_optimum_cost'):
        out[key] = summary([m[key] for m in values], [m['first_optimum_reason' if key=='first_optimum_cost' else 'reason'] for m in values])
    return out


def metric_views(panels, values):
    selected = [(p, m) for p, m in zip(panels, values) if p['feasible_count']]
    return dict(assigned_panels=metric_group(panels, values),
        observed_feasible_panels=metric_group([p for p, _ in selected], [m for _, m in selected]))


def rate(n, d):
    return dict(numerator=n, denominator=d, value=F(n, d) if d else None)


def population(plan, runs, truth_by_panel, original_rows, threshold, expected_panels=20):
    ranked, decisions, schedules = plan['ranked_future'], plan['decisions'], plan['schedules']
    need(len(ranked)==len(decisions)==expected_panels and len(schedules)==len(runs)==expected_panels*24)
    schedule_map = {(s['panel_id'], s['policy_id']): s for s in schedules}
    run_map = {(r['panel_id'], r['policy_id']): r for r in runs}
    need(len(schedule_map)==len(run_map)==len(runs) and set(schedule_map)==set(run_map))
    panels=[]; original_unknown=0; population_unknown=0
    for ranked_panel, decision in zip(ranked, decisions):
        pid = ranked_panel['panel_id'].rsplit('/', 1)[-1]
        ids = ranked_panel['candidate_ids']; order = ranked_panel['ranked_ids']; retained=decision['retained']
        need(pid in truth_by_panel and len(ids)==len(set(ids)) and set(order)==set(ids) and len(order)==len(ids))
        all_truth = truth_by_panel[pid]
        need(set(ids) <= set(all_truth))
        expected_ids = set(all_truth) if plan['population']=='primary' else {name for name,(y,e) in all_truth.items() if y is not None and e is not None}
        need(set(ids)==expected_ids)
        need(retained==[name for name in order if name in set(retained)] and len(retained)==len(set(retained)))
        calibration = plan['calibration']
        tau = rational(calibration['threshold']) if calibration['threshold'] is not None else None
        expected_pool = [name for rank,name in enumerate(order,1) if rank <= len(order)*tau] if calibration['status']=='finite_conditional' else order
        equal(retained, expected_pool)
        truth = {name: all_truth[name] for name in ids}
        original_unknown += sum(y is None or e is None for y,e in all_truth.values())
        population_unknown += sum(y is None or e is None for y,e in truth.values())
        pool=metrics(truth,retained,threshold); complete=pool['truth_status']=='COMPLETE'
        feasible={name:y for name,(y,e) in truth.items() if e is not None and e>=threshold} if complete else None
        best=max(feasible.values()) if feasible else None
        optima=[name for name in ids if feasible is not None and name in feasible and feasible[name]==best] if complete else None
        reason='TRUTH_UNKNOWN' if not complete else 'EMPTY_PANEL' if not truth else 'NO_FEASIBLE_CANDIDATE' if not feasible else None
        p=dict(panel_id=pid, original_candidate_count=len(all_truth), candidate_count=len(ids), pool_size=len(retained),
            pool_fraction=F(len(retained),len(ids)) if ids else None, pool_fraction_reason=None if ids else 'EMPTY_PANEL',
            truth_status=pool['truth_status'],truth_reason=reason,feasible_count=len(feasible) if complete else None,
            optimum_ids=optima,pool=pool,policies={})
        for policy in POLICIES:
            schedule=schedule_map[pid,policy]; run=run_map[pid,policy]
            equal(run['plan_digest'],plan['plan_digest']);equal(run['decision_digest'],decision['decision_digest'])
            equal(schedule['decision_digest'],decision['decision_digest'])
            fixed=schedule['order']; revealed=schedule['reveal_ids']
            if policy=='stopped': equal(fixed,retained);equal(revealed,retained)
            else:
                need(len(fixed)==len(ids) and set(fixed)==set(ids));equal(revealed,fixed[:32])
                if policy=='primary':equal(fixed,order)
            equal(schedule['snapshots'],sorted(set(CAPS+(len(retained),))))
            observations=run['observations'];equal([row['record_id'] for row in observations],revealed)
            for row in observations:
                equal({k:row[k] for k in ('yield_strength','elongation')},dict(zip(('yield_strength','elongation'),all_truth[row['record_id']])))
            p['policies'][policy]=dict(snapshots=[dict(budget=cap,metrics=metrics(truth,revealed[:cap],threshold)) for cap in CAPS],
                at_pool_cost=metrics(truth,revealed[:len(retained)],threshold),final=metrics(truth,revealed,threshold))
        panels.append(p)
    need(set(truth_by_panel)=={p['panel_id'] for p in panels})
    complete=[p for p in panels if p['truth_status']=='COMPLETE'];feasible=[p for p in complete if p['feasible_count']]
    counts=dict(assigned_panels=expected_panels,complete_panels=len(complete),unknown_panels=expected_panels-len(complete),
        empty_panels=sum(p['candidate_count']==0 for p in panels),complete_infeasible_panels=sum(p['candidate_count']>0 and p['feasible_count']==0 for p in complete),
        feasible_panels=len(feasible),original_candidate_total=sum(p['original_candidate_count'] for p in panels),
        population_candidate_total=sum(p['candidate_count'] for p in panels),retained_candidate_total=sum(p['pool_size'] for p in panels),
        original_unknown_candidate_total=original_unknown,population_unknown_candidate_total=population_unknown)
    macros=dict(pool_all_optima_feasible=rate(sum(p['pool']['all_optima_retained'] for p in feasible),len(feasible)),
        pool_all_optima_complete=rate(sum(p['pool']['all_optima_retained'] for p in complete),len(complete)))
    policy_rates={}; public_policy={}
    for policy in POLICIES:
        policy_rates[policy]=[dict(budget=cap,rates={
            'any_optimum_feasible':rate(sum(p['policies'][policy]['snapshots'][i]['metrics']['any_optimum_hit'] for p in feasible),len(feasible)),
            'all_optima_feasible':rate(sum(p['policies'][policy]['snapshots'][i]['metrics']['all_optima_retained'] for p in feasible),len(feasible)),
            'any_optimum_complete':rate(sum(p['policies'][policy]['snapshots'][i]['metrics']['any_optimum_hit'] for p in complete),len(complete))}) for i,cap in enumerate(CAPS)]
        public_policy[policy]=dict(scheduled_runs=expected_panels,completed_runs=expected_panels,
            budget_snapshots=[dict(requested_cap=cap,metrics=metric_views(panels,[p['policies'][policy]['snapshots'][i]['metrics'] for p in panels])) for i,cap in enumerate(CAPS)],
            same_actual_pool_cost=metric_views(panels,[p['policies'][policy]['at_pool_cost'] for p in panels]),
            final=metric_views(panels,[p['policies'][policy]['final'] for p in panels]))
    costs=dict(policy_bundle_requests=sum(len(r['observations']) for r in runs),full_truth_unique_bundles=original_rows,
        scheduled_policy_runs=expected_panels*24,completed_policy_runs=len(runs))
    public_population=dict(counts=counts,pool=metric_views(panels,[p['pool'] for p in panels]),
        pool_fraction_assigned=summary([p['pool_fraction'] for p in panels],[p['pool_fraction_reason'] for p in panels]),
        pool_fraction_observed_feasible=summary([p['pool_fraction'] for p in feasible]),logical_costs=costs)
    return dict(panels=panels,counts=counts,macro_rates=macros,policy_rates=policy_rates,costs=costs,
                public_population=public_population,public_policy=public_policy)


def gates(secondary, finite):
    feasible=[p for p in secondary['panels'] if p['feasible_count']]
    discovery=[p for p in feasible if p['candidate_count']>=2]
    f,d=len(feasible),len(discovery)
    recalled=sum(p['pool']['all_optima_retained'] for p in feasible)
    fractions=sum((p['pool_fraction'] for p in feasible),F())
    hits={policy:sum(p['policies'][policy]['snapshots'][3]['metrics']['any_optimum_hit'] for p in discovery) for policy in POLICIES}
    a,p,o=hits['primary'],hits['processing'],hits['objective_only'];r=sum(hits['random_'+str(i)] for i in range(20))
    margins=dict(adequacy=d-10,pool_recall=10*recalled-9*f if f else None,pool_size=3*f-4*fractions if f else None,
        ranking_random=20*a-r-2*d if d else None,ranking_processing=a-p if d else None,ranking_objective_only=a-o if d else None)
    checks=dict(adequacy=d>=10,pool_recall=bool(f) and margins['pool_recall']>=0,pool_size=bool(f) and margins['pool_size']>=0,
        pool_status=finite,ranking_random=bool(d) and margins['ranking_random']>=0,
        ranking_processing=bool(d) and margins['ranking_processing']>0,ranking_objective_only=bool(d) and margins['ranking_objective_only']>0)
    codes=dict(adequacy='SECONDARY_DISCOVERY_PANELS_BELOW_10',pool_recall='POOL_RECALL_BELOW_9_10',pool_size='POOL_MEAN_FRACTION_ABOVE_3_4',
        pool_status='POOL_STATUS_NOT_FINITE_CONDITIONAL',ranking_random='RANKING_RANDOM_MARGIN_BELOW_1_10',
        ranking_processing='RANKING_NOT_ABOVE_PROCESSING',ranking_objective_only='RANKING_NOT_ABOVE_OBJECTIVE_ONLY')
    reasons={k:[] if passed else ['NO_FEASIBLE_CANDIDATE' if k in ('pool_recall','pool_size') and not f else
        'SECONDARY_DISCOVERY_PANELS_BELOW_10' if k.startswith('ranking_') and not d else codes[k]] for k,passed in checks.items()}
    pool_keys=('pool_recall','pool_size','pool_status');rank_keys=('ranking_random','ranking_processing','ranking_objective_only')
    unique=lambda seq:list(dict.fromkeys(seq))
    return dict(denominators=dict(assigned_panels_per_population=20,scheduled_policy_runs=960,feasible_secondary_panels=f,
        discovery_secondary_panels=d,discovery_secondary_panels_larger_than_four=sum(p['candidate_count']>4 for p in discovery),
        ranking_random_controls=20,pool_recall_numerator=recalled,ranking_primary_hits=a,ranking_processing_hits=p,
        ranking_objective_only_hits=o,ranking_random_hit_sum=r),margins=margins,gate_checks=checks,gate_reasons=reasons,
        failed_gates=unique(code for values in reasons.values() for code in values),
        component_verdicts=dict(adequacy=checks['adequacy'],pool_usefulness=all(checks[k] for k in pool_keys) if f else None,
            ranking_usefulness=all(checks[k] for k in rank_keys) if d else None,complete_execution=True),
        component_reasons=dict(adequacy=reasons['adequacy'],pool_usefulness=unique(code for k in pool_keys for code in reasons[k]),
            ranking_usefulness=unique(code for k in rank_keys for code in reasons[k]),complete_execution=[]),
        overall_verdict='GO_DESIGN_INDEPENDENT_STUDY' if all(checks.values()) else 'NO_GO_ARCHIVAL_USEFULNESS')


def calibration_arithmetic(plan, vault, threshold, all_defined):
    cal=plan['calibration'];population_name=plan['population'];cases=cal['panels']
    need(len(cases)==len(cal['scores'])==20)
    scores=[]
    for case, assessment in zip(cases,cal['scores']):
        panel=case['panel'];pid=panel['panel_id'].rsplit('/',1)[-1];truth=vault[pid]
        members=set(truth) if population_name=='primary' else {name for name,(y,e) in truth.items() if y is not None and e is not None}
        equal(panel['candidate_ids'],sorted(members));need(set(panel['ranked_ids'])==members and len(panel['ranked_ids'])==len(members))
        expected=[dict(candidate_id=name,score=None if truth[name][0] is None else -truth[name][0],
            constraints={'elongation':None if truth[name][1] is None else threshold-truth[name][1]}) for name in sorted(members)]
        equal(case['outcomes']['rows'],expected)
        unknown=any(truth[name][0] is None or truth[name][1] is None for name in members)
        feasible=[name for name in sorted(members) if not unknown and truth[name][1]>=threshold]
        best=max((truth[name][0] for name in feasible),default=None)
        minima=[name for name in feasible if truth[name][0]==best]
        score=None if unknown else F(max((panel['ranked_ids'].index(name)+1 for name in minima),default=0),len(members)) if members else F()
        reason='missing_truth' if unknown else 'empty_universe' if not members else 'no_feasible_candidate' if not feasible else 'feasible_minimizers'
        for key,value in dict(score=score,status='incomplete' if unknown else 'complete',reason=reason,m=len(members),
                feasible=None if unknown else feasible,minimizers=None if unknown else minima).items():equal(assessment[key],value)
        scores.append(score)
    premise=cal['protocol']['premise_status'];need(premise in ('assumed_unverified','unsupported'))
    if population_name=='primary' and not all_defined:equal(premise,'unsupported')
    status='unsupported_premise' if premise=='unsupported' else 'incomplete_calibration' if None in scores else 'finite_conditional'
    tau=sorted(scores)[18] if status=='finite_conditional' else None
    for key,value in dict(n=20,k=19,alpha=F(1,10),complete_count=sum(x is not None for x in scores),status=status,threshold=tau,premise_status=premise).items():equal(cal[key],value)
    histogram=Counter(score for score in scores if score is not None)
    decision_counts=dict(empty_universe=0,empty_pool_nonempty_universe=0,proper_nonempty_reduction=0,full_nonempty_pool=0)
    for panel,decision in zip(plan['ranked_future'],plan['decisions']):
        m=len(panel['candidate_ids']);k=len(decision['retained'])
        label='empty_universe' if not m else 'empty_pool_nonempty_universe' if not k else 'full_nonempty_pool' if k==m else 'proper_nonempty_reduction'
        decision_counts[label]+=1
    return dict(status=status,threshold=tau,n=20,k=19,complete_count=sum(x is not None for x in scores),
        alpha=F(1,10),premise_status=premise,unknown_score_count=sum(x is None for x in scores),
        score_histogram=[dict(score=score,count=histogram[score]) for score in sorted(histogram)],
        empty_calibration_panels=sum(x['reason']=='empty_universe' for x in cal['scores']),
        complete_infeasible_calibration_panels=sum(x['reason']=='no_feasible_candidate' for x in cal['scores']),
        future_assigned_panels=20,decision_counts=decision_counts)


def groups(rows):
    parsed=target_rows(rows);result={}
    for row in rows:
        key='source-'+str(row['source_group'])
        result.setdefault(key,{})[row['record_id']]=parsed[row['record_id']]
    return result


def development_adequacy(rows):
    parsed=target_rows(rows)
    complete=[row for row in rows if all(x is not None for x in parsed[row['record_id']])]
    reasons=[]
    if len(complete)<50:reasons.append('DEVELOPMENT_ROWS_BELOW_50')
    if len({row['source_group'] for row in complete})<15:reasons.append('DEVELOPMENT_GROUPS_BELOW_15')
    return parsed,complete,reasons


def check_public_targets(public, role, rows):
    parsed=target_rows(rows);given=public['payload']['target_status_counts'][role]
    equal(given['row_count'],len(rows))
    equal(given['complete_row_count'],sum(all(q is not None for q in values) for values in parsed.values()))
    equal(given['complete_source_group_count'],len({row['source_group'] for row in rows if all(q is not None for q in parsed[row['record_id']])}))
    for field in ('yield_strength','elongation'):
        status=Counter(row[field]['status'] for row in rows);reason=Counter(row[field]['reason'] for row in rows)
        for key,value in given['target_status_counts'][field].items():equal(value,status.pop(key,0))
        for key,value in given['target_reason_counts'][field].items():equal(value,reason.pop(key,0))
        need(not status and not reason)
    roles=public['payload']['funnel']['roles'];equal(roles[role],dict(rows=len(rows),source_groups=len({r['source_group'] for r in rows})))


def recompute_completed(public, development, calibration_vault, evaluation_vault, cal_payload, replay_payload, evaluation_payload, reserved):
    parsed,complete,reasons=development_adequacy(development)
    need(not reasons)
    threshold=sorted(parsed[row['record_id']][1] for row in complete)[(len(complete)-1)//2]
    equal(public['payload']['derived_threshold']['value'],threshold)
    by_cal,by_eval=groups(calibration_vault),groups(evaluation_vault)
    need(len(by_cal)==len(by_eval)==20 and not set(by_cal)&set(by_eval))
    development_groups={'source-'+str(row['source_group']) for row in development}
    need(len(development_groups)==35 and not development_groups&(set(by_cal)|set(by_eval)))
    for role,rows in zip(ROLES,(development,calibration_vault,evaluation_vault)):
        need(all(row['role']==role for row in rows))
    need(all(1<=len(rows)<=25 for rows in (*by_cal.values(),*by_eval.values())))
    need(len({row['record_id'] for rows in (development,calibration_vault,evaluation_vault) for row in rows})==314)
    all_defined=all(y is not None and e is not None for group in (*by_cal.values(),*by_eval.values()) for y,e in group.values())
    equal(reserved['all_40_endpoints_defined'],all_defined);equal(public['payload']['all_40_primary_endpoints_defined'],all_defined)
    equal(reserved['complete_ids'],{pid:sorted(name for name,(y,e) in rows.items() if y is not None and e is not None) for pid,rows in (by_cal|by_eval).items()})
    plans=cal_payload['plans'];runs=replay_payload['runs'];given=evaluation_payload['population_audits']
    need(len(plans)==len(runs)==len(given)==2)
    equal(replay_payload['completed_policy_runs'],960);equal(replay_payload['all_policy_runs_complete'],True)
    results=[];cal_status={}
    for index,name in enumerate(('primary','secondary')):
        plan=plans[index];equal(plan['population'],name);equal(given[index]['population'],name)
        cal_status[name]=calibration_arithmetic(plan,by_cal,threshold,all_defined)
        result=population(plan,runs[index],by_eval,len(evaluation_vault),threshold)
        for key in ('panels','counts','macro_rates','policy_rates','costs'):equal(given[index][key],result[key])
        for key,value in result['public_population'].items():equal(public['payload']['population_metrics'][name][key],value)
        equal(public['payload']['policy_metrics'][name],result['public_policy'])
        for key,value in cal_status[name].items():equal(public['payload']['calibration_summary'][name][key],value)
        results.append(result)
    evaluation=gates(results[1],cal_status['secondary']['status']=='finite_conditional')
    evaluation['costs']=dict(development_unique_bundles=len(development),calibration_unique_bundles=len(calibration_vault),
        evaluation_unique_bundles=len(evaluation_vault),policy_bundle_requests=sum(x['costs']['policy_bundle_requests'] for x in results))
    for key,value in evaluation.items():
        equal(evaluation_payload['evaluation'][key],value)
        equal(public['payload'][{'denominators':'gate_denominators','margins':'gate_margins'}.get(key,key)],value)
    equal(public['payload']['run_accounting'],dict(scheduled_runs=960,completed_runs=960,populations=2,assigned_panels_per_population=20,policies_per_panel=24))
    for role,rows in zip(ROLES,(development,calibration_vault,evaluation_vault)):check_public_targets(public,role,rows)
    need(len(development)+len(calibration_vault)+len(evaluation_vault)==314)
    return dict(status='COMPLETE',calibration=cal_status,population_counts={name:result['counts'] for name,result in zip(('primary','secondary'),results)},
        **evaluation)


def duplicate_reject(pairs):
    out={}
    for key,value in pairs:
        need(key not in out,'DUPLICATE_JSON_KEY');out[key]=value
    return out


def capture(path, expected=None, cap=32*1024*1024, supervisor_metadata=False):
    """Anchored, bounded one-buffer read; no-follow at every path component."""
    path=Path(path);need(path.is_absolute() and '..' not in path.parts,'AUDIT_PATH_INVALID')
    descriptors=[]
    try:
        fd=os.open('/',os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW);descriptors.append(fd)
        for component in path.parts[1:-1]:
            fd=os.open(component,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=fd);descriptors.append(fd)
        leaf=os.open(path.name,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK,dir_fd=fd);descriptors.append(leaf)
        initial=os.fstat(leaf);need(stat.S_ISREG(initial.st_mode) and initial.st_size<=cap,'AUDIT_FILE_LIMIT')
        chunks=[];total=0
        while True:
            part=os.read(leaf,min(65536,cap+1-total))
            if not part:break
            chunks.append(part);total+=len(part);need(total<=cap,'AUDIT_FILE_LIMIT')
        need(os.fstat(leaf).st_size==initial.st_size,'AUDIT_FILE_CHANGED')
        raw=b''.join(chunks);sha=sha256(raw).hexdigest()
        if expected is not None:equal(sha,expected,'INPUT_DIGEST_MISMATCH')
        text=raw.decode('utf-8');depth=0;quoted=False;escaped=False
        for char in text:
            if quoted:
                if escaped:escaped=False
                elif char=='\\':escaped=True
                elif char=='"':quoted=False
            elif char=='"':quoted=True
            elif char in '[{':depth+=1;need(depth<=40,'JSON_DEPTH_LIMIT')
            elif char in ']}':depth-=1;need(depth>=0,'JSON_INVALID')
        need(depth==0 and not quoted,'JSON_INVALID')
        reject=lambda _: (_ for _ in ()).throw(AuditError('JSON_NONEXACT_NUMBER'))
        value=json.loads(text,object_pairs_hook=duplicate_reject,parse_float=str if supervisor_metadata else reject,parse_constant=reject)
        # Supervisor measurement tokens remain uninterpreted strings; arithmetic
        # documents reject JSON floating-point tokens entirely.
        return value,dict(bytes_sha256=sha,byte_count=len(raw))
    finally:
        for fd in reversed(descriptors):os.close(fd)


def public_digest(value):
    return sha256((json.dumps(wire(value),ensure_ascii=True,sort_keys=True,separators=(',',':'),allow_nan=False)+'\n').encode('ascii')).hexdigest()


def content_seal(value, public=False):
    equal(value['content_sha256'],(public_digest if public else digest)({key:item for key,item in value.items() if key!='content_sha256'}),'CONTENT_SEAL_MISMATCH')


def envelope(value, expected):
    content_seal(value)
    for key in ('content_sha256','scientific_sha256'):equal(value[key],expected[key],'INPUT_DIGEST_MISMATCH')
    equal(value['source'],SOURCE);equal(value['access']['execution_scope'],'registered_study')
    scientific={k:v for k,v in value.items() if k not in ('usage','scientific_sha256','content_sha256','registration','inputs')}
    scientific['registration']={k:value['registration'][k] for k in ('commit','protocol_sha256','contract_sha256','operational_amendment_sha256','implementation_manifest_sha256')}
    scientific['inputs']={k:v['scientific_sha256'] or v['bytes_sha256'] for k,v in value['inputs'].items()}
    equal(digest(scientific),value['scientific_sha256'],'SCIENTIFIC_SEAL_MISMATCH')


def terminal(entry):
    need(type(entry) is dict and set(entry)=={'launch_path','launch_sha256','attempt_directory'})
    launch_path=Path(entry['launch_path']);need(launch_path.name=='launch-result.json')
    launch,identity=capture(launch_path,entry['launch_sha256'],8*1024*1024);content_seal(launch)
    need(launch['schema']=='lupine.discovery.mpea.launch.v1' and launch['operational_status'] in ('COMPLETE','NO_GO_INSUFFICIENT_DEVELOPMENT'),'TERMINAL_REQUIRED')
    equal(launch['post_terminal_private_receipts_decoded'],True,'TERMINAL_REQUIRED')
    equal(launch['study_status'],launch['operational_status'],'TERMINAL_REQUIRED')
    # Verify the terminal supervisor bytes, leaving its resource-number tokens
    # uninterpreted rather than using them in scientific arithmetic.
    need(type(launch['supervisor_sha256']) is str and re.fullmatch('[0-9a-f]{64}',launch['supervisor_sha256']) is not None)
    supervisor,_=capture(launch_path.parent/'supervisor.json',launch['supervisor_sha256'],8*1024*1024,supervisor_metadata=True)
    equal(supervisor['status'],launch['operational_status'],'TERMINAL_REQUIRED')
    equal(supervisor['exit_code'],0,'TERMINAL_REQUIRED')
    expected_stages=STAGES if supervisor['status']=='COMPLETE' else STAGES[:3]
    equal([item['stage'] for item in supervisor['sealed_stages']],list(expected_stages),'TERMINAL_REQUIRED')
    root=Path(entry['attempt_directory']);need(root.is_absolute() and '..' not in root.parts)
    return launch,identity,root


def audit_attempt(authorized, kind):
    launch,launch_identity,root=authorized;inventory={}
    def read(name,identity):
        need(name in ALLOWED,'FILE_NOT_ALLOWED')
        value,raw_id=capture(root/name,identity['bytes_sha256'])
        if name!='attempt-result.json':envelope(value,identity)
        else:content_seal(value);equal(value['content_sha256'],identity['content_sha256'])
        inventory[name]=dict(raw_id,content_sha256=value['content_sha256'],scientific_sha256=value.get('scientific_sha256'))
        return value
    result=read('attempt-result.json',launch['attempt_result_identity'])
    equal(result['status'],launch['study_status']);equal(result['execution_kind'],kind)
    public,raw_id=capture(root/'public-report.json',result['public_identity']['bytes_sha256'],8*1024*1024);content_seal(public,public=True)
    for key in ('content_sha256','scientific_sha256'):equal(public[key],result['public_identity'][key])
    equal(public['status'],result['status']);equal(public['source'],dict(byte_count=SOURCE['bytes'],md5=SOURCE['md5'],sha256=SOURCE['sha256']))
    equal(public['execution_kind'],'registered_original' if kind=='PRODUCTION_ARCHIVE' else 'registered_reproduction')
    equal(public['registration']['commit'],launch['registration']['commit'])
    counts=public['payload']['funnel']['counts']
    equal((counts['source_rows'],counts['condition_rows'],counts['condition_source_groups']),(1545,314,75))
    equal(counts['condition_rows']+counts['out_of_scope_rows']+counts['unresolved_source_rows'],1545)
    equal([public['payload']['funnel']['roles'][role]['source_groups'] for role in ROLES],[35,20,20])
    equal(sum(public['payload']['funnel']['roles'][role]['rows'] for role in ROLES),314)
    public_science={key:public[key] for key in ('schema','protocol_id','stage','status','reasons','source','payload','access')}
    public_science['execution_scope']='registered_study'
    public_science['registration']={key:public['registration'][key] for key in ('commit','protocol_sha256','contract_sha256','implementation_manifest_sha256')}
    public_science['inputs']={key:None if value is None else value['scientific_sha256'] or value['bytes_sha256'] for key,value in public['inputs'].items()}
    equal(public_digest(public_science),public['scientific_sha256'])
    inventory['public-report.json']=dict(raw_id,content_sha256=public['content_sha256'],scientific_sha256=public['scientific_sha256'])
    reached=STAGES if result['status']=='COMPLETE' else STAGES[:3]
    equal(sorted(result['scientific_stages']),sorted(reached))
    for stage in STAGES:
        need((public['inputs'][stage] is not None)==(stage in reached))
        if stage in reached:equal(public['inputs'][stage]['scientific_sha256'],result['scientific_stages'][stage])
    def stage(name):
        value=read('stage-%02d-%s.json'%(STAGES.index(name),name.replace('_','-')),public['inputs'][name])
        equal(value['stage'],name);return value
    development=stage('development');dev_rows=development['payload']['rows']
    companion=read('development-targets.json',development['inputs']['development_targets'])
    equal(companion['payload']['rows'],dev_rows)
    parsed,complete,reasons=development_adequacy(dev_rows)
    check_public_targets(public,'DEVELOPMENT',dev_rows)
    if result['status']=='NO_GO_INSUFFICIENT_DEVELOPMENT':
        need(bool(reasons));equal(sorted(result['reasons']),sorted(reasons));equal(sorted(public['reasons']),sorted(reasons))
        equal(development['status'],'NO_GO_INSUFFICIENT_DEVELOPMENT')
        for key in ('calibration_summary','population_metrics','policy_metrics','gate_denominators','gate_margins','gate_checks','gate_reasons','failed_gates','component_verdicts','component_reasons','overall_verdict'):
            equal(public['payload'][key],None)
        equal(public['payload']['completed_policy_runs'],0);equal(result['completed_policy_runs'],0)
        equal(public['payload']['last_sealed_stage'],'development')
        for role in ('CALIBRATION','EVALUATION'):equal(public['payload']['target_status_counts'][role],None)
        for field in ('model_visible_bundles','calibrator_visible_bundles','policy_bundle_requests','auditor_unique_bundles'):equal(public['access']['counts'][field],0)
        arithmetic=dict(status=result['status'],development_rows=len(dev_rows),complete_rows=len(complete),
            complete_source_groups=len({row['source_group'] for row in complete}),reasons=reasons,overall_verdict=None)
    else:
        need(not reasons)
        reserved=stage('reserved');cal=stage('calibration');replay=stage('replay');evaluation=stage('evaluation')
        cal_vault=read('calibration-vault.json',reserved['inputs']['calibration_vault'])
        eval_vault=read('evaluation-vault.json',reserved['inputs']['evaluation_vault'])
        arithmetic=recompute_completed(public,dev_rows,cal_vault['payload']['rows'],eval_vault['payload']['rows'],cal['payload'],replay['payload'],evaluation['payload'],reserved['payload'])
        equal(result['completed_policy_runs'],960)
    equal(launch['scientific_verdict'],arithmetic['overall_verdict'])
    return dict(arithmetic=wire(arithmetic),arithmetic_sha256=digest(arithmetic),inventory=inventory,
        stage_scientific_references=result['scientific_stages'],public_scientific_sha256=public['scientific_sha256'],launch_identity=launch_identity)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--terminal-manifest',required=True);parser.add_argument('--output',required=True)
    args=parser.parse_args()
    manifest,manifest_identity=capture(Path(args.terminal_manifest).absolute(),cap=65536)
    need(set(manifest)=={'schema','original','reproduction'} and manifest['schema']=='lupine.review.mpea_terminal_audit_authorization.v1')
    # BOTH terminal gates finish before either attempt's private data is opened.
    original=terminal(manifest['original']);reproduction=terminal(manifest['reproduction'])
    need(original[2]!=reproduction[2])
    results=[audit_attempt(original,'PRODUCTION_ARCHIVE'),audit_attempt(reproduction,'REPRODUCTION_FIXED_ALLOCATION')]
    equal(results[0]['arithmetic'],results[1]['arithmetic'],'REPRODUCTION_ARITHMETIC_MISMATCH')
    equal(results[0]['stage_scientific_references'],results[1]['stage_scientific_references'],'REPRODUCTION_SCIENTIFIC_MISMATCH')
    equal(results[0]['public_scientific_sha256'],results[1]['public_scientific_sha256'],'REPRODUCTION_SCIENTIFIC_MISMATCH')
    need(set(results[0]['inventory'])==set(results[1]['inventory']))
    comparisons={name:dict(bytes_identical=results[0]['inventory'][name]['bytes_sha256']==results[1]['inventory'][name]['bytes_sha256'],
        scientific_identical=None if results[0]['inventory'][name]['scientific_sha256'] is None else
        results[0]['inventory'][name]['scientific_sha256']==results[1]['inventory'][name]['scientific_sha256']) for name in results[0]['inventory']}
    report=dict(schema='lupine.review.mpea_terminal_arithmetic.v1',status='PASS',manifest_identity=manifest_identity,
        scope='Independent exact arithmetic from already-terminal sealed outcomes/ledgers; no source, feature-file, model-fit, allocation or probabilistic attestation.',
        attempts=results,artifact_comparison=comparisons,full_bytes_equality_required=False,
        limitations=['Rank/predictor/feature mathematics not refitted.','Source parsing and operational custody remain separately authenticated prerequisites.',
            'Stage identities not read as files are explicitly labeled references.','Private ledgers and target values are not reproduced in this report.'])
    output=Path(args.output);need(output.is_absolute() and not output.exists(),'OUTPUT_EXISTS')
    with output.open('xb') as stream:stream.write(canonical(report))
    print(json.dumps({'status':'PASS','receipt_sha256':digest(report)}))


if __name__=='__main__':
    try:main()
    except Exception as error:
        print(json.dumps({'status':'FAILED','reason':str(error) if type(error) is AuditError else 'AUDIT_INTERNAL_ERROR'}))
        raise SystemExit(2)
