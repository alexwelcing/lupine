# Public consistency validator — prospective, no operation approval

`public_review_validator.py` consumes supplied public JSON bytes and normalized execution records. It has no filesystem, subprocess, network, project or adapter imports. It never calls a production guard, acquires an archive, opens a worksheet, or authorizes an operation. Its only imports are Python's `hashlib`, `json`, and `re`.

This is a partial executable implementation of the accepted fourteen-check design. It is useful for rejecting contradictory public evidence before the root recorder accepts a phase. It cannot authenticate arbitrary fabricated records, prove source completeness from a public projection, verify a remote branch or CI, or establish physical truth. Every returned review sets `release_approved`, `actual_operation_approved`, `scientific_admission`, and `next_operation_authorized` to false; `external_gate_authentication` is `NOT_PERFORMED`, `raw_history_recomputed` is false and `final_release_pins` is null.

The rules were reviewed against the held adapter `a3370ac8…`, strict core `5fd1b06c…`, and the accepted counter-correction decision. A source-only normalized-AST comparison confirms current adapter `77dece96…` differs only in its two baseline-identity assignments. This does not accept a final producer commit or any release gate. Exact source bindings and the comparison are in `validator-source-bindings.json` and `validator-adapter-rebind.json`. The original design, acceptance and handoff files remain unchanged.

## API

```python
validate_public(raw: bytes, expected: dict, frame_binding: bytes | None = None) -> dict
review_operation(*, stdout: bytes, persisted: bytes | None,
                 reservation: bytes | None, recording: dict,
                 expected: dict, frame_binding: bytes | None = None) -> dict
review_route(operations: list[dict], expected_by_phase: dict,
             frame_binding: bytes | None = None) -> dict
```

`validate_public` returns a newly parsed public report, or raises `ReviewError` with a fixed redacted reason. It also validates closed failure projections; returning a parsed failure is not accepting completion. `review_operation` returns `COMPLETED_PUBLIC_CONSISTENCY`, `RETAINED_BLOCKED_OPERATION`, or `REJECTED_PUBLIC_CONSISTENCY`. The caller must require the exact first status for a completed phase, and must still check its own external gates. A completed negative C sets `terminal_negative=true`; its exit is 0 and its scientific status remains blocked. An incomplete/mechanical result requires exit 2 and is never a reusable completed prior.

`review_route` checks a supplied ordered prefix of `A1,A2,B1,B2,C1,C2`, with at most six operations. A failure must terminate that prefix. The second slot of each complete phase must have exactly identical public bytes, not a deletion-based normalization. The two reservations and recording commands identify different fixed slots. Phase producers may differ, but each supplied prior pin must identify the actual supplied producer and complete public hash. C's binding uses **inner** prior-result hashes, which are separately checked; these are not confused with outer public-receipt hashes. A complete prefix returns `ROUTE_PUBLIC_CONSISTENCY`, even if its final C is a completed negative. This wording reports consistency of supplied evidence only.

`operations` contains dictionaries with exactly `stdout`, `persisted`, `reservation`, and `recording`. `expected_by_phase` maps the phases supplied so far to their expected packets. A per-operation result's `reusable_completed_prior=true` indicates its local completed A/B shape only; it does not replace route-level lineage validation or authenticating that expected packet.

The exact expected packet has keys:

```text
phase, implementation, observed, prerequisite_receipt_sha256,
capture_receipt_sha256, phase_binding_pins, command_prefix
```

The expected implementation contains the eight owned file pins, same producer in its nested G34 identity, and baseline identities. The nested G34 identity is compared exactly with the **supplied** expected identity; this module does not independently derive or authenticate its complete historical source chain. The root recorder must do so before using it. `command_prefix` is the actual interpreter path followed by `scripts/li_v3_readiness_production.py`. The complete command must be this prefix followed by `phase, --run, run`.

The normalized recording has exactly these keys:

```text
phase, run, command, exit_code, timed_out, process_completed,
started_ns, finished_ns, stdout_sha256, stdout_bytes,
stderr_sha256, stderr_bytes, persisted_sha256, persisted_bytes,
reservation_sha256, before_state_sha256, after_state_sha256,
gate_inputs_sha256_before, gate_inputs_sha256_after, returned_observation
```

`returned_observation` must be `CLI_STDOUT_SERIALIZATION`. The reviewed CLI serializes the function return after its final close; stdout is not a separately measured third channel. The validator compares canonical stdout and persisted bytes exactly. A success-looking persisted file cannot rescue different stdout after a late directory-close error. Missing persisted or reservation bytes cannot complete an operation. Recorded stderr must be empty for a completed result. The recording's hashes bind supplied bytes; hashes of states, gates and stderr are assertions by the recorder until it independently verifies those inputs.

For incomplete failures the validator preserves closed partial exposure and does not impose completed A/B counter equations. Missing persisted/reservation bytes can remain explicit nulls. Any such failure still stops the route. A missing poststate, state/gate hash drift, timeout, noncanonical output, mismatched persisted bytes, extra keys, or command/exit mismatch rejects public consistency.

## Implemented checks and external responsibilities

| Design checks | Executable public checks | Still external |
|---|---|---|
| G01–G03 | Exact supplied expected identity; before/after state and gate hashes agree | Published commit, branch/remote/index/worktree/runtime checks; actual four-job CI, logs, clean package, strict/artifact audit, timestamps and gate authentication |
| O01 | Fixed normalized phase/slot command, closed reservation, process completion, recorded chronological bounds | Actual exclusive filesystem reservation, bounded process execution and log custody |
| O02 | Canonical ASCII JSON, duplicate/nonfinite/float rejection, 2 MiB cap, exact stdout/persisted equality | Acquisition of those exact bytes in the same single invocation |
| O03 | Closed outcomes, exit 0 versus 2, inner/outer cleanup, exposure types/order and cleared failure payloads | Authenticity of the recorded execution history |
| P01–P02 | Two fixed distinct slots, exact pair bytes, parent producer/hash/embedded-A lineage and current binding | Root's prior acceptance and immutable binding publication before a dependent operation |
| S01–S02 | Closed manifests, roles/cells/coordinates/merges, full public cell partition, text/nontext counts, SST and incidental-text exposure | Whether the report truly enumerates the archive; semantic safety or outcome absence |
| S03 | Completed A: `M=D=U=X>=6`; B: `M=D>=6+s`, `U=X=M+2`; lineage: `M_B=M_A+s` | These necessary equations do not establish history and are not imposed on failure prefixes or full C |
| S04 | Supplied binding schema/modes, all public manifest roles, declared/unresolved row rules, counts, selected-field/endpoint shape, documentary literal/storage correspondence, mandatory structural/vacuous negatives | Raw row completeness, correctness of declared identities/meaning, physical pairing/independence, empirical values or eligibility |
| R01–R02 | Maximum ordered 2×3 prefix; no continuation after failure; no approval or automatic advance returned | Root must explicitly freeze each dependent phase and enforce the actual operation budget |

All-structural C requires null strict documentary projection/digest and `SEMANTIC_PROJECTION_NOT_REQUESTED`. Structural rows contain no semantic metadata or endpoint values. Unknown rows remain present and unresolved. Empty frames and absent declared DATA rows cannot become ready by vacuous counts. Requested semantic C can be internally consistent only with the supplied exact documentary binding, its literal/storage relationship to B, and public row/default/join rules. Even a consistent `METADATA_FRAME_READY_FOR_SEPARATE_LABEL_RULE` result is not dataset admission or evidence of sampling independence.

The validator bounds its own JSON tree to depth 32, 200,000 nodes, 8,192 characters per string, and signed 63-bit integers in addition to the 2 MiB byte limit; it enforces the narrower published report limits for cells, rows, fields and text. These resource guards do not increase producer limits. The validator is not a hostile-Python sandbox.

## Executed generated-fixture checks

The first 24 tests passed. Subsequent source review identified two missing validator restrictions: a one-cell merge must be rejected, and a column binding must contain letters only (not `A1`). Two added adversaries demonstrably failed against the unchanged first validator: 24 passes, 2 failures. The source and logs are preserved in `validator-adversarial-first/`. Only those restrictions were corrected; the exact diff is `validator-correction.diff`. The unchanged 26-test suite then passed in 0.269 seconds unittest time, 0.553 seconds recorded process time, with source bytes held before/after.

The suite authors its own public JSON and recording fixtures. It exercises both SST states, structural and semantic C, zero-row negatives, malformed/duplicate JSON, booleans versus integers, counter identities, late-close persisted/stdout disagreement, slot/producer/hash lineage, partial failures and stop rules, resource limits, output redaction, and forbidden endpoint value fields. These are tests of this review code, not independent archive execution, source-history recomputation, numerical science or full source-to-validator refinement. No actual public operation receipts, workbook/raw source, private captures, production guards or network were accessed for implementation or testing.
