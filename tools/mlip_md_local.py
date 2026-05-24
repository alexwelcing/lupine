#!/usr/bin/env python3
"""Deterministic local ASE MD/relaxation harness for MLIP paper-reproduction work.

This is intentionally local-first and Docker-free. It exercises the same ASE
calculator surface used by the MLIP cell runner, but produces trajectory
artifacts instead of only static row scores.
"""

from __future__ import annotations

import argparse
import json
import math
import pathlib
import sys
import time
from collections.abc import Iterable
from datetime import datetime, timezone
from typing import Any

import numpy as np
from ase import Atoms, units
from ase.build import bulk
from ase.calculators.emt import EMT
from ase.filters import FrechetCellFilter
from ase.md.langevin import Langevin
from ase.md.velocitydistribution import MaxwellBoltzmannDistribution, Stationary
from ase.md.verlet import VelocityVerlet
from ase.optimize import FIRE

ROOT = pathlib.Path(__file__).resolve().parents[1]
RUNNER_DIR = ROOT / "gcp" / "mlip-cell-runner"
if str(RUNNER_DIR) not in sys.path:
    sys.path.insert(0, str(RUNNER_DIR))

EV_PER_A3_TO_GPA = 160.21766208
DEFAULT_OUT = ROOT / "tmp" / "mlip-md-local"


def utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_repeat(value: str) -> tuple[int, int, int]:
    parts = [int(part.strip()) for part in value.split(",")]
    if len(parts) != 3 or any(part <= 0 for part in parts):
        raise argparse.ArgumentTypeError("--repeat must be three positive integers, e.g. 2,2,2")
    return parts[0], parts[1], parts[2]


def safe_id(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in "._-" else "_" for ch in value)


def load_calculator(mlip_id: str):
    if mlip_id == "emt":
        return EMT()
    from mlip_cell_runner import load_calculator as load_mlip_calculator

    return load_mlip_calculator(mlip_id)


def build_crystal(
    *,
    element: str,
    crystal: str,
    lattice_a: float,
    repeat: tuple[int, int, int],
    cell_scale: float,
    position_noise: float,
    seed: int,
) -> tuple[Atoms, Atoms]:
    reference = bulk(element, crystalstructure=crystal, a=lattice_a, cubic=True).repeat(repeat)
    atoms = reference.copy()
    atoms.set_cell(atoms.cell.array * cell_scale, scale_atoms=True)
    if position_noise > 0:
        rng = np.random.default_rng(seed)
        atoms.positions += rng.normal(0.0, position_noise, size=atoms.positions.shape)
        atoms.wrap()
    return atoms, reference


def lattice_a_from_cell(atoms: Atoms, repeat: tuple[int, int, int]) -> float:
    lengths = np.linalg.norm(np.asarray(atoms.cell.array, dtype=float), axis=1)
    repeat_arr = np.asarray(repeat, dtype=float)
    base_lengths = lengths / repeat_arr
    return float(np.mean(base_lengths))


def force_max_norm(atoms: Atoms) -> float | None:
    try:
        forces = np.asarray(atoms.get_forces(), dtype=float)
    except Exception:
        return None
    if not forces.size:
        return 0.0
    return float(np.max(np.linalg.norm(forces, axis=1)))


def stress_gpa(atoms: Atoms) -> list[float] | None:
    try:
        return (np.asarray(atoms.get_stress(voigt=True), dtype=float).reshape(-1) * EV_PER_A3_TO_GPA).tolist()
    except Exception:
        return None


def temperature_k(atoms: Atoms) -> float | None:
    try:
        value = float(atoms.get_temperature())
    except Exception:
        return None
    return value if math.isfinite(value) else None


def frame_from_atoms(
    atoms: Atoms,
    *,
    step: int,
    started_at: float,
    repeat: tuple[int, int, int],
    relaxation_converged: bool | None = None,
) -> dict[str, Any]:
    potential = float(atoms.get_potential_energy()) / max(len(atoms), 1)
    kinetic = float(atoms.get_kinetic_energy()) / max(len(atoms), 1)
    forces = np.asarray(atoms.get_forces(), dtype=float)
    frame = {
        "step": step,
        "time_seconds": max(time.perf_counter() - started_at, 0.0),
        "force_calls": step,
        "lattice_a_angstrom": lattice_a_from_cell(atoms, repeat),
        "cell_angstrom": np.asarray(atoms.cell.array, dtype=float).tolist(),
        "positions_angstrom": np.asarray(atoms.positions, dtype=float).tolist(),
        "energy_ev_per_atom": potential,
        "kinetic_energy_ev_per_atom": kinetic,
        "total_energy_ev_per_atom": potential + kinetic,
        "temperature_k": temperature_k(atoms),
        "forces_ev_per_angstrom": forces.tolist(),
        "force_max_norm_ev_per_angstrom": float(np.max(np.linalg.norm(forces, axis=1))) if forces.size else 0.0,
    }
    stress = stress_gpa(atoms)
    if stress is not None:
        frame["stress_gpa"] = stress
    if relaxation_converged is not None:
        frame["relaxation_converged"] = relaxation_converged
    return frame


def reference_payload(
    reference: Atoms,
    *,
    lattice_a: float,
    repeat: tuple[int, int, int],
    source: str,
    include_positions: bool,
    include_emt_reference_observables: bool,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "source": source,
        "lattice_a_angstrom": lattice_a,
        "cell_angstrom": np.asarray(reference.cell.array, dtype=float).tolist(),
        "repeat": list(repeat),
    }
    if include_positions:
        payload["positions_angstrom"] = np.asarray(reference.positions, dtype=float).tolist()
    if include_emt_reference_observables:
        reference.calc = EMT()
        payload["energy_ev_per_atom"] = float(reference.get_potential_energy()) / max(len(reference), 1)
        payload["stress_gpa"] = stress_gpa(reference)
    return payload


def run_relaxation(atoms: Atoms, args: argparse.Namespace, repeat: tuple[int, int, int]) -> list[dict[str, Any]]:
    started_at = time.perf_counter()
    frames = [frame_from_atoms(atoms, step=0, started_at=started_at, repeat=repeat, relaxation_converged=False)]
    degrees_of_freedom = atoms if args.fixed_cell else FrechetCellFilter(atoms)
    optimizer = FIRE(degrees_of_freedom, logfile=None)
    converged = False
    for step in range(1, args.steps + 1):
        converged = bool(optimizer.run(fmax=args.fmax, steps=1))
        if step % args.log_interval == 0 or converged or step == args.steps:
            frames.append(
                frame_from_atoms(
                    atoms,
                    step=step,
                    started_at=started_at,
                    repeat=repeat,
                    relaxation_converged=converged,
                )
            )
        if converged:
            break
    return frames


def run_md(atoms: Atoms, args: argparse.Namespace, repeat: tuple[int, int, int]) -> list[dict[str, Any]]:
    rng = np.random.RandomState(args.seed)
    MaxwellBoltzmannDistribution(
        atoms,
        temperature_K=args.temperature_k,
        rng=rng,
        force_temp=True,
    )
    Stationary(atoms)
    if args.mode == "nve":
        dyn = VelocityVerlet(atoms, timestep=args.timestep_fs * units.fs, logfile=None)
    elif args.mode == "langevin":
        dyn = Langevin(
            atoms,
            timestep=args.timestep_fs * units.fs,
            temperature_K=args.temperature_k,
            friction=args.friction_per_fs / units.fs,
            rng=rng,
            logfile=None,
        )
    else:
        raise ValueError(f"unsupported MD mode: {args.mode}")

    started_at = time.perf_counter()
    frames = [frame_from_atoms(atoms, step=0, started_at=started_at, repeat=repeat)]
    current = 0
    while current < args.steps:
        chunk = min(args.log_interval, args.steps - current)
        dyn.run(chunk)
        current += chunk
        frames.append(frame_from_atoms(atoms, step=current, started_at=started_at, repeat=repeat))
    return frames


def md_diagnostics(frames: list[dict[str, Any]]) -> dict[str, Any]:
    total = [frame.get("total_energy_ev_per_atom") for frame in frames]
    total_nums = [float(value) for value in total if isinstance(value, (int, float)) and math.isfinite(float(value))]
    drift = None
    if len(total_nums) >= 2:
        drift = total_nums[-1] - total_nums[0]
    max_force = max(
        (
            float(frame["force_max_norm_ev_per_angstrom"])
            for frame in frames
            if isinstance(frame.get("force_max_norm_ev_per_angstrom"), (int, float))
        ),
        default=None,
    )
    return {
        "energy_drift_ev_per_atom": drift,
        "max_force_norm_ev_per_angstrom": max_force,
        "frames": len(frames),
    }


def build_payload(
    *,
    args: argparse.Namespace,
    frames: list[dict[str, Any]],
    reference: dict[str, Any],
    repeat: tuple[int, int, int],
) -> dict[str, Any]:
    common = {
        "run_id": args.run_id,
        "cell_id": args.cell_id,
        "variant_id": args.variant_id,
        "mlip_id": args.mlip_id,
        "material_id": f"{args.element}-{args.crystal}",
        "reference": reference,
        "perturbation": {
            "cell_scale": args.cell_scale,
            "position_noise_angstrom": args.position_noise_angstrom,
            "seed": args.seed,
        },
        "frames": frames,
    }
    if args.mode == "relax":
        return {
            "schema": "lupine.mlip.equilibrium_trajectory.v1",
            **common,
            "convergence": {
            "force_threshold_ev_per_angstrom": args.fmax,
            "max_steps": args.steps,
            "relax_cell": not args.fixed_cell,
        },
        }
    return {
        "schema": "lupine.mlip.md_trajectory.v1",
        **common,
        "ensemble": args.mode,
        "temperature_k": args.temperature_k,
        "timestep_fs": args.timestep_fs,
        "repeat": list(repeat),
        "diagnostics": md_diagnostics(frames),
    }


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run deterministic local MLIP MD/relaxation with ASE")
    parser.add_argument("--mode", choices=["relax", "nve", "langevin"], default="relax")
    parser.add_argument("--mlip-id", default="emt")
    parser.add_argument("--element", default="Al")
    parser.add_argument("--crystal", choices=["fcc", "bcc", "hcp", "diamond"], default="fcc")
    parser.add_argument("--lattice-a", type=float, default=4.05)
    parser.add_argument("--repeat", type=parse_repeat, default=(1, 1, 1))
    parser.add_argument("--cell-scale", type=float, default=1.02)
    parser.add_argument("--position-noise-angstrom", type=float, default=0.01)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--steps", type=int, default=50)
    parser.add_argument("--log-interval", type=int, default=5)
    parser.add_argument("--fmax", type=float, default=0.05)
    parser.add_argument("--fixed-cell", action="store_true")
    parser.add_argument("--temperature-k", type=float, default=300.0)
    parser.add_argument("--timestep-fs", type=float, default=1.0)
    parser.add_argument("--friction-per-fs", type=float, default=0.01)
    parser.add_argument(
        "--score-positions",
        action="store_true",
        help="Include raw reference positions in equilibrium scoring. Off by default for periodic same-element crystals.",
    )
    parser.add_argument(
        "--include-emt-reference-observables",
        action="store_true",
        help="Include EMT reference energy/stress. Useful for EMT smoke tests, not for MLIP/literature lattice reproduction.",
    )
    parser.add_argument("--run-id", default=None)
    parser.add_argument("--cell-id", default=None)
    parser.add_argument("--variant-id", default="local_md")
    parser.add_argument("--output", type=pathlib.Path, default=None)
    args = parser.parse_args(list(argv) if argv is not None else None)

    if args.steps <= 0:
        raise SystemExit("--steps must be positive")
    if args.log_interval <= 0:
        raise SystemExit("--log-interval must be positive")
    if args.lattice_a <= 0:
        raise SystemExit("--lattice-a must be positive")

    repeat = args.repeat
    args.run_id = args.run_id or f"mlip-md-local-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
    args.cell_id = args.cell_id or f"{args.run_id}:{args.mode}:{args.element}:{safe_id(args.mlip_id)}"
    output = args.output or (DEFAULT_OUT / args.run_id / f"{safe_id(args.cell_id)}.json")

    atoms, reference_atoms = build_crystal(
        element=args.element,
        crystal=args.crystal,
        lattice_a=args.lattice_a,
        repeat=repeat,
        cell_scale=args.cell_scale,
        position_noise=args.position_noise_angstrom,
        seed=args.seed,
    )
    atoms.calc = load_calculator(args.mlip_id)
    reference = reference_payload(
        reference_atoms,
        lattice_a=args.lattice_a,
        repeat=repeat,
        source=f"ASE bulk({args.element}, {args.crystal}, a={args.lattice_a})",
        include_positions=args.score_positions,
        include_emt_reference_observables=args.include_emt_reference_observables,
    )
    frames = run_relaxation(atoms, args, repeat) if args.mode == "relax" else run_md(atoms, args, repeat)
    payload = build_payload(args=args, frames=frames, reference=reference, repeat=repeat)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    print(json.dumps({
        "schema": "lupine.mlip.local_md_run_summary.v1",
        "run_id": args.run_id,
        "output": str(output),
        "mode": args.mode,
        "mlip_id": args.mlip_id,
        "frames": len(frames),
        "diagnostics": payload.get("diagnostics"),
    }, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
