from pathlib import Path
from datetime import datetime,timezone
from hashlib import sha256
import json,subprocess,sys,time
base=Path(__file__).resolve().parent
script=base/'challenge_recorder.py'
command=[sys.executable,str(script)]
record={'command':command,'started_at':datetime.now(timezone.utc).isoformat(),'test_code_sha256':sha256(script.read_bytes()).hexdigest(),'scope':'Synthetic extracted-recorder challenge only; this wrapper starts the test harness, not the source reader.'}
with (base/'synthetic-start.json').open('x') as out:json.dump(record,out,indent=2,sort_keys=True);out.write('\n')
tick=time.monotonic()
with (base/'synthetic-stdout.txt').open('xb') as out,(base/'synthetic-stderr.txt').open('xb') as err:run=subprocess.run(command,stdout=out,stderr=err,timeout=60)
record.update(finished_at=datetime.now(timezone.utc).isoformat(),elapsed_seconds=time.monotonic()-tick,exit_code=run.returncode)
for name in ('stdout','stderr'):record[name+'_sha256']=sha256((base/('synthetic-'+name+'.txt')).read_bytes()).hexdigest()
with (base/'synthetic-execution.json').open('x') as out:json.dump(record,out,indent=2,sort_keys=True);out.write('\n')
print(json.dumps(record,indent=2,sort_keys=True));sys.exit(run.returncode)
