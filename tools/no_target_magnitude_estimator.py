#!/usr/bin/env python3
"""No-target magnitude estimator for the shared-bias correction operator.

The shared bias direction is precomputed from a calibration set. At deployment we
do not know the reference target, so we estimate the scalar correction magnitude
for each case from the inconsistency between the model's prediction and the
consensus of the other models along the bias direction.

Validation is leave-one-element-out per functional: the bias direction and the
magnitude regression are fitted without the held-out element.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np

# Periodic-table lookup for the 16 cubic elements used in the benchmark.
ELEMENT_PT = {
    "Ag": (5, 11), "Al": (3, 13), "Au": (6, 11), "Ca": (4, 2), "Cr": (4, 6),
    "Cu": (4, 11), "Fe": (4, 8), "Mo": (5, 6), "Nb": (5, 5), "Ni": (4, 10),
    "Pd": (5, 10), "Pt": (6, 10), "Sr": (5, 2), "Ta": (6, 5), "V": (4, 5),
    "W": (6, 6),
}


def one_hot(value, categories):
    return np.array([1.0 if value == c else 0.0 for c in categories], dtype=float)

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "benchmark_layer2_3x3x3_summary.json"

COLUMNS = ["c11", "c12", "c44"]
TARGET_COLUMNS = ["target_c11", "target_c12", "target_c44"]


def load_rows():
    return json.loads(DATA.read_text())["rows"]


def vec(row, cols):
    return np.array([row[c] for c in cols], dtype=float)


def functional_bias_direction(rows, functional):
    """First principal component of residual vectors for one functional."""
    residuals = []
    for r in rows:
        if r["functional"] != functional:
            continue
        residuals.append(vec(r, COLUMNS) - vec(r, TARGET_COLUMNS))
    if not residuals:
        return None
    R = np.stack(residuals)
    # PCA via SVD; return dominant right singular vector.
    _, _, Vt = np.linalg.svd(R, full_matrices=False)
    b = Vt[0]
    return b / np.linalg.norm(b)


def consensus_corrected_mae(test_rows, b, lambdas):
    """For a grid of shrinkage factors, return the mean MAE over test_rows."""
    if not test_rows:
        return None
    records = []
    for r in test_rows:
        y_i = vec(r, COLUMNS)
        others = [rr for rr in test_rows if rr["model"] != r["model"]]
        if not others:
            continue
        y_consensus = np.mean(np.stack([vec(rr, COLUMNS) for rr in others]), axis=0)
        target = vec(r, TARGET_COLUMNS)
        alpha = float(np.dot(y_i - y_consensus, b))
        records.append((y_i, target, alpha))

    best = None
    for lam in lambdas:
        mae = np.mean([
            np.mean(np.abs((y_i - lam * alpha * b) - target))
            for y_i, target, alpha in records
        ])
        if best is None or mae < best[0]:
            best = (mae, lam)
    return best


def build_features(r, test_rows, b):
    """Target-free feature vector for predicting alpha."""
    y_i = vec(r, COLUMNS)
    others = [rr for rr in test_rows if rr["model"] != r["model"]]
    y_consensus = (
        np.mean(np.stack([vec(rr, COLUMNS) for rr in others]), axis=0)
        if others else y_i
    )
    alpha_consensus = float(np.dot(y_i - y_consensus, b))
    period, group = ELEMENT_PT.get(r["element"], (0, 0))
    return np.concatenate([
        np.array([alpha_consensus, period, group]),
        one_hot(r["model"], ["CHGNet", "M3GNet", "TensorNet", "QET"]),
        one_hot(r["functional"], ["PBE", "r2SCAN"]),
    ])


def ridge_fit(X, y, lam=1.0):
    """Closed-form ridge regression (with intercept via augmented column)."""
    X1 = np.column_stack([np.ones(len(X)), X])
    I = np.eye(X1.shape[1])
    I[0, 0] = 0.0  # do not regularize intercept
    return np.linalg.solve(X1.T @ X1 + lam * I, X1.T @ np.array(y))


def ridge_predict(X, beta):
    X1 = np.column_stack([np.ones(len(X)), X])
    return X1 @ beta


def leave_one_element_out(rows):
    """For each element and functional, estimate magnitude without using that
    element's target, apply the correction, and return per-case MAEs."""
    elements = sorted({r["element"] for r in rows})
    functionals = sorted({r["functional"] for r in rows})
    models = sorted({r["model"] for r in rows})

    results = []
    for func in functionals:
        for el in elements:
            calib = [r for r in rows if r["functional"] == func and r["element"] != el]
            test = [r for r in rows if r["functional"] == func and r["element"] == el]
            if not calib or not test:
                continue
            b = functional_bias_direction(calib, func)
            if b is None:
                continue

            # Tune shrinkage factor on calibration set (uses targets, but only for
            # hyper-parameter selection; the per-case alpha itself is target-free).
            tune = consensus_corrected_mae(calib, b, np.linspace(0, 2, 41))
            lambda_star = 1.0 if tune is None else tune[1]

            # Ridge regression: learn to predict the oracle alpha from target-free
            # features (model, functional, period/group, consensus alpha).
            calib_by_element = {}
            for rr in calib:
                calib_by_element.setdefault(rr["element"], []).append(rr)
            X_cal = np.stack([
                build_features(rr, calib_by_element[rr["element"]], b) for rr in calib
            ])
            y_cal = np.array([
                float(np.dot(vec(rr, COLUMNS) - vec(rr, TARGET_COLUMNS), b)) for rr in calib
            ])
            try:
                beta = ridge_fit(X_cal, y_cal, lam=1.0)
            except np.linalg.LinAlgError:
                beta = None

            test_by_element = {r2["element"]: [r2] for r2 in test}

            # Build consensus (mean of other models) per test case.
            for r in test:
                y_i = vec(r, COLUMNS)
                others = [
                    rr for rr in test
                    if rr["model"] != r["model"]
                ]
                if not others:
                    continue
                y_consensus = np.mean(np.stack([vec(rr, COLUMNS) for rr in others]), axis=0)
                target = vec(r, TARGET_COLUMNS)

                # Oracle magnitude (uses target; ceiling).
                alpha_oracle = float(np.dot(y_i - target, b))
                y_oracle = y_i - alpha_oracle * b
                mae_oracle = float(np.mean(np.abs(y_oracle - target)))

                # No-target magnitude estimators.
                alpha_consensus = float(np.dot(y_i - y_consensus, b))
                y_consensus_corr = y_i - alpha_consensus * b
                mae_consensus = float(np.mean(np.abs(y_consensus_corr - target)))

                # Tuned shrinkage of the consensus magnitude.
                y_tuned = y_i - lambda_star * alpha_consensus * b
                mae_tuned = float(np.mean(np.abs(y_tuned - target)))

                # Ridge-predicted magnitude (target-free at test time).
                if beta is not None:
                    feat = build_features(r, test_by_element[r["element"]], b).reshape(1, -1)
                    alpha_ridge = float(ridge_predict(feat, beta)[0])
                    y_ridge = y_i - alpha_ridge * b
                    mae_ridge = float(np.mean(np.abs(y_ridge - target)))
                else:
                    alpha_ridge = 0.0
                    mae_ridge = raw_mae

                # Simple signed-projection of the residual against the raw prediction norm.
                alpha_norm = float(np.dot(y_i, b))  # crude: assume target is zero along b
                y_norm_corr = y_i - alpha_norm * b
                mae_norm = float(np.mean(np.abs(y_norm_corr - target)))

                raw_mae = float(np.mean(np.abs(y_i - target)))

                results.append({
                    "element": el,
                    "model": r["model"],
                    "functional": func,
                    "raw_mae": raw_mae,
                    "oracle_mae": mae_oracle,
                    "consensus_mae": mae_consensus,
                    "tuned_mae": mae_tuned,
                    "lambda_star": lambda_star,
                    "ridge_mae": mae_ridge,
                    "alpha_ridge": alpha_ridge,
                    "norm_mae": mae_norm,
                    "alpha_oracle": alpha_oracle,
                    "alpha_consensus": alpha_consensus,
                    "alpha_norm": alpha_norm,
                })
    return results


def main():
    rows = load_rows()
    results = leave_one_element_out(rows)

    print(f"Cases evaluated: {len(results)}")
    print(f"Mean raw MAE:    {np.mean([r['raw_mae'] for r in results]):.3f} GPa")
    print(f"Mean oracle MAE: {np.mean([r['oracle_mae'] for r in results]):.3f} GPa")
    print(f"Mean consensus MAE: {np.mean([r['consensus_mae'] for r in results]):.3f} GPa")
    print(f"Mean tuned consensus MAE: {np.mean([r['tuned_mae'] for r in results]):.3f} GPa")
    print(f"Mean ridge MAE: {np.mean([r['ridge_mae'] for r in results]):.3f} GPa")
    print(f"Mean norm-projection MAE: {np.mean([r['norm_mae'] for r in results]):.3f} GPa")

    harm_consensus = sum(1 for r in results if r['consensus_mae'] > r['raw_mae'] + 1e-6)
    harm_tuned = sum(1 for r in results if r['tuned_mae'] > r['raw_mae'] + 1e-6)
    harm_ridge = sum(1 for r in results if r['ridge_mae'] > r['raw_mae'] + 1e-6)
    harm_norm = sum(1 for r in results if r['norm_mae'] > r['raw_mae'] + 1e-6)
    print(f"No-harm violations (consensus): {harm_consensus}/{len(results)}")
    print(f"No-harm violations (tuned): {harm_tuned}/{len(results)}")
    print(f"No-harm violations (ridge): {harm_ridge}/{len(results)}")
    print(f"No-harm violations (norm): {harm_norm}/{len(results)}")

    # Per-functional breakdown.
    print("\nPer-functional MAE:")
    for func in sorted({r['functional'] for r in results}):
        subset = [r for r in results if r['functional'] == func]
        print(f"  {func}: raw {np.mean([r['raw_mae'] for r in subset]):.3f} -> "
              f"tuned {np.mean([r['tuned_mae'] for r in subset]):.3f} "
              f"(consensus {np.mean([r['consensus_mae'] for r in subset]):.3f}, "
              f"oracle {np.mean([r['oracle_mae'] for r in subset]):.3f})")

    # Save results.
    out = ROOT / "data" / "no_target_magnitude_results.json"
    out.write_text(json.dumps({"schema": "lupine.no_target_magnitude.v1", "results": results}, indent=2))
    print(f"\nSaved: {out}")


if __name__ == "__main__":
    main()
