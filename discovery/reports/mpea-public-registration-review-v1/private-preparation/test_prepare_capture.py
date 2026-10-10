"""Constructed private observation controls; no actual captures or API."""
import importlib.util,json,tempfile,unittest
from pathlib import Path
P=Path(__file__).with_name('prepare_capture.py')
spec=importlib.util.spec_from_file_location('prep',P);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Checks(unittest.TestCase):
    def test_main_source_origin(self):
        self.assertEqual(m.SOURCE,m.DISCOVERY/'scripts/mpea_registration_allocation.py')
    def test_exact_process(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'p.json';p.write_text(json.dumps({'command':m.EXPECTED_COMMAND,'exit_code':0}))
            self.assertEqual(m.observed_process(p)['exit_code'],0)
            for v in (False,0.0,1,-1):
                p.write_text(json.dumps({'command':m.EXPECTED_COMMAND,'exit_code':v}))
                with self.assertRaises((ValueError,m.m.RegistrationError)):m.observed_process(p)
            p.write_text(json.dumps({'command':['true'],'exit_code':0}))
            with self.assertRaises(ValueError):m.observed_process(p)
    def test_remote_preserved_and_closed(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'r.txt';line='a'*40+'\trefs/heads/research/lupine-discovery\n';p.write_text(line)
            self.assertEqual(m.observed_remote(p),'a'*40)
            for text in (line+line,line.replace('\t',' '),line.rstrip(),line.replace('research/lupine-discovery','main')):
                p.write_text(text)
                with self.assertRaises(ValueError):m.observed_remote(p)
if __name__=='__main__':unittest.main()
