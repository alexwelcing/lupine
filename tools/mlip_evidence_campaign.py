#!/usr/bin/env python3
"""Validate and materialize paired MLIP evidence campaigns.

This tool turns a benchmark campaign spec into concrete evidence work:
paired baseline/Distill cells, shared raw-prediction checkpoints, batch specs,
and exact Cloud Run commands. It deliberately performs local validation before
any cloud launch command is emitted.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import re
import sys
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
# TODO: retire once mlip_benchmark_sources moves into lupine_distill.
_TOOLS_DIR = ROOT / "tools"
if str(_TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(_TOOLS_DIR))

from lupine_distill import fixture_contract
import mlip_benchmark_sources  # noqa: E402


DEFAULT_CAMPAIGN = ROOT / "data" / "mlip_benchmarks" / "evidence_campaigns" / "ni_lane_a_paired_accuracy_v1.json"
DEFAULT_BATCH_DIR = ROOT / "tmp" / "mlip-evidence" / "ni-fcc-eam-home-turf-paired-accuracy-v1" / "batches"
ALLOWED_TARGET_RE = re.compile(r"default_value\s*=\s*\"([^\"]*mlip-cell[^\"]*)\"")
VALID_SCOPES = {"full", "promotion-canary"}
SUPPORTED_VARIANT_PROFILES = {
    "baseline": "off",
    "distill_accuracy": "accuracy",
    "distill_accuracy_accelerate": "accuracy_accelerate",
}


def load_json(path: pathlib.Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise ValueError(f"expected JSON object: {path}")
    return payload


def repo_path(value: str | pathlib.Path) -> pathlib.Path:
    path = pathlib.Path(value)
    return path if path.is_absolute() else ROOT / path


def stable_hash(payload: Any) -> str:
    data = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    return "sha256:" + hashlib.sha256(data).hexdigest()


def file_sha256(path: pathlib.Path) -> str:
    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


def gs_join(prefix: str, *parts: str) -> str:
    clean_prefix = prefix.rstrip("/")
    clean_parts = [str(part).strip("/") for part in parts if str(part).strip("/")]
    return "/".join([clean_prefix, *clean_parts])


def sanitize_id(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9-]+", "-", value).strip("-").lower()


def load_campaign(path: pathlib.Path = DEFAULT_CAMPAIGN) -> dict[str, Any]:
    campaign = load_json(path)
    campaign["_campaign_path"] = str(path)
    return campaign


def enabled_mlips(campaign: dict[str, Any]) -> list[str]:
    mlips = []
    for entry in campaign.get("mlips", []):
        if isinstance(entry, dict) and entry.get("enabled", True):
            mlip_id = entry.get("mlip_id")
            if isinstance(mlip_id, str) and mlip_id:
                mlips.append(mlip_id)
    return mlips


def scoped_rows(campaign: dict[str, Any], scope: str = "full") -> list[str]:
    if scope == "full":
        return list(campaign["rows"])
    canary = campaign.get("promotion_canary", {})
    rows = canary.get("rows") if isinstance(canary, dict) else None
    return [str(row) for row in rows] if isinstance(rows, list) else []


def scoped_mlips(campaign: dict[str, Any], scope: str = "full") -> list[str]:
    if scope == "full":
        return enabled_mlips(campaign)
    canary = campaign.get("promotion_canary", {})
    mlips = canary.get("mlips") if isinstance(canary, dict) else None
    requested = [str(mlip) for mlip in mlips] if isinstance(mlips, list) else []
    enabled = set(enabled_mlips(campaign))
    return [mlip for mlip in requested if mlip in enabled]


def variants_by_id(campaign: dict[str, Any]) -> dict[str, dict[str, Any]]:
    variants: dict[str, dict[str, Any]] = {}
    for entry in campaign.get("variants", []):
        if isinstance(entry, dict) and isinstance(entry.get("variant_id"), str):
            variants[entry["variant_id"]] = entry
    return variants


def variant_order(campaign: dict[str, Any]) -> list[str]:
    ordered: list[str] = []
    for entry in campaign.get("variants", []):
        if isinstance(entry, dict) and isinstance(entry.get("variant_id"), str):
            ordered.append(entry["variant_id"])
    return ordered


def distill_variant_ids(campaign: dict[str, Any]) -> list[str]:
    return [variant_id for variant_id in variant_order(campaign) if variant_id != "baseline"]


def backend_map(campaign: dict[str, Any]) -> dict[str, dict[str, Any]]:
    catalog = load_json(repo_path(campaign["backend_catalog_path"]))
    backends: dict[str, dict[str, Any]] = {}
    for entry in catalog.get("backends", []):
        if isinstance(entry, dict) and isinstance(entry.get("mlip_id"), str):
            backends[entry["mlip_id"]] = entry
    return backends


def allowed_target_jobs() -> set[str]:
    main_rs = ROOT / "gcp" / "tasks-consumer" / "src" / "main.rs"
    if not main_rs.exists():
        return set()
    text = main_rs.read_text(encoding="utf-8")
    allowed: set[str] = set()
    for match in ALLOWED_TARGET_RE.finditer(text):
        allowed.update(item.strip() for item in match.group(1).split(",") if item.strip())
    return allowed


def policy_registry(campaign: dict[str, Any]) -> dict[str, str]:
    registry = load_json(repo_path(campaign["policy_registry_path"]))
    policies = registry.get("policies")
    if not isinstance(policies, dict):
        raise ValueError("policy registry must contain a policies object")
    return {str(key): str(value) for key, value in policies.items()}


def policy_for(campaign: dict[str, Any], row_id: str, mlip_id: str) -> dict[str, str]:
    policies = policy_registry(campaign)
    selected = policies.get(f"{row_id}:{mlip_id}") or policies.get("default_accuracy")
    if not selected:
        raise ValueError(f"no Distill policy for {row_id}:{mlip_id}")
    local_path = repo_path(selected)
    return {
        "policy_local_path": local_path.relative_to(ROOT).as_posix(),
        "policy_gcs_url": gs_join(campaign["policy_gcs_prefix"], local_path.name),
        "policy_hash": file_sha256(local_path),
    }


def scope_part(scope: str) -> list[str]:
    return [] if scope == "full" else [scope]


def checkpoint_url(campaign: dict[str, Any], row_id: str, mlip_id: str, scope: str = "full") -> str:
    return gs_join(campaign["artifact_gcs_prefix"], *scope_part(scope), "checkpoints", row_id, mlip_id, "raw_predictions.json")


def artifact_prefix(campaign: dict[str, Any], variant_id: str, row_id: str, mlip_id: str, scope: str = "full") -> str:
    return gs_join(campaign["artifact_gcs_prefix"], *scope_part(scope), "cells", variant_id, row_id, mlip_id)


def fixture_id(campaign: dict[str, Any]) -> str:
    explicit = campaign.get("fixture_id")
    if isinstance(explicit, str) and explicit:
        return explicit
    fixture = load_json(repo_path(campaign["fixture_path"]))
    value = fixture.get("fixture_id")
    return str(value) if isinstance(value, str) and value else "unknown"


def batch_artifact_prefix(campaign: dict[str, Any], batch_id: str, scope: str = "full") -> str:
    return gs_join(campaign["artifact_gcs_prefix"], *scope_part(scope), "batches", batch_id)


def cell_id(campaign: dict[str, Any], variant_id: str, row_id: str, mlip_id: str, scope: str = "full") -> str:
    if scope == "full":
        return f"{campaign['campaign_id']}:{variant_id}:{row_id}:{mlip_id}"
    return f"{campaign['campaign_id']}:{scope}:{variant_id}:{row_id}:{mlip_id}"


def expand_cells(campaign: dict[str, Any], scope: str = "full") -> list[dict[str, Any]]:
    if scope not in VALID_SCOPES:
        raise ValueError(f"unknown evidence scope: {scope}")
    variants = variants_by_id(campaign)
    ordered_variants = variant_order(campaign)
    backends = backend_map(campaign)
    cells: list[dict[str, Any]] = []
    for mlip_id in scoped_mlips(campaign, scope):
        target_job = backends[mlip_id]["target_job"]
        for row_id in scoped_rows(campaign, scope):
            baseline_id = cell_id(campaign, "baseline", row_id, mlip_id, scope=scope)
            shared_checkpoint = checkpoint_url(campaign, row_id, mlip_id, scope=scope)
            baseline_variant = variants["baseline"]
            cells.append(
                {
                    "cell_id": baseline_id,
                    "campaign_id": campaign["campaign_id"],
                    "row_id": row_id,
                    "mlip_id": mlip_id,
                    "target_job": target_job,
                    "variant_id": "baseline",
                    "distill_profile": baseline_variant["distill_profile"],
                    "manifest_url": campaign["fixture_gcs_url"],
                    "fixture_url": campaign["fixture_gcs_url"],
                    "artifact_prefix": artifact_prefix(campaign, "baseline", row_id, mlip_id, scope=scope),
                    "checkpoint_url": shared_checkpoint,
                    "checkpoint_mode": baseline_variant["checkpoint_mode"],
                    "evidence_role": "baseline_checkpoint_producer",
                }
            )
            policy = policy_for(campaign, row_id, mlip_id)
            for variant_id in ordered_variants:
                if variant_id == "baseline":
                    continue
                distill_variant = variants[variant_id]
                cells.append(
                    {
                        "cell_id": cell_id(campaign, variant_id, row_id, mlip_id, scope=scope),
                        "campaign_id": campaign["campaign_id"],
                        "row_id": row_id,
                        "mlip_id": mlip_id,
                        "target_job": target_job,
                        "variant_id": variant_id,
                        "distill_profile": distill_variant["distill_profile"],
                        "manifest_url": campaign["fixture_gcs_url"],
                        "fixture_url": campaign["fixture_gcs_url"],
                        "artifact_prefix": artifact_prefix(campaign, variant_id, row_id, mlip_id, scope=scope),
                        "checkpoint_url": shared_checkpoint,
                        "checkpoint_mode": distill_variant["checkpoint_mode"],
                        "depends_on_cell_id": baseline_id,
                        "support_manifest_url": campaign["support_manifest_gcs_url"],
                        "distill_policy_url": policy["policy_gcs_url"],
                        "distill_policy_hash": policy["policy_hash"],
                        "distill_policy_engine": campaign["distill_policy_engine"],
                        "ribbon_version": campaign["ribbon_version"],
                        "evidence_role": "distill_checkpoint_consumer"
                        if variant_id == "distill_accuracy"
                        else "distill_accelerate_checkpoint_consumer",
                    }
                )
    return cells


def expand_batches(campaign: dict[str, Any], scope: str = "full") -> list[dict[str, Any]]:
    if scope not in VALID_SCOPES:
        raise ValueError(f"unknown evidence scope: {scope}")
    cells = expand_cells(campaign, scope=scope)
    backends = backend_map(campaign)
    ordered_variants = variant_order(campaign)
    batches: list[dict[str, Any]] = []
    for mlip_id in scoped_mlips(campaign, scope):
        mlip_cells = [cell for cell in cells if cell["mlip_id"] == mlip_id]
        ordered_cells: list[dict[str, Any]] = []
        for row_id in scoped_rows(campaign, scope):
            ordered_cells.extend(
                cell
                for cell in mlip_cells
                if cell["row_id"] == row_id and cell["variant_id"] in set(ordered_variants)
            )
        suffix = "paired-accuracy" if scope == "full" else "promotion-canary"
        batch_id = sanitize_id(f"{campaign['campaign_id']}-{mlip_id}-{suffix}")
        batch_gcs_prefix = campaign["batch_gcs_prefix"] if scope == "full" else gs_join(campaign["batch_gcs_prefix"], "canary")
        batch_gcs_url = gs_join(batch_gcs_prefix, f"{batch_id}.json")
        batches.append(
            {
                "schema": "lupine.mlip.batch_spec.v1",
                "batch_id": batch_id,
                "run_id": campaign["campaign_id"],
                "campaign_id": campaign["campaign_id"],
                "profile": campaign["profile"],
                "scope": scope,
                "fixture_id": fixture_id(campaign),
                "mlip_id": mlip_id,
                "target_job": backends[mlip_id]["target_job"],
                "batch_spec_gcs_url": batch_gcs_url,
                "batch_artifact_prefix": batch_artifact_prefix(campaign, batch_id, scope=scope),
                "defaults": {
                    "beat_emit_url": campaign["beat_emit_url"],
                    "manifest_url": campaign["fixture_gcs_url"],
                    "fixture_url": campaign["fixture_gcs_url"],
                    "checkpoint_mode": "read-write",
                    "distill_policy_engine": campaign["distill_policy_engine"],
                    "ribbon_version": campaign["ribbon_version"],
                },
                "cells": ordered_cells,
            }
        )
    return batches


def evidence_summary(campaign: dict[str, Any]) -> dict[str, Any]:
    cells = expand_cells(campaign)
    batches = expand_batches(campaign)
    variants = variant_order(campaign)
    policies = sorted({cell["distill_policy_url"] for cell in cells if cell["variant_id"] != "baseline"})
    variant_counts = {
        variant_id: len([cell for cell in cells if cell["variant_id"] == variant_id])
        for variant_id in variants
    }
    return {
        "campaign_id": campaign["campaign_id"],
        "profile": campaign["profile"],
        "rows": list(campaign["rows"]),
        "mlips": enabled_mlips(campaign),
        "variants": variants,
        "variant_counts": variant_counts,
        "cells_total": len(cells),
        "baseline_cells": variant_counts.get("baseline", 0),
        "distill_accuracy_cells": variant_counts.get("distill_accuracy", 0),
        "distill_accuracy_accelerate_cells": variant_counts.get("distill_accuracy_accelerate", 0),
        "batches_total": len(batches),
        "target_jobs": sorted({batch["target_job"] for batch in batches}),
        "policy_urls": policies,
        "fixture_hash": load_json(repo_path(campaign["fixture_path"])).get("manifest_hash"),
        "source_packet_hash": stable_hash(load_json(repo_path(campaign["source_packet_path"]))),
        "campaign_hash": stable_hash({key: value for key, value in campaign.items() if not key.startswith("_")}),
        "promotion_canary": {
            "rows": scoped_rows(campaign, "promotion-canary"),
            "mlips": scoped_mlips(campaign, "promotion-canary"),
            "cells_total": len(expand_cells(campaign, scope="promotion-canary")),
            "batches_total": len(expand_batches(campaign, scope="promotion-canary")),
        },
    }


def validate_campaign(campaign: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    required = (
        "schema",
        "campaign_id",
        "source_packet_path",
        "fixture_path",
        "fixture_gcs_url",
        "support_manifest_path",
        "support_manifest_gcs_url",
        "backend_catalog_path",
        "policy_registry_path",
        "policy_gcs_prefix",
        "batch_gcs_prefix",
        "artifact_gcs_prefix",
        "beat_emit_url",
        "rows",
        "variants",
        "mlips",
    )
    for field in required:
        if field not in campaign:
            issues.append(f"{field} is required")
    if issues:
        return issues
    if campaign.get("schema") != "lupine.mlip.evidence_campaign.v1":
        issues.append("schema must be lupine.mlip.evidence_campaign.v1")

    paths_to_check = (
        "source_packet_path",
        "fixture_path",
        "support_manifest_path",
        "backend_catalog_path",
        "policy_registry_path",
    )
    for field in paths_to_check:
        path = repo_path(campaign[field])
        if not path.exists():
            issues.append(f"{field} does not exist: {campaign[field]}")

    if issues:
        return issues

    source_manifest = load_json(repo_path(campaign["source_packet_path"]))
    issues.extend(
        f"source_packet: {issue}"
        for issue in mlip_benchmark_sources.validate_source_packet(source_manifest, root=ROOT, check_local=True)
    )

    try:
        fixture = load_json(repo_path(campaign["fixture_path"]))
        fixture_contract.validate_manifest(fixture)
    except Exception as exc:  # noqa: BLE001 - surfaced as validation text.
        issues.append(f"fixture_manifest: {exc}")

    support = load_json(repo_path(campaign["support_manifest_path"]))
    if not support.get("manifest_hash"):
        issues.append("support_manifest_path must contain manifest_hash")

    backends = backend_map(campaign)
    allowed_jobs = allowed_target_jobs()
    rows = campaign.get("rows") if isinstance(campaign.get("rows"), list) else []
    variants = variants_by_id(campaign)
    variant_ids = set(variants)
    if "baseline" not in variants or "distill_accuracy" not in variants:
        issues.append("variants must contain at least baseline and distill_accuracy")
    unsupported_variants = variant_ids - set(SUPPORTED_VARIANT_PROFILES)
    if unsupported_variants:
        issues.append(f"unsupported variant ids: {sorted(unsupported_variants)}")
    for variant_id, variant in variants.items():
        expected_profile = SUPPORTED_VARIANT_PROFILES.get(variant_id)
        if expected_profile and variant.get("distill_profile") != expected_profile:
            issues.append(f"{variant_id}.distill_profile must be {expected_profile}")
    for variant_id, expected_mode in [("baseline", "read-write"), *[(variant_id, "read-only") for variant_id in distill_variant_ids(campaign)]]:
        variant = variants.get(variant_id, {})
        if variant.get("checkpoint_mode") != expected_mode:
            issues.append(f"{variant_id}.checkpoint_mode must be {expected_mode}")
    for row_id in rows:
        if row_id not in fixture_contract.ROW_DEFAULTS:
            issues.append(f"unknown row_id: {row_id}")
    canary = campaign.get("promotion_canary", {})
    if isinstance(canary, dict):
        for row_id in canary.get("rows", []):
            if row_id not in rows:
                issues.append(f"promotion_canary row is not in full rows: {row_id}")
        enabled = set(enabled_mlips(campaign))
        for mlip_id in canary.get("mlips", []):
            if mlip_id not in enabled:
                issues.append(f"promotion_canary MLIP is not enabled: {mlip_id}")
    for mlip_id in enabled_mlips(campaign):
        backend = backends.get(mlip_id)
        if not backend:
            issues.append(f"enabled MLIP missing from backend catalog: {mlip_id}")
            continue
        target_job = backend.get("target_job")
        if target_job not in allowed_jobs:
            issues.append(f"target_job is not allowlisted for {mlip_id}: {target_job}")
        for row_id in rows:
            try:
                policy_for(campaign, str(row_id), mlip_id)
            except Exception as exc:  # noqa: BLE001 - surfaced as validation text.
                issues.append(str(exc))

    cells = expand_cells(campaign)
    for cell in cells:
        if cell["variant_id"] == "baseline":
            continue
        baseline = next(
            (
                other
                for other in cells
                if other["cell_id"] == cell.get("depends_on_cell_id")
                and other["variant_id"] == "baseline"
                and other["row_id"] == cell["row_id"]
                and other["mlip_id"] == cell["mlip_id"]
            ),
            None,
        )
        if not baseline:
            issues.append(f"distill cell missing paired baseline: {cell['cell_id']}")
            continue
        if baseline["checkpoint_url"] != cell["checkpoint_url"]:
            issues.append(f"checkpoint mismatch for {cell['cell_id']}")
    return issues


def batch_path(batch: dict[str, Any], out_dir: pathlib.Path) -> pathlib.Path:
    return out_dir / f"{batch['batch_id']}.json"


def write_batches(campaign: dict[str, Any], out_dir: pathlib.Path, scope: str = "full") -> list[dict[str, Any]]:
    issues = validate_campaign(campaign)
    if issues:
        raise SystemExit("campaign validation failed:\n" + "\n".join(f"- {issue}" for issue in issues))
    out_dir.mkdir(parents=True, exist_ok=True)
    batches = expand_batches(campaign, scope=scope)
    written: list[dict[str, Any]] = []
    for batch in batches:
        path = batch_path(batch, out_dir)
        materialized = {key: value for key, value in batch.items() if key != "batch_spec_gcs_url"}
        path.write_text(json.dumps(materialized, indent=2, sort_keys=True), encoding="utf-8")
        written.append(
            {
                "batch_id": batch["batch_id"],
                "target_job": batch["target_job"],
                "cells": len(batch["cells"]),
                "local_path": str(path),
                "gcs_url": batch["batch_spec_gcs_url"],
            }
        )
    return written


def gcloud_run_batch_command(campaign: dict[str, Any], batch: dict[str, Any], *, wait: bool) -> str:
    args = f"run-batch,--batch-spec-url,{batch['batch_spec_gcs_url']}"
    wait_flag = "--wait" if wait else "--async"
    return (
        f"gcloud run jobs execute {batch['target_job']} "
        f"--project {campaign['project']} --region {campaign['region']} "
        f"--args '{args}' --format json {wait_flag}"
    )


def gcloud_run_cell_command(campaign: dict[str, Any], cell: dict[str, Any], *, wait: bool) -> str:
    args = [
        "run-cell",
        "--run-id",
        campaign["campaign_id"],
        "--campaign-id",
        campaign["campaign_id"],
        "--cell-id",
        cell["cell_id"],
        "--row-id",
        cell["row_id"],
        "--mlip-id",
        cell["mlip_id"],
        "--variant-id",
        cell["variant_id"],
        "--distill-profile",
        cell["distill_profile"],
        "--manifest-url",
        cell["manifest_url"],
        "--artifact-prefix",
        cell["artifact_prefix"],
        "--beat-emit-url",
        campaign["beat_emit_url"],
        "--checkpoint-url",
        cell["checkpoint_url"],
        "--checkpoint-mode",
        cell["checkpoint_mode"],
    ]
    if cell["variant_id"] != "baseline":
        args.extend(
            [
                "--support-manifest-url",
                cell["support_manifest_url"],
                "--distill-policy-url",
                cell["distill_policy_url"],
                "--distill-policy-engine",
                cell["distill_policy_engine"],
                "--ribbon-version",
                cell["ribbon_version"],
            ]
        )
    wait_flag = "--wait" if wait else "--async"
    return (
        f"gcloud run jobs execute {cell['target_job']} "
        f"--project {campaign['project']} --region {campaign['region']} "
        f"--args '{','.join(args)}' --format json {wait_flag}"
    )


def upload_commands(campaign: dict[str, Any], batch_dir: pathlib.Path, scope: str = "full") -> list[str]:
    policies = sorted({policy_for(campaign, row_id, mlip_id)["policy_local_path"] for row_id in campaign["rows"] for mlip_id in enabled_mlips(campaign)})
    batch_dest = campaign["batch_gcs_prefix"] if scope == "full" else gs_join(campaign["batch_gcs_prefix"], "canary")
    commands = [
        f"gcloud storage cp {campaign['fixture_path']} {campaign['fixture_gcs_url']}",
        f"gcloud storage cp {campaign['support_manifest_path']} {campaign['support_manifest_gcs_url']}",
    ]
    commands.extend(
        f"gcloud storage cp {pathlib.Path(policy_path).as_posix()} {gs_join(campaign['policy_gcs_prefix'], pathlib.Path(policy_path).name)}"
        for policy_path in policies
    )
    batch_paths = [batch_path(batch, batch_dir).as_posix() for batch in expand_batches(campaign, scope=scope)]
    commands.extend(f"gcloud storage cp {path} {batch_dest.rstrip('/')}/" for path in batch_paths)
    return commands


def command_rows(campaign: dict[str, Any], kind: str, limit: int | None, batch_dir: pathlib.Path, wait: bool, scope: str = "full") -> list[str]:
    if kind == "upload":
        commands = upload_commands(campaign, batch_dir, scope=scope)
    elif kind == "run-batch":
        commands = [gcloud_run_batch_command(campaign, batch, wait=wait) for batch in expand_batches(campaign, scope=scope)]
    elif kind == "run-cell":
        commands = [gcloud_run_cell_command(campaign, cell, wait=wait) for cell in expand_cells(campaign, scope=scope)]
    else:
        raise ValueError(f"unknown command kind: {kind}")
    return commands[:limit] if limit is not None else commands


def cmd_validate(args: argparse.Namespace) -> int:
    campaign = load_campaign(args.campaign)
    issues = validate_campaign(campaign)
    if issues:
        print(json.dumps({"status": "failed", "issues": issues}, indent=2, sort_keys=True))
        return 1
    print(json.dumps({"status": "ready", "summary": evidence_summary(campaign)}, indent=2, sort_keys=True))
    return 0


def cmd_expand(args: argparse.Namespace) -> int:
    campaign = load_campaign(args.campaign)
    issues = validate_campaign(campaign)
    if issues:
        raise SystemExit("campaign validation failed:\n" + "\n".join(f"- {issue}" for issue in issues))
    payload = {
        "summary": evidence_summary(campaign),
        "cells": expand_cells(campaign, scope=args.scope),
        "batches": expand_batches(campaign, scope=args.scope),
    }
    if args.json:
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        summary = payload["summary"]
        print(
            f"{summary['campaign_id']}: {summary['cells_total']} cells, "
            f"{summary['batches_total']} batches, {len(summary['policy_urls'])} policy objects"
        )
    return 0


def cmd_write_batches(args: argparse.Namespace) -> int:
    campaign = load_campaign(args.campaign)
    written = write_batches(campaign, args.output, scope=args.scope)
    print(json.dumps({"status": "written", "batches": written}, indent=2, sort_keys=True))
    return 0


def cmd_commands(args: argparse.Namespace) -> int:
    campaign = load_campaign(args.campaign)
    issues = validate_campaign(campaign)
    if issues:
        raise SystemExit("campaign validation failed:\n" + "\n".join(f"- {issue}" for issue in issues))
    for command in command_rows(campaign, args.kind, args.limit, args.batch_dir, args.wait, scope=args.scope):
        print(command)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    parser.add_argument("--campaign", type=pathlib.Path, default=DEFAULT_CAMPAIGN)
    sub = parser.add_subparsers(dest="command", required=True)

    validate = sub.add_parser("validate")
    validate.set_defaults(func=cmd_validate)

    expand = sub.add_parser("expand")
    expand.add_argument("--json", action="store_true")
    expand.add_argument("--scope", choices=sorted(VALID_SCOPES), default="full")
    expand.set_defaults(func=cmd_expand)

    write_batches_parser = sub.add_parser("write-batches")
    write_batches_parser.add_argument("--output", type=pathlib.Path, default=DEFAULT_BATCH_DIR)
    write_batches_parser.add_argument("--scope", choices=sorted(VALID_SCOPES), default="full")
    write_batches_parser.set_defaults(func=cmd_write_batches)

    commands = sub.add_parser("commands")
    commands.add_argument("--kind", choices=("upload", "run-batch", "run-cell"), default="run-batch")
    commands.add_argument("--limit", type=int, default=None)
    commands.add_argument("--batch-dir", type=pathlib.Path, default=DEFAULT_BATCH_DIR)
    commands.add_argument("--wait", action="store_true")
    commands.add_argument("--scope", choices=sorted(VALID_SCOPES), default="full")
    commands.set_defaults(func=cmd_commands)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
