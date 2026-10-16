"""Record one synthetic-only independent test invocation against held source."""
from pathlib import Path
import argparse
import datetime
import hashlib
import json
import os
import subprocess
import sys
import time

parser = argparse.ArgumentParser()
parser.add_argument('--source-sha256', required=True)
parser.add_argument('--run-label', required=True)
args = parser.parse_args()
base = Path(__file__).resolve().parent
candidate = base.parent / 'phase2-rhizo-reference-projector-v1'
assert len(args.source_sha256) == 64 and all(c in '0123456789abcdef' for c in args.source_sha256)
assert args.run_label in ('first-run', 'second-run', 'third-run')
paths = [candidate / 'reference_projector.py', candidate / 'scope.json',
         base / 'test_reference_projector_review.py', base / 'generated_fixtures.py', Path(__file__).resolve()]
hashes = lambda: {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
before = hashes()
assert before[str(paths[0])] == args.source_sha256
out = base / args.run_label
out.mkdir(exist_ok=False)
for path in paths:
    (out / path.name).write_bytes(path.read_bytes())
command = [sys.executable, '-B', '-m', 'unittest', '-v', 'test_reference_projector_review']
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
record = {'command': command, 'cwd': str(base), 'started_at': started, 'source_before': before,
          'scope': 'Generated JSON buffers and temporary generated fixture files only; no production entrypoint, actual scientific/private object, network or upstream-code invocation.'}
(out / 'start.json').write_text(json.dumps(record, indent=2, sort_keys=True) + '\n')
environment = dict(os.environ)
environment['PYTHONDONTWRITEBYTECODE'] = '1'
environment.pop('PYTHONPATH', None)
environment.pop('PYTHONHOME', None)
tick = time.monotonic()
with (out / 'stdout.txt').open('xb') as stdout, (out / 'stderr.txt').open('xb') as stderr:
    try:
        result = subprocess.run(command, cwd=base, env=environment, stdout=stdout, stderr=stderr, timeout=90)
        code = result.returncode
        record.update(timed_out=False, launch_error=None)
    except subprocess.TimeoutExpired:
        code = 124
        record.update(timed_out=True, launch_error=None)
    except OSError as error:
        code = 127
        record.update(timed_out=False, launch_error=type(error).__name__)
after = hashes()
record.update(finished_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
              elapsed_seconds=time.monotonic() - tick, exit_code=code, source_after=after,
              source_unchanged=before == after)
for stream in ('stdout', 'stderr'):
    record[stream + '_sha256'] = hashlib.sha256((out / (stream + '.txt')).read_bytes()).hexdigest()
(out / 'execution.json').write_text(json.dumps(record, indent=2, sort_keys=True) + '\n')
print(json.dumps({'exit_code': code, 'elapsed_seconds': record['elapsed_seconds'],
                  'source_unchanged': before == after, 'receipt': str(out / 'execution.json')}))
raise SystemExit(code if before == after else 125)
