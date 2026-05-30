"""Shared constants for the Lupine Distill MLIP benchmarking pipeline.

Single source of truth for promotion gates and pipeline versions so the
benchmark runner, uplift report, and CI YAML never drift out of sync.
"""

from __future__ import annotations

from typing import Final

# ---------------------------------------------------------------------------
# Promotion gates (ODF uplift gates). See AGENTS.md "Closed scientific loop &
# MLIP benchmarking": promote > +5%, review 0..5%, reject < 0%.
# ---------------------------------------------------------------------------

# Minimum overall uplift (percent) required to recommend an automatic promote.
MIN_UPLIFT_THRESHOLD: Final[float] = 5.0

# A regression (overall uplift strictly below this) is always rejected.
REGRESSION_THRESHOLD: Final[float] = 0.0

# ---------------------------------------------------------------------------
# Versioning. Bumping any of these is an intentional, reviewed contract change.
# ---------------------------------------------------------------------------

# Version of the benchmark suite definition (the set of benchmarks + weights).
BENCHMARK_SUITE_VERSION: Final[str] = "1.0.0"

# Distill version reserved for the un-distilled teacher baseline.
BASELINE_DISTILL_VERSION: Final[int] = 0

# Placeholder reported when torch_sim is not importable in this environment.
TORCHSIM_VERSION_UNAVAILABLE: Final[str] = "unavailable"

__all__ = [
    "BASELINE_DISTILL_VERSION",
    "BENCHMARK_SUITE_VERSION",
    "MIN_UPLIFT_THRESHOLD",
    "REGRESSION_THRESHOLD",
    "TORCHSIM_VERSION_UNAVAILABLE",
]
