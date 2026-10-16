from pathlib import Path
import json,hashlib,datetime,subprocess
root=Path.cwd();commit='c17c4c6b152af2e7bc1b7a7639336f6b0f733ace';base=root/'.cache/phase2-growth-operation-review-v1'
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==commit
assert not subprocess.check_output(['git','status','--porcelain'])
def digest(relative):return hashlib.sha256((root/relative).read_bytes()).hexdigest()
ci=json.loads((root/'.cache/phase2-growth-ci-v1/final.json').read_text());assert ci['commit']==commit and ci['all_four_jobs_successful'] is True
files={'ci':'.cache/phase2-growth-ci-v1/final.json','package0':'.cache/phase2-growth-clean-package-v1/0-execution.json','package1':'.cache/phase2-growth-clean-package-v1/1-execution.json','artifact_review':'.cache/phase2-growth-artifact-review-v1/actual-c17c4c6b152a/review.json','additive_review':'.cache/phase2-growth-artifact-review-v1/additive-c17c4c6b152a/additive-review.json','artifact_execution0':'.cache/phase2-growth-artifact-review-v1/execution-c17c4c6b152a/0-execution.json','artifact_execution1':'.cache/phase2-growth-artifact-review-v1/execution-c17c4c6b152a/1-execution.json'}
recorders={}
for name,directory,expected in [('shape','phase2-growth-shape-operations-v1','bf5d4bd82a840aaf8514265ae5a93ecdd152032840d6efcb129f3be9bb24b4a8'),('envelope','phase2-growth-envelope-operations-v1','5c2a3fe1190c585f9dbb0d9c27d896a852fc84710d70839925f4f7c1c69cea10')]:
 value=digest('.cache/'+directory+'/run_after_ci.py');assert value==expected;recorders[name]=value
pins=digest('.cache/phase2-growth-release-v1/final-reviewed-pins.json');assert pins=='f65508a95077542381e000102ba2eb460ad080b058d8204a00ee34b74c9577e7'
r={'schema':'lupine.discovery.growth_operation_audit_bindings.v1','status':'FINAL_BOUND_OPERATION_AUDIT','commit':commit,'reviewed_pins_sha256':pins,'recorders':recorders,'gate_sha256':{k:digest(v) for k,v in files.items()},'actual_outcomes':'READ_FROM_COMPLETED_CANONICAL_REPORTS_NOT_ASSUMED_BY_THIS_BINDING','scope':'Exact source/CI/package/artifact/recorder bindings; audit reads completed public outputs without rerunning source classifiers.','bound_at':datetime.datetime.now(datetime.timezone.utc).isoformat()}
p=base/'bindings.final.json'
with p.open('x') as f:json.dump(r,f,indent=2,sort_keys=True);f.write('\n')
print(json.dumps({'path':str(p.relative_to(root)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}))
