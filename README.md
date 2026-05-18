# Lupine — the error geometry of interatomic potentials

**An open research program studying *where and why* interatomic potentials fail — and turning that error structure into something predictive.**

Every atomistic simulation rests on an interatomic potential, and every potential is wrong in
some structured way. Lupine treats that wrongness as the object of study: we measure prediction
error across ≈900 published potentials, look for its geometry (a low-dimensional "hyper-ribbon"
manifold in the sloppy-models lineage of Brown & Sethna, Transtrum & Sethna), and test whether
that geometry is stable enough to *predict* error on unseen systems.

This is a working research corpus, not a finished product. We publish the conjectures, the
refutations, the proofs, and the changelog — including the times we corrected ourselves.

---

## The public Library

The single place to read and think about this work is the **Lupine Library**:

> **[library.lupine.science](https://library.lupine.science)** — every research report, the
> hypothesis lifecycle (proposed → supported/refuted → self-corrected), formal Lean proofs,
> and a working changelog, organized by shelf and searchable.

The Library is generated from this repository — see [`library-site/`](library-site/) and
[`docs/PUBLIC.md`](docs/PUBLIC.md) for how the corpus becomes the site. The corpus *is* the
source of truth; the site is a view of it.

## What is established vs. conjectured

We are explicit about epistemic status — see [`CHANGELOG.md`](CHANGELOG.md) and the
hypothesis shelf in the Library.

| Status | Examples |
|--------|----------|
| **Supported** | Hyper-ribbon error manifold survives the classical→MLIP transition (14/15 IMMI elements); survives de-myopization beyond elastic constants (spans C_ij + a₀) |
| **Refuted (by us)** | D-band hypothesis (sample-size confounder); MEAM intrinsic-2D anomaly (matched-n bootstrap); BCC/FCC "causal shield" (was a 1.5% data-contamination artifact) |
| **Open** | Au escape across foundation MLIPs; Fe persistent outlier; predicting E_coh / B₀ from the manifold |

The self-correction arc (finding our own contamination and bootstrap confounders, then
publishing the retraction) is the methodological contribution, not an embarrassment to hide.

## Repository map

| Path | What |
|------|------|
| `library-site/` | The public Library — static-site generator (catalog → MD → reader) |
| `docs/` | The research corpus: technical reports, formal vision/methodology/audit, hypotheses |
| `mlip_immi/` | IMMI paper analysis code and benchmark data |
| `lean-spec/` | Formal Lean 4 proofs (theorem-driven validation) |
| `paper/` | IMMI journal submission source |
| `atlas/` | Atlas View — WebGPU explorer for the cross-potential error manifold |
| `glim-think/` | The research loop: hypothesis lifecycle, Phoenix-traced evals, Evolver |
| `CHANGELOG.md` | Working changelog — what changed, **why**, results, suggested next steps |

## Quick start

```bash
# Read the corpus locally (builds the Library, serves on :5173)
cd library-site && npm install && npm run dev

# Run the scientific engine
cd atlas-distill && cargo run --release -- validate --full
```

## Citation

```bibtex
@article{welcing2026causal,
  author  = {Welcing, Alexander},
  title   = {The Causal Geometry of Prediction Errors in Interatomic Potentials:
             A Hyper-Ribbon Manifold Analysis},
  journal = {Integrating Materials and Manufacturing Innovation},
  year    = {2026},
  note    = {In press}
}
```

## License

MIT — see [LICENSE](LICENSE).

## Acknowledgments

Sloppy models: Brown & Sethna (2003), Transtrum et al. (2010–2013). Causal inference:
Pearl (2014). Meta-analysis: DerSimonian & Laird (1986). Benchmark infrastructure:
OpenKIM / NIST IPR.
