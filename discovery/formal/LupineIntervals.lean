import Mathlib.Data.Real.Basic
import Mathlib.Algebra.Order.Field.Basic

/-! Finite real interval enclosure rules. These prove containment, with domain
conditions explicit; they do not prove a refinement of the Python operations. -/
namespace LupineIntervals

def ProductLower (a b c d : ℝ) : ℝ := min (min (a * c) (a * d)) (min (b * c) (b * d))

def ProductUpper (a b c d : ℝ) : ℝ := max (max (a * c) (a * d)) (max (b * c) (b * d))

noncomputable def SquareLower (a b : ℝ) : ℝ :=
  if 0 ≤ a then a * a else if b ≤ 0 then b * b else 0

def SquareUpper (a b : ℝ) : ℝ := max (a * a) (b * b)

theorem scaled_enclosure {a b x k : ℝ} (hx : a ≤ x ∧ x ≤ b) :
    min (a * k) (b * k) ≤ x * k ∧ x * k ≤ max (a * k) (b * k) := by
  rcases le_total 0 k with hk | hk
  · exact ⟨le_trans (min_le_left _ _) (mul_le_mul_of_nonneg_right hx.1 hk),
      le_trans (mul_le_mul_of_nonneg_right hx.2 hk) (le_max_right _ _)⟩
  · exact ⟨le_trans (min_le_right _ _) (mul_le_mul_of_nonpos_right hx.2 hk),
      le_trans (mul_le_mul_of_nonpos_right hx.1 hk) (le_max_left _ _)⟩

/-- The hull of four endpoint products encloses products across any signs.
No independence assumption between the two input values is required. -/
theorem product_enclosure {a b c d x y : ℝ}
    (hx : a ≤ x ∧ x ≤ b) (hy : c ≤ y ∧ y ≤ d) :
    ProductLower a b c d ≤ x * y ∧ x * y ≤ ProductUpper a b c d := by
  have hxy := scaled_enclosure (k := y) hx
  have hay : min (a * c) (a * d) ≤ a * y ∧ a * y ≤ max (a * c) (a * d) := by
    simpa only [mul_comm c a, mul_comm d a, mul_comm y a] using scaled_enclosure (k := a) hy
  have hby : min (b * c) (b * d) ≤ b * y ∧ b * y ≤ max (b * c) (b * d) := by
    simpa only [mul_comm c b, mul_comm d b, mul_comm y b] using scaled_enclosure (k := b) hy
  exact ⟨le_trans (min_le_min hay.1 hby.1) hxy.1,
    le_trans hxy.2 (max_le_max hay.2 hby.2)⟩

/-- A denominator interval wholly on one side of zero excludes an actual zero. -/
theorem zero_excluding_nonzero {a b x : ℝ} (hx : a ≤ x ∧ x ≤ b)
    (hzero : 0 < a ∨ b < 0) : x ≠ 0 := by
  rcases hzero with ha | hb
  · exact ne_of_gt (lt_of_lt_of_le ha hx.1)
  · exact ne_of_lt (lt_of_le_of_lt hx.2 hb)

/-- Reciprocation reverses the endpoints on either zero-excluding sign domain.
Crossing or touching zero does not satisfy the stated domain condition. -/
theorem reciprocal_enclosure {a b x : ℝ} (hx : a ≤ x ∧ x ≤ b)
    (hzero : 0 < a ∨ b < 0) : 1 / b ≤ 1 / x ∧ 1 / x ≤ 1 / a := by
  rcases hzero with ha | hb
  · exact ⟨one_div_le_one_div_of_le (lt_of_lt_of_le ha hx.1) hx.2,
      one_div_le_one_div_of_le ha hx.1⟩
  · exact ⟨one_div_le_one_div_of_neg_of_le hb hx.2,
      one_div_le_one_div_of_neg_of_le (lt_of_le_of_lt hx.2 hb) hx.1⟩

theorem quotient_enclosure {a b c d x y : ℝ}
    (hx : a ≤ x ∧ x ≤ b) (hy : c ≤ y ∧ y ≤ d) (hzero : 0 < c ∨ d < 0) :
    ProductLower a b (1 / d) (1 / c) ≤ x / y ∧
      x / y ≤ ProductUpper a b (1 / d) (1 / c) := by
  simpa only [one_div, div_eq_mul_inv, one_mul] using
    product_enclosure hx (reciprocal_enclosure hy hzero)

theorem square_nonnegative_enclosure {a b x : ℝ}
    (hx : a ≤ x ∧ x ≤ b) (ha : 0 ≤ a) : a * a ≤ x * x ∧ x * x ≤ b * b :=
  ⟨mul_self_le_mul_self ha hx.1,
    mul_self_le_mul_self (le_trans ha hx.1) hx.2⟩

theorem square_nonpositive_enclosure {a b x : ℝ}
    (hx : a ≤ x ∧ x ≤ b) (hb : b ≤ 0) : b * b ≤ x * x ∧ x * x ≤ a * a := by
  have h := square_nonnegative_enclosure
    ⟨neg_le_neg hx.2, neg_le_neg hx.1⟩ (neg_nonneg.mpr hb)
  simpa only [neg_mul_neg] using h

theorem square_upper_enclosure {a b x : ℝ} (hx : a ≤ x ∧ x ≤ b) :
    x * x ≤ SquareUpper a b := by
  rcases le_total 0 x with hx0 | hx0
  · exact le_trans (mul_self_le_mul_self hx0 hx.2) (le_max_right _ _)
  · have h : x * x ≤ a * a := by
      simpa only [neg_mul_neg] using
        mul_self_le_mul_self (neg_nonneg.mpr hx0) (neg_le_neg hx.1)
    exact le_trans h (le_max_left _ _)

/-- Squaring uses the endpoint nearest zero on one-sided intervals and zero
when the input interval crosses zero. The endpoint maximum bounds it above. -/
theorem square_enclosure {a b x : ℝ} (hx : a ≤ x ∧ x ≤ b) :
    SquareLower a b ≤ x * x ∧ x * x ≤ SquareUpper a b := by
  refine ⟨?_, square_upper_enclosure hx⟩
  by_cases ha : 0 ≤ a
  · simpa only [SquareLower, if_pos ha] using (square_nonnegative_enclosure hx ha).1
  · by_cases hb : b ≤ 0
    · simpa only [SquareLower, if_neg ha, if_pos hb] using
        (square_nonpositive_enclosure hx hb).1
    · simpa only [SquareLower, if_neg ha, if_neg hb] using mul_self_nonneg x

end LupineIntervals

#print axioms LupineIntervals.scaled_enclosure
#print axioms LupineIntervals.product_enclosure
#print axioms LupineIntervals.zero_excluding_nonzero
#print axioms LupineIntervals.reciprocal_enclosure
#print axioms LupineIntervals.quotient_enclosure
#print axioms LupineIntervals.square_nonnegative_enclosure
#print axioms LupineIntervals.square_nonpositive_enclosure
#print axioms LupineIntervals.square_upper_enclosure
#print axioms LupineIntervals.square_enclosure
