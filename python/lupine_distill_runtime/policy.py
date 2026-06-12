from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

import numpy as np


@dataclass(frozen=True)
class RuntimePolicy:
    profile: str = "off"

    @property
    def enabled(self) -> bool:
        return self.profile in {"accuracy", "accuracy_accelerate"}

    @property
    def accelerate(self) -> bool:
        return self.profile == "accuracy_accelerate"

    def guard_prediction(self, row_id: str, prediction: dict[str, Any]) -> list[dict[str, Any]]:
        actions: list[dict[str, Any]] = []
        for key in ("energy_ev_per_atom", "relaxed_energy_ev_per_atom"):
            value = prediction.get(key)
            if isinstance(value, (int, float)) and not math.isfinite(float(value)):
                actions.append({"action": "refuse", "reason": f"nonfinite_{key}"})
        if row_id in {"forces", "relaxation_stability"} and "forces_ev_per_angstrom" in prediction:
            forces = np.asarray(prediction["forces_ev_per_angstrom"], dtype=float)
            if forces.size and not np.all(np.isfinite(forces)):
                actions.append({"action": "refuse", "reason": "nonfinite_forces"})
            elif forces.size and float(np.max(np.linalg.norm(forces, axis=-1))) > 200.0:
                actions.append({"action": "refuse", "reason": "force_norm_explosion"})
        if "stress_gpa" in prediction:
            stress = np.asarray(prediction["stress_gpa"], dtype=float)
            if stress.size and not np.all(np.isfinite(stress)):
                actions.append({"action": "refuse", "reason": "nonfinite_stress"})
            elif stress.size and float(np.max(np.abs(stress))) > 5000.0:
                actions.append({"action": "refuse", "reason": "stress_explosion"})
        if row_id == "relaxation_stability" and prediction.get("relaxation_converged") is False:
            actions.append({"action": "tighten", "reason": "relaxation_not_converged"})
        if not actions:
            actions.append({"action": "accept", "reason": "runtime_guards_passed"})
        return actions
