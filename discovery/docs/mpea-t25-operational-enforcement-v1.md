# Prospective MPEA worker supervision amendment v1

Status: proposed implementation amendment, not study registration. No actual
allocation or performance-target interpretation is authorized by this document.
Registration must bind the reviewed final bytes of this amendment, the two
original specifications, the complete worker/supervisor sources, engineering
receipts and successful CI for the published source commit.

## Unchanged scientific decisions and explicit amendment

The original protocol is `mpea-t25-archival-protocol-v1.md`, SHA-256
`c49047341d3932ddd67c67c9f2a04a6759c0d679bfeb96d811ba9541c0cc0378`;
the original stage contract is `mpea-t25-implementation-contract-v1.md`, SHA-256
`be45b1d8db9586035cf37bd9bbb9046c065c3851b91f93386f8c68d155215af9`.
Those published bytes remain unchanged. All source, cohort, allocation,
representation, endpoint, model, calibration, policy, budget, gate and scientific
claim decisions remain as specified there. This amendment changes no target
access permissions and supplies no new probability or physical guarantee.

The original phrase "2 GiB peak RSS" is stronger than the implemented observable.
For this prospective version, the operational rule is a **2,147,483,648-byte
observed resident-memory stop threshold**, measured as described below. This is
an explicit pre-registration amendment of enforcement, not evidence that an
instantaneous process-tree peak ceiling is enforced. Reports must preserve this
distinction and the actual costs. Neither low observed usage nor a completed
supervisor receipt proves that every inter-sample peak was below the threshold.

## Fixed production limits and measurement

The registered production caller must verify and supply the frozen worker
command and anchor the private receipt destination. The supervisor accepts the
supplied command; it does not independently validate command origin or source
identity. Its production API exposes no resource-limit flags or environment
overrides. Synthetic tests have a distinct API for smaller limits; the registered
production command may not call that API.

| Quantity | Fixed rule | Interpretation |
|---|---|---|
| Charged wall time | 3,600 seconds from acknowledged `TARGET_PHASE_BEGIN` through observed worker termination or stop | One cumulative monotonic clock across all later stages; markers cannot reset it |
| Startup wall time | 60 seconds before target-phase acknowledgement | A separate setup guard, not additional target computation time |
| Resident memory | Stop when a sampled worker-session total or the leader's observed exit peak exceeds 2,147,483,648 bytes | Observational stop threshold, not an instantaneous aggregate ceiling |
| Sampling interval | Nominal 0.01 seconds | Scheduler delays and scan duration can increase the interval |

The worker emits `TARGET_PHASE_BEGIN` immediately before invoking the first
development-target decoder and waits for acknowledgement. The parent starts the
clock before sending that acknowledgement. Setup may verify registration,
allocation, source bytes and target-opaque features; it may not interpret a target
before this handshake. Same-process restarts or later-stage resumes are forbidden.
A fresh-process reproduction repeats the complete staged computation, uses the
original sealed allocation without entropy, and has its own declared full-run
budget. It is the same archived study, not a new randomized experiment.

On Linux, memory sampling sums resident pages from `/proc/*/statm` for processes
whose session ID equals the worker leader's PID, including same-session
descendants in other process groups. Shared pages may be counted multiple times.
Transient peaks between samples can be missed. `wait4` also records the leader's
kernel-reported peak RSS and detects a leader excursion missed by sampling; it
does not reconstruct a simultaneous aggregate descendant peak. Virtual address
space, sampled aggregate RSS and leader peak RSS must not be conflated.

Wall time is frozen before cleanup. Cleanup duration is recorded separately;
cleanup alone cannot turn a within-budget complete worker into a timeout. A
`COMPLETE` operational receipt must have charged wall time at or below its limit.
Stage timing and other usage fields remain outside scientific digests. Complete
file identities still cover their actual usage observations.

## Network and cooperative-process boundary

The supervisor starts a new session through
`/usr/bin/unshare --user --map-root-user --net --`. Before executing the study
worker, the isolated shim requires the kernel-reported interface list to contain
only `lo`. The parent independently verifies a different network-namespace inode.
The shim and every worker marker use a dedicated inherited Unix socket with
explicit acknowledgement. Unavailable namespace support blocks; there is no
connected fallback, Python socket monkeypatch or attempted package acquisition.
Required dependencies and fixed source bytes must already be available locally.

This isolates network routing for a cooperative, source-bound worker. It is not
a filesystem sandbox, a proof of prior target secrecy, a defense against hostile
Python, or an entropy-source attestation. The worker may not detach into another
session. Cleanup signals every observed process group in its session; deliberately
detached descendants and forced termination of the supervisor itself lie outside
that cleanup guarantee. If the supervisor is killed before receipt publication,
preserve the durable stage prefix and record the missing operational receipt.
Do not infer completion, memory exhaustion or source drift from its absence.

## Closed markers, terminals and durable evidence

Allowed markers are the internal `NAMESPACE_READY`, worker `START`,
`TARGET_PHASE_BEGIN`, `STAGE_SEALED`, and terminal `DONE` or `STOP`. The eight
stage names remain allocation, input_freeze, development, rank_freeze, reserved,
calibration, replay and evaluation in that order. A stage marker supplies only
its closed name and lowercase 64-hex scientific digest, after custody has
persisted and verified the artifact. The supervisor records this claim; the
driver and subsequent verifier must validate the actual stage bytes and seals.

Frames are strict UTF-8 JSON of at most 256 bytes including newline. Reject
unknown/duplicate keys, wrong order, repeated target entry, missing terminal,
trailing bytes and an unclosed marker channel at worker exit. Child stdout and
stderr are suppressed; raw marker bytes, target strings and exception messages
are not copied into receipts. A clean child exit and valid terminal are both
necessary for a declared terminal status.

`DONE` requires all eight seals. It denotes a completed operational sequence,
not scientific usefulness; the final scientific verdict remains independently
computed from the frozen gates. A stage seal may instead describe failure, in
which case the worker must emit `STOP`. `STOP` carries exactly one closed status
and reason. `NO_GO_INSUFFICIENT_DEVELOPMENT` requires the development seal and
one of the two predefined adequacy reasons; no reserved labels may be opened.
`BLOCKED` and `INCOMPLETE` may terminate after any valid prefix, including after
a failed eighth seal. Neither has an overall scientific performance verdict.

The private operational receipt uses schema `lupine-study-supervisor-v1`. It
records status/reason, sealed stage markers, target-phase entry, charged wall
time, cleanup wall time, peak sampled RSS, leader exit peak or null, exit code
or null, network-namespace verification, fixed limits and measurement caveats.
These are operational observations, not a replacement for the contract's
scientific stage envelopes. Publish it exclusively without overwriting an
existing receipt. The production caller anchors its destination in the validated
ignored private attempt directory. No receipt permits replaying allocation.

The supervisor's internal reasons remain visible in this operational receipt.
The production adapter maps them to the original closed study vocabulary:

| Internal operational outcome | Outer study status/reason |
|---|---|
| Valid `STOP` | Preserve its allowed status and original contract reason |
| `WALL_TIME_LIMIT`, `RSS_LIMIT`, `WORKER_INTERRUPTED` | `BLOCKED` with the same reason |
| `UNSUPPORTED_PLATFORM`, `NETWORK_ISOLATION_UNAVAILABLE`, `NETWORK_ISOLATION_FAILED`, `STARTUP_TIMEOUT` | `BLOCKED` / `INTERNAL_FAILURE`, preserving the internal cause in the separately bound operational receipt |
| `MARKER_INVALID`, `MARKER_ORDER_INVALID`, `MARKER_INCOMPLETE` | `BLOCKED` / `STAGE_ORDER_VIOLATION` |
| `WORKER_SIGNALLED`, `WORKER_FAILED`, `SUPERVISOR_FAILURE` | `BLOCKED` / `INTERNAL_FAILURE`; no inferred OOM or source diagnosis |

A publication failure may leave no new operational receipt. Existing scientific
artifacts and any pending receipt remain evidence for inspection; their existence
does not authorize a dependent stage. No failure triggers automatic retries,
float substitution, revised limits, new allocation or partial-result GO.

## Engineering acceptance before registration

Required constructed-child checks include actual namespace separation and an
unreachable external route, acknowledgement before a constructed decoder,
cumulative timing across stages, both resident-memory observations, interruption,
same-session descendant cleanup, closed and malformed markers, trailing output,
early no-go, a failed final stage, output suppression and receipt preservation.
Bind actual test/source bytes and failed exploratory runs. These checks establish
only the exercised software behavior. The complete source-specific synthetic
driver, independent review and fresh-process scientific-digest reproduction
remain separate prerequisites. Publication and green CI must precede real
allocation and target access; this amendment alone satisfies neither requirement.
