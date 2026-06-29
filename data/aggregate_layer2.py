#!/usr/bin/env python3
"""Aggregate Round-2 Layer-2 MLIP raw results into a comparison report."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np


def mae(pred, target):
    return float(np.mean(np.abs(np.array(pred) - np.array(target))))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--inputs", default="data/layer2_outputs", help="Directory of raw JSON files")
    parser.add_argument("--targets", default="data/targets_0K.json", help="Target elastic constants JSON")
    parser.add_argument("--output", default="data/benchmark_layer2_results.json", help="Output report path")
    args = parser.parse_args()

    targets = json.loads(Path(args.targets).read_text())["elements"]

    rows = []
    for path in sorted(Path(args.inputs).glob("*.json")):
        raw = json.loads(path.read_text())
        if raw.get("status") != "ok":
            continue
        elem = raw["element"]
        func = raw["functional"]
        target_key = f"T{func}_0K"
        target = targets[elem][target_key]
        pred = [raw["c11"], raw["c12"], raw["c44"]]
        rows.append(
            {
                "element": elem,
                "model": raw["model"],
                "functional": func,
                "model_name": raw["model_name"],
                "lattice_a": raw["lattice_a"],
                "c11": raw["c11"],
                "c12": raw["c12"],
                "c44": raw["c44"],
                "target_c11": target[0],
                "target_c12": target[1],
                "target_c44": target[2],
                "mae_cij": round(mae(pred, target), 2),
            }
        )

    report = {
        "schema_version": "lupine.benchmark.layer2.v1",
        "n_tasks": len(rows),
        "rows": rows,
        "summary": {},
    }

    if rows:
        for func in ["PBE", "r2SCAN"]:
            func_rows = [r for r in rows if r["functional"] == func]
            if func_rows:
                model_means = {
                    model: round(np.mean([r["mae_cij"] for r in func_rows if r["model"] == model]), 2)
                    for model in sorted({r["model"] for r in func_rows})
                }
                report["summary"][func] = {
                    "mean_mae_cij": round(np.mean([r["mae_cij"] for r in func_rows]), 2),
                    "model_mean_mae_cij": model_means,
                    "best_model": min(model_means, key=model_means.get),
                }
        overall_means = {
            model: round(np.mean([r["mae_cij"] for r in rows if r["model"] == model]), 2)
            for model in sorted({r["model"] for r in rows})
        }
        report["summary"]["overall_mean_mae_cij"] = round(np.mean([r["mae_cij"] for r in rows]), 2)
        report["summary"]["overall_model_mean_mae_cij"] = overall_means
        report["summary"]["overall_best_model"] = min(overall_means, key=overall_means.get)

    out = Path(args.output)
    out.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
