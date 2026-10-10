import itertools
import unittest
from fractions import Fraction

from lupine_discovery.core import Interval
from lupine_discovery.nonlinear import (
    divide_interval, multiply_interval, reciprocal_interval, square_interval,
)


class NonlinearTests(unittest.TestCase):
    def test_exhaustive_products_and_quotients_against_rational_values(self):
        values = tuple(Fraction(i, 2) for i in range(-4, 5))
        intervals = tuple(Interval(low, high) for low in values for high in values if low <= high)
        product_worlds = quotient_worlds = 0
        for first, second in itertools.product(intervals, repeat=2):
            product = multiply_interval(first, second)
            self.assertEqual(product, multiply_interval(second, first))
            xs = tuple(value for value in values if first.contains(value))
            ys = tuple(value for value in values if second.contains(value))
            # The oracle enumerates actual rational operands, not corners.
            true_products = [x * y for x in xs for y in ys]
            self.assertEqual(product.lower, min(true_products))
            self.assertEqual(product.upper, max(true_products))
            self.assertTrue(all(product.contains(value) for value in true_products))
            product_worlds += len(true_products)
            if not second.contains(0):
                quotient = divide_interval(first, second)
                true_quotients = [x / y for x in xs for y in ys]
                self.assertEqual(quotient.lower, min(true_quotients))
                self.assertEqual(quotient.upper, max(true_quotients))
                self.assertTrue(all(quotient.contains(value) for value in true_quotients))
                quotient_worlds += len(true_quotients)
        self.assertEqual(len(intervals) ** 2, 2025)
        self.assertEqual(product_worlds, 27225)
        self.assertEqual(quotient_worlds, 6600)

    def test_exhaustive_squares_and_reciprocals_against_rational_values(self):
        values = tuple(Fraction(i, 3) for i in range(-6, 7))
        for low in values:
            for high in values:
                if low > high:
                    continue
                interval = Interval(low, high)
                contained = tuple(value for value in values if interval.contains(value))
                squared = square_interval(interval)
                true_squares = tuple(value * value for value in contained)
                self.assertEqual((squared.lower, squared.upper), (min(true_squares), max(true_squares)))
                if interval.contains(0):
                    with self.assertRaises(ValueError):
                        reciprocal_interval(interval)
                else:
                    reciprocal = reciprocal_interval(interval)
                    true_reciprocals = tuple(Fraction(1) / value for value in contained)
                    self.assertEqual((reciprocal.lower, reciprocal.upper),
                                     (min(true_reciprocals), max(true_reciprocals)))
                    self.assertEqual(reciprocal_interval(reciprocal), interval)

    def test_mixed_signs_and_dependence_are_explicit(self):
        mixed = Interval(-2, 3)
        self.assertEqual(multiply_interval(mixed, mixed), Interval(-6, 9))
        self.assertEqual(square_interval(mixed), Interval(0, 9))
        self.assertEqual(square_interval(Interval(-5, -2)), Interval(4, 25))
        self.assertEqual(square_interval(Interval(2, 5)), Interval(4, 25))
        self.assertEqual(reciprocal_interval(Interval(-4, -2)), Interval('-1/2', '-1/4'))
        self.assertEqual(reciprocal_interval(Interval(2, 4)), Interval('1/4', '1/2'))
        self.assertEqual(divide_interval(Interval(-2, 3), Interval(-4, -2)), Interval('-3/2', 1))
        self.assertEqual(multiply_interval(Interval(-2, 0), Interval(0, 3)), Interval(-6, 0))

    def test_zero_denominator_is_rejected_including_boundary_and_zero_numerator(self):
        for zero_containing in (Interval(-1, 1), Interval(-1, 0), Interval(0, 1), Interval(0, 0)):
            with self.assertRaisesRegex(ValueError, 'containing zero'):
                reciprocal_interval(zero_containing)
            for numerator in (Interval(-1, 2), Interval(0, 0)):
                with self.assertRaisesRegex(ValueError, 'containing zero'):
                    divide_interval(numerator, zero_containing)
        self.assertEqual(divide_interval(Interval(0, 0), Interval(1, 2)), Interval(0, 0))
        self.assertEqual(square_interval(Interval(0, 0)), Interval(0, 0))

    def test_exact_fractions_without_float_overflow_or_rounding(self):
        very_small = Fraction(1, 10**400)
        very_large = 10**400
        tiny = Interval(very_small, 2 * very_small)
        self.assertEqual(reciprocal_interval(tiny), Interval(Fraction(very_large, 2), very_large))
        self.assertEqual(multiply_interval(tiny, Interval(very_large, very_large)), Interval(1, 2))
        self.assertEqual(square_interval(tiny), Interval(very_small**2, 4*very_small**2))
        self.assertEqual(divide_interval(Interval('1/3', '2/3'), Interval('1/7', '2/7')),
                         Interval('7/6', '14/3'))

    def test_operations_preserve_refinement(self):
        values = tuple(Fraction(i, 2) for i in range(-4, 5))
        intervals = tuple(Interval(low, high) for low in values for high in values if low <= high)
        multiplier = Interval('-4/3', '5/2')
        denominator = Interval('-7/3', '-1/5')
        for outer, inner in itertools.product(intervals, repeat=2):
            if not outer.lower <= inner.lower <= inner.upper <= outer.upper:
                continue
            pairs = [(square_interval(outer), square_interval(inner)),
                     (multiply_interval(outer, multiplier), multiply_interval(inner, multiplier)),
                     (divide_interval(outer, denominator), divide_interval(inner, denominator))]
            if not outer.contains(0):
                pairs += [(reciprocal_interval(outer), reciprocal_interval(inner)),
                          (divide_interval(multiplier, outer), divide_interval(multiplier, inner))]
            for before, after in pairs:
                self.assertLessEqual(before.lower, after.lower)
                self.assertLessEqual(after.upper, before.upper)

    def test_invalid_operands_are_not_silently_coerced(self):
        for invalid in (0, 0.1, None, True, [0, 1], (0, 1), {'lower': 0, 'upper': 1}):
            for operation in (reciprocal_interval, square_interval):
                with self.assertRaises(TypeError):
                    operation(invalid)
            for operation in (multiply_interval, divide_interval):
                with self.assertRaises(TypeError):
                    operation(invalid, Interval(1, 2))
                with self.assertRaises(TypeError):
                    operation(Interval(1, 2), invalid)


if __name__ == '__main__':
    unittest.main()
