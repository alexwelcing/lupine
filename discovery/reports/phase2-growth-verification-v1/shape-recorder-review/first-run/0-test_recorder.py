"""AST-extracted recorder helpers only; synthetic reports and mocked operations."""
import argparse
import ast
from contextlib import ExitStack
import copy
import datetime
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time
from types import SimpleNamespace
import unittest
from unittest.mock import patch

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
SOURCE = ROOT / '.cache/phase2-growth-shape-operations-v1/run_after_ci.py'
SOURCE_SHA = 'c0e5e38f4669cd339002defd7c563afec6ea931525b4faad625c05fdd4af555d'
RAW = SOURCE.read_bytes()
assert hashlib.sha256(RAW).hexdigest() == SOURCE_SHA
spec = importlib.util.spec_from_file_location('growth_recorder_fixture_only',
    ROOT / '.cache/phase2-growth-hint-production-candidate-v1/promotion/tests/test_li_v3_growth_hint_shape.py')
fixture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fixture)
diagnostic = fixture.candidate
IDENTITY = {'mode': 'synthetic_mock_identity', 'commit': 'a' * 40}


def helpers():
    names = {'Stop', 'require', 'now', 'digest', 'validate_report', 'run_command', 'Parser', 'main'}
    tree = ast.parse(RAW)
    selected = [node for node in tree.body
                if isinstance(node, (ast.ClassDef, ast.FunctionDef)) and node.name in names]
    assert {node.name for node in selected} == names
    env = {'Path': Path, 'argparse': argparse, 'datetime': datetime, 'hashlib': hashlib,
           'json': json, 'time': time, 'signal': signal, 'COMMIT': 'a' * 40,
           'BRANCH': 'research/lupine-discovery', 'COMMAND_TIMEOUT': 100,
           '__file__': '/SYNTHETIC_ROOT/recorder.py', 'ROOT': Path('/SYNTHETIC_ROOT'),
           'sys': SimpleNamespace(executable='/synthetic/python', path=[], dont_write_bytecode=False),
           'os': SimpleNamespace(environ={'PYTHONPATH': 'CANARY', 'PYTHONHOME': 'CANARY'},
                                 name='posix', path=SimpleNamespace(lexists=lambda _: False))}
    exec(compile(ast.Module(body=selected, type_ignores=[]), str(SOURCE) + ':extracted', 'exec'), env)
    return env


def report(reason='GROWTH_HINT_SHAPE_MATCH'):
    signature = 0 if reason == 'GROWTH_SIGNATURE_MISMATCH' else 0xA028
    padding = b'x' + b'\0' * 511 if reason == 'GROWTH_PADDING_NONZERO' else b'\0' * 512
    value = diagnostic.inspect_synthetic_growth_hint(fixture.archive([
        fixture.hint(65535, padding, signature)]))
    assert value['reason'] == reason
    value.update(schema=diagnostic.PRODUCTION_SCHEMA, profile=diagnostic.PRODUCTION_PROFILE,
                 synthetic_fixture=False, source_identity_verified=True,
                 implementation=copy.deepcopy(IDENTITY),
                 capture_identity=diagnostic.predecessor.compatible._capture_identity(),
                 prerequisite_receipt_sha256=diagnostic.PREREQUISITE_SHA256,
                 prerequisite_producer_commit=diagnostic.PREREQUISITE_PRODUCER,
                 production_prerequisite_status='VERIFIED',
                 observed={'sha256': diagnostic.predecessor.header_diagnostic.OBJECT_SHA256,
                           'bytes': diagnostic.custody.SOURCE_BYTES, 'md5': diagnostic.custody.SOURCE_MD5})
    return value


class RecorderTests(unittest.TestCase):
    def setUp(self):
        self.forbidden = ExitStack()
        self.addCleanup(self.forbidden.close)
        for module, name in ((diagnostic, 'production_context'),
                             (diagnostic.predecessor, 'production_context'),
                             (diagnostic.custody, '_read_relative'),
                             (diagnostic.custody, '_verify_source'),
                             (diagnostic.custody, '_write_at')):
            self.forbidden.enter_context(patch.object(module, name,
                side_effect=AssertionError('real source operation forbidden')))
        for name in ('subprocess.run', 'subprocess.check_output', 'subprocess.Popen',
                     'urllib.request.urlopen', 'socket.create_connection'):
            self.forbidden.enter_context(patch(name,
                side_effect=AssertionError('external operation forbidden')))
        self.e = helpers()
        self.temporary = tempfile.TemporaryDirectory(prefix='synthetic-', dir=BASE)
        self.addCleanup(self.temporary.cleanup)
        self.base = Path(self.temporary.name) / 'production'
        self.e['BASE'] = self.base
        self.manifest = {'synthetic.py': 'c' * 64}
        self.runtime = SimpleNamespace(source_files=lambda _: dict(self.manifest))
        self.e['state'] = lambda *args: (dict(self.manifest), copy.deepcopy(IDENTITY))
        self.e['store'] = self.store
        self.e['read'] = self.read
        self.records = {}
        self.launched = []
        self.reason = 'GROWTH_HINT_SHAPE_MATCH'
        self.invalid = False
        self.mismatch = False
        self.gate_drift = False
        self.closed = []
        self.e['os'].killpg = lambda *args: self.closed.append(args)
        self.e['subprocess'] = SimpleNamespace(Popen=self.popen, TimeoutExpired=subprocess.TimeoutExpired)
        self.e['importlib'] = SimpleNamespace(import_module=self.module)
        self.output = io.StringIO()
        self.patch_stdout = patch('sys.stdout', self.output)
        self.patch_stdout.start()
        self.addCleanup(self.patch_stdout.stop)

    def module(self, name):
        if name == 'runtime_manifest':
            return self.runtime
        if name == 'li_v3_growth_hint_shape':
            # Delegates pure template/constants, never the real production guard.
            proxy = SimpleNamespace(**{name: getattr(diagnostic, name) for name in (
                '_result', 'predecessor', 'custody', 'PRODUCTION_SCHEMA', 'PRODUCTION_PROFILE',
                'PREREQUISITE', 'PREREQUISITE_SHA256', 'PREREQUISITE_PRODUCER')})
            proxy._validate_prerequisite = lambda _: diagnostic.PREREQUISITE_SHA256
            return proxy
        raise AssertionError('unexpected import')

    def store(self, path, value):
        assert path.is_relative_to(self.base)
        assert path not in self.records
        self.records[path] = copy.deepcopy(value)

    def popen(self, command, **kwargs):
        self.assertEqual(command[1:4], ['scripts/li_v3_growth_hint_shape.py', 'diagnose', '--run'])
        self.assertEqual(kwargs['cwd'], Path('/SYNTHETIC_ROOT'))
        self.assertTrue(kwargs['start_new_session'])
        self.assertNotIn('PYTHONPATH', kwargs['env'])
        self.assertNotIn('PYTHONHOME', kwargs['env'])
        self.launched.append(command)
        value = report(self.reason)
        if self.invalid:
            value['reason'] = 'GROWTH_PAYLOAD_INSPECTION_FAILED'
        self.current_raw = diagnostic.custody.canonical(value)
        kwargs['stdout'].write(self.current_raw)
        return SimpleNamespace(wait=lambda timeout: 2, poll=lambda: 2, pid=123456)

    def read(self, path):
        path = Path(path)
        if path.is_relative_to(self.base):
            return path.read_bytes()  # Only our own generated stdout/stderr files.
        relative = str(path.relative_to('/SYNTHETIC_ROOT'))
        if relative == 'recorder.py':
            return b'SYNTHETIC_RECORDER'
        if relative in ('.cache/full-review.json', '.cache/additive-review.json'):
            return json.dumps({'status': 'PASS', 'commit': 'a' * 40}).encode()
        if relative == '.cache/phase2-growth-ci-v1/final.json':
            return json.dumps({'commit': 'a' * 40, 'all_four_jobs_successful': True,
                'run': {'head_sha': 'a' * 40, 'id': 123, 'event': 'push', 'run_attempt': 1,
                        'status': 'completed', 'conclusion': 'success'},
                'jobs': [{'name': name, 'status': 'completed', 'conclusion': 'success'}
                         for name in ('lean', 'browser', 'python (3.11)', 'python (3.12)')]}).encode()
        if relative.startswith('.cache/phase2-growth-clean-package-v1/'):
            return json.dumps({'commit': 'a' * 40, 'exit_code': 0, 'source_unchanged': True,
                'head_unchanged': True, 'worktree_clean': True,
                'runtime_before': self.manifest, 'runtime_after': self.manifest}).encode()
        if relative == diagnostic.PREREQUISITE:
            return b'SYNTHETIC_PREREQUISITE'
        if relative.startswith('.cache/li-v3-custody/growth-hint-shape-v1/'):
            return self.current_raw + (b' ' if self.mismatch else b'')
        if relative == 'gate.json':
            return b'CHANGED' if self.gate_drift else b'GATE'
        raise AssertionError('forbidden path read')

    def validate(self, value):
        return self.e['validate_report'](diagnostic.custody.canonical(value), diagnostic, IDENTITY)

    def test_all_three_complete_classifications_are_accepted(self):
        for reason in ('GROWTH_HINT_SHAPE_MATCH', 'GROWTH_SIGNATURE_MISMATCH', 'GROWTH_PADDING_NONZERO'):
            value = report(reason)
            self.assertEqual(self.validate(value), value)

    def test_closed_shape_type_and_exposure_drift_are_rejected(self):
        mutations = [
            lambda v: v.update(unexpected='ARBITRARY_CANARY'),
            lambda v: v.update(source_identity_verified=1),
            lambda v: v.update(exactly_one_a220_record=1),
            lambda v: v.update(signature_matches=1),
            lambda v: v.update(padding_all_zero=1),
            lambda v: v.update(initial_padding_semantics='BOUND'),
            lambda v: v.update(row_count=0),
            lambda v: v['observed'].update(bytes=float(diagnostic.custody.SOURCE_BYTES)),
            lambda v: v['implementation'].update(extra='x'),
            lambda v: v['exposure'].update(growth_hint_fixed_words_interpreted=1),
            lambda v: v['exposure'].update(growth_hint_padding_scan_completed=False),
            lambda v: v['exposure'].update(target_bearing_source_bytes_read=None),
            lambda v: v['exposure'].update(xml_decoded=True),
            lambda v: v['exposure'].update(members_decompressed=['canary']),
            lambda v: v['exposure'].update(fits=False),
            lambda v: v['exposure'].update(archive_close_error='CANARY'),
            lambda v: v['exposure'].update(archive_close_completed=False),
            lambda v: v['exposure'].update(extra=False),
        ]
        for mutate in mutations:
            value = report()
            mutate(value)
            with self.assertRaises(self.e['Stop']):
                self.validate(value)

    def test_negative_reason_cannot_claim_positive_or_skipped_exposure(self):
        value = report('GROWTH_SIGNATURE_MISMATCH')
        for key in ('growth_hint_padding_scan_started', 'growth_hint_padding_scan_completed',
                    'growth_hint_payload_interpretation_completed'):
            changed = copy.deepcopy(value)
            changed['exposure'][key] = True
            with self.assertRaises(self.e['Stop']):
                self.validate(changed)
        changed = report('GROWTH_PADDING_NONZERO')
        changed['padding_all_zero'] = True
        with self.assertRaises(self.e['Stop']):
            self.validate(changed)

    def test_noncanonical_duplicate_and_unexpected_error_are_rejected(self):
        value = report()
        raw = diagnostic.custody.canonical(value)
        for malformed in (raw + b' ', raw[:-2] + b',"reason":"GROWTH_HINT_SHAPE_MATCH"}\n'):
            with self.assertRaises(self.e['Stop']):
                self.e['validate_report'](malformed, diagnostic, IDENTITY)
        value['reason'] = 'INTERNAL_FAILURE'
        with self.assertRaises(self.e['Stop']):
            self.validate(value)

    def call_command(self):
        self.base.mkdir()
        return self.e['run_command'](self.base / '1', 1, self.runtime, diagnostic,
            self.manifest, IDENTITY, 123, self.e['digest'](b'SYNTHETIC_RECORDER'),
            {'gate.json': self.e['digest'](b'GATE')})

    def test_persisted_report_stdout_disagreement_is_retained_and_blocks(self):
        self.mismatch = True
        with self.assertRaises(self.e['Stop']):
            self.call_command()
        receipt = self.records[self.base / '1/execution.json']
        self.assertEqual(receipt['public_validation_error'], 'PUBLIC_RECEIPT_MISMATCH')
        self.assertFalse(receipt['public_report_canonical_and_closed'])
        self.assertIsNone(receipt['exposure'])
        self.assertTrue((self.base / '1/stdout.txt').is_file())

    def test_post_command_gate_drift_stops_after_retaining_complete_result(self):
        self.gate_drift = True
        with self.assertRaises(self.e['Stop']):
            self.call_command()
        receipt = self.records[self.base / '1/execution.json']
        self.assertEqual(receipt['state_recheck_error'], 'GATE_RECEIPT_CHANGED')
        self.assertTrue(receipt['public_report_canonical_and_closed'])
        self.assertEqual(receipt['reason'], 'GROWTH_HINT_SHAPE_MATCH')

    def test_unexpected_failure_stops_main_before_second_run(self):
        self.invalid = True
        self.assertEqual(self.e['main'](['--artifact-review', '.cache/full-review.json',
                                        '--additive-review', '.cache/additive-review.json']), 2)
        self.assertEqual(len(self.launched), 1)
        receipt = self.records[self.base / '1/execution.json']
        self.assertEqual(receipt['public_validation_error'], 'DIAGNOSIS_REASON_INVALID')
        self.assertEqual(self.records[self.base / 'stopped.json']['status'], 'STOP_PRESERVE_EVIDENCE')
        self.assertNotIn(self.base / '2/execution.json', self.records)

    def test_complete_negative_can_repeat_same_fixed_report(self):
        self.reason = 'GROWTH_SIGNATURE_MISMATCH'
        self.assertEqual(self.e['main'](['--artifact-review', '.cache/full-review.json',
                                        '--additive-review', '.cache/additive-review.json']), 0)
        self.assertEqual(len(self.launched), 2)
        self.assertEqual(self.records[self.base / 'final.json']['reason'], self.reason)
        self.assertFalse(self.records[self.base / 'final.json']['scientific_schema_approved'])

    def test_unbound_commit_does_not_attempt_any_preflight_or_command(self):
        self.e['COMMIT'] = 'UNBOUND_COMMIT'
        self.assertEqual(self.e['main'](['--artifact-review', '.cache/full-review.json',
                                        '--additive-review', '.cache/additive-review.json']), 2)
        self.assertEqual(self.launched, [])
        self.assertEqual(self.records, {})
        self.assertIn('SOURCE_COMMIT_UNBOUND', self.output.getvalue())


if __name__ == '__main__':
    unittest.main()
