# GLIM Operating System

`glim-think` is the mastermind. Everything else is substrate.

## Loop

1. Sense: ingest external evidence and internal run output into the ledger.
2. Shape: turn evidence into claims, hypotheses, and discriminative tasks.
3. Allocate: request the model, sandbox, browser, compute, or storage resource
   needed for each task.
4. Execute: agents claim tasks, run tools, and store traces.
5. Verify: claims are promoted only when backed by reproducible evidence.
6. Broadcast: the live system reports what changed and what is next.

## Durable State

- `records`: benchmark evidence.
- `claims`: structured findings.
- `pending_experiments`: local or sandboxed experiments waiting to run.
- `intelligence_tasks`: horizon-aware work queue.
- `resource_requests`: requested capabilities for queued work.
- `operating_cycles`: every agenda expansion or scheduled refresh.

## Resource Lanes

- `workers-ai-screening`: cheap first pass.
- `capable-model-route`: escalated reasoning.
- `browser-data-scout`: live source inspection.
- `tier-4-sandbox`: LAMMPS, Cargo, and git workspaces.
- `artifact-storage`: R2 evidence and reports.
- `d1-ledger-read` / `d1-ledger-write`: durable research memory.

## Design Constraint

No code exists only to persuade. If a surface does not help the system think,
execute, verify, or operate, it should live outside this repo.
