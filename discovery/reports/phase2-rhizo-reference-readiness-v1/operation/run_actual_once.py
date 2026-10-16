"""Root recorder for one reviewed retained-reference operation. No automatic retry."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
HEAD = '3139e1ea7bdf4b78e3e70502f2c299ba3c1efea3'
SOURCE = 'bab641881335f57d4571fe0d4f720696f57e5816fa36266647cdf86d0701b263'

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def write(path, value):
    with path.open('xb') as f:
        f.write((json.dumps(value, sort_keys=True, indent=2) + '\n').encode())

def state():
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    assert head == HEAD
    assert subprocess.check_output(['git', 'branch', '--show-current'], cwd=ROOT, text=True).strip() == 'research/lupine-discovery'
    assert not subprocess.check_output(['git', 'status', '--porcelain'], cwd=ROOT)
    expected = json.loads((ROOT/'reports/runtime-manifest.json').read_bytes())['files']
    observed = {p:sha((ROOT/p).read_bytes()) for p in expected}
    assert observed == expected and len(observed) == 332
    assert sha((HERE/'reference_projector.py').read_bytes()) == SOURCE
    return {'head':head,'runtime_files':observed,'source_sha256':SOURCE}

if __name__ == '__main__':
    manifest = HERE/'reviewed-invocation.json'
    manifest_sha = sha(manifest.read_bytes())
    slot = HERE/'actual-execution'
    slot.mkdir(exist_ok=False)
    before = state()
    command = [sys.executable, '-B', '-c',
        "import importlib.util,sys; from pathlib import Path; "
        "p=Path(sys.argv[1]); s=importlib.util.spec_from_file_location('reviewed_rhizo_projector',p); "
        "m=importlib.util.module_from_spec(s); s.loader.exec_module(m); "
        "r=m.run_retained(Path(sys.argv[2]),Path(sys.argv[3]),sys.argv[4]); "
        "sys.stdout.buffer.write(m.canonical(r)); "
        "sys.exit(0 if r['status']=='PROJECTED_DOCUMENTARY_ONLY' else 2)",
        str(HERE/'reference_projector.py'),str(ROOT),str(manifest),manifest_sha]
    start = now()
    write(slot/'start.json',{'started_at':start,'command':command,'manifest_sha256':manifest_sha,
        'recorder_sha256':sha(Path(__file__).read_bytes()),'before':before,
        'review_sha256':sha((ROOT/'.cache/phase2-rhizo-reference-projector-review-v1/review.json').read_bytes())})
    tick = time.monotonic()
    timed_out = False
    with (slot/'stdout.json').open('xb') as out, (slot/'stderr.txt').open('xb') as err:
        try:
            result = subprocess.run(command,cwd=ROOT,stdout=out,stderr=err,timeout=60,check=False,
                env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1'})
            code = result.returncode
        except subprocess.TimeoutExpired:
            timed_out, code = True, None
    elapsed = time.monotonic()-tick
    after = state()
    raw = (slot/'stdout.json').read_bytes()
    write(slot/'execution.json',{'started_at':start,'finished_at':now(),'process_seconds':elapsed,
        'exit_code':code,'timed_out':timed_out,'source_and_runtime_held':after==before,
        'stdout_bytes':len(raw),'stdout_sha256':sha(raw),
        'stderr_bytes':(slot/'stderr.txt').stat().st_size,
        'stderr_sha256':sha((slot/'stderr.txt').read_bytes()),
        'actual_source_operation_count':1,'automatic_retry':False})
    print(json.dumps({'exit_code':code,'process_seconds':elapsed,'stdout_sha256':sha(raw),
        'source_and_runtime_held':after==before},sort_keys=True))
    sys.exit(code if code is not None else 124)
