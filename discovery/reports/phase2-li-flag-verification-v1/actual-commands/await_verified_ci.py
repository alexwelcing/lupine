from pathlib import Path
import json,subprocess,sys,time
path=Path('.cache/phase2-li-flags-ci-v1/final.json');start=time.monotonic()
while not path.exists():
 if time.monotonic()-start>3600:raise SystemExit('CI_RESULT_TIMEOUT_NO_DIAGNOSTIC_RUN')
 time.sleep(20)
result=json.loads(path.read_text())
assert result['commit']=='f7c6ccd04b535f8830f07905b51a5dc2c8a6ca4f' and result['all_four_jobs_successful']
print('Watcher verified all four exact-commit jobs; invoking separately guarded diagnostic recorder.',flush=True)
raise SystemExit(subprocess.run([sys.executable,'.cache/phase2-li-flag-production-v1/run_after_ci.py']).returncode)
