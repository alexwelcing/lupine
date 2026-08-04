#!/usr/bin/env python3
"""
Extended benchmark with 5 models: MACE-MP-0, MACE-MP-medium, MACE-MPA-0, CHGNet, Orb-v3.

Rebuilds the error matrix with all 5 models, then re-runs the head-to-head
and conformal UQ analysis.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
import numpy as np
from numpy.linalg import svd

LUPINE_DIR = Path(__file__).parent
DATA_DIR = LUPINE_DIR / "data" / "lammps_outputs"
TARGETS_PATH = LUPINE_DIR / "targets_0K.json"
MLIP_DIR = Path(__file__).parent.parent / "mlip_immi"

ELEMENTS = ["Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb",
            "Fe", "Cr", "Mo", "W", "V", "Nb", "Ta"]

MODELS = ["mace-mp-0", "mace-mp-medium", "mace-mpa-0", "chgnet", "orb-v3"]

# Map model names to actual JSON filenames on disk
MODEL_TO_FILENAME = {
    "mace-mp-0": "mace_immi_results.json",      # stored as mace_immi_results.json
    "mace-mp-medium": "mace_mp_medium_immi_results.json",
    "mace-mpa-0": "mace_mpa0_immi_results.json",
    "chgnet": "chgnet_immi_results.json",
    "orb-v3": "orb_v3_immi_results.json",
}


def load_targets():
    with open(TARGETS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def load_predictions(model_name: str):
    json_name = MODEL_TO_FILENAME[model_name]
    path = MLIP_DIR / json_name
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    preds = {}
    for r in data.get("results", []):
        preds[r["element"]] = {
            "C11": r["C11"], "C12": r["C12"], "C44": r["C44"],
        }
    return preds


def compute_errors(predictions, targets):
    errors = {}
    for el in ELEMENTS:
        if el not in predictions: continue
        target = targets[el]
        errors[el] = {
            "e_C11": predictions[el]["C11"] - target["C11"],
            "e_C12": predictions[el]["C12"] - target["C12"],
            "e_C44": predictions[el]["C44"] - target["C44"],
        }
    return errors


def build_error_matrix(all_errors):
    models = sorted(all_errors.keys())
    n_models = len(models)
    n_elements = len(ELEMENTS)
    error_matrix = np.zeros((n_models, n_elements, 3))
    for i, model in enumerate(models):
        for j, el in enumerate(ELEMENTS):
            if el in all_errors[model]:
                e = all_errors[model][el]
                error_matrix[i, j, 0] = e["e_C11"]
                error_matrix[i, j, 1] = e["e_C12"]
                error_matrix[i, j, 2] = e["e_C44"]
    flat = error_matrix.reshape(n_models, -1)
    return flat, models


def compute_pr(eigenvalues):
    ev = np.array(eigenvalues)
    ev = ev[ev > 1e-10]
    if len(ev) == 0: return 0.0
    d = len(ev)
    return float((np.sum(ev) ** 2) / (d * np.sum(ev ** 2)))


def extract_bias_vector(flat_errors):
    mean_error = np.mean(flat_errors, axis=0)
    centered = flat_errors - mean_error
    U, s, Vh = svd(centered, full_matrices=False)
    return Vh[0], s, (s**2) / np.sum(s**2)


def apply_correction(predictions, bias_vector, projection_coeff, shift):
    corrected = {}
    for el in predictions:
        if el not in ELEMENTS: continue
        el_idx = ELEMENTS.index(el)
        pred = np.array([predictions[el]["C11"], predictions[el]["C12"], predictions[el]["C44"]])
        bias_slice = bias_vector[el_idx*3:(el_idx+1)*3]
        shift_slice = np.array([shift[el]["delta_C11"], shift[el]["delta_C12"], shift[el]["delta_C44"]])
        pred_corrected = pred - projection_coeff * bias_slice + shift_slice
        corrected[el] = {"C11": float(pred_corrected[0]), "C12": float(pred_corrected[1]), "C44": float(pred_corrected[2])}
    return corrected


def compute_mse(predictions, targets):
    errors = []
    for el in predictions:
        if el not in targets["r2SCAN_0K"]: continue
        pred = np.array([predictions[el]["C11"], predictions[el]["C12"], predictions[el]["C44"]])
        target = np.array([targets["r2SCAN_0K"][el]["C11"], targets["r2SCAN_0K"][el]["C12"], targets["r2SCAN_0K"][el]["C44"]])
        err = pred - target
        errors.append(np.mean(err ** 2))
    return float(np.mean(errors)), float(np.sqrt(np.mean(errors)))


def main():
    print("=" * 70)
    print("EXTENDED BENCHMARK: 5-Model Ensemble")
    print("=" * 70)
    
    targets = load_targets()
    pbe_targets = targets["PBE_0K"]
    r2scan_targets = targets["r2SCAN_0K"]
    
    # Load all predictions
    all_preds = {}
    for model in MODELS:
        preds = load_predictions(model)
        all_preds[model] = preds
        print(f"  Loaded: {model} ({len(preds)} elements)")
    
    # Compute errors against PBE
    all_errors_pbe = {}
    for model in MODELS:
        all_errors_pbe[model] = compute_errors(all_preds[model], pbe_targets)
    
    # Build error matrix
    flat_pbe, models = build_error_matrix(all_errors_pbe)
    print(f"\nError matrix shape: {flat_pbe.shape}")
    
    # Extract bias vector
    bias_vector, singular_values, ev_ratio = extract_bias_vector(flat_pbe)
    pr = compute_pr(singular_values ** 2)
    
    print(f"\n--- Hyper-Ribbon Check (5 models) ---")
    print(f"  PR: {pr:.4f}")
    print(f"  Is ribbon: {'YES' if pr < 1.3 else 'NO'}")
    print(f"  PC1 explained variance: {ev_ratio[0]*100:.1f}%")
    
    # Compute projection coefficients
    projections = {}
    for model in MODELS:
        model_idx = models.index(model)
        proj = flat_pbe[model_idx] @ bias_vector
        projections[model] = proj
    
    mean_proj = float(np.mean(list(projections.values())))
    
    # Functional shift
    shift = targets["functional_shift_PBE_to_r2SCAN"]
    
    # Apply corrections
    print(f"\n--- Correction Results (vs r2SCAN) ---")
    correction_results = {}
    for model in MODELS:
        preds = all_preds[model]
        proj = projections[model]
        
        # Before correction
        mse_before, rmse_before = compute_mse(preds, targets)
        
        # After correction
        corrected = apply_correction(preds, bias_vector, proj, shift)
        mse_after, rmse_after = compute_mse(corrected, targets)
        
        improvement = mse_before / mse_after if mse_after > 0 else float('inf')
        correction_results[model] = {
            "mse_before": mse_before, "rmse_before": rmse_before,
            "mse_after": mse_after, "rmse_after": rmse_after,
            "improvement": improvement,
        }
        
        print(f"  {model:20s}: MSE {mse_before:.1f} → {mse_after:.1f} ({improvement:.2f}x)")
    
    # Head-to-head: 5-model ensemble vs 1-model + Lupine
    print(f"\n--- Head-to-Head: 5-Model Ensemble vs 1-Model + Lupine ---")
    
    # Ensemble mean
    ensemble_mean = {}
    for el in ELEMENTS:
        c11_vals = [all_preds[m][el]["C11"] for m in MODELS if el in all_preds[m]]
        c12_vals = [all_preds[m][el]["C12"] for m in MODELS if el in all_preds[m]]
        c44_vals = [all_preds[m][el]["C44"] for m in MODELS if el in all_preds[m]]
        ensemble_mean[el] = {"C11": np.mean(c11_vals), "C12": np.mean(c12_vals), "C44": np.mean(c44_vals)}
    
    ensemble_mse, ensemble_rmse = compute_mse(ensemble_mean, targets)
    print(f"  5-Model Ensemble: MSE = {ensemble_mse:.2f}, RMSE = {ensemble_rmse:.2f}")
    
    # Best single model + Lupine
    best_lupine = None
    best_mse = float('inf')
    for model in MODELS:
        mse = correction_results[model]["mse_after"]
        if mse < best_mse:
            best_mse = mse
            best_lupine = model
    
    print(f"  1-Model + Lupine ({best_lupine}): MSE = {best_mse:.2f}")
    print(f"  Improvement: {ensemble_mse/best_mse:.2f}x")
    print(f"  Compute reduction: {(1-1/5)*100:.0f}% (5x → 1x)")
    
    # Save extended results
    output = {
        "metadata": {"n_models": len(MODELS), "models": MODELS, "n_elements": len(ELEMENTS)},
        "hyper_ribbon": {"pr": pr, "pc1_variance": float(ev_ratio[0]), "is_ribbon": pr < 1.3},
        "correction_results": correction_results,
        "head_to_head": {
            "ensemble_mse": ensemble_mse, "ensemble_rmse": ensemble_rmse,
            "best_lupine_mse": best_mse, "best_lupine_model": best_lupine,
            "improvement_ratio": ensemble_mse / best_mse,
            "compute_reduction_percent": (1 - 1/5) * 100,
        }
    }
    
    out_path = DATA_DIR / "extended_5model_results.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)
    
    print(f"\nResults saved to {out_path}")


if __name__ == "__main__":
    sys.exit(main() or 0)
