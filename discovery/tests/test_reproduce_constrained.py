import copy
from contextlib import redirect_stdout
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/reproduce_constrained.py'
SPEC = importlib.util.spec_from_file_location('reproduce_constrained_test_module', SCRIPT)
workflow = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = workflow
SPEC.loader.exec_module(workflow)


PROTOCOL = {'protocol_id': 'synthetic-protocol', 'protocol_commit': 'original-frozen-commit',
            'protocol_sha256': 'original-bytes', 'format_amendment_commit': 'committed-amendment',
            'format_amendment_sha256': 'amendment-bytes'}
PRODUCER = SimpleNamespace(protocol_identity=lambda: copy.deepcopy(PROTOCOL),
                           ZIP_NAME='pinned-raw.zip', MEMBER_NAME='pinned-member.json')
SUMMARY = {'scientific_result_sha256': 'a' * 64, 'report_content_sha256': 'b' * 64,
           'full_report_bytes_sha256': 'c' * 64, 'panel_count': 100,
           'gate_statuses': {'engineering_integrity': 'PASS', 'observed_primary_screening': 'FAIL',
                             'recommendation_value': 'FAIL'},
           'source_receipt_sha256': 'source', 'model_digest': 'model',
           'prediction_sha256': 'prediction', 'resources': {'elapsed_cpu_seconds': '10'}}


def make_project(root):
    for name in ('src/lupine_discovery/__init__.py', 'src/lupine_discovery/core.py',
                 'scripts/constrained_benchmark.py', 'scripts/constrained_replay.py',
                 'scripts/constrained_dashboard.py', 'scripts/reproduce_constrained.py',
                 'tests/test_constrained_first.py', 'tests/test_constrained_second.py',
                 'tests/test_reproduce_constrained.py',
                 'docs/constrained-benchmark-protocol.md', 'docs/constrained-source-audit.md',
                 'docs/constrained-format-amendment.md', 'pyproject.toml'):
        path = root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text('# fixture source ' + name + '\n')


class FakeCommands:
    """A hostile child boundary: assert ordering, receipt binding and paths."""
    def __init__(self, root, workdir, fail=None, mutate=None, empty_tests=False, reject_bad_source=False):
        self.root, self.workdir = root, workdir
        self.fail, self.mutate = fail, mutate
        self.empty_tests, self.reject_bad_source = empty_tests, reject_bad_source
        self.calls, self.dashboard_paths, self.files_at_acquire = [], [], None

    def __call__(self, command, cwd, log_path):
        if command[1:3] == ['-m', 'unittest']:
            name = 'engineering-tests'
            if command[command.index('-p') + 1] != 'test_constrained*.py':
                raise AssertionError('workflow narrowed the required engineering suite')
        elif command[1].endswith('constrained_benchmark.py'):
            name = command[2]
        elif command[1].endswith('constrained_replay.py'):
            name = 'replay'
        elif command[1].endswith('constrained_dashboard.py'):
            name = 'dashboard'
        else:
            raise AssertionError('unexpected child command')
        expected = ['acquire', 'freeze', 'verify', 'engineering-tests', 'replay', 'dashboard']
        if name != expected[len(self.calls)]:
            raise AssertionError('stage ran before its required predecessor')
        self.calls.append(name)
        if cwd != self.root:
            raise AssertionError('child ran against a different checkout')
        if not Path(log_path).is_relative_to(self.workdir):
            raise AssertionError('child log escaped isolated workspace')
        start = json.loads((self.workdir / 'workflow-start.json').read_text())
        if start['protocol'] != PROTOCOL:
            raise AssertionError('protocol was not bound before child execution')
        artifacts = self.workdir / 'artifacts'
        failure = self.fail == name
        if name == 'acquire':
            self.files_at_acquire = {path.name for path in artifacts.iterdir()}
            if not self.files_at_acquire <= {PRODUCER.ZIP_NAME, PRODUCER.MEMBER_NAME}:
                raise AssertionError('prior labels or fits were carried into the fresh experiment')
            if command[command.index('--source-format') + 1] != 'nonfinite-sentinels':
                raise AssertionError('committed source-format mode was not explicit')
            raw = artifacts / PRODUCER.ZIP_NAME
            if self.reject_bad_source and raw.exists() and raw.read_bytes() != b'valid pinned raw bytes':
                failure = True
            if not failure:
                (artifacts / 'evaluation-targets.json').write_text('sealed synthetic target custody\n')
        elif name == 'freeze' and not failure:
            (artifacts / 'freeze.json').write_text('synthetic frozen receipt\n')
        elif name == 'engineering-tests':
            if (self.workdir / 'engineering-validation.json').exists():
                raise AssertionError('passing validation receipt was fabricated before running tests')
        elif name == 'replay':
            receipt_path = Path(command[command.index('--engineering-validation') + 1])
            receipt = json.loads(receipt_path.read_text())
            test_log = self.root / receipt['result_log_path']
            if receipt['source_sha256'] != workflow.source_fingerprint(self.root):
                raise AssertionError('engineering receipt did not bind current source')
            if receipt['result_log_sha256'] != hashlib.sha256(test_log.read_bytes()).hexdigest():
                raise AssertionError('engineering receipt did not bind actual child output')
            if receipt['test_count'] != 3 or receipt['exit_code'] != 0 or receipt['status'] != 'passed':
                raise AssertionError('engineering receipt did not describe executed successful tests')
            output = Path(command[command.index('--output') + 1])
            if not output.is_relative_to(self.workdir):
                raise AssertionError('full report escaped isolated workspace')
            if not failure:
                output.write_text('completed synthetic report verified by injected verifier\n')
        elif name == 'dashboard':
            for option in ('--output', '--resource', '--full-artifact'):
                output = Path(command[command.index(option) + 1])
                if not output.is_relative_to(self.workdir):
                    raise AssertionError('projection would overwrite committed report/resource')
                self.dashboard_paths.append(output)
                if not failure:
                    output.parent.mkdir(parents=True, exist_ok=True)
                    output.write_text('synthetic projection\n')
        if name == self.mutate:
            (self.root / 'src/lupine_discovery/core.py').write_text('# changed while child was running\n')
        if name == 'engineering-tests' and not failure:
            log = f'Ran {0 if self.empty_tests else 3} tests in 0.002s\n\nOK\n'
        else:
            log = 'preserved child failure\n' if failure else f'{name} child completed\n'
        with Path(log_path).open('x') as stream:
            stream.write(log)
        return 17 if failure else 0


class ReproduceConstrainedTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        make_project(self.root)
        self.workdir = self.root / '.cache' / 'fresh-reproduction'

    def execute(self, commands, **kwargs):
        with patch.object(workflow, '_verify_installation', return_value={'installation': 'test fixture'}), \
                patch.object(workflow, '_report_summary', return_value=copy.deepcopy(SUMMARY)), \
                redirect_stdout(io.StringIO()):
            return workflow.run_workflow(self.workdir, root=self.root, executor=commands,
                                          producer=PRODUCER, **kwargs)

    def test_one_command_orders_all_stages_builds_receipt_and_isolates_projection(self):
        commands = FakeCommands(self.root, self.workdir)
        result = self.execute(commands, project_dashboard=True, expected_scientific_digest='a' * 64)
        self.assertEqual(commands.calls, ['acquire', 'freeze', 'verify', 'engineering-tests', 'replay', 'dashboard'])
        self.assertEqual(result['status'], 'complete')
        self.assertEqual(result['digest_comparison']['status'], 'MATCH')
        self.assertEqual(result['scientific_result']['gate_statuses']['recommendation_value'], 'FAIL')
        self.assertTrue(result['scientific_gate_failures_are_preserved_results'])
        self.assertEqual(len(commands.dashboard_paths), 3)
        self.assertFalse((self.root / 'reports').exists())
        self.assertFalse((self.root / 'src/lupine_discovery/resources').exists())
        record = json.loads((self.workdir / '04-engineering-tests-result.json').read_text())
        self.assertEqual(record['source_sha256_before'], record['source_sha256_after'])
        self.assertEqual(record['changed_sources'], [])
        receipt = json.loads((self.workdir / 'engineering-validation.json').read_text())
        self.assertEqual(receipt['test_count'], 3)

    def test_raw_cache_reuse_copies_no_prior_labels_fits_or_reports(self):
        source = self.root / 'external-source'
        source.mkdir()
        files = {PRODUCER.ZIP_NAME: b'valid pinned raw bytes', PRODUCER.MEMBER_NAME: b'raw member bytes',
                 'evaluation-targets.json': b'FORBIDDEN prior targets', 'metadata.json': b'FORBIDDEN metadata',
                 'freeze.json': b'FORBIDDEN fitted receipt', 'predictions.json': b'FORBIDDEN predictions',
                 'constrained-full.json': b'FORBIDDEN report'}
        for name, raw in files.items():
            (source / name).write_bytes(raw)
        commands = FakeCommands(self.root, self.workdir, reject_bad_source=True)
        self.execute(commands, source_cache=source)
        self.assertEqual(commands.files_at_acquire, {PRODUCER.ZIP_NAME, PRODUCER.MEMBER_NAME})
        self.assertEqual({path.name: path.read_bytes() for path in source.iterdir()}, files)
        reuse = json.loads((self.workdir / 'raw-source-reuse.json').read_text())
        self.assertFalse(reuse['labels_predictions_freezes_or_reports_reused'])

    def test_corrupt_reused_raw_source_stops_at_acquire_and_keeps_evidence(self):
        source = self.root / 'bad-source'
        source.mkdir()
        (source / PRODUCER.ZIP_NAME).write_bytes(b'corrupt source')
        commands = FakeCommands(self.root, self.workdir, reject_bad_source=True)
        with self.assertRaisesRegex(workflow.WorkflowFailure, 'acquire exited'):
            self.execute(commands, source_cache=source)
        self.assertEqual(commands.calls, ['acquire'])
        self.assertTrue((self.workdir / 'logs/01-acquire.log').exists())
        self.assertEqual((self.workdir / 'artifacts' / PRODUCER.ZIP_NAME).read_bytes(), b'corrupt source')
        self.assertFalse((self.workdir / 'artifacts/freeze.json').exists())

    def test_failing_command_stops_before_later_access_and_preserves_logs(self):
        commands = FakeCommands(self.root, self.workdir, fail='freeze')
        with self.assertRaisesRegex(workflow.WorkflowFailure, 'freeze exited'):
            self.execute(commands)
        self.assertEqual(commands.calls, ['acquire', 'freeze'])
        failure = json.loads((self.workdir / 'workflow-failed.json').read_text())
        self.assertEqual(failure['stage'], 'freeze')
        self.assertTrue((self.workdir / 'artifacts/evaluation-targets.json').exists())
        self.assertIn('preserved child failure', (self.workdir / 'logs/02-freeze.log').read_text())
        self.assertFalse((self.workdir / 'engineering-validation.json').exists())

    def test_source_mutation_during_tests_blocks_receipt_and_replay(self):
        commands = FakeCommands(self.root, self.workdir, mutate='engineering-tests')
        with self.assertRaisesRegex(workflow.WorkflowFailure, 'source changed during stage engineering-tests'):
            self.execute(commands)
        self.assertEqual(commands.calls[-1], 'engineering-tests')
        self.assertNotIn('replay', commands.calls)
        self.assertFalse((self.workdir / 'engineering-validation.json').exists())
        record = json.loads((self.workdir / '04-engineering-tests-result.json').read_text())
        self.assertEqual(record['changed_sources'], ['src/lupine_discovery/core.py'])
        self.assertNotEqual(record['source_sha256_before'], record['source_sha256_after'])

    def test_failing_or_empty_tests_never_authorize_replay(self):
        for empty in (False, True):
            with self.subTest(empty=empty):
                self.workdir = self.root / '.cache' / ('empty-tests' if empty else 'failed-tests')
                commands = FakeCommands(self.root, self.workdir,
                                        fail=None if empty else 'engineering-tests', empty_tests=empty)
                with self.assertRaises(workflow.WorkflowFailure):
                    self.execute(commands)
                self.assertEqual(commands.calls[-1], 'engineering-tests')
                self.assertFalse((self.workdir / 'engineering-validation.json').exists())
                self.assertFalse((self.workdir / 'artifacts/constrained-full.json').exists())

    def test_digest_mismatch_is_recorded_without_accepting_a_new_reference(self):
        commands = FakeCommands(self.root, self.workdir)
        with self.assertRaises(workflow.ScientificDigestMismatch):
            self.execute(commands, project_dashboard=True, expected_scientific_digest='f' * 64)
        self.assertEqual(commands.calls[-1], 'replay')
        comparison = json.loads((self.workdir / 'scientific-digest-comparison.json').read_text())
        self.assertEqual(comparison, {'expected': 'f' * 64, 'actual': 'a' * 64, 'status': 'MISMATCH'})
        self.assertTrue((self.workdir / 'artifacts/constrained-full.json').exists())
        self.assertTrue((self.workdir / 'scientific-result.json').exists())
        self.assertFalse((self.workdir / 'workflow-result.json').exists())

    def test_existing_or_outside_workdir_is_rejected_before_commands(self):
        commands = FakeCommands(self.root, self.workdir)
        self.workdir.mkdir(parents=True)
        sentinel = self.workdir / 'earlier-evidence.json'
        sentinel.write_text('keep this result\n')
        with self.assertRaises(FileExistsError):
            self.execute(commands)
        self.assertEqual(sentinel.read_text(), 'keep this result\n')
        with patch.object(workflow, '_verify_installation', side_effect=AssertionError('must not reach setup')):
            with self.assertRaises(workflow.WorkflowFailure):
                workflow.run_workflow(self.root / 'tracked-output', root=self.root)
        self.assertEqual(commands.calls, [])

    def test_cache_symlink_cannot_escape_engineering_receipt_scope(self):
        with tempfile.TemporaryDirectory() as outside:
            (self.root / '.cache').symlink_to(outside, target_is_directory=True)
            with patch.object(workflow, '_verify_installation', side_effect=AssertionError('must not reach setup')):
                with self.assertRaisesRegex(workflow.WorkflowFailure, 'must not resolve outside'):
                    workflow.run_workflow(self.root / '.cache/fresh', root=self.root)
            self.assertEqual(list(Path(outside).iterdir()), [])

    def test_missing_protocol_amendment_stops_before_workspace_creation(self):
        incomplete = SimpleNamespace(protocol_identity=lambda: {'protocol_id': 'unbound'})
        with patch.object(workflow, '_verify_installation', return_value={}):
            with self.assertRaisesRegex(workflow.WorkflowFailure, 'committed format amendment'):
                workflow.run_workflow(self.workdir, root=self.root, producer=incomplete)
        self.assertFalse(self.workdir.exists())

    def test_skipped_tests_cannot_satisfy_complete_engineering_gate(self):
        log = self.root / 'skipped-test.log'
        log.write_text('Ran 1 test in 0.001s\n\nOK\n'
                       'Ran 3 tests in 0.001s\n\nOK (skipped=1)\n')
        with self.assertRaisesRegex(workflow.WorkflowFailure, 'unskipped'):
            workflow._test_count(log)


if __name__ == '__main__':
    unittest.main()
