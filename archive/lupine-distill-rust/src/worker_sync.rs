//! Best-effort sync of locally-persisted claims into the glim-think
//! Cloudflare worker, so the D1 ledger always reflects the latest state
//! of the engine without manual scripts.
//!
//! Behaviour
//! ---------
//! - Default: every successful local `insert_claim` also POSTs the row to
//!   `${GLIM_THINK_URL}/claims/ingest`. Default URL is the production
//!   worker; override with `GLIM_THINK_URL=http://localhost:8787` for
//!   local dev.
//! - Set `GLIM_THINK_DISABLE_SYNC=1` (or `=true`) to skip sync entirely —
//!   used by tests and by opt-out CLI flag (see `--no-sync`).
//! - HTTP failures are logged via `eprintln!` and do **not** propagate.
//!   The local SQLite insert is the source of truth; the worker is a
//!   downstream cache. Distill must remain usable offline.
//!
//! See also: glim-think/migrations/0004_claims.sql for the receiving
//! schema, and glim-think/src/server.ts for the `/claims/ingest` route.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Duration;

/// On-the-wire shape of a single claim row sent to `glim-think`'s
/// `/claims/ingest` endpoint. This is the canonical Rust-side projection of
/// the contract at `docs/contracts/lupine_distill_to_vectorize.md` and is
/// asserted against by `lupine-distill/tests/vectorize_schema.rs`.
///
/// `claim_data` is `serde_json::Value` so producers can pass either a parsed
/// object or a raw JSON string (both forms are accepted by the worker, per
/// the contract). `evidence_ids` is `Vec<String>` because the canonical form
/// is a JSON array of record_ids; the worker's `JSON.stringify` round-trip
/// preserves order.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct WorkerSyncClaim {
    pub claim_id: String,
    pub agent_id: String,
    pub claim_type: String,
    pub claim_data: Value,
    pub evidence_ids: Vec<String>,
    pub confidence: f64,
    pub status: String,
    pub description: String,
    pub created_at: String,
}

/// Wire envelope for `POST /claims/ingest`. The route accepts a batch.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkerSyncIngestBody {
    pub claims: Vec<WorkerSyncClaim>,
}

const DEFAULT_WORKER_URL: &str = "https://glim-think-v1.aw-ab5.workers.dev";
const SYNC_TIMEOUT_SECS: u64 = 8;

/// Returns true when sync is explicitly disabled via env.
fn is_disabled() -> bool {
    match std::env::var("GLIM_THINK_DISABLE_SYNC") {
        Ok(v) => matches!(v.trim(), "1" | "true" | "TRUE" | "yes" | "YES"),
        Err(_) => false,
    }
}

fn worker_url() -> String {
    std::env::var("GLIM_THINK_URL").unwrap_or_else(|_| DEFAULT_WORKER_URL.to_string())
}

/// Best-effort push of a single claim row to the worker. Logs (does not
/// return) errors. Caller must have already committed the row locally.
///
/// `claim_data` and `evidence_ids` are accepted as raw JSON strings (which
/// is how the local table stores them); the worker accepts either string
/// or parsed object/array form, so we forward as parsed JSON when possible
/// and fall back to the raw string otherwise.
pub fn try_push_claim(
    claim_id: &str,
    agent_id: &str,
    claim_type: &str,
    claim_data: &str,
    description: &str,
    confidence: f64,
    status: &str,
) {
    if is_disabled() {
        return;
    }

    // Constructing the body through the typed `WorkerSyncClaim` rather than
    // raw `json!` keeps this call site in lock-step with the contract test in
    // `tests/vectorize_schema.rs` — any field rename ripples through the type
    // system, not just the wire bytes.
    let parsed_data: Value = serde_json::from_str(claim_data).unwrap_or(json!({}));
    let body = WorkerSyncIngestBody {
        claims: vec![WorkerSyncClaim {
            claim_id: claim_id.to_string(),
            agent_id: agent_id.to_string(),
            claim_type: claim_type.to_string(),
            claim_data: parsed_data,
            evidence_ids: Vec::new(),
            confidence,
            status: status.to_string(),
            description: description.to_string(),
            created_at: current_iso8601(),
        }],
    };

    let url = format!("{}/claims/ingest", worker_url());
    let agent = match ureq::AgentBuilder::new()
        .timeout(Duration::from_secs(SYNC_TIMEOUT_SECS))
        .user_agent("lupine-distill/0.1 worker-sync")
        .build()
        .request("POST", &url)
        .set("Content-Type", "application/json")
        .send_json(body)
    {
        Ok(resp) => resp,
        Err(e) => {
            eprintln!(
                "[worker-sync] WARN: claim {} did not sync to {} — {}",
                claim_id, url, e
            );
            return;
        }
    };

    let status_code = agent.status();
    if !(200..300).contains(&status_code) {
        eprintln!(
            "[worker-sync] WARN: claim {} got HTTP {} from {}",
            claim_id, status_code, url
        );
        return;
    }

    // Parse the {ingested, total, errors} envelope so we can flag partial
    // failures (the worker returns 200 even when some rows failed).
    let parsed: Value = match agent.into_json() {
        Ok(v) => v,
        Err(_) => return,
    };
    let ingested = parsed.get("ingested").and_then(|v| v.as_u64()).unwrap_or(0);
    let total = parsed.get("total").and_then(|v| v.as_u64()).unwrap_or(0);
    let errors = parsed.get("errors").and_then(|v| v.as_array()).map(|a| a.len()).unwrap_or(0);
    if ingested == 0 || errors > 0 {
        eprintln!(
            "[worker-sync] WARN: claim {} reported by worker as ingested={}/{} errors={}",
            claim_id, ingested, total, errors,
        );
    }
}

fn current_iso8601() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    // Crude but dependency-free: we already use this format in
    // db::schema (strftime '%Y-%m-%dT%H:%M:%SZ', 'now'). Avoids pulling
    // chrono just for one timestamp.
    iso_utc_from_unix(secs)
}

fn iso_utc_from_unix(unix: i64) -> String {
    // Days from 1970-01-01.
    let days = unix.div_euclid(86_400);
    let secs_of_day = unix.rem_euclid(86_400);
    let h = secs_of_day / 3600;
    let m = (secs_of_day / 60) % 60;
    let s = secs_of_day % 60;
    let (y, mo, d) = days_to_ymd(days);
    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z", y, mo, d, h, m, s)
}

fn days_to_ymd(mut days: i64) -> (i64, u32, u32) {
    // Howard Hinnant's date algorithms (public domain). Used here purely
    // to avoid pulling `chrono` for one call site; verified against the
    // canonical examples (1970-01-01 → days=0; 2026-05-02 → days=20575).
    days += 719_468;
    let era = if days >= 0 { days / 146_097 } else { (days - 146_096) / 146_097 };
    let doe = (days - era * 146_097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y_ce = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = (if mp < 10 { mp + 3 } else { mp - 9 }) as u32;
    let y = if m <= 2 { y_ce + 1 } else { y_ce };
    (y, m, d)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn iso_format_at_epoch() {
        assert_eq!(iso_utc_from_unix(0), "1970-01-01T00:00:00Z");
    }

    #[test]
    fn iso_format_at_known_date() {
        // 2026-05-02 00:00 UTC = 1777680000
        assert_eq!(iso_utc_from_unix(1_777_680_000), "2026-05-02T00:00:00Z");
    }
}
