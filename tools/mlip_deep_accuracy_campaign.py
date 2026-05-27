#!/usr/bin/env python3
"""Prepare and launch a checkpointed 25x2xN MLIP accuracy campaign.

The campaign scales the 5x5 MLIP grid across N sealed fixture shards and runs
two variants per cell: baseline and Distill Accuracy. It is deliberately
tranche-oriented: the plan can be uploaded, launched in small batches, inspected,
and resumed without losing completed cell artifacts.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import pathlib
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
RUNNER_DIR = ROOT / "gcp" / "mlip-cell-runner"
if str(RUNNER_DIR) not in sys.path:
    sys.path.insert(0, str(RUNNER_DIR))

import build_canonical_v2_mptrj as canonical  # noqa: E402


ROWS = ("elastic_constants", "energy_volume", "forces", "stress", "relaxation_stability")
MLIPS = ("mace-mp-0", "chgnet", "m3gnet", "orb-v3", "sevennet")
VARIANTS = ("baseline", "distill_accuracy")
TARGET_JOBS = {
    "mace-mp-0": "mlip-cell-mace",
    "chgnet": "mlip-cell-chgnet",
    "m3gnet": "mlip-cell-m3gnet",
    "orb-v3": "mlip-cell-orb",
    "sevennet": "mlip-cell-sevennet",
}
DEFAULT_SUPPORT_MANIFEST = (
    "gs://shed-489901-atlas-inputs/mlip-baseline/"
    "canonical-distill-support-mptrj-train-plus-elastic-v1/manifest.json"
)
DEFAULT_MANIFEST_INPUT_PREFIX = "gs://shed-489901-atlas-inputs/mlip-deep-accuracy"
DEFAULT_OUTPUT_PREFIX = "gs://shed-489901-atlas-outputs/mlip-deep-accuracy"
DEFAULT_WORKER_URL = "https://glim-think-v1.aw-ab5.workers.dev"
L4_LAB_HOURLY_ESTIMATE = 1.05
GCLOUD = shutil.which("gcloud.cmd") or shutil.which("gcloud") or "C:/gcloud/google-cloud-sdk/bin/gcloud.cmd"

ELASTIC_CRYSTALS = {
    "Al": "fcc",
    "Cu": "fcc",
    "Ni": "fcc",
    "Ag": "fcc",
    "Au": "fcc",
    "Pt": "fcc",
    "Pd": "fcc",
    "Pb": "fcc",
    "Fe": "bcc",
    "Cr": "bcc",
    "Mo": "bcc",
    "W": "bcc",
    "V": "bcc",
    "Nb": "bcc",
    "Ta": "bcc",
}


@dataclass(frozen=True)
class DeepPaths:
    run_id: str
    work_dir: pathlib.Path
    manifest_input_prefix: str
    output_prefix: str

    @property
    def local_manifest_dir(self) -> pathlib.Path:
        return self.work_dir / "manifests"

    @property
    def local_batch_dir(self) -> pathlib.Path:
        return self.work_dir / "batches"

    @property
    def plan_path(self) -> pathlib.Path:
        return self.work_dir / "campaign_plan.json"

    @property
    def ledger_path(self) -> pathlib.Path:
        return self.work_dir / "launch_ledger.jsonl"

    def manifest_url(self, shard_index: int) -> str:
        return f"{self.manifest_input_prefix.rstrip('/')}/{self.run_id}/manifests/shard-{shard_index:03d}.json"

    def batch_spec_url(self, batch_id: str) -> str:
        return f"{self.manifest_input_prefix.rstrip('/')}/{self.run_id}/batches/{batch_id}.json"

    def cell_artifact_prefix(self, variant: str, row: str, mlip: str, shard_index: int) -> str:
        return f"{self.output_prefix.rstrip('/')}/{self.run_id}/cells/{variant}/{row}/{mlip}/shard-{shard_index:03d}"

    def checkpoint_url(self, row: str, mlip: str, shard_index: int) -> str:
        return f"{self.output_prefix.rstrip('/')}/{self.run_id}/checkpoints/{row}/{mlip}/shard-{shard_index:03d}/cell_checkpoint.json"

    def batch_artifact_prefix(self, batch_id: str) -> str:
        return f"{self.output_prefix.rstrip('/')}/{self.run_id}/batches/{batch_id}"


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")


def stable_hash(payload: Any) -> str:
    data = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    return "sha256:" + hashlib.sha256(data).hexdigest()


def run_json(command: list[str]) -> Any:
    if command and command[0] == "gcloud":
        command = [GCLOUD, *command[1:]]
    proc = subprocess.run(command, check=True, capture_output=True, text=True)
    return json.loads(proc.stdout or "{}")


def parse_gs(url: str) -> tuple[str, str]:
    if not url.startswith("gs://"):
        raise ValueError(f"expected gs:// URL: {url}")
    bucket, _, key = url[5:].partition("/")
    if not bucket or not key:
        raise ValueError(f"invalid gs:// URL: {url}")
    return bucket, key


def cp_to_gcs(local: pathlib.Path, gs_url: str) -> None:
    subprocess.run([GCLOUD, "storage", "cp", str(local), gs_url], check=True)


def rsync_to_gcs(local_dir: pathlib.Path, gs_prefix: str) -> None:
    subprocess.run([GCLOUD, "storage", "rsync", "--recursive", str(local_dir), gs_prefix.rstrip("/")], check=True)


def mkdir_gcs_prefix(gs_url: str) -> None:
    bucket, _ = parse_gs(gs_url.rstrip("/") + "/.keep")
    subprocess.run([GCLOUD, "storage", "buckets", "describe", f"gs://{bucket}"], check=True, capture_output=True)


def elastic_reference_table() -> list[dict[str, Any]]:
    refs: dict[tuple[str, str], dict[str, Any]] = {}
    for path, crystal in [
        (ROOT / "atlas-distill" / "benchmarks" / "fcc_elastic_constants.csv", "fcc"),
        (ROOT / "atlas-distill" / "benchmarks" / "bcc_elastic_constants.csv", "bcc"),
    ]:
        with path.open(newline="", encoding="utf-8") as handle:
            for row in csv.DictReader(handle):
                material = row["material"]
                if material not in ELASTIC_CRYSTALS:
                    continue
                if ELASTIC_CRYSTALS[material] != crystal:
                    continue
                key = (material, crystal)
                refs.setdefault(key, {"material": material, "crystal": crystal, "constants": {}})
                refs[key]["constants"][row["property"]] = float(row["reference"])
    complete = [
        {
            "material": item["material"],
            "crystal": item["crystal"],
            "C11": item["constants"]["C11"],
            "C12": item["constants"]["C12"],
            "C44": item["constants"]["C44"],
        }
        for item in refs.values()
        if {"C11", "C12", "C44"}.issubset(item["constants"])
    ]
    return sorted(complete, key=lambda item: item["material"])


def elastic_cases_for_ref(ref: dict[str, Any], shard_index: int) -> list[dict[str, Any]]:
    from ase.build import bulk

    modes: list[tuple[str, Any]] = [("zero", canonical.np.zeros(6, dtype=float))]
    for mode_index, basis in enumerate(canonical.np.eye(6), start=1):
        modes.append((f"mode{mode_index}-pos", basis * 0.005))
        modes.append((f"mode{mode_index}-neg", basis * -0.005))
    cmat = canonical.cubic_stiffness(ref)
    cases: list[dict[str, Any]] = []
    atoms0 = bulk(ref["material"], ref["crystal"], cubic=True)
    cij = {"C11": ref["C11"], "C12": ref["C12"], "C44": ref["C44"]}
    for mode_label, strain_voigt in modes:
        atoms = atoms0.copy()
        deformation = canonical.np.eye(3) + canonical.strain_matrix(strain_voigt)
        atoms.set_cell(atoms.cell.array @ deformation.T, scale_atoms=True)
        stress = cmat @ strain_voigt
        cases.append(
            {
                "structure_id": f"nist-elastic-{ref['material']}-s{shard_index:03d}-{mode_label}",
                "material_id": ref["material"],
                "row_id": "elastic_constants",
                "symbols": atoms.get_chemical_symbols(),
                "positions": canonical.np.asarray(atoms.positions, dtype=float).tolist(),
                "cell": canonical.np.asarray(atoms.cell.array, dtype=float).tolist(),
                "pbc": [True, True, True],
                "strain_voigt": strain_voigt.tolist(),
                "metadata": {
                    "source": "atlas-distill NIST-derived elastic benchmark table",
                    "elastic_reference_kind": "nist_cubic_small_strain",
                    "deep_shard_index": shard_index,
                },
                "reference": {
                    "stress_gpa": stress.tolist(),
                    "elastic_constants_gpa": cij,
                },
            }
        )
    return cases


def row_chunk(rows: list[dict[str, Any]], shard_index: int, count: int, row_id: str) -> list[dict[str, Any]]:
    start = shard_index * count
    end = start + count
    if end > len(rows):
        raise RuntimeError(f"not enough {row_id} rows for shard {shard_index}: need index {end}, have {len(rows)}")
    return [canonical.mptrj_record(row, row_id, start + idx) for idx, row in enumerate(rows[start:end])]


def decode_parquetlens_value(value: Any) -> Any:
    if isinstance(value, str):
        stripped = value.strip()
        if stripped.startswith("[") or stripped.startswith("{"):
            try:
                return json.loads(stripped)
            except json.JSONDecodeError:
                return value
        try:
            if any(mark in stripped.lower() for mark in (".", "e")):
                return float(stripped)
            return int(stripped)
        except ValueError:
            return value
    return value


def load_candidate_jsonl(path: pathlib.Path, max_atoms: int) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        raw = json.loads(line)
        if not isinstance(raw, dict):
            continue
        row = {key: decode_parquetlens_value(value) for key, value in raw.items()}
        if canonical.valid_mptrj_row(row, max_atoms):
            rows.append(row)
    if not rows:
        raise RuntimeError(f"candidate JSONL produced no valid MPtrj rows: {path}")
    return rows


def build_deep_manifests(
    *,
    paths: DeepPaths,
    shards: int,
    max_atoms: int,
    max_candidates: int,
    reuse_manifest: pathlib.Path | None,
    candidate_jsonl: pathlib.Path | None,
) -> list[dict[str, Any]]:
    paths.local_manifest_dir.mkdir(parents=True, exist_ok=True)
    if reuse_manifest:
        source = json.loads(reuse_manifest.read_text(encoding="utf-8"))
        manifests = []
        for shard_index in range(shards):
            manifest = json.loads(json.dumps(source))
            manifest["fixture_id"] = f"{source.get('fixture_id', 'canonical-structures-v2')}-deep-shard-{shard_index:03d}"
            manifest.setdefault("metadata", {})
            manifest["metadata"] = {
                **manifest["metadata"],
                "deep_run_id": paths.run_id,
                "deep_shard_index": shard_index,
                "deep_manifest_mode": "reuse",
            }
            manifest["manifest_hash"] = stable_hash({k: v for k, v in manifest.items() if k != "manifest_hash"})
            out = paths.local_manifest_dir / f"shard-{shard_index:03d}.json"
            out.write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8")
            manifests.append({"shard_index": shard_index, "local_path": str(out), "gcs_url": paths.manifest_url(shard_index), "manifest_hash": manifest["manifest_hash"]})
        return manifests

    canonical.MPTRJ_SPLIT = "test"
    candidates = (
        load_candidate_jsonl(candidate_jsonl, max_atoms)[:max_candidates]
        if candidate_jsonl
        else canonical.fetch_mptrj_candidates(max_candidates, max_atoms)
    )
    force_rows = [row for row in candidates if canonical.max_force(row) > 0.05]
    stress_rows = [row for row in candidates if canonical.stress_norm(row) > 0.05]
    needed_five_case_rows = shards * 5
    if len(stress_rows) < needed_five_case_rows:
        stress_rows = sorted(candidates, key=canonical.stress_norm, reverse=True)[:needed_five_case_rows]
    if len(candidates) < needed_five_case_rows or len(force_rows) < needed_five_case_rows or len(stress_rows) < needed_five_case_rows:
        raise RuntimeError(
            "not enough MPtrj rows for deep shards "
            f"(energy={len(candidates)}, forces={len(force_rows)}, stress={len(stress_rows)}, shards={shards})"
        )
    elastic_refs = elastic_reference_table()
    if not elastic_refs:
        raise RuntimeError("no NIST-derived elastic references found")
    manifests = []
    for shard_index in range(shards):
        elastic_ref = elastic_refs[shard_index % len(elastic_refs)]
        manifest = {
            "schema": "lupine.mlip.fixture_manifest.v2",
            "fixture_id": f"canonical-structures-v2-deep-shard-{shard_index:03d}",
            "title": f"Deep MLIP Accuracy shard {shard_index:03d}",
            "description": (
                "Held-out MPtrj accuracy shard with a NIST-derived cubic elastic anchor. "
                "Designed for baseline versus Distill Accuracy comparison."
            ),
            "reference_provenance": {
                "mptrj": {
                    "dataset": canonical.MPTRJ_DATASET,
                    "config": canonical.MPTRJ_CONFIG,
                    "split": canonical.MPTRJ_SPLIT,
                    "via": "Hugging Face Dataset Viewer rows API",
                },
                "nist_elastic": {
                    "source": "atlas-distill/benchmarks fcc/bcc elastic constants",
                    "material": elastic_ref["material"],
                    "crystal": elastic_ref["crystal"],
                },
            },
            "metadata": {
                "deep_run_id": paths.run_id,
                "deep_shard_index": shard_index,
                "deep_manifest_mode": "fetch_mptrj_plus_nist_elastic",
                "max_atoms": max_atoms,
                "elastic_material": elastic_ref["material"],
                "elastic_crystal": elastic_ref["crystal"],
            },
            "row_specs": {
                "energy_volume": {"min_cases": 5, "error_tolerance": 0.10, "error_unit": "ev_per_atom_mae"},
                "forces": {"min_cases": 5, "error_tolerance": 0.20, "error_unit": "ev_per_angstrom_rmse"},
                "stress": {"min_cases": 5, "error_tolerance": 5.0, "error_unit": "gpa_mae"},
                "elastic_constants": {"min_cases": 6, "error_tolerance": 50.0, "error_unit": "gpa_mae"},
                "relaxation_stability": {
                    "min_cases": 3,
                    "force_threshold": 0.05,
                    "max_steps": 200,
                    "error_tolerance": 0.10,
                    "error_unit": "relaxation_penalty",
                },
            },
            "row_fixtures": {
                "energy_volume": {"structures": row_chunk(candidates, shard_index, 5, "energy_volume")},
                "forces": {"structures": row_chunk(force_rows, shard_index, 5, "forces")},
                "stress": {"structures": row_chunk(stress_rows, shard_index, 5, "stress")},
                "relaxation_stability": {"structures": row_chunk(force_rows + candidates, shard_index, 3, "relaxation_stability")},
                "elastic_constants": {"structures": elastic_cases_for_ref(elastic_ref, shard_index)},
            },
        }
        manifest["manifest_hash"] = stable_hash(manifest)
        out = paths.local_manifest_dir / f"shard-{shard_index:03d}.json"
        out.write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8")
        manifests.append({"shard_index": shard_index, "local_path": str(out), "gcs_url": paths.manifest_url(shard_index), "manifest_hash": manifest["manifest_hash"]})
    return manifests


def cell_id(run_id: str, variant: str, row: str, mlip: str, shard_index: int) -> str:
    return f"{run_id}:{variant}:{row}:{mlip}:shard-{shard_index:03d}"


def build_batch_specs(
    *,
    paths: DeepPaths,
    shards: int,
    batch_size: int,
    support_manifest_url: str,
    worker_url: str,
    checkpoint_mode: str,
    distill_policy_engine: str,
    ribbon_version: str,
) -> list[dict[str, Any]]:
    paths.local_batch_dir.mkdir(parents=True, exist_ok=True)
    batches: list[dict[str, Any]] = []
    for mlip in MLIPS:
        for variant in VARIANTS:
            for row in ROWS:
                for start in range(0, shards, batch_size):
                    end = min(start + batch_size, shards)
                    batch_id = f"{paths.run_id}-{variant}-{row}-{mlip}-s{start:03d}-{end - 1:03d}".replace("_", "-")
                    cells = []
                    for shard_index in range(start, end):
                        cell = {
                            "cell_id": cell_id(paths.run_id, variant, row, mlip, shard_index),
                            "row_id": row,
                            "mlip_id": mlip,
                            "variant_id": variant,
                            "distill_profile": "off" if variant == "baseline" else "accuracy",
                            "manifest_url": paths.manifest_url(shard_index),
                            "fixture_url": paths.manifest_url(shard_index),
                            "artifact_prefix": paths.cell_artifact_prefix(variant, row, mlip, shard_index),
                            "checkpoint_url": paths.checkpoint_url(row, mlip, shard_index),
                            "checkpoint_mode": checkpoint_mode,
                        }
                        if variant != "baseline":
                            cell["support_manifest_url"] = support_manifest_url
                            cell["distill_policy_engine"] = distill_policy_engine
                            cell["ribbon_version"] = ribbon_version
                        cells.append(cell)
                    spec = {
                        "schema": "lupine.mlip.batch_spec.v1",
                        "batch_id": batch_id,
                        "run_id": paths.run_id,
                        "campaign_id": paths.run_id,
                        "profile": "lab-gcp-gpu-deep-accuracy",
                        "fixture_id": "canonical-structures-v2-deep-sharded",
                        "mlip_id": mlip,
                        "variant_id": variant,
                        "row_id": row,
                        "target_job": TARGET_JOBS[mlip],
                        "shard_start": start,
                        "shard_end": end - 1,
                        "batch_artifact_prefix": paths.batch_artifact_prefix(batch_id),
                        "defaults": {
                            "beat_emit_url": f"{worker_url.rstrip('/')}/feed/beats",
                            "checkpoint_mode": checkpoint_mode,
                        },
                        "cells": cells,
                    }
                    local_path = paths.local_batch_dir / f"{batch_id}.json"
                    local_path.write_text(json.dumps(spec, indent=2, sort_keys=True), encoding="utf-8")
                    batches.append({
                        "batch_id": batch_id,
                        "target_job": TARGET_JOBS[mlip],
                        "mlip_id": mlip,
                        "variant_id": variant,
                        "row_id": row,
                        "shard_start": start,
                        "shard_end": end - 1,
                        "cells": len(cells),
                        "local_path": str(local_path),
                        "gcs_url": paths.batch_spec_url(batch_id),
                    })
    return batches


def estimate_cost(batches: int, estimated_batch_seconds: float, hourly_rate: float) -> dict[str, Any]:
    gpu_hours = batches * estimated_batch_seconds / 3600.0
    return {
        "schema": "lupine.mlip.deep_accuracy_cost_estimate.v1",
        "estimated_batch_seconds": estimated_batch_seconds,
        "estimated_gpu_hours": gpu_hours,
        "l4_lab_hourly_rate_usd": hourly_rate,
        "estimated_compute_usd": gpu_hours * hourly_rate,
    }


def write_plan(args: argparse.Namespace, paths: DeepPaths, manifests: list[dict[str, Any]], batches: list[dict[str, Any]]) -> dict[str, Any]:
    cost = estimate_cost(len(batches), args.estimated_batch_seconds, args.l4_hourly_estimate)
    cells_total = args.shards * len(ROWS) * len(MLIPS) * len(VARIANTS)
    plan = {
        "schema": "lupine.mlip.deep_accuracy_campaign_plan.v1",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "run_id": paths.run_id,
        "objective": "baseline_vs_distill_accuracy",
        "cells_total": cells_total,
        "batches_total": len(batches),
        "shards": args.shards,
        "rows": list(ROWS),
        "mlips": list(MLIPS),
        "variants": list(VARIANTS),
        "batch_size": args.batch_size,
        "max_active_gpu_jobs": args.max_active_gpu_jobs,
        "budget_ceiling_usd": args.budget_ceiling_usd,
        "budget_gate": "pass" if cost["estimated_compute_usd"] <= args.budget_ceiling_usd else "fail",
        "cost_estimate": cost,
        "gcp": {
            "project": args.project,
            "region": args.region,
            "observed_l4_quota": args.observed_l4_quota,
            "worker_url": args.worker_url,
        },
        "support_manifest_url": args.support_manifest_url,
        "checkpoint_mode": args.checkpoint_mode,
        "manifest_input_prefix": paths.manifest_input_prefix,
        "output_prefix": paths.output_prefix,
        "manifests": manifests,
        "batches": batches,
        "launch_policy": {
            "tranche_order": "mlip_then_variant_then_row_then_shard_range",
            "return_success_on_partial_batch": True,
            "resume_key": "batch_id",
            "partial_progress_contract": "each completed cell writes cell_result.json and emits lupine.mlip.cell_result.v1",
        },
        "innovations_smuggled": [
            "batch runner reuses one loaded MLIP calculator across many cells",
            "Distill support fit cache is reused inside a batch by row/backend/support hash",
            "NIST-derived cubic elastic anchors rotate through shard manifests",
            "baseline and Distill Accuracy share raw prediction checkpoint URLs",
        ],
    }
    paths.work_dir.mkdir(parents=True, exist_ok=True)
    paths.plan_path.write_text(json.dumps(plan, indent=2, sort_keys=True), encoding="utf-8")
    return plan


def prepare(args: argparse.Namespace) -> int:
    run_id = args.run_id or f"mlip-deep-accuracy-{utc_stamp()}"
    work_dir = pathlib.Path(args.work_dir or ROOT / "tmp" / "mlip-deep-accuracy" / run_id)
    paths = DeepPaths(
        run_id=run_id,
        work_dir=work_dir,
        manifest_input_prefix=args.manifest_input_prefix,
        output_prefix=args.output_prefix,
    )
    reuse = pathlib.Path(args.reuse_manifest).resolve() if args.reuse_manifest else None
    manifests = build_deep_manifests(
        paths=paths,
        shards=args.shards,
        max_atoms=args.max_atoms,
        max_candidates=args.max_candidates,
        reuse_manifest=reuse,
        candidate_jsonl=pathlib.Path(args.candidate_jsonl).resolve() if args.candidate_jsonl else None,
    )
    batches = build_batch_specs(
        paths=paths,
        shards=args.shards,
        batch_size=args.batch_size,
        support_manifest_url=args.support_manifest_url,
        worker_url=args.worker_url,
        checkpoint_mode=args.checkpoint_mode,
        distill_policy_engine=args.distill_policy_engine,
        ribbon_version=args.ribbon_version,
    )
    plan = write_plan(args, paths, manifests, batches)
    print(json.dumps({
        "run_id": run_id,
        "plan_path": str(paths.plan_path),
        "cells_total": plan["cells_total"],
        "batches_total": plan["batches_total"],
        "budget_gate": plan["budget_gate"],
        "estimated_compute_usd": plan["cost_estimate"]["estimated_compute_usd"],
    }, indent=2, sort_keys=True))
    return 0 if plan["budget_gate"] == "pass" else 2


def load_plan(path: pathlib.Path) -> dict[str, Any]:
    plan = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(plan, dict) or plan.get("schema") != "lupine.mlip.deep_accuracy_campaign_plan.v1":
        raise ValueError(f"not a deep accuracy campaign plan: {path}")
    return plan


def upload(args: argparse.Namespace) -> int:
    plan_path = pathlib.Path(args.plan).resolve()
    plan = load_plan(plan_path)
    mkdir_gcs_prefix(plan["manifest_input_prefix"])
    run_prefix = f"{plan['manifest_input_prefix'].rstrip('/')}/{plan['run_id']}"
    rsync_to_gcs(plan_path.parent / "manifests", f"{run_prefix}/manifests")
    rsync_to_gcs(plan_path.parent / "batches", f"{run_prefix}/batches")
    cp_to_gcs(plan_path, f"{plan['manifest_input_prefix'].rstrip('/')}/{plan['run_id']}/campaign_plan.json")
    print(json.dumps({"uploaded_manifests": len(plan["manifests"]), "uploaded_batches": len(plan["batches"])}, indent=2))
    return 0


def read_ledger(path: pathlib.Path) -> set[str]:
    if not path.exists():
        return set()
    launched = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        entry = json.loads(line)
        if entry.get("status") in {"submitted", "completed"}:
            launched.add(str(entry.get("batch_id")))
    return launched


def append_ledger(path: pathlib.Path, entry: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry, sort_keys=True) + "\n")


def launch_command(plan: dict[str, Any], batch: dict[str, Any], *, async_launch: bool) -> list[str]:
    command = [
        GCLOUD,
        "run",
        "jobs",
        "execute",
        batch["target_job"],
        "--region",
        plan["gcp"]["region"],
        "--project",
        plan["gcp"]["project"],
        "--args",
        f"run-batch,--batch-spec-url,{batch['gcs_url']}",
        "--format=json",
    ]
    command.append("--async" if async_launch else "--wait")
    return command


def selected_batches(plan: dict[str, Any], args: argparse.Namespace, launched: set[str]) -> list[dict[str, Any]]:
    pending = [batch for batch in plan["batches"] if batch["batch_id"] not in launched]
    if args.mlip:
        pending = [batch for batch in pending if batch.get("mlip_id") == args.mlip]
    if args.variant:
        pending = [batch for batch in pending if batch.get("variant_id") == args.variant]
    if args.row:
        pending = [batch for batch in pending if batch.get("row_id") == args.row]
    return pending


def launch_tranche(args: argparse.Namespace) -> int:
    plan_path = pathlib.Path(args.plan).resolve()
    plan = load_plan(plan_path)
    if plan.get("budget_gate") != "pass" and not args.ignore_budget_gate:
        raise SystemExit("budget gate failed; rerun with --ignore-budget-gate only after review")
    local_ledger = pathlib.Path(args.ledger or plan_path.parent / "launch_ledger.jsonl")
    launched = read_ledger(local_ledger)
    pending = selected_batches(plan, args, launched)
    limit = min(args.limit, len(pending))
    if args.dry_run:
        preview = [
            {
                "batch_id": batch["batch_id"],
                "target_job": batch["target_job"],
                "mlip_id": batch["mlip_id"],
                "variant_id": batch["variant_id"],
                "row_id": batch["row_id"],
                "cells": batch["cells"],
                "command": " ".join(launch_command(plan, batch, async_launch=not args.wait)),
            }
            for batch in pending[:limit]
        ]
        print(json.dumps({
            "dry_run": True,
            "pending_batches": len(pending),
            "wait": args.wait,
            "filters": {
                "mlip": args.mlip,
                "variant": args.variant,
                "row": args.row,
            },
            "preview": preview,
        }, indent=2))
        return 0
    submitted = []
    for batch in pending[:limit]:
        command = launch_command(plan, batch, async_launch=not args.wait)
        proc = subprocess.run(command, check=False, capture_output=True, text=True)
        entry = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "batch_id": batch["batch_id"],
            "target_job": batch["target_job"],
            "mlip_id": batch["mlip_id"],
            "variant_id": batch["variant_id"],
            "row_id": batch["row_id"],
            "cells": batch["cells"],
            "status": ("completed" if args.wait else "submitted") if proc.returncode == 0 else "submit_failed",
            "returncode": proc.returncode,
            "stdout": proc.stdout.strip(),
            "stderr": proc.stderr.strip(),
        }
        append_ledger(local_ledger, entry)
        submitted.append(entry)
        if proc.returncode != 0:
            break
        time.sleep(args.submit_delay_seconds)
    print(json.dumps({"submitted": len([e for e in submitted if e["status"] == "submitted"]), "entries": submitted}, indent=2))
    return 0 if all(entry["status"] == "submitted" for entry in submitted) else 1


def quota(args: argparse.Namespace) -> int:
    data = run_json([
        "gcloud",
        "beta",
        "quotas",
        "info",
        "list",
        "--service=run.googleapis.com",
        f"--project={args.project}",
        "--filter=quotaId:NvidiaL4GpuAllocNoZonalRedundancyPerProjectRegion OR quotaId:JobRunPerMinutePerProjectRegion",
        "--format=json",
    ])
    print(json.dumps(data, indent=2, sort_keys=True))
    return 0


def add_common(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--project", default="shed-489901")
    parser.add_argument("--region", default="us-central1")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)

    prepare_p = sub.add_parser("prepare")
    add_common(prepare_p)
    prepare_p.add_argument("--run-id", default=None)
    prepare_p.add_argument("--work-dir", default=None)
    prepare_p.add_argument("--shards", type=int, default=100)
    prepare_p.add_argument("--batch-size", type=int, default=10)
    prepare_p.add_argument("--max-atoms", type=int, default=80)
    prepare_p.add_argument("--max-candidates", type=int, default=1500)
    prepare_p.add_argument(
        "--candidate-jsonl",
        default=None,
        help="Optional parquetlens JSONL export from the MPtrj test parquet; avoids Dataset Viewer rows rate limits.",
    )
    prepare_p.add_argument("--reuse-manifest", default=None, help="Offline/dev mode: copy this manifest into every shard.")
    prepare_p.add_argument("--manifest-input-prefix", default=DEFAULT_MANIFEST_INPUT_PREFIX)
    prepare_p.add_argument("--output-prefix", default=DEFAULT_OUTPUT_PREFIX)
    prepare_p.add_argument("--support-manifest-url", default=DEFAULT_SUPPORT_MANIFEST)
    prepare_p.add_argument("--worker-url", default=DEFAULT_WORKER_URL)
    prepare_p.add_argument("--checkpoint-mode", choices=("off", "read-write", "read-only", "write-only"), default="read-write")
    prepare_p.add_argument("--distill-policy-engine", choices=("auto", "python", "rust"), default="auto")
    prepare_p.add_argument("--ribbon-version", default="hyperribbon-v1")
    prepare_p.add_argument("--max-active-gpu-jobs", type=int, default=3)
    prepare_p.add_argument("--observed-l4-quota", type=int, default=3)
    prepare_p.add_argument("--budget-ceiling-usd", type=float, default=200.0)
    prepare_p.add_argument("--estimated-batch-seconds", type=float, default=900.0)
    prepare_p.add_argument("--l4-hourly-estimate", type=float, default=L4_LAB_HOURLY_ESTIMATE)
    prepare_p.set_defaults(func=prepare)

    upload_p = sub.add_parser("upload")
    upload_p.add_argument("--plan", required=True)
    upload_p.set_defaults(func=upload)

    launch_p = sub.add_parser("launch-tranche")
    launch_p.add_argument("--plan", required=True)
    launch_p.add_argument("--ledger", default=None)
    launch_p.add_argument("--limit", type=int, default=3)
    launch_p.add_argument("--submit-delay-seconds", type=float, default=2.0)
    launch_p.add_argument("--mlip", choices=MLIPS, default=None)
    launch_p.add_argument("--variant", choices=VARIANTS, default=None)
    launch_p.add_argument("--row", choices=ROWS, default=None)
    launch_p.add_argument("--wait", action="store_true", help="Wait for each Cloud Run execution to complete; useful for canaries.")
    launch_p.add_argument("--dry-run", action="store_true")
    launch_p.add_argument("--ignore-budget-gate", action="store_true")
    launch_p.set_defaults(func=launch_tranche)

    quota_p = sub.add_parser("quota")
    add_common(quota_p)
    quota_p.set_defaults(func=quota)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if getattr(args, "shards", 1) < 1:
        parser.error("--shards must be positive")
    if getattr(args, "batch_size", 1) < 1:
        parser.error("--batch-size must be positive")
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
