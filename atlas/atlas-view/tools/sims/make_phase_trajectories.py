#!/usr/bin/env python3
"""
make_phase_trajectories.py — generate REAL phase-change MD trajectories
for the lupi-viewer's multi-frame bring-your-own-data path.

Runs genuine LAMMPS molecular dynamics (EAM copper, the classic
Foiles–Baskes–Daw Cu_u3 potential shipped with the PyPI lammps wheel)
and writes multi-frame `.lammpstrj` dumps in exactly the dialect the
viewer's streaming fast path handles (see
packages/parsers/src/dumpContract.ts — the executable contract):
orthogonal box, `id type x y z` columns, constant atom count.

The system is declarative on purpose: a scenario is
    setup (geometry + potential)  ×  protocol (list of NVT phases)
so adding a new transformation is data, not a new script. Every output
gets a sidecar `<name>.manifest.json` recording full provenance
(potential, protocol, seed, LAMMPS version) plus verification hints —
that manifest is what turns demo files into a dataset that gallery /
library ingestion can trust.

Scenarios:
  cu-melt      Cu(100) slab heated through melting — the disorder front
               nucleates at the free surfaces near Tm (~1340 K for
               Cu_u3) and eats inward.
  cu-solidify  Bulk liquid Cu quenched 2000→300 K (~4×10^13 K/s) into
               an amorphous solid.
  cu-sinter    Two misoriented Cu nanoparticles at 1000 K coalescing —
               a neck forms by surface diffusion and grows, with a
               grain boundary where the orientations meet.

Usage:
  python3 tools/sims/make_phase_trajectories.py --list
  python3 tools/sims/make_phase_trajectories.py cu-melt --size demo
  python3 tools/sims/make_phase_trajectories.py all --size demo --out tools/sims/output

Sizes: ci (~1k atoms, seconds; the committed test fixtures), demo
(~7-12k atoms, minutes, >5 MB so drag-and-drop streams), showcase
(~26-33k atoms, ~10 min).

Requires: `pip install lammps` (the wheel ships the potential files).
"""

import argparse
import json
import os
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable

CU_LATTICE = 3.615  # Å, FCC copper
TIMESTEP_PS = 0.002  # 2 fs
DUMP_COLUMNS = "id type x y z"  # the contract's fast-path dialect
POTENTIAL = "EAM Cu_u3 (Foiles-Baskes-Daw universal-3 copper)"


@dataclass(frozen=True)
class Phase:
    """One leg of the thermodynamic protocol: an NVT run from t_start to
    t_end Kelvin. Phases with dump=False (equilibration) run before the
    trajectory file opens, so frame 0 is the interesting starting state,
    not the velocity-initialization kick."""

    t_start: float
    t_end: float
    steps: int
    dump: bool = True


@dataclass(frozen=True)
class Scenario:
    name: str
    title: str
    description: str
    seed: int
    sizes: dict
    setup: Callable[[dict, int], str]  # (size params, seed) -> LAMMPS commands
    protocol: Callable[[dict], list]   # size params -> [Phase, ...]
    # Verification hint consumed by tools/verify-real-trajectory.mjs: the
    # minimum fraction of atoms expected to move > 1 lattice constant
    # between first and last frame if the transformation really happened.
    min_moved_fraction: float = 0.3


# ─── cu-melt: surface-nucleated melting of a Cu(100) slab ────────────
# Slab geometry is the point: a perfect periodic crystal superheats, but
# free surfaces melt AT Tm, so the transition is visible on a demo
# timescale — and the fixed NVT box matches .glimbin's single-cell
# layout exactly.

def _melt_setup(p: dict, seed: int) -> str:
    nx, ny, nz = p["cells"]
    vac = 4  # lattice units of vacuum above and below the slab
    return f"""
units metal
atom_style atomic
boundary p p f
lattice fcc {CU_LATTICE}
region box block 0 {nx} 0 {ny} {-vac} {nz + vac} units lattice
create_box 1 box
region slab block 0 {nx} 0 {ny} 0 {nz} units lattice
create_atoms 1 region slab
mass 1 63.546
pair_style eam
pair_coeff 1 1 Cu_u3.eam
velocity all create 300 {seed} dist gaussian
timestep {TIMESTEP_PS}
fix walls all wall/reflect zlo EDGE zhi EDGE
"""


def _melt_protocol(p: dict) -> list:
    ramp = p["ramp_steps"]
    return [
        Phase(300, 300, 2000, dump=False),          # crystal equilibration
        Phase(300, 1700, ramp),                     # heat through Tm
        Phase(1700, 1700, max(2000, ramp // 6)),    # hold: fully liquid
    ]


# ─── cu-solidify: rapid quench of bulk liquid Cu into a glass ────────

def _solidify_setup(p: dict, seed: int) -> str:
    n = p["cells"]
    return f"""
units metal
atom_style atomic
boundary p p p
lattice fcc {CU_LATTICE}
region box block 0 {n} 0 {n} 0 {n} units lattice
create_box 1 box
create_atoms 1 box
mass 1 63.546
pair_style eam
pair_coeff 1 1 Cu_u3.eam
velocity all create 2500 {seed} dist gaussian
timestep {TIMESTEP_PS}
"""


def _solidify_protocol(p: dict) -> list:
    return [
        # 2500 K is above the homogeneous superheating limit: the lattice
        # collapses to a true liquid in a few ps (no dump — frame 0 should
        # be hot liquid, not collapsing crystal).
        Phase(2500, 2500, 6000, dump=False),
        Phase(2000, 300, p["ramp_steps"]),  # ~4e13 K/s: vitrifies
    ]


# ─── cu-sinter: two misoriented nanoparticles coalescing ─────────────
# The second sphere is carved from a rotated lattice, so the neck that
# forms is a real grain boundary. Sintering is surface-diffusion driven:
# most of each particle stays crystalline while the neck grows — hence
# the lower min_moved_fraction.

def _sinter_setup(p: dict, seed: int) -> str:
    r = p["radius_cells"] * CU_LATTICE          # sphere radius, Å
    gap = 2.5                                    # Å between surfaces
    box = 2 * (2 * r + gap)                      # generous vacuum margin
    cx1 = box / 2 - r - gap / 2
    cx2 = box / 2 + r + gap / 2
    cy = cz = box / 2
    return f"""
units metal
atom_style atomic
boundary f f f
region box block 0 {box:.2f} 0 {box:.2f} 0 {box:.2f} units box
create_box 1 box
lattice fcc {CU_LATTICE}
region s1 sphere {cx1:.2f} {cy:.2f} {cz:.2f} {r:.2f} units box
create_atoms 1 region s1
lattice fcc {CU_LATTICE} orient x 1 1 0 orient y -1 1 0 orient z 0 0 1
region s2 sphere {cx2:.2f} {cy:.2f} {cz:.2f} {r:.2f} units box
create_atoms 1 region s2
mass 1 63.546
pair_style eam
pair_coeff 1 1 Cu_u3.eam
velocity all create 300 {seed} dist gaussian
timestep {TIMESTEP_PS}
fix walls all wall/reflect xlo EDGE xhi EDGE ylo EDGE yhi EDGE zlo EDGE zhi EDGE
"""


def _sinter_protocol(p: dict) -> list:
    ramp = p["ramp_steps"]
    return [
        Phase(300, 300, 2000, dump=False),   # settle the carved surfaces
        Phase(300, 1000, ramp // 3),         # heat to 0.75 Tm
        Phase(1000, 1000, ramp),             # neck formation and growth
    ]


SCENARIOS = {
    s.name: s
    for s in [
        Scenario(
            name="cu-melt",
            title="Cu(100) slab melting",
            description=(
                "Copper slab heated 300→1700 K. Melting nucleates at the free "
                "surfaces near Tm (~1340 K for Cu_u3) and the disorder front "
                "propagates inward until the crystal dissolves."
            ),
            seed=4928459,
            sizes={
                "ci":       {"cells": (6, 6, 5),    "ramp_steps": 5_000,  "frames": 20},
                "demo":     {"cells": (14, 14, 12), "ramp_steps": 45_000, "frames": 80},
                "showcase": {"cells": (20, 20, 16), "ramp_steps": 60_000, "frames": 100},
            },
            setup=_melt_setup,
            protocol=_melt_protocol,
            min_moved_fraction=0.3,
        ),
        Scenario(
            name="cu-solidify",
            title="Liquid Cu rapid quench",
            description=(
                "Bulk liquid copper quenched 2000→300 K at ~4×10^13 K/s — far "
                "too fast for crystallization, so the melt vitrifies into an "
                "amorphous solid."
            ),
            seed=2384793,
            sizes={
                "ci":       {"cells": 6,  "ramp_steps": 5_000,  "frames": 20},
                "demo":     {"cells": 12, "ramp_steps": 45_000, "frames": 80},
                "showcase": {"cells": 17, "ramp_steps": 60_000, "frames": 100},
            },
            setup=_solidify_setup,
            protocol=_solidify_protocol,
            min_moved_fraction=0.2,
        ),
        Scenario(
            name="cu-sinter",
            title="Cu nanoparticle sintering",
            description=(
                "Two misoriented copper nanoparticles at 1000 K (0.75 Tm) "
                "coalesce: a neck forms by surface diffusion and grows, with a "
                "grain boundary where the lattice orientations meet."
            ),
            seed=7771234,
            sizes={
                "ci":       {"radius_cells": 3,  "ramp_steps": 6_000,  "frames": 20},
                "demo":     {"radius_cells": 7,  "ramp_steps": 50_000, "frames": 80},
                "showcase": {"radius_cells": 10, "ramp_steps": 70_000, "frames": 100},
            },
            setup=_sinter_setup,
            protocol=_sinter_protocol,
            min_moved_fraction=0.04,
        ),
    ]
}


def find_potentials_dir() -> str:
    import lammps as lm
    cand = os.path.join(os.path.dirname(lm.__file__), "share", "lammps", "potentials")
    if os.path.isdir(cand):
        return cand
    env = os.environ.get("LAMMPS_POTENTIALS")
    if env and os.path.isdir(env):
        return env
    raise SystemExit(
        "Cannot find LAMMPS potentials directory (looked for the PyPI wheel's "
        "share/lammps/potentials). Set LAMMPS_POTENTIALS."
    )


def make_lammps(threads: int):
    from lammps import lammps
    os.environ["OMP_NUM_THREADS"] = str(threads)
    args = ["-log", "none", "-screen", "none"]
    if threads > 1:
        args += ["-sf", "omp", "-pk", "omp", str(threads)]
    return lammps(cmdargs=args)


def run_scenario(sc: Scenario, size: str, out_path: str, threads: int) -> dict:
    p = sc.sizes[size]
    phases = sc.protocol(p)
    dump_steps = sum(ph.steps for ph in phases if ph.dump)
    dump_every = max(1, dump_steps // p["frames"])

    l = make_lammps(threads)
    l.commands_string(sc.setup(p, sc.seed))
    l.command("thermo 1000")
    natoms = l.get_natoms()

    dump_open = False
    for ph in phases:
        if ph.dump and not dump_open:
            l.commands_string(
                f"reset_timestep 0\n"
                f"dump traj all custom {dump_every} {out_path} {DUMP_COLUMNS}\n"
                f"dump_modify traj sort id"
            )
            dump_open = True
        l.commands_string(
            f"fix md all nvt temp {ph.t_start} {ph.t_end} 0.1\nrun {ph.steps}\nunfix md"
        )
    version = l.version()
    l.close()

    return {
        "natoms": natoms,
        "frames": dump_steps // dump_every + 1,
        "dump_every": dump_every,
        "lammps_version": version,
        "phases": phases,
    }


def write_manifest(sc: Scenario, size: str, out_path: str, info: dict) -> str:
    manifest = {
        "schema": "lupi-sim-manifest/1",
        "scenario": sc.name,
        "title": sc.title,
        "description": sc.description,
        "size": size,
        "natoms": info["natoms"],
        "frames": info["frames"],
        "bytes": os.path.getsize(out_path),
        "units": "metal",
        "timestep_ps": TIMESTEP_PS,
        "dump_every_steps": info["dump_every"],
        "dump_columns": DUMP_COLUMNS,
        "potential": POTENTIAL,
        "protocol": [
            {"t_start_K": ph.t_start, "t_end_K": ph.t_end, "steps": ph.steps, "dump": ph.dump}
            for ph in info["phases"]
        ],
        "seed": sc.seed,
        "lammps_version": info["lammps_version"],
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "expected": {"min_moved_fraction": sc.min_moved_fraction},
    }
    manifest_path = out_path + ".manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    return manifest_path


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("scenario", nargs="?", choices=[*SCENARIOS, "all"])
    ap.add_argument("--size", choices=["ci", "demo", "showcase"], default="demo")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "output"))
    ap.add_argument("--threads", type=int, default=min(4, os.cpu_count() or 1))
    ap.add_argument("--list", action="store_true", help="list scenarios and exit")
    args = ap.parse_args()

    if args.list or not args.scenario:
        for sc in SCENARIOS.values():
            print(f"{sc.name:14s} {sc.title}")
            print(f"{'':14s}   {sc.description}")
        return

    os.environ["LAMMPS_POTENTIALS"] = find_potentials_dir()
    os.makedirs(args.out, exist_ok=True)

    names = list(SCENARIOS) if args.scenario == "all" else [args.scenario]
    for name in names:
        sc = SCENARIOS[name]
        out_path = os.path.abspath(os.path.join(args.out, f"{name}-{args.size}.lammpstrj"))
        print(f"[{name}] {args.size}: running real LAMMPS MD -> {out_path}", flush=True)
        t0 = time.time()
        info = run_scenario(sc, args.size, out_path, args.threads)
        manifest_path = write_manifest(sc, args.size, out_path, info)
        dt = time.time() - t0
        size_mb = os.path.getsize(out_path) / 1e6
        print(
            f"[{name}] done: {info['natoms']} atoms, ~{info['frames']} frames, "
            f"{size_mb:.1f} MB in {dt:.0f}s (+ {os.path.basename(manifest_path)})",
            flush=True,
        )


if __name__ == "__main__":
    sys.exit(main())
