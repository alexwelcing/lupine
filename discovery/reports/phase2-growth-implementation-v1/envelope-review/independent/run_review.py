"""Retain independent generated-envelope checks and every first-attempt byte."""
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
TEST = BASE / 'promotion/tests/test_li_v3_growth_envelope_review.py'
SOURCE = ROOT / '.cache/phase2-growth-envelope-candidate-v1/promotion/scripts/li_v3_growth_envelope.py'
CONTRACT = ROOT / '.cache/phase2-growth-envelope-candidate-v1/promotion/docs/li-v3-growth-envelope-plan.md'
GROWTH = ROOT / 'scripts/li_v3_growth_hint_shape.py'
if not GROWTH.is_file():
    GROWTH = ROOT / '.cache/phase2-growth-hint-production-candidate-v1/promotion/scripts/li_v3_growth_hint_shape.py'

def identity(path):
    raw = path.read_bytes()
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}

run = BASE / sys.argv[1]
assert run.parent == BASE and run.name.replace('-', '').isalnum()
run.mkdir(exist_ok=False)
paths = {'implementation': SOURCE, 'tests': TEST, 'contract': CONTRACT,
         'growth_predecessor': GROWTH, 'guard_runner': BASE / 'run_tests_guarded.py'}
before = {name: identity(path) for name, path in paths.items()}
freeze = json.loads((BASE / 'freeze.json').read_text())
for name, digest in freeze['sha256'].items():
    assert before[name]['sha256'] == digest, name
ast.parse(TEST.read_text())
assert TEST.read_bytes().endswith(b'\n') and not TEST.read_bytes().endswith(b'\n\n')
for name, suffix in (('implementation', '.py'), ('tests', '.py'), ('contract', '.md'), ('growth_predecessor', '.py')):
    (run / (name + suffix)).write_bytes(paths[name].read_bytes())
command = [sys.executable, '-B', str(BASE / 'run_tests_guarded.py'), str(run / 'scope-observation.json')]
environment = dict(os.environ)
environment['PYTHONDONTWRITEBYTECODE'] = '1'
environment.pop('PYTHONOPTIMIZE', None)
started = datetime.now(timezone.utc).isoformat()
tick = time.monotonic()
result = subprocess.run(command, cwd=ROOT, env=environment, capture_output=True, timeout=60)
elapsed = time.monotonic() - tick
(run / 'stdout.txt').write_bytes(result.stdout)
(run / 'stderr.txt').write_bytes(result.stderr)
after = {name: identity(path) for name, path in paths.items()}
receipt = {'schema': 'lupine.discovery.independent_growth_envelope_execution.v1',
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
