"""One reviewed 36-object stored-label inspection; no retry or value evaluation."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
CANDIDATE=ROOT/'.cache/phase2-rhizo-recorded-label-candidate-v1'
HEAD='9766b6838388c35a92d32b1a60e65613c72b3fee'
SOURCE='13f1f4ee41947eff4b47faaa0a3463af96363fbc8c09d6a9d398d76d78f9d647'
REVIEW='356e8c4ad77d12edcf072ac278db997e286e6144be9163e4ed49ad066754745b'

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def write(path,value):
    with path.open('xb') as f:
        f.write((json.dumps(value,sort_keys=True,indent=2)+'\n').encode())

def state():
    assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()==HEAD
    assert subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip()=='research/lupine-discovery'
    assert not subprocess.check_output(['git','status','--porcelain'],cwd=ROOT)
    expected=json.loads((ROOT/'reports/runtime-manifest.json').read_bytes())['files']
    observed={p:sha((ROOT/p).read_bytes()) for p in expected}
    assert observed==expected and len(observed)==332
    assert sha((CANDIDATE/'recorded_labels.py').read_bytes())==SOURCE
    assert sha((ROOT/'.cache/phase2-rhizo-recorded-label-review-v1/review.json').read_bytes())==REVIEW
    return {'head':HEAD,'runtime_files':observed,'source_sha256':SOURCE,'review_sha256':REVIEW}

if __name__=='__main__':
    manifest=CANDIDATE/'reviewed-invocation.json'
    manifest_sha=sha(manifest.read_bytes())
    slot=HERE/'actual-execution'
    slot.mkdir(exist_ok=False)
    before=state()
    command=[sys.executable,'-B','-c',
        "import hashlib,sys,types; from pathlib import Path; "
        "p=Path(sys.argv[1]); raw=p.read_bytes(); "
        "assert hashlib.sha256(raw).hexdigest()==sys.argv[5]; "
        "m=types.ModuleType('held_recorded_label_reader'); m.__file__=str(p); "
        "exec(compile(raw,str(p),'exec'),m.__dict__); "
        "r=m.run_retained(Path(sys.argv[2]),Path(sys.argv[3]),sys.argv[4]); "
        "sys.stdout.buffer.write(m.canonical(r)); "
        "sys.exit(0 if r['status']=='RECORDED_LABEL_INSPECTION_COMPLETE' else 2)",
        str(CANDIDATE/'recorded_labels.py'),str(ROOT),str(manifest),manifest_sha,SOURCE]
    start=now()
    write(slot/'start.json',{'started_at':start,'command':command,'before':before,
        'manifest_sha256':manifest_sha,'recorder_sha256':sha(Path(__file__).read_bytes()),
        'source_loading':'Direct compilation of hash-verified bytes; no candidate bytecode cache.'})
    tick=time.monotonic();timed_out=False
    with (slot/'stdout.json').open('xb') as out,(slot/'stderr.txt').open('xb') as err:
        try:
            result=subprocess.run(command,cwd=ROOT,stdout=out,stderr=err,timeout=60,check=False,
                env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1'})
            code=result.returncode
        except subprocess.TimeoutExpired:
            timed_out,code=True,None
    elapsed=time.monotonic()-tick
    after=state()
    raw=(slot/'stdout.json').read_bytes()
    receipt={'started_at':start,'finished_at':now(),'process_seconds':elapsed,'exit_code':code,
        'timed_out':timed_out,'source_and_runtime_held':after==before,
        'stdout_bytes':len(raw),'stdout_sha256':sha(raw),'stderr_bytes':(slot/'stderr.txt').stat().st_size,
        'stderr_sha256':sha((slot/'stderr.txt').read_bytes()),'actual_source_operations':1,
        'automatic_retry':False,'performance_computation_requested':False}
    write(slot/'execution.json',receipt)
    print(json.dumps(receipt,sort_keys=True))
    sys.exit(code if code is not None else 124)
