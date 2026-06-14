#!/usr/bin/env python3
"""Emit stiff-axis/complement diagnostics for completed MLIP artifacts.

This is an offline science gate. It reuses completed cloud/local predictions,
fits the current residual ribbon diagnostic locally, and reports whether the
correction signal is concentrated off the stiff feature axis before we spend on
a projected-ribbon Cloud Run canary.
"""

from __future__ import annotations

import argparse
import hashlib
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
RUNNER_DIR = ROOT / "gcp" / "mlip-cell-runner"
RUNTIME_DIR = ROOT / "python"
for path in [TOOLS_DIR, RUNNER_DIR, RUNTIME_DIR]:
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

import mlip_evidence_campaign as campaign_tools  # noqa: E402
import mlip_evidence_collect as evidence_collect  # noqa: E402
from lupine_distill_runtime.session import DistillSupportModel  # noqa: E402


DEFAULT_CAMPAIGN = ROOT / "data" / "mlip_benchmarks" / "evidence_campaigns" / "mptrj_lane_b_paired_accuracy_v1.json"
DEFAULT_OUTPUT = (
    ROOT
    / "library-site"
    / "src"
    / "reports"
    / "assets"
    / "mlip"
    / "mptrj-spectral-v4-subspace-diagnostics.json"
)
GCLOUD = shutil.which("gcloud.cmd") or shutil.which("gcloud") or "C:/gcloud/google-cloud-sdk/bin/gcloud.cmd"
SCHEMA = "lupine.distill.subspace_diagnostic.v1"
DIAGNOSTIC_SCOPE = "completed_cloud_artifact_replay_no_training_claim"
RIBBON_VERSION = "hyperribbon-mptrj-spectral-v4"
REQUIRED_THEOREM_LANES = {
    "stiff_axis_preservation",
    "orthogonal_complement_lift",
    "projection_tube_refusal",
    "vandermonde_decay",
}
FRACTION_TOLERANCE = 1e-6


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def write_text_lf(path: pathlib.Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)


def json_sha256(payload: dict[str, Any]) -> str:
    stable = {key: value for key, value in payload.items() if key != "validation"}
    data = json.dumps(stable, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return "sha256:" + hashlib.sha256(data).hexdigest()


def finite_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and math.isfinite(float(value))


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


def load_artifact(url: str) -> dict[str, Any]:
    if url.startswith("gs://"):
        return load_gcs_json(url)
    payload = json.loads(pathlib.Path(url).read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"expected object JSON at {url}")
    return payload


def row_prefix(row_id: str) -> str:
    return {
        "energy_volume": "energy",
        "forces": "force",
        "stress": "stress",
        "elastic_constants": "stress",
        "relaxation_stability": "relaxation",
    }.get(row_id, row_id)


def diagnostic_for_cell(cell: dict[str, Any], artifact: dict[str, Any], artifact_uri: str) -> dict[str, Any]:
    predictions = [prediction for prediction in artifact.get("predictions") or [] if isinstance(prediction, dict)]
    prefix = row_prefix(str(cell["row_id"]))
    result: dict[str, Any] = {
        "row_id": cell["row_id"],
        "mlip_id": cell["mlip_id"],
        "variant_id": cell.get("variant_id"),
        "cell_id": cell.get("cell_id"),
        "artifact_uri": artifact_uri,
        "prediction_count": len(predictions),
    }
    if len(predictions) < 2:
        result["status"] = "blocked_insufficient_predictions"
        return result

    support_model = DistillSupportModel.fit(str(cell["row_id"]), predictions)
    diagnostics = support_model.diagnostics
    copied = {
        "status": diagnostics.get(f"{prefix}_subspace_status"),
        "complement_residual_fraction": diagnostics.get(f"{prefix}_complement_residual_fraction"),
        "stiff_axis_residual_fraction": diagnostics.get(f"{prefix}_stiff_axis_residual_fraction"),
        "stiff_axis_drift_fraction": diagnostics.get(f"{prefix}_stiff_axis_drift_fraction"),
        "projection_distance_proxy": diagnostics.get(f"{prefix}_projection_distance_proxy"),
        "projected_support_lift_fraction": diagnostics.get(f"{prefix}_projected_support_lift_fraction"),
        "participation_ratio": diagnostics.get(f"{prefix}_participation_ratio"),
        "singular_values": diagnostics.get(f"{prefix}_singular_values"),
        "feature_names": diagnostics.get(f"{prefix}_residual_ribbon_feature_names"),
        "theorem_development_lanes": diagnostics.get(f"{prefix}_theorem_development_lanes"),
    }
    result.update({key: value for key, value in copied.items() if value is not None})
    if "status" not in result:
        result["status"] = diagnostics.get(f"{prefix}_residual_ribbon_status") or "blocked_no_subspace_fit"
    return result


def summarize_cells(cells: list[dict[str, Any]], min_complement_fraction: float) -> dict[str, Any]:
    measured = [
        cell
        for cell in cells
        if isinstance(cell.get("complement_residual_fraction"), (int, float))
        and isinstance(cell.get("stiff_axis_residual_fraction"), (int, float))
    ]
    complement_supported = [
        cell
        for cell in measured
        if float(cell["complement_residual_fraction"]) >= min_complement_fraction
    ]
    stiff_dominated = [
        cell
        for cell in measured
        if float(cell["complement_residual_fraction"]) < min_complement_fraction
    ]
    mlips = sorted({str(cell.get("mlip_id")) for cell in measured if cell.get("mlip_id")})
    rows = sorted({str(cell.get("row_id")) for cell in measured if cell.get("row_id")})
    mean_complement = (
        sum(float(cell["complement_residual_fraction"]) for cell in measured) / len(measured)
        if measured
        else None
    )
    mean_stiff = (
        sum(float(cell["stiff_axis_residual_fraction"]) for cell in measured) / len(measured)
        if measured
        else None
    )
    row_summaries: dict[str, dict[str, Any]] = {}
    for row_id in sorted({str(cell.get("row_id")) for cell in measured}):
        row_cells = [cell for cell in measured if str(cell.get("row_id")) == row_id]
        complements = [float(cell["complement_residual_fraction"]) for cell in row_cells]
        stiff = [float(cell["stiff_axis_residual_fraction"]) for cell in row_cells]
        lifts = [
            float(cell["projected_support_lift_fraction"])
            for cell in row_cells
            if isinstance(cell.get("projected_support_lift_fraction"), (int, float))
        ]
        row_summaries[row_id] = {
            "cells_measured": len(row_cells),
            "cells_complement_supported": sum(value >= min_complement_fraction for value in complements),
            "min_complement_residual_fraction": min(complements) if complements else None,
            "mean_complement_residual_fraction": sum(complements) / len(complements) if complements else None,
            "mean_stiff_axis_residual_fraction": sum(stiff) / len(stiff) if stiff else None,
            "mean_projected_support_lift_fraction": sum(lifts) / len(lifts) if lifts else None,
            "interpretation": (
                "projected_ribbon_candidate"
                if complements and min(complements) >= min_complement_fraction
                else "mixed_or_stiff_axis_dominated"
            ),
        }
    failed_conditions: list[str] = []
    if len(measured) != len(cells):
        failed_conditions.append("all diagnostic cells must be measured before foundation is locked")
    if not complement_supported:
        failed_conditions.append("at least one cell must show complement residual concentration")
    energy = row_summaries.get("energy_volume")
    if not energy:
        failed_conditions.append("energy_volume row summary is required")
    elif energy["cells_complement_supported"] != energy["cells_measured"]:
        failed_conditions.append("energy_volume must be complement-supported for every measured MLIP")
    return {
        "claim_scope": "promotion_canary_subspace_diagnostic",
        "claim_language": (
            "energy-volume complement concentration is measured in this canary; "
            "universal manifold claims are explicitly out of scope"
        ),
        "coverage": {
            "mlip_count": len(mlips),
            "mlips": mlips,
            "calculation_type_count": len(rows),
            "calculation_types": rows,
            "surface_area": f"{len(mlips)} mlips x {len(rows)} calculation types",
        },
        "cells_total": len(cells),
        "cells_measured": len(measured),
        "cells_complement_supported": len(complement_supported),
        "cells_stiff_dominated": len(stiff_dominated),
        "min_complement_residual_fraction": min_complement_fraction,
        "mean_complement_residual_fraction": mean_complement,
        "mean_stiff_axis_residual_fraction": mean_stiff,
        "by_row": row_summaries,
        "verdict": "complement_signal_visible" if complement_supported else "blocked_no_complement_signal",
        "foundation_gate_status": "locked" if not failed_conditions else "blocked",
        "universality_gate_status": "blocked_by_surface_area",
        "failed_conditions": failed_conditions,
        "policy_claim_allowed": False,
        "cloud_canary_allowed": False,
        "universal_manifold_claim_allowed": False,
        "next_action": (
            "freeze this diagnostic contract, then run projected-ribbon replay before any Cloud Run canary"
            if not failed_conditions
            else "do not build policy or spend cloud canary budget until the foundation gate is locked"
        ),
    }


def validate_cell(cell: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    label = f"{cell.get('row_id', 'unknown')}:{cell.get('mlip_id', 'unknown')}"
    if cell.get("status") != "fit":
        errors.append(f"{label} must have status=fit")
        return errors
    for key in (
        "complement_residual_fraction",
        "stiff_axis_residual_fraction",
        "projection_distance_proxy",
        "projected_support_lift_fraction",
        "participation_ratio",
    ):
        if not finite_number(cell.get(key)):
            errors.append(f"{label} missing finite {key}")
    complement = cell.get("complement_residual_fraction")
    stiff = cell.get("stiff_axis_residual_fraction")
    if finite_number(complement) and not (0.0 <= float(complement) <= 1.0):
        errors.append(f"{label} complement_residual_fraction outside [0,1]")
    if finite_number(stiff) and not (0.0 <= float(stiff) <= 1.0):
        errors.append(f"{label} stiff_axis_residual_fraction outside [0,1]")
    if finite_number(complement) and finite_number(stiff):
        if abs((float(complement) + float(stiff)) - 1.0) > FRACTION_TOLERANCE:
            errors.append(f"{label} complement and stiff fractions must sum to 1")
    singular_values = cell.get("singular_values")
    if not isinstance(singular_values, list) or not singular_values:
        errors.append(f"{label} singular_values are required")
    elif any(not finite_number(value) or float(value) < 0.0 for value in singular_values):
        errors.append(f"{label} singular_values must be non-negative finite numbers")
    elif any(float(left) < float(right) for left, right in zip(singular_values, singular_values[1:], strict=False)):
        errors.append(f"{label} singular_values must be sorted descending")
    lanes = cell.get("theorem_development_lanes")
    if not isinstance(lanes, list):
        errors.append(f"{label} theorem_development_lanes are required")
    else:
        lane_names = {str(item.get("lane")) for item in lanes if isinstance(item, dict)}
        missing = REQUIRED_THEOREM_LANES - lane_names
        if missing:
            errors.append(f"{label} missing theorem lanes: {', '.join(sorted(missing))}")
    return errors


def validate_report(report: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    if report.get("schema") != SCHEMA:
        errors.append(f"schema must be {SCHEMA}")
    if report.get("diagnostic_scope") != DIAGNOSTIC_SCOPE:
        errors.append(f"diagnostic_scope must be {DIAGNOSTIC_SCOPE}")
    if report.get("ribbon_version") != RIBBON_VERSION:
        errors.append(f"ribbon_version must be {RIBBON_VERSION}")
    if report.get("basis_space") != "feature":
        errors.append("basis_space must be feature")
    cells = report.get("cells")
    if not isinstance(cells, list) or not cells:
        errors.append("cells must be a non-empty list")
        cells = []
    for cell in cells:
        if isinstance(cell, dict):
            errors.extend(validate_cell(cell))
        else:
            errors.append("every cell must be an object")
    summary = report.get("summary")
    if not isinstance(summary, dict):
        errors.append("summary must be an object")
        summary = {}
    else:
        if summary.get("cells_total") != len(cells):
            errors.append("summary.cells_total must match cells length")
        measured = sum(1 for cell in cells if isinstance(cell, dict) and cell.get("status") == "fit")
        if summary.get("cells_measured") != measured:
            errors.append("summary.cells_measured must match fit cell count")
        if summary.get("policy_claim_allowed") is not False:
            errors.append("summary.policy_claim_allowed must be false for diagnostic artifacts")
        if summary.get("cloud_canary_allowed") is not False:
            errors.append("summary.cloud_canary_allowed must be false until projected replay passes")
        if summary.get("universal_manifold_claim_allowed") is not False:
            errors.append("summary.universal_manifold_claim_allowed must be false for this canary surface")
        if summary.get("universality_gate_status") != "blocked_by_surface_area":
            errors.append("summary.universality_gate_status must be blocked_by_surface_area")
        coverage = summary.get("coverage")
        if not isinstance(coverage, dict):
            errors.append("summary.coverage is required")
        else:
            if coverage.get("mlip_count") != 4:
                errors.append("summary.coverage.mlip_count must document the four-MLIP canary scope")
            if coverage.get("calculation_type_count") != 2:
                errors.append("summary.coverage.calculation_type_count must document the two-row canary scope")
        by_row = summary.get("by_row")
        if not isinstance(by_row, dict) or "energy_volume" not in by_row:
            errors.append("summary.by_row.energy_volume is required")
        elif by_row["energy_volume"].get("interpretation") != "projected_ribbon_candidate":
            errors.append("energy_volume row must be a projected_ribbon_candidate")
        failed = summary.get("failed_conditions")
        if not isinstance(failed, list):
            errors.append("summary.failed_conditions must be a list")
        elif failed and summary.get("foundation_gate_status") == "locked":
            errors.append("locked foundation cannot have failed_conditions")
    return {
        "schema": "lupine.distill.subspace_diagnostic.validation.v1",
        "status": "passed" if not errors else "failed",
        "errors": errors,
        "report_hash": json_sha256(report),
    }


def build_report(
    *,
    campaign_path: pathlib.Path,
    scope: str,
    variant_id: str,
    min_complement_fraction: float,
    max_cells: int | None = None,
) -> dict[str, Any]:
    campaign = campaign_tools.load_json(campaign_path)
    campaign_hash = campaign_tools.evidence_summary(campaign)["campaign_hash"]
    cells = [
        cell
        for cell in campaign_tools.expand_cells(campaign, scope=scope)
        if cell.get("variant_id") == variant_id
    ]
    if max_cells is not None:
        cells = cells[:max_cells]
    diagnostics: list[dict[str, Any]] = []
    for cell in cells:
        url = evidence_collect.artifact_url(cell)
        try:
            artifact = load_artifact(url)
            diagnostics.append(diagnostic_for_cell(cell, artifact, url))
        except Exception as exc:  # pragma: no cover - exercised against live GCS
            diagnostics.append(
                {
                    "row_id": cell.get("row_id"),
                    "mlip_id": cell.get("mlip_id"),
                    "variant_id": cell.get("variant_id"),
                    "cell_id": cell.get("cell_id"),
                    "artifact_uri": url,
                    "status": "blocked_artifact_unavailable",
                    "error": str(exc),
                }
            )

    summary = summarize_cells(diagnostics, min_complement_fraction)
    return {
        "schema": SCHEMA,
        "generated_at": utc_now(),
        "diagnostic_scope": DIAGNOSTIC_SCOPE,
        "basis_space": "feature",
        "campaign_id": campaign.get("campaign_id"),
        "campaign_hash": campaign_hash,
        "scope": scope,
        "variant_id": variant_id,
        "ribbon_version": RIBBON_VERSION,
        "summary": summary,
        "cells": diagnostics,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--campaign", type=pathlib.Path, default=DEFAULT_CAMPAIGN)
    parser.add_argument("--scope", default="promotion-canary")
    parser.add_argument("--variant-id", default="baseline")
    parser.add_argument("--min-complement-fraction", type=float, default=0.5)
    parser.add_argument("--max-cells", type=int)
    parser.add_argument("--output", type=pathlib.Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--validate", type=pathlib.Path, help="Validate an existing subspace diagnostic JSON and exit.")
    parser.add_argument("--validate-output", type=pathlib.Path)
    parser.add_argument("--fail-on-validation-error", action="store_true")
    parser.add_argument("--stdout", action="store_true")
    args = parser.parse_args()

    if args.validate:
        payload = json.loads(args.validate.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            raise ValueError("validation input must be a JSON object")
        validation = validate_report(payload)
        text = json.dumps(validation, indent=2, sort_keys=True) + "\n"
        if args.validate_output:
            write_text_lf(args.validate_output, text)
        print(text, end="")
        return 1 if args.fail_on_validation_error and validation["status"] != "passed" else 0

    report = build_report(
        campaign_path=args.campaign,
        scope=args.scope,
        variant_id=args.variant_id,
        min_complement_fraction=args.min_complement_fraction,
        max_cells=args.max_cells,
    )
    validation = validate_report(report)
    report["validation"] = validation
    text = json.dumps(report, indent=2, sort_keys=True) + "\n"
    write_text_lf(args.output, text)
    if args.stdout:
        print(text, end="")
    else:
        print(f"wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
