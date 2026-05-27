from __future__ import annotations

import json
from pathlib import Path

import build_ni_publication_fixture as builder


def test_build_ni_fixture_is_release_ready() -> None:
    source_packet = builder.load_source_packet()
    manifest = builder.build_fixture(source_packet)
    validation = builder.validate_manifest(manifest)

    assert manifest["schema"] == "lupine.mlip.fixture_manifest.v2"
    assert manifest["fixture_id"] == "ni-fcc-eam-home-turf-v1"
    assert validation["release_ready"] is True
    assert validation["row_counts"] == {
        "elastic_constants": 13,
        "energy_volume": 5,
        "forces": 5,
        "stress": 5,
        "relaxation_stability": 3,
    }


def test_force_cases_have_nonzero_eam_reference_forces() -> None:
    manifest = builder.build_fixture(builder.load_source_packet())
    force_cases = manifest["row_fixtures"]["forces"]["structures"]

    assert len(force_cases) == 5
    assert all(case["reference"]["forces_ev_per_angstrom"] for case in force_cases)
    assert any(
        abs(component) > 1e-5
        for case in force_cases
        for force in case["reference"]["forces_ev_per_angstrom"]
        for component in force
    )


def test_cli_writes_fixture(tmp_path: Path) -> None:
    output = tmp_path / "ni_fixture.json"
    rc = builder.main(["--output", str(output)])
    payload = json.loads(output.read_text(encoding="utf-8"))

    assert rc == 0
    assert payload["manifest_hash"].startswith("sha256:")
    assert payload["metadata"]["reference_model_scope"].startswith("EAM-home-turf")
