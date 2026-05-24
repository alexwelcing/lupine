#!/usr/bin/env python3
"""Build the canonical V2 MLIP baseline fixture from public reference data.

This is intentionally a fixture builder, not a one-off JSON blob. It samples a
small held-out slice from the public MPtrj Hugging Face mirror for DFT
energies, forces, stresses, and relaxation targets, then adds cubic finite-
strain elastic cases from the literature table already used by the IMMI elastic
pipeline.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

import numpy as np
import requests
from ase.build import bulk
from ase.data import chemical_symbols

DATASET_SERVER = "https://datasets-server.huggingface.co"
MPTRJ_DATASET = "nimashoghi/mptrj"
MPTRJ_CONFIG = "default"
MPTRJ_SPLIT = "test"
EV_PER_A3_TO_GPA = 160.21766208

ELASTIC_REFERENCES = {
    "Al": {"structure": "fcc", "a0": 4.05, "C11": 107.0, "C12": 60.9, "C44": 28.3},
    "Cu": {"structure": "fcc", "a0": 3.61, "C11": 169.0, "C12": 122.0, "C44": 75.3},
    "Mo": {"structure": "bcc", "a0": 3.15, "C11": 463.7, "C12": 157.8, "C44": 109.2},
}


def finite_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and np.isfinite(float(value))


def voigt_from_matrix(matrix: list[list[float]]) -> list[float]:
    arr = np.asarray(matrix, dtype=float)
    return [
        float(arr[0, 0]),
        float(arr[1, 1]),
        float(arr[2, 2]),
        float(arr[1, 2]),
        float(arr[0, 2]),
        float(arr[0, 1]),
    ]


def max_force(row: dict[str, Any]) -> float:
    forces = np.asarray(row.get("forces"), dtype=float)
    return float(np.max(np.linalg.norm(forces, axis=1))) if forces.size else 0.0


def stress_norm(row: dict[str, Any]) -> float:
    stress = np.asarray(row.get("stress"), dtype=float)
    return float(np.linalg.norm(stress)) if stress.size else 0.0


def valid_mptrj_row(row: dict[str, Any], max_atoms: int) -> bool:
    return (
        isinstance(row.get("numbers"), list)
        and isinstance(row.get("positions"), list)
        and isinstance(row.get("forces"), list)
        and isinstance(row.get("cell"), list)
        and isinstance(row.get("stress"), list)
        and finite_number(row.get("energy_per_atom"))
        and int(row.get("num_atoms", max_atoms + 1)) <= max_atoms
    )


def fetch_mptrj_candidates(max_rows: int, max_atoms: int) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    offset = 0
    while len(rows) < max_rows and offset < 5000:
        response = requests.get(
            f"{DATASET_SERVER}/rows",
            params={
                "dataset": MPTRJ_DATASET,
                "config": MPTRJ_CONFIG,
                "split": MPTRJ_SPLIT,
                "offset": offset,
                "length": 100,
            },
            timeout=60,
        )
        response.raise_for_status()
        payload = response.json()
        for item in payload.get("rows", []):
            row = item.get("row", {})
            if valid_mptrj_row(row, max_atoms):
                rows.append(row)
        if not payload.get("rows"):
            break
        offset += 100
    if len(rows) < max_rows:
        raise RuntimeError(f"Only found {len(rows)} MPtrj rows under max_atoms={max_atoms}")
    return rows


def mptrj_record(row: dict[str, Any], row_id: str, index: int) -> dict[str, Any]:
    symbols = [chemical_symbols[int(number)] for number in row["numbers"]]
    record = {
        "structure_id": f"mptrj-{row['task_id']}-step{row['ionic_step']}-{row_id}-{index}",
        "material_id": row.get("mp_id"),
        "task_id": row.get("task_id"),
        "calc_id": row.get("calc_id"),
        "ionic_step": row.get("ionic_step"),
        "row_id": row_id,
        "symbols": symbols,
        "positions": row["positions"],
        "cell": row["cell"],
        "pbc": row.get("pbc", [True, True, True]),
        "metadata": {
            "source_dataset": MPTRJ_DATASET,
            "source_split": MPTRJ_SPLIT,
            "num_atoms": row.get("num_atoms"),
            "max_force_ev_per_angstrom": max_force(row),
            "stress_frobenius": stress_norm(row),
        },
        "reference": {
            "energy_ev_per_atom": float(row["energy_per_atom"]),
            "forces_ev_per_angstrom": row["forces"],
            "stress_gpa": [value * EV_PER_A3_TO_GPA for value in voigt_from_matrix(row["stress"])],
            "relaxed_energy_ev_per_atom": float(row.get("e_per_atom_relaxed", row["energy_per_atom"])),
            "relaxation_force_threshold": 0.05,
        },
    }
    if finite_number(row.get("corrected_total_energy")):
        record["reference"]["corrected_total_energy_ev"] = float(row["corrected_total_energy"])
    return record


def cubic_stiffness(ref: dict[str, float]) -> np.ndarray:
    c11, c12, c44 = ref["C11"], ref["C12"], ref["C44"]
    return np.array(
        [
            [c11, c12, c12, 0.0, 0.0, 0.0],
            [c12, c11, c12, 0.0, 0.0, 0.0],
            [c12, c12, c11, 0.0, 0.0, 0.0],
            [0.0, 0.0, 0.0, c44, 0.0, 0.0],
            [0.0, 0.0, 0.0, 0.0, c44, 0.0],
            [0.0, 0.0, 0.0, 0.0, 0.0, c44],
        ],
        dtype=float,
    )


def strain_matrix(strain_voigt: np.ndarray) -> np.ndarray:
    return np.array(
        [
            [strain_voigt[0], 0.5 * strain_voigt[5], 0.5 * strain_voigt[4]],
            [0.5 * strain_voigt[5], strain_voigt[1], 0.5 * strain_voigt[3]],
            [0.5 * strain_voigt[4], 0.5 * strain_voigt[3], strain_voigt[2]],
        ],
        dtype=float,
    )


def elastic_cases() -> list[dict[str, Any]]:
    cases: list[dict[str, Any]] = []
    modes: list[tuple[str, np.ndarray]] = [("zero", np.zeros(6, dtype=float))]
    for mode_index, basis in enumerate(np.eye(6), start=1):
        modes.append((f"mode{mode_index}-pos", basis * 0.005))
        modes.append((f"mode{mode_index}-neg", basis * -0.005))
    for element, ref in ELASTIC_REFERENCES.items():
        atoms0 = bulk(element, ref["structure"], a=ref["a0"], cubic=True)
        cmat = cubic_stiffness(ref)
        cij = {"C11": ref["C11"], "C12": ref["C12"], "C44": ref["C44"]}
        for mode_label, strain_voigt in modes:
            atoms = atoms0.copy()
            deformation = np.eye(3) + strain_matrix(strain_voigt)
            atoms.set_cell(atoms.cell.array @ deformation.T, scale_atoms=True)
            stress = cmat @ strain_voigt
            cases.append(
                {
                    "structure_id": f"literature-elastic-{element}-{mode_label}",
                    "material_id": element,
                    "row_id": "elastic_constants",
                    "symbols": atoms.get_chemical_symbols(),
                    "positions": np.asarray(atoms.positions, dtype=float).tolist(),
                    "cell": np.asarray(atoms.cell.array, dtype=float).tolist(),
                    "pbc": [True, True, True],
                    "strain_voigt": strain_voigt.tolist(),
                    "metadata": {
                        "source": "Simmons and Wang 1971 / Materials Project table encoded in mlip_immi",
                        "elastic_reference_kind": "cubic_small_strain",
                    },
                    "reference": {
                        "stress_gpa": stress.tolist(),
                        "elastic_constants_gpa": cij,
                    },
                }
            )
    return cases


def select_distinct(rows: list[dict[str, Any]], count: int, key: str) -> list[dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    seen: set[Any] = set()
    for row in rows:
        marker = row.get(key)
        if marker in seen:
            continue
        seen.add(marker)
        selected.append(row)
        if len(selected) >= count:
            return selected
    return rows[:count]


def build_manifest(max_atoms: int) -> dict[str, Any]:
    candidates = fetch_mptrj_candidates(max_rows=200, max_atoms=max_atoms)
    force_rows = [row for row in candidates if max_force(row) > 0.05]
    stress_rows = [row for row in candidates if stress_norm(row) > 0.05]
    if len(force_rows) < 5 or len(stress_rows) < 5:
        raise RuntimeError("Not enough non-degenerate force/stress MPtrj rows")

    energy_rows = select_distinct(candidates, 5, "mp_id")
    force_rows = select_distinct(force_rows, 5, "task_id")
    stress_rows = select_distinct(stress_rows, 5, "task_id")
    relaxation_rows = select_distinct(force_rows + candidates, 3, "mp_id")

    manifest = {
        "schema": "lupine.mlip.fixture_manifest.v2",
        "fixture_id": "canonical-structures-v2",
        "title": "Canonical MLIP baseline V2 held-out fixture",
        "description": (
            "Small release baseline fixture with real DFT trajectory labels from MPtrj "
            "and literature cubic elastic constants for finite-strain Cij evaluation."
        ),
        "reference_provenance": {
            "mptrj": {
                "dataset": MPTRJ_DATASET,
                "config": MPTRJ_CONFIG,
                "split": MPTRJ_SPLIT,
                "via": "Hugging Face Dataset Viewer rows API",
                "materials_project_docs": "https://docs.materialsproject.org/services/ml-and-ai-applications/mptrj",
                "figshare": "https://figshare.com/articles/dataset/Materials_Project_Trjectory_MPtrj_Dataset/23713842",
                "notes": "MPtrj collates Materials Project ionic-step energies, forces, stresses, and structures.",
            },
            "elastic_constants": {
                "source": "Simmons and Wang 1971 / Materials Project values encoded in mlip_immi/elastic_constants.py",
                "elements": sorted(ELASTIC_REFERENCES),
            },
        },
        "row_specs": {
            "energy_volume": {
                "min_cases": 5,
                "error_tolerance": 0.10,
                "error_unit": "ev_per_atom_mae",
            },
            "forces": {
                "min_cases": 5,
                "error_tolerance": 0.20,
                "error_unit": "ev_per_angstrom_rmse",
            },
            "stress": {
                "min_cases": 5,
                "error_tolerance": 5.0,
                "error_unit": "gpa_mae",
            },
            "elastic_constants": {
                "min_cases": 6,
                "error_tolerance": 50.0,
                "error_unit": "gpa_mae",
            },
            "relaxation_stability": {
                "min_cases": 3,
                "force_threshold": 0.05,
                "max_steps": 200,
                "error_tolerance": 0.10,
                "error_unit": "relaxation_penalty",
            },
        },
        "row_fixtures": {
            "energy_volume": {
                "structures": [mptrj_record(row, "energy_volume", idx) for idx, row in enumerate(energy_rows)],
            },
            "forces": {
                "structures": [mptrj_record(row, "forces", idx) for idx, row in enumerate(force_rows)],
            },
            "stress": {
                "structures": [mptrj_record(row, "stress", idx) for idx, row in enumerate(stress_rows)],
            },
            "elastic_constants": {
                "structures": elastic_cases(),
            },
            "relaxation_stability": {
                "structures": [
                    mptrj_record(row, "relaxation_stability", idx)
                    for idx, row in enumerate(relaxation_rows)
                ],
            },
        },
    }
    structure_count = sum(len(group["structures"]) for group in manifest["row_fixtures"].values())
    manifest["metadata"] = {
        "structure_count": structure_count,
        "heldout_split": MPTRJ_SPLIT,
        "max_atoms": max_atoms,
    }
    canonical = json.dumps(manifest, sort_keys=True, separators=(",", ":")).encode("utf-8")
    manifest["manifest_hash"] = "sha256:" + hashlib.sha256(canonical).hexdigest()
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        default="gcp/mlip-cell-runner/fixtures/canonical_structures_v2_mptrj.json",
    )
    parser.add_argument("--max-atoms", type=int, default=80)
    args = parser.parse_args()

    manifest = build_manifest(args.max_atoms)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8")
    print(output)
    print(json.dumps({
        "fixture_id": manifest["fixture_id"],
        "manifest_hash": manifest["manifest_hash"],
        "row_counts": {
            row_id: len(group["structures"])
            for row_id, group in manifest["row_fixtures"].items()
        },
    }, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
