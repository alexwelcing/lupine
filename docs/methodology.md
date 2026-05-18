# Methodology — How We Know, and How We Catch Ourselves

The reusable core of Lupine is not a result, it is a discipline. Three techniques do
most of the work, and the same techniques are what kill our own bad claims.

## 1. Matched-n comparison

Elements (and potential families) differ in how many potentials exist for them.
Sample size *alone* tightens correlations. So any cross-group correlation is
**confounded by n** until proven otherwise.

The control: down-sample every group to a common n (bootstrap), then compare. A claim
only survives if the effect persists at matched n.

- Killed [d-band](conjectures/dband-correlation.md): full-sample ρ = −0.02; the
  apparent signal was n, not d-band.
- Killed [MEAM-2D](conjectures/meam-intrinsic-2d.md): at matched n = 7, MEAM PR = 1.36
  overlaps Tersoff PR = 1.01.

## 2. Contamination gating

A small fraction of corrupt records can manufacture a dramatic effect. Before
believing any strong result in a noisy corpus, audit the records *driving* it.

- Killed the [BCC/FCC "causal shield"](conjectures/bccfcc-causal-shield.md): the
  r 0.90 vs 0.04 split was 19 corrupt records (~1.5 %). Post-purge: a modest residual,
  no Cauchy relation.
- Now enforced structurally: ingest gate + idempotent purge (see
  [Data & Provenance](data-provenance.md)).

## 3. Ecological-fallacy / stratified evaluation

Correlations pooled across heterogeneous groups can invert when a confounder
(element identity) is ignored — Simpson's paradox / Robinson's ecological fallacy.
Correct analysis requires stratified evaluation and random-effects meta-analysis
(DerSimonian–Laird), not naive pooling. The formal spec went further and proved that
the *specific* Simpson's-paradox claim the original paper made
[cannot arise](formal-proof-ledger.md) under the real causal graph.

## The stance

Strong results in a noisy corpus deserve **suspicion before celebration**. Every
refuted claim is published with its confounder named (the
[conjecture ledger](conjectures/ledger.md) is the register). A method that catches its
own mistakes is the asset; the surviving claims inherit its credibility.

## Lineage

Sloppy models: Brown & Sethna (2003), Transtrum & Sethna (2011). Ecological fallacy:
Robinson (1950), Bickel et al. (1975). Meta-analysis: DerSimonian & Laird (1986).
Causal inference: Pearl (2014).
