"""Real CLI/HTTP finite-frame planning contracts, using hypothetical counts only."""
from contextlib import ExitStack, redirect_stdout
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from lupine_discovery import server
from lupine_discovery.cli import main

PATH = '/api/plan-finite-zero-loss'
SCHEMA = 'lupine.discovery.finite_zero_failure_resolution_plan.v1'


def inputs(**changes):
    return {'population_panels': 10, 'loss_ceiling': '1/5', 'significance': '1/20',
            'maximum_evaluation_panels': 10, **changes}


def arguments(value):
    result = ['plan-finite-zero-loss']
    for name in ('population_panels', 'loss_ceiling', 'significance', 'maximum_evaluation_panels'):
        result.extend(['--' + name.replace('_', '-'), str(value[name])])
    return result


class FinitePlanningTransportTests(unittest.TestCase):
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

    def request(self, value=None, *, raw=None, headers=None, path=PATH):
        request = Request(self.url + path, data=raw if raw is not None else json.dumps(value).encode(),
                          headers={'Content-Type': 'application/json', **(headers or {})}, method='POST')
        try:
            response = urlopen(request, timeout=10)
        except HTTPError as error:
            response = error
        with response:
            return response.status, json.loads(response.read())

    def command(self, value, *extra):
        return subprocess.run([sys.executable, '-m', 'lupine_discovery', *arguments(value), *extra],
                              capture_output=True, text=True, timeout=20)

    def test_known_combinatorial_count_exact_cli_http_agreement(self):
        # Ten fixed panels, two failures at the null boundary. At e=7,
        # 8/120=1/15 zero-failure subsets; at e=8, 1/45. Thus the minimum is8.
        value = inputs()
        result = self.command(value)
        self.assertEqual(result.returncode, 0, result.stderr)
        parsed = json.loads(result.stdout)
        status, served = self.request(value)
        self.assertEqual(status, 200, served)
        self.assertEqual(served, parsed)
        self.assertEqual(set(parsed), {'schema', 'plan'})
        self.assertEqual(parsed['schema'], SCHEMA)
        plan = parsed['plan']
        self.assertEqual(plan['minimum_null_failures'], 2)
        self.assertEqual(plan['attainable_null_failure_fraction'], '1/5')
        self.assertEqual(plan['minimum_evaluation_panels'], 8)
        self.assertEqual(plan['minimum_zero_failure_null_bound'], '1/45')
        self.assertEqual(plan['zero_failure_null_bound'], '0')
        self.assertEqual(plan['observed_evidence_status'], 'no_observations')
        self.assertEqual(plan['power_status'], 'not_computed')
        self.assertEqual(plan['adequacy_status'], 'unestablished')

    def test_cap_zero_and_insufficient_resolution_preserve_nulls(self):
        for cap, chance in ((0, '1'), (7, '1/15')):
            value = {**inputs(), 'maximum_evaluation_panels': cap}
            status, result = self.request(value)
            self.assertEqual(status, 200, result)
            plan = result['plan']
            self.assertIsNone(plan['minimum_evaluation_panels'])
            self.assertIsNone(plan['minimum_zero_failure_null_bound'])
            self.assertEqual(plan['zero_failure_null_bound'], chance)
            self.assertEqual(plan['resolution_status'], 'insufficient_resolution')

    def test_discrete_null_boundary_and_equality(self):
        value = {'population_panels': 3, 'loss_ceiling': '1/2', 'significance': '1/3',
                 'maximum_evaluation_panels': 1}
        status, result = self.request(value)
        self.assertEqual(status, 200, result)
        plan = result['plan']
        self.assertEqual(plan['minimum_null_failures'], 2)
        self.assertEqual(plan['attainable_null_failure_fraction'], '2/3')
        self.assertEqual(plan['minimum_evaluation_panels'], 1)
        self.assertEqual(plan['minimum_zero_failure_null_bound'], '1/3')

    def test_no_problem_archive_or_outcome_read(self):
        value = inputs()
        with ExitStack() as stack:
            guards = []
            for name in ('certificate', 'replay_report', 'run_coupled', 'get_case',
                         'get_case_outcomes', 'benchmark_report', 'files'):
                guards.append(stack.enter_context(patch.object(server, name,
                    side_effect=AssertionError('unexpected scientific path'))))
            guards.append(stack.enter_context(patch('lupine_discovery.cli._read_document',
                side_effect=AssertionError('unexpected input document'))))
            output = io.StringIO()
            with redirect_stdout(output):
                self.assertEqual(main(arguments(value)), 0)
            status, served = self.request(value)
            self.assertEqual(status, 200, served)
            self.assertEqual(served, json.loads(output.getvalue()))
            for guard in guards:
                guard.assert_not_called()

    def test_closed_fields_and_invalid_counts(self):
        bad = [None, [], {}, {**inputs(), 'outcomes': {}}, {**inputs(), 'source': '/unused'},
               {**inputs(), 'iid': True}, {**inputs(), 'loss_ceiling': '1e-1000000000'},
               {**inputs(), 'loss_ceiling': 0.2}, {**inputs(), 'significance': True}]
        for name, values in (('population_panels', [0, -1, 257, True, '10', None]),
                             ('maximum_evaluation_panels', [-1, 11, True, '2', None])):
            bad.extend({**inputs(), name: value} for value in values)
        for value in bad:
            with self.subTest(value=value):
                status, result = self.request(value)
                self.assertEqual(status, 400, result)
                self.assertEqual(set(result), {'error'})

    def test_duplicate_fields_nonfinite_and_depth_are_rejected(self):
        raw = json.dumps(inputs()).encode()
        for payload in (raw[:-1] + b',"population_panels":10}', raw.replace(b'10', b'NaN', 1),
                        b'[' * 34 + b'0' + b']' * 34):
            with self.subTest(payload=payload):
                status, result = self.request(raw=payload)
                self.assertEqual(status, 400, result)
                self.assertEqual(set(result), {'error'})

    def test_same_body_limit_and_origin_guards(self):
        for raw, headers, expected in ((b' ' * 4097, {}, 413),
                (json.dumps(inputs()).encode(), {'Origin': 'https://invalid.example'}, 403),
                (json.dumps(inputs()).encode(), {'Content-Type': 'text/plain'}, 415)):
            status, result = self.request(raw=raw, headers=headers)
            self.assertEqual(status, expected, result)
            self.assertEqual(set(result), {'error'})

    def test_output_file_and_invalid_input_preserve_existing_output(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'plan.json'
            result = self.command(inputs(), '--output', str(path))
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stdout, '')
            prior = path.read_bytes()
            self.assertEqual(json.loads(prior)['schema'], SCHEMA)
            for value in ({**inputs(), 'maximum_evaluation_panels': 11},
                          {**inputs(), 'population_panels': 0},
                          {**inputs(), 'loss_ceiling': '1e-1000000000'}):
                result = self.command(value, '--output', str(path))
                self.assertEqual(result.returncode, 2, result.stderr)
                self.assertEqual(result.stdout, '')
                self.assertEqual(path.read_bytes(), prior)

    def test_cli_cannot_accept_outcome_or_source_option(self):
        for option in ('--outcomes', '--source'):
            result = self.command(inputs(), option, 'never-opened.json')
            self.assertEqual(result.returncode, 2)
            self.assertIn('unrecognized arguments', result.stderr)

    def test_iid_endpoint_remains_a_distinct_unchanged_claim(self):
        value = {'loss_ceiling': '1/10', 'significance': '1/20', 'maximum_evaluation_panels': 100}
        status, result = self.request(value, path='/api/plan-zero-loss')
        self.assertEqual(status, 200, result)
        self.assertEqual(result['schema'], 'lupine.discovery.zero_failure_resolution_plan.v1')
        self.assertEqual(result['plan']['minimum_evaluation_panels'], 29)
        self.assertNotIn('population_panels', result['plan'])
        status, result = self.request({**value, 'population_panels': 100}, path='/api/plan-zero-loss')
        self.assertEqual(status, 400, result)


if __name__ == '__main__':
    unittest.main()
