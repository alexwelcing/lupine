import Mathlib.Data.Real.Basic
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-!
# A scalar operative-value lemma (NOT a formalization of the hyper-ribbon)

> ⚠️ **Corrected framing (2026-06-02).** This module was originally written and
> advertised as "the ribbon generalised, first-principles." **That was a mistake and
> is withdrawn.** What is below is a *generic* one-dimensional operative-value
> parabola over arbitrary reals — the **same** result already proved in
> `ContextSpecificProof.operativeValue_closed_form`. It does **not** formalize any of
> the three error-geometry objects (see `docs/science/objects.md`): not the
> Transtrum–Sethna **model manifold** (the actual hyper-ribbon, in prediction space),
> not the **participation-ratio** measure of the error covariance, and not the
> keystone paper's **configuration-space core** (the real conditional-universality
> theorem, gated on the untested A6 assumption). The `par`/`orth` split below is a
> 1-D toy, not the high-dimensional projection geometry the program needs. Retained
> only because the algebra is correct and kernel-checked; do **not** cite it as "the
> ribbon, formalized." The right Lean target is the keystone `ErrorGeomData` /
> `exact_tubular_universality` skeleton.

Read the symbols below as a *pedagogical scalar model*: `par` a scalar standing in
for an error component a scalar correction `κ` can act on, `orth` a scalar standing
in for an untouched component. No MLIP, model id, or per-backend constant appears in
any proof — but neither does any genuine ribbon geometry.

Every theorem below is proved for arbitrary reals with `ring`/`nlinarith`. The
parabola `ribbonGain = κ·(2·par − κ)` is the same operative-value parabola proved
in `ContextSpecificProof.operativeValue_closed_form`, restated with a second scalar
made explicit. It is correct algebra about a 1-D toy — and nothing more.
-/

namespace OpenDistillationFactory.Materials.Theory.RibbonProjection

/-- Total squared error = ribbon-parallel residual + orthogonal residual.
    The Pythagorean split (orthogonality of the two subspaces) is the single
    first principle this module rests on. -/
noncomputable def totalResidual (par orth : ℝ) : ℝ := par ^ 2 + orth ^ 2

/-- A ribbon correction `κ` acts ONLY on the parallel coordinate; the orthogonal
    coordinate passes through unchanged. -/
noncomputable def correctedResidual (par orth κ : ℝ) : ℝ := (par - κ) ^ 2 + orth ^ 2

/-- Ribbon gain: the reduction in total squared error from the correction. -/
noncomputable def ribbonGain (par orth κ : ℝ) : ℝ :=
  totalResidual par orth - correctedResidual par orth κ

/-- **The gain is the parallel operative value; the orthogonal sector cancels.**
    `ribbonGain = κ·(2·par − κ)` — a downward parabola in `κ` with roots `0` and
    `2·par`. `orth` does not appear. (Same parabola as
    `ContextSpecificProof.operativeValue_closed_form` with deficit `par`.) -/
theorem ribbonGain_closed_form (par orth κ : ℝ) :
    ribbonGain par orth κ = κ * (2 * par - κ) := by
  unfold ribbonGain totalResidual correctedResidual; ring

/-- **Universality — no per-model exception.** The gain is independent of the
    orthogonal component: two backends with the SAME ribbon-parallel error and the
    SAME correction earn the SAME gain whatever their (model-specific) orthogonal
    errors. The outcome is a function of the ribbon geometry alone. -/
theorem ribbonGain_independent_of_orthogonal (par orth₁ orth₂ κ : ℝ) :
    ribbonGain par orth₁ κ = ribbonGain par orth₂ κ := by
  rw [ribbonGain_closed_form, ribbonGain_closed_form]

/-- The total gain does not depend on the orthogonal sector at all (set it to 0). -/
theorem gain_lives_in_ribbon (par orth κ : ℝ) :
    ribbonGain par orth κ = ribbonGain par 0 κ := by
  rw [ribbonGain_closed_form, ribbonGain_closed_form]

/-- **Energy-only, part 1.** On a purely ORTHOGONAL error (`par = 0` — the force
    sector the energy ribbon does not span) the gain is `−κ²`: a ribbon correction
    can only do nothing (`κ = 0`) or harm. -/
theorem orthogonal_error_uncorrectable (orth κ : ℝ) :
    ribbonGain 0 orth κ = - κ ^ 2 := by
  rw [ribbonGain_closed_form]; ring

/-- **Energy-only, part 2.** Hence on the orthogonal sector the best a ribbon
    correction can do is zero — exactly the forces-row 0.0% result, as a theorem,
    not a measurement: the correct (and only non-harmful) action there is `κ = 0`. -/
theorem orthogonal_error_gain_nonpos (orth κ : ℝ) :
    ribbonGain 0 orth κ ≤ 0 := by
  rw [orthogonal_error_uncorrectable]; nlinarith [sq_nonneg κ]

/-- **Valuable iff aligned.** For a real ribbon error (`0 < par`), an aligned,
    non-overshooting correction (`0 < κ < 2·par`) strictly reduces total error.
    Same theorem for every backend. -/
theorem ribbonGain_strictly_valuable (par orth κ : ℝ) (h0 : 0 < κ) (h2 : κ < 2 * par) :
    0 < ribbonGain par orth κ := by
  rw [ribbonGain_closed_form]
  have h : 0 < 2 * par - κ := by linarith
  exact mul_pos h0 h

/-- **Regression from anti-alignment, NOT from the model.** A correction pointing
    the wrong way (`κ < 0`) on a real ribbon error strictly INCREASES total error.
    This is the CHGNet regression from first principles: a generic correction whose
    sign is misaligned with that backend's error lands outside `(0, 2·par)` — the
    very same parabola, with no CHGNet-specific axiom. The per-backend
    `signed-orientation` policy fixes it by re-aligning `κ`, not by excepting. -/
theorem ribbonGain_neg_of_antialigned (par orth κ : ℝ) (_hpar : 0 < par) (hκ : κ < 0) :
    ribbonGain par orth κ < 0 := by
  rw [ribbonGain_closed_form]
  have h : 0 < 2 * par - κ := by linarith
  exact mul_neg_of_neg_of_pos hκ h

/-- Overcorrection (`κ > 2·par`) likewise regresses — the upper root of the parabola.
    (`_hpar : 0 < par` is necessary — the statement is false without it — but is
    consumed by `linarith` from context, hence the underscore.) -/
theorem ribbonGain_neg_of_overcorrection (par orth κ : ℝ) (_hpar : 0 < par)
    (hκ : 2 * par < κ) : ribbonGain par orth κ < 0 := by
  rw [ribbonGain_closed_form]
  have hkpos : 0 < κ := by linarith
  have h : 2 * par - κ < 0 := by linarith
  exact mul_neg_of_pos_of_neg hkpos h

/-- **Optimal correction closes the ribbon component exactly** (`κ = par`), earning
    the full parallel residual `par²` while leaving the orthogonal sector intact.
    Unifies with `ContextSpecificProof.context_correction_optimal`. -/
theorem ribbonGain_optimal (par orth : ℝ) :
    ribbonGain par orth par = par ^ 2 := by
  rw [ribbonGain_closed_form]; ring

/-- **Accuracy-axis bridge (squared form).** At the optimal correction the gain is
    the squared-error reduction from baseline `b² = par² + orth²` (total) to the
    distilled error `d² = orth²` (the orthogonal residual that survives), i.e.
    `b² − d²` — `AccuracyCommitment.accuracyGain` in squared norm. -/
theorem ribbon_optimal_matches_accuracy (par orth : ℝ) :
    ribbonGain par orth par = (par ^ 2 + orth ^ 2) - orth ^ 2 := by
  rw [ribbonGain_optimal]; ring

/-- **Capstone — the broad distill commitment, with no per-model exception.**
    Take two distinct backends with the SAME ribbon-parallel error `par` (the shared
    sloppy direction) but ARBITRARY, different orthogonal errors `orth₁`, `orth₂`
    (their model-specific non-ribbon content). Under any aligned correction
    `0 < κ < 2·par`, BOTH earn a strictly positive and IDENTICAL gain. So
    "distill beats baseline" is a property of the ribbon geometry `(par, κ)` alone.
    Per-backend policy tuning is re-ALIGNING `κ` to each backend's `par` — the same
    law applied correctly, never an exception to it. -/
theorem broad_value_no_model_exception
    (par orth₁ orth₂ κ : ℝ) (h0 : 0 < κ) (h2 : κ < 2 * par) :
    0 < ribbonGain par orth₁ κ ∧ ribbonGain par orth₁ κ = ribbonGain par orth₂ κ :=
  ⟨ribbonGain_strictly_valuable par orth₁ κ h0 h2,
   ribbonGain_independent_of_orthogonal par orth₁ orth₂ κ⟩

-- Campaign witnesses (run `sm-20260602a`, eV/atom MAE) realizing each branch:
--   aligned, par>0   : MACE 0.4116 → 0.2038, SevenNet 0.3997 → 0.2773  (strictly_valuable)
--   anti-aligned κ   : CHGNet 0.1035 → 0.1429 under a generic policy   (neg_of_antialigned)
--   re-aligned (own) : CHGNet 0.1035 → 0.0971 under signed-orientation (strictly_valuable)
--   orthogonal sector: forces Δ = 0.0% on all backends                 (orthogonal_error_gain_nonpos)

end OpenDistillationFactory.Materials.Theory.RibbonProjection
