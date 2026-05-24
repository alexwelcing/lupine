# Lean 4 Formalization: Causal Acceleration Theorem

This directory contains the formalization of the Causal Acceleration Theorem
(Paper III, Acceleration Lane) in Lean 4.

## Files

| File | Description |
|------|-------------|
| `MLIPAcceleration/CoreDefinitions.lean` | Type definitions, Lipschitz conditions, MPLayer, FoundationMLIP, refusal policies |
| `MLIPAcceleration/Monotonicity.lean` | Lemma 1: Layerwise distance monotonicity for OOD configs |
| `MLIPAcceleration/AccelerationTheorem.lean` | Theorem 1: Speedup bound + Lemma 2 + Corollaries |
| `Main.lean` | Entry point |
| `LEAN_FORMALIZATION_ROADMAP.md` | Comprehensive formalization guide |

## Building

```bash
# Requires Mathlib (add to lakefile.toml)
[[require]]
name = "mathlib"
scope = "leanprover-community"

lake update
lake build
```

## Key Results

- **Lemma 1** (Monotonicity): `layerwiseDistanceMonotonicity` — proved structurally, 7 `sorry` for Mathlib algebra
- **Theorem 1** (Acceleration): `causalAcceleration` — key inequality proved from first principles
- **Corollary 2** (Stacking): Multiplicative speedup combination — fully proved

## Status

770 lines of Lean 4. 15 `sorry` placeholders, all requiring standard Mathlib lemmas
(`ring_nf`, `field_simp`, `norm_triangle`, chi-squared distribution).
