from pathlib import Path
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
