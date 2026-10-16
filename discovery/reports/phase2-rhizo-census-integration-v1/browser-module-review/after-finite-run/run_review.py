"""One isolated real-HTTP invocation; public resource only, no source producer."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil
import sys
from threading import Thread
import time
import traceback

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
PREVIEW = ROOT / '.cache/phase2-rhizo-census-ui-v1/http-preview-v3'
MODULE = BASE / 'promotion/scripts/recorded_census_browser_checks.py'
OUT = BASE / sys.argv[1]
OUT.mkdir(exist_ok=False)
PACKAGE = OUT / 'package'
shutil.copytree(PREVIEW / 'src', PACKAGE / 'src')
(PACKAGE / 'scripts').mkdir()
shutil.copy2(MODULE, PACKAGE / 'scripts' / MODULE.name)
CHAIN = len(sys.argv) > 2 and sys.argv[2] == 'after-finite'
if CHAIN:
    shutil.copy2(ROOT / 'scripts/finite_planning_browser_checks.py', PACKAGE / 'scripts/finite_planning_browser_checks.py')
shutil.copy2(__file__, OUT / 'run_review.py')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def source():
    return {str(p.relative_to(PACKAGE)): sha(p) for p in sorted(PACKAGE.rglob('*'))
            if p.is_file() and '__pycache__' not in p.parts}

sys.dont_write_bytecode = True
sys.path[:0] = [str(PACKAGE / 'scripts'), str(PACKAGE / 'src')]
from playwright.sync_api import sync_playwright, expect
from lupine_discovery.server import make_server
from recorded_census_browser_checks import check_recorded_census_workbench

start = datetime.now(timezone.utc).isoformat()
timer = time.monotonic()
before = source()
errors, requests = [], []
server = make_server(0)
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()
origin = f'http://127.0.0.1:{server.server_address[1]}'
result = {'started_at': start, 'module_sha256': sha(MODULE), 'scope': 'Actual local HTTP public aggregate plus generated presentation controls. No private files/source producer. No arithmetic/scientific validation.'}
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 1050}, accept_downloads=True)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: requests.append(request.url))
        page.goto(origin, wait_until='networkidle')
        expect(page.locator('#case-title')).to_be_visible()
        initial_problem = page.locator('#problem-json').input_value()
        if CHAIN:
            from finite_planning_browser_checks import check_finite_planning_workbench
            result['preceding_finite_checks'] = check_finite_planning_workbench(page, OUT / 'finite-artifacts')
        result['checks'] = check_recorded_census_workbench(page, OUT / 'browser-artifacts')
        expect(page.locator('#view-workbench')).to_be_visible()
        assert page.viewport_size == {'width':1440,'height':1050}
        assert page.locator('#problem-json').input_value() == initial_problem
        assert not errors, errors
        assert all(url.startswith(origin + '/') for url in requests), requests
        assert not any('census-canary' in url for url in requests), requests
        result['caller_state_restored'] = True
        browser.close()
    result['status'] = 'PASS'
except BaseException:
    result['status'] = 'FAIL'
    result['failure'] = traceback.format_exc()
finally:
    server.shutdown()
    server.server_close()
    thread.join(timeout=5)
    result.update(finished_at=datetime.now(timezone.utc).isoformat(), elapsed_seconds=time.monotonic()-timer,
                  browser_errors=errors, requests=requests, source_before=before, source_after=source())
    result['source_unchanged'] = result['source_before'] == result['source_after'] and sha(MODULE) == result['module_sha256']
    if not result['source_unchanged']:
        result['status'] = 'FAIL'
    (OUT / 'execution.json').write_text(json.dumps(result, indent=2, sort_keys=True)+'\n')
print(json.dumps({k: result[k] for k in ('status','elapsed_seconds','source_unchanged','browser_errors')} | {'checks':len(result.get('checks',[])), 'failure':result.get('failure')}))
raise SystemExit(0 if result['status']=='PASS' else 1)
