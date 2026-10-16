from pathlib import Path
from datetime import datetime, timezone
from hashlib import sha256
import json, subprocess, sys, time
base=Path(__file__).resolve().parent
root=base.parents[1]
script=base/'audit_completed_operations.py'
command=[sys.executable,str(script),'--notebook-directory','.cache/phase2-next-source-operations-v1/run-a6e87c198d8116d26c523e0e1b2eedce4aeb225b-20261016T085019156373Z','--artifact-review','.cache/phase2-notebook-header-artifact-review-v1/actual-a6e87c/review.json']
record={'command':command,'started_at':datetime.now(timezone.utc).isoformat(),'audit_script_sha256':sha256(script.read_bytes()).hexdigest(),'reader_invocation':False}
with (base/'audit-start.json').open('x') as out: json.dump(record,out,indent=2,sort_keys=True); out.write('\n')
t0=time.monotonic()
with (base/'audit-stdout.txt').open('xb') as out,(base/'audit-stderr.txt').open('xb') as err:
 run=subprocess.run(command,cwd=root,stdout=out,stderr=err,timeout=120)
record.update(finished_at=datetime.now(timezone.utc).isoformat(),elapsed_seconds=time.monotonic()-t0,exit_code=run.returncode)
for kind in ('stdout','stderr'):
 record[kind+'_sha256']=sha256((base/('audit-'+kind+'.txt')).read_bytes()).hexdigest()
with (base/'audit-execution.json').open('x') as out: json.dump(record,out,indent=2,sort_keys=True); out.write('\n')
print(json.dumps(record,indent=2,sort_keys=True))
sys.exit(run.returncode)
