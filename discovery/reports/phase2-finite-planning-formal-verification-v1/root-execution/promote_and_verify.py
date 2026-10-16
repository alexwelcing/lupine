"""Root integration and actual strict verification of the reviewed formal source."""
from pathlib import Path
import datetime
import hashlib
import json
import os
import shutil
import signal
import subprocess
import sys
import time

R=Path(__file__).absolute().parents[2]
H=Path(__file__).absolute().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
def read(p):return json.loads(p.read_bytes())
def record(p,v):
    with p.open('x') as stream:stream.write(json.dumps(v,indent=2)+'\n')

assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=R).decode().strip()=='9d1f21dae141a28db378ee2e16aa83340df57877'
assert sha((H/'copyset.json').read_bytes())=='e27030bde2743df70ee38fe3b9d0d3eb9c660378ec7dcc38209b111a74ea195d'
peer=R/'.cache/phase2-finite-planning-formal-review-v1/handoff.json'
assert sha(peer.read_bytes())=='9e10906e1fb459b4a62c84cd70a2c35c55575f761e8c38b1eec5e34c1f197f85'
assert read(peer)['status']=='REVIEW_COMPLETE_NO_BLOCKER' and read(peer)['independent_compile_exit_code']==0
baseline=read(H/'baseline.json')
for name,pin in baseline['source_files'].items():assert sha((R/name).read_bytes())==pin['sha256'],name
runtime=read(R/'reports/runtime-manifest.json')['files']
assert len(runtime)==345 and all(sha((R/n).read_bytes())==d for n,d in runtime.items())
for item in read(H/'copyset.json')['files']:
    path=R/item['path'];raw=(H/item['candidate_path']).read_bytes()
    assert len(raw)==item['bytes'] and sha(raw)==item['sha256']
    assert (not path.exists()) if item['baseline_sha256'] is None else sha(path.read_bytes())==item['baseline_sha256']
    path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(raw)
held={n:sha((R/n).read_bytes()) for n in baseline['source_files'] if n not in ('formal/AXIOMS.txt','formal/theorem-inventory.json')}
held['formal/LupineFinitePlanning.lean']=sha((R/'formal/LupineFinitePlanning.lean').read_bytes())
assert held['formal/LupineFinitePlanning.lean']=='391b03aefda0f7bac5bd380347b81febc8a4ebbd329ae3a099981784803973bd'
run=H/'root-first-integration';run.mkdir()
record(run/'start.json',{'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'held':held,'runtime':runtime,'candidate_sha256':held['formal/LupineFinitePlanning.lean'],'scientific_admission':False})
lake=shutil.which('lake') or str(Path.home()/'.elan/bin/lake')
env=dict(os.environ,LEAN_NUM_THREADS='1',PYTHONDONTWRITEBYTECODE='1')
commands=[('build',[lake,'--wfail','build']),('audit',[sys.executable,'audit_axioms.py']),
          ('parser-tests',[sys.executable,'-m','unittest','test_audit_axioms','-v'])]
receipts=[]
for name,command in commands:
    start=time.time_ns();clock=time.monotonic();timeout=False
    p=subprocess.Popen(command,cwd=R/'formal',env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,start_new_session=True)
    try:out,err=p.communicate(timeout=900)
    except subprocess.TimeoutExpired:
        timeout=True;os.killpg(p.pid,signal.SIGKILL);out,err=p.communicate()
    finish=time.time_ns()
    (run/(name+'-stdout.txt')).write_bytes(out);(run/(name+'-stderr.txt')).write_bytes(err)
    stable=all(sha((R/n).read_bytes())==d for n,d in held.items())
    runtime_stable=all(sha((R/n).read_bytes())==d for n,d in runtime.items())
    receipt={'command':command,'cwd':'formal','exit_code':p.returncode,'timed_out':timeout,
             'started_ns':start,'finished_ns':finish,'process_seconds':time.monotonic()-clock,
             'source_held':stable,'runtime_345_held':runtime_stable,
             'stdout_sha256':sha(out),'stdout_bytes':len(out),'stderr_sha256':sha(err),'stderr_bytes':len(err)}
    record(run/(name+'-execution.json'),receipt);receipts.append(receipt)
    print(json.dumps({'step':name,**receipt}),flush=True)
    assert p.returncode==0 and not timeout and stable and runtime_stable,name
inventory=read(R/'formal/theorem-inventory.json')
assert inventory['theorem_count']==143 and inventory['module_count']==11
assert inventory['axiom_output_sha256']==sha((R/'formal/AXIOMS.txt').read_bytes())
old=read(R/'formal/history/pre-finite-planning-theorem-inventory.json')
current={v['source']:v for v in inventory['modules']}
for item in old['modules']:assert current[item['source']]==item
assert len(current['LupineFinitePlanning.lean']['theorems'])==13
assert sha((R/'formal/history/pre-finite-planning-AXIOMS.txt').read_bytes())==baseline['source_files']['formal/AXIOMS.txt']['sha256']
record(run/'result.json',{'status':'PASS_STRICT_BUILD_FRESH_AXIOM_AUDIT_AND_PARSER_TESTS','theorems':143,'modules':11,
    'prior_theorems':130,'added_theorems':13,'old_modules_unchanged':10,'runtime_files_unchanged':345,
    'source_held':held,'inventory_sha256':sha((R/'formal/theorem-inventory.json').read_bytes()),
    'axiom_output_sha256':sha((R/'formal/AXIOMS.txt').read_bytes()),'commands':receipts,
    'python_refinement':False,'scientific_admission':False})
print('PASS: 143 theorem audits in 11 modules; 345 runtime files unchanged.',flush=True)
