"""ATLAS dependency-depth evaluator (ATLAS_Lean_Integration_Review §9.4).

Pure function over a list of trace-like objects. A "trace" is any mapping that
carries OpenInference / ATLAS span attributes (see src/telemetry/atlas.ts). The
depth of a proof's dependency chain is read from, in priority order:

    {
        "attributes": {
            "lupine.theorem.dependency_depth": 3,        # explicit, preferred
            # or, when only the chain is recorded:
            "lupine.theorem.dependencies": ["a", "b"],   # depth = len(chain)
            "lupine.theorem.name": "Atlas.Manifold.prCongr",
            ...
        }
    }

Dependency depth proxies the *formal cost* of a hypothesis: a claim resting on a
deep stack of upstream lemmas is more expensive to keep green (any upstream
change ripples down) and more powerful (it composes more machinery). This
evaluator summarizes the depth distribution so the fleet can watch whether its
formal reasoning is getting deeper (richer) or flatter over time.

The function is total and side-effect-free and guards the empty-list case
(returns mean/max/min 0 with an empty histogram).
"""

from __future__ import annotations

from typing import Any, Dict, List, Mapping, Optional

DEPENDENCY_DEPTH_KEY = "lupine.theorem.dependency_depth"
DEPENDENCIES_KEY = "lupine.theorem.dependencies"


def _attributes(trace: Mapping[str, Any]) -> Mapping[str, Any]:
    """Return a trace's attribute mapping, tolerating flat or nested shapes."""
    attrs = trace.get("attributes")
    if isinstance(attrs, Mapping):
        return attrs
    return trace


def _depth(attrs: Mapping[str, Any]) -> Optional[int]:
    """Extract a non-negative integer dependency depth, or None if absent."""
    raw = attrs.get(DEPENDENCY_DEPTH_KEY)
    if raw is not None:
        try:
            depth = int(raw)
        except (TypeError, ValueError):
            return None
        return depth if depth >= 0 else None

    chain = attrs.get(DEPENDENCIES_KEY)
    if isinstance(chain, (list, tuple)):
        return len(chain)
    return None


def atlas_dependency_depth(traces: List[Mapping[str, Any]]) -> Dict[str, Any]:
    """Summarize the theorem dependency-depth distribution over ATLAS traces.

    Args:
        traces: list of trace-like mappings (see module docstring).

    Returns:
        A result dict::

            {
                "name": "atlas_dependency_depth",
                "score": float,        # mean depth (0.0 when no depths present)
                "considered": int,     # traces carrying a depth signal
                "mean": float,
                "max": int,
                "min": int,
                "histogram": {depth: count, ...},
            }
    """
    depths: List[int] = []
    histogram: Dict[int, int] = {}

    for trace in traces:
        depth = _depth(_attributes(trace))
        if depth is None:
            continue
        depths.append(depth)
        histogram[depth] = histogram.get(depth, 0) + 1

    considered = len(depths)

    # Guard the empty / depth-free case — no division by zero, no max()/min() on [].
    if considered == 0:
        return {
            "name": "atlas_dependency_depth",
            "score": 0.0,
            "considered": 0,
            "mean": 0.0,
            "max": 0,
            "min": 0,
            "histogram": {},
        }

    mean = sum(depths) / considered

    return {
        "name": "atlas_dependency_depth",
        "score": round(mean, 4),
        "considered": considered,
        "mean": round(mean, 4),
        "max": max(depths),
        "min": min(depths),
        "histogram": histogram,
    }
