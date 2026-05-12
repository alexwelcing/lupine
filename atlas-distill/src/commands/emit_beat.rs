//! `atlas-distill emit-beat` — push one beat row to the glim-think CF Worker.
//!
//! Trace: docs/handoff/05_secure_live_ticker_architecture.md (producer path).
//!
//! OIDC token discovery, in order:
//!   1. GCE/Cloud-Run metadata server. If we're running on GCP, the
//!      service account identity endpoint returns a signed OIDC JWT
//!      with `aud == <worker-url>` directly. No private key needed.
//!   2. `GOOGLE_APPLICATION_CREDENTIALS` pointing at a SA key JSON.
//!      We sign a JWT-bearer assertion (`target_audience = <worker-url>`)
//!      with the SA's private key, then exchange it at the Google OAuth
//!      token endpoint for the ID token.
//!
//! With `--dev-mode-bypass`, the Authorization header is omitted entirely
//! (matches the Worker's `DEV_MODE=true` path). For local smoke tests only.

use anyhow::{anyhow, Context, Result};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use rsa::pkcs1v15::SigningKey;
use rsa::pkcs8::DecodePrivateKey;
use rsa::signature::{SignatureEncoding, Signer};
use rsa::RsaPrivateKey;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::Sha256;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const METADATA_IDENTITY_URL: &str =
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity";
const GOOGLE_TOKEN_URI: &str = "https://oauth2.googleapis.com/token";

pub fn run(
    worker_url: &str,
    agent: &str,
    summary: &str,
    metrics: Option<&str>,
    beat_id: Option<&str>,
    dev_mode_bypass: bool,
) -> Result<()> {
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .context("build tokio runtime")?;
    rt.block_on(run_async(
        worker_url,
        agent,
        summary,
        metrics,
        beat_id,
        dev_mode_bypass,
    ))
}

async fn run_async(
    worker_url: &str,
    agent: &str,
    summary: &str,
    metrics: Option<&str>,
    beat_id: Option<&str>,
    dev_mode_bypass: bool,
) -> Result<()> {
    let normalized_url = worker_url.trim_end_matches('/');
    let endpoint = format!("{}/feed/beats", normalized_url);

    let id = match beat_id {
        Some(s) if !s.trim().is_empty() => s.trim().to_string(),
        _ => uuid::Uuid::new_v4().to_string(),
    };
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let metrics_value = match metrics {
        Some(raw) if !raw.is_empty() => Some(
            serde_json::from_str::<serde_json::Value>(raw)
                .with_context(|| format!("--metrics is not valid JSON: {}", raw))?,
        ),
        _ => None,
    };

    let mut body = json!({
        "beat_id": id,
        "agent": agent,
        "summary": summary,
        "ts": ts,
    });
    if let Some(m) = metrics_value {
        body["metrics"] = m;
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .context("build reqwest client")?;

    let mut req = client.post(&endpoint).json(&body);

    if dev_mode_bypass {
        eprintln!("  ! emit-beat: --dev-mode-bypass enabled, skipping OIDC token mint");
    } else {
        let token = mint_oidc_token(&client, normalized_url).await?;
        req = req.bearer_auth(token);
    }

    let resp = req.send().await.context("POST /feed/beats")?;
    let status = resp.status();
    let body_text = resp
        .text()
        .await
        .unwrap_or_else(|e| format!("<failed to read body: {}>", e));

    eprintln!("  ✦ POST {} → {}", endpoint, status);
    eprintln!("  ✦ body: {}", body_text);

    if !status.is_success() {
        return Err(anyhow!(
            "emit-beat failed: status {} body {}",
            status,
            body_text
        ));
    }
    Ok(())
}

/// Returns a Google-signed OIDC ID token whose `aud` claim equals `audience`.
///
/// Discovery order: metadata server → SA key file. Each path tries fast and
/// falls through on a definitive failure (connection error, 404, missing env).
async fn mint_oidc_token(client: &reqwest::Client, audience: &str) -> Result<String> {
    match metadata_id_token(client, audience).await {
        Ok(t) => return Ok(t),
        Err(e) => eprintln!("  · metadata server: {} (falling back to SA key)", e),
    }
    sa_key_id_token(client, audience).await
}

/// Cloud Run / GCE metadata server: GET .../identity?audience=<aud>&format=full
/// Returns the JWT as the raw response body when the request succeeds.
async fn metadata_id_token(client: &reqwest::Client, audience: &str) -> Result<String> {
    let resp = client
        .get(METADATA_IDENTITY_URL)
        .header("Metadata-Flavor", "Google")
        .query(&[("audience", audience), ("format", "full")])
        .timeout(Duration::from_secs(3))
        .send()
        .await
        .with_context(|| "metadata server unreachable")?;
    if !resp.status().is_success() {
        return Err(anyhow!("metadata server returned {}", resp.status()));
    }
    let token = resp.text().await.context("read metadata id_token body")?;
    if token.trim().is_empty() {
        return Err(anyhow!("metadata server returned empty body"));
    }
    Ok(token.trim().to_string())
}

#[derive(Deserialize)]
struct ServiceAccountKey {
    client_email: String,
    private_key: String,
    token_uri: Option<String>,
}

#[derive(Serialize)]
struct JwtHeader<'a> {
    alg: &'a str,
    typ: &'a str,
}

#[derive(Serialize)]
struct JwtBearerClaims<'a> {
    iss: &'a str,
    aud: &'a str,
    iat: u64,
    exp: u64,
    target_audience: &'a str,
}

#[derive(Deserialize)]
struct TokenResponse {
    id_token: String,
}

/// Local fallback: read SA key from GOOGLE_APPLICATION_CREDENTIALS, sign a
/// JWT-bearer assertion targeting the worker URL, exchange at the Google
/// token endpoint for the OIDC ID token.
async fn sa_key_id_token(client: &reqwest::Client, audience: &str) -> Result<String> {
    let key_path = std::env::var("GOOGLE_APPLICATION_CREDENTIALS")
        .context("no metadata server and GOOGLE_APPLICATION_CREDENTIALS is not set")?;
    let key_text = std::fs::read_to_string(&key_path)
        .with_context(|| format!("read SA key file: {}", key_path))?;
    let key: ServiceAccountKey = serde_json::from_str(&key_text).context("parse SA key JSON")?;
    let token_uri = key.token_uri.as_deref().unwrap_or(GOOGLE_TOKEN_URI);

    let private_key = RsaPrivateKey::from_pkcs8_pem(&key.private_key)
        .context("parse SA private key (expect PKCS#8 PEM)")?;
    let signing_key = SigningKey::<Sha256>::new(private_key);

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let header_b64 = URL_SAFE_NO_PAD.encode(serde_json::to_vec(&JwtHeader {
        alg: "RS256",
        typ: "JWT",
    })?);
    let claims_b64 = URL_SAFE_NO_PAD.encode(serde_json::to_vec(&JwtBearerClaims {
        iss: &key.client_email,
        aud: token_uri,
        iat: now,
        exp: now + 3600,
        target_audience: audience,
    })?);
    let signing_input = format!("{}.{}", header_b64, claims_b64);
    let signature = signing_key.sign(signing_input.as_bytes());
    let sig_b64 = URL_SAFE_NO_PAD.encode(signature.to_bytes());
    let assertion = format!("{}.{}", signing_input, sig_b64);

    let resp = client
        .post(token_uri)
        .form(&[
            ("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer"),
            ("assertion", &assertion),
        ])
        .send()
        .await
        .context("exchange JWT assertion at Google token endpoint")?;
    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(anyhow!("token exchange failed: {} body {}", status, body));
    }
    let parsed: TokenResponse = resp.json().await.context("parse token exchange response")?;
    Ok(parsed.id_token)
}
