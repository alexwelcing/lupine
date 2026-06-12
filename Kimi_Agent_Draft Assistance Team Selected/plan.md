# Plan: IMMI Paper — "The Causal Geometry of Prediction Errors in Interatomic Potentials"

## Overview
Execute the full draft pipeline per the Deep-Valued Handoff Guide. The main deliverable is a submission-ready manuscript for IMMI, with all supporting materials.

## Stage 1: Reconnaissance & Data Discovery
- **Goal:** Understand the codebase structure, identify the final approved experiments, the element set, and existing figures/materials.
- **Actions:**
  - Attempt to access/clone the lupine repo.
  - Inventory the repository: find datasets, notebooks, figure scripts, existing manuscripts.
  - Identify the "final approved experiment" boundaries — which files, which elements, which potentials.
  - Document findings in a structured brief for downstream agents.

## Stage 2: Paper Outline Design
- **Skill:** `paper-writing` (load SKILL.md)
- **Goal:** Design a rigorous academic outline for IMMI.
- **Actions:**
  - Read the paper-writing skill.
  - Design outline: Abstract, Introduction, Methods, Results, Discussion, Data Availability, References.
  - Lock the figure roster (4–6 main figures, narrative order).
  - Commander (user) sign-off on scope before proceeding.

## Stage 3: Data Extraction & Freeze
- **Goal:** Extract only what ships — the distilled dataset that produced the figures.
- **Actions:**
  - Extract final element set and benchmark data.
  - Prepare data files for Zenodo release (post-submission step).
  - Package analysis-ready CSV/JSON, not raw trajectories.

## Stage 4: Manuscript Writing (Stage-Gated)
- **Skill:** `paper-writing`
- **Goal:** Draft the full manuscript section by section.
- **Actions:**
  - Write in batches: Introduction → Methods → Results → Discussion.
  - Parallel quality review after each batch.
  - Compile into a single LaTeX/Markdown manuscript.

## Stage 5: Figure Production
- **Goal:** Export all figures as separate high-res files per IMMI spec.
- **Actions:**
  - Generate/re-export figures from approved experiment data.
  - Accessibility check (colorblind-friendly, grayscale-readable).
  - Resolution check (≥600 dpi line art, ≥300 dpi photos).

## Stage 6: Reference Audit & Polish
- **Goal:** Ensure every citation resolves, DOIs checked, no ghost refs.
- **Actions:**
  - Automated link checker on all DOIs/URLs.
  - Cross-check in-text citations against reference list.
  - Compile reference list in IMMI format.

## Stage 7: Final Assembly & Submission Prep
- **Goal:** Package everything for Editorial Manager upload.
- **Actions:**
  - Compile final manuscript PDF.
  - Compile supplementary material PDF.
  - Draft cover letter.
  - Create figure ZIP.
  - Final quality gate checklist.

## Deliverables
1. Manuscript (`.tex` or `.md`) — main paper
2. Supplementary Material PDF
3. Figure files (high-res, separate)
4. Cover letter
5. Data Availability Statement (with Zenodo DOI placeholder)
6. Reference list (verified)
7. CHANGELOG.md / SUBMISSION_LOG.md
