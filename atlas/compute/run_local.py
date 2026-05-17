#!/usr/bin/env python3
"""
run_local.py — drive ONE experiment through the real runner.process_experiment
code path locally (no queue, no Cloud Run). Purpose: close P0 (one real
hypothesis-resolution cycle with real LAMMPS physics, feeding the live
worker) and advance P1 (validate a recipe against a canonical, well-
characterized potential) — without the cloudscheduler IAM grant.

This is NOT a physics reimplementation: it constructs the same experiment
dict the Experiment agent would enqueue, then calls the committed
runner.process_experiment (resolve param files → property_recipes build →
generate_nist_demos.run_lammps → /ingest/batch → /experiments/complete).
The only stand-in is the hand-built spec (the autonomous-design link).

Usage:
  INTERNAL_TASK_TOKEN=... python run_local.py \
    [--potential 1986--Foiles-S-M--Cu--LAMMPS--ipr1] \
    [--element Cu] [--structure fcc] [--recipe elastic_constants] \
    [--hypothesis h_miit2_cu_leadframe_ribbon] [--no-ingest]
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE))  # property_recipes / runner siblings
import runner  # noqa: E402  the real production drain code

_INDEX = _HERE.parent / "nist_ipr" / "index" / "master_index.json"


def _load_potential(pot_id: str) -> dict:
    raw = json.loads(_INDEX.read_text())
    arr = raw if isinstance(raw, list) else (
        raw.get("potentials") or raw.get("entries") or list(raw.values())[0]
    )
    for p in arr:
        if isinstance(p, dict) and (p.get("id") == pot_id or p.get("potid") == pot_id):
            return p
    raise SystemExit(f"potential {pot_id!r} not found in master_index.json")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--potential", default="1986--Foiles-S-M--Cu--LAMMPS--ipr1")
    ap.add_argument("--element", default="Cu")
    ap.add_argument("--structure", default="fcc")
    ap.add_argument("--recipe", default="elastic_constants")
    ap.add_argument("--hypothesis", default="h_miit2_cu_leadframe_ribbon")
    ap.add_argument("--no-ingest", action="store_true",
                    help="run LAMMPS + print, but do not POST to the worker")
    a = ap.parse_args()

    pot = _load_potential(a.potential)
    worker = os.environ.get("WORKER_URL", "https://glim-think-v1.aw-ab5.workers.dev")
    token = runner._token()
    if not token and not a.no_ingest:
        print("INTERNAL_TASK_TOKEN unset — use --no-ingest or set it")
        return 1

    # The experiment dict shape process_experiment expects (= a
    # pending_experiments row). Carries the full potential record so the
    # runner's _resolve_param_files can fetch artifacts.
    eid = f"local_{a.hypothesis}_{a.potential}_{a.recipe}"
    experiment = {
        "experiment_id": eid,
        "element": a.element,
        "potential_id": pot.get("id"),
        "potential_label": pot.get("id"),
        "pair_style": pot.get("pair_style"),
        "structure": a.structure,
        "hypothesis_id": a.hypothesis,
        "spec": json.dumps({"lammps_input_type": a.recipe}),
        "potential": pot,  # full record (artifacts) for _resolve_param_files
    }

    print(f"[run_local] {a.element} {a.structure} {pot.get('pair_style')} "
          f"recipe={a.recipe} potential={a.potential} hyp={a.hypothesis}")
    if a.no_ingest:
        os.environ["WORKER_URL"] = "http://0.0.0.0:0"  # force ingest/complete to fail-soft
        print("[run_local] --no-ingest: LAMMPS will run; ingest/complete will be skipped/soft-fail")

    runner.process_experiment(experiment, worker, token)
    print("[run_local] done — check the worker /hypotheses re-eval next")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
