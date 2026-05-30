"""Dominance scoring — the flywheel's accounting.

Replays the a-priori :func:`regime_gate` over a set of *paired* cells whose true
gain is already known (the atlas is exactly such a labeled benchmark) and asks
the one question that makes the loop repeatable:

    Does the GATED policy (apply the ribbon only where the gate says APPLY)
    dominate the UNGATED policy (apply the ribbon everywhere)?

Dominance = admit strictly less harm while losing none of the wins. The known
gain of each cell is used only to *score* the gate after the fact; the gate
itself never sees it (it decides from provenance alone). So a gate that
dominates here is a gate we can trust on a novel material where no gain is
measurable yet.

Pure functions, immutable results, no mutation.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass

from ..constants import REGIME_BAND_TOLERANCE, REGIME_GAIN_EPS
from .gate import CellFingerprint, GateDecision, RibbonProvenance, regime_gate


@dataclass(frozen=True)
class ScoredCell:
    """One paired cell: its fingerprint, true gain%, and the gate's verdict."""

    fingerprint: CellFingerprint
    gain_pct: float | None
    decision: GateDecision

    @property
    def is_gain(self) -> bool:
        return self.gain_pct is not None and self.gain_pct > REGIME_GAIN_EPS

    @property
    def is_harm(self) -> bool:
        return self.gain_pct is not None and self.gain_pct < -REGIME_GAIN_EPS

    @property
    def applied(self) -> bool:
        """The gated policy applies the ribbon only on an explicit APPLY."""

        return self.decision.decision == "apply"


def _ships(decision: str, reviews_apply: bool) -> bool:
    """Whether the gated policy ships the ribbon for a decision.

    The contract: a gated policy ships on an explicit APPLY, and on REVIEW only
    when ``reviews_apply`` is set (the human-in-the-loop chose to apply). A
    REFUSE never ships. The default (``reviews_apply=False``) is conservative —
    REVIEW defers, so a reviewed win counts as not-yet-captured, not as shipped.
    """

    return decision == "apply" or (reviews_apply and decision == "review")


@dataclass(frozen=True)
class DominanceReport:
    """Confusion of the gate against known outcomes + the dominance verdict."""

    n_cells: int
    n_apply: int
    n_review: int
    n_refuse: int
    total_gain_cells: int
    total_harm_cells: int
    # Ungated = apply everywhere: admits every harm, preserves every gain.
    ungated_admitted_harms: int
    ungated_preserved_gains: int
    # Gated = ship only where the policy ships (APPLY, or REVIEW if opted in).
    gated_admitted_harms: int
    gated_preserved_gains: int
    false_refusals: int  # gain cell the gated policy did NOT ship (a lost win)

    @property
    def missed_harms(self) -> int:
        """Harm cells the gated policy shipped — equal to gated_admitted_harms."""

        return self.gated_admitted_harms

    @property
    def dominates(self) -> bool:
        """Admit strictly fewer harms while losing no win.

        When the corpus has no harms (``ungated_admitted_harms == 0``) there is
        nothing to cut, so dominance reduces to "lost no win" — matching the
        flywheel's certificate, which relaxes ``<`` to ``≤`` in that case.
        """

        if self.ungated_admitted_harms == 0:
            return self.false_refusals == 0
        return (
            self.gated_admitted_harms < self.ungated_admitted_harms
            and self.false_refusals == 0
        )

    @property
    def harm_eliminated(self) -> int:
        return self.ungated_admitted_harms - self.gated_admitted_harms


def score_gate(
    pairings: Iterable[tuple[CellFingerprint, float | None]],
    provenance: RibbonProvenance,
    *,
    band_tolerance: float = REGIME_BAND_TOLERANCE,
    reviews_apply: bool = False,
) -> tuple[DominanceReport, tuple[ScoredCell, ...]]:
    """Score the gate over labeled pairings; return the report and per-cell rows.

    ``pairings`` is an iterable of ``(fingerprint, gain_pct)`` where ``gain_pct``
    is the measured percent improvement (positive = the ribbon helped). The gate
    is applied to each fingerprint; the gain only scores the outcome.

    ``reviews_apply`` selects the REVIEW shipping convention (see :func:`_ships`);
    the default is conservative — REVIEW does not ship.
    """

    scored = tuple(
        ScoredCell(fp, gain, regime_gate(provenance, fp, band_tolerance=band_tolerance))
        for fp, gain in pairings
    )

    n_apply = sum(1 for c in scored if c.decision.decision == "apply")
    n_review = sum(1 for c in scored if c.decision.decision == "review")
    n_refuse = sum(1 for c in scored if c.decision.decision == "refuse")

    gains = [c for c in scored if c.is_gain]
    harms = [c for c in scored if c.is_harm]

    def ships(c: ScoredCell) -> bool:
        return _ships(c.decision.decision, reviews_apply)

    report = DominanceReport(
        n_cells=len(scored),
        n_apply=n_apply,
        n_review=n_review,
        n_refuse=n_refuse,
        total_gain_cells=len(gains),
        total_harm_cells=len(harms),
        ungated_admitted_harms=len(harms),  # apply-everywhere admits them all
        ungated_preserved_gains=len(gains),
        gated_admitted_harms=sum(1 for c in harms if ships(c)),
        gated_preserved_gains=sum(1 for c in gains if ships(c)),
        false_refusals=sum(1 for c in gains if not ships(c)),
    )
    return report, scored


__all__ = ["DominanceReport", "ScoredCell", "score_gate"]
