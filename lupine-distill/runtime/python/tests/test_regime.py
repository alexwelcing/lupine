"""A-priori regime gate + dominance scorer boundary tests.

These pin the gate's contract (the rule that fires, in the right order) and the
dominance accounting — the property that makes the diagnose -> fix -> re-prove
loop trustworthy: the gated policy admits strictly less harm and loses no win.
"""

from __future__ import annotations

import pytest
from lupine_distill.constants import HOME_REFERENCE_FAMILY
from lupine_distill.regime import (
    CellFingerprint,
    RibbonProvenance,
    parse_metric_kind,
    parse_reference_family,
    regime_gate,
    score_gate,
)

# A v1 ribbon fit on the home (MPtrj-DFT) regime, covering energy + relaxation,
# with a generous gpa_mae band so the band guard only fires on real outliers.
RIBBON = RibbonProvenance(
    ribbon_id="test-ribbon-v1",
    reference_families=frozenset({HOME_REFERENCE_FAMILY}),
    fit_rows=frozenset({"energy_volume", "relaxation_stability"}),
    calibration_band={"gpa_mae": (0.0, 2.0), "ev_per_atom_mae": (0.0, 1.0)},
)


def _fp(
    *,
    unit: str,
    row: str = "energy_volume",
    error: float | None = 0.4,
    material: str = "MPtrj-DFT",
    mlip: str = "mace-mp-0",
) -> CellFingerprint:
    return CellFingerprint.from_cell(
        {"accuracy": {"error_unit": unit, "error": error}},
        material=material,
        row=row,
        mlip=mlip,
    )


# --------------------------------------------------------------------------- #
# unit-string parsing — the regime signal lives in the error_unit suffix
# --------------------------------------------------------------------------- #


@pytest.mark.unit
@pytest.mark.parametrize(
    "unit,family",
    [
        ("gpa_mae", HOME_REFERENCE_FAMILY),
        ("ev_per_atom_mae", HOME_REFERENCE_FAMILY),
        ("gpa_mae_vs_mishin_eam", "mishin_eam"),
        ("gpa_mae_vs_literature_cij", "literature_cij"),
        ("ev_per_atom_mae_vs_dft", "dft"),
        ("", ""),
    ],
)
def test_parse_reference_family(unit: str, family: str) -> None:
    assert parse_reference_family(unit) == family


@pytest.mark.unit
@pytest.mark.parametrize(
    "unit,kind",
    [
        ("gpa_mae", "gpa_mae"),
        ("gpa_mae_vs_mishin_eam", "gpa_mae"),
        ("ev_per_atom_mae_vs_mishin_eam", "ev_per_atom_mae"),
        ("ev_per_angstrom_rmse_vs_mishin_eam", "ev_per_angstrom_rmse"),
        ("", ""),
    ],
)
def test_parse_metric_kind(unit: str, kind: str) -> None:
    assert parse_metric_kind(unit) == kind


@pytest.mark.unit
def test_fingerprint_from_cell_tolerates_missing_accuracy() -> None:
    fp = CellFingerprint.from_cell({}, material="X", row="r", mlip="m")
    assert fp.reference_family == ""  # empty unit -> unknown family
    assert fp.baseline_error is None
    assert fp.metric_kind == ""


# --------------------------------------------------------------------------- #
# the gate — one rule fires, in the documented priority order
# --------------------------------------------------------------------------- #


@pytest.mark.unit
def test_gate_applies_in_regime() -> None:
    d = regime_gate(RIBBON, _fp(unit="gpa_mae", row="energy_volume", error=0.4))
    assert d.decision == "apply"
    assert d.rule == "in_regime"


@pytest.mark.unit
def test_gate_refuses_foreign_oracle_t3() -> None:
    # Ni-EAM cell: oracle "mishin_eam" is not a calibrated family -> REFUSE.
    d = regime_gate(RIBBON, _fp(unit="gpa_mae_vs_mishin_eam", material="Ni-EAM"))
    assert d.decision == "refuse"
    assert d.rule == "reference_family_mismatch"


@pytest.mark.unit
def test_gate_reviews_uncovered_row_in_regime() -> None:
    # In-regime oracle, but "stress" is outside the ribbon's fit rows -> REVIEW.
    d = regime_gate(RIBBON, _fp(unit="gpa_mae", row="stress", error=0.4))
    assert d.decision == "review"
    assert d.rule == "row_outside_fit_coverage"


@pytest.mark.unit
def test_gate_refuses_out_of_band_baseline() -> None:
    # In-regime + covered row, but baseline error 30118 is far past the band
    # ceiling (2.0 * 1.5) -> REFUSE as drift/garbage (the m3gnet outlier guard).
    d = regime_gate(RIBBON, _fp(unit="gpa_mae", row="energy_volume", error=30118.0))
    assert d.decision == "refuse"
    assert d.rule == "calibration_band_exceeded"


@pytest.mark.unit
def test_gate_family_mismatch_beats_row_and_band() -> None:
    # A foreign oracle on an uncovered row with a wild error still refuses on the
    # family rule (priority order), not row/band.
    d = regime_gate(RIBBON, _fp(unit="gpa_mae_vs_mishin_eam", row="stress", error=9e9))
    assert (d.decision, d.rule) == ("refuse", "reference_family_mismatch")


@pytest.mark.unit
def test_gate_band_ceiling_uses_tolerance() -> None:
    # hi=2.0, tolerance default 1.5 -> ceiling 3.0: 2.9 applies, 3.1 refuses.
    assert regime_gate(RIBBON, _fp(unit="gpa_mae", error=2.9)).decision == "apply"
    assert regime_gate(RIBBON, _fp(unit="gpa_mae", error=3.1)).decision == "refuse"


# --------------------------------------------------------------------------- #
# chemistry coverage (#2) — same family, unseen elements -> REVIEW
# --------------------------------------------------------------------------- #

# A ribbon that additionally declares the chemical system it was fit on.
RIBBON_CHEM = RibbonProvenance(
    ribbon_id="ribbon-chem",
    reference_families=frozenset({HOME_REFERENCE_FAMILY}),
    fit_rows=frozenset({"energy_volume", "relaxation_stability"}),
    calibration_band={"gpa_mae": (0.0, 2.0)},
    fit_elements=frozenset({"Ni", "O", "Fe"}),
)


def _fp_chem(elements, *, unit="gpa_mae", row="energy_volume", error=0.4) -> CellFingerprint:
    return CellFingerprint.from_cell(
        {"accuracy": {"error_unit": unit, "error": error}, "elements": list(elements)},
        material="X", row=row, mlip="m",
    )


@pytest.mark.unit
def test_chemistry_within_fit_set_applies() -> None:
    # Subset of the fit chemistry, in-regime, covered row -> apply.
    assert regime_gate(RIBBON_CHEM, _fp_chem(["Ni", "O"])).decision == "apply"


@pytest.mark.unit
def test_chemistry_outside_fit_set_reviews() -> None:
    # Same family, but W is unseen -> REVIEW (transferability unknown), not refuse.
    d = regime_gate(RIBBON_CHEM, _fp_chem(["Ni", "W"]))
    assert d.decision == "review"
    assert d.rule == "chemistry_outside_fit_set"


@pytest.mark.unit
def test_chemistry_rule_inert_without_declaration() -> None:
    # The base RIBBON declares no fit_elements -> rule never fires (backward compat).
    assert regime_gate(RIBBON, _fp_chem(["W", "Pu"])).decision == "apply"
    # And a fingerprint with no elements leaves the rule inert even on RIBBON_CHEM.
    assert regime_gate(RIBBON_CHEM, _fp(unit="gpa_mae")).decision == "apply"


@pytest.mark.unit
def test_family_mismatch_beats_chemistry() -> None:
    # Foreign oracle short-circuits to REFUSE before chemistry is considered.
    d = regime_gate(RIBBON_CHEM, _fp_chem(["Ni", "W"], unit="gpa_mae_vs_mishin_eam"))
    assert (d.decision, d.rule) == ("refuse", "reference_family_mismatch")


# --------------------------------------------------------------------------- #
# dominance scorer — the property that makes the loop trustworthy
# --------------------------------------------------------------------------- #


@pytest.mark.unit
def test_score_gate_dominates_on_clean_separation() -> None:
    # 2 home-regime gains (gate applies) + 2 foreign-regime harms (gate refuses).
    pairings = [
        (_fp(unit="gpa_mae", row="energy_volume", error=0.4), 50.0),  # gain, applied
        (_fp(unit="gpa_mae", row="relaxation_stability", error=0.5), 31.0),  # gain, applied
        (_fp(unit="gpa_mae_vs_mishin_eam", material="Ni-EAM"), -10.7),  # harm, refused
        (_fp(unit="gpa_mae_vs_literature_cij", material="Ni-EAM", row="relaxation_stability"), -18.2),
    ]
    report, scored = score_gate(pairings, RIBBON)

    assert report.total_gain_cells == 2
    assert report.total_harm_cells == 2
    assert report.ungated_admitted_harms == 2  # apply-everywhere ships both harms
    assert report.gated_admitted_harms == 0  # gate refuses both
    assert report.gated_preserved_gains == 2  # gate keeps both wins
    assert report.false_refusals == 0
    assert report.missed_harms == 0
    assert report.harm_eliminated == 2
    assert report.dominates is True
    assert len(scored) == 4


@pytest.mark.unit
def test_score_gate_counts_missed_harm_and_false_refusal() -> None:
    # A harm wearing a home-regime unit (gate wrongly applies -> missed harm) and
    # a gain wearing a foreign unit (gate wrongly refuses -> false refusal). On
    # this adversarial set the gate does NOT dominate, and the report says so.
    pairings = [
        (_fp(unit="gpa_mae", row="energy_volume", error=0.4), -9.0),  # harm but applied
        (_fp(unit="gpa_mae_vs_mishin_eam", material="Ni-EAM"), 12.0),  # gain but refused
    ]
    report, _ = score_gate(pairings, RIBBON)
    assert report.missed_harms == 1
    assert report.false_refusals == 1
    assert report.dominates is False


@pytest.mark.unit
def test_score_gate_neutral_cells_are_neither_gain_nor_harm() -> None:
    # |gain| <= REGIME_GAIN_EPS (1.0) is neutral: excluded from gain/harm counts.
    pairings = [(_fp(unit="gpa_mae", error=0.4), 0.5)]
    report, _ = score_gate(pairings, RIBBON)
    assert report.total_gain_cells == 0
    assert report.total_harm_cells == 0


@pytest.mark.unit
def test_score_gate_dominates_vacuously_on_zero_harm_corpus() -> None:
    # No harms at all: nothing to cut, so dominance reduces to "lost no win".
    pairings = [(_fp(unit="gpa_mae", row="energy_volume", error=0.4), 50.0)]
    report, _ = score_gate(pairings, RIBBON)
    assert report.ungated_admitted_harms == 0
    assert report.false_refusals == 0
    assert report.dominates is True  # vacuous, not False from 0 < 0


@pytest.mark.unit
def test_score_gate_reviews_apply_opt_in_ships_review_cells() -> None:
    # A win on an uncovered row is REVIEW. Conservative default: not shipped
    # (a false refusal). With reviews_apply=True the human-in-loop ships it.
    pairings = [(_fp(unit="gpa_mae", row="stress", error=0.4), 20.0)]
    conservative, _ = score_gate(pairings, RIBBON)
    assert conservative.gated_preserved_gains == 0
    assert conservative.false_refusals == 1

    opted_in, _ = score_gate(pairings, RIBBON, reviews_apply=True)
    assert opted_in.gated_preserved_gains == 1
    assert opted_in.false_refusals == 0


@pytest.mark.unit
def test_missed_harms_is_derived_property() -> None:
    # missed_harms mirrors gated_admitted_harms (a harm the policy shipped).
    pairings = [(_fp(unit="gpa_mae", row="energy_volume", error=0.4), -9.0)]
    report, _ = score_gate(pairings, RIBBON)
    assert report.missed_harms == report.gated_admitted_harms == 1
