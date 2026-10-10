import json,os,signal,subprocess,sys,tempfile,time,unittest
from pathlib import Path
from unittest.mock import patch
from supervisor import run_synthetic,WALL_SECONDS,RSS_BYTES
H=Path(__file__).resolve().parent
class SupervisorTests(unittest.TestCase):
    def case(self,name,**caps):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'receipt.json'
            r=run_synthetic([sys.executable,str(H/'synthetic_worker.py'),name],path,wall_seconds=caps.get('wall',60),rss_bytes=caps.get('rss',256*1024**2),startup_seconds=caps.get('startup',60))
            self.assertEqual(r,json.loads(path.read_text()));self.assertNotIn('PRIVATE_SENTINEL',path.read_text());return r
    def test_complete(self):
        r=self.case('complete');self.assertEqual(r['status'],'COMPLETE');self.assertTrue(r['network_namespace_verified']);self.assertEqual(len(r['sealed_stages']),8)
    def test_actual_network_namespace_no_external_route(self):self.assertEqual(self.case('network')['status'],'COMPLETE')
    def test_wall(self):self.assertEqual(self.case('wall',wall=.08)['reason'],'WALL_TIME_LIMIT')
    def test_rss_actual_resident_pages(self):
        r=self.case('rss',rss=64*1024**2);self.assertEqual(r['reason'],'RSS_LIMIT');self.assertGreater(r['peak_sampled_rss_bytes'],64*1024**2)
    def test_fast_rss_exit_peak(self):
        r=self.case('fast_rss',rss=64*1024**2);self.assertEqual(r['reason'],'RSS_LIMIT');self.assertGreater(r['child_exit_peak_rss_bytes'],64*1024**2)
    def test_unsupported_platform(self):
        with tempfile.TemporaryDirectory() as d, patch('supervisor.sys.platform','unsupported'):
            r=run_synthetic([],Path(d)/'r.json',wall_seconds=1,rss_bytes=1)
            self.assertEqual(r['reason'],'UNSUPPORTED_PLATFORM');self.assertIsNone(r['exit_code'])
    def test_descendant_rss(self):self.assertEqual(self.case('descendant_rss',rss=64*1024**2)['reason'],'RSS_LIMIT')
    def test_cumulative_clock_and_prefix(self):
        r=self.case('checkpoint_wall',wall=.20);self.assertEqual(r['reason'],'WALL_TIME_LIMIT');self.assertGreaterEqual(len(r['sealed_stages']),4);self.assertLess(len(r['sealed_stages']),8)
    def test_startup_timeout(self):self.assertEqual(self.case('silent',startup=.08)['reason'],'STARTUP_TIMEOUT')
    def test_failure_no_child_output(self):self.assertEqual(self.case('failed')['reason'],'WORKER_FAILED')
    def test_worker_signal(self):self.assertEqual(self.case('signal')['reason'],'WORKER_SIGNALLED')
    def test_marker_errors(self):
        for name,reason in [('malformed','MARKER_INVALID'),('oversized','MARKER_INVALID'),('duplicate_key','MARKER_INVALID'),('utf16','MARKER_INVALID'),('early_target','MARKER_ORDER_INVALID'),('double_start','MARKER_ORDER_INVALID'),('double_target','MARKER_ORDER_INVALID'),('order','MARKER_ORDER_INVALID'),('after_done','MARKER_ORDER_INVALID'),('fast_tail','MARKER_ORDER_INVALID'),('no_target','MARKER_INCOMPLETE'),('no_done','MARKER_INCOMPLETE'),('invalid_stop','MARKER_ORDER_INVALID'),('early_no_go','MARKER_ORDER_INVALID')]:
            with self.subTest(name=name):self.assertEqual(self.case(name)['reason'],reason)
    def test_early_terminals(self):
        for name,status in [('no_go','NO_GO_INSUFFICIENT_DEVELOPMENT'),('blocked','BLOCKED'),('incomplete','INCOMPLETE')]:
            with self.subTest(name=name):
                r=self.case(name);self.assertEqual(r['status'],status);self.assertEqual(len(r['sealed_stages']),3)
    def test_final_failed_seal_terminal(self):
        r=self.case('final_blocked');self.assertEqual(r['status'],'BLOCKED');self.assertEqual(r['reason'],'INTERNAL_FAILURE');self.assertEqual(len(r['sealed_stages']),8)
    def test_complete_charge_excludes_cleanup(self):
        r=self.case('complete');self.assertLessEqual(r['wall_seconds'],r['limits']['wall_seconds']);self.assertGreater(r['cleanup_wall_seconds'],0)
    def test_pending_receipt_preserved(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'receipt';pending=Path(d)/'.receipt.pending';pending.write_text('immutable')
            with self.assertRaises(ValueError):run_synthetic([],p,wall_seconds=1,rss_bytes=1)
            self.assertEqual(pending.read_text(),'immutable')
    def test_descendant_separate_group_terminated(self):
        with tempfile.TemporaryDirectory() as d:
            pidfile=Path(d)/'pid';receipt=Path(d)/'receipt'
            with patch.dict(os.environ,{'LUPINE_SYNTHETIC_PID':str(pidfile)}):
                r=run_synthetic([sys.executable,str(H/'synthetic_worker.py'),'descendant_group'],receipt,wall_seconds=.15,rss_bytes=268435456)
            self.assertEqual(r['reason'],'WALL_TIME_LIMIT');pid=int(pidfile.read_text())
            stat=Path('/proc')/str(pid)/'stat'
            self.assertTrue(not stat.exists() or stat.read_text().rsplit(')',1)[1].split()[0]=='Z')
    def test_receipt_no_overwrite(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'receipt';p.write_text('immutable')
            with self.assertRaises(ValueError):run_synthetic([],p,wall_seconds=1,rss_bytes=1)
            self.assertEqual(p.read_text(),'immutable')
    def test_production_constants(self):
        import inspect
        from supervisor import run
        self.assertEqual((WALL_SECONDS,RSS_BYTES),(3600,2*1024**3))
        self.assertEqual(tuple(inspect.signature(run).parameters),('command','receipt'))
    def test_supervisor_sigterm(self):
        with tempfile.TemporaryDirectory() as d:
            receipt=Path(d)/'receipt.json'
            code='from supervisor import run_synthetic; import sys; run_synthetic([sys.executable,"'+str(H/'synthetic_worker.py')+'","wall"],"'+str(receipt)+'",wall_seconds=2,rss_bytes=268435456)'
            ready=Path(d)/'ready'
            p=subprocess.Popen([sys.executable,'-c',code],cwd=H,env={**os.environ,'LUPINE_SYNTHETIC_READY':str(ready)},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            deadline=time.monotonic()+5
            while not ready.exists() and p.poll() is None and time.monotonic()<deadline:time.sleep(.01)
            self.assertTrue(ready.exists())
            p.send_signal(signal.SIGTERM);p.wait(timeout=5)
            self.assertEqual(json.loads(receipt.read_text())['reason'],'WORKER_INTERRUPTED')
if __name__=='__main__':unittest.main()
