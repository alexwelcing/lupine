from pathlib import Path
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
