//! Analytical queries on the research database.
//!
//! These are the queries that power hypothesis testing, cross-element
//! analysis, and publication evidence generation.

use anyhow::Result;
use rusqlite::Connection;
use serde::Serialize;

// ─── Summary statistics ──────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct DbSummary {
    pub total_records: usize,
    pub unique_elements: usize,
    pub unique_potentials: usize,
    pub unique_pair_styles: usize,
    pub properties: Vec<String>,
    pub elements: Vec<String>,
    pub pair_styles: Vec<String>,
    pub mean_abs_error_pct: f64,
}

pub fn summary(conn: &Connection) -> Result<DbSummary> {
    let total: usize = conn.query_row("SELECT COUNT(*) FROM benchmarks", [], |r| r.get(0))?;
    let unique_elements: usize = conn.query_row("SELECT COUNT(DISTINCT element) FROM benchmarks", [], |r| r.get(0))?;
    let unique_potentials: usize = conn.query_row("SELECT COUNT(DISTINCT potential_id) FROM benchmarks", [], |r| r.get(0))?;
    let unique_pair_styles: usize = conn.query_row("SELECT COUNT(DISTINCT pair_style) FROM benchmarks", [], |r| r.get(0))?;
    let mean_err: f64 = conn.query_row("SELECT COALESCE(AVG(ABS(error_pct)), 0.0) FROM benchmarks", [], |r| r.get(0))?;

    let properties = query_distinct(conn, "property")?;
    let elements = query_distinct(conn, "element")?;
    let pair_styles = query_distinct(conn, "pair_style")?;

    Ok(DbSummary {
        total_records: total,
        unique_elements,
        unique_potentials,
        unique_pair_styles,
        properties,
        elements,
        pair_styles,
        mean_abs_error_pct: mean_err,
    })
}

/// Distinct values of a known column on the benchmarks table.
/// `column` must be one of the validated literals in `VALID_COLUMNS`.
pub fn query_distinct(conn: &Connection, column: &str) -> Result<Vec<String>> {
    const VALID_COLUMNS: &[&str] = &["element", "pair_style", "property", "potential_id", "potential_label"];
    if !VALID_COLUMNS.contains(&column) {
        anyhow::bail!("query_distinct: invalid column '{}', allowed: {:?}", column, VALID_COLUMNS);
    }
    let sql = format!("SELECT DISTINCT {0} FROM benchmarks ORDER BY {0}", column);
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], |r| r.get::<_, String>(0))?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

// ─── Error vectors for manifold analysis ────────────────

/// An error vector for a single potential: (C11_err%, C12_err%, C44_err%).
#[derive(Debug, Clone, Serialize)]
pub struct ErrorVector {
    pub potential_id: String,
    pub potential_label: String,
    pub pair_style: String,
    pub element: String,
    pub errors: Vec<f64>,
    pub properties: Vec<String>,
}

/// Build error vectors for all potentials matching the filter.
/// Each vector has one component per property (C11, C12, C44, etc.).
///
/// Property axis selection: by default, the function discovers the property set
/// from the data — fine when filtered to a single (element, pair_style) where
/// coverage is uniform, but fragile globally because mixed properties (a0,
/// E_coh, elastic constants) cause potentials with partial coverage to be
/// dropped. Use `error_vectors_for_properties` to pin the property axes.
pub fn error_vectors(
    conn: &Connection,
    element: Option<&str>,
    pair_style: Option<&str>,
) -> Result<Vec<ErrorVector>> {
    error_vectors_for_properties(conn, element, pair_style, None)
}

/// Like `error_vectors`, but with an explicit property whitelist.
/// When `properties` is `Some`, only those property axes are used (in order),
/// and a potential is included only if it has data for every listed property.
pub fn error_vectors_for_properties(
    conn: &Connection,
    element: Option<&str>,
    pair_style: Option<&str>,
    properties: Option<&[&str]>,
) -> Result<Vec<ErrorVector>> {
    let properties: Vec<String> = if let Some(list) = properties {
        list.iter().map(|s| s.to_string()).collect()
    } else {
        let mut sql = String::from(
            "SELECT DISTINCT property FROM benchmarks WHERE 1=1"
        );
        let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        if let Some(el) = element {
            sql.push_str(" AND element = ?");
            params.push(Box::new(el.to_string()));
        }
        if let Some(ps) = pair_style {
            sql.push_str(" AND pair_style = ?");
            params.push(Box::new(ps.to_string()));
        }
        sql.push_str(" ORDER BY property");

        let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        let mut stmt = conn.prepare(&sql)?;
        let v: Vec<String> = stmt
            .query_map(param_refs.as_slice(), |r| r.get::<_, String>(0))?
            .filter_map(|r| r.ok())
            .collect();
        v
    };

    if properties.is_empty() {
        return Ok(Vec::new());
    }

    // Get all potentials
    let mut pot_sql = String::from(
        "SELECT DISTINCT potential_id, potential_label, pair_style, element FROM benchmarks WHERE 1=1"
    );
    let mut pot_params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(el) = element {
        pot_sql.push_str(" AND element = ?");
        pot_params.push(Box::new(el.to_string()));
    }
    if let Some(ps) = pair_style {
        pot_sql.push_str(" AND pair_style = ?");
        pot_params.push(Box::new(ps.to_string()));
    }

    let pot_refs: Vec<&dyn rusqlite::types::ToSql> = pot_params.iter().map(|p| p.as_ref()).collect();
    let mut pot_stmt = conn.prepare(&pot_sql)?;
    let potentials: Vec<(String, String, String, String)> = pot_stmt
        .query_map(pot_refs.as_slice(), |r| {
            Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?))
        })?
        .filter_map(|r| r.ok())
        .collect();

    // Build error vector for each potential
    let mut vectors = Vec::new();
    for (pot_id, pot_label, ps, el) in &potentials {
        let mut errors = Vec::with_capacity(properties.len());
        let mut complete = true;

        for prop in &properties {
            let err: Option<f64> = conn.query_row(
                "SELECT error_pct FROM benchmarks
                 WHERE potential_id = ?1 AND element = ?2 AND property = ?3
                 LIMIT 1",
                rusqlite::params![pot_id, el, prop],
                |r| r.get(0),
            ).ok();

            match err {
                Some(e) => errors.push(e),
                None => {
                    complete = false;
                    break;
                }
            }
        }

        if complete && !errors.is_empty() {
            vectors.push(ErrorVector {
                potential_id: pot_id.clone(),
                potential_label: pot_label.clone(),
                pair_style: ps.clone(),
                element: el.clone(),
                errors,
                properties: properties.clone(),
            });
        }
    }

    Ok(vectors)
}

// ─── Stratified correlations ────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct StratifiedCorrelation {
    pub group: String,
    pub n: usize,
    pub pearson_r: f64,
}

/// Compute Pearson correlations stratified by a grouping column.
pub fn stratified_correlations(
    conn: &Connection,
    group_by: &str,
    element: Option<&str>,
) -> Result<(f64, Vec<StratifiedCorrelation>)> {
    // Validate group_by is a known column
    let valid_groups = ["element", "pair_style", "property", "potential_label"];
    if !valid_groups.contains(&group_by) {
        anyhow::bail!("Invalid grouping column: {}. Use one of: {:?}", group_by, valid_groups);
    }

    // Pooled correlation
    let pooled_r = compute_pearson_r(conn, element, None)?;

    // Per-group correlations
    let groups = if let Some(el) = element {
        let sql = format!(
            "SELECT DISTINCT {} FROM benchmarks WHERE element = ? ORDER BY {}",
            group_by, group_by
        );
        let mut stmt = conn.prepare(&sql)?;
        let v: Vec<String> = stmt.query_map([el], |r| r.get::<_, String>(0))?
            .filter_map(|r| r.ok())
            .collect();
        v
    } else {
        query_distinct(conn, group_by)?
    };

    let mut strats = Vec::new();
    for group in &groups {
        let filter = format!("{} = '{}'", group_by, group.replace('\'', "''"));
        let r = compute_pearson_r_filtered(conn, element, &filter)?;
        let n = count_filtered(conn, element, &filter)?;

        if n >= 3 {
            strats.push(StratifiedCorrelation {
                group: group.clone(),
                n,
                pearson_r: r,
            });
        }
    }

    Ok((pooled_r, strats))
}

fn compute_pearson_r(conn: &Connection, element: Option<&str>, _extra: Option<&str>) -> Result<f64> {
    let sql = if let Some(el) = element {
        format!(
            "SELECT reference_value, predicted_value FROM benchmarks WHERE element = '{}'",
            el.replace('\'', "''")
        )
    } else {
        "SELECT reference_value, predicted_value FROM benchmarks".to_string()
    };

    let mut stmt = conn.prepare(&sql)?;
    let pairs: Vec<(f64, f64)> = stmt
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(pearson_r(&pairs))
}

fn compute_pearson_r_filtered(conn: &Connection, element: Option<&str>, filter: &str) -> Result<f64> {
    let mut sql = "SELECT reference_value, predicted_value FROM benchmarks WHERE ".to_string();
    sql.push_str(filter);
    if let Some(el) = element {
        sql.push_str(&format!(" AND element = '{}'", el.replace('\'', "''")));
    }

    let mut stmt = conn.prepare(&sql)?;
    let pairs: Vec<(f64, f64)> = stmt
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(pearson_r(&pairs))
}

fn count_filtered(conn: &Connection, element: Option<&str>, filter: &str) -> Result<usize> {
    let mut sql = "SELECT COUNT(*) FROM benchmarks WHERE ".to_string();
    sql.push_str(filter);
    if let Some(el) = element {
        sql.push_str(&format!(" AND element = '{}'", el.replace('\'', "''")));
    }
    Ok(conn.query_row(&sql, [], |r| r.get(0))?)
}

/// Pure Pearson correlation on (x, y) pairs.
fn pearson_r(pairs: &[(f64, f64)]) -> f64 {
    let n = pairs.len() as f64;
    if n < 3.0 {
        return 0.0;
    }
    let (sum_x, sum_y, sum_xy, sum_x2, sum_y2) = pairs.iter().fold(
        (0.0, 0.0, 0.0, 0.0, 0.0),
        |(sx, sy, sxy, sx2, sy2), &(x, y)| {
            (sx + x, sy + y, sxy + x * y, sx2 + x * x, sy2 + y * y)
        },
    );
    let num = n * sum_xy - sum_x * sum_y;
    let den = ((n * sum_x2 - sum_x * sum_x) * (n * sum_y2 - sum_y * sum_y)).sqrt();
    if den.abs() < 1e-15 { 0.0 } else { num / den }
}

// ─── Pair-style family statistics ───────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct FamilyStats {
    pub pair_style: String,
    pub n_potentials: usize,
    pub n_records: usize,
    pub mean_error_pct: f64,
    pub std_error_pct: f64,
    pub properties: Vec<String>,
}

/// Get per-pair_style family statistics.
pub fn family_statistics(conn: &Connection, element: Option<&str>) -> Result<Vec<FamilyStats>> {
    let mut sql = String::from(
        "SELECT pair_style, COUNT(DISTINCT potential_id), COUNT(*), AVG(error_pct),
                COALESCE(
                  SQRT(AVG(error_pct * error_pct) - AVG(error_pct) * AVG(error_pct)),
                  0.0
                )
         FROM benchmarks WHERE 1=1"
    );

    if let Some(el) = element {
        sql.push_str(&format!(" AND element = '{}'", el.replace('\'', "''")));
    }
    sql.push_str(" GROUP BY pair_style ORDER BY pair_style");

    let mut stmt = conn.prepare(&sql)?;
    let stats: Vec<FamilyStats> = stmt
        .query_map([], |r| {
            Ok(FamilyStats {
                pair_style: r.get(0)?,
                n_potentials: r.get(1)?,
                n_records: r.get(2)?,
                mean_error_pct: r.get(3)?,
                std_error_pct: r.get(4)?,
                properties: Vec::new(),
            })
        })?
        .filter_map(|r| r.ok())
        .collect();

    Ok(stats)
}

// ─── Hypothesis management ──────────────────────────────

/// Insert a new hypothesis into the registry.
pub fn insert_hypothesis(
    conn: &Connection,
    hypothesis_id: &str,
    class: &str,
    title: &str,
    description: &str,
    testable_prediction: &str,
    confidence: f64,
) -> Result<()> {
    conn.execute(
        "INSERT OR REPLACE INTO hypotheses
         (hypothesis_id, class, title, description, testable_prediction, confidence)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![hypothesis_id, class, title, description, testable_prediction, confidence],
    )?;
    Ok(())
}

/// Update hypothesis status and evidence counts.
pub fn update_hypothesis_status(
    conn: &Connection,
    hypothesis_id: &str,
    status: &str,
    evidence_for: i32,
    evidence_against: i32,
    confidence: f64,
) -> Result<()> {
    conn.execute(
        "UPDATE hypotheses SET status = ?2, evidence_for = ?3,
         evidence_against = ?4, confidence = ?5,
         updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
         WHERE hypothesis_id = ?1",
        rusqlite::params![hypothesis_id, status, evidence_for, evidence_against, confidence],
    )?;
    Ok(())
}

// ─── Literature management ──────────────────────────────

/// Insert a literature entry.
pub fn insert_literature(
    conn: &Connection,
    doi: Option<&str>,
    arxiv_id: Option<&str>,
    title: &str,
    authors: Option<&str>,
    year: Option<i32>,
    journal: Option<&str>,
    abstract_text: Option<&str>,
    elements: Option<&str>,
    pair_styles: Option<&str>,
    relevance_score: f64,
) -> Result<()> {
    conn.execute(
        "INSERT OR IGNORE INTO literature
         (doi, arxiv_id, title, authors, year, journal, abstract_text,
          elements, pair_styles, relevance_score)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            doi, arxiv_id, title, authors, year, journal, abstract_text,
            elements, pair_styles, relevance_score
        ],
    )?;
    Ok(())
}

/// Count unreviewed papers.
pub fn unreviewed_count(conn: &Connection) -> Result<usize> {
    Ok(conn.query_row("SELECT COUNT(*) FROM literature WHERE reviewed = 0", [], |r| r.get(0))?)
}

// ─── Manifold cache ─────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct ManifoldRow {
    pub grouping_key: String,
    pub element: Option<String>,
    pub pair_style: Option<String>,
    pub n_records: usize,
    pub n_potentials: usize,
    pub eigenvalues: Vec<f64>,
    pub participation_ratio: f64,
    pub effective_dim: usize,
    pub explained_variance: Vec<f64>,
    pub computed_at: String,
}

/// Upsert a manifold analysis row, keyed by grouping_key.
/// Eigenvalues / eigenvectors / explained variance are stored as JSON-serialized arrays.
pub fn upsert_manifold(
    conn: &Connection,
    grouping_key: &str,
    element: Option<&str>,
    pair_style: Option<&str>,
    n_records: usize,
    n_potentials: usize,
    eigenvalues: &[f64],
    eigenvectors: &serde_json::Value,
    explained_variance: &[f64],
    participation_ratio: f64,
    effective_dim: usize,
) -> Result<()> {
    let eig_json = serde_json::to_string(eigenvalues)?;
    let evec_json = serde_json::to_string(eigenvectors)?;
    let exp_json = serde_json::to_string(explained_variance)?;

    conn.execute(
        "INSERT INTO manifolds
         (grouping_key, element, pair_style, n_records, n_potentials,
          eigenvalues, eigenvectors, participation_ratio, effective_dim, explained_variance)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
         ON CONFLICT(grouping_key) DO UPDATE SET
            element = excluded.element,
            pair_style = excluded.pair_style,
            n_records = excluded.n_records,
            n_potentials = excluded.n_potentials,
            eigenvalues = excluded.eigenvalues,
            eigenvectors = excluded.eigenvectors,
            participation_ratio = excluded.participation_ratio,
            effective_dim = excluded.effective_dim,
            explained_variance = excluded.explained_variance,
            computed_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')",
        rusqlite::params![
            grouping_key, element, pair_style, n_records as i64, n_potentials as i64,
            eig_json, evec_json, participation_ratio, effective_dim as i64, exp_json,
        ],
    )?;
    Ok(())
}

/// Look up the participation ratio previously cached for a grouping_key.
/// Returns `None` if the grouping has never been analyzed.
pub fn previous_manifold_pr(conn: &Connection, grouping_key: &str) -> Result<Option<f64>> {
    let pr: Option<f64> = conn.query_row(
        "SELECT participation_ratio FROM manifolds WHERE grouping_key = ?1",
        rusqlite::params![grouping_key],
        |r| r.get(0),
    ).ok();
    Ok(pr)
}

/// List cached manifold analyses ordered by computation time (newest first).
pub fn list_manifolds(conn: &Connection) -> Result<Vec<ManifoldRow>> {
    let mut stmt = conn.prepare(
        "SELECT grouping_key, element, pair_style, n_records, n_potentials,
                eigenvalues, participation_ratio, effective_dim, explained_variance,
                computed_at
           FROM manifolds
           ORDER BY computed_at DESC",
    )?;
    let rows: Vec<ManifoldRow> = stmt.query_map([], |r| {
        let eig: String = r.get(5)?;
        let exp: String = r.get(8)?;
        Ok(ManifoldRow {
            grouping_key: r.get(0)?,
            element: r.get(1)?,
            pair_style: r.get(2)?,
            n_records: r.get::<_, i64>(3)? as usize,
            n_potentials: r.get::<_, i64>(4)? as usize,
            eigenvalues: serde_json::from_str(&eig).unwrap_or_default(),
            participation_ratio: r.get(6)?,
            effective_dim: r.get::<_, i64>(7)? as usize,
            explained_variance: serde_json::from_str(&exp).unwrap_or_default(),
            computed_at: r.get(9)?,
        })
    })?.filter_map(|r| r.ok()).collect();
    Ok(rows)
}

// ─── PC1 alignment cache (transfer detail) ───────────────

#[derive(Debug, Clone, Serialize)]
pub struct Pc1AlignmentRow {
    pub pair_style: String,
    pub element_a: String,
    pub element_b: String,
    pub cosine_similarity: f64,
    pub n_potentials_a: usize,
    pub n_potentials_b: usize,
    pub computed_at: String,
}

/// Upsert one (pair_style, element_a, element_b) PC1 alignment row.
/// Caller is responsible for canonical ordering of the element pair.
#[allow(clippy::too_many_arguments)]
pub fn upsert_pc1_alignment(
    conn: &Connection,
    pair_style: &str,
    element_a: &str,
    element_b: &str,
    cosine_similarity: f64,
    pc1_a: &[f64],
    pc1_b: &[f64],
    n_potentials_a: usize,
    n_potentials_b: usize,
) -> Result<()> {
    let a_json = serde_json::to_string(pc1_a)?;
    let b_json = serde_json::to_string(pc1_b)?;
    conn.execute(
        "INSERT INTO pc1_alignments
         (pair_style, element_a, element_b, cosine_similarity,
          pc1_a, pc1_b, n_potentials_a, n_potentials_b)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(pair_style, element_a, element_b) DO UPDATE SET
            cosine_similarity = excluded.cosine_similarity,
            pc1_a = excluded.pc1_a,
            pc1_b = excluded.pc1_b,
            n_potentials_a = excluded.n_potentials_a,
            n_potentials_b = excluded.n_potentials_b,
            computed_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')",
        rusqlite::params![
            pair_style, element_a, element_b, cosine_similarity,
            a_json, b_json, n_potentials_a as i64, n_potentials_b as i64,
        ],
    )?;
    Ok(())
}

/// List PC1 alignments, newest first.
pub fn list_pc1_alignments(conn: &Connection, limit: usize) -> Result<Vec<Pc1AlignmentRow>> {
    let mut stmt = conn.prepare(
        "SELECT pair_style, element_a, element_b, cosine_similarity,
                n_potentials_a, n_potentials_b, computed_at
           FROM pc1_alignments
           ORDER BY computed_at DESC, pair_style, element_a, element_b
           LIMIT ?1",
    )?;
    let rows: Vec<Pc1AlignmentRow> = stmt.query_map([limit as i64], |r| {
        Ok(Pc1AlignmentRow {
            pair_style: r.get(0)?,
            element_a: r.get(1)?,
            element_b: r.get(2)?,
            cosine_similarity: r.get(3)?,
            n_potentials_a: r.get::<_, i64>(4)? as usize,
            n_potentials_b: r.get::<_, i64>(5)? as usize,
            computed_at: r.get(6)?,
        })
    })?.filter_map(|r| r.ok()).collect();
    Ok(rows)
}

// ─── Null-model persistence ──────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct NullModelRow {
    pub test_name: String,
    pub grouping_key: String,
    pub method: String,
    pub observed: f64,
    pub null_mean: f64,
    pub null_std: f64,
    pub null_ci_low: f64,
    pub null_ci_high: f64,
    pub p_value: f64,
    pub n_iterations: usize,
    pub computed_at: String,
}

#[allow(clippy::too_many_arguments)]
pub fn upsert_null_model(
    conn: &Connection,
    test_name: &str,
    grouping_key: &str,
    method: &str,
    observed: f64,
    null_mean: f64,
    null_std: f64,
    null_ci_low: f64,
    null_ci_high: f64,
    p_value: f64,
    n_iterations: usize,
    null_distribution: &[f64],
) -> Result<()> {
    let dist_json = serde_json::to_string(null_distribution)?;
    conn.execute(
        "INSERT INTO null_models
         (test_name, grouping_key, method, observed, null_mean, null_std,
          null_ci_low, null_ci_high, p_value, n_iterations, null_distribution)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
         ON CONFLICT(test_name, grouping_key, method) DO UPDATE SET
            observed = excluded.observed,
            null_mean = excluded.null_mean,
            null_std = excluded.null_std,
            null_ci_low = excluded.null_ci_low,
            null_ci_high = excluded.null_ci_high,
            p_value = excluded.p_value,
            n_iterations = excluded.n_iterations,
            null_distribution = excluded.null_distribution,
            computed_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')",
        rusqlite::params![
            test_name, grouping_key, method, observed, null_mean, null_std,
            null_ci_low, null_ci_high, p_value, n_iterations as i64, dist_json,
        ],
    )?;
    Ok(())
}

pub fn list_null_models(conn: &Connection, limit: usize) -> Result<Vec<NullModelRow>> {
    let mut stmt = conn.prepare(
        "SELECT test_name, grouping_key, method, observed, null_mean, null_std,
                null_ci_low, null_ci_high, p_value, n_iterations, computed_at
           FROM null_models
           ORDER BY computed_at DESC
           LIMIT ?1",
    )?;
    let rows: Vec<NullModelRow> = stmt.query_map([limit as i64], |r| {
        Ok(NullModelRow {
            test_name: r.get(0)?,
            grouping_key: r.get(1)?,
            method: r.get(2)?,
            observed: r.get(3)?,
            null_mean: r.get(4)?,
            null_std: r.get(5)?,
            null_ci_low: r.get(6)?,
            null_ci_high: r.get(7)?,
            p_value: r.get(8)?,
            n_iterations: r.get::<_, i64>(9)? as usize,
            computed_at: r.get(10)?,
        })
    })?.filter_map(|r| r.ok()).collect();
    Ok(rows)
}

// ─── Claim management ────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct ClaimRow {
    pub claim_id: String,
    pub agent_id: String,
    pub claim_type: String,
    pub status: String,
    pub confidence: f64,
    pub description: String,
    pub created_at: String,
}

/// Insert a discovery claim. Idempotent on `claim_id`.
pub fn insert_claim(
    conn: &Connection,
    claim_id: &str,
    agent_id: &str,
    claim_type: &str,
    claim_data: &serde_json::Value,
    description: &str,
    confidence: f64,
    status: &str,
) -> Result<()> {
    let data_json = serde_json::to_string(claim_data)?;
    conn.execute(
        "INSERT OR IGNORE INTO claims
         (claim_id, agent_id, claim_type, claim_data, confidence, status, description)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![claim_id, agent_id, claim_type, data_json, confidence, status, description],
    )?;
    Ok(())
}

/// List claims, newest first.
pub fn list_claims(conn: &Connection, limit: usize) -> Result<Vec<ClaimRow>> {
    let mut stmt = conn.prepare(
        "SELECT claim_id, agent_id, claim_type, status, confidence, description, created_at
           FROM claims
           ORDER BY created_at DESC
           LIMIT ?1",
    )?;
    let rows: Vec<ClaimRow> = stmt.query_map([limit as i64], |r| {
        Ok(ClaimRow {
            claim_id: r.get(0)?,
            agent_id: r.get(1)?,
            claim_type: r.get(2)?,
            status: r.get(3)?,
            confidence: r.get(4)?,
            description: r.get(5)?,
            created_at: r.get(6)?,
        })
    })?.filter_map(|r| r.ok()).collect();
    Ok(rows)
}

// ─── Hypothesis listing ──────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct HypothesisRow {
    pub hypothesis_id: String,
    pub class: String,
    pub title: String,
    pub description: String,
    pub testable_prediction: String,
    pub status: String,
    pub confidence: f64,
    pub evidence_for: i32,
    pub evidence_against: i32,
    pub created_at: String,
    pub updated_at: String,
}

/// List hypotheses, newest first.
pub fn list_hypotheses(conn: &Connection, limit: usize) -> Result<Vec<HypothesisRow>> {
    let mut stmt = conn.prepare(
        "SELECT hypothesis_id, class, title, description, testable_prediction,
                status, confidence, evidence_for, evidence_against, created_at, updated_at
           FROM hypotheses
           ORDER BY updated_at DESC
           LIMIT ?1",
    )?;
    let rows: Vec<HypothesisRow> = stmt.query_map([limit as i64], |r| {
        Ok(HypothesisRow {
            hypothesis_id: r.get(0)?,
            class: r.get(1)?,
            title: r.get(2)?,
            description: r.get(3)?,
            testable_prediction: r.get(4)?,
            status: r.get(5)?,
            confidence: r.get(6)?,
            evidence_for: r.get(7)?,
            evidence_against: r.get(8)?,
            created_at: r.get(9)?,
            updated_at: r.get(10)?,
        })
    })?.filter_map(|r| r.ok()).collect();
    Ok(rows)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::schema;

    fn setup() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        schema::initialize(&conn).unwrap();

        // Insert test data
        conn.execute_batch("
            INSERT INTO benchmarks (record_id, potential_id, potential_label, pair_style, element, property, reference_value, predicted_value, unit)
            VALUES ('r1', 'p1', 'Adams-1989', 'eam/alloy', 'Al', 'C11', 108.2, 110.5, 'GPa');
            INSERT INTO benchmarks (record_id, potential_id, potential_label, pair_style, element, property, reference_value, predicted_value, unit)
            VALUES ('r2', 'p1', 'Adams-1989', 'eam/alloy', 'Al', 'C12', 61.3, 63.0, 'GPa');
            INSERT INTO benchmarks (record_id, potential_id, potential_label, pair_style, element, property, reference_value, predicted_value, unit)
            VALUES ('r3', 'p1', 'Adams-1989', 'eam/alloy', 'Al', 'C44', 28.5, 30.0, 'GPa');
            INSERT INTO benchmarks (record_id, potential_id, potential_label, pair_style, element, property, reference_value, predicted_value, unit)
            VALUES ('r4', 'p2', 'Mishin-1999', 'eam/alloy', 'Al', 'C11', 108.2, 106.0, 'GPa');
            INSERT INTO benchmarks (record_id, potential_id, potential_label, pair_style, element, property, reference_value, predicted_value, unit)
            VALUES ('r5', 'p2', 'Mishin-1999', 'eam/alloy', 'Al', 'C12', 61.3, 59.8, 'GPa');
            INSERT INTO benchmarks (record_id, potential_id, potential_label, pair_style, element, property, reference_value, predicted_value, unit)
            VALUES ('r6', 'p2', 'Mishin-1999', 'eam/alloy', 'Al', 'C44', 28.5, 29.1, 'GPa');
            INSERT INTO benchmarks (record_id, potential_id, potential_label, pair_style, element, property, reference_value, predicted_value, unit)
            VALUES ('r7', 'p3', 'MEAM-Lee', 'meam', 'Al', 'C11', 108.2, 112.0, 'GPa');
            INSERT INTO benchmarks (record_id, potential_id, potential_label, pair_style, element, property, reference_value, predicted_value, unit)
            VALUES ('r8', 'p3', 'MEAM-Lee', 'meam', 'Al', 'C12', 61.3, 64.5, 'GPa');
            INSERT INTO benchmarks (record_id, potential_id, potential_label, pair_style, element, property, reference_value, predicted_value, unit)
            VALUES ('r9', 'p3', 'MEAM-Lee', 'meam', 'Al', 'C44', 28.5, 27.0, 'GPa');
        ").unwrap();

        conn
    }

    #[test]
    fn test_summary() {
        let conn = setup();
        let s = summary(&conn).unwrap();
        assert_eq!(s.total_records, 9);
        assert_eq!(s.unique_elements, 1);
        assert_eq!(s.unique_potentials, 3);
        assert_eq!(s.unique_pair_styles, 2);
    }

    #[test]
    fn test_error_vectors() {
        let conn = setup();
        let vecs = error_vectors(&conn, Some("Al"), None).unwrap();
        assert_eq!(vecs.len(), 3);
        assert_eq!(vecs[0].errors.len(), 3); // C11, C12, C44
    }

    #[test]
    fn test_stratified_correlations() {
        let conn = setup();
        let (pooled, strats) = stratified_correlations(&conn, "pair_style", Some("Al")).unwrap();
        assert!(pooled.is_finite());
        assert!(!strats.is_empty());
    }

    #[test]
    fn test_hypothesis_crud() {
        let conn = setup();
        insert_hypothesis(&conn, "H001", "fingerprint", "Test",
            "Description", "Prediction", 0.5).unwrap();
        update_hypothesis_status(&conn, "H001", "confirmed", 5, 1, 0.85).unwrap();

        let status: String = conn.query_row(
            "SELECT status FROM hypotheses WHERE hypothesis_id = 'H001'",
            [], |r| r.get(0)
        ).unwrap();
        assert_eq!(status, "confirmed");
    }
}
