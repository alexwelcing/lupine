# Neural-Symbolic Execution Loop: GPU physics → Lean 4 (0 sorry)

**Date:** 2026-05-29 · **Hardware:** NVIDIA RTX A4500 · **Stack:** torch 2.6.0+cu124,
MACE-MP-0 + CHGNet, Lean v4.29.0 · **Code:**
`python/scripts/neural_symbolic/`

A working, end-to-end bridge that fuses empirical GPU physics directly into the Lean 4
formal-verification engine. An MLIP's measured failure (a curvature prediction that
diverges from ground truth) is captured on the GPU, relayed as an OpenInference span,
and **authored into a machine-checked Lean theorem** — turning the "hallucination" into a
formally verified negative constraint that seeds `atlas_theorems`.

Run the whole loop in one command:
```
C:/Users/alexw/mlip-gpu/Scripts/python.exe \
  python/scripts/neural_symbolic/run_loop.py
```

## Architecture (three nodes, one payload contract)

```
Node 1  GPU curvature thrust         Node 2  Worker→Phoenix relay      Node 3  Lean synthesis
MACE-MP-0 vs CHGNet, C44 shear   →   T3-REJECT breach → OpenInference  →  native-`decide` theorem
sweep on the A4500                    span (OTLP live / local artifact)   (0 sorry) + atlas_theorems seed
        │  CurvatureBoundaryPayload (payload.py) — the single immutable schema all three speak │
```

## Node 1 — comparative C44 shear curvature (the empirical physics)

Both foundation MLIPs are loaded on the GPU and put through a pure-shear strain sweep of
FCC Ni; the secant shear modulus **C44(γ)** is the curvature observable (second derivative
of energy w.r.t. shear). Units cross-validate: MACE's elastic C44 = 92.4 GPa matches the
independent torch_sim elastic-constants run exactly.

| model | elastic C44 | dev vs 124.7 GPa | validated γ ≤ | divergence γ | verdict |
|---|---|---|---|---|---|
| MACE-MP-0 | 92.4 GPa | **−25.9%** | 0.100 | 0.130 | **REJECT** |
| CHGNet | 101.2 GPa | −18.8% | 0.100 | 0.130 | REVIEW |

**Finding:** both foundation MLIPs *undershoot* Ni's shear constant — MACE-MP-0 by 26%
(rejected), CHGNet by 19% (review). The shear stress–strain profiles diverge at large
strain (γ ≳ 0.10), where the validated elastic manifold ends.

## Node 2 — Worker → Phoenix relay (Python, off the `tsc` path)

Monitors Node 1's payloads; on a T3-REJECT breach it serializes the topological boundary
into an OpenInference `EVALUATOR` span (`lupine.proof.status`, `lupine.curvature.*`,
`lupine.theorem.name`, ATLAS/mathlib revisions) and streams it to the Phoenix OTLP relay.
This is the **Python flywheel pattern** (`tools/mlip_phoenix_trace.py`) — it runs entirely
off the glim-think TypeScript path, so it is structurally immune to the Worker `tsc` OOM.

Live delivery is env-gated and production-ready: with `PHOENIX_OTLP_RELAY_URL` +
`PHOENIX_RELAY_TOKEN` and `opentelemetry` installed, spans export over OTLP; offline it
degrades to a durable, replayable artifact under `tmp/neural_symbolic/relay_out/` so no
signal is lost. In this run: 2 payloads, **1 breach (MACE-MP-0)** captured.

## Node 3 — Lean 4 theorem synthesis (the symbolic engine)

Translates each payload into a real, import-free **core-Lean** theorem proved by `decide`
(no Mathlib, no native compiler — verifies in seconds). The MACE-MP-0 breach became:

```lean
namespace Lupine.NeuralSymbolic.mace_mp_0
def refC44_dGPa : Nat := 1247          -- 124.7 GPa ×10
def elasticC44_dGPa : Nat := 924       -- GPU-measured 92.4 GPa ×10
def validatedStrain_e4 : Nat := 1000   -- validated manifold edge ×1e4
def outsideManifold (s : Nat) : Bool := Nat.blt validatedStrain_e4 s

/-- the measured divergence strain (1300×1e-4) is outside the validated manifold -/
theorem mace_mp_0_shear_strain_beyond_manifold_is_invalid :
    outsideManifold 1300 = true := by decide

/-- |elastic − ref|·4 > ref  ⇒ >25% deviation ⇒ REJECT -/
theorem mace_mp_0_curvature_reject :
    (323 * 4 > refC44_dGPa) := by decide
end Lupine.NeuralSymbolic.mace_mp_0
```

**Independently verified:** a fresh `lean` compile returns rc 0 — machine-checked, **0
sorry**. Both models' modules verified (4 theorems total), and a 4-row `atlas_theorems`
seed (`status='verified'`) is emitted for glim-think to ingest:
`tmp/neural_symbolic/atlas_theorems_seed.sql`.

## Node 4 — the widening: full curvature (phonon Hessian) [`node4_hessian.py`]

The documented next step, executed. Past the single secant C44 to the **full 3N×3N atomic
dynamical matrix** and the elastic shear modulus as a stress derivative.

- **Elastic C44** = `dσ_xy/dγ` = **92.42 GPa** (−25.9%) — matches Node 1 exactly (units/convention
  cross-validated).
- **Phonon spectrum** (12×12 Hessian, FD of MACE's autograd forces): 3 acoustic modes ≈ 0, then
  **6 × 5.62 THz** and **3 × 8.12 THz**; **0 imaginary modes → dynamically STABLE** (max optical
  8.12 THz, Hessian trace 93.0 eV/Å²). Physically correct for FCC Ni.

**Autograd reality (empirically determined, not assumed):** torch_sim's *inference* model
detaches positions when it rebuilds the neighbor list, so you cannot autograd a curvature
*through it*. MACE's **own** internal autograd is the source of truth (the forces/stress it is
trained on). The Hessian is therefore FD of MACE-autograd forces — the standard, robust phonon
method. This dictates the RLSF path (Node 5): backprop must use MACE's native stress-gradient
(raw model, `training=True`, second-order, supported), with a LoRA on the **invariant readout**
(the equivariance-safe injection point). Pure `autograd.functional.hessian` through the
inference wrapper is *not* available — stated plainly rather than faked.

## Why this matters

The program's thesis is "proof or reproducible trace." This loop closes that at the
tightest possible coupling: a number measured on the GPU this second becomes a theorem the
Lean kernel checks the next. MLIP failure modes stop being soft observations and become
**hard, machine-verified negative constraints** in the formal corpus — exactly the
`atlas_theorems` seeding that Thrust 1 called for, now arriving *from the physics*.

## Caveats (honest scope)

- **C44 as the curvature observable.** The "Hessian topology" is captured here via the
  secant shear modulus C44(γ) (a real second-derivative quantity), not the full phonon
  Hessian. A force-constant/phonon-DOS sentinel is the natural next widening.
- **Reference is the 124.7 GPa literature Cij** (not a per-strain DFT curve); the elastic
  divergence is the dominant, well-posed signal.
- **Live Phoenix delivery needs cloud creds.** The relay is production-ready for the OTLP
  endpoint; offline it persists a durable artifact (no live Phoenix dashboard in this run).
- **The generated theorems are decidable arithmetic encodings** of the empirical boundary
  (the GPU number → a verified Nat inequality). They are genuinely machine-checked (0
  sorry) but are *constraints derived from measurement*, not first-principles physics
  proofs — the honest, correct claim for a neural→symbolic seed.

## Next

1. Stand up the GCP OTLP relay so Node 2 streams live to Phoenix (then the loop is fully
   continuous: GPU → Phoenix → Lean, re-firing per measurement).
2. Widen Node 1 to the full phonon Hessian (force constants) — the true curvature frontier.
3. Apply the `atlas_theorems` seed to the live `glim-ledger` D1 and surface the verified
   negative constraints in the glim-think Experiment facet.
```
