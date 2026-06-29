# PRX Submission Fields

**Journal:** Physical Review X  
**Manuscript title:** The Projection Law: Model-Ensemble Errors Point at Their Binding Constraint  
**Author:** Alex Welcing, Lupine Science, Union City, NJ  
**Corresponding author:** alexwelcing@gmail.com  
**ORCID:** https://orcid.org/0009-0002-1602-8545  
**Zenodo DOI:** https://doi.org/10.5281/zenodo.20787874

## Popular Summary

In many areas of physics, researchers compare many models and treat agreement
as evidence that the answer is reliable. This paper argues that such agreement
can have a different origin. When a model family is fitted to data, all of its
members are pulled toward the closest point allowed by that family's own
assumptions. The remaining shared error therefore points to the constraint that
bound the family, not necessarily to the truth. We call this the projection law.

The paper develops the idea as a theorem, verifies the theorem chain in Lean 4,
and tests the consequence in three materials-simulation settings: classical
interatomic potentials, foundation machine-learned interatomic potentials, and
density-functional-theory implementations. The strongest prediction is that
errors should group by the constraint that models share, such as training
functional or pseudopotential table, rather than by superficial implementation
details. Two pre-registered tests support that prediction, while four other
predictions failed and are reported as failures. A new Round-2 3×3×3
elastic-constant benchmark of 16 cubic metals with four MatPES foundation MLIPs
shows that a one-vector-per-functional correction operator reduces the mean
absolute error from 17.84 GPa to 10.36 GPa, and the paper quantifies why a fully
deployable no-target magnitude estimator remains open.

The result matters beyond materials science because model ensembles are used
across physics and neighboring fields to estimate uncertainty. The projection
law gives a concrete warning: consensus can reveal a shared blind spot. It also
offers a diagnostic, using the geometry of residual errors, for finding which
modeling assumption is binding an ensemble.

## Data Availability Statement

The complete two-tier replication kit, pinned datasets, and pre-registrations
are publicly served at
https://storage.googleapis.com/shed-489901-replication/error-geometry/v1-10c18ace/index.html.
The citable Zenodo snapshot of the replication kit and Lean formal core is
archived at https://doi.org/10.5281/zenodo.20787874. Third-party data are from
the public ACWF archive and MatPES checkpoints, as cited in the manuscript.

## Funding

This work was supported by Lupine Science.

## Competing Interests

The author declares no competing interests.

## Author Contributions

A.W. conceived the study, performed the analysis, developed the formalization
and replication workflow, wrote the manuscript, and takes responsibility for
all scientific claims.

## AI-Assistance Disclosure

AI assistance (Anthropic Claude, OpenAI Codex, and Kimi) was used under the author's
direction for statistical verification and recomputation, Lean proof
engineering, literature triage, drafting, and submission-package auditing. All
scientific claims and decisions were reviewed and approved by the author, who
takes sole responsibility for the content.

## Suggested Reviewers

- Mark K. Transtrum, Brigham Young University, for sloppy-model universality
  and information-geometry lineage.
- Michele Ceriotti or a colleague in the EPFL MLIP/UQ group, for
  machine-learning interatomic-potential uncertainty quantification.
- James D. Annan or a colleague from climate model dependence, for the
  cross-domain ensemble-dependence claim.
- A reviewer familiar with the ACWF/verification literature, for DFT
  pseudopotential/code reuse and data-reuse interpretation.

## DOI Badge HTML

```html
<a href="https://doi.org/10.5281/zenodo.20787874"><img src="https://zenodo.org/badge/DOI/10.5281/zenodo.20787874.svg" alt="DOI"></a>
```
