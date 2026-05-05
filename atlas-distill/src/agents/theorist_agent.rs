//! Agent θ: Theorist
//!
//! Generates competing physical hypotheses for observed statistical patterns.
//! Migrated to glim-think (TypeScript); this is the Rust stub for local
//! atlas-distill compilation.

use super::{Action, ActionResult, Capability, DiscoveryAgent};
use anyhow::Result;
use lupine_ops::ledger::{
    generate_record_id, now_iso8601, AgentClaim, ClaimStatus, ClaimType, DiscoveryLedger,
};

pub struct TheoristAgent;

impl TheoristAgent {
    pub fn new() -> Self {
        Self
    }
}

impl Default for TheoristAgent {
    fn default() -> Self {
        Self::new()
    }
}

impl DiscoveryAgent for TheoristAgent {
    fn agent_id(&self) -> &str {
        "agent_theta_theorist"
    }

    fn capabilities(&self) -> Vec<Capability> {
        vec![Capability::FormalVerify]
    }

    fn propose_actions(&self, ledger: &DiscoveryLedger) -> Vec<Action> {
        if !ledger.claims.is_empty() {
            let ids: Vec<String> = ledger
                .claims
                .iter()
                .take(3)
                .map(|c| c.claim_id.clone())
                .collect();
            vec![Action::Theorize {
                target_claim_ids: ids,
            }]
        } else {
            vec![]
        }
    }

    fn execute(&mut self, action: &Action, _ledger: &DiscoveryLedger) -> Result<ActionResult> {
        match action {
            Action::Theorize { target_claim_ids } => {
                let ts = now_iso8601();
                let mut notes = Vec::new();
                let mut claims = Vec::new();

                notes.push(format!(
                    "Theorized over {} claims (stub)",
                    target_claim_ids.len()
                ));
                notes.push("Full theorist migrated to glim-think (TypeScript)".into());

                for id in target_claim_ids {
                    claims.push(AgentClaim {
                        claim_id: generate_record_id(self.agent_id()),
                        agent_id: self.agent_id().into(),
                        claim_type: ClaimType::PhysicalHypothesis {
                            observation_claim_id: id.clone(),
                            explanation: "Stub explanation — see glim-think theorist facet".into(),
                            prediction: "Stub prediction".into(),
                            test_strategy: "Run lupine-distill evaluate".into(),
                        },
                        evidence_ids: vec![id.clone()],
                        confidence: 0.5,
                        lean_theorem: None,
                        status: ClaimStatus::Proposed,
                        timestamp: ts.clone(),
                        description: format!(
                            "Hypothesis for {} (stub — full impl in glim-think)",
                            id
                        ),
                    });
                }

                Ok(ActionResult {
                    agent_id: self.agent_id().into(),
                    action_description: "Theorize (stub)".into(),
                    records_produced: vec![],
                    claims_produced: claims,
                    notes,
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
