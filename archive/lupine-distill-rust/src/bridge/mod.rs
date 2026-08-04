//! DSPy Bridge — subprocess JSON protocol for LLM reasoning.
//!
//! Calls out to `lupine-dspy` via subprocess, passing JSON on stdin
//! and reading JSON from stdout. This keeps all LLM logic in Python
//! while Rust owns all data and statistical truth.
//!
//! Set `DISTILL_BRIDGE_MOCK=1` to enable offline mock mode, which
//! returns deterministic synthetic responses without spawning Python.

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::process::{Command, Stdio};

/// A request to the DSPy reasoning layer.
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "command")]
pub enum BridgeRequest {
    /// Generate hypotheses from data context
    #[serde(rename = "theorize")]
    Theorize {
        element: String,
        data_summary: serde_json::Value,
        existing_hypotheses: Vec<String>,
    },

    /// Analyze causal structure
    #[serde(rename = "analyze")]
    Analyze {
        element: String,
        error_vectors: serde_json::Value,
        correlations: serde_json::Value,
    },

    /// Design experiments to test a hypothesis
    #[serde(rename = "design")]
    Design {
        hypothesis_id: String,
        hypothesis_text: String,
        available_elements: Vec<String>,
        available_pair_styles: Vec<String>,
    },

    /// Mine a paper for benchmark values
    #[serde(rename = "mine")]
    Mine {
        title: String,
        abstract_text: String,
        doi: Option<String>,
    },
}

/// Response from the DSPy reasoning layer.
#[derive(Debug, Clone, Deserialize)]
pub struct BridgeResponse {
    pub success: bool,
    pub command: String,
    #[serde(default)]
    pub data: serde_json::Value,
    #[serde(default)]
    pub error: Option<String>,
}

/// Check if mock mode is enabled via `DISTILL_BRIDGE_MOCK=1`.
fn is_mock() -> bool {
    std::env::var("DISTILL_BRIDGE_MOCK")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false)
}

/// Generate a deterministic mock response for a given request.
/// This enables testing the full `theorize → persist` pipeline
/// without requiring a Python subprocess or LLM API access.
fn mock_call(request: &BridgeRequest) -> Result<BridgeResponse> {
    let (command, data) = match request {
        BridgeRequest::Theorize { element, .. } => {
            let hyp_id = format!("HYP-MOCK-{}", element.to_ascii_uppercase());
            (
                "theorize".to_string(),
                serde_json::json!({
                    "hypothesis_id": hyp_id,
                    "type": "manifold",
                    "title": format!("Mock Hypothesis: {} Error Manifold Structure", element),
                    "description": format!(
                        "Synthetic hypothesis for {} generated in mock mode. \
                         The error manifold for {} interatomic potentials exhibits \
                         low-dimensional ribbon geometry consistent with parameter-count \
                         constraints on the functional form.",
                        element, element,
                    ),
                    "testable_prediction": format!(
                        "Participation ratio PR < 2.0 for {} error vectors grouped by pair_style.",
                        element,
                    ),
                    "confidence": 0.5,
                    "reasoning": "Mock mode — no LLM reasoning was performed.",
                }),
            )
        }
        BridgeRequest::Analyze { element, .. } => (
            "analyze".to_string(),
            serde_json::json!({
                "summary": format!("Mock analysis for {}. No causal structure computed.", element),
                "confounders": [],
            }),
        ),
        BridgeRequest::Design { hypothesis_id, .. } => (
            "design".to_string(),
            serde_json::json!({
                "experiments": [{
                    "hypothesis_id": hypothesis_id,
                    "description": "Mock experiment — run manifold analysis with bootstrap CI.",
                    "element": "Al",
                    "pair_style": "eam/alloy",
                }],
            }),
        ),
        BridgeRequest::Mine { title, doi, .. } => (
            "mine".to_string(),
            serde_json::json!({
                "records": [],
                "paper_title": title,
                "doi": doi,
                "note": "Mock mode — no records extracted.",
            }),
        ),
    };

    eprintln!("[bridge:mock] {} → deterministic response", command);

    Ok(BridgeResponse {
        success: true,
        command,
        data,
        error: None,
    })
}

/// Location of the lupine-dspy Python module.
fn find_dspy_dir() -> Result<std::path::PathBuf> {
    // Look relative to the distill binary
    let candidates = [
        std::path::PathBuf::from("../lupine-dspy"),
        std::path::PathBuf::from("../../lupine-dspy"),
        std::path::PathBuf::from("./lupine-dspy"),
    ];

    for c in &candidates {
        if c.join("lupine_dspy").exists() {
            return Ok(c.clone());
        }
    }

    anyhow::bail!("Cannot find lupine-dspy directory. Run from the glim workspace root.");
}

/// Call the DSPy bridge and return the response.
///
/// If `DISTILL_BRIDGE_MOCK=1` is set, returns a deterministic synthetic
/// response without spawning a Python subprocess.
pub fn call(request: &BridgeRequest) -> Result<BridgeResponse> {
    if is_mock() {
        return mock_call(request);
    }

    let dspy_dir = find_dspy_dir()?;
    let input = serde_json::to_string(request)?;

    let mut child = Command::new("python")
        .args(["-m", "lupine_dspy.bridge"])
        .current_dir(&dspy_dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .context("Failed to spawn lupine-dspy bridge. Is Python available?")?;

    // Write request to stdin
    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(input.as_bytes())?;
        stdin.write_all(b"\n")?;
    }

    let output = child.wait_with_output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("DSPy bridge failed (exit {}): {}", output.status, stderr);
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    // Parse the last valid JSON line (skip any debug output)
    let response_line = stdout
        .lines()
        .rev()
        .find(|line| line.trim_start().starts_with('{'))
        .context("No JSON response from DSPy bridge")?;

    let response: BridgeResponse = serde_json::from_str(response_line)
        .with_context(|| format!("Failed to parse DSPy response: {}", response_line))?;

    Ok(response)
}

/// Check if the DSPy bridge is available (Python + lupine-dspy installed).
///
/// Returns `true` in mock mode regardless of Python availability.
pub fn is_available() -> bool {
    if is_mock() {
        return true;
    }
    find_dspy_dir().is_ok() && Command::new("python")
        .args(["--version"])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

