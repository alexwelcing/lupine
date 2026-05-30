#!/usr/bin/env python3
"""Launch paired MLIP evidence batches with an append-only ledger."""

from __future__ import annotations

import argparse
import json
import pathlib
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
TOOLS_DIR = ROOT / "tools"
if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))

import mlip_evidence_campaign as campaign_tools  # noqa: E402

DEFAULT_LEDGER = ROOT / "tmp" / "mlip-evidence" / "ni-fcc-eam-home-turf-paired-accuracy-v1" / "launch-ledger.jsonl"
GCLOUD = shutil.which("gcloud.cmd") or shutil.which("gcloud") or "C:/gcloud/google-cloud-sdk/bin/gcloud.cmd"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def run_json(command: list[str]) -> tuple[int, Any, str]:
    proc = subprocess.run(command, check=False, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if proc.returncode != 0:
        return proc.returncode, None, proc.stderr.strip()
    try:
        return proc.returncode, json.loads(proc.stdout or "{}"), proc.stderr.strip()
    except json.JSONDecodeError:
        return proc.returncode, {"stdout": proc.stdout.strip()}, proc.stderr.strip()


def append_ledger(path: pathlib.Path, entry: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry, sort_keys=True) + "\n")


def read_launched(path: pathlib.Path) -> set[str]:
    launched: set[str] = set()
    if not path.exists():
        return launched
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        entry = json.loads(line)
        if entry.get("status") in {"submitted", "completed"}:
            launched.add(str(entry.get("batch_id")))
    return launched


def job_image(project: str, region: str, job: str) -> str | None:
    code, payload, _stderr = run_json([
        GCLOUD,
        "run",
        "jobs",
        "describe",
        job,
        "--project",
        project,
        "--region",
        region,
        "--format=json",
    ])
    if code != 0 or not isinstance(payload, dict):
        return None
    try:
        containers = payload["spec"]["template"]["spec"]["template"]["spec"]["containers"]
        return str(containers[0]["image"])
    except Exception:  # noqa: BLE001
        return None


def ensure_fresh_jobs(campaign: dict[str, Any], batches: list[dict[str, Any]], expected_tag: str) -> list[str]:
    issues: list[str] = []
    for job in sorted({batch["target_job"] for batch in batches}):
        image = job_image(campaign["project"], campaign["region"], job)
        if not image or f":{expected_tag}" not in image:
            issues.append(f"{job} image is {image or 'unknown'}, expected tag {expected_tag}")
    return issues


def launch_command(campaign: dict[str, Any], batch: dict[str, Any], wait: bool) -> list[str]:
    return [
        GCLOUD,
        "run",
        "jobs",
        "execute",
        batch["target_job"],
        "--project",
        campaign["project"],
        "--region",
        campaign["region"],
        "--args",
        f"run-batch,--batch-spec-url,{batch['batch_spec_gcs_url']}",
        "--format=json",
        "--wait" if wait else "--async",
    ]


def apply_gate(args: argparse.Namespace, campaign: dict[str, Any], batches: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Filter batches through the a-priori regime gate, write a decision ledger.

    Refused (out-of-regime) distill cells are dropped before any Cloud Run
    execution — preventing the harm and saving the wasted compute. Returns the
    surviving batches; baseline cells always survive.
    """

    import mlip_regime_filter as gate

    provenance = gate.load_ribbon(args.ribbon or gate.DEFAULT_RIBBON)
    cells = [cell for batch in batches for cell in batch["cells"]]
    decisions = gate.decide_cells(campaign, cells, provenance, reviews_apply=args.reviews_apply)
    kept, _dropped = gate.filter_batches(batches, decisions)
    summary = gate.summarize(decisions)
    ledger_path = args.ledger.parent / "gate-decisions.json"
    ledger_path.parent.mkdir(parents=True, exist_ok=True)
    ledger_path.write_text(
        json.dumps(
            {
                "ts": utc_now(),
                "campaign_id": campaign.get("campaign_id"),
                "reference_family": campaign.get("reference_family"),
                "ribbon_id": provenance.ribbon_id,
                "scope": args.scope,
                "summary": summary,
                "refused": [gate.asdict(d) for d in decisions if not d.runs],
            },
            indent=2,
            sort_keys=True,
        ),
        encoding="utf-8",
    )
    print(json.dumps({"status": "gated", "summary": summary, "ledger": str(ledger_path)}, indent=2, sort_keys=True))
    return kept


def launch(args: argparse.Namespace) -> int:
    campaign = campaign_tools.load_campaign(args.campaign)
    batches = campaign_tools.expand_batches(campaign, scope=args.scope)
    if args.gate:
        batches = apply_gate(args, campaign, batches)
    if args.mlip:
        batches = [batch for batch in batches if batch["mlip_id"] == args.mlip]
    if args.limit is not None:
        batches = batches[: args.limit]
    launched = read_launched(args.ledger)
    pending = [batch for batch in batches if batch["batch_id"] not in launched]
    if args.require_image_tag:
        issues = ensure_fresh_jobs(campaign, pending, args.require_image_tag)
        if issues:
            print(json.dumps({"status": "blocked", "issues": issues}, indent=2, sort_keys=True))
            return 2
    if args.dry_run:
        print(json.dumps({"status": "dry_run", "pending": [batch["batch_id"] for batch in pending]}, indent=2))
        return 0
    submitted: list[dict[str, Any]] = []
    for batch in pending:
        command = launch_command(campaign, batch, args.wait)
        code, payload, stderr = run_json(command)
        entry = {
            "ts": utc_now(),
            "batch_id": batch["batch_id"],
            "target_job": batch["target_job"],
            "mlip_id": batch["mlip_id"],
            "cells": len(batch["cells"]),
            "status": "completed" if args.wait and code == 0 else ("submitted" if code == 0 else "submit_failed"),
            "returncode": code,
            "operation": payload,
            "stderr": stderr,
        }
        append_ledger(args.ledger, entry)
        submitted.append(entry)
        if code != 0:
            break
        time.sleep(args.submit_delay_seconds)
    print(json.dumps({"status": "launched", "submitted": submitted}, indent=2, sort_keys=True))
    return 0 if all(entry["returncode"] == 0 for entry in submitted) else 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    parser.add_argument("--campaign", type=pathlib.Path, default=campaign_tools.DEFAULT_CAMPAIGN)
    parser.add_argument("--ledger", type=pathlib.Path, default=DEFAULT_LEDGER)
    parser.add_argument("--require-image-tag", default=None)
    parser.add_argument("--mlip", default=None)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--scope", choices=sorted(campaign_tools.VALID_SCOPES), default="full")
    parser.add_argument("--submit-delay-seconds", type=float, default=2.0)
    parser.add_argument("--wait", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--gate", action="store_true", help="apply the a-priori regime gate before launching (refuse out-of-regime distill cells)")
    parser.add_argument("--ribbon", type=pathlib.Path, default=None, help="ribbon provenance JSON (default: lupine-ribbon-v1-mptrj-dft)")
    parser.add_argument("--reviews-apply", action="store_true", help="treat REVIEW (uncovered row) as run, not defer")
    return parser


def main(argv: list[str] | None = None) -> int:
    return launch(build_parser().parse_args(argv))


if __name__ == "__main__":
    raise SystemExit(main())
