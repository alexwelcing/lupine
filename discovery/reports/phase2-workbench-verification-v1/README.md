# Published study-planning workbench and actual header diagnosis

Root checkpoint, 2026-10-16. Runtime source
`41d3e31a14bea040fb37b0aa6a650d6d5e704551` is published on
`research/lupine-discovery`. Local HEAD, remote branch and draft PR263 were
checked against that exact commit. The report-only publication containing this
record requires its own subsequent push/CI verification, currently pending;
this record does not predict it.

## Executed engineering verification

[Original push run 38858784217](https://github.com/alexwelcing/lupine/actions/runs/38858784217)
completed successfully in Python 3.11, Python 3.12, browser and Lean jobs.
[Final API observation](ci/final.json) was recorded at
`2026-10-16T06:23:28.036645+00:00`. The ordered observations and watcher are
retained. Job metadata verifies completion; no remote test totals, absence of
skips, or downloaded CI artifact bytes are inferred from inaccessible job logs.

The clean local committed-source package passed **28 demonstrations across six
schemas and 15 mandatory installed checks**, including planner HTTP/CLI and
installed asset agreement. Its strict retained-artifact verifier also passed.
Both actual commands preserve HEAD, clean worktree and all **306 runtime file
hashes**. Receipts, stdout/stderr and executed recorder are in `clean-package/`.
The earlier [65-check full browser run and focused tests](../phase2-study-workbench-v1/README.md)
remain separate precommit evidence; all original failures are retained there.

The [independent artifact audit](independent-artifact-review/review.json)
compared all 2,522 source-archive files with exact Git blobs, all 306 runtime
files with the manifest and worktree, 113 wheel RECORD content digests and 107
packaged source files. All agree. The original audit harness failed because
its subdirectory-relative Git listing was empty; `--full-tree` corrected the
listing, and the final audit passed without changing artifacts. Both versions
are retained under `independent-artifact-review/`.

| Locally retained artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| Wheel | 303297 | `71b5c2bc93b3cad7ebe23e1f115ac71c6fecdb993dd0a1cf7ac178a3880e99b9` |
| Source archive | 47595520 | `0b9495a44d519f2cd3b2ff9d4bafe6f73c35aab6d5c690bf20b10d04550730ba` |

These identities attest retained bytes and executed packaging behavior. They
do not establish bit-reproducible builds, external backups, remote artifact
download verification, physical truth or independent scientific replication.

## Actual fixed-source ZIP diagnostic

Only after all four exact-commit CI jobs and clean-package checks passed, the
guarded recorder ran the committed diagnostic twice, from
`2026-10-16T06:23:40.872945+00:00` through `06:23:41.719252+00:00`:

```sh
python scripts/li_v3_zip_diagnostic.py diagnose --run 1
python scripts/li_v3_zip_diagnostic.py diagnose --run 2
```

Both executions returned the expected exit 2 and byte-identical public output:
**BLOCKED_SCHEMA / MEMBER_FLAGS**, with legacy reason
**ZIP_LAYOUT_UNSUPPORTED**. The public receipt SHA-256 is
`50931018f877a66ee56cf522e5d8a0be35cfc35f2c8b7f34884f5ba6caba6ca0`.
[Run 1](actual-header-diagnostic/1/public.json),
[run 2](actual-header-diagnostic/2/public.json), command timings, stdout/stderr
and both supervisors are retained in `actual-header-diagnostic/`.

The previously acquired 183,878-byte Li v3 object still matches publisher size,
MD5 `041bbe095c54615e5a3c289facb18ce5`, and SHA-256
`9741f826f6a97db7c2c0efa89820d3bdae43e8beb53cafd893ccdf0bb74f64fa`.
The original capture identity and all five original frozen custody files match.
Both executions also preserve all 306 runtime hashes, HEAD and clean worktree.

`MEMBER_FLAGS` means the first rejected member has at least one central-directory
flag outside the original profile's allowed UTF-8-name bit (`0x800`). The
category does **not** reveal which bit, prove encryption or corruption, establish
local/central agreement, or show that other members and later checks pass.
No profile was relaxed and no failed receipt was replaced.

The whole target-bearing raw buffer was read. ZIP directory names were decoded
internally but not published. **No member decompression, XML, worksheet cells
or shared strings were decoded.** Header checks stopped at the first closed
failure category. Pairing, conditions, units, counts, overlap and independent
evaluation units remain unknown; scientific eligibility and target validity
were not assessed. Fit and split counts remain zero. Duplicate receipts show
same-source computational agreement, not a second independent scientific sample.

## Mathematical and source-research additions

- [General proof note](../phase2-planning-proof-v1/README.md): arbitrary-count
  rank/event reasoning, exact IID transition identities, the all-one obstruction
  and zero-failure null resolution. Independently reviewed written mathematics;
  no new Lean theorem or Python-refinement claim.
- [Standalone explanatory figure](../phase2-planning-figure-v1/README.md): 122
  exact hypothetical records with reproducible SVG/PNG. A count increase from
  19 to 20 can lower the event probability by the exact ratio 39/40. These are
  specified laws, not measured coverage or scientific experiments.
- [Li documentary disclosure proposal](../phase2-li-documentary-contract-v1/README.md):
  independently reviewed, nonexecutable and unbound to actual coordinates.
  The initial source-binding omission and corrected public-custody bridge are
  preserved in the [review](../phase2-li-documentary-review-v1/README.md).
- [High-temperature source leads](../phase2-high-temperature-leads-v1/README.md):
  documentary BAM/NETL identity, rights, mixed-field hazards and exposure ledger.
  No linked measurement/schema file was downloaded; source readiness is unknown.

Current owner is root. G19 engineering is complete at verified runtime `41d3e31`;
G22 capture and G23 diagnosis are complete with the schema block preserved.
Next, review the exact member-flags predicate against the ZIP specification and
freeze any necessary further inspection separately. G20 scientific source
admissibility is unresolved; G21 new study design remains blocked. No new model,
allocation, criterion, fit, DFT, exposed-test tuning or scientific promotion.
The old automation remains disabled; this active session creates no schedule.
