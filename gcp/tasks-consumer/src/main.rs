//! Cloud Tasks → atlas-distill Cloud Run Job dispatcher.
//!
//! The queue `atlas-distill-jobs` (us-central1) targets this service. We:
//!   1. validate the Cloud Tasks OIDC `Authorization` bearer token
//!   2. parse the task envelope
//!   3. invoke `projects.locations.jobs.run` for the `atlas-distill` Cloud Run Job
//!      with container overrides carrying `command` + `args` + `--beat-emit-url`
//!   4. return 200 once the Job RUN is accepted (we don't wait for completion)
//!
//! See unit-08 of the handoff plan and docs/handoff/03_gcp_heavy_workload_blueprint.md.

use std::net::SocketAddr;
use std::sync::Arc;

use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use clap::Parser;
use serde::{Deserialize, Serialize};
use tracing::{error, info, warn};

mod auth;
mod jobrun;

use auth::{verify_oidc, OidcVerifier};
use jobrun::{run_job, JobRunner, RealJobRunner};

#[derive(Parser, Debug, Clone)]
#[command(version, about = "Cloud Tasks consumer for atlas-distill")]
struct Cli {
    /// Port to bind. Cloud Run injects $PORT.
    #[arg(long, env = "PORT", default_value_t = 8080)]
    port: u16,

    /// Public URL of this service (Cloud Run injects via env). Used as expected `aud` in OIDC.
    #[arg(long, env = "SERVICE_URL")]
    service_url: Option<String>,

    /// GCP project id.
    #[arg(long, env = "GCP_PROJECT_ID", default_value = "shed-489901")]
    project_id: String,

    /// Cloud Run region.
    #[arg(long, env = "GCP_REGION", default_value = "us-central1")]
    region: String,

    /// Name of the Cloud Run Job to trigger.
    #[arg(long, env = "TARGET_JOB", default_value = "atlas-distill")]
    target_job: String,

    /// Skip OIDC verification and use a no-op job runner. For local E2E only.
    #[arg(long, env = "DEV_MODE", default_value_t = false)]
    dev_mode: bool,
}

/// Cloud Tasks envelope. Matches the body the dispatcher writes on the Cloudflare side.
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct TaskPayload {
    pub fixture_url: String,
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
    pub beat_emit_url: String,
}

#[derive(Debug, Serialize)]
struct RunResponse {
    accepted: bool,
    operation_name: String,
}

#[derive(Clone)]
struct AppState {
    cfg: Arc<Cli>,
    verifier: Arc<dyn OidcVerifier>,
    runner: Arc<dyn JobRunner>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,tasks_consumer=debug".into()),
        )
        .with_target(false)
        .json()
        .init();

    let cli = Cli::parse();
    let app = build_app(cli.clone()).await?;
    let addr = SocketAddr::from(([0, 0, 0, 0], cli.port));
    info!(port = cli.port, dev_mode = cli.dev_mode, "tasks-consumer listening");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

async fn shutdown_signal() {
    let _ = tokio::signal::ctrl_c().await;
    info!("shutdown signal received");
}

async fn build_app(cli: Cli) -> anyhow::Result<Router> {
    let verifier: Arc<dyn OidcVerifier> = if cli.dev_mode {
        Arc::new(auth::DevModeVerifier)
    } else {
        Arc::new(auth::GoogleJwksVerifier::new().await?)
    };
    let runner: Arc<dyn JobRunner> = if cli.dev_mode {
        Arc::new(jobrun::DevModeJobRunner)
    } else {
        Arc::new(RealJobRunner::new()?)
    };
    let state = AppState {
        cfg: Arc::new(cli),
        verifier,
        runner,
    };
    Ok(Router::new()
        .route("/healthz", get(|| async { "ok" }))
        .route("/run", post(handle_run))
        .with_state(state))
}

async fn handle_run(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: axum::body::Bytes,
) -> impl IntoResponse {
    let payload: TaskPayload = match serde_json::from_slice(&body) {
        Ok(p) => p,
        Err(e) => {
            warn!(error = %e, "invalid task payload");
            return (StatusCode::BAD_REQUEST, format!("invalid payload: {e}")).into_response();
        }
    };

    let task_name = headers
        .get("x-cloudtasks-taskname")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("(unknown)");

    if !state.cfg.dev_mode {
        match verify_oidc(state.verifier.as_ref(), &headers, state.cfg.service_url.as_deref()).await {
            Ok(claims) => info!(task = task_name, sub = %claims.sub, "oidc verified"),
            Err(e) => {
                warn!(task = task_name, error = %e, "oidc verification failed");
                return (StatusCode::UNAUTHORIZED, format!("unauthorized: {e}")).into_response();
            }
        }
    }

    let mut overrides_args = vec![payload.command.clone()];
    overrides_args.extend(payload.args.iter().cloned());
    overrides_args.push("--beat-emit-url".into());
    overrides_args.push(payload.beat_emit_url.clone());
    overrides_args.push("--fixture-url".into());
    overrides_args.push(payload.fixture_url.clone());

    let req = jobrun::JobRunRequest {
        project_id: state.cfg.project_id.clone(),
        region: state.cfg.region.clone(),
        job_name: state.cfg.target_job.clone(),
        container_args: overrides_args,
    };

    match run_job(state.runner.as_ref(), &req).await {
        Ok(op) => {
            info!(task = task_name, operation = %op, "job run accepted");
            (
                StatusCode::OK,
                Json(RunResponse {
                    accepted: true,
                    operation_name: op,
                }),
            )
                .into_response()
        }
        Err(e) => {
            error!(task = task_name, error = %e, "job run failed");
            (
                StatusCode::BAD_GATEWAY,
                format!("upstream job run failed: {e}"),
            )
                .into_response()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    fn dev_cli() -> Cli {
        Cli {
            port: 0,
            service_url: Some("https://example.run.app".into()),
            project_id: "test-project".into(),
            region: "us-central1".into(),
            target_job: "atlas-distill".into(),
            dev_mode: true,
        }
    }

    #[tokio::test]
    async fn rejects_malformed_body() {
        let app = build_app(dev_cli()).await.unwrap();
        let res = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/run")
                    .header("content-type", "application/json")
                    .body(Body::from("{not-json}"))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn accepts_valid_dev_mode_request() {
        let app = build_app(dev_cli()).await.unwrap();
        let body = serde_json::json!({
            "fixture_url": "gs://bucket/path.dump",
            "command": "auto-research",
            "args": ["--element", "Al"],
            "beat_emit_url": "https://glim-think.example.workers.dev/beat"
        });
        let res = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/run")
                    .header("content-type", "application/json")
                    .body(Body::from(body.to_string()))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let bytes = res.into_body().collect().await.unwrap().to_bytes();
        let parsed: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(parsed["accepted"], serde_json::Value::Bool(true));
    }

    #[tokio::test]
    async fn healthz_ok() {
        let app = build_app(dev_cli()).await.unwrap();
        let res = app
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri("/healthz")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn rejects_missing_required_field() {
        let app = build_app(dev_cli()).await.unwrap();
        // missing fixture_url
        let body = serde_json::json!({
            "command": "auto-research",
            "args": [],
            "beat_emit_url": "https://x.example/beat"
        });
        let res = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/run")
                    .body(Body::from(body.to_string()))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::BAD_REQUEST);
    }
}
