from __future__ import annotations

import copy
import hashlib
import json
from dataclasses import dataclass, field
from typing import Any, Callable

import numpy as np

from .events import RuntimeEventLog
from .instrumented import InstrumentedCalculator
from .leakage import LeakageGuard
from .policy_engine import build_policy_engine
from .policy import RuntimePolicy


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


@dataclass
class DistillSupportModel:
    row_id: str
    correction: dict[str, Any] = field(default_factory=dict)
    candidate_correction: dict[str, Any] = field(default_factory=dict)
    diagnostics: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def fit(cls, row_id: str, support_predictions: list[dict[str, Any]]) -> "DistillSupportModel":
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
            for pred in support_predictions:
                ref = _ref(pred)
                if isinstance(ref.get("energy_ev_per_atom"), (int, float)):
                    prediction = float(pred["energy_ev_per_atom"])
                    reference = float(ref["energy_ev_per_atom"])
                    residuals.append(reference - prediction)
                    predictions.append(prediction)
                    references.append(reference)
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
                if abs(bias) <= MAX_ENERGY_BIAS_EV_PER_ATOM and after_mae <= before_mae * 0.98:
                    correction["energy_bias_ev_per_atom"] = bias
                    diagnostics["energy_correction_gate"] = "passed"
                elif abs(bias) > MAX_ENERGY_BIAS_EV_PER_ATOM:
                    diagnostics["energy_correction_gate"] = "blocked_large_bias"
                else:
                    diagnostics["energy_correction_gate"] = "blocked_no_support_lift"

        if row_id in {"stress", "elastic_constants"}:
            residuals = []
            for pred in support_predictions:
                pred_stress = _finite_array(pred.get("stress_gpa"))
                ref_stress = _finite_array(_ref(pred).get("stress_gpa"))
                if pred_stress is not None and ref_stress is not None and pred_stress.shape == ref_stress.shape:
                    residuals.append(ref_stress.reshape(-1) - pred_stress.reshape(-1))
            if residuals:
                stacked = np.vstack(residuals)
                bias = np.mean(stacked, axis=0)
                before_mae = float(np.mean(np.abs(stacked)))
                after_mae = float(np.mean(np.abs(stacked - bias)))
                diagnostics["stress_bias_candidate_gpa"] = bias.tolist()
                diagnostics["stress_support_mae_before_gpa"] = before_mae
                diagnostics["stress_support_mae_after_gpa"] = after_mae
                candidate_correction["stress_bias_gpa"] = bias.tolist()
                if row_id == "elastic_constants":
                    diagnostics["stress_correction_gate"] = "blocked_elastic_requires_strain_aware_fit"
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
            for pred in support_predictions:
                pred_forces = _finite_array(pred.get("forces_ev_per_angstrom"))
                ref_forces = _finite_array(_ref(pred).get("forces_ev_per_angstrom"))
                if pred_forces is not None and ref_forces is not None and pred_forces.shape == ref_forces.shape:
                    residual = ref_forces - pred_forces
                    residuals.append(residual.reshape(-1, pred_forces.shape[-1]))
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
                max_bias = float(np.max(np.linalg.norm(bias.reshape(-1, bias.shape[-1]), axis=-1)))
                if after_rmse <= before_rmse * 0.98 and max_bias <= MAX_FORCE_BIAS_EV_PER_ANGSTROM:
                    correction["force_bias_ev_per_angstrom"] = bias.tolist()
                    diagnostics["force_correction_gate"] = "passed"
                elif max_bias > MAX_FORCE_BIAS_EV_PER_ANGSTROM:
                    diagnostics["force_correction_gate"] = "blocked_large_bias"
                else:
                    diagnostics["force_correction_gate"] = "blocked_no_support_lift"

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
        if not self.correction and not self.candidate_correction:
            self.diagnostics["applicability_gate"] = "passed_no_executable_correction"
            return
        if support_roots and eval_roots and support_roots.isdisjoint(eval_roots):
            self.correction = {}
            self.candidate_correction = {}
            self.diagnostics["applicability_gate"] = "blocked_no_material_overlap"
            return
        self.diagnostics["applicability_gate"] = "passed"

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
            }
            for idx, _ in enumerate(predictions)
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
                "status": "not_computed_in_cell_runner",
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
