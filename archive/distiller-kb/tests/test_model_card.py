"""Tests for the theorem-aware OperatorPack model-card emitter (§13.2)."""

import json

import pytest

from distiller.odf.model_card import ModelCard, TheoremInventory, emit_model_card


# The exact example from ATLAS_Lean_Integration_Review.md §13.2.
_SPEC_EXAMPLE = {
    "model_id": "mace-mp-small-ni",
    "distill_version": 3,
    "atlas_dependencies": [
        "Atlas.RealAnalysis.ContinuousFunction",
        "Atlas.DifferentialGeometry.SmoothManifold",
        "Atlas.AlgebraNotes.GroupRepresentation",
    ],
    "formal_properties_verified": [
        "energy_continuity: proved via Atlas.RealAnalysis",
        "descriptor_equivariance: proved via Atlas.AlgebraNotes",
        "force_conservativity: proved via Atlas.DifferentialGeometry",
    ],
    "theorem_inventory": {"imported": 12, "extended": 3, "novel": 1},
}


class TestModelCardShape:
    def test_matches_spec_example_exactly(self):
        card = emit_model_card(
            model_id=_SPEC_EXAMPLE["model_id"],
            distill_version=_SPEC_EXAMPLE["distill_version"],
            atlas_dependencies=_SPEC_EXAMPLE["atlas_dependencies"],
            formal_properties_verified=_SPEC_EXAMPLE["formal_properties_verified"],
            theorem_inventory=_SPEC_EXAMPLE["theorem_inventory"],
        )
        assert card.to_dict() == _SPEC_EXAMPLE

    def test_to_json_is_valid_json_and_roundtrips(self):
        card = emit_model_card(
            model_id="m",
            distill_version=1,
            atlas_dependencies=["Atlas.RealAnalysis.Continuity"],
            formal_properties_verified=["energy_continuity: proved"],
            theorem_inventory={"imported": 1, "extended": 0, "novel": 0},
        )
        text = card.to_json()
        parsed = json.loads(text)  # raises if not valid JSON
        assert parsed["model_id"] == "m"
        assert parsed["theorem_inventory"]["imported"] == 1

    def test_keys_present_and_ordered(self):
        card = emit_model_card(model_id="m", distill_version=0)
        keys = list(card.to_dict().keys())
        assert keys == [
            "model_id",
            "distill_version",
            "atlas_dependencies",
            "formal_properties_verified",
            "theorem_inventory",
        ]

    def test_defaults_are_empty_and_zeroed(self):
        card = emit_model_card(model_id="m", distill_version=0)
        d = card.to_dict()
        assert d["atlas_dependencies"] == []
        assert d["formal_properties_verified"] == []
        assert d["theorem_inventory"] == {"imported": 0, "extended": 0, "novel": 0}


class TestInventoryInput:
    def test_accepts_typed_inventory(self):
        inv = TheoremInventory(imported=5, extended=2, novel=1)
        card = emit_model_card(model_id="m", distill_version=2, theorem_inventory=inv)
        assert card.theorem_inventory.imported == 5

    def test_negative_count_rejected(self):
        with pytest.raises(Exception):
            TheoremInventory(imported=-1)


class TestImmutability:
    def test_card_is_frozen(self):
        card = emit_model_card(model_id="m", distill_version=0)
        with pytest.raises(Exception):
            card.model_id = "other"  # frozen pydantic -> ValidationError

    def test_empty_model_id_rejected(self):
        with pytest.raises(Exception):
            ModelCard(model_id="", distill_version=0)
