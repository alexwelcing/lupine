"""Preserve each independent suite invocation; never retry automatically."""
from pathlib import Path
from datetime import datetime,timezone
import argparse
import hashlib
import json
import os
import subprocess
import sys
import time

OWN=Path(__file__).absolute().parent
ROOT=OWN.parent.parent
parser=argparse.ArgumentParser()
parser.add_argument('--candidate',required=True)
parser.add_argument('--candidate-sha256',required=True)
parser.add_argument('--run-name',required=True)
a=parser.parse_args()
assert a.run_name.replace('-','').isalnum()
candidate=Path(a.candidate).absolute()
assert candidate.parent==ROOT/'.cache/phase2-li-complete-readiness-candidate-v1'
assert candidate.name=='li_v3_readiness.py'
def sha(raw):return hashlib.sha256(raw).hexdigest()
def runtime(*, strict):
    manifest=json.loads((ROOT/'reports/runtime-manifest.json').read_text())
    files=manifest['files'];assert len(files)==335
    current={path:sha((ROOT/path).read_bytes()) if (ROOT/path).is_file() else None for path in files}
    if strict:assert current==files
    return current
before=runtime(strict=True)
assert sha(candidate.read_bytes())==a.candidate_sha256
run=OWN/a.run_name;run.mkdir()
held={}
for path in [candidate,OWN/'test_li_v3_readiness_review.py',OWN/'generated_package.py',OWN/'generated_cases.py',
             OWN/'generated_replay.py',OWN/'guarded_child.py',Path(__file__)]:
    raw=path.read_bytes();held[str(path)]=sha(raw);(run/path.name).write_bytes(raw)
start=datetime.now(timezone.utc).isoformat();tick=time.monotonic()
command=[sys.executable,'-B',str(OWN/'guarded_child.py')]
env=dict(os.environ,PYTHONDONTWRITEBYTECODE='1',LI_READINESS_CANDIDATE=str(candidate),LI_READINESS_SHA256=a.candidate_sha256)
process_error=None;result=None
with (run/'stdout.log').open('xb') as stdout,(run/'stderr.log').open('xb') as stderr:
    try:result=subprocess.run(command,cwd=OWN,env=env,stdout=stdout,stderr=stderr,timeout=120)
    except (subprocess.TimeoutExpired,OSError) as error:process_error=type(error).__name__
exit_code=result.returncode if result is not None else None
elapsed=time.monotonic()-tick
post={path:sha(Path(path).read_bytes()) if Path(path).is_file() else None for path in held}
after=runtime(strict=False)
receipt={'schema':'li.readiness.independent-generated-execution.v1','started':start,
 'finished':datetime.now(timezone.utc).isoformat(),'elapsed_seconds':elapsed,'command':command,
 'exit_code':exit_code,'process_error':process_error,'held_files_before':held,'held_files_after':post,
 'held_files_unchanged':held==post,'runtime_files':len(before),'runtime_before':before,'runtime_after':after,
 'runtime_unchanged':before==after,'logs':{name:{'bytes':(run/name).stat().st_size,'sha256':sha((run/name).read_bytes())} for name in ('stdout.log','stderr.log')},
 'scope':'Generated-only suite; no actual/private archive, production operation, network or scientific evaluation.'}
(run/'execution.json').write_text(json.dumps(receipt,indent=2,sort_keys=True)+'\n')
print(json.dumps({'exit_code':exit_code,'process_error':process_error,'elapsed_seconds':elapsed,'runtime_files':len(before),'held':held==post and before==after,'receipt_sha256':sha((run/'execution.json').read_bytes())}))
sys.exit(exit_code if exit_code is not None and held==post and before==after else 2)
