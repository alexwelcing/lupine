"""Independent constructed counter/syscall checks; no scientific inputs."""
import importlib.util
import io
from pathlib import Path
import types
import unittest
from unittest import mock

SOURCE = Path(__file__).resolve().parents[1] / 'scripts/mpea_stage_usage.py'
spec = importlib.util.spec_from_file_location('independent_stage_usage', SOURCE)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

KEYS = {'schema', 'stage', 'scope', 'clock', 'cpu_clock', 'monotonic_start_ns',
    'monotonic_end_ns', 'wall_elapsed_ns', 'wall_seconds', 'cpu_seconds',
    'process_cpu_start_ns', 'process_cpu_end_ns', 'process_cpu_elapsed_ns',
    'process_lifetime_peak_rss_start_bytes', 'process_lifetime_peak_rss_end_bytes',
    'resident_start_bytes', 'resident_end_bytes', 'boundary_observed_rss_max_bytes',
    'within_stage_peak_rss_bytes', 'within_stage_peak_rss_status', 'descendant_resources_included'}


class StageUsageReview(unittest.TestCase):
    def observe(self, wall=(1234, 1000001234), cpu=(7, 250000007), rss=((1000, 4096), (500, 8192))):
        with mock.patch.object(m.time, 'monotonic_ns', side_effect=wall), \
             mock.patch.object(m.time, 'process_time_ns', side_effect=cpu), \
             mock.patch.object(m, '_rss', side_effect=rss):
            return m.StageUsage.start('development').finish()

    def test_exact_closed_observation_and_distinct_rss_meanings(self):
        result = self.observe()
        self.assertEqual(set(result), KEYS)
        self.assertEqual(result, {
            'schema': 'lupine.mpea.stage-resource-observation.v1', 'stage': 'development',
            'scope': 'worker_process_self', 'clock': 'monotonic_ns', 'cpu_clock': 'process_time_ns',
            'monotonic_start_ns': 1234, 'monotonic_end_ns': 1000001234,
            'wall_elapsed_ns': 1000000000, 'wall_seconds': '1/1', 'cpu_seconds': '1/4',
            'process_cpu_start_ns': 7, 'process_cpu_end_ns': 250000007, 'process_cpu_elapsed_ns': 250000000,
            'process_lifetime_peak_rss_start_bytes': 4096, 'process_lifetime_peak_rss_end_bytes': 8192,
            'resident_start_bytes': 1000, 'resident_end_bytes': 500, 'boundary_observed_rss_max_bytes': 1000,
            'within_stage_peak_rss_bytes': None, 'within_stage_peak_rss_status': 'NOT_MEASURED',
            'descendant_resources_included': False})

    def test_zero_interval_is_measured_zero_without_inventing_stage_peak(self):
        result = self.observe(wall=(0, 0), cpu=(0, 0))
        self.assertEqual(result['wall_seconds'], '0/1')
        self.assertEqual(result['cpu_seconds'], '0/1')
        self.assertIsNone(result['within_stage_peak_rss_bytes'])

    def test_all_thread_cpu_can_exceed_wall_and_lifetime_peak_can_exceed_boundary(self):
        result = self.observe(wall=(0, 1), cpu=(0, 10), rss=((100, 10000), (50, 10000)))
        self.assertEqual(result['wall_seconds'], '1/1000000000')
        self.assertEqual(result['cpu_seconds'], '1/100000000')
        self.assertEqual(result['boundary_observed_rss_max_bytes'], 100)
        self.assertEqual(result['process_lifetime_peak_rss_end_bytes'], 10000)

    def test_exact_63_bit_counter_boundary_without_float_rounding(self):
        bound = 2**63 - 1
        result = self.observe(wall=(bound - 3, bound), cpu=(bound - 7, bound))
        self.assertEqual(result['wall_seconds'], '3/1000000000')
        self.assertEqual(result['cpu_seconds'], '7/1000000000')

    def test_invalid_counter_types_and_bounds_reject(self):
        class IntSubclass(int): pass
        for value in (True, False, 1.0, '1', None, -1, 2**63, IntSubclass(1)):
            for clock in ('wall', 'cpu'):
                with self.subTest(clock=clock, value=value), self.assertRaises(m.UsageError):
                    self.observe(**{clock: (value, 1)})

    def test_invalid_end_counter_never_produces_partial_observation(self):
        for value in (True, 1.0, None, -1, 2**63):
            for clock in ('wall', 'cpu'):
                with self.subTest(clock=clock, value=value), self.assertRaises(m.UsageError):
                    self.observe(**{clock: (0, value)})

    def test_counter_and_lifetime_peak_reversal_rejects(self):
        cases = [dict(wall=(9, 8)), dict(cpu=(9, 8)), dict(rss=((100, 8192), (50, 4096)))]
        for arguments in cases:
            with self.subTest(arguments=arguments), self.assertRaises(m.UsageError): self.observe(**arguments)

    def test_invalid_stage_rejected_before_any_observation(self):
        for stage in (None, True, 1, b'development', '', 'evaluation\n', 'private-sensitive-text'):
            with mock.patch.object(m.time, 'monotonic_ns', side_effect=AssertionError('clock reached')), \
                 mock.patch.object(m, '_rss', side_effect=AssertionError('RSS reached')), \
                 self.assertRaises(m.UsageError):
                m.StageUsage.start(stage)

    def test_second_successful_finish_does_not_observe_again(self):
        with mock.patch.object(m.time, 'monotonic_ns', return_value=0), \
             mock.patch.object(m.time, 'process_time_ns', return_value=0), \
             mock.patch.object(m, '_rss', return_value=(1, 1)) as rss:
            stage = m.StageUsage('replay'); first = stage.finish()
            first['stage'] = 'mutated returned dict'
            with self.assertRaises(m.UsageError): stage.finish()
            self.assertEqual(rss.call_count, 2)

    def test_stage_label_cannot_change_after_start(self):
        with mock.patch.object(m.time, 'monotonic_ns', return_value=0), \
             mock.patch.object(m.time, 'process_time_ns', return_value=0), \
             mock.patch.object(m, '_rss', return_value=(1, 1)):
            stage = m.StageUsage('development')
            try:
                stage.stage = 'SENSITIVE_INVALID_STAGE'
            except (AttributeError, m.UsageError):
                pass
            self.assertEqual(stage.finish()['stage'], 'development')

    def test_failed_finish_is_not_retried_into_an_apparently_valid_observation(self):
        with mock.patch.object(m.time, 'monotonic_ns', return_value=0), \
             mock.patch.object(m.time, 'process_time_ns', return_value=0), \
             mock.patch.object(m, '_rss', side_effect=[(1, 1), m.UsageError('USAGE_OBSERVATION_UNAVAILABLE'), AssertionError('retried resource observation')]) as rss:
            stage = m.StageUsage('development')
            with self.assertRaises(m.UsageError): stage.finish()
            with self.assertRaises(m.UsageError): stage.finish()
            self.assertEqual(rss.call_count, 2)

    def test_each_declared_stage_produces_its_original_label(self):
        for name in ('allocation', 'input_freeze', 'development', 'rank_freeze', 'reserved', 'calibration', 'replay', 'evaluation'):
            with mock.patch.object(m.time, 'monotonic_ns', return_value=0), \
                 mock.patch.object(m.time, 'process_time_ns', return_value=0), \
                 mock.patch.object(m, '_rss', return_value=(1, 1)):
                self.assertEqual(m.StageUsage.start(name).finish()['stage'], name)

    def test_clock_system_failures_are_constant_closed_errors(self):
        for name in ('monotonic_ns', 'process_time_ns'):
            with self.subTest(clock=name):
                with mock.patch.object(m.time, name, side_effect=OSError('SENSITIVE_SYSTEM_ERROR')), \
                     self.assertRaises(m.UsageError) as raised:
                    m.StageUsage('reserved')
                self.assertNotIn('SENSITIVE', str(raised.exception))

    def test_finish_clock_failure_consumes_observation_and_keeps_error_constant(self):
        for name in ('monotonic_ns', 'process_time_ns'):
            with self.subTest(clock=name):
                with mock.patch.object(m.time, 'monotonic_ns', return_value=0), \
                     mock.patch.object(m.time, 'process_time_ns', return_value=0), \
                     mock.patch.object(m, '_rss', return_value=(1, 1)):
                    stage = m.StageUsage('evaluation')
                    with mock.patch.object(m.time, name, side_effect=OSError('SENSITIVE_FINISH_ERROR')), \
                         self.assertRaises(m.UsageError) as raised:
                        stage.finish()
                    self.assertEqual(str(raised.exception), 'USAGE_OBSERVATION_UNAVAILABLE')
                    with mock.patch.object(m, '_rss', side_effect=AssertionError('retry observed')), \
                         self.assertRaises(m.UsageError): stage.finish()


class ResourceReadReview(unittest.TestCase):
    def rss(self, raw=b'100 2 0 0 0 0 0\n', *, page=4096, peak=12):
        stream = io.BytesIO(raw)
        with mock.patch.object(m.sys, 'platform', 'linux'), \
             mock.patch.object(m.Path, 'open', return_value=stream), \
             mock.patch.object(m.os, 'sysconf', return_value=page), \
             mock.patch.object(m.resource, 'getrusage', return_value=types.SimpleNamespace(ru_maxrss=peak)):
            return m._rss()

    def test_actual_units_are_pages_and_linux_kibibytes(self):
        self.assertEqual(self.rss(page=8192, peak=40), (16384, 40960))

    def test_inexact_malformed_or_oversized_statm_does_not_expose_snippet(self):
        raws = [b'', b'100 2 0 0 0 0\n', b'100 2 0 0 0 0 0 0\n',
                b'100 -2 0 0 0 0 0\n', b'100 2.0 0 0 0 0 0\n',
                b'100 \xff 0 0 0 0 0\n', b'SENSITIVE_TOKEN', b'1 ' * 129]
        for raw in raws:
            with self.subTest(raw=raw), self.assertRaises(m.UsageError) as raised: self.rss(raw)
            self.assertNotIn('SENSITIVE', str(raised.exception))

    def test_statm_read_is_bounded_before_numeric_conversion(self):
        stream = mock.MagicMock(); stream.__enter__.return_value = stream
        stream.read.return_value = b'x' * 257
        with mock.patch.object(m.sys, 'platform', 'linux'), \
             mock.patch.object(m.Path, 'open', return_value=stream), \
             mock.patch.object(m.os, 'sysconf', side_effect=AssertionError('conversion reached')), \
             self.assertRaises(m.UsageError): m._rss()
        stream.read.assert_called_once_with(257)

    def test_nonlinux_rejects_without_attempting_proc(self):
        with mock.patch.object(m.sys, 'platform', 'darwin'), \
             mock.patch.object(m.Path, 'open', side_effect=AssertionError('proc reached')), \
             self.assertRaises(m.UsageError) as raised: m._rss()
        self.assertEqual(str(raised.exception), 'USAGE_PLATFORM_UNSUPPORTED')

    def test_resource_system_errors_are_constant(self):
        for name in ('open', 'sysconf', 'getrusage'):
            open_value = mock.MagicMock(); open_value.__enter__.return_value = io.BytesIO(b'100 2 0 0 0 0 0\n')
            with mock.patch.object(m.sys, 'platform', 'linux'), \
                 mock.patch.object(m.Path, 'open', side_effect=OSError('SENSITIVE') if name == 'open' else None, return_value=open_value), \
                 mock.patch.object(m.os, 'sysconf', side_effect=OSError('SENSITIVE') if name == 'sysconf' else None, return_value=4096), \
                 mock.patch.object(m.resource, 'getrusage', side_effect=OSError('SENSITIVE') if name == 'getrusage' else None, return_value=types.SimpleNamespace(ru_maxrss=1)), \
                 self.assertRaises(m.UsageError) as raised:
                m._rss()
            self.assertNotIn('SENSITIVE', str(raised.exception))

    def test_page_size_and_peak_types_cannot_be_laundered_by_multiplication(self):
        for page, peak in ((True, 12), (False, 12), (0, 12), (4096, True), (4096, False), (4096, 1.5)):
            with self.subTest(page=page, peak=peak), self.assertRaises(m.UsageError): self.rss(page=page, peak=peak)

    def test_resource_byte_overflow_rejects(self):
        for raw, page, peak in ((b'1 9223372036854775807 0 0 0 0 0', 4096, 1),
                              (b'1 1 0 0 0 0 0', 4096, 2**63)):
            with self.subTest(page=page, peak=peak), self.assertRaises(m.UsageError):
                self.rss(raw, page=page, peak=peak)


if __name__ == '__main__': unittest.main()
