import Mathlib.Data.Real.Basic
import Mathlib.Algebra.Order.BigOperators.Group.Finset
import Mathlib.Algebra.BigOperators.Ring.Finset

/-! Conditional finite coefficient algebra. No physical interpretation or
implementation refinement is asserted. Positive totals are explicit premises. -/
namespace LupineNormalization

open scoped BigOperators

variable {I : Type*} [Fintype I]

noncomputable def total (a : I → ℝ) : ℝ := ∑ i, a i

noncomputable def normalize (a : I → ℝ) (i : I) : ℝ := a i / total a

noncomputable def l1 (p q : I → ℝ) : ℝ := ∑ i, |p i - q i|

/-- Nonnegative coefficients with positive total normalize into the unit interval. -/
theorem normalized_coordinate_bounds (a : I → ℝ) (ha : ∀ i, 0 ≤ a i)
    (hpositive : 0 < total a) (i : I) :
    0 ≤ normalize a i ∧ normalize a i ≤ 1 := by
  constructor
  · exact div_nonneg (ha i) (le_of_lt hpositive)
  · have hle : a i ≤ total a :=
      Finset.single_le_sum (fun j _ => ha j) (Finset.mem_univ i)
    exact (div_le_one hpositive).2 hle

/-- Positive total is enough for exact unit sum; nonnegativity is needed for bounds. -/
theorem normalized_sum (a : I → ℝ) (hpositive : 0 < total a) :
    (∑ i, normalize a i) = 1 := by
  simp only [normalize, div_eq_mul_inv]
  rw [← Finset.sum_mul]
  change total a * (total a)⁻¹ = 1
  exact mul_inv_cancel₀ (ne_of_gt hpositive)

/-- Strictly positive scaling preserves the positive-total domain and normalization. -/
theorem positive_scale_invariance (a : I → ℝ) (hpositive : 0 < total a)
    (t : ℝ) (ht : 0 < t) :
    0 < total (fun i => t * a i) ∧ normalize (fun i => t * a i) = normalize a := by
  have htotal : total (fun i => t * a i) = t * total a := by
    simp only [total, Finset.mul_sum]
  constructor
  · rw [htotal]
    exact mul_pos ht hpositive
  · funext i
    change (t * a i) / total (fun j => t * a j) = a i / total a
    rw [htotal]
    exact mul_div_mul_left (a i) (total a) (ne_of_gt ht)

/-- Exact finite L1 distance on normalized nonnegative coefficient maps lies in [0,2]. -/
theorem normalized_l1_bounds (a b : I → ℝ)
    (ha : ∀ i, 0 ≤ a i) (hb : ∀ i, 0 ≤ b i)
    (hapositive : 0 < total a) (hbpositive : 0 < total b) :
    0 ≤ l1 (normalize a) (normalize b) ∧ l1 (normalize a) (normalize b) ≤ 2 := by
  have hp : ∀ i, 0 ≤ normalize a i := fun i =>
    (normalized_coordinate_bounds a ha hapositive i).1
  have hq : ∀ i, 0 ≤ normalize b i := fun i =>
    (normalized_coordinate_bounds b hb hbpositive i).1
  constructor
  · exact Finset.sum_nonneg (fun i _ => abs_nonneg (normalize a i - normalize b i))
  · calc
      l1 (normalize a) (normalize b) ≤ ∑ i, (normalize a i + normalize b i) := by
        apply Finset.sum_le_sum
        intro i _
        have h := abs_sub_le (normalize a i) 0 (normalize b i)
        simpa only [sub_zero, zero_sub, abs_neg, abs_of_nonneg (hp i),
          abs_of_nonneg (hq i)] using h
      _ = (∑ i, normalize a i) + (∑ i, normalize b i) := Finset.sum_add_distrib
      _ = 2 := by rw [normalized_sum a hapositive, normalized_sum b hbpositive,
        one_add_one_eq_two]

/-- Finite L1 is zero precisely for equal maps; no normalization premise is needed. -/
theorem l1_zero_iff_equal (p q : I → ℝ) : l1 p q = 0 ↔ p = q := by
  constructor
  · intro h
    have hterms : ∀ i ∈ Finset.univ, |p i - q i| = 0 :=
      (Finset.sum_eq_zero_iff_of_nonneg (fun i _ => abs_nonneg (p i - q i))).mp h
    funext i
    exact sub_eq_zero.mp (abs_eq_zero.mp (hterms i (Finset.mem_univ i)))
  · intro h
    rw [h]
    simp only [l1, sub_self, abs_zero, Finset.sum_const_zero]

end LupineNormalization

#print axioms LupineNormalization.normalized_coordinate_bounds
#print axioms LupineNormalization.normalized_sum
#print axioms LupineNormalization.positive_scale_invariance
#print axioms LupineNormalization.normalized_l1_bounds
#print axioms LupineNormalization.l1_zero_iff_equal
