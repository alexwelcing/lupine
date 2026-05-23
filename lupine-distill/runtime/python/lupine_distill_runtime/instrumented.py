from __future__ import annotations

import copy
import time
from typing import Any

import numpy as np
from ase import Atoms
from ase.calculators.calculator import Calculator, all_changes

from .events import RuntimeEventLog
from .leakage import fingerprint_record


def atoms_key(atoms: Atoms) -> str:
    record = {
        "symbols": list(atoms.get_chemical_symbols()),
        "positions": np.asarray(atoms.positions, dtype=float).round(8).tolist(),
        "cell": np.asarray(atoms.cell.array, dtype=float).round(8).tolist(),
        "pbc": np.asarray(atoms.pbc, dtype=bool).tolist(),
    }
    return fingerprint_record(record).digest


class InstrumentedCalculator(Calculator):
    """ASE proxy calculator that preserves outputs while recording runtime facts."""

    def __init__(
        self,
        base: Any,
        event_log: RuntimeEventLog,
        *,
        cache_enabled: bool = False,
        label: str = "mlip",
    ) -> None:
        super().__init__()
        self.base = base
        self.event_log = event_log
        self.cache_enabled = cache_enabled
        self.label = label
        self.implemented_properties = list(getattr(base, "implemented_properties", [])) or [
            "energy",
            "forces",
            "stress",
        ]
        self._cache: dict[str, dict[str, Any]] = {}

    def check_state(self, atoms: Atoms, tol: float = 1e-15) -> list[str]:
        if self.cache_enabled:
            return list(all_changes)
        return list(super().check_state(atoms, tol=tol))

    def calculate(
        self,
        atoms: Atoms | None = None,
        properties: list[str] | tuple[str, ...] = ("energy",),
        system_changes: list[str] = all_changes,
    ) -> None:
        Calculator.calculate(self, atoms, list(properties), system_changes)
        if atoms is None:
            raise ValueError("atoms are required")
        structure_digest = atoms_key(atoms)
        started = time.perf_counter()
        cached = self._cache.get(structure_digest)
        if self.cache_enabled and cached is not None and all(prop in cached for prop in properties):
            self.results = copy.deepcopy(cached)
            self.event_log.emit(
                "calculator.cache_hit",
                label=self.label,
                properties=list(properties),
                structure_digest=structure_digest,
                duration_ms=round((time.perf_counter() - started) * 1000, 3),
            )
            return

        atoms_for_base = atoms.copy()
        atoms_for_base.calc = self.base
        if hasattr(self.base, "results"):
            # Some ASE adapters expose previous site-wise results through atoms.calc
            # during their own structure conversion. Clear them before changing atoms.
            try:
                self.base.results = {}
            except Exception:
                pass
        if hasattr(self.base, "calculate"):
            self.base.calculate(atoms_for_base, list(properties), system_changes)
            results = dict(getattr(self.base, "results", {}))
        else:
            results = {}
            if "energy" in properties:
                results["energy"] = self.base.get_potential_energy(atoms_for_base)
            if "forces" in properties:
                results["forces"] = self.base.get_forces(atoms_for_base)
            if "stress" in properties:
                results["stress"] = self.base.get_stress(atoms_for_base)
        self.results = copy.deepcopy(results)
        if self.cache_enabled:
            self._cache[structure_digest] = {**(cached or {}), **copy.deepcopy(results)}
        self.event_log.emit(
            "calculator.calculate",
            label=self.label,
            properties=list(properties),
            structure_digest=structure_digest,
            cache_enabled=self.cache_enabled,
            duration_ms=round((time.perf_counter() - started) * 1000, 3),
        )
