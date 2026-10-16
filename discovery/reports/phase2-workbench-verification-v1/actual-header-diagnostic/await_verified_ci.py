from pathlib import Path
import json,subprocess,sys,time
path=Path('.cache/phase2-workbench-ci-v1/final.json');start=time.monotonic()
while not path.exists():
 if time.monotonic()-start>3600:raise SystemExit('CI_RESULT_TIMEOUT_NO_DIAGNOSTIC_RUN')
 time.sleep(20)
result=json.loads(path.read_text())
assert result['commit']=='41d3e31a14bea040fb37b0aa6a650d6d5e704551' and result['all_four_jobs_successful']
print('Watcher verified all four exact-commit jobs; invoking separately guarded diagnostic recorder.',flush=True)
raise SystemExit(subprocess.run([sys.executable,'.cache/phase2-li-zip-production-v1/run_after_ci.py']).returncode)
