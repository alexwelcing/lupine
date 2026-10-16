from pathlib import Path
import json,sys,unittest
base=Path(sys.argv[1]).resolve();root=base.parents[1]
allowed={str((root/p).resolve()) for p in json.loads((base/'runtime-allowlist.json').read_text())['allowed_paths']}
allowed.add(str(root/'AGENTS.md'))
def audit(event,args):
 if event in ('socket.__new__','socket.connect','socket.getaddrinfo','os.system'):raise AssertionError('FORBIDDEN_NETWORK')
 if event=='subprocess.Popen':
  executable,argv,cwd,env=args
  if not argv or argv[0]!='git' or cwd is None or not Path(cwd).resolve().is_relative_to(base):raise AssertionError('FORBIDDEN_SUBPROCESS')
 if event=='open' and isinstance(args[0],(str,bytes)):
  path=Path(args[0]).resolve()
  if path.is_relative_to(root) and not path.is_relative_to(base) and str(path) not in allowed:raise AssertionError('FORBIDDEN_REPOSITORY_READ')
sys.addaudithook(audit);sys.path.insert(0,str(base))
suite=unittest.defaultTestLoader.loadTestsFromName('test_li_v3_readiness_production')
result=unittest.TextTestRunner(verbosity=2).run(suite);sys.exit(not result.wasSuccessful())
