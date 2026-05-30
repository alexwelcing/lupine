"""TorchSim (batched-GPU) benchmark backend.

``torch_sim`` is an OPTIONAL, heavy dependency that is NOT installed in CI or on
CPU-only dev machines. To keep this module importable everywhere, every heavy
import (``torch_sim``, ``torch``, ``mace``, ``ase``) happens lazily *inside
methods only* — never at module top level.

If you import this module without torch_sim installed it succeeds; the failure
(an informative :class:`TorchSimUnavailable`) is deferred until you actually try
to construct/run the backend. Callers that want graceful degradation should use
:func:`try_build_torchsim_backend`, which returns ``None`` when unavailable.

``run`` is implemented: it evaluates a ``system``'s structures with a MACE
foundation model on the GPU and returns real MAE metrics vs per-structure
references. A ``system`` with no ``structures`` yields an empty (wall-time-only)
metric so the generic CLI/run_suite path never crashes. See
``scripts/run_ni_gpu_loop.py`` for the orchestrating GPU runner (distill +
uplift + formal gate).
"""

from __future__ import annotations

import importlib
import importlib.util
import os
from time import perf_counter
from types import ModuleType
from typing import Any

from ..constants import TORCHSIM_VERSION_UNAVAILABLE
from ..schemas import BenchmarkMetrics
from ..suite import BENCHMARK_WEIGHTS
from .base import BenchmarkBackend, System

# eV/Angstrom^3 -> GPa (torch_sim/MACE report stress in eV/A^3).
_EV_PER_A3_TO_GPA = 160.21766208


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
    """Run benchmarks on the torch_sim batched-GPU engine with a MACE model.

    Construction triggers the lazy torch_sim import so an unavailable engine
    fails fast at the call site. The MACE model is built lazily on first
    :meth:`run` (it is expensive and unnecessary for introspection).
    """

    backend_id = "torchsim"

    def __init__(self, *, model_id: str, device: str | None = None, dtype: str = "float64") -> None:
        # torch_sim's neighbor list is @torch.compile'd; inductor needs Triton,
        # which is unavailable on Windows. Disable dynamo so the eager path runs.
        os.environ.setdefault("TORCHDYNAMO_DISABLE", "1")
        self._model_id = model_id
        self._device = device
        self._dtype_name = dtype
        self._torch_sim = _import_torch_sim()
        self._model: Any = None  # lazily built MaceModel

    @property
    def engine_version(self) -> str:
        version = getattr(self._torch_sim, "__version__", None)
        return str(version) if version else TORCHSIM_VERSION_UNAVAILABLE

    # -- lazy heavy resources -------------------------------------------------

    def _torch(self) -> ModuleType:
        try:
            return importlib.import_module("torch")
        except ImportError as exc:  # pragma: no cover
            raise TorchSimUnavailable("torch is required for the TorchSim backend") from exc

    def _ensure_model(self) -> Any:
        if self._model is not None:
            return self._model
        torch = self._torch()
        try:
            torch._dynamo.config.suppress_errors = True  # type: ignore[attr-defined]
            torch._dynamo.config.disable = True  # type: ignore[attr-defined]
        except Exception:  # pragma: no cover - best effort
            pass
        from mace.calculators.foundations_models import mace_mp
        from torch_sim.models.mace import MaceModel

        dev_name = self._device or ("cuda" if torch.cuda.is_available() else "cpu")
        dtype = getattr(torch, self._dtype_name)
        # Map a friendly model id to a MACE foundation checkpoint (default medium).
        mace_size = "medium"
        raw = mace_mp(model=mace_size, device=dev_name, default_dtype=self._dtype_name, return_raw_model=True)
        self._model = MaceModel(
            model=raw,
            device=torch.device(dev_name),
            dtype=dtype,
            compute_forces=True,
            compute_stress=True,
        )
        return self._model

    def _evaluate(self, structures: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Batched single-point eval -> per-structure energy/forces/stress."""
        import numpy as np
        from ase import Atoms
        from torch_sim.io import atoms_to_state

        torch = self._torch()
        model = self._ensure_model()
        dev = torch.device(self._device or ("cuda" if torch.cuda.is_available() else "cpu"))
        dtype = getattr(torch, self._dtype_name)
        atoms_list = [
            Atoms(
                symbols=list(s["symbols"]),
                positions=np.array(s["positions"], dtype=float),
                cell=np.array(s["cell"], dtype=float),
                pbc=tuple(s.get("pbc", (True, True, True))),
            )
            for s in structures
        ]
        state = atoms_to_state(atoms_list, device=dev, dtype=dtype)
        out = model(state)  # forces via autograd inside forward — no no_grad()
        energies = out["energy"].reshape(-1).detach().cpu().numpy()
        forces_all = out["forces"].detach().cpu().numpy()
        stress_all = out["stress"].detach().cpu().numpy().reshape(-1, 3, 3)
        preds: list[dict[str, Any]] = []
        cursor = 0
        for i, s in enumerate(structures):
            n = len(s["symbols"])
            f = forces_all[cursor : cursor + n]
            cursor += n
            st = stress_all[i] * _EV_PER_A3_TO_GPA
            voigt = np.array([st[0, 0], st[1, 1], st[2, 2], st[1, 2], st[0, 2], st[0, 1]])
            preds.append({"energy_per_atom": float(energies[i]) / n, "forces": f, "stress_voigt_gpa": voigt})
        return preds

    @staticmethod
    def _mae(structures: list[dict[str, Any]], preds: list[dict[str, Any]]) -> dict[str, float | None]:
        import numpy as np

        e, fo, ss = [], [], []
        for s, p in zip(structures, preds):
            ref = s.get("reference", {})
            if ref.get("energy_ev_per_atom") is not None:
                e.append(abs(p["energy_per_atom"] - float(ref["energy_ev_per_atom"])))
            if ref.get("forces_ev_per_angstrom") is not None:
                fo.append(float(np.mean(np.abs(p["forces"] - np.array(ref["forces_ev_per_angstrom"], dtype=float)))))
            if ref.get("stress_gpa") is not None:
                ss.append(float(np.mean(np.abs(p["stress_voigt_gpa"] - np.array(ref["stress_gpa"], dtype=float)))))
        return {
            "mae_energy": float(np.mean(e)) if e else None,
            "mae_forces": float(np.mean(fo)) if fo else None,
            "mae_stress": float(np.mean(ss)) if ss else None,
        }

    def run(self, system: System, benchmark: str) -> BenchmarkMetrics:
        if benchmark not in BENCHMARK_WEIGHTS:
            raise ValueError(f"unknown benchmark '{benchmark}'")
        started = perf_counter()
        structures = list(system.get("structures", []))  # type: ignore[union-attr]
        if not structures:
            # Generic/empty system (e.g. run_suite default): no data to score.
            return BenchmarkMetrics(wall_time_seconds=perf_counter() - started)
        preds = self._evaluate(structures)
        mae = self._mae(structures, preds)
        wanted = set(BENCHMARK_WEIGHTS[benchmark])
        kwargs = {m: mae[m] for m in ("mae_energy", "mae_forces", "mae_stress") if m in wanted}
        ref0 = structures[0].get("reference", {}) if structures else {}
        dft_ref = {k: float(v) for k, v in ref0.items() if isinstance(v, (int, float))} or None
        return BenchmarkMetrics(wall_time_seconds=perf_counter() - started, dft_reference=dft_ref, **kwargs)

    def _build_state(self, system: System) -> Any:  # pragma: no cover - thin shim
        """Convert a ``{structures: [...]}`` system into a batched torch_sim state."""
        import numpy as np
        from ase import Atoms
        from torch_sim.io import atoms_to_state

        torch = self._torch()
        dev = torch.device(self._device or ("cuda" if torch.cuda.is_available() else "cpu"))
        dtype = getattr(torch, self._dtype_name)
        atoms_list = [
            Atoms(symbols=list(s["symbols"]), positions=np.array(s["positions"], dtype=float), cell=np.array(s["cell"], dtype=float), pbc=tuple(s.get("pbc", (True, True, True))))
            for s in system.get("structures", [])  # type: ignore[union-attr]
        ]
        return atoms_to_state(atoms_list, device=dev, dtype=dtype)


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
