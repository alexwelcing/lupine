# Phonon Benchmarking Report: Key Findings Relevant to GLIM

## Executive Summary

The Phonon Frequency Spectrum Benchmarking Deep Research report provides a comprehensive technical framework for assessing 23 interatomic potentials across 12,000 materials (276,000 phonon calculations total). The report establishes systematic methodologies, performance metrics, and computational strategies essential for the GLIM project.

## Critical Findings for GLIM Implementation

### 1. Phonon Accuracy as the Gold Standard for Potential Validation

**Key Insight:** Phonon frequencies probe second-order energy derivatives, making them exponentially more sensitive to potential errors than energies/forces (which depend on zeroth/first derivatives).

- Phonon benchmarks reveal "force-constant collapse" in neural network potentials: models can predict reasonable forces yet severely inaccurate force constants
- PhononBench evaluation of 108,843 AI-generated structures: only 25.83% dynamically stable
- Phonon validation is essential before deploying potentials for thermodynamic property prediction and materials discovery

**GLIM Application:** Phonon errors directly translate to property errors (~1% frequency error → ~1% entropy/free energy error, ~2% heat capacity error at room temperature). Explicit phonon testing prevents catastrophic failures in derived property predictions.

### 2. Accuracy Hierarchy Across Potential Families

**Clear Performance Ranking:**
- Universal MLIPs: 2–10 meV typical accuracy
- Fine-tuned MLIPs: <2 meV (sub-meV achievable)
- Classical potentials: 20–100+ meV for general systems

**Top Performers:**
- **ORB v3:** Highest ranking in uMLIP benchmark, ~10× more efficient than OMat24
- **SevenNet-0:** Top-tier accuracy with favorable computational scaling
- **MatterSim:** DFT-level accuracy across >10,000 materials
- **OMat24:** Top-tier accuracy but drastically steeper scaling (CPU cost)
- **eqV2-M (fine-tuned):** 0.174 log(W/m·K) MAE for thermal conductivity

**GLIM Implication:** Pareto frontier analysis enables optimal potential selection based on accuracy vs. computational cost constraints.

### 3. Composition-Dependent Performance Variations

**Systematic Accuracy Pattern:**
Main-group compounds > Transition metals > Heavy elements/Rare earths

**Challenging Systems:**
- Van der Waals materials: Large errors for PBE-trained models without dispersion corrections
- Systems with H + heavy elements: Unusual coordination patterns difficult to model
- Late transition metal oxides: Strong correlation effects not captured

**GLIM Strategy:** Stratified benchmarking by crystal system, chemistry (binary/ternary/quaternary), and bonding type enables identification of hidden failure modes and targeted improvements.

### 4. Displacement-Dependent Phonon Errors

**Critical Discovery:** ORB and OMat show dramatic MAE increase at small displacements (attributed to direct force output vs. Hessian-based approaches).

**Implication:** Displacement magnitude selection (standard 0.01–0.03 Å) is architecture-dependent. Quality control requires validation of force constant behavior across displacement ranges.

### 5. Reference Data and Functional Sensitivity

**JARVIS-DFT Database:**
- ~90,000 materials with ~17,400 having complete phonon data
- Uses vdW-DF-optB88 functional (not PBE)
- Functional-induced frequency shifts: 2–6% (dense solids) to 20%+ (van der Waals)

**GLIM Consideration:** Functional mismatch between PBE-trained models and optB88 reference creates systematic bias. Recommendation: functional-corrected metrics or materials-specific comparison subsets.

### 6. Fine-Tuning Delivers Substantial Improvements

**Phonon Force Constant Tuning (PFT):**
- 55% average improvement in phonon properties
- Sub-meV errors achievable (ω_max MAE ~0.9 meV, S_vib MAE ~11 J/mol·K)
- Cost-effective: 60–140 GPU-hours training investment
- Transfer learning benefit: improves anharmonic properties (thermal conductivity κ: 0.446 → 0.306 log(W/m·K) SRME, 31% improvement)

**GLIM Application:** Fine-tuning pathways enable rapid accuracy optimization for top-performing potentials. The transfer from harmonic Hessian training to anharmonic properties suggests curvature supervision captures essential physics beyond harmonic regime.

### 7. Dynamical Stability Prediction Challenges

**Key Result:** 25.83% baseline stability rate in AI-generated structures (high class imbalance).

**Metric Interpretation:**
- Random guessing: 25% accuracy
- Perfect prediction: 100% accuracy
- Skill scores (improvement over baseline) enable fair comparison
- MatterSim achieves ~95% true-positive rate with validated false-positive/negative characterization

**GLIM Use Case:** Potentials must reliably identify imaginary modes for structure screening in materials discovery pipelines.

### 8. Computational Resource Planning

**Efficiency Metrics:**
- Classical potentials: O(N) scaling, fastest per-calculation
- Efficient MLIPs (ORB, MACE): 10–100× speedup vs. DFT full workflow
- Large architectures (OMat24): Drastically steeper scaling than MACE/SevenNet

**Cost Estimation for GLIM:**
- Base estimate: ~10⁶ GPU-hours for complete 23 × 12,000 benchmark
- With contingency (+50% for failures/restarts): ~1.5 × 10⁶ GPU-hours
- Parallelization strategy: GPU acceleration for NN inference, CPU clusters for classical potentials

**Optimization Strategy:**
- Phase 1: All 23 potentials on 1,000-material representative subset (statistical power & ranking)
- Phase 2: Top 10 potentials on full 12,000-material set (definitive comparison)
- Specialized analysis (fine-tuning, failure modes) on priority subsets

### 9. Hierarchical Metrics Enable Multi-Level Diagnosis

**Primary Metrics (Global Ranking):**
- Frequency MAE/RMSE across all q-points/branches
- Maximum frequency error (ω_max)
- Stability prediction accuracy (F1, ROC-AUC)

**Secondary Metrics (Pattern Analysis):**
- PDOS Wasserstein distance and KL divergence
- Thermodynamic properties: S_vib, Helmholtz F, C_V accuracy
- Band-resolved MAE identifies mode-specific weaknesses

**Diagnostic Metrics (Improvement Guidance):**
- Composition/structure-dependent error patterns
- Failure mode clustering
- Spectral feature accuracy (acoustic vs. optical, soft modes)

### 10. Community-Driven Benchmark Evolution

**Framework Design:**
- Annual major releases with new potentials, expanded materials, refined metrics
- Steering committee with academic, national lab, industry representation
- Specialized spin-off benchmarks for specific applications (battery materials, nuclear fuels, quantum materials)
- Open data release: 276,000 calculations with clear documentation
- Containerized code for portability and reproducibility

**Ultimate Goal:** Living benchmark that continuously improves with community contribution, enabling sustained progress in interatomic potential development.

## GLIM Strategic Recommendations

1. **Adopt stratified sampling:** By crystal system, chemistry type, bonding character to ensure balanced coverage and reveal hidden failure modes.

2. **Implement functional sensitivity analysis:** Systematic PBE-PBEsol-optB88 comparisons on representative subsets to quantify functional bias.

3. **Prioritize fine-tuning:** Top performers benefit from Hessian-targeted training with modest computational investment.

4. **Multi-level metric reporting:** Provide frequency-level details (band structure), PDOS-level summaries, and property-level impacts simultaneously.

5. **Composition-specific skill scores:** Report baseline-corrected metrics stratified by chemistry to enable fair multi-material comparison.

6. **Documentation of failure modes:** Catalog systematic error patterns (displacement-dependent, mode-specific, chemistry-specific) to guide potential development.

7. **Benchmark versioning:** Maintain backward compatibility while enabling evolving methodology through version tracking.

## Expected Timeline and Deliverables

- Phase 1 (1000 materials, 23 potentials): Initial ranking & statistical power assessment
- Phase 2 (12,000 materials, top 10 potentials): Comprehensive comparison
- Specialized analyses: Fine-tuning opportunities, failure mode deep dives
- Final deliverable: 276,000 phonon calculations + complete analysis framework

## File Location

Full report: `/sessions/friendly-gracious-hamilton/breadth_exploration/dr_reports/phonon_benchmarking_report.md`
