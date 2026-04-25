//! Agent β: Literature Miner
//!
//! Cross-validates benchmark data and identifies literature-computation gaps.
//! In future iterations, this agent will call the autoresearch pipeline
//! to extract elastic constants from papers via DOI.

use super::{Action, ActionResult, Capability, DiscoveryAgent};
use anyhow::Result;
use lupine_ops::ledger::{
    AgentClaim, BenchmarkRecord, ClaimStatus, ClaimType, DiscoveryLedger, Provenance,
    generate_record_id, now_iso8601,
};

pub struct LiteratureAgent {
    analyzed: bool,
}

impl LiteratureAgent {
    pub fn new() -> Self { Self { analyzed: false } }
}

impl Default for LiteratureAgent { fn default() -> Self { Self::new() } }

impl DiscoveryAgent for LiteratureAgent {
    fn agent_id(&self) -> &str { "agent_beta_literature" }
    fn capabilities(&self) -> Vec<Capability> { vec![Capability::MineLiterature] }

    fn propose_actions(&self, ledger: &DiscoveryLedger) -> Vec<Action> {
        if !self.analyzed && ledger.records.len() >= 6 {
            vec![Action::FetchPaper {
                doi: "cross-validate".into(),
                potential_id: "all".into(),
            }]
        } else { vec![] }
    }

    fn execute(&mut self, action: &Action, ledger: &DiscoveryLedger) -> Result<ActionResult> {
        match action {
            Action::FetchPaper { .. } => {
                let ts = now_iso8601();
                let mut claims = Vec::new();
                let mut notes = Vec::new();

                // Cross-validate: compare different potentials for the same element+property
                // Find cases where potentials disagree significantly
                let mut by_key: std::collections::HashMap<(String, String), Vec<&BenchmarkRecord>> =
                    std::collections::HashMap::new();
                for r in &ledger.records {
                    by_key.entry((r.element.clone(), r.property.clone()))
                        .or_default()
                        .push(r);
                }

                for ((element, property), records) in &by_key {
                    if records.len() < 2 { continue; }

                    let predictions: Vec<f64> = records.iter().map(|r| r.predicted).collect();
                    let mean = predictions.iter().sum::<f64>() / predictions.len() as f64;
                    let variance = predictions.iter()
                        .map(|p| (p - mean).powi(2))
                        .sum::<f64>() / predictions.len() as f64;
                    let std_dev = variance.sqrt();
                    let cv = if mean.abs() > 1e-10 { std_dev / mean.abs() } else { 0.0 };

                    // Flag high coefficient of variation (> 20%)
                    if cv > 0.20 {
                        // Find the most anomalous potential
                        let worst = records.iter()
                            .max_by(|a, b| {
                                let da = (a.predicted - mean).abs();
                                let db = (b.predicted - mean).abs();
                                da.partial_cmp(&db).unwrap()
                            });

                        if let Some(w) = worst {
                            claims.push(AgentClaim {
                                claim_id: generate_record_id(self.agent_id()),
                                agent_id: self.agent_id().into(),
                                claim_type: ClaimType::AnomalousPotential {
                                    potential_id: w.potential_id.clone(),
                                    property: property.clone(),
                                    expected_range: (mean - 2.0 * std_dev, mean + 2.0 * std_dev),
                                    actual: w.predicted,
                                },
                                evidence_ids: records.iter().map(|r| r.record_id.clone()).collect(),
                                confidence: 0.7,
                                lean_theorem: None,
                                status: ClaimStatus::Proposed,
                                timestamp: ts.clone(),
                                description: format!(
                                    "Anomalous {} for {} {}: {:.1} vs mean {:.1} (CV={:.1}%)",
                                    w.potential_label, element, property, w.predicted, mean, cv * 100.0,
                                ),
                            });
                        }
                    }

                    notes.push(format!(
                        "{:>3} {:>4}: n={}, mean={:.1}, σ={:.1}, CV={:.1}%",
                        element, property, records.len(), mean, std_dev, cv * 100.0,
                    ));
                }

                self.analyzed = true;

                Ok(ActionResult {
                    agent_id: self.agent_id().into(),
                    action_description: "Cross-validate benchmark predictions".into(),
                    records_produced: vec![],
                    claims_produced: claims,
                    notes,
                })
            }
            _ => Ok(ActionResult {
                agent_id: self.agent_id().into(),
                action_description: "No-op".into(),
                records_produced: vec![], claims_produced: vec![], notes: vec![],
            }),
        }
    }
}
