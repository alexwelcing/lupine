# Retired `tools/` scripts

These scripts were moved from `tools/` because they have no active callers in
CI, docs, or other scripts, and they reference roots or APIs that have been
archived or superseded.

| File | Why retired |
| --- | --- |
| `mlip_evidence_replay_policy.py` + `test_mlip_evidence_replay_policy.py` | Offline policy replay helper with no active consumers; relied on paths that moved during the Distill consolidation. |
| `mlip_long_demo_policy_sweep.py` + `mlip_long_demo_run.py` | Long-horizon MD demo runners with no active callers; artifact generation is now handled by `mlip_long_demo_registry.py` and `mlip_long_demo_ribbon_prep.py`. |

If you resurrect one of these, move it back to `tools/` and update
`tools/README.md`.
