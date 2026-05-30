"""Theorem-aware DSPy signatures for the Lupine autoresearch loop.

These signatures reference formal properties verified in lean-spec
(ATLAS_Lean_Integration_Review.md §14.2). The dspy import is LAZY: this
package — and :mod:`atlas_theorem_signature` — import cleanly even when
``dspy`` is not installed. The actual ``dspy.Signature`` subclass is built on
first access via :func:`atlas_theorem_signature.get_theorem_guided_hypothesis`
or by attribute access (``signatures.TheoremGuidedHypothesis``).
"""

from __future__ import annotations

from .atlas_theorem_signature import (  # noqa: F401
    build_theorem_context,
    get_theorem_guided_hypothesis,
    load_theorem_inventory,
)

__all__ = [
    "build_theorem_context",
    "get_theorem_guided_hypothesis",
    "load_theorem_inventory",
    "TheoremGuidedHypothesis",
]


def __getattr__(name: str):
    """PEP 562 lazy attribute access.

    Accessing ``signatures.TheoremGuidedHypothesis`` builds the dspy signature
    on demand, so merely importing this package never requires dspy.
    """
    if name == "TheoremGuidedHypothesis":
        return get_theorem_guided_hypothesis()
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
