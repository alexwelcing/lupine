import importlib.util,time,unittest
from fractions import Fraction
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'scripts/mpea_stage_usage.py';spec=importlib.util.spec_from_file_location('usage',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Observations(unittest.TestCase):
    def test_actual_wait_and_cpu(self):
        stage=m.StageUsage('development');time.sleep(.02)
        sum(i*i for i in range(200000));v=stage.finish()
        self.assertGreater(v['wall_elapsed_ns'],20_000_000)
        self.assertGreater(v['process_cpu_elapsed_ns'],0)
        self.assertEqual(Fraction(v['wall_seconds']),Fraction(v['wall_elapsed_ns'],10**9))
        self.assertEqual(Fraction(v['cpu_seconds']),Fraction(v['process_cpu_elapsed_ns'],10**9))
        self.assertEqual(m._seconds(0),'0/1');self.assertEqual(m._seconds(500_000_000),'1/2')
        self.assertEqual(v['wall_elapsed_ns'],v['monotonic_end_ns']-v['monotonic_start_ns'])
        self.assertEqual(v['process_cpu_elapsed_ns'],v['process_cpu_end_ns']-v['process_cpu_start_ns'])
        for k,x in v.items():
            if k.endswith(('_ns','_bytes')) and x is not None:self.assertIs(type(x),int);self.assertGreaterEqual(x,0)
    def test_actual_memory_scope(self):
        stage=m.StageUsage('reserved');block=bytearray(16*1024*1024)
        for i in range(0,len(block),4096):block[i]=1
        v=stage.finish();self.assertGreater(v['resident_end_bytes'],0)
        self.assertGreaterEqual(v['process_lifetime_peak_rss_end_bytes'],v['process_lifetime_peak_rss_start_bytes'])
        self.assertEqual(v['boundary_observed_rss_max_bytes'],max(v['resident_start_bytes'],v['resident_end_bytes']))
        self.assertIsNone(v['within_stage_peak_rss_bytes']);self.assertFalse(v['descendant_resources_included'])
    def test_one_shot_and_invalid_stage(self):
        stage=m.StageUsage('allocation');stage.finish()
        with self.assertRaises(m.UsageError):stage.finish()
        for v in ('unknown',None,1):
            with self.assertRaises(m.UsageError):m.StageUsage(v)
if __name__=='__main__':unittest.main()
