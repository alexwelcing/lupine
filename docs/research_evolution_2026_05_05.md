# The Loop That Caught Itself — Lupine Research Evolution Report

**Date:** 2026-05-05
**Author:** A. Welcing
**Companion route:** [`/evolution`](https://lupine.science/evolution) on the public site
**Companion ledger:** [`https://glim-think-v1.aw-ab5.workers.dev/hypotheses`](https://glim-think-v1.aw-ab5.workers.dev/hypotheses)

---

## TL;DR

Five rounds of autonomous research over four days produced a working demonstration of a three-stage cycle: **organize information → harden logic → evaluate ideas**. The headline finding is not any single result but the system property: **the same matched-n bootstrap method caught two independent statistical artifacts in two days, in different scientific domains**. That is the harden stage doing its job repeatedly, and it is what makes the loop self-correcting rather than a fancier version of cherry-picking.

This document is the long-form record of how the ideas moved, why the matched-n bootstrap is now load-bearing, and what the X-scale, Y-iteration projection looks like under BigQuery + GCP.

---

## §1 — The cycle, in one sentence

Every round of work on this project is a loop:

1. **Organize information** into a typed corpus keyed to a hypothesis_id.
2. **Harden the logic** against statistical artifacts before any claim is advanced.
3. **Evaluate ideas** by moving them through a strict hypothesis lifecycle with a gate.

Each stage owns one job. The interesting behavior — the system catching its own mistakes — emerges from the *composition* of the three.

---

## §2 — The three stages, with concrete artifacts

### §2.1 Organize

Every record — a literature harvest, a LAMMPS benchmark, a foundation-MLIP elastic-constant sweep, a critique reply — lands as a typed row in either the local distill SQLite ledger or the public Cloudflare D1 mirror. As of 2026-05-05 the corpus spans 953 classical potentials, 18 functional-form families, three foundation MLIPs (MACE-MP-0, CHGNet, Orb-v3), 15 elements, 7,940 benchmark records, and 25 active hypotheses across proposed/testing/confirmed/refuted status.

Key artifacts:
- `POST /ingest/batch` — bulk record ingest. 45 records per MLIP × 3 MLIPs landed 2026-05-04.
- `POST /admin/harvest` + `POST /admin/comprehend` — literature pipeline against arXiv + OpenAlex.
- `POST /admin/manifold-recompute` — force re-PCA across all 15 elements after new ingest.
- `lupine-distill::worker_sync` — best-effort auto-push of every local claim to the worker; HTTP failures log and continue, never block the local insert.

### §2.2 Harden

Every quantitative claim runs through deterministic statistical tests with no LLM in the loop: bootstrap CIs (10,000 iterations standard), permutation tests (5,000 shuffles), matched-n controls, and Spearman/Mann-Whitney pairings via the Causal Durable Object. The job at this stage is **not to find effects — it is to kill artifacts**.

Key artifacts:
- `POST /admin/d-band-analysis` — Causal-DO RPC. Spearman + permutation + bootstrap on cross-style PC1 alignment; pure deterministic, zero LLM cost.
- `mlip_immi/meam_bootstrap.py` — 10,000 matched-n subsamples on MEAM error vectors against tersoff baseline; demonstrates the matched-n method in stand-alone Python.
- `mlip_immi/cross_mlip_alignment.py` — pairwise cosines on unit error vectors across MACE/CHGNet/Orb.
- `AutoHypothesisEvaluation` claim type — theorist auto-eval claims now fenced from PR-based hypotheses (see §3.5 Au reconciliation).

### §2.3 Evaluate

Hypotheses traverse a strict lifecycle: `proposed → testing → confirmed | refuted`, with status changes requiring `evidence_ids` attached and a Lean-readiness gate that refuses formalization until five boolean checks pass:

1. confidence ≥ 0.85
2. verdict stable across 3 rounds
3. ≥ 5 high-relevance insights
4. no recent refutations
5. narrative carries numerical anchors

Synthesis claims close every round and queue the next set of hypotheses, each paired with a concrete experiment description on `/research/questions`. The `/admin/iterate` loop chases follow-up queries until the M2.7 reasoner emits no new ones — convergence detection saves real cost.

Key artifacts:
- `PATCH /hypotheses/{id}` — confidence + evidence_ids + status atomically updated.
- `GET /admin/lean-status` — five-check formalization gate per hypothesis.
- Synthesis claims with `tested_hypotheses[]` + `verdicts{}` + `newly_proposed[]`.
- `/admin/iterate` — M2.7 reason→harvest→comprehend→re-reason loop with convergence termination.

---

## §3 — Idea evolution, round by round

Nine canonical hypotheses, in order. Refutations are **not dead ends**: each reliably leaves behind a narrower, defensible claim.

### §3.1 Round 1 (2026-05-02) — `hyp_cross_style_pc1_universal`

LLM counter-claim: PC1 is invariant to functional form across all elements. Test: pooled cross-style cosine 0.689 < threshold 0.7. **Refuted.** Spinoff: element-level dichotomy emerged → `hyp_pc1_element_form_dichotomy` proposed at conf 0.85.

### §3.2 Round 1.5 (2026-05-02) — `hyp_rank_pr_scaling`

Many-body rank → PR scaling. Test: Spearman ρ = -0.26, p = 0.42. **Refuted.** Spinoff: MEAM-as-outlier observed at full n → `hyp_meam_anomaly` proposed.

### §3.3 Round 2 (2026-05-03) — `hyp_glim_mlip_value`

Meta-claim: GLIM provides value for MLIP development. Test: 1/6 high-relevance insights. Auto-generated follow-up queries pulled ecological-fallacy literature from ecology, not MLIP-specific work. **Gate blocked.** Lesson promoted to feedback memory: concrete claims search; meta-claims do not.

### §3.4 Round 3 (2026-05-03) — `hyp_top3_lam_diagnostics`

MACE-MP, CHGNet, Orb inherit hyper-ribbon; GLIM diagnostics catch MLIP failure modes. Pre-seeded with 4 manual harvests + 6 manual comprehends → 7/7 high-relevance, converged at round 2 of 3. Confidence trajectory: 0.45 → unchanged → 0.90 (post-empirical). **Confirmed.** Spinoff: empirical experiment unblocked — actually run the trio on the IMMI corpus.

### §3.5 Round 3-closure (2026-05-04) — `hyp_alignment_d_band`

Cross-style PC1 dichotomy explained by d-band fullness. Tests: ρ(d_count, alignment) = -0.02 on full sample (refuted); ρ(n_pairs, alignment) = -0.50 → -0.66 on subset (confounder confirmed). **Refuted as stated, sample-size confounder found.** Spinoff: `hyp_alignment_sample_size_artifact` confirmed at 0.90; matched-n method established as the harden-stage primary.

### §3.6 Round 4 (2026-05-04) — `h4_mlip_invariance` + `hyp_top3_lam_diagnostics`

Hyper-ribbon survives MLIP additions. Local inference of MACE-MP-0 → CHGNet → Orb-v3 on the IMMI 15-element corpus. Result: 14/15 elements still PR < 2.0 across the trio (Fe lone outlier). **Confirmed at conf 0.90 for both.** Four new hypotheses queued: Au escape, Pt orthogonality, Fe persistent outlier, MLIP alignment test.

### §3.7 Round 5a (2026-05-05) — Au reconciliation

`hyp_au_specific_mlip_escape`. PR-based escape (1.02 → 1.41 with trio additions) vs rank-correlation auto-eval (within-style r ≥ 0.99, no Simpson attenuation). Apparent contradiction. **Both stand:** PR measures dimensional spread; rank-r measures monotonicity. Pearson r at n=3 with property magnitudes spanning ~5× is bounded near 1 by structural variance. **Methodology hardened.** The auto-eval framework is now fenced from PR-based hypotheses; n_records-per-style ≥ 9 threshold required before `supports_universal` verdicts can fire.

### §3.8 Round 5b (2026-05-05) — `hyp_mlip_alignment_test`

Element-form dichotomy extends to foundation MLIPs. Test: Spearman ρ = 0.19, p = 0.51 vs classical PC1 alignment (n = 15). **Refuted (expected).** Spinoff: noble-vs-refractory MLIP split discovered (group means 0.90 vs 0.22) → `hyp_noble_vs_refractory_mlip_split` (conf 0.75) and `hyp_pd_coherent_mlip_error_mode` (conf 0.70) queued.

### §3.9 Round 5c (2026-05-05) — `hyp_meam_anomaly`

MEAM PR=2.24 vs tersoff PR=1.01 at the same many-body rank — angular term proposed as mechanism. Test: 10,000 matched-n subsamples of MEAM at n=7. **At matched n, MEAM median PR = 1.36, p05 = 1.04 — overlaps tersoff.** **Refuted as a comparison claim, sample-size confounder found.** Same artifact pattern as the d-band closure. Spinoff: `hyp_meam_intrinsically_2d` (full-n bootstrap CI [1.58, 2.39] excludes 1-D null) preserves the narrower defensible claim at conf 0.80.

---

## §4 — The convergence demonstration

This is the load-bearing claim about the system. Two independent hypotheses, in different domains, both turned out to be **sample-size confounders rather than physical phenomena**. The same deterministic method caught both.

### §4.1 d-band closure (2026-05-04)

| | |
|---|---|
| Apparent finding | Closed-shell d10 → high cross-style alignment (ρ predicted ~+0.7 from physical theory) |
| Matched-n test | Restrict to n_pairs ≥ 3, controlling for sampling depth |
| What was revealed | On full sample, ρ(d_count, alignment) = -0.02 (null). The dichotomy is dominated by sample-size, not d-band |
| Residual surviving claim | On controlled subset, residual d-band signal recovers at ρ = +0.52, p = 0.087 — `hyp_dband_partial_signal` |

### §4.2 MEAM bootstrap (2026-05-05)

| | |
|---|---|
| Apparent finding | MEAM PR=2.24 vs tersoff PR=1.01 at the same many-body rank — angular term proposed as mechanism |
| Matched-n test | 10,000 subsamples of MEAM at n=7 (matched to tersoff) |
| What was revealed | MEAM at n=7 median PR=1.36, p05=1.04. Tersoff observed sits at MEAM-at-n=7 5th percentile — barely distinguishable. |
| Residual surviving claim | MEAM full-n PR=2.07, bootstrap CI [1.58, 2.39] — narrower "MEAM is sloppy in 2D at full n" claim survives in `hyp_meam_intrinsically_2d` |

### §4.3 The system property

The same operator (matched-n bootstrap, no LLM in the loop) refuted two hypotheses in different scientific domains using the same artifact pattern. That is not a one-off — it is the harden stage doing its job repeatedly. Every additional round adds another opportunity for the loop to catch itself.

A measurable consequence: any IMMI-paper claim that compares PR or alignment across pair_style families must either restrict to comparable n or report a matched-n bootstrap. This is now methodology, not folklore.

---

## §5 — The X-scale, Y-iteration projection

The point of demonstrating self-correction at small scale is to motivate the cost of running it at full scale. If a five-round, ~10⁴-record system already catches its own confounders, a ~10⁷-record, thousand-round system should produce a measurable self-correction rate — a KPI for autonomous science itself.

### §5.1 Axis X — corpus scale

**Today (May 2026):** 953 classical potentials × 18 families × 15 elements × 3 properties = 7,940 records. Three foundation MLIPs added 2026-05-04. ~10⁴ records.

**Grand finale:** Full Materials Project corpus (>150k materials), all 600+ KIM/NIST potentials, the broader LAM landscape (M3GNet, SevenNet, GNoME, DPA-3, EquiformerV2, Allegro, NequIP), beyond elastics into phonons, defect energies, surface energies, vacancy formation, magnetic ground states. **Order of magnitude: 10⁷–10⁸ records.**

**Enabler:** BigQuery as the structured ledger; Cloud Storage for artifacts; Pub/Sub for streaming ingest events from a fleet of MD runners.

### §5.2 Axis Y — iteration scale

**Today:** Five rounds across three days. Three closures landed in a single session (2026-05-05). Two methodological lessons (sample-size, n-threshold) promoted to feedback memory.

**Grand finale:** Thousands of rounds running concurrently via Cloud Run worker fleet. Each new MLIP architecture (or new data corpus, or new property class) becomes a round. Hypothesis half-life measured rather than visually inspected.

**Enabler:** Cloud Run + Cloud Tasks for the iterate worker pool; Vertex AI for the M2.7 reasoner backend; Looker dashboards on BigQuery for round throughput and convergence metrics.

### §5.3 Self-correction rate

**Today:** Two independent confounders caught with the same matched-n method, two days apart. Multiple LLM counter-claims refuted by the deterministic harden stage. The Lean-readiness gate has refused every formalization attempt so far.

**Grand finale:** Self-correction rate becomes a measurable property. Per 1,000 hypotheses, what fraction get refuted? Per 100 confounders, what fraction are caught before formalization? These become KPIs of the autonomous research system itself, reported on a public dashboard.

**Enabler:** Cloud Logging + BigQuery analytical views; the existing /admin/lean-status overview becomes a SQL query against persistent state.

---

## §6 — What we will have achieved

If the loop runs at the projected scale without intervention beyond hypothesis seeding, the deliverable is the first scientific reasoning system whose **self-correction rate is auditable in public** and whose **artifact-detection record is written down** rather than buried in lab folklore.

That is a different deliverable from "an automated literature reviewer" or "a fancy prompt-engineering harness." It is a system whose meta-properties — refutation rate, confounder catch-rate, formalization-gate failure rate — are first-class observables. The IMMI manuscript is the first paper produced by it; the second will be the operating-system paper itself.

---

## §7 — Companion documents

- [`/evolution`](https://lupine.science/evolution) — public TanStack route mirroring this report.
- [`/process`](https://lupine.science/process) — the original operating report (rounds 1–3).
- [`/research`](https://lupine.science/research) — the IMMI preprint summary.
- [`docs/plans/grand_finale_gcp.md`](./plans/grand_finale_gcp.md) — detailed BigQuery + GCP migration plan.
- [`paper/immi-paper.tex`](../paper/immi-paper.tex) — IMMI manuscript (currently marked WORK IN PROGRESS).
- Public ledger: `https://glim-think-v1.aw-ab5.workers.dev/hypotheses`
