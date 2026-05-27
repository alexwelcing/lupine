#!/usr/bin/env python3
"""Build a non-overlapping fcc Ni support manifest for Distill canaries.

This is support data, not the sealed evaluation fixture. It uses the same
Mishin-1999 EAM reference calculator as Lane A, but with distinct lattice
scales, strains, displacement seeds, and relaxation offsets so a paired
campaign can test material-family-aware corrections without replaying the
held-out structures.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import pathlib
from collections.abc import Iterable
from typing import Any

import numpy as np
from ase import Atoms
from ase.calculators.eam import EAM

import build_ni_publication_fixture as ni_fixture

DEFAULT_OUTPUT = (
    ni_fixture.ROOT
    / "gcp"
    / "mlip-cell-runner"
    / "fixtures"
    / "ni_fcc_eam_distill_support_v1.json"
)


def stable_bytes(payload: Any) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sha256_hex(payload: Any) -> str:
    return hashlib.sha256(stable_bytes(payload)).hexdigest()


def support_record(atoms: Atoms, *, structure_id: str, row_id: str, metadata: dict[str, Any]) -> dict[str, Any]:
    record = ni_fixture.atoms_record(
        atoms,
        structure_id=structure_id,
        row_id=row_id,
        metadata={
            **metadata,
            "support_role": "distill_calibration",
            "sealed_eval_overlap": "forbidden",
        },
    )
    record["material_id"] = "Ni-fcc-support"
    return record


def energy_volume_support_cases(refs: dict[str, float], calc: EAM) -> list[dict[str, Any]]:
    cases: list[dict[str, Any]] = []
    for scale in (0.965, 0.975, 0.985, 0.995, 1.005, 1.015, 1.025, 1.035):
        atoms = ni_fixture.fcc_ni(refs["a0"])
        atoms.set_cell(atoms.cell.array * scale, scale_atoms=True)
        case = support_record(
            atoms,
            structure_id=f"ni-fcc-support-energy-volume-scale-{scale:.3f}",
            row_id="energy_volume",
            metadata={
                "reference_generator": "Mishin-1999 NIST EAM via ASE EAM",
                "volume_scale": scale**3,
                "linear_cell_scale": scale,
                "publication_lane": "lane-a-fcc-ni-eam-home-turf",
                "support_split": "ni-material-family-v1",
            },
        )
        case["volume_scale"] = scale**3
        case["reference"] = ni_fixture.single_point_reference(atoms, calc)
        cases.append(case)
    return cases


def stress_support_cases(refs: dict[str, float], calc: EAM) -> list[dict[str, Any]]:
    base = ni_fixture.fcc_ni(refs["a0"])
    strains = [
        ("yy-pos", np.array([0.0, 0.0035, 0.0, 0.0, 0.0, 0.0])),
        ("zz-neg", np.array([0.0, 0.0, -0.0035, 0.0, 0.0, 0.0])),
        ("biaxial-pos", np.array([0.003, 0.003, 0.0, 0.0, 0.0, 0.0])),
        ("biaxial-neg", np.array([-0.003, -0.003, 0.0, 0.0, 0.0, 0.0])),
        ("yz-shear", np.array([0.0, 0.0, 0.0, 0.0045, 0.0, 0.0])),
        ("xz-shear", np.array([0.0, 0.0, 0.0, 0.0, -0.0045, 0.0])),
    ]
    cases: list[dict[str, Any]] = []
    for label, strain in strains:
        atoms = ni_fixture.apply_strain(base, strain)
        case = support_record(
            atoms,
            structure_id=f"ni-fcc-support-stress-{label}",
            row_id="stress",
            metadata={
                "reference_generator": "Mishin-1999 NIST EAM via ASE EAM",
                "publication_lane": "lane-a-fcc-ni-eam-home-turf",
                "support_split": "ni-material-family-v1",
            },
        )
        case["strain_voigt"] = strain.tolist()
        case["reference"] = ni_fixture.single_point_reference(atoms, calc)
        cases.append(case)
    return cases


def force_support_cases(refs: dict[str, float], calc: EAM) -> list[dict[str, Any]]:
    cases: list[dict[str, Any]] = []
    for seed, noise in ((211, 0.018), (223, 0.022), (227, 0.028), (229, 0.032), (233, 0.036)):
        rng = np.random.default_rng(seed)
        atoms = ni_fixture.fcc_ni(refs["a0"], repeat=(2, 2, 2))
        atoms.positions += rng.normal(0.0, noise, size=atoms.positions.shape)
        atoms.wrap()
        case = support_record(
            atoms,
            structure_id=f"ni-fcc-support-force-displaced-seed-{seed}",
            row_id="forces",
            metadata={
                "reference_generator": "Mishin-1999 NIST EAM via ASE EAM",
                "position_noise_angstrom": noise,
                "seed": seed,
                "publication_lane": "lane-a-fcc-ni-eam-home-turf",
                "support_split": "ni-material-family-v1",
            },
        )
        case["reference"] = ni_fixture.single_point_reference(atoms, calc)
        cases.append(case)
    return cases


def elastic_support_cases(refs: dict[str, float]) -> list[dict[str, Any]]:
    base = ni_fixture.fcc_ni(refs["a0"])
    modes: list[tuple[str, np.ndarray]] = []
    for strain_value in (0.0035, 0.0065):
        for mode_index, basis in enumerate(np.eye(6), start=1):
            label = f"mode{mode_index}-{strain_value:.4f}".replace(".", "p")
            modes.append((f"{label}-pos", basis * strain_value))
            modes.append((f"{label}-neg", basis * -strain_value))
    cases: list[dict[str, Any]] = []
    cij = {"C11": refs["c11"], "C12": refs["c12"], "C44": refs["c44"]}
    for label, strain in modes:
        atoms = ni_fixture.apply_strain(base, strain)
        case = support_record(
            atoms,
            structure_id=f"ni-fcc-support-elastic-{label}",
            row_id="elastic_constants",
            metadata={
                "reference_generator": "Ni literature/NIST cubic small-strain elastic constants",
                "elastic_reference_kind": "cubic_small_strain",
                "publication_lane": "lane-a-fcc-ni-eam-home-turf",
                "support_split": "ni-material-family-v1",
            },
        )
        case["strain_voigt"] = strain.tolist()
        case["reference"] = {
            "stress_gpa": ni_fixture.literature_stress_reference(refs, strain),
            "elastic_constants_gpa": cij,
        }
        cases.append(case)
    return cases


def relaxation_support_cases(refs: dict[str, float], calc: EAM) -> list[dict[str, Any]]:
    cases: list[dict[str, Any]] = []
    specs = [
        ("compressed-soft", 0.975, 307, 0.015),
        ("near-eq-medium", 1.005, 311, 0.030),
        ("expanded-hard", 1.025, 313, 0.035),
        ("compressed-hard", 0.985, 317, 0.045),
    ]
    for label, scale, seed, noise in specs:
        rng = np.random.default_rng(seed)
        atoms = ni_fixture.fcc_ni(refs["a0"], repeat=(2, 2, 2))
        atoms.set_cell(atoms.cell.array * scale, scale_atoms=True)
        atoms.positions += rng.normal(0.0, noise, size=atoms.positions.shape)
        atoms.wrap()
        case = support_record(
            atoms,
            structure_id=f"ni-fcc-support-equilibrium-solve-{label}",
            row_id="relaxation_stability",
            metadata={
                "reference_generator": "Mishin-1999 NIST EAM fixed-cell FIRE relaxation via ASE",
                "equilibrium_solve_case": True,
                "linear_cell_scale": scale,
                "position_noise_angstrom": noise,
                "seed": seed,
                "publication_lane": "lane-a-fcc-ni-eam-home-turf",
                "support_split": "ni-material-family-v1",
            },
        )
        case["reference"] = ni_fixture.relax_reference(atoms, calc, fmax=0.03, max_steps=250)
        cases.append(case)
    return cases


def build_support_manifest(source_packet: dict[str, Any]) -> dict[str, Any]:
    refs = ni_fixture.source_refs(source_packet)
    mishin = ni_fixture.primary_mishin_baseline(source_packet)
    potential_path = ni_fixture.ROOT / str(mishin["potential_file"]).replace("/", "\\")
    calc = EAM(potential=str(potential_path))

    row_fixtures = {
        "energy_volume": energy_volume_support_cases(refs, calc),
        "forces": force_support_cases(refs, calc),
        "stress": stress_support_cases(refs, calc),
        "elastic_constants": elastic_support_cases(refs),
        "relaxation_stability": relaxation_support_cases(refs, calc),
    }
    manifest: dict[str, Any] = {
        "schema": "lupine.mlip.fixture_manifest.v2",
        "fixture_id": "ni-fcc-eam-distill-support-v1",
        "title": "FCC Ni EAM Distill Support V1",
        "description": (
            "Non-overlapping fcc Ni support rows for material-family-aware Lupine Distill canaries. "
            "The held-out evaluation fixture remains ni-fcc-eam-home-turf-v1."
        ),
        "source_packet_id": source_packet["packet_id"],
        "created_at": source_packet.get("created_at", "2026-05-27T00:00:00Z"),
        "metadata": {
            "material_id": "Ni-fcc-support",
            "support_target_material_id": "Ni-fcc",
            "support_split": "ni-material-family-v1",
            "excluded_eval_fixture": "ni-fcc-eam-home-turf-v1",
            "reference_model_scope": "support-only EAM calibration rows; not a sealed evaluation fixture",
            "row_counts": {row_id: len(cases) for row_id, cases in row_fixtures.items()},
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
                "potential_file_sha256": ni_fixture.file_sha256(potential_path),
                "calculator": "ase.calculators.eam.EAM",
            },
            "elastic_constants": {
                "source": "nist_benchmark.csv / atlas-distill Ni reference table",
                "citation_keys": ["nist_ipr", "simmons1971"],
                "C11_gpa": refs["c11"],
                "C12_gpa": refs["c12"],
                "C44_gpa": refs["c44"],
            },
            "non_overlap": {
                "eval_fixture": "data/mlip_benchmarks/fixtures/ni_fcc_eam_home_turf_v1.json",
                "rule": "distinct structure_id plus distinct scale/seed/strain choices from the sealed evaluation fixture",
            },
        },
        "row_specs": copy.deepcopy(ni_fixture.build_fixture(source_packet)["row_specs"]),
        "row_fixtures": {row_id: {"structures": cases} for row_id, cases in row_fixtures.items()},
    }
    sealed = copy.deepcopy(manifest)
    sealed.pop("manifest_hash", None)
    manifest["manifest_hash"] = f"sha256:{sha256_hex(sealed)}"
    return manifest


def assert_non_overlap(support: dict[str, Any], eval_manifest: dict[str, Any]) -> None:
    support_ids = {
        str(case.get("structure_id"))
        for row in support["row_fixtures"].values()
        for case in row.get("structures", [])
    }
    eval_ids = {
        str(case.get("structure_id"))
        for row in eval_manifest["row_fixtures"].values()
        for case in row.get("structures", [])
    }
    overlap = sorted(support_ids & eval_ids)
    if overlap:
        raise ValueError("support overlaps sealed eval structure ids: " + ", ".join(overlap))


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-packet", type=pathlib.Path, default=ni_fixture.SOURCE_PACKET)
    parser.add_argument("--eval-fixture", type=pathlib.Path, default=ni_fixture.DEFAULT_OUTPUT)
    parser.add_argument("--output", type=pathlib.Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--check-only", action="store_true", help="Build and validate without writing output")
    args = parser.parse_args(list(argv) if argv is not None else None)

    source_packet = ni_fixture.load_source_packet(args.source_packet)
    support = build_support_manifest(source_packet)
    validation = ni_fixture.validate_manifest(support)
    if not validation["release_ready"]:
        raise SystemExit("support manifest is not release-ready: " + "; ".join(validation["blockers"]))
    eval_manifest = json.loads(args.eval_fixture.read_text(encoding="utf-8"))
    assert_non_overlap(support, eval_manifest)
    if not args.check_only:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(support, indent=2, sort_keys=True), encoding="utf-8")
    print(json.dumps({
        "schema": "lupine.mlip.ni_support_build_summary.v1",
        "fixture_id": support["fixture_id"],
        "manifest_hash": support["manifest_hash"],
        "output": None if args.check_only else str(args.output),
        "release_ready": validation["release_ready"],
        "row_counts": validation["row_counts"],
        "excluded_eval_fixture": support["metadata"]["excluded_eval_fixture"],
    }, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
