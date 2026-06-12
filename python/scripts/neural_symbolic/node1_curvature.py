"""Node 1 — Comparative C44 shear-curvature GPU thrust (MACE-MP-0 vs CHGNet).

Saturates the GPU: loads BOTH foundation MLIPs, applies a pure-shear strain sweep
to an FCC Ni cell, and measures the secant shear modulus C44(gamma) — the concrete
curvature observable (second derivative of energy w.r.t. shear). It locates, per
model, the *validated strain manifold*: the strain range where the model's curvature
stays within tolerance of its elastic value, and the boundary beyond which the
prediction diverges from the 124.7 GPa literature ground truth past the T3 reject
threshold.

Output: one ``CurvatureBoundaryPayload`` per model, written to ``tmp/neural_symbolic/``
for Node 2 (the relay) to consume.

Run (GPU venv):
    C:/Users/alexw/mlip-gpu/Scripts/python.exe \
      python/scripts/neural_symbolic/node1_curvature.py
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
try:  # dynamo off — defensive, ASE calculators run eager anyway
    torch._dynamo.config.suppress_errors = True  # type: ignore[attr-defined]
    torch._dynamo.config.disable = True  # type: ignore[attr-defined]
except Exception:
    pass

from ase import Atoms
from ase.build import bulk

_HERE = Path(__file__).resolve()
sys.path.insert(0, str(_HERE.parents[1]))  # scripts/  -> neural_symbolic importable
from neural_symbolic.payload import CurvatureBoundaryPayload, CurvatureSample  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(message)s", stream=sys.stdout)
log = logging.getLogger("node1")

EV_PER_A3_TO_GPA = 160.21766208
NI_A0 = 3.524
REF_C44_GPA = 124.7  # literature/NIST Ni shear constant
REJECT_THRESHOLD_PCT = 10.0  # secant C44 may drift this far from the elastic value
ELASTIC_REJECT_PCT = 25.0  # |elastic C44 - ref| beyond this -> model rejected for this observable
SHEAR_SWEEP = (0.0050, 0.0100, 0.0200, 0.0350, 0.0500, 0.0700, 0.1000, 0.1300)
OUT_DIR = _HERE.parents[3] / "tmp" / "neural_symbolic"  # repo root (python/scripts/neural_symbolic/)


def _ni_cell() -> Atoms:
    return bulk("Ni", "fcc", a=NI_A0, cubic=True)


def _shear(atoms: Atoms, gamma: float) -> Atoms:
    """Simple shear in x along y (engineering shear strain gamma == Voigt e6)."""
    a = atoms.copy()
    f = np.eye(3)
    f[0, 1] = gamma
    a.set_cell(a.cell.array @ f.T, scale_atoms=True)
    return a


def _sigma_xy_gpa(atoms: Atoms, calc) -> float:
    """Voigt sigma_xy (index 5) in GPa for the given ASE calculator."""
    a = atoms.copy()
    a.calc = calc
    voigt = np.asarray(a.get_stress(voigt=True), dtype=float)  # ASE: eV/Ang^3
    # ASE stress is the *thermodynamic* stress (dE/deps / V); sign convention gives
    # restoring shear stress of opposite sign to the applied strain — take magnitude
    # consistent with C44 > 0.
    return float(voigt[5]) * EV_PER_A3_TO_GPA


def _load_mace():
    from mace.calculators.foundations_models import mace_mp

    return mace_mp(model="medium", device="cuda", default_dtype="float64")


def _load_chgnet():
    from chgnet.model.dynamics import CHGNetCalculator

    return CHGNetCalculator(use_device="cuda")


def _analyze(model_id: str, calc) -> CurvatureBoundaryPayload:
    base = _ni_cell()
    samples: list[CurvatureSample] = []
    for g in SHEAR_SWEEP:
        sxy = _sigma_xy_gpa(_shear(base, g), calc)
        c44 = abs(sxy) / g  # secant shear modulus
        samples.append(CurvatureSample(shear_strain=g, shear_stress_gpa=sxy, tangent_c44_gpa=c44))

    elastic_c44 = samples[0].tangent_c44_gpa  # smallest strain ~ linear elastic
    elastic_dev = (elastic_c44 - REF_C44_GPA) / REF_C44_GPA * 100.0

    # Validated manifold: contiguous strain range where secant C44 stays within
    # REJECT_THRESHOLD_PCT of the elastic value. First breach = divergence boundary.
    validated_max = samples[0].shear_strain
    divergence = None
    max_dev = 0.0
    for s in samples:
        dev = abs(s.tangent_c44_gpa - elastic_c44) / elastic_c44 * 100.0
        max_dev = max(max_dev, dev)
        if dev <= REJECT_THRESHOLD_PCT and divergence is None:
            validated_max = s.shear_strain
        elif divergence is None:
            divergence = s.shear_strain

    if abs(elastic_dev) <= 10.0:
        verdict = "promote"
    elif abs(elastic_dev) <= ELASTIC_REJECT_PCT:
        verdict = "review"
    else:
        verdict = "reject"

    return CurvatureBoundaryPayload(
        model_id=model_id,
        structure_id="Ni-fcc-shear-sweep",
        reference_gpa=REF_C44_GPA,
        elastic_prediction_gpa=elastic_c44,
        elastic_deviation_pct=elastic_dev,
        validated_strain_max=validated_max,
        divergence_strain=divergence,
        max_deviation_pct=max_dev,
        reject_threshold_pct=REJECT_THRESHOLD_PCT,
        verdict=verdict,
        samples=tuple(samples),
    )


def main() -> int:
    if not torch.cuda.is_available():
        log.error("CUDA unavailable — Node 1 targets the GPU.")
        return 2
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    log.info("=" * 80)
    log.info("NODE 1 — comparative C44 shear curvature | %s", torch.cuda.get_device_name(0))
    log.info("Ni FCC | ref C44 = %.1f GPa | reject if elastic dev > %.0f%% or curvature drift > %.0f%%",
             REF_C44_GPA, ELASTIC_REJECT_PCT, REJECT_THRESHOLD_PCT)
    log.info("=" * 80)

    loaders = {"mace-mp-0": _load_mace}
    try:
        import chgnet  # noqa: F401

        loaders["chgnet"] = _load_chgnet
    except Exception as exc:  # CHGNet optional; Node 1 still runs on MACE alone
        log.warning("CHGNet unavailable (%s) — running MACE-MP-0 only.", type(exc).__name__)

    payloads: dict[str, CurvatureBoundaryPayload] = {}
    for model_id, loader in loaders.items():
        log.info("loading %s on GPU ...", model_id)
        calc = loader()
        payloads[model_id] = _analyze(model_id, calc)
        del calc
        torch.cuda.empty_cache()

    log.info("-" * 80)
    log.info("%-10s %12s %10s %12s %10s  %-8s", "model", "elastic C44", "dev%", "valid g<=", "div g", "verdict")
    for mid, p in payloads.items():
        log.info(
            "%-10s %12.1f %10.1f %12.4f %10s  %-8s",
            mid,
            p.elastic_prediction_gpa,
            p.elastic_deviation_pct,
            p.validated_strain_max,
            "—" if p.divergence_strain is None else f"{p.divergence_strain:.4f}",
            p.verdict.upper(),
        )
        out = OUT_DIR / f"node1_{mid}.json"
        out.write_text(json.dumps(p.model_dump(mode="json"), indent=2), encoding="utf-8")
    log.info("-" * 80)
    log.info("Curvature shear-stress profiles (GPa) at swept strains:")
    log.info("%-10s %s", "gamma ->", "  ".join(f"{g:.3f}" for g in SHEAR_SWEEP))
    for mid, p in payloads.items():
        log.info("%-10s %s", mid, "  ".join(f"{s.shear_stress_gpa:5.2f}" for s in p.samples))
    log.info("=" * 80)
    log.info("payloads -> %s/node1_<model>.json (consumed by Node 2)", OUT_DIR)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
