import Mathlib.Data.Real.Basic
import Mathlib.Data.Rat.Floor
import Mathlib.Data.Finset.Card
import Mathlib.Algebra.Order.BigOperators.Group.Finset
import Mathlib.Algebra.BigOperators.Ring.Finset

/-! Deterministic kernels for direct candidate-pool calibration.
This module proves finite counting and decision equivalences.
It also derives averaging for a finite weighted law under explicit equal-risk
symmetry. General exchangeability, fitting independence and empirical
usefulness are not proved or assumed as project axioms. -/
namespace LupineDecisionPool

open scoped BigOperators

variable {I C Ω : Type*}

theorem exists_minimum_score (indices : Finset I) (score : I → ℝ)
    (hnonempty : indices.Nonempty) :
    ∃ i ∈ indices, ∀ j ∈ indices, score i ≤ score j := by
  classical
  induction indices using Finset.induction_on with
  | empty => simp at hnonempty
  | @insert i indices hi ih =>
    by_cases hrest : indices.Nonempty
    · obtain ⟨j, hj, hmin⟩ := ih hrest
      by_cases hij : score i ≤ score j
      · refine ⟨i, Finset.mem_insert_self _ _, ?_⟩
        intro x hx
        rcases Finset.mem_insert.mp hx with rfl | hx
        · exact le_refl _
        · exact le_trans hij (hmin x hx)
      · refine ⟨j, Finset.mem_insert_of_mem hj, ?_⟩
        intro x hx
        rcases Finset.mem_insert.mp hx with rfl | hx
        · exact le_of_lt (lt_of_not_ge hij)
        · exact hmin x hx
    · have hempty : indices = ∅ := Finset.not_nonempty_iff_eq_empty.mp hrest
      subst indices
      exact ⟨i, by simp, by simp⟩

noncomputable def strictLower (indices : Finset I) (score : I → ℝ) (i : I) : Finset I := by
  classical
  exact indices.filter (fun j => score j < score i)

noncomputable def rankFailures (indices : Finset I) (score : I → ℝ) (k : ℕ) : Finset I := by
  classical
  exact indices.filter (fun i => k ≤ (strictLower indices score i).card)

/-- At most N-k scores have at least k strictly smaller companions.
The bound holds for every k, with natural subtraction, including ties and empty sets. -/
theorem strict_lower_failure_count (indices : Finset I) (score : I → ℝ) (k : ℕ) :
    (rankFailures indices score k).card ≤ indices.card - k := by
  classical
  let bad := rankFailures indices score k
  have hsubset : bad ⊆ indices := Finset.filter_subset _ _
  by_cases hbad : bad.Nonempty
  · obtain ⟨i, hi, hmin⟩ := exists_minimum_score bad score hbad
    have hk : k ≤ (strictLower indices score i).card := (Finset.mem_filter.mp hi).2
    have hdisjoint : strictLower indices score i ⊆ indices \ bad := by
      intro j hj
      obtain ⟨hjs, hji⟩ := Finset.mem_filter.mp hj
      refine Finset.mem_sdiff.mpr ⟨hjs, ?_⟩
      intro hjbad
      exact (not_le_of_gt hji) (hmin j hjbad)
    have hsum : bad.card + k ≤ indices.card := calc
      bad.card + k ≤ bad.card + (indices \ bad).card :=
        Nat.add_le_add_left (le_trans hk (Finset.card_le_card hdisjoint)) _
      _ = indices.card := by
        rw [Nat.add_comm, Finset.card_sdiff_add_card_eq_card hsubset]
    exact Nat.le_sub_of_add_le hsum
  · have hempty : bad = ∅ := Finset.not_nonempty_iff_eq_empty.mp hbad
    change bad.card ≤ indices.card - k
    simp only [hempty, Finset.card_empty, Nat.zero_le]

/-- These two finite counts characterize a kth ascending order statistic.
They require no arbitrary breaking of equal score values. -/
noncomputable def IsOrderStatistic (indices : Finset I) (score : I → ℝ)
    (k : ℕ) (threshold : ℝ) : Prop := by
  classical
  exact (indices.filter (fun i => score i < threshold)).card < k ∧
    k ≤ (indices.filter (fun i => score i ≤ threshold)).card

theorem order_statistic_lt_iff (indices : Finset I) (score : I → ℝ)
    (k : ℕ) (threshold value : ℝ) (hquantile : IsOrderStatistic indices score k threshold) :
    threshold < value ↔ k ≤ (indices.filter (fun i => score i < value)).card := by
  classical
  constructor
  · intro hlt
    apply le_trans hquantile.2
    apply Finset.card_le_card
    intro i hi
    obtain ⟨his, hiq⟩ := Finset.mem_filter.mp hi
    exact Finset.mem_filter.mpr ⟨his, lt_of_le_of_lt hiq hlt⟩
  · intro hcount
    apply lt_of_not_ge
    intro hle
    have hsubset : indices.filter (fun i => score i < value) ⊆
        indices.filter (fun i => score i < threshold) := by
      intro i hi
      obtain ⟨his, hiv⟩ := Finset.mem_filter.mp hi
      exact Finset.mem_filter.mpr ⟨his, lt_of_lt_of_le hiv hle⟩
    exact (not_le_of_gt hquantile.1) (le_trans hcount (Finset.card_le_card hsubset))

theorem erase_strict_lower [DecidableEq I] (indices : Finset I) (score : I → ℝ) (i : I) :
    strictLower (indices.erase i) score i = strictLower indices score i := by
  classical
  ext j
  simp only [strictLower, Finset.mem_filter, Finset.mem_erase]
  constructor
  · rintro ⟨⟨_, hj⟩, hlt⟩
    exact ⟨hj, hlt⟩
  · rintro ⟨hj, hlt⟩
    refine ⟨⟨?_, hj⟩, hlt⟩
    intro heq
    subst j
    exact (lt_irrefl (score i)) hlt

/-- A supplied exact leave-one-out quantile family obeys the same count bound.
Converting this count into a probability requires a separate additive,
exchangeable law; this theorem makes no such probabilistic claim. -/
theorem leave_one_out_failure_count [DecidableEq I] (indices : Finset I) (score : I → ℝ)
    (k : ℕ) (threshold : I → ℝ)
    (hquantile : ∀ i ∈ indices, IsOrderStatistic (indices.erase i) score k (threshold i)) :
    (indices.filter (fun i => threshold i < score i)).card ≤ indices.card - k := by
  classical
  have heq : indices.filter (fun i => threshold i < score i) = rankFailures indices score k := by
    ext i
    simp only [rankFailures, Finset.mem_filter]
    constructor
    · rintro ⟨hi, hfail⟩
      have hcount := (order_statistic_lt_iff (indices.erase i) score k (threshold i)
        (score i) (hquantile i hi)).mp hfail
      change k ≤ (strictLower (indices.erase i) score i).card at hcount
      rw [erase_strict_lower] at hcount
      exact ⟨hi, hcount⟩
    · rintro ⟨hi, hcount⟩
      refine ⟨hi, ?_⟩
      apply (order_statistic_lt_iff (indices.erase i) score k (threshold i)
        (score i) (hquantile i hi)).mpr
      change k ≤ (strictLower (indices.erase i) score i).card
      rw [erase_strict_lower]
      exact hcount
  rw [heq]
  exact strict_lower_failure_count indices score k

theorem exists_maximum_score (indices : Finset I) (score : I → ℝ)
    (hnonempty : indices.Nonempty) :
    ∃ i ∈ indices, ∀ j ∈ indices, score j ≤ score i := by
  obtain ⟨i, hi, hmin⟩ := exists_minimum_score indices (fun j => -score j) hnonempty
  exact ⟨i, hi, fun j hj => neg_le_neg_iff.mp (hmin j hj)⟩

/-- A real kth order statistic exists at every valid finite rank. -/
theorem exists_order_statistic (indices : Finset I) (score : I → ℝ)
    (k : ℕ) (hkpos : 0 < k) (hkcard : k ≤ indices.card) :
    ∃ threshold, IsOrderStatistic indices score k threshold := by
  classical
  let good := indices \ rankFailures indices score k
  have hbadsub : rankFailures indices score k ⊆ indices := Finset.filter_subset _ _
  have hgoodcard : k ≤ good.card := by
    have hcount := strict_lower_failure_count indices score k
    have hsum := Finset.card_sdiff_add_card_eq_card hbadsub
    change good.card + (rankFailures indices score k).card = indices.card at hsum
    omega
  have hnonempty : good.Nonempty := Finset.card_pos.mp (lt_of_lt_of_le hkpos hgoodcard)
  obtain ⟨i, hi, hmax⟩ := exists_maximum_score good score hnonempty
  have his := (Finset.mem_sdiff.mp hi).1
  have hinot := (Finset.mem_sdiff.mp hi).2
  refine ⟨score i, ?_, ?_⟩
  · apply lt_of_not_ge
    intro hcount
    exact hinot (Finset.mem_filter.mpr ⟨his, hcount⟩)
  · apply le_trans hgoodcard
    apply Finset.card_le_card
    intro j hj
    exact Finset.mem_filter.mpr ⟨(Finset.mem_sdiff.mp hj).1, hmax j hj⟩

noncomputable def maximumOrZero (indices : Finset I) (score : I → ℝ) : ℝ :=
  if h : indices.Nonempty then score (exists_maximum_score indices score h).choose else 0

theorem maximum_or_zero_le_iff (indices : Finset I) (score : I → ℝ)
    (threshold : ℝ) (hthreshold : 0 ≤ threshold) :
    maximumOrZero indices score ≤ threshold ↔ ∀ i ∈ indices, score i ≤ threshold := by
  classical
  by_cases hs : indices.Nonempty
  · have hmax := (exists_maximum_score indices score hs).choose_spec
    simp only [maximumOrZero, dif_pos hs]
    constructor
    · exact fun h i hi => le_trans (hmax.2 i hi) h
    · exact fun h => h _ hmax.1
  · have hempty := Finset.not_nonempty_iff_eq_empty.mp hs
    subst indices
    simp [maximumOrZero, hthreshold]

noncomputable def minimizers (candidates : Finset C) (feasible : C → Prop)
    (objective : C → ℝ) : Finset C := by
  classical
  exact candidates.filter (fun x => feasible x ∧
    ∀ y ∈ candidates, feasible y → objective x ≤ objective y)

noncomputable def normalizedRank (candidates : Finset C) (rank : C → ℕ) (x : C) : ℝ :=
  (rank x : ℝ) / (candidates.card : ℝ)

noncomputable def pool (candidates : Finset C) (rank : C → ℕ) (threshold : ℝ) : Finset C := by
  classical
  exact candidates.filter (fun x => normalizedRank candidates rank x ≤ threshold)

noncomputable def panelScore (candidates : Finset C) (feasible : C → Prop)
    (objective : C → ℝ) (rank : C → ℕ) : ℝ :=
  maximumOrZero (minimizers candidates feasible objective) (normalizedRank candidates rank)

/-- The same statement is valid for every finite candidates, regardless of size.
Empty optimum sets receive zero, so a nonnegative threshold is essential. -/
theorem all_minimizers_retained_iff (candidates : Finset C) (feasible : C → Prop)
    (objective : C → ℝ) (rank : C → ℕ) (threshold : ℝ) (hthreshold : 0 ≤ threshold) :
    minimizers candidates feasible objective ⊆ pool candidates rank threshold ↔
      panelScore candidates feasible objective rank ≤ threshold := by
  classical
  rw [panelScore, maximum_or_zero_le_iff _ _ _ hthreshold]
  constructor
  · intro h x hx
    exact (Finset.mem_filter.mp (h hx)).2
  · intro h x hx
    exact Finset.mem_filter.mpr ⟨(Finset.mem_filter.mp hx).1, h x hx⟩

theorem normalized_rank_threshold_iff (candidates : Finset C) (rank : C → ℕ)
    (x : C) (threshold : ℝ) (hnonempty : candidates.Nonempty) :
    normalizedRank candidates rank x ≤ threshold ↔
      (rank x : ℝ) ≤ (candidates.card : ℝ) * threshold := by
  have hpositive : (0 : ℝ) < (candidates.card : ℝ) :=
    Nat.cast_pos.mpr (Finset.card_pos.mpr hnonempty)
  simpa only [normalizedRank, mul_comm] using (div_le_iff₀ hpositive)

theorem empty_panel_score (feasible : C → Prop) (objective : C → ℝ) (rank : C → ℕ) :
    panelScore ∅ feasible objective rank = 0 := by
  simp [panelScore, minimizers, maximumOrZero]

theorem no_feasible_panel_score (candidates : Finset C) (feasible : C → Prop)
    (objective : C → ℝ) (rank : C → ℕ) (hnone : ∀ x ∈ candidates, ¬ feasible x) :
    panelScore candidates feasible objective rank = 0 := by
  classical
  have hempty : minimizers candidates feasible objective = ∅ := by
    apply Finset.eq_empty_iff_forall_notMem.mpr
    intro x hx
    have h := Finset.mem_filter.mp hx
    exact hnone x h.1 h.2.1
  simp [panelScore, hempty, maximumOrZero]

/-- Finite additive event probability, once weights are nonnegative and normalized. -/
noncomputable def finiteMass [Fintype Ω] (weight : Ω → ℝ) (event : Ω → Prop) : ℝ := by
  classical
  exact ∑ outcome, if event outcome then weight outcome else 0

noncomputable def eventCount (indices : Finset I) (event : I → Prop) : ℕ := by
  classical
  exact (indices.filter event).card

/-- The sum of event masses is the weighted pointwise event count. -/
theorem sum_finite_mass_eq_weighted_count [Fintype Ω] (weight : Ω → ℝ)
    (indices : Finset I) (events : Ω → I → Prop) :
    (∑ i ∈ indices, finiteMass weight (fun outcome => events outcome i)) =
      ∑ outcome, weight outcome * (eventCount indices (events outcome) : ℝ) := by
  classical
  unfold finiteMass eventCount
  rw [Finset.sum_comm]
  apply Finset.sum_congr rfl
  intro outcome _
  rw [← Finset.sum_filter, Finset.sum_const, nsmul_eq_mul, mul_comm]

/-- Nonnegative normalized weights and equal event risks turn a pointwise count
bound into a marginal bound. The symmetry premise is explicit; this theorem
does not assert it for an arbitrary dataset or general probability law. -/
theorem finite_weighted_symmetric_event_bound [Fintype Ω] (weight : Ω → ℝ)
    (hnonnegative : ∀ outcome, 0 ≤ weight outcome)
    (hnormalized : ∑ outcome, weight outcome = 1)
    (indices : Finset I) (events : Ω → I → Prop) (bound : ℕ)
    (target : I) (htarget : target ∈ indices)
    (hcount : ∀ outcome, eventCount indices (events outcome) ≤ bound)
    (hsymmetry : ∀ i ∈ indices,
      finiteMass weight (fun outcome => events outcome i) =
        finiteMass weight (fun outcome => events outcome target)) :
    finiteMass weight (fun outcome => events outcome target) ≤
      (bound : ℝ) / (indices.card : ℝ) := by
  classical
  have hsum : (∑ i ∈ indices, finiteMass weight (fun outcome => events outcome i)) ≤
      (bound : ℝ) := calc
    _ = ∑ outcome, weight outcome * (eventCount indices (events outcome) : ℝ) :=
      sum_finite_mass_eq_weighted_count weight indices events
    _ ≤ ∑ outcome, weight outcome * (bound : ℝ) := by
      apply Finset.sum_le_sum
      intro outcome _
      exact mul_le_mul_of_nonneg_left (Nat.cast_le.mpr (hcount outcome))
        (hnonnegative outcome)
    _ = (bound : ℝ) := by rw [← Finset.sum_mul, hnormalized, one_mul]
  have heq : (∑ i ∈ indices, finiteMass weight (fun outcome => events outcome i)) =
      (indices.card : ℝ) * finiteMass weight (fun outcome => events outcome target) := by
    rw [Finset.sum_congr rfl hsymmetry, Finset.sum_const, nsmul_eq_mul]
  rw [heq] at hsum
  have hpositive : (0 : ℝ) < (indices.card : ℝ) :=
    Nat.cast_pos.mpr (Finset.card_pos.mpr ⟨target, htarget⟩)
  exact (le_div_iff₀ hpositive).mpr (by simpa only [mul_comm] using hsum)

/-- The actual leave-one-out counting theorem supplies the pointwise bound;
there is no assumed sum-of-risks inequality in this result. -/
theorem finite_weighted_loo_failure_bound [DecidableEq I] [Fintype Ω]
    (weight : Ω → ℝ) (hnonnegative : ∀ outcome, 0 ≤ weight outcome)
    (hnormalized : ∑ outcome, weight outcome = 1)
    (indices : Finset I) (score threshold : Ω → I → ℝ) (k : ℕ)
    (target : I) (htarget : target ∈ indices)
    (hquantile : ∀ outcome i, i ∈ indices →
      IsOrderStatistic (indices.erase i) (score outcome) k (threshold outcome i))
    (hsymmetry : ∀ i ∈ indices,
      finiteMass weight (fun outcome => threshold outcome i < score outcome i) =
        finiteMass weight (fun outcome => threshold outcome target < score outcome target)) :
    finiteMass weight (fun outcome => threshold outcome target < score outcome target) ≤
      ((indices.card - k : ℕ) : ℝ) / (indices.card : ℝ) := by
  apply finite_weighted_symmetric_event_bound weight hnonnegative hnormalized indices
    (fun outcome i => threshold outcome i < score outcome i) (indices.card - k)
    target htarget _ hsymmetry
  intro outcome
  exact leave_one_out_failure_count indices (score outcome) k (threshold outcome)
    (hquantile outcome)

/-- An arithmetic rank budget gives the alpha bound for this finite weighted law.
Exchangeability itself, arbitrary measurable laws and scientific sampling are
outside this theorem; its equal-risk symmetry premise is stated explicitly. -/
theorem finite_weighted_loo_alpha_bound [DecidableEq I] [Fintype Ω]
    (weight : Ω → ℝ) (hnonnegative : ∀ outcome, 0 ≤ weight outcome)
    (hnormalized : ∑ outcome, weight outcome = 1)
    (indices : Finset I) (score threshold : Ω → I → ℝ) (k : ℕ) (alpha : ℝ)
    (target : I) (htarget : target ∈ indices) (hkcard : k ≤ indices.card)
    (hrank : (indices.card : ℝ) * (1 - alpha) ≤ (k : ℝ))
    (hquantile : ∀ outcome i, i ∈ indices →
      IsOrderStatistic (indices.erase i) (score outcome) k (threshold outcome i))
    (hsymmetry : ∀ i ∈ indices,
      finiteMass weight (fun outcome => threshold outcome i < score outcome i) =
        finiteMass weight (fun outcome => threshold outcome target < score outcome target)) :
    finiteMass weight (fun outcome => threshold outcome target < score outcome target) ≤
      alpha := by
  apply le_trans (finite_weighted_loo_failure_bound weight hnonnegative hnormalized
    indices score threshold k target htarget hquantile hsymmetry)
  have hpositive : (0 : ℝ) < (indices.card : ℝ) :=
    Nat.cast_pos.mpr (Finset.card_pos.mpr ⟨target, htarget⟩)
  apply (div_le_iff₀ hpositive).mpr
  rw [Nat.cast_sub hkcard]
  apply (sub_le_iff_le_add).mpr
  have hsub : (indices.card : ℝ) - (indices.card : ℝ) * alpha ≤ (k : ℝ) := by
    simpa only [mul_sub, mul_one] using hrank
  simpa only [add_comm, mul_comm] using (sub_le_iff_le_add).mp hsub

/-- Exact rational ceiling arithmetic supplies the rank budget in the finite
calibration branch. This still assumes the explicitly stated finite-law symmetry. -/
theorem finite_weighted_loo_ceiling_bound [DecidableEq I] [Fintype Ω]
    (weight : Ω → ℝ) (hnonnegative : ∀ outcome, 0 ≤ weight outcome)
    (hnormalized : ∑ outcome, weight outcome = 1)
    (indices : Finset I) (score threshold : Ω → I → ℝ) (alpha : ℚ)
    (target : I) (htarget : target ∈ indices)
    (hfinite : Nat.ceil ((indices.card : ℚ) * (1 - alpha)) < indices.card)
    (hquantile : ∀ outcome i, i ∈ indices →
      IsOrderStatistic (indices.erase i) (score outcome)
        (Nat.ceil ((indices.card : ℚ) * (1 - alpha))) (threshold outcome i))
    (hsymmetry : ∀ i ∈ indices,
      finiteMass weight (fun outcome => threshold outcome i < score outcome i) =
        finiteMass weight (fun outcome => threshold outcome target < score outcome target)) :
    finiteMass weight (fun outcome => threshold outcome target < score outcome target) ≤
      (alpha : ℝ) := by
  apply finite_weighted_loo_alpha_bound weight hnonnegative hnormalized indices score
    threshold (Nat.ceil ((indices.card : ℚ) * (1 - alpha))) (alpha : ℝ) target htarget
    (Nat.le_of_lt hfinite) _ hquantile hsymmetry
  have h : (indices.card : ℚ) * (1 - alpha) ≤
      (Nat.ceil ((indices.card : ℚ) * (1 - alpha)) : ℚ) := Nat.le_ceil _
  have hreal : (((indices.card : ℚ) * (1 - alpha) : ℚ) : ℝ) ≤
      ((Nat.ceil ((indices.card : ℚ) * (1 - alpha)) : ℚ) : ℝ) := Rat.cast_le.mpr h
  simpa only [Rat.cast_mul, Rat.cast_sub, Rat.cast_natCast, Rat.cast_one] using hreal

end LupineDecisionPool

#print axioms LupineDecisionPool.exists_minimum_score
#print axioms LupineDecisionPool.strict_lower_failure_count
#print axioms LupineDecisionPool.order_statistic_lt_iff
#print axioms LupineDecisionPool.erase_strict_lower
#print axioms LupineDecisionPool.leave_one_out_failure_count
#print axioms LupineDecisionPool.exists_maximum_score
#print axioms LupineDecisionPool.exists_order_statistic
#print axioms LupineDecisionPool.maximum_or_zero_le_iff
#print axioms LupineDecisionPool.all_minimizers_retained_iff
#print axioms LupineDecisionPool.normalized_rank_threshold_iff
#print axioms LupineDecisionPool.empty_panel_score
#print axioms LupineDecisionPool.no_feasible_panel_score

#print axioms LupineDecisionPool.sum_finite_mass_eq_weighted_count
#print axioms LupineDecisionPool.finite_weighted_symmetric_event_bound
#print axioms LupineDecisionPool.finite_weighted_loo_failure_bound
#print axioms LupineDecisionPool.finite_weighted_loo_alpha_bound

#print axioms LupineDecisionPool.finite_weighted_loo_ceiling_bound
