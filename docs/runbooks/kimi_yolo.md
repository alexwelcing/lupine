# Runbook: `kimi --yolo` under `kimi_supervisor`

Wraps an autonomous Kimi run with two halt circuits — a remote GCS sentinel
(remote kill switch) and a local cost tracker (budget circuit-breaker) — plus a
hard cost cap. If either circuit trips, the child is killed cleanly and the
supervisor exits 0.

Traces to: `docs/handoff/04_autonomous_handoff_protocol.md` (autonomous loop on
the `kimi` branch).

## Prerequisites

- The `kimi_supervisor` binary, built from this repo:
  ```bash
  cd lupine-ops
  cargo build --release --bin kimi_supervisor
  ```
  Resulting binary: `lupine-ops/target/release/kimi_supervisor` (or `.exe` on
  Windows).
- `kimi` (or whatever child command you wrap) on `PATH`.
- For remote halt via GCS: Application Default Credentials configured with read
  access to the sentinel bucket (e.g. `gcloud auth application-default login`,
  or a service-account key via `GOOGLE_APPLICATION_CREDENTIALS`).
- `gsutil` (or `gcloud storage`) on the operator's machine for writing the
  sentinel.

## Start

```bash
./lupine-ops/target/release/kimi_supervisor \
  --cmd "kimi --yolo" \
  --halt-object gs://shed-489901-control/kimi-halt \
  --poll-secs 30 \
  --cost-cap-usd 100 \
  --cost-tracker-path /tmp/kimi_cost.json
```

All flags are optional and default to the values shown above; the only
operationally interesting decision is whether you want GCS-backed halt
(`--halt-object`) or local-only halt (`--halt-file`) or both.

The child's stdout and stderr are inherited unchanged. Supervisor's own
structured event log goes to **stderr** as one JSON object per line. Redirect
in production:

```bash
./kimi_supervisor --cmd "kimi --yolo" ... 1>kimi.stdout.log 2>kimi.supervisor.log
```

`kimi.stdout.log` will contain only the child's own stdout. `kimi.supervisor.log`
will contain the structured supervisor events (and any stderr from the child).

## Halt remotely

To kill a running supervisor + child from anywhere, write an object at the
configured sentinel path. Any content is fine — the supervisor only checks for
existence.

```bash
# Easiest: an empty object.
gsutil cp /dev/null gs://shed-489901-control/kimi-halt

# Equivalent with gcloud storage:
echo "" | gcloud storage cp - gs://shed-489901-control/kimi-halt
```

The supervisor will pick this up on the next poll (default 30s), log
`halt_signal_received reason=gcs_sentinel`, kill the child, and exit 0.

### Clear the halt signal

Before starting a new supervisor run, delete the sentinel:

```bash
gsutil rm gs://shed-489901-control/kimi-halt
# or
gcloud storage rm gs://shed-489901-control/kimi-halt
```

(If you forget, the next supervisor will halt almost immediately, log the
reason, and exit cleanly — a noisy but safe failure mode.)

## Halt by cost cap

The supervisor reads `--cost-tracker-path` on every poll. The expected schema
is one of:

```json
{ "usd": 12.34 }
```

or any of these aliases: `total_usd`, `cost_usd`, `amount`.

When the read value exceeds `--cost-cap-usd`, the supervisor logs
`cost_cap_exceeded`, then `halt_signal_received reason=cost_cap_exceeded`, kills
the child, and exits 0.

The cost tracker is **externally written** — by the Kimi child itself, by a
sibling token-accounting job, or by an operator manually. The supervisor never
writes it.

Missing file is treated as 0 USD (no halt). Permission or parse errors are
logged as `cost_read_error` and treated as 0 USD (the supervisor will keep
running on the assumption that a transient FS error shouldn't bring the agent
down — but the error is visible in the log).

## Halt by local file (test / air-gapped mode)

`--halt-file <path>` polls a local file path instead of (or in addition to) the
GCS sentinel. Useful for:

- Local E2E tests of the supervisor itself.
- Air-gapped or offline environments with no GCS access.
- Operator workstations where it's faster to `touch /tmp/halt-kimi` than to
  `gsutil cp`.

```bash
./kimi_supervisor --cmd "kimi --yolo" --halt-file /tmp/halt-kimi --poll-secs 5
# … in another terminal:
touch /tmp/halt-kimi
```

Both `--halt-object` and `--halt-file` may be supplied simultaneously; whichever
fires first wins.

## Log location and shape

Supervisor events go to **stderr** as newline-delimited JSON objects:

```json
{"ts":"2026-05-12T04:18:14.364Z","event":"supervisor_start","fields":{"cmd":"kimi --yolo","poll_secs":30,...}}
{"ts":"2026-05-12T04:18:14.428Z","event":"child_spawned","fields":{"pid":18052}}
{"ts":"2026-05-12T04:18:17.480Z","event":"halt_signal_received","fields":{"reason":"local_file"}}
{"ts":"2026-05-12T04:18:17.481Z","event":"child_hard_kill","fields":{"pid":18052}}
{"ts":"2026-05-12T04:18:17.512Z","event":"halt_completed","fields":{"reason":"local_file"}}
```

Event vocabulary:

| `event` | Meaning |
|---|---|
| `supervisor_start` | Process started; echoes all CLI args |
| `child_spawned` | Child running; includes its PID |
| `gcs_auth_unavailable` | `gcp_auth::provider()` returned an error at startup. GCS polling is disabled for this run, other halt sources still active |
| `gcs_poll_error` | Transient error reading the GCS sentinel; retried next poll |
| `cost_read_error` | Cost tracker file present but unreadable/unparseable; retried next poll |
| `cost_cap_exceeded` | Cost tracker reported a value > `--cost-cap-usd`. Halt is about to fire |
| `halt_signal_received` | A halt source fired. `fields.reason` is one of `gcs_sentinel`, `local_file`, `cost_cap_exceeded`, `ctrl_c`, `child_exited_naturally` |
| `child_terminated_soft` | (Unix only) Child exited within the grace window after SIGTERM |
| `child_hard_kill` | Hard kill issued (TerminateProcess on Windows, SIGKILL on Unix after grace timeout) |
| `child_exited_naturally` | Child exited on its own before any halt fired |
| `halt_completed` | Supervisor about to exit 0 |
| `supervision_loop_error` | Unexpected error inside the supervision loop. The supervisor will still attempt to kill the child cleanly |

### What "cost-cap exceeded" looks like

```json
{"ts":"...","event":"cost_cap_exceeded","fields":{"cap":100.0,"usd":250.0}}
{"ts":"...","event":"halt_signal_received","fields":{"reason":"cost_cap_exceeded"}}
{"ts":"...","event":"child_hard_kill","fields":{"pid":23288}}
{"ts":"...","event":"halt_completed","fields":{"reason":"cost_cap_exceeded"}}
```

Exit code: **0** (clean — the supervisor did its job).

## Platform notes on termination

- **Unix:** the supervisor sends `SIGTERM` first, waits up to 30s for the child
  to exit, then sends `SIGKILL`.
- **Windows:** Windows has no `SIGTERM`. The supervisor goes straight to
  `TerminateProcess` (the equivalent of `SIGKILL`). The grace window does not
  apply.

## Recovery procedure

After a halt has fired, before restarting:

1. **Investigate** the supervisor log. The `halt_signal_received.reason` tells
   you whether it was a budget trip, a remote kill, or a Ctrl+C.
2. **Clear** whichever halt source fired:
   - GCS: `gsutil rm gs://shed-489901-control/kimi-halt`
   - Local file: `rm /path/to/halt-file`
   - Cost cap: reset or rotate `/tmp/kimi_cost.json` (or whichever path you
     used). If the cost tracker is daily, simply waiting until tomorrow may be
     the right answer.
3. **Confirm** there is no stale sentinel:
   ```bash
   gsutil ls gs://shed-489901-control/kimi-halt 2>&1 | grep -q "No URLs matched" && \
     echo "OK: sentinel is clear" || echo "STILL PRESENT — clear before restart"
   ```
4. **Restart** the supervisor with the same command line.

If the supervisor itself crashed (rare — `supervision_loop_error` in the log),
the child should already be cleaned up by `kill_on_drop`. Confirm with
`ps`/`tasklist` and clean up any orphan before restarting.

## Local E2E recipe

The supervisor can be exercised end-to-end without GCS or a real Kimi binary:

```bash
# 1. Halt via local file (fastest)
HALT=/tmp/halt-kimi-e2e
rm -f "$HALT"
( sleep 2 && touch "$HALT" ) &
./lupine-ops/target/release/kimi_supervisor \
  --cmd "sleep 30" \
  --halt-file "$HALT" \
  --poll-secs 1 \
  --cost-cap-usd 1000 \
  --cost-tracker-path /tmp/nonexistent.json
# Expected: exit 0 within ~4s

# 2. Halt via cost cap
COST=/tmp/kimi_cost_e2e.json
( sleep 2 && echo '{"usd": 250.0}' > "$COST" ) &
./lupine-ops/target/release/kimi_supervisor \
  --cmd "sleep 30" \
  --halt-file /tmp/no-halt \
  --poll-secs 1 \
  --cost-cap-usd 100 \
  --cost-tracker-path "$COST"
# Expected: cost_cap_exceeded event, exit 0 within ~4s

# 3. --help
./lupine-ops/target/release/kimi_supervisor --help
```
