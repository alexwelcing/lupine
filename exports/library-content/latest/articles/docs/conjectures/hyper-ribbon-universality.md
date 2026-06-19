# Hyper-Ribbon Universality

**Status: Supported · Proven (Lean)**

## Claim

Prediction-error vectors for elastic constants ($C_{11}$, $C_{12}$, $C_{44}$) across
hundreds of interatomic potentials do not fill error space. They are compressed onto a
low-dimensional **hyper-ribbon** manifold — effective dimensionality far below the
nominal 3 — consistent with the sloppy-model universality class of Brown & Sethna and
Transtrum & Sethna.

## Evidence

- 559 potentials × 15 benchmark metals (8 FCC, 7 BCC), elastic-constant errors from
  OpenKIM, cross-referenced against the NIST Interatomic Potentials Repository.
- Effective (participation-ratio) dimensionality consistently **1.05–1.86 of 3**.
- The structure is not an elastic-constant artifact — see
  [the de-myopization result](hyper-ribbon-mlip-transfer.md): it survives when lattice
  constant $a_0$ is added to the manifold (joint PR 1.05–2.05).

## Formal cross-check

Lean module `Materials/Theory/HyperRibbonEmpirical`. The
[Formal Audit](../formal-audit.md) verdict for this claim:
**"CLAIM PROVEN — EMPIRICALLY GROUNDED."** Originally the theorem was only consistent
with synthetic data; it is now empirically grounded against the real corpus.

## Why it matters

If error is low-dimensional and structured, it is *predictable* and *correctable* —
which is the entire premise of the program. A high-dimensional unstructured error would
have killed the thesis.

## Next

Extend the manifold to four property families (add $E_\text{coh}$, $B_0$ via the
Phase-D compute lane) and re-test that the ribbon survives the wider basis.
