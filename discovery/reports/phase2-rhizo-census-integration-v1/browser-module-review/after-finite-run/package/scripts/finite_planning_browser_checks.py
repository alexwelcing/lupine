"""Finite-frame planning through real local HTTP and Chromium; no science data."""
from copy import deepcopy
from fractions import Fraction
import json
from pathlib import Path

from playwright.sync_api import expect


def check_finite_planning_workbench(page, artifacts):
    artifacts = Path(artifacts)
    artifacts.mkdir(parents=True, exist_ok=True)
    checks = []
    original_raw = page.locator('#problem-json').input_value()
    original_viewport = page.viewport_size
    requests = []
    held_routes = []
    route_handlers = []
    endpoint = '**/api/plan-finite-zero-loss'

    def record_request(request):
        if '/api/' in request.url:
            requests.append(request.url.rsplit('/api/', 1)[1])
    page.on('request', record_request)

    def inputs(population='100', ceiling='1/10', significance='1/20', maximum='100'):
        for name, value in (('population', population), ('ceiling', ceiling),
                            ('significance', significance), ('maximum', maximum)):
            page.locator(f'#finite-plan-{name}').fill(value)

    def submit(expected_status=200):
        with page.expect_response(lambda response: response.url.endswith('/api/plan-finite-zero-loss')) as pending:
            page.locator('#finite-plan-submit').click()
        response = pending.value
        assert response.status == expected_status
        if expected_status == 200:
            expect(page.locator('#finite-plan-result')).to_be_visible()
        return response.json()

    def exported(expected, filename):
        with page.expect_download() as pending:
            page.locator('#finite-plan-download').click()
        assert pending.value.suggested_filename == 'lupine-finite-zero-failure-resolution-plan.json'
        destination = artifacts / filename
        pending.value.save_as(destination)
        assert json.loads(destination.read_bytes()) == expected

    def no_stale_export():
        expect(page.locator('#finite-plan-download')).to_be_disabled()
        expect(page.locator('#finite-plan-result')).to_be_hidden()
        calls = page.evaluate('''() => {
          const original = URL.createObjectURL; let count = 0;
          URL.createObjectURL = (...args) => { count += 1; return original(...args); };
          try { document.getElementById('finite-plan-download').dispatchEvent(new MouseEvent('click')); }
          finally { URL.createObjectURL = original; }
          return count;
        }''')
        assert calls == 0

    try:
        page.locator('#nav-planning').click()
        expect(page.locator('#view-planning')).to_be_visible()
        expect(page.locator('#zero-plan-heading').locator('..')).to_contain_text('IID EVALUATION')
        expect(page.locator('#finite-plan-heading').locator('..')).to_contain_text('uniform sample without replacement')
        initial_other_results = [page.locator(f'#{kind}-plan-result').inner_text() for kind in ('pool', 'zero')]
        plan = submit()
        assert plan['plan']['population_panels'] == 100
        assert plan['plan']['minimum_null_failures'] == 10
        assert plan['plan']['attainable_null_failure_fraction'] == '1/10'
        assert plan['plan']['minimum_evaluation_panels'] == 25
        assert plan['plan']['zero_failure_null_bound'] == '0'
        assert plan['plan']['claim_scope'] == 'frozen_residual_finite_population_only'
        assert plan['plan']['future_population_risk_status'] == 'not_established'
        expect(page.locator('#finite-plan-result')).to_contain_text('Frozen residual finite population only')
        expect(page.locator('#finite-plan-result')).to_contain_text('Not computed / no observations')
        exported(plan, 'finite-default.json')
        assert [page.locator(f'#{kind}-plan-result').inner_text() for kind in ('pool', 'zero')] == initial_other_results
        checks.append('finite_planning_fixed_frame_default_25_exact_export_and_separate_iid_forms')

        inputs('3', '1/2', '1/3', '1')
        no_stale_export()
        equality = submit()
        assert equality['plan']['minimum_null_failures'] == 2
        assert equality['plan']['attainable_null_failure_fraction'] == '2/3'
        assert equality['plan']['zero_failure_null_bound'] == '1/3'
        assert equality['plan']['minimum_zero_failure_null_bound'] == '1/3'
        assert equality['plan']['minimum_evaluation_panels'] == 1
        expect(page.locator('#finite-plan-result')).to_contain_text('Smallest attainable null failure fraction')
        exported(equality, 'finite-equality-rounding.json')
        inputs('3', '1/2', '1/3', '0')
        empty = submit()
        assert empty['plan']['zero_failure_null_bound'] == '1'
        assert empty['plan']['minimum_evaluation_panels'] is None
        assert empty['plan']['minimum_zero_failure_null_bound'] is None
        assert empty['plan']['resolution_status'] == 'insufficient_resolution'
        expect(page.locator('#finite-plan-result')).to_contain_text('None within this cap')
        expect(page.locator('#finite-plan-result')).to_contain_text('No qualifying count')
        exported(empty, 'finite-empty-cap.json')
        checks.append('finite_planning_discrete_null_rounding_equality_and_zero_cap_keep_nulls')

        inputs('10', '1/10', '1/20', '9')
        insufficient = submit()
        assert insufficient['plan']['zero_failure_null_bound'] == '1/10'
        assert insufficient['plan']['minimum_evaluation_panels'] is None
        page.locator('#finite-plan-maximum').fill('10')
        census = submit()
        assert census['plan']['minimum_evaluation_panels'] == 10
        assert census['plan']['minimum_zero_failure_null_bound'] == '0'
        expect(page.locator('#finite-plan-result')).to_contain_text('impossible zero-failure sample under the stated finite null')
        inputs('1', '1/2', '1/20', '1')
        single = submit()
        assert single['plan']['minimum_null_failures'] == 1
        assert single['plan']['minimum_evaluation_panels'] == 1
        assert single['plan']['zero_failure_null_bound'] == '0'
        assert single['plan']['observed_evidence_status'] == 'no_observations'
        exported(single, 'finite-single-census.json')
        checks.append('finite_planning_insufficient_cap_full_census_and_singleton_do_not_claim_observations')

        for values in (('0', '1/10', '1/20', '0'), ('3', '1/2', '1/3', '4'),
                       ('3', '1e999999999', '1/3', '1')):
            inputs(*values)
            no_stale_export()
            submit(400)
            expect(page.locator('#finite-plan-status')).to_have_class('notice planning-status error')
            no_stale_export()
        for invalid in ('257', '1.5'):
            inputs(population=invalid)
            before = len(requests)
            page.locator('#finite-plan-submit').click()
            expect(page.locator('#finite-plan-status')).to_contain_text('integers from 0 to 256')
            assert len(requests) == before
            no_stale_export()
        checks.append('finite_planning_invalid_population_cap_exact_input_and_noninteger_clear_exports')

        # Change only delivery timing: both success and failure originate at the server.
        for old_significance in ('1/20', '1'):
            held = []
            page.evaluate('document.documentElement.setAttribute("data-test-held-finite-responses", "0")')
            def hold(route):
                held_routes.append(route)
                held.append((route, route.fetch()))
                page.evaluate('(count) => document.documentElement.setAttribute("data-test-held-finite-responses", String(count))', len(held))
            route_handlers.append(hold)
            page.route(endpoint, hold)
            inputs(significance=old_significance)
            page.locator('#finite-plan-submit').click()
            expect(page.locator('#finite-plan-submit')).to_be_disabled()
            expect(page.locator('html')).to_have_attribute('data-test-held-finite-responses', '1')
            no_stale_export()
            inputs('3', '1/2', '1/3', '1')
            page.locator('#finite-plan-submit').click()
            expect(page.locator('#finite-plan-submit')).to_be_disabled()
            expect(page.locator('html')).to_have_attribute('data-test-held-finite-responses', '2')
            assert len(held) == 2
            newest, newest_response = held[1]
            with page.expect_response(lambda response: response.url.endswith('/api/plan-finite-zero-loss')):
                newest.fulfill(response=newest_response)
            expect(page.locator('#finite-plan-result')).to_be_visible()
            latest = page.locator('#finite-plan-result').inner_text()
            oldest, oldest_response = held[0]
            assert oldest_response.status == (200 if old_significance == '1/20' else 400)
            with page.expect_response(lambda response: response.url.endswith('/api/plan-finite-zero-loss')):
                oldest.fulfill(response=oldest_response)
            assert page.locator('#finite-plan-result').inner_text() == latest
            expect(page.locator('#finite-plan-status')).not_to_have_class('notice planning-status error')
            exported(newest_response.json(), 'finite-latest-' + ('success' if old_significance == '1/20' else 'error') + '.json')
            page.unroute(endpoint, hold)
        checks.append('finite_planning_older_success_and_error_cannot_restore_stale_results')

        # A server-shaped response cannot promote a declared premise into evidence.
        mutations = [
            ('plan', 'adequacy_status', 'established'),
            ('plan', 'power_status', 'computed'),
            ('plan', 'observed_evidence_status', 'verified'),
            ('plan', 'premise_status', 'verified'),
            ('plan', 'future_population_risk_status', 'established'),
            ('plan', 'claim_scope', 'all_future_materials'),
            ('plan', 'sampling_design', 'iid'),
            ('plan', 'null_hypothesis', 'true risk is zero'),
            ('plan', 'physical_guarantee', True),
            ('response', 'physical_guarantee', True),
            ('plan', 'minimum_evaluation_panels', None),
            ('plan', 'zero_failure_null_bound', 0.0),
            ('plan', 'premises', ['Frozen frame', {'guarantee': True}]),
        ]
        for index, (scope, key, value) in enumerate(mutations):
            def forged(route):
                actual = route.fetch()
                body = deepcopy(actual.json())
                (body['plan'] if scope == 'plan' else body)[key] = value
                route.fulfill(response=actual, json=body)
            route_handlers.append(forged)
            page.route(endpoint, forged)
            inputs('3', '1/2', '1/3', '1')
            with page.expect_response(lambda response: response.url.endswith('/api/plan-finite-zero-loss')):
                page.locator('#finite-plan-submit').click()
            expect(page.locator('#finite-plan-status')).to_contain_text('unsupported planning result')
            no_stale_export()
            page.unroute(endpoint, forged)
        checks.append('finite_planning_closed_claim_statuses_and_malformed_response_rejected')

        # Exact fraction text remains whole and does not push a narrow page sideways.
        inputs('256', '71/256', '1/20', '71')
        widest = submit()
        exact = widest['plan']['zero_failure_null_bound']
        assert isinstance(exact, str) and len(exact) == 91 and Fraction(exact) > 0
        expect(page.locator('#finite-plan-result')).to_contain_text(exact)
        exported(widest, 'finite-large-exact.json')
        for suffix in ('population', 'ceiling', 'significance', 'maximum'):
            field = page.locator(f'#finite-plan-{suffix}')
            label = page.locator(f'label[for="finite-plan-{suffix}"]')
            assert label.inner_text().strip()
            help_id = field.get_attribute('aria-describedby')
            assert help_id and page.locator('#' + help_id).inner_text().strip()
            field.focus()
            expect(field).to_be_focused()
        page.locator('#finite-plan-result details').evaluate('(element) => { element.open = true; }')
        page.set_viewport_size({'width': 1440, 'height': 1050})
        page.locator('#finite-plan-heading').scroll_into_view_if_needed()
        page.screenshot(path=str(artifacts / 'finite-desktop.png'), full_page=True)
        for width in (390, 320):
            page.set_viewport_size({'width': width, 'height': 844})
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
            page.locator('#finite-plan-population').focus()
            page.keyboard.press('Tab')
            expect(page.locator('#finite-plan-ceiling')).to_be_focused()
            expect(page.locator('#finite-plan-result')).to_contain_text(exact)
            page.screenshot(path=str(artifacts / f'finite-mobile-{width}.png'), full_page=True)
        checks.append('finite_planning_exact_fraction_keyboard_labels_and_mobile_no_overflow')

        page.locator('#nav-workbench').click()
        expect(page.locator('#view-workbench')).to_be_visible()
        assert page.locator('#problem-json').input_value() == original_raw
        assert all(path == 'plan-finite-zero-loss' for path in requests)
        checks.append('finite_planning_navigation_preserves_problem_and_reads_no_outcomes_or_archives')
    finally:
        for route in held_routes:
            try:
                route.abort()
            except Exception:
                pass  # Already fulfilled routes need no cleanup.
        for handler in route_handlers:
            page.unroute(endpoint, handler)
        page.evaluate('document.documentElement.removeAttribute("data-test-held-finite-responses")')
        page.remove_listener('request', record_request)
        if original_viewport:
            page.set_viewport_size(original_viewport)
    return checks
