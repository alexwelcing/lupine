import Mathlib.Analysis.InnerProductSpace.Basic
import OpenDistillationFactory.Materials.Theory.ProjectionLaw

/-! # Directional class-aware correction scheme

A first-principles universal operator that assigns to each class a single
correction direction.  The correction is the scalar projection of the
residual-after-shift onto that direction.

This is the natural abstraction above the v0.2 scalar-bulk operator:
- scalar-bulk       → every class shares the bulk-modulus direction;
- global LOO-PCA    → every class shares the first principal component;
- class-aware       → each class gets its own direction;
- identity          → all directions are zero.

Because the correction subspace is one-dimensional, the construction needs no
completeness assumptions and the proofs are purely algebraic.

The file proves:
1. The class-specific scalar minimizes the squared residual in its direction.
2. Outliers are samples whose corrected residual exceeds a class threshold.
3. An oracle offset (the exact residual) drives the residual to zero.
4. A class-aware scheme equals a global scheme when its direction coincides
   with the shared global direction.

House rules: zero `sorry`, zero new axioms.
-/

namespace OpenDistillationFactory.Materials.Distillation

open scoped RealInnerProductSpace

variable {E : Type*} [NormedAddCommGroup E] [InnerProductSpace ℝ E]

/-- A directional correction scheme assigns one correction direction to each
class.  `E` is the ambient normed inner-product space. -/
structure DirectionalCorrectionScheme (E : Type*) (ι : Type*) where
  direction : ι → E

namespace DirectionalCorrectionScheme

/-- Residual after applying the known functional shift. -/
def residual (raw shift target : E) : E := target - (raw + shift)

/-- Scalar coefficient that minimizes `‖v - a • direction‖` over `a : ℝ`. -/
noncomputable def alpha (scheme : DirectionalCorrectionScheme E ι) (c : ι) (v : E) : ℝ :=
  let d := scheme.direction c
  let den := inner ℝ d d
  if den = 0 then 0 else inner ℝ v d / den

/-- Project `v` onto the class direction. -/
noncomputable def projectClass (scheme : DirectionalCorrectionScheme E ι) (c : ι) (v : E) : E :=
  scheme.alpha c v • scheme.direction c

/-- Apply the directional correction after the functional shift. -/
noncomputable def correct (scheme : DirectionalCorrectionScheme E ι) (c : ι)
    (raw shift target : E) : E :=
  raw + shift + scheme.projectClass c (residual raw shift target)

/-- The corrected residual is the true target minus the corrected prediction. -/
noncomputable def correctedResidual (scheme : DirectionalCorrectionScheme E ι) (c : ι)
    (raw shift target : E) : E :=
  target - scheme.correct c raw shift target

/-- The chosen scalar is the exact minimizer of the squared residual along the
class direction. -/
theorem alpha_minimizes (scheme : DirectionalCorrectionScheme E ι) (c : ι) (v : E) (a : ℝ) :
    ‖v - scheme.alpha c v • scheme.direction c‖ ≤ ‖v - a • scheme.direction c‖ := by
  set d := scheme.direction c with hd
  set α := scheme.alpha c v with hα
  set den := inner ℝ d d with hden
  by_cases hden0 : den = 0
  · -- Degenerate direction: d = 0, so every scalar gives the same residual v.
    have hd0 : d = 0 := by
      have h1 : ‖d‖ ^ 2 = 0 := by
        have h2 : inner ℝ d d = 0 := hden0
        have h3 : inner ℝ d d = ‖d‖ ^ 2 := real_inner_self_eq_norm_sq d
        linarith
      have h4 : ‖d‖ = 0 := eq_zero_of_pow_eq_zero h1
      exact norm_eq_zero.mp h4
    simp [hd0]
  · -- Non-degenerate direction: the residual gap is den·(a − α)².
    have hα_eq : α = inner ℝ v d / den := by
      rw [hα, alpha, if_neg hden0]
    have h_norm_smul_sq (t : ℝ) (x : E) : ‖t • x‖ ^ 2 = t ^ 2 * ‖x‖ ^ 2 := by
      calc
        ‖t • x‖ ^ 2 = inner ℝ (t • x) (t • x) := by rw [←real_inner_self_eq_norm_sq]
        _ = t ^ 2 * inner ℝ x x := by
          rw [real_inner_smul_left, real_inner_smul_right]
          ring
        _ = t ^ 2 * ‖x‖ ^ 2 := by rw [real_inner_self_eq_norm_sq]
    have h_norm_d_sq : ‖d‖ ^ 2 = den := by
      rw [hden]
      exact (real_inner_self_eq_norm_sq d).symm
    have h_gap : ‖v - a • d‖ ^ 2 - ‖v - α • d‖ ^ 2 = den * (a - α) ^ 2 := by
      rw [norm_sub_sq_real, norm_sub_sq_real, hα_eq]
      simp only [real_inner_smul_right, h_norm_smul_sq, h_norm_d_sq]
      field_simp [hden0]
      ring
    have h_nonneg : 0 ≤ den * (a - α) ^ 2 := by
      apply mul_nonneg
      · -- `inner_self_nonneg` is generic; use the norm-square form instead.
        have h : 0 ≤ inner ℝ d d := by
          rw [real_inner_self_eq_norm_sq d]
          exact sq_nonneg _
        simp [den]
      · exact sq_nonneg _
    have h_le : ‖v - α • d‖ ^ 2 ≤ ‖v - a • d‖ ^ 2 := by linarith [h_gap, h_nonneg]
    have h_sqrt : Real.sqrt (‖v - α • d‖ ^ 2) ≤ Real.sqrt (‖v - a • d‖ ^ 2) :=
      Real.sqrt_le_sqrt h_le
    rw [Real.sqrt_sq (norm_nonneg _), Real.sqrt_sq (norm_nonneg _)] at h_sqrt
    exact h_sqrt

/-- The corrected residual is minimal among all scalar multiples of the class
direction. -/
theorem correct_minimizes (scheme : DirectionalCorrectionScheme E ι) (c : ι)
    (raw shift target : E) (a : ℝ) :
    ‖scheme.correctedResidual c raw shift target‖ ≤
      ‖target - (raw + shift + a • scheme.direction c)‖ := by
  have h1 : scheme.correctedResidual c raw shift target =
      residual raw shift target - scheme.alpha c (residual raw shift target) • scheme.direction c := by
    simp [correctedResidual, correct, projectClass, residual]
    abel
  have h2 : target - (raw + shift + a • scheme.direction c) =
      residual raw shift target - a • scheme.direction c := by
    simp [residual]
    abel
  rw [h1, h2]
  apply scheme.alpha_minimizes c (residual raw shift target) a

/-- A sample is an outlier for class `c` when its corrected residual norm
exceeds a class-specific threshold `τ`. -/
def isOutlier (scheme : DirectionalCorrectionScheme E ι) (c : ι)
    (raw shift target : E) (τ : ℝ) : Prop :=
  τ < ‖scheme.correctedResidual c raw shift target‖

set_option linter.unusedSectionVars false in
/-- Oracle offset: adding the exact residual-after-shift to the shifted
prediction eliminates error. -/
theorem oracle_offset_zero_residual (raw shift target : E) :
    target - (raw + shift + residual raw shift target) = 0 := by
  simp [residual]

/-- If the class direction equals a shared global direction, the class-aware and
global corrected residuals coincide. -/
theorem class_aware_eq_global {ι : Type*} {scheme : DirectionalCorrectionScheme E ι} {c : ι}
    {d0 : E} (h : scheme.direction c = d0) (raw shift target : E) :
    let global := DirectionalCorrectionScheme.mk (fun (_ : ι) => d0)
    scheme.correctedResidual c raw shift target =
      global.correctedResidual c raw shift target := by
  intro global
  have hglobal : global.direction c = d0 := rfl
  simp [correctedResidual, correct, projectClass, alpha]
  simp_rw [h, hglobal]

end DirectionalCorrectionScheme

end OpenDistillationFactory.Materials.Distillation
