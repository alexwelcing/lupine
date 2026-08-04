# Roadmap (12-18 months)

## Strategy constraints

- Prioritize trust and scientific legibility over breadth.
- Start BYOC (bring your own compute) and BYOM (bring your own model endpoint).
- Optimize for open artifacts: schema-first data, operator packs, proof targets/status, run manifests.

## Milestone plan

### Sprint 1-2: Foundations
- finalize canonical schemas and `OperatorPack` contract
- establish Hermes profile boundaries (`corpus`, `distill`, `formalize`, `loop`)
- scaffold Rust/Python/Lean project boundaries and CI checks

### Sprint 3-4: Corpus plane
- implement literature queue and extraction normalization
- ingest first curated FCC benchmark subset
- enforce provenance completeness checks

### Sprint 5-6: Distillation kernel
- implement Rust transforms for `K/G/A` and error vectors
- implement Python discovery workflow (`ΔG` vs `ΔK` operator fit)
- add counterexample search pass over held-out fixtures

### Sprint 7-8: Formal promotion
- map candidate operators to Lean theorem targets
- prove first validity-class-bounded theorem
- encode promotion gates in CI (schema + evidence + proof metadata)

### Sprint 9-10: Reproducible runs
- introduce run manifests and artifact hashing
- add deterministic replay checks for Rust/Python stages
- expose run lineage in loop-closure artifacts

### Sprint 11-12: Loop closure + API alpha
- launch initial internal operator-pack index
- emit API payloads for packs/proofs/runs
- stabilize profile-level automation and scheduling

### Sprint 13-15: Workflow hardening
- ship minimal internal workbench flows for benchmarks, proofs, and runs
- improve observability, audit logs, and failure triage flows
- document contributor workflows and skill templates

### Sprint 16-18: release candidate
- harden reliability and upgrade paths
- close priority correctness/proof gaps
- release v1 with one complete vertical slice and public artifacts

## MVP checklist

- [ ] one curated FCC elasticity corpus slice
- [ ] one canonical benchmark transform pipeline in Rust
- [ ] one discovery notebook/script in Python
- [ ] one OperatorPack with evidence and counterexample section
- [ ] one Lean proof-backed operator property
- [ ] one reproducible run manifest linking all artifacts
- [ ] one loop-closure report exposing provenance + proof status

## Risks and mitigations

- **Extraction ambiguity** -> start with curated fixture sets and strict schema validation.
- **Proof bottlenecks** -> stage obligations and constrain validity classes tightly.
- **Integration drift** -> enforce shared contracts and replay tests in CI.
- **Scope creep** -> keep MVP to single domain slice before adding broad capabilities.
