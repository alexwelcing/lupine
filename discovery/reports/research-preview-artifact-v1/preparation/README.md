# Prepared clean package gate with the reviewed MPEA public aggregate

Status: prepared only. Root must supply and authorize a new exact clean commit before the recorder is invoked. No package build, installed probe, retained artifact audit, study, allocation or private scientific input access was performed while preparing this lane. The constructed tests exercise extracted gate predicates and the additional resource identity block, not the complete release command.

The required resource is `src/lupine_discovery/resources/mpea-t25-v1.json`, exactly SHA-256 `d93769b07fba52f9bc95dbed92c5303aa8344867e7a663d0ca58cff7af2ba274`. The recorder requires this regular-path file before building and hashes it in every source snapshot. Missing, replaced or changed bytes block the run. The commit must be a complete lowercase SHA matching local HEAD and the entire Git working tree must be clean. Every command's before/after state remains recorded. No existing command or verification requirement is weakened.

After root's commit handoff, from `discovery/`:

```sh
python .cache/package-present-release-preparation-v1/run-next.py ROOT_AUTHORIZED_40_HEX_COMMIT
```

This executes the existing `scripts/package_smoke.py` and `scripts/verify_retained_artifacts.py` unchanged, followed by this lane's `audit-wheel-source-present-v1.py`. Output paths are fresh and exclusive:

- `.cache/package-present-release-execution-<commit first 12>/`: command, process, UTC, elapsed time, return code, stdout/stderr, source/Git snapshots and execution receipt.
- `.cache/release-artifacts-present-contract-<commit first 12>/`: wheel, committed source archive and original retention receipt.
- `.cache/wheel-source-present-contract-<commit first 12>.json`: independent payload byte comparison.

The old absent-resource runs and recorders remain unchanged. Diffs identify every adaptation. The payload audit retains the previous complete runtime payload-set and byte comparisons, both licenses and the exact five generated metadata exceptions. It additionally requires the reviewed MPEA file in both source archive and wheel with the pinned SHA and a recorded present-resource probe claim. The recorder also requires the strict retained verifier's actual wheel-resource SHA to match this pin.

The existing isolated installed probe compares `/api/benchmarks.mpea_archived` to the installed JSON resource with type-sensitive canonical JSON equality. This is equality of JSON values; API serialization need not equal the resource's file bytes. The installed `mpea.js` asset and its HTTP response are compared byte for byte. The independent auditors inspect retained file bytes and recorded probe claims; they do not themselves reexecute HTTP or interpret scientific report semantics. No physical, statistical, CI, reproducible-build or new-study approval follows from these package checks. The actual public report's negative result remains unchanged.
