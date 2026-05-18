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

## How to add an entry

Append at the top of the newest section. Keep Why/What/Results/Next. Prefer naming the
confounder, the null result, or the limit you hit — those are the entries that compound.
This file is wired into the Library catalog under the **Changelog & Progress** shelf.
