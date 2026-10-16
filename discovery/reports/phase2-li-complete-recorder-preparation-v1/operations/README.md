# Prospective Li operation recorder — unbound, never run on the source

This is an ignored preparation bundle, not authorization or evidence of an actual
Li operation. The three `bindings-*.json` files deliberately contain null pins.
No production guard, raw workbook, capture receipt, G34 receipt, actual phase
output or network endpoint was accessed while developing this bundle. Tests use
generated JSON, temporary inert Git files, local-file Git remotes, and short
synthetic child processes only. The shared helper never imports a project module.

`run_after_ci.py --phase <layout|inventory|frame> --binding-sha256 <exact SHA256>`
is the future entry point. Root must first review and bind that phase's exact
published commit, original four-job push CI, clean package/strict execution
receipts/logs, independent artifact audit, complete runtime manifest, eight own
source/test/document paths, all three recorder source files, the standalone
public validator, expected identity/phase packet and earlier accepted operations.
Only one phase and slots 1 then 2 are possible. There is no automatic next phase,
retry, alternate source path, or production permission flag. A changed descendant
needs its own exact CI, package, artifact and source bindings; old success is not
reused as descendant evidence.

Before and after each command (including slot 2), the recorder checks all 345
runtime files, the eight own paths and manifest against current bytes, index and
HEAD blobs, branch, clean worktree and exact origin branch HEAD. Direct blob
checks reject hidden assume-unchanged edits. Gates, logs, public artifact bytes,
recorder/validator bytes, phase pins and prior acceptance bytes are rechecked.
`PHASE_BINDINGS` is read as a literal AST assignment; no adapter import or guard
call occurs during recorder preflight. Remote Git checks happen only on future
explicit execution, never during this preparation.

The sole command is the bound absolute Python interpreter followed by
`scripts/li_v3_readiness_production.py <phase> --run <1|2>`.
PYTHONPATH/PYTHONHOME/startup/cache-prefix variables are removed, bytecode writing
is disabled, and a separate process group is used. Wall limit is 100 seconds;
stdout is bounded to 2 MiB and stderr to 64 KiB. Overflow/timeout/launch failure
retains the bounded prefix and fails. The group receives SIGKILL even after its
leader exits; the leader is reaped. This is not a sandbox against hostile Python
code escaping its process group. Recorded cleanup means group signal delivery
and leader reap succeeded, not proof that arbitrary descendants were reaped.

The public validator requires closed, exact-typed canonical JSON, completed
cleanup, expected identities and phase semantics. Stdout is the adapter's one
serialization of the return after its final close, compared byte-for-byte with
the persisted public file. No separate third return artifact is claimed, and no
second call is used to manufacture that evidence. A complete-looking persisted
file cannot override a failed return, exit or postcheck. Mechanical exit 2,
nonempty stderr, missing/corrupt output, cleanup error and state loss stop before
slot 2; all already captured bytes and execution receipts remain. COMPLETE
negative C exits 0 and may reproduce in the identical frozen second slot, but
never becomes scientific readiness or permission for another operation.

The recorder captures only these additional custody paths on a future call:
fixed `complete-readiness-v1/<phase>/<1|2>/{public,reservation}.json`, and the fixed
reviewed public `complete-readiness-bindings-v1/frame.json` for C. All other
custody paths are rejected by gate pin handling. This code contains no raw source,
capture or G34 input reader. Earlier acceptance packets bind original phase
binding/final/execution files and both public/reservation byte strings, with
original producer identities. B's historical A edge must equal C's A pair.
Original normalized recordings are retained; they are not regenerated from
current source/gates. Before either new command, the pinned pure validator checks
the complete expected packet and the whole original prior prefix. Its private
`_expected` helper is deliberately bound by the exact standalone module bytes;
this adds no project import or actual-source read. After the pair, it checks the whole
ordered public prefix, including A/B replay/counter/lineage consistency. A final
full state recheck precedes pair completion.

Atomic no-overwrite publication uses captured no-follow directory descriptors,
fsynced temporary files, inode checks, no-overwrite hardlinks and anchored
cleanup. The temporary file is closed before its final name is linked. Every
cleanup step is attempted even if another close fails. A late directory-close
or cleanup exception can still leave a persisted name: a name is not accepted
completion. It is an integrity workflow, not authentication of arbitrary
forged historical receipts. Root's frozen pins and observed execution evidence
remain the trust boundary. An interrupted filesystem operation may leave private
partial/temporary evidence; it never authorizes retry or a dependent phase.

## Package gate preparation

`run_package.py --commit <full commit>` is also prospective. It records both the
clean retained-wheel command and strict artifact-verifier command independently,
including exact command, actual exit, timestamps, timeout/overflow/group cleanup,
stdout/stderr length and SHA, source/runtime/own-file state before and after, and
the package recorder/helper hashes. Each command has a 600-second wall limit and
16 MiB per log pipe; these are engineering bounds, not scientific compute limits.
Package failure never launches strict verification. No smoke build was run here.

The operation recorder consumes this exact new execution schema; it does not
pretend older simple receipts contained runtime or log checks they never made.
It cross-links strict stdout and package command evidence to the same sealed
release receipt, wheel and source archive. The held independent Li artifact
auditor supplies a distinct review of Git/source/wheel/RECORD identities and the
17-check, 28-case, six-schema profile. Its original `observed` and input fields
are checked directly; it is not described as independently running the package
probe or authenticating command receipts. Source files use a 16 MiB capture cap;
public metadata is 2 MiB, command logs 16 MiB and retained public artifact
containers 256 MiB. Containers are hashed, not imported or extracted here.

## Externally observed completion packets

Both the package gate (`gates.package_completion`) and every earlier phase
packet (`prior_acceptances.<phase>.completion`) require exactly four pinned
files: `execution`, `stdout`, `stderr`, and `final`. Each pin has exactly
`path`, `bytes`, and `sha256`. A separate root-owned observer must actually run
the recorder and capture its process return; it must not construct this packet
from a final marker. These pins are externally supplied evidence whose frozen
identity is authorized by root, not self-authentication of arbitrary success
JSON. Earlier phase packets keep their original producer and binding identities.

The closed execution schema is
`lupine.li.complete-readiness.outer-execution.v1`, with exactly these keys:
`schema`, `kind`, `phase`, `commit`, `binding_sha256`, `command`, `started_ns`,
`finished_ns`, `exit_code`, `timed_out`, `launch_failed`, `output_limit`,
`process_completed`, `process_group_cleanup`, `stdout_bytes`, `stdout_sha256`,
`stderr_bytes`, `stderr_sha256`, `before_state_sha256`, `after_state_sha256`,
and `source_and_tools_verified`. Package kind uses null phase/binding; phase
kind uses the exact original phase and binding SHA. Commands are the absolute
interpreter and absolute pinned recorder path, followed only by `--commit`
and commit, or by `--phase`, phase, `--binding-sha256`, binding SHA.

Acceptance requires integer exit 0, positive ordered integer timestamps,
literal false timeout/launch/overflow flags, literal true completed/group/source
flags, exact log lengths/hashes, empty stderr, and stdout byte equality with the
canonical persisted final file. The closed final payload must have the correct
kind, identity, and false scientific-admission flag. A phase final also requires
false automatic-advance and true no-retry. A package final requires true no-retry.
Before and after state hashes must be equal valid SHA256 values. The observer's
state preimage is canonical compact sorted ASCII JSON plus LF of
`{"repository": repository_state(commit), "tools": {path: sha256, ...}}`.
The tool mapping contains exactly the three recorder Python files, held public
validator, and observer itself, all discovery-relative paths. Root retains both
state preimages separately. The consumer checks the pinned receipt and equality;
it does not independently reconstruct historical execution or prove authenticity.
The observer's own successful return must also be externally witnessed before
root accepts its packet. No source operation is performed to create these
prospective templates.

## Evidence and limits

The first 16-method invocation had one failure: the test read a forked child's
`/proc` state immediately after SIGKILL and observed `R` rather than `Z`.
The unchanged runtime already rejected that timeout. The test now observes
termination for at most one additional second; the first source/test snapshots
and failure note remain in `evidence/first16/`. This was a synthetic timing
assertion correction, not a source result or a relaxation of operation acceptance.

The final source-bound log and receipt identify the executed synthetic methods
and their exact inputs, including the separate validator's authored fixture
factory. Tests cover caps, late close disagreement, one-phase stopping, negative
C, final state loss, gate type/identity forgeries, original-producer packets,
symlink/parent-swap publication, hidden Git edits and the real pure validator
seam. They do not exercise production source access, actual guards, network,
release gates or scientific truth. Hashes establish byte identity only.

The subsequent first source-bound 22-method repeat failed the inert process's
success assertion with a two-second fixture deadline; its captured detail was
only `process_completed=False`, so the cause is not retrospectively proved.
That log and unchanged source hashes remain in `evidence/final22/`. The synthetic
success/overflow probe now allows ten seconds and reports all result fields on
failure; the production and package deadlines remain unchanged.

Independent review then demonstrated two real ordering gaps in the initial
recorder: prior-prefix consistency was checked only after new commands, and a
log-publication exception could skip post-child state checks and the execution
receipt attempt. The original source and authored evidence remain in
`evidence/before-independent-ordering-fix/`; the separate review lane retains
its first three failing probes. Both are corrected: prior evidence is reviewed
before new commands, and each log publication is isolated so poststate and the
closed execution receipt are still attempted. Any log error stops acceptance.
The corrected authored suite has 26 methods, including all four boundary
regressions (the two log paths, prior prefix and expected-packet preflight).

The independent review then demonstrated a temporary-file close occurring after
publication, which could skip remaining cleanup on failure. The pre-correction
source and 26-method evidence remain in `evidence/before-close-fix/` and
`evidence/final26/`; the separate review retains its first failing close probe.
The file now closes before linking and cleanup attempts are nested independently.
Three additional authored methods test file-close failure, the honest remaining
late-directory-close limitation, and mandatory closed external completion
packets (21 field adversaries plus missing-part/log/final checks). The resulting
29-method suite still uses only constructed inputs, never actual Li operations.
