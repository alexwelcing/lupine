"""Theorem-aware OperatorPack model-card emitter.

Emits the formal-specification metadata that each promoted OperatorPack
artifact carries (ATLAS_Lean_Integration_Review.md §13.2, "Theorem-Aware
Model Cards"). The emitted JSON matches the spec exactly::

    {
      "model_id": "mace-mp-small-ni",
      "distill_version": 3,
      "atlas_dependencies": [
        "Atlas.RealAnalysis.ContinuousFunction",
        "Atlas.DifferentialGeometry.SmoothManifold",
        "Atlas.AlgebraNotes.GroupRepresentation"
      ],
      "formal_properties_verified": [
        "energy_continuity: proved via Atlas.RealAnalysis",
        "descriptor_equivariance: proved via Atlas.AlgebraNotes",
        "force_conservativity: proved via Atlas.DifferentialGeometry"
      ],
      "theorem_inventory": { "imported": 12, "extended": 3, "novel": 1 }
    }

Immutable by construction: the card is a frozen pydantic model; serialize it
with :meth:`ModelCard.to_json` / :meth:`ModelCard.to_dict`.
"""

from __future__ import annotations

import json
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class TheoremInventory(BaseModel):
    """Counts of theorems backing the model, by provenance."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    imported: int = Field(default=0, ge=0, description="Theorems imported verbatim from ATLAS/ODF")
    extended: int = Field(default=0, ge=0, description="Imported theorems extended for this model")
    novel: int = Field(default=0, ge=0, description="Brand-new theorems proved for this model")


class ModelCard(BaseModel):
    """Theorem-aware OperatorPack model card (the §13.2 JSON shape)."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    model_id: str = Field(..., min_length=1)
    distill_version: int = Field(..., ge=0)
    atlas_dependencies: list[str] = Field(
        default_factory=list,
        description="Fully-qualified ATLAS/ODF theorem names this model depends on.",
    )
    formal_properties_verified: list[str] = Field(
        default_factory=list,
        description="Proved properties, e.g. 'energy_continuity: proved via Atlas.RealAnalysis'.",
    )
    theorem_inventory: TheoremInventory = Field(default_factory=TheoremInventory)

    def to_dict(self) -> dict[str, Any]:
        """Return the canonical §13.2 JSON object as a plain dict."""
        return {
            "model_id": self.model_id,
            "distill_version": self.distill_version,
            "atlas_dependencies": list(self.atlas_dependencies),
            "formal_properties_verified": list(self.formal_properties_verified),
            "theorem_inventory": {
                "imported": self.theorem_inventory.imported,
                "extended": self.theorem_inventory.extended,
                "novel": self.theorem_inventory.novel,
            },
        }

    def to_json(self, *, indent: int | None = 2) -> str:
        """Serialize to a JSON string in the exact §13.2 field order."""
        return json.dumps(self.to_dict(), indent=indent)


def emit_model_card(
    *,
    model_id: str,
    distill_version: int,
    atlas_dependencies: list[str] | None = None,
    formal_properties_verified: list[str] | None = None,
    theorem_inventory: TheoremInventory | dict[str, int] | None = None,
) -> ModelCard:
    """Build a validated, immutable :class:`ModelCard`.

    ``theorem_inventory`` accepts either a :class:`TheoremInventory` or a plain
    ``{"imported": .., "extended": .., "novel": ..}`` dict (validated at the
    boundary). All list arguments default to empty lists.
    """
    if isinstance(theorem_inventory, TheoremInventory):
        inv = theorem_inventory
    elif theorem_inventory is None:
        inv = TheoremInventory()
    else:
        inv = TheoremInventory.model_validate(dict(theorem_inventory))

    return ModelCard(
        model_id=model_id,
        distill_version=distill_version,
        atlas_dependencies=list(atlas_dependencies or []),
        formal_properties_verified=list(formal_properties_verified or []),
        theorem_inventory=inv,
    )


__all__ = [
    "TheoremInventory",
    "ModelCard",
    "emit_model_card",
]
