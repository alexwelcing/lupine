# Clean re-run — the systematic harm, prevented in production

The atlas measured the v0 (ungated) Ni-EAM campaign shipping **8 systematic
regressions**. This is that same campaign, re-run **through the a-priori regime
gate** — and it ships **0 harm, by construction**, because every out-of-regime
distill cell is refused before it can run.

## 1. A-priori prevention (free — no cloud spend)

`tools/mlip_regime_filter.py` fingerprints each distill cell from the campaign's
declared `reference_family` and the row's metric kind — no oracle, no measured
error — and gates it:

| campaign (scope: promotion-canary) | reference family | distill cells | gate verdict |
|---|---|---|---|
| Ni-EAM | `mishin_eam` | 6 | **6 REFUSE** (reference_family_mismatch) |
| MPtrj-DFT kart-race | `mptrj_dft` | 16 | **16 RUN** (in_regime) |

The Ni distill cells are refused a-priori — the harm is prevented *and* 6 GPU
compute cells are saved before a cent is spent.

## 2. Live confirmation (Cloud Run, project shed-489901)

The gate materializes a **distill-free batch spec** and fires it. Cloud Run reads
the spec from GCS, so the gate only takes effect in production if the spec it
reads is the gated one — and it is:

- gated spec GCP read (`.../batches/canary/gated/...-mace-mp-0...json`): cells =
  `['baseline', 'baseline']` — **0 distill cells**
- execution `mlip-cell-mace-7bcgf`: **succeeded, 0 failed**
- the Ni campaign that shipped 8 harms ran **baseline-only** → 0 harm, structurally

## 3. Dominance (machine-checked, counterfactual on the full run)

`tools/regime_gate_flywheel.py` replays the gate over all 45 paired atlas cells:

```
ungated harms 8 -> gated 0 (eliminated 8) | wins 6/6 kept | dominates=True
```

`lean-spec/.../RegimeGate/Dominance.lean` encodes it as a decidable theorem that
only type-checks while the gate dominates (`0 < 8 ∧ 6 = 6 ∧ 0 = 0`, 0 sorry) — a
regression alarm baked into the kernel. Every future run appends its cells and
re-proves dominance, or the Lean build breaks.

## 4. The repeatable loop, made operational

```
campaign + ribbon provenance
        │  mlip_regime_filter (a-priori, no oracle)
        ▼
  decision ledger ──► gated batch spec (distill-free where refused)
        │                       │ upload + fire
        ▼                       ▼
  free proof              Cloud Run runs only the survivors
        └──────────────► flywheel re-proves dominance ──► Lean certificate
```

Point it at a new material: declare its `reference_family`, run the filter, and
the gate refuses or admits *before* spending GPU — the diagnose → fix → re-prove
loop as a production control, not a one-off.

## Next (#2) — chemistry coverage, already wired into the gate

The reference-family signal is a perfect separator here because the regime
boundary *is* the oracle boundary. For two materials in the **same** reference
family but different physics, the gate now also carries a chemistry rule
(`chemistry_outside_fit_set` → REVIEW): a ribbon declares the element set it was
fit on, and a target with unseen elements is held for review (the canonical MLIP
transferability limit). It is **inert until both the ribbon's `fit_elements` and
the target's `elements` are declared**, so it changes nothing about the dominance
above — it is the next layer of generality, grounded and backward-compatible. The
remaining wiring is to populate `elements` from each fixture at launch time.
