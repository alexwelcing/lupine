//! Agent α: LAMMPS Runner (OpenKIM Ingestion)
//!
//! Ingests real published LAMMPS/OpenKIM validation data from the NIST index.

use super::{Action, ActionResult, Capability, DiscoveryAgent};
use anyhow::Result;
use lupine_ops::ledger::{
    BenchmarkRecord, DiscoveryLedger, Provenance, generate_record_id, now_iso8601,
};
use std::path::PathBuf;

pub struct LammpsAgent {
    target_elements: Vec<String>,
    seeded: bool,
}

impl LammpsAgent {
    pub fn new(target_elements: Vec<String>) -> Self {
        Self { target_elements, seeded: false }
    }
}

impl DiscoveryAgent for LammpsAgent {
    fn agent_id(&self) -> &str { "agent_alpha_lammps" }
    fn capabilities(&self) -> Vec<Capability> { vec![Capability::RunLammps, Capability::FitModels] }

    fn propose_actions(&self, ledger: &DiscoveryLedger) -> Vec<Action> {
        if !self.seeded && ledger.records.is_empty() {
            vec![Action::EvaluatePotential {
                nist_id: "openkim".into(),
                element: "all".into(),
                properties: vec!["C11".into(), "C12".into(), "C44".into()],
            }]
        } else {
            vec![]
        }
    }

    fn execute(&mut self, action: &Action, _ledger: &DiscoveryLedger) -> Result<ActionResult> {
        match action {
            Action::EvaluatePotential { .. } => {
                let ts = now_iso8601();
                
                let mut records = Vec::new();
                let csv_path = PathBuf::from("atlas-distill/benchmarks/nist_populated_all.csv");
                
                if !csv_path.exists() {
                    return Ok(ActionResult {
                        agent_id: self.agent_id().into(),
                        action_description: "Failed to find OpenKIM data".into(),
                        records_produced: vec![], claims_produced: vec![], 
                        notes: vec![format!("Could not find {:?}", csv_path)],
                    });
                }

                let mut rdr = csv::Reader::from_path(csv_path)?;
                for result in rdr.records() {
                    let record = result?;
                    // CSV format: material,potential,property,reference,predicted,unit,nist_id,pair_style,doi,kim_model
                    let material = &record[0];
                    let potential_label = &record[1];
                    let property = &record[2];
                    let reference: f64 = record[3].parse().unwrap_or(0.0);
                    let predicted: f64 = record[4].parse().unwrap_or(0.0);
                    let unit = &record[5];
                    let nist_id = &record[6];
                    let pair_style = &record[7];
                    let _doi = &record[8];
                    let kim_model = &record[9];

                    if !self.target_elements.is_empty() && !self.target_elements.iter().any(|t| t == material) {
                        continue;
                    }

                    records.push(BenchmarkRecord {
                        record_id: generate_record_id(self.agent_id()),
                        potential_id: if nist_id.is_empty() { kim_model.to_string() } else { nist_id.to_string() },
                        potential_label: potential_label.to_string(),
                        pair_style: pair_style.to_string(),
                        element: material.to_string(),
                        property: property.to_string(),
                        reference,
                        predicted,
                        unit: unit.to_string(),
                        provenance: Provenance::OpenKimTest {
                            model_id: kim_model.to_string(),
                            test_id: "nist-elastic-fetch".to_string(),
                        },
                        agent_id: self.agent_id().into(),
                        timestamp: ts.clone(),
                    });
                }

                let n = records.len();
                self.seeded = true;

                Ok(ActionResult {
                    agent_id: self.agent_id().into(),
                    action_description: "Ingest OpenKIM benchmark data".into(),
                    records_produced: records,
                    claims_produced: vec![],
                    notes: vec![format!("Seeded {} benchmark records from real published OpenKIM tests", n)],
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
