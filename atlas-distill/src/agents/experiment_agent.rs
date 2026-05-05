//! Agent η: Experiment Designer
//!
//! Designs and executes LAMMPS experiments driven by acquisition strategies.
//! Migrated to glim-think (TypeScript); this is the Rust stub for local
//! atlas-distill compilation.

use super::{Action, ActionResult, Capability, DiscoveryAgent};
use anyhow::Result;
use lupine_ops::ledger::{
    generate_record_id, now_iso8601, AgentClaim, ClaimStatus, ClaimType,
    DiscoveryLedger,
};
use std::path::PathBuf;

pub struct ExperimentAgentConfig {
    pub lammps_exe: PathBuf,
    pub work_dir: PathBuf,
    pub min_score: f64,
    pub max_per_iteration: usize,
    pub supercell: usize,
}

pub struct ExperimentAgent {
    config: ExperimentAgentConfig,
}

impl ExperimentAgent {
    pub fn new(config: ExperimentAgentConfig) -> Self {
        Self { config }
    }
}

impl DiscoveryAgent for ExperimentAgent {
    fn agent_id(&self) -> &str {
        "agent_eta_experiment"
    }

    fn capabilities(&self) -> Vec<Capability> {
        vec![Capability::DesignExperiment, Capability::RunLammps]
    }

    fn propose_actions(&self, ledger: &DiscoveryLedger) -> Vec<Action> {
        if ledger.records.len() >= 6 {
            vec![Action::DesignExperiments {
                strategy: "alignment-stress".into(),
                max_experiments: self.config.max_per_iteration,
            }]
        } else {
            vec![]
        }
    }

    fn execute(&mut self, action: &Action, _ledger: &DiscoveryLedger) -> Result<ActionResult> {
        match action {
            Action::DesignExperiments {
                strategy,
                max_experiments,
            } => {
                let notes = vec![
                    format!(
                        "Experiment design stub: strategy={}, max={}, lammps={}",
                        strategy,
                        max_experiments,
                        self.config.lammps_exe.display()
                    ),
                    "Full LAMMPS runner migrated to glim-think (TypeScript)".into(),
                ];
                let records = Vec::new();
                let mut claims = Vec::new();
                let ts = now_iso8601();

                // Produce a placeholder claim so the loop makes progress
                claims.push(AgentClaim {
                    claim_id: generate_record_id(self.agent_id()),
                    agent_id: self.agent_id().into(),
                    claim_type: ClaimType::ExperimentBatch {
                        n_experiments: *max_experiments,
                        strategy: strategy.clone(),
                    },
                    evidence_ids: vec![],
                    confidence: 0.5,
                    lean_theorem: None,
                    status: ClaimStatus::Insufficient,
                    timestamp: ts.clone(),
                    description: format!(
                        "Experiment batch designed (stub): {} experiments via '{}'",
                        max_experiments, strategy
                    ),
                });

                Ok(ActionResult {
                    agent_id: self.agent_id().into(),
                    action_description: format!(
                        "Design {} experiments (stub)",
                        max_experiments
                    ),
                    records_produced: records,
                    claims_produced: claims,
                    notes,
                })
            }
            Action::EvaluatePotential {
                nist_id,
                element,
                properties,
            } => {
                Ok(ActionResult {
                    agent_id: self.agent_id().into(),
                    action_description: format!("Evaluate {} for {}", nist_id, element),
                    records_produced: vec![],
                    claims_produced: vec![],
                    notes: vec![format!(
                        "Stub: would evaluate {} for {} (properties: {:?})",
                        nist_id, element, properties
                    )],
                })
            }
            _ => Ok(ActionResult {
                agent_id: self.agent_id().into(),
                action_description: "No-op".into(),
                records_produced: vec![],
                claims_produced: vec![],
                notes: vec![],
            }),
        }
    }
}
