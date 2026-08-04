"""Uplift computation and ODF promotion-gate boundary tests."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from lupine_distill.constants import MIN_UPLIFT_THRESHOLD
from lupine_distill.schemas import BenchmarkMetrics, BenchmarkResult
from lupine_distill.uplift import (
    benchmark_uplift_pct,
    distill_v_uplift,
    metric_improvement_pct,
    recommend,
)


def _result(distill_version: int, mae_energy: float, mae_forces: float) -> BenchmarkResult:
    """A two-benchmark result whose only weighted metrics are mae_energy/forces.

    static_energy weights: energy 0.5, forces 0.4, stress 0.1
    geometry_opt weights:  forces 0.6, energy 0.4
    We set stress=None so it drops out and weights renormalize over energy/forces.
    """

    metrics = BenchmarkMetrics(
        mae_energy=mae_energy,
        mae_forces=mae_forces,
        wall_time_seconds=1.0,
    )
    return BenchmarkResult(
        model_id="m",
        distill_version=distill_version,
        backend="torchsim",
        timestamp=datetime(2026, 5, 29, tzinfo=timezone.utc),
        torchsim_version="0",
        benchmark_suite_version="1.0.0",
        results={"static_energy": metrics, "geometry_opt": metrics},
    )


# --------------------------------------------------------------------------- #
# Pure helpers
# --------------------------------------------------------------------------- #


@pytest.mark.unit
def test_metric_improvement_pct_basic() -> None:
    # 10 -> 8 is a 20% improvement.
    assert metric_improvement_pct(10.0, 8.0) == pytest.approx(20.0)
    # 8 -> 10 is a 25% regression.
    assert metric_improvement_pct(8.0, 10.0) == pytest.approx(-25.0)


@pytest.mark.unit
def test_metric_improvement_pct_zero_baseline_is_zero() -> None:
    assert metric_improvement_pct(0.0, 0.0) == 0.0
    assert metric_improvement_pct(0.0, 1.0) == 0.0


@pytest.mark.unit
def test_benchmark_uplift_pct_renormalizes_over_present_metrics() -> None:
    base = BenchmarkMetrics(mae_energy=10.0, mae_forces=10.0, wall_time_seconds=1.0)
    dist = BenchmarkMetrics(mae_energy=9.0, mae_forces=8.0, wall_time_seconds=1.0)
    # static_energy weights energy 0.5 forces 0.4 stress 0.1; stress missing on
    # both so renormalize over {energy:0.5, forces:0.4} -> energy 5/9, forces 4/9.
    # energy improves 10%, forces improves 20%.
    expected = (0.5 * 10.0 + 0.4 * 20.0) / 0.9
    pct = benchmark_uplift_pct(base, dist, {"mae_energy": 0.5, "mae_forces": 0.4, "mae_stress": 0.1})
    assert pct == pytest.approx(expected)


@pytest.mark.unit
def test_benchmark_uplift_pct_none_when_no_shared_metric() -> None:
    base = BenchmarkMetrics(mae_energy=10.0, wall_time_seconds=1.0)
    dist = BenchmarkMetrics(mae_forces=10.0, wall_time_seconds=1.0)
    assert benchmark_uplift_pct(base, dist, {"mae_energy": 0.5, "mae_forces": 0.5}) is None


# --------------------------------------------------------------------------- #
# recommend() gate boundaries
# --------------------------------------------------------------------------- #


@pytest.mark.unit
@pytest.mark.parametrize(
    "overall,expected",
    [
        (5.0001, "promote"),  # strictly above threshold
        (50.0, "promote"),
        (MIN_UPLIFT_THRESHOLD, "review"),  # exactly 5.0 -> review (not promote)
        (2.5, "review"),
        (0.0, "review"),  # exactly 0 -> review (not reject)
        (-0.0001, "reject"),
        (-30.0, "reject"),
        (None, None),
    ],
)
def test_recommend_gate_boundaries(overall: float | None, expected: str | None) -> None:
    assert recommend(overall) == expected


# --------------------------------------------------------------------------- #
# distill_v_uplift() end-to-end gates
# --------------------------------------------------------------------------- #


@pytest.mark.unit
def test_uplift_promote_case() -> None:
    v0 = _result(0, mae_energy=10.0, mae_forces=10.0)
    vN = _result(2, mae_energy=8.0, mae_forces=8.0)  # uniform 20% improvement
    report = distill_v_uplift("m", v0, vN, 2)
    assert report["overall_uplift_pct"] == pytest.approx(20.0)
    assert report["promotion_recommendation"] == "promote"
    assert report["benchmarks_compared"] == 2
    assert report["min_uplift_threshold"] == MIN_UPLIFT_THRESHOLD


@pytest.mark.unit
def test_uplift_review_case_within_band() -> None:
    # 3% uniform improvement -> overall 3% -> review.
    v0 = _result(0, mae_energy=100.0, mae_forces=100.0)
    vN = _result(1, mae_energy=97.0, mae_forces=97.0)
    report = distill_v_uplift("m", v0, vN, 1)
    assert report["overall_uplift_pct"] == pytest.approx(3.0)
    assert report["promotion_recommendation"] == "review"


@pytest.mark.unit
def test_uplift_review_case_exactly_at_threshold() -> None:
    # Exactly +5% -> review (boundary belongs to review, not promote).
    v0 = _result(0, mae_energy=100.0, mae_forces=100.0)
    vN = _result(1, mae_energy=95.0, mae_forces=95.0)
    report = distill_v_uplift("m", v0, vN, 1)
    assert report["overall_uplift_pct"] == pytest.approx(5.0)
    assert report["promotion_recommendation"] == "review"


@pytest.mark.unit
def test_uplift_reject_regression() -> None:
    # vN worse than v0 -> negative overall -> reject.
    v0 = _result(0, mae_energy=8.0, mae_forces=8.0)
    vN = _result(1, mae_energy=10.0, mae_forces=10.0)  # 25% worse
    report = distill_v_uplift("m", v0, vN, 1)
    assert report["overall_uplift_pct"] < 0.0
    assert report["promotion_recommendation"] == "reject"


@pytest.mark.unit
def test_uplift_baseline_version_recorded() -> None:
    v0 = _result(0, mae_energy=10.0, mae_forces=10.0)
    vN = _result(3, mae_energy=9.0, mae_forces=9.0)
    report = distill_v_uplift("m", v0, vN, 3)
    assert report["baseline_version"] == 0
    assert report["distill_version"] == 3
    assert report["model_id"] == "m"
    assert report["schema"] == "lupine.distill.uplift_report.v1"


@pytest.mark.unit
def test_uplift_no_common_benchmarks_is_none() -> None:
    v0 = _result(0, mae_energy=10.0, mae_forces=10.0)
    # vN has a disjoint benchmark set.
    only_other = BenchmarkResult(
        model_id="m",
        distill_version=1,
        backend="torchsim",
        timestamp=datetime(2026, 5, 29, tzinfo=timezone.utc),
        torchsim_version="0",
        benchmark_suite_version="1.0.0",
        results={"phonon_dos": BenchmarkMetrics(mae_forces=1.0, mae_energy=1.0, wall_time_seconds=1.0)},
    )
    report = distill_v_uplift("m", v0, only_other, 1)
    assert report["overall_uplift_pct"] is None
    assert report["promotion_recommendation"] is None
    assert report["benchmarks_compared"] == 0
    # static_energy/geometry_opt/phonon_dos all listed, all None (not compared).
    assert set(report["per_benchmark"]) == {"static_energy", "geometry_opt", "phonon_dos"}
    assert all(v is None for v in report["per_benchmark"].values())


@pytest.mark.unit
def test_uplift_negative_version_rejected() -> None:
    v0 = _result(0, mae_energy=10.0, mae_forces=10.0)
    vN = _result(1, mae_energy=9.0, mae_forces=9.0)
    with pytest.raises(ValueError):
        distill_v_uplift("m", v0, vN, -1)
