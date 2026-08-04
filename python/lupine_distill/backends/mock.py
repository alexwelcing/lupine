"""Deterministic synthetic benchmark backend.

Used by tests and as the graceful fallback when torch_sim is not installed.
Given the same ``(model_id, distill_version, benchmark, system)`` it always
returns the same metrics, with no torch / GPU / network dependency.

The synthetic error model is intentionally simple and monotonic: error for each
metric is a fixed per-metric base scaled by ``improvement_per_version`` for each
distill version above the baseline. This lets tests dial in promote / review /
reject uplift scenarios deterministically while exercising the real aggregation
and gate code paths.
"""

from __future__ import annotations

import hashlib
from typing import Final, Mapping

from ..schemas import BenchmarkMetrics
from ..suite import BENCHMARK_WEIGHTS
from .base import BenchmarkBackend, System

_MOCK_ENGINE_VERSION: Final[str] = "mock-0"

# Base (baseline / v0) error magnitude per metric, in that metric's own units.
# Deliberately ordered so forces > energy etc., loosely physically plausible.
_BASE_ERROR: Final[Mapping[str, float]] = {
    "mae_energy": 0.030,  # eV/atom
    "mae_forces": 0.120,  # eV/Ang
    "mae_stress": 0.500,  # GPa
    "rmse_energy": 0.045,  # eV/atom
    "energy_drift": 0.0200,  # eV/atom/ps
    "temperature_stability": 12.0,  # K
}

# Synthetic DFT reference anchors per benchmark (illustrative, deterministic).
_DFT_REFERENCE: Final[Mapping[str, dict[str, float]]] = {
    "static_energy": {"energy_ev_per_atom": -3.7500},
    "geometry_opt": {"energy_ev_per_atom": -3.8100},
    "elastic_constants": {"bulk_modulus_gpa": 180.0},
    "phonon_dos": {"max_freq_thz": 9.5},
    "eos_curve": {"equilibrium_volume_a3": 16.4},
    "surface_energy": {"surface_energy_j_per_m2": 1.25},
}


def _unit_hash(*parts: str) -> float:
    """Stable float in [0, 1) derived from the given string parts."""

    digest = hashlib.sha256("\x1f".join(parts).encode("utf-8")).digest()
    # Use the first 8 bytes as a big-endian unsigned int, normalize to [0, 1).
    return int.from_bytes(digest[:8], "big") / float(1 << 64)


class MockBenchmarkBackend(BenchmarkBackend):
    """Deterministic synthetic backend (no torch, no GPU)."""

    backend_id = "torchsim"

    def __init__(
        self,
        *,
        model_id: str,
        distill_version: int = 0,
        improvement_per_version: float = 0.10,
        seed: str = "lupine",
    ) -> None:
        if improvement_per_version < 0.0:
            raise ValueError("improvement_per_version must be >= 0")
        self._model_id = model_id
        self._distill_version = distill_version
        self._improvement_per_version = improvement_per_version
        self._seed = seed

    @property
    def engine_version(self) -> str:
        return _MOCK_ENGINE_VERSION

    def _scale(self) -> float:
        """Multiplicative error factor for this distill version.

        v0 -> 1.0; each subsequent version multiplies remaining error by
        ``(1 - improvement_per_version)`` (clamped at 0). Monotonically
        non-increasing, so higher versions never look worse on the mock.
        """

        factor = (1.0 - self._improvement_per_version) ** max(self._distill_version, 0)
        return max(factor, 0.0)

    def run(self, system: System, benchmark: str) -> BenchmarkMetrics:
        weights = BENCHMARK_WEIGHTS.get(benchmark)
        if weights is None:
            raise ValueError(f"unknown benchmark '{benchmark}'")

        scale = self._scale()
        # Per-system jitter keeps distinct systems distinguishable but stays
        # deterministic and small (+/-5%); identical inputs => identical output.
        system_key = repr(sorted(system.items())) if isinstance(system, Mapping) else repr(system)
        values: dict[str, float | None] = {
            "mae_energy": None,
            "mae_forces": None,
            "mae_stress": None,
            "rmse_energy": None,
            "energy_drift": None,
            "temperature_stability": None,
        }
        for metric in weights:
            base = _BASE_ERROR[metric]
            jitter = 0.95 + 0.10 * _unit_hash(self._seed, self._model_id, benchmark, metric, system_key)
            values[metric] = round(base * scale * jitter, 6)

        # rmse_energy is not weighted anywhere but is reported when energy is.
        if values["mae_energy"] is not None and values["rmse_energy"] is None:
            rmse_jitter = 0.95 + 0.10 * _unit_hash(self._seed, self._model_id, benchmark, "rmse_energy", system_key)
            values["rmse_energy"] = round(_BASE_ERROR["rmse_energy"] * scale * rmse_jitter, 6)

        wall = round(0.25 + 2.0 * _unit_hash(self._seed, benchmark, "wall"), 4)
        gpu = round(40.0 + 55.0 * _unit_hash(self._seed, benchmark, "gpu"), 2)

        return BenchmarkMetrics(
            mae_energy=values["mae_energy"],
            mae_forces=values["mae_forces"],
            mae_stress=values["mae_stress"],
            rmse_energy=values["rmse_energy"],
            energy_drift=values["energy_drift"],
            temperature_stability=values["temperature_stability"],
            dft_reference=_DFT_REFERENCE.get(benchmark),
            wall_time_seconds=wall,
            gpu_utilization_pct=gpu,
        )


__all__ = ["MockBenchmarkBackend"]
