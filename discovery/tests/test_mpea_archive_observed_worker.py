"""Full constructed science through actual cumulative resource/namespace guard."""
import importlib.util,json,shutil,sys,tempfile,time,unittest
from pathlib import Path
ROOT=next(p for p in Path(__file__).resolve().parents if (p/'src/lupine_discovery/decision_pool.py').is_file())
spec=importlib.util.spec_from_file_location('_archive_observed_test_supervisor',ROOT/'scripts/mpea_study_supervisor.py')
supervisor=importlib.util.module_from_spec(spec);sys.modules[spec.name]=supervisor;spec.loader.exec_module(supervisor)
class ArchiveObservedWorkerTests(unittest.TestCase):
    def test_full_1545_row_flow_has_eight_observed_stage_checkpoints(self):
        name='observed-'+str(time.monotonic_ns())
        destination=ROOT/'.cache/mpea-study-custody/observed-attempts'/name
        self.addCleanup(lambda:shutil.rmtree(destination,ignore_errors=True))
        with tempfile.TemporaryDirectory(dir=ROOT/'.cache',prefix='observed-guard-') as temp:
            path=Path(temp)/'supervisor.json'
            report=supervisor.run_synthetic([sys.executable,str(Path(__file__).with_name('mpea_archive_observed_worker.py')),'complete',name],path,
                wall_seconds=180,rss_bytes=2*1024**3,startup_seconds=10)
            self.assertEqual(report['status'],'COMPLETE',report['reason'])
            self.assertEqual(report['exit_code'],0);self.assertTrue(report['network_namespace_verified'])
            self.assertTrue(report['target_phase_started']);self.assertEqual(len(report['sealed_stages']),8)
            self.assertEqual(json.loads(path.read_bytes()),report)
            for stage in destination.glob('stage-*.json'):
                envelope=json.loads(stage.read_bytes());usage=envelope['usage']['stage_resource']
                self.assertEqual(usage['stage'],envelope['stage'])
                self.assertIsNone(usage['within_stage_peak_rss_bytes'])
                self.assertGreaterEqual(usage['wall_elapsed_ns'],0)
            replay=json.loads((destination/'stage-06-replay.json').read_bytes())
            self.assertEqual(replay['payload']['completed_policy_runs'],960)
if __name__=='__main__':unittest.main()
