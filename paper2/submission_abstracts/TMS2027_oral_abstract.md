# TMS 2027 Oral Presentation Abstract

**Conference:** TMS 2027 Annual Meeting & Exhibition  
**Dates/Location:** March 14–18, 2027, Orlando, Florida, USA  
**Submission type:** Oral presentation  
**Preferred symposium:** Computational Discovery and Design of Materials  
**Backup symposium:** Integrating Machine Learning and Simulations for Materials Modeling  

---

## Title

The Projection Law: A Class-Aware Correction Operator for Machine-Learned Interatomic Potentials

## Authors

<u>Alex Welcing</u>¹

¹ [Affiliation — e.g., Lupine Science / University Name], [City, State, Country]  
*Presenter / corresponding author: alexwelcing@gmail.com*

> **Note:** Fill in the affiliation before submitting. TMS requires the full institution name, city, state, and country (no abbreviations like “LANL” or “Pitt”).

---

## Abstract Body (141 words / 150-word TMS limit)

Machine-learned interatomic potentials (MLIPs) promise DFT accuracy at MD speed, but their elastic-property predictions carry systematic, model-family-specific errors that ensemble agreement cannot detect. We test whether these errors have a low-dimensional geometry that can be corrected without new ab-initio data. Using a 16-cubic-element benchmark (4 MatPES MLIPs, PBE and r2SCAN, 128 cases on 3×3×3 supercells) we show that elastic-constant errors are supercell-converged at the 1×1×1 conventional cell. A class-aware 1-D correction operator, learned from other elements in the same crystal family, reduces the overall MAE from 17.84 GPa to 10.36 GPa with zero no-harm violations in leave-one-element-out validation. The result suggests that MLIP errors are structured by shared constraints rather than random noise, and that a transferable correction operator is feasible. We discuss open steps: a no-target magnitude estimator, an all-electron ab-initio anchor, and a formal proof pipeline in Lean 4.

---

## Keywords

- Machine-learned interatomic potentials
- Elastic constants
- Error geometry
- Correction operator
- Benchmarking

---

## Prior Publication / Presentation

This work is currently a working draft in preparation for journal submission. It has not been previously published or presented. The Round 2 paper and data are publicly available at:

- GitHub Release: https://github.com/alexwelcing/lupine/releases/tag/projection-law-round2-2026-06-29
- Research Library: https://library.lupine.science/#/read/projection-law-round2-final

---

## Submission Checklist

- [ ] Title case, no all-caps, special characters use HTML codes if needed
- [ ] Abstract body ≤ 150 words
- [ ] Presenting author name underlined in author list
- [ ] Full affiliation entered in ProgramMaster (institution, city, state, country)
- [ ] Email addresses for all co-authors entered
- [ ] Preferred presentation type selected (oral; permit fallback to poster if desired)
- [ ] Abstract submitted to only one symposium
- [ ] Funding source / disclosure information provided

## Reference

TMS abstract submission tips: https://www.tms.org/tms2026/downloads/TipsForProperAbstractSubmission.pdf
