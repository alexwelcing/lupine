//! Multi-agent discovery ledger — the single source of truth for all agents.
//!
//! The ledger is an append-only JSONL file that all agents read from and write to.
//! Each record has provenance tracing back to either a LAMMPS computation,
//! a literature citation, an OpenKIM test, or an agent inference.

use serde::{Deserialize, Serialize};
use std::path::Path;

// ───────────────────────────────────────────────────────────
// Core Types
// ───────────────────────────────────────────────────────────

/// A single benchmark measurement: predicted vs reference for one property.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchmarkRecord {
    /// Unique record ID (agent_id + timestamp hash)
    pub record_id: String,
    /// NIST potential identifier
    pub potential_id: String,
    /// Short label for the potential (e.g. "Adams-1989")
    pub potential_label: String,
    /// LAMMPS pair_style
    pub pair_style: String,
    /// Element symbol (e.g. "Al", "Cu")
    pub element: String,
    /// Property name (e.g. "C11", "C12", "C44", "a0", "E_coh")
    pub property: String,
    /// Experimental reference value
    pub reference: f64,
    /// Predicted / extracted value
    pub predicted: f64,
    /// Unit string (e.g. "GPa", "Å", "eV/atom")
    pub unit: String,
    /// How this value was obtained
    pub provenance: Provenance,
    /// Which agent produced this record
    pub agent_id: String,
    /// ISO 8601 timestamp
    pub timestamp: String,
}

/// Provenance — how a benchmark value was obtained.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Provenance {
    /// Computed via LAMMPS simulation
    LammpsRun {
        run_id: String,
        lammps_version: String,
        input_hash: String,
        potential_file: String,
    },
    /// Extracted from a published paper
    LiteratureCitation {
        doi: String,
        context: String,
        extraction_method: String,
    },
    /// Retrieved from OpenKIM test result
    OpenKimTest { test_id: String, model_id: String },
    /// Inferred by an agent (e.g. interpolation, ML prediction)
    AgentInference {
        method: String,
        confidence: f64,
        basis: Vec<String>,
    },
    /// Hardcoded / synthetic benchmark data — NOT from any real computation.
    /// This provenance type explicitly marks data that was manually entered
    /// or generated for testing. It MUST NOT be treated as empirical evidence.
    SyntheticBenchmark { source: String, warning: String },
}

/// A discovery claim made by an agent.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentClaim {
    /// Unique claim ID
    pub claim_id: String,
    /// Which agent is making this claim
    pub agent_id: String,
    /// What type of claim
    pub claim_type: ClaimType,
    /// Record IDs that support this claim
    pub evidence_ids: Vec<String>,
    /// Agent's self-assessed confidence [0, 1]
    pub confidence: f64,
    /// Optional Lean 4 theorem name (if formalized)
    pub lean_theorem: Option<String>,
    /// Verification status
    pub status: ClaimStatus,
    /// ISO 8601 timestamp
    pub timestamp: String,
    /// Human-readable description
    pub description: String,
}

/// Types of scientific claims agents can make.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum ClaimType {
    /// Hyper-ribbon structure detected in error manifold
    HyperRibbonConfirmed {
        participation_ratio: f64,
        n_properties: usize,
        log_r_squared: f64,
    },
    /// Simpson's paradox detected in grouped data
    SimpsonsDetected {
        pooled_r: f64,
        within_group_r: f64,
        n_groups: usize,
        confounder: String,
    },
    /// Parameter-bound conjecture satisfied
    ParameterBoundSatisfied {
        observed_pr: f64,
        bound: f64,
        n_params: usize,
        n_observables: usize,
    },
    /// New mathematical relationship discovered
    NewCorrelation {
        x_quantity: String,
        y_quantity: String,
        model: String,
        r_squared: f64,
        equation: String,
    },
    /// A potential behaves anomalously compared to its family
    AnomalousPotential {
        potential_id: String,
        property: String,
        expected_range: (f64, f64),
        actual: f64,
    },
    /// Cross-validation discrepancy between literature and computation
    LiteratureComputationGap {
        potential_id: String,
        property: String,
        literature_value: f64,
        computed_value: f64,
        relative_error: f64,
    },
    /// Manifold evolution observation
    ManifoldEvolution {
        batch_id: String,
        pr_before: f64,
        pr_after: f64,
        n_entries_before: usize,
        n_entries_after: usize,
    },
    /// Universal alignment of principal error components across potentials
    UniversalAlignment {
        potential_a: String,
        potential_b: String,
        cosine_similarity: f64,
    },
    /// A batch of experiments was executed by the autoresearch loop.
    ExperimentBatch {
        n_experiments: usize,
        strategy: String,
    },
    /// A competing physical hypothesis generated to explain an observed pattern.
    PhysicalHypothesis {
        observation_claim_id: String,
        explanation: String,
        prediction: String,
        test_strategy: String,
    },
    /// Result of testing a physical hypothesis against experiment.
    HypothesisTested {
        hypothesis_claim_id: String,
        observation_claim_id: String,
        result_summary: String,
        supported: bool,
    },
}

/// Verification status for a claim.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ClaimStatus {
    /// Proposed by agent, not yet verified
    Proposed,
    /// Confirmed by another agent or formal proof
    Confirmed,
    /// Contradicted by evidence
    Refuted,
    /// Formally proven in Lean 4
    FormallyProven,
    /// Needs more data to decide
    Insufficient,
}

// ───────────────────────────────────────────────────────────
// Ledger
// ───────────────────────────────────────────────────────────

/// The discovery ledger — append-only persistent state for multi-agent coordination.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveryLedger {
    /// All benchmark records
    pub records: Vec<BenchmarkRecord>,
    /// All discovery claims
    pub claims: Vec<AgentClaim>,
}

impl DiscoveryLedger {
    /// Create an empty ledger.
    pub fn new() -> Self {
        Self {
            records: Vec::new(),
            claims: Vec::new(),
        }
    }

    /// Load from a directory containing `records.jsonl` and `claims.jsonl`.
    pub fn load(dir: &Path) -> Result<Self, LedgerError> {
        let records_path = dir.join("records.jsonl");
        let claims_path = dir.join("claims.jsonl");

        let records = if records_path.exists() {
            read_jsonl(&records_path)?
        } else {
            Vec::new()
        };

        let claims = if claims_path.exists() {
            read_jsonl(&claims_path)?
        } else {
            Vec::new()
        };

        Ok(Self { records, claims })
    }

    /// Save to a directory (overwrites existing files).
    pub fn save(&self, dir: &Path) -> Result<(), LedgerError> {
        std::fs::create_dir_all(dir).map_err(|e| LedgerError::Io(e.to_string()))?;

        write_jsonl(&dir.join("records.jsonl"), &self.records)?;
        write_jsonl(&dir.join("claims.jsonl"), &self.claims)?;

        Ok(())
    }

    /// Append a single record (also writes to disk immediately).
    pub fn append_record(
        &mut self,
        record: BenchmarkRecord,
        dir: &Path,
    ) -> Result<(), LedgerError> {
        append_jsonl_line(&dir.join("records.jsonl"), &record)?;
        self.records.push(record);
        Ok(())
    }

    /// Append a single claim (also writes to disk immediately).
    pub fn append_claim(&mut self, claim: AgentClaim, dir: &Path) -> Result<(), LedgerError> {
        append_jsonl_line(&dir.join("claims.jsonl"), &claim)?;
        self.claims.push(claim);
        Ok(())
    }

    /// Get all records for a specific element.
    pub fn records_for_element(&self, element: &str) -> Vec<&BenchmarkRecord> {
        self.records
            .iter()
            .filter(|r| r.element == element)
            .collect()
    }

    /// Get all records for a specific potential.
    pub fn records_for_potential(&self, potential_id: &str) -> Vec<&BenchmarkRecord> {
        self.records
            .iter()
            .filter(|r| r.potential_id == potential_id)
            .collect()
    }

    /// Get all records for a specific property.
    pub fn records_for_property(&self, property: &str) -> Vec<&BenchmarkRecord> {
        self.records
            .iter()
            .filter(|r| r.property == property)
            .collect()
    }

    /// Get all unconfirmed claims.
    pub fn pending_claims(&self) -> Vec<&AgentClaim> {
        self.claims
            .iter()
            .filter(|c| c.status == ClaimStatus::Proposed)
            .collect()
    }

    /// Count unique potentials with data.
    pub fn unique_potentials(&self) -> usize {
        let mut seen = std::collections::HashSet::new();
        for r in &self.records {
            seen.insert(&r.potential_id);
        }
        seen.len()
    }

    /// Count unique elements with data.
    pub fn unique_elements(&self) -> usize {
        let mut seen = std::collections::HashSet::new();
        for r in &self.records {
            seen.insert(&r.element);
        }
        seen.len()
    }

    /// Summary statistics.
    pub fn summary(&self) -> LedgerSummary {
        let mut by_agent: std::collections::HashMap<String, usize> =
            std::collections::HashMap::new();
        let mut by_provenance: std::collections::HashMap<String, usize> =
            std::collections::HashMap::new();
        for r in &self.records {
            *by_agent.entry(r.agent_id.clone()).or_default() += 1;
            let prov_type = match &r.provenance {
                Provenance::LammpsRun { .. } => "lammps",
                Provenance::LiteratureCitation { .. } => "literature",
                Provenance::OpenKimTest { .. } => "openkim",
                Provenance::AgentInference { .. } => "inference",
                Provenance::SyntheticBenchmark { .. } => "synthetic",
            };
            *by_provenance.entry(prov_type.to_string()).or_default() += 1;
        }

        LedgerSummary {
            total_records: self.records.len(),
            total_claims: self.claims.len(),
            unique_potentials: self.unique_potentials(),
            unique_elements: self.unique_elements(),
            confirmed_claims: self
                .claims
                .iter()
                .filter(|c| {
                    c.status == ClaimStatus::Confirmed || c.status == ClaimStatus::FormallyProven
                })
                .count(),
            refuted_claims: self
                .claims
                .iter()
                .filter(|c| c.status == ClaimStatus::Refuted)
                .count(),
            records_by_agent: by_agent,
            records_by_provenance: by_provenance,
        }
    }
}

impl Default for DiscoveryLedger {
    fn default() -> Self {
        Self::new()
    }
}

/// Summary statistics for the ledger.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedgerSummary {
    pub total_records: usize,
    pub total_claims: usize,
    pub unique_potentials: usize,
    pub unique_elements: usize,
    pub confirmed_claims: usize,
    pub refuted_claims: usize,
    pub records_by_agent: std::collections::HashMap<String, usize>,
    pub records_by_provenance: std::collections::HashMap<String, usize>,
}

// ───────────────────────────────────────────────────────────
// Error type
// ───────────────────────────────────────────────────────────

#[derive(Debug)]
pub enum LedgerError {
    Io(String),
    Serde(String),
}

impl std::fmt::Display for LedgerError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LedgerError::Io(msg) => write!(f, "Ledger I/O error: {}", msg),
            LedgerError::Serde(msg) => write!(f, "Ledger serialization error: {}", msg),
        }
    }
}

impl std::error::Error for LedgerError {}

impl From<LedgerError> for std::io::Error {
    fn from(e: LedgerError) -> Self {
        std::io::Error::other(e.to_string())
    }
}

// ───────────────────────────────────────────────────────────
// JSONL I/O helpers
// ───────────────────────────────────────────────────────────

fn read_jsonl<T: for<'de> Deserialize<'de>>(path: &Path) -> Result<Vec<T>, LedgerError> {
    let content = std::fs::read_to_string(path).map_err(|e| LedgerError::Io(e.to_string()))?;
    let mut items = Vec::new();
    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let item: T = serde_json::from_str(line)
            .map_err(|e| LedgerError::Serde(format!("{}: {}", path.display(), e)))?;
        items.push(item);
    }
    Ok(items)
}

fn write_jsonl<T: Serialize>(path: &Path, items: &[T]) -> Result<(), LedgerError> {
    use std::io::Write;
    let mut f = std::fs::File::create(path).map_err(|e| LedgerError::Io(e.to_string()))?;
    for item in items {
        let line = serde_json::to_string(item).map_err(|e| LedgerError::Serde(e.to_string()))?;
        writeln!(f, "{}", line).map_err(|e| LedgerError::Io(e.to_string()))?;
    }
    Ok(())
}

fn append_jsonl_line<T: Serialize>(path: &Path, item: &T) -> Result<(), LedgerError> {
    use std::io::Write;
    // Ensure parent directories exist
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| LedgerError::Io(e.to_string()))?;
    }
    let mut f = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(|e| LedgerError::Io(e.to_string()))?;
    let line = serde_json::to_string(item).map_err(|e| LedgerError::Serde(e.to_string()))?;
    writeln!(f, "{}", line).map_err(|e| LedgerError::Io(e.to_string()))?;
    Ok(())
}

// ───────────────────────────────────────────────────────────
// ID generation
// ───────────────────────────────────────────────────────────

/// Generate a unique record ID from agent_id and current timestamp.
pub fn generate_record_id(agent_id: &str) -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let nanos = now.as_nanos();
    // FNV-1a hash of agent_id + nanos for compactness
    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in agent_id.bytes().chain(nanos.to_le_bytes().iter().copied()) {
        hash ^= byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("{:016x}", hash)
}

/// Get current ISO 8601 timestamp.
pub fn now_iso8601() -> String {
    // Simple UTC timestamp without chrono dependency
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = now.as_secs();
    // Approximate conversion (good enough for ordering, not calendar-precise leap seconds)
    let days = secs / 86400;
    let time_secs = secs % 86400;
    let hours = time_secs / 3600;
    let minutes = (time_secs % 3600) / 60;
    let seconds = time_secs % 60;

    // Days since 1970-01-01
    let mut y = 1970i64;
    let mut remaining = days as i64;
    loop {
        let days_in_year = if y % 4 == 0 && (y % 100 != 0 || y % 400 == 0) {
            366
        } else {
            365
        };
        if remaining < days_in_year {
            break;
        }
        remaining -= days_in_year;
        y += 1;
    }
    let month_days = if y % 4 == 0 && (y % 100 != 0 || y % 400 == 0) {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };
    let mut m = 0usize;
    for (i, &md) in month_days.iter().enumerate() {
        if remaining < md as i64 {
            m = i;
            break;
        }
        remaining -= md as i64;
    }
    let d = remaining + 1;

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        y,
        m + 1,
        d,
        hours,
        minutes,
        seconds
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_ledger() {
        let ledger = DiscoveryLedger::new();
        assert_eq!(ledger.records.len(), 0);
        assert_eq!(ledger.claims.len(), 0);
        assert_eq!(ledger.unique_potentials(), 0);
    }

    #[test]
    fn test_record_id_generation() {
        let id1 = generate_record_id("agent_alpha");
        let id2 = generate_record_id("agent_alpha");
        // IDs should be different (different timestamps)
        // But on very fast machines they might collide — acceptable for tests
        assert_eq!(id1.len(), 16);
        assert_eq!(id2.len(), 16);
    }

    #[test]
    fn test_iso8601_format() {
        let ts = now_iso8601();
        assert!(
            ts.starts_with("20"),
            "Timestamp should start with year 20xx: {}",
            ts
        );
        assert!(ts.ends_with('Z'), "Timestamp should end with Z: {}", ts);
    }

    #[test]
    fn test_ledger_roundtrip() {
        let dir = std::env::temp_dir().join("ledger_test");
        let _ = std::fs::remove_dir_all(&dir);

        let mut ledger = DiscoveryLedger::new();
        ledger.records.push(BenchmarkRecord {
            record_id: "test001".to_string(),
            potential_id: "EAM-Al-Adams-1989".to_string(),
            potential_label: "Adams-1989".to_string(),
            pair_style: "eam/alloy".to_string(),
            element: "Al".to_string(),
            property: "C11".to_string(),
            reference: 108.2,
            predicted: 110.5,
            unit: "GPa".to_string(),
            provenance: Provenance::LammpsRun {
                run_id: "run_001".to_string(),
                lammps_version: "2024.8.29".to_string(),
                input_hash: "abc123".to_string(),
                potential_file: "Al.eam.alloy".to_string(),
            },
            agent_id: "alpha".to_string(),
            timestamp: now_iso8601(),
        });

        ledger.save(&dir).unwrap();
        let loaded = DiscoveryLedger::load(&dir).unwrap();
        assert_eq!(loaded.records.len(), 1);
        assert_eq!(loaded.records[0].potential_id, "EAM-Al-Adams-1989");

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_ledger_queries() {
        let mut ledger = DiscoveryLedger::new();
        let ts = now_iso8601();

        for (el, prop, val) in [
            ("Al", "C11", 110.0),
            ("Al", "C12", 62.0),
            ("Cu", "C11", 170.0),
        ] {
            ledger.records.push(BenchmarkRecord {
                record_id: generate_record_id("test"),
                potential_id: format!("pot-{}", el),
                potential_label: format!("Test-{}", el),
                pair_style: "eam/alloy".to_string(),
                element: el.to_string(),
                property: prop.to_string(),
                reference: val,
                predicted: val * 1.02,
                unit: "GPa".to_string(),
                provenance: Provenance::AgentInference {
                    method: "test".to_string(),
                    confidence: 1.0,
                    basis: vec![],
                },
                agent_id: "test".to_string(),
                timestamp: ts.clone(),
            });
        }

        assert_eq!(ledger.records_for_element("Al").len(), 2);
        assert_eq!(ledger.records_for_element("Cu").len(), 1);
        assert_eq!(ledger.records_for_property("C11").len(), 2);
        assert_eq!(ledger.unique_elements(), 2);
        assert_eq!(ledger.unique_potentials(), 2);
    }
}
