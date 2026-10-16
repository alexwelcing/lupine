"""Fixed historical stored-label discrepancies; no source selection or science admission."""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
import re
import stat
from fractions import Fraction

FRAME_PATH = 'reports/phase2-rhizo-reference-readiness-v1/design/reference-frame.json'
FRAME_SHA = '80a1aca0fd56d89f49ff5f0e4b3930405f11ae1cd4acea14b8edab2381940aa4'
READINESS_PATH = 'reports/phase2-rhizo-recorded-label-readiness-v1/actual/public.json'
READINESS_SHA = 'b444e7d33cb18619942c2dfbb5cd3374fd9cd9adee6732825ce20ed431641a33'
CONTRACT_SHA = 'e849d36004f0e73fdde22620bbffe06d1e53425907ca5fce974c536a5e1ea052'
ACTUAL_PROJECTION = '.cache/phase2-rhizo-recorded-label-candidate-v1/actual/private.json'
LANE = '.cache/phase2-rhizo-census-candidate-v1'
PROPERTIES = ('gamma_100', 'gamma_111', 'vacancy_formation_energy', 'gamma_110')
MAX_DEPTH, MAX_NODES, MAX_STRING = 32, 50000, 16384
MAX_INPUT, MAX_PRIVATE, MAX_PUBLIC = 4194304, 8388608, 1048576
MAX_MANTISSA_DIGITS, MAX_EXPONENT, MAX_SCALE = 128, 1024, 1024
NUMBER = re.compile(r'-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?')
ERRORS = frozenset(('FRAME_IDENTITY', 'READINESS_IDENTITY', 'FRAME_LAYOUT', 'INPUT_TYPE',
 'INPUT_LIMIT', 'JSON_UTF8', 'JSON_SYNTAX', 'JSON_DUPLICATE_KEY', 'JSON_DEPTH_LIMIT',
 'JSON_NODE_LIMIT', 'JSON_STRING_LIMIT', 'JSON_SURROGATE', 'PROJECTION_SCHEMA',
 'FRAME_INCOMPLETE_OR_DUPLICATE', 'CONTEXT_MISMATCH', 'RECORD_LAYOUT', 'UNIT_MISMATCH',
 'NUMBER_INVALID', 'NUMBER_LIMIT', 'CITATION_INVALID', 'TOLERANCE_MISMATCH',
 'ORDINAL_INVALID', 'PROVENANCE_INVALID', 'ARITHMETIC_OUTPUT_LIMIT', 'OUTPUT_LIMIT',
 'SOURCE_PATH', 'SOURCE_READ', 'SOURCE_IDENTITY', 'SOURCE_BINDING', 'SOURCE_CONTEXT_CHANGED',
 'ACTUAL_INPUT_FORBIDDEN', 'OUTPUT_RESERVATION', 'OUTPUT_WRITE', 'UNEXPECTED_FAILURE'))

class CensusError(Exception):
    pass


def fail(reason):
    raise CensusError(reason)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True,
                       allow_nan=False) + '\n').encode('ascii')


class ExactJSONNumber:
    __slots__ = ('token',)
    def __init__(self, token):
        self.token = token

class BoundedJSON:
    """Single bounded grammar pass; number tokens stay exact and are never floated."""
    def __init__(self, raw):
        try:
            self.text = raw.decode('utf-8', errors='strict')
        except UnicodeError:
            fail('JSON_UTF8')
        self.i = 0
        self.nodes = 0

    def whitespace(self):
        while self.i < len(self.text) and self.text[self.i] in ' \t\r\n':
            self.i += 1

    def node(self):
        self.nodes += 1
        if self.nodes > MAX_NODES:
            fail('JSON_NODE_LIMIT')

    def string(self):
        try:
            value, self.i = json.decoder.scanstring(self.text, self.i + 1, True)
        except (ValueError, UnicodeError):
            fail('JSON_SYNTAX')
        if len(value) > MAX_STRING:
            fail('JSON_STRING_LIMIT')
        if any(0xD800 <= ord(char) <= 0xDFFF for char in value):
            fail('JSON_SURROGATE')
        return value

    def value(self, depth=1):
        if depth > MAX_DEPTH:
            fail('JSON_DEPTH_LIMIT')
        self.node()
        self.whitespace()
        if self.i >= len(self.text):
            fail('JSON_SYNTAX')
        ch = self.text[self.i]
        if ch == '"':
            return self.string()
        if ch in '{[':
            self.i += 1
            result = {} if ch == '{' else []
            close = '}' if ch == '{' else ']'
            self.whitespace()
            if self.i < len(self.text) and self.text[self.i] == close:
                self.i += 1
                return result
            while True:
                if ch == '{':
                    self.whitespace()
                    if self.i >= len(self.text) or self.text[self.i] != '"':
                        fail('JSON_SYNTAX')
                    self.node()
                    key = self.string()
                    if key in result:
                        fail('JSON_DUPLICATE_KEY')
                    self.whitespace()
                    if self.i >= len(self.text) or self.text[self.i] != ':':
                        fail('JSON_SYNTAX')
                    self.i += 1
                    result[key] = self.value(depth + 1)
                else:
                    result.append(self.value(depth + 1))
                self.whitespace()
                if self.i >= len(self.text):
                    fail('JSON_SYNTAX')
                delimiter = self.text[self.i]
                self.i += 1
                if delimiter == close:
                    return result
                if delimiter != ',':
                    fail('JSON_SYNTAX')
        for token, value in (('true', True), ('false', False), ('null', None)):
            if self.text.startswith(token, self.i):
                self.i += len(token)
                return value
        match = NUMBER.match(self.text, self.i)
        if match:
            self.i = match.end()
            return ExactJSONNumber(match.group())
        fail('JSON_SYNTAX')

    def parse(self):
        value = self.value()
        self.whitespace()
        if self.i != len(self.text):
            fail('JSON_SYNTAX')
        return value


def _keys(value, names, reason):
    if type(value) is not dict or set(value) != set(names):
        fail(reason)


def _context(frame_raw, readiness_raw):
    if type(frame_raw) is not bytes or sha(frame_raw) != FRAME_SHA:
        fail('FRAME_IDENTITY')
    if type(readiness_raw) is not bytes or sha(readiness_raw) != READINESS_SHA:
        fail('READINESS_IDENTITY')
    frame, readiness = json.loads(frame_raw), json.loads(readiness_raw)
    units = {u['unit_id']: u for u in frame['units']}
    positions = {(p['unit_id'], p['property']): p for p in readiness['positions']}
    if (len(units) != 36 or len(positions) != 144
            or set(positions) != {(u, p) for u in units for p in PROPERTIES}
            or readiness['all_144_pairs_complete'] is not True
            or readiness['candidate_context']['units'] != frame['units']):
        fail('FRAME_LAYOUT')
    return frame, units, positions


def _token_fraction(token):
    if type(token) is not str or len(token) > MAX_STRING or NUMBER.fullmatch(token) is None:
        fail('NUMBER_INVALID')
    mantissa, _, exponent_text = token.lower().partition('e')
    unsigned = mantissa.lstrip('-')
    digits = unsigned.replace('.', '')
    fractional = len(unsigned.partition('.')[2])
    exp_digits = exponent_text.lstrip('+-').lstrip('0') or '0'
    if len(digits) > MAX_MANTISSA_DIGITS or len(exp_digits) > 4:
        fail('NUMBER_LIMIT')
    exponent = int(exp_digits) * (-1 if exponent_text.startswith('-') else 1)
    scale = exponent - fractional
    if abs(exponent) > MAX_EXPONENT or abs(scale) > MAX_SCALE:
        fail('NUMBER_LIMIT')
    numerator = int(digits) * (-1 if mantissa.startswith('-') else 1)
    return (Fraction(numerator * 10 ** scale, 1) if scale >= 0
            else Fraction(numerator, 10 ** (-scale)))


def _numeric(row):
    _keys(row, ('state', 'serialized_number', 'non_numeric_type'), 'NUMBER_INVALID')
    if row['state'] != 'VALID_EXACT_JSON_NUMBER' or row['non_numeric_type'] is not None:
        fail('NUMBER_INVALID')
    return _token_fraction(row['serialized_number'])


def _integer_string(value, limit):
    """Bounded decimal chunks; never alters Python's process-global digit limit."""
    negative = value < 0
    value = abs(value)
    chunks = []
    while value:
        value, part = divmod(value, 1000000000)
        chunks.append(part)
        if len(chunks) > (limit + 8) // 9:
            fail('ARITHMETIC_OUTPUT_LIMIT')
    text = str(chunks.pop()) if chunks else '0'
    text += ''.join(f'{part:09d}' for part in reversed(chunks))
    if len(text) > limit:
        fail('ARITHMETIC_OUTPUT_LIMIT')
    return ('-' if negative else '') + text


def _rational(value):
    return {'numerator': _integer_string(value.numerator, 5000),
            'denominator': _integer_string(value.denominator, 2500)}


def _base(synthetic):
    return {'schema': 'lupine.rhizo.fixed-stored-census.v1',
        'status': 'BLOCKED', 'reason': 'NOT_STARTED', 'synthetic': synthetic,
        'scientific_status': 'NOT_ADMITTED', 'actual_reference_choice': 'UNKNOWN',
        'metric_interpretation': 'EXACT_DESCRIPTIVE_STORED_LABEL_DISCREPANCIES_NOT_PHYSICAL_ERROR_ESTIMATES',
        'sign_convention': 'STORED_PREDICTION_MINUS_STORED_REFERENCE',
        'fixed_position_weight': 1, 'model_ranking_or_winner': None,
        'reference_choice_reconstructed': False, 'binder_executed': False,
        'reference_or_bound_objects_read': False, 'tolerance_success_criterion': None,
        'frame_sha256': FRAME_SHA, 'readiness_sha256': READINESS_SHA,
        'projection_sha256': None, 'projection_bytes': None,
        'groups': None, 'reference_equality': None, 'output_error': None,
        'counts': {'fixed_ids': 36, 'fixed_positions': 144, 'groups': 16,
                   'reference_equality_groups': 36, 'candidate_reference_edges': 172},
        'exposure': {'projection_bytes_supplied': False, 'raw_buffer_read_started': False,
          'raw_buffer_read_completed': False, 'target_bearing_bytes_returned': False,
          'whole_projection_parse_started': False, 'whole_projection_parse_completed': False,
          'validation_started': False, 'positions_validated': 0,
          'selected_numbers_materialization_started': False, 'numbers_materialized': 0,
          'arithmetic_started': False, 'positions_computed': 0,
          'aggregate_materialization_started': False, 'groups_computed': 0,
          'reference_groups_computed': 0, 'private_projection_returned': False,
          'private_write_attempted': False, 'private_output_may_exist': False,
          'private_projection_written': False, 'public_write_attempted': False,
          'public_output_may_exist': False, 'reservation_attempted': False,
          'reservation_may_exist': False, 'reservation_created': False,
          'historical_target_bearing_labels_and_citations': True,
          'fresh_holdout_claim': False, 'researcher_inspection': 'NOT_OBSERVED_BY_THIS_PROGRAM'}}


def _validate_projection(value, context, report):
    frame, units, public_positions = context
    _keys(value, ('schema', 'warning', 'actual_reference_choice', 'scientific_status', 'units'), 'PROJECTION_SCHEMA')
    if (value['schema'] != 'lupine.rhizo.private-recorded-labels.v1'
            or value['warning'] != 'EXPOSED_HISTORICAL_NUMERICAL_LABELS_AND_CITATIONS_NO_FRESH_HOLDOUT'
            or value['actual_reference_choice'] != 'UNKNOWN'
            or value['scientific_status'] != 'NOT_ADMITTED' or type(value['units']) is not list):
        fail('PROJECTION_SCHEMA')
    if len(value['units']) != 36:
        fail('FRAME_INCOMPLETE_OR_DUPLICATE')
    seen, by_position = set(), {}
    e = report['exposure']
    e['validation_started'] = True
    for item in value['units']:
        _keys(item, ('unit_id', 'source_path', 'declared_inputs_sha256', 'positions'), 'RECORD_LAYOUT')
        uid = item['unit_id']
        if type(uid) is not str or uid not in units or uid in seen:
            fail('FRAME_INCOMPLETE_OR_DUPLICATE')
        seen.add(uid)
        unit = units[uid]
        if item['source_path'] != unit['existing_artifact_paths_not_opened_by_proposed_pass'][2]:
            fail('CONTEXT_MISMATCH')
        if type(item['declared_inputs_sha256']) is not str or re.fullmatch('[0-9a-f]{64}', item['declared_inputs_sha256']) is None:
            fail('PROVENANCE_INVALID')
        if type(item['positions']) is not list or len(item['positions']) != 4:
            fail('FRAME_INCOMPLETE_OR_DUPLICATE')
        properties, ordinals = set(), set()
        for position in item['positions']:
            _keys(position, ('unit_id', 'property', 'record_state', 'records', 'actual_reference_choice'), 'RECORD_LAYOUT')
            prop = position['property']
            if type(prop) is not str or prop not in PROPERTIES or prop in properties or position['unit_id'] != uid:
                fail('FRAME_INCOMPLETE_OR_DUPLICATE')
            properties.add(prop)
            expected = public_positions[(uid, prop)]
            if (position['record_state'] != 'SINGLE' or position['actual_reference_choice'] != 'UNKNOWN'
                    or type(position['records']) is not list or len(position['records']) != 1
                    or expected['pair_complete'] is not True):
                fail('RECORD_LAYOUT')
            record = position['records'][0]
            _keys(record, ('property_array_ordinal', 'unit', 'value', 'reference_value', 'reference_source', 'tolerance'), 'RECORD_LAYOUT')
            ordinal = record['property_array_ordinal']
            if type(ordinal) is not ExactJSONNumber or re.fullmatch(r'0|[1-9][0-9]{0,2}', ordinal.token) is None:
                fail('ORDINAL_INVALID')
            ordinal = int(ordinal.token)
            if ordinal > 511 or ordinal in ordinals:
                fail('ORDINAL_INVALID')
            ordinals.add(ordinal)
            label = 'eV' if prop == 'vacancy_formation_energy' else 'J/m^2'
            _keys(record['unit'], ('state', 'literal'), 'UNIT_MISMATCH')
            if record['unit'] != {'state': 'MATCH', 'literal': label} or expected['unit_state'] != 'MATCH':
                fail('UNIT_MISMATCH')
            _keys(record['reference_source'], ('state', 'literal'), 'CITATION_INVALID')
            citation = record['reference_source']['literal']
            if (record['reference_source']['state'] != 'NONEMPTY_STRING' or type(citation) is not str
                    or not citation.strip() or expected['citation_state'] != 'NONEMPTY_STRING'):
                fail('CITATION_INVALID')
            if record['tolerance'] != {'state': 'NULL', 'serialized_number': None, 'non_numeric_type': None} or expected['tolerance_state'] != 'NULL':
                fail('TOLERANCE_MISMATCH')
            e['selected_numbers_materialization_started'] = True
            prediction = _numeric(record['value'])
            e['numbers_materialized'] += 1
            reference = _numeric(record['reference_value'])
            e['numbers_materialized'] += 1
            if expected['value_state'] != expected['reference_value_state'] or expected['value_state'] != 'VALID_EXACT_JSON_NUMBER':
                fail('RECORD_LAYOUT')
            provenance = {'unit_id': uid, 'material': unit['material'], 'structure': unit['structure'],
                'model_id': unit['model_id'], 'source_path': item['source_path'],
                'declared_inputs_sha256': item['declared_inputs_sha256'], 'property': prop,
                'property_array_ordinal': ordinal, 'unit': label,
                'squared_unit': 'eV^2' if label == 'eV' else '(J/m^2)^2',
                'prediction_token': record['value']['serialized_number'],
                'stored_reference_token': record['reference_value']['serialized_number'],
                'stored_reference_citation': citation, 'tolerance_state': 'NULL',
                'actual_reference_choice': 'UNKNOWN'}
            by_position[(uid, prop)] = (provenance, prediction, reference)
            e['positions_validated'] += 1
    if set(by_position) != set(public_positions):
        fail('FRAME_INCOMPLETE_OR_DUPLICATE')
    return by_position


def _calculate(raw, context, report):
    try:
        if type(raw) is not bytes:
            fail('INPUT_TYPE')
        if len(raw) > MAX_INPUT:
            fail('INPUT_LIMIT')
        e = report['exposure']
        e['projection_bytes_supplied'] = e['target_bearing_bytes_returned'] = True
        report['projection_sha256'], report['projection_bytes'] = sha(raw), len(raw)
        e['whole_projection_parse_started'] = True
        value = BoundedJSON(raw).parse()
        e['whole_projection_parse_completed'] = True
        records = _validate_projection(value, context, report)
        frame, units, _ = context
        private_rows, grouped, reference_groups = [], {}, {}
        e['arithmetic_started'] = True
        for unit in frame['units']:
            for prop in PROPERTIES:
                provenance, prediction, reference = records[(unit['unit_id'], prop)]
                difference = prediction - reference
                absolute, squared = abs(difference), difference * difference
                row = dict(provenance)
                row.update(signed_discrepancy=_rational(difference), absolute_discrepancy=_rational(absolute),
                           squared_discrepancy=_rational(squared))
                private_rows.append(row)
                key = (unit['model_id'], prop, provenance['unit'])
                grouped.setdefault(key, []).append((difference, absolute, squared, unit['unit_id']))
                refkey = (unit['material'], unit['structure'], prop, provenance['unit'])
                reference_groups.setdefault(refkey, []).append((unit['model_id'], reference,
                    provenance['stored_reference_token'], provenance['stored_reference_citation']))
                e['positions_computed'] += 1
        summaries, equality = [], []
        e['aggregate_materialization_started'] = True
        for (model, prop, label), items in sorted(grouped.items()):
            if len(items) != 9:
                fail('FRAME_LAYOUT')
            total = [sum((item[index] for item in items), Fraction(0)) for index in range(3)]
            summary = {'model_id': model, 'property': prop, 'unit': label,
                'squared_unit': 'eV^2' if label == 'eV' else '(J/m^2)^2', 'count': len(items),
                'fixed_position_weight': 1, 'unit_ids': [item[3] for item in items],
                'metric_interpretation': 'STORED_LABEL_DISCREPANCIES'}
            for name, result in zip(('signed', 'absolute', 'squared'), total):
                summary['sum_' + name + '_discrepancy'] = _rational(result)
                summary['mean_' + name + '_discrepancy'] = _rational(result / len(items))
            summaries.append(summary)
            e['groups_computed'] += 1
        for (material, structure, prop, label), items in sorted(reference_groups.items()):
            if len(items) != 4 or len({item[0] for item in items}) != 4:
                fail('FRAME_LAYOUT')
            equal = len({item[1] for item in items}) == 1
            equality.append({'material': material, 'structure': structure, 'property': prop, 'unit': label,
                'model_ids': sorted(item[0] for item in items), 'count': 4,
                'stored_reference_equality': 'ALL_STORED_REFERENCES_EQUAL' if equal else 'STORED_REFERENCES_DIFFER',
                'token_spellings_equal': len({item[2] for item in items}) == 1,
                'citation_literals_equal': len({item[3] for item in items}) == 1,
                'actual_reference_choice': 'UNKNOWN', 'common_physical_truth_established': False})
            e['reference_groups_computed'] += 1
        if len(summaries) != 16 or len(equality) != 36 or len(private_rows) != 144:
            fail('FRAME_LAYOUT')
        private = {'schema': 'lupine.rhizo.private-stored-census.v1', 'scientific_status': 'NOT_ADMITTED',
            'actual_reference_choice': 'UNKNOWN', 'historical_target_bearing': True,
            'frame_sha256': FRAME_SHA, 'readiness_sha256': READINESS_SHA,
            'projection_sha256': report['projection_sha256'], 'positions': private_rows}
        report['groups'], report['reference_equality'] = summaries, equality
        if len(canonical(private)) > MAX_PRIVATE or len(canonical(report)) > MAX_PUBLIC:
            fail('OUTPUT_LIMIT')
        report['status'], report['reason'] = 'DESCRIPTIVE_CENSUS_COMPLETE', 'ALL_FIXED_STORED_DISCREPANCIES_COMPUTED'
        e['private_projection_returned'] = True
        return report, private
    except CensusError as exc:
        reason = str(exc) if str(exc) in ERRORS else 'UNEXPECTED_FAILURE'
    except Exception:
        reason = 'UNEXPECTED_FAILURE'
    report.update(status='BLOCKED', reason=reason, groups=None, reference_equality=None)
    report['exposure']['private_projection_returned'] = False
    return report, None


def inspect_synthetic(projection_raw, frame_raw, readiness_raw):
    """Caller-supplied generated bytes only; no file access or actual invocation."""
    report = _base(True)
    try:
        context = _context(frame_raw, readiness_raw)
    except CensusError as exc:
        report['reason'] = str(exc)
        return report, None
    except Exception:
        report['reason'] = 'UNEXPECTED_FAILURE'
        return report, None
    return _calculate(projection_raw, context, report)


def _safe(path):
    path = Path(path).absolute()
    if path.resolve() != path or any(p.is_symlink() for p in (path, *path.parents)):
        fail('SOURCE_PATH')
    return path


def _write_new(path, value):
    raw = canonical(value)
    fd = os.open(_safe(path), os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'wb') as stream:
        stream.write(raw)


def _run_file(path, expected, frame_raw, readiness_raw, slot, *, synthetic, guard):
    report = _base(synthetic)
    e, private = report['exposure'], None
    try:
        context = _context(frame_raw, readiness_raw)
        _keys(expected, ('bytes', 'sha256'), 'SOURCE_BINDING')
        if (type(expected['bytes']) is not int or not 0 < expected['bytes'] <= MAX_INPUT
                or type(expected['sha256']) is not str or re.fullmatch('[0-9a-f]{64}', expected['sha256']) is None):
            fail('SOURCE_BINDING')
        path, slot = _safe(path), _safe(slot)
        if synthetic and (str(path).endswith(ACTUAL_PROJECTION) or any(x in str(path) for x in ('/projection-custody/', '/li-v3-custody/'))):
            fail('ACTUAL_INPUT_FORBIDDEN')
        guard()
        e['reservation_attempted'] = e['reservation_may_exist'] = True
        slot.mkdir(mode=0o700, exist_ok=False)
        _write_new(slot / 'reservation.json', {'schema': 'lupine.rhizo.census-reservation.v1',
            'synthetic': synthetic, 'projection': expected, 'frame_sha256': FRAME_SHA,
            'readiness_sha256': READINESS_SHA, 'contract_sha256': CONTRACT_SHA})
        e['reservation_created'] = True
        guard()
        e['raw_buffer_read_started'] = True
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
        with os.fdopen(fd, 'rb') as stream:
            if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
                fail('SOURCE_PATH')
            raw = stream.read(expected['bytes'] + 1)
            e['raw_buffer_read_completed'] = e['target_bearing_bytes_returned'] = True
        if len(raw) != expected['bytes'] or sha(raw) != expected['sha256']:
            fail('SOURCE_IDENTITY')
        report, private = _calculate(raw, context, report)
    except CensusError as exc:
        report['reason'] = str(exc) if str(exc) in ERRORS else 'UNEXPECTED_FAILURE'
    except FileExistsError:
        report['reason'] = 'OUTPUT_RESERVATION'
    except OSError:
        report['reason'] = 'SOURCE_READ' if e['raw_buffer_read_started'] else 'OUTPUT_RESERVATION'
    except Exception:
        report['reason'] = 'UNEXPECTED_FAILURE'
    e['private_projection_returned'] = False
    if not e['reservation_created']:
        return report
    try:
        guard()
        if private is not None:
            e['private_write_attempted'] = e['private_output_may_exist'] = True
            _write_new(slot / 'census-private.json', private)
            e['private_projection_written'] = True
        e['public_write_attempted'] = e['public_output_may_exist'] = True
        _write_new(slot / 'public.json', report)
    except Exception as exc:
        output_reason = str(exc) if isinstance(exc, CensusError) and str(exc) in ERRORS else 'OUTPUT_WRITE'
        if report['status'] == 'DESCRIPTIVE_CENSUS_COMPLETE':
            report['status'], report['reason'] = 'BLOCKED', output_reason
        report['output_error'] = output_reason
        report['groups'], report['reference_equality'] = None, None
    return report


def run_synthetic_file(path, expected, frame_raw, readiness_raw, output_slot):
    return _run_file(path, expected, frame_raw, readiness_raw, output_slot,
                     synthetic=True, guard=lambda: None)


def run_retained(root, manifest_path, manifest_sha256):
    """Prospective root-owned one-use wrapper. Unbound and never invoked in development."""
    report = _base(False)
    try:
        root = _safe(root)
        if root != Path(__file__).absolute().parents[2]:
            fail('SOURCE_BINDING')
        manifest_path = _safe(manifest_path)
        if manifest_path != root / LANE / 'reviewed-invocation.json':
            fail('SOURCE_BINDING')
        manifest_raw = manifest_path.read_bytes()
        if len(manifest_raw) > 16384 or sha(manifest_raw) != manifest_sha256:
            fail('SOURCE_BINDING')
        manifest = json.loads(manifest_raw)
        _keys(manifest, ('schema', 'script_sha256', 'contract_sha256', 'frame_sha256',
                         'readiness_sha256', 'projection', 'output_slot'), 'SOURCE_BINDING')
        if (manifest['schema'] != 'lupine.rhizo.census-invocation.v1'
                or manifest['contract_sha256'] != CONTRACT_SHA or manifest['frame_sha256'] != FRAME_SHA
                or manifest['readiness_sha256'] != READINESS_SHA
                or manifest['output_slot'] != LANE + '/actual'):
            fail('SOURCE_BINDING')
        def guard():
            if (sha(_safe(Path(__file__)).read_bytes()) != manifest['script_sha256']
                    or sha(_safe(root / LANE / 'contract.json').read_bytes()) != CONTRACT_SHA
                    or _safe(manifest_path).read_bytes() != manifest_raw
                    or sha(_safe(root / FRAME_PATH).read_bytes()) != FRAME_SHA
                    or sha(_safe(root / READINESS_PATH).read_bytes()) != READINESS_SHA):
                fail('SOURCE_CONTEXT_CHANGED')
        guard()
        return _run_file(root / ACTUAL_PROJECTION, manifest['projection'],
            _safe(root / FRAME_PATH).read_bytes(), _safe(root / READINESS_PATH).read_bytes(),
            root / LANE / 'actual', synthetic=False, guard=guard)
    except CensusError as exc:
        report['reason'] = str(exc) if str(exc) in ERRORS else 'UNEXPECTED_FAILURE'
    except Exception:
        report['reason'] = 'SOURCE_BINDING'
    return report
