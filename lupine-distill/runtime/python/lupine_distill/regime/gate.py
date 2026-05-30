"""The a-priori regime gate: decide whether a distill ribbon may be APPLIED to a
target cell from the ribbon's *provenance* alone — before, and independent of,
any oracle measurement.

The foundational distinction this draws:

    uplift/  (post-hoc)  needs a reference oracle to MEASURE the gain after the
                         fact, then promote / review / reject. It cannot protect
                         a brand-new material where no oracle exists.
    regime   (a-priori)  needs only the ribbon's provenance to decide whether
                         the correction is in-context at all. It is the safety
                         filter that lets distill run on a novel material with
                         NO oracle — the unlock for scaling beyond benchmarks.

Grounded in the proven negative-transfer theorem (T3,
``ContextSpecificProof.context_correction_does_not_transfer``): a context-specific
correction does not transfer across regimes, so out of context it must be
REFUSED. The gate operationalizes that as a reference-family match, a row-coverage
check, and a calibration-band guard.

Composition with the post-hoc gate::

    regime_gate (a-priori) -> APPLY  -> uplift (post-hoc) -> promote/review/reject
                           -> REVIEW -> apply + flag (row outside ribbon coverage)
                           -> REFUSE -> ship baseline (no harm; needs no oracle)

Pure functions, immutable (frozen) dataclasses, no mutation.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from types import MappingProxyType
from typing import Literal

from ..constants import HOME_REFERENCE_FAMILY, REGIME_BAND_TOLERANCE

Decision = Literal["apply", "review", "refuse"]

# Separator the benchmark uses to encode a foreign reference oracle in a unit:
# ``gpa_mae_vs_mishin_eam`` -> family "mishin_eam"; bare ``gpa_mae`` -> home regime.
_VS = "_vs_"


def parse_reference_family(error_unit: str) -> str:
    """Extract the reference-oracle family from a cell's ``error_unit``.

    The benchmark encodes its reference source as a ``_vs_<family>`` suffix::

        gpa_mae_vs_mishin_eam     -> "mishin_eam"
        gpa_mae_vs_literature_cij -> "literature_cij"
        ev_per_atom_mae_vs_dft    -> "dft"

    A bare unit (no suffix) belongs to the home regime the ribbon was fit on::

        gpa_mae                   -> HOME_REFERENCE_FAMILY ("mptrj_dft")

    An empty unit yields ``""`` — an unknown family, which the gate refuses.
    """

    if not error_unit:
        return ""
    idx = error_unit.find(_VS)
    if idx == -1:
        return HOME_REFERENCE_FAMILY
    return error_unit[idx + len(_VS) :]


def parse_metric_kind(error_unit: str) -> str:
    """The metric kind: ``error_unit`` with any ``_vs_<family>`` suffix removed."""

    if not error_unit:
        return ""
    idx = error_unit.find(_VS)
    return error_unit if idx == -1 else error_unit[:idx]


@dataclass(frozen=True)
class RibbonProvenance:
    """Immutable record of what a distill ribbon was calibrated on.

    The gate trusts the ribbon only inside this declared envelope: the oracle
    families it was fit against, the rows it demonstrably corrects, and the
    per-metric baseline-error band it observed during fit.
    """

    ribbon_id: str
    reference_families: frozenset[str]
    fit_rows: frozenset[str]
    # metric_kind -> (lo, hi) baseline-error range seen at fit time.
    calibration_band: Mapping[str, tuple[float, float]]
    # The chemical system the ribbon was fit on (its element coverage). When set,
    # a target whose elements are not a subset is out-of-chemistry -> REVIEW. None
    # disables the chemistry rule (the reference-family signal stands alone).
    fit_elements: frozenset[str] | None = None

    def __post_init__(self) -> None:
        # Deep-freeze the band: a plain dict passed in would otherwise stay
        # mutable through the Mapping field, breaking the immutability contract.
        object.__setattr__(
            self, "calibration_band", MappingProxyType(dict(self.calibration_band))
        )


@dataclass(frozen=True)
class CellFingerprint:
    """A cheap, deterministic descriptor of a target cell — no re-simulation.

    Everything here is read straight from a ``cell_result.json`` accuracy block,
    so the gate can fingerprint a target the instant a baseline cell exists.
    """

    material: str
    row: str
    mlip: str
    reference_family: str
    metric_kind: str
    baseline_error: float | None
    # The target's chemical system (its element set), when known a-priori from
    # the fixture. None leaves the chemistry rule inert (current behavior).
    elements: frozenset[str] | None = None

    @classmethod
    def from_cell(
        cls,
        cell: Mapping[str, object],
        *,
        material: str,
        row: str,
        mlip: str,
        elements: frozenset[str] | None = None,
    ) -> CellFingerprint:
        acc = cell.get("accuracy") or {}
        if not isinstance(acc, Mapping):
            acc = {}
        unit = str(acc.get("error_unit", "") or "")
        raw_err = acc.get("error")
        err = float(raw_err) if isinstance(raw_err, (int, float)) else None
        # Elements: explicit arg wins; else read an optional cell "elements" list.
        els = elements
        if els is None:
            raw_els = cell.get("elements")
            if isinstance(raw_els, (list, tuple, set, frozenset)):
                els = frozenset(str(x) for x in raw_els)
        return cls(
            material=material,
            row=row,
            mlip=mlip,
            reference_family=parse_reference_family(unit),
            metric_kind=parse_metric_kind(unit),
            baseline_error=err,
            elements=els,
        )


@dataclass(frozen=True)
class GateDecision:
    """The a-priori verdict, with the rule that fired and a human reason."""

    decision: Decision
    rule: str
    reason: str


def regime_gate(
    provenance: RibbonProvenance,
    fingerprint: CellFingerprint,
    *,
    band_tolerance: float = REGIME_BAND_TOLERANCE,
) -> GateDecision:
    """Decide APPLY / REVIEW / REFUSE for a ribbon on a target, a-priori.

    Rule order is deliberate — the reference-family mismatch is the strongest
    (T3) signal and is checked first, then row coverage, then the band guard:

    1. ``reference_family_mismatch`` -> REFUSE. The target's oracle is outside
       the ribbon's calibrated families: a context the correction cannot
       transfer to (T3). This is the rule that stops Ni-EAM harm a-priori.
    2. ``row_outside_fit_coverage`` -> REVIEW. In-regime, but the ribbon never
       demonstrated uplift on this row; apply only with a human in the loop.
    3. ``chemistry_outside_fit_set`` -> REVIEW. Same reference family, but the
       target has elements the ribbon never saw — the canonical MLIP
       transferability limit. Uncertain (not proven-harmful), so review rather
       than refuse. Inert unless both fit_elements and elements are declared, so
       it never changes a reference-family-only decision.
    4. ``calibration_band_exceeded`` -> REFUSE. Baseline error is far outside the
       fit distribution — regime drift or a broken backend (catches garbage
       like m3gnet's 30118 GPa elastic error) before it can be "corrected".
    5. ``in_regime`` -> APPLY.
    """

    fam = fingerprint.reference_family
    if fam not in provenance.reference_families:
        return GateDecision(
            "refuse",
            "reference_family_mismatch",
            f"target oracle {fam!r} is outside the ribbon's calibrated families "
            f"{sorted(provenance.reference_families)} (T3 negative transfer) — refuse",
        )

    if fingerprint.row not in provenance.fit_rows:
        return GateDecision(
            "review",
            "row_outside_fit_coverage",
            f"row {fingerprint.row!r} is in-regime but outside the ribbon's fit rows "
            f"{sorted(provenance.fit_rows)} — apply only under review",
        )

    if provenance.fit_elements is not None and fingerprint.elements is not None:
        extra = fingerprint.elements - provenance.fit_elements
        if extra:
            return GateDecision(
                "review",
                "chemistry_outside_fit_set",
                f"elements {sorted(extra)} are outside the ribbon's fit chemistry "
                f"{sorted(provenance.fit_elements)} — transferability unknown, review",
            )

    band = provenance.calibration_band.get(fingerprint.metric_kind)
    err = fingerprint.baseline_error
    # A novel material with no baseline yet has err is None: the band guard is
    # intentionally skipped and the gate proceeds to APPLY on the strength of the
    # (already-passed) family + row checks — the oracle-free path this exists for.
    if band is not None and err is not None:
        lo, hi = band
        ceiling = hi * band_tolerance
        if err < lo or err > ceiling:
            return GateDecision(
                "refuse",
                "calibration_band_exceeded",
                f"baseline error {err:.4g} for {fingerprint.metric_kind!r} is outside the "
                f"calibrated band [{lo:.4g}, {hi:.4g}]x{band_tolerance:g} — drift/garbage, refuse",
            )

    return GateDecision(
        "apply",
        "in_regime",
        f"oracle {fam!r} calibrated and row {fingerprint.row!r} covered — apply",
    )


__all__ = [
    "CellFingerprint",
    "Decision",
    "GateDecision",
    "RibbonProvenance",
    "parse_metric_kind",
    "parse_reference_family",
    "regime_gate",
]
