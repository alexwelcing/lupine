#!/usr/bin/env python3
"""Run measured local MLIP trajectories for the long-horizon viewer demos."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import pathlib
import random
import shutil
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable

import numpy as np
from ase import Atoms, units
from ase.build import bulk
from ase.md.langevin import Langevin
from ase.md.velocitydistribution import MaxwellBoltzmannDistribution, Stationary
from ase.optimize import FIRE

ROOT = pathlib.Path(__file__).resolve().parents[1]
RUNNER_DIR = ROOT / "gcp" / "mlip-cell-runner"
if str(RUNNER_DIR) not in sys.path:
    sys.path.insert(0, str(RUNNER_DIR))

from mlip_cell_runner import load_calculator, runtime_versions  # noqa: E402

EV_PER_A3_TO_GPA = 160.21766208
DEFAULT_DATA_DIR = ROOT / "data" / "mlip_benchmarks" / "long_demo_artifacts"
DEFAULT_VIEWER_DIR = ROOT / "atlas" / "atlas-view" / "apps" / "web" / "public" / "mlip"
DEFAULT_LIBRARY_DIR = ROOT / "library-site" / "src" / "reports" / "assets" / "mlip"
REGISTRY_PATHS = [
    ROOT / "data" / "mlip_benchmarks" / "mlip_long_demo_registry.json",
    DEFAULT_VIEWER_DIR / "mlip-long-demo-registry.json",
    DEFAULT_LIBRARY_DIR / "mlip-long-demo-registry.json",
]


@dataclass(frozen=True)
class DemoRun:
    demo_id: str
    artifact_name: str
    label: str
    mode: str
    material_id: str
    temperature_k: float
    timestep_fs: float
    steps: int
    log_interval: int


@dataclass(frozen=True)
class PublishedArtifact:
    spec: DemoRun
    artifact_name: str
    mlip_id: str
    variant_id: str
    label: str
    artifact_role: str
    score_summary: dict[str, Any] | None = None
    paired_score_uri: str | None = None


DEMO_RUNS = {
    "ni-vacancy": DemoRun(
        demo_id="ni-vacancy-diffusion-arrhenius-v1",
        artifact_name="chgnet-ni-fcc-vacancy-md-local-v1.json",
        label="CHGNet baseline vacancy MD",
        mode="langevin",
        material_id="Ni-fcc-vacancy",
        temperature_k=650.0,
        timestep_fs=1.0,
        steps=40,
        log_interval=4,
    ),
    "mg-slip": DemoRun(
        demo_id="hcp-mg-slip-stacking-fault-v1",
        artifact_name="chgnet-mg-hcp-slip-md-local-v1.json",
        label="CHGNet baseline shear MD",
        mode="langevin",
        material_id="Mg-hcp-slip",
        temperature_k=350.0,
        timestep_fs=0.5,
        steps=36,
        log_interval=3,
    ),
    "lifepo4-channel": DemoRun(
        demo_id="lifepo4-li-channel-migration-v1",
        artifact_name="chgnet-lifepo4-li-channel-md-local-v1.json",
        label="CHGNet baseline Li-channel MD",
        mode="langevin",
        material_id="LiFePO4-li-channel",
        temperature_k=450.0,
        timestep_fs=0.5,
        steps=32,
        log_interval=4,
    ),
}

VARIANT_ARTIFACT_SUFFIX = {
    "baseline": "md-local-v1",
    "distill_accuracy": "distill-accuracy-local-v1",
}

DISTILL_POLICY = {
    "schema": "lupine.distill.long_demo_policy.v1",
    "policy_id": "ribbon_projected_reference_recovery_local_v2",
    "ribbon_version": "hyperribbon-local-offset-v2",
    "mode": "bounded_in_run_reference_recovery",
    "correction_coordinate": "centered_cartesian_position_residual",
    "stiff_axes_preserved": ["cell_vectors", "species_order", "global_translation"],
    "max_step_correction_angstrom": 0.035,
    "correction_scale": 0.30,
    "max_reference_rmse_angstrom": 0.5,
    "max_force_norm_ev_per_angstrom": 25.0,
    "velocity_damping": 0.98,
    "claim_scope": "local_offset_recovery_canary_not_public_defect_diffusion_claim",
}


def distill_policy_from_args(args: argparse.Namespace) -> dict[str, Any]:
    policy = dict(DISTILL_POLICY)
    overrides = {
        "correction_scale": getattr(args, "distill_correction_scale", None),
        "max_step_correction_angstrom": getattr(args, "distill_max_step_correction_angstrom", None),
        "velocity_damping": getattr(args, "distill_velocity_damping", None),
        "max_reference_rmse_angstrom": getattr(args, "distill_max_reference_rmse_angstrom", None),
    }
    applied = {key: float(value) for key, value in overrides.items() if value is not None}
    policy.update(applied)
    if applied:
        policy["policy_id"] = f"{policy['policy_id']}_override"
        policy["local_override"] = applied
    return policy


def utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def rng(seed: int) -> np.random.Generator:
    return np.random.default_rng(seed)


def build_ni_vacancy(seed: int) -> tuple[Atoms, dict[str, Any]]:
    reference = bulk("Ni", "fcc", a=3.524, cubic=True).repeat((3, 3, 3))
    center = np.sum(reference.cell.array, axis=0) * 0.5
    distances = np.linalg.norm(reference.positions - center, axis=1)
    vacancy_index = int(np.argmin(distances))
    vacancy_position = np.asarray(reference.positions[vacancy_index], dtype=float).tolist()
    del reference[vacancy_index]
    atoms = reference.copy()
    atoms.set_cell(atoms.cell.array * 1.006, scale_atoms=True)
    atoms.positions += rng(seed).normal(0.0, 0.018, size=atoms.positions.shape)
    atoms.wrap()
    return atoms, {
        "source": "ASE bulk(Ni, fcc, a=3.524) with central vacancy",
        "source_url": "data/mlip_benchmarks/fixtures/ni_fcc_eam_home_turf_v1.json",
        "lattice_a_angstrom": 3.524,
        "cell_angstrom": np.asarray(reference.cell.array, dtype=float).tolist(),
        "positions_angstrom": np.asarray(reference.positions, dtype=float).tolist(),
        "vacancy_site_angstrom": vacancy_position,
        "reference_kind": "local_vacancy_offset_canary",
    }


def build_mg_slip(seed: int) -> tuple[Atoms, dict[str, Any]]:
    reference = bulk("Mg", "hcp", a=3.209, c=5.211).repeat((4, 4, 3))
    atoms = reference.copy()
    scaled = atoms.get_scaled_positions()
    top_half = scaled[:, 2] > 0.5
    slip_vector = 0.16 * atoms.cell.array[0] / np.linalg.norm(atoms.cell.array[0])
    atoms.positions[top_half] += slip_vector
    cell = atoms.cell.array.copy()
    cell[2] += 0.035 * cell[0]
    atoms.set_cell(cell, scale_atoms=False)
    atoms.positions += rng(seed).normal(0.0, 0.01, size=atoms.positions.shape)
    atoms.wrap()
    return atoms, {
        "source": "ASE bulk(Mg, hcp, a=3.209, c=5.211) with measured basal shear offset",
        "source_url": None,
        "lattice_a_angstrom": 3.209,
        "cell_angstrom": np.asarray(reference.cell.array, dtype=float).tolist(),
        "positions_angstrom": np.asarray(reference.positions, dtype=float).tolist(),
        "slip_plane_scaled_z": 0.5,
        "slip_vector_angstrom": slip_vector.tolist(),
        "reference_kind": "local_hcp_shear_offset_canary",
    }


def build_lifepo4_channel(seed: int) -> tuple[Atoms, dict[str, Any]]:
    from pymatgen.core import Lattice, Structure
    from pymatgen.io.ase import AseAtomsAdaptor

    lattice = Lattice.orthorhombic(10.338, 6.011, 4.695)
    structure = Structure.from_spacegroup(
        "Pnma",
        lattice,
        ["Li", "Fe", "P", "O", "O", "O"],
        [
            [0.0, 0.0, 0.0],
            [0.2822, 0.25, 0.9747],
            [0.0946, 0.25, 0.4180],
            [0.0967, 0.25, 0.7422],
            [0.4542, 0.25, 0.2069],
            [0.1656, 0.0465, 0.2848],
        ],
    )
    reference = AseAtomsAdaptor.get_atoms(structure)
    atoms = reference.copy()
    symbols = np.asarray(atoms.get_chemical_symbols())
    li_indices = np.flatnonzero(symbols == "Li")
    if len(li_indices) == 0:
        raise RuntimeError("LiFePO4 structure has no Li sites")
    li_index = int(li_indices[np.argmin(atoms.positions[li_indices, 1])])
    channel_offset = np.array([0.0, 0.55, 0.0])
    atoms.positions[li_index] += channel_offset
    atoms.positions[li_indices] += rng(seed).normal(0.0, 0.012, size=(len(li_indices), 3))
    atoms.wrap()
    return atoms, {
        "source": "Olivine LiFePO4 Pnma literature seed, a=10.338 A, b=6.011 A, c=4.695 A",
        "source_url": "https://www.rsc.org/suppdata/cp/b9/b912820d/b912820d.pdf",
        "lattice_a_angstrom": 10.338,
        "cell_angstrom": np.asarray(reference.cell.array, dtype=float).tolist(),
        "positions_angstrom": np.asarray(reference.positions, dtype=float).tolist(),
        "migrating_li_index": li_index + 1,
        "channel_offset_angstrom": channel_offset.tolist(),
        "reference_kind": "local_li_channel_offset_canary",
    }


def make_atoms(demo: str, seed: int) -> tuple[Atoms, dict[str, Any]]:
    if demo == "ni-vacancy":
        return build_ni_vacancy(seed)
    if demo == "mg-slip":
        return build_mg_slip(seed)
    if demo == "lifepo4-channel":
        return build_lifepo4_channel(seed)
    raise ValueError(f"unknown demo: {demo}")


def artifact_name_for(spec: DemoRun, mlip_id: str, variant_id: str) -> str:
    if variant_id == "baseline" and mlip_id == "chgnet":
        return spec.artifact_name
    suffix = VARIANT_ARTIFACT_SUFFIX.get(variant_id)
    if not suffix:
        raise ValueError(f"unsupported variant: {variant_id}")
    material = spec.material_id.lower().replace("-", "_").replace("_", "-")
    return f"{mlip_id}-{material}-{suffix}.json"


def label_for(spec: DemoRun, variant_id: str, mlip_id: str) -> str:
    if variant_id == "baseline":
        return spec.label
    readable = variant_id.replace("_", " ").title()
    return f"{mlip_id.upper()} {readable} {spec.material_id} MD"


def reference_hash(reference: dict[str, Any]) -> str:
    data = json.dumps(reference, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return "sha256:" + hashlib.sha256(data).hexdigest()


def reference_positions(reference: dict[str, Any]) -> np.ndarray | None:
    positions = reference.get("positions_angstrom")
    if not isinstance(positions, list):
        return None
    try:
        arr = np.asarray(positions, dtype=float)
    except Exception:
        return None
    if arr.ndim != 2 or arr.shape[1] != 3 or not np.all(np.isfinite(arr)):
        return None
    return arr


def reference_cell(reference: dict[str, Any]) -> np.ndarray | None:
    cell = reference.get("cell_angstrom")
    if not isinstance(cell, list):
        return None
    try:
        arr = np.asarray(cell, dtype=float)
    except Exception:
        return None
    if arr.shape != (3, 3) or not np.all(np.isfinite(arr)):
        return None
    return arr


def centered_residual_to_reference(atoms: Atoms, reference: dict[str, Any]) -> np.ndarray | None:
    ref = reference_positions(reference)
    if ref is None or ref.shape != atoms.positions.shape:
        return None
    ref_cell = reference_cell(reference)
    atom_cell = np.asarray(atoms.cell.array, dtype=float)
    if ref_cell is not None and np.linalg.det(ref_cell) and np.linalg.det(atom_cell):
        try:
            ref_scaled = ref @ np.linalg.inv(ref_cell)
            atom_scaled = atoms.get_scaled_positions(wrap=True)
            residual_scaled = ref_scaled - atom_scaled
            residual_scaled -= np.round(residual_scaled)
            residual = residual_scaled @ atom_cell
        except np.linalg.LinAlgError:
            residual = ref - np.asarray(atoms.positions, dtype=float)
    else:
        residual = ref - np.asarray(atoms.positions, dtype=float)
    residual -= np.mean(residual, axis=0, keepdims=True)
    return residual


def reference_rmse_angstrom(atoms: Atoms, reference: dict[str, Any]) -> float | None:
    residual = centered_residual_to_reference(atoms, reference)
    if residual is None:
        return None
    return float(np.sqrt(np.mean(np.sum(residual**2, axis=1))))


def closeness_from_rmse(rmse: float | None) -> float | None:
    if rmse is None or not math.isfinite(rmse):
        return None
    return float(1.0 / (1.0 + rmse / 0.05))


def clip_vector_norms(vectors: np.ndarray, max_norm: float) -> np.ndarray:
    norms = np.linalg.norm(vectors, axis=1)
    scale = np.ones_like(norms)
    mask = norms > max_norm
    scale[mask] = max_norm / np.maximum(norms[mask], 1e-12)
    return vectors * scale[:, None]


def apply_distill_accuracy_guard(
    atoms: Atoms,
    reference: dict[str, Any],
    *,
    step: int,
    events: list[dict[str, Any]],
    policy: dict[str, Any],
) -> dict[str, Any]:
    rmse_before = reference_rmse_angstrom(atoms, reference)
    if rmse_before is None:
        event = {
            "step": step,
            "decision": "refuse",
            "reason": "reference_shape_mismatch",
        }
        events.append(event)
        return event
    if rmse_before > float(policy["max_reference_rmse_angstrom"]):
        event = {
            "step": step,
            "decision": "refuse",
            "reason": "outside_reference_tube",
            "reference_rmse_before_angstrom": rmse_before,
        }
        events.append(event)
        return event
    try:
        force_max = float(np.max(np.linalg.norm(np.asarray(atoms.get_forces(), dtype=float), axis=1)))
    except Exception:
        force_max = math.inf
    if not math.isfinite(force_max) or force_max > float(policy["max_force_norm_ev_per_angstrom"]):
        event = {
            "step": step,
            "decision": "refuse",
            "reason": "force_guard",
            "force_max_norm_ev_per_angstrom": force_max,
            "reference_rmse_before_angstrom": rmse_before,
        }
        events.append(event)
        return event

    residual = centered_residual_to_reference(atoms, reference)
    if residual is None:
        event = {
            "step": step,
            "decision": "refuse",
            "reason": "reference_residual_unavailable",
            "reference_rmse_before_angstrom": rmse_before,
        }
        events.append(event)
        return event

    raw_delta = residual * float(policy["correction_scale"])
    delta = clip_vector_norms(raw_delta, float(policy["max_step_correction_angstrom"]))
    atoms.set_positions(np.asarray(atoms.positions, dtype=float) + delta)
    atoms.wrap()
    velocities = atoms.get_velocities()
    if velocities is not None:
        atoms.set_velocities(np.asarray(velocities, dtype=float) * float(policy["velocity_damping"]))

    rmse_after = reference_rmse_angstrom(atoms, reference)
    event = {
        "step": step,
        "decision": "delta_correct",
        "reason": "bounded_reference_recovery",
        "reference_rmse_before_angstrom": rmse_before,
        "reference_rmse_after_angstrom": rmse_after,
        "correction_norm_max_angstrom": float(np.max(np.linalg.norm(delta, axis=1))) if delta.size else 0.0,
        "correction_norm_mean_angstrom": float(np.mean(np.linalg.norm(delta, axis=1))) if delta.size else 0.0,
        "force_max_norm_ev_per_angstrom_before": force_max,
        "stiff_axis_drift_fraction": 0.0,
    }
    events.append(event)
    return event


def stress_gpa(atoms: Atoms) -> list[float] | None:
    try:
        return (np.asarray(atoms.get_stress(voigt=True), dtype=float) * EV_PER_A3_TO_GPA).tolist()
    except Exception:
        return None


def frame_from_atoms(
    atoms: Atoms,
    step: int,
    started_at: float,
    *,
    reference: dict[str, Any] | None = None,
    distill_intervention_count: int = 0,
) -> dict[str, Any]:
    forces = np.asarray(atoms.get_forces(), dtype=float)
    frame = {
        "step": step,
        "time_seconds": max(time.perf_counter() - started_at, 0.0),
        "cell_angstrom": np.asarray(atoms.cell.array, dtype=float).tolist(),
        "positions_angstrom": np.asarray(atoms.positions, dtype=float).tolist(),
        "symbols": atoms.get_chemical_symbols(),
        "energy_ev_per_atom": float(atoms.get_potential_energy()) / max(len(atoms), 1),
        "kinetic_energy_ev_per_atom": float(atoms.get_kinetic_energy()) / max(len(atoms), 1),
        "temperature_k": safe_float(lambda: atoms.get_temperature()),
        "forces_ev_per_angstrom": forces.tolist(),
        "force_max_norm_ev_per_angstrom": float(np.max(np.linalg.norm(forces, axis=1))) if forces.size else 0.0,
        "distill_intervention_count": distill_intervention_count,
    }
    if reference is not None:
        rmse = reference_rmse_angstrom(atoms, reference)
        if rmse is not None:
            frame["reference_position_rmse_angstrom"] = rmse
            frame["distance_to_reference"] = rmse
            frame["closeness"] = closeness_from_rmse(rmse)
    stress = stress_gpa(atoms)
    if stress is not None:
        frame["stress_gpa"] = stress
    return frame


def safe_float(fn) -> float | None:
    try:
        value = float(fn())
    except Exception:
        return None
    return value if math.isfinite(value) else None


def run_langevin(
    atoms: Atoms,
    spec: DemoRun,
    seed: int,
    *,
    reference: dict[str, Any],
    distill_policy: dict[str, Any] | None = None,
    distill_events: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    random_state = np.random.RandomState(seed)
    MaxwellBoltzmannDistribution(atoms, temperature_K=spec.temperature_k, rng=random_state, force_temp=True)
    Stationary(atoms)
    dyn = Langevin(
        atoms,
        timestep=spec.timestep_fs * units.fs,
        temperature_K=spec.temperature_k,
        friction=0.01 / units.fs,
        rng=random_state,
        logfile=None,
    )
    started_at = time.perf_counter()
    frames = [
        frame_from_atoms(
            atoms,
            0,
            started_at,
            reference=reference,
            distill_intervention_count=0,
        )
    ]
    current = 0
    while current < spec.steps:
        chunk = min(spec.log_interval, spec.steps - current)
        dyn.run(chunk)
        current += chunk
        if distill_policy is not None and distill_events is not None:
            apply_distill_accuracy_guard(
                atoms,
                reference,
                step=current,
                events=distill_events,
                policy=distill_policy,
            )
        frames.append(
            frame_from_atoms(
                atoms,
                current,
                started_at,
                reference=reference,
                distill_intervention_count=len(
                    [event for event in (distill_events or []) if event.get("decision") == "delta_correct"]
                ),
            )
        )
    return frames


def run_relax(atoms: Atoms, spec: DemoRun, *, reference: dict[str, Any]) -> list[dict[str, Any]]:
    opt = FIRE(atoms, logfile=None)
    started_at = time.perf_counter()
    frames = [frame_from_atoms(atoms, 0, started_at, reference=reference)]
    for step in range(1, spec.steps + 1):
        converged = bool(opt.run(fmax=0.05, steps=1))
        if step % spec.log_interval == 0 or converged or step == spec.steps:
            frame = frame_from_atoms(atoms, step, started_at, reference=reference)
            frame["relaxation_converged"] = converged
            frames.append(frame)
        if converged:
            break
    return frames


def diagnostics(frames: list[dict[str, Any]], started_at: float) -> dict[str, Any]:
    energies = [float(frame["energy_ev_per_atom"]) for frame in frames if isinstance(frame.get("energy_ev_per_atom"), (int, float))]
    rmses = [
        float(frame["reference_position_rmse_angstrom"])
        for frame in frames
        if isinstance(frame.get("reference_position_rmse_angstrom"), (int, float))
    ]
    max_force = max(
        (float(frame.get("force_max_norm_ev_per_angstrom", 0.0)) for frame in frames),
        default=0.0,
    )
    intervention_count = max(
        (int(frame.get("distill_intervention_count", 0)) for frame in frames),
        default=0,
    )
    return {
        "frames": len(frames),
        "elapsed_seconds_wall": round(time.perf_counter() - started_at, 6),
        "energy_drift_ev_per_atom": round(energies[-1] - energies[0], 8) if len(energies) >= 2 else None,
        "max_force_norm_ev_per_angstrom": round(max_force, 8),
        "start_energy_ev_per_atom": round(energies[0], 8) if energies else None,
        "final_energy_ev_per_atom": round(energies[-1], 8) if energies else None,
        "start_reference_position_rmse_angstrom": round(rmses[0], 8) if rmses else None,
        "final_reference_position_rmse_angstrom": round(rmses[-1], 8) if rmses else None,
        "mean_reference_position_rmse_angstrom": round(float(np.mean(rmses)), 8) if rmses else None,
        "distill_intervention_count": intervention_count,
    }


def build_payload(
    *,
    demo_key: str,
    spec: DemoRun,
    mlip_id: str,
    variant_id: str,
    seed: int,
    reference: dict[str, Any],
    frames: list[dict[str, Any]],
    started_at: float,
    distill_policy: dict[str, Any] | None = None,
    distill_events: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    artifact_role = (
        "measured_baseline_trajectory"
        if variant_id == "baseline"
        else "measured_distill_accuracy_trajectory"
    )
    payload = {
        "schema": "lupine.mlip.md_trajectory.v1",
        "run_id": f"{mlip_id}-{demo_key}-{variant_id}-local-v1",
        "cell_id": f"{mlip_id}:{spec.demo_id}:{variant_id}",
        "variant_id": variant_id,
        "mlip_id": mlip_id,
        "material_id": spec.material_id,
        "generated_at": utc_iso(),
        "reference": reference,
        "reference_hash": reference_hash(reference),
        "perturbation": {
            "seed": seed,
            "mode": spec.mode,
            "temperature_k": spec.temperature_k,
            "timestep_fs": spec.timestep_fs,
            "steps": spec.steps,
            "log_interval": spec.log_interval,
        },
        "ensemble": spec.mode,
        "temperature_k": spec.temperature_k,
        "timestep_fs": spec.timestep_fs,
        "frames": frames,
        "diagnostics": diagnostics(frames, started_at),
        "runtime_versions": runtime_versions(),
        "artifact_role": artifact_role,
        "viewer_contract": {
            "measured_not_mock": True,
            "loadable_by": "atlas-view MlipLongRunWorkbench",
            "demo_id": spec.demo_id,
        },
    }
    if variant_id == "distill_accuracy":
        events = distill_events or []
        payload["distill_runtime"] = {
            "schema": "lupine.distill.runtime_trace.v1",
            "profile": "accuracy",
            "policy": distill_policy or DISTILL_POLICY,
            "support_manifest_hash": reference_hash(reference),
            "interventions": events,
            "intervention_count": len([event for event in events if event.get("decision") == "delta_correct"]),
            "refusal_count": len([event for event in events if event.get("decision") == "refuse"]),
            "theorem_hooks": [
                {
                    "hook": "stiff_axis_preservation",
                    "runtime_proxy": "cell_vectors_not_modified_by_policy",
                    "status": "measured",
                },
                {
                    "hook": "orthogonal_complement_lift",
                    "runtime_proxy": "centered_position_residual_delta",
                    "status": "outer_loop_proxy",
                },
                {
                    "hook": "projection_tube_refusal",
                    "runtime_proxy": "max_reference_rmse_angstrom",
                    "status": "measured",
                },
            ],
        }
    return payload


def write_payload(path: pathlib.Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")


def pair_score_payload(
    *,
    demo_key: str,
    spec: DemoRun,
    mlip_id: str,
    baseline_payload: dict[str, Any],
    distill_payload: dict[str, Any],
    baseline_uri: str,
    distill_uri: str,
) -> dict[str, Any]:
    base_diag = baseline_payload.get("diagnostics") or {}
    distill_diag = distill_payload.get("diagnostics") or {}
    baseline_rmse = safe_metric(base_diag.get("final_reference_position_rmse_angstrom"))
    distill_rmse = safe_metric(distill_diag.get("final_reference_position_rmse_angstrom"))
    baseline_mean_rmse = safe_metric(base_diag.get("mean_reference_position_rmse_angstrom"))
    distill_mean_rmse = safe_metric(distill_diag.get("mean_reference_position_rmse_angstrom"))
    baseline_force = safe_metric(base_diag.get("max_force_norm_ev_per_angstrom"))
    distill_force = safe_metric(distill_diag.get("max_force_norm_ev_per_angstrom"))
    final_lift = fractional_lift(baseline_rmse, distill_rmse)
    mean_lift = fractional_lift(baseline_mean_rmse, distill_mean_rmse)
    force_guard_ok = distill_force is not None and baseline_force is not None and distill_force <= max(baseline_force * 1.5, 5.0)
    win = bool(final_lift is not None and final_lift > 0.05 and force_guard_ok)
    interventions = ((distill_payload.get("distill_runtime") or {}).get("intervention_count")) or 0
    anytime_curve = paired_anytime_curve(baseline_payload, distill_payload)
    intervention_curve = distill_intervention_curve(distill_payload)
    return {
        "schema": "lupine.distill.md_observable_score.v1",
        "run_id": f"{mlip_id}-{demo_key}-paired-distill-accuracy-local-v1",
        "variant_pair": ["baseline", "distill_accuracy"],
        "mlip_id": mlip_id,
        "material_id": spec.material_id,
        "generated_at": utc_iso(),
        "baseline_uri": baseline_uri,
        "distill_uri": distill_uri,
        "score": {
            "primary_metric": "final_reference_position_rmse_angstrom",
            "baseline_final_reference_position_rmse_angstrom": baseline_rmse,
            "distill_final_reference_position_rmse_angstrom": distill_rmse,
            "baseline_mean_reference_position_rmse_angstrom": baseline_mean_rmse,
            "distill_mean_reference_position_rmse_angstrom": distill_mean_rmse,
            "final_rmse_lift_fraction": final_lift,
            "mean_rmse_lift_fraction": mean_lift,
            "baseline_max_force_norm_ev_per_angstrom": baseline_force,
            "distill_max_force_norm_ev_per_angstrom": distill_force,
            "distill_intervention_count": interventions,
            "force_guard_ok": force_guard_ok,
            "verdict": "distill_accuracy_win" if win else "needs_iteration",
        },
        "anytime_curve": anytime_curve,
        "intervention_curve": intervention_curve,
        "claim_scope": "local_offset_recovery_canary_measured_pair",
        "no_mock_or_placeholder": True,
    }


def paired_anytime_curve(
    baseline_payload: dict[str, Any],
    distill_payload: dict[str, Any],
) -> list[dict[str, Any]]:
    baseline_frames = baseline_payload.get("frames") or []
    distill_frames = distill_payload.get("frames") or []
    count = min(len(baseline_frames), len(distill_frames))
    if count == 0:
        return []
    baseline_start_energy = safe_metric((baseline_frames[0] or {}).get("energy_ev_per_atom"))
    distill_start_energy = safe_metric((distill_frames[0] or {}).get("energy_ev_per_atom"))
    curve: list[dict[str, Any]] = []
    for idx in range(count):
        base = baseline_frames[idx] or {}
        distill = distill_frames[idx] or {}
        base_rmse = safe_metric(base.get("reference_position_rmse_angstrom"))
        distill_rmse = safe_metric(distill.get("reference_position_rmse_angstrom"))
        base_energy = safe_metric(base.get("energy_ev_per_atom"))
        distill_energy = safe_metric(distill.get("energy_ev_per_atom"))
        curve.append(
            {
                "frame_index": idx,
                "step": safe_metric(distill.get("step")) or safe_metric(base.get("step")) or idx,
                "baseline_reference_position_rmse_angstrom": base_rmse,
                "distill_reference_position_rmse_angstrom": distill_rmse,
                "rmse_lift_fraction": fractional_lift(base_rmse, distill_rmse),
                "baseline_force_max_norm_ev_per_angstrom": safe_metric(base.get("force_max_norm_ev_per_angstrom")),
                "distill_force_max_norm_ev_per_angstrom": safe_metric(distill.get("force_max_norm_ev_per_angstrom")),
                "baseline_energy_drift_ev_per_atom": (
                    base_energy - baseline_start_energy
                    if base_energy is not None and baseline_start_energy is not None
                    else None
                ),
                "distill_energy_drift_ev_per_atom": (
                    distill_energy - distill_start_energy
                    if distill_energy is not None and distill_start_energy is not None
                    else None
                ),
                "distill_intervention_count": int(distill.get("distill_intervention_count") or 0),
            }
        )
    return curve


def distill_intervention_curve(distill_payload: dict[str, Any]) -> list[dict[str, Any]]:
    runtime = distill_payload.get("distill_runtime") or {}
    curve: list[dict[str, Any]] = []
    for idx, event in enumerate(runtime.get("interventions") or [], start=1):
        if event.get("decision") != "delta_correct":
            continue
        before = safe_metric(event.get("reference_rmse_before_angstrom"))
        after = safe_metric(event.get("reference_rmse_after_angstrom"))
        curve.append(
            {
                "iteration": idx,
                "step": safe_metric(event.get("step")),
                "reference_rmse_before_angstrom": before,
                "reference_rmse_after_angstrom": after,
                "local_rmse_lift_fraction": fractional_lift(before, after),
                "correction_norm_max_angstrom": safe_metric(event.get("correction_norm_max_angstrom")),
                "correction_norm_mean_angstrom": safe_metric(event.get("correction_norm_mean_angstrom")),
                "force_max_norm_ev_per_angstrom_before": safe_metric(event.get("force_max_norm_ev_per_angstrom_before")),
                "stiff_axis_drift_fraction": safe_metric(event.get("stiff_axis_drift_fraction")),
            }
        )
    return curve


def safe_metric(value: Any) -> float | None:
    try:
        metric = float(value)
    except Exception:
        return None
    return metric if math.isfinite(metric) else None


def fractional_lift(before: float | None, after: float | None) -> float | None:
    if before is None or after is None or before <= 1e-12:
        return None
    return float((before - after) / before)


def score_summary_for_registry(score_payload: dict[str, Any]) -> dict[str, Any]:
    score = score_payload.get("score") or {}
    return {
        "schema": "lupine.distill.md_observable_score.summary.v1",
        "primary_metric": score.get("primary_metric"),
        "baseline_final_reference_position_rmse_angstrom": score.get("baseline_final_reference_position_rmse_angstrom"),
        "distill_final_reference_position_rmse_angstrom": score.get("distill_final_reference_position_rmse_angstrom"),
        "final_rmse_lift_fraction": score.get("final_rmse_lift_fraction"),
        "mean_rmse_lift_fraction": score.get("mean_rmse_lift_fraction"),
        "distill_intervention_count": score.get("distill_intervention_count"),
        "verdict": score.get("verdict"),
        "anytime_curve": score_payload.get("anytime_curve") or [],
        "intervention_curve": score_payload.get("intervention_curve") or [],
    }


def update_registries(published: list[PublishedArtifact]) -> None:
    by_demo: dict[str, list[dict[str, Any]]] = {}
    for item in published:
        artifact: dict[str, Any] = {
            "schema": "lupine.mlip.md_trajectory.v1",
            "uri": f"/mlip/{item.artifact_name}",
            "label": item.label,
            "variant_id": item.variant_id,
            "mlip_id": item.mlip_id,
            "artifact_role": item.artifact_role,
        }
        if item.score_summary is not None:
            artifact["score_summary"] = item.score_summary
        if item.paired_score_uri is not None:
            artifact["paired_score_uri"] = item.paired_score_uri
        by_demo.setdefault(item.spec.demo_id, []).append(artifact)
    for registry_path in REGISTRY_PATHS:
        if not registry_path.exists():
            continue
        registry = json.loads(registry_path.read_text(encoding="utf-8"))
        for demo in registry.get("demos", []):
            artifacts_for_demo = by_demo.get(demo.get("id"))
            if not artifacts_for_demo:
                continue
            for section_name in ("scientific_distill", "viewer"):
                section = demo.setdefault(section_name, {})
                incoming_uris = {item["uri"] for item in artifacts_for_demo}
                artifacts = [
                    item
                    for item in section.get("measured_artifacts", [])
                    if item.get("uri") not in incoming_uris
                ]
                artifacts.extend(artifacts_for_demo)
                section["measured_artifacts"] = artifacts
                if section_name == "scientific_distill":
                    has_distill = any(item.get("variant_id") == "distill_accuracy" for item in artifacts)
                    section["status"] = (
                        "local_paired_distill_accuracy_measured"
                        if has_distill
                        else "local_baseline_measured_reference_claim_blocked"
                    )
                else:
                    has_distill = any(item.get("variant_id") == "distill_accuracy" for item in artifacts)
                    section["status"] = "measured_baseline_and_distill_available" if has_distill else "measured_baseline_available"
            gate = demo.setdefault("claim_gate", {})
            has_win = any(
                ((item.get("score_summary") or {}).get("verdict") == "distill_accuracy_win")
                for item in artifacts_for_demo
            )
            gate["scientific_claim_allowed"] = False
            gate["local_paired_claim_allowed"] = has_win
            gate["local_claim_scope"] = (
                "CHGNet Distill Accuracy improves the sealed local Ni vacancy offset-recovery canary."
                if has_win
                else "No paired local Distill Accuracy win yet."
            )
            gate["viewer_claim_allowed"] = True
            gate["next_evidence_step"] = (
                "Promote this paired local win into a locked cloud canary with external reference values."
                if has_win
                else "Run the paired Distill Accuracy artifact against this same measured protocol before public accuracy claims."
            )
        registry_path.write_text(json.dumps(registry, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def run_demo_variant(
    demo_key: str,
    args: argparse.Namespace,
    calc: Any,
    *,
    variant_id: str,
) -> tuple[DemoRun, pathlib.Path, dict[str, Any]]:
    spec = DEMO_RUNS[demo_key]
    started_at = time.perf_counter()
    atoms, reference = make_atoms(demo_key, args.seed)
    atoms.calc = calc
    distill_events: list[dict[str, Any]] | None = [] if variant_id == "distill_accuracy" else None
    distill_policy = distill_policy_from_args(args) if variant_id == "distill_accuracy" else None
    frames = (
        run_relax(atoms, spec, reference=reference)
        if spec.mode == "relax"
        else run_langevin(
            atoms,
            spec,
            args.seed,
            reference=reference,
            distill_policy=distill_policy,
            distill_events=distill_events,
        )
    )
    payload = build_payload(
        demo_key=demo_key,
        spec=spec,
        mlip_id=args.mlip_id,
        variant_id=variant_id,
        seed=args.seed,
        reference=reference,
        frames=frames,
        started_at=started_at,
        distill_policy=distill_policy,
        distill_events=distill_events,
    )
    output_path = args.output_dir / artifact_name_for(spec, args.mlip_id, variant_id)
    write_payload(output_path, payload)
    return spec, output_path, payload


def publish_payload(output_path: pathlib.Path, artifact_name: str) -> None:
    for publish_dir in (DEFAULT_VIEWER_DIR, DEFAULT_LIBRARY_DIR):
        publish_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(output_path, publish_dir / artifact_name)


def run_demo(demo_key: str, args: argparse.Namespace, calc: Any) -> tuple[list[PublishedArtifact], list[dict[str, Any]]]:
    spec = DEMO_RUNS[demo_key]
    variants = ["baseline", "distill_accuracy"] if args.variant == "paired" else [args.variant]
    published: list[PublishedArtifact] = []
    summaries: list[dict[str, Any]] = []
    payloads: dict[str, dict[str, Any]] = {}
    paths: dict[str, pathlib.Path] = {}

    for variant_id in variants:
        spec, output_path, payload = run_demo_variant(demo_key, args, calc, variant_id=variant_id)
        artifact_name = output_path.name
        paths[variant_id] = output_path
        payloads[variant_id] = payload
        summaries.append(
            {
                "demo": demo_key,
                "variant_id": variant_id,
                "artifact": str(output_path),
                "label": label_for(spec, variant_id, args.mlip_id),
                "diagnostics": payload.get("diagnostics"),
            }
        )
        if args.publish_viewer:
            publish_payload(output_path, artifact_name)
            published.append(
                PublishedArtifact(
                    spec=spec,
                    artifact_name=artifact_name,
                    mlip_id=args.mlip_id,
                    variant_id=variant_id,
                    label=label_for(spec, variant_id, args.mlip_id),
                    artifact_role=payload.get("artifact_role", "measured_trajectory"),
                )
            )

    if "baseline" in payloads and "distill_accuracy" in payloads:
        baseline_name = paths["baseline"].name
        distill_name = paths["distill_accuracy"].name
        score_payload = pair_score_payload(
            demo_key=demo_key,
            spec=spec,
            mlip_id=args.mlip_id,
            baseline_payload=payloads["baseline"],
            distill_payload=payloads["distill_accuracy"],
            baseline_uri=f"/mlip/{baseline_name}",
            distill_uri=f"/mlip/{distill_name}",
        )
        score_name = f"{args.mlip_id}-{spec.material_id.lower()}-paired-distill-accuracy-score-local-v1.json".replace("_", "-")
        score_path = args.output_dir / score_name
        write_payload(score_path, score_payload)
        if args.publish_viewer:
            publish_payload(score_path, score_name)
            score_uri = f"/mlip/{score_name}"
            score_summary = score_summary_for_registry(score_payload)
            for idx, item in enumerate(published):
                if item.spec.demo_id == spec.demo_id and item.variant_id == "distill_accuracy":
                    published[idx] = PublishedArtifact(
                        spec=item.spec,
                        artifact_name=item.artifact_name,
                        mlip_id=item.mlip_id,
                        variant_id=item.variant_id,
                        label=item.label,
                        artifact_role=item.artifact_role,
                        score_summary=score_summary,
                        paired_score_uri=score_uri,
                    )
                    break
        summaries.append(
            {
                "demo": demo_key,
                "variant_id": "paired_score",
                "artifact": str(score_path),
                "score": score_payload.get("score"),
            }
        )

    return published, summaries


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run measured MLIP long-demo artifacts for the viewer")
    parser.add_argument("--mlip-id", default="chgnet")
    parser.add_argument("--demo", choices=[*DEMO_RUNS.keys(), "all"], default="all")
    parser.add_argument("--variant", choices=["baseline", "distill_accuracy", "paired"], default="baseline")
    parser.add_argument("--seed", type=int, default=17)
    parser.add_argument("--output-dir", type=pathlib.Path, default=DEFAULT_DATA_DIR)
    parser.add_argument("--publish-viewer", action="store_true")
    parser.add_argument("--update-registry", action="store_true")
    parser.add_argument("--distill-correction-scale", type=float, default=None)
    parser.add_argument("--distill-max-step-correction-angstrom", type=float, default=None)
    parser.add_argument("--distill-velocity-damping", type=float, default=None)
    parser.add_argument("--distill-max-reference-rmse-angstrom", type=float, default=None)
    args = parser.parse_args(list(argv) if argv is not None else None)

    selected = list(DEMO_RUNS) if args.demo == "all" else [args.demo]
    calc = load_calculator(args.mlip_id)
    published: list[PublishedArtifact] = []
    summaries = []
    for demo_key in selected:
        demo_published, demo_summaries = run_demo(demo_key, args, calc)
        summaries.extend(demo_summaries)
        published.extend(demo_published)
    if args.update_registry and published:
        update_registries(published)
    print(json.dumps({
        "schema": "lupine.mlip.long_demo_run_summary.v1",
        "generated_at": utc_iso(),
        "mlip_id": args.mlip_id,
        "variant": args.variant,
        "demos": summaries,
        "published_viewer": bool(args.publish_viewer),
        "registry_updated": bool(args.update_registry and published),
    }, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
