# `lupine_distill.uplift`

Distill-version uplift computation and promotion recommendation.

## Purpose

Given a baseline (`v0`) `BenchmarkResult` and a distilled (`vN`) result, compute the per-benchmark weighted percent improvement on lower-is-better metrics, aggregate to an overall mean, and map that to a promotion gate:

* `promote` if overall uplift > +5%
* `review` if 0% ≤ overall uplift ≤ +5%
* `reject` if overall uplift < 0% (a regression)

## Key modules

| Module | Key functions |
|---|---|
| `__init__.py` | `distill_v_uplift()`, `recommend()`, `benchmark_uplift_pct()`, `metric_improvement_pct()` |
| `__main__.py` | Entry point for `python -m lupine_distill.uplift` |

## Import

```python
from lupine_distill.uplift import distill_v_uplift, recommend
```

## Example

```python
from lupine_distill import BenchmarkResult
from lupine_distill.uplift import distill_v_uplift

report = distill_v_uplift("mace-mp-0", baseline_v0, distilled_v1, version=1)
print(report["promotion_recommendation"])  # "promote", "review", or "reject"
```

Run the CLI with:

```bash
python -m lupine_distill.uplift --help
```

See [`python/README.md`](../../README.md) for the full package overview.
