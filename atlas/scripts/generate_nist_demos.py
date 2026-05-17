#!/usr/bin/env python3
"""
generate_nist_demos.py — Batch-generate demo trajectories for NIST IPR potentials.

For each potential, builds a small test crystal, runs a short LAMMPS
minimization + NVT MD, and converts the output to .glimbin for native
viewer consumption.

Usage:
    python atlas/scripts/generate_nist_demos.py
    python atlas/scripts/generate_nist_demos.py --limit 20 --element Al,Ni,Cu
    python atlas/scripts/generate_nist_demos.py --pair-style eam/alloy

Requires: lammps (Python package), numpy
"""

import json
import os
import sys
import argparse
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

# ─── Paths ──────────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).resolve().parents[2]
NIST_ROOT = REPO_ROOT / "atlas" / "nist_ipr"
INDEX_PATH = NIST_ROOT / "index" / "master_index.json"
DEMO_DIR = NIST_ROOT / "demos"
MANIFEST_PATH = DEMO_DIR / "manifest.json"
GLIMBIN_CONVERT = REPO_ROOT / "atlas" / "atlas-view" / "tools" / "glimbin_convert.py"

# ─── Crystal structure heuristics ───────────────────────────────────────

STRUCTURE_MAP = {
    # FCC
    "Al": ("fcc", 4.05),
    "Cu": ("fcc", 3.615),
    "Ni": ("fcc", 3.524),
    "Ag": ("fcc", 4.09),
    "Au": ("fcc", 4.08),
    "Pt": ("fcc", 3.92),
    "Pd": ("fcc", 3.89),
    "Pb": ("fcc", 4.95),
    "Ca": ("fcc", 5.58),
    "Sr": ("fcc", 6.08),
    "Ir": ("fcc", 3.84),
    "Rh": ("fcc", 3.80),
    # BCC
    "Fe": ("bcc", 2.87),
    "Cr": ("bcc", 2.88),
    "Mo": ("bcc", 3.15),
    "W": ("bcc", 3.16),
    "V": ("bcc", 3.03),
    "Nb": ("bcc", 3.30),
    "Ta": ("bcc", 3.31),
    "Ba": ("bcc", 5.02),
    # HCP
    "Mg": ("hcp", 3.21),
    "Ti": ("hcp", 2.95),
    "Zn": ("hcp", 2.66),
    "Zr": ("hcp", 3.23),
    "Co": ("hcp", 2.51),
    # Diamond
    "Si": ("diamond", 5.43),
    "Ge": ("diamond", 5.66),
    "C": ("diamond", 3.57),
}


def guess_structure(elements: list[str]) -> tuple[str, float]:
    """Guess crystal structure and lattice constant from element list."""
    if len(elements) == 1:
        el = elements[0]
        if el in STRUCTURE_MAP:
            return STRUCTURE_MAP[el]
        # Default fallback
        return ("fcc", 4.0)
    # For binaries, default to FCC with average lattice constant
    lats = [STRUCTURE_MAP.get(el, ("fcc", 4.0))[1] for el in elements if el in STRUCTURE_MAP]
    avg_lat = sum(lats) / len(lats) if lats else 4.0
    return ("fcc", avg_lat)


# ─── LAMMPS input generation ────────────────────────────────────────────

def generate_lammps_input(
    potential: dict,
    potential_file: Path,
    out_dump: Path,
    structure: str,
    lattice: float,
    supercell: int = 3,
    library_file: Path | None = None,
) -> str:
    """Generate a LAMMPS input script for a short demo run."""
    elements = potential["elements"]
    pair_style = potential["pair_style"]
    n_types = len(elements)

    lines = [
        "# NIST IPR Demo Generation",
        f"# Potential: {potential['id']}",
        "units metal",
        "atom_style atomic",
        "boundary p p p",
        "",
    ]

    # Lattice and region
    if structure == "fcc":
        lines.append(f"lattice fcc {lattice}")
    elif structure == "bcc":
        lines.append(f"lattice bcc {lattice}")
    elif structure == "hcp":
        lines.append(f"lattice hcp {lattice}")
    elif structure == "diamond":
        lines.append(f"lattice diamond {lattice}")
    else:
        lines.append(f"lattice fcc {lattice}")

    lines.extend([
        f"region box block 0 {supercell} 0 {supercell} 0 {supercell}",
        "create_box {} box".format(n_types),
        "create_atoms 1 box",
    ])

    # For multi-element, random substitution would be needed, but for demo
    # we just create a single-type crystal. Advanced: use set type/ratio.

    lines.extend([
        "",
        f"pair_style {pair_style}",
    ])

    # Pair coeff line varies by style — use absolute path so LAMMPS finds it
    # regardless of its internal working directory.
    abs_fname = str(potential_file.resolve()).replace("\\", "/")
    if pair_style in ("eam/alloy", "eam/fs", "eam/cd", "eam/he"):
        lines.append(f'pair_coeff * * "{abs_fname}" {" ".join(elements)}')
    elif pair_style == "eam":
        # eam uses individual files per type
        lines.append(f'pair_coeff * * "{abs_fname}"')
    elif pair_style in ("meam", "meam/spline"):
        if library_file and library_file.exists():
            abs_lib = str(library_file.resolve()).replace("\\", "/")
            # MEAM syntax: pair_coeff * * lib.el elements... param.el elements...
            # The elements must appear after both files for type mapping.
            lines.append(f'pair_coeff * * "{abs_lib}" {" ".join(elements)} "{abs_fname}" {" ".join(elements)}')
        else:
            # Fallback: hope the single file works (will likely fail)
            lines.append(f'pair_coeff * * "{abs_fname}" {" ".join(elements)} {" ".join(elements)}')
    elif pair_style in ("tersoff", "sw", "bop", "vashishta", "comb3"):
        lines.append(f'pair_coeff * * "{abs_fname}" {" ".join(elements)}')
    elif pair_style == "adp":
        lines.append(f'pair_coeff * * "{abs_fname}" {" ".join(elements)}')
    elif pair_style == "reax/c":
        lines.append(f'pair_coeff * * "{abs_fname}"')
    else:
        lines.append(f'pair_coeff * * "{abs_fname}"')

    lines.extend([
        "",
        "neighbor 2.0 bin",
        "neigh_modify delay 5 every 1",
        "",
        "# Minimize",
        "minimize 1.0e-4 1.0e-6 100 1000",
        "",
        "# Short NVT equilibration",
        "velocity all create 300.0 12345",
        "fix 1 all nvt temp 300.0 300.0 0.1",
        "timestep 0.001",
        f"dump 1 all custom 10 {out_dump} id type x y z",
        "dump_modify 1 sort id",
        "run 50",
        "",
    ])

    return "\n".join(lines) + "\n"


# ─── Runner ─────────────────────────────────────────────────────────────

def run_lammps(input_script: str, work_dir: Path) -> bool:
    """Run LAMMPS via Python bindings or subprocess."""
    try:
        from lammps import lammps
        lmp = lammps(cmdargs=["-screen", "none", "-log", "none"])
        lmp.command("clear")
        for line in input_script.strip().splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                lmp.command(line)
        lmp.close()
        return True
    except Exception as e:
        print(f"  LAMMPS run failed: {e}")
        return False


def convert_to_glimbin(dump_path: Path, glimbin_path: Path) -> bool:
    """Convert a LAMMPS dump to .glimbin using the existing tool."""
    if not GLIMBIN_CONVERT.exists():
        print(f"  glimbin_convert.py not found at {GLIMBIN_CONVERT}")
        return False
    try:
        subprocess.run(
            [sys.executable, str(GLIMBIN_CONVERT), str(dump_path), "-o", str(glimbin_path)],
            check=True,
            capture_output=True,
        )
        return True
    except subprocess.CalledProcessError as e:
        print(f"  glimbin conversion failed: {e.stderr.decode()[:200]}")
        return False


def process_potential(potential: dict, resume: bool = True) -> Optional[Path]:
    """Generate a demo glimbin for a single potential. Returns path on success."""
    pot_id = potential["id"]
    pair_style = potential["pair_style"]
    out_dir = DEMO_DIR / pair_style.replace("/", "_")
    out_dir.mkdir(parents=True, exist_ok=True)
    glimbin_path = out_dir / f"{pot_id}.glimbin"

    if resume and glimbin_path.exists():
        print(f"  [skip] {pot_id} already exists")
        return glimbin_path

    # Find the potential parameter file
    artifacts = potential.get("artifacts", [])
    param_files = [a for a in artifacts if not a["filename"].lower().endswith(".pdf")]
    if not param_files:
        print(f"  [skip] {pot_id} has no parameter file")
        return None

    # For eam, there may be multiple files; pick the first relevant one.
    # For MEAM, skip library.meam — it's handled separately.
    param_file = None
    for artifact in param_files:
        fname = artifact["filename"]
        if pair_style in ("meam", "meam/spline") and fname.lower() == "library.meam":
            continue
        fpath = NIST_ROOT / "files" / pair_style.replace("/", "_") / pot_id / fname
        if fpath.exists():
            param_file = fpath
            break

    if not param_file:
        print(f"  [skip] {pot_id} parameter file not found locally")
        return None

    structure, lattice = guess_structure(potential["elements"])

    # For MEAM, locate library file if present
    library_file = None
    if pair_style in ("meam", "meam/spline"):
        for artifact in artifacts:
            if artifact["filename"].lower() == "library.meam":
                lib_path = NIST_ROOT / "files" / pair_style.replace("/", "_") / pot_id / artifact["filename"]
                if lib_path.exists():
                    library_file = lib_path
                    break

    with tempfile.TemporaryDirectory(prefix="nist_demo_") as tmp:
        tmp_path = Path(tmp)
        # Copy parameter file to temp dir so LAMMPS can find it
        local_param = tmp_path / param_file.name
        local_param.write_bytes(param_file.read_bytes())

        # Copy library file for MEAM
        local_lib = None
        if library_file:
            local_lib = tmp_path / library_file.name
            local_lib.write_bytes(library_file.read_bytes())

        dump_path = tmp_path / "demo.dump"
        input_script = generate_lammps_input(
            potential, local_param, dump_path, structure, lattice,
            library_file=local_lib,
        )

        input_path = tmp_path / "in.demo"
        input_path.write_text(input_script)

        print(f"  Running {pot_id} ({pair_style}, {structure}, a={lattice:.2f}) ...")
        success = run_lammps(input_script, tmp_path)
        if not success:
            return None

        if not dump_path.exists() or dump_path.stat().st_size == 0:
            print(f"  [fail] {pot_id} produced no dump output")
            return None

        if not convert_to_glimbin(dump_path, glimbin_path):
            return None

    print(f"  [ok] {pot_id} -> {glimbin_path}")
    return glimbin_path


# ─── Main ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Generate NIST IPR demo trajectories")
    parser.add_argument("--limit", type=int, default=None, help="Max potentials to process")
    parser.add_argument("--element", type=str, default=None, help="Filter by element(s), comma-separated")
    parser.add_argument("--pair-style", type=str, default=None, help="Filter by pair style")
    parser.add_argument("--no-resume", action="store_true", help="Re-run even if demo exists")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be done without running")
    parser.add_argument("--index", type=str, default=None, help="Alternate index JSON path")
    args = parser.parse_args()

    index_path = Path(args.index) if args.index else INDEX_PATH
    if not index_path.exists():
        print(f"ERROR: NIST index not found: {index_path}")
        sys.exit(1)

    with open(index_path) as f:
        potentials = json.load(f)

    # Filters
    filtered = potentials
    if args.element:
        targets = set(args.element.split(","))
        filtered = [p for p in filtered if targets.issubset(set(p.get("elements", [])))]
    if args.pair_style:
        filtered = [p for p in filtered if p.get("pair_style") == args.pair_style]
    if args.limit:
        filtered = filtered[:args.limit]

    print(f"NIST IPR Demo Generator")
    print(f"  Total potentials in index: {len(potentials)}")
    print(f"  After filters: {len(filtered)}")
    print(f"  Output dir: {DEMO_DIR}")
    print()

    if args.dry_run:
        for p in filtered:
            print(f"Would process: {p['id']} ({p['pair_style']})")
        return

    manifest = {}
    if MANIFEST_PATH.exists():
        with open(MANIFEST_PATH) as f:
            manifest = json.load(f)

    success_count = 0
    fail_count = 0

    for potential in filtered:
        result = process_potential(potential, resume=not args.no_resume)
        if result:
            manifest[potential["id"]] = {
                "path": str(result.relative_to(NIST_ROOT)).replace("\\", "/"),
                "success": True,
            }
            success_count += 1
        else:
            manifest[potential["id"]] = {"path": None, "success": False}
            fail_count += 1

    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2))
    print()
    print(f"Done: {success_count} succeeded, {fail_count} failed")
    print(f"Manifest: {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
