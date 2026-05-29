#!/usr/bin/env python
from __future__ import annotations

import argparse
import json
import pathlib
from itertools import product
from typing import Any

from mlip_long_demo_run import (
    DEFAULT_DATA_DIR,
    DEMO_RUNS,
    load_calculator,
    run_demo,
    utc_iso,
)


def candidate_grid() -> list[dict[str, float]]:
    scales = [0.18, 0.22, 0.26, 0.30]
    max_steps = [0.035, 0.045, 0.055]
    dampings = [0.98]
    return [
        {
            "distill_correction_scale": scale,
            "distill_max_step_correction_angstrom": max_step,
            "distill_velocity_damping": damping,
        }
        for scale, max_step, damping in product(scales, max_steps, dampings)
    ]


def score_run(summary: dict[str, Any]) -> dict[str, Any]:
    score = summary.get("score") or {}
    final_lift = safe_float(score.get("final_rmse_lift_fraction"))
    mean_lift = safe_float(score.get("mean_rmse_lift_fraction"))
    distill_rmse = safe_float(score.get("distill_final_reference_position_rmse_angstrom"))
    baseline_rmse = safe_float(score.get("baseline_final_reference_position_rmse_angstrom"))
    force_guard_ok = bool(score.get("force_guard_ok"))
    verdict = score.get("verdict")
    objective = final_lift if final_lift is not None else -1.0
    if mean_lift is not None:
        objective += 0.1 * mean_lift
    if not force_guard_ok:
        objective -= 1.0
    return {
        "objective": objective,
        "verdict": verdict,
        "force_guard_ok": force_guard_ok,
        "baseline_final_reference_position_rmse_angstrom": baseline_rmse,
        "distill_final_reference_position_rmse_angstrom": distill_rmse,
        "final_rmse_lift_fraction": final_lift,
        "mean_rmse_lift_fraction": mean_lift,
        "distill_intervention_count": score.get("distill_intervention_count"),
    }


def safe_float(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number == number else None


def read_paired_score_from_dir(path: pathlib.Path) -> dict[str, Any]:
    score_files = sorted(path.glob("*paired-distill-accuracy-score-local-v1.json"))
    if not score_files:
        return {}
    payload = json.loads(score_files[0].read_text(encoding="utf-8"))
    return {
        "variant_id": "paired_score",
        "artifact": str(score_files[0]),
        "score": payload.get("score"),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Sweep local Distill policy knobs for a long-run viewer demo")
    parser.add_argument("--mlip-id", default="chgnet")
    parser.add_argument("--demo", choices=list(DEMO_RUNS), default="ni-vacancy")
    parser.add_argument("--seed", type=int, default=17)
    parser.add_argument("--output-dir", type=pathlib.Path, default=DEFAULT_DATA_DIR / "policy_sweeps")
    parser.add_argument("--limit", type=int, default=0, help="Optional cap on number of candidates")
    args = parser.parse_args()

    candidates = candidate_grid()
    if args.limit > 0:
        candidates = candidates[: args.limit]

    calc = load_calculator(args.mlip_id)
    results: list[dict[str, Any]] = []
    for idx, candidate in enumerate(candidates, start=1):
        run_args = argparse.Namespace(
            mlip_id=args.mlip_id,
            demo=args.demo,
            variant="paired",
            seed=args.seed,
            output_dir=args.output_dir / f"{args.demo}-candidate-{idx:02d}",
            publish_viewer=False,
            update_registry=False,
            distill_correction_scale=candidate["distill_correction_scale"],
            distill_max_step_correction_angstrom=candidate["distill_max_step_correction_angstrom"],
            distill_velocity_damping=candidate["distill_velocity_damping"],
            distill_max_reference_rmse_angstrom=None,
        )
        paired = read_paired_score_from_dir(run_args.output_dir)
        if not paired:
            _, summaries = run_demo(args.demo, run_args, calc)
            paired = next((item for item in summaries if item.get("variant_id") == "paired_score"), {})
            if not paired:
                paired = read_paired_score_from_dir(run_args.output_dir)
        result = {
            "candidate_index": idx,
            "policy_overrides": candidate,
            **score_run(paired),
            "summary": paired,
        }
        results.append(result)
        print(json.dumps({
            "candidate_index": idx,
            "policy_overrides": candidate,
            "objective": result["objective"],
            "final_rmse_lift_fraction": result["final_rmse_lift_fraction"],
            "mean_rmse_lift_fraction": result["mean_rmse_lift_fraction"],
            "force_guard_ok": result["force_guard_ok"],
            "verdict": result["verdict"],
        }, sort_keys=True))

    ranked = sorted(results, key=lambda item: item["objective"], reverse=True)
    report = {
        "schema": "lupine.distill.long_demo_policy_sweep.v1",
        "generated_at": utc_iso(),
        "mlip_id": args.mlip_id,
        "demo": args.demo,
        "seed": args.seed,
        "candidate_count": len(results),
        "best": ranked[0] if ranked else None,
        "ranked_candidates": ranked,
    }
    report_path = args.output_dir / f"{args.mlip_id}-{args.demo}-distill-policy-sweep.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "schema": "lupine.distill.long_demo_policy_sweep.summary.v1",
        "report": str(report_path),
        "best": report["best"],
    }, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
