"""Retain actual clean-source packaging evidence; caller supplies the published commit."""
from pathlib import Path
import datetime
import hashlib
import importlib.util
import json
import re
import subprocess
import sys
import time

ROOT = Path.cwd()
COMMIT = sys.argv[1]
assert re.fullmatch('[0-9a-f]{40}', COMMIT)
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip() == COMMIT
assert subprocess.check_output(['git', 'branch', '--show-current'], text=True).strip() == 'research/lupine-discovery'
assert not subprocess.check_output(['git', 'status', '--porcelain'])
assert subprocess.check_output(['git', 'ls-remote', 'origin', 'refs/heads/research/lupine-discovery'], text=True).split()[0] == COMMIT
OUT = ROOT / '.cache/phase2-growth-predicate-clean-package-v1'
OUT.mkdir(exist_ok=False)
spec = importlib.util.spec_from_file_location('manifest', ROOT / 'scripts/runtime_manifest.py')
manifest = importlib.util.module_from_spec(spec)
spec.loader.exec_module(manifest)
before = manifest.source_files(ROOT)
commands = [
    [sys.executable, 'scripts/package_smoke.py', '--retain-directory', str(OUT / 'artifacts')],
    [sys.executable, 'scripts/verify_retained_artifacts.py', '--directory', str(OUT / 'artifacts'), '--commit', COMMIT],
]
for index, command in enumerate(commands):
    start = datetime.datetime.now(datetime.timezone.utc).isoformat()
    tick = time.monotonic()
    (OUT / f'{index}-start.json').write_text(json.dumps({'command': command, 'commit': COMMIT, 'started_at': start}, indent=2) + '\n')
    timed_out = False
    with (OUT / f'{index}-stdout.txt').open('xb') as stdout, (OUT / f'{index}-stderr.txt').open('xb') as stderr:
        try:
            result = subprocess.run(command, stdout=stdout, stderr=stderr, timeout=300)
        except subprocess.TimeoutExpired:
            timed_out = True
            result = subprocess.CompletedProcess(command, 124)
    after = manifest.source_files(ROOT)
    receipt = {
        'command': command, 'commit': COMMIT, 'started_at': start,
        'finished_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'elapsed_seconds': time.monotonic() - tick, 'exit_code': result.returncode,
        'timed_out': timed_out, 'runtime_before': before, 'runtime_after': after,
        'source_unchanged': before == after,
        'head_unchanged': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip() == COMMIT,
        'worktree_clean': not bool(subprocess.check_output(['git', 'status', '--porcelain'])),
        'stdout_sha256': hashlib.sha256((OUT / f'{index}-stdout.txt').read_bytes()).hexdigest(),
        'stderr_sha256': hashlib.sha256((OUT / f'{index}-stderr.txt').read_bytes()).hexdigest(),
    }
    (OUT / f'{index}-execution.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps({key: value for key, value in receipt.items() if key not in ('runtime_before', 'runtime_after')}), flush=True)
    assert receipt['source_unchanged'] and receipt['head_unchanged'] and receipt['worktree_clean']
    if result.returncode:
        raise SystemExit(result.returncode)
