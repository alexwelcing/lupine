import Mathlib.Analysis.InnerProductSpace.Basic
import Mathlib.Analysis.InnerProductSpace.Projection.Basic
import Mathlib.Analysis.Normed.Module.FiniteDimension
import Mathlib.LinearAlgebra.FiniteDimensional.Defs
import Mathlib.Topology.Algebra.Module.FiniteDimension
import Mathlib.Data.Real.Basic
import Mathlib.Tactic.Ring
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.FieldSimp

/-! # Alloy residual-subspace transferability bound

When a correction operator is learned on one alloy class (the *source*) and
applied to another (the *target*), the remaining cross-class error is controlled
by the principal angle between the two classes' residual subspaces.

For a source residual subspace `U` and a target residual vector `v`, the
class-A correction is modelled as orthogonal projection onto `U`.  The
component of `v` that cannot be cancelled is exactly its orthogonal projection
onto `Uᗮ`, and its norm is `sin θ · ‖v‖`, where `θ` is the principal angle
between `U` and `span{v}`.

This gives a computable, first-principles bound: the cross-class transfer
error is at most the sine of the principal angle times the target residual
norm.  In the limit `θ → 0` the subspaces align and the transfer is exact;
when `θ` grows the uncorrected component grows with it.

House rules: zero `sorry`, zero new axioms.
-/

namespace OpenDistillationFactory.Materials.Theory.AlloyResidualTransfer

set_option linter.unusedSectionVars false

open scoped RealInnerProductSpace

variable {E : Type*} [NormedAddCommGroup E] [InnerProductSpace ℝ E] [CompleteSpace E]

/-- A residual subspace is the 1-D span of a nonzero residual vector.  This is
the simplest realistic geometry for an alloy class: all samples in the class
share one dominant residual direction. -/
def residualSubspace (r : E) : Submodule ℝ E :=
  Submodule.span ℝ {r}

instance finiteDimensional_residualSubspace (r : E) :
    FiniteDimensional ℝ (residualSubspace r) := by
  refine FiniteDimensional.span_of_finite ℝ (Set.finite_singleton r)

instance completeSpace_residualSubspace (r : E) :
    CompleteSpace (residualSubspace r) :=
  (Submodule.complete_of_finiteDimensional (residualSubspace r)).completeSpace_coe

/-- Cosine of the principal angle between the 1-D residual subspaces spanned by
`u` and `v`.  Defined as `|⟪u, v⟫| / (‖u‖ · ‖v‖)` for nonzero vectors; this is
exactly the cosine of the smallest angle between the two lines. -/
noncomputable def cosPrincipalAngle (u v : E) : ℝ :=
  |⟪u, v⟫| / (‖u‖ * ‖v‖)

/-- Sine of the principal angle, derived from `cos` via `sin² + cos² = 1`. -/
noncomputable def sinPrincipalAngle (u v : E) : ℝ :=
  Real.sqrt (1 - cosPrincipalAngle u v ^ 2)

namespace PrincipalAngle

variable {u v : E}

/-- `cosPrincipalAngle` is invariant to scaling of either vector. -/
theorem cosPrincipalAngle_smul {a b : ℝ} (ha : a ≠ 0) (hb : b ≠ 0) :
    cosPrincipalAngle (a • u) (b • v) = cosPrincipalAngle u v := by
  unfold cosPrincipalAngle
  have h1 : ⟪a • u, b • v⟫ = a * b * ⟪u, v⟫ := by
    rw [real_inner_smul_left, real_inner_smul_right]
    ring
  have h2 : ‖a • u‖ = |a| * ‖u‖ := by
    rw [norm_smul, Real.norm_eq_abs]
  have h3 : ‖b • v‖ = |b| * ‖v‖ := by
    rw [norm_smul, Real.norm_eq_abs]
  rw [h1, h2, h3]
  have h4 : |a * b * ⟪u, v⟫| = |a * b| * |⟪u, v⟫| := by
    rw [abs_mul]
  have h5 : |a * b| = |a| * |b| := by
    rw [abs_mul]
  rw [h4, h5]
  field_simp [ha, hb]

/-- The cosine is bounded by `1` in absolute value. -/
theorem cosPrincipalAngle_le_one (hu : u ≠ 0) (hv : v ≠ 0) :
    cosPrincipalAngle u v ≤ 1 := by
  unfold cosPrincipalAngle
  have hnum : |⟪u, v⟫| ≤ ‖u‖ * ‖v‖ :=
    abs_real_inner_le_norm u v
  have hden : 0 < ‖u‖ * ‖v‖ := mul_pos (norm_pos_iff.mpr hu) (norm_pos_iff.mpr hv)
  exact (div_le_one hden).mpr hnum

/-- The square of the cosine is at most `1`. -/
theorem cosPrincipalAngle_sq_le_one (hu : u ≠ 0) (hv : v ≠ 0) :
    cosPrincipalAngle u v ^ 2 ≤ 1 := by
  have h1 : -1 ≤ cosPrincipalAngle u v := by
    have hnonneg : 0 ≤ cosPrincipalAngle u v := by
      unfold cosPrincipalAngle
      positivity
    linarith
  have h2 : cosPrincipalAngle u v ≤ 1 := cosPrincipalAngle_le_one hu hv
  nlinarith

/-- The sine is non-negative and real. -/
theorem sinPrincipalAngle_nonneg (hu : u ≠ 0) (hv : v ≠ 0) : 0 ≤ sinPrincipalAngle u v := by
  unfold sinPrincipalAngle
  have h : 0 ≤ 1 - cosPrincipalAngle u v ^ 2 := by
    nlinarith [cosPrincipalAngle_sq_le_one hu hv]
  positivity

end PrincipalAngle

/-- **Transferability bound.** Let `U = span{u}` be the source residual subspace
and `v` a target residual.  After applying the source-class correction
(orthogonal projection onto `U`), the remaining target residual has norm at most
`sin θ · ‖v‖`, where `θ` is the principal angle between `U` and `span{v}`.

This is the geometric foundation for the Mg-Li empirical validation: a
source-class affine operator cannot cancel the component of the target residual
that lies outside `U`, and that component is controlled by the principal angle. -/
theorem crossClassTransferError_le
    (u v : E) (hu : u ≠ 0) (hv : v ≠ 0) :
    ‖v - (residualSubspace u).orthogonalProjectionFn v‖ ≤ sinPrincipalAngle u v * ‖v‖ := by
  set U := residualSubspace u with hU
  have hU_fd : FiniteDimensional ℝ U := finiteDimensional_residualSubspace u
  have hU_complete : CompleteSpace U := completeSpace_residualSubspace u
  have hproj : U.orthogonalProjectionFn v = (⟪u, v⟫ / ‖u‖ ^ 2) • u := by
    apply Submodule.eq_orthogonalProjectionFn_of_mem_of_inner_eq_zero
    · -- The candidate lies in `U`.
      rw [hU]
      apply Submodule.smul_mem
      · apply Submodule.subset_span
        simp
    · -- The residual after subtracting the candidate is orthogonal to `U`.
      intro w hw
      rw [hU] at hw
      rcases Submodule.mem_span_singleton.mp hw with ⟨t, rfl⟩
      simp only [inner_sub_left, real_inner_smul_right, real_inner_smul_left,
        real_inner_self_eq_norm_sq]
      rw [← real_inner_comm u v]
      field_simp [norm_ne_zero_iff.mpr hu]
      ring_nf
  rw [hproj]
  have h1 : ‖v - (⟪u, v⟫ / ‖u‖ ^ 2) • u‖ ^ 2 =
      ‖v‖ ^ 2 * (1 - cosPrincipalAngle u v ^ 2) := by
    have h2 : ‖v - (⟪u, v⟫ / ‖u‖ ^ 2) • u‖ ^ 2 =
        ‖v‖ ^ 2 - 2 * (⟪u, v⟫ / ‖u‖ ^ 2) * ⟪u, v⟫
          + (⟪u, v⟫ / ‖u‖ ^ 2) ^ 2 * ‖u‖ ^ 2 := by
      rw [norm_sub_sq_real, real_inner_smul_right, norm_smul, Real.norm_eq_abs]
      rw [show ⟪v, u⟫ = ⟪u, v⟫ by rw [real_inner_comm]]
      rw [mul_pow, sq_abs]
      ring_nf
    rw [h2]
    have h3 : (⟪u, v⟫ / ‖u‖ ^ 2) ^ 2 * ‖u‖ ^ 2 = ⟪u, v⟫ ^ 2 / ‖u‖ ^ 2 := by
      field_simp [norm_ne_zero_iff.mpr hu]
    have h4 : 2 * (⟪u, v⟫ / ‖u‖ ^ 2) * ⟪u, v⟫ = 2 * ⟪u, v⟫ ^ 2 / ‖u‖ ^ 2 := by
      field_simp [norm_ne_zero_iff.mpr hu]
    rw [h3, h4]
    unfold cosPrincipalAngle
    have h5 : |⟪u, v⟫| ^ 2 = ⟪u, v⟫ ^ 2 := sq_abs _
    have h6 : (‖u‖ * ‖v‖) ^ 2 = ‖u‖ ^ 2 * ‖v‖ ^ 2 := by ring
    rw [← h5]
    field_simp [h6]
    ring_nf
  have h7 : 0 ≤ 1 - cosPrincipalAngle u v ^ 2 := by
    nlinarith [PrincipalAngle.cosPrincipalAngle_sq_le_one hu hv]
  have h8 : (sinPrincipalAngle u v * ‖v‖) ^ 2 =
      ‖v‖ ^ 2 * (1 - cosPrincipalAngle u v ^ 2) := by
    have h9 : (sinPrincipalAngle u v * ‖v‖) ^ 2 =
        sinPrincipalAngle u v ^ 2 * ‖v‖ ^ 2 := by ring
    rw [h9]
    have h10 : sinPrincipalAngle u v ^ 2 = 1 - cosPrincipalAngle u v ^ 2 := by
      unfold sinPrincipalAngle
      rw [Real.sq_sqrt]
      nlinarith [PrincipalAngle.cosPrincipalAngle_sq_le_one hu hv]
    rw [h10]
    ring
  have hleft : 0 ≤ ‖v - (⟪u, v⟫ / ‖u‖ ^ 2) • u‖ := norm_nonneg _
  have hright : 0 ≤ sinPrincipalAngle u v * ‖v‖ := by
    apply mul_nonneg
    · exact PrincipalAngle.sinPrincipalAngle_nonneg hu hv
    · exact norm_nonneg v
  have hsq : ‖v - (⟪u, v⟫ / ‖u‖ ^ 2) • u‖ ^ 2 = (sinPrincipalAngle u v * ‖v‖) ^ 2 := by
    rw [h1, h8]
  nlinarith [hsq, hleft, hright]

end OpenDistillationFactory.Materials.Theory.AlloyResidualTransfer
