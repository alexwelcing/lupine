"""Unchanged independent generated fixture functions from the completed v2 review."""
from fractions import Fraction

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
