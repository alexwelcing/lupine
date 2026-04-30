//! Lupine Distill — ground-truth research engine for interatomic potential discovery.
//!
//! See `docs` in the dissertation for the architectural intent. The CLI here is
//! deliberately thin: each subcommand maps to one of the hypothesis modules or
//! the DSPy bridge. Rust owns the data and the math; Python owns the reasoning.

mod bridge;
mod db;
mod hypothesis;
mod null_model;
mod orthogonalize;

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
    }

    Ok(())
}

/// Open the SQLite database (creates + migrates if missing).
fn open_db(path: &str) -> Result<Connection> {
    db::schema::open(path).with_context(|| format!("opening database at {}", path))
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

    let element_ctx = element.unwrap_or("all").to_string();
    let request = bridge::BridgeRequest::Theorize {
        element: element_ctx.clone(),
        data_summary: json!({
            "manifolds": manifolds_json,
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
