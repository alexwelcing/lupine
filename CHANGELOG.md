# Changelog & Progress

A working log of what changed in the Lupine research program — not just *what* we did, but
**why**, what the **results** were, and the **suggested next steps** to extract more value.
This is meant to be read: it is the narrative spine of the corpus, and it is published on
[library.lupine.science](https://library.lupine.science).

Format for every entry:

- **Why** — the problem or question that motivated the change.
- **What** — what we actually did.
- **Results** — what we observed, including null and negative results.
- **Next** — the highest-value follow-up, so the log compounds instead of just accumulating.

Newest first. Dates are absolute.

---

## 2026-06-19 - LUPI 0.3 Studio, molecule trust, and public-surface split prep

- **Why.** The checkout had a full LUPI release pass, public-surface split plan,
  Library export bundle, and molecule reliability work sitting locally. For a
  major release, that work needed to become one reviewable checkpoint instead of
  untracked/in-progress workspace state.
- **What.**
  - Consolidated the LUPI viewer as `atlas-view@0.3.0`: mobile-first controls,
    larger touch targets, TanStack Query saved-view caching, improved social
    share metadata, picnic/cinematic sharing, first-class Lupi Studio 360 world
    backgrounds, background grading controls, and optimized environment media.
  - Kept MCP commands text/agent driven for this release; experimental voice
    control is not part of the LUPI 0.3 surface.
  - Added source-backed gallery nomenclature for PubChem-derived molecules,
    including PubChem CIDs, formulas, systematic names, aliases, and a local
    reliability/backup audit tool.
  - Added the public-surface repo-split map and extraction packets for
    `lupine.science`, `lupi.live`, `library.lupine.site`, and the remaining
    science/control-plane repo.
  - Added `scripts/export_library_content.mjs` and generated the first
    `exports/library-content/latest` bundle for the Library extraction path.
  - Recorded `exports/` in the root ownership ledger so generated public
    artifacts have an explicit owner.
- **Results.**
  - `pnpm audit:nomenclature`: 55 gallery entries, 24 nomenclature records, 0
    errors, 8 non-blocking provenance warnings for older procedural/synthetic
    examples.
  - `pnpm --filter @atlas/ui test -- src/backgroundPresets.test.ts
    src/store.test.ts src/gallery-data.test.ts`: 44 tests passed.
  - `pnpm --filter @atlas/ui build`: passed.
  - `pnpm --filter @atlas/web build`: passed and generated 8 static SEO routes.
  - `pnpm verify:gallery --no-screenshot`: 20/20 checks passed, including real
    dataset load.
  - `pnpm verify:controls --no-screenshot`: desktop controls smoke passed.
  - `pnpm verify:controls:mobile --no-screenshot`: mobile controls smoke
    passed.
  - `VERIFY_URL=http://127.0.0.1:5174/#/mcp pnpm verify:mcp-bridge`: passed
    against the built web output served locally.
  - `npm --prefix library-site run build`: built 55 articles.
- **Next.**
  - Open the release PR and keep local/CI/deploy/live truth separate.
  - Resolve the eight older gallery provenance warnings before treating the
    entire curated gallery as source-backed.
  - Promote the public-surface split only after each extracted repo has its own
    CI, deploy, secrets, and live health proof.

## 2026-06-16 — Academic review of the Projection Law / IMMI suite, first fix pass

- **Why.** An independent adversarial review flagged six MUST-FIX gates before any journal submission: the affine/smooth/finite-sample theorems were being oversold as deriving global claims; the MLIP factorial result needed permutation-floor nuance; theorem counts and PDF URLs were inconsistent across surfaces; and ORCID/DOI placeholders were still open.
- **What.**
  - Confirmed the formal core is unchanged and green: `lean-spec lake build` (2891 jobs, 77 build-locked theorems in `Vision.lean`, 0 `sorry`, 0 new axioms).
  - Tightened the PRX and IMMI manuscripts: qualified the affine/gauge and smooth-local/global bridges, downplayed the finite-sample PR sample-complexity claim, and added permutation-floor wording to the abstract, Table 1, and the IMMI abstract.
  - Rebuilt both PDFs (`paper2/projection-law.pdf`, `paper2/immi/projection-law-immi.pdf`) and submission bundles.
  - Published the academic review at `docs/reviews/academic-review-projection-law-2026-06-16.md` and surfaced it as a first-class article on `library.lupine.science` via `library-site/scripts/catalog.js`.
  - Added versioned PDF assets under `library-site/src/assets/papers/` and updated `working-papers.html` to serve them from the site instead of a stale GCS URL.
  - Prepared submission collateral: `paper2/cover-letter.md`, `replication/error-geometry/.zenodo.json`, and updated `ZENODO_DEPOSIT.md`.
- **Results.**
  - `paper2/python quality_gate.py --lean` passes.
  - `git diff --check` clean.
  - Library site builds 54 articles; the review renders at `/#/read/academic-review-projection-law`.
- **Next.**
  - Fill the author ORCID and mint the Zenodo DOI (user action).
  - Run the adversarial multi-agent review pass described in `TARGETING.md` and incorporate any findings.
  - Update the external `lupine.science` marketing page (source not in this repo) to point to the new versioned PDF.

## 2026-06-14 - LUPI controls palette rollout

- **Why.** The viewer's advanced visual controls had outgrown the fixed side drawer. Users needed
  a more deliberate inspection surface: one place to tune look, surface, world, and export settings
  without covering the molecule or forcing repeated drawer navigation.
- **What.**
  - Replaced the desktop controls drawer with a dockable, resizable, collapsible tool palette.
  - Consolidated Look, Surface, World, and Export into one tabbed Controls surface.
  - Kept the mobile bottom sheet path intact while making desktop panel chrome consistent.
  - Added a portless browser verification harness, `pnpm verify:controls`, that starts Vite on a
    free local port, loads a real C60 molecule, checks all four control tabs, validates there is
    only one close affordance per embedded panel, and exercises resize plus collapse/expand.
- **Results.**
  - Local production build is green: `pnpm --filter @atlas/web build`.
  - Portless controls smoke is green on random local ports: `pnpm verify:controls -- --no-screenshot`.
  - The rollout no longer depends on a manually running fixed-port dev server for verification.
- **Next.**
  - Ship through the normal push-to-main Cloud Run viewer deploy and verify `https://lupi.live`
    against the same controls harness via `VERIFY_URL`.
  - Add screenshot diffing once the visual-regression lane graduates from artifact capture to
    assertions.

## 2026-06-12 — Repo consolidation and onboarding sprint

- **Why.** The repo had grown three overlapping Distill roots (`distiller/`, `lupine-distill/`, `atlas-distill/`) and a maze of docs that made it hard for new developers and research scientists to find the right entry point. The one-root-one-owner rule was being violated, and stale paths were still referenced by active code.
- **What.**
  - Consolidated Distill by runtime/language: `atlas-distill/` is the single Rust engine, `python/` is the single home for active Python packages, and retired material moved to `archive/` (`distiller-kb/`, `lupine-distill-rust/`, `lupine-dspy/`, `tools-retired/`).
  - Updated every active import path and sys.path hack from the old roots to `python/`.
  - Added onboarding docs: `docs/ONBOARDING.md`, `docs/ARCHITECTURE.md`, `docs/GLOSSARY.md`, `docs/FAQ.md`, `CONTRIBUTING.md`, `docs/HANDBOOK.md`, and per-root READMEs for `python/`, `gcp/`, `data/`, `atlas/`, `mlip_immi/`, `lean-spec/`, `glim-think/`, `library-site/`, `paper/`, and `tools/`.
  - Added `scripts/bootstrap.ps1` / `bootstrap.sh`, extended the `justfile` with `verify`, `bootstrap`, `bootstrap-heavy`, and `docs-serve` recipes, and created GitHub issue/PR templates.
  - Added `.github/workflows/verify.yml` (Python unit tests, Rust check, tools smoke, diff hygiene) and hardened `python/pyproject.toml` with realistic dependency extras matching the MLIP backend images.
  - Audited `docs/` for stale/provisional files and added honest banners with redirects to current sources.
- **Results.**
  - `just verify` passes locally: Python unit tests (92 passed), Rust check, tools smoke tests (18 passed, 4 skipped), and `git diff --check` clean.
  - `cargo test --manifest-path atlas-distill/Cargo.toml --bin atlas-distill` passes (100 tests).
  - No hardcoded secrets found in active code; env vars are used for all tokens/keys.
- **Next.**
  - Continue migrating any remaining active `lupine-distill` / `distiller` references in historical docs.
  - Add a Lean-proof CI job (cached) once the `lean-spec` first-build cost is acceptable.
  - Consider moving reusable `mlip_immi/` logic into `python/lupine_distill/` with tests.

## 2026-06-02 — CORRECTION: retracting / bounding the day's ribbon overclaims

- **Why.** A working session produced several confident claims that do **not** hold up.
  Logging the retraction here because self-correction is the method, and the entries below
  (and a now-removed framing) overstated results — mostly because the work was done against a
  **stale CSV export and the MPtrj MLIP-energy lane, disconnected from the live D1 ledger
  corpus** the program actually runs on (OpenKIM/NIST elastic constants). Orientation to the
  live system is now captured in the `lupine-system-architecture` skill + `docs/science/objects.md`.
- **Retracted / bounded:**
  1. *"Generalised the ribbon, first-principles" (`RibbonProjection.lean`)* — **withdrawn.** That
     module is a **generic scalar operative-value lemma** (the same parabola already in
     `ContextSpecificProof`), **not** a formalization of the hyper-ribbon (model manifold), the
     participation-ratio measure, or the keystone configuration-space core. Its docstring is
     corrected to say so; it does not "generalise the ribbon."
  2. *"`broad_commitment_is_open` is TRUE under per-backend policy selection"* — **bounded to
     near-meaningless.** That campaign measured **energy-MAE on MPtrj DFT rows**, a different lane
     from the OpenKIM/NIST elastic-constant corpus the ribbon is built on; the distill "win" is an
     **energy-block recalibration that leaves forces/stress/elastic unchanged**, so it does not
     improve the potential for any force-driven use. Not a model improvement. See the banner on
     `docs/glim-m3-upgrade/runs/live-campaign-results.md`.
  3. *"A6 has real but conditional support"* — **demoted to untrusted.** The A6 test was a
     5-structure MLIP-force pilot on the wrong lane **without the mandatory coupling-aware null**
     (Cauchy relation / mechanical stability — Jackson–Somers / Archie). Suggestive at most; must
     be redone on the live corpus with the coupling-aware null before it is believed.
  4. *"category error, verified in code"* — **overstated** (corrected in the banner atop
     `docs/science/keystone-reconciliation.md`): the repo's PR-of-error-covariance is the standard
     sloppy-model effective-dimensionality measure, not an elementary mistake.
- **What still stands:** the MiniMax M2.7→M3 **model-axis** engineering (typechecked, tested); the
  **documentation architecture** (`docs/navigation.md`, `docs/science/objects.md`, ADR-0002); and
  the reusable analysis **tools** (they were just pointed at the wrong data).
- **Next.** Redo Q1/Q2/Q3 on the **live D1 ledger + GCS lake** (not exports), per-element /
  matched-n, with coupling-aware nulls, writing results back into the ledger.

## 2026-06-02 — Back to the keystone paper: the category error, and the first test of A6

- **Why.** The "promote per-backend distill" framing was disinterested box-ticking — it ignored
  that forces never moved. Went back and actually read *A Conditional Universality Theorem for
  Error Geometry in MLIPs* (repo-root PDF) to ground the program in its own theory.
- **What.** A reconciliation of the repo's ribbon claims against the paper
  (`docs/science/keystone-reconciliation.md`), plus the **first direct empirical test of the paper's
  load-bearing assumption A6** ("common-spatial-mode separability") — `tools/a6_alignment_test.py`,
  run on the force-error field (3 MLIPs × 5 shared structures = 107 atoms, 5000 stratified
  permutations), with three statistics vs a within-structure permutation null.
- **Results.** Two findings. (1) **Category error, verified in code.** The repo computes the
  participation ratio of the error-*vector* covariance in *observable* space
  (`manifold.rs:43-112`, 3×3 over C11/C12/C44) and calls it a low-dimensional "error manifold." The
  paper's theorem is about a *configuration-space* core `H ⊂ ℝᵐ`; its error *boundary* is dimension
  `m−1`, **not** low; and a measure-theoretic concentration must not be called a manifold. The
  bridge between the two (A6) was **assumed, never stated** — including in my own
  `RibbonProjection.lean`, which formalizes the wrong (toy) object. (2) **A6 has real but
  conditional support.** All three MLIPs concentrate force error on the **same atoms**
  (`mag_corr` 0.70–0.86, p≤0.0002, well above the stratified null ~0.34) and err in correlated
  directions (`atom_cos` 0.2–0.3, sig) — first force-level evidence for shared structure. But it's
  heterogeneous: **CHGNet is a partial outlier** (whole-field alignment with MACE n.s., p=0.09),
  independently echoing that CHGNet is the backend distill regressed. So it's the paper's
  *perturbative/conditional* regime, not the unrestricted ribbon claim.
- **Next.** Scale the A6 test to MatPES/MPtrj/OMat24 with a blocked bootstrap over materials (the
  paper's protocol); estimate per-model perturbation `δ_M` (CHGNet largest); and formalize the
  paper's actual `exact_tubular_universality` skeleton (reach + 1-D monotonicity) instead of the
  `RibbonProjection` toy.

## 2026-06-02 — Live 3-tier sim campaign: distill is energy-only + per-backend-policy-gated

- **Why.** The M3 upgrade work configured a 3-tier Cloud-Run sim matrix (baseline /
  distill-accuracy / distill-accuracy+speed) but had not *run* it. Run it for real on
  GPUs to test the local-Opus T4 hypotheses about where the ribbon distill correction
  fails, and to put hard numbers on `broad_commitment_is_open`.
- **What.** 23 cells on `shed-489901` L4 jobs (`mlip-cell-{mace,chgnet,sevennet}`),
  3 tiers × 3 backends × {energy_volume, forces}, plus global-tuned and per-backend-tuned
  re-runs. Scored by `tools/mlip_sim_matrix.py` (Lean `cellValue`). Surfaced + fixed a real
  bug (runner wants catalog id `mace-mp-0`, not `mace`). Cost ≈ $2. Full table:
  `docs/glim-m3-upgrade/runs/live-campaign-results.md`.
- **Results.** (1) **Baselines reproduce exactly** (MACE 0.41161, SevenNet 0.3997) and the
  tuned MACE cell returns **0.2038** — the committed `maceEnergyDistill` to 4 decimals, same
  policy hash. The harness is faithful. (2) **Distill is energy-only:** on `forces` the
  correction changes the error by **0.0%** for all three backends — an exact confirmation of
  the pre-registered local-Opus hypothesis **T4-H2** (energy/mechanical orthogonality).
  (3) **Distill is policy-gated, not automatic:** a generic policy regresses the
  already-accurate CHGNet (0.1035 → 0.1429, −38%); the global tuned policy still regresses it
  (−28%); but CHGNet's **own** `signed-orientation` policy flips it to **+6.1%** (0.0971).
  Net: distill beats baseline on all three backends **iff each uses its own policy** — TRUE
  under per-backend selection, FALSE under any single global policy.
- **Next / done same session.** **Generalised the ribbon, first-principles** —
  `lean-spec/.../Theory/RibbonProjection.lean`. Rather than encode the campaign as per-backend
  cases (the exception handling we explicitly avoid), it proves all three findings as corollaries
  of one model-independent geometry: error = ribbon-parallel `par` ⟂ orthogonal `orth`, a scalar
  correction `κ` acts only on `par`, and `ribbonGain = κ·(2·par − κ)` (the orthogonal sector
  cancels). Corollaries: `orthogonal_error_gain_nonpos` (energy-only / forces 0%),
  `ribbonGain_neg_of_antialigned` (CHGNet regression = misaligned κ, same parabola — no model
  axiom), `ribbonGain_strictly_valuable` (MACE/SevenNet), and the capstone
  `broad_value_no_model_exception` (two backends, same `par`, aligned κ ⇒ equal positive gain).
  All proofs are `ring`/`nlinarith` over arbitrary reals; algebraic identities independently
  verified in sympy (all green) **and the module is kernel-verified locally** — `lake build`
  green, 0 sorry, after fetching the Mathlib cache. A second live result sharpened "energy-only"
  to **"support-set-only"**: a stress-targeted policy also left stress ≈ unchanged, and the
  `elastic_constants` distill cell *refused* (`requires ≥6 cases; found 0`) — the correction can
  only move a property the support manifold covers, exactly `RibbonProjection`'s
  orthogonal-sector law. Open: accelerate speed axis on `elastic_constants` with the
  elastic-covering `train-plus-elastic-v1` support (re-running).

## 2026-06-02 — Theorist deep-tier model upgrade: MiniMax M2.7 → M3, gated on a measured A/B

- **Why.** MiniMax-M3 (released 2026-06-01) is the new top-tier deep model behind Theorist
  hypothesis generation — 1M context, ~1/20 cost at long context, same `api.minimax.io/v1`
  route. But a model swap is only trustworthy if the quality lift is *measured* against a fixed
  research target, not assumed. The worker could pin a provider but not a specific MiniMax model,
  so M2.7-vs-M3 was not even expressible.
- **What.** (1) Added a **model axis**: `selectDeepRoute({modelOverride})` →
  `generateResearchText({modelOverride})` → `miniMaxModel(env, id)`; `/ops/experiment-generate`
  accepts `body.model`; `ab-oracle.ts --axis model`. Default flips to `MiniMax-M3` with
  `MINIMAX_BASELINE_MODEL = "MiniMax-M2.7"` kept as the canonical A/B baseline (rollback = a
  `MINIMAX_MODEL` secret change, no redeploy). (2) Pinned the **ribbon target theorem set**
  (T1 `hyper_ribbon_bound_3d`, T2 `empirical_hyper_ribbon_holds`, T3 `ParameterBound`, T4
  `broad_commitment_is_open`, the `cellValue` bridge) and a per-theorem **research strategy**.
  (3) Built the **eval harness**: `glim-ribbon-theorems` dataset + `tools/glim_model_eval.py`
  (generate→compare→report, mirrors ab-oracle's adopt/reject) with a **local-Opus** rubric.
  (4) Configured the **3-tier Cloud-Run sim matrix** (`policies/model-sim-matrix.yml` +
  `tools/mlip_sim_matrix.py`) — baseline / distill-accuracy / distill-accuracy+speed, cost-bounded
  and `cellValue`-scored. Full process in `docs/glim-m3-upgrade/`.
- **Results.** Model-axis change typechecks with **0 new type errors** (proven against the committed
  original) and existing tests stay green (6/6); repo `lint:fast` clean. The **local Opus agent**,
  run for real, generated rigorous competing hypotheses for T1/T3/T4 and — judging blind — scored
  them 10/10 against a deliberately weak fixture at 0/10 (rubric discriminates). The sim driver,
  scored on the committed MACE-energy artifacts, returns **cellValue 1.238** for distill_accuracy
  (50.5% MAE cut, speedup 1.025) and reproduces the `AccuracyCommitment.lean` constants from the raw
  artifact. No M2.7/M3 generation numbers were fabricated (this checkout has no MiniMax key).
- **Next.** (1) With `INTERNAL_TASK_TOKEN` + a live key, run the M2.7→M3 generation and let the same
  local-Opus judge emit the real verdict. (2) Launch the canary sim matrix on `Cu_fcc`/`Si_diamond`/
  `Fe_bcc` to test the T4 "where does distill fail?" hypotheses and bound `broad_commitment_is_open`.

## 2026-05-29 — Neural-symbolic loop: GPU MLIP curvature → machine-checked Lean (0 sorry)

- **Why.** Close the proof↔physics gap at the tightest coupling — a number measured on the GPU
  becoming a theorem the Lean kernel checks the next moment — and seed `atlas_theorems` *from the
  physics*, not by hand.
- **What.** A three-node continuous loop (`python/scripts/neural_symbolic/`):
  **Node 1** pits MACE-MP-0 vs CHGNet on a pure-shear C44 strain sweep of FCC Ni (the curvature
  observable) on the A4500; **Node 2** relays T3-REJECT breaches as OpenInference spans (the Python
  flywheel pattern — entirely off the glim-think `tsc` path; live OTLP when `PHOENIX_OTLP_RELAY_URL`
  is set, durable local artifact otherwise); **Node 3** authors import-free core-Lean theorems
  (`by decide`, 0 sorry) encoding the empirical failure as a verified negative constraint, plus an
  `atlas_theorems` seed.
- **Results.** On the GPU: MACE-MP-0 elastic C44 **92.4 GPa (−25.9%) → REJECT**, CHGNet **101.2 GPa
  (−18.8%) → REVIEW** vs the 124.7 GPa literature reference (MACE units cross-validated against the
  torch_sim elastic run). The MACE breach was authored into
  `mace_mp_0_curvature_reject : 323*4 > 1247 := by decide` and **independently verified by a fresh
  `lean` compile (rc 0, 0 sorry)**. 4 theorems synthesized, 4 `atlas_theorems` seed rows
  (`status='verified'`). Report: `docs/neural-symbolic-curvature-loop.md`.
- **Next.** (1) Stand up the GCP OTLP relay for live Phoenix streaming (then the loop is fully
  continuous: GPU → Phoenix → Lean per measurement). (2) Widen Node 1 to the full phonon Hessian.
  (3) Apply the seed to the live `glim-ledger` D1.

## 2026-05-29 — Local GPU proof: TorchSim → distill → uplift → formal gate (Ni FCC)

- **Why.** The ATLAS PR wired the rails but ran no train: Track B's TorchSim backend was a
  stub, the formal promotion gate had never scored a real benchmark, and the cloud "~75% Ni
  zero-point ribbon lift" was unreproduced locally. With a real GPU (RTX A4500) on hand, prove
  the whole compute loop end to end.
- **What.** Stood up a CUDA env (torch 2.6.0+cu124, torch_sim 0.6.0, cached MACE-MP-0) and wrote
  `python/scripts/run_ni_gpu_loop.py` — the GPU runner the Track B stub
  defers to. It benchmarks MACE-MP-0 on the sealed Ni FCC EAM fixture via TorchSim, fits the
  zero-point distill correction on the *non-overlapping* support set, computes real elastic
  constants + `distill_v_uplift`, and drives the ATLAS formal gate. Also filled
  `TorchSimBenchmarkBackend.run()` for real (70 Track-B tests still green; CI-safe without torch_sim).
- **Results.** 31 eval structures in 5.6 s on the A4500. Energy MAE vs Mishin EAM **1.2803 →
  0.0037 eV/atom (99.7%)** after the +1.279 eV/atom zero-point correction; stress 0.861 → 0.274 GPa;
  **overall `distill_v_uplift` 76.0%** — independently reproducing the cloud material-family
  result. Real elastic constants: MACE-MP-0 **C11=262.9 (+6.7%), C12=166.6 (+13%), C44=92.4
  (−26%)** GPa vs literature (the EAM-reference recovery returned 246.5/147.3/124.7 exactly,
  validating the fit). Formal gate, full range on real numbers: in-support certified →
  **PROMOTE**; out-of-support (the proved T3 negative-transfer regime) → **REVIEW**;
  marginal+uncertified → **REJECT**. The formal layer demonstrably gates real GPU compute.
  Report: `docs/mlip-gpu-ni-distill-formal-gate.md`.
- **Next.** (1) Genuine cross-material negative transfer (second MLIP/material) for a real T3
  REJECT. (2) Curvature lane — the C44 shear undershoot points straight at the phonon/Hessian
  frontier. (3) Seed glim-think `atlas_theorems` + emit `lupine.proof.status` spans so this gate
  decision flows into Phoenix.

## 2026-05-29 — ATLAS-Lean integration: formal foundations + closed-loop scaffolding

- **Why.** Meta open-sourced ATLAS-Lean (autoformalized textbook mathematics) and `torch-sim`.
  The `ATLAS_Lean_Integration_Review` laid out a 7-phase plan to (a) put `lean-spec` on a shared,
  reproducible Mathlib by pinning to ATLAS's revision, (b) make the MLIP benchmark/distill loop
  measurable, and (c) thread formal foundations through glim-think, Phoenix, the ODF promotion
  gate, and dspy.
- **What.**
  - *lean-spec (Phase 1+2).* Pinned the toolchain to ATLAS's `v4.29.0` and Mathlib to `8a178386…`,
    added `facebookresearch/atlas-lean` as a Lake dependency at `c5a10f1a`. Added 6 ATLAS-backed
    theorems (Jacobian rank ≤ P / ≤ N / ≤ min(P,N) — the formal core of the Parameter-Bound
    conjecture — plus ℝ-level hyper-ribbon corollaries) to `Analysis.Manifold` and
    `Theory.ParameterBound`.
  - *lupine-distill (Track B).* `TorchSimBenchmarkBackend` (lazy import + Mock fallback), the
    8-benchmark suite, the canonical `BenchmarkResult`/`BenchmarkMetrics` schema, and the
    `distill_v_uplift` calculator with promote/review/reject gates; 70 tests.
  - *gcp/mlip-cell-runner (Track C).* Consolidated the per-backend "lone wolf" sprawl into one
    `pyproject.toml` + matrixed Dockerfile/cloudbuild, scheduled-run policies, and an OpenInference
    patcher + loop connector; legacy files retained with a `DECOMMISSION.md` map.
  - *glim-think (Track D).* `atlas_theorems` D1 migration (`0010`), per-facet ATLAS context loader,
    OpenInference span-kind + ATLAS-attribute telemetry helpers, and three Phoenix eval runners.
  - *distiller/ODF + lupine-dspy (Track E).* Formal-verification promotion gate + theorem-aware
    OperatorPack model card + schema bridge; `TheoremGuidedHypothesis` dspy signature +
    formal-provenance persistence migration; 40 tests.
- **Results.** `lake build` green (1502 jobs, **96 theorems, zero `sorry`**) under the
  aligned/downgraded Mathlib — every existing proof survived the pin. 110 Python tests pass across
  B/E (independently re-run). **Key finding:** ATLAS's autoformalized modules elaborate at ~7–9 min
  *each*; importing a whole subject (`Atlas.RealAnalysis`, ~85 modules) is ≈80 min and twice
  exhausted the dev machine's memory. ATLAS *does* compile cleanly in-workspace (71/85 modules built
  with zero errors before a reset), so the dependency is wired and viable — but whole-subject imports
  are cost-prohibitive, so the new theorems build on the shared cached Mathlib that ATLAS pins to.
- **Next.** (1) Selective ATLAS *leaf-module* imports behind an offline/opt-in build target so CI
  stays fast. (2) Apply `0010` to the LEDGER D1 and seed real theorem rows from `lean-spec`.
  (3) Wire `distill_v_uplift` into the ODF promotion gate on a real model pair. (4) Resolve the ORB
  cu118 / UMA numpy-2 stack split flagged in the GCP `DECOMMISSION.md` before deleting legacy reqs.

## 2026-05-18 — Fix mislabeled home-page working-paper banner

- **Why.** The Library home banner promoted the paper link as *"Immigrant Scientist — The
  Invisible Foundation — a data-driven analysis of immigrant contributions to US science."*
  The author is not an immigrant and that is not the paper. The copy was a confused
  misreading of an internal IMMI working label as "immigrant."
- **What.** Verified `/immi_paper.pdf` is in fact *The Causal Geometry of Prediction Errors
  in Interatomic Potentials* (Welcing, Lupine Science). Corrected the
  `home.preprint.*` strings (EN + ZH) in `i18n.js` to the real title/abstract; the link was
  always correct.
- **Results.** Banner now identifies the paper as a working paper in preparation:
  *The Causal Geometry of Prediction Errors in Interatomic Potentials*. No "immigrant" copy
  remains in the build.
- **Next.** Audit other recovered hardcoded copy for the same era of stale text.

## 2026-05-19 — paper-build auto-dispatches the Library deploy

- **Why.** First real run of `paper-build.yml` proved a gap: a push made with a
  workflow's `GITHUB_TOKEN` does not trigger other workflows (GitHub's recursion
  guard), so the rebuilt PDF landed on `main` but `deploy-library-site` never fired —
  it needed a manual nudge.
- **What.** Added `actions: write` permission and an explicit
  `gh workflow run deploy-library-site.yml --ref main` after the push (skipped on the
  byte-identical no-op path).
- **Results.** `gh workflow run paper-build.yml` is now genuinely one command:
  compile → quality gate → commit → deploy. Verified the first run's PDF live (fresh
  recompile from the newer `.tex`; abstract now carries the foundation-MLIP transfer
  result; 0 raw-LaTeX leaks).
- **Next.** None — the paper pipeline is closed-loop and opt-in.

## 2026-05-18 — Opt-in CI to rebuild the working-paper PDF

- **Why.** The broken-PDF fix was a one-time swap; the root cause — a stale/broken
  local PDF can be the served artifact — remained. But the paper shouldn't rebuild on
  every push; the author chooses when to upgrade it.
- **What.** Added `.github/workflows/paper-build.yml`, **`workflow_dispatch` only**
  (never on push). Run it with `gh workflow run paper-build.yml`. It compiles
  `paper/immi-paper.tex` with the committed figures (optional `regenerate_figures`
  input), enforces a **quality gate** that fails the run if the PDF text layer leaks
  raw LaTeX (`\textbf`, `\noindent`, `$C_{`) or mojibake or is < 5 pages — the exact
  `immi-paper-local` class of bug — and, when `deploy=true` (default), commits the
  fresh PDF to `main` so the existing Library deploy publishes it. `deploy=false`
  builds an inspectable artifact only.
- **Results.** A broken render can no longer reach the Library: it either passes the
  gate or the run fails. Upgrading the paper is now one deliberate command.
- **Next.** Optionally regenerate figures in the same run once the `atlas-distill`
  JSON inputs are present in CI.

## 2026-05-18 — Fix the broken working-paper PDF

- **Why.** The linked `/immi_paper.pdf` was the stale `immi-paper-local.pdf` build: the
  abstract contained **raw, unrendered LaTeX** (`\noindent\textbf{Purpose:}`, `$C_{11}$`,
  `\texttt{atlas-distill}`) and mojibake separators — an unreadable artifact.
- **What.** Diagnosed via `pdftotext`: the served file (1.92 MB, Apr 29) leaked LaTeX
  markup and replacement characters. `paper/immi-paper-latest.pdf` (1.14 MB, May 5) is
  the correct render — 0 LaTeX leaks, 0 mojibake, full references [1]–[29], and current
  science (includes the d-band sample-size-confounder result). No LaTeX engine in this
  environment to recompile the 1-day-newer `.tex`, so swapped in the clean `-latest`
  build as `library-site/src/immi_paper.pdf`.
- **Results.** The working paper now renders as a proper paper, ~785 KB smaller. Verified the
  built `dist/immi_paper.pdf` has 0 raw-LaTeX leaks.
- **Next.** Rebuild from `paper/immi-paper.tex` via `make` in a LaTeX environment if the
  one-day-newer source has changes worth shipping; wire the paper build into CI so a
  broken local PDF can't be the served one again.

## 2026-05-18 — Remove Entity Graph; fix callout/filter alignment

- **Why.** The Entity Graph (force-graph) was unwanted weight, and the status-filter
  pills and the paper/featured callouts hugged the left edge while the rest of the
  page is a centered 720px column — they used hardcoded inline `margin:0 16px` that
  overrode the column's `margin:0 auto`.
- **What.** Deleted the Entity Graph end to end: the topbar button and `<dialog>` from
  `index.html`, the `force-graph` `<script>`, the whole graph section in `app.js`
  (~150 lines incl. the CDN fallback), the SW precache entry, the `build.js`
  vendoring step, the graph CSS, and the graph i18n strings. Added real `.status-filter`
  / `.callout` / `.callout-box` classes that use the same `max-width:720px; margin:0
  auto; padding:0 20px` container as `.shelf`/`.hero`, and removed the conflicting
  inline margins; callout text now uses theme variables instead of hardcoded `#fff`.
- **Results.** No graph code, no `/vendor/`, no force-graph in the build; `app.js`
  syntax-clean. The filter pills and both callouts now align flush with the shelves in
  every theme.
- **Next.** Optionally drop the unused `force-graph` dependency from `package.json`
  (left in place now to keep `npm ci` lockfile-in-sync; needs a lockfile regen).

## 2026-05-18 — References & Lineage shelf

- **Why.** The corpus referenced ~35 external works (the IMMI `references.bib`) but a
  reader had nowhere to see the intellectual lineage — what we build on and why.
- **What.** Authored `docs/references.md`: an annotated bibliography of all 35 works,
  organized by thread (sloppy-model theory → potentials → Simpson's/ecological fallacy →
  meta-analysis → benchmark infra), each with citation, DOI, and a one-line *why we cite
  it*. Added a **References & Lineage** shelf and moved the existing literature review
  into it so external papers live in one place.
- **Results.** 47 articles, 12 shelves. The program's lineage is now legible: each cited
  work is tied to the load it bears (e.g. Mao et al. → why the ribbon should transfer to
  MLIPs; Pearl → the Lean Simpson's-paradox proof).
- **Next.** Keep `references.md` in sync with `paper/references.bib` as the paper's
  bibliography grows.

## 2026-05-18 — Phase 2b: reader-side status filter

- **Why.** Phase 2 shipped the status *badge* but you still could not *browse* by
  lifecycle stage — the named gap. A thinking surface should let you ask "show me only
  what we refuted" in one click.
- **What.** Added a status filter bar on the home page: an `All · N` chip plus one
  color-coded chip per status actually present in the corpus, each with a live count.
  Clicking filters every shelf to that status (spanning shelves, not just Conjectures —
  e.g. `proven` surfaces the Formal Proof Ledger), hides empty shelves and blurbs, and
  `All` restores. Pure client state, no manifest change.
- **Results.** `supported → 3`, `refuted → 2`, `self-corrected → 1`, `proven → 1`,
  `open → 2`, `All → 46`. The refutations are now one click from the front door.
- **Next.** Generate the per-hypothesis entries from the live closure records so the
  ledger updates itself as research lands (the remaining Phase 2 follow-up).

## 2026-05-18 — Phase 2: the corpus becomes a ledger (Tier 1 + Tier 2)

- **Why.** The Library had the narrative (changelog) and the reports, but the actual
  scientific ledger — hypotheses, their status, the proofs and confounders behind them —
  existed only as prose. A thinking surface needs the science browsable by *where it
  stands*, not just by topic.
- **What.** Added `status` and `group` as first-class catalog/manifest/reader axes with a
  colored lifecycle badge (proposed / supported / open / refuted / self-corrected /
  proven). Authored **Tier 1**: a Conjectures & Proofs shelf (the hypothesis ledger +
  8 per-hypothesis entries, each Claim/Evidence/Confounder/Formal-cross-check/Next), a
  Partnerships shelf (MIIT-67 mapping under the public/gated convention), and a Formal
  Proof Ledger mapping claims to Lean verdicts. Authored **Tier 2**: Data & Provenance,
  Methodology (matched-n / contamination-gating / ecological-fallacy), and Reproduce Our
  Results.
- **Results.** Library is now 46 articles across 11 shelves. The refutations
  (d-band, MEAM-2D) and the BCC/FCC self-correction are as visible as the confirmations,
  each with the confounder named — the self-correction discipline is finally legible as
  structure, not buried in narrative.
- **Next.** Reader-side status *filtering* (the badge ships now; faceted filter is the
  next increment); generate the per-hypothesis entries from the live closure records so
  the ledger updates as research lands.

## 2026-05-18 — Phase 1b: the deploy was green but the site never changed

- **Why.** After Phase 1 merged, the Cloud Build went green yet `library.lupine.science`
  still showed no content and a white-square graph. "Green build, stale site" is the most
  deceptive deploy failure there is.
- **What.** Traced it past the domain and the direct `run.app` URL — both served the
  April-28 build. `gcloud run services describe` showed the smoking gun: the `library-site`
  service had **traffic pinned 100% to revision `library-site-00013-kfj`**. Every deploy
  since (we were at `00027`) created a healthy new revision that received **0% traffic**.
  Verified `00027` served the correct build via a temporary `verify` traffic tag, then
  migrated traffic with `--to-latest` (which also sets `latestRevision: true`, so future
  deploys auto-route). Hardened `cloudbuild.yaml` with an explicit step 6
  `gcloud run services update-traffic --to-latest` so a re-pin can never silently hide a
  deploy again.
- **Results.** `library.lupine.science` now serves the new build live: 26 articles, 8
  shelves incl. Changelog & Progress, `changelog.json` 200, force-graph 200, SW
  `KILL=k1`. The graph code/CSS in the recovered source was never broken — the white
  square was the same stale revision. Service traffic config is now
  `{latestRevision: true, percent: 100}`.
- **Next.** Returning visitors still running the *old* cache-first service worker need one
  hard reload for the new SW to take over (the old SW predates the `KILL` token, so it
  can't self-evict — only the new SW can). After that, the network-first + `KILL` design
  prevents recurrence. Then Phase 2.

## 2026-05-18 — Phase 1: unbreak the Library deploy path (self-healing SW)

- **Why.** `library.lupine.science` showed "no content ever since the Chinese
  experiment." Diagnosis: the server is *not* the problem — it returns 24 articles and
  200s. The break is a **frozen Cloud Run image** plus a **cache-first service worker**
  that pins returning visitors to a stale/empty manifest forever, with no in-repo deploy
  path to ship a fix (the workflow was deleted with the source).
- **What.** Confirmed the recovered `app.js`/`i18n.js` already fall back to EN safely
  (no logic bug to fix). Switched the service worker's `/data/*.json` from cache-first to
  **network-first** (fresh content wins; cache is the offline fallback) and added a `KILL`
  token to the cache namespace so any future bad build self-evicts on activate. Recreated
  the deploy as committed IaC: `.github/workflows/deploy-library-site.yml` driving the
  recovered `cloudbuild.yaml`, which replaces the frozen image on the existing
  `library-site` Cloud Run service.
- **Results.** Clean local build: 26 articles, 8 shelves, force-graph self-hosted,
  version+KILL-stamped SW, served smoke-test all 200s. The deploy path is now a
  push-to-main workflow, not a hand-run gcloud command. Not yet deployed to the live
  domain — that triggers on merge to `main`.
- **Next.** Merge to `main` to restore `library.lupine.science`; verify the SW takes over
  for previously-bricked visitors; then Phase 2 (status/group facets + corpus-generated
  Conjectures & Proofs / Partnerships shelves).

## 2026-05-18 — Revive the Library as the public thinking surface

- **Why.** `library.lupine.science` had been dark since a half-finished bilingual (EN/中文)
  experiment; its source was deleted from the repo and the Cloud Run service was frozen on a
  stale, contentless build. The research corpus (reports, hypotheses, proofs, partnerships)
  had no single public home and no changelog, so recent work — e.g. wiring Phoenix — was not
  pointable-to.
- **What.** Recovered the full `library-site/` static-site generator from git
  (`54e61f3^`). Rewrote the root README for external readers. Created this changelog in a
  why/what/results/next format. Deferred multi-language (keeping the `{en, zh}`-shaped
  catalog so the door stays open) to focus on **organization**: category, group, and status
  as first-class axes so the Library is a place to *think about* the work, not just read it.
- **Results.** Source restored and inspected; the catalog→Markdown→reader pipeline is intact
  and the model is well-suited to a status-aware research ledger. No redeploy yet (Phase 0 is
  intentionally local-only and reversible).
- **Next.** (1) Add `status` and `group` to catalog entries + build manifest + reader facets
  so hypotheses can be browsed by lifecycle stage. (2) Promote the hypothesis lifecycle and
  partnerships to public shelves generated from the corpus. (3) Fix i18n to fall back to EN
  safely, then redeploy over the frozen service.

## 2026-05-16 — Wire Phoenix evals end to end

- **Why.** The research loop in `glim-think` produced no observability: the hourly evaluation
  workflow and the Worker trace export were two disconnected halves, neither configured by
  deploy automation, so 0/300 spans reached Phoenix Cloud. We could not measure whether the
  loop was actually improving hypotheses.
- **What.** Identified the two-halves split (GitHub repo secrets for the eval workflow vs.
  wrangler secrets for the Worker exporter) and set both. Consolidated `glim-think` to a
  single AI-SDK-native LLM path, deleting a dead second path that produced no spans.
- **Results.** Root cause confirmed: the Worker had no Phoenix secrets and silently used a
  no-op localhost exporter. Separately *proved* a hard infrastructure limit — a Cloudflare
  Worker cannot export OTLP directly to Phoenix Cloud; the CF edge black-holes the
  subrequest with a fake `200`. The Phoenix key was valid all along.
- **Next.** Stand up a GCP egress relay (mirroring `deploy-otlp-relay.yml`) so Worker spans
  reach Phoenix; then use the lifecycle-trace + scientific-throughput evals as the loop's
  fitness function.

## 2026-05-16 — De-myopize the corpus (the hyper-ribbon is not an artifact)

- **Why.** The error corpus was ~99.5% elastic-constant (C_ij) records. If the hyper-ribbon
  only appeared in C_ij, it could be an artifact of one property family rather than a real
  feature of potential error.
- **What.** Recovered real lattice constants (a₀) from MLIP provenance for 45 records and
  forced a joint C_ij + a₀ manifold per fleet run.
- **Results.** The hyper-ribbon **survives** on the joint manifold (participation ratio
  1.05–2.05) — it is not an elastic-constant artifact. E_coh and B₀ predictions still require
  the external compute pipeline before they can join the manifold.
- **Next.** Extend the compute pipeline (Phase-D recipes) to produce E_coh / B₀ so the
  manifold spans four property families, then re-test ribbon stability.

## 2026-05-16 — Self-correction: the BCC/FCC "causal shield" was contamination

- **Why.** A dramatic result (BCC vs. FCC error correlation 0.90 vs. 0.04, a "causal shield")
  was too strong; strong results in a noisy corpus deserve suspicion before celebration.
- **What.** Audited the records behind the effect and added an ingest guard plus an
  idempotent purge to fleet step 0.
- **Results.** The effect was a ~1.5% data-contamination artifact (19 corrupt records).
  Corpus purged to 1231 records, gated at `|pred| > 1500` / `≤ 0`. Honest residual: a modest
  BCC > FCC tendency, no Cauchy relation. The real contribution is the B → C2 → C3′ → C4
  self-correction arc — the same matched-n method that refuted the d-band hypothesis.
- **Next.** Treat self-correction as a publishable primitive: every refuted claim gets a
  changelog entry and a hypothesis-shelf status of `refuted (by us)`, with the confounder
  named.

---

# Backfill — work since the site went stale (2026-04-27 → 2026-05-16)

The Library froze on the 2026-04-28 build. ~355 commits landed before it was revived.
These are the arcs that matter, reconstructed so the corpus reflects current reality.
Not every commit — the ones that changed what we believe or what the system can do.

## 2026-05-17 — Phase D: close the loop with real physics

- **Why.** Every result above is computed from *predicted* properties already in the corpus.
  To validate recipes and extend the manifold beyond C_ij/a₀ (to E_coh, B₀) we need to run
  real LAMMPS, not trust the cache.
- **What.** Shipped the Phase-D compute resolution lane: a WAF-resilient HTTP client
  (retry + backoff + jitter, browser UA), a committed NIST harness, and a resilient compute
  deploy. Then ran real LAMMPS through it.
- **Results.** Running real physics immediately surfaced **3 real recipe/integration bugs**
  (P0/P1) that the cached pipeline had masked — exactly the point of the lane. Compute path
  now deploys and survives datacenter WAF blocks.
- **Next.** Produce E_coh / B₀ from Phase-D recipes and fold them into the joint manifold;
  re-test hyper-ribbon stability across four property families.

## 2026-05-17 — The self-improving eval loop (Evolver spine)

- **Why.** Phoenix gave us observability; the next step is *actuation* — a loop that reads
  its own eval results and improves the thing being measured. Without it, evals are a
  dashboard, not a kernel.
- **What.** Built the eval-loop units end to end: Phoenix dataset-read + Experiments REST
  client, an A/B oracle, the Evolver self-improving spine, the registry/provenance/
  regression-gate trio, and `/ops/experiment-generate` (the Evolver activation prereq).
  Closed the eval→routing loop so model selection is eval-aware.
- **Results.** The loop's spine exists and is wired: hypothesis lifecycle traces are the
  substrate, Phoenix evals are the fitness function, the Evolver is the actuator. Autonomous
  actuation is deliberately narrow (prompts/rubrics/criteria); structural change stays
  PR-gated.
- **Next.** Arm the Evolver on a live hypothesis; keep structural edits human-gated. This is
  the long-term organizing principle — the hypothesis lifecycle, not the prompt, is the unit
  of optimization.

## 2026-05-04…05 — Hypothesis closures: the corpus refutes itself, correctly

- **Why.** The hyper-ribbon and the BCC/FCC dichotomy were found in *classical* potentials.
  Do they transfer to foundation MLIPs? And do our exciting sub-findings survive scrutiny?
- **What.** Ran the research-round loop: ingested MACE-MP-0, then CHGNet, then Orb-v3 on the
  IMMI elements; ran matched-n bootstrap tests on the d-band and MEAM anomalies.
- **Results.**
  - **Hyper-ribbon transfers:** 14/15 IMMI elements stay on the hyper-ribbon when each
    foundation MLIP is added. This is the genuinely surprising result — we did *not* expect
    classical→MLIP transfer.
  - **Au escapes** the ribbon across MACE and CHGNet (confirmed); **Ag escape refuted**
    (CHGNet pulls it back); **Fe** is a persistent outlier invariant to LAM addition.
  - **D-band hypothesis REFUTED** (full-sample ρ=−0.02); the apparent signal was a
    sample-size confounder (ρ=−0.50 to −0.66), recovering only on the n≥3 subset (ρ=+0.52).
  - **MEAM "intrinsically 2D" anomaly REFUTED** by matched-n bootstrap (MEAM n=7 median
    PR=1.36 overlaps Tersoff PR=1.01) — same confounder flavor as d-band.
- **Next.** These become `refuted (by us)` entries on the Conjectures & Proofs shelf
  (Phase 2), each with the confounder named. The self-correction *method* is the
  contribution.

## 2026-05-15…16 — One LLM path, eval-aware routing, AI Gateway

- **Why.** `glim-think` had two LLM paths; the gateway one was dead (0/300 Phoenix spans),
  so half the telemetry was fiction and routing decisions were blind.
- **What.** Consolidated to one AI-SDK-native path (eval-aware deep tier), deleted the dead
  gateway path, routed Workers AI through Cloudflare AI Gateway (hybrid — Zhipu/MiniMax stay
  direct, Gateway rejects them), and made the per-model scorecard read live-path attribution
  (`ai.telemetry.functionId`).
- **Results.** Telemetry is now truthful; the eval→routing loop selects models on real
  measured performance instead of a path that never executed.
- **Next.** Let the scorecard drive the Evolver's model-selection actuation.

## 2026-05-06…18 — atlas-view: streaming, render polish, curated gallery

- **Why.** The WebGPU explorer choked on large scenes and shipped 185 uncurated gallery
  entries; the manifold is only persuasive if it renders fast and looks right.
- **What.** Progressive chunked GPU upload + within-frame streaming parse + `.glimbin`
  streaming pipeline + cluster-splat LOD + device-tier atom caps; bond/shader polish (flat
  2-tone bonds, isotropic atom shader, killed light flicker/shimmer); rebuilt the gallery
  to a curated 18-entry set; added a pre-merge CI and a Playwright UI harness.
- **Results.** Huge scenes stream instead of stalling; the gallery is curated and the test
  suite is green (14/14) with reproducible NIST catalog + streaming smoke tests in CI.
- **Next.** Visual-regression diffing (screenshots are captured but not yet diffed).

---

## How to add an entry

Append at the top of the newest section. Keep Why/What/Results/Next. Prefer naming the
confounder, the null result, or the limit you hit — those are the entries that compound.
This file is wired into the Library catalog under the **Changelog & Progress** shelf.
