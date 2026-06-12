# ADR-0002: Documentation architecture — one map, five facets, logical indexing over moves

**Status:** Accepted — 2026-06-02
**Author:** A. Welcing (with Claude)
**Supersedes:** the stale `docs/navigation.md` (viewer-codemap-as-repo-guide) and the
unindexed flat `docs/` pile.

---

## 1. Context

The corpus had grown to ~89 `docs/*.md` plus root docs, with no reliable top-down
path to the real science. Three concrete failures:

1. **Stale navigation.** `docs/navigation.md` described a `glim/` superfolder that does
   not exist in this checkout and was really the LUPI-viewer codemap; `docs/research-index.md`
   summarized four root docs (`deep-research-report.md`, `ancillary-research-opps.md`,
   `foundational-research.md`, `example-research-papers.md`) that **no longer exist**.
2. **Conceptual muddle.** "Low-dimensional error manifold" referred, interchangeably, to
   three *different* objects: the Transtrum–Sethna model manifold (the actual hyper-ribbon),
   the participation-ratio measure of the error covariance, and the keystone paper's
   configuration-space error core. Conflating them produced wrong claims (including in a
   2026-06-02 working session).
3. **Load-bearing coupling.** `library-site/scripts/catalog.js` hard-codes ~30 `docs/*.md`
   paths to generate the public library; `glim-think` reads `docs/contracts/`, `docs/routes.md`,
   `docs/handoff/`. Physically moving corpus docs breaks the public site and the worker.

## 2. Decision

**One front door, one map, five facets — and clarity by indexing, not by churning files.**

1. **Entry hierarchy.** `README.md` (front door) → `docs/navigation.md` (the map) → facets.
2. **Five facets**, each with one canonical spine doc:
   - **Science** — `docs/science/SCIENCE_SPINE.md` + new `docs/science/objects.md` (the
     three error-geometry objects, definitively).
   - **Engineering** — new `docs/engineering/README.md` (index over `glim-think/`, the
     `docs/mlip-*` / `docs/distill_*` operational docs, `gcp/`, and `docs/glim-m3-upgrade/`).
   - **Product** — `docs/research-index.md` (pruned of dead refs).
   - **Formal** — `docs/formal-proof-ledger.md` + `lean-spec/`.
   - **Live claim status** — `docs/conjectures/ledger.md` (the source of truth for what
     is supported / refuted / open).
3. **Minimize physical moves.** Load-bearing docs (anything `catalog.js` lists) stay put;
   logical grouping is done with index docs. The only move is the single standalone
   `docs/error-geometry-reconciliation.md` → `docs/science/keystone-reconciliation.md`.
4. **`catalog.js` is a coupled interface.** Any change to what the public site lists is made
   in lockstep with `catalog.js`, and gated by a build/source-resolution check.
5. **No placeholder tooling.** Verification (link resolution, catalog source existence) is
   run **inline/ephemerally**, not committed as throwaway scripts.

## 3. Consequences

**Positive** — a deterministic top-down path to the science; the three-objects confusion
has one canonical home everything links to; the public site is untouched (no load-bearing
moves); provisional 2026-06-02 session work is fenced behind status banners and the
navigation status table rather than masquerading as established.

**Negative** — the `docs/` directory remains physically flat for the corpus (the index
docs impose logical structure on top). A future, higher-risk pass could physically regroup
under `science/ engineering/ product/` *if* `catalog.js` is migrated in lockstep; this ADR
explicitly defers that.

**Neutral** — `GLOSSARY.md` and `docs/agent-index.md` are left as-is pending a read; they
should later be reconciled to the three-objects vocabulary.

## 4. Action items (this change)

- [x] Phase 0 — `docs/science/objects.md`, `docs/engineering/README.md`, link from
  `docs/navigation.md`; this ADR.
- [x] Phase 1 — add `objects.md` to `library-site/scripts/catalog.js` (category `theory`);
  verify catalog sources resolve.
- [x] Phase 2 — `git mv docs/error-geometry-reconciliation.md docs/science/keystone-reconciliation.md`;
  fix inbound links (`navigation.md`, `CHANGELOG.md`, `a6-alignment-results.md`, memory note).
- [x] Phase 3 — `docs/research-index.md`: pruned **all** dead sections (not just the four root
  docs — the `atlas/*-project-plan.md` plans and the `atlas/*.jsx` artifacts had also been
  removed); kept only the live `docs/*_report.md` deep-research reviews. `docs/EXTRACTION_*.md`
  **left in place**: they are catalog `source:` entries (load-bearing public content), so removing
  them is a public-content decision, not a navigation fix — deferred to §5.
- [x] Phase 4 — repo-wide markdown-link check; confirm no stale `glim/` root references;
  confirm catalog sources resolve.

## 5. Deferred (not in this change)

- [ ] Physical regrouping of corpus docs under `science/ engineering/ product/` with a
  lockstep `catalog.js` source-path migration.
- [ ] Reconcile `GLOSSARY.md` + `docs/agent-index.md` to `docs/science/objects.md` vocabulary.
- [ ] Re-run the A6 alignment test with a Cauchy/stability **mathematical-coupling-aware**
  null (Jackson–Somers 1991 / Archie 1981) before its result leaves "provisional".
- [ ] **`docs/EXTRACTION_*.md` (3 files)** are content-extraction process logs (dead
  `/sessions/...` paths) currently published via `catalog.js`. Decide whether they belong on
  the public library; if not, remove the files **and** their three `catalog.js` entries in
  lockstep, then rebuild.

## 6. References

- `docs/navigation.md` — the map this ADR ratifies.
- `docs/science/objects.md` — the three-objects canonical.
- `library-site/scripts/catalog.js` — the coupled public-site interface.
- `archive/swarm_preprint_review/research/immi_dim01_sloppy_theory.md` — the literature foundation
  that grounds the object definitions.
