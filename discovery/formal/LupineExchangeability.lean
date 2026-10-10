import LupineDecisionPool

/-! A finite-support exchangeability bridge for the decision-pool count theorem.
Permutation invariance is a premise about the joint score law. It is not a
conclusion about a scientific dataset, independence, or a general measurable law. -/
namespace LupineExchangeability

open scoped BigOperators
open LupineDecisionPool

variable {I Ω : Type*}

/-- Reindexing all score coordinates preserves the number strictly below a
designated coordinate, including all score ties. -/
theorem strict_lower_reindex [Fintype I] (permutation : Equiv.Perm I)
    (score : I → ℝ) (i : I) :
    (strictLower Finset.univ (fun j => score (permutation j)) i).card =
      (strictLower Finset.univ score (permutation i)).card := by
  classical
  have hmap :
      (strictLower Finset.univ (fun j => score (permutation j)) i).map
        permutation.toEmbedding = strictLower Finset.univ score (permutation i) := by
    ext j
    simp [strictLower]
  rw [← hmap, Finset.card_map]

/-- An exact leave-one-out threshold fails precisely when at least k other
scores are strictly smaller. Self-erasure does not remove any strict predecessor. -/
theorem loo_failure_iff_strict_lower [Fintype I] [DecidableEq I]
    (score : I → ℝ) (k : ℕ) (threshold : ℝ) (i : I)
    (hquantile : IsOrderStatistic (Finset.univ.erase i) score k threshold) :
    threshold < score i ↔ k ≤ (strictLower Finset.univ score i).card := by
  have h := order_statistic_lt_iff (Finset.univ.erase i) score k threshold (score i)
    hquantile
  change threshold < score i ↔ k ≤ (strictLower (Finset.univ.erase i) score i).card at h
  rw [erase_strict_lower] at h
  exact h

/-- Exact quantiles need not be selected by an equivariant program: their
strict-failure event is fixed by the score multiset and therefore equivariant. -/
theorem loo_failure_reindex [Fintype I] [DecidableEq I]
    (permutation : Equiv.Perm I) (score : I → ℝ) (k : ℕ)
    (originalThreshold permutedThreshold : ℝ) (i : I)
    (horiginal : IsOrderStatistic (Finset.univ.erase (permutation i)) score k
      originalThreshold)
    (hpermuted : IsOrderStatistic (Finset.univ.erase i)
      (fun j => score (permutation j)) k permutedThreshold) :
    permutedThreshold < score (permutation i) ↔
      originalThreshold < score (permutation i) := by
  rw [loo_failure_iff_strict_lower _ _ _ _ hpermuted,
    loo_failure_iff_strict_lower _ _ _ _ horiginal, strict_lower_reindex]

/-- A weight-preserving bijection preserves the finite additive mass of any
event. Nonnegativity and normalization are needed later for a probability bound. -/
theorem finite_mass_reindex [Fintype Ω] (weight : Ω → ℝ)
    (permutation : Equiv.Perm Ω) (event : Ω → Prop)
    (hweight : ∀ outcome, weight (permutation outcome) = weight outcome) :
    finiteMass weight (fun outcome => event (permutation outcome)) =
      finiteMass weight event := by
  classical
  unfold finiteMass
  apply Fintype.sum_equiv permutation
  intro outcome
  rw [hweight]

/-- Every coordinate permutation acts bijectively on a finite support closed
under all such permutations. The inverse is the inverse coordinate permutation. -/
def supportPermutation (support : Finset (I → ℝ))
    (hclosed : ∀ (permutation : Equiv.Perm I) score, score ∈ support →
      (fun j => score (permutation j)) ∈ support)
    (permutation : Equiv.Perm I) : Equiv.Perm support where
  toFun score := ⟨fun j => score.val (permutation j), hclosed permutation score.val score.property⟩
  invFun score := ⟨fun j => score.val (permutation.symm j),
    hclosed permutation.symm score.val score.property⟩
  left_inv score := by
    apply Subtype.ext
    funext j
    exact congrArg score.val (permutation.apply_symm_apply j)
  right_inv score := by
    apply Subtype.ext
    funext j
    exact congrArg score.val (permutation.symm_apply_apply j)

/-- A coordinate permutation carries one exact leave-one-out failure event
to the permuted index. Invariance of the joint-vector weights therefore makes
their finite masses equal, without a separate equal-risk assumption. -/
theorem finite_joint_failure_mass_invariant [Fintype I] [DecidableEq I]
    (support : Finset (I → ℝ)) (weight : (I → ℝ) → ℝ)
    (hclosed : ∀ (permutation : Equiv.Perm I) score, score ∈ support →
      (fun j => score (permutation j)) ∈ support)
    (hinvariant : ∀ (permutation : Equiv.Perm I) score, score ∈ support →
      weight (fun j => score (permutation j)) = weight score)
    (threshold : support → I → ℝ) (k : ℕ)
    (hquantile : ∀ score i,
      IsOrderStatistic (Finset.univ.erase i) score.val k (threshold score i))
    (permutation : Equiv.Perm I) (i : I) :
    finiteMass (fun score : support => weight score.val)
        (fun score => threshold score i < score.val i) =
      finiteMass (fun score : support => weight score.val)
        (fun score => threshold score (permutation i) < score.val (permutation i)) := by
  classical
  let action := supportPermutation support hclosed permutation
  have hweight : ∀ score : support, weight (action score).val = weight score.val := by
    intro score
    exact hinvariant permutation score.val score.property
  have hevent : ∀ score : support,
      threshold (action score) i < (action score).val i ↔
        threshold score (permutation i) < score.val (permutation i) := by
    intro score
    exact loo_failure_reindex permutation score.val k (threshold score (permutation i))
      (threshold (action score) i) i (hquantile score (permutation i))
      (hquantile (action score) i)
  have hreindex := finite_mass_reindex (fun score : support => weight score.val)
    action (fun score => threshold score i < score.val i) hweight
  rw [← hreindex]
  unfold finiteMass
  apply Finset.sum_congr rfl
  intro score _
  change (if threshold (action score) i < (action score).val i then weight score.val else 0) =
    (if threshold score (permutation i) < score.val (permutation i) then weight score.val else 0)
  simp only [hevent score]

/-- Swapping any two coordinates supplies the equality of indexed failure
masses required by the existing finite weighted averaging theorem. -/
theorem finite_joint_failure_masses_equal [Fintype I] [DecidableEq I]
    (support : Finset (I → ℝ)) (weight : (I → ℝ) → ℝ)
    (hclosed : ∀ (permutation : Equiv.Perm I) score, score ∈ support →
      (fun j => score (permutation j)) ∈ support)
    (hinvariant : ∀ (permutation : Equiv.Perm I) score, score ∈ support →
      weight (fun j => score (permutation j)) = weight score)
    (threshold : support → I → ℝ) (k : ℕ)
    (hquantile : ∀ score i,
      IsOrderStatistic (Finset.univ.erase i) score.val k (threshold score i))
    (i target : I) :
    finiteMass (fun score : support => weight score.val)
        (fun score => threshold score i < score.val i) =
      finiteMass (fun score : support => weight score.val)
        (fun score => threshold score target < score.val target) := by
  simpa only [Equiv.swap_apply_left] using
    finite_joint_failure_mass_invariant support weight hclosed hinvariant threshold k
      hquantile (Equiv.swap i target) i

/-- A normalized, nonnegative, finite joint score law invariant under every
coordinate permutation obeys the exact marginal leave-one-out failure bound.
The pointwise counting and additive averaging are imported proved results. -/
theorem finite_exchangeable_loo_failure_bound [Fintype I] [DecidableEq I]
    (support : Finset (I → ℝ)) (weight : (I → ℝ) → ℝ)
    (hnonnegative : ∀ score ∈ support, 0 ≤ weight score)
    (hnormalized : ∑ score : support, weight score.val = 1)
    (hclosed : ∀ (permutation : Equiv.Perm I) score, score ∈ support →
      (fun j => score (permutation j)) ∈ support)
    (hinvariant : ∀ (permutation : Equiv.Perm I) score, score ∈ support →
      weight (fun j => score (permutation j)) = weight score)
    (threshold : support → I → ℝ) (k : ℕ) (target : I)
    (hquantile : ∀ score i,
      IsOrderStatistic (Finset.univ.erase i) score.val k (threshold score i)) :
    finiteMass (fun score : support => weight score.val)
        (fun score => threshold score target < score.val target) ≤
      ((Fintype.card I - k : ℕ) : ℝ) / (Fintype.card I : ℝ) := by
  classical
  apply finite_weighted_loo_failure_bound (fun score : support => weight score.val)
    (fun score => hnonnegative score.val score.property) hnormalized Finset.univ
    (fun score => score.val) threshold k target (Finset.mem_univ target)
    (fun score i _ => hquantile score i)
  intro i _
  exact finite_joint_failure_masses_equal support weight hclosed hinvariant threshold k
    hquantile i target

/-- In the finite calibration branch, exact rational ceiling arithmetic gives
the alpha marginal risk bound for this finite permutation-invariant joint law.
This does not assert conditional coverage, physical exchangeability, or a
result for arbitrary measurable probability spaces. -/
theorem finite_exchangeable_loo_ceiling_bound [Fintype I] [DecidableEq I]
    (support : Finset (I → ℝ)) (weight : (I → ℝ) → ℝ)
    (hnonnegative : ∀ score ∈ support, 0 ≤ weight score)
    (hnormalized : ∑ score : support, weight score.val = 1)
    (hclosed : ∀ (permutation : Equiv.Perm I) score, score ∈ support →
      (fun j => score (permutation j)) ∈ support)
    (hinvariant : ∀ (permutation : Equiv.Perm I) score, score ∈ support →
      weight (fun j => score (permutation j)) = weight score)
    (threshold : support → I → ℝ) (alpha : ℚ) (target : I)
    (hfinite : Nat.ceil ((Fintype.card I : ℚ) * (1 - alpha)) < Fintype.card I)
    (hquantile : ∀ score i,
      IsOrderStatistic (Finset.univ.erase i) score.val
        (Nat.ceil ((Fintype.card I : ℚ) * (1 - alpha))) (threshold score i)) :
    finiteMass (fun score : support => weight score.val)
        (fun score => threshold score target < score.val target) ≤ (alpha : ℝ) := by
  classical
  apply finite_weighted_loo_ceiling_bound (fun score : support => weight score.val)
    (fun score => hnonnegative score.val score.property) hnormalized Finset.univ
    (fun score => score.val) threshold alpha target (Finset.mem_univ target) hfinite
    (fun score i _ => hquantile score i)
  intro i _
  exact finite_joint_failure_masses_equal support weight hclosed hinvariant threshold _
    hquantile i target

end LupineExchangeability

#print axioms LupineExchangeability.strict_lower_reindex
#print axioms LupineExchangeability.loo_failure_iff_strict_lower
#print axioms LupineExchangeability.loo_failure_reindex
#print axioms LupineExchangeability.finite_mass_reindex
#print axioms LupineExchangeability.finite_joint_failure_mass_invariant
#print axioms LupineExchangeability.finite_joint_failure_masses_equal
#print axioms LupineExchangeability.finite_exchangeable_loo_failure_bound
#print axioms LupineExchangeability.finite_exchangeable_loo_ceiling_bound
