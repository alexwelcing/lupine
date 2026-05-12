mod commands;
mod discovery;
mod fitting;
mod ingest;
mod literature;
mod observables;
mod report;

use anyhow::Result;
use clap::{Parser, Subcommand};
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "atlas-distill")]
#[command(about = "Mathematical discovery engine for MD simulation data")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Analyze a LAMMPS thermo log for mathematical relationships
    Thermo {
        /// Path to the LAMMPS log file
        path: PathBuf,
        /// Specific x-column (default: Step)
        #[arg(long, default_value = "Step")]
        x: String,
        /// Specific y-column (if omitted, scans all pairs)
        #[arg(long)]
        y: Option<String>,
    },
    /// Analyze trajectory data for MSD, RDF, VACF
    Trajectory {
        /// Path to the LAMMPS dump file
        path: PathBuf,
        /// Compute MSD
        #[arg(long)]
        msd: bool,
        /// Compute RDF
        #[arg(long)]
        rdf: bool,
        /// Compute VACF
        #[arg(long)]
        vacf: bool,
        /// Compute all observables
        #[arg(long)]
        all: bool,
    },
    /// Scan multiple logs to discover cross-run relationships
    Scan {
        /// Column to use as x-axis across runs
        #[arg(long)]
        x: String,
        /// Column to use as y-axis across runs
        #[arg(long)]
        y: String,
        /// Log files to compare
        #[arg(required = true)]
        files: Vec<PathBuf>,
    },
    /// Fit a mathematical model to CSV data
    Fit {
        /// Path to CSV data (two columns: x, y)
        data: PathBuf,
        /// Model type: linear, power, arrhenius, polynomial, symbolic
        #[arg(long, default_value = "symbolic")]
        model: String,
        /// Polynomial degree (only for polynomial model)
        #[arg(long, default_value_t = 3)]
        degree: usize,
    },
    /// Literature-based mathematical discovery
    Literature {
        #[command(subcommand)]
        action: LitAction,
    },
    /// Emit a single beat to the glim-think CF Worker (POST /feed/beats).
    /// Mints a GCP OIDC token via gcp_auth (audience = worker URL) and posts
    /// the beat JSON body. Use --dev-mode-bypass for local smoke tests against
    /// `wrangler dev` with DEV_MODE=true set.
    EmitBeat {
        /// CF Worker base URL (e.g. https://glim-think-v1.aw-ab5.workers.dev
        /// or http://localhost:8787 for local dev).
        #[arg(long)]
        worker_url: String,
        /// Producer agent name (e.g. "atlas-distill", "manifold-sweeper").
        #[arg(long)]
        agent: String,
        /// One-line summary of what just happened.
        #[arg(long)]
        summary: String,
        /// Optional JSON object of metrics (passed through to D1 as TEXT).
        #[arg(long)]
        metrics: Option<String>,
        /// Optional beat_id. Defaults to a fresh UUIDv4.
        #[arg(long)]
        beat_id: Option<String>,
        /// Skip OIDC token mint and send no Authorization header. Use only
        /// against a Worker with DEV_MODE=true. Never use against production.
        #[arg(long)]
        dev_mode_bypass: bool,
    },
}

#[derive(Subcommand)]
enum LitAction {
    /// Parse the research corpus markdown
    Parse {
        /// Path to the markdown file with the publications table
        path: PathBuf,
    },
    /// Show canonical seed relationships
    Seeds,
    /// Verify seeds against fitting engine
    Verify,
    /// Fetch paper abstracts from CrossRef/arXiv
    Fetch {
        /// Path to the corpus markdown
        corpus: PathBuf,
        /// Output JSON file for fetched content
        #[arg(long, default_value = "papers.json")]
        output: PathBuf,
        /// Maximum papers to fetch (0 = all)
        #[arg(long, default_value_t = 10)]
        limit: usize,
        /// Directory for caching fetched papers
        #[arg(long, default_value = ".atlas-cache")]
        cache_dir: PathBuf,
    },
    /// Extract numeric values from fetched paper content
    Extract {
        /// Path to papers.json (from fetch)
        papers: PathBuf,
    },
    /// Run full discovery pipeline on seeds and extracted data
    Discover {
        /// Optional papers.json with extracted content
        #[arg(long)]
        papers: Option<PathBuf>,
    },
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Thermo { path, x, y } => cmd_thermo(&path, &x, y.as_deref()),
        Commands::Trajectory {
            path,
            msd,
            rdf,
            vacf,
            all,
        } => cmd_trajectory(&path, msd || all, rdf || all, vacf || all),
        Commands::Scan { x, y, files } => cmd_scan(&x, &y, &files),
        Commands::Fit {
            data,
            model,
            degree,
        } => cmd_fit(&data, &model, degree),
        Commands::Literature { action } => cmd_literature(action),
        Commands::EmitBeat {
            worker_url,
            agent,
            summary,
            metrics,
            beat_id,
            dev_mode_bypass,
        } => commands::emit_beat::run(
            &worker_url,
            &agent,
            &summary,
            metrics.as_deref(),
            beat_id.as_deref(),
            dev_mode_bypass,
        ),
    }
}

fn cmd_thermo(path: &PathBuf, x_col: &str, y_col: Option<&str>) -> Result<()> {
    eprintln!("  ✦ Parsing thermo log: {}", path.display());
    let runs = ingest::thermo::parse_log(path)?;
    eprintln!("  ✦ Found {} run(s)", runs.len());

    for (i, run) in runs.iter().enumerate() {
        eprintln!(
            "  ✦ Run {}: {} rows × {} columns",
            i,
            run.nrows,
            run.columns.len()
        );

        if let Some(y_name) = y_col {
            // Fit specific pair
            let result = discovery::scan::scan_pair(run, x_col, y_name)?;
            report::print_discovery(&result);
        } else {
            // Scan all column pairs against x
            let results = discovery::scan::scan_thermo_run(run, x_col)?;
            for result in &results {
                report::print_discovery(result);
            }
        }
    }

    Ok(())
}

fn cmd_trajectory(path: &PathBuf, do_msd: bool, do_rdf: bool, do_vacf: bool) -> Result<()> {
    eprintln!("  ✦ Parsing trajectory: {}", path.display());
    let frames = ingest::trajectory::parse_dump(path)?;
    eprintln!("  ✦ Found {} frame(s)", frames.len());

    if frames.is_empty() {
        anyhow::bail!("No frames found in dump file");
    }

    if do_msd {
        eprintln!("  ✦ Computing MSD...");
        let msd_data = observables::msd::compute_msd(&frames, None);
        let result = discovery::scan::fit_observable("time", "MSD", &msd_data);
        report::print_discovery(&result);
    }

    if do_rdf {
        eprintln!("  ✦ Computing RDF...");
        let rdf_data = observables::rdf::compute_rdf(&frames[frames.len() / 2..], 200, None);
        report::print_rdf(&rdf_data);
    }

    if do_vacf && frames.len() >= 2 {
        eprintln!("  ✦ Computing VACF...");
        if let Some(vacf_data) = observables::vacf::compute_vacf(&frames) {
            let result = discovery::scan::fit_observable("time", "VACF", &vacf_data);
            report::print_discovery(&result);
        } else {
            eprintln!("  ⚠ No velocity data in trajectory");
        }
    }

    Ok(())
}

fn cmd_scan(x_col: &str, y_col: &str, files: &[PathBuf]) -> Result<()> {
    eprintln!("  ✦ Scanning {} files for {} vs {}", files.len(), x_col, y_col);

    let mut points: Vec<(f64, f64)> = Vec::new();

    for file in files {
        let runs = ingest::thermo::parse_log(file)?;
        for run in &runs {
            // Extract the mean of the y-column and the mean of x-column
            if let (Some(xs), Some(ys)) = (run.get_column(x_col), run.get_column(y_col)) {
                let x_mean = xs.iter().sum::<f64>() / xs.len() as f64;
                let y_mean = ys.iter().sum::<f64>() / ys.len() as f64;
                points.push((x_mean, y_mean));
            }
        }
    }

    if points.is_empty() {
        anyhow::bail!("No data points extracted from files");
    }

    eprintln!("  ✦ Collected {} data points", points.len());
    let result = discovery::scan::fit_observable(x_col, y_col, &points);
    report::print_discovery(&result);

    Ok(())
}

fn cmd_fit(data_path: &PathBuf, model: &str, degree: usize) -> Result<()> {
    eprintln!("  ✦ Loading data from: {}", data_path.display());

    let content = std::fs::read_to_string(data_path)?;
    let mut points: Vec<(f64, f64)> = Vec::new();

    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let parts: Vec<&str> = line
            .split([',', '\t', ' '])
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .collect();
        if parts.len() >= 2 {
            if let (Ok(x), Ok(y)) = (parts[0].parse::<f64>(), parts[1].parse::<f64>())
            {
                points.push((x, y));
            }
        }
    }

    eprintln!("  ✦ Loaded {} data points", points.len());

    let result = match model {
        "linear" => {
            let fit = fitting::linear::linear_fit(&points);
            discovery::scan::Discovery::from_fit("x", "y", "linear", &fit)
        }
        "power" => {
            let fit = fitting::power_law::power_law_fit(&points);
            discovery::scan::Discovery::from_fit("x", "y", "power_law", &fit)
        }
        "arrhenius" => {
            let fit = fitting::arrhenius::arrhenius_fit(&points);
            discovery::scan::Discovery::from_fit("x", "y", "arrhenius", &fit)
        }
        "polynomial" => {
            let fit = fitting::polynomial::polynomial_fit(&points, degree);
            discovery::scan::Discovery::from_fit("x", "y", "polynomial", &fit)
        }
        "symbolic" => {
            let fit = fitting::symbolic::symbolic_fit(&points, 500, 50);
            discovery::scan::Discovery::from_fit("x", "y", "symbolic", &fit)
        }
        _ => anyhow::bail!("Unknown model: {}. Use: linear, power, arrhenius, polynomial, symbolic", model),
    };

    report::print_discovery(&result);
    Ok(())
}

fn cmd_literature(action: LitAction) -> Result<()> {
    match action {
        LitAction::Parse { path } => {
            eprintln!("  ✦ Parsing corpus: {}", path.display());
            let papers = literature::corpus::parse_corpus_file(&path)?;
            eprintln!("  ✦ Found {} papers\n", papers.len());

            // Print summary
            let freq = literature::corpus::tag_frequency(&papers);
            eprintln!("  ╔════════════════════════════════════════════════════════════╗");
            eprintln!("  ║  Research Corpus: {} papers                        ", papers.len());
            eprintln!("  ╠════════════════════════════════════════════════════════════╣");
            eprintln!("  ║  Year distribution:");
            let y2025 = papers.iter().filter(|p| p.year == 2025).count();
            let y2026 = papers.iter().filter(|p| p.year == 2026).count();
            eprintln!("  ║    2025: {}  |  2026: {}", y2025, y2026);
            eprintln!("  ║");
            eprintln!("  ║  Top method tags:");
            for (tag, count) in freq.iter().take(15) {
                let bar = "█".repeat(*count);
                eprintln!("  ║    {:20} {:3} {}", tag, count, bar);
            }
            eprintln!("  ║");
            eprintln!("  ║  Papers with DOI: {}", papers.iter().filter(|p| p.doi.is_some()).count());
            eprintln!("  ║  Papers with arXiv: {}", papers.iter().filter(|p| p.arxiv.is_some()).count());
            eprintln!("  ╚════════════════════════════════════════════════════════════╝");

            // Dump as JSON
            let json = serde_json::to_string_pretty(&papers)?;
            let out_path = path.with_extension("json");
            std::fs::write(&out_path, &json)?;
            eprintln!("\n  ✦ Corpus saved to {}", out_path.display());

            Ok(())
        }

        LitAction::Seeds => {
            literature::seeds::print_seeds_summary();
            Ok(())
        }

        LitAction::Verify => {
            eprintln!("  ✦ Verifying seed relationships against fitting engine...\n");
            let seeds = literature::seeds::all_seeds();
            let datasets = literature::dataset::datasets_from_seeds(&seeds);

            for (seed, ds) in seeds.iter().zip(datasets.iter()) {
                if ds.points.len() < 3 {
                    continue;
                }
                let result = discovery::scan::fit_observable(
                    &ds.x_label,
                    &ds.y_label,
                    &ds.points,
                );

                // Check if the discovered model matches the expected model
                let expected = &seed.testable_as;
                let matched = result.best_model.contains(expected) || result.r_squared > 0.99;
                let status = if matched { "✅" } else { "⚠️" };

                eprintln!("  {} {} ", status, seed.name);
                eprintln!("      Expected: {} | Found: {} | R² = {:.6}",
                    expected, result.best_model, result.r_squared
                );

                if !seed.parameters.is_empty() {
                    for param in &seed.parameters {
                        eprintln!("      {} = {:.4} {} (typical: {:.4})",
                            param.name, param.typical_value, param.unit, param.typical_value
                        );
                    }
                }
                eprintln!();
            }

            Ok(())
        }

        LitAction::Fetch { corpus, output, limit, cache_dir } => {
            eprintln!("  ✦ Parsing corpus: {}", corpus.display());
            let papers = literature::corpus::parse_corpus_file(&corpus)?;
            eprintln!("  ✦ Found {} papers", papers.len());

            let fetch_count = if limit == 0 { papers.len() } else { limit.min(papers.len()) };
            eprintln!("  ✦ Will fetch up to {} paper abstracts", fetch_count);
            eprintln!("  ✦ Cache: {}", cache_dir.display());

            let config = literature::fetch::FetchConfig {
                cache_dir,
                ..Default::default()
            };

            // Build batch input
            let batch: Vec<(String, Option<String>, Option<String>)> = papers
                .iter()
                .take(fetch_count)
                .map(|p| (p.id.clone(), p.doi.clone(), p.arxiv.clone()))
                .collect();

            let result = literature::fetch::fetch_batch(&config, &batch);
            literature::fetch::save_results(&result, &output)?;

            Ok(())
        }

        LitAction::Extract { papers } => {
            eprintln!("  ✦ Loading papers: {}", papers.display());
            let content: Vec<literature::fetch::PaperContent> =
                serde_json::from_str(&std::fs::read_to_string(&papers)?)?;

            eprintln!("  ✦ Extracting values from {} papers...\n", content.len());

            let mut all_values = Vec::new();
            for paper in &content {
                let text = format!("{} {}", paper.title, paper.abstract_text);
                let values = literature::extract::extract_all(&paper.paper_id, &text);
                if !values.is_empty() {
                    eprintln!("  ✦ {} — {} values extracted", paper.paper_id, values.len());
                    for v in &values {
                        eprintln!("      {} = {} {}", v.quantity, v.value, v.unit);
                    }
                }
                all_values.extend(values);
            }

            eprintln!("\n  ✦ Total: {} values from {} papers", all_values.len(), content.len());

            // Build datasets
            let datasets = literature::dataset::build_datasets(&all_values);
            literature::dataset::print_datasets(&datasets);

            // Save extracted values
            let out = papers.with_extension("extracted.json");
            let json = serde_json::to_string_pretty(&all_values)?;
            std::fs::write(&out, &json)?;
            eprintln!("\n  ✦ Extracted values → {}", out.display());

            Ok(())
        }

        LitAction::Discover { papers } => {
            eprintln!("  ✦ Running discovery pipeline...\n");

            // Always run seed verification
            let seeds = literature::seeds::all_seeds();
            let seed_datasets = literature::dataset::datasets_from_seeds(&seeds);

            eprintln!("  ═══ Seed Relationship Discovery ═══\n");
            for ds in &seed_datasets {
                if ds.points.len() < 3 {
                    continue;
                }
                let result = discovery::scan::fit_observable(&ds.x_label, &ds.y_label, &ds.points);
                report::print_discovery(&result);
            }

            // If papers.json provided, also run on extracted data
            if let Some(papers_path) = papers {
                let content: Vec<literature::fetch::PaperContent> =
                    serde_json::from_str(&std::fs::read_to_string(&papers_path)?)?;

                let mut all_values = Vec::new();
                for paper in &content {
                    let text = format!("{} {}", paper.title, paper.abstract_text);
                    all_values.extend(literature::extract::extract_all(&paper.paper_id, &text));
                }

                let datasets = literature::dataset::build_datasets(&all_values);
                if !datasets.is_empty() {
                    eprintln!("\n  ═══ Literature Data Discovery ═══\n");
                    for ds in &datasets {
                        if ds.points.len() >= 3 {
                            let result = discovery::scan::fit_observable(
                                &ds.x_label,
                                &ds.y_label,
                                &ds.points,
                            );
                            report::print_discovery(&result);
                        }
                    }
                }
            }

            Ok(())
        }
    }
}
