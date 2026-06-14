#!/usr/bin/env python3
"""Build a local-to-cloud MLIP promotion packet.

The local machine is allowed to be messy and exploratory. This script turns a
completed local MLIP run directory into a clean, reproducible GCP promotion
decision: hold locally, run a bounded cloud canary, or launch the full 5x5x3
workflow through glim-think.

The promotion contract is energy-anchored: Distill must first improve the
energy/free-energy row, then downstream force/stress/elastic/relaxation rows
support or refute that hypothesis. Promotion deltas always mean "positive is
better"; when a physical error is available, the delta is baseline error minus
candidate error rather than raw score minus raw score.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import pathlib
import sys
from collections import defaultdict
from collections.abc import Iterable
from datetime import datetime, timezone
from typing import Any

from lupine_distill.odf.promotion_gate import evaluate_promotion

ROOT = pathlib.Path(__file__).resolve().parents[1]
BACKEND_CATALOG = ROOT / "gcp" / "mlip-cell-runner" / "backend_catalog.json"
DEFAULT_MANIFEST_URL = "gs://shed-489901-atlas-inputs/mlip-baseline/canonical-structures-v2/manifest.json"
DEFAULT_SUPPORT_MANIFEST_URL = "gs://shed-489901-atlas-inputs/mlip-baseline/canonical-distill-support-mptrj-train-plus-elastic-v1/manifest.json"
DEFAULT_ARTIFACT_PREFIX = "gs://shed-489901-atlas-outputs/mlip-5x5x3"
DEFAULT_WORKER_URL = "https://glim-think-v1.aw-ab5.workers.dev"
VARIANTS = ("baseline", "distill_accuracy", "distill_accuracy_accelerate")
VARIANT_SCOPES = {
    "accuracy": ("baseline", "distill_accuracy"),
    "accuracy_accelerate": ("baseline", "distill_accuracy", "distill_accuracy_accelerate"),
    "both": ("baseline", "distill_accuracy", "distill_accuracy_accelerate"),
}
ENERGY_ANCHOR_ROW = "energy_volume"
DOWNSTREAM_ROWS = {"forces", "stress", "elastic_constants", "relaxation_stability"}
MATERIAL_WIN_FLOORS = {
    "energy_volume": 0.001,
    "forces": 0.001,
    "stress": 0.01,
    "elastic_constants": 0.1,
    "relaxation_stability": 0.01,
}


def utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_json(path: pathlib.Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def finite_number(value: Any) -> float | None:
    if isinstance(value, (int, float)) and math.isfinite(float(value)):
        return float(value)
    return None


def finite_delta(a: Any, b: Any) -> float | None:
    a_num = finite_number(a)
    b_num = finite_number(b)
    if a_num is None or b_num is None:
        return None
    return a_num - b_num


def metric_direction(accuracy: dict[str, Any]) -> str:
    explicit = accuracy.get("metric_direction")
    if explicit in {"higher_score_is_better", "lower_error_is_better"}:
        return explicit
    if finite_number(accuracy.get("error")) is not None:
        return "lower_error_is_better"
    return "higher_score_is_better"


def improvement_delta(
    baseline: dict[str, Any] | None,
    candidate: dict[str, Any] | None,
) -> tuple[float | None, str]:
    if not isinstance(baseline, dict) or not isinstance(candidate, dict):
        return None, "missing"
    error_delta = finite_delta(baseline.get("accuracy_error"), candidate.get("accuracy_error"))
    if error_delta is not None:
        return error_delta, "primary_error_reduction"
    score_delta = finite_delta(candidate.get("accuracy_score"), baseline.get("accuracy_score"))
    if score_delta is not None:
        return score_delta, "normalized_accuracy_score_delta"
    return None, "missing"


def row_role(row_id: str) -> str:
    if row_id == ENERGY_ANCHOR_ROW:
        return "energy_anchor"
    if row_id in DOWNSTREAM_ROWS:
        return "downstream_observable"
    return "other"


def material_win_floor(row_id: str, min_accuracy_delta: float) -> float:
    return max(min_accuracy_delta, MATERIAL_WIN_FLOORS.get(row_id, min_accuracy_delta))


def is_material_win(triplet: dict[str, Any], min_accuracy_delta: float) -> bool:
    delta = finite_number(triplet.get("promotion_delta_distill"))
    if delta is None:
        return False
    return delta >= material_win_floor(str(triplet.get("row_id")), min_accuracy_delta)


def safe_id(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in "._-" else "_" for ch in value)


def load_backend_catalog(path: pathlib.Path = BACKEND_CATALOG) -> dict[str, dict[str, Any]]:
    catalog = load_json(path)
    backends = catalog.get("backends")
    if not isinstance(backends, list):
        raise ValueError(f"backend catalog has no backends: {path}")
    by_id: dict[str, dict[str, Any]] = {}
    for backend in backends:
        if isinstance(backend, dict) and isinstance(backend.get("mlip_id"), str):
            by_id[backend["mlip_id"]] = backend
    if not by_id:
        raise ValueError(f"backend catalog has no usable backends: {path}")
    return by_id


def artifact_paths(run_dir: pathlib.Path) -> Iterable[pathlib.Path]:
    artifacts = run_dir / "artifacts"
    if not artifacts.exists():
        return []
    return sorted(artifacts.glob("**/cell_result.json"))


def load_cells(run_dir: pathlib.Path) -> list[dict[str, Any]]:
    cells: list[dict[str, Any]] = []
    for path in artifact_paths(run_dir):
        artifact = load_json(path)
        if not isinstance(artifact, dict):
            continue
        accuracy = artifact.get("accuracy") if isinstance(artifact.get("accuracy"), dict) else {}
        speed = artifact.get("speed") if isinstance(artifact.get("speed"), dict) else {}
        cell = {
            "artifact_path": str(path),
            "cell_id": artifact.get("cell_id"),
            "variant_id": artifact.get("variant_id"),
            "row_id": artifact.get("row_id"),
            "mlip_id": artifact.get("mlip_id"),
            "distill_profile": artifact.get("distill_profile"),
            "distill_policy_url": artifact.get("distill_policy_url"),
            "distill_policy_hash": artifact.get("distill_policy_hash"),
            "support_manifest_hash": artifact.get("support_manifest_hash"),
            "accuracy_score": finite_number(accuracy.get("score")),
            "accuracy_error": finite_number(accuracy.get("error")),
            "accuracy_unit": accuracy.get("unit"),
            "accuracy_error_unit": accuracy.get("error_unit"),
            "accuracy_metric": accuracy.get("primary_metric"),
            "metric_direction": metric_direction(accuracy),
            "speed_score": finite_number(speed.get("score")),
            "duration_s": finite_number(artifact.get("duration_s")),
            "checkpoint": artifact.get("checkpoint") if isinstance(artifact.get("checkpoint"), dict) else None,
            "execution": artifact.get("execution") if isinstance(artifact.get("execution"), dict) else {},
            "versions": artifact.get("versions") if isinstance(artifact.get("versions"), dict) else {},
        }
        if all(isinstance(cell.get(key), str) for key in ("variant_id", "row_id", "mlip_id")):
            cells.append(cell)
    return cells


def mean(values: Iterable[float | None]) -> float | None:
    nums = [float(value) for value in values if isinstance(value, (int, float)) and math.isfinite(float(value))]
    if not nums:
        return None
    return sum(nums) / len(nums)


def group_triplets(cells: list[dict[str, Any]], required_variants: Iterable[str] = VARIANTS) -> list[dict[str, Any]]:
    required = tuple(required_variants)
    grouped: dict[tuple[str, str], dict[str, Any]] = defaultdict(dict)
    for cell in cells:
        key = (str(cell["row_id"]), str(cell["mlip_id"]))
        grouped[key][str(cell["variant_id"])] = cell
    triplets = []
    for (row_id, mlip_id), variants in sorted(grouped.items()):
        baseline = variants.get("baseline")
        distill = variants.get("distill_accuracy")
        accelerate = variants.get("distill_accuracy_accelerate")
        complete = all(isinstance(variants.get(variant), dict) for variant in required)
        b_acc = baseline.get("accuracy_score") if isinstance(baseline, dict) else None
        d_acc = distill.get("accuracy_score") if isinstance(distill, dict) else None
        a_acc = accelerate.get("accuracy_score") if isinstance(accelerate, dict) else None
        d_improvement, d_improvement_metric = improvement_delta(baseline, distill)
        a_improvement, a_improvement_metric = improvement_delta(baseline, accelerate)
        d_error_delta = finite_delta(
            baseline.get("accuracy_error") if isinstance(baseline, dict) else None,
            distill.get("accuracy_error") if isinstance(distill, dict) else None,
        )
        a_error_delta = finite_delta(
            baseline.get("accuracy_error") if isinstance(baseline, dict) else None,
            accelerate.get("accuracy_error") if isinstance(accelerate, dict) else None,
        )
        d_score_delta = finite_delta(d_acc, b_acc)
        a_score_delta = finite_delta(a_acc, b_acc)
        b_speed = baseline.get("speed_score") if isinstance(baseline, dict) else None
        d_speed = distill.get("speed_score") if isinstance(distill, dict) else None
        a_speed = accelerate.get("speed_score") if isinstance(accelerate, dict) else None
        metric_directions = sorted({
            str(cell.get("metric_direction"))
            for cell in (baseline, distill, accelerate)
            if isinstance(cell, dict) and cell.get("metric_direction")
        })
        triplets.append({
            "triplet_id": f"{row_id}:{mlip_id}",
            "row_id": row_id,
            "mlip_id": mlip_id,
            "row_role": row_role(row_id),
            "energy_anchor": row_id == ENERGY_ANCHOR_ROW,
            "complete": complete,
            "required_variants": list(required),
            "cells": {variant: variants.get(variant) for variant in VARIANTS},
            "metric_direction": metric_directions[0] if len(metric_directions) == 1 else "mixed_or_missing",
            "promotion_delta_metric": d_improvement_metric,
            "accelerate_promotion_delta_metric": a_improvement_metric,
            "accuracy_delta_distill": d_improvement,
            "accuracy_delta_accelerate": a_improvement,
            "promotion_delta_distill": d_improvement,
            "promotion_delta_accelerate": a_improvement,
            "accuracy_score_delta_distill": d_score_delta,
            "accuracy_score_delta_accelerate": a_score_delta,
            "primary_error_delta_distill": d_error_delta,
            "primary_error_delta_accelerate": a_error_delta,
            "accelerate_loss_vs_distill": d_improvement - a_improvement if isinstance(d_improvement, float) and isinstance(a_improvement, float) else None,
            "speedup_accelerate_vs_baseline": a_speed / b_speed if isinstance(a_speed, float) and isinstance(b_speed, float) and b_speed > 0 else None,
            "speedup_accelerate_vs_distill": a_speed / d_speed if isinstance(a_speed, float) and isinstance(d_speed, float) and d_speed > 0 else None,
        })
    return triplets


def evaluate_state_hypothesis(
    triplets: list[dict[str, Any]],
    *,
    min_accuracy_delta: float,
    no_harm_tolerance: float = 0.0005,
) -> dict[str, Any]:
    complete = [triplet for triplet in triplets if triplet["complete"]]
    energy = [triplet for triplet in complete if triplet["row_id"] == ENERGY_ANCHOR_ROW]
    downstream = [triplet for triplet in complete if triplet["row_id"] in DOWNSTREAM_ROWS]
    energy_delta = mean(triplet.get("promotion_delta_distill") for triplet in energy)
    downstream_regressions = [
        triplet for triplet in downstream
        if (finite_number(triplet.get("promotion_delta_distill")) or 0.0) < -no_harm_tolerance
    ]
    downstream_wins = [
        triplet for triplet in downstream
        if is_material_win(triplet, min_accuracy_delta)
    ]
    if not energy:
        verdict = "insufficient_energy_anchor"
    elif energy_delta is None or energy_delta < min_accuracy_delta:
        verdict = "energy_anchor_not_improved"
    elif downstream_regressions:
        verdict = "refuted_downstream_regression"
    elif downstream and len(downstream_wins) == len(downstream):
        verdict = "confirmed_state_lift"
    else:
        verdict = "testing_energy_anchor"
    return {
        "hypothesis_id": "distill.energy_state_lifts_lattice_observables",
        "motivation": (
            "Distill should first improve the energy/free-energy state. "
            "Forces, stress, elastic constants, and relaxation are downstream falsifiers of that state correction."
        ),
        "anchor_row_id": ENERGY_ANCHOR_ROW,
        "downstream_rows": sorted(DOWNSTREAM_ROWS),
        "verdict": verdict,
        "energy_anchor_complete": len(energy),
        "energy_anchor_mean_delta": energy_delta,
        "downstream_complete": len(downstream),
        "downstream_win_count": len(downstream_wins),
        "downstream_regression_count": len(downstream_regressions),
        "downstream_regressions": [
            {
                "triplet_id": triplet["triplet_id"],
                "row_id": triplet["row_id"],
                "mlip_id": triplet["mlip_id"],
                "promotion_delta_distill": triplet.get("promotion_delta_distill"),
            }
            for triplet in downstream_regressions
        ],
    }


def evaluate_gate(
    triplets: list[dict[str, Any]],
    *,
    objective: str,
    min_complete_triplets: int,
    min_accuracy_delta: float,
    min_accelerate_accuracy_delta: float,
    max_accelerate_loss: float,
    min_speedup: float,
    require_energy_anchor: bool,
    block_downstream_regressions: bool,
) -> dict[str, Any]:
    complete = [triplet for triplet in triplets if triplet["complete"]]
    blockers: list[str] = []
    warnings: list[str] = []
    state_hypothesis = evaluate_state_hypothesis(triplets, min_accuracy_delta=min_accuracy_delta)
    mean_distill_delta = mean(triplet.get("promotion_delta_distill") for triplet in complete)
    mean_accelerate_delta = mean(triplet.get("promotion_delta_accelerate") for triplet in complete)
    mean_accelerate_loss = mean(triplet.get("accelerate_loss_vs_distill") for triplet in complete)
    mean_speedup = mean(triplet.get("speedup_accelerate_vs_distill") for triplet in complete)

    if len(complete) < min_complete_triplets:
        blockers.append(f"needs at least {min_complete_triplets} complete local triplets; found {len(complete)}")
    if require_energy_anchor and state_hypothesis["energy_anchor_complete"] <= 0:
        blockers.append("energy_volume anchor triplet is required before promoting a Distill accuracy hypothesis")
    elif require_energy_anchor and (
        state_hypothesis["energy_anchor_mean_delta"] is None
        or state_hypothesis["energy_anchor_mean_delta"] < min_accuracy_delta
    ):
        blockers.append(
            "energy_volume anchor must improve before downstream rows can motivate a promotion; "
            f"saw {state_hypothesis['energy_anchor_mean_delta']}"
        )
    if block_downstream_regressions and state_hypothesis["downstream_regression_count"] > 0:
        blockers.append(
            "state-coupled hypothesis has downstream regressions: "
            + ", ".join(item["triplet_id"] for item in state_hypothesis["downstream_regressions"])
        )
    if mean_distill_delta is None or mean_distill_delta < min_accuracy_delta:
        blockers.append(
            f"distill_accuracy mean improvement must be >= {min_accuracy_delta:.4f}; saw {mean_distill_delta}"
        )
    if objective in {"accuracy_accelerate", "both"}:
        if mean_accelerate_delta is None or mean_accelerate_delta < min_accelerate_accuracy_delta:
            blockers.append(
                "distill_accuracy_accelerate mean delta must be "
                f">= {min_accelerate_accuracy_delta:.4f}; saw {mean_accelerate_delta}"
            )
        if mean_accelerate_loss is not None and mean_accelerate_loss > max_accelerate_loss:
            blockers.append(
                f"accelerate loss vs distill must be <= {max_accelerate_loss:.4f}; saw {mean_accelerate_loss:.4f}"
            )
        if mean_speedup is None:
            warnings.append("speedup could not be computed from complete triplets")
        elif mean_speedup < min_speedup:
            warnings.append(f"accelerate speedup is below cloud promotion target {min_speedup:.2f}x; saw {mean_speedup:.3f}x")

    return {
        "status": "promote_to_gcp_canary" if not blockers else "hold_local",
        "objective": objective,
        "blockers": blockers,
        "warnings": warnings,
        "state_hypothesis": state_hypothesis,
        "complete_triplets": len(complete),
        "mean_distill_accuracy_delta": mean_distill_delta,
        "mean_accelerate_accuracy_delta": mean_accelerate_delta,
        "mean_accelerate_loss_vs_distill": mean_accelerate_loss,
        "mean_speedup_accelerate_vs_distill": mean_speedup,
    }


def arg_pair(flag: str, value: str | None) -> list[str]:
    return [flag, value] if value else []


def gcloud_args_for_cell(
    *,
    target_job: str,
    project: str,
    region: str,
    run_id: str,
    row_id: str,
    mlip_id: str,
    variant_id: str,
    manifest_url: str,
    support_manifest_url: str | None,
    artifact_prefix: str,
    worker_url: str,
    distill_policy_url: str | None,
    checkpoint_mode: str,
) -> list[str]:
    cell_id = f"{run_id}:{variant_id}:{row_id}:{mlip_id}"
    distill_profile = {
        "baseline": "off",
        "distill_accuracy": "accuracy",
        "distill_accuracy_accelerate": "accuracy_accelerate",
    }[variant_id]
    runner_args = [
        "run-cell",
        "--run-id", run_id,
        "--campaign-id", run_id,
        "--cell-id", cell_id,
        "--row-id", row_id,
        "--mlip-id", mlip_id,
        "--variant-id", variant_id,
        "--distill-profile", distill_profile,
        "--manifest-url", manifest_url,
        "--artifact-prefix", f"{artifact_prefix.rstrip('/')}/{run_id}/{variant_id}/{row_id}/{safe_id(mlip_id)}",
        "--beat-emit-url", f"{worker_url.rstrip('/')}/feed/beats",
        "--checkpoint-mode", checkpoint_mode,
    ]
    if distill_profile != "off":
        runner_args.extend(arg_pair("--support-manifest-url", support_manifest_url))
        runner_args.extend(["--distill-policy-engine", "rust"])
        runner_args.extend(arg_pair("--distill-policy-url", distill_policy_url))
    return [
        "gcloud", "run", "jobs", "execute", target_job,
        f"--project={project}",
        f"--region={region}",
        "--wait",
        "--args=" + gcloud_escaped_list(pack_runner_args_for_gcloud(runner_args)),
    ]


def gcloud_escaped_list(values: list[str]) -> str:
    for delimiter in ("|", "~", ":"):
        if all(delimiter not in value for value in values):
            return f"^{delimiter}^" + delimiter.join(values)
    raise ValueError("could not find a safe gcloud list delimiter")


def pack_runner_args_for_gcloud(values: list[str]) -> list[str]:
    packed = []
    idx = 0
    while idx < len(values):
        value = values[idx]
        if value.startswith("--") and idx + 1 < len(values) and not values[idx + 1].startswith("--"):
            packed.append(f"{value}={values[idx + 1]}")
            idx += 2
            continue
        packed.append(value)
        idx += 1
    return packed


def shell_join(args: list[str]) -> str:
    rendered = []
    for arg in args:
        if any(ch.isspace() or ch in "',;&|<>(){}[]" for ch in arg):
            rendered.append("'" + arg.replace("'", "''") + "'")
        else:
            rendered.append(arg)
    return " ".join(rendered)


def build_cloud_canaries(
    *,
    triplets: list[dict[str, Any]],
    backends: dict[str, dict[str, Any]],
    required_variants: Iterable[str],
    project: str,
    region: str,
    cloud_run_id: str,
    manifest_url: str,
    support_manifest_url: str,
    artifact_prefix: str,
    worker_url: str,
    distill_policy_url: str | None,
    checkpoint_mode: str,
    limit: int,
    min_accuracy_delta: float,
) -> list[dict[str, Any]]:
    variants = tuple(required_variants)
    ranked = sorted(
        [
            triplet for triplet in triplets
            if triplet["complete"] and is_material_win(triplet, min_accuracy_delta)
        ],
        key=lambda triplet: (
            1 if triplet.get("energy_anchor") else 0,
            finite_number(triplet.get("promotion_delta_distill")) or -999.0,
            finite_number(triplet.get("promotion_delta_accelerate")) or -999.0,
        ),
        reverse=True,
    )
    canaries = []
    for triplet in ranked[:limit]:
        backend = backends.get(str(triplet["mlip_id"]), {})
        target_job = backend.get("target_job")
        if not isinstance(target_job, str):
            continue
        commands = {}
        for variant_id in variants:
            args = gcloud_args_for_cell(
                target_job=target_job,
                project=project,
                region=region,
                run_id=cloud_run_id,
                row_id=str(triplet["row_id"]),
                mlip_id=str(triplet["mlip_id"]),
                variant_id=variant_id,
                manifest_url=manifest_url,
                support_manifest_url=support_manifest_url,
                artifact_prefix=artifact_prefix,
                worker_url=worker_url,
                distill_policy_url=distill_policy_url,
                checkpoint_mode=checkpoint_mode,
            )
            commands[variant_id] = {"argv": args, "powershell": shell_join(args)}
        canaries.append({
            "triplet_id": triplet["triplet_id"],
            "row_id": triplet["row_id"],
            "mlip_id": triplet["mlip_id"],
            "target_job": target_job,
            "commands": commands,
        })
    return canaries


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build local MLIP promotion packet")
    parser.add_argument("--run-dir", type=pathlib.Path, required=True)
    parser.add_argument("--output", type=pathlib.Path, default=None)
    parser.add_argument("--project", default="shed-489901")
    parser.add_argument("--region", default="us-central1")
    parser.add_argument("--cloud-run-id", default=None)
    parser.add_argument("--manifest-url", default=DEFAULT_MANIFEST_URL)
    parser.add_argument("--support-manifest-url", default=DEFAULT_SUPPORT_MANIFEST_URL)
    parser.add_argument("--artifact-prefix", default=DEFAULT_ARTIFACT_PREFIX)
    parser.add_argument("--worker-url", default=DEFAULT_WORKER_URL)
    parser.add_argument("--distill-policy-url", default=None)
    parser.add_argument("--checkpoint-mode", choices=["off", "read-write", "read-only", "write-only"], default="read-write")
    parser.add_argument(
        "--objective",
        choices=sorted(VARIANT_SCOPES),
        default="accuracy",
        help="Promotion target. Default compares baseline against Distill Accuracy only; acceleration is explicit later.",
    )
    parser.add_argument("--min-complete-triplets", type=int, default=1)
    parser.add_argument("--min-accuracy-delta", type=float, default=0.0)
    parser.add_argument("--min-accelerate-accuracy-delta", type=float, default=-0.02)
    parser.add_argument("--max-accelerate-loss", type=float, default=0.02)
    parser.add_argument("--min-speedup", type=float, default=1.10)
    parser.add_argument("--allow-without-energy-anchor", action="store_true",
                        help="allow legacy score-only promotions without an energy_volume anchor")
    parser.add_argument("--allow-downstream-regressions", action="store_true",
                        help="allow cloud canaries even when downstream rows refute the energy-state lift hypothesis")
    parser.add_argument("--canary-limit", type=int, default=3)
    parser.add_argument("--model-id", default=None, help="model id for the ODF formal-verification promotion gate")
    parser.add_argument("--distill-version", type=int, default=0, help="distill version for the ODF promotion gate")
    parser.add_argument("--overall-uplift-pct", type=float, default=None, help="distill_v_uplift composite (percent) for the ODF gate")
    parser.add_argument(
        "--atlas-theorem-refs",
        nargs="*",
        default=None,
        help="ATLAS theorem refs required for auto-promote (repeatable)",
    )
    parser.add_argument(
        "--formal-properties",
        nargs="*",
        default=None,
        help="proved formal properties required for auto-promote (repeatable)",
    )
    parser.add_argument("--phoenix", action="store_true", help="emit the promotion packet to Phoenix via OTLP")
    parser.add_argument("--phoenix-dry-run", action="store_true", help="print Phoenix spans instead of exporting")
    parser.add_argument("--phoenix-endpoint", default=None, help="Phoenix OTLP relay base or .../v1/traces URL")
    parser.add_argument("--phoenix-token", default=None, help="Phoenix relay x-relay-token")
    parser.add_argument("--phoenix-project", default=None, help="Phoenix project name; defaults to glim-think")
    args = parser.parse_args(list(argv) if argv is not None else None)

    run_dir = args.run_dir.resolve()
    if not run_dir.exists():
        raise SystemExit(f"run directory not found: {run_dir}")
    cells = load_cells(run_dir)
    if not cells:
        raise SystemExit(f"no cell_result.json artifacts found under {run_dir}")
    required_variants = VARIANT_SCOPES[args.objective]
    triplets = group_triplets(cells, required_variants)
    gate = evaluate_gate(
        triplets,
        objective=args.objective,
        min_complete_triplets=args.min_complete_triplets,
        min_accuracy_delta=args.min_accuracy_delta,
        min_accelerate_accuracy_delta=args.min_accelerate_accuracy_delta,
        max_accelerate_loss=args.max_accelerate_loss,
        min_speedup=args.min_speedup,
        require_energy_anchor=not args.allow_without_energy_anchor,
        block_downstream_regressions=not args.allow_downstream_regressions,
    )

    odf_gate: dict[str, Any] | None = None
    model_id = args.model_id or run_dir.name
    if model_id:
        odf_gate = evaluate_promotion(
            {
                "model_id": model_id,
                "distill_version": args.distill_version,
                "overall_uplift_pct": args.overall_uplift_pct,
                "atlas_theorem_refs": args.atlas_theorem_refs or [],
                "formal_properties": args.formal_properties or [],
            }
        ).to_dict()
        # The formal gate must promote for auto-promotion to cloud. Anything else
        # keeps the packet local for human review.
        if odf_gate["decision"] == "reject":
            gate["status"] = "hold_local"
            gate["blockers"].append(
                f"ODF formal-verification gate rejected: {', '.join(odf_gate['reasons'])}"
            )
        elif odf_gate["decision"] == "review":
            if gate["status"] == "promote_to_gcp_canary":
                gate["status"] = "hold_local"
            gate["warnings"].append(
                f"ODF formal-verification gate requests review: {', '.join(odf_gate['reasons'])}"
            )

    cloud_run_id = args.cloud_run_id or f"mlip-cloud-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
    canaries = []
    if gate["status"] == "promote_to_gcp_canary":
        canaries = build_cloud_canaries(
            triplets=triplets,
            backends=load_backend_catalog(),
            required_variants=required_variants,
            project=args.project,
            region=args.region,
            cloud_run_id=cloud_run_id,
            manifest_url=args.manifest_url,
            support_manifest_url=args.support_manifest_url,
            artifact_prefix=args.artifact_prefix,
            worker_url=args.worker_url,
            distill_policy_url=args.distill_policy_url,
            checkpoint_mode=args.checkpoint_mode,
            limit=args.canary_limit,
            min_accuracy_delta=args.min_accuracy_delta,
        )
    packet = {
        "schema": "lupine.mlip.local_to_cloud_promotion.v1",
        "created_at": utc_iso(),
        "local_run_dir": str(run_dir),
        "cloud_run_id": cloud_run_id,
        "gate": gate,
        "odf_gate": odf_gate,
        "thresholds": {
            "objective": args.objective,
            "required_variants": list(required_variants),
            "require_energy_anchor": not args.allow_without_energy_anchor,
            "block_downstream_regressions": not args.allow_downstream_regressions,
            "min_complete_triplets": args.min_complete_triplets,
            "min_accuracy_delta": args.min_accuracy_delta,
            "min_accelerate_accuracy_delta": args.min_accelerate_accuracy_delta,
            "max_accelerate_loss": args.max_accelerate_loss,
            "min_speedup": args.min_speedup,
        },
        "cloud": {
            "project": args.project,
            "region": args.region,
            "manifest_url": args.manifest_url,
            "support_manifest_url": args.support_manifest_url,
            "artifact_prefix": args.artifact_prefix,
            "worker_url": args.worker_url,
            "distill_policy_url": args.distill_policy_url,
            "checkpoint_mode": args.checkpoint_mode,
        },
        "summary": {
            "cells": len(cells),
            "triplets": len(triplets),
            "complete_triplets": gate["complete_triplets"],
            "energy_anchor_triplets": gate["state_hypothesis"]["energy_anchor_complete"],
            "downstream_regressions": gate["state_hypothesis"]["downstream_regression_count"],
            "variants_seen": sorted({str(cell["variant_id"]) for cell in cells}),
            "rows_seen": sorted({str(cell["row_id"]) for cell in cells}),
            "mlips_seen": sorted({str(cell["mlip_id"]) for cell in cells}),
        },
        "hypothesis_motivation": gate["state_hypothesis"],
        "triplets": triplets,
        "gcp_canaries": canaries,
        "next_actions": [
            "Keep iterating locally until gate.status is promote_to_gcp_canary."
            if gate["status"] != "promote_to_gcp_canary"
            else "Run the listed GCP canary commands, inspect emitted beats, then dispatch the Cloudflare workflow.",
        ],
    }
    output = args.output or (run_dir / "promotion_packet.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(packet, indent=2, sort_keys=True), encoding="utf-8")
    print(json.dumps(packet, indent=2, sort_keys=True))
    if args.phoenix or args.phoenix_dry_run or os.environ.get("PHOENIX_OTLP_RELAY_URL"):
        try:
            from mlip_phoenix_trace import emit_promotion_trace

            emit_promotion_trace(
                packet,
                endpoint=args.phoenix_endpoint,
                token=args.phoenix_token,
                project=args.phoenix_project,
                dry_run=args.phoenix_dry_run,
            )
        except Exception as exc:  # telemetry must never break the flywheel
            print(f"[phoenix-trace] emission failed (non-fatal): {exc}", file=sys.stderr)
    return 0 if gate["status"] == "promote_to_gcp_canary" else 1


if __name__ == "__main__":
    raise SystemExit(main())
