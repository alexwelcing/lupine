import Mathlib.Analysis.InnerProductSpace.Basic

/-!
# The Projection Law: shared residuals of best approximations

Formal kernel of the error-geometry program. A model family is idealized as a
subspace `K` of observable space (the linearized reachable set). Fitting is
best approximation: a fitted model is a point of `K` at minimal distance from
the truth `T`.

Three theorems, in increasing strength:

1. `IsBestApprox.residual_inner_eq_zero` — the residual of any best
   approximation is orthogonal to the family (the variational argument,
   requiring no completeness and no projection API).
2. `IsBestApprox.unique` — best approximations are unique.
3. `IsBestApprox.residual_eq` — **the consensus theorem**: any two best
   approximations of the same target within the same family have *identical*
   residuals. Agreement among independently fitted models in a family is
   therefore a property of the (family, target) pair — the binding
   constraint — and carries no evidence about the truth beyond what the
   family already imposes.

Together with `ErrorGeometry.lean` (the PR gauge and ribbon/consensus
decoupling) this machine-checks the core of the projection law: errors of a
converged model family concentrate on a single shared residual, and ensemble
agreement measures the constraint, not correctness.

House rules: zero `sorry`, zero new axioms.
-/

namespace OpenDistillationFactory.Materials.Theory.ProjectionLaw

open scoped RealInnerProductSpace

variable {E : Type*} [NormedAddCommGroup E] [InnerProductSpace Real E]

/-- `p` is a best approximation of target `T` within the family `K`. -/
def IsBestApprox (K : Submodule Real E) (T p : E) : Prop :=
  p ∈ K ∧ ∀ q ∈ K, ‖T - p‖ ≤ ‖T - q‖

namespace IsBestApprox

/-- **Variational orthogonality.** The residual of a best approximation is
orthogonal to every direction in the family. Proof: perturbing the optimum by
`t • w` cannot decrease the squared distance; choosing
`t = ⟪T − p, w⟫ / ‖w‖²` forces the inner product to vanish. -/
theorem residual_inner_eq_zero {K : Submodule Real E} {T p : E}
    (h : IsBestApprox K T p) {w : E} (hw : w ∈ K) : (inner (𝕜 := Real) (T - p) (w)) = 0 := by
  by_cases hw0 : w = 0
  · simp [hw0]
  have hwn : (0 : Real) < ‖w‖ ^ 2 := by
    have hne : ‖w‖ ≠ 0 := norm_ne_zero_iff.mpr hw0
    positivity
  have hq : p + ((inner (𝕜 := Real) (T - p) (w)) / ‖w‖ ^ 2) • w ∈ K :=
    K.add_mem h.1 (K.smul_mem _ hw)
  have hle : ‖T - p‖ ≤ ‖(T - p) - ((inner (𝕜 := Real) (T - p) (w)) / ‖w‖ ^ 2) • w‖ := by
    have hmin := h.2 _ hq
    have hrw : T - (p + ((inner (𝕜 := Real) (T - p) (w)) / ‖w‖ ^ 2) • w)
        = (T - p) - ((inner (𝕜 := Real) (T - p) (w)) / ‖w‖ ^ 2) • w := by abel
    rwa [hrw] at hmin
  have hsq : ‖T - p‖ ^ 2 ≤ ‖(T - p) - ((inner (𝕜 := Real) (T - p) (w)) / ‖w‖ ^ 2) • w‖ ^ 2 := by
    nlinarith [mul_self_le_mul_self (norm_nonneg (T - p)) hle]
  have hx : ‖(T - p) - ((inner (𝕜 := Real) (T - p) (w)) / ‖w‖ ^ 2) • w‖ ^ 2
      = ‖T - p‖ ^ 2 -
        2 * ((inner (𝕜 := Real) (T - p) (w)) / ‖w‖ ^ 2 * (inner (𝕜 := Real) (T - p) (w))) +
        ((inner (𝕜 := Real) (T - p) (w)) / ‖w‖ ^ 2) ^ 2 * ‖w‖ ^ 2 := by
    rw [norm_sub_sq_real, real_inner_smul_right, norm_smul, Real.norm_eq_abs,
      mul_pow, sq_abs]
    try ring
  -- hsq + hx : ‖T−p‖² ≤ ‖T−p‖² − 2·(t·v) + t²·‖w‖²  with t = v/‖w‖², v = ⟪T−p,w⟫
  have hW : (‖w‖ ^ 2 : Real) ≠ 0 := ne_of_gt hwn
  have e1 : ((inner (𝕜 := Real) (T - p) (w)) / ‖w‖ ^ 2) ^ 2 * ‖w‖ ^ 2
      = (inner (𝕜 := Real) (T - p) (w)) ^ 2 / ‖w‖ ^ 2 := by
    field_simp
    try ring
  have e2 : (inner (𝕜 := Real) (T - p) (w)) / ‖w‖ ^ 2 * (inner (𝕜 := Real) (T - p) (w))
      = (inner (𝕜 := Real) (T - p) (w)) ^ 2 / ‖w‖ ^ 2 := by
    field_simp
    try ring
  have hkey : (inner (𝕜 := Real) (T - p) (w)) ^ 2 / ‖w‖ ^ 2 ≤ 0 := by
    linarith [hsq, hx, e1, e2]
  have hcancel : (inner (𝕜 := Real) (T - p) (w)) ^ 2 / ‖w‖ ^ 2 * ‖w‖ ^ 2 = (inner (𝕜 := Real) (T - p) (w)) ^ 2 :=
    div_mul_cancel₀ _ (ne_of_gt hwn)
  have h0 : (inner (𝕜 := Real) (T - p) (w)) ^ 2 = 0 := by
    have hle0 : (inner (𝕜 := Real) (T - p) (w)) ^ 2 ≤ 0 := by nlinarith [hkey, hwn, hcancel]
    exact le_antisymm hle0 (sq_nonneg _)
  exact pow_eq_zero_iff two_ne_zero |>.mp h0

/-- **Uniqueness of best approximation** onto a subspace (no completeness
needed): two optima have orthogonal residuals, and their difference lies in
the family, forcing it to be self-orthogonal. -/
theorem unique {K : Submodule Real E} {T p₁ p₂ : E}
    (h₁ : IsBestApprox K T p₁) (h₂ : IsBestApprox K T p₂) : p₁ = p₂ := by
  have hd : p₁ - p₂ ∈ K := K.sub_mem h₁.1 h₂.1
  have o₁ : (inner (𝕜 := Real) (T - p₁) (p₁ - p₂)) = 0 := h₁.residual_inner_eq_zero hd
  have o₂ : (inner (𝕜 := Real) (T - p₂) (p₁ - p₂)) = 0 := h₂.residual_inner_eq_zero hd
  have hsub : (inner (𝕜 := Real) ((T - p₂) - (T - p₁)) (p₁ - p₂)) = 0 := by
    rw [inner_sub_left, o₁, o₂, sub_zero]
  have hrw : (T - p₂) - (T - p₁) = p₁ - p₂ := by abel
  rw [hrw] at hsub
  have : p₁ - p₂ = 0 := inner_self_eq_zero.mp hsub
  exact sub_eq_zero.mp this

/-- **The consensus theorem.** All best approximations of a target within a
family share one residual: the perpendicular from truth to the family. The
residual — hence any agreement between independently fitted models — is
determined by the (family, target) pair alone. -/
theorem residual_eq {K : Submodule Real E} {T p₁ p₂ : E}
    (h₁ : IsBestApprox K T p₁) (h₂ : IsBestApprox K T p₂) :
    T - p₁ = T - p₂ := by
  rw [unique h₁ h₂]

/-- A best approximation has zero residual iff the truth lies in the family:
nonzero shared error is exactly the signature of a binding constraint. -/
theorem residual_eq_zero_iff {K : Submodule Real E} {T p : E}
    (h : IsBestApprox K T p) : T - p = 0 ↔ T ∈ K := by
  constructor
  · intro h0
    have hTp : T = p := sub_eq_zero.mp h0
    rw [hTp]
    exact h.1
  · intro hT
    have hle : ‖T - p‖ ≤ ‖T - T‖ := h.2 T hT
    rw [sub_self, norm_zero] at hle
    have : ‖T - p‖ = 0 := le_antisymm hle (norm_nonneg _)
    exact norm_eq_zero.mp this

end IsBestApprox

end OpenDistillationFactory.Materials.Theory.ProjectionLaw
