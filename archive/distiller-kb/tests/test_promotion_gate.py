"""Tests for the ODF formal-verification promotion gate (§13.2).

Covers the promote / review / reject decision matrix across the uplift bands
and the formal-field presence check. These tests have no dspy/torch dependency.
"""

import pytest

from distiller.odf.promotion_gate import (
    PROMOTE_THRESHOLD_PCT,
    REJECT_THRESHOLD_PCT,
    CandidateMetadata,
    PromotionDecision,
    evaluate,
    evaluate_promotion,
)

# A complete, valid formal contract reused across cases.
_THEOREMS = ["Atlas.RealAnalysis.ContinuousFunction"]
_PROPS = ["energy_continuity: proved via Atlas.RealAnalysis"]


def _candidate(uplift, *, theorems=_THEOREMS, props=_PROPS, version=1):
    return CandidateMetadata(
        model_id="mace-mp-small-ni",
        distill_version=version,
        overall_uplift_pct=uplift,
        atlas_theorem_refs=list(theorems),
        formal_properties=list(props),
    )


class TestUpliftBandsWithFormalFields:
    """With a complete formal contract, decision follows the uplift band."""

    def test_promote_above_5pct(self):
        result = evaluate(_candidate(7.5))
        assert result.decision is PromotionDecision.PROMOTE
        assert result.uplift_band == "promote"
        assert result.formal_fields_present is True

    def test_review_in_zero_to_five(self):
        result = evaluate(_candidate(3.0))
        assert result.decision is PromotionDecision.REVIEW
        assert result.uplift_band == "review"

    def test_reject_below_zero(self):
        result = evaluate(_candidate(-2.0))
        assert result.decision is PromotionDecision.REJECT
        assert result.uplift_band == "reject"


class TestBoundaries:
    """Exact-threshold behavior: > +5 promotes, the endpoints are review."""

    def test_exactly_five_is_review(self):
        # 5.0 is NOT > 5.0, so it falls in the review band.
        assert evaluate(_candidate(PROMOTE_THRESHOLD_PCT)).decision is PromotionDecision.REVIEW

    def test_just_above_five_is_promote(self):
        assert evaluate(_candidate(PROMOTE_THRESHOLD_PCT + 0.01)).decision is PromotionDecision.PROMOTE

    def test_exactly_zero_is_review(self):
        # 0.0 is NOT < 0.0, so it is the bottom of the review band.
        assert evaluate(_candidate(REJECT_THRESHOLD_PCT)).decision is PromotionDecision.REVIEW

    def test_just_below_zero_is_reject(self):
        assert evaluate(_candidate(REJECT_THRESHOLD_PCT - 0.01)).decision is PromotionDecision.REJECT


class TestFormalFieldDowngrades:
    """Missing formal fields downgrade the uplift-only decision."""

    def test_promote_downgrades_to_review_without_theorems(self):
        result = evaluate(_candidate(9.0, theorems=[]))
        assert result.decision is PromotionDecision.REVIEW
        assert result.formal_fields_present is False
        assert any("atlas_theorem_refs is empty" in r for r in result.reasons)

    def test_promote_downgrades_to_review_without_properties(self):
        result = evaluate(_candidate(9.0, props=[]))
        assert result.decision is PromotionDecision.REVIEW
        assert result.formal_fields_present is False

    def test_review_downgrades_to_reject_without_formal_fields(self):
        result = evaluate(_candidate(2.0, theorems=[], props=[]))
        assert result.decision is PromotionDecision.REJECT

    def test_reject_stays_reject_without_formal_fields(self):
        result = evaluate(_candidate(-5.0, theorems=[], props=[]))
        assert result.decision is PromotionDecision.REJECT


class TestMissingUplift:
    def test_none_uplift_rejects(self):
        result = evaluate(_candidate(None))
        assert result.decision is PromotionDecision.REJECT
        assert result.uplift_band == "missing"
        assert any("missing" in r.lower() for r in result.reasons)


class TestBoundaryValidation:
    """evaluate_promotion validates raw, untrusted metadata."""

    def test_valid_mapping(self):
        result = evaluate_promotion(
            {
                "model_id": "m",
                "distill_version": 2,
                "overall_uplift_pct": 6.0,
                "atlas_theorem_refs": _THEOREMS,
                "formal_properties": _PROPS,
            }
        )
        assert result.decision is PromotionDecision.PROMOTE

    def test_extra_keys_ignored(self):
        # extra="ignore" — benchmark payloads may carry unrelated keys.
        result = evaluate_promotion(
            {
                "model_id": "m",
                "distill_version": 0,
                "overall_uplift_pct": 6.0,
                "atlas_theorem_refs": _THEOREMS,
                "formal_properties": _PROPS,
                "backend": "torchsim",
                "results": {},
            }
        )
        assert result.decision is PromotionDecision.PROMOTE

    def test_missing_required_field_raises(self):
        with pytest.raises(ValueError):
            evaluate_promotion({"distill_version": 1})  # no model_id

    def test_negative_version_raises(self):
        with pytest.raises(ValueError):
            evaluate_promotion({"model_id": "m", "distill_version": -1})

    def test_result_is_json_serializable(self):
        result = evaluate(_candidate(6.0))
        d = result.to_dict()
        assert d["decision"] == "promote"
        assert d["model_id"] == "mace-mp-small-ni"
        assert isinstance(d["reasons"], list)
