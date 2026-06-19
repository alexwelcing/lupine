# Cross-MLIP Orthogonal Error Modes

**Status: Supported**

## Claim

Different foundation MLIPs do not just have *different-sized* errors — they have errors
pointing in **orthogonal directions** for certain elements. The mistakes are
structured and model-specific, not shared noise.

## Evidence

- MACE-MP-0 and CHGNet have **orthogonal error directions on Ag, Nb, Pd** — where one
  model is wrong, the other is wrong differently, not more.
- This is what lets CHGNet "pull back" Ag while MACE lets it escape (see
  [Au/Ag escape](au-mlip-escape.md)) — the models disagree in direction, not magnitude.
- The cross-MLIP alignment hypothesis (`hyp_mlip_alignment_test`) — that the
  element-intrinsic error dichotomy would *extend* to foundation MLIPs as a shared
  axis — was **refuted** (ρ = 0.19, p = 0.51). Orthogonality is the surviving picture.

## Why it matters

Orthogonal error modes are exactly the precondition for *ensemble* error correction:
if two models fail independently, combining them is informative. A shared error axis
would have made ensembling useless. This is the constructive flip-side of the
alignment refutation.

## Next

Quantify the orthogonality as an ensemble-gain estimate: how much error reduction is
available from a MACE+CHGNet+Orb ensemble on the orthogonal elements?
