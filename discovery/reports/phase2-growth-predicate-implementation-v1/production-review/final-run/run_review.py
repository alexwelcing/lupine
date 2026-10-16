"""Record independent generated-only wrapper tests in exclusive run slots."""
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
CANDIDATE=ROOT/'.cache/phase2-growth-predicate-production-v1/promotion/scripts/li_v3_growth_predicate_audit.py'
CONTRACT=CANDIDATE.parents[1]/'docs/li-v3-growth-predicate-audit-plan.md'
def bind(p):
 b=p.read_bytes();return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def main():
 if len(sys.argv)!=3:raise SystemExit('usage: run_review.py RUN_NAME EXPECTED_SOURCE_SHA')
 out=HERE/sys.argv[1];out.mkdir(exist_ok=False)
 files={'candidate.py':CANDIDATE,'contract.md':CONTRACT,'review_test.py':HERE/'test_li_v3_growth_predicate_audit_review.py','run_review.py':Path(__file__)}
 before={name:bind(p) for name,p in files.items()}
 if before['candidate.py']['sha256']!=sys.argv[2]:raise SystemExit('held source mismatch')
 for name,p in files.items():(out/name).write_bytes(p.read_bytes())
 oldpaths=['scripts/li_v3_growth_envelope.py','scripts/li_v3_custody.py','scripts/li_v3_growth_hint_shape.py','scripts/li_v3_local_extra_headers.py','scripts/li_v3_compatible_envelope.py','scripts/li_v3_compatible_zip_diagnostic.py']
 original={p:bind(ROOT/p) for p in oldpaths}
 command=[sys.executable,'-B',str(HERE/'test_li_v3_growth_predicate_audit_review.py')]
 start={'started_at':now(),'command':command,'inputs':before,'original_sources':original,'actual_source_operations':0,'scope':'Generated temporary repositories and mocked generated source/prerequisite/capture only'}
 (out/'start.json').write_text(json.dumps(start,indent=2,sort_keys=True)+'\n')
 env=dict(os.environ,PREDICATE_PRODUCTION_CANDIDATE=str(CANDIDATE),PYTHONDONTWRITEBYTECODE='1')
 t=time.monotonic();timeout=False
 try:
  done=subprocess.run(command,cwd=ROOT,env=env,capture_output=True,timeout=90)
  stdout,stderr,code=done.stdout,done.stderr,done.returncode
 except subprocess.TimeoutExpired as exc:
  stdout,stderr,code=exc.stdout or b'',exc.stderr or b'',None;timeout=True
 elapsed=time.monotonic()-t
 (out/'stdout.txt').write_bytes(stdout);(out/'stderr.txt').write_bytes(stderr)
 after={name:bind(p) for name,p in files.items()};original_after={p:bind(ROOT/p) for p in oldpaths}
 record={**start,'finished_at':now(),'returncode':code,'timed_out':timeout,'elapsed_seconds':elapsed,'source_test_contract_held':before==after,'original_sources_held':original==original_after,'after':after,'stdout':bind(out/'stdout.txt'),'stderr':bind(out/'stderr.txt')}
 (out/'execution.json').write_text(json.dumps(record,indent=2,sort_keys=True)+'\n')
 print(json.dumps({'run':str(out.relative_to(ROOT)),'returncode':code,'elapsed_seconds':elapsed,'source_test_contract_held':before==after,'original_sources_held':original==original_after}))
 print(stderr.decode('utf-8','replace'))
 return 0 if code==0 and before==after and original==original_after else 1
if __name__=='__main__':raise SystemExit(main())
