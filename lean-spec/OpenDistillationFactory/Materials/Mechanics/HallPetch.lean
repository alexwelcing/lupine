import Mathlib.Data.Real.Basic
import Mathlib.Tactic.Linarith

namespace OpenDistillationFactory.Materials.Mechanics.HallPetch

/--
  Formally extracted Hall-Petch grain size strengthening equation.
  σ_y = σ_0 + k * d^{-1/2}

  Derived automatically from atlas-distill literature distillation.
-/
noncomputable def yield_stress (sigma_0 k d : ℝ) : ℝ :=
  sigma_0 + k / Real.sqrt d

theorem yield_stress_positive
    (h_sigma : 0 < sigma_0) (h_k : 0 ≤ k) (h_d : 0 < d) :
    0 < yield_stress sigma_0 k d := by
  have hd_sqrt : 0 < Real.sqrt d := Real.sqrt_pos.mpr h_d
  have h_frac : 0 ≤ k / Real.sqrt d := div_nonneg h_k (le_of_lt hd_sqrt)
  dsimp [yield_stress]
  linarith

end OpenDistillationFactory.Materials.Mechanics.HallPetch
