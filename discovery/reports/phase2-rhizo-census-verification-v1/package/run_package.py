"""Build and execute the published wheel in a fresh isolated installation."""
import datetime
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import time

R = Path(__file__).resolve().parents[2]
H = Path(__file__).resolve().parent
C = '2975d6d0b9111cc84adb82ccc673bc82339ab154'
def git(*args):
    return subprocess.check_output(['git', *args], cwd=R)
assert git('rev-parse', 'HEAD').decode().strip() == C
assert not git('status', '--porcelain')
assert not (H / 'package-start.json').exists()
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
command = [sys.executable, 'scripts/package_smoke.py', '--retain-directory',
           str(H / 'retained'), '--output', str(H / 'package-verification.json')]
(H / 'package-start.json').write_text(json.dumps({'at': started, 'commit': C,
    'command': command, 'recorder_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}, indent=2) + '\n')
tick = time.monotonic()
with (H / 'package-stdout.txt').open('xb') as out, (H / 'package-stderr.txt').open('xb') as err:
    result = subprocess.run(command, cwd=R, stdout=out, stderr=err)
record = {'started_at': started, 'finished_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'process_seconds': time.monotonic() - tick, 'exit_code': result.returncode,
          'commit': C, 'source_head_unchanged': git('rev-parse', 'HEAD').decode().strip() == C,
          'worktree_clean': not bool(git('status', '--porcelain'))}
(H / 'package-execution.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps(record))
if result.returncode:
    print((H / 'package-stderr.txt').read_text()[-4000:])
    raise SystemExit(result.returncode)
command = [sys.executable, 'scripts/verify_retained_artifacts.py', '--directory', str(H / 'retained'), '--commit', C]
tick = time.monotonic()
with (H / 'retained-audit.json').open('xb') as out, (H / 'retained-audit-stderr.txt').open('xb') as err:
    result = subprocess.run(command, cwd=R, stdout=out, stderr=err)
record = {'finished_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'process_seconds': time.monotonic() - tick, 'exit_code': result.returncode,
          'command': command, 'status': json.loads((H / 'retained-audit.json').read_bytes())['status']}
(H / 'retained-audit-execution.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps(record))
raise SystemExit(result.returncode)
