# Cohesion Assessment: Lupine Research Trilogy
## Alex Welcing — Lupine Science — June 2026

---

## Executive Summary

The lupine repository contains substantially more research than represented in any single paper draft. Across four major research threads (empirical discovery, universality theorem, formal verification, acceleration), the work ranges from 50% to 90% complete. The primary gap is **cohesion** — the papers don't read as one research program, notation drifts, claims are inconsistently scoped, and critical audit findings (from the Lean formalization) haven't been incorporated back into earlier papers.

**Recommendation:** A targeted revision pass on Papers 1 and 2 to incorporate Lean audit findings and align notation, followed by writing Paper 3 as a formal-methods paper around the existing proofs.

---

## 1. Inventory of Research Assets

### Paper 1: Empirical Discovery (STATUS: ~90% complete)
**Files:** `paper/immi-paper.tex` (original), `paper_revised.html` (our revision), `paper_1_final.html` (current best)
**What's strong:** Complete dataset (559 potentials, 15 elements, 1,677 rows), all figures generated, statistical analysis complete, ecological fallacy demonstrated via pair-family stratification, meta-analysis with Olkin-Pratt sensitivity.
**What's weak:** Simpson's paradox language is imprecise; needs Lean audit correction.

### Paper 2: Universality Theorem (STATUS: ~75% complete)
**Files:** `KIMI_MLIP_UNIVERSAL/manuscript/` (9 sections + appendix, all LaTeX source)
**What's strong:** 6-clause theorem with formal proof sketches, Cross-Model Vandermonde Lemma, pre-registered predictions with falsification thresholds, escape analysis (3 error classes), CMET framework, falsification report.
**What's weak:** Central gap — Vandermonde assumption for equivariant networks unproven; voice inconsistent with Paper 1; notation not aligned; proofs deferred to appendix but appendix incomplete.

### Paper 3: Formal Verification (STATUS: ~60% complete)
**Files:** `lean-spec/` (27 .lean files, 48+ theorems, 0 sorry, 0 axioms)
**What's strong:** T30 (HyperRibbon PR < 2), T50 (Context-Specific Operative Value), T102 (a-priori regime gate), full audit module (T108-T112), build-locking epistemic contracts, neural-symbolic flywheel.
**What's weak:** ALL data is synthetic (NIST scaffold has 9 rows, all predictions missing); no paper has been written around the proofs; the audit caught a Paper 1 overstatement that hasn't been corrected.

### Paper 4: Acceleration Theorem (STATUS: ~50% complete)
**Files:** `KIMI_MLIP_UNIVERSAL/acceleration/` (complete theory PDF, 0 empirical validation)
**What's strong:** Full mathematical structure (Theorem + 2 Lemmas + 2 Corollaries), layerwise early-abortion mechanism, speedup bound formula.
**What's weak:** No benchmarks, no wall-clock data, no real model deployment, no related work section.

---

## 2. Critical Cohesion Issues

### Issue A: Simpson's Paradox Language (CRITICAL — affects Paper 1)

**Problem:** Paper 1 claims "Simpson's paradox detected" in multiple places. The Lean formal audit (T111) found this claim is **FABRICATED** — the strict reversal magnitude is < 0.1, which doesn't meet the Kievit et al. threshold of 0.3.

**What IS true:** The pair-family stratification (Section 4.4) genuinely demonstrates ecological fallacy — pooled r = 0.82 vs. within-family mean r = 0.95, with reversal magnitude 0.13 and substantial between-family variance. This is ecological fallacy in the Robinson (1950) sense, not Simpson's paradox in the Bickel (1975) sense.

**Fix required:** Replace all "Simpson's paradox" language with "ecological fallacy" throughout Paper 1. Reserve "Simpson's paradox" for strict sign reversals (which didn't occur). This is a terminology correction, not a scientific retraction — the ecological fallacy finding is real and important.

### Issue B: Synthetic vs. Real Data in Lean (CRITICAL — affects Paper 3)

**Problem:** All 48 Lean theorems are proven on synthetic data (72 FCC entries, 42 BCC entries, generated programmatically). The NIST scaffold exists but has all predictions missing. This means the formal proofs verify mathematical structure, not empirical accuracy.

**Implication:** Paper 3 must be framed as "formal verification of mathematical structure with synthetic validation" not "formal verification of empirical claims." The epistemic gap is honest and should be highlighted as a feature — the formalization separates "what's mathematically true" from "what's empirically instantiated."

### Issue C: Notation Drift (MODERATE — affects Papers 1-2)

Paper 2 introduces notation that Paper 1 doesn't use:
- $\mathcal{F}$ (architectural class)
- $\mathcal{M}(M)$ (error manifold)
- $\rho(\mathcal{F})$ (Vandermonde decay rate)
- $d(\mathcal{F})$ (intrinsic dimension)
- $\kappa_1, \kappa_2, \kappa_3$ (class constants)

Paper 1 should introduce $\mathcal{M}(M)$ descriptively so Paper 2 can pick it up naturally. The class constants ($\kappa$'s) should only appear in Paper 2.

### Issue D: Cross-Paradigm Claim Scope (MODERATE — affects Papers 1-2)

Paper 1's MLIP section (4.6) should be reframed as a "proof of concept" that motivates Paper 2's theorem, not as evidence for paradigm independence. Paper 2 then provides the theoretical framework, and the pre-registered predictions (clauses iv and vi) become the empirical test.

### Issue E: The Trilogy Narrative Arc (MODERATE — affects all papers)

Currently the papers don't explicitly reference each other as a sequence. Each should signal its position:
- Paper 1: "The theoretical framework and formal proof appear in companion papers [2, 3]."
- Paper 2: "The empirical discovery motivating this theorem is reported in [1]; the formal verification is in [3]."
- Paper 3: "The empirical discovery is in [1]; the theoretical theorem is in [2]. This paper provides the machine-checked proof."

---

## 3. What's Actually Done vs. Claimed as Future

| Claimed as "Future Work" in Revised Draft | Actually in Repo | Status |
|---|---|---|
| R1: Expand to 50+ elements | Partial — experiments/ has some data | **In progress** |
| R2: Formal proof FIM→covariance | `lean-spec/` has T30 + appendix sketch | **Partially done** |
| R3: Controlled d-band experiment | Not started | Future |
| R4: Cross-paradigm with 10+ MLIPs | `KIMI_MLIP_UNIVERSAL/manuscript/` has theorem + predictions | **Partially done** |
| R5: Geometric UQ | `KIMI_MLIP_UNIVERSAL/experiments/` has falsification framework | **Partially done** |
| R6: Active learning integration | `distiller/` has ODF framework | **Partially done** |
| R7: Production software | `distiller/` has agents, schemas, tests | **Partially done** |
| R8: Binary/ternary alloys | Not started | Future |

**Conclusion:** The repo is 2-3x further along than the revised draft acknowledged. Much of the "future work" is actually "ongoing work" or "partially completed work."

---

## 4. Recommended Revision Plan

### Immediate (this week)
1. **Paper 1 hotfix:** Correct Simpson's paradox → ecological fallacy throughout
2. **Paper 1 notation:** Introduce $\mathcal{M}(M)$ descriptively, align with Paper 2
3. **Paper 1 trilogy framing:** Add companion paper references

### Short-term (next 2-3 weeks)
4. **Paper 2 revision:** Align voice/notation with Paper 1, complete proof appendix, address Vandermonde gap honestly
5. **Paper 2 Lean integration:** Reference T30 and T50 from the formalization as supporting evidence

### Medium-term (next 1-2 months)
6. **Paper 3 write-up:** Write the formal verification paper around existing Lean proofs, frame synthetic data honestly
7. **Paper 4 decision:** Decide whether to pursue empirical validation or publish as theory-only

---

## 5. The Honest Story

The strongest narrative arc for the trilogy:

**Paper 1:** We discovered that prediction errors for 559 interatomic potentials universally compress onto low-dimensional hyper-ribbon manifolds (PR 1.05-1.86). Standard benchmarking commits ecological fallacy — aggregation across model families obscures high internal consistency. We tested three foundation MLIPs and showed the error-geometry framework extends to neural networks (proof of concept, not proof of universality).

**Paper 2:** We prove a Universality Theorem: all models in an architectural class $\mathcal{F}$ share class-uniform geometric structure in their error manifolds. Six clauses cover intrinsic dimension, sample complexity, Vandermonde decay, active learning, two-mode inference, and generational stability. Two clauses are proved; two are pre-registered predictions with falsification thresholds. The central gap — Vandermonde structure for equivariant networks — is honestly flagged.

**Paper 3:** We formally verify the hyper-ribbon theorem (PR < 2) and the Context-Specific Operative Value theorem in Lean 4, with 48 theorems, 0 sorry proofs, and 0 axioms. The formal audit caught an overstatement in Paper 1: strict Simpson's reversal was not present in the empirical data; the genuine finding was ecological fallacy via pair-family stratification. All proofs are machine-checked on synthetic data with full provenance tracking.

This is a coherent, honest, and methodologically sophisticated research program. The key to its success is intellectual honesty about what's proved, what's predicted, and what's exploratory.
