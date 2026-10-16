"""One direct offline compile of held candidate; no lake/dependency commands."""
from pathlib import Path
import datetime
import hashlib
import json
import os
import re
import subprocess
import time
ROOT=Path(__file__).absolute().parents[2]
HERE=Path(__file__).absolute().parent
CANDIDATE=ROOT/'.cache/phase2-finite-planning-formal-candidate-v1'
EXPECTED='391b03aefda0f7bac5bd380347b81febc8a4ebbd329ae3a099981784803973bd'
sha=lambda raw:hashlib.sha256(raw).hexdigest()
source=CANDIDATE/'LupineFinitePlanning.lean';raw=source.read_bytes();assert sha(raw)==EXPECTED
out=HERE/'first-compile';out.mkdir()
copy=out/'LupineFinitePlanning.lean';copy.write_bytes(raw)
prior=json.loads((CANDIDATE/'attempts/ceiling-bridge/execution.json').read_bytes())
lean=Path(prior['command'][0]);assert sha(lean.read_bytes())==prior['lean_executable_sha256']
paths=[Path(p) for p in prior['lean_path']];assert paths and all(p.is_dir() for p in paths)
scope=json.loads((CANDIDATE/'scope.json').read_bytes())
assert all(sha((ROOT/name).read_bytes())==digest for name,digest in scope['files'].items())
for attempt in ['first','ceiling-bridge']:
 d=CANDIDATE/'attempts'/attempt;r=json.loads((d/'execution.json').read_bytes())
 assert r['exit_code']==0 and r['timed_out'] is False and r['source_held'] is True
 assert sha((d/'LupineFinitePlanning.lean').read_bytes())==r['source_sha256_before']==r['source_sha256_after']
 assert sha((d/'stdout.txt').read_bytes())==r['stdout_sha256'] and sha((d/'stderr.txt').read_bytes())==r['stderr_sha256']
 assert sha((d/'LupineFinitePlanning.olean').read_bytes())==r['compiled_object_sha256']
env=dict(os.environ);env['LEAN_PATH']=':'.join(str(p) for p in paths);env['LEAN_NUM_THREADS']='1'
command=[str(lean),'-DwarningAsError=true','-o',str(out/'LupineFinitePlanning.olean'),str(copy)]
started=datetime.datetime.now(datetime.timezone.utc).isoformat();tick=time.monotonic();timed_out=False
try:
 result=subprocess.run(command,cwd=out,env=env,capture_output=True,timeout=120)
 code,stdout,stderr=result.returncode,result.stdout,result.stderr
except subprocess.TimeoutExpired as exc:
 timed_out=True;code=None;stdout=exc.stdout or b'';stderr=exc.stderr or b''
(out/'stdout.txt').write_bytes(stdout);(out/'stderr.txt').write_bytes(stderr)
pattern=r"'([^']+)' depends on axioms: \[([^\]]*)\]"
axioms={name:sorted(a.strip() for a in values.split(',') if a.strip()) for name,values in re.findall(pattern,stdout.decode())}
expected_names={'LupineFinitePlanning.'+name for name in re.findall(r'^theorem\s+(\w+)',raw.decode(),re.M)}
source_held=sha(source.read_bytes())==EXPECTED and copy.read_bytes()==raw
unchanged={name:sha((ROOT/name).read_bytes())==digest for name,digest in scope['files'].items()}
record={'command':command,'cwd':str(out),'started_at':started,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsed_seconds':time.monotonic()-tick,'exit_code':code,'timed_out':timed_out,'source_sha256':EXPECTED,'source_and_copy_held':source_held,'scope_files_unchanged':unchanged,'lean_executable_sha256':sha(lean.read_bytes()),'lean_path':[str(p) for p in paths],'stdout_sha256':sha(stdout),'stderr_sha256':sha(stderr),'compiled_object_sha256':sha((out/'LupineFinitePlanning.olean').read_bytes()) if (out/'LupineFinitePlanning.olean').exists() else None,'axioms':axioms,'exact13_declaration_output_coverage':len(expected_names)==13 and set(axioms)==expected_names and len(re.findall(pattern,stdout.decode()))==13,'only_standard_logical_axioms':all(set(a)<= {'propext','Classical.choice','Quot.sound'} for a in axioms.values()),'author_attempt_receipts_and_object_bytes_reconciled':True,'network_or_dependency_build':False,'tracked_edits':False,'python_runtime_executed':False,'scientific_admission':False}
(out/'execution.json').write_text(json.dumps(record,indent=2,sort_keys=True)+'\n')
print(json.dumps({k:v for k,v in record.items() if k not in ['axioms','scope_files_unchanged','lean_path']},indent=2))
assert code==0 and not timed_out and source_held and all(unchanged.values()) and record['exact13_declaration_output_coverage'] and record['only_standard_logical_axioms']
