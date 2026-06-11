# Target Lean Theorems — the ribbon we are trying to improve

> Part 1 of the [glim-think M3 upgrade process](./README.md). This pins the
> **specific** set of Lean theorems that hypothesis generation should advance, so
> the M2.7→M3 comparison is scored against a fixed target, not a moving one.

The "ribbon" is the **hyper-ribbon error manifold**: the empirical finding that
prediction-error vectors for interatomic potentials collapse onto a
low-dimensional manifold (effective dimensionality ≪ nominal), the sloppy-model
universality class of Brown–Sethna / Transtrum–Sethna. The formal spine lives in
`lean-spec/OpenDistillationFactory/Materials/Theory/`.

"Improving the ribbon" has a precise meaning here: **moving one of the theorems
below from its current state toward the marked target**, with each step backed by
a falsifiable physical hypothesis (Theorist) and grounding literature
(Literaturist). The Theorist's job is to propose the *mechanism + discriminating
test*; this document is the list of formal anchors those proposals must attach to.

---

## The target set (5 anchors + 1 bridge)

| # | Theorem (`file:line`) | State | Improvement target |
|---|---|---|---|
| T1 | `hyper_ribbon_bound_3d` ([HyperRibbon.lean:17](../../lean-spec/OpenDistillationFactory/Materials/Theory/HyperRibbon.lean)) | Proven, **3-D, hard-coded decay** | Generalise decay condition + lift to n-D |
| T2 | `empirical_hyper_ribbon_holds` ([HyperRibbonEmpirical.lean:11](../../lean-spec/OpenDistillationFactory/Materials/Theory/HyperRibbonEmpirical.lean)) | Proven, **3 properties (C11/C12/C44)** | Re-verify on 4 property families (+E_coh, B0) |
| T3 | `ParameterBound` conjecture set ([ParameterBound.lean:145–201](../../lean-spec/OpenDistillationFactory/Materials/Theory/ParameterBound.lean)) | `jacobianRank_le_min` proven; **PR≤rank conjecture open** | Close the parameter→dimensionality mechanism |
| T4 | `broad_commitment_is_open` ([AccuracyCommitment.lean:217](../../lean-spec/OpenDistillationFactory/Materials/Theory/AccuracyCommitment.lean)) | **OPEN** | Promote distill-beats-baseline from per-cell to broad |
| T5 | `hyper_ribbon_survives_context_correction` ([ContextSpecificProof.lean:218](../../lean-spec/OpenDistillationFactory/Materials/Theory/ContextSpecificProof.lean)) | Proven (synthetic) | Empirically ground the survival claim |
| **B** | `cellValue` + monotonicity ([UniversalityBridge.lean:133–165](../../lean-spec/OpenDistillationFactory/Materials/Theory/UniversalityBridge.lean)) | Proven | **Scoring bridge** ribbon → Cloud-Run sim tiers (Part 4) |

---

### T1 — `hyper_ribbon_bound_3d` (the keystone)

```lean
def PR (l1 l2 l3 : ℝ) : ℝ := (l1 + l2 + l3)^2 / (l1^2 + l2^2 + l3^2)

theorem hyper_ribbon_bound_3d
  (l1 l2 l3 : ℝ) (hpos1 : 0 < l1) (hpos2 : 0 < l2) (hpos3 : 0 < l3)
  (h_decay2 : l2 ≤ 0.25 * l1) (h_decay3 : l3 ≤ 0.0625 * l1) :
  (l1 + l2 + l3)^2 < 2 * (l1^2 + l2^2 + l3^2)
```

**Why it is the ribbon.** It formalises *why* a sloppy spectrum looks like a
1-D/2-D ribbon: under rapid eigenvalue decay the participation ratio (PR, the
effective dimensionality) is bounded strictly below 2.

**Current limitation.** The decay is hard-coded to the geometric ratio q = 1/2
(`l2 ≤ 0.25·l1`, `l3 ≤ 0.0625·l1`, i.e. q² and q⁴) and the result is fixed at
3 dimensions.

**Improvement target.** Generalise to (a) an arbitrary decay rate
`lᵢ ≤ q^(i-1)·l1` with `q ≤ 1/2`, proving `PR < 2` for all such spectra, and
(b) n dimensions, proving a closed-form bound `PR < B(q, n)`. This is the
single most valuable formal step: it turns one worked example into the theorem.

**What a good hypothesis looks like (Theorist target).** "The decay ratio q is
set by [physical mechanism: angular/many-body terms, Cauchy-relation coupling,
…]; therefore q ≤ 1/2 holds whenever [condition], and the ribbon dimensionality
is `B(q,3)`." Must come with a discriminating measurement.

---

### T2 — `empirical_hyper_ribbon_holds`

```lean
def maxEmpiricalFractionalDimensionality : Float := 0.3981388474988096
theorem empirical_hyper_ribbon_holds : maxEmpiricalFractionalDimensionality < 0.5 := by
  native_decide
```

**Why it matters.** This is T1's empirical counterpart — the real corpus (559
potentials × 15 metals) lands at fractional dimensionality 0.398 < 0.5, so the
ribbon is not a synthetic artefact.

**Current limitation.** The constant is computed from **3 elastic constants
only** (C11/C12/C44). Both open conjectures' "Next" sections
([universality](../../docs/conjectures/hyper-ribbon-universality.md),
[MLIP transfer](../../docs/conjectures/hyper-ribbon-mlip-transfer.md)) call for a
**wider basis**.

**Improvement target.** Recompute `maxEmpiricalFractionalDimensionality` over a
**4-family** manifold (add cohesive energy E_coh and bulk modulus B0 from the
Phase-D compute lane) and re-verify `< 0.5`. If it survives, the ribbon is a
property of the potential, not of the elastic sub-basis.

---

### T3 — `ParameterBound` conjecture (the mechanism)

```lean
theorem jacobianRank_le_min (P N : Nat) (f : PredictionMap P N) :
  jacobianRank P N f ≤ min P N                      -- proven
def eamFccElasticConjecture : ParameterBoundConjecture := { … }  -- PR ≤ rank: open
def observedEamFccPR : Float := 1.259726
```

**Why it matters.** It supplies the causal *why*: the effective dimensionality is
bounded by the **Jacobian rank** of the prediction map, which is bounded by the
number of independent potential parameters. The ribbon is then a consequence of
sloppy parameter→observable coupling, not a coincidence.

**Current limitation.** `jacobianRank_le_min` is proven, but the bridge
"PR ≤ jacobianRank" for real EAM families is a **conjecture** with one observed
data point (`observedEamFccPR = 1.26`).

**Improvement target.** Close the conjecture: prove (or formally bound) that the
participation ratio is controlled by the Jacobian rank for the EAM-FCC elastic
family, connecting `ParameterBound` → `HyperRibbon`. Highest-leverage *mechanistic*
result.

---

### T4 — `broad_commitment_is_open` (the open commitment)

```lean
theorem mace_energy_beats_baseline   : improvesBaseline maceEnergyBaseline maceEnergyDistill = true := …
theorem sevennet_accelerate_beats_baseline : … = true := …
theorem broad_commitment_is_open : …            -- OPEN
-- measured: maceEnergyBaseline 0.4116 → distill 0.2038 ; sevenNet 0.3997 → 0.3046 → accelerate 0.2773
```

**Why it matters.** This is where the ribbon **pays out**: a ribbon-aware distill
correction that beats the raw MLIP baseline. Per-cell wins are proven
(`mace_energy_beats_baseline`, `sevennet_accelerate_beats_baseline`); the **broad**
claim — distill beats baseline across materials — is explicitly open.

**Improvement target.** Accumulate held-out evidence (Part 4 Cloud-Run sim tiers)
until the broad commitment can be promoted from open to proven. The measured
constants here are exactly the baseline/distill/accelerate numbers the sim matrix
re-measures.

---

### T5 — `hyper_ribbon_survives_context_correction`

```lean
theorem correction_decoupled_from_spectrum (l1 l2 l3 κ : ℝ) : substrateRelevantPR l1 l2 l3 κ = PR l1 l2 l3
theorem hyper_ribbon_survives_context_correction … -- ribbon intact after context correction
```

**Why it matters.** Guards against a failure mode: that applying a
context-specific correction (the distill move) silently destroys the ribbon
geometry. The theorem shows the correction is **decoupled from the spectrum**, so
the ribbon survives.

**Improvement target.** It is proven on synthetic spectra; ground it on the real
corpus (same data lift as T2) so "survives correction" is empirical, not assumed.

---

### B — `cellValue`: the bridge to the simulation tiers

```lean
def cellValue (speedup accuracyGain : ℝ) : ℝ := speedup * (1 + accuracyGain)
theorem cellValue_baseline       : cellValue 1 0 = 1
theorem cellValue_mono_speed     (… hS : S₁ ≤ S₂) : cellValue S₁ G ≤ cellValue S₂ G
theorem cellValue_mono_accuracy  (… hG : G₁ ≤ G₂) : cellValue S G₁ ≤ cellValue S G₂
theorem complementary_improvement (…) : 1 ≤ cellValue S G          -- speed AND accuracy ⇒ value ≥ baseline
```

**Why it is here.** `cellValue(speedup, accuracyGain)` is the **formal scoring
function** for a distill cell: monotone in both speed and accuracy, equal to 1 at
baseline. The three Cloud-Run simulation tiers in
[Part 4](./04-cloud-run-sim-tiers.md) map onto it exactly:

| Sim tier | `speedup` | `accuracyGain` | `cellValue` |
|---|---|---|---|
| baseline | 1 | 0 | 1 (by `cellValue_baseline`) |
| distill_accuracy | 1 | g₁ > 0 | 1 + g₁ |
| distill_accuracy_accelerate | s > 1 | g₂ | s·(1 + g₂) |

So a Theorist hypothesis that improves accuracyGain (T2/T3/T4) or the
accelerate speedup is **scored by the same function the simulator reports** — no
translation layer between "did the model propose something good" and "did the
simulation confirm value."

---

## The generalization (built 2026-06-02) — `RibbonProjection`

The live campaign ([results](./runs/live-campaign-results.md)) could have been
"formalized" as per-backend cases (MACE wins, CHGNet regresses, …). That is
exactly the model-exception handling a theorem must **not** encode. Instead, the
new module
[`RibbonProjection.lean`](../../lean-spec/OpenDistillationFactory/Materials/Theory/RibbonProjection.lean)
proves all three campaign findings as corollaries of **one model-independent
geometry**: the error splits into a ribbon-parallel part `par` and an orthogonal
part `orth`; a scalar correction `κ` acts only on `par`; and

```
ribbonGain par orth κ = κ · (2·par − κ)        -- the orthogonal sector cancels
```

| theorem | first-principles statement | which campaign fact it explains |
|---|---|---|
| `ribbonGain_independent_of_orthogonal` | gain doesn't depend on `orth` or model id | per-backend differences are alignment, not exception |
| `orthogonal_error_gain_nonpos` | on a purely orthogonal error, best gain is 0 | forces row Δ = 0.0% (energy-only) |
| `ribbonGain_strictly_valuable` | `0<κ<2·par ⇒ gain>0` | MACE / SevenNet wins |
| `ribbonGain_neg_of_antialigned` | `κ<0 ⇒ gain<0` (same parabola) | CHGNet regression under a generic policy |
| `ribbonGain_optimal` | `κ=par ⇒ gain=par²` (closes the ribbon) | the achievable ceiling |
| `broad_value_no_model_exception` | two backends, same `par`, aligned `κ` ⇒ equal positive gain | **the broad commitment, no per-model axiom** |

The capstone `broad_value_no_model_exception` is the generalized successor to T4:
"distill beats baseline" is a property of the ribbon geometry `(par, κ)` **alone**;
per-backend policy tuning is *re-aligning* `κ` to each backend's `par`, the same law
applied correctly — never an exception. Every proof is `ring`/`nlinarith` over
arbitrary reals (no MLIP, no model constant); the algebraic identities are
independently verified symbolically (sympy, all green) **and the module is
kernel-verified** — `lake build …RibbonProjection` is green with **0 sorry**.
This is the ribbon, generalized from a worked example (T1) + a per-cell win (T4)
into a single first-principles geometric law.

## How this set drives the rest of the process

- **Part 2 (research strategy)** turns each anchor into literature queries
  (e.g. T1 → "sloppy model participation ratio eigenvalue decay bound").
- **Part 3 (eval protocol)** feeds these anchors to the Theorist as the
  `glim-ribbon-theorems` dataset, generates hypotheses under **M2.7 then M3**, and
  scores them with the **local Opus agent** on the rubric in
  [03-eval-protocol.md](./03-eval-protocol.md).
- **Part 4 (sim tiers)** runs the three Cloud-Run variants and scores them with
  `cellValue`, closing the loop on T4.

A hypothesis is "ribbon-improving" iff it names one of T1–T5, proposes a
mechanism, and gives a discriminating test whose outcome would move that
theorem's state. That criterion is the backbone of the evaluation rubric.
