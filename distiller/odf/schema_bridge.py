"""Schema-bridge: the shared benchmark/promotion contract between
``lupine-distill`` (the producer) and ``distiller`` / ODF (the consumer).

Why this module exists
----------------------
The ``lupine-distill`` Rust engine + its Python runtime own the *canonical*
benchmark-result shape (``lupine_distill.schemas.BenchmarkResult`` /
``BenchmarkMetrics``). The ODF promotion harness lives in a different package
and must not take a hard runtime dependency on ``lupine-distill`` just to read
a result dict. So we re-declare a **local, structurally-equivalent** schema
here and validate untrusted JSON against it at the boundary.

  ┌────────────────────┐   benchmark_results JSON    ┌────────────────────┐
  │  lupine-distill     │ ──────────────────────────▶ │  distiller / ODF    │
  │  (canonical PRODUCER)│   distill_v_uplift score    │  (this CONSUMER)    │
  └────────────────────┘                              └────────────────────┘

IMPORTANT: ``lupine_distill.schemas`` is the canonical producer of this shape.
This module deliberately mirrors it (see field-by-field parity below) rather
than importing it — keep the two in sync when the canonical schema changes.

Contract fields (ATLAS_Lean_Integration_Review.md §13.2 table)
--------------------------------------------------------------
| Field               | Source           | Consumer            | Description                  |
|---------------------|------------------|---------------------|------------------------------|
| ``benchmark_results``| TorchSim backend | ODF promotion gate  | Per-benchmark metrics JSON   |
| ``distill_v_uplift`` | Uplift calculator| ODF decision logic  | Composite uplift score       |
| ``atlas_theorem_refs``| lean-spec       | Model card          | Formal verification basis    |
| ``formal_properties``| lean-spec        | Phoenix dashboard   | Proved model properties      |

All models are frozen (immutable): build a new instance to "change" one,
mirroring the canonical ``lupine-distill`` contract.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# ── Literals (mirror lupine_distill.schemas) ─────────────────────────────────

Backend = Literal["torchsim", "ase", "lammps"]
PromotionRecommendation = Literal["promote", "review", "reject"]


# ── Mirrored canonical benchmark contract ────────────────────────────────────
# Field-by-field parity with lupine_distill.schemas.BenchmarkMetrics /
# .BenchmarkResult. Do NOT import the canonical module here (no cross-package
# runtime dependency) — keep the shapes aligned by hand.


class BenchmarkMetrics(BaseModel):
    """Per-benchmark accuracy / stability / cost metrics.

    Local mirror of ``lupine_distill.schemas.BenchmarkMetrics``. All accuracy
    fields are optional because a given benchmark only produces a subset.
    ``None`` means "this benchmark does not produce this metric", not "zero".
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    # Accuracy vs DFT reference (lower is better).
    mae_energy: float | None = Field(default=None, description="MAE energy, eV/atom")
    mae_forces: float | None = Field(default=None, description="MAE forces, eV/Ang")
    mae_stress: float | None = Field(default=None, description="MAE stress, GPa")
    rmse_energy: float | None = Field(default=None, description="RMSE energy, eV/atom")

    # Dynamics stability.
    energy_drift: float | None = Field(default=None, description="Energy drift, eV/atom/ps")
    temperature_stability: float | None = Field(default=None, description="Temp stability, K")

    # Provenance + cost.
    dft_reference: dict[str, float] | None = Field(
        default=None, description="DFT reference values keyed by quantity"
    )
    wall_time_seconds: float = Field(..., ge=0.0, description="Wall-clock seconds")
    gpu_utilization_pct: float | None = Field(
        default=None, ge=0.0, le=100.0, description="Mean GPU utilization, percent"
    )


class BenchmarkResult(BaseModel):
    """A full benchmark-suite run for one (model, distill version, backend).

    Local mirror of ``lupine_distill.schemas.BenchmarkResult`` — the canonical
    producer. ``overall_uplift_pct`` is the ``distill_v_uplift`` composite score
    the ODF promotion gate consumes.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    model_id: str = Field(..., min_length=1)
    distill_version: int = Field(..., ge=0, description="0 == teacher baseline")
    backend: Backend
    timestamp: datetime
    torchsim_version: str = Field(..., min_length=1)
    benchmark_suite_version: str = Field(..., min_length=1)

    # benchmark_results: map of benchmark name -> metrics.
    results: dict[str, BenchmarkMetrics] = Field(default_factory=dict)

    # distill_v_uplift composite score + recommendation (filled by uplift calc).
    overall_uplift_pct: float | None = None
    promotion_recommendation: PromotionRecommendation | None = None


# ── ATLAS formal-verification extension fields ───────────────────────────────
# These extend the shared contract per §13.2: produced by lean-spec, consumed
# by the ODF model card / Phoenix dashboard.


class FormalContract(BaseModel):
    """The ATLAS formal-verification extension of the benchmark contract.

    ``atlas_theorem_refs`` and ``formal_properties`` are sourced from lean-spec
    build artifacts and travel alongside the benchmark result into the
    promotion gate and the theorem-aware model card.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    atlas_theorem_refs: list[str] = Field(
        default_factory=list,
        description="Fully-qualified ATLAS/ODF theorem names this model depends on, "
        "e.g. 'Atlas.RealAnalysis.ContinuousFunction'",
    )
    formal_properties: list[str] = Field(
        default_factory=list,
        description="Proved model properties, e.g. 'energy_continuity: proved via Atlas.RealAnalysis'",
    )


# Canonical names for the §13.2 contract fields, exported so producer and
# consumer agree on the wire keys.
CONTRACT_FIELDS = (
    "benchmark_results",  # -> BenchmarkResult.results
    "distill_v_uplift",   # -> BenchmarkResult.overall_uplift_pct
    "atlas_theorem_refs",  # -> FormalContract.atlas_theorem_refs
    "formal_properties",   # -> FormalContract.formal_properties
)


__all__ = [
    "Backend",
    "PromotionRecommendation",
    "BenchmarkMetrics",
    "BenchmarkResult",
    "FormalContract",
    "CONTRACT_FIELDS",
]
