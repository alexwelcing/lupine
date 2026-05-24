#!/usr/bin/env python3
"""Build a local-to-cloud MLIP promotion packet.

The local machine is allowed to be messy and exploratory. This script turns a
completed local MLIP run directory into a clean, reproducible GCP promotion
decision: hold locally, run a bounded cloud canary, or launch the full 5x5x3
workflow through glim-think.
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

ROOT = pathlib.Path(__file__).resolve().parents[1]
BACKEND_CATALOG = ROOT / "gcp" / "mlip-cell-runner" / "backend_catalog.json"
DEFAULT_MANIFEST_URL = "gs://shed-489901-atlas-inputs/mlip-baseline/canonical-structures-v2/manifest.json"
DEFAULT_SUPPORT_MANIFEST_URL = "gs://shed-489901-atlas-inputs/mlip-baseline/canonical-distill-support-v1/manifest.json"
DEFAULT_ARTIFACT_PREFIX = "gs://shed-489901-atlas-outputs/mlip-5x5x3"
DEFAULT_WORKER_URL = "https://glim-think-v1.aw-ab5.workers.dev"
VARIANTS = ("baseline", "distill_accuracy", "distill_accuracy_accelerate")


def utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_json(path: pathlib.Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def finite_number(value: Any) -> float | None:
    if isinstance(value, (int, float)) and math.isfinite(float(value)):
        return float(value)
    return None


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
            "accuracy_metric": accuracy.get("primary_metric"),
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


def group_triplets(cells: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[tuple[str, str], dict[str, Any]] = defaultdict(dict)
    for cell in cells:
        key = (str(cell["row_id"]), str(cell["mlip_id"]))
        grouped[key][str(cell["variant_id"])] = cell
    triplets = []
    for (row_id, mlip_id), variants in sorted(grouped.items()):
        baseline = variants.get("baseline")
        distill = variants.get("distill_accuracy")
        accelerate = variants.get("distill_accuracy_accelerate")
        complete = all(isinstance(value, dict) for value in (baseline, distill, accelerate))
        b_acc = baseline.get("accuracy_score") if isinstance(baseline, dict) else None
        d_acc = distill.get("accuracy_score") if isinstance(distill, dict) else None
        a_acc = accelerate.get("accuracy_score") if isinstance(accelerate, dict) else None
        b_speed = baseline.get("speed_score") if isinstance(baseline, dict) else None
        d_speed = distill.get("speed_score") if isinstance(distill, dict) else None
        a_speed = accelerate.get("speed_score") if isinstance(accelerate, dict) else None
        triplets.append({
            "triplet_id": f"{row_id}:{mlip_id}",
            "row_id": row_id,
            "mlip_id": mlip_id,
            "complete": complete,
            "cells": {variant: variants.get(variant) for variant in VARIANTS},
            "accuracy_delta_distill": d_acc - b_acc if isinstance(d_acc, float) and isinstance(b_acc, float) else None,
            "accuracy_delta_accelerate": a_acc - b_acc if isinstance(a_acc, float) and isinstance(b_acc, float) else None,
            "accelerate_loss_vs_distill": d_acc - a_acc if isinstance(d_acc, float) and isinstance(a_acc, float) else None,
            "speedup_accelerate_vs_baseline": a_speed / b_speed if isinstance(a_speed, float) and isinstance(b_speed, float) and b_speed > 0 else None,
            "speedup_accelerate_vs_distill": a_speed / d_speed if isinstance(a_speed, float) and isinstance(d_speed, float) and d_speed > 0 else None,
        })
    return triplets


def evaluate_gate(
    triplets: list[dict[str, Any]],
    *,
    min_complete_triplets: int,
    min_accuracy_delta: float,
    min_accelerate_accuracy_delta: float,
    max_accelerate_loss: float,
    min_speedup: float,
) -> dict[str, Any]:
    complete = [triplet for triplet in triplets if triplet["complete"]]
    blockers: list[str] = []
    warnings: list[str] = []
    mean_distill_delta = mean(triplet.get("accuracy_delta_distill") for triplet in complete)
    mean_accelerate_delta = mean(triplet.get("accuracy_delta_accelerate") for triplet in complete)
    mean_accelerate_loss = mean(triplet.get("accelerate_loss_vs_distill") for triplet in complete)
    mean_speedup = mean(triplet.get("speedup_accelerate_vs_distill") for triplet in complete)

    if len(complete) < min_complete_triplets:
        blockers.append(f"needs at least {min_complete_triplets} complete local triplets; found {len(complete)}")
    if mean_distill_delta is None or mean_distill_delta < min_accuracy_delta:
        blockers.append(
            f"distill_accuracy mean delta must be >= {min_accuracy_delta:.4f}; saw {mean_distill_delta}"
        )
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
        "blockers": blockers,
        "warnings": warnings,
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
        "--args=" + ",".join(runner_args),
    ]


def shell_join(args: list[str]) -> str:
    return " ".join(f'"{arg}"' if " " in arg else arg for arg in args)


def build_cloud_canaries(
    *,
    triplets: list[dict[str, Any]],
    backends: dict[str, dict[str, Any]],
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
) -> list[dict[str, Any]]:
    ranked = sorted(
        [triplet for triplet in triplets if triplet["complete"]],
        key=lambda triplet: (
            finite_number(triplet.get("accuracy_delta_distill")) or -999.0,
            finite_number(triplet.get("accuracy_delta_accelerate")) or -999.0,
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
        for variant_id in VARIANTS:
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
    parser.add_argument("--min-complete-triplets", type=int, default=1)
    parser.add_argument("--min-accuracy-delta", type=float, default=0.0)
    parser.add_argument("--min-accelerate-accuracy-delta", type=float, default=-0.02)
    parser.add_argument("--max-accelerate-loss", type=float, default=0.02)
    parser.add_argument("--min-speedup", type=float, default=1.10)
    parser.add_argument("--canary-limit", type=int, default=3)
    parser.add_argument("--phoenix", action="store_true",
                        help="emit this promotion as an OTLP trace to Phoenix via the relay")
    parser.add_argument("--phoenix-dry-run", action="store_true",
                        help="print the Phoenix spans to the console instead of emitting")
    parser.add_argument("--phoenix-endpoint", default=None, help="relay base or .../v1/traces URL")
    parser.add_argument("--phoenix-token", default=None, help="x-relay-token shared secret")
    parser.add_argument("--phoenix-project", default=None, help="Phoenix project name")
    args = parser.parse_args(list(argv) if argv is not None else None)

    run_dir = args.run_dir.resolve()
    if not run_dir.exists():
        raise SystemExit(f"run directory not found: {run_dir}")
    cells = load_cells(run_dir)
    if not cells:
        raise SystemExit(f"no cell_result.json artifacts found under {run_dir}")
    triplets = group_triplets(cells)
    gate = evaluate_gate(
        triplets,
        min_complete_triplets=args.min_complete_triplets,
        min_accuracy_delta=args.min_accuracy_delta,
        min_accelerate_accuracy_delta=args.min_accelerate_accuracy_delta,
        max_accelerate_loss=args.max_accelerate_loss,
        min_speedup=args.min_speedup,
    )
    cloud_run_id = args.cloud_run_id or f"mlip-cloud-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
    canaries = []
    if gate["status"] == "promote_to_gcp_canary":
        canaries = build_cloud_canaries(
            triplets=triplets,
            backends=load_backend_catalog(),
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
        )
    packet = {
        "schema": "lupine.mlip.local_to_cloud_promotion.v1",
        "created_at": utc_iso(),
        "local_run_dir": str(run_dir),
        "cloud_run_id": cloud_run_id,
        "gate": gate,
        "thresholds": {
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
            "variants_seen": sorted({str(cell["variant_id"]) for cell in cells}),
            "rows_seen": sorted({str(cell["row_id"]) for cell in cells}),
            "mlips_seen": sorted({str(cell["mlip_id"]) for cell in cells}),
        },
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
