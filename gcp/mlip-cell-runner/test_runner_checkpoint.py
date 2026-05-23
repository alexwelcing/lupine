from __future__ import annotations

from mlip_cell_runner import CellCheckpoint, checkpoint_url_from_prefix


def context(**overrides):
    base = {
        "run_id": "run",
        "cell_id": "cell",
        "row_id": "forces",
        "mlip_id": "chgnet",
        "variant_id": "baseline",
        "distill_profile": "off",
        "manifest_hash": "sha256:abc",
    }
    base.update(overrides)
    return base


def test_checkpoint_url_defaults_under_artifact_prefix(tmp_path) -> None:
    assert checkpoint_url_from_prefix("gs://bucket/run/cell") == "gs://bucket/run/cell/cell_checkpoint.json"
    assert checkpoint_url_from_prefix(str(tmp_path / "cell")).endswith("cell_checkpoint.json")


def test_cell_checkpoint_round_trips_completed_predictions(tmp_path) -> None:
    path = tmp_path / "cell_checkpoint.json"
    case = {"structure_id": "Al-1", "symbols": ["Al"], "positions": [[0.0, 0.0, 0.0]]}
    prediction = {"structure_id": "Al-1", "energy_ev_per_atom": -3.5}

    first = CellCheckpoint(str(path), "read-write", **context())
    assert first.get_prediction("forces", 0, case) is None
    first.record_prediction("forces", 0, case, prediction)

    second = CellCheckpoint(str(path), "read-write", **context())

    assert second.get_prediction("forces", 0, case) == prediction
    assert second.summary()["loaded_predictions"] == 1
    assert second.summary()["stored_predictions"] == 1


def test_cell_checkpoint_ignores_stale_context(tmp_path) -> None:
    path = tmp_path / "cell_checkpoint.json"
    case = {"structure_id": "Al-1", "symbols": ["Al"], "positions": [[0.0, 0.0, 0.0]]}

    first = CellCheckpoint(str(path), "read-write", **context())
    first.record_prediction("forces", 0, case, {"structure_id": "Al-1"})

    stale = CellCheckpoint(str(path), "read-write", **context(manifest_hash="sha256:def"))

    assert stale.get_prediction("forces", 0, case) is None
    assert stale.summary()["ignored_reason"] == "checkpoint_context_mismatch"


def test_cell_checkpoint_reuses_raw_predictions_across_variants(tmp_path) -> None:
    path = tmp_path / "cell_checkpoint.json"
    case = {"structure_id": "Al-1", "symbols": ["Al"], "positions": [[0.0, 0.0, 0.0]]}
    prediction = {"structure_id": "Al-1", "forces_ev_per_angstrom": [[0.1, 0.0, 0.0]]}

    baseline = CellCheckpoint(str(path), "read-write", **context())
    baseline.record_prediction("forces", 0, case, prediction)

    distill = CellCheckpoint(
        str(path),
        "read-write",
        **context(
            run_id="run-v2",
            cell_id="distill:forces:chgnet",
            variant_id="distill_accuracy",
            distill_profile="accuracy",
        ),
    )

    assert distill.get_prediction("forces", 0, case) == prediction
    assert distill.summary()["loaded_predictions"] == 1
