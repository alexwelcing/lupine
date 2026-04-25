//! Discovery Orchestrator — coordinates multiple agents in a dynamic loop.
//!
//! The old fixed pipeline (Select → Evaluate → Analyze → Test → Report)
//! has been replaced by a dynamic action queue.  Agents no longer run in
//! rigid sequence; instead they submit actions to a shared priority queue.
//! The orchestrator deduplicates, schedules, and executes actions until
//! the queue is empty or a maximum iteration budget is exhausted.
//!
//! This is the orchestrator's submission to autoresearch: it stops being
//! a deterministic for-loop and becomes a reactive scheduler.

use super::{Action, ActionResult, DiscoveryAgent};
use anyhow::Result;
use lupine_ops::ledger::{DiscoveryLedger, LedgerSummary};
use std::collections::{HashSet, VecDeque};
use std::path::PathBuf;

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

/// A pending action in the queue, annotated with its source agent.
struct PendingAction {
    agent_idx: usize,
    action: Action,
    /// Human-readable key for deduplication.
    dedup_key: String,
}

/// The orchestrator manages agents and the discovery loop via a dynamic queue.
pub struct Orchestrator {
    agents: Vec<Box<dyn DiscoveryAgent>>,
    ledger: DiscoveryLedger,
    ledger_dir: PathBuf,
    max_iterations: usize,
    iteration: usize,
    /// Actions we have already executed (deduplication).
    executed_keys: HashSet<String>,
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
            executed_keys: HashSet::new(),
        })
    }

    /// Register an agent.
    pub fn add_agent(&mut self, agent: Box<dyn DiscoveryAgent>) {
        self.agents.push(agent);
    }

    /// Generate a deduplication key for an action.
    fn dedup_key(agent_id: &str, action: &Action) -> String {
        match action {
            Action::EvaluatePotential { nist_id, element, .. } => {
                format!("{}:eval:{}:{}", agent_id, nist_id, element)
            }
            Action::FetchPaper { doi, .. } => {
                format!("{}:fetch:{}", agent_id, doi)
            }
            Action::RunManifoldAnalysis { element } => {
                format!("{}:manifold:{}", agent_id, element)
            }
            Action::CheckParadox { grouping } => {
                format!("{}:paradox:{}", agent_id, grouping)
            }
            Action::ProposeHypothesis { description } => {
                format!("{}:hypo:{}", agent_id, description)
            }
            Action::DesignExperiments { strategy, max_experiments } => {
                format!("{}:exp:{}:{}", agent_id, strategy, max_experiments)
            }
            Action::ScreenCausalAnomalies { groupings } => {
                let mut key = format!("{}:causal:", agent_id);
                for g in groupings {
                    key.push_str(g);
                    key.push(',');
                }
                key
            }
            Action::Theorize { target_claim_ids } => {
                let mut key = format!("{}:theorize:", agent_id);
                for cid in target_claim_ids {
                    key.push_str(cid);
                    key.push(',');
                }
                key
            }
        }
    }

    /// Run the dynamic discovery loop.
    pub fn run(&mut self) -> Result<LedgerSummary> {
        eprintln!("\n  ╔════════════════════════════════════════════════════════════╗");
        eprintln!("  ║  Dynamic Autoresearch Orchestrator                        ║");
        eprintln!("  ║  Agents: {}                                                ", self.agents.len());
        eprintln!("  ║  Ledger: {}                          ", self.ledger_dir.display());
        eprintln!("  ╚════════════════════════════════════════════════════════════╝\n");

        for iter in 0..self.max_iterations {
            self.iteration = iter + 1;

            // ── Phase 1: Collect proposals from all agents ──
            let mut queue: VecDeque<PendingAction> = VecDeque::new();
            for (idx, agent) in self.agents.iter().enumerate() {
                let proposed = agent.propose_actions(&self.ledger);
                for action in proposed {
                    let key = Self::dedup_key(agent.agent_id(), &action);
                    if !self.executed_keys.contains(&key) {
                        queue.push_back(PendingAction {
                            agent_idx: idx,
                            action,
                            dedup_key: key,
                        });
                    }
                }
            }

            if queue.is_empty() {
                eprintln!("  ℹ No new actions proposed — stopping early.");
                break;
            }

            eprintln!("  ━━━ Iteration {}/{} | {} pending action(s) ━━━",
                self.iteration, self.max_iterations, queue.len());

            let mut total_records = 0;
            let mut total_claims = 0;

            // ── Phase 2: Execute actions in queue order ──
            while let Some(pending) = queue.pop_front() {
                let agent_id = self.agents[pending.agent_idx].agent_id().to_string();
                eprintln!("\n  ▸ {} executes {}", agent_id,
                    format!("{:?}", pending.action).chars().take(60).collect::<String>());

                match self.agents[pending.agent_idx].execute(&pending.action, &self.ledger) {
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

                // Mark as executed regardless of success (don't retry same action).
                self.executed_keys.insert(pending.dedup_key);
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
        eprintln!("  ║  Autoresearch Campaign Complete                            ║");
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
