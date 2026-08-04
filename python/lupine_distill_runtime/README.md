# `lupine_distill_runtime`

Instrumented runtime for MLIP cells.

## Purpose

This package wraps an MLIP execution cell with sessions, support/eval leakage guards, a policy-engine adapter (Python or Rust `atlas-distill`), and structured runtime events. It is the in-run companion to the offline benchmark/uplift code in `lupine_distill`.

## Key modules

| Module | Key classes / functions |
|---|---|
| `session.py` | `DistillSession`, `DistillSupportModel` |
| `leakage.py` | `LeakageGuard`, `StructureFingerprint` |
| `policy_engine.py` | `build_policy_engine()`, `PythonPolicyEngine`, `RustPolicyEngine`, `AutoPolicyEngine`, `DistillDecision` |
| `policy.py` | `RuntimePolicy` |
| `instrumented.py` | `InstrumentedCalculator` |
| `events.py` | `RuntimeEventLog` |

## Import

```python
from lupine_distill_runtime import DistillSession, LeakageGuard
```

## Example

```python
from lupine_distill_runtime import DistillSession, LeakageGuard

session = DistillSession(
    profile="accuracy",
    run_id="run-001",
    cell_id="cell-001",
    row_id="Ni-fcc",
    mlip_id="mace-mp-0",
)

# Ensure support and eval fixtures do not overlap by structure content.
guard = LeakageGuard(support_manifest, eval_manifest)
guard.assert_no_overlap()
```

See [`python/README.md`](../README.md) for the full package overview.
