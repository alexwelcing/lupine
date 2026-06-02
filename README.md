# Lupine Science

**Lupine Science is a public research program for understanding where
interatomic potentials fail, why those failures have structure, and how that
structure can guide correction.**

This repository is written first for materials scientists, computational
materials groups, MLIP builders, research software teams, and lab leaders who
need to decide whether a model can be trusted outside the narrow conditions
where it looked accurate.

The central claim is simple but demanding: prediction error is not just noise.
Across potentials, elements, properties, and structure families, errors can form
low-dimensional geometry. If that geometry is stable, it can tell us what a
potential gets wrong, where the next failure is likely, and what correction or
new benchmark would actually matter.

Lupine Science is not a finished product page. It is an operating research
corpus: claims, evidence, refutations, formalization attempts, viewer artifacts,
and a changelog that keeps the self-correction visible.

## Why This Matters To A Materials Lab

Modern materials research increasingly depends on interatomic potentials and
machine-learned interatomic potentials (MLIPs). The hard question is not only
"which model has the lowest benchmark error?" It is:

- Where does this potential fail?
- Are the failures structured or idiosyncratic?
- Does a foundation MLIP inherit the same error geometry as classical models?
- Which apparent trends vanish under matched-sample tests or causal checks?
- Can a claim be inspected, reproduced, refuted, and corrected without losing
  its provenance?

Lupine Science treats those questions as the scientific object. The goal is to
turn model failure into a field of evidence that a human researcher can inspect
and an agentic research system can keep extending.

## The Science Spine

| Layer | Scientific question | Repository evidence |
| --- | --- | --- |
| Error geometry | Do prediction errors form a low-dimensional manifold across potentials and materials? | IMMI analysis, hyper-ribbon reports, LUPI views |
| Sloppy-model structure | Are stiff and sloppy directions visible in atomistic model error, not just parameter fitting? | `docs/sloppy_models_report.md`, Distill policy work |
| Cross-MLIP transfer | Do foundation MLIPs inherit, rotate, or escape the classical error geometry? | `mlip_immi/`, cross-MLIP alignment payloads |
| Causal and statistical validity | Which patterns survive confounder checks, bootstrap controls, and sample-size matching? | refutation notes, changelog, critique responses |
| Claim lifecycle | Which hypotheses are supported, refuted, corrected, or still open? | `CHANGELOG.md`, `docs/conjectures/ledger.md`, Library shelves |
| Formal specification | Which claims can be moved toward theorem-shaped validation? | `lean-spec/`, theory registry direction, proof templates |
| Agentic research loop | Can agents propose, test, broadcast, and correct claims against a durable ledger? | `glim-think/`, Phoenix traces, evidence campaigns |

The important cultural point is that refutation is not treated as failure.
Self-correction is part of the method. A claim that changes status should become
more useful, not disappear.

## How To Use Lupine Science

### 1. Read The Research Corpus

Start with the public Library:

> [library.lupine.science](https://library.lupine.science)

The Library is the human knowledge surface for reports, claim status, evidence
summaries, formal notes, and the working changelog. It is generated from this
repository, so the corpus is the source of truth and the site is a readable
view of it.

Useful local entry points:

| Path | Use it for |
| --- | --- |
| `CHANGELOG.md` | The fastest way to see what changed, what was learned, and what was corrected |
| `docs/conjectures/ledger.md` | Current supported, refuted, and open hypotheses |
| `docs/research_evolution_2026_05_05.md` | Narrative of the research loop and corpus growth |
| `docs/science/SCIENCE_SPINE.md` | Canonical taxonomy for the full scientific program |
| `docs/sloppy_models_report.md` | Mathematical background for hyper-ribbon and sloppy-model framing |
| `docs/tda_error_landscapes_report.md` | Topological framing for error landscapes |
| `paper/` | IMMI manuscript source |

### 2. Inspect Evidence In LUPI

LUPI is the browser-native viewer for atomistic evidence:

> [lupi.live](https://lupi.live)

Use LUPI when the evidence has structures, trajectories, galleries, or visual
inspection routes. The viewer is not the whole science; it is the inspectable
surface for evidence that benefits from spatial or temporal inspection.

Local code lives under `atlas/`.

### 3. Run Or Extend The Work Locally

Build the Library locally:

```bash
cd library-site
npm install
npm run dev
```

Run the Rust scientific engine checks:

```bash
cargo test --manifest-path atlas-distill/Cargo.toml --bin atlas-distill
cargo clippy --manifest-path atlas-distill/Cargo.toml --bin atlas-distill -- -D warnings
```

Run the focused repo gates:

```bash
just think-lint
just engine-test
just live-build
```

On Windows, use Git Bash for Node and build tasks. The root `justfile` already
does this with the explicit Git Bash path.

### 4. Add A Scientific Claim

New claims should be written as evidence-bearing research objects, not loose
marketing copy.

Use these templates:

| Template | Purpose |
| --- | --- |
| `docs/templates/publication.md` | Publication-ready claim, evidence, provenance, and citation structure |
| `docs/templates/proof-pack.md` | Evidence packet for a paper, benchmark, or collaboration review |
| `docs/templates/mlip-failure-geometry-audit.md` | Structured audit of where a potential or MLIP fails |

Every serious claim should identify the model family, material set, property
target, evidence path, status, known confounders, and the next test that could
change its status.

## What Is Established, Refuted, And Open

Lupine Science is explicit about epistemic status. The exact state changes over
time, so treat `CHANGELOG.md` and the Library as the live record.

| Status | Examples |
| --- | --- |
| Supported | Hyper-ribbon error geometry survives the classical-to-MLIP transition for most IMMI elements; de-myopization beyond elastic constants preserves structure in early tests |
| Refuted by us | The d-band hypothesis was confounded by sample size; the MEAM anomaly weakened under matched-sample bootstrap; the BCC/FCC causal shield was traced to data contamination |
| Open | Au escape under foundation MLIPs; Fe as a persistent outlier; prediction of cohesive energy and bulk modulus from the learned geometry |

## Repository Map

For the full root ownership ledger, including keep/elevate/remove-candidate
decisions, see `ROOTS.md`.

| Path | What it contains |
| --- | --- |
| `library-site/` | Static-site generator for the Lupine Library |
| `docs/` | Research corpus, reports, plans, runbooks, templates, and hypotheses |
| `mlip_immi/` | IMMI analysis code, benchmark data, and cross-MLIP evidence payloads |
| `lean-spec/` | Lean 4 proof/specification work |
| `paper/` | IMMI paper source |
| `atlas/` | LUPI viewer and atomistic evidence surfaces |
| `atlas-distill/` | Rust runtime for Distill scoring, policy, and fault-line extraction |
| `glim-think/` | Agentic research control plane, durable agenda, and ledger-backed loop |

The old `lupine-start/` marketing/start site has been retired from the repo.
Public research should surface through the Library, the LUPI viewer, and the
`glim-think` feed rather than through a second launch site.

## For Collaborators And Observers

If you are evaluating the program, the best way to understand it is to watch
the public evidence trail rather than look for a pitch surface.

| Signal | What to watch |
| --- | --- |
| Library updates | Scientific throughput and clarity |
| Claim status changes | Whether the system corrects itself in public |
| LUPI evidence routes | Whether results are inspectable, not just asserted |
| MLIP audit templates | Whether the work can answer concrete model-trust questions |
| `CHANGELOG.md` | Whether progress is cumulative and honest about failure |
| Agent-readable files | Whether search engines and research agents can repeat the story accurately |

## Brand And Agent Contract

Public-facing surfaces use one naming contract:

| Surface | Canonical name |
| --- | --- |
| Company / research program | Lupine Science |
| Browser viewer | LUPI |
| Viewer URL | [lupi.live](https://lupi.live) |
| Public library | Lupine Library |

Avoid retired organization labels, legacy viewer labels, and retired viewer
domains in new copy, metadata, links, and public docs.

Agent-readable files are first-class public artifacts:

| File | Purpose |
| --- | --- |
| `brand.config.json` | Structured source of truth for names, roles, URLs, and retired-language categories |
| `docs/brand/narrative.md` | Human narrative spine for sites, docs, and publications |
| `docs/brand/agent/llms.txt` | Short agent/search guide served from public sites |
| `docs/brand/agent/llms-full.txt` | Full agent/search guide served from public sites |
| `docs/agent-index.md` | Repository-level orientation for coding and research agents |
| `docs/science/science-map.json` | Structured science taxonomy for generated docs and agents |

After editing canonical agent files, run:

```bash
python scripts/sync_brand_agent_text.py
```

That republishes `/llms.txt`, `/llms-full.txt`, and `/brand.json` into the
public static roots.

## Citation

```bibtex
@unpublished{welcing2026causal,
  author  = {Welcing, Alexander},
  title   = {The Causal Geometry of Prediction Errors in Interatomic Potentials:
             A Hyper-Ribbon Manifold Analysis},
  year    = {2026},
  note    = {Working paper, in preparation}
}
```

## License

MIT - see [LICENSE](LICENSE).

## Acknowledgments

This work builds on sloppy-model theory, causal inference, meta-analysis,
materials benchmark infrastructure, OpenKIM/NIST-style potential corpora, and
the broader computational materials community.
