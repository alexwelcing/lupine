//! Agent δ: Paradox Hunter
//!
//! Detects Simpson's paradox in grouped benchmark data.

use super::{Action, ActionResult, Capability, DiscoveryAgent};
use crate::causal::{self, GroupedPoint};
use anyhow::Result;
use lupine_ops::ledger::{
    generate_record_id, now_iso8601, AgentClaim, ClaimStatus, ClaimType, DiscoveryLedger,
};

pub struct ParadoxAgent;

impl ParadoxAgent {
    pub fn new() -> Self {
        Self
    }
}

impl Default for ParadoxAgent {
    fn default() -> Self {
        Self::new()
    }
}

impl DiscoveryAgent for ParadoxAgent {
    fn agent_id(&self) -> &str {
        "agent_delta_paradox"
    }
    fn capabilities(&self) -> Vec<Capability> {
        vec![Capability::DetectParadox]
    }

    fn propose_actions(&self, ledger: &DiscoveryLedger) -> Vec<Action> {
        if ledger.records.len() >= 12 {
            vec![Action::CheckParadox {
                grouping: "element".into(),
            }]
        } else {
            vec![]
        }
    }

    fn execute(&mut self, action: &Action, ledger: &DiscoveryLedger) -> Result<ActionResult> {
        match action {
            Action::CheckParadox { grouping } => {
                let mut notes = Vec::new();
                let mut claims = Vec::new();
                let ts = now_iso8601();

                // Build grouped points: x = reference, y = (predicted - reference), group = element
                let data: Vec<GroupedPoint> = ledger
                    .records
                    .iter()
                    .map(|r| GroupedPoint {
                        group: match grouping.as_str() {
                            "element" => r.element.clone(),
                            "pair_style" => r.pair_style.clone(),
                            "potential" => r.potential_label.clone(),
                            _ => r.element.clone(),
                        },
                        x: r.reference,
                        y: r.predicted - r.reference,
                    })
                    .collect();

                if data.len() < 6 {
                    notes.push("Insufficient data for paradox detection".into());
                    return Ok(ActionResult {
                        agent_id: self.agent_id().into(),
                        action_description: format!("Paradox check ({})", grouping),
                        records_produced: vec![],
                        claims_produced: vec![],
                        notes,
                    });
                }

                let result = causal::detect_simpsons_paradox(&data);
                causal::print_summary(&result);

                if result.simpsons_detected || result.ecological_fallacy {
                    claims.push(AgentClaim {
                        claim_id: generate_record_id(self.agent_id()),
                        agent_id: self.agent_id().into(),
                        claim_type: ClaimType::SimpsonsDetected {
                            pooled_r: result.pooled_r,
                            within_group_r: result.markers.pooled_within_r,
                            n_groups: result.n_groups,
                            confounder: grouping.clone(),
                        },
                        evidence_ids: vec![], confidence: 0.85,
                        lean_theorem: None, status: ClaimStatus::Proposed,
                        timestamp: ts,
                        description: format!(
                            "Simpson's paradox detected (grouped by {}): pooled r={:+.3}, within r={:+.3}",
                            grouping, result.pooled_r, result.markers.pooled_within_r
                        ),
                    });
                    notes.push(format!("⚠ PARADOX: {}", result.pattern));
                } else {
                    notes.push(format!(
                        "✓ No paradox (grouped by {}): pooled r={:+.3}",
                        grouping, result.pooled_r
                    ));
                }

                Ok(ActionResult {
                    agent_id: self.agent_id().into(),
                    action_description: format!("Paradox check ({})", grouping),
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
