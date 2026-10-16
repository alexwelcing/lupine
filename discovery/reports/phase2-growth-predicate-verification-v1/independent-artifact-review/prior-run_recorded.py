"""Record read-only artifact audits after root supplies final reviewed source pins."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import time

if not __debug__:
    raise RuntimeError('Assertions must be enabled')

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--commit', required=True)
parser.add_argument('--retained-directory', required=True, type=Path)
parser.add_argument('--reviewed-pins', required=True, type=Path)
parser.add_argument('--reviewed-pins-sha256', required=True)
parser.add_argument('--additive-auditor-sha256', required=True)
parser.add_argument('--operator', required=True)
args = parser.parse_args()


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def exact_hex(value, length):
    return len(value) == length and all(c in '0123456789abcdef' for c in value)


def write_json(path, value):
    with path.open('x') as out:
        json.dump(value, out, indent=2, sort_keys=True)
        out.write('\n')


assert exact_hex(args.commit, 40)
assert args.commit != 'b42bd9a94385ad43c3c2ac022584dae6bd135254'
assert exact_hex(args.reviewed_pins_sha256, 64)
assert exact_hex(args.additive_auditor_sha256, 64)
assert args.operator and len(args.operator) <= 128
retained = args.retained_directory.resolve()
pins = args.reviewed_pins.resolve()
for path in (retained, pins):
    assert path.is_relative_to(ROOT / '.cache')
    assert not path.is_relative_to(ROOT / '.cache/li-v3-custody')

run_directory = BASE / ('execution-' + args.commit[:12])
run_directory.mkdir(exist_ok=False)
full_output = BASE / ('actual-' + args.commit[:12])
additive_output = BASE / ('additive-' + args.commit[:12])
held_expected = {
    str(BASE / 'audit.py'): 'b81293cba3632449830932175e9fa938913650ade05f5e524b258aba78923119',
    str(BASE / 'additive_audit.py'): args.additive_auditor_sha256,
    str(pins): args.reviewed_pins_sha256,
    str(Path(__file__).resolve()): sha(Path(__file__).read_bytes()),
}


def snapshot():
    observed = {}
    errors = {}
    pin_raw = None
    for value in held_expected:
        path = Path(value)
        try:
            if path.resolve() != path or not path.is_file() or path.stat().st_size > 2 * 1024 * 1024:
                raise ValueError('binding input rejected')
            raw = path.read_bytes()
            if len(raw) > 2 * 1024 * 1024:
                raise ValueError('binding input oversized')
            observed[value] = sha(raw)
            if path == pins:
                pin_raw = raw
        except Exception as error:
            observed[value] = None
            errors[value] = type(error).__name__
    try:
        pins_status_valid = json.loads(pin_raw)['status'] == 'FINAL_REVIEWED_SOURCE_PINS'
    except Exception:
        pins_status_valid = False
    return {'sha256': observed, 'errors': errors, 'held_equal': observed == held_expected,
            'reviewed_pins_status_valid': pins_status_valid}


commands = [
    [sys.executable, str(BASE / 'audit.py'), '--commit', args.commit,
     '--retained-directory', str(retained), '--output-directory', str(full_output)],
    [sys.executable, str(BASE / 'additive_audit.py'), '--commit', args.commit,
     '--retained-directory', str(retained), '--full-review', str(full_output / 'review.json'),
     '--reviewed-pins', str(pins), '--reviewed-pins-sha256', args.reviewed_pins_sha256,
     '--output-directory', str(additive_output)],
]

for index, command in enumerate(commands):
    before = snapshot()
    record = {
        'command': command, 'commit': args.commit, 'operator': args.operator,
        'started_at': datetime.now(timezone.utc).isoformat(), 'before': before,
        'script_sha256': held_expected[command[1]],
        'reviewed_pins_sha256': args.reviewed_pins_sha256,
        'scope': 'Read-only retained artifact/source audit; no package test, production diagnostic or network command.',
    }
    write_json(run_directory / f'{index}-start.json', record)
    tick = time.monotonic()
    with (run_directory / f'{index}-stdout.txt').open('xb') as out, \
         (run_directory / f'{index}-stderr.txt').open('xb') as err:
        if not before['held_equal'] or not before['reviewed_pins_status_valid']:
            child_exit = None
            exit_code = 125
            record.update(timed_out=False, launch_error='PRE_BINDING_MISMATCH', child_invoked=False)
        else:
            try:
                completed = subprocess.run(command, cwd=ROOT, stdout=out, stderr=err, timeout=180)
                child_exit = completed.returncode
                exit_code = child_exit
                record.update(timed_out=False, launch_error=None, child_invoked=True)
            except subprocess.TimeoutExpired:
                child_exit, exit_code = None, 124
                record.update(timed_out=True, launch_error=None, child_invoked=True,
                              exception='TimeoutExpired', timeout_seconds=180)
            except OSError as error:
                child_exit, exit_code = None, 127
                record.update(timed_out=False, launch_error=type(error).__name__,
                              launch_errno=error.errno, child_invoked=False)
    after = snapshot()
    if not after['held_equal'] or not after['reviewed_pins_status_valid']:
        exit_code = 125
    record.update(finished_at=datetime.now(timezone.utc).isoformat(),
                  elapsed_seconds=time.monotonic() - tick, child_exit_code=child_exit,
                  exit_code=exit_code, after=after)
    for kind in ('stdout', 'stderr'):
        record[kind + '_sha256'] = sha((run_directory / f'{index}-{kind}.txt').read_bytes())
    write_json(run_directory / f'{index}-execution.json', record)
    print(json.dumps(record, sort_keys=True), flush=True)
    if exit_code:
        write_json(run_directory / 'final.json', {
            'status': 'STOPPED', 'commit': args.commit, 'operator': args.operator,
            'stopped_after_index': index, 'exit_code': exit_code,
            'source_reader_invoked': False,
        })
        raise SystemExit(exit_code)

final = {'status': 'BOTH_READ_ONLY_AUDIT_PROCESSES_EXITED_ZERO', 'commit': args.commit,
         'operator': args.operator, 'full_review': str(full_output / 'review.json'),
         'additive_review': str(additive_output / 'additive-review.json'),
         'source_reader_invoked': False}
write_json(run_directory / 'final.json', final)
print(json.dumps(final, sort_keys=True))
