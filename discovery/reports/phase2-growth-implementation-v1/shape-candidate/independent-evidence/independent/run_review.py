"""Retain the first independent mocked production-binding invocation and identities."""
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
SOURCE = ROOT / '.cache/phase2-growth-hint-production-candidate-v1/promotion/scripts/li_v3_growth_hint_shape.py'
CONTRACT = ROOT / '.cache/phase2-growth-hint-production-candidate-v1/promotion/docs/li-v3-growth-hint-shape-plan.md'

def identity(path):
    raw = path.read_bytes()
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}

run = BASE / sys.argv[1]
assert run.parent == BASE and run.name.replace('-', '').isalnum()
run.mkdir(exist_ok=False)
before = {'implementation': identity(SOURCE), 'tests': identity(TEST), 'contract': identity(CONTRACT),
          'guard_runner': identity(BASE / 'run_tests_guarded.py')}
assert before['implementation']['sha256'] == '1a2bd6443bfe090ab3264b82b60f105cfad16f40182b716f032fd773a2e8354a'
assert before['tests']['sha256'] == '13db80f49a6d8f83df58a3f2ae22f27450e5367c156368333db1908f90d01f85'
assert before['contract']['sha256'] == 'e0ca28ad61181c6cf56d20a46733d2285acb6cb5bc39348f46ee3acb29dfcbc6'
ast.parse(TEST.read_text())
assert TEST.read_bytes().endswith(b'\n') and not TEST.read_bytes().endswith(b'\n\n')
for source, target in ((SOURCE, 'implementation.py'), (TEST, 'independent-tests.py'), (CONTRACT, 'contract.md')):
    (run / target).write_bytes(source.read_bytes())
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
receipt = {'schema': 'lupine.discovery.independent_growth_hint_production_execution.v1',
    'reviewer': '/root/phase2_planner/ui_review', 'command': command, 'cwd': str(ROOT),
    'started_utc': started, 'finished_utc': datetime.now(timezone.utc).isoformat(),
    'elapsed_seconds': elapsed, 'exit_code': result.returncode,
    'before': before, 'after': after, 'held_unchanged': before == after,
    'stdout': identity(run / 'stdout.txt'), 'stderr': identity(run / 'stderr.txt'),
    'scope_observation': identity(run / 'scope-observation.json'),
    'actual_source_capture_or_receipt_read': False, 'network_used': False,
    'real_production_guard_chain_or_reader_invoked': False,
    'current_production_wrapper_and_context_exercised_with_mocked_dependencies': True}
(run / 'execution.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps({'run': str(run.relative_to(BASE)), 'exit_code': result.returncode,
    'elapsed_seconds': elapsed, 'held_unchanged': before == after,
    'implementation_sha256': before['implementation']['sha256'], 'tests_sha256': before['tests']['sha256']}))
print(result.stderr.decode('utf-8'), end='')
assert before == after
raise SystemExit(result.returncode)
