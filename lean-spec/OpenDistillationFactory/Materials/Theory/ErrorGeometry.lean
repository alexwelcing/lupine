import Mathlib.Data.Real.Basic
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
# Error-Geometry Core: the participation-ratio gauge and ribbon/consensus decoupling

Formal core of the projection-law program (see
`prereg_functional_vs_architecture_2x2.md` and `results_4x2_report.md` in the
research workspace).

Model: an ensemble of fitted models shares a systematic error component (bias
`b`, the perpendicular to the family's reachable set) plus isotropic fitting
noise of scale `σ` in a `d`-dimensional observable space. With bias-to-noise
ratio `ρ = |b|²/σ²`, the uncentered second moment of the error ensemble has one
eigenvalue `(ρ+1)σ²` and `d−1` eigenvalues `σ²`, giving participation ratio

    PR(d, ρ) = (ρ + d)² / ((ρ + 1)² + (d − 1)).

This file proves the gauge's structural properties — `PR(d, 0) = d` (pure
noise), `1 ≤ PR ≤ d`, and strict decrease in `ρ` — and the
**ribbon/consensus decoupling theorem**: the participation ratio of a
shared-axis ensemble is invariant under sign flips of the per-model
coefficients, while pairwise alignment is not. PR detects the *axis* (the
ribbon); alignment detects *sign coherence* (consensus). They are distinct
order parameters, which is exactly the empirical structure observed in the
4×2 functional-vs-architecture experiment (rank-1 share high everywhere; mean
signed cosine collapsing where functionals disagree in sign along the shared
axis).

House rules: zero `sorry`, zero new axioms, scalar statements the runtime can
instantiate from SVD diagnostics.
-/

namespace OpenDistillationFactory.Materials.Theory.ErrorGeometry

/-- Participation ratio of the bias-plus-isotropic-noise error ensemble, as a
function of observable-space dimension `d` and bias-to-noise ratio `ρ`
(both taken real; physically `d ≥ 1`, `ρ ≥ 0`). -/
noncomputable def prBiasNoise (d ρ : Real) : Real :=
  (ρ + d) ^ 2 / ((ρ + 1) ^ 2 + (d - 1))

/-- The denominator of the PR gauge is positive throughout the physical
region. -/
theorem prBiasNoise_denom_pos {d ρ : Real} (hd : 1 ≤ d) (hρ : 0 ≤ ρ) :
    0 < (ρ + 1) ^ 2 + (d - 1) := by
  nlinarith [sq_nonneg ρ]

/-- Pure fitting noise (`ρ = 0`): the error cloud is isotropic and the
participation ratio equals the full dimension `d`. -/
theorem prBiasNoise_zero {d : Real} (hd : 1 ≤ d) : prBiasNoise d 0 = d := by
  have hd0 : d ≠ 0 := by linarith
  have hden : ((0 : Real) + 1) ^ 2 + (d - 1) = d := by ring
  unfold prBiasNoise
  rw [hden]
  rw [show ((0 : Real) + d) ^ 2 = d * d by ring]
  rw [mul_div_assoc, div_self hd0, mul_one]

/-- The participation ratio never exceeds the ambient dimension. -/
theorem prBiasNoise_le_dim {d ρ : Real} (hd : 1 ≤ d) (hρ : 0 ≤ ρ) :
    prBiasNoise d ρ ≤ d := by
  unfold prBiasNoise
  rw [div_le_iff₀ (prBiasNoise_denom_pos hd hρ)]
  nlinarith [mul_nonneg (sub_nonneg.mpr hd) (sq_nonneg ρ)]

/-- The participation ratio is at least 1: an error ensemble always spans at
least one effective dimension. -/
theorem one_le_prBiasNoise {d ρ : Real} (hd : 1 ≤ d) (hρ : 0 ≤ ρ) :
    1 ≤ prBiasNoise d ρ := by
  unfold prBiasNoise
  rw [le_div_iff₀ (prBiasNoise_denom_pos hd hρ)]
  nlinarith [mul_nonneg (sub_nonneg.mpr hd) (by linarith : (0 : Real) ≤ 2 * ρ + d)]

/-- **Strict monotonicity of the gauge.** For `d > 1`, the participation ratio
strictly decreases as the bias-to-noise ratio grows: more systematic error
means a thinner ribbon. Key algebraic identity (derived by factoring the
cross-multiplied difference):

    N₁D₂ − N₂D₁ = (d − 1)(ρ₂ − ρ₁)(2ρ₁ρ₂ + d(ρ₁ + ρ₂)).
-/
theorem prBiasNoise_strictAnti {d ρ₁ ρ₂ : Real} (hd : 1 < d)
    (h1 : 0 ≤ ρ₁) (h12 : ρ₁ < ρ₂) :
    prBiasNoise d ρ₂ < prBiasNoise d ρ₁ := by
  have hd1 : (1 : Real) ≤ d := le_of_lt hd
  have h2 : 0 ≤ ρ₂ := le_of_lt (lt_of_le_of_lt h1 h12)
  have hD1 : 0 < (ρ₁ + 1) ^ 2 + (d - 1) := prBiasNoise_denom_pos hd1 h1
  have hD2 : 0 < (ρ₂ + 1) ^ 2 + (d - 1) := prBiasNoise_denom_pos hd1 h2
  unfold prBiasNoise
  rw [div_lt_div_iff₀ hD2 hD1]
  have key : (ρ₁ + d) ^ 2 * ((ρ₂ + 1) ^ 2 + (d - 1)) -
      (ρ₂ + d) ^ 2 * ((ρ₁ + 1) ^ 2 + (d - 1)) =
      (d - 1) * (ρ₂ - ρ₁) * (2 * ρ₁ * ρ₂ + d * (ρ₁ + ρ₂)) := by
    ring
  have hfac : 0 < (d - 1) * (ρ₂ - ρ₁) * (2 * ρ₁ * ρ₂ + d * (ρ₁ + ρ₂)) := by
    have hρpos : 0 < 2 * ρ₁ * ρ₂ + d * (ρ₁ + ρ₂) := by nlinarith
    have hdm : 0 < d - 1 := by linarith
    have hdr : 0 < ρ₂ - ρ₁ := by linarith
    positivity
  linarith [key, hfac]

/-- The systematic fraction of ensemble error implied by a measured
participation ratio: `α = ρ/(ρ+1)` is the share of squared error lying along
the bias axis. -/
noncomputable def systematicFraction (ρ : Real) : Real := ρ / (ρ + 1)

theorem systematicFraction_nonneg {ρ : Real} (hρ : 0 ≤ ρ) :
    0 ≤ systematicFraction ρ := by
  unfold systematicFraction
  positivity

theorem systematicFraction_lt_one {ρ : Real} (hρ : 0 ≤ ρ) :
    systematicFraction ρ < 1 := by
  unfold systematicFraction
  rw [div_lt_one (by linarith : (0 : Real) < ρ + 1)]
  linarith

/-! ## Ribbon/consensus decoupling

A shared-axis ensemble: each model's error is `cᵢ • u` for a common unit axis
`u` and a per-model coefficient `cᵢ` (sign and magnitude set by the binding
constraint stack). At the spectrum level the uncentered second moment has a
single nonzero eigenvalue `c₁² + c₂² + c₃²`, so the participation ratio is 1
regardless of signs — while pairwise alignment is `±1` according to sign
agreement. Three models suffice to exhibit the decoupling (matching the
minimum ensemble size of the original MLIP trio). -/

/-- Participation ratio of an explicit 3-eigenvalue spectrum. -/
noncomputable def prSpectrum (a b c : Real) : Real :=
  (a + b + c) ^ 2 / (a ^ 2 + b ^ 2 + c ^ 2)

/-- Single nonzero eigenvalue ⇒ participation ratio exactly 1. -/
theorem prSpectrum_rank_one {a : Real} (ha : a ≠ 0) : prSpectrum a 0 0 = 1 := by
  unfold prSpectrum
  have h2 : a ^ 2 ≠ 0 := pow_ne_zero 2 ha
  field_simp
  ring

/-- The single nonzero eigenvalue of a shared-axis ensemble of three models. -/
def axisSecondMoment (c₁ c₂ c₃ : Real) : Real := c₁ ^ 2 + c₂ ^ 2 + c₃ ^ 2

/-- **Sign-blindness of the ribbon.** Flipping any subset of coefficient signs
leaves the shared-axis second moment — hence the participation ratio —
unchanged. -/
theorem axisSecondMoment_sign_blind (c₁ c₂ c₃ ε₁ ε₂ ε₃ : Real)
    (h₁ : ε₁ ^ 2 = 1) (h₂ : ε₂ ^ 2 = 1) (h₃ : ε₃ ^ 2 = 1) :
    axisSecondMoment (ε₁ * c₁) (ε₂ * c₂) (ε₃ * c₃) =
      axisSecondMoment c₁ c₂ c₃ := by
  unfold axisSecondMoment
  have e₁ : (ε₁ * c₁) ^ 2 = c₁ ^ 2 := by rw [mul_pow, h₁, one_mul]
  have e₂ : (ε₂ * c₂) ^ 2 = c₂ ^ 2 := by rw [mul_pow, h₂, one_mul]
  have e₃ : (ε₃ * c₃) ^ 2 = c₃ ^ 2 := by rw [mul_pow, h₃, one_mul]
  rw [e₁, e₂, e₃]

/-- A nondegenerate shared-axis ensemble has participation ratio exactly 1,
independent of coefficient signs. -/
theorem axis_pr_one {c₁ c₂ c₃ : Real} (h : axisSecondMoment c₁ c₂ c₃ ≠ 0) :
    prSpectrum (axisSecondMoment c₁ c₂ c₃) 0 0 = 1 :=
  prSpectrum_rank_one h

/-- Pairwise alignment (cosine) of two collinear error vectors `x • u` and
`y • u`: equals the product of signs. -/
noncomputable def pairAlignment (x y : Real) : Real := x * y / (|x| * |y|)

theorem pairAlignment_same_sign {x y : Real} (hx : 0 < x) (hy : 0 < y) :
    pairAlignment x y = 1 := by
  unfold pairAlignment
  rw [abs_of_pos hx, abs_of_pos hy]
  field_simp

theorem pairAlignment_opposite_sign {x y : Real} (hx : 0 < x) (hy : y < 0) :
    pairAlignment x y = -1 := by
  unfold pairAlignment
  rw [abs_of_pos hx, abs_of_neg hy]
  have hx0 : x ≠ 0 := ne_of_gt hx
  have hy0 : y ≠ 0 := ne_of_lt hy
  field_simp

/-- Mean pairwise alignment of a three-model shared-axis ensemble. -/
noncomputable def meanAlignment (c₁ c₂ c₃ : Real) : Real :=
  (pairAlignment c₁ c₂ + pairAlignment c₁ c₃ + pairAlignment c₂ c₃) / 3

/-- **Ribbon/consensus decoupling.** The ensembles `(1, 1, 1)` and
`(1, 1, −1)` have identical shared-axis second moments (identical ribbons,
PR = 1) but mean alignments `1` and `−1/3` respectively: the participation
ratio cannot distinguish consensus from anti-aligned disagreement along the
same axis. Empirical instantiation: V and Cr in the cross-MLIP ensembles
(pairwise cosine ≈ −0.88 with rank-1 share ≈ 0.9). -/
theorem ribbon_consensus_decoupled :
    axisSecondMoment 1 1 (-1) = axisSecondMoment 1 1 1 ∧
      meanAlignment 1 1 1 = 1 ∧
      meanAlignment 1 1 (-1) = -(1 / 3) := by
  refine ⟨by unfold axisSecondMoment; ring, ?_, ?_⟩
  · unfold meanAlignment
    rw [pairAlignment_same_sign one_pos one_pos]
    norm_num
  · unfold meanAlignment
    rw [pairAlignment_same_sign one_pos one_pos,
      pairAlignment_opposite_sign one_pos (by norm_num : (-1 : Real) < 0)]
    norm_num

-- ═══════════════════════════════════════════════════════════════
-- ADDITIONAL STRUCTURAL THEOREMS (submission push)
-- ═══════════════════════════════════════════════════════════════

/-- At zero bias the systematic fraction vanishes: pure noise carries no
    shared systematic component. -/
theorem systematicFraction_zero : systematicFraction 0 = 0 := by
  unfold systematicFraction
  norm_num

/-- As bias dominates, the systematic fraction approaches 1: the ensemble
    becomes entirely systematic. -/
theorem systematicFraction_limit_one (eps : ℝ) (heps : 0 < eps) :
    ∃ ρ : ℝ, 0 < ρ ∧ 1 - systematicFraction ρ < eps := by
  use 1 / eps
  constructor
  · positivity
  · unfold systematicFraction
    have hpos : 0 < 1 / eps + 1 := by positivity
    have h1 : 1 - (1 / eps) / (1 / eps + 1) = 1 / (1 / eps + 1) := by
      field_simp
      ring
    rw [h1]
    have h2 : 1 / (1 / eps + 1) < eps := by
      have h3 : 1 / (1 / eps + 1) = eps / (1 + eps) := by
        field_simp
      rw [h3]
      have h4 : 0 < 1 + eps := by linarith
      apply (div_lt_iff₀ h4).mpr
      nlinarith
    exact h2

/-- The participation-ratio gauge at ρ = 1: equal systematic and noise
    contributions give a PR that depends only on dimension. -/
theorem prBiasNoise_one {d : ℝ} (_hd : 1 ≤ d) : prBiasNoise d 1 = (d + 1) ^ 2 / (d + 3) := by
  unfold prBiasNoise
  ring_nf

/-- The 3D participation ratio is scale-invariant. -/
theorem prSpectrum_scale_invariant (a b c : ℝ) {s : ℝ} (hs : 0 < s) :
    prSpectrum (s * a) (s * b) (s * c) = prSpectrum a b c := by
  unfold prSpectrum
  have h1 : s * a + s * b + s * c = s * (a + b + c) := by ring
  have h2 : (s * a) ^ 2 + (s * b) ^ 2 + (s * c) ^ 2 = s ^ 2 * (a ^ 2 + b ^ 2 + c ^ 2) := by ring
  rw [h1, h2]
  rw [mul_pow]
  rcases eq_or_ne (a ^ 2 + b ^ 2 + c ^ 2) 0 with h0 | h0
  · rw [h0, mul_zero, div_zero, div_zero]
  · field_simp

/-- The shared-axis second moment is nonnegative. -/
theorem axisSecondMoment_nonneg (c₁ c₂ c₃ : ℝ) : 0 ≤ axisSecondMoment c₁ c₂ c₃ := by
  unfold axisSecondMoment
  positivity

/-- Pairwise alignment of a positive value with itself is 1. -/
theorem pairAlignment_self (x : ℝ) (hx : 0 < x) : pairAlignment x x = 1 := by
  unfold pairAlignment
  rw [abs_of_pos hx]
  field_simp

end OpenDistillationFactory.Materials.Theory.ErrorGeometry
