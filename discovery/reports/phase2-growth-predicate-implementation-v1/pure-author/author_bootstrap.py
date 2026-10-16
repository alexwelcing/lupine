"""Execute only generated-fixture tests with private/production/network guards."""
from pathlib import Path
import importlib.util,json,os,sys,unittest
ROOT=Path(__file__).resolve().parents[2]
BASE=Path(__file__).resolve().parent
sys.dont_write_bytecode=True
violations=[]
def audit(event,args):
    if event=='open':
        path=args[0]
        if isinstance(path,(str,bytes,os.PathLike)):
            value=Path(os.fsdecode(path)).absolute()
            if value.is_relative_to(ROOT/'.cache/li-v3-custody'):
                violations.append({'kind':'private_open'});raise AssertionError('private source forbidden')
    if event.startswith('socket.') or event in ('subprocess.Popen','os.system','os.posix_spawn'):
        violations.append({'kind':'external_effect','event':event});raise AssertionError('external effect forbidden')
def profile(frame,event,arg):
    if event=='call' and frame.f_code.co_name in {'production_context','diagnose','envelope','_read_relative','_fetch_fixed'}:
        if str(ROOT) in frame.f_code.co_filename:
            violations.append({'kind':'production_entry','name':frame.f_code.co_name});raise AssertionError('production entry forbidden')
sys.addaudithook(audit);sys.setprofile(profile)
p=BASE/'test_growth_predicate_audit.py'
spec=importlib.util.spec_from_file_location('growth_predicate_author_tests',p)
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
result=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromModule(module))
sys.setprofile(None)
print(json.dumps({'tests_run':result.testsRun,'failures':len(result.failures),'errors':len(result.errors),'skipped':len(result.skipped),'guard_violations':violations,'scope':'Generated fixtures only; no source operation, production context or network.'},sort_keys=True))
raise SystemExit(0 if result.wasSuccessful() and not violations else 1)
