#!/usr/bin/env python3
"""Replay Distill cases through the Rust hill-climb loop.

This is deliberately local-first and Docker-free. It turns either existing
hill-climb fixture cases or local MLIP runner artifacts into a selected
PolicyLimits JSON file that can be fed back to ``mlip_local_lab.py`` or GCP.
"""

from __future__ import annotations

import argparse
import copy
import json
import os
import pathlib
import subprocess
import sys
from datetime import datetime, timezone
from typing import Any, Iterable


ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_CASES = ROOT / "atlas-distill" / "tests" / "fixtures" / "distill_hill_climb_cases.jsonl"
DEFAULT_BIN = ROOT / "atlas-distill" / "target" / "debug" / ("atlas-distill.exe" if os.name == "nt" else "atlas-distill")
DEFAULT_OUT = ROOT / "tmp" / "mlip-distill-growth"


def utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_json(path: pathlib.Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def jsonl(path: pathlib.Path) -> Iterable[dict[str, Any]]:
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        value = json.loads(line)
        if isinstance(value, dict):
            yield value


def local_artifact_cases(run_dir: pathlib.Path) -> list[dict[str, Any]]:
    cases: list[dict[str, Any]] = []
    for artifact_path in sorted((run_dir / "artifacts").glob("**/cell_result.json")):
        artifact = load_json(artifact_path)
        distill_runtime = artifact.get("distill_runtime")
        if not isinstance(distill_runtime, dict):
            continue
        support_model = distill_runtime.get("support_model")
        if not isinstance(support_model, dict):
            continue
        support = {
            "correction": support_model.get("correction") if isinstance(support_model.get("correction"), dict) else {},
            "diagnostics": support_model.get("diagnostics") if isinstance(support_model.get("diagnostics"), dict) else {},
        }
        predictions = artifact.get("predictions")
        if not isinstance(predictions, list):
            continue
        for idx, raw_prediction in enumerate(predictions):
            if not isinstance(raw_prediction, dict):
                continue
            reference = raw_prediction.get("reference")
            if not isinstance(reference, dict):
                continue
            prediction = copy.deepcopy(raw_prediction)
            prediction.pop("reference", None)
            cases.append({
                "schema": "lupine.distill.hill_climb_case.v1",
                "case_id": f"{artifact.get('cell_id', artifact_path.parent.name)}:{idx}",
                "row_id": str(artifact.get("row_id") or ""),
                "mlip_id": str(artifact.get("mlip_id") or ""),
                "prediction": prediction,
                "support": support,
                "reference": reference,
                "weight": 1.0,
            })
    return [case for case in cases if case["row_id"] and case["mlip_id"]]


def write_cases(path: pathlib.Path, cases: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "".join(json.dumps(case, sort_keys=True) + "\n" for case in cases),
        encoding="utf-8",
    )


def case_summary(cases_path: pathlib.Path) -> dict[str, Any]:
    rows: dict[str, int] = {}
    mlips: dict[str, int] = {}
    count = 0
    for case in jsonl(cases_path):
        count += 1
        row_id = str(case.get("row_id") or "unknown")
        mlip_id = str(case.get("mlip_id") or "unknown")
        rows[row_id] = rows.get(row_id, 0) + 1
        mlips[mlip_id] = mlips.get(mlip_id, 0) + 1
    return {"count": count, "row_counts": rows, "mlip_counts": mlips}


def run_hill_climb(
    *,
    atlas_distill: pathlib.Path,
    cases: pathlib.Path,
    out_dir: pathlib.Path,
    objective: str,
    rounds: int,
    beam_width: int,
    report_top_k: int,
) -> dict[str, Any]:
    report_path = out_dir / f"{objective}_report.json"
    limits_path = out_dir / f"policy_limits_{objective}.json"
    cmd = [
        str(atlas_distill),
        "distill-hill-climb",
        "--cases",
        str(cases),
        "--objective",
        objective,
        "--rounds",
        str(rounds),
        "--beam-width",
        str(beam_width),
        "--report-top-k",
        str(report_top_k),
        "--output",
        str(report_path),
        "--selected-limits-output",
        str(limits_path),
    ]
    proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        raise RuntimeError(
            "atlas-distill distill-hill-climb failed "
            f"(exit {proc.returncode}): {(proc.stderr or proc.stdout).strip()}"
        )
    report = load_json(report_path)
    best = report.get("best_candidate") if isinstance(report, dict) else {}
    return {
        "objective": objective,
        "report_path": str(report_path),
        "selected_limits_path": str(limits_path),
        "best_candidate": best if isinstance(best, dict) else {},
    }


def promotion_label(result: dict[str, Any]) -> str:
    best = result.get("best_candidate")
    if not isinstance(best, dict):
        return "blocked"
    accuracy_delta = best.get("accuracy_delta_mean")
    refusal_rate = best.get("refusal_rate")
    blocked_rate = best.get("blocked_correction_rate")
    if (
        isinstance(accuracy_delta, (int, float))
        and isinstance(refusal_rate, (int, float))
        and isinstance(blocked_rate, (int, float))
        and accuracy_delta > 0
        and refusal_rate <= 0.05
        and blocked_rate < 0.75
    ):
        return "candidate"
    return "hold"


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Local Distill hill-climb growth loop")
    parser.add_argument("--run-dir", type=pathlib.Path, default=None)
    parser.add_argument("--cases", type=pathlib.Path, default=None)
    parser.add_argument("--out-dir", type=pathlib.Path, default=None)
    parser.add_argument("--atlas-distill-bin", type=pathlib.Path, default=DEFAULT_BIN)
    parser.add_argument("--objective", choices=["accuracy", "accuracy_accelerate", "both"], default="both")
    parser.add_argument("--rounds", type=int, default=3)
    parser.add_argument("--beam-width", type=int, default=4)
    parser.add_argument("--report-top-k", type=int, default=16)
    args = parser.parse_args(list(argv) if argv is not None else None)

    if not args.atlas_distill_bin.exists():
        raise SystemExit(f"atlas-distill binary not found: {args.atlas_distill_bin}")

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    out_dir = args.out_dir or DEFAULT_OUT / f"growth-{stamp}"
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.run_dir:
        cases = local_artifact_cases(args.run_dir)
        if not cases:
            raise SystemExit(f"no Distill hill-climb cases found in local run artifacts: {args.run_dir}")
        cases_path = out_dir / "distill_hill_climb_cases.jsonl"
        write_cases(cases_path, cases)
        case_source = str(args.run_dir)
    else:
        cases_path = args.cases or DEFAULT_CASES
        case_source = str(cases_path)
        if not cases_path.exists():
            raise SystemExit(f"hill-climb cases not found: {cases_path}")

    objectives = ["accuracy", "accuracy_accelerate"] if args.objective == "both" else [args.objective]
    results = [
        run_hill_climb(
            atlas_distill=args.atlas_distill_bin,
            cases=cases_path,
            out_dir=out_dir,
            objective=objective,
            rounds=args.rounds,
            beam_width=args.beam_width,
            report_top_k=args.report_top_k,
        )
        for objective in objectives
    ]
    summary = {
        "schema": "lupine.distill.growth_loop_report.v1",
        "created_at": utc_iso(),
        "case_source": case_source,
        "cases_path": str(cases_path),
        "case_summary": case_summary(cases_path),
        "atlas_distill_bin": str(args.atlas_distill_bin),
        "search": {
            "rounds": args.rounds,
            "beam_width": args.beam_width,
            "report_top_k": args.report_top_k,
        },
        "results": [
            {
                **result,
                "promotion_label": promotion_label(result),
            }
            for result in results
        ],
    }
    report_path = out_dir / "growth_report.json"
    report_path.write_text(json.dumps(summary, indent=2, sort_keys=True), encoding="utf-8")
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
