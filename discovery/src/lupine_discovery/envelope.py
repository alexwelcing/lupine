"""Residual cones under an explicit, assumed global Lipschitz premise.

Distances and L are supplied premises; this module does not certify smoothness.
Residual convention is model minus truth, so truth = model minus residual.
"""
from dataclasses import dataclass
from typing import Mapping, Callable, Sequence
from .core import Interval, exact


@dataclass(frozen=True)
class Anchor:
    anchor_id: str
    residual: Interval

    def __post_init__(self):
        if not isinstance(self.anchor_id, str) or not self.anchor_id:
            raise ValueError('anchor ID must be nonempty')
        if not isinstance(self.residual, Interval):
            raise TypeError('residual must be an Interval')


def residual_envelope(anchors: Sequence[Anchor], distances: Mapping | Callable, L) -> Interval:
    """Intersect cones at one query; distances maps anchor IDs to query distances."""
    L = exact(L)
    if L < 0:
        raise ValueError('negative Lipschitz constant')
    if not anchors:
        raise ValueError('at least one anchor required for a finite envelope')
    if len({a.anchor_id for a in anchors}) != len(anchors):
        raise ValueError('duplicate anchor IDs')
    lowers, uppers = [], []
    for anchor in anchors:
        distance = exact(distances(anchor.anchor_id) if callable(distances) else distances[anchor.anchor_id])
        if distance < 0:
            raise ValueError('negative distance')
        lowers.append(anchor.residual.lower - L * distance)
        uppers.append(anchor.residual.upper + L * distance)
    return Interval(max(lowers), min(uppers))


def corrected_interval(model, residual: Interval) -> Interval:
    """Correct a point or interval model using residual = model - truth."""
    model = model if isinstance(model, Interval) else Interval(model, model)
    return Interval(model.lower - residual.upper, model.upper - residual.lower)
