# IMMI Submission Fields

**Journal:** IMMI  
**Manuscript title:** The Projection Law: Model-Ensemble Errors Point at Their Binding Constraint  
**Author:** Alex Welcing, Lupine Science, Union City, NJ  
**Corresponding author:** alexwelcing@gmail.com  
**ORCID:** https://orcid.org/0009-0002-1602-8545  
**Zenodo DOI:** https://doi.org/10.5281/zenodo.20787874

## Abstract

When many independently constructed models agree, the agreement is routinely read as confidence. We formalize and test the opposite reading: a model family is a projection operator, fitting drives every member toward the point of the family's reachable set nearest the truth, and the shared residual — one direction in observable space — is a fingerprint of whatever constraint binds the family.

We prove the core as machine-checked theorems in Lean 4 (seven theorems, zero sorry): best approximations are unique and share one residual lying in the family's normal cone; the participation ratio of the error second moment is a closed-form gauge of the systematic fraction; and the empirical second moment concentrates entrywise.

We test the law's sharpest consequence — errors organize by constraint, not by implementation — at three layers of one epistemic stack: classical interatomic potentials (559 models), foundation MLIPs (4×2 MatPES factorial), and DFT implementations (12 ACWF methods). We then report a new Round-2 3×3×3 elastic-constant benchmark of 16 cubic metals with four MatPES foundation MLIPs. A one-vector-per-functional correction operator, validated with leave-one-out cross-validation, reduces the benchmark mean absolute error from 17.84 GPa to 10.36 GPa with zero no-harm violations, improving every model on both PBE and approximate r2SCAN targets.

The formal pre-registered hypothesis tests on this benchmark show that the functional-clustering predictions do not survive in the 3d/4d subset, while the operator-vs-ensemble head-to-head passes on MAE but not on conformal coverage. These mixed results define the next experimental step: a class-aware operator and a direct A6 bridge test.

## Keywords

model ensembles; error geometry; uncertainty quantification; interatomic potentials; foundation models; density functional theory; verification and validation; benchmarking; formal methods

## Data Availability Statement

The complete two-tier replication kit, pinned datasets, and pre-registrations are publicly served at https://storage.googleapis.com/shed-489901-replication/error-geometry/v1-10c18ace/index.html. The citable Zenodo snapshot of the replication kit and Lean formal core is archived at https://doi.org/10.5281/zenodo.20787874. Third-party data are from the public ACWF archive and MatPES checkpoints, as cited in the manuscript.

## Funding

This work was supported by Lupine Science.

## Competing Interests

The author declares no competing interests.

## Author Contributions

A.W. conceived the study, performed the analysis, developed the formalization and replication workflow, wrote the manuscript, and takes responsibility for all scientific claims.

## AI-Assistance Disclosure

AI assistance (Anthropic Claude, OpenAI Codex, and Kimi) was used under the author's direction for statistical verification and recomputation, Lean proof engineering, literature triage, drafting, and submission-package auditing. All scientific claims and decisions were reviewed and approved by the author, who takes sole responsibility for the content.

## Suggested Reviewers

- Mark K. Transtrum, Brigham Young University, for sloppy-model universality and information-geometry lineage.
- Michele Ceriotti or a colleague in the EPFL MLIP/UQ group, for machine-learning interatomic-potential uncertainty quantification.
- A reviewer familiar with the ACWF/verification literature, for DFT pseudopotential/code reuse and data-reuse interpretation.

## DOI Badge HTML

```html
<a href="https://doi.org/10.5281/zenodo.20787874"><img src="https://zenodo.org/badge/DOI/10.5281/zenodo.20787874.svg" alt="DOI"></a>
```
