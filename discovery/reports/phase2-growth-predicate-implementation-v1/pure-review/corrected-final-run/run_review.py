"""Record one generated-only independent invocation; preserve exclusive run slots."""
from pathlib import Path
import datetime
import hashlib
import json
import os
import subprocess
import sys
import time

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
CANDIDATE=ROOT/'.cache/phase2-growth-predicate-candidate-v1/growth_predicate_audit.py'
CONTRACT=CANDIDATE.parent/'README.md'
def bind(p):
    b=p.read_bytes();return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def main():
    if len(sys.argv)!=3:raise SystemExit('usage: run_review.py RUN_NAME EXPECTED_SHA256')
    run=HERE/sys.argv[1];run.mkdir(exist_ok=False)
    files={'candidate.py':CANDIDATE,'contract.md':CONTRACT,
           'test_growth_predicate_review.py':HERE/'test_growth_predicate_review.py',
           'generated_zip.py':HERE/'generated_zip.py','run_review.py':Path(__file__)}
    before={k:bind(p) for k,p in files.items()}
    if before['candidate.py']['sha256']!=sys.argv[2]:raise SystemExit('held source mismatch')
    for name,p in files.items():(run/name).write_bytes(p.read_bytes())
    source_paths=['scripts/li_v3_growth_envelope.py','scripts/li_v3_custody.py',
                  'scripts/li_v3_growth_hint_shape.py','scripts/li_v3_local_extra_headers.py',
                  'scripts/li_v3_compatible_envelope.py','scripts/li_v3_compatible_zip_diagnostic.py']
    old_sources={p:bind(ROOT/p) for p in source_paths}
    cmd=[sys.executable,'-B',str(HERE/'test_growth_predicate_review.py')]
    start={'started_at':now(),'command':cmd,'input_bindings':before,'original_sources':old_sources,
           'actual_source_operations':0,'scope':'generated fixtures only; no production invocation'}
    (run/'start.json').write_text(json.dumps(start,indent=2,sort_keys=True)+'\n')
    env=dict(os.environ,PREDICATE_CANDIDATE=str(CANDIDATE),PYTHONDONTWRITEBYTECODE='1')
    t=time.monotonic();timed_out=False
    try:
        done=subprocess.run(cmd,cwd=ROOT,env=env,capture_output=True,timeout=90)
        out,err,code=done.stdout,done.stderr,done.returncode
    except subprocess.TimeoutExpired as exc:
        timed_out=True;out=exc.stdout or b'';err=exc.stderr or b'';code=None
    elapsed=time.monotonic()-t
    (run/'stdout.txt').write_bytes(out);(run/'stderr.txt').write_bytes(err)
    after={k:bind(p) for k,p in files.items()}
    old_after={p:bind(ROOT/p) for p in source_paths}
    record={**start,'finished_at':now(),'elapsed_seconds':elapsed,'returncode':code,
            'timed_out':timed_out,'stdout':bind(run/'stdout.txt'),'stderr':bind(run/'stderr.txt'),
            'inputs_held':before==after,'original_sources_held':old_sources==old_after,
            'after':after,'original_sources_after':old_after}
    (run/'execution.json').write_text(json.dumps(record,indent=2,sort_keys=True)+'\n')
    print(json.dumps({'run':str(run.relative_to(ROOT)),'returncode':code,'elapsed_seconds':elapsed,
                     'inputs_held':before==after,'original_sources_held':old_sources==old_after}))
    print(err.decode('utf-8','replace'))
    return 0 if code==0 and before==after and old_sources==old_after else 1
if __name__=='__main__':raise SystemExit(main())
