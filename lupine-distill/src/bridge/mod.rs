//! DSPy Bridge — subprocess JSON protocol for LLM reasoning.
//!
//! Calls out to `lupine-dspy` via subprocess, passing JSON on stdin
//! and reading JSON from stdout. This keeps all LLM logic in Python
//! while Rust owns all data and statistical truth.

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
pub fn call(request: &BridgeRequest) -> Result<BridgeResponse> {
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
pub fn is_available() -> bool {
    find_dspy_dir().is_ok() && Command::new("python")
        .args(["--version"])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}
