import Mathlib.Data.Real.Basic
import Mathlib.Algebra.Order.BigOperators.Group.Finset
import Mathlib.Data.Finset.Sum

/-! Conservative screening under one common affine latent world.
Certificate soundness is conditional on the declared real row system. It does
not establish physical coupling, certificate-search completeness, or refinement
of a rational executable checker from this real-valued specification. -/
namespace LupineCoupled

open scoped BigOperators

variable {C D R J I : Type*}

/-- The combined row family is finite, including either empty summand. -/
local instance combinedRowsFintype [Fintype R] [Fintype J] : Fintype (R ⊕ J) where
  elems := Finset.univ.disjSum Finset.univ
  complete := by rintro (_ | _) <;> simp

/-- Local finite distributivity avoids importing a larger ring-operator graph. -/
theorem finite_sum_mul (indices : Finset I) (f : I → ℝ) (a : ℝ) :
    (∑ i ∈ indices, f i) * a = ∑ i ∈ indices, f i * a := by
  classical
  induction indices using Finset.induction_on with
  | empty => simp
  | @insert i indices hi ih =>
    simp only [Finset.sum_insert hi, add_mul, ih]

theorem mul_finite_sum (indices : Finset I) (f : I → ℝ) (a : ℝ) :
    a * (∑ i ∈ indices, f i) = ∑ i ∈ indices, a * f i := by
  simpa only [mul_comm] using finite_sum_mul indices f a

def dot [Fintype D] (a z : D → ℝ) : ℝ := ∑ d, a d * z d

structure Affine (D : Type*) where
  coefficient : D → ℝ
  constant : ℝ

def evaluate [Fintype D] (q : Affine D) (z : D → ℝ) : ℝ :=
  dot q.coefficient z + q.constant

def difference (a b : Affine D) : Affine D :=
  ⟨fun d => a.coefficient d - b.coefficient d, a.constant - b.constant⟩

theorem difference_evaluate [Fintype D] (a b : Affine D) (z : D → ℝ) :
    evaluate (difference a b) z = evaluate a z - evaluate b z := by
  simp only [evaluate, difference, dot, sub_mul, Finset.sum_sub_distrib]
  exact sub_add_sub_comm _ _ _ _

theorem affine_nonpositive_iff [Fintype D] (q : Affine D) (z : D → ℝ) :
    evaluate q z ≤ 0 ↔ dot q.coefficient z ≤ -q.constant := by
  constructor
  · intro h
    have hshift := add_le_add h (le_refl (-q.constant))
    simpa only [evaluate, add_assoc, add_neg_cancel, add_zero, zero_add] using hshift
  · intro h
    have hshift := add_le_add h (le_refl q.constant)
    simpa only [neg_add_cancel] using hshift

/-- Rows are normalized as M_r dot z <= upper_r; there is no row constant. -/
structure RowSystem (R D : Type*) where
  coefficient : R → D → ℝ
  upper : R → ℝ

def InDomain [Fintype D] (system : RowSystem R D) (z : D → ℝ) : Prop :=
  ∀ r, dot (system.coefficient r) z ≤ system.upper r

def Consistent [Fintype D] (system : RowSystem R D) : Prop :=
  ∃ z, InDomain system z

theorem point_consistency [Fintype D] {system : RowSystem R D} {z : D → ℝ}
    (hpoint : ∀ r, dot (system.coefficient r) z ≤ system.upper r) : Consistent system :=
  ⟨z, hpoint⟩

theorem combined_dot [Fintype R] [Fintype D]
    (multiplier : R → ℝ) (matrix : R → D → ℝ) (z : D → ℝ) :
    dot (fun d => ∑ r, multiplier r * matrix r d) z =
      ∑ r, multiplier r * dot (matrix r) z := by
  unfold dot
  simp_rw [finite_sum_mul, mul_finite_sum, mul_assoc]
  exact Finset.sum_comm

structure UpperCertificate [Fintype R] (system : RowSystem R D)
    (q : Affine D) (beta : ℝ) where
  multiplier : R → ℝ
  nonnegative : ∀ r, 0 ≤ multiplier r
  coefficient_eq : ∀ d, (∑ r, multiplier r * system.coefficient r d) = q.coefficient d
  upper_le : (∑ r, multiplier r * system.upper r) + q.constant ≤ beta

theorem affine_combination_upper_bound [Fintype R] [Fintype D]
    {system : RowSystem R D} {q : Affine D} {beta : ℝ}
    (certificate : UpperCertificate system q beta) {z : D → ℝ}
    (hz : InDomain system z) : evaluate q z ≤ beta := by
  have hcoefficient : (fun d => ∑ r, certificate.multiplier r * system.coefficient r d) =
      q.coefficient := funext certificate.coefficient_eq
  have hdot : dot q.coefficient z =
      ∑ r, certificate.multiplier r * dot (system.coefficient r) z := by
    rw [← hcoefficient]
    exact combined_dot certificate.multiplier system.coefficient z
  have hsum : (∑ r, certificate.multiplier r * dot (system.coefficient r) z) ≤
      ∑ r, certificate.multiplier r * system.upper r :=
    Finset.sum_le_sum (fun r _ => mul_le_mul_of_nonneg_left (hz r) (certificate.nonnegative r))
  exact le_trans (by simpa only [evaluate, hdot] using add_le_add hsum (le_refl q.constant))
    certificate.upper_le

structure ContradictionCertificate [Fintype R] (system : RowSystem R D) where
  multiplier : R → ℝ
  nonnegative : ∀ r, 0 ≤ multiplier r
  coefficient_zero : ∀ d, (∑ r, multiplier r * system.coefficient r d) = 0
  upper_negative : (∑ r, multiplier r * system.upper r) < 0

theorem contradiction_no_point [Fintype R] [Fintype D]
    {system : RowSystem R D} (certificate : ContradictionCertificate system) :
    ∀ z, ¬ InDomain system z := by
  intro z hz
  let q : Affine D := ⟨fun _ => 0, 0⟩
  let bound : UpperCertificate system q (∑ r, certificate.multiplier r * system.upper r) := {
    multiplier := certificate.multiplier
    nonnegative := certificate.nonnegative
    coefficient_eq := certificate.coefficient_zero
    upper_le := by simp [q]
  }
  have hbound := affine_combination_upper_bound bound hz
  have hzero : 0 ≤ ∑ r, certificate.multiplier r * system.upper r := by
    simpa only [evaluate, dot, q, zero_mul, Finset.sum_const_zero, add_zero] using hbound
  exact (not_le_of_gt certificate.upper_negative) hzero

theorem consistent_no_contradiction [Fintype R] [Fintype D]
    {system : RowSystem R D} (hconsistent : Consistent system) :
    ¬ Nonempty (ContradictionCertificate system) := by
  rintro ⟨certificate⟩
  obtain ⟨z, hz⟩ := hconsistent
  exact contradiction_no_point certificate z hz

def Feasible [Fintype D] (constraints : C → J → Affine D) (z : D → ℝ) (x : C) : Prop :=
  ∀ j, evaluate (constraints x j) z ≤ 0

/-- Qx appends every constraint row with its affine constant moved to the right. -/
def candidateSystem (system : RowSystem R D) (constraints : C → J → Affine D)
    (x : C) : RowSystem (R ⊕ J) D := {
  coefficient := Sum.elim system.coefficient (fun j => (constraints x j).coefficient)
  upper := Sum.elim system.upper (fun j => -(constraints x j).constant)
}

theorem candidate_domain_iff [Fintype D] (system : RowSystem R D)
    (constraints : C → J → Affine D) (x : C) (z : D → ℝ) :
    InDomain (candidateSystem system constraints x) z ↔
      InDomain system z ∧ Feasible constraints z x := by
  constructor
  · intro h
    constructor
    · intro r
      exact h (Sum.inl r)
    · intro j
      have hj := h (Sum.inr j)
      exact (affine_nonpositive_iff (constraints x j) z).mpr hj
  · rintro ⟨hbase, hx⟩ row
    cases row with
    | inl r => exact hbase r
    | inr j => exact (affine_nonpositive_iff (constraints x j) z).mp (hx j)

def Minimizer [Fintype D] (score : C → Affine D) (constraints : C → J → Affine D)
    (z : D → ℝ) (x : C) : Prop :=
  Feasible constraints z x ∧ ∀ y, Feasible constraints z y → evaluate (score x) z ≤ evaluate (score y) z

structure ConditionalWitness [Fintype R] [Fintype J]
    (system : RowSystem R D) (score : C → Affine D) (constraints : C → J → Affine D)
    (x : C) where
  witness : C
  margin : ℝ
  margin_positive : 0 < margin
  feasible_certificates : ∀ j,
    UpperCertificate (candidateSystem system constraints x) (constraints witness j) 0
  score_certificate : UpperCertificate (candidateSystem system constraints x)
    (difference (score witness) (score x)) (-margin)

theorem conditional_witness_better [Fintype R] [Fintype J] [Fintype D]
    {system : RowSystem R D} {score : C → Affine D} {constraints : C → J → Affine D}
    {x : C} (certificate : ConditionalWitness system score constraints x) {z : D → ℝ}
    (hz : InDomain system z) (hx : Feasible constraints z x) :
    Feasible constraints z certificate.witness ∧
      evaluate (score certificate.witness) z < evaluate (score x) z := by
  have hdomain := (candidate_domain_iff system constraints x z).mpr ⟨hz, hx⟩
  constructor
  · intro j
    exact affine_combination_upper_bound (certificate.feasible_certificates j) hdomain
  · have hscore := affine_combination_upper_bound certificate.score_certificate hdomain
    rw [difference_evaluate] at hscore
    exact sub_neg.mp (lt_of_le_of_lt hscore (neg_neg_of_pos certificate.margin_positive))

theorem infeasible_exclusion_sound [Fintype R] [Fintype J] [Fintype D]
    {system : RowSystem R D} {constraints : C → J → Affine D} {x : C}
    (certificate : ContradictionCertificate (candidateSystem system constraints x))
    {z : D → ℝ} (hz : InDomain system z) : ¬ Feasible constraints z x := by
  intro hx
  exact contradiction_no_point certificate z
    ((candidate_domain_iff system constraints x z).mpr ⟨hz, hx⟩)

theorem strict_witness_exclusion_sound [Fintype R] [Fintype J] [Fintype D]
    {system : RowSystem R D} {score : C → Affine D} {constraints : C → J → Affine D}
    {x : C} (certificate : ConditionalWitness system score constraints x) {z : D → ℝ}
    (hz : InDomain system z) : ¬ Minimizer score constraints z x := by
  intro hmin
  obtain ⟨hy, hbetter⟩ := conditional_witness_better certificate hz hmin.1
  exact (not_le_of_gt hbetter) (hmin.2 certificate.witness hy)

theorem equal_scores_no_strict_witness [Fintype R] [Fintype J] [Fintype D]
    {system : RowSystem R D} {score : C → Affine D} {constraints : C → J → Affine D}
    {x : C} (certificate : ConditionalWitness system score constraints x) {z : D → ℝ}
    (hz : InDomain system z) (hx : Feasible constraints z x) :
    evaluate (score certificate.witness) z ≠ evaluate (score x) z :=
  ne_of_lt (conditional_witness_better certificate hz hx).2

def CertifiedExclusion [Fintype R] [Fintype J] (system : RowSystem R D)
    (score : C → Affine D) (constraints : C → J → Affine D) (x : C) : Prop :=
  Nonempty (ContradictionCertificate (candidateSystem system constraints x)) ∨
    Nonempty (ConditionalWitness system score constraints x)

theorem certified_exclusion_not_minimizer [Fintype R] [Fintype J] [Fintype D]
    {system : RowSystem R D} {score : C → Affine D} {constraints : C → J → Affine D}
    {x : C} (hexcluded : CertifiedExclusion system score constraints x) {z : D → ℝ}
    (hz : InDomain system z) : ¬ Minimizer score constraints z x := by
  rcases hexcluded with hinfeasible | hdominated
  · obtain ⟨certificate⟩ := hinfeasible
    intro hmin
    exact infeasible_exclusion_sound certificate hz hmin.1
  · obtain ⟨certificate⟩ := hdominated
    exact strict_witness_exclusion_sound certificate hz

/-- The runtime may supply any subset of certified exclusions. An inactive
consistency/premise gate adds no exclusion to the original baseline pool. -/
def Retained (baseline : C → Prop) (enabled : Bool) (remove : C → Prop) (x : C) : Prop :=
  baseline x ∧ ¬ (enabled = true ∧ remove x)

theorem disabled_retains_baseline (baseline : C → Prop) (remove : C → Prop) (x : C) :
    Retained baseline false remove x ↔ baseline x := by
  simp [Retained]

/-- Use this all-candidate baseline when even the diagnostic interval bounds
depend on the coupling premises whose gate is inactive. -/
theorem disabled_retains_all (remove : C → Prop) (x : C) :
    Retained (fun _ => True) false remove x :=
  (disabled_retains_baseline (fun _ => True) remove x).mpr trivial

theorem inconsistent_gate_retains_baseline [Fintype D] {system : RowSystem R D}
    (baseline : C → Prop) (enabled : Bool) (remove : C → Prop)
    (hgate : enabled = true → Consistent system) (hinconsistent : ¬ Consistent system) (x : C) :
    Retained baseline enabled remove x ↔ baseline x := by
  constructor
  · exact fun h => h.1
  · intro hx
    refine ⟨hx, ?_⟩
    rintro ⟨henabled, _⟩
    exact hinconsistent (hgate henabled)

/-- Every tied feasible minimizer at the same admitted latent world survives
any collection of verified exclusions, provided the baseline already retains it. -/
theorem minimizer_retained [Fintype R] [Fintype J] [Fintype D]
    {system : RowSystem R D} {score : C → Affine D} {constraints : C → J → Affine D}
    {baseline remove : C → Prop} {enabled : Bool}
    (hverified : ∀ x, remove x → CertifiedExclusion system score constraints x)
    {z : D → ℝ} (hz : InDomain system z) {x : C}
    (hmin : Minimizer score constraints z x) (hbaseline : baseline x) :
    Retained baseline enabled remove x := by
  refine ⟨hbaseline, ?_⟩
  rintro ⟨_, hremove⟩
  exact certified_exclusion_not_minimizer (hverified x hremove) hz hmin

end LupineCoupled

#print axioms LupineCoupled.finite_sum_mul
#print axioms LupineCoupled.mul_finite_sum
#print axioms LupineCoupled.difference_evaluate
#print axioms LupineCoupled.affine_nonpositive_iff
#print axioms LupineCoupled.point_consistency
#print axioms LupineCoupled.combined_dot
#print axioms LupineCoupled.affine_combination_upper_bound
#print axioms LupineCoupled.contradiction_no_point
#print axioms LupineCoupled.consistent_no_contradiction
#print axioms LupineCoupled.candidate_domain_iff
#print axioms LupineCoupled.conditional_witness_better
#print axioms LupineCoupled.infeasible_exclusion_sound
#print axioms LupineCoupled.strict_witness_exclusion_sound
#print axioms LupineCoupled.equal_scores_no_strict_witness
#print axioms LupineCoupled.certified_exclusion_not_minimizer
#print axioms LupineCoupled.disabled_retains_baseline
#print axioms LupineCoupled.disabled_retains_all
#print axioms LupineCoupled.inconsistent_gate_retains_baseline
#print axioms LupineCoupled.minimizer_retained
