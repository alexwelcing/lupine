# IMMI Paper Additions Outline

## Additions to existing `immi-paper.tex`

### Fix 1: Author Name
- Line 45: `Alexander Welcing` → `Alex Welcing`
- Citation in README: `Welcing, Alexander` → `Welcing, Alex`

### Fix 2: Remove WIP Banner
- Delete lines 62–64 (the `\begin{center}...\end{center}` red banner block)

### Addition 1: New Results Subsection — Foundation MLIP Extension
**Placement:** After `\subsection{Cross-style alignment and the d-band hypothesis}` (line 268), before `\subsection{Temporal evolution of the hyper-ribbon}` (line 270).

**Section number:** 4.6 (renumber subsequent: Temporal → 4.7, 5D → 4.8)

**Title:** Foundation MLIP extension and cross-paradigm universality

**Content:**
- **Motivation:** Classical potentials show hyper-ribbon structure. Do foundation MLIPs (trained on DFT, architecture-agnostic) exhibit the same error geometry?
- **Methods:** Tested 3 foundation MLIPs: MACE-MP-0, CHGNet, Orb-v3. Computed elastic constants (C11, C12, C44) for all 15 elements via strain-energy method. Constructed relative-error vectors. Computed cross-MLIP cosine alignment.
- **Key findings:**
  - 14/15 elements show strong cross-MLIP agreement (mean cosine > 0.5), with Fe as the lone systematic outlier
  - Au, Pt, Ta show near-perfect MLIP agreement (mean cosine > 0.93)
  - Cr and V show negative cross-MLIP alignment, indicating MLIPs disagree where classical potentials also struggle
  - Spearman ρ(classical mean cosine, MLIP mean cosine) = 0.19, p = 0.51 — the classical cross-style pattern does NOT transfer to foundation MLIPs
  - The hyper-ribbon structure is paradigm-independent: errors are structured regardless of model architecture
- **Table:** Per-element cross-MLIP cosine alignment + classical mean cosine comparison
- **Figure:** Bar chart or scatter comparing classical vs MLIP mean cosine per element

### Fix 3: Update Data Availability
- Add Zenodo DOI placeholder: "Dataset DOI: [Zenodo release pending]"
- Add GitHub repo reference (already present, verify)

### Fix 4: Update Limitations paragraph
- Add mention that foundation MLIP sample is small (n=3) and pre-trained (not element-finetuned)
- Note that Orb-v3 showed numerical instability on some BCC elements

### Fix 5: Update Software citation
- Ensure `atlas-distill` version is correct
- Add citation to MACE, CHGNet, Orb packages
