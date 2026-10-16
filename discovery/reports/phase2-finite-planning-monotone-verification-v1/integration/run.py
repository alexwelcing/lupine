from pathlib import Path
import datetime,hashlib,json,os,shutil,signal,subprocess,sys,time
R=Path(__file__).absolute().parents[2];H=Path(__file__).absolute().parent
C=R/'.cache/phase2-finite-planning-monotone-candidate-v1/integration'
sha=lambda b:hashlib.sha256(b).hexdigest()
read=lambda p:json.loads(p.read_bytes())
def record(p,v):
 with p.open('x') as f:f.write(json.dumps(v,indent=2)+'\n')
def git(*args):return subprocess.check_output(['git',*args],cwd=R,stderr=subprocess.PIPE)
BASE='88d512cbf40a7a7d11fb45aa24cd5462f8a7e81d'
assert git('rev-parse','HEAD').decode().strip()==BASE and not git('status','--porcelain')
git('fetch','origin','refs/heads/research/lupine-discovery');assert git('rev-parse','FETCH_HEAD').decode().strip()==BASE
assert sha((C/'copyset.json').read_bytes())=='7a8b84edb903eb71c725e626b5baeff3064f3605f70c04a6d76cc3621b7c0a66'
peer=R/'.cache/phase2-finite-planning-monotone-review-v1/handoff.json';assert sha(peer.read_bytes())=='c2c145964206c9bcf5d575134490e6791e8ee017d68f87e3bfa25a33ff756761'
assert read(peer)['verdict']=='NO_BLOCKING_FINDING' and read(peer)['compile_exit_code']==0
baseline=read(C/'baseline.json')['files'];assert all(sha((R/n).read_bytes())==d['sha256'] for n,d in baseline.items())
runtime=read(R/'reports/runtime-manifest.json')['files'];assert len(runtime)==345 and all(sha((R/n).read_bytes())==d for n,d in runtime.items())
for item in read(C/'copyset.json')['files']:
 p=R/item['path'];raw=(C/item['input']).read_bytes();assert sha(raw)==item['sha256'] and len(raw)==item['bytes']
 assert (not p.exists()) if item['baseline_sha256'] is None else sha(p.read_bytes())==item['baseline_sha256']
 p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw)
history=read(C/'history-plan.json')
for e in history['inputs']:
 p=R/e['destination'];raw=(C/e['input']).read_bytes();assert not p.exists() and sha(raw)==e['sha256'];p.write_bytes(raw)
p=R/'formal/history/README.md';p.write_text(p.read_text().rstrip()+'\n\n'+history['suggested_history_readme_paragraph']+'\n')
held={n:sha((R/n).read_bytes()) for n in baseline if n not in ('formal/AXIOMS.txt','formal/theorem-inventory.json')};held['formal/LupineFinitePlanningMonotone.lean']=sha((R/'formal/LupineFinitePlanningMonotone.lean').read_bytes())
record(H/'start.json',{'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'baseline':BASE,'held':held,'runtime':runtime,'scientific_admission':False})
env=dict(os.environ,LEAN_NUM_THREADS='1',PYTHONDONTWRITEBYTECODE='1');lake=shutil.which('lake') or str(Path.home()/'.elan/bin/lake');receipts=[]
for name,cmd in [('build',[lake,'--wfail','build']),('audit',[sys.executable,'audit_axioms.py']),('parser-tests',[sys.executable,'-m','unittest','test_audit_axioms','-v'])]:
 start=time.time_ns();clock=time.monotonic();timeout=False;p=subprocess.Popen(cmd,cwd=R/'formal',env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,start_new_session=True)
 try:out,err=p.communicate(timeout=900)
 except subprocess.TimeoutExpired:
  timeout=True;os.killpg(p.pid,signal.SIGKILL);out,err=p.communicate()
 finish=time.time_ns();duration=time.monotonic()-clock
 (H/(name+'-stdout.txt')).write_bytes(out);(H/(name+'-stderr.txt')).write_bytes(err)
 stable=all(sha((R/n).read_bytes())==d for n,d in held.items());runtime_stable=all(sha((R/n).read_bytes())==d for n,d in runtime.items())
 receipt={'command':cmd,'cwd':'formal','exit_code':p.returncode,'timed_out':timeout,'started_ns':start,'finished_ns':finish,'process_seconds':duration,'source_held':stable,'runtime_345_held':runtime_stable,'stdout_sha256':sha(out),'stdout_bytes':len(out),'stderr_sha256':sha(err),'stderr_bytes':len(err)}
 record(H/(name+'-execution.json'),receipt);receipts.append(receipt);print(json.dumps({'step':name,**receipt}),flush=True)
 assert p.returncode==0 and not timeout and stable and runtime_stable
v=read(R/'formal/theorem-inventory.json');assert (v['theorem_count'],v['module_count'])==(147,12);assert v['axiom_output_sha256']==sha((R/'formal/AXIOMS.txt').read_bytes())
old=read(R/'formal/history/pre-finite-planning-monotone-theorem-inventory.json');now={m['source']:m for m in v['modules']};assert all(now[m['source']]==m for m in old['modules']);assert len(now['LupineFinitePlanningMonotone.lean']['theorems'])==4
record(H/'result.json',{'status':'PASS_STRICT_BUILD_FRESH_AXIOM_AUDIT_AND_PARSER_TESTS','theorems':147,'modules':12,'prior_theorems':143,'added_theorems':4,'old_modules_unchanged':11,'runtime_files_unchanged':345,'commands':receipts,'inventory_sha256':sha((R/'formal/theorem-inventory.json').read_bytes()),'axiom_output_sha256':sha((R/'formal/AXIOMS.txt').read_bytes()),'python_refinement':False,'scientific_admission':False})
print('PASS: 147 audited statements in12modules; original11sources and345runtimefiles unchanged',flush=True)
