"""Independent synthetic browser checks; never imports the author's browser helper."""
from __future__ import annotations

import copy
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys
import threading
import time
import traceback
from unittest.mock import patch
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright
import lupine_discovery.server as server_module


HERE = Path(__file__).resolve().parent
CANDIDATE = HERE.parent / 'phase2-planner-ui-candidate-v1'
OVERLAY = CANDIDATE / 'browser-overlay'
PRODUCT_FILES = [
    'src/lupine_discovery/server.py',
    'src/lupine_discovery/study_planning.py',
    'src/lupine_discovery/web/app.js',
    'src/lupine_discovery/web/index.html',
    'src/lupine_discovery/web/styles.css',
    'src/lupine_discovery/web/planner.js',
]


def hashes():
    return {name: hashlib.sha256((OVERLAY / name).read_bytes()).hexdigest()
            for name in PRODUCT_FILES}


def run(artifacts):
    assert Path(server_module.__file__).resolve() == OVERLAY / PRODUCT_FILES[0]
    checks, errors, paths, blocked = [], [], [], []
    server = server_module.make_server(0)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f'http://127.0.0.1:{server.server_address[1]}'
    try:
        with patch.object(server_module, 'benchmark_report', side_effect=AssertionError('ARCHIVE_ACCESS_FORBIDDEN')), \
             patch.object(server_module, 'get_case_outcomes', side_effect=AssertionError('OUTCOMES_ACCESS_FORBIDDEN')), \
             sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page(viewport={'width': 1280, 'height': 960}, accept_downloads=True)
            page.on('pageerror', lambda error: errors.append(str(error)))
            def guard(route):
                parsed = urlparse(route.request.url)
                paths.append(parsed.path)
                if parsed.scheme != 'http' or parsed.netloc != urlparse(origin).netloc:
                    blocked.append(route.request.url)
                    route.abort()
                else:
                    route.continue_()
            page.route('**/*', guard)
            page.goto(origin, wait_until='networkidle')
            expect(page.locator('#case-title')).to_be_visible()
            problem_before = page.locator('#problem-json').input_value()
            page.locator('#nav-planning').focus()
            page.keyboard.press('Enter')
            expect(page.locator('#view-planning')).to_be_visible()
            expect(page.locator('#view-planning')).to_contain_text('exchangeability alone does not provide it')

            def calculate(kind):
                endpoint = '/api/plan-pool' if kind == 'pool' else '/api/plan-zero-loss'
                with page.expect_response(lambda response: response.url == origin + endpoint) as observed:
                    page.locator(f'#{kind}-plan-submit').focus()
                    page.keyboard.press('Enter')
                response = observed.value
                assert response.status == 200, response.status
                value = response.json()
                expect(page.locator(f'#{kind}-plan-result')).to_be_visible()
                expect(page.locator(f'#{kind}-plan-download')).to_be_enabled()
                return value

            def export(kind, name, expected):
                with page.expect_download() as pending:
                    page.locator(f'#{kind}-plan-download').click()
                output = artifacts / name
                pending.value.save_as(output)
                assert json.loads(output.read_text()) == expected

            page.locator('#pool-plan-count').fill('2')
            page.locator('#pool-plan-alpha').fill('0.5')
            page.locator('#pool-plan-cutoff').fill('0')
            page.locator('#pool-plan-probability').fill('')
            unknown = calculate('pool')
            assert unknown['plan']['rank'] == 2
            assert unknown['plan']['alpha'] == '1/2'
            assert unknown['plan']['cutoff'] == '0'
            assert unknown['plan']['threshold_event_probability'] is None
            expect(page.locator('#pool-plan-result')).to_contain_text('Unknown — p was not supplied')
            export('pool', 'unknown-score-law.json', unknown)
            page.locator('#pool-plan-alpha').fill('1/2')
            expect(page.locator('#pool-plan-result')).to_be_hidden()
            expect(page.locator('#pool-plan-download')).to_be_disabled()
            rational = calculate('pool')
            assert rational == unknown
            checks.append('decimal_rational_equivalence_and_cutoff_zero_do_not_invent_a_score_law')

            page.locator('#pool-plan-probability').fill('0')
            zero = calculate('pool')
            assert zero['plan']['threshold_event_probability'] == '0'
            assert zero['plan']['iid_score_probability'] == '0'
            page.locator('#pool-plan-probability').fill('1')
            one = calculate('pool')
            assert one['plan']['threshold_event_probability'] == '1'
            assert one['plan']['adequacy_status'] == 'unestablished'
            expect(page.locator('#pool-plan-result')).to_contain_text('usefulness unestablished')
            expect(page.locator('#pool-plan-result')).to_contain_text('assumes the supplied IID score law')
            export('pool', 'hypothetical-score-law-one.json', one)
            checks.append('blank_zero_and_one_are_distinct_even_at_cutoff_zero_without_scientific_promotion')

            page.locator('#zero-plan-ceiling').fill('0.5')
            page.locator('#zero-plan-significance').fill('1/4')
            page.locator('#zero-plan-maximum').fill('1')
            insufficient = calculate('zero')
            assert insufficient['plan']['minimum_evaluation_panels'] is None
            assert insufficient['plan']['zero_failure_null_bound'] == '1/2'
            page.locator('#zero-plan-maximum').fill('2')
            sufficient = calculate('zero')
            assert sufficient['plan']['minimum_evaluation_panels'] == 2
            assert sufficient['plan']['minimum_zero_failure_null_bound'] == '1/4'
            assert sufficient['plan']['power_status'] == 'not_computed'
            assert sufficient['plan']['observed_evidence_status'] == 'no_observations'
            expect(page.locator('#zero-plan-result')).to_contain_text('Not computed / no observations')
            export('zero', 'zero-failure-equality-boundary.json', sufficient)
            checks.append('zero_failure_equality_boundary_resolves_at_two_panels_without_observed_power_claim')

            pool_text = page.locator('#pool-plan-result').inner_text()
            page.locator('#zero-plan-significance').fill('1/8')
            expect(page.locator('#zero-plan-download')).to_be_disabled()
            expect(page.locator('#zero-plan-result')).to_be_hidden()
            assert page.locator('#pool-plan-result').inner_text() == pool_text
            expect(page.locator('#pool-plan-download')).to_be_enabled()
            page.locator('#nav-workbench').focus()
            page.keyboard.press('Enter')
            expect(page.locator('#view-workbench')).to_be_visible()
            assert page.locator('#problem-json').input_value() == problem_before
            page.locator('#nav-planning').focus()
            page.keyboard.press('Enter')
            expect(page.locator('#view-planning')).to_be_visible()
            assert page.locator('#pool-plan-result').inner_text() == pool_text
            expect(page.locator('#zero-plan-result')).to_be_hidden()
            checks.append('keyboard_navigation_preserves_problem_and_input_edits_revoke_only_their_own_export')

            forged = copy.deepcopy(one)
            forged['plan']['calibrated_guarantee_status'] = 'proven'
            def forge(route):
                route.fulfill(status=200, content_type='application/json', body=json.dumps(forged))
            page.route('**/api/plan-pool', forge)
            with page.expect_response(lambda response: response.url == origin + '/api/plan-pool'):
                page.locator('#pool-plan-submit').click()
            expect(page.locator('#pool-plan-status')).to_contain_text('unsupported planning result')
            expect(page.locator('#pool-plan-result')).to_be_hidden()
            expect(page.locator('#pool-plan-download')).to_be_disabled()
            page.unroute('**/api/plan-pool', forge)
            recovered = calculate('pool')
            assert recovered == one
            checks.append('unsupported_guarantee_promotion_clears_result_export_and_valid_request_recovers')

            page.set_viewport_size({'width': 320, 'height': 800})
            assert page.evaluate('() => document.documentElement.scrollWidth <= window.innerWidth')
            page.locator('#pool-plan-probability').focus()
            expect(page.locator('#pool-plan-probability')).to_be_focused()
            page.evaluate('() => window.scrollTo(0, 0)')
            page.screenshot(path=str(artifacts / 'independent-mobile-planner.png'), full_page=True)
            page.set_viewport_size({'width': 1280, 'height': 960})
            page.evaluate('() => window.scrollTo(0, 0)')
            page.screenshot(path=str(artifacts / 'independent-desktop-planner.png'), full_page=True)
            assert not errors, errors
            assert not blocked, blocked
            assert not any('/outcomes' in path or '/api/benchmarks' in path for path in paths), paths
            checks.append('narrow_viewport_keyboard_and_request_scope_have_no_overflow_javascript_errors_or_outcome_fetches')
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
        assert not thread.is_alive()
    return {'checks': checks, 'javascript_errors': errors, 'blocked_external_requests': blocked,
            'request_paths': sorted(set(paths))}


if __name__ == '__main__':
    artifacts = Path(sys.argv[1]).resolve()
    assert artifacts.parent == HERE
    artifacts.mkdir(exist_ok=False)
    started = datetime.now(timezone.utc).isoformat()
    before = hashes()
    start_clock = time.monotonic()
    receipt = {'started_at': started, 'status': 'RUNNING', 'source_before': before,
               'runner_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
               'scope': 'Independent synthetic local Chromium behavior; no archive outcomes or external network.'}
    (artifacts / 'execution.json').write_text(json.dumps(receipt, indent=2) + '\n')
    code = 1
    try:
        receipt.update(run(artifacts))
        receipt['status'] = 'PASS'
        code = 0
    except BaseException:
        receipt['status'] = 'FAIL'
        receipt['failure'] = traceback.format_exc()
        traceback.print_exc()
    finally:
        receipt['finished_at'] = datetime.now(timezone.utc).isoformat()
        receipt['elapsed_seconds'] = time.monotonic() - start_clock
        receipt['source_after'] = hashes()
        receipt['source_unchanged'] = receipt['source_after'] == before
        if not receipt['source_unchanged']:
            receipt['status'] = 'FAIL'
            code = 1
        receipt['exit_code'] = code
        receipt['artifacts'] = {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                                for p in artifacts.iterdir() if p.name != 'execution.json'}
        (artifacts / 'execution.json').write_text(json.dumps(receipt, indent=2) + '\n')
        print(json.dumps(receipt, indent=2))
    sys.exit(code)
