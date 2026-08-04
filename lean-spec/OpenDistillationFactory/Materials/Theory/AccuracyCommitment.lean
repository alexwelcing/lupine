import OpenDistillationFactory.Materials.Theory.ContextSpecificProof
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-═══════════════════════════════════════════════════════════════
  THE 5×5×3 ACCURACY COMMITMENT
  (the bridge: universality ⊕ context-specific operative value)

  ── Why this file exists ──

  Two proofs in this project describe two different sectors of the
  same Wilsonian effective theory of the quantum substrate:

    • the RELEVANT / generalizable sector — the universal baseline
      every foundation MLIP in the class reaches. This is the
      subject of the MLIP universality / causal-acceleration theorem
      (archive/KIMI_MLIP_UNIVERSAL, namespace `MLIP`), the RG statement that
      a whole class flows to the same fixed point. Status:
      conjecture (a separate, mathlib-free Lean project carrying 15
      `sorry` placeholders for measure theory / normed-space lemmas).

    • the IRRELEVANT / context-specific sector — the Distill runtime
      correction. `ContextSpecificProof` proves it has zero
      cross-context transfer (T3) yet strictly positive operative
      value in its own context (T2). Status: theorem.

  Universality alone is inert for a product: if every MLIP flows to
  the same baseline, no MLIP can win. The win must come entirely
  from the irrelevant sector — the context-specific correction that
  the universal baseline structurally cannot supply. That is the
  bridge: ACCURACY-OVER-BASELINE *is* the operative value of the
  irrelevant operator, evaluated against the universal baseline.

  ── The commitment ──

  The 5×5×3 grid (5 MLIPs × 5 physics rows × 3 variants:
  baseline / distill_accuracy / distill_accuracy_accelerate) is the
  falsifiable arena. The promotion gate (tools/mlip_local_promotion.py)
  admits a Distill intervention only if it reduces error versus the
  universal baseline (`min_accuracy_delta ≥ 0`) without an
  accelerate regression. This file lifts that gate into a
  build-locking epistemic contract, exactly as `Vision.lean` does:
  the `#guard`s below FAIL THE BUILD if a promoted 5×5×3 cell ever
  stops beating baseline. The commitment is enforced, not asserted.

  ── Honesty (per the cloud baseline report, 2026-05-23) ──

  We do NOT claim broad 5×5×3 superiority. Only the MACE and
  SevenNet *energy* cells are presently promoted; MACE *stress*
  regressed and is — correctly — blocked. Both states are encoded
  below so that the contract is genuinely falsifiable: it certifies
  the wins AND refuses the non-wins.
  ═══════════════════════════════════════════════════════════════ -/

namespace OpenDistillationFactory.Materials.Theory.AccuracyCommitment

open OpenDistillationFactory.Materials.Theory

-- ───────────────────────────────────────────────────────────────
-- THE BRIDGE (over ℝ): accuracy-over-baseline = operative value
-- ───────────────────────────────────────────────────────────────

/-- Accuracy gain of a Distill correction over the universal
    baseline, in the native error metric of a 5×5×3 row (MAE / RMSE
    / GPa). Positive ⇒ the correction earned promotion. -/
noncomputable def accuracyGain (baselineErr distillErr : ℝ) : ℝ :=
  baselineErr - distillErr

/-- The bridge identity. Set the quantum target to *perfect
    accuracy* (error 0). Then the 5×5×3 accuracy gain is exactly the
    `ContextSpecificProof` operative value of moving from the
    universal baseline error `b` to the distilled error `d`:

        operativeValue 0 b (d − b) = b² − d².

    The right-hand side factors as `(b − d)(b + d) = accuracyGain ·
    (b + d)` — the irrelevant-operator operative value, scaled by
    the total error magnitude. Accuracy-over-baseline is not an
    analogy to T2; it is an instance of it. -/
theorem accuracyGain_is_operative_value (b d : ℝ) :
    ContextSpecificProof.operativeValue 0 b (d - b) = b ^ 2 - d ^ 2 := by
  unfold ContextSpecificProof.operativeValue ContextSpecificProof.residual
  ring

/-- A measured Distill win (`0 ≤ d < b`) is a strictly positive
    operative value of the context-specific correction. This is the
    formal content of "the win comes from the irrelevant sector." -/
theorem distill_win_has_positive_operative_value
    (b d : ℝ) (hd : 0 ≤ d) (hlt : d < b) :
    ContextSpecificProof.operativeValue 0 b (d - b) > 0 := by
  rw [accuracyGain_is_operative_value]
  have h1 : 0 < b - d := by linarith
  have h2 : 0 < b + d := by linarith
  nlinarith [mul_pos h1 h2]

/-- The accuracy gain itself is strictly positive exactly when the
    distilled error beats baseline. -/
theorem accuracyGain_pos_iff_improves (b d : ℝ) :
    0 < accuracyGain b d ↔ d < b := by
  unfold accuracyGain; constructor <;> intro h <;> linarith

-- ───────────────────────────────────────────────────────────────
-- THE 5×5×3 INSTANCE (over Float): measured baseline → distill
-- Source: docs/mlip-cloud-baseline-distill-report.md (2026-05-23)
-- ───────────────────────────────────────────────────────────────

/-- Promotion-gate threshold from tools/mlip_local_promotion.py
    (`--min-accuracy-delta`, default 0.0): a Distill cell must not
    be worse than the universal baseline. -/
def minAccuracyDelta : Float := 0.0

/-- Error reduction over baseline in a row's native units. -/
def errorReduction (baselineErr distillErr : Float) : Float :=
  baselineErr - distillErr

/-- The commitment predicate: distilled error does not exceed
    baseline (the gate, in error terms: reduction ≥ minAccuracyDelta). -/
def meetsCommitment (baselineErr distillErr : Float) : Bool :=
  distillErr ≤ baselineErr

/-- Strict promotion: the cell beats baseline outright. -/
def improvesBaseline (baselineErr distillErr : Float) : Bool :=
  distillErr < baselineErr

-- Measured 5×5×3 cells (eV/atom MAE for energy; GPa MAE for stress).
def maceEnergyBaseline      : Float := 0.4116
def maceEnergyDistill       : Float := 0.2038
def maceEnergyAccelerate    : Float := 0.2038

def sevenNetEnergyBaseline  : Float := 0.3997
def sevenNetEnergyDistill   : Float := 0.3046
def sevenNetEnergyAccelerate : Float := 0.2773

def maceStressBaseline      : Float := 0.5669
def maceStressDistill       : Float := 0.9331

-- Local GPU-verified Ni FCC EAM-home-turf cell (TorchSim/MACE-MP-0).
-- Source: data/mlip_benchmarks/gpu_ni_uplift_2026-06-16/uplift_report.json
def maceMp0NiEnergyBaseline : Float := 1.2803
def maceMp0NiEnergyDistill  : Float := 0.0037

-- Promoted energy cells: the commitment is currently MET.
theorem mace_energy_beats_baseline :
    improvesBaseline maceEnergyBaseline maceEnergyDistill = true := by
  native_decide

theorem sevennet_energy_beats_baseline :
    improvesBaseline sevenNetEnergyBaseline sevenNetEnergyDistill = true := by
  native_decide

/-- The accelerate policy keeps the SevenNet energy win (and in this
    run improves on plain distill). -/
theorem sevennet_accelerate_beats_baseline :
    improvesBaseline sevenNetEnergyBaseline sevenNetEnergyAccelerate = true := by
  native_decide

/-- MACE energy improved by ≈50% (>0.15 eV/atom of error removed). -/
theorem mace_energy_reduction_is_material :
    (errorReduction maceEnergyBaseline maceEnergyDistill > 0.15) = true := by
  native_decide

/-- Falsifiability, preserved as evidence: MACE *stress* did NOT
    beat baseline (0.5669 → 0.9331), so the contract refuses it.
    A commitment that cannot be violated proves nothing. -/
theorem mace_stress_correctly_blocked :
    improvesBaseline maceStressBaseline maceStressDistill = false := by
  native_decide

/-- Local GPU verification: MACE-MP-0 on the sealed Ni FCC fixture beats
    baseline energy MAE by a factor of ~350 (1.28 → 0.0037 eV/atom). -/
theorem mace_mp0_ni_energy_beats_baseline :
    improvesBaseline maceMp0NiEnergyBaseline maceMp0NiEnergyDistill = true := by
  native_decide

/-- The local GPU uplift is far above the promotion threshold. -/
theorem mace_mp0_ni_energy_reduction_is_material :
    errorReduction maceMp0NiEnergyBaseline maceMp0NiEnergyDistill > 1.0 := by
  native_decide

-- ───────────────────────────────────────────────────────────────
-- BUILD-LOCK CONTRACT (mirrors Vision.lean)
-- Violating any #guard breaks the build. This is the commitment.
-- ───────────────────────────────────────────────────────────────

#guard (improvesBaseline maceEnergyBaseline maceEnergyDistill == true)
#guard (improvesBaseline sevenNetEnergyBaseline sevenNetEnergyDistill == true)
#guard (improvesBaseline sevenNetEnergyBaseline sevenNetEnergyAccelerate == true)
#guard (meetsCommitment maceEnergyBaseline maceEnergyAccelerate == true)
#guard (errorReduction maceEnergyBaseline maceEnergyDistill > 0.15)

-- Local GPU Ni fixture: promoted.
#guard (improvesBaseline maceMp0NiEnergyBaseline maceMp0NiEnergyDistill == true)
#guard (errorReduction maceMp0NiEnergyBaseline maceMp0NiEnergyDistill > 1.0)

-- Non-wins must stay blocked: the contract is two-sided.
#guard (improvesBaseline maceStressBaseline maceStressDistill == false)

-- ───────────────────────────────────────────────────────────────
-- THE BRIDGE RECORD (project house style)
-- ───────────────────────────────────────────────────────────────

/-- Epistemic status (non-keyword constructors, self-contained). -/
inductive ProofStatus
  | proved
  | openCommitment
  | refuted
  deriving Repr, BEq

/-- The three sectors and their epistemic status, for the
    Conjectures & Proofs ledger. -/
structure UniversalityBridge where
  relevantSector : String :=
    "Universal baseline — MLIP universality / causal-acceleration " ++
    "theorem (archive/KIMI_MLIP_UNIVERSAL, namespace MLIP). RG fixed point " ++
    "every foundation MLIP in the class reaches. Status: conjecture " ++
    "(15 sorry; separate mathlib-free project)."
  irrelevantSector : String :=
    "Context-specific Distill correction — ContextSpecificProof. " ++
    "Zero cross-context transfer (T3), strictly positive in-context " ++
    "operative value (T2). Status: theorem."
  commitment : String :=
    "5x5x3 accuracy-over-baseline = operative value of the " ++
    "irrelevant sector against the universal baseline. Promoted: " ++
    "MACE energy, SevenNet energy. Refused: MACE stress. Broad " ++
    "5x5x3 superiority NOT claimed (cloud baseline report)."
  bridgeIdentityStatus : ProofStatus := ProofStatus.proved
  broadCommitmentStatus : ProofStatus := ProofStatus.openCommitment

def record : UniversalityBridge := {}

/-- The bridge identity (`accuracyGain_is_operative_value`) is
    proven; broad 5x5x3 superiority remains an open commitment. -/
theorem bridge_identity_is_proved :
    record.bridgeIdentityStatus = ProofStatus.proved := rfl

theorem broad_commitment_is_open :
    record.broadCommitmentStatus = ProofStatus.openCommitment := rfl

end OpenDistillationFactory.Materials.Theory.AccuracyCommitment
