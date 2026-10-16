"""Record one local offline candidate compilation without building dependencies."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

BASE = Path(__file__).resolve().parent
DISCOVERY = BASE.parent.parent
FORMAL = DISCOVERY / 'formal'
LEAN = Path('/home/agent/.elan/toolchains/leanprover--lean4---v4.29.0/bin/lean')
SOURCE = BASE / 'LupineFinitePlanningMonotone.lean'

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    name = sys.argv[1]
    if not name.replace('-', '').isalnum():
        raise ValueError('Invalid attempt name')
    out = BASE / 'attempts' / name
    out.mkdir(parents=True, exist_ok=False)
    scope = json.loads((BASE / 'scope.json').read_text())
    bindings = dict(scope['source_bindings'])
    bindings['formal/.lake/build/lib/lean/LupineFinitePlanning.olean'] = scope['imported_formal_object_sha256']
    assert all(sha(DISCOVERY / p) == h for p, h in bindings.items())
    before = sha(SOURCE)
    (out / SOURCE.name).write_bytes(SOURCE.read_bytes())
    env = dict(os.environ)
    paths = [FORMAL / '.lake/build/lib/lean'] + sorted((FORMAL / '.lake/packages').glob('*/.lake/build/lib/lean'))
    env.update(LEAN_NUM_THREADS='1', LEAN_PATH=':'.join(str(p) for p in paths))
    command = [str(LEAN), '-DwarningAsError=true', '-o', str(out / 'LupineFinitePlanningMonotone.olean'), str(SOURCE)]
    start = datetime.datetime.now(datetime.timezone.utc).isoformat()
    clock = time.monotonic()
    try:
        result = subprocess.run(command, cwd=BASE, env=env, capture_output=True, timeout=180)
        code, stdout, stderr, timed_out = result.returncode, result.stdout, result.stderr, False
    except subprocess.TimeoutExpired as exc:
        code, stdout, stderr, timed_out = None, exc.stdout or b'', exc.stderr or b'', True
    elapsed = time.monotonic() - clock
    (out / 'stdout.txt').write_bytes(stdout)
    (out / 'stderr.txt').write_bytes(stderr)
    after = sha(SOURCE)
    held = all(sha(DISCOVERY / p) == h for p, h in bindings.items())
    obj = out / 'LupineFinitePlanningMonotone.olean'
    record = {'command': command, 'cwd': str(BASE), 'started': start,
              'finished': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'elapsed_seconds': elapsed, 'exit_code': code, 'timed_out': timed_out,
              'source_sha256_before': before, 'source_sha256_after': after,
              'source_held': before == after, 'original_bindings_held': held,
              'stdout_sha256': sha(out / 'stdout.txt'), 'stderr_sha256': sha(out / 'stderr.txt'),
              'compiled_object_sha256': sha(obj) if obj.exists() else None,
              'lean_executable_sha256': sha(LEAN), 'lean_path': [str(p) for p in paths],
              'network_or_dependency_build': False}
    (out / 'execution.json').write_text(json.dumps(record, indent=2, sort_keys=True) + '\n')
    print(json.dumps(record, sort_keys=True))
    print(stdout.decode(errors='replace'))
    print(stderr.decode(errors='replace'))
    return 0 if code == 0 and before == after and held else 1

if __name__ == '__main__':
    raise SystemExit(main())
