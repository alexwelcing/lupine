"""Independent synthetic-only browser readout checks; no archive execution."""
from hashlib import sha256
from pathlib import Path
import json
import sys
import threading

from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'src'))
from lupine_discovery.server import make_server

OUT=Path(__file__).resolve().parent
FIX=ROOT/'.cache/mpea-study-engine/reports/ui-fixtures'
NAMES=('complete-negative','complete-positive','unknown-empty-null-gates','insufficient-development','registration-unavailable')
SOURCES=('src/lupine_discovery/web/mpea.js','src/lupine_discovery/web/app.js',
    'src/lupine_discovery/web/index.html','src/lupine_discovery/web/styles.css',
    'src/lupine_discovery/server.py','scripts/mpea_browser_checks.py',
    Path(__file__).relative_to(ROOT).as_posix())


def run():
    before={name:sha256((ROOT/name).read_bytes()).hexdigest() for name in SOURCES}
    reports={name:json.loads((FIX/(name+'.json')).read_bytes()) for name in NAMES}
    assert all(r['execution_kind']=='synthetic_fixture' for r in reports.values())
    assert not (ROOT/'src/lupine_discovery/resources/mpea-t25-v1.json').exists()
    checks=[]; observations={}; errors=[]
    server=make_server(0); thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    url=f'http://127.0.0.1:{server.server_address[1]}'
    try:
        with sync_playwright() as playwright:
            browser=playwright.chromium.launch(headless=True)
            page=browser.new_page(viewport={'width':1440,'height':1050})
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(url,wait_until='networkidle');page.locator('#nav-benchmarks').click()
            expect(page.locator('#benchmark-content')).to_be_visible()
            expect(page.locator('#mpea-status')).to_contain_text('No measured outcome')
            expect(page.locator('#mpea-content')).to_be_hidden()
            checks.append('real_optional_resource_absence_has_no_measurement_or_verdict')

            def render(name):
                page.evaluate('report=>window.LupineMpea.render(report)',reports[name])
                expect(page.locator('#mpea-content')).to_contain_text('SYNTHETIC CONTROL')
                page.locator('#mpea-content details').evaluate_all('(items)=>items.forEach(item=>item.open=true)')

            # Independent arithmetic comparison for every visible policy/cap;
            # this checks actual rendered values, not just table membership.
            comparisons=0
            for name in ('complete-negative','unknown-empty-null-gates'):
                render(name); report=reports[name]
                for population in ('primary','secondary'):
                    region=page.locator(f'[data-mpea-population="{population}"]')
                    for view in ('assigned_panels','observed_feasible_panels'):
                        region.locator('select').select_option(view)
                        region.locator('details').evaluate_all('(items)=>items.forEach(item=>item.open=true)')
                        for policy,item in report['payload']['policy_metrics'][population].items():
                            rows=region.locator(f'tr[data-mpea-policy="{policy}"]')
                            expect(rows).to_have_count(2)
                            for slot in item['budget_snapshots']:
                                metric=slot['metrics'][view]
                                cell=rows.first.locator(f'[data-mpea-budget="{slot["requested_cap"]}"]')
                                expect(cell).to_be_visible()
                                binary=metric['any_optimum_hit']
                                value=('Unavailable' if binary['rate'] is None else
                                    f'{binary["success_count"]} / {binary["known_count"]} known; {binary["panel_denominator"]} assigned; {binary["unavailable_count"]} unavailable')
                                expect(cell).to_contain_text(value)
                                cost=metric['actual_bundle_cost']['sum']
                                expect(cell).to_contain_text('Bundle requests: '+('Unavailable' if cost is None else str(cost)))
                                comparisons+=1
                            equal=item['same_actual_pool_cost'][view]
                            expect(rows.last).to_be_visible()
                            cost=equal['actual_bundle_cost']['sum']
                            expect(rows.last.locator('td').nth(1)).to_have_text('Unavailable' if cost is None else str(cost))
                            comparisons+=1
            checks.append(f'{comparisons}_independent_exact_policy_budget_and_same_cost_comparisons')

            # Route the optional report through the real app.js integration,
            # then compare the entire exact exported value tree canonically.
            def route_report(route):
                response=route.fetch(); body=response.json();body['mpea_archived']=reports['complete-negative']
                route.fulfill(response=response,json=body)
            page.route('**/api/benchmarks',route_report)
            with page.expect_response(lambda response: response.url.endswith('/api/benchmarks')):
                page.locator('#refresh-benchmarks').click()
            expect(page.locator('#mpea-verdict')).to_have_attribute('data-status','NO_GO_ARCHIVAL_USEFULNESS')
            expect(page.locator('#mpea-provenance')).to_contain_text(reports['complete-negative']['scientific_sha256'])
            with page.expect_download() as event:page.locator('#download-mpea').click()
            downloaded=OUT/'exact-export-v4.json';event.value.save_as(downloaded)
            canonical=lambda value:(json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=True)+'\n').encode()
            assert canonical(json.loads(downloaded.read_bytes()))==(FIX/'complete-negative.json').read_bytes()
            checks.append('real_app_optional_report_route_and_type_preserving_exact_export')

            render('insufficient-development')
            visible=page.locator('#mpea-content').inner_text()
            observations['insufficient_development_visible_text']=visible
            observations['access_counters_present']=('49' in visible and
                ('1000' in visible or '1,000' in visible) and 'interpreted' in visible.lower())
            assert observations['access_counters_present']
            expect(page.locator('#mpea-access')).to_be_visible()
            access=reports['insufficient-development']['access']['counts']
            assert access['interpreted_bundles']['DEVELOPMENT']==49
            expect(page.locator('#mpea-access')).to_contain_text('49')
            expect(page.locator('#mpea-access')).to_contain_text('1000')
            checks.append('early_stop_preserves_mixed_capture_and_role_specific_access_visibility')
            expect(page.locator('[data-mpea-population]')).to_have_count(0)
            expect(page.locator('#mpea-gates')).to_have_count(0)
            checks.append('early_stop_has_no_performance_population_or_gates')
            render('registration-unavailable')
            expect(page.locator('#mpea-content')).not_to_contain_text('REGISTERED ARCHIVAL REPLAY')
            expect(page.locator('#mpea-content')).to_contain_text('No overall performance verdict')
            checks.append('missing_registration_stays_synthetic_and_without_scientific_verdict')

            render('complete-negative')
            widths={}
            for width in (320,390,768,1440):
                page.set_viewport_size({'width':width,'height':900})
                page.locator('#mpea-content details').evaluate_all('(items)=>items.forEach(item=>item.open=true)')
                sizes=page.evaluate('({viewport:innerWidth,document:document.documentElement.scrollWidth})')
                widths[str(width)]=sizes
                assert sizes['document']<=width+1,sizes
            observations['open_details_layouts']=widths
            page.set_viewport_size({'width':320,'height':900})
            page.locator('[data-mpea-population="primary"]').screenshot(path=str(OUT/'primary-320.png'))
            checks.append('all_details_open_at_320_390_768_1440_without_document_overflow')
            assert not errors,errors
            browser.close()
    finally:
        server.shutdown();server.server_close();thread.join(timeout=2)
    after={name:sha256((ROOT/name).read_bytes()).hexdigest() for name in SOURCES}
    receipt={'status':'PASS' if before==after else 'SOURCE_CHANGED','scope':'Synthetic browser controls only; no actual source, feature artifact or performance-target access.',
        'checks':checks,'observations':observations,'source_before':before,'source_after':after,'unchanged':before==after,
        'fixture_sha256':{name:sha256((FIX/(name+'.json')).read_bytes()).hexdigest() for name in NAMES},'javascript_errors':errors}
    raw=(json.dumps(receipt,sort_keys=True,indent=2)+'\n').encode()
    path=OUT/'browser-review-v4.json'
    with path.open('xb') as stream:stream.write(raw)
    print(json.dumps({'status':receipt['status'],'checks':len(checks),'receipt_sha256':sha256(raw).hexdigest(),
        'access_counters_present':observations['access_counters_present']}))


if __name__=='__main__':run()
