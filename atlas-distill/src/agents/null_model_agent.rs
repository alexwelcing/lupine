//! Agent ε: Null Model / Devil's Advocate
//!
//! Generates synthetic random error vectors and computes their manifold
//! statistics to establish a null distribution. Any real claim must
//! beat the null model to be considered evidence.
//!
//! This agent exists to prevent confirmation bias. If the real data
//! produces PR = 1.09 but random data produces PR = 1.15, then
//! the hyper-ribbon claim has no evidential value.

use super::{Action, ActionResult, Capability, DiscoveryAgent};
use crate::manifold::{self, BenchmarkEntry, MaterialErrorVector};
use anyhow::Result;
use lupine_ops::ledger::{
    generate_record_id, now_iso8601, AgentClaim, BenchmarkRecord, ClaimStatus, ClaimType,
    DiscoveryLedger,
};
use rand::Rng;

/// Number of null trials for establishing the null distribution.
/// Reduced from 500 → 50 for fast iterative loops.  For publication-quality
/// null comparisons, override to 500.
const NULL_TRIALS: usize = 50;

pub struct NullModelAgent {
    properties: Vec<String>,
    null_run_complete: bool,
}

impl NullModelAgent {
    pub fn new() -> Self {
        Self {
            properties: vec!["C11".into(), "C12".into(), "C44".into()],
            null_run_complete: false,
        }
    }
}

impl Default for NullModelAgent {
    fn default() -> Self {
        Self::new()
    }
}

/// Result of a null model comparison.
#[derive(Debug)]
struct NullComparison {
    potential: String,
    observed_pr: f64,
    null_mean_pr: f64,
    null_std_pr: f64,
    null_p05_pr: f64, // 5th percentile — below this is significant
    null_p95_pr: f64,
    p_value: f64,
    is_significant: bool,
    observed_log_r2: f64,
    null_mean_log_r2: f64,
    null_p95_log_r2: f64,
    log_r2_significant: bool,
}

impl DiscoveryAgent for NullModelAgent {
    fn agent_id(&self) -> &str {
        "agent_epsilon_null"
    }
    fn capabilities(&self) -> Vec<Capability> {
        vec![Capability::AnalyzeManifold]
    }

    fn propose_actions(&self, ledger: &DiscoveryLedger) -> Vec<Action> {
        if !self.null_run_complete && ledger.records.len() >= 9 {
            vec![Action::RunManifoldAnalysis {
                element: "null_comparison".into(),
            }]
        } else {
            vec![]
        }
    }

    fn execute(&mut self, action: &Action, ledger: &DiscoveryLedger) -> Result<ActionResult> {
        match action {
            Action::RunManifoldAnalysis { .. } => {
                let ts = now_iso8601();
                let mut claims = Vec::new();
                let mut notes = Vec::new();

                // Convert ledger records to benchmark entries
                let all_records: Vec<&BenchmarkRecord> = ledger.records.iter().collect();
                let entries: Vec<BenchmarkEntry> = all_records
                    .iter()
                    .map(|r| BenchmarkEntry {
                        material: r.element.clone(),
                        potential: r.potential_label.clone(),
                        property: r.property.clone(),
                        reference: r.reference,
                        predicted: r.predicted,
                        unit: r.unit.clone(),
                    })
                    .collect();

                let vectors = manifold::build_error_vectors(&entries, &self.properties);
                if vectors.len() < 3 {
                    notes.push("Insufficient data for null model comparison".into());
                    self.null_run_complete = true;
                    return Ok(ActionResult {
                        agent_id: self.agent_id().into(),
                        action_description: "Null model comparison (insufficient data)".into(),
                        records_produced: vec![],
                        claims_produced: vec![],
                        notes,
                    });
                }

                // Run real analysis
                let real_analyses = manifold::analyze_manifold(&vectors);

                // Group vectors by potential for per-potential null tests
                let mut by_potential: std::collections::HashMap<String, Vec<&MaterialErrorVector>> =
                    std::collections::HashMap::new();
                for v in &vectors {
                    by_potential.entry(v.potential.clone()).or_default().push(v);
                }

                let mut comparisons = Vec::new();

                for (potential, group) in &by_potential {
                    let n_materials = group.len();
                    let n_props = self.properties.len();

                    if n_materials < 3 {
                        notes.push(format!(
                            "⚠ {}: only {} materials — skipping (need ≥3)",
                            potential, n_materials
                        ));
                        continue;
                    }

                    // Compute observed statistics
                    let real_ma = real_analyses.iter().find(|a| &a.potential == potential);
                    let (observed_pr, observed_log_r2) = match real_ma {
                        Some(ma) => (ma.effective_dimensionality, ma.log_r_squared),
                        None => continue,
                    };

                    // Generate null distribution:
                    // For each trial, create random error vectors with the SAME
                    // dimensions (n_materials × n_properties) but drawn from
                    // i.i.d. normal distribution.
                    let mut null_prs = Vec::with_capacity(NULL_TRIALS);
                    let mut null_log_r2s = Vec::with_capacity(NULL_TRIALS);
                    let mut rng = rand::thread_rng();

                    // Compute the actual error scale to match
                    let error_scale: f64 = group
                        .iter()
                        .flat_map(|v| v.errors.iter())
                        .map(|e| e * e)
                        .sum::<f64>()
                        .sqrt()
                        / (n_materials * n_props) as f64;

                    for _ in 0..NULL_TRIALS {
                        // Generate random error vectors
                        let random_vectors: Vec<MaterialErrorVector> = (0..n_materials)
                            .map(|i| MaterialErrorVector {
                                material: format!("null_{}", i),
                                potential: potential.clone(),
                                errors: (0..n_props)
                                    .map(|_| rng.gen::<f64>() * 2.0 * error_scale - error_scale)
                                    .collect(),
                                properties: self.properties.clone(),
                            })
                            .collect();

                        let analyses = manifold::analyze_manifold(&random_vectors);
                        if let Some(ma) = analyses.first() {
                            null_prs.push(ma.effective_dimensionality);
                            null_log_r2s.push(ma.log_r_squared);
                        }
                    }

                    if null_prs.is_empty() {
                        notes.push(format!("⚠ {}: null trials failed", potential));
                        continue;
                    }

                    null_prs.sort_by(|a, b| a.partial_cmp(b).unwrap());
                    null_log_r2s.sort_by(|a, b| a.partial_cmp(b).unwrap());

                    let null_mean_pr = null_prs.iter().sum::<f64>() / null_prs.len() as f64;
                    let null_var_pr = null_prs
                        .iter()
                        .map(|p| (p - null_mean_pr).powi(2))
                        .sum::<f64>()
                        / null_prs.len() as f64;
                    let null_std_pr = null_var_pr.sqrt();
                    let p05_idx = (0.05 * null_prs.len() as f64) as usize;
                    let p95_idx =
                        (0.95 * null_prs.len() as f64).min(null_prs.len() as f64 - 1.0) as usize;
                    let null_p05_pr = null_prs[p05_idx];
                    let null_p95_pr = null_prs[p95_idx];

                    let null_mean_log_r2 =
                        null_log_r2s.iter().sum::<f64>() / null_log_r2s.len() as f64;
                    let null_p95_log_r2 = null_log_r2s[p95_idx.min(null_log_r2s.len() - 1)];

                    // p-value: fraction of null trials with PR ≤ observed
                    let p_value = null_prs.iter().filter(|&&p| p <= observed_pr).count() as f64
                        / null_prs.len() as f64;

                    let is_significant = observed_pr < null_p05_pr; // observed is LOWER than null
                    let log_r2_significant = observed_log_r2 > null_p95_log_r2;

                    comparisons.push(NullComparison {
                        potential: potential.clone(),
                        observed_pr,
                        null_mean_pr,
                        null_std_pr,
                        null_p05_pr,
                        null_p95_pr,
                        p_value,
                        is_significant,
                        observed_log_r2,
                        null_mean_log_r2,
                        null_p95_log_r2,
                        log_r2_significant,
                    });
                }

                // Report
                eprintln!();
                eprintln!("  ╔════════════════════════════════════════════════════════════╗");
                eprintln!("  ║  Null Model Comparison (Devil's Advocate)                  ║");
                eprintln!(
                    "  ║  {} trials per potential                                   ",
                    NULL_TRIALS
                );
                eprintln!("  ╚════════════════════════════════════════════════════════════╝");

                for c in &comparisons {
                    eprintln!();
                    eprintln!("  {} ─────────────────────────────────────", c.potential);
                    eprintln!("    Observed PR:     {:.3}", c.observed_pr);
                    eprintln!(
                        "    Null mean PR:    {:.3} ± {:.3}",
                        c.null_mean_pr, c.null_std_pr
                    );
                    eprintln!(
                        "    Null 5th-95th:   [{:.3}, {:.3}]",
                        c.null_p05_pr, c.null_p95_pr
                    );
                    eprintln!("    p-value:         {:.4}", c.p_value);
                    if c.is_significant {
                        eprintln!("    ✅ PR is significantly BELOW null (p < 0.05)");
                    } else {
                        eprintln!("    ❌ PR is NOT significantly below null — hyper-ribbon claim has NO evidential value");
                    }
                    eprintln!();
                    eprintln!("    Observed log-R²: {:.3}", c.observed_log_r2);
                    eprintln!("    Null mean R²:    {:.3}", c.null_mean_log_r2);
                    eprintln!("    Null 95th R²:    {:.3}", c.null_p95_log_r2);
                    if c.log_r2_significant {
                        eprintln!("    ✅ Log-linearity exceeds null expectation");
                    } else {
                        eprintln!("    ❌ Log-linearity does NOT exceed null — geometric series claim is hollow");
                    }

                    // Generate claims based on comparison
                    if c.is_significant {
                        claims.push(AgentClaim {
                            claim_id: generate_record_id(self.agent_id()),
                            agent_id: self.agent_id().into(),
                            claim_type: ClaimType::HyperRibbonConfirmed {
                                participation_ratio: c.observed_pr,
                                n_properties: self.properties.len(),
                                log_r_squared: c.observed_log_r2,
                            },
                            evidence_ids: vec![],
                            confidence: 1.0 - c.p_value,
                            lean_theorem: None,
                            status: ClaimStatus::Confirmed,
                            timestamp: ts.clone(),
                            description: format!(
                                "NULL-VALIDATED: {} hyper-ribbon (PR={:.3}, null mean={:.3}, p={:.4})",
                                c.potential, c.observed_pr, c.null_mean_pr, c.p_value
                            ),
                        });
                        notes.push(format!(
                            "✅ {}: PR={:.3} is significantly below null {:.3} (p={:.4})",
                            c.potential, c.observed_pr, c.null_mean_pr, c.p_value
                        ));
                    } else {
                        // REFUTE the hyper-ribbon claim
                        claims.push(AgentClaim {
                            claim_id: generate_record_id(self.agent_id()),
                            agent_id: self.agent_id().into(),
                            claim_type: ClaimType::HyperRibbonConfirmed {
                                participation_ratio: c.observed_pr,
                                n_properties: self.properties.len(),
                                log_r_squared: c.observed_log_r2,
                            },
                            evidence_ids: vec![],
                            confidence: 1.0 - c.p_value,
                            lean_theorem: None,
                            status: ClaimStatus::Refuted,
                            timestamp: ts.clone(),
                            description: format!(
                                "REFUTED by null model: {} PR={:.3} is not below null mean {:.3} (p={:.4}). Random data produces similar structure.",
                                c.potential, c.observed_pr, c.null_mean_pr, c.p_value
                            ),
                        });
                        notes.push(format!(
                            "❌ {}: PR={:.3} is NOT below null {:.3} (p={:.4}) — REFUTED",
                            c.potential, c.observed_pr, c.null_mean_pr, c.p_value
                        ));
                    }
                }

                if comparisons.is_empty() {
                    notes.push("No potentials had enough data for null comparison".into());
                }

                self.null_run_complete = true;

                Ok(ActionResult {
                    agent_id: self.agent_id().into(),
                    action_description: "Null model comparison".into(),
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
