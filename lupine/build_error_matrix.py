#!/usr/bin/env python3
"""
Build the LAMMPS 0K Evaluation Grid and compute error matrices against 0K DFT targets.

This script:
1. Loads existing MLIP results from mlip_immi/ (MACE-MP-0, CHGNet, Orb-v3, etc.)
2. Loads the 0K DFT targets (PBE and r2SCAN) from targets_0K.json
3. Computes error vectors e_i = y_pred - T_0K for each model against each target
4. Saves the error matrix for Lupine engine processing (PCA, PR, bias extraction)
5. Also computes classical EAM/MEAM errors from nist_benchmark.csv if available

Output: lupine/data/lammps_outputs/error_matrix_0K.json
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Dict, List, Any
import numpy as np

# Paths
LUPINE_DIR = Path(__file__).parent
ROOT_DIR = LUPINE_DIR.parent
MLIP_DIR = ROOT_DIR / "mlip_immi"
TARGETS_PATH = LUPINE_DIR / "targets_0K.json"
NIST_CSV = ROOT_DIR / "nist_benchmark.csv"

# Elements in canonical order
ELEMENTS = ["Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb",
            "Fe", "Cr", "Mo", "W", "V", "Nb", "Ta"]


def load_targets() -> dict:
    with open(TARGETS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def load_mlip_results(model_name: str) -> dict:
    """Load a JSON result file from mlip_immi/."""
    json_name = model_name.replace("-", "_") + "_immi_results.json"
    path = MLIP_DIR / json_name
    if not path.exists():
        # Try alternate naming
        alt_names = [
            model_name.replace("-", "_") + "_immi_results.json",
            model_name.replace("-", "_") + "_immi_results.json",
        ]
        for alt in alt_names:
            path = MLIP_DIR / alt
            if path.exists():
                break
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def extract_predictions(data: dict) -> dict:
    """Extract {element: {C11, C12, C44}} from mlip_immi JSON."""
    preds = {}
    for r in data.get("results", []):
        el = r["element"]
        preds[el] = {
            "C11": r["C11"],
            "C12": r["C12"],
            "C44": r["C44"],
            "a0": r.get("a0_optimized", None),
        }
    return preds


def compute_errors(predictions: dict, targets: dict) -> dict:
    """Compute error vectors for each element."""
    errors = {}
    for el in ELEMENTS:
        if el not in predictions or el not in targets:
            continue
        pred = predictions[el]
        target = targets[el]
        errors[el] = {
            "e_C11": pred["C11"] - target["C11"],
            "e_C12": pred["C12"] - target["C12"],
            "e_C44": pred["C44"] - target["C44"],
            "e_a0": (pred["a0"] - target["a0_A"]) if pred["a0"] else None,
            "pred_C11": pred["C11"],
            "pred_C12": pred["C12"],
            "pred_C44": pred["C44"],
            "target_C11": target["C11"],
            "target_C12": target["C12"],
            "target_C44": target["C44"],
        }
    return errors


def build_error_matrix(all_errors: dict, target_type: str) -> dict:
    """
    Build the error matrix for Lupine processing.
    
    Returns dict with:
    - models: list of model names
    - elements: list of elements
    - error_matrix: (n_models x n_elements x 3) array of [e_C11, e_C12, e_C44]
    - flat_error_matrix: (n_models x 3*n_elements) flattened for PCA
    """
    models = sorted(all_errors.keys())
    n_models = len(models)
    n_elements = len(ELEMENTS)
    
    # 3D error matrix: (model, element, property)
    error_matrix = np.zeros((n_models, n_elements, 3))
    
    for i, model in enumerate(models):
        for j, el in enumerate(ELEMENTS):
            if el in all_errors[model]:
                e = all_errors[model][el]
                error_matrix[i, j, 0] = e["e_C11"]
                error_matrix[i, j, 1] = e["e_C12"]
                error_matrix[i, j, 2] = e["e_C44"]
    
    # Flatten to (n_models x 3*n_elements) for PCA
    flat_error_matrix = error_matrix.reshape(n_models, -1)
    
    return {
        "target_type": target_type,
        "models": models,
        "elements": ELEMENTS,
        "error_matrix_3d": error_matrix.tolist(),
        "error_matrix_flat": flat_error_matrix.tolist(),
        "shape": {
            "n_models": n_models,
            "n_elements": n_elements,
            "n_properties": 3,
            "flat_dim": 3 * n_elements,
        }
    }


def main():
    print("=" * 60)
    print("Lupine 0K Error Matrix Builder")
    print("=" * 60)
    
    # Load targets
    targets = load_targets()
    pbe_targets = targets["PBE_0K"]
    r2scan_targets = targets["r2SCAN_0K"]
    
    print(f"\nLoaded targets: {targets['metadata']['n_elements']} elements")
    print(f"  PBE 0K: {len(pbe_targets)} elements")
    print(f"  r2SCAN 0K: {len(r2scan_targets)} elements")
    
    # Discover available MLIP results
    available_models = []
    for model_name in ["mace-mp-0", "mace-mp-medium", "mace-mpa-0", 
                       "chgnet", "orb-v3", "orb-v3-direct", "orb-v2",
                       "pet-mad", "pet-mad-1.5"]:
        data = load_mlip_results(model_name)
        if data:
            available_models.append(model_name)
            print(f"  Found: {model_name} ({len(data.get('results', []))} elements)")
    
    print(f"\nTotal models available: {len(available_models)}")
    
    # Compute errors against PBE 0K
    print("\n" + "-" * 40)
    print("Computing errors against PBE 0K targets...")
    all_errors_pbe = {}
    for model in available_models:
        data = load_mlip_results(model)
        preds = extract_predictions(data)
        errors = compute_errors(preds, pbe_targets)
        all_errors_pbe[model] = errors
        
        # Print summary
        mse_c11 = np.mean([e["e_C11"]**2 for e in errors.values()])
        mse_c12 = np.mean([e["e_C12"]**2 for e in errors.values()])
        mse_c44 = np.mean([e["e_C44"]**2 for e in errors.values()])
        print(f"  {model:20s}: MSE(C11)={mse_c11:7.1f}, MSE(C12)={mse_c12:7.1f}, MSE(C44)={mse_c44:7.1f}")
    
    # Compute errors against r2SCAN 0K
    print("\n" + "-" * 40)
    print("Computing errors against r2SCAN 0K targets...")
    all_errors_r2scan = {}
    for model in available_models:
        data = load_mlip_results(model)
        preds = extract_predictions(data)
        errors = compute_errors(preds, r2scan_targets)
        all_errors_r2scan[model] = errors
        
        mse_c11 = np.mean([e["e_C11"]**2 for e in errors.values()])
        mse_c12 = np.mean([e["e_C12"]**2 for e in errors.values()])
        mse_c44 = np.mean([e["e_C44"]**2 for e in errors.values()])
        print(f"  {model:20s}: MSE(C11)={mse_c11:7.1f}, MSE(C12)={mse_c12:7.1f}, MSE(C44)={mse_c44:7.1f}")
    
    # Build error matrices
    print("\n" + "-" * 40)
    print("Building error matrices for Lupine engine...")
    
    error_matrix_pbe = build_error_matrix(all_errors_pbe, "PBE_0K")
    error_matrix_r2scan = build_error_matrix(all_errors_r2scan, "r2SCAN_0K")
    
    # Save comprehensive output
    output = {
        "metadata": {
            "description": "0K LAMMPS error matrix for Lupine Correction Operator",
            "n_models": len(available_models),
            "n_elements": len(ELEMENTS),
            "models": available_models,
            "elements": ELEMENTS,
            "target_types": ["PBE_0K", "r2SCAN_0K"],
        },
        "raw_errors": {
            "PBE_0K": all_errors_pbe,
            "r2SCAN_0K": all_errors_r2scan,
        },
        "error_matrices": {
            "PBE_0K": error_matrix_pbe,
            "r2SCAN_0K": error_matrix_r2scan,
        }
    }
    
    out_dir = LUPINE_DIR / "data" / "lammps_outputs"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "error_matrix_0K.json"
    
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)
    
    print(f"\nWrote error matrix to {out_path}")
    print(f"  Models: {len(available_models)}")
    print(f"  Elements: {len(ELEMENTS)}")
    print(f"  Flat error dimension: {error_matrix_pbe['shape']['flat_dim']}")
    print(f"\nReady for Phase 3: Lupine engine processing (PCA, PR, bias extraction)")


if __name__ == "__main__":
    sys.exit(main() or 0)
