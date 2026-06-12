"""Schema round-trip and boundary-validation tests for the benchmark contract."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from lupine_distill.schemas import BenchmarkMetrics, BenchmarkResult


def _metrics() -> BenchmarkMetrics:
    return BenchmarkMetrics(
        mae_energy=0.03,
        mae_forces=0.12,
        mae_stress=0.5,
        rmse_energy=0.045,
        energy_drift=0.02,
        temperature_stability=12.0,
        dft_reference={"energy_ev_per_atom": -3.75},
        wall_time_seconds=1.5,
        gpu_utilization_pct=80.0,
    )


def _result() -> BenchmarkResult:
    return BenchmarkResult(
        model_id="mace-mp-0",
        distill_version=0,
        backend="torchsim",
        timestamp=datetime(2026, 5, 29, 12, 0, 0, tzinfo=timezone.utc),
        torchsim_version="0.2.0",
        benchmark_suite_version="1.0.0",
        results={"static_energy": _metrics()},
        overall_uplift_pct=12.3,
        promotion_recommendation="promote",
    )


@pytest.mark.unit
def test_metrics_optional_fields_default_none() -> None:
    m = BenchmarkMetrics(wall_time_seconds=0.0)
    assert m.mae_energy is None
    assert m.energy_drift is None
    assert m.dft_reference is None
    assert m.gpu_utilization_pct is None


@pytest.mark.unit
def test_result_json_round_trip() -> None:
    original = _result()
    rebuilt = BenchmarkResult.model_validate_json(original.model_dump_json())
    assert rebuilt == original
    # dict round-trip too
    assert BenchmarkResult.model_validate(original.model_dump()) == original


@pytest.mark.unit
def test_models_are_frozen() -> None:
    m = _metrics()
    with pytest.raises(ValidationError):
        m.mae_energy = 0.0  # type: ignore[misc]
    r = _result()
    with pytest.raises(ValidationError):
        r.model_id = "other"  # type: ignore[misc]


@pytest.mark.unit
def test_invalid_backend_rejected() -> None:
    with pytest.raises(ValidationError):
        BenchmarkResult(
            model_id="m",
            distill_version=0,
            backend="quantum_espresso",  # type: ignore[arg-type]
            timestamp=datetime.now(timezone.utc),
            torchsim_version="x",
            benchmark_suite_version="1.0.0",
        )


@pytest.mark.unit
def test_negative_distill_version_rejected() -> None:
    with pytest.raises(ValidationError):
        BenchmarkResult(
            model_id="m",
            distill_version=-1,
            backend="ase",
            timestamp=datetime.now(timezone.utc),
            torchsim_version="x",
            benchmark_suite_version="1.0.0",
        )


@pytest.mark.unit
def test_gpu_utilization_out_of_range_rejected() -> None:
    with pytest.raises(ValidationError):
        BenchmarkMetrics(wall_time_seconds=1.0, gpu_utilization_pct=150.0)


@pytest.mark.unit
def test_negative_wall_time_rejected() -> None:
    with pytest.raises(ValidationError):
        BenchmarkMetrics(wall_time_seconds=-1.0)


@pytest.mark.unit
def test_extra_fields_forbidden() -> None:
    with pytest.raises(ValidationError):
        BenchmarkMetrics(wall_time_seconds=1.0, bogus_field=1)  # type: ignore[call-arg]


@pytest.mark.unit
def test_empty_model_id_rejected() -> None:
    with pytest.raises(ValidationError):
        BenchmarkResult(
            model_id="",
            distill_version=0,
            backend="torchsim",
            timestamp=datetime.now(timezone.utc),
            torchsim_version="x",
            benchmark_suite_version="1.0.0",
        )
