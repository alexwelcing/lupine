# TMS 2027 Oral Presentation Abstract — Ambition Draft

**Conference:** TMS 2027 Annual Meeting & Exhibition  
**Dates/Location:** March 14–18, 2027, Orlando, Florida, USA  
**Submission type:** Oral presentation  
**Selected symposium:** Computational Discovery and Design of Materials  
*(Lead organizer: Sara Kadkhodaei, University of Illinois Chicago; a standing TMS symposium on data-driven and machine-learning-enabled materials design.)*

---

## Title

The Projection Law: Turning Model-Form Error into a Correctable Signal for Machine-Learned Interatomic Potentials

## Authors

<u>Alex Welcing</u>¹

¹ [Affiliation — e.g., Lupine Science / University Name], [City, State, Country]  
*Presenter / corresponding author: alexwelcing@gmail.com*

> **Note:** Fill in the affiliation before submitting. TMS requires the full institution name, city, state, and country (no abbreviations like “LANL” or “Pitt”).

---

## Abstract Body (136 words / 150-word TMS limit)

The binding constraint on atomistic simulation is not finite-size error or training noise but model-form error: the systematic bias a potential family carries across materials. The Projection Law posits that this bias is low-dimensional and geometrically shared, so it can be measured and removed without new ab-initio data. We report Round-2 progress toward a transferable correction operator for machine-learned interatomic potentials (MLIPs): a 16-element, 128-case elastic-constant benchmark on 4 MatPES models and 2 functionals, where a class-aware 1-D operator cuts MAE from 17.84 GPa to 10.36 GPa with zero no-harm violations. By TMS 2027 we will close the remaining gaps—scale validation to >100 materials, anchor the correction with all-electron DFT, deploy a no-target magnitude estimator, and complete the Lean 4 formal proof of exact tubular universality—moving from a benchmark result to a general operator for elastic and beyond-elastic predictions.

---

## Keywords

- Machine-learned interatomic potentials
- Model-form error
- Correction operator
- Error geometry
- Formal methods

---

## Why this symposium

The work sits at the intersection of **computational materials design** and **machine-learning-enabled simulation**: it is not a new potential architecture, but a design principle for how to correct potentials at scale. The *Computational Discovery and Design of Materials* symposium is the right home because it explicitly welcomes data-driven methods, surrogate-model error analysis, and algorithmic advances that accelerate materials prediction. The backup would be any ICME or Computational Materials Science & Engineering session, but those are usually narrower in scope.

---

## Prior Publication / Presentation

This work is a working draft in preparation for journal submission. It has not been previously published or presented. The Round 2 paper and data are publicly available at:

- GitHub Release: https://github.com/alexwelcing/lupine/releases/tag/projection-law-round2-2026-06-29
- Research Library: https://library.lupine.science/#/read/projection-law-round2-final

---

## Six-Month Gap-Closure Plan (June 2026 – February 2027)

| Gap | Target by TMS 2027 | Owner / evidence path |
|-----|--------------------|-----------------------|
| **A6 scale** | Validate the operator on >100 materials across MatPES/MPtrj/OMat24 prediction sets; report per-class error reduction and no-harm rate. | `data/run_mlip_elastic_benchmark_1x1x1_matrix.py`, `docs/glim-m3-upgrade/runs/a6-bridge-pilot-results.json` |
| **H3 all-electron anchor** | Run FHI-aims elastic constants on a 4-element FCC/BCC anchor set using the GCP burst script; compare corrected MLIP vs. all-electron targets. | `scripts/aims_elastic_startup.sh`, `data/completion_3x3x3_results/` |
| **No-target magnitude estimator** | Close the 10.36 GPa → 9.97 GPa oracle gap with a deployable consensus/ridge estimator that improves the mean without increasing harm cases. | `tools/no_target_magnitude_estimator.py` |
| **Lean formal proof** | Complete the proof of `exact_tubular_universality` from assumptions A0–A5 in `ExactTubularUniversality.lean`. | `lean-spec/OpenDistillationFactory/Materials/Theory/ExactTubularUniversality.lean` |
| **Public release pipeline** | Each milestone gets a GitHub release, a Library article, and an update to `lupine.science/progress.json`. | `lupine`, `lupine-ledger`, `lupine-science` repos |

This timeline is aggressive but feasible if the A6 prediction files and GCP credits for H3 are secured in the next 30–60 days.

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
