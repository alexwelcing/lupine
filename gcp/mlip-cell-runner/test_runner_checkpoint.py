from __future__ import annotations

import json

import mlip_cell_runner as runner
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
    assert second.missing_predictions("forces", [case]) == []


def test_cell_checkpoint_ignores_stale_context(tmp_path) -> None:
    path = tmp_path / "cell_checkpoint.json"
    case = {"structure_id": "Al-1", "symbols": ["Al"], "positions": [[0.0, 0.0, 0.0]]}

    first = CellCheckpoint(str(path), "read-write", **context())
    first.record_prediction("forces", 0, case, {"structure_id": "Al-1"})

    stale = CellCheckpoint(str(path), "read-write", **context(manifest_hash="sha256:def"))

    assert stale.get_prediction("forces", 0, case) is None
    assert stale.summary()["ignored_reason"] == "checkpoint_context_mismatch"


def test_cell_checkpoint_reports_missing_predictions(tmp_path) -> None:
    path = tmp_path / "cell_checkpoint.json"
    checkpoint = CellCheckpoint(str(path), "read-write", **context())
    cases = [
        {"structure_id": "Al-1", "symbols": ["Al"], "positions": [[0.0, 0.0, 0.0]]},
        {"structure_id": "Al-2", "symbols": ["Al"], "positions": [[0.0, 0.0, 0.0]]},
    ]
    checkpoint.record_prediction("forces", 0, cases[0], {"structure_id": "Al-1"})

    missing = checkpoint.missing_predictions("forces", cases)

    assert len(missing) == 1
    assert missing[0]["case_index"] == 1
    assert missing[0]["structure_id"] == "Al-2"


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


def test_checkpoint_only_replay_skips_backend_import(tmp_path, monkeypatch) -> None:
    case = {
        "structure_id": "Al-one",
        "symbols": ["Al"],
        "positions": [[0.0, 0.0, 0.0]],
        "cell": [[4.0, 0.0, 0.0], [0.0, 4.0, 0.0], [0.0, 0.0, 4.0]],
        "pbc": True,
        "reference": {"energy_ev_per_atom": -3.0},
    }
    manifest = {
        "schema": "lupine.mlip.fixture_manifest.v2",
        "fixture_id": "checkpoint-only-replay-test",
        "reference_provenance": {"source": "unit-test"},
        "row_specs": {
            "elastic_constants": {"min_cases": 0},
            "energy_volume": {"min_cases": 1, "error_tolerance": 1.0},
            "forces": {"min_cases": 0},
            "stress": {"min_cases": 0},
            "relaxation_stability": {"min_cases": 0},
        },
        "row_fixtures": {"energy_volume": {"structures": [case]}},
    }
    manifest_path = tmp_path / "manifest.json"
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
    manifest_hash = "sha256:" + runner.sha256_hex(manifest)
    checkpoint_path = tmp_path / "cell_checkpoint.json"
    checkpoint = CellCheckpoint(
        str(checkpoint_path),
        "read-write",
        **context(
            row_id="energy_volume",
            cell_id="producer",
            manifest_hash=manifest_hash,
        ),
    )
    checkpoint.record_prediction(
        "energy_volume",
        0,
        case,
        {
            "structure_id": "Al-one",
            "energy_ev_per_atom": -3.0,
            "reference": {"energy_ev_per_atom": -3.0},
        },
    )
    checkpoint.flush(force=True)
    monkeypatch.setattr(
        runner,
        "load_calculator",
        lambda _mlip_id: (_ for _ in ()).throw(AssertionError("backend import should be skipped")),
    )
    args = runner.parse_args([
        "run-cell",
        "--run-id",
        "run",
        "--cell-id",
        "consumer",
        "--row-id",
        "energy_volume",
        "--mlip-id",
        "chgnet",
        "--artifact-prefix",
        str(tmp_path / "artifacts"),
        "--manifest-url",
        str(manifest_path),
        "--checkpoint-mode",
        "read-only",
        "--checkpoint-url",
        str(checkpoint_path),
        "--checkpoint-only-replay",
    ])

    result = runner.run_cell(args)

    assert result.metrics["accuracy"]["score"] == 1.0
    assert result.metrics["execution"]["checkpoint_only_replay"] is True
    assert result.metrics["speed"]["model_load_ms"] == 0
    assert result.metrics["checkpoint"]["loaded_predictions"] == 1


def test_gcs_checkpoint_buffers_rapid_prediction_writes(monkeypatch) -> None:
    writes = []
    case = {"structure_id": "Al-1", "symbols": ["Al"], "positions": [[0.0, 0.0, 0.0]]}
    checkpoint = CellCheckpoint("gs://bucket/cell_checkpoint.json", "write-only", **context())

    def fake_write_url(url, data, content_type="application/octet-stream"):
        writes.append((url, data, content_type))
        return url

    monkeypatch.setattr(runner, "write_url", fake_write_url)

    checkpoint.record_prediction("forces", 0, case, {"structure_id": "Al-1"})
    checkpoint.record_prediction("forces", 1, {**case, "structure_id": "Al-2"}, {"structure_id": "Al-2"})

    assert writes == []
    assert checkpoint.summary()["pending_flush_predictions"] == 2

    checkpoint.flush(force=True)

    assert len(writes) == 1
    assert checkpoint.summary()["pending_flush_predictions"] == 0
    assert checkpoint.summary()["flush_count"] == 1


def test_request_with_retry_retries_transient_http(monkeypatch) -> None:
    calls = []

    class Response:
        def __init__(self, status_code: int) -> None:
            self.status_code = status_code

    def fake_request(method, url, **kwargs):
        calls.append((method, url, kwargs))
        return Response(429 if len(calls) == 1 else 200)

    monkeypatch.setattr(runner.requests, "request", fake_request)
    monkeypatch.setattr(runner.time, "sleep", lambda _seconds: None)

    response = runner.request_with_retry("GET", "https://example.test/object", timeout=1)

    assert response.status_code == 200
    assert len(calls) == 2
