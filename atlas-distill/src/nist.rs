//! NIST Interatomic Potentials Repository catalog.
//!
//! Loads the master_index.json from the local NIST IPR mirror and provides
//! queryable access to 675 LAMMPS potential implementations with full
//! provenance (DOIs, pair_styles, element coverage, artifact URLs).
//!
//! This module bridges the mirrored NIST data into the atlas-distill
//! benchmark and validation pipeline, enabling real potential IDs to
//! replace hardcoded toy labels.

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;

// ───────────────────────────────────────────────────────────
// Data types (match master_index.json schema exactly)
// ───────────────────────────────────────────────────────────

/// A single artifact (parameter file) associated with a potential.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NistArtifact {
    pub url: String,
    pub filename: String,
    #[serde(default)]
    pub label: String,
}

/// A LAMMPS potential implementation from the NIST IPR.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NistPotential {
    /// Full implementation ID, e.g. "1999--Mishin-Y--Al--LAMMPS--ipr1"
    pub id: String,
    /// Parent potential ID, e.g. "1999--Mishin-Y--Al"
    pub potid: String,
    /// LAMMPS pair_style, e.g. "eam/alloy", "meam", "tersoff"
    pub pair_style: String,
    /// LAMMPS unit system (almost always "metal")
    #[serde(default)]
    pub units: String,
    /// LAMMPS atom_style (almost always "atomic")
    #[serde(default)]
    pub atom_style: String,
    /// Implementation status (usually empty)
    #[serde(default)]
    pub status: String,
    /// Elements this potential covers, e.g. ["Al"] or ["Ni", "Al"]
    pub elements: Vec<String>,
    /// Atom symbols (usually same as elements)
    #[serde(default)]
    pub symbols: Vec<String>,
    /// Resolved DOIs from the parent scientific record
    #[serde(default)]
    pub dois: Vec<String>,
    /// REST API URL for this implementation
    #[serde(default)]
    pub url: String,
    /// REST API URL for the parent potential record
    #[serde(default)]
    pub poturl: String,
    /// Downloadable parameter files
    #[serde(default)]
    pub artifacts: Vec<NistArtifact>,
    /// Number of parameter files
    #[serde(default)]
    pub file_count: usize,
}

impl NistPotential {
    /// Short human-readable label derived from potid.
    ///
    /// "1999--Mishin-Y--Al" → "Mishin-1999"
    pub fn short_label(&self) -> String {
        let parts: Vec<&str> = self.potid.split("--").collect();
        if parts.len() >= 2 {
            let year = parts[0];
            // Extract last name from author field (first author)
            let author = parts[1].split('-').next().unwrap_or(parts[1]);
            format!("{}-{}", author, year)
        } else {
            self.potid.clone()
        }
    }

    /// Whether this potential covers exactly one element.
    pub fn is_single_element(&self) -> bool {
        self.elements.len() == 1
    }

    /// Whether this is an EAM-family potential (eam, eam/alloy, eam/fs, eam/cd, eam/he).
    pub fn is_eam_family(&self) -> bool {
        self.pair_style.starts_with("eam")
    }

    /// Whether this is a MEAM-family potential (meam, meam/spline).
    pub fn is_meam_family(&self) -> bool {
        self.pair_style.starts_with("meam")
    }

    /// The primary DOI, if available.
    pub fn primary_doi(&self) -> Option<&str> {
        self.dois.first().map(|s| s.as_str())
    }

    /// Year extracted from the ID (first segment before "--").
    pub fn year(&self) -> Option<u32> {
        self.potid.split("--").next()?.parse().ok()
    }
}

// ───────────────────────────────────────────────────────────
// Catalog
// ───────────────────────────────────────────────────────────

/// Summary statistics for a loaded NIST catalog.
#[derive(Debug, Clone, Serialize)]
pub struct NistSummary {
    pub total_potentials: usize,
    pub single_element: usize,
    pub multi_element: usize,
    pub unique_elements: usize,
    pub unique_pair_styles: usize,
    pub with_doi: usize,
    pub pair_style_counts: Vec<(String, usize)>,
    pub element_counts: Vec<(String, usize)>,
}

/// Queryable catalog of NIST IPR potentials.
pub struct NistCatalog {
    potentials: Vec<NistPotential>,
    /// element → indices into potentials
    by_element: HashMap<String, Vec<usize>>,
    /// pair_style → indices into potentials
    by_pair_style: HashMap<String, Vec<usize>>,
}

impl NistCatalog {
    /// Load the catalog from a master_index.json file.
    pub fn load(path: &Path) -> Result<Self> {
        let content = std::fs::read_to_string(path)
            .with_context(|| format!("Reading NIST index: {}", path.display()))?;
        let potentials: Vec<NistPotential> =
            serde_json::from_str(&content).context("Parsing NIST master_index.json")?;

        let mut by_element: HashMap<String, Vec<usize>> = HashMap::new();
        let mut by_pair_style: HashMap<String, Vec<usize>> = HashMap::new();

        for (i, pot) in potentials.iter().enumerate() {
            for el in &pot.elements {
                by_element.entry(el.clone()).or_default().push(i);
            }
            by_pair_style
                .entry(pot.pair_style.clone())
                .or_default()
                .push(i);
        }

        Ok(Self {
            potentials,
            by_element,
            by_pair_style,
        })
    }

    /// Total number of potentials in the catalog.
    pub fn len(&self) -> usize {
        self.potentials.len()
    }

    /// All potentials covering a given element.
    pub fn by_element(&self, element: &str) -> Vec<&NistPotential> {
        self.by_element
            .get(element)
            .map(|indices| indices.iter().map(|&i| &self.potentials[i]).collect())
            .unwrap_or_default()
    }

    /// All potentials using a given pair_style.
    pub fn by_pair_style(&self, pair_style: &str) -> Vec<&NistPotential> {
        self.by_pair_style
            .get(pair_style)
            .map(|indices| indices.iter().map(|&i| &self.potentials[i]).collect())
            .unwrap_or_default()
    }

    /// Single-element potentials for a given element.
    pub fn single_element(&self, element: &str) -> Vec<&NistPotential> {
        self.by_element(element)
            .into_iter()
            .filter(|p| p.is_single_element())
            .collect()
    }

    /// Potentials covering exactly the given set of elements (order-independent).
    pub fn by_elements_exact(&self, elements: &[&str]) -> Vec<&NistPotential> {
        let mut target: Vec<&str> = elements.to_vec();
        target.sort();

        self.potentials
            .iter()
            .filter(|p| {
                let mut els: Vec<&str> = p.elements.iter().map(|s| s.as_str()).collect();
                els.sort();
                els == target
            })
            .collect()
    }

    /// EAM-family single-element potentials for a given element.
    pub fn eam_for_element(&self, element: &str) -> Vec<&NistPotential> {
        self.single_element(element)
            .into_iter()
            .filter(|p| p.is_eam_family())
            .collect()
    }

    /// MEAM-family single-element potentials for a given element.
    pub fn meam_for_element(&self, element: &str) -> Vec<&NistPotential> {
        self.single_element(element)
            .into_iter()
            .filter(|p| p.is_meam_family())
            .collect()
    }

    /// Get a specific potential by its full ID.
    pub fn get(&self, id: &str) -> Option<&NistPotential> {
        self.potentials.iter().find(|p| p.id == id)
    }

    /// Find a potential by its short label (e.g. "Mishin-1999").
    /// Returns the first match; labels are not guaranteed unique.
    pub fn find_by_label(&self, label: &str) -> Option<&NistPotential> {
        self.potentials.iter().find(|p| p.short_label() == label)
    }

    /// All unique elements in the catalog.
    pub fn elements(&self) -> Vec<&str> {
        let mut els: Vec<&str> = self.by_element.keys().map(|s| s.as_str()).collect();
        els.sort();
        els
    }

    /// All unique pair_styles in the catalog.
    pub fn pair_styles(&self) -> Vec<&str> {
        let mut ps: Vec<&str> = self.by_pair_style.keys().map(|s| s.as_str()).collect();
        ps.sort();
        ps
    }

    /// Compute summary statistics.
    pub fn summary(&self) -> NistSummary {
        let single = self.potentials.iter().filter(|p| p.is_single_element()).count();
        let with_doi = self.potentials.iter().filter(|p| !p.dois.is_empty()).count();

        let mut ps_counts: Vec<(String, usize)> = self
            .by_pair_style
            .iter()
            .map(|(k, v)| (k.clone(), v.len()))
            .collect();
        ps_counts.sort_by(|a, b| b.1.cmp(&a.1));

        let mut el_counts: Vec<(String, usize)> = self
            .by_element
            .iter()
            .map(|(k, v)| (k.clone(), v.len()))
            .collect();
        el_counts.sort_by(|a, b| b.1.cmp(&a.1));

        NistSummary {
            total_potentials: self.potentials.len(),
            single_element: single,
            multi_element: self.potentials.len() - single,
            unique_elements: self.by_element.len(),
            unique_pair_styles: self.by_pair_style.len(),
            with_doi,
            pair_style_counts: ps_counts,
            element_counts: el_counts,
        }
    }
}

// ───────────────────────────────────────────────────────────
// Benchmark scaffold generation
// ───────────────────────────────────────────────────────────

/// Reference experimental elastic constants for common metals.
///
/// Source: Simmons & Wang, "Single Crystal Elastic Constants and
/// Calculated Aggregate Properties" (MIT, 1971); updated values
/// from Hearmon, "The Elastic Constants of Crystals" (1979).
pub fn experimental_elastic_constants() -> HashMap<&'static str, [f64; 3]> {
    // [C11, C12, C44] in GPa
    HashMap::from([
        // FCC metals
        ("Al", [108.2, 61.3, 28.5]),
        ("Cu", [168.4, 121.4, 75.4]),
        ("Ni", [246.5, 147.3, 124.7]),
        ("Ag", [124.0, 93.4, 46.1]),
        ("Au", [192.3, 163.1, 42.0]),
        ("Pt", [346.7, 250.7, 76.5]),
        ("Pd", [227.1, 176.1, 71.7]),
        ("Pb", [49.5, 42.3, 14.9]),
        // BCC metals
        ("Fe", [230.0, 135.0, 117.0]),
        ("Cr", [350.0, 67.0, 100.8]),
        ("Mo", [440.0, 172.0, 106.0]),
        ("W", [522.0, 204.0, 161.0]),
        ("V", [230.0, 119.0, 43.5]),
        ("Nb", [247.0, 135.0, 28.5]),
        ("Ta", [266.0, 158.0, 87.0]),
    ])
}

/// Generate a benchmark scaffold CSV for a given element.
///
/// Produces rows with reference values filled in and predicted values blank,
/// ready for population from LAMMPS runs or published data.
pub fn generate_scaffold(
    catalog: &NistCatalog,
    element: &str,
    properties: &[&str],
) -> Vec<ScaffoldRow> {
    let refs = experimental_elastic_constants();
    let ref_vals = refs.get(element);

    let potentials = catalog.single_element(element);
    let mut rows = Vec::new();

    for pot in &potentials {
        for (i, &prop) in properties.iter().enumerate() {
            let reference = ref_vals.map(|r| r[i]);
            rows.push(ScaffoldRow {
                material: element.to_string(),
                potential: pot.short_label(),
                property: prop.to_string(),
                reference,
                predicted: None,
                unit: "GPa".to_string(),
                nist_id: pot.id.clone(),
                pair_style: pot.pair_style.clone(),
                doi: pot.primary_doi().unwrap_or("").to_string(),
            });
        }
    }

    rows
}

/// A row in the benchmark scaffold CSV.
#[derive(Debug, Clone, Serialize)]
pub struct ScaffoldRow {
    pub material: String,
    pub potential: String,
    pub property: String,
    pub reference: Option<f64>,
    pub predicted: Option<f64>,
    pub unit: String,
    pub nist_id: String,
    pub pair_style: String,
    pub doi: String,
}

/// Write scaffold rows to CSV on stdout.
pub fn write_scaffold_csv(rows: &[ScaffoldRow]) -> Result<()> {
    let stdout = std::io::stdout();
    let mut wtr = csv::Writer::from_writer(stdout.lock());

    wtr.write_record(&[
        "material",
        "potential",
        "property",
        "reference",
        "predicted",
        "unit",
        "nist_id",
        "pair_style",
        "doi",
    ])?;

    for row in rows {
        wtr.write_record(&[
            &row.material,
            &row.potential,
            &row.property,
            &row.reference.map(|v| format!("{:.1}", v)).unwrap_or_default(),
            &row.predicted.map(|v| format!("{:.1}", v)).unwrap_or_default(),
            &row.unit,
            &row.nist_id,
            &row.pair_style,
            &row.doi,
        ])?;
    }

    wtr.flush()?;
    Ok(())
}

// ───────────────────────────────────────────────────────────
// Display
// ───────────────────────────────────────────────────────────

/// Print catalog summary to stderr.
pub fn print_summary(summary: &NistSummary) {
    eprintln!();
    eprintln!("  ╔════════════════════════════════════════════════════════════╗");
    eprintln!("  ║  NIST IPR Catalog                                         ║");
    eprintln!("  ╚════════════════════════════════════════════════════════════╝");
    eprintln!();
    eprintln!("  Total potentials: {}", summary.total_potentials);
    eprintln!(
        "  Single-element:   {} | Multi-element: {}",
        summary.single_element, summary.multi_element
    );
    eprintln!(
        "  Unique elements:  {} | Unique pair_styles: {}",
        summary.unique_elements, summary.unique_pair_styles
    );
    eprintln!("  With DOI:         {}", summary.with_doi);
    eprintln!();
    eprintln!("  Top pair_styles:");
    for (ps, count) in summary.pair_style_counts.iter().take(10) {
        let bar = "█".repeat((*count / 5).max(1));
        eprintln!("    {:20} {:4} {}", ps, count, bar);
    }
    eprintln!();
    eprintln!("  Top elements:");
    for (el, count) in summary.element_counts.iter().take(15) {
        let bar = "█".repeat((*count / 5).max(1));
        eprintln!("    {:4} {:4} {}", el, count, bar);
    }
}

/// Print potentials table for a specific query.
pub fn print_potentials(potentials: &[&NistPotential]) {
    if potentials.is_empty() {
        eprintln!("  No potentials found.");
        return;
    }
    eprintln!();
    eprintln!(
        "  {:40} {:15} {:>6} {:>5} {}",
        "ID", "pair_style", "elems", "files", "DOI"
    );
    eprintln!(
        "  {:40} {:15} {:>6} {:>5} {}",
        "────────────────────────────────────────",
        "───────────────",
        "──────",
        "─────",
        "────────────────────────────────"
    );
    for pot in potentials {
        let els = pot.elements.join(",");
        let doi = pot.primary_doi().unwrap_or("—");
        eprintln!(
            "  {:40} {:15} {:>6} {:>5} {}",
            pot.id, pot.pair_style, els, pot.file_count, doi
        );
    }
    eprintln!();
    eprintln!("  {} potentials", potentials.len());
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_short_label() {
        let pot = NistPotential {
            id: "1999--Mishin-Y--Al--LAMMPS--ipr1".to_string(),
            potid: "1999--Mishin-Y--Al".to_string(),
            pair_style: "eam/alloy".to_string(),
            units: "metal".to_string(),
            atom_style: "atomic".to_string(),
            status: String::new(),
            elements: vec!["Al".to_string()],
            symbols: vec!["Al".to_string()],
            dois: vec!["10.1103/physrevb.59.3393".to_string()],
            url: String::new(),
            poturl: String::new(),
            artifacts: vec![],
            file_count: 1,
        };

        assert_eq!(pot.short_label(), "Mishin-1999");
        assert!(pot.is_single_element());
        assert!(pot.is_eam_family());
        assert!(!pot.is_meam_family());
        assert_eq!(pot.year(), Some(1999));
    }

    #[test]
    fn test_experimental_constants_coverage() {
        let refs = experimental_elastic_constants();
        // Must cover all 15 benchmark metals
        let fcc = ["Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb"];
        let bcc = ["Fe", "Cr", "Mo", "W", "V", "Nb", "Ta"];
        for m in fcc.iter().chain(bcc.iter()) {
            assert!(refs.contains_key(m), "Missing reference data for {}", m);
        }
    }
}
