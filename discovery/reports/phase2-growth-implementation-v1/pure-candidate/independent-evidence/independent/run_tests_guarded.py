"""Run this independent synthetic suite with production/private/network calls blocked."""
from pathlib import Path
import json
import runpy
import sys

BASE = Path(__file__).absolute().parent
ROOT = next(p for p in BASE.parents if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
blocked_calls, blocked_events = [], []

def observe(frame, event, arg):
    if (event == 'call' and frame.f_code.co_name in ('production_context', 'diagnose', '_read_relative')
            and str(ROOT) in frame.f_code.co_filename):
        blocked_calls.append(frame.f_code.co_name)
        raise RuntimeError('production or custody read invocation forbidden')

def audit(event, args):
    blocked = event in ('subprocess.Popen', 'socket.__new__', 'socket.connect', 'socket.getaddrinfo')
    if event == 'open' and args and isinstance(args[0], (str, bytes)):
        path = args[0].decode(errors='replace') if isinstance(args[0], bytes) else args[0]
        blocked = '/.cache/li-v3-custody/' in path or path.startswith('.cache/li-v3-custody/')
    if blocked:
        blocked_events.append(event)
        raise RuntimeError('private custody, process or network access forbidden')

result_path = Path(sys.argv[1]).absolute()
if not result_path.is_relative_to(BASE):
    raise SystemExit('owned result path required')
test = BASE / 'promotion/tests/test_li_v3_growth_hint_review.py'
sys.argv = [str(test), '-v']
sys.dont_write_bytecode = True
sys.addaudithook(audit)
sys.setprofile(observe)
exit_code = 0
try:
    runpy.run_path(str(test), run_name='__main__')
except SystemExit as error:
    exit_code = error.code
finally:
    sys.setprofile(None)
    result_path.write_text(json.dumps({'blocked_production_or_read_calls': blocked_calls,
        'blocked_network_private_or_process_events': blocked_events,
        'instrumentation_installed_before_test_import': True}, indent=2) + '\n')
raise SystemExit(exit_code if not blocked_calls and not blocked_events else 3)
