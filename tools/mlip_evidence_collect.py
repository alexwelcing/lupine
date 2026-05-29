#!/usr/bin/env python3
"""Collect paired MLIP evidence campaign artifacts from GCS.

The collector is intentionally conservative: missing cloud artifacts stay
missing, failed cells stay failed, and deltas are computed only when both the
baseline and Distill Accuracy artifacts are present.
"""

from __future__ import annotations

import argparse
import json
import math
import pathlib
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
TOOLS_DIR = ROOT / "tools"
if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))

import mlip_evidence_campaign as campaign_tools  # noqa: E402


DEFAULT_OUTPUT = ROOT / "library-site" / "src" / "reports" / "assets" / "mlip" / "ni-paired-accuracy-live-summary.json"
DEFAULT_CANARY_OUTPUT = (
    ROOT
    / "library-site"
    / "src"
    / "reports"
    / "assets"
    / "mlip"
    / "ni-paired-accuracy-promotion-canary-summary.json"
)
ROW_LABELS = {
    "energy_volume": "Energy-volume",
    "forces": "Forces",
    "stress": "Stress",
    "elastic_constants": "Elastic constants",
    "relaxation_stability": "Relaxation stability",
}
GCLOUD = shutil.which("gcloud.cmd") or shutil.which("gcloud") or "C:/gcloud/google-cloud-sdk/bin/gcloud.cmd"
ERROR_ABS_TOLERANCE = 1e-9
ERROR_REL_TOLERANCE = 1e-9
ACCELERATE_ACCURACY_REL_TOLERANCE = 0.02
ACCELERATE_MIN_SPEEDUP = 1.10


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def gcloud_cat(url: str) -> dict[str, Any] | None:
    proc = subprocess.run(
        [GCLOUD, "storage", "cat", url],
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if proc.returncode != 0:
        return None
    payload = json.loads(proc.stdout)
    return payload if isinstance(payload, dict) else None


def write_text_lf(path: pathlib.Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)


def artifact_url(cell: dict[str, Any]) -> str:
    return cell["artifact_prefix"].rstrip("/") + "/cell_result.json"


def safe_get(payload: dict[str, Any] | None, *keys: str) -> Any:
    value: Any = payload
    for key in keys:
        if not isinstance(value, dict):
            return None
        value = value.get(key)
    return value


def classify_artifact_status(artifact: dict[str, Any] | None) -> str:
    if artifact is None:
        return "missing"
    explicit = artifact.get("status")
    if isinstance(explicit, str) and explicit:
        return explicit
    if artifact.get("error_class") or artifact.get("error"):
        return "failed"
    if artifact.get("schema") == "lupine.mlip.cell_artifact.v1" or isinstance(artifact.get("accuracy"), dict):
        return "completed"
    return "completed"


def collect_cell(cell: dict[str, Any]) -> dict[str, Any]:
    url = artifact_url(cell)
    artifact = gcloud_cat(url)
    status = classify_artifact_status(artifact)
    accuracy = safe_get(artifact, "accuracy", "score")
    speed = safe_get(artifact, "speed", "score")
    error = safe_get(artifact, "accuracy", "error")
    checkpoint_url = safe_get(artifact, "checkpoint", "url") or cell.get("checkpoint_url")
    result = {
        "cell_id": cell["cell_id"],
        "row_id": cell["row_id"],
        "row_label": ROW_LABELS.get(cell["row_id"], cell["row_id"]),
        "mlip_id": cell["mlip_id"],
        "target_job": cell["target_job"],
        "variant_id": cell["variant_id"],
        "status": status,
        "artifact_uri": url,
        "checkpoint_url": checkpoint_url,
        "accuracy_score": accuracy if isinstance(accuracy, (int, float)) else None,
        "speed_score": speed if isinstance(speed, (int, float)) else None,
        "native_error": error if isinstance(error, (int, float)) else None,
        "operation_name": artifact.get("operation_name") if artifact else None,
        "distill_policy_hash": artifact.get("distill_policy_hash") if artifact else cell.get("distill_policy_hash"),
        "support_manifest_hash": artifact.get("support_manifest_hash") if artifact else None,
        "accuracy_unit": safe_get(artifact, "accuracy", "unit"),
        "error_unit": safe_get(artifact, "accuracy", "error_unit"),
        "speed_unit": safe_get(artifact, "speed", "unit"),
        "events_uri": safe_get(artifact, "distill_runtime", "events_uri"),
        "error_class": artifact.get("error_class") if artifact else None,
        "error": artifact.get("error") if artifact else None,
    }
    if cell.get("depends_on_cell_id"):
        result["depends_on_cell_id"] = cell["depends_on_cell_id"]
    return result


def pair_key(cell: dict[str, Any]) -> tuple[str, str]:
    return (cell["row_id"], cell["mlip_id"])


def compute_pairs(cells: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_pair: dict[tuple[str, str], dict[str, dict[str, Any]]] = {}
    for cell in cells:
        by_pair.setdefault(pair_key(cell), {})[cell["variant_id"]] = cell
    pairs: list[dict[str, Any]] = []
    for (row_id, mlip_id), variants in sorted(by_pair.items()):
        baseline = variants.get("baseline")
        distill = variants.get("distill_accuracy")
        baseline_error = baseline.get("native_error") if baseline else None
        distill_error = distill.get("native_error") if distill else None
        delta = None
        lift_fraction = None
        verdict = "awaiting_pair"
        if isinstance(baseline_error, (int, float)) and isinstance(distill_error, (int, float)):
            delta = baseline_error - distill_error
            lift_fraction = delta / baseline_error if baseline_error else None
            if math.isclose(
                baseline_error,
                distill_error,
                rel_tol=ERROR_REL_TOLERANCE,
                abs_tol=ERROR_ABS_TOLERANCE,
            ):
                verdict = "unchanged"
            elif delta > 0:
                verdict = "distill_improved"
            else:
                verdict = "distill_regressed"
        elif baseline and baseline.get("status") == "completed" and distill and distill.get("status") == "completed":
            verdict = "completed_without_native_error"
        elif baseline and baseline.get("status") == "failed":
            verdict = "baseline_failed"
        elif distill and distill.get("status") == "failed":
            verdict = "distill_failed"
        pairs.append(
            {
                "row_id": row_id,
                "row_label": ROW_LABELS.get(row_id, row_id),
                "mlip_id": mlip_id,
                "baseline_cell_id": baseline.get("cell_id") if baseline else None,
                "distill_cell_id": distill.get("cell_id") if distill else None,
                "shared_checkpoint_url": baseline.get("checkpoint_url") if baseline else (distill.get("checkpoint_url") if distill else None),
                "baseline_error": baseline_error,
                "distill_error": distill_error,
                "error_delta": delta,
                "lift_fraction": lift_fraction,
                "verdict": verdict,
            }
        )
    return pairs


def compute_triplets(cells: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_triplet: dict[tuple[str, str], dict[str, dict[str, Any]]] = {}
    for cell in cells:
        by_triplet.setdefault(pair_key(cell), {})[cell["variant_id"]] = cell
    triplets: list[dict[str, Any]] = []
    for (row_id, mlip_id), variants in sorted(by_triplet.items()):
        baseline = variants.get("baseline")
        accuracy = variants.get("distill_accuracy")
        accelerate = variants.get("distill_accuracy_accelerate")
        baseline_error = baseline.get("native_error") if baseline else None
        accuracy_error = accuracy.get("native_error") if accuracy else None
        accelerate_error = accelerate.get("native_error") if accelerate else None
        baseline_speed = baseline.get("speed_score") if baseline else None
        accuracy_speed = accuracy.get("speed_score") if accuracy else None
        accelerate_speed = accelerate.get("speed_score") if accelerate else None
        accuracy_delta = None
        accelerate_delta = None
        accuracy_lift_fraction = None
        accelerate_lift_fraction = None
        speedup_accelerate_vs_accuracy = None
        speedup_accelerate_vs_baseline = None
        verdict = "awaiting_triplet"

        if isinstance(accelerate_speed, (int, float)) and isinstance(accuracy_speed, (int, float)) and accuracy_speed > 0:
            speedup_accelerate_vs_accuracy = accelerate_speed / accuracy_speed
        if isinstance(accelerate_speed, (int, float)) and isinstance(baseline_speed, (int, float)) and baseline_speed > 0:
            speedup_accelerate_vs_baseline = accelerate_speed / baseline_speed

        if (
            isinstance(baseline_error, (int, float))
            and isinstance(accuracy_error, (int, float))
            and isinstance(accelerate_error, (int, float))
        ):
            accuracy_delta = baseline_error - accuracy_error
            accelerate_delta = baseline_error - accelerate_error
            accuracy_lift_fraction = accuracy_delta / baseline_error if baseline_error else None
            accelerate_lift_fraction = accelerate_delta / baseline_error if baseline_error else None
            accuracy_improved = accuracy_delta > max(ERROR_ABS_TOLERANCE, abs(baseline_error) * ERROR_REL_TOLERANCE)
            accuracy_regressed = accuracy_delta < -max(ERROR_ABS_TOLERANCE, abs(baseline_error) * ERROR_REL_TOLERANCE)
            accelerate_regressed_vs_accuracy = accelerate_error > accuracy_error * (1.0 + ACCELERATE_ACCURACY_REL_TOLERANCE)
            speed_won = (
                isinstance(speedup_accelerate_vs_accuracy, (int, float))
                and speedup_accelerate_vs_accuracy >= ACCELERATE_MIN_SPEEDUP
            )
            if accuracy_regressed:
                verdict = "accuracy_regressed"
            elif accelerate_regressed_vs_accuracy:
                verdict = "accelerate_accuracy_regressed"
            elif accuracy_improved and speed_won:
                verdict = "kart_win"
            elif accuracy_improved and speedup_accelerate_vs_accuracy is None:
                verdict = "accuracy_win_speed_unmeasured"
            elif accuracy_improved:
                verdict = "accuracy_win_speed_pending"
            else:
                verdict = "accuracy_unchanged"
        elif baseline and baseline.get("status") == "failed":
            verdict = "baseline_failed"
        elif accuracy and accuracy.get("status") == "failed":
            verdict = "distill_accuracy_failed"
        elif accelerate and accelerate.get("status") == "failed":
            verdict = "distill_accuracy_accelerate_failed"

        triplets.append(
            {
                "row_id": row_id,
                "row_label": ROW_LABELS.get(row_id, row_id),
                "mlip_id": mlip_id,
                "baseline_cell_id": baseline.get("cell_id") if baseline else None,
                "distill_accuracy_cell_id": accuracy.get("cell_id") if accuracy else None,
                "distill_accuracy_accelerate_cell_id": accelerate.get("cell_id") if accelerate else None,
                "shared_checkpoint_url": baseline.get("checkpoint_url")
                if baseline
                else (accuracy.get("checkpoint_url") if accuracy else (accelerate.get("checkpoint_url") if accelerate else None)),
                "baseline_error": baseline_error,
                "distill_accuracy_error": accuracy_error,
                "distill_accuracy_accelerate_error": accelerate_error,
                "accuracy_error_delta": accuracy_delta,
                "accelerate_error_delta": accelerate_delta,
                "accuracy_lift_fraction": accuracy_lift_fraction,
                "accelerate_lift_fraction": accelerate_lift_fraction,
                "baseline_speed_score": baseline_speed,
                "distill_accuracy_speed_score": accuracy_speed,
                "distill_accuracy_accelerate_speed_score": accelerate_speed,
                "speedup_accelerate_vs_accuracy": speedup_accelerate_vs_accuracy,
                "speedup_accelerate_vs_baseline": speedup_accelerate_vs_baseline,
                "verdict": verdict,
            }
        )
    return triplets


def summarize(cells: list[dict[str, Any]], pairs: list[dict[str, Any]], triplets: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    total = len(cells)
    completed = len([cell for cell in cells if cell["status"] == "completed"])
    failed = len([cell for cell in cells if cell["status"] == "failed"])
    missing = len([cell for cell in cells if cell["status"] == "missing"])
    improved = len([pair for pair in pairs if pair["verdict"] == "distill_improved"])
    regressed = len([pair for pair in pairs if pair["verdict"] == "distill_regressed"])
    unchanged = len([pair for pair in pairs if pair["verdict"] == "unchanged"])
    measured = len([pair for pair in pairs if pair["verdict"] in {"distill_improved", "distill_regressed", "unchanged"}])
    gate = promotion_gate(
        {
            "cells_total": total,
            "cells_completed": completed,
            "cells_failed": failed,
            "cells_missing": missing,
            "pairs_total": len(pairs),
            "pairs_improved": improved,
            "pairs_regressed": regressed,
            "pairs_unchanged": unchanged,
            "pairs_measured": measured,
        },
        pairs,
    )
    payload = {
        "cells_total": total,
        "cells_completed": completed,
        "cells_failed": failed,
        "cells_missing": missing,
        "pairs_total": len(pairs),
        "pairs_improved": improved,
        "pairs_regressed": regressed,
        "pairs_unchanged": unchanged,
        "pairs_measured": measured,
        "claim_status": "complete" if completed == total else "running_or_partial",
        "promotion_gate": gate,
        "flagship_eligible": gate["flagship_eligible"],
        "campaign_verdict": gate["status"],
    }
    if triplets is not None:
        payload.update(
            {
                "triplets_total": len(triplets),
                "triplets_kart_wins": len([triplet for triplet in triplets if triplet["verdict"] == "kart_win"]),
                "triplets_accuracy_wins": len(
                    [
                        triplet
                        for triplet in triplets
                        if triplet["verdict"]
                        in {"kart_win", "accuracy_win_speed_pending", "accuracy_win_speed_unmeasured"}
                    ]
                ),
                "triplets_accelerate_accuracy_regressed": len(
                    [triplet for triplet in triplets if triplet["verdict"] == "accelerate_accuracy_regressed"]
                ),
                "triplets_awaiting": len([triplet for triplet in triplets if triplet["verdict"] == "awaiting_triplet"]),
            }
        )
    return payload


def promotion_gate(summary: dict[str, int], pairs: list[dict[str, Any]]) -> dict[str, Any]:
    failed_conditions: list[str] = []
    if summary["cells_completed"] != summary["cells_total"]:
        failed_conditions.append("all cloud cells must complete before flagship promotion")
    if summary["cells_failed"]:
        failed_conditions.append("no cloud cell may fail")
    if summary["cells_missing"]:
        failed_conditions.append("no cloud cell artifact may be missing")
    if summary["pairs_measured"] != summary["pairs_total"]:
        failed_conditions.append("every paired baseline/distill comparison must be measured")
    if summary["pairs_regressed"]:
        failed_conditions.append("no paired comparison may regress")
    if summary["pairs_improved"] == 0:
        failed_conditions.append("at least one paired comparison must improve")

    critical_regressions = [
        pair
        for pair in pairs
        if pair.get("row_id") in {"energy_volume", "relaxation_stability"}
        and pair.get("verdict") == "distill_regressed"
    ]
    if critical_regressions:
        failed_conditions.append("energy-volume and relaxation rows may not regress")

    if failed_conditions:
        status = "blocked_negative_transfer" if summary["pairs_regressed"] else "blocked_incomplete_or_no_lift"
        next_action = (
            "reject this ribbon for flagship claims; fit a material-family-aware canary and require zero regressions before rerun"
            if summary["pairs_regressed"]
            else "complete the paired canary and require at least one measured improvement before promotion"
        )
    else:
        status = "promotable_accuracy_candidate"
        next_action = "eligible for flagship review; keep acceleration separate until accuracy is locked"

    return {
        "schema": "lupine.mlip.flagship_promotion_gate.v1",
        "status": status,
        "flagship_eligible": not failed_conditions,
        "failed_conditions": failed_conditions,
        "critical_regressions": [
            {
                "row_id": pair.get("row_id"),
                "mlip_id": pair.get("mlip_id"),
                "baseline_error": pair.get("baseline_error"),
                "distill_error": pair.get("distill_error"),
                "lift_fraction": pair.get("lift_fraction"),
            }
            for pair in critical_regressions
        ],
        "next_action": next_action,
    }


def collect(campaign_path: pathlib.Path, scope: str = "full") -> dict[str, Any]:
    campaign = campaign_tools.load_campaign(campaign_path)
    cells = [collect_cell(cell) for cell in campaign_tools.expand_cells(campaign, scope=scope)]
    pairs = compute_pairs(cells)
    has_accelerate = any(cell["variant_id"] == "distill_accuracy_accelerate" for cell in cells)
    triplets = compute_triplets(cells) if has_accelerate else None
    summary = summarize(cells, pairs, triplets)
    return {
        "schema": "lupine.library.mlip_kart_race_live_summary.v1"
        if has_accelerate
        else "lupine.library.mlip_paired_accuracy_live_summary.v1",
        "generated_at": utc_now(),
        "campaign_id": campaign["campaign_id"],
        "scope": scope,
        "campaign_hash": campaign_tools.evidence_summary(campaign)["campaign_hash"],
        "profile": campaign["profile"],
        "fixture_hash": campaign_tools.evidence_summary(campaign)["fixture_hash"],
        "artifact_gcs_prefix": campaign["artifact_gcs_prefix"],
        "batch_gcs_prefix": campaign["batch_gcs_prefix"],
        "summary": summary,
        "pairs": pairs,
        "triplets": triplets or [],
        "cells": cells,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--campaign", type=pathlib.Path, default=campaign_tools.DEFAULT_CAMPAIGN)
    parser.add_argument("--scope", choices=sorted(campaign_tools.VALID_SCOPES), default="full")
    parser.add_argument("--output", type=pathlib.Path, default=None)
    parser.add_argument("--stdout", action="store_true")
    args = parser.parse_args(argv)

    output = args.output or (DEFAULT_CANARY_OUTPUT if args.scope == "promotion-canary" else DEFAULT_OUTPUT)
    payload = collect(args.campaign, scope=args.scope)
    text = json.dumps(payload, indent=2, sort_keys=True)
    if args.stdout:
        print(text)
    write_text_lf(output, text + "\n")
    print(json.dumps({"status": "written", "output": str(output), "summary": payload["summary"]}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
