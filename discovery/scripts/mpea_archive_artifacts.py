"""Pure required-field projections of upstream validated compact study records.

No source reader/model/calibrator. Validators require the original companion inputs.
"""
import json,re
from fractions import Fraction
from collections import Counter
import mpea_archive_profiles as profiles
class ArtifactError(ValueError):
    def __init__(self):self.code='SCHEMA_INVALID';super().__init__(self.code)
def fail():raise ArtifactError() from None
def canonical(value):
    nodes=0
    def check(v,d):
        nonlocal nodes
        nodes+=1
        if d>32 or nodes>1_000_000:fail()
        if v is None or type(v) is bool:return
        if type(v) is int:
            if abs(v).bit_length()>8192:fail()
            return
        if type(v) is str:
            if len(v)>5000 or any(0xD800<=ord(c)<=0xDFFF for c in v):fail()
            return
        if type(v) is list:
            for x in v:check(x,d+1)
            return
        if type(v) is dict:
            for k,x in v.items():
                text(k);check(x,d+1)
            return
        fail()
    check(value,0)
    raw=json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False).encode()
    if len(raw)>32*1048576:fail()
    return raw
def copy(v):return json.loads(canonical(v))
def keys(v,expected):
    if type(v) is not dict or any(type(k) is not str for k in v) or set(v)!=set(expected):fail()
def count(v,limit=4096):
    if type(v) is not int or not 0<=v<=limit:fail()
def text(v):
    if type(v) is not str or not 0<len(v)<=2048:fail()
def sha(v):
    if type(v) is not str or re.fullmatch('[0-9a-f]{64}',v) is None:fail()
def strings(v,limit=4096):
    if type(v) is not list or len(v)>limit:fail()
    for x in v:text(x)
def rational(v,bits=8192,nullable=False,nonnegative=False):
    if v is None and nullable:return
    if type(v) is not str or len(v)>5000 or re.fullmatch('-?(?:0|[1-9][0-9]*)/[1-9][0-9]*',v) is None:fail()
    a,b=v.split('/')
    if len(a)>2500 or len(b)>2500:fail()
    q=Fraction(int(a),int(b))
    if f'{q.numerator}/{q.denominator}'!=v or max(abs(q.numerator).bit_length(),q.denominator.bit_length())>bits or (nonnegative and q<0):fail()
POLICIES=('primary','processing','objective_only')+tuple('random_'+str(i) for i in range(20))
STATUS_REASONS={'VALID':{'FINITE_NONNEGATIVE_RECORDED_POINT'},'MISSING':{'EMPTY_TOKEN'},'UNSUPPORTED_LEXICAL':{'NON_ASCII_TOKEN','NOT_POINT_DECIMAL'},'UNSUPPORTED_NONFINITE':{'NONFINITE_TOKEN'},'UNRESOLVED_LIMIT':{'TOKEN_BYTES_LIMIT','DECIMAL_DIGIT_LIMIT','EXPONENT_LIMIT','TARGET_BITS_LIMIT'},'SEMANTIC_CONFLICT':{'NEGATIVE_YS','NEGATIVE_ELONGATION'}}
def target(v,name):
    keys(v,('status','reason','value'))
    if type(v['status']) is not str or v['status'] not in STATUS_REASONS or type(v['reason']) is not str or v['reason'] not in STATUS_REASONS[v['status']]:fail()
    if v['status']=='SEMANTIC_CONFLICT' and v['reason']!=('NEGATIVE_YS' if name=='yield_strength' else 'NEGATIVE_ELONGATION'):fail()
    if v['status']=='VALID':rational(v['value'],512,nonnegative=True)
    elif v['value'] is not None:fail()
def rows(v):
    if type(v) is not list or len(v)>314:fail()
    ids=set();ordinals=set()
    for row in v:
        keys(row,('ordinal','record_id','source_group','role','yield_strength','elongation'))
        count(row['ordinal'],1544);text(row['record_id']);count(row['source_group'],4095)
        if row['role'] not in ('DEVELOPMENT','CALIBRATION','EVALUATION') or type(row['role']) is not str:fail()
        if row['record_id'] in ids or row['ordinal'] in ordinals:fail()
        ids.add(row['record_id']);ordinals.add(row['ordinal'])
        for name in ('yield_strength','elongation'):target(row[name],name)
    if [r['ordinal'] for r in v]!=sorted(ordinals):fail()
def aggregate(v):
    keys(v,('row_count','complete_row_count','complete_group_count','status_counts','reason_counts'))
    for k in ('row_count','complete_row_count','complete_group_count'):count(v[k],314)
    if not v['complete_group_count']<=v['complete_row_count']<=v['row_count']:fail()
    for key in ('status_counts','reason_counts'):
        keys(v[key],('yield_strength','elongation'))
        allowed=set(STATUS_REASONS) if key=='status_counts' else set.union(*STATUS_REASONS.values())
        for name,d in v[key].items():
            if type(d) is not dict or not set(d)<=allowed:fail()
            for n in d.values():count(n,314)
            if sum(d.values())!=v['row_count']:fail()
def from_rows(v):
    complete=[r for r in v if all(r[n]['status']=='VALID' for n in ('yield_strength','elongation'))]
    return {'row_count':len(v),'complete_row_count':len(complete),'complete_group_count':len({r['source_group'] for r in complete}),
      'status_counts':{n:dict(sorted(Counter(r[n]['status'] for r in v).items())) for n in ('yield_strength','elongation')},
      'reason_counts':{n:dict(sorted(Counter(r[n]['reason'] for r in v).items())) for n in ('yield_strength','elongation')}}
def label_provenance(label_rows,source_framing):
    canonical(label_rows);rows(label_rows)
    profiles.validate_framing(source_framing,source_framing)
    if source_framing['columns']<=13:fail()
    observed=Counter(row['role'] for row in label_rows)
    if any(role not in source_framing['authorized_roles'] or n>source_framing['returned_role_counts'][role] for role,n in observed.items()):fail()
    profile=profiles.target_profile();parser={'path':profile['parser_path'],'sha256':profile['parser_sha256']}
    output=[]
    for row in label_rows:
        properties={}
        for name,column,unit in (('yield_strength',11,'MPa'),('elongation',13,'total_elongation_percentage_points')):
            properties[name]={'source_column':column,'source_blob':copy(source_framing['source']),
                'parser':dict(parser),'unit':unit,**copy(row[name]),
                'uncertainty':'NOT_INTERPRETED','pairing':'CO_RECORDED_NOT_SPECIMEN_VERIFIED'}
        output.append({k:copy(row[k]) for k in ('ordinal','record_id','source_group','role')}|{'properties':properties})
    return output
def development_targets(compact,source_framing):
    canonical(compact);keys(compact,('rows','aggregate','status','reasons'));rows(compact['rows']);aggregate(compact['aggregate'])
    if any(r['role']!='DEVELOPMENT' for r in compact['rows']) or canonical(compact['aggregate'])!=canonical(from_rows(compact['rows'])):fail()
    profiles.validate_framing(source_framing,source_framing)
    if source_framing['authorized_roles']!=['DEVELOPMENT'] or source_framing['returned_role_counts']!={'DEVELOPMENT':len(compact['rows'])}:fail()
    a=compact['aggregate'];reasons=[s for condition,s in ((a['complete_row_count']<50,'DEVELOPMENT_ROWS_BELOW_50'),(a['complete_group_count']<15,'DEVELOPMENT_GROUPS_BELOW_15')) if condition]
    status='NO_GO_INSUFFICIENT_DEVELOPMENT' if reasons else 'COMPLETE'
    if canonical(compact['reasons'])!=canonical(reasons) or compact['status']!=status:fail()
    return {**copy(compact),'target_profile':profiles.target_profile(),'status_counts':copy(a['status_counts']),
      'complete_row_count':a['complete_row_count'],'complete_group_count':a['complete_group_count'],
      'row_provenance':label_provenance(compact['rows'],source_framing),
      'adequacy':{'minimum_rows':50,'minimum_groups':15,'complete_rows':a['complete_row_count'],'complete_groups':a['complete_group_count'],'status':status,'reasons':reasons},'source_framing':copy(source_framing)}
def feature(v):
    keys(v,('record_id','ordinal','source_group','composition','processing'));text(v['record_id']);text(v['source_group']);count(v['ordinal'],1544)
    if v['processing'] not in profiles.PROCESSING:fail()
    if v['composition'] is not None:
        keys(v['composition'],('axes','values'))
        if canonical(v['composition']['axes'])!=canonical(list(profiles.AXES)):fail()
        values=v['composition']['values']
        if type(values) is not list or len(values)!=118:fail()
        for x in values:rational(x,1024,nonnegative=True)
        if sum(map(Fraction,values))!=1:fail()
def ranks(v):
    if type(v) is not list or len(v)!=75:fail()
    panels=set();groups=set();ids=set();ordinals=set()
    for rank in v:
        keys(rank,('panel','fit_digest','rank_digest','orders','predictions'));sha(rank['fit_digest']);sha(rank['rank_digest'])
        panel=rank['panel'];keys(panel,('panel_id','source_group','rows'));text(panel['panel_id']);text(panel['source_group'])
        if panel['panel_id'] in panels or panel['source_group'] in groups:fail()
        panels.add(panel['panel_id']);groups.add(panel['source_group'])
        if type(panel['rows']) is not list or not 1<=len(panel['rows'])<=25:fail()
        members=[]
        for row in panel['rows']:
            feature(row)
            if row['source_group']!=panel['source_group'] or row['record_id'] in ids or row['ordinal'] in ordinals:fail()
            ids.add(row['record_id']);ordinals.add(row['ordinal']);members.append(row['record_id'])
        keys(rank['orders'],POLICIES)
        for order in rank['orders'].values():
            strings(order,25)
            if len(order)!=len(members) or set(order)!=set(members):fail()
        if type(rank['predictions']) is not list or len(rank['predictions'])!=len(members):fail()
        for prediction,row in zip(rank['predictions'],panel['rows']):
            keys(prediction,('query','yield_strength','elongation','route','neighbors','processing_yield_strength','processing_elongation','processing_route'))
            if canonical(prediction['query'])!=canonical(row):fail()
            for n in ('yield_strength','elongation','processing_yield_strength','processing_elongation'):rational(prediction[n],nonnegative=True)
            if prediction['route'] not in profiles.predictor_profile()['fallback_routes'] or prediction['processing_route'] not in profiles.predictor_profile()['processing_routes']:fail()
            neighbors=prediction['neighbors']
            if type(neighbors) is not list or len(neighbors)>5:fail()
            for pair in neighbors:
                if type(pair) is not list or len(pair)!=2:fail()
                text(pair[0]);rational(pair[1],nonnegative=True)
            if len({pair[0] for pair in neighbors})!=len(neighbors):fail()
            expected={'FIVE_GROUP_NEIGHBORS':5,'UNKNOWN_COMPOSITION_PROCESSING':0,'NO_KNOWN_DEVELOPMENT_COMPOSITION_PROCESSING':0}
            if prediction['route'] in expected and len(neighbors)!=expected[prediction['route']]:fail()
            if prediction['route']=='FEWER_GROUP_NEIGHBORS' and not 1<=len(neighbors)<5:fail()
    if len(ids)>314:fail()
def rank_freeze(compact,development_payload):
    canonical(compact);keys(compact,('fit_digest','threshold','processing_medians','global_medians','ranks'));sha(compact['fit_digest']);rational(compact['threshold'],nonnegative=True)
    devcompact={k:development_payload[k] for k in ('rows','aggregate','status','reasons')}
    if canonical(development_payload)!=canonical(development_targets(devcompact,development_payload['source_framing'])) or development_payload['status']!='COMPLETE':fail()
    if type(compact['processing_medians']) is not dict or not set(compact['processing_medians'])<=set(profiles.PROCESSING):fail()
    for pair in [compact['global_medians'],*compact['processing_medians'].values()]:
        if type(pair) is not list or len(pair)!=2:fail()
        for x in pair:rational(x,nonnegative=True)
    if type(compact['processing_medians']) is not dict or not set(compact['processing_medians'])<=set(profiles.PROCESSING):fail()
    if compact['threshold']!=compact['global_medians'][1]:fail()
    ranks(compact['ranks'])
    if any(r['fit_digest']!=compact['fit_digest'] for r in compact['ranks']):fail()
    original=[r['record_id'] for r in development_payload['rows']];complete=[r['record_id'] for r in development_payload['rows'] if all(r[n]['status']=='VALID' for n in ('yield_strength','elongation'))]
    projections=[];records=[];orders={};counts=Counter()
    for rank in compact['ranks']:
        orders[rank['panel']['panel_id']]=copy(rank['orders'])
        for p in rank['predictions']:
            projections.append({'record_id':p['query']['record_id'],'yield_strength':p['yield_strength'],'elongation':p['elongation'],'processing_yield_strength':p['processing_yield_strength'],'processing_elongation':p['processing_elongation']})
            records.append({'record_id':p['query']['record_id'],'route':p['route'],'neighbors':copy(p['neighbors']),'processing_route':p['processing_route']});counts[p['route']]+=1
            if any(pair[0] not in complete for pair in p['neighbors']):fail()
    allrows={row['record_id']:row for r in compact['ranks'] for row in r['panel']['rows']}
    if any(record not in allrows or allrows[record]['ordinal']!=row['ordinal'] or allrows[record]['source_group']!=str(row['source_group']) for record,row in zip(original,development_payload['rows'])):fail()
    return {**copy(compact),'development_membership':{'original_ids':original,'complete_ids':complete},'predictions':projections,
      'neighbor_or_fallback_records':records,'full_orders':orders,'fallback_counts':dict(sorted(counts.items())),'predictor_profile':profiles.predictor_profile()}
def _complete_map(value):
    if type(value) is not dict or len(value)!=40:fail()
    used=set()
    for panel,ids in value.items():
        text(panel);strings(ids,25)
        if len(ids)!=len(set(ids)) or ids!=sorted(ids) or used&set(ids):fail()
        used.update(ids)
def secondary_membership(rank_records,complete_ids,rank_sha):
    canonical(rank_records);canonical(complete_ids)
    ranks(rank_records);_complete_map(complete_ids);sha(rank_sha)
    by_panel={r['panel']['panel_id']:r for r in rank_records}
    if not set(complete_ids)<=set(by_panel):fail()
    members={};orders={}
    for panel,ids in sorted(complete_ids.items()):
        rank=by_panel[panel];allids={r['record_id'] for r in rank['panel']['rows']}
        if not set(ids)<=allids:fail()
        group=rank['panel']['source_group'];members[group]=copy(ids)
        orders[group]={policy:[x for x in rank['orders'][policy] if x in ids] for policy in POLICIES}
    return {'members_by_source_group':members,'restricted_orders':orders,'membership_rule':'both_targets_VALID_literal_frozen_order_restriction_including_empty_panels','rank_freeze_scientific_sha256':rank_sha}
def completeness(complete_ids,reserved_aggregates,secondary_sha,calibration_vault_sha,evaluation_vault_sha,reserved_rowcount):
    canonical(complete_ids);canonical(reserved_aggregates)
    _complete_map(complete_ids);keys(reserved_aggregates,('CALIBRATION','EVALUATION'));count(reserved_rowcount,314)
    for a in reserved_aggregates.values():aggregate(a)
    if sum(a['row_count'] for a in reserved_aggregates.values())!=reserved_rowcount or sum(a['complete_row_count'] for a in reserved_aggregates.values())!=sum(map(len,complete_ids.values())):fail()
    for s in (secondary_sha,calibration_vault_sha,evaluation_vault_sha):sha(s)
    complete=sum(map(len,complete_ids.values()))
    status={name:dict(sorted(sum((Counter(a['status_counts'][name]) for a in reserved_aggregates.values()),Counter()).items())) for name in ('yield_strength','elongation')}
    return {'reserved_primary_panel_count':40,'reserved_primary_row_count':reserved_rowcount,'all_40_endpoints_defined':complete==reserved_rowcount,
      'target_status_counts':status,'population_counts':{'primary_panels':40,'primary_rows':reserved_rowcount,'secondary_panels':40,'secondary_rows':complete},
      'secondary_membership_artifact':secondary_sha,'calibration_vault_identity':calibration_vault_sha,'evaluation_vault_identity':evaluation_vault_sha,
      'scope':'fixed_all_40_reserved_panels_role_blind_completeness_no_target_values_or_row_ids'}
def _ranked_panel(v):
    keys(v,('panel_id','universe_id','protocol_digest','feature_manifest_digest','candidate_ids','ranked_ids','panel_digest'))
    text(v['panel_id']);text(v['universe_id'])
    for k in ('protocol_digest','feature_manifest_digest','panel_digest'):sha(v[k])
    strings(v['candidate_ids'],25);strings(v['ranked_ids'],25)
    if v['candidate_ids']!=sorted(v['candidate_ids']) or len(set(v['candidate_ids']))!=len(v['candidate_ids']) or len(v['ranked_ids'])!=len(v['candidate_ids']) or set(v['ranked_ids'])!=set(v['candidate_ids']):fail()
def _protocol(v):
    names=('protocol_id','scenario_id','ranker_id','ranking_rule_id','tie_rule_id','generator_id','freeze_reference','sampling_scope')
    keys(v,(*names,'objective_scope','constraint_scopes','premise_status','protocol_digest'))
    for k in names:text(v[k])
    sha(v['protocol_digest'])
    if type(v['premise_status']) is not str or v['premise_status'] not in ('assumed_unverified','unsupported'):fail()
    keys(v['constraint_scopes'],('elongation',))
    for s in (v['objective_scope'],v['constraint_scopes']['elongation']):
        keys(s,('scenario_id','quantity','unit','reference'))
        for x in s.values():text(x)
def _outcomes(v):
    keys(v,('panel_digest','source_reference','rows','outcomes_digest'));sha(v['panel_digest']);sha(v['outcomes_digest']);text(v['source_reference'])
    if type(v['rows']) is not list or len(v['rows'])>25:fail()
    ids=[]
    for row in v['rows']:
        keys(row,('candidate_id','score','constraints'));text(row['candidate_id']);ids.append(row['candidate_id']);rational(row['score'],nullable=True)
        keys(row['constraints'],('elongation',));rational(row['constraints']['elongation'],nullable=True)
    if len(set(ids))!=len(ids):fail()
def _calibration(v,protocol):
    keys(v,('protocol','panels','alpha','scores','n','complete_count','k','threshold','premise_status','status','reasons','guarantee_status','conditional_guarantee','assumptions','physical_attestation','calibration_digest'))
    _protocol(v['protocol'])
    if canonical(v['protocol'])!=canonical(protocol) or v['alpha']!='1/10':fail()
    sha(v['calibration_digest'])
    for k in ('n','complete_count','k'):count(v[k],21)
    if v['n']!=20 or v['complete_count']>20 or v['k']!=19:fail()
    rational(v['threshold'],nullable=True,nonnegative=True)
    for k in ('premise_status','status','guarantee_status','physical_attestation'):text(v[k])
    if v['conditional_guarantee'] is not None:text(v['conditional_guarantee'])
    strings(v['reasons']);strings(v['assumptions'])
    if type(v['panels']) is not list or len(v['panels'])!=20 or type(v['scores']) is not list or len(v['scores'])!=20:fail()
    for case in v['panels']:
        keys(case,('panel','outcomes'));_ranked_panel(case['panel']);_outcomes(case['outcomes'])
        if case['panel']['panel_digest']!=case['outcomes']['panel_digest'] or [r['candidate_id'] for r in case['outcomes']['rows']]!=case['panel']['candidate_ids']:fail()
    for score,case in zip(v['scores'],v['panels']):
        keys(score,('protocol','panel','outcomes','status','reason','m','score','feasible','minimizers','missing','assessment_digest'))
        _protocol(score['protocol']);_ranked_panel(score['panel']);_outcomes(score['outcomes'])
        if canonical(score['protocol'])!=canonical(protocol) or canonical(score['panel'])!=canonical(case['panel']) or canonical(score['outcomes'])!=canonical(case['outcomes']):fail()
        text(score['status']);text(score['reason']);count(score['m'],25);rational(score['score'],nullable=True,nonnegative=True);sha(score['assessment_digest'])
        for k in ('feasible','minimizers'):
            if score[k] is not None:strings(score[k],25)
        if type(score['missing']) is not list or len(score['missing'])>50:fail()
        for pair in score['missing']:
            if type(pair) is not list or len(pair)!=2:fail()
            for s in pair:text(s)
def calibration(compact):
    canonical(compact);keys(compact,('plan_digests','all_future_decisions_sealed','plans'))
    if compact['all_future_decisions_sealed'] is not True or type(compact['plans']) is not list or len(compact['plans'])!=2:fail()
    if type(compact['plan_digests']) is not list or len(compact['plan_digests'])!=2:fail()
    for s in compact['plan_digests']:sha(s)
    for expected,p,digest in zip(('primary','secondary'),compact['plans'],compact['plan_digests']):
        keys(p,('population','plan_digest','fit_digest','protocol','calibration','ranked_future','decisions','schedules','reasons'))
        if type(p['population']) is not str or p['population']!=expected or p['plan_digest']!=digest:fail()
        sha(p['plan_digest']);sha(p['fit_digest']);_protocol(p['protocol']);_calibration(p['calibration'],p['protocol']);strings(p['reasons'])
        if type(p['ranked_future']) is not list or len(p['ranked_future'])!=20 or type(p['decisions']) is not list or len(p['decisions'])!=20:fail()
        for panel,decision in zip(p['ranked_future'],p['decisions']):
            _ranked_panel(panel);keys(decision,('decision_digest','panel_digest','calibration_digest','retained','calibration_status','reasons'))
            for k in ('decision_digest','panel_digest','calibration_digest'):sha(decision[k])
            if decision['panel_digest']!=panel['panel_digest'] or decision['calibration_digest']!=p['calibration']['calibration_digest']:fail()
            strings(decision['retained'],25);text(decision['calibration_status']);strings(decision['reasons'])
            if len(set(decision['retained']))!=len(decision['retained']) or not set(decision['retained'])<=set(panel['candidate_ids']):fail()
        if len({v['panel_digest'] for v in p['ranked_future']})!=20 or len({d['decision_digest'] for d in p['decisions']})!=20:fail()
        if type(p['schedules']) is not list or len(p['schedules'])!=20*24:fail()
        seen=set()
        decisions_by_digest={d['decision_digest']:d for d in p['decisions']}
        panels_by_decision={d['decision_digest']:panel for d,panel in zip(p['decisions'],p['ranked_future'])}
        for s in p['schedules']:
            keys(s,('panel_id','policy_id','decision_digest','order','reveal_ids','snapshots'))
            text(s['panel_id']);text(s['policy_id']);sha(s['decision_digest']);strings(s['order'],25);strings(s['reveal_ids'],25)
            if s['policy_id'] not in (*POLICIES,'stopped') or s['decision_digest'] not in decisions_by_digest or len(set(s['order']))!=len(s['order']) or s['reveal_ids']!=s['order'][:len(s['reveal_ids'])]:fail()
            panel=panels_by_decision[s['decision_digest']]
            if not panel['panel_id'].endswith('/'+s['panel_id']):fail()
            if s['policy_id']=='stopped':
                if canonical(s['order'])!=canonical(decisions_by_digest[s['decision_digest']]['retained']):fail()
            elif len(s['order'])!=len(panel['candidate_ids']) or set(s['order'])!=set(panel['candidate_ids']):fail()
            key=(s['panel_id'],s['policy_id'])
            if key in seen:fail()
            seen.add(key)
            if type(s['snapshots']) is not list or not 7<=len(s['snapshots'])<=8 or s['snapshots']!=sorted(set(s['snapshots'])) or not {0,1,2,4,8,16,32}<=set(s['snapshots']):fail()
            for n in s['snapshots']:count(n,32)
    by_population={p['population']:p for p in compact['plans']}
    return {**copy(compact),'protocols':{k:copy(p['protocol']) for k,p in by_population.items()},
      'calibrations':{k:copy(p['calibration']) for k,p in by_population.items()},
      'future_panels':{k:copy(p['ranked_future']) for k,p in by_population.items()},
      'decisions':{k:copy(p['decisions']) for k,p in by_population.items()},
      'policy_schedules':{k:copy(p['schedules']) for k,p in by_population.items()},
      'scope':'two_frozen_populations_all_20_future_decisions_sealed_before_evaluation_no_new_calibration'}
def _validate(value,constructor,*arguments):
    if canonical(value)!=canonical(constructor(*arguments)):fail()
def validate_development_targets(value,compact,source_framing):_validate(value,development_targets,compact,source_framing)
def validate_rank_freeze(value,compact,development_payload):_validate(value,rank_freeze,compact,development_payload)
def validate_calibration(value,compact):_validate(value,calibration,compact)
def validate_secondary_membership(value,rank_records,complete_ids,rank_sha):_validate(value,secondary_membership,rank_records,complete_ids,rank_sha)
def validate_completeness(value,complete_ids,reserved_aggregates,secondary_sha,calibration_vault_sha,evaluation_vault_sha,reserved_rowcount):_validate(value,completeness,complete_ids,reserved_aggregates,secondary_sha,calibration_vault_sha,evaluation_vault_sha,reserved_rowcount)

from functools import wraps
def _closed(function):
    @wraps(function)
    def call(*args,**kwargs):
        try:return function(*args,**kwargs)
        except ArtifactError:raise
        except (KeyError,TypeError,ValueError,AttributeError,OverflowError,RecursionError):raise ArtifactError() from None
    return call
for _name in ('label_provenance','development_targets','rank_freeze','calibration','secondary_membership','completeness','validate_development_targets','validate_rank_freeze','validate_calibration','validate_secondary_membership','validate_completeness'):
    globals()[_name]=_closed(globals()[_name])
