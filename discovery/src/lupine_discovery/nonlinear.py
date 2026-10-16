"""Finite exact interval enclosures for selected nonlinear operations.

These operations enclose values, conditional on sound operand intervals. They
do not establish a physical model or assume independence between observations.
Reciprocal and division reject every interval containing zero.
"""
from fractions import Fraction

from .core import Interval


def _require_interval(value):
    if not isinstance(value, Interval):
        raise TypeError('expected Interval')
    return value


def multiply_interval(left: Interval, right: Interval) -> Interval:
    """Hull of all products over the Cartesian product of two intervals."""
    left, right = _require_interval(left), _require_interval(right)
    corners = (left.lower * right.lower, left.lower * right.upper,
               left.upper * right.lower, left.upper * right.upper)
    return Interval(min(corners), max(corners))


def reciprocal_interval(interval: Interval) -> Interval:
    """Enclose 1/x; the entire input interval must be strictly one sign."""
    interval = _require_interval(interval)
    if interval.lower <= 0 <= interval.upper:
        raise ValueError('reciprocal is undefined for an interval containing zero')
    return Interval(Fraction(1) / interval.upper, Fraction(1) / interval.lower)


def divide_interval(numerator: Interval, denominator: Interval) -> Interval:
    """Enclose x/y; reject zero-containing denominator even for zero x."""
    numerator, denominator = _require_interval(numerator), _require_interval(denominator)
    return multiply_interval(numerator, reciprocal_interval(denominator))


def square_interval(interval: Interval) -> Interval:
    """Enclose x*x while retaining that both factors are the same value."""
    interval = _require_interval(interval)
    endpoints = (interval.lower ** 2, interval.upper ** 2)
    lower = Fraction(0) if interval.lower <= 0 <= interval.upper else min(endpoints)
    return Interval(lower, max(endpoints))
