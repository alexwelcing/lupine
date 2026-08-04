import Mathlib.Probability.Moments.SubGaussian
import Mathlib.Probability.Independence.Basic
import Mathlib.Probability.IdentDistrib
import Mathlib.Data.Matrix.Basic
import Mathlib.Analysis.Matrix.Normed
import Mathlib.Analysis.Normed.Group.Basic
import Mathlib.Topology.ContinuousOn

/-! # Finite-sample concentration of the empirical second moment (B3)

The empirical second-moment matrix `M_n = (1/n) Σ X_i X_i^T` is an unbiased
estimator of the true second-moment matrix `M = E[X X^T]`. For bounded i.i.d.
samples in `ℝ^d`, each matrix entry concentrates around its mean at rate
`1/√n` (Hoeffding). The participation ratio is a continuous function of the
second-moment spectrum, so concentration of `M_n` implies concentration of the
estimated PR.

House rules: zero `sorry`, zero new axioms.
-/

namespace OpenDistillationFactory.Materials.Theory.FiniteSampleConcentration

open MeasureTheory ProbabilityTheory ProbabilityTheory.HasSubgaussianMGF BigOperators Finset Matrix Topology Real
open scoped Matrix.Norms.Elementwise

variable {d n : ℕ}

/-! ## Empirical second-moment matrix and entrywise concentration -/

section SecondMomentAndConcentration

variable {Ω : Type*} [MeasurableSpace Ω]

/-- Transfer an almost-everywhere membership property across identical
    distribution. -/
lemma ae_mem_of_identDistrib {f g : Ω → ℝ} (h : IdentDistrib f g μ μ) {S : Set ℝ}
    (hS : MeasurableSet S) (hf : ∀ᵐ ω ∂μ, f ω ∈ S) : ∀ᵐ ω ∂μ, g ω ∈ S := by
  have h1 : μ.map f Sᶜ = 0 := by
    rw [Measure.map_apply_of_aemeasurable h.aemeasurable_fst hS.compl]
    exact hf
  have h2 : μ.map g Sᶜ = 0 := by
    rw [← h.map_eq]
    exact h1
  rw [Measure.map_apply_of_aemeasurable h.aemeasurable_snd hS.compl] at h2
  exact h2

/-- True second-moment matrix of a random vector `X : Ω → ℝ^d`. -/
noncomputable def secondMoment (X : Ω → Fin d → ℝ) (μ : Measure Ω) :
    Matrix (Fin d) (Fin d) ℝ :=
  fun i j => ∫ ω, X ω i * X ω j ∂μ

/-- Empirical second-moment matrix from `n` samples. -/
noncomputable def empiricalSecondMoment (samples : Fin n → Ω → Fin d → ℝ) (ω : Ω) :
    Matrix (Fin d) (Fin d) ℝ :=
  fun i j => (1 / n : ℝ) * ∑ k : Fin n, samples k ω i * samples k ω j

/-- The empirical second-moment matrix is unbiased entrywise when the samples
    are identically distributed as `X` and have integrable pairwise products. -/
theorem empiricalSecondMoment_unbiased (μ : Measure Ω) [IsProbabilityMeasure μ]
    (samples : Fin n → Ω → Fin d → ℝ) (X : Ω → Fin d → ℝ) (hn : n ≠ 0)
    (hident : ∀ k, IdentDistrib (samples k) X μ μ)
    (hint : ∀ i j, Integrable (fun ω => X ω i * X ω j) μ) :
    ∀ i j, ∫ ω, empiricalSecondMoment samples ω i j ∂μ = secondMoment X μ i j := by
  intro i j
  simp only [empiricalSecondMoment, secondMoment]
  have h1 : ∫ ω, (1 / n : ℝ) * ∑ k : Fin n, samples k ω i * samples k ω j ∂μ
      = (1 / n : ℝ) * ∑ k : Fin n, ∫ ω, samples k ω i * samples k ω j ∂μ := by
    rw [integral_const_mul, integral_finset_sum]
    · intro k _
      let u (v : Fin d → ℝ) : ℝ := v i * v j
      have hu : Measurable u := (Measurable.mul (measurable_pi_apply i) (measurable_pi_apply j))
      have hident' : IdentDistrib (fun ω => u (samples k ω)) (fun ω => u (X ω)) μ μ :=
        (hident k).comp hu
      exact hident'.integrable_iff.mpr (hint i j)
  rw [h1]
  have h2 : ∀ k : Fin n, ∫ ω, samples k ω i * samples k ω j ∂μ = ∫ ω, X ω i * X ω j ∂μ := by
    intro k
    let u (v : Fin d → ℝ) : ℝ := v i * v j
    have hu : Measurable u := (Measurable.mul (measurable_pi_apply i) (measurable_pi_apply j))
    exact IdentDistrib.integral_eq ((hident k).comp hu)
  simp_rw [h2]
  rw [Finset.sum_const, Finset.card_univ, Fintype.card_fin]
  field_simp [hn]
  ring_nf

/-- The product of two coordinates is bounded by `B²` when each coordinate is
    bounded by `B`. -/
lemma product_bound (B : ℝ) (μ : Measure Ω)
    (samples : Fin n → Ω → Fin d → ℝ)
    (hb : ∀ k i, ∀ᵐ ω ∂μ, samples k ω i ∈ Set.Icc (-B) B) {k : Fin n} {i j : Fin d} :
    ∀ᵐ ω ∂μ, samples k ω i * samples k ω j ∈ Set.Icc (-B ^ 2) (B ^ 2) := by
  filter_upwards [hb k i, hb k j] with ω hbi hbj
  rcases hbi with ⟨hbi1, hbi2⟩
  rcases hbj with ⟨hbj1, hbj2⟩
  constructor
  · nlinarith
  · nlinarith

/-- The true second-moment entry lies in `[-B², B²]`. -/
lemma secondMoment_bound (B : ℝ) (μ : Measure Ω) [IsProbabilityMeasure μ]
    (X : Ω → Fin d → ℝ) (samples : Fin n → Ω → Fin d → ℝ) (hn : n ≠ 0)
    (h_ident : ∀ k, IdentDistrib (samples k) X μ μ)
    (hb : ∀ k i, ∀ᵐ ω ∂μ, samples k ω i ∈ Set.Icc (-B) B)
    (hintX : ∀ i j, Integrable (fun ω => X ω i * X ω j) μ) {i j : Fin d} :
    secondMoment X μ i j ∈ Set.Icc (-B ^ 2) (B ^ 2) := by
  have h1 : secondMoment X μ i j = ∫ ω, X ω i * X ω j ∂μ := rfl
  rw [h1]
  have hXi_bound : ∀ᵐ ω ∂μ, X ω i ∈ Set.Icc (-B) B := by
    have h0 := hb (⟨0, Nat.pos_of_ne_zero hn⟩) i
    have hident : IdentDistrib (fun ω => samples (⟨0, Nat.pos_of_ne_zero hn⟩) ω i) (fun ω => X ω i) μ μ :=
      (h_ident (⟨0, Nat.pos_of_ne_zero hn⟩)).comp (measurable_pi_apply i)
    exact ae_mem_of_identDistrib hident (measurableSet_Icc) h0
  have hXj_bound : ∀ᵐ ω ∂μ, X ω j ∈ Set.Icc (-B) B := by
    have h0 := hb (⟨0, Nat.pos_of_ne_zero hn⟩) j
    have hident : IdentDistrib (fun ω => samples (⟨0, Nat.pos_of_ne_zero hn⟩) ω j) (fun ω => X ω j) μ μ :=
      (h_ident (⟨0, Nat.pos_of_ne_zero hn⟩)).comp (measurable_pi_apply j)
    exact ae_mem_of_identDistrib hident (measurableSet_Icc) h0
  have h2 : ∀ᵐ ω ∂μ, X ω i * X ω j ∈ Set.Icc (-B ^ 2) (B ^ 2) := by
    filter_upwards [hXi_bound, hXj_bound] with ω hbi hbj
    rcases hbi with ⟨hbi1, hbi2⟩
    rcases hbj with ⟨hbj1, hbj2⟩
    constructor <;> nlinarith
  have h3 : Integrable (fun ω => X ω i * X ω j) μ := hintX i j
  constructor
  · have h4 : ∀ᵐ ω ∂μ, -B ^ 2 ≤ X ω i * X ω j := by
      filter_upwards [h2] with ω h
      exact h.1
    have h5 : Integrable (fun (_ : Ω) => -B ^ 2 : Ω → ℝ) μ := integrable_const _
    have h6 : -B ^ 2 = ∫ (_ : Ω), -B ^ 2 ∂μ := by
      rw [integral_const]
      simp
    rw [h6]
    exact integral_mono_ae h5 h3 h4
  · have h4 : ∀ᵐ ω ∂μ, X ω i * X ω j ≤ B ^ 2 := by
      filter_upwards [h2] with ω h
      exact h.2
    have h5 : Integrable (fun (_ : Ω) => B ^ 2 : Ω → ℝ) μ := integrable_const _
    have h6 : B ^ 2 = ∫ (_ : Ω), B ^ 2 ∂μ := by
      rw [integral_const]
      simp
    rw [h6]
    exact integral_mono_ae h3 h5 h4

/-- Entrywise Hoeffding concentration for the empirical second moment.

For every coordinate pair `(i,j)`, the empirical entry `(M_n)_ij` deviates from
its expectation by more than `ε` with probability at most `2 exp(-n ε² / (2 B⁴))`. -/
theorem empiricalSecondMoment_entrywise_concentration (μ : Measure Ω) [IsProbabilityMeasure μ]
    (samples : Fin n → Ω → Fin d → ℝ) (X : Ω → Fin d → ℝ) (B : ℝ) (hB : 0 < B)
    (h_indep : iIndepFun samples μ) (h_ident : ∀ k, IdentDistrib (samples k) X μ μ)
    (hb : ∀ k i, ∀ᵐ ω ∂μ, samples k ω i ∈ Set.Icc (-B) B)
    (hintX : ∀ i j, Integrable (fun ω => X ω i * X ω j) μ) (hn : n ≠ 0)
    {i j : Fin d} {ε : ℝ} (hε : 0 ≤ ε) :
    μ.real {ω | |empiricalSecondMoment samples ω i j - secondMoment X μ i j| ≥ ε}
      ≤ 2 * exp (-n * ε ^ 2 / (2 * B ^ 4)) := by
  let Z (k : Fin n) (ω : Ω) : ℝ := samples k ω i * samples k ω j - secondMoment X μ i j
  have hZ_mean (k : Fin n) : ∫ ω, Z k ω ∂μ = 0 := by
    have h1 : ∫ ω, samples k ω i * samples k ω j ∂μ = ∫ ω, X ω i * X ω j ∂μ := by
      let u (v : Fin d → ℝ) : ℝ := v i * v j
      have hu : Measurable u := (Measurable.mul (measurable_pi_apply i) (measurable_pi_apply j))
      exact IdentDistrib.integral_eq ((h_ident k).comp hu)
    have h2 : ∫ (ω : Ω), secondMoment X μ i j ∂μ = secondMoment X μ i j := by
      rw [integral_const]
      simp
    have h3 : Integrable (fun ω => samples k ω i * samples k ω j) μ := by
      let u (v : Fin d → ℝ) : ℝ := v i * v j
      have hu : Measurable u := (Measurable.mul (measurable_pi_apply i) (measurable_pi_apply j))
      exact ((h_ident k).comp hu).integrable_iff.mpr (hintX i j)
    simp [Z]
    rw [integral_sub h3 (integrable_const _)]
    rw [h1, h2]
    simp [secondMoment]
  have hZ_measurable (k : Fin n) : AEMeasurable (Z k) μ := by
    have h1 : AEMeasurable (fun ω => samples k ω i * samples k ω j) μ := by
      apply AEMeasurable.mul
      · exact AEMeasurable.comp_aemeasurable (Measurable.aemeasurable (measurable_pi_apply i))
          (h_ident k).aemeasurable_fst
      · exact AEMeasurable.comp_aemeasurable (Measurable.aemeasurable (measurable_pi_apply j))
          (h_ident k).aemeasurable_fst
    exact h1.sub aemeasurable_const
  have hZ_bound (k : Fin n) : ∀ᵐ ω ∂μ, Z k ω ∈ Set.Icc (-B ^ 2 - secondMoment X μ i j)
      (B ^ 2 - secondMoment X μ i j) := by
    filter_upwards [product_bound B μ samples hb (k := k) (i := i) (j := j)] with ω hp
    rcases hp with ⟨hp1, hp2⟩
    rcases secondMoment_bound B μ X samples hn h_ident hb hintX (i := i) (j := j) with ⟨hm1, hm2⟩
    constructor <;> linarith
  have hZ_subG (k : Fin n) : HasSubgaussianMGF (Z k)
      ((‖(B ^ 2 - secondMoment X μ i j) - (-B ^ 2 - secondMoment X μ i j)‖₊ / 2) ^ 2) μ := by
    apply hasSubgaussianMGF_of_mem_Icc_of_integral_eq_zero (hZ_measurable k) (hZ_bound k) (hZ_mean k)
  have hZ_subG' (k : Fin n) : HasSubgaussianMGF (Z k) (⟨B ^ 4, by positivity⟩) μ := by
    have hrange : (‖(B ^ 2 - secondMoment X μ i j) - (-B ^ 2 - secondMoment X μ i j)‖₊ / 2 : ℝ) ^ 2
        = B ^ 4 := by
      rw [show (B ^ 2 - secondMoment X μ i j) - (-B ^ 2 - secondMoment X μ i j) = 2 * B ^ 2 by ring]
      simp
      ring_nf
    let c0 : NNReal := (‖(B ^ 2 - secondMoment X μ i j) - (-B ^ 2 - secondMoment X μ i j)‖₊ / 2) ^ 2
    let c1 : NNReal := ⟨B ^ 4, by positivity⟩
    have h_eq : c0 = c1 := by
      have h0 : (c0 : ℝ) = B ^ 4 := hrange
      have h1 : (c1 : ℝ) = B ^ 4 := by simp [c1]
      exact_mod_cast h0.trans h1.symm
    rw [show ((‖(B ^ 2 - secondMoment X μ i j) - (-B ^ 2 - secondMoment X μ i j)‖₊ / 2) ^ 2 : NNReal) = c0 by rfl] at hZ_subG
    rw [h_eq] at hZ_subG
    exact hZ_subG k
  have hZ_indep : iIndepFun Z μ := by
    let g (k : Fin n) (v : Fin d → ℝ) : ℝ := v i * v j - secondMoment X μ i j
    have hg (k : Fin n) : Measurable (g k) := by
      have : g k = fun v => v i * v j - secondMoment X μ i j := by funext v; simp [g]
      rw [this]
      exact (Measurable.mul (measurable_pi_apply i) (measurable_pi_apply j)).sub measurable_const
    convert iIndepFun.comp h_indep g hg using 1
  have h_set : {ω | |empiricalSecondMoment samples ω i j - secondMoment X μ i j| ≥ ε}
      = {ω | |(1 / n : ℝ) * ∑ k : Fin n, Z k ω| ≥ ε} := by
    ext ω
    have h_entry : empiricalSecondMoment samples ω i j - secondMoment X μ i j
        = (1 / n : ℝ) * ∑ k : Fin n, Z k ω := by
      have hn' : (n : ℝ) ≠ 0 := by positivity
      simp [Z, empiricalSecondMoment, secondMoment, Finset.sum_sub_distrib, Finset.sum_const,
        Finset.card_univ, Fintype.card_fin]
      field_simp [hn']
    simp [h_entry]
  rw [h_set]
  have h_npos : (n : ℝ) > 0 := by positivity
  have h_upper : μ.real {ω | ε ≤ (1 / n : ℝ) * ∑ k : Fin n, Z k ω}
      ≤ exp (-n * ε ^ 2 / (2 * B ^ 4)) := by
    have h1 : {ω | ε ≤ (1 / n : ℝ) * ∑ k : Fin n, Z k ω}
        = {ω | n * ε ≤ ∑ k : Fin n, Z k ω} := by
      ext ω
      simp only [Set.mem_setOf_eq]
      constructor <;> intro h
      · have : (n : ℝ) * ε ≤ (n : ℝ) * ((1 / n : ℝ) * ∑ k : Fin n, Z k ω) := by
          apply mul_le_mul_of_nonneg_left h (by positivity)
        field_simp at this ⊢
        linarith
      · have : (1 / n : ℝ) * ∑ k : Fin n, Z k ω ≥ (1 / n : ℝ) * (n * ε) := by
          apply mul_le_mul_of_nonneg_left h (by positivity)
        field_simp at this ⊢
        linarith
    rw [h1]
    let c : NNReal := ⟨B ^ 4, by positivity⟩
    have h2 := measure_sum_ge_le_of_iIndepFun (s := Finset.univ) hZ_indep
      (fun k _ => hZ_subG' k) (show 0 ≤ n * ε by positivity)
    apply h2.trans
    have h_exp : -(↑n * ε) ^ 2 / (2 * ↑(∑ i : Fin n, c)) = -↑n * ε ^ 2 / (2 * B ^ 4) := by
      have hsum : ↑(∑ i : Fin n, c) = n * B ^ 4 := by
        have hc : (c : ℝ) = B ^ 4 := by simp [c]
        rw [NNReal.coe_sum]
        simp_rw [hc]
        simp [Finset.sum_const, Finset.card_univ, Fintype.card_fin]
      rw [hsum]
      field_simp
    rw [h_exp]
  have h_lower : μ.real {ω | ε ≤ (1 / n : ℝ) * ∑ k : Fin n, (-Z k) ω}
      ≤ exp (-n * ε ^ 2 / (2 * B ^ 4)) := by
    have h1 : {ω | ε ≤ (1 / n : ℝ) * ∑ k : Fin n, (-Z k) ω}
        = {ω | n * ε ≤ ∑ k : Fin n, (-Z k) ω} := by
      ext ω
      simp only [Set.mem_setOf_eq]
      constructor <;> intro h
      · have : (n : ℝ) * ε ≤ (n : ℝ) * ((1 / n : ℝ) * ∑ k : Fin n, (-Z k) ω) := by
          apply mul_le_mul_of_nonneg_left h (by positivity)
        field_simp at this ⊢
        linarith
      · have : (1 / n : ℝ) * ∑ k : Fin n, (-Z k) ω ≥ (1 / n : ℝ) * (n * ε) := by
          apply mul_le_mul_of_nonneg_left h (by positivity)
        field_simp at this ⊢
        linarith
    rw [h1]
    let c : NNReal := ⟨B ^ 4, by positivity⟩
    have hZ_neg_subG (k : Fin n) : HasSubgaussianMGF (-Z k) c μ := by
      simpa using (hZ_subG' k).neg
    have hZ_neg_indep : iIndepFun (fun k => -Z k) μ := by
      let g (k : Fin n) (r : ℝ) : ℝ := -r
      have hg (k : Fin n) : Measurable (g k) := by
        have : g k = fun r => -r := by funext r; simp [g]
        rw [this]
        exact measurable_neg
      convert iIndepFun.comp hZ_indep g hg using 1
    have h2 := measure_sum_ge_le_of_iIndepFun (s := Finset.univ) hZ_neg_indep
      (fun k _ => hZ_neg_subG k) (show 0 ≤ n * ε by positivity)
    apply h2.trans
    have h_exp : -(↑n * ε) ^ 2 / (2 * ↑(∑ i : Fin n, c)) = -↑n * ε ^ 2 / (2 * B ^ 4) := by
      have hsum : ↑(∑ i : Fin n, c) = n * B ^ 4 := by
        have hc : (c : ℝ) = B ^ 4 := by simp [c]
        rw [NNReal.coe_sum]
        simp_rw [hc]
        simp [Finset.sum_const, Finset.card_univ, Fintype.card_fin]
      rw [hsum]
      field_simp
    rw [h_exp]
  have h_two_sided : μ.real {ω | |(1 / n : ℝ) * ∑ k : Fin n, Z k ω| ≥ ε}
      ≤ μ.real {ω | ε ≤ (1 / n : ℝ) * ∑ k : Fin n, Z k ω}
        + μ.real {ω | ε ≤ (1 / n : ℝ) * ∑ k : Fin n, (-Z k) ω} := by
    have hset : {ω | |(1 / n : ℝ) * ∑ k : Fin n, Z k ω| ≥ ε}
        ⊆ {ω | ε ≤ (1 / n : ℝ) * ∑ k : Fin n, Z k ω} ∪ {ω | ε ≤ (1 / n : ℝ) * ∑ k : Fin n, (-Z k) ω} := by
      intro ω h
      have h' : ε ≤ |(1 / n : ℝ) * ∑ k : Fin n, Z k ω| := h
      by_cases hneg : (1 / n : ℝ) * ∑ k : Fin n, Z k ω ≤ 0
      · have h_neg_abs : |(1 / n : ℝ) * ∑ k : Fin n, Z k ω| = -(1 / n : ℝ) * ∑ k : Fin n, Z k ω := by
          rw [abs_of_nonpos hneg]
          ring
        rw [h_neg_abs] at h'
        have hsum' : (1 / n : ℝ) * ∑ k : Fin n, (-Z k) ω = -(1 / n : ℝ) * ∑ k : Fin n, Z k ω := by
          simp [Finset.sum_neg_distrib]
        right
        simp only [Set.mem_setOf_eq]
        rw [hsum']
        linarith
      · have hpos : 0 ≤ (1 / n : ℝ) * ∑ k : Fin n, Z k ω := by linarith
        have h_pos_abs : |(1 / n : ℝ) * ∑ k : Fin n, Z k ω| = (1 / n : ℝ) * ∑ k : Fin n, Z k ω := by
          rw [abs_of_nonneg hpos]
        rw [h_pos_abs] at h'
        left
        simp only [Set.mem_setOf_eq]
        linarith
    apply (measureReal_mono hset).trans
    apply measureReal_union_le
  apply h_two_sided.trans
  linarith [h_upper, h_lower]

end SecondMomentAndConcentration

/-! ## Continuity of the participation ratio -/

section PRContinuity

/-- Participation ratio of a `d × d` real matrix, expressed in terms of its
    trace and Frobenius norm: `PR(M) = (tr M)² / tr(M²)`. -/
noncomputable def participationRatioMatrix (M : Matrix (Fin d) (Fin d) ℝ) : ℝ :=
  (M.trace) ^ 2 / (M * M).trace

/-- The participation ratio is continuous at any matrix whose denominator is
    nonzero. In the statistical setting this excludes the zero second moment,
    which is never observed. -/
theorem participationRatioMatrix_continuous {M : Matrix (Fin d) (Fin d) ℝ}
    (hM : (M * M).trace ≠ 0) :
    ContinuousAt participationRatioMatrix M := by
  have h_trace : Continuous (fun A : Matrix (Fin d) (Fin d) ℝ => A.trace) := by
    have : (fun A : Matrix (Fin d) (Fin d) ℝ => A.trace) = fun A => ∑ i : Fin d, A i i := by
      funext A
      simp [trace]
    rw [this]
    exact continuous_finset_sum _ fun i _ => continuous_apply_apply i i
  have h_frob : Continuous (fun A : Matrix (Fin d) (Fin d) ℝ => (A * A).trace) := by
    have : (fun A : Matrix (Fin d) (Fin d) ℝ => (A * A).trace)
        = fun A => ∑ i : Fin d, ∑ k : Fin d, A i k * A k i := by
      funext A
      simp [trace, mul_apply]
    rw [this]
    exact continuous_finset_sum _ fun i _ => continuous_finset_sum _ fun k _ =>
      Continuous.mul (continuous_apply_apply i k) (continuous_apply_apply k i)
  unfold participationRatioMatrix
  apply ContinuousAt.div
  · apply ContinuousAt.pow
    exact h_trace.continuousAt
  · exact h_frob.continuousAt
  · exact hM

end PRContinuity

end OpenDistillationFactory.Materials.Theory.FiniteSampleConcentration
