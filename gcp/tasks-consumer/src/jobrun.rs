//! Cloud Run Admin API client for `projects.locations.jobs.run`.
//!
//! We POST to:
//!   https://run.googleapis.com/v2/projects/{project}/locations/{region}/jobs/{job}:run
//! with a `RunJobRequest` body carrying `overrides.containerOverrides[0].args`.
//! Auth uses ADC (workload identity / metadata server) — `reqwest` calls
//! the metadata service for an access token.
//!
//! Returns the operation name on success — callers respond 200 immediately,
//! they don't wait for the Job to finish (Cloud Tasks has its own timeout).

use anyhow::{anyhow, Context};
use axum::async_trait;
use serde::{Deserialize, Serialize};

const METADATA_TOKEN_URL: &str =
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";

#[derive(Debug, Clone)]
pub struct JobRunRequest {
    pub project_id: String,
    pub region: String,
    pub job_name: String,
    pub container_args: Vec<String>,
}

#[async_trait]
pub trait JobRunner: Send + Sync {
    async fn run(&self, req: &JobRunRequest) -> anyhow::Result<String>;
}

pub async fn run_job(runner: &dyn JobRunner, req: &JobRunRequest) -> anyhow::Result<String> {
    runner.run(req).await
}

pub struct DevModeJobRunner;

#[async_trait]
impl JobRunner for DevModeJobRunner {
    async fn run(&self, req: &JobRunRequest) -> anyhow::Result<String> {
        tracing::info!(
            project = %req.project_id,
            region = %req.region,
            job = %req.job_name,
            args = ?req.container_args,
            "[dev-mode] would call jobs.run"
        );
        Ok(format!(
            "projects/{}/locations/{}/operations/dev-mode-op",
            req.project_id, req.region
        ))
    }
}

pub struct RealJobRunner {
    client: reqwest::Client,
}

impl RealJobRunner {
    pub fn new() -> anyhow::Result<Self> {
        Ok(Self {
            client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(20))
                .build()?,
        })
    }

    async fn access_token(&self) -> anyhow::Result<String> {
        #[derive(Deserialize)]
        struct TokenResp {
            access_token: String,
        }
        let resp: TokenResp = self
            .client
            .get(METADATA_TOKEN_URL)
            .header("Metadata-Flavor", "Google")
            .send()
            .await
            .context("calling metadata server for access token")?
            .error_for_status()
            .context("metadata token response not 2xx")?
            .json()
            .await
            .context("parsing metadata token")?;
        Ok(resp.access_token)
    }
}

#[derive(Serialize)]
struct RunJobRequestBody<'a> {
    overrides: Overrides<'a>,
}

#[derive(Serialize)]
struct Overrides<'a> {
    #[serde(rename = "containerOverrides")]
    container_overrides: Vec<ContainerOverride<'a>>,
}

#[derive(Serialize)]
struct ContainerOverride<'a> {
    args: &'a [String],
}

#[derive(Deserialize)]
struct OperationResp {
    name: String,
}

#[async_trait]
impl JobRunner for RealJobRunner {
    async fn run(&self, req: &JobRunRequest) -> anyhow::Result<String> {
        let token = self.access_token().await?;
        let url = format!(
            "https://run.googleapis.com/v2/projects/{}/locations/{}/jobs/{}:run",
            req.project_id, req.region, req.job_name
        );
        let body = RunJobRequestBody {
            overrides: Overrides {
                container_overrides: vec![ContainerOverride {
                    args: &req.container_args,
                }],
            },
        };
        let resp = self
            .client
            .post(&url)
            .bearer_auth(token)
            .json(&body)
            .send()
            .await
            .context("POST jobs.run")?;
        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(anyhow!(
                "jobs.run returned {status}: {}",
                body.chars().take(500).collect::<String>()
            ));
        }
        let op: OperationResp = resp.json().await.context("parsing operation response")?;
        Ok(op.name)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn dev_runner_returns_synthetic_operation() {
        let r = DevModeJobRunner;
        let req = JobRunRequest {
            project_id: "p".into(),
            region: "us-central1".into(),
            job_name: "atlas-distill".into(),
            container_args: vec!["auto-research".into(), "--element".into(), "Al".into()],
        };
        let op = r.run(&req).await.unwrap();
        assert!(op.contains("projects/p/locations/us-central1/operations/"));
    }

    #[test]
    fn body_serializes_args() {
        let args = vec!["auto-research".to_string(), "--element".into(), "Al".into()];
        let body = RunJobRequestBody {
            overrides: Overrides {
                container_overrides: vec![ContainerOverride { args: &args }],
            },
        };
        let json = serde_json::to_value(&body).unwrap();
        assert_eq!(
            json["overrides"]["containerOverrides"][0]["args"][0],
            "auto-research"
        );
        assert_eq!(
            json["overrides"]["containerOverrides"][0]["args"][2],
            "Al"
        );
    }
}
