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

## 2026-05-18 — Fix mislabeled home-page preprint banner

- **Why.** The Library home banner promoted the preprint as *"Immigrant Scientist — The
  Invisible Foundation — a data-driven analysis of immigrant contributions to US science."*
  The author is not an immigrant and that is not the paper. The copy was a confused
  misreading of **IMMI** (*Integrating Materials and Manufacturing Innovation*, the target
  journal) as "immigrant."
- **What.** Verified `/immi_paper.pdf` is in fact *The Causal Geometry of Prediction Errors
  in Interatomic Potentials* (Welcing, Lupine Materials Science). Corrected the
  `home.preprint.*` strings (EN + ZH) in `i18n.js` to the real title/abstract; the link was
  always correct.
- **Results.** Banner now reads "IMMI Preprint — The Causal Geometry of Prediction Errors in
  Interatomic Potentials." No "immigrant" copy remains in the build.
- **Next.** Audit other recovered hardcoded copy for the same era of stale text.

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
