"""ATLAS autoformalization-success evaluator (ATLAS_Lean_Integration_Review §9.4).

Pure function over a list of trace-like objects. A "trace" is any mapping that
carries OpenInference / ATLAS span attributes (see src/telemetry/atlas.ts):

    {
        "attributes": {
            "lupine.proof.status": "verified" | "extended" | "imported" | "failed",
            "lupine.atlas.module": "Atlas/Manifold/Core.lean",
            ...
        }
    }

Autoformalization "succeeds" when a theorem reference reaches a machine-checked
state — ``verified`` or ``extended`` — as opposed to ``imported`` (declared but
not yet checked here) or ``failed`` (Lean rejected it). The score is the share
of ATLAS-bearing traces that succeeded.

The function is total and side-effect-free: it never mutates its input and
guards the empty-list case (returns score 0.0 with a zero breakdown) so an
empty or ATLAS-free trace set evaluates cleanly instead of dividing by zero.
"""

from __future__ import annotations

from typing import Any, Dict, List, Mapping

PROOF_STATUS_KEY = "lupine.proof.status"
SUCCESS_STATUSES = frozenset({"verified", "extended"})


def _attributes(trace: Mapping[str, Any]) -> Mapping[str, Any]:
    """Return a trace's attribute mapping, tolerating flat or nested shapes."""
    attrs = trace.get("attributes")
    if isinstance(attrs, Mapping):
        return attrs
    # Fall back to treating the trace itself as the attribute bag.
    return trace


def atlas_autoformalization_success(traces: List[Mapping[str, Any]]) -> Dict[str, Any]:
    """Score the autoformalization success rate over ATLAS-bearing traces.

    Args:
        traces: list of trace-like mappings (see module docstring).

    Returns:
        A result dict::

            {
                "name": "atlas_autoformalization_success",
                "score": float,        # successes / considered, 0.0 if none
                "considered": int,     # traces carrying a proof status
                "succeeded": int,      # verified or extended
                "failed": int,         # status == "failed"
                "by_status": {status: count, ...},
            }
    """
    by_status: Dict[str, int] = {}
    considered = 0
    succeeded = 0
    failed = 0

    for trace in traces:
        attrs = _attributes(trace)
        status = attrs.get(PROOF_STATUS_KEY)
        if status is None:
            continue
        status = str(status)
        considered += 1
        by_status[status] = by_status.get(status, 0) + 1
        if status in SUCCESS_STATUSES:
            succeeded += 1
        elif status == "failed":
            failed += 1

    # Guard the empty / ATLAS-free case — no division by zero.
    score = (succeeded / considered) if considered else 0.0

    return {
        "name": "atlas_autoformalization_success",
        "score": round(score, 4),
        "considered": considered,
        "succeeded": succeeded,
        "failed": failed,
        "by_status": by_status,
    }
