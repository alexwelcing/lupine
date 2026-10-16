"""Generated author fixtures only; no retained numerical labels or real wrapper invocation."""
import copy
from fractions import Fraction
import hashlib
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import census as c

ROOT = Path(__file__).absolute().parents[2]
FRAME_RAW = (ROOT / c.FRAME_PATH).read_bytes()
READINESS_RAW = (ROOT / c.READINESS_PATH).read_bytes()
FRAME = json.loads(FRAME_RAW)
MODELS = sorted({u['model_id'] for u in FRAME['units']})
MATERIALS = sorted({u['material'] for u in FRAME['units']})

def number(token):
    return {'state': 'VALID_EXACT_JSON_NUMBER', 'serialized_number': token, 'non_numeric_type': None}

def fixture():
    units = []
    for u in FRAME['units']:
        positions = []
        m, material = MODELS.index(u['model_id']), MATERIALS.index(u['material'])
        for p, prop in enumerate(c.PROPERTIES):
            reference = 20 + 3 * material + p
            record = {'property_array_ordinal': p,
                'unit': {'state': 'MATCH', 'literal': 'eV' if prop == 'vacancy_formation_energy' else 'J/m^2'},
                'value': number(str(reference + m - 2)), 'reference_value': number(str(reference)),
                'reference_source': {'state': 'NONEMPTY_STRING', 'literal': 'CITATION_CANARY_' + u['material'] + '_' + prop},
                'tolerance': {'state': 'NULL', 'serialized_number': None, 'non_numeric_type': None}}
            positions.append({'unit_id': u['unit_id'], 'property': prop, 'record_state': 'SINGLE',
                'actual_reference_choice': 'UNKNOWN', 'records': [record]})
        units.append({'unit_id': u['unit_id'], 'source_path': u['existing_artifact_paths_not_opened_by_proposed_pass'][2],
            'declared_inputs_sha256': 'a' * 64, 'positions': positions})
    return {'schema': 'lupine.rhizo.private-recorded-labels.v1',
        'warning': 'EXPOSED_HISTORICAL_NUMERICAL_LABELS_AND_CITATIONS_NO_FRESH_HOLDOUT',
        'actual_reference_choice': 'UNKNOWN', 'scientific_status': 'NOT_ADMITTED', 'units': units}

def run(value):
    return c.inspect_synthetic(c.canonical(value), FRAME_RAW, READINESS_RAW)

def record(value, u=0, p=0):
    return value['units'][u]['positions'][p]['records'][0]

def rational(value):
    return Fraction(int(value['numerator']), int(value['denominator']))

class CensusTests(unittest.TestCase):
    def assert_blocked(self, value, reason=None):
        public, private = run(value)
        self.assertEqual(public['status'], 'BLOCKED')
        if reason: self.assertEqual(public['reason'], reason)
        self.assertIsNone(public['groups']); self.assertIsNone(public['reference_equality']); self.assertIsNone(private)
        return public

    def test_complete144_exact16_groups(self):
        public, private = run(fixture())
        self.assertEqual(public['status'], 'DESCRIPTIVE_CENSUS_COMPLETE')
        self.assertEqual((len(private['positions']), len(public['groups']), len(public['reference_equality'])), (144, 16, 36))
        for group in public['groups']:
            delta = MODELS.index(group['model_id']) - 2
            self.assertEqual(group['count'], 9)
            for kind, exact in [('signed', delta), ('absolute', abs(delta)), ('squared', delta * delta)]:
                self.assertEqual(rational(group['sum_' + kind + '_discrepancy']), 9 * exact)
                self.assertEqual(rational(group['mean_' + kind + '_discrepancy']), exact)
        self.assertEqual(public['scientific_status'], 'NOT_ADMITTED')
        self.assertEqual(public['actual_reference_choice'], 'UNKNOWN')
        self.assertIsNone(public['model_ranking_or_winner'])

    def test_reordering_has_fixed_output_order(self):
        v = fixture(); a, p = run(v)
        v['units'].reverse()
        for u in v['units']: u['positions'].reverse()
        b, q = run(v)
        for key in ('groups', 'reference_equality'): self.assertEqual(a[key], b[key])
        self.assertEqual(p['positions'], q['positions'])

    def test_private_citation_tokens_and_declared_hash_absent_public(self):
        public, private = run(fixture()); serialized = json.dumps(public)
        self.assertNotIn('CITATION_CANARY_', serialized); self.assertNotIn('a' * 64, serialized)
        self.assertNotIn('prediction_token', serialized); self.assertNotIn('stored_reference_token', serialized)
        self.assertIn('CITATION_CANARY_', json.dumps(private))

    def test_reference_equality_not_assumed(self):
        v = fixture(); record(v)['reference_value'] = number('999')
        public, _ = run(v)
        unequal = [x for x in public['reference_equality'] if x['stored_reference_equality'] == 'STORED_REFERENCES_DIFFER']
        self.assertEqual(len(unequal), 1)
        self.assertFalse(unequal[0]['common_physical_truth_established'])
        self.assertEqual(unequal[0]['actual_reference_choice'], 'UNKNOWN')

    def test_reference_rational_token_citation_equality_separate(self):
        v = fixture(); r = record(v); r['reference_value'] = number(r['reference_value']['serialized_number'] + '.00')
        r['reference_source']['literal'] = 'DIFFERENT_PRIVATE_CITATION'
        public, _ = run(v); row = next(x for x in public['reference_equality'] if x['material'] == v['units'][0]['unit_id'].split('_')[0] and x['property'] == c.PROPERTIES[0])
        self.assertEqual(row['stored_reference_equality'], 'ALL_STORED_REFERENCES_EQUAL')
        self.assertFalse(row['token_spellings_equal']); self.assertFalse(row['citation_literals_equal'])

    def test_signed_zero_preserved_privately_equal_rational(self):
        v = fixture()
        for i, u in enumerate(v['units']):
            r = u['positions'][0]['records'][0]
            r['reference_value'] = number('-0.0' if i % 2 else '0e3')
            r['value'] = number('-0')
        public, private = run(v)
        for row in private['positions']:
            if row['property'] == c.PROPERTIES[0]:
                self.assertEqual(row['prediction_token'], '-0')
                self.assertEqual(row['signed_discrepancy'], {'numerator': '0', 'denominator': '1'})
        self.assertTrue(all(x['stored_reference_equality'] == 'ALL_STORED_REFERENCES_EQUAL' for x in public['reference_equality']))

    def test_exact_mean_has_nondecimal_denominator(self):
        v = fixture()
        for u in v['units']:
            for p in u['positions']:
                p['records'][0]['value'] = number('0'); p['records'][0]['reference_value'] = number('0')
        record(v)['value'] = number('1')
        public, _ = run(v)
        group = next(g for g in public['groups'] if g['model_id'] == FRAME['units'][0]['model_id'] and g['property'] == c.PROPERTIES[0])
        self.assertEqual(group['mean_signed_discrepancy'], {'numerator': '1', 'denominator': '9'})

    def test_squared_units_separate(self):
        public, _ = run(fixture())
        for g in public['groups']:
            self.assertEqual(g['squared_unit'], 'eV^2' if g['unit'] == 'eV' else '(J/m^2)^2')
        self.assertEqual(len({(g['model_id'], g['property'], g['unit']) for g in public['groups']}), 16)

    def test_exact_numeric_lexemes_and_limits(self):
        for token, exact in [('9007199254740993', Fraction(9007199254740993)), ('1e-1024', Fraction(1, 10 ** 1024)),
                             ('-2.5e2', Fraction(-250)), ('0e+000000001024', Fraction(0)), ('1.25', Fraction(5, 4))]:
            self.assertEqual(c._token_fraction(token), exact)
        for token in (True, False, None, 1, 'NaN', 'Infinity', '-Infinity', '+1', '01', '1.', '.1', ' 1', '1e', '9' * 129, '1e1025', '0.1e-1024'):
            with self.subTest(token=token):
                with self.assertRaises(c.CensusError): c._token_fraction(token)

    def test_worst_allowed_square_exceeds_python_digit_default(self):
        import sys
        before = sys.get_int_max_str_digits()
        v = fixture(); record(v)['value'] = number('9' * 128 + 'e1024'); record(v)['reference_value'] = number('1e-1024')
        public, private = run(v)
        self.assertEqual(public['status'], 'DESCRIPTIVE_CENSUS_COMPLETE')
        squared = private['positions'][0]['squared_discrepancy']
        self.assertGreater(len(squared['numerator']), 4300); self.assertLessEqual(len(squared['numerator']), 5000)
        self.assertEqual(sys.get_int_max_str_digits(), before)

    def test_frame_and_readiness_pin_failure_precedes_projection_hash(self):
        for frame, ready in [(FRAME_RAW + b' ', READINESS_RAW), (FRAME_RAW, READINESS_RAW + b' ')]:
            public, private = c.inspect_synthetic(b'{PRIVATE_INVALID', frame, ready)
            self.assertIsNone(private); self.assertIsNone(public['projection_sha256'])
            self.assertFalse(public['exposure']['whole_projection_parse_started'])

    def test_missing_duplicate_extra_unit_rejected(self):
        for change in ('missing', 'duplicate', 'extra'):
            v = fixture()
            if change == 'missing': v['units'].pop()
            elif change == 'duplicate': v['units'][-1] = copy.deepcopy(v['units'][0])
            else: v['units'].append(copy.deepcopy(v['units'][0]))
            self.assert_blocked(v, 'FRAME_INCOMPLETE_OR_DUPLICATE')

    def test_missing_duplicate_extra_property_rejected(self):
        for change in ('missing', 'duplicate', 'extra'):
            v = fixture(); ps = v['units'][0]['positions']
            if change == 'missing': ps.pop()
            elif change == 'duplicate': ps[-1] = copy.deepcopy(ps[0])
            else: ps.append(copy.deepcopy(ps[0]))
            self.assert_blocked(v, 'FRAME_INCOMPLETE_OR_DUPLICATE')

    def test_record_ambiguity_and_context_drift(self):
        v = fixture(); v['units'][0]['positions'][0]['records'] *= 2; self.assert_blocked(v, 'RECORD_LAYOUT')
        v = fixture(); v['units'][0]['source_path'] += '.other'; self.assert_blocked(v, 'CONTEXT_MISMATCH')
        v = fixture(); record(v)['unit']['literal'] = 'eV'; self.assert_blocked(v, 'UNIT_MISMATCH')
        v = fixture(); v['units'][0]['declared_inputs_sha256'] = 'G' * 64; self.assert_blocked(v, 'PROVENANCE_INVALID')

    def test_unknown_fields_and_missing_schema_rejected(self):
        v = fixture(); v['extra'] = 1; self.assert_blocked(v, 'PROJECTION_SCHEMA')
        v = fixture(); record(v)['extra'] = 1; self.assert_blocked(v, 'RECORD_LAYOUT')
        v = fixture(); del v['schema']; self.assert_blocked(v, 'PROJECTION_SCHEMA')

    def test_ordinals_bool_negative_fraction_duplicate_and_bound(self):
        for value in (True, -1, 1.0, '0', 512):
            v = fixture(); record(v)['property_array_ordinal'] = value; self.assert_blocked(v, 'ORDINAL_INVALID')
        v = fixture(); record(v, p=1)['property_array_ordinal'] = 0; self.assert_blocked(v, 'ORDINAL_INVALID')

    def test_numeric_state_token_bool_nonfinite_mismatch(self):
        for value in (True, None, 1, 'NaN', '1e1025'):
            v = fixture(); record(v)['value']['serialized_number'] = value; self.assert_blocked(v)
        v = fixture(); record(v)['value']['state'] = 'NULL'; self.assert_blocked(v, 'NUMBER_INVALID')
        v = fixture(); record(v)['value']['non_numeric_type'] = 'BOOLEAN'; self.assert_blocked(v, 'NUMBER_INVALID')

    def test_citation_and_tolerance_not_silent_policy(self):
        for citation in ('', '  ', None, 1):
            v = fixture(); record(v)['reference_source']['literal'] = citation; self.assert_blocked(v, 'CITATION_INVALID')
        v = fixture(); record(v)['tolerance'] = number('0'); self.assert_blocked(v, 'TOLERANCE_MISMATCH')
        v = fixture(); del record(v)['tolerance']; self.assert_blocked(v, 'RECORD_LAYOUT')

    def test_strict_duplicate_utf8_surrogate_nonfinite_json(self):
        for raw, reason in [(b'{"x":1,"\\u0078":2}', 'JSON_DUPLICATE_KEY'), (b'\xff', 'JSON_UTF8'),
                            (b'"\\ud800"', 'JSON_SURROGATE'), (b'NaN', 'JSON_SYNTAX')]:
            public, private = c.inspect_synthetic(raw, FRAME_RAW, READINESS_RAW)
            self.assertEqual(public['reason'], reason); self.assertIsNone(private)

    def test_parser_depth_node_string_bounds(self):
        c.BoundedJSON(b'[' * 31 + b'0' + b']' * 31).parse()
        with self.assertRaises(c.CensusError): c.BoundedJSON(b'[' * 32 + b'0' + b']' * 32).parse()
        c.BoundedJSON(json.dumps('x' * c.MAX_STRING).encode()).parse()
        with self.assertRaises(c.CensusError): c.BoundedJSON(json.dumps('x' * (c.MAX_STRING + 1)).encode()).parse()
        c.BoundedJSON(b'[' + b'0,' * (c.MAX_NODES - 2) + b'0]').parse()
        with self.assertRaises(c.CensusError): c.BoundedJSON(b'[' + b'0,' * (c.MAX_NODES - 1) + b'0]').parse()

    def test_late_failure_retains_parse_and_partial_numbers(self):
        v = fixture(); record(v, u=35, p=3)['reference_value'] = number('NaN')
        public = self.assert_blocked(v, 'NUMBER_INVALID'); e = public['exposure']
        self.assertTrue(e['whole_projection_parse_completed']); self.assertEqual(e['positions_validated'], 143)
        self.assertEqual(e['numbers_materialized'], 287); self.assertFalse(e['arithmetic_started'])

    def test_injected_partial_numeric_arithmetic_failures(self):
        original = c._numeric; calls = []
        def fail_second(value):
            calls.append(1)
            if len(calls) == 2: raise RuntimeError('PRIVATE_HELPER_CANARY')
            return original(value)
        with patch.object(c, '_numeric', fail_second): public = self.assert_blocked(fixture(), 'UNEXPECTED_FAILURE')
        self.assertTrue(public['exposure']['selected_numbers_materialization_started'])
        self.assertEqual(public['exposure']['numbers_materialized'], 1)
        self.assertNotIn('PRIVATE_HELPER_CANARY', json.dumps(public))
        with patch.object(c, '_rational', side_effect=RuntimeError('CANARY')): public = self.assert_blocked(fixture(), 'UNEXPECTED_FAILURE')
        self.assertTrue(public['exposure']['arithmetic_started']); self.assertEqual(public['exposure']['positions_computed'], 0)

    def test_explicit_lowered_output_cap_failure(self):
        with patch.object(c, 'MAX_PRIVATE', 1): public = self.assert_blocked(fixture(), 'OUTPUT_LIMIT')
        self.assertEqual(public['exposure']['positions_computed'], 144)
        self.assertEqual(public['exposure']['groups_computed'], 16)

class FileTests(unittest.TestCase):
    def invoke(self, base, raw=None, expected=None, slot='slot', guard=None):
        raw = c.canonical(fixture()) if raw is None else raw
        path = Path(base) / 'generated.json'
        if not path.exists(): path.write_bytes(raw)
        expected = expected or {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}
        if guard is None: return c.run_synthetic_file(path, expected, FRAME_RAW, READINESS_RAW, Path(base) / slot)
        return c._run_file(path, expected, FRAME_RAW, READINESS_RAW, Path(base) / slot, synthetic=True, guard=guard)

    def test_generated_file_once_and_exclusive_slot(self):
        with tempfile.TemporaryDirectory() as d:
            report = self.invoke(d)
            self.assertEqual(report['status'], 'DESCRIPTIVE_CENSUS_COMPLETE')
            self.assertTrue(report['exposure']['private_projection_written'])
            public_path = Path(d) / 'slot/public.json'; before = public_path.read_bytes()
            self.assertEqual(c.canonical(report), before)
            again = self.invoke(d)
            self.assertEqual(again['reason'], 'OUTPUT_RESERVATION')
            self.assertFalse(again['exposure']['raw_buffer_read_started'])
            self.assertEqual(public_path.read_bytes(), before)

    def test_bounded_read_identity_mismatch_preserves_exposure(self):
        with tempfile.TemporaryDirectory() as d:
            report = self.invoke(d, expected={'bytes': 8, 'sha256': '0' * 64})
            self.assertEqual(report['reason'], 'SOURCE_IDENTITY')
            self.assertTrue(report['exposure']['raw_buffer_read_completed'])
            self.assertFalse(report['exposure']['whole_projection_parse_started'])

    def test_symlink_and_actual_path_rejected_without_read(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'target'; path.write_bytes(b'x'); link = Path(d) / 'link'; link.symlink_to(path)
            report = c.run_synthetic_file(link, {'bytes': 1, 'sha256': c.sha(b'x')}, FRAME_RAW, READINESS_RAW, Path(d) / 'slot')
            self.assertEqual(report['reason'], 'SOURCE_PATH')
            forbidden = Path(d) / c.ACTUAL_PROJECTION
            report = c.run_synthetic_file(forbidden, {'bytes': 1, 'sha256': c.sha(b'x')}, FRAME_RAW, READINESS_RAW, Path(d) / 'slot2')
            self.assertEqual(report['reason'], 'ACTUAL_INPUT_FORBIDDEN')
            self.assertFalse(report['exposure']['raw_buffer_read_started'])

    def test_fixture_guard_failure_before_read_and_before_output(self):
        for fail_at in (1, 2, 3):
            with self.subTest(fail_at=fail_at), tempfile.TemporaryDirectory() as d:
                calls = []
                def guard():
                    calls.append(1)
                    if len(calls) == fail_at: c.fail('SOURCE_CONTEXT_CHANGED')
                report = self.invoke(d, guard=guard)
                self.assertEqual(report['reason'], 'SOURCE_CONTEXT_CHANGED')
                self.assertEqual(report['exposure']['raw_buffer_read_started'], fail_at == 3)
                self.assertFalse(report['exposure']['private_projection_written'])
                self.assertIsNone(report['groups'])

    def test_private_partial_write_and_public_write_failure(self):
        original = c._write_new
        for target in ('census-private.json', 'public.json'):
            with self.subTest(target=target), tempfile.TemporaryDirectory() as d:
                def write(path, value):
                    if path.name == target:
                        path.write_bytes(b'PARTIAL'); raise OSError('PRIVATE_WRITE_CANARY')
                    return original(path, value)
                with patch.object(c, '_write_new', write): report = self.invoke(d)
                self.assertEqual(report['reason'], 'OUTPUT_WRITE')
                self.assertTrue(report['exposure']['private_output_may_exist'])
                self.assertEqual(report['exposure']['private_projection_written'], target == 'public.json')
                self.assertIsNone(report['groups']); self.assertNotIn('PRIVATE_WRITE_CANARY', json.dumps(report))

    def test_processing_failure_not_replaced_by_output_failure(self):
        with tempfile.TemporaryDirectory() as d:
            original = c._write_new
            def write(path, value):
                if path.name == 'public.json': raise OSError('CANARY')
                return original(path, value)
            with patch.object(c, '_write_new', write): report = self.invoke(d, raw=b'NaN')
            self.assertEqual(report['reason'], 'JSON_SYNTAX'); self.assertEqual(report['output_error'], 'OUTPUT_WRITE')

if __name__ == '__main__':
    unittest.main(verbosity=2)
