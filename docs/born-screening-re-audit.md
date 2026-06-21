# What Survived the Born-Screening Re-Audit?

**Status:** self-corrected / open gates
**Publication date:** 2026-06-20
**Scope:** foundation-MLIP elastic tensors, the classical-to-MLIP transfer conjecture, Fe outlier language, and Au escape language.

## Human summary

The earlier MLIP-transfer story was too compressed: we had pre-screening counts that made the classical-to-MLIP hyper-ribbon look like a clean “14 of 15 elements stay on the ribbon” result, with Fe as the stable exception and Au as an escape event. A later Born-stability screen found that 7 of 45 foundation-model elastic tensors were mechanically invalid, including CHGNet-Fe plus MACE-V and Orb-v3 Al/Nb/Pb/Pt.

That does not erase the program. It narrows what can be cited.

What survives now is the more defensible claim: after screening, cross-model error axes remain strongly one-dimensional in the available Born-stable inputs, with rank-1 share about 0.56–0.94 at n = 8–11 models per element. What does not survive as citable evidence is the old per-element “14/15 on-ribbon” count, the old “Fe PR > 2 under every LAM addition” line, or any figure that depends on unscreened foundation-model elastic tensors.

## Why this matters

The library is meant to be a claim ledger, not a highlight reel. A good discovery system must publish the moment when an attractive result becomes less simple. The re-audit changes the MLIP-transfer shelf from “confirmed count” to “open recomputation with a surviving directional signal.” That is a stronger public position than keeping the old headline and burying the caveat.

## What changed

| Claim | Previous public shorthand | Current citable status |
| --- | --- | --- |
| Classical hyper-ribbon universality | Supported | Supported for the classical OpenKIM/NIST-style elastic corpus. |
| Classical → MLIP transfer count | 14/15 elements stay on-ribbon under MACE/CHGNet/Orb-v3 | Open. Pre-screening count is frozen until recomputed on Born-stable inputs. |
| Fe persistent outlier | Fe remains PR > 2 across the foundation-MLIP trio | Open / narrowed. CHGNet-Fe failed Born stability; Fe remains a magnetic failure-mode suspect, not a citable PR exception. |
| Au escape | Au escapes under MACE and CHGNet; Ag escape refuted | Open. Pre-screening signal is useful for hypothesis generation; mechanism and screened robustness remain unproven. |
| Cross-model directional structure | Low-dimensional error axes appear across MLIPs | Supported as a directional result in screened inputs, not yet a settled per-element count. |

## Evidence basis

The current ledger note records that Born screening excluded 7 of 45 foundation-model elastic tensors, including CHGNet-Fe, MACE-V, and Orb-v3 Al/Nb/Pb/Pt. On the surviving inputs, the error axis remains one-dimensional for all 15 elements in the re-audit window, with rank-1 share 0.56–0.94. Fe’s cross-model alignment is about +0.80, which means it is not currently an alignment outlier.

The resulting scientific interpretation is narrower and cleaner: invalid elastic tensors were themselves a meaningful failure mode, but they cannot be used as evidence for participation-ratio counts.

## Reader guide for older figures

Older figures and reports that show Au PR jumps, Fe PR > 2, or 14/15 MLIP counts are historical/pre-screening artifacts unless they explicitly say otherwise. They remain useful as method demonstrations: how to compute participation ratio, how an escape detector is supposed to behave, and how a claim moves through the ledger. They should not be quoted as current evidence for screened MLIP behavior.

## Next experiment

The next credible publication gate is a Born-stable recomputation:

1. rebuild the per-element MLIP tensor matrix after excluding invalid elastic tensors;
2. require shared reference standards or explicitly label reference heterogeneity;
3. recompute participation ratios, rank-1 shares, and alignment measures;
4. publish both the old and new counts with a machine-readable exclusion list;
5. only restore “supported” status if the screened count survives the same threshold.

## Kill criteria

The classical-to-MLIP transfer count should remain open, or be downgraded, if any of these hold:

- the screened per-element on-ribbon count falls below the pre-registered threshold;
- Fe’s apparent exception is explained entirely by one invalid tensor;
- Au’s escape disappears under ORB/SevenNet or surface/adsorbate controls;
- the result depends on mixed experimental/DFT references without a stratified analysis;
- coupling-aware nulls explain the alignment signal.

## Public stance

The honest claim is no longer “foundation MLIPs preserve the ribbon for 14 of 15 elements.” The honest claim is:

> Born screening invalidated the old MLIP transfer count. The low-dimensional directional structure still appears to survive in screened inputs, but the per-element lifecycle status is open until recomputed.

That is the version the library should carry forward.
