"""Chromium checks on the held public fixture; routes are fulfilled in memory."""
from pathlib import Path
from copy import deepcopy
import datetime
import hashlib
import json
import subprocess
import sys
import time
import traceback
from playwright.sync_api import sync_playwright, expect

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
WEB = BASE / 'overlay/src/lupine_discovery/web'
RUN = BASE / sys.argv[1]
RUN.mkdir(exist_ok=False)
SHA = lambda b: hashlib.sha256(b).hexdigest()
paths = [WEB / n for n in ('source-readiness.js', 'app.js', 'index.html', 'styles.css')]
paths += [BASE / 'fixture.json', Path(__file__)]
before = {str(p.relative_to(BASE)): SHA(p.read_bytes()) for p in paths}
tracked = json.loads((BASE / 'preparation.json').read_text())['baseline_files']
for path, identity in tracked.items():
    assert SHA((ROOT / path).read_bytes()) == identity['sha256']
for p in paths:
    q = RUN / 'held' / p.relative_to(BASE)
    q.parent.mkdir(parents=True, exist_ok=True)
    q.write_bytes(p.read_bytes())
start = datetime.datetime.now(datetime.timezone.utc).isoformat()
clock = time.monotonic()
checks, errors, requests = [], [], []
receipt = {'started_at': start, 'scope': 'Direct fixture Chromium with in-memory routes; exact app loadBenchmarks function exercised with isolated peer-renderer stubs. No actual HTTP server or source operation.', 'source_before': before}
fixture = json.loads((BASE / 'fixture.json').read_text())
assert SHA((BASE / 'fixture.json').read_bytes()) == '9abad97d5675f416cc38a325bcd1e108825af001b2fdfccaa1f5c7dfb66f3f0b'
index = (WEB / 'index.html').read_text()
section = index[index.index('<section id="source-readiness-section"'):index.index('<section class="release-note">')]
app = (WEB / 'app.js').read_text()
load = app[app.index('  async function loadBenchmarks() {'):app.index("  $('case-select').addEventListener", app.index('  async function loadBenchmarks() {'))]
url = 'http://127.0.0.1:8123/'
html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><style>' + (WEB / 'styles.css').read_text() + '</style></head><body><main>' + section + '</main><div id="benchmark-status"></div><div id="benchmark-content"></div><div id="suite-metrics"></div></body></html>'

def clone():
    return deepcopy(fixture)

try:
    for name in ('source-readiness.js', 'app.js'):
        subprocess.run(['node', '--check', str(WEB / name)], check=True, capture_output=True)
    checks.append('held_javascript_syntax')
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 1050}, accept_downloads=True)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: requests.append(request.url))
        queued = []
        def route(request):
            if request.request.url == url:
                request.fulfill(status=200, content_type='text/html', body=html)
            elif request.request.url == url + 'api/benchmarks':
                queued.append(request)
            else:
                request.abort()
                raise AssertionError('Unexpected browser request: ' + request.request.url)
        page.route('**/*', route)
        page.goto(url, wait_until='domcontentloaded')
        page.add_script_tag(content=(WEB / 'source-readiness.js').read_text())
        assert page.evaluate('isSecureContext && !!crypto.subtle')
        render = lambda value: page.evaluate('value => window.LupineSourceReadiness.render(value)', value)
        assert render(fixture) is True
        expect(page.locator('.source-readiness-card')).to_have_count(2)
        expect(page.locator('#source-readiness-li-tensile-v3 h3')).to_have_text('Li alloy tensile measurements')
        expect(page.locator('#source-readiness-dryad-dielectric h3')).to_have_text('Dryad archived dielectric calculations')
        visible = page.locator('#source-readiness-content').inner_text()
        assert 'XML_PROFILE_UNSUPPORTED' not in visible and 'UTF-8' not in visible
        assert visible.count('Scientific admission: NOT_ADMITTED') == 2
        assert page.locator('#source-readiness-content button').count() == 1
        assert page.locator('#source-readiness-content input, #source-readiness-content form').count() == 0
        assert page.locator('#source-readiness-content details[open]').count() == 0
        checks.append('complete_two_source_plain_primary_view_no_operation_controls')
        page.locator('#source-readiness-section').screenshot(path=str(RUN / 'desktop.png'))
        page.locator('#source-readiness-content details').evaluate_all('nodes => nodes.forEach(node => node.open = true)')
        content = page.locator('#source-readiness-content').text_content()
        for source in fixture['sources']:
            for key in ('completed_actions', 'unexecuted_actions', 'blockers', 'exposure'):
                assert all(value in content for value in source[key])
            assert source['license_declaration'] in content
        links = page.locator('#source-readiness-content a').evaluate_all('nodes => nodes.map(n => ({href:n.href, rel:n.rel, target:n.target, label:n.getAttribute("aria-label")}))')
        assert [link['href'] for link in links] == [url for source in fixture['sources'] for url in source['evidence_urls']]
        assert all(set(link['rel'].split()) == {'noopener', 'noreferrer'} and link['target'] == '_blank' and 'new tab' in link['label'] for link in links)
        checks.append('all_recorded_actions_blockers_exposure_licenses_and_evidence_links_retained')
        page.locator('#source-readiness-content details').evaluate_all('nodes => nodes.forEach(node => node.open = false)')
        first = page.locator('#source-readiness-content summary').first
        first.focus(); page.keyboard.press('Enter')
        assert first.evaluate('node => node.parentElement.open')
        page.keyboard.press('Enter')
        assert not first.evaluate('node => node.parentElement.open')
        page.locator('#download-source-readiness').focus()
        with page.expect_download() as pending:
            page.keyboard.press('Enter')
        pending.value.save_as(RUN / 'exact-export.json')
        assert json.loads((RUN / 'exact-export.json').read_text()) == fixture
        assert (RUN / 'exact-export.json').read_bytes().endswith(b'\n')
        checks.append('keyboard_details_and_complete_exact_json_export')
        page.set_viewport_size({'width': 375, 'height': 812})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        page.locator('#source-readiness-section').screenshot(path=str(RUN / 'mobile.png'))
        checks.append('mobile_375px_containment')
        page.evaluate('value => { window.callerReport=value; }', fixture)
        assert page.evaluate('() => window.LupineSourceReadiness.render(window.callerReport)')
        page.evaluate('() => { window.callerReport.sources[0].title="MUTATED_CALLER"; window.oldExport=document.getElementById("download-source-readiness"); }')
        with page.expect_download() as pending:
            page.locator('#download-source-readiness').click()
        pending.value.save_as(RUN / 'detached-export.json')
        assert json.loads((RUN / 'detached-export.json').read_text()) == fixture
        checks.append('caller_mutation_cannot_change_validated_export')
        assert render(None) is False
        page.evaluate('() => { window.objectURLs=0; const old=URL.createObjectURL.bind(URL); URL.createObjectURL=value=>{window.objectURLs++;return old(value);}; window.oldExport.click(); }')
        assert page.evaluate('window.objectURLs') == 0
        expect(page.locator('.source-readiness-card, #download-source-readiness')).to_have_count(0)
        expect(page.locator('#source-readiness-status')).to_be_visible()
        checks.append('missing_resource_clears_cards_and_invalidates_detached_old_export')
        invalid = [None, {}, {'schema':'lupine.source-readiness.unavailable.v1','status':'UNAVAILABLE','reason':'SOURCE_READINESS_RESOURCE_MISSING','scientific_admission':'NOT_ADMITTED'}]
        mutations = [
            lambda p:p.update(schema='wrong'), lambda p:p.update(snapshot_commit='0'*40),
            lambda p:p.update(extra='unexpected'), lambda p:p.update(sources=[]),
            lambda p:p['sources'].reverse(), lambda p:p['sources'][0].update(scientific_admission='ADMITTED'),
            lambda p:p['sources'][0].update(status='READY'), lambda p:p['sources'][0].update(completed_actions=[]),
            lambda p:p['sources'][0].update(title='x'*1025), lambda p:p['sources'][0].update(title='non-ascii \u2603'),
            lambda p:p['sources'][0].update(title='<img src=x onerror="window.INJECTED=true">'),
            lambda p:p['sources'][0].update(title='Forged but structurally valid claim'),
            lambda p:p['sources'][0].update(evidence_urls=['javascript:window.INJECTED=true']),
            lambda p:p['sources'][0].update(evidence_urls=['https://github.com@evil.invalid/x']),
            lambda p:p['sources'][0].update(evidence_urls=['//evil.invalid/x']),
            lambda p:p['sources'][0].update(exposure=['x'*1024]*16,blockers=['x'*1024]*16),
        ]
        for mutate in mutations:
            value=clone(); mutate(value); invalid.append(value)
        for number, value in enumerate(invalid):
            assert render(fixture)
            assert render(value) is False, number
            expect(page.locator('.source-readiness-card, #download-source-readiness')).to_have_count(0)
            expect(page.locator('#source-readiness-status')).to_contain_text('unavailable')
        assert page.locator('#source-readiness-content img, #source-readiness-content script').count() == 0
        assert page.evaluate('window.INJECTED === undefined')
        checks.append(f'{len(invalid)}_missing_invalid_forged_and_injection_cases_clear_prior_view')
        page.evaluate('''value => { window.originalDigest=crypto.subtle.digest.bind(crypto.subtle);
          crypto.subtle.digest=(...args)=>new Promise(resolve=>{window.releaseDigest=()=>resolve(window.originalDigest(...args));});
          window.pendingRender=window.LupineSourceReadiness.render(value); }''', fixture)
        assert render(None) is False
        page.evaluate('() => { window.releaseDigest(); }')
        assert page.evaluate('() => window.pendingRender') is False
        page.evaluate('() => { crypto.subtle.digest=window.originalDigest; }')
        expect(page.locator('.source-readiness-card, #download-source-readiness')).to_have_count(0)
        checks.append('late_digest_cannot_restore_cleared_view')
        # Execute the exact held app function, with only unrelated renderers stubbed.
        bootstrap = '''let sourceReadinessRequest=0; const state={}; const $=id=>document.getElementById(id);
          const node=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
          const api=path=>fetch(path).then(response=>{if(!response.ok)throw Error('Generated fetch failure');return response.json();});
          const renderKnown=()=>{},renderArchives=()=>{},renderConstrained=()=>{},renderTrainingTail=()=>{};
          window.LupineMpea={render:()=>{}};window.LupineRecordedCensus={render:()=>{}};
        ''' + load + '\nwindow.startBenchmarks=loadBenchmarks;'
        page.add_script_tag(content=bootstrap)
        def launch_two():
            queued.clear()
            page.evaluate('() => { window.firstRequest=window.startBenchmarks(); window.secondRequest=window.startBenchmarks(); }')
            for _ in range(100):
                if len(queued)==2: return
                page.wait_for_timeout(10)
            raise AssertionError('Generated fetches were not queued')
        launch_two()
        queued[1].fulfill(status=200,content_type='application/json',body='{}')
        page.evaluate('() => window.secondRequest')
        queued[0].fulfill(status=200,content_type='application/json',body=json.dumps({'source_readiness':fixture}))
        page.evaluate('() => window.firstRequest')
        expect(page.locator('.source-readiness-card, #download-source-readiness')).to_have_count(0)
        launch_two()
        queued[1].fulfill(status=503,content_type='application/json',body='{}')
        page.evaluate('() => window.secondRequest')
        queued[0].fulfill(status=200,content_type='application/json',body=json.dumps({'source_readiness':fixture}))
        page.evaluate('() => window.firstRequest')
        expect(page.locator('.source-readiness-card, #download-source-readiness')).to_have_count(0)
        launch_two()
        queued[1].fulfill(status=200,content_type='application/json',body=json.dumps({'source_readiness':fixture}))
        page.evaluate('() => window.secondRequest')
        expect(page.locator('.source-readiness-card')).to_have_count(2)
        queued[0].fulfill(status=503,content_type='application/json',body='{}')
        page.evaluate('() => window.firstRequest')
        expect(page.locator('.source-readiness-card')).to_have_count(2)
        checks.append('three_out_of_order_actual_fetch_response_cases_keep_latest_source_view')
        assert not errors
        assert set(requests).issubset({url,url+'api/benchmarks'})
        checks.append('no_javascript_errors_or_external_requests')
        browser.close()
    receipt['status']='PASS'
except Exception:
    receipt['status']='FAIL'
    receipt['exception']=traceback.format_exc()
    raise
finally:
    after={str(p.relative_to(BASE)):SHA(p.read_bytes()) for p in paths}
    unchanged=all(SHA((ROOT/path).read_bytes())==identity['sha256'] for path,identity in tracked.items())
    receipt.update(finished_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),process_seconds=time.monotonic()-clock,
        checks=checks,javascript_errors=errors,requests=requests,source_after=after,source_held=before==after,
        tracked_baseline_held=unchanged,actual_source_operations=0)
    (RUN/'execution.json').write_text(json.dumps(receipt,indent=2,sort_keys=True)+'\n')
    print(json.dumps(receipt,indent=2))
