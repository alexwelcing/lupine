"""Closed synthetic operational reasons and digest identities; no file/API data."""
from pathlib import Path
import importlib.util,unittest,copy
P=Path(__file__).resolve().parents[1]/'scripts/mpea_archive_operations.py';spec=importlib.util.spec_from_file_location('operations',P);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def identity(science='c'*64):return {'bytes_sha256':'a'*64,'content_sha256':'b'*64,'scientific_sha256':science}
class ClosedOperations(unittest.TestCase):
    def test_amendment_internal_mappings(self):
        for reason in ('UNSUPPORTED_PLATFORM','NETWORK_ISOLATION_UNAVAILABLE','NETWORK_ISOLATION_FAILED','STARTUP_TIMEOUT','WORKER_SIGNALLED','WORKER_FAILED','SUPERVISOR_FAILURE'):
            self.assertEqual(m.study_outcome('BLOCKED',reason),{'study_status':'BLOCKED','study_reason':'INTERNAL_FAILURE'})
        for reason in ('MARKER_INVALID','MARKER_ORDER_INVALID','MARKER_INCOMPLETE'):
            self.assertEqual(m.study_outcome('BLOCKED',reason)['study_reason'],'STAGE_ORDER_VIOLATION')
        for reason in ('WALL_TIME_LIMIT','RSS_LIMIT','WORKER_INTERRUPTED'):
            self.assertEqual(m.study_outcome('BLOCKED',reason)['study_reason'],reason)
    def test_valid_terminals_and_no_echo(self):
        self.assertEqual(m.study_outcome('COMPLETE','COMPLETE'),{'study_status':'COMPLETE','study_reason':None})
        self.assertEqual(m.study_outcome('NO_GO_INSUFFICIENT_DEVELOPMENT','DEVELOPMENT_ROWS_BELOW_50')['study_status'],'NO_GO_INSUFFICIENT_DEVELOPMENT')
        self.assertEqual(m.study_outcome('INCOMPLETE','ALLOCATION_INTERRUPTED'),{'study_status':'INCOMPLETE','study_reason':'ALLOCATION_INTERRUPTED'})
        for a,b in ((True,'COMPLETE'),('COMPLETE','secret_target_text'),('NO_GO_INSUFFICIENT_DEVELOPMENT','RSS_LIMIT')):
            v=m.study_outcome(a,b);self.assertEqual(v['study_status'],'BLOCKED');self.assertNotIn('secret_target_text',repr(v))
    def test_usage_difference_keeps_science(self):
        a={'stage-02-development.json':identity()};b=copy.deepcopy(a);b['stage-02-development.json']['bytes_sha256']='d'*64;b['stage-02-development.json']['content_sha256']='e'*64
        v=m.compare_artifact_identities(a,b);self.assertTrue(v['scientific_seals_identical']);self.assertFalse(v['all_complete_file_bytes_identical']);self.assertEqual(v['complete_file_differences'],['stage-02-development.json'])
    def test_science_and_universe_mismatch(self):
        a={'stage-00-allocation.json':identity()};b=copy.deepcopy(a);b['stage-00-allocation.json']['scientific_sha256']='d'*64
        self.assertFalse(m.compare_artifact_identities(a,b)['scientific_seals_identical'])
        v=m.compare_artifact_identities(a,{});self.assertFalse(v['same_artifact_universe']);self.assertFalse(v['files']['stage-00-allocation.json']['reproduction_present'])
        self.assertFalse(m.compare_artifact_identities({}, {})['scientific_seals_identical'])
    def test_closed_identity_types_and_detachment(self):
        source={'attempt-result.json':identity(None)};v=m.compare_artifact_identities(source,source);source['attempt-result.json']['bytes_sha256']='d'*64
        self.assertEqual(v['files']['attempt-result.json']['original_identity']['bytes_sha256'],'a'*64);self.assertIsNone(v['files']['attempt-result.json']['scientific_identity_identical']);self.assertFalse(v['scientific_seals_identical'])
        for bad in ({'../target.csv':identity()},{'public-report.json':{'bytes_sha256':True,'content_sha256':'b'*64,'scientific_sha256':'c'*64}},{'public-report.json':dict(identity(),extra='x')}):
            with self.assertRaises(m.OperationsError):m.compare_artifact_identities(bad,{})
if __name__=='__main__':unittest.main()
