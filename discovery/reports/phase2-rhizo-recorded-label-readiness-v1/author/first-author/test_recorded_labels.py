"""Author challenges use generated labels only; no retained object is opened."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
spec = importlib.util.spec_from_file_location('recorded_labels', HERE / 'recorded_labels.py')
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)
FRAME_RAW = (ROOT / p.FRAME_PATH).read_bytes()
INPUTS_RAW = (ROOT / p.INPUTS_PATH).read_bytes()
FRAME = json.loads(FRAME_RAW)
SPECS = json.loads(INPUTS_RAW)['minimum_stored_label_objects']
UNITS = {u['existing_artifact_paths_not_opened_by_proposed_pass'][2]: u for u in FRAME['units']}


class Num:
    def __init__(self, token): self.token = token


def encode(value):
    if isinstance(value, Num): return value.token
    if isinstance(value, dict):
        return '{' + ','.join(json.dumps(k) + ':' + encode(v) for k, v in value.items()) + '}'
    if isinstance(value, list): return '[' + ','.join(encode(v) for v in value) + ']'
    return json.dumps(value, ensure_ascii=True, separators=(',', ':'))


def documents():
    result = {}
    for item in SPECS:
        unit = UNITS[item['path']]
        result[item['path']] = {'schema': 'lupine.mlip.calc_evidence.v1', 'material': unit['material'],
            'source': {'model_id': unit['model_id']}, 'provenance': {'inputs_sha256': 'e' * 64},
            'properties': [{'name': name, 'unit': 'eV' if name == 'vacancy_formation_energy' else 'J/m^2',
                'value': Num('9007199254740993'), 'reference_value': Num('9007199254740992.000'),
                'reference_source': 'PRIVATE_CITATION_CANARY historical outcome 99.125', 'tolerance': None}
                for name in p.PROPERTIES] + [{'name': 'unused', 'value': 'UNSELECTED_TARGET_CANARY'}],
            'unused_notes': 'UNSELECTED_NOTES_CANARY'}
    return result


def payloads(docs=None):
    return {name: encode(value).encode() for name, value in (documents() if docs is None else docs).items()}


def first(docs): return docs[SPECS[0]['path']]['properties'][0]


def fixture_specs(data):
    return [{**s, 'bytes': len(data[s['path']]), 'sha256': p.sha(data[s['path']]),
             'git_blob_sha1': p.blob(data[s['path']])} for s in SPECS]


class LabelTests(unittest.TestCase):
    def inspect(self, docs): return p.inspect_synthetic(payloads(docs), FRAME_RAW, INPUTS_RAW)

    def assert_blocked(self, report, private, reason):
        self.assertEqual(report['status'], 'BLOCKED'); self.assertEqual(report['reason'], reason)
        self.assertIsNone(private); self.assertIsNone(report['positions'])
        self.assertIsNone(report['all_144_pairs_complete'])
        self.assertEqual(report['scientific_status'], 'NOT_ADMITTED')
        self.assertEqual(report['actual_reference_choice'], 'UNKNOWN')

    def test_complete144_and_private_exact_tokens(self):
        report, private = self.inspect(documents())
        self.assertEqual(report['status'], 'RECORDED_LABEL_INSPECTION_COMPLETE')
        self.assertTrue(report['all_144_pairs_complete'])
        self.assertTrue(report['all_144_citations_nonempty_strings'])
        self.assertTrue(report['optional_tolerances_usable_or_absent'])
        self.assertEqual(len(report['positions']), 144); self.assertEqual(len(private['units']), 36)
        self.assertEqual(report['candidate_context']['reference_locations'], FRAME['reference_locations'])
        self.assertEqual(sum(len(x['uses']) for x in report['candidate_context']['reference_locations']), 172)
        one = private['units'][0]['positions'][0]['records'][0]
        self.assertEqual(one['value']['serialized_number'], '9007199254740993')
        self.assertEqual(one['reference_value']['serialized_number'], '9007199254740992.000')
        text = json.dumps(report)
        for x in ('9007199254740993', '9007199254740992.000', 'PRIVATE_CITATION_CANARY',
                  'UNSELECTED_TARGET_CANARY', 'UNSELECTED_NOTES_CANARY', 'e' * 64):
            self.assertNotIn(x, text)
        self.assertNotIn('UNSELECTED_TARGET_CANARY', json.dumps(private))
        self.assertNotIn('UNSELECTED_NOTES_CANARY', json.dumps(private))

    def test_signed_zero_and_original_spelling(self):
        docs = documents(); first(docs).update(value=Num('-0.000e+0002'), reference_value=Num('1e-1024'), tolerance=Num('-0'))
        report, private = self.inspect(docs)
        self.assertTrue(report['all_144_pairs_complete']); self.assertTrue(report['optional_tolerances_usable_or_absent'])
        one = private['units'][0]['positions'][0]['records'][0]
        self.assertEqual(one['value']['serialized_number'], '-0.000e+0002')
        self.assertEqual(one['reference_value']['serialized_number'], '1e-1024')

    def test_exact_engineering_boundaries(self):
        valid = ['9' * 128, '1e1024', '1e-1024', '0.1e-1023', '1e+' + '0' * 100 + '1024']
        invalid = ['9' * 129, '1e1025', '1e-1025', '0.1e-1024', '1e' + '9' * 1000]
        for token in valid + invalid:
            with self.subTest(token=token[:40]):
                parsed = p.BoundedJSON(token.encode()).parse()
                result = p._numeric(parsed)
                self.assertEqual(result['state'], 'VALID_EXACT_JSON_NUMBER' if token in valid else 'NUMBER_OUTSIDE_ENGINEERING_LIMIT')
                self.assertEqual(result['serialized_number'], token)

    def test_out_of_limit_is_retained_without_global_failure(self):
        docs = documents(); first(docs)['value'] = Num('1e1025')
        report, private = self.inspect(docs)
        self.assertEqual(report['status'], 'RECORDED_LABEL_INSPECTION_COMPLETE')
        self.assertFalse(report['all_144_pairs_complete'])
        self.assertEqual(report['positions'][0]['value_state'], 'NUMBER_OUTSIDE_ENGINEERING_LIMIT')
        self.assertEqual(private['units'][0]['positions'][0]['records'][0]['value']['serialized_number'], '1e1025')

    def test_no_number_coercion(self):
        for value, kind in [(True, 'BOOLEAN'), ('1.0', 'STRING'), ([], 'ARRAY'), ({'x': 1}, 'OBJECT')]:
            docs = documents(); first(docs)['value'] = value
            report, private = self.inspect(docs)
            self.assertEqual(report['positions'][0]['value_state'], 'NOT_JSON_NUMBER')
            raw = private['units'][0]['positions'][0]['records'][0]['value']
            self.assertIsNone(raw['serialized_number']); self.assertEqual(raw['non_numeric_type'], kind)

    def test_missing_and_null_labels(self):
        for field in ('value', 'reference_value'):
            for remove in (True, False):
                docs = documents()
                if remove: first(docs).pop(field)
                else: first(docs)[field] = None
                report, private = self.inspect(docs)
                self.assertEqual(report['positions'][0][field + '_state'], 'MISSING' if remove else 'NULL')
                self.assertFalse(report['all_144_pairs_complete'])

    def test_absent_position_retained(self):
        docs = documents(); docs[SPECS[0]['path']]['properties'].pop(0)
        report, private = self.inspect(docs)
        self.assertEqual(report['positions'][0]['record_state'], 'ABSENT')
        self.assertEqual(private['units'][0]['positions'][0]['records'], [])
        self.assertEqual(report['counts']['positions_inspected'], 144)

    def test_duplicate_position_never_selects(self):
        docs = documents(); duplicate = copy.deepcopy(first(docs)); duplicate['value'] = Num('17.25')
        docs[SPECS[0]['path']]['properties'].append(duplicate)
        report, private = self.inspect(docs)
        self.assertEqual(report['positions'][0]['record_state'], 'AMBIGUOUS')
        self.assertEqual(report['positions'][0]['value_state'], 'NOT_CHECKED')
        rows = private['units'][0]['positions'][0]['records']
        self.assertEqual([r['value']['serialized_number'] for r in rows], ['9007199254740993', '17.25'])
        self.assertFalse(report['all_144_pairs_complete'])

    def test_literal_unit_states(self):
        for value, state in [(None, 'NULL'), (True, 'INVALID_TYPE'), ('j/m^2', 'MISMATCH'), ('eV', 'MISMATCH')]:
            docs = documents(); first(docs)['unit'] = value
            report, private = self.inspect(docs); self.assertEqual(report['positions'][0]['unit_state'], state)
        docs = documents(); first(docs).pop('unit')
        self.assertEqual(self.inspect(docs)[0]['positions'][0]['unit_state'], 'MISSING')

    def test_citation_states_independent_of_numeric_pairs(self):
        for value, state in [(None, 'NULL'), (False, 'INVALID_TYPE'), ('', 'EMPTY'), (' \t\n', 'WHITESPACE_ONLY'), ('1.2', 'NONEMPTY_STRING')]:
            docs = documents(); first(docs)['reference_source'] = value
            report, private = self.inspect(docs)
            self.assertTrue(report['all_144_pairs_complete'])
            self.assertEqual(report['positions'][0]['citation_state'], state)
        docs = documents(); first(docs).pop('reference_source')
        self.assertEqual(self.inspect(docs)[0]['positions'][0]['citation_state'], 'MISSING')

    def test_tolerance_is_separate_exact_optional(self):
        for token, state in [('-1e-1024', 'NEGATIVE'), ('-0', 'VALID_EXACT_JSON_NUMBER'), ('0.0', 'VALID_EXACT_JSON_NUMBER'), ('1e1025', 'NUMBER_OUTSIDE_ENGINEERING_LIMIT')]:
            docs = documents(); first(docs)['tolerance'] = Num(token)
            report, private = self.inspect(docs)
            self.assertTrue(report['all_144_pairs_complete'])
            self.assertEqual(report['positions'][0]['tolerance_state'], state)
        docs = documents(); first(docs).pop('tolerance')
        report, private = self.inspect(docs); self.assertTrue(report['optional_tolerances_usable_or_absent'])

    def test_schema_context_and_provenance_fail_closed(self):
        cases = [(lambda d: d.update(schema='other'), 'SCHEMA_MISMATCH'),
                 (lambda d: d.update(material='WRONG_PRIVATE_MATERIAL'), 'CONTEXT_MISMATCH'),
                 (lambda d: d['source'].update(model_id='other'), 'CONTEXT_MISMATCH'),
                 (lambda d: d['provenance'].update(inputs_sha256='A' * 64), 'PROVENANCE_LAYOUT')]
        for mutate, reason in cases:
            docs = documents(); mutate(docs[SPECS[0]['path']])
            self.assert_blocked(*self.inspect(docs), reason)

    def test_property_container_layout(self):
        for value in ({}, [None], [{'name': None}]):
            docs = documents(); docs[SPECS[0]['path']]['properties'] = value
            self.assert_blocked(*self.inspect(docs), 'PROPERTIES_LAYOUT')

    def test_property_list_limit(self):
        # The full source cap prevents 513 named rows; isolate the declared list limit with a lower test cap.
        docs = documents()
        with mock.patch.object(p, 'MAX_PROPERTIES', 5):
            self.assertEqual(self.inspect(docs)[0]['status'], 'RECORDED_LABEL_INSPECTION_COMPLETE')
        with mock.patch.object(p, 'MAX_PROPERTIES', 4):
            self.assert_blocked(*self.inspect(docs), 'PROPERTY_LIMIT')

    def test_last_context_failure_has_complete_parse_but_partial_projection(self):
        docs = documents(); docs[SPECS[-1]['path']]['material'] = 'WRONG'
        report, private = self.inspect(docs)
        self.assert_blocked(report, private, 'CONTEXT_MISMATCH')
        self.assertTrue(report['exposure']['whole_json_parse_completed'])
        self.assertEqual(report['counts']['positions_inspected'], 140)
        self.assertTrue(report['exposure']['selected_historical_labels_materialized'])

    def test_partial_selected_interpretation_is_reported(self):
        original = p._numeric; calls = []
        def number(*args, **kwargs):
            calls.append(None)
            if len(calls) == 2: raise RuntimeError('PRIVATE_FAILURE_CANARY')
            return original(*args, **kwargs)
        with mock.patch.object(p, '_numeric', side_effect=number):
            report, private = self.inspect(documents())
        self.assert_blocked(report, private, 'UNEXPECTED_FAILURE')
        self.assertTrue(report['exposure']['selected_historical_labels_materialization_started'])
        self.assertFalse(report['exposure']['selected_historical_labels_materialized'])
        self.assertEqual(report['counts']['positions_inspected'], 0)
        self.assertNotIn('PRIVATE_FAILURE_CANARY', json.dumps(report))

    def test_late_json_failure_retains_first35(self):
        data = payloads(); data[SPECS[-1]['path']] = b'{bad'
        report, private = p.inspect_synthetic(data, FRAME_RAW, INPUTS_RAW)
        self.assert_blocked(report, private, 'JSON_SYNTAX')
        self.assertEqual(report['counts']['positions_inspected'], 140)
        self.assertFalse(report['exposure']['whole_json_parse_completed'])

    def test_first_label_issue_is_not_replaced(self):
        docs = documents(); first(docs).pop('value')
        docs[SPECS[-1]['path']]['properties'][0]['reference_value'] = None
        report, private = self.inspect(docs)
        self.assertEqual(report['first_label_issue']['unit_id'], UNITS[SPECS[0]['path']]['unit_id'])
        self.assertEqual(report['first_label_issue']['value_state'], 'MISSING')
        self.assertEqual(report['counts']['pairs_complete'], 142)

    def test_opaque_unselected_values_do_not_change_classification(self):
        a = documents(); b = copy.deepcopy(a)
        for d in b.values():
            d['unused_notes'] = 'ALTERNATE_UNSELECTED_CANARY'
            d['properties'][-1]['value'] = Num('1e99999999')
        ra, pa = self.inspect(a); rb, pb = self.inspect(b)
        ra.pop('input_bindings'); rb.pop('input_bindings')
        self.assertEqual(ra, rb); self.assertEqual(pa, pb)

    def test_pins_and_argument_metadata_before_hashing_buffers(self):
        data = payloads(); original = p.sha
        def guarded(raw):
            if raw in data.values(): raise AssertionError('buffer was hashed')
            return original(raw)
        with mock.patch.object(p, 'sha', side_effect=guarded):
            self.assert_blocked(*p.inspect_synthetic(data, FRAME_RAW + b' ', INPUTS_RAW), 'FRAME_IDENTITY')
            self.assert_blocked(*p.inspect_synthetic(data, FRAME_RAW, INPUTS_RAW + b' '), 'INPUTS_IDENTITY')
            data[SPECS[-1]['path']] = b'x' * (SPECS[-1]['bytes'] + 1)
            self.assert_blocked(*p.inspect_synthetic(data, FRAME_RAW, INPUTS_RAW), 'SOURCE_BINDING')

    def test_known_actual_identity_refused_with_generated_hash_stub(self):
        data = payloads(); target = data[SPECS[0]['path']]; original = p.sha
        def digest(raw): return SPECS[0]['sha256'] if raw == target else original(raw)
        with mock.patch.object(p, 'sha', side_effect=digest):
            report, private = p.inspect_synthetic(data, FRAME_RAW, INPUTS_RAW)
        self.assert_blocked(report, private, 'ACTUAL_INPUT_FORBIDDEN')
        self.assertFalse(report['exposure']['objects'][0]['json_parse_started'])


class ParserTests(unittest.TestCase):
    def test_strict_syntax_duplicate_decoded_keys_utf8(self):
        for raw, reason in [(b'{"a":0,"\\u0061":1}', 'JSON_DUPLICATE_KEY'),
            (b'NaN', 'JSON_SYNTAX'), (b'Infinity', 'JSON_SYNTAX'), (b'01', 'JSON_SYNTAX'),
            (b'[1,]', 'JSON_SYNTAX'), (b'"\xff"', 'JSON_UTF8'),
            (b'"\\ud800"', 'JSON_SURROGATE'), (b'{}x', 'JSON_SYNTAX')]:
            with self.subTest(raw=raw), self.assertRaisesRegex(p.ProjectionError, reason): p.BoundedJSON(raw).parse()
        self.assertEqual(p.BoundedJSON(b'"\\ud83d\\ude00"').parse(), '\U0001f600')

    def test_depth_node_string_limits(self):
        p.BoundedJSON(b'[' * 31 + b'0' + b']' * 31).parse()
        with self.assertRaisesRegex(p.ProjectionError, 'JSON_DEPTH_LIMIT'): p.BoundedJSON(b'[' * 32 + b'0' + b']' * 32).parse()
        p.BoundedJSON(b'[' + b'0,' * 19998 + b'0]').parse()
        with self.assertRaisesRegex(p.ProjectionError, 'JSON_NODE_LIMIT'): p.BoundedJSON(b'[' + b'0,' * 19999 + b'0]').parse()
        p.BoundedJSON(b'"' + b'a' * 16384 + b'"').parse()
        with self.assertRaisesRegex(p.ProjectionError, 'JSON_STRING_LIMIT'): p.BoundedJSON(b'"' + b'a' * 16385 + b'"').parse()


class FileTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=HERE); self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name); self.data = payloads(); self.specs = fixture_specs(self.data)
        self.paths = {}
        for i, (name, raw) in enumerate(self.data.items()):
            self.paths[name] = self.root / f'{i}.json'; self.paths[name].write_bytes(raw)
        self.slot = self.root / 'slot'

    def run_fixture(self):
        return p.run_synthetic_files(self.paths, self.specs, FRAME_RAW, INPUTS_RAW, self.slot)

    def test36_read_once_and_exclusive_slot(self):
        with mock.patch.object(p, '_read_once', wraps=p._read_once) as read:
            report = self.run_fixture(); self.assertEqual(read.call_count, 36)
            self.assertEqual([x.args[1] for x in read.call_args_list], [x['bytes'] for x in self.specs])
        self.assertTrue(report['exposure']['private_projection_written'])
        before = {x.name: x.read_bytes() for x in self.slot.iterdir()}
        with mock.patch.object(p, '_read_once', side_effect=AssertionError('must not read')):
            self.assertEqual(self.run_fixture()['reason'], 'OUTPUT_RESERVATION')
        self.assertEqual(before, {x.name: x.read_bytes() for x in self.slot.iterdir()})

    def test_changed_first_source_stops_before_second(self):
        self.paths[SPECS[0]['path']].write_bytes(b'changed')
        with mock.patch.object(p, '_read_once', wraps=p._read_once) as read:
            report = self.run_fixture(); self.assertEqual(read.call_count, 1)
        self.assertEqual(report['reason'], 'SOURCE_IDENTITY')
        self.assertFalse(report['exposure']['objects'][0]['json_parse_started'])

    def test_symlinks_and_actual_specs_refused(self):
        name = SPECS[0]['path']; link = self.root / 'link'; link.symlink_to(self.paths[name]); self.paths[name] = link
        self.assertEqual(self.run_fixture()['reason'], 'SOURCE_PATH')
        other = self.root / 'other'
        with mock.patch.object(p, '_read_once', side_effect=AssertionError('must not read')):
            report = p.run_synthetic_files(self.paths, SPECS, FRAME_RAW, INPUTS_RAW, other)
        self.assertEqual(report['reason'], 'ACTUAL_INPUT_FORBIDDEN')

    def test_guard_change_before_second_source(self):
        count = []
        def guard():
            count.append(None)
            if len(count) == 3: p.fail('SOURCE_BINDING')
        report = p._run_files(self.paths, self.specs, FRAME_RAW, INPUTS_RAW, self.slot, True, guard)
        self.assertEqual(report['reason'], 'SOURCE_BINDING')
        self.assertTrue(report['exposure']['objects'][0]['read_completed'])
        self.assertFalse(report['exposure']['objects'][1]['read_started'])

    def test_public_write_failure_preserves_private_write(self):
        original = p._write_new
        def write(path, value):
            if path.name == 'public.json': raise OSError('PRIVATE_ERROR_CANARY')
            original(path, value)
        with mock.patch.object(p, '_write_new', side_effect=write): report = self.run_fixture()
        self.assertEqual(report['reason'], 'OUTPUT_WRITE')
        self.assertTrue(report['exposure']['private_projection_written']); self.assertTrue(report['private_output_may_exist'])
        self.assertNotIn('PRIVATE_ERROR_CANARY', json.dumps(report))

    def test_partial_private_write_is_not_hidden(self):
        original = p._write_new
        def write(path, value):
            if path.name == 'private.json':
                path.write_bytes(b'PARTIAL_PRIVATE_FIXTURE'); raise OSError('private write failed')
            original(path, value)
        with mock.patch.object(p, '_write_new', side_effect=write): report = self.run_fixture()
        self.assertEqual(report['reason'], 'OUTPUT_WRITE')
        self.assertFalse(report['exposure']['private_projection_written']); self.assertTrue(report['private_output_may_exist'])

    def test_processing_failure_remains_first_after_output_failure(self):
        self.paths[SPECS[0]['path']].unlink(); original = p._write_new
        def write(path, value):
            if path.name == 'public.json': raise OSError('do not disclose')
            original(path, value)
        with mock.patch.object(p, '_write_new', side_effect=write): report = self.run_fixture()
        self.assertEqual(report['reason'], 'SOURCE_READ'); self.assertEqual(report['output_error'], 'OUTPUT_WRITE')


if __name__ == '__main__': unittest.main(verbosity=2)
