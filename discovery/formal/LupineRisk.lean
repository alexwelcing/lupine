import Mathlib.Data.Real.Basic
import Mathlib.Data.Rat.Floor
import Mathlib.Data.Set.Lattice
import Mathlib.Algebra.Order.BigOperators.Group.Finset

/-! Finite joint-risk composition from explicit event-risk premises.
The risk law records standard normalized, monotone, finite-subadditivity
properties as hypotheses. It is not a claim that a physical experiment or an
empirical calibration array supplies such a law or valid marginal bounds.
No independence or conformal exchangeability theorem is asserted here. -/
namespace LupineRisk

open scoped BigOperators

variable {Ω I : Type*}

/-- Minimal finite-event properties used below: a normalized monotone subadditive
capacity, which need not be additive probability. These proof fields are caller
hypotheses, not extra project axioms. No countable-additivity adapter is assumed. -/
structure RiskLaw (Ω : Type*) where
  mass : Set Ω → ℝ
  empty : mass ∅ = 0
  total : mass Set.univ = 1
  mono : ∀ {a b}, a ⊆ b → mass a ≤ mass b
  union_le : ∀ a b, mass (a ∪ b) ≤ mass a + mass b

/-- A concrete finite probability distribution supplies the risk-law premises:
all outcomes have nonnegative weight and their weights sum to one. -/
noncomputable def finiteWeightedRisk [Fintype Ω] (weight : Ω → ℝ)
    (hnonnegative : ∀ outcome, 0 ≤ weight outcome)
    (hnormalized : ∑ outcome, weight outcome = 1) : RiskLaw Ω := by
  classical
  refine {
    mass := fun event => ∑ outcome, if outcome ∈ event then weight outcome else 0
    empty := by simp
    total := by simpa using hnormalized
    mono := ?_
    union_le := ?_
  }
  · intro a b hab
    apply Finset.sum_le_sum
    intro outcome _
    by_cases ha : outcome ∈ a
    · simpa only [if_pos ha, if_pos (hab ha)] using le_refl (weight outcome)
    · by_cases hb : outcome ∈ b
      · simpa only [if_neg ha, if_pos hb] using hnonnegative outcome
      · simp only [if_neg ha, if_neg hb, le_refl]
  · intro a b
    rw [← Finset.sum_add_distrib]
    apply Finset.sum_le_sum
    intro outcome _
    by_cases ha : outcome ∈ a <;> by_cases hb : outcome ∈ b
    · simpa only [Set.mem_union, ha, hb, true_or, if_true] using
        le_add_of_nonneg_right (hnonnegative outcome)
    · simp [ha, hb]
    · simp [ha, hb]
    · simp [ha, hb]

theorem risk_nonnegative (p : RiskLaw Ω) (event : Set Ω) : 0 ≤ p.mass event := by
  rw [← p.empty]
  exact p.mono (Set.empty_subset event)

theorem risk_at_most_one (p : RiskLaw Ω) (event : Set Ω) : p.mass event ≤ 1 := by
  rw [← p.total]
  exact p.mono (Set.subset_univ event)

/-- A finite union costs at most the sum of its event risks. -/
theorem finite_union_bound (p : RiskLaw Ω) (indices : Finset I) (events : I → Set Ω) :
    p.mass (⋃ i ∈ indices, events i) ≤ ∑ i ∈ indices, p.mass (events i) := by
  classical
  induction indices using Finset.induction_on with
  | empty => simp [p.empty]
  | @insert i indices hi ih =>
    have hunion : (⋃ j ∈ insert i indices, events j) =
        events i ∪ (⋃ j ∈ indices, events j) := by simp
    rw [hunion, Finset.sum_insert hi]
    exact le_trans (p.union_le _ _) (add_le_add (le_refl _) ih)

/-- Valid individual failure bounds compose whenever their allocated sum fits
the joint budget. No stochastic independence appears as a hypothesis. -/
theorem allocated_joint_failure_bound (p : RiskLaw Ω) (indices : Finset I)
    (events : I → Set Ω) (allocation : I → ℝ) (delta : ℝ)
    (hfailure : ∀ i ∈ indices, p.mass (events i) ≤ allocation i)
    (hbudget : ∑ i ∈ indices, allocation i ≤ delta) :
    p.mass (⋃ i ∈ indices, events i) ≤ delta :=
  le_trans (finite_union_bound p indices events)
    (le_trans (Finset.sum_le_sum hfailure) hbudget)

/-- A direct finite-probability instantiation: nonnegative normalized outcome
weights and valid event budgets imply the allocated joint failure bound. -/
theorem finite_weighted_joint_failure_bound [Fintype Ω] (weight : Ω → ℝ)
    (hnonnegative : ∀ outcome, 0 ≤ weight outcome)
    (hnormalized : ∑ outcome, weight outcome = 1)
    (indices : Finset I) (events : I → Set Ω) (allocation : I → ℝ) (delta : ℝ)
    (hfailure : ∀ i ∈ indices,
      (finiteWeightedRisk weight hnonnegative hnormalized).mass (events i) ≤ allocation i)
    (hbudget : ∑ i ∈ indices, allocation i ≤ delta) :
    (finiteWeightedRisk weight hnonnegative hnormalized).mass (⋃ i ∈ indices, events i) ≤ delta :=
  allocated_joint_failure_bound (finiteWeightedRisk weight hnonnegative hnormalized)
    indices events allocation delta hfailure hbudget

theorem uniform_allocation_sum (indices : Finset I) (hne : indices.Nonempty) (delta : ℝ) :
    (∑ _i ∈ indices, delta / indices.card) = delta := by
  rw [Finset.sum_const, nsmul_eq_mul]
  exact mul_div_cancel₀ delta (Nat.cast_ne_zero.mpr (Finset.card_ne_zero.mpr hne))

theorem uniform_joint_failure_bound (p : RiskLaw Ω) (indices : Finset I)
    (hne : indices.Nonempty) (events : I → Set Ω) (delta : ℝ)
    (hfailure : ∀ i ∈ indices, p.mass (events i) ≤ delta / indices.card) :
    p.mass (⋃ i ∈ indices, events i) ≤ delta :=
  allocated_joint_failure_bound p indices events (fun _ => delta / indices.card) delta
    hfailure (le_of_eq (uniform_allocation_sum indices hne delta))

/-- Any bad decision event contained in the interval-failure union inherits
the allocated joint risk. This isolates the deterministic correctness bridge. -/
theorem failure_subset_bound (p : RiskLaw Ω) (indices : Finset I)
    (events : I → Set Ω) (allocation : I → ℝ) (delta : ℝ) (bad : Set Ω)
    (hfailure : ∀ i ∈ indices, p.mass (events i) ≤ allocation i)
    (hbudget : ∑ i ∈ indices, allocation i ≤ delta)
    (hsubset : bad ⊆ ⋃ i ∈ indices, events i) : p.mass bad ≤ delta :=
  le_trans (p.mono hsubset)
    (allocated_joint_failure_bound p indices events allocation delta hfailure hbudget)

/-- If a deterministic conclusion holds whenever every indexed premise holds,
its failure risk is no greater than the supplied valid joint allocation. -/
theorem conditional_conclusion_failure_bound (p : RiskLaw Ω) (indices : Finset I)
    (events : I → Set Ω) (allocation : I → ℝ) (delta : ℝ) (good : Ω → Prop)
    (hfailure : ∀ i ∈ indices, p.mass (events i) ≤ allocation i)
    (hbudget : ∑ i ∈ indices, allocation i ≤ delta)
    (hcorrect : ∀ outcome, (∀ i ∈ indices, outcome ∉ events i) → good outcome) :
    p.mass {outcome | ¬ good outcome} ≤ delta := by
  classical
  apply failure_subset_bound p indices events allocation delta _ hfailure hbudget
  intro outcome hbad
  by_contra hnot
  apply hbad
  apply hcorrect outcome
  intro i hi hevent
  exact hnot (Set.mem_iUnion.mpr ⟨i, Set.mem_iUnion.mpr ⟨hi, hevent⟩⟩)

theorem conditional_conclusion_success_bound (p : RiskLaw Ω) (indices : Finset I)
    (events : I → Set Ω) (allocation : I → ℝ) (delta : ℝ) (good : Ω → Prop)
    (hfailure : ∀ i ∈ indices, p.mass (events i) ≤ allocation i)
    (hbudget : ∑ i ∈ indices, allocation i ≤ delta)
    (hcorrect : ∀ outcome, (∀ i ∈ indices, outcome ∉ events i) → good outcome) :
    1 - delta ≤ p.mass {outcome | good outcome} := by
  have hbad := conditional_conclusion_failure_bound p indices events allocation delta good
    hfailure hbudget hcorrect
  have hcover : {outcome | good outcome} ∪ {outcome | ¬ good outcome} = Set.univ := by
    ext outcome
    simp only [Set.mem_union, Set.mem_setOf_eq, Set.mem_univ, iff_true]
    exact Classical.em _
  have hpartition := p.union_le {outcome | good outcome} {outcome | ¬ good outcome}
  rw [hcover, p.total] at hpartition
  exact (sub_le_iff_le_add).mpr (le_trans hpartition (add_le_add (le_refl _) hbad))

/-- The natural ceiling rank agrees with the rational calibration planner on
its accepted domain `0 < epsilon < 1`; no broader runtime correspondence is claimed. -/
def CalibrationRank (n : ℕ) (epsilon : ℚ) : ℕ :=
  Nat.ceil (((n : ℚ) + 1) * (1 - epsilon))

/-- The finite-rank resolution threshold is exact, including equality. -/
theorem finite_rank_iff (n : ℕ) (epsilon : ℚ) :
    CalibrationRank n epsilon ≤ n ↔ 1 / ((n : ℚ) + 1) ≤ epsilon := by
  have hpositive : 0 < (n : ℚ) + 1 := add_pos_of_nonneg_of_pos (Nat.cast_nonneg n) zero_lt_one
  rw [CalibrationRank, Nat.ceil_le, mul_sub, mul_one, sub_le_iff_le_add,
    add_le_add_iff_left, div_le_iff₀ hpositive]
  rw [mul_comm]

/-- The finite-sample diagnostic matches the rank boundary for positive risk
allocations, including its exact natural-number rounding and subtraction. -/
theorem finite_rank_iff_minimum_count (n : ℕ) {epsilon : ℚ} (hepsilon : 0 < epsilon) :
    CalibrationRank n epsilon ≤ n ↔ Nat.ceil (1 / epsilon) - 1 ≤ n := by
  rw [finite_rank_iff, Nat.sub_le_iff_le_add, Nat.ceil_le, Nat.cast_add, Nat.cast_one]
  exact one_div_le (add_pos_of_nonneg_of_pos (Nat.cast_nonneg n) zero_lt_one) hepsilon

theorem rank_positive (n : ℕ) {epsilon : ℚ} (hepsilon : epsilon < 1) :
    0 < CalibrationRank n epsilon := by
  apply Nat.ceil_pos.mpr
  exact mul_pos (add_pos_of_nonneg_of_pos (Nat.cast_nonneg n) zero_lt_one)
    (sub_pos.mpr hepsilon)

theorem rank_at_most_next (n : ℕ) {epsilon : ℚ} (hepsilon : 0 ≤ epsilon) :
    CalibrationRank n epsilon ≤ n + 1 := by
  apply Nat.ceil_le.mpr
  have h : ((n : ℚ) + 1) * (1 - epsilon) ≤ ((n : ℚ) + 1) * 1 :=
    mul_le_mul_of_nonneg_left (sub_le_self 1 hepsilon)
      (add_nonneg (Nat.cast_nonneg n) zero_le_one)
  simpa only [mul_one, Nat.cast_add, Nat.cast_one] using h

/-- Insufficient calibration gives precisely the unavailable n+1st rank,
not a finite maximum-residual substitute. -/
theorem insufficient_resolution_rank (n : ℕ) {epsilon : ℚ}
    (hepsilon : 0 ≤ epsilon) (hsmall : epsilon < 1 / ((n : ℚ) + 1)) :
    CalibrationRank n epsilon = n + 1 := by
  apply Nat.le_antisymm (rank_at_most_next n hepsilon)
  apply Nat.succ_le_iff.mpr
  apply Nat.lt_of_not_ge
  intro hfinite
  exact (not_le_of_gt hsmall) ((finite_rank_iff n epsilon).mp hfinite)

end LupineRisk

#print axioms LupineRisk.risk_nonnegative
#print axioms LupineRisk.risk_at_most_one
#print axioms LupineRisk.finite_union_bound
#print axioms LupineRisk.allocated_joint_failure_bound
#print axioms LupineRisk.finite_weighted_joint_failure_bound
#print axioms LupineRisk.uniform_allocation_sum
#print axioms LupineRisk.uniform_joint_failure_bound
#print axioms LupineRisk.failure_subset_bound
#print axioms LupineRisk.conditional_conclusion_failure_bound
#print axioms LupineRisk.conditional_conclusion_success_bound
#print axioms LupineRisk.finite_rank_iff
#print axioms LupineRisk.finite_rank_iff_minimum_count
#print axioms LupineRisk.rank_positive
#print axioms LupineRisk.rank_at_most_next
#print axioms LupineRisk.insufficient_resolution_rank
