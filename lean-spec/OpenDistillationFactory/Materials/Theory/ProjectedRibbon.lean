import OpenDistillationFactory.Materials.Theory.AccuracyCommitment
import Mathlib.Data.Real.Basic
import Mathlib.Tactic.Linarith

namespace OpenDistillationFactory.Materials.Theory.ProjectedRibbon

/--
Scalar certificate for a projected hyper-ribbon candidate.

The runtime computes these values from SVD/projection diagnostics. The Lean
layer only proves the gate logic: if a runtime packet supplies a certificate
that satisfies these scalar predicates, then the release claim stays inside the
projection tube and accuracy commitment boundaries.
-/
structure ProjectedRibbonCertificate where
  complementFraction : Real
  stiffFraction : Real
  projectionDistance : Real
  stiffDrift : Real
  projectedSupportLift : Real
  supportErrorBefore : Real
  maxProjectionDistance : Real
  maxStiffDrift : Real
  minSupportLift : Real
  minSupportErrorBefore : Real

/-- Complement dominance: useful correction mass is at least half of the split. -/
def complementDominant (c : ProjectedRibbonCertificate) : Prop :=
  0 <= c.complementFraction ∧
  0 <= c.stiffFraction ∧
  c.complementFraction + c.stiffFraction = 1 ∧
  (1 / 2 : Real) <= c.complementFraction

/-- Projection-tube condition: correction is close to the projected lane. -/
def insideProjectionTube (c : ProjectedRibbonCertificate) : Prop :=
  c.projectionDistance <= c.maxProjectionDistance ∧
  c.stiffDrift <= c.maxStiffDrift

/-- Runtime support lift must clear the selected minimum lift. -/
def supportLiftOk (c : ProjectedRibbonCertificate) : Prop :=
  c.minSupportLift <= c.projectedSupportLift

/-- Support-error floor: avoid claiming lift where the baseline error is tiny. -/
def supportFloorSatisfied (c : ProjectedRibbonCertificate) : Prop :=
  c.minSupportErrorBefore <= c.supportErrorBefore

/-- Accepted projected-ribbon gate, as a structural predicate over a certificate. -/
def acceptsProjectedRibbon (c : ProjectedRibbonCertificate) : Prop :=
  complementDominant c ∧
  insideProjectionTube c ∧
  supportLiftOk c ∧
  supportFloorSatisfied c

/--
If complement mass is at least half of the normalized split, stiff-axis mass is
bounded by complement mass.
-/
theorem complement_dominance_bounds_stiff
    (c : ProjectedRibbonCertificate)
    (h : complementDominant c) :
    c.stiffFraction <= c.complementFraction := by
  rcases h with ⟨_hc0, _hs0, hsum, hcHalf⟩
  linarith

/-- Accepted certificates are inside the projection-distance tube. -/
theorem accepted_projection_distance_bounded
    (c : ProjectedRibbonCertificate)
    (h : acceptsProjectedRibbon c) :
    c.projectionDistance <= c.maxProjectionDistance := by
  exact h.2.1.1

/-- Accepted certificates have bounded stiff-axis drift. -/
theorem accepted_stiff_drift_bounded
    (c : ProjectedRibbonCertificate)
    (h : acceptsProjectedRibbon c) :
    c.stiffDrift <= c.maxStiffDrift := by
  exact h.2.1.2

/-- Accepted certificates clear the support-lift threshold. -/
theorem accepted_support_lift_ok
    (c : ProjectedRibbonCertificate)
    (h : acceptsProjectedRibbon c) :
    c.minSupportLift <= c.projectedSupportLift := by
  exact h.2.2.1

/-- Accepted certificates satisfy the support-error floor. -/
theorem accepted_support_floor_satisfied
    (c : ProjectedRibbonCertificate)
    (h : acceptsProjectedRibbon c) :
    c.minSupportErrorBefore <= c.supportErrorBefore := by
  exact h.2.2.2

/-- Projection-tube refusal: outside the distance tube cannot be accepted. -/
theorem projection_tube_refuses_outside_distance
    (c : ProjectedRibbonCertificate)
    (hOutside : c.maxProjectionDistance < c.projectionDistance) :
    ¬ acceptsProjectedRibbon c := by
  intro h
  have hBound := accepted_projection_distance_bounded c h
  linarith

/-- Projection-tube refusal: excessive stiff-axis drift cannot be accepted. -/
theorem projection_tube_refuses_stiff_drift
    (c : ProjectedRibbonCertificate)
    (hDrift : c.maxStiffDrift < c.stiffDrift) :
    ¬ acceptsProjectedRibbon c := by
  intro h
  have hBound := accepted_stiff_drift_bounded c h
  linarith

/--
The release theorem remains conditional on measured improvement: if runtime
evidence shows the distilled error beats baseline, the existing accuracy
commitment yields a positive accuracy gain.
-/
theorem accepted_projected_win_has_positive_accuracy_gain
    (c : ProjectedRibbonCertificate)
    (_h : acceptsProjectedRibbon c)
    (baselineErr distillErr : Real)
    (hImproves : distillErr < baselineErr) :
    0 < AccuracyCommitment.accuracyGain baselineErr distillErr := by
  rw [AccuracyCommitment.accuracyGain_pos_iff_improves]
  exact hImproves

/--
Measured projected-ribbon wins also inherit the existing operative-value bridge.
The certificate gates the release lane; the measured inequality supplies the
scientific win.
-/
theorem accepted_projected_win_has_positive_operative_value
    (c : ProjectedRibbonCertificate)
    (_h : acceptsProjectedRibbon c)
    (baselineErr distillErr : Real)
    (hNonneg : 0 <= distillErr)
    (hImproves : distillErr < baselineErr) :
    ContextSpecificProof.operativeValue 0 baselineErr (distillErr - baselineErr) > 0 := by
  exact AccuracyCommitment.distill_win_has_positive_operative_value
    baselineErr distillErr hNonneg hImproves

end OpenDistillationFactory.Materials.Theory.ProjectedRibbon
