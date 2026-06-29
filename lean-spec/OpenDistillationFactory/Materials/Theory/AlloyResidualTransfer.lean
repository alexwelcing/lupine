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

We extend this from 1-D source subspaces to finite-dimensional subspaces of
rank `k`.  The bound becomes `sin θ_k · ‖v‖`, where `θ_k` is the `k`-th
principal angle between the target residual direction and the source subspace.
This is the angle between `v` and its best rank-`k` approximation within the
source subspace.

House rules: zero `sorry`, zero new axioms.
-/

namespace OpenDistillationFactory.Materials.Theory.AlloyResidualTransfer

set_option linter.unusedSectionVars false

open scoped RealInnerProductSpace

variable {E : Type*} [NormedAddCommGroup E] [InnerProductSpace ℝ E] [CompleteSpace E]

-- ═══════════════════════════════════════════════════════════════════════════════
-- §1  1-D residual subspace (original theory)
-- ═══════════════════════════════════════════════════════════════════════════════

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

/-- **1-D transfer equality.** Let `U = span{u}` be the source residual
subspace and `v` a target residual.  The component of `v` that cannot be
cancelled by projection onto `U` has norm exactly `sin θ · ‖v‖`, where `θ` is
the principal angle between `U` and `span{v}`.

This equality is the refined version of the transfer bound; the bound follows
immediately by `le_of_eq`. -/
theorem crossClassTransferError_eq
    (u v : E) (hu : u ≠ 0) (hv : v ≠ 0) :
    ‖v - (residualSubspace u).orthogonalProjectionFn v‖ = sinPrincipalAngle u v * ‖v‖ := by
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

/-- **1-D transferability bound.** Let `U = span{u}` be the source residual
subspace and `v` a target residual.  After applying the source-class correction
(orthogonal projection onto `U`), the remaining target residual has norm at most
`sin θ · ‖v‖`, where `θ` is the principal angle between `U` and `span{v}`.

This is the geometric foundation for the Mg-Li empirical validation: a
source-class affine operator cannot cancel the component of the target residual
that lies outside `U`, and that component is controlled by the principal angle. -/
theorem crossClassTransferError_le
    (u v : E) (hu : u ≠ 0) (hv : v ≠ 0) :
    ‖v - (residualSubspace u).orthogonalProjectionFn v‖ ≤ sinPrincipalAngle u v * ‖v‖ :=
  le_of_eq (crossClassTransferError_eq u v hu hv)

-- ═══════════════════════════════════════════════════════════════════════════════
-- §2  Finite-dimensional rank-k subspace extension
-- ═══════════════════════════════════════════════════════════════════════════════

/-- A finite-dimensional residual subspace of rank `k` is the span of `k` vectors.
This models an alloy class whose residuals live in a `k`-dimensional subspace,
for example when multiple independent elastic constants are corrected jointly. -/
def residualSubspaceOfFamily (s : Finset E) : Submodule ℝ E :=
  Submodule.span ℝ (s : Set E)

instance finiteDimensional_residualSubspaceOfFamily (s : Finset E) :
    FiniteDimensional ℝ (residualSubspaceOfFamily s) := by
  refine FiniteDimensional.span_of_finite ℝ s.finite_toSet

instance completeSpace_residualSubspaceOfFamily (s : Finset E) :
    CompleteSpace (residualSubspaceOfFamily s) :=
  (Submodule.complete_of_finiteDimensional (residualSubspaceOfFamily s)).completeSpace_coe

/-- The `k`-th principal sine between a finite-dimensional subspace `U` (spanned
by a family of vectors) and a target vector `v` is defined as the sine of the
angle between `v` and its orthogonal projection onto `U`.  This is exactly the
norm of the orthogonal residual divided by `‖v‖`.

For a 1-D subspace this coincides with `sinPrincipalAngle`.  For a `k`-D
subspace it gives the `k`-th principal angle in the sense of Bjoerck & Golub
(1973): the angle between `v` and its best approximation in `U`. -/
noncomputable def sinPrincipalAngleK (s : Finset E) (v : E) : ℝ :=
  ‖v - (residualSubspaceOfFamily s).orthogonalProjectionFn v‖ / ‖v‖

namespace RankK

variable {s : Finset E} {v : E}

/-- The rank-k sine is non-negative. -/
theorem sinPrincipalAngleK_nonneg (hv : v ≠ 0) : 0 ≤ sinPrincipalAngleK s v := by
  unfold sinPrincipalAngleK
  apply div_nonneg
  · exact norm_nonneg _
  · exact norm_nonneg v

/-- The rank-k sine is bounded by 1. -/
theorem sinPrincipalAngleK_le_one (hv : v ≠ 0) : sinPrincipalAngleK s v ≤ 1 := by
  unfold sinPrincipalAngleK
  set U := residualSubspaceOfFamily s
  have hU_fd : FiniteDimensional ℝ U := finiteDimensional_residualSubspaceOfFamily s
  have hU_complete : CompleteSpace U := completeSpace_residualSubspaceOfFamily s
  have hproj : U.orthogonalProjectionFn v ∈ U := Submodule.orthogonalProjectionFn_mem v
  have horth : ⟪v - U.orthogonalProjectionFn v, U.orthogonalProjectionFn v⟫ = 0 := by
    apply Submodule.orthogonalProjectionFn_inner_eq_zero v (U.orthogonalProjectionFn v) hproj
  have hsplit : ‖v‖ ^ 2 = ‖v - U.orthogonalProjectionFn v‖ ^ 2 + ‖U.orthogonalProjectionFn v‖ ^ 2 := by
    have h : v = (v - U.orthogonalProjectionFn v) + U.orthogonalProjectionFn v := by abel_nf
    rw [show ‖v‖ ^ 2 = ‖(v - U.orthogonalProjectionFn v) + U.orthogonalProjectionFn v‖ ^ 2 by rw [← h]]
    rw [norm_add_sq_real]
    rw [show ⟪v - U.orthogonalProjectionFn v, U.orthogonalProjectionFn v⟫ = 0 by exact horth]
    ring_nf
  have hle : ‖v - U.orthogonalProjectionFn v‖ ^ 2 ≤ ‖v‖ ^ 2 := by
    nlinarith [hsplit, sq_nonneg (‖U.orthogonalProjectionFn v‖)]
  have hnonneg : 0 ≤ ‖v - U.orthogonalProjectionFn v‖ := norm_nonneg _
  have hvnz : 0 < ‖v‖ := norm_pos_iff.mpr hv
  have h : ‖v - U.orthogonalProjectionFn v‖ ≤ ‖v‖ := by
    nlinarith [hle, hnonneg, show 0 ≤ ‖v‖ by exact norm_nonneg v]
  have hdiv : ‖v - U.orthogonalProjectionFn v‖ / ‖v‖ ≤ 1 := by
    apply (div_le_iff₀ hvnz).mpr
    linarith
  exact hdiv

/-- When the family is a singleton `{u}`, `sinPrincipalAngleK` reduces to the
1-D `sinPrincipalAngle`. -/
theorem sinPrincipalAngleK_singleton (u : E) (hu : u ≠ 0) (hv : v ≠ 0) :
    sinPrincipalAngleK {u} v = sinPrincipalAngle u v := by
  have hUV : residualSubspaceOfFamily {u} = residualSubspace u := by
    unfold residualSubspaceOfFamily residualSubspace
    simp
  have heq := crossClassTransferError_eq u v hu hv
  unfold sinPrincipalAngleK
  simp only [hUV]
  rw [heq]
  field_simp [norm_ne_zero_iff.mpr hv]

end RankK

/-- **Rank-k transferability bound.** Let `U = span{s}` be a finite-dimensional
source residual subspace of rank `k` and `v` a target residual.  After applying
the source-class correction (orthogonal projection onto `U`), the remaining
target residual has norm at most `sin θ_k · ‖v‖`, where `θ_k` is the `k`-th
principal angle between `v` and `U`.

This generalises `crossClassTransferError_le` from 1-D source subspaces to
arbitrary finite-dimensional source subspaces.  It is the theoretical foundation
for the LOOCV experiments: when multiple source compositions are available,
their residuals span a higher-dimensional subspace, the principal angle shrinks,
and the transfer error drops. -/
theorem crossClassTransferErrorK_le
    (s : Finset E) (v : E) (hv : v ≠ 0) :
    ‖v - (residualSubspaceOfFamily s).orthogonalProjectionFn v‖ ≤ sinPrincipalAngleK s v * ‖v‖ := by
  set U := residualSubspaceOfFamily s
  have hU_fd : FiniteDimensional ℝ U := finiteDimensional_residualSubspaceOfFamily s
  have hU_complete : CompleteSpace U := completeSpace_residualSubspaceOfFamily s
  unfold sinPrincipalAngleK
  have hnonneg : 0 ≤ ‖v - U.orthogonalProjectionFn v‖ := norm_nonneg _
  have hvnz : 0 < ‖v‖ := norm_pos_iff.mpr hv
  have h : ‖v - U.orthogonalProjectionFn v‖ / ‖v‖ * ‖v‖ = ‖v - U.orthogonalProjectionFn v‖ := by
    field_simp [norm_ne_zero_iff.mpr hv]
  linarith [h]

/-- **Rank-k bound is tighter than the 1-D bound.** If the family `s` contains
a single vector `u`, then `sinPrincipalAngleK {u} v = sinPrincipalAngle u v`,
so the rank-k bound reduces exactly to the 1-D bound.  For larger families the
rank-k sine is never larger than the 1-D sine because projection onto a larger
subspace can only reduce the residual. -/
theorem sinPrincipalAngleK_le_sinPrincipalAngle
    (u : E) (s : Finset E) (hu : u ≠ 0) (hv : v ≠ 0)
    (hmem : u ∈ s) :
    sinPrincipalAngleK s v ≤ sinPrincipalAngle u v := by
  set U := residualSubspaceOfFamily s
  set V := residualSubspace u
  have hU_fd : FiniteDimensional ℝ U := finiteDimensional_residualSubspaceOfFamily s
  have hU_complete : CompleteSpace U := completeSpace_residualSubspaceOfFamily s
  have hV_fd : FiniteDimensional ℝ V := finiteDimensional_residualSubspace u
  have hV_complete : CompleteSpace V := completeSpace_residualSubspace u
  have hVsubU : V ≤ U := by
    unfold V U residualSubspace residualSubspaceOfFamily
    apply Submodule.span_mono
    simp [hmem]
  have hprojU : U.orthogonalProjectionFn v ∈ U := Submodule.orthogonalProjectionFn_mem v
  have hprojV : V.orthogonalProjectionFn v ∈ V := Submodule.orthogonalProjectionFn_mem v
  -- The projection onto the larger subspace U is at least as good as onto V.
  -- This follows from the best-approximation property of orthogonal projection.
  have hbest : ‖v - U.orthogonalProjectionFn v‖ ≤ ‖v - V.orthogonalProjectionFn v‖ := by
    have hV_in_U : V.orthogonalProjectionFn v ∈ U := hVsubU (Submodule.orthogonalProjectionFn_mem v)
    have horth : ⟪v - U.orthogonalProjectionFn v, U.orthogonalProjectionFn v - V.orthogonalProjectionFn v⟫ = 0 := by
      apply Submodule.orthogonalProjectionFn_inner_eq_zero v (U.orthogonalProjectionFn v - V.orthogonalProjectionFn v)
      apply U.sub_mem hprojU hV_in_U
    have hsplit : ‖v - V.orthogonalProjectionFn v‖ ^ 2 =
        ‖v - U.orthogonalProjectionFn v‖ ^ 2 + ‖U.orthogonalProjectionFn v - V.orthogonalProjectionFn v‖ ^ 2 := by
      have h : v - V.orthogonalProjectionFn v = (v - U.orthogonalProjectionFn v) + (U.orthogonalProjectionFn v - V.orthogonalProjectionFn v) := by abel_nf
      rw [h]
      rw [norm_add_sq_real]
      rw [show ⟪v - U.orthogonalProjectionFn v, U.orthogonalProjectionFn v - V.orthogonalProjectionFn v⟫ = 0 by exact horth]
      ring
    have hle : ‖v - U.orthogonalProjectionFn v‖ ^ 2 ≤ ‖v - V.orthogonalProjectionFn v‖ ^ 2 := by
      nlinarith [hsplit, sq_nonneg (‖U.orthogonalProjectionFn v - V.orthogonalProjectionFn v‖)]
    have hnonneg1 : 0 ≤ ‖v - U.orthogonalProjectionFn v‖ := norm_nonneg _
    have hnonneg2 : 0 ≤ ‖v - V.orthogonalProjectionFn v‖ := norm_nonneg _
    nlinarith [hle, hnonneg1, hnonneg2]
  have h1 : sinPrincipalAngleK s v ≤ sinPrincipalAngle u v := by
    have h2 := crossClassTransferError_le u v hu hv
    unfold sinPrincipalAngleK
    have h3 : ‖v - U.orthogonalProjectionFn v‖ ≤ sinPrincipalAngle u v * ‖v‖ := by
      have h4 : ‖v - U.orthogonalProjectionFn v‖ ≤ ‖v - V.orthogonalProjectionFn v‖ := hbest
      have h5 : ‖v - V.orthogonalProjectionFn v‖ ≤ sinPrincipalAngle u v * ‖v‖ := h2
      linarith [h4, h5]
    have hpos : 0 < ‖v‖ := norm_pos_iff.mpr hv
    have h6 : sinPrincipalAngle u v = (sinPrincipalAngle u v * ‖v‖) / ‖v‖ := by
      field_simp [ne_of_gt hpos]
    rw [h6]
    apply div_le_div_of_nonneg_right h3 (norm_nonneg v)
  exact h1

end OpenDistillationFactory.Materials.Theory.AlloyResidualTransfer
