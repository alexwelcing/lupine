from pathlib import Path
import datetime, hashlib, json, subprocess, sys, time
ROOT=Path.cwd(); OUT=ROOT/'.cache/phase2-finite-planner-review-v1'; RUN=OUT/'first'
RUN.mkdir(exist_ok=False)
paths=[ROOT/'.cache/phase2-finite-planner-candidate-v1/promotion/src/lupine_discovery/finite_planning.py',ROOT/'.cache/phase2-finite-planner-candidate-v1/promotion/docs/finite-population-planning.md',ROOT/'src/lupine_discovery/study_planning.py',ROOT/'src/lupine_discovery/serialization.py',OUT/'test_finite_planning_review.py']
def hashes(): return {str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
before=hashes(); assert before[str(paths[0].relative_to(ROOT))]=='027785ccdf24f6e8cf9b7a8ac98987b821fcdb19c875bbe8d2ba52d2fc3895f8'
command=[sys.executable,str(OUT/'test_finite_planning_review.py')]; started=datetime.datetime.now(datetime.timezone.utc).isoformat();tick=time.monotonic()
with (RUN/'stdout.txt').open('xb') as stdout,(RUN/'stderr.txt').open('xb') as stderr:
 result=subprocess.run(command,stdout=stdout,stderr=stderr,timeout=45)
receipt={'command':command,'started_at':started,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsed_seconds':time.monotonic()-tick,'exit_code':result.returncode,'before':before,'after':hashes(),'source_unchanged':before==hashes(),'stdout_sha256':hashlib.sha256((RUN/'stdout.txt').read_bytes()).hexdigest(),'stderr_sha256':hashlib.sha256((RUN/'stderr.txt').read_bytes()).hexdigest(),'scope':'Synthetic finite arithmetic/input/claim tests only; no scientific archive or actual sampling.'}
(RUN/'execution.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({k:receipt[k] for k in ['exit_code','elapsed_seconds','source_unchanged']}))
print((RUN/'stdout.txt').read_text());print((RUN/'stderr.txt').read_text());sys.exit(result.returncode)
