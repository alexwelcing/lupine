"""Permit this wrapper under test mocks, rejecting real predecessor/custody operations."""
from pathlib import Path
import json
import runpy
import sys

BASE = Path(__file__).absolute().parent
ROOT = next(p for p in BASE.parents if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
ALLOWED_WRAPPER = ROOT / '.cache/phase2-growth-envelope-candidate-v1/promotion/scripts/li_v3_growth_envelope.py'
blocked_calls, blocked_events = [], []
wrapper_calls = {'production_context': 0, 'envelope': 0}

def observe(frame, event, arg):
    if event != 'call':
        return
    name, source = frame.f_code.co_name, frame.f_code.co_filename
    if str(ROOT) not in source:
        return
    if source == str(ALLOWED_WRAPPER) and name in wrapper_calls:
        wrapper_calls[name] += 1
        return
    if name in ('production_context', 'diagnose', 'envelope', '_read_relative'):
        blocked_calls.append({'function': name, 'source': source})
        raise RuntimeError('real predecessor context or custody read forbidden')

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
test = BASE / 'promotion/tests/test_li_v3_growth_envelope_review.py'
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
    result_path.write_text(json.dumps({
        'blocked_real_predecessor_or_read_calls': blocked_calls,
        'blocked_network_private_or_process_events': blocked_events,
        'mocked_current_wrapper_calls': wrapper_calls,
        'instrumentation_installed_before_test_import': True,
        'test_setUp_default_rejecting_mocks_verified_unused': True,
        'current_wrapper_permitted_only_with_test_dependency_mocks': True,
    }, indent=2) + '\n')
raise SystemExit(exit_code if not blocked_calls and not blocked_events else 3)
