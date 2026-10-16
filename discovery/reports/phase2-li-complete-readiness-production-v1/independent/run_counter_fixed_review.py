"""Run focused counter repair checks on expressly held generated inputs."""
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
assert candidate.parent==ROOT/'.cache/phase2-li-complete-readiness-production-v1'
assert candidate.name=='li_v3_readiness_production.py'
def sha(raw):return hashlib.sha256(raw).hexdigest()
def runtime(strict):
    files=json.loads((ROOT/'reports/runtime-manifest.json').read_text())['files']
    assert len(files)==339
    current={p:sha((ROOT/p).read_bytes()) if (ROOT/p).is_file() else None for p in files}
    if strict:assert current==files
    return current
before=runtime(True)
assert sha(candidate.read_bytes())==a.candidate_sha256
run=OWN/a.run_name;run.mkdir()
held={}
for path in [candidate,candidate.parent/'li_v3_readiness.py',OWN/'test_li_v3_readiness_production_review_final.py',
             OWN/'generated_package.py',OWN/'generated_replay.py',OWN/'guarded_counter_fixed_child.py',Path(__file__)]:
    raw=path.read_bytes();held[str(path)]=sha(raw);(run/path.name).write_bytes(raw)
start=datetime.now(timezone.utc).isoformat();tick=time.monotonic()
command=[sys.executable,'-B',str(OWN/'guarded_counter_fixed_child.py')]
env=dict(os.environ,PYTHONDONTWRITEBYTECODE='1',PYTHONPYCACHEPREFIX=str(OWN/'isolated-python-cache'),LI_READINESS_PRODUCTION_CANDIDATE=str(candidate),
    LI_READINESS_PRODUCTION_SHA256=a.candidate_sha256,GIT_CONFIG_NOSYSTEM='1',GIT_CONFIG_GLOBAL='/dev/null',GIT_TERMINAL_PROMPT='0')
(run/'start.json').write_text(json.dumps({'started':start,'held':held,'runtime':before},indent=2,sort_keys=True)+'\n')
process_error=None;result=None
with (run/'stdout.log').open('xb') as stdout,(run/'stderr.log').open('xb') as stderr:
    try:result=subprocess.run(command,cwd=OWN,env=env,stdout=stdout,stderr=stderr,timeout=180)
    except (subprocess.TimeoutExpired,OSError) as error:process_error=type(error).__name__
exit_code=result.returncode if result is not None else None
elapsed=time.monotonic()-tick
post={p:sha(Path(p).read_bytes()) if Path(p).is_file() else None for p in held}
after=runtime(False)
receipt={'schema':'li.readiness.independent-generated-production-execution.v1','started':start,
 'finished':datetime.now(timezone.utc).isoformat(),'elapsed_seconds':elapsed,'command':command,
 'exit_code':exit_code,'process_error':process_error,'held_files_before':held,'held_files_after':post,
 'held_files_unchanged':held==post,'runtime_files':len(before),'runtime_before':before,'runtime_after':after,
 'runtime_unchanged':before==after,'logs':{n:{'bytes':(run/n).stat().st_size,'sha256':sha((run/n).read_bytes())} for n in ('stdout.log','stderr.log')},
 'selected_existing_methods':['test_22_inventory_scope_full_accounting_and_detached_pin_metadata', 'test_27_whole_shared_table_exposure_with_unrelated_text_withheld', 'test_29_frame_reconstructs_strict_mapping_before_record_read_and_keeps_all_rows', 'test_33_outer_frame_requires_both_inventory_receipts_and_committed_binding_pin', 'test_51_completed_historical_counter_relations_reject_resealed_contradictions'],
 'scope':'Focused counter repair and dependent success paths. Invented Git repositories, objects and ZIP/XML only. Parent G34 custody identity is mocked; adapter guard uses generated baseline. No actual/private archive, real production guard, network or scientific evaluation.'}
(run/'execution.json').write_text(json.dumps(receipt,indent=2,sort_keys=True)+'\n')
print(json.dumps({'exit_code':exit_code,'process_error':process_error,'elapsed_seconds':elapsed,'runtime_files':len(before),'held':held==post and before==after,'receipt_sha256':sha((run/'execution.json').read_bytes())}))
sys.exit(exit_code if exit_code is not None and held==post and before==after else 2)
