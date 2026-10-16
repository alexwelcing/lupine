import Mathlib.Data.Finset.Powerset
import Mathlib.Data.Finset.Card
import Mathlib.Data.Rat.Floor
import Mathlib.Tactic.NormNum
import Mathlib.Tactic.Tauto

/-! Finite zero-failure counting, conditional on a fixed labeled population and
uniform sampling of subsets of a fixed size. No sampling attestation, physical
independence, future-population conclusion, or Python refinement is asserted. -/
namespace LupineFinitePlanning

/-- Rational count ratio. The probability interpretation requires `e ≤ M`,
which makes the denominator positive, and uniform sampling of those subsets. -/
def zeroFailureTail (M K e : ℕ) : ℚ :=
  ((M - K).choose e : ℚ) / (M.choose e : ℚ)

variable {α : Type*} [DecidableEq α]

/-- Subsets avoiding all declared failures are precisely subsets of the
nonfailure complement; this is a pointwise event identity. -/
theorem zero_failure_subsets (population failures : Finset α) (e : ℕ) :
    (population.powersetCard e).filter (fun sample => Disjoint sample failures) =
      (population \ failures).powersetCard e := by
  ext sample
  simp only [Finset.mem_filter, Finset.mem_powersetCard, Finset.subset_sdiff]
  tauto

/-- Exact favorable-outcome count under a fixed failure set inside the frame. -/
theorem zero_failure_count (population failures : Finset α) (e : ℕ)
    (h : failures ⊆ population) :
    ((population.powersetCard e).filter (fun sample => Disjoint sample failures)).card =
      (population.card - failures.card).choose e := by
  rw [zero_failure_subsets, Finset.card_powersetCard, Finset.card_sdiff_of_subset h]

/-- The finite uniform-subset event ratio is the planner's exact expression.
Uniform sampling is the interpretation of this explicitly defined count ratio. -/
theorem uniform_count_ratio (population failures : Finset α) (e : ℕ)
    (h : failures ⊆ population) :
    ((((population.powersetCard e).filter (fun sample => Disjoint sample failures)).card : ℚ) /
      ((population.powersetCard e).card : ℚ)) =
        zeroFailureTail population.card failures.card e := by
  rw [zero_failure_count population failures e h, Finset.card_powersetCard]
  rfl

theorem denominator_positive {M e : ℕ} (h : e ≤ M) :
    (0 : ℚ) < M.choose e := by
  exact_mod_cast Nat.choose_pos h

/-- Increasing the number of fixed failures cannot increase the zero-failure
count ratio. No IID or independence hypothesis appears. -/
theorem failure_count_antitone (M e : ℕ) {K₁ K₂ : ℕ} (h : K₁ ≤ K₂) :
    zeroFailureTail M K₂ e ≤ zeroFailureTail M K₁ e := by
  unfold zeroFailureTail
  apply div_le_div_of_nonneg_right
  · exact_mod_cast Nat.choose_le_choose e (Nat.sub_le_sub_left h M)
  · exact Nat.cast_nonneg _

/-- The declared composite null `Kmin ≤ K ≤ M` has an attained exact maximum
at `Kmin`; the existential clause establishes attainment, not only an upper bound. -/
theorem composite_null_maximum (M e Kmin : ℕ) (hmin : Kmin ≤ M) :
    (∀ K, Kmin ≤ K → K ≤ M →
      zeroFailureTail M K e ≤ zeroFailureTail M Kmin e) ∧
    (∃ K, Kmin ≤ K ∧ K ≤ M ∧
      zeroFailureTail M K e = zeroFailureTail M Kmin e) := by
  constructor
  · intro K hK _
    exact failure_count_antitone M e hK
  · exact ⟨Kmin, le_refl _, hmin, rfl⟩

/-- For admissible sample sizes the zero boundary is exact, including equality:
at `e = M-K` the numerator is one, so zero begins only at `M-K+1`. -/
theorem zero_failure_iff {M K e : ℕ} (he : e ≤ M) :
    zeroFailureTail M K e = 0 ↔ M - K < e := by
  have hd : (M.choose e : ℚ) ≠ 0 := ne_of_gt (denominator_positive he)
  simp only [zeroFailureTail, div_eq_zero_iff, hd, or_false, Nat.cast_eq_zero]
  exact Nat.choose_eq_zero_iff

theorem no_evaluation (M K : ℕ) : zeroFailureTail M K 0 = 1 := by
  simp [zeroFailureTail]

/-- A census cannot miss all failures if at least one fixed failure exists. -/
theorem census_zero {M K : ℕ} (hK : 0 < K) (hKM : K ≤ M) :
    zeroFailureTail M K M = 0 := by
  apply (zero_failure_iff (le_refl M)).2
  omega

/-- Any positive tolerance has a qualifying positive sample size by the exact
zero boundary, within a complete census. This does not assert observed success. -/
theorem full_frame_resolution {M K : ℕ} (hK : 0 < K) (hKM : K ≤ M)
    {η : ℚ} (hη : 0 ≤ η) :
    ∃ e, 1 ≤ e ∧ e ≤ M ∧ zeroFailureTail M K e ≤ η := by
  refine ⟨M - K + 1, by omega, by omega, ?_⟩
  have hz : zeroFailureTail M K (M - K + 1) = 0 :=
    (zero_failure_iff (by omega)).2 (by omega)
  simpa only [hz] using hη

end LupineFinitePlanning

#print axioms LupineFinitePlanning.zero_failure_subsets
#print axioms LupineFinitePlanning.zero_failure_count
#print axioms LupineFinitePlanning.uniform_count_ratio
#print axioms LupineFinitePlanning.denominator_positive
#print axioms LupineFinitePlanning.failure_count_antitone
#print axioms LupineFinitePlanning.composite_null_maximum
#print axioms LupineFinitePlanning.zero_failure_iff
#print axioms LupineFinitePlanning.no_evaluation
#print axioms LupineFinitePlanning.census_zero
#print axioms LupineFinitePlanning.full_frame_resolution
