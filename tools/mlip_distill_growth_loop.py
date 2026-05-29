#!/usr/bin/env python3
"""Replay Distill cases through the Rust hill-climb loop.

This is deliberately local-first and Docker-free. It turns either existing
hill-climb fixture cases or local MLIP runner artifacts into a selected
PolicyLimits JSON file that can be fed back to ``mlip_local_lab.py`` or GCP.
"""

from __future__ import annotations

import argparse
import copy
import json
import os
import pathlib
import shutil
import subprocess
import sys
from collections.abc import Iterable
from datetime import datetime, timezone
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_CASES = ROOT / "atlas-distill" / "tests" / "fixtures" / "distill_hill_climb_cases.jsonl"
DEFAULT_BIN = ROOT / "atlas-distill" / "target" / "debug" / ("atlas-distill.exe" if os.name == "nt" else "atlas-distill")
DEFAULT_OUT = ROOT / "tmp" / "mlip-distill-growth"
GCLOUD = shutil.which("gcloud.cmd") or shutil.which("gcloud") or "C:/gcloud/google-cloud-sdk/bin/gcloud.cmd"

if str(ROOT / "tools") not in sys.path:
    sys.path.insert(0, str(ROOT / "tools"))

import mlip_evidence_campaign as campaign_tools  # noqa: E402
import mlip_evidence_collect as evidence_collect  # noqa: E402


def utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_json(path: pathlib.Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_gcs_json(url: str) -> dict[str, Any]:
    proc = subprocess.run(
        [GCLOUD, "storage", "cat", url],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"failed to read {url}: {(proc.stderr or proc.stdout).strip()}")
    payload = json.loads(proc.stdout)
    if not isinstance(payload, dict):
        raise ValueError(f"expected JSON object at {url}")
    return payload


def jsonl(path: pathlib.Path) -> Iterable[dict[str, Any]]:
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        value = json.loads(line)
        if isinstance(value, dict):
            yield value


def local_artifact_cases(run_dir: pathlib.Path) -> list[dict[str, Any]]:
    cases: list[dict[str, Any]] = []
    baseline_predictions: dict[tuple[str, str, str], dict[str, Any]] = {}
    for artifact_path in sorted((run_dir / "artifacts").glob("baseline_*/*cell_result.json")):
        artifact = load_json(artifact_path)
        row_id = str(artifact.get("row_id") or "")
        mlip_id = str(artifact.get("mlip_id") or "")
        predictions = artifact.get("predictions")
        if not row_id or not mlip_id or not isinstance(predictions, list):
            continue
        for prediction in predictions:
            if not isinstance(prediction, dict):
                continue
            structure_id = str(prediction.get("structure_id") or "")
            if structure_id:
                baseline_predictions[(row_id, mlip_id, structure_id)] = copy.deepcopy(prediction)
    for artifact_path in sorted((run_dir / "artifacts").glob("**/cell_result.json")):
        artifact = load_json(artifact_path)
        distill_runtime = artifact.get("distill_runtime")
        if not isinstance(distill_runtime, dict):
            continue
        support_model = distill_runtime.get("support_model")
        if not isinstance(support_model, dict):
            continue
        correction = support_model.get("correction")
        candidate = support_model.get("candidate_correction")
        if (
            isinstance(candidate, dict)
            and candidate.get("ribbon_residual_correction_v1")
        ) or not isinstance(correction, dict) or not correction:
            correction = candidate
        support = {
            "correction": correction if isinstance(correction, dict) else {},
            "diagnostics": support_model.get("diagnostics") if isinstance(support_model.get("diagnostics"), dict) else {},
        }
        predictions = artifact.get("predictions")
        if not isinstance(predictions, list):
            continue
        for idx, raw_prediction in enumerate(predictions):
            if not isinstance(raw_prediction, dict):
                continue
            reference = raw_prediction.get("reference")
            if not isinstance(reference, dict):
                continue
            baseline_key = (
                str(artifact.get("row_id") or ""),
                str(artifact.get("mlip_id") or ""),
                str(raw_prediction.get("structure_id") or ""),
            )
            prediction = copy.deepcopy(baseline_predictions.get(baseline_key, raw_prediction))
            prediction.pop("reference", None)
            prediction.pop("distill", None)
            cases.append({
                "schema": "lupine.distill.hill_climb_case.v1",
                "case_id": f"{artifact.get('cell_id', artifact_path.parent.name)}:{idx}",
                "group_id": f"{artifact.get('row_id') or ''}:{artifact.get('mlip_id') or ''}",
                "row_id": str(artifact.get("row_id") or ""),
                "mlip_id": str(artifact.get("mlip_id") or ""),
                "prediction": prediction,
                "support": support,
                "reference": reference,
                "weight": 1.0,
            })
    return [case for case in cases if case["row_id"] and case["mlip_id"]]


def support_evidence_from_artifact(artifact: dict[str, Any]) -> dict[str, Any] | None:
    distill_runtime = artifact.get("distill_runtime")
    if not isinstance(distill_runtime, dict):
        return None
    support_model = distill_runtime.get("support_model")
    if not isinstance(support_model, dict):
        return None
    correction = support_model.get("correction")
    candidate = support_model.get("candidate_correction")
    if isinstance(candidate, dict) and candidate.get("ribbon_residual_correction_v1"):
        correction = candidate
    elif not isinstance(correction, dict) or not correction:
        correction = candidate
    return {
        "correction": correction if isinstance(correction, dict) else {},
        "diagnostics": support_model.get("diagnostics") if isinstance(support_model.get("diagnostics"), dict) else {},
    }


def row_prediction_error(row_id: str, prediction: dict[str, Any], reference: dict[str, Any]) -> float:
    def scalar(field: str) -> float | None:
        predicted = prediction.get(field)
        actual = reference.get(field)
        if isinstance(predicted, (int, float)) and isinstance(actual, (int, float)):
            return abs(float(predicted) - float(actual))
        return None

    def array_rmse(field: str) -> float | None:
        try:
            import numpy as np

            predicted = np.asarray(prediction.get(field), dtype=float)
            actual = np.asarray(reference.get(field), dtype=float)
        except Exception:
            return None
        if predicted.size == 0 or predicted.shape != actual.shape:
            return None
        return float(np.sqrt(np.mean((predicted - actual) ** 2)))

    if row_id == "energy_volume":
        value = scalar("energy_ev_per_atom")
    elif row_id == "relaxation_stability":
        value = scalar("relaxed_energy_ev_per_atom")
    elif row_id in {"stress", "elastic_constants"}:
        value = array_rmse("stress_gpa")
    elif row_id == "forces":
        value = array_rmse("forces_ev_per_angstrom")
    else:
        value = None
    return float(value) if value is not None and value == value else 0.0


def case_weight(row_id: str, prediction: dict[str, Any], reference: dict[str, Any], weight_mode: str) -> float:
    if weight_mode == "uniform":
        return 1.0
    baseline_error = row_prediction_error(row_id, prediction, reference)
    if weight_mode == "baseline-error":
        return max(1.0, min(10.0, 1.0 + baseline_error))
    if weight_mode == "high-error":
        return max(1.0, min(25.0, 1.0 + 3.0 * baseline_error))
    raise ValueError(f"unsupported weight mode: {weight_mode}")


def cloud_campaign_cases(campaign_path: pathlib.Path, scope: str, weight_mode: str) -> list[dict[str, Any]]:
    campaign = campaign_tools.load_campaign(campaign_path)
    cells = campaign_tools.expand_cells(campaign, scope=scope)
    cells_by_id = {str(cell.get("cell_id")): cell for cell in cells}
    cases: list[dict[str, Any]] = []
    for cell in cells:
        if cell.get("variant_id") != "distill_accuracy":
            continue
        baseline_cell = cells_by_id.get(str(cell.get("depends_on_cell_id")))
        if not baseline_cell:
            continue
        distill_artifact = load_gcs_json(evidence_collect.artifact_url(cell))
        baseline_artifact = load_gcs_json(evidence_collect.artifact_url(baseline_cell))
        support = support_evidence_from_artifact(distill_artifact)
        if not support:
            continue
        predictions = baseline_artifact.get("predictions")
        if not isinstance(predictions, list):
            continue
        row_id = str(cell.get("row_id") or "")
        mlip_id = str(cell.get("mlip_id") or "")
        for idx, raw_prediction in enumerate(predictions):
            if not isinstance(raw_prediction, dict):
                continue
            reference = raw_prediction.get("reference")
            if not isinstance(reference, dict):
                continue
            prediction = copy.deepcopy(raw_prediction)
            prediction.pop("reference", None)
            prediction.pop("distill", None)
            cases.append({
                "schema": "lupine.distill.hill_climb_case.v1",
                "case_id": f"{cell.get('cell_id')}:{idx}",
                "group_id": f"{row_id}:{mlip_id}",
                "row_id": row_id,
                "mlip_id": mlip_id,
                "prediction": prediction,
                "support": support,
                "context": {
                    "source": "cloud_campaign_artifact",
                    "campaign_id": campaign.get("campaign_id"),
                    "scope": scope,
                    "artifact_uri": evidence_collect.artifact_url(cell),
                    "baseline_artifact_uri": evidence_collect.artifact_url(baseline_cell),
                },
                "reference": reference,
                "weight": case_weight(row_id, prediction, reference, weight_mode),
            })
    return [case for case in cases if case["row_id"] and case["mlip_id"]]


def write_cases(path: pathlib.Path, cases: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "".join(json.dumps(case, sort_keys=True) + "\n" for case in cases),
        encoding="utf-8",
    )


def case_summary(cases_path: pathlib.Path) -> dict[str, Any]:
    rows: dict[str, int] = {}
    mlips: dict[str, int] = {}
    count = 0
    for case in jsonl(cases_path):
        count += 1
        row_id = str(case.get("row_id") or "unknown")
        mlip_id = str(case.get("mlip_id") or "unknown")
        rows[row_id] = rows.get(row_id, 0) + 1
        mlips[mlip_id] = mlips.get(mlip_id, 0) + 1
    return {"count": count, "row_counts": rows, "mlip_counts": mlips}


def run_hill_climb(
    *,
    atlas_distill: pathlib.Path,
    cases: pathlib.Path,
    out_dir: pathlib.Path,
    objective: str,
    rounds: int,
    beam_width: int,
    report_top_k: int,
) -> dict[str, Any]:
    report_path = out_dir / f"{objective}_report.json"
    limits_path = out_dir / f"policy_limits_{objective}.json"
    cmd = [
        str(atlas_distill),
        "distill-hill-climb",
        "--cases",
        str(cases),
        "--objective",
        objective,
        "--rounds",
        str(rounds),
        "--beam-width",
        str(beam_width),
        "--report-top-k",
        str(report_top_k),
        "--output",
        str(report_path),
        "--selected-limits-output",
        str(limits_path),
    ]
    proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        raise RuntimeError(
            "atlas-distill distill-hill-climb failed "
            f"(exit {proc.returncode}): {(proc.stderr or proc.stdout).strip()}"
        )
    report = load_json(report_path)
    best = report.get("best_candidate") if isinstance(report, dict) else {}
    return {
        "objective": objective,
        "report_path": str(report_path),
        "selected_limits_path": str(limits_path),
        "best_candidate": best if isinstance(best, dict) else {},
    }


def promotion_label(result: dict[str, Any]) -> str:
    best = result.get("best_candidate")
    if not isinstance(best, dict):
        return "blocked"
    accuracy_delta = best.get("accuracy_delta_mean")
    group_lift = best.get("group_relative_lift_mean")
    group_regression_rate = best.get("group_regression_rate")
    refusal_rate = best.get("refusal_rate")
    blocked_rate = best.get("blocked_correction_rate")
    if (
        isinstance(accuracy_delta, (int, float))
        and isinstance(group_lift, (int, float))
        and isinstance(group_regression_rate, (int, float))
        and isinstance(refusal_rate, (int, float))
        and isinstance(blocked_rate, (int, float))
        and accuracy_delta > 0
        and group_lift > 0
        and group_regression_rate <= 0.0
        and refusal_rate <= 0.05
        and blocked_rate < 0.75
    ):
        return "candidate"
    return "hold"


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Local Distill hill-climb growth loop")
    parser.add_argument(
        "--run-dir",
        type=pathlib.Path,
        action="append",
        default=[],
        help="Local run directory to mine for Distill cases. Repeat to combine rows/backends.",
    )
    parser.add_argument(
        "--campaign",
        type=pathlib.Path,
        default=None,
        help="Evidence campaign JSON to mine from completed cloud artifacts.",
    )
    parser.add_argument("--scope", choices=sorted(campaign_tools.VALID_SCOPES), default="promotion-canary")
    parser.add_argument("--cases", type=pathlib.Path, default=None)
    parser.add_argument("--out-dir", type=pathlib.Path, default=None)
    parser.add_argument("--atlas-distill-bin", type=pathlib.Path, default=DEFAULT_BIN)
    parser.add_argument(
        "--weight-mode",
        choices=["uniform", "baseline-error", "high-error"],
        default="baseline-error",
        help="Case weighting for mined local/cloud cases. Existing --cases files keep their embedded weights.",
    )
    parser.add_argument(
        "--objective",
        choices=["accuracy", "accuracy_accelerate", "both"],
        default="accuracy",
        help="Default is accuracy-only; acceleration is an explicit second-phase objective.",
    )
    parser.add_argument("--rounds", type=int, default=3)
    parser.add_argument("--beam-width", type=int, default=4)
    parser.add_argument("--report-top-k", type=int, default=16)
    parser.add_argument("--phoenix", action="store_true", help="emit the growth-loop report to Phoenix via OTLP")
    parser.add_argument("--phoenix-dry-run", action="store_true", help="print Phoenix spans instead of exporting")
    parser.add_argument("--phoenix-endpoint", default=None, help="Phoenix OTLP relay base or .../v1/traces URL")
    parser.add_argument("--phoenix-token", default=None, help="Phoenix relay x-relay-token")
    parser.add_argument("--phoenix-project", default=None, help="Phoenix project name; defaults to glim-think")
    args = parser.parse_args(list(argv) if argv is not None else None)

    if not args.atlas_distill_bin.exists():
        raise SystemExit(f"atlas-distill binary not found: {args.atlas_distill_bin}")

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    out_dir = args.out_dir or DEFAULT_OUT / f"growth-{stamp}"
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.run_dir or args.campaign:
        cases = []
        for run_dir in args.run_dir:
            cases.extend(local_artifact_cases(run_dir))
        if args.campaign:
            cases.extend(cloud_campaign_cases(args.campaign, args.scope, args.weight_mode))
        if not cases:
            raise SystemExit("no Distill hill-climb cases found in requested local/cloud artifacts")
        cases_path = out_dir / "distill_hill_climb_cases.jsonl"
        write_cases(cases_path, cases)
        case_source = {
            "run_dirs": [str(run_dir) for run_dir in args.run_dir],
            "campaign": str(args.campaign) if args.campaign else None,
            "scope": args.scope if args.campaign else None,
            "weight_mode": args.weight_mode,
        }
    else:
        cases_path = args.cases or DEFAULT_CASES
        case_source = str(cases_path)
        if not cases_path.exists():
            raise SystemExit(f"hill-climb cases not found: {cases_path}")

    objectives = ["accuracy", "accuracy_accelerate"] if args.objective == "both" else [args.objective]
    results = [
        run_hill_climb(
            atlas_distill=args.atlas_distill_bin,
            cases=cases_path,
            out_dir=out_dir,
            objective=objective,
            rounds=args.rounds,
            beam_width=args.beam_width,
            report_top_k=args.report_top_k,
        )
        for objective in objectives
    ]
    summary = {
        "schema": "lupine.distill.growth_loop_report.v1",
        "created_at": utc_iso(),
        "case_source": case_source,
        "cases_path": str(cases_path),
        "case_summary": case_summary(cases_path),
        "atlas_distill_bin": str(args.atlas_distill_bin),
        "search": {
            "rounds": args.rounds,
            "beam_width": args.beam_width,
            "report_top_k": args.report_top_k,
        },
        "results": [
            {
                **result,
                "promotion_label": promotion_label(result),
            }
            for result in results
        ],
    }
    report_path = out_dir / "growth_report.json"
    report_path.write_text(json.dumps(summary, indent=2, sort_keys=True), encoding="utf-8")
    print(json.dumps(summary, indent=2, sort_keys=True))
    if args.phoenix or args.phoenix_dry_run or os.environ.get("PHOENIX_OTLP_RELAY_URL"):
        try:
            from mlip_phoenix_trace import emit_growth_trace

            emit_growth_trace(
                summary,
                endpoint=args.phoenix_endpoint,
                token=args.phoenix_token,
                project=args.phoenix_project,
                dry_run=args.phoenix_dry_run,
            )
        except Exception as exc:  # telemetry must never break the flywheel
            print(f"[phoenix-trace] emission failed (non-fatal): {exc}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
