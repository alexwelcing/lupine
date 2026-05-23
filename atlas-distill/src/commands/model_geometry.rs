//! Model-geometry distillation for MLIP benchmark dumps.
//!
//! This command turns large model prediction tables into a compact evidence
//! packet: residual matrices, singular spectra, effective-rank checks, and
//! pairwise model/generation alignment scores. It is intentionally generic so
//! labs can hand us WBM, MLIP Arena, OC-style, or local smoke outputs without
//! needing bespoke code for each benchmark.

use std::collections::{BTreeMap, BTreeSet, HashMap};
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::time::Duration;
use std::time::Instant;
use std::time::{SystemTime, UNIX_EPOCH};

use anyhow::{anyhow, bail, Context, Result};
use clap::Args;
use nalgebra::{DMatrix, SVD};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha256};

use crate::commands::emit_beat::emit_beat_async;

const PASS_THRESHOLD: f64 = 0.7;
const FALSIFICATION_THRESHOLD: f64 = 0.5;
const METADATA_TOKEN_URL: &str =
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";
const STORAGE_DOWNLOAD_BASE: &str = "https://storage.googleapis.com/storage/v1/b";

#[derive(Debug, Clone, Args)]
pub struct ModelGeometryArgs {
    /// Tidy CSV or JSON input. CSV columns: config_id,model_id,feature,predicted.
    #[arg(long)]
    pub input: Option<PathBuf>,
    /// Fixture URL supplied by glim-think/tasks-consumer. Supports gs://, http(s), or local paths.
    #[arg(long)]
    pub fixture_url: Option<String>,
    /// Beat endpoint supplied by glim-think/tasks-consumer.
    #[arg(long)]
    pub beat_emit_url: Option<String>,
    /// Hypothesis id that owns this experiment/evidence packet.
    #[arg(long)]
    pub hypothesis_id: Option<String>,
    /// Campaign id for GLIM 5x5x3 campaign tracking.
    #[arg(long)]
    pub campaign_id: Option<String>,
    /// Cell id for GLIM 5x5x3 campaign tracking.
    #[arg(long)]
    pub cell_id: Option<String>,
    /// Row id for GLIM 5x5x3 campaign tracking.
    #[arg(long)]
    pub row_id: Option<String>,
    /// MLIP id for GLIM 5x5x3 campaign tracking.
    #[arg(long)]
    pub mlip_id: Option<String>,
    /// Variant id for GLIM 5x5x3 campaign tracking.
    #[arg(long)]
    pub variant_id: Option<String>,
    /// JSON evidence output. Defaults beside --input.
    #[arg(long)]
    pub output: Option<PathBuf>,
    /// Markdown summary output. Defaults to output path with .md extension.
    #[arg(long)]
    pub markdown: Option<PathBuf>,
    /// Analysis mode: auto, reference, or prediction.
    #[arg(long, default_value = "auto")]
    pub mode: String,
    /// Quality gate: none, fit, physics, or accuracy.
    #[arg(long, default_value = "none")]
    pub quality_gate: String,
    /// Maximum absolute percent error for --quality-gate accuracy.
    #[arg(long, default_value_t = 100.0)]
    pub accuracy_max_pct: f64,
    /// Top-k singular directions to compare.
    #[arg(long, default_value_t = 5)]
    pub top_k: usize,
    /// Singular-value ratio floor for effective-rank gating.
    #[arg(long, default_value_t = 0.01)]
    pub effective_rank_floor: f64,
    /// Pair(s) to compare, formatted as from_model:to_model. If omitted, all pairs.
    #[arg(long = "pair")]
    pub pairs: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
enum AnalysisMode {
    Reference,
    Prediction,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum RequestedMode {
    Auto,
    Reference,
    Prediction,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
enum QualityGate {
    None,
    Fit,
    Physics,
    Accuracy,
}

#[derive(Debug, Clone, Deserialize)]
struct JsonInput {
    #[serde(default)]
    dataset_id: Option<String>,
    records: Vec<InputRecord>,
}

#[derive(Debug, Clone, Deserialize)]
struct InputRecord {
    dataset_id: Option<String>,
    config_id: String,
    model_id: String,
    feature: String,
    predicted: f64,
    #[serde(default)]
    reference: Option<f64>,
    #[serde(default)]
    weight: Option<f64>,
    #[serde(default)]
    source_id: Option<String>,
    #[serde(default)]
    quality_pass: Option<bool>,
    #[serde(default)]
    fit_ok: Option<bool>,
    #[serde(default)]
    physics_stable: Option<bool>,
    #[serde(default)]
    born_stable: Option<bool>,
    #[serde(default)]
    mode_r2: Option<f64>,
    #[serde(default)]
    abs_pct_error: Option<f64>,
}

#[derive(Debug, Clone)]
struct GeometryPoint {
    dataset_id: Option<String>,
    source_id: Option<String>,
    predicted: f64,
    reference: Option<f64>,
    weight: f64,
    n: usize,
    quality_pass: Option<bool>,
    fit_ok: Option<bool>,
    physics_stable: Option<bool>,
    mode_r2: Option<f64>,
    abs_pct_error: Option<f64>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct PointKey {
    model_id: String,
    config_id: String,
    feature: String,
}

impl Hash for PointKey {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.model_id.hash(state);
        self.config_id.hash(state);
        self.feature.hash(state);
    }
}

#[derive(Debug, Clone)]
struct AccumPoint {
    dataset_id: Option<String>,
    source_id: Option<String>,
    predicted_sum: f64,
    reference_sum: f64,
    reference_count: usize,
    weight_sum: f64,
    n: usize,
    quality_pass: Option<bool>,
    fit_ok: Option<bool>,
    physics_stable: Option<bool>,
    mode_r2_min: Option<f64>,
    abs_pct_error_sum: f64,
    abs_pct_error_count: usize,
}

#[derive(Debug, Clone)]
struct Dataset {
    points: HashMap<PointKey, GeometryPoint>,
    models: BTreeSet<String>,
    configs: BTreeSet<String>,
    features: BTreeSet<String>,
    n_raw_records: usize,
    dataset_id: Option<String>,
}

struct InputSource {
    bytes: Vec<u8>,
    display: String,
    format_path: PathBuf,
    default_output_input: PathBuf,
}

struct RunArtifacts {
    packet: EvidencePacket,
    output: PathBuf,
    markdown: PathBuf,
}

#[derive(Debug, Clone)]
struct PairSpec {
    from_model: String,
    to_model: String,
}

#[derive(Debug, Clone)]
struct PairMatrices {
    from: DMatrix<f64>,
    to: DMatrix<f64>,
    row_ids: Vec<String>,
    features: Vec<String>,
    dropped_rows: usize,
}

#[derive(Debug, Clone)]
struct Basis {
    left: DMatrix<f64>,
    feature: DMatrix<f64>,
    singular_values: Vec<f64>,
    rank: usize,
}

#[derive(Debug, Clone, Serialize)]
struct EvidencePacket {
    schema: String,
    run_id: String,
    input: InputEvidence,
    protocol: ProtocolEvidence,
    dataset: DatasetEvidence,
    results: Vec<PairResult>,
    overall: OverallEvidence,
}

#[derive(Debug, Clone, Serialize)]
struct InputEvidence {
    path: String,
    sha256: String,
    format: String,
}

#[derive(Debug, Clone, Serialize)]
struct ProtocolEvidence {
    mode: AnalysisMode,
    quality_gate: String,
    top_k_requested: usize,
    pass_threshold: f64,
    falsification_threshold: f64,
    effective_rank_floor: f64,
    value_definition: String,
}

#[derive(Debug, Clone, Serialize)]
struct DatasetEvidence {
    dataset_id: Option<String>,
    n_raw_records: usize,
    n_aggregated_points: usize,
    n_models: usize,
    n_configs: usize,
    n_features: usize,
    models: Vec<String>,
    features: Vec<String>,
    reference_coverage: f64,
}

#[derive(Debug, Clone, Serialize)]
struct PairResult {
    pair_id: String,
    from_model: String,
    to_model: String,
    verdict: String,
    mode: AnalysisMode,
    matrix_shape: [usize; 2],
    dropped_incomplete_rows: usize,
    row_ids: Vec<String>,
    features: Vec<String>,
    top_k_requested: usize,
    top_k_used: usize,
    from_rank: usize,
    to_rank: usize,
    effective_k: usize,
    from_singular_values: Vec<f64>,
    to_singular_values: Vec<f64>,
    configuration_space_left_vectors: BasisComparison,
    feature_space_vectors: BasisComparison,
}

#[derive(Debug, Clone, Serialize)]
struct BasisComparison {
    k: usize,
    cosine_matrix: Vec<Vec<f64>>,
    best_match_from_first: Vec<f64>,
    best_match_from_second: Vec<f64>,
    worst_best_match: f64,
    mean_best_match: f64,
    principal_angle_cosines: Vec<f64>,
    min_principal_angle_cosine: f64,
}

#[derive(Debug, Clone, Serialize)]
struct OverallEvidence {
    n_pairs: usize,
    n_pass: usize,
    n_falsified: usize,
    n_inconclusive: usize,
    n_invalid_rank: usize,
    n_underpowered_effective_rank: usize,
    n_geometry_only: usize,
    verdict: String,
}

pub fn run(args: ModelGeometryArgs) -> Result<()> {
    let started = Instant::now();
    match run_inner(&args) {
        Ok(artifacts) => {
            if let Some(beat_emit_url) = args.beat_emit_url.as_deref() {
                emit_model_geometry_beat(
                    &args,
                    beat_emit_url,
                    &artifacts,
                    started.elapsed().as_millis() as u64,
                    None,
                )?;
            }
            println!("{}", artifacts.output.display());
            println!("{}", artifacts.markdown.display());
            print_short_summary(&artifacts.packet);
            Ok(())
        }
        Err(err) => {
            if let Some(beat_emit_url) = args.beat_emit_url.as_deref() {
                let _ = emit_model_geometry_failure_beat(&args, beat_emit_url, &err);
            }
            Err(err)
        }
    }
}

fn run_inner(args: &ModelGeometryArgs) -> Result<RunArtifacts> {
    let requested_mode = parse_requested_mode(&args.mode)?;
    let quality_gate = parse_quality_gate(&args.quality_gate)?;
    let top_k = args.top_k.max(1);
    let rank_floor = if args.effective_rank_floor > 0.0 {
        args.effective_rank_floor
    } else {
        bail!("--effective-rank-floor must be positive");
    };

    let input = resolve_input_source(args)?;
    let input_sha = sha256_hex(&input.bytes);
    let input_format = input_format(&input.format_path, &input.bytes);
    let records = parse_input(&input.format_path, &input.bytes)?;
    let dataset = build_dataset(records)?;
    let mode = resolve_mode(requested_mode, &dataset)?;
    let pairs = resolve_pairs(&args.pairs, &dataset)?;

    let mut results = Vec::new();
    for pair in pairs {
        let matrices =
            build_pair_matrices(&dataset, &pair, mode, quality_gate, args.accuracy_max_pct)?;
        results.push(analyze_pair(&pair, matrices, mode, top_k, rank_floor)?);
    }

    let packet = EvidencePacket {
        schema: "lupine.model_geometry.evidence.v1".to_string(),
        run_id: format!("model_geometry_{}", unix_timestamp()),
        input: InputEvidence {
            path: input.display.clone(),
            sha256: input_sha,
            format: input_format,
        },
        protocol: ProtocolEvidence {
            mode,
            quality_gate: format!("{:?}", quality_gate).to_lowercase(),
            top_k_requested: top_k,
            pass_threshold: PASS_THRESHOLD,
            falsification_threshold: FALSIFICATION_THRESHOLD,
            effective_rank_floor: rank_floor,
            value_definition: value_definition(mode),
        },
        dataset: dataset_evidence(&dataset),
        overall: overall(&results),
        results,
    };

    let output = args
        .output
        .clone()
        .unwrap_or_else(|| default_json_output(&input.default_output_input));
    if let Some(parent) = output.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&output, serde_json::to_string_pretty(&packet)?)?;

    let markdown = args
        .markdown
        .clone()
        .unwrap_or_else(|| output.with_extension("md"));
    if let Some(parent) = markdown.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&markdown, render_markdown(&packet))?;

    Ok(RunArtifacts {
        packet,
        output,
        markdown,
    })
}

fn resolve_input_source(args: &ModelGeometryArgs) -> Result<InputSource> {
    if let Some(path) = &args.input {
        let bytes = fs::read(path).with_context(|| format!("read input {}", path.display()))?;
        return Ok(InputSource {
            bytes,
            display: path.display().to_string(),
            format_path: path.clone(),
            default_output_input: path.clone(),
        });
    }

    let fixture_url = args
        .fixture_url
        .as_deref()
        .ok_or_else(|| anyhow!("either --input or --fixture-url is required"))?;

    if fixture_url.starts_with("gs://") {
        let bytes = block_on(download_gcs_bytes(fixture_url))?;
        let key = parse_gs_url(fixture_url)?.1;
        let format_path = PathBuf::from(
            Path::new(&key)
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or("model_geometry_fixture.csv"),
        );
        return Ok(InputSource {
            bytes,
            display: fixture_url.to_string(),
            default_output_input: format_path.clone(),
            format_path,
        });
    }

    if fixture_url.starts_with("http://") || fixture_url.starts_with("https://") {
        let bytes = block_on(download_http_bytes(fixture_url))?;
        let name = fixture_url
            .rsplit('/')
            .next()
            .filter(|value| !value.is_empty())
            .unwrap_or("model_geometry_fixture.csv");
        let format_path = PathBuf::from(name);
        return Ok(InputSource {
            bytes,
            display: fixture_url.to_string(),
            default_output_input: format_path.clone(),
            format_path,
        });
    }

    let path = PathBuf::from(fixture_url);
    let bytes = fs::read(&path).with_context(|| format!("read fixture {}", path.display()))?;
    Ok(InputSource {
        bytes,
        display: path.display().to_string(),
        format_path: path.clone(),
        default_output_input: path,
    })
}

fn block_on<T>(future: impl std::future::Future<Output = Result<T>>) -> Result<T> {
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .context("build tokio runtime")?;
    rt.block_on(future)
}

fn parse_gs_url(url: &str) -> Result<(String, String)> {
    let rest = url
        .strip_prefix("gs://")
        .ok_or_else(|| anyhow!("fixture-url must start with gs://"))?;
    let (bucket, key) = rest
        .split_once('/')
        .ok_or_else(|| anyhow!("fixture-url missing object key"))?;
    if bucket.is_empty() || key.is_empty() {
        bail!("fixture-url has empty bucket or key");
    }
    Ok((bucket.to_string(), key.to_string()))
}

async fn metadata_access_token(client: &reqwest::Client) -> Result<String> {
    #[derive(Deserialize)]
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
        bail!("metadata token endpoint returned {}", resp.status());
    }
    let token: Token = resp.json().await.context("parse metadata token")?;
    Ok(token.access_token)
}

async fn download_gcs_bytes(fixture_url: &str) -> Result<Vec<u8>> {
    let (bucket, key) = parse_gs_url(fixture_url)?;
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .context("build reqwest client")?;
    let token = metadata_access_token(&client).await?;
    let url = format!(
        "{}/{}/o/{}?alt=media",
        STORAGE_DOWNLOAD_BASE,
        bucket,
        urlencoding::encode(&key),
    );
    let resp = client
        .get(&url)
        .bearer_auth(&token)
        .send()
        .await
        .with_context(|| format!("GET {url}"))?;
    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        bail!("GCS download {status}: {body}");
    }
    Ok(resp.bytes().await.context("read GCS body")?.to_vec())
}

async fn download_http_bytes(url: &str) -> Result<Vec<u8>> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .context("build reqwest client")?;
    let resp = client
        .get(url)
        .send()
        .await
        .with_context(|| format!("GET {url}"))?;
    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        bail!("HTTP download {status}: {body}");
    }
    Ok(resp.bytes().await.context("read HTTP body")?.to_vec())
}

fn emit_model_geometry_beat(
    args: &ModelGeometryArgs,
    beat_emit_url: &str,
    artifacts: &RunArtifacts,
    duration_ms: u64,
    error: Option<&str>,
) -> Result<()> {
    let worker_base = beat_emit_url
        .trim_end_matches('/')
        .trim_end_matches("/feed/beats");
    let pair_verdicts: Vec<_> = artifacts
        .packet
        .results
        .iter()
        .map(|row| {
            json!({
                "pair_id": row.pair_id,
                "verdict": row.verdict,
                "top_k_used": row.top_k_used,
                "effective_k": row.effective_k,
                "configuration_worst_best": row.configuration_space_left_vectors.worst_best_match,
                "configuration_subspace_min": row.configuration_space_left_vectors.min_principal_angle_cosine,
            })
        })
        .collect();
    let mut metrics = json!({
        "schema": artifacts.packet.schema,
        "run_id": artifacts.packet.run_id,
        "hypothesis_id": args.hypothesis_id,
        "campaign_id": args.campaign_id,
        "cell_id": args.cell_id,
        "row_id": args.row_id,
        "mlip_id": args.mlip_id,
        "variant_id": args.variant_id,
        "fixture_url": args.fixture_url,
        "input": &artifacts.packet.input,
        "protocol": &artifacts.packet.protocol,
        "dataset": &artifacts.packet.dataset,
        "overall": &artifacts.packet.overall,
        "pairs": pair_verdicts,
        "output": artifacts.output.display().to_string(),
        "markdown": artifacts.markdown.display().to_string(),
        "speed": {
            "score": rows_per_second(&artifacts.packet, duration_ms),
            "unit": "rows_per_second_evaluator",
            "duration_ms": duration_ms,
        },
        "accuracy": model_geometry_accuracy(&artifacts.packet),
    });
    if let Some(error) = error {
        metrics["error"] = json!(error);
    }
    let hypothesis = args.hypothesis_id.as_deref().unwrap_or("unbound");
    let summary = format!(
        "model-geometry[{hypothesis}]: overall={} pairs={} mode={:?} gate={}",
        artifacts.packet.overall.verdict,
        artifacts.packet.overall.n_pairs,
        artifacts.packet.protocol.mode,
        artifacts.packet.protocol.quality_gate,
    );
    block_on(emit_beat_async(
        worker_base,
        "atlas-distill",
        &summary,
        Some(metrics),
        None,
        false,
    ))
}

fn emit_model_geometry_failure_beat(
    args: &ModelGeometryArgs,
    beat_emit_url: &str,
    err: &anyhow::Error,
) -> Result<()> {
    let worker_base = beat_emit_url
        .trim_end_matches('/')
        .trim_end_matches("/feed/beats");
    let hypothesis = args.hypothesis_id.as_deref().unwrap_or("unbound");
    let summary = format!("model-geometry[{hypothesis}]: failed: {err}");
    block_on(emit_beat_async(
        worker_base,
        "atlas-distill",
        &summary,
        Some(json!({
            "hypothesis_id": args.hypothesis_id,
            "campaign_id": args.campaign_id,
            "cell_id": args.cell_id,
            "row_id": args.row_id,
            "mlip_id": args.mlip_id,
            "variant_id": args.variant_id,
            "fixture_url": args.fixture_url,
            "command": "model-geometry",
            "error": err.to_string(),
        })),
        None,
        false,
    ))
}

fn rows_per_second(packet: &EvidencePacket, duration_ms: u64) -> f64 {
    if duration_ms == 0 {
        return packet.dataset.n_raw_records as f64;
    }
    packet.dataset.n_raw_records as f64 / (duration_ms as f64 / 1000.0)
}

fn model_geometry_accuracy(packet: &EvidencePacket) -> serde_json::Value {
    let scores: Vec<f64> = packet
        .results
        .iter()
        .map(|row| {
            row.configuration_space_left_vectors.worst_best_match.min(
                row.configuration_space_left_vectors
                    .min_principal_angle_cosine,
            )
        })
        .filter(|value| value.is_finite())
        .collect();
    let score = if scores.is_empty() {
        None
    } else {
        Some(scores.iter().sum::<f64>() / scores.len() as f64)
    };
    json!({
        "score": score,
        "unit": "mean_configuration_alignment",
        "overall_verdict": packet.overall.verdict,
    })
}

fn parse_requested_mode(value: &str) -> Result<RequestedMode> {
    match value.trim().to_ascii_lowercase().as_str() {
        "auto" => Ok(RequestedMode::Auto),
        "reference" | "residual" => Ok(RequestedMode::Reference),
        "prediction" | "model" | "geometry" => Ok(RequestedMode::Prediction),
        other => Err(anyhow!(
            "unknown --mode {other}; expected auto, reference, prediction"
        )),
    }
}

fn parse_quality_gate(value: &str) -> Result<QualityGate> {
    match value.trim().to_ascii_lowercase().as_str() {
        "none" => Ok(QualityGate::None),
        "fit" => Ok(QualityGate::Fit),
        "physics" | "fit+physics" | "fit_born" | "fit+born" => Ok(QualityGate::Physics),
        "accuracy" | "fit+accuracy" | "fit_accuracy" => Ok(QualityGate::Accuracy),
        other => Err(anyhow!(
            "unknown --quality-gate {other}; expected none, fit, physics, accuracy"
        )),
    }
}

fn input_format(path: &Path, bytes: &[u8]) -> String {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    if ext == "json" || bytes.first().is_some_and(|b| *b == b'{' || *b == b'[') {
        "json".to_string()
    } else {
        "csv".to_string()
    }
}

fn parse_input(path: &Path, bytes: &[u8]) -> Result<Vec<InputRecord>> {
    if input_format(path, bytes) == "json" {
        parse_json_input(bytes)
    } else {
        parse_csv_input(bytes)
    }
}

fn parse_json_input(bytes: &[u8]) -> Result<Vec<InputRecord>> {
    match serde_json::from_slice::<JsonInput>(bytes) {
        Ok(wrapper) => {
            let dataset_id = wrapper.dataset_id;
            Ok(wrapper
                .records
                .into_iter()
                .map(|mut record| {
                    if record.dataset_id.is_none() {
                        record.dataset_id = dataset_id.clone();
                    }
                    record
                })
                .collect())
        }
        Err(_) => serde_json::from_slice::<Vec<InputRecord>>(bytes)
            .context("parse JSON as {records:[...]} or [...]"),
    }
}

fn parse_csv_input(bytes: &[u8]) -> Result<Vec<InputRecord>> {
    let text = std::str::from_utf8(bytes).context("CSV input must be UTF-8")?;
    let mut lines = text.lines().filter(|line| {
        let trimmed = line.trim();
        !trimmed.is_empty() && !trimmed.starts_with('#')
    });
    let header = lines.next().ok_or_else(|| anyhow!("CSV input is empty"))?;
    let columns: Vec<String> = split_csv_line(header)
        .into_iter()
        .map(|col| col.trim().to_ascii_lowercase())
        .collect();
    let col_index: BTreeMap<String, usize> = columns
        .iter()
        .enumerate()
        .map(|(idx, name)| (name.clone(), idx))
        .collect();
    for required in ["config_id", "model_id", "feature", "predicted"] {
        if !col_index.contains_key(required) {
            bail!("CSV header missing required column {required}");
        }
    }

    let mut records = Vec::new();
    for (line_no, line) in lines.enumerate() {
        let fields = split_csv_line(line);
        let get = |name: &str| -> Option<&str> {
            col_index
                .get(name)
                .and_then(|idx| fields.get(*idx))
                .map(|value| value.trim())
                .filter(|value| !value.is_empty())
        };
        let required_string = |name: &str| -> Result<String> {
            get(name)
                .map(ToOwned::to_owned)
                .ok_or_else(|| anyhow!("line {} missing {name}", line_no + 2))
        };
        let predicted = parse_f64(get("predicted"), "predicted", line_no + 2)?
            .ok_or_else(|| anyhow!("line {} missing predicted", line_no + 2))?;
        records.push(InputRecord {
            dataset_id: get("dataset_id").map(ToOwned::to_owned),
            config_id: required_string("config_id")?,
            model_id: required_string("model_id")?,
            feature: required_string("feature")?,
            predicted,
            reference: parse_f64(get("reference"), "reference", line_no + 2)?,
            weight: parse_f64(get("weight"), "weight", line_no + 2)?,
            source_id: get("source_id").map(ToOwned::to_owned),
            quality_pass: parse_bool(get("quality_pass"), "quality_pass", line_no + 2)?,
            fit_ok: parse_bool(get("fit_ok"), "fit_ok", line_no + 2)?,
            physics_stable: parse_bool(get("physics_stable"), "physics_stable", line_no + 2)?,
            born_stable: parse_bool(get("born_stable"), "born_stable", line_no + 2)?,
            mode_r2: parse_f64(get("mode_r2"), "mode_r2", line_no + 2)?,
            abs_pct_error: parse_f64(get("abs_pct_error"), "abs_pct_error", line_no + 2)?,
        });
    }
    Ok(records)
}

fn split_csv_line(line: &str) -> Vec<&str> {
    line.split(',')
        .map(|field| field.trim().trim_matches('"'))
        .collect()
}

fn parse_f64(value: Option<&str>, name: &str, line_no: usize) -> Result<Option<f64>> {
    value
        .map(|raw| {
            raw.parse::<f64>()
                .with_context(|| format!("line {line_no} invalid {name}: {raw}"))
        })
        .transpose()
}

fn parse_bool(value: Option<&str>, name: &str, line_no: usize) -> Result<Option<bool>> {
    value
        .map(|raw| match raw.to_ascii_lowercase().as_str() {
            "true" | "1" | "yes" | "y" | "pass" | "ok" => Ok(true),
            "false" | "0" | "no" | "n" | "fail" | "bad" => Ok(false),
            _ => Err(anyhow!("line {line_no} invalid {name}: {raw}")),
        })
        .transpose()
}

fn build_dataset(records: Vec<InputRecord>) -> Result<Dataset> {
    if records.is_empty() {
        bail!("input contains no records");
    }
    let n_raw_records = records.len();
    let mut accum: HashMap<PointKey, AccumPoint> = HashMap::new();
    let mut models = BTreeSet::new();
    let mut configs = BTreeSet::new();
    let mut features = BTreeSet::new();
    let mut dataset_id = None;

    for record in records {
        if !record.predicted.is_finite() {
            continue;
        }
        dataset_id = dataset_id.or_else(|| record.dataset_id.clone());
        models.insert(record.model_id.clone());
        configs.insert(record.config_id.clone());
        features.insert(record.feature.clone());
        let key = PointKey {
            model_id: record.model_id,
            config_id: record.config_id,
            feature: record.feature,
        };
        let point = accum.entry(key).or_insert_with(|| AccumPoint {
            dataset_id: record.dataset_id.clone(),
            source_id: record.source_id.clone(),
            predicted_sum: 0.0,
            reference_sum: 0.0,
            reference_count: 0,
            weight_sum: 0.0,
            n: 0,
            quality_pass: None,
            fit_ok: None,
            physics_stable: None,
            mode_r2_min: None,
            abs_pct_error_sum: 0.0,
            abs_pct_error_count: 0,
        });
        point.predicted_sum += record.predicted;
        if let Some(reference) = record.reference.filter(|value| value.is_finite()) {
            point.reference_sum += reference;
            point.reference_count += 1;
        }
        point.weight_sum += record.weight.unwrap_or(1.0).max(0.0);
        point.n += 1;
        point.quality_pass = combine_bool(point.quality_pass, record.quality_pass);
        point.fit_ok = combine_bool(point.fit_ok, record.fit_ok);
        let physics = record.physics_stable.or(record.born_stable);
        point.physics_stable = combine_bool(point.physics_stable, physics);
        if let Some(mode_r2) = record.mode_r2.filter(|value| value.is_finite()) {
            point.mode_r2_min = Some(point.mode_r2_min.map_or(mode_r2, |old| old.min(mode_r2)));
        }
        if let Some(abs_pct_error) = record.abs_pct_error.filter(|value| value.is_finite()) {
            point.abs_pct_error_sum += abs_pct_error.abs();
            point.abs_pct_error_count += 1;
        }
    }

    let points = accum
        .into_iter()
        .map(|(key, point)| {
            let reference = if point.reference_count > 0 {
                Some(point.reference_sum / point.reference_count as f64)
            } else {
                None
            };
            let abs_pct_error = if point.abs_pct_error_count > 0 {
                Some(point.abs_pct_error_sum / point.abs_pct_error_count as f64)
            } else {
                reference.map(|reference| {
                    if reference.abs() > 1e-12 {
                        ((point.predicted_sum / point.n as f64) / reference - 1.0).abs() * 100.0
                    } else {
                        f64::INFINITY
                    }
                })
            };
            (
                key,
                GeometryPoint {
                    dataset_id: point.dataset_id,
                    source_id: point.source_id,
                    predicted: point.predicted_sum / point.n as f64,
                    reference,
                    weight: if point.weight_sum > 0.0 {
                        point.weight_sum / point.n as f64
                    } else {
                        1.0
                    },
                    n: point.n,
                    quality_pass: point.quality_pass,
                    fit_ok: point.fit_ok,
                    physics_stable: point.physics_stable,
                    mode_r2: point.mode_r2_min,
                    abs_pct_error,
                },
            )
        })
        .collect();

    Ok(Dataset {
        points,
        models,
        configs,
        features,
        n_raw_records,
        dataset_id,
    })
}

fn combine_bool(old: Option<bool>, new: Option<bool>) -> Option<bool> {
    match (old, new) {
        (Some(a), Some(b)) => Some(a && b),
        (Some(a), None) => Some(a),
        (None, Some(b)) => Some(b),
        (None, None) => None,
    }
}

fn resolve_mode(requested: RequestedMode, dataset: &Dataset) -> Result<AnalysisMode> {
    match requested {
        RequestedMode::Reference => {
            if dataset
                .points
                .values()
                .all(|point| point.reference.is_some())
            {
                Ok(AnalysisMode::Reference)
            } else {
                bail!("--mode reference requires every aggregated point to have reference");
            }
        }
        RequestedMode::Prediction => Ok(AnalysisMode::Prediction),
        RequestedMode::Auto => {
            if dataset
                .points
                .values()
                .all(|point| point.reference.is_some())
            {
                Ok(AnalysisMode::Reference)
            } else {
                Ok(AnalysisMode::Prediction)
            }
        }
    }
}

fn resolve_pairs(raw_pairs: &[String], dataset: &Dataset) -> Result<Vec<PairSpec>> {
    if raw_pairs.is_empty() {
        let models: Vec<String> = dataset.models.iter().cloned().collect();
        let mut pairs = Vec::new();
        for i in 0..models.len() {
            for j in (i + 1)..models.len() {
                pairs.push(PairSpec {
                    from_model: models[i].clone(),
                    to_model: models[j].clone(),
                });
            }
        }
        if pairs.is_empty() {
            bail!("need at least two models or an explicit --pair");
        }
        return Ok(pairs);
    }

    raw_pairs
        .iter()
        .map(|raw| {
            let (from_model, to_model) = raw
                .split_once(':')
                .ok_or_else(|| anyhow!("pair must be formatted from_model:to_model, got {raw}"))?;
            if !dataset.models.contains(from_model) {
                bail!("pair references unknown model {from_model}");
            }
            if !dataset.models.contains(to_model) {
                bail!("pair references unknown model {to_model}");
            }
            Ok(PairSpec {
                from_model: from_model.to_string(),
                to_model: to_model.to_string(),
            })
        })
        .collect()
}

fn build_pair_matrices(
    dataset: &Dataset,
    pair: &PairSpec,
    mode: AnalysisMode,
    quality_gate: QualityGate,
    accuracy_max_pct: f64,
) -> Result<PairMatrices> {
    let features: Vec<String> = dataset.features.iter().cloned().collect();
    let mut row_ids = Vec::new();
    let mut from_values = Vec::new();
    let mut to_values = Vec::new();
    let mut dropped_rows = 0;

    for config_id in &dataset.configs {
        let mut from_row = Vec::with_capacity(features.len());
        let mut to_row = Vec::with_capacity(features.len());
        let mut complete = true;
        for feature in &features {
            let from_key = PointKey {
                model_id: pair.from_model.clone(),
                config_id: config_id.clone(),
                feature: feature.clone(),
            };
            let to_key = PointKey {
                model_id: pair.to_model.clone(),
                config_id: config_id.clone(),
                feature: feature.clone(),
            };
            let Some(from_point) = dataset.points.get(&from_key) else {
                complete = false;
                break;
            };
            let Some(to_point) = dataset.points.get(&to_key) else {
                complete = false;
                break;
            };
            if !point_passes(from_point, quality_gate, accuracy_max_pct)
                || !point_passes(to_point, quality_gate, accuracy_max_pct)
            {
                complete = false;
                break;
            }
            let Some(from_value) = matrix_value(from_point, mode) else {
                complete = false;
                break;
            };
            let Some(to_value) = matrix_value(to_point, mode) else {
                complete = false;
                break;
            };
            from_row.push(from_value);
            to_row.push(to_value);
        }
        if complete {
            row_ids.push(config_id.clone());
            from_values.extend(from_row);
            to_values.extend(to_row);
        } else {
            dropped_rows += 1;
        }
    }

    if row_ids.len() < 2 {
        bail!(
            "pair {}:{} has fewer than two complete rows after quality gate",
            pair.from_model,
            pair.to_model
        );
    }
    if features.is_empty() {
        bail!("input has no features");
    }

    Ok(PairMatrices {
        from: DMatrix::from_row_slice(row_ids.len(), features.len(), &from_values),
        to: DMatrix::from_row_slice(row_ids.len(), features.len(), &to_values),
        row_ids,
        features,
        dropped_rows,
    })
}

fn point_passes(point: &GeometryPoint, gate: QualityGate, accuracy_max_pct: f64) -> bool {
    match gate {
        QualityGate::None => true,
        QualityGate::Fit => {
            point.quality_pass.unwrap_or(true)
                && point.fit_ok.unwrap_or(true)
                && point.mode_r2.unwrap_or(1.0) >= 0.95
        }
        QualityGate::Physics => {
            point.quality_pass.unwrap_or(true)
                && point.fit_ok.unwrap_or(true)
                && point.mode_r2.unwrap_or(1.0) >= 0.95
                && point.physics_stable.unwrap_or(true)
        }
        QualityGate::Accuracy => {
            point.quality_pass.unwrap_or(true)
                && point.fit_ok.unwrap_or(true)
                && point.mode_r2.unwrap_or(1.0) >= 0.95
                && point.physics_stable.unwrap_or(true)
                && point
                    .abs_pct_error
                    .map(|error| error <= accuracy_max_pct)
                    .unwrap_or(true)
        }
    }
}

fn matrix_value(point: &GeometryPoint, mode: AnalysisMode) -> Option<f64> {
    match mode {
        AnalysisMode::Prediction => Some(point.predicted),
        AnalysisMode::Reference => {
            let reference = point.reference?;
            let scale = reference.abs().max(1e-12);
            Some((point.predicted - reference) / scale)
        }
    }
}

fn analyze_pair(
    pair: &PairSpec,
    matrices: PairMatrices,
    mode: AnalysisMode,
    top_k: usize,
    rank_floor: f64,
) -> Result<PairResult> {
    let from_basis = svd_basis(&matrices.from);
    let to_basis = svd_basis(&matrices.to);
    let k = top_k
        .min(from_basis.left.ncols())
        .min(to_basis.left.ncols())
        .min(from_basis.feature.ncols())
        .min(to_basis.feature.ncols());
    if k == 0 {
        bail!(
            "pair {}:{} has no singular directions",
            pair.from_model,
            pair.to_model
        );
    }

    let from_left = from_basis.left.columns(0, k).into_owned();
    let to_left = to_basis.left.columns(0, k).into_owned();
    let from_feature = from_basis.feature.columns(0, k).into_owned();
    let to_feature = to_basis.feature.columns(0, k).into_owned();
    let config_cmp = compare_bases(&from_left, &to_left);
    let feature_cmp = compare_bases(&from_feature, &to_feature);
    let effective_k = top_k
        .min(effective_k(&from_basis.singular_values, rank_floor))
        .min(effective_k(&to_basis.singular_values, rank_floor));
    let verdict = verdict(mode, k, effective_k, &config_cmp, top_k);

    Ok(PairResult {
        pair_id: format!("{}->{}", pair.from_model, pair.to_model),
        from_model: pair.from_model.clone(),
        to_model: pair.to_model.clone(),
        verdict,
        mode,
        matrix_shape: [matrices.from.nrows(), matrices.from.ncols()],
        dropped_incomplete_rows: matrices.dropped_rows,
        row_ids: matrices.row_ids,
        features: matrices.features,
        top_k_requested: top_k,
        top_k_used: k,
        from_rank: from_basis.rank,
        to_rank: to_basis.rank,
        effective_k,
        from_singular_values: from_basis.singular_values.into_iter().take(k).collect(),
        to_singular_values: to_basis.singular_values.into_iter().take(k).collect(),
        configuration_space_left_vectors: config_cmp,
        feature_space_vectors: feature_cmp,
    })
}

fn svd_basis(matrix: &DMatrix<f64>) -> Basis {
    let centered = center_columns(matrix);
    let svd = SVD::new(centered, true, true);
    let singular_values: Vec<f64> = svd.singular_values.iter().copied().collect();
    let rank = numerical_rank(&singular_values);
    let left = svd.u.unwrap_or_else(|| DMatrix::zeros(matrix.nrows(), 0));
    let feature = svd
        .v_t
        .map(|vt| vt.transpose())
        .unwrap_or_else(|| DMatrix::zeros(matrix.ncols(), 0));
    Basis {
        left,
        feature,
        singular_values,
        rank,
    }
}

fn center_columns(matrix: &DMatrix<f64>) -> DMatrix<f64> {
    let means: Vec<f64> = (0..matrix.ncols())
        .map(|col| matrix.column(col).iter().sum::<f64>() / matrix.nrows() as f64)
        .collect();
    DMatrix::from_fn(matrix.nrows(), matrix.ncols(), |row, col| {
        matrix[(row, col)] - means[col]
    })
}

fn numerical_rank(singular_values: &[f64]) -> usize {
    if singular_values.is_empty() {
        return 0;
    }
    let floor = (singular_values[0].abs() * 1e-10).max(1e-12);
    singular_values
        .iter()
        .filter(|value| value.abs() >= floor)
        .count()
}

fn effective_k(singular_values: &[f64], floor_ratio: f64) -> usize {
    if singular_values.is_empty() || singular_values[0] <= 0.0 {
        return 0;
    }
    let floor = singular_values[0] * floor_ratio;
    singular_values
        .iter()
        .filter(|value| **value >= floor)
        .count()
}

fn compare_bases(a: &DMatrix<f64>, b: &DMatrix<f64>) -> BasisComparison {
    let cos = (a.transpose() * b).map(|value| value.abs());
    let mut best_a = Vec::with_capacity(cos.nrows());
    let mut best_b = Vec::with_capacity(cos.ncols());
    for row in 0..cos.nrows() {
        best_a.push(
            (0..cos.ncols())
                .map(|col| cos[(row, col)])
                .fold(0.0, f64::max),
        );
    }
    for col in 0..cos.ncols() {
        best_b.push(
            (0..cos.nrows())
                .map(|row| cos[(row, col)])
                .fold(0.0, f64::max),
        );
    }

    let subspace = SVD::new(a.transpose() * b, false, false);
    let principal_angle_cosines: Vec<f64> = subspace.singular_values.iter().copied().collect();
    let min_principal_angle_cosine = principal_angle_cosines
        .iter()
        .copied()
        .fold(f64::INFINITY, f64::min);

    let mut all_best = best_a.clone();
    all_best.extend(best_b.iter().copied());
    let worst_best_match = all_best.iter().copied().fold(f64::INFINITY, f64::min);
    let mean_best_match = all_best.iter().sum::<f64>() / all_best.len() as f64;
    BasisComparison {
        k: a.ncols(),
        cosine_matrix: matrix_to_rows(&cos),
        best_match_from_first: best_a,
        best_match_from_second: best_b,
        worst_best_match,
        mean_best_match,
        principal_angle_cosines,
        min_principal_angle_cosine,
    }
}

fn matrix_to_rows(matrix: &DMatrix<f64>) -> Vec<Vec<f64>> {
    (0..matrix.nrows())
        .map(|row| (0..matrix.ncols()).map(|col| matrix[(row, col)]).collect())
        .collect()
}

fn verdict(
    mode: AnalysisMode,
    k: usize,
    effective_k: usize,
    config_cmp: &BasisComparison,
    top_k: usize,
) -> String {
    if mode == AnalysisMode::Prediction {
        return "geometry_only".to_string();
    }
    if k < top_k {
        return "invalid_rank".to_string();
    }
    if effective_k < top_k {
        return "underpowered_effective_rank".to_string();
    }
    if config_cmp.worst_best_match < FALSIFICATION_THRESHOLD {
        return "falsified".to_string();
    }
    if config_cmp.worst_best_match >= PASS_THRESHOLD
        && config_cmp.min_principal_angle_cosine >= PASS_THRESHOLD
    {
        return "pass".to_string();
    }
    "inconclusive".to_string()
}

fn dataset_evidence(dataset: &Dataset) -> DatasetEvidence {
    let reference_count = dataset
        .points
        .values()
        .filter(|point| point.reference.is_some())
        .count();
    DatasetEvidence {
        dataset_id: dataset.dataset_id.clone(),
        n_raw_records: dataset.n_raw_records,
        n_aggregated_points: dataset.points.len(),
        n_models: dataset.models.len(),
        n_configs: dataset.configs.len(),
        n_features: dataset.features.len(),
        models: dataset.models.iter().cloned().collect(),
        features: dataset.features.iter().cloned().collect(),
        reference_coverage: reference_count as f64 / dataset.points.len().max(1) as f64,
    }
}

fn overall(results: &[PairResult]) -> OverallEvidence {
    let count = |verdict: &str| results.iter().filter(|row| row.verdict == verdict).count();
    let n_pass = count("pass");
    let n_falsified = count("falsified");
    let n_inconclusive = count("inconclusive");
    let n_invalid_rank = count("invalid_rank");
    let n_underpowered_effective_rank = count("underpowered_effective_rank");
    let n_geometry_only = count("geometry_only");
    let verdict = if n_falsified > 0 {
        "falsified"
    } else if n_pass == results.len() && !results.is_empty() {
        "pass"
    } else if n_underpowered_effective_rank == results.len() && !results.is_empty() {
        "underpowered_effective_rank"
    } else if n_geometry_only == results.len() && !results.is_empty() {
        "geometry_only"
    } else if n_invalid_rank == results.len() && !results.is_empty() {
        "invalid_rank"
    } else {
        "mixed"
    };
    OverallEvidence {
        n_pairs: results.len(),
        n_pass,
        n_falsified,
        n_inconclusive,
        n_invalid_rank,
        n_underpowered_effective_rank,
        n_geometry_only,
        verdict: verdict.to_string(),
    }
}

fn value_definition(mode: AnalysisMode) -> String {
    match mode {
        AnalysisMode::Reference => {
            "(predicted - reference) / max(abs(reference), 1e-12)".to_string()
        }
        AnalysisMode::Prediction => {
            "centered predicted values; model-geometry probe only, not reference-grounded"
                .to_string()
        }
    }
}

fn default_json_output(input: &Path) -> PathBuf {
    let stem = input
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("model_geometry");
    input.with_file_name(format!("{stem}_model_geometry_evidence.json"))
}

fn sha256_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    format!("{:x}", hasher.finalize())
}

fn unix_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
}

fn render_markdown(packet: &EvidencePacket) -> String {
    let mut lines = vec![
        "# Model Geometry Evidence".to_string(),
        String::new(),
        format!("Run: `{}`", packet.run_id),
        format!("Input: `{}`", packet.input.path),
        format!("Mode: `{:?}`", packet.protocol.mode).to_lowercase(),
        format!("Quality gate: `{}`", packet.protocol.quality_gate),
        String::new(),
        "## Dataset".to_string(),
        String::new(),
        format!(
            "- records: {} raw, {} aggregated",
            packet.dataset.n_raw_records, packet.dataset.n_aggregated_points
        ),
        format!(
            "- shape: {} models x {} configurations x {} features",
            packet.dataset.n_models, packet.dataset.n_configs, packet.dataset.n_features
        ),
        format!("- reference coverage: {:.1}%", packet.dataset.reference_coverage * 100.0),
        String::new(),
        "## Pairwise Geometry".to_string(),
        String::new(),
        "| pair | verdict | rows x features | rank | k | eff k | config worst-best | config subspace min | feature worst-best |".to_string(),
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|".to_string(),
    ];
    for row in &packet.results {
        lines.push(format!(
            "| {} | {} | {}x{} | {} | {} | {} | {:.3} | {:.3} | {:.3} |",
            row.pair_id,
            row.verdict,
            row.matrix_shape[0],
            row.matrix_shape[1],
            row.from_rank.min(row.to_rank),
            row.top_k_used,
            row.effective_k,
            row.configuration_space_left_vectors.worst_best_match,
            row.configuration_space_left_vectors
                .min_principal_angle_cosine,
            row.feature_space_vectors.worst_best_match
        ));
    }
    lines.extend([
        String::new(),
        format!("Overall verdict: `{}`", packet.overall.verdict),
        String::new(),
        "The primary P2-style score is the configuration-space left-singular-vector match. Prediction mode is geometry-only; reference mode is the grounded residual path."
            .to_string(),
        String::new(),
    ]);
    lines.join("\n")
}

fn print_short_summary(packet: &EvidencePacket) {
    eprintln!(
        "model-geometry: {} pairs, overall={}",
        packet.overall.n_pairs, packet.overall.verdict
    );
    for row in &packet.results {
        eprintln!(
            "  {}: {} k={} eff_k={} worst={:.3}",
            row.pair_id,
            row.verdict,
            row.top_k_used,
            row.effective_k,
            row.configuration_space_left_vectors.worst_best_match
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rec(
        config: &str,
        model: &str,
        feature: &str,
        predicted: f64,
        reference: f64,
    ) -> InputRecord {
        InputRecord {
            dataset_id: Some("test".to_string()),
            config_id: config.to_string(),
            model_id: model.to_string(),
            feature: feature.to_string(),
            predicted,
            reference: Some(reference),
            weight: None,
            source_id: None,
            quality_pass: Some(true),
            fit_ok: Some(true),
            physics_stable: Some(true),
            born_stable: None,
            mode_r2: Some(0.99),
            abs_pct_error: None,
        }
    }

    #[test]
    fn parses_tidy_csv() {
        let csv = b"config_id,model_id,feature,predicted,reference\nc1,m0,e,101,100\n";
        let records = parse_csv_input(csv).unwrap();
        assert_eq!(records.len(), 1);
        assert_eq!(records[0].config_id, "c1");
        assert_eq!(records[0].reference, Some(100.0));
    }

    #[test]
    fn builds_reference_residual_matrix() {
        let records = vec![
            rec("c1", "m0", "e", 101.0, 100.0),
            rec("c1", "m0", "f", 98.0, 100.0),
            rec("c2", "m0", "e", 102.0, 100.0),
            rec("c2", "m0", "f", 99.0, 100.0),
            rec("c1", "m1", "e", 100.5, 100.0),
            rec("c1", "m1", "f", 98.5, 100.0),
            rec("c2", "m1", "e", 101.5, 100.0),
            rec("c2", "m1", "f", 99.5, 100.0),
        ];
        let dataset = build_dataset(records).unwrap();
        let pair = PairSpec {
            from_model: "m0".to_string(),
            to_model: "m1".to_string(),
        };
        let matrices = build_pair_matrices(
            &dataset,
            &pair,
            AnalysisMode::Reference,
            QualityGate::Accuracy,
            100.0,
        )
        .unwrap();
        assert_eq!(matrices.from.nrows(), 2);
        assert_eq!(matrices.from.ncols(), 2);
        assert!((matrices.from[(0, 0)] - 0.01).abs() < 1e-12);
    }
}
