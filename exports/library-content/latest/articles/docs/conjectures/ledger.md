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
| Hyper-ribbon transfers classical → MLIP | Under re-audit (2026-06-11) | Prior evidence: 14/15 on-ribbon under MACE/CHGNet/Orb-v3. Born screening (replication/error-geometry) excludes 7/45 foundation-model tensors (incl. CHGNet-Fe, MACE-V, Orb Al/Nb/Pb/Pt); per-element counts must be recomputed on screened inputs. Directional structure independently confirmed at n=8–11 models (rank-1 share 0.56–0.94). |
| Projected hyper-ribbon release | Open | New Lean-first release lane: prove projected-ribbon gates, then require replay plus cloud evidence before promotion. |
| Cross-MLIP orthogonal error modes | Supported | MACE and CHGNet have orthogonal error directions on Ag/Nb/Pd. |
| Au escapes the ribbon under foundation MLIPs | Open | Confirmed for MACE+CHGNet; Ag escape refuted. |
| Fe is a persistent outlier | Open | PR > 2 invariant to LAM addition across the trio. |
| D-band controls error correlation | **Refuted by us** | Sample-size confounder (full-sample ρ = −0.02). |
| MEAM is intrinsically 2-D | **Refuted by us** | Matched-n bootstrap: MEAM overlaps Tersoff. |
| BCC/FCC "causal shield" | **Self-corrected** | The dramatic r 0.90 vs 0.04 was 1.5 % data contamination. |
| Simpson's paradox in BCC elastic constants | **Refuted by us · Lean** | `noSimpsonsInBccEam`: the causal graph has no bypass. |

## 2026-06-07 Kimi MLIP Import

| Hypothesis | Status | One-line resolution |
|------------|--------|---------------------|
| Parameter-basis Vandermonde decay in foundation MLIPs | **Refuted by us** | The 4-model Fisher sweep fails rho >= 1.5; MACE parameter-basis rho is flat while CHGNet/SchNet only reach about rho 0.4. |
| MACE irrep-basis Vandermonde threshold | **Refuted by us** | Irrep coefficients show real geometric decay (rho 0.3865, R2 0.9807), but still fail the pre-registered rho >= 1.5 threshold. |
| Weak-form acceleration/refusal theorem | Open | Scalar weak-form gate now builds in Lean; full Lipschitz/reach formalization and deeper-model runtime evidence remain open. |
| Layerwise distance as MLIP/MD uncertainty signal | Open | Layer-0 distance correlates with force error and helps mixed-reference refusal, but Cu-only reference tuning failed and force-calibrated follow-up is needed. |
| Kimi Cloud Run cross-MLIP v7 | Supported | 45 MACE/CHGNet/SevenNet elastic calculations are preserved; Fe is a MACE-disagreement sentinel, while Ta/V/Pt have the highest 3-MLIP PR values. |

See also:
[Kimi MLIP Universality Import](../science/kimi-mlip-universality-import.md) ·
[Cross-MLIP Cloud Experiment Runbook](../runbooks/cross-mlip-cloud-experiment.md).

## Why this shelf exists

The most defensible thing Lupine produces is not a single result — it is a *method that
catches its own mistakes*. The d-band and MEAM refutations and the BCC/FCC
self-correction all came from the same matched-n / contamination-gate discipline. Making
the refutations as visible as the confirmations is the point: a corpus you can trust is
one that publishes what it killed.

See also: [Formal Proof Ledger](../formal-proof-ledger.md) ·
[Methodology](../methodology.md) · [Data & Provenance](../data-provenance.md).
