"""Elastic constants for cubic crystals via finite-difference deformation.

Computes C11, C12, C44 from ±strain stress measurements. Handles both
FCC and BCC structures via ASE's `bulk()` builder. Works with any ASE
calculator (CHGNet, MACE-MP, M3GNet, EMT, etc.).

Uses the convention:
- Apply ε = ±0.5% strain along x (Voigt 1) → measure σ_xx, σ_yy
  C11 = ∂σ_xx / ∂ε_xx,  C12 = ∂σ_yy / ∂ε_xx
- Apply ε = ±0.5% shear strain (Voigt 4 = yz) → measure σ_yz
  C44 = ∂σ_yz / ∂ε_yz

All stresses converted to GPa to match the D1 ledger units.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

# ase imports kept lazy so the module can be imported for typing without ase
try:
    from ase import Atoms  # noqa: F401
    from ase.build import bulk  # noqa: F401
    from ase.optimize import BFGS  # noqa: F401
    try:
        from ase.constraints import UnitCellFilter  # ASE < 3.28  # noqa: F401
    except ImportError:
        from ase.filters import UnitCellFilter  # ASE >= 3.28  # noqa: F401
    HAS_ASE = True
except ImportError:
    HAS_ASE = False

EV_PER_A3_TO_GPA = 160.21766208  # 1 eV/Å³ = 160.21766208 GPa

# FCC lattice param starting guesses (Å) and BCC structures.
DEFAULT_LATTICE = {
    # FCC
    "Al": ("fcc", 4.05), "Cu": ("fcc", 3.62), "Ni": ("fcc", 3.52),
    "Ag": ("fcc", 4.09), "Au": ("fcc", 4.08), "Pt": ("fcc", 3.92),
    "Pd": ("fcc", 3.89), "Pb": ("fcc", 4.95),
    # BCC
    "Fe": ("bcc", 2.87), "Cr": ("bcc", 2.88), "Mo": ("bcc", 3.15),
    "W":  ("bcc", 3.16), "V":  ("bcc", 3.03), "Nb": ("bcc", 3.30),
    "Ta": ("bcc", 3.30),
}


@dataclass
class ElasticResult:
    element: str
    structure: str
    a0: float                 # relaxed lattice constant, Å
    c11: float                # GPa
    c12: float                # GPa
    c44: float                # GPa
    energy_per_atom: float    # eV/atom (for sanity check)


def _require_ase() -> None:
    if not HAS_ASE:
        raise ImportError(
            "ASE is not installed. Install with `pip install ase`."
        )


def relax(atoms, calculator, fmax: float = 0.005) -> float:
    """Relax cell + positions; return the new lattice parameter (Å)."""
    from ase.optimize import BFGS
    try:
        from ase.constraints import UnitCellFilter
    except ImportError:
        from ase.filters import UnitCellFilter

    atoms.calc = calculator
    ucf = UnitCellFilter(atoms)
    BFGS(ucf, logfile=None).run(fmax=fmax, steps=200)
    cell = atoms.get_cell()
    # cubic: a0 from primitive cell volume
    return float((abs(np.linalg.det(cell))) ** (1.0 / 3.0))


def stress_for_strain(atoms_template, calculator,
                      strain_voigt: int, eps: float):
    """Apply a uniaxial or shear strain and return the resulting stress tensor.

    `strain_voigt`: 0 (xx), 3 (yz). Other Voigt indices not currently used.
    Stress returned in eV/Å³ (ASE native); caller converts to GPa.
    """
    atoms = atoms_template.copy()
    atoms.calc = calculator
    cell0 = atoms.get_cell().array.copy()
    F = np.eye(3)
    if strain_voigt == 0:    # uniaxial along x
        F[0, 0] = 1.0 + eps
    elif strain_voigt == 3:  # engineering shear yz
        F[1, 2] = eps / 2.0
        F[2, 1] = eps / 2.0
    else:
        raise ValueError(f"strain_voigt={strain_voigt} not supported")
    atoms.set_cell(F @ cell0, scale_atoms=True)
    return atoms.get_stress(voigt=False)  # 3x3 in eV/Å³


def elastic_constants(element: str, calculator,
                      eps: float = 0.005,
                      structure_override: str | None = None) -> ElasticResult:
    """Compute C11, C12, C44 + relaxed a0 for one element with one calculator.

    Two finite-difference deformations: uniaxial (gives C11, C12) and shear
    (gives C44). All in GPa.
    """
    _require_ase()
    from ase.build import bulk

    if element not in DEFAULT_LATTICE:
        raise ValueError(f"no default lattice for {element}; add to DEFAULT_LATTICE")
    struct, a_guess = DEFAULT_LATTICE[element]
    if structure_override:
        struct = structure_override

    atoms = bulk(element, struct, a=a_guess, cubic=True)
    a0 = relax(atoms, calculator)
    e0_per_atom = float(atoms.get_potential_energy() / len(atoms))

    # Uniaxial ±eps along x
    s_plus = stress_for_strain(atoms, calculator, 0, +eps)
    s_minus = stress_for_strain(atoms, calculator, 0, -eps)
    # ASE stress sign convention: positive stress = tensile (after voigt=False)
    c11_eVA3 = (s_plus[0, 0] - s_minus[0, 0]) / (2 * eps)
    c12_eVA3 = (s_plus[1, 1] - s_minus[1, 1]) / (2 * eps)

    # Shear ±eps in yz
    s_plus = stress_for_strain(atoms, calculator, 3, +eps)
    s_minus = stress_for_strain(atoms, calculator, 3, -eps)
    c44_eVA3 = (s_plus[1, 2] - s_minus[1, 2]) / (2 * eps)

    return ElasticResult(
        element=element,
        structure=struct,
        a0=a0,
        c11=float(c11_eVA3 * EV_PER_A3_TO_GPA),
        c12=float(c12_eVA3 * EV_PER_A3_TO_GPA),
        c44=float(math.copysign(abs(c44_eVA3) * EV_PER_A3_TO_GPA, c44_eVA3)),
        energy_per_atom=e0_per_atom,
    )
