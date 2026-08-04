#!/usr/bin/env python3
"""Evaluate the Ni EAM-home-turf fixture with its reference EAM calculator."""

from __future__ import annotations

import argparse
import json
import pathlib
import sys
import time
from collections.abc import Iterable
from typing import Any

from ase.calculators.eam import EAM

from lupine_distill.fixture_contract import ROW_IDS, run_row, validate_manifest

ROOT = pathlib.Path(__file__).resolve().parents[1]

DEFAULT_FIXTURE = ROOT / "data" / "mlip_benchmarks" / "fixtures" / "ni_fcc_eam_home_turf_v1.json"
DEFAULT_OUTPUT = ROOT / "tmp" / "mlip-benchmarks" / "ni_fcc_eam_home_turf_v1" / "mishin_reference_scores.json"


def load_fixture(path: pathlib.Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise ValueError("fixture must be a JSON object")
    return payload


def reference_calculator(manifest: dict[str, Any]) -> EAM:
    ref = manifest["reference_provenance"]["eam_reference"]
    potential_path = ROOT / str(ref["potential_file"]).replace("/", "\\")
    return EAM(potential=str(potential_path))


def evaluate_fixture(manifest: dict[str, Any]) -> dict[str, Any]:
    validation = validate_manifest(manifest)
    if not validation["release_ready"]:
        raise ValueError("fixture is not release-ready: " + "; ".join(validation["blockers"]))

    rows: dict[str, Any] = {}
    started = time.perf_counter()
    for row_id in ROW_IDS:
        calc = reference_calculator(manifest)
        row_started = time.perf_counter()
        result = run_row(row_id, manifest, calc)
        rows[row_id] = {
            "score": result["score"],
            "score_unit": result["score_unit"],
            "n_structures": result["n_structures"],
            "duration_s": time.perf_counter() - row_started,
            "metrics": result["metrics"],
        }
    return {
        "schema": "lupine.mlip.ni_fixture_reference_eval.v1",
        "fixture_id": manifest["fixture_id"],
        "manifest_hash": manifest["manifest_hash"],
        "reference_calculator": manifest["reference_provenance"]["eam_reference"],
        "duration_s": time.perf_counter() - started,
        "rows": rows,
    }


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixture", type=pathlib.Path, default=DEFAULT_FIXTURE)
    parser.add_argument("--output", type=pathlib.Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--no-write", action="store_true")
    args = parser.parse_args(list(argv) if argv is not None else None)

    manifest = load_fixture(args.fixture)
    report = evaluate_fixture(manifest)
    if not args.no_write:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")
    print(json.dumps({
        "schema": "lupine.mlip.ni_fixture_reference_eval_summary.v1",
        "fixture_id": report["fixture_id"],
        "manifest_hash": report["manifest_hash"],
        "output": None if args.no_write else str(args.output),
        "rows": {
            row_id: {
                "score": row["score"],
                "n_structures": row["n_structures"],
                "primary_metric": row["metrics"].get("primary_metric"),
                "error": row["metrics"].get("error"),
            }
            for row_id, row in report["rows"].items()
        },
    }, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
