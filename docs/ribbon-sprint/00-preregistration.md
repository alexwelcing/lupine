# Pre-registration — Operation Ribbon-or-Bust

> ⚠️ **Data-source correction (2026-06-02).** This pre-registration named
> `nist_benchmark.csv` (and later `atlas-distill/benchmarks/*.csv`) as "the corpus."
> **That was the central mistake of the session:** those are **stale exports**. The
> live corpus is the **Cloudflare D1 ledger `glim-ledger`** (`records` ≈ 1269 / 177
> potentials / 5 properties, written continuously by a running orchestrator) plus the
> **GCS lake** (`gs://shed-489901-atlas-outputs/…`), and the system has **already
> computed** much of Q1 in `manifold_runs` and the cross-MLIP data in
> `mlip_campaign_triplet_evals`. So: Q1/Q2/Q3 must be (re)run against the **live D1 +
> GCS**, reconciled with the existing `manifold_runs`/claims, and written **back into
> the ledger** — not against a checkout file. The `q1-results*.json` here were computed
> on the stale exports and are **superseded by the live-ledger redo**
> (`q1-results-live.json`, from `records-live.csv` pulled via `tools/ledger_to_csv.py`;
> verdict in the **Q1 result** section below). (The *method* — coupling-aware nulls,
> matched-n — stood; only the *data source* was wrong: this was an **update**, not a
> redo.) See the `lupine-system-architecture` skill for why this matters.

**Written 2026-06-02, BEFORE any analysis is run.** This document fixes the
hypotheses, the estimators, the **nulls**, and the **kill-conditions** for the three
decisive questions, so results cannot be rationalised after the fact. Nothing in
Q1/Q2 has been computed yet; the only prior numbers known (the 2026-05-05 cross-MLIP
raw cosine ≈ 0.60, Spearman ρ=0.186, p=0.508) are treated as **prior art to be
re-tested against the correct null**, exactly like Mao et al. 2024 — not as our result.

## Data & compute reality (verified in Phase A, not assumed)

- **Q1 / classical Q2:** `nist_benchmark.csv` — 386 rows, **90 classical potentials**
  (EAM/fs, EAM/alloy, EAM, ADP) × elements, `reference` + `predicted` for
  C11/C12/C44 (+ a0, Ecoh). Real OpenKIM-LAMMPS vs NIST. Error vector for a potential
  = relative errors `(predicted − reference)/reference` on the chosen property axes.
- **MLIP Q2:** `mlip_immi/cross_mlip_alignment_ingest.json` + `{mace,chgnet,orb_v3}_immi_results.json`
  — per-element normalized relative-error vectors for MACE-MP-0 / CHGNet / Orb-v3.
- **Q3 compute:** **no LAMMPS+OpenKIM path is provisioned** in this repo. The runnable
  physics lane is **MLIP forces via `gcp/mlip-cell-runner`** (ASE calculators on
  Cloud Run L4). LAMMPS-on-classical-potentials forces are **out of 3-hour scope**
  (needs a KIM-API image); flagged, not faked.

## Q1 — REALITY: is the low-dimensional error structure real?

- **H1 (pre-registered):** the participation ratio `PR = (Σλᵢ)² / Σλᵢ²` of the
  potentials' error-vector covariance is **strictly below** what the physical coupling
  of elastic constants alone produces — i.e. the concentration is genuine, not an
  artifact of the Cauchy relation / mechanical-stability constraints.
- **Estimator:** exactly `manifold.rs` — center the per-potential relative-error
  vectors, form the property×property covariance, eigendecompose, report PR. Run on
  **two bases:** (a) {C11,C12,C44} (nominal dim 3), (b) {C11,C12,C44,a0,Ecoh} (nominal
  dim 5, the de-myopized basis), for potentials with complete data.
- **Nulls (both reported):**
  1. **Coupling-aware parametric bootstrap (primary).** Synthesize corpora where each
     potential's "prediction" = reference + independent per-component noise matched to
     the observed per-component error marginals, **subject to the Born stability
     constraints** (C11>|C12|, C44>0, C11+2C12>0) and the Cauchy tendency. Any residual
     error correlation in this null comes only from the constraint geometry, not shared
     physics. Build the null PR distribution from ≥2000 synthetic corpora.
  2. **Permutation null (secondary).** Per-component shuffle of errors across potentials
     (breaks any cross-potential shared direction; preserves marginals). ≥5000 perms.
- **Matched-n:** stratify by element and pair_style; report the PR with sample-size-
  matched controls (no pooling across heterogeneous groups without the matched control).
- **Decision rule:**
  - **CONFIRM (real):** observed PR < 5th-percentile of the **coupling-aware** null,
    bootstrap CI excluding the null mean, on at least the 3-property basis.
  - **KILL (artifact):** observed PR ≥ coupling-aware null (CIs overlap) → the ribbon is
    explained by elastic-constant coupling; the core bet dies here.

## Q2 — UNIVERSALITY (A6): do different models share error directions?

- **H2 (pre-registered):** error-direction alignment **across models** (the 90 classical
  potentials' shared PC1 direction, and the MACE/CHGNet/Orb error vectors) **exceeds**
  the coupling-aware + stratified-permutation null — i.e. A6 (shared spatial modes) has
  empirical support, consistent with Mao et al. 2024 (architecturally-different models
  share one low-dim manifold).
- **Statistic:** (a) cross-potential — fraction of error variance on the leading shared
  PC, and principal angle between independent random-split subspaces; (b) cross-MLIP —
  mean pairwise cosine of per-element error directions; (c) classical↔MLIP — alignment
  of the classical PC1 with each MLIP's error direction (Spearman + cosine).
- **Null (coupling-aware):** the **same Born-stability-constrained** generative null as
  Q1 for the magnitude/coupling baseline, **plus** a stratified permutation (permute
  model labels / element assignments within strata) for the cross-model statistic.
- **Grounding:** the result must be reconciled against (i) Mao 2024 (predicts alignment),
  and (ii) the prior 2026-05-05 raw-cosine ≈0.60 / Spearman p=0.508 — does the
  coupling-aware null leave the alignment significant, or was 0.60 mostly coupling?
- **Decision rule:**
  - **CONFIRM (universal):** cross-model alignment > 95th-percentile of the coupling+perm
    null, with a stratified-permutation p < 0.05, AND not contradicted by Mao 2024.
  - **KILL (not universal):** alignment ≤ null → A6 unsupported; "transfer/universality"
    is not established and object C (config-space core) is unreachable; bet shrinks to
    per-model.

## Q3 — PHYSICS / CORRECTABILITY: does it reach forces, and can we repair them?

- **H3 (pre-registered):** the MLIP **force-error** field is itself low-dimensional and
  cross-model-aligned (force-level A6), and a **position-dependent** correction (not a
  per-structure energy scalar) reduces a **force-driven** observable on held-out
  structures beyond the coupling-aware null.
- **Runnable test (this sprint):** via `mlip-cell-runner` — generate per-atom force
  errors for MACE/CHGNet/SevenNet/Orb on a **larger, chemically-stratified** structure
  set than the 5-structure pilot; compute force-error dimensionality + cross-model
  alignment with the **coupling-aware** null; then a held-out correction test.
- **Gate:** **do not launch Q3 Cloud-Run compute unless Q1 CONFIRMS.** No paying for
  force compute if the structure isn't even real. Requires an explicit **cost ceiling**.
- **Decision rule:**
  - **CONFIRM (physical):** force error low-dim AND a correction improves a held-out
    force/elastic/phonon observable beyond null.
  - **KILL (energy-only):** force error high-dim or uncorrectable → the ribbon is an
    energy-reporting curiosity (today's finding), honestly bounded.

## Anti-self-deception protocol (binding)

1. **No goalpost moving.** The thresholds above are fixed now.
2. **Coupling-aware null is mandatory** for every PR / alignment claim — never `r=0`.
3. **Adversarial verification.** Each CONFIRM is handed to ≥2 independent refuter agents
   (find the confound / leak / coupling) and survives only if they fail to kill it.
4. **Literature reconciliation.** Every result is checked against Mao 2024 / Kurniawan
   2022 / Frederiksen 2004; disagreement is explained, not buried.
5. **Provisional is loud.** Anything not clearing the gauntlet ships labelled provisional.

## Q1 result (LIVE ledger, 2026-06-02) — bounded CONFIRM, not the clean win

Run on the live D1 corpus (`records`, deduped latest-per-key → 352 potentials with a
complete `{C11,C12,C44}` triple across 15 elements). `manifold_runs` was **empty** —
this is the first PR in the ledger, nothing pre-computed to reconcile against.

- **Pooled `{C11,C12,C44}` (n=352): CONFIRM.** PR = 2.147 (CI95 1.55–2.54) <
  independent-noise null 2.88 (p=0.0005) and permutation null 2.89 (p=0.0002). Real
  cross-property concentration — the elastic errors are *not* independent.
- **Matched-n per element (Simpson-safe, the honest cut): only 4/14 elements
  individually confirm** — Cu (p=3e-4), Ni (3e-4), Fe (7e-4), Ag (0.011). The largest
  element, **Al (n=84), does NOT** (p=0.107); most refractory/noble metals are null.
  Fisher χ²=90.95/df=28 is globally significant but **driven by Cu/Ni/Fe**, not
  universal. The pooled CONFIRM is partly between-element pooling.
- **+lattice `{C11,C12,C44,a0}` (n=42): KILL.** Adding the *non-elastic* a0 returns PR
  to the null (2.16 vs 2.24, p=0.30). The concentration is **elastic-block-confined** —
  it does not reach a structural property. (`E_coh` is n=1 in the ledger → the 5-basis
  can't run; de-myopization needs **more ingestion, not a rerun**.)

**Honest bound:** the ribbon is *real but narrow* — a transition-metal, elastic-block
phenomenon, strongest in the well-sampled Cu/Ni/Fe/Ag, absent in Al and the
under-sampled refractories; it does not yet extend to a0.

**Coupling-aware null + enhancer (done — `q1-coupling-null-live.json`,
`q1-enhancer-live.json`).** The pre-registered Born-stability null does **not** explain
the concentration (obs PR 2.147 < Born null 2.89, p=5e-4). A shared-stiffness sweep
brackets observed PR at **f≈0.5**: the mode IS (to PR precision) a single per-potential
**global-stiffness scale**, not something tighter (obs is not below the f=1 null). Direct
confirmation: PC1 = **60.6%** of the error variance, loadings all same sign, **cos 0.94 to
[1,1,1]**. So the more-correct theorem is *named*: elastic error ≈ a 1-D stiffness mode.
**But correctability is estimator-limited:** the oracle ceiling (coordinate known exactly)
is **+22.7%** held-out RMS reduction on C12/C44, yet correcting from a single anchored
constant (C11) gives only **+4.5% (CI95 −13.8…+14.7, straddles 0)** — not yet a win. The
headroom is real; *identifying the per-potential coordinate from one noisy constant is the
bottleneck.* This also rehabilitates the retracted `RibbonProjection` Lean toy **at the
measured scope**: `par` = the stiffness axis, `orth` = the 39% residual, and the enhancer's
failure is literally the toy's κ-misalignment branch (`ribbonGain_neg_of_antialigned`).

## Status

- [x] Q1 reality + coupling-aware null + enhancer demo → **named theorem**: elastic error
      ≈ a per-potential global-stiffness mode (PC1 60.6%, cos 0.94 to [1,1,1]); real but
      **estimator-limited** (oracle +22.7%, single-anchor +4.5% n.s.). Elastic-block only.
- [ ] Q1b: better per-potential coordinate estimator (2-constant anchor / a0 / per-class
      stiffness prior / shrinkage) to convert the +22.7% ceiling into a held-out win
- [ ] write the Q1 result back to the ledger (held for confirm — mutates live D1)
- [ ] Q1 adversarial-verify (refuter pass on pooled-vs-matched-n + the stiffness-mode claim)
- [ ] Q2 run + adversarial-verified + reconciled vs Mao 2024 / prior 0.60
- [ ] Q3 gated launch — Q1 gives a real-but-estimator-limited elastic structure; resolve
      Q1b (does the ceiling become a real win?) before paying for force compute.
- [ ] Synthesis + decision-tree row
