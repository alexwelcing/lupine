#!/usr/bin/env python3
"""
Lupine: The Universal Correction Operator for Atomistic Simulation.

This module implements the Lupine Correction Operator based on the Projection Law:
- Model errors organize onto a 1D hyper-ribbon determined by the training functional
- The 1st principal component of the ensemble error matrix IS the bias direction
- Applying a 1D correction + functional shift upgrades PBE-trained MLIPs to r2SCAN accuracy

Usage:
    from lupine import LupineOperator
    
    op = LupineOperator.from_json("data/lammps_outputs/lupine_operator.json")
    corrected = op.correct(predictions, model_name="orb-v3")
    
    # With uncertainty quantification
    corrected, interval = op.correct_with_uq(predictions, model_name="orb-v3", alpha=0.1)

The operator is pre-computed from the 15-element cubic metal benchmark and can be
applied to any PBE-trained MLIP prediction for these materials.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import numpy as np

# Default paths
DEFAULT_OPERATOR_PATH = Path(__file__).parent / "data" / "lammps_outputs" / "lupine_operator.json"
DEFAULT_TARGETS_PATH = Path(__file__).parent / "targets_0K.json"

ELEMENTS = ["Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb",
            "Fe", "Cr", "Mo", "W", "V", "Nb", "Ta"]


class LupineOperator:
    """
    The Lupine Correction Operator.
    
    Encapsulates the bias vector, functional shift, and projection coefficients
    needed to correct PBE-trained MLIP predictions to r2SCAN accuracy.
    """
    
    def __init__(self, operator_data: dict):
        """
        Initialize from operator JSON data.
        
        Args:
            operator_data: The 'correction_operator' dict from lupine_operator.json
        """
        self.bias_vector = np.array(operator_data["bias_vector"])
        self.projections = operator_data["projections_per_model"]
        self.mean_projection = operator_data["mean_projection"]
        self.functional_shift = operator_data["functional_shift"]["per_element"]
        
        # Validate
        assert len(self.bias_vector) == 45, f"Expected 45-dim bias vector, got {len(self.bias_vector)}"
    
    @classmethod
    def from_json(cls, path: str | Path = DEFAULT_OPERATOR_PATH) -> "LupineOperator":
        """Load operator from JSON file."""
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls(data["correction_operator"])
    
    def correct(self, predictions: dict, model_name: str | None = None) -> dict:
        """
        Apply the Lupine Correction Operator to predictions.
        
        Formula: y_corrected = y_pred - proj_coeff * b + Δf
        
        Args:
            predictions: Dict of {element: {C11, C12, C44}}
            model_name: Model name for model-specific projection coefficient.
                       If None, uses the mean projection coefficient.
        
        Returns:
            Dict of corrected predictions {element: {C11, C12, C44}}
        """
        proj_coeff = self.projections.get(model_name, self.mean_projection) if model_name else self.mean_projection
        
        corrected = {}
        for el in predictions:
            if el not in ELEMENTS:
                continue
            
            el_idx = ELEMENTS.index(el)
            pred = np.array([
                predictions[el]["C11"],
                predictions[el]["C12"],
                predictions[el]["C44"],
            ])
            
            bias_slice = self.bias_vector[el_idx*3:(el_idx+1)*3]
            shift_slice = np.array([
                self.functional_shift[el]["delta_C11"],
                self.functional_shift[el]["delta_C12"],
                self.functional_shift[el]["delta_C44"],
            ])
            
            pred_corrected = pred - proj_coeff * bias_slice + shift_slice
            
            corrected[el] = {
                "C11": float(pred_corrected[0]),
                "C12": float(pred_corrected[1]),
                "C44": float(pred_corrected[2]),
            }
        
        return corrected
    
    def correct_with_uq(self, predictions: dict, model_name: str | None = None,
                        alpha: float = 0.1) -> Tuple[dict, dict]:
        """
        Apply correction with conformal prediction uncertainty quantification.
        
        Args:
            predictions: Dict of {element: {C11, C12, C44}}
            model_name: Model name for model-specific projection coefficient
            alpha: Miscoverage rate (default 0.1 for 90% coverage)
        
        Returns:
            (corrected_predictions, uncertainty_intervals)
            where uncertainty_intervals = {element: {C11: (lower, upper), ...}}
        """
        corrected = self.correct(predictions, model_name)
        
        # Load pre-computed CP quantiles from conformal_uq_results.json
        cp_path = Path(__file__).parent / "data" / "lammps_outputs" / "conformal_uq_results.json"
        
        if cp_path.exists():
            with open(cp_path, "r", encoding="utf-8") as f:
                cp_data = json.load(f)
            
            # Get quantile for this model and alpha
            alpha_key = f"alpha_{alpha}"
            if alpha_key in cp_data["conformal_prediction"]:
                model_key = model_name or "orb-v3"  # default to best model
                cp_result = cp_data["conformal_prediction"][alpha_key].get(model_key, {})
                quantile = cp_result.get("quantile_value", 100.0)  # fallback
            else:
                quantile = 100.0
        else:
            quantile = 100.0
        
        intervals = {}
        for el in corrected:
            intervals[el] = {
                "C11": (corrected[el]["C11"] - quantile, corrected[el]["C11"] + quantile),
                "C12": (corrected[el]["C12"] - quantile, corrected[el]["C12"] + quantile),
                "C44": (corrected[el]["C44"] - quantile, corrected[el]["C44"] + quantile),
            }
        
        return corrected, intervals
    
    def compute_mse(self, predictions: dict, targets: dict, model_name: str | None = None) -> dict:
        """
        Compute MSE of corrected predictions against targets.
        
        Args:
            predictions: Dict of {element: {C11, C12, C44}}
            targets: Dict of {element: {C11, C12, C44}} (e.g., r2SCAN_0K)
            model_name: Model name for model-specific projection coefficient
        
        Returns:
            Dict with MSE, RMSE, per-element errors
        """
        corrected = self.correct(predictions, model_name)
        
        errors = []
        per_element = {}
        
        for el in corrected:
            if el not in targets:
                continue
            
            pred = np.array([
                corrected[el]["C11"],
                corrected[el]["C12"],
                corrected[el]["C44"],
            ])
            
            target = np.array([
                targets[el]["C11"],
                targets[el]["C12"],
                targets[el]["C44"],
            ])
            
            err = pred - target
            mse_el = float(np.mean(err ** 2))
            
            errors.append(mse_el)
            per_element[el] = {
                "C11_error": float(err[0]),
                "C12_error": float(err[1]),
                "C44_error": float(err[2]),
                "mse": mse_el,
            }
        
        return {
            "mse_overall": float(np.mean(errors)),
            "rmse_overall": float(np.sqrt(np.mean(errors))),
            "per_element": per_element,
        }


def demo():
    """Demonstrate the Lupine Correction Operator."""
    print("=" * 60)
    print("Lupine Correction Operator Demo")
    print("=" * 60)
    
    # Load operator
    op = LupineOperator.from_json()
    print("\n✅ Loaded Lupine Operator")
    print(f"   Bias vector dimension: {len(op.bias_vector)}")
    print(f"   Available models: {list(op.projections.keys())}")
    
    # Example: correct Orb-v3 predictions for Cu
    example_preds = {
        "Cu": {"C11": 151.06, "C12": 118.21, "C44": 65.80},
    }
    
    corrected = op.correct(example_preds, model_name="orb-v3")
    
    print(f"\n📊 Example: Correcting Orb-v3 prediction for Cu")
    print(f"   Original: C11={example_preds['Cu']['C11']:.2f}, C12={example_preds['Cu']['C12']:.2f}, C44={example_preds['Cu']['C44']:.2f}")
    print(f"   Corrected: C11={corrected['Cu']['C11']:.2f}, C12={corrected['Cu']['C12']:.2f}, C44={corrected['Cu']['C44']:.2f}")
    print(f"   (Target r2SCAN: C11=176.0, C12=124.0, C44=82.0)")
    
    # With UQ
    corrected_uq, intervals = op.correct_with_uq(example_preds, model_name="orb-v3", alpha=0.1)
    
    print(f"\n📐 90% Confidence Interval for Cu C11:")
    print(f"   [{intervals['Cu']['C11'][0]:.2f}, {intervals['Cu']['C11'][1]:.2f}]")
    
    print("\n" + "=" * 60)
    print("Usage:")
    print("  from lupine import LupineOperator")
    print("  op = LupineOperator.from_json()")
    print("  corrected = op.correct(predictions, model_name='orb-v3')")
    print("=" * 60)


if __name__ == "__main__":
    demo()
