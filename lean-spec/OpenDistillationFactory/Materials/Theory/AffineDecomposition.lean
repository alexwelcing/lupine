import Mathlib.Analysis.InnerProductSpace.Basic
import Mathlib.Analysis.InnerProductSpace.Projection.Basic
import Mathlib.Analysis.InnerProductSpace.Projection.Minimal
import Mathlib.LinearAlgebra.AffineSpace.AffineSubspace.Basic
import Mathlib.Tactic.Module
import Mathlib.Tactic.Ring
import Mathlib.Tactic.Linarith

/-! Bias-plus-noise decomposition as a derivable proposition (Proposition 2.1)

For a closed affine reachable set `K = a + L`, the projection-law residual
`T - p` decomposes as a shared bias `b = T - p*` in the orthogonal complement
of `L` plus a within-family component `ξ = p* - p` in `L`. This reframes the
gauge spectrum of `SpectrumBridge.lean` from an assumption to a consequence of
the projection law on affine reachable sets.

House rules: zero `sorry`, zero new axioms.
-/

namespace OpenDistillationFactory.Materials.Theory.AffineDecomposition

open Real InnerProductSpace AffineSubspace

variable {E : Type*} [NormedAddCommGroup E] [InnerProductSpace ℝ E]

/-- An affine subspace is convex. -/
theorem affineSubspace_convex [CompleteSpace E] (K : AffineSubspace ℝ E) :
    Convex ℝ (K : Set E) := by
  intro p hp q hq a b ha hb hab
  rw [show a • p + b • q = AffineMap.lineMap p q b by
    rw [AffineMap.lineMap_apply_module]; congr; linarith]
  exact AffineMap.lineMap_mem b hp hq

variable [CompleteSpace E]

/-- A closed affine reachable set `K = a + L`. Nonemptiness and closedness
    guarantee existence and uniqueness of the best approximation by the Hilbert
    projection theorem. -/
structure AffineFamily (E : Type*) [NormedAddCommGroup E] [InnerProductSpace ℝ E]
    [CompleteSpace E] where
  carrier : AffineSubspace ℝ E
  nonempty : (carrier : Set E).Nonempty
  closed : IsClosed (carrier : Set E)

namespace AffineFamily

variable {E : Type*} [NormedAddCommGroup E] [InnerProductSpace ℝ E] [CompleteSpace E]
variable (F : AffineFamily E)

/-- Existence of a best approximation in the closed affine subspace, by the
    Hilbert projection theorem. -/
lemma bestApprox_exists (T : E) :
    ∃ p ∈ (F.carrier : Set E), ∀ q ∈ (F.carrier : Set E), ‖T - p‖ ≤ ‖T - q‖ := by
  let s := (F.carrier : Set E)
  have hne : s.Nonempty := F.nonempty
  have hcomp : IsComplete s := completeSpace_coe_iff_isComplete.mp F.closed.completeSpace_coe
  have hconv : Convex ℝ s := affineSubspace_convex F.carrier
  rcases exists_norm_eq_iInf_of_complete_convex hne hcomp hconv T with ⟨p, hp, hmin⟩
  refine ⟨p, hp, ?_⟩
  intro q hq
  rw [hmin]
  have hbd : BddBelow (Set.range fun w : ↥s => ‖T - (w : E)‖) := by
    use 0
    rintro _ ⟨w, rfl⟩
    exact norm_nonneg _
  exact ciInf_le hbd ⟨q, hq⟩

/-- The unique best approximation of `T` in `F.carrier`. -/
noncomputable def bestApprox (T : E) : E :=
  Classical.choose (F.bestApprox_exists T)

/-- The best approximation lies in the carrier. -/
theorem bestApprox_mem (T : E) : F.bestApprox T ∈ (F.carrier : Set E) := by
  exact (Classical.choose_spec (F.bestApprox_exists T)).1

/-- The best approximation is indeed a minimizer. -/
theorem bestApprox_isBestApprox (T : E) (q : E) (hq : q ∈ (F.carrier : Set E)) :
    ‖T - F.bestApprox T‖ ≤ ‖T - q‖ := by
  exact (Classical.choose_spec (F.bestApprox_exists T)).2 q hq

/-- The shared bias `b = T - p*`. -/
noncomputable def bias (T : E) : E :=
  T - F.bestApprox T

/-- The within-family component `ξ(p) = p* - p` for `p ∈ K`. -/
noncomputable def withinFamily (T : E) (p : ↥(F.carrier : Set E)) : E :=
  F.bestApprox T - (p : E)

/-- **Variational orthogonality for affine subspaces.** If `p*` minimizes the
    distance from `T` to the closed affine subspace `K`, then the residual
    `T - p*` makes an obtuse angle with every feasible direction `q - p*`. -/
theorem residual_inner_le_zero (T : E) {q : E} (hq : q ∈ (F.carrier : Set E)) :
    ⟪F.bias T, q - F.bestApprox T⟫_ℝ ≤ 0 := by
  have hmin : ∀ r ∈ (F.carrier : Set E), ‖T - F.bestApprox T‖ ≤ ‖T - r‖ := by
    intro r hr
    exact F.bestApprox_isBestApprox T r hr
  by_contra hpos
  push Not at hpos
  have hq_ne : q - F.bestApprox T ≠ 0 := by
    intro h0
    rw [h0, inner_zero_right] at hpos
    exact lt_irrefl 0 hpos
  have hW : (0 : ℝ) < ‖q - F.bestApprox T‖ ^ 2 := by
    have hne : ‖q - F.bestApprox T‖ ≠ 0 := norm_ne_zero_iff.mpr hq_ne
    positivity
  let t := min 1 (⟪F.bias T, q - F.bestApprox T⟫_ℝ / ‖q - F.bestApprox T‖ ^ 2)
  have ht0 : 0 < t := lt_min one_pos (div_pos hpos hW)
  have ht1 : t ≤ 1 := min_le_left _ _
  have htV : t ≤ ⟪F.bias T, q - F.bestApprox T⟫_ℝ / ‖q - F.bestApprox T‖ ^ 2 := min_le_right _ _
  have htW : t * ‖q - F.bestApprox T‖ ^ 2 ≤ ⟪F.bias T, q - F.bestApprox T⟫_ℝ := by
    rw [← le_div_iff₀ hW]
    exact htV
  have hmem : (1 - t) • F.bestApprox T + t • q ∈ (F.carrier : Set E) := by
    rw [show (1 - t) • F.bestApprox T + t • q = AffineMap.lineMap (F.bestApprox T) q t by
      rw [AffineMap.lineMap_apply_module]]
    exact AffineMap.lineMap_mem t (F.bestApprox_mem T) hq
  have hpt : T - ((1 - t) • F.bestApprox T + t • q)
      = F.bias T - t • (q - F.bestApprox T) := by
    unfold bias
    module
  have hle : ‖T - F.bestApprox T‖ ≤ ‖T - ((1 - t) • F.bestApprox T + t • q)‖ := by
    simpa [hpt] using hmin ((1 - t) • F.bestApprox T + t • q) hmem
  have hsq : ‖T - F.bestApprox T‖ ^ 2 ≤ ‖F.bias T - t • (q - F.bestApprox T)‖ ^ 2 := by
    have hle' : ‖T - F.bestApprox T‖ ≤ ‖F.bias T - t • (q - F.bestApprox T)‖ := by
      rw [← hpt]
      exact hle
    nlinarith [mul_self_le_mul_self (norm_nonneg (T - F.bestApprox T)) hle']
  have hx : ‖F.bias T - t • (q - F.bestApprox T)‖ ^ 2
      = ‖F.bias T‖ ^ 2 - 2 * t * ⟪F.bias T, q - F.bestApprox T⟫_ℝ
        + t ^ 2 * ‖q - F.bestApprox T‖ ^ 2 := by
    rw [norm_sub_sq_real, real_inner_smul_right, norm_smul, Real.norm_eq_abs,
      mul_pow, sq_abs]
    ring
  have hcontra : ‖F.bias T - t • (q - F.bestApprox T)‖ ^ 2 < ‖T - F.bestApprox T‖ ^ 2 := by
    have h1 : ‖T - F.bestApprox T‖ ^ 2 = ‖F.bias T‖ ^ 2 := by
      unfold bias
      rfl
    rw [h1]
    have h2 : ‖F.bias T - t • (q - F.bestApprox T)‖ ^ 2 - ‖F.bias T‖ ^ 2 < 0 := by
      rw [hx]
      have h3 : t * ‖q - F.bestApprox T‖ ^ 2 ≤ ⟪F.bias T, q - F.bestApprox T⟫_ℝ := htW
      have h4 : 0 < ⟪F.bias T, q - F.bestApprox T⟫_ℝ := hpos
      have h5 : 0 < t := ht0
      have h6 : t * ‖q - F.bestApprox T‖ ^ 2 < 2 * ⟪F.bias T, q - F.bestApprox T⟫_ℝ := by
        nlinarith [h3, h4, h5]
      nlinarith [h6, h5, h4]
    linarith
  linarith [hsq, hcontra]

/-- The residual is orthogonal to every direction vector in the affine
    subspace's direction. -/
theorem bias_orthogonal_direction (T : E) {v : E}
    (hv : v ∈ F.carrier.direction) : ⟪F.bias T, v⟫_ℝ = 0 := by
  rw [mem_direction_iff_eq_vsub_right (F.bestApprox_mem T)] at hv
  obtain ⟨q, hq, rfl⟩ := hv
  have hle1 : ⟪F.bias T, q - F.bestApprox T⟫_ℝ ≤ 0 :=
    F.residual_inner_le_zero T hq
  set q' := (2 : ℝ) • F.bestApprox T + (-1 : ℝ) • q
  have hq' : q' ∈ (F.carrier : Set E) := by
    rw [show q' = AffineMap.lineMap q (F.bestApprox T) (2 : ℝ) by
      rw [AffineMap.lineMap_apply_module]; module]
    exact AffineMap.lineMap_mem (2 : ℝ) hq (F.bestApprox_mem T)
  have hle2 : ⟪F.bias T, q' - F.bestApprox T⟫_ℝ ≤ 0 :=
    F.residual_inner_le_zero T hq'
  have hle3 : q' - F.bestApprox T = -(q - F.bestApprox T) := by
    unfold q'
    module
  have hle4 : ⟪F.bias T, -(q - F.bestApprox T)⟫_ℝ ≤ 0 := by
    rw [← hle3]
    exact hle2
  have hle5 : ⟪F.bias T, q - F.bestApprox T⟫_ℝ ≥ 0 := by
    rw [inner_neg_right] at hle4
    linarith
  have h0 : ⟪F.bias T, q - F.bestApprox T⟫_ℝ = 0 := by
    linarith [hle1, hle5]
  rw [show q -ᵥ F.bestApprox T = q - F.bestApprox T by exact vsub_eq_sub q (F.bestApprox T)]
  exact h0

/-- The shared bias lies in the orthogonal complement of the family's
    direction. -/
theorem bias_in_orthogonal (T : E) :
    F.bias T ∈ (F.carrier.direction : Submodule ℝ E)ᗮ := by
  rw [Submodule.mem_orthogonal']
  intro v hv
  exact F.bias_orthogonal_direction T hv

/-- The within-family component lies in the family's direction. -/
theorem withinFamily_in_direction (T : E) (p : ↥(F.carrier : Set E)) :
    F.withinFamily T p ∈ F.carrier.direction := by
  apply AffineSubspace.vsub_mem_direction
  · exact F.bestApprox_mem T
  · exact Subtype.mem p

/-- Bias and within-family component are orthogonal. -/
theorem bias_orthogonal_withinFamily (T : E) (p : ↥(F.carrier : Set E)) :
    ⟪F.bias T, F.withinFamily T p⟫_ℝ = 0 := by
  apply F.bias_orthogonal_direction T
  exact F.withinFamily_in_direction T p

/-- **Proposition 2.1 (Decomposition, affine case).** For any `p ∈ K`, the
    residual `T - p` decomposes as `b + ξ(p)` where `b` is the shared bias in
    `F.carrier.directionᗮ`, `ξ(p)` is the within-family component in
    `F.carrier.direction`, and the two are orthogonal. -/
theorem decomposition (T : E) (p : ↥(F.carrier : Set E)) :
    T - (p : E) = F.bias T + F.withinFamily T p ∧
    F.bias T ∈ (F.carrier.direction : Submodule ℝ E)ᗮ ∧
    F.withinFamily T p ∈ F.carrier.direction ∧
    ⟪F.bias T, F.withinFamily T p⟫_ℝ = 0 := by
  refine ⟨?_, F.bias_in_orthogonal T, F.withinFamily_in_direction T p,
    F.bias_orthogonal_withinFamily T p⟩
  unfold bias withinFamily
  abel

end AffineFamily

end OpenDistillationFactory.Materials.Theory.AffineDecomposition
