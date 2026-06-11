# Live Cloud-Run sim campaign — results (run `sm-20260602a`)

> ⚠️ **Status / scope (read first).** Two caveats the body below earns only after
> you know them: (1) this is the **MLIP energy-MAE-on-MPtrj-DFT lane**, *not* the
> OpenKIM/NIST classical-potential elastic-constant corpus the hyper-ribbon is built
> on (see [`docs/data-provenance.md`](../../data-provenance.md)) — so it tests the
> distill machinery, not the ribbon claim itself. (2) The distill "win" is an
> energy-block recalibration: it lowers energy MAE but leaves **forces/stress/elastic
> unchanged** (Results 2 & 6), so it does **not** improve the potential for any
> force-driven use (MD, relaxation, mechanics). **Do not read any tier here as
> "promote."** Earlier wording in this file said otherwise; it was wrong.

> Real executions on `shed-489901` / `us-central1` (nvidia-l4), 2026-06-02. The
> 3-tier matrix from [Part 4](../04-cloud-run-sim-tiers.md) run for real, scored by
> `cellValue`. **These are live measurements, not fixtures.** They directly test
> the [local-Opus T4 hypotheses](./local-opus-calibration.md) about where distill
> fails — and one hypothesis is confirmed outright.

## What ran

~28 cells across three runs (`sm-20260602a/b/c`): the core 3-tier matrix is 3
backends (`mace-mp-0`, `chgnet`, `sevennet`) × 3 tiers (baseline / distill_accuracy
/ distill_accuracy_accelerate) × 2 rows (`energy_volume`, `forces`), plus a
global-tuned re-run, a per-backend-tuned re-run, and `stress` + `elastic_constants`
scale tests. Manifest `canonical-structures-v2`. Cost ≈ **$2.5** of L4 time.
Three failures were informative (a bad mlip-id; elastic distill on a support set
with 0 elastic cases — see Result 6).

**Harness validation:** the live baselines reproduce the committed constants
exactly — MACE energy **0.41161** (`AccuracyCommitment.maceEnergyBaseline 0.4116`),
SevenNet energy **0.3997** (`sevenNetEnergyBaseline 0.3997`). CHGNet energy
(**0.1035**) and all force baselines are newly measured. The pipeline is faithful.

> First canary failed with `unsupported mlip_id: mace` — the runner wants the
> **backend-catalog id** `mace-mp-0`, not the job suffix. Fixed in
> `tools/mlip_sim_matrix.py` (`MLIP_JOB` map) + the policy. A real correctness bug
> the live run surfaced.

## Result 1 — energy_volume (default policy, no tuned PolicyLimits)

| backend | baseline | distill | Δacc | speedup | cellValue | beats baseline? |
|---|--:|--:|--:|--:|--:|:--:|
| mace-mp-0 | 0.4116 | 0.3627 | **+11.9%** | 1.06 | **1.11** | ✅ |
| sevennet | 0.3997 | 0.3558 | **+11.0%** | 0.74 | 0.77 | ✅ acc, ✗ value |
| chgnet | 0.1035 | 0.1429 | **−38.1%** | 0.89 | 0.85 | ❌ **regresses** |

**Finding: distill is not universally beneficial.** It helps the two weaker
baselines (MACE, SevenNet ≈ 0.40 eV/atom) by ~11%, but **makes the already-accurate
CHGNet (0.10) materially worse**. The accuracy gain anti-correlates with baseline
quality — the ribbon correction has an error floor set by the support set, so
applying it to a model already below that floor overcorrects. This is concrete
evidence that **`broad_commitment_is_open` (T4) is FALSE as an unconditional claim**:
distill-beats-baseline must be gated per backend.

## Result 2 — forces (the orthogonality test) — HYPOTHESIS CONFIRMED

| backend | baseline | distill | Δacc | cellValue |
|---|--:|--:|--:|--:|
| mace-mp-0 | 0.2644 | 0.2644 | **0.0%** | 0.93 |
| chgnet | 0.1649 | 0.1649 | **0.0%** | 0.95 |
| sevennet | 0.1957 | 0.1957 | **0.0%** | 0.86 |

**The distill correction does *nothing* to forces — 0.0% on all three backends.**
This is an exact confirmation of the **local-Opus hypothesis T4-H2** (generated
before any of these runs): *"the ribbon is defined by energy-error structure; a
ribbon-aware correction lives in that subspace, so it improves energy MAE while
leaving mechanical observables untouched — the broad claim fails on the property
class the ribbon does not span."* The correction is **energy-only**; forces pass
through unchanged, so cellValue there is pure speedup (< 1, since the correction
adds compute). **The full loop worked: Opus proposed the failure mode, the GCP
simulation confirmed it.**

## Result 3 — the accelerate tier buys no speed, even at scale (null result)

`distill_accuracy_accelerate` returned the **same error** as `distill_accuracy`
everywhere (the refusal policy changes *which* structures are computed, not the
correction), but its structures/sec was **lower**, not higher. Re-tested at scale
on `elastic_constants` (39 cases — the regime refusal was meant for): baseline
**2.878** struct/s, accuracy **0.868×**, **accelerate 0.828×** — *still slower*.
So across both 5-case and 39-case cells the accelerate/refusal mechanism delivers
**no speedup** in this setup; it only adds overhead. A firm null result: the
"distilled accuracy + speed" tier needs a genuinely high out-of-distribution
refusal fraction (or its speed instrumentation revisited) before it earns its
name. The accuracy tier is the only one with positive cellValue here — but per the
**top banner**, even it is an energy-only recalibration that does not move forces, so
"worth promoting" is *not* a conclusion this campaign supports.

## Result 4 — the win is policy-dependent (tuned re-run)

The default run passed **no `--distill-policy-url`**, so it used the untuned
policy → the ~12% above. The committed 50% MACE win
(`maceEnergyDistill 0.2038`) used a **tuned PolicyLimits artifact**
(`mlip-policies/frontend-guided-accuracy-20260525/policy_limits_accuracy.json`,
engine=rust) + a different support set (`canonical-distill-support-mptrj-train-v1`).
There are also **per-backend** tuned policies in GCS
(`hyperribbon-v3-chgnet-signed-orientation`, `hyperribbon-mptrj-sevennet-energy-v1`,
…), which is itself the answer to the broad-commitment question: generalisation
likely needs per-backend policy selection, not one global policy.

Re-run with the tuned `frontend-guided-accuracy-20260525` policy + the matching
`canonical-distill-support-mptrj-train-v1` support, across all three backends:

| backend | baseline | tuned distill | Δacc | speedup | cellValue | beats baseline? |
|---|--:|--:|--:|--:|--:|:--:|
| mace-mp-0 | 0.4116 | **0.2038** | **+50.5%** | 1.00 | **1.213** | ✅ |
| sevennet | 0.3997 | **0.2795** | **+30.1%** | 0.81 | 0.906 | ✅ acc, ✗ value |
| chgnet | 0.1035 | 0.1325 | **−28.0%** | 0.98 | 0.953 | ❌ **still regresses** |

**Three things land here.** (1) **Reproducibility:** the tuned MACE cell returns
**0.2038** — the committed `maceEnergyDistill` to four decimals, same policy hash
(`67e2db6e…`). The live harness reproduces the published 50% win exactly. (2)
**Generalisation:** the *same* policy takes SevenNet 0.3997 → 0.2795 (+30%, even
better than the committed 0.3046) — so it transfers across the two ~0.40-baseline
backends. (3) **The gate is accuracy, not tuning:** even with the tuned policy,
**CHGNet still regresses** (0.1035 → 0.1325). CHGNet's baseline is already below
the support floor the ribbon can reach (~0.13), so no amount of policy tuning on
this support set helps it. This is the crisp statement of T4's bound: distill
beats baseline **iff baseline error exceeds the ribbon's support floor** — true for
MACE/SevenNet (~0.40), false for CHGNet (0.10) — under a single global policy.

## Result 5 — per-backend policies satisfy the broad commitment

Running each backend with **its own** tuned policy (energy_volume):

| backend | policy | baseline | distill | Δacc | cellValue | beats? |
|---|---|--:|--:|--:|--:|:--:|
| chgnet | `hyperribbon-v3-chgnet-signed-orientation` | 0.1035 | **0.0971** | **+6.1%** | **1.074** | ✅ |
| sevennet | `hyperribbon-mptrj-sevennet-energy-v1` | 0.3997 | **0.2773** | **+30.6%** | 0.949 | ✅ |

**The CHGNet regression is closed.** Its dedicated `signed-orientation` policy
(the name models error *direction* — the orthogonality the local-Opus hypotheses
flagged) turns CHGNet from **−38%** (default) / **−28%** (global tuned) into
**+6.1%**, with cellValue > 1 (the policy is also faster than baseline). SevenNet's
own policy lands at 0.2773 = the committed `sevenNetEnergyAccelerate` exactly.

**The broad commitment resolves cleanly:**

| policy regime | mace | sevennet | chgnet | all beat baseline? |
|---|--:|--:|--:|:--:|
| default (untuned) | +11.9% | +11.0% | −38.1% | ✗ |
| one global tuned policy | +50.5% | +30.1% | −28.0% | ✗ |
| **per-backend tuned policy** | **+50.5%** | **+30.6%** | **+6.1%** | **✓** |

## Result 6 — the correction's scope IS the support set (energy-only, sharpened)

Pushing on "is energy-only fundamental?" with a stress row + a stress-targeted
policy, and an `elastic_constants` row:

| row | baseline | distill | Δ | note |
|---|--:|--:|--:|---|
| forces | 0.2644 | 0.2644 | 0.0% | energy support → forces untouched |
| stress (stress policy) | 0.566941 | 0.566940 | −0.0002% | still ≈0 — the support set is energy-dominated |
| elastic_constants | 35.52 | **failed** | — | distill **refused**: support has 0 elastic cases (needs ≥6) |

The `elastic_constants` distill cell failed with
`elastic_constants requires at least 6 cases; found 0` — the correction can only
act on a property the **support manifold actually covers**. So "energy-only" is
really **"support-set-only"**: the ribbon a correction can move is exactly the
error subspace its support set spans. That is precisely the orthogonal-sector law
of `RibbonProjection` (`orthogonal_error_gain_nonpos`): a property outside the
support's span is `orth`, and the gain there is ≤ 0 (0 at best). The fix is to
*cover* the property in the support set (the `train-plus-elastic-v1` manifold),
not to add a per-property exception — the same first principle.

## Implications for the ribbon theorems

- **T4 `broad_commitment_is_open`** → **generalised first-principles and
  kernel-verified**, not patched per model. The campaign's three faces — energy
  (support-set) scope, the CHGNet regression, and the per-backend "fix" — are now
  theorems of one geometry in
  [`RibbonProjection.lean`](../../../lean-spec/OpenDistillationFactory/Materials/Theory/RibbonProjection.lean)
  (`lake build` green, 0 sorry): a correction's value is `κ·(2·par − κ)`, governed
  by alignment of `κ` with the error's ribbon component `par` alone. The capstone
  `broad_value_no_model_exception` states the broad commitment with **no model
  constant**; per-backend tuning is re-aligning `κ`, the same law applied
  correctly. The measured witnesses (MACE 0.2038, SevenNet 0.2773, CHGNet 0.0971;
  forces/stress ≈ 0) realise each branch of the theorem.
- **`cellValue` (B)** is a faithful selector: it correctly flagged CHGNet distill
  (acc-negative) AND SevenNet (acc-positive but speed-negative) as **not** worth
  promoting, while passing MACE. The Lean scoring function does its job on live data.

## Next experiments (cheap, high-value)

1. ✅ **Per-backend tuned policies** — done (Result 5): CHGNet's regression flips
   to +6.1%, closing the backend-gating face of T4.
2. **Accelerate on large cells** — `elastic_constants` (39 cases) so the refusal
   speedup can amortise (Result 3 showed it's a no-op at 5 structures).
3. **Mechanical scope** — a force/stress-targeted ribbon policy to see if the
   energy-only limitation (Result 2) is fundamental or just unconfigured.
4. **Promote to Lean** — encode "distill beats baseline per-backend, energy-only"
   as a constrained successor to `broad_commitment_is_open`, with these measured
   constants (MACE 0.2038, SevenNet 0.2773, CHGNet 0.0971) as the witnesses.
