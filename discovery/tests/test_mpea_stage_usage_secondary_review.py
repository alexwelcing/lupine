"""Independent collector controls; no source data, allocation, or network."""
from fractions import Fraction
import importlib.util
import io
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'src/lupine_discovery').is_dir())
SOURCE = ROOT / 'scripts/mpea_stage_usage.py'
spec = importlib.util.spec_from_file_location('reviewed_stage_usage', SOURCE)
usage = importlib.util.module_from_spec(spec)
spec.loader.exec_module(usage)


class IndependentStageUsageReview(unittest.TestCase):
    def controlled(self, wall=(2000000001, 4000000003), cpu=(17, 20), rss=((160, 500), (96, 500))):
        with patch.object(usage.time, 'monotonic_ns', side_effect=wall), \
             patch.object(usage.time, 'process_time_ns', side_effect=cpu), \
             patch.object(usage, '_rss', side_effect=rss):
            observation = usage.StageUsage.start('calibration')
            result = observation.finish()
        return observation, result

    def test_exact_elapsed_seconds_and_independent_fraction_oracle(self):
        _, result = self.controlled()
        for stem, prefix in [('wall', 'monotonic'), ('process_cpu', 'process_cpu')]:
            exact_ns = result[prefix + '_end_ns'] - result[prefix + '_start_ns']
            self.assertEqual(result[stem + '_elapsed_ns'], exact_ns)
            key = 'cpu_seconds' if stem == 'process_cpu' else 'wall_seconds'
            numerator, denominator = map(int, result[key].split('/'))
            oracle = Fraction(exact_ns, 10**9)
            self.assertEqual((numerator, denominator), (oracle.numerator, oracle.denominator))
        self.assertEqual(result['wall_seconds'], '1000000001/500000000')
        self.assertEqual(result['cpu_seconds'], '3/1000000000')

    def test_lifetime_and_boundary_observations_do_not_fabricate_stage_peak(self):
        _, result = self.controlled()
        self.assertEqual(result['process_lifetime_peak_rss_start_bytes'], 500)
        self.assertEqual(result['process_lifetime_peak_rss_end_bytes'], 500)
        self.assertEqual(result['boundary_observed_rss_max_bytes'], 160)
        self.assertEqual((result['resident_start_bytes'], result['resident_end_bytes']), (160, 96))
        self.assertIsNone(result['within_stage_peak_rss_bytes'])
        self.assertEqual(result['within_stage_peak_rss_status'], 'NOT_MEASURED')
        self.assertIs(result['descendant_resources_included'], False)

    def test_exact_output_keyset_and_scope_are_closed(self):
        _, result = self.controlled()
        expected = {'schema', 'stage', 'scope', 'clock', 'cpu_clock', 'monotonic_start_ns',
                    'monotonic_end_ns', 'wall_elapsed_ns', 'wall_seconds', 'cpu_seconds',
                    'process_cpu_start_ns', 'process_cpu_end_ns', 'process_cpu_elapsed_ns',
                    'process_lifetime_peak_rss_start_bytes', 'process_lifetime_peak_rss_end_bytes',
                    'resident_start_bytes', 'resident_end_bytes', 'boundary_observed_rss_max_bytes',
                    'within_stage_peak_rss_bytes', 'within_stage_peak_rss_status',
                    'descendant_resources_included'}
        self.assertEqual(set(result), expected)
        self.assertEqual((result['stage'], result['scope'], result['clock'], result['cpu_clock']),
                         ('calibration', 'worker_process_self', 'monotonic_ns', 'process_time_ns'))

    def test_zero_elapsed_is_measured_zero_not_unavailable(self):
        _, result = self.controlled(wall=(0, 0), cpu=(0, 0))
        self.assertEqual((result['wall_seconds'], result['cpu_seconds']), ('0/1', '0/1'))

    def test_process_threads_cpu_may_exceed_wall_without_false_rejection(self):
        _, result = self.controlled(wall=(1, 2), cpu=(1, 4))
        self.assertGreater(result['process_cpu_elapsed_ns'], result['wall_elapsed_ns'])

    def test_successful_finish_is_one_shot_before_any_new_observation(self):
        observer, _ = self.controlled()
        with patch.object(usage, '_rss', side_effect=AssertionError('unexpected read')):
            with self.assertRaisesRegex(usage.UsageError, '^USAGE_ALREADY_FINISHED$'):
                observer.finish()

    def test_invalid_stage_or_integer_does_not_silently_coerce(self):
        class Alias(str):
            pass
        for stage in ('', 'DEVELOPMENT', 'eval', None, 1, True, Alias('development')):
            with self.subTest(stage=repr(stage)), patch.object(usage, '_rss', side_effect=AssertionError()):
                with self.assertRaisesRegex(usage.UsageError, '^USAGE_STAGE_INVALID$'):
                    usage.StageUsage.start(stage)
        for value in (-1, True, False, 0.0, '3', None, 2**63):
            with self.subTest(value=repr(value)), self.assertRaisesRegex(usage.UsageError, '^USAGE_OBSERVATION_INVALID$'):
                usage._number(value)
        self.assertEqual(usage._number(2**63 - 1), 2**63 - 1)

    def test_backward_clocks_or_decreasing_lifetime_peak_are_errors(self):
        for kwargs in ({'wall': (2, 1)}, {'cpu': (2, 1)}, {'rss': ((1, 20), (1, 19))}):
            with self.subTest(kwargs=kwargs), self.assertRaisesRegex(usage.UsageError, '^USAGE_OBSERVATION_INVALID$'):
                self.controlled(**kwargs)

    def test_linux_rss_reads_bounded_statm_and_converts_pages_and_kib(self):
        stream = io.BytesIO(b'100 7 2 1 0 3 0\n')
        with patch.object(usage.sys, 'platform', 'linux'), \
             patch.object(usage.Path, 'open', return_value=stream), \
             patch.object(usage.os, 'sysconf', return_value=4096) as page, \
             patch.object(usage.resource, 'getrusage', return_value=SimpleNamespace(ru_maxrss=41)) as peak:
            self.assertEqual(usage._rss(), (7*4096, 41*1024))
            page.assert_called_once_with('SC_PAGE_SIZE')
            peak.assert_called_once_with(usage.resource.RUSAGE_SELF)

    def test_bad_or_unavailable_rss_has_constant_reason_without_sentinel(self):
        for raw in (b'', b'1 2 3', b'1 -2 3 4 5 6 7', b'1 2.0 3 4 5 6 7', b'1 '*129):
            with self.subTest(raw=raw), patch.object(usage.sys, 'platform', 'linux'), \
                 patch.object(usage.Path, 'open', return_value=io.BytesIO(raw)), \
                 self.assertRaisesRegex(usage.UsageError, '^USAGE_OBSERVATION_UNAVAILABLE$'):
                usage._rss()
        with patch.object(usage.sys, 'platform', 'linux'), \
             patch.object(usage.Path, 'open', side_effect=OSError('PRIVATE_SENTINEL')), \
             self.assertRaisesRegex(usage.UsageError, '^USAGE_OBSERVATION_UNAVAILABLE$'):
            usage._rss()

    def test_unsupported_platform_fails_before_proc_read(self):
        with patch.object(usage.sys, 'platform', 'darwin'), \
             patch.object(usage.Path, 'open', side_effect=AssertionError('unexpected read')), \
             self.assertRaisesRegex(usage.UsageError, '^USAGE_PLATFORM_UNSUPPORTED$'):
            usage._rss()

    def test_actual_linux_process_observations_are_nonnegative_and_scoped(self):
        observer = usage.StageUsage.start('development')
        total = sum(i*i for i in range(30000))
        self.assertGreater(total, 0)
        result = observer.finish()
        self.assertGreaterEqual(result['wall_elapsed_ns'], 0)
        self.assertGreaterEqual(result['process_cpu_elapsed_ns'], 0)
        self.assertGreater(result['resident_start_bytes'], 0)
        self.assertGreater(result['process_lifetime_peak_rss_end_bytes'], 0)
        self.assertEqual(result['boundary_observed_rss_max_bytes'], max(result['resident_start_bytes'], result['resident_end_bytes']))
        self.assertIsNone(result['within_stage_peak_rss_bytes'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
