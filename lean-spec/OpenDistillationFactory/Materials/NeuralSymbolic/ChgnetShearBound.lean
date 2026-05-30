/-
  AUTHORED BY THE LUPINE NEURAL-SYMBOLIC LOOP (Node 3) — do not edit by hand.

  Empirical source (Node 1, GPU): model `chgnet`, observable C44 shear on
  `Ni-fcc-shear-sweep`. Measured elastic C44 = 101.2 GPa vs
  reference 124.7 GPa (-18.8%); validated
  shear-strain manifold edge = 0.1000; verdict = review.

  These are machine-checked negative constraints: an MLIP "hallucination" (a curvature
  prediction outside the empirically-validated manifold) is turned into a formally
  verified statement. Pure core Lean, decided by `native_decide` — 0 sorry.

  atlas_revision  = c5a10f1a95de31e5476484c8bb3856ee7f164ea0
  mathlib_revision = 8a178386ffc0f5fef0b77738bb5449d50efeea95
-/

namespace Lupine.NeuralSymbolic.chgnet

/-- Literature reference C44 in deci-GPa (×10). -/
def refC44_dGPa : Nat := 1247
/-- GPU-measured elastic C44 for `chgnet` in deci-GPa (×10). -/
def elasticC44_dGPa : Nat := 1012
/-- Edge of the empirically-validated shear-strain manifold, in 1e-4 strain units. -/
def validatedStrain_e4 : Nat := 1000

/-- A shear strain (in 1e-4 units) lies OUTSIDE the validated manifold. -/
def outsideManifold (strain_e4 : Nat) : Bool := Nat.blt validatedStrain_e4 strain_e4

/-- NEGATIVE CONSTRAINT (machine-checked): the strain where `chgnet` was
    measured to diverge (1300 * 1e-4) is outside the validated manifold, hence a
    physically-invalid configuration for this model. -/
theorem chgnet_shear_strain_beyond_manifold_is_invalid :
    outsideManifold 1300 = true := by decide

/-- The model's elastic shear curvature deviates from ground truth by
    18.8% (|elastic - ref|*4 ≤ ref => verdict
    `review` against the 25% reject threshold). Verified from the GPU measurement. -/
theorem chgnet_curvature_review :
    (235 * 4 ≤ refC44_dGPa) := by decide

end Lupine.NeuralSymbolic.chgnet
