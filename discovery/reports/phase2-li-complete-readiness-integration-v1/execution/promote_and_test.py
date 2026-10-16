"""Promote exactly eight reviewed files after repair artifact holds complete."""
from pathlib import Path
import argparse
import datetime
import hashlib
import json
import os
import subprocess
import sys
import time

R = Path(__file__).resolve().parents[2]
H = Path(__file__).resolve().parent
BASE = 'ddd4a6a8df0f908a162b7e5387b0faac325180d6'
MANIFEST = '67d686934ba718b50f8d14e1efa9e2c8dfbc96bc88e43d1a341b4719440509aa'
NAMES = {
    'scripts/li_v3_readiness.py', 'scripts/li_v3_readiness_production.py',
    'tests/test_li_v3_readiness.py', 'tests/test_li_v3_readiness_review.py',
    'tests/test_li_v3_readiness_production.py',
    'tests/test_li_v3_readiness_production_review.py',
    'docs/li-v3-readiness.md', 'docs/li-v3-readiness-production.md',
}
sha = lambda b: hashlib.sha256(b).hexdigest()
now = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()
def git(*args):
    return subprocess.check_output(['git', *args], cwd=R, stderr=subprocess.PIPE)

parser = argparse.ArgumentParser()
parser.add_argument('--copyset', required=True)
parser.add_argument('--copyset-sha256', required=True)
args = parser.parse_args()
raw = (R / args.copyset).read_bytes()
assert sha(raw) == args.copyset_sha256
copyset = json.loads(raw)
entries = copyset['entries']
assert len(entries) == 8 and {e['destination'] for e in entries} == NAMES
assert git('rev-parse', 'HEAD').decode().strip() == BASE
assert git('branch', '--show-current').decode().strip() == 'research/lupine-discovery'
assert not git('status', '--porcelain')
git('fetch', 'origin', 'refs/heads/research/lupine-discovery')
assert git('rev-parse', 'FETCH_HEAD').decode().strip() == BASE
manifest_path = R / 'reports/runtime-manifest.json'
assert sha(manifest_path.read_bytes()) == MANIFEST
manifest = json.loads(manifest_path.read_bytes())
baseline = dict(manifest['files'])
assert len(baseline) == 339
assert all(sha((R / n).read_bytes()) == d for n, d in baseline.items())
for entry in entries:
    source = R / entry['overlay']
    assert source.is_relative_to(R / '.cache')
    assert sha(source.read_bytes()) == entry['sha256']
    assert not (R / entry['destination']).exists()
assert not (H / 'promotion.json').exists()
for entry in entries:
    target = R / entry['destination']
    target.write_bytes((R / entry['overlay']).read_bytes())
    if target.suffix == '.py':
        manifest['files'][entry['destination']] = entry['sha256']
assert len(manifest['files']) == 345
assert all(manifest['files'][n] == d for n, d in baseline.items())
manifest['checkpoint'] = '2026-10-16 complete bounded Li readiness integration; generated checks only, actual operations unbound'
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
hold = {n: sha((R / n).read_bytes()) for n in set(manifest['files']) | NAMES}
record = {'at': now(), 'parent_commit': BASE, 'copyset_path': args.copyset,
          'copyset_sha256': args.copyset_sha256, 'baseline_unchanged': 339,
          'runtime_files': 345, 'added_runtime_files': sorted(NAMES - {n for n in NAMES if n.startswith('docs/')}),
          'guarded_document_files': sorted(n for n in NAMES if n.startswith('docs/')),
          'actual_operations': 0, 'held_files': hold}
(H / 'promotion.json').write_text(json.dumps(record, indent=2) + '\n')
D = H / 'focused-first'
D.mkdir(exist_ok=False)
code = ('import unittest; s=unittest.TestLoader().discover("tests", pattern="test_li*.py"); '
        'print("Collected",s.countTestCases(),"methods",flush=True); '
        'r=unittest.TextTestRunner(verbosity=2).run(s); raise SystemExit(0 if r.wasSuccessful() else 1)')
command = [sys.executable, '-B', '-c', code]
started = now()
(D / 'start.json').write_text(json.dumps({'at': started, 'command': command,
    'parent_commit': BASE, 'hold': hold}, indent=2) + '\n')
env = dict(os.environ, PYTHONPATH=str(R / 'src'), PYTHONDONTWRITEBYTECODE='1')
tick = time.monotonic()
with (D / 'stdout.txt').open('xb') as out, (D / 'stderr.txt').open('xb') as err:
    result = subprocess.run(command, cwd=R, env=env, stdout=out, stderr=err)
receipt = {'started_at': started, 'finished_at': now(),
           'process_seconds': time.monotonic() - tick, 'exit_code': result.returncode,
           'held_file_count': len(hold), 'source_unchanged': all(sha((R/n).read_bytes()) == d for n,d in hold.items()),
           'stdout_sha256': sha((D/'stdout.txt').read_bytes()),
           'stderr_sha256': sha((D/'stderr.txt').read_bytes()), 'actual_operations': 0}
(D / 'execution.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt))
print((D / 'stdout.txt').read_text())
print((D / 'stderr.txt').read_text()[-2400:])
raise SystemExit(result.returncode)
