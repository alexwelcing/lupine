"""Frozen strain-energy elastic-constant harness (replication copy).

Functionally identical to mlip_immi/elastic_constants.py (the version used for
every result in this program), with the calculator zoo removed: any ASE
calculator can be passed in. Validated by (a) bit-exact regression against the
archived MACE-MP-0 results, (b) an independent stress-strain implementation
agreeing to <=2.4%, (c) strain-window stability (Au C44 drift <4% over an 8x
window range). Energies only — no stress-unit conventions can affect results.
"""

from dataclasses import dataclass

import numpy as np
from ase.build import bulk
from ase.units import GPa

from references import A0_GUESS_ANGSTROM, BCC, FCC


def structure_of(element: str) -> str:
    return "fcc" if element in FCC else "bcc"


def strain_matrix_iso(eps: float) -> np.ndarray:
    return np.eye(3) * eps


def strain_matrix_volconst(eps: float) -> np.ndarray:
    fmat = np.diag([1 + eps, 1 + eps, 1 / (1 + eps) ** 2])
    return fmat - np.eye(3)


def strain_matrix_shear(eps: float) -> np.ndarray:
    fmat = np.eye(3)
    fmat[0, 1] = eps
    fmat[1, 0] = eps
    return fmat - np.eye(3)


@dataclass
class ElasticResult:
    element: str
    structure: str
    a0_optimized: float
    C11: float
    C12: float
    C44: float
    R2_iso: float
    R2_volconst: float
    R2_shear: float
    failures: list


def _find_a0(atoms_template, calc, a0_guess: float):
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


def _compute_modulus(atoms_template, calc, strain_fn, eps_grid):
    energies = []
    v0 = atoms_template.get_volume()
    for eps in eps_grid:
        atoms = atoms_template.copy()
        fmat = np.eye(3) + strain_fn(eps)
        atoms.set_cell(atoms.cell @ fmat.T, scale_atoms=True)
        atoms.calc = calc
        energies.append(atoms.get_potential_energy())
    energies = np.array(energies)
    coeffs = np.polyfit(eps_grid, energies, 2)
    curvature = 2 * coeffs[0] / v0
    fit_e = np.polyval(coeffs, eps_grid)
    r2 = 1 - np.sum((energies - fit_e) ** 2) / np.sum((energies - energies.mean()) ** 2)
    return float(curvature), float(r2)


def compute_elastic_constants(element: str, calc, eps_max: float = 0.005) -> ElasticResult:
    structure = structure_of(element)
    failures = []

    atoms = bulk(element, structure, a=A0_GUESS_ANGSTROM[element], cubic=True)
    a0_opt, r2_a0 = _find_a0(atoms, calc, A0_GUESS_ANGSTROM[element])
    if r2_a0 < 0.99:
        failures.append(f"a0 fit R^2={r2_a0:.3f} < 0.99")
    atoms = bulk(element, structure, a=a0_opt, cubic=True)

    eps_iso = np.linspace(-eps_max * 2, eps_max * 2, 9)
    k_curv, r2_iso = _compute_modulus(atoms, calc, strain_matrix_iso, eps_iso)
    bulk_modulus = k_curv / 9.0 / GPa

    eps_grid = np.linspace(-eps_max, eps_max, 9)
    vc_curv, r2_vc = _compute_modulus(atoms, calc, strain_matrix_volconst, eps_grid)
    c11_minus_c12 = vc_curv / 6.0 / GPa

    sh_curv, r2_sh = _compute_modulus(atoms, calc, strain_matrix_shear, eps_grid)
    c44 = sh_curv / 4.0 / GPa

    c11 = (3 * bulk_modulus + 2 * c11_minus_c12) / 3.0
    c12 = (3 * bulk_modulus - c11_minus_c12) / 3.0

    for r2, name in ((r2_iso, "iso"), (r2_vc, "volconst"), (r2_sh, "shear")):
        if r2 < 0.95:
            failures.append(f"{name} R^2={r2:.3f}")

    return ElasticResult(
        element=element, structure=structure, a0_optimized=a0_opt,
        C11=c11, C12=c12, C44=c44,
        R2_iso=r2_iso, R2_volconst=r2_vc, R2_shear=r2_sh,
        failures=failures,
    )
