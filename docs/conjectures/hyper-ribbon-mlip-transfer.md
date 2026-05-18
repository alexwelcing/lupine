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
