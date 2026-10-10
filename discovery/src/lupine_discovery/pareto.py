"""Exact finite Pareto screening, conditional on sound input intervals.

Every objective is minimized. Constraints mean g <= 0. A dominance exclusion
requires a certified-feasible witness whose worst objective values dominate the
excluded candidate's best values, strictly in at least one coordinate.
"""
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from types import MappingProxyType

from .core import Interval


def _interval_map(value, name):
    if not isinstance(value, Mapping):
        raise TypeError(f'{name} must map nonempty strings to Intervals')
    if any(not isinstance(key, str) or not key.strip() or not isinstance(bound, Interval)
           for key, bound in value.items()):
        raise TypeError(f'{name} must map nonempty strings to Intervals')
    return MappingProxyType(dict(value))


@dataclass(frozen=True)
class ParetoCandidate:
    candidate_id: str
    objectives: Mapping[str, Interval]
    constraints: Mapping[str, Interval]

    def __post_init__(self):
        if not isinstance(self.candidate_id, str) or not self.candidate_id.strip():
            raise ValueError('candidate_id must be a nonempty string')
        objectives = _interval_map(self.objectives, 'objectives')
        if not objectives:
            raise ValueError('at least one objective is required')
        object.__setattr__(self, 'objectives', objectives)
        object.__setattr__(self, 'constraints', _interval_map(self.constraints, 'constraints'))


@dataclass(frozen=True)
class ParetoSelection:
    certified_feasible: tuple[str, ...]
    possible_feasible: tuple[str, ...]
    retained: tuple[str, ...]
    certified_infeasible: tuple[str, ...]
    dominated: tuple[str, ...]
    dominance_witnesses: Mapping[str, str]

    def __post_init__(self):
        object.__setattr__(self, 'dominance_witnesses',
                           MappingProxyType(dict(self.dominance_witnesses)))


def _index(candidates):
    result = {}
    objective_keys = constraint_keys = None
    for candidate in candidates:
        if not isinstance(candidate, ParetoCandidate):
            raise TypeError('expected ParetoCandidate')
        if candidate.candidate_id in result:
            raise ValueError('duplicate candidate ID')
        if objective_keys is None:
            objective_keys = set(candidate.objectives)
            constraint_keys = set(candidate.constraints)
        elif objective_keys != set(candidate.objectives):
            raise ValueError('mismatched objective keys')
        elif constraint_keys != set(candidate.constraints):
            raise ValueError('mismatched constraint keys')
        result[candidate.candidate_id] = candidate
    return result


def _dominates_by_bounds(witness, candidate):
    pairs = [(witness.objectives[key].upper, bound.lower)
             for key, bound in candidate.objectives.items()]
    return all(upper <= lower for upper, lower in pairs) and any(
        upper < lower for upper, lower in pairs)


def select_pareto(candidates: Sequence[ParetoCandidate]) -> ParetoSelection:
    """Return a safe superset of all feasible Pareto optima under sound bounds.

    The returned pool need not itself be a Pareto front. Witnesses are selected
    by candidate ID only after proving bound dominance, never by weighted sums
    or lexicographic objective ranking. No scalar regret or winner is defined.
    """
    indexed = _index(candidates)
    certified = tuple(sorted(candidate_id for candidate_id, candidate in indexed.items()
                             if all(bound.upper <= 0 for bound in candidate.constraints.values())))
    possible = tuple(sorted(candidate_id for candidate_id, candidate in indexed.items()
                            if all(bound.lower <= 0 for bound in candidate.constraints.values())))
    witnesses = {}
    for candidate_id in possible:
        for witness_id in certified:
            if _dominates_by_bounds(indexed[witness_id], indexed[candidate_id]):
                witnesses[candidate_id] = witness_id
                break
    return ParetoSelection(
        certified_feasible=certified,
        possible_feasible=possible,
        retained=tuple(candidate_id for candidate_id in possible if candidate_id not in witnesses),
        certified_infeasible=tuple(sorted(set(indexed) - set(possible))),
        dominated=tuple(witnesses),
        dominance_witnesses=witnesses,
    )


def validate_pareto_refinement(before: Sequence[ParetoCandidate],
                               after: Sequence[ParetoCandidate]) -> None:
    """Require unchanged candidate/scalar scopes and componentwise tightening.

    This checks arithmetic scope only. Units, reference states, operating
    conditions, and evidence compatibility belong to the separate evidence
    layer; a repeated key alone cannot establish semantic compatibility.
    """
    old, new = _index(before), _index(after)
    if old.keys() != new.keys():
        raise ValueError('refinement changes candidate IDs')
    for candidate_id, candidate in old.items():
        refined = new[candidate_id]
        if candidate.objectives.keys() != refined.objectives.keys():
            raise ValueError('refinement changes objective scope')
        if candidate.constraints.keys() != refined.constraints.keys():
            raise ValueError('refinement changes constraint scope')
        pairs = [(bound, refined.objectives[key]) for key, bound in candidate.objectives.items()]
        pairs += [(bound, refined.constraints[key]) for key, bound in candidate.constraints.items()]
        if any(not first.lower <= second.lower <= second.upper <= first.upper
               for first, second in pairs):
            raise ValueError('refinement must tighten every interval')


def refine_pareto_selection(before: Sequence[ParetoCandidate],
                            after: Sequence[ParetoCandidate]) -> ParetoSelection:
    """Validate refinement and screen again; the retained set cannot grow."""
    validate_pareto_refinement(before, after)
    return select_pareto(after)
