"""Theorem-aware DSPy signature + lean-spec inventory loader (§14.2/§14.3).

This module defines :class:`TheoremGuidedHypothesis` — a ``dspy.Signature`` that
generates a materials-science hypothesis constrained by formally-verified
ATLAS / OpenDistillationFactory theorems.

LAZY dspy import
----------------
``dspy`` (and its ``torch`` transitive dependency) are heavy and optional. This
module is importable **without dspy installed**: the signature class is only
constructed when :func:`get_theorem_guided_hypothesis` is called (or when the
parent package's ``TheoremGuidedHypothesis`` attribute is accessed). The
inventory loader below has no dspy dependency at all.

Usage (matches §14.2)::

    from lupine_dspy.signatures.atlas_theorem_signature import (
        load_theorem_inventory, get_theorem_guided_hypothesis,
    )
    theorem_ctx = load_theorem_inventory("lean-spec/build/theorem_inventory.json")
    import dspy
    module = dspy.ChainOfThought(get_theorem_guided_hypothesis())
    result = module(
        observation="Ni FCC shows anomalous softening at high temperature",
        theorem_context=theorem_ctx,
    )
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

# NOTE: do NOT `import dspy` at module scope — keep this module importable
# without dspy/torch present. dspy is imported lazily inside the factory.

# Cache for the built signature class so repeated access returns the same type.
_THEOREM_SIGNATURE_CACHE: Any = None


# ── lean-spec theorem-inventory loader (§14.3) — no dspy dependency ──────────


def load_theorem_inventory(path: str | Path) -> list[dict[str, Any]]:
    """Load a lean-spec theorem-inventory JSON and return theorem context.

    The expected source is a Lake build artifact such as
    ``lean-spec/build/theorem_inventory.json``. The returned structure is the
    ``theorem_context`` consumed by :class:`TheoremGuidedHypothesis` — a JSON
    array of theorem descriptors, each at minimum carrying a ``name`` (the
    fully-qualified theorem reference, e.g.
    ``"Atlas.RealAnalysis.Continuity"``).

    Accepted on-disk shapes (all normalized to ``list[dict]``):
      - ``{"theorems": [ {...}, ... ]}``  (preferred)
      - ``[ {...}, ... ]``                (bare array)
      - ``["Atlas.Foo", ...]``            (bare names -> wrapped as {"name": ..})
      - ``{"Atlas.Foo": {...}, ...}``     (name-keyed object)

    Missing file is handled gracefully: returns ``[]`` (callers can run with an
    empty theorem context). Malformed JSON raises ``ValueError`` so the boundary
    failure is explicit rather than silent.
    """
    p = Path(path)
    if not p.exists():
        return []

    try:
        raw = json.loads(p.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        raise ValueError(f"Could not parse theorem inventory at {p}: {exc}") from exc

    return _normalize_inventory(raw)


def _normalize_inventory(raw: Any) -> list[dict[str, Any]]:
    """Normalize the various accepted inventory shapes into ``list[dict]``."""
    if isinstance(raw, dict) and "theorems" in raw:
        raw = raw["theorems"]

    if isinstance(raw, dict):
        # name-keyed object: {"Atlas.Foo": {...}}
        out: list[dict[str, Any]] = []
        for name, body in raw.items():
            entry = dict(body) if isinstance(body, dict) else {"detail": body}
            entry.setdefault("name", name)
            out.append(entry)
        return out

    if isinstance(raw, list):
        out = []
        for item in raw:
            if isinstance(item, dict):
                out.append(item)
            elif isinstance(item, str):
                out.append({"name": item})
            # silently skip non-dict/non-str entries (defensive)
        return out

    # Unknown top-level type -> empty context (no theorems available).
    return []


def build_theorem_context(inventory: list[dict[str, Any]]) -> str:
    """Serialize a normalized inventory into the JSON-array string the
    ``theorem_context`` InputField expects (per §14.2 desc)."""
    return json.dumps(inventory, ensure_ascii=False)


# ── Lazy dspy signature factory (§14.2) ──────────────────────────────────────


def get_theorem_guided_hypothesis() -> Any:
    """Build (and cache) the ``TheoremGuidedHypothesis`` dspy.Signature class.

    Imports ``dspy`` lazily. Raises a clear ``ImportError`` if dspy is absent,
    rather than failing at module import time.
    """
    global _THEOREM_SIGNATURE_CACHE
    if _THEOREM_SIGNATURE_CACHE is not None:
        return _THEOREM_SIGNATURE_CACHE

    try:
        import dspy
    except ImportError as exc:  # pragma: no cover - exercised only without dspy
        raise ImportError(
            "dspy is required to construct TheoremGuidedHypothesis. "
            "Install it with `pip install dspy>=3.2.0`. "
            "(The module itself imports without dspy; only the signature class needs it.)"
        ) from exc

    class TheoremGuidedHypothesis(dspy.Signature):
        """Generate a materials science hypothesis constrained by verified theorems.

        Available theorem context:
        {{ theorem_context }}
        """

        observation = dspy.InputField(
            desc="Experimental or simulation observation"
        )
        theorem_context = dspy.InputField(
            desc="JSON array of available ATLAS/OpenDistillationFactory theorems"
        )

        hypothesis = dspy.OutputField(
            desc="Novel hypothesis statement"
        )
        formal_basis = dspy.OutputField(
            desc="Array of theorem references supporting the hypothesis"
        )
        algebraic_validity = dspy.OutputField(
            desc="Whether the hypothesis satisfies symmetry constraints"
        )

    _THEOREM_SIGNATURE_CACHE = TheoremGuidedHypothesis
    return TheoremGuidedHypothesis


def __getattr__(name: str):
    """PEP 562: expose ``TheoremGuidedHypothesis`` lazily at module level."""
    if name == "TheoremGuidedHypothesis":
        return get_theorem_guided_hypothesis()
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = [
    "load_theorem_inventory",
    "build_theorem_context",
    "get_theorem_guided_hypothesis",
    "TheoremGuidedHypothesis",
]
