import Mathlib.Analysis.InnerProductSpace.Basic
import Mathlib.Analysis.Convex.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Module
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
# The Projection Law on Convex Families: normal cones and the consensus theorem

Generalizes `ProjectionLaw.lean` from subspaces to arbitrary **convex** model
families — the reachable set of a model family need not be linear; convexity
suffices for the full law:

1. `IsBestApproxOn.residual_mem_normalCone` — the residual of any best
   approximation lies in the normal cone of the family at the fitted point
   (the obtuse-angle / variational-inequality criterion). This is the
   "errors point at the binding constraint" statement in its general form.
2. `IsBestApproxOn.unique` — best approximations onto a convex family are
   unique, proved purely from two applications of the obtuse-angle criterion
   (no completeness, no parallelogram law, no projection API).
3. `IsBestApproxOn.residual_eq` — **the consensus theorem on convex
   families**: all best approximations of one target share one residual.

Combined with `SpectrumBridge.lean` (shared residual ⇒ bias-plus-noise
spectrum ⇒ the PR gauge) and `ErrorGeometry.lean` (gauge properties and
ribbon/consensus decoupling), this completes the machine-checked chain of the
projection law:

    convex family + fitting  ⇒  one shared residual in the normal cone
                             ⇒  rank-one-dominant error second moment
                             ⇒  participation ratio collapses to 1
                                at explicit rate 3(d−1)/ρ.

House rules: zero `sorry`, zero new axioms.
-/

namespace OpenDistillationFactory.Materials.Theory.ConvexProjection

variable {E : Type*} [NormedAddCommGroup E] [InnerProductSpace Real E]

/-- The normal cone of a set `s` at a point `p`: directions making an obtuse
angle with every feasible direction out of `p`. -/
def NormalConeAt (s : Set E) (p : E) : Set E :=
  {v : E | ∀ q ∈ s, (inner (𝕜 := Real) (v) (q - p)) ≤ 0}

/-- `p` is a best approximation of target `T` within the family `s`. -/
def IsBestApproxOn (s : Set E) (T p : E) : Prop :=
  p ∈ s ∧ ∀ q ∈ s, ‖T - p‖ ≤ ‖T - q‖

namespace IsBestApproxOn

/-- **Obtuse-angle criterion / variational inequality.** On a convex family,
the residual of a best approximation makes an obtuse angle with every feasible
direction: it lies in the normal cone at the fitted point. -/
theorem residual_mem_normalCone {s : Set E} (hs : Convex Real s) {T p : E}
    (h : IsBestApproxOn s T p) : (T - p) ∈ NormalConeAt s p := by
  intro q hq
  by_contra hpos
  push Not at hpos
  -- hpos : 0 < ⟪T − p, q − p⟫
  have hq_ne : q - p ≠ 0 := by
    intro h0
    rw [h0, inner_zero_right] at hpos
    exact lt_irrefl 0 hpos
  have hW : (0 : Real) < ‖q - p‖ ^ 2 := by
    have hne : ‖q - p‖ ≠ 0 := norm_ne_zero_iff.mpr hq_ne
    positivity
  have ht0 : 0 < min 1 ((inner (𝕜 := Real) (T - p) (q - p)) / ‖q - p‖ ^ 2) :=
    lt_min one_pos (div_pos hpos hW)
  have ht1 : min 1 ((inner (𝕜 := Real) (T - p) (q - p)) / ‖q - p‖ ^ 2) ≤ 1 :=
    min_le_left _ _
  have htV : min 1 ((inner (𝕜 := Real) (T - p) (q - p)) / ‖q - p‖ ^ 2)
      ≤ (inner (𝕜 := Real) (T - p) (q - p)) / ‖q - p‖ ^ 2 := min_le_right _ _
  have htW : min 1 ((inner (𝕜 := Real) (T - p) (q - p)) / ‖q - p‖ ^ 2) * ‖q - p‖ ^ 2
      ≤ (inner (𝕜 := Real) (T - p) (q - p)) := by
    rw [← le_div_iff₀ hW]
    exact htV
  have hmem : (1 - min 1 ((inner (𝕜 := Real) (T - p) (q - p)) / ‖q - p‖ ^ 2)) • p +
      (min 1 ((inner (𝕜 := Real) (T - p) (q - p)) / ‖q - p‖ ^ 2)) • q ∈ s :=
    hs h.1 hq (by linarith) (le_of_lt ht0) (by ring)
  have hpt : T - ((1 - min 1 ((inner (𝕜 := Real) (T - p) (q - p)) / ‖q - p‖ ^ 2)) • p +
      (min 1 ((inner (𝕜 := Real) (T - p) (q - p)) / ‖q - p‖ ^ 2)) • q)
      = (T - p) - (min 1 ((inner (𝕜 := Real) (T - p) (q - p)) / ‖q - p‖ ^ 2)) • (q - p) := by
    module
  have hle : ‖T - p‖ ≤
      ‖(T - p) - (min 1 ((inner (𝕜 := Real) (T - p) (q - p)) / ‖q - p‖ ^ 2)) • (q - p)‖ := by
    have hmin := h.2 _ hmem
    rwa [hpt] at hmin
  have hsq : ‖T - p‖ ^ 2 ≤
      ‖(T - p) - (min 1 ((inner (𝕜 := Real) (T - p) (q - p)) / ‖q - p‖ ^ 2)) • (q - p)‖ ^ 2 := by
    nlinarith [mul_self_le_mul_self (norm_nonneg (T - p)) hle]
  have hx : ‖(T - p) - (min 1 ((inner (𝕜 := Real) (T - p) (q - p)) / ‖q - p‖ ^ 2)) • (q - p)‖ ^ 2
      = ‖T - p‖ ^ 2 -
        2 * (min 1 ((inner (𝕜 := Real) (T - p) (q - p)) / ‖q - p‖ ^ 2) *
          (inner (𝕜 := Real) (T - p) (q - p))) +
        (min 1 ((inner (𝕜 := Real) (T - p) (q - p)) / ‖q - p‖ ^ 2)) ^ 2 * ‖q - p‖ ^ 2 := by
    rw [norm_sub_sq_real, real_inner_smul_right, norm_smul, Real.norm_eq_abs,
      mul_pow, sq_abs]
    try ring
  -- 0 ≤ −2 t V + t² W, with t W ≤ V and t, V > 0 forces V ≤ 0: contradiction.
  nlinarith [hsq, hx, htW, ht0, hpos,
    mul_pos ht0 hpos,
    mul_le_mul_of_nonneg_left htW (le_of_lt ht0)]

/-- **Uniqueness on convex families**, from two applications of the
obtuse-angle criterion: the two variational inequalities add up to
`‖p₁ − p₂‖² ≤ 0`. -/
theorem unique {s : Set E} (hs : Convex Real s) {T p₁ p₂ : E}
    (h₁ : IsBestApproxOn s T p₁) (h₂ : IsBestApproxOn s T p₂) : p₁ = p₂ := by
  have o₁ : (inner (𝕜 := Real) (T - p₁) (p₂ - p₁)) ≤ 0 :=
    h₁.residual_mem_normalCone hs p₂ h₂.1
  have o₂ : (inner (𝕜 := Real) (T - p₂) (p₁ - p₂)) ≤ 0 :=
    h₂.residual_mem_normalCone hs p₁ h₁.1
  have hneg : (inner (𝕜 := Real) (T - p₁) (p₁ - p₂)) = -(inner (𝕜 := Real) (T - p₁) (p₂ - p₁)) := by
    rw [show p₁ - p₂ = -(p₂ - p₁) by abel, inner_neg_right]
  have hsub : (inner (𝕜 := Real) ((T - p₂) - (T - p₁)) (p₁ - p₂))
      = (inner (𝕜 := Real) (T - p₂) (p₁ - p₂)) - (inner (𝕜 := Real) (T - p₁) (p₁ - p₂)) :=
    inner_sub_left _ _ _
  have hrw : (T - p₂) - (T - p₁) = p₁ - p₂ := by abel
  rw [hrw] at hsub
  have hself : (inner (𝕜 := Real) (p₁ - p₂) (p₁ - p₂)) ≤ 0 := by
    rw [hsub, hneg]
    linarith
  have hzero : (inner (𝕜 := Real) (p₁ - p₂) (p₁ - p₂)) = 0 :=
    le_antisymm hself real_inner_self_nonneg
  have : p₁ - p₂ = 0 := inner_self_eq_zero.mp hzero
  exact sub_eq_zero.mp this

/-- **The consensus theorem on convex families.** All best approximations of
a target within a convex family share one residual: ensemble agreement is a
property of the (family, target) pair — the binding constraint — not evidence
about the truth. -/
theorem residual_eq {s : Set E} (hs : Convex Real s) {T p₁ p₂ : E}
    (h₁ : IsBestApproxOn s T p₁) (h₂ : IsBestApproxOn s T p₂) :
    T - p₁ = T - p₂ := by
  rw [unique hs h₁ h₂]

end IsBestApproxOn

end OpenDistillationFactory.Materials.Theory.ConvexProjection
