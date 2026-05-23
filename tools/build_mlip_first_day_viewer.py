#!/usr/bin/env python3
"""Build a viewer-ready first-day MLIP 5x5x3 campaign artifact.

The artifact is intentionally conservative: measured cells are read from local
MLIP runner `cell_result.json` files, while the rest of the 75-cell cube is
marked planned. This lets the viewer show the full campaign shape without
turning missing data into fake data.
"""

from __future__ import annotations

import argparse
import json
import pathlib
from datetime import datetime, timezone
from typing import Any


ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_LOCAL_ROOT = ROOT / "tmp" / "mlip-local"
DEFAULT_OUTPUT = ROOT / "atlas" / "atlas-view" / "apps" / "web" / "public" / "mlip" / "first_day_5x5x3.json"

ROWS = [
    {"id": "elastic_constants", "label": "Elastic constants"},
    {"id": "energy_volume", "label": "Energy-volume curve"},
    {"id": "forces", "label": "Force accuracy"},
    {"id": "stress", "label": "Stress accuracy"},
    {"id": "relaxation_stability", "label": "Relaxation stability"},
]
MLIPS = [
    {"id": "mace-mp-0", "label": "MACE-MP-0"},
    {"id": "chgnet", "label": "CHGNet"},
    {"id": "m3gnet", "label": "M3GNet"},
    {"id": "orb-v3", "label": "ORB-v3"},
    {"id": "sevennet", "label": "SevenNet"},
]
VARIANTS = [
    {"id": "baseline", "label": "Baseline MLIP"},
    {"id": "distill_accuracy", "label": "Distill Accuracy"},
    {"id": "distill_accuracy_accelerate", "label": "Distill Accuracy + Accelerate"},
]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def relpath(path: pathlib.Path) -> str:
    try:
        return path.resolve().relative_to(ROOT.resolve()).as_posix()
    except ValueError:
        return str(path)


def as_number(value: Any) -> float | None:
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) else None


def metric(result: dict[str, Any], name: str) -> dict[str, Any]:
    value = result.get(name)
    return value if isinstance(value, dict) else {}


def choose_interventions(runtime: dict[str, Any], result: dict[str, Any]) -> list[dict[str, Any]]:
    value = runtime.get("interventions")
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    value = result.get("interventions")
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    return []


def choose_refusals(runtime: dict[str, Any], result: dict[str, Any]) -> list[dict[str, Any]]:
    value = runtime.get("refusals")
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    value = result.get("refusals")
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    return []


def read_result(path: pathlib.Path) -> dict[str, Any] | None:
    try:
        result = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    variant_id = result.get("variant_id")
    row_id = result.get("row_id")
    mlip_id = result.get("mlip_id")
    if not all(isinstance(value, str) for value in (variant_id, row_id, mlip_id)):
        return None

    accuracy = metric(result, "accuracy")
    speed = metric(result, "speed")
    execution = metric(result, "execution")
    fixture_contract = metric(result, "fixture_contract")
    runtime = metric(result, "distill_runtime")
    leakage_guard = metric(runtime, "leakage_guard")
    interventions = choose_interventions(runtime, result)
    refusals = choose_refusals(runtime, result)
    versions = metric(result, "versions")
    theorem_hooks = metric(result, "theorem_hooks")

    return {
        "cell_id": result.get("cell_id") or f"{variant_id}:{row_id}:{mlip_id}",
        "variant_id": variant_id,
        "row_id": row_id,
        "mlip_id": mlip_id,
        "status": "measured",
        "source_kind": "local_cell_result",
        "source_path": relpath(path),
        "run_id": result.get("run_id") or result.get("campaign_id"),
        "artifact_uri": relpath(path),
        "accuracy": {
            "error": as_number(accuracy.get("error")),
            "score": as_number(accuracy.get("score")),
            "unit": accuracy.get("unit"),
            "error_unit": accuracy.get("error_unit"),
            "primary_metric": accuracy.get("primary_metric"),
            "score_tolerance": as_number(accuracy.get("score_tolerance")),
        },
        "speed": {
            "score": as_number(speed.get("score")),
            "unit": speed.get("unit"),
            "warm_inference_seconds": as_number(execution.get("warm_inference_seconds")),
            "cold_total_seconds": as_number(execution.get("cold_total_seconds")),
            "model_load_seconds": as_number(execution.get("model_load_seconds")),
        },
        "distill": {
            "enabled": bool(runtime.get("enabled")) if runtime else False,
            "profile": result.get("distill_profile") or runtime.get("profile") or "off",
            "policy_engine": runtime.get("policy_engine") or result.get("distill_policy_engine"),
            "ribbon_version": runtime.get("ribbon_version") or result.get("ribbon_version"),
            "support_manifest_hash": runtime.get("support_manifest_hash") or result.get("support_manifest_hash"),
            "leakage_passed": leakage_guard.get("passed") if leakage_guard else None,
            "intervention_count": len(interventions),
            "refusal_count": len(refusals),
            "intervention_actions": sorted({
                str(item.get("action"))
                for item in interventions
                if item.get("action") is not None
            }),
        },
        "theorem_hooks": {
            "bridge": theorem_hooks.get("bridge"),
            "kappa1_hat": theorem_hooks.get("kappa1_hat"),
            "layerwise_exact": theorem_hooks.get("layerwise_exact"),
            "p2_status": metric(theorem_hooks, "p2_residual_pca").get("status"),
        },
        "fixture_contract": {
            "fixture_id": fixture_contract.get("fixture_id"),
            "manifest_hash": fixture_contract.get("manifest_hash"),
            "release_ready": fixture_contract.get("release_ready"),
            "row_counts": fixture_contract.get("row_counts"),
        },
        "versions": {
            "python": versions.get("python"),
            "torch": versions.get("torch"),
            "cuda_available": versions.get("cuda_available"),
            "cuda_device": versions.get("cuda_device"),
            "chgnet": versions.get("chgnet"),
            "mace_torch": versions.get("mace-torch"),
            "matgl": versions.get("matgl"),
            "orb_models": versions.get("orb-models"),
            "sevenn": versions.get("sevenn"),
        },
    }


def score_time(path: pathlib.Path) -> float:
    try:
        return path.stat().st_mtime
    except OSError:
        return 0.0


def load_measured_cells(local_root: pathlib.Path) -> dict[tuple[str, str, str], dict[str, Any]]:
    cells: dict[tuple[str, str, str], dict[str, Any]] = {}
    for path in local_root.glob("*/artifacts/*/cell_result.json"):
        cell = read_result(path)
        if not cell:
            continue
        key = (cell["variant_id"], cell["row_id"], cell["mlip_id"])
        prior = cells.get(key)
        if prior is None or score_time(path) >= score_time(ROOT / str(prior.get("source_path", ""))):
            cells[key] = cell
    return cells


def planned_cell(variant_id: str, row_id: str, mlip_id: str) -> dict[str, Any]:
    return {
        "cell_id": f"{variant_id}:{row_id}:{mlip_id}",
        "variant_id": variant_id,
        "row_id": row_id,
        "mlip_id": mlip_id,
        "status": "planned",
        "source_kind": "not_run_yet",
        "accuracy": {"error": None, "score": None, "unit": None, "error_unit": None, "primary_metric": None},
        "speed": {"score": None, "unit": None, "warm_inference_seconds": None},
        "distill": {"enabled": variant_id != "baseline", "intervention_count": None, "refusal_count": None},
        "theorem_hooks": {},
        "versions": {},
    }


def build_cells(measured: dict[tuple[str, str, str], dict[str, Any]]) -> list[dict[str, Any]]:
    cells: list[dict[str, Any]] = []
    for variant in VARIANTS:
        for row in ROWS:
            for mlip in MLIPS:
                key = (variant["id"], row["id"], mlip["id"])
                cells.append(measured.get(key) or planned_cell(*key))
    return cells


def triplet_verdict(
    baseline: dict[str, Any] | None,
    accuracy: dict[str, Any] | None,
    accelerate: dict[str, Any] | None,
) -> tuple[str, str]:
    measured = [cell for cell in (baseline, accuracy, accelerate) if cell and cell.get("status") == "measured"]
    if len(measured) < 3:
        return "pending", "Need all three variant cells before scoring the triplet."
    b_error = baseline["accuracy"]["error"]
    d_error = accuracy["accuracy"]["error"]
    a_error = accelerate["accuracy"]["error"]
    b_speed = baseline["speed"]["score"]
    a_speed = accelerate["speed"]["score"]
    if not all(isinstance(v, (int, float)) for v in (b_error, d_error, a_error, b_speed, a_speed)):
        return "invalid", "Triplet is measured but missing numeric accuracy or speed."
    distill_gain = b_error - d_error
    accelerate_gain = b_error - a_error
    speed_ratio = a_speed / b_speed if b_speed > 0 else None
    if distill_gain > 0 and accelerate_gain >= -0.02 and speed_ratio and speed_ratio >= 1.1:
        return "win", "Accuracy improved and accelerate cleared the warm-speed threshold."
    if abs(distill_gain) <= 1e-6 and speed_ratio and speed_ratio < 1:
        return "needs_hill_climb", "Distill preserved accuracy but did not improve speed on this first local cell."
    if distill_gain < -0.02:
        return "regression", "Distill accuracy regressed beyond the tolerance band."
    return "mixed", "Triplet has useful signal but does not yet satisfy the publishable win condition."


def build_triplets(cells: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_key = {(cell["variant_id"], cell["row_id"], cell["mlip_id"]): cell for cell in cells}
    triplets: list[dict[str, Any]] = []
    for row in ROWS:
        for mlip in MLIPS:
            baseline = by_key.get(("baseline", row["id"], mlip["id"]))
            accuracy = by_key.get(("distill_accuracy", row["id"], mlip["id"]))
            accelerate = by_key.get(("distill_accuracy_accelerate", row["id"], mlip["id"]))
            verdict, explanation = triplet_verdict(baseline, accuracy, accelerate)
            b_error = baseline["accuracy"]["error"] if baseline else None
            d_error = accuracy["accuracy"]["error"] if accuracy else None
            a_error = accelerate["accuracy"]["error"] if accelerate else None
            b_speed = baseline["speed"]["score"] if baseline else None
            a_speed = accelerate["speed"]["score"] if accelerate else None
            triplets.append({
                "triplet_id": f"{row['id']}:{mlip['id']}",
                "row_id": row["id"],
                "mlip_id": mlip["id"],
                "verdict": verdict,
                "explanation": explanation,
                "accuracy_delta_distill": b_error - d_error if isinstance(b_error, (int, float)) and isinstance(d_error, (int, float)) else None,
                "accuracy_delta_accelerate": b_error - a_error if isinstance(b_error, (int, float)) and isinstance(a_error, (int, float)) else None,
                "speed_ratio_accelerate": a_speed / b_speed if isinstance(a_speed, (int, float)) and isinstance(b_speed, (int, float)) and b_speed > 0 else None,
            })
    return triplets


def build_artifact(local_root: pathlib.Path) -> dict[str, Any]:
    measured = load_measured_cells(local_root)
    cells = build_cells(measured)
    triplets = build_triplets(cells)
    measured_cells = [cell for cell in cells if cell["status"] == "measured"]
    measured_triplets = [
        triplet for triplet in triplets
        if all(
            any(
                cell["variant_id"] == variant["id"]
                and cell["row_id"] == triplet["row_id"]
                and cell["mlip_id"] == triplet["mlip_id"]
                and cell["status"] == "measured"
                for cell in cells
            )
            for variant in VARIANTS
        )
    ]
    cuda_devices = sorted({
        str(cell.get("versions", {}).get("cuda_device"))
        for cell in measured_cells
        if cell.get("versions", {}).get("cuda_device")
    })
    fixture_hashes = sorted({
        str(cell.get("fixture_contract", {}).get("manifest_hash"))
        for cell in measured_cells
        if cell.get("fixture_contract", {}).get("manifest_hash")
    })
    return {
        "schema": "lupine.mlip.first_day_5x5x3.v1",
        "generated_at": utc_now(),
        "title": "MLIP 5x5x3 first-day campaign view",
        "axes": {"rows": ROWS, "mlips": MLIPS, "variants": VARIANTS},
        "summary": {
            "cells_total": len(cells),
            "cells_measured": len(measured_cells),
            "cells_planned": len(cells) - len(measured_cells),
            "triplets_total": len(triplets),
            "triplets_measured": len(measured_triplets),
            "local_root": relpath(local_root),
            "cuda_devices": cuda_devices,
            "fixture_manifest_hashes": fixture_hashes,
            "acceptance_thresholds": {
                "accuracy_accelerate_max_normalized_accuracy_loss": 0.02,
                "accuracy_accelerate_min_speedup": 1.10,
            },
        },
        "day_one_read": [
            "The end-to-end path is alive for CHGNet energy-volume on the local CUDA machine.",
            "The Rust Distill ribbon is active and leakage guard passed; the first conservative policy blocked large residual corrections instead of forcing a risky accuracy claim.",
            "Accuracy is preserved on the current measured triplet, but acceleration has not beaten baseline warm speed yet. That is the next hill-climb target.",
        ],
        "cells": cells,
        "triplets": triplets,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--local-root", type=pathlib.Path, default=DEFAULT_LOCAL_ROOT)
    parser.add_argument("--output", type=pathlib.Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    artifact = build_artifact(args.local_root)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(artifact, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {args.output} ({artifact['summary']['cells_measured']}/{artifact['summary']['cells_total']} measured)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
