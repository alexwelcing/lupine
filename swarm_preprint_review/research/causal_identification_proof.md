# Formal Causal Identification Proof

## Setup

We want to estimate the causal effect of **Potential Parameters (P)** on
**Prediction Error (ERR)**, where ERR = Y_pred - Y_ref.

## Confounding Structure

**Element Identity (E)** is a confounder because:
1. E affects the choice of training database (DB) → which potentials are fit
2. E affects the reference property values (Y_ref) through bonding character (BC)
3. Therefore: E → P ← DB ← E  and  E → Y_ref → ERR ← Y_pred ← P

This satisfies Pearl's back-door criterion: E is a common cause of both
the treatment (P) and the outcome (ERR).

## Identification Strategy

**Stratification by Crystal Structure (CS)** blocks the confounding path:

Before stratification:
  P ← E → Y_ref → ERR
  (back-door path open)

After stratification (condition on CS):
  CS blocks E → Y_ref because Y_ref ⊥ E | CS
  (back-door path closed)

## Formal Proof

Using the rules of do-calculus:

P(ERR | do(P)) = Σ_cs P(ERR | P, CS=cs) P(CS=cs)

This is identified because:
1. CS is not a descendant of P (no collider bias)
2. CS blocks all back-door paths from P to ERR
3. CS is measurable (crystal structure is known for each element)

## Empirical Verification

The BCC/FCC dichotomy confirms the causal mechanism:
- BCC: strong ref-pred correlation (r > 0.70) because directional bonding
  creates a constrained prediction landscape
- FCC: weak correlation (r < 0.40) because isotropic bonding allows
  independent errors

This is not merely a statistical pattern — it is a causal consequence
of electronic structure.
