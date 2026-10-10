"""Independent executable supervisor checks against constructed children only."""
import errno
import importlib.util
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
ROOT = next(p for p in HERE.parents if (p/'src/lupine_discovery').is_dir())
SOURCE = ROOT / 'scripts/mpea_study_supervisor.py'
spec = importlib.util.spec_from_file_location('reviewed_supervisor', SOURCE)
supervisor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(supervisor)
CHILD = HERE / 'fixtures/mpea_supervisor_review_child.py'
STAGES = ('allocation', 'input_freeze', 'development', 'rank_freeze', 'reserved', 'calibration', 'replay', 'evaluation')


class SupervisorReview(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=HERE)
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.receipt = self.directory / 'receipt.json'
        self.observation = self.directory / 'synthetic-observation.txt'

    def run_case(self, mode, wall=10, rss=256 * 1024 ** 2, startup=10, fixture_mode='normal', local=False):
        if local:
            result = supervisor.run_synthetic([sys.executable, str(CHILD), mode, str(self.observation)],
                self.receipt, wall_seconds=wall, rss_bytes=rss, startup_seconds=startup)
        else:
            request = dict(command=[sys.executable, str(CHILD), mode, str(self.observation)],
                receipt=str(self.receipt), wall_seconds=wall, rss_bytes=rss, startup_seconds=startup,
                fixture_mode=fixture_mode)
            process = subprocess.run([sys.executable, str(HERE/'fixtures/mpea_supervisor_isolated_driver.py')],
                input=json.dumps(request).encode(), stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                timeout=wall+startup+5, check=False)
            self.assertEqual(process.returncode, 0, process.stderr.decode())
            response = json.loads(process.stdout)
            self.assertEqual(response['fixture_mode'], fixture_mode)
            result = response['receipt']
        self.assertEqual(result, json.loads(self.receipt.read_bytes()))
        self.assertNotIn('SENSITIVE_SENTINEL', self.receipt.read_text())
        capture = os.environ.get('SUPERVISOR_REVIEW_CAPTURE')
        if capture:
            destination = Path(capture)
            assert destination.parent == HERE
            destination.mkdir(exist_ok=True)
            name = self._testMethodName + '-' + mode.replace(':', '_') + '.json'
            with (destination / name).open('xb') as stream:
                stream.write(self.receipt.read_bytes())
        return result

    def test_real_user_and_network_namespace_and_no_external_route(self):
        result = self.run_case('namespace')
        self.assertEqual(result['status'], 'COMPLETE')
        observed = json.loads(self.observation.read_text())
        self.assertNotEqual(observed['user_ns'], os.readlink('/proc/self/ns/user'))
        self.assertNotEqual(observed['net_ns'], os.readlink('/proc/self/ns/net'))
        self.assertEqual(observed['interfaces'], [[1, 'lo']])
        self.assertEqual(observed['external_errno'], errno.ENETUNREACH)
        self.assertEqual(tuple(x['stage'] for x in result['sealed_stages']), STAGES)

    def test_actual_ack_blocks_constructed_decoder_until_parent_reply(self):
        parent, child_socket = socket.socketpair()
        with parent, child_socket:
            env = {**os.environ, 'LUPINE_MARKER_FD': str(child_socket.fileno()), 'PYTHONDONTWRITEBYTECODE': '1'}
            child = subprocess.Popen([sys.executable, str(CHILD), 'manual_ack', str(self.observation)],
                env=env, pass_fds=(child_socket.fileno(),), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            try:
                parent.settimeout(10)
                self.assertEqual(json.loads(parent.recv(256)), {'event': 'TARGET_PHASE_BEGIN'})
                time.sleep(.04)
                self.assertFalse(self.observation.exists())
                self.assertIsNone(child.poll())
                parent.sendall(b'A')
                time.sleep(.04)
                self.assertFalse(self.observation.exists())
                self.assertIsNone(child.poll())
                parent.sendall(b'CK\n')
                self.assertEqual(child.wait(timeout=10), 0)
                self.assertEqual(self.observation.read_text(), 'synthetic decoder entered')
            finally:
                if child.poll() is None:
                    child.kill(); child.wait(timeout=3)

    def test_rejected_target_marker_never_reaches_constructed_decoder(self):
        result = self.run_case('bad_target_order')
        self.assertEqual(result['reason'], 'MARKER_ORDER_INVALID')
        self.assertFalse(result['target_phase_started'])
        self.assertFalse(self.observation.exists())

    def test_closed_marker_grammar_duplicate_invalid_and_oversized(self):
        for mode in ('duplicate', 'oversized', 'invalid_utf8', 'extra_field', 'nonobject'):
            with self.subTest(mode=mode):
                self.receipt = self.directory / (mode + '.json')
                result = self.run_case('raw:' + mode)
                self.assertNotEqual(result['status'], 'COMPLETE')
                self.assertIn(result['reason'], ('MARKER_INVALID', 'MARKER_ORDER_INVALID'))
                self.assertFalse(result['target_phase_started'])

    def test_utf16_json_marker_is_rejected_as_non_utf8(self):
        result = self.run_case('utf16_start')
        self.assertEqual(result['reason'], 'MARKER_INVALID')
        self.assertNotEqual(result['status'], 'COMPLETE')

    def test_duplicate_and_skipped_stages_fail_closed(self):
        for mode in ('duplicate_start', 'skip_input', 'duplicate_target'):
            with self.subTest(mode=mode):
                self.receipt = self.directory / (mode + '.json')
                self.assertEqual(self.run_case(mode)['reason'], 'MARKER_ORDER_INVALID')

    def test_fast_post_terminal_socket_tail_cannot_be_complete(self):
        result = self.run_case('late_tail', fixture_mode='delayed_wait4')
        self.assertNotEqual(result['status'], 'COMPLETE')
        self.assertIn(result['reason'], ('MARKER_ORDER_INVALID', 'MARKER_INCOMPLETE'))

    def test_valid_early_stop_statuses_remain_distinct(self):
        for mode, expected in [('no_go', 'NO_GO_INSUFFICIENT_DEVELOPMENT'), ('blocked', 'BLOCKED'), ('incomplete', 'INCOMPLETE')]:
            with self.subTest(mode=mode):
                self.receipt = self.directory / (mode + '.json')
                result = self.run_case('stop:' + mode)
                self.assertEqual(result['status'], expected)
                self.assertEqual(len(result['sealed_stages']), 3)
                self.assertEqual(result['exit_code'], 0)

    def test_no_go_before_development_seal_is_rejected(self):
        self.assertEqual(self.run_case('early_no_go')['reason'], 'MARKER_ORDER_INVALID')

    def test_final_failed_seal_can_stop_blocked_without_becoming_complete(self):
        result = self.run_case('final_blocked')
        self.assertEqual(result['status'], 'BLOCKED')
        self.assertEqual(result['reason'], 'INTERNAL_FAILURE')
        self.assertEqual(len(result['sealed_stages']), 8)
        self.assertEqual(result['exit_code'], 0)

    def test_invalid_terminal_status_or_freeform_reason_is_rejected(self):
        for mode in ('invalid_stop', 'unknown_stop_reason'):
            with self.subTest(mode=mode):
                self.receipt = self.directory / (mode + '.json')
                result = self.run_case(mode)
                self.assertEqual(result['reason'], 'MARKER_ORDER_INVALID')
                self.assertNotEqual(result['status'], 'COMPLETE')

    def test_nonzero_exit_cannot_promote_declared_no_go(self):
        result = self.run_case('stop_nonzero')
        self.assertEqual(result['reason'], 'WORKER_FAILED')
        self.assertNotEqual(result['status'], 'NO_GO_INSUFFICIENT_DEVELOPMENT')

    def test_missing_terminal_does_not_create_complete_receipt(self):
        result = self.run_case('omit_terminal')
        self.assertEqual(result['reason'], 'MARKER_INCOMPLETE')
        self.assertNotEqual(result['status'], 'COMPLETE')

    def test_cumulative_wall_does_not_restart_at_stage_seals(self):
        result = self.run_case('cumulative', wall=.18)
        self.assertEqual(result['reason'], 'WALL_TIME_LIMIT')
        self.assertGreater(result['wall_seconds'], .18)
        self.assertGreaterEqual(len(result['sealed_stages']), 4)
        self.assertLess(len(result['sealed_stages']), 8)

    def test_actual_sampled_rss_and_exit_peak_are_reported(self):
        result = self.run_case('resident', rss=64 * 1024 ** 2)
        self.assertEqual(result['reason'], 'RSS_LIMIT')
        self.assertGreater(result['peak_sampled_rss_bytes'], 64 * 1024 ** 2)
        self.assertIsInstance(result['child_exit_peak_rss_bytes'], int)
        self.assertIn('inter-sample', result['measurement'])

    def test_wait4_leader_peak_catches_deliberately_unsampled_burst(self):
        result = self.run_case('exit_peak', rss=64 * 1024 ** 2, fixture_mode='zero_samples')
        self.assertEqual(result['reason'], 'RSS_LIMIT')
        self.assertEqual(result['peak_sampled_rss_bytes'], 0)
        self.assertGreater(result['child_exit_peak_rss_bytes'], 64 * 1024 ** 2)

    def test_separate_process_group_in_worker_session_is_cleaned(self):
        pid = None
        try:
            result = self.run_case('separate_group_child')
            pid = int(self.observation.read_text())
            self.assertEqual(result['status'], 'COMPLETE')
            deadline = time.monotonic() + 2
            while time.monotonic() < deadline:
                stat = Path(f'/proc/{pid}/stat')
                if not stat.exists() or stat.read_text().rsplit(')', 1)[1].split()[0] == 'Z':
                    break
                time.sleep(.01)
            else:
                self.fail('Separate-group synthetic descendant survived cleanup')
        finally:
            if pid is None and self.observation.exists():
                pid = int(self.observation.read_text())
            if pid is not None:
                try: os.kill(pid, signal.SIGKILL)
                except ProcessLookupError: pass

    def test_signal_classification_and_sensitive_child_output_suppression(self):
        result = self.run_case('worker_signal')
        self.assertEqual(result['reason'], 'WORKER_SIGNALLED')
        self.assertEqual(result['exit_code'], -signal.SIGKILL)
        self.receipt = self.directory / 'sensitive.json'
        self.assertEqual(self.run_case('sensitive')['status'], 'COMPLETE')

    def test_unsupported_platform_never_launches_child(self):
        with patch.object(supervisor.sys, 'platform', 'unsupported'), patch.object(supervisor.subprocess, 'Popen') as spawn:
            result = self.run_case('sensitive', local=True)
        spawn.assert_not_called()
        self.assertEqual(result['reason'], 'UNSUPPORTED_PLATFORM')
        self.assertFalse(result['network_namespace_verified'])

    def test_startup_timeout_never_claims_target_budget_started(self):
        result = self.run_case('sleep_before_start', startup=.15)
        self.assertEqual(result['reason'], 'STARTUP_TIMEOUT')
        self.assertFalse(result['target_phase_started'])

    def test_actual_supervisor_interrupts_preserve_receipt_and_cleanup(self):
        for sig in (signal.SIGTERM, signal.SIGINT):
            with self.subTest(signal=sig):
                receipt = self.directory / (str(sig) + '.json')
                observed = self.directory / (str(sig) + '-observed.txt')
                program = ('import importlib.util,sys; '
                    's=importlib.util.spec_from_file_location("s",sys.argv[1]); '
                    'm=importlib.util.module_from_spec(s);s.loader.exec_module(m); '
                    'm.run_synthetic([sys.executable,sys.argv[2],"supervisor_signal",sys.argv[3]],'
                    'sys.argv[4],wall_seconds=10,rss_bytes=268435456,startup_seconds=10)')
                child = subprocess.Popen([sys.executable, '-c', program, str(SOURCE), str(CHILD),
                                          str(observed), str(receipt)],
                    env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'},
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                try:
                    deadline = time.monotonic() + 10
                    while not observed.with_suffix('.ready').exists() and time.monotonic() < deadline:
                        self.assertIsNone(child.poll())
                        time.sleep(.005)
                    self.assertTrue(observed.with_suffix('.ready').exists())
                    child.send_signal(sig)
                    self.assertEqual(child.wait(timeout=10), 0)
                    result = json.loads(receipt.read_bytes())
                    self.assertEqual(result['reason'], 'WORKER_INTERRUPTED')
                    self.assertEqual(len(result['sealed_stages']), 2)
                    self.assertNotEqual(result['status'], 'COMPLETE')
                    self.assertIsInstance(result['child_exit_peak_rss_bytes'], int)
                finally:
                    if child.poll() is None:
                        child.kill(); child.wait(timeout=3)


if __name__ == '__main__':
    unittest.main()
