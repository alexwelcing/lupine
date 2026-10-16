"""Independent exact combinatorial audit of hypothetical figure data."""
from pathlib import Path
from fractions import Fraction
from math import comb
import csv
import hashlib
import io
import json
import subprocess
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'.cache/phase2-finite-planning-figure-v1'
OUT=Path(__file__).resolve().parent
BOUND='4492858d9e55ddfa3cca2e208063799517948b13'
bindings={}
def raw(path):
    path=Path(path)
    if not path.is_absolute(): path=ROOT/path
    data=path.read_bytes()
    bindings[str(path.relative_to(ROOT))]=hashlib.sha256(data).hexdigest()
    return data
def obj(path):return json.loads(raw(path))
start=datetime.now(timezone.utc).isoformat()
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
assert head==BOUND
table=obj(BASE/'second-generation/exact-data.json')
rows=table['rows']
eta=Fraction(1,20)
assert table['population_panels']==100 and table['minimum_null_failures']==10
assert table['loss_ceiling']=='1/10' and table['significance']=='1/20'
assert len(rows)==101 and [r['sample_count'] for r in rows]==list(range(101))
# Distinct oracle: count uniform e-subsets for every possible null K, rather
# than using either generating recurrence. For IID count all strings over a
# ten-symbol equally likely alphabet whose one distinguished symbol fails.
oracle=[]
for e,row in enumerate(rows):
    worlds=[Fraction(comb(100-k,e),comb(100,e)) for k in range(10,101)]
    finite=max(worlds)
    iid=Fraction(9**e,10**e)
    assert worlds[0]==finite
    assert Fraction(row['finite_null_bound'])==finite
    assert Fraction(row['iid_null_bound'])==iid
    for prefix,p in [('finite',finite),('iid',iid)]:
        assert row[prefix+'_numerator']==str(p.numerator)
        assert row[prefix+'_denominator']==str(p.denominator)
        assert row[prefix+'_qualifies_at_eta'] is (e>0 and p<=eta)
    oracle.append((finite,iid))
minimum_finite=next(e for e,(f,i) in enumerate(oracle) if e>0 and f<=eta)
minimum_iid=next(e for e,(f,i) in enumerate(oracle) if e>0 and i<=eta)
first_zero=next(e for e,(f,i) in enumerate(oracle) if f==0)
assert (minimum_finite,minimum_iid,first_zero)==(25,29,91)
assert table['finite_minimum_positive_count']==minimum_finite
assert table['iid_minimum_positive_count']==minimum_iid
assert table['finite_first_exact_zero_count']==first_zero
assert oracle[24][0]>eta>=oracle[25][0]
assert oracle[28][1]>eta>=oracle[29][1]
assert oracle[25][0]==Fraction(655281507,13684039096)
assert oracle[90][0]==Fraction(1,comb(100,10))
assert all(f==0 and i>0 for f,i in oracle[91:])
assert oracle[0]==(1,1)
assert all(oracle[e+1][0]<=oracle[e][0] for e in range(100))
assert all(oracle[e+1][1]<oracle[e][1] for e in range(100))
csv_rows=list(csv.DictReader(io.StringIO(raw(BASE/'second-generation/exact-data.csv').decode(),newline='')))
assert len(csv_rows)==101
for row,csv_row in zip(rows,csv_rows):
    assert csv_row=={k:str(v) for k,v in row.items()}
for name in ['exact-data.json','exact-data.csv','source-bindings.json']:
    assert raw(BASE/'first-generation'/name)==raw(BASE/'second-generation'/name)
source=obj(BASE/'second-generation/source-bindings.json')
assert source['commit']==BOUND
for relative,digest in source['files'].items():
    data=raw(relative)
    assert hashlib.sha256(data).hexdigest()==digest
    assert data==subprocess.check_output(['git','show',BOUND+':discovery/'+relative],cwd=ROOT)
for generation in ['first-generation','second-generation']:
    receipt=obj(BASE/generation/'execution.json')
    assert receipt['exit_code']==0 and receipt['status']=='GENERATED'
    assert receipt['project_modules_imported'] is False
    assert receipt['runtime_conformance_executed'] is False
    assert receipt['scientific_data_read'] is False
    assert receipt['commit_before']==receipt['commit_after']==BOUND
    assert receipt['bound_sources_unchanged'] is True
    for name,digest in receipt['artifacts'].items():
        assert hashlib.sha256(raw(BASE/generation/name)).hexdigest()==digest
assert hashlib.sha256(raw(BASE/'generate.py')).hexdigest()=='848de8fa95ec6276bd31545df36ecb47044915e056079949a0e2abb305fc67d3'
raw(BASE/'README.md')
raw(BASE/'handoff.json')
walkthrough='.cache/phase2-finite-compatible-verification-v1/promotion/docs/finite-planning-walkthrough.md'
text=raw(walkthrough).decode()
assert '655281507/13684039096' in text
report={
 'schema':'lupine.discovery.independent_figure_math_review.v1',
 'status':'PASS_EXACT_ARITHMETIC_AND_CLAIM_REVIEW','blockers':[],
 'started_at':start,'finished_at':datetime.now(timezone.utc).isoformat(),
 'commit_bound':BOUND,
 'oracle':'Independent exact count of all uniform e-subsets for each K=10..100; separate IID ten-symbol sequence count 9**e/10**e. No generator or runtime import.',
 'checked_sample_counts':101,'finite_null_count_worlds_per_sample_count':91,'finite_null_world_count':9191,
 'exact_csv_json_agreement':True,'exact_data_unchanged_between_renders':True,
 'minimum_finite':25,'minimum_iid':29,'finite_first_zero':91,
 'boundaries':{'finite24':str(oracle[24][0]),'finite25':str(oracle[25][0]),'iid28':str(oracle[28][1]),'iid29':str(oracle[29][1]),'finite90':str(oracle[90][0])},
 'mathematical_reasoning':[
  'At fixed K, exactly C(100-K,e) of C(100,e) uniformly sampled subsets avoid failures; the numerator is nonincreasing in K, so the null supremum for K>=10 occurs at K=10.',
  'Under the separate IID model, Pr(zero failures)=(1-q)^e is nonincreasing in q, so q>=1/10 gives the null supremum (9/10)^e.',
  'Finite zero-failure mass is positive through e=90 and zero for e>=91. This is null event impossibility, not observed zero risk.',
  'Rejecting only on zero failures at fixed e=25 has false-rejection probability at most 1/20 under each fixed null world; it is not a posterior null probability or a prediction of success.',
  'Conditioning is on the complete frozen residual frame/policy/calibration with a valid uniform draw, not additionally on the realized subset or a selected favorable subgroup. The two experiment scopes differ.'
 ],
 'claim_review':{'walkthrough_exact_fraction_correct':True,'24_fails_25_qualifies':True,'28_fails_29_qualifies':True,'no_power_or_scientific_performance_or_cost_claim':True,'no_physical_or_future_material_guarantee':True,'source_binding_not_runtime_conformance':True,'prior_negative_results_preserved':True},
 'not_performed':{'runtime_conformance':True,'runtime_test_suite':True,'generator_rerender':True,'independent_visual_inspection':True,'network_or_scientific_data_reads':True,'new_theorem_compilation_or_refinement':True},
 'visual_scope':'Root/author visual review exists separately; this review checks arithmetic, source and prose, not layout.',
 'bindings':bindings}
(OUT/'review.json').write_text(json.dumps(report,indent=2,sort_keys=True)+'\n')
print(json.dumps({'status':report['status'],'exact_rows':101,'finite_null_worlds':9191,'finite_minimum':25,'iid_minimum':29,'first_exact_zero':91,'review_sha256':hashlib.sha256((OUT/'review.json').read_bytes()).hexdigest()},sort_keys=True))
