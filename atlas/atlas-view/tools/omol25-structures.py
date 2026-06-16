#!/usr/bin/env python3
"""
One-time OMol25 -> Lupi structure + index extract (request #2, real geometry).

The compact search index (omol25-extract.py) carries only formula/metadata, so a
hit could be searched but not opened with its true coordinates. This script reads
the public colabfit OMol25 neutral-validation *structures* parquet (which DOES
carry positions + atomic_numbers + energy + gap) and emits, for each molecule:

  * a self-contained `.xyz` file (element symbols + Angstrom coordinates) that the
    viewer loads directly via its existing url -> parseXyzFile path, and
  * one row of a compact JSON index (formula/elements/natoms/gap/energy/src plus
    method-derived functionalGroups) that is fetched + filtered client-side,
    exactly like the NIST catalog.

The parquet structures provide real coordinates and scalar metadata, not a source
bond table. The functional-group labels below are a Lupi geometry screen built
from covalent-radius neighbor rules; they are useful search/study aids, not
OMol25 source bond topology or quantum bond orders.

Index row order IS the parquet row order, so record `nval-{i}` always maps to
`structures/xyz/nval-{i}.xyz` -- the index and the geometry can never drift.

Usage:
    pip install pyarrow
    # parquet is the ungated colabfit mirror (real structures, ~72 MB):
    #   https://huggingface.co/datasets/colabfit/OMol25_neutral_validation
    python omol25-structures.py \
        omol25_neutral_validation.parquet  out_dir  neutral_validation
    # publish (bucket is public-read + CORS GET *):
    gcloud storage cp out_dir/omol25_neutral_val.v3.json gs://shed-489901-omol25/
    gcloud storage cp -r out_dir/xyz                  gs://shed-489901-omol25/structures/
"""
from __future__ import annotations

import json
import os
import sys
from collections import Counter, defaultdict
from math import floor

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


FUNCTIONAL_GROUP_ORDER = [
    "arene",
    "heteroaromatic",
    "alkene",
    "alcohol-phenol",
    "amine",
    "amide",
    "aldehyde",
    "ketone",
    "carboxylic-acid",
    "ester",
    "anhydride",
    "acyl-halide",
    "ether",
    "epoxide",
    "nitrile",
    "nitro",
    "alkyl-halide",
    "thiol",
    "sulfide",
    "phosphate-ester",
]
FUNCTIONAL_GROUP_RANK = {group: i for i, group in enumerate(FUNCTIONAL_GROUP_ORDER)}

# Covalent radii in Angstrom for the elements seen in the neutral-validation
# slice, with a reasonable carbon-like fallback for rare atoms.
COVALENT_RADIUS = {
    1: 0.31,
    5: 0.84,
    6: 0.76,
    7: 0.71,
    8: 0.66,
    9: 0.57,
    11: 1.66,
    12: 1.41,
    14: 1.11,
    15: 1.07,
    16: 1.05,
    17: 1.02,
    19: 2.03,
    20: 1.76,
    35: 1.20,
    53: 1.39,
}
HALOGENS = {9, 17, 35, 53}
ORGANIC_HETERO = {7, 8, 16}


def sq_dist(a: list[float], b: list[float]) -> float:
    dx = float(a[0]) - float(b[0])
    dy = float(a[1]) - float(b[1])
    dz = float(a[2]) - float(b[2])
    return dx * dx + dy * dy + dz * dz


def covalent_cutoff(a: int, b: int) -> float:
    radius_a = COVALENT_RADIUS.get(int(a), 0.77)
    radius_b = COVALENT_RADIUS.get(int(b), 0.77)
    return 1.25 * (radius_a + radius_b) + 0.15


def infer_bonds(numbers: list[int], positions: list[list[float]]) -> list[set[int]]:
    adjacency = [set() for _ in numbers]
    if not numbers or not positions:
        return adjacency

    # A spatial hash keeps the one-time extract comfortably linear-ish even for
    # larger OMol systems. The largest organic covalent cutoff here is below 2.6 A.
    cell_size = 2.6
    grid: dict[tuple[int, int, int], list[int]] = defaultdict(list)
    for i, pos in enumerate(positions):
        cell = tuple(floor(float(coord) / cell_size) for coord in pos)
        grid[cell].append(i)

    for i, pos in enumerate(positions):
        base = tuple(floor(float(coord) / cell_size) for coord in pos)
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for dz in (-1, 0, 1):
                    for j in grid.get((base[0] + dx, base[1] + dy, base[2] + dz), []):
                        if j >= i:
                            continue
                        cutoff = covalent_cutoff(numbers[i], numbers[j])
                        if sq_dist(pos, positions[j]) <= cutoff * cutoff:
                            adjacency[i].add(j)
                            adjacency[j].add(i)
    return adjacency


def bond_distance(i: int, j: int, positions: list[list[float]]) -> float:
    return sq_dist(positions[i], positions[j]) ** 0.5


def neighbors_with_z(i: int, z: int, numbers: list[int], adjacency: list[set[int]]) -> list[int]:
    return [j for j in adjacency[i] if int(numbers[j]) == z]


def carbonyl_oxygen_neighbors(
    carbon: int,
    numbers: list[int],
    positions: list[list[float]],
    adjacency: list[set[int]],
) -> list[int]:
    if int(numbers[carbon]) != 6:
        return []
    return [
        oxygen
        for oxygen in neighbors_with_z(carbon, 8, numbers, adjacency)
        if bond_distance(carbon, oxygen, positions) <= 1.32
    ]


def is_carbonyl_carbon(
    atom: int,
    numbers: list[int],
    positions: list[list[float]],
    adjacency: list[set[int]],
) -> bool:
    return bool(carbonyl_oxygen_neighbors(atom, numbers, positions, adjacency))


def has_six_member_arene(numbers: list[int], positions: list[list[float]], adjacency: list[set[int]]) -> bool:
    aromatic_edges: dict[int, set[int]] = defaultdict(set)
    for i, z in enumerate(numbers):
        if int(z) != 6:
            continue
        for j in adjacency[i]:
            if j <= i or int(numbers[j]) != 6:
                continue
            d = bond_distance(i, j, positions)
            if 1.33 <= d <= 1.47:
                aromatic_edges[i].add(j)
                aromatic_edges[j].add(i)

    def dfs(start: int, current: int, path: list[int]) -> bool:
        if len(path) == 6:
            return start in aromatic_edges[current]
        for nxt in aromatic_edges[current]:
            if nxt in path:
                continue
            if dfs(start, nxt, [*path, nxt]):
                return True
        return False

    return any(dfs(start, start, [start]) for start in aromatic_edges)


def has_heteroaromatic_ring(numbers: list[int], positions: list[list[float]], adjacency: list[set[int]]) -> bool:
    ring_edges: dict[int, set[int]] = defaultdict(set)
    ring_atoms = {6, 7, 8, 16}
    for i, z in enumerate(numbers):
        if int(z) not in ring_atoms:
            continue
        for j in adjacency[i]:
            if j <= i or int(numbers[j]) not in ring_atoms:
                continue
            d = bond_distance(i, j, positions)
            if 1.25 <= d <= 1.50:
                ring_edges[i].add(j)
                ring_edges[j].add(i)

    def dfs(start: int, current: int, path: list[int], target_len: int) -> bool:
        if len(path) == target_len:
            return start in ring_edges[current] and any(int(numbers[p]) in ORGANIC_HETERO for p in path)
        for nxt in ring_edges[current]:
            if nxt in path:
                continue
            if dfs(start, nxt, [*path, nxt], target_len):
                return True
        return False

    for start in ring_edges:
        if dfs(start, start, [start], 5) or dfs(start, start, [start], 6):
            return True
    return False


def functional_groups_for_structure(numbers: list[int], positions: list[list[float]]) -> list[str]:
    adjacency = infer_bonds(numbers, positions)
    groups: set[str] = set()
    carbonyl_carbons = {
        i for i, z in enumerate(numbers)
        if int(z) == 6 and carbonyl_oxygen_neighbors(i, numbers, positions, adjacency)
    }
    nitrile_nitrogens: set[int] = set()
    nitro_nitrogens: set[int] = set()
    amide_nitrogens: set[int] = set()

    if has_six_member_arene(numbers, positions, adjacency):
        groups.add("arene")
    if has_heteroaromatic_ring(numbers, positions, adjacency):
        groups.add("heteroaromatic")

    for i, z in enumerate(numbers):
        zi = int(z)
        if zi == 6:
            carbon_neighbors = neighbors_with_z(i, 6, numbers, adjacency)
            for j in carbon_neighbors:
                if j > i and bond_distance(i, j, positions) <= 1.35:
                    groups.add("alkene")

            for n in neighbors_with_z(i, 7, numbers, adjacency):
                if bond_distance(i, n, positions) <= 1.28:
                    groups.add("nitrile")
                    nitrile_nitrogens.add(n)

            if i in carbonyl_carbons:
                h_neighbors = neighbors_with_z(i, 1, numbers, adjacency)
                n_neighbors = neighbors_with_z(i, 7, numbers, adjacency)
                halogen_neighbors = [j for j in adjacency[i] if int(numbers[j]) in HALOGENS]
                single_o_neighbors = [
                    j
                    for j in neighbors_with_z(i, 8, numbers, adjacency)
                    if bond_distance(i, j, positions) > 1.32
                ]

                if h_neighbors:
                    groups.add("aldehyde")
                if len(carbon_neighbors) >= 2:
                    groups.add("ketone")
                if n_neighbors:
                    groups.add("amide")
                    amide_nitrogens.update(n_neighbors)
                if halogen_neighbors:
                    groups.add("acyl-halide")

                has_anhydride = False
                has_ester = False
                has_acid = False
                for oxygen in single_o_neighbors:
                    if neighbors_with_z(oxygen, 1, numbers, adjacency):
                        has_acid = True
                    other_carbons = [
                        c for c in neighbors_with_z(oxygen, 6, numbers, adjacency)
                        if c != i
                    ]
                    if any(c in carbonyl_carbons for c in other_carbons):
                        has_anhydride = True
                    elif other_carbons:
                        has_ester = True
                if has_acid:
                    groups.add("carboxylic-acid")
                if has_anhydride:
                    groups.add("anhydride")
                elif has_ester:
                    groups.add("ester")

        elif zi == 7:
            oxygen_neighbors = neighbors_with_z(i, 8, numbers, adjacency)
            carbon_neighbors = neighbors_with_z(i, 6, numbers, adjacency)
            if len(oxygen_neighbors) >= 2 and carbon_neighbors:
                groups.add("nitro")
                nitro_nitrogens.add(i)

        elif zi == 8:
            carbon_neighbors = neighbors_with_z(i, 6, numbers, adjacency)
            hydrogen_neighbors = neighbors_with_z(i, 1, numbers, adjacency)
            if hydrogen_neighbors and carbon_neighbors:
                groups.add("alcohol-phenol")
            if len(carbon_neighbors) >= 2:
                if carbon_neighbors[0] in adjacency[carbon_neighbors[1]]:
                    groups.add("epoxide")
                groups.add("ether")

        elif zi == 15:
            oxygen_neighbors = neighbors_with_z(i, 8, numbers, adjacency)
            if len(oxygen_neighbors) >= 3:
                has_o_c = any(neighbors_with_z(o, 6, numbers, adjacency) for o in oxygen_neighbors)
                if has_o_c:
                    groups.add("phosphate-ester")

        elif zi == 16:
            carbon_neighbors = neighbors_with_z(i, 6, numbers, adjacency)
            hydrogen_neighbors = neighbors_with_z(i, 1, numbers, adjacency)
            if carbon_neighbors and hydrogen_neighbors:
                groups.add("thiol")
            if len(carbon_neighbors) >= 2 and not hydrogen_neighbors:
                groups.add("sulfide")

    for i, z in enumerate(numbers):
        zi = int(z)
        if zi == 7:
            if i in nitro_nitrogens or i in nitrile_nitrogens or i in amide_nitrogens:
                continue
            if neighbors_with_z(i, 6, numbers, adjacency) or neighbors_with_z(i, 1, numbers, adjacency):
                groups.add("amine")
        elif zi in HALOGENS:
            for carbon in neighbors_with_z(i, 6, numbers, adjacency):
                if carbon in carbonyl_carbons:
                    continue
                # Avoid tagging aryl halides as alkyl halides: aromatic/sp2
                # carbon neighbors tend to have shorter C-C bonds than sp3 centers.
                short_cc = any(
                    int(numbers[n]) == 6 and bond_distance(carbon, n, positions) <= 1.42
                    for n in adjacency[carbon]
                )
                if not short_cc:
                    groups.add("alkyl-halide")

    return sorted(groups, key=lambda group: FUNCTIONAL_GROUP_RANK[group])


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
    functional_counts: Counter[str] = Counter()
    for i in range(n):
        rid = f"nval-{i}"
        formula = cols["chemical_formula_hill"][i] or cols["chemical_formula_reduced"][i] or ""
        elements = sorted(cols["elements"][i] or [])
        numbers = [int(z) for z in (cols["atomic_numbers"][i] or [])]
        positions = [[float(v) for v in pos] for pos in (cols["positions"][i] or [])]
        natoms = int(cols["nsites"][i] or len(numbers))
        gap = cols["electronic_band_gap"][i]
        energy = cols["energy"][i]
        src_id = cols["dataset_id"][i] or "omol25"
        functional_groups = functional_groups_for_structure(numbers, positions)
        functional_counts.update(functional_groups)

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
            "functionalGroups": functional_groups,
        })

    index_path = os.path.join(out_dir, "omol25_neutral_val.v3.json")
    functional_group_counts = [
        {"id": group, "count": functional_counts[group]}
        for group in FUNCTIONAL_GROUP_ORDER
        if functional_counts[group] > 0
    ]
    with open(index_path, "w", encoding="utf-8") as fh:
        json.dump(
            {
                "dataset": "OMol25",
                "split": split,
                "count": n,
                "indexVersion": 3,
                "functionalGroupMethod": "geometry-derived heuristic v1",
                "functionalGroupCounts": functional_group_counts,
                "structures": "structures/xyz/{id}.xyz",
                "records": records,
            },
            fh, separators=(",", ":"),
        )
    print(f"wrote {n} structures to {xyz_dir} and index to {index_path}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "unknown")
