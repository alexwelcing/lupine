# Formal Proof Ledger

> Mirrored on 2026-11-12 from [`lupine-rhizo/docs/formal-proof-ledger.md`](https://github.com/alexwelcing/lupine-rhizo/blob/main/docs/formal-proof-ledger.md), which is the maintained copy. The conjecture ledger in this repository is an unmaintained snapshot.

Which empirical claims have a **machine-checked Lean 4 statement** behind them, what
that statement actually checks, and which claims are deliberately *not* formalized.
Lean 4 checks the arithmetic and stated inequalities behind published numbers; it does
not check the physics, the reference data or the pipeline. A Lean check is a badge
(**Lean-checked arithmetic**), never a result status: an empirical claim with only a
Lean check stays **Open** unless an empirical test supports it.

The authoritative scope statement is the [Formal Audit](formal-audit.md) (corrected
2026-11-04). This ledger maps its dispositions to the
[conjecture ledger](conjectures/ledger.md) and agrees with both.

**Corrected 2026-11-11.** Earlier versions of this page called the hyper-ribbon
dimensionality claim "Proven — empirically grounded" and cited a theorem named
`noSimpsonsInBccEam`, which does not exist in the Lean sources. Both rows are corrected
below.

## Verdicts

| Claim | Lean module / statement | Result status · what the Lean statement checks |
|-------|----------------------|---------|
| Hyper-ribbon manifold dimensionality (PR/n < 0.5) | `Materials/Theory/HyperRibbonEmpirical` · `empirical_hyper_ribbon_holds` | **Open** — descriptive; historical counts not re-verified; low PR is partly rank-limited; classical-to-MLIP alignment is not predictive (ρ = 0.26, p = 0.34). The Lean statement compares a hard-coded Float constant (`0.398… < 0.5`); it loads no data and proves no universality. → [conjecture](conjectures/hyper-ribbon-universality.md) |
| Simpson's paradox in BCC elastic constants | `Materials/Analysis/Causal` · `simpsonsDetectedEmpirical` | **Withdrawn** — the paradox appeared only in a synthetic example; on the recorded NIST data the pooled and within-element correlations do not reverse sign (a `native_decide` computation over the recorded points). The causal-graph argument in `Materials/Theory/MetaScience` is a stated conjecture (`status := conjecture`), not a proof. |
| Parameter / sloppiness bound | `Materials/Theory/ParameterBound` | Checked structural bound (analytic, not data-dependent). |
| Validation scope & rank gate | `Materials/Scope/Validity`, `Materials/Validation/RankGate` | Checked guard conditions used by the live loop. |
| Weak acceleration/refusal scalar gate | `Materials/Theory/WeakAcceleration` | Checked theorem-shaped guard: the scalar speedup lower bound stays >= 1 under coverage/reach/threshold conditions and does not depend on a spectral rho threshold. Full Lipschitz/reach formalization remains open. |

## How to read this

- A row's **result status** comes from empirical tests, not from Lean. No empirical
  claim on this page is currently Supported by a Lean statement alone.
- The Simpson's-paradox row is the useful cautionary example: a striking claim made
  on synthetic data did not hold on the recorded data, and the claim is withdrawn.
  The general lesson that pooled numbers can hide or invert group-level behaviour is
  better illustrated by the withdrawn pooled "1.8× gate efficacy"
  ([errata #3](https://github.com/alexwelcing/lupine-rhizo/blob/main/docs/plans/2026-07-13-errata-and-red-team-dispositions.md)).
- The empirical-only conjectures (d-band, MEAM-2D, Au escape, Fe outlier) are **not**
  formalized: they are statistical claims about a corpus, not theorems. We do not dress
  statistics in proof clothing.

## The epistemic stance

We formalize where the claim is structural, and we let the checked statement overrule
the narrative when they disagree. See [In the In Between](formal-methodology.md) and
[The Open Distillation Factory — Executable Vision](formal-vision.md).

## Next

Formalize the matched-n fairness condition itself, so "this refutation controlled its
confounder" becomes a checked property rather than a methodological promise.
