"""Exact finite coefficient representations; no physical interpretation implied.

Sparse mappings declare omitted axes to be zero. An explicit unknown is never
zero-filled. Resource failures produce no vector or distance.
"""
from __future__ import annotations

from dataclasses import dataclass
from fractions import Fraction
from math import gcd
from typing import Mapping

MAX_BITS = 1024


class RepresentationError(ValueError):
    """A fixed, data-free error code for invalid or unresolved arithmetic."""


def _limit(value):
    if type(value) is not int or not 1 <= value <= MAX_BITS:
        raise RepresentationError("INVALID_LIMIT")
    return value


def _axes(values):
    if not isinstance(values, (tuple, list)):
        raise RepresentationError("INVALID_AXES")
    axes = tuple(values)
    if any(type(x) is not str or not x for x in axes) or len(set(axes)) != len(axes):
        raise RepresentationError("INVALID_AXES")
    return axes


def _integer(value, limit):
    if abs(value).bit_length() > limit:
        raise RepresentationError("RESOURCE_LIMIT")
    return value


def _exact(value, limit):
    if value is None:
        raise RepresentationError("UNKNOWN_COEFFICIENT")
    if type(value) not in (int, Fraction):
        raise RepresentationError("INVALID_COEFFICIENT")
    if type(value) is int:
        _integer(value, limit)
    else:
        _integer(value.numerator, limit)
        _integer(value.denominator, limit)
    return Fraction(value)


def _multiply(left, right, limit):
    if left and right and abs(left) > ((1 << limit) - 1) // abs(right):
        raise RepresentationError("RESOURCE_LIMIT")
    return left * right


def _integer_add(left, right, limit):
    if (left > 0 and right > 0 or left < 0 and right < 0) and abs(left) > (1 << limit) - 1 - abs(right):
        raise RepresentationError("RESOURCE_LIMIT")
    return left + right


def _add(left, right, limit):
    common = gcd(left.denominator, right.denominator)
    left_factor, right_factor = right.denominator // common, left.denominator // common
    a = _multiply(left.numerator, left_factor, limit)
    b = _multiply(right.numerator, right_factor, limit)
    numerator = _integer_add(a, b, limit)
    denominator = _multiply(left.denominator, left_factor, limit)
    return Fraction(numerator, denominator)


def _divide(left, right, limit):
    # Cross-cancel before constructing the two bounded integers.
    first = gcd(abs(left.numerator), abs(right.numerator))
    second = gcd(left.denominator, right.denominator)
    numerator = _multiply(left.numerator // first, right.denominator // second, limit)
    denominator = _multiply(left.denominator // second, right.numerator // first, limit)
    return Fraction(numerator, denominator)


@dataclass(frozen=True)
class NormalizedVector:
    axes: tuple[str, ...]
    values: tuple[Fraction, ...]

    def __post_init__(self):
        axes = _axes(self.axes)
        if not isinstance(self.values, (tuple, list)) or len(self.values) != len(axes):
            raise RepresentationError("DIMENSION_MISMATCH")
        values = tuple(_exact(x, MAX_BITS) for x in self.values)
        total = Fraction(0)
        for value in values:
            if value < 0:
                raise RepresentationError("NEGATIVE_COEFFICIENT")
            total = _add(total, value, MAX_BITS)
        if total != 1:
            raise RepresentationError("NOT_NORMALIZED")
        object.__setattr__(self, "axes", axes)
        object.__setattr__(self, "values", values)


def normalize_coefficients(axes, coefficients: Mapping[str, int | Fraction | None], *, max_bits=MAX_BITS):
    """Normalize a complete declared sparse nonnegative coefficient mapping.

The finite axes and their order are explicit. Absent keys are declared zero;
None is unknown and raises. Coefficient-map insertion order has no effect.
The 1..1024-bit profile guards arithmetic intermediates, not wall time/memory.
"""
    axes, limit = _axes(axes), _limit(max_bits)
    if not isinstance(coefficients, Mapping):
        raise RepresentationError("INVALID_COEFFICIENT_MAP")
    if any(type(key) is not str or key not in axes for key in coefficients):
        raise RepresentationError("UNKNOWN_AXIS")
    values = tuple(_exact(coefficients.get(axis, 0), limit) for axis in axes)
    total = Fraction(0)
    for value in values:
        if value < 0:
            raise RepresentationError("NEGATIVE_COEFFICIENT")
        total = _add(total, value, limit)
    if total <= 0:
        raise RepresentationError("NONPOSITIVE_TOTAL")
    return NormalizedVector(axes, tuple(_divide(x, total, limit) for x in values))


def l1_distance(left: NormalizedVector, right: NormalizedVector, *, max_bits=MAX_BITS):
    """Exact L1 on the same declared axes, or a fixed unresolved/error code."""
    limit = _limit(max_bits)
    if type(left) is not NormalizedVector or type(right) is not NormalizedVector:
        raise RepresentationError("INVALID_VECTOR")
    if left.axes != right.axes:
        raise RepresentationError("AXIS_MISMATCH")
    total = Fraction(0)
    for x, y in zip(left.values, right.values):
        x, y = _exact(x, limit), _exact(y, limit)
        difference = abs(_add(x, -y, limit))
        total = _add(total, difference, limit)
    return total
