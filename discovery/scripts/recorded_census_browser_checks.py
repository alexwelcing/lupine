"""Public stored-label rendering and generated browser controls; no source readers.

The fixed public aggregate is checked for transport/display identity only. The
independent Fraction oracle checks presentation rounding of generated values.
All synthetic controls are transient and the original view/data are restored.
"""
from copy import deepcopy
from fractions import Fraction
from hashlib import sha256
from importlib.resources import files
import json
from pathlib import Path
import re

from playwright.sync_api import expect

PUBLIC_CENSUS_SHA256 = 'a9ab9d72c6c39be9338e951b657e0587ae8f4dbe534b276b8f8f8951a7b1a63a'


def dec(n):
    if n == 0:
        return '0'
    sign = '-' if n < 0 else ''
    n = abs(n)
    chunks = []
    while n:
        n, r = divmod(n, 10 ** 9)
        chunks.append(r)
    return sign + str(chunks[-1]) + ''.join((f'{v:09d}' for v in reversed(chunks[:-1])))

def rational(x):
    return {'numerator': dec(x.numerator), 'denominator': dec(x.denominator)}

def text(x):
    return x['numerator'] if x['denominator'] == '1' else x['numerator'] + '/' + x['denominator']

def fixture():
    models = ['fixture-D', 'fixture-B', 'fixture-A', 'fixture-C']
    properties = [('fixture-surface-1', 'J/m^2'), ('fixture-vacancy-2', 'eV'), ('fixture-surface-2', 'J/m^2'), ('fixture-vacancy-1', 'eV')]
    groups = []
    for mi, model in enumerate(models):
        for pi, (prop, unit) in enumerate(properties):
            values = [Fraction((mi + 1) * (pi + 2) * (j - 5), 7) for j in range(9)]
            g = {'model_id': model, 'property': prop, 'unit': unit, 'squared_unit': 'eV^2' if unit == 'eV' else '(J/m^2)^2', 'count': 9, 'fixed_position_weight': 1, 'unit_ids': [f'generated-{mi}-{j}' for j in range(9)], 'metric_interpretation': 'STORED_LABEL_DISCREPANCIES'}
            for metric, seq in [('signed', values), ('absolute', [abs(x) for x in values]), ('squared', [x * x for x in values])]:
                total = sum(seq, Fraction(0))
                g['sum_' + metric + '_discrepancy'] = rational(total)
                g['mean_' + metric + '_discrepancy'] = rational(total / 9)
            groups.append(g)
    refs = []
    for j in range(9):
        for pi, (prop, unit) in enumerate(properties):
            equal = (j + pi) % 3 != 0
            refs.append({'material': f'fixture-material-{j}', 'structure': 'fixture-structure', 'property': prop, 'unit': unit, 'model_ids': list(reversed(models)), 'count': 4, 'stored_reference_equality': 'ALL_STORED_REFERENCES_EQUAL' if equal else 'STORED_REFERENCES_DIFFER', 'token_spellings_equal': equal and (j + pi) % 2 == 0, 'citation_literals_equal': (j + pi) % 4 == 0, 'actual_reference_choice': 'UNKNOWN', 'common_physical_truth_established': False})
    return {'schema': 'lupine.rhizo.fixed-stored-census.v1', 'status': 'DESCRIPTIVE_CENSUS_COMPLETE', 'reason': 'ALL_FIXED_STORED_DISCREPANCIES_COMPUTED', 'synthetic': True, 'scientific_status': 'NOT_ADMITTED', 'actual_reference_choice': 'UNKNOWN', 'metric_interpretation': 'EXACT_DESCRIPTIVE_STORED_LABEL_DISCREPANCIES_NOT_PHYSICAL_ERROR_ESTIMATES', 'sign_convention': 'STORED_PREDICTION_MINUS_STORED_REFERENCE', 'fixed_position_weight': 1, 'model_ranking_or_winner': None, 'reference_choice_reconstructed': False, 'binder_executed': False, 'reference_or_bound_objects_read': False, 'tolerance_success_criterion': None, 'counts': {'fixed_ids': 36, 'fixed_positions': 144, 'groups': 16, 'reference_equality_groups': 36, 'candidate_reference_edges': 172}, 'groups': groups, 'reference_equality': refs, 'output_error': None, 'exposure': {'fresh_holdout_claim': False}}

def integer(value):
    negative = value.startswith('-')
    text = value[1:] if negative else value
    n = 0
    for at in range(0, len(text), 9):
        chunk = text[at:at + 9]
        n = n * 10 ** len(chunk) + int(chunk)
    return -n if negative else n

def rounded_four(numerator, denominator):
    """Nearest four significant digits, ties away from zero; no floating point.

    Return signed coefficient and scientific exponent. Nonzero coefficient has
    four digits. It represents coefficient * 10**(exponent - 3).
    """
    n, d = (integer(numerator), integer(denominator))
    assert d > 0
    if n == 0:
        return {'coefficient': 0, 'exponent': 0}
    sign = -1 if n < 0 else 1
    n = abs(n)
    exponent = len(numerator.lstrip('-')) - len(denominator)
    power = Fraction(10 ** exponent) if exponent >= 0 else Fraction(1, 10 ** (-exponent))
    value = Fraction(n, d)
    if value < power:
        exponent -= 1
    scale = 3 - exponent
    scaled = value * 10 ** scale if scale >= 0 else value / 10 ** (-scale)
    floor = scaled.numerator // scaled.denominator
    rounded = floor + (scaled - floor >= Fraction(1, 2))
    if rounded == 10000:
        rounded = 1000
        exponent += 1
    assert 1000 <= rounded <= 9999
    return {'coefficient': sign * rounded, 'exponent': exponent}

def cases():
    triples = [('zero', '0', '1'), ('one', '1', '1'), ('third', '1', '3'), ('negative_third', '-1', '3'), ('below_half', '12344999', '1000000'), ('exact_half', '2469', '200'), ('negative_exact_half', '-2469', '200'), ('above_half', '12345001', '1000000'), ('below_carry', '99994', '10000'), ('exact_carry', '19999', '2000'), ('negative_carry', '-19999', '2000'), ('tiny_carry', '19999', '200000000'), ('negative_tiny_carry', '-19999', '200000000'), ('tiny_exact', '1', '1' + '0' * 2499), ('negative_tiny_exact', '-1', '1' + '0' * 2499), ('huge_exact', '1' + '0' * 4999, '1'), ('negative_huge_exact', '-1' + '0' * 4999, '1'), ('huge_rounding_carry', '9' * 5000, '1'), ('both_digit_caps', '1' + '0' * 4999, '9' * 2500), ('ordinary_close_to_zero', '-1', '20000'), ('fixed_lower_boundary', '1', '1000'), ('scientific_lower_boundary', '1', '10000'), ('fixed_upper_boundary', '9999', '1'), ('scientific_upper_boundary', '10000', '1'), ('carry_into_fixed_lower_boundary', '19999', '20000000'), ('carry_into_scientific_upper_boundary', '19999', '2')]
    return [{'name': name, 'numerator': n, 'denominator': d, 'expected': rounded_four(n, d)} for name, n, d in triples]

def check_shown(shown, expected):
    coefficient, exponent = (expected['coefficient'], expected['exponent'])
    if coefficient == 0:
        assert shown == '0'
        return
    assert shown.startswith('≈ '), shown
    lexical = shown[2:]
    match = re.fullmatch('(-?)([0-9]+)(?:\\.([0-9]+))?(?:e(-?[0-9]+))?', lexical)
    assert match and len(shown) <= 24, shown
    sign, whole, fraction, power = match.groups()
    fraction = fraction or ''
    power = int(power or '0')
    n = int(whole + fraction) * (-1 if sign else 1)
    scale = power - len(fraction)
    observed = Fraction(n * 10 ** scale) if scale >= 0 else Fraction(n, 10 ** (-scale))
    expected_value = Fraction(coefficient * 10 ** (exponent - 3)) if exponent >= 3 else Fraction(coefficient, 10 ** (3 - exponent))
    assert observed == expected_value, (shown, expected)
    assert ('e' in lexical) == (exponent < -3 or exponent > 3), (shown, expected)
    if '.' in lexical.split('e')[0]:
        assert not lexical.split('e')[0].endswith('0'), shown


def _check_tables(page, report):
    """Compare every displayed exact token/ID/unit to its supplied public object."""
    groups = sorted(report['groups'], key=lambda g: (g['model_id'], g['property'], g['unit']))
    for kind in ('mean', 'sum'):
        table = '#recorded-census-' + ('means' if kind == 'mean' else 'sums')
        rows = page.locator(table + ' tbody tr').evaluate_all('''rows => rows.map(row => ({
          cells: [...row.children].map(cell => cell.textContent),
          values: [...row.querySelectorAll('details.recorded-census-exact')].map(d => ({
            shown:d.querySelector('summary').textContent, exact:d.querySelector('code').textContent
          }))
        }))''')
        assert len(rows) == 16
        for group, row in zip(groups, rows):
            assert row['cells'][0] == group['model_id'] + ' / ' + group['property']
            unit_at, squared_at = (4, 6) if kind == 'mean' else (3, 5)
            assert row['cells'][unit_at] == group['unit']
            assert row['cells'][squared_at] == group['squared_unit']
            if kind == 'mean':
                assert row['cells'][1] == '9'
            else:
                assert row['cells'][6] == ', '.join(group['unit_ids'])
            assert len(row['values']) == 3
            for metric, cell in zip(('signed', 'absolute', 'squared'), row['values']):
                value = group[kind + '_' + metric + '_discrepancy']
                assert cell['exact'] == text(value)
                check_shown(cell['shown'], rounded_four(value['numerator'], value['denominator']))
    refs = sorted(report['reference_equality'], key=lambda r: (r['material'], r['structure'], r['property'], r['unit']))
    rows = page.locator('#recorded-census-references tbody tr').evaluate_all(
        'rows => rows.map(row => [...row.children].map(cell => cell.textContent))')
    assert len(rows) == 36
    for ref, row in zip(refs, rows):
        assert row == [
            ' / '.join(ref[key] for key in ('material', 'structure', 'property')),
            ref['unit'], ', '.join(ref['model_ids']),
            'Equal' if ref['stored_reference_equality'] == 'ALL_STORED_REFERENCES_EQUAL' else 'Different',
            'Equal' if ref['token_spellings_equal'] else 'Different',
            'Equal' if ref['citation_literals_equal'] else 'Different',
        ]


def check_recorded_census_workbench(page, artifacts):
    """Run a bounded real-browser regression and restore the caller's view/state."""
    artifacts = Path(artifacts)
    artifacts.mkdir(parents=True, exist_ok=True)
    checks = []
    original_viewport = page.viewport_size
    original_nav = page.locator('nav [aria-current="page"]').get_attribute('id')
    original_scroll = page.evaluate('() => ({x:scrollX, y:scrollY})')
    original_focus = page.evaluate('() => document.activeElement?.id || null')
    original_problem = page.locator('#problem-json').input_value()
    actual = None

    def render(value):
        page.evaluate('(report) => window.LupineRecordedCensus.render(report)', value)

    def export(report, filename):
        with page.expect_download() as pending:
            page.locator('#download-recorded-census').click()
        assert pending.value.suggested_filename == 'lupine-recorded-label-census.json'
        destination = artifacts / filename
        pending.value.save_as(destination)
        # No numeric coercion: complete exact rational strings survive unchanged.
        assert destination.read_text(encoding='utf-8') == json.dumps(report, indent=2, ensure_ascii=False) + '\n'

    def invalidate(old_report, replacement):
        render(old_report)
        calls = page.evaluate('''replacement => {
          const old = document.getElementById('download-recorded-census');
          const original = URL.createObjectURL;
          let calls = 0;
          URL.createObjectURL = (...args) => { calls++; return original(...args); };
          try { window.LupineRecordedCensus.render(replacement); old.click(); }
          finally { URL.createObjectURL = original; }
          return calls;
        }''', replacement)
        assert calls == 0

    try:
        raw = files('lupine_discovery').joinpath('resources/recorded-census-v1.json').read_bytes()
        assert sha256(raw).hexdigest() == PUBLIC_CENSUS_SHA256
        response = page.request.get(page.url.split('#')[0].rstrip('/') + '/api/benchmarks')
        assert response.status == 200
        actual = response.json()['recorded_census']
        assert actual == json.loads(raw)
        assert actual['synthetic'] is False and actual['model_ranking_or_winner'] is None
        page.locator('#nav-benchmarks').click()
        expect(page.locator('#view-benchmarks')).to_be_visible()
        expect(page.locator('#recorded-census-content')).to_be_visible()
        expect(page.locator('#recorded-census-verdict')).to_contain_text('scientific screening NOT ADMITTED')
        _check_tables(page, actual)
        export(actual, 'recorded-census-public-export.json')
        checks.append('recorded_census_real_http_fixed_public_resource_all_rows_and_exact_export')

        generated = fixture()
        render(generated)
        _check_tables(page, generated)
        content = page.locator('#recorded-census-content')
        for phrase in ('SYNTHETIC CONTROL', 'not independent experiments', 'no model winner is selected',
                       'No decision uses the rounded display', 'Historical reference choice remains UNKNOWN'):
            expect(content).to_contain_text(phrase)
        checks.append('recorded_census_generated_counts_units_sums_ids_and_distinct_reference_flags')

        target = sorted(generated['groups'], key=lambda g: (g['model_id'], g['property'], g['unit'])).index(generated['groups'][0])
        observations = []
        control_cases = cases()
        anchors = {'zero': (0, 0), 'third': (3333, -1), 'exact_half': (1235, 1),
                   'negative_exact_half': (-1235, 1), 'exact_carry': (1000, 1),
                   'tiny_carry': (1000, -4), 'carry_into_fixed_lower_boundary': (1000, -3),
                   'carry_into_scientific_upper_boundary': (1000, 4)}
        for case in control_cases:
            if case['name'] in anchors:
                assert (case['expected']['coefficient'], case['expected']['exponent']) == anchors[case['name']]
            report = deepcopy(generated)
            value = {key: case[key] for key in ('numerator', 'denominator')}
            report['groups'][0]['mean_signed_discrepancy'] = value
            render(report)
            expect(content).to_be_visible()
            cell = page.locator('#recorded-census-means tbody tr').nth(target).locator('details.recorded-census-exact').first
            shown = cell.locator('summary').text_content()
            check_shown(shown, case['expected'])
            assert cell.locator('code').text_content() == text(value)
            observations.append({'case': case['name'], 'shown': shown, 'oracle': case['expected']})
        (artifacts / 'generated-rounding-observations.json').write_text(json.dumps(observations, indent=2) + '\n', encoding='utf-8')
        large = deepcopy(generated)
        large['groups'][0]['mean_signed_discrepancy'] = {'numerator': '-1' + '0' * 4999, 'denominator': '9' * 2500}
        render(large)
        expect(content).to_be_visible()
        export(large, 'recorded-census-generated-large-export.json')
        checks.append('recorded_census_26_exact_fraction_rounding_controls_and_large_exact_export')

        variants = [None, {}, dict(generated, status='BLOCKED')]
        for field, value in (('numerator', '1' + '0' * 5000), ('denominator', '0'),
                             ('denominator', '1' + '0' * 2500), ('numerator', '01')):
            invalid = deepcopy(generated)
            invalid['groups'][0]['mean_signed_discrepancy'][field] = value
            variants.append(invalid)
        invalid = deepcopy(generated)
        invalid['groups'][0]['mean_absolute_discrepancy']['numerator'] = '-1'
        variants.append(invalid)
        invalid = deepcopy(generated)
        invalid['groups'][0]['squared_unit'] = invalid['groups'][0]['unit']
        variants.append(invalid)
        for invalid in variants:
            invalidate(generated, invalid)
            expect(content).to_be_hidden()
            assert page.locator('#download-recorded-census').count() == 0
            expect(page.locator('#recorded-census-status')).to_contain_text(
                'No stored-label census is bundled' if invalid is None else 'blocked, incomplete or unsupported')
        invalidate(generated, deepcopy(generated))
        expect(content).to_be_visible()
        checks.append('recorded_census_rejects_missing_blocked_malformed_caps_and_stale_detached_downloads')

        malicious = deepcopy(generated)
        literal = '<img src="/census-canary-never-fetch" onerror="window.censusCanary=1">'
        old = malicious['groups'][0]['property']
        for group in malicious['groups']:
            if group['property'] == old:
                group['property'] = literal
        for ref in malicious['reference_equality']:
            if ref['property'] == old:
                ref['property'] = literal
        render(malicious)
        expect(content).to_be_visible()
        expect(content).to_contain_text(literal)
        assert content.locator('img, script, iframe').count() == 0
        assert page.evaluate('() => window.censusCanary === undefined')
        checks.append('recorded_census_generated_untrusted_text_is_literal')

        render(large)
        summary = page.locator('#recorded-census-means tbody tr').nth(target).locator('details.recorded-census-exact summary').first
        summary.focus()
        expect(summary).to_be_focused()
        page.keyboard.press('Enter')
        expect(summary.locator('..').locator('code')).to_be_visible()
        sums_summary = content.locator('details.protocol-details > summary').filter(has_text='All exact sums')
        sums_summary.focus()
        page.keyboard.press('Enter')
        region = page.locator('#recorded-census-sums')
        expect(region).to_be_visible()
        assert region.get_attribute('tabindex') == '0' and region.get_attribute('role') == 'region'
        region.focus()
        expect(region).to_be_focused()
        assert region.get_attribute('aria-label')
        assert region.locator('th[scope="col"]').count() == 7
        assert region.locator('tbody th[scope="row"]').count() == 16
        page.screenshot(path=str(artifacts / 'recorded-census-desktop-generated.png'), full_page=False)
        for width in (390, 320):
            page.set_viewport_size({'width': width, 'height': 844})
            assert page.evaluate('() => document.documentElement.scrollWidth <= innerWidth + 1')
            dimensions = summary.locator('..').locator('code').evaluate('''code => ({
                width:code.getBoundingClientRect().width, wrap:getComputedStyle(code).overflowWrap
            })''')
            assert dimensions['width'] <= 240.5 and dimensions['wrap'] == 'anywhere'
            assert region.evaluate('region => region.scrollWidth > region.clientWidth')
            page.screenshot(path=str(artifacts / f'recorded-census-mobile-{width}-generated.png'), full_page=False)
        checks.append('recorded_census_keyboard_exact_disclosure_accessible_tables_and_mobile_containment')
    finally:
        if actual is not None:
            render(actual)
        if original_viewport:
            page.set_viewport_size(original_viewport)
        if original_nav:
            page.locator('#' + original_nav).click()
        if original_focus:
            page.evaluate('id => document.getElementById(id)?.focus({preventScroll:true})', original_focus)
        page.evaluate('position => scrollTo(position.x, position.y)', original_scroll)
        assert page.locator('#problem-json').input_value() == original_problem
    checks.append('recorded_census_restores_public_report_workbench_problem_view_and_viewport')
    return checks
