"""Independently expressed synthetic checks; never reads scientific data."""
from dataclasses import FrozenInstanceError, replace
from fractions import Fraction
from hashlib import sha256
from importlib import util
from itertools import product, permutations
from pathlib import Path
import json
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'src'))
import lupine_discovery
lupine_discovery.__path__.insert(0, str(ROOT / 'src/lupine_discovery'))
from lupine_discovery import representation as rep
spec = util.spec_from_file_location('independent_mpea_features', ROOT / 'scripts/mpea_features.py')
f = util.module_from_spec(spec)
sys.modules[spec.name] = f
spec.loader.exec_module(f)
IDENTITY = sha256(b'independent manually constructed fixture v1').hexdigest()


def fixture_row(index, token, group=None, source=None, processing=None):
    return f.FixtureRow(index, f'{IDENTITY}:{index}',
                        'TOKEN_GROUP' if group is not None else 'UNRESOLVED',
                        group, token, source,
                        'UNRESOLVED' if processing is None else 'KNOWN', processing)


def coefficient_oracle(terms):
    """Sum rational terms directly; do not use the implementation's integer compiler."""
    by_label = {}
    total = Fraction(0)
    for label, spelling in terms:
        quantity = Fraction(spelling)
        by_label[label] = by_label.get(label, Fraction(0)) + quantity
        total += quantity
    return {label: quantity / total for label, quantity in by_label.items()}


class IndependentRepresentationReview(unittest.TestCase):
    def test_nonchemical_sparse_grid_against_direct_rational_oracle(self):
        axes = ('flow', 'charge', 'heat', 'work')
        options = (Fraction(0), Fraction(1, 7), Fraction(4, 9), Fraction(3, 2), Fraction(8, 3))
        for coefficients in product(options, repeat=4):
            if not any(coefficients):
                continue
            sparse = {key: value for key, value in zip(axes, coefficients) if value}
            actual = rep.normalize_coefficients(axes, sparse)
            total = sum(coefficients, Fraction(0))
            self.assertEqual(actual.values, tuple(value / total for value in coefficients))
            self.assertEqual(actual.axes, axes)
            self.assertEqual(sum(actual.values), 1)
            self.assertTrue(all(0 <= value <= 1 for value in actual.values))

    def test_dictionary_order_scaling_and_coalescing_do_not_change_answer(self):
        axes = ('alpha', 'beta', 'gamma')
        original = {'alpha': Fraction(2, 21), 'beta': Fraction(5, 11), 'gamma': Fraction(0)}
        expected = rep.normalize_coefficients(axes, original)
        for scale, order in product((Fraction(1, 37), Fraction(999, 17), 12), permutations(axes)):
            data = {key: scale * original[key] for key in order}
            self.assertEqual(rep.normalize_coefficients(axes, data), expected)
        split = {'alpha': Fraction(1, 21) + Fraction(1, 21), 'beta': Fraction(2, 11) + Fraction(3, 11)}
        self.assertEqual(rep.normalize_coefficients(axes, split), expected)

    def test_equal_normalizations_imply_pairwise_proportionality_on_small_grid(self):
        axes = ('a', 'b')
        tuples = [pair for pair in product(range(4), repeat=2) if any(pair)]
        for left, right in product(tuples, repeat=2):
            normalized_left = rep.normalize_coefficients(axes, dict(zip(axes, left)))
            normalized_right = rep.normalize_coefficients(axes, dict(zip(axes, right)))
            proportional = left[0] * right[1] == right[0] * left[1]
            self.assertEqual(normalized_left == normalized_right, proportional)

    def test_metric_against_independent_rational_oracle_and_triangle(self):
        vectors = [rep.normalize_coefficients(('a', 'b', 'c'), dict(zip(('a', 'b', 'c'), row)))
                   for row in ((0, 1, 0), (0, 0, 1), (2, 0, 7), (1, 3, 5),
                               (Fraction(1, 13), Fraction(4, 7), Fraction(9, 11)))]
        for a, b, c in product(vectors, repeat=3):
            distance = rep.l1_distance(a, b)
            oracle = sum((abs(x - y) for x, y in zip(a.values, b.values)), Fraction(0))
            self.assertEqual(distance, oracle)
            self.assertEqual(distance, rep.l1_distance(b, a))
            self.assertLessEqual(distance, rep.l1_distance(a, c) + rep.l1_distance(c, b))
            self.assertTrue(0 <= distance <= 2)
            self.assertEqual(distance == 0, a == b)

    def test_manual_vector_cannot_bypass_simplex_invariants(self):
        cases = [(('x',), (Fraction(2),)), (('x', 'y'), (Fraction(-1), Fraction(2))),
                 ((), ()), (('x', 'x'), (Fraction(1, 2), Fraction(1, 2))),
                 (('x',), (True,)), (('x',), (1.0,)), (('x',), ('1',)),
                 (('x',), (None,)), (('x',), (Fraction(1), Fraction(0)))]
        for axes, values in cases:
            with self.subTest(axes=axes, values=values), self.assertRaises(rep.RepresentationError):
                rep.NormalizedVector(axes, values)

    def test_aliases_are_snapshotted_and_input_mutation_has_no_effect(self):
        axes, values = ['q', 'r'], [Fraction(1, 4), Fraction(3, 4)]
        vector = rep.NormalizedVector(axes, values)
        axes[:] = ['changed']; values[:] = [9]
        self.assertEqual(vector.axes, ('q', 'r'))
        self.assertEqual(vector.values, (Fraction(1, 4), Fraction(3, 4)))
        mapping = {'q': 1, 'r': 3}
        normalized = rep.normalize_coefficients(('q', 'r'), mapping)
        mapping.clear()
        self.assertEqual(normalized, vector)
        with self.assertRaises(FrozenInstanceError):
            vector.values = (Fraction(1),)

    def test_input_unknown_is_not_absence_or_known_zero(self):
        known = rep.normalize_coefficients(('known', 'absent'), {'known': 1})
        self.assertEqual(known.values, (1, 0))
        with self.assertRaisesRegex(rep.RepresentationError, 'UNKNOWN_COEFFICIENT'):
            rep.normalize_coefficients(('known', 'absent'), {'known': 1, 'absent': None})
        for invalid in (False, True, 1.0, float('inf'), float('nan'), '1', complex(1), object()):
            with self.subTest(invalid=repr(invalid)), self.assertRaises(rep.RepresentationError):
                rep.normalize_coefficients(('a',), {'a': invalid})
        for invalid_map in ([('a', 1)], [('a', 1), ('a', 2)], None):
            with self.assertRaisesRegex(rep.RepresentationError, 'INVALID_COEFFICIENT_MAP'):
                rep.normalize_coefficients(('a',), invalid_map)
        for invalid in ({'a': -1}, {'a': Fraction(-1, 5)}, {}, {'a': 0}):
            with self.assertRaises(rep.RepresentationError):
                rep.normalize_coefficients(('a',), invalid)

    def test_oversized_integer_input_rejected_before_constructor(self):
        with patch.object(rep, 'Fraction', side_effect=AssertionError('conversion before cap')):
            with self.assertRaisesRegex(rep.RepresentationError, 'RESOURCE_LIMIT'):
                rep.normalize_coefficients(('a',), {'a': 1 << 1024})
        for value in (Fraction(1 << 1024, 3), Fraction(1, (1 << 1024) + 1)):
            with self.assertRaisesRegex(rep.RepresentationError, 'RESOURCE_LIMIT'):
                rep.normalize_coefficients(('a',), {'a': value})

    def test_conservative_intermediate_rejection_is_deterministic(self):
        for order in (('a', 'b'), ('b', 'a')):
            mapping = {key: {'a': 7, 'b': 1}[key] for key in order}
            with self.assertRaisesRegex(rep.RepresentationError, 'RESOURCE_LIMIT'):
                rep.normalize_coefficients(('a', 'b'), mapping, max_bits=3)
        accepted = rep.normalize_coefficients(('a', 'b'), {'a': 7, 'b': 0}, max_bits=3)
        self.assertEqual(accepted.values, (1, 0))
        # Each input is in range, but exact sum needs a denominator wider than four bits.
        with self.assertRaisesRegex(rep.RepresentationError, 'RESOURCE_LIMIT'):
            rep.normalize_coefficients(('a', 'b'), {'a': Fraction(1, 7), 'b': Fraction(1, 5)}, max_bits=4)
        a = rep.NormalizedVector(('a', 'b'), (Fraction(1, 7), Fraction(6, 7)))
        b = rep.NormalizedVector(('a', 'b'), (Fraction(1, 5), Fraction(4, 5)))
        with self.assertRaisesRegex(rep.RepresentationError, 'RESOURCE_LIMIT'):
            rep.l1_distance(a, b, max_bits=4)

    def test_axis_order_and_dimension_are_contract_not_coordinate_coincidence(self):
        a = rep.NormalizedVector(('a', 'b'), (Fraction(1, 2), Fraction(1, 2)))
        b = rep.NormalizedVector(('b', 'a'), (Fraction(1, 2), Fraction(1, 2)))
        with self.assertRaisesRegex(rep.RepresentationError, 'AXIS_MISMATCH'):
            rep.l1_distance(a, b)
        for invalid in (None, a.values, {'axes': a.axes, 'values': a.values}):
            with self.assertRaisesRegex(rep.RepresentationError, 'INVALID_VECTOR'):
                rep.l1_distance(a, invalid)
        for limit in (True, 0, -1, 1025, 4.0, '4'):
            with self.assertRaisesRegex(rep.RepresentationError, 'INVALID_LIMIT'):
                rep.normalize_coefficients(('a',), {'a': 1}, max_bits=limit)


class IndependentFeatureReview(unittest.TestCase):
    def test_decimal_compiler_against_direct_rational_terms(self):
        spellings = ('0001', '0.000001', '99.0100', '3.14159', '2')
        for a, b, c in product(spellings, repeat=3):
            terms = [('Ni', a), ('Fe', b), ('Ni', c)]
            token = ' '.join(label + count for label, count in terms).encode('ascii')
            result = f.parse_formula_coefficients(token)
            expected = coefficient_oracle(terms)
            observed = dict(zip(result.vector.axes, result.vector.values))
            self.assertEqual(result.status, 'KNOWN')
            for label in f.AXES:
                self.assertEqual(observed[label], expected.get(label, Fraction(0)))

    def test_original_token_identity_survives_vector_collision(self):
        tokens = (b'Fe1 Ni1', b'Ni1 Fe1', b'Fe2 Ni2', b'Fe1.00 Ni1', b'Fe1 Fe1 Ni2', b'Fe1 Ni1')
        groups = (0, 1, 2, 3, 4, 0)
        inputs = [fixture_row(i, token, group, source=i % 2, processing='OTHER')
                  for i, (token, group) in enumerate(zip(tokens, groups))]
        table = f.build_fixture_features(inputs, fixture_sha256=IDENTITY)
        self.assertEqual(len(table.rows), len(inputs))
        self.assertEqual([row.formula_group for row in table.rows], list(groups))
        self.assertEqual(len({row.composition.vector for row in table.rows}), 1)
        self.assertEqual(len({row.record_id for row in table.rows}), 6)

    def test_rounded_coefficients_do_not_reconstruct_unrounded_ratios(self):
        rounded = f.parse_formula_coefficients(b'Fe0.333 Ni1').vector
        fe = rounded.values[rounded.axes.index('Fe')]
        self.assertEqual(fe, Fraction(333, 1333))
        self.assertNotEqual(fe, Fraction(1, 4))
        self.assertEqual(Fraction(1, 4) - fe, Fraction(1, 5332))

    def test_lexical_unknown_has_no_partial_vector(self):
        bad = (b'Fe1 Ni0', b'Fe1 Xx2', b'Fe1 Ni1e0', b'Fe1 Ni.5', b'Fe1 Ni1.',
               b'Fe1  Ni1', b'Fe1\tNi1', b' Fe1', b'Fe1 ', b'Fe1\nNi1',
               b'Fe1Ni1', b'Fe+1', b'Fe-1', b'fe1', b'FE1', b'Fe1\x00',
               b'Fe1 Ni000.000', b'Fe1 \xff1', b'(Fe1)', b'NaN', b'NA', b'Na')
        for token in bad:
            with self.subTest(token=token):
                observed = f.parse_formula_coefficients(token)
                self.assertEqual(observed.status, 'UNRESOLVED')
                self.assertIsNone(observed.vector)
        for token in (b'', b' ', b'\t\r\n\v\f', b'None', b'nan', b'NAN', b'null', b'-', b'NR', b'N/A'):
            self.assertEqual(f.parse_formula_coefficients(token).reason, 'MISSING_FORMULA')
        for token in ('Fe1', bytearray(b'Fe1'), memoryview(b'Fe1'), True, 1, None):
            with self.assertRaisesRegex(f.FeatureError, 'FORMULA_BYTES_REQUIRED'):
                f.parse_formula_coefficients(token)

    def test_precise_digit_scale_and_term_boundaries(self):
        accepted = (b'Fe' + b'0' * 127 + b'1', b'Fe0.' + b'0' * 63 + b'1',
                    b' '.join([b'Fe1'] * 256), b'Fe' + b'9' * 128 + b' Ni0.' + b'0' * 63 + b'1')
        for token in accepted:
            result = f.parse_formula_coefficients(token)
            self.assertEqual(result.status, 'KNOWN')
            self.assertEqual(sum(result.vector.values), 1)
        rejected = ((b'Fe' + b'0' * 128 + b'1', 'DIGIT_LIMIT'),
                    (b'Fe0.' + b'0' * 64 + b'1', 'SCALE_LIMIT'),
                    (b' '.join([b'Fe1'] * 257), 'TERM_LIMIT'),
                    (b'Fe' + b'1' * 16383, 'FIELD_LIMIT'))
        for token, reason in rejected:
            result = f.parse_formula_coefficients(token)
            self.assertEqual((result.status, result.reason, result.vector), ('UNRESOLVED_LIMIT', reason, None))

    def test_late_numeric_failure_is_preflighted_before_any_int_conversion(self):
        for token, reason in ((b'Fe1 Ni' + b'1' * 129, 'DIGIT_LIMIT'),
                              (b'Fe1 Ni0.' + b'0' * 64 + b'1', 'SCALE_LIMIT'),
                              (b' '.join([b'Fe1'] * 257), 'TERM_LIMIT')):
            with patch.object(f, 'int', side_effect=AssertionError('premature numeric conversion'), create=True), \
                 patch.object(f, 'normalize_coefficients', side_effect=AssertionError('premature normalization')):
                result = f.parse_formula_coefficients(token)
            self.assertEqual(result.reason, reason)
            self.assertIsNone(result.vector)

    def test_bit_exhaustion_returns_whole_unknown_not_clipped_or_partial(self):
        # This forced branch is an engineering guard test, not a feasible default-profile artifact.
        with patch.object(f, 'normalize_coefficients', side_effect=rep.RepresentationError('RESOURCE_LIMIT')):
            result = f.parse_formula_coefficients(b'Fe1 Ni2')
        self.assertEqual((result.status, result.reason, result.vector),
                         ('UNRESOLVED_LIMIT', 'ARITHMETIC_LIMIT', None))
        with patch.object(f, 'normalize_coefficients', side_effect=rep.RepresentationError('UNKNOWN_COEFFICIENT')):
            with self.assertRaisesRegex(f.FeatureError, 'INTERNAL_ARITHMETIC_CONFLICT'):
                f.parse_formula_coefficients(b'Fe1')

    def test_unknown_and_numeric_limit_rows_keep_original_denominator(self):
        rows = [fixture_row(0, b'Fe1', 0, 0, 'CAST'), fixture_row(1, b'NaN'),
                fixture_row(2, b'Fe' + b'1' * 129, 1, 1, 'OTHER'),
                fixture_row(3, b'Fe1 bad'), fixture_row(4, b'Fe1', 0, 0, None)]
        table = f.build_fixture_features(rows, fixture_sha256=IDENTITY)
        public = f.aggregate_readiness(table)
        self.assertEqual([r.record_id for r in table.rows], [r.record_id for r in rows])
        self.assertEqual(public['row_count'], 5)
        self.assertEqual(public['composition_status_counts'], {'KNOWN': 2, 'UNRESOLVED': 2, 'UNRESOLVED_LIMIT': 1})
        self.assertEqual(sum(public['composition_reason_counts'].values()), 5)
        self.assertEqual(sum(public['processing_category_counts'].values()), 5)
        self.assertEqual(public['unknown_source_rows'], 2)
        for index in (1, 2, 3):
            self.assertIsNone(table.rows[index].composition.vector)
        self.assertEqual(table.rows[2].formula_group, 1)
        self.assertEqual(table.rows[4].processing.indicator, (0, 0, 0, 0, 0, 1))
        self.assertEqual(table.rows[2].processing.indicator, (0, 0, 0, 0, 1, 0))

    def test_all_4096_unknown_rows_preserved_and_overflow_rejected_before_parse(self):
        rows = [fixture_row(i, b'NaN') for i in range(4096)]
        result = f.aggregate_readiness(f.build_fixture_features(rows, fixture_sha256=IDENTITY))
        self.assertEqual(result['row_count'], 4096)
        self.assertEqual(result['composition_status_counts'], {'UNRESOLVED': 4096})
        rows.append(fixture_row(4096, b'NaN'))
        with patch.object(f, '_lexical_terms', side_effect=AssertionError('parse before row cap')):
            with self.assertRaisesRegex(f.FeatureError, 'INVALID_FIXTURE_ROWS'):
                f.build_fixture_features(rows, fixture_sha256=IDENTITY)

    def test_closed_late_row_and_group_linkage_errors(self):
        good = fixture_row(0, b'Fe1', 0, 0, 'CAST')
        variants = [fixture_row(1, b'Ni1', 0, 1), fixture_row(1, b'Fe1', 1, 1),
                    fixture_row(1, b'Ni1', 2, 1), fixture_row(1, b'Fe1', 0, 2),
                    fixture_row(1, b'Fe1'), fixture_row(1, b'bad', 1),
                    fixture_row(1, b'Fe' + b'1' * 16384, 1),
                    replace(good, ordinal=1), replace(good, record_id=IDENTITY + ':1'),
                    replace(good, ordinal=1, record_id='0' * 64 + ':1')]
        for late in variants:
            with self.subTest(late=late), self.assertRaises(f.FeatureError):
                f.build_fixture_features([good, late], fixture_sha256=IDENTITY)

    def test_original_rows_and_processing_arrays_are_immutable_snapshots(self):
        source = [fixture_row(0, b'Fe1', 0, processing='OTHER')]
        table = f.build_fixture_features(source, fixture_sha256=IDENTITY)
        source.clear()
        self.assertEqual(len(table.rows), 1)
        indicator = [0, 0, 0, 0, 1, 0]
        processing = f.ProcessingEncoding('KNOWN', 'OTHER', indicator)
        indicator[4] = 0
        self.assertEqual(processing.indicator, (0, 0, 0, 0, 1, 0))
        with self.assertRaises(FrozenInstanceError):
            table.rows[0].record_id = 'altered'
        with self.assertRaises(FrozenInstanceError):
            table.rows[0].composition.vector.values = ()

    def test_processing_manual_constructors_are_closed_and_other_is_known(self):
        for i, category in enumerate(('CAST', 'POWDER', 'WROUGHT', 'ANNEAL', 'OTHER')):
            actual = f.encode_processing('KNOWN', category)
            self.assertEqual(actual.indicator, tuple(1 if j == i else 0 for j in range(6)))
        unknown = f.encode_processing('UNRESOLVED', None)
        self.assertEqual(unknown.indicator, (0, 0, 0, 0, 0, 1))
        for status, category in (('KNOWN', 'UNRESOLVED'), ('UNRESOLVED', 'OTHER'),
                                 ('KNOWN', None), (True, 'CAST'), ('KNOWN', True), ('known', 'CAST')):
            with self.assertRaises(f.FeatureError):
                f.encode_processing(status, category)
        for indicators in ((True, 0, 0, 0, 0, 0), (1.0, 0, 0, 0, 0, 0),
                           (0, 0, 0, 0, 0, 0), (1, 1, 0, 0, 0, 0), (1, 0)):
            with self.assertRaises(f.FeatureError):
                f.ProcessingEncoding('KNOWN', 'CAST', indicators)

    def test_manual_result_and_row_cannot_invent_known_or_zero_vector(self):
        good = f.parse_formula_coefficients(b'Fe1')
        for arguments in (('KNOWN', 'MISSING_FORMULA', good.vector),
                          ('KNOWN', 'DECLARED_COEFFICIENTS_NORMALIZED', None),
                          ('UNRESOLVED', 'MISSING_FORMULA', good.vector),
                          ('UNRESOLVED_LIMIT', 'UNSUPPORTED_GRAMMAR', None),
                          ('KNOWN', 'DECLARED_COEFFICIENTS_NORMALIZED', rep.NormalizedVector(('other',), (1,)))):
            with self.assertRaises(f.FeatureError):
                f.FeatureResult(*arguments)
        row = f.build_fixture_features([fixture_row(0, b'Fe1', 0)], fixture_sha256=IDENTITY).rows[0]
        for changes in ({'ordinal': True}, {'formula_group': True}, {'source_group': True},
                        {'formula_group': None}, {'composition': {'vector': good.vector}},
                        {'composition': f.FeatureResult('UNRESOLVED', 'MISSING_FORMULA', None)}):
            with self.assertRaises(f.FeatureError):
                replace(row, **changes)

    def test_manual_table_validates_complete_rows_and_group_consistency(self):
        first = f.build_fixture_features([fixture_row(0, b'Fe1', 0, 0)], fixture_sha256=IDENTITY).rows[0]
        second = replace(first, ordinal=1, record_id=IDENTITY + ':1')
        self.assertEqual(len(f.FeatureTable(IDENTITY, (first, second)).rows), 2)
        for rows in ((second,), (first, first),
                     (replace(first, formula_group=1),), (replace(first, source_group=1),),
                     (first, replace(second, composition=f.parse_formula_coefficients(b'Ni1')))):
            with self.assertRaises(f.FeatureError):
                f.FeatureTable(IDENTITY, rows)
        with self.assertRaisesRegex(f.FeatureError, 'INVALID_FEATURE_TABLE'):
            f.FeatureTable(IDENTITY, (first for _ in range(1)))

    def test_known_real_identity_and_invalid_identities_never_enable_fixture(self):
        for identity in (f.REAL_SOURCE_SHA256, f.REAL_SOURCE_SHA256.upper(), '', '0' * 63,
                         'g' * 64, True, None):
            with self.assertRaisesRegex(f.FeatureError, 'SYNTHETIC_IDENTITY_REQUIRED'):
                f.build_fixture_features([], fixture_sha256=identity)
            with self.assertRaisesRegex(f.FeatureError, 'SYNTHETIC_IDENTITY_REQUIRED'):
                f.FeatureTable(identity, ())
        valid = fixture_row(0, b'Fe1', 0)
        for changes in ({'ordinal': True}, {'formula_group': True}, {'source_group': True},
                        {'formula_status': True}, {'record_id': True}, {'formula_token': bytearray(b'Fe1')}):
            with self.assertRaises(f.FeatureError):
                replace(valid, **changes)

    def test_aggregate_is_derived_and_has_no_per_row_or_formula_channels(self):
        table = f.build_fixture_features([fixture_row(0, b'Fe1 Ni1', 0, 0, 'OTHER'),
                                          fixture_row(1, b'NaN')], fixture_sha256=IDENTITY)
        report = f.aggregate_readiness(table)
        serialized = json.dumps(report)
        for forbidden in ('Fe1', 'Ni1', IDENTITY, 'record_id', 'formula_group', 'source_group',
                          '"axes"', '"rows"', '"vector"', '"processing_indicator"'):
            self.assertNotIn(forbidden, serialized)
        self.assertIs(report['physical_composition_established'], False)
        self.assertIs(report['scientific_eligibility_decisions'], False)
        self.assertEqual(report['fits'], 0)
        self.assertEqual(report['splits'], 0)
        copy = f.FeatureTable(IDENTITY, list(table.rows))
        self.assertEqual(copy.table_digest, table.table_digest)
        altered = replace(table.rows[0], processing=f.encode_processing('KNOWN', 'CAST'))
        self.assertNotEqual(f.FeatureTable(IDENTITY, (altered, table.rows[1])).table_digest, table.table_digest)
        object.__setattr__(copy, 'table_digest', '0' * 64)
        with self.assertRaisesRegex(f.FeatureError, 'FEATURE_TABLE_IDENTITY_CONFLICT'):
            f.aggregate_readiness(copy)

    def test_no_reader_cli_fit_or_source_enable_parameter_exists(self):
        import ast
        import inspect
        source = (ROOT / 'scripts/mpea_features.py').read_text()
        tree = ast.parse(source)
        names = {node.id for node in ast.walk(tree) if isinstance(node, ast.Name)}
        self.assertFalse(names & {'open', 'Path', 'requests', 'urllib', 'argparse', 'eval', 'exec'})
        self.assertNotIn('__main__', source)
        self.assertEqual(tuple(inspect.signature(f.build_fixture_features).parameters), ('rows', 'fixture_sha256'))


if __name__ == '__main__':
    unittest.main()
