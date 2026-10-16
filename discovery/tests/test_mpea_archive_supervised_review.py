"""Actual namespace/supervisor; real worker; only constructed scientific stubs."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
ROOT = next(path for path in Path(__file__).resolve().parents if (path / 'src/lupine_discovery/decision_pool.py').is_file())
SOURCE = ROOT / 'scripts/mpea_study_supervisor.py'
spec = importlib.util.spec_from_file_location('independent_actual_supervisor', SOURCE)
supervisor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(supervisor)
STAGES = ('allocation', 'input_freeze', 'development', 'rank_freeze', 'reserved', 'calibration', 'replay', 'evaluation')


class SupervisedWorkerReview(unittest.TestCase):
    def run_case(self, mode):
        scratch = ROOT / '.cache/reviewer-controls'
        scratch.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=scratch, prefix='mpea-supervised-') as directory:
            path = Path(directory)
            result = supervisor.run_synthetic([sys.executable, str(HERE / 'mpea_archive_controlled_worker_child.py'),
                mode, str(path / 'observation.json')], path / 'operational.json',
                wall_seconds=60, rss_bytes=512 * 1024**2, startup_seconds=60)
            self.assertEqual(result, json.loads((path / 'operational.json').read_bytes()))
            observation = json.loads((path / 'observation.json').read_bytes())
            self.assertNotIn('SENSITIVE_SYNTHETIC', json.dumps(result))
            self.assertNotEqual(observation['user_ns'], os.readlink('/proc/self/ns/user'))
            self.assertNotEqual(observation['net_ns'], os.readlink('/proc/self/ns/net'))
            self.assertEqual(observation['interfaces'], [[1, 'lo']])
            capture = os.environ.get('LAUNCHER_REVIEW_CAPTURE')
            if capture:
                destination = Path(capture)
                assert destination.parent == HERE
                destination.mkdir(exist_ok=True)
                for name, value in [('operational', result), ('observation', observation)]:
                    with (destination / (mode + '-' + name + '.json')).open('x') as stream:
                        json.dump(value, stream, sort_keys=True, indent=2)
            return result, observation

    def test_complete_eight_stages_and_decoder_after_ack(self):
        result, observed = self.run_case('complete')
        self.assertEqual(result['status'], 'COMPLETE')
        self.assertEqual([m['stage'] for m in result['sealed_stages']], list(STAGES))
        self.assertTrue(result['target_phase_started'])
        events = observed['events']
        ack = events.index(['acknowledged', 'TARGET_PHASE_BEGIN', None])
        self.assertGreater(events.index(['constructed_decoder']), ack)
        self.assertEqual(observed['published'][0]['status'], 'COMPLETE')

    def test_early_no_go_remains_valid_terminal_without_reserved(self):
        result, observed = self.run_case('no_go')
        self.assertEqual(result['status'], 'NO_GO_INSUFFICIENT_DEVELOPMENT')
        self.assertEqual(result['reason'], 'DEVELOPMENT_ROWS_BELOW_50')
        self.assertEqual([m['stage'] for m in result['sealed_stages']], list(STAGES[:3]))
        self.assertEqual(observed['markers'][-1]['event'], 'STOP')

    def test_projector_failure_after_eight_seals_cannot_promote_to_complete(self):
        result, observed = self.run_case('project_failure')
        self.assertEqual(result['status'], 'BLOCKED')
        self.assertEqual(result['reason'], 'INPUT_IDENTITY_MISMATCH')
        self.assertEqual([m['stage'] for m in result['sealed_stages']], list(STAGES))
        self.assertEqual(observed['published'], [])
        self.assertFalse(any(m['event'] == 'DONE' for m in observed['markers']))

    def test_registration_failure_cannot_begin_target_phase(self):
        result, observed = self.run_case('registration_failure')
        self.assertEqual(result['status'], 'BLOCKED')
        self.assertEqual(result['reason'], 'REGISTRATION_MISMATCH')
        self.assertFalse(result['target_phase_started'])
        self.assertEqual(result['sealed_stages'], [])
        self.assertEqual(observed['published'], [])


if __name__ == '__main__':
    unittest.main()
