//! `kimi_supervisor` — wraps an autonomous `kimi --yolo` (or any) child process,
//! polls a remote sentinel (GCS object) and a local cost-tracker JSON file, and
//! kills the child cleanly when either halt condition fires.
//!
//! See `docs/runbooks/kimi_yolo.md` for operational usage.

use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Duration;

use anyhow::{Context, Result, anyhow, bail};
use clap::Parser;
use serde::Deserialize;
use tokio::process::{Child, Command};
use tokio::time::{Instant, sleep};

const GRACEFUL_KILL_TIMEOUT: Duration = Duration::from_secs(30);

#[derive(Parser, Debug)]
#[command(
    name = "kimi_supervisor",
    about = "Wraps an autonomous Kimi (or arbitrary) child process with remote halt + cost cap."
)]
struct Cli {
    /// Command to run as the supervised child. Tokenized with shell-like rules
    /// (whitespace split, double-quoted args preserved).
    #[arg(long, default_value = "kimi --yolo")]
    cmd: String,

    /// GCS sentinel object (e.g. `gs://bucket/object`). If present in GCS, halt
    /// the child. Mutually informative with `--halt-file`; both are polled when
    /// supplied.
    #[arg(long)]
    halt_object: Option<String>,

    /// Local sentinel file (for testing or air-gapped operation). If the file
    /// exists, halt the child.
    #[arg(long)]
    halt_file: Option<PathBuf>,

    /// Poll interval, seconds.
    #[arg(long, default_value_t = 30)]
    poll_secs: u64,

    /// Daily cost cap in USD. If the cost tracker reports > cap, halt.
    #[arg(long, default_value_t = 100.0)]
    cost_cap_usd: f64,

    /// JSON file with `{"usd": <number>}` (or `total_usd`/`cost_usd`/`amount`).
    /// Missing or unreadable file is treated as 0 USD (logged as warning).
    #[arg(long, default_value = "/tmp/kimi_cost.json")]
    cost_tracker_path: PathBuf,
}

#[derive(Debug, Deserialize)]
struct CostFile {
    #[serde(alias = "total_usd", alias = "cost_usd", alias = "amount")]
    usd: f64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum HaltReason {
    GcsSentinel,
    LocalFile,
    CostCap,
    CtrlC,
    ChildExited,
}

impl HaltReason {
    fn as_str(&self) -> &'static str {
        match self {
            HaltReason::GcsSentinel => "gcs_sentinel",
            HaltReason::LocalFile => "local_file",
            HaltReason::CostCap => "cost_cap_exceeded",
            HaltReason::CtrlC => "ctrl_c",
            HaltReason::ChildExited => "child_exited_naturally",
        }
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    if cli.poll_secs == 0 {
        bail!("--poll-secs must be >= 1");
    }

    log_event("supervisor_start", serde_json::json!({
        "cmd": cli.cmd,
        "halt_object": cli.halt_object,
        "halt_file": cli.halt_file.as_ref().map(|p| p.display().to_string()),
        "poll_secs": cli.poll_secs,
        "cost_cap_usd": cli.cost_cap_usd,
        "cost_tracker_path": cli.cost_tracker_path.display().to_string(),
    }));

    let mut child = spawn_child(&cli.cmd)
        .with_context(|| format!("failed to spawn child: {}", cli.cmd))?;
    let child_pid = child.id();
    log_event("child_spawned", serde_json::json!({ "pid": child_pid }));

    // Build the auth manager lazily — only if a GCS object was supplied.
    let auth = if cli.halt_object.is_some() {
        match gcp_auth::provider().await {
            Ok(p) => Some(p),
            Err(e) => {
                log_event(
                    "gcs_auth_unavailable",
                    serde_json::json!({ "error": e.to_string() }),
                );
                None
            }
        }
    } else {
        None
    };

    let http = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .context("build reqwest client")?;

    let halt_reason = run_supervision_loop(&cli, &mut child, auth.as_deref(), &http).await;

    let reason = match halt_reason {
        Ok(r) => r,
        Err(e) => {
            log_event(
                "supervision_loop_error",
                serde_json::json!({ "error": e.to_string() }),
            );
            HaltReason::CtrlC
        }
    };

    log_event(
        "halt_signal_received",
        serde_json::json!({ "reason": reason.as_str() }),
    );

    // Skip termination if the child already exited on its own — there's
    // nothing to kill, and we'd just emit a misleading hard_kill log line.
    if reason != HaltReason::ChildExited {
        terminate_child(&mut child, GRACEFUL_KILL_TIMEOUT).await;
    }
    log_event(
        "halt_completed",
        serde_json::json!({ "reason": reason.as_str() }),
    );

    Ok(())
}

fn spawn_child(cmd_str: &str) -> Result<Child> {
    let parts = tokenize_cmd(cmd_str)?;
    let (program, args) = parts
        .split_first()
        .ok_or_else(|| anyhow!("--cmd must contain at least the program name"))?;

    Command::new(program)
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .kill_on_drop(true)
        .spawn()
        .map_err(Into::into)
}

/// Minimal shell-like tokenizer: whitespace-split with double-quoted segments
/// preserved. No env expansion, no shell metacharacters.
fn tokenize_cmd(s: &str) -> Result<Vec<String>> {
    let mut out: Vec<String> = Vec::new();
    let mut cur = String::new();
    let mut in_quote = false;
    let mut had_token = false;

    for c in s.chars() {
        match (c, in_quote) {
            ('"', _) => {
                in_quote = !in_quote;
                had_token = true;
            }
            (ch, false) if ch.is_whitespace() => {
                if had_token {
                    out.push(std::mem::take(&mut cur));
                    had_token = false;
                }
            }
            (ch, _) => {
                cur.push(ch);
                had_token = true;
            }
        }
    }
    if in_quote {
        bail!("unterminated double-quote in --cmd");
    }
    if had_token {
        out.push(cur);
    }
    if out.is_empty() {
        bail!("--cmd is empty");
    }
    Ok(out)
}

async fn run_supervision_loop(
    cli: &Cli,
    child: &mut Child,
    auth: Option<&dyn gcp_auth::TokenProvider>,
    http: &reqwest::Client,
) -> Result<HaltReason> {
    let poll = Duration::from_secs(cli.poll_secs);
    let mut next_poll = Instant::now() + poll;

    loop {
        tokio::select! {
            biased;

            _ = tokio::signal::ctrl_c() => {
                return Ok(HaltReason::CtrlC);
            }

            status = child.wait() => {
                // Child exited on its own before any halt fired.
                log_event(
                    "child_exited_naturally",
                    serde_json::json!({
                        "status": status.map(|s| s.code()).unwrap_or(None),
                    }),
                );
                return Ok(HaltReason::ChildExited);
            }

            _ = sleep_until(next_poll) => {
                next_poll = Instant::now() + poll;
                if let Some(reason) = check_halt_sources(cli, auth, http).await {
                    return Ok(reason);
                }
            }
        }
    }
}

async fn sleep_until(deadline: Instant) {
    let now = Instant::now();
    if deadline > now {
        sleep(deadline - now).await;
    }
}

async fn check_halt_sources(
    cli: &Cli,
    auth: Option<&dyn gcp_auth::TokenProvider>,
    http: &reqwest::Client,
) -> Option<HaltReason> {
    // Local file (cheap, infallible-ish).
    if let Some(path) = cli.halt_file.as_ref()
        && tokio::fs::metadata(path).await.is_ok()
    {
        return Some(HaltReason::LocalFile);
    }

    // Cost tracker.
    match read_cost(&cli.cost_tracker_path).await {
        Ok(Some(usd)) if usd > cli.cost_cap_usd => {
            log_event(
                "cost_cap_exceeded",
                serde_json::json!({ "usd": usd, "cap": cli.cost_cap_usd }),
            );
            return Some(HaltReason::CostCap);
        }
        Ok(_) => {}
        Err(e) => {
            log_event(
                "cost_read_error",
                serde_json::json!({
                    "path": cli.cost_tracker_path.display().to_string(),
                    "error": e.to_string(),
                }),
            );
        }
    }

    // GCS sentinel.
    if let Some(gs_url) = cli.halt_object.as_ref() {
        match check_gcs_sentinel(gs_url, auth, http).await {
            Ok(true) => return Some(HaltReason::GcsSentinel),
            Ok(false) => {}
            Err(e) => {
                log_event(
                    "gcs_poll_error",
                    serde_json::json!({ "object": gs_url, "error": e.to_string() }),
                );
            }
        }
    }

    None
}

/// Returns `Ok(Some(usd))` when the file exists and parses. Returns `Ok(None)`
/// when the file simply doesn't exist (steady state). Errors only on
/// permission/parse failures.
async fn read_cost(path: &Path) -> Result<Option<f64>> {
    let bytes = match tokio::fs::read(path).await {
        Ok(b) => b,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(e).context("read cost tracker file"),
    };
    let parsed: CostFile =
        serde_json::from_slice(&bytes).context("parse cost tracker JSON")?;
    Ok(Some(parsed.usd))
}

/// `gs_url` is like `gs://bucket/path/to/object`. Returns `true` iff the object
/// exists.
async fn check_gcs_sentinel(
    gs_url: &str,
    auth: Option<&dyn gcp_auth::TokenProvider>,
    http: &reqwest::Client,
) -> Result<bool> {
    let auth = auth.ok_or_else(|| anyhow!("no GCS auth provider available"))?;
    let (bucket, object) = parse_gs_url(gs_url)?;

    // GET object metadata — cheaper than a media download and gives us a clean
    // 200 / 404 split.
    let url = format!(
        "https://storage.googleapis.com/storage/v1/b/{bucket}/o/{}",
        urlencode_path(&object)
    );
    let token = auth
        .token(&["https://www.googleapis.com/auth/devstorage.read_only"])
        .await
        .context("fetch GCS access token")?;

    let resp = http
        .get(&url)
        .bearer_auth(token.as_str())
        .send()
        .await
        .context("send GCS metadata request")?;

    match resp.status().as_u16() {
        200 => Ok(true),
        404 => Ok(false),
        other => {
            let body = resp.text().await.unwrap_or_default();
            Err(anyhow!("GCS responded {other}: {body}"))
        }
    }
}

fn parse_gs_url(s: &str) -> Result<(String, String)> {
    let rest = s
        .strip_prefix("gs://")
        .ok_or_else(|| anyhow!("halt object must start with gs:// (got {s})"))?;
    let (bucket, object) = rest
        .split_once('/')
        .ok_or_else(|| anyhow!("halt object must be gs://bucket/object (got {s})"))?;
    if bucket.is_empty() || object.is_empty() {
        bail!("empty bucket or object in {s}");
    }
    Ok((bucket.to_string(), object.to_string()))
}

/// Percent-encode each byte that isn't unreserved per RFC 3986. The object name
/// goes in a URL path segment but the GCS JSON API expects the full object name
/// (slashes and all) as one segment, so we encode '/' as well.
fn urlencode_path(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        let unreserved = b.is_ascii_alphanumeric()
            || b == b'-'
            || b == b'_'
            || b == b'.'
            || b == b'~';
        if unreserved {
            out.push(b as char);
        } else {
            out.push_str(&format!("%{b:02X}"));
        }
    }
    out
}

async fn terminate_child(child: &mut Child, graceful: Duration) {
    let Some(pid) = child.id() else {
        return; // already reaped
    };

    let soft_sent = soft_kill(pid);

    // Only wait for graceful shutdown if we actually sent a soft-kill signal.
    // On platforms where soft_kill is a no-op (Windows), skip straight to the
    // hard kill — there's nothing to wait for.
    if soft_sent {
        let deadline = Instant::now() + graceful;
        loop {
            match child.try_wait() {
                Ok(Some(status)) => {
                    log_event(
                        "child_terminated_soft",
                        serde_json::json!({ "status": status.code() }),
                    );
                    return;
                }
                Ok(None) => {}
                Err(e) => {
                    log_event(
                        "child_try_wait_error",
                        serde_json::json!({ "error": e.to_string() }),
                    );
                    break;
                }
            }
            if Instant::now() >= deadline {
                break;
            }
            sleep(Duration::from_millis(500)).await;
        }
    }

    log_event("child_hard_kill", serde_json::json!({ "pid": pid }));
    if let Err(e) = child.kill().await {
        log_event(
            "child_kill_error",
            serde_json::json!({ "error": e.to_string() }),
        );
    }
}

/// Returns `true` iff a soft-kill signal was actually sent (i.e. caller should
/// wait the graceful window). Returns `false` on platforms with no SIGTERM
/// equivalent, signalling the caller to skip straight to hard-kill.
#[cfg(unix)]
fn soft_kill(pid: u32) -> bool {
    // SAFETY: libc::kill with a valid pid (we just spawned it) is safe; the
    // worst that happens if the pid has been reaped is ESRCH, which we ignore.
    unsafe {
        libc::kill(pid as libc::pid_t, libc::SIGTERM);
    }
    true
}

#[cfg(windows)]
fn soft_kill(_pid: u32) -> bool {
    // Windows has no SIGTERM. Skip the grace window and go straight to
    // TerminateProcess via tokio's Child::kill.
    false
}

fn log_event(event: &str, fields: serde_json::Value) {
    let line = serde_json::json!({
        "ts": chrono::Utc::now().to_rfc3339(),
        "event": event,
        "fields": fields,
    });
    eprintln!("{line}");
}

// ───────────────────────────────────────────────────────────
// Tests
// ───────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tokenize_basic() {
        assert_eq!(tokenize_cmd("kimi --yolo").unwrap(), vec!["kimi", "--yolo"]);
    }

    #[test]
    fn tokenize_quoted() {
        assert_eq!(
            tokenize_cmd(r#"kimi --prompt "hello world" --yolo"#).unwrap(),
            vec!["kimi", "--prompt", "hello world", "--yolo"],
        );
    }

    #[test]
    fn tokenize_multispace() {
        assert_eq!(tokenize_cmd("  a   b  c  ").unwrap(), vec!["a", "b", "c"]);
    }

    #[test]
    fn tokenize_unterminated_quote_errors() {
        assert!(tokenize_cmd(r#"kimi "oops"#).is_err());
    }

    #[test]
    fn tokenize_empty_errors() {
        assert!(tokenize_cmd("").is_err());
        assert!(tokenize_cmd("   ").is_err());
    }

    #[test]
    fn parse_gs_url_ok() {
        let (b, o) = parse_gs_url("gs://bucket/path/to/obj").unwrap();
        assert_eq!(b, "bucket");
        assert_eq!(o, "path/to/obj");
    }

    #[test]
    fn parse_gs_url_rejects_non_gs() {
        assert!(parse_gs_url("https://bucket/obj").is_err());
    }

    #[test]
    fn parse_gs_url_rejects_missing_object() {
        assert!(parse_gs_url("gs://bucket").is_err());
        assert!(parse_gs_url("gs://bucket/").is_err());
    }

    #[test]
    fn urlencode_path_preserves_unreserved() {
        assert_eq!(urlencode_path("kimi-halt_v1.txt"), "kimi-halt_v1.txt");
    }

    #[test]
    fn urlencode_path_encodes_slash_and_space() {
        assert_eq!(urlencode_path("a/b c"), "a%2Fb%20c");
    }

    #[tokio::test]
    async fn read_cost_missing_is_none() {
        let path = std::env::temp_dir().join("kimi_supervisor_nope_xyz_unlikely_to_exist.json");
        let _ = tokio::fs::remove_file(&path).await;
        let v = read_cost(&path).await.unwrap();
        assert!(v.is_none());
    }

    #[tokio::test]
    async fn read_cost_parses_usd() {
        let path = std::env::temp_dir().join("kimi_supervisor_test_cost.json");
        tokio::fs::write(&path, br#"{"usd": 42.5}"#).await.unwrap();
        let v = read_cost(&path).await.unwrap();
        assert_eq!(v, Some(42.5));
        let _ = tokio::fs::remove_file(&path).await;
    }

    #[tokio::test]
    async fn read_cost_accepts_alias() {
        let path = std::env::temp_dir().join("kimi_supervisor_test_cost_alias.json");
        tokio::fs::write(&path, br#"{"total_usd": 7.0}"#).await.unwrap();
        let v = read_cost(&path).await.unwrap();
        assert_eq!(v, Some(7.0));
        let _ = tokio::fs::remove_file(&path).await;
    }

    #[test]
    fn halt_reason_strings() {
        assert_eq!(HaltReason::GcsSentinel.as_str(), "gcs_sentinel");
        assert_eq!(HaltReason::CostCap.as_str(), "cost_cap_exceeded");
    }
}
