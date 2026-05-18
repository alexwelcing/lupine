# Formal Proof Ledger

Which empirical claims are backed by a **machine-checked Lean 4 theorem**, which are
proven-but-synthetic, and which are deliberately *not* formalized. The Lean
specification is the adversary of the prose: where the two disagree, the prose loses.

The authoritative artifact is the [Formal Audit Report](formal-audit.md) — generated
*by* the Lean spec, not written by hand. This ledger maps audit verdicts to the
[conjecture ledger](conjectures/ledger.md).

## Verdicts

| Claim | Lean module / theorem | Verdict |
|-------|----------------------|---------|
| Hyper-ribbon manifold dimensionality (PR/n < 0.5) | `Materials/Theory/HyperRibbonEmpirical` | **Proven — empirically grounded.** Originally consistent only with synthetic data; now grounded on the real corpus. → [conjecture](conjectures/hyper-ribbon-universality.md) |
| Simpson's paradox in BCC elastic constants | `noSimpsonsInBccEam` (`Materials/Analysis/Causal`) | **Claim fabricated.** The causal graph has no bypass from element to error, so elemental stratification cannot produce Simpson's paradox in real data. |
| Parameter / sloppiness bound | `Materials/Theory/ParameterBound` | Proven structural bound (analytic, not data-dependent). |
| Validation scope & rank gate | `Materials/Scope/Validity`, `Materials/Validation/RankGate` | Proven guard conditions used by the live loop. |

## How to read this

- **Proven — empirically grounded** is the strongest tier: a Lean theorem *and* real
  data behind it. Only the hyper-ribbon dimensionality claim currently holds it.
- **Claim fabricated** is the most important row. The original paper asserted a
  Simpson's paradox; the formal spec proved it *cannot exist* under the real causal
  graph. This is self-correction enforced by machine, not by authors — and it is why
  the BCC/FCC story is filed as [self-corrected](conjectures/bccfcc-causal-shield.md).
- The empirical-only conjectures (d-band, MEAM-2D, Au escape, Fe outlier) are **not**
  formalized: they are statistical claims about a corpus, not theorems. We do not dress
  statistics in proof clothing.

## The epistemic stance

We formalize *before* we simulate where the claim is structural, and we let the spec
overrule the narrative. See [In the In Between](formal-methodology.md) and
[The Open Distillation Factory — Executable Vision](formal-vision.md).

## Next

Formalize the matched-n fairness condition itself, so "this refutation controlled its
confounder" becomes a checked property rather than a methodological promise.
