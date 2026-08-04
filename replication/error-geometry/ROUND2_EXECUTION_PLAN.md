# Round 2 Execution Plan — Projection Law (IMMI-2026-ProjLaw)

Status: AUTHORITATIVE PLAN. Grounded in the actual repo state as of 2026-06-21.
Maps every reviewer weakness / question to a registered experiment, an executable
path, and an honest blocker call. The Round-2 pre-registration
(`prereg_round2.md`, R2-A…R2-E, registered 2026-06-11) already anticipates most of
this program; this document makes the reviewer-driven amendments explicit.

## 0. What is already done (do not redo)

- Theoretical core: machine-checked in Lean 4 (ConvexProjection = Thms 1–2
  consensus; ProjectionLaw; SpectrumBridge; ErrorGeometry; AffineDecomposition),
  0 `sorry`, 0 new axioms.
- Layer 1 (classical, 559 potentials): r=0.95 within-family, 40-yr invariance.
- Layer 2 (4×2 MatPES grid + PBE anchors): S_func=+0.317 vs S_arch=−0.093,
  perm p=0.029 (2/70, floor); effect-size FAILED (0.085 vs 0.30); rotation
  confirmed on Au/Pt, not Ag; OOS correction median 68.9% (IQR 35–92%).
- Layer 3 (ACWF, 12 methods × 384 systems): P-Δ2 PASS (S_table=0.526 vs
  S_code=0.265, perm p=0.0172); P-Δ1 FAIL (0.459<0.50); P-Δ3 FAIL (Spearman
  −0.28, sign reversed); SIESTA dis-alignment present in data.
- Pre-registrations committed: `dffbe595` (4×2), `ebf39e33` (ACWF), R2-A…R2-E.

## 1. Reviewer weakness → action map

### 4A — Statistical power / N=8 resolution floor / failed effect size
- **Registered as:** R2-A (functional ladder; adds SevenNet-0 PBE + PET-MAD
  PBEsol/r2SCAN) and R2-E (MatPES confound disclosure).
- **Reviewer asks more:** expand the factorial to 6×2 / 8×2 (MACE, NequIP,
  Allegro, SevenNet) so the permutation space grows past 1/70 and the effect
  size can be re-tested against clean references.
- **Executable path:** evaluate additional PUBLIC foundation models
  (MACE-MP-0 ✓have, SevenNet-0, CHGNet-MatPES, MACE-MPAJ, ORB) on the local
  strain-energy harness. This expands the **PBE architecture axis** and the
  **dataset axis** (MPtrj/OMat vs MatPES). Full 8×2 with two functionals is NOT
  achievable from public weights (only M3GNet/TensorNet/CHGNet/QET ship
  MatPES-r2SCAN), so we expand asymmetrically and restructure the permutation
  test over the larger PBE-architecture set + the 4×2 functional block.
- **Amendment (R2-A-AMD1):** family/dataset assignments for every new model are
  fixed in an amendment BEFORE its data is parsed (pre-reg rule).
- **Re-test effect size:** with clean 0K DFT-PBE references (R2-B) the effect
  size is re-estimated; prediction is it returns toward ~0.30, proving the prior
  failure was reference noise, not a weak law.
- **STATUS:** install MLIP stack (matgl/mace/sevenn/chgnet + CUDA on A4500),
  run harness, restructure permutation, recompute. Long pole; launched as Track E.

### 4B — Reference-data confounds in Layer 2 (the decisive one)
- **Registered as:** R2-B (decisive reference anchor).
- **Reviewer asks:** 0K all-electron references in BOTH PBE and r2SCAN, to
  (i) isolate pure MLIP fitting error, (ii) isolate the XC bias vector, and
  (iii) close the loop with Layer 3 DFT error vectors.
- **PBE side (EXECUTABLE NOW):** ACWF provides all-electron PBE EOS (V0,B0,B1);
  for elastic constants we use Materials Project DFT-PBE 0K elastic tensors
  (PAW/PBE, the standard reference). Re-reference PBE-trained MLIPs against
  MP-PBE 0K → separates fitting residual from XC bias + thermal/ZP offsets.
- **r2SCAN side (STAGED — the one genuine blocker):** no public all-electron
  r2SCAN elastic-constant database exists and no DFT code is installed locally.
  Stage as a reproducible FHI-aims / WIEN2k job spec (GCP burst) + the analysis
  that consumes its output. Marked as the single pending external-compute item.
- **Registered primary (R2-B):** the DFT-PBE-vs-experiment difference vector
  reproduces the PBE-model error direction (median per-element cosine ≥ 0.5 over
  FCC); kill if 95% bootstrap CI inside [−0.2,+0.2].

### 4C — Post-hoc rationalization vs pre-registered failure
- **Registered as:** R2-A PRIMARY (5d noble-metal ordered rotation:
  PBE < PBEsol < r2SCAN) and R2-D (registered nesting on an independent
  localized-orbital code, removing the SIESTA post-hoc stain).
- **Action:** (i) add a typology box in the manuscript that labels every claim
  as {pre-registered, confirmed} / {pre-registered, failed} / {post-hoc,
  registered-for-round-2} so nothing is smuggled; (ii) execute R2-D's secondary
  nesting on the localized codes that ARE in ACWF (bigdft=HGH-K, cp2k=GTH) as a
  partial independent test of the SIESTA mechanism; (iii) register the 5d
  relativistic-correlation nested-constraint as R2-A-AMD2 before any new run.

### 4D — Applicability of convexity to neural networks
- **Already in paper (lines 244–249, 618–620):** Thm 6 (thm:smooth) gives
  pointwise orthogonality only; the text already says "it does not follow … that
  every local minimizer shares the same residual." Reviewer wants this made
  prominent and unambiguous: MLIP consensus is an EMPIRICAL regularity extending
  the convex theory, not a consequence of it.
- **Action (manuscript):** add a named "empirical-extension" paragraph at the
  theory/MLIP seam; restate in Discussion and Limitations.
- **Action (formal):** add `EmpiricalRegularity` remark in lean-spec stating the
  convex theorems' hypotheses are NOT satisfied by general NN reachable sets, so
  the consensus theorem is not asserted there; keep 0 `sorry`. This converts the
  reviewer's conceptual point into a machine-checked scoping statement.

## 2. Reviewer questions → answers

- **Q1 (PR gauge inversion, independent α corroboration):** design an
  independent test — measure the bias fraction via the R2-B clean-reference
  split (fitting residual vs XC-bias component) and via a held-out functional
  pair; report whether the α≈0.98 inverts consistently across independent
  estimators. Documented in the response + the R2-B analysis.
- **Q2 (Thm 6 + loss-landscape width/depth):** the expanded grid (Track E)
  explicitly spans equivariant message-passing (MACE, NequIP-lineage) vs
  graph-transformer (TensorNet/QET) vs non-equivariant (M3GNet); we report
  within-functional cosine as a function of architectural distance. Registered
  as a secondary analysis of R2-A.
- **Q3 (multiplicity / hierarchical correction):** the kill conditions were
  primary (2 of them); the other 5 were auxiliary robustness checks with NO
  formal hierarchical correction — stated plainly. Round 2's single-primary
  design + symmetric equivalence bounds is the correction. State in manuscript +
  response.

## 3. Minor comments → actions

- Abstract: condense the Lean/theorem sentence; lead the empirical result with
  the honest framing.
- Fig 1b axis: clarify how r=0.95 (Layer 1) relates to S_func/S_table
  (Layers 2/3) — relabel / add a note that Layer 1 uses Pearson r on scalar
  error norms while Layers 2/3 use mean error-vector cosine (a directional
  statistic); the gauge unifies them.
- AI-use clause: keep the "scientific claims and decisions" carve-out explicit,
  especially for the post-hoc nested-constraint interpretations.

## 4. Execution tracks and status

| Track | Deliverable | Status | Blocker |
|---|---|---|---|
| A | This plan | done | — |
| B | Manuscript revisions (4A/4B/4C/4D text) | in progress | — |
| C | Lean EmpiricalRegularity remark (4D formal) | pending | build time |
| D1 | R2-B clean PBE reference analysis | pending | MP API reach |
| D2 | R2-D secondary nesting (bigdft/cp2k) | pending | — (data in hand) |
| E | Expanded MLIP grid eval (4A) | pending | MLIP stack install + GPU run |
| F | r2SCAN all-electron DFT spec (4B r2SCAN) | pending | external DFT compute |
| G | Point-by-point reviewer response | pending | — |
| V | Verify: lake build, Tier-1 replay, figures, compile | pending | — |

## 5. Honest scope statement

This program is bounded by two hard realities, stated up front:
1. A true symmetric 8×2 (eight architectures × two functionals) cannot be built
   from public weights — only four architectures ship MatPES-r2SCAN. We expand
   the architecture/dataset axes on PBE and keep the 4×2 functional block; the
   permutation test is restructured accordingly and reported honestly.
2. All-electron r2SCAN elastic constants for 15 metals require ab-initio compute
   (FHI-aims/WIEN2k) not available locally; that single sub-experiment is staged
   as a reproducible spec and explicitly flagged as the one pending item.
Everything else — manuscript revisions, the Lean scoping remark, the PBE clean
reference, the ACWF nesting replication, the expanded-grid evaluation, the
reviewer response — is executed to a verified state.
