# Lupine Science

Lupine Science measures where machine-learned models of atoms go wrong, against published references and pass/fail gates set in advance, and publishes every verdict, failures included.

[![Lupine Library](https://img.shields.io/badge/read-the%20library-3d4db3)](https://library.lupine.science)
[![LUPI Viewer](https://img.shields.io/badge/view-LUPI-a8772b)](https://lupi.live)

We independently measure the errors of machine-learned interatomic potentials
(MLIPs), test corrections against preregistered gates, record any amendment
made after results are seen, and publish the verdict: pass, fail or abstain.
Correction is a research question here, not a product: it has held only in
narrow, stated cases.

**Start here:** [lupine.science](https://lupine.science) ·
[corrections log](https://lupine.science/corrections/) ·
[Lupine Library](https://library.lupine.science) ·
[LUPI viewer](https://lupi.live)

## What is here

This monorepo is the program record and historical evidence. Active research
happens in [`lupine-rhizo`](https://github.com/alexwelcing/lupine-rhizo); the
Library reader is [`lupine-ledger`](https://github.com/alexwelcing/lupine-ledger)
([library.lupine.science](https://library.lupine.science)); the LUPI viewer at
[lupi.live](https://lupi.live) deploys from
[`alexwelcing/Lupi`](https://github.com/alexwelcing/Lupi).

| Path | What it is |
| --- | --- |
| [`docs/`](docs/), [`CHANGELOG.md`](CHANGELOG.md) | Program record: methodology, preregistrations, runbooks and monorepo history |
| [`paper/`](paper/), [`paper2/`](paper2/), [`mlip_immi/`](mlip_immi/), [`data/`](data/) | Historical evidence: working-draft manuscripts, benchmark data and analysis code |
| [`replication/error-geometry/`](replication/error-geometry/) | Replication kit ([doi:10.5281/zenodo.20787874](https://doi.org/10.5281/zenodo.20787874)). Its functional-clustering result (p = 0.029, against experimental elastic constants) was not reproduced by a later preregistered Round-2 test against DFT targets (effect −0.14, p = 0.13). |
| [`atlas-distill/`](atlas-distill/) | Rust engine, including standard fixed- and random-effects meta-analysis of correlation coefficients across independent groups ([known issues](atlas-distill/README.md#known-issues-fix-pending)) |
| [`docs/conjectures/ledger.md`](docs/conjectures/ledger.md) | Refutation ledger (snapshot; the maintained copy is in [`lupine-rhizo`](https://github.com/alexwelcing/lupine-rhizo/blob/main/docs/conjectures/ledger.md)) |
| [`lean-spec/`](lean-spec/) | Lean 4 statements behind published arithmetic |
| [`atlas/`](atlas/), [`library-site/`](library-site/), [`glim-think/`](glim-think/) | Historical copies of the viewer, Library and control plane |
| [`archive/`](archive/) | Retired surfaces kept for provenance |

## Results, with scope

- **Cubic-metal elastic constants (oracle ceiling).** On 16 elemental cubic
  metals with four MatPES MLIPs (128 cases; r2SCAN targets approximate), one
  bias direction per functional transfers out of sample. When the held-out
  reference sets how far to correct, MAE falls from 17.84 to 10.36 GPa: a
  ceiling, not a deployable correction. A correction that works without
  seeing the answer is still open (the best no-target estimator tested,
  consensus, reached 14.41 GPa but harmed 50 of 128 cases), and derived
  moduli are uncertified.
  ([ProjectionLaw_Round2.md](paper2/ProjectionLaw_Round2.md))

  **Certification boundary:** the 10.36 GPa corrected Cij MAE is an empirical
  oracle aggregate, not a correction clearance. It is **uncertified** unless
  C11, C12, and C44 each independently carry a valid held-out-target
  clearance. Derived moduli and composites (B, G, C′, Cauchy pressure,
  anisotropy, differences, and products) are also **uncertified** because
  componentwise clearances do not compose through those maps.

- **Round 4 (July 2026): no gate passed.** In four preregistered campaigns
  in July 2026 (Round 4), no gate passed: three failed and one abstained. On
  a 30-path Li-ion migration-barrier panel, MACE-MP-0 small and medium,
  MACE-MPA-0 medium and CHGNet missed a 40 meV gate (MAE 135.0–242.5 meV on
  completed paths). A lattice- and elastic-constant correction on rocksalt
  ionics and perovskites failed (ionics 0/4; perovskites 0/1 after a
  post-measurement amendment). Every selected Δ-correction made
  catalyst-adsorption holdout error worse. The magnetism campaign abstained:
  no available model had the spin physics it needed.
  ([field note](https://lupine.science/articles/four-gates-three-honest-failures-one-live-experiment/))

- **fcc surface-energy error field.** For nine fcc metals, an error field
  fitted to three other observables predicted the never-fitted (110)
  surface-energy error of four foundation MLIPs at r = 0.906 across 36
  model–material cells (material-clustered 95% CI 0.82–0.96; permutation
  null centred near 0.44; significant for three of the four models).
  ([manuscript](https://github.com/alexwelcing/lupine-rhizo/blob/main/paper/environment-error-field-2026-07-02.md))

- **Self-corrections.** The BCC/FCC "causal shield" was ~1.5% data
  contamination; a d-band signal was a sample-size artifact; four of seven
  registered Projection Law predictions failed. In the Round-2 elastic
  benchmark the H1 and H2a kill conditions triggered (effect −0.14;
  p = 0.13), H2b's cosine (0.53) missed its 0.8 threshold, and conformal
  coverage reached 86.7% against a 90% target.
  ([maintained ledger](https://github.com/alexwelcing/lupine-rhizo/blob/main/docs/conjectures/ledger.md),
  [ProjectionLaw_Round2.md](paper2/ProjectionLaw_Round2.md))

- **Open.** Classical-potential "hyper-ribbon" geometry: descriptive
  evidence; universality and correction value unproven. Also open: the full
  Lean proof of exact tubular universality, a deployable no-target
  correction, the H3 all-electron anchor, and per-element classical-to-MLIP
  transfer after Born screening.

Every retired public headline is listed, with the date and reason, in the
[corrections log](https://lupine.science/corrections/).

### October 2026 diagnostics, in brief

A retrospective analysis of 800 previously examined configurations (MatPES and
OMat24) found a modest mean ranking gain for model disagreement over a
force-magnitude control, with only about half of configurations improving;
pairwise rank fusion did not consistently beat full disagreement; a learned
shared error direction added little or no advantage over a simple
common-direction baseline; and a uniform-offset control ruled out uniform
force offsets as the majority explanation, which closed the archived branch
with no new physical validation claimed
([explainer](https://lupine.science/articles/what-error-patterns-can-tell-us/),
[disagreement](https://github.com/alexwelcing/lupine-rhizo/blob/f6bb6bc99df6fe42785b617361a80e699abb4d0f/docs/research-progress/2026-10-06-disagreement-panels.md),
[rank fusion](https://github.com/alexwelcing/lupine-rhizo/blob/35db95adec6b3eacc76aaa992165137760f8d84b/docs/research-progress/2026-10-06-rank-fusion.md),
[common error](https://github.com/alexwelcing/lupine-rhizo/blob/28a0fb8e464b61a88aa158621850fe2366415c5e/docs/research-progress/2026-10-06-common-error.md),
[uniform offset](https://github.com/alexwelcing/lupine-rhizo/blob/8b2070f613de20c49667f5db5fef9bb065596a08/docs/research-progress/2026-10-06-uniform-offset.md)).
The proposed 128-group prospective study stopped before execution: a source
audit of the pinned MPtrj data left 9,304 candidate configurations in 8,844
linked groups with physical and training independence unproven, and could
not establish checkpoint-specific training independence or reference
compatibility
([source overlap](https://github.com/alexwelcing/lupine-rhizo/blob/5a680e11db5a18389f4d4058aaff84f8775d28dc/docs/research-progress/2026-10-06-pinned-source-overlap.md),
[stop decision](https://github.com/alexwelcing/lupine-rhizo/blob/29bf23d9ea1bb4b1a8e84c2c2dc301519ac9d505/docs/research-progress/2026-10-06-roster-readiness.md)).
A predictor-provenance repair passes 133 focused checks but covers only the
CHGNet CPU adapter; real-runtime acceptance and the other adapters remain open
([repair and limits](https://github.com/alexwelcing/lupine-rhizo/blob/a761f85b21e2398a73c38c2dd6f3da56a176dcd0/docs/research-progress/2026-10-06-predictor-provenance.md)).
Next is a planned paired-reference microstudy on new, exactly matched
geometries.

## Status

Working drafts. No Lupine paper has been peer-reviewed or accepted yet.
Lean 4 checks the arithmetic and stated inequalities behind published
numbers; it does not check the physics, the reference data or the pipeline.

## Reproduce and build

```bash
# Rust engine (atlas-distill)
cargo test --manifest-path atlas-distill/Cargo.toml --bin atlas-distill

# Python Distill packages
cd python && python -m pytest -m unit -q

# Lean statements (run inside lean-spec/ so the pinned toolchain is used)
cd lean-spec && lake build
```

The replication kit's own instructions are in
[`replication/error-geometry/README.md`](replication/error-geometry/README.md).
Contributor notes, focused gates and Windows guardrails are in
[`CONTRIBUTING.md`](CONTRIBUTING.md) and [`docs/ONBOARDING.md`](docs/ONBOARDING.md);
naming and agent-readable files are described in
[`docs/brand/README.md`](docs/brand/README.md).

## Citation

```bibtex
@unpublished{welcing2026projection,
  author  = {Welcing, Alexander},
  title   = {The Projection Law: Model-Ensemble Errors Point at Their Binding Constraint},
  year    = {2026},
  note    = {Working paper, in preparation}
}
```

Replication kit: https://doi.org/10.5281/zenodo.20787874 · Round-2 draft
package: GitHub release
[`projection-law-round2-2026-06-29`](https://github.com/alexwelcing/lupine/releases/tag/projection-law-round2-2026-06-29)

## Licence

You can reuse our code (MIT) and our first-party text and data (CC BY 4.0)
with attribution and no share-alike obligations. Third-party material keeps
its own terms. See [`LICENSE`](LICENSE), [`LICENSE-CONTENT.md`](LICENSE-CONTENT.md),
[`LICENSE-DATA.md`](LICENSE-DATA.md) and [`NOTICE.md`](NOTICE.md).

## Contact

Research partners, model builders, press and investors: alex@lupinesci.com.

## Acknowledgments

This work builds on sloppy-model theory, causal inference, meta-analysis,
materials benchmark infrastructure, OpenKIM/NIST-style potential corpora, and
the broader computational materials community.
