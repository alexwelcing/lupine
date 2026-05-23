/-
  Main entry point for the MLIP Acceleration formalization.

  This file imports all the modules and provides a high-level overview
  of the formalized results.
-/

import MLIPAcceleration.CoreDefinitions
import MLIPAcceleration.Monotonicity
import MLIPAcceleration.AccelerationTheorem

namespace MLIP

/-- Main theorem statement, combining all results. -/
def mainTheoremOverview : String :=
  "Theorem 1 (Causal Acceleration):\n" ++
  "  For any M ∈ F with L layers, a refusal policy with stop layer k* achieves\n" ++
  "  expected speedup ≥ 1 + (L-k*)/L · (1-κ₁) · (1 - τ/(τ+r(F)))\n" ++
  "\n" ++
  "Lemma 1 (Monotonicity):\n" ++
  "  For OOD configurations, D₁(x) ≤ D₂(x) ≤ ... ≤ D_L(x)\n" ++
  "  with growth bounded by L_u^(k)(1+|N(i)|·L_m^(k))\n" ++
  "\n" ++
  "Lemma 2 (Contraction):\n" ++
  "  For in-distribution configs, D_k(x) ≤ (δ/r(F))^(2^(k-1)) · D₁(x)\n" ++
  "\n" ++
  "Corollary 1 (Calibration):\n" ++
  "  Neyman-Pearson threshold: τ_k = √(F^{-1}_{χ²_{d_k}}(1-α))\n" ++
  "\n" ++
  "Corollary 2 (Stacking):\n" ++
  "  S_combined = S_refusal × S_other (multiplicative)"

#eval mainTheoremOverview

end MLIP
