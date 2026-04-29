# Hermes Profiles and Agent Roles

This project uses Hermes as an orchestration harness for long-lived, profile-isolated scientific workflows.

## Profile implementations

Implemented profile configs and memory templates:
- `agents/profiles/corpus/profile.yaml`
- `agents/profiles/distill/profile.yaml`
- `agents/profiles/formalize/profile.yaml`
- `agents/profiles/loop/profile.yaml`

Each profile has a colocated `MEMORY.md` to encode persistent constraints and context.

## Profiles

- `corpus`: ingestion, extraction, parsing, bibliography sync
- `distill`: Rust transforms + Python operator discovery
- `formalize`: Lean theorem targeting and proof execution
- `loop`: internal success-loop packaging and run closure

## Agents

- **LiteratureAgent**: discovers and queues relevant MD/materials sources
- **ExtractionAgent**: converts sources into canonical benchmark records
- **PhysicsAgent**: checks plausibility constraints and regime assumptions
- **OperatorAgent**: proposes candidate distillation operators from error structure
- **CounterexampleAgent**: stress-tests candidates against held-out data and constraints
- **FormalizationAgent**: generates Lean definitions and theorem skeletons
- **ProofAgent**: discharges lemmas/theorems and updates proof status
- **ReleaseAgent**: packages datasets/reports/operator docs for publication

Starter role cards currently exist for:
- `agents/roles/LiteratureAgent.md`
- `agents/roles/OperatorAgent.md`

## End-to-end flow

`LiteratureAgent -> ExtractionAgent -> PhysicsAgent -> OperatorAgent -> CounterexampleAgent -> FormalizationAgent -> ProofAgent -> ReleaseAgent`

## Operating principles

- profile memory is isolated by workflow to reduce cross-contamination,
- every stage emits provenance and run metadata,
- promotion is gated by schema validity, evidence quality, and proof status.
