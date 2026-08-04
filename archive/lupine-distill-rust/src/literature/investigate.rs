//! `distill investigate <element>` — closes the loop between our geometric
//! findings and the published literature.
//!
//! Pipeline:
//!   1. Pull our findings about the element from the DB (manifold PR per
//!      pair_style, cross-style cosines, fingerprint p-value if cached).
//!   2. Build a Semantic Scholar query that targets the gap (e.g. for Al we
//!      ask about "aluminum interatomic potential elastic constant
//!      variability"; for Fe we ask about "iron MEAM angular embedded
//!      atom magnetism").
//!   3. Fetch top-N papers from S2.
//!   4. Persist each paper to the `literature` table (idempotent on DOI).
//!   5. For each paper with an abstract, route through the existing DSPy
//!      `Mine` bridge to extract benchmark records.
//!   6. Compare each extracted (potential_label, element, property) against
//!      our DB. When the literature value disagrees with our reference or
//!      computed value by more than `GAP_THRESHOLD_PCT`, emit a
//!      `LiteratureComputationGap` claim.
//!   7. Print a summary table.
//!
//! The bridge is optional — if Python / `lupine-dspy` isn't reachable,
//! we still persist the literature rows and skip the mining step with a
//! clear log line. The literature table alone is useful as a starting
//! point for manual curation.

use anyhow::Result;
use rusqlite::Connection;
use serde::Serialize;
use serde_json::json;

use crate::bridge::{self, BridgeRequest};
use crate::db::query;
use crate::literature::search;

/// Minimum relative deviation (as a fraction, e.g. 0.05 = 5%) that triggers
/// a `LiteratureComputationGap` claim. Above this, the disagreement is
/// surfaced as a discovery candidate; below, treated as agreement noise.
const GAP_THRESHOLD: f64 = 0.05;

/// How many top papers to fetch from Semantic Scholar per element.
const DEFAULT_PAPER_LIMIT: usize = 8;

#[derive(Debug, Clone, Serialize)]
pub struct InvestigationResult {
    pub element: String,
    pub query: String,
    pub findings_summary: FindingsSummary,
    pub papers_fetched: usize,
    pub papers_with_abstract: usize,
    pub papers_mined: usize,
    pub records_extracted: usize,
    pub gaps_detected: usize,
    pub gap_summaries: Vec<GapSummary>,
}

#[derive(Debug, Clone, Serialize)]
pub struct FindingsSummary {
    pub n_potentials: usize,
    pub mean_abs_error_pct: f64,
    pub manifold_pr_global: Option<f64>,
    pub manifold_pr_by_style: Vec<(String, f64)>,
    pub n_pair_styles: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct GapSummary {
    pub paper_id: String,
    pub doi: Option<String>,
    pub potential_label: String,
    pub property: String,
    pub literature_value: f64,
    pub our_value: f64,
    pub relative_error: f64,
}

pub fn run(
    conn: &Connection,
    element: &str,
    paper_limit: Option<usize>,
    skip_bridge: bool,
) -> Result<InvestigationResult> {
    let limit = paper_limit.unwrap_or(DEFAULT_PAPER_LIMIT);

    // ── 1. Findings ─────────────────────────────────────────
    let findings = collect_findings(conn, element)?;
    let query = build_query(element, &findings);
    eprintln!("[investigate:{}] query: {}", element, query);
    eprintln!(
        "[investigate:{}] findings: {} potentials across {} pair_styles, mean |err|={:.1}%",
        element, findings.n_potentials, findings.n_pair_styles, findings.mean_abs_error_pct,
    );

    // ── 2-3. Search Semantic Scholar ────────────────────────
    let papers = search::search(&query, limit)?;
    eprintln!("[investigate:{}] fetched {} papers from Semantic Scholar", element, papers.len());

    // ── 4. Persist papers ───────────────────────────────────
    let mut papers_with_abstract = 0;
    for p in &papers {
        let title = p.title.clone().unwrap_or_default();
        if title.is_empty() { continue; }
        let authors = p.author_string();
        let year_i32 = p.year.map(|y| y as i32);
        if p.abstract_.is_some() {
            papers_with_abstract += 1;
        }
        query::insert_literature(
            conn,
            p.doi(),
            p.arxiv_id(),
            &title,
            if authors.is_empty() { None } else { Some(&authors) },
            year_i32,
            None, // journal — S2 doesn't return it in this fields set
            p.abstract_.as_deref(),
            Some(element),
            None,
            relevance_score(&title, p.abstract_.as_deref(), element),
        )?;
    }

    // ── 5-6. Mine + compare ─────────────────────────────────
    let mut papers_mined = 0;
    let mut records_extracted = 0;
    let mut gap_summaries: Vec<GapSummary> = Vec::new();

    let bridge_available = !skip_bridge && bridge::is_available();
    if !bridge_available {
        eprintln!(
            "[investigate:{}] DSPy bridge unavailable — skipping mining step (papers persisted only)",
            element,
        );
    }

    for p in &papers {
        let abstract_text = match p.abstract_.as_deref() {
            Some(a) if !a.is_empty() => a.to_string(),
            _ => continue,
        };
        if !bridge_available { continue; }

        let title = p.title.clone().unwrap_or_default();
        let req = BridgeRequest::Mine {
            title: title.clone(),
            abstract_text,
            doi: p.doi().map(|s| s.to_string()),
        };
        let resp = match bridge::call(&req) {
            Ok(r) => r,
            Err(e) => {
                eprintln!("  [mine:{}] bridge error: {}", &p.paper_id[..p.paper_id.len().min(12)], e);
                continue;
            }
        };
        if !resp.success {
            eprintln!(
                "  [mine:{}] {} ({})",
                &p.paper_id[..p.paper_id.len().min(12)],
                resp.error.as_deref().unwrap_or("mine failed"),
                title.chars().take(60).collect::<String>(),
            );
            continue;
        }
        papers_mined += 1;

        let extracted = resp.data.get("records").and_then(|r| r.as_array()).cloned().unwrap_or_default();
        records_extracted += extracted.len();

        for rec in extracted {
            let lit_element = rec.get("element").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let property = rec.get("property").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let pot_label = rec.get("potential_label").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let lit_value = rec.get("predicted").and_then(|v| v.as_f64()).unwrap_or(f64::NAN);
            if !lit_value.is_finite() || pot_label.is_empty() || property.is_empty() {
                continue;
            }
            // Only score gaps for the element under investigation.
            if !lit_element.eq_ignore_ascii_case(element) {
                continue;
            }

            let our_value = lookup_predicted(conn, &pot_label, element, &property)?;
            if let Some(ours) = our_value {
                let rel = if ours.abs() > 1e-9 {
                    ((lit_value - ours).abs() / ours.abs()).min(1e6)
                } else {
                    f64::INFINITY
                };
                if rel.is_finite() && rel > GAP_THRESHOLD {
                    gap_summaries.push(GapSummary {
                        paper_id: p.paper_id.clone(),
                        doi: p.doi().map(|s| s.to_string()),
                        potential_label: pot_label.clone(),
                        property: property.clone(),
                        literature_value: lit_value,
                        our_value: ours,
                        relative_error: rel,
                    });
                    persist_gap_claim(
                        conn, element, &p.paper_id, p.doi(),
                        &pot_label, &property, lit_value, ours, rel,
                    )?;
                }
            }
        }
    }

    eprintln!(
        "[investigate:{}] {} papers mined, {} records extracted, {} gaps detected",
        element, papers_mined, records_extracted, gap_summaries.len(),
    );

    Ok(InvestigationResult {
        element: element.to_string(),
        query,
        findings_summary: findings,
        papers_fetched: papers.len(),
        papers_with_abstract,
        papers_mined,
        records_extracted,
        gaps_detected: gap_summaries.len(),
        gap_summaries,
    })
}

fn collect_findings(conn: &Connection, element: &str) -> Result<FindingsSummary> {
    // Total potentials and mean abs error for this element.
    let n_potentials: i64 = conn.query_row(
        "SELECT COUNT(DISTINCT potential_id) FROM benchmarks WHERE element = ?1",
        rusqlite::params![element],
        |r| r.get(0),
    )?;
    let mean_err: f64 = conn.query_row(
        "SELECT COALESCE(AVG(ABS(error_pct)), 0.0) FROM benchmarks WHERE element = ?1",
        rusqlite::params![element],
        |r| r.get(0),
    )?;
    let n_pair_styles: i64 = conn.query_row(
        "SELECT COUNT(DISTINCT pair_style) FROM benchmarks WHERE element = ?1
                 AND pair_style NOT IN ('unknown','kim')",
        rusqlite::params![element],
        |r| r.get(0),
    )?;

    // Manifold cache may be empty; treat absence as None.
    let manifold_pr_global: Option<f64> = conn.query_row(
        "SELECT participation_ratio FROM manifolds WHERE grouping_key = ?1",
        rusqlite::params![format!("element:{}", element)],
        |r| r.get(0),
    ).ok();

    // Per-pair_style PR for this element — the manifolds table caches per-style
    // (across all elements), so we don't have a perfect element×style PR. Use
    // the global per-style PRs as a hint of which families are tight.
    let style_prs: Vec<(String, f64)> = {
        let mut stmt = conn.prepare(
            "SELECT pair_style, participation_ratio FROM manifolds
                 WHERE grouping_key LIKE 'style:%'
                   AND pair_style IS NOT NULL
                 ORDER BY participation_ratio DESC",
        )?;
        let v: Vec<(String, f64)> = stmt.query_map([], |r| Ok((r.get(0)?, r.get(1)?)))?
            .filter_map(|r| r.ok())
            .collect();
        v
    };

    Ok(FindingsSummary {
        n_potentials: n_potentials as usize,
        mean_abs_error_pct: mean_err,
        manifold_pr_global,
        manifold_pr_by_style: style_prs,
        n_pair_styles: n_pair_styles as usize,
    })
}

/// Build a literature query string. We anchor on the element + the
/// dissertation's domain ("interatomic potential elastic constants") and
/// add a steering term based on the dominant signal in our findings.
fn build_query(element: &str, f: &FindingsSummary) -> String {
    // Lookup full element name so the search is more searchable in the
    // materials-physics literature (Fe → "iron", Al → "aluminum").
    let full = element_full_name(element).unwrap_or(element);
    let mut q = format!("{} interatomic potential elastic constants", full);

    if let Some(pr) = f.manifold_pr_global {
        if pr > 1.8 {
            q.push_str(" anomalous error structure");
        }
    }
    if f.mean_abs_error_pct > 100.0 {
        q.push_str(" benchmark variability");
    }
    q
}

fn element_full_name(symbol: &str) -> Option<&'static str> {
    Some(match symbol {
        "Ag" => "silver",
        "Al" => "aluminum",
        "Au" => "gold",
        "Cu" => "copper",
        "Ni" => "nickel",
        "Pb" => "lead",
        "Pd" => "palladium",
        "Pt" => "platinum",
        "Cr" => "chromium",
        "Fe" => "iron",
        "Mo" => "molybdenum",
        "Nb" => "niobium",
        "Ta" => "tantalum",
        "V"  => "vanadium",
        "W"  => "tungsten",
        _ => return None,
    })
}

/// Crude relevance score [0.0, 1.0]: 0.5 baseline if the element symbol or
/// full name appears in the title/abstract, +0.25 if elastic-constant terms
/// appear, +0.25 if "potential" or "EAM/MEAM/Tersoff" appear.
fn relevance_score(title: &str, abstract_: Option<&str>, element: &str) -> f64 {
    let body = format!(
        "{} {}",
        title.to_ascii_lowercase(),
        abstract_.unwrap_or("").to_ascii_lowercase(),
    );
    let mut score = 0.0_f64;
    if body.contains(&element.to_ascii_lowercase())
        || element_full_name(element)
            .map(|n| body.contains(n))
            .unwrap_or(false)
    {
        score += 0.5;
    }
    if body.contains("c11") || body.contains("c12") || body.contains("c44") || body.contains("elastic constant") {
        score += 0.25;
    }
    if body.contains("eam") || body.contains("meam") || body.contains("tersoff")
        || body.contains("snap") || body.contains("interatomic potential")
    {
        score += 0.25;
    }
    score.clamp(0.0, 1.0)
}

/// Look up our DB's stored `predicted_value` for (potential_label, element,
/// property). Fuzzy matches potential_label by lowercased substring so that
/// "Mishin-1999" in literature matches "mishin_ni_al_1999" in our DB.
fn lookup_predicted(
    conn: &Connection,
    potential_label: &str,
    element: &str,
    property: &str,
) -> Result<Option<f64>> {
    let needle = potential_label.to_ascii_lowercase();
    // Try exact match first.
    let exact: Option<f64> = conn.query_row(
        "SELECT predicted_value FROM benchmarks
             WHERE LOWER(potential_label) = ?1
               AND element = ?2
               AND property = ?3
             LIMIT 1",
        rusqlite::params![needle, element, property],
        |r| r.get(0),
    ).ok();
    if exact.is_some() {
        return Ok(exact);
    }
    // Fall back to a fuzzy LIKE on the head of the label (e.g. "mishin").
    let head: String = needle.split(|c: char| !c.is_ascii_alphanumeric()).next()
        .unwrap_or(&needle).chars().take(12).collect();
    if head.is_empty() {
        return Ok(None);
    }
    let pat = format!("%{}%", head);
    let fuzzy: Option<f64> = conn.query_row(
        "SELECT predicted_value FROM benchmarks
             WHERE LOWER(potential_label) LIKE ?1
               AND element = ?2
               AND property = ?3
             LIMIT 1",
        rusqlite::params![pat, element, property],
        |r| r.get(0),
    ).ok();
    Ok(fuzzy)
}

#[allow(clippy::too_many_arguments)]
fn persist_gap_claim(
    conn: &Connection,
    element: &str,
    paper_id: &str,
    doi: Option<&str>,
    potential_label: &str,
    property: &str,
    literature_value: f64,
    our_value: f64,
    relative_error: f64,
) -> Result<()> {
    let claim_id = format!(
        "litgap_{}_{}_{}_{}",
        element,
        sanitize(potential_label),
        sanitize(property),
        crate::db::ledger::generate_record_id("lupine-distill"),
    );
    let data = json!({
        "element": element,
        "potential_label": potential_label,
        "property": property,
        "literature_value": literature_value,
        "our_value": our_value,
        "relative_error": relative_error,
        "paper_id": paper_id,
        "doi": doi,
    });
    let description = format!(
        "Literature/computation gap on {} {} for {}: paper={:.4}, our DB={:.4} ({:.1}% rel diff). Source paper={}",
        element, property, potential_label,
        literature_value, our_value, relative_error * 100.0,
        doi.unwrap_or(paper_id),
    );
    crate::db::query::insert_claim(
        conn,
        &claim_id,
        "lupine-distill",
        "LiteratureComputationGap",
        &data,
        &description,
        relative_error.min(1.0),
        "proposed",
    )?;
    Ok(())
}

fn sanitize(s: &str) -> String {
    s.chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '_' })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn full_name_lookup() {
        assert_eq!(element_full_name("Fe"), Some("iron"));
        assert_eq!(element_full_name("Al"), Some("aluminum"));
        assert_eq!(element_full_name("Xx"), None);
    }

    #[test]
    fn relevance_scores_cap_at_one() {
        let s = relevance_score(
            "EAM potential for aluminum elastic constants C11 C12 C44",
            Some("MEAM angular term ..."),
            "Al",
        );
        assert!((s - 1.0).abs() < 1e-10);
    }

    #[test]
    fn relevance_zero_when_unrelated() {
        let s = relevance_score("A unrelated paper", Some("about something else"), "Cu");
        assert!(s < 1e-10);
    }
}
