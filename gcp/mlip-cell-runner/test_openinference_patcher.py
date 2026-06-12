from __future__ import annotations

import os
from unittest.mock import MagicMock, patch

import pytest

from src.openinference_patcher import MLIPRunPatcher, PatcherConfig


def test_patcher_config_direct_endpoint_requires_enabled() -> None:
    env = {
        "LUPINE_OTEL_ENABLED": "1",
        "OTEL_EXPORTER_OTLP_ENDPOINT": "https://phoenix.example.com/v1/traces",
    }
    cfg = PatcherConfig.from_env(env)
    assert cfg.enabled is True
    assert cfg.endpoint == "https://phoenix.example.com/v1/traces"
    assert cfg.active is True


def test_patcher_config_relay_takes_precedence() -> None:
    env = {
        "LUPINE_OTEL_ENABLED": "true",
        "PHOENIX_OTLP_RELAY_URL": "https://relay.example.com",
        "PHOENIX_RELAY_TOKEN": "secret-token",
    }
    cfg = PatcherConfig.from_env(env)
    assert cfg.relay_url == "https://relay.example.com"
    assert cfg.relay_token == "secret-token"
    assert cfg.active is True


def test_patcher_config_disabled_by_default() -> None:
    env = {
        "OTEL_EXPORTER_OTLP_ENDPOINT": "https://phoenix.example.com/v1/traces",
    }
    cfg = PatcherConfig.from_env(env)
    assert cfg.enabled is False
    assert cfg.active is False


def test_patcher_config_relay_without_token_is_inactive() -> None:
    env = {
        "LUPINE_OTEL_ENABLED": "1",
        "PHOENIX_OTLP_RELAY_URL": "https://relay.example.com",
    }
    cfg = PatcherConfig.from_env(env)
    assert cfg.active is False


def test_emit_benchmark_span_noop_when_inactive() -> None:
    patcher = MLIPRunPatcher(config=PatcherConfig.from_env({}))
    assert patcher.emit_benchmark_span(backend="mace", system="energy", suite="baseline") is False


def test_emit_benchmark_span_noop_without_otel(monkeypatch: pytest.MonkeyPatch) -> None:
    """If opentelemetry is missing, emit degrades to a logged no-op."""
    patcher = MLIPRunPatcher(
        config=PatcherConfig.from_env({"LUPINE_OTEL_ENABLED": "1", "OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost"})
    )
    monkeypatch.setattr(patcher, "_otel_unavailable", True)
    assert patcher.emit_benchmark_span(backend="mace", system="energy", suite="baseline") is False


def test_emit_telemetry_maps_runner_metrics_to_patcher() -> None:
    import mlip_cell_runner as runner

    mock_patcher = MagicMock()
    mock_patcher.emit_benchmark_span.return_value = True

    metrics = {
        "run_id": "r1",
        "campaign_id": "c1",
        "cell_id": "cell-1",
        "row_id": "energy_volume",
        "mlip_id": "mace-mp-0",
        "variant_id": "distill_accuracy",
        "distill_profile": "accuracy",
        "ribbon_version": "hyperribbon-v1",
        "manifest_hash": "sha256:abc",
        "trace_id": "trace-123",
        "span_id": "span-456",
        "accuracy": {"score": 0.95, "unit": "mae", "mae_energy": 0.002},
        "speed": {"score": 12.5, "unit": "structures_per_second"},
        "row_metrics": {"mae_energy": 0.002, "mae_forces": 0.05},
        "execution": {"warm_inference_seconds": 42.0},
    }

    with patch.object(runner, "_TELEMETRY_PATCHER", mock_patcher):
        emitted = runner.emit_telemetry(metrics)

    assert emitted is True
    mock_patcher.emit_benchmark_span.assert_called_once()
    call = mock_patcher.emit_benchmark_span.call_args
    assert call.kwargs["backend"] == "mace-mp-0"
    assert call.kwargs["system"] == "energy_volume"
    assert call.kwargs["suite"] == "distill_accuracy"
    assert call.kwargs["mae_energy"] == 0.002
    assert call.kwargs["mae_forces"] == 0.05
    assert call.kwargs["wall_time_s"] == 42.0
    assert call.kwargs["run_id"] == "r1"
    extra = call.kwargs["extra_attributes"]
    assert extra["lupine.cell_id"] == "cell-1"
    assert extra["lupine.phoenix.trace_id"] == "trace-123"
    assert extra["lupine.phoenix.span_id"] == "span-456"


def test_emit_telemetry_returns_false_when_patcher_unavailable() -> None:
    import mlip_cell_runner as runner

    with patch.object(runner, "_TELEMETRY_PATCHER", None):
        assert runner.emit_telemetry({}) is False
