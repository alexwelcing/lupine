//! Discovery Orchestrator — coordinates multiple agents in a discovery loop.
//!
//! The loop: Select → Evaluate → Analyze → Test → Report
//! Each iteration adds data and claims to the shared ledger.

use super::{Action, ActionResult, DiscoveryAgent};
use anyhow::Result;
use lupine_ops::ledger::{DiscoveryLedger, LedgerSummary};
use std::path::{Path, PathBuf};

/// Configuration for a discovery campaign.
pub struct CampaignConfig {
    /// Directory for the shared ledger
    pub ledger_dir: PathBuf,
    /// Maximum iterations
    pub max_iterations: usize,
    /// Target elements
    pub elements: Vec<String>,
    /// Path to NIST index
    pub nist_index: PathBuf,
}

impl Default for CampaignConfig {
    fn default() -> Self {
        Self {
            ledger_dir: PathBuf::from("atlas-distill/discovery_ledger"),
            max_iterations: 5,
            elements: vec!["Al".into(), "Cu".into(), "Ni".into(), "Fe".into()],
            nist_index: PathBuf::from("atlas/nist_ipr/index/master_index.json"),
        }
    }
}

/// The orchestrator manages agents and the discovery loop.
pub struct Orchestrator {
    agents: Vec<Box<dyn DiscoveryAgent>>,
    ledger: DiscoveryLedger,
    ledger_dir: PathBuf,
    max_iterations: usize,
    iteration: usize,
}

impl Orchestrator {
    pub fn new(config: &CampaignConfig) -> Result<Self> {
        let ledger = if config.ledger_dir.exists() {
            DiscoveryLedger::load(&config.ledger_dir).unwrap_or_default()
        } else {
            DiscoveryLedger::new()
        };

        Ok(Self {
            agents: Vec::new(),
            ledger,
            ledger_dir: config.ledger_dir.clone(),
            max_iterations: config.max_iterations,
            iteration: 0,
        })
    }

    /// Register an agent.
    pub fn add_agent(&mut self, agent: Box<dyn DiscoveryAgent>) {
        self.agents.push(agent);
    }

    /// Run the discovery loop.
    pub fn run(&mut self) -> Result<LedgerSummary> {
        eprintln!("\n  ╔════════════════════════════════════════════════════════════╗");
        eprintln!("  ║  Multi-Agent Discovery Campaign                           ║");
        eprintln!("  ║  Agents: {}                                                ", self.agents.len());
        eprintln!("  ║  Ledger: {}                          ", self.ledger_dir.display());
        eprintln!("  ╚════════════════════════════════════════════════════════════╝\n");

        for iter in 0..self.max_iterations {
            self.iteration = iter + 1;
            eprintln!("  ━━━ Iteration {}/{} ━━━", self.iteration, self.max_iterations);

            let mut total_records = 0;
            let mut total_claims = 0;

            // Each agent proposes and executes actions
            for agent_idx in 0..self.agents.len() {
                let proposed = self.agents[agent_idx].propose_actions(&self.ledger);
                if proposed.is_empty() {
                    continue;
                }

                let agent_id = self.agents[agent_idx].agent_id().to_string();
                eprintln!("\n  ▸ {} proposes {} action(s)", agent_id, proposed.len());

                for action in &proposed {
                    match self.agents[agent_idx].execute(action, &self.ledger) {
                        Ok(result) => {
                            // Ingest records
                            for record in result.records_produced {
                                if let Err(e) = self.ledger.append_record(record, &self.ledger_dir) {
                                    eprintln!("    ⚠ Failed to write record: {}", e);
                                }
                                total_records += 1;
                            }
                            // Ingest claims
                            for claim in result.claims_produced {
                                eprintln!("    📋 Claim: {}", claim.description);
                                if let Err(e) = self.ledger.append_claim(claim, &self.ledger_dir) {
                                    eprintln!("    ⚠ Failed to write claim: {}", e);
                                }
                                total_claims += 1;
                            }
                            // Print notes
                            for note in &result.notes {
                                eprintln!("    ℹ {}", note);
                            }
                        }
                        Err(e) => {
                            eprintln!("    ❌ Action failed: {}", e);
                        }
                    }
                }
            }

            eprintln!("\n  Iteration {} summary: +{} records, +{} claims (total: {} records, {} claims)",
                self.iteration, total_records, total_claims,
                self.ledger.records.len(), self.ledger.claims.len());

            // Stop early if no progress
            if total_records == 0 && total_claims == 0 {
                eprintln!("  ℹ No progress — stopping early.");
                break;
            }
        }

        // Final summary
        let summary = self.ledger.summary();
        self.print_final_summary(&summary);

        // Save final state
        self.ledger.save(&self.ledger_dir)?;

        Ok(summary)
    }

    fn print_final_summary(&self, summary: &LedgerSummary) {
        eprintln!("\n  ╔════════════════════════════════════════════════════════════╗");
        eprintln!("  ║  Discovery Campaign Complete                               ║");
        eprintln!("  ╚════════════════════════════════════════════════════════════╝");
        eprintln!();
        eprintln!("  Total records:     {}", summary.total_records);
        eprintln!("  Total claims:      {}", summary.total_claims);
        eprintln!("  Unique potentials: {}", summary.unique_potentials);
        eprintln!("  Unique elements:   {}", summary.unique_elements);
        eprintln!("  Confirmed claims:  {}", summary.confirmed_claims);
        eprintln!("  Refuted claims:    {}", summary.refuted_claims);
        eprintln!();
        eprintln!("  Records by agent:");
        for (agent, count) in &summary.records_by_agent {
            eprintln!("    {:30} {:>5}", agent, count);
        }
        eprintln!("  Records by provenance:");
        for (prov, count) in &summary.records_by_provenance {
            eprintln!("    {:30} {:>5}", prov, count);
        }
        eprintln!();
        eprintln!("  Ledger saved to: {}", self.ledger_dir.display());
    }
}
