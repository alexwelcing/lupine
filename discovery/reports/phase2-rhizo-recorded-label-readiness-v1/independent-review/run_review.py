"""Generated-only independent test runner; no actual source or production entrypoint."""
import argparse
import hashlib
import types
import json
from pathlib import Path
import socket
import sys
import unittest
from unittest import mock

ROOT = Path('/workspace/lupine-discovery-branch/discovery')
OWN = Path(__file__).resolve().parent
CANDIDATE = ROOT / '.cache/phase2-rhizo-recorded-label-candidate-v1/recorded_labels.py'
FRAME = ROOT / '.cache/phase2-rhizo-reference-readiness-design-v1/reference-frame.json'
INPUTS = ROOT / '.cache/phase2-rhizo-bound-choice-scope-v1/objects.json'

def load(name,path):
    module=types.ModuleType(name)
    module.__file__=str(path)
    sys.modules[name]=module
    exec(compile(path.read_bytes(),str(path),'exec'),module.__dict__)
    return module

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--source-sha256',required=True)
    args=parser.parse_args()
    assert hashlib.sha256(CANDIDATE.read_bytes()).hexdigest()==args.source_sha256
    sys.dont_write_bytecode=True
    violations=[]
    allowed={CANDIDATE,FRAME,INPUTS}
    def audit(event,args):
        if event in {'socket.__new__','socket.getaddrinfo','subprocess.Popen','os.system'}:
            violations.append(event);raise AssertionError('FORBIDDEN_OPERATION')
        if event=='open' and isinstance(args[0],(str,bytes)):
            path=Path(args[0]).absolute()
            if path.is_relative_to(ROOT) and path not in allowed and not path.is_relative_to(OWN):
                violations.append('FORBIDDEN_PROJECT_PATH');raise AssertionError('FORBIDDEN_PROJECT_PATH')
    sys.addaudithook(audit)
    module=load('held_recorded_labels',CANDIDATE)
    tests=load('test_recorded_labels_review',OWN/'test_recorded_labels_review.py')
    tests.MODULE=module
    tests.FRAME_RAW=FRAME.read_bytes();tests.INPUTS_RAW=INPUTS.read_bytes()
    tests.NUMERIC_CASES=json.loads((OWN/'numeric-cases.json').read_text())['cases']
    def forbidden(*args,**kwargs):
        violations.append('PRODUCTION_ENTRYPOINT');raise AssertionError('PRODUCTION_ENTRYPOINT_FORBIDDEN')
    with mock.patch.object(module,'run_retained',side_effect=forbidden):
        result=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromModule(tests))
    assert hashlib.sha256(CANDIDATE.read_bytes()).hexdigest()==args.source_sha256
    print(json.dumps({'tests_run':result.testsRun,'failures':len(result.failures),
        'errors':len(result.errors),'guard_violations':violations,'source_sha256':args.source_sha256}))
    return 0 if result.wasSuccessful() and not violations else 1

if __name__=='__main__':
    raise SystemExit(main())
