from pathlib import Path
from math import comb
import datetime,hashlib,json,re
ROOT=Path.cwd(); PROMOTION=ROOT/'.cache/phase2-finite-publication-v1/promotion'; REPORTS=PROMOTION/'reports'; BASE=REPORTS/'phase2-finite-workbench-v1'; OUT=ROOT/'.cache/phase2-finite-final-claim-review-v1'
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def read(path):return json.loads(path.read_text())
bindings=[]
def bind(path):bindings.append({'path':str(path.relative_to(ROOT)),'bytes':path.stat().st_size,'sha256':sha(path)})
def check_logs(folder,receipt):
 for stream in ('stdout','stderr'):
  path=folder/(stream+'.txt')
  if stream+'_sha256' in receipt:assert sha(path)==receipt[stream+'_sha256'],str(path)
  bind(path)
 bind(folder/'execution.json')
checks=[]
for v,case_specs in [(1,[(0,67,0),(1,49,0),(2,23,1)]),(2,[(0,76,0),(1,49,0),(2,23,0),(3,None,0)])]:
 for i,count,exitcode in case_specs:
  folder=BASE/f'combined-v{v}/{i}'; r=read(folder/'execution.json');check_logs(folder,r)
  assert r['exit_code']==exitcode and r['source_unchanged'] is True
  assert r['source_before']==r['source_after'] and len(r['source_before'])==(310 if v==1 else 311)
  stderr=(folder/'stderr.txt').read_text()
  if count is not None:
   assert re.search(r'Ran '+str(count)+r' tests in [0-9.]+s',stderr)
   assert ('FAILED (failures=1)' if exitcode else '\nOK\n') in stderr
  else:
   smoke=read(folder/'stdout.txt');assert smoke['status']=='passed' and smoke['case_count']==28
   assert len(smoke['problem_schemas'])==6 and len(smoke['checks'])==16
  checks.append({'receipt':str((folder/'execution.json').relative_to(PROMOTION)),'exit_code':exitcode,'test_count':count,'runtime_files':len(r['source_before'])})
first=read(BASE/'combined-v1/0/execution.json')['source_before'];second=read(BASE/'combined-v2/0/execution.json')['source_before']
assert sorted(k for k in first if first[k]!=second.get(k))==['tests/test_package_retention.py','tests/test_retained_mpea_transport.py']
assert sorted(set(second)-set(first))==['tests/test_finite_planning_review.py']
assert 'AssertionError: 16 != 15' in (BASE/'combined-v1/2/stderr.txt').read_text()
assert not (BASE/'combined-v1/3/execution.json').exists()
author=REPORTS/'phase2-finite-planner-author-v1'
for name,expected,count in [('author-tests-first',0,13),('mutant-floor',1,1),('mutant-strict',1,1),('mutant-iid',1,1),('mutant-last-minimum',1,1)]:
 folder=author/name;r=read(folder/'execution.json');check_logs(folder,r)
 assert r['exit_code']==r['expected_exit_code']==expected and r['expectation_met']
 assert r['candidate_unchanged'] and r['source_held'] and r['tracked_package_unchanged']
 text=(folder/'stderr.txt').read_text();assert re.search(r'Ran '+str(count)+r' tests? in [0-9.]+s',text)
 assert ('FAILED (failures=1)' if expected else '\nOK\n') in text
 checks.append({'receipt':str((folder/'execution.json').relative_to(PROMOTION)),'exit_code':expected,'test_count':count,'intentional_negative':bool(expected)})
ind=REPORTS/'phase2-finite-planner-review-v1/first';r=read(ind/'execution.json');check_logs(ind,r)
assert r['exit_code']==0 and r['source_unchanged'] and r['before']==r['after']
assert 'Ran 9 tests' in (ind/'stderr.txt').read_text()
assert read(ind/'stdout.txt')['independent_oracle_counts']=={'finite_null_cases':3663,'sequential_draw_distributions':284}
checks.append({'receipt':str((ind/'execution.json').relative_to(PROMOTION)),'exit_code':0,'test_count':9,'finite_null_cases':3663,'sequential_draw_distributions':284})
folder=BASE/'interface/browser-attempt-1';r=read(folder/'execution.json');check_logs(folder,r)
assert r['exit_code']==0 and r['source_unchanged'] and r['source_before']==r['source_after'] and len(r['source_before'])==310
assert round(r['elapsed_seconds'],3)==144.080
browser=read(folder/'artifacts/browser-report.json');assert browser['status']=='passed' and len(browser['checks'])==73 and browser['javascript_errors']==[]
assert (folder/'stdout.txt').read_bytes()==(folder/'artifacts/browser-report.json').read_bytes()
summary=read(BASE/'interface/verification-summary.json');old_path=ROOT/summary['prior_report'];assert sha(old_path)==summary['prior_report_sha256']
old=read(old_path)['checks'];assert len(old)==65
assert [c for c in browser['checks'] if c in old]==old
assert [c for c in browser['checks'] if c not in old]==summary['added_checks']
checks.append({'receipt':str((folder/'execution.json').relative_to(PROMOTION)),'exit_code':0,'browser_checks':73,'old_checks_preserved_in_order':65,'elapsed_seconds':r['elapsed_seconds']})
for name,expected in [('first',0),('mutation-control',1)]:
 folder=BASE/'independent-interface'/name;r=read(folder/'execution.json');check_logs(folder,r)
 assert r['exit_code']==expected and r['source_unchanged'] and r['source_before']==r['source_after'] and len(r['source_before'])==311
 if expected:
  assert 'AssertionError: stale response changed newest result' in (folder/'stderr.txt').read_text()
 else:
  actual=read(folder/'stdout.txt');assert actual['check_count']==8 and actual['javascript_errors']==[]
  assert round(r['elapsed_seconds'],3)==14.285
 checks.append({'receipt':str((folder/'execution.json').relative_to(PROMOTION)),'exit_code':expected,'focused_groups':None if expected else 8,'intentional_negative':bool(expected),'elapsed_seconds':r['elapsed_seconds']})
# Independently check the stated hypothetical count comparison as integer arithmetic.
assert comb(90,24)*20>comb(100,24) and comb(90,25)*20<=comb(100,25)
assert 9**28*20>10**28 and 9**29*20<=10**29
assert comb(8,7)*15==comb(10,7) and comb(8,8)*45==comb(10,8)
for path in [BASE/'README.md',PROMOTION/'README.md',PROMOTION/'docs/study-planning.md',BASE/'interface/static-review.json',BASE/'interface/verification-summary.json',BASE/'independent-interface/review.json',BASE/'integration/package-probe-delta.json',BASE/'publication-scope.json',REPORTS/'phase2-finite-planner-review-v1/review.json',author/'README.md',old_path]:bind(path)
report={'schema':'lupine.discovery.finite_final_claim_review.v1','status':'NO_BLOCKER','reviewed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'owner':'phase2_math','independent_mathematical_claim_reviewer':'phase2_math/proof_check','verified_execution_records':checks,'findings':['All claimed test and browser counts/durations agree with retained actual receipts and logs; source-before/after maps agree.','The failed retained suite is preserved as one stale15-versus16 expectation, not a scientific or installed-product failure. Repaired overlay changes exactly two test files and adds the independent test; product hashes remain unchanged.','Four author mutants and the stale-browser mutant fail intentionally at the documented controls; they are not counted as extra passing product tests.','Isolated overlay package28cases/sixschemas/16checks is explicitly distinct from committed retention/publication/CI, which remain later gates.','Finite K/M residual-frame hypergeometric resolution is distinct from IID q-risk/binomial planning, marginal conformal coverage, empirical power and future physical risk. Realized-subset/full-transcript conditioning is excluded.','Documented ten-panel1/15-versus1/45 and finite25-versusIID29 examples satisfy exact integer comparisons, without any scientific input or superiority conclusion.','Existing mathematical/scientific NO_GO limits and original failures remain explicit; no Lean compilation/refinement or actual source sampling is inferred.'],'scope_limits':['Read-only retained public/candidate receipt and narrative audit; no tests, browser or package rerun.','No actual Li source, private archive or production cache read; no network request.','Independent browser screenshots and assistive-technology behavior were not re-inspected here; their separately scoped review remains the evidence.','Source/API/UI integration reviews were already performed and are retained separately.'],'source_bindings':bindings,'tracked_edits':False,'runtime_tests_run':False,'scientific_experiment_performed':False}
raw=(json.dumps(report,indent=2)+'\n').encode();(OUT/'review.json').write_bytes(raw)
print(json.dumps({'status':report['status'],'verified_execution_records':len(checks),'sha256':hashlib.sha256(raw).hexdigest()}))
