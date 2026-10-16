"""One independently recorded pure-test invocation; source passed after freeze."""
import argparse
import datetime
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import time
import unittest


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def stamp():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


parser = argparse.ArgumentParser()
parser.add_argument('--source', required=True)
parser.add_argument('--source-sha256', required=True)
parser.add_argument('--attempt', required=True)
args = parser.parse_args()
base = Path(__file__).resolve().parent
root = base.parents[1]
source = Path(args.source).resolve()
assert digest(source) == args.source_sha256
slot = base / args.attempt
slot.mkdir(exist_ok=False)
allowed_read = {source,
    root / 'reports/phase2-rhizo-reference-readiness-v1/design/reference-frame.json',
    root / 'reports/phase2-rhizo-recorded-label-readiness-v1/actual/public.json'}
blocked = []


def audit(event, arguments):
    if event.startswith('socket.') or event in {'subprocess.Popen', 'os.system', 'os.posix_spawn'}:
        blocked.append({'event': event, 'path': None})
        raise PermissionError('Pure review forbids network and subprocess operations')
    if event == 'open' and arguments and isinstance(arguments[0], (str, bytes, os.PathLike)):
        path = Path(os.fsdecode(arguments[0])).resolve()
        if path == root or root in path.parents:
            if path not in allowed_read and not (path == base or base in path.parents):
                blocked.append({'event': event, 'path': str(path.relative_to(root))})
                raise PermissionError('Pure review forbids non-allowlisted repository reads/writes')


sys.addaudithook(audit)
start = {'started_at': stamp(), 'source': str(source.relative_to(root)), 'source_sha256': args.source_sha256,
         'test_source_sha256': digest(base / 'test_census_independent.py'),
         'fixture_source_sha256': digest(base / 'generated_fixtures.py'),
         'scope': 'Independent generated projections only; fixed public frame/readiness; no actual labels, network or production guards.'}
(slot / 'start.json').write_text(json.dumps(start, indent=2, sort_keys=True) + '\n')
source_bytes = source.read_bytes()
spec = importlib.util.spec_from_loader('held_census_candidate', loader=None)
candidate = importlib.util.module_from_spec(spec)
candidate.__file__ = str(source)
sys.modules[spec.name] = candidate
exec(compile(source_bytes, str(source), 'exec'), candidate.__dict__)
sys.path.insert(0, str(base))
import test_census_independent as tests
tests.CANDIDATE = candidate
suite = unittest.defaultTestLoader.loadTestsFromModule(tests)
output = io.StringIO()
started = time.monotonic()
result = unittest.TextTestRunner(stream=output, verbosity=2).run(suite)
seconds = time.monotonic() - started
(slot / 'unittest.txt').write_text(output.getvalue())
receipt = {'schema': 'lupine.rhizo.census.independent.execution.v1', **start,
           'finished_at': stamp(), 'seconds': seconds, 'tests_run': result.testsRun,
           'failures': len(result.failures), 'errors': len(result.errors),
           'skipped': len(result.skipped), 'successful': result.wasSuccessful(),
           'source_held_after': digest(source) == args.source_sha256,
           'blocked_operations': blocked, 'actual_source_reads': 0,
           'actual_private_projection_reads': 0, 'production_guards_run': False,
           'author_fixtures_imported': False,
           'case_counter': tests.CASE_COUNTER}
(slot / 'execution.json').write_text(json.dumps(receipt, indent=2, sort_keys=True) + '\n')
print(json.dumps(receipt, indent=2, sort_keys=True))
if not result.wasSuccessful() or not receipt['source_held_after'] or blocked:
    raise SystemExit(1)
