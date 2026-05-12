# lupine-ops

Operational tooling for the Lupine materials science fleet — manifest,
ledger, MLIP deployment shape, plus a periodic Cloud Run health/cost
reporter binary.

## `monitor_cloud_run`

Rust binary that authenticates to GCP, walks Cloud Run services and jobs
in `--project / --region`, queries Cloud Monitoring for a 24h request
proxy (true cost requires BigQuery billing export), and flags any service
exceeding the idle (>10 min on a `CONDITION_SUCCEEDED` revision) or cost
thresholds. Replaces the never-shipped `monitor_cloud_run.py` referenced
in `docs/handoff/04_autonomous_handoff_protocol.md`.

### Auth

Pick whichever fits where the binary runs:

- **Local dev** — `export GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json`.
- **Cloud Run / GCE / GKE Workload Identity** — `gcp_auth` resolves the
  attached service account automatically.

The service account needs `roles/run.viewer` and `roles/monitoring.viewer`
on the target project at minimum.

### Build

```
cargo build --release --bin monitor_cloud_run
```

### Run

```
# One-shot summary for the default project (shed-489901 / us-central1).
cargo run --release --bin monitor_cloud_run -- --once

# Custom project, tighter cost cap, fan results to a Worker ingest URL.
cargo run --release --bin monitor_cloud_run -- \
    --project shed-489901 \
    --region us-central1 \
    --cost-cap-usd 25 \
    --report-url https://glim-think.workers.dev/ingest/cloud-run-health

# Long-running daemon (5 minute cadence).
cargo run --release --bin monitor_cloud_run -- --interval-secs 300
```

### CLI

```
monitor_cloud_run [--project shed-489901] [--region us-central1]
                  [--once] [--interval-secs 300]
                  [--cost-cap-usd 50] [--report-url <url>]
```

`--once` runs a single check then exits. Default is the loop with
`--interval-secs` cadence (default 300s).

### Output

Human-readable summary lands on stdout; the same payload — shaped as
`PollSummary` — is POSTed to `--report-url` if provided. The CF Worker
consumer can match on `services[].short_name` (`lupine-site`,
`atlas-distill`, etc.) and `flags[]` for alerting.
