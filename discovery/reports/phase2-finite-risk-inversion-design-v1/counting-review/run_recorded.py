from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
import json, subprocess, sys, time
base=Path(__file__).resolve().parent
root=base.parents[1]
script=base/'audit.py'
design=root/'.cache/phase2-finite-risk-inversion-design-v1/README.md'
def digest(path): return sha256(path.read_bytes()).hexdigest()
def snapshot():
    return {'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),
            'tracked_status':subprocess.check_output(['git','status','--porcelain','--untracked-files=no'],cwd=root,text=True)}
start=datetime.now(timezone.utc).isoformat()
before=snapshot()
record={'command':[sys.executable,str(script)],'cwd':str(root),'start':start,'script_sha256':digest(script),'design_sha256':digest(design),'before':before,'network_used':False,'product_runtime_imported':False}
with (base/'start.json').open('x') as h: json.dump(record,h,indent=2,sort_keys=True); h.write('\n')
t0=time.monotonic()
with (base/'stdout.txt').open('xb') as out, (base/'stderr.txt').open('xb') as err:
    run=subprocess.run(record['command'],cwd=root,stdout=out,stderr=err,timeout=180)
record.update({'end':datetime.now(timezone.utc).isoformat(),'elapsed_seconds':time.monotonic()-t0,'exit_code':run.returncode,'after':snapshot(),'stdout_sha256':digest(base/'stdout.txt'),'stderr_sha256':digest(base/'stderr.txt'),'script_sha256_after':digest(script),'design_sha256_after':digest(design)})
with (base/'execution.json').open('x') as h: json.dump(record,h,indent=2,sort_keys=True); h.write('\n')
print(json.dumps(record,indent=2,sort_keys=True))
sys.exit(run.returncode)
