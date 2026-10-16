# Scratch bounded study-worker supervisor

This source/tests package uses constructed children only. It has not executed a
scientific source, feature artifact, target decoder, actual allocation, entropy
provider or fit. No production CLI exists before registration.

## API and marker contract

`run(command, receipt)` fixes production wall/RSS/startup limits at 3600 seconds,
2147483648 bytes and 60 seconds. `run_synthetic(..., wall_seconds, rss_bytes,
startup_seconds)` is a test-only injection API, not a production command route.
The trusted source-bound production wrapper must provide the frozen worker
command and anchor the operational receipt within its independently validated
private output root. This supervisor does not authorize data access or validate
registration. Its receipt is operational, not a scientific stage artifact.
Publication is exclusive, fsynced and atomic by hard-linking a temporary file;
existing receipt/pending files and symlink parent paths are rejected/preserved.
A malicious path-race adversary is outside this cooperative process boundary.

The supervisor launches `/usr/bin/unshare --user --map-root-user --net --` with a
new process session, closes inherited descriptors except a dedicated Unix socket,
and suppresses child stdout/stderr with DEVNULL. The isolated shim queries
kernel network interfaces via `socket.if_nameindex()` and requires only `lo`.
It sends internal NAMESPACE_READY; parent independently checks the child's
network-namespace inode differs from its own. Sysfs interfaces are intentionally
not used: its mount can reflect host interfaces despite a new network namespace.
Unavailable namespace support blocks without running the study worker. There is
no Python socket monkeypatch or network fallback. Loopback may be down; the
namespace has no external route. This is actual isolation evidence, not entropy
attestation or a hostile-worker filesystem sandbox.

The worker receives `LUPINE_MARKER_FD`. `emit_marker(fd, payload)` sends at most
256 bytes of strict UTF-8 JSON plus newline, then waits for ACK. Exact allowed
worker markers are START; TARGET_PHASE_BEGIN; STAGE_SEALED with a closed stage
and lowercase 64-hex scientific_sha256; DONE; and STOP with closed status/reason.
Duplicate JSON keys, extra keys, malformed/oversized streams, wrong order,
repeated target marker, missing terminal, and bytes following terminal block.
The channel must close at child exit before completion is accepted. No child
output or raw malformed marker bytes are included in a receipt.

Stage order is allocation, input_freeze, development, rank_freeze, reserved,
calibration, replay, evaluation. TARGET_PHASE_BEGIN occurs between input_freeze
and development. Its ACK is sent only after starting the supervisor's monotonic
clock; the wrapper must invoke it immediately before the development decoder.
Every STAGE_SEALED is emitted by custody only after atomic persistence and
verification. A seal can describe a failure receipt, not scientific success;
the wrapper must then terminate with STOP rather than DONE. The supervisor preserves these closed markers and never removes
worker artifacts, but does not itself re-verify their scientific seals.

DONE requires all eight seals. STOP allows BLOCKED/INCOMPLETE with a closed
contract reason after START, including after a failed final evaluation seal, and NO_GO_INSUFFICIENT_DEVELOPMENT only after the
development seal with a fixed development adequacy reason. A terminal still
requires a clean child exit. NO_GO, incomplete and blocked never become success.
The wrapper handles source-specific failures and emits the appropriate terminal;
the supervisor cannot infer a scientific NO_GO from an arbitrary exit code.

## Enforcement and exact limitations

One clock is charged from the acknowledged TARGET_PHASE_BEGIN until observed
worker termination/limit/interruption, across every later stage. Stage markers
cannot reset it. Cleanup duration is separate and cannot alone convert a within-
budget complete worker into timeout. COMPLETE cannot have charged wall above its
limit. A fresh-process reproduction performs the full sequence with its own
budget, not a later-stage restart that refreshes a partially used budget.

Every 10 milliseconds the supervisor samples resident pages for all processes
in the worker session. It sums their actual RSS, including descendants; this is
not RLIMIT_AS and not a hard instantaneous resident-memory ceiling. Shared pages
may be counted more than once; a transient peak between polls can be missed.
Leader wait4 exit rusage records its kernel peak RSS and detects leader excursions
missed by the sampler. It does not recover a simultaneous aggregate descendant
peak. Scheduling delays can also delay detection beyond the nominal poll period.
The receipt states these limitations rather than certifying a 2 GiB peak bound.
RSS startup guard uses the same cap before targets; startup has a separate 60s
wall guard. No resource failure substitutes floats or promotes partial stages.

On resource failure/interruption, cleanup sends TERM then KILL to every observed
process group in the worker session, then records leader wait4 when available.
Descendants changing process group within the session remain covered; a hostile
child creating a new session can escape this scope. The source-bound worker is
cooperative, must not detach, and is not an adversarial-code sandbox. An OS kill
of the supervisor itself cannot produce a new receipt; already persisted worker
seals remain. An unexplained child signal is WORKER_SIGNALLED, not an invented
memory-limit or scientific-source diagnosis. Namespace/startup/marker/error
reasons are closed constants; failed child text is suppressed.

Receipt fields include status/reason, closed sealed_stages, target_phase_started,
charged wall_seconds, cleanup_wall_seconds, peak_sampled_rss_bytes,
child_exit_peak_rss_bytes or null, exit_code, network_namespace_verified, fixed
limits and measurement caveat. These identify operational observations only.

## Reproduction and retained failures

Run `python3 audit.py` in this scratch directory. It snapshots all executing
source/test bytes before and after, runs the synthetic unittest suite, and saves
actual output/exit code in `final-tests.log` and `audit-receipt.json`. Tests use
actual namespaces, external-route failures, resident allocation, descendants,
timeouts, signals, marker errors, early terminals, cumulative stage timing and
output sentinels. No synthetic verdict implies physical or runtime refinement.

`history/first-run/` preserves the first 13-test failure: the interrupt fixture
sent SIGTERM before supervisor startup/handler synchronization, so no receipt
existed. The fixture now waits for a constructed target-phase handshake. Its
other twelve tests passed. `history/15-test-milestone/` preserves a subsequent
source-bound passing milestone before terminal/tail/cleanup refinements.
`second-tests.log` is exploratory evidence and does not substitute for the final
source-bound audit. Independent review is pending.
