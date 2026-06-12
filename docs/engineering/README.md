# Engineering index — the control plane and the distill engine

The science (hyper-ribbon error geometry) is indexed from
[`docs/navigation.md`](../navigation.md). **This** is the index for the *machinery* that
runs it: the agentic control plane, the Rust distill engine, the MLIP execution lanes,
cloud burst compute, and observability. Files are linked **in place** — nothing here was
moved (the public site and the worker read fixed `docs/` paths).

## Control plane
- [`glim-think/`](../../glim-think/) — the durable research control plane (agenda, ledger,
  feed, evals, telemetry, the Think agents). New research workflows connect here first.
- [`docs/operating-system.md`](../operating-system.md) — how the loop is wired end to end.
- [`docs/resource-fabric.md`](../resource-fabric.md) — the compute/resource fabric.

## Distill engine + ribbon policies
- [`atlas-distill/`](../../atlas-distill/) — the Rust Distill scoring / policy / ribbon engine.
- [`python/`](../../python/) — the active Python Distill packages (benchmark, uplift, regime gate,
  instrumented runtime, ODF promotion contracts).
- [`archive/lupine-distill-rust/`](../../archive/lupine-distill-rust/) — retired Rust crate provenance.
- [`docs/distill_improvement_atlas.md`](../distill_improvement_atlas.md) ·
  [`docs/distill_kart_race_live_win.md`](../distill_kart_race_live_win.md) — **stale**
  distill campaign snapshots; see the corrected
  [`docs/glim-m3-upgrade/runs/live-campaign-results.md`](../glim-m3-upgrade/runs/live-campaign-results.md).
- [`docs/regime_gate_dominance.md`](../regime_gate_dominance.md) ·
  [`docs/regime_gate_clean_rerun.md`](../regime_gate_clean_rerun.md) — the regime gate.
- [`docs/neural-symbolic-curvature-loop.md`](../neural-symbolic-curvature-loop.md) —
  GPU MLIP curvature → machine-checked Lean.

## MLIP execution + campaigns
- [`docs/MLIP_EXECUTION_PLAYBOOK.md`](../MLIP_EXECUTION_PLAYBOOK.md) — the operating playbook.
- [`docs/MLIP_PAPER_REPRODUCTION_READINESS.md`](../MLIP_PAPER_REPRODUCTION_READINESS.md).
- Campaign reports: [`mlip-cloud-baseline-distill-report.md`](../mlip-cloud-baseline-distill-report.md),
  [`mlip-ni-paired-accuracy-live-report.md`](../mlip-ni-paired-accuracy-live-report.md),
  [`mlip-ni-zero-point-policy-replay.md`](../mlip-ni-zero-point-policy-replay.md),
  [`mlip-mptrj-broad-dft-canary.md`](../mlip-mptrj-broad-dft-canary.md),
  [`mlip-spectral-v4-foundation.md`](../mlip-spectral-v4-foundation.md).
- Architecture / plans: [`mlip-distill-gcp-evolution-architecture.md`](../mlip-distill-gcp-evolution-architecture.md),
  [`mlip-distill-real-material-publication-plan.md`](../mlip-distill-real-material-publication-plan.md),
  [`mlip-distill-local-theory-growth-lane.md`](../mlip-distill-local-theory-growth-lane.md) (provisional — replay-only),
  [`mlip-gpu-ni-distill-formal-gate.md`](../mlip-gpu-ni-distill-formal-gate.md),
  [`mlip-flywheel-readiness.md`](../mlip-flywheel-readiness.md),
  [`mlip-long-horizon-demo-workstreams.md`](../mlip-long-horizon-demo-workstreams.md).
- Real-data lane: [`mlip_immi/`](../../mlip_immi/).

## Cloud execution
- [`gcp/mlip-cell-runner/`](../../gcp/mlip-cell-runner/) — the Cloud Run MLIP cell runner
  (the `mlip-cell-*` L4 jobs, the baseline/distill_accuracy/distill_accuracy_accelerate tiers).
- [`gcp/`](../../gcp/) — Cloud Run jobs/services for burst compute and task consumption.

## Observability
- [`docs/phoenix-observability.md`](../phoenix-observability.md) — Phoenix tracing of the loop.

## This session — MiniMax M2.7 → M3 upgrade (2026-06-02)
- [`docs/glim-m3-upgrade/`](../glim-m3-upgrade/README.md) — the model-axis upgrade for the
  Theorist agent + the live Cloud-Run distill campaign.
  **Read the status notes in [`navigation.md`](../navigation.md#this-sessions-additions-minimax-m3-upgrade--the-live-campaign--and-their-status)**:
  the model-axis engineering is solid; the campaign *results* are provisional (a different
  MLIP-energy lane from the OpenKIM/NIST ribbon corpus, and an energy-only correction that
  does not move forces).
