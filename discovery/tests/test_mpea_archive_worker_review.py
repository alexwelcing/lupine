"""Constructed worker orchestration checks; dependencies are explicit stubs.

No scientific input files, registry, allocation provider, namespace process or
live registration/network endpoint is accessed by these unit checks.
"""
import contextlib
import dataclasses
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest import mock

ROOT = next(path for path in Path(__file__).resolve().parents if (path / 'src/lupine_discovery/decision_pool.py').is_file())
SOURCE = ROOT / 'scripts/mpea_archive_worker.py'
spec = importlib.util.spec_from_file_location('independent_archive_worker', SOURCE)
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)
STAGES = ('allocation', 'input_freeze', 'development', 'rank_freeze', 'reserved', 'calibration', 'replay', 'evaluation')


def _temporary_directory():
    directory = ROOT / '.cache/reviewer-controls'
    directory.mkdir(parents=True, exist_ok=True)
    return tempfile.TemporaryDirectory(dir=directory, prefix='mpea-launcher-')


def canonical(v):
    return json.dumps(v, sort_keys=True, separators=(',', ':')).encode()


class FixtureError(Exception):
    def __init__(self, code):
        self.code = code
        super().__init__('sensitive synthetic exception must not escape')


@dataclasses.dataclass
class Result:
    status: str
    store: object
    fit: object = None
    ranks: tuple = ()
    completeness: object = None
    plans: tuple = ()
    evaluation: object = None
    aggregates: object = None
    access: tuple = ()
    reasons: tuple = ()
    source_captures: int = 0
    captured_bytes: int = 0
    completed_policy_runs: int = 0


class WorkerReview(unittest.TestCase):
    def setUp(self):
        self.temporary = _temporary_directory()
        self.addCleanup(self.temporary.cleanup)
        self.events, self.markers, self.published = [], [], []
        self.fail_at = None
        self.result_status = 'COMPLETE'
        self.result_reasons = ()
        self.registration = types.SimpleNamespace(binding={'fixture': True}, manifest_files={
            'discovery/docs/mpea-column-mapping-v1.json': 'b' * 64,
            'discovery/reports/mpea-row-metadata-v1.json': 'c' * 64,
            'discovery/reports/mpea-formula-tokens-v1.json': 'd' * 64})
        self.store = None
        owner = self

        class Store:
            def __init__(self, attempt, binding, source, *, execution_kind):
                owner.events.append(('store', attempt, execution_kind))
                self.execution_kind, self.stages = execution_kind, []
                self.path = Path(owner.temporary.name)
                self._terminal, self.closed, self._directory_fd = False, False, 99
                self._assert_location = lambda: None
                owner.store = self
            def commit(self, stage, payload, **kwargs):
                owner.events.append(('commit', stage, kwargs.get('status', 'COMPLETE')))
                if stage != STAGES[len(self.stages)]:
                    raise AssertionError('duplicate/skipped stage')
                self.stages.append(stage)
                self._terminal = kwargs.get('status') == 'BLOCKED'
                return {'scientific_sha256': self.stage_identity(stage)['scientific_sha256']}
            def stage_identity(self, stage):
                return {'scientific_sha256': hashlib.sha256(stage.encode()).hexdigest()}
            def scientific_digests(self):
                return tuple((stage, self.stage_identity(stage)['scientific_sha256']) for stage in self.stages)
            def _read_exact(self, path, sha):
                owner.events.append(('readback', str(path)))
            def close(self):
                self.closed = True

        def gate(path, capture, expected):
            self.events.append(('registration', path, capture, expected))
            if self.fail_at == 'registration':
                raise FixtureError('REGISTRATION_MISMATCH')
            return self.registration
        def metadata(reg):
            self.events.append(('metadata',))
            if self.fail_at == 'metadata':
                raise FixtureError('METADATA_COUNT_MISMATCH')
            return 'constructed metadata'
        def allocate(meta, reg, store, kind, original_allocation=None):
            self.events.append(('allocate', kind, original_allocation))
            if self.fail_at == 'allocation':
                raise FixtureError('ALLOCATION_ALREADY_ATTEMPTED')
            store.commit('allocation', {})
            return types.SimpleNamespace(allocation_identity=store.stage_identity('allocation'))
        def original(*args):
            self.events.append(('verify_original', args))
            return 'verified constructed original'
        self.registration_module = types.SimpleNamespace(verify_worker_registration=gate,
            load_public_metadata=metadata, allocate=allocate, load_original_allocation_bytes=original)

        def emit(fd, value):
            self.events.append(('marker', value['event'], value.get('stage')))
            if self.fail_at == 'START_ACK' and value['event'] == 'START':
                raise FixtureError('STAGE_ORDER_VIOLATION')
            self.markers.append(dict(value))
        self.supervisor = types.SimpleNamespace(emit_marker=emit, STOP_REASONS={
            'INTERNAL_FAILURE', 'REGISTRATION_MISMATCH', 'METADATA_COUNT_MISMATCH',
            'ALLOCATION_ALREADY_ATTEMPTED', 'INPUT_IDENTITY_MISMATCH',
            'DEVELOPMENT_ROWS_BELOW_50', 'STAGE_ORDER_VIOLATION'})

        def execute(reg, meta, allocation, store, feature, *, registration_module, checkpoint,
                    allocation_marker_emitted=False):
            self.events.append(('driver', feature, allocation_marker_emitted))
            self.assertTrue(allocation_marker_emitted)
            if self.fail_at == 'driver':
                raise RuntimeError('sensitive synthetic driver failure')
            for stage in STAGES[1:]:
                if stage == 'development':
                    checkpoint({'event': 'TARGET_PHASE_BEGIN'})
                    self.events.append(('constructed_decoder',))
                store.commit(stage, {})
                checkpoint({'event': 'STAGE_SEALED', 'stage': stage,
                            'scientific_sha256': store.stage_identity(stage)['scientific_sha256']})
                if self.result_status == 'NO_GO_INSUFFICIENT_DEVELOPMENT' and stage == 'development':
                    break
            return Result(self.result_status, store, reasons=self.result_reasons)
        def exclusive(path, raw, **kwargs):
            self.events.append(('attempt_record', str(path)))
            self.published.append(json.loads(raw))
        self.driver = types.SimpleNamespace(run_registered=execute, ArchiveResult=Result, _seal_result=lambda result: result,
            persistence=types.SimpleNamespace(ProductionStageStore=Store, STAGES=STAGES),
            helpers=types.SimpleNamespace(ROLES=('DEVELOPMENT', 'CALIBRATION', 'EVALUATION')),
            io=types.SimpleNamespace(_loads=json.loads, digest=lambda v: hashlib.sha256(canonical(v)).hexdigest(),
                                     canonical=canonical, _exclusive=exclusive))
        original_stage = canonical({'content_sha256': 'e' * 64, 'scientific_sha256': 'f' * 64,
                                    'payload': {'route_artifact': {'bytes_sha256': 'a' * 64}}})
        def capture(path, cap):
            self.events.append(('capture', str(path), cap))
            if Path(path).name == 'stage-00-allocation.json':
                return original_stage
            return b'{"constructed_original_routes":true}'
        self.custody = types.SimpleNamespace(SOURCE={'fixture': True}, capture=capture)
        def project(result, **kwargs):
            self.events.append(('project', result.status, dict(kwargs['usage'])))
            if self.fail_at == 'projector':
                raise FixtureError('INPUT_IDENTITY_MISMATCH')
            return {'status': result.status, 'reasons': list(result.reasons)}
        def write(result, projection):
            self.events.append(('public_write', projection))
            return {'bytes_sha256': 'a' * 64, 'content_sha256': 'b' * 64, 'scientific_sha256': 'c' * 64}
        self.bridge = types.SimpleNamespace(project=project, write=write,
            report=types.SimpleNamespace(Usage=lambda wall, cpu, rss: {'wall': wall, 'cpu': cpu, 'rss': rss}))
        self.modules = {'mpea_registration_allocation': self.registration_module,
                        'mpea_study_supervisor': self.supervisor, 'mpea_archive_driver': self.driver,
                        'mpea_archive_custody': self.custody, 'mpea_archive_report': self.bridge}

    def invoke(self, kind='PRODUCTION_ARCHIVE', original='-'):
        args = ['constructed-registration.json', 'constructed-capture.json', 'a' * 64,
                'constructed-attempt', 'constructed-features.json', kind, original]
        with mock.patch.dict(sys.modules, self.modules), \
             mock.patch.dict(os.environ, {'LUPINE_MARKER_FD': '42'}), \
             mock.patch.object(worker, '__file__', str(worker.ROOT / 'scripts/mpea_archive_worker.py')):
            return worker.main(args)

    def test_registration_failure_stops_before_metadata_store_allocation_or_projection(self):
        self.fail_at = 'registration'
        self.assertEqual(self.invoke(), 0)
        self.assertEqual([e[0] for e in self.events], ['marker', 'registration', 'marker'])
        self.assertEqual(self.markers[-1], {'event': 'STOP', 'status': 'BLOCKED', 'reason': 'REGISTRATION_MISMATCH'})
        self.assertEqual(self.published, [])

    def test_start_ack_failure_cannot_reach_registration(self):
        self.fail_at = 'START_ACK'
        with self.assertRaises(FixtureError):
            self.invoke()
        self.assertEqual([e[0] for e in self.events], ['marker'])

    def test_allocation_failure_publishes_only_blocked_and_never_calls_driver(self):
        self.fail_at = 'allocation'
        self.assertEqual(self.invoke(), 0)
        self.assertNotIn('driver', [e[0] for e in self.events])
        self.assertEqual(self.published[0]['status'], 'BLOCKED')
        self.assertEqual(self.published[0]['reasons'], ['ALLOCATION_ALREADY_ATTEMPTED'])
        self.assertEqual(self.markers[-1]['event'], 'STOP')
        self.assertTrue(self.store.closed)

    def test_complete_stage_order_single_allocation_and_seal_before_done(self):
        self.assertEqual(self.invoke(), 0)
        self.assertEqual([v['stage'] for v in self.markers if v['event'] == 'STAGE_SEALED'], list(STAGES))
        self.assertEqual(self.markers[-1], {'event': 'DONE'})
        names = [e[0] for e in self.events]
        self.assertLess(names.index('registration'), names.index('metadata'))
        self.assertLess(names.index('metadata'), names.index('allocate'))
        self.assertLess(names.index('attempt_record'), len(names) - 1)
        self.assertEqual(self.published[0]['status'], 'COMPLETE')
        self.assertTrue(self.store.closed)

    def test_reproduction_verifies_captured_original_before_allocate_and_driver(self):
        self.assertEqual(self.invoke('REPRODUCTION_FIXED_ALLOCATION', 'constructed-original'), 0)
        names = [e[0] for e in self.events]
        self.assertLess(names.index('registration'), names.index('capture'))
        self.assertLess(names.index('verify_original'), names.index('allocate'))
        self.assertEqual([e for e in self.events if e[0] == 'allocate'][0][2], 'verified constructed original')
        self.assertEqual(self.published[0]['execution_kind'], 'REPRODUCTION_FIXED_ALLOCATION')

    def test_early_no_go_never_seals_reserved_or_claims_complete(self):
        self.result_status = 'NO_GO_INSUFFICIENT_DEVELOPMENT'
        self.result_reasons = ('DEVELOPMENT_ROWS_BELOW_50',)
        self.assertEqual(self.invoke(), 0)
        self.assertEqual(self.store.stages, ['allocation', 'input_freeze', 'development'])
        self.assertEqual(self.markers[-1]['status'], 'NO_GO_INSUFFICIENT_DEVELOPMENT')
        self.assertFalse(any(m['event'] == 'DONE' for m in self.markers))

    def test_unknown_exception_text_is_suppressed_and_blocked(self):
        self.fail_at = 'driver'
        stdout, stderr = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            self.assertEqual(self.invoke(), 0)
        self.assertEqual(stdout.getvalue() + stderr.getvalue(), '')
        self.assertNotIn('sensitive', json.dumps(self.published + self.markers))
        self.assertEqual(self.published[0]['reasons'], ['INTERNAL_FAILURE'])

    def test_projector_failure_never_writes_attempt_result_or_done(self):
        self.fail_at = 'projector'
        self.assertEqual(self.invoke(), 0)
        self.assertEqual(self.published, [])
        self.assertEqual(self.markers[-1], {'event': 'STOP', 'status': 'BLOCKED', 'reason': 'INPUT_IDENTITY_MISMATCH'})
        self.assertTrue(self.store.closed)

    def test_unpromoted_worker_cannot_execute_from_scratch(self):
        with mock.patch.dict(sys.modules, self.modules), mock.patch.dict(os.environ, {'LUPINE_MARKER_FD': '42'}), \
             mock.patch.object(worker, '__file__', str(Path(self.temporary.name) / 'unpromoted-worker.py')):
            self.assertEqual(worker.main(['r', 'c', 'a' * 64, 'attempt', 'features', 'PRODUCTION_ARCHIVE', '-']), 2)
        self.assertEqual(self.events, [])


if __name__ == '__main__':
    unittest.main()
