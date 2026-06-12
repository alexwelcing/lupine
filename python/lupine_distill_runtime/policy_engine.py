from __future__ import annotations

import json
import os
import pathlib
import shutil
import subprocess
import tempfile
from dataclasses import dataclass, field
from typing import Any, Protocol

import numpy as np

from .policy import RuntimePolicy


def _repo_root() -> pathlib.Path:
    return pathlib.Path(__file__).resolve().parents[2]


def _default_atlas_distill_bin() -> pathlib.Path:
    exe = "atlas-distill.exe" if os.name == "nt" else "atlas-distill"
    found = shutil.which("atlas-distill")
    if found:
        return pathlib.Path(found)
    return _repo_root() / "atlas-distill" / "target" / "debug" / exe


def jsonable(value: Any) -> Any:
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, np.ndarray):
        return jsonable(value.tolist())
    if isinstance(value, dict):
        return {str(key): jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [jsonable(item) for item in value]
    return value


@dataclass
class DistillDecision:
    corrected_prediction: dict[str, Any]
    actions: list[dict[str, Any]]
    refused: bool = False
    decision: str = "accept"
    decision_id: str | None = None
    ribbon_version: str | None = None
    policy_engine: str = "python"
    theorem_hooks: dict[str, Any] | None = None
    raw: dict[str, Any] = field(default_factory=dict)


class DistillPolicyEngine(Protocol):
    name: str

    def decide(
        self,
        *,
        row_id: str,
        mlip_id: str,
        prediction: dict[str, Any],
        support_model: Any | None,
        context: dict[str, Any] | None = None,
    ) -> DistillDecision:
        ...

    def decide_many(
        self,
        *,
        row_id: str,
        mlip_id: str,
        predictions: list[dict[str, Any]],
        support_model: Any | None,
        contexts: list[dict[str, Any]] | None = None,
    ) -> list[DistillDecision]:
        ...


def _decision_from_payload(payload: dict[str, Any], *, policy_engine: str) -> DistillDecision:
    corrected = payload.get("corrected_prediction")
    if not isinstance(corrected, dict):
        raise ValueError("distill-policy decision missing corrected_prediction object")
    actions = payload.get("actions")
    if not isinstance(actions, list):
        raise ValueError("distill-policy decision missing actions list")
    return DistillDecision(
        corrected_prediction=corrected,
        actions=[action for action in actions if isinstance(action, dict)],
        refused=bool(payload.get("refused")),
        decision=str(payload.get("decision", "accept")),
        decision_id=str(payload.get("decision_id")) if payload.get("decision_id") else None,
        ribbon_version=str(payload.get("ribbon_version")) if payload.get("ribbon_version") else None,
        policy_engine=policy_engine,
        theorem_hooks=payload.get("theorem_hooks") if isinstance(payload.get("theorem_hooks"), dict) else None,
        raw=payload,
    )


class PythonPolicyEngine:
    name = "python"

    def __init__(self, profile: str) -> None:
        self.policy = RuntimePolicy(profile)

    def decide(
        self,
        *,
        row_id: str,
        mlip_id: str,
        prediction: dict[str, Any],
        support_model: Any | None,
        context: dict[str, Any] | None = None,
    ) -> DistillDecision:
        current = prediction
        actions: list[dict[str, Any]] = []
        if support_model is not None:
            current, actions = support_model.correct_prediction(prediction)
        actions = actions + self.policy.guard_prediction(row_id, current)
        return DistillDecision(
            corrected_prediction=current,
            actions=actions,
            refused=any(action.get("action") == "refuse" for action in actions),
            decision="refuse" if any(action.get("action") == "refuse" for action in actions) else "accept",
            policy_engine=self.name,
        )

    def decide_many(
        self,
        *,
        row_id: str,
        mlip_id: str,
        predictions: list[dict[str, Any]],
        support_model: Any | None,
        contexts: list[dict[str, Any]] | None = None,
    ) -> list[DistillDecision]:
        contexts = contexts or [{} for _ in predictions]
        return [
            self.decide(
                row_id=row_id,
                mlip_id=mlip_id,
                prediction=prediction,
                support_model=support_model,
                context=contexts[idx] if idx < len(contexts) else {},
            )
            for idx, prediction in enumerate(predictions)
        ]


class RustPolicyEngine:
    name = "rust"

    def __init__(
        self,
        *,
        atlas_distill_bin: str | os.PathLike[str] | None = None,
        ribbon_version: str = "hyperribbon-v1",
        policy_limits_path: str | os.PathLike[str] | None = None,
        timeout_s: int = 30,
    ) -> None:
        configured = atlas_distill_bin or os.environ.get("ATLAS_DISTILL_BIN")
        self.atlas_distill_bin = pathlib.Path(configured) if configured else _default_atlas_distill_bin()
        self.ribbon_version = ribbon_version
        self.policy_limits_path = pathlib.Path(policy_limits_path) if policy_limits_path else None
        self.timeout_s = timeout_s

    @property
    def available(self) -> bool:
        return self.atlas_distill_bin.exists()

    def _policy_limits_args(self) -> list[str]:
        if not self.policy_limits_path:
            return []
        return ["--policy-limits", str(self.policy_limits_path)]

    def decide(
        self,
        *,
        row_id: str,
        mlip_id: str,
        prediction: dict[str, Any],
        support_model: Any | None,
        context: dict[str, Any] | None = None,
    ) -> DistillDecision:
        if not self.available:
            raise FileNotFoundError(f"atlas-distill binary not found: {self.atlas_distill_bin}")
        request = self._request(
            row_id=row_id,
            mlip_id=mlip_id,
            prediction=prediction,
            support_model=support_model,
            context=context,
        )
        with tempfile.TemporaryDirectory(prefix="lupine-distill-policy-") as tmp:
            request_path = pathlib.Path(tmp) / "request.json"
            request_path.write_text(json.dumps(request, sort_keys=True), encoding="utf-8")
            proc = subprocess.run(
                [
                    str(self.atlas_distill_bin),
                    "distill-policy",
                    "--request",
                    str(request_path),
                    "--ribbon-version",
                    self.ribbon_version,
                    *self._policy_limits_args(),
                ],
                check=False,
                capture_output=True,
                text=True,
                timeout=self.timeout_s,
            )
        if proc.returncode != 0:
            raise RuntimeError(
                "atlas-distill distill-policy failed "
                f"(exit {proc.returncode}): {(proc.stderr or proc.stdout).strip()}"
            )
        return _decision_from_payload(json.loads(proc.stdout), policy_engine=self.name)

    def decide_many(
        self,
        *,
        row_id: str,
        mlip_id: str,
        predictions: list[dict[str, Any]],
        support_model: Any | None,
        contexts: list[dict[str, Any]] | None = None,
    ) -> list[DistillDecision]:
        if not predictions:
            return []
        if not self.available:
            raise FileNotFoundError(f"atlas-distill binary not found: {self.atlas_distill_bin}")
        contexts = contexts or [{} for _ in predictions]
        requests = [
            self._request(
                row_id=row_id,
                mlip_id=mlip_id,
                prediction=prediction,
                support_model=support_model,
                context=contexts[idx] if idx < len(contexts) else {},
            )
            for idx, prediction in enumerate(predictions)
        ]
        with tempfile.TemporaryDirectory(prefix="lupine-distill-policy-batch-") as tmp:
            tmp_path = pathlib.Path(tmp)
            request_path = tmp_path / "requests.jsonl"
            output_path = tmp_path / "decisions.jsonl"
            request_path.write_text(
                "".join(json.dumps(request, sort_keys=True) + "\n" for request in requests),
                encoding="utf-8",
            )
            proc = subprocess.run(
                [
                    str(self.atlas_distill_bin),
                    "distill-policy",
                    "--request-jsonl",
                    str(request_path),
                    "--output",
                    str(output_path),
                    "--ribbon-version",
                    self.ribbon_version,
                    *self._policy_limits_args(),
                ],
                check=False,
                capture_output=True,
                text=True,
                timeout=max(self.timeout_s, self.timeout_s * len(predictions)),
            )
            output_text = output_path.read_text(encoding="utf-8") if output_path.exists() else proc.stdout
        if proc.returncode != 0:
            raise RuntimeError(
                "atlas-distill distill-policy batch failed "
                f"(exit {proc.returncode}): {(proc.stderr or proc.stdout).strip()}"
            )
        decisions = [
            _decision_from_payload(json.loads(line), policy_engine=self.name)
            for line in output_text.splitlines()
            if line.strip()
        ]
        if len(decisions) != len(predictions):
            raise ValueError(
                "distill-policy batch returned "
                f"{len(decisions)} decisions for {len(predictions)} predictions"
            )
        return decisions

    def _request(
        self,
        *,
        row_id: str,
        mlip_id: str,
        prediction: dict[str, Any],
        support_model: Any | None,
        context: dict[str, Any] | None,
    ) -> dict[str, Any]:
        return {
            "schema": "lupine.distill.policy_request.v1",
            "ribbon_version": self.ribbon_version,
            "row_id": row_id,
            "mlip_id": mlip_id,
            "prediction": jsonable(prediction),
            "support": support_evidence(support_model),
            "context": context or {},
        }


class AutoPolicyEngine:
    def __init__(
        self,
        *,
        profile: str,
        atlas_distill_bin: str | os.PathLike[str] | None = None,
        ribbon_version: str = "hyperribbon-v1",
        policy_limits_path: str | os.PathLike[str] | None = None,
    ) -> None:
        self.rust = RustPolicyEngine(
            atlas_distill_bin=atlas_distill_bin,
            ribbon_version=ribbon_version,
            policy_limits_path=policy_limits_path,
        )
        self.python = PythonPolicyEngine(profile)

    @property
    def name(self) -> str:
        return "rust" if self.rust.available else "python_fallback"

    def decide(self, **kwargs: Any) -> DistillDecision:
        if self.rust.available:
            return self.rust.decide(**kwargs)
        decision = self.python.decide(**kwargs)
        decision.policy_engine = "python_fallback"
        return decision

    def decide_many(self, **kwargs: Any) -> list[DistillDecision]:
        if self.rust.available:
            return self.rust.decide_many(**kwargs)
        decisions = self.python.decide_many(**kwargs)
        for decision in decisions:
            decision.policy_engine = "python_fallback"
        return decisions


def support_evidence(support_model: Any | None) -> dict[str, Any] | None:
    if support_model is None:
        return None
    correction = (
        support_model.correction_evidence()
        if hasattr(support_model, "correction_evidence")
        else getattr(support_model, "correction", {})
    )
    diagnostics = getattr(support_model, "diagnostics", {})
    return {
        "correction": jsonable(correction),
        "diagnostics": jsonable(diagnostics),
    }


def build_policy_engine(
    name: str,
    *,
    profile: str,
    atlas_distill_bin: str | os.PathLike[str] | None = None,
    ribbon_version: str = "hyperribbon-v1",
    policy_limits_path: str | os.PathLike[str] | None = None,
) -> DistillPolicyEngine:
    if name == "python":
        return PythonPolicyEngine(profile)
    if name == "rust":
        return RustPolicyEngine(
            atlas_distill_bin=atlas_distill_bin,
            ribbon_version=ribbon_version,
            policy_limits_path=policy_limits_path,
        )
    if name == "auto":
        return AutoPolicyEngine(
            profile=profile,
            atlas_distill_bin=atlas_distill_bin,
            ribbon_version=ribbon_version,
            policy_limits_path=policy_limits_path,
        )
    raise ValueError(f"unsupported distill policy engine: {name}")
