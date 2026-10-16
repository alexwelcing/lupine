"""Retain every focused reviewer invocation and bind the unchanged overlay."""
import datetime
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import time

root = Path(__file__).resolve().parents[2]
bundle = Path(__file__).resolve().parent
overlay = root / '.cache/phase2-finite-combined-v2/mirror/discovery'
mode = sys.argv[1]
assert mode in ('first', 'mutation-control')
run = bundle / mode
run.mkdir(exist_ok=False)
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('review_manifest', overlay / 'scripts/runtime_manifest.py')
manifest = importlib.util.module_from_spec(spec)
spec.loader.exec_module(manifest)
before = manifest.source_files(overlay)
candidate = root / '.cache/phase2-finite-ui-candidate-v1'
handoff = json.loads((candidate / 'handoff.json').read_text())
for relative, digest in handoff['promotion_files'].items():
    assert hashlib.sha256((overlay / relative).read_bytes()).hexdigest() == digest
script = bundle / 'independent_browser_review.py'
script_hash = hashlib.sha256(script.read_bytes()).hexdigest()
command = [sys.executable, '-B', str(script), '--overlay', str(overlay), '--output', str(run / 'artifacts')]
if mode == 'mutation-control':
    command.append('--mutate-stale-guards')
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
tick = time.monotonic()
(run / 'start.json').write_text(json.dumps({'command': command, 'started_at': started,
    'scope': 'ignored uncommitted v2 overlay; independent synthetic focused browser review',
    'source_before': before, 'review_script_sha256': script_hash}, indent=2) + '\n')
with (run / 'stdout.txt').open('xb') as stdout, (run / 'stderr.txt').open('xb') as stderr:
    result = subprocess.run(command, cwd=overlay, stdout=stdout, stderr=stderr)
after = manifest.source_files(overlay)
receipt = {'command': command, 'started_at': started,
    'finished_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'elapsed_seconds': time.monotonic() - tick, 'exit_code': result.returncode,
    'scope': 'ignored uncommitted v2 overlay; independent synthetic focused browser review',
    'mutation_control': mode == 'mutation-control', 'runtime_file_count': len(before),
    'source_before': before, 'source_after': after, 'source_unchanged': before == after,
    'review_script_sha256': script_hash,
    'stdout_sha256': hashlib.sha256((run / 'stdout.txt').read_bytes()).hexdigest(),
    'stderr_sha256': hashlib.sha256((run / 'stderr.txt').read_bytes()).hexdigest()}
(run / 'execution.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps({key: value for key, value in receipt.items() if key not in ('source_before', 'source_after', 'command')}))
print((run / 'stdout.txt').read_text())
print((run / 'stderr.txt').read_text()[-6000:])
assert before == after
sys.exit(result.returncode)
