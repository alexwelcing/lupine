from __future__ import annotations

import copy
import hashlib
import json
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

import numpy as np

from .events import RuntimeEventLog
from .instrumented import InstrumentedCalculator
from .leakage import LeakageGuard
from .policy import RuntimePolicy
from .policy_engine import build_policy_engine

PredictRow = Callable[[str, dict[str, Any], Any], dict[str, Any]]

MAX_ENERGY_BIAS_EV_PER_ATOM = 0.5
MAX_STRESS_BIAS_GPA = 25.0
MAX_FORCE_BIAS_EV_PER_ANGSTROM = 1.0


def manifest_hash(manifest: dict[str, Any]) -> str:
    explicit = manifest.get("manifest_hash") or (manifest.get("metadata") or {}).get("manifest_hash")
    if isinstance(explicit, str) and explicit:
        return explicit
    data = json.dumps(manifest, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return "sha256:" + hashlib.sha256(data).hexdigest()


def _ref(prediction: dict[str, Any]) -> dict[str, Any]:
    value = prediction.get("reference")
    return value if isinstance(value, dict) else {}


def _finite_array(value: Any) -> np.ndarray | None:
    try:
        arr = np.asarray(value, dtype=float)
    except Exception:
        return None
    if not arr.size or not np.all(np.isfinite(arr)):
        return None
    return arr


def _material_root(value: Any) -> str | None:
    if not isinstance(value, str) or not value.strip():
        return None
    normalized = value.strip().lower()
    for suffix in ("-support", "_support"):
        if normalized.endswith(suffix):
            normalized = normalized[: -len(suffix)]
    return normalized or None


def _chemical_root(prediction: dict[str, Any]) -> str | None:
    chemical_system = prediction.get("chemical_system")
    if isinstance(chemical_system, str) and chemical_system.strip():
        parts = [part.strip().lower() for part in chemical_system.replace(",", "-").split("-") if part.strip()]
        return "-".join(sorted(set(parts))) if parts else None
    symbols = prediction.get("symbols")
    if isinstance(symbols, list):
        parts = [str(symbol).strip().lower() for symbol in symbols if str(symbol).strip()]
        return "-".join(sorted(set(parts))) if parts else None
    return None


def _material_roots(predictions: list[dict[str, Any]]) -> set[str]:
    roots: set[str] = set()
    for pred in predictions:
        root = _material_root(pred.get("material_id"))
        if root:
            roots.add(root)
        chemical_root = _chemical_root(pred)
        if chemical_root:
            roots.add(chemical_root)
    return roots


def _numeric_feature(name: str, value: Any) -> tuple[str, float] | None:
    if isinstance(value, (int, float)) and np.isfinite(float(value)):
        return f"scalar:{name}", float(value)
    return None


def _feature_map(prediction: dict[str, Any], output_field: str) -> dict[str, float]:
    features: dict[str, float] = {}
    symbols = prediction.get("symbols")
    if isinstance(symbols, list) and symbols:
        features["n_atoms"] = float(len(symbols))
    for key in ("energy_ev_per_atom", "volume_scale", "relaxed_energy_ev_per_atom"):
        feature = _numeric_feature(key, prediction.get(key))
        if feature is not None:
            features[feature[0]] = feature[1]
    for key in ("stress_gpa", "strain_voigt"):
        arr = _finite_array(prediction.get(key))
        if arr is not None:
            flat = arr.reshape(-1)
            for idx, value in enumerate(flat[:12]):
                features[f"component:{key}:{idx}"] = float(value)
    forces = _finite_array(prediction.get("forces_ev_per_angstrom"))
    if forces is not None and forces.ndim >= 2 and forces.shape[-1] == 3:
        matrix = forces.reshape(-1, 3)
        features["n_atoms"] = float(matrix.shape[0])
        mean = matrix.mean(axis=0)
        for idx, value in enumerate(mean):
            features[f"force_mean:{idx}"] = float(value)
        features["force_rms"] = float(np.sqrt(np.mean(matrix**2)))
        features["force_max_norm"] = float(np.max(np.linalg.norm(matrix, axis=1)))
    # Avoid feeding the exact high-dimensional target back into its own model
    # for force arrays. Mean/norm summaries are safer and portable.
    if output_field == "forces_ev_per_angstrom":
        for key in list(features):
            if key.startswith("component:forces_ev_per_angstrom:"):
                features.pop(key, None)
    if output_field == "energy_ev_per_atom":
        for key in list(features):
            if key.startswith("force_"):
                features.pop(key, None)
    return features


def _participation_ratio(matrix: np.ndarray) -> tuple[float | None, list[float]]:
    if matrix.ndim != 2 or matrix.shape[0] < 2 or matrix.shape[1] < 1:
        return None, []
    centered = matrix - np.mean(matrix, axis=0, keepdims=True)
    cov = centered.T @ centered / max(matrix.shape[0] - 1, 1)
    eigvals = np.linalg.eigvalsh(cov)
    eigvals = np.asarray([float(value) for value in eigvals if value > 1e-12], dtype=float)
    if eigvals.size == 0:
        return None, []
    total = float(np.sum(eigvals))
    pr = float((total * total) / max(float(np.sum(eigvals**2)), 1e-12))
    return pr, sorted(eigvals.tolist(), reverse=True)


def _orthonormal_rows(rows: np.ndarray) -> list[list[float]]:
    if rows.ndim != 2 or rows.size == 0:
        return []
    out: list[list[float]] = []
    for row in rows:
        norm = float(np.linalg.norm(row))
        if norm > 1e-12 and np.isfinite(norm):
            out.append((row / norm).astype(float).tolist())
    return out


def _basis_projection_matrix(basis: list[list[float]], dim: int) -> np.ndarray:
    if not basis:
        return np.zeros((dim, dim), dtype=float)
    matrix = np.asarray(basis, dtype=float)
    if matrix.ndim != 2 or matrix.shape[1] != dim:
        return np.zeros((dim, dim), dtype=float)
    return matrix.T @ matrix


def _fit_projected_residual_ribbon(
    *,
    row_id: str,
    output_field: str,
    feature_names: list[str],
    mean: np.ndarray,
    scale: np.ndarray,
    xz: np.ndarray,
    y: np.ndarray,
    intercept: np.ndarray,
    coef: np.ndarray,
    metric: str,
    before: float,
) -> tuple[dict[str, Any] | None, dict[str, Any]]:
    diagnostics: dict[str, Any] = {
        "subspace_schema": "lupine.distill.subspace_diagnostic.v1",
        "subspace_basis_space": "feature",
        "subspace_output_field": output_field,
    }
    feature_dim = int(xz.shape[1]) if xz.ndim == 2 else 0
    if xz.ndim != 2 or y.ndim != 2 or feature_dim < 2 or xz.shape[0] < 2:
        diagnostics["subspace_status"] = "blocked_insufficient_feature_rank"
        return None, diagnostics

    centered_x = xz - np.mean(xz, axis=0, keepdims=True)
    try:
        _, singular_values, vt = np.linalg.svd(centered_x, full_matrices=True)
    except np.linalg.LinAlgError:
        diagnostics["subspace_status"] = "blocked_svd_failed"
        return None, diagnostics

    if vt.size == 0:
        diagnostics["subspace_status"] = "blocked_empty_basis"
        return None, diagnostics

    stiff_basis = _orthonormal_rows(vt[:1])
    complement_basis = _orthonormal_rows(vt[1:])
    if not stiff_basis or not complement_basis:
        diagnostics["subspace_status"] = "blocked_empty_complement"
        return None, diagnostics

    p_stiff = _basis_projection_matrix(stiff_basis, feature_dim)
    p_complement = _basis_projection_matrix(complement_basis, feature_dim)
    coef_norm_sq = float(np.sum(coef**2))
    if coef_norm_sq <= 1e-18:
        diagnostics["subspace_status"] = "blocked_zero_correction_signal"
        return None, diagnostics

    stiff_response = coef @ p_stiff
    complement_response = coef @ p_complement
    stiff_signal_fraction = float(np.sum(stiff_response**2) / coef_norm_sq)
    complement_signal_fraction = float(np.sum(complement_response**2) / coef_norm_sq)
    xz_projected = xz @ p_complement
    fitted_projected = intercept + xz_projected @ coef.T
    if metric == "mae":
        after_projected = float(np.mean(np.abs(y - fitted_projected)))
    else:
        after_projected = float(np.sqrt(np.mean((y - fitted_projected) ** 2)))
    projected_lift = float(max(0.0, (before - after_projected) / max(before, 1e-12)))
    stiff_component = centered_x @ p_stiff
    projection_distance = float(
        np.median(
            np.linalg.norm(stiff_component, axis=1)
            / np.maximum(np.linalg.norm(centered_x, axis=1), 1e-12)
        )
    )
    eigvals = (singular_values**2 / max(xz.shape[0] - 1, 1)).astype(float)
    eigvals = eigvals[eigvals > 1e-12]
    total = float(np.sum(eigvals))
    pr = float((total * total) / max(float(np.sum(eigvals**2)), 1e-12)) if eigvals.size else None

    diagnostics.update(
        {
            "subspace_status": "fit",
            "stiff_axis_basis": stiff_basis,
            "complement_basis": complement_basis,
            "singular_values": singular_values.astype(float).tolist(),
            "participation_ratio": pr,
            "stiff_axis_residual_fraction": stiff_signal_fraction,
            "complement_residual_fraction": complement_signal_fraction,
            "stiff_axis_drift_fraction": stiff_signal_fraction,
            "projection_distance_proxy": projection_distance,
            "projected_support_error_after": after_projected,
            "projected_support_lift_fraction": projected_lift,
            "theorem_development_lanes": [
                {
                    "lane": "stiff_axis_preservation",
                    "runtime_proxy": "stiff_axis_drift_fraction",
                    "status": "measured",
                },
                {
                    "lane": "orthogonal_complement_lift",
                    "runtime_proxy": "complement_residual_fraction",
                    "status": "measured",
                },
                {
                    "lane": "projection_tube_refusal",
                    "runtime_proxy": "projection_distance_proxy",
                    "status": "measured",
                },
                {
                    "lane": "vandermonde_decay",
                    "runtime_proxy": "singular_values",
                    "status": "measured",
                },
            ],
        }
    )
    model = {
        "schema": "lupine.distill.ribbon_projected_residual_correction.v1",
        "row_id": row_id,
        "field": output_field,
        "basis_space": "feature",
        "feature_names": feature_names,
        "feature_mean": mean.tolist(),
        "feature_scale": scale.tolist(),
        "intercept": intercept.tolist(),
        "coefficients": coef.tolist(),
        "stiff_axis_basis": stiff_basis,
        "complement_basis": complement_basis,
        "support_lift_fraction": projected_lift,
        "projected_support_lift_fraction": projected_lift,
        "support_error_before": before,
        "support_error_after": after_projected,
        "complement_residual_fraction": complement_signal_fraction,
        "stiff_axis_residual_fraction": stiff_signal_fraction,
        "stiff_axis_drift_fraction": stiff_signal_fraction,
        "projection_distance_proxy": projection_distance,
        "sample_count": int(xz.shape[0]),
        "observable_dim": int(y.shape[1]),
        "matrix_rank": int(np.linalg.matrix_rank(y - np.mean(y, axis=0, keepdims=True))),
        "participation_ratio": pr,
        "singular_values": singular_values.astype(float).tolist(),
        "metric": metric,
    }
    return model, diagnostics


def _fit_residual_ribbon(
    *,
    row_id: str,
    output_field: str,
    samples: list[tuple[dict[str, Any], np.ndarray]],
    metric: str,
) -> tuple[dict[str, Any] | None, dict[str, Any] | None, dict[str, Any]]:
    diagnostics: dict[str, Any] = {}
    if len(samples) < 2:
        diagnostics["residual_ribbon_status"] = "blocked_insufficient_support"
        return None, None, diagnostics
    y = np.vstack([residual.reshape(-1) for _, residual in samples]).astype(float)
    output_dim = int(y.shape[1])
    feature_maps = [_feature_map(prediction, output_field) for prediction, _ in samples]
    common = sorted(set.intersection(*(set(features) for features in feature_maps))) if feature_maps else []
    common = [
        name
        for name in common
        if all(np.isfinite(features[name]) for features in feature_maps)
    ]
    if not common:
        diagnostics["residual_ribbon_status"] = "blocked_no_common_features"
        return None, None, diagnostics
    x_all = np.asarray([[features[name] for name in common] for features in feature_maps], dtype=float)
    feature_scale = np.std(x_all, axis=0)
    variable = feature_scale > 1e-12
    common = [name for idx, name in enumerate(common) if bool(variable[idx])]
    x_all = x_all[:, variable]
    feature_scale = feature_scale[variable]
    if x_all.shape[1] == 0:
        diagnostics["residual_ribbon_status"] = "blocked_no_variable_features"
        return None, None, diagnostics

    residual_norm = np.linalg.norm(y, axis=1)
    feature_scores = []
    for idx in range(x_all.shape[1]):
        column = x_all[:, idx]
        if np.std(column) <= 1e-12 or np.std(residual_norm) <= 1e-12:
            score = 0.0
        else:
            score = abs(float(np.corrcoef(column, residual_norm)[0, 1]))
            if not np.isfinite(score):
                score = 0.0
        feature_scores.append((score, idx))
    feature_scores.sort(reverse=True)
    max_features = max(1, min(4, len(samples) - 1, len(feature_scores)))
    selected_idx = sorted(idx for _, idx in feature_scores[:max_features])
    feature_names = [common[idx] for idx in selected_idx]
    x = x_all[:, selected_idx]
    mean = np.mean(x, axis=0)
    scale = np.std(x, axis=0)
    scale = np.where(scale > 1e-12, scale, 1.0)
    xz = (x - mean) / scale
    intercept = np.mean(y, axis=0)
    centered_y = y - intercept
    ridge = 1e-3
    gram = xz.T @ xz + np.eye(xz.shape[1]) * ridge
    coef = np.linalg.solve(gram, xz.T @ centered_y).T
    fitted = intercept + xz @ coef.T
    if metric == "mae":
        before = float(np.mean(np.abs(y)))
        after = float(np.mean(np.abs(y - fitted)))
    else:
        before = float(np.sqrt(np.mean(y**2)))
        after = float(np.sqrt(np.mean((y - fitted) ** 2)))
    lift = float(max(0.0, (before - after) / max(before, 1e-12)))
    pr, eigvals = _participation_ratio(y)
    rank = int(np.linalg.matrix_rank(y - np.mean(y, axis=0, keepdims=True)))
    diagnostics.update(
        {
            "residual_ribbon_status": "fit",
            "residual_ribbon_field": output_field,
            "residual_ribbon_feature_names": feature_names,
            "residual_ribbon_sample_count": len(samples),
            "residual_ribbon_observable_dim": output_dim,
            "residual_ribbon_matrix_rank": rank,
            "residual_ribbon_participation_ratio": pr,
            "residual_ribbon_eigenvalues": eigvals,
            "residual_ribbon_support_error_before": before,
            "residual_ribbon_support_error_after": after,
            "residual_ribbon_support_lift_fraction": lift,
            "residual_ribbon_rank_limited": len(samples) <= output_dim,
        }
    )
    model = {
        "schema": "lupine.distill.ribbon_residual_correction.v1",
        "row_id": row_id,
        "field": output_field,
        "feature_names": feature_names,
        "feature_mean": mean.tolist(),
        "feature_scale": scale.tolist(),
        "intercept": intercept.tolist(),
        "coefficients": coef.tolist(),
        "support_lift_fraction": lift,
        "support_error_before": before,
        "support_error_after": after,
        "sample_count": len(samples),
        "observable_dim": output_dim,
        "matrix_rank": rank,
        "rank_limited": len(samples) <= output_dim,
        "participation_ratio": pr,
        "eigenvalues": eigvals,
        "metric": metric,
    }
    projected_model, projected_diagnostics = _fit_projected_residual_ribbon(
        row_id=row_id,
        output_field=output_field,
        feature_names=feature_names,
        mean=mean,
        scale=scale,
        xz=xz,
        y=y,
        intercept=intercept,
        coef=coef,
        metric=metric,
        before=before,
    )
    diagnostics.update(projected_diagnostics)
    return model, projected_model, diagnostics


@dataclass
class DistillSupportModel:
    row_id: str
    correction: dict[str, Any] = field(default_factory=dict)
    candidate_correction: dict[str, Any] = field(default_factory=dict)
    diagnostics: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def fit(cls, row_id: str, support_predictions: list[dict[str, Any]]) -> DistillSupportModel:
        correction: dict[str, Any] = {}
        candidate_correction: dict[str, Any] = {}
        support_material_roots = sorted(_material_roots(support_predictions))
        diagnostics: dict[str, Any] = {
            "n_support_predictions": len(support_predictions),
            "support_material_roots": support_material_roots,
        }

        if row_id == "energy_volume":
            residuals = []
            predictions = []
            references = []
            ribbon_samples: list[tuple[dict[str, Any], np.ndarray]] = []
            for pred in support_predictions:
                ref = _ref(pred)
                if isinstance(ref.get("energy_ev_per_atom"), (int, float)):
                    prediction = float(pred["energy_ev_per_atom"])
                    reference = float(ref["energy_ev_per_atom"])
                    residual = reference - prediction
                    residuals.append(residual)
                    predictions.append(prediction)
                    references.append(reference)
                    ribbon_samples.append((pred, np.asarray([residual], dtype=float)))
            if residuals:
                bias = float(np.mean(residuals))
                before_mae = float(np.mean(np.abs(np.asarray(predictions) - np.asarray(references))))
                after_mae = float(
                    np.mean(np.abs((np.asarray(predictions) + bias) - np.asarray(references)))
                )
                diagnostics["energy_bias_candidate_ev_per_atom"] = bias
                diagnostics["energy_support_mae_before"] = before_mae
                diagnostics["energy_support_mae_after"] = after_mae
                candidate_correction["energy_bias_ev_per_atom"] = bias
                ribbon_model, projected_model, ribbon_diagnostics = _fit_residual_ribbon(
                    row_id=row_id,
                    output_field="energy_ev_per_atom",
                    samples=ribbon_samples,
                    metric="mae",
                )
                diagnostics.update({f"energy_{key}": value for key, value in ribbon_diagnostics.items()})
                if ribbon_model is not None:
                    candidate_correction["ribbon_residual_correction_v1"] = ribbon_model
                if projected_model is not None:
                    candidate_correction["ribbon_projected_residual_correction_v1"] = projected_model
                if abs(bias) <= MAX_ENERGY_BIAS_EV_PER_ATOM and after_mae <= before_mae * 0.98:
                    correction["energy_bias_ev_per_atom"] = bias
                    diagnostics["energy_correction_gate"] = "passed"
                elif abs(bias) > MAX_ENERGY_BIAS_EV_PER_ATOM:
                    diagnostics["energy_correction_gate"] = "blocked_large_bias"
                else:
                    diagnostics["energy_correction_gate"] = "blocked_no_support_lift"

        if row_id in {"stress", "elastic_constants"}:
            residuals = []
            ribbon_samples: list[tuple[dict[str, Any], np.ndarray]] = []
            for pred in support_predictions:
                pred_stress = _finite_array(pred.get("stress_gpa"))
                ref_stress = _finite_array(_ref(pred).get("stress_gpa"))
                if pred_stress is not None and ref_stress is not None and pred_stress.shape == ref_stress.shape:
                    residual = ref_stress.reshape(-1) - pred_stress.reshape(-1)
                    residuals.append(residual)
                    ribbon_samples.append((pred, residual))
            if residuals:
                stacked = np.vstack(residuals)
                bias = np.mean(stacked, axis=0)
                before_mae = float(np.mean(np.abs(stacked)))
                after_mae = float(np.mean(np.abs(stacked - bias)))
                diagnostics["stress_bias_candidate_gpa"] = bias.tolist()
                diagnostics["stress_support_mae_before_gpa"] = before_mae
                diagnostics["stress_support_mae_after_gpa"] = after_mae
                candidate_correction["stress_bias_gpa"] = bias.tolist()
                ribbon_model, projected_model, ribbon_diagnostics = _fit_residual_ribbon(
                    row_id=row_id,
                    output_field="stress_gpa",
                    samples=ribbon_samples,
                    metric="mae",
                )
                diagnostics.update({f"stress_{key}": value for key, value in ribbon_diagnostics.items()})
                if row_id in {"stress", "elastic_constants"} and ribbon_model is not None:
                    candidate_correction["ribbon_residual_correction_v1"] = ribbon_model
                if row_id in {"stress", "elastic_constants"} and projected_model is not None:
                    candidate_correction["ribbon_projected_residual_correction_v1"] = projected_model
                if row_id == "elastic_constants":
                    diagnostics["stress_correction_gate"] = (
                        "passed_strain_aware_ribbon_candidate"
                        if ribbon_model is not None
                        else "blocked_elastic_requires_strain_aware_fit"
                    )
                elif float(np.max(np.abs(bias))) <= MAX_STRESS_BIAS_GPA and after_mae <= before_mae * 0.98:
                    correction["stress_bias_gpa"] = bias.tolist()
                    diagnostics["stress_correction_gate"] = "passed"
                elif float(np.max(np.abs(bias))) > MAX_STRESS_BIAS_GPA:
                    diagnostics["stress_correction_gate"] = "blocked_large_bias"
                else:
                    diagnostics["stress_correction_gate"] = "blocked_no_support_lift"

        if row_id == "forces":
            residuals = []
            before = []
            after = []
            ribbon_samples: list[tuple[dict[str, Any], np.ndarray]] = []
            for pred in support_predictions:
                pred_forces = _finite_array(pred.get("forces_ev_per_angstrom"))
                ref_forces = _finite_array(_ref(pred).get("forces_ev_per_angstrom"))
                if pred_forces is not None and ref_forces is not None and pred_forces.shape == ref_forces.shape:
                    residual = ref_forces - pred_forces
                    residuals.append(residual.reshape(-1, pred_forces.shape[-1]))
                    ribbon_samples.append((pred, residual.reshape(-1, pred_forces.shape[-1]).mean(axis=0)))
                    before.append(np.mean((pred_forces - ref_forces) ** 2))
            if residuals:
                bias = np.vstack(residuals).mean(axis=0)
                for pred in support_predictions:
                    pred_forces = _finite_array(pred.get("forces_ev_per_angstrom"))
                    ref_forces = _finite_array(_ref(pred).get("forces_ev_per_angstrom"))
                    if pred_forces is not None and ref_forces is not None and pred_forces.shape == ref_forces.shape:
                        after.append(np.mean((pred_forces + bias - ref_forces) ** 2))
                before_rmse = float(np.sqrt(np.mean(before))) if before else float("inf")
                after_rmse = float(np.sqrt(np.mean(after))) if after else float("inf")
                diagnostics["force_support_rmse_before"] = before_rmse
                diagnostics["force_support_rmse_after"] = after_rmse
                diagnostics["force_bias_candidate_ev_per_angstrom"] = bias.tolist()
                candidate_correction["force_bias_ev_per_angstrom"] = bias.tolist()
                ribbon_model, projected_model, ribbon_diagnostics = _fit_residual_ribbon(
                    row_id=row_id,
                    output_field="forces_ev_per_angstrom",
                    samples=ribbon_samples,
                    metric="rmse",
                )
                diagnostics.update({f"force_{key}": value for key, value in ribbon_diagnostics.items()})
                if ribbon_model is not None:
                    candidate_correction["ribbon_residual_correction_v1"] = ribbon_model
                if projected_model is not None:
                    candidate_correction["ribbon_projected_residual_correction_v1"] = projected_model
                max_bias = float(np.max(np.linalg.norm(bias.reshape(-1, bias.shape[-1]), axis=-1)))
                if after_rmse <= before_rmse * 0.98 and max_bias <= MAX_FORCE_BIAS_EV_PER_ANGSTROM:
                    correction["force_bias_ev_per_angstrom"] = bias.tolist()
                    diagnostics["force_correction_gate"] = "passed"
                elif max_bias > MAX_FORCE_BIAS_EV_PER_ANGSTROM:
                    diagnostics["force_correction_gate"] = "blocked_large_bias"
                else:
                    diagnostics["force_correction_gate"] = "blocked_no_support_lift"

        if row_id == "relaxation_stability":
            residuals = []
            predictions = []
            references = []
            ribbon_samples: list[tuple[dict[str, Any], np.ndarray]] = []
            for pred in support_predictions:
                ref = _ref(pred)
                if isinstance(pred.get("relaxed_energy_ev_per_atom"), (int, float)) and isinstance(
                    ref.get("relaxed_energy_ev_per_atom"),
                    (int, float),
                ):
                    prediction = float(pred["relaxed_energy_ev_per_atom"])
                    reference = float(ref["relaxed_energy_ev_per_atom"])
                    residual = reference - prediction
                    residuals.append(residual)
                    predictions.append(prediction)
                    references.append(reference)
                    ribbon_samples.append((pred, np.asarray([residual], dtype=float)))
            if residuals:
                bias = float(np.mean(residuals))
                before_mae = float(np.mean(np.abs(np.asarray(predictions) - np.asarray(references))))
                after_mae = float(
                    np.mean(np.abs((np.asarray(predictions) + bias) - np.asarray(references)))
                )
                diagnostics["relaxation_energy_bias_candidate_ev_per_atom"] = bias
                diagnostics["relaxation_energy_support_mae_before"] = before_mae
                diagnostics["relaxation_energy_support_mae_after"] = after_mae
                candidate_correction["relaxed_energy_bias_ev_per_atom"] = bias
                ribbon_model, projected_model, ribbon_diagnostics = _fit_residual_ribbon(
                    row_id=row_id,
                    output_field="relaxed_energy_ev_per_atom",
                    samples=ribbon_samples,
                    metric="mae",
                )
                diagnostics.update({f"relaxation_{key}": value for key, value in ribbon_diagnostics.items()})
                if ribbon_model is not None:
                    candidate_correction["ribbon_residual_correction_v1"] = ribbon_model
                if projected_model is not None:
                    candidate_correction["ribbon_projected_residual_correction_v1"] = projected_model
                if abs(bias) <= MAX_ENERGY_BIAS_EV_PER_ATOM and after_mae <= before_mae * 0.98:
                    correction["relaxed_energy_bias_ev_per_atom"] = bias
                    diagnostics["relaxation_energy_correction_gate"] = "passed"
                elif abs(bias) > MAX_ENERGY_BIAS_EV_PER_ATOM:
                    diagnostics["relaxation_energy_correction_gate"] = "blocked_large_bias"
                else:
                    diagnostics["relaxation_energy_correction_gate"] = "blocked_no_support_lift"

        return cls(
            row_id=row_id,
            correction=correction,
            candidate_correction=candidate_correction,
            diagnostics=diagnostics,
        )

    def gate_for_eval_predictions(self, predictions: list[dict[str, Any]]) -> None:
        support_roots = set(self.diagnostics.get("support_material_roots") or [])
        eval_roots = _material_roots(predictions)
        self.diagnostics["eval_material_roots"] = sorted(eval_roots)
        ribbon_model = self.candidate_correction.get("ribbon_residual_correction_v1")
        if isinstance(ribbon_model, dict):
            distances = []
            for prediction in predictions:
                distance = self.ribbon_feature_distance_for_prediction(prediction)
                if distance is not None:
                    distances.append(distance)
            self.diagnostics["ribbon_feature_distance_proxy"] = (
                float(np.median(distances)) if distances else None
            )
        projected_model = self.candidate_correction.get("ribbon_projected_residual_correction_v1")
        if isinstance(projected_model, dict):
            distances = []
            for prediction in predictions:
                distance = self.projection_distance_for_prediction(prediction)
                if distance is not None:
                    distances.append(distance)
            self.diagnostics["projection_distance_proxy"] = (
                float(np.median(distances)) if distances else None
            )
        if not self.correction and not self.candidate_correction:
            self.diagnostics["applicability_gate"] = "passed_no_executable_correction"
            self.diagnostics["support_eval_distance_proxy"] = None
            return
        if support_roots and eval_roots and support_roots.isdisjoint(eval_roots):
            self.diagnostics["applicability_gate"] = "passed_global_residual_no_material_overlap"
            self.diagnostics["support_eval_distance_proxy"] = 1.0
            return
        self.diagnostics["support_eval_distance_proxy"] = 0.0
        self.diagnostics["applicability_gate"] = "passed"

    def ribbon_feature_distance_for_prediction(self, prediction: dict[str, Any]) -> float | None:
        ribbon_model = self.candidate_correction.get("ribbon_residual_correction_v1")
        if not isinstance(ribbon_model, dict):
            return None
        feature_names = ribbon_model.get("feature_names") or []
        means = ribbon_model.get("feature_mean") or []
        scales = ribbon_model.get("feature_scale") or []
        field = str(ribbon_model.get("field") or "")
        if len(feature_names) != len(means) or len(feature_names) != len(scales):
            return None
        features = _feature_map(prediction, field)
        values = []
        for name, mean, scale in zip(feature_names, means, scales, strict=True):
            if name not in features:
                continue
            divisor = float(scale) if abs(float(scale)) > 1e-12 else 1.0
            values.append(((features[name] - float(mean)) / divisor) ** 2)
        if not values:
            return None
        return float(np.sqrt(np.mean(values)))

    def projection_distance_for_prediction(self, prediction: dict[str, Any]) -> float | None:
        projected_model = self.candidate_correction.get("ribbon_projected_residual_correction_v1")
        if not isinstance(projected_model, dict):
            return None
        feature_names = projected_model.get("feature_names") or []
        means = projected_model.get("feature_mean") or []
        scales = projected_model.get("feature_scale") or []
        stiff_basis = projected_model.get("stiff_axis_basis") or []
        field = str(projected_model.get("field") or "")
        if len(feature_names) != len(means) or len(feature_names) != len(scales):
            return None
        features = _feature_map(prediction, field)
        values = []
        for name, mean, scale in zip(feature_names, means, scales, strict=True):
            if name not in features:
                continue
            divisor = float(scale) if abs(float(scale)) > 1e-12 else 1.0
            values.append((features[name] - float(mean)) / divisor)
        if len(values) != len(feature_names) or not values:
            return None
        vector = np.asarray(values, dtype=float)
        basis = np.asarray(stiff_basis, dtype=float)
        if basis.ndim != 2 or basis.shape[1] != vector.shape[0] or basis.size == 0:
            return None
        norms = np.linalg.norm(basis, axis=1)
        valid = norms > 1e-12
        if not np.any(valid):
            return None
        basis = basis[valid] / norms[valid, None]
        stiff = basis.T @ (basis @ vector)
        return float(np.linalg.norm(stiff) / max(float(np.linalg.norm(vector)), 1e-12))

    def correct_prediction(self, prediction: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        corrected = copy.deepcopy(prediction)
        interventions: list[dict[str, Any]] = []
        if "energy_bias_ev_per_atom" in self.correction and "energy_ev_per_atom" in corrected:
            corrected["energy_ev_per_atom"] = float(corrected["energy_ev_per_atom"]) + float(
                self.correction["energy_bias_ev_per_atom"]
            )
            interventions.append({"action": "delta_correct", "field": "energy_ev_per_atom"})
        if "stress_bias_gpa" in self.correction and "stress_gpa" in corrected:
            stress = np.asarray(corrected["stress_gpa"], dtype=float).reshape(-1)
            bias = np.asarray(self.correction["stress_bias_gpa"], dtype=float).reshape(-1)
            if stress.shape == bias.shape:
                corrected["stress_gpa"] = (stress + bias).tolist()
                interventions.append({"action": "delta_correct", "field": "stress_gpa"})
        if "force_bias_ev_per_angstrom" in self.correction and "forces_ev_per_angstrom" in corrected:
            forces = np.asarray(corrected["forces_ev_per_angstrom"], dtype=float)
            bias = np.asarray(self.correction["force_bias_ev_per_angstrom"], dtype=float)
            if forces.shape[-1:] == bias.shape:
                corrected["forces_ev_per_angstrom"] = (forces + bias).tolist()
                interventions.append({"action": "delta_correct", "field": "forces_ev_per_angstrom"})
        if "relaxed_energy_bias_ev_per_atom" in self.correction and "relaxed_energy_ev_per_atom" in corrected:
            corrected["relaxed_energy_ev_per_atom"] = float(corrected["relaxed_energy_ev_per_atom"]) + float(
                self.correction["relaxed_energy_bias_ev_per_atom"]
            )
            interventions.append({"action": "delta_correct", "field": "relaxed_energy_ev_per_atom"})
        return corrected, interventions

    def correction_evidence(self) -> dict[str, Any]:
        return dict(self.candidate_correction or self.correction)


@dataclass
class DistillSession:
    profile: str
    run_id: str
    cell_id: str
    row_id: str
    mlip_id: str
    eval_manifest: dict[str, Any] | None = None
    support_manifest: dict[str, Any] | None = None
    policy_engine_name: str = "python"
    atlas_distill_bin: str | None = None
    ribbon_version: str = "hyperribbon-v1"
    policy_limits_path: str | None = None
    event_log: RuntimeEventLog = field(default_factory=RuntimeEventLog)
    support_model: DistillSupportModel | None = None
    leakage_guard: dict[str, Any] | None = None
    interventions: list[dict[str, Any]] = field(default_factory=list)
    refusals: list[dict[str, Any]] = field(default_factory=list)
    policy_batches: list[dict[str, Any]] = field(default_factory=list)
    policy_decisions: list[dict[str, Any]] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.policy = RuntimePolicy(self.profile)
        self.policy_engine = build_policy_engine(
            self.policy_engine_name,
            profile=self.profile,
            atlas_distill_bin=self.atlas_distill_bin,
            ribbon_version=self.ribbon_version,
            policy_limits_path=self.policy_limits_path,
        )

    @property
    def enabled(self) -> bool:
        return self.policy.enabled

    def wrap_calculator(self, calc: Any) -> Any:
        if not self.enabled:
            return calc
        return InstrumentedCalculator(
            calc,
            self.event_log,
            cache_enabled=self.policy.accelerate,
            label=f"{self.mlip_id}:{self.row_id}",
        )

    def relaxation_prediction(
        self,
        record: dict[str, Any],
        calc: Any,
        row_spec: dict[str, Any],
        default_predict: Callable[[dict[str, Any], Any, dict[str, Any]], dict[str, Any]],
    ) -> dict[str, Any]:
        prediction = default_predict(record, calc, row_spec)
        if not self.enabled or self.profile != "accuracy":
            return prediction
        threshold = float(prediction.get("relaxation_force_threshold", row_spec.get("force_threshold", 0.05)))
        current_force = float(prediction.get("relaxation_max_force_ev_per_angstrom", float("inf")))
        if prediction.get("relaxation_converged") is True and current_force <= threshold:
            return prediction

        base_steps = max(1, int(row_spec.get("max_steps", 200)))
        candidates = [prediction]
        for factor in (2, 4):
            retry_spec = dict(row_spec)
            retry_spec["max_steps"] = base_steps * factor
            retry = default_predict(record, calc, retry_spec)
            retry["distill_relaxation_retry"] = {
                "strategy": "extra_steps",
                "step_factor": factor,
                "max_steps": retry_spec["max_steps"],
            }
            candidates.append(retry)

        def proxy_score(candidate: dict[str, Any]) -> tuple[int, float, float]:
            converged = 1 if candidate.get("relaxation_converged") is True else 0
            max_force = float(candidate.get("relaxation_max_force_ev_per_angstrom", float("inf")))
            energy = float(candidate.get("relaxed_energy_ev_per_atom", float("inf")))
            return (converged, -max_force, -abs(energy) if np.isfinite(energy) else float("-inf"))

        best = max(candidates, key=proxy_score)
        if best is not prediction:
            retry = best.get("distill_relaxation_retry")
            record = {
                "action": "tighten",
                "field": "relaxation_stability",
                "reason": "extra_steps_improved_relaxation_proxy",
                "baseline_max_force_ev_per_angstrom": current_force,
                "selected_max_force_ev_per_angstrom": best.get("relaxation_max_force_ev_per_angstrom"),
                "selected_converged": best.get("relaxation_converged"),
                "retry": retry,
            }
            self.interventions.append(record)
            self.event_log.emit("relaxation.tighten", **record)
            best.setdefault("distill", {})
            best["distill"] = {
                **best["distill"],
                "relaxation_retry": retry,
            }
        return best

    def fit_support(self, calc: Any, predict_row: PredictRow) -> None:
        if not self.enabled or self.support_manifest is None:
            return
        if self.eval_manifest is not None:
            guard = LeakageGuard(self.support_manifest, self.eval_manifest)
            self.leakage_guard = guard.assert_no_overlap()
        support_calc = self.wrap_calculator(calc)
        row_result = predict_row(self.row_id, self.support_manifest, support_calc)
        predictions = row_result.get("predictions")
        if not isinstance(predictions, list):
            raise ValueError("support row did not return predictions")
        self.support_model = DistillSupportModel.fit(self.row_id, predictions)
        self.event_log.emit(
            "support.fit",
            row_id=self.row_id,
            mlip_id=self.mlip_id,
            support_manifest_hash=manifest_hash(self.support_manifest),
            correction_fields=sorted(self.support_model.correction.keys()),
            candidate_correction_fields=sorted(self.support_model.candidate_correction.keys()),
            diagnostics=self.support_model.diagnostics,
        )

    def apply_row_policy(self, predictions: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not self.enabled:
            return predictions
        if self.support_model is not None:
            self.support_model.gate_for_eval_predictions(predictions)
        corrected: list[dict[str, Any]] = []
        contexts = [
            {
                "profile": self.profile,
                "run_id": self.run_id,
                "cell_id": self.cell_id,
                "prediction_index": idx,
                "ribbon_feature_distance_proxy": self.support_model.ribbon_feature_distance_for_prediction(prediction)
                if self.support_model is not None
                else None,
            }
            for idx, prediction in enumerate(predictions)
        ]
        decisions = self.policy_engine.decide_many(
            row_id=self.row_id,
            mlip_id=self.mlip_id,
            predictions=predictions,
            support_model=self.support_model,
            contexts=contexts,
        )
        if len(decisions) != len(predictions):
            raise ValueError(f"policy engine returned {len(decisions)} decisions for {len(predictions)} predictions")
        batch_record = {
            "schema": "lupine.distill.policy_batch.v1",
            "row_id": self.row_id,
            "mlip_id": self.mlip_id,
            "policy_engine": decisions[0].policy_engine
            if decisions
            else getattr(self.policy_engine, "name", self.policy_engine_name),
            "ribbon_version": (decisions[0].ribbon_version if decisions else None)
            or self.ribbon_version,
            "prediction_count": len(predictions),
            "decision_count": len(decisions),
        }
        self.policy_batches.append(batch_record)
        self.event_log.emit("policy.batch", **batch_record)
        for idx, decision in enumerate(decisions):
            current = decision.corrected_prediction
            actions = decision.actions
            policy_decision = {
                "prediction_index": idx,
                "structure_id": current.get("structure_id"),
                "decision": decision.decision,
                "decision_id": decision.decision_id,
                "policy_engine": decision.policy_engine,
                "ribbon_version": decision.ribbon_version or self.ribbon_version,
                "refused": decision.refused,
                "actions": actions,
                "theorem_hooks": decision.theorem_hooks,
            }
            self.policy_decisions.append(policy_decision)
            self.event_log.emit("policy.decision", **policy_decision)
            for action in actions:
                record = {
                    "prediction_index": idx,
                    "structure_id": current.get("structure_id"),
                    "row_id": self.row_id,
                    "mlip_id": self.mlip_id,
                    "policy_engine": decision.policy_engine,
                    "ribbon_version": decision.ribbon_version or self.ribbon_version,
                    "policy_decision_id": decision.decision_id,
                    **action,
                }
                self.interventions.append(record)
                if action.get("action") == "refuse":
                    self.refusals.append(record)
                self.event_log.emit("policy.intervention", **record)
            current.setdefault("distill", {})
            current["distill"] = {
                **current["distill"],
                "profile": self.profile,
                "policy_engine": decision.policy_engine,
                "ribbon_version": decision.ribbon_version or self.ribbon_version,
                "policy_decision_id": decision.decision_id,
                "decision": decision.decision,
                "interventions": actions,
            }
            corrected.append(current)
        return corrected

    def theorem_hooks(self, duration_s: float | None = None, baseline_duration_s: float | None = None) -> dict[str, Any]:
        support_count = self.leakage_guard.get("support_structures", 0) if self.leakage_guard else 0
        eval_count = self.leakage_guard.get("eval_structures", 0) if self.leakage_guard else 0
        kappa1_hat = support_count / max(support_count + eval_count, 1)
        observed_speedup = None
        if duration_s and baseline_duration_s and duration_s > 0:
            observed_speedup = baseline_duration_s / duration_s
        diagnostics = self.support_model.diagnostics if self.support_model else {}
        residual_keys = [
            key
            for key in diagnostics
            if key.endswith("residual_ribbon_participation_ratio")
            or key.endswith("residual_ribbon_matrix_rank")
            or key.endswith("residual_ribbon_rank_limited")
            or key.endswith("residual_ribbon_support_lift_fraction")
            or key == "ribbon_feature_distance_proxy"
        ]
        return {
            "schema": "lupine.distill.theorem_hooks.v1",
            "bridge": "outer_loop_proxy",
            "policy_engine": getattr(self.policy_engine, "name", self.policy_engine_name),
            "ribbon_version": self.ribbon_version,
            "kappa1_hat": kappa1_hat,
            "support_eval_distance_proxy": 1.0 if self.leakage_guard and self.leakage_guard.get("passed") else 0.0,
            "refusal_threshold_proxy": 200.0,
            "false_refusal_estimate": None,
            "observed_speedup": observed_speedup,
            "p2_residual_pca": {
                "top_k": 5,
                "status": "computed_from_support_residuals" if residual_keys else "not_computed_in_cell_runner",
                "metrics": {key: diagnostics.get(key) for key in residual_keys},
            },
            "layerwise_exact": False,
        }

    def summary(self, events_uri: str | None = None) -> dict[str, Any]:
        return {
            "schema": "lupine.distill.runtime_summary.v1",
            "profile": self.profile,
            "policy_engine": getattr(self.policy_engine, "name", self.policy_engine_name),
            "ribbon_version": self.ribbon_version,
            "policy_limits_path": self.policy_limits_path,
            "run_id": self.run_id,
            "cell_id": self.cell_id,
            "row_id": self.row_id,
            "mlip_id": self.mlip_id,
            "enabled": self.enabled,
            "support_manifest_hash": manifest_hash(self.support_manifest) if self.support_manifest else None,
            "leakage_guard": self.leakage_guard,
            "support_model": {
                "correction": self.support_model.correction,
                "candidate_correction": self.support_model.candidate_correction,
                "diagnostics": self.support_model.diagnostics,
            } if self.support_model else None,
            "interventions": self.interventions,
            "refusals": self.refusals,
            "policy_batches": self.policy_batches,
            "policy_decisions": self.policy_decisions,
            "events_uri": events_uri,
        }
