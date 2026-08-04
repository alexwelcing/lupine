#!/usr/bin/env python3
"""Replay completed MLIP evidence cells through a local Distill policy engine.

This is an offline promotion guard: it does not claim cloud execution for a new
policy image. It reuses completed cloud artifacts, runs their stored
predictions through the local Rust policy binary, and rescans row metrics before
we spend on a Cloud Run rerun.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
TOOLS_DIR = ROOT / "tools"
RUNNER_DIR = ROOT / "gcp" / "mlip-cell-runner"
RUNTIME_DIR = ROOT / "python"
for path in [TOOLS_DIR, RUNNER_DIR, RUNTIME_DIR]:
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

import mlip_evidence_campaign as campaign_tools  # noqa: E402
import mlip_evidence_collect as evidence_collect  # noqa: E402
from fixture_contract import evaluate_row  # noqa: E402
from lupine_distill_runtime.session import DistillSupportModel  # noqa: E402


DEFAULT_POLICY = ROOT / "gcp" / "mlip-cell-runner" / "policies" / "hyperribbon-ni-eam-support-v1-accuracy.json"
DEFAULT_ATLAS_DISTILL = ROOT / "atlas-distill" / "target" / "release" / (
    "atlas-distill.exe" if sys.platform.startswith("win") else "atlas-distill"
)
DEFAULT_OUTPUT = (
    ROOT
    / "library-site"
    / "src"
    / "reports"
    / "assets"
    / "mlip"
    / "ni-paired-accuracy-zero-point-replay-summary.json"
)
GCLOUD = shutil.which("gcloud.cmd") or shutil.which("gcloud") or "C:/gcloud/google-cloud-sdk/bin/gcloud.cmd"
ERROR_ABS_TOLERANCE = 1e-9


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def write_text_lf(path: pathlib.Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)


def load_gcs_json(url: str) -> dict[str, Any]:
    proc = subprocess.run(
        [GCLOUD, "storage", "cat", url],
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if proc.returncode != 0:
        raise RuntimeError(f"failed to read {url}: {(proc.stderr or proc.stdout).strip()}")
    payload = json.loads(proc.stdout)
    if not isinstance(payload, dict):
        raise ValueError(f"expected object JSON at {url}")
    return payload


def policy_request(
    *,
    artifact: dict[str, Any],
    cell: dict[str, Any],
    prediction: dict[str, Any],
    prediction_index: int,
    support_model: DistillSupportModel,
) -> dict[str, Any]:
    return {
        "schema": "lupine.distill.policy_request.v1",
        "ribbon_version": artifact.get("ribbon_version") or "hyperribbon-ni-eam-support-v1",
        "row_id": cell["row_id"],
        "mlip_id": cell["mlip_id"],
        "prediction": prediction,
        "support": {
            "correction": support_model.correction_evidence(),
            "diagnostics": support_model.diagnostics,
        },
        "context": {
            "profile": "accuracy",
            "run_id": artifact.get("run_id"),
            "cell_id": artifact.get("cell_id") or cell.get("cell_id"),
            "prediction_index": prediction_index,
            "ribbon_feature_distance_proxy": support_model.ribbon_feature_distance_for_prediction(prediction),
        },
    }


def run_policy_batch(
    *,
    atlas_distill: pathlib.Path,
    policy_path: pathlib.Path,
    requests: list[dict[str, Any]],
    ribbon_version: str,
) -> list[dict[str, Any]]:
    with tempfile.TemporaryDirectory(prefix="mlip-policy-replay-") as tmp:
        tmp_path = pathlib.Path(tmp)
        request_path = tmp_path / "requests.jsonl"
        output_path = tmp_path / "decisions.jsonl"
        request_path.write_text(
            "".join(json.dumps(request, sort_keys=True) + "\n" for request in requests),
            encoding="utf-8",
        )
        proc = subprocess.run(
            [
                str(atlas_distill),
                "distill-policy",
                "--request-jsonl",
                str(request_path),
                "--output",
                str(output_path),
                "--ribbon-version",
                ribbon_version,
                "--policy-limits",
                str(policy_path),
            ],
            check=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        output_text = output_path.read_text(encoding="utf-8") if output_path.exists() else proc.stdout
    if proc.returncode != 0:
        raise RuntimeError(f"atlas-distill policy replay failed: {(proc.stderr or proc.stdout).strip()}")
    decisions = [json.loads(line) for line in output_text.splitlines() if line.strip()]
    if len(decisions) != len(requests):
        raise ValueError(f"policy replay returned {len(decisions)} decisions for {len(requests)} requests")
    return decisions


def count_actions(decisions: list[dict[str, Any]]) -> tuple[dict[str, int], dict[str, int]]:
    action_counts: dict[str, int] = {}
    applied_modes: dict[str, int] = {}
    for decision in decisions:
        applied = decision.get("applied_corrections") if isinstance(decision.get("applied_corrections"), dict) else {}
        ribbon = applied.get("ribbon_residual_correction_v1") if isinstance(applied, dict) else None
        if isinstance(ribbon, dict):
            mode = str(ribbon.get("correction_mode") or "unspecified")
            applied_modes[mode] = applied_modes.get(mode, 0) + 1
        for action in decision.get("actions") or []:
            if not isinstance(action, dict):
                continue
            key = "|".join(
                [
                    str(action.get("action") or ""),
                    str(action.get("reason") or ""),
                    str(action.get("field") or ""),
                ]
            )
            action_counts[key] = action_counts.get(key, 0) + 1
    return action_counts, applied_modes


def replay_cell(
    cell: dict[str, Any],
    *,
    baseline_cell: dict[str, Any] | None,
    atlas_distill: pathlib.Path,
    policy_path: pathlib.Path,
) -> dict[str, Any]:
    artifact = load_gcs_json(evidence_collect.artifact_url(cell))
    raw_artifact = load_gcs_json(evidence_collect.artifact_url(baseline_cell)) if baseline_cell else artifact
    runtime = artifact.get("distill_runtime") if isinstance(artifact.get("distill_runtime"), dict) else {}
    support_payload = runtime.get("support_model") if isinstance(runtime.get("support_model"), dict) else {}
    support_model = DistillSupportModel(
        row_id=cell["row_id"],
        correction=support_payload.get("correction") if isinstance(support_payload.get("correction"), dict) else {},
        candidate_correction=support_payload.get("candidate_correction")
        if isinstance(support_payload.get("candidate_correction"), dict)
        else {},
        diagnostics=support_payload.get("diagnostics") if isinstance(support_payload.get("diagnostics"), dict) else {},
    )
    predictions = raw_artifact.get("predictions")
    if not isinstance(predictions, list):
        raise ValueError(f"raw artifact has no prediction list: {cell['cell_id']}")
    requests = [
        policy_request(
            artifact=artifact,
            cell=cell,
            prediction=prediction,
            prediction_index=idx,
            support_model=support_model,
        )
        for idx, prediction in enumerate(predictions)
        if isinstance(prediction, dict)
    ]
    decisions = run_policy_batch(
        atlas_distill=atlas_distill,
        policy_path=policy_path,
        requests=requests,
        ribbon_version=artifact.get("ribbon_version") or "hyperribbon-ni-eam-support-v1",
    )
    corrected = [decision["corrected_prediction"] for decision in decisions]
    row_spec = raw_artifact.get("row_spec") or artifact["row_spec"]
    score, unit, metrics = evaluate_row(cell["row_id"], corrected, row_spec)
    action_counts, applied_modes = count_actions(decisions)
    return {
        "cell_id": cell["cell_id"],
        "row_id": cell["row_id"],
        "row_label": cell.get("row_label") or evidence_collect.ROW_LABELS.get(cell["row_id"], cell["row_id"]),
        "mlip_id": cell["mlip_id"],
        "artifact_uri": evidence_collect.artifact_url(cell),
        "raw_artifact_uri": evidence_collect.artifact_url(baseline_cell) if baseline_cell else evidence_collect.artifact_url(cell),
        "checkpoint_url": cell.get("checkpoint_url"),
        "replayed_accuracy_score": score,
        "replayed_accuracy_unit": unit,
        "replayed_native_error": metrics.get("error"),
        "replayed_error_unit": metrics.get("error_unit"),
        "policy_path": str(policy_path),
        "policy_engine": "atlas-distill-local-replay",
        "action_counts": action_counts,
        "applied_modes": applied_modes,
    }


def summarize_replay(pairs: list[dict[str, Any]]) -> dict[str, Any]:
    measured = [pair for pair in pairs if isinstance(pair.get("replayed_distill_error"), (int, float))]
    improved = [pair for pair in measured if pair.get("verdict") == "distill_improved"]
    regressed = [pair for pair in measured if pair.get("verdict") == "distill_regressed"]
    unchanged = [pair for pair in measured if pair.get("verdict") == "unchanged"]
    lift_values = [pair["lift_fraction"] for pair in measured if isinstance(pair.get("lift_fraction"), (int, float))]
    failed_conditions: list[str] = []
    if len(measured) != len(pairs):
        failed_conditions.append("every replay pair must have a replayed Distill error")
    if regressed:
        failed_conditions.append("no replayed pair may regress")
    if not improved:
        failed_conditions.append("at least one replayed pair must improve")
    status = "promotable_policy_replay" if not failed_conditions else "blocked_policy_replay"
    return {
        "pairs_total": len(pairs),
        "pairs_measured": len(measured),
        "pairs_improved": len(improved),
        "pairs_regressed": len(regressed),
        "pairs_unchanged": len(unchanged),
        "mean_lift_fraction": sum(lift_values) / len(lift_values) if lift_values else None,
        "flagship_eligible": not failed_conditions,
        "status": status,
        "failed_conditions": failed_conditions,
        "next_action": (
            "use this replay as the spend gate; after the Cloud Run canary passes, scale to the full paired accuracy grid"
            if not failed_conditions
            else "do not spend cloud rerun budget until the replay gate is green"
        ),
    }


def replay(
    *,
    campaign_path: pathlib.Path,
    scope: str,
    atlas_distill: pathlib.Path,
    policy_path: pathlib.Path,
) -> dict[str, Any]:
    if not atlas_distill.exists():
        raise FileNotFoundError(f"atlas-distill binary not found: {atlas_distill}")
    campaign = campaign_tools.load_campaign(campaign_path)
    collected = evidence_collect.collect(campaign_path, scope=scope)
    baseline_by_pair = {
        (pair["row_id"], pair["mlip_id"]): pair
        for pair in collected["pairs"]
        if isinstance(pair.get("baseline_error"), (int, float))
    }
    expanded_cells = campaign_tools.expand_cells(campaign, scope=scope)
    cells_by_id = {cell["cell_id"]: cell for cell in expanded_cells}
    distill_cells = [
        cell
        for cell in expanded_cells
        if cell.get("variant_id") == "distill_accuracy"
    ]
    cells = [
        replay_cell(
            cell,
            baseline_cell=cells_by_id.get(str(cell.get("depends_on_cell_id"))),
            atlas_distill=atlas_distill,
            policy_path=policy_path,
        )
        for cell in distill_cells
    ]
    pairs: list[dict[str, Any]] = []
    for cell in cells:
        baseline = baseline_by_pair.get((cell["row_id"], cell["mlip_id"]))
        baseline_error = baseline.get("baseline_error") if baseline else None
        replayed_error = cell.get("replayed_native_error")
        error_delta = None
        lift_fraction = None
        verdict = "awaiting_pair"
        if isinstance(baseline_error, (int, float)) and isinstance(replayed_error, (int, float)):
            error_delta = baseline_error - replayed_error
            lift_fraction = error_delta / baseline_error if baseline_error else None
            if abs(error_delta) <= ERROR_ABS_TOLERANCE:
                verdict = "unchanged"
            elif error_delta > 0.0:
                verdict = "distill_improved"
            else:
                verdict = "distill_regressed"
        pairs.append(
            {
                "row_id": cell["row_id"],
                "row_label": cell["row_label"],
                "mlip_id": cell["mlip_id"],
                "baseline_error": baseline_error,
                "previous_cloud_distill_error": baseline.get("distill_error") if baseline else None,
                "replayed_distill_error": replayed_error,
                "error_delta": error_delta,
                "lift_fraction": lift_fraction,
                "verdict": verdict,
                "cell_id": cell["cell_id"],
            }
        )
    return {
        "schema": "lupine.library.mlip_policy_replay_summary.v1",
        "generated_at": utc_now(),
        "campaign_id": campaign["campaign_id"],
        "scope": scope,
        "campaign_hash": campaign_tools.evidence_summary(campaign)["campaign_hash"],
        "policy_path": str(policy_path),
        "policy_hash": campaign_tools.file_sha256(policy_path),
        "atlas_distill_bin": str(atlas_distill),
        "summary": summarize_replay(pairs),
        "pairs": pairs,
        "cells": cells,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--campaign", type=pathlib.Path, default=campaign_tools.DEFAULT_CAMPAIGN)
    parser.add_argument("--scope", choices=sorted(campaign_tools.VALID_SCOPES), default="promotion-canary")
    parser.add_argument("--atlas-distill", type=pathlib.Path, default=DEFAULT_ATLAS_DISTILL)
    parser.add_argument("--policy", type=pathlib.Path, default=DEFAULT_POLICY)
    parser.add_argument("--output", type=pathlib.Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--stdout", action="store_true")
    args = parser.parse_args(argv)

    payload = replay(
        campaign_path=args.campaign,
        scope=args.scope,
        atlas_distill=args.atlas_distill,
        policy_path=args.policy,
    )
    text = json.dumps(payload, indent=2, sort_keys=True)
    if args.stdout:
        print(text)
    write_text_lf(args.output, text + "\n")
    print(json.dumps({"status": "written", "output": str(args.output), "summary": payload["summary"]}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
