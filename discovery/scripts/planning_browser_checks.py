"""Real local HTTP/Chromium planning checks; no archived scientific inputs."""
from fractions import Fraction
import json
from pathlib import Path

from playwright.sync_api import expect


def check_planning_workbench(page, artifacts):
    artifacts = Path(artifacts)
    artifacts.mkdir(parents=True, exist_ok=True)
    checks = []
    original_raw = page.locator('#problem-json').input_value()
    original_viewport = page.viewport_size
    requests = []
    held_routes = []
    route_handlers = []
    def record_request(request):
        if '/api/' in request.url:
            requests.append(request.url.rsplit('/api/', 1)[1])
    page.on('request', record_request)

    def submit(kind):
        suffix = 'plan-pool' if kind == 'pool' else 'plan-zero-loss'
        with page.expect_response(lambda response: response.url.endswith('/api/' + suffix)) as pending:
            page.locator(f'#{kind}-plan-submit').click()
        response = pending.value
        assert response.status == 200
        expect(page.locator(f'#{kind}-plan-result')).to_be_visible()
        return response.json()

    def exported(kind, expected, filename):
        with page.expect_download() as pending:
            page.locator(f'#{kind}-plan-download').click()
        destination = artifacts / filename
        pending.value.save_as(destination)
        assert json.loads(destination.read_bytes()) == expected

    def no_stale_export(kind):
        expect(page.locator(f'#{kind}-plan-download')).to_be_disabled()
        expect(page.locator(f'#{kind}-plan-result')).to_be_hidden()
        calls = page.evaluate('''(kind) => {
          const original = URL.createObjectURL; let count = 0;
          URL.createObjectURL = (...args) => { count += 1; return original(...args); };
          try { document.getElementById(`${kind}-plan-download`).dispatchEvent(new MouseEvent('click')); }
          finally { URL.createObjectURL = original; }
          return count;
        }''', kind)
        assert calls == 0

    try:
        page.locator('#nav-planning').click()
        expect(page.locator('#view-planning')).to_be_visible()
        expect(page.locator('#nav-planning')).to_have_attribute('aria-current', 'page')
        expect(page.locator('#view-planning')).to_contain_text('conditional on that frozen rule')
        expect(page.locator('#pool-plan-probability')).to_have_value('')
        unknown = submit('pool')
        assert unknown['plan']['rank'] == 18
        assert unknown['plan']['threshold_event_probability'] is None
        assert unknown['plan']['iid_score_probability'] is None
        expect(page.locator('#pool-plan-result')).to_contain_text('Unknown — p was not supplied')
        exported('pool', unknown, 'pool-unknown.json')
        checks.append('planning_unknown_score_law_preserved_and_exact_export_matches_http')

        page.locator('#pool-plan-probability').fill('19/20')
        no_stale_export('pool')
        nineteen = submit('pool')
        page.locator('#pool-plan-count').fill('20')
        twenty = submit('pool')
        assert Fraction(twenty['plan']['threshold_event_probability']) < Fraction(nineteen['plan']['threshold_event_probability'])
        assert Fraction(twenty['plan']['threshold_event_probability']) / Fraction(nineteen['plan']['threshold_event_probability']) == Fraction(741, 760)
        expect(page.locator('#pool-plan-result')).to_contain_text('Adding calibration panels need not increase')
        exported('pool', twenty, 'pool-twenty.json')
        checks.append('planning_nonmonotone_counts_match_exact_http_without_js_probability_math')

        page.locator('#pool-plan-count').fill('0')
        page.locator('#pool-plan-probability').fill('')
        infeasible = submit('pool')
        assert infeasible['plan']['threshold_event_probability'] == '0'
        assert infeasible['plan']['iid_score_probability'] is None
        expect(page.locator('#pool-plan-status')).to_contain_text('deterministic')
        expect(page.locator('#pool-plan-result')).to_contain_text('no calibrated guarantee')
        page.locator('#pool-plan-count').fill('9')
        for probability in ('0', '1'):
            page.locator('#pool-plan-probability').fill(probability)
            endpoint = submit('pool')
            assert endpoint['plan']['threshold_event_probability'] == probability
            expect(page.locator('#pool-plan-result')).to_contain_text('usefulness unestablished')
        checks.append('planning_rank_infeasible_zero_and_iid_endpoints_keep_guarantees_unestablished')

        zero = submit('zero')
        assert zero['plan']['minimum_evaluation_panels'] == 29
        assert zero['plan']['power_status'] == 'not_computed'
        exported('zero', zero, 'zero-29.json')
        pool_text = page.locator('#pool-plan-result').inner_text()
        page.locator('#zero-plan-ceiling').fill('1/20')
        assert submit('zero')['plan']['minimum_evaluation_panels'] == 59
        assert page.locator('#pool-plan-result').inner_text() == pool_text
        page.locator('#zero-plan-ceiling').fill('1/10')
        page.locator('#zero-plan-maximum').fill('28')
        assert submit('zero')['plan']['minimum_evaluation_panels'] is None
        expect(page.locator('#zero-plan-result')).to_contain_text('within this cap')
        page.locator('#zero-plan-maximum').fill('0')
        empty = submit('zero')
        assert empty['plan']['zero_failure_null_bound'] == '1'
        assert empty['plan']['minimum_evaluation_panels'] is None
        expect(page.locator('#zero-plan-result')).to_contain_text('Not computed / no observations')
        checks.append('planning_zero_failure_29_59_empty_and_insufficient_caps_no_power_claim')

        page.locator('#pool-plan-alpha').fill('1e999999999')
        no_stale_export('pool')
        with page.expect_response(lambda response: response.url.endswith('/api/plan-pool')) as pending:
            page.locator('#pool-plan-submit').click()
        assert pending.value.status == 400
        expect(page.locator('#pool-plan-status')).to_have_class('notice planning-status error')
        no_stale_export('pool')
        page.locator('#pool-plan-alpha').fill('1/10')
        page.locator('#pool-plan-count').fill('257')
        prior_requests = len(requests)
        page.locator('#pool-plan-submit').click()
        expect(page.locator('#pool-plan-status')).to_contain_text('integers from 0 to 256')
        assert len(requests) == prior_requests
        no_stale_export('pool')
        checks.append('planning_invalid_inputs_and_failed_requests_clear_result_and_export')

        # Hold real server responses, then release them out of order. The test
        # changes delivery timing only; responses still come from the exact API.
        for first_alpha in ('1/10', '1'):
            held = []
            page.evaluate('document.documentElement.setAttribute("data-test-held-plan-responses", "0")')
            def hold(route):
                held_routes.append(route)
                held.append((route, route.fetch()))
                page.evaluate('(count) => document.documentElement.setAttribute("data-test-held-plan-responses", String(count))', len(held))
            route_handlers.append(hold)
            page.route('**/api/plan-pool', hold)
            page.locator('#pool-plan-count').fill('19')
            page.locator('#pool-plan-alpha').fill(first_alpha)
            page.locator('#pool-plan-probability').fill('19/20')
            page.locator('#pool-plan-submit').click()
            expect(page.locator('#pool-plan-submit')).to_be_disabled()
            expect(page.locator('html')).to_have_attribute('data-test-held-plan-responses', '1')
            page.locator('#pool-plan-count').fill('20')
            page.locator('#pool-plan-alpha').fill('1/10')
            no_stale_export('pool')
            page.locator('#pool-plan-submit').click()
            expect(page.locator('#pool-plan-submit')).to_be_disabled()
            expect(page.locator('html')).to_have_attribute('data-test-held-plan-responses', '2')
            assert len(held) == 2
            newest, newest_response = held[1]
            with page.expect_response(lambda response: response.url.endswith('/api/plan-pool')):
                newest.fulfill(response=newest_response)
            expect(page.locator('#pool-plan-result')).to_be_visible()
            current = page.locator('#pool-plan-result').inner_text()
            oldest, oldest_response = held[0]
            with page.expect_response(lambda response: response.url.endswith('/api/plan-pool')):
                oldest.fulfill(response=oldest_response)
            assert page.locator('#pool-plan-result').inner_text() == current
            expect(page.locator('#pool-plan-status')).not_to_have_class('notice planning-status error')
            exported('pool', newest_response.json(), 'pool-latest-' + ('success' if first_alpha == '1/10' else 'error') + '.json')
            page.unroute('**/api/plan-pool', hold)
        checks.append('planning_older_success_and_error_responses_cannot_restore_stale_results')

        page.locator('#pool-plan-count').fill('19')
        submit('pool')
        page.locator('#zero-plan-maximum').fill('100')
        submit('zero')
        page.evaluate('window.scrollTo(0, 0)')
        page.screenshot(path=str(artifacts / 'desktop-planning.png'), full_page=True)
        for width in (390, 320):
            page.set_viewport_size({'width': width, 'height': 844})
            expect(page.locator('#view-planning')).to_be_visible()
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
            page.screenshot(path=str(artifacts / f'mobile-{width}-planning.png'), full_page=True)
        checks.append('planning_mobile_390_and_320_have_no_document_overflow')

        page.locator('#pool-plan-count').fill('256')
        page.locator('#pool-plan-alpha').fill('1/2')
        page.locator('#pool-plan-probability').fill('4294967294/4294967295')
        largest = submit('pool')
        assert len(largest['plan']['threshold_event_probability']) > 4000
        expect(page.locator('#pool-plan-result')).to_contain_text(largest['plan']['threshold_event_probability'])
        exact_region = page.locator('#pool-plan-result .planning-exact-long')
        expect(exact_region).to_have_attribute('tabindex', '0')
        assert exact_region.evaluate('(element) => element.clientHeight <= 150 && element.scrollHeight > element.clientHeight')
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
        page.locator('#pool-plan-result details').evaluate('(element) => { element.open = true; }')
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
        exported('pool', largest, 'pool-largest-exact.json')
        page.evaluate('window.scrollTo(0, 0)')
        page.screenshot(path=str(artifacts / 'mobile-320-large-exact.png'), full_page=True)
        checks.append('planning_maximum_valid_fraction_renders_exports_and_contains_overflow_at_320')

        page.locator('#nav-workbench').click()
        expect(page.locator('#view-workbench')).to_be_visible()
        assert page.locator('#problem-json').input_value() == original_raw
        assert all(path in ('plan-pool', 'plan-zero-loss') for path in requests)
        checks.append('planning_navigation_preserves_existing_problem_and_reads_no_case_outcomes_or_archives')
    finally:
        for route in held_routes:
            try:
                route.abort()
            except Exception:
                pass  # Already fulfilled routes need no cleanup.
        for handler in route_handlers:
            page.unroute('**/api/plan-pool', handler)
        page.evaluate('document.documentElement.removeAttribute("data-test-held-plan-responses")')
        page.remove_listener('request', record_request)
        if original_viewport:
            page.set_viewport_size(original_viewport)
    return checks
