"""Distill-version uplift computation and ODF promotion gates.

Given a baseline (v0) :class:`BenchmarkResult` and a distilled (vN) result,
compute the per-benchmark weighted percent improvement on lower-is-better
metrics, aggregate to an overall mean, and map that to a promotion gate:

    promote  if overall > +5%     (MIN_UPLIFT_THRESHOLD)
    review   if 0 <= overall <= 5%
    reject   if overall < 0%      (a regression)

Percent improvement for a single lower-is-better metric is
``(v0 - vN) / abs(v0) * 100`` — positive when vN reduced the error.

Pure functions, no mutation: inputs are read, a fresh report dict is returned.

This is a package (not a module) so ``python -m lupine_distill.uplift`` runs the
CLI via ``uplift/__main__.py`` without the runpy double-import warning, while
``from lupine_distill.uplift import distill_v_uplift`` keeps working.
"""

from __future__ import annotations

import math
from typing import Mapping

from ..constants import MIN_UPLIFT_THRESHOLD, REGRESSION_THRESHOLD
from ..schemas import BenchmarkMetrics, BenchmarkResult, PromotionRecommendation
from ..suite import BENCHMARK_WEIGHTS


def metric_improvement_pct(v0: float, vN: float) -> float:
    """Percent improvement of a lower-is-better metric: (v0 - vN)/|v0| * 100.

    ``v0`` of 0 is degenerate (no error to improve on); we return 0.0 to avoid a
    division blow-up rather than fabricating infinite uplift.
    """

    if v0 == 0.0:
        return 0.0
    return (v0 - vN) / abs(v0) * 100.0


def benchmark_uplift_pct(
    baseline: BenchmarkMetrics,
    distilled: BenchmarkMetrics,
    weights: Mapping[str, float],
) -> float | None:
    """Weighted percent improvement for one benchmark.

    Only metrics present (non-None) on *both* results contribute. Weights are
    renormalized over the contributing metrics so a missing metric does not
    silently shrink the score. Returns ``None`` if no metric is comparable.
    """

    contributions: list[tuple[float, float]] = []  # (weight, pct)
    for metric, weight in weights.items():
        b = getattr(baseline, metric)
        d = getattr(distilled, metric)
        if b is None or d is None:
            continue
        contributions.append((weight, metric_improvement_pct(float(b), float(d))))

    if not contributions:
        return None
    total_weight = math.fsum(w for w, _ in contributions)
    if total_weight == 0.0:
        return None
    return math.fsum(w * pct for w, pct in contributions) / total_weight


def recommend(overall_uplift_pct: float | None) -> PromotionRecommendation | None:
    """Map an overall uplift percent to an ODF promotion gate."""

    if overall_uplift_pct is None:
        return None
    if overall_uplift_pct > MIN_UPLIFT_THRESHOLD:
        return "promote"
    if overall_uplift_pct < REGRESSION_THRESHOLD:
        return "reject"
    return "review"


def distill_v_uplift(
    model_id: str,
    baseline_v0: BenchmarkResult,
    distill_vN: BenchmarkResult,
    version: int,
) -> dict:
    """Compute the uplift report comparing a distilled version to its baseline.

    Returns a fresh JSON-serializable report dict::

        {
          "schema": "lupine.distill.uplift_report.v1",
          "model_id": ...,
          "distill_version": version,
          "baseline_version": baseline_v0.distill_version,
          "per_benchmark": {bench: pct | None, ...},
          "overall_uplift_pct": float | None,
          "promotion_recommendation": "promote"|"review"|"reject"|None,
          "min_uplift_threshold": 5.0,
          "benchmarks_compared": int,
        }

    Inputs are not mutated. A benchmark is compared only when both results
    contain it; benchmarks present in neither are reported as ``None`` and
    excluded from the overall mean.
    """

    if version < 0:
        raise ValueError("version must be >= 0")

    per_benchmark: dict[str, float | None] = {}
    comparable: list[float] = []

    benchmark_names = sorted(set(baseline_v0.results) | set(distill_vN.results))
    for name in benchmark_names:
        weights = BENCHMARK_WEIGHTS.get(name)
        base_metrics = baseline_v0.results.get(name)
        dist_metrics = distill_vN.results.get(name)
        if weights is None or base_metrics is None or dist_metrics is None:
            per_benchmark[name] = None
            continue
        pct = benchmark_uplift_pct(base_metrics, dist_metrics, weights)
        per_benchmark[name] = pct
        if pct is not None:
            comparable.append(pct)

    overall = math.fsum(comparable) / len(comparable) if comparable else None
    recommendation = recommend(overall)

    return {
        "schema": "lupine.distill.uplift_report.v1",
        "model_id": model_id,
        "distill_version": version,
        "baseline_version": baseline_v0.distill_version,
        "per_benchmark": per_benchmark,
        "overall_uplift_pct": overall,
        "promotion_recommendation": recommendation,
        "min_uplift_threshold": MIN_UPLIFT_THRESHOLD,
        "benchmarks_compared": len(comparable),
    }


__all__ = [
    "benchmark_uplift_pct",
    "distill_v_uplift",
    "metric_improvement_pct",
    "recommend",
]
