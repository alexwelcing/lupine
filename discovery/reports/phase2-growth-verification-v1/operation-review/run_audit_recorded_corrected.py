"""Record one gated public-operation evidence audit; never invoke a source reader."""
from pathlib import Path
from datetime import datetime, timezone
import argparse
import hashlib
import json
import os
import subprocess
import sys
import time

if not __debug__:
    raise RuntimeError('Recorder assertions must be enabled')

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
PARSER = argparse.ArgumentParser(description=__doc__)
PARSER.add_argument('--bindings', required=True, type=Path)
PARSER.add_argument('--bindings-sha256', required=True)
PARSER.add_argument('--audit-sha256', required=True)
PARSER.add_argument('--stage', required=True, choices=('shape', 'both'))
PARSER.add_argument('--operator', required=True)
ARGS = PARSER.parse_args()


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def write(path, value):
    with path.open('x') as stream:
        json.dump(value, stream, sort_keys=True, indent=2, allow_nan=False); stream.write('\n')


for value in (ARGS.bindings_sha256, ARGS.audit_sha256):
    assert len(value) == 64 and all(c in '0123456789abcdef' for c in value)
assert ARGS.operator and len(ARGS.operator) <= 128
binding_path = ARGS.bindings.resolve()
assert binding_path.is_relative_to(ROOT / '.cache') and not binding_path.is_relative_to(ROOT / '.cache/li-v3-custody')
script = BASE / 'audit_completed_operations_corrected.py'
expected = {str(script): ARGS.audit_sha256, str(binding_path): ARGS.bindings_sha256,
            str(Path(__file__).resolve()): sha(Path(__file__).read_bytes())}
folder = BASE / ('execution-' + ARGS.stage + '-corrected')
folder.mkdir(exist_ok=False)


def snapshot():
    actual, errors, raw = {}, {}, None
    for value in expected:
        path = Path(value)
        try:
            if path.resolve() != path or not path.is_file() or path.stat().st_size > 8 * 1024 * 1024:
                raise ValueError('binding input rejected')
            with path.open('rb') as stream:
                content = stream.read(8 * 1024 * 1024 + 1)
            if len(content) > 8 * 1024 * 1024:
                raise ValueError('binding input oversized')
            actual[value] = sha(content)
            if path == binding_path:
                raw = content
        except Exception as error:
            actual[value] = None; errors[value] = type(error).__name__
    try:
        bindings = json.loads(raw)
        bound = bindings['status'] == 'FINAL_BOUND_OPERATION_AUDIT'
        commit = bindings['commit']
        bound = bound and type(commit) is str and len(commit) == 40 and all(c in '0123456789abcdef' for c in commit)
    except Exception:
        bound, commit = False, None
    return {'sha256': actual, 'errors': errors, 'held_equal': actual == expected,
            'final_bindings_valid': bound, 'commit': commit}


command = [sys.executable, '-B', str(script), '--bindings', str(binding_path),
           '--bindings-sha256', ARGS.bindings_sha256, '--stage', ARGS.stage, '--operator', ARGS.operator]
before = snapshot()
record = {'command': command, 'stage': ARGS.stage, 'operator': ARGS.operator,
          'started_at': datetime.now(timezone.utc).isoformat(), 'before': before,
          'reader_invocation': False, 'scope': 'Public receipt and local committed-source audit only; no scientific validation.'}
write(folder / 'start.json', record)
tick = time.monotonic()
environment = dict(os.environ)
environment['PYTHONDONTWRITEBYTECODE'] = '1'
environment.pop('PYTHONPATH', None); environment.pop('PYTHONHOME', None)
with (folder / 'stdout.txt').open('xb') as out, (folder / 'stderr.txt').open('xb') as err:
    if not before['held_equal'] or not before['final_bindings_valid']:
        child_exit, code = None, 125
        record.update(timed_out=False, launch_error='PRE_BINDING_MISMATCH', child_invoked=False)
    else:
        try:
            result = subprocess.run(command, cwd=ROOT, env=environment, stdout=out, stderr=err, timeout=180)
            child_exit, code = result.returncode, result.returncode
            record.update(timed_out=False, launch_error=None, child_invoked=True)
        except subprocess.TimeoutExpired:
            child_exit, code = None, 124
            record.update(timed_out=True, launch_error=None, child_invoked=True, timeout_seconds=180)
        except OSError as error:
            child_exit, code = None, 127
            record.update(timed_out=False, launch_error=type(error).__name__, launch_errno=error.errno, child_invoked=False)
after = snapshot()
if not after['held_equal'] or not after['final_bindings_valid'] or before != after:
    code = 125
result_path = BASE / ('actual-review-' + ARGS.stage + '-corrected.json')
result_identity = None
if child_exit == 0:
    try:
        content = result_path.read_bytes()
        result = json.loads(content)
        if not (result['status'] == 'PASS' and result['commit'] == before['commit']
                and result['stage'] == ARGS.stage and result['operator'] == ARGS.operator
                and result['private_objects_read'] is False and result['readers_imported_or_invoked'] is False
                and result['scientific_schema_approved'] is False):
            raise ValueError('audit output inconsistent')
        result_identity = {'path': str(result_path), 'bytes': len(content), 'sha256': sha(content), 'status': result['status']}
    except Exception:
        code = 125
record.update(finished_at=datetime.now(timezone.utc).isoformat(), elapsed_seconds=time.monotonic() - tick,
              child_exit_code=child_exit, exit_code=code, after=after, audit_result=result_identity)
for kind in ('stdout', 'stderr'):
    record[kind + '_sha256'] = sha((folder / (kind + '.txt')).read_bytes())
write(folder / 'execution.json', record)
write(folder / 'final.json', {'status': 'RECORDED_AUDIT_PROCESS_EXITED_ZERO' if code == 0 else 'STOPPED',
                            'exit_code': code, 'stage': ARGS.stage, 'operator': ARGS.operator,
                            'scientific_schema_approved': False, 'source_reader_invoked': False})
print(json.dumps(record, indent=2, sort_keys=True))
raise SystemExit(code)
