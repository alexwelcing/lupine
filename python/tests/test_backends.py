"""Backend tests: MockBackend determinism + TorchSim import-safety/fallback.

These tests MUST pass without torch_sim installed and without a GPU.
"""

from __future__ import annotations

import sys

import pytest

from lupine_distill.backends.mock import MockBenchmarkBackend
from lupine_distill.backends.torchsim import (
    TorchSimBenchmarkBackend,
    TorchSimUnavailable,
    torchsim_available,
    try_build_torchsim_backend,
)
from lupine_distill.runner import build_backend, run_suite
from lupine_distill.suite import BENCHMARK_SUITE, BENCHMARK_WEIGHTS

_SYSTEM = {"formula": "Cu", "n_atoms": 4, "pbc": True}


@pytest.mark.unit
def test_mock_is_deterministic_across_instances() -> None:
    a = MockBenchmarkBackend(model_id="m", distill_version=2)
    b = MockBenchmarkBackend(model_id="m", distill_version=2)
    for bench in BENCHMARK_SUITE:
        assert a.run(_SYSTEM, bench) == b.run(_SYSTEM, bench)


@pytest.mark.unit
def test_mock_repeated_call_is_stable() -> None:
    backend = MockBenchmarkBackend(model_id="m", distill_version=0)
    first = backend.run(_SYSTEM, "nvt_md_300k")
    second = backend.run(_SYSTEM, "nvt_md_300k")
    assert first == second


@pytest.mark.unit
def test_mock_only_populates_weighted_metrics() -> None:
    backend = MockBenchmarkBackend(model_id="m", distill_version=0)
    for bench in BENCHMARK_SUITE:
        metrics = backend.run(_SYSTEM, bench)
        weighted = set(BENCHMARK_WEIGHTS[bench])
        for metric in ("mae_energy", "mae_forces", "mae_stress", "energy_drift", "temperature_stability"):
            value = getattr(metrics, metric)
            if metric in weighted:
                assert value is not None, f"{bench}.{metric} should be populated"
            else:
                assert value is None, f"{bench}.{metric} should be None"
        assert metrics.wall_time_seconds >= 0.0


@pytest.mark.unit
def test_mock_higher_version_reduces_error_monotonically() -> None:
    v0 = MockBenchmarkBackend(model_id="m", distill_version=0).run(_SYSTEM, "static_energy")
    v1 = MockBenchmarkBackend(model_id="m", distill_version=1).run(_SYSTEM, "static_energy")
    v2 = MockBenchmarkBackend(model_id="m", distill_version=2).run(_SYSTEM, "static_energy")
    assert v0.mae_energy is not None and v1.mae_energy is not None and v2.mae_energy is not None
    assert v0.mae_energy > v1.mae_energy > v2.mae_energy


@pytest.mark.unit
def test_mock_distinct_systems_differ() -> None:
    backend = MockBenchmarkBackend(model_id="m", distill_version=0)
    a = backend.run({"formula": "Cu", "n_atoms": 4}, "static_energy")
    b = backend.run({"formula": "Al", "n_atoms": 8}, "static_energy")
    assert a.mae_energy != b.mae_energy


@pytest.mark.unit
def test_mock_unknown_benchmark_raises() -> None:
    backend = MockBenchmarkBackend(model_id="m")
    with pytest.raises(ValueError):
        backend.run(_SYSTEM, "does_not_exist")


@pytest.mark.unit
def test_mock_negative_improvement_rejected() -> None:
    with pytest.raises(ValueError):
        MockBenchmarkBackend(model_id="m", improvement_per_version=-0.1)


@pytest.mark.unit
def test_mock_does_not_mutate_system() -> None:
    system = {"formula": "Cu", "n_atoms": 4, "pbc": True}
    snapshot = dict(system)
    MockBenchmarkBackend(model_id="m").run(system, "static_energy")
    assert system == snapshot


@pytest.mark.unit
def test_run_suite_smoke_subset() -> None:
    backend = MockBenchmarkBackend(model_id="m", distill_version=0)
    result = run_suite(backend=backend, model_id="m", distill_version=0, suite="smoke")
    assert set(result.results) == {"static_energy", "geometry_opt"}
    assert result.backend == "torchsim"


@pytest.mark.unit
def test_run_suite_full_has_all_eight() -> None:
    backend = MockBenchmarkBackend(model_id="m", distill_version=0)
    result = run_suite(backend=backend, model_id="m", distill_version=0, suite="full")
    assert set(result.results) == set(BENCHMARK_SUITE)
    assert len(result.results) == 8


# --------------------------------------------------------------------------- #
# TorchSim import-safety: these assert graceful behavior with the dep ABSENT.
# --------------------------------------------------------------------------- #


@pytest.mark.unit
def test_torch_sim_not_imported_at_module_load() -> None:
    # Importing the backend module must not have pulled in torch_sim.
    assert "torch_sim" not in sys.modules


@pytest.mark.unit
@pytest.mark.skipif(torchsim_available(), reason="torch_sim is installed in this env")
def test_torchsim_backend_unavailable_raises_on_construct() -> None:
    with pytest.raises(TorchSimUnavailable):
        TorchSimBenchmarkBackend(model_id="m")


@pytest.mark.unit
@pytest.mark.skipif(torchsim_available(), reason="torch_sim is installed in this env")
def test_try_build_returns_none_when_unavailable() -> None:
    assert try_build_torchsim_backend(model_id="m") is None


@pytest.mark.unit
@pytest.mark.skipif(torchsim_available(), reason="torch_sim is installed in this env")
def test_build_backend_falls_back_to_mock(caplog: pytest.LogCaptureFixture) -> None:
    backend = build_backend("torchsim", model_id="m", distill_version=1)
    assert isinstance(backend, MockBenchmarkBackend)
    # Backend id stays 'torchsim' so the result records the requested engine.
    assert backend.backend_id == "torchsim"


@pytest.mark.unit
@pytest.mark.skipif(torchsim_available(), reason="torch_sim is installed in this env")
def test_build_backend_no_fallback_raises() -> None:
    with pytest.raises(TorchSimUnavailable):
        build_backend("torchsim", model_id="m", allow_mock_fallback=False)


@pytest.mark.unit
def test_build_backend_unknown_name_raises() -> None:
    with pytest.raises(ValueError):
        build_backend("vasp", model_id="m")  # type: ignore[arg-type]
