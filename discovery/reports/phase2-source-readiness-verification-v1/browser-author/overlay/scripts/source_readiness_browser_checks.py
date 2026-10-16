"""Public source-readiness HTTP/UI regression; no acquisition or source parser."""
from copy import deepcopy
from hashlib import sha256
from importlib.resources import files
import json
from pathlib import Path

from playwright.sync_api import expect

PUBLIC_READINESS_SHA256 = '9abad97d5675f416cc38a325bcd1e108825af001b2fdfccaa1f5c7dfb66f3f0b'


def check_source_readiness_workbench(page, artifacts):
    """Use the real app and public resource, then restore the caller's UI state."""
    artifacts = Path(artifacts)
    artifacts.mkdir(parents=True, exist_ok=True)
    original_viewport = page.viewport_size
    original_nav = page.locator('nav [aria-current="page"]').get_attribute('id')
    original_scroll = page.evaluate('() => ({x:scrollX,y:scrollY})')
    original_focus = page.evaluate('() => document.activeElement?.id || null')
    original_problem = page.locator('#problem-json').input_value()
    checks, pending = [], []
    actual = payload = None
    routed = False
    route_pattern = '**/api/benchmarks'

    def render(value):
        return page.evaluate('value => window.LupineSourceReadiness.render(value)', value)

    def hold_route(route):
        pending.append({'route': route, 'done': False})

    def start_refresh():
        index = len(pending)
        page.locator('#refresh-benchmarks').click()
        for _ in range(100):
            if len(pending) > index:
                return pending[index]
            page.wait_for_timeout(10)
        raise AssertionError('The real refresh control did not issue its benchmark request')

    def finish(item, response, *, status=200):
        item['route'].fulfill(status=status, content_type='application/json', body=json.dumps(response))
        item['done'] = True

    def unavailable():
        expect(page.locator('#source-readiness-status')).to_be_visible()
        expect(page.locator('#source-readiness-status')).to_contain_text('unavailable')
        expect(page.locator('#source-readiness-content')).to_be_hidden()
        expect(page.locator('.source-readiness-card, #download-source-readiness')).to_have_count(0)

    try:
        package = files('lupine_discovery')
        raw = package.joinpath('resources/source-readiness-v1.json').read_bytes()
        assert sha256(raw).hexdigest() == PUBLIC_READINESS_SHA256
        base = page.url.split('#')[0].rstrip('/')
        response = page.request.get(base + '/api/benchmarks')
        assert response.status == 200
        payload = response.json()
        actual = payload['source_readiness']
        assert actual == json.loads(raw)
        asset = page.request.get(base + '/source-readiness.js')
        assert asset.status == 200 and 'text/javascript' in asset.headers['content-type']
        assert asset.body() == package.joinpath('web/source-readiness.js').read_bytes()
        page.locator('#nav-benchmarks').click()
        expect(page.locator('#source-readiness-content')).to_be_visible()
        expect(page.locator('.source-readiness-card')).to_have_count(2)
        expect(page.locator('#source-readiness-li-tensile-v3 h3')).to_have_text('Li alloy tensile measurements')
        expect(page.locator('#source-readiness-dryad-dielectric h3')).to_have_text('Dryad archived dielectric calculations')
        assert page.locator('#source-readiness-content').inner_text().count('Scientific admission: NOT_ADMITTED') == 2
        assert page.locator('#source-readiness-content button').count() == 1
        assert page.locator('#source-readiness-content input, #source-readiness-content form').count() == 0
        with page.expect_download() as download:
            page.locator('#download-source-readiness').click()
        assert download.value.suggested_filename == 'lupine-source-readiness.json'
        destination = artifacts / 'source-readiness-public-export.json'
        download.value.save_as(destination)
        assert json.loads(destination.read_text(encoding='utf-8')) == actual
        checks.append('source_readiness_real_http_resource_asset_two_blocked_cards_and_exact_export')

        content = page.locator('#source-readiness-content')
        assert content.locator('details[open]').count() == 0
        primary = content.inner_text()
        assert 'XML_PROFILE_UNSUPPORTED' not in primary and 'UTF-8' not in primary
        content.locator('details').evaluate_all('nodes => nodes.forEach(node => node.open = true)')
        displayed = content.text_content()
        for source in actual['sources']:
            for field in ('completed_actions', 'unexecuted_actions', 'blockers', 'exposure'):
                assert all(text in displayed for text in source[field])
            assert source['license_declaration'] in displayed
        links = content.locator('a').evaluate_all('nodes => nodes.map(n => ({href:n.href,rel:n.rel,target:n.target}))')
        assert [link['href'] for link in links] == [url for source in actual['sources'] for url in source['evidence_urls']]
        assert all(set(link['rel'].split()) == {'noopener', 'noreferrer'} and link['target'] == '_blank' for link in links)
        content.locator('details').evaluate_all('nodes => nodes.forEach(node => node.open = false)')
        checks.append('source_readiness_plain_primary_copy_complete_collapsed_disclosures_and_safe_evidence_links')

        page.route(route_pattern, hold_route)
        routed = True
        variants = [None, {'schema':'lupine.source-readiness.unavailable.v1','status':'UNAVAILABLE',
            'reason':'SOURCE_READINESS_RESOURCE_MISSING','scientific_admission':'NOT_ADMITTED'}]
        for field, value in (('scientific_admission', 'ADMITTED'), ('title', 'Forged readiness claim'),
                             ('title', '<img src="never-fetch" onerror="window.readinessInjection=1">'),
                             ('evidence_urls', ['javascript:window.readinessInjection=1'])):
            forged = deepcopy(actual)
            forged['sources'][0][field] = value
            variants.append(forged)
        for value in variants:
            assert render(actual)
            page.evaluate('() => { window.oldReadinessExport=document.getElementById("download-source-readiness"); }')
            request = start_refresh()
            unavailable()
            created = page.evaluate('''() => {
              const original=URL.createObjectURL;let count=0;
              URL.createObjectURL=(...args)=>{count++;return original(...args);};
              try {window.oldReadinessExport.click();} finally {URL.createObjectURL=original;}
              return count;
            }''')
            assert created == 0
            generated = deepcopy(payload)
            if value is None:
                generated.pop('source_readiness')
            else:
                generated['source_readiness'] = value
            finish(request, generated)
            page.wait_for_load_state('networkidle')
            unavailable()
        assert page.locator('#source-readiness-content img, #source-readiness-content script').count() == 0
        assert page.evaluate('window.readinessInjection === undefined')
        checks.append('source_readiness_six_generated_http_missing_forged_injection_cases_clear_stale_exports')

        for latest in ('missing', 'failed', 'valid'):
            assert render(actual)
            older, newer = start_refresh(), start_refresh()
            if latest == 'valid':
                finish(newer, payload)
                expect(page.locator('.source-readiness-card')).to_have_count(2)
                finish(older, {}, status=503)
            else:
                generated = deepcopy(payload)
                generated.pop('source_readiness')
                finish(newer, generated, status=503 if latest == 'failed' else 200)
                if latest == 'failed':
                    expect(page.locator('#benchmark-status')).to_have_class('notice error')
                else:
                    expect(page.locator('#benchmark-status')).to_be_hidden()
                finish(older, payload)
            page.wait_for_load_state('networkidle')
            if latest == 'valid':
                expect(page.locator('.source-readiness-card')).to_have_count(2)
            else:
                unavailable()
        checks.append('source_readiness_three_out_of_order_full_app_fetches_keep_latest_source_view')
        page.unroute(route_pattern, hold_route)
        routed = False

        assert render(actual)
        summary = content.locator('summary').first
        summary.focus()
        expect(summary).to_be_focused()
        page.keyboard.press('Enter')
        assert summary.evaluate('node => node.parentElement.open')
        page.keyboard.press('Enter')
        assert not summary.evaluate('node => node.parentElement.open')
        page.locator('#download-source-readiness').focus()
        expect(page.locator('#download-source-readiness')).to_be_focused()
        with page.expect_download() as download:
            page.keyboard.press('Enter')
        destination = artifacts / 'source-readiness-keyboard-export.json'
        download.value.save_as(destination)
        assert json.loads(destination.read_text(encoding='utf-8')) == actual
        page.locator('#source-readiness-section').screenshot(path=str(artifacts / 'source-readiness-desktop.png'))
        for width in (390, 320):
            page.set_viewport_size({'width':width, 'height':844})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
            page.locator('#source-readiness-section').screenshot(path=str(artifacts / f'source-readiness-mobile-{width}.png'))
        checks.append('source_readiness_keyboard_disclosures_export_and_mobile_containment')
    finally:
        if payload is not None:
            for item in pending:
                if not item['done']:
                    finish(item, payload)
        if routed:
            page.unroute(route_pattern, hold_route)
        if pending:
            page.wait_for_load_state('networkidle')
        if actual is not None:
            # Clear the generated HTTP error notice and restore all peer reports
            # through the original refresh handler after removing our routes.
            with page.expect_response(lambda response: response.url.endswith('/api/benchmarks')) as restored:
                page.locator('#refresh-benchmarks').click()
            assert restored.value.status == 200
            expect(page.locator('#benchmark-status')).to_be_hidden()
            expect(page.locator('.source-readiness-card')).to_have_count(2)
        if original_viewport:
            page.set_viewport_size(original_viewport)
        if original_nav:
            page.locator('#' + original_nav).click()
        if original_focus:
            page.evaluate('id => document.getElementById(id)?.focus({preventScroll:true})', original_focus)
        page.evaluate('position => scrollTo(position.x,position.y)', original_scroll)
        assert page.locator('#problem-json').input_value() == original_problem
    checks.append('source_readiness_restores_public_snapshot_problem_view_viewport_and_focus')
    return checks
