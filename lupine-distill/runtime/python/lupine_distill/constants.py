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
# A-priori regime gate (lupine_distill.regime). The post-hoc uplift gate above
# needs an oracle to MEASURE gain; the regime gate decides whether a ribbon may
# apply from PROVENANCE alone, so it protects novel materials with no oracle.
# Grounded in T3 (context_correction_does_not_transfer): refuse out of context.
# ---------------------------------------------------------------------------

# Reference family assigned to a bare (un-suffixed) error_unit: the home regime
# the foundation MLIPs are trained on and the ribbon is fit against.
HOME_REFERENCE_FAMILY: Final[str] = "mptrj_dft"

# Multiplier on the observed fit-band ceiling before a target's baseline error
# is judged out-of-distribution (regime drift or a broken backend). 1.5 = allow
# up to 50% beyond the worst error seen at fit time before refusing.
REGIME_BAND_TOLERANCE: Final[float] = 1.5

# |gain%| at or below this is "neutral" (matches the atlas verdict bands): the
# ribbon neither helped nor harmed, so it is not counted as gain or harm.
REGIME_GAIN_EPS: Final[float] = 1.0

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
    "HOME_REFERENCE_FAMILY",
    "MIN_UPLIFT_THRESHOLD",
    "REGIME_BAND_TOLERANCE",
    "REGIME_GAIN_EPS",
    "REGRESSION_THRESHOLD",
    "TORCHSIM_VERSION_UNAVAILABLE",
]
