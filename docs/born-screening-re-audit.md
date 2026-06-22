# What Survived the Born-Screening Re-Audit?

**Status:** self-corrected / screened recomputation complete for the replication-kit corpus
**Publication date:** 2026-06-20  
**Latest evidence update:** 2026-06-21
**Scope:** foundation-MLIP elastic tensors, the classical-to-MLIP transfer conjecture, Fe outlier language, and Au escape language.

## Human summary

The earlier MLIP-transfer story was too compressed: we had pre-screening counts that made the classical-to-MLIP hyper-ribbon look like a clean “14 of 15 elements stay on the ribbon” result, with Fe as the stable exception and Au as an escape event. A later Born-stability screen found that 7 of 45 foundation-model elastic tensors were mechanically invalid, including CHGNet-Fe plus MACE-V and Orb-v3 Al/Nb/Pb/Pt.

That does not erase the program. It narrows what can be cited.

What survives now is the more defensible claim: after screening, cross-model error axes remain low-dimensional in the available Born-stable inputs. The committed replication kit recomputes all 15 per-element foundation-MLIP buckets at n = 8-11 models per element: median PR = 1.592, min = 1.143, max = 1.910, and median rank-1 share = 0.774. What does not survive as citable evidence is the old per-element “14/15 on-ribbon” count, the old “Fe PR > 2 under every LAM addition” line, or any figure that depends on unscreened foundation-model elastic tensors.

## Why this matters

The library is meant to be a claim ledger, not a highlight reel. A good discovery system must publish the moment when an attractive result becomes less simple. The re-audit changes the MLIP-transfer shelf from “confirmed count” to “open recomputation with a surviving directional signal.” That is a stronger public position than keeping the old headline and burying the caveat.

## What changed

| Claim | Previous public shorthand | Current citable status |
| --- | --- | --- |
| Classical hyper-ribbon universality | Supported | Supported for the classical OpenKIM/NIST-style elastic corpus. |
| Classical → MLIP transfer count | 14/15 elements stay on-ribbon under MACE/CHGNet/Orb-v3 | Corrected. The old threshold count is retired; the screened replacement is a per-element PR/rank-one-share table in `replication/error-geometry/data/pr_gauge_results.json`. |
| Fe persistent outlier | Fe remains PR > 2 across the foundation-MLIP trio | Open / narrowed. CHGNet-Fe failed Born stability; Fe remains a magnetic failure-mode suspect, not a citable PR exception. |
| Au escape | Au escapes under MACE and CHGNet; Ag escape refuted | Open. Pre-screening signal is useful for hypothesis generation; mechanism and screened robustness remain unproven. |
| Cross-model directional structure | Low-dimensional error axes appear across MLIPs | Supported as a directional result in screened replication-kit inputs; broader live-ledger expansion remains queued. |

## Evidence basis

The current ledger note records that Born screening excluded 7 of 45 foundation-model elastic tensors, including CHGNet-Fe, MACE-V, and Orb-v3 Al/Nb/Pb/Pt. On the surviving inputs, `python tier1_analyze.py` reproduces the registered functional-vs-architecture result (S_func = +0.317, S_arch = -0.093, p = 0.0286) and the SVD rank-one-share range 0.56-0.94. `python tier1_pr_gauge.py` now recomputes the replacement per-element screened PR table from committed raw tensors: all 15 elements remain below PR 2.0, with Fe at PR = 1.308 / rank-1 share = 0.869, Au at PR = 1.143 / rank-1 share = 0.933, and Ag the highest at PR = 1.910 / rank-1 share = 0.612.

The resulting scientific interpretation is narrower and cleaner: invalid elastic tensors were themselves a meaningful failure mode, but they cannot be used as evidence for participation-ratio counts.

## Reader guide for older figures

Older figures and reports that show Au PR jumps, Fe PR > 2, or 14/15 MLIP counts are historical/pre-screening artifacts unless they explicitly say otherwise. They remain useful as method demonstrations: how to compute participation ratio, how an escape detector is supposed to behave, and how a claim moves through the ledger. They should not be quoted as current evidence for screened MLIP behavior.

## Closed gate and next experiment

The 2026-06-21 publication gate is closed for the committed replication-kit corpus:

1. rebuilt the per-element MLIP tensor matrix after excluding invalid elastic tensors;
2. kept the reference boundary explicit in the manuscripts;
3. recomputed participation ratios, rank-1 shares, and alignment measures in `tier1_pr_gauge.py`;
4. published the replacement screened table as `data/pr_gauge_results.json`;
5. kept the old “14/15” shorthand retired instead of restoring it.

The next experiment is not another local re-audit of this kit. It is the live-ledger expansion: `mlip-discovery-loop` campaign `github:27618187135` has 60 CHGNet records, 29 sentinels, and 12 agenda actions queued. The top item is CHGNet-Fe's Born-stability violation (`C11=108.523`, `C12=114.988`), which produced `claim_id=mlip_discovery_github:27618187135_stability:Fe:chgnet:c11_le_c12` with verdict `inspect_before_promotion`.

## Kill criteria

The classical-to-MLIP transfer count should remain open, or be downgraded, if any of these hold:

- the screened per-element on-ribbon count falls below the pre-registered threshold;
- Fe’s apparent exception is explained entirely by one invalid tensor;
- Au’s escape disappears under ORB/SevenNet or surface/adsorbate controls;
- the result depends on mixed experimental/DFT references without a stratified analysis;
- coupling-aware nulls explain the alignment signal.

## Public stance

The honest claim is no longer “foundation MLIPs preserve the ribbon for 14 of 15 elements.” The honest claim is:

> Born screening invalidated the old MLIP transfer count. The screened replication-kit corpus now supports a narrower replacement: all 15 available foundation-MLIP per-element buckets remain below PR 2.0 after invalid tensors are excluded, but the claim is PR/rank-one-share evidence, not the retired “14/15” slogan.

That is the version the library should carry forward.
