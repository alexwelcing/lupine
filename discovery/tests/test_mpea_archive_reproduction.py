"""Two new processes; constructed fixed allocation only, no real inputs."""
from hashlib import sha256
import json
from pathlib import Path
import subprocess,sys,tempfile,unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import mpea_archive_driver as driver


class FreshArchiveReproduction(unittest.TestCase):
    def test_two_processes_preserve_allocation_bytes_scientific_stages_no_entropy(self):
        script=Path(__file__).with_name('mpea_archive_repro_fixture.py')
        files=[Path(module.__file__) for name,module in sys.modules.items() if name in driver.implementation_snapshot()]
        before={str(path):sha256(path.read_bytes()).hexdigest() for path in files}
        with tempfile.TemporaryDirectory(dir=driver.persistence.ROOT/'.cache',prefix='archive-reproduction-fixture-') as directory:
            root=Path(directory)
            for mode in ('original','reproduction'):
                result=subprocess.run([sys.executable,str(script),str(root),mode],capture_output=True,timeout=180)
                self.assertEqual(result.returncode,0,result.stderr.decode(errors='replace')[-1500:])
                self.assertEqual(result.stdout,b'')
            original=json.loads((root/'original.json').read_bytes());reproduction=json.loads((root/'reproduction.json').read_bytes())
            self.assertEqual(original,reproduction)
            self.assertEqual(len(original['stage_digests']),8);self.assertEqual(original['completed_policy_runs'],960)
            for name in ('stage-00-allocation.json','label-routes.json'):
                self.assertEqual((root/'attempts/original'/name).read_bytes(),(root/'attempts/reproduction'/name).read_bytes())
            differences=[]
            for index,stage in enumerate(driver.persistence.STAGES):
                name=f'stage-{index:02d}-{stage.replace("_","-")}.json'
                a=(root/'attempts/original'/name).read_bytes();b=(root/'attempts/reproduction'/name).read_bytes()
                self.assertEqual(json.loads(a)['scientific_sha256'],json.loads(b)['scientific_sha256'])
                if a!=b:differences.append(stage)
            self.assertEqual(differences,list(driver.persistence.STAGES[1:]))
        self.assertEqual(before,{str(path):sha256(path.read_bytes()).hexdigest() for path in files})


if __name__=='__main__':unittest.main()
