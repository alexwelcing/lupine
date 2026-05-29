---
title: "MLIP Failure Geometry Audit"
status: draft
organization: Lupine Science
viewer: LUPI
library: Lupine Library
offer_type: pilot
---

# MLIP Failure Geometry Audit

## Purpose

Lupine Science evaluates where an interatomic potential fails, whether the
failure is structured, and what correction target follows from that structure.

This is not a generic leaderboard. It is a lab-facing trust audit for atomistic
ML: evidence first, correction target second, claims with status labels always.

## Audience

- MLIP builders
- computational materials labs
- materials R&D teams
- agentic research infrastructure teams

## Inputs

- model or potential family
- target materials or structures
- reference properties or trajectories
- existing benchmark results
- publication or deployment decision context

## Outputs

1. Failure-geometry summary
2. Claim/evidence table
3. LUPI inspection links
4. Correction-target recommendation
5. Decision risk statement
6. Next-experiment plan

## Audit Questions

| Question | Why It Matters |
| --- | --- |
| Where does the model fail? | Converts vague accuracy risk into inspectable evidence |
| Is the failure low-rank? | Identifies whether correction can target structure |
| Does it escape the known manifold? | Flags model-family or material-specific risk |
| Which property drives the failure? | Turns diagnosis into experiment design |
| What should be tested next? | Reduces expensive blind validation |

## Deliverable Shape

- one proof pack
- one LUPI evidence route
- one short lab-readable summary
- one technical appendix
- one recommended next run

## Success Criteria

- A PI, lab director, reviewer, or model team can explain the model risk in one paragraph.
- The evidence is inspectable in LUPI where visual evidence exists.
- Claim status is explicit.
- The next experiment is concrete and bounded.
- The correction target is either stated or honestly deferred.

## Default Timeline

| Phase | Output |
| --- | --- |
| Day 1-2 | Input inventory and audit scope |
| Day 3-5 | Error-geometry run and evidence table |
| Day 6-7 | LUPI evidence route and proof pack |
| Day 8-10 | lab readout and next-experiment plan |
