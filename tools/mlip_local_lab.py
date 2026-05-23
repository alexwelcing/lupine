#!/usr/bin/env python3
"""Local-first MLIP baseline and Distill campaign harness.

No Docker required. Each MLIP backend gets an isolated uv environment under
tmp/mlip-runtimes/<mlip_id>, then the same cell runner used by GCP is invoked
with local manifests, local artifacts, and local JSONL beats.
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable


ROOT = pathlib.Path(__file__).resolve().parents[1]
RUNNER_DIR = ROOT / "gcp" / "mlip-cell-runner"
RUNNER = RUNNER_DIR / "mlip_cell_runner.py"
EVAL_MANIFEST = RUNNER_DIR / "fixtures" / "canonical_structures_v2_mptrj.json"
SUPPORT_MANIFEST = RUNNER_DIR / "fixtures" / "canonical_distill_support_v1.json"
LOCAL_ROOT = ROOT / "tmp" / "mlip-local"
RUNTIME_ROOT = ROOT / "tmp" / "mlip-runtimes"
ATLAS_DISTILL_BIN = ROOT / "atlas-distill" / "target" / "debug" / ("atlas-distill.exe" if os.name == "nt" else "atlas-distill")

ROWS = [
    "elastic_constants",
    "energy_volume",
    "forces",
    "stress",
    "relaxation_stability",
]
MLIPS = ["mace-mp-0", "chgnet", "m3gnet", "orb-v3", "sevennet"]
VARIANTS = ["baseline", "distill_accuracy", "distill_accuracy_accelerate"]
REQS = {
    "mace-mp-0": "requirements-mace.txt",
    "chgnet": "requirements-chgnet.txt",
    "m3gnet": "requirements-m3gnet.txt",
    "orb-v3": "requirements-orb.txt",
    "sevennet": "requirements-sevennet.txt",
}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_iso() -> str:
    return utc_now().isoformat().replace("+00:00", "Z")


@dataclass(frozen=True)
class Cell:
    variant_id: str
    row_id: str
    mlip_id: str

    @property
    def cell_id(self) -> str:
        return f"{self.variant_id}:{self.row_id}:{self.mlip_id}"


def uv_exe() -> str:
    for candidate in (
        shutil.which("uv"),
        str(pathlib.Path.home() / ".local" / "bin" / "uv.exe"),
        str(pathlib.Path.home() / "AppData" / "Roaming" / "Python" / "Python310" / "Scripts" / "uv.exe"),
    ):
        if candidate and pathlib.Path(candidate).exists():
            return candidate
    raise SystemExit("uv is required for local MLIP env management")


def env_python(mlip_id: str) -> pathlib.Path:
    env_dir = RUNTIME_ROOT / mlip_id
    if os.name == "nt":
        return env_dir / "Scripts" / "python.exe"
    return env_dir / "bin" / "python"


def preferred_python() -> str:
    return os.environ.get("MLIP_LOCAL_PYTHON", "3.11")


def runtime_python_is_compatible(python: pathlib.Path) -> bool:
    try:
        proc = subprocess.run(
            [str(python), "-c", "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
        major, minor = (int(part) for part in proc.stdout.strip().split(".", 1))
    except Exception:
        return False
    return major == 3 and 10 <= minor <= 12


def ensure_env(mlip_id: str, skip_install: bool) -> pathlib.Path:
    python = env_python(mlip_id)
    env_dir = RUNTIME_ROOT / mlip_id
    if python.exists() and not runtime_python_is_compatible(python):
        if skip_install:
            raise SystemExit(f"runtime env for {mlip_id} uses an incompatible Python; recreate {env_dir}")
        resolved = env_dir.resolve()
        root = RUNTIME_ROOT.resolve()
        if root not in resolved.parents:
            raise SystemExit(f"refusing to remove unexpected runtime path: {resolved}")
        shutil.rmtree(env_dir)
    if skip_install:
        if not python.exists():
            raise SystemExit(f"missing runtime env for {mlip_id}: {python}")
        return python
    env_dir.parent.mkdir(parents=True, exist_ok=True)
    uv = uv_exe()
    if not python.exists():
        subprocess.run([uv, "venv", "--python", preferred_python(), str(env_dir)], cwd=ROOT, check=True)
    req = RUNNER_DIR / REQS[mlip_id]
    subprocess.run([
        uv,
        "pip",
        "install",
        "--index-strategy",
        os.environ.get("MLIP_LOCAL_UV_INDEX_STRATEGY", "unsafe-best-match"),
        "--python",
        str(python),
        "-r",
        str(req),
    ], cwd=ROOT, check=True)
    return python


def selected_cells(args: argparse.Namespace) -> list[Cell]:
    variants = [args.variant] if args.variant else (["baseline"] if args.mode == "baseline" else VARIANTS)
    rows = [args.row] if args.row else ROWS
    mlips = [args.mlip] if args.mlip else MLIPS
    return [Cell(v, r, m) for v in variants for r in rows for m in mlips]


def safe_id(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in "._-" else "_" for ch in value)


def distill_profile(variant_id: str) -> str:
    if variant_id == "distill_accuracy":
        return "accuracy"
    if variant_id == "distill_accuracy_accelerate":
        return "accuracy_accelerate"
    return "off"


def cell_command(run_id: str, cell: Cell, python: pathlib.Path, run_dir: pathlib.Path, args: argparse.Namespace) -> list[str]:
    artifact_prefix = run_dir / "artifacts" / safe_id(cell.cell_id)
    beat_jsonl = run_dir / "beats.jsonl"
    cmd = [
        str(python),
        str(RUNNER),
        "run-cell",
        "--run-id",
        run_id,
        "--campaign-id",
        run_id,
        "--cell-id",
        cell.cell_id,
        "--row-id",
        cell.row_id,
        "--mlip-id",
        cell.mlip_id,
        "--variant-id",
        cell.variant_id,
        "--distill-profile",
        distill_profile(cell.variant_id),
        "--profile",
        "local-lab",
        "--fixture-id",
        "canonical-structures-v2",
        "--manifest-url",
        str(EVAL_MANIFEST),
        "--artifact-prefix",
        str(artifact_prefix),
        "--local-jsonl",
        str(beat_jsonl),
        "--dev-mode-bypass",
    ]
    if cell.variant_id != "baseline":
        cmd.extend(["--support-manifest-url", str(SUPPORT_MANIFEST)])
        cmd.extend(["--distill-policy-engine", args.distill_policy_engine])
        cmd.extend(["--ribbon-version", args.ribbon_version])
        if args.distill_policy_url:
            cmd.extend(["--distill-policy-url", str(args.distill_policy_url)])
        if args.atlas_distill_bin:
            cmd.extend(["--atlas-distill-bin", str(args.atlas_distill_bin)])
    return cmd


def run_cell(run_id: str, cell: Cell, args: argparse.Namespace, run_dir: pathlib.Path) -> dict[str, object]:
    python = env_python(cell.mlip_id) if args.dry_run else ensure_env(cell.mlip_id, args.skip_install)
    cmd = cell_command(run_id, cell, python, run_dir, args)
    log_path = run_dir / "logs" / f"{safe_id(cell.cell_id)}.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    if args.dry_run:
        return {"cell_id": cell.cell_id, "command": cmd, "dry_run": True}
    started = utc_iso()
    with log_path.open("w", encoding="utf-8") as log:
        log.write("$ " + " ".join(cmd) + "\n")
        log.flush()
        proc = subprocess.run(cmd, cwd=ROOT, text=True, stdout=log, stderr=subprocess.STDOUT, check=False)
        log.write(f"\n[exit {proc.returncode}]\n")
    return {
        "cell_id": cell.cell_id,
        "variant_id": cell.variant_id,
        "row_id": cell.row_id,
        "mlip_id": cell.mlip_id,
        "started_at": started,
        "finished_at": utc_iso(),
        "returncode": proc.returncode,
        "log": str(log_path),
    }


def sync_jsonl(beats_path: pathlib.Path, endpoint: str) -> dict[str, int]:
    import requests

    posted = 0
    failed = 0
    url = endpoint.rstrip("/")
    if not url.endswith("/feed/beats"):
        url += "/feed/beats"
    for line in beats_path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        response = requests.post(url, data=line.encode("utf-8"), headers={"Content-Type": "application/json"}, timeout=60)
        if response.ok or response.status_code == 409:
            posted += 1
        else:
            failed += 1
    return {"posted": posted, "failed": failed}


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["baseline", "campaign"], default="baseline")
    parser.add_argument("--run-id", default=None)
    parser.add_argument("--variant", choices=VARIANTS, default=None)
    parser.add_argument("--row", choices=ROWS, default=None)
    parser.add_argument("--mlip", choices=MLIPS, default=None)
    parser.add_argument("--workers", type=int, default=1)
    parser.add_argument("--skip-install", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--sync-url", default=None)
    parser.add_argument("--distill-policy-engine", choices=["auto", "python", "rust"], default="rust")
    parser.add_argument("--distill-policy-url", default=None)
    parser.add_argument("--ribbon-version", default="hyperribbon-v1")
    parser.add_argument("--atlas-distill-bin", default=str(ATLAS_DISTILL_BIN) if ATLAS_DISTILL_BIN.exists() else None)
    args = parser.parse_args(list(argv) if argv is not None else None)

    run_id = args.run_id or f"mlip-local-{args.mode}-{utc_now().strftime('%Y%m%d-%H%M%S')}"
    run_dir = LOCAL_ROOT / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    cells = selected_cells(args)
    plan = {
        "schema": "lupine.mlip.local_lab_plan.v1",
        "run_id": run_id,
        "mode": args.mode,
        "cells": [cell.__dict__ | {"cell_id": cell.cell_id} for cell in cells],
        "eval_manifest": str(EVAL_MANIFEST),
        "support_manifest": str(SUPPORT_MANIFEST),
        "distill_policy_engine": args.distill_policy_engine,
        "distill_policy_url": args.distill_policy_url,
        "ribbon_version": args.ribbon_version,
        "atlas_distill_bin": args.atlas_distill_bin,
        "runtime_root": str(RUNTIME_ROOT),
    }
    (run_dir / "plan.json").write_text(json.dumps(plan, indent=2, sort_keys=True), encoding="utf-8")

    results = []
    workers = max(1, min(args.workers, len(cells)))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(run_cell, run_id, cell, args, run_dir) for cell in cells]
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
            print(json.dumps(result, sort_keys=True))
    summary = {
        "schema": "lupine.mlip.local_lab_summary.v1",
        "run_id": run_id,
        "run_dir": str(run_dir),
        "cells": len(results),
        "completed": sum(1 for row in results if row.get("returncode") == 0 or row.get("dry_run")),
        "failed": sum(1 for row in results if isinstance(row.get("returncode"), int) and row.get("returncode") != 0),
        "results": sorted(results, key=lambda row: str(row.get("cell_id"))),
    }
    beats_path = run_dir / "beats.jsonl"
    if args.sync_url and beats_path.exists() and not args.dry_run:
        summary["sync"] = sync_jsonl(beats_path, args.sync_url)
    (run_dir / "summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True), encoding="utf-8")
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0 if summary["failed"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
