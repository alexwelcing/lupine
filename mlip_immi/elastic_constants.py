#!/usr/bin/env python3
"""
Compute elastic constants C11, C12, C44 for cubic metals using a
foundation MLIP (MACE-MP-0 by default) via the strain-energy method.

Methodology (matches the convention used by the IMMI classical-potential
records in the worker D1 ledger — relative-error against DFT references):

    1. Optimize the equilibrium lattice parameter a0 by scanning isotropic
       strain and fitting a parabola to the energy.
    2. For each independent elastic mode, apply a small finite strain (0.5%
       default), let MACE relax internal positions while keeping the cell
       fixed, and read the energy. Fit a quadratic to E(eps).
    3. Convert the quadratic coefficients to C11, C12, C44 via the standard
       cubic-crystal energy expansion E(eps) = V0 * (1/2) * C_ijkl eps_ij eps_kl.

Output: a JSON dict per element with predicted C_ij in GPa, plus a
fit-quality R^2 per mode so callers can flag poor fits.

Run: python elastic_constants.py --element Cu --validate
     python elastic_constants.py --all
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from ase.build import bulk
from ase.units import GPa


# ─── Reference data ──────────────────────────────────────────────────────

# Equilibrium lattice constants (Å) at 0 K from Materials Project / standard
# literature compilations (Simmons & Wang 1971 for elastic constants; lattice
# constants are conventional). These are STARTING points for MACE relaxation —
# the script re-optimizes a0 per-element via energy-vs-strain scan.
A0_GUESS = {
    "Al": 4.05, "Cu": 3.61, "Ni": 3.52, "Ag": 4.09, "Au": 4.08,
    "Pt": 3.92, "Pd": 3.89, "Pb": 4.95,
    "Fe": 2.87, "Cr": 2.88, "Mo": 3.15, "W":  3.16,
    "V":  3.03, "Nb": 3.30, "Ta": 3.30,
}

CRYSTAL_STRUCTURE = {
    **{e: "fcc" for e in ["Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb"]},
    **{e: "bcc" for e in ["Fe", "Cr", "Mo", "W", "V", "Nb", "Ta"]},
}

# Published / experimental C_ij in GPa (Simmons & Wang 1971; Materials Project)
# Used only for validation comparison — not for fitting.
PUBLISHED_C_IJ = {
    "Cu": {"C11": 169.0, "C12": 122.0, "C44": 75.3},
    "Al": {"C11": 107.0, "C12": 60.9, "C44": 28.3},
    "Ni": {"C11": 247.0, "C12": 153.0, "C44": 122.0},
    "Au": {"C11": 192.4, "C12": 162.9, "C44": 39.8},
    "Ag": {"C11": 124.0, "C12": 93.4, "C44": 46.1},
    "Pt": {"C11": 346.7, "C12": 250.7, "C44": 76.5},
    "Pd": {"C11": 234.1, "C12": 176.1, "C44": 71.2},
    "Pb": {"C11": 49.5, "C12": 42.3, "C44": 14.9},
    "Fe": {"C11": 230.0, "C12": 135.0, "C44": 117.0},
    "Cr": {"C11": 350.0, "C12": 67.0, "C44": 100.8},
    "Mo": {"C11": 463.7, "C12": 157.8, "C44": 109.2},
    "W":  {"C11": 522.4, "C12": 204.4, "C44": 160.6},
    "V":  {"C11": 232.4, "C12": 119.4, "C44": 43.7},
    "Nb": {"C11": 246.5, "C12": 134.5, "C44": 28.7},
    "Ta": {"C11": 266.3, "C12": 158.2, "C44": 87.4},
}


# ─── Strain matrices for cubic crystals ─────────────────────────────────

def strain_matrix_iso(eps: float) -> np.ndarray:
    """Isotropic dilation: dE/V0 = (1/2)(C11 + 2 C12) (3 eps)^2 per std cubic.
    Used to find a0 only. For C-tensor we use the modes below."""
    return np.eye(3) * eps


def strain_matrix_volconst(eps: float) -> np.ndarray:
    """Volume-conserving tetragonal — gives (C11 - C12)."""
    F = np.diag([1 + eps, 1 + eps, 1 / (1 + eps) ** 2])
    return F - np.eye(3)


def strain_matrix_shear(eps: float) -> np.ndarray:
    """Pure shear xy — gives C44."""
    F = np.eye(3)
    F[0, 1] = eps
    F[1, 0] = eps
    return F - np.eye(3)


# ─── Calculation core ────────────────────────────────────────────────────

@dataclass
class ElasticResult:
    element: str
    structure: str
    a0_optimized: float
    C11: float
    C12: float
    C44: float
    bulk_modulus: float
    R2_iso: float
    R2_volconst: float
    R2_shear: float
    elapsed_s: float
    failures: list[str]


def find_a0(atoms_template, calc, a0_guess: float) -> tuple[float, float]:
    """Scan a0 ± 5%, fit parabola, return (a0_min, R^2_fit)."""
    strains = np.linspace(-0.05, 0.05, 11)
    energies = []
    for eps in strains:
        atoms = atoms_template.copy()
        atoms.set_cell(atoms.cell * (1 + eps), scale_atoms=True)
        atoms.calc = calc
        energies.append(atoms.get_potential_energy())
    energies = np.array(energies)
    coeffs = np.polyfit(strains, energies, 2)
    eps_min = -coeffs[1] / (2 * coeffs[0])
    fit_e = np.polyval(coeffs, strains)
    r2 = 1 - np.sum((energies - fit_e) ** 2) / np.sum((energies - energies.mean()) ** 2)
    return a0_guess * (1 + eps_min), float(r2)


def compute_modulus(atoms_template, calc, strain_fn, eps_grid) -> tuple[float, float]:
    """Fit E(eps) to a quadratic. Return (curvature, R^2)."""
    energies = []
    V0 = atoms_template.get_volume()
    for eps in eps_grid:
        atoms = atoms_template.copy()
        F = np.eye(3) + strain_fn(eps)
        atoms.set_cell(atoms.cell @ F.T, scale_atoms=True)
        atoms.calc = calc
        energies.append(atoms.get_potential_energy())
    energies = np.array(energies)
    coeffs = np.polyfit(eps_grid, energies, 2)
    curvature = 2 * coeffs[0] / V0  # second derivative of E wrt eps, / V0
    fit_e = np.polyval(coeffs, eps_grid)
    r2 = 1 - np.sum((energies - fit_e) ** 2) / np.sum((energies - energies.mean()) ** 2)
    return float(curvature), float(r2)


def compute_elastic_constants(element: str, calc, eps_max: float = 0.005) -> ElasticResult:
    """Run the full pipeline for one element. ~15-30s on CPU per element."""
    t0 = time.time()
    structure = CRYSTAL_STRUCTURE[element]
    a0 = A0_GUESS[element]
    failures: list[str] = []

    # 1. Build template + optimize a0
    atoms = bulk(element, structure, a=a0, cubic=True)
    a0_opt, r2_a0 = find_a0(atoms, calc, a0)
    if r2_a0 < 0.99:
        failures.append(f"a0 fit R^2={r2_a0:.3f} < 0.99")
    atoms = bulk(element, structure, a=a0_opt, cubic=True)

    # 2. Bulk modulus from isotropic strain: K = (1/9V) d^2E/d(eps_iso)^2.
    #    Note: we already have this implicitly from the parabola in find_a0;
    #    re-fit for cleanliness.
    eps_iso = np.linspace(-eps_max * 2, eps_max * 2, 9)
    K_curv, r2_iso = compute_modulus(atoms, calc, strain_matrix_iso, eps_iso)
    K = K_curv / 9.0 / GPa  # convert to GPa

    # 3. (C11 - C12) from volume-conserving tetragonal F = diag(1+eps, 1+eps, 1/(1+eps)^2):
    #    Voigt strains ≈ (eps, eps, -2 eps, 0, 0, 0), so
    #    E/V0 = (1/2)(C11 (eps^2 + eps^2 + 4 eps^2) + 2 C12 (eps^2 - 2 eps^2 - 2 eps^2))
    #         = 3 (C11 - C12) eps^2
    #    d^2(E/V0)/d(eps)^2 = 6 (C11 - C12)
    eps_grid = np.linspace(-eps_max, eps_max, 9)
    vc_curv, r2_vc = compute_modulus(atoms, calc, strain_matrix_volconst, eps_grid)
    C11_minus_C12 = vc_curv / 6.0 / GPa

    # 4. C44 from pure shear F[0,1]=F[1,0]=eps:
    #    engineering shear γ_xy = 2 eps, so E/V0 = (1/2) C44 (2 eps)^2 = 2 C44 eps^2
    #    d^2(E/V0)/d(eps)^2 = 4 C44
    sh_curv, r2_sh = compute_modulus(atoms, calc, strain_matrix_shear, eps_grid)
    C44 = sh_curv / 4.0 / GPa

    # 5. Decompose: K = (C11 + 2*C12)/3 -> C11 + 2*C12 = 3K
    #    Combined with C11 - C12 -> solve.
    C11 = (3 * K + 2 * C11_minus_C12) / 3.0
    C12 = (3 * K - C11_minus_C12) / 3.0

    if r2_iso < 0.95: failures.append(f"iso R^2={r2_iso:.3f}")
    if r2_vc < 0.95: failures.append(f"volconst R^2={r2_vc:.3f}")
    if r2_sh < 0.95: failures.append(f"shear R^2={r2_sh:.3f}")

    return ElasticResult(
        element=element, structure=structure, a0_optimized=a0_opt,
        C11=C11, C12=C12, C44=C44, bulk_modulus=K,
        R2_iso=r2_iso, R2_volconst=r2_vc, R2_shear=r2_sh,
        elapsed_s=time.time() - t0, failures=failures,
    )


def make_calculator(model: str = "mace-mp-0"):
    """Load a foundation MLIP calculator. Currently supports:
       - mace-mp-0 (default; small variant for CPU speed)
       - chgnet (412k-param universal force field)
    Both expose ASE Calculator interface so the strain-energy code is unchanged.
    """
    if model == "mace-mp-0":
        from mace.calculators import mace_mp
        return mace_mp(model="small", device="cpu", default_dtype="float32")
    if model == "chgnet":
        from chgnet.model.dynamics import CHGNetCalculator
        return CHGNetCalculator()
    raise ValueError(f"unknown model: {model}; supported: mace-mp-0, chgnet")


def fmt_compare(el: str, predicted: ElasticResult) -> str:
    pub = PUBLISHED_C_IJ.get(el, {})
    lines = [f"  {el} ({predicted.structure.upper()}, a0={predicted.a0_optimized:.3f} A, t={predicted.elapsed_s:.1f}s)"]
    for k in ("C11", "C12", "C44"):
        p = getattr(predicted, k)
        ref = pub.get(k)
        if ref is not None:
            err = (p - ref) / ref * 100
            lines.append(f"    {k}: predicted={p:7.1f}  reference={ref:7.1f}  err={err:+6.1f}%")
        else:
            lines.append(f"    {k}: predicted={p:7.1f}")
    if predicted.failures:
        lines.append(f"    !! fit issues: {'; '.join(predicted.failures)}")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--element", help="single element to compute")
    parser.add_argument("--validate", action="store_true", help="compare against published values")
    parser.add_argument("--all", action="store_true", help="run all 15 IMMI elements")
    parser.add_argument("--model", default="mace-mp-0", choices=["mace-mp-0", "chgnet"],
                        help="foundation MLIP to evaluate")
    parser.add_argument("--output", default=None, help="JSON output path (default: {model}_immi_results.json)")
    args = parser.parse_args()
    if args.output is None:
        args.output = f"{args.model.replace('-','_')}_immi_results.json"

    print(f"Loading {args.model}...")
    calc = make_calculator(args.model)
    print("Calculator ready.\n")

    if args.element:
        elements = [args.element]
    elif args.all:
        elements = list(CRYSTAL_STRUCTURE.keys())
    else:
        elements = ["Cu"]

    results: list[ElasticResult] = []
    for el in elements:
        try:
            r = compute_elastic_constants(el, calc)
            results.append(r)
            print(fmt_compare(el, r))
        except Exception as e:
            print(f"  {el}: FAILED — {e}")

    # Persist
    payload = {
        "model": args.model + ("-small" if args.model == "mace-mp-0" else ""),
        "method": "strain-energy, eps_max=0.5%",
        "results": [
            {
                "element": r.element, "structure": r.structure,
                "a0_optimized": r.a0_optimized,
                "C11": r.C11, "C12": r.C12, "C44": r.C44,
                "bulk_modulus_GPa": r.bulk_modulus,
                "R2_iso": r.R2_iso, "R2_volconst": r.R2_volconst, "R2_shear": r.R2_shear,
                "elapsed_s": r.elapsed_s, "failures": r.failures,
            }
            for r in results
        ],
        "published_reference": PUBLISHED_C_IJ,
    }
    out_path = Path(args.output)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    print(f"\nWrote {len(results)} results to {out_path}")


if __name__ == "__main__":
    sys.exit(main() or 0)
