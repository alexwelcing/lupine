from pathlib import Path
from datetime import datetime,timezone
import argparse,hashlib,json,subprocess,sys,time
BASE=Path(__file__).resolve().parent;ROOT=BASE.parents[1]
p=argparse.ArgumentParser();p.add_argument('--label',required=True);args=p.parse_args()
assert args.label.isidentifier()
out=BASE/'receipts'/args.label;out.mkdir(parents=True,exist_ok=False)
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
manifest=json.loads((ROOT/'reports/runtime-manifest.json').read_text())['files']
before={name:digest(ROOT/name) for name in manifest};assert before==manifest
own=[BASE/'promotion/scripts/li_v3_growth_envelope.py',BASE/'promotion/tests/test_li_v3_growth_envelope.py',BASE/'promotion/docs/li-v3-growth-envelope-plan.md',BASE/'author_bootstrap.py']
held={str(p.relative_to(ROOT)):digest(p) for p in own}
for path in own:(out/path.name).write_bytes(path.read_bytes())
command=[sys.executable,str(BASE/'author_bootstrap.py')]
record={'command':command,'started_at':datetime.now(timezone.utc).isoformat(),'source_before':held,'runtime_before':before,'scope':'Author synthetic fixtures; guard forbids private custody, production entries, sockets and subprocesses inside test process.'}
(out/'start.json').write_text(json.dumps(record,indent=2,sort_keys=True)+'\n')
tick=time.monotonic()
with (out/'stdout.txt').open('xb') as stdout,(out/'stderr.txt').open('xb') as stderr:
 try:
  r=subprocess.run(command,cwd=ROOT,stdout=stdout,stderr=stderr,timeout=120,env={**__import__('os').environ,'PYTHONDONTWRITEBYTECODE':'1'})
  code=r.returncode;record['timed_out']=False
 except subprocess.TimeoutExpired:
  code=124;record['timed_out']=True
record.update(finished_at=datetime.now(timezone.utc).isoformat(),elapsed_seconds=time.monotonic()-tick,exit_code=code,runtime_after={name:digest(ROOT/name) for name in before},source_after={relative:digest(ROOT/relative) for relative in held})
record['runtime_unchanged']=record['runtime_before']==record['runtime_after'];record['source_unchanged']=record['source_before']==record['source_after']
for kind in ('stdout','stderr'):record[kind+'_sha256']=digest(out/(kind+'.txt'))
(out/'execution.json').write_text(json.dumps(record,indent=2,sort_keys=True)+'\n')
print(json.dumps({k:v for k,v in record.items() if k not in {'runtime_before','runtime_after','source_before','source_after'}},indent=2,sort_keys=True))
raise SystemExit(code if code else (0 if record['runtime_unchanged'] and record['source_unchanged'] else 1))
