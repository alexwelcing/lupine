"""Raw statistical HTTP mode, guarded replay ordering and stale-receipt refusal."""
from copy import deepcopy
import json
import threading
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from lupine_discovery import server
from lupine_discovery.benchmarks import get_case, get_case_outcomes
from lupine_discovery.coupled_worker import CoupledWorkerError, guard_available, run_coupled


@unittest.skipUnless(guard_available(), 'Linux resource guards required')
class DecisionPoolServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.http = server.make_server(0)
        cls.thread = threading.Thread(target=cls.http.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f'http://127.0.0.1:{cls.http.server_address[1]}'

    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown()
        cls.http.server_close()
        cls.thread.join(timeout=2)

    def request(self, path, value):
        request = Request(self.url + path, data=json.dumps(value).encode(),
                          headers={'Content-Type': 'application/json'})
        try:
            response = urlopen(request, timeout=15)
        except HTTPError as error:
            response = error
        with response:
            return response.status, json.loads(response.read())

    def problem(self, name='decision-pool-ranked-ties'):
        return get_case(name)['problem']

    def test_three_builtin_statistical_cases_keep_original_receipt_and_real_failures(self):
        for name, retained in [('decision-pool-ranked-ties', ['a', 'b']),
                               ('decision-pool-missing-label', ['a', 'b', 'c', 'd']),
                               ('decision-pool-feasible-failure', [])]:
            with self.subTest(name=name):
                raw = json.dumps(self.problem(name))
                status, receipt = self.request('/api/select', {'problem_raw': raw})
                self.assertEqual(status, 200, receipt)
                self.assertEqual(receipt['selection']['retained'], retained)
                status, verified = self.request('/api/verify', {'problem_raw': raw, 'certificate_raw': json.dumps(receipt)})
                self.assertEqual(status, 200, verified)
                self.assertTrue(verified['verified'])
                status, report = self.request(f'/api/cases/{name}/replay', {'problem_raw': raw})
                self.assertEqual(status, 200, report)
                self.assertEqual(report['decision']['certificate'], receipt)
                if name != 'decision-pool-missing-label':
                    self.assertEqual(report['outcome_audit']['retention_test'], 'feasible_failure')
                    self.assertFalse(report['outcome_audit']['all_true_minimizers_retained'])

    def test_builtin_answer_resource_is_opened_after_guarded_selection_completes(self):
        problem = self.problem()
        events = []
        def guarded(operation, *args, **kwargs):
            result = run_coupled(operation, *args, **kwargs)
            events.append(operation + '_sealed')
            return result
        def answers(name, supplied):
            self.assertEqual(events, ['select_sealed'])
            self.assertEqual(supplied, problem)
            events.append('answers_opened')
            return get_case_outcomes(name, supplied)
        with patch.object(server, 'run_coupled', side_effect=guarded), patch.object(server, 'get_case_outcomes', side_effect=answers):
            status, result = self.request('/api/cases/decision-pool-ranked-ties/replay', {'problem_raw': json.dumps(problem)})
        self.assertEqual(status, 200, result)
        self.assertEqual(events, ['select_sealed', 'answers_opened', 'replay_sealed'])

    def test_nested_new_mode_rejected_without_legacy_dispatch_or_answer_access(self):
        problem = self.problem()
        with (patch.object(server, 'certificate', side_effect=AssertionError('legacy select')),
              patch.object(server, 'replay_report', side_effect=AssertionError('legacy replay')),
              patch.object(server, 'get_case_outcomes') as answers,
              patch.object(server, 'run_coupled') as guarded):
            for path, body, code in [('/api/select', {'problem': problem}, 'raw_problem_required'),
                                     ('/api/replay', {'problem': problem, 'outcomes': {}}, 'raw_outcomes_required'),
                                     ('/api/cases/decision-pool-ranked-ties/replay', {'problem': problem}, 'raw_problem_required')]:
                with self.subTest(path=path):
                    status, result = self.request(path, body)
                    self.assertEqual(status, 400)
                    self.assertEqual(result['error']['code'], code)
                    self.assertFalse(result['error']['decision_receipt_available'])
            answers.assert_not_called()
            guarded.assert_not_called()

    def test_guard_failure_returns_only_error_and_never_opens_builtin_answers(self):
        for code in ('guard_unavailable', 'worker_timeout', 'worker_output_limit', 'worker_invalid_response'):
            with self.subTest(code=code), patch.object(server, 'run_coupled', side_effect=CoupledWorkerError(code, 'synthetic guard failure')), patch.object(server, 'get_case_outcomes') as answers:
                status, result = self.request('/api/cases/decision-pool-ranked-ties/replay', {'problem_raw': json.dumps(self.problem())})
                self.assertEqual(status, 503)
                self.assertEqual(set(result), {'error'})
                self.assertFalse(result['error']['decision_receipt_available'])
                answers.assert_not_called()

    def test_original_metadata_edit_breaks_verification_and_packaged_answer_seal(self):
        problem = self.problem()
        status, receipt = self.request('/api/select', {'problem_raw': json.dumps(problem)})
        self.assertEqual(status, 200)
        changed = deepcopy(problem)
        changed['description'] = 'different original declaration'
        status, result = self.request('/api/verify', {'problem_raw': json.dumps(changed), 'certificate_raw': json.dumps(receipt)})
        self.assertEqual(status, 400, result)
        self.assertFalse(result['error']['decision_receipt_available'])
        status, result = self.request('/api/cases/decision-pool-ranked-ties/replay', {'problem_raw': json.dumps(changed)})
        self.assertEqual(status, 400, result)
        self.assertNotIn('decision', result)

    def test_raw_custom_replay_requires_matching_separate_future_identity(self):
        problem = self.problem()
        truth = get_case_outcomes('decision-pool-ranked-ties', problem)
        status, result = self.request('/api/replay', {'problem_raw': json.dumps(problem), 'outcomes_raw': json.dumps(truth)})
        self.assertEqual(status, 200, result)
        self.assertFalse(result['outcome_audit']['all_true_minimizers_retained'])
        truth['certificate_digest'] = '0' * 64
        status, result = self.request('/api/replay', {'problem_raw': json.dumps(problem), 'outcomes_raw': json.dumps(truth)})
        self.assertEqual(status, 400, result)
        self.assertFalse(result['error']['decision_receipt_available'])
        status, result = self.request('/api/coupled-domains', {'problem_raw': json.dumps(problem)})
        self.assertEqual(status, 400, result)
        self.assertFalse(result['error']['decision_receipt_available'])


if __name__ == '__main__':
    unittest.main()
