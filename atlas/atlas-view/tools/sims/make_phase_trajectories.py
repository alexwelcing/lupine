#!/usr/bin/env python3
"""
make_phase_trajectories.py — generate REAL phase-change MD trajectories
for the lupi-viewer's multi-frame bring-your-own-data path.

Runs genuine LAMMPS molecular dynamics (EAM copper, the classic
Foiles–Baskes–Daw Cu_u3 potential shipped with LAMMPS) and writes
multi-frame `.lammpstrj` dumps in exactly the dialect the viewer's
streaming parser fast-paths: orthogonal box, `id type x y z` columns,
constant atom count.

Scenarios (both are textbook first-order phase transformations):

  cu-melt      Cu(100) slab with free surfaces, heated 300 K → 1700 K.
               Melting nucleates at the surfaces near Tm (~1340 K for
               Cu_u3) and the disorder front propagates inward — the
               crystal visibly dissolves layer by layer. Fixed box
               (NVT + reflective walls), so every frame shares one
               orthogonal cell: the ideal case for the .glimbin
               transcode.

  cu-solidify  Bulk liquid Cu (homogenized at 2500 K) quenched
               2000 K → 300 K at ~4×10^13 K/s. Rapid solidification
               into an amorphous/glassy solid — the reverse
               transformation, also at fixed volume.

Sizes:
  ci        ~0.9k atoms,  ~20 frames   (seconds; for tests)
  demo      ~9k atoms,    ~80 frames   (a few minutes; >5 MB, which is
                                        the viewer's streaming-path
                                        threshold)
  showcase  ~26k atoms,   ~100 frames  (~10 min; tens of MB)

Usage:
  python3 tools/sims/make_phase_trajectories.py cu-melt --size demo
  python3 tools/sims/make_phase_trajectories.py all --size demo --out tools/sims/output

Requires: `pip install lammps` (PyPI wheel ships the potential files).
"""

import argparse
import os
import sys
import time


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


# ─── Scenario definitions ────────────────────────────────────────────
# Cells are FCC unit cells (4 atoms each). Steps use a 2 fs timestep.

SIZES = {
    "ci":       {"melt_cells": (6, 6, 5),    "bulk_cells": 6,  "ramp_steps": 5_000,  "frames": 20},
    "demo":     {"melt_cells": (14, 14, 12), "bulk_cells": 12, "ramp_steps": 45_000, "frames": 80},
    "showcase": {"melt_cells": (20, 20, 16), "bulk_cells": 17, "ramp_steps": 60_000, "frames": 100},
}

CU_LATTICE = 3.615  # Å, FCC copper
TIMESTEP = 0.002    # ps (2 fs)


def run_cu_melt(out_path: str, size: str, threads: int) -> dict:
    """Cu(100) slab, free surfaces in z, heated through melting.

    The slab geometry is the point: a perfect periodic crystal superheats
    (no nucleation site), but a surface melts AT Tm and the liquid front
    moves inward — which is what you want to *see* in a viewer.
    """
    p = SIZES[size]
    nx, ny, nz = p["melt_cells"]
    ramp = p["ramp_steps"]
    dump_every = max(1, ramp // p["frames"])

    l = make_lammps(threads)
    vac = 4  # lattice units of vacuum above and below the slab
    l.commands_string(f"""
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
velocity all create 300 4928459 dist gaussian
timestep {TIMESTEP}
fix walls all wall/reflect zlo EDGE zhi EDGE
thermo 1000
""")
    natoms = l.get_natoms()

    # Equilibrate the crystal at 300 K first (no dump — frame 0 of the
    # trajectory should be the pristine crystal, not the velocity kick).
    l.commands_string("""
fix md all nvt temp 300 300 0.1
run 2000
unfix md
""")

    # Heat through Tm with the dump active. 300→1700 K over the ramp,
    # then a short hold so the last frames are fully liquid.
    hold = max(2000, ramp // 6)
    l.commands_string(f"""
reset_timestep 0
dump traj all custom {dump_every} {out_path} id type x y z
dump_modify traj sort id
fix md all nvt temp 300 1700 0.1
run {ramp}
unfix md
fix md all nvt temp 1700 1700 0.1
run {hold}
""")
    l.close()
    return {"natoms": natoms, "steps": ramp + hold, "dump_every": dump_every}


def run_cu_solidify(out_path: str, size: str, threads: int) -> dict:
    """Bulk liquid Cu rapidly quenched to a glass at fixed volume.

    Overheating at 2500 K (above the homogeneous superheating limit)
    guarantees a fully disordered liquid; the subsequent 2000→300 K ramp
    at ~4×10^13 K/s is far too fast for crystallization, so the liquid
    vitrifies — a real rapid-solidification trajectory.
    """
    p = SIZES[size]
    n = p["bulk_cells"]
    ramp = p["ramp_steps"]
    dump_every = max(1, ramp // p["frames"])

    l = make_lammps(threads)
    l.commands_string(f"""
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
velocity all create 2500 2384793 dist gaussian
timestep {TIMESTEP}
thermo 1000
""")
    natoms = l.get_natoms()

    # Melt it thoroughly (no dump): 2500 K is above the mechanical
    # superheating limit of EAM Cu, so the lattice collapses in a few ps.
    l.commands_string("""
fix md all nvt temp 2500 2500 0.1
run 6000
unfix md
""")

    # Quench with the dump active: frame 0 is hot liquid, last frames are
    # the arrested glass.
    l.commands_string(f"""
reset_timestep 0
dump traj all custom {dump_every} {out_path} id type x y z
dump_modify traj sort id
fix md all nvt temp 2000 300 0.1
run {ramp}
""")
    l.close()
    return {"natoms": natoms, "steps": ramp, "dump_every": dump_every}


SCENARIOS = {
    "cu-melt": (run_cu_melt, "cu-melt-{size}.lammpstrj"),
    "cu-solidify": (run_cu_solidify, "cu-solidify-{size}.lammpstrj"),
}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("scenario", choices=[*SCENARIOS, "all"])
    ap.add_argument("--size", choices=list(SIZES), default="demo")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "output"))
    ap.add_argument("--threads", type=int, default=min(4, os.cpu_count() or 1))
    args = ap.parse_args()

    os.environ["LAMMPS_POTENTIALS"] = find_potentials_dir()
    os.makedirs(args.out, exist_ok=True)

    names = list(SCENARIOS) if args.scenario == "all" else [args.scenario]
    for name in names:
        fn, pattern = SCENARIOS[name]
        out_path = os.path.abspath(os.path.join(args.out, pattern.format(size=args.size)))
        print(f"[{name}] {args.size}: running real LAMMPS MD -> {out_path}", flush=True)
        t0 = time.time()
        info = fn(out_path, args.size, args.threads)
        dt = time.time() - t0
        size_mb = os.path.getsize(out_path) / 1e6
        frames = info["steps"] // info["dump_every"] + 1
        print(
            f"[{name}] done: {info['natoms']} atoms, ~{frames} frames, "
            f"{size_mb:.1f} MB in {dt:.0f}s",
            flush=True,
        )


if __name__ == "__main__":
    sys.exit(main())
