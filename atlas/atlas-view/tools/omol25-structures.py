#!/usr/bin/env python3
"""
One-time OMol25 -> Lupi structure + index extract (request #2, real geometry).

The compact search index (omol25-extract.py) carries only formula/metadata, so a
hit could be searched but not opened with its true coordinates. This script reads
the public colabfit OMol25 neutral-validation *structures* parquet (which DOES
carry positions + atomic_numbers + energy + gap) and emits, for each molecule:

  * a self-contained `.xyz` file (element symbols + Angstrom coordinates) that the
    viewer loads directly via its existing url -> parseXyzFile path, and
  * one row of a compact JSON index (formula/elements/natoms/gap/energy/src) that
    is fetched + filtered client-side, exactly like the NIST catalog.

Index row order IS the parquet row order, so record `nval-{i}` always maps to
`structures/xyz/nval-{i}.xyz` -- the index and the geometry can never drift.

Usage:
    pip install pyarrow
    # parquet is the ungated colabfit mirror (real structures, ~72 MB):
    #   https://huggingface.co/datasets/colabfit/OMol25_neutral_validation
    python omol25-structures.py \
        omol25_neutral_validation.parquet  out_dir  neutral_validation
    # publish (bucket is public-read + CORS GET *):
    gcloud storage cp out_dir/omol25_neutral_val.json gs://shed-489901-omol25/
    gcloud storage cp -r out_dir/xyz                  gs://shed-489901-omol25/structures/
"""
from __future__ import annotations

import json
import os
import sys

import pyarrow.parquet as pq

# Z -> symbol (1..118). Index 0 is a placeholder so PT[Z] is a direct lookup.
PT = (
    "X H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni "
    "Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe "
    "Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg "
    "Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg "
    "Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og"
).split()


def symbol(z: int) -> str:
    return PT[z] if 0 < z < len(PT) else f"Q{z}"


def xyz_text(numbers: list[int], positions: list[list[float]], comment: str) -> str:
    lines = [str(len(numbers)), comment]
    for z, (x, y, zc) in zip(numbers, positions):
        lines.append(f"{symbol(int(z))} {x:.6f} {y:.6f} {zc:.6f}")
    return "\n".join(lines) + "\n"


def main(src: str, out_dir: str, split: str) -> None:
    xyz_dir = os.path.join(out_dir, "xyz")
    os.makedirs(xyz_dir, exist_ok=True)

    table = pq.read_table(
        src,
        columns=[
            "chemical_formula_hill",
            "chemical_formula_reduced",
            "elements",
            "atomic_numbers",
            "positions",
            "nsites",
            "electronic_band_gap",
            "energy",
            "dataset_id",
        ],
    )
    cols = {name: table.column(name).to_pylist() for name in table.column_names}
    n = table.num_rows

    records = []
    for i in range(n):
        rid = f"nval-{i}"
        formula = cols["chemical_formula_hill"][i] or cols["chemical_formula_reduced"][i] or ""
        elements = sorted(cols["elements"][i] or [])
        numbers = cols["atomic_numbers"][i] or []
        positions = cols["positions"][i] or []
        natoms = int(cols["nsites"][i] or len(numbers))
        gap = cols["electronic_band_gap"][i]
        energy = cols["energy"][i]
        src_id = cols["dataset_id"][i] or "omol25"

        comment = f"OMol25 {rid} {formula}"
        if energy is not None:
            comment += f" E={float(energy):.4f}eV"
        with open(os.path.join(xyz_dir, f"{rid}.xyz"), "w", encoding="utf-8") as fh:
            fh.write(xyz_text(numbers, positions, comment))

        records.append({
            "id": rid,
            "formula": formula,
            "elements": elements,
            "natoms": natoms,
            "gap": round(float(gap), 3) if gap is not None else None,
            "energy": round(float(energy), 4) if energy is not None else None,
            "src": str(src_id),
        })

    index_path = os.path.join(out_dir, "omol25_neutral_val.json")
    with open(index_path, "w", encoding="utf-8") as fh:
        json.dump(
            {"dataset": "OMol25", "split": split, "count": n,
             "structures": "structures/xyz/{id}.xyz", "records": records},
            fh, separators=(",", ":"),
        )
    print(f"wrote {n} structures to {xyz_dir} and index to {index_path}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "unknown")
