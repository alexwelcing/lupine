"""Release-grade MLIP fixture contract and row-native evaluators.

The contract is intentionally data-driven. A manifest can add materials,
rows, or tighter scoring thresholds without changing the runner as long as it
keeps the row case shape stable.
"""

from __future__ import annotations

import copy
import math
from dataclasses import dataclass
from typing import Any, Protocol

import numpy as np
from ase import Atoms

EV_PER_A3_TO_GPA = 160.21766208

ROW_IDS = (
    "elastic_constants",
    "energy_volume",
    "forces",
    "stress",
    "relaxation_stability",
)

ROW_DEFAULTS: dict[str, dict[str, Any]] = {
    "energy_volume": {
        "min_cases": 5,
        "error_tolerance": 0.10,
        "error_unit": "ev_per_atom_mae",
        "reference_keys": ("energy_ev_per_atom", "energy"),
    },
    "forces": {
        "min_cases": 5,
        "error_tolerance": 0.20,
        "error_unit": "ev_per_angstrom_rmse",
        "reference_keys": ("forces_ev_per_angstrom", "forces"),
    },
    "stress": {
        "min_cases": 5,
        "error_tolerance": 5.0,
        "error_unit": "gpa_mae",
        "reference_keys": ("stress_gpa",),
    },
    "elastic_constants": {
        "min_cases": 6,
        "error_tolerance": 50.0,
        "error_unit": "gpa_mae",
        "reference_keys": ("elastic_constants_gpa",),
    },
    "relaxation_stability": {
        "min_cases": 3,
        "error_tolerance": 0.10,
        "error_unit": "relaxation_penalty",
        "reference_keys": ("relaxation_force_threshold", "relaxed_energy_ev_per_atom"),
    },
}


@dataclass(frozen=True)
class RowSelection:
    row_id: str
    row_spec: dict[str, Any]
    cases: list[dict[str, Any]]


class RuntimeSession(Protocol):
    def relaxation_prediction(
        self,
        record: dict[str, Any],
        calc: Any,
        row_spec: dict[str, Any],
        default_predict: Any,
    ) -> dict[str, Any]:
        ...

    def apply_row_policy(self, predictions: list[dict[str, Any]]) -> list[dict[str, Any]]:
        ...


class PredictionCheckpoint(Protocol):
    def get_prediction(self, row_id: str, case_index: int, case: dict[str, Any]) -> dict[str, Any] | None:
        ...

    def record_prediction(
        self,
        row_id: str,
        case_index: int,
        case: dict[str, Any],
        prediction: dict[str, Any],
    ) -> None:
        ...


def atoms_from_record(record: dict[str, Any]) -> Atoms:
    return Atoms(
        symbols=record["symbols"],
        positions=np.asarray(record["positions"], dtype=float),
        cell=np.asarray(record.get("cell", np.eye(3) * 10.0), dtype=float),
        pbc=record.get("pbc", True),
    )


def _as_record(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _finite(value: Any) -> bool:
    return isinstance(value, (int, float)) and math.isfinite(float(value))


def _reference(record: dict[str, Any], row_spec: dict[str, Any] | None = None) -> dict[str, Any]:
    merged: dict[str, Any] = {}
    spec_ref = _as_record(row_spec).get("reference")
    if isinstance(spec_ref, dict):
        merged.update(spec_ref)
    ref = record.get("reference")
    if isinstance(ref, dict):
        merged.update(ref)
    return merged


def manifest_row_spec(manifest: dict[str, Any], row_id: str) -> dict[str, Any]:
    row_specs = _as_record(manifest.get("row_specs"))
    row_fixtures = _as_record(manifest.get("row_fixtures"))
    task_specs = _as_record(manifest.get("tasks"))
    spec = copy.deepcopy(ROW_DEFAULTS[row_id])
    for source in (row_specs.get(row_id), row_fixtures.get(row_id), task_specs.get(row_id)):
        if isinstance(source, dict):
            for key, value in source.items():
                if key != "structures":
                    spec[key] = value
    scoring = _as_record(spec.get("scoring"))
    if _finite(scoring.get("error_tolerance")):
        spec["error_tolerance"] = float(scoring["error_tolerance"])
    if isinstance(scoring.get("error_unit"), str):
        spec["error_unit"] = scoring["error_unit"]
    return spec


def row_cases(manifest: dict[str, Any], row_id: str) -> list[dict[str, Any]]:
    row_fixtures = _as_record(manifest.get("row_fixtures"))
    tasks = _as_record(manifest.get("tasks"))
    for source in (row_fixtures.get(row_id), tasks.get(row_id)):
        if isinstance(source, dict) and isinstance(source.get("structures"), list):
            return [case for case in source["structures"] if isinstance(case, dict)]
    structures = _as_list(manifest.get("structures"))
    tagged = [
        case for case in structures
        if isinstance(case, dict) and (case.get("row_id") == row_id or row_id in _as_list(case.get("row_ids")))
    ]
    if tagged:
        return tagged
    return [case for case in structures if isinstance(case, dict)]


def select_row(manifest: dict[str, Any], row_id: str) -> RowSelection:
    if row_id not in ROW_IDS:
        raise ValueError(f"unsupported row_id: {row_id}")
    spec = manifest_row_spec(manifest, row_id)
    cases = row_cases(manifest, row_id)
    return RowSelection(row_id=row_id, row_spec=spec, cases=cases)


def _has_any(ref: dict[str, Any], keys: tuple[str, ...]) -> bool:
    return any(key in ref for key in keys)


def _force_reference_is_nondegenerate(ref: dict[str, Any]) -> bool:
    forces = ref.get("forces_ev_per_angstrom", ref.get("forces"))
    if forces is None:
        return False
    arr = np.asarray(forces, dtype=float)
    return bool(arr.size and np.max(np.abs(arr)) > 1e-8)


def _elastic_reference(ref: dict[str, Any]) -> Any:
    return ref.get("elastic_constants_gpa", ref.get("elastic_constants"))


def _validate_row_selection(selection: RowSelection) -> list[str]:
    row_id = selection.row_id
    spec = selection.row_spec
    blockers: list[str] = []
    min_cases = int(spec.get("min_cases", ROW_DEFAULTS[row_id]["min_cases"]))
    if len(selection.cases) < min_cases:
        blockers.append(f"{row_id} requires at least {min_cases} cases; found {len(selection.cases)}")
    for idx, case in enumerate(selection.cases):
        ref = _reference(case, spec)
        prefix = f"{row_id}[{idx}]"
        if row_id == "forces":
            if not _force_reference_is_nondegenerate(ref):
                blockers.append(f"{prefix} needs nonzero reference forces")
        elif row_id == "elastic_constants":
            if "strain_voigt" not in case:
                blockers.append(f"{prefix} needs strain_voigt for finite-strain elastic fitting")
            if _elastic_reference(ref) is None:
                blockers.append(f"{prefix} needs reference.elastic_constants_gpa")
        elif not _has_any(ref, tuple(spec.get("reference_keys", ROW_DEFAULTS[row_id]["reference_keys"]))):
            blockers.append(f"{prefix} missing row reference")
    return blockers


def validate_manifest(manifest: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(manifest, dict):
        raise ValueError("manifest must be a JSON object")
    schema = str(manifest.get("schema", ""))
    fixture_id = str(manifest.get("fixture_id", ""))
    blockers: list[str] = []
    if not fixture_id:
        blockers.append("manifest.fixture_id is required")
    if not schema.endswith(".v2"):
        blockers.append("release baseline requires lupine.mlip.fixture_manifest.v2")
    if not _as_list(manifest.get("structures")) and not _as_record(manifest.get("row_fixtures")):
        blockers.append("manifest must provide structures or row_fixtures")

    row_counts: dict[str, int] = {}
    row_blockers: dict[str, list[str]] = {}
    for row_id in ROW_IDS:
        selection = select_row(manifest, row_id)
        row_counts[row_id] = len(selection.cases)
        row_blockers[row_id] = _validate_row_selection(selection)
    blockers.extend(f"{row}: {blocker}" for row, items in row_blockers.items() for blocker in items)

    provenance = manifest.get("reference_provenance") or _as_record(manifest.get("metadata")).get("reference_provenance")
    if not provenance:
        blockers.append("reference_provenance is required for release baseline")

    return {
        "schema": schema or "unknown",
        "fixture_id": fixture_id or "unknown",
        "manifest_hash": manifest.get("manifest_hash") or _as_record(manifest.get("metadata")).get("manifest_hash"),
        "reference_provenance": provenance,
        "row_counts": row_counts,
        "row_blockers": row_blockers,
        "release_ready": len(blockers) == 0,
        "blockers": blockers,
    }


def _energy_ev_per_atom(atoms: Atoms) -> float:
    return float(atoms.get_potential_energy()) / max(len(atoms), 1)


def _forces_ev_per_angstrom(atoms: Atoms) -> np.ndarray:
    return np.asarray(atoms.get_forces(), dtype=float)


def _stress_gpa(atoms: Atoms) -> np.ndarray:
    return np.asarray(atoms.get_stress(voigt=True), dtype=float).reshape(-1) * EV_PER_A3_TO_GPA


def single_point_prediction(record: dict[str, Any], calc: Any, row_spec: dict[str, Any]) -> dict[str, Any]:
    atoms = atoms_from_record(record)
    atoms.calc = calc
    symbols = [str(symbol) for symbol in record.get("symbols", [])]
    prediction: dict[str, Any] = {
        "structure_id": record.get("structure_id"),
        "material_id": record.get("material_id", record.get("material")),
        "chemical_system": "-".join(sorted(set(symbols))),
        "symbols": symbols,
        "row_id": record.get("row_id"),
        "volume_scale": record.get("volume_scale"),
        "strain_voigt": record.get("strain_voigt"),
        "energy_ev_per_atom": _energy_ev_per_atom(atoms),
        "forces_ev_per_angstrom": _forces_ev_per_angstrom(atoms).tolist(),
        "reference": _reference(record, row_spec),
    }
    try:
        prediction["stress_gpa"] = _stress_gpa(atoms).tolist()
    except Exception as exc:
        prediction["stress_error"] = str(exc)
    return prediction


def _score_from_error(error: float, tolerance: float) -> float:
    if not math.isfinite(error):
        return 0.0
    return max(0.0, min(1.0, 1.0 - error / max(tolerance, 1e-12)))


def _ref_energy_ev_per_atom(prediction: dict[str, Any]) -> float:
    ref = _as_record(prediction.get("reference"))
    if _finite(ref.get("energy_ev_per_atom")):
        return float(ref["energy_ev_per_atom"])
    if _finite(ref.get("energy")):
        n_atoms = len(np.asarray(prediction.get("forces_ev_per_angstrom", []))) or 1
        return float(ref["energy"]) / n_atoms
    raise ValueError("energy row requires reference.energy_ev_per_atom")


def _ref_forces(prediction: dict[str, Any]) -> np.ndarray:
    ref = _as_record(prediction.get("reference"))
    value = ref.get("forces_ev_per_angstrom", ref.get("forces"))
    if value is None:
        raise ValueError("forces row requires reference.forces_ev_per_angstrom")
    return np.asarray(value, dtype=float)


def _ref_stress_gpa(prediction: dict[str, Any]) -> np.ndarray:
    ref = _as_record(prediction.get("reference"))
    if "stress_gpa" not in ref:
        raise ValueError("stress row requires reference.stress_gpa")
    return np.asarray(ref["stress_gpa"], dtype=float).reshape(-1)


def _elastic_reference_entries(reference: Any) -> tuple[list[str], np.ndarray]:
    if isinstance(reference, dict):
        keys = sorted(key for key in reference if key.upper().startswith("C"))
        return keys, np.asarray([reference[key] for key in keys], dtype=float)
    arr = np.asarray(reference, dtype=float)
    if arr.ndim == 2:
        keys = [f"C{i + 1}{j + 1}" for i in range(arr.shape[0]) for j in range(arr.shape[1])]
        return keys, arr.reshape(-1)
    keys = [f"C{i + 1}" for i in range(arr.size)]
    return keys, arr.reshape(-1)


def _elastic_prediction_entries(cij: np.ndarray, keys: list[str]) -> np.ndarray:
    values: list[float] = []
    flat = cij.reshape(-1)
    for idx, key in enumerate(keys):
        if len(key) == 3 and key[0].upper() == "C" and key[1:].isdigit():
            i = int(key[1]) - 1
            j = int(key[2]) - 1
            if 0 <= i < cij.shape[0] and 0 <= j < cij.shape[1]:
                values.append(float(cij[i, j]))
                continue
        values.append(float(flat[idx]) if idx < flat.size else float("nan"))
    return np.asarray(values, dtype=float)


def _fit_elastic_constants(predictions: list[dict[str, Any]]) -> np.ndarray:
    strains: list[np.ndarray] = []
    stresses: list[np.ndarray] = []
    for pred in predictions:
        if pred.get("strain_voigt") is None or pred.get("stress_gpa") is None:
            continue
        strains.append(np.asarray(pred["strain_voigt"], dtype=float).reshape(-1)[:6])
        stresses.append(np.asarray(pred["stress_gpa"], dtype=float).reshape(-1)[:6])
    if len(strains) < 6:
        raise ValueError("elastic_constants row needs at least six strain/stress cases")
    x = np.vstack(strains)
    y = np.vstack(stresses)
    if len(strains) >= 7:
        design = np.column_stack([np.ones(len(strains)), x])
        coef, *_ = np.linalg.lstsq(design, y, rcond=None)
        return coef[1:].T
    coef, *_ = np.linalg.lstsq(x, y, rcond=None)
    return coef.T


def _elastic_material_groups(predictions: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    groups: dict[str, list[dict[str, Any]]] = {}
    for pred in predictions:
        material = pred.get("material_id") or pred.get("material") or "unknown"
        groups.setdefault(str(material), []).append(pred)
    return groups


def evaluate_row(row_id: str, predictions: list[dict[str, Any]], row_spec: dict[str, Any]) -> tuple[float, str, dict[str, Any]]:
    tolerance = float(row_spec.get("error_tolerance", ROW_DEFAULTS[row_id]["error_tolerance"]))
    unit = str(row_spec.get("error_unit", ROW_DEFAULTS[row_id]["error_unit"]))
    if row_id == "energy_volume":
        errors = [abs(float(pred["energy_ev_per_atom"]) - _ref_energy_ev_per_atom(pred)) for pred in predictions]
        error = float(np.mean(errors))
        return _score_from_error(error, tolerance), "row_native_physical_score", {
            "primary_metric": "energy_mae_ev_per_atom",
            "error": error,
            "error_unit": unit,
            "score_tolerance": tolerance,
        }
    if row_id == "forces":
        sq_errors: list[np.ndarray] = []
        for pred in predictions:
            sq_errors.append((np.asarray(pred["forces_ev_per_angstrom"], dtype=float) - _ref_forces(pred)) ** 2)
        error = float(np.sqrt(np.mean(np.concatenate([arr.reshape(-1) for arr in sq_errors]))))
        return _score_from_error(error, tolerance), "row_native_physical_score", {
            "primary_metric": "force_rmse_ev_per_angstrom",
            "error": error,
            "error_unit": unit,
            "score_tolerance": tolerance,
        }
    if row_id == "stress":
        errors = [
            np.abs(np.asarray(pred.get("stress_gpa"), dtype=float).reshape(-1) - _ref_stress_gpa(pred))
            for pred in predictions
        ]
        error = float(np.mean(np.concatenate([arr.reshape(-1) for arr in errors])))
        return _score_from_error(error, tolerance), "row_native_physical_score", {
            "primary_metric": "stress_mae_gpa",
            "error": error,
            "error_unit": unit,
            "score_tolerance": tolerance,
        }
    if row_id == "elastic_constants":
        by_material: dict[str, Any] = {}
        errors_by_material: dict[str, float] = {}
        keys_by_material: dict[str, list[str]] = {}
        all_errors: list[np.ndarray] = []
        for material_id, group in _elastic_material_groups(predictions).items():
            cij = _fit_elastic_constants(group)
            reference = _elastic_reference(_reference(group[0], row_spec))
            if reference is None:
                raise ValueError(f"elastic_constants row requires reference.elastic_constants_gpa for {material_id}")
            keys, ref_values = _elastic_reference_entries(reference)
            pred_values = _elastic_prediction_entries(cij, keys)
            group_errors = np.abs(pred_values - ref_values)
            all_errors.append(group_errors)
            by_material[material_id] = cij.tolist()
            errors_by_material[material_id] = float(np.mean(group_errors))
            keys_by_material[material_id] = keys
        if not all_errors:
            raise ValueError("elastic_constants row needs at least one material group")
        error = float(np.mean(np.concatenate([arr.reshape(-1) for arr in all_errors])))
        first_material = next(iter(by_material))
        return _score_from_error(error, tolerance), "row_native_physical_score", {
            "primary_metric": "elastic_cij_mae_gpa",
            "error": error,
            "error_unit": unit,
            "score_tolerance": tolerance,
            "elastic_constants_gpa": by_material[first_material],
            "elastic_constants_gpa_by_material": by_material,
            "elastic_errors_by_material": errors_by_material,
            "elastic_reference_keys": keys_by_material[first_material],
            "elastic_reference_keys_by_material": keys_by_material,
        }
    if row_id == "relaxation_stability":
        return _evaluate_relaxation(predictions, row_spec, tolerance, unit)
    raise ValueError(f"unsupported row_id: {row_id}")


def _evaluate_relaxation(
    predictions: list[dict[str, Any]],
    row_spec: dict[str, Any],
    tolerance: float,
    unit: str,
) -> tuple[float, str, dict[str, Any]]:
    penalties: list[float] = []
    converged = 0
    for pred in predictions:
        ref = _as_record(pred.get("reference"))
        threshold = float(ref.get("relaxation_force_threshold", row_spec.get("force_threshold", 0.05)))
        max_force = float(pred.get("relaxation_max_force_ev_per_angstrom", float("inf")))
        energy_delta = 0.0
        if _finite(ref.get("relaxed_energy_ev_per_atom")) and _finite(pred.get("relaxed_energy_ev_per_atom")):
            energy_delta = abs(float(pred["relaxed_energy_ev_per_atom"]) - float(ref["relaxed_energy_ev_per_atom"]))
        force_penalty = max(0.0, max_force - threshold)
        penalties.append(force_penalty + energy_delta)
        if bool(pred.get("relaxation_converged")):
            converged += 1
    error = float(np.mean(penalties)) if penalties else float("inf")
    convergence_rate = converged / len(predictions) if predictions else 0.0
    score = _score_from_error(error, tolerance) * convergence_rate
    return score, "row_native_physical_score", {
        "primary_metric": "relaxation_stability_penalty",
        "error": error,
        "error_unit": unit,
        "score_tolerance": tolerance,
        "convergence_rate": convergence_rate,
    }


def relaxation_prediction(record: dict[str, Any], calc: Any, row_spec: dict[str, Any]) -> dict[str, Any]:
    from ase.optimize import FIRE

    atoms = atoms_from_record(record)
    atoms.calc = calc
    fmax = float(row_spec.get("force_threshold", _reference(record, row_spec).get("relaxation_force_threshold", 0.05)))
    max_steps = int(row_spec.get("max_steps", 200))
    optimizer = FIRE(atoms, logfile=None)
    converged = bool(optimizer.run(fmax=fmax, steps=max_steps))
    forces = _forces_ev_per_angstrom(atoms)
    symbols = [str(symbol) for symbol in record.get("symbols", [])]
    return {
        "structure_id": record.get("structure_id"),
        "material_id": record.get("material_id", record.get("material")),
        "chemical_system": "-".join(sorted(set(symbols))),
        "symbols": symbols,
        "relaxation_converged": converged,
        "relaxation_steps_limit": max_steps,
        "relaxation_force_threshold": fmax,
        "relaxation_max_force_ev_per_angstrom": float(np.max(np.linalg.norm(forces, axis=1))) if forces.size else 0.0,
        "relaxed_energy_ev_per_atom": _energy_ev_per_atom(atoms),
        "relaxed_cell": np.asarray(atoms.cell.array, dtype=float).tolist(),
        "relaxed_positions": np.asarray(atoms.positions, dtype=float).tolist(),
        "reference": _reference(record, row_spec),
    }


def run_row(
    row_id: str,
    manifest: dict[str, Any],
    calc: Any,
    runtime_session: RuntimeSession | None = None,
    checkpoint: PredictionCheckpoint | None = None,
) -> dict[str, Any]:
    validation = validate_manifest(manifest)
    selection = select_row(manifest, row_id)
    row_blockers = validation["row_blockers"].get(row_id, [])
    if row_blockers:
        raise ValueError(f"{row_id} fixture is not release-ready: {'; '.join(row_blockers)}")
    predictions = []
    for case_index, case in enumerate(selection.cases):
        cached = checkpoint.get_prediction(row_id, case_index, case) if checkpoint else None
        if cached is not None:
            predictions.append(cached)
            continue
        if row_id == "relaxation_stability":
            if runtime_session is not None and hasattr(runtime_session, "relaxation_prediction"):
                prediction = runtime_session.relaxation_prediction(
                    case,
                    calc,
                    selection.row_spec,
                    relaxation_prediction,
                )
            else:
                prediction = relaxation_prediction(case, calc, selection.row_spec)
        else:
            prediction = single_point_prediction(case, calc, selection.row_spec)
        if checkpoint is not None:
            checkpoint.record_prediction(row_id, case_index, case, prediction)
        predictions.append(prediction)
    if runtime_session is not None:
        predictions = runtime_session.apply_row_policy(predictions)
    score, score_unit, metrics = evaluate_row(row_id, predictions, selection.row_spec)
    return {
        "predictions": predictions,
        "score": score,
        "score_unit": score_unit,
        "metrics": metrics,
        "row_spec": selection.row_spec,
        "fixture_contract": validation,
        "n_structures": len(selection.cases),
    }



def thermodynamic_condition(case: dict[str, Any], row_spec: dict[str, Any]) -> dict[str, Any]:
    """Label a single case with its thermodynamic regime.

    Supports both flat case dictionaries and cases where pressure/temperature/
    phase live under a ``metadata`` key.
    """

    thresholds = row_spec.get("thermodynamic_thresholds", {})
    low_p_max = thresholds.get("low_pressure_gpa_max")
    high_p_min = thresholds.get("high_pressure_gpa_min")
    low_t_max = thresholds.get("low_temperature_k_max")
    high_t_min = thresholds.get("high_temperature_k_min")

    source = case.get("metadata", case)
    pressure_gpa = float(source.get("pressure_gpa", 0.0))
    temperature_k = float(source.get("temperature_k", 0.0))
    phase_label = str(source.get("phase_label", "unknown"))

    return {
        "pressure_gpa": pressure_gpa,
        "temperature_k": temperature_k,
        "phase_label": phase_label,
        "is_low_pressure": low_p_max is not None and pressure_gpa <= low_p_max,
        "is_high_pressure": high_p_min is not None and pressure_gpa >= high_p_min,
        "is_low_temperature": low_t_max is not None and temperature_k <= low_t_max,
        "is_high_temperature": high_t_min is not None and temperature_k >= high_t_min,
    }


def thermodynamic_condition_coverage(
    predictions: list[dict[str, Any]], row_spec: dict[str, Any]
) -> dict[str, Any]:
    """Aggregate thermodynamic coverage across a set of predictions."""

    if not predictions:
        return {
            "coverage_score": 0.0,
            "has_low_pressure": False,
            "has_high_pressure": False,
            "has_low_temperature": False,
            "has_high_temperature": False,
            "phase_count": 0,
        }

    phases = {p["phase_label"] for p in predictions if p["phase_label"] != "unknown"}
    has_low_pressure = any(p["is_low_pressure"] for p in predictions)
    has_high_pressure = any(p["is_high_pressure"] for p in predictions)
    has_low_temperature = any(p["is_low_temperature"] for p in predictions)
    has_high_temperature = any(p["is_high_temperature"] for p in predictions)

    thresholds = row_spec.get("thermodynamic_thresholds", {})
    possible = sum(
        1
        for key in (
            "low_pressure_gpa_max",
            "high_pressure_gpa_min",
            "low_temperature_k_max",
            "high_temperature_k_min",
        )
        if key in thresholds
    )
    hit = sum([has_low_pressure, has_high_pressure, has_low_temperature, has_high_temperature])
    coverage_score = hit / possible if possible else 0.0

    return {
        "coverage_score": coverage_score,
        "has_low_pressure": has_low_pressure,
        "has_high_pressure": has_high_pressure,
        "has_low_temperature": has_low_temperature,
        "has_high_temperature": has_high_temperature,
        "phase_count": len(phases),
    }
