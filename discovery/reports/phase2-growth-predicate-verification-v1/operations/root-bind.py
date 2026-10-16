from pathlib import Path
import datetime,hashlib,json,subprocess
root=Path.cwd();out=root/'.cache/phase2-growth-predicate-release-v1';operation=root/'.cache/phase2-growth-predicate-operations-v1'
def sha(raw):return hashlib.sha256(raw).hexdigest()
def read(p):return json.loads(p.read_bytes())
commit='a064a2c0e4a7cce1fbcb0541f49aae132944e785'
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==commit
assert subprocess.check_output(['git','branch','--show-current'],text=True).strip()=='research/lupine-discovery'
assert not subprocess.check_output(['git','status','--porcelain'])
assert subprocess.check_output(['git','ls-remote','origin','refs/heads/research/lupine-discovery'],text=True).split()==[commit,'refs/heads/research/lupine-discovery']
ci_path='.cache/phase2-growth-predicate-ci-v1/final.json';ci=read(root/ci_path)
assert ci['commit']==commit and ci['all_four_jobs_successful'] is True
assert ci['run']['run_attempt']==1 and ci['run']['event']=='push'
assert {j['name'] for j in ci['jobs']}=={'python (3.11)','python (3.12)','browser','lean'}
assert all(j['status']=='completed' and j['conclusion']=='success' for j in ci['jobs'])
pins=read(out/'final-reviewed-pins.json')['files'];manifest=root/'reports/runtime-manifest.json';runtime=read(manifest)['files'];assert len(runtime)==335
assert all(sha((root/p).read_bytes())==h for p,h in runtime.items())
assert all(sha((root/p).read_bytes())==h for p,h in pins.items())
paths={'ci':ci_path,'package':'.cache/phase2-growth-predicate-clean-package-v1/0-execution.json','strict':'.cache/phase2-growth-predicate-clean-package-v1/1-execution.json','artifact_review':'.cache/phase2-growth-predicate-artifact-review-v1/actual-a064a2c0e4a7/review.json','additive_review':'.cache/phase2-growth-predicate-artifact-review-v1/additive-correction-1-a064a2c0e4a7/additive-review.json'}
for key in ('package','strict'):
 v=read(root/paths[key]);assert v['commit']==commit and v['exit_code']==0 and v['source_unchanged'] and v['head_unchanged'] and v['worktree_clean'] and v['runtime_before']==v['runtime_after']==runtime
for key,digest in [('artifact_review','47aafc2bc5efba2a621d934568751892074473d7cc428f4e5a3c45f46937b1bb'),('additive_review','d0721e59e4c9fdc0b1ad592fc73431cc0c92b9fb2d57040c3ead4ce17bc9e14b')]:
 raw=(root/paths[key]).read_bytes();assert sha(raw)==digest
 v=json.loads(raw);assert v['status']=='PASS' and v['commit']==commit
recorder=operation/'run_after_ci.py';assert sha(recorder.read_bytes())=='b89fcabf338e9329c3cdabdc58fb13d71396540aeec405ed5e3a01cc12ff6079'
p=operation/'bindings.json';original=p.read_bytes();binding=json.loads(original)
assert binding['commit'] is None and binding['recorder_sha256'] is None
assert not (operation/'production').exists()
for n in ('1','2'):assert not (root/'.cache/li-v3-custody/growth-predicate-audit-v1'/n).exists()
with (operation/'reviewed-unbound-bindings.json').open('xb') as f:f.write(original)
binding.update(commit=commit,recorder_sha256=sha(recorder.read_bytes()),runtime_manifest_sha256=sha(manifest.read_bytes()),source_files=pins,gates={k:{'path':path,'sha256':sha((root/path).read_bytes())} for k,path in paths.items()})
p.write_text(json.dumps(binding,indent=2,sort_keys=True)+'\n');digest=sha(p.read_bytes())
receipt={'bound_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'commit':commit,'bindings_sha256':digest,'recorder_sha256':sha(recorder.read_bytes()),'original_unbound_bindings_sha256':sha(original),'source_and_all_release_gates_verified':True,'actual_operations':0,'scope':'Root binds exact held recorder after original CI, package, full and additive artifact gates. No target access by this binding script.'}
with (operation/'root-binding.json').open('x') as f:json.dump(receipt,f,indent=2);f.write('\n')
print(json.dumps(receipt))
