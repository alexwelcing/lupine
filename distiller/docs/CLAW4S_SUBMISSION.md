# Internal Success Loop Runbook

This document defines how Open Distillation Factory executes a **skill-first** internal success loop.

## Success condition framing

To keep the loop high-signal, each run must score strongly on:
1. executability,
2. reproducibility,
3. rigor,
4. generalizability,
5. clarity.

## Our tactical wedge

We optimize for **proof-carrying, provenance-rich, reproducible distillation**:
- Rust kernel executes deterministic transforms/tests.
- Lean certifies formal definitions and theorem targets.
- Hermes profiles + profile memory encode orchestration assumptions.
- Run manifests preserve hashes and checks for replay.

## Loop assets

- Skill file: `skills/claw4s-open-distillation/SKILL.md`
- Execution entrypoint: `scripts/competition/run_mvp.sh`

## Internal workflow

1. Run the skill locally:
   ```bash
   bash scripts/competition/run_mvp.sh
   ```
2. Verify `runs/manifests/latest.json` is generated.
3. Review the status fields, timestamps, and hashes for replay confidence.
4. Use the generated manifest as the source of truth for the next loop iteration.

## Quality gates before loop closure

- Rust tests must pass.
- Lean build should pass when `lake` is available (or be explicitly marked skipped due to environment).
- Manifest must include run ID + hashes.
- Loop summary must include: motivation, method, reproducible steps, and limitations.

## Immediate next upgrades

- Add automated loop-summary generation from `runs/manifests/latest.json`.
- Add benchmark fixture execution + operator discovery output artifact.
- Add theorem proof-status export from Lean into OperatorPack metadata.
