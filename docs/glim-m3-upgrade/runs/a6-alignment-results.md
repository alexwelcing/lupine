# Testing A6 — do MLIPs share spatial error modes? (first direct test)

> ⚠️ **Provisional — a known confound is not yet controlled.** The permutation null
> here breaks per-atom correspondence but does **not** control for **mathematical
> coupling** among the residual components (the Cauchy relation and mechanical-
> stability constraints), which Jackson–Somers (1991) and Archie (1981) show creates
> a **non-zero baseline correlation** independent of any shared physics. So the
> positive `mag_corr` signal is **suggestive, not established** — it must be re-run
> with a coupling-aware null (and at the OpenKIM/NIST corpus scale) before it can be
> trusted. Treat this as a working **method + first signal**, not a result.

> The keystone paper's A6 ("common-spatial-mode separability") is the *strongly
> nonstandard*, load-bearing assumption that bridges parameter-space sloppiness to a
> shared configuration-space error core — and the paper insists it "must be tested
> rather than presumed." This is, as far as the repo shows, the **first direct test**
> of it. Instrument: [`tools/a6_alignment_test.py`](../../../tools/a6_alignment_test.py).
> Data: the force-error field (the spatially-resolved, dynamics-relevant residual the
> distill correction never touched), 3 MLIPs × 5 shared MPtrj structures = 107 atoms,
> 5000 stratified (within-structure) permutations.

## Result

| pair | `mag_corr` (same atoms hard?) | `atom_cos` (same direction?) | `field_cos` (whole field) |
|---|---|---|---|
| MACE ↔ SevenNet | **0.86**, p=0.0002 ✓ | 0.27, p=0.0002 ✓ | **0.71**, p=0.0002 ✓ |
| CHGNet ↔ SevenNet | **0.70**, p=0.0002 ✓ | 0.29, p=0.0002 ✓ | 0.19, p=0.011 ✓ |
| CHGNet ↔ MACE | **0.85**, p=0.0002 ✓ | 0.20, p=0.0006 ✓ | 0.11, p=0.09 ✗ |

(stratified-permutation null means: `mag_corr` ≈ 0.34, `atom_cos` ≈ 0.00,
`field_cos` ≈ 0.00 — the within-structure scale is controlled for, so these are the
*cross-structure, per-atom shared pattern* beyond mere per-structure magnitude.)

## What it means (read straight)

1. **A6 is not false — there is real shared spatial error structure.** All three MLIPs
   concentrate force error on the **same atoms** (`mag_corr` 0.70–0.86, z 4.9–6.9),
   far above the permutation null, for every pair. They also err in **correlated
   directions** (`atom_cos` significant everywhere, though modest at 0.2–0.3). This is
   the first empirical support the ribbon-transfer claim has had *at the force-field
   level* — not the output-space PR concentration, but the spatially-resolved residual.
2. **But it is conditional, not universal — exactly the paper's thesis.** The whole-
   field alignment is heterogeneous: MACE and SevenNet share a strong common field
   (0.71), while **CHGNet is a partial outlier** (its `field_cos` with MACE is not
   significant). In the paper's terms, CHGNet carries a larger model-specific
   perturbation `η_M` off the shared core — so the right formal object is the
   **perturbative** universality theorem (shared core + bounded `δ_M`), never the
   exact or unrestricted one.
3. **Two independent lines now point at CHGNet as the high-perturbation model.** The
   live campaign found CHGNet is the backend distill *regressed* and the one needing
   its own `signed-orientation` policy; this A6 test independently finds CHGNet has the
   weakest cross-model field alignment. Same conclusion from generation and from
   geometry: CHGNet sits furthest from the shared core.

## Honest limits

This is a **pilot**: 5 structures, 107 atoms, 3 models, one campaign manifold. It
establishes the **method** and a first, real signal — it is not the definitive answer.
The paper's protocol for that is explicit and is the right next step: run this over
**MatPES/MPtrj** (fit) and **OMat24** (scale) with a **blocked bootstrap over
materials** (never atomic frames), report `δ_M`, `L_M`, and stability margins with
CIs, and a configuration-space core-dimension estimate (local PCA on pooled
high-error *points*) with a threshold sweep.

## Why this matters for the program

Before this, "MLIP errors share a universal structure" was an output-space
participation-ratio observation plus an *unstated* A6 assumption (see
[keystone-reconciliation.md](../../science/keystone-reconciliation.md)). Now there
is a direct, permutation-controlled test showing the shared structure is **real on
forces but conditional** — which is precisely the regime where the keystone theorem
(perturbative, conditional) applies and the unrestricted ribbon claim does not. The
correct formal target is therefore the paper's `exact/perturbative tubular`
theorem with `δ_M` estimated per model — not my earlier `RibbonProjection` toy, and
not a per-model exception table.
