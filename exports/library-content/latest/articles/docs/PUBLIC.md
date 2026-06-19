# Public Corpus & Documentation Approach

How Lupine maintains a research corpus *in public* — hypotheses, conjectures, proofs,
partnerships, and a working changelog — in one place: the
[Lupine Library](https://library.lupine.science), generated from this repository.

## Principle

**The corpus is the source of truth; the Library is a view of it.** Every public artifact is
a Markdown file in this repo. `library-site/scripts/catalog.js` curates which files appear,
how they are grouped, and in what order; `library-site/scripts/build.js` renders them to a
static, offline-capable reader. Nothing is authored in a CMS; there is no second copy to
drift.

This makes the Library a place to **think about the work**, not just publish it: the same
edit that records a result also re-shelves it.

## Organization model

Today the catalog has one axis — `category` (the shelf) — plus free-text `tags`. To make the
Library a reasoning surface we add two more axes (Phase 2):

| Axis | Purpose | Examples |
|------|---------|----------|
| `category` | The shelf (broad domain) | Foundations, Uncertainty & Error, Theory, Formalization |
| `group` | A pivot *within or across* shelves | research round, element, property family, partnership |
| `status` | Epistemic / lifecycle state | `proposed`, `supported`, `refuted`, `self-corrected`, `landed`, `planned` |
| `tags` | Free-text retrieval | `simpson`, `hyper-ribbon`, `phonon` |

`status` is the important new one: it lets a reader (you) browse the **hypothesis lifecycle**
directly — every conjecture with where it stands and *why it moved*, cross-linked to the
changelog entry and the Lean proof that grounds or refutes it.

## The shelves

Existing (recovered): Foundations · Uncertainty & Error · Validation & Benchmarking ·
Theory · Ecosystem & Funding · Formalization · Meta.

Added now (Phase 0): **Changelog & Progress** — the [`CHANGELOG.md`](../CHANGELOG.md)
narrative spine, why/what/results/next.

Added in Phase 2:

- **Conjectures & Proofs** — one entry per hypothesis, `status`-tagged, with evidence IDs and
  links into `lean-spec/` formal proofs. Generated from the hypothesis records, not
  hand-maintained.
- **Partnerships** — pilot mappings (e.g. MIIT-67 ↔ Lupine thesis) under a visibility
  convention: public thesis and methodology; gated commercial terms.

## Roadmap

- **Phase 0 (done).** Recover `library-site/`; external README; `CHANGELOG.md`;
  `docs/PUBLIC.md`; wire changelog + strategy into the catalog. Local-only, no redeploy.
- **Phase 1 (code done; awaits merge).** Confirmed EN fallback already correct in the
  recovered source; made the service worker network-first for `/data/` + added a `KILL`
  cache-eviction token so a bad build can never permanently brick visitors again; recreated
  the deploy as committed IaC (`.github/workflows/deploy-library-site.yml` → recovered
  `cloudbuild.yaml`) that replaces the frozen image on the existing `library-site` Cloud Run
  service. Restoring `library.lupine.science` is now a merge-to-`main`, not a hand-run deploy.
- **Phase 2 (the ambition).** Add `status`/`group` to catalog + build manifest + reader
  facets. Generate the Conjectures & Proofs and Partnerships shelves from the corpus and the
  hypothesis records so the Library updates as research lands. A `make publish` step keeps
  the site in lock-step with the corpus.
- **Phase 3 (door left open).** Many-language support on the EN-fallback-safe i18n base.

## Editorial rules

- Every refuted claim gets a `CHANGELOG.md` entry **and** a `status: refuted` shelf entry
  with the confounder named. Self-correction is a first-class result.
- Negative and null results are published, not buried.
- No artifact exists only on the site — if it is public, it is a Markdown file in this repo.
