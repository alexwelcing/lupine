"""Extracted recorder helpers with generated reports and fully mocked operations."""
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
import struct
import subprocess
import tempfile
import time
from types import SimpleNamespace
import unittest
from unittest.mock import patch

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
SOURCE = ROOT / '.cache/phase2-growth-envelope-operations-v1/run_after_ci.py'
RAW = SOURCE.read_bytes()
# This file is not invoked until the parent supplies and freezes a repaired hash.
EXPECTED_SOURCE = 'b13232eb55efec6a6fadfd5f900bc3f3fd9a2b44fa3ac91bb3a763e7c80a84b7'
spec = importlib.util.spec_from_file_location('envelope_recorder_fixture',
    ROOT / '.cache/phase2-growth-envelope-candidate-v1/promotion/tests/test_li_v3_growth_envelope.py')
fixture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fixture)
M = fixture.M
IDENTITY = {'mode': 'synthetic_mock_identity', 'commit': 'a' * 40}


def shape_report():
    raw = fixture.archive(extras={0: fixture.shape(512, 65535)})[0]
    value = M.growth.inspect_synthetic_growth_hint(raw)
    value.update(schema=M.growth.PRODUCTION_SCHEMA, profile=M.growth.PRODUCTION_PROFILE,
        synthetic_fixture=False, source_identity_verified=True, implementation=copy.deepcopy(IDENTITY),
        capture_identity=M.growth.predecessor.compatible._capture_identity(),
        prerequisite_receipt_sha256=M.PREREQUISITE_SHA256,
        prerequisite_producer_commit=M.PREREQUISITE_PRODUCER,
        production_prerequisite_status='VERIFIED', observed={
            'bytes': M.custody.SOURCE_BYTES, 'md5': M.custody.SOURCE_MD5,
            'sha256': M.header_diagnostic.OBJECT_SHA256})
    for key in ('raw_buffer_read_started', 'raw_buffer_read_completed', 'target_bearing_source_bytes_read'):
        value['exposure'][key] = True
    return value


def report(kind='accepted'):
    data = fixture.parts()
    extras = {0: fixture.shape(512, 65535)}
    if kind == 'later_shape':
        extras[7] = fixture.shape(0, signature=0)
    if kind == 'xml':
        data[0] = (data[0][0], b'<!DOCTYPE secret><bad/>')
    raw = fixture.archive(data, extras=extras)[0]
    if kind == 'central':
        raw = bytearray(raw)
        struct.pack_into('<H', raw, fixture.central_positions(raw)[-1] + 32, 1)
        raw = bytes(raw)
    value = M.inspect_synthetic_envelope(raw)
    expected = {'accepted': 'SCHEMA_UNCONFIRMED', 'central': 'CENTRAL_DIRECTORY_DECLARATION_INVALID',
                'later_shape': 'LOCAL_GROWTH_SHAPE_UNSUPPORTED', 'xml': 'XML_PROFILE_UNSUPPORTED'}
    assert value['reason'] == expected[kind]
    value.update(synthetic_fixture=False, source_identity_verified=True,
        implementation=copy.deepcopy(IDENTITY), capture_receipt_sha256=M.header_diagnostic.CAPTURE_SHA256,
        prerequisite_receipt_sha256=M.PREREQUISITE_SHA256,
        prerequisite_producer_commit=M.PREREQUISITE_PRODUCER,
        observed={'bytes': M.custody.SOURCE_BYTES, 'md5': M.custody.SOURCE_MD5,
                  'sha256': M.header_diagnostic.OBJECT_SHA256})
    for key in ('raw_workbook_buffer_read', 'target_bearing_source_bytes_acquired',
                'raw_buffer_read_started', 'raw_buffer_read_completed', 'target_bearing_source_bytes_read'):
        value['exposure'][key] = True
    return value


def helpers():
    assert hashlib.sha256(RAW).hexdigest() == EXPECTED_SOURCE
    names = {'Stop', 'require', 'now', 'digest', 'validate_shape_report',
             'validate_report', 'run_command', 'Parser', 'main'}
    selected = [n for n in ast.parse(RAW).body
                if isinstance(n, (ast.FunctionDef, ast.ClassDef)) and n.name in names]
    assert {n.name for n in selected} == names
    env = {'Path': Path, 'argparse': argparse, 'datetime': datetime, 'hashlib': hashlib,
           'json': json, 'time': time, 'signal': signal, 'COMMIT': 'a' * 40,
           'BRANCH': 'research/lupine-discovery', 'COMMAND_TIMEOUT': 100,
           '__file__': '/SYNTHETIC_ROOT/recorder.py', 'ROOT': Path('/SYNTHETIC_ROOT'),
           'sys': SimpleNamespace(executable='/synthetic/python', path=[], dont_write_bytecode=False),
           'os': SimpleNamespace(environ={'PYTHONPATH': 'CANARY', 'PYTHONHOME': 'CANARY'},
               name='posix', path=SimpleNamespace(lexists=lambda _: False)), 'SHAPE_REPORT': shape_report()}
    exec(compile(ast.Module(body=selected, type_ignores=[]), str(SOURCE)+':extracted', 'exec'), env)
    return env


class RecorderTests(unittest.TestCase):
    def setUp(self):
        self.forbidden = ExitStack()
        self.addCleanup(self.forbidden.close)
        for module, name in ((M, 'production_context'), (M.growth, 'production_context'),
                             (M.predecessor, 'production_context'),
                             (M.custody, '_read_relative'), (M.custody, '_verify_source'),
                             (M.custody, '_write_at')):
            self.forbidden.enter_context(patch.object(module, name,
                side_effect=AssertionError('real source operation forbidden')))
        for name in ('subprocess.run', 'subprocess.check_output', 'subprocess.Popen',
                     'urllib.request.urlopen', 'socket.create_connection'):
            self.forbidden.enter_context(patch(name, side_effect=AssertionError('external operation forbidden')))
        self.e = helpers()
        self.temporary = tempfile.TemporaryDirectory(prefix='synthetic-', dir=BASE)
        self.addCleanup(self.temporary.cleanup)
        self.base = Path(self.temporary.name) / 'production'
        self.e['BASE'] = self.base
        self.manifest = {'synthetic.py': 'c' * 64}
        self.runtime = SimpleNamespace(source_files=lambda _: dict(self.manifest))
        self.e['state'] = lambda *args: (dict(self.manifest), copy.deepcopy(IDENTITY))
        self.e['store'], self.e['read'] = self.store, self.read
        self.records, self.launched = {}, []
        self.kind = 'accepted'
        self.invalid = self.mismatch = self.gate_drift = self.shape_pair_mismatch = False
        self.shape = shape_report()
        self.e['os'].killpg = lambda *args: None
        self.e['subprocess'] = SimpleNamespace(Popen=self.popen, TimeoutExpired=subprocess.TimeoutExpired)
        self.e['importlib'] = SimpleNamespace(import_module=self.module)
        self.output = io.StringIO()
        self.forbidden.enter_context(patch('sys.stdout', self.output))

    def module(self, name):
        if name == 'runtime_manifest': return self.runtime
        if name == 'li_v3_growth_envelope':
            proxy = SimpleNamespace(**vars(M))
            proxy.growth = SimpleNamespace(**vars(M.growth))
            proxy.growth.production_context = lambda: copy.deepcopy(IDENTITY)
            proxy._validate_prerequisite = lambda _: M.PREREQUISITE_SHA256
            return proxy
        raise AssertionError('unexpected import')

    def store(self, path, value):
        assert path.is_relative_to(self.base)
        assert path not in self.records
        self.records[path] = copy.deepcopy(value)

    def popen(self, command, **kwargs):
        self.assertEqual(command[1:4], ['scripts/li_v3_growth_envelope.py', 'envelope', '--run'])
        self.assertTrue(kwargs['start_new_session'])
        self.assertNotIn('PYTHONPATH', kwargs['env'])
        self.assertNotIn('PYTHONHOME', kwargs['env'])
        self.launched.append(command)
        value = report(self.kind)
        if self.invalid: value['reason'] = 'INTERNAL_FAILURE'
        self.current_raw = M.custody.canonical(value)
        kwargs['stdout'].write(self.current_raw)
        return SimpleNamespace(wait=lambda timeout: 2, poll=lambda: 2, pid=123456)

    def read(self, path):
        path = Path(path)
        if path.is_relative_to(self.base): return path.read_bytes()
        relative = str(path.relative_to('/SYNTHETIC_ROOT'))
        if relative == 'recorder.py': return b'SYNTHETIC_RECORDER'
        if relative in ('.cache/full.json', '.cache/additive.json'):
            value = {'status': 'PASS', 'commit': 'a' * 40}
        elif relative == '.cache/phase2-growth-ci-v1/final.json':
            value = {'commit': 'a' * 40, 'all_four_jobs_successful': True,
                'run': {'head_sha': 'a' * 40, 'id': 123, 'event': 'push', 'run_attempt': 1,
                        'status': 'completed', 'conclusion': 'success'},
                'jobs': [{'name': name, 'status': 'completed', 'conclusion': 'success'}
                    for name in ('lean', 'browser', 'python (3.11)', 'python (3.12)')]}
        elif relative.startswith('.cache/phase2-growth-clean-package-v1/'):
            value = {'commit': 'a' * 40, 'exit_code': 0, 'source_unchanged': True,
                'head_unchanged': True, 'worktree_clean': True,
                'runtime_before': self.manifest, 'runtime_after': self.manifest}
        elif relative == '.cache/phase2-growth-shape-operations-v1/production/final.json':
            value = {'status': 'COMPLETE_TWO_IDENTICAL_DIAGNOSES', 'commit': 'a' * 40,
                'public_sha256': hashlib.sha256(M.custody.canonical(self.shape)).hexdigest(),
                'reason': 'GROWTH_HINT_SHAPE_MATCH', 'growth_hint_shape': 'MATCHES_RETAINED_APPNOTE_SHAPE',
                'scientific_schema_approved': False}
        elif relative.startswith('.cache/li-v3-custody/growth-hint-shape-v1/'):
            raw = M.custody.canonical(self.shape)
            return raw + (b' ' if self.shape_pair_mismatch and '/2/' in relative else b'')
        elif relative == M.PREREQUISITE: return b'SYNTHETIC_PREREQUISITE'
        elif relative.startswith('.cache/li-v3-custody/growth-envelope-v1/'):
            return self.current_raw + (b' ' if self.mismatch else b'')
        elif relative == 'gate.json': return b'CHANGED' if self.gate_drift else b'GATE'
        else: raise AssertionError('forbidden path')
        return json.dumps(value).encode()

    def main(self):
        return self.e['main'](['--artifact-review', '.cache/full.json', '--additive-review', '.cache/additive.json'])

    def validate(self, value):
        return self.e['validate_report'](M.custody.canonical(value), M, IDENTITY)

    def test_complete_and_partial_public_projections_match_generated_paths(self):
        for kind in ('accepted', 'central', 'later_shape', 'xml'):
            with self.subTest(kind=kind):
                value = report(kind)
                self.assertEqual(self.validate(value), value)

    def test_central_block_keeps_nested_cleanup_but_no_new_archive(self):
        value = report('central')
        self.assertTrue(value['exposure']['selected_growth']['archive_close_completed'])
        self.assertFalse(value['exposure']['archive_open_started'])
        self.assertFalse(value['exposure']['archive_close_started'])
        changed = copy.deepcopy(value)
        changed['exposure']['archive_close_completed'] = True
        with self.assertRaises(self.e['Stop']): self.validate(changed)

    def test_closed_counts_role_xml_and_identity_mutations_are_rejected(self):
        mutations = [
            lambda v: v.update(extra='CANARY'),
            lambda v: v.update(source_identity_verified=1),
            lambda v: v.update(archive_profile_accepted=1),
            lambda v: v.update(row_count=0),
            lambda v: v['observed'].update(bytes=float(M.custody.SOURCE_BYTES)),
            lambda v: v['selected_growth_check'].update(signature_matches=False),
            lambda v: v['exposure']['selected_growth'].update(raw_buffer_read_started=True),
            lambda v: v['exposure'].update(local_extra_areas_completed=True),
            lambda v: v['exposure'].update(local_extra_areas_completed=129),
            lambda v: v['exposure'].update(local_growth_fixed_words_interpreted=0),
            lambda v: v['exposure'].update(xml_decoding_completed=list(reversed(M.ENVELOPE_MEMBERS))),
            lambda v: v['exposure'].update(worksheet_cells_decoded=True),
            lambda v: v['exposure'].update(archive_close_error='CANARY'),
            lambda v: v['exposure'].update(archive_close_completed=False),
            lambda v: v['recognized_roles']['References'].update(ordinal=True),
            lambda v: v['recognized_roles']['References'].update(ordinal=3),
        ]
        for mutate in mutations:
            value = report(); mutate(value)
            with self.assertRaises(self.e['Stop']): self.validate(value)

    def test_partial_xml_does_not_disclose_roles(self):
        value = report('xml')
        self.assertIsNone(value['recognized_roles'])
        value['recognized_roles'] = {'References': {'present': True, 'ordinal': 1}}
        with self.assertRaises(self.e['Stop']): self.validate(value)

    def test_malformed_prior_shape_stops_before_directory_and_command(self):
        for mutate in (lambda v: v.update(padding_all_zero=False),
                       lambda v: v.update(signature_matches=1),
                       lambda v: v['exposure'].update(xml_decoded=True),
                       lambda v: v['exposure'].update(growth_hint_payload_interpretation_completed=False),
                       lambda v: v['implementation'].update(extra='CANARY')):
            self.shape = shape_report(); mutate(self.shape)
            self.assertEqual(self.main(), 2)
            self.assertEqual(self.launched, [])
            self.assertFalse(self.base.exists())
        self.assertIn('SHAPE_CLASSIFICATION_INVALID', self.output.getvalue())

    def test_prior_pair_disagreement_blocks_before_command(self):
        self.shape_pair_mismatch = True
        self.assertEqual(self.main(), 2)
        self.assertEqual(self.launched, [])
        self.assertIn('PRIOR_SHAPE_REPLAY_MISMATCH', self.output.getvalue())

    def test_complete_central_negative_replays_with_separate_lifecycles(self):
        self.kind = 'central'
        self.assertEqual(self.main(), 0)
        self.assertEqual(len(self.launched), 2)
        final = self.records[self.base / 'final.json']
        self.assertEqual(final['reason'], 'CENTRAL_DIRECTORY_DECLARATION_INVALID')
        self.assertFalse(final['archive_profile_accepted'])
        self.assertFalse(final['scientific_schema_approved'])

    def test_unexpected_error_stops_before_second_command(self):
        self.invalid = True
        self.assertEqual(self.main(), 2)
        self.assertEqual(len(self.launched), 1)
        self.assertEqual(self.records[self.base / '1/execution.json']['public_validation_error'],
                         'ENVELOPE_REASON_INVALID')
        self.assertNotIn(self.base / '2/execution.json', self.records)

    def test_persisted_stdout_mismatch_preserves_failure_and_stops(self):
        self.mismatch = True
        self.assertEqual(self.main(), 2)
        self.assertEqual(len(self.launched), 1)
        self.assertEqual(self.records[self.base / '1/execution.json']['public_validation_error'],
                         'PUBLIC_RECEIPT_MISMATCH')

    def test_post_gate_drift_preserves_report_but_stops(self):
        self.base.mkdir(); self.gate_drift = True
        with self.assertRaises(self.e['Stop']):
            self.e['run_command'](self.base / '1', 1, self.runtime, M, self.manifest, IDENTITY,
                123, self.e['digest'](b'SYNTHETIC_RECORDER'), {'gate.json': self.e['digest'](b'GATE')})
        receipt = self.records[self.base / '1/execution.json']
        self.assertEqual(receipt['state_recheck_error'], 'GATE_RECEIPT_CHANGED')
        self.assertTrue(receipt['public_report_canonical_and_closed'])

    def test_valid_envelope_pair_stays_scientifically_blocked(self):
        self.assertEqual(self.main(), 0)
        self.assertEqual(len(self.launched), 2)
        final = self.records[self.base / 'final.json']
        self.assertTrue(final['archive_profile_accepted'])
        self.assertFalse(final['scientific_schema_approved'])


if __name__ == '__main__':
    unittest.main()
