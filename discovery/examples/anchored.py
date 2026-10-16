"""Synthetic bridge from Lupine residual cones to a candidate pool.

The global Lipschitz constant is an assumed premise, not estimated or certified
by these two anchors. The candidate coordinates have no physical interpretation.
Run from the repository root after installation: python examples/anchored.py
"""
import json

from lupine_discovery.core import Candidate, Interval, select
from lupine_discovery.envelope import Anchor, corrected_interval, residual_envelope
from lupine_discovery.serialization import encode


anchors = [Anchor("anchor-at-0", Interval(0, 0)),
           Anchor("anchor-at-2", Interval(1, 1))]
candidates = []
for cid, coordinate, prediction in [("query-1", 1, 3), ("query-3", 3, 6)]:
    residual = residual_envelope(
        anchors,
        {"anchor-at-0": abs(coordinate), "anchor-at-2": abs(coordinate - 2)},
        L=1,
    )
    candidates.append(Candidate(cid, corrected_interval(prediction, residual), {}))

print(json.dumps(encode({
    "evidence_kind": "synthetic_fixture",
    "assumptions": ["Anchor residuals are exact in this synthetic scope.",
                    "Residual is globally 1-Lipschitz in coordinate distance."],
    "candidates": candidates,
    "selection": select(candidates),
}), indent=2))
