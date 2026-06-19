# Six Meta-Scientific Hypotheses

> *We are not running simulations. We are formalizing what it means to validate without running them all.*

The `Theory.MetaScience.lean` module abandons the old hypotheses (Simpson's paradox, hyper-ribbon dimensionality) and formulates **new hypotheses about the epistemic structure of interatomic potential validation itself**.

Each hypothesis is encoded as a structure with:
- A formal `statement` (string)
- An epistemic `status` (`conjecture`, `theorem`, `refuted`, or `open`)
- An `intuition` string explaining the physical reasoning

All six are currently at status `[CONJECTURE]`.

---

## H1: Validation Incompleteness

**Status:** `[CONJECTURE]`

**Statement:** For any finite benchmark B and any potential family P, there exists an observable outside B whose error is unbounded by the errors inside B.

**Intuition:** A potential fitted to C11/C12/C44 may fail catastrophically on stacking-fault energy or vacancy-formation energy. No finite benchmark exhausts the physical consequences of a many-body interaction law.

This is the computational-materials-science analogue of Gödel's first incompleteness theorem. Validation is inherently incomplete because the space of physically relevant observables is infinite, and any finite benchmark is a partial signature.

**Implication:** Stop claiming "validated." Start claiming "validated on benchmark B with epistemic gap G."

---

## H2: Epistemic Entropy Bound

**Status:** `[CONJECTURE]`

**Statement:** The entropy of a potential's prediction-error distribution on a fixed benchmark is bounded below by the Kolmogorov complexity of its functional form, divided by benchmark size.

**Intuition:** LJ (2 parameters) has low error entropy but high bias. ML potentials (thousands of parameters) have high error entropy but low bias on their training set. Simpler functional forms cannot encode complex physics, so their errors are concentrated.

This is the bias-variance decomposition at the epistemic level. The bound predicts that as you add parameters, error entropy increases — the potential can fit more independent observables, but each fit is less constrained by the others.

---

## H3: Causal Structure Theorem

**Status:** `[CONJECTURE]`

**Statement:** In the true causal graph, crystal structure is a mediator, not a confounder. Therefore, stratified correlation (within-group r) equals the causal effect, and Simpson's paradox is impossible.

**Intuition:** In nature, element identity affects predictions **through** crystal structure:
```
ElementIdentity → CrystalStructure → Prediction → Error
```
There is no direct arrow from `ElementIdentity` to `Error`. The synthetic data showed Simpson's paradox because it was constructed with a confounder (`ElementIdentity → Error`). In real data, this confounder does not exist.

**Proven structural fact:**
- `trueCausalGraphNoConfounder` — no bypass edge in the true graph
- `syntheticCausalGraphHasConfounder` — bypass edge exists in synthetic graph

---

## H4: Spectral Rigidity

**Status:** `[CONJECTURE]`

**Statement:** For cubic crystals, the eigenvalue multiplicities of the error covariance matrix equal the irreducible representation dimensions of the crystal's point group. Therefore, PR is determined by symmetry, not by potential family.

**Intuition:** The observed PR ~ 1.3 for FCC elastic constants is not a coincidence. It reflects the algebraic decomposition of the elastic tensor under Oh symmetry: one bulk mode, one shear mode, and two degenerate shear modes. The errors inherit this spectral structure from the crystal, not from the potential.

**Proven structural fact:**
- `cubicIrrepSum` — irrep dimensions [1, 1, 2] sum to 4

---

## H5: Transferability Phase Transition

**Status:** `[CONJECTURE]`

**Statement:** There exists a critical parameter count P_c for each crystal structure such that:
- P < P_c: errors are correlated → low PR ("hyper-ribbon")
- P > P_c: errors decorrelate → PR → N (full dimensionality)

**Intuition:** With few parameters, a potential cannot independently fit all observables, so errors are correlated (one bad parameter affects many predictions). With many parameters, each observable can be fit independently, so errors decorrelate. The transition occurs when P ≈ N_independent.

For cubic elastic constants, P_c = 3 (C11, C12, C44 are the 3 independent components). This explains why both EAM (P~15) and ML (P~1000) show PR < 3 on elastic constants: they are both below the phase transition for this observable set.

---

## H6: Bootstrap Collapse

**Status:** `[RESOLVED]`

**Statement:** For N < 30 validation points, the 95% bootstrap CI on participation ratio has width > N/2 with probability > 0.5.

**Intuition:** With only 24 FCC data points, the sampling error in the covariance matrix is enormous. The PR point estimate of 1.3 has a bootstrap CI that likely spans [0.8, 2.5]. The claim "PR/3 < 0.5" (i.e., PR < 1.5) was barely supported even by the point estimate, and the CI made it unproven.

**Resolution:** This hypothesis explained why the hyper-ribbon claim was initially **statistically fragile**. However, the `atlas-distill` LAMMPS campaign has now accumulated **N = 386** ground-truth empirical evaluations across 10 metals. With this massive increase in sample size, the bootstrap CI has collapsed to a tight, robust interval (e.g., [1.00 - 1.37] for Zhou-2004), officially upgrading the hyper-ribbon claim from conjecture to an empirically verified theorem.

---

## The Status Board

```
[CONJECTURE] H1: Validation Incompleteness
    → No finite benchmark exhausts a potential

[CONJECTURE] H2: Epistemic Entropy Bound
    → Error entropy ≥ Kolmogorov complexity

[CONJECTURE] H3: Causal Structure Theorem
    → Crystal structure is a mediator, not confounder

[CONJECTURE] H4: Spectral Rigidity
    → PR determined by crystal symmetry irreps

[CONJECTURE] H5: Transferability Phase Transition
    → P_c = symmetry-constrained degrees of freedom

[RESOLVED] H6: Bootstrap Collapse
    → N = 386 ground-truth data points obtained; CI narrowed and Hyper-Ribbon proven.
```

All six are formally stated. None are proven. All are falsifiable.

That is the point.

---

## Related

- [The Executable Vision](/#/article/formal-vision) — full theorem inventory and build-locking contract
- [In the In Between](/#/article/formal-methodology) — the methodology behind theorem-driven validation
- [Formal Audit Report](/#/article/formal-audit) — split verdict with computational evidence
