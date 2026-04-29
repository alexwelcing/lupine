//! Multi-agent discovery system for interatomic potential evaluation.
//!
//! Each agent specializes in a different aspect of the discovery pipeline:
//! - **LAMMPS Agent (α)**: Runs simulations, extracts elastic constants
//! - **Literature Agent (β)**: Mines papers for reported values
//! - **Manifold Agent (γ)**: Analyzes error geometry via PCA
//! - **Paradox Agent (δ)**: Detects Simpson's paradox in grouped data
//! - **Null Model Agent (ε)**: Devil's advocate — tests claims against random baselines
//! - **Orchestrator**: Coordinates agents, manages the discovery loop

pub mod causal_agent;
pub mod experiment_agent;
pub mod lammps_agent;
pub mod literature_agent;
pub mod manifold_agent;
pub mod null_model_agent;
pub mod orchestrator;
pub mod paradox_agent;
pub mod theorist_agent;

use anyhow::Result;
use lupine_ops::ledger::{AgentClaim, BenchmarkRecord, DiscoveryLedger};

// ───────────────────────────────────────────────────────────
// Agent Trait
// ───────────────────────────────────────────────────────────

/// A capability that an agent possesses.
#[derive(Debug, Clone, PartialEq)]
pub enum Capability {
    RunLammps,
    MineLiterature,
    AnalyzeManifold,
    DetectParadox,
    DesignExperiment,
    FormalVerify,
    FitModels,
}

/// An action that an agent can perform.
#[derive(Debug, Clone)]
pub enum Action {
    /// Evaluate a specific potential for a specific element
    EvaluatePotential {
        nist_id: String,
        element: String,
        properties: Vec<String>,
    },
    /// Fetch and mine a paper by DOI
    FetchPaper { doi: String, potential_id: String },
    /// Run manifold analysis on accumulated data for an element
    RunManifoldAnalysis { element: String },
    /// Check for Simpson's paradox across element groups
    CheckParadox { grouping: String },
    /// Propose a new hypothesis
    ProposeHypothesis { description: String },
    /// Design and execute a batch of LAMMPS experiments driven by surrogate acquisition.
    DesignExperiments {
        strategy: String,
        max_experiments: usize,
    },
    /// Screen multiple groupings for causal anomalies (Simpson's paradox, etc.).
    ScreenCausalAnomalies { groupings: Vec<String> },
    /// Generate competing physical hypotheses for observed statistical patterns.
    Theorize { target_claim_ids: Vec<String> },
}

/// Result of executing an action.
#[derive(Debug)]
pub struct ActionResult {
    pub agent_id: String,
    pub action_description: String,
    pub records_produced: Vec<BenchmarkRecord>,
    pub claims_produced: Vec<AgentClaim>,
    pub notes: Vec<String>,
}

/// The core trait that all discovery agents implement.
pub trait DiscoveryAgent {
    /// Unique identifier for this agent.
    fn agent_id(&self) -> &str;

    /// What this agent can do.
    fn capabilities(&self) -> Vec<Capability>;

    /// Given the current ledger state, propose what to do next.
    fn propose_actions(&self, ledger: &DiscoveryLedger) -> Vec<Action>;

    /// Execute a single action and return results.
    fn execute(&mut self, action: &Action, ledger: &DiscoveryLedger) -> Result<ActionResult>;
}
