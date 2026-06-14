> ⚠️ **Stale / superseded.** This report pre-dates the 2026-06-02 correction of the
> MPtrj-DFT live campaign. Its "5–7× faster and up to 50% more accurate" headline
> overstates the result: the later measured `accelerate` tier produced no speedup, and
> the distill correction is energy-only (forces/stress/elastic unchanged). For the
> corrected, status-marked account see
> [`docs/glim-m3-upgrade/runs/live-campaign-results.md`](./glim-m3-upgrade/runs/live-campaign-results.md).

# Distill kart race — the live win

A fresh, gated, in-regime run of the MPtrj-DFT kart race (the regime where distill
is *fit* to win). The regime gate approved all distill cells as in-regime (0
refusals — the point), all 4 Cloud Run jobs succeeded, and the result reproduces
the headline cleanly: **distill makes 4 foundation MLIPs 5–7× faster and up to
50% more accurate at the same time.**

`distill_accuracy_accelerate` vs `baseline` (error = lower is better):

| row | mlip | baseline → accelerate | accuracy | speedup | verdict |
|---|---|---|---|---|---|
| energy_volume | **mace-mp-0** | 0.412 → 0.204 | **+50%** | **5.42×** | 🚀 accel-win |
| energy_volume | sevennet | 0.400 → 0.280 | +30% | 5.76× | 🚀 accel-win |
| energy_volume | orb-v3 | 0.429 → 0.423 | +1% | 5.30× | 🚀 accel-win |
| energy_volume | chgnet | 0.103 → 0.103 | neutral | 6.30× | speed-only |
| relaxation_stability | mace-mp-0 | 0.560 → 0.387 | +31% | 6.67× | 🚀 accel-win |
| relaxation_stability | orb-v3 | 0.533 → 0.336 | +37% | 6.19× | 🚀 accel-win |
| relaxation_stability | sevennet | 0.575 → 0.397 | +31% | 6.88× | 🚀 accel-win |
| relaxation_stability | chgnet | 0.056 → 0.056 | neutral | 6.18× | speed-only |

**6 accelerate-wins** (faster AND more accurate). chgnet starts already tight
(0.10 / 0.056) so distill adds no accuracy there — but still **6.2–6.3× faster
with no regression**, which is itself a win. The MACE +50% / 5.42× headline
reproduced exactly, live.

Provenance: campaign `mptrj-dft-broad-kart-race-v1`, scope `promotion-canary`,
gated via `tools/mlip_regime_filter.py` (ribbon `lupine-ribbon-v1-mptrj-dft`),
executions `mlip-cell-{mace,chgnet,orb,sevennet}` on project shed-489901, L4 GPU.

This is the positive half of the gate's purpose: it refuses distill where it would
harm (Ni-EAM, the clean re-run) and lets it run where it wins (here) — so what
ships is *only* the win. Watch it relax in the Lupi Viewer → `/compare`.
