# Data & Provenance

Where every number in the corpus comes from. The manifold is only as trustworthy as its
inputs, so this page is deliberately explicit.

## Sources

| Source | Role |
|--------|------|
| **OpenKIM** | Primary prediction source — elastic constants from published interatomic potentials, queried via the OpenKIM API. |
| **NIST Interatomic Potentials Repository (IPR)** | Cross-reference and ground-truth anchor for potential identity and reference properties. |
| **MLIP provenance records** | Lattice constants ($a_0$) recovered from the originating MLIP runs — the basis for the de-myopization that proved the ribbon is not a $C_{ij}$ artifact. |
| **Phase-D compute lane** | Real LAMMPS runs (not cache) that produce $E_\text{coh}$/$B_0$ and surface recipe bugs the cached pipeline masked. |

## Scope of the corpus

- **559 interatomic potentials** spanning 13 `pair_style` families.
- **15 benchmark metals** — 8 FCC, 7 BCC (the IMMI element set).
- Plus the foundation-MLIP trio added on top: **MACE-MP-0, CHGNet, Orb-v3**.
- Properties: elastic constants $C_{11}, C_{12}, C_{44}$ (primary); lattice constant
  $a_0$ (de-myopization); $E_\text{coh}, B_0$ (Phase-D, in progress).

## Integrity controls

These exist because we got burned — see
[the BCC/FCC self-correction](conjectures/bccfcc-causal-shield.md):

- **Ingest gate:** records with `|pred| > 1500` or `≤ 0` are rejected at ingestion.
- **Idempotent purge** at fleet step 0, so a contaminated record cannot survive a
  re-run. The contamination event removed 19 corrupt records → **1231 clean records**.
- **Matched-n discipline:** any cross-element correlation is reported alongside its
  sample-size-matched control (see [Methodology](methodology.md)).

## What we do *not* claim

The corpus is metals-elastic-heavy. Statements outside that regime are methodological
("the method transfers") not empirical ("we measured it") until Phase-D widens the
property basis. The ledger marks every such boundary explicitly.

## Reproducibility

Every figure is regenerable from these sources via the open `atlas-distill` engine —
see [Reproduce Our Results](reproduce.md).
