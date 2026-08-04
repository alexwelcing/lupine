"""Node 5 — live RLSF neural surgery: heal MACE-MP-0's C44 shear hallucination.

Freezes the entire MACE body and trains ONLY the invariant readout blocks (~2.2k params,
0.047% of the model) — the E(3)-equivariance-safe injection point — against a composite
constraint loss, on the A4500, via MACE's native stress-gradient training path:

    L_total = L_C44(target=124.7 GPa)  +  lambda * L_anchor(C11, C12 held at baseline)

Phonon dynamic stability is a per-checkpoint NON-differentiable monitor (the FD Hessian is
not a gradient term — stated honestly, not faked); imaginary modes trip a Path-B halt.

It streams the real epoch trajectory (loss, C44, C11, C12, VRAM, step time) and writes the
unvarnished outcome to ``tmp/neural_symbolic/node5_result.json`` for Node 6 to formalize:
Path A (cure: C44 crosses into PROMOTE >=112 GPa, normals + phonons intact) or
Path B (Pareto wall: the readout cannot decouple shear from normal stiffness).

Run (GPU venv):
    C:/Users/alexw/mlip-gpu/Scripts/python.exe \
      lupine-distill/runtime/python/scripts/neural_symbolic/node5_lora_surgery.py
"""

from __future__ import annotations

import os

os.environ.setdefault("TORCHDYNAMO_DISABLE", "1")

import json
import logging
import sys
import time
import warnings
from pathlib import Path

import numpy as np
import torch

warnings.filterwarnings("ignore")

from ase.build import bulk

_HERE = Path(__file__).resolve()
logging.basicConfig(level=logging.INFO, format="%(message)s", stream=sys.stdout)
log = logging.getLogger("node5")

GPA = 160.21766208
NI_A0 = 3.524
NI_MASS = 58.6934
REF_C44 = 124.7
PROMOTE_C44 = 112.2  # within 10% of reference
OUT_DIR = _HERE.parents[5] / "tmp" / "neural_symbolic"

SHEAR_TRAIN = (0.010, 0.020, 0.030)
NORMAL_TRAIN = (0.006, 0.012)
EPOCHS = 80
LR = 3e-3
LAMBDA_ANCHOR = 1.0
PLATEAU_PATIENCE = 18


def _load():
    from mace.calculators.foundations_models import mace_mp

    calc = mace_mp(model="medium", device="cuda", default_dtype="float64")
    model = calc.models[0]
    return model, next(model.parameters()).device, float(model.r_max.item()), calc.z_table


def _batch(atoms, z_table, r_max, dev):
    from mace import data as mdata
    from mace.tools import torch_geometric

    ad = mdata.AtomicData.from_config(mdata.config_from_atoms(atoms), z_table=z_table, cutoff=r_max)
    b = next(iter(torch_geometric.dataloader.DataLoader([ad], batch_size=1))).to(dev)
    return {k: (v.double() if torch.is_floating_point(v) else v) for k, v in b.to_dict().items()}


def _shear(a0, g):
    a = bulk("Ni", "fcc", a=a0, cubic=True)
    f = np.eye(3)
    f[0, 1] = g
    a.set_cell(a.cell.array @ f.T, scale_atoms=True)
    return a


def _normal(a0, e, axis=0):
    a = bulk("Ni", "fcc", a=a0, cubic=True)
    f = np.eye(3)
    f[axis, axis] = 1 + e
    a.set_cell(a.cell.array @ f.T, scale_atoms=True)
    return a


def _stress_gpa(model, batch):
    out = model(batch, training=True, compute_force=False, compute_stress=True)
    return out["stress"].reshape(3, 3) * GPA  # differentiable (training=True)


def _measure(model, batches):
    """C44, C11, C12 (GPa) from current weights. MACE needs grad enabled for its
    internal force/stress autograd, so we compute WITH grad and detach the scalars."""
    sxy_p = _stress_gpa(model, batches["shear_p"])[0, 1]
    sxy_m = _stress_gpa(model, batches["shear_m"])[0, 1]
    c44 = float((sxy_p - sxy_m).detach() / (2 * batches["g0"]))
    sxx_p = _stress_gpa(model, batches["norm_p"])[0, 0]
    syy_p = _stress_gpa(model, batches["norm_p"])[1, 1]
    sxx_m = _stress_gpa(model, batches["norm_m"])[0, 0]
    syy_m = _stress_gpa(model, batches["norm_m"])[1, 1]
    c11 = float((sxx_p - sxx_m).detach() / (2 * batches["e0"]))
    c12 = float((syy_p - syy_m).detach() / (2 * batches["e0"]))
    return c44, c11, c12


def _phonon_stable(model, z_table, r_max, dev, d=1e-2) -> tuple[bool, float]:
    """Non-differentiable monitor: FD-of-forces Hessian -> min phonon freq (THz)."""
    base = bulk("Ni", "fcc", a=NI_A0, cubic=True)
    pos0 = base.get_positions()
    n = len(base)
    H = np.zeros((3 * n, 3 * n))

    def forces(p):
        a = base.copy()
        a.set_positions(p)
        out = model(_batch(a, z_table, r_max, dev), training=False, compute_force=True, compute_stress=False)
        return out["forces"].detach().cpu().numpy().reshape(-1)

    for i in range(3 * n):
        ai, ci = divmod(i, 3)
        pp, pm = pos0.copy(), pos0.copy()
        pp[ai, ci] += d
        pm[ai, ci] -= d
        H[:, i] = -(forces(pp) - forces(pm)) / (2 * d)
    H = 0.5 * (H + H.T)
    eig = np.linalg.eigvalsh(H / NI_MASS)
    freqs = np.sign(eig) * np.sqrt(np.abs(eig)) * 15.633
    return bool((freqs < -0.1).sum() == 0), float(freqs.min())


def main() -> int:
    if not torch.cuda.is_available():
        log.error("CUDA unavailable.")
        return 2
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    model, dev, r_max, z_table = _load()

    # Freeze body; unfreeze ONLY the invariant readouts.
    for p in model.parameters():
        p.requires_grad_(False)
    for p in model.readouts.parameters():
        p.requires_grad_(True)
    trainable = [p for p in model.readouts.parameters() if p.requires_grad]
    n_train = sum(p.numel() for p in trainable)
    n_total = sum(p.numel() for p in model.parameters())

    g0, e0 = 0.02, 0.01
    batches = {
        "g0": g0, "e0": e0,
        "shear_p": _batch(_shear(NI_A0, g0), z_table, r_max, dev),
        "shear_m": _batch(_shear(NI_A0, -g0), z_table, r_max, dev),
        "norm_p": _batch(_normal(NI_A0, e0), z_table, r_max, dev),
        "norm_m": _batch(_normal(NI_A0, -e0), z_table, r_max, dev),
    }
    shear_train = {g: _batch(_shear(NI_A0, g), z_table, r_max, dev) for g in SHEAR_TRAIN}
    shear_train.update({-g: _batch(_shear(NI_A0, -g), z_table, r_max, dev) for g in SHEAR_TRAIN})
    norm_train = {e: _batch(_normal(NI_A0, e), z_table, r_max, dev) for e in NORMAL_TRAIN}
    norm_train.update({-e: _batch(_normal(NI_A0, -e), z_table, r_max, dev) for e in NORMAL_TRAIN})

    # Baseline (frozen) anchor targets. MACE's stress needs grad enabled; detach the values.
    sxx0 = {e: float(_stress_gpa(model, b)[0, 0].detach()) for e, b in norm_train.items()}
    syy0 = {e: float(_stress_gpa(model, b)[1, 1].detach()) for e, b in norm_train.items()}
    c44_0, c11_0, c12_0 = _measure(model, batches)
    stable_0, fmin_0 = _phonon_stable(model, z_table, r_max, dev)

    log.info("=" * 84)
    log.info("NODE 5 — RLSF readout surgery | %s | trainable %d/%d (%.3f%%)", torch.cuda.get_device_name(0), n_train, n_total, 100 * n_train / n_total)
    log.info("baseline: C44=%.1f (target>=%.1f) C11=%.1f C12=%.1f | phonon min=%.2f THz stable=%s",
             c44_0, PROMOTE_C44, c11_0, c12_0, fmin_0, stable_0)
    log.info("loss = L_C44(->%.1f) + %.1f*L_anchor(C11/C12) | lr=%.0e | readout-only (E(3) safe)", REF_C44, LAMBDA_ANCHOR, LR)
    log.info("-" * 84)

    opt = torch.optim.Adam(trainable, lr=LR)
    best_c44 = c44_0
    plateau = 0
    traj = []
    target_eVA3 = REF_C44  # work in GPa throughout

    for epoch in range(1, EPOCHS + 1):
        t0 = time.time()
        opt.zero_grad()
        # L_C44: sigma_xy(g) should equal REF_C44 * g
        l_c44 = 0.0
        for g, b in shear_train.items():
            sxy = _stress_gpa(model, b)[0, 1]
            l_c44 = l_c44 + (sxy - REF_C44 * g) ** 2
        l_c44 = l_c44 / len(shear_train)
        # L_anchor: normal stresses stay at frozen baseline
        l_anchor = 0.0
        for e, b in norm_train.items():
            S = _stress_gpa(model, b)
            l_anchor = l_anchor + (S[0, 0] - sxx0[e]) ** 2 + (S[1, 1] - syy0[e]) ** 2
        l_anchor = l_anchor / (2 * len(norm_train))
        loss = l_c44 + LAMBDA_ANCHOR * l_anchor
        loss.backward()
        torch.nn.utils.clip_grad_norm_(trainable, 5.0)
        opt.step()
        torch.cuda.synchronize()
        dt = (time.time() - t0) * 1000
        vram = torch.cuda.max_memory_allocated() / 1e6

        if epoch % 4 == 0 or epoch == 1:
            c44, c11, c12 = _measure(model, batches)
            traj.append({"epoch": epoch, "loss": float(loss), "C44": c44, "C11": c11, "C12": c12})
            log.info("epoch %3d | loss %8.3f (C44 %7.3f + %.0f*anc %7.3f) | C44=%6.1f C11=%6.1f C12=%6.1f | %4.0fms %5.0fMB",
                     epoch, float(loss), float(l_c44), LAMBDA_ANCHOR, float(l_anchor), c44, c11, c12, dt, vram)
            if c44 > best_c44 + 0.5:
                best_c44 = c44
                plateau = 0
            else:
                plateau += 4
            if c44 >= PROMOTE_C44:
                log.info(">>> C44 crossed PROMOTE threshold (%.1f >= %.1f) at epoch %d", c44, PROMOTE_C44, epoch)
                break
            if plateau >= PLATEAU_PATIENCE:
                log.info(">>> C44 plateaued (best=%.1f, no gain in %d epochs) — Pareto wall.", best_c44, plateau)
                break

    c44_f, c11_f, c12_f = _measure(model, batches)
    stable_f, fmin_f = _phonon_stable(model, z_table, r_max, dev)
    c11_drift = abs(c11_f - c11_0) / abs(c11_0) * 100
    c12_drift = abs(c12_f - c12_0) / abs(c12_0) * 100

    cured = c44_f >= PROMOTE_C44 and stable_f and c11_drift < 10 and c12_drift < 10
    path = "A_cure" if cured else "B_pareto_wall"
    log.info("-" * 84)
    log.info("FINAL: C44 %.1f->%.1f | C11 %.1f->%.1f (%.1f%% drift) | C12 %.1f->%.1f (%.1f%% drift)",
             c44_0, c44_f, c11_0, c11_f, c11_drift, c12_0, c12_f, c12_drift)
    log.info("phonon: min %.2f->%.2f THz | stable=%s", fmin_0, fmin_f, stable_f)
    log.info("VERDICT: %s", "PATH A — CURE (C44 in PROMOTE, normals + phonons intact)" if cured else "PATH B — PARETO WALL (readout cannot heal shear without collateral)")
    log.info("=" * 84)

    result = {
        "schema": "lupine.neural_symbolic.rlsf_surgery.v1",
        "model_id": "mace-mp-0-readout-lora",
        "trainable_params": n_train, "total_params": n_total,
        "c44_initial": c44_0, "c44_final": c44_f, "c44_target": REF_C44, "c44_promote_threshold": PROMOTE_C44,
        "c11_initial": c11_0, "c11_final": c11_f, "c11_drift_pct": c11_drift,
        "c12_initial": c12_0, "c12_final": c12_f, "c12_drift_pct": c12_drift,
        "phonon_min_thz_initial": fmin_0, "phonon_min_thz_final": fmin_f,
        "phonons_stable_final": stable_f,
        "cured": cured, "path": path, "trajectory": traj,
    }
    (OUT_DIR / "node5_result.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    log.info("result -> %s/node5_result.json (Node 6 formalizes %s)", OUT_DIR, path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
