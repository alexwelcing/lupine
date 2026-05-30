"""Benchmark suite definition: the 8 canonical MLIP benchmarks and the
per-benchmark metric weights used to aggregate uplift.

``BENCHMARK_SUITE`` is the ordered tuple of benchmark names. ``BENCHMARK_WEIGHTS``
maps each benchmark to the metrics it produces and the weight each metric
carries when computing that benchmark's weighted % improvement. Weights for a
given benchmark sum to 1.0 over exactly the metrics that benchmark emits.

A "full" suite runs all 8; a "smoke" subset runs the two cheapest for CI.
"""

from __future__ import annotations

import math
from typing import Final, Mapping

# Metric attribute names on BenchmarkMetrics that are "lower is better" and
# therefore valid weighting targets for uplift.
LOWER_IS_BETTER_METRICS: Final[frozenset[str]] = frozenset(
    {
        "mae_energy",
        "mae_forces",
        "mae_stress",
        "rmse_energy",
        "energy_drift",
        "temperature_stability",
    }
)

# The 8 canonical benchmarks, in execution order.
BENCHMARK_SUITE: Final[tuple[str, ...]] = (
    "static_energy",
    "geometry_opt",
    "nvt_md_300k",
    "nvt_md_1000k",
    "elastic_constants",
    "phonon_dos",
    "eos_curve",
    "surface_energy",
)

# Cheap subset for CI smoke runs.
SMOKE_SUITE: Final[tuple[str, ...]] = ("static_energy", "geometry_opt")

# Per-benchmark metric weights. Each inner mapping sums to 1.0 over the metrics
# that benchmark produces.
BENCHMARK_WEIGHTS: Final[Mapping[str, Mapping[str, float]]] = {
    # Pure single-point accuracy: energy + forces dominate, stress secondary.
    "static_energy": {"mae_energy": 0.5, "mae_forces": 0.4, "mae_stress": 0.1},
    # Relaxation: forces drive the path, final energy is the target.
    "geometry_opt": {"mae_forces": 0.6, "mae_energy": 0.4},
    # Room-temp dynamics: drift + thermostat fidelity, with force accuracy.
    "nvt_md_300k": {"energy_drift": 0.5, "temperature_stability": 0.3, "mae_forces": 0.2},
    # Hot dynamics: stability is even more weighted than accuracy.
    "nvt_md_1000k": {"energy_drift": 0.5, "temperature_stability": 0.35, "mae_forces": 0.15},
    # Elastic tensor comes from stress response; energy curvature matters.
    "elastic_constants": {"mae_stress": 0.7, "mae_energy": 0.3},
    # Phonons are second derivatives of energy w.r.t. displacement (forces).
    "phonon_dos": {"mae_forces": 0.7, "mae_energy": 0.3},
    # Equation of state: energy vs volume curve, with stress at each volume.
    "eos_curve": {"mae_energy": 0.6, "mae_stress": 0.4},
    # Surface energy: total-energy differences plus relaxation forces.
    "surface_energy": {"mae_energy": 0.7, "mae_forces": 0.3},
}


def resolve_suite(name: str) -> tuple[str, ...]:
    """Resolve a suite selector (``"full"`` / ``"smoke"``) to benchmark names.

    Raises ``ValueError`` for an unknown selector so the CLI fails fast at the
    boundary instead of silently running nothing.
    """

    key = name.strip().lower()
    if key in {"full", "all", ""}:
        return BENCHMARK_SUITE
    if key in {"smoke", "ci"}:
        return SMOKE_SUITE
    raise ValueError(f"unknown benchmark suite '{name}' (expected 'full' or 'smoke')")


def _validate_weights() -> None:
    """Fail-fast invariant check run at import: every benchmark has weights that
    sum to 1.0 over recognized lower-is-better metrics, and every suite member
    has a weight entry."""

    for benchmark in BENCHMARK_SUITE:
        if benchmark not in BENCHMARK_WEIGHTS:
            raise ValueError(f"benchmark '{benchmark}' missing from BENCHMARK_WEIGHTS")
    for benchmark, weights in BENCHMARK_WEIGHTS.items():
        if not weights:
            raise ValueError(f"benchmark '{benchmark}' has no metric weights")
        unknown = set(weights) - LOWER_IS_BETTER_METRICS
        if unknown:
            raise ValueError(f"benchmark '{benchmark}' weights reference unknown metrics: {sorted(unknown)}")
        total = math.fsum(weights.values())
        if not math.isclose(total, 1.0, abs_tol=1e-9):
            raise ValueError(f"benchmark '{benchmark}' weights sum to {total}, expected 1.0")


_validate_weights()


__all__ = [
    "BENCHMARK_SUITE",
    "BENCHMARK_WEIGHTS",
    "LOWER_IS_BETTER_METRICS",
    "SMOKE_SUITE",
    "resolve_suite",
]
