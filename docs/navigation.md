# Start Here — navigating Lupine Science

The fastest path from "what is this?" to the real science. Paths are relative to
the repo root (this checkout — there is **no** `glim/` superfolder; an earlier
version of this file claimed one, that was stale).

For the narrative front door, read [`README.md`](../README.md). This file is the
**map**: where the real information lives and the order to read it in.

---

## What we do, in one sentence

Lupine Science measures where machine-learned models of atoms go wrong, against
published references and pass/fail gates set in advance, and publishes every
verdict, failures included. The earlier "hyper-ribbon" reading (errors of many
potentials collapsing onto one low-dimensional structure) is now **Open** and
descriptive only; see the maintained
[hypothesis ledger](https://github.com/alexwelcing/lupine-rhizo/blob/main/docs/conjectures/ledger.md).

## The 60-second path to the real info

Read in this order. Each row is the canonical source for that layer.

| # | Read | For |
|---|---|---|
| 0 | [`docs/ONBOARDING.md`](./ONBOARDING.md) | **New contributor? Start here.** Research-scientist vs software-engineer tracks, install steps, and common pitfalls. |
| 0.5 | [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) | how the repo's roots connect into a closed scientific loop |
| 1 | [`README.md`](../README.md) → "What is here" and "Results, with scope" | what this repo holds and what our results do and do not show |
| 2 | [`docs/methodology.md`](./methodology.md) | how claims are tested |
| 3 | [`lit-review.md`](../lit-review.md) | the assembled review: sloppy theory + Simpson's-paradox/permutation methodology + benchmarking |
| 4 | [`docs/data-provenance.md`](./data-provenance.md) | **where every number comes from** — OpenKIM elastic constants vs NIST, 559 model–element tensors (423 distinct KIM ids) × 15 metals, LAMMPS for Phase-D |
| 5 | [hypothesis ledger (lupine-rhizo)](https://github.com/alexwelcing/lupine-rhizo/blob/main/docs/conjectures/ledger.md) · [`docs/conjectures/ledger.md`](./conjectures/ledger.md) | the maintained **claim ledger** (supported / open / failed / refuted / self-corrected); the copy here is a snapshot |
| 6 | [`paper/immi-paper.tex`](../paper/immi-paper.tex) | the IMMI manuscript (working draft, not peer-reviewed) |
| 7 | [`CHANGELOG.md`](../CHANGELOG.md) · [corrections log](https://lupine.science/corrections/) | monorepo history through 2026-06-19; retired public headlines with dates and reasons |
| 8 | [`lean-spec/`](../lean-spec/) · [`docs/formal-proof-ledger.md`](./formal-proof-ledger.md) | the formal-specification layer |

Deeper theory reports: the archived literature foundation
[`immi_dim01_sloppy_theory.md`](../archive/swarm_preprint_review/research/immi_dim01_sloppy_theory.md)
(sloppy models and the hyper-ribbon, with primary sources),
[`docs/sloppy_models_report.md`](./sloppy_models_report.md),
[`docs/tda_error_landscapes_report.md`](./tda_error_landscapes_report.md),
[`docs/phonon_benchmarking_report.md`](./phonon_benchmarking_report.md).

## The error-geometry objects — disambiguated (read this before "ribbon" anything)

> **Canonical version: [`docs/science/objects.md`](./science/objects.md).** Read that
> before writing "ribbon" anything — it has the full definitions, sources, the
> claim→object mapping, and the mathematical-coupling caveat. The table below is the
> one-screen summary.

Three *different* objects travel under "low-dimensional error." Conflating them is
the single biggest source of confusion in this corpus (the author of this file
included). Keep them straight:

| Object | Where it lives | What it is | Canonical source |
|---|---|---|---|
| **A. The sloppy model manifold** (the actual *hyper-ribbon*) | data / prediction space | image `y(θ)` of the prediction map as parameters vary; a bounded manifold with a geometric hierarchy of widths `Wₙ ~ W₀·Δⁿ` | Transtrum–Machta–Sethna 2010/2011 — see `immi_dim01` §2 |
| **B. The empirical effective-dimensionality** | observable space (e.g. C11/C12/C44) | participation ratio `PR = (Σλ)²/Σλ²` of the **error covariance** across potentials (PR ≈ 1.05–1.86 of 3 → near-1D ribbon). This is how you *measure* A from data — **not** a separate manifold. | `immi_dim01` §4; `archive/lupine-distill-rust/src/hypothesis/manifold.rs` |
| **C. The configuration-space error core** | configuration space `Ω ⊂ ℝᵐ` | a low-dim core `H` with the error boundary a codim-1 tube around it; a *distinct, more demanding* object with a **conditional** universality theorem | the archived PDF [*"A Conditional Universality Theorem for Error Geometry in MLIPs"*](../archive/reports/A%20Conditional%20Universality%20Theorem%20for%20Error%20Geometry%20in%20Machine-Learning%20Interatomic%20Potentials.pdf) |

A and B are the established program (B measures A; standard sloppy-model usage). C
is a separate, rigor-first reframing whose theorem is **conditional** on nonstandard
assumptions (notably "A6", that different models share spatial error modes). Bridging
B→C is *not* automatic — it needs A6, which had never been tested.

## Claim status

The maintained record is the
[hypothesis ledger in lupine-rhizo](https://github.com/alexwelcing/lupine-rhizo/blob/main/docs/conjectures/ledger.md);
[`docs/conjectures/ledger.md`](./conjectures/ledger.md) here is a snapshot. In
brief: **open** — hyper-ribbon universality (descriptive only), classical→MLIP
transfer after Born screening, Au escape, Fe magnetic failure mode; **refuted by
us** — d-band (sample size), MEAM anomaly (matched-n bootstrap);
**self-corrected** — BCC/FCC shield (data contamination).
Per-conjecture detail: [`docs/conjectures/`](./conjectures/).

## 2026-06-02 additions (MiniMax-M3 upgrade and the live campaign) and their status

Engineering and exploration added 2026-06-02. **Read the status column before
trusting any of it.**

| Artifact | What | Status |
|---|---|---|
| [`docs/glim-m3-upgrade/`](./glim-m3-upgrade/README.md) | MiniMax M2.7→M3 model-axis upgrade for the Theorist agent + process docs | **Solid engineering.** The model axis is typechecked, tested. Live M2.7-vs-M3 numbers still need a key. |
| [`docs/glim-m3-upgrade/runs/live-campaign-results.md`](./glim-m3-upgrade/runs/live-campaign-results.md) | live Cloud-Run distill campaign (energy/forces/stress/elastic) | **Provisional.** Real measurements, but it's MLIP **energy MAE on MPtrj DFT rows** — a *different lane* from the OpenKIM/NIST elastic-constant corpus the ribbon is built on. The distill "win" is an energy-block recalibration that does **not** move forces; do **not** read it as a model improvement. |
| `lean-spec/.../Theory/RibbonProjection.lean` | a kernel-checked parallel/orthogonal correction parabola | **Toy — mislocated object.** It formalizes a scalar decomposition, not the model manifold (A) or the keystone core (C). Keep as a concentration lemma; do not cite as "the ribbon, formalized." |
| [`docs/glim-m3-upgrade/runs/a6-alignment-results.md`](./glim-m3-upgrade/runs/a6-alignment-results.md) | first test of the keystone "A6" shared-mode assumption | **Provisional — confound not controlled.** Signal is real (same atoms hard across MLIPs) but the test does **not** yet control for elastic-constant **mathematical coupling** (Cauchy relation / stability) that Jackson–Somers 1991 and Archie 1981 warn produces a non-zero baseline correlation. Treat as method + first signal only. |
| [`docs/science/keystone-reconciliation.md`](./science/keystone-reconciliation.md) | reconciling the repo with the keystone paper | **Read with its own correction banner** — its original "category error" framing overstated the case (see banner at top of that file). |

## Repo structure and support

- [`docs/ONBOARDING.md`](./ONBOARDING.md) — contributor tracks, install, and verification
- [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) — system architecture and data flow
- [`docs/GLOSSARY.md`](./GLOSSARY.md) — shared vocabulary
- [`docs/FAQ.md`](./FAQ.md) — common questions
- [`ROOTS.md`](../ROOTS.md) — authoritative root-ownership ledger
[`archive/`](../archive/) holds retired surfaces (see its README).
`atlas-distill/` is the Rust engine; `python/` the Python Distill packages;
`mlip_immi/` the real-data lane; `lean-spec/` the formal layer; `paper/` and
`paper2/` the working-draft manuscripts. `glim-think/`, `library-site/` and
`atlas/atlas-view/` are historical copies: active research is in lupine-rhizo,
the Library deploys from lupine-ledger and the LUPI viewer from
`alexwelcing/Lupi`.

For the machinery (control plane, distill engine, MLIP campaigns, cloud compute,
the M3 upgrade), see the **engineering index**:
[`docs/engineering/README.md`](./engineering/README.md). The decision behind this
arrangement: [`docs/decisions/0002-documentation-architecture.md`](./decisions/0002-documentation-architecture.md).

## Stale-doc notes

- This file **replaces** the previous `navigation.md`, which was a viewer codemap
  mislabeled as the repo guide and described a non-existent `glim/` root.
- [`docs/research-index.md`](./research-index.md) is **partly stale**: it references
  four root research docs (`deep-research-report.md`, `ancillary-research-opps.md`,
  `foundational-research.md`, `example-research-papers.md`) that **no longer exist**,
  and uses the old `glim/` path convention. Its glimPSE/LAMMPS-ecosystem product
  summaries are a different facet from the science; use this file for the science.
- [`docs/distill_kart_race_live_win.md`](./distill_kart_race_live_win.md) is **stale /
  superseded** by the corrected 2026-06-02 MPtrj live campaign; the "5–7× faster"
  headline overstates the accelerate tier.
- [`docs/distill_improvement_atlas.md`](./distill_improvement_atlas.md) is a **stale
  campaign snapshot**: its "6 accelerate-wins" claim was nullified and its Ni-EAM
  regressions are the v0 ungated harms now caught by the regime gate.
- The three `docs/EXTRACTION_*.md` files and [`docs/KEY_FINDINGS_SUMMARY.md`](./KEY_FINDINGS_SUMMARY.md)
  are one-time extraction process logs with dead `/sessions/...` paths; read the
  corresponding full reports instead.
- [`docs/research_evolution_2026_05_05.md`](./research_evolution_2026_05_05.md) is a
  **historical snapshot**; its "14/15 on-ribbon" claim was later re-audited.
- [`docs/mlip-distill-local-theory-growth-lane.md`](./mlip-distill-local-theory-growth-lane.md)
  is **provisional** (replay-only candidate, pending a fresh Cloud Run canary).
