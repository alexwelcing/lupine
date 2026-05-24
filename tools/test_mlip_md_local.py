from __future__ import annotations

import json
from pathlib import Path

import mlip_md_local


def test_local_relaxation_emits_equilibrium_trajectory(tmp_path: Path) -> None:
    output = tmp_path / "relax.json"
    rc = mlip_md_local.main([
        "--mode", "relax",
        "--mlip-id", "emt",
        "--element", "Al",
        "--crystal", "fcc",
        "--lattice-a", "4.05",
        "--steps", "3",
        "--log-interval", "1",
        "--output", str(output),
        "--run-id", "test-relax",
    ])

    payload = json.loads(output.read_text(encoding="utf-8"))

    assert rc == 0
    assert payload["schema"] == "lupine.mlip.equilibrium_trajectory.v1"
    assert payload["mlip_id"] == "emt"
    assert payload["material_id"] == "Al-fcc"
    assert len(payload["frames"]) >= 2
    assert payload["frames"][0]["step"] == 0
    assert "forces_ev_per_angstrom" in payload["frames"][-1]


def test_local_nve_emits_md_trajectory_with_energy_drift(tmp_path: Path) -> None:
    output = tmp_path / "nve.json"
    rc = mlip_md_local.main([
        "--mode", "nve",
        "--mlip-id", "emt",
        "--element", "Al",
        "--crystal", "fcc",
        "--lattice-a", "4.05",
        "--steps", "4",
        "--log-interval", "2",
        "--output", str(output),
        "--run-id", "test-nve",
    ])

    payload = json.loads(output.read_text(encoding="utf-8"))

    assert rc == 0
    assert payload["schema"] == "lupine.mlip.md_trajectory.v1"
    assert payload["ensemble"] == "nve"
    assert payload["diagnostics"]["frames"] == 3
    assert isinstance(payload["diagnostics"]["energy_drift_ev_per_atom"], float)
