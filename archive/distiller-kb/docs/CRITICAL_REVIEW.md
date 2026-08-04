# Critical Review: Risk Assessment and Offsets

You asked whether this direction introduces avoidable risk. Short answer: **yes, but manageable** if we constrain execution and tighten evidence gates.

## Top risks observed

1. **Over-claim risk**
   - We can produce polished artifacts faster than we can prove scientific novelty.
   - Offset: explicit claim ladder (`observation -> candidate -> certified`) and required proof status.

2. **Reproducibility drift risk**
   - Scripts may run in one environment but not another (e.g., missing Lean toolchain).
   - Offset: run manifest records partial vs success, with concrete check-level statuses.

3. **Loop-integrity risk**
   - Internal closure can drift from reproducibility guarantees if checks are bypassed.
   - Offset: one-command run as source of truth, explicit statuses, and manifest emission on every path.

4. **Evaluation-gaming risk**
   - Competition entries can optimize for presentation over executable rigor.
   - Offset: keep one-command run as source of truth and require emitted manifests/hashes.

5. **Scope-creep risk**
   - Expanding into broad “AI scientist” territory dilutes core advantage.
   - Offset: stay domain-first (MD/IAP) and only promote within explicit validity classes.

## Immediate hardening actions implemented

- `run_mvp.sh` now writes `partial` status when Lean is unavailable instead of reporting blanket success.
- `run_mvp.sh` emits `finishedAt` and always writes a manifest (even on failure paths).
- External publication helpers were removed to keep the MVP bounded to internal loop closure.

## Go/No-Go rubric for submission

A submission is **Go** only if:
- Rust tests pass,
- manifest is generated,
- no missing fields in emitted run manifests,
- claim language matches actual proof/evidence status.

Otherwise: **No-Go** until corrected.
