"""One held census invocation; separate earlier identity-only read is recorded."""
from pathlib import Path
import datetime,hashlib,json,os,subprocess,sys,time
R=Path(__file__).resolve().parents[2];H=Path(__file__).resolve().parent
C=R/'.cache/phase2-rhizo-census-candidate-v1'
HEAD='d4d8504a97d362a6339eaa27453a86e0eb167cee'
PINS={
 '.cache/phase2-rhizo-census-candidate-v1/census.py':'d77a1ca2eeeb1d0f4e02fac6d624fa63527c4a8d423fdf8f7f645db102c67630',
 '.cache/phase2-rhizo-census-candidate-v1/contract.json':'e849d36004f0e73fdde22620bbffe06d1e53425907ca5fce974c536a5e1ea052',
 '.cache/phase2-rhizo-census-candidate-v1/handoff.json':'863631998ad2cac8706cdfd46698bfcef37aa04529b6affa73a8d13ffea13ca1',
 '.cache/phase2-rhizo-census-independent-v1/review.json':'fdae85ce4e444ef5e98f913f472111eb8b8f95afb1b5a4ec43be9961cefc9f04',
 '.cache/phase2-rhizo-census-scope-review-v1/review.json':'0157617d237e5134cfd7bbf84984698b009b8dd32d2c074faa066c72e45005f1',
 'reports/phase2-rhizo-reference-readiness-v1/design/reference-frame.json':'80a1aca0fd56d89f49ff5f0e4b3930405f11ae1cd4acea14b8edab2381940aa4',
 'reports/phase2-rhizo-recorded-label-readiness-v1/actual/public.json':'b444e7d33cb18619942c2dfbb5cd3374fd9cd9adee6732825ce20ed431641a33'}
def sha(raw):return hashlib.sha256(raw).hexdigest()
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def write(p,v):
 with p.open('x') as f:json.dump(v,f,indent=2);f.write('\n')
def git(*args):return subprocess.check_output(['git',*args],cwd=R,text=True).strip()
def state():
 assert git('rev-parse','HEAD')==HEAD and git('branch','--show-current')=='research/lupine-discovery'
 assert not git('status','--porcelain')
 remote=git('ls-remote','--exit-code','origin','refs/heads/research/lupine-discovery').split();assert remote==[HEAD,'refs/heads/research/lupine-discovery']
 for p,h in PINS.items():assert sha((R/p).read_bytes())==h
 manifest=json.loads((R/'reports/runtime-manifest.json').read_bytes())['files'];assert len(manifest)==335
 observed={p:sha((R/p).read_bytes()) for p in manifest};assert observed==manifest
 return {'head':HEAD,'remote_exact':True,'source_pins':PINS,'runtime_files':observed}
if __name__=='__main__':
 before=state()
 author=json.loads((C/'first-author/execution.json').read_bytes());assert author['tests_run']==29 and author['exit_code']==0 and author['failures']==author['errors']==0 and author['source_and_contract_held']
 independent=json.loads((R/'.cache/phase2-rhizo-census-independent-v1/review.json').read_bytes());assert independent['status']=='PASS_GENERATED_NUMERIC_AND_SCHEMA_REVIEW'
 projection=json.loads((H/'projection-binding.json').read_bytes())['projection'];assert projection=={'bytes':116049,'sha256':'4e1a11dd32e08aa3c92acdc402fcfeb497bd202995f7de7b977593a096b85468'}
 mf=C/'reviewed-invocation.json';manifest={'schema':'lupine.rhizo.census-invocation.v1','script_sha256':PINS[str((C/'census.py').relative_to(R))],'contract_sha256':PINS[str((C/'contract.json').relative_to(R))],'frame_sha256':PINS['reports/phase2-rhizo-reference-readiness-v1/design/reference-frame.json'],'readiness_sha256':PINS['reports/phase2-rhizo-recorded-label-readiness-v1/actual/public.json'],'projection':projection,'output_slot':str((C/'actual').relative_to(R))};write(mf,manifest);mfsha=sha(mf.read_bytes())
 slot=H/'actual-execution';slot.mkdir(exist_ok=False)
 source=PINS[str((C/'census.py').relative_to(R))]
 code="import hashlib,sys,types; from pathlib import Path; p=Path(sys.argv[1]); raw=p.read_bytes(); assert hashlib.sha256(raw).hexdigest()==sys.argv[5]; m=types.ModuleType('held_census'); m.__file__=str(p); exec(compile(raw,str(p),'exec'),m.__dict__); r=m.run_retained(Path(sys.argv[2]),Path(sys.argv[3]),sys.argv[4]); sys.stdout.buffer.write(m.canonical(r)); sys.exit(0 if r['status']=='DESCRIPTIVE_CENSUS_COMPLETE' and r['output_error'] is None else 2)"
 command=[sys.executable,'-B','-c',code,str(C/'census.py'),str(R),str(mf),mfsha,source]
 start=now();write(slot/'start.json',{'at':start,'command':command,'before':before,'manifest_sha256':mfsha,'recorder_sha256':sha(Path(__file__).read_bytes()),'root_static_source_review':'Complete held source read; numeric independent review excludes file lifecycle; author tests include lifecycle; no formal refinement claim.','scope':'One census read of the already retained projection; earlier identity-only binding read recorded separately; no original bound/run/reference objects.','ci_scope':'Current report-only descendant CI separately observed; held ignored census source is validated by recorded generated tests, not claimed as CI-executed runtime.'})
 tick=time.monotonic();timeout=False
 with (slot/'stdout.json').open('xb') as out,(slot/'stderr.txt').open('xb') as err:
  try:result=subprocess.run(command,cwd=R,stdout=out,stderr=err,timeout=60,env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1'});rc=result.returncode
  except subprocess.TimeoutExpired:timeout=True;rc=None
 elapsed=time.monotonic()-tick;after=state();assert mfsha==sha(mf.read_bytes())
 raw=(slot/'stdout.json').read_bytes();public=C/'actual/public.json';persisted=public.read_bytes() if public.exists() else None
 receipt={'started_at':start,'finished_at':now(),'exit_code':rc,'timed_out':timeout,'process_seconds':elapsed,'source_runtime_remote_held':before==after,'runtime_files_held':335,'stdout_bytes':len(raw),'stdout_sha256':sha(raw),'stderr_bytes':(slot/'stderr.txt').stat().st_size,'stderr_sha256':sha((slot/'stderr.txt').read_bytes()),'persisted_public_matches_stdout':persisted==raw,'actual_census_invocations':1,'earlier_identity_only_reads':1,'original_objects_read':False,'automatic_retry':False,'manifest_sha256':mfsha}
 write(slot/'execution.json',receipt);print(json.dumps(receipt));sys.exit(0 if rc==0 and persisted==raw and receipt['stderr_bytes']==0 else 2)
