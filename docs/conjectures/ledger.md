# Conjectures & Proofs — The Hypothesis Ledger

Every claim Lupine has seriously tested, where it stands, and *why it moved*. This is
the structured counterpart to the narrative changelog: the changelog tells the story,
the ledger tells the state.

Each hypothesis is its own entry with a lifecycle **status**. The status legend:

| Status | Meaning |
|--------|---------|
| **Supported** | Survives the strongest test we have applied so far. |
| **Open** | Live; evidence is partial or mixed. |
| **Refuted by us** | We tried to confirm it and the effect did not survive a fair test. The confounder is named. |
| **Self-corrected** | We *announced* something, then found our own error and retracted it. |
| **Proven (Lean)** | Cross-checked by a machine-checked Lean 4 theorem. |

## The ledger

| Hypothesis | Status | One-line resolution |
|------------|--------|---------------------|
| Hyper-ribbon universality (classical potentials) | Supported · Proven | Error vectors occupy a low-dimensional manifold; Lean-grounded. |
| Hyper-ribbon transfers classical → MLIP | Supported | 14/15 IMMI elements stay on the ribbon when MACE / CHGNet / Orb-v3 are added. |
| Cross-MLIP orthogonal error modes | Supported | MACE and CHGNet have orthogonal error directions on Ag/Nb/Pd. |
| Au escapes the ribbon under foundation MLIPs | Open | Confirmed for MACE+CHGNet; Ag escape refuted. |
| Fe is a persistent outlier | Open | PR > 2 invariant to LAM addition across the trio. |
| D-band controls error correlation | **Refuted by us** | Sample-size confounder (full-sample ρ = −0.02). |
| MEAM is intrinsically 2-D | **Refuted by us** | Matched-n bootstrap: MEAM overlaps Tersoff. |
| BCC/FCC "causal shield" | **Self-corrected** | The dramatic r 0.90 vs 0.04 was 1.5 % data contamination. |
| Simpson's paradox in BCC elastic constants | **Refuted by us · Lean** | `noSimpsonsInBccEam`: the causal graph has no bypass. |

## Why this shelf exists

The most defensible thing Lupine produces is not a single result — it is a *method that
catches its own mistakes*. The d-band and MEAM refutations and the BCC/FCC
self-correction all came from the same matched-n / contamination-gate discipline. Making
the refutations as visible as the confirmations is the point: a corpus you can trust is
one that publishes what it killed.

See also: [Formal Proof Ledger](../formal-proof-ledger.md) ·
[Methodology](../methodology.md) · [Data & Provenance](../data-provenance.md).
