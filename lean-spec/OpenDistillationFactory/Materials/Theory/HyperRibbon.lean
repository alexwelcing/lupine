import Mathlib.Data.Real.Basic
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity

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

end OpenDistillationFactory.Materials.Theory.HyperRibbon
