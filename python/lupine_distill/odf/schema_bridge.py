"""Bridge from ODF promotion gate to the shared Distill schema contract.

``lupine_distill.schemas`` is the single source of truth for benchmark metrics
and results. ODF only extends that contract with formal-verification fields, so
this module re-exports the canonical models and adds the ``FormalContract``
adapter used by :mod:`python.lupine_distill.odf.promotion_gate`.
"""

from __future__ import annotations

from lupine_distill.schemas import (
    Backend,
    BenchmarkMetrics,
    BenchmarkResult,
    PromotionRecommendation,
)


class FormalContract:
    """Compatibility shim for legacy callers expecting a ``FormalContract`` type.

    The ODF promotion gate only requires that a benchmark result carry a small
    set of formal-verification fields. ``BenchmarkResult`` stores those values
    directly, so this adapter lets old code keep working without mirroring the
    whole schema.
    """

    def __init__(self, result: BenchmarkResult) -> None:
        self.result = result

    @property
    def theorem_ref(self) -> str | None:
        return getattr(self.result, "theorem_ref", None)

    @property
    def lean_ok(self) -> bool | None:
        return getattr(self.result, "lean_ok", None)


__all__ = [
    "Backend",
    "BenchmarkMetrics",
    "BenchmarkResult",
    "FormalContract",
    "PromotionRecommendation",
]
