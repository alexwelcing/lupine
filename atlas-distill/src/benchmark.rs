//! Generic benchmark database ingestion.
//!
//! Loads multi-potential benchmark data from CSV or JSON files,
//! normalizes formats, and prepares data for manifold analysis,
//! meta-analysis, and causal inference.
//!
//! Expected CSV format:
//!   material,potential,property,reference,predicted,unit
//!   Al,EAM,C11,108.2,102.1,GPa
//!   Al,EAM,C12,61.3,57.8,GPa
//!   ...
//!
//! Expected JSON format: array of BenchmarkEntry objects.

use crate::manifold::BenchmarkEntry;
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;

/// A row in a benchmark CSV file.
#[derive(Debug, Clone, Deserialize)]
pub struct BenchmarkRow {
    pub material: String,
    pub potential: String,
    pub property: String,
    #[serde(deserialize_with = "deserialize_f64")]
    pub reference: f64,
    #[serde(deserialize_with = "deserialize_f64")]
    pub predicted: f64,
    pub unit: String,
}

fn deserialize_f64<'de, D>(deserializer: D) -> std::result::Result<f64, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::de::Error;
    let s = String::deserialize(deserializer)?;
    s.parse::<f64>().map_err(D::Error::custom)
}

/// Load benchmark entries from a CSV file.
pub fn load_csv(path: &Path) -> Result<Vec<BenchmarkEntry>> {
    let content = std::fs::read_to_string(path)
        .with_context(|| format!("Reading benchmark CSV: {}", path.display()))?;

    let mut entries = Vec::new();
    let mut rdr = csv::Reader::from_reader(content.as_bytes());

    for result in rdr.deserialize() {
        let row: BenchmarkRow = result.context("Parsing CSV row")?;
        entries.push(BenchmarkEntry {
            material: row.material,
            potential: row.potential,
            property: row.property,
            reference: row.reference,
            predicted: row.predicted,
            unit: row.unit,
        });
    }

    Ok(entries)
}

/// Load benchmark entries from a JSON file.
pub fn load_json(path: &Path) -> Result<Vec<BenchmarkEntry>> {
    let content = std::fs::read_to_string(path)
        .with_context(|| format!("Reading benchmark JSON: {}", path.display()))?;
    let entries: Vec<BenchmarkEntry> =
        serde_json::from_str(&content).context("Parsing benchmark JSON")?;
    Ok(entries)
}

/// Auto-detect format and load benchmark entries.
pub fn load_auto(path: &Path) -> Result<Vec<BenchmarkEntry>> {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "csv" => load_csv(path),
        "json" => load_json(path),
        _ => anyhow::bail!(
            "Unknown benchmark file format: {}. Use .csv or .json",
            path.display()
        ),
    }
}

/// Summary statistics for a loaded benchmark database.
#[derive(Debug, Clone, Serialize)]
pub struct BenchmarkSummary {
    pub n_entries: usize,
    pub n_materials: usize,
    pub n_potentials: usize,
    pub n_properties: usize,
    pub materials: Vec<String>,
    pub potentials: Vec<String>,
    pub properties: Vec<String>,
    pub completeness: f64, // fraction of (material, potential, property) combinations present
}

/// Summarize a benchmark database.
pub fn summarize(entries: &[BenchmarkEntry]) -> BenchmarkSummary {
    let mut materials = HashMap::new();
    let mut potentials = HashMap::new();
    let mut properties = HashMap::new();

    for e in entries {
        *materials.entry(e.material.clone()).or_insert(0) += 1;
        *potentials.entry(e.potential.clone()).or_insert(0) += 1;
        *properties.entry(e.property.clone()).or_insert(0) += 1;
    }

    let n_materials = materials.len();
    let n_potentials = potentials.len();
    let n_properties = properties.len();
    let n_entries = entries.len();

    let total_combinations = n_materials * n_potentials * n_properties;
    let observed_combinations: usize = entries
        .iter()
        .map(|e| (e.material.clone(), e.potential.clone(), e.property.clone()))
        .collect::<std::collections::HashSet<_>>()
        .len();

    let completeness = if total_combinations > 0 {
        observed_combinations as f64 / total_combinations as f64
    } else {
        0.0
    };

    let mut mats: Vec<String> = materials.keys().cloned().collect();
    mats.sort();
    let mut pots: Vec<String> = potentials.keys().cloned().collect();
    pots.sort();
    let mut props: Vec<String> = properties.keys().cloned().collect();
    props.sort();

    BenchmarkSummary {
        n_entries,
        n_materials,
        n_potentials,
        n_properties,
        materials: mats,
        potentials: pots,
        properties: props,
        completeness,
    }
}

/// Export benchmark entries to a normalized CSV.
pub fn export_csv(entries: &[BenchmarkEntry], path: &Path) -> Result<()> {
    let mut wtr = csv::Writer::from_path(path)
        .with_context(|| format!("Creating CSV writer for {}", path.display()))?;

    wtr.write_record(&["material", "potential", "property", "reference", "predicted", "unit"])?;
    for e in entries {
        wtr.write_record(&[
            &e.material,
            &e.potential,
            &e.property,
            &e.reference.to_string(),
            &e.predicted.to_string(),
            &e.unit,
        ])?;
    }
    wtr.flush()?;
    Ok(())
}

/// Print benchmark summary to stderr.
pub fn print_summary(summary: &BenchmarkSummary) {
    eprintln!();
    eprintln!("  ╔════════════════════════════════════════════════════════════╗");
    eprintln!("  ║  Benchmark Database Summary                                ║");
    eprintln!("  ╚════════════════════════════════════════════════════════════╝");
    eprintln!();
    eprintln!("  Entries:      {}", summary.n_entries);
    eprintln!("  Materials:    {}  {:?}", summary.n_materials, summary.materials);
    eprintln!("  Potentials:   {}  {:?}", summary.n_potentials, summary.potentials);
    eprintln!("  Properties:   {}  {:?}", summary.n_properties, summary.properties);
    eprintln!("  Completeness: {:.1}%", summary.completeness * 100.0);
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn test_load_csv_roundtrip() {
        let entries = vec![
            BenchmarkEntry {
                material: "Al".to_string(),
                potential: "EAM".to_string(),
                property: "C11".to_string(),
                reference: 108.2,
                predicted: 102.1,
                unit: "GPa".to_string(),
            },
            BenchmarkEntry {
                material: "Cu".to_string(),
                potential: "EAM".to_string(),
                property: "C11".to_string(),
                reference: 168.4,
                predicted: 175.8,
                unit: "GPa".to_string(),
            },
        ];

        let tmp = std::env::temp_dir().join("atlas_benchmark_test.csv");
        export_csv(&entries, &tmp).unwrap();
        let loaded = load_csv(&tmp).unwrap();
        assert_eq!(loaded.len(), 2);
        assert_eq!(loaded[0].material, "Al");
        assert_eq!(loaded[1].reference, 168.4);
        let _ = std::fs::remove_file(&tmp);
    }

    #[test]
    fn test_summarize() {
        let entries = vec![
            BenchmarkEntry {
                material: "Al".to_string(),
                potential: "EAM".to_string(),
                property: "C11".to_string(),
                reference: 108.2,
                predicted: 102.1,
                unit: "GPa".to_string(),
            },
            BenchmarkEntry {
                material: "Al".to_string(),
                potential: "EAM".to_string(),
                property: "C12".to_string(),
                reference: 61.3,
                predicted: 57.8,
                unit: "GPa".to_string(),
            },
            BenchmarkEntry {
                material: "Cu".to_string(),
                potential: "EAM".to_string(),
                property: "C11".to_string(),
                reference: 168.4,
                predicted: 175.8,
                unit: "GPa".to_string(),
            },
        ];

        let summary = summarize(&entries);
        assert_eq!(summary.n_entries, 3);
        assert_eq!(summary.n_materials, 2);
        assert_eq!(summary.n_potentials, 1);
        assert_eq!(summary.n_properties, 2);
        assert!(summary.completeness < 1.0); // missing Cu/C12
    }
}
