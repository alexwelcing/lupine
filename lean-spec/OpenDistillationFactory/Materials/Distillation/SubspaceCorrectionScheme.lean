import Mathlib.Analysis.InnerProductSpace.Basic
import Mathlib.Analysis.InnerProductSpace.Projection.Basic
import Mathlib.Analysis.Normed.Module.FiniteDimension
import Mathlib.LinearAlgebra.FiniteDimensional.Defs
import Mathlib.Topology.Algebra.Module.FiniteDimension
import Mathlib.Data.Set.Finite.List

/-! # Subspace correction scheme

Extension of the directional correction scheme to a *finite-dimensional*
subspace of correction directions per class.  This is the natural next step
when a single direction (e.g. bulk modulus) leaves a structured residual: the
residual is projected onto the subspace spanned by several physically motivated
directions, and the correction is the best approximation of the residual inside
that subspace.

The file proves the two core properties of orthogonal projection:

1. The corrected residual is minimal among all corrections drawn from the
   subspace.
2. The corrected residual is orthogonal to every direction in the subspace.

Because the construction uses the bundled orthogonal projection on a complete
finite-dimensional subspace, the proofs are purely algebraic (Pythagoras).

House rules: zero `sorry`, zero new axioms.
-/

namespace OpenDistillationFactory.Materials.Distillation

open scoped RealInnerProductSpace

variable {E : Type*} [NormedAddCommGroup E] [InnerProductSpace ℝ E] [CompleteSpace E]

/-- A subspace correction scheme assigns a finite list of correction directions
to each class.  The subspace used for correction is the real span of these
directions. -/
structure SubspaceCorrectionScheme (E : Type*) (ι : Type*) where
  directions : ι → List E

namespace SubspaceCorrectionScheme

/-- Residual after applying the known functional shift. -/
def residual (raw shift target : E) : E := target - (raw + shift)

/-- The correction subspace for class `c`. -/
def subspace (scheme : SubspaceCorrectionScheme E ι) (c : ι) : Submodule ℝ E :=
  Submodule.span ℝ {x | x ∈ scheme.directions c}

instance (scheme : SubspaceCorrectionScheme E ι) (c : ι) :
    FiniteDimensional ℝ (scheme.subspace c) := by
  refine FiniteDimensional.span_of_finite ℝ ?_
  exact List.finite_toSet (scheme.directions c : List E)

instance (scheme : SubspaceCorrectionScheme E ι) (c : ι) :
    CompleteSpace (scheme.subspace c) :=
  (Submodule.complete_of_finiteDimensional (scheme.subspace c)).completeSpace_coe

/-- Apply the subspace correction after the functional shift.  The correction is
the orthogonal projection of the residual-after-shift onto the class subspace. -/
noncomputable def correct (scheme : SubspaceCorrectionScheme E ι) (c : ι)
    (raw shift target : E) : E :=
  raw + shift + (scheme.subspace c).orthogonalProjectionFn (residual raw shift target)

/-- The corrected residual is the true target minus the corrected prediction. -/
noncomputable def correctedResidual (scheme : SubspaceCorrectionScheme E ι) (c : ι)
    (raw shift target : E) : E :=
  target - scheme.correct c raw shift target

set_option linter.unusedSectionVars false in
/-- The correction term used by the scheme lies in the class subspace. -/
theorem correction_mem_subspace (scheme : SubspaceCorrectionScheme E ι) (c : ι)
    (raw shift target : E) :
    (scheme.subspace c).orthogonalProjectionFn (residual raw shift target) ∈ scheme.subspace c := by
  exact Submodule.orthogonalProjectionFn_mem (residual raw shift target)

set_option linter.unusedSectionVars false in
/-- The corrected residual is orthogonal to every direction in the class
subspace. -/
theorem correctedResidual_orthogonal (scheme : SubspaceCorrectionScheme E ι) (c : ι)
    (raw shift target : E) {w : E} (hw : w ∈ scheme.subspace c) :
    inner ℝ (scheme.correctedResidual c raw shift target) w = 0 := by
  have horth := Submodule.orthogonalProjectionFn_inner_eq_zero (residual raw shift target) w hw
  have hrw : residual raw shift target - (scheme.subspace c).orthogonalProjectionFn (residual raw shift target) =
      scheme.correctedResidual c raw shift target := by
    simp [correctedResidual, correct]
    simp [residual]
    abel_nf
  rwa [hrw] at horth

set_option linter.unusedSectionVars false in
/-- The corrected residual is minimal among all corrections drawn from the class
subspace. -/
theorem correct_minimizes (scheme : SubspaceCorrectionScheme E ι) (c : ι)
    (raw shift target : E) {y : E} (hy : y ∈ scheme.subspace c) :
    ‖scheme.correctedResidual c raw shift target‖ ≤
      ‖target - (raw + shift + y)‖ := by
  set K := scheme.subspace c
  set v := residual raw shift target
  have hpK : K.orthogonalProjectionFn v ∈ K := Submodule.orthogonalProjectionFn_mem v
  have hpy : K.orthogonalProjectionFn v - y ∈ K := K.sub_mem hpK hy
  have horth : inner ℝ (v - K.orthogonalProjectionFn v) (K.orthogonalProjectionFn v - y) = 0 :=
    Submodule.orthogonalProjectionFn_inner_eq_zero v (K.orthogonalProjectionFn v - y) hpy
  have hpy_eq : v - y = (v - K.orthogonalProjectionFn v) + (K.orthogonalProjectionFn v - y) := by abel_nf
  have hsplit : ‖v - y‖ ^ 2 = ‖v - K.orthogonalProjectionFn v‖ ^ 2 + ‖K.orthogonalProjectionFn v - y‖ ^ 2 := by
    rw [hpy_eq]
    have h := norm_add_sq_eq_norm_sq_add_norm_sq_of_inner_eq_zero _ _ horth
    simp only [pow_two] at h ⊢
    exact h
  have hle : ‖v - K.orthogonalProjectionFn v‖ ^ 2 ≤ ‖v - y‖ ^ 2 := by
    linarith [hsplit, sq_nonneg (‖K.orthogonalProjectionFn v - y‖)]
  have heq1 : scheme.correctedResidual c raw shift target = v - K.orthogonalProjectionFn v := by
    rw [show v = residual raw shift target by rfl]
    have hproj : K.orthogonalProjectionFn (residual raw shift target) =
        (scheme.subspace c).orthogonalProjectionFn (residual raw shift target) := by
      simp [K]
    rw [hproj]
    simp [correctedResidual, correct]
    simp [residual]
    abel_nf
  have heq2 : target - (raw + shift + y) = v - y := by
    rw [show v = residual raw shift target by rfl]
    simp [residual]
    abel_nf
  have hle' : ‖scheme.correctedResidual c raw shift target‖ ^ 2 ≤ ‖target - (raw + shift + y)‖ ^ 2 := by
    rw [heq1, heq2]
    exact hle
  have hle'' : ‖scheme.correctedResidual c raw shift target‖ ≤ ‖target - (raw + shift + y)‖ := by
    set a := ‖scheme.correctedResidual c raw shift target‖ with ha
    set b := ‖target - (raw + shift + y)‖ with hb
    have hna : 0 ≤ a := by rw [ha]; exact norm_nonneg _
    have hnb : 0 ≤ b := by rw [hb]; exact norm_nonneg _
    have h : b ^ 2 - a ^ 2 = (b - a) * (b + a) := by ring
    have hpos : 0 ≤ b + a := by linarith [hna, hnb]
    have hdiff : 0 ≤ b - a := by nlinarith [hle', h, hpos, hna, hnb]
    linarith
  exact hle''

/-- **No-harm guarantee**: the corrected prediction is never farther from the
 target than the shifted (uncorrected) prediction.  This is the special case
 of `correct_minimizes` with `y = 0`. -/
theorem no_harm (scheme : SubspaceCorrectionScheme E ι) (c : ι)
    (raw shift target : E) :
    ‖scheme.correctedResidual c raw shift target‖ ≤ ‖residual raw shift target‖ := by
  have h := scheme.correct_minimizes c raw shift target (Submodule.zero_mem (scheme.subspace c))
  simpa [residual] using h

/-- A sample is an outlier for class `c` when the norm of its corrected residual
exceeds a threshold `τ`. -/
def isOutlier (scheme : SubspaceCorrectionScheme E ι) (c : ι)
    (raw shift target : E) (τ : ℝ) : Prop :=
  τ < ‖scheme.correctedResidual c raw shift target‖

set_option linter.unusedSectionVars false in
/-- Oracle offset: adding the exact residual-after-shift to the shifted
prediction eliminates error. -/
theorem oracle_offset_zero_residual (raw shift target : E) :
    target - (raw + shift + residual raw shift target) = 0 := by
  simp [residual]

end SubspaceCorrectionScheme

end OpenDistillationFactory.Materials.Distillation
