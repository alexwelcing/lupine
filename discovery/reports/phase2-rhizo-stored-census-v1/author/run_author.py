"""Recorded generated-only author invocation; no real source calls."""
from pathlib import Path
import datetime,hashlib,importlib.util,json,sys,time,types,unittest
ROOT=Path(__file__).absolute().parents[2];HERE=Path(__file__).absolute().parent;OUT=HERE/'first-author'
OUT.mkdir(exist_ok=False)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
files=('census.py','test_census.py','contract.json','README.md','run_author.py')
pins={f:sha(HERE/f)for f in files}
for f in files:(OUT/f).write_bytes((HERE/f).read_bytes())
(OUT/'start.json').write_text(json.dumps({'started_at':now(),'pins':pins,'scope':'Generated fixtures only. No private/raw actual inputs or production entrypoint.'},indent=2,sort_keys=True)+'\n')
forbidden=[]
def audit(event,args):
 if event.startswith(('socket.','subprocess.','urllib.')):
  forbidden.append(event);raise RuntimeError('FORBIDDEN_NETWORK_OR_PROCESS')
 if event=='open' and isinstance(args[0],(str,bytes)):
  path=str(args[0])
  if any(s in path for s in ('/li-v3-custody/','/projection-custody/','/phase2-rhizo-recorded-label-candidate-v1/actual/','/phase2-rhizo-census-candidate-v1/actual/')):
   forbidden.append(event);raise RuntimeError('FORBIDDEN_PRIVATE_SOURCE_PATH')
sys.dont_write_bytecode=True;sys.addaudithook(audit)
start=now();tick=time.monotonic()
module=types.ModuleType('census');module.__file__=str(HERE/'census.py');sys.modules['census']=module
exec(compile((HERE/'census.py').read_bytes(),module.__file__,'exec'),module.__dict__)
def never(*args,**kwargs):raise RuntimeError('PRODUCTION_ENTRYPOINT_FORBIDDEN')
module.run_retained=never
suite_module=types.ModuleType('test_census');suite_module.__file__=str(HERE/'test_census.py')
exec(compile((HERE/'test_census.py').read_bytes(),suite_module.__file__,'exec'),suite_module.__dict__)
result=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromModule(suite_module))
held=all(sha(HERE/f)==h for f,h in pins.items())
receipt={'started_at':start,'finished_at':now(),'elapsed_seconds':time.monotonic()-tick,'tests_run':result.testsRun,'failures':len(result.failures),'errors':len(result.errors),'skipped':len(result.skipped),'pins':pins,'source_and_contract_held':held,'forbidden_events':forbidden,'actual_source_operations':0,'exit_code':0 if result.wasSuccessful()and held and not forbidden else 1}
(OUT/'execution.json').write_text(json.dumps(receipt,indent=2,sort_keys=True)+'\n');print(json.dumps(receipt,sort_keys=True));raise SystemExit(receipt['exit_code'])
