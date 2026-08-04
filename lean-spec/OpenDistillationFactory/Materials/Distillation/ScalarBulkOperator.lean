import Mathlib.Data.Real.Basic
import Mathlib.Algebra.BigOperators.Fin
import Mathlib.Algebra.Order.BigOperators.Group.Finset
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Ring
import Mathlib.Tactic.Linarith

/-! # Scalar-bulk distillation operator (v0.2)

Formal model of the operator that succeeded on the 2026-06-27 MLIP elastic
benchmark after the v0.1 global LOO-PCA operator degraded accuracy.

A *class-aware* operator is one that applies a correction only to the scalar
projection of the observable that the model family actually gets wrong.  In the
benchmark the binding error direction is the Voigt bulk modulus
`B = (C₁₁ + 2 C₁₂) / 3`; the v0.2 operator therefore rescales the functional
shift along the bulk modulus by a single learned scalar α instead of projecting
the full tensor.

This file machine-checks:
1. The correction is affine in α at the level of the bulk modulus.
2. The least-squares α* is the exact minimizer of the sum-of-squares residual
   on the bulk projection.
3. When α = 1 the operator reduces to the exact functional-shift correction.

House rules: zero `sorry`, zero new axioms.
-/

namespace OpenDistillationFactory.Materials.Distillation

/-- A cubic elastic tensor represented by its three independent constants:
`(C₁₁, C₁₂, C₄₄)`. -/
def CubicTensor : Type := Fin 3 → ℝ

/-- Voigt bulk modulus for a cubic elastic tensor. -/
noncomputable def bulkModulus (c : CubicTensor) : ℝ := (c 0 + 2 * c 1) / 3

/-- Scalar-bulk correction operator.  The single scalar `α` rescales the
functional shift before it is added to the raw prediction. -/
structure ScalarBulkOperator where
  alpha : ℝ

namespace ScalarBulkOperator

/-- Apply scalar-bulk correction component-wise:
`corrected_i = raw_i + α · shift_i`. -/
noncomputable def correct (op : ScalarBulkOperator) (raw shift : CubicTensor) : CubicTensor :=
  fun i => raw i + op.alpha * shift i

/-- The bulk modulus of the corrected tensor is affine in `α`. -/
theorem bulkModulus_correct (op : ScalarBulkOperator) (raw shift : CubicTensor) :
    bulkModulus (op.correct raw shift) = bulkModulus raw + op.alpha * bulkModulus shift := by
  simp [bulkModulus, correct]
  ring

/-- One calibration sample: raw prediction, functional shift, and target. -/
def Sample : Type := CubicTensor × CubicTensor × CubicTensor

def sampleRaw (s : Sample) : CubicTensor := s.1
def sampleShift (s : Sample) : CubicTensor := s.2.1
def sampleTarget (s : Sample) : CubicTensor := s.2.2

/-- Sum-of-squares residual on the bulk modulus for a given scalar `α`. -/
noncomputable def bulkResidual {m : ℕ}
    (samples : Fin m → Sample) (alpha : ℝ) : ℝ :=
  Finset.sum Finset.univ fun j =>
    let err := bulkModulus (sampleTarget (samples j))
              - bulkModulus (sampleRaw (samples j))
              - alpha * bulkModulus (sampleShift (samples j))
    err ^ 2

/-- Closed-form least-squares fit for the scalar `α`. -/
noncomputable def fit {m : ℕ} (samples : Fin m → Sample) : ℝ :=
  let numerator := Finset.sum Finset.univ fun j =>
    (bulkModulus (sampleTarget (samples j)) - bulkModulus (sampleRaw (samples j)))
      * bulkModulus (sampleShift (samples j))
  let denominator := Finset.sum Finset.univ fun j =>
    (bulkModulus (sampleShift (samples j))) ^ 2
  if denominator = 0 then 0 else numerator / denominator

/-- The fitted scalar minimizes the bulk-residual objective.  The proof expands
the quadratic and uses the standard normal-equation identity. -/
theorem fit_minimizes_bulkResidual {m : ℕ} (samples : Fin m → Sample) (alpha : ℝ) :
    bulkResidual samples (fit samples) ≤ bulkResidual samples alpha := by
  let D := Finset.sum Finset.univ fun j =>
    (bulkModulus (sampleShift (samples j))) ^ 2
  let N := Finset.sum Finset.univ fun j =>
    (bulkModulus (sampleTarget (samples j)) - bulkModulus (sampleRaw (samples j)))
      * bulkModulus (sampleShift (samples j))
  let C := Finset.sum Finset.univ fun j =>
    (bulkModulus (sampleTarget (samples j)) - bulkModulus (sampleRaw (samples j))) ^ 2
  have hS' (a : ℝ) : bulkResidual samples a =
      Finset.sum Finset.univ (fun j => (bulkModulus (sampleTarget (samples j)) - bulkModulus (sampleRaw (samples j))) ^ 2)
      - 2 * a * Finset.sum Finset.univ (fun j =>
          (bulkModulus (sampleTarget (samples j)) - bulkModulus (sampleRaw (samples j)))
            * bulkModulus (sampleShift (samples j)))
      + a ^ 2 * Finset.sum Finset.univ (fun j => (bulkModulus (sampleShift (samples j))) ^ 2) := by
    dsimp [bulkResidual]
    calc
      Finset.sum Finset.univ (fun j =>
          (bulkModulus (sampleTarget (samples j)) - bulkModulus (sampleRaw (samples j))
            - a * bulkModulus (sampleShift (samples j))) ^ 2)
      = Finset.sum Finset.univ (fun j =>
          (bulkModulus (sampleTarget (samples j)) - bulkModulus (sampleRaw (samples j))) ^ 2
          - 2 * a * ((bulkModulus (sampleTarget (samples j)) - bulkModulus (sampleRaw (samples j)))
                     * bulkModulus (sampleShift (samples j)))
          + a ^ 2 * (bulkModulus (sampleShift (samples j))) ^ 2) := by
        apply Finset.sum_congr rfl
        intro j _
        ring
      _ = Finset.sum Finset.univ (fun j => (bulkModulus (sampleTarget (samples j)) - bulkModulus (sampleRaw (samples j))) ^ 2)
          - 2 * a * Finset.sum Finset.univ (fun j =>
              (bulkModulus (sampleTarget (samples j)) - bulkModulus (sampleRaw (samples j)))
                * bulkModulus (sampleShift (samples j)))
          + a ^ 2 * Finset.sum Finset.univ (fun j => (bulkModulus (sampleShift (samples j))) ^ 2) := by
        simp only [Finset.sum_add_distrib, Finset.sum_sub_distrib, Finset.mul_sum]
  have h_eq : bulkResidual samples alpha - bulkResidual samples (fit samples) =
      D * (alpha - fit samples) ^ 2 := by
    rw [hS' alpha, hS' (fit samples)]
    by_cases hD0 : D = 0
    · -- Degenerate denominator: every shift bulk modulus is zero, so N = 0 and
      -- the objective is constant; α* = 0 by convention.
      have hN0 : N = 0 := by
        dsimp [N]
        apply Finset.sum_eq_zero
        intro j _
        have h_zero : bulkModulus (sampleShift (samples j)) = 0 := by
          have h_sum : Finset.sum Finset.univ (fun j => (bulkModulus (sampleShift (samples j))) ^ 2) = 0 := hD0
          have h_zero_sq : (bulkModulus (sampleShift (samples j))) ^ 2 = 0 := by
            apply (Finset.sum_eq_zero_iff_of_nonneg (fun i _ => sq_nonneg _)).mp h_sum j (Finset.mem_univ j)
          nlinarith [h_zero_sq, sq_nonneg (bulkModulus (sampleShift (samples j)) : ℝ)]
        simp [h_zero]
      have hD0' : Finset.sum Finset.univ (fun j => (bulkModulus (sampleShift (samples j))) ^ 2) = 0 := hD0
      have hN0' : Finset.sum Finset.univ (fun j =>
        (bulkModulus (sampleTarget (samples j)) - bulkModulus (sampleRaw (samples j)))
          * bulkModulus (sampleShift (samples j))) = 0 := hN0
      simp [fit, hD0, hD0', hN0']
    · -- Non-degenerate case: α* = N / D, and the residual gap is D·(α − α*)².
      have hDne : D ≠ 0 := hD0
      have hfit : fit samples = N / D := by
        rw [fit, if_neg hDne]
      rw [hfit]
      apply (mul_left_cancel₀ hDne)
      field_simp [hDne]
      ring
  have h_nonneg : 0 ≤ D * (alpha - fit samples) ^ 2 := by
    apply mul_nonneg
    · apply Finset.sum_nonneg
      intro j _
      exact sq_nonneg _
    · exact sq_nonneg _
  linarith [h_eq, h_nonneg]

/-- The exact functional-shift correction is the special case `α = 1`. -/
theorem functional_shift_correct (raw shift : CubicTensor) :
    correct ⟨1⟩ raw shift = fun i => raw i + shift i := by
  funext i
  simp [correct]

end ScalarBulkOperator

end OpenDistillationFactory.Materials.Distillation
