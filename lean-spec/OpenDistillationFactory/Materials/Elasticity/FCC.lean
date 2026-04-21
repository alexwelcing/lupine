import Mathlib.Data.Real.Basic
import Mathlib.Tactic.Linarith

namespace OpenDistillationFactory.Materials.Elasticity

/-- Voigt-Reuss-Hill bulk modulus for cubic crystals -/
noncomputable def K (C11 C12 : ℝ) : ℝ := (C11 + 2 * C12) / 3

/-- Voigt-Reuss-Hill shear modulus for cubic crystals -/
noncomputable def G (C11 C12 C44 : ℝ) : ℝ := (C11 - C12 + 3 * C44) / 5

/-- Zener anisotropy ratio -/
noncomputable def A (C11 C12 C44 : ℝ) : ℝ := (2 * C44) / (C11 - C12)

theorem K_def (C11 C12 : ℝ) : K C11 C12 = (C11 + 2 * C12) / 3 := rfl

theorem K_positive_of_positive
    (h11 : 0 < C11) (h12 : 0 < C12) : 0 < K C11 C12 := by
  unfold K
  have hsum : 0 < C11 + 2 * C12 := by linarith
  linarith

end OpenDistillationFactory.Materials.Elasticity
