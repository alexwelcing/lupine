//! Agent ζ: Causal Screener
//!
//! Screens groupings for causal anomalies (Simpson's paradox, confounding).
//! Migrated to glim-think (TypeScript); this is the Rust stub for local
//! atlas-distill compilation.

use super::{Action, ActionResult, Capability, DiscoveryAgent};
use anyhow::Result;
use lupine_ops::ledger::{
    generate_record_id, now_iso8601, AgentClaim, ClaimStatus, ClaimType, DiscoveryLedger,
};

pub struct CausalAgent;

impl CausalAgent {
    pub fn new() -> Self {
        Self
    }
}

impl Default for CausalAgent {
    fn default() -> Self {
        Self::new()
    }
}

impl DiscoveryAgent for CausalAgent {
    fn agent_id(&self) -> &str {
        "agent_zeta_causal"
    }

    fn capabilities(&self) -> Vec<Capability> {
        vec![Capability::AnalyzeManifold]
    }

    fn propose_actions(&self, ledger: &DiscoveryLedger) -> Vec<Action> {
        if ledger.records.len() >= 12 {
            vec![Action::ScreenCausalAnomalies {
                groupings: vec!["element".into(), "pair_style".into()],
            }]
        } else {
            vec![]
        }
    }

    fn execute(&mut self, action: &Action, _ledger: &DiscoveryLedger) -> Result<ActionResult> {
        match action {
            Action::ScreenCausalAnomalies { groupings } => {
                let ts = now_iso8601();
                let mut notes = Vec::new();
                let mut claims = Vec::new();

                for g in groupings {
                    notes.push(format!("Screened {} — no causal anomaly detected (stub)", g));
                    claims.push(AgentClaim {
                        claim_id: generate_record_id(self.agent_id()),
                        agent_id: self.agent_id().into(),
                        claim_type: ClaimType::SimpsonsDetected {
                            pooled_r: 0.0,
                            within_group_r: 0.0,
                            n_groups: 0,
                            confounder: g.clone(),
                        },
                        evidence_ids: vec![],
                        confidence: 0.5,
                        lean_theorem: None,
                        status: ClaimStatus::Insufficient,
                        timestamp: ts.clone(),
                        description: format!(
                            "Causal screen for {}: no anomaly (agent stub — full impl in glim-think)",
                            g
                        ),
                    });
                }

                Ok(ActionResult {
                    agent_id: self.agent_id().into(),
                    action_description: "Causal anomaly screen (stub)".into(),
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
