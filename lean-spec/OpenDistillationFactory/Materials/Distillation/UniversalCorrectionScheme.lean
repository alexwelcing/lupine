import Mathlib.Analysis.InnerProductSpace.Basic
import OpenDistillationFactory.Materials.Distillation.DirectionalCorrectionScheme
import OpenDistillationFactory.Materials.Distillation.SubspaceCorrectionScheme

/-! # Universal correction scheme

A universality theorem connecting the directional and subspace correction
schemes.  It shows that the subspace scheme is the natural universal
finite-dimensional generalization of the directional scheme:

* Every directional scheme embeds into a one-dimensional subspace scheme with
  identical corrections.
* Therefore the subspace minimality theorem implies the directional minimality
  theorem as a special case.
* More generally, any finite list of correction directions per class is handled
  by the same orthogonal-projection construction, and the corrected residual is
  optimal in that subspace.

This is the formal statement that lets the same Rust/Python operator correct
elastic tensors, high-dimensional molecular fingerprints, forces, or any other
inner-product feature space without changing the proof.

House rules: zero `sorry`, zero new axioms.
-/

set_option linter.unusedSectionVars false

namespace OpenDistillationFactory.Materials.Distillation

open scoped RealInnerProductSpace

variable {E : Type*} [NormedAddCommGroup E] [InnerProductSpace ℝ E] [CompleteSpace E]

namespace DirectionalCorrectionScheme

/-- Embed a directional scheme into a subspace scheme whose class subspace is
spanned by the single class direction. -/
def toSubspace (scheme : DirectionalCorrectionScheme E ι) : SubspaceCorrectionScheme E ι where
  directions c := [scheme.direction c]

section ResidualEq
variable {E : Type*} [NormedAddCommGroup E]

/-- The two residual definitions are syntactically different constants but
compute the same vector. -/
theorem residual_eq (raw shift target : E) :
    DirectionalCorrectionScheme.residual raw shift target =
      SubspaceCorrectionScheme.residual raw shift target := by
  simp [DirectionalCorrectionScheme.residual, SubspaceCorrectionScheme.residual]

end ResidualEq

/-- The embedded subspace scheme has the same corrected residual as the original
directional scheme. -/
theorem toSubspace_correctedResidual_eq (scheme : DirectionalCorrectionScheme E ι) (c : ι)
    (raw shift target : E) :
    scheme.toSubspace.correctedResidual c raw shift target =
      scheme.correctedResidual c raw shift target := by
  set v := SubspaceCorrectionScheme.residual raw shift target
  set K := scheme.toSubspace.subspace c
  have hK_eq {x} : x ∈ K ↔ x ∈ Submodule.span ℝ {scheme.direction c} := by
    simp [K, SubspaceCorrectionScheme.subspace, toSubspace]
  have hproj : K.orthogonalProjectionFn v = scheme.projectClass c v := by
    apply Submodule.eq_orthogonalProjectionFn_of_mem_of_inner_eq_zero
    · -- `scheme.projectClass c v` lies in `K`.
      rw [hK_eq]
      apply Submodule.mem_span_singleton.mpr
      use scheme.alpha c v
      simp [projectClass]
    · -- The residual after the directional correction is orthogonal to `K`.
      intro w hw
      rw [hK_eq] at hw
      rcases Submodule.mem_span_singleton.mp hw with ⟨t, rfl⟩
      simp only [projectClass, alpha]
      split_ifs with hden
      · -- Degenerate direction: `scheme.direction c = 0` and the claim is trivial.
        have hd0 : scheme.direction c = 0 := by
          have hnorm : ‖scheme.direction c‖ ^ 2 = 0 := by
            rw [← real_inner_self_eq_norm_sq]
            exact hden
          have hnorm0 : ‖scheme.direction c‖ = 0 := eq_zero_of_pow_eq_zero hnorm
          exact norm_eq_zero.mp hnorm0
        simp [hd0]
      · -- Non-degenerate direction: the projection cancels the direction component.
        have hnorm : ‖scheme.direction c‖ ≠ 0 := by
          intro h
          have h0 : inner ℝ (scheme.direction c) (scheme.direction c) = 0 := by
            rw [real_inner_self_eq_norm_sq]
            rw [h]
            norm_num
          contradiction
        simp [inner_sub_left, real_inner_smul_left, real_inner_smul_right]
        ring_nf
        field_simp [real_inner_self_eq_norm_sq, hnorm]
        ring
  simp only [SubspaceCorrectionScheme.correctedResidual, SubspaceCorrectionScheme.correct,
             DirectionalCorrectionScheme.correctedResidual, DirectionalCorrectionScheme.correct]
  rw [residual_eq, hproj]

/-- The subspace minimality theorem implies the directional minimality theorem.
This is the universality statement: a one-dimensional subspace correction is
just a directional correction, and the general subspace theorem covers it. -/
theorem directional_minimality_from_subspace (scheme : DirectionalCorrectionScheme E ι) (c : ι)
    (raw shift target : E) (a : ℝ) :
    ‖scheme.correctedResidual c raw shift target‖ ≤
      ‖target - (raw + shift + a • scheme.direction c)‖ := by
  rw [← toSubspace_correctedResidual_eq]
  have hy : a • scheme.direction c ∈ scheme.toSubspace.subspace c := by
    simp [toSubspace, SubspaceCorrectionScheme.subspace]
    exact Submodule.smul_mem _ _ (Submodule.subset_span (Set.mem_singleton _))
  apply SubspaceCorrectionScheme.correct_minimizes scheme.toSubspace c raw shift target hy

end DirectionalCorrectionScheme

end OpenDistillationFactory.Materials.Distillation
