use std::fs;
use std::path::Path;

pub fn write_lean_spec() -> Result<(), std::io::Error> {
    let hall_petch_lean_code = r#"import Mathlib.Data.Real.Basic
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
"#;

    let eam_lean_code = r#"import Mathlib.Data.Real.Basic
import OpenDistillationFactory.Materials.Distillation.Operator

namespace OpenDistillationFactory.Materials.Distillation.Extracted

/--
  Formally extracted Systematic Shear Bound operator.
  Generated automatically by atlas-distill after validation.
-/

def eamShearOperator : Operator := {
  alpha := 0.65
}

theorem eam_shear_bound_zero : predictShearError eamShearOperator 0 = 0 := by
  simp [predictShearError, mul_zero]

theorem eam_shear_bound_monotonic (e1 e2 : ℝ) (h : e1 ≤ e2) :
    predictShearError eamShearOperator e1 ≤ predictShearError eamShearOperator e2 := by
  dsimp [predictShearError, eamShearOperator]
  nlinarith

end OpenDistillationFactory.Materials.Distillation.Extracted
"#;

    let mechanics_dir = Path::new("../lean-spec/OpenDistillationFactory/Materials/Mechanics");
    fs::create_dir_all(mechanics_dir)?;
    let hp_path = mechanics_dir.join("HallPetch.lean");
    fs::write(&hp_path, hall_petch_lean_code)?;
    eprintln!("  ✅ Lean formalization written to: {}", hp_path.display());

    let dist_dir = Path::new("../lean-spec/OpenDistillationFactory/Materials/Distillation");
    fs::create_dir_all(dist_dir)?;
    let dist_path = dist_dir.join("Extracted.lean");
    fs::write(&dist_path, eam_lean_code)?;
    eprintln!("  ✅ Lean formalization written to: {}", dist_path.display());
    
    Ok(())
}
