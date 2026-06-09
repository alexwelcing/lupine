import Mathlib.Data.Real.Basic
import Mathlib.Tactic.Linarith

namespace OpenDistillationFactory.Materials.Theory.WeakAcceleration

/--
Scalar certificate for the weak acceleration/refusal form.

This is intentionally independent of any Vandermonde or Fisher-spectrum decay
rate. The Kimi evidence import refutes the old rho >= 1.5 threshold for both
parameter-basis and MACE irrep-basis tests, so this module isolates the part of
the acceleration claim that only depends on geometric coverage, reach, and a
thresholded refusal policy.
-/
structure WeakAccelerationCertificate where
  layers : Real
  stopLayer : Real
  coverage : Real
  threshold : Real
  reach : Real

/-- Remaining layer fraction skipped after refusing at `stopLayer`. -/
noncomputable def savedLayerFraction (c : WeakAccelerationCertificate) : Real :=
  (c.layers - c.stopLayer) / c.layers

/-- Fraction of inputs outside the covered training support. -/
noncomputable def uncoveredMass (c : WeakAccelerationCertificate) : Real :=
  1 - c.coverage

/-- Reach-based lower bound on the probability an uncovered point is caught. -/
noncomputable def catchProbability (c : WeakAccelerationCertificate) : Real :=
  1 - c.threshold / (c.threshold + c.reach)

/-- Weak-form expected speedup lower bound. -/
noncomputable def weakSpeedupLowerBound (c : WeakAccelerationCertificate) : Real :=
  1 + savedLayerFraction c * uncoveredMass c * catchProbability c

/--
The weak geometric gate. It has no spectral-decay field by design.
-/
def weakGeometricConditions (c : WeakAccelerationCertificate) : Prop :=
  0 < c.layers ∧
  c.stopLayer <= c.layers ∧
  c.coverage <= 1 ∧
  0 < c.threshold ∧
  0 < c.reach

theorem savedLayerFraction_nonneg
    (c : WeakAccelerationCertificate)
    (hLayers : 0 < c.layers)
    (hStop : c.stopLayer <= c.layers) :
    0 <= savedLayerFraction c := by
  unfold savedLayerFraction
  exact div_nonneg (by linarith) hLayers.le

theorem uncoveredMass_nonneg
    (c : WeakAccelerationCertificate)
    (hCoverage : c.coverage <= 1) :
    0 <= uncoveredMass c := by
  unfold uncoveredMass
  linarith

theorem catchProbability_nonneg
    (c : WeakAccelerationCertificate)
    (hThreshold : 0 < c.threshold)
    (hReach : 0 < c.reach) :
    0 <= catchProbability c := by
  unfold catchProbability
  have hsum : 0 < c.threshold + c.reach := by linarith
  have hratio : c.threshold / (c.threshold + c.reach) <= 1 := by
    rw [div_le_one hsum]
    linarith
  linarith

/--
Weak acceleration never lowers the theorem-shaped speedup bound below baseline
when the geometric certificate is valid.
-/
theorem weakSpeedup_ge_one
    (c : WeakAccelerationCertificate)
    (h : weakGeometricConditions c) :
    1 <= weakSpeedupLowerBound c := by
  rcases h with ⟨hLayers, hStop, hCoverage, hThreshold, hReach⟩
  unfold weakSpeedupLowerBound
  have hs := savedLayerFraction_nonneg c hLayers hStop
  have hu := uncoveredMass_nonneg c hCoverage
  have hc := catchProbability_nonneg c hThreshold hReach
  nlinarith [mul_nonneg (mul_nonneg hs hu) hc]

/--
The weak-form theorem is compatible with a failed spectral threshold. The
spectral variables are deliberately unused: they can fail without invalidating
the geometric lower-bound gate.
-/
theorem weakSpeedup_ge_one_despite_spectral_failure
    (c : WeakAccelerationCertificate)
    (rho spectralThreshold : Real)
    (_hSpectralFails : rho < spectralThreshold)
    (h : weakGeometricConditions c) :
    1 <= weakSpeedupLowerBound c := by
  exact weakSpeedup_ge_one c h

/--
The weak form has no hidden rho premise: changing a spectral estimate leaves the
weak geometric predicate unchanged.
-/
theorem weakConditions_independent_of_rho
    (c : WeakAccelerationCertificate)
    (_rhoBefore _rhoAfter : Real)
    (h : weakGeometricConditions c) :
    weakGeometricConditions c := by
  exact h

/-- A valid weak certificate with any positive catch mass gives nonnegative lift. -/
theorem weakSpeedup_lift_nonneg
    (c : WeakAccelerationCertificate)
    (h : weakGeometricConditions c) :
    0 <= weakSpeedupLowerBound c - 1 := by
  have hOne := weakSpeedup_ge_one c h
  linarith

end OpenDistillationFactory.Materials.Theory.WeakAcceleration
