from __future__ import annotations

import json

import mlip_state_phase_local_probe as probe


def test_state_phase_probe_builds_release_ready_diagnostic_manifest() -> None:
    manifest = probe.build_diagnostic_manifest(probe.load_json(probe.DEFAULT_SOURCE))
    validation = probe.validate_manifest(manifest)

    assert validation["release_ready"] is True
    assert manifest["fixture_id"] == probe.DEFAULT_FIXTURE_ID
    assert manifest["metadata"]["diagnostic_state_phase_labels"] is True
    assert manifest["metadata"]["not_for_physics_claims"] is True

    for row_id in probe.CANARY_ROWS:
        summary = probe.row_score_summary(manifest, row_id)
        coverage = summary["thermodynamic_condition_coverage"]
        assert summary["score"] == 1.0
        assert coverage["coverage_score"] == 1.0
        assert coverage["has_low_pressure"] is True
        assert coverage["has_high_pressure"] is True
        assert coverage["has_low_temperature"] is True
        assert coverage["has_high_temperature"] is True
        assert coverage["phase_count"] == 2


def test_state_phase_probe_writes_runner_compatible_checkpoint(tmp_path) -> None:
    manifest = probe.build_diagnostic_manifest(probe.load_json(probe.DEFAULT_SOURCE))
    checkpoint_path = tmp_path / "cell_checkpoint.json"

    checkpoint = probe.write_checkpoint(
        manifest,
        "forces",
        "chgnet",
        checkpoint_path,
        run_id="state-phase-local-probe",
        cell_id="state-phase-local-probe:diagnostic_reference:forces:chgnet",
    )
    payload = json.loads(checkpoint_path.read_text(encoding="utf-8"))

    assert checkpoint["prediction_count"] == 5
    assert payload["context"]["row_id"] == "forces"
    assert payload["context"]["mlip_id"] == "chgnet"
    assert payload["context"]["manifest_hash"] == probe.manifest_runtime_hash(manifest)
    assert len(payload["predictions"]) == 5
