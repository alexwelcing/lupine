import Mathlib.Analysis.InnerProductSpace.Basic
import Mathlib.Analysis.InnerProductSpace.Projection.Basic
import Mathlib.Data.Finset.Basic
import Mathlib.Data.Finset.Image
import Mathlib.Data.Finset.Lattice.Fold
import Mathlib.Data.Finset.Max
import Mathlib.Data.Real.Basic
import Mathlib.LinearAlgebra.Dimension.OrzechProperty
import Mathlib.LinearAlgebra.FiniteDimensional.Basic
import Mathlib.LinearAlgebra.FiniteDimensional.Defs

/-! # Active sampling acquisition contract

This module formalises the two guarantees that justify the greedy residual-max
acquisition rule used by `atlas-distill/src/active_sampling.rs`.

1. **One-step optimality.** If the next selected point is removed from the pool
   of candidates (because it is observed and corrected), picking the candidate
   with the largest predicted residual minimises the maximum residual among the
   remaining candidates.  This is the immediate acquisition contract.

2. **Rank-k termination.** If all residuals are confined to a known
   `k`-dimensional subspace, any sequence of *informative* observations — each
   new residual lies outside the span of the previously observed ones — can
   contain at most `k` observations before the subspace is exhausted.  This
   bounds the sample complexity of the active campaign.

The module also records the elementary fact that orthogonal projection onto an
observed direction never increases residual norms, which is the geometric reason
why observing a direction can only help.

House rules: zero `sorry`, zero new axioms.
-/

namespace OpenDistillationFactory.Materials.Theory.ActiveSampling

open scoped RealInnerProductSpace Classical

variable {E : Type*} [NormedAddCommGroup E] [InnerProductSpace ℝ E] [CompleteSpace E]

set_option linter.unusedSectionVars false

-- ═══════════════════════════════════════════════════════════════════════════════
-- §1  Greedy residual-max selection is one-step optimal
-- ═══════════════════════════════════════════════════════════════════════════════

section GreedyOneStep

/-- A candidate is a greedy choice if it belongs to the pool and has maximal
residual norm. -/
def IsGreedyChoice (candidates : Finset E) (r : E) : Prop :=
  r ∈ candidates ∧ ∀ s ∈ candidates, ‖s‖ ≤ ‖r‖

/-- Every nonempty finite candidate pool has at least one greedy choice. -/
theorem exists_greedyChoice {candidates : Finset E} (h : candidates.Nonempty) :
    ∃ r, IsGreedyChoice candidates r := by
  set im := candidates.image (fun r => ‖r‖)
  have him_ne : im.Nonempty := by
    simpa [im] using h.image (fun r => ‖r‖)
  set m := im.max' him_ne with hm
  have hm_iff : m ∈ im ∧ ∀ b ∈ im, b ≤ m := by
    apply (im.max'_eq_iff him_ne m).mp
    exact hm.symm
  have hmem : m ∈ im := hm_iff.1
  rw [Finset.mem_image] at hmem
  rcases hmem with ⟨r, hr, hnorm⟩
  use r
  constructor
  · exact hr
  · intro s hs
    have hns : ‖s‖ ∈ im := Finset.mem_image_of_mem (fun r => ‖r‖) hs
    have hle : ‖s‖ ≤ m := hm_iff.2 (‖s‖) hns
    linarith [hle, hnorm]

/-- **One-step acquisition contract.**

Assume the selected candidate is removed from the pool after it is observed.
Then a greedy choice (maximum residual norm) minimises the maximum residual norm
over the remaining candidates.

This is exactly the decision made in `ActiveSampler::select_next`: among all
unobserved candidates, pick the one with the largest predicted corrected
residual. -/
theorem greedy_minimizes_max_remaining {candidates : Finset E} {r_greedy r_other : E}
    (hg : IsGreedyChoice candidates r_greedy)
    (ho : r_other ∈ candidates)
    (hne_g : (candidates.erase r_greedy).Nonempty)
    (hne_o : (candidates.erase r_other).Nonempty) :
    (candidates.erase r_greedy).sup' hne_g (fun r => ‖r‖) ≤
      (candidates.erase r_other).sup' hne_o (fun r => ‖r‖) := by
  by_cases heq : r_other = r_greedy
  · -- Same selection: the two pools are identical.
    subst heq
    rfl
  · -- `r_greedy` survives in the pool obtained by removing `r_other`.
    have hrg_in_other : r_greedy ∈ candidates.erase r_other :=
      Finset.mem_erase.2 ⟨Ne.symm heq, hg.1⟩
    have hle1 : (candidates.erase r_greedy).sup' hne_g (fun r => ‖r‖) ≤ ‖r_greedy‖ := by
      rw [Finset.sup'_le_iff]
      intro s hs
      exact hg.2 s (Finset.mem_of_mem_erase hs)
    have hle2 : ‖r_greedy‖ ≤ (candidates.erase r_other).sup' hne_o (fun r => ‖r‖) := by
      apply Finset.le_sup' (fun r => ‖r‖) hrg_in_other
    linarith

end GreedyOneStep

-- ═══════════════════════════════════════════════════════════════════════════════
-- §2  Observation by orthogonal projection never increases residuals
-- ═══════════════════════════════════════════════════════════════════════════════

section ProjectionNoHarm

/-- Projecting a residual onto the orthogonal complement of an observed
direction cannot increase its norm.  This is Pythagoras: the squared norm is the
sum of the explained and unexplained components, so the unexplained component is
at most the whole. -/
theorem projection_norm_nonincreasing (r v : E) :
    ‖v - (Submodule.span ℝ {r}).orthogonalProjectionFn v‖ ≤ ‖v‖ := by
  set K := Submodule.span ℝ {r}
  have hK_fd : FiniteDimensional ℝ K := FiniteDimensional.span_of_finite ℝ (Set.finite_singleton r)
  have hK_complete : CompleteSpace K := (Submodule.complete_of_finiteDimensional K).completeSpace_coe
  have hproj : K.orthogonalProjectionFn v ∈ K := Submodule.orthogonalProjectionFn_mem v
  have horth : ⟪v - K.orthogonalProjectionFn v, K.orthogonalProjectionFn v⟫ = 0 := by
    apply Submodule.orthogonalProjectionFn_inner_eq_zero v (K.orthogonalProjectionFn v) hproj
  have hsplit : ‖v‖ ^ 2 = ‖v - K.orthogonalProjectionFn v‖ ^ 2 + ‖K.orthogonalProjectionFn v‖ ^ 2 := by
    have h : v = (v - K.orthogonalProjectionFn v) + K.orthogonalProjectionFn v := by abel_nf
    rw [show ‖v‖ ^ 2 = ‖(v - K.orthogonalProjectionFn v) + K.orthogonalProjectionFn v‖ ^ 2 by rw [← h]]
    rw [norm_add_sq_real, horth]
    ring_nf
  have hnonneg : 0 ≤ ‖K.orthogonalProjectionFn v‖ ^ 2 := sq_nonneg _
  have hleft : 0 ≤ ‖v - K.orthogonalProjectionFn v‖ := norm_nonneg _
  have hright : 0 ≤ ‖v‖ := norm_nonneg v
  nlinarith [hsplit, hnonneg, hleft, hright, sq_nonneg (‖v - K.orthogonalProjectionFn v‖ - ‖v‖)]

end ProjectionNoHarm

-- ═══════════════════════════════════════════════════════════════════════════════
-- §3  Rank-k sample-complexity bound
-- ═══════════════════════════════════════════════════════════════════════════════

section RankKTermination

/-- A finite set of already-observed residuals is *informative* for a subspace
`K` if every residual lies in `K` and the set is linearly independent.  Each new
informative observation expands the span of what has been learned. -/
def InformativeObservations (K : Submodule ℝ E) (observed : Finset E) : Prop :=
  (∀ r ∈ observed, r ∈ K) ∧ LinearIndependent ℝ (fun (r : observed) => (r : E))

/-- **Rank-k active-sampling bound.**

If every residual lives in a known `k`-dimensional subspace `K`, then any
informative sequence of observations contains at most `k` points.  After `k`
informative observations the span of the observed residuals equals `K`, so no
new residual direction can remain to be discovered.

This gives a first-principles sample-complexity guarantee for the residual-driven
campaign in `simulate_active_campaign`: the number of *new directions* that need
to be learned is bounded by the rank of the residual subspace. -/
theorem active_sampling_rank_bound {K : Submodule ℝ E} [FiniteDimensional ℝ K] {k : ℕ}
    (hK : Module.finrank ℝ K = k)
    (observed : Finset E)
    (hinfo : InformativeObservations K observed) :
    observed.card ≤ k := by
  rcases hinfo with ⟨hobs, hli⟩
  set V := Submodule.span ℝ (observed : Set E)
  have hVsubK : V ≤ K := Submodule.span_le.2 hobs
  have hfinrank : Module.finrank ℝ V ≤ Module.finrank ℝ K := Submodule.finrank_mono hVsubK
  have hcard : observed.card ≤ Module.finrank ℝ V := by
    have h := linearIndependent_iff_card_le_finrank_span.1 hli
    simpa using h
  linarith [hcard, hfinrank, hK]

end RankKTermination

end OpenDistillationFactory.Materials.Theory.ActiveSampling
