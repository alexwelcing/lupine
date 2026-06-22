# Response to Reviewer — IMMI-2026-ProjLaw

**Manuscript:** The Projection Law: Model-Ensemble Errors Point at Their Binding
Constraint
**Decision:** Accept with Major Revisions
**Author:** Alex Welcing

We thank the reviewer for an exceptionally careful and constructive report. The
three required revisions (temper Layer-2 quantitative claims; foreground the
Layer-2 reference confound; sharpen the convexity/Theorem-6 scoping) are all
made, and we went further: we executed a round-2 program that converts three of
the reviewer's concerns from caveats into computed results, and we honestly stage
the one sub-experiment that requires ab-initio compute we do not run locally.

Reproducibility note: every number below is produced by a committed script and
re-derivable with NumPy in seconds. New artifacts:
`replication/error-geometry/analyze_r2b_xc_bias_vector.py` (reference-free XC
bias), `analyze_r2d_localized_nesting.py` (held-out localized-code nesting),
`analyze_r4_power.py` (resolution-floor / power), `analyze_r2b_anchor.py`
(staged DFT-anchor primary, self-activating), `prereg_r2b_dft_anchor_spec.md`
(DFT job spec), and the machine-checked theorem
`ConvexProjection.consensus_needs_convexity` (Lean 4, 0 `sorry`).

---

## Required revision 1 — Temper Layer-2 quantitative claims (weakness 4A)

**Done, and strengthened.** The abstract and Results now lead with the honest
framing: "the *direction* is confirmed but its *magnitude* is weak," state the
effect-size failure (0.085 vs registered 0.30) inline, and call the conjunctive
test a failure, not a partial success.

We also directly addressed the resolution-floor criticism with computation
(`analyze_r4_power.py`). A symmetric 8×2 grid cannot be built from public
weights — only four architectures ship MatPES-r²SCAN — so rather than synthesize
models we recompute the contrast over the enlarged **11-model** set (4
MatPES-PBE architectures + 3 PBE-lineage anchors + 4 MatPES-r²SCAN
architectures). The label lattice grows from 70 to **330**, and the clustering
survives at **S_func = +0.325 vs S_arch = −0.068, permutation p = 0.007** —
genuinely below the old 1/70 floor, not pinned at it. A bootstrap over FCC
elements (continuous resolution, not lattice-capped) gives P(separation ≤ 0) =
0.037 with a 95% CI that grazes zero: significant direction, element-sample
limited. We state plainly that this raises resolution and quantifies uncertainty
on the confirmed direction but does **not** rescue the registered effect-size
threshold, whose clean-reference re-test is staged for round 2.

## Required revision 2 — Foreground the Layer-2 reference confound (weakness 4B)

**Done, and partially executed now.** The reference-standard convolution
(experimental for FCC, DFT-PBE for others) is moved into the main Layer-2 text
(§Layer 2, "Reference standards and the residual decomposition"), not buried in
Limitations. We explain why it does not bias the within-harness S_func/S_arch
contrast (the shared reference cancels between cells) but does blur the absolute
direction and the gauge, and why it is the leading explanation for the failed
effect size.

Crucially, one component of the reviewer's "decisive intervention" needs **no
new reference** and we computed it (`analyze_r2b_xc_bias_vector.py`): with the
architecture held fixed, Δ = y_PBE − y_r²SCAN is reference-free (the truth
cancels), isolating the exchange–correlation fingerprint. Result: the XC-bias
direction agrees across the four architectures on FCC metals at median cosine
**+0.64** (and is incoherent over all 15, +0.02 — the BCC/magnetic elements
carry their own deeper constraints). The noble-metal rotation reproduces with no
reference table at all: ΔC44 is negative (PBE softer) for Au (−8.5 GPa) and Pt
(−27 GPa) but not Ag (+12 GPa) — the same 2-of-3 pattern and the same Ag
exception we found against experiment. So the rotation *direction* is
reference-robust even though the effect-size magnitude is reference-sensitive.

The fully decisive 0 K all-electron PBE+r²SCAN elastic anchor (the reviewer's
"transformative" test) requires FHI-aims/WIEN2k compute we do not run on the dev
box. We do **not** fabricate it. It is specified as a reproducible GCP job
(`prereg_r2b_dft_anchor_spec.md`) and the consuming analysis
(`analyze_r2b_anchor.py`) is written and ships as a self-activating tripwire that
executes the registered primary the moment the references land.

## Required revision 3 — Convexity / Theorem-6 scoping (weakness 4D)

**Done in prose and in the formal corpus.** The abstract now states that the
formal theorems cover convex (and locally smooth) reachable sets and that their
application to non-convex neural-network families "is an empirical regularity
tested below, not a mathematical consequence of the theorems." A new theory-seam
paragraph and **Remark (Scoping: convex theorem vs. empirical extension)** make
the point unmissable: Theorem 6 is strictly pointwise; the consensus theorem's
proof uses convexity essentially; NN reachable sets are non-convex; the MLIP
consensus is therefore an empirical extension, and "why unrelated architectures
land in a common normal direction" is flagged as the central open problem.

We converted this conceptual point into a **machine-checked theorem**:
`ConvexProjection.consensus_needs_convexity` exhibits a two-point (non-convex)
family with two best approximations of one target whose residuals differ —
proving convexity is *necessary*, so the corpus asserts nothing about the
non-convex case (verified: `lake build` green, `#print axioms` shows only
propext/Classical.choice/Quot.sound, zero `sorry`).

---

## Weakness 4C — Post-hoc rationalization vs pre-registered failure

**Addressed by a claim typology and a held-out confirmation.** §Layer 2 now
carries an explicit typology that labels every claim as {pre-registered,
confirmed}, {pre-registered, failed}, or {post-hoc, registered-for-round-2}, so
no failed prediction is re-spun as a discovery.

For the most-criticized post-hoc story (SIESTA), we removed the stain
empirically (`analyze_r2d_localized_nesting.py`). We registered (R2-D) the
nested prediction that an independent localized-basis code dis-aligns from its
own pseudopotential table, and confirmed it on **two held-out codes that played
no role in forming the hypothesis**: against the four-code plane-wave
PseudoDojo-0.4 consensus (within-table alignment 0.94, CI [0.87, 0.97]), the
Gaussian-basis cp2k (median cosine +0.08, CI [−0.14, 0.29]) and wavelet-basis
BigDFT (+0.07, CI [−0.06, 0.19]) both fall entirely below the plane-wave band —
exactly as SIESTA does (+0.25). The basis-set constraint binds before the
pseudopotential for localized representations as a *class*, not as a SIESTA
idiosyncrasy. The 5d-metal nested constraint and the α≈0.98 inversion remain
explicitly labeled post-hoc, with R2-A registering the ordered 5d rotation test.

---

## Specific questions

**Q1 (independent corroboration of the bias fraction α≈0.98).** The three PR
diagnostics are algebraically coupled, so we proposed (and partly executed) an
*independent estimator*: the reference-free XC-bias vector (above) estimates the
shared-bias direction without the PR algebra, and the staged 0 K anchor will
estimate the pure fitting-residual fraction directly (1 − ‖fitting‖²/‖total‖²).
Agreement between the PR-internal α and these geometrically independent
estimators would be true corroboration; disagreement would bound the
isotropic-noise idealization. We state this design in the manuscript and the
anchor script computes it when references arrive.

**Q2 (Theorem 6 sensitivity to architecture width/depth / inductive bias).** Our
grid already spans equivariant message passing (MACE, CHGNet), graph
transformers (TensorNet, QET), and non-equivariant (M3GNet); within-functional
alignment holds across these very different inductive biases (S_func dominates
across the 11-model set). We added this as the explicit answer: the common
normal direction is empirically *insensitive* to architecture family at fixed
functional, which is the surprising content of the law and the open theoretical
problem (Remark). A controlled width/depth sweep is the natural next probe.

**Q3 (multiplicity / hierarchical correction).** Stated plainly in Limitations
and the typology: the two kill conditions were the primary endpoints; the other
five predictions were auxiliary robustness checks with **no** formal
hierarchical correction. We do not claim corrected family-wise significance for
the auxiliaries. Round 2's single-primary-endpoint design with symmetric
equivalence bounds (`prereg_round2.md`) is the correction going forward.

---

## Minor comments

- **Abstract density / Lean sentence.** Condensed the theorem sentence to one
  clause; the empirical findings now lead.
- **Fig 1b axis.** Caption now states the axis is a per-layer "alignment"
  statistic with different definitions: Layer 1 = Pearson r of scalar error
  norms (magnitude); Layers 2–3 = mean error-vector cosine (direction). They are
  not commensurate and not pooled; the PR gauge (Theorem: Gauge) is what relates
  magnitude order to directional collapse.
- **AI-use clause.** Retained and reaffirmed; the post-hoc nested-constraint
  interpretations are explicitly author scientific judgments (now labeled in the
  typology), with AI assistance confined to Lean proof engineering and drafting.

---

## Summary of what changed in the manuscript

1. Abstract: tempered Layer-2 magnitude claim; condensed Lean sentence; added
   the empirical-extension scoping clause.
2. §Theory: expanded Theorem-6 scoping paragraph + machine-checked Remark.
3. §Layer 2: promoted reference decomposition; reference-free XC-bias result;
   resolution-floor/power result; pre-registered-vs-post-hoc typology.
4. §Layer 3: held-out localized-code nesting confirmation (SIESTA de-stained).
5. §Limitations: r²SCAN all-electron anchor explicitly staged; SIESTA reading
   reclassified as registered round-2 prediction.
6. Lean corpus: `consensus_needs_convexity` (necessity of convexity), build
   green, 0 `sorry`.
