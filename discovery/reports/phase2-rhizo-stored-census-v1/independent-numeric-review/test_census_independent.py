"""Independent adversarial census tests. Candidate is injected only after freeze."""
import copy
import hashlib
import json
import sys
import unittest
from fractions import Fraction
import generated_fixtures as fx

CANDIDATE = None
UNSUPPLIED = object()
CASE_COUNTER = {'candidate_invocations': 0, 'negative_cases': 0, 'summary_rational_comparisons': 0,
                'private_position_rational_comparisons': 0, 'equality_group_comparisons': 0}


def record(projection, ui=0, pi=0):
    return projection['units'][ui]['positions'][pi]['records'][0]


class IndependentCensusTests(unittest.TestCase):
    def invoke(self, projection=None, *, projection_raw=UNSUPPLIED, frame_raw=None, readiness_raw=None):
        CASE_COUNTER['candidate_invocations'] += 1
        return CANDIDATE.inspect_synthetic(
            fx.raw(projection if projection is not None else fx.fixture()) if projection_raw is UNSUPPLIED else projection_raw,
            fx.FRAME_RAW if frame_raw is None else frame_raw,
            fx.READINESS_RAW if readiness_raw is None else readiness_raw)

    def assert_blocked(self, projection=None, **kw):
        CASE_COUNTER['negative_cases'] += 1
        public, private = self.invoke(projection, **kw)
        self.assertIsNone(private)
        self.assertEqual(public['status'], 'BLOCKED')
        self.assertIn(public['reason'], CANDIDATE.ERRORS)
        self.assertIs(public['exposure']['private_projection_returned'], False)
        self.assertEqual(public['scientific_status'], 'NOT_ADMITTED')
        self.assertEqual(public['actual_reference_choice'], 'UNKNOWN')
        self.assertNotIn('GENERATED_CITATION_DO_NOT_PUBLIC', json.dumps(public))
        self.assertFalse(public.get('groups'))
        self.assertFalse(public.get('reference_equality'))
        return public

    def assert_exact(self, projection):
        """Final field bindings are completed from frozen source schema before running."""
        public, private = self.invoke(projection)
        self.assertIsNotNone(private)
        self.assertEqual(public['status'], 'DESCRIPTIVE_CENSUS_COMPLETE')
        self.assertIs(public['synthetic'], True)
        self.assertIs(public['exposure']['historical_target_bearing_labels_and_citations'], True)
        self.assertIs(public['exposure']['fresh_holdout_claim'], False)
        self.assertEqual(public['exposure']['positions_validated'], 144)
        self.assertEqual(public['exposure']['numbers_materialized'], 288)
        self.assertEqual(public['exposure']['positions_computed'], 144)
        self.assertEqual(public['exposure']['groups_computed'], 16)
        self.assertEqual(public['exposure']['reference_groups_computed'], 36)
        self.assertIsNone(public['model_ranking_or_winner'])
        self.assertIsNone(public['tolerance_success_criterion'])
        self.assertIs(public['binder_executed'], False)
        self.assertIs(public['reference_choice_reconstructed'], False)
        expected_groups, expected_equalities, expected_positions = fx.expected(projection)
        self.assertEqual(public['scientific_status'], 'NOT_ADMITTED')
        self.assertEqual(public['actual_reference_choice'], 'UNKNOWN')
        self.assertEqual(len(public['groups']), 16)
        got = {(g['model_id'], g['property'], g['unit']): g for g in public['groups']}
        self.assertEqual(set(got), set(expected_groups))
        for key, expected in expected_groups.items():
            self.assertEqual(got[key]['count'], 9)
            self.assertEqual(got[key]['fixed_position_weight'], 1)
            self.assertEqual(len(got[key]['unit_ids']), 9)
            self.assertEqual(len(set(got[key]['unit_ids'])), 9)
            self.assertEqual(got[key]['squared_unit'], 'eV^2' if key[2] == 'eV' else '(J/m^2)^2')
            for field, value in expected.items():
                if field == 'count':
                    continue
                self.assertEqual(fx.rational(got[key][field]), value)
                CASE_COUNTER['summary_rational_comparisons'] += 1
        equalities = public['reference_equality']
        self.assertEqual(len(equalities), 36)
        found = {(g['material'], g['structure'], g['property'], g['unit']): g for g in equalities}
        self.assertEqual(set(found), set(expected_equalities))
        for key, expected in expected_equalities.items():
            actual = found[key]
            self.assertEqual(set(actual['model_ids']), set(expected['models']))
            self.assertEqual(len(actual['model_ids']), 4)
            self.assertEqual(actual['stored_reference_equality'], 'ALL_STORED_REFERENCES_EQUAL' if expected['rational'] else 'STORED_REFERENCES_DIFFER')
            self.assertIs(actual['token_spellings_equal'], expected['token'])
            self.assertIs(actual['citation_literals_equal'], expected['citation'])
            self.assertEqual(actual['count'], 4)
            self.assertIs(actual['common_physical_truth_established'], False)
            self.assertEqual(actual['actual_reference_choice'], 'UNKNOWN')
            CASE_COUNTER['equality_group_comparisons'] += 1
        self.assertEqual(len(private['positions']), 144)
        rows = {(r['unit_id'], r['property']): r for r in private['positions']}
        self.assertEqual(set(rows), set(expected_positions))
        original = {(u['unit_id'], pos['property']): (u, pos['records'][0])
                    for u in projection['units'] for pos in u['positions']}
        for key, (unit, record) in original.items():
            self.assertEqual(rows[key]['prediction_token'], record['value']['serialized_number'])
            self.assertEqual(rows[key]['stored_reference_token'], record['reference_value']['serialized_number'])
            self.assertEqual(rows[key]['stored_reference_citation'], record['reference_source']['literal'])
            self.assertEqual(rows[key]['source_path'], unit['source_path'])
            self.assertEqual(rows[key]['declared_inputs_sha256'], unit['declared_inputs_sha256'])
            self.assertEqual(rows[key]['property_array_ordinal'], record['property_array_ordinal'])
        for key, values in expected_positions.items():
            for name, value in zip(('signed_discrepancy', 'absolute_discrepancy', 'squared_discrepancy'), values):
                self.assertEqual(fx.rational(rows[key][name]), value)
                CASE_COUNTER['private_position_rational_comparisons'] += 1
        return public, private

    def test_01_complete_independently_computed_rational_groups(self):
        self.assert_exact(fx.fixture())

    def test_02_permutation_is_not_population_selection(self):
        projection = fx.fixture()
        before = self.assert_exact(projection)
        projection['units'].reverse()
        for unit in projection['units']:
            unit['positions'].reverse()
        after = self.assert_exact(projection)
        self.assertEqual(before[0]['groups'], after[0]['groups'])
        self.assertEqual(before[0]['reference_equality'], after[0]['reference_equality'])

    def test_03_max_opposite_scale_squared_numerator(self):
        projection = fx.fixture()
        record(projection)['value'] = fx.numeric('9' * 128 + 'e1024')
        record(projection)['reference_value'] = fx.numeric('1e-1024')
        before_limit = sys.get_int_max_str_digits()
        public, _ = self.assert_exact(projection)
        self.assertEqual(sys.get_int_max_str_digits(), before_limit)
        self.assertTrue(any(len(g['sum_squared_discrepancy']['numerator']) > 4300 for g in public['groups']))

    def test_04_negative_zero_exactness_and_private_spelling(self):
        projection = fx.fixture()
        for unit in projection['units']:
            for position in unit['positions']:
                r = position['records'][0]
                r['value'] = fx.numeric('-0.000e+1024')
                r['reference_value'] = fx.numeric('0e-1024')
        public, private = self.assert_exact(projection)
        for group in public['groups']:
            for key in ('sum_signed_discrepancy', 'sum_absolute_discrepancy', 'sum_squared_discrepancy'):
                self.assertEqual(group[key], {'numerator': '0', 'denominator': '1'})
        self.assertIn('-0.000e+1024', json.dumps(private))

    def test_05_duplicate_missing_and_extra_units(self):
        for kind in ('duplicate', 'missing', 'extra'):
            with self.subTest(kind=kind):
                projection = fx.fixture()
                if kind == 'duplicate':
                    projection['units'][1] = copy.deepcopy(projection['units'][0])
                elif kind == 'missing':
                    projection['units'].pop()
                else:
                    projection['units'].append(copy.deepcopy(projection['units'][0]))
                self.assert_blocked(projection)

    def test_06_duplicate_missing_and_extra_properties(self):
        for kind in ('duplicate', 'missing', 'extra', 'renamed'):
            with self.subTest(kind=kind):
                projection = fx.fixture()
                positions = projection['units'][0]['positions']
                if kind == 'duplicate':
                    positions[1] = copy.deepcopy(positions[0])
                elif kind == 'missing':
                    positions.pop()
                elif kind == 'extra':
                    positions.append(copy.deepcopy(positions[0]))
                else:
                    positions[0]['property'] = 'unregistered_endpoint'
                self.assert_blocked(projection)

    def test_07_unit_identity_path_and_context_mismatch(self):
        for kind in ('id', 'path', 'property_id', 'model_extra', 'property_unit', 'unit_state', 'hash_upper', 'hash_length'):
            with self.subTest(kind=kind):
                projection = fx.fixture()
                unit = projection['units'][0]
                if kind == 'id': unit['unit_id'] = 'Ag_fcc_UNKNOWN_MODEL'
                elif kind == 'path': unit['source_path'] = projection['units'][1]['source_path']
                elif kind == 'property_id': unit['positions'][0]['unit_id'] = projection['units'][1]['unit_id']
                elif kind == 'model_extra': unit['model_id'] = 'mace-mp-small'
                elif kind == 'property_unit': record(projection)['unit']['literal'] = 'eV'
                elif kind == 'unit_state': record(projection)['unit']['state'] = 'MISMATCH'
                elif kind == 'hash_upper': unit['declared_inputs_sha256'] = 'A' * 64
                else: unit['declared_inputs_sha256'] = '0' * 63
                self.assert_blocked(projection)

    def test_08_ordinal_strict_type_and_uniqueness(self):
        for ordinal in (-1, 512, True, 0.0, '0', None):
            with self.subTest(ordinal=ordinal):
                projection = fx.fixture()
                record(projection)['property_array_ordinal'] = ordinal
                self.assert_blocked(projection)
        projection = fx.fixture()
        record(projection, 0, 1)['property_array_ordinal'] = record(projection)['property_array_ordinal']
        self.assert_blocked(projection)

    def test_09_non_single_records_and_extra_keys(self):
        for kind in ('none', 'two', 'state', 'record_extra', 'root_extra', 'position_extra'):
            with self.subTest(kind=kind):
                projection = fx.fixture()
                position = projection['units'][0]['positions'][0]
                if kind == 'none': position['records'] = []
                elif kind == 'two': position['records'].append(copy.deepcopy(position['records'][0]))
                elif kind == 'state': position['record_state'] = 'AMBIGUOUS'
                elif kind == 'record_extra': record(projection)['selected_truth'] = 'GENERATED_LEAK_SENTINEL'
                elif kind == 'root_extra': projection['winner'] = 'fake'
                else: position['inferred_reference'] = 'fake'
                self.assert_blocked(projection)

    def test_10_invalid_numeric_lexemes_and_types(self):
        for token in ('+1', '01', '1.', '.1', '-.1', 'NaN', 'Infinity', '-Infinity', '1/3', ' 1', '1 ', '1e', '', '\u0661', True, None, 1, 1.0):
            with self.subTest(token=token):
                projection = fx.fixture()
                record(projection)['value']['serialized_number'] = token
                self.assert_blocked(projection)

    def test_11_numeric_engineering_bounds(self):
        for token in ('1' * 129, '1e1025', '1e-1025', '0.1e-1024', '1e999999999999999999'):
            with self.subTest(token=token):
                projection = fx.fixture()
                record(projection)['reference_value']['serialized_number'] = token
                self.assert_blocked(projection)
        for token in ('1e1024', '1e-1024', '1' * 128, '-1E+00001024', '0.' + '0' * 126 + '1e-897'):
            with self.subTest(valid_boundary=token):
                projection = fx.fixture()
                record(projection)['value']['serialized_number'] = token
                self.assert_exact(projection)

    def test_12_state_token_consistency_and_tolerance(self):
        for kind in ('value_null', 'type', 'reference_missing', 'tolerance_value', 'tolerance_missing', 'tolerance_token', 'tolerance_type'):
            with self.subTest(kind=kind):
                projection = fx.fixture()
                r = record(projection)
                if kind == 'value_null': r['value']['state'] = 'NULL'
                elif kind == 'type': r['value']['non_numeric_type'] = 'STRING'
                elif kind == 'reference_missing': r['reference_value']['state'] = 'MISSING'
                elif kind == 'tolerance_value': r['tolerance'] = fx.numeric('0')
                elif kind == 'tolerance_missing': r['tolerance']['state'] = 'MISSING'
                elif kind == 'tolerance_token': r['tolerance']['serialized_number'] = '0'
                else: r['tolerance']['non_numeric_type'] = 'NULL'
                self.assert_blocked(projection)

    def test_13_citation_consistency(self):
        for value in ('', ' \t\n', None, True, 1):
            with self.subTest(value=value):
                projection = fx.fixture()
                record(projection)['reference_source']['literal'] = value
                self.assert_blocked(projection)
        projection = fx.fixture()
        record(projection)['reference_source']['state'] = 'EMPTY'
        self.assert_blocked(projection)

    def test_14_fixed_public_binding_identity(self):
        self.assert_blocked(frame_raw=fx.FRAME_RAW + b' ')
        self.assert_blocked(readiness_raw=fx.READINESS_RAW + b' ')
        for field in ('material', 'model_id', 'structure'):
            with self.subTest(field=field):
                frame = copy.deepcopy(fx.FRAME)
                frame['units'][0][field] = 'MISMATCH'
                self.assert_blocked(frame_raw=fx.raw(frame))
        readiness = copy.deepcopy(fx.READINESS)
        readiness['positions'][0]['pair_complete'] = False
        self.assert_blocked(readiness_raw=fx.raw(readiness))

    def test_15_provenance_status_cannot_be_promoted(self):
        for field, value in (('scientific_status', 'ADMITTED'), ('actual_reference_choice', 'PBE'),
                             ('warning', 'FRESH_HOLDOUT'), ('schema', 'unknown')):
            with self.subTest(field=field):
                projection = fx.fixture()
                projection[field] = value
                self.assert_blocked(projection)
        projection = fx.fixture()
        projection['units'][0]['positions'][0]['actual_reference_choice'] = 'KNOWN'
        self.assert_blocked(projection)

    def test_16_json_parser_rejects_duplicate_nonfinite_and_nonstrict_bytes(self):
        valid = fx.raw(fx.fixture())
        for payload in (b'{}', b'[]', b'null', b'NaN', valid + b'{}', valid.replace(b'"units":', b'"units":[],"units":', 1),
                        b'\xff', b'{"a":"\\ud800"}', b'{"a":Infinity}'):
            with self.subTest(payload_prefix=payload[:30]):
                self.assert_blocked(projection_raw=payload)

    def test_17_late_error_never_returns_partial_aggregates(self):
        projection = fx.fixture()
        record(projection, 35, 3)['value']['serialized_number'] = 'not_a_number_GENERATED_LEAK_SENTINEL'
        public = self.assert_blocked(projection)
        self.assertNotIn('GENERATED_LEAK_SENTINEL', json.dumps(public))

    def test_18_public_allowlist_excludes_individual_values(self):
        public, _ = self.assert_exact(fx.fixture())
        serialized = json.dumps(public)
        self.assertNotIn('GENERATED_CITATION_DO_NOT_PUBLIC', serialized)
        self.assertNotIn('data/y_matrix_runs/bound/', serialized)
        def walk(value):
            if isinstance(value, dict):
                for key, child in value.items():
                    self.assertNotIn(key, {'serialized_number', 'reference_source', 'declared_inputs_sha256',
                                           'signed_error', 'absolute_error', 'squared_error', 'winner', 'ranking'})
                    walk(child)
            elif isinstance(value, list):
                for child in value: walk(child)
        walk(public)

    def test_19_input_type_size_depth_node_and_string_limits(self):
        for value in (None, 'not_bytes', bytearray(b'{}'), 0):
            with self.subTest(type=type(value).__name__):
                self.assert_blocked(projection_raw=value)
        oversized = b' ' * (4194304 + 1)
        public = self.assert_blocked(projection_raw=oversized)
        self.assertIs(public['exposure']['whole_projection_parse_started'], False)
        self.assert_blocked(projection_raw=b'[' * 33 + b'0' + b']' * 33)
        self.assert_blocked(projection_raw=b'[' + b','.join([b'0'] * 50001) + b']')
        projection = fx.fixture()
        record(projection)['reference_source']['literal'] = 'a' * 16385
        self.assert_blocked(projection)

    def test_20_public_binding_failure_precedes_projection_interpretation(self):
        public = self.assert_blocked(projection_raw=b'BAD_UNINTERPRETED_INPUT', frame_raw=b'BAD_FRAME')
        self.assertEqual(public['reason'], 'FRAME_IDENTITY')
        self.assertIs(public['exposure']['whole_projection_parse_started'], False)
        self.assertEqual(public['exposure']['numbers_materialized'], 0)

    def test_21_hand_calculated_decimal_difference(self):
        projection = fx.fixture()
        for unit in projection['units']:
            for position in unit['positions']:
                r = position['records'][0]
                r['value'] = fx.numeric('0.1')
                r['reference_value'] = fx.numeric('0.2')
        public, private = self.assert_exact(projection)
        for group in public['groups']:
            for field, expected in (
                ('sum_signed_discrepancy', Fraction(-9, 10)),
                ('mean_signed_discrepancy', Fraction(-1, 10)),
                ('sum_absolute_discrepancy', Fraction(9, 10)),
                ('mean_absolute_discrepancy', Fraction(1, 10)),
                ('sum_squared_discrepancy', Fraction(9, 100)),
                ('mean_squared_discrepancy', Fraction(1, 100))):
                self.assertEqual(fx.rational(group[field]), expected)
        for position in private['positions']:
            self.assertEqual(fx.rational(position['signed_discrepancy']), Fraction(-1, 10))

    def test_22_hand_calculated_symmetric_population(self):
        projection = fx.fixture()
        for unit in projection['units']:
            material = next(u['material'] for u in fx.UNITS if u['unit_id'] == unit['unit_id'])
            integer = fx.MATERIALS.index(material) - 4
            for position in unit['positions']:
                r = position['records'][0]
                r['value'] = fx.numeric(str(integer))
                r['reference_value'] = fx.numeric('0')
        public, _ = self.assert_exact(projection)
        for group in public['groups']:
            self.assertEqual(fx.rational(group['sum_signed_discrepancy']), Fraction(0))
            self.assertEqual(fx.rational(group['sum_absolute_discrepancy']), Fraction(20))
            self.assertEqual(fx.rational(group['sum_squared_discrepancy']), Fraction(60))
            self.assertEqual(fx.rational(group['mean_absolute_discrepancy']), Fraction(20, 9))
            self.assertEqual(fx.rational(group['mean_squared_discrepancy']), Fraction(20, 3))

if __name__ == '__main__':
    raise SystemExit('Use held-source run_review.py; candidate is never selected implicitly.')
