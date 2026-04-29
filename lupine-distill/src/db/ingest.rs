//! CSV → SQLite ingest pipeline.
//!
//! Reads all benchmark CSV files from the `benchmarks/` directory and
//! loads them into the SQLite database, deduplicating by a compound key
//! of (potential_id, element, property).

use anyhow::{Context, Result};
use rusqlite::Connection;
use std::path::Path;

/// Import a single benchmark CSV into the database.
///
/// Three layouts are auto-detected by header inspection:
///   1. **Long basic** (fcc/bcc): `element,potential,property,reference,predicted,unit`
///   2. **Long NIST**: adds `nist_id, pair_style, doi, kim_model`. When
///      `pair_style == "kim"` we extract the real functional form from the
///      `kim_model` prefix (e.g., `EAM_*` → `eam`, `MEAM_*` → `meam`).
///   3. **Wide KIM**: `species,crystal,model_id,short_label,c11,c12,c44,
///      bulk_modulus,nist_id,...` — each row carries multiple property
///      columns. We melt these into one long row per property.
///
/// Reference values come from a hardcoded experimental table when the wide
/// format omits them (the kim_elastic CSVs ship predictions only).
pub fn import_benchmark_csv(conn: &Connection, csv_path: &Path) -> Result<usize> {
    let source_name = csv_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown");

    let content = std::fs::read_to_string(csv_path)
        .with_context(|| format!("reading {}", csv_path.display()))?;

    let mut rdr = csv::ReaderBuilder::new()
        .has_headers(true)
        .flexible(true)
        .trim(csv::Trim::All)
        .from_reader(content.as_bytes());

    let headers = rdr.headers()?.clone();

    // Wide format: dedicated importer that melts c11/c12/c44 columns into rows.
    if is_wide_kim_layout(&headers) {
        return import_wide_kim_csv(conn, source_name, &mut rdr, &headers);
    }

    // Detect column layout by header names
    let layout = detect_layout(&headers);

    let mut stmt = conn.prepare_cached(
        "INSERT OR IGNORE INTO benchmarks
         (record_id, potential_id, potential_label, pair_style, element,
          property, reference_value, predicted_value, unit, source, agent_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)"
    )?;

    let mut count = 0;
    for result in rdr.records() {
        let record = result?;
        if record.len() < 5 {
            continue;
        }

        let element = record.get(layout.element).unwrap_or("").trim().to_string();
        let potential_label = record.get(layout.potential).unwrap_or("").trim().to_string();
        let property = record.get(layout.property).unwrap_or("").trim().to_string();
        let reference: f64 = record.get(layout.reference).unwrap_or("0").trim().parse().unwrap_or(0.0);
        let predicted: f64 = record.get(layout.predicted).unwrap_or("0").trim().parse().unwrap_or(0.0);
        let unit = record.get(layout.unit).unwrap_or("GPa").trim().to_string();

        let nist_id = if let Some(idx) = layout.nist_id {
            record.get(idx).unwrap_or(&potential_label).trim().to_string()
        } else {
            potential_label.clone()
        };

        let raw_pair_style = if let Some(idx) = layout.pair_style {
            record.get(idx).unwrap_or("unknown").trim().to_string()
        } else {
            "unknown".to_string()
        };

        // The NIST CSVs always tag pair_style="kim" (they were sourced via the
        // KIM API), but the actual functional form is encoded in `kim_model`
        // (or in `nist_id`). Reclassify so manifold groupings reflect the
        // real physics rather than the API wrapper.
        let pair_style = if raw_pair_style == "kim" || raw_pair_style.is_empty() || raw_pair_style == "unknown" {
            let kim_model = layout.kim_model
                .and_then(|i| record.get(i))
                .map(|s| s.trim())
                .filter(|s| !s.is_empty())
                .unwrap_or(&nist_id);
            classify_pair_style(kim_model).unwrap_or(raw_pair_style)
        } else {
            raw_pair_style
        };

        // Skip rows with zero/invalid data
        if element.is_empty() || potential_label.is_empty() || property.is_empty() {
            continue;
        }
        if reference == 0.0 && predicted == 0.0 {
            continue;
        }

        // Generate deterministic record_id from compound key
        let record_id = format!("{}_{}_{}_{}",
            source_name.replace('.', "_"),
            nist_id.replace(['/', ' ', '.'], "_"),
            element,
            property
        );

        stmt.execute(rusqlite::params![
            record_id, nist_id, potential_label, pair_style, element,
            property, reference, predicted, unit, source_name, "csv_import"
        ])?;

        count += 1;
    }

    Ok(count)
}

/// Import all CSVs from a benchmarks directory.
pub fn import_benchmarks_dir(conn: &Connection, dir: &Path) -> Result<usize> {
    let mut total = 0;

    if !dir.exists() {
        anyhow::bail!("Benchmarks directory not found: {}", dir.display());
    }

    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) == Some("csv") {
            let name = path.file_name().unwrap_or_default().to_string_lossy();
            match import_benchmark_csv(conn, &path) {
                Ok(n) => {
                    eprintln!("  [db] {} -> {} records", name, n);
                    total += n;
                }
                Err(e) => {
                    eprintln!("  [db] WARN: {} failed: {}", name, e);
                }
            }
        }
    }

    Ok(total)
}

/// Migrate records from legacy JSONL ledger into SQLite.
pub fn import_ledger(conn: &Connection, ledger_dir: &Path) -> Result<usize> {
    use super::ledger::{DiscoveryLedger, Provenance};

    if !ledger_dir.exists() {
        return Ok(0);
    }

    let ledger = DiscoveryLedger::load(ledger_dir)
        .map_err(|e| anyhow::anyhow!("ledger load failed: {}", e))?;

    let mut stmt = conn.prepare_cached(
        "INSERT OR IGNORE INTO benchmarks
         (record_id, potential_id, potential_label, pair_style, element,
          property, reference_value, predicted_value, unit, source, agent_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)"
    )?;

    let mut count = 0;
    for rec in &ledger.records {
        let source = match &rec.provenance {
            Provenance::LammpsRun { run_id, .. } => format!("lammps:{}", run_id),
            Provenance::LiteratureCitation { doi, .. } => format!("paper:{}", doi),
            Provenance::OpenKimTest { test_id, .. } => format!("openkim:{}", test_id),
            Provenance::AgentInference { method, .. } => format!("infer:{}", method),
            Provenance::SyntheticBenchmark { source, .. } => format!("synthetic:{}", source),
        };

        stmt.execute(rusqlite::params![
            rec.record_id, rec.potential_id, rec.potential_label,
            rec.pair_style, rec.element, rec.property,
            rec.reference, rec.predicted, rec.unit, source, rec.agent_id
        ])?;
        count += 1;
    }

    // Also import claims
    let mut claim_stmt = conn.prepare_cached(
        "INSERT OR IGNORE INTO claims
         (claim_id, agent_id, claim_type, claim_data, evidence_ids,
          confidence, status, description)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)"
    )?;

    for claim in &ledger.claims {
        let claim_type_str = match &claim.claim_type {
            _ => serde_json::to_string(&claim.claim_type).unwrap_or_default(),
        };
        let evidence_json = serde_json::to_string(&claim.evidence_ids).unwrap_or("[]".into());
        let status_str = format!("{:?}", claim.status);

        claim_stmt.execute(rusqlite::params![
            claim.claim_id, claim.agent_id, claim_type_str, claim_type_str,
            evidence_json, claim.confidence, status_str, claim.description
        ])?;
    }

    Ok(count)
}

// ─── Column layout detection ─────────────────────────────

struct CsvLayout {
    element: usize,
    potential: usize,
    property: usize,
    reference: usize,
    predicted: usize,
    unit: usize,
    nist_id: Option<usize>,
    pair_style: Option<usize>,
    kim_model: Option<usize>,
}

fn detect_layout(headers: &csv::StringRecord) -> CsvLayout {
    let h: Vec<String> = headers.iter().map(|s| s.to_lowercase().trim().to_string()).collect();

    // Try to match by header names
    let find = |names: &[&str]| -> Option<usize> {
        for name in names {
            if let Some(i) = h.iter().position(|x| x == *name) {
                return Some(i);
            }
        }
        None
    };

    CsvLayout {
        element: find(&["element", "material", "el", "species"]).unwrap_or(0),
        potential: find(&["potential_label", "potential", "pot", "label", "short_label"]).unwrap_or(1),
        property: find(&["property", "prop"]).unwrap_or(2),
        reference: find(&["reference", "ref", "ref_value", "reference_value", "experimental"]).unwrap_or(3),
        predicted: find(&["predicted", "pred", "pred_value", "predicted_value", "computed"]).unwrap_or(4),
        unit: find(&["unit", "units"]).unwrap_or(5),
        nist_id: find(&["nist_id", "potential_id", "id", "model_id"]),
        pair_style: find(&["pair_style", "pairstyle", "style"]),
        kim_model: find(&["kim_model", "model_id"]),
    }
}

// ─── Wide-format (KIM) ingest ─────────────────────────────────

/// Detect the wide-format layout shipped by the kim_elastic_results CSVs:
/// each row carries c11/c12/c44 (and optionally bulk_modulus) as columns.
fn is_wide_kim_layout(headers: &csv::StringRecord) -> bool {
    let h: Vec<String> = headers.iter().map(|s| s.to_lowercase().trim().to_string()).collect();
    let has = |name: &str| h.iter().any(|x| x == name);
    has("c11") && has("c12") && has("c44") && (has("species") || has("element"))
}

fn import_wide_kim_csv<R: std::io::Read>(
    conn: &Connection,
    source_name: &str,
    rdr: &mut csv::Reader<R>,
    headers: &csv::StringRecord,
) -> Result<usize> {
    let h: Vec<String> = headers.iter().map(|s| s.to_lowercase().trim().to_string()).collect();
    let pos = |name: &str| h.iter().position(|x| x == name);

    let species_idx = pos("species").or_else(|| pos("element"))
        .context("wide-KIM csv: missing species/element column")?;
    let model_id_idx = pos("model_id").or_else(|| pos("nist_id"));
    let label_idx = pos("short_label").or_else(|| pos("label"));
    // Property columns we know how to melt, with units.
    let prop_cols: Vec<(usize, &'static str, &'static str)> = [
        ("c11", "C11", "GPa"),
        ("c12", "C12", "GPa"),
        ("c44", "C44", "GPa"),
        ("bulk_modulus", "B", "GPa"),
    ]
    .into_iter()
    .filter_map(|(col, prop, unit)| pos(col).map(|i| (i, prop, unit)))
    .collect();

    let mut stmt = conn.prepare_cached(
        "INSERT OR IGNORE INTO benchmarks
         (record_id, potential_id, potential_label, pair_style, element,
          property, reference_value, predicted_value, unit, source, agent_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)"
    )?;

    let mut count = 0;
    for result in rdr.records() {
        let record = result?;
        let element = record.get(species_idx).unwrap_or("").trim().to_string();
        if element.is_empty() {
            continue;
        }
        let model_id = model_id_idx
            .and_then(|i| record.get(i))
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        let label = label_idx
            .and_then(|i| record.get(i))
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| model_id.chars().take(40).collect());
        if model_id.is_empty() && label.is_empty() {
            continue;
        }

        let pair_style = classify_pair_style(&model_id)
            .or_else(|| classify_pair_style(&label))
            .unwrap_or_else(|| "unknown".to_string());

        for (col_idx, prop_name, unit) in &prop_cols {
            let raw = record.get(*col_idx).unwrap_or("").trim();
            if raw.is_empty() {
                continue;
            }
            let predicted: f64 = match raw.parse() {
                Ok(v) => v,
                Err(_) => continue,
            };
            // Wide KIM CSVs ship predictions only — pull the experimental
            // reference from the canonical table. Skip rows with no reference
            // available; better to drop than to fabricate.
            let reference = match experimental_reference(&element, prop_name) {
                Some(v) => v,
                None => continue,
            };
            let record_id = format!(
                "{}_{}_{}_{}",
                source_name.replace('.', "_"),
                model_id.replace(['/', ' ', '.'], "_"),
                element,
                prop_name,
            );
            stmt.execute(rusqlite::params![
                record_id, model_id, label, pair_style, element,
                prop_name, reference, predicted, unit, source_name, "csv_import"
            ])?;
            count += 1;
        }
    }
    Ok(count)
}

/// Map a NIST/KIM model identifier to its LAMMPS pair_style, by prefix.
/// Returns None when the prefix isn't recognized — callers may fall back to
/// "unknown" rather than guessing.
fn classify_pair_style(model: &str) -> Option<String> {
    let low = model.to_ascii_lowercase();
    let prefixes = [
        ("eam_dynamo", "eam/alloy"),
        ("eam_finnissinclair", "eam/fs"),
        ("eam_cubicnaturalspline", "eam"),
        ("eam_quintichermitespline", "eam"),
        ("eam_quinticclampedspline", "eam"),
        ("eam_dynamofs", "eam/fs"),
        ("eam_", "eam"),
        ("meam_2nn", "meam"),
        ("meam_lammps", "meam"),
        ("meam_spline", "meam/spline"),
        ("meam_", "meam"),
        ("tersoff_lammps", "tersoff"),
        ("tersoff_zbl", "tersoff/zbl"),
        ("tersoff_", "tersoff"),
        ("sw_", "sw"),
        ("adp_", "adp"),
        ("bop_", "bop"),
        ("snap_", "snap"),
        ("acelmptramp_", "ace"),
        ("ace_", "ace"),
    ];
    for (prefix, style) in prefixes {
        if low.starts_with(prefix) {
            return Some(style.to_string());
        }
    }
    None
}

/// Experimental reference values for elastic constants (and bulk modulus) of
/// the 15 benchmark elements at room temperature, in GPa. Sourced from the
/// hardcoded values used elsewhere in the legacy `atlas-distill` validation
/// (Simmons & Wang 1971; Kittel 8e). Returning None means we have no canonical
/// reference and the row should be skipped rather than fabricated.
fn experimental_reference(element: &str, property: &str) -> Option<f64> {
    let table: &[(&str, f64, f64, f64, f64)] = &[
        // (element, C11, C12, C44, B)
        ("Ag",  124.0,  93.4,  46.1, 103.6),
        ("Al",  108.2,  61.3,  28.5,  76.9),
        ("Au",  192.9, 163.8,  41.5, 173.5),
        ("Cu",  168.4, 121.4,  75.4, 137.1),
        ("Ni",  246.5, 147.3, 124.7, 180.4),
        ("Pb",   49.5,  42.3,  14.9,  44.7),
        ("Pd",  227.1, 176.0,  71.7, 193.0),
        ("Pt",  346.7, 250.7,  76.5, 282.7),
        ("Cr",  339.8,  58.6,  99.0, 152.3),
        ("Fe",  226.0, 140.0, 116.0, 168.7),
        ("Mo",  463.0, 161.0, 109.0, 261.7),
        ("Nb",  246.5, 134.5,  28.7, 171.8),
        ("Ta",  266.3, 158.2,  87.4, 194.2),
        ("V",   229.0, 119.0,  43.0, 155.7),
        ("W",   523.0, 203.0, 160.0, 309.7),
    ];
    for (el, c11, c12, c44, b) in table {
        if *el == element {
            return match property {
                "C11" => Some(*c11),
                "C12" => Some(*c12),
                "C44" => Some(*c44),
                "B" | "bulk_modulus" => Some(*b),
                _ => None,
            };
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::schema;

    #[test]
    fn test_import_benchmark_csv() {
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        schema::initialize(&conn).unwrap();

        // Create a minimal CSV
        let csv_dir = std::env::temp_dir().join("distill_test_csv");
        let _ = std::fs::create_dir_all(&csv_dir);
        std::fs::write(csv_dir.join("test.csv"),
            "element,potential_label,property,reference,predicted,unit\n\
             Al,Adams-1989,C11,108.2,110.5,GPa\n\
             Al,Adams-1989,C12,61.3,63.0,GPa\n"
        ).unwrap();

        let n = import_benchmark_csv(&conn, &csv_dir.join("test.csv")).unwrap();
        assert_eq!(n, 2);

        let count: u32 = conn.query_row(
            "SELECT COUNT(*) FROM benchmarks WHERE element = 'Al'", [], |r| r.get(0)
        ).unwrap();
        assert_eq!(count, 2);

        let _ = std::fs::remove_dir_all(&csv_dir);
    }
}
