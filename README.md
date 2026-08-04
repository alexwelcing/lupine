# Lupine Science — The Projection Law Research Program

[![GitHub Release](https://img.shields.io/badge/release-Projection%20Law%20Round%202-blue)](https://github.com/alexwelcing/lupine/releases/tag/projection-law-round2-2026-06-29)
[![Lupine Library](https://img.shields.io/badge/read-the%20library-3d4db3)](https://library.lupine.science/#/read/projection-law-round2-final)
[![LUPI Viewer](https://img.shields.io/badge/view-LUPI-a8772b)](https://lupi.live)

**Lupine Science is a public research program for understanding where interatomic
potentials fail, why those failures have structure, and how that structure can
guide correction.**

The central idea — the *Projection Law* — is that prediction error is not just
noise. Across potentials, elements, properties, and structure families, errors
can form low-dimensional geometry. If that geometry is stable, it can tell us
what a potential gets wrong, where the next failure is likely, and what
correction or new benchmark would actually matter.

Round 2 delivered the first focused test of this idea against modern
machine-learned interatomic potentials (MLIPs):

- **16 cubic metals** × **4 MatPES MLIPs** × **2 functionals** (PBE, r2SCAN) on
  3×3×3 supercells — 128 cases.
- Raw elastic-constant MAE: **17.84 GPa**.
- After a **class-aware 1-D correction operator**: **10.36 GPa**.
- **Zero no-harm violations** in leave-one-element-out validation.
- The correction transfers across models that share a crystal-family constraint;
  it is not an element-wise fit and does not require the target in the training
  set.

This is a **working draft in preparation**. No peer review, acceptance, or venue
assignment has occurred. Claims are provisional until independent replication.

---

## What the Projection Law does

Molecular dynamics at scale is bottlenecked by two expensive ways of getting
error estimates:

1. **Ensemble averaging** — running multiple models and assuming agreement means
   reliability. The Projection Law asks a sharper question: agreement measures
   the *shared constraint*, not truth. If the constraint is wrong, the ensemble
   is confidently wrong together.

2. **DFT correction loops** — running expensive ab-initio calculations on a
   subset of configurations and regressing locally. The correction is usually
   tied to those specific configurations and has no systematic transfer.

The Projection Law proposes a third path: measure the shared bias direction of a
*model family*, subtract it, and calibrate the residual. The operator is
conceptually one call:

```python
# Target interface (not yet a released package API)
y_corr, interval = correct(
    model=y_mace,           # raw model prediction
    element="Au",           # target element
    family="mlip-pbe",      # constraint family tag
    coverage=0.90           # conformal coverage target
)
```

The current repository contains the research code, data, and formalization that
justify this target — not a polished installable library.

---

## The Science Spine

| Layer | Scientific question | Repository evidence |
| --- | --- | --- |
| Error geometry | Do prediction errors form a low-dimensional manifold across potentials and materials? | IMMI analysis, hyper-ribbon reports, LUPI views |
| Sloppy-model structure | Are stiff and sloppy directions visible in atomistic model error, not just parameter fitting? | `docs/sloppy_models_report.md`, Distill policy work |
| Cross-MLIP transfer | Do foundation MLIPs inherit, rotate, or escape the classical error geometry? | `mlip_immi/`, cross-MLIP alignment payloads |
| Causal and statistical validity | Which patterns survive confounder checks, bootstrap controls, and sample-size matching? | refutation notes, changelog, critique responses |
| Claim lifecycle | Which hypotheses are supported, refuted, corrected, or still open? | `CHANGELOG.md`, `docs/conjectures/ledger.md`, Library shelves |
| Formal specification | Which claims can be moved toward theorem-shaped validation? | `lean-spec/` — statements and a point-core instance; full keystone proof body open |
| Agentic research loop | Can agents propose, test, broadcast, and correct claims against a durable ledger? | `glim-think/`, Phoenix traces, evidence campaigns |

The important cultural point is that refutation is not treated as failure.
Self-correction is part of the method. A claim that changes status should become
more useful, not disappear.

---

## How To Use Lupine

### 1. Read the latest release

- **GitHub Release:** [`projection-law-round2-2026-06-29`](https://github.com/alexwelcing/lupine/releases/tag/projection-law-round2-2026-06-29)
- **Short paper:** [`ProjectionLaw_Round2.pdf`](https://github.com/alexwelcing/lupine/releases/download/projection-law-round2-2026-06-29/ProjectionLaw_Round2.pdf)
- **IMMI companion:** [`ProjectionLaw_IMMI.pdf`](https://github.com/alexwelcing/lupine/releases/download/projection-law-round2-2026-06-29/ProjectionLaw_IMMI.pdf)
- **Ledger entry:** https://library.lupine.science/#/read/projection-law-round2-final

### 2. Browse the public Library

Start with the public Library:

> [library.lupine.science](https://library.lupine.science)

The Library is the human knowledge surface for reports, claim status, evidence
summaries, formal notes, and the working changelog. It is generated from this
repository, so the corpus is the source of truth and the site is a readable
view of it.

Useful local entry points:

| Path | Use it for |
| --- | --- |
| `docs/ONBOARDING.md` | **Start here if you are new** — research-scientist and software-engineer tracks |
| `docs/ARCHITECTURE.md` | System map: how the roots connect into a closed scientific loop |
| `docs/navigation.md` | The 60-second path to the real science, error-geometry objects disambiguated, and honest status of recent additions |
| `docs/GLOSSARY.md` | Shared vocabulary for the science and the system |
| `docs/FAQ.md` | Common questions for scientists and engineers |
| `CHANGELOG.md` | The fastest way to see what changed, what was learned, and what was corrected |
| `docs/conjectures/ledger.md` | Current supported, refuted, and open hypotheses |
| `paper2/` | Projection Law revised manuscript source and submission package |

### 3. Inspect Evidence in LUPI

LUPI is the browser-native viewer for atomistic evidence:

> [lupi.live](https://lupi.live)

Use LUPI when the evidence has structures, trajectories, galleries, or visual
inspection routes. The viewer is not the whole science; it is the inspectable
surface for evidence that benefits from spatial or temporal inspection.

Local code lives under `atlas/`.

### 4. Run or Extend the Work Locally

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

### 5. Add a Scientific Claim

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

---

## What Is Established, Refuted, and Open

Lupine Science is explicit about epistemic status. The exact state changes over
time, so treat `CHANGELOG.md` and the Library as the live record.

| Status | Examples |
| --- | --- |
| Supported | Classical hyper-ribbon error geometry; de-myopization beyond elastic constants preserves structure in early tests; class-aware correction operator on the MatPES 16-element elastic-constant benchmark |
| Refuted by us | The d-band hypothesis was confounded by sample size; the MEAM anomaly weakened under matched-sample bootstrap; the BCC/FCC causal shield was traced to data contamination |
| Open / under re-audit | Full Lean proof of exact tubular universality; deployable no-target magnitude estimator; H3 all-electron anchor; per-element classical-to-MLIP transfer counts after Born screening; Au escape under foundation MLIPs; Fe magnetic failure mode |

---

## Repository Map

For the full root ownership ledger, including keep/elevate/remove-candidate
decisions, see `ROOTS.md`.

| Path | What it contains |
| --- | --- |
| `docs/ONBOARDING.md` | **New contributors start here** — research-scientist and software-engineer tracks |
| `docs/ARCHITECTURE.md` | System map: control plane, compute plane, evidence plane, and data flow |
| `docs/repo-split-map.md` | Planned split into `lupine.science`, `lupi.live`, `library.lupine.science`, and the science/control-plane repo |
| `docs/working-path.md` | Practical checkout, branch, worktree, and verification path |
| `archive/` | Retired surfaces and historical exports |
| `library-site/` | Static-site generator for the Lupine Library |
| `docs/` | Research corpus, reports, plans, runbooks, templates, and hypotheses |
| `mlip_immi/` | IMMI analysis code, benchmark data, and cross-MLIP evidence payloads |
| `lean-spec/` | Lean 4 theorem statements, proof skeletons, and a point-core instance |
| `paper/` | Original IMMI paper source |
| `paper2/` | Projection Law revised manuscript source and submission package |
| `atlas/` | LUPI viewer and atomistic evidence surfaces |
| `atlas-distill/` | Rust runtime for Distill scoring, policy, and fault-line extraction |
| `python/` | Active Python Distill packages: benchmarking, uplift, regime gate, instrumented runtime |
| `glim-think/` | Agentic research control plane, durable agenda, and ledger-backed loop |

The old `lupine-start/` marketing/start site, the `distiller/` KB, the
`lupine-distill/` Rust crate, and the `lupine-dspy/` package have been retired
and archived under `archive/`. Public research should surface through the
Library, the LUPI viewer, and the `glim-think` feed rather than through a
second launch site.

---

## For Contributors

- [`docs/ONBOARDING.md`](./docs/ONBOARDING.md) — research-scientist and software-engineer tracks
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — contribution kinds, workflow, verification commands
- [`scripts/bootstrap.ps1`](./scripts/bootstrap.ps1) / [`scripts/bootstrap.sh`](./scripts/bootstrap.sh) — install lightweight dev deps and run quick checks

## For Collaborators and Observers

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

---

## Brand and Agent Contract

Public-facing surfaces use one naming contract:

| Surface | Canonical name |
| --- | --- |
| Company / research program | Lupine Science |
| Browser viewer | LUPI |
| Viewer URL | [lupi.live](https://lupi.live) |
| Public library | Lupine Library |
| Correction operator research | The Projection Law |

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

---

## Citation

```bibtex
@unpublished{welcing2026projection,
  author  = {Welcing, Alexander},
  title   = {The Projection Law: Model-Ensemble Errors Point at Their Binding Constraint},
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
