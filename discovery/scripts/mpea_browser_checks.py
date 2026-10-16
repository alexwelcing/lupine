"""Constructed aggregate-report browser controls; never executes an archive study."""
from copy import deepcopy
from hashlib import sha256
import json
from pathlib import Path

from playwright.sync_api import expect


def check_mpea_workbench(page, artifacts, fixtures, original_report=None):
    fixtures, artifacts = Path(fixtures), Path(artifacts)
    artifacts.mkdir(parents=True, exist_ok=True)
    reports = {name: json.loads((fixtures / (name + '.json')).read_bytes()) for name in (
        'complete-negative', 'complete-positive', 'unknown-empty-null-gates',
        'insufficient-development', 'registration-unavailable')}
    if any(report['execution_kind'] != 'synthetic_fixture' for report in reports.values()):
        raise AssertionError('UI controls must be explicitly constructed, never archival outcomes')
    checks = []
    render = lambda report: page.evaluate('report => window.LupineMpea.render(report)', report)

    render(None)
    expect(page.locator('#mpea-status')).to_contain_text('No measured outcome')
    expect(page.locator('#mpea-content')).to_be_hidden()
    checks.append('mpea_absent_report_never_displays_a_verdict')

    negative = reports['complete-negative']
    render(negative)
    expect(page.locator('#mpea-content')).to_be_visible()
    expect(page.locator('#mpea-content')).to_contain_text('SYNTHETIC CONTROL')
    expect(page.locator('#mpea-verdict')).to_have_attribute('data-status', 'NO_GO_ARCHIVAL_USEFULNESS')
    for name, value in negative['payload']['component_verdicts'].items():
        expect(page.locator(f'[data-mpea-gate="{name}"] .gate-status')).to_have_text(
            'UNAVAILABLE' if value is None else 'PASS' if value else 'FAIL')
    for population in ('primary', 'secondary'):
        section = page.locator(f'[data-mpea-population="{population}"]')
        expect(section.locator('tbody tr')).to_have_count(48)
        for policy in ('primary', 'stopped', 'processing', 'objective_only', *(f'random_{n}' for n in range(20))):
            rows = section.locator(f'tr[data-mpea-policy="{policy}"]')
            expect(rows).to_have_count(2)
            for cap in (0, 1, 2, 4, 8, 16, 32):
                expect(rows.first.locator(f'[data-mpea-budget="{cap}"]')).to_have_count(1)
        expect(section).to_contain_text('all 20 evaluation panels together')
    checks.append('mpea_synthetic_no_go_all_960_schedules_all_policies_caps_and_same_cost_views')

    for population in ('primary', 'secondary'):
        section = page.locator(f'[data-mpea-population="{population}"]')
        section.locator('select').select_option('observed_feasible_panels')
        metric = negative['payload']['policy_metrics'][population]['primary']['budget_snapshots'][3]['metrics']['observed_feasible_panels']
        cell = section.locator('tr[data-mpea-policy="primary"]').first.locator('[data-mpea-budget="4"]')
        if metric['any_optimum_hit']['rate'] is None:
            expect(cell).to_contain_text('Unavailable')
        else:
            expect(cell).to_contain_text(f"{metric['any_optimum_hit']['success_count']} / {metric['any_optimum_hit']['known_count']} known")
        expect(cell).to_contain_text(f"Bundle requests: {metric['actual_bundle_cost']['sum']}")
    checks.append('mpea_denominator_switch_uses_reported_subset_and_actual_cost')

    with page.expect_download() as event:
        page.locator('#download-mpea').click()
    path = artifacts / 'synthetic-negative-export.json'
    event.value.save_as(path)
    assert json.loads(path.read_bytes()) == negative
    checks.append('mpea_download_matches_entire_displayed_aggregate_report')

    render(reports['complete-positive'])
    expect(page.locator('#mpea-verdict')).to_have_attribute('data-status', 'GO_DESIGN_INDEPENDENT_STUDY')
    expect(page.locator('#mpea-content')).to_contain_text('SYNTHETIC CONTROL')
    expect(page.locator('#mpea-content')).to_contain_text('Physical performance and deployment remain unqualified')
    checks.append('mpea_constructed_positive_supports_only_further_independent_study')

    unknown = reports['unknown-empty-null-gates']
    render(unknown)
    for key in ('pool_usefulness', 'ranking_usefulness'):
        assert unknown['payload']['component_verdicts'][key] is None
        expect(page.locator(f'[data-mpea-gate="{key}"] .gate-status')).to_have_text('UNAVAILABLE')
    expect(page.locator('[data-mpea-population="primary"]')).to_contain_text('unsupported')
    expect(page.locator('[data-mpea-population="secondary"]')).to_contain_text('Unavailable')
    assert '[object Object]' not in page.locator('#mpea-content').inner_text()
    checks.append('mpea_unknown_primary_and_empty_secondary_cannot_become_component_passes')

    for name in ('insufficient-development', 'registration-unavailable'):
        report = reports[name]; render(report)
        expect(page.locator('#mpea-content')).to_be_visible()
        expect(page.locator('#mpea-verdict')).to_have_attribute('data-status', report['status'])
        expect(page.locator('#mpea-content')).to_contain_text('No overall performance verdict')
        expect(page.locator('[data-mpea-population]')).to_have_count(0)
        expect(page.locator('#mpea-gates')).to_have_count(0)
        access = page.locator('#mpea-access')
        access.locator('..').locator('summary').click()
        expect(access).to_contain_text(str(report['access']['counts']['mixed_source_bytes']))
        if name == 'insufficient-development':
            expect(access).to_contain_text('49')
            expect(access).to_contain_text('Unavailable')
    checks.append('mpea_inadequate_and_pre_registration_stops_withhold_all_performance_gates')

    tampered = deepcopy(negative)
    tampered['payload']['policy_metrics']['primary']['primary']['budget_snapshots'] = []
    for broken in ({}, {**negative, 'schema': 'unrecognized'}, tampered,
                   {**reports['registration-unavailable'], 'status': 'COMPLETE'}):
        render(broken)
        expect(page.locator('#mpea-content')).to_be_hidden()
        expect(page.locator('#mpea-content')).to_be_empty()
        expect(page.locator('#mpea-status')).to_contain_text('unsupported or incomplete structure')
    checks.append('mpea_malformed_results_clear_stale_tables_and_exports')

    xss = deepcopy(negative)
    xss['payload']['scope']['population'] = '<img src=x onerror="window.mpeaInjected=true">'
    render(xss)
    assert page.locator('#mpea-content img').count() == 0
    assert page.evaluate('window.mpeaInjected === undefined')
    page.locator('#mpea-provenance').locator('..').locator('summary').click()
    assert '<img src=x' in page.locator('#mpea-provenance').inner_text()
    checks.append('mpea_report_text_is_never_executable_html')

    original_viewport = page.viewport_size
    for width in (320, 390):
        page.set_viewport_size({'width': width, 'height': 844})
        render(negative)
        page.evaluate("document.querySelectorAll('#mpea-content details').forEach(item => { item.open = true; })")
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
    page.locator('#mpea-section').screenshot(path=str(artifacts / 'synthetic-mobile.png'))
    page.set_viewport_size(original_viewport)
    checks.append('mpea_narrow_layout_keeps_policy_tables_in_scroll_regions')
    render(original_report)
    return {'checks': checks, 'fixture_sha256': {name: sha256((fixtures / (name+'.json')).read_bytes()).hexdigest() for name in reports}}
