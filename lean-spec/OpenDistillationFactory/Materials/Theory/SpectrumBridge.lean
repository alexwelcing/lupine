import Mathlib.Analysis.InnerProductSpace.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring
import OpenDistillationFactory.Materials.Theory.ErrorGeometry

/-!
# Spectrum Bridge: from bias-plus-noise ensembles to the PR gauge

Closes the gap between the vector level (`ProjectionLaw.lean`: residuals of a
converged family share one bias direction `b`) and the gauge level
(`ErrorGeometry.lean`: `PR(d, ρ)` as a function of the bias-to-noise ratio).

Chain, fully machine-checked:

1. `biasNoiseOp_eigen_bias` / `biasNoiseOp_eigen_orth` — the second-moment
   operator `M x = ⟪b, x⟫ • b + σ² x` of a bias-plus-isotropic-noise ensemble
   has eigenvalue `‖b‖² + σ²` along the bias and acts as `σ² • id` on the
   entire orthogonal complement (the `(d−1)`-fold eigenvalue).
2. `prSpectrumFin_biasNoise` — the participation ratio computed from that
   spectrum (one eigenvalue `ρ+1`, `d−1` eigenvalues `1`, in units of `σ²`;
   `prSpectrumFin_smul` shows units are irrelevant) equals the closed-form
   gauge `prBiasNoise d ρ`. The gauge is therefore a THEOREM about
   bias-plus-noise ensembles, not a definition.
3. `prBiasNoise_sub_one_le` — quantitative ribbon collapse: for `ρ ≥ d` the
   participation ratio exceeds 1 by at most `3(d−1)/ρ`. A family whose
   systematic error dominates its fitting scatter is *provably* confined to a
   ribbon, at an explicit rate.

House rules: zero `sorry`, zero new axioms.
-/

namespace OpenDistillationFactory.Materials.Theory.SpectrumBridge

open OpenDistillationFactory.Materials.Theory.ErrorGeometry

/-! ## 1. Eigen-structure of the bias-plus-noise second moment -/

section Operator

variable {E : Type*} [NormedAddCommGroup E] [InnerProductSpace Real E]

/-- Second-moment operator of an error ensemble with shared bias `b` and
isotropic noise variance `s = σ²`: `M x = ⟪b, x⟫ • b + s • x`. -/
noncomputable def biasNoiseOp (b : E) (s : Real) (x : E) : E :=
  (inner (𝕜 := Real) b x) • b + s • x

/-- The bias direction is an eigenvector with eigenvalue `‖b‖² + σ²`. -/
theorem biasNoiseOp_eigen_bias (b : E) (s : Real) :
    biasNoiseOp b s b = (‖b‖ ^ 2 + s) • b := by
  unfold biasNoiseOp
  rw [real_inner_self_eq_norm_sq, add_smul]

/-- Every direction orthogonal to the bias is an eigenvector with eigenvalue
`σ²`: the operator acts as `σ² • id` on the whole `(d−1)`-dimensional
orthogonal complement. -/
theorem biasNoiseOp_eigen_orth (b : E) (s : Real) {x : E}
    (hx : inner (𝕜 := Real) b x = (0 : Real)) :
    biasNoiseOp b s x = s • x := by
  unfold biasNoiseOp
  rw [hx, zero_smul, zero_add]

end Operator

/-! ## 2. Participation ratio of the resulting spectrum -/

open Finset

/-- Participation ratio of an arbitrary finite spectrum. -/
noncomputable def prSpectrumFin {d : ℕ} (lam : Fin d → Real) : Real :=
  (∑ i, lam i) ^ 2 / (∑ i, lam i ^ 2)

/-- PR is scale-invariant: the noise unit `σ²` drops out. -/
theorem prSpectrumFin_smul {d : ℕ} (lam : Fin d → Real) {c : Real} (hc : c ≠ 0) :
    prSpectrumFin (fun i => c * lam i) = prSpectrumFin lam := by
  unfold prSpectrumFin
  rw [← Finset.mul_sum]
  have hsq : ∀ i : Fin d, (c * lam i) ^ 2 = c ^ 2 * lam i ^ 2 := fun i => by ring
  rw [Finset.sum_congr rfl fun i _ => hsq i, ← Finset.mul_sum]
  rw [mul_pow]
  rcases eq_or_ne (∑ i, lam i ^ 2) 0 with h0 | h0
  · rw [h0, mul_zero, div_zero, div_zero]
  · field_simp

/-- The bias-plus-noise spectrum in units of `σ²`: one eigenvalue `ρ + 1`
(bias axis), `d − 1` eigenvalues `1` (noise floor). -/
noncomputable def biasNoiseSpectrum (n : ℕ) (ρ : Real) : Fin (n + 1) → Real :=
  fun i => if i = 0 then ρ + 1 else 1

theorem sum_biasNoiseSpectrum (n : ℕ) (ρ : Real) :
    ∑ i, biasNoiseSpectrum n ρ i = ρ + 1 + n := by
  unfold biasNoiseSpectrum
  rw [Fin.sum_univ_succ]
  simp [Fin.succ_ne_zero]

theorem sumsq_biasNoiseSpectrum (n : ℕ) (ρ : Real) :
    ∑ i, biasNoiseSpectrum n ρ i ^ 2 = (ρ + 1) ^ 2 + n := by
  unfold biasNoiseSpectrum
  rw [Fin.sum_univ_succ]
  simp [Fin.succ_ne_zero]

/-- **The gauge is a theorem.** The participation ratio of the bias-plus-noise
spectrum equals the closed-form `prBiasNoise` of `ErrorGeometry.lean`. -/
theorem prSpectrumFin_biasNoise (n : ℕ) (ρ : Real) :
    prSpectrumFin (biasNoiseSpectrum n ρ) = prBiasNoise ((n : Real) + 1) ρ := by
  unfold prSpectrumFin prBiasNoise
  rw [sum_biasNoiseSpectrum, sumsq_biasNoiseSpectrum]
  congr 1
  · ring
  · ring

/-! ## 3. Quantitative ribbon collapse -/

/-- **Explicit convergence rate.** Once the systematic error dominates
(`ρ ≥ d`), the participation ratio exceeds 1 by at most `3(d−1)/ρ`: mature
model families are provably ribbon-confined, at an explicit rate in the
bias-to-noise ratio. -/
theorem prBiasNoise_sub_one_le {d ρ : Real} (hd : 1 ≤ d) (hρd : d ≤ ρ) :
    prBiasNoise d ρ - 1 ≤ 3 * (d - 1) / ρ := by
  have hρ0 : (0 : Real) < ρ := lt_of_lt_of_le (by linarith) hρd
  have hden : (0 : Real) < (ρ + 1) ^ 2 + (d - 1) :=
    prBiasNoise_denom_pos hd (le_of_lt hρ0)
  unfold prBiasNoise
  rw [div_sub_one (ne_of_gt hden), div_le_div_iff₀ hden hρ0]
  have hint1 : 0 ≤ (d - 1) * ((ρ - d) * ρ) :=
    mul_nonneg (by linarith) (mul_nonneg (by linarith) (le_of_lt hρ0))
  have hint2 : 0 ≤ (d - 1) * ρ := mul_nonneg (by linarith) (le_of_lt hρ0)
  have hint3 : 0 ≤ (d - 1) * d := mul_nonneg (by linarith) (by linarith)
  nlinarith [hint1, hint2, hint3]

end OpenDistillationFactory.Materials.Theory.SpectrumBridge
