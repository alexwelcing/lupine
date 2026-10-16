"""Exact finite permutation primitive with explicitly injected test bytes.

No entropy acquisition, source reader, production allocation, or CLI lives here.
Successful sampling is conditionally uniform if supplied byte strings are
independent and uniform. This module does not attest that premise.
"""
from __future__ import annotations

from dataclasses import dataclass
from math import factorial
from typing import Callable

Identifier = int | str
MAX_SIZE = 64
MAX_DRAWS = 128


def _universe(sorted_ids: tuple[Identifier, ...] | list[Identifier]) -> tuple[Identifier, ...]:
    if type(sorted_ids) not in (tuple, list):
        raise TypeError('IDs must be an explicit tuple or list')
    if not 2 <= len(sorted_ids) <= MAX_SIZE:
        raise ValueError('Permutation universe must contain 2 through 64 IDs')
    ids = tuple(sorted_ids)
    kind = type(ids[0])
    if kind not in (int, str) or any(type(value) is not kind for value in ids):
        raise TypeError('IDs must be homogeneous exact integers or strings; booleans are invalid')
    if kind is str and any(not value for value in ids):
        raise ValueError('String IDs must be nonempty')
    if any(left >= right for left, right in zip(ids, ids[1:])):
        raise ValueError('IDs must be distinct and supplied in strictly increasing order')
    return ids


def factorial_unrank(sorted_ids: tuple[Identifier, ...] | list[Identifier], index: int) -> tuple[Identifier, ...]:
    """Return the index-th lexicographic permutation, for 0 <= index < n!."""
    ids = _universe(sorted_ids)
    if type(index) is not int:
        raise TypeError('Permutation index must be an exact integer')
    if not 0 <= index < factorial(len(ids)):
        raise ValueError('Permutation index must lie in [0, n!)')
    remaining = list(ids)
    result = []
    residual = index
    for count in range(len(ids), 0, -1):
        position, residual = divmod(residual, factorial(count - 1))
        result.append(remaining.pop(position))
    return tuple(result)


def factorial_rank(sorted_ids: tuple[Identifier, ...] | list[Identifier],
                   permutation: tuple[Identifier, ...] | list[Identifier]) -> int:
    """Invert factorial_unrank for an exact permutation of the given universe."""
    ids = _universe(sorted_ids)
    if type(permutation) not in (tuple, list):
        raise TypeError('Permutation must be an explicit tuple or list')
    values = tuple(permutation)
    if len(values) != len(ids) or any(type(value) is not type(ids[0]) for value in values):
        raise ValueError('Permutation shape or identifier types differ')
    if len(set(values)) != len(ids) or set(values) != set(ids):
        raise ValueError('Permutation must contain every original ID exactly once')
    remaining = list(ids)
    rank = 0
    for value in values:
        position = remaining.index(value)
        rank += position * factorial(len(remaining) - 1)
        remaining.pop(position)
    return rank


@dataclass(frozen=True, slots=True)
class Draw:
    ordinal: int
    raw_hex: str | None
    masked_index: int | None
    status: str
    received_bytes: int | None


@dataclass(frozen=True, slots=True)
class AllocationReceipt:
    schema: str
    status: str
    reason: str
    original_ids: tuple[Identifier, ...]
    permutation_count: int
    mask_bits: int
    requested_bytes: int
    maximum_draws: int
    draws: tuple[Draw, ...]
    accepted_index: int | None
    permutation: tuple[Identifier, ...] | None
    uniform_byte_source_attested: bool = False
    physical_independence_established: bool = False


def sample_permutation(sorted_ids: tuple[Identifier, ...] | list[Identifier],
                       byte_source: Callable[[int], bytes]) -> AllocationReceipt:
    """Request exact byte strings until an unbiased index is accepted or blocked.

    The callback is mandatory; this function never selects an OS source. For
    n=40 it requests 20 bytes and uses all 160 bits. Other n mask unused high
    bits. An index >= n! is rejected, never reduced modulo n!. At most 128
    calls occur, and no call follows acceptance. No partial allocation appears
    in a blocked receipt. Prior valid draws survive provider failures; invalid
    return values are not encoded, and only their byte length (if bytes) is kept.
    """
    ids = _universe(sorted_ids)
    if not callable(byte_source):
        raise TypeError('An explicit callable byte source is required')
    count = factorial(len(ids))
    bits = (count - 1).bit_length()
    length = (bits + 7) // 8
    mask = (1 << bits) - 1
    draws: list[Draw] = []

    def receipt(status, reason, index=None, permutation=None):
        return AllocationReceipt('lupine.permutation-allocation.fixture.v1', status, reason,
            ids, count, bits, length, MAX_DRAWS, tuple(draws), index, permutation)

    for ordinal in range(1, MAX_DRAWS + 1):
        try:
            raw = byte_source(length)
        except Exception:
            draws.append(Draw(ordinal, None, None, 'PROVIDER_EXCEPTION', None))
            return receipt('BLOCKED', 'PROVIDER_EXCEPTION')
        if type(raw) is not bytes:
            draws.append(Draw(ordinal, None, None, 'INVALID_RETURN_TYPE', None))
            return receipt('BLOCKED', 'INVALID_RETURN_TYPE')
        if len(raw) != length:
            draws.append(Draw(ordinal, None, None, 'INVALID_RETURN_LENGTH', len(raw)))
            return receipt('BLOCKED', 'INVALID_RETURN_LENGTH')
        index = int.from_bytes(raw, 'big') & mask
        if index >= count:
            draws.append(Draw(ordinal, raw.hex(), index, 'REJECTED_OUT_OF_RANGE', length))
            continue
        draws.append(Draw(ordinal, raw.hex(), index, 'ACCEPTED', length))
        return receipt('SUCCESS', 'EXACT_INDEX_ACCEPTED', index, factorial_unrank(ids, index))
    return receipt('BLOCKED', 'DRAW_LIMIT_REACHED')
