import Mathlib.Analysis.InnerProductSpace.Basic
import Mathlib.Analysis.InnerProductSpace.Calculus
import Mathlib.Analysis.Calculus.FDeriv.Basic
import Mathlib.Analysis.Calculus.FDeriv.Comp
import Mathlib.Analysis.Calculus.FDeriv.Add
import Mathlib.Analysis.Calculus.FDeriv.Norm
import Mathlib.Analysis.Calculus.LocalExtr.Basic
import Mathlib.Tactic.Ring

/-! Local normal-cone theorem for smooth non-convex families (Theorem 1')

If a model family's reachable set is a smooth immersed submanifold, then at any
local minimizer the residual lies in the orthogonal complement of the tangent
space. This licenses the foundation-MLIP layer's non-convex neural-network
reachable set; the conclusion is pointwise (one normal space per local
minimizer), not the global consensus theorem.

House rules: zero `sorry`, zero new axioms.
-/

namespace OpenDistillationFactory.Materials.Theory.SmoothProjection

open Real InnerProductSpace Topology

variable {E : Type*} [NormedAddCommGroup E] [InnerProductSpace ℝ E]
  [CompleteSpace E]

/-- A `C¹` immersion `f : ℝᵏ → E`, modeling a smooth (possibly non-convex)
    reachable set `M = range(f)`. The immersion hypothesis ensures the tangent
    space at every point is well-defined as `range(Df(x))`. -/
structure SmoothFamily (E : Type*) [NormedAddCommGroup E] [InnerProductSpace ℝ E]
    [CompleteSpace E] (k : ℕ) where
  toFun : EuclideanSpace ℝ (Fin k) → E
  contDiff : ContDiff ℝ 1 toFun
  immersion : ∀ x : EuclideanSpace ℝ (Fin k),
    Function.Injective (fderiv ℝ toFun x)

namespace SmoothFamily

variable {E : Type*} [NormedAddCommGroup E] [InnerProductSpace ℝ E] [CompleteSpace E]
variable {k : ℕ} (F : SmoothFamily E k)

/-- The reachable set `M = range(f)`. -/
def reachableSet : Set E := Set.range F.toFun

/-- The squared-distance function `g²(x) = ‖T - f(x)‖²`. We use the squared
    norm to ensure differentiability at the minimizer. -/
noncomputable def sqDist (T : E) : EuclideanSpace ℝ (Fin k) → ℝ :=
  fun x => ‖T - F.toFun x‖ ^ 2

/-- The parametrization is differentiable everywhere from `C¹`. -/
lemma toFun_differentiableAt (x : EuclideanSpace ℝ (Fin k)) :
    DifferentiableAt ℝ F.toFun x :=
  F.contDiff.differentiable_one x

/-- The squared-distance function is differentiable everywhere. -/
lemma sqDist_differentiableAt (T : E) (x : EuclideanSpace ℝ (Fin k)) :
    DifferentiableAt ℝ (F.sqDist T) x := by
  have hf : DifferentiableAt ℝ F.toFun x := F.toFun_differentiableAt x
  have h_sub : DifferentiableAt ℝ (fun y : EuclideanSpace ℝ (Fin k) => T - F.toFun y) x :=
    (hf.hasFDerivAt.const_sub T).differentiableAt
  have h_normsq : HasFDerivAt (F.sqDist T)
      (2 • (innerSL ℝ (T - F.toFun x)).comp (-fderiv ℝ F.toFun x)) x := by
    unfold sqDist
    exact HasFDerivAt.norm_sq (hf.hasFDerivAt.const_sub T)
  exact h_normsq.differentiableAt

/-- Derivative of the squared-distance function via the chain rule.

For any test direction `v`, the directional derivative is
`D(‖T - f(·)‖²)(x)[v] = -2 * ⟪T - f(x), Df(x)[v]⟫`. -/
lemma sqDist_fderiv_apply (T : E) (x v : EuclideanSpace ℝ (Fin k)) :
    fderiv ℝ (F.sqDist T) x v = -2 * ⟪T - F.toFun x, fderiv ℝ F.toFun x v⟫_ℝ := by
  have hf : DifferentiableAt ℝ F.toFun x := F.toFun_differentiableAt x
  have h_sub : HasFDerivAt (fun y : EuclideanSpace ℝ (Fin k) => T - F.toFun y)
      (-fderiv ℝ F.toFun x) x :=
    hf.hasFDerivAt.const_sub T
  have h_normsq : HasFDerivAt (F.sqDist T)
      (2 • (innerSL ℝ (T - F.toFun x)).comp (-fderiv ℝ F.toFun x)) x := by
    unfold sqDist
    exact HasFDerivAt.norm_sq h_sub
  have h_fderiv : fderiv ℝ (F.sqDist T) x =
      2 • (innerSL ℝ (T - F.toFun x)).comp (-fderiv ℝ F.toFun x) :=
    h_normsq.fderiv
  rw [h_fderiv]
  simp only [ContinuousLinearMap.smul_apply, ContinuousLinearMap.comp_apply,
    innerSL_apply_apply, ContinuousLinearMap.neg_apply, inner_neg_right (𝕜 := ℝ)]
  ring

/-- **Theorem 1' (Local normal cone, smooth immersion case).** If `x*` is a
    local minimizer of `‖T - f(·)‖²`, then the residual `T - f(x*)` is
    orthogonal to every tangent vector `Df(x*)[v]`. -/
theorem residual_orthogonal_to_tangent
    (T : E) (xstar : EuclideanSpace ℝ (Fin k))
    (hmin : IsLocalMin (F.sqDist T : EuclideanSpace ℝ (Fin k) → ℝ) xstar) :
    ∀ v : EuclideanSpace ℝ (Fin k),
      ⟪T - F.toFun xstar, fderiv ℝ F.toFun xstar v⟫_ℝ = 0 := by
  have hcrit : fderiv ℝ (F.sqDist T) xstar = 0 :=
    IsLocalMin.fderiv_eq_zero hmin
  intro v
  have hzero : fderiv ℝ (F.sqDist T) xstar v = 0 := by
    rw [hcrit]
    simp
  rw [F.sqDist_fderiv_apply T xstar v] at hzero
  have hinner : ⟪T - F.toFun xstar, fderiv ℝ F.toFun xstar v⟫_ℝ = 0 := by
    linarith
  exact hinner

/-- **Corollary: residual lies in the normal space.** The normal space to
    `M = range(f)` at `f(x*)` is `range(Df(x*))^⊥`. -/
theorem residual_mem_normalSpace
    (T : E) (xstar : EuclideanSpace ℝ (Fin k))
    (hmin : IsLocalMin (F.sqDist T : EuclideanSpace ℝ (Fin k) → ℝ) xstar) :
    T - F.toFun xstar ∈ (LinearMap.range (fderiv ℝ F.toFun xstar).toLinearMap : Submodule ℝ E)ᗮ := by
  rw [Submodule.mem_orthogonal']
  intro w hw
  rcases hw with ⟨v, rfl⟩
  exact F.residual_orthogonal_to_tangent T xstar hmin v

/-- **Corollary 1'.1 (Local consensus, weak form).** Two local minimizers with
    the same fitted point have identical residuals (trivially). The substantive
    consensus theorem (Theorem 2) does not extend to non-convex families; the
    empirical clustering statistics test the pointwise normal-space membership
    above. -/
theorem local_consensus_weak
    (T : E)
    (x₁ x₂ : EuclideanSpace ℝ (Fin k))
    (_hmin₁ : IsLocalMin (F.sqDist T : EuclideanSpace ℝ (Fin k) → ℝ) x₁)
    (_hmin₂ : IsLocalMin (F.sqDist T : EuclideanSpace ℝ (Fin k) → ℝ) x₂)
    (hfit : F.toFun x₁ = F.toFun x₂) :
    T - F.toFun x₁ = T - F.toFun x₂ := by
  rw [hfit]

end SmoothFamily

end OpenDistillationFactory.Materials.Theory.SmoothProjection
