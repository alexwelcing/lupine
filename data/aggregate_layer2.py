#!/usr/bin/env python3
"""Aggregate Round-2 Layer-2 MLIP raw results into a comparison report."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np


def mae(pred, target):
    return float(np.mean(np.abs(np.array(pred) - np.array(target))))


def first_pc_unit(matrix: np.ndarray) -> np.ndarray:
    """First principal component (unit vector) of an observation matrix.

    matrix shape: (n_observations, 3); rows are residuals, columns C11/C12/C44.
    Matches atlas-distill mlip-correct: first row of V^T from SVD, normalized.
    """
    if matrix.shape[0] < 2:
        return np.array([1.0, 0.0, 0.0])
    _, _, vh = np.linalg.svd(matrix, full_matrices=False)
    pc = vh[0]
    norm = float(np.linalg.norm(pc))
    return pc / norm if norm > 0 else pc


def participation_ratio(singular_values: np.ndarray) -> float:
    s = singular_values
    if len(s) == 0:
        return 0.0
    sum_sq = float(np.sum(s ** 2))
    total = float(np.sum(s))
    if sum_sq == 0.0:
        return 0.0
    return (total * total) / (len(s) * sum_sq)


def apply_1d_correction(rows: list[dict]) -> dict:
    """Add 1-D Lupine-corrected Cij and MAE to every row, plus correction metadata."""
    correction_meta = []
    for func in ["PBE", "r2SCAN"]:
        func_rows = [r for r in rows if r["functional"] == func]
        if not func_rows:
            continue
        pred = np.array([[r["c11"], r["c12"], r["c44"]] for r in func_rows])
        target = np.array([[r["target_c11"], r["target_c12"], r["target_c44"]] for r in func_rows])
        residual = target - pred
        bias = first_pc_unit(residual)
        # SVD on residual matrix for diagnostics.
        _, s, _ = np.linalg.svd(residual, full_matrices=False)
        pr = participation_ratio(s)
        first_pc_var = float(s[0] ** 2 / np.sum(s ** 2)) if len(s) else 0.0
        alpha = np.einsum("ij,j->i", residual, bias)
        corrected = pred + alpha[:, None] * bias
        corrected_mae = np.mean(np.abs(corrected - target), axis=1)
        raw_mae = np.mean(np.abs(pred - target), axis=1)
        no_harm_violations = int(np.sum(np.linalg.norm(corrected - target, axis=1) > np.linalg.norm(pred - target, axis=1) + 1e-9))
        for i, r in enumerate(func_rows):
            r["raw_mae_cij"] = round(float(raw_mae[i]), 2)
            r["corrected_c11"] = round(float(corrected[i, 0]), 2)
            r["corrected_c12"] = round(float(corrected[i, 1]), 2)
            r["corrected_c44"] = round(float(corrected[i, 2]), 2)
            r["corrected_mae_cij"] = round(float(corrected_mae[i]), 2)
        model_raw = {
            model: round(float(np.mean([raw_mae[i] for i, r in enumerate(func_rows) if r["model"] == model])), 2)
            for model in sorted({r["model"] for r in func_rows})
        }
        model_corr = {
            model: round(float(np.mean([corrected_mae[i] for i, r in enumerate(func_rows) if r["model"] == model])), 2)
            for model in sorted({r["model"] for r in func_rows})
        }
        correction_meta.append(
            {
                "functional": func,
                "bias_vector": bias.tolist(),
                "participation_ratio": round(pr, 6),
                "first_pc_variance_fraction": round(first_pc_var, 6),
                "no_harm_violations": no_harm_violations,
                "mean_mae_cij": round(float(np.mean(raw_mae)), 2),
                "corrected_mean_mae_cij": round(float(np.mean(corrected_mae)), 2),
                "model_mean_mae_cij": model_raw,
                "model_corrected_mean_mae_cij": model_corr,
            }
        )
    return {"per_functional": correction_meta}


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

    correction = apply_1d_correction(rows)

    report = {
        "schema_version": "lupine.benchmark.layer2.v1",
        "n_tasks": len(rows),
        "certification_status": "corrected Cij values and aggregates are uncertified correction diagnostics; derived elastic maps require a separate vector-valued license",
        "rows": rows,
        "summary": {},
        "correction": {
            "schema_version": "lupine.benchmark.correction.v1",
            "method": "1-D Lupine projection correction (atlas-distill mlip-correct)",
            "description": "In-sample upper bound: a single first-principal-component bias vector is fit to all model residuals on each functional and projected onto each residual. Corrected = raw + alpha * bias; no-harm holds on the calibration set. Not a validated out-of-sample operator.",
            "certification_status": "uncertified aggregate: corrected Cij MAE is not a scalar correction license; every C11/C12/C44 target would need its own valid license, and derived elastic maps require a separate vector-valued license",
            "command": "atlas-distill mlip-correct --catalog data/benchmark_layer2_3x3x3_summary.json --training {functional} --target {functional}",
            "per_functional": correction["per_functional"],
        },
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
                # Add corrected summary block for this functional.
                corr_block = next((c for c in correction["per_functional"] if c["functional"] == func), None)
                if corr_block:
                    report["summary"][f"{func}_corrected"] = {
                        "certification_status": "uncertified aggregate",
                        "mean_mae_cij": corr_block["corrected_mean_mae_cij"],
                        "model_mean_mae_cij": corr_block["model_corrected_mean_mae_cij"],
                        "best_model": min(corr_block["model_corrected_mean_mae_cij"], key=corr_block["model_corrected_mean_mae_cij"].get),
                    }
        overall_means = {
            model: round(np.mean([r["mae_cij"] for r in rows if r["model"] == model]), 2)
            for model in sorted({r["model"] for r in rows})
        }
        report["summary"]["overall_mean_mae_cij"] = round(np.mean([r["mae_cij"] for r in rows]), 2)
        report["summary"]["overall_model_mean_mae_cij"] = overall_means
        report["summary"]["overall_best_model"] = min(overall_means, key=overall_means.get)
        corrected_overall = {
            model: round(np.mean([r["corrected_mae_cij"] for r in rows if r["model"] == model]), 2)
            for model in sorted({r["model"] for r in rows})
        }
        report["summary"]["overall_corrected"] = {
            "certification_status": "uncertified aggregate",
            "mean_mae_cij": round(np.mean([r["corrected_mae_cij"] for r in rows]), 2),
            "model_mean_mae_cij": corrected_overall,
            "best_model": min(corrected_overall, key=corrected_overall.get),
        }
        report["correction"]["overall"] = {
            "mean_mae_cij": report["summary"]["overall_mean_mae_cij"],
            "corrected_mean_mae_cij": report["summary"]["overall_corrected"]["mean_mae_cij"],
            "model_mean_mae_cij": overall_means,
            "model_corrected_mean_mae_cij": corrected_overall,
        }

    out = Path(args.output)
    out.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
