"""Run held independent generated suite with file/network/process audit guards."""
from pathlib import Path
import importlib.util
import io
import json
import os
import runpy
import socket
import sys
import types
import unittest

OWN=Path(__file__).absolute().parent
DISCOVERY=OWN.parent.parent
CANDIDATE=Path(os.environ['LI_READINESS_CANDIDATE']).absolute()
ALLOWED_ROOTS=(OWN,CANDIDATE.parent,DISCOVERY/'scripts',Path(sys.base_prefix))
violations=[]

def under(path,root):
    try:path.relative_to(root);return True
    except ValueError:return False

def audit(event,args):
    if event.startswith('socket.') or event in ('subprocess.Popen','os.system','os.posix_spawn','os.fork'):
        violations.append(event);raise RuntimeError('FORBIDDEN_PROCESS_OR_NETWORK')
    if event=='open':
        item=args[0]
        if type(item) is int:return
        path=Path(os.fsdecode(item))
        if not path.is_absolute():path=Path.cwd()/path
        path=Path(os.path.abspath(path))
        mode=args[1] if len(args)>1 else 'r';flags=args[2] if len(args)>2 else 0
        writing=(isinstance(mode,str) and any(c in mode for c in 'wax+')) or bool(flags & (os.O_WRONLY|os.O_RDWR|os.O_CREAT|os.O_TRUNC|os.O_APPEND))
        if writing or not any(under(path,root) for root in ALLOWED_ROOTS):
            violations.append('open:write' if writing else 'open:outside-declared-source')
            raise RuntimeError('FORBIDDEN_FILESYSTEM_ACCESS')
        if under(path,DISCOVERY/'scripts') and path.suffix not in ('.py','.pyc'):
            violations.append('open:non-source-script-file');raise RuntimeError('FORBIDDEN_FILESYSTEM_ACCESS')
        if under(path,CANDIDATE.parent) and path.suffix not in ('.py','.pyc'):
            violations.append('open:non-source-candidate-file');raise RuntimeError('FORBIDDEN_FILESYSTEM_ACCESS')
    if event in ('os.listdir','os.scandir'):
        item=args[0]
        if type(item) is int:return
        path=Path(os.path.abspath(os.fsdecode(item)))
        if under(path,DISCOVERY/'.cache') and not (under(path,OWN) or under(path,CANDIDATE.parent)):
            violations.append(event+':outside-owned-cache');raise RuntimeError('FORBIDDEN_DIRECTORY_ACCESS')

sys.dont_write_bytecode=True
sys.path.insert(0,str(OWN))
sys.addaudithook(audit)
status=2
try:
    # Direct held text compilation avoids incidental __pycache__ writes and
    # allows all candidate/import operations to occur under the same guard.
    path=OWN/'test_li_v3_readiness_review.py'
    module=types.ModuleType('held_independent_readiness_tests');module.__file__=str(path)
    sys.modules[module.__name__]=module
    exec(compile(path.read_bytes(),str(path),'exec'),module.__dict__)
    result=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromModule(module))
    status=0 if result.wasSuccessful() and not violations else 1
    print(json.dumps({'tests_run':result.testsRun,'failures':len(result.failures),'errors':len(result.errors),'guard_violations':violations,'status':status}))
except BaseException as error:
    print(json.dumps({'status':2,'harness_error_type':type(error).__name__,'guard_violations':violations}))
    raise
finally:
    if violations:print(json.dumps({'final_guard_violations':violations}))
sys.exit(status)
