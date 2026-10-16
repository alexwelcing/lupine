"""Exact selection, conditional on sound score and constraint intervals."""
from dataclasses import dataclass
from fractions import Fraction
from types import MappingProxyType
from typing import Mapping, Sequence


def exact(value) -> Fraction:
    """Parse rational data without accepting inexact floating point values."""
    if isinstance(value, bool) or not isinstance(value, (Fraction, int, str)):
        raise TypeError('exact values must be Fraction, int, or rational strings')
    return Fraction(value)


@dataclass(frozen=True)
class Interval:
    lower: Fraction
    upper: Fraction

    def __post_init__(self):
        object.__setattr__(self, 'lower', exact(self.lower))
        object.__setattr__(self, 'upper', exact(self.upper))
        if self.lower > self.upper:
            raise ValueError('inverted interval')

    def contains(self, value):
        value = exact(value)
        return self.lower <= value <= self.upper


@dataclass(frozen=True)
class Candidate:
    candidate_id: str
    score: Interval
    constraints: Mapping[str, Interval]

    def __post_init__(self):
        if not isinstance(self.candidate_id, str) or not self.candidate_id.strip():
            raise ValueError('candidate_id must be a nonempty string')
        if not isinstance(self.score, Interval):
            raise TypeError('score must be an Interval')
        if any(not isinstance(k, str) or not isinstance(v, Interval)
               for k, v in self.constraints.items()):
            raise TypeError('constraints must map strings to Intervals')
        object.__setattr__(self, 'constraints', MappingProxyType(dict(self.constraints)))


@dataclass(frozen=True)
class Selection:
    certified_feasible: tuple[str, ...]
    possible_feasible: tuple[str, ...]
    retained: tuple[str, ...]
    certified_infeasible: tuple[str, ...]
    dominated: tuple[str, ...]
    incumbent: str | None
    threshold: Fraction | None
    regret_bound: Fraction | None


def _index(candidates):
    result = {}
    keys = None
    for c in candidates:
        if not isinstance(c, Candidate):
            raise TypeError('expected Candidate')
        if c.candidate_id in result:
            raise ValueError('duplicate candidate ID')
        if keys is None:
            keys = set(c.constraints)
        elif keys != set(c.constraints):
            raise ValueError('mismatched constraint keys')
        result[c.candidate_id] = c
    return result


def select(candidates: Sequence[Candidate]) -> Selection:
    indexed = _index(candidates)
    certified = tuple(sorted(i for i, c in indexed.items()
                             if all(g.upper <= 0 for g in c.constraints.values())))
    possible = tuple(sorted(i for i, c in indexed.items()
                            if all(g.lower <= 0 for g in c.constraints.values())))
    incumbent = min(certified, key=lambda i: (indexed[i].score.upper, i)) if certified else None
    threshold = indexed[incumbent].score.upper if incumbent is not None else None
    retained = tuple(i for i in possible if threshold is None or indexed[i].score.lower <= threshold)
    regret = threshold - min(indexed[i].score.lower for i in possible) if threshold is not None else None
    return Selection(certified, possible, retained,
                     tuple(sorted(set(indexed) - set(possible))),
                     tuple(sorted(set(possible) - set(retained))),
                     incumbent, threshold, regret)


def validate_refinement(before: Sequence[Candidate], after: Sequence[Candidate]) -> None:
    """Check identity/constraint scope preservation and componentwise tightening.

    Consequently F- grows, F+ shrinks, and the retained set cannot grow.
    Semantic measurement scope is checked separately by the evidence layer.
    """
    old, new = _index(before), _index(after)
    if old.keys() != new.keys():
        raise ValueError('refinement changes candidate IDs')
    for i, c in old.items():
        d = new[i]
        if c.constraints.keys() != d.constraints.keys():
            raise ValueError('refinement changes constraint scope')
        pairs = [(c.score, d.score)] + [(c.constraints[k], d.constraints[k]) for k in c.constraints]
        if any(not a.lower <= b.lower <= b.upper <= a.upper for a, b in pairs):
            raise ValueError('refinement must tighten every interval')


def refine_selection(before: Sequence[Candidate], after: Sequence[Candidate]) -> Selection:
    validate_refinement(before, after)
    return select(after)


def linear_interval(terms: Sequence[tuple[Fraction, Interval]], offset=0) -> Interval:
    low = high = exact(offset)
    for weight, interval in terms:
        weight = exact(weight)
        a, b = weight * interval.lower, weight * interval.upper
        low += min(a, b)
        high += max(a, b)
    return Interval(low, high)


def max_interval(intervals: Sequence[Interval]) -> Interval:
    if not intervals:
        raise ValueError('maximum requires at least one interval')
    return Interval(max(i.lower for i in intervals), max(i.upper for i in intervals))


def min_interval(intervals: Sequence[Interval]) -> Interval:
    if not intervals:
        raise ValueError('minimum requires at least one interval')
    return Interval(min(i.lower for i in intervals), min(i.upper for i in intervals))
