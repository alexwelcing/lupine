import json,signal,subprocess,sys,tempfile,time,unittest
from pathlib import Path
from supervisor import run_synthetic,WALL_SECONDS,RSS_BYTES
H=Path(__file__).resolve().parent
class SupervisorTests(unittest.TestCase):
    def case(self,name,**caps):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'receipt.json'
            r=run_synthetic([sys.executable,str(H/'synthetic_worker.py'),name],path,wall_seconds=caps.get('wall',2),rss_bytes=caps.get('rss',256*1024**2),startup_seconds=caps.get('startup',2))
            self.assertEqual(r,json.loads(path.read_text()));self.assertNotIn('PRIVATE_SENTINEL',path.read_text());return r
    def test_complete(self):
        r=self.case('complete');self.assertEqual(r['status'],'COMPLETE');self.assertTrue(r['network_namespace_verified']);self.assertEqual(len(r['sealed_stages']),8)
    def test_actual_network_namespace_no_external_route(self):self.assertEqual(self.case('network')['status'],'COMPLETE')
    def test_wall(self):self.assertEqual(self.case('wall',wall=.08)['reason'],'WALL_TIME_LIMIT')
    def test_rss_actual_resident_pages(self):
        r=self.case('rss',rss=64*1024**2);self.assertEqual(r['reason'],'RSS_LIMIT');self.assertGreater(r['peak_sampled_rss_bytes'],64*1024**2)
    def test_descendant_rss(self):self.assertEqual(self.case('descendant_rss',rss=64*1024**2)['reason'],'RSS_LIMIT')
    def test_cumulative_clock_and_prefix(self):
        r=self.case('checkpoint_wall',wall=.20);self.assertEqual(r['reason'],'WALL_TIME_LIMIT');self.assertGreaterEqual(len(r['sealed_stages']),4);self.assertLess(len(r['sealed_stages']),8)
    def test_startup_timeout(self):self.assertEqual(self.case('silent',startup=.08)['reason'],'STARTUP_TIMEOUT')
    def test_failure_no_child_output(self):self.assertEqual(self.case('failed')['reason'],'WORKER_FAILED')
    def test_worker_signal(self):self.assertEqual(self.case('signal')['reason'],'WORKER_SIGNALLED')
    def test_marker_errors(self):
        for name,reason in [('malformed','MARKER_INVALID'),('oversized','MARKER_INVALID'),('duplicate_key','MARKER_INVALID'),('early_target','MARKER_ORDER_INVALID'),('double_start','MARKER_ORDER_INVALID'),('double_target','MARKER_ORDER_INVALID'),('order','MARKER_ORDER_INVALID'),('after_done','MARKER_ORDER_INVALID'),('no_target','MARKER_INCOMPLETE'),('no_done','MARKER_INCOMPLETE')]:
            with self.subTest(name=name):self.assertEqual(self.case(name)['reason'],reason)
    def test_receipt_no_overwrite(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'receipt';p.write_text('immutable')
            with self.assertRaises(ValueError):run_synthetic([],p,wall_seconds=1,rss_bytes=1)
            self.assertEqual(p.read_text(),'immutable')
    def test_production_constants(self):self.assertEqual((WALL_SECONDS,RSS_BYTES),(3600,2*1024**3))
    def test_supervisor_sigterm(self):
        with tempfile.TemporaryDirectory() as d:
            receipt=Path(d)/'receipt.json'
            code='from supervisor import run_synthetic; import sys; run_synthetic([sys.executable,"'+str(H/'synthetic_worker.py')+'","wall"],"'+str(receipt)+'",wall_seconds=2,rss_bytes=268435456)'
            p=subprocess.Popen([sys.executable,'-c',code],cwd=H,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            time.sleep(.15);p.send_signal(signal.SIGTERM);p.wait(timeout=5)
            self.assertEqual(json.loads(receipt.read_text())['reason'],'WORKER_INTERRUPTED')
if __name__=='__main__':unittest.main()
