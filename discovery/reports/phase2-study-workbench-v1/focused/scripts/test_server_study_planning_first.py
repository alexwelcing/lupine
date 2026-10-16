"""Independent adversarial HTTP checks of outcome-free prospective planning.

These exercise the real loopback server. Inputs are mathematical hypotheses;
no archived measurements or scientific evaluation outcomes are opened.
"""
from contextlib import ExitStack, redirect_stdout
from fractions import Fraction
import io
import json
import threading
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from lupine_discovery import server
from lupine_discovery.cli import main


POOL_PATH = '/api/plan-pool'
LOSS_PATH = '/api/plan-zero-loss'


def pool(**changes):
    return {'calibration_count': 20, 'alpha': '1/10', 'cutoff': '3/4', **changes}


def loss(**changes):
    return {'loss_ceiling': '1/10', 'significance': '1/20',
            'maximum_evaluation_panels': 100, **changes}


class StudyPlanningHTTPReview(unittest.TestCase):
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

    def request(self, path, value=None, *, raw=None, headers=None, method='POST'):
        payload = raw if raw is not None else json.dumps(value).encode('utf-8')
        request = Request(self.url + path, data=payload if method == 'POST' else None,
                          method=method,
                          headers={'Content-Type': 'application/json', **(headers or {})})
        try:
            response = urlopen(request, timeout=10)
        except HTTPError as error:
            response = error
        with response:
            return response.status, json.loads(response.read()), response.headers

    def assert_bad(self, path, value=None, *, raw=None, status=400, headers=None):
        actual, result, _ = self.request(path, value, raw=raw, headers=headers)
        self.assertEqual(actual, status, result)
        self.assertEqual(set(result), {'error'})
        self.assertIsInstance(result['error']['message'], str)

    def test_cli_and_http_values_agree_without_reading_problem_or_outcomes(self):
        examples = [
            (POOL_PATH, pool(), ['plan-pool', '--calibration-count', '20',
                                '--alpha', '1/10', '--cutoff', '3/4']),
            (POOL_PATH, pool(calibration_count=2, alpha='1/2', iid_score_probability='1/2'),
             ['plan-pool', '--calibration-count', '2', '--alpha', '1/2',
              '--cutoff', '3/4', '--iid-score-probability', '1/2']),
            (LOSS_PATH, loss(), ['plan-zero-loss', '--loss-ceiling', '1/10',
                                '--significance', '1/20', '--maximum-evaluation-panels', '100']),
        ]
        with ExitStack() as stack:
            for name in ('certificate', 'replay_report', 'run_coupled', 'get_case',
                         'get_case_outcomes', 'benchmark_report', 'files'):
                stack.enter_context(patch.object(server, name,
                                                  side_effect=AssertionError('unexpected ' + name)))
            stack.enter_context(patch('lupine_discovery.cli._read_document',
                                      side_effect=AssertionError('unexpected problem read')))
            for path, request, arguments in examples:
                with self.subTest(path=path, request=request):
                    output = io.StringIO()
                    with redirect_stdout(output):
                        self.assertEqual(main(arguments), 0)
                    status, result, _ = self.request(path, request)
                    self.assertEqual(status, 200, result)
                    self.assertEqual(result, json.loads(output.getvalue()))
                    self.assertEqual(set(result), {'schema', 'plan'})

    def test_unknown_probability_remains_unknown_for_null_and_omission(self):
        status, missing, _ = self.request(POOL_PATH, pool())
        self.assertEqual(status, 200, missing)
        status, null, _ = self.request(POOL_PATH, pool(iid_score_probability=None))
        self.assertEqual(status, 200, null)
        self.assertEqual(missing, null)
        plan = missing['plan']
        self.assertEqual(plan['rank'], 19)
        self.assertIsNone(plan['threshold_event_probability'])
        self.assertEqual(plan['planning_status'], 'probability_unspecified')
        self.assertEqual(plan['adequacy_status'], 'unestablished')
        self.assertEqual(plan['calibrated_guarantee_status'], 'not_established_by_planning')
        self.assertEqual(plan['premise_status'], 'hypothetical_unverified')

    def test_rank_infeasible_is_zero_even_with_probability_unknown(self):
        for count in (0, 8):
            with self.subTest(count=count):
                status, result, _ = self.request(POOL_PATH, pool(calibration_count=count))
                self.assertEqual(status, 200, result)
                plan = result['plan']
                self.assertFalse(plan['finite_rank'])
                self.assertEqual(plan['threshold_event_probability'], '0')
                self.assertIsNone(plan['iid_score_probability'])
                self.assertEqual(plan['planning_status'], 'rank_infeasible')
                self.assertIsNone(plan['tolerated_above_cutoff'])

    def test_small_exact_probability_and_integer_probability_endpoints(self):
        for probability, expected in [('1/2', '1/4'), (0, '0'), (1, '1')]:
            with self.subTest(probability=probability):
                status, result, _ = self.request(POOL_PATH, pool(
                    calibration_count=2, alpha='1/2', cutoff=0,
                    iid_score_probability=probability))
                self.assertEqual(status, 200, result)
                self.assertEqual(result['plan']['threshold_event_probability'], expected)
                self.assertEqual(result['plan']['planning_status'], 'hypothetical_iid')
                self.assertEqual(result['plan']['cutoff'], '0')

    def test_exact_decimal_strings_are_normalized_without_rounding(self):
        status, result, _ = self.request(POOL_PATH, pool(
            calibration_count=2, alpha='0.5', cutoff='0.75', iid_score_probability='.5'))
        self.assertEqual(status, 200, result)
        plan = result['plan']
        self.assertEqual((plan['alpha'], plan['cutoff'], plan['iid_score_probability']),
                         ('1/2', '3/4', '1/2'))
        self.assertEqual(plan['threshold_event_probability'], '1/4')

    def test_zero_failure_first_sufficient_panel_boundaries_are_exact(self):
        for rho, maximum, minimum in [('1/10', 28, None), ('1/10', 29, 29),
                                      ('1/20', 58, None), ('1/20', 59, 59)]:
            with self.subTest(rho=rho, maximum=maximum):
                status, result, _ = self.request(LOSS_PATH, loss(
                    loss_ceiling=rho, maximum_evaluation_panels=maximum))
                self.assertEqual(status, 200, result)
                plan = result['plan']
                self.assertEqual(plan['minimum_evaluation_panels'], minimum)
                self.assertEqual(Fraction(plan['zero_failure_null_bound']),
                                 (1 - Fraction(rho)) ** maximum)
                self.assertEqual(plan['resolution_status'],
                                 'insufficient_resolution' if minimum is None
                                 else 'sufficient_zero_failure_resolution')
                self.assertEqual(plan['power_status'], 'not_computed')
                self.assertEqual(plan['observed_evidence_status'], 'no_observations')
                self.assertEqual(plan['premise_status'], 'hypothetical_unverified')

    def test_zero_evaluation_panels_has_no_minimum_and_unit_null_bound(self):
        status, result, _ = self.request(LOSS_PATH, loss(maximum_evaluation_panels=0))
        self.assertEqual(status, 200, result)
        self.assertEqual(result['plan']['zero_failure_null_bound'], '1')
        self.assertIsNone(result['plan']['minimum_evaluation_panels'])
        self.assertIsNone(result['plan']['minimum_zero_failure_null_bound'])

    def test_maximum_bounded_arithmetic_remains_exact_and_serializable(self):
        status, result, _ = self.request(POOL_PATH, pool(
            calibration_count=256, alpha='1/2', iid_score_probability='1/4294967291'))
        self.assertEqual(status, 200, result)
        probability = result['plan']['threshold_event_probability']
        self.assertIsInstance(probability, str)
        self.assertTrue(0 < Fraction(probability) < 1)
        self.assertLess(len(json.dumps(result)), 20000)

    def test_counts_reject_booleans_text_floats_null_and_out_of_range(self):
        for bad in (True, False, '20', 20.0, None, -1, 257, [], {}):
            with self.subTest(count=bad):
                self.assert_bad(POOL_PATH, pool(calibration_count=bad))
                self.assert_bad(LOSS_PATH, loss(maximum_evaluation_panels=bad))

    def test_exact_inputs_reject_float_bool_null_containers_and_large_notation(self):
        for path, make, names in [
                (POOL_PATH, pool, ('alpha', 'cutoff', 'iid_score_probability')),
                (LOSS_PATH, loss, ('loss_ceiling', 'significance'))]:
            for name in names:
                for bad in (True, False, 0.5, [], {}, '', '1e-99999999', '1/0',
                            '1' * 129, '4294967296/4294967297'):
                    with self.subTest(path=path, name=name, value=repr(bad)[:40]):
                        self.assert_bad(path, make(**{name: bad}))
                if name != 'iid_score_probability':
                    self.assert_bad(path, make(**{name: None}))

    def test_probability_domains_and_cutoff_one_are_rejected(self):
        for name in ('alpha',):
            for bad in (0, 1, '-1/10', '11/10'):
                self.assert_bad(POOL_PATH, pool(**{name: bad}))
        for bad in ('-1/10', 1, '11/10'):
            self.assert_bad(POOL_PATH, pool(cutoff=bad))
        for bad in ('-1/10', '11/10'):
            self.assert_bad(POOL_PATH, pool(iid_score_probability=bad))
        for name in ('loss_ceiling', 'significance'):
            for bad in (0, 1, '-1/10', '11/10'):
                self.assert_bad(LOSS_PATH, loss(**{name: bad}))

    def test_closed_request_contract_rejects_missing_extra_and_outcome_fields(self):
        for path, body in [(POOL_PATH, pool()), (LOSS_PATH, loss())]:
            for key in body:
                missing = body.copy()
                del missing[key]
                self.assert_bad(path, missing)
            for extra in ('outcomes', 'data', 'evidence', 'premise_status', 'schema', 'problem'):
                self.assert_bad(path, {**body, extra: []})
            for nonobject in (None, [], 0, True, 'body'):
                self.assert_bad(path, nonobject)

    def test_json_boundary_rejects_duplicate_keys_nonfinite_utf8_and_depth(self):
        raw_bad = [b'{"calibration_count":20,"calibration_count":21,"alpha":"1/10","cutoff":"3/4"}',
                   b'{"calibration_count":20,"alpha":NaN,"cutoff":"3/4"}',
                   b'{"calibration_count":20,"alpha":Infinity,"cutoff":"3/4"}',
                   b'{"calibration_count":20,"alpha":0.1,"cutoff":"3/4"}',
                   b'{', b'\xff', b'[' * 34 + b'0' + b']' * 34]
        for path in (POOL_PATH, LOSS_PATH):
            for raw in raw_bad:
                with self.subTest(path=path, raw=raw[:60]):
                    self.assert_bad(path, raw=raw)

    def test_planner_body_limit_accepts_exact_boundary_and_rejects_one_extra_byte(self):
        for path, body in [(POOL_PATH, pool()), (LOSS_PATH, loss())]:
            encoded = json.dumps(body).encode('ascii')
            exact_limit = encoded + b' ' * (4096 - len(encoded))
            status, result, _ = self.request(path, raw=exact_limit)
            self.assertEqual(status, 200, result)
            self.assert_bad(path, raw=exact_limit + b' ', status=413)

    def test_local_request_guards_media_type_and_non_caching_remain_in_force(self):
        for path, body in [(POOL_PATH, pool()), (LOSS_PATH, loss())]:
            self.assert_bad(path, body, status=403, headers={'Origin': 'https://external.invalid'})
            self.assert_bad(path, body, status=403, headers={'Host': 'external.invalid'})
            self.assert_bad(path, body, status=415, headers={'Content-Type': 'text/plain'})
            status, result, headers = self.request(path, body)
            self.assertEqual(status, 200, result)
            self.assertEqual(headers['Cache-Control'], 'no-store')
            self.assertEqual(headers['X-Content-Type-Options'], 'nosniff')
            self.assertNotIn('Access-Control-Allow-Origin', headers)
            self.assertEqual(self.request(path, method='GET')[0], 404)


if __name__ == '__main__':
    unittest.main()
