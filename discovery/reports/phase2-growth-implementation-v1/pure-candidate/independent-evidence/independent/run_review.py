"""Retain first independent synthetic growth-hint execution and source bindings."""
from pathlib import Path
from datetime import datetime, timezone
import ast
import hashlib
import json
import os
import subprocess
import sys
import time

ROOT = next(p for p in Path(__file__).absolute().parents
            if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
BASE = Path(__file__).absolute().parent
TEST = BASE / 'promotion/tests/test_li_v3_growth_hint_review.py'
SOURCE = ROOT / '.cache/phase2-growth-hint-candidate-v1/promotion/scripts/li_v3_growth_hint_shape.py'
CONTRACT = ROOT / '.cache/phase2-growth-hint-candidate-v1/promotion/docs/li-v3-growth-hint-shape-plan.md'
TRACKED = ROOT / 'scripts/li_v3_growth_hint_shape.py'
if TRACKED.is_file():
    SOURCE = TRACKED

def identity(path):
    raw = path.read_bytes()
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}

run = BASE / sys.argv[1]
assert run.parent == BASE and run.name.replace('-', '').isalnum()
run.mkdir(exist_ok=False)
before = {'implementation': identity(SOURCE), 'tests': identity(TEST), 'contract': identity(CONTRACT),
          'guard_runner': identity(BASE / 'run_tests_guarded.py')}
assert before['implementation']['sha256'] == 'c42313ddc1d6c64e6d9c18338bc3efc9bacc65e7ff7f8281e1da28870e74d7cb'
assert before['contract']['sha256'] == '9900ff73238a9d1c3629f364e4e97d9d450630b0ba938be74f1a03b52da9939c'
ast.parse(TEST.read_text())
(run / 'implementation.py').write_bytes(SOURCE.read_bytes())
(run / 'independent-tests.py').write_bytes(TEST.read_bytes())
(run / 'contract.md').write_bytes(CONTRACT.read_bytes())
command = [sys.executable, '-B', str(BASE / 'run_tests_guarded.py'), str(run / 'scope-observation.json')]
environment = dict(os.environ)
environment['PYTHONDONTWRITEBYTECODE'] = '1'
environment.pop('PYTHONOPTIMIZE', None)
started = datetime.now(timezone.utc).isoformat()
tick = time.monotonic()
result = subprocess.run(command, cwd=ROOT, env=environment, capture_output=True, timeout=45)
elapsed = time.monotonic() - tick
(run / 'stdout.txt').write_bytes(result.stdout)
(run / 'stderr.txt').write_bytes(result.stderr)
after = {'implementation': identity(SOURCE), 'tests': identity(TEST), 'contract': identity(CONTRACT),
         'guard_runner': identity(BASE / 'run_tests_guarded.py')}
receipt = {'schema': 'lupine.discovery.independent_growth_hint_execution.v1',
    'reviewer': '/root/phase2_planner/ui_review', 'command': command, 'cwd': str(ROOT),
    'started_utc': started, 'finished_utc': datetime.now(timezone.utc).isoformat(),
    'elapsed_seconds': elapsed, 'exit_code': result.returncode,
    'before': before, 'after': after, 'held_unchanged': before == after,
    'stdout': identity(run / 'stdout.txt'), 'stderr': identity(run / 'stderr.txt'),
    'scope_observation': identity(run / 'scope-observation.json'),
    'actual_source_capture_or_receipt_read': False, 'network_used': False,
    'production_guard_or_reader_invoked': False}
(run / 'execution.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps({'run': str(run.relative_to(BASE)), 'exit_code': result.returncode,
    'elapsed_seconds': elapsed, 'held_unchanged': before == after,
    'implementation_sha256': before['implementation']['sha256'], 'tests_sha256': before['tests']['sha256']}))
print(result.stderr.decode('utf-8'), end='')
assert before == after
raise SystemExit(result.returncode)
