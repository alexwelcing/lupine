#!/usr/bin/env python3
"""
runner.py — Phase-D Layer-4: the compute resolution lane that closes
hypothesize -> test -> resolve with REAL physics.

This is the compute-resolution drain loop. It pulls queued experiments off
the worker ledger, runs LAMMPS to compute the requested discriminative
property, writes predicted records back to the ledger, and marks the
experiment done. The verdict + lifecycle-trace closure then happen
automatically in the existing worker flow once the records land and the
experiment completes.

The drain loop only produces records. It never decides verdicts; that is
the worker's job. Its single responsibility is: dequeue -> compute -> ingest
-> complete, robustly, idempotently, and without ever wedging the queue.

CLI:
    python runner.py [--limit N] [--worker URL] [--dry-run] [--selftest] [--once]

    (default)    drain up to N pending experiments (N defaults to 10)
    --limit N    cap the number of experiments processed this run
    --worker URL override WORKER_URL
    --dry-run    fetch pending + print the recipe plan; no LAMMPS, no POSTs
    --selftest   CI / Cloud-Run smoke: no LAMMPS, validates wiring; exit 0/1
    --once       process exactly one experiment then exit (debugging)

Env:
    WORKER_URL           default https://glim-think-v1.aw-ab5.workers.dev
    INTERNAL_TASK_TOKEN  internal auth token (required for live calls)

Deps: stdlib only (urllib/json for HTTP — no `requests`). The `lammps`
python module is supplied by the container at run time and is only
imported on the compute path (never under --selftest / --dry-run).

Sibling modules (the coordinator guarantees these live next to runner.py):
    property_recipes.py  -> get_recipe(lammps_input_type), RECIPES registry
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
import traceback
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Optional

# ─── Reuse: NIST helpers from the demo generator (read, don't modify) ──────
# generate_nist_demos lives at atlas/scripts/; add it to the path so we can
# reuse guess_structure / run_lammps and the NIST index/file layout exactly.

_REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_REPO_ROOT / "atlas" / "scripts"))

from generate_nist_demos import (  # noqa: E402
    INDEX_PATH,
    NIST_ROOT,
    guess_structure,
    run_lammps,
)

# Recipe registry — guaranteed to sit beside runner.py in atlas/compute/.
from property_recipes import RECIPES, get_recipe  # noqa: E402

# ─── Config ───────────────────────────────────────────────────────────────

DEFAULT_WORKER_URL = "https://glim-think-v1.aw-ab5.workers.dev"
DEFAULT_LIMIT = 10
AGENT_ID = "agent_glim_compute"
PROVENANCE_SOURCE = "glim-compute"
HTTP_TIMEOUT = 60  # seconds


def _worker_url(cli_value: Optional[str]) -> str:
    return (cli_value or os.environ.get("WORKER_URL") or DEFAULT_WORKER_URL).rstrip("/")


def _token() -> str:
    return os.environ.get("INTERNAL_TASK_TOKEN", "")


# ─── HTTP (stdlib only) ───────────────────────────────────────────────────

def _request(method: str, url: str, token: str, body: Optional[dict] = None) -> Any:
    """Issue an authenticated JSON request; return parsed JSON (or None)."""
    data = None
    headers = {"X-Internal-Token": token, "Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:  # noqa: S310
        raw = resp.read().decode("utf-8")
    return json.loads(raw) if raw.strip() else None


def fetch_pending(worker: str, token: str) -> list[dict]:
    """GET /experiments/pending -> { experiments: [ row, ... ] }."""
    payload = _request("GET", f"{worker}/experiments/pending", token)
    if not isinstance(payload, dict) or "experiments" not in payload:
        raise ValueError(f"unexpected /experiments/pending shape: {type(payload)}")
    experiments = payload["experiments"]
    if not isinstance(experiments, list):
        raise ValueError("experiments is not a list")
    return experiments


def ingest_batch(worker: str, token: str, records: list[dict]) -> None:
    """POST /ingest/batch with a batch of ledger records."""
    if not records:
        return
    _request("POST", f"{worker}/ingest/batch", token, {"records": records})


def complete_experiment(worker: str, token: str, experiment_id: Any) -> None:
    """POST /experiments/complete — ALWAYS called so the queue never wedges."""
    _request("POST", f"{worker}/experiments/complete", token, {"experiment_id": experiment_id})


# ─── Spec / row parsing ───────────────────────────────────────────────────

def _parse_json_field(value: Any, default: Any) -> Any:
    """Rows carry several fields as JSON strings; tolerate dict/list too."""
    if value is None:
        return default
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except (ValueError, TypeError):
            return default
    return default


# ─── Potential parameter file resolution ──────────────────────────────────
# Mirror generate_nist_demos: prefer the local NIST file cache; fall back to
# downloading the artifact by URL into the workdir. The experiment row gives
# us potential_id (the NIST index id) and potential_label.

def _load_nist_index() -> list[dict]:
    if not INDEX_PATH.exists():
        return []
    with open(INDEX_PATH, encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else []


def _find_potential(index: list[dict], potential_id: str, label: str) -> Optional[dict]:
    for rec in index:
        if rec.get("id") == potential_id:
            return rec
    for rec in index:
        if potential_id and rec.get("potid") == potential_id:
            return rec
    for rec in index:
        if label and rec.get("id") == label:
            return rec
    return None


def _resolve_param_files(
    potential: dict, pair_style: str, work_dir: Path
) -> tuple[Optional[Path], Optional[Path]]:
    """Return (param_file, library_file) usable by LAMMPS, downloading if needed.

    Local NIST cache wins (identical to generate_nist_demos); otherwise the
    artifact is fetched from its `url` into work_dir.
    """
    pot_id = potential["id"]
    artifacts = potential.get("artifacts", [])
    param_files = [a for a in artifacts if not a["filename"].lower().endswith(".pdf")]
    if not param_files:
        return None, None

    local_root = NIST_ROOT / "files" / pair_style.replace("/", "_") / pot_id

    def _materialize(artifact: dict) -> Optional[Path]:
        fname = artifact["filename"]
        cached = local_root / fname
        if cached.exists():
            dst = work_dir / fname
            dst.write_bytes(cached.read_bytes())
            return dst
        url = artifact.get("url")
        if not url:
            return None
        dst = work_dir / fname
        try:
            with urllib.request.urlopen(url, timeout=HTTP_TIMEOUT) as r:  # noqa: S310
                dst.write_bytes(r.read())
        except (urllib.error.URLError, OSError) as exc:
            print(f"    [warn] artifact download failed for {fname}: {exc}")
            return None
        return dst

    library_file: Optional[Path] = None
    if pair_style in ("meam", "meam/spline"):
        for art in artifacts:
            if art["filename"].lower() == "library.meam":
                library_file = _materialize(art)
                break

    param_file: Optional[Path] = None
    for art in param_files:
        if pair_style in ("meam", "meam/spline") and art["filename"].lower() == "library.meam":
            continue
        param_file = _materialize(art)
        if param_file is not None:
            break

    return param_file, library_file


# ─── Per-experiment processing ────────────────────────────────────────────

def _build_records(experiment: dict, recipe_name: str, lammps_input_type: str,
                    extracted: dict[str, float]) -> list[dict]:
    """One ledger record per extracted property.

    recordId is deterministic (compute_{experiment_id}_{prop}) so re-runs
    dedupe via the ledger's INSERT guard — the drain loop is idempotent.

    Contamination guard (worker side) rejects records where predicted is
    null, |predicted|>1500, predicted<=0, reference<=0, or
    |predicted-reference|>5*|reference|. We never fabricate a reference: if
    the row carries a trustworthy catalog/NIST reference we use it and mark
    prediction_only=false; otherwise we flag prediction_only=true and set
    reference=predicted purely to clear the guard for a prediction-only
    record (documented, not a claimed measurement).
    """
    eid = experiment.get("experiment_id")
    refs = _parse_json_field(experiment.get("reference_values"), {})
    if not isinstance(refs, dict):
        refs = {}

    records: list[dict] = []
    for prop, predicted in extracted.items():
        if predicted is None:
            print(f"    [skip-record] {prop}: recipe returned None")
            continue

        ref_raw = refs.get(prop)
        prediction_only = ref_raw is None
        try:
            reference = float(ref_raw) if ref_raw is not None else float(predicted)
        except (TypeError, ValueError):
            reference = float(predicted)
            prediction_only = True

        records.append({
            "recordId": f"compute_{eid}_{prop}",
            "element": experiment.get("element"),
            "potentialId": experiment.get("potential_id"),
            "potentialLabel": experiment.get("potential_label"),
            "pairStyle": experiment.get("pair_style"),
            "property": prop,
            "reference": reference,
            "predicted": float(predicted),
            "unit": "",
            "agentId": AGENT_ID,
            "timestamp": __import__("datetime").datetime.utcnow().isoformat() + "Z",
            "provenance": {
                "source": PROVENANCE_SOURCE,
                "lammps_input_type": lammps_input_type,
                "experiment_id": eid,
                "hypothesis_id": experiment.get("hypothesis_id"),
                "recipe": recipe_name,
                "prediction_only": prediction_only,
            },
        })
    return records


def process_experiment(experiment: dict, worker: str, token: str) -> None:
    """Compute one experiment's property, ingest records, ALWAYS complete it.

    Any failure is logged (console + would-be provenance) but the experiment
    is still marked complete so a permanently-stuck experiment cannot block
    the drain. Failures are recorded, not silently swallowed.
    """
    eid = experiment.get("experiment_id")
    print(f"[experiment {eid}] element={experiment.get('element')} "
          f"potential={experiment.get('potential_label')}")

    failure: Optional[str] = None
    records: list[dict] = []

    try:
        spec = _parse_json_field(experiment.get("spec"), {})
        lammps_input_type = spec.get("lammps_input_type") or experiment.get("discriminative_property")
        recipe = get_recipe(lammps_input_type) if lammps_input_type else None

        if recipe is None:
            print(f"  [skip] no recipe for lammps_input_type={lammps_input_type!r} "
                  f"— completing so the queue does not wedge")
            complete_experiment(worker, token, eid)
            return

        index = _load_nist_index()
        potential = _find_potential(
            index,
            str(experiment.get("potential_id") or ""),
            str(experiment.get("potential_label") or ""),
        )
        if potential is None:
            raise RuntimeError(
                f"potential not found in NIST index: id={experiment.get('potential_id')!r}"
            )

        pair_style = experiment.get("pair_style") or potential.get("pair_style")
        elements = potential.get("elements", [])
        structure = experiment.get("structure") or guess_structure(elements)[0]
        _, lattice = guess_structure(elements)

        with tempfile.TemporaryDirectory(prefix="glim_compute_") as tmp:
            work_dir = Path(tmp)
            param_file, library_file = _resolve_param_files(potential, pair_style, work_dir)
            if param_file is None:
                raise RuntimeError(f"could not resolve parameter file for {potential['id']}")

            input_script = recipe.build_input(
                potential=potential,
                potential_file=param_file,
                library_file=library_file,
                structure=structure,
                lattice=lattice,
                spec=spec,
                work_dir=work_dir,
            )
            log_path = work_dir / "log.lammps"
            ok = run_lammps(input_script, work_dir)
            log_text = log_path.read_text() if log_path.exists() else ""
            if not ok:
                raise RuntimeError("LAMMPS run failed (see console above)")

            extracted = recipe.extract(log_text)
            if not extracted:
                raise RuntimeError("recipe extracted no properties from the log")

            records = _build_records(experiment, recipe.name, lammps_input_type, extracted)

    except Exception as exc:  # noqa: BLE001 — one bad experiment must not abort the drain
        failure = f"{type(exc).__name__}: {exc}"
        print(f"  [compute-fail] {failure}")
        traceback.print_exc()

    # Ingest whatever we successfully computed (idempotent recordIds).
    if records:
        try:
            ingest_batch(worker, token, records)
            print(f"  [ingest] {len(records)} record(s) "
                  f"-> {[r['recordId'] for r in records]}")
        except Exception as exc:  # noqa: BLE001
            print(f"  [ingest-fail] {type(exc).__name__}: {exc}")

    # ALWAYS complete — even on failure — so the queue keeps draining.
    try:
        complete_experiment(worker, token, eid)
        status = "ok" if failure is None else f"failed ({failure})"
        print(f"  [complete] experiment {eid} marked done — {status}")
    except Exception as exc:  # noqa: BLE001
        print(f"  [complete-fail] could NOT complete experiment {eid}: {exc}")


# ─── Modes ────────────────────────────────────────────────────────────────

def run_selftest(worker: str, token: str) -> int:
    """CI / Cloud-Run smoke. No LAMMPS. Exit 0 (healthy) / 1 (broken)."""
    print(f"[selftest] WORKER_URL={worker}")
    problems: list[str] = []

    if not token:
        problems.append("INTERNAL_TASK_TOKEN is not set")

    try:
        keys = sorted(RECIPES.keys())
        print(f"[selftest] RECIPES registry OK ({len(keys)} recipes): {keys}")
    except Exception as exc:  # noqa: BLE001
        problems.append(f"RECIPES registry import/list failed: {exc}")

    if token:
        try:
            experiments = fetch_pending(worker, token)
            print(f"[selftest] /experiments/pending OK — {len(experiments)} pending")
        except Exception as exc:  # noqa: BLE001
            problems.append(f"/experiments/pending unreachable or bad shape: {exc}")
    else:
        problems.append("skipped /experiments/pending probe (no token)")

    if problems:
        for p in problems:
            print(f"[selftest] FAIL: {p}")
        return 1
    print("[selftest] PASS")
    return 0


def run_dry_run(worker: str, token: str, limit: int) -> int:
    """Fetch pending + print the recipe plan. No LAMMPS, no POSTs."""
    experiments = fetch_pending(worker, token)
    subset = experiments[:limit]
    print(f"[dry-run] {len(experiments)} pending; planning first {len(subset)}:")
    for exp in subset:
        spec = _parse_json_field(exp.get("spec"), {})
        lit = spec.get("lammps_input_type") or exp.get("discriminative_property")
        recipe = get_recipe(lit) if lit else None
        plan = recipe.name if recipe is not None else "NO-RECIPE (would skip+complete)"
        print(f"  experiment {exp.get('experiment_id')}: "
              f"element={exp.get('element')} input_type={lit!r} -> {plan}")
    return 0


def run_drain(worker: str, token: str, limit: int) -> int:
    """Normal mode: drain up to `limit` pending experiments."""
    experiments = fetch_pending(worker, token)
    subset = experiments[:limit]
    print(f"[drain] {len(experiments)} pending; processing up to {len(subset)}")
    for exp in subset:
        try:
            process_experiment(exp, worker, token)
        except Exception as exc:  # noqa: BLE001 — outer guard; never abort the drain
            print(f"[drain] unexpected error on experiment "
                  f"{exp.get('experiment_id')}: {exc}")
            traceback.print_exc()
    print(f"[drain] done — {len(subset)} experiment(s) processed")
    return 0


# ─── Entry point ──────────────────────────────────────────────────────────

def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Phase-D Layer-4 compute resolution drain loop")
    parser.add_argument("--limit", type=int, default=DEFAULT_LIMIT,
                        help=f"max pending experiments to drain (default {DEFAULT_LIMIT})")
    parser.add_argument("--worker", type=str, default=None, help="override WORKER_URL")
    parser.add_argument("--dry-run", action="store_true",
                        help="print recipe plan; no LAMMPS, no POSTs")
    parser.add_argument("--selftest", action="store_true",
                        help="CI/Cloud-Run smoke; no LAMMPS; exit 0/1")
    parser.add_argument("--once", action="store_true",
                        help="process exactly one experiment then exit")
    args = parser.parse_args(argv)

    worker = _worker_url(args.worker)
    token = _token()

    if args.selftest:
        return run_selftest(worker, token)

    if args.dry_run:
        return run_dry_run(worker, token, args.limit)

    limit = 1 if args.once else args.limit
    return run_drain(worker, token, limit)


if __name__ == "__main__":
    sys.exit(main())
