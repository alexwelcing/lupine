"""Gate 0 — harness validation (blocking, per prereg_functional_vs_architecture_2x2.md).

Three checks with MACE-MP-0-small on 5 elements (Al, Cu, Au, Fe, W):
  A. Regression: rerun the energy-strain harness, compare to cached mace_results.json.
  B. Independent method: stress-strain elastic constants with the SAME calculator;
     energy-method and stress-method must agree (validates the harness math).
  C. Au C44 strain-window sweep (eps_max 0.25%..2%): is the large softening
     window-stable (model physics) or window-dependent (fitting artifact)?
"""

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, r"C:\Users\alexw\Downloads\shed\mlip_immi")
import elastic_constants as ec  # noqa: E402

from ase.build import bulk  # noqa: E402
from ase.units import GPa  # noqa: E402

PKG = Path(__file__).parent
ELEMENTS = ["Al", "Cu", "Au", "Fe", "W"]

cached = {r["element"]: r for r in json.loads((PKG / "mace_results.json").read_text())["results"]}

print("Loading mace-mp-0 small (cpu)...")
calc = ec.make_calculator("mace-mp-0", device="cpu")
print("ready\n")

# ---- A. Regression --------------------------------------------------------
print("=== A. Regression vs cached mace_results.json ===")
rerun = {}
for el in ELEMENTS:
    r = ec.compute_elastic_constants(el, calc)
    rerun[el] = r
    c = cached[el]
    print(f"{el:3s} rerun C=({r.C11:7.1f},{r.C12:7.1f},{r.C44:7.1f})  "
          f"cached C=({c['C11']:7.1f},{c['C12']:7.1f},{c['C44']:7.1f})  "
          f"max|d|={max(abs(r.C11-c['C11']), abs(r.C12-c['C12']), abs(r.C44-c['C44'])):.2f} GPa")

# ---- B. Stress-based cross-check ------------------------------------------
print("\n=== B. Stress-strain vs energy-strain (same model, independent math) ===")

def stress_voigt(atoms):
    return atoms.get_stress(voigt=True) / GPa  # xx, yy, zz, yz, xz, xy

def stress_elastic(el, a0):
    struct = ec.CRYSTAL_STRUCTURE[el]
    base = bulk(el, struct, a=a0, cubic=True)
    eps_grid = np.linspace(-0.005, 0.005, 7)

    # K from isotropic strain: sigma_xx = (C11 + 2 C12) eps
    sxx = []
    for e in eps_grid:
        a = base.copy(); a.set_cell(base.cell * (1 + e), scale_atoms=True); a.calc = calc
        sxx.append(stress_voigt(a)[0])
    c11p2c12 = np.polyfit(eps_grid, sxx, 1)[0]

    # C11 - C12 from orthorhombic strain diag(1+e, 1-e, 1): (sxx - syy) = 2 (C11-C12) e
    diff = []
    for e in eps_grid:
        a = base.copy()
        f = np.diag([1 + e, 1 - e, 1.0])
        a.set_cell(base.cell @ f.T, scale_atoms=True); a.calc = calc
        s = stress_voigt(a)
        diff.append(s[0] - s[1])
    c11mc12 = np.polyfit(eps_grid, diff, 1)[0] / 2

    # C44 from shear: sigma_xy = C44 * gamma = C44 * 2e
    sxy = []
    for e in eps_grid:
        a = base.copy()
        f = np.eye(3); f[0, 1] = e; f[1, 0] = e
        a.set_cell(base.cell @ f.T, scale_atoms=True); a.calc = calc
        sxy.append(stress_voigt(a)[5])
    c44 = np.polyfit(2 * eps_grid, sxy, 1)[0]

    c11 = (c11p2c12 + 2 * c11mc12) / 3 + 2 * (c11p2c12 - c11mc12) / 3  # = (c11p2c12 + 2*c11mc12)/3 ... compute directly:
    c11 = (c11p2c12 + 2 * c11mc12) / 3
    c12 = (c11p2c12 - c11mc12) / 3
    return c11, c12, c44

print(f"{'El':3s} {'energy method':>26s} {'stress method':>26s}  max rel diff")
for el in ELEMENTS:
    r = rerun[el]
    c11s, c12s, c44s = stress_elastic(el, r.a0_optimized)
    em = (r.C11, r.C12, r.C44)
    sm = (c11s, c12s, c44s)
    reldiff = max(abs(a - b) / max(abs(a), abs(b), 1.0) for a, b in zip(em, sm))
    print(f"{el:3s} ({em[0]:7.1f},{em[1]:7.1f},{em[2]:7.1f})  ({sm[0]:7.1f},{sm[1]:7.1f},{sm[2]:7.1f})  {reldiff:8.1%}")

# ---- C. Au C44 strain-window sweep ----------------------------------------
print("\n=== C. Au C44 vs strain window (energy method) ===")
au_ref = ec.PUBLISHED_C_IJ["Au"]["C44"]
a0_au = rerun["Au"].a0_optimized
base = bulk("Au", "fcc", a=a0_au, cubic=True)
for eps_max in (0.0025, 0.005, 0.01, 0.02):
    grid = np.linspace(-eps_max, eps_max, 9)
    curv, r2 = ec.compute_modulus(base, calc, ec.strain_matrix_shear, grid)
    c44 = curv / 4.0 / GPa
    print(f"eps_max={eps_max:.4f}: C44={c44:7.2f} GPa (R2={r2:.5f})  err vs exp {au_ref:.1f}: {(c44-au_ref)/au_ref:+.1%}")

print("\nGate 0 complete.")
