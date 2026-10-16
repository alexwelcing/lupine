import LupineFinitePlanning
import Mathlib.Data.Nat.Find

/-! Exact evaluation-size monotonicity and mathematical minimum resolution
for the fixed finite-population ratio. No Python implementation refinement or
scientific sampling attestation is asserted. The imported module is unchanged. -/
namespace LupineFinitePlanningMonotone

open LupineFinitePlanning

/-- One additional sampled ID cannot increase the zero-failure ratio while
the sample remains within the fixed population. The proof is binomial counting
and positive-denominator arithmetic, not an IID approximation. -/
theorem evaluation_step {M K e : ℕ} (he : e < M) :
    zeroFailureTail M K (e + 1) ≤ zeroFailureTail M K e := by
  unfold zeroFailureTail
  apply (div_le_div_iff₀ (denominator_positive (by omega))
    (denominator_positive (by omega))).mpr
  have hnat : (M - K).choose (e + 1) * M.choose e ≤
      (M - K).choose e * M.choose (e + 1) := by
    apply Nat.le_of_mul_le_mul_right (c := e + 1) ?_ (by omega)
    calc
      ((M - K).choose (e + 1) * M.choose e) * (e + 1) =
          ((M - K).choose (e + 1) * (e + 1)) * M.choose e := by
            ac_rfl
      _ = ((M - K).choose e * (M - K - e)) * M.choose e := by
            rw [Nat.choose_succ_right_eq]
      _ ≤ ((M - K).choose e * (M - e)) * M.choose e :=
            Nat.mul_le_mul_right _ (Nat.mul_le_mul_left _ (by omega))
      _ = (M - K).choose e * (M.choose (e + 1) * (e + 1)) := by
            rw [Nat.choose_succ_right_eq]
            ac_rfl
      _ = ((M - K).choose e * M.choose (e + 1)) * (e + 1) := by
            ac_rfl
  exact_mod_cast hnat

/-- The complete admissible evaluation-size sequence is nonincreasing.
For a physical finite-frame interpretation additionally require `K ≤ M`;
the natural-subtraction algebra itself holds for every natural K. -/
theorem evaluation_antitone {M K a b : ℕ} (hab : a ≤ b) (hb : b ≤ M) :
    zeroFailureTail M K b ≤ zeroFailureTail M K a := by
  induction b, hab using Nat.le_induction with
  | base => exact le_refl _
  | succ b hab ih =>
    exact le_trans (evaluation_step (by omega)) (ih (by omega))

/-- A capped positive-count request is feasible exactly when the cap is
positive and its own ratio meets the weak threshold, including equality. -/
theorem capped_feasible_iff {M K cap : ℕ} (hcap : cap ≤ M) (η : ℚ) :
    (∃ e, 1 ≤ e ∧ e ≤ cap ∧ zeroFailureTail M K e ≤ η) ↔
      1 ≤ cap ∧ zeroFailureTail M K cap ≤ η := by
  constructor
  · rintro ⟨e, he, hecap, hq⟩
    exact ⟨le_trans he hecap, le_trans (evaluation_antitone hecap hcap) hq⟩
  · rintro ⟨hpos, hq⟩
    exact ⟨cap, hpos, le_refl _, hq⟩

/-- Under cap feasibility there is exactly one first positive qualifying
count n. Among all positive counts through M, qualification is equivalent to
being at least n; every earlier positive count therefore fails strictly.
This characterizes a mathematical minimum, not a particular search program. -/
theorem unique_first_count {M K cap : ℕ} (hcap : cap ≤ M) (η : ℚ)
    (hpos : 1 ≤ cap) (hqcap : zeroFailureTail M K cap ≤ η) :
    ∃! n, 1 ≤ n ∧ n ≤ cap ∧
      (∀ e, 1 ≤ e → e ≤ M → (zeroFailureTail M K e ≤ η ↔ n ≤ e)) := by
  let qualifies := fun e => 1 ≤ e ∧ zeroFailureTail M K e ≤ η
  have hex : ∃ e, qualifies e := ⟨cap, hpos, hqcap⟩
  let n := Nat.find hex
  have hn : qualifies n := Nat.find_spec hex
  have hncap : n ≤ cap := Nat.find_min' hex ⟨hpos, hqcap⟩
  have hnm : n ≤ M := le_trans hncap hcap
  have hcut : ∀ e, 1 ≤ e → e ≤ M → (zeroFailureTail M K e ≤ η ↔ n ≤ e) := by
    intro e he heM
    constructor
    · intro hqe
      exact Nat.find_min' hex ⟨he, hqe⟩
    · intro hne
      exact le_trans (evaluation_antitone hne heM) hn.2
  refine ⟨n, ⟨hn.1, hncap, hcut⟩, ?_⟩
  intro m hm
  have hmm : m ≤ M := le_trans hm.2.1 hcap
  have hqm : zeroFailureTail M K m ≤ η :=
    (hm.2.2 m hm.1 hmm).mpr (le_refl _)
  exact le_antisymm ((hm.2.2 n hn.1 hnm).mp hn.2) ((hcut m hm.1 hmm).mp hqm)

end LupineFinitePlanningMonotone

#print axioms LupineFinitePlanningMonotone.evaluation_step
#print axioms LupineFinitePlanningMonotone.evaluation_antitone
#print axioms LupineFinitePlanningMonotone.capped_feasible_iff
#print axioms LupineFinitePlanningMonotone.unique_first_count
