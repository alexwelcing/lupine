"""TorchSim (batched-GPU) benchmark backend.

``torch_sim`` is an OPTIONAL, heavy dependency that is NOT installed in CI or on
CPU-only dev machines. To keep this module importable everywhere, the import of
``torch_sim`` happens lazily *inside methods only* — never at module top level.

If you import this module without torch_sim installed it succeeds; the failure
(an informative :class:`TorchSimUnavailable`) is deferred until you actually try
to construct/run the backend. Callers that want graceful degradation should use
:func:`try_build_torchsim_backend`, which returns ``None`` when unavailable.
"""

from __future__ import annotations

import importlib
import importlib.util
from types import ModuleType
from typing import Any

from ..constants import TORCHSIM_VERSION_UNAVAILABLE
from ..schemas import BenchmarkMetrics
from ..suite import BENCHMARK_WEIGHTS
from .base import BenchmarkBackend, System


class TorchSimUnavailable(RuntimeError):
    """Raised when torch_sim is required but cannot be imported."""


def _import_torch_sim() -> ModuleType:
    """Import torch_sim lazily, mapping ImportError to TorchSimUnavailable."""

    try:
        return importlib.import_module("torch_sim")
    except ImportError as exc:  # pragma: no cover - exercised only with dep absent
        raise TorchSimUnavailable(
            "torch_sim is not installed; install the 'torchsim' extra or use the "
            "MockBenchmarkBackend / 'ase' backend for CPU-only environments"
        ) from exc


class TorchSimBenchmarkBackend(BenchmarkBackend):
    """Run benchmarks on the torch_sim batched-GPU engine.

    Construction triggers the lazy import so an unavailable engine fails fast at
    the call site rather than at module import time.
    """

    backend_id = "torchsim"

    def __init__(self, *, model_id: str, device: str | None = None) -> None:
        self._model_id = model_id
        self._device = device
        self._torch_sim = _import_torch_sim()

    @property
    def engine_version(self) -> str:
        version = getattr(self._torch_sim, "__version__", None)
        return str(version) if version else TORCHSIM_VERSION_UNAVAILABLE

    def run(self, system: System, benchmark: str) -> BenchmarkMetrics:
        if benchmark not in BENCHMARK_WEIGHTS:
            raise ValueError(f"unknown benchmark '{benchmark}'")
        # The concrete torch_sim driver wiring (state construction, integrator
        # selection, DFT-reference comparison) is environment-specific and lives
        # on the GPU runner. It is intentionally not implemented in this
        # CPU/CI-importable module; calling it here signals a misconfiguration.
        raise NotImplementedError(
            "TorchSimBenchmarkBackend.run requires the GPU runner driver; "
            "wire torch_sim integrators on the GCP cell runner. Use "
            "MockBenchmarkBackend in CPU/CI contexts."
        )

    def _build_state(self, system: System) -> Any:  # pragma: no cover - GPU only
        """Hook for converting an opaque system into a torch_sim state."""

        raise NotImplementedError


def torchsim_available() -> bool:
    """Return True iff ``torch_sim`` can be imported in this environment."""

    return importlib.util.find_spec("torch_sim") is not None


def try_build_torchsim_backend(*, model_id: str, device: str | None = None) -> TorchSimBenchmarkBackend | None:
    """Best-effort constructor: return the backend, or ``None`` if unavailable."""

    try:
        return TorchSimBenchmarkBackend(model_id=model_id, device=device)
    except TorchSimUnavailable:
        return None


__all__ = [
    "TorchSimBenchmarkBackend",
    "TorchSimUnavailable",
    "torchsim_available",
    "try_build_torchsim_backend",
]
