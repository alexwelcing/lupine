# Lupine Science: results, with scope

Moved from the root [README](../README.md) on 2026-11-13, when the README was cut
to one screen. The text is unchanged; only link paths are adjusted for this folder.
The public summary of what held and what did not is at
[lupine.science/results](https://lupine.science/results/).

## Results, with scope

- **Cubic-metal elastic constants (oracle ceiling).** On 16 elemental cubic
  metals with four MatPES MLIPs (128 cases; r2SCAN targets approximate), one
  bias direction per functional transfers out of sample. When the held-out
  reference sets how far to correct, MAE falls from 17.84 to 10.36 GPa: a
  ceiling, not a deployable correction. A correction that works without
  seeing the answer is still open (the best no-target estimator tested,
  consensus, reached 14.41 GPa but harmed 50 of 128 cases), and derived
  moduli are uncertified.
  ([ProjectionLaw_Round2.md](../paper2/ProjectionLaw_Round2.md))

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
  [ProjectionLaw_Round2.md](../paper2/ProjectionLaw_Round2.md))

- **Open.** Classical-potential "hyper-ribbon" geometry: descriptive
  evidence; universality and correction value unproven. Also open: the full
  Lean proof of exact tubular universality, a deployable no-target
  correction, the H3 all-electron anchor, and per-element classical-to-MLIP
  transfer after Born screening.

Every retired public headline is listed, with the date and reason, in the
[corrections log](https://lupine.science/corrections/).

### October 2026 diagnostics, in brief

A retrospective analysis of previously examined data (800 configurations,
MatPES and OMat24) found that a learned shared error direction added little or
no advantage over a simple common-direction baseline; no new physical
validation is claimed
([explainer](https://lupine.science/articles/what-error-patterns-can-tell-us/)).
On the same archive, model disagreement gave a modest mean ranking gain over a
force-magnitude control, with only about half of configurations improving;
pairwise rank fusion did not consistently beat full disagreement; and a
uniform-offset control ruled out uniform force offsets as the majority
explanation, which closed the archived branch
([disagreement](https://github.com/alexwelcing/lupine-rhizo/blob/f6bb6bc99df6fe42785b617361a80e699abb4d0f/docs/research-progress/2026-10-06-disagreement-panels.md),
[rank fusion](https://github.com/alexwelcing/lupine-rhizo/blob/35db95adec6b3eacc76aaa992165137760f8d84b/docs/research-progress/2026-10-06-rank-fusion.md),
[common error](https://github.com/alexwelcing/lupine-rhizo/blob/28a0fb8e464b61a88aa158621850fe2366415c5e/docs/research-progress/2026-10-06-common-error.md),
[uniform offset](https://github.com/alexwelcing/lupine-rhizo/blob/8b2070f613de20c49667f5db5fef9bb065596a08/docs/research-progress/2026-10-06-uniform-offset.md)).
A proposed prospective study stopped before execution because training
independence and reference compatibility could not be established; details and
limits, including the open predictor-provenance work, are in the linked
research notes
([source overlap](https://github.com/alexwelcing/lupine-rhizo/blob/5a680e11db5a18389f4d4058aaff84f8775d28dc/docs/research-progress/2026-10-06-pinned-source-overlap.md),
[stop decision](https://github.com/alexwelcing/lupine-rhizo/blob/29bf23d9ea1bb4b1a8e84c2c2dc301519ac9d505/docs/research-progress/2026-10-06-roster-readiness.md),
[predictor provenance](https://github.com/alexwelcing/lupine-rhizo/blob/a761f85b21e2398a73c38c2dd6f3da56a176dcd0/docs/research-progress/2026-10-06-predictor-provenance.md)).
Next is a planned paired-reference microstudy on new, exactly matched
geometries.

## Status

Working drafts. No Lupine paper has been peer-reviewed or accepted yet.
Lean 4 checks the arithmetic and stated inequalities behind published
numbers; it does not check the physics, the reference data or the pipeline.

## More

- [Overview](overview.md)
- [Repository map](repository-map.md)
- [Development](development.md)
