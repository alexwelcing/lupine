//! `monitor_cloud_run` — periodic Cloud Run service/job health and cost
//! reporter for the Lupine ops fleet.
//!
//! Replaces the never-shipped `monitor_cloud_run.py` referenced in
//! `docs/handoff/04_autonomous_handoff_protocol.md`. The binary
//! authenticates to GCP, walks Cloud Run admin APIs in the configured
//! project/region, queries Cloud Monitoring for a 24h cost proxy, then
//! emits a human-readable summary to stdout and (optionally) POSTs the
//! structured payload to a report URL — intended to feed the
//! `glim-think` CF Worker fleet dashboard.

use std::sync::Arc;
use std::time::Duration as StdDuration;

use anyhow::{Context, Result, anyhow};
use clap::Parser;
use gcp_auth::{Token, TokenProvider};
use reqwest::{Client, StatusCode};
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use time::format_description::well_known::Rfc3339;

const CLOUD_PLATFORM_SCOPE: &str = "https://www.googleapis.com/auth/cloud-platform";
const CLOUD_RUN_BASE: &str = "https://run.googleapis.com/v2";
const MONITORING_BASE: &str = "https://monitoring.googleapis.com/v3";
const IDLE_FLAG_THRESHOLD_SECS: i64 = 10 * 60;

#[derive(Parser, Debug, Clone)]
#[command(
    name = "monitor_cloud_run",
    about = "Poll Cloud Run services/jobs and surface cost + idle anomalies.",
    version
)]
struct Args {
    /// GCP project ID to inspect.
    #[arg(long, default_value = "shed-489901")]
    project: String,

    /// Cloud Run region (single-region polling — extend later if multi-region matters).
    #[arg(long, default_value = "us-central1")]
    region: String,

    /// Run a single poll then exit. Default: loop forever.
    #[arg(long)]
    once: bool,

    /// Poll interval when running in loop mode.
    #[arg(long, default_value_t = 300, value_name = "SECS")]
    interval_secs: u64,

    /// 24h cost ceiling (USD). Services exceeding this trigger a `flags.cost_exceeded` entry.
    #[arg(long, default_value_t = 50.0, value_name = "USD")]
    cost_cap_usd: f64,

    /// If set, POST the JSON-shaped summary to this URL after each poll
    /// (intended for the glim-think CF Worker ingestion endpoint).
    #[arg(long, value_name = "URL")]
    report_url: Option<String>,
}

/// Minimal Cloud Run v2 service shape — only the fields we actually surface.
#[derive(Debug, Deserialize)]
struct RunService {
    name: String,
    #[serde(default)]
    latest_ready_revision: Option<String>,
    #[serde(default)]
    update_time: Option<String>,
    #[serde(default)]
    terminal_condition: Option<TerminalCondition>,
}

#[derive(Debug, Deserialize)]
struct RunJob {
    name: String,
    #[serde(default)]
    update_time: Option<String>,
    #[serde(default)]
    latest_created_execution: Option<JobExecutionRef>,
    #[serde(default)]
    terminal_condition: Option<TerminalCondition>,
}

#[derive(Debug, Deserialize)]
struct JobExecutionRef {
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    completion_time: Option<String>,
}

#[derive(Debug, Deserialize)]
struct TerminalCondition {
    #[serde(default)]
    state: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ListServicesResponse {
    #[serde(default)]
    services: Vec<RunService>,
}

#[derive(Debug, Deserialize)]
struct ListJobsResponse {
    #[serde(default)]
    jobs: Vec<RunJob>,
}

#[derive(Debug, Deserialize)]
struct TimeSeriesResponse {
    #[serde(default)]
    time_series: Vec<TimeSeries>,
}

#[derive(Debug, Deserialize)]
struct TimeSeries {
    #[serde(default)]
    resource: Option<MonitoredResource>,
    #[serde(default)]
    points: Vec<Point>,
}

#[derive(Debug, Deserialize)]
struct MonitoredResource {
    #[serde(default)]
    labels: std::collections::BTreeMap<String, String>,
}

#[derive(Debug, Deserialize)]
struct Point {
    #[serde(default)]
    value: PointValue,
}

#[derive(Debug, Default, Deserialize)]
struct PointValue {
    #[serde(default)]
    double_value: Option<f64>,
    #[serde(default)]
    int64_value: Option<String>,
}

#[derive(Debug, Serialize)]
struct ServiceReport {
    name: String,
    short_name: String,
    latest_revision: Option<String>,
    status: String,
    last_activity: Option<String>,
    instance_count: u64,
    proxy_metric_24h: f64,
    estimated_cost_usd: Option<f64>,
    flags: Vec<String>,
}

#[derive(Debug, Serialize)]
struct JobReport {
    name: String,
    short_name: String,
    status: String,
    last_activity: Option<String>,
    latest_execution: Option<String>,
    flags: Vec<String>,
}

#[derive(Debug, Serialize)]
struct PollSummary {
    project: String,
    region: String,
    polled_at: String,
    cost_cap_usd: f64,
    cost_metric_note: String,
    services: Vec<ServiceReport>,
    jobs: Vec<JobReport>,
    flags: Vec<String>,
}

struct Auth {
    provider: Arc<dyn TokenProvider>,
}

impl Auth {
    async fn new() -> Result<Self> {
        let provider = gcp_auth::provider()
            .await
            .context("gcp_auth: could not resolve credentials (set GOOGLE_APPLICATION_CREDENTIALS or run inside Cloud Run/GCE)")?;
        Ok(Self { provider })
    }

    async fn token(&self) -> Result<Arc<Token>> {
        let scopes = &[CLOUD_PLATFORM_SCOPE];
        self.provider
            .token(scopes)
            .await
            .context("gcp_auth: failed to mint access token for cloud-platform scope")
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();
    let auth = Auth::new().await?;
    let client = Client::builder()
        .timeout(StdDuration::from_secs(30))
        .build()
        .context("building reqwest client")?;

    if args.once {
        run_once(&args, &auth, &client).await?;
        return Ok(());
    }

    // Loop forever. Ctrl-C terminates cleanly via tokio::signal.
    let mut ticker = tokio::time::interval(StdDuration::from_secs(args.interval_secs.max(1)));
    ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
    loop {
        tokio::select! {
            _ = ticker.tick() => {
                if let Err(e) = run_once(&args, &auth, &client).await {
                    eprintln!("poll error: {e:#}");
                }
            }
            _ = tokio::signal::ctrl_c() => {
                eprintln!("ctrl-c received; exiting monitor loop");
                return Ok(());
            }
        }
    }
}

async fn run_once(args: &Args, auth: &Auth, client: &Client) -> Result<()> {
    let summary = collect_summary(args, auth, client).await?;
    print_human(&summary);

    if let Some(url) = &args.report_url
        && let Err(e) = post_report(client, url, &summary).await
    {
        eprintln!("warning: report POST to {url} failed: {e:#}");
    }
    Ok(())
}

async fn collect_summary(args: &Args, auth: &Auth, client: &Client) -> Result<PollSummary> {
    let token = auth.token().await?;
    let bearer = format!("Bearer {}", token.as_str());

    // Cloud Run admin calls and the monitoring window query are independent —
    // fan them out concurrently and join.
    let (services_res, jobs_res, requests_res) = tokio::join!(
        list_services(client, &bearer, &args.project, &args.region),
        list_jobs(client, &bearer, &args.project, &args.region),
        fetch_request_counts(client, &bearer, &args.project),
    );

    let services = services_res?;
    let jobs = jobs_res?;
    let requests_by_service = requests_res.unwrap_or_else(|e| {
        eprintln!("warning: request-count metric unavailable: {e:#}");
        std::collections::BTreeMap::new()
    });

    let now = OffsetDateTime::now_utc();
    let mut summary = PollSummary {
        project: args.project.clone(),
        region: args.region.clone(),
        polled_at: now.format(&Rfc3339).unwrap_or_else(|_| now.to_string()),
        cost_cap_usd: args.cost_cap_usd,
        cost_metric_note: "billing/aggregated_cost is not directly queryable via Monitoring; \
            using run.googleapis.com/request_count over 24h as a proxy. Hook BigQuery billing export \
            to swap for true cost."
            .to_string(),
        services: Vec::with_capacity(services.len()),
        jobs: Vec::with_capacity(jobs.len()),
        flags: Vec::new(),
    };

    for svc in services {
        let short_name = short_name(&svc.name);
        let proxy_metric_24h = requests_by_service.get(&short_name).copied().unwrap_or(0.0);
        // Naive pricing proxy: Cloud Run requests are negligible; the actual
        // bill is dominated by compute. Treat the request proxy as informational
        // only — `estimated_cost_usd` is None unless we wire BQ billing.
        let estimated_cost_usd: Option<f64> = None;
        let status = svc
            .terminal_condition
            .as_ref()
            .and_then(|c| c.state.clone())
            .unwrap_or_else(|| "UNKNOWN".to_string());
        let last_activity = svc.update_time.clone();

        let mut flags = Vec::new();
        if let Some(idle_secs) = idle_seconds(&last_activity, now)
            && idle_secs > IDLE_FLAG_THRESHOLD_SECS
            && status == "CONDITION_SUCCEEDED"
        {
            flags.push(format!("idle_{idle_secs}s_over_threshold"));
        }
        if let Some(cost) = estimated_cost_usd
            && cost > args.cost_cap_usd
        {
            flags.push(format!(
                "cost_exceeded_{:.2}_over_{:.2}",
                cost, args.cost_cap_usd
            ));
        }

        summary.services.push(ServiceReport {
            name: svc.name,
            short_name,
            latest_revision: svc.latest_ready_revision,
            status,
            last_activity,
            instance_count: 0, // True instance count requires the metric run.googleapis.com/container/instance_count — see TODO.
            proxy_metric_24h,
            estimated_cost_usd,
            flags,
        });
    }

    for job in jobs {
        let short_name = short_name(&job.name);
        let status = job
            .terminal_condition
            .as_ref()
            .and_then(|c| c.state.clone())
            .unwrap_or_else(|| "UNKNOWN".to_string());
        let latest_execution = job
            .latest_created_execution
            .as_ref()
            .and_then(|e| e.name.as_deref())
            .map(self::short_name);
        let last_activity = job
            .latest_created_execution
            .as_ref()
            .and_then(|e| e.completion_time.clone())
            .or(job.update_time);

        summary.jobs.push(JobReport {
            name: job.name,
            short_name,
            status,
            last_activity,
            latest_execution,
            flags: Vec::new(),
        });
    }

    // Roll service-level flags up to the top level so the report consumer can
    // alert without walking the full payload.
    for svc in &summary.services {
        for f in &svc.flags {
            summary.flags.push(format!("{}: {}", svc.short_name, f));
        }
    }

    Ok(summary)
}

async fn list_services(
    client: &Client,
    bearer: &str,
    project: &str,
    region: &str,
) -> Result<Vec<RunService>> {
    let url = format!("{CLOUD_RUN_BASE}/projects/{project}/locations/{region}/services");
    let resp = client
        .get(&url)
        .header("Authorization", bearer)
        .send()
        .await
        .with_context(|| format!("GET {url}"))?;
    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(api_error("list_services", status, &body));
    }
    let parsed: ListServicesResponse = resp.json().await.context("decode list_services JSON")?;
    Ok(parsed.services)
}

async fn list_jobs(
    client: &Client,
    bearer: &str,
    project: &str,
    region: &str,
) -> Result<Vec<RunJob>> {
    let url = format!("{CLOUD_RUN_BASE}/projects/{project}/locations/{region}/jobs");
    let resp = client
        .get(&url)
        .header("Authorization", bearer)
        .send()
        .await
        .with_context(|| format!("GET {url}"))?;
    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(api_error("list_jobs", status, &body));
    }
    let parsed: ListJobsResponse = resp.json().await.context("decode list_jobs JSON")?;
    Ok(parsed.jobs)
}

/// Pulls 24h request-count totals per Cloud Run service via Cloud Monitoring.
/// Used as a cheap activity/cost proxy until we have BQ billing export wired.
async fn fetch_request_counts(
    client: &Client,
    bearer: &str,
    project: &str,
) -> Result<std::collections::BTreeMap<String, f64>> {
    let now = OffsetDateTime::now_utc();
    let start = now - time::Duration::hours(24);
    let url = format!("{MONITORING_BASE}/projects/{project}/timeSeries");

    let resp = client
        .get(&url)
        .header("Authorization", bearer)
        .query(&[
            ("filter", r#"metric.type="run.googleapis.com/request_count""#),
            ("interval.startTime", &start.format(&Rfc3339)?),
            ("interval.endTime", &now.format(&Rfc3339)?),
            ("aggregation.alignmentPeriod", "86400s"),
            ("aggregation.perSeriesAligner", "ALIGN_SUM"),
            ("aggregation.crossSeriesReducer", "REDUCE_SUM"),
            ("aggregation.groupByFields", "resource.label.service_name"),
        ])
        .send()
        .await
        .context("GET monitoring timeSeries")?;
    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(api_error("monitoring.timeSeries", status, &body));
    }
    let parsed: TimeSeriesResponse = resp.json().await.context("decode timeSeries JSON")?;

    let mut out = std::collections::BTreeMap::new();
    for ts in parsed.time_series {
        let svc = ts
            .resource
            .as_ref()
            .and_then(|r| r.labels.get("service_name"))
            .cloned()
            .unwrap_or_else(|| "<unknown>".to_string());
        let total: f64 = ts.points.iter().map(|p| point_value(&p.value)).sum();
        *out.entry(svc).or_insert(0.0) += total;
    }
    Ok(out)
}

fn point_value(v: &PointValue) -> f64 {
    if let Some(d) = v.double_value {
        return d;
    }
    if let Some(s) = &v.int64_value
        && let Ok(n) = s.parse::<f64>()
    {
        return n;
    }
    0.0
}

fn api_error(op: &str, status: StatusCode, body: &str) -> anyhow::Error {
    let snippet: String = body.chars().take(500).collect();
    anyhow!("{op}: HTTP {status}: {snippet}")
}

async fn post_report(client: &Client, url: &str, summary: &PollSummary) -> Result<()> {
    let resp = client
        .post(url)
        .json(summary)
        .send()
        .await
        .with_context(|| format!("POST {url}"))?;
    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(api_error("report_post", status, &body));
    }
    Ok(())
}

fn print_human(s: &PollSummary) {
    println!("== Cloud Run poll: project={} region={} @ {} ==", s.project, s.region, s.polled_at);
    println!("cost cap: ${:.2} USD/24h  | metric note: {}", s.cost_cap_usd, s.cost_metric_note);
    println!();
    println!("Services ({}):", s.services.len());
    if s.services.is_empty() {
        println!("  (none)");
    }
    for svc in &s.services {
        println!(
            "  - {} | status={} | rev={} | last_activity={} | req_24h={:.0} | flags={}",
            svc.short_name,
            svc.status,
            svc.latest_revision.as_deref().unwrap_or("-"),
            svc.last_activity.as_deref().unwrap_or("-"),
            svc.proxy_metric_24h,
            if svc.flags.is_empty() { "ok".to_string() } else { svc.flags.join(",") }
        );
    }
    println!();
    println!("Jobs ({}):", s.jobs.len());
    if s.jobs.is_empty() {
        println!("  (none)");
    }
    for job in &s.jobs {
        println!(
            "  - {} | status={} | last_activity={} | latest_execution={}",
            job.short_name,
            job.status,
            job.last_activity.as_deref().unwrap_or("-"),
            job.latest_execution.as_deref().unwrap_or("-")
        );
    }
    if !s.flags.is_empty() {
        println!();
        println!("FLAGS:");
        for f in &s.flags {
            println!("  ! {f}");
        }
    }
}

/// "projects/p/locations/r/services/foo" -> "foo".
/// Also handles execution names like ".../jobs/foo/executions/foo-abc" -> "foo-abc".
fn short_name(full: &str) -> String {
    full.rsplit('/').next().unwrap_or(full).to_string()
}

/// Returns the elapsed seconds between `ts` (RFC3339) and `now`, if parsable.
fn idle_seconds(ts: &Option<String>, now: OffsetDateTime) -> Option<i64> {
    let raw = ts.as_deref()?;
    let parsed = OffsetDateTime::parse(raw, &Rfc3339).ok()?;
    Some((now - parsed).whole_seconds())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn short_name_strips_resource_prefix() {
        assert_eq!(
            short_name("projects/p/locations/us-central1/services/lupine-site"),
            "lupine-site"
        );
        assert_eq!(short_name("bare"), "bare");
        assert_eq!(
            short_name("projects/p/locations/us-central1/jobs/foo/executions/foo-abc"),
            "foo-abc"
        );
    }

    #[test]
    fn point_value_prefers_double_then_int_string() {
        let pv = PointValue {
            double_value: Some(12.5),
            int64_value: Some("99".into()),
        };
        assert!((point_value(&pv) - 12.5).abs() < 1e-9);

        let pv = PointValue {
            double_value: None,
            int64_value: Some("42".into()),
        };
        assert!((point_value(&pv) - 42.0).abs() < 1e-9);

        let pv = PointValue {
            double_value: None,
            int64_value: None,
        };
        assert_eq!(point_value(&pv), 0.0);
    }

    #[test]
    fn idle_seconds_handles_missing_and_malformed_timestamps() {
        let now = OffsetDateTime::now_utc();
        assert_eq!(idle_seconds(&None, now), None);
        assert_eq!(idle_seconds(&Some("not-a-date".into()), now), None);

        let past = (now - time::Duration::seconds(700))
            .format(&Rfc3339)
            .unwrap();
        let elapsed = idle_seconds(&Some(past), now).unwrap();
        assert!((690..=710).contains(&elapsed));
    }
}
