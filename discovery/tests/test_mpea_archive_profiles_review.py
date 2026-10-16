"""Independent descriptor checks; only synthetic target tokens and identities."""
import builtins
import copy
from fractions import Fraction
import hashlib
import importlib.util
from pathlib import Path
import re
import sys
import unittest
from unittest import mock

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'src/lupine_discovery/decision_pool.py').is_file())
SOURCE = Path(__file__).resolve().parents[1] / 'scripts/mpea_archive_profiles.py'


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


m = load('independent_archive_profiles', SOURCE)
sys.path.insert(0, str(ROOT / 'src'))
features = load('independent_frozen_features', ROOT / 'scripts/mpea_features.py')
reader = load('independent_frozen_feature_reader', ROOT / 'scripts/mpea_feature_reader.py')
parser = load('independent_frozen_target_parser', ROOT / 'scripts/mpea_target_custody.py')


class ProfilesReview(unittest.TestCase):
    def test_feature_profile_matches_actual_frozen_axes_and_reader(self):
        self.assertEqual(m.feature_profile(), reader._profile({'features': features}))
        self.assertEqual(m.feature_profile()['axes'], list(features.AXES))
        self.assertEqual(m.feature_profile()['processing_axes'], list(features.PROCESSING_AXES))
        self.assertEqual(m.feature_profile()['allowed_positions'], {'formula': 1})

    def test_target_profile_fixed_limits_units_and_code_identity(self):
        value = m.target_profile()
        self.assertEqual(value['targets'], [{'name': 'yield_strength', 'position': 11, 'unit': 'MPa'},
            {'name': 'elongation', 'position': 13, 'unit': 'total_elongation_percentage_points'}])
        expected = {'max_token_bytes': 128, 'max_mantissa_digits': 128, 'max_exponent_digits': 3,
            'max_absolute_exponent': 256, 'max_absolute_decimal_power': 384, 'max_intermediate_integer_bits': 2048,
            'max_reduced_rational_bits': 512, 'max_raw_field_bytes': 16384, 'max_raw_record_bytes': 65536,
            'max_rows': 4096, 'max_columns': 128}
        self.assertEqual({k: value[k] for k in expected}, expected)
        self.assertEqual(value['parser_sha256'], hashlib.sha256((ROOT / value['parser_path']).read_bytes()).hexdigest())
        self.assertEqual(value['contract_sha256'], hashlib.sha256((ROOT / 'docs/mpea-t25-implementation-contract-v1.md').read_bytes()).hexdigest())
        for name in ('yield_offset_definition_inferred', 'fallback_parser', 'same_specimen_verified'):
            self.assertIs(value[name], False)

    def test_declared_grammar_and_zero_behavior_match_frozen_parser_on_constructed_cells(self):
        grammar = re.compile(m.target_profile()['grammar'].encode('ascii'))
        for raw, expected in [(b'.5', Fraction(1, 2)), (b'1.', Fraction(1)), (b'+1e2', Fraction(100)),
                              (b'-0e2', Fraction(0)), (b'0E-256', Fraction(0))]:
            self.assertIsNotNone(grammar.fullmatch(raw))
            result = parser.parse_target(raw, 'yield_strength')
            self.assertEqual(result.status, 'VALID')
            self.assertEqual(result.value, expected)
        for raw in (b'1/2', b'1 MPa', b'2%', b'1\n', b'1 2'):
            self.assertIsNone(grammar.fullmatch(raw))
            self.assertEqual(parser.parse_target(raw, 'elongation').status, 'UNSUPPORTED_LEXICAL')
        self.assertEqual(parser.parse_target(b'\t  \t', 'yield_strength').status, 'MISSING')
        self.assertEqual(parser.parse_target(b'-0e257', 'yield_strength').status, 'UNRESOLVED_LIMIT')
        self.assertEqual(parser.parse_target(b'-1', 'yield_strength').status, 'SEMANTIC_CONFLICT')
        self.assertEqual(parser.parse_target(b'nAn', 'yield_strength').status, 'UNSUPPORTED_NONFINITE')

    def test_predictor_frozen_choices_and_policy_count(self):
        value = m.predictor_profile()
        self.assertEqual(value['neighbors'], 5)
        self.assertEqual(value['minimum_complete_rows'], 50)
        self.assertEqual(value['minimum_complete_source_groups'], 15)
        self.assertEqual(value['aggregation'], 'exact_unweighted_mean')
        self.assertEqual(value['lower_median_index'], '(n-1)//2')
        self.assertEqual(value['representative_order'], ['distance', 'numeric_original_ordinal'])
        self.assertEqual(value['primary_order'], ['0_if_predicted_E_ge_threshold_else_1', 'negative_predicted_YS', 'H_tie_record_id', 'numeric_original_ordinal'])
        self.assertEqual(value['objective_only_order'], ['negative_primary_predicted_YS', 'H_tie_record_id', 'numeric_original_ordinal'])
        self.assertEqual(value['random_orders'], [{'name': f'random_{i}', 'hash_tag': f'random-{i}'} for i in range(20)])
        self.assertEqual(value['full_order_count'], 23)
        self.assertIs(value['reserved_target_values_used_in_ranking'], False)
        self.assertIs(value['development_targets_used'], True)
        self.assertNotIn('truth_used_in_ranking', value)
        self.assertEqual(value['secondary_orders'], 'literal_restriction_of_frozen_full_orders_no_refit_or_rerank')
        self.assertEqual((value['derived_reduced_bits'], value['derived_temporary_bits']), (8192, 16385))
        self.assertEqual(value['implementation_sha256'], hashlib.sha256((ROOT / value['implementation_path']).read_bytes()).hexdigest())
        self.assertEqual(value['protocol_sha256'], hashlib.sha256((ROOT / 'docs/mpea-t25-archival-protocol-v1.md').read_bytes()).hexdigest())

    def test_nested_mutation_cannot_change_later_descriptors(self):
        for kind, build in [('target', m.target_profile), ('predictor', m.predictor_profile), ('feature', m.feature_profile)]:
            before = build(); current = build()
            if kind == 'target': current['targets'][0]['position'] = 13
            elif kind == 'predictor': current['random_orders'][0]['hash_tag'] = 'alternate'
            else: current['allowed_positions']['formula'] = 2
            self.assertEqual(build(), before)
            with self.assertRaises(m.ProfileError): m.validate_profile(kind, current)

    def test_nested_bool_float_tuple_and_extra_fields_reject(self):
        mutations = [('target', lambda v: v['targets'][0].update(position=True)),
                     ('target', lambda v: v['targets'][0].update(extra='SENSITIVE')),
                     ('predictor', lambda v: v['random_orders'][0].update(name='random_00')),
                     ('predictor', lambda v: v.update(neighbors=5.0)),
                     ('feature', lambda v: v.update(axes=tuple(v['axes']))),
                     ('feature', lambda v: v['allowed_positions'].update(formula=True))]
        for kind, mutate in mutations:
            value = getattr(m, kind + '_profile')(); mutate(value)
            with self.subTest(kind=kind), self.assertRaises(m.ProfileError): m.validate_profile(kind, value)

    def test_malformed_deep_cyclic_and_surrogate_inputs_fail_closed(self):
        cyclic = []; cyclic.append(cyclic)
        deep = None
        for _ in range(18): deep = [deep]
        for value in (cyclic, deep, {'x': '\ud800'}, {'x': float('nan')}, {'x': 'a' * 2049}, {'x': 2**63}):
            with self.subTest(type=type(value).__name__), self.assertRaises(m.ProfileError) as raised:
                m.validate_profile('target', value)
            self.assertEqual(str(raised.exception), 'PROFILE_INVALID')


class FramingReview(unittest.TestCase):
    def source(self): return {'bytes': 100, 'md5': 'a' * 32, 'sha256': 'b' * 64}
    def frame(self): return m.framing(self.source(), 10, 23, ('CALIBRATION', 'EVALUATION'), {'CALIBRATION': 2, 'EVALUATION': 3})

    def test_descriptor_is_a_caller_claim_and_cannot_verify_framing(self):
        # This negative control intentionally supplies no source bytes/parser result.
        # Success proves only shape construction, not that the asserted checks ran.
        with mock.patch.object(builtins, 'open', side_effect=AssertionError('I/O reached')), \
             mock.patch.object(Path, 'open', side_effect=AssertionError('I/O reached')):
            value = m.framing(self.source(), 1, 1, ('DEVELOPMENT',), {'DEVELOPMENT': 0})
            self.assertIsNone(m.validate_framing(value, copy.deepcopy(value)))
        self.assertIs(value['all_row_widths_checked'], True)
        self.assertEqual(value['scope'], 'successful_complete_framing_after_authorized_parse_not_absence_of_unselected_bytes')
        self.assertEqual(value['original_rows'], 1)  # production1545/23 belongs to caller

    def test_inputs_and_returned_nested_mappings_are_detached(self):
        source, counts = self.source(), {'DEVELOPMENT': 2}
        value = m.framing(source, 10, 23, ('DEVELOPMENT',), counts)
        source['sha256'] = 'c' * 64; counts['DEVELOPMENT'] = 9
        self.assertEqual(value['source']['sha256'], 'b' * 64)
        self.assertEqual(value['returned_role_counts'], {'DEVELOPMENT': 2})
        value['source']['bytes'] = 9; value['returned_role_counts']['DEVELOPMENT'] = 1
        self.assertEqual(source['bytes'], 100)
        self.assertEqual(counts['DEVELOPMENT'], 9)

    def test_all_caps_and_zero_selected_rows_are_exact(self):
        source = {**self.source(), 'bytes': 332126}
        value = m.framing(source, 4096, 128, ('CALIBRATION', 'EVALUATION'), {'CALIBRATION': 0, 'EVALUATION': 4096})
        m.validate_framing(value, copy.deepcopy(value))
        for change in [('bytes', 332127), ('bytes', 0), ('rows', 4097), ('rows', 0), ('columns', 129), ('columns', 0)]:
            src = dict(source); rows, cols = 4096, 128
            if change[0] == 'bytes': src['bytes'] = change[1]
            elif change[0] == 'rows': rows = change[1]
            else: cols = change[1]
            with self.subTest(change=change), self.assertRaises(m.ProfileError):
                m.framing(src, rows, cols, ('DEVELOPMENT',), {'DEVELOPMENT': 0})

    def test_role_order_scope_duplicates_and_counts_cannot_change(self):
        for roles, counts in [(('EVALUATION',), {'EVALUATION': 1}),
                              (('EVALUATION', 'CALIBRATION'), {'CALIBRATION': 1, 'EVALUATION': 1}),
                              (('DEVELOPMENT', 'DEVELOPMENT'), {'DEVELOPMENT': 1}),
                              (['DEVELOPMENT'], {'DEVELOPMENT': 1}),
                              (('CALIBRATION', 'EVALUATION'), {'CALIBRATION': 6, 'EVALUATION': 5}),
                              (('DEVELOPMENT',), {'DEVELOPMENT': True})]:
            with self.subTest(roles=roles), self.assertRaises(m.ProfileError): m.framing(self.source(), 10, 23, roles, counts)

    def test_exact_string_subclasses_cannot_enter_constructor_output(self):
        class String(str): pass
        cases = [(self.source(), (String('DEVELOPMENT'),), {'DEVELOPMENT': 1}),
                 (self.source(), ('DEVELOPMENT',), {String('DEVELOPMENT'): 1}),
                 ({String(k): v for k, v in self.source().items()}, ('DEVELOPMENT',), {'DEVELOPMENT': 1})]
        for source, roles, counts in cases:
            with self.subTest(source=source, roles=roles), self.assertRaises(m.ProfileError):
                m.framing(source, 10, 23, roles, counts)

    def test_expected_identity_includes_role_counts_flags_and_target_order(self):
        expected = self.frame()
        changes = [lambda v: v['returned_role_counts'].update(CALIBRATION=3, EVALUATION=2),
                   lambda v: v['source'].update(sha256='c' * 64),
                   lambda v: v.update(source_identity_checked=1),
                   lambda v: v.update(all_row_widths_checked=False),
                   lambda v: v.update(target_positions=[13, 11]),
                   lambda v: v.update(target_cells=['SENSITIVE'])]
        for mutate in changes:
            value = copy.deepcopy(expected); mutate(value)
            with self.subTest(mutator=mutate), self.assertRaises(m.ProfileError): m.validate_framing(value, expected)


if __name__ == '__main__': unittest.main()
