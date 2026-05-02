//! Lupine Distill — ground-truth research engine for interatomic potential discovery.
//!
//! See `docs` in the dissertation for the architectural intent. The CLI here is
//! deliberately thin: each subcommand maps to one of the hypothesis modules or
//! the DSPy bridge. Rust owns the data and the math; Python owns the reasoning.

mod bridge;
mod cross_style;
mod db;
mod hypothesis;
mod literature;
mod null_model;
mod orthogonalize;
mod rank_correlation;
mod worker_sync;
#[cfg(test)]
mod test_fixtures;

use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use rusqlite::Connection;
use serde_json::json;
use std::path::PathBuf;

const AGENT_ID: &str = "lupine-distill";

#[derive(Parser, Debug)]
#[command(name = "distill", version, about = "Lupine Distill — ground-truth research engine")]
struct Cli {
    /// SQLite database file. Created if missing.
    #[arg(long, global = true, default_value = "distill.db")]
    db: PathBuf,

    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand, Debug)]
enum Command {
    /// Database operations.
    Db {
        #[command(subcommand)]
        action: DbAction,
    },
    /// Hypothesis tests on the ingested benchmark data.
    Test {
        #[command(subcommand)]
        which: TestWhich,
    },
    /// Generate a new hypothesis via the DSPy bridge (requires Python + lupine-dspy).
    Theorize {
        /// Restrict the data summary to one element.
        #[arg(long)]
        element: Option<String>,
    },
    /// Significance testing — permutation tests + bootstrap CIs.
    NullModel {
        #[command(subcommand)]
        which: NullWhich,
    },
    /// Confound elimination — project errors orthogonal to the reference
    /// direction and re-test the hyper-ribbon claim.
    Orthogonalize {
        /// Restrict to one element. Default: pool all 15 benchmark elements.
        #[arg(long)]
        element: Option<String>,
    },
    /// Cross-style PC1 alignment — for each element, compute pairwise PC1
    /// cosine similarity between pair_style families. Tests the LLM-generated
    /// `HYP-CU-UNIVERSAL-ALIGN-001` (PC1 element-intrinsic, not style-intrinsic).
    CrossStylePc1 {
        /// Restrict to one element.
        #[arg(long)]
        element: Option<String>,
        /// Run a random-unit-vector null model and persist the p-value.
        #[arg(long)]
        with_null: bool,
        #[arg(long, default_value_t = 1000)]
        iterations: usize,
    },
    /// Many-body rank vs participation ratio — Spearman correlation against
    /// the cached manifolds table. Tests `error_manifold_dimensionality_scaling`.
    RankCorrelation,
    /// Literature-grounded investigation. Pulls our DB findings about an
    /// element, queries Semantic Scholar, persists papers, mines abstracts
    /// via the DSPy bridge, and emits LiteratureComputationGap claims when
    /// extracted values disagree with our DB.
    Investigate {
        /// Element symbol (Al, Cu, Fe, ...).
        element: String,
        /// How many papers to fetch from Semantic Scholar.
        #[arg(long, default_value_t = 8)]
        papers: usize,
        /// Don't call the DSPy bridge — persist papers only.
        #[arg(long)]
        no_bridge: bool,
    },
    /// Evaluate hypotheses — run the appropriate test, null model, and update status.
    ///
    /// Without --id, evaluates all 'proposed' hypotheses.
    Evaluate {
        /// Evaluate a single hypothesis by ID.
        #[arg(long)]
        id: Option<String>,
        /// Number of null-model iterations.
        #[arg(long, default_value_t = 1000)]
        iterations: usize,
        /// Significance threshold for confirmation (p < alpha).
        #[arg(long, default_value_t = 0.05)]
        alpha: f64,
    },
}

#[derive(Subcommand, Debug)]
enum NullWhich {
    /// Permutation null for fingerprint LOO classifier (shuffle pair_style labels).
    Fingerprint {
        #[arg(long)]
        element: Option<String>,
        #[arg(long, default_value_t = 1000)]
        iterations: usize,
    },
    /// Random-unit-vector null for transfer PC1 cosine similarity.
    Transfer {
        #[arg(long)]
        pair_style: Option<String>,
        #[arg(long, default_value_t = 1000)]
        iterations: usize,
    },
    /// Bootstrap CI for manifold participation ratio.
    Manifold {
        /// Grouping key, e.g. "style:meam", "element:Cu", or "global".
        grouping_key: String,
        #[arg(long, default_value_t = 1000)]
        iterations: usize,
    },
}

#[derive(Subcommand, Debug)]
enum DbAction {
    /// Initialize an empty database (idempotent).
    Init,
    /// Ingest benchmark CSVs from a directory.
    Ingest {
        /// Directory containing `*.csv` files (e.g. `../atlas-distill/benchmarks/`).
        dir: PathBuf,
    },
    /// Migrate legacy JSONL records + claims into the relational schema.
    MigrateLedger {
        /// Directory containing `records.jsonl` and `claims.jsonl`.
        dir: PathBuf,
    },
    /// Print summary statistics for the database.
    Summary,
    /// Drop and recreate the database file (destructive — confirms via --force).
    Reset {
        #[arg(long)]
        force: bool,
    },
    /// List cached manifold analyses (newest first).
    Manifolds,
    /// List cached PC1 alignments (transfer detail).
    Alignments {
        #[arg(long, default_value_t = 100)]
        limit: usize,
    },
    /// List cached null-model significance results.
    NullModels {
        #[arg(long, default_value_t = 100)]
        limit: usize,
    },
    /// List discovery claims (newest first).
    Claims {
        #[arg(long, default_value_t = 50)]
        limit: usize,
    },
    /// List proposed/confirmed/refuted hypotheses.
    Hypotheses {
        #[arg(long, default_value_t = 50)]
        limit: usize,
    },
    /// Seed the three core hypotheses (fingerprint, manifold, transfer).
    SeedHypotheses,
    /// Analytical statistics: stratified correlations and family breakdowns.
    Stats {
        /// Element filter.
        #[arg(long)]
        element: Option<String>,
        /// Grouping column for stratified correlations (element, pair_style, property, potential_label).
        #[arg(long, default_value = "pair_style")]
        group_by: String,
    },
}

#[derive(Subcommand, Debug)]
enum TestWhich {
    /// Hypothesis 3.1 — functional form fingerprints (leave-one-out NN classifier).
    Fingerprint {
        #[arg(long)]
        element: Option<String>,
    },
    /// Hypothesis 3.2 — cross-element transfer universality (PC1 cosine similarity).
    Transfer {
        #[arg(long, value_name = "PAIR_STYLE")]
        pair_style: Option<String>,
    },
    /// Hypothesis 3.3 — manifold dimensionality / participation ratio (Jacobi eigensolve).
    Manifold,
    /// Advanced stress tests for hyper-ribbon geometry (stability, ablation, LOO, etc.)
    RibbonStress {
        #[arg(long, default_value_t = 50)]
        iterations: usize,
    },
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    let db_path = cli.db.to_string_lossy().to_string();

    match cli.command {
        Command::Db { action } => match action {
            DbAction::Init => {
                let _conn = open_db(&db_path)?;
                eprintln!("[db] initialized {}", db_path);
            }
            DbAction::Ingest { dir } => {
                let conn = open_db(&db_path)?;
                let n = db::ingest::import_benchmarks_dir(&conn, &dir)
                    .with_context(|| format!("ingesting {}", dir.display()))?;
                eprintln!("[db] ingested {} records from {}", n, dir.display());
            }
            DbAction::MigrateLedger { dir } => {
                let conn = open_db(&db_path)?;
                let n = db::ingest::import_ledger(&conn, &dir)
                    .with_context(|| format!("migrating ledger at {}", dir.display()))?;
                eprintln!("[db] migrated {} records from JSONL ledger at {}", n, dir.display());
            }
            DbAction::Summary => {
                let conn = open_db(&db_path)?;
                let s = db::query::summary(&conn)?;
                println!("{}", serde_json::to_string_pretty(&s)?);
            }
            DbAction::Reset { force } => {
                if !force {
                    anyhow::bail!(
                        "refusing to delete '{}' without --force (this drops all ingested data, manifolds, and claims).",
                        db_path,
                    );
                }
                for suffix in ["", "-shm", "-wal", "-journal"] {
                    let path = format!("{}{}", db_path, suffix);
                    if std::path::Path::new(&path).exists() {
                        std::fs::remove_file(&path)
                            .with_context(|| format!("removing {}", path))?;
                        eprintln!("[db] removed {}", path);
                    }
                }
                let _conn = open_db(&db_path)?;
                eprintln!("[db] reset and re-initialized {}", db_path);
            }
            DbAction::Manifolds => {
                let conn = open_db(&db_path)?;
                let rows = db::query::list_manifolds(&conn)?;
                eprintln!("[db] {} cached manifold analyses", rows.len());
                println!("{}", serde_json::to_string_pretty(&rows)?);
            }
            DbAction::Alignments { limit } => {
                let conn = open_db(&db_path)?;
                let rows = db::query::list_pc1_alignments(&conn, limit)?;
                eprintln!("[db] {} cached PC1 alignments (limit {})", rows.len(), limit);
                println!("{}", serde_json::to_string_pretty(&rows)?);
            }
            DbAction::NullModels { limit } => {
                let conn = open_db(&db_path)?;
                let rows = db::query::list_null_models(&conn, limit)?;
                eprintln!("[db] {} null-model results (limit {})", rows.len(), limit);
                println!("{}", serde_json::to_string_pretty(&rows)?);
            }
            DbAction::Claims { limit } => {
                let conn = open_db(&db_path)?;
                let rows = db::query::list_claims(&conn, limit)?;
                eprintln!("[db] {} claims (limit {})", rows.len(), limit);
                println!("{}", serde_json::to_string_pretty(&rows)?);
            }
            DbAction::Hypotheses { limit } => {
                let conn = open_db(&db_path)?;
                let rows = db::query::list_hypotheses(&conn, limit)?;
                eprintln!("[db] {} hypotheses (limit {})", rows.len(), limit);
                println!("{}", serde_json::to_string_pretty(&rows)?);
            }
            DbAction::SeedHypotheses => {
                let conn = open_db(&db_path)?;
                seed_core_hypotheses(&conn)?;
            }
            DbAction::Stats { element, group_by } => {
                let conn = open_db(&db_path)?;
                run_stats(&conn, element.as_deref(), &group_by)?;
            }
        },
        Command::Test { which } => match which {
            TestWhich::Fingerprint { element } => {
                let conn = open_db(&db_path)?;
                let r = hypothesis::fingerprint::test_fingerprint(&conn, element.as_deref())?;
                eprintln!(
                    "[fingerprint] LOO accuracy = {:.3} (chance = {:.3}) over {} potentials, {} families — {}",
                    r.loo_accuracy, r.chance_accuracy, r.n_potentials, r.n_families,
                    if r.supported { "SUPPORTED" } else { "not supported" },
                );
                persist_fingerprint_claim(&conn, element.as_deref(), &r)?;
                println!("{}", serde_json::to_string_pretty(&r)?);
            }
            TestWhich::Transfer { pair_style } => {
                let conn = open_db(&db_path)?;
                let r = hypothesis::transfer::test_transfer(&conn, pair_style.as_deref())?;
                eprintln!(
                    "[transfer] mean |cos(PC1)| = {:.3} over {} comparisons — {}",
                    r.mean_cosine_similarity,
                    r.comparisons.len(),
                    if r.supported { "SUPPORTED" } else { "not supported" },
                );
                persist_transfer_claim(&conn, pair_style.as_deref(), &r)?;
                println!("{}", serde_json::to_string_pretty(&r)?);
            }
            TestWhich::Manifold => {
                let conn = open_db(&db_path)?;
                let r = hypothesis::manifold::test_manifold(&conn)?;
                eprintln!(
                    "[manifold] {}/{} groups exhibit hyper-ribbon geometry — {}",
                    r.analyses.iter().filter(|a| a.is_ribbon).count(),
                    r.n_groups_tested,
                    if r.hyper_ribbon_confirmed { "CONFIRMED" } else { "not confirmed" },
                );
                persist_manifold_results(&conn, &r)?;
                println!("{}", serde_json::to_string_pretty(&r)?);
            }
            TestWhich::RibbonStress { iterations } => {
                let conn = open_db(&db_path)?;
                let r = hypothesis::ribbon_stress::test_ribbon_stress(&conn, iterations)?;
                eprintln!(
                    "[ribbon-stress] {}/{} tests support hyper-ribbon robustness:",
                    r.tests_supporting, r.tests_total,
                );
                eprintln!("  stability: {}", if r.stability.stable { "✅ PASS" } else { "❌ FAIL" });
                eprintln!("  ablation : {}", if r.ablation.critical_property.is_some() { "✅ PASS" } else { "❌ FAIL" });
                eprintln!("  influence: {}", if r.influence.robust { "✅ PASS" } else { "❌ FAIL" });
                eprintln!("  alignment: {}", if r.alignment.ribbons_parallel { "✅ PASS" } else { "❌ FAIL" });
                eprintln!("  threshold: {}", if r.threshold.converged { "✅ PASS" } else { "❌ FAIL" });
                println!("{}", serde_json::to_string_pretty(&r)?);
            }
        },
        Command::Theorize { element } => {
            let conn = open_db(&db_path)?;
            run_theorize(&conn, element.as_deref())?;
        }
        Command::NullModel { which } => {
            let conn = open_db(&db_path)?;
            run_null_model(&conn, which)?;
        }
        Command::Orthogonalize { element } => {
            let conn = open_db(&db_path)?;
            run_orthogonalize(&conn, element.as_deref())?;
        }
        Command::CrossStylePc1 { element, with_null, iterations } => {
            let conn = open_db(&db_path)?;
            run_cross_style(&conn, element.as_deref(), with_null, iterations)?;
        }
        Command::RankCorrelation => {
            let conn = open_db(&db_path)?;
            run_rank_correlation(&conn)?;
        }
        Command::Investigate { element, papers, no_bridge } => {
            let conn = open_db(&db_path)?;
            let result = literature::investigate::run(
                &conn, &element, Some(papers), no_bridge,
            )?;
            eprintln!(
                "[investigate:{}] DONE — {} papers fetched, {} mined, {} records, {} gaps",
                element,
                result.papers_fetched,
                result.papers_mined,
                result.records_extracted,
                result.gaps_detected,
            );
            for gap in result.gap_summaries.iter().take(8) {
                eprintln!(
                    "  GAP: {} {} {} → lit={:.3} ours={:.3} ({:+.1}%) doi={}",
                    element, gap.potential_label, gap.property,
                    gap.literature_value, gap.our_value,
                    (gap.literature_value - gap.our_value) / gap.our_value * 100.0,
                    gap.doi.as_deref().unwrap_or("(none)"),
                );
            }
            println!("{}", serde_json::to_string_pretty(&result)?);
        }
        Command::Evaluate { id, iterations, alpha } => {
            let conn = open_db(&db_path)?;
            run_evaluate(&conn, id.as_deref(), iterations, alpha)?;
        }
    }

    Ok(())
}

/// Open the SQLite database (creates + migrates if missing).
fn open_db(path: &str) -> Result<Connection> {
    db::schema::open(path).with_context(|| format!("opening database at {}", path))
}

/// Insert the three core hypotheses from the dissertation.
fn seed_core_hypotheses(conn: &Connection) -> Result<()> {
    let hypotheses = [
        (
            "HYP-FP-001",
            "fingerprint",
            "Functional Form Fingerprints (§3.1)",
            "Each pair_style family (EAM, MEAM, Tersoff, etc.) has a distinctive error \
             signature in (C11, C12, C44) space that can discriminate functional form \
             without examining potential parameters.",
            "Leave-one-out nearest-neighbor classifier achieves accuracy significantly \
             above chance level (1/K for K families).",
            0.5,
        ),
        (
            "HYP-MF-001",
            "manifold",
            "Universal Hyper-Ribbon Geometry (§3.3)",
            "Interatomic potential error vectors lie on low-dimensional hyper-ribbon \
             manifolds, with participation ratio PR << D (property dimension) for all \
             elements and pair_styles.",
            "Jacobi eigensolve on error covariance yields PR < 2 for element-grouped \
             and style-grouped data.",
            0.6,
        ),
        (
            "HYP-TF-001",
            "transfer",
            "Cross-Element PC1 Transfer Universality (§3.2)",
            "The primary error axis (PC1) is conserved across elements within the same \
             pair_style family, suggesting a universal error structure independent of \
             the fitted element.",
            "Cosine similarity between PC1 vectors of different elements within the \
             same pair_style exceeds 0.8 on average.",
            0.5,
        ),
    ];

    for (id, class, title, desc, prediction, confidence) in &hypotheses {
        db::query::insert_hypothesis(conn, id, class, title, desc, prediction, *confidence)?;
        eprintln!("[db] seeded hypothesis {} ({})", id, class);
    }

    eprintln!("[db] {} core hypotheses ready for evaluation", hypotheses.len());
    Ok(())
}

/// Analytical statistics: stratified correlations, family breakdowns, literature status.
fn run_stats(conn: &Connection, element: Option<&str>, group_by: &str) -> Result<()> {
    // ── 1. Family statistics ────────────────────────────────
    let families = db::query::family_statistics(conn, element)?;
    eprintln!("[stats] {} pair_style families{}",
        families.len(),
        element.map_or(String::new(), |e| format!(" for element={}", e)),
    );
    for f in &families {
        eprintln!(
            "  {:20} {:>4} potentials, {:>6} records, mean_err={:+.2}% ± {:.2}%",
            f.pair_style, f.n_potentials, f.n_records, f.mean_error_pct, f.std_error_pct,
        );
    }

    // ── 2. Stratified correlations ──────────────────────────
    let (pooled_r, strats) = db::query::stratified_correlations(conn, group_by, element)?;
    eprintln!(
        "\n[stats] Pearson r (pooled, ref vs predicted): {:.4}, {} strata by {}",
        pooled_r, strats.len(), group_by,
    );
    for s in &strats {
        eprintln!("  {:30} n={:>5} r={:+.4}", s.group, s.n, s.pearson_r);
    }

    // ── 3. Literature status ────────────────────────────────
    let unreviewed = db::query::unreviewed_count(conn)?;
    eprintln!("\n[stats] {} unreviewed literature entries", unreviewed);

    // Emit JSON output
    println!("{}", serde_json::to_string_pretty(&json!({
        "families": families,
        "pooled_pearson_r": pooled_r,
        "stratified_correlations": strats,
        "unreviewed_literature": unreviewed,
    }))?);

    Ok(())
}

/// Build a manifold-grounded data summary, call the DSPy bridge, and persist the
/// returned hypothesis to the database.
fn run_theorize(conn: &Connection, element: Option<&str>) -> Result<()> {
    if !bridge::is_available() {
        anyhow::bail!(
            "DSPy bridge not available — ensure `python` is on PATH and the \
             `lupine-dspy/` directory is reachable. Run `pip install -e \
             lupine-dspy` from the workspace root."
        );
    }

    let manifold = hypothesis::manifold::test_manifold(conn)?;
    let summary = db::query::summary(conn)?;

    let manifolds_json: Vec<_> = manifold.analyses.iter()
        .filter(|m| element.map_or(true, |el| m.element.as_deref() == Some(el) || m.element.is_none()))
        .map(|m| json!({
            "label": m.label,
            "element": m.element,
            "pair_style": m.pair_style,
            "n_potentials": m.n_potentials,
            "n_properties": m.n_properties,
            "participation_ratio": m.participation_ratio,
            "explained_variance": m.explained_variance,
            "is_ribbon": m.is_ribbon,
        }))
        .collect();

    let existing: Vec<String> = {
        let mut stmt = conn.prepare(
            "SELECT description FROM hypotheses WHERE status != 'refuted' ORDER BY created_at DESC LIMIT 20"
        )?;
        let v: Vec<String> = stmt.query_map([], |r| r.get::<_, String>(0))?
            .filter_map(|r| r.ok())
            .collect();
        v
    };

    let stress = hypothesis::ribbon_stress::test_ribbon_stress(conn, 50).unwrap_or_else(|_| hypothesis::ribbon_stress::RibbonStressResult {
        stability: hypothesis::ribbon_stress::StabilityResult { full_pr: 1.0, n_resamples: 0, mean_pr: 1.0, std_pr: 0.0, min_pr: 1.0, max_pr: 1.0, ribbon_fraction: 0.0, stable: false },
        ablation: hypothesis::ribbon_stress::AblationResult { full_pr: 1.0, full_dim: 0, ablations: vec![], critical_property: None, redundant_property: None },
        influence: hypothesis::ribbon_stress::InfluenceResult { full_pr: 1.0, n_potentials: 0, loo_prs: vec![], max_influence: 0.0, n_ribbon_breakers: 0, robust: false },
        alignment: hypothesis::ribbon_stress::AlignmentResult { comparisons: vec![], mean_cosine: 0.0, n_comparisons: 0, ribbons_parallel: false },
        threshold: hypothesis::ribbon_stress::ThresholdResult { convergence_curve: vec![], full_n: 0, full_pr: 1.0, convergence_n: None, converged: false },
        tests_supporting: 0,
        tests_total: 5,
    });

    let element_ctx = element.unwrap_or("all").to_string();
    let request = bridge::BridgeRequest::Theorize {
        element: element_ctx.clone(),
        data_summary: json!({
            "manifolds": manifolds_json,
            "ribbon_stress": {
                "stable": stress.stability.stable,
                "holistic": stress.ablation.critical_property.is_none(),
                "parallel_ribbons": stress.alignment.ribbons_parallel,
            },
            "totals": {
                "records": summary.total_records,
                "potentials": summary.unique_potentials,
                "elements": summary.unique_elements,
                "pair_styles": summary.unique_pair_styles,
                "mean_abs_error_pct": summary.mean_abs_error_pct,
            },
        }),
        existing_hypotheses: existing,
    };

    let response = bridge::call(&request).context("DSPy bridge call failed")?;

    if !response.success {
        anyhow::bail!(
            "DSPy bridge returned an error: {}",
            response.error.as_deref().unwrap_or("(no message)"),
        );
    }

    println!("{}", serde_json::to_string_pretty(&response.data)?);

    if let (Some(id), Some(desc)) = (
        response.data.get("hypothesis_id").and_then(|v| v.as_str()),
        response.data.get("description").and_then(|v| v.as_str()),
    ) {
        let class = response.data.get("type").and_then(|v| v.as_str()).unwrap_or("unknown");
        let title = response.data.get("title").and_then(|v| v.as_str()).unwrap_or(desc);
        let prediction = response.data.get("testable_prediction").and_then(|v| v.as_str()).unwrap_or("");
        let confidence = response.data.get("confidence").and_then(|v| v.as_f64()).unwrap_or(0.0);

        db::query::insert_hypothesis(conn, id, class, title, desc, prediction, confidence)?;
        eprintln!("[theorize] persisted hypothesis {} ({}) for element={}", id, class, element_ctx);
    } else {
        eprintln!("[theorize] response did not include hypothesis_id/description; not persisting.");
    }

    Ok(())
}

// ─── Persistence helpers — close the data loop ─────────────────────────────
//
// Every successful test result lands in the relational ground (`manifolds` or
// `claims`) so the database becomes a self-describing log of what's been
// validated. Re-runs upsert by grouping_key; claims are content-addressed by
// FNV hash so the same observed configuration produces a stable claim_id.

/// Persist every per-group manifold analysis to the cache table, plus a roll-up
/// hyper-ribbon claim if the criterion is met. Detects ManifoldEvolution by
/// comparing the new participation ratio against the previously cached value.
fn persist_manifold_results(
    conn: &Connection,
    result: &hypothesis::manifold::ManifoldResult,
) -> Result<()> {
    /// Threshold for emitting a ManifoldEvolution claim — relative PR drift.
    const PR_EVOLUTION_THRESHOLD: f64 = 0.05;

    for group in &result.analyses {
        // Eigenvectors aren't computed by the current Jacobi routine — store an
        // empty list and we'll wire them in when the eigvec axes are needed for
        // the §3.2 transfer cache. The eigenvalues alone are sufficient for the
        // PR / hyper-ribbon claims being made here.
        let evecs = json!([]);

        // Detect evolution before the upsert clobbers the prior value.
        let prior_pr = db::query::previous_manifold_pr(conn, &group.label)?;

        db::query::upsert_manifold(
            conn,
            &group.label,
            group.element.as_deref(),
            group.pair_style.as_deref(),
            group.n_potentials,
            group.n_potentials,
            &group.eigenvalues,
            &evecs,
            &group.explained_variance,
            group.participation_ratio,
            group.effective_dim,
        )?;

        if let Some(prior) = prior_pr {
            let rel_drift = if prior.abs() > 1e-12 {
                ((group.participation_ratio - prior).abs() / prior.abs()).min(1.0)
            } else {
                0.0
            };
            if rel_drift > PR_EVOLUTION_THRESHOLD {
                let claim_id = format!(
                    "evolve_{}_{}",
                    sanitize(&group.label),
                    db::ledger::generate_record_id(AGENT_ID),
                );
                let data = json!({
                    "grouping": group.label,
                    "pr_before": prior,
                    "pr_after": group.participation_ratio,
                    "relative_drift": rel_drift,
                    "n_potentials_now": group.n_potentials,
                });
                let direction = if group.participation_ratio < prior { "tighter" } else { "looser" };
                let description = format!(
                    "Manifold evolution for {}: PR shifted {} from {:.3} to {:.3} (Δ={:.1}%)",
                    group.label, direction, prior, group.participation_ratio, rel_drift * 100.0,
                );
                db::query::insert_claim(
                    conn, &claim_id, AGENT_ID, "ManifoldEvolution",
                    &data, &description, rel_drift.clamp(0.0, 1.0), "proposed",
                )?;
            }
        }

        if group.is_ribbon {
            let claim_id = format!("ribbon_{}_{}", sanitize(&group.label), db::ledger::generate_record_id(AGENT_ID));
            let data = json!({
                "grouping": group.label,
                "element": group.element,
                "pair_style": group.pair_style,
                "n_properties": group.n_properties,
                "participation_ratio": group.participation_ratio,
                "explained_variance": group.explained_variance,
                "effective_dim": group.effective_dim,
            });
            let description = format!(
                "Hyper-ribbon confirmed for {} — PR={:.3} (D={}), explained_variance={:?}",
                group.label, group.participation_ratio, group.n_properties,
                group.explained_variance.iter().map(|x| (x * 1000.0).round() / 1000.0).collect::<Vec<_>>(),
            );
            let confidence = ribbon_confidence(group.participation_ratio, group.n_properties);
            db::query::insert_claim(
                conn, &claim_id, AGENT_ID, "HyperRibbonConfirmed",
                &data, &description, confidence, "proposed",
            )?;
        }
    }
    Ok(())
}

/// Confidence is monotone in how far PR sits below the property dimension.
/// PR == D → 0.0; PR == 1 → ~1.0 (a perfect 1D ribbon).
fn ribbon_confidence(pr: f64, dim: usize) -> f64 {
    if dim <= 1 {
        return 0.0;
    }
    let span = (dim as f64) - 1.0;
    let drop = ((dim as f64) - pr).max(0.0).min(span);
    (drop / span).clamp(0.0, 1.0)
}

/// Persist a fingerprint test result as a UniversalAlignment-style claim.
/// Always recorded (with status `proposed` or `refuted`) so even null results
/// stay in the ground engine — this is the "honest log" the dissertation asks
/// for, not just a confirmation log.
fn persist_fingerprint_claim(
    conn: &Connection,
    element: Option<&str>,
    r: &hypothesis::fingerprint::FingerprintResult,
) -> Result<()> {
    let element_tag = element.unwrap_or("all");
    let claim_id = format!(
        "fingerprint_{}_{}",
        sanitize(element_tag),
        db::ledger::generate_record_id(AGENT_ID),
    );
    let data = json!({
        "element": element_tag,
        "loo_accuracy": r.loo_accuracy,
        "chance_accuracy": r.chance_accuracy,
        "n_potentials": r.n_potentials,
        "n_families": r.n_families,
        "n_misclassified": r.misclassified.len(),
    });
    let description = format!(
        "Fingerprint LOO classifier on (C11,C12,C44) for element={}: acc={:.3} vs chance={:.3} ({} potentials, {} families)",
        element_tag, r.loo_accuracy, r.chance_accuracy, r.n_potentials, r.n_families,
    );
    let status = if r.supported { "proposed" } else { "refuted" };
    let confidence = if r.chance_accuracy > 0.0 {
        (r.loo_accuracy / r.chance_accuracy - 1.0).clamp(0.0, 1.0)
    } else {
        0.0
    };
    db::query::insert_claim(
        conn, &claim_id, AGENT_ID, "FingerprintTest",
        &data, &description, confidence, status,
    )?;
    Ok(())
}

/// Persist a transfer test result: the rolled-up UniversalAlignment claim, plus
/// every per-element-pair PC1 alignment row. Element pairs are canonicalized
/// alphabetically (matching the i<j iteration in test_transfer) so the
/// pc1_alignments UNIQUE constraint upserts cleanly across re-runs.
fn persist_transfer_claim(
    conn: &Connection,
    pair_style: Option<&str>,
    r: &hypothesis::transfer::TransferResult,
) -> Result<()> {
    let style_tag = pair_style.unwrap_or("all");
    let claim_id = format!(
        "transfer_{}_{}",
        sanitize(style_tag),
        db::ledger::generate_record_id(AGENT_ID),
    );
    let data = json!({
        "pair_style": style_tag,
        "mean_cosine_similarity": r.mean_cosine_similarity,
        "n_comparisons": r.comparisons.len(),
        "n_elements": r.n_elements,
    });
    let description = format!(
        "Cross-element PC1 transfer for pair_style={}: mean |cos|={:.3} over {} comparisons across {} elements",
        style_tag, r.mean_cosine_similarity, r.comparisons.len(), r.n_elements,
    );
    let status = if r.supported { "proposed" } else { "refuted" };
    let confidence = r.mean_cosine_similarity.clamp(0.0, 1.0);
    db::query::insert_claim(
        conn, &claim_id, AGENT_ID, "UniversalAlignment",
        &data, &description, confidence, status,
    )?;

    // Persist the comparison detail. test_transfer already iterates i < j over
    // an alphabetically-sorted element list, so element_a < element_b naturally;
    // we still canonicalize defensively in case the upstream order changes.
    let mut persisted = 0usize;
    for cmp in &r.comparisons {
        let (a, b, pc_a, pc_b, n_a, n_b) = if cmp.element_a <= cmp.element_b {
            (&cmp.element_a, &cmp.element_b, &cmp.pc1_a, &cmp.pc1_b, cmp.n_potentials_a, cmp.n_potentials_b)
        } else {
            (&cmp.element_b, &cmp.element_a, &cmp.pc1_b, &cmp.pc1_a, cmp.n_potentials_b, cmp.n_potentials_a)
        };
        db::query::upsert_pc1_alignment(
            conn, &cmp.pair_style, a, b, cmp.cosine_similarity,
            pc_a, pc_b, n_a, n_b,
        )?;
        persisted += 1;
    }
    if persisted > 0 {
        eprintln!("[transfer] persisted {} PC1 alignments to pc1_alignments", persisted);
    }
    Ok(())
}

/// SQLite-safe id fragment.
fn sanitize(s: &str) -> String {
    s.chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '_' })
        .collect()
}

// ─── null-model dispatch ────────────────────────────────────

fn run_null_model(conn: &Connection, which: NullWhich) -> Result<()> {
    let result = match which {
        NullWhich::Fingerprint { element, iterations } => {
            null_model::fingerprint_null(conn, element.as_deref(), iterations)?
        }
        NullWhich::Transfer { pair_style, iterations } => {
            null_model::transfer_null(conn, pair_style.as_deref(), iterations)?
        }
        NullWhich::Manifold { grouping_key, iterations } => {
            null_model::manifold_bootstrap(conn, &grouping_key, iterations)?
        }
    };
    eprintln!(
        "[null-model:{}] grouping={} method={} observed={:.4} null_mean={:.4} 95%CI=[{:.4},{:.4}] p={:.4} {} (n={})",
        result.test_name, result.grouping_key, result.method,
        result.observed, result.null_mean, result.null_ci_low, result.null_ci_high,
        result.p_value,
        if result.significant { "SIGNIFICANT" } else { "n.s." },
        result.n_iterations,
    );

    db::query::upsert_null_model(
        conn, &result.test_name, &result.grouping_key, &result.method,
        result.observed, result.null_mean, result.null_std,
        result.null_ci_low, result.null_ci_high,
        result.p_value, result.n_iterations,
        &result.null_distribution,
    )?;

    println!("{}", serde_json::to_string_pretty(&result)?);
    Ok(())
}

// ─── orthogonalize dispatch ─────────────────────────────────

fn run_orthogonalize(conn: &Connection, element: Option<&str>) -> Result<()> {
    let result = orthogonalize::run(conn, element)?;
    let dim = result.pooled_dim;
    eprintln!(
        "[orthogonalize] elements analyzed: {}; pooled PR before={:.3} after={:.3} (D={}) — {}",
        result.n_elements_analyzed, result.pooled_pr_before, result.pooled_pr_after, dim,
        if result.confound_detected { "CONFOUND DETECTED (ribbon was scale-coupled)" } else { "ribbon survives orthogonalization (geometry is real)" },
    );
    for el in &result.per_element {
        eprintln!(
            "  {} (n={:>3}): PR {:.3} -> {:.3}; {:.1}% of variance was along reference axis",
            el.element, el.n_potentials, el.pr_before, el.pr_after,
            el.fraction_along_scale_axis * 100.0,
        );
    }
    println!("{}", serde_json::to_string_pretty(&result)?);
    Ok(())
}

// ─── cross-style PC1 dispatch ───────────────────────────────

fn run_cross_style(
    conn: &Connection,
    element: Option<&str>,
    with_null: bool,
    iterations: usize,
) -> Result<()> {
    let result = cross_style::run(conn, element)?;
    eprintln!(
        "[cross-style-pc1] {} elements, {} pair-style comparisons; pooled mean |cos|={:.3} — {}",
        result.n_elements_analyzed,
        result.pooled_n_pairs,
        result.pooled_mean_cosine,
        if result.supported { "SUPPORTED (LLM hypothesis)" } else { "not supported" },
    );
    for el in &result.per_element {
        eprintln!(
            "  {} (styles={}): n={} pairs, mean={:.3}, range=[{:.3}, {:.3}]",
            el.element,
            el.pair_styles.len(),
            el.n_pairs,
            el.mean_cosine,
            el.min_cosine,
            el.max_cosine,
        );
    }

    let mut p_value: Option<f64> = None;
    if with_null {
        let (observed, null_mean, null_std, lo, hi, mut dist) =
            cross_style::null_model_pooled(conn, iterations)?;
        // The convention used inside null_model_pooled stashes the p-value as
        // the trailing element; pull it back out before persisting.
        let p = dist.pop().unwrap_or(1.0);
        p_value = Some(p);
        eprintln!(
            "[cross-style-pc1:null] observed={:.4} null_mean={:.4} 95%CI=[{:.4},{:.4}] p={:.4} (n={})",
            observed, null_mean, lo, hi, p, dist.len(),
        );
        db::query::upsert_null_model(
            conn,
            "cross_style_pc1",
            "all",
            "random_unit_vector",
            observed,
            null_mean,
            null_std,
            lo,
            hi,
            p,
            dist.len(),
            &dist,
        )?;
    }

    persist_cross_style_claim(conn, &result, p_value)?;
    println!("{}", serde_json::to_string_pretty(&result)?);
    Ok(())
}

fn persist_cross_style_claim(
    conn: &Connection,
    r: &cross_style::CrossStyleResult,
    p_value: Option<f64>,
) -> Result<()> {
    let claim_id = format!(
        "cross_style_pc1_{}",
        db::ledger::generate_record_id(AGENT_ID),
    );
    let data = serde_json::json!({
        "pooled_mean_cosine": r.pooled_mean_cosine,
        "n_pairs": r.pooled_n_pairs,
        "n_elements_analyzed": r.n_elements_analyzed,
        "p_value": p_value,
        "per_element_summary": r.per_element.iter().map(|el| serde_json::json!({
            "element": el.element,
            "n_pairs": el.n_pairs,
            "mean_cosine": el.mean_cosine,
            "min_cosine": el.min_cosine,
            "max_cosine": el.max_cosine,
            "pair_styles": el.pair_styles,
        })).collect::<Vec<_>>(),
    });
    let p_tail = match p_value {
        Some(p) => format!(", p={:.4}", p),
        None => String::new(),
    };
    let description = format!(
        "Cross-style PC1 alignment: pooled mean |cos|={:.3} over {} pair-style comparisons across {} elements{}",
        r.pooled_mean_cosine, r.pooled_n_pairs, r.n_elements_analyzed, p_tail,
    );
    let status = if r.supported { "proposed" } else { "refuted" };
    let confidence = r.pooled_mean_cosine.clamp(0.0, 1.0);
    db::query::insert_claim(
        conn, &claim_id, AGENT_ID, "CrossStyleAlignment",
        &data, &description, confidence, status,
    )?;
    Ok(())
}

// ─── rank-correlation dispatch ──────────────────────────────

fn run_rank_correlation(conn: &Connection) -> Result<()> {
    let result = rank_correlation::run(conn)?;
    eprintln!(
        "[rank-correlation] n={} pair-styles, Spearman ρ={:.3}, Pearson r={:.3}, p={:.4} — {}",
        result.n_styles,
        result.spearman_rho,
        result.pearson_r,
        result.two_tailed_p_value,
        if result.supported { "SUPPORTED (ρ>0.7, p<0.05)" } else { "not supported" },
    );
    for b in &result.buckets {
        eprintln!(
            "  rank={} {:20} PR={:.3}  n={}",
            b.many_body_rank, b.pair_style, b.participation_ratio, b.n_potentials,
        );
    }

    persist_rank_correlation_claim(conn, &result)?;
    println!("{}", serde_json::to_string_pretty(&result)?);
    Ok(())
}

fn persist_rank_correlation_claim(
    conn: &Connection,
    r: &rank_correlation::RankCorrelationResult,
) -> Result<()> {
    let claim_id = format!(
        "rank_correlation_{}",
        db::ledger::generate_record_id(AGENT_ID),
    );
    let data = serde_json::json!({
        "spearman_rho": r.spearman_rho,
        "pearson_r": r.pearson_r,
        "p_value": r.two_tailed_p_value,
        "n_styles": r.n_styles,
        "buckets": r.buckets,
    });
    let description = format!(
        "Many-body rank vs PR: Spearman ρ={:.3}, Pearson r={:.3}, p={:.4}, n_styles={}",
        r.spearman_rho, r.pearson_r, r.two_tailed_p_value, r.n_styles,
    );
    let status = if r.supported { "proposed" } else { "refuted" };
    let confidence = r.spearman_rho.abs().clamp(0.0, 1.0);
    db::query::insert_claim(
        conn, &claim_id, AGENT_ID, "DimensionalityRanking",
        &data, &description, confidence, status,
    )?;
    Ok(())
}

// ─── evaluate dispatch ──────────────────────────────────────

/// Evaluation report for one hypothesis.
#[derive(Debug, serde::Serialize)]
struct EvaluationReport {
    hypothesis_id: String,
    class: String,
    prior_status: String,
    test_result: serde_json::Value,
    null_model: Option<serde_json::Value>,
    verdict: String,
    p_value: Option<f64>,
    new_confidence: f64,
}

fn run_evaluate(
    conn: &Connection,
    id_filter: Option<&str>,
    iterations: usize,
    alpha: f64,
) -> Result<()> {
    // Collect hypotheses to evaluate
    let hypotheses = db::query::list_hypotheses(conn, 200)?;
    let targets: Vec<_> = hypotheses.into_iter()
        .filter(|h| {
            if let Some(id) = id_filter {
                h.hypothesis_id == id
            } else {
                h.status == "proposed"
            }
        })
        .collect();

    if targets.is_empty() {
        if let Some(id) = id_filter {
            anyhow::bail!("hypothesis '{}' not found", id);
        } else {
            eprintln!("[evaluate] no 'proposed' hypotheses to evaluate");
            return Ok(());
        }
    }

    eprintln!("[evaluate] evaluating {} hypothesis(es)", targets.len());
    let mut reports = Vec::new();

    for hyp in &targets {
        eprintln!("\n  ── {} ({}) ──", hyp.hypothesis_id, hyp.class);

        let report = evaluate_one(conn, hyp, iterations, alpha)?;

        eprintln!(
            "  verdict={} confidence={:.3} p={}",
            report.verdict,
            report.new_confidence,
            report.p_value.map_or("n/a".to_string(), |p| format!("{:.4}", p)),
        );

        // Update the hypothesis in the DB
        let (evidence_for, evidence_against) = match report.verdict.as_str() {
            "confirmed" => (hyp.evidence_for + 1, hyp.evidence_against),
            "refuted" => (hyp.evidence_for, hyp.evidence_against + 1),
            _ => (hyp.evidence_for, hyp.evidence_against),
        };
        db::query::update_hypothesis_status(
            conn,
            &hyp.hypothesis_id,
            &report.verdict,
            evidence_for,
            evidence_against,
            report.new_confidence,
        )?;

        reports.push(report);
    }

    println!("{}", serde_json::to_string_pretty(&reports)?);
    eprintln!("\n[evaluate] done: {} hypothesis(es) evaluated", reports.len());
    Ok(())
}

/// Evaluate a single hypothesis by dispatching to the correct test+null-model.
fn evaluate_one(
    conn: &Connection,
    hyp: &db::query::HypothesisRow,
    iterations: usize,
    alpha: f64,
) -> Result<EvaluationReport> {
    let effective_class = classify_hypothesis(hyp);
    if effective_class != hyp.class {
        eprintln!(
            "  [evaluate] mapped class '{}' → '{}' for dispatch",
            hyp.class, effective_class,
        );
    }

    match effective_class.as_str() {
        "fingerprint" => {
            let test = hypothesis::fingerprint::test_fingerprint(conn, None)?;
            persist_fingerprint_claim(conn, None, &test)?;
            let test_json = serde_json::to_value(&test)?;

            let null = null_model::fingerprint_null(conn, None, iterations)?;
            persist_null_result(conn, &null)?;
            let null_json = serde_json::to_value(&null)?;

            let verdict = if null.p_value < alpha && test.supported {
                "confirmed"
            } else if !test.supported {
                "refuted"
            } else {
                "needs_more_data"
            };

            Ok(EvaluationReport {
                hypothesis_id: hyp.hypothesis_id.clone(),
                class: hyp.class.clone(),
                prior_status: hyp.status.clone(),
                test_result: test_json,
                null_model: Some(null_json),
                verdict: verdict.to_string(),
                p_value: Some(null.p_value),
                new_confidence: test.loo_accuracy.clamp(0.0, 1.0),
            })
        }
        "transfer" => {
            let test = hypothesis::transfer::test_transfer(conn, None)?;
            persist_transfer_claim(conn, None, &test)?;
            let test_json = serde_json::to_value(&test)?;

            let null = null_model::transfer_null(conn, None, iterations)?;
            persist_null_result(conn, &null)?;
            let null_json = serde_json::to_value(&null)?;

            let verdict = if null.p_value < alpha && test.supported {
                "confirmed"
            } else if !test.supported {
                "refuted"
            } else {
                "needs_more_data"
            };

            Ok(EvaluationReport {
                hypothesis_id: hyp.hypothesis_id.clone(),
                class: hyp.class.clone(),
                prior_status: hyp.status.clone(),
                test_result: test_json,
                null_model: Some(null_json),
                verdict: verdict.to_string(),
                p_value: Some(null.p_value),
                new_confidence: test.mean_cosine_similarity.clamp(0.0, 1.0),
            })
        }
        "manifold" => {
            let test = hypothesis::manifold::test_manifold(conn)?;
            persist_manifold_results(conn, &test)?;
            let test_json = serde_json::to_value(&test)?;

            // Bootstrap a representative grouping
            let null = null_model::manifold_bootstrap(conn, "global", iterations)?;
            persist_null_result(conn, &null)?;
            let null_json = serde_json::to_value(&null)?;

            let verdict = if null.p_value < alpha && test.hyper_ribbon_confirmed {
                "confirmed"
            } else if !test.hyper_ribbon_confirmed {
                "refuted"
            } else {
                "needs_more_data"
            };

            Ok(EvaluationReport {
                hypothesis_id: hyp.hypothesis_id.clone(),
                class: hyp.class.clone(),
                prior_status: hyp.status.clone(),
                test_result: test_json,
                null_model: Some(null_json),
                verdict: verdict.to_string(),
                p_value: Some(null.p_value),
                new_confidence: if test.hyper_ribbon_confirmed { 0.95 } else { 0.1 },
            })
        }
        other => {
            eprintln!("  [evaluate] no test infrastructure for class '{}', skipping", other);
            Ok(EvaluationReport {
                hypothesis_id: hyp.hypothesis_id.clone(),
                class: hyp.class.clone(),
                prior_status: hyp.status.clone(),
                test_result: json!({ "skipped": true, "reason": format!("no test for class: {}", other) }),
                null_model: None,
                verdict: "needs_more_data".to_string(),
                p_value: None,
                new_confidence: hyp.confidence,
            })
        }
    }
}

/// Map an LLM-generated hypothesis class to the closest available test.
///
/// The LLM may emit class names like "causal_mechanism", "parameter_bound",
/// "symmetry_breaking", etc. We route them to the closest statistical test
/// by matching on keywords in the class name, description, and prediction.
fn classify_hypothesis(hyp: &db::query::HypothesisRow) -> String {
    // Exact matches for our core classes
    let class_lower = hyp.class.to_ascii_lowercase();
    match class_lower.as_str() {
        "fingerprint" | "fingerprinttest" => return "fingerprint".to_string(),
        "transfer" | "universalalignment" | "universal_alignment" => return "transfer".to_string(),
        "manifold" | "hyper_ribbon" | "hyperribbonconfirmed" => return "manifold".to_string(),
        _ => {}
    }

    // Fuzzy: search the class name, description, and prediction for keywords
    let text = format!(
        "{} {} {} {}",
        class_lower,
        hyp.description.to_ascii_lowercase(),
        hyp.testable_prediction.to_ascii_lowercase(),
        hyp.title.to_ascii_lowercase(),
    );

    // Manifold keywords (most common from LLM output)
    let manifold_signals = [
        "manifold", "ribbon", "dimensionality", "participation ratio",
        "eigenvalue", "pca", "principal component", "1d", "one-dimensional",
        "low-dimensional", "hyper-ribbon", "covariance", "error collapse",
        "causal_mechanism", "causal mechanism",
    ];
    let manifold_score: usize = manifold_signals.iter()
        .filter(|kw| text.contains(**kw))
        .count();

    // Transfer keywords
    let transfer_signals = [
        "transfer", "cross-element", "universal", "conserved",
        "cosine similarity", "pc1", "alignment", "cross element",
    ];
    let transfer_score: usize = transfer_signals.iter()
        .filter(|kw| text.contains(**kw))
        .count();

    // Fingerprint keywords
    let fingerprint_signals = [
        "fingerprint", "classifier", "discriminat", "functional form",
        "pair_style", "leave-one-out", "loo", "nearest neighbor",
        "family", "signature",
    ];
    let fingerprint_score: usize = fingerprint_signals.iter()
        .filter(|kw| text.contains(**kw))
        .count();

    // Pick the highest score, defaulting to manifold (the broadest test)
    if fingerprint_score > manifold_score && fingerprint_score > transfer_score {
        "fingerprint".to_string()
    } else if transfer_score > manifold_score && transfer_score > fingerprint_score {
        "transfer".to_string()
    } else if manifold_score > 0 {
        "manifold".to_string()
    } else {
        // Default: manifold is the broadest test (covers general error structure)
        eprintln!(
            "  [classify] no keyword match for class='{}', defaulting to manifold",
            hyp.class,
        );
        "manifold".to_string()
    }
}

/// Persist a null-model result to the database.
fn persist_null_result(conn: &Connection, r: &null_model::NullModelResult) -> Result<()> {
    db::query::upsert_null_model(
        conn, &r.test_name, &r.grouping_key, &r.method,
        r.observed, r.null_mean, r.null_std,
        r.null_ci_low, r.null_ci_high,
        r.p_value, r.n_iterations,
        &r.null_distribution,
    )?;
    Ok(())
}
