"""A-priori regime gating for distill ribbons.

The post-hoc :mod:`lupine_distill.uplift` gate measures gain against an oracle
and then promotes/reviews/rejects. This package is its upstream complement: it
decides whether a ribbon may apply *at all* from the ribbon's provenance, with
no oracle — the safety filter that makes distill safe on novel materials and the
diagnose -> fix -> re-prove loop repeatable.

    from lupine_distill.regime import RibbonProvenance, CellFingerprint, regime_gate
    from lupine_distill.regime import score_gate, DominanceReport
"""

from __future__ import annotations

from .gate import (
    CellFingerprint,
    Decision,
    GateDecision,
    RibbonProvenance,
    parse_metric_kind,
    parse_reference_family,
    regime_gate,
)
from .score import DominanceReport, ScoredCell, score_gate

__all__ = [
    "CellFingerprint",
    "Decision",
    "DominanceReport",
    "GateDecision",
    "RibbonProvenance",
    "ScoredCell",
    "parse_metric_kind",
    "parse_reference_family",
    "regime_gate",
    "score_gate",
]
