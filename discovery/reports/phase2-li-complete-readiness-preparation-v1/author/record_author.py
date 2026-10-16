from pathlib import Path
import datetime,hashlib,json,os,subprocess,sys,time
ROOT=Path(__file__).resolve().parents[2]
BASE=Path(__file__).resolve().parent
run=BASE/'receipts'/sys.argv[1]
run.mkdir(parents=True,exist_ok=False)
source_names=['li_v3_readiness.py','test_li_v3_readiness.py','interface.final-v3.json','scope.json']
def identity(path):
 b=path.read_bytes();return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
before={n:identity(BASE/n) for n in source_names}
for n in source_names:(run/n).write_bytes((BASE/n).read_bytes())
manifest=json.loads((BASE/'scope.json').read_text())['runtime_manifest']['files']
held_before={n:hashlib.sha256((ROOT/n).read_bytes()).hexdigest()==v for n,v in manifest.items()}
start=datetime.datetime.now(datetime.timezone.utc).isoformat();clock=time.monotonic()
(run/'start.json').write_text(json.dumps({'at':start,'source':before,'runtime_files':len(manifest),'all_runtime_held':all(held_before.values())},indent=2)+'\n')
bootstrap='''from pathlib import Path
import json,sys,unittest
base=Path(sys.argv[1]).resolve();root=base.parents[1]
manifest=json.loads((base/'scope.json').read_text())['runtime_manifest']['files']
allowed={str((root/name).resolve()) for name in manifest}
allowed.add(str(root/'AGENTS.md'))
def audit(event,args):
 if event in ('socket.__new__','socket.connect','socket.getaddrinfo','subprocess.Popen','os.system'):
  raise AssertionError('FORBIDDEN_OPERATION')
 if event=='open' and isinstance(args[0],(str,bytes)):
  path=Path(args[0]).resolve()
  if str(path).startswith(str(root)) and not str(path).startswith(str(base)) and str(path) not in allowed:
   raise AssertionError('FORBIDDEN_REPOSITORY_READ')
sys.addaudithook(audit)
sys.path.insert(0,str(base))
suite=unittest.defaultTestLoader.loadTestsFromName('test_li_v3_readiness')
result=unittest.TextTestRunner(verbosity=2).run(suite)
sys.exit(not result.wasSuccessful())
'''
(run/'bootstrap.py').write_text(bootstrap)
with (run/'stdout.txt').open('wb') as stdout,(run/'stderr.txt').open('wb') as stderr:
 process=subprocess.run([sys.executable,'-B','-c',bootstrap,str(BASE)],stdout=stdout,stderr=stderr,cwd=ROOT,env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1','PYTHONPYCACHEPREFIX':str(BASE/'isolated-python-cache')})
after={n:identity(BASE/n) for n in source_names}
held_after={n:hashlib.sha256((ROOT/n).read_bytes()).hexdigest()==v for n,v in manifest.items()}
record={'started_at':start,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'process_seconds':round(time.monotonic()-clock,6),'exit_code':process.returncode,'source_before':before,'source_after':after,'source_held':before==after,'runtime_files':len(manifest),'all_runtime_held_before':all(held_before.values()),'all_runtime_held_after':all(held_after.values()),'actual_source_operations':0,'guard_policy':'Audit hook forbids network/subprocess and any read under discovery outside fixed runtime allowlist or candidate directory; tests additionally forbid custody reads and production guards.'}
(run/'execution.json').write_text(json.dumps(record,indent=2,sort_keys=True)+'\n')
print(json.dumps(record,indent=2))
print((run/'stderr.txt').read_text()[-16000:])

sys.exit(process.returncode)
