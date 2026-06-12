"""Real GPU MLIP loop: TorchSim(MACE-MP-0) -> distill -> uplift -> formal gate.

The "GPU runner driver" that ``lupine_distill.backends.torchsim`` defers to. Runs a
genuine MACE-MP-0 benchmark on the local GPU via torch_sim against the sealed Ni FCC
EAM-home-turf fixture, fits a zero-point distill correction on the *non-overlapping*
support fixture, computes real elastic constants (C11/C12/C44), the ``distill_v_uplift``
composite, and exercises the ATLAS formal promotion gate across its full range —
grounded in the proved negative-transfer theorem
(``ContextSpecificProof.context_correction_does_not_transfer``).

Run (Python 3.12 GPU venv):
    C:/Users/alexw/mlip-gpu/Scripts/python.exe python/scripts/run_ni_gpu_loop.py
"""

from __future__ import annotations

# Dynamo OFF before any torch import: torch_sim's neighbor list is @torch.compile'd
# and inductor needs Triton (absent on Windows). Eager is fine for 4-atom cells.
import os

os.environ.setdefault("TORCHDYNAMO_DISABLE", "1")

import json
import logging
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch
import torch._dynamo

torch._dynamo.config.suppress_errors = True
torch._dynamo.config.disable = True

from ase import Atoms
from mace.calculators.foundations_models import mace_mp
from torch_sim.io import atoms_to_state
from torch_sim.models.mace import MaceModel

_HERE = Path(__file__).resolve()
for _p in (str(_HERE.parents[1]), str(_HERE.parents[2])):  # python/ ; repo root
    if _p not in sys.path:
        sys.path.insert(0, _p)

from lupine_distill.schemas import BenchmarkMetrics, BenchmarkResult  # noqa: E402
from lupine_distill.uplift import distill_v_uplift  # noqa: E402
from lupine_distill.odf.promotion_gate import evaluate_promotion  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(message)s", stream=sys.stdout)
log = logging.getLogger("ni_gpu_loop")

EV_PER_A3_TO_GPA = 160.21766208
_REPO = _HERE.parents[2]
EVAL_FIXTURE = _REPO / "data/mlip_benchmarks/fixtures/ni_fcc_eam_home_turf_v1.json"
SUPPORT_FIXTURE = _REPO / "gcp/mlip-cell-runner/fixtures/ni_fcc_eam_distill_support_v1.json"
REF_CIJ = {"C11": 246.5, "C12": 147.3, "C44": 124.7}

# Proved Lean theorems (lean-spec, 0 sorry) that ground an in-support promotion.
THEOREM_REFS = (
    "OpenDistillationFactory.Materials.Theory.ContextSpecificProof.context_correction_does_not_transfer",
    "OpenDistillationFactory.Materials.Theory.AccuracyCommitment.accuracyGain_is_operative_value",
)


@dataclass(frozen=True)
class Row:
    symbols: tuple[str, ...]
    cell: tuple
    positions: tuple
    pbc: tuple[bool, bool, bool]
    energy_ev_per_atom: float | None
    forces: tuple | None
    stress_gpa: tuple[float, ...] | None
    strain_voigt: tuple[float, ...] | None


@dataclass(frozen=True)
class Pred:
    energy_per_atom: float
    forces: np.ndarray
    stress_voigt_gpa: np.ndarray


@dataclass(frozen=True)
class Correction:
    energy_bias: float
    stress_bias: np.ndarray

    @staticmethod
    def zero() -> "Correction":
        return Correction(0.0, np.zeros(6))


def _load_rows(path: Path) -> dict[str, list[Row]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    out: dict[str, list[Row]] = {}
    for row_type, block in data.get("row_fixtures", {}).items():
        rows: list[Row] = []
        for s in block.get("structures", []):
            ref = s.get("reference", {})
            f = ref.get("forces_ev_per_angstrom")
            stress = ref.get("stress_gpa")
            strain = s.get("strain_voigt")
            rows.append(
                Row(
                    symbols=tuple(s["symbols"]),
                    cell=tuple(tuple(float(x) for x in row) for row in s["cell"]),
                    positions=tuple(tuple(float(x) for x in p) for p in s["positions"]),
                    pbc=tuple(bool(b) for b in s["pbc"]),
                    energy_ev_per_atom=ref.get("energy_ev_per_atom"),
                    forces=tuple(tuple(float(x) for x in v) for v in f) if f else None,
                    stress_gpa=tuple(float(x) for x in stress) if stress else None,
                    strain_voigt=tuple(float(x) for x in strain) if strain else None,
                )
            )
        out[row_type] = rows
    return out


def _build_model(device: torch.device, dtype: torch.dtype) -> MaceModel:
    log.info("Loading MACE-MP-0 medium (cached) on %s ...", device.type)
    raw = mace_mp(model="medium", device=device.type, default_dtype="float64", return_raw_model=True)
    return MaceModel(model=raw, device=device, dtype=dtype, compute_forces=True, compute_stress=True)


def _evaluate(model: MaceModel, rows: list[Row], device: torch.device, dtype: torch.dtype) -> list[Pred]:
    if not rows:
        return []
    atoms_list = [
        Atoms(symbols=list(r.symbols), positions=np.array(r.positions), cell=np.array(r.cell), pbc=r.pbc)
        for r in rows
    ]
    state = atoms_to_state(atoms_list, device=device, dtype=dtype)
    out = model(state)  # forces via autograd inside forward — no no_grad()
    energies = out["energy"].reshape(-1).detach().cpu().numpy()
    forces_all = out["forces"].detach().cpu().numpy()
    stress_all = out["stress"].detach().cpu().numpy().reshape(-1, 3, 3)
    preds: list[Pred] = []
    cursor = 0
    for i, r in enumerate(rows):
        n = len(r.symbols)
        f = forces_all[cursor : cursor + n]
        cursor += n
        s = stress_all[i] * EV_PER_A3_TO_GPA
        voigt = np.array([s[0, 0], s[1, 1], s[2, 2], s[1, 2], s[0, 2], s[0, 1]])
        preds.append(Pred(float(energies[i]) / n, f, voigt))
    return preds


def _fit_correction(rows: dict[str, list[Row]], preds: dict[str, list[Pred]]) -> Correction:
    ev_r, ev_p = rows.get("energy_volume", []), preds.get("energy_volume", [])
    e_res = [r.energy_ev_per_atom - p.energy_per_atom for r, p in zip(ev_r, ev_p) if r.energy_ev_per_atom is not None]
    s_r = rows.get("stress", []) + rows.get("elastic_constants", [])
    s_p = preds.get("stress", []) + preds.get("elastic_constants", [])
    s_res = [np.array(r.stress_gpa) - p.stress_voigt_gpa for r, p in zip(s_r, s_p) if r.stress_gpa is not None]
    return Correction(
        energy_bias=float(np.mean(e_res)) if e_res else 0.0,
        stress_bias=np.mean(np.stack(s_res), axis=0) if s_res else np.zeros(6),
    )


def _mae_energy(rows, preds, corr) -> float | None:
    e = [abs((p.energy_per_atom + corr.energy_bias) - r.energy_ev_per_atom) for r, p in zip(rows, preds) if r.energy_ev_per_atom is not None]
    return float(np.mean(e)) if e else None


def _mae_forces(rows, preds) -> float | None:
    e = [float(np.mean(np.abs(p.forces - np.array(r.forces)))) for r, p in zip(rows, preds) if r.forces is not None]
    return float(np.mean(e)) if e else None


def _mae_stress(rows, preds, corr) -> float | None:
    e = [float(np.mean(np.abs((p.stress_voigt_gpa + corr.stress_bias) - np.array(r.stress_gpa)))) for r, p in zip(rows, preds) if r.stress_gpa is not None]
    return float(np.mean(e)) if e else None


def _zero_strain_stress(rows: list[Row], preds: list[Pred]) -> np.ndarray:
    """The model's residual stress at zero strain (subtracted before the Cij slope fit)."""
    for r, p in zip(rows, preds):
        if r.strain_voigt is not None and float(np.max(np.abs(r.strain_voigt))) < 1e-9:
            return p.stress_voigt_gpa
    return np.zeros(6)


def _fit_cubic_cij(rows: list[Row], stresses: list[np.ndarray], baseline: np.ndarray):
    """Least-squares fit of cubic C11,C12,C44 from (Voigt strain, Voigt stress) pairs.

    Elastic constants are the stress *response* to strain, so we subtract each
    model's own zero-strain residual stress (``baseline``). Returns (C11,C12,C44)
    or None if the strains don't span enough directions (rank-deficient).
    """
    A: list[list[float]] = []
    b: list[float] = []
    for r, sig_raw in zip(rows, stresses):
        if r.strain_voigt is None:
            continue
        e1, e2, e3, e4, e5, e6 = r.strain_voigt
        if max(abs(e1), abs(e2), abs(e3), abs(e4), abs(e5), abs(e6)) < 1e-9:
            continue
        sig = sig_raw - baseline
        eqs = [
            ([e1, e2 + e3, 0.0], sig[0]),
            ([e2, e1 + e3, 0.0], sig[1]),
            ([e3, e1 + e2, 0.0], sig[2]),
            ([0.0, 0.0, e4], sig[3]),
            ([0.0, 0.0, e5], sig[4]),
            ([0.0, 0.0, e6], sig[5]),
        ]
        for coef, val in eqs:
            A.append(coef)
            b.append(val)
    if len(A) < 3:
        return None
    Am = np.array(A)
    if np.linalg.matrix_rank(Am) < 3:
        return None
    x, *_ = np.linalg.lstsq(Am, np.array(b), rcond=None)
    return float(x[0]), float(x[1]), float(x[2])


def _benchmark_result(*, distill_version, engine, rows, preds, corr, wall_s) -> BenchmarkResult:
    static = BenchmarkMetrics(
        mae_energy=_mae_energy(rows.get("energy_volume", []), preds.get("energy_volume", []), corr),
        mae_forces=_mae_forces(rows.get("forces", []), preds.get("forces", [])),
        mae_stress=_mae_stress(rows.get("stress", []), preds.get("stress", []), corr),
        dft_reference={f"{k}_gpa": v for k, v in REF_CIJ.items()},
        wall_time_seconds=wall_s,
    )
    elastic = BenchmarkMetrics(
        mae_stress=_mae_stress(rows.get("elastic_constants", []), preds.get("elastic_constants", []), corr),
        mae_energy=_mae_energy(rows.get("energy_volume", []), preds.get("energy_volume", []), corr),
        wall_time_seconds=wall_s,
    )
    return BenchmarkResult(
        model_id="mace-mp-0",
        distill_version=distill_version,
        backend="torchsim",
        timestamp=datetime.now(timezone.utc),
        torchsim_version=engine,
        benchmark_suite_version="ni-fcc-eam-home-turf-v1",
        results={"static_energy": static, "elastic_constants": elastic},
    )


def _gate(uplift: float | None, *, certified: bool):
    return evaluate_promotion(
        {
            "model_id": "mace-mp-0",
            "distill_version": 1,
            "overall_uplift_pct": uplift,
            "atlas_theorem_refs": list(THEOREM_REFS),
            "formal_properties": (
                ["distill_win_has_positive_operative_value", "hyper_ribbon_survives_context_correction"]
                if certified
                else []
            ),
        }
    )


def main() -> int:
    if not torch.cuda.is_available():
        log.error("CUDA not available — this driver targets the GPU.")
        return 2
    device, dtype = torch.device("cuda"), torch.float64
    import torch_sim

    engine = getattr(torch_sim, "__version__", "?")
    log.info("=" * 76)
    log.info("Ni FCC GPU distill loop | %s | torch %s | torch_sim %s", torch.cuda.get_device_name(0), torch.__version__, engine)
    log.info("=" * 76)

    eval_rows = _load_rows(EVAL_FIXTURE)
    support_rows = _load_rows(SUPPORT_FIXTURE)
    model = _build_model(device, dtype)

    t0 = time.time()
    eval_preds = {k: _evaluate(model, v, device, dtype) for k, v in eval_rows.items()}
    torch.cuda.synchronize()
    eval_wall = time.time() - t0
    support_preds = {k: _evaluate(model, v, device, dtype) for k, v in support_rows.items()}
    torch.cuda.synchronize()
    n_eval = sum(len(v) for v in eval_preds.values())
    log.info("GPU eval: %d eval + %d support structures in %.2fs", n_eval, sum(len(v) for v in support_preds.values()), eval_wall)

    corr = _fit_correction(support_rows, support_preds)
    base_sup = _mae_energy(support_rows.get("energy_volume", []), support_preds.get("energy_volume", []), Correction.zero())
    lift_sup = _mae_energy(support_rows.get("energy_volume", []), support_preds.get("energy_volume", []), corr)
    support_lift = (base_sup - lift_sup) / base_sup if (base_sup and lift_sup is not None and base_sup > 0) else None
    log.info("distill zero-point correction: energy_bias=%+.4f eV/atom | support self-lift=%s",
             corr.energy_bias, f"{support_lift*100:.1f}%" if support_lift is not None else "n/a")

    v0 = _benchmark_result(distill_version=0, engine=engine, rows=eval_rows, preds=eval_preds, corr=Correction.zero(), wall_s=eval_wall)
    v1 = _benchmark_result(distill_version=1, engine=engine, rows=eval_rows, preds=eval_preds, corr=corr, wall_s=eval_wall)
    report = distill_v_uplift(model_id="mace-mp-0", baseline_v0=v0, distill_vN=v1, version=1)
    overall = report.get("overall_uplift_pct")

    # ---- Real elastic constants (C11/C12/C44) from the strained eval structures ----
    el_rows = eval_rows.get("elastic_constants", [])
    el_preds = eval_preds.get("elastic_constants", [])
    base = _zero_strain_stress(el_rows, el_preds)
    mace_cij = _fit_cubic_cij(el_rows, [p.stress_voigt_gpa for p in el_preds], base)
    ref_cij = _fit_cubic_cij(el_rows, [np.array(r.stress_gpa) for r in el_rows], np.zeros(6))  # recover EAM ref (calibration)

    def fmt(x):
        return "   n/a " if x is None else f"{x:8.4f}"

    log.info("-" * 76)
    log.info("MAE vs Ni Mishin-1999 EAM reference (lower better)")
    log.info("%-26s %9s %9s %9s", "benchmark.metric", "v0 base", "v1 distil", "uplift%")
    for bench in ("static_energy", "elastic_constants"):
        for metric in ("mae_energy", "mae_forces", "mae_stress"):
            a, b = getattr(v0.results[bench], metric), getattr(v1.results[bench], metric)
            if a is None and b is None:
                continue
            up = (a - b) / abs(a) * 100 if (a not in (None, 0) and b is not None) else None
            log.info("%-26s %s %s %s", f"{bench}.{metric.split('_')[1]}", fmt(a), fmt(b), "   n/a" if up is None else f"{up:7.2f}")
        pb = report["per_benchmark"].get(bench)
        wb = pb if isinstance(pb, (int, float)) else None
        log.info("   -> %s weighted uplift: %s", bench, "n/a" if wb is None else f"{wb:.2f}%")
    log.info("-" * 76)
    log.info("ELASTIC CONSTANTS (GPa) — computed on GPU vs literature reference")
    if mace_cij and ref_cij:
        # Calibrate sign: if the EAM-ref recovery is negated vs the literature Cij, flip both.
        sign = 1.0 if ref_cij[0] * REF_CIJ["C11"] >= 0 else -1.0
        mc = [sign * v for v in mace_cij]
        rc = [sign * v for v in ref_cij]
        log.info("%-10s %10s %10s %12s", "constant", "MACE-MP-0", "ref(lit)", "ref-recovered")
        for i, k in enumerate(("C11", "C12", "C44")):
            log.info("%-10s %10.1f %10.1f %12.1f", k, mc[i], REF_CIJ[k], rc[i])
    else:
        log.info("   (elastic fit underdetermined for this fixture's strain set — relying on stress MAE)")
    log.info("-" * 76)

    # ---- Formal promotion gate across its full range (real numbers) ----
    forces_up = report["per_benchmark"].get("static_energy")  # not forces-only; compute forces uplift directly
    f0, f1 = v0.results["static_energy"].mae_forces, v1.results["static_energy"].mae_forces
    forces_only_uplift = (f0 - f1) / abs(f0) * 100 if (f0 not in (None, 0) and f1 is not None) else 0.0

    g_certified = _gate(overall, certified=True)        # in-support, theorem-backed
    g_uncertified = _gate(overall, certified=False)     # out-of-support: T3 negative-transfer regime
    g_marginal = _gate(forces_only_uplift, certified=False)  # marginal uplift + uncertified

    log.info("FORMAL PROMOTION GATE (overall uplift %.2f%%) — grounded in:", overall if overall is not None else float("nan"))
    for t in THEOREM_REFS:
        log.info("   - %s", t)
    log.info("")
    log.info("  [1] in-support, certified (formal_properties present)   -> %s", g_certified.decision.value.upper())
    log.info("      %s", " | ".join(g_certified.reasons))
    log.info("  [2] out-of-support, UNCERTIFIED (T3 negative-transfer)   -> %s", g_uncertified.decision.value.upper())
    log.info("      %s", " | ".join(g_uncertified.reasons))
    log.info("  [3] marginal uplift (%.1f%%) + uncertified              -> %s", forces_only_uplift, g_marginal.decision.value.upper())
    log.info("      %s", " | ".join(g_marginal.reasons))
    log.info("=" * 76)
    log.info("TAKEAWAY: a measured %.0f%% win auto-promotes ONLY with the in-support formal", overall or 0)
    log.info("certification; the same win, applied out-of-scope (the proved negative-transfer")
    log.info("regime), is held for review. The formal layer gates real GPU compute.")
    log.info("=" * 76)

    out_dir = _REPO / "tmp" / "mlip-gpu-ni"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "v0_baseline.json").write_text(json.dumps(v0.model_dump(mode="json"), indent=2), encoding="utf-8")
    (out_dir / "v1_distilled.json").write_text(json.dumps(v1.model_dump(mode="json"), indent=2), encoding="utf-8")
    (out_dir / "uplift_report.json").write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    (out_dir / "gate_decisions.json").write_text(
        json.dumps(
            {"in_support_certified": g_certified.to_dict(), "out_of_support_uncertified": g_uncertified.to_dict(), "marginal_uncertified": g_marginal.to_dict()},
            indent=2,
        ),
        encoding="utf-8",
    )
    if mace_cij and ref_cij:
        sign = 1.0 if ref_cij[0] * REF_CIJ["C11"] >= 0 else -1.0
        (out_dir / "elastic_constants.json").write_text(
            json.dumps({"mace_mp_0_gpa": {k: sign * mace_cij[i] for i, k in enumerate(("C11", "C12", "C44"))}, "reference_gpa": REF_CIJ}, indent=2),
            encoding="utf-8",
        )
    log.info("artifacts -> %s", out_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
