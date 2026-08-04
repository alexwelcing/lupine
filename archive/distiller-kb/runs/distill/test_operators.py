#!/usr/bin/env python3
"""
Test operators for EAM elastic constant corrections.
Reads operator definitions and evaluates performance on Al, Cu, Ni, Ag, Au.
"""

import json
import warnings

# ============================================================================
# REFERENCE DATA - Experimental elastic constants (GPa)
# ============================================================================
REFERENCE_DATA = {
    "Al": {"C11": 106.0, "C12": 61.0, "C44": 28.0},
    "Cu": {"C11": 170.0, "C12": 122.0, "C44": 76.0},
    "Ni": {"C11": 247.0, "C12": 147.0, "C44": 125.0},
    "Ag": {"C11": 124.0, "C12": 94.0, "C44": 46.0},
    "Au": {"C11": 193.0, "C12": 163.0, "C44": 42.0},
}

# ============================================================================
# EAM DATA - Typical EAM-predicted elastic constants (GPa)
# ============================================================================
EAM_DATA = {
    "Al": {"C11": 114.0, "C12": 58.0, "C44": 32.0},
    "Cu": {"C11": 168.0, "C12": 118.0, "C44": 78.0},
    "Ni": {"C11": 252.0, "C12": 152.0, "C44": 118.0},
    "Ag": {"C11": 130.0, "C12": 89.0, "C44": 48.0},
    "Au": {"C11": 188.0, "C12": 158.0, "C44": 45.0},
}

# ============================================================================
# OPERATOR DEFINITIONS (taking C11, C12, C44 as inputs)
# ============================================================================

def volume_scaling_operator(C11, C12, C44, V_class=16.5, V_DFT=16.6, K_DFT=76.0, a=0.7):
    """Apply volume-scaling correction to bulk modulus.
    
    Note: Uses internal volume parameters for FCC Al as default.
    For other metals, adjust V_class, V_DFT, K_DFT accordingly.
    """
    volume_error = (V_class - V_DFT) / V_DFT
    K_class = (C11 + 2 * C12) / 3
    dK = a * volume_error * K_DFT
    return {"correction": dK, "K_class": K_class, "volume_error_pct": volume_error * 100}


def stiffness_ratio_operator(C11, C12, C44):
    """Calculate stiffness ratio deviation from DFT reference.
    
    Returns ratio > 1 means too stiff in longitudinal direction.
    """
    if C11 <= 0 or C12 <= 0:
        raise ValueError("Elastic constants must be positive")
    ratio = C11 / C12
    return {"stiffness_ratio": ratio}


def stability_margin_operator(C11, C12, C44):
    """Calculate elastic stability margin.
    
    Born stability criteria for cubic crystals:
    - C11 - C12 > 0
    - C11 + 2*C12 > 0
    - C44 > 0
    
    Returns normalized margin.
    """
    criteria = [C11 - C12, C11 + 2 * C12, C44]
    min_val = min(criteria)
    max_val = max(C11, C12, C44)
    if max_val <= 0:
        raise ValueError("All elastic constants must be positive")
    return {"stability_margin": min_val / max_val}


def cauchy_pressure_operator(C11, C12, C44):
    """Calculate Cauchy pressure.
    
    Cauchy pressure = C12 - C44
    Positive: metallic bonding (FCC metals)
    Negative: covalent/angular bonding
    """
    cp = C12 - C44
    return {"cauchy_pressure": cp}


def poisson_ratio_deviation_operator(C11, C12, C44):
    """Calculate Poisson ratio.
    
    nu = -C12 / (2*(C11 + C12)) for cubic isotropic approximation
    """
    if C11 + C12 <= 0:
        raise ValueError("C11 + C12 must be positive")
    nu = -C12 / (2 * (C11 + C12))
    if not (0.2 <= nu <= 0.5):
        warnings.warn(f"Poisson ratio {nu:.3f} outside typical metallic range [0.2, 0.5]")
    return {"poisson_ratio": nu}


# Dictionary mapping operator names to functions
OPERATORS = {
    "volume_scaling": volume_scaling_operator,
    "stiffness_ratio": stiffness_ratio_operator,
    "stability_margin": stability_margin_operator,
    "cauchy_pressure": cauchy_pressure_operator,
    "poisson_ratio": poisson_ratio_deviation_operator,
}


# ============================================================================
# MAIN TESTING FUNCTION
# ============================================================================

def run_all_tests():
    """Run all operators on all metals and compute aggregate MAE."""
    metals = list(REFERENCE_DATA.keys())
    
    # Initialize results storage
    results = {}  # metal -> operator -> result dict
    
    print("=" * 90)
    print("OPERATOR TEST RESULTS - EAM Elastic Constant Corrections")
    print("=" * 90)
    print()
    
    # Per-metal results
    for metal in metals:
        ref = REFERENCE_DATA[metal]
        eam = EAM_DATA[metal]
        results[metal] = {}
        
        print(f"METAL: {metal}")
        print("-" * 50)
        print(f"  Reference: C11={ref['C11']:.1f}, C12={ref['C12']:.1f}, C44={ref['C44']:.1f} GPa")
        print(f"  EAM:       C11={eam['C11']:.1f}, C12={eam['C12']:.1f}, C44={eam['C44']:.1f} GPa")
        print()
        print("  Operator              | Correction  | Residual Error")
        print("  " + "-" * 48)
        
        for op_name, op_func in OPERATORS.items():
            # Get operator outputs for reference and EAM data
            ref_result = op_func(ref["C11"], ref["C12"], ref["C44"])
            eam_result = op_func(eam["C11"], eam["C12"], eam["C44"])
            
            # Calculate correction and residual error
            if op_name == "volume_scaling":
                correction = eam_result["correction"]
                K_ref = (ref["C11"] + 2*ref["C12"]) / 3
                K_eam = (eam["C11"] + 2*eam["C12"]) / 3
                residual = abs(K_eam + correction - K_ref)
            elif op_name == "stiffness_ratio":
                correction = eam_result["stiffness_ratio"] - ref_result["stiffness_ratio"]
                residual = abs(correction) * 0.3
            elif op_name == "stability_margin":
                correction = eam_result["stability_margin"] - ref_result["stability_margin"]
                residual = abs(correction) * 50  # Scale for display
            elif op_name == "cauchy_pressure":
                correction = eam_result["cauchy_pressure"] - ref_result["cauchy_pressure"]
                residual = abs(correction) * 0.4
            elif op_name == "poisson_ratio":
                correction = eam_result["poisson_ratio"] - ref_result["poisson_ratio"]
                residual = abs(correction) * 200  # Scale for display
            else:
                correction = 0
                residual = 0
            
            results[metal][op_name] = {
                "ref_value": ref_result,
                "eam_value": eam_result,
                "correction": correction,
                "residual": residual,
            }
            print(f"  {op_name:22} | {correction:+10.4f} | {residual:10.4f}")
        
        print()
    
    # Compute MAE per operator
    print("=" * 90)
    print("AGGREGATE MAE (Mean Absolute Error) per Operator")
    print("=" * 90)
    print()
    
    operator_maes = {}
    for op_name in OPERATORS.keys():
        errors_list = [results[m][op_name]["residual"] for m in metals]
        mae = sum(errors_list) / len(errors_list)
        operator_maes[op_name] = mae
        print(f"  {op_name:22}: MAE = {mae:.4f}")
    
    print()
    
    # Compute overall MAE
    all_error_values = []
    for metal in metals:
        for op_name in OPERATORS.keys():
            all_error_values.append(results[metal][op_name]["residual"])
    
    overall_mae = sum(all_error_values) / len(all_error_values)
    
    print("=" * 90)
    print(f"OVERALL AGGREGATE MAE: {overall_mae:.4f}")
    print("=" * 90)
    print()
    
    # Summary table
    print("SUMMARY TABLE: Corrections and Residual Errors per Metal per Operator")
    print("-" * 90)
    header = f"{'Metal':<6}"
    for op in OPERATORS.keys():
        header += f" | {op[:14]:<14}"
    print(header)
    print("-" * 90)
    
    for metal in metals:
        row = f"{metal:<6}"
        for op_name in OPERATORS.keys():
            corr = results[metal][op_name]["correction"]
            err = results[metal][op_name]["residual"]
            row += f" | {corr:+6.3f}/{err:6.3f}"
        print(row)
    
    print("-" * 90)
    
    return operator_maes, overall_mae, results


if __name__ == "__main__":
    results = run_all_tests()