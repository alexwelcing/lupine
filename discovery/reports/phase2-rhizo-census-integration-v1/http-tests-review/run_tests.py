"""Run the held tests against a public-only copied package; no producer imports."""
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import sys
import time
import unittest

LANE = Path(__file__).resolve().parent
ROOT = LANE.parents[1]
OVERLAY = ROOT / '.cache/phase2-rhizo-census-ui-v1/http-preview-v3/src'
PROJECT = ROOT.parent
pins = {
    'lupine_discovery/server.py': '451324d9ce1fa84ec1759699bd2ea25759a29368b84c82f30741ea4e7e2ca826',
    'lupine_discovery/web/recorded-census.js': '8e45d59eab288d5ce6c83fabe6b30ef4c707736913d13b8bf99f0e09a5b0628a',
    'lupine_discovery/resources/recorded-census-v1.json': 'a9ab9d72c6c39be9338e951b657e0587ae8f4dbe534b276b8f8f8951a7b1a63a',
}
for path, expected in pins.items():
    assert sha256((OVERLAY / path).read_bytes()).hexdigest() == expected, path
sys.dont_write_bytecode = True
sys.path.insert(0, str(OVERLAY))
violations = []


def audit(event, args):
    if event == 'open' and isinstance(args[0], (str, bytes)):
        path = Path(args[0].decode() if isinstance(args[0], bytes) else args[0]).resolve()
        if path.is_relative_to(PROJECT) and not (path.is_relative_to(OVERLAY) or path.is_relative_to(LANE)):
            violations.append({'event': event, 'path': str(path)})
            raise PermissionError('non-allowlisted project file')
        mode, flags = args[1], args[2]
        writing = (isinstance(mode, str) and any(x in mode for x in 'wax+')) or bool(flags & (1 | 2 | 64 | 512 | 1024))
        if writing and path.is_relative_to(PROJECT) and not path.is_relative_to(LANE):
            violations.append({'event': 'write', 'path': str(path)})
            raise PermissionError('write outside owned lane')
    if event in ('subprocess.Popen', 'os.system'):
        violations.append({'event': event})
        raise PermissionError('subprocess prohibited')
    if event in ('socket.bind', 'socket.connect') and args[1][0] != '127.0.0.1':
        violations.append({'event': event})
        raise PermissionError('non-loopback socket prohibited')
    if event == 'socket.getaddrinfo' and args[0] != '127.0.0.1':
        violations.append({'event': event})
        raise PermissionError('non-loopback address lookup prohibited')


sys.addaudithook(audit)
started = datetime.now(timezone.utc).isoformat()
timer = time.monotonic()
suite = unittest.defaultTestLoader.discover(str(LANE / 'tests'), pattern='test_server_recorded_census.py')
result = unittest.TextTestRunner(verbosity=2).run(suite)
import lupine_discovery.server as server
assert Path(server.__file__).resolve() == (OVERLAY / 'lupine_discovery/server.py').resolve()
held = {path: sha256((OVERLAY / path).read_bytes()).hexdigest() == expected for path, expected in pins.items()}
receipt = {
    'started_at': started,
    'finished_at': datetime.now(timezone.utc).isoformat(),
    'test_seconds': time.monotonic() - timer,
    'test_count': result.testsRun,
    'failures': len(result.failures), 'errors': len(result.errors), 'skips': len(result.skipped),
    'forbidden_events': violations, 'held_overlay_after': held,
    'actual_public_resource_used': pins['lupine_discovery/resources/recorded-census-v1.json'],
    'candidate_producer_or_private_input_invoked': False,
    'scope': 'Real loopback HTTP and package resources; no browser execution or arithmetic recomputation.',
    'pass': result.wasSuccessful() and not violations and all(held.values()),
}
(LANE / 'first' / 'result.json').write_text(json.dumps(receipt, indent=2, sort_keys=True) + '\n')
raise SystemExit(0 if receipt['pass'] else 1)
