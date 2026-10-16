"""Execute the isolated extracted-helper review only, retaining first evidence."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, subprocess, sys, time
BASE=Path(__file__).resolve().parent
ROOT=BASE.parents[1]
RUN=BASE/'first-run'
RUN.mkdir()
paths=[BASE/'test_first_gate.py', ROOT/'.cache/phase2-growth-envelope-operations-v1/run_after_ci.py', ROOT/'.cache/phase2-growth-hint-production-candidate-v1/promotion/scripts/li_v3_growth_hint_shape.py',ROOT/'.cache/phase2-growth-hint-production-candidate-v1/promotion/tests/test_li_v3_growth_hint_shape.py']
def binding(path):
 raw=path.read_bytes()
 return {'path':str(path),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
before=[binding(p) for p in paths]
for i,p in enumerate(paths):(RUN/(str(i)+'-'+p.name)).write_bytes(p.read_bytes())
command=[sys.executable,'-B',str(paths[0]),'-v']
started=datetime.now(timezone.utc).isoformat();tick=time.monotonic()
try:
 result=subprocess.run(command,cwd=ROOT,capture_output=True,timeout=30)
 stdout,stderr,code=result.stdout,result.stderr,result.returncode
 outcome='completed'
except subprocess.TimeoutExpired as error:
 stdout,stderr,code=error.stdout or b'',error.stderr or b'',None
 outcome='timeout'
(RUN/'stdout.txt').write_bytes(stdout);(RUN/'stderr.txt').write_bytes(stderr)
receipt={'schema':'lupine.discovery.growth_envelope_recorder_gate_review_execution.v1','command':command,'cwd':str(ROOT),'started_at':started,'finished_at':datetime.now(timezone.utc).isoformat(),'elapsed_seconds':time.monotonic()-tick,'exit_code':code,'outcome':outcome,'before':before,'after':[binding(p) for p in paths],'stdout':binding(RUN/'stdout.txt'),'stderr':binding(RUN/'stderr.txt'),'scope':'AST-extracted recorder helpers, generated reports and mocked CI/state/import/process/source dependencies; only synthetic stdout/stderr files written, no recorder main module import or real source operation.'}
(RUN/'execution.json').write_text(json.dumps(receipt,indent=2,sort_keys=True)+'\n')
print(stderr.decode());print(json.dumps({'exit_code':code,'elapsed_seconds':receipt['elapsed_seconds']}))
raise SystemExit(0 if code==0 else 1)
