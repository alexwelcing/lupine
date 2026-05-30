"""ATLAS Mathlib-compatibility evaluator (ATLAS_Lean_Integration_Review §9.4).

Pure function over a list of trace-like objects. A "trace" is any mapping that
carries OpenInference / ATLAS span attributes (see src/telemetry/atlas.ts):

    {
        "attributes": {
            "lupine.build.mathlib_revision": "<git-sha-or-tag>",
            ...
        }
    }

A facet is Mathlib-compatible for a run when the Mathlib revision its trace was
produced against matches the revision the fleet is pinned to. Drift (a trace
built against a stale or forked Mathlib) is the failure mode this catches: an
ATLAS proof that no longer compiles against the pinned Mathlib is not a usable
formal basis.

The expected revision can be passed explicitly; otherwise the modal (most
common) revision across the traces is treated as the canonical pin, so the
evaluator still reports drift when no expectation is supplied. The function is
total and side-effect-free and guards the empty-list case.
"""

from __future__ import annotations

from collections import Counter
from typing import Any, Dict, List, Mapping, Optional

MATHLIB_REVISION_KEY = "lupine.build.mathlib_revision"


def _attributes(trace: Mapping[str, Any]) -> Mapping[str, Any]:
    """Return a trace's attribute mapping, tolerating flat or nested shapes."""
    attrs = trace.get("attributes")
    if isinstance(attrs, Mapping):
        return attrs
    return trace


def atlas_mathlib_compatibility(
    traces: List[Mapping[str, Any]],
    expected_revision: Optional[str] = None,
) -> Dict[str, Any]:
    """Score the share of ATLAS traces compatible with the pinned Mathlib revision.

    Args:
        traces: list of trace-like mappings (see module docstring).
        expected_revision: the canonical Mathlib revision to compare against. If
            None, the modal revision observed across the traces is used.

    Returns:
        A result dict::

            {
                "name": "atlas_mathlib_compatibility",
                "score": float,             # compatible / considered, 0.0 if none
                "considered": int,          # traces carrying a mathlib revision
                "compatible": int,
                "incompatible": int,
                "expected_revision": str | None,
                "revisions": {revision: count, ...},
            }
    """
    revisions: Counter[str] = Counter()
    for trace in traces:
        rev = _attributes(trace).get(MATHLIB_REVISION_KEY)
        if rev is None:
            continue
        revisions[str(rev)] += 1

    considered = sum(revisions.values())

    # Guard the empty / revision-free case — no division by zero, no modal pick.
    if considered == 0:
        return {
            "name": "atlas_mathlib_compatibility",
            "score": 0.0,
            "considered": 0,
            "compatible": 0,
            "incompatible": 0,
            "expected_revision": expected_revision,
            "revisions": {},
        }

    # Default the pin to the modal revision when no expectation is supplied.
    pinned = expected_revision if expected_revision is not None else revisions.most_common(1)[0][0]

    compatible = revisions.get(pinned, 0)
    incompatible = considered - compatible

    return {
        "name": "atlas_mathlib_compatibility",
        "score": round(compatible / considered, 4),
        "considered": considered,
        "compatible": compatible,
        "incompatible": incompatible,
        "expected_revision": pinned,
        "revisions": dict(revisions),
    }
