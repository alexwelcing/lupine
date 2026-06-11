# Hyper-Ribbon Transfers Classical → MLIP

**Status: Supported**

## Claim

The hyper-ribbon is not a quirk of classical force fields. When modern foundation
machine-learning interatomic potentials (MLIPs) are added to the corpus, the same
low-dimensional error geometry holds.

## Evidence

Ingested one foundation MLIP at a time on the 15 IMMI elements:

- **MACE-MP-0:** 14/15 elements stay on the hyper-ribbon.
- **CHGNet** (added on top): 14/15 still on the ribbon.
- **Orb-v3** (completing the trio): 14/15 still on the ribbon; the held-out
  exception (Fe) is consistent across all three — see
  [Fe persistent outlier](fe-persistent-outlier.md).

Separately, the corpus was **de-myopized**: it had been ~99.5 % elastic-constant
records. Recovering real lattice constants ($a_0$) from MLIP provenance (45 records)
and forcing a joint $C_{ij}+a_0$ manifold, the ribbon **survives** (participation
ratio 1.05–2.05). So it is not an artifact of one property family.

## Why it matters

This is the genuinely surprising result. The prior — stated explicitly before the
test — was that the ribbon/dichotomy would *not* transfer from classical to MLIP. It
did. Cross-paradigm survival is the strong evidence; we do not oversell the
sub-findings that did not transfer.

## Next

Add $E_\text{coh}$ and $B_0$ from the Phase-D compute pipeline so the manifold spans
four property families, then re-test ribbon stability across the wider basis.

## Re-audit note (2026-06-11)

Born stability screening (see `replication/error-geometry/`, prereg commits
`dffbe595`/`ebf39e33`) excludes 7 of 45 foundation-model elastic tensors —
including **CHGNet-Fe** (C11 < |C12|), MACE-V, and Orb-v3 Al/Nb/Pb/Pt — so any
per-element PR or on-ribbon count computed from unscreened trio inputs is
contaminated and must be recomputed. Independently, at n = 8–11 Born-stable
models per element, Fe's cross-model alignment is **+0.80** (not an alignment
outlier), and the error AXIS is one-dimensional for all 15 elements (rank-1
share 0.56–0.94). What survives for Fe specifically: one foundation model's
elastic tensor for Fe fails mechanical stability outright — a failure MODE
consistent with the magnetism hypothesis, but a different claim than
"PR > 2 on the ribbon". Recompute before citing this conjecture's evidence.