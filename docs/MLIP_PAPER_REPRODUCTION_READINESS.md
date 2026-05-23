# MLIP Paper-Reproduction Readiness

Current verdict: **not yet paper-reproduction ready**, but the foundation is now
in the right shape.

We can run and score MLIP fixture cells, run local Distill policy searches, and
promote evidence-backed candidates to GCP canaries. That is enough for the
5x5x3 baseline/Distill product loop. It is not yet enough to say we can
faithfully reproduce a standard MLIP paper, because papers usually validate
more than static predictions.

## What A Reproduction Must Own

A credible MLIP paper reproduction needs these contracts:

- exact model checkpoint or pretrained model identifier;
- exact benchmark structures, splits, and reference labels;
- static energy, force, stress, and elastic metrics;
- relaxation and MD protocols: ensemble, time step, temperature, thermostat,
  seed, initialization, supercell size, trajectory length, and logging cadence;
- restart or checkpoint behavior;
- environment identity: package versions, CUDA facts, GPU type, image digest;
- cloud rerun commands, not local workstation folklore.

The current cell runner covers the static and relaxation-fixture side. The new
`tools/mlip_md_local.py` harness starts covering the trajectory side locally.

## What We Can Do Now

We can run deterministic local ASE trajectory probes:

```powershell
python tools/mlip_md_local.py --mode relax --mlip-id emt --element Al --crystal fcc --lattice-a 4.05
python tools/mlip_md_local.py --mode nve --mlip-id emt --element Al --crystal fcc --lattice-a 4.05
```

The relaxation output is already compatible with:

```powershell
cargo run --manifest-path atlas-distill/Cargo.toml --bin atlas-distill -- `
  equilibrium-solve --trajectory <trajectory.json>
```

That gives us a full local path for the offset-lattice problem: generate a
wrong lattice, let an MLIP solve toward known equilibrium, score how close it
gets, and inspect marginal value from extra steps.

For periodic same-element crystals, the first reproduction target should score
lattice, force, stress, and energy only when those references are genuinely
literature or DFT labels. Raw atom-position scoring is opt-in because periodic
wrapping and atom permutation make naive position RMSE a misleading failure
mode for simple crystals.

The equilibrium scorer's default solved threshold is a normalized distance of
`0.5`, which means the final state is on average within half of the configured
physical tolerances. Tighter paper-specific gates should be declared in the
reproduction packet rather than silently replacing the default.

## What Is Still Missing

Before claiming reproduction of a standard MLIP paper, we need:

- one selected paper target, such as a CHGNet/M3GNet/MACE-MP benchmark table or
  MD stability figure;
- the paper's exact dataset/protocol mapped into a sealed local manifest;
- real MLIP-backed trajectory runs, not only EMT smoke tests;
- long-run cloud canaries in GCP with the same protocol and output schema;
- comparison tables that distinguish paper-reported numbers, local numbers,
  and cloud-rerun numbers.

## Recommended First Target

Use a small crystal benchmark rather than a large diffusion or melting study:

1. CHGNet or MACE-MP single-crystal relaxation and short NVE stability for Al,
   Cu, Si, or Li-containing structures.
2. Reproduce static energy/force/stress metrics on the same held-out fixture.
3. Reproduce relaxation convergence and NVE energy drift with seeded ASE.
4. Promote the exact same trajectory protocol to GCP Cloud Run Jobs.

This is smaller than a full paper, but it is the correct proof of machinery.
After that, scaling to a paper table is mostly dataset/protocol work.
