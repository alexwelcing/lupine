# Open Distillation Factory

Open Distillation Factory is an open scientific distillation platform for molecular dynamics (MD) and interatomic-potential benchmarking.

Rather than cloning broad closed “idea-to-publication” products, this project is intentionally narrower and deeper:

- **provenance-first artifacts**,
- **domain validity classes**,
- **reproducible execution history**,
- **proof-carrying claim promotion**.

## Implemented system slices

### Rust research kernel (`rust-core/`)
- typed domain objects (`PhysicalSystem`, `Observable`, `BenchmarkInstance`)
- deterministic FCC observables (`K`, `G`, `A`) and relative error calculations
- provenance digest utility (`fnv1a64_hex`) for reproducible run linking
- unit tests for numerical behavior and digest stability

### Lean certification layer (`lean-spec/`)
- formal FCC definitions (`K`, `G`, `A`)
- theorem stubs/proofs for MVP behavior (`K_def`, `K_positive_of_positive`)
- operator abstraction with linear error predictor
- validity-class object for MVP scope

### Hermes orchestration + memory (`agents/`)
- profile configs for `corpus`, `distill`, `formalize`, `loop`
- per-profile memory files to persist workflow constraints and assumptions
- starter role specs for `LiteratureAgent` and `OperatorAgent`

## Quickstart

### Rust
```bash
cd rust-core
cargo test
```

### Lean
```bash
cd lean-spec
lake build
```

### Hermes profile assets
Profile configs and persistent memory templates are in `agents/profiles/*/`.


## Internal success loop execution

- Skill definition: `skills/claw4s-open-distillation/SKILL.md`
- Run the MVP workflow: `bash scripts/competition/run_mvp.sh`

## Key docs

- [Architecture](docs/ARCHITECTURE.md)
- [System spec (modules/services/layout)](docs/SYSTEM_SPEC.md)
- [Roadmap](docs/ROADMAP.md)
- [Agent roles](agents/README.md)
- [OperatorPack schema](promotions/operator-pack.schema.json)
- [Run manifest schema](domain/schemas/run-manifest.schema.json)
- [Risk register schema](domain/schemas/risk-register.schema.json)
- [Internal loop runbook](docs/CLAW4S_SUBMISSION.md)
- [Critical risk review](docs/CRITICAL_REVIEW.md)
