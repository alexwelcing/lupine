# Actual clean9704 retained package execution

All three unchanged main commands passed at exact clean commit `9704ef46c1d0ab098dabb083199403a6296f7cf6`: isolated wheel build/install and HTTP/CLI probe; strict retained-artifact identity audit; exact wheel/source payload audit. Logs, process IDs, UTC times, exit codes and before/after source/Git checks are recorded in `execution.json` and the per-command records. The source stayed unchanged and clean across all commands. Root started its separate full Python suite only after this run completed.

The installed probe checked 28 cases, six schemas and all 12 flags. Optional `resources/mpea-t25-v1.json` was absent; packaged `mpea.js` was served exactly. The strict auditor independently confirmed absence and nonempty JavaScript in the wheel without repeating HTTP execution or validating scientific report semantics. No actual MPEA resource, raw archive, private feature/target data, allocation or study was used.

Retained wheel: 246,653 bytes, SHA256 `2509d5aa9b7f3ce68db625f23dbcb05a0ec42f5cb56910d769266944758af129`. Retained source archive: 31,016,960 bytes, SHA256 `a29974559b9cc613631042f4763e8886a66b9a6f0e3d7bf4b0365998d898e14b`, containing 2,008 committed files. The wheel has 111 members; 104 runtime payloads and two license files exactly match source, with five generated metadata files explicitly outside source-byte comparison. The source runtime manifest contains 290 paths; this is distinct from the broader full-suite source closure.

`copy-candidates.json` lists exact safe engineering logs/receipts and both historical command helpers. The binary wheel and source archive stay in their retained directory; their hashes and byte counts are included in the receipts. The parameterized wrapper is a recorded command helper with exclusive scratch paths, not a portable new user interface. This is not a bit-reproducible-build claim, full-suite/CI approval, registration authorization or scientific validation.

The earlier clean478 package pass, old-verifier failure and byte-audit pass remain separately preserved in `reports/retained-auditor-repair-v1/`; this successful new-commit run does not replace them.
