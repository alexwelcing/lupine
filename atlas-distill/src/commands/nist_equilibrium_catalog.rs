//! Build a viewer-ready equilibrium catalog from the local NIST benchmark CSV.
//!
//! The browser should not rediscover reference values from arbitrary CSV rows.
//! Rust owns the normalized contract that lines up NIST potential ids with
//! known equilibrium targets and predicted potential values.

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use anyhow::{bail, Context, Result};
use clap::Args;
use serde::Serialize;

#[derive(Debug, Clone, Args)]
pub struct NistEquilibriumCatalogArgs {
    /// CSV with material,potential,property,reference,predicted,unit,nist_id,doi,pair_style.
    #[arg(long, default_value = "nist_benchmark.csv")]
    pub benchmark_csv: PathBuf,
    /// Output JSON path for the viewer, usually atlas/atlas-view/apps/web/public/nist/equilibrium_catalog.json.
    #[arg(long)]
    pub output: PathBuf,
}

#[derive(Debug, Clone, Serialize)]
struct EquilibriumCatalog {
    schema: String,
    source_csv: String,
    entry_count: usize,
    entries: Vec<EquilibriumCatalogEntry>,
}

#[derive(Debug, Clone, Serialize)]
struct EquilibriumCatalogEntry {
    id: String,
    material: String,
    potential: String,
    pair_style: String,
    doi: String,
    reference: EquilibriumValues,
    predicted: EquilibriumValues,
    available_properties: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize)]
struct EquilibriumValues {
    #[serde(skip_serializing_if = "Option::is_none")]
    lattice_a_angstrom: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    energy_ev_per_atom: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    elastic_constants_gpa: Option<ElasticConstants>,
}

#[derive(Debug, Clone, Copy, Default, Serialize)]
struct ElasticConstants {
    #[serde(skip_serializing_if = "Option::is_none")]
    c11: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    c12: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    c44: Option<f64>,
}

#[derive(Debug, Clone)]
struct MutableEntry {
    id: String,
    material: String,
    potential: String,
    pair_style: String,
    doi: String,
    reference: EquilibriumValues,
    predicted: EquilibriumValues,
    available_properties: Vec<String>,
}

#[derive(Debug, Clone)]
struct BenchmarkRow {
    material: String,
    potential: String,
    property: String,
    reference: f64,
    predicted: f64,
    unit: String,
    nist_id: String,
    doi: String,
    pair_style: String,
}

pub fn run(args: NistEquilibriumCatalogArgs) -> Result<()> {
    let catalog = build_catalog(&args.benchmark_csv)?;
    if let Some(parent) = args.output.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&args.output, serde_json::to_string_pretty(&catalog)?)?;
    Ok(())
}

fn build_catalog(path: &Path) -> Result<EquilibriumCatalog> {
    let rows = load_rows(path)?;
    let mut entries: HashMap<String, MutableEntry> = HashMap::new();

    for row in rows {
        let entry = entries
            .entry(row.nist_id.clone())
            .or_insert_with(|| MutableEntry {
                id: row.nist_id.clone(),
                material: row.material.clone(),
                potential: row.potential.clone(),
                pair_style: row.pair_style.clone(),
                doi: row.doi.clone(),
                reference: EquilibriumValues::default(),
                predicted: EquilibriumValues::default(),
                available_properties: Vec::new(),
            });
        apply_property(entry, &row);
    }

    let mut entries: Vec<EquilibriumCatalogEntry> = entries
        .into_values()
        .filter(|entry| entry.reference.lattice_a_angstrom.is_some())
        .map(|mut entry| {
            entry.available_properties.sort();
            entry.available_properties.dedup();
            EquilibriumCatalogEntry {
                id: entry.id,
                material: entry.material,
                potential: entry.potential,
                pair_style: entry.pair_style,
                doi: entry.doi,
                reference: entry.reference,
                predicted: entry.predicted,
                available_properties: entry.available_properties,
            }
        })
        .collect();
    entries.sort_by(|a, b| {
        a.material
            .cmp(&b.material)
            .then_with(|| a.potential.cmp(&b.potential))
            .then_with(|| a.id.cmp(&b.id))
    });

    Ok(EquilibriumCatalog {
        schema: "lupine.nist.equilibrium_catalog.v1".to_string(),
        source_csv: path.display().to_string(),
        entry_count: entries.len(),
        entries,
    })
}

fn load_rows(path: &Path) -> Result<Vec<BenchmarkRow>> {
    let text = fs::read_to_string(path)
        .with_context(|| format!("read NIST benchmark CSV {}", path.display()))?;
    let mut lines = text.lines();
    let header = lines.next().context("missing NIST benchmark CSV header")?;
    let columns: Vec<&str> = header.split(',').collect();
    let expected = [
        "material",
        "potential",
        "property",
        "reference",
        "predicted",
        "unit",
        "nist_id",
        "doi",
        "pair_style",
    ];
    if columns != expected {
        bail!("unexpected NIST benchmark CSV header");
    }

    let mut rows = Vec::new();
    for (idx, line) in lines.enumerate() {
        if line.trim().is_empty() {
            continue;
        }
        let fields: Vec<&str> = line.split(',').collect();
        if fields.len() != expected.len() {
            bail!(
                "row {} has {} columns, expected {}",
                idx + 2,
                fields.len(),
                expected.len()
            );
        }
        rows.push(BenchmarkRow {
            material: fields[0].to_string(),
            potential: fields[1].to_string(),
            property: fields[2].to_string(),
            reference: fields[3]
                .parse()
                .with_context(|| format!("row {} reference", idx + 2))?,
            predicted: fields[4]
                .parse()
                .with_context(|| format!("row {} predicted", idx + 2))?,
            unit: fields[5].to_string(),
            nist_id: fields[6].to_string(),
            doi: fields[7].to_string(),
            pair_style: fields[8].to_string(),
        });
    }
    Ok(rows)
}

fn apply_property(entry: &mut MutableEntry, row: &BenchmarkRow) {
    if !entry.available_properties.contains(&row.property) {
        entry.available_properties.push(row.property.clone());
    }

    match (row.property.as_str(), row.unit.as_str()) {
        ("a0", "A") => {
            entry.reference.lattice_a_angstrom = Some(row.reference);
            entry.predicted.lattice_a_angstrom = Some(row.predicted);
        }
        ("Ecoh", "eV/atom") => {
            entry.reference.energy_ev_per_atom = Some(row.reference);
            entry.predicted.energy_ev_per_atom = Some(row.predicted);
        }
        ("C11", "GPa") => {
            ensure_elastic(&mut entry.reference).c11 = Some(row.reference);
            ensure_elastic(&mut entry.predicted).c11 = Some(row.predicted);
        }
        ("C12", "GPa") => {
            ensure_elastic(&mut entry.reference).c12 = Some(row.reference);
            ensure_elastic(&mut entry.predicted).c12 = Some(row.predicted);
        }
        ("C44", "GPa") => {
            ensure_elastic(&mut entry.reference).c44 = Some(row.reference);
            ensure_elastic(&mut entry.predicted).c44 = Some(row.predicted);
        }
        _ => {}
    }
}

fn ensure_elastic(values: &mut EquilibriumValues) -> &mut ElasticConstants {
    if values.elastic_constants_gpa.is_none() {
        values.elastic_constants_gpa = Some(ElasticConstants::default());
    }
    values
        .elastic_constants_gpa
        .as_mut()
        .expect("elastic exists")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_catalog_from_rows() {
        let rows = vec![
            "material,potential,property,reference,predicted,unit,nist_id,doi,pair_style",
            "Al,Mishin-1999,a0,4.05,4.050004,A,1999--Mishin-Y--Al--LAMMPS--ipr1,10.1,eam/alloy",
            "Al,Mishin-1999,Ecoh,-3.39,-3.36,eV/atom,1999--Mishin-Y--Al--LAMMPS--ipr1,10.1,eam/alloy",
            "Al,Mishin-1999,C11,108.2,113.8,GPa,1999--Mishin-Y--Al--LAMMPS--ipr1,10.1,eam/alloy",
        ]
        .join("\n");
        let path = std::env::temp_dir().join(format!(
            "nist-equilibrium-catalog-{}.csv",
            std::process::id()
        ));
        fs::write(&path, rows).unwrap();
        let catalog = build_catalog(&path).unwrap();
        let _ = fs::remove_file(path);

        assert_eq!(catalog.entry_count, 1);
        assert_eq!(catalog.entries[0].material, "Al");
        assert_eq!(catalog.entries[0].reference.lattice_a_angstrom, Some(4.05));
        assert_eq!(
            catalog.entries[0]
                .predicted
                .elastic_constants_gpa
                .as_ref()
                .and_then(|elastic| elastic.c11),
            Some(113.8)
        );
    }
}
