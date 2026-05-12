//! `atlas-distill auto-research` — minimum-viable hypothesis-bound research loop.
//!
//! Contract (driven by glim-think's /admin/dispatch-batch → Cloud Tasks
//! → tasks-consumer → Cloud Run Job):
//!
//!   atlas-distill auto-research \
//!     --hypothesis-id <id> \
//!     --fixture-url gs://bucket/key \
//!     --beat-emit-url https://<worker>/feed/beats
//!
//! What it does (MVP):
//!   1. Mint a GCP OAuth access token via the Cloud Run metadata server
//!      (the Job runs as atlas-distill-runner which has Storage read on
//!      shed-489901-atlas-inputs).
//!   2. GET the fixture object from gs://bucket/key over HTTPS.
//!   3. Parse as `group,x,y` CSV (matches the detect-paradox schema).
//!   4. Run a tiny analysis: per-group sample sizes, overall (x,y) Pearson r,
//!      and a sign comparison vs. per-group mean direction.
//!   5. POST a beat back to <worker>/feed/beats (OIDC, agent=atlas-distill)
//!      with the hypothesis_id + summary + metrics object.
//!
//! This is intentionally small. Heavier analyses (manifold, paradox tests,
//! literature extraction) plug in later by routing different `command:` values
//! from the dispatcher to different handlers — the OIDC + GCS + beat plumbing
//! is what this command proves out.
//!
//! Failure modes are surfaced via the beat itself: on parse/download error
//! we still emit a beat with summary="auto-research: <error>" so the operator
//! sees the failure in /feed/beats rather than only in Cloud Run logs.

use anyhow::{anyhow, Context, Result};
use serde_json::json;
use std::time::Duration;

use crate::commands::emit_beat::emit_beat_async;

const METADATA_TOKEN_URL: &str =
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";
const STORAGE_DOWNLOAD_BASE: &str = "https://storage.googleapis.com/storage/v1/b";

pub fn run(hypothesis_id: &str, fixture_url: &str, beat_emit_url: &str) -> Result<()> {
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .context("build tokio runtime")?;
    rt.block_on(run_async(hypothesis_id, fixture_url, beat_emit_url))
}

async fn run_async(hypothesis_id: &str, fixture_url: &str, beat_emit_url: &str) -> Result<()> {
    // Strip the trailing /feed/beats so emit_beat_async (which appends it)
    // produces the right endpoint.
    let worker_base = beat_emit_url.trim_end_matches('/').trim_end_matches("/feed/beats");

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .context("build reqwest client")?;

    match analyze(&client, fixture_url).await {
        Ok((summary, metrics)) => {
            emit_beat_async(
                worker_base,
                "atlas-distill",
                &summary,
                Some(metrics_with_hypothesis(metrics, hypothesis_id)),
                None,
                false,
            )
            .await?;
        }
        Err(e) => {
            let msg = format!("auto-research[{}]: {}", hypothesis_id, e);
            eprintln!("  ! analyze failed: {}", msg);
            // Emit a failure beat anyway so the operator sees it
            emit_beat_async(
                worker_base,
                "atlas-distill",
                &msg,
                Some(metrics_with_hypothesis(json!({"error": e.to_string()}), hypothesis_id)),
                None,
                false,
            )
            .await?;
            return Err(e);
        }
    }
    Ok(())
}

fn metrics_with_hypothesis(mut metrics: serde_json::Value, hypothesis_id: &str) -> serde_json::Value {
    if let Some(obj) = metrics.as_object_mut() {
        obj.insert("hypothesis_id".into(), json!(hypothesis_id));
    }
    metrics
}

async fn analyze(client: &reqwest::Client, fixture_url: &str) -> Result<(String, serde_json::Value)> {
    let csv = download_gcs(client, fixture_url).await?;
    let (n, n_groups, r_pooled, r_per_group_signs) = pooled_pearson(&csv)?;
    let summary = format!(
        "n={} groups={} r_pooled={:.3} within_signs={:?}",
        n, n_groups, r_pooled, r_per_group_signs
    );
    let metrics = json!({
        "n": n,
        "n_groups": n_groups,
        "r_pooled": r_pooled,
        "within_group_signs": r_per_group_signs,
        "fixture_url": fixture_url,
    });
    Ok((summary, metrics))
}

fn parse_gs_url(url: &str) -> Result<(&str, &str)> {
    let rest = url
        .strip_prefix("gs://")
        .ok_or_else(|| anyhow!("fixture-url must start with gs://"))?;
    let (bucket, key) = rest
        .split_once('/')
        .ok_or_else(|| anyhow!("fixture-url missing object key"))?;
    if bucket.is_empty() || key.is_empty() {
        return Err(anyhow!("fixture-url has empty bucket or key"));
    }
    Ok((bucket, key))
}

async fn metadata_access_token(client: &reqwest::Client) -> Result<String> {
    #[derive(serde::Deserialize)]
    struct Token {
        access_token: String,
    }
    let resp = client
        .get(METADATA_TOKEN_URL)
        .header("Metadata-Flavor", "Google")
        .timeout(Duration::from_secs(3))
        .send()
        .await
        .context("metadata server unreachable")?;
    if !resp.status().is_success() {
        return Err(anyhow!("metadata token endpoint returned {}", resp.status()));
    }
    let t: Token = resp.json().await.context("parse metadata token")?;
    Ok(t.access_token)
}

async fn download_gcs(client: &reqwest::Client, fixture_url: &str) -> Result<String> {
    let (bucket, key) = parse_gs_url(fixture_url)?;
    let token = metadata_access_token(client).await?;
    let url = format!(
        "{}/{}/o/{}?alt=media",
        STORAGE_DOWNLOAD_BASE,
        bucket,
        urlencoding::encode(key)
    );
    let resp = client
        .get(&url)
        .bearer_auth(&token)
        .send()
        .await
        .with_context(|| format!("GET {}", url))?;
    if !resp.status().is_success() {
        let s = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(anyhow!("GCS download {}: {}", s, body));
    }
    Ok(resp.text().await.context("read GCS body")?)
}

/// Parse a tiny CSV of (group, x, y) and compute summary stats.
/// Returns (n_total, n_groups, pooled_pearson_r, per_group_sign_array).
fn pooled_pearson(csv: &str) -> Result<(usize, usize, f64, Vec<i8>)> {
    let mut lines = csv.lines();
    let header = lines
        .next()
        .ok_or_else(|| anyhow!("empty CSV"))?
        .to_lowercase();
    if !header.contains("group") || !header.contains('x') || !header.contains('y') {
        return Err(anyhow!("CSV header must contain group,x,y; got {}", header));
    }
    use std::collections::BTreeMap;
    let mut by_group: BTreeMap<String, Vec<(f64, f64)>> = BTreeMap::new();
    let mut all: Vec<(f64, f64)> = Vec::new();
    for line in lines {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let cols: Vec<&str> = line.split(',').collect();
        if cols.len() < 3 {
            continue;
        }
        let g = cols[0].trim().to_string();
        let x: f64 = cols[1].trim().parse().unwrap_or(f64::NAN);
        let y: f64 = cols[2].trim().parse().unwrap_or(f64::NAN);
        if x.is_nan() || y.is_nan() {
            continue;
        }
        by_group.entry(g).or_default().push((x, y));
        all.push((x, y));
    }
    if all.is_empty() {
        return Err(anyhow!("CSV had no usable rows"));
    }
    let r_pooled = pearson(&all);
    let signs: Vec<i8> = by_group
        .values()
        .map(|pts| {
            if pts.len() < 2 {
                0
            } else {
                let r = pearson(pts);
                if r > 0.0 {
                    1
                } else if r < 0.0 {
                    -1
                } else {
                    0
                }
            }
        })
        .collect();
    Ok((all.len(), by_group.len(), r_pooled, signs))
}

fn pearson(pts: &[(f64, f64)]) -> f64 {
    let n = pts.len() as f64;
    if n < 2.0 {
        return 0.0;
    }
    let mx: f64 = pts.iter().map(|p| p.0).sum::<f64>() / n;
    let my: f64 = pts.iter().map(|p| p.1).sum::<f64>() / n;
    let mut sxy = 0.0;
    let mut sxx = 0.0;
    let mut syy = 0.0;
    for (x, y) in pts {
        let dx = x - mx;
        let dy = y - my;
        sxy += dx * dy;
        sxx += dx * dx;
        syy += dy * dy;
    }
    let denom = (sxx * syy).sqrt();
    if denom == 0.0 {
        0.0
    } else {
        sxy / denom
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_gs_url() {
        let (b, k) = parse_gs_url("gs://bucket/path/to/key.csv").unwrap();
        assert_eq!(b, "bucket");
        assert_eq!(k, "path/to/key.csv");
    }

    #[test]
    fn rejects_missing_scheme() {
        assert!(parse_gs_url("bucket/key").is_err());
    }

    #[test]
    fn pooled_pearson_simple_positive_correlation() {
        let csv = "group,x,y\nA,1,1\nA,2,2\nA,3,3\nB,4,4\nB,5,5\nB,6,6\n";
        let (n, ng, r, signs) = pooled_pearson(csv).unwrap();
        assert_eq!(n, 6);
        assert_eq!(ng, 2);
        assert!((r - 1.0).abs() < 1e-9);
        assert_eq!(signs, vec![1, 1]);
    }

    #[test]
    fn rejects_bad_header() {
        let csv = "foo,bar,baz\n1,2,3\n";
        assert!(pooled_pearson(csv).is_err());
    }
}
