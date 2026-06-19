# Fe Is a Persistent Outlier

**Status: Open — evidence under re-audit (2026-06-11)**

## Claim

Iron (Fe) is the one IMMI element that does *not* sit on the hyper-ribbon, and this is
invariant to which large foundation model (LAM) is added — it is a property of Fe, not
of any one potential or MLIP.

## Evidence

Across the foundation-MLIP trio (MACE-MP-0, CHGNet, Orb-v3), Fe is the held-out 1 of 15
in every "14/15 on the ribbon" result. Its participation ratio stays **PR > 2**
regardless of LAM addition — the outlier status does not move when the model class
changes.

## Why it stays open

The invariance is well-established; the *cause* is not. Fe's magnetism (BCC
ferromagnetic ground state, complex spin-dependent bonding) is the obvious suspect, but
that is a hypothesis, not a result. It is also entangled with the
[BCC > FCC residual](bccfcc-causal-shield.md) and the
[Au escape](au-mlip-escape.md) — the three "special element" findings may share a
mechanism.

## Next

Test the magnetism hypothesis explicitly: stratify Fe potentials by whether they model
spin, and check whether the spin-aware subset rejoins the ribbon.

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