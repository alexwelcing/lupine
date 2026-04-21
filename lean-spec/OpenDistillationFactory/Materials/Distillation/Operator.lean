import Mathlib.Data.Real.Basic

namespace OpenDistillationFactory.Materials.Distillation

structure Operator where
  alpha : ℝ

/-- MVP linear correction operator: dG = alpha * dK -/
def predictShearError (op : Operator) (bulkError : ℝ) : ℝ :=
  op.alpha * bulkError

theorem predictShearError_zero (op : Operator) :
    predictShearError op 0 = 0 := by
  simp [predictShearError, mul_zero]

end OpenDistillationFactory.Materials.Distillation
