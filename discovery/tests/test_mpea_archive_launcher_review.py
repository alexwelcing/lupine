"""Independent parent dispatch probes with explicit synthetic dependency stubs."""
import copy
import hashlib
import importlib.util
import contextlib
import io as textio
import json
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest import mock

ROOT = next(path for path in Path(__file__).resolve().parents if (path / 'src/lupine_discovery/decision_pool.py').is_file())
SOURCE = Path(__file__).resolve().parents[1] / 'scripts/mpea_archive_run.py'
sys.path.insert(0, str(SOURCE.parent))
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
        self.operational = {'status': 'COMPLETE', 'reason': 'COMPLETE', 'sealed_stages': [
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
        self.inventory_changes = {}
        self.graph_failure = None
        def prefix(root, operational, registration, custody, io, inventory):
            self.events.append(('verified_prefix', root.name))
            if root.name == self.graph_failure:
                raise ValueError('INPUT_IDENTITY_MISMATCH')
            for name in parent.operations.ARTIFACT_NAMES:
                if name in ('public-report.json', 'attempt-result.json'): continue
                item = {'bytes_sha256': digest(root.name + name), 'content_sha256': digest('content:' + root.name + name),
                        'scientific_sha256': digest('science:' + name)}
                item.update(self.inventory_changes.get((root.name, name), {}))
                inventory[name] = item
            return {}, {}
        mock.patch.object(parent, '_verify_prefix', side_effect=prefix).start()
        mock.patch.object(parent, '_public_transport', side_effect=lambda raw, *args: json.loads(raw)).start()
        return result

    def original_fixture(self, current, *, changed_public=False):
        original = copy.deepcopy(current)
        original['execution_kind'] = 'PRODUCTION_ARCHIVE'
        current_root = self.root / '.cache/mpea-archival/constructed-new'
        old_root = self.root / '.cache/mpea-archival/constructed-original'
        public = json.loads(self.raws[str(current_root / 'public-report.json')])
        if changed_public:
            public['content_sha256'] = 'e' * 64
            public['scientific_sha256'] = 'f' * 64
        raw = canonical(public)
        self.raws[str(old_root / 'public-report.json')] = raw
        original['public_identity'] = {'bytes_sha256': hashlib.sha256(raw).hexdigest(),
            'content_sha256': public['content_sha256'], 'scientific_sha256': public['scientific_sha256']}
        original = seal({k: v for k, v in original.items() if k != 'content_sha256'})
        self.raws[str(old_root / 'attempt-result.json')] = canonical(original)
        return original

    def test_reproduction_mismatch_clears_prior_go_verdict(self):
        current = self.complete_fixture(original=True)
        self.original_fixture(current, changed_public=True)
        result = self.invoke('constructed-original')
        self.assertEqual(result['operational_status'], 'BLOCKED')
        self.assertEqual(result['reproduction']['status'], 'MISMATCH')
        self.assertIsNone(result['scientific_verdict'])

    def test_all_authenticated_companion_identities_reach_reproduction_comparison(self):
        self.original_fixture(self.complete_fixture(original=True))
        result = self.invoke('constructed-original')
        compared = result['reproduction']['artifact_comparison']
        self.assertEqual(set(compared['files']), set(parent.operations.ARTIFACT_NAMES))
        self.assertEqual(compared['scientific_identities_compared'], 16)
        self.assertTrue(compared['scientific_seals_identical'])
        self.assertFalse(compared['all_complete_file_bytes_identical'])
        self.assertIn('attempt-result.json', compared['complete_file_differences'])
        self.assertEqual(result['reproduction']['status'], 'REPRODUCED')
        self.assertEqual(result['study_status'], 'COMPLETE')
        self.assertEqual([e[1] for e in self.events if e[0] == 'verified_prefix'], ['constructed-new', 'constructed-original'])

    def test_companion_scientific_mismatch_blocks_even_when_stage_and_public_match(self):
        self.original_fixture(self.complete_fixture(original=True))
        self.inventory_changes[('constructed-original', 'calibration-vault.json')] = {'scientific_sha256': 'e' * 64}
        result = self.invoke('constructed-original')
        self.assertTrue(result['reproduction']['scientific_stages_identical'])
        self.assertTrue(result['reproduction']['public_scientific_identity_identical'])
        self.assertFalse(result['reproduction']['artifact_comparison']['scientific_seals_identical'])
        self.assertEqual(result['study_status'], 'BLOCKED')
        self.assertEqual(result['study_reason'], 'INPUT_IDENTITY_MISMATCH')
        self.assertIsNone(result['scientific_verdict'])

    def test_original_graph_failure_cannot_be_replaced_by_matching_summary_seals(self):
        self.original_fixture(self.complete_fixture(original=True))
        self.graph_failure = 'constructed-original'
        with self.assertRaises(ValueError): self.invoke('constructed-original')
        self.assertNotIn('launch-result.json', self.writes)

    def test_original_public_bytes_must_match_its_authenticated_result_identity(self):
        self.original_fixture(self.complete_fixture(original=True))
        original_public = str(self.root / '.cache/mpea-archival/constructed-original/public-report.json')
        self.raws[original_public] += b' '
        with self.assertRaises(ValueError): self.invoke('constructed-original')
        self.assertNotIn('launch-result.json', self.writes)

    def test_closed_outer_reason_keeps_internal_cause_in_bound_operational_receipt(self):
        for original_reason, outer_reason in [('WORKER_SIGNALLED', 'INTERNAL_FAILURE'),
                ('NETWORK_ISOLATION_FAILED', 'INTERNAL_FAILURE'), ('MARKER_INVALID', 'STAGE_ORDER_VIOLATION'),
                ('WALL_TIME_LIMIT', 'WALL_TIME_LIMIT')]:
            self.writes.clear(); self.events.clear()
            self.operational['reason'] = original_reason
            value = self.invoke()
            self.assertEqual(value['operational_reason'], original_reason)
            self.assertEqual(value['study_reason'], outer_reason)
            self.assertEqual(value['supervisor_sha256'], hashlib.sha256(canonical(self.operational)).hexdigest())
            self.assertIsNone(value['scientific_verdict'])
            self.assertFalse(value['post_terminal_private_receipts_decoded'])

    def test_cli_emits_only_closed_outer_status_and_reason(self):
        output = textio.StringIO()
        receipt = {'study_status': 'BLOCKED', 'study_reason': 'INTERNAL_FAILURE',
                   'operational_status': 'BLOCKED', 'operational_reason': 'WORKER_SIGNALLED'}
        with mock.patch.object(parent, 'launch', return_value=receipt), contextlib.redirect_stdout(output):
            code = parent.main(['--registration','r','--engineering-sha256','a'*64,'--feature','f','--attempt','a'])
        self.assertEqual(code, 2)
        self.assertEqual(json.loads(output.getvalue()), {'status': 'BLOCKED', 'reason': 'INTERNAL_FAILURE'})

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
