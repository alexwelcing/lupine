"""Generated prospective rational display cases and an exact rounding oracle."""
from fractions import Fraction


def integer(value):
    negative = value.startswith('-')
    text = value[1:] if negative else value
    n = 0
    for at in range(0, len(text), 9):
        chunk = text[at:at+9]
        n = n * 10**len(chunk) + int(chunk)
    return -n if negative else n


def rounded_four(numerator, denominator):
    """Nearest four significant digits, ties away from zero; no floating point.

    Return signed coefficient and scientific exponent. Nonzero coefficient has
    four digits. It represents coefficient * 10**(exponent - 3).
    """
    n, d = integer(numerator), integer(denominator)
    assert d > 0
    if n == 0:
        return {'coefficient': 0, 'exponent': 0}
    sign = -1 if n < 0 else 1
    n = abs(n)
    # Normalize by an exact comparison, then round the scaled Fraction to an integer.
    exponent = len(numerator.lstrip('-')) - len(denominator)
    power = Fraction(10**exponent) if exponent >= 0 else Fraction(1, 10**(-exponent))
    value = Fraction(n, d)
    if value < power:
        exponent -= 1
    scale = 3 - exponent
    scaled = value * 10**scale if scale >= 0 else value / 10**(-scale)
    floor = scaled.numerator // scaled.denominator
    rounded = floor + (scaled - floor >= Fraction(1, 2))
    if rounded == 10000:
        rounded = 1000
        exponent += 1
    assert 1000 <= rounded <= 9999
    return {'coefficient': sign * rounded, 'exponent': exponent}


def cases():
    triples = [
        ('zero', '0', '1'),
        ('one', '1', '1'),
        ('third', '1', '3'),
        ('negative_third', '-1', '3'),
        ('below_half', '12344999', '1000000'),
        ('exact_half', '2469', '200'),
        ('negative_exact_half', '-2469', '200'),
        ('above_half', '12345001', '1000000'),
        ('below_carry', '99994', '10000'),
        ('exact_carry', '19999', '2000'),
        ('negative_carry', '-19999', '2000'),
        ('tiny_carry', '19999', '200000000'),
        ('negative_tiny_carry', '-19999', '200000000'),
        ('tiny_exact', '1', '1' + '0' * 2499),
        ('negative_tiny_exact', '-1', '1' + '0' * 2499),
        ('huge_exact', '1' + '0' * 4999, '1'),
        ('negative_huge_exact', '-1' + '0' * 4999, '1'),
        ('huge_rounding_carry', '9' * 5000, '1'),
        ('both_digit_caps', '1' + '0' * 4999, '9' * 2500),
        ('ordinary_close_to_zero', '-1', '20000'),
        ('fixed_lower_boundary', '1', '1000'),
        ('scientific_lower_boundary', '1', '10000'),
        ('fixed_upper_boundary', '9999', '1'),
        ('scientific_upper_boundary', '10000', '1'),
        ('carry_into_fixed_lower_boundary', '19999', '20000000'),
        ('carry_into_scientific_upper_boundary', '19999', '2'),
    ]
    return [{'name': name, 'numerator': n, 'denominator': d,
             'expected': rounded_four(n, d)} for name, n, d in triples]
