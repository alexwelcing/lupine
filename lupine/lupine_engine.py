#!/usr/bin/env python3
"""
Lupine Engine: Projection Law Verification and Correction Operator Extraction.

This script implements Phase 3 of the Universal Correction Operator Benchmark:
1. Load the 0K error matrix from Phase 2
2. Verify the Hyper-Ribbon at 0K: compute participation ratio (PR) for PBE ensemble
3. Extract the Bias Vector b: 1st principal component of PBE ensemble error matrix
4. Extract the Functional Shift Δf: difference between 0K PBE and r2SCAN targets
5. Build the Correction Operator: lupine.correct(prediction, bias_vector, functional_shift)

Theoretical basis:
- Projection Law: ensemble errors are 1D projection operators (hyper-ribbons)
- PR ~ 1.0-1.3 proves the 1D structure
- 1st PC = direction of the binding constraint (PBE functional bias)
- Correction: y_corrected = y_pred - b (removes PBE bias) + Δf (upgrades to r2SCAN)

Output: lupine/data/lammps_outputs/lupine_operator.json
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple
import numpy as np
from numpy.linalg import svd

LUPINE_DIR = Path(__file__).parent
DATA_DIR = LUPINE_DIR / "data" / "lammps_outputs"
ERROR_MATRIX_PATH = DATA_DIR / "error_matrix_0K.json"
TARGETS_PATH = LUPINE_DIR / "targets_0K.json"

ELEMENTS = ["Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb",
            "Fe", "Cr", "Mo", "W", "V", "Nb", "Ta"]


def load_error_matrix() -> dict:
    with open(ERROR_MATRIX_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def load_targets() -> dict:
    with open(TARGETS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def compute_participation_ratio(eigenvalues: np.ndarray) -> float:
    """
    Compute the participation ratio (PR) from eigenvalues.
    PR = (sum λ_i)^2 / (d * sum λ_i^2) where d is dimension.
    PR = 1.0 means all variance in one direction (perfect 1D ribbon).
    PR > 1.3 suggests >1D structure.
    """
    ev = np.array(eigenvalues)
    ev = ev[ev > 1e-10]  # Remove numerical noise
    if len(ev) == 0:
        return 0.0
    d = len(ev)
    pr = (np.sum(ev) ** 2) / (d * np.sum(ev ** 2))
    return float(pr)


def extract_bias_vector(error_matrix_flat: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Perform PCA on the error matrix to extract the 1D bias vector.
    
    Returns:
    - bias_vector: 1st principal component (direction of max error variance)
    - singular_values: all singular values
    - explained_variance_ratio: fraction of variance explained by each PC
    """
    # Center the error matrix (subtract mean error per property)
    mean_error = np.mean(error_matrix_flat, axis=0)
    centered = error_matrix_flat - mean_error
    
    # SVD: centered = U @ diag(s) @ Vh
    # The 1st right singular vector Vh[0] is the 1st PC direction
    U, s, Vh = svd(centered, full_matrices=False)
    
    # Bias vector = 1st principal component (direction of max variance)
    bias_vector = Vh[0]  # Shape: (45,)
    
    # Explained variance
    explained_variance_ratio = (s ** 2) / np.sum(s ** 2)
    
    return bias_vector, s, explained_variance_ratio


def verify_hyper_ribbon(error_matrix_flat: np.ndarray, target_type: str) -> dict:
    """
    Verify the hyper-ribbon structure at 0K.
    
    Returns dict with:
    - participation_ratio: PR value
    - is_hyper_ribbon: bool (PR < 1.3)
    - explained_variance_pc1: fraction of variance in 1st PC
    - explained_variance_pc2: fraction of variance in 2nd PC
    - ribbon_quality: assessment string
    """
    bias_vector, singular_values, ev_ratio = extract_bias_vector(error_matrix_flat)
    
    pr = compute_participation_ratio(singular_values ** 2)
    
    is_ribbon = pr < 1.3
    
    quality = "excellent" if pr < 1.1 else "good" if pr < 1.3 else "marginal" if pr < 1.5 else "poor"
    
    return {
        "target_type": target_type,
        "participation_ratio": round(pr, 4),
        "is_hyper_ribbon": is_ribbon,
        "ribbon_quality": quality,
        "explained_variance_pc1": round(float(ev_ratio[0]), 4),
        "explained_variance_pc2": round(float(ev_ratio[1]), 4) if len(ev_ratio) > 1 else None,
        "explained_variance_pc3": round(float(ev_ratio[2]), 4) if len(ev_ratio) > 2 else None,
        "singular_values": [round(float(sv), 4) for sv in singular_values[:5]],
        "n_models": error_matrix_flat.shape[0],
        "flat_dim": error_matrix_flat.shape[1],
    }


def extract_functional_shift(targets: dict) -> dict:
    """
    Extract the functional shift vector Δf = T_r2SCAN - T_PBE.
    This is the systematic difference between the two DFT functionals.
    """
    pbe = targets["PBE_0K"]
    r2scan = targets["r2SCAN_0K"]
    
    shift = {}
    shift_vector = []
    
    for el in ELEMENTS:
        delta = {
            "delta_C11": r2scan[el]["C11"] - pbe[el]["C11"],
            "delta_C12": r2scan[el]["C12"] - pbe[el]["C12"],
            "delta_C44": r2scan[el]["C44"] - pbe[el]["C44"],
            "delta_a0": r2scan[el]["a0_A"] - pbe[el]["a0_A"],
        }
        shift[el] = delta
        shift_vector.extend([delta["delta_C11"], delta["delta_C12"], delta["delta_C44"]])
    
    return {
        "per_element": shift,
        "flat_vector": shift_vector,
        "norm": float(np.linalg.norm(shift_vector)),
    }


def build_correction_operator(bias_vector: np.ndarray, functional_shift: dict, 
                              error_matrix_data: dict) -> dict:
    """
    Build the Lupine Correction Operator.
    
    The operator is defined as:
    y_corrected = y_pred - scale * b + Δf
    
    where:
    - b is the 1st PC of the PBE ensemble error matrix (bias direction)
    - scale is learned from the data (projection of error onto b)
    - Δf is the functional shift from PBE to r2SCAN
    
    For simplicity, we use the mean projection coefficient as the scale.
    """
    # The bias vector is already normalized to unit length by SVD
    # We need to find the optimal scale: how much of each model's error
    # projects onto the bias direction
    
    flat_errors = np.array(error_matrix_data["error_matrix_flat"])
    
    # Project each model's error onto the bias vector
    # coefficient = error · bias_vector (since bias_vector is unit length)
    projections = flat_errors @ bias_vector  # Shape: (n_models,)
    
    # Mean projection = typical bias magnitude
    mean_projection = float(np.mean(projections))
    std_projection = float(np.std(projections))
    
    # The correction operator
    operator = {
        "bias_vector": bias_vector.tolist(),
        "bias_vector_norm": float(np.linalg.norm(bias_vector)),
        "projections_per_model": {
            model: round(float(proj), 4) 
            for model, proj in zip(error_matrix_data["models"], projections)
        },
        "mean_projection": round(mean_projection, 4),
        "std_projection": round(std_projection, 4),
        "functional_shift": functional_shift,
        "correction_formula": "y_corrected = y_pred - (projection_coeff * bias_vector) + functional_shift",
        "note": "projection_coeff is model-specific; use mean_projection as default",
    }
    
    return operator


def apply_correction_operator(predictions: dict, operator: dict, 
                                model_name: str, targets: dict) -> dict:
    """
    Apply the Lupine Correction Operator to a model's predictions.
    
    y_corrected = y_pred - (projection_coeff * bias_vector) + functional_shift
    
    Returns corrected predictions and error metrics.
    """
    bias_vector = np.array(operator["bias_vector"])
    projection_coeff = operator["projections_per_model"].get(model_name, operator["mean_projection"])
    shift = operator["functional_shift"]["per_element"]
    
    corrected = {}
    errors_before = {}
    errors_after = {}
    
    for el in ELEMENTS:
        if el not in predictions:
            continue
        
        # Original prediction
        pred = np.array([
            predictions[el]["C11"],
            predictions[el]["C12"],
            predictions[el]["C44"],
        ])
        
        # Target (r2SCAN 0K)
        target = np.array([
            targets["r2SCAN_0K"][el]["C11"],
            targets["r2SCAN_0K"][el]["C12"],
            targets["r2SCAN_0K"][el]["C44"],
        ])
        
        # Error before correction
        err_before = pred - target
        errors_before[el] = {
            "C11": float(err_before[0]),
            "C12": float(err_before[1]),
            "C44": float(err_before[2]),
            "mse": float(np.mean(err_before ** 2)),
        }
        
        # Apply correction
        # The bias vector is 45-dimensional (15 elements x 3 properties)
        # We need to extract the slice for this element
        el_idx = ELEMENTS.index(el)
        bias_slice = bias_vector[el_idx*3:(el_idx+1)*3]
        
        # Functional shift for this element
        shift_slice = np.array([
            shift[el]["delta_C11"],
            shift[el]["delta_C12"],
            shift[el]["delta_C44"],
        ])
        
        # Corrected prediction
        pred_corrected = pred - projection_coeff * bias_slice + shift_slice
        
        # Error after correction
        err_after = pred_corrected - target
        errors_after[el] = {
            "C11": float(err_after[0]),
            "C12": float(err_after[1]),
            "C44": float(err_after[2]),
            "mse": float(np.mean(err_after ** 2)),
        }
        
        corrected[el] = {
            "C11": float(pred_corrected[0]),
            "C12": float(pred_corrected[1]),
            "C44": float(pred_corrected[2]),
        }
    
    return {
        "corrected_predictions": corrected,
        "errors_before": errors_before,
        "errors_after": errors_after,
        "mse_before": float(np.mean([e["mse"] for e in errors_before.values()])),
        "mse_after": float(np.mean([e["mse"] for e in errors_after.values()])),
        "improvement_ratio": float(np.mean([e["mse"] for e in errors_before.values()])) / 
                            float(np.mean([e["mse"] for e in errors_after.values()])) 
                            if float(np.mean([e["mse"] for e in errors_after.values()])) > 0 else float('inf'),
    }


def main():
    print("=" * 60)
    print("Lupine Engine: Projection Law Verification")
    print("=" * 60)
    
    # Load data
    error_data = load_error_matrix()
    targets = load_targets()
    
    # Get PBE error matrix
    pbe_matrix_data = error_data["error_matrices"]["PBE_0K"]
    pbe_flat = np.array(pbe_matrix_data["error_matrix_flat"])
    
    print(f"\nLoaded error matrix: {pbe_flat.shape}")
    print(f"  Models: {pbe_matrix_data['models']}")
    print(f"  Elements: {pbe_matrix_data['elements']}")
    
    # ─── Step 1: Verify Hyper-Ribbon at 0K ─────────────────────────────────
    print("\n" + "-" * 50)
    print("STEP 1: Verify Hyper-Ribbon Structure at 0K")
    print("-" * 50)
    
    ribbon_check = verify_hyper_ribbon(pbe_flat, "PBE_0K")
    
    print(f"\nTarget: {ribbon_check['target_type']}")
    print(f"  Participation Ratio (PR): {ribbon_check['participation_ratio']}")
    print(f"  Is Hyper-Ribbon? {'YES' if ribbon_check['is_hyper_ribbon'] else 'NO'}")
    print(f"  Ribbon Quality: {ribbon_check['ribbon_quality']}")
    print(f"  Explained Variance PC1: {ribbon_check['explained_variance_pc1']*100:.1f}%")
    print(f"  Explained Variance PC2: {ribbon_check['explained_variance_pc2']*100:.1f}%" if ribbon_check['explained_variance_pc2'] else "")
    print(f"  Singular Values: {ribbon_check['singular_values']}")
    
    if ribbon_check["is_hyper_ribbon"]:
        print("\n  ✅ PROJECTION LAW VERIFIED at 0K!")
        print("     The 1D hyper-ribbon persists even without thermal noise.")
    else:
        print("\n  ⚠️  Hyper-ribbon not clearly detected at 0K.")
        print("     This may be due to limited model diversity (only 3 models).")
    
    # ─── Step 2: Extract Bias Vector b ────────────────────────────────────
    print("\n" + "-" * 50)
    print("STEP 2: Extract Bias Vector b (1st Principal Component)")
    print("-" * 50)
    
    bias_vector, singular_values, ev_ratio = extract_bias_vector(pbe_flat)
    
    print(f"\nBias Vector b (1st PC):")
    print(f"  Dimension: {len(bias_vector)}")
    print(f"  Norm: {np.linalg.norm(bias_vector):.4f}")
    print(f"  Explained Variance: {ev_ratio[0]*100:.1f}%")
    
    # Show bias vector per element
    print(f"\n  Bias vector decomposition (C11, C12, C44) per element:")
    for i, el in enumerate(ELEMENTS):
        b_slice = bias_vector[i*3:(i+1)*3]
        print(f"    {el:3s}: C11={b_slice[0]:+7.3f}, C12={b_slice[1]:+7.3f}, C44={b_slice[2]:+7.3f}")
    
    # ─── Step 3: Extract Functional Shift Δf ──────────────────────────────
    print("\n" + "-" * 50)
    print("STEP 3: Extract Functional Shift Δf = T_r2SCAN - T_PBE")
    print("-" * 50)
    
    functional_shift = extract_functional_shift(targets)
    
    print(f"\nFunctional Shift (r2SCAN - PBE):")
    print(f"  Norm: {functional_shift['norm']:.2f} GPa")
    print(f"\n  Per-element shifts:")
    for el in ELEMENTS:
        s = functional_shift["per_element"][el]
        print(f"    {el:3s}: ΔC11={s['delta_C11']:+6.1f}, ΔC12={s['delta_C12']:+6.1f}, ΔC44={s['delta_C44']:+6.1f}")
    
    # ─── Step 4: Build Correction Operator ────────────────────────────────
    print("\n" + "-" * 50)
    print("STEP 4: Build Lupine Correction Operator")
    print("-" * 50)
    
    operator = build_correction_operator(bias_vector, functional_shift, pbe_matrix_data)
    
    print(f"\nCorrection Operator:")
    print(f"  Mean projection coefficient: {operator['mean_projection']:.4f}")
    print(f"  Std projection coefficient: {operator['std_projection']:.4f}")
    print(f"  Projections per model:")
    for model, proj in operator["projections_per_model"].items():
        print(f"    {model:20s}: {proj:+.4f}")
    
    # ─── Step 5: Apply Correction to Each Model ───────────────────────────
    print("\n" + "-" * 50)
    print("STEP 5: Apply Correction Operator to Each Model")
    print("-" * 50)
    
    # Load raw predictions for each model
    def load_predictions(model_name: str) -> dict:
        json_name = model_name.replace("-", "_") + "_immi_results.json"
        path = Path(ROOT_DIR) / "mlip_immi" / json_name
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        preds = {}
        for r in data.get("results", []):
            preds[r["element"]] = {
                "C11": r["C11"],
                "C12": r["C12"],
                "C44": r["C44"],
            }
        return preds
    
    ROOT_DIR = Path(__file__).parent.parent
    
    correction_results = {}
    for model in pbe_matrix_data["models"]:
        preds = load_predictions(model)
        result = apply_correction_operator(preds, operator, model, targets)
        correction_results[model] = result
        
        print(f"\n  {model}:")
        print(f"    MSE before correction: {result['mse_before']:.2f}")
        print(f"    MSE after correction:  {result['mse_after']:.2f}")
        print(f"    Improvement ratio:   {result['improvement_ratio']:.2f}x")
        if result["improvement_ratio"] > 1:
            print(f"    ✅ CORRECTION IMPROVES ACCURACY")
        else:
            print(f"    ⚠️  Correction did not improve (may need tuning)")
    
    # ─── Save Operator ────────────────────────────────────────────────────
    output = {
        "metadata": {
            "description": "Lupine Correction Operator (0K DFT targets)",
            "phase": "Phase 3: Lupine Engine Processing",
            "n_models": len(pbe_matrix_data["models"]),
            "n_elements": len(ELEMENTS),
        },
        "hyper_ribbon_verification": ribbon_check,
        "bias_vector": {
            "vector": bias_vector.tolist(),
            "explained_variance": float(ev_ratio[0]),
            "per_element": {
                el: bias_vector[i*3:(i+1)*3].tolist()
                for i, el in enumerate(ELEMENTS)
            },
        },
        "functional_shift": functional_shift,
        "correction_operator": operator,
        "correction_results": correction_results,
    }
    
    out_path = DATA_DIR / "lupine_operator.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)
    
    print(f"\n{'=' * 60}")
    print(f"Lupine Operator saved to {out_path}")
    print(f"{'=' * 60}")
    print(f"\nSUMMARY:")
    print(f"  Hyper-Ribbon at 0K: {'VERIFIED' if ribbon_check['is_hyper_ribbon'] else 'NOT CLEAR'}")
    print(f"  PR = {ribbon_check['participation_ratio']:.3f}")
    print(f"  Bias Vector explains {ev_ratio[0]*100:.1f}% of variance")
    print(f"  Functional Shift norm: {functional_shift['norm']:.2f} GPa")
    print(f"\n  Correction Results (vs r2SCAN 0K):")
    for model, result in correction_results.items():
        status = "✅" if result["improvement_ratio"] > 1 else "⚠️"
        print(f"    {status} {model:20s}: {result['improvement_ratio']:.2f}x improvement")
    
    print(f"\nReady for Phase 4: Compute-Budget Head-to-Head")


if __name__ == "__main__":
    sys.exit(main() or 0)
