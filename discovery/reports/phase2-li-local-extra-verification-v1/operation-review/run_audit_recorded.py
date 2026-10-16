"""Record one independent public-receipt audit; no production invocation."""
from pathlib import Path
from datetime import datetime, timezone
from hashlib import sha256
import json, subprocess, sys, time
base=Path(__file__).resolve().parent
root=base.parents[1]
script=base/'audit_completed_operations.py'
assert sha256(script.read_bytes()).hexdigest()=='c91920a7d9e992b7c4acdd47fca7ac151282d4190b429977ae01ef7caee700cb'
command=[sys.executable,str(script),'--artifact-review','.cache/phase2-local-extra-artifact-review-v1/actual-d0505b9b358a/review.json','--additive-review','.cache/phase2-local-extra-artifact-review-v1/additive-d0505b9b358a/additive-review.json']
record={'command':command,'started_at':datetime.now(timezone.utc).isoformat(),'audit_script_sha256':sha256(script.read_bytes()).hexdigest(),'wrapper_sha256':sha256(Path(__file__).read_bytes()).hexdigest(),'reader_invocation':False}
with (base/'audit-start.json').open('x') as out: json.dump(record,out,indent=2,sort_keys=True); out.write('\n')
t0=time.monotonic()
with (base/'audit-stdout.txt').open('xb') as out,(base/'audit-stderr.txt').open('xb') as err:
 try:
  run=subprocess.run(command,cwd=root,stdout=out,stderr=err,timeout=120)
  code=run.returncode
  record.update(timed_out=False,launch_error=None)
 except subprocess.TimeoutExpired:
  code=124
  record.update(timed_out=True,launch_error=None,timeout_seconds=120)
 except OSError as exc:
  code=127
  record.update(timed_out=False,launch_error=type(exc).__name__,launch_errno=exc.errno)
record.update(finished_at=datetime.now(timezone.utc).isoformat(),elapsed_seconds=time.monotonic()-t0,exit_code=code)
for kind in ('stdout','stderr'):
 record[kind+'_sha256']=sha256((base/('audit-'+kind+'.txt')).read_bytes()).hexdigest()
with (base/'audit-execution.json').open('x') as out: json.dump(record,out,indent=2,sort_keys=True); out.write('\n')
print(json.dumps(record,indent=2,sort_keys=True))
sys.exit(code)
