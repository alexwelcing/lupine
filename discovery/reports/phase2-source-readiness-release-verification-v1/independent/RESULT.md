# Completed exact-commit artifact audit

The single audit of `eaed2e7a00c8bb5c68d9dafb62c03ceb01ca218f` passed all
22,005 checks. It ran from 2026-10-16 17:31:30.734322 UTC to
17:32:02.221082 UTC, exited zero, and emitted no stderr. The prospective auditor
`7487bc9c…` and its bound preparation were unchanged. The first execution and
complete check report are preserved; no artifact audit retry occurred.

All 6,794 source archive files match the exact committed Git blobs and tracked
mode distinctions. Independent enumeration establishes 351 runtime files against
the 345-file baseline: 334 unchanged, 11 declared replacements, six additions,
and no removals. The wheel contains exactly 113 package payloads: 105 unchanged,
five replacements, and three additions. Its 120 members have complete RECORD
coverage, including 119 verified content digests and the empty RECORD self-entry.
Both public resource pins, all 18 ordered receipt flags, the fixed six schemas,
and recorded 28-case/13-known-answer scope agree.

The retained source archive is 132,229,120 bytes with SHA256
`932cf3f23c52616d521f0c4ecddaa2c19ccab1d06aca7958005f7b983a079775`.
The wheel is 324,053 bytes with SHA256
`5dfee9c2770527cf759aba1594740824609e528b1834dabdbf60448931633a70`.
The release receipt SHA256 is
`5a64e895c6e48c5e23e4ec266a294a9cd6d8e0c64ef30c867a51862c201a74ae`.
All three identities remained held during the audit.

Before the artifact audit, 280 checks inspected the completed package and strict
verifier command receipts, exact captured streams, source-before/source-after
states, ten Git gate command records, and root's outer process observation.
Package and strict commands each exited zero; both stderr streams were empty.
The recorder's source and all 351 working runtime identities were held before and
after those commands. Root observed recorder session 98858 exit zero, completion
chunk `d102bd`; the reviewer observed audit session 99639 exit zero, completion
chunk `71b8b4`. The final local checkpoint still had exact `eaed2e7a…` HEAD and a
clean tracked/nonignored worktree. This closes the audit's source hold; it makes
no assertion that later report-only commits retain the same HEAD.

The fixed allowlist includes exact package/strict evidence and a reversible
UTF-8 packet for the ten Git commands. It does not include the wheel, tar file,
scientific datasets, or private objects. The predecessor auditor itself is not
duplicated; its identity and the new auditor's delta are preserved. The earlier
prospective files remain unchanged and correctly state that the audit had not
yet run at their preparation time.

This is artifact identity and execution-provenance evidence. The reviewer did
not execute package contents, rerun the package/strict tools or tests, acquire
scientific sources, or perform physical/statistical validation. No theorem count
or compilation result follows from matching formal-source bytes. CI was not
reviewed by this audit and requires a separate root observation. No source is
admitted and no scientific superiority or deterministic rebuild is established.
