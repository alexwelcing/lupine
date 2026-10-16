"""Independent extracted-recorder tests: every external operation is an in-memory stub."""
import ast
import hashlib
import json
from pathlib import Path
import types
import unittest

BASE = Path(__file__).absolute().parent
AUTHOR = BASE.parent / 'phase2-li-complete-readiness-operations-v1'


class Stopped(ValueError):
    pass


def require(value, reason):
    if not value: raise Stopped(reason)


def canon(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':')) + '\n').encode()


def extract(path, function, namespace):
    # Parse source as text; never import the recorder/support/product or run a guard.
    tree = ast.parse(path.read_text())
    node = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == function)
    exec(compile(ast.Module(body=[node], type_ignores=[]), '<extracted generated-only helper>', 'exec'), namespace)
    return namespace[function]


def process_result():
    return dict(stdout=b'generated-public\n', stderr=b'', started_ns=1, finished_ns=2,
                exit_code=0, timed_out=False, launch_failed=False, output_limit=False,
                process_completed=True, process_group_cleanup=True)


class OrderingTests(unittest.TestCase):
    def support(self, publish=None):
        return types.SimpleNamespace(ROOT=Path('/generated-only'), PUBLIC_CAP=2097152, LOG_CAP=16777216,
            require=require, canonical=canon, sha=lambda raw: hashlib.sha256(raw).hexdigest(),
            absent=lambda path: True, reserve=lambda path: None,
            publish=publish or (lambda path, raw: None), bounded_process=lambda *a, **k: process_result())

    def test_rejected_historical_prefix_precedes_any_new_command(self):
        commands = []
        s = self.support()
        before = {'gates': {}, 'prior_acceptances': {}}
        binding = {'expected': {}, 'phase': 'inventory', 'commit': '1' * 40}
        def execute(*args):
            commands.append('new source command')
            return {'stdout': b'identical', 'persisted': b'identical', 'reservation': b'generated', 'recording': {}}
        validator = types.SimpleNamespace(_expected=lambda value: None,
                                          review_route=lambda *a, **k: {'status': 'REJECTED_PUBLIC_CONSISTENCY'})
        ns = dict(s=s, HERE=Path('/generated-only/recorder'), TARGET='generated-target',
                  load_bindings=lambda *a: binding, state=lambda *a: (before, None),
                  load_validator=lambda *a: validator, run_one=execute,
                  prior_acceptances=lambda *a, **k: ({}, [{'generated_prior': True}] * 2, {'layout': {}}))
        run = extract(AUTHOR/'run_after_ci.py', 'run_phase', ns)
        with self.assertRaises(Stopped): run('inventory', '2' * 64)
        self.assertEqual(commands, [], 'invalid supplied historical prefix must block before target operations')

    def test_operation_log_failure_still_attempts_post_state(self):
        states = []
        def publish(path, raw):
            if path.name == 'stdout.bin': raise OSError('generated log failure')
        s = self.support(publish); s.read = lambda *a: b'generated'
        before = {'gates': {}}
        def state(*args): states.append('post-state'); return before, None
        validator = types.SimpleNamespace(review_operation=lambda **k: {'status': 'COMPLETED_PUBLIC_CONSISTENCY'},
                                          validate_public=lambda *a, **k: {'engineering_status': 'COMPLETE'})
        ns = dict(s=s, TARGET='generated-target', command=lambda *a: ['generated-child'], state=state)
        run = extract(AUTHOR/'run_after_ci.py', 'run_one', ns)
        with self.assertRaises((Stopped, OSError)):
            run('layout', 1, {'expected': {}}, '3' * 64, validator, before, None, Path('/generated-only/output'))
        self.assertEqual(states, ['post-state'], 'post-child state check must be independent of log publication')

    def test_package_log_failure_still_attempts_post_state(self):
        states = []
        def publish(path, raw):
            if path.name == 'package-stdout.txt': raise OSError('generated log failure')
        s = self.support(publish)
        before = {'runtime': {}, 'own_files': {}, 'commit': '4' * 40, 'worktree_clean': True}
        def state(*args, **kwargs): states.append('source-state'); return before
        s.repository_state = state
        ns = dict(s=s, HERE=Path('/generated-only/recorder'), tools_snapshot=lambda: {},
                  sys=types.SimpleNamespace(executable='/generated-python'))
        run = extract(AUTHOR/'run_package.py', 'run', ns)
        with self.assertRaises((Stopped, OSError)): run('4' * 40)
        self.assertEqual(states, ['source-state'] * 3, 'initial, pre-child, and post-child checks all remain required')


if __name__ == '__main__':
    unittest.main()
