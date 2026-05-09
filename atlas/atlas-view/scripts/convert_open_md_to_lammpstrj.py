"""Convert published open MD datasets to LAMMPS dump (.lammpstrj) format.

Handles three source schemas — full fidelity, no frame downsampling.

  rMD17  (CC0, figshare 12672038, MaterialsCloud pfffs-fff86):
    .npz with keys nuclear_charges (Z,), coords (F,N,3), energies (F,),
    forces (F,N,3). Per-atom property emitted: |force| (eV/A).
    Cite: Christensen & von Lilienfeld, MLST 1, 045018 (2020).

  WS22  (CC-BY-4.0, Zenodo 7032334):
    .npz with keys Z (N,), R (F,N,3), F (F,N,3), Q (F,N) Hirshfeld charge,
    DP (F,3) dipole, E (F,) energy, HL (F,2) HOMO/LUMO, plus others.
    Per-atom property emitted: Q (Hirshfeld charge).
    Cite: Pinheiro, Zhang, Dral, Barbatti, Sci. Data 10, 95 (2023).

  xxMD  (CC-BY-4.0, Zenodo 10393859):
    Extended-XYZ trajectories inside xxMD-main.zip. Each conformer block:
      line 1: natoms
      line 2: comment with "Properties=species:S:1:pos:R:3:forces:R:3 ..."
      lines 3..N+2: <element> x y z [fx fy fz ...]
    Per-atom property emitted: |force| if present, else timestep index.
    Cite: Pengmei, Shu, Levine, Sci. Data 11, 222 (2024).

Output goes to apps/web/public/gallery/open_data/<molecule>.lammpstrj
"""
from __future__ import annotations

import math
import os
import re
import sys
import zipfile
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DOWNLOADS = Path("/tmp/md_downloads")
OUT_DIR = ROOT / "apps" / "web" / "public" / "gallery" / "open_data"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Element symbol → atomic number (for xxMD extended-XYZ which uses symbols)
SYMBOL_Z = {
    "H": 1, "C": 6, "N": 7, "O": 8, "F": 9, "S": 16, "Cl": 17,
    "B": 5, "P": 15, "Br": 35, "I": 53, "Si": 14,
}


def write_dump(out: Path, Z: np.ndarray, coords: np.ndarray,
               props: dict[str, np.ndarray] | None = None,
               box_pad: float = 5.0) -> None:
    """Write a LAMMPS dump file from a (frames, atoms, 3) coords array.

    Z       (atoms,)        — atomic numbers
    coords  (frames, N, 3)  — Angstroms
    props   {name: (frames, atoms)} — optional per-atom scalars per frame
    """
    F, N, _ = coords.shape
    # Center each frame in the box; box sized to encompass all frames + pad
    all_min = coords.reshape(-1, 3).min(axis=0)
    all_max = coords.reshape(-1, 3).max(axis=0)
    extent = all_max - all_min
    L = float(np.max(extent)) + 2 * box_pad
    # Translate so minimum corner sits at (pad, pad, pad)
    shift = box_pad - all_min

    prop_names = list(props.keys()) if props else []
    header_cols = "id type x y z" + "".join(f" {p}" for p in prop_names)

    with open(out, "w") as f:
        for fi in range(F):
            f.write("ITEM: TIMESTEP\n")
            f.write(f"{fi}\n")
            f.write("ITEM: NUMBER OF ATOMS\n")
            f.write(f"{N}\n")
            f.write("ITEM: BOX BOUNDS pp pp pp\n")
            for _ in range(3):
                f.write(f"0.0 {L:.6f}\n")
            f.write(f"ITEM: ATOMS {header_cols}\n")
            xyz = coords[fi] + shift
            if prop_names:
                for ai in range(N):
                    line = (
                        f"{ai+1} {int(Z[ai])} "
                        f"{xyz[ai,0]:.4f} {xyz[ai,1]:.4f} {xyz[ai,2]:.4f}"
                    )
                    for p in prop_names:
                        line += f" {props[p][fi, ai]:.4f}"
                    f.write(line + "\n")
            else:
                for ai in range(N):
                    f.write(
                        f"{ai+1} {int(Z[ai])} "
                        f"{xyz[ai,0]:.4f} {xyz[ai,1]:.4f} {xyz[ai,2]:.4f}\n"
                    )


# ─── rMD17 ──────────────────────────────────────────────────────────────

def convert_rmd17(npz_path: Path, out_name: str) -> dict:
    print(f"[rMD17] {npz_path.name} → {out_name}")
    data = np.load(npz_path)
    Z = data["nuclear_charges"].astype(int)
    coords = data["coords"].astype(np.float32)  # (F, N, 3) in Å
    forces = data["forces"].astype(np.float32)  # kcal/mol/Å
    # Per-atom |force| as visualization scalar
    force_mag = np.linalg.norm(forces, axis=2)  # (F, N)
    out = OUT_DIR / f"{out_name}.lammpstrj"
    write_dump(out, Z, coords, props={"fmag": force_mag})
    return {
        "atoms": int(coords.shape[1]),
        "frames": int(coords.shape[0]),
        "size_mb": out.stat().st_size / 1e6,
        "property": "fmag (per-atom force magnitude, kcal/mol/Å)",
    }


# ─── WS22 ───────────────────────────────────────────────────────────────

def convert_ws22(npz_path: Path, out_name: str) -> dict:
    print(f"[WS22 ] {npz_path.name} → {out_name}")
    data = np.load(npz_path)
    Z = data["Z"].astype(int)
    coords = data["R"].astype(np.float32)
    # Hirshfeld charge if present, else energy as broadcast scalar
    prop = None
    prop_name = "zero"
    if "Q" in data.files:
        q = np.squeeze(data["Q"].astype(np.float32))
        if q.ndim == 2:
            prop = q
            prop_name = "qhirsh"
    if prop is None and "F" in data.files:
        f_arr = data["F"].astype(np.float32)
        prop = np.linalg.norm(f_arr, axis=2)
        prop_name = "fmag"
    if prop is None:
        prop = np.zeros((coords.shape[0], coords.shape[1]), dtype=np.float32)
    out = OUT_DIR / f"{out_name}.lammpstrj"
    write_dump(out, Z, coords, props={prop_name: prop})
    return {
        "atoms": int(coords.shape[1]),
        "frames": int(coords.shape[0]),
        "size_mb": out.stat().st_size / 1e6,
        "property": f"{prop_name} (Hirshfeld charge or |F|)",
    }


# ─── xxMD extended-XYZ (inside zip) ────────────────────────────────────

def parse_extxyz_stream(text: str) -> tuple[np.ndarray, np.ndarray, np.ndarray | None]:
    """Yield (Z, coords[F,N,3], forces[F,N,3] or None) from an extended-XYZ string."""
    lines = text.split("\n")
    frames_xyz = []
    frames_forces = []
    Z_first = None
    i = 0
    while i < len(lines):
        ln = lines[i].strip()
        if not ln:
            i += 1
            continue
        try:
            n = int(ln)
        except ValueError:
            i += 1
            continue
        comment = lines[i + 1] if i + 1 < len(lines) else ""
        # Detect column layout from Properties= field
        m = re.search(r"Properties=([\w:.]+)", comment)
        has_forces = m and "forces:R:3" in m.group(1)
        atom_lines = lines[i + 2: i + 2 + n]
        Zf = np.empty(n, dtype=int)
        xyz = np.empty((n, 3), dtype=np.float32)
        forces = np.empty((n, 3), dtype=np.float32) if has_forces else None
        for ai, al in enumerate(atom_lines):
            parts = al.split()
            if not parts:
                Zf[ai] = 0
                xyz[ai] = 0.0
                continue
            sym = parts[0]
            Zf[ai] = SYMBOL_Z.get(sym, 0)
            xyz[ai, 0] = float(parts[1])
            xyz[ai, 1] = float(parts[2])
            xyz[ai, 2] = float(parts[3])
            if has_forces and len(parts) >= 7:
                forces[ai, 0] = float(parts[4])
                forces[ai, 1] = float(parts[5])
                forces[ai, 2] = float(parts[6])
        if Z_first is None:
            Z_first = Zf
        frames_xyz.append(xyz)
        if has_forces:
            frames_forces.append(forces)
        i += 2 + n

    coords = np.stack(frames_xyz, axis=0) if frames_xyz else np.zeros((0, 0, 3))
    forces_arr = np.stack(frames_forces, axis=0) if frames_forces else None
    return Z_first, coords, forces_arr


XXMD_CODE = {
    "azobenzene": "azo",
    "stilbene": "sti",
    "malonaldehyde": "mal",
    "diarylethene": "dia",
    "dithiophene": "dia",   # paper's photoswitch (C10H8S2 dithienylethene)
}


def convert_xxmd(zip_path: Path, molecule: str, out_name: str) -> dict:
    """xxMD-DFT layout: outer zip xxMD-main/xxMD-DFT/<code>/<code>.zip,
    inner zip contains <code>_train_uks.xyz, <code>_test_uks.xyz, <code>_val_uks.xyz.
    All three are concatenated to form one continuous trajectory."""
    code = XXMD_CODE.get(molecule, molecule)
    print(f"[xxMD ] {zip_path.name} :: {molecule} (code={code}) → {out_name}")
    import io as _io
    coords_all = []
    forces_all = []
    Z = None
    inner_zip_path = f"xxMD-main/xxMD-DFT/{code}/{code}.zip"
    with zipfile.ZipFile(zip_path) as zf_outer:
        if inner_zip_path not in zf_outer.namelist():
            raise FileNotFoundError(f"{inner_zip_path} not in outer zip")
        inner_bytes = zf_outer.read(inner_zip_path)
    with zipfile.ZipFile(_io.BytesIO(inner_bytes)) as zf_inner:
        # Train/val/test together = full trajectory pool
        members = sorted(n for n in zf_inner.namelist() if n.endswith(".xyz"))
        if not members:
            raise FileNotFoundError(f"No .xyz inside {inner_zip_path}")
        for m in members:
            text = zf_inner.read(m).decode("utf-8", errors="replace")
            Zi, ci, fi = parse_extxyz_stream(text)
            if Z is None:
                Z = Zi
            coords_all.append(ci)
            if fi is not None:
                forces_all.append(fi)
    coords = np.concatenate(coords_all, axis=0)
    forces = np.concatenate(forces_all, axis=0) if forces_all else None
    out = OUT_DIR / f"{out_name}.lammpstrj"
    if forces is not None and forces.shape == coords.shape:
        prop = np.linalg.norm(forces, axis=2)
        write_dump(out, Z, coords, props={"fmag": prop})
        prop_name = "fmag (per-atom |F| in eV/Å)"
    else:
        write_dump(out, Z, coords)
        prop_name = "(none)"
    return {
        "atoms": int(coords.shape[1]),
        "frames": int(coords.shape[0]),
        "size_mb": out.stat().st_size / 1e6,
        "property": prop_name,
        "n_subtrajectories": len(members),
    }


# ─── rMD17-aq (zipped npz inside) ──────────────────────────────────────

def convert_rmd17aq(zip_path: Path, out_name: str) -> dict:
    """rMD17-aq layout (per the dataset README):
        <mol>/nuclear_charges.txt   one Z per line
        <mol>/coords.txt            atom-major (frames*atoms) rows of "x y z"
        <mol>/charges.txt           atom-major partial charges (one per line)
        <mol>/forces.txt            atom-major forces (one row of fx fy fz per atom-frame)
        <mol>/energies.txt          one E per frame
    The QM/MM partial charges are the headline property — this dataset's
    distinguishing feature versus gas-phase rMD17."""
    print(f"[rMD17-aq] {zip_path.name} → {out_name}")
    with zipfile.ZipFile(zip_path) as zf:
        # Find the molecule subfolder
        prefix = next(
            (n for n in zf.namelist() if n.endswith("/") and not n.startswith("__MACOSX")),
            None,
        )
        if not prefix:
            # Some zips have no folder header; infer from any .txt
            txt = next(n for n in zf.namelist() if n.endswith("nuclear_charges.txt"))
            prefix = txt.rsplit("/", 1)[0] + "/"
        Z = np.loadtxt(zf.open(prefix + "nuclear_charges.txt"), dtype=int)
        N = len(Z)
        coords_flat = np.loadtxt(zf.open(prefix + "coords.txt"), dtype=np.float32)
        # coords_flat: (frames * N, 3)
        F = coords_flat.shape[0] // N
        coords = coords_flat[: F * N].reshape(F, N, 3)
        # Charges (one per line, atom-major)
        charges = None
        if prefix + "charges.txt" in zf.namelist():
            q_flat = np.loadtxt(zf.open(prefix + "charges.txt"), dtype=np.float32)
            charges = q_flat[: F * N].reshape(F, N)
    out = OUT_DIR / f"{out_name}.lammpstrj"
    if charges is not None:
        write_dump(out, Z, coords, props={"qpartial": charges})
        prop_name = "qpartial (QM/MM partial charge from CP2K)"
    else:
        write_dump(out, Z, coords)
        prop_name = "(none)"
    return {
        "atoms": int(coords.shape[1]),
        "frames": int(coords.shape[0]),
        "size_mb": out.stat().st_size / 1e6,
        "property": prop_name,
    }


# ─── Driver ────────────────────────────────────────────────────────────

JOBS = [
    # (source_kind, source_path, ...args, out_name)
    ("rmd17", DOWNLOADS / "rmd17/rmd17_aspirin.npz", "rmd17_aspirin"),
    ("rmd17", DOWNLOADS / "rmd17/rmd17_naphthalene.npz", "rmd17_naphthalene"),
    ("rmd17", DOWNLOADS / "rmd17/rmd17_paracetamol.npz", "rmd17_paracetamol"),
    ("rmd17", DOWNLOADS / "rmd17/rmd17_uracil.npz", "rmd17_uracil"),
    ("rmd17", DOWNLOADS / "rmd17/rmd17_ethanol.npz", "rmd17_ethanol"),
    ("ws22", DOWNLOADS / "ws22/ws22_alanine.npz", "ws22_alanine"),
    ("ws22", DOWNLOADS / "ws22/ws22_thymine.npz", "ws22_thymine"),
    ("ws22", DOWNLOADS / "ws22/ws22_urocanic.npz", "ws22_urocanic"),
    ("ws22", DOWNLOADS / "ws22/ws22_dmabn.npz", "ws22_dmabn"),
    ("xxmd", DOWNLOADS / "xxmd/xxMD-main.zip", "azobenzene", "xxmd_azobenzene"),
    ("xxmd", DOWNLOADS / "xxmd/xxMD-main.zip", "stilbene", "xxmd_stilbene"),
    ("xxmd", DOWNLOADS / "xxmd/xxMD-main.zip", "malonaldehyde", "xxmd_malonaldehyde"),
    ("xxmd", DOWNLOADS / "xxmd/xxMD-main.zip", "dithiophene", "xxmd_diarylethene"),
    ("rmd17aq", DOWNLOADS / "rmd17aq/aspirin.zip", "rmd17aq_aspirin"),
    ("rmd17aq", DOWNLOADS / "rmd17aq/uracil.zip", "rmd17aq_uracil"),
    ("rmd17aq", DOWNLOADS / "rmd17aq/salicylic.zip", "rmd17aq_salicylic"),
]


def main(only: list[str] | None = None) -> None:
    results = []
    for job in JOBS:
        kind = job[0]
        out_name = job[-1]
        if only and out_name not in only:
            continue
        src = job[1]
        if not src.exists():
            print(f"  skip {out_name}: source not yet downloaded ({src})")
            continue
        try:
            if kind == "rmd17":
                info = convert_rmd17(src, out_name)
            elif kind == "ws22":
                info = convert_ws22(src, out_name)
            elif kind == "xxmd":
                info = convert_xxmd(src, job[2], out_name)
            elif kind == "rmd17aq":
                info = convert_rmd17aq(src, out_name)
            else:
                print(f"  unknown kind: {kind}")
                continue
            info["name"] = out_name
            results.append(info)
            print(f"  ✓ {out_name}: {info['atoms']} atoms × {info['frames']} frames "
                  f"= {info['size_mb']:.1f} MB ({info['property']})")
        except Exception as e:
            print(f"  ✗ {out_name}: {e}")
    print("\nSummary:")
    for r in results:
        print(f"  {r['name']:30s} {r['atoms']:>4d} atoms × {r['frames']:>6d} frames = {r['size_mb']:>6.1f} MB")


if __name__ == "__main__":
    only = sys.argv[1:] if len(sys.argv) > 1 else None
    main(only)
