"""Canonical Pydantic contract for MLIP benchmark results.

This module is the single source of truth for the shared benchmark contract.
Other tracks (glim-think ingest, GCP runners, Lean spec fixtures) reference
``lupine_distill.schemas.BenchmarkResult`` / ``BenchmarkMetrics`` rather than
re-deriving the shape.

Both models are frozen (immutable): construct a new instance to "change" one.
Validation runs at construction, so untrusted JSON is validated at the boundary
via :meth:`BenchmarkResult.model_validate` / ``model_validate_json``.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Backend = Literal["torchsim", "ase", "lammps"]
PromotionRecommendation = Literal["promote", "review", "reject"]


class BenchmarkMetrics(BaseModel):
    """Per-benchmark accuracy / stability / cost metrics.

    All accuracy fields are optional because a given benchmark only produces a
    subset (e.g. a static-energy benchmark has no ``energy_drift``). ``None``
    means "this benchmark does not produce this metric", not "zero".
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    # Accuracy vs DFT reference (lower is better).
    mae_energy: float | None = Field(default=None, description="MAE energy, eV/atom")
    mae_forces: float | None = Field(default=None, description="MAE forces, eV/Ang")
    mae_stress: float | None = Field(default=None, description="MAE stress, GPa")
    rmse_energy: float | None = Field(default=None, description="RMSE energy, eV/atom")

    # Dynamics stability (lower drift is better; closer-to-target temp is better).
    energy_drift: float | None = Field(default=None, description="Energy drift, eV/atom/ps")
    temperature_stability: float | None = Field(default=None, description="Temp stability, K")

    # Provenance + cost.
    dft_reference: dict[str, float] | None = Field(
        default=None, description="DFT reference values keyed by quantity"
    )
    wall_time_seconds: float = Field(..., ge=0.0, description="Wall-clock seconds for this benchmark")
    gpu_utilization_pct: float | None = Field(
        default=None, ge=0.0, le=100.0, description="Mean GPU utilization, percent"
    )


class BenchmarkResult(BaseModel):
    """A full benchmark-suite run for one (model, distill version, backend)."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    model_id: str = Field(..., min_length=1)
    distill_version: int = Field(..., ge=0, description="0 == teacher baseline")
    backend: Backend
    timestamp: datetime
    torchsim_version: str = Field(..., min_length=1)
    benchmark_suite_version: str = Field(..., min_length=1)

    # Map of benchmark name -> metrics. Empty is allowed (e.g. a failed run).
    results: dict[str, BenchmarkMetrics] = Field(default_factory=dict)

    # Populated only by the uplift report; a raw single-version run leaves these None.
    overall_uplift_pct: float | None = None
    promotion_recommendation: PromotionRecommendation | None = None


__all__ = [
    "Backend",
    "BenchmarkMetrics",
    "BenchmarkResult",
    "PromotionRecommendation",
]
