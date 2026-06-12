#!/usr/bin/env python3
"""Build the sealed fcc Ni EAM-home-turf publication fixture.

The fixture is intentionally honest about reference ownership:

- energy, forces, stress, and relaxation labels are generated from the local
  NIST Mishin-1999 Ni EAM potential, making Lane A a classical-home-turf
  competition surface;
- elastic constants are anchored to the existing Ni literature/NIST table
  values used by atlas-distill.

This is not the hard-lane DFT fixture. It is the fair classical baseline lane.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import pathlib
import sys
from collections.abc import Iterable
from typing import Any

import numpy as np
from ase import Atoms
from ase.build import bulk
from ase.calculators.eam import EAM
from ase.optimize import FIRE

from lupine_distill.fixture_contract import validate_manifest

ROOT = pathlib.Path(__file__).resolve().parents[1]

SOURCE_PACKET = ROOT / "data" / "mlip_benchmarks" / "manifest_sources.json"
DEFAULT_OUTPUT = ROOT / "data" / "mlip_benchmarks" / "fixtures" / "ni_fcc_eam_home_turf_v1.json"
EV_PER_A3_TO_GPA = 160.21766208


def stable_bytes(payload: Any) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")


def sha256_hex(payload: Any) -> str:
    return hashlib.sha256(stable_bytes(payload)).hexdigest()


def file_sha256(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_source_packet(path: pathlib.Path = SOURCE_PACKET) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise ValueError("source packet must be a JSON object")
    return payload


def source_refs(source_packet: dict[str, Any]) -> dict[str, float]:
    refs = source_packet["reference_values"]
    elastic = refs["ni_fcc_bulk_elastic_anchor"]["values"]
    lattice = refs["ni_fcc_lattice_anchor"]["values"]
    cohesive = refs["ni_fcc_cohesive_anchor"]["values"]
    return {
        "a0": float(lattice["a0_angstrom"]),
        "ecoh": float(cohesive["ecoh_ev_per_atom"]),
        "c11": float(elastic["c11_gpa"]),
        "c12": float(elastic["c12_gpa"]),
        "c44": float(elastic["c44_gpa"]),
    }


def primary_mishin_baseline(source_packet: dict[str, Any]) -> dict[str, Any]:
    for baseline in source_packet.get("local_ni_classical_inventory", []):
        if baseline.get("baseline_id") == "ni-mishin-1999-eam-alloy":
            return baseline
    raise ValueError("source packet is missing ni-mishin-1999-eam-alloy")


def atoms_record(atoms: Atoms, *, structure_id: str, row_id: str, metadata: dict[str, Any]) -> dict[str, Any]:
    return {
        "structure_id": structure_id,
        "material_id": "Ni-fcc",
        "row_id": row_id,
        "symbols": atoms.get_chemical_symbols(),
        "positions": np.asarray(atoms.positions, dtype=float).tolist(),
        "cell": np.asarray(atoms.cell.array, dtype=float).tolist(),
        "pbc": [True, True, True],
        "metadata": metadata,
    }


def stress_gpa(atoms: Atoms) -> list[float]:
    return (np.asarray(atoms.get_stress(voigt=True), dtype=float).reshape(-1) * EV_PER_A3_TO_GPA).tolist()


def single_point_reference(atoms: Atoms, calc: EAM) -> dict[str, Any]:
    atoms = atoms.copy()
    atoms.calc = calc
    return {
        "energy_ev_per_atom": float(atoms.get_potential_energy()) / max(len(atoms), 1),
        "forces_ev_per_angstrom": np.asarray(atoms.get_forces(), dtype=float).tolist(),
        "stress_gpa": stress_gpa(atoms),
    }


def fcc_ni(a0: float, *, repeat: tuple[int, int, int] = (1, 1, 1)) -> Atoms:
    return bulk("Ni", "fcc", a=a0, cubic=True).repeat(repeat)


def strain_matrix(strain_voigt: np.ndarray) -> np.ndarray:
    return np.array(
        [
            [strain_voigt[0], 0.5 * strain_voigt[5], 0.5 * strain_voigt[4]],
            [0.5 * strain_voigt[5], strain_voigt[1], 0.5 * strain_voigt[3]],
            [0.5 * strain_voigt[4], 0.5 * strain_voigt[3], strain_voigt[2]],
        ],
        dtype=float,
    )


def apply_strain(atoms: Atoms, strain_voigt: np.ndarray) -> Atoms:
    strained = atoms.copy()
    deformation = np.eye(3) + strain_matrix(strain_voigt)
    strained.set_cell(strained.cell.array @ deformation.T, scale_atoms=True)
    return strained


def cubic_stiffness(refs: dict[str, float]) -> np.ndarray:
    c11, c12, c44 = refs["c11"], refs["c12"], refs["c44"]
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


def literature_stress_reference(refs: dict[str, float], strain_voigt: np.ndarray) -> list[float]:
    return (cubic_stiffness(refs) @ strain_voigt).tolist()


def energy_volume_cases(refs: dict[str, float], calc: EAM) -> list[dict[str, Any]]:
    cases: list[dict[str, Any]] = []
    for scale in (0.98, 0.99, 1.0, 1.01, 1.02):
        atoms = fcc_ni(refs["a0"])
        atoms.set_cell(atoms.cell.array * scale, scale_atoms=True)
        case = atoms_record(
            atoms,
            structure_id=f"ni-fcc-mishin-energy-volume-scale-{scale:.3f}",
            row_id="energy_volume",
            metadata={
                "reference_generator": "Mishin-1999 NIST EAM via ASE EAM",
                "volume_scale": scale**3,
                "linear_cell_scale": scale,
                "publication_lane": "lane-a-fcc-ni-eam-home-turf",
            },
        )
        case["volume_scale"] = scale**3
        case["reference"] = single_point_reference(atoms, calc)
        cases.append(case)
    return cases


def stress_cases(refs: dict[str, float], calc: EAM) -> list[dict[str, Any]]:
    base = fcc_ni(refs["a0"])
    strains = [
        ("xx-pos", np.array([0.005, 0.0, 0.0, 0.0, 0.0, 0.0])),
        ("xx-neg", np.array([-0.005, 0.0, 0.0, 0.0, 0.0, 0.0])),
        ("hydro-pos", np.array([0.004, 0.004, 0.004, 0.0, 0.0, 0.0])),
        ("hydro-neg", np.array([-0.004, -0.004, -0.004, 0.0, 0.0, 0.0])),
        ("xy-shear", np.array([0.0, 0.0, 0.0, 0.0, 0.0, 0.006])),
    ]
    cases: list[dict[str, Any]] = []
    for label, strain in strains:
        atoms = apply_strain(base, strain)
        case = atoms_record(
            atoms,
            structure_id=f"ni-fcc-mishin-stress-{label}",
            row_id="stress",
            metadata={
                "reference_generator": "Mishin-1999 NIST EAM via ASE EAM",
                "publication_lane": "lane-a-fcc-ni-eam-home-turf",
            },
        )
        case["strain_voigt"] = strain.tolist()
        case["reference"] = single_point_reference(atoms, calc)
        cases.append(case)
    return cases


def force_cases(refs: dict[str, float], calc: EAM) -> list[dict[str, Any]]:
    cases: list[dict[str, Any]] = []
    for seed in (11, 17, 23, 31, 43):
        rng = np.random.default_rng(seed)
        atoms = fcc_ni(refs["a0"], repeat=(2, 2, 2))
        atoms.positions += rng.normal(0.0, 0.025, size=atoms.positions.shape)
        atoms.wrap()
        case = atoms_record(
            atoms,
            structure_id=f"ni-fcc-mishin-force-displaced-seed-{seed}",
            row_id="forces",
            metadata={
                "reference_generator": "Mishin-1999 NIST EAM via ASE EAM",
                "position_noise_angstrom": 0.025,
                "seed": seed,
                "publication_lane": "lane-a-fcc-ni-eam-home-turf",
            },
        )
        case["reference"] = single_point_reference(atoms, calc)
        cases.append(case)
    return cases


def elastic_cases(refs: dict[str, float]) -> list[dict[str, Any]]:
    base = fcc_ni(refs["a0"])
    modes: list[tuple[str, np.ndarray]] = [("zero", np.zeros(6, dtype=float))]
    for mode_index, basis in enumerate(np.eye(6), start=1):
        modes.append((f"mode{mode_index}-pos", basis * 0.005))
        modes.append((f"mode{mode_index}-neg", basis * -0.005))
    cases: list[dict[str, Any]] = []
    cij = {"C11": refs["c11"], "C12": refs["c12"], "C44": refs["c44"]}
    for label, strain in modes:
        atoms = apply_strain(base, strain)
        case = atoms_record(
            atoms,
            structure_id=f"ni-fcc-literature-elastic-{label}",
            row_id="elastic_constants",
            metadata={
                "reference_generator": "Ni literature/NIST cubic small-strain elastic constants",
                "elastic_reference_kind": "cubic_small_strain",
                "publication_lane": "lane-a-fcc-ni-eam-home-turf",
            },
        )
        case["strain_voigt"] = strain.tolist()
        case["reference"] = {
            "stress_gpa": literature_stress_reference(refs, strain),
            "elastic_constants_gpa": cij,
        }
        cases.append(case)
    return cases


def relax_reference(atoms: Atoms, calc: EAM, *, fmax: float, max_steps: int) -> dict[str, Any]:
    atoms = atoms.copy()
    atoms.calc = calc
    optimizer = FIRE(atoms, logfile=None)
    converged = bool(optimizer.run(fmax=fmax, steps=max_steps))
    forces = np.asarray(atoms.get_forces(), dtype=float)
    return {
        "relaxed_energy_ev_per_atom": float(atoms.get_potential_energy()) / max(len(atoms), 1),
        "relaxation_force_threshold": fmax,
        "reference_relaxation_converged": converged,
        "reference_relaxation_max_force_ev_per_angstrom": float(np.max(np.linalg.norm(forces, axis=1))),
        "reference_relaxed_cell": np.asarray(atoms.cell.array, dtype=float).tolist(),
        "reference_relaxed_positions": np.asarray(atoms.positions, dtype=float).tolist(),
    }


def relaxation_cases(refs: dict[str, float], calc: EAM) -> list[dict[str, Any]]:
    cases: list[dict[str, Any]] = []
    specs = [
        ("compressed-displaced", 0.99, 101, 0.020),
        ("expanded-displaced", 1.02, 103, 0.020),
        ("noisy-equilibrium", 1.00, 107, 0.040),
    ]
    for label, scale, seed, noise in specs:
        rng = np.random.default_rng(seed)
        atoms = fcc_ni(refs["a0"], repeat=(2, 2, 2))
        atoms.set_cell(atoms.cell.array * scale, scale_atoms=True)
        atoms.positions += rng.normal(0.0, noise, size=atoms.positions.shape)
        atoms.wrap()
        case = atoms_record(
            atoms,
            structure_id=f"ni-fcc-mishin-equilibrium-solve-{label}",
            row_id="relaxation_stability",
            metadata={
                "reference_generator": "Mishin-1999 NIST EAM fixed-cell FIRE relaxation via ASE",
                "equilibrium_solve_case": True,
                "linear_cell_scale": scale,
                "position_noise_angstrom": noise,
                "seed": seed,
                "publication_lane": "lane-a-fcc-ni-eam-home-turf",
            },
        )
        case["reference"] = relax_reference(atoms, calc, fmax=0.03, max_steps=250)
        cases.append(case)
    return cases


def build_fixture(source_packet: dict[str, Any]) -> dict[str, Any]:
    refs = source_refs(source_packet)
    mishin = primary_mishin_baseline(source_packet)
    potential_path = ROOT / str(mishin["potential_file"]).replace("/", "\\")
    calc = EAM(potential=str(potential_path))

    manifest: dict[str, Any] = {
        "schema": "lupine.mlip.fixture_manifest.v2",
        "fixture_id": "ni-fcc-eam-home-turf-v1",
        "title": "FCC Ni EAM-home-turf publication fixture V1",
        "description": (
            "Release-ready Lane A fixture for testing MLIPs against a strong Ni classical reference. "
            "Single-point energy/force/stress/relaxation labels are generated from NIST Mishin-1999 EAM; "
            "elastic constants are anchored to the existing Ni literature/NIST Cij table."
        ),
        "source_packet_id": source_packet["packet_id"],
        "created_at": source_packet.get("created_at", "2026-05-27T00:00:00Z"),
        "metadata": {
            "material_id": "Ni-fcc",
            "publication_lane": "lane-a-fcc-ni-eam-home-turf",
            "reference_model_scope": "EAM-home-turf classical reference for single-point rows; not a DFT hard-lane fixture.",
            "hard_lane_status": "pending MS25 or Li solid-ion-conductor label ingest",
            "surface_defect_compression_status": "pending exact reference-value ingest from open Ni benchmark sources",
        },
        "reference_provenance": {
            "source_packet": "data/mlip_benchmarks/manifest_sources.json",
            "eam_reference": {
                "baseline_id": mishin["baseline_id"],
                "label": mishin["label"],
                "nist_implementation_id": mishin["nist_implementation_id"],
                "pair_style": mishin["pair_style"],
                "doi": mishin["doi"],
                "potential_file": mishin["potential_file"],
                "potential_file_sha256": file_sha256(potential_path),
                "calculator": "ase.calculators.eam.EAM",
            },
            "elastic_constants": {
                "source": "nist_benchmark.csv / atlas-distill Ni reference table",
                "citation_keys": ["nist_ipr", "simmons1971"],
                "C11_gpa": refs["c11"],
                "C12_gpa": refs["c12"],
                "C44_gpa": refs["c44"],
            },
            "lattice_and_cohesive": {
                "a0_angstrom": refs["a0"],
                "ecoh_ev_per_atom": refs["ecoh"],
                "source": "data/mlip_benchmarks/manifest_sources.json reference anchors",
            },
        },
        "row_specs": {
            "energy_volume": {
                "min_cases": 5,
                "error_tolerance": 0.08,
                "error_unit": "ev_per_atom_mae_vs_mishin_eam",
                "reference_mode": "absolute_eam_energy",
            },
            "forces": {
                "min_cases": 5,
                "error_tolerance": 0.20,
                "error_unit": "ev_per_angstrom_rmse_vs_mishin_eam",
            },
            "stress": {
                "min_cases": 5,
                "error_tolerance": 5.0,
                "error_unit": "gpa_mae_vs_mishin_eam",
            },
            "elastic_constants": {
                "min_cases": 13,
                "error_tolerance": 35.0,
                "error_unit": "gpa_mae_vs_literature_cij",
            },
            "relaxation_stability": {
                "min_cases": 3,
                "error_tolerance": 0.08,
                "error_unit": "fixed_cell_relaxation_penalty_vs_mishin_eam",
                "force_threshold": 0.03,
                "max_steps": 250,
            },
        },
        "row_fixtures": {},
    }
    row_fixtures = {
        "energy_volume": energy_volume_cases(refs, calc),
        "forces": force_cases(refs, calc),
        "stress": stress_cases(refs, calc),
        "elastic_constants": elastic_cases(refs),
        "relaxation_stability": relaxation_cases(refs, calc),
    }
    manifest["row_fixtures"] = {
        row_id: {"structures": cases}
        for row_id, cases in row_fixtures.items()
    }
    manifest["metadata"]["row_counts"] = {row_id: len(cases) for row_id, cases in row_fixtures.items()}
    sealed = copy.deepcopy(manifest)
    sealed.pop("manifest_hash", None)
    manifest["manifest_hash"] = f"sha256:{sha256_hex(sealed)}"
    return manifest


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-packet", type=pathlib.Path, default=SOURCE_PACKET)
    parser.add_argument("--output", type=pathlib.Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--check-only", action="store_true", help="Build and validate without writing output")
    args = parser.parse_args(list(argv) if argv is not None else None)

    source_packet = load_source_packet(args.source_packet)
    manifest = build_fixture(source_packet)
    validation = validate_manifest(manifest)
    if not validation["release_ready"]:
        raise SystemExit("fixture is not release-ready: " + "; ".join(validation["blockers"]))
    if not args.check_only:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8")
    print(json.dumps({
        "schema": "lupine.mlip.fixture_build_summary.v1",
        "fixture_id": manifest["fixture_id"],
        "manifest_hash": manifest["manifest_hash"],
        "output": None if args.check_only else str(args.output),
        "release_ready": validation["release_ready"],
        "row_counts": validation["row_counts"],
    }, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
