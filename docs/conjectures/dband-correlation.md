# D-Band Controls Error Correlation

**Status: Refuted by us**

## Claim (as originally proposed)

A metal's d-band character governs how well potentials predict its elastic-constant
errors — d-band filling would explain the reference↔prediction correlation structure.

## How we tested it

Computed the correlation on the **full sample**, then ran a matched-n analysis to
separate a real d-band effect from a sample-size artifact (elements with more potentials
have tighter correlations regardless of physics).

## Result — refuted

- Full-sample correlation: **ρ = −0.02** — essentially nothing.
- The apparent signal was a **sample-size confounder**: ρ = −0.50 to −0.66 when
  conditioned on n, not on d-band.
- A residual d-band signal *only* recovers on the n ≥ 3 subset (ρ = +0.52) — i.e. it is
  visible only where the confounder is controlled, and is weak.

## Why it matters

This is the first clean demonstration of the program's self-correction discipline: an
attractive mechanistic story, killed by a fair test, with the confounder named
(sample size). The same matched-n method later refuted the
[MEAM intrinsically-2D claim](meam-intrinsic-2d.md) — one method, two refutations.

## Next

Treat sample-size imbalance as a first-class confounder in every cross-element claim;
report matched-n alongside any pooled correlation.
