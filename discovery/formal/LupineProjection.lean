import LupineCoupled

/-! Exact algebra for a declared correction-field representation.
The map theta = b + S z is supplied, not inferred from marginal field bounds.
No injectivity, surjectivity, physical validity, or executable refinement is
asserted. All coordinate and quantity scopes are external scientific premises. -/
namespace LupineProjection

open scoped BigOperators
open LupineCoupled

variable {K D A : Type*}

/-- An explicit common-image parameterization, including rectangular or singular S. -/
def normalize [Fintype D] (offset : K → ℝ) (matrix : K → D → ℝ)
    (z : D → ℝ) : K → ℝ := fun k => offset k + dot (matrix k) z

/-- Every discrepancy is itself a declared affine expression on the common
coordinates. Distinct bounded discrepancy coordinates are one special case. -/
def projected [Fintype K] (nominal : ℝ) (weights offset : K → ℝ)
    (matrix : K → D → ℝ) (discrepancy : Affine D) : Affine D := {
  coefficient := fun d => discrepancy.coefficient d - ∑ k, weights k * matrix k d
  constant := nominal - dot weights offset + discrepancy.constant
}

theorem normalization_dot [Fintype K] [Fintype D]
    (weights offset : K → ℝ) (matrix : K → D → ℝ) (z : D → ℝ) :
    dot weights (normalize offset matrix z) = dot weights offset +
      dot (fun d => ∑ k, weights k * matrix k d) z := by
  rw [combined_dot]
  simp only [dot, normalize, mul_add, Finset.sum_add_distrib]

theorem projected_evaluate [Fintype K] [Fintype D]
    (nominal : ℝ) (weights offset : K → ℝ) (matrix : K → D → ℝ)
    (discrepancy : Affine D) (z : D → ℝ) :
    evaluate (projected nominal weights offset matrix discrepancy) z =
      nominal - dot weights (normalize offset matrix z) + evaluate discrepancy z := by
  rw [normalization_dot]
  simp only [evaluate, projected, dot, sub_mul, Finset.sum_sub_distrib]
  simp only [sub_eq_add_neg, neg_add_rev, add_assoc, add_left_comm, add_comm]

/-- Transfer to an actual quantity needs both supplied equalities. -/
theorem projected_truth [Fintype K] [Fintype D]
    {nominal truth : ℝ} {weights offset theta : K → ℝ} {matrix : K → D → ℝ}
    {discrepancy : Affine D} {z : D → ℝ}
    (himage : theta = normalize offset matrix z)
    (htruth : truth = nominal - dot weights theta + evaluate discrepancy z) :
    truth = evaluate (projected nominal weights offset matrix discrepancy) z := by
  rw [projected_evaluate, ← himage]
  exact htruth

theorem projected_difference [Fintype K] [Fintype D]
    (nominalY nominalX : ℝ) (weightsY weightsX offset : K → ℝ)
    (matrix : K → D → ℝ) (discrepancyY discrepancyX : Affine D) (z : D → ℝ) :
    evaluate (difference (projected nominalY weightsY offset matrix discrepancyY)
      (projected nominalX weightsX offset matrix discrepancyX)) z =
      nominalY - nominalX - dot (fun k => weightsY k - weightsX k)
        (normalize offset matrix z) + evaluate (difference discrepancyY discrepancyX) z := by
  rw [difference_evaluate, projected_evaluate, projected_evaluate, difference_evaluate]
  simp only [dot, sub_mul, Finset.sum_sub_distrib]
  simp only [sub_eq_add_neg, neg_add_rev, neg_neg, add_assoc, add_left_comm, add_comm]

theorem equal_weights_cancel [Fintype K] [Fintype D]
    (nominalY nominalX : ℝ) (weights offset : K → ℝ) (matrix : K → D → ℝ)
    (discrepancyY discrepancyX : Affine D) (z : D → ℝ) :
    evaluate (difference (projected nominalY weights offset matrix discrepancyY)
      (projected nominalX weights offset matrix discrepancyX)) z =
      nominalY - nominalX + evaluate (difference discrepancyY discrepancyX) z := by
  rw [projected_difference]
  simp only [sub_self, dot, zero_mul, Finset.sum_const_zero, sub_zero]

/-- Signed conversions transform the whole expression, including discrepancy. -/
def transform (scale shift : ℝ) (q : Affine D) : Affine D := {
  coefficient := fun d => scale * q.coefficient d
  constant := scale * q.constant + shift
}

theorem transform_evaluate [Fintype D] (scale shift : ℝ) (q : Affine D) (z : D → ℝ) :
    evaluate (transform scale shift q) z = scale * evaluate q z + shift := by
  simp only [evaluate, transform, dot, mul_finite_sum, mul_add, mul_assoc, add_assoc]

theorem normalized_discrepancy_enclosure {radius coordinate : ℝ}
    (hradius : 0 ≤ radius) (hcoordinate : -1 ≤ coordinate ∧ coordinate ≤ 1) :
    -radius ≤ radius * coordinate ∧ radius * coordinate ≤ radius := by
  constructor
  · simpa only [mul_neg, mul_one] using mul_le_mul_of_nonneg_left hcoordinate.1 hradius
  · simpa only [mul_one] using mul_le_mul_of_nonneg_left hcoordinate.2 hradius

theorem scaled_discrepancy_enclosure {radius error : ℝ} (scale : ℝ)
    (herror : -radius ≤ error ∧ error ≤ radius) :
    -(|scale| * radius) ≤ scale * error ∧ scale * error ≤ |scale| * radius := by
  apply abs_le.mp
  rw [abs_mul]
  exact mul_le_mul_of_nonneg_left (abs_le.mpr herror) (abs_nonneg scale)

theorem affine_upper_row_iff [Fintype D] (q : Affine D) (upper : ℝ) (z : D → ℝ) :
    dot q.coefficient z ≤ upper - q.constant ↔ evaluate q z ≤ upper := by
  exact le_sub_iff_add_le

theorem affine_lower_row_iff [Fintype D] (q : Affine D) (lower : ℝ) (z : D → ℝ) :
    dot (fun d => -q.coefficient d) z ≤ q.constant - lower ↔ lower ≤ evaluate q z := by
  have hneg : dot (fun d => -q.coefficient d) z = -dot q.coefficient z := by
    simp only [dot, neg_mul, Finset.sum_neg_distrib]
  rw [hneg, le_sub_iff_add_le]
  constructor
  · intro h
    have hshift := add_le_add h (le_refl (dot q.coefficient z))
    simpa only [evaluate, add_assoc, add_left_comm, add_comm, add_neg_cancel, add_zero] using hshift
  · intro h
    have hshift := add_le_add h (le_refl (-dot q.coefficient z))
    simpa only [evaluate, add_assoc, add_left_comm, add_comm, add_neg_cancel, add_zero] using hshift

/-- Upper rows use the left copy of the anchor type; lower rows the right copy.
No ordering hypothesis is needed: inconsistent anchor intervals yield no point. -/
def anchorSystem (quantity : A → Affine D) (lower upper : A → ℝ) : RowSystem (A ⊕ A) D := {
  coefficient := Sum.elim (fun a => (quantity a).coefficient)
    (fun a d => -(quantity a).coefficient d)
  upper := Sum.elim (fun a => upper a - (quantity a).constant)
    (fun a => (quantity a).constant - lower a)
}

theorem anchor_domain_iff [Fintype D] (quantity : A → Affine D)
    (lower upper : A → ℝ) (z : D → ℝ) :
    InDomain (anchorSystem quantity lower upper) z ↔
      ∀ a, lower a ≤ evaluate (quantity a) z ∧ evaluate (quantity a) z ≤ upper a := by
  constructor
  · intro h a
    exact ⟨(affine_lower_row_iff (quantity a) (lower a) z).mp (h (Sum.inr a)),
      (affine_upper_row_iff (quantity a) (upper a) z).mp (h (Sum.inl a))⟩
  · intro h row
    cases row with
    | inl a => exact (affine_upper_row_iff (quantity a) (upper a) z).mpr (h a).2
    | inr a => exact (affine_lower_row_iff (quantity a) (lower a) z).mpr (h a).1

theorem projected_anchor_domain_iff [Fintype K] [Fintype D]
    (nominal : A → ℝ) (weights : A → K → ℝ) (offset : K → ℝ)
    (matrix : K → D → ℝ) (discrepancy : A → Affine D)
    (lower upper : A → ℝ) (z : D → ℝ) :
    InDomain (anchorSystem (fun a => projected (nominal a) (weights a) offset matrix
      (discrepancy a)) lower upper) z ↔
      ∀ a, lower a ≤ nominal a - dot (weights a) (normalize offset matrix z) +
        evaluate (discrepancy a) z ∧
        nominal a - dot (weights a) (normalize offset matrix z) +
          evaluate (discrepancy a) z ≤ upper a := by
  rw [anchor_domain_iff]
  simp only [projected_evaluate]

end LupineProjection

#print axioms LupineProjection.normalization_dot
#print axioms LupineProjection.projected_evaluate
#print axioms LupineProjection.projected_truth
#print axioms LupineProjection.projected_difference
#print axioms LupineProjection.equal_weights_cancel
#print axioms LupineProjection.transform_evaluate
#print axioms LupineProjection.normalized_discrepancy_enclosure
#print axioms LupineProjection.scaled_discrepancy_enclosure
#print axioms LupineProjection.affine_upper_row_iff
#print axioms LupineProjection.affine_lower_row_iff
#print axioms LupineProjection.anchor_domain_iff
#print axioms LupineProjection.projected_anchor_domain_iff
