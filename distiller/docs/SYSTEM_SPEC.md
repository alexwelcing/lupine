# System Specification (Modules, Services, and Repository Layout)

## 1. Scope

This spec defines a concrete implementation plan for an open scientific distillation factory focused on molecular dynamics (MD) and interatomic-potential benchmarking.

## 2. Product pillars

- **Workbench**: task/chat + workflow controls for ingestion, distillation, and promotion.
- **Benchmarks**: canonical datasets and benchmark records.
- **Proofbook**: theorem targets, assumptions, and proof status ledger.
- **Runs**: reproducible run ledger across Rust/Python/Lean stages.
- **Skills Registry**: reusable agent recipes for extraction/distillation/formalization.

## 3. Services

### 3.1 corpus-service (Hermes profile: `corpus`)
Responsibilities:
- discover literature sources
- parse documents/tables
- emit normalized extraction records

Interfaces:
- input queue: source descriptors
- output queue: extraction records + provenance edges

### 3.2 distill-service (Hermes profile: `distill`)
Responsibilities:
- run Rust canonical transforms and validations
- run Python operator discovery jobs
- score candidate operators and attach evidence

Interfaces:
- input queue: normalized records
- output queue: candidate operator artifacts

### 3.3 formalize-service (Hermes profile: `formalize`)
Responsibilities:
- translate candidates to Lean obligations
- run proof jobs and track statuses
- generate proof-linked promotion metadata

Interfaces:
- input queue: candidate operator artifacts
- output queue: proof status updates and promoted packs

### 3.4 loop-service (Hermes profile: `loop`)
Responsibilities:
- render docs/reports
- package internal dataset snapshots and operator artifacts
- emit reproducible loop-closure manifests

Interfaces:
- input queue: promoted packs and run metadata
- output: internal artifact bundle + static docs/JSON payloads

## 4. Agent modules

- `LiteratureAgent`
- `ExtractionAgent`
- `PhysicsAgent`
- `OperatorAgent`
- `CounterexampleAgent`
- `FormalizationAgent`
- `ProofAgent`
- `ReleaseAgent`

Each module must emit structured provenance records (who/what/when/input-hash/output-hash).

## 5. Data contracts

### 5.1 Mandatory contracts
- `promotions/operator-pack.schema.json`
- domain schemas in `domain/schemas/`
- run-manifest schema in `domain/schemas/run-manifest.schema.json` (planned)

### 5.2 Promotion contract
A pack is promotable only if it has:
- domain + validity class,
- numerical evidence,
- counterexample section (empty allowed, but explicit),
- proof obligations + status,
- provenance links.

## 6. Repository layout (target)

```text
open-distillation-factory/
  agents/
    profiles/
      corpus/
      distill/
      formalize/
      loop/
    roles/
      literature.md
      extraction.md
      physics.md
      operator.md
      counterexample.md
      formalization.md
      proof.md
      release.md
  domain/
    schemas/
      physical-system.schema.json
      model.schema.json
      observable.schema.json
      benchmark-instance.schema.json
      error-vector.schema.json
      run-manifest.schema.json
  rust-core/
    src/
      ingest/
      transforms/
      provenance/
      search/
  python-lab/
    src/
      discovery/
      uncertainty/
      operator_pack/
    notebooks/
  lean-spec/
    Materials/
      Elasticity/
      ErrorModel/
      Distillation/
      Scope/
  benchmarks/
    fixtures/
    gold/
  promotions/
    operator-pack.schema.json
  runs/
    manifests/
    artifacts/
  docs/
    ARCHITECTURE.md
    ROADMAP.md
    SYSTEM_SPEC.md
```

## 7. MVP vertical slice

- ingest curated FCC elasticity benchmark subset,
- produce `K/G/A` transforms and error vectors,
- discover one operator form (`ΔG ≈ αΔK`),
- formalize one theorem-backed promotion path,
- close one reproducible internal run with proof status.

## 8. Non-goals (MVP)

- no hosted “infinite GPU” execution,
- no broad cross-domain science claims,
- no opaque black-box promotion criteria.

The system starts with bring-your-own compute/model endpoints and verifiable artifacts.
