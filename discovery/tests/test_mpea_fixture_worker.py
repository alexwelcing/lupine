"""Real namespace/process supervision of constructed-data integration only."""
import importlib.util
import json
from pathlib import Path
import shutil
import sys
import tempfile
import time
import unittest

ROOT = next(parent for parent in Path(__file__).resolve().parents
            if (parent/'src/lupine_discovery/decision_pool.py').is_file())
WORKSPACE = ROOT/'.cache/mpea-study-custody'
WORKER = Path(__file__).resolve().parents[1]/'scripts/mpea_fixture_worker.py'
SUPERVISOR = ROOT/'scripts/mpea_study_supervisor.py'
if not SUPERVISOR.is_file(): SUPERVISOR = ROOT/'.cache/mpea-study-supervisor/supervisor.py'
spec = importlib.util.spec_from_file_location('_fixture_worker_test_supervisor',SUPERVISOR)
supervisor = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = supervisor
spec.loader.exec_module(supervisor)


class SupervisedFixtureTests(unittest.TestCase):
    def check_worker(self, scenario, expected, count):
        WORKSPACE.mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='supervised-fixture-',dir=WORKSPACE) as temporary:
            name = 'synthetic-' + scenario + '-' + str(time.monotonic_ns())
            destination = WORKSPACE/'attempts'/name
            self.addCleanup(lambda: shutil.rmtree(destination,ignore_errors=True))
            receipt_path = Path(temporary)/'supervisor.json'
            report = supervisor.run_synthetic([sys.executable,str(WORKER),scenario,name], receipt_path,
                wall_seconds=60,rss_bytes=2*1024**3,startup_seconds=10)
            self.assertEqual(report['status'],expected,report['reason'])
            self.assertTrue(report['network_namespace_verified'])
            self.assertTrue(report['target_phase_started'])
            self.assertEqual(report['exit_code'],0)
            self.assertEqual(len(report['sealed_stages']),count)
            self.assertEqual(json.loads(receipt_path.read_bytes()),report)
            self.assertLess(report['peak_sampled_rss_bytes'],2*1024**3)
            if expected != 'COMPLETE':
                self.assertFalse((destination/'evaluation-vault.json').exists())

    def test_complete_fixture_inside_network_namespace(self):
        self.check_worker('complete','COMPLETE',8)

    def test_insufficient_development_has_valid_negative_terminal(self):
        self.check_worker('inadequate','NO_GO_INSUFFICIENT_DEVELOPMENT',3)


if __name__ == '__main__': unittest.main()
