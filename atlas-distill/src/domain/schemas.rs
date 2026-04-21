use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OperatorStatus {
    Pending,
    Proved,
    Disproved,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RunProfile {
    Corpus,
    Distill,
    Formalize,
    Loop,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RunStatus {
    Success,
    Failed,
    Partial,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RiskLevel {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperatorPack {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub domain: String,
    pub input_features: Vec<String>,
    pub output_features: Vec<String>,
    pub formula: Option<String>,
    pub model_spec: Option<serde_json::Value>,
    pub numerical_evidence: Option<serde_json::Value>,
    pub proof_obligations: Vec<String>,
    pub proof_status: OperatorStatus,
    pub counter_examples: Vec<serde_json::Value>,
    pub authors: Vec<String>,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunManifest {
    pub run_id: String,
    pub profile: RunProfile,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub input_hashes: Vec<String>,
    pub output_hashes: Vec<String>,
    pub status: RunStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskEntry {
    pub id: String,
    pub risk: String,
    pub impact: RiskLevel,
    pub likelihood: RiskLevel,
    pub mitigation: String,
    pub owner: Option<String>,
}
