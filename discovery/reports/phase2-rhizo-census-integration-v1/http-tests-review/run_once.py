from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import subprocess
import sys
import time

lane = Path(__file__).resolve().parent
slot = lane / 'first'
slot.mkdir()
inputs = ['tests/test_server_recorded_census.py', 'run_tests.py', 'run_once.py']
start = {'started_at': datetime.now(timezone.utc).isoformat(),
         'command': [sys.executable, '-B', str(lane / 'run_tests.py')],
         'cwd': str(lane),
         'source_hashes': {p: sha256((lane / p).read_bytes()).hexdigest() for p in inputs}}
(slot / 'start.json').write_text(json.dumps(start, indent=2, sort_keys=True) + '\n')
timer = time.monotonic()
with (slot / 'stdout.txt').open('wb') as stdout, (slot / 'stderr.txt').open('wb') as stderr:
    result = subprocess.run(start['command'], cwd=lane, stdout=stdout, stderr=stderr, timeout=60)
record = {**start, 'finished_at': datetime.now(timezone.utc).isoformat(),
          'process_seconds': time.monotonic() - timer, 'exit_code': result.returncode,
          'source_held_after': all(sha256((lane / p).read_bytes()).hexdigest() == h for p, h in start['source_hashes'].items()),
          'outputs': {p: {'bytes': (slot / p).stat().st_size, 'sha256': sha256((slot / p).read_bytes()).hexdigest()}
                      for p in ['stdout.txt', 'stderr.txt']}}
(slot / 'execution.json').write_text(json.dumps(record, indent=2, sort_keys=True) + '\n')
print(json.dumps(record, indent=2, sort_keys=True))
raise SystemExit(result.returncode)
