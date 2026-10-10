"""Independent counts over fixed PUBLIC metadata receipts; never reads raw CSV."""
from collections import Counter, defaultdict
from datetime import datetime
from fractions import Fraction
import hashlib
from itertools import combinations
import json
from pathlib import Path
import types

ROOT = next(p for p in Path(__file__).resolve().parents if p.name == 'discovery' and (p/'AGENTS.md').is_file())
PINS = {
    'scripts/mpea_formula_tokens.py': '8f2bbaa34dccc9c50341f86863526cd3ad6380e97ff3d0e2ca07c0fbbe4c3139',
    'scripts/mpea_row_metadata.py': 'd50ce1cf06761cd080ca0fcc6516c07ef71e0a4106bba73660642c846915e33b',
    'reports/mpea-formula-tokens-v1.json': 'ce2b8d12464bac1c5e9533e136f09b3b65761188609279b40a78f31dbcc6d3a7',
    'reports/mpea-row-metadata-v1.json': '36e9831f2a015b2c295ce6228dd9b7bce5ba7df0f2645c343da2134ab7898c55',
    'reports/mpea-formula-reproduction-v1.json': '3453b69b906230a627b128e8af8c7ff2722740295981950f972ec581096017ec',
}
COMMIT = 'a1e47024898072111f80e3ff911026306a50df2b'


def canonical(value):
    return (json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False)+'\n').encode('ascii')


def sha(raw): return hashlib.sha256(raw).hexdigest()


def require(condition, code):
    if not condition: raise ValueError(code)


def captured(path, cap=8*1048576):
    path=Path(path).absolute()
    require(not path.is_symlink() and path.resolve()==path and path.is_file(),'nonregular_or_symlink')
    with path.open('rb') as stream: raw=stream.read(cap+1)
    require(len(raw)<=cap,'byte_limit')
    return raw


def decode(raw):
    def pairs(items):
        value={}
        for key,item in items:
            require(key not in value,'duplicate_json_key');value[key]=item
        return value
    def reject(_): raise ValueError('noninteger_json_number')
    return json.loads(raw.decode('utf-8'),object_pairs_hook=pairs,parse_float=reject,parse_constant=reject)


def pinned_inputs():
    raw={name:captured(ROOT/name) for name in PINS}
    require(all(sha(raw[name])==expected for name,expected in PINS.items()),'input_identity_mismatch')
    modules={}
    for name in ('scripts/mpea_formula_tokens.py','scripts/mpea_row_metadata.py'):
        module=types.ModuleType('_audit_'+Path(name).stem);module.__file__=str(ROOT/name)
        exec(compile(raw[name],str(ROOT/name),'exec'),module.__dict__)
        modules[name]=module
    formula=decode(raw['reports/mpea-formula-tokens-v1.json'])
    metadata=decode(raw['reports/mpea-row-metadata-v1.json'])
    modules['scripts/mpea_formula_tokens.py'].validate_public_report(formula)
    modules['scripts/mpea_row_metadata.py'].validate_public_report(metadata)
    reproduction=decode(raw['reports/mpea-formula-reproduction-v1.json'])
    return formula,metadata,reproduction,raw


def join_rows(formula,metadata):
    require(formula['observed']==metadata['observed'],'source_identity_mismatch')
    require(formula['row_count']==metadata['row_count']==len(formula['rows'])==len(metadata['rows']),'row_count_mismatch')
    joined=[];seen=set()
    for ordinal,(new,old) in enumerate(zip(formula['rows'],metadata['rows'])):
        require(type(new['ordinal']) is int and type(old['ordinal']) is int and new['ordinal']==old['ordinal']==ordinal,'ordinal_mismatch')
        require(new['record_id']==old['record_id'] and new['record_id']==formula['observed']['sha256']+':'+str(ordinal),'record_id_mismatch')
        require(new['record_id'] not in seen,'duplicate_record_id');seen.add(new['record_id'])
        joined.append({**old,'formula':new['formula']})
    return joined


def group_value(record,role):
    item=record[role]
    return item['value'] if item['status']=='TOKEN_GROUP' else None


def histogram(values):
    counts=Counter(values)
    return [{'size':size,'groups':counts[size]} for size in sorted(counts)]


def summarize(rows):
    n=len(rows);formula=Counter();source=Counter();owners=defaultdict(set);formula_rows=defaultdict(list)
    for row in rows:
        f,s=group_value(row,'formula'),group_value(row,'source')
        if s is not None:source[s]+=1
        if f is not None:
            formula[f]+=1;formula_rows[f].append(row)
            if s is not None:owners[f].add(s)
    overlap={f for f in formula if len(owners[f])>=2}
    source_pairs=set();pair_incidence=0
    for f in overlap:
        pairs=set(combinations(sorted(owners[f]),2));source_pairs.update(pairs);pair_incidence+=len(pairs)
    result={
        'rows':n,'formula_recognized_rows':sum(formula.values()),'formula_unresolved_rows':n-sum(formula.values()),
        'formula_lexical_groups':len(formula),'formula_group_size_histogram':histogram(formula.values()),
        'source_assigned_rows':sum(source.values()),'source_unresolved_rows':n-sum(source.values()),
        'source_lexical_groups':len(source),'source_group_size_histogram':histogram(source.values()),
        'known_source_count_per_formula_group_histogram':histogram(len(owners[f]) for f in formula),
        'cross_source_lexical_overlap':{
            'definition':'A formula-token group appears with at least two distinct recognized source-token group IDs within this reported population.',
            'formula_groups':len(overlap),
            'rows_in_overlapping_formula_groups':sum(formula[f] for f in overlap),
            'recognized_source_rows_in_overlapping_formula_groups':sum(group_value(r,'source') is not None for f in overlap for r in formula_rows[f]),
            'unresolved_source_rows_in_overlapping_formula_groups':sum(group_value(r,'source') is None for f in overlap for r in formula_rows[f]),
            'recognized_source_groups_in_overlap':len(set().union(*(owners[f] for f in overlap))) if overlap else 0,
            'distinct_source_group_pairs_sharing_formula_group':len(source_pairs),
            'formula_group_by_source_pair_incidences':pair_incidence,
        },
    }
    require(result['formula_recognized_rows']+result['formula_unresolved_rows']==n,'formula_denominator')
    require(result['source_assigned_rows']+result['source_unresolved_rows']==n,'source_denominator')
    return result


def is_tensile(row): return row['test_mode']=={'status':'KNOWN','value':'T'}


def is_exact25(row):
    if row['temperature']['status']!='KNOWN':return False
    v=row['temperature']['value'];require(v['unit']=='degC','temperature_unit')
    return Fraction(int(v['numerator']),int(v['denominator']))==25


def reproduction_checks(reproduction,formula,metadata,raw,whole):
    r=reproduction
    require(r['schema']=='lupine.discovery.mpea.formula_reproduction.v1','reproduction_schema')
    require(r['source_commit']==r['remote_sha_verified_before_execution']==formula['implementation']['commit']==COMMIT,'execution_commit')
    require(r['receipt']=='reports/mpea-formula-tokens-v1.json' and r['receipt_sha256']==sha(raw[r['receipt']]) and r['receipt_bytes']==len(raw[r['receipt']]),'reproduction_receipt_binding')
    require(r['scope']==formula['scope'] and r['frozen_source_files']==formula['implementation']['files'],'reproduction_source_scope')
    require(r['byte_identical'] is True and r['all_prior_record_ids_unchanged'] is True,'reproduction_claim_shape')
    require(r['row_count']==whole['rows'] and r['recognized_rows']==whole['formula_recognized_rows'] and r['unresolved_rows']==whole['formula_unresolved_rows'] and r['exact_lexical_groups']==whole['formula_lexical_groups'],'reproduction_aggregate_conflict')
    require(r['original_g15b_recognized_rows']==sum(row['formula']['status']=='TOKEN_GROUP' for row in metadata['rows'])==0,'baseline_not_preserved')
    source_hashes={name:sha(captured(ROOT/name)) for name in r['frozen_source_files']}
    require(source_hashes==r['frozen_source_files'],'current_frozen_source_conflict')
    ci=r['ci'];require(ci['status']=='completed' and ci['conclusion']=='success' and ci['headSha']==COMMIT,'recorded_ci_claim')
    require(len(ci['jobs'])==4 and {j['name'] for j in ci['jobs']}=={'browser','lean','python (3.11)','python (3.12)'},'recorded_ci_jobs')
    require(all(j['status']=='completed' and j['conclusion']=='success' for j in ci['jobs']),'recorded_ci_failure')
    finished=max(datetime.fromisoformat(j['completedAt']) for j in ci['jobs'])
    require(len(r['commands'])==2,'recorded_process_count')
    for command in r['commands']:
        require(command['exit_code']==2 and command['stderr']=='','recorded_process_result')
        require(command['command'][1:3]==['scripts/mpea_formula_tokens.py','--output'],'recorded_command')
        require(datetime.fromisoformat(command['started_at'])>finished and datetime.fromisoformat(command['finished_at'])>=datetime.fromisoformat(command['started_at']),'recorded_execution_timing')
        require(decode(command['stdout'].encode())=={'status':formula['status'],'reason':formula['reason'],'receipt_sha256':sha(raw[r['receipt']])},'recorded_console_binding')
    return {'recorded_ci_precedes_both_commands':True,'both_recorded_console_hashes_match_public_receipt':True,
            'frozen_source_file_count':len(source_hashes),'frozen_source_sha256':source_hashes,
            'scope':'Public reproduction record is internally consistent; no independent CI query, process rerun, or access to original cache outputs was performed.'}


def run():
    formula,metadata,reproduction,raw=pinned_inputs()
    rows=join_rows(formula,metadata)
    require(len(rows)==1545,'unexpected_original_universe')
    require(all(r['formula']=={'status':'UNRESOLVED','value':None} for r in metadata['rows']),'baseline_formula_negative_changed')
    whole=summarize(rows);tensile=[r for r in rows if is_tensile(r)];cohort=[r for r in tensile if is_exact25(r)]
    checks=reproduction_checks(reproduction,formula,metadata,raw,whole)
    result={
        'schema':'lupine.discovery.mpea.public_formula_result_audit.v1','status':'PUBLIC_METADATA_AUDIT_PASS',
        'input_sha256':PINS,'input_content_sha256':{'formula':formula['content_sha256'],'original_metadata':metadata['content_sha256']},
        'checker_sha256':sha(captured(Path(__file__))),
        'identity_checks':{'all_original_rows_same_order_and_record_ids':True,'original_formula_negative_preserved':True,'original_row_count':1545},
        'populations':{'all_published_rows':whole,'declared_tensile_rows':summarize(tensile),'declared_tensile_exact25degC_rows':summarize(cohort)},
        'condition_funnel':{'all_published_rows':len(rows),'declared_tensile_rows':len(tensile),'declared_tensile_exact25degC_rows':len(cohort),
                            'tensile_temperature_unresolved_rows':sum(r['temperature']['status']!='KNOWN' for r in tensile),
                            'tensile_other_known_temperature_rows':sum(r['temperature']['status']=='KNOWN' and not is_exact25(r) for r in tensile)},
        'reproduction_record_checks':checks,
        'scope':{'public_receipts_only':True,'original_cache_read':False,'raw_formula_tokens_read':False,'target_values_or_presence_read':False,
                 'coefficient_vectors_constructed':False,'feature_eligibility_established':False,'composition_equivalence_established':False,
                 'independent_studies_established':False,'scientific_readiness_established':False,'fits':0,'splits':0},
        'interpretation':'Lexical recognition and exact public-row linkage only. Source/formula group overlaps neither identify independent studies nor establish chemical equivalence. The exact25/T subset is a declared metadata cohort, not eligible paired measurements.',
    }
    result['content_sha256']=sha(canonical(result))
    return result


if __name__=='__main__':
    result=run();destination=Path(__file__).parent/'public-audit-v1.json'
    with destination.open('xb') as stream:stream.write(canonical(result))
    print(json.dumps({'status':result['status'],'content_sha256':result['content_sha256'],'populations':{k:{key:v[key] for key in ('rows','formula_lexical_groups','source_lexical_groups','cross_source_lexical_overlap')} for k,v in result['populations'].items()}},sort_keys=True))
