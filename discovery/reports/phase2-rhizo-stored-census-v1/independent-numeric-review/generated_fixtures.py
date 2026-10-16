"""Independent schema fixtures; no original numerical labels or author fixtures."""
import copy
import json
from decimal import Decimal
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FRAME_PATH = ROOT / 'reports/phase2-rhizo-reference-readiness-v1/design/reference-frame.json'
READINESS_PATH = ROOT / 'reports/phase2-rhizo-recorded-label-readiness-v1/actual/public.json'
PROPERTIES = ('gamma_100', 'gamma_111', 'vacancy_formation_energy', 'gamma_110')
FRAME_RAW = FRAME_PATH.read_bytes()
READINESS_RAW = READINESS_PATH.read_bytes()
FRAME = json.loads(FRAME_RAW)
READINESS = json.loads(READINESS_RAW)
UNITS = FRAME['units']
MODELS = list(dict.fromkeys(u['model_id'] for u in UNITS))
MATERIALS = list(dict.fromkeys(u['material'] for u in UNITS))


def raw(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')


def numeric(token):
    return {'state': 'VALID_EXACT_JSON_NUMBER', 'serialized_number': token, 'non_numeric_type': None}


def exact(token):
    """Decimal is independent from candidate's integer/scale implementation."""
    numerator, denominator = Decimal(token).as_integer_ratio()
    return Fraction(numerator, denominator)


def parse_integer_chunks(value):
    """Avoid mutating Python's global int-string digit limit for giant results."""
    assert type(value) is str and value
    negative = value.startswith('-')
    digits = value[1:] if negative else value
    assert digits.isascii() and digits.isdigit()
    assert digits == '0' or not digits.startswith('0')
    assert not (negative and digits == '0')
    result = 0
    for start in range(0, len(digits), 9):
        piece = digits[start:start + 9]
        result = result * 10 ** len(piece) + int(piece)
    return -result if negative else result


def rational(value):
    assert set(value) == {'numerator', 'denominator'}
    n = parse_integer_chunks(value['numerator'])
    d = parse_integer_chunks(value['denominator'])
    assert d > 0
    result = Fraction(n, d)
    assert (result.numerator, result.denominator) == (n, d)
    return result


def fixture():
    projection = {'schema': 'lupine.rhizo.private-recorded-labels.v1',
                  'warning': 'EXPOSED_HISTORICAL_NUMERICAL_LABELS_AND_CITATIONS_NO_FRESH_HOLDOUT',
                  'actual_reference_choice': 'UNKNOWN', 'scientific_status': 'NOT_ADMITTED', 'units': []}
    references = [('0', '-0', '0e+2', '-0.000'),
                  ('1.25', '125e-2', '0.125e1', '1.2500'),
                  ('3', '3', '3', '3.000001'),
                  ('-1', '-1', '-1', '-1')]
    predictions = ('0.1', '-1.25', '123e-2', '-0.000', '1e+25', '-0.000000000000000001',
                   '9007199254740993', '9.99999999999999999', '-7e-14')
    for unit_index, u in enumerate(UNITS):
        mi = MATERIALS.index(u['material'])
        model = MODELS.index(u['model_id'])
        unit = {'unit_id': u['unit_id'], 'source_path': 'data/y_matrix_runs/bound/' + u['unit_id'] + '.evidence.json',
                'declared_inputs_sha256': format(unit_index + 1, '064x'), 'positions': []}
        for pi, prop in enumerate(PROPERTIES):
            literal_unit = 'eV' if prop == 'vacancy_formation_energy' else 'J/m^2'
            ref = references[(mi + pi) % 4][model]
            pred = predictions[(mi + 2 * model + pi) % len(predictions)]
            citation = 'GENERATED_CITATION_DO_NOT_PUBLIC__' + str(mi) + '__' + str(pi)
            if (mi + pi) % 2:
                citation += '__' + str(model)
            record = {'property_array_ordinal': pi,
                      'unit': {'state': 'MATCH', 'literal': literal_unit},
                      'value': numeric(pred), 'reference_value': numeric(ref),
                      'reference_source': {'state': 'NONEMPTY_STRING', 'literal': citation},
                      'tolerance': {'state': 'NULL', 'serialized_number': None, 'non_numeric_type': None}}
            unit['positions'].append({'unit_id': u['unit_id'], 'property': prop, 'record_state': 'SINGLE',
                                      'records': [record], 'actual_reference_choice': 'UNKNOWN'})
        projection['units'].append(unit)
    return projection


def expected(projection):
    by_id = {u['unit_id']: u for u in UNITS}
    groups = {}
    reference_groups = {}
    positions = {}
    for unit in projection['units']:
        context = by_id[unit['unit_id']]
        for position in unit['positions']:
            prop = position['property']
            record = position['records'][0]
            literal_unit = record['unit']['literal']
            key = (context['model_id'], prop, literal_unit)
            error = exact(record['value']['serialized_number']) - exact(record['reference_value']['serialized_number'])
            groups.setdefault(key, []).append(error)
            positions[(unit['unit_id'], prop)] = (error, abs(error), error * error)
            key_ref = (context['material'], context['structure'], prop, literal_unit)
            reference_groups.setdefault(key_ref, []).append((context['model_id'],
                exact(record['reference_value']['serialized_number']),
                record['reference_value']['serialized_number'], record['reference_source']['literal']))
    summary = {}
    for key, values in groups.items():
        n = len(values)
        signed = sum(values, Fraction())
        absolute = sum(map(abs, values), Fraction())
        squared = sum((v * v for v in values), Fraction())
        summary[key] = {'count': n, 'sum_signed_discrepancy': signed, 'sum_absolute_discrepancy': absolute,
                        'sum_squared_discrepancy': squared, 'mean_signed_discrepancy': signed / n,
                        'mean_absolute_discrepancy': absolute / n, 'mean_squared_discrepancy': squared / n}
    equalities = {key: {'models': [r[0] for r in rows], 'rational': len({r[1] for r in rows}) == 1,
                        'token': len({r[2] for r in rows}) == 1, 'citation': len({r[3] for r in rows}) == 1}
                  for key, rows in reference_groups.items()}
    return summary, equalities, positions
