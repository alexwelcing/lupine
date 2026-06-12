"""Benchmark-suite definition invariants."""

from __future__ import annotations

import math

import pytest

from lupine_distill.suite import (
    BENCHMARK_SUITE,
    BENCHMARK_WEIGHTS,
    LOWER_IS_BETTER_METRICS,
    SMOKE_SUITE,
    resolve_suite,
)


@pytest.mark.unit
def test_suite_has_eight_benchmarks() -> None:
    assert len(BENCHMARK_SUITE) == 8
    assert len(set(BENCHMARK_SUITE)) == 8  # no duplicates


@pytest.mark.unit
def test_every_benchmark_has_weights() -> None:
    assert set(BENCHMARK_WEIGHTS) == set(BENCHMARK_SUITE)


@pytest.mark.unit
@pytest.mark.parametrize("benchmark", BENCHMARK_SUITE)
def test_weights_sum_to_one(benchmark: str) -> None:
    total = math.fsum(BENCHMARK_WEIGHTS[benchmark].values())
    assert math.isclose(total, 1.0, abs_tol=1e-9)


@pytest.mark.unit
@pytest.mark.parametrize("benchmark", BENCHMARK_SUITE)
def test_weights_reference_only_known_metrics(benchmark: str) -> None:
    assert set(BENCHMARK_WEIGHTS[benchmark]).issubset(LOWER_IS_BETTER_METRICS)


@pytest.mark.unit
def test_resolve_suite_full_and_smoke() -> None:
    assert resolve_suite("full") == BENCHMARK_SUITE
    assert resolve_suite("FULL") == BENCHMARK_SUITE
    assert resolve_suite("smoke") == SMOKE_SUITE


@pytest.mark.unit
def test_resolve_suite_unknown_raises() -> None:
    with pytest.raises(ValueError):
        resolve_suite("nonsense")
