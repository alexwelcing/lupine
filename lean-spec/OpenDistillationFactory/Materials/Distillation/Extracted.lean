import Mathlib.Data.Real.Basic
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
