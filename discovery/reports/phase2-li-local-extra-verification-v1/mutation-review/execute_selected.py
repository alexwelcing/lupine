"""Execute the declared unchanged synthetic methods against one isolated source."""
from pathlib import Path
import hashlib
import importlib.util
import json
import sys
import unittest

BASE = Path(__file__).absolute().parent
ROOT = next(p for p in BASE.parents if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
sys.dont_write_bytecode = True
if sys.flags.optimize:
    raise SystemExit('optimized execution is outside this review')
declaration = json.loads((BASE / 'declaration.json').read_text())
source = Path(sys.argv[1]).absolute()
destination = Path(sys.argv[2]).absolute()
if not source.is_relative_to(BASE) or not destination.is_relative_to(BASE):
    raise SystemExit('isolated paths required')
test_path = BASE / declaration['unchanged_test_copy']
test_bytes = test_path.read_bytes()
if hashlib.sha256(test_bytes).hexdigest() != declaration['production_tests']['sha256']:
    raise SystemExit('unchanged test identity mismatch')
test_spec = importlib.util.spec_from_file_location('unchanged_local_extra_mutation_tests', test_path)
test_module = importlib.util.module_from_spec(test_spec)
sys.modules[test_spec.name] = test_module
events = []
blocked_calls = []
blocked_audit_events = []

def observe_calls(frame, event, arg):
    if event != 'call':
        return
    name = frame.f_code.co_name
    filename = frame.f_code.co_filename
    if name in ('production_context', 'diagnose', '_read_relative') and str(ROOT) in filename:
        blocked_calls.append({'function': name, 'source': filename})
        raise RuntimeError('production or custody read call forbidden in mutation review')

def guard_audit(event, args):
    forbidden = event in ('subprocess.Popen', 'socket.connect', 'socket.getaddrinfo', 'socket.__new__')
    if event == 'open' and args and isinstance(args[0], (str, bytes)):
        path = args[0].decode(errors='replace') if isinstance(args[0], bytes) else args[0]
        forbidden = '/.cache/li-v3-custody/' in path or path.startswith('.cache/li-v3-custody/')
    if forbidden:
        blocked_audit_events.append(event)
        raise RuntimeError('private custody, process or network operation forbidden in mutation review')

class RecordedResult(unittest.TextTestResult):
    def addFailure(self, test, err):
        events.append({'method': test.id(), 'kind': 'failure', 'subtest': None, 'message': str(err[1])})
        super().addFailure(test, err)

    def addError(self, test, err):
        events.append({'method': test.id(), 'kind': 'error', 'subtest': None, 'message': str(err[1])})
        super().addError(test, err)

    def addSubTest(self, test, subtest, err):
        if err is not None:
            kind = 'failure' if issubclass(err[0], test.failureException) else 'error'
            events.append({'method': test.id(), 'kind': kind, 'subtest': str(subtest), 'message': str(err[1])})
        super().addSubTest(test, subtest, err)

selected = declaration['selected_methods']
sys.addaudithook(guard_audit)
sys.setprofile(observe_calls)
try:
    test_spec.loader.exec_module(test_module)
    # This target selector is the sole change to the imported test module.
    test_module.SCRIPT = source
    suite = unittest.TestSuite(test_module.LocalExtraHeadersReviewTests(name) for name in selected)
    result = unittest.TextTestRunner(verbosity=2, resultclass=RecordedResult).run(suite)
finally:
    sys.setprofile(None)
payload = {
    'schema': 'lupine.discovery.mutation_selected_result.v1',
    'source': str(source.relative_to(BASE)),
    'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'test_sha256': hashlib.sha256(test_bytes).hexdigest(),
    'selected_methods': selected, 'tests_run': result.testsRun,
    'failure_events': len(result.failures), 'error_events': len(result.errors),
    'unique_failed_methods': sorted({event['method'] for event in events}),
    'events': events, 'successful': result.wasSuccessful(),
    'blocked_function_calls': blocked_calls, 'blocked_audit_events': blocked_audit_events,
    'test_source_edited': False,
    'selector_override': 'test_module.SCRIPT before class setUpClass',
}
destination.write_text(json.dumps(payload, indent=2) + '\n')
raise SystemExit(0 if result.wasSuccessful() and not blocked_calls and not blocked_audit_events else 1)
