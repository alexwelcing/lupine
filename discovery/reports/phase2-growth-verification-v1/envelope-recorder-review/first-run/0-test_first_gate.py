"""Demonstrate only the prior-shape gate with extracted main and total IO stubs."""
import argparse
import ast
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
SOURCE = ROOT / '.cache/phase2-growth-envelope-operations-v1/run_after_ci.py'
RAW = SOURCE.read_bytes()
assert hashlib.sha256(RAW).hexdigest() == '40e3f1392c8ea7cdde921574bea0b9852507eeb4901e149089901196b88bb12b'
spec = importlib.util.spec_from_file_location('previous_recorder_fixture',
    ROOT / '.cache/phase2-growth-shape-recorder-review-v1/test_recorder.py')
fixture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fixture)


class GateRegression(unittest.TestCase):
    def test_inconsistent_shape_must_block_before_any_new_command(self):
        shape = fixture.report()
        shape['padding_all_zero'] = False
        shape_raw = fixture.diagnostic.custody.canonical(shape)
        commit = 'a' * 40
        manifest = {'synthetic.py': 'd' * 64}
        called = []
        root = Path('/SYNTHETIC_ROOT')
        with tempfile.TemporaryDirectory(dir=BASE) as directory:
            output = Path(directory) / 'production'
            env = {'argparse': argparse, 'json': json, 'Path': Path, 'COMMIT': commit,
                   'ROOT': root, 'BASE': output, 'SHAPE_REPORT': None,
                   'sys': SimpleNamespace(dont_write_bytecode=False, path=[]),
                   'os': SimpleNamespace(path=SimpleNamespace(lexists=lambda _: False)),
                   '__file__': str(root / 'recorder.py'), 'now': lambda: 'synthetic-time',
                   'digest': lambda raw: hashlib.sha256(raw).hexdigest()}
            def store(path, value):
                assert path.is_relative_to(output)
            def read(path):
                relative = str(path.relative_to(root))
                if relative == 'recorder.py': return b'FAKE_RECORDER'
                if relative in ('.cache/full.json', '.cache/additive.json'):
                    value = {'status': 'PASS', 'commit': commit}
                elif relative == '.cache/phase2-growth-ci-v1/final.json':
                    value = {'commit': commit, 'all_four_jobs_successful': True,
                        'run': {'head_sha': commit, 'event': 'push', 'run_attempt': 1,
                                'status': 'completed', 'conclusion': 'success', 'id': 1},
                        'jobs': [{'name': name, 'status': 'completed', 'conclusion': 'success'}
                                 for name in ('lean', 'browser', 'python (3.11)', 'python (3.12)')]}
                elif relative.startswith('.cache/phase2-growth-clean-package-v1/'):
                    value = {'commit': commit, 'exit_code': 0, 'source_unchanged': True,
                             'head_unchanged': True, 'worktree_clean': True,
                             'runtime_before': manifest, 'runtime_after': manifest}
                elif relative == '.cache/phase2-growth-shape-operations-v1/production/final.json':
                    value = {'status': 'COMPLETE_TWO_IDENTICAL_DIAGNOSES', 'commit': commit,
                        'public_sha256': hashlib.sha256(shape_raw).hexdigest(),
                        'reason': 'GROWTH_HINT_SHAPE_MATCH',
                        'growth_hint_shape': 'MATCHES_RETAINED_APPNOTE_SHAPE',
                        'scientific_schema_approved': False}
                elif relative.startswith('.cache/li-v3-custody/growth-hint-shape-v1/'):
                    return shape_raw
                elif relative == fixture.diagnostic.PREREQUISITE:
                    return b'SYNTHETIC_PREREQUISITE'
                else: raise AssertionError('unexpected path')
                return json.dumps(value).encode()
            fake = SimpleNamespace(custody=fixture.diagnostic.custody,
                PREREQUISITE=fixture.diagnostic.PREREQUISITE,
                _validate_prerequisite=lambda _: fixture.diagnostic.PREREQUISITE_SHA256)
            def run_command(*args):
                called.append(args[1])
                raise env['Stop']('DEMONSTRATION_STOPS_WITHOUT_PROCESS')
            env.update(store=store, read=read, run_command=run_command,
                state=lambda *args: (manifest, {'commit': commit}),
                importlib=SimpleNamespace(import_module=lambda name: fake))
            selected = [node for node in ast.parse(RAW).body
                        if isinstance(node, (ast.ClassDef, ast.FunctionDef))
                        and node.name in ('Stop', 'require', 'Parser', 'main')]
            exec(compile(ast.Module(body=selected, type_ignores=[]), str(SOURCE)+':extracted', 'exec'), env)
            with patch('sys.stdout', io.StringIO()):
                result = env['main'](['--artifact-review', '.cache/full.json',
                                      '--additive-review', '.cache/additive.json'])
            self.assertEqual(result, 2)
            self.assertEqual(called, [], 'Inconsistent prior shape reached the new command boundary')


if __name__ == '__main__':
    unittest.main()
