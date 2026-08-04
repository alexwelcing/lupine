# Inventory: Causal Acceleration Theorem in the Lupine Repository

**Date:** 2025-06-06
**Analyst:** Research Analyst (HPC / MD Acceleration)
**Repository:** alexwelcing/lupine / archive/KIMI_MLIP_UNIVERSAL/acceleration/
**Files Read:** acceleration_theorem.html (27.7 KB), causal_acceleration_theorem.pdf (839 KB, 8 pages), fig_layerwise.png, fig_speedup_bound.png

---

## 1. Core Claim: What Acceleration is Promised and Under What Conditions

**The headline result (Theorem 1):**
For any foundation MLIP M in the architectural class F, a layerwise refusal policy with stop layer k* achieves expected inference speedup bounded below by:

$$\mathbb{E}\left[\frac{T_{\text{full}}}{T_{\pi_{k^*}}}\right] \geq 1 + \frac{L - k^*}{L} \cdot (1 - \kappa_1) \cdot \left(1 - \frac{\tau_{k^*}}{\tau_{k^*} + r(\mathcal{F})}\right)$$

**Key parameters:**
- **L**: Total number of message-passing layers in the model
- **k***: Stop layer — the deepest layer at which refusal is checked; refusal at or before k* aborts the remaining L-k* layers
- **κ₁**: Training-distribution coverage constant (fraction of chemically relevant config space covered by training data; e.g., MPtrj ≈ 0.80, OMat24 ≈ 0.92)
- **τ_{k*}**: Refusal threshold at the stop layer, calibrated to a target false-refusal rate α
- **r(F)**: Class-uniform reach bound from the Universality Theorem (Paper II)

**Concrete numbers from the document:**
- For a 4-layer MACE with k*=2, κ₁=0.80, τ=r(F)/2: **guaranteed speedup ≥ 1.033×** (lower bound)
- For workflows with 40% OOD configurations (screening): **practical speedup 2–5×** for k*=2
- With multiplicative stacking (neighbor pruning + FP16 + graph compilation + refusal): **3.2–5.4× combined**

**Critical framing:** This is a *lower-bound theorem*, not an empirical benchmark. The actual speedup depends on the test distribution's OOD fraction. The theorem guarantees a minimum speedup that is distribution-independent — the κ₁, r(F), and L are all known from the model class and training data.

---

## 2. Mechanism: How Error Geometry Enables Speedup

**Core mechanism: Layerwise descriptor-distance monotonicity enables *early abortion* of inference.**

The acceleration works through a refusal policy, not active learning or adaptive sampling. Specifically:

1. **Layerwise Mahalanobis distance** D_k(x) is computed at each intermediate layer k, measuring how far the current configuration's descriptor representation is from the training manifold in descriptor space.

2. **If D_k(x) > τ_k at any layer k ≤ k***, inference **aborts immediately**, skipping layers k+1 through L and the final readout. The model returns "refuse" instead of computing a (likely incorrect) prediction.

3. **Safety guarantee (Lemma 1):** The layerwise distance D_k(x) is *monotonically increasing* for OOD configurations: D₁(x) ≤ D₂(x) ≤ ... ≤ D_L(x). This means:
   - A configuration that would trigger refusal at layer L would also have triggered refusal at some earlier layer.
   - Early refusal is *safe*: you never miss a late-stage refusal by stopping early.
   - There are no pathological cases where the distance stays small through k* and then jumps discontinuously.

4. **Why this saves compute:** For OOD configurations (estimated at 8-20% of test configs for production models, potentially 40% for screening), the model aborts after computing only k* layers instead of all L layers, saving (L-k*)/L fraction of compute per refused configuration.

5. **For in-distribution configurations:** D_k(x) ≈ 0 near the training manifold (Lemma 2: exponential contraction), so refusal never triggers and full inference proceeds. No slowdown on the "good" data.

**This is fundamentally a compute-aware abstention mechanism** — it turns the safety feature of refusal (Paper III) into a performance optimization by exploiting the geometric structure of the error manifold established in Paper II.

---

## 3. Assumptions: What Must Be True for the Acceleration to Work

### Architectural Assumptions (from F1–F3, Paper II)
1. **(F1) Training coverage:** The training distribution covers a fraction κ₁ of the chemically relevant configuration space. The theorem explicitly requires κ₁ ∈ (0,1).
2. **(F2) Message-passing structure:** The model is an L-layer equivariant message-passing network with well-defined layerwise descriptor maps φ^(k).
3. **(F3) Lipschitz smoothness:** Both message functions m^(k) and update functions u^(k) are Lipschitz-continuous with finite constants L_m^(k) and L_u^(k). The proof uses these to bound distance growth.

### Geometric Assumptions (from Universality Theorem, Paper II)
4. **Class-uniform reach bound r(F):** All models in F share a uniform positive reach for their error manifolds. This ensures the nearest-point projection is well-behaved and the refusal thresholds are class-uniform.
5. **Smooth error manifold M(M):** The per-model error manifold is smooth enough for Federer's tubular neighborhood theorem to apply (needed for Lemma 2).

### Operational Assumptions
6. **Uniform per-layer cost:** The theorem assumes wall-clock time is proportional to the number of layers computed (T_full ∝ L).
7. **Mahalanobis distance computable at inference:** The layerwise training covariance Σ_k must be pre-computed and available at runtime.
8. **Gaussian approximation for calibration:** Corollary 1 assumes the layer-k descriptor distribution on the training data is approximately Gaussian, enabling chi-squared threshold calibration.
9. **Independence of other accelerations:** Corollary 2 (multiplicative stacking) requires that other acceleration techniques do not alter the layerwise descriptor distances.

### Known Limitations
- The Lipschitz constants L_m^(k), L_u^(k) are architecture-specific; while finiteness is guaranteed by (F3), *sharp* bounds are "not yet published" (the document cites this as Open Problem 1 from Paper II).
- The speedup is a lower bound; actual speedup depends on the empirical OOD fraction, which may exceed (1-κ₁) for adversarial inputs.

---

## 4. Empirical Evidence: Benchmarks, Simulations, Validation Data

**Short answer: There is NO empirical validation in the acceleration directory.**

The repository contains:
- **2 figures** (both appear to be *diagrammatic/schematic*, not empirical data):
  - `fig_layerwise.png`: Shows a conceptual plot of layerwise descriptor distance for ID vs OOD configs, plus a Pareto frontier of speedup vs false refusal rate. The curves are illustrative — no axis labels with empirical units, no error bars, no mention of specific benchmarks.
  - `fig_speedup_bound.png`: Plots the theoretical lower bound from Equation (4) as a function of κ₁ for different k*. Again, this is a parametric plot of the theorem itself — not empirical validation.

- **2 tables** (both are parametric/illustrative):
  - Table 1: Shows calibrated thresholds and speedup bounds for a hypothetical 4-layer MACE with κ₁=0.80. The numbers are derived from the theorem, not measured.
  - Table 2: Shows multiplicative speedup stacking estimates by combining the refusal theorem with *hand-waved* standalone speedups from other techniques (1.5× neighbor pruning, 1.3× FP16, 1.4× ONNX). No citations or measurements support these standalone numbers.

- **No experimental code, no simulation logs, no benchmark results, no comparison with existing MD acceleration methods.**

- The document references MPtrj (κ₁≈0.80) and OMat24 (κ₁≈0.92) as "typical foundation MLIP training corpora," but these coverage values are asserted, not measured or cited.

**Conclusion on empirical evidence:** This is a *pure theory paper* at this stage. The figures and tables are pedagogical illustrations of the theorem, not experimental results.

---

## 5. Relation to Papers 1–3: Which Results from the Trilogy Does This Build On?

The acceleration theorem is explicitly positioned as **"Paper III — Acceleration Lane"** and a "companion theorem to the Refusal-Mode framework." It builds on the trilogy in three specific ways:

### Direct Dependencies on Paper I (CMET — Causal Manifold Error Theorem)
- **Condition (F3)** — Lipschitz smoothness of equivariant message-passing layers. This is the smoothness primitive that enables the distance monotonicity proof (Lemma 1).
- The general framework of error manifolds and descriptor-space geometry.

### Direct Dependencies on Paper II (Universality Theorem)
- **Clause (v)** of the Universality Theorem — the partition of configuration space into prediction region (Lipschitz projection) and refusal region (projection fails). This is the *geometric foundation* of the refusal policy.
- **Class-uniform reach bound r(F)** — enables the threshold calibration and the probability bound on missing late-stage refusals.
- **Clause (iii)** — Vandermonde decay rate ρ(F), which bounds the intrinsic dimension d_k at each layer, controlling the degrees of freedom in the chi-squared calibration (Corollary 1).
- **Condition (F1)** — training coverage κ₁, which appears *explicitly* in the speedup bound.
- **Federer's Theorem 4.8(8)** (invoked in Lemma 2) — from the geometric analysis in Paper II.

### Position Within Paper III (Refusal-Mode Framework)
- The document frames itself as the *acceleration* aspect of the refusal-mode paper, while the "third paper in the trilogy" treats the "operational criteria for refusal — when should a model abstain, and what mode of abstention is appropriate."
- The acceleration theorem *reframes refusal from a safety feature into a performance optimization*.
- The multiplicative stacking corollary connects to practical deployment scenarios.

**Without Papers I and II, the acceleration theorem would not have a foundation:** the class-uniform geometry (Paper II) is essential for the threshold calibration, the smoothness (Paper I) is essential for the monotonicity lemma, and the coverage constant κ₁ (F1, Paper II) is an explicit parameter in the bound.

---

## 6. Completeness: Is This Ready for Publication? What Gaps Remain?

### What IS Present (Strengths)
1. **Complete mathematical structure:** Theorem + 2 Lemmas + 2 Corollaries + full proofs
2. **Clear chain of reasoning:** Definitions → Monotonicity Lemma → Contraction Lemma → Main Theorem → Calibration → Stacking
3. **Concrete operational guidance:** Table 1 provides calibrated thresholds for different use cases (screening, production MD, validation)
4. **Multiplicative stacking result:** Shows how the technique composes with existing accelerations
5. **Good pedagogical framing:** The "Theorem 1 in One Sentence" box and insight callouts communicate the result clearly
6. **Well-typeset HTML with KaTeX rendering** and a matching PDF version
7. **Two figures** illustrating the key concepts

### What is MISSING (Critical Gaps for Publication)

#### A. No Empirical Validation (MOST CRITICAL)
- No actual inference speedup measurements on any MLIP model
- No benchmarks against baseline full-inference on any test set (e.g., MD trajectory, materials screening)
- No measured false refusal rates to validate the chi-squared calibration
- No wall-clock timing data to confirm the uniform-per-layer-cost assumption
- No comparison with existing acceleration methods (e.g., DeepSpeed, TorchScript, custom CUDA kernels for MACE)

#### B. Coverage Constants are Asserted, Not Measured
- κ₁ ≈ 0.80 for MPtrj and κ₁ ≈ 0.92 for OMat24 are stated without citation or measurement methodology
- No definition of how "coverage" is operationalized — is it based on descriptor-space density? configuration-space volume? chemical diversity metrics?

#### C. Reach Bound r(F) is Not Quantified
- The class-uniform reach r(F) appears in the bound but no numerical value is given
- Without knowing r(F), the threshold selection τ = r(F)/2 is purely illustrative
- The document admits sharp Lipschitz bounds are an "Open Problem"

#### D. Missing Practical Considerations
- **Runtime overhead of computing D_k(x):** Computing Mahalanobis distance to the training manifold at each layer requires (a) pre-computed covariance Σ_k, (b) nearest-neighbor search over the training set. The theorem does not account for this overhead.
- **Memory cost:** Storing training descriptors for all k layers and all N atoms
- **Implementation details:** How is the nearest-neighbor search done efficiently? Is it approximate (ANN)? What's the latency impact?
- **Interaction with batching:** MD simulations typically batch many configs; the analysis is per-config

#### E. Validation of Key Assumptions
- Is the Gaussian approximation for descriptor distributions actually valid? (No goodness-of-fit test)
- Is the uniform per-layer cost assumption valid for real MACE architectures? (Layer costs vary due to different cutoff radii, neighbor counts, etc.)
- Is distance monotonicity actually observed in real models? (No empirical verification)

#### F. Related Work Gap
- No comparison with existing "early exit" or "adaptive inference" literature from computer vision or NLP
- No comparison with uncertainty-quantification-based acceleration methods for MD
- No citation of prior work on selective classification or abstention in ML

### Readiness Assessment

| Criterion | Status | Notes |
|---|---|---|
| Mathematical rigor | ✅ Strong | Full proofs, well-structured |
| Theoretical novelty | ✅ Good | First theorem linking refusal geometry to inference speedup |
| Empirical validation | ❌ Missing | No experiments whatsoever |
| Practical deployability | ⚠️ Partial | Tables give guidance but no implementation |
| Connection to trilogy | ✅ Strong | Explicit dependencies on Papers I and II |
| Self-contained readability | ⚠️ Partial | Requires Papers I and II for F1–F3 definitions |
| Literature positioning | ❌ Missing | No related work section |

**Verdict:** This is a **solid theory sketch** that is **not yet publication-ready**. The mathematical structure is sound and the idea is compelling, but it needs:
1. **Empirical validation** — at minimum, a demonstration on a real MACE model showing measured speedup and false refusal rates on a real test set
2. **Quantification of r(F)** and sharper Lipschitz bounds
3. **Accounting for runtime overhead** of distance computation
4. **Related work** section positioning against existing early-exit and selective inference literature
5. **Clarification** of whether the 1.03× "guaranteed" bound is practically meaningful (it is very small)

The practical value likely comes from the 2–5× speedups on OOD-heavy workloads (screening), not the 1.03× universal lower bound — but this claim is currently backed only by a back-of-the-envelope calculation, not data.

---

## Appendix: Repository Structure

```
archive/KIMI_MLIP_UNIVERSAL/acceleration/
├── acceleration_theorem.html       # 27.7 KB — Main HTML document (full theorem, proofs, tables, figs)
├── causal_acceleration_theorem.pdf  # 839 KB — PDF rendering of the HTML (8 pages)
├── fig_layerwise.png               # 292 KB — Schematic: layerwise distance monotonicity + Pareto frontier
└── fig_speedup_bound.png           # 248 KB — Schematic: speedup lower bound vs κ₁ for different k*
```

**Note:** The GitHub UI lists additional files/directories (experiments/, lean_proof/, manuscript/, summary/, formal_proof_paper.html, partnership_prospectus.html, replicator_roadmap.html, vc_explainer.html) but these do not exist in the actual repository — they are artifacts from the directory listing UI.
