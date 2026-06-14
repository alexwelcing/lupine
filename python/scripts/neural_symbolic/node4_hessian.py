"""Node 4 — the widening: full curvature (phonon Hessian + elastic C44) from MACE-MP-0.

Addresses the integrity note in ``docs/neural-symbolic-curvature-loop.md``: move past the
single secant C44 to the **full 3N x 3N atomic dynamical matrix** (phonon Hessian) and the
elastic shear modulus as a **stress derivative** (dσ_xy/dγ).

Engineering reality (validated empirically, not assumed): torch_sim's *inference* model
detaches positions when it rebuilds the neighbor list, so you cannot autograd a curvature
through it. MACE's **own** internal autograd is the source of truth — the forces/stress it
is trained on. We therefore take MACE's ASE calculator (forces/stress via MACE's internal
double-backward) and finite-difference *those* for the Hessian. The same fact dictates Node
5: RLSF must backprop through MACE's native stress-gradient path (raw model, training=True),
not the torch_sim wrapper.

Run (GPU venv):
    C:/Users/alexw/mlip-gpu/Scripts/python.exe \
      python/scripts/neural_symbolic/node4_hessian.py
"""

from __future__ import annotations

import os

os.environ.setdefault("TORCHDYNAMO_DISABLE", "1")

import json
import logging
import sys
import warnings
from pathlib import Path

import numpy as np
import torch

warnings.filterwarnings("ignore")
try:
    torch._dynamo.config.suppress_errors = True  # type: ignore[attr-defined]
    torch._dynamo.config.disable = True  # type: ignore[attr-defined]
except Exception:
    pass

from ase.build import bulk

_HERE = Path(__file__).resolve()
logging.basicConfig(level=logging.INFO, format="%(message)s", stream=sys.stdout)
log = logging.getLogger("node4")

EV_PER_A3_TO_GPA = 160.21766208
THZ_PER_SQRT_EV_AMU_A2 = 15.633
NI_A0 = 3.524
NI_MASS = 58.6934
REF_C44_GPA = 124.7
OUT_DIR = _HERE.parents[3] / "tmp" / "neural_symbolic"  # repo root (python/scripts/neural_symbolic/)


def _calc():
    from mace.calculators.foundations_models import mace_mp

    return mace_mp(model="medium", device="cuda", default_dtype="float64")


def elastic_c44_stress_derivative(atoms, calc, d=4e-3) -> float:
    """C44 = d(sigma_xy)/d(gamma) at gamma=0 (central FD of MACE's autograd stress)."""
    eye = np.eye(3)
    basis = np.zeros((3, 3))
    basis[0, 1] = 1.0
    cell0 = atoms.cell.array.copy()
    pos0 = atoms.get_positions()

    def sigma_xy(g: float) -> float:
        a = atoms.copy()
        f = eye + g * basis
        a.set_cell(cell0 @ f.T, scale_atoms=False)
        a.set_positions(pos0 @ f.T)
        a.calc = calc
        return float(a.get_stress(voigt=True)[5]) * EV_PER_A3_TO_GPA  # sigma_xy in GPa

    return (sigma_xy(d) - sigma_xy(-d)) / (2 * d)


def phonon_hessian(atoms, calc, d=1e-2) -> np.ndarray:
    """3N x 3N atomic Hessian by central FD of MACE's (autograd) forces, cell fixed."""
    pos0 = atoms.get_positions()
    n = len(atoms)
    dim = 3 * n
    h = np.zeros((dim, dim))

    def forces(positions: np.ndarray) -> np.ndarray:
        a = atoms.copy()
        a.set_positions(positions)
        a.calc = calc
        return a.get_forces().reshape(-1)

    for i in range(dim):
        ai, ci = divmod(i, 3)
        plus = pos0.copy()
        plus[ai, ci] += d
        minus = pos0.copy()
        minus[ai, ci] -= d
        h[:, i] = -(forces(plus) - forces(minus)) / (2 * d)
    return 0.5 * (h + h.T)


def phonon_frequencies(hess: np.ndarray, mass: float) -> np.ndarray:
    eig = np.linalg.eigvalsh(hess / mass)
    return np.sort(np.sign(eig) * np.sqrt(np.abs(eig)) * THZ_PER_SQRT_EV_AMU_A2)


def main() -> int:
    if not torch.cuda.is_available():
        log.error("CUDA unavailable.")
        return 2
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    log.info("=" * 80)
    log.info("NODE 4 — full curvature (phonon Hessian + elastic C44) | %s | MACE-MP-0", torch.cuda.get_device_name(0))
    log.info("=" * 80)
    calc = _calc()
    atoms = bulk("Ni", "fcc", a=NI_A0, cubic=True)

    c44 = elastic_c44_stress_derivative(atoms, calc)
    dev_pct = (c44 - REF_C44_GPA) / REF_C44_GPA * 100
    log.info("elastic C44 (dσ_xy/dγ, MACE autograd stress): %.2f GPa  (%.1f%% vs %.1f ref)", c44, dev_pct, REF_C44_GPA)

    log.info("-" * 80)
    log.info("Phonon dynamical matrix (12x12, FD of MACE autograd forces) ...")
    hess = phonon_hessian(atoms, calc)
    freqs = phonon_frequencies(hess, NI_MASS)
    log.info("phonon frequencies (THz): %s", "  ".join(f"{f:+.2f}" for f in freqs))
    n_acoustic = int((np.abs(freqs) < 0.3).sum())
    n_imag = int((freqs < -0.1).sum())
    log.info("acoustic (~0): %d | imaginary: %d | max optical: %.2f THz | curvature trace: %.1f eV/A^2",
             n_acoustic, n_imag, float(freqs.max()), float(np.trace(hess)))
    log.info("dynamical stability: %s", "STABLE" if n_imag == 0 else f"UNSTABLE ({n_imag} imaginary modes)")
    log.info("-" * 80)
    log.info("autograd note: torch_sim inference wrapper detaches positions (no autograd through it);")
    log.info("MACE's internal autograd supplies forces/stress. RLSF (Node 5) uses MACE's native")
    log.info("stress-gradient training path (raw model, training=True) — second-order, supported.")

    payload = {
        "schema": "lupine.neural_symbolic.hessian.v1",
        "model_id": "mace-mp-0",
        "elastic_c44_gpa": c44,
        "reference_c44_gpa": REF_C44_GPA,
        "c44_deviation_pct": dev_pct,
        "rlsf_loss": "stress_response",
        "rlsf_path": "raw_mace_model.training=True (native force/stress gradient)",
        "phonon_frequencies_thz": [float(x) for x in freqs],
        "n_acoustic_modes": n_acoustic,
        "n_imaginary_modes": n_imag,
        "dynamically_stable": bool(n_imag == 0),
        "hessian_trace_ev_per_a2": float(np.trace(hess)),
    }
    (OUT_DIR / "node4_hessian.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    log.info("=" * 80)
    log.info("curvature payload -> %s/node4_hessian.json", OUT_DIR)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
