"""One bounded documentary projection; no source acquisition or numerical study."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import stat

COMMIT = '81079a8e1bac7ed332712cc92002bd3435e40776'
FRAME_SHA = '80a1aca0fd56d89f49ff5f0e4b3930405f11ae1cd4acea14b8edab2381940aa4'
FRAME_PATH = '.cache/phase2-rhizo-reference-readiness-design-v1/reference-frame.json'
FILES = (
    {'path': 'data/y_matrix_targets/surface_energies.json', 'family': 'surface_energies',
     'bytes': 44140, 'entries': 57, 'git_blob_sha1': '241a220acd3420742443e26286a2c6f2e9e927f4',
     'sha256': 'd260124959c0d22dba8440d53f07481cf67e2b552e0d7abe5535168799903c16'},
    {'path': 'data/y_matrix_targets/vacancy_formation.json', 'family': 'vacancy_formation',
     'bytes': 17779, 'entries': 28, 'git_blob_sha1': '8f98a67d89e32cecd9007b390d7629220515dd75',
     'sha256': 'be69d690dfefdafdf938ed79e77396faffb55586f9300d711f811fc11b36ef60'},
)
SOURCE_PINS = {
    'scripts/projection_custody.py': '751bcec5123feef65bf4b459691b5ab89197dd28e599fa23a178e2f10ff36fcc',
    '.cache/projection-source-audit/rhizo/python/lupine_distill/binding.py':
        'dcf34d3caae28d7fd31268f9217432d6c78692cad4f76dd316c434a6fb99c80e',
    '.cache/projection-source-audit/rhizo/python/lupine_distill/schemas.py':
        '1bf115907c27b60c29fb3bb7ab7de167d1aa723a3f6ee64c3fa9bd47ac0f5022',
}
TARGETS = {'gamma_100': 'surface_energy_100', 'gamma_111': 'surface_energy_111',
           'gamma_110': 'surface_energy_110', 'vacancy_formation_energy': 'vacancy_formation_energy'}
MAX_DEPTH, MAX_NODES, MAX_STRING = 32, 20000, 16384
MAX_PRIVATE_OUTPUT = 4 * 1024 * 1024
NUMBER = re.compile(r'-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?')
OPAQUE_NUMBER = object()
ERRORS = frozenset(('FRAME_IDENTITY', 'FRAME_SHAPE', 'SOURCE_BINDING', 'SOURCE_IDENTITY',
                   'SOURCE_READ', 'SOURCE_PATH', 'ACTUAL_INPUT_FORBIDDEN', 'JSON_UTF8',
                   'JSON_SYNTAX', 'JSON_DUPLICATE_KEY', 'JSON_DEPTH_LIMIT', 'JSON_NODE_LIMIT',
                   'JSON_STRING_LIMIT', 'JSON_SURROGATE', 'CONTAINER_LAYOUT', 'ENTRY_COUNT',
                   'CONTEXT_MISMATCH', 'DOCUMENTARY_FIELD_TYPE', 'OUTPUT_LIMIT',
                   'OUTPUT_RESERVATION', 'OUTPUT_WRITE', 'UNEXPECTED_FAILURE'))


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
    """Single grammar pass. Numeric lexemes are exposed then discarded, not evaluated."""
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
            return OPAQUE_NUMBER
        fail('JSON_SYNTAX')

    def parse(self):
        value = self.value()
        self.whitespace()
        if self.i != len(self.text):
            fail('JSON_SYNTAX')
        return value


def _frame(raw):
    if type(raw) is not bytes or sha(raw) != FRAME_SHA:
        fail('FRAME_IDENTITY')
    frame = json.loads(raw)
    # Exact public bytes are bound before parsing; these checks document the frame.
    if (len(frame['units']) != 36 or len(frame['reference_locations']) != 43
            or sum(len(row['uses']) for row in frame['reference_locations']) != 172):
        fail('FRAME_SHAPE')
    return frame


def _base(synthetic):
    return {'schema': 'lupine.rhizo.reference-documentary-projection.v1',
            'status': 'BLOCKED', 'reason': None, 'synthetic': synthetic,
            'scientific_status': 'NOT_ADMITTED', 'actual_bound_reference_choice': 'UNKNOWN',
            'numeric_completeness_checked': False, 'reference_choice_made': False,
            'historical_map_is_re_relaxed_calculator': False,
            'frame_sha256': FRAME_SHA, 'implementation': None, 'input_bindings': None,
            'output_error': None, 'units': None, 'locations': None,
            'counts': {'expected_entry_positions': 85, 'expected_locations': 43,
                       'expected_units': 36, 'expected_links': 172, 'projected_locations': 0},
            'exposure': {'objects': [], 'target_bearing_bytes_returned_to_projector': False,
                         'target_bearing_byte_access_may_have_occurred': False,
                         'whole_json_parse_started': False, 'whole_json_parse_completed': False,
                         'selected_documentary_strings_materialized': False,
                         'private_projection_returned': False, 'private_projection_written': False,
                         'researcher_inspection': 'NOT_OBSERVED_BY_THIS_PROGRAM',
                         'selected_strings_may_contain_outcomes': True,
                         'value_tokens_machine_exposed_not_numerically_evaluated': False,
                         'unmatched_entries_intentionally_projected': False,
                         'numeric_value_fields_intentionally_projected': False},
            'source_readiness': 'UNKNOWN', 'primary_source_rights': 'UNKNOWN',
            'fits': 0, 'splits': 0, 'labels_compared': 0}


def _field(source, name):
    if name not in source:
        return 'MISSING', None
    value = source[name]
    if value is None:
        return 'NULL', None
    if type(value) is not str:
        fail('DOCUMENTARY_FIELD_TYPE')
    return ('PRESENT' if value else 'EMPTY'), value


def _project(get_raw, specs, frame_raw, synthetic):
    report = _base(synthetic)
    report['input_bindings'] = [{key: spec[key] for key in
                                ('path', 'bytes', 'sha256', 'git_blob_sha1')} for spec in specs]
    private_rows, public_rows = [], []
    try:
        frame = _frame(frame_raw)
        for spec in specs:
            exposure = {'path': spec['path'], 'read_started': False, 'read_completed': False,
                        'identity_verified': False, 'json_parse_started': False,
                        'json_parse_completed': False, 'entry_count_verified': False,
                        'projection_started': False, 'projection_completed': False,
                        'selected_locations_materialized': 0}
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
            if synthetic and sha(raw) in {row['sha256'] for row in FILES}:
                fail('ACTUAL_INPUT_FORBIDDEN')
            if synthetic and spec['sha256'] is None and spec['git_blob_sha1'] is None:
                # Pure generated-byte API binds its identities only after exposure is recorded.
                spec['sha256'], spec['git_blob_sha1'] = sha(raw), blob(raw)
                report['input_bindings'][len(report['exposure']['objects']) - 1].update(
                    sha256=spec['sha256'], git_blob_sha1=spec['git_blob_sha1'])
            if len(raw) != spec['bytes'] or sha(raw) != spec['sha256'] or blob(raw) != spec['git_blob_sha1']:
                fail('SOURCE_IDENTITY')
            exposure['identity_verified'] = True
            exposure['json_parse_started'] = True
            report['exposure']['whole_json_parse_started'] = True
            report['exposure']['value_tokens_machine_exposed_not_numerically_evaluated'] = True
            value = BoundedJSON(raw).parse()
            exposure['json_parse_completed'] = True
            if (type(value) is not dict or value.get('schema') != 'lupine.y_matrix_targets.v1'
                    or value.get('family') != spec['family'] or type(value.get('entries')) is not list
                    or any(type(row) is not dict for row in value['entries'])):
                fail('CONTAINER_LAYOUT')
            entries = value['entries']
            if len(entries) != spec['entries']:
                fail('ENTRY_COUNT')
            exposure['entry_count_verified'] = True
            exposure['projection_started'] = True
            for location in frame['reference_locations']:
                if location['path'] != spec['path']:
                    continue
                row = entries[location['source_ordinal']]
                context = location['metadata_context']
                expected = {k: context[k] for k in ('material', 'structure', 'method')}
                expected['property'] = TARGETS[context['property']]
                expected['unit'] = 'eV' if context['property'] == 'vacancy_formation_energy' else 'J/m^2'
                if any(type(row.get(key)) is not str or row[key] != expected[key] for key in expected):
                    fail('CONTEXT_MISMATCH')
                source = row.get('source', {})
                if type(source) is not dict:
                    fail('DOCUMENTARY_FIELD_TYPE')
                states, documentary = {}, {}
                for name in ('citation', 'doi_or_url', 'notes'):
                    states[name], documentary[name] = _field(source, name)
                    if documentary[name] is not None:
                        report['exposure']['selected_documentary_strings_materialized'] = True
                private_rows.append({'path': location['path'], 'source_ordinal': location['source_ordinal'],
                                     'context': expected, 'source': documentary,
                                     'actual_bound_reference_choice': 'UNKNOWN'})
                public_rows.append({**location, 'documentary_field_status': states,
                                    'conditions_status': 'UNKNOWN', 'primary_source_rights': 'UNKNOWN'})
                exposure['selected_locations_materialized'] += 1
            exposure['projection_completed'] = True
        report['exposure']['whole_json_parse_completed'] = True
        private = {'schema': 'lupine.rhizo.private-documentary-projection.v1',
                   'warning': 'TARGET_BEARING_CITATIONS_LOCATORS_NOTES_MAY_CONTAIN_OUTCOMES',
                   'actual_bound_reference_choice': 'UNKNOWN', 'locations': private_rows}
        if len(private_rows) != 43 or len(canonical(private)) > MAX_PRIVATE_OUTPUT:
            fail('OUTPUT_LIMIT')
        report['units'] = frame['units']
        report['locations'] = public_rows
        report['counts']['projected_locations'] = len(private_rows)
        report['exposure']['private_projection_returned'] = True
        report['status'] = 'PROJECTED_DOCUMENTARY_ONLY'
        report['reason'] = 'DECLARED_CANDIDATE_PROVENANCE_PROJECTED'
        report['source_readiness'] = 'HUMAN_DOCUMENTARY_REVIEW_REQUIRED'
        return report, private
    except ProjectionError as exc:
        report['reason'] = str(exc) if str(exc) in ERRORS else 'UNEXPECTED_FAILURE'
    except Exception:
        report['reason'] = 'UNEXPECTED_FAILURE'
    return report, None


def _fixture_specs(payloads):
    if type(payloads) is not dict or set(payloads) != {row['path'] for row in FILES}:
        fail('SOURCE_BINDING')
    specs = []
    for row in FILES:
        raw = payloads[row['path']]
        if type(raw) is not bytes or len(raw) > row['bytes']:
            fail('SOURCE_BINDING')
        specs.append({**row, 'bytes': len(raw), 'sha256': sha(raw), 'git_blob_sha1': blob(raw)})
    return specs


def inspect_synthetic(payloads, frame_raw):
    """Generated buffers only. No filesystem reads/writes or production context."""
    try:
        _frame(frame_raw)
        if type(payloads) is not dict or set(payloads) != {row['path'] for row in FILES}:
            fail('SOURCE_BINDING')
        if any(type(payloads[row['path']]) is not bytes or len(payloads[row['path']]) > row['bytes']
               for row in FILES):
            fail('SOURCE_BINDING')
        specs = [{**row, 'bytes': len(payloads[row['path']]), 'sha256': None, 'git_blob_sha1': None}
                 for row in FILES]
    except ProjectionError as exc:
        report = _base(True)
        report['reason'] = str(exc)
        return report, None
    def get_raw(spec, exposure):
        # The caller already supplied bytes; no new file I/O is claimed.
        return payloads[spec['path']]
    return _project(get_raw, specs, frame_raw, True)


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


def _run_files(paths, specs, frame_raw, output_slot, synthetic, guard, implementation=None):
    report = _base(synthetic)
    try:
        _frame(frame_raw)
        guard()
        slot = _safe_path(output_slot)
        try:
            slot.mkdir(mode=0o700, exist_ok=False)
        except OSError:
            fail('OUTPUT_RESERVATION')
        # Reservation persists even on failures; no implicit retry/overwrite.
        _write_new(slot / 'reservation.json', {'schema': 'lupine.rhizo.invocation-reservation.v1',
                                             'synthetic': synthetic, 'frame_sha256': FRAME_SHA,
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
    report, private = _project(get_raw, specs, frame_raw, synthetic)
    report['implementation'] = implementation
    report['exposure']['private_projection_returned'] = False
    try:
        guard()
        if private is not None:
            _write_new(slot / 'private.json', private)
            report['exposure']['private_projection_written'] = True
        _write_new(slot / 'public.json', report)
    except Exception as exc:
        # A partial private write is possible and is not described as unexposed.
        report['status'] = 'BLOCKED'
        if private is not None:
            report['reason'] = str(exc) if isinstance(exc, ProjectionError) and str(exc) in ERRORS else 'OUTPUT_WRITE'
        report['output_error'] = str(exc) if isinstance(exc, ProjectionError) and str(exc) in ERRORS else 'OUTPUT_WRITE'
        report['private_output_may_exist'] = (slot / 'private.json').exists()
        try:
            _write_new(slot / 'failure.json', report)
        except Exception:
            pass
    return report


def run_synthetic_files(paths, payload_specs, frame_raw, output_slot):
    """Fixture wrapper: caller supplies generated-byte specs, never real identities."""
    try:
        if len(payload_specs) != 2 or set(paths) != {row['path'] for row in FILES}:
            fail('SOURCE_BINDING')
        for given, base in zip(payload_specs, FILES):
            if (set(given) != set(base) or any(given[k] != base[k] for k in ('path', 'family', 'entries'))
                    or type(given['bytes']) is not int or not 0 <= given['bytes'] <= base['bytes']
                    or given['sha256'] in {row['sha256'] for row in FILES}
                    or given['git_blob_sha1'] in {row['git_blob_sha1'] for row in FILES}):
                fail('ACTUAL_INPUT_FORBIDDEN')
            if '.cache/projection-custody/' in str(Path(paths[given['path']]).absolute()):
                fail('ACTUAL_INPUT_FORBIDDEN')
    except (ProjectionError, TypeError, KeyError) as exc:
        report = _base(True)
        report['reason'] = str(exc) if isinstance(exc, ProjectionError) else 'SOURCE_BINDING'
        return report
    return _run_files(paths, payload_specs, frame_raw, output_slot, True, lambda: None)


def run_retained(root, manifest_path, manifest_sha256):
    """Future reviewed fixed-source operation. Not invoked by import or by author tests."""
    root = Path(root).absolute()
    report = _base(False)
    try:
        if root != Path(__file__).resolve().parents[2]:
            fail('SOURCE_BINDING')
        if Path(manifest_path).absolute() != root / '.cache/phase2-rhizo-reference-projector-v1/reviewed-invocation.json':
            fail('SOURCE_BINDING')
        manifest_raw = _safe_path(manifest_path).read_bytes()
        if sha(manifest_raw) != manifest_sha256:
            fail('SOURCE_BINDING')
        manifest = json.loads(manifest_raw)
        if (set(manifest) != {'schema', 'script_sha256', 'frame_sha256', 'source_pins', 'output_slot'}
                or manifest['schema'] != 'lupine.rhizo.reviewed-invocation.v1'
                or manifest['frame_sha256'] != FRAME_SHA or manifest['source_pins'] != SOURCE_PINS
                or manifest['output_slot'] != '.cache/phase2-rhizo-reference-projector-v1/actual'):
            fail('SOURCE_BINDING')
        def guard():
            if sha(Path(__file__).read_bytes()) != manifest['script_sha256']:
                fail('SOURCE_BINDING')
            for name, digest in SOURCE_PINS.items():
                if sha(_safe_path(root / name).read_bytes()) != digest:
                    fail('SOURCE_BINDING')
            if sha(_safe_path(root / FRAME_PATH).read_bytes()) != FRAME_SHA:
                fail('FRAME_IDENTITY')
        guard()
        frame_raw = _safe_path(root / FRAME_PATH).read_bytes()
        paths = {row['path']: root / '.cache/projection-custody' / COMMIT / 'objects' /
                 (row['git_blob_sha1'] + '.json') for row in FILES}
    except Exception as exc:
        report['reason'] = str(exc) if isinstance(exc, ProjectionError) and str(exc) in ERRORS else 'SOURCE_BINDING'
        return report
    implementation = {'script_sha256': manifest['script_sha256'], 'source_pins': SOURCE_PINS,
                      'reviewed_manifest_sha256': manifest_sha256}
    return _run_files(paths, FILES, frame_raw, root / manifest['output_slot'], False, guard, implementation)
