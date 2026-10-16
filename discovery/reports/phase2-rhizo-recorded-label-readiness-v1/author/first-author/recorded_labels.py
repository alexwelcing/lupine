"""Bounded inspection of 144 stored label positions; never reference selection."""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
import re
import stat

COMMIT = '81079a8e1bac7ed332712cc92002bd3435e40776'
FRAME_PATH = '.cache/phase2-rhizo-reference-readiness-design-v1/reference-frame.json'
FRAME_SHA = '80a1aca0fd56d89f49ff5f0e4b3930405f11ae1cd4acea14b8edab2381940aa4'
INPUTS_PATH = '.cache/phase2-rhizo-bound-choice-scope-v1/objects.json'
INPUTS_SHA = 'e0059b2d6eead1eb4f1e2323fdea88a8e00e48fdc132c04eceeb994cd363ce3a'
SOURCE_PINS = {
    'scripts/projection_custody.py': '751bcec5123feef65bf4b459691b5ab89197dd28e599fa23a178e2f10ff36fcc',
    '.cache/projection-source-audit/rhizo/python/lupine_distill/binding.py': 'dcf34d3caae28d7fd31268f9217432d6c78692cad4f76dd316c434a6fb99c80e',
    '.cache/projection-source-audit/rhizo/python/lupine_distill/schemas.py': '1bf115907c27b60c29fb3bb7ab7de167d1aa723a3f6ee64c3fa9bd47ac0f5022',
}
PROPERTIES = ('gamma_100', 'gamma_111', 'vacancy_formation_energy', 'gamma_110')
MAX_DEPTH, MAX_NODES, MAX_STRING = 32, 20000, 16384
MAX_PROPERTIES, MAX_PRIVATE, MAX_PUBLIC = 512, 4194304, 1048576
MAX_MANTISSA_DIGITS, MAX_EXPONENT, MAX_SCALE = 128, 1024, 1024
NUMBER = re.compile(r'-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?')
MISSING = object()
ERRORS = frozenset(('FRAME_IDENTITY', 'INPUTS_IDENTITY', 'CONTRACT_SHAPE', 'SOURCE_BINDING',
    'SOURCE_IDENTITY', 'SOURCE_READ', 'SOURCE_PATH', 'ACTUAL_INPUT_FORBIDDEN',
    'JSON_UTF8', 'JSON_SYNTAX', 'JSON_DUPLICATE_KEY', 'JSON_DEPTH_LIMIT', 'JSON_NODE_LIMIT',
    'JSON_STRING_LIMIT', 'JSON_SURROGATE', 'SCHEMA_MISMATCH', 'CONTEXT_MISMATCH',
    'PROVENANCE_LAYOUT', 'PROPERTIES_LAYOUT', 'PROPERTY_LIMIT', 'OUTPUT_LIMIT',
    'OUTPUT_RESERVATION', 'OUTPUT_WRITE', 'UNEXPECTED_FAILURE'))

class ExactJSONNumber:
    __slots__ = ('token',)
    def __init__(self, token):
        self.token = token

class ProjectionError(Exception):
    pass


def fail(reason):
    raise ProjectionError(reason)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def blob(raw):
    return hashlib.sha1(b'blob ' + str(len(raw)).encode('ascii') + b'\0' + raw).hexdigest()


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True,
                       allow_nan=False) + '\n').encode('ascii')


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


def _safe_path(path):
    path = Path(path).absolute()
    if path.resolve() != path or any(parent.is_symlink() for parent in (path, *path.parents)):
        fail('SOURCE_PATH')
    return path


def _read_once(path, size, exposure):
    path = _safe_path(path)
    exposure['read_started'] = True
    try:
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
        with os.fdopen(fd, 'rb') as stream:
            if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
                fail('SOURCE_PATH')
            raw = stream.read(size + 1)
        exposure['read_completed'] = True
        return raw
    except ProjectionError:
        raise
    except OSError:
        fail('SOURCE_READ')


def _write_new(path, value):
    raw = canonical(value)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'wb') as stream:
        stream.write(raw)


def _contract(frame_raw, inputs_raw):
    if type(frame_raw) is not bytes or sha(frame_raw) != FRAME_SHA:
        fail('FRAME_IDENTITY')
    if type(inputs_raw) is not bytes or sha(inputs_raw) != INPUTS_SHA:
        fail('INPUTS_IDENTITY')
    frame, inputs = json.loads(frame_raw), json.loads(inputs_raw)
    specs = inputs['minimum_stored_label_objects']
    units = {row['existing_artifact_paths_not_opened_by_proposed_pass'][2]: row
             for row in frame['units']}
    if (len(units) != 36 or len(specs) != 36 or sum(row['bytes'] for row in specs) != 126885
            or {row['path'] for row in specs} != set(units)
            or sum(len(row['uses']) for row in frame['reference_locations']) != 172):
        fail('CONTRACT_SHAPE')
    forbidden = {row['sha256'] for row in specs + inputs['additional_objects_for_candidate_value_concordance']}
    return frame, specs, units, forbidden


def _base(synthetic):
    return {'schema': 'lupine.rhizo.recorded-label-readiness.v1', 'status': 'BLOCKED',
            'reason': None, 'synthetic': synthetic, 'scientific_status': 'NOT_ADMITTED',
            'actual_reference_choice': 'UNKNOWN', 'reference_choice_reconstructed': False,
            'binder_executed': False, 'reference_objects_read': False,
            'residuals_ranks_fits_splits_or_performance_computed': False,
            'historical_map_is_re_relaxed_calculator': False,
            'frame_sha256': FRAME_SHA, 'inputs_sha256': INPUTS_SHA, 'implementation': None,
            'input_bindings': None, 'candidate_context': None, 'positions': None,
            'all_144_pairs_complete': None, 'all_144_citations_nonempty_strings': None,
            'optional_tolerances_usable_or_absent': None, 'first_label_issue': None,
            'output_error': None,
            'counts': {'fixed_ids': 36, 'fixed_label_positions': 144, 'context_candidate_edges': 172,
                       'positions_inspected': 0, 'pairs_complete': 0},
            'exposure': {'objects': [], 'target_bearing_bytes_returned_to_projector': False,
                         'target_bearing_byte_access_may_have_occurred': False,
                         'whole_json_parse_started': False, 'whole_json_parse_completed': False,
                         'selected_historical_labels_materialization_started': False,
                         'selected_historical_labels_materialized': False,
                         'private_projection_returned': False, 'private_projection_written': False,
                         'researcher_inspection': 'NOT_OBSERVED_BY_THIS_PROGRAM',
                         'whole_objects_are_mixed_target_bearing_data': True,
                         'projected_citations_and_labels_are_target_bearing': True,
                         'fresh_holdout_claim': False}}


def _raw_kind(value):
    return {str: 'STRING', bool: 'BOOLEAN', list: 'ARRAY', dict: 'OBJECT',
            type(None): 'NULL'}.get(type(value), 'OTHER')


def _numeric(value=MISSING, *, tolerance=False):
    state, token = None, None
    if value is MISSING:
        state = 'MISSING'
    elif value is None:
        state = 'NULL'
    elif type(value) is not ExactJSONNumber:
        state = 'NOT_JSON_NUMBER'
    else:
        token = value.token
        mantissa, _, exponent_text = token.lower().partition('e')
        unsigned = mantissa.lstrip('-')
        digits = unsigned.replace('.', '')
        fraction_digits = len(unsigned.partition('.')[2])
        exponent_digits = exponent_text.lstrip('+-').lstrip('0') or '0'
        if len(digits) > MAX_MANTISSA_DIGITS or len(exponent_digits) > 4:
            state = 'NUMBER_OUTSIDE_ENGINEERING_LIMIT'
        else:
            exponent = int(exponent_digits) * (-1 if exponent_text.startswith('-') else 1)
            if abs(exponent) > MAX_EXPONENT or abs(exponent - fraction_digits) > MAX_SCALE:
                state = 'NUMBER_OUTSIDE_ENGINEERING_LIMIT'
            elif tolerance and mantissa.startswith('-') and any(char != '0' for char in digits):
                state = 'NEGATIVE'
            else:
                state = 'VALID_EXACT_JSON_NUMBER'
    return {'state': state, 'serialized_number': token,
            'non_numeric_type': _raw_kind(value) if state == 'NOT_JSON_NUMBER' else None}


def _literal(value=MISSING, *, expected=None):
    if value is MISSING:
        state = 'MISSING'
    elif value is None:
        state = 'NULL'
    elif type(value) is not str:
        state = 'INVALID_TYPE'
    elif expected is not None:
        state = 'MATCH' if value == expected else 'MISMATCH'
    elif not value:
        state = 'EMPTY'
    elif not value.strip():
        state = 'WHITESPACE_ONLY'
    else:
        state = 'NONEMPTY_STRING'
    return {'state': state, 'literal': value if type(value) is str else None}


def _position(unit, name, records):
    unit_expected = 'eV' if name == 'vacancy_formation_energy' else 'J/m^2'
    public = {'unit_id': unit['unit_id'], 'property': name,
              'record_state': 'ABSENT' if not records else ('SINGLE' if len(records) == 1 else 'AMBIGUOUS'),
              'unit_state': 'NOT_CHECKED', 'value_state': 'NOT_CHECKED',
              'reference_value_state': 'NOT_CHECKED', 'citation_state': 'NOT_CHECKED',
              'tolerance_state': 'NOT_CHECKED', 'pair_complete': False,
              'actual_reference_choice': 'UNKNOWN'}
    private = {'unit_id': unit['unit_id'], 'property': name, 'record_state': public['record_state'],
               'records': [], 'actual_reference_choice': 'UNKNOWN'}
    for ordinal, record in records:
        private['records'].append({'property_array_ordinal': ordinal,
            'unit': _literal(record.get('unit', MISSING), expected=unit_expected),
            'value': _numeric(record.get('value', MISSING)),
            'reference_value': _numeric(record.get('reference_value', MISSING)),
            'reference_source': _literal(record.get('reference_source', MISSING)),
            'tolerance': _numeric(record.get('tolerance', MISSING), tolerance=True)})
    if len(records) == 1:
        one = private['records'][0]
        for output, key in (('unit', 'unit'), ('value', 'value'), ('reference_value', 'reference_value'),
                            ('citation', 'reference_source'), ('tolerance', 'tolerance')):
            public[output + '_state'] = one[key]['state']
        public['pair_complete'] = (public['unit_state'] == 'MATCH'
            and public['value_state'] == 'VALID_EXACT_JSON_NUMBER'
            and public['reference_value_state'] == 'VALID_EXACT_JSON_NUMBER')
    return public, private


def _project(get_raw, specs, frame_raw, inputs_raw, synthetic):
    report = _base(synthetic)
    report['input_bindings'] = [{key: row[key] for key in ('path', 'bytes', 'sha256', 'git_blob_sha1')}
                              for row in specs]
    public_positions, private_units = [], []
    try:
        frame, original_specs, units, forbidden = _contract(frame_raw, inputs_raw)
        report['candidate_context'] = {'units': frame['units'],
                                       'reference_locations': frame['reference_locations'],
                                       'interpretation': 'CONTEXT_ONLY_NO_REFERENCE_SELECTED'}
        for spec in specs:
            exposure = {'path': spec['path'], 'read_started': False, 'read_completed': False,
                        'identity_verified': False, 'json_parse_started': False,
                        'json_parse_completed': False, 'context_checked': False,
                        'projection_started': False, 'projection_completed': False,
                        'positions_materialized': 0}
            report['exposure']['objects'].append(exposure)
            try:
                raw = get_raw(spec, exposure)
            finally:
                if exposure['read_started']:
                    report['exposure']['target_bearing_byte_access_may_have_occurred'] = True
            if type(raw) is not bytes:
                fail('SOURCE_READ')
            if raw:
                report['exposure']['target_bearing_bytes_returned_to_projector'] = True
                report['exposure']['target_bearing_byte_access_may_have_occurred'] = True
            if synthetic and sha(raw) in forbidden:
                fail('ACTUAL_INPUT_FORBIDDEN')
            if synthetic and spec['sha256'] is None and spec['git_blob_sha1'] is None:
                spec['sha256'], spec['git_blob_sha1'] = sha(raw), blob(raw)
                report['input_bindings'][len(report['exposure']['objects']) - 1].update(
                    sha256=spec['sha256'], git_blob_sha1=spec['git_blob_sha1'])
            if len(raw) != spec['bytes'] or sha(raw) != spec['sha256'] or blob(raw) != spec['git_blob_sha1']:
                fail('SOURCE_IDENTITY')
            exposure['identity_verified'] = True
            exposure['json_parse_started'] = True
            report['exposure']['whole_json_parse_started'] = True
            value = BoundedJSON(raw).parse()
            exposure['json_parse_completed'] = True
            report['exposure']['whole_json_parse_completed'] = (
                len(report['exposure']['objects']) == len(specs)
                and all(row['json_parse_completed'] for row in report['exposure']['objects']))
            if type(value) is not dict or value.get('schema') != 'lupine.mlip.calc_evidence.v1':
                fail('SCHEMA_MISMATCH')
            unit = units[spec['path']]
            source = value.get('source')
            if (value.get('material') != unit['material'] or type(source) is not dict
                    or source.get('model_id') != unit['model_id']):
                fail('CONTEXT_MISMATCH')
            provenance = value.get('provenance')
            if (type(provenance) is not dict or type(provenance.get('inputs_sha256')) is not str
                    or re.fullmatch('[0-9a-f]{64}', provenance['inputs_sha256']) is None):
                fail('PROVENANCE_LAYOUT')
            properties = value.get('properties')
            if type(properties) is not list:
                fail('PROPERTIES_LAYOUT')
            if len(properties) > MAX_PROPERTIES:
                fail('PROPERTY_LIMIT')
            if any(type(row) is not dict or type(row.get('name')) is not str for row in properties):
                fail('PROPERTIES_LAYOUT')
            exposure['context_checked'] = True
            exposure['projection_started'] = True
            private_unit = {'unit_id': unit['unit_id'], 'source_path': spec['path'],
                            'declared_inputs_sha256': provenance['inputs_sha256'], 'positions': []}
            for name in PROPERTIES:
                records = [(ordinal, row) for ordinal, row in enumerate(properties) if row['name'] == name]
                if records:
                    report['exposure']['selected_historical_labels_materialization_started'] = True
                public, private = _position(unit, name, records)
                public_positions.append(public)
                private_unit['positions'].append(private)
                exposure['positions_materialized'] += 1
                report['counts']['positions_inspected'] += 1
                report['counts']['pairs_complete'] += int(public['pair_complete'])
                if records:
                    report['exposure']['selected_historical_labels_materialized'] = True
                if not public['pair_complete'] and report['first_label_issue'] is None:
                    report['first_label_issue'] = {key: public[key] for key in
                        ('unit_id', 'property', 'record_state', 'unit_state', 'value_state', 'reference_value_state')}
            private_units.append(private_unit)
            exposure['projection_completed'] = True
        private = {'schema': 'lupine.rhizo.private-recorded-labels.v1',
                   'warning': 'EXPOSED_HISTORICAL_NUMERICAL_LABELS_AND_CITATIONS_NO_FRESH_HOLDOUT',
                   'actual_reference_choice': 'UNKNOWN', 'scientific_status': 'NOT_ADMITTED',
                   'units': private_units}
        if len(public_positions) != 144 or len(canonical(private)) > MAX_PRIVATE:
            fail('OUTPUT_LIMIT')
        report['positions'] = public_positions
        report['all_144_pairs_complete'] = all(row['pair_complete'] for row in public_positions)
        report['all_144_citations_nonempty_strings'] = all(row['citation_state'] == 'NONEMPTY_STRING'
                                                        for row in public_positions)
        report['optional_tolerances_usable_or_absent'] = all(row['tolerance_state'] in
            {'MISSING', 'NULL', 'VALID_EXACT_JSON_NUMBER'} for row in public_positions)
        report['status'] = 'RECORDED_LABEL_INSPECTION_COMPLETE'
        report['reason'] = ('ALL_STORED_PAIRS_COMPLETE_WITHIN_ENGINEERING_LIMITS'
                            if report['all_144_pairs_complete'] else 'STORED_PAIR_GAPS_OR_INVALIDITY_RETAINED')
        report['exposure']['private_projection_returned'] = True
        if len(canonical(report)) > MAX_PUBLIC:
            fail('OUTPUT_LIMIT')
        return report, private
    except ProjectionError as exc:
        report['reason'] = str(exc) if str(exc) in ERRORS else 'UNEXPECTED_FAILURE'
    except Exception:
        report['reason'] = 'UNEXPECTED_FAILURE'
    report['status'] = 'BLOCKED'
    report['positions'] = None
    report['all_144_pairs_complete'] = None
    report['all_144_citations_nonempty_strings'] = None
    report['optional_tolerances_usable_or_absent'] = None
    report['exposure']['private_projection_returned'] = False
    return report, None


def inspect_synthetic(payloads, frame_raw, inputs_raw):
    """Generated buffers only; no byte hashing until the corresponding exposure stage."""
    try:
        _, original, _, _ = _contract(frame_raw, inputs_raw)
        if type(payloads) is not dict or set(payloads) != {row['path'] for row in original}:
            fail('SOURCE_BINDING')
        if any(type(payloads[row['path']]) is not bytes or len(payloads[row['path']]) > row['bytes']
               for row in original):
            fail('SOURCE_BINDING')
        specs = [{**row, 'bytes': len(payloads[row['path']]), 'sha256': None, 'git_blob_sha1': None}
                 for row in original]
    except ProjectionError as exc:
        report = _base(True)
        report['reason'] = str(exc)
        return report, None
    return _project(lambda spec, exposure: payloads[spec['path']], specs, frame_raw, inputs_raw, True)


def _run_files(paths, specs, frame_raw, inputs_raw, output_slot, synthetic, guard, implementation=None):
    report = _base(synthetic)
    try:
        _contract(frame_raw, inputs_raw)
        guard()
        slot = _safe_path(output_slot)
        try:
            slot.mkdir(mode=0o700, exist_ok=False)
        except OSError:
            fail('OUTPUT_RESERVATION')
        _write_new(slot / 'reservation.json', {'schema': 'lupine.rhizo.recorded-label-reservation.v1',
            'synthetic': synthetic, 'frame_sha256': FRAME_SHA, 'inputs_sha256': INPUTS_SHA,
            'implementation': implementation})
    except ProjectionError as exc:
        report['reason'] = str(exc)
        return report
    except Exception:
        report['reason'] = 'OUTPUT_RESERVATION'
        return report
    def get_raw(spec, exposure):
        guard()
        return _read_once(paths[spec['path']], spec['bytes'], exposure)
    report, private = _project(get_raw, specs, frame_raw, inputs_raw, synthetic)
    report['implementation'] = implementation
    report['exposure']['private_projection_returned'] = False
    try:
        guard()
        if private is not None:
            _write_new(slot / 'private.json', private)
            report['exposure']['private_projection_written'] = True
        _write_new(slot / 'public.json', report)
    except Exception as exc:
        report['status'] = 'BLOCKED'
        error = str(exc) if isinstance(exc, ProjectionError) and str(exc) in ERRORS else 'OUTPUT_WRITE'
        if private is not None:
            report['reason'] = error
        report['output_error'] = error
        report['private_output_may_exist'] = (slot / 'private.json').exists()
        try:
            _write_new(slot / 'failure.json', report)
        except Exception:
            pass
    return report


def run_synthetic_files(paths, payload_specs, frame_raw, inputs_raw, output_slot):
    """Generated file wrapper; never binds actual custody or actual source identities."""
    try:
        _, original, _, forbidden = _contract(frame_raw, inputs_raw)
        if len(payload_specs) != 36 or set(paths) != {row['path'] for row in original}:
            fail('SOURCE_BINDING')
        for given, base in zip(payload_specs, original):
            if (set(given) != set(base) or given['path'] != base['path']
                    or type(given['bytes']) is not int or not 0 <= given['bytes'] <= base['bytes']
                    or type(given['sha256']) is not str or re.fullmatch('[0-9a-f]{64}', given['sha256']) is None
                    or type(given['git_blob_sha1']) is not str or re.fullmatch('[0-9a-f]{40}', given['git_blob_sha1']) is None):
                fail('SOURCE_BINDING')
            if (given['sha256'] in forbidden or given['git_blob_sha1'] in {row['git_blob_sha1'] for row in original}
                    or '/projection-custody/' in str(Path(paths[given['path']]).absolute())):
                fail('ACTUAL_INPUT_FORBIDDEN')
    except (ProjectionError, TypeError, KeyError) as exc:
        report = _base(True)
        report['reason'] = str(exc) if isinstance(exc, ProjectionError) else 'SOURCE_BINDING'
        return report
    return _run_files(paths, payload_specs, frame_raw, inputs_raw, output_slot, True, lambda: None)


def run_retained(root, manifest_path, manifest_sha256):
    """Future root-owned operation; neither imported nor invoked by generated tests."""
    root = Path(root).absolute()
    report = _base(False)
    try:
        base = root / '.cache/phase2-rhizo-recorded-label-candidate-v1'
        if root != Path(__file__).resolve().parents[2] or Path(manifest_path).absolute() != base / 'reviewed-invocation.json':
            fail('SOURCE_BINDING')
        raw = _safe_path(manifest_path).read_bytes()
        if sha(raw) != manifest_sha256:
            fail('SOURCE_BINDING')
        manifest = json.loads(raw)
        if (set(manifest) != {'schema', 'script_sha256', 'frame_sha256', 'inputs_sha256',
                             'contract_sha256', 'source_pins', 'output_slot'}
                or manifest['schema'] != 'lupine.rhizo.recorded-label-invocation.v1'
                or manifest['frame_sha256'] != FRAME_SHA or manifest['inputs_sha256'] != INPUTS_SHA
                or manifest['contract_sha256'] != '8b1f1b43fd5cf780a258b91bd346c6fef2d4cf4e1ee2af0cb3ef192092f32c49'
                or manifest['source_pins'] != SOURCE_PINS
                or manifest['output_slot'] != '.cache/phase2-rhizo-recorded-label-candidate-v1/actual'):
            fail('SOURCE_BINDING')
        def guard():
            if sha(_safe_path(__file__).read_bytes()) != manifest['script_sha256']:
                fail('SOURCE_BINDING')
            if sha(_safe_path(base / 'contract.json').read_bytes()) != manifest['contract_sha256']:
                fail('SOURCE_BINDING')
            for name, digest in SOURCE_PINS.items():
                if sha(_safe_path(root / name).read_bytes()) != digest:
                    fail('SOURCE_BINDING')
            if sha(_safe_path(root / FRAME_PATH).read_bytes()) != FRAME_SHA:
                fail('FRAME_IDENTITY')
            if sha(_safe_path(root / INPUTS_PATH).read_bytes()) != INPUTS_SHA:
                fail('INPUTS_IDENTITY')
        guard()
        frame_raw = _safe_path(root / FRAME_PATH).read_bytes()
        inputs_raw = _safe_path(root / INPUTS_PATH).read_bytes()
        _, specs, _, _ = _contract(frame_raw, inputs_raw)
        paths = {row['path']: root / '.cache/projection-custody' / COMMIT / 'objects' /
                 (row['git_blob_sha1'] + '.json') for row in specs}
    except Exception as exc:
        report['reason'] = str(exc) if isinstance(exc, ProjectionError) and str(exc) in ERRORS else 'SOURCE_BINDING'
        return report
    implementation = {'script_sha256': manifest['script_sha256'],
                      'contract_sha256': manifest['contract_sha256'], 'source_pins': SOURCE_PINS,
                      'reviewed_manifest_sha256': manifest_sha256}
    return _run_files(paths, specs, frame_raw, inputs_raw, root / manifest['output_slot'], False, guard, implementation)
