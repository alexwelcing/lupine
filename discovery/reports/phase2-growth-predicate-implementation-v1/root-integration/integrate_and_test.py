from pathlib import Path
import datetime,hashlib,json,os,subprocess,sys,time
root=Path.cwd();out=root/'.cache/phase2-growth-predicate-release-v1';receipt=out/'integration-first';receipt.mkdir(exist_ok=False)
sys.path.insert(0,str(root/'scripts'));import runtime_manifest
base='9766b6838388c35a92d32b1a60e65613c72b3fee'
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==base
assert subprocess.check_output(['git','rev-parse','FETCH_HEAD'],text=True).strip()==base
assert not subprocess.check_output(['git','status','--porcelain'])
prior=runtime_manifest.source_files(root);assert len(prior)==332
assert prior==json.loads((root/'reports/runtime-manifest.json').read_text())['files']
def sha(x):return hashlib.sha256(x).hexdigest()
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def write(p,v):p.write_text(json.dumps(v,indent=2,sort_keys=True)+'\n')
pins={
'scripts/li_v3_growth_predicate_audit.py':'70a0339212b971bf7824ae256600b959ae7a7d22b6fc8853eb2208d3c8ece207',
 'tests/test_li_v3_growth_predicate_audit.py':'1ca8b259f26c88e46a0e108d13c202afa15954871d5750c17307b58b90dd97d3',
 'tests/test_li_v3_growth_predicate_audit_review.py':'3dd4b23024028e2e7ba5876ca8d9705e066e57362bfae63d9999783e76b5dc49',
 'docs/li-v3-growth-predicate-audit-plan.md':'a1a7d8fe820ddcd8d3479d53e4f35d5ce0ed6e123385bcbb1b646786e1d064d9'}
review=root/'.cache/phase2-growth-predicate-production-review-v1/review.json'
assert sha(review.read_bytes())=='5dccb8c79ec15b94155af3ad4a6dbda632b22eea9501c76195afe91168cb0d93'
assert not json.loads(review.read_bytes())['blockers']
for path,digest in pins.items():
 directory='phase2-growth-predicate-production-review-v1' if path.endswith('_review.py') else 'phase2-growth-predicate-production-v1'
 raw=(root/'.cache'/directory/'promotion'/path).read_bytes();assert sha(raw)==digest
 destination=root/path;assert not destination.exists();destination.write_bytes(raw)
before=runtime_manifest.source_files(root);assert len(before)==335
assert all(before[k]==v for k,v in prior.items())
write(out/'final-reviewed-pins.json',{'status':'FINAL_REVIEWED_SOURCE_PINS','baseline_commit':base,'reviewed_at':now(),'files':pins,'old332_unchanged':True,'scope':'Exact reviewed G34 files; no actual source operation or scientific admission.'})
command=[sys.executable,'-m','unittest','discover','-s','tests','-p','test_li_v3*.py','-v']
env=dict(os.environ);env['PYTHONDONTWRITEBYTECODE']='1';env.pop('PYTHONPATH',None);env.pop('PREDICATE_PRODUCTION_CANDIDATE',None)
start=now();tick=time.monotonic();write(receipt/'start.json',{'started_at':start,'command':command,'runtime_before':before,'new_files':pins})
with (receipt/'stdout.txt').open('xb') as stdout,(receipt/'stderr.txt').open('xb') as stderr:
 result=subprocess.run(command,cwd=root,stdout=stdout,stderr=stderr,env=env,timeout=300)
after=runtime_manifest.source_files(root)
v={'started_at':start,'finished_at':now(),'elapsed_seconds':time.monotonic()-tick,'command':command,'exit_code':result.returncode,'runtime_before':before,'runtime_after':after,'source_unchanged':before==after,'runtime_count':len(after),'old332_unchanged':all(after[k]==v for k,v in prior.items()),'stdout_sha256':sha((receipt/'stdout.txt').read_bytes()),'stderr_sha256':sha((receipt/'stderr.txt').read_bytes()),'scope':'Combined generated Li engineering checks; no actual source or scientific experiment.'}
write(receipt/'execution.json',v)
print(json.dumps({k:v for k,v in v.items() if k not in ('runtime_before','runtime_after')}),flush=True)
print((receipt/'stderr.txt').read_text()[-1600:],flush=True)
assert result.returncode==0 and before==after
subprocess.run([sys.executable,'scripts/runtime_manifest.py','--write','--checkpoint','2026-10-16-growth-predicate-diagnostic-implementation'],check=True)
