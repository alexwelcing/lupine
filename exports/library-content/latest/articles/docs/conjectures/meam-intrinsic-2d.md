# MEAM Is Intrinsically 2-D

**Status: Refuted by us** (a narrower standalone claim survives)

## Claim (as originally proposed)

The MEAM (Modified Embedded-Atom Method) potential family has an *intrinsically* 2-D
error manifold — structurally lower-dimensional than other pair-style families.

## How we tested it

Matched-n bootstrap: compare MEAM's manifold dimensionality against a comparison family
(Tersoff) at the **same sample size**, so the comparison is not contaminated by MEAM
simply having a different number of potentials.

## Result — refuted

At matched n = 7, MEAM median participation ratio **PR = 1.36 overlaps** Tersoff
**PR = 1.01**. The "intrinsically 2-D" gap disappears under a fair comparison — the
same sample-size confounder flavor as the [d-band refutation](dband-correlation.md).

**What survives:** a *narrower* standalone claim — `hyp_meam_intrinsically_2d` with the
full-n confidence interval **PR ∈ [1.58, 2.39]** — is proposed at moderate confidence
(~0.80). The strong universal phrasing is dead; a bounded descriptive statement remains.

## Why it matters

Refutation is not all-or-nothing. The honest outcome is: the dramatic claim fails, a
modest measurable one stands, and the boundary between them is stated explicitly.

## Next

Carry the standalone bounded claim forward as `open`; do not re-assert the strong
"intrinsic" framing.
