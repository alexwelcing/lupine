//! Agent γ: Manifold Analyst
//!
//! Analyzes the geometric structure of prediction errors using PCA.
//! Detects hyper-ribbon structures and tests the Parameter-Bound Conjecture.

use super::{Action, ActionResult, Capability, DiscoveryAgent};
use crate::manifold::{self, BenchmarkEntry, ManifoldAnalysis};
use anyhow::Result;
use lupine_ops::ledger::{
    AgentClaim, BenchmarkRecord, ClaimStatus, ClaimType, DiscoveryLedger,
    generate_record_id, now_iso8601,
};

pub struct ManifoldAgent {
    properties: Vec<String>,
    previous_pr: Option<f64>,
    previous_n: usize,
}

impl ManifoldAgent {
    pub fn new() -> Self {
        Self {
            properties: vec!["C11".into(), "C12".into(), "C44".into()],
            previous_pr: None,
            previous_n: 0,
        }
    }

    fn ledger_to_entries(records: &[&BenchmarkRecord]) -> Vec<BenchmarkEntry> {
        records.iter().map(|r| BenchmarkEntry {
            material: format!("{}|{}", r.element, r.potential_id),
            potential: r.pair_style.clone(),
            property: r.property.clone(),
            reference: r.reference,
            predicted: r.predicted,
            unit: r.unit.clone(),
        }).collect()
    }

    fn generate_claims(&self, analyses: &[ManifoldAnalysis], n_entries: usize) -> Vec<AgentClaim> {
        let ts = now_iso8601();
        let mut claims = Vec::new();
        for ma in analyses {
            if ma.is_hyper_ribbon {
                claims.push(AgentClaim {
                    claim_id: generate_record_id(self.agent_id()),
                    agent_id: self.agent_id().into(),
                    claim_type: ClaimType::HyperRibbonConfirmed {
                        participation_ratio: ma.effective_dimensionality,
                        n_properties: ma.n_properties,
                        log_r_squared: ma.log_r_squared,
                    },
                    evidence_ids: vec![],
                    confidence: if ma.log_r_squared > 0.95 { 0.95 } else { 0.7 },
                    lean_theorem: Some("hyper_ribbon_bound_3d".into()),
                    status: ClaimStatus::Proposed,
                    timestamp: ts.clone(),
                    description: format!("Hyper-ribbon for {} (PR={:.2}, log-R²={:.3})",
                        ma.potential, ma.effective_dimensionality, ma.log_r_squared),
                });
            }
            let bound = 3.0_f64;
            if ma.effective_dimensionality <= bound {
                claims.push(AgentClaim {
                    claim_id: generate_record_id(self.agent_id()),
                    agent_id: self.agent_id().into(),
                    claim_type: ClaimType::ParameterBoundSatisfied {
                        observed_pr: ma.effective_dimensionality,
                        bound, n_params: 15, n_observables: ma.n_properties,
                    },
                    evidence_ids: vec![], confidence: 0.9,
                    lean_theorem: Some("syntheticEamSatisfiesBound".into()),
                    status: ClaimStatus::Proposed, timestamp: ts.clone(),
                    description: format!("Parameter-bound satisfied for {}: PR={:.2} ≤ 3",
                        ma.potential, ma.effective_dimensionality),
                });
            }
            if let Some(prev_pr) = self.previous_pr {
                claims.push(AgentClaim {
                    claim_id: generate_record_id(self.agent_id()),
                    agent_id: self.agent_id().into(),
                    claim_type: ClaimType::ManifoldEvolution {
                        batch_id: format!("batch_{}", self.previous_n + 1),
                        pr_before: prev_pr, pr_after: ma.effective_dimensionality,
                        n_entries_before: self.previous_n, n_entries_after: n_entries,
                    },
                    evidence_ids: vec![], confidence: 0.85,
                    lean_theorem: None, status: ClaimStatus::Proposed,
                    timestamp: ts.clone(),
                    description: format!("Manifold evolution: PR {:.2} → {:.2}",
                        prev_pr, ma.effective_dimensionality),
                });
            }
        }
        claims
    }
}

impl Default for ManifoldAgent { fn default() -> Self { Self::new() } }

impl DiscoveryAgent for ManifoldAgent {
    fn agent_id(&self) -> &str { "agent_gamma_manifold" }
    fn capabilities(&self) -> Vec<Capability> { vec![Capability::AnalyzeManifold] }

    fn propose_actions(&self, ledger: &DiscoveryLedger) -> Vec<Action> {
        if ledger.records.len() >= 9 {
            vec![Action::RunManifoldAnalysis { element: "all".into() }]
        } else {
            vec![]
        }
    }

    fn execute(&mut self, action: &Action, ledger: &DiscoveryLedger) -> Result<ActionResult> {
        match action {
            Action::RunManifoldAnalysis { element } => {
                let all: Vec<&BenchmarkRecord> = ledger.records.iter().collect();
                let entries = Self::ledger_to_entries(&all);
                let vectors = manifold::build_error_vectors(&entries, &self.properties);
                let analyses = if vectors.len() >= 3 {
                    manifold::analyze_manifold(&vectors)
                } else { vec![] };

                let claims = self.generate_claims(&analyses, ledger.records.len());
                let mut notes = Vec::new();
                for ma in &analyses {
                    notes.push(format!("{} — PR={:.3}, log-R²={:.3}, ribbon={}",
                        ma.potential, ma.effective_dimensionality, ma.log_r_squared,
                        if ma.is_hyper_ribbon { "YES" } else { "NO" }));
                    self.previous_pr = Some(ma.effective_dimensionality);
                    self.previous_n = ledger.records.len();
                }
                if analyses.is_empty() {
                    notes.push(format!("Insufficient data for {} manifold analysis", element));
                }
                manifold::print_summary(&analyses);

                Ok(ActionResult {
                    agent_id: self.agent_id().into(),
                    action_description: format!("Manifold analysis for {}", element),
                    records_produced: vec![], claims_produced: claims, notes,
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
