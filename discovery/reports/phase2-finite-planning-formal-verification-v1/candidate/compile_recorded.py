"""Local, offline, source-bound Lean attempt recorder; no dependency build/update."""
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

def digest(raw):
    return hashlib.sha256(raw).hexdigest()

def main():
    attempt = sys.argv[1]
    if not attempt.replace('-', '').isalnum():
        raise ValueError('closed attempt name required')
    output = BASE / 'attempts' / attempt
    output.mkdir(parents=True, exist_ok=False)
    source = BASE / 'LupineFinitePlanning.lean'
    before = source.read_bytes()
    (output / source.name).write_bytes(before)
    paths = sorted((FORMAL / '.lake/packages').glob('*/.lake/build/lib/lean'))
    env = dict(os.environ)
    env['LEAN_PATH'] = ':'.join(str(p) for p in paths)
    env['LEAN_NUM_THREADS'] = '1'
    command = [str(LEAN), '-DwarningAsError=true', '-o', str(output / 'LupineFinitePlanning.olean'), str(source)]
    start = datetime.datetime.now(datetime.timezone.utc).isoformat()
    start_clock = time.monotonic()
    timed_out = False
    try:
        result = subprocess.run(command, cwd=BASE, env=env, capture_output=True, timeout=180)
        code, stdout, stderr = result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired as exc:
        timed_out = True
        code, stdout, stderr = None, exc.stdout or b'', exc.stderr or b''
    elapsed = time.monotonic() - start_clock
    (output / 'stdout.txt').write_bytes(stdout)
    (output / 'stderr.txt').write_bytes(stderr)
    after = source.read_bytes()
    record = {'command': command, 'cwd': str(BASE), 'started': start,
              'finished': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'elapsed_seconds': elapsed, 'exit_code': code, 'timed_out': timed_out,
              'source_sha256_before': digest(before), 'source_sha256_after': digest(after),
              'source_held': before == after, 'stdout_sha256': digest(stdout),
              'stderr_sha256': digest(stderr), 'lean_path': [str(p) for p in paths],
              'lean_executable_sha256': digest(LEAN.read_bytes()),
              'no_network_or_dependency_build': True,
              'formal_configuration': {p: digest((FORMAL / p).read_bytes()) for p in
                                       ('lean-toolchain', 'lakefile.toml', 'lake-manifest.json')}}
    obj = output / 'LupineFinitePlanning.olean'
    record['compiled_object_sha256'] = digest(obj.read_bytes()) if obj.exists() else None
    (output / 'execution.json').write_text(json.dumps(record, indent=2, sort_keys=True) + '\n')
    print(json.dumps(record, sort_keys=True))
    print(stdout.decode(errors='replace'))
    print(stderr.decode(errors='replace'))
    return 0 if code == 0 and before == after else 1

if __name__ == '__main__':
    raise SystemExit(main())
