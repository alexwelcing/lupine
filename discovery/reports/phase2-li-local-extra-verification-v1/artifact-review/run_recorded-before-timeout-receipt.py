"""Run only read-only artifact auditors after root supplies the final source/package."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import time

BASE=Path(__file__).resolve().parent
ROOT=BASE.parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--commit',required=True)
parser.add_argument('--retained-directory',required=True)
args=parser.parse_args()
assert len(args.commit)==40 and all(c in '0123456789abcdef' for c in args.commit)
assert args.commit!='b42bd9a94385ad43c3c2ac022584dae6bd135254','Root excludes the superseded reporting-error checkpoint'
assert hashlib.sha256((BASE/'audit.py').read_bytes()).hexdigest()=='b81293cba3632449830932175e9fa938913650ade05f5e524b258aba78923119'
assert hashlib.sha256((BASE/'additive_audit.py').read_bytes()).hexdigest()=='6b267cd11a73b0f73c63a7b9ae2ba75d30f9699edf14e41c5fd1f98f4932ce2a'
pins=BASE/'reviewed-pins.json'
assert json.loads(pins.read_text())['status']=='FINAL_REVIEWED_SOURCE_PINS'
run_directory=BASE/('execution-'+args.commit[:12])
run_directory.mkdir(exist_ok=False)
full_output=BASE/('actual-'+args.commit[:12])
additive_output=BASE/('additive-'+args.commit[:12])
commands=[
 [sys.executable,str(BASE/'audit.py'),'--commit',args.commit,'--retained-directory',args.retained_directory,'--output-directory',str(full_output)],
 [sys.executable,str(BASE/'additive_audit.py'),'--commit',args.commit,'--retained-directory',args.retained_directory,'--full-review',str(full_output/'review.json'),'--reviewed-pins',str(pins),'--output-directory',str(additive_output)],
]
for index,command in enumerate(commands):
 record={'command':command,'commit':args.commit,'started_at':datetime.now(timezone.utc).isoformat(),'script_sha256':hashlib.sha256(Path(command[1]).read_bytes()).hexdigest(),'reviewed_pins_sha256':hashlib.sha256(pins.read_bytes()).hexdigest(),'scope':'Read-only retained artifact/source audit; no package test, production diagnostic or network command.'}
 with (run_directory/f'{index}-start.json').open('x') as out:json.dump(record,out,indent=2,sort_keys=True);out.write('\n')
 tick=time.monotonic()
 with (run_directory/f'{index}-stdout.txt').open('xb') as out,(run_directory/f'{index}-stderr.txt').open('xb') as err:
  completed=subprocess.run(command,cwd=ROOT,stdout=out,stderr=err,timeout=180)
 record.update(finished_at=datetime.now(timezone.utc).isoformat(),elapsed_seconds=time.monotonic()-tick,exit_code=completed.returncode)
 for kind in ('stdout','stderr'):record[kind+'_sha256']=hashlib.sha256((run_directory/f'{index}-{kind}.txt').read_bytes()).hexdigest()
 with (run_directory/f'{index}-execution.json').open('x') as out:json.dump(record,out,indent=2,sort_keys=True);out.write('\n')
 print(json.dumps(record,sort_keys=True),flush=True)
 if completed.returncode:raise SystemExit(completed.returncode)
print(json.dumps({'status':'BOTH_READ_ONLY_AUDIT_PROCESSES_EXITED_ZERO','commit':args.commit,'full_review':str(full_output/'review.json'),'additive_review':str(additive_output/'additive-review.json'),'source_reader_invoked':False},sort_keys=True))
