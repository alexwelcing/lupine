"""Run only the independently authored synthetic local-extra suite and retain evidence."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import os
import re
import subprocess
import sys
import time

ROOT = next(p for p in Path(__file__).absolute().parents
            if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
BASE = Path(__file__).absolute().parent
TEST = BASE / 'promotion/tests/test_li_v3_local_extra_headers_review.py'
CANDIDATE = ROOT / '.cache/phase2-li-local-extra-candidate-v1/promotion/scripts/li_v3_local_extra_headers.py'
TRACKED = ROOT / 'scripts/li_v3_local_extra_headers.py'
SOURCE = TRACKED if TRACKED.is_file() else CANDIDATE

def identity(path):
    raw = path.read_bytes()
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}

expected, run_name = sys.argv[1:]
assert re.fullmatch('[0-9a-f]{64}', expected)
assert re.fullmatch('[a-z0-9-]{1,40}', run_name)
run = BASE / run_name
run.mkdir(exist_ok=False)
before = {'implementation': identity(SOURCE), 'tests': identity(TEST)}
assert before['implementation']['sha256'] == expected, 'source not held expected identity'
(run / 'implementation.py').write_bytes(SOURCE.read_bytes())
(run / 'independent-tests.py').write_bytes(TEST.read_bytes())
command = [sys.executable, '-B', str(TEST), '-v']
env = dict(os.environ)
env['PYTHONDONTWRITEBYTECODE'] = '1'
start = datetime.now(timezone.utc).isoformat()
tick = time.monotonic()
result = subprocess.run(command, cwd=ROOT, env=env, capture_output=True, timeout=45)
elapsed = time.monotonic() - tick
(run / 'stdout.txt').write_bytes(result.stdout)
(run / 'stderr.txt').write_bytes(result.stderr)
after = {'implementation': identity(SOURCE), 'tests': identity(TEST)}
receipt = {'schema': 'lupine.discovery.independent_synthetic_execution.v1',
           'reviewer': '/root/phase2_planner/ui_review',
           'command': command, 'cwd': str(ROOT), 'started_utc': start,
           'finished_utc': datetime.now(timezone.utc).isoformat(),
           'elapsed_seconds': elapsed, 'exit_code': result.returncode,
           'source_path': str(SOURCE), 'test_path': str(TEST),
           'before': before, 'after': after, 'held_unchanged': before == after,
           'stdout': identity(run / 'stdout.txt'), 'stderr': identity(run / 'stderr.txt'),
           'actual_source_or_receipt_read': False, 'network_used': False,
           'production_custody_io': False}
(run / 'execution.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps({'run': str(run), 'exit_code': result.returncode,
                  'elapsed_seconds': elapsed, 'held_unchanged': before == after,
                  'implementation_sha256': before['implementation']['sha256'],
                  'test_sha256': before['tests']['sha256']}))
print(result.stderr.decode('utf-8'), end='')
if before != after:
    raise SystemExit('source or tests changed during run')
raise SystemExit(result.returncode)
