set -eu
. .cache/reproduction-attempt.env
. "$LUPINE_VENV/bin/activate"
python - <<'PY'
import hashlib
import os
from pathlib import Path
import re
import subprocess
import sys

sys.path.insert(0, "scripts")
import training_tail as tail

attempt = os.environ["LUPINE_REPRO_ATTEMPT"]
if not re.fullmatch(r"[A-Za-z0-9_-]+", attempt):
    raise SystemExit("Use a nonempty ASCII letter/digit/hyphen/underscore attempt token.")
log_path = tail.ROOT / f"reports/training-tail-engineering-tests-{attempt}.txt"
receipt_path = tail.ROOT / f"reports/training-tail-engineering-validation-{attempt}.json"
for path in (log_path, receipt_path):
    if path.exists() or path.is_symlink():
        raise SystemExit("Evidence path already exists; choose a fresh attempt token.")
identity = tail.protocol_identity()
tests = ["tests/test_training_tail.py", "tests/test_training_tail_review.py"]
names = list(identity["implementation_sha256"]) + tests
snapshot = lambda: {
    name: hashlib.sha256((tail.ROOT / name).read_bytes()).hexdigest()
    for name in names
}
before = snapshot()
command = [sys.executable, "-m", "unittest", "discover", "-s", "tests",
           "-p", "test_training_tail*.py", "-v"]
environment = os.environ.copy()
environment.update({name: "1" for name in tail.THREAD_VARIABLES})
environment["PYTHONHASHSEED"] = "0"
run = subprocess.run(command, cwd=tail.ROOT, env=environment,
                     stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
after = snapshot()
log_sha = tail.immutable_bytes(log_path, run.stdout)
summary = re.search(
    rb"(?:^|\n)Ran ([0-9]+) tests? in [0-9.]+s\n\nOK\n?\Z", run.stdout
)
passed = int(summary.group(1)) if summary else 0
ok = run.returncode == 0 and passed > 0 and before == after
receipt = {
    "schema": "lupine.discovery.training_tail.engineering.v1",
    "status": "PASS" if ok else "FAIL",
    "protocol_commit": tail.PROTOCOL_COMMIT,
    "protocol_sha256": tail.PROTOCOL_SHA256,
    "test_files": tests,
    "source_sha256_before": before,
    "source_sha256_after": after,
    "tests": {
        "command": command, "exit_code": run.returncode,
        "passed": passed, "failed": 0 if ok else None,
        "errors": 0 if ok else None, "skipped": 0 if ok else None,
        "log_path": str(log_path.relative_to(tail.ROOT)),
        "log_sha256": log_sha,
    },
}
tail.write_json(receipt_path, receipt)
if not ok:
    raise SystemExit("Engineering checks failed; evidence preserved. No real fit.")
print(tail.verify_engineering(receipt_path, identity))
PY
