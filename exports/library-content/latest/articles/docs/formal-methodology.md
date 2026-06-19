# In the In Between: A Methodology for Formal Validation

> *We are not running LAMMPS. We are formalizing what it means to validate without running it all.*

This page explains why we built a Lean 4 formal specification instead of installing LAMMPS and running simulations.

---

## The False Dichotomy

Computational materials science operates on a false dichotomy:

1. **Run everything** — brute-force benchmark every potential on every material. Expensive. Slow. Never complete.
2. **Trust the PDF** — read the paper, look at the RMSE table, and hope the authors checked their work.

There is a third option:

3. **Formalize the gap** — write down exactly what would need to be true for the claim to be valid, prove what you can prove, and document the rest as acknowledged gaps.

---

## What "In Between" Means

An interatomic potential claim sits on a spectrum:

| Position | Example | Status |
|----------|---------|--------|
| **Formal proof** | PR ≤ min(P, N) for differentiable potentials | Proven for synthetic data; real proof needs inverse function theorem |
| **In between** | Ground-truth NIST errors converge to the synthetic manifold | Well-posed conjecture; no ground truth yet |
| **Physical experiment** | NIST IPR elastic constants | Available but not yet computed with our pipeline |

The "in between" is where most validation science actually lives. Papers pretend they are at the experiment end. We formalize that they are in the middle.

---

## The Three Layers

### Layer 1: Synthetic Data (Proven)

We embedded 72 FCC + 42 BCC synthetic entries directly into the Lean source. These are not loaded from a file at runtime — they are **compile-time constants**.

**Why this matters:** If someone edits the data, the theorems about the data are re-checked at build time. You cannot silently change a value and break a proof without the build failing.

**Theorems at this layer:**
- Count theorems (`syntheticFccCount = 72`)
- Provenance theorems (`syntheticFccIsSynthetic = true`)
- Structural theorems (`nistScaffoldAlMissing = true`)

### Layer 2: Computed Properties (Proven by `native_decide`)

We compute statistics (correlation, participation ratio, Simpson's paradox detection) and prove properties about the computed values.

**Why `native_decide`:** Lean compiles the expression to native code, runs it, and checks the result. This is not a symbolic proof — it is a **reproducible computation** that happens at compile time.

**Theorems at this layer:**
- `pooledRBelowMinus08` — pooled correlation < −0.8
- `fccEamPRBounded` — PR ∈ (1.2, 1.3)
- `fccAllSatisfiesHyperRibbon` — PR/n < 0.5

### Layer 3: The Epistemic Gap (Documented)

Some claims require ground-truth data we do not have. Rather than pretend they are proven, we document them as gaps.

**Why documented gaps are honest:** Every theorem is fully proven. The gaps are not `sorry` proofs — they are explicit records of what would need to happen to upgrade from synthetic to NIST-backed validation.

**Documented gaps:**
- All predicted values are hand-typed, not computed from NIST IPR potentials
- Reference values lack DOI citations
- Experiment was not pre-registered
- No formal data provenance tracking in the original Rust code
- Bootstrap CIs rely on non-deterministic random sampling

---

## Why Not Just Run LAMMPS?

We could install LAMMPS, download NIST potentials, and compute elastic constants for Al. Here's why we chose not to:

1. **Scope control.** Running one simulation creates pressure to run ten. Formalizing the validation structure is invariant to how many simulations we run.

2. **Reproducibility.** A LAMMPS trace is a reproducible artifact — but only if you save the exact input script, potential file, and LAMMPS version. We formalized what a valid trace looks like (`Computation.LammpsTrace.lean`) before producing any traces.

3. **Epistemic clarity.** Running a simulation gives you a number. Proving a theorem gives you a **guarantee** that holds for all inputs in a class. We need both, but the formal layer comes first.

4. **Cost.** GPU time is expensive. Compile time is cheap. We can iterate on hypotheses at compile time, then run simulations only for the hypotheses that survive formal scrutiny.

---

## The Audit as Methodology

Our audit report is not a blog post. It is a **computed string** generated from proven theorems:

```lean
def fullAuditReport : String :=
  "[CLAIM 1] Simpson's Paradox in BCC Elastic Constants\n" ++
  "  " ++ simpsonsParadoxVerdict ++ "\n\n" ++
  "[CLAIM 2] Hyper-Ribbon Manifold Dimensionality\n" ++
  "  " ++ hyperRibbonVerdict ++ "\n\n" ++
  ...
```

The verdict strings are themselves proven:
- `simpsonVerdictContainsFabricated` — the string contains "FABRICATED"
- `hyperRibbonVerdictContainsConsistent` — the string contains "CONSISTENT"

If the computed statistics shift, the build fails. The audit cannot drift.

---

## Future Work: Closing the Gap

The documented gaps define exactly what needs to happen to close the epistemic boundary:

1. Compute NIST-backed LAMMPS traces for the 9-row Al scaffold
2. Re-run the paradox detector on real data
3. Re-compute participation ratios on real error vectors
4. Prove (or refute) the hyper-ribbon claim on ground truth
5. Seed the RNG and record the seed for deterministic CIs

Each step is a well-posed theorem schema. The gap is a **TODO list written in logic**.

---

## Summary

| Approach | Cost | Guarantee | Gap visibility |
|----------|------|-----------|----------------|
| Run everything | $$$$ | None (never complete) | Hidden |
| Trust the PDF | $ | None | Hidden |
| **Formalize the gap** | $ | Compile-time checked | **Explicit (documented)** |

We chose the third path. The build passes. The gap is documented. The hypotheses are falsifiable.

That is what it means to be **in the in between**.

---

## Related

- [The Executable Vision](/#/article/formal-vision) — build-locking contract and theorem inventory
- [Formal Audit Report](/#/article/formal-audit) — split verdict with computational evidence
- [Six Meta-Scientific Hypotheses](/#/article/formal-hypotheses) — the new research agenda
