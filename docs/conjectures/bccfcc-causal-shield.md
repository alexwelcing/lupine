# The BCC/FCC "Causal Shield"

**Status: Self-corrected**

## What we announced

A dramatic crystal-structure dichotomy: BCC metals showed reference↔prediction error
correlations near-perfect (r ≈ 0.90) while FCC metals showed near-zero (r ≈ 0.04) — a
"causal shield" where crystal structure gates whether potential error is predictable.

## What we found when we audited it

The effect was a **~1.5 % data-contamination artifact**: 19 corrupt records driving the
separation. After purging to 1231 clean records and gating ingestion at
`|pred| > 1500` / `≤ 0`:

- The dramatic shield **disappears**.
- Honest residual: a *modest* BCC > FCC tendency, **no Cauchy relation**.

We added an ingest guard and an idempotent purge to fleet step 0 so the contamination
cannot recur.

## Why this is the headline, not the embarrassment

The real contribution is the **B → C2 → C3′ → C4 self-correction arc** — the same
matched-n / contamination discipline that refuted [d-band](dband-correlation.md) and
[MEAM-2D](meam-intrinsic-2d.md), here turned on our own most exciting result. A program
that retracts its best headline when the data does not hold is one whose surviving
claims you can trust.

## Next

Every refuted claim gets a ledger entry with the confounder named (this page is the
template). Self-correction is treated as a publishable primitive, not a footnote.
