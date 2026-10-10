"""Independent parent dispatch probes with explicit synthetic dependency stubs."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest import mock

ROOT = next(path for path in Path(__file__).resolve().parents if (path / 'src/lupine_discovery/decision_pool.py').is_file())
SOURCE = ROOT / 'scripts/mpea_archive_run.py'
spec = importlib.util.spec_from_file_location('independent_archive_parent', SOURCE)
parent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parent)


def _temporary_directory():
    directory = ROOT / '.cache/reviewer-controls'
    directory.mkdir(parents=True, exist_ok=True)
    return tempfile.TemporaryDirectory(dir=directory, prefix='mpea-launcher-')


def canonical(v):
    return json.dumps(v, sort_keys=True, separators=(',', ':')).encode()


def digest(v):
    return hashlib.sha256(canonical(v)).hexdigest()


def seal(v):
    return {**v, 'content_sha256': digest(v)}


class ParentReview(unittest.TestCase):
    def setUp(self):
        self.directory = _temporary_directory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.events, self.raws, self.writes = [], {}, {}
        self.registration = types.SimpleNamespace(binding={'constructed': True}, parent_capture=b'{"constructed_parent":true}')
        self.operational = {'status': 'BLOCKED', 'reason': 'WALL_TIME_LIMIT', 'sealed_stages': []}
        self.operational_disk = None
        owner = self

        class Sink:
            def __init__(self, attempt, io):
                owner.events.append(('sink', attempt))
                self.path = owner.root / '.cache/mpea-archival-launches' / attempt
            def write(self, name, raw):
                owner.events.append(('write', name))
                if name in owner.writes:
                    raise AssertionError('overwritten launch artifact')
                owner.writes[name] = raw
                return hashlib.sha256(raw).hexdigest()
            def _check(self):
                owner.events.append(('sink_check',))
            def close(self):
                owner.events.append(('sink_close',))
        self.Sink = Sink

        def verify(path, *, approved_engineering_sha256):
            self.events.append(('verify_original', path, approved_engineering_sha256))
            return self.registration
        def verify_reproduction(path, *, approved_engineering_sha256):
            self.events.append(('verify_reproduction', path, approved_engineering_sha256))
            return self.registration
        def verify_sources(reg):
            self.events.append(('source_check',))
        self.registration_module = types.SimpleNamespace(verify_registration=verify,
            verify_reproduction_registration=verify_reproduction, verify_registered_sources=verify_sources)

        def run(command, output):
            self.events.append(('supervisor', tuple(command), str(output)))
            self.raws[str(output)] = canonical(self.operational if self.operational_disk is None else self.operational_disk)
            self.assertIn('parent-capture.json', self.writes)
            self.assertEqual(command[4], hashlib.sha256(self.writes['parent-capture.json']).hexdigest())
            return copy.deepcopy(self.operational)
        def capture(path, cap):
            self.events.append(('capture', str(path)))
            return self.raws[str(path)]
        self.modules = {'mpea_registration_allocation': self.registration_module,
            'mpea_study_supervisor': types.SimpleNamespace(run=run),
            'mpea_archive_custody': types.SimpleNamespace(capture=capture),
            'mpea_stage_store': types.SimpleNamespace(_loads=json.loads, canonical=canonical, digest=digest)}
        self.feature = self.root / '.cache/mpea-features/constructed/local.json'
        self.feature.parent.mkdir(parents=True)
        self.feature.write_bytes(b'{"constructed":true}')

    def invoke(self, original_attempt=None, feature=None):
        with mock.patch.dict(sys.modules, self.modules), mock.patch.object(parent, 'ROOT', self.root), \
             mock.patch.object(parent, '__file__', str(self.root / 'scripts/mpea_archive_run.py')), \
             mock.patch.object(parent, 'LaunchSink', self.Sink):
            return parent.launch(registration_path=self.root / 'constructed-registration.json',
                approved_engineering_sha256='a' * 64, feature_path=self.feature if feature is None else feature,
                attempt='constructed-new', original_attempt=original_attempt)

    def test_registration_failure_never_constructs_sink_or_worker(self):
        self.registration_module.verify_registration = mock.Mock(side_effect=ValueError('REGISTRATION_MISMATCH'))
        with self.assertRaises(ValueError):
            self.invoke()
        self.assertEqual(self.events, [])

    def test_fixed_command_and_capture_hash_follow_registration_and_source_gate(self):
        result = self.invoke()
        names = [e[0] for e in self.events]
        self.assertEqual(names[:3], ['verify_original', 'source_check', 'sink'])
        command = next(e[1] for e in self.events if e[0] == 'supervisor')
        self.assertEqual(command[0], sys.executable)
        self.assertEqual(command[1], str(self.root / 'scripts/mpea_archive_worker.py'))
        self.assertEqual(command[-2:], ('PRODUCTION_ARCHIVE', '-'))
        self.assertEqual(result['scientific_verdict'], None)
        self.assertEqual(result['operational_status'], 'BLOCKED')
        self.assertIn('launch-result.json', self.writes)

    def test_supervisor_failure_ignores_any_locally_complete_scientific_result(self):
        result = self.invoke()
        captures = [e[1] for e in self.events if e[0] == 'capture']
        self.assertEqual(len(captures), 1)
        self.assertTrue(captures[0].endswith('/supervisor.json'))
        self.assertIsNone(result['attempt_result_identity'])
        self.assertIsNone(result['scientific_verdict'])

    def test_reproduction_uses_separate_authority_and_fixed_original_argument(self):
        result = self.invoke('constructed-original')
        names = [e[0] for e in self.events]
        self.assertEqual(names[0], 'verify_reproduction')
        self.assertNotIn('verify_original', names)
        command = next(e[1] for e in self.events if e[0] == 'supervisor')
        self.assertEqual(command[-2:], ('REPRODUCTION_FIXED_ALLOCATION', 'constructed-original'))
        self.assertIsNone(result['scientific_verdict'])

    def test_feature_parent_traversal_is_rejected_before_worker(self):
        escaped = self.root / '.cache/mpea-features/../other/local.json'
        with self.assertRaises(Exception):
            self.invoke(feature=escaped)
        self.assertNotIn('supervisor', [e[0] for e in self.events])

    def test_supervisor_return_must_match_captured_operational_bytes(self):
        self.operational_disk = {**self.operational, 'reason': 'RSS_LIMIT'}
        with self.assertRaises(Exception):
            self.invoke()
        self.assertNotIn('launch-result.json', self.writes)

    def complete_fixture(self, original=False):
        stages = {name: digest(name) for name in ('allocation', 'input_freeze', 'development', 'rank_freeze', 'reserved', 'calibration', 'replay', 'evaluation')}
        self.operational = {'status': 'COMPLETE', 'reason': None, 'sealed_stages': [
            {'stage': name, 'scientific_sha256': value} for name, value in stages.items()]}
        public = {'content_sha256': 'b' * 64, 'scientific_sha256': 'c' * 64,
                  'payload': {'overall_verdict': 'GO_DESIGN_INDEPENDENT_STUDY'}}
        public_raw = canonical(public)
        result = seal({'schema': 'lupine.discovery.mpea.attempt_result.v1', 'status': 'COMPLETE', 'reasons': [],
            'execution_kind': 'REPRODUCTION_FIXED_ALLOCATION' if original else 'PRODUCTION_ARCHIVE',
            'scientific_stages': stages, 'public_identity': {'bytes_sha256': hashlib.sha256(public_raw).hexdigest(),
                'content_sha256': public['content_sha256'], 'scientific_sha256': public['scientific_sha256']},
            'source_captures': 1, 'captured_bytes': 100, 'completed_policy_runs': 960})
        path = self.root / '.cache/mpea-archival/constructed-new'
        self.raws[str(path / 'attempt-result.json')] = canonical(result)
        self.raws[str(path / 'public-report.json')] = public_raw
        self.addCleanup(mock.patch.stopall)
        mock.patch.object(parent, '_verify_prefix', return_value=({}, {})).start()
        mock.patch.object(parent, '_public_transport', return_value=public).start()
        return result

    def test_reproduction_mismatch_clears_prior_go_verdict(self):
        current = self.complete_fixture(original=True)
        original = copy.deepcopy(current)
        original['public_identity']['scientific_sha256'] = 'f' * 64
        original = seal({k: v for k, v in original.items() if k != 'content_sha256'})
        self.raws[str(self.root / '.cache/mpea-archival/constructed-original/attempt-result.json')] = canonical(original)
        result = self.invoke('constructed-original')
        self.assertEqual(result['operational_status'], 'BLOCKED')
        self.assertEqual(result['reproduction']['status'], 'MISMATCH')
        self.assertIsNone(result['scientific_verdict'])

    def test_captured_public_bytes_mismatch_blocks_even_successful_terminal(self):
        self.complete_fixture()
        self.raws[str(self.root / '.cache/mpea-archival/constructed-new/public-report.json')] += b' '
        with self.assertRaises(Exception):
            self.invoke()
        self.assertNotIn('launch-result.json', self.writes)

    def test_source_change_after_worker_blocks_launch_result(self):
        calls = 0
        def verify_sources(reg):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise ValueError('IMPLEMENTATION_MISMATCH')
        self.registration_module.verify_registered_sources = verify_sources
        with self.assertRaises(ValueError):
            self.invoke()
        self.assertIn('supervisor', [e[0] for e in self.events])
        self.assertNotIn('launch-result.json', self.writes)


class LaunchSinkReview(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        directory = str(parent.ROOT / 'scripts')
        sys.path.insert(0, directory)
        try:
            import mpea_stage_store
            cls.io = mpea_stage_store
        finally:
            sys.path.remove(directory)

    def test_parent_capture_is_exclusive_and_conflict_preserves_original(self):
        with _temporary_directory() as directory, mock.patch.object(parent, 'ROOT', Path(directory)):
            sink = parent.LaunchSink('constructed', self.io)
            try:
                raw = b'{"constructed_capture":true}'
                self.assertEqual(sink.write('parent-capture.json', raw), hashlib.sha256(raw).hexdigest())
                with self.assertRaises(Exception):
                    sink.write('parent-capture.json', b'changed')
                self.assertEqual((sink.path / 'parent-capture.json').read_bytes(), raw)
                with self.assertRaises(Exception):
                    sink.write('unexpected.json', b'{}')
            finally:
                sink.close()

    def test_late_sink_directory_replacement_cannot_redirect_result(self):
        with _temporary_directory() as directory, mock.patch.object(parent, 'ROOT', Path(directory)):
            outside = Path(directory) / 'outside'
            outside.mkdir()
            sink = parent.LaunchSink('constructed', self.io)
            try:
                original = sink.path
                original.rename(original.with_name('preserved-original'))
                original.symlink_to(outside, target_is_directory=True)
                with self.assertRaises(Exception):
                    sink.write('launch-result.json', b'{"constructed":true}')
                self.assertEqual(list(outside.iterdir()), [])
            finally:
                sink.close()


if __name__ == '__main__':
    unittest.main()
