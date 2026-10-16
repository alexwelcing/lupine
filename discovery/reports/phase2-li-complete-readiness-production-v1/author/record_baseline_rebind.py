from pathlib import Path
import datetime,hashlib,json,os,subprocess,sys,time
ROOT=Path(__file__).resolve().parents[2];BASE=Path(__file__).resolve().parent
run=BASE/'receipts'/sys.argv[1];run.mkdir(parents=True,exist_ok=False)
names=['li_v3_readiness.py','li_v3_readiness_production.py','test_li_v3_readiness_production.py','scope.json']
def identity(p):
 b=p.read_bytes();return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
before={n:identity(BASE/n) for n in names}
for n in names:(run/n).write_bytes((BASE/n).read_bytes())
held=json.loads((BASE/'runtime-allowlist.json').read_text())['held_dependencies']
dependencies_before={n:identity(ROOT/n)['sha256']==v for n,v in held.items()}
started=datetime.datetime.now(datetime.timezone.utc).isoformat();clock=time.monotonic()
(run/'start.json').write_text(json.dumps({'at':started,'source':before,'held_dependencies':dependencies_before},indent=2)+'\n')
bootstrap='''from pathlib import Path
import json,sys,unittest,os
base=Path(sys.argv[1]).resolve();root=base.parents[1]
allowed={str((root/p).resolve()) for p in json.loads((base/'runtime-allowlist.json').read_text())['allowed_paths']}
allowed.add(str(root/'AGENTS.md'))
active_open=[];original_open=os.open
def bounded_open(path,flags,mode=0o777,*,dir_fd=None):
 resolved=Path(path) if Path(path).is_absolute() else (Path(os.readlink('/proc/self/fd/'+str(dir_fd)))/path if dir_fd is not None else Path(path).resolve())
 active_open.append((resolved.resolve(),bool(flags & os.O_DIRECTORY)))
 try:return original_open(path,flags,mode,dir_fd=dir_fd)
 finally:active_open.pop()
os.open=bounded_open
def audit(event,args):
 if event in ('socket.__new__','socket.connect','socket.getaddrinfo','os.system'):raise AssertionError('FORBIDDEN_NETWORK')
 if event=='subprocess.Popen':
  executable,argv,cwd,env=args
  if not argv or argv[0]!='git' or cwd is None or not Path(cwd).resolve().is_relative_to(base):raise AssertionError('FORBIDDEN_SUBPROCESS')
 if event=='open' and isinstance(args[0],(str,bytes)):
  path,is_directory=active_open[-1] if active_open else (Path(args[0]).resolve(),False)
  if is_directory and (path.is_relative_to(base) or base.is_relative_to(path)):return
  if path.is_relative_to(root) and not path.is_relative_to(base) and str(path) not in allowed:raise AssertionError('FORBIDDEN_REPOSITORY_READ')
sys.addaudithook(audit);sys.path.insert(0,str(base))
selected = [
 'test_layout_complete_and_persisted', 'test_generated_full_result_equivalence',
 'test_unbound_baseline_stops_before_cache', 'test_own_source_worktree_drift',
 'test_index_drift', 'test_committed_baseline_runtime_drift']
suite=unittest.defaultTestLoader.loadTestsFromNames(['test_li_v3_readiness_production.ProductionAuthorTests.'+name for name in selected])
result=unittest.TextTestRunner(verbosity=2).run(suite);sys.exit(not result.wasSuccessful())
'''
(run/'bootstrap.py').write_text(bootstrap)
with (run/'stdout.txt').open('wb') as stdout,(run/'stderr.txt').open('wb') as stderr:
 process=subprocess.run([sys.executable,'-B','-c',bootstrap,str(BASE)],cwd=ROOT,stdout=stdout,stderr=stderr,env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1','PYTHONPYCACHEPREFIX':str(BASE/'isolated-python-cache')})
after={n:identity(BASE/n) for n in names};dependencies_after={n:identity(ROOT/n)['sha256']==v for n,v in held.items()}
r={'started_at':started,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'process_seconds':round(time.monotonic()-clock,6),'exit_code':process.returncode,'source_before':before,'source_after':after,'source_held':before==after,'held_dependency_count':len(held),'dependencies_held_before':all(dependencies_before.values()),'dependencies_held_after':all(dependencies_after.values()),'actual_source_operations':0,'selected_test_count':6,'selection':'Baseline/source/context plus complete layout and normalized pure-output equivalence; no full-suite rerun claim.','guard_policy':'Network forbidden; subprocess Git only with cwd under candidate generated repositories; repository reads restricted to fixed source allowlist or candidate directory. Production guards tested only with generated temporary ROOT and mocked prior G34 context.'}
(run/'execution.json').write_text(json.dumps(r,indent=2,sort_keys=True)+'\n');print(json.dumps(r,indent=2));print((run/'stderr.txt').read_text()[-24000:]);sys.exit(process.returncode)
