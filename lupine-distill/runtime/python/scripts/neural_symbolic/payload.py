"""Shared payload contract for the neural-symbolic execution loop.

One immutable schema spoken by all three nodes:

    Node 1 (GPU physics)  --emits-->  CurvatureBoundaryPayload
    Node 2 (relay)        --routes-->  OpenInference span + JSON
    Node 3 (Lean synth)   --formalizes--> a native_decide theorem (0 sorry)

The payload captures, for one (model, observable, structure), the empirical
"validated manifold" of a curvature observable (here C44 shear) and the strain
boundary beyond which the model's prediction is physically invalid — the
negative constraint Node 3 turns into a machine-checked Lean theorem.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Verdict = Literal["promote", "review", "reject"]


class CurvatureSample(BaseModel):
    """One point on the shear stress/strain curve."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    shear_strain: float = Field(..., ge=0.0, description="Engineering shear strain (Voigt e6), dimensionless")
    shear_stress_gpa: float = Field(..., description="Predicted sigma_xy, GPa")
    tangent_c44_gpa: float = Field(..., description="Secant shear modulus sigma_xy/gamma, GPa")


class CurvatureBoundaryPayload(BaseModel):
    """The unit of neural->symbolic information flow."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    schema_version: Literal["lupine.neural_symbolic.curvature_boundary.v1"] = (
        "lupine.neural_symbolic.curvature_boundary.v1"
    )
    model_id: str = Field(..., min_length=1)
    observable: Literal["C44_shear"] = "C44_shear"
    structure_id: str = Field(..., min_length=1)

    reference_gpa: float = Field(..., gt=0.0, description="Literature ground-truth C44 (124.7 for Ni)")
    elastic_prediction_gpa: float = Field(..., description="Small-strain C44 the model predicts")
    elastic_deviation_pct: float = Field(..., description="(pred-ref)/ref * 100 at the elastic limit")

    # The validated manifold: [0, validated_strain_max] is where the model's secant
    # C44 stays within `reject_threshold_pct` of its own elastic value. Beyond
    # `divergence_strain` the prediction is invalid (the negative constraint).
    validated_strain_max: float = Field(..., ge=0.0)
    divergence_strain: float | None = Field(default=None, description="First strain that breaches the threshold; None if never")
    max_deviation_pct: float = Field(..., description="Peak |secant C44 - elastic C44| / elastic, over the swept range")
    reject_threshold_pct: float = Field(..., gt=0.0)

    verdict: Verdict
    samples: tuple[CurvatureSample, ...] = Field(default_factory=tuple)

    # OpenInference provenance (Node 2 stamps these onto the span).
    atlas_revision: str = Field(default="c5a10f1a95de31e5476484c8bb3856ee7f164ea0")
    mathlib_revision: str = Field(default="8a178386ffc0f5fef0b77738bb5449d50efeea95")

    def lean_theorem_name(self) -> str:
        """Deterministic, valid Lean identifier for the synthesized theorem."""
        safe_model = self.model_id.replace("-", "_").replace(".", "_")
        # strain encoded to 4 decimals as an int suffix (e.g. 0.0850 -> 850)
        strain = self.divergence_strain if self.divergence_strain is not None else self.validated_strain_max
        suffix = int(round(strain * 10000))
        return f"shear_manifold_invalid_{safe_model}_beyond_{suffix}"


__all__ = ["Verdict", "CurvatureSample", "CurvatureBoundaryPayload"]
