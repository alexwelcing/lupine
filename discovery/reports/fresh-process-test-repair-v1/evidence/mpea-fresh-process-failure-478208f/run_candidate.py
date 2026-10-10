from pathlib import Path
from hashlib import sha256
import json,os,re,subprocess,sys,time
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'scripts'));sys.path.insert(0,str(ROOT/'tests'))
import mpea_archive_driver as driver
files={Path(sys.modules[name].__file__).resolve() for name in driver.implementation_snapshot()}
files.update(ROOT/path for path in ('tests/test_mpea_archive_driver_review.py','tests/mpea_archive_review_reproduction.py','tests/mpea_archive_review_constructed_case.py','tests/test_mpea_production_store_review.py','docs/mpea-t25-archival-protocol-v1.md','docs/mpea-t25-implementation-contract-v1.md'))
files.update((HERE/'candidate').glob('*.py'))
files.update(ROOT/path for path in ('tests/test_mpea_archive_reproduction.py','tests/mpea_archive_repro_fixture.py'))
files.add(HERE/'independent-source-review.json')
files.add(Path(__file__).resolve())
def capture():return {str(p.relative_to(ROOT)):sha256(p.read_bytes()).hexdigest() for p in sorted(files)}
before=capture();log=HERE/'candidate-test.log';receipt=HERE/'candidate-test.json'
command=[sys.executable,'-m','unittest','discover','-s',str(HERE/'candidate'),'-p','test_mpea_archive_driver_review.py','-k','test_fresh_process_same_constructed_fixed_roles_reproduces_every_scientific_stage','-v']
env=dict(os.environ);env.pop('PYTHONPATH',None);start=time.monotonic();timed_out=False
with log.open('xb') as output:
    try:result=subprocess.run(command,cwd=ROOT,env=env,stdout=output,stderr=subprocess.STDOUT,timeout=360);code=result.returncode
    except subprocess.TimeoutExpired:code=None;timed_out=True
raw=log.read_bytes();after=capture()
v={'schema':'lupine.focused-candidate-validation.v1','command':command,'exit_code':code,'passed':code==0 and bool(re.search(rb'Ran 1 test in [0-9.]+s\s+OK\s*\Z',raw)) and before==after,'timeout':timed_out,'elapsed_seconds':time.monotonic()-start,'before':before,'after':after,'source_unchanged':before==after,'log_sha256':sha256(raw).hexdigest(),'log_bytes':len(raw),'actual_data':False,'actual_allocation':False,'main_edits':False}
with receipt.open('x') as output:json.dump(v,output,sort_keys=True,indent=2);output.write('\n')
print(json.dumps({k:v[k] for k in ('exit_code','timeout','elapsed_seconds','source_unchanged','log_sha256')}))
