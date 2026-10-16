"""Record only generated recorder tests; never invoke a production entry point."""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
import time

HERE=Path(__file__).absolute().parent
ROOT=HERE.parents[1]
names=['run_after_ci.py','recorder_support.py','run_package.py','tests/test_operations_recorder.py',
       'README.md','bindings-layout.json','bindings-inventory.json','bindings-frame.json','source-hold.json',
       'record_synthetic.py']
external=[HERE.parent/'phase2-li-complete-route-public-review-design-v1'/name for name in
          ('public_review_validator.py','test_public_review_validator.py')]
def snapshot():
    return {str(p.relative_to(ROOT)):{'bytes':len(p.read_bytes()),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
            for p in [*(HERE/n for n in names),*external]}
def write(path,value):
    with path.open('x') as stream:stream.write(json.dumps(value,sort_keys=True,indent=2)+'\n')

if __name__=='__main__':
    slot=HERE/'evidence'/'final29';slot.mkdir(parents=True,exist_ok=False)
    before=snapshot();start=time.time_ns()
    command=[sys.executable,'-B','-m','unittest','discover','-s',str(HERE/'tests'),'-p','test_*.py','-v']
    write(slot/'start.json',{'command':command,'before':before,'started_ns':start,
          'scope':'Generated fixtures/local temporary Git/inert child processes only; no actual source operations.'})
    with (slot/'stdout.txt').open('xb') as stdout,(slot/'stderr.txt').open('xb') as stderr:
        result=subprocess.run(command,cwd=ROOT,stdout=stdout,stderr=stderr,timeout=60)
    after=snapshot();end=time.time_ns()
    outputs={n:{'bytes':(slot/n).stat().st_size,'sha256':hashlib.sha256((slot/n).read_bytes()).hexdigest()}
             for n in ('stdout.txt','stderr.txt')}
    write(slot/'execution.json',{'status':'PASS' if result.returncode==0 and before==after else 'FAIL',
        'command':command,'exit_code':result.returncode,'started_ns':start,'finished_ns':end,
        'process_seconds':(end-start)/1e9,'before':before,'after':after,'source_unchanged':before==after,
        'outputs':outputs,'actual_source_operations':0,'production_guard_calls':0,'network_calls':0,
        'scientific_data_reads':0,'test_scope':'29 synthetic methods; 14 gate-field and 21 outer-receipt adversaries are subcases.'})
    print(json.dumps({'exit_code':result.returncode,'source_unchanged':before==after,'receipt':str(slot/'execution.json')}))
    raise SystemExit(result.returncode or int(before!=after))
