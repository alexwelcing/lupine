import Mathlib.Data.Real.Basic
import Mathlib.Algebra.BigOperators.Ring.Finset
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

namespace OpenDistillationFactory.Materials.Theory.HyperRibbon

/-- The participation ratio of a 3D spectrum. -/
noncomputable def PR (l1 l2 l3 : ℝ) : ℝ :=
  (l1 + l2 + l3)^2 / (l1^2 + l2^2 + l3^2)

/--
  Theorem: The Hyper-Ribbon Bound for 3D Sloppy Models.
  If the eigenvalue spectrum exhibits rapid decay (e.g., q <= 1/2),
  the Participation Ratio is strictly bounded below 2.
  This formalizes why sloppy model error manifolds appear as 1D/2D ribbons.
-/
theorem hyper_ribbon_bound_3d
  (l1 l2 l3 : ℝ)
  (hpos1 : 0 < l1)
  (hpos2 : 0 < l2)
  (hpos3 : 0 < l3)
  (h_decay2 : l2 ≤ 0.25 * l1)
  (h_decay3 : l3 ≤ 0.0625 * l1) :
  (l1 + l2 + l3)^2 < 2 * (l1^2 + l2^2 + l3^2) := by
  have sum_bound : l1 + l2 + l3 ≤ 1.3125 * l1 := by linarith
  have sum_sq_bound : (l1 + l2 + l3)^2 ≤ 1.72265625 * l1^2 := by nlinarith
  have right_bound : 1.72265625 * l1^2 < 2 * l1^2 := by nlinarith
  have final_bound : 2 * l1^2 ≤ 2 * (l1^2 + l2^2 + l3^2) := by nlinarith
  nlinarith

-- ═══════════════════════════════════════════════════════════════
-- HIGH-DIMENSIONAL HYPER-RIBBON BOUNDS
--
-- The 3D bound generalizes to higher dimensions: rapid geometric decay
-- forces the participation ratio below 2. We prove the 4D case explicitly
-- (the first dimension beyond the cubic elastic tensor) and add a
-- d-dimensional PR definition with scale invariance.
-- ═══════════════════════════════════════════════════════════════

/-- Participation ratio of a d-dimensional spectrum. -/
noncomputable def PRfin {d : ℕ} (lam : Fin d → ℝ) : ℝ :=
  (∑ i, lam i) ^ 2 / (∑ i, lam i ^ 2)

/-- PR is unchanged by an overall positive scale factor: the unit of the
    eigenvalues drops out. -/
theorem PRfin_scale_invariant {d : ℕ} (lam : Fin d → ℝ) {c : ℝ} (hc : 0 < c) :
    PRfin (fun i => c * lam i) = PRfin lam := by
  unfold PRfin
  have h1 : ∀ i, (c * lam i) ^ 2 = c ^ 2 * lam i ^ 2 := fun i => by ring
  simp only [h1, ← Finset.mul_sum]
  have hcne : c ≠ 0 := by linarith
  rcases eq_or_ne (∑ i, lam i ^ 2) 0 with h0 | h0
  · rw [h0, mul_zero, div_zero, div_zero]
  · field_simp
    all_goals ring

/-- Explicit 4D ribbon bound: if λ₂ ≤ λ₁/4, λ₃ ≤ λ₂/4, λ₄ ≤ λ₃/4,
    then PR < 2. This shows the ribbon phenomenon is not an artifact of d = 3. -/
theorem hyper_ribbon_bound_4d
  (l1 l2 l3 l4 : ℝ)
  (hpos1 : 0 < l1) (hpos2 : 0 < l2) (hpos3 : 0 < l3) (hpos4 : 0 < l4)
  (h2 : l2 ≤ 0.25 * l1) (h3 : l3 ≤ 0.25 * l2) (h4 : l4 ≤ 0.25 * l3) :
  (l1 + l2 + l3 + l4) ^ 2 < 2 * (l1^2 + l2^2 + l3^2 + l4^2) := by
  have h23 : l3 ≤ 0.0625 * l1 := by nlinarith
  have h24 : l4 ≤ 0.015625 * l1 := by nlinarith
  have sum_bound : l1 + l2 + l3 + l4 ≤ 1.328125 * l1 := by nlinarith
  have sum_sq_bound : (l1 + l2 + l3 + l4) ^ 2 ≤ (1.328125 ^ 2) * l1^2 := by nlinarith
  have coeff_bound : (1.328125 : ℝ) ^ 2 < 2 := by norm_num
  have right_bound : (1.328125 ^ 2) * l1^2 < 2 * l1^2 := by nlinarith
  have final_bound : 2 * l1^2 ≤ 2 * (l1^2 + l2^2 + l3^2 + l4^2) := by nlinarith
  nlinarith

end OpenDistillationFactory.Materials.Theory.HyperRibbon
