# Actual clean package gate with the reviewed MPEA public aggregate

All three commands completed successfully against exact clean commit `6585a605d5d325e84423c7e35c7286efe85cfb6f`:

1. `python scripts/package_smoke.py --retain-directory .cache/release-artifacts-present-contract-6585a605d5d3` — exit 0, 17.069156868 seconds.
2. `python scripts/verify_retained_artifacts.py --directory .cache/release-artifacts-present-contract-6585a605d5d3 --commit 6585a605d5d325e84423c7e35c7286efe85cfb6f` — exit 0, 0.542935987 seconds.
3. `python .cache/package-present-release-preparation-v1/audit-wheel-source-present-v1.py 6585a605d5d325e84423c7e35c7286efe85cfb6f` — exit 0, 0.390040917 seconds.

The actual executable, process IDs, UTC timestamps, elapsed times, return codes, stdout/stderr hashes and source snapshots are in the original command receipts. The recorder was invoked as `python .cache/package-present-release-preparation-v1/run-next.py 6585a605d5d325e84423c7e35c7286efe85cfb6f` from `discovery/`. These captured historical commands use exclusive output locations and should not be rerun into the same paths.

HEAD, the clean Git working state and all eight directly bound source/resource files remained unchanged before and after every command. The strict retained verifier separately matched all 2,210 committed archived files and the 293-path runtime manifest against this exact commit. These counts describe different verification scopes; eight recorder bindings are not represented as the complete runtime closure.

The isolated installed wheel passed 28 known-answer cases across six wire schemas and all 12 current probe checks. The MPEA public aggregate was present and exactly SHA-256 `d93769b07fba52f9bc95dbed92c5303aa8344867e7a663d0ca58cff7af2ba274` (1,664,719 bytes) before build, throughout the command snapshots, and inside both retained wheel and source archive. The HTTP benchmark response matched this installed report as type-sensitive canonical JSON values; the API response serialization is not claimed to equal the resource file bytes. Installed and HTTP-served `mpea.js` bytes matched exactly. Its SHA-256 is `f760f6225e60f08d7b4217bae7e7499fe1b4d3ea91514c5b1e429c5b4523f35e`.

The wheel has 112 members with all RECORD digests verified. All 105 runtime payloads and both license files matched source bytes exactly; the five generated wheel metadata files remain explicitly excluded from source-byte equality. Wheel SHA-256: `1b883929426c1b0502ff988d3a2d2d1bd77ed158c660058c319d5c39229c7189` (294,452 bytes). Source archive SHA-256: `07edb5d7b5809e79029e6e4e863ddb13eca4d2ade76503d476a6db19ce3dac20` (43,898,880 bytes).

This lane read and served the already-reviewed public aggregate, preserving its existing negative scientific result. It performed no new study, allocation, fit, private target access or scientific source execution. Artifact auditors check bytes and recorded probe claims; the installed smoke command supplies actual HTTP execution. This package result is separate from scientific review, full-suite and official CI evidence, and does not establish physical truth, a statistical premise or bitwise build reproducibility.

Safe copy candidates include the original receipts/logs, exact executed recorder/auditor, their prepared source deltas and constructed-test evidence. They exclude both retained binaries, the optional report itself (already integrated and independently pinned), private scientific inputs, and temporary installed environments. Earlier absent-resource gates and their failures remain unchanged.
