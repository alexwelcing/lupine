"""Generated-only production adapter tests; real custody and real guards forbidden."""
from pathlib import Path
import importlib.util
import json
import os
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]
BASE = Path(__file__).resolve().parent
sys.dont_write_bytecode = True
violations = []

def audit(event, args):
    if event == 'open' and isinstance(args[0], (str, bytes, os.PathLike)):
        path = Path(os.fsdecode(args[0])).absolute()
        if path.is_relative_to(ROOT / '.cache/li-v3-custody'):
            violations.append('REAL_PRIVATE_OPEN'); raise AssertionError('actual private source forbidden')
    if event.startswith('socket.') or event in ('subprocess.Popen', 'os.system', 'os.posix_spawn'):
        violations.append('EXTERNAL_EFFECT'); raise AssertionError('external effect forbidden')

def profile(frame, event, arg):
    if event == 'call' and frame.f_code.co_name == 'production_context':
        if frame.f_globals.get('ROOT') == ROOT:
            violations.append('REAL_PRODUCTION_GUARD'); raise AssertionError('real checkout guard forbidden')

sys.addaudithook(audit); sys.setprofile(profile)
spec = importlib.util.spec_from_file_location('growth_predicate_production_author_tests', BASE / 'promotion/tests/test_li_v3_growth_predicate_audit.py')
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromModule(module))
sys.setprofile(None)
print(json.dumps({'tests_run': result.testsRun, 'failures': len(result.failures), 'errors': len(result.errors),
                  'skipped': len(result.skipped), 'guard_violations': violations,
                  'scope': 'Generated fixtures and temporary repositories only; no actual source/capture, real checkout guard or network.'}, sort_keys=True))
raise SystemExit(0 if result.wasSuccessful() and not violations else 1)
