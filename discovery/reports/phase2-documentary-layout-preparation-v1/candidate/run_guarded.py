"""Execute only generated author tests with actual access guards."""
from pathlib import Path
import json
import sys
import unittest

HERE = Path(__file__).absolute().parent
ROOT = next(p for p in HERE.parents if p.name == 'discovery')
sys.path.insert(0, str(HERE))
sys.dont_write_bytecode = True
violations = []


def audit(event, args):
    denied = event.startswith('socket.') or event in ('subprocess.Popen', 'os.system', 'os.posix_spawn')
    if event == 'open' and args and isinstance(args[0], (str, bytes)):
        value = str(args[0])
        denied = denied or '/li-v3-custody/' in value or '/schema.csv' in value or 'internal-ascii-projection.json' in value
    if denied:
        violations.append(event)
        raise AssertionError('actual access forbidden')


def profile(frame, event, arg):
    if event == 'call' and str(ROOT) in frame.f_code.co_filename:
        if frame.f_code.co_name in ('production_context', 'diagnose', 'envelope', '_read_relative', '_fetch_fixed', 'capture'):
            violations.append('forbidden function ' + frame.f_code.co_name)
            raise AssertionError('actual source operation forbidden')


sys.addaudithook(audit)
sys.setprofile(profile)
import test_li_v3_layout_localization as tests
suite = unittest.defaultTestLoader.loadTestsFromModule(tests)
result = unittest.TextTestRunner(verbosity=2).run(suite)
sys.setprofile(None)
print(json.dumps({'tests_run': result.testsRun, 'failures': len(result.failures),
                  'errors': len(result.errors), 'skipped': len(result.skipped),
                  'guard_violations': violations,
                  'scope': 'Generated archives only; no real production binding, guard, custody input or network.'}, sort_keys=True))
raise SystemExit(0 if result.wasSuccessful() and not violations else 1)
