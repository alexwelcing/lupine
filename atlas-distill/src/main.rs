#![allow(dead_code)]

mod agents;
mod autoresearch;
mod benchmark;
mod causal;
mod discovery;
pub mod domain;
mod fitting;
mod formalize;
mod ingest;
mod literature;
mod manifold;
mod meta_analysis;
mod nist;
mod observables;
mod pipeline;
mod report;
mod runner;
mod stats;
mod surrogate;
mod validation;

use anyhow::Result;
use clap::{Parser, Subcommand};
use std::path::{Path, PathBuf};

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
    /// Compute FCC elastic properties from C11, C12, C44
    Elastic {
        /// Elastic constant C11 (GPa)
        #[arg(long)]
        c11: f64,
        /// Elastic constant C12 (GPa)
        #[arg(long)]
        c12: f64,
        /// Elastic constant C44 (GPa)
        #[arg(long)]
        c44: f64,
        /// Optional: compare against reference C11
        #[arg(long)]
        ref_c11: Option<f64>,
        /// Optional: compare against reference C12
        #[arg(long)]
        ref_c12: Option<f64>,
        /// Optional: compare against reference C44
        #[arg(long)]
        ref_c44: Option<f64>,
        /// Optional: material name for provenance tagging
        #[arg(long, default_value = "unknown")]
        material: String,
    },
    /// Run EAM ensemble operator validation harness
    Validate {
        /// Run full multi-potential benchmark report
        #[arg(long)]
        full: bool,
        /// Use BCC metals instead of FCC
        #[arg(long)]
        bcc: bool,
        /// Validate statics (a0, Ecoh) instead of elastic constants
        #[arg(long)]
        statics: bool,
    },
    /// Analyze error manifold structure of benchmark data
    Manifold {
        /// Analyze BCC metals instead of FCC
        #[arg(long)]
        bcc: bool,
    },
    /// Run meta-analysis on grouped correlations
    MetaAnalyze {
        /// Group data as JSON array of {group, n, r}
        #[arg(long)]
        groups: Option<PathBuf>,
    },
    /// Detect Simpson's paradox in grouped data
    DetectParadox {
        /// Data file: CSV with columns group,x,y
        #[arg(long)]
        data: Option<PathBuf>,
        /// Use built-in reversal example
        #[arg(long)]
        example: bool,
        /// Use real BCC elastic constant data (EAM predictions vs reference)
        #[arg(long)]
        bcc: bool,
    },
    /// Load and analyze an external benchmark database (CSV or JSON)
    Benchmark {
        /// Path to benchmark file (.csv or .json)
        path: PathBuf,
        /// Run manifold analysis
        #[arg(long)]
        manifold: bool,
        /// Run meta-analysis on per-material error correlations
        #[arg(long)]
        meta: bool,
        /// Run full validation report
        #[arg(long)]
        full: bool,
    },
    /// Run Hermes pipeline orchestrator
    Pipeline {
        /// Hermes provider
        #[arg(long, default_value = "minimax")]
        provider: String,
        /// Dry run mode
        #[arg(long)]
        dry_run: bool,
    },
    /// Export computationally validated relationships into Lean 4 specification
    Formalize {
        /// Optional path to empirical benchmark data (e.g. nist_benchmark.csv)
        #[arg(long)]
        empirical: Option<PathBuf>,
    },
    /// Query the NIST Interatomic Potentials Repository catalog
    Nist {
        /// Path to master_index.json
        #[arg(long, default_value = "atlas/nist_ipr/index/master_index.json")]
        index: PathBuf,
        /// Filter by element (e.g. Al, Cu, Fe)
        #[arg(long)]
        element: Option<String>,
        /// Filter by pair_style (e.g. eam/alloy, meam, tersoff)
        #[arg(long)]
        pair_style: Option<String>,
        /// Show only single-element potentials
        #[arg(long)]
        single: bool,
        /// Generate benchmark scaffold CSV (pipe to file)
        #[arg(long)]
        scaffold: bool,
    },
    /// Run LAMMPS computations for NIST potentials and produce benchmark CSV
    RunNist {
        /// Path to master_index.json
        #[arg(long, default_value = "atlas/nist_ipr/index/master_index.json")]
        index: PathBuf,
        /// Target element (e.g. Al, Fe)
        #[arg(long)]
        element: String,
        /// Crystal structure: fcc or bcc
        #[arg(long, default_value = "fcc")]
        structure: String,
        /// LAMMPS executable path
        #[arg(long, default_value = "lmp")]
        lammps_exe: String,
        /// Working directory for LAMMPS runs
        #[arg(long, default_value = "atlas-distill/lammps_runs")]
        work_dir: PathBuf,
        /// Output CSV path
        #[arg(long, default_value = "nist_benchmark.csv")]
        output: PathBuf,
        /// Supercell size (NxNxN)
        #[arg(long, default_value_t = 3)]
        supercell: usize,
        /// Number of MPI ranks
        #[arg(long, default_value_t = 1)]
        mpi: usize,
    },
    /// Run automated research campaign: NIST → CrossRef → Extract → Benchmark → Analyze
    AutoResearch {
        /// Path to master_index.json
        #[arg(long, default_value = "atlas/nist_ipr/index/master_index.json")]
        index: PathBuf,
        /// Target elements (comma-separated, e.g. Al,Cu,Fe). Default: all benchmark metals
        #[arg(long)]
        elements: Option<String>,
        /// Only process EAM-family potentials
        #[arg(long)]
        eam_only: bool,
        /// Maximum papers to fetch per run
        #[arg(long, default_value = "50")]
        max_fetches: usize,
        /// Skip analysis after extraction
        #[arg(long)]
        no_analyze: bool,
        /// Output directory for results
        #[arg(long, default_value = "atlas-distill/benchmarks")]
        output_dir: PathBuf,
    },
    /// Run multi-agent discovery campaign on interatomic potentials
    DiscoverAgents {
        /// Maximum discovery iterations
        #[arg(long, default_value_t = 3)]
        iterations: usize,
        /// Target elements (comma-separated). Default: Al,Cu,Ni,Fe
        #[arg(long)]
        elements: Option<String>,
        /// Ledger output directory
        #[arg(long, default_value = "atlas-distill/discovery_ledger")]
        ledger_dir: PathBuf,
    },
    /// Run active-learning-driven experiment selection on unvalidated claims
    ActiveLearn {
        /// Acquisition strategy: max-entropy, expected-improvement, alignment-stress
        #[arg(long, default_value = "alignment-stress")]
        strategy: String,
        /// Maximum experiments to propose
        #[arg(long, default_value_t = 5)]
        n: usize,
        /// Target element
        #[arg(long, default_value = "Al")]
        element: String,
        /// Ledger directory to read claims from
        #[arg(long, default_value = "atlas-distill/discovery_ledger")]
        ledger_dir: PathBuf,
        /// LAMMPS executable
        #[arg(long, default_value = "lmp")]
        lammps_exe: String,
    },
    /// Run reactive autoresearch: close the loop between claims and experiments
    React {
        /// Maximum reactive iterations
        #[arg(long, default_value_t = 3)]
        iterations: usize,
        /// Target elements (comma-separated)
        #[arg(long)]
        elements: Option<String>,
        /// Ledger directory
        #[arg(long, default_value = "atlas-distill/discovery_ledger")]
        ledger_dir: PathBuf,
        /// LAMMPS executable
        #[arg(long, default_value = "lmp")]
        lammps_exe: String,
        /// Fast mode: skip null-model validation (much faster for direction-finding)
        #[arg(long)]
        fast: bool,
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
        Commands::Elastic {
            c11,
            c12,
            c44,
            ref_c11,
            ref_c12,
            ref_c44,
            material,
        } => cmd_elastic(c11, c12, c44, ref_c11, ref_c12, ref_c44, &material),
        Commands::Validate { full, bcc, statics } => cmd_validate(full, bcc, statics),
        Commands::Manifold { bcc } => cmd_manifold(bcc),
        Commands::MetaAnalyze { groups } => cmd_meta_analyze(groups.as_ref()),
        Commands::DetectParadox { data, example, bcc } => {
            cmd_detect_paradox(data.as_ref(), example, bcc)
        }
        Commands::Benchmark {
            path,
            manifold,
            meta,
            full,
        } => cmd_benchmark(&path, manifold, meta, full),
        Commands::Pipeline { provider, dry_run } => cmd_pipeline(&provider, dry_run),
        Commands::Formalize { empirical } => {
            formalize::write_lean_spec(empirical.as_ref())?;
            Ok(())
        }
        Commands::Nist {
            index,
            element,
            pair_style,
            single,
            scaffold,
        } => cmd_nist(
            &index,
            element.as_deref(),
            pair_style.as_deref(),
            single,
            scaffold,
        ),
        Commands::RunNist {
            index,
            element,
            structure,
            lammps_exe,
            work_dir,
            output,
            supercell,
            mpi,
        } => {
            let config = runner::RunnerConfig {
                nist_index: index,
                element,
                structure,
                lammps_executable: lammps_exe,
                work_dir,
                supercell,
                mpi_ranks: mpi,
                ..Default::default()
            };
            let results = runner::run_campaign(&config)?;
            runner::export_benchmark_csv(&results, &config.element, &output)?;
            Ok(())
        }
        Commands::AutoResearch {
            index,
            elements,
            eam_only,
            max_fetches,
            no_analyze,
            output_dir,
        } => {
            let config = autoresearch::CampaignConfig {
                nist_index: index,
                elements: elements
                    .map(|e| e.split(',').map(|s| s.trim().to_string()).collect())
                    .unwrap_or_default(),
                eam_only,
                max_fetches,
                analyze: !no_analyze,
                output_dir,
                ..Default::default()
            };
            autoresearch::run_campaign(&config)?;
            Ok(())
        }
        Commands::DiscoverAgents {
            iterations,
            elements,
            ledger_dir,
        } => cmd_discover_agents(iterations, elements.as_deref(), &ledger_dir),
        Commands::ActiveLearn {
            strategy,
            n,
            element,
            ledger_dir,
            lammps_exe,
        } => cmd_active_learn(&strategy, n, &element, &ledger_dir, &lammps_exe),
        Commands::React {
            iterations,
            elements,
            ledger_dir,
            lammps_exe,
            fast,
        } => cmd_react(
            iterations,
            elements.as_deref(),
            &ledger_dir,
            &lammps_exe,
            fast,
        ),
    }
}

fn cmd_thermo(path: &Path, x_col: &str, y_col: Option<&str>) -> Result<()> {
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

fn cmd_active_learn(
    strategy: &str,
    n: usize,
    _element: &str,
    ledger_dir: &Path,
    lammps_exe: &str,
) -> Result<()> {
    use agents::experiment_agent::{ExperimentAgent, ExperimentAgentConfig};
    use agents::{Action, DiscoveryAgent};
    use lupine_ops::ledger::DiscoveryLedger;

    eprintln!("  ╔════════════════════════════════════════════════════════════╗");
    eprintln!("  ║  Active Learning Experiment Selector                       ║");
    eprintln!("  ╚════════════════════════════════════════════════════════════╝");

    let ledger = if ledger_dir.exists() {
        DiscoveryLedger::load(ledger_dir).unwrap_or_default()
    } else {
        DiscoveryLedger::new()
    };

    let mut agent = ExperimentAgent::new(ExperimentAgentConfig {
        lammps_exe: lammps_exe.into(),
        work_dir: PathBuf::from("atlas-distill/lammps_runs/auto"),
        min_score: 0.0,
        max_per_iteration: n,
        supercell: 3,
    });

    let action = Action::DesignExperiments {
        strategy: strategy.into(),
        max_experiments: n,
    };

    let result = agent.execute(&action, &ledger)?;
    eprintln!("\n  ℹ {}", result.action_description);
    for note in &result.notes {
        eprintln!("    {}", note);
    }
    eprintln!("  📋 {} claims produced", result.claims_produced.len());
    eprintln!("  📊 {} records produced", result.records_produced.len());

    Ok(())
}

/// Seed the discovery ledger from existing benchmark CSVs.
fn seed_ledger(ledger_dir: &Path) -> Result<usize> {
    use lupine_ops::ledger::{
        generate_record_id, now_iso8601, BenchmarkRecord, DiscoveryLedger, Provenance,
    };

    let mut ledger = if ledger_dir.exists() {
        DiscoveryLedger::load(ledger_dir).unwrap_or_default()
    } else {
        DiscoveryLedger::new()
    };

    let mut count = 0;
    let ts = now_iso8601();
    let provenance = Provenance::AgentInference {
        method: "ledger_seed_from_csv".into(),
        confidence: 0.95,
        basis: vec![
            "fcc_elastic_constants.csv".into(),
            "bcc_elastic_constants.csv".into(),
            "nist_populated.csv".into(),
        ],
    };

    let files = vec![
        ("benchmarks/fcc_elastic_constants.csv", 6),
        ("benchmarks/bcc_elastic_constants.csv", 6),
        ("benchmarks/nist_populated.csv", 10),
    ];

    for (path, n_cols) in files {
        if !std::path::Path::new(path).exists() {
            continue;
        }
        let content = std::fs::read_to_string(path)?;
        let mut lines = content.lines();
        let header = lines.next().unwrap_or("");
        let _headers: Vec<&str> = header.split(',').collect();

        for line in lines {
            let cols: Vec<&str> = line.split(',').collect();
            if cols.len() < n_cols {
                continue;
            }

            let material = cols[0].trim().to_string();
            let potential = cols[1].trim().to_string();
            let property = cols[2].trim().to_string();
            let reference: f64 = cols[3].trim().parse().unwrap_or(0.0);
            let predicted: f64 = cols[4].trim().parse().unwrap_or(0.0);
            let unit = cols[5].trim().to_string();

            let nist_id = if cols.len() > 6 {
                cols[6].trim().to_string()
            } else {
                potential.clone()
            };
            let pair_style = if cols.len() > 7 {
                cols[7].trim().to_string()
            } else {
                "unknown".into()
            };

            let record = BenchmarkRecord {
                record_id: generate_record_id("seed"),
                potential_id: nist_id,
                potential_label: potential,
                pair_style,
                element: material.clone(),
                property,
                reference,
                predicted,
                unit,
                provenance: provenance.clone(),
                agent_id: "seed".into(),
                timestamp: ts.clone(),
            };

            ledger.append_record(record, ledger_dir)?;
            count += 1;
        }
    }

    eprintln!(
        "  ✦ Seeded ledger with {} records from existing benchmarks",
        count
    );
    Ok(count)
}

fn cmd_react(
    iterations: usize,
    elements: Option<&str>,
    ledger_dir: &PathBuf,
    lammps_exe: &str,
    fast: bool,
) -> Result<()> {
    use agents::{
        causal_agent::CausalAgent,
        experiment_agent::{ExperimentAgent, ExperimentAgentConfig},
        manifold_agent::ManifoldAgent,
        null_model_agent::NullModelAgent,
        orchestrator::{CampaignConfig, Orchestrator},
        theorist_agent::TheoristAgent,
    };

    let target_elements: Vec<String> = elements
        .map(|e| e.split(',').map(|s| s.trim().to_string()).collect())
        .unwrap_or_default();

    eprintln!("\n  ╔════════════════════════════════════════════════════════════╗");
    eprintln!("  ║  Reactive Autoresearch Loop (Karpathy-style)              ║");
    eprintln!("  ║  Claims → Experiments → Records → New Claims              ║");
    eprintln!("  ╚════════════════════════════════════════════════════════════╝\n");

    // Auto-seed if ledger is empty
    let ledger = if ledger_dir.exists() {
        lupine_ops::ledger::DiscoveryLedger::load(ledger_dir).unwrap_or_default()
    } else {
        lupine_ops::ledger::DiscoveryLedger::new()
    };
    if ledger.records.is_empty() {
        eprintln!("  ℹ Ledger empty — seeding from existing benchmark CSVs...");
        seed_ledger(ledger_dir)?;
    }

    let config = CampaignConfig {
        ledger_dir: ledger_dir.clone(),
        max_iterations: iterations,
        elements: target_elements.clone(),
        nist_index: PathBuf::from("atlas/nist_ipr/index/master_index.json"),
    };

    let mut orchestrator = Orchestrator::new(&config)?;

    // Reactive agents: Manifold detects → Causal screens → Theorist explains → Experiment validates
    orchestrator.add_agent(Box::new(ManifoldAgent::new()));
    orchestrator.add_agent(Box::new(CausalAgent::new()));
    if !fast {
        orchestrator.add_agent(Box::new(NullModelAgent::new()));
    }
    orchestrator.add_agent(Box::new(TheoristAgent::new()));
    orchestrator.add_agent(Box::new(ExperimentAgent::new(ExperimentAgentConfig {
        lammps_exe: lammps_exe.into(),
        work_dir: PathBuf::from("atlas-distill/lammps_runs/auto"),
        min_score: 0.3,
        max_per_iteration: 3,
        supercell: 3,
    })));

    let summary = orchestrator.run()?;

    eprintln!("\n  ════════════════════════════════════════════════════════════");
    eprintln!("  Reactive loop complete.");
    eprintln!(
        "  {} records, {} claims, {} unique potentials across {} elements",
        summary.total_records,
        summary.total_claims,
        summary.unique_potentials,
        summary.unique_elements
    );
    eprintln!(
        "  Confirmed: {} | Refuted: {}",
        summary.confirmed_claims, summary.refuted_claims
    );
    eprintln!("  Ledger saved to: {}\n", ledger_dir.display());

    Ok(())
}

fn cmd_trajectory(path: &Path, do_msd: bool, do_rdf: bool, do_vacf: bool) -> Result<()> {
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
    eprintln!(
        "  ✦ Scanning {} files for {} vs {}",
        files.len(),
        x_col,
        y_col
    );

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
            if let (Ok(x), Ok(y)) = (parts[0].parse::<f64>(), parts[1].parse::<f64>()) {
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
        _ => anyhow::bail!(
            "Unknown model: {}. Use: linear, power, arrhenius, polynomial, symbolic",
            model
        ),
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
            eprintln!(
                "  ║  Research Corpus: {} papers                        ",
                papers.len()
            );
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
            eprintln!(
                "  ║  Papers with DOI: {}",
                papers.iter().filter(|p| p.doi.is_some()).count()
            );
            eprintln!(
                "  ║  Papers with arXiv: {}",
                papers.iter().filter(|p| p.arxiv.is_some()).count()
            );
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
                let result = discovery::scan::fit_observable(&ds.x_label, &ds.y_label, &ds.points);

                // Check if the discovered model matches the expected model
                let expected = &seed.testable_as;
                let matched = result.best_model.contains(expected) || result.r_squared > 0.99;
                let status = if matched { "✅" } else { "⚠️" };

                eprintln!("  {} {} ", status, seed.name);
                eprintln!(
                    "      Expected: {} | Found: {} | R² = {:.6}",
                    expected, result.best_model, result.r_squared
                );

                if !seed.parameters.is_empty() {
                    for param in &seed.parameters {
                        eprintln!(
                            "      {} = {:.4} {} (typical: {:.4})",
                            param.name, param.typical_value, param.unit, param.typical_value
                        );
                    }
                }
                eprintln!();
            }

            Ok(())
        }

        LitAction::Fetch {
            corpus,
            output,
            limit,
            cache_dir,
        } => {
            eprintln!("  ✦ Parsing corpus: {}", corpus.display());
            let papers = literature::corpus::parse_corpus_file(&corpus)?;
            eprintln!("  ✦ Found {} papers", papers.len());

            let fetch_count = if limit == 0 {
                papers.len()
            } else {
                limit.min(papers.len())
            };
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

            eprintln!(
                "\n  ✦ Total: {} values from {} papers",
                all_values.len(),
                content.len()
            );

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

fn cmd_elastic(
    c11: f64,
    c12: f64,
    c44: f64,
    ref_c11: Option<f64>,
    ref_c12: Option<f64>,
    ref_c44: Option<f64>,
    material: &str,
) -> Result<()> {
    use domain::provenance::fnv1a64_hex;
    use observables::elasticity::{anisotropy_a, bulk_modulus_k, relative_error, shear_modulus_g};

    let k = bulk_modulus_k(c11, c12);
    let g = shear_modulus_g(c11, c12, c44);
    let a = anisotropy_a(c11, c12, c44);

    // Provenance digest of inputs
    let input_str = format!("{material}:C11={c11},C12={c12},C44={c44}");
    let digest = fnv1a64_hex(input_str.as_bytes());

    eprintln!("  ╔══════════════════════════════════════════════════════════╗");
    eprintln!("  ║  FCC Elastic Properties: {:30} ║", material);
    eprintln!("  ╠══════════════════════════════════════════════════════════╣");
    eprintln!("  ║  Input:");
    eprintln!("  ║    C11 = {c11:8.2} GPa");
    eprintln!("  ║    C12 = {c12:8.2} GPa");
    eprintln!("  ║    C44 = {c44:8.2} GPa");
    eprintln!("  ║");
    eprintln!("  ║  Derived:");
    eprintln!("  ║    Bulk modulus  K = {k:8.3} GPa");
    eprintln!("  ║    Shear modulus G = {g:8.3} GPa");
    eprintln!("  ║    Anisotropy    A = {a:8.6}");
    eprintln!("  ║    K/G ratio       = {:.6}", k / g);

    // If reference values provided, compute relative errors
    if let (Some(rc11), Some(rc12), Some(rc44)) = (ref_c11, ref_c12, ref_c44) {
        let ref_k = bulk_modulus_k(rc11, rc12);
        let ref_g = shear_modulus_g(rc11, rc12, rc44);
        let ref_a = anisotropy_a(rc11, rc12, rc44);

        eprintln!("  ║");
        eprintln!("  ║  vs Reference (C11={rc11}, C12={rc12}, C44={rc44}):");
        eprintln!(
            "  ║    ΔK = {:+.3} GPa ({:+.2}%)",
            k - ref_k,
            relative_error(k, ref_k) * 100.0
        );
        eprintln!(
            "  ║    ΔG = {:+.3} GPa ({:+.2}%)",
            g - ref_g,
            relative_error(g, ref_g) * 100.0
        );
        eprintln!(
            "  ║    ΔA = {:+.6}   ({:+.2}%)",
            a - ref_a,
            relative_error(a, ref_a) * 100.0
        );
    }

    eprintln!("  ║");
    eprintln!("  ║  Provenance: {digest}");
    eprintln!("  ╚══════════════════════════════════════════════════════════╝");

    // JSON output to stdout
    let json = serde_json::json!({
        "material": material,
        "input": { "C11": c11, "C12": c12, "C44": c44 },
        "derived": {
            "bulk_modulus_K": k,
            "shear_modulus_G": g,
            "anisotropy_A": a,
            "K_over_G": k / g,
        },
        "provenance_digest": digest,
    });
    println!("{}", serde_json::to_string_pretty(&json)?);

    Ok(())
}

fn cmd_pipeline(provider: &str, dry_run: bool) -> Result<()> {
    pipeline::run_pipeline(provider, dry_run);
    Ok(())
}

fn cmd_validate(full: bool, use_bcc: bool, statics: bool) -> Result<()> {
    if statics {
        let reference = validation::fcc_statics_reference_data();
        let predictions = vec![("EAM", validation::fcc_statics_eam_data())];
        let entries = validation::build_statics_benchmark_entries(&reference, &predictions);
        let metrics = validation::compute_potential_metrics(&entries);

        let report = validation::ValidationReport {
            n_potentials: 1,
            n_materials: reference.len(),
            n_properties: 2,
            n_entries: entries.len(),
            metrics: metrics.clone(),
            error_correlations: Vec::new(),
            manifold_json: "[]".to_string(), // Manifold requires at least 3 properties usually
            ranking_by_mae: validation::rank_potentials(&metrics, "mae"),
        };

        validation::print_validation_report(&report);

        let json = serde_json::to_string_pretty(&report)?;
        std::fs::write("statics_validation_report.json", &json)?;
        eprintln!("\n  ✦ Statics validation report → statics_validation_report.json");
        return Ok(());
    }

    if full {
        if use_bcc {
            let entries = validation::build_bcc_benchmark_entries();
            let metrics = validation::compute_potential_metrics(&entries);
            let correlations = validation::error_correlations(&entries);
            let ranking = validation::rank_potentials(&metrics, "mae");

            let props = vec!["C11".to_string(), "C12".to_string(), "C44".to_string()];
            let vectors = manifold::build_error_vectors(&entries, &props);
            let manifold = manifold::analyze_manifold(&vectors);
            let manifold_json = manifold::export_json(&manifold);

            let report = validation::ValidationReport {
                n_potentials: 2,
                n_materials: 7,
                n_properties: 3,
                n_entries: entries.len(),
                metrics,
                error_correlations: correlations,
                manifold_json,
                ranking_by_mae: ranking,
            };
            validation::print_validation_report(&report);
            crate::manifold::print_summary(&manifold);

            let json = serde_json::to_string_pretty(&report)?;
            std::fs::write("bcc_validation_report.json", &json)?;
            eprintln!("\n  ✦ BCC validation report → bcc_validation_report.json");
        } else {
            let report = validation::run_full_validation();
            validation::print_validation_report(&report);

            // Also run manifold analysis output
            eprintln!();
            let manifold: Vec<crate::manifold::ManifoldAnalysis> =
                serde_json::from_str(&report.manifold_json).unwrap_or_default();
            crate::manifold::print_summary(&manifold);

            // Save report
            let json = serde_json::to_string_pretty(&report)?;
            std::fs::write("validation_report.json", &json)?;
            eprintln!("\n  ✦ Full validation report → validation_report.json");
        }
    } else {
        let res = validation::run_validation();
        eprintln!();
        eprintln!("  ╔══════════════════════════════════════════════════════════╗");
        eprintln!("  ║   EAM Ensemble Operator Validation (Rust Port)         ║");
        eprintln!("  ╚══════════════════════════════════════════════════════════╝");
        eprintln!();

        for msg in &res.gate_messages {
            let badge = if msg.contains("PASS") { "✅" } else { "❌" };
            eprintln!("  {} {}", badge, msg);
        }

        let agg = &res.ensemble_metrics;
        eprintln!("\n  Ensemble MAE:  {:.3} GPa", agg.mae);
        eprintln!("  Ensemble RMSE: {:.3} GPa", agg.rmse);
        eprintln!("  Worst-case:    {:.3} GPa", agg.max_error);

        eprintln!(
            "\n  {:>5}  {:>8}  {:>8}  {:>8}  {:>8}",
            "Metal", "MAE", "C11 Err", "C12 Err", "C44 Err"
        );
        eprintln!(
            "  {:>5}  {:>8}  {:>8}  {:>8}  {:>8}",
            "─────", "────────", "────────", "────────", "────────"
        );
        let mut metals: Vec<_> = res.per_metal.keys().collect();
        metals.sort();
        for m in metals {
            let pm = &res.per_metal[m];
            eprintln!(
                "  {:>5}  {:8.3}  {:8.3}  {:8.3}  {:8.3}",
                m, pm.mae, pm.c11, pm.c12, pm.c44
            );
        }

        eprintln!(
            "\n  {:>15}  {:>8}  {:>8}  {:>8}",
            "Operator", "MAE", "RMSE", "Max Err"
        );
        eprintln!(
            "  {:>15}  {:>8}  {:>8}  {:>8}",
            "───────────────", "────────", "────────", "────────"
        );
        let mut ops: Vec<_> = res.operator_metrics.keys().collect();
        ops.sort();
        for op in ops {
            let m = &res.operator_metrics[op];
            eprintln!(
                "  {:>15}  {:8.4}  {:8.4}  {:8.4}",
                op, m.mae, m.rmse, m.max_error
            );
        }

        let status = if res.pass_status {
            "PASS ✅"
        } else {
            "FAIL ❌"
        };
        eprintln!("\n  Overall: {}", status);
        eprintln!();
    }

    Ok(())
}

fn cmd_manifold(use_bcc: bool) -> Result<()> {
    let manifold: Vec<crate::manifold::ManifoldAnalysis>;

    if use_bcc {
        let entries = validation::build_bcc_benchmark_entries();
        let props = vec!["C11".to_string(), "C12".to_string(), "C44".to_string()];
        let vectors = manifold::build_error_vectors(&entries, &props);
        manifold = manifold::analyze_manifold(&vectors);
        eprintln!(
            "  ✦ Analyzing BCC metal error manifold ({} entries)",
            entries.len()
        );
    } else {
        let report = validation::run_full_validation();
        manifold = serde_json::from_str(&report.manifold_json).unwrap_or_default();
        eprintln!("  ✦ Analyzing FCC metal error manifold");
    }

    crate::manifold::print_summary(&manifold);

    // Save detailed JSON
    let json = serde_json::to_string_pretty(&manifold)?;
    let out_path = if use_bcc {
        "bcc_manifold_analysis.json"
    } else {
        "manifold_analysis.json"
    };
    std::fs::write(out_path, &json)?;
    eprintln!("\n  ✦ Manifold analysis → {}", out_path);

    Ok(())
}

fn cmd_meta_analyze(groups_path: Option<&PathBuf>) -> Result<()> {
    let groups: Vec<crate::meta_analysis::GroupCorrelation>;

    if let Some(path) = groups_path {
        let content = std::fs::read_to_string(path)?;
        groups = serde_json::from_str(&content)
            .map_err(|e| anyhow::anyhow!("Failed to parse group correlations: {}", e))?;
    } else {
        // Default: synthetic example showing heterogeneity
        groups = vec![
            crate::meta_analysis::GroupCorrelation {
                group_id: "Al".to_string(),
                n: 50,
                r: 0.85,
            },
            crate::meta_analysis::GroupCorrelation {
                group_id: "Cu".to_string(),
                n: 50,
                r: 0.72,
            },
            crate::meta_analysis::GroupCorrelation {
                group_id: "Ni".to_string(),
                n: 50,
                r: 0.68,
            },
            crate::meta_analysis::GroupCorrelation {
                group_id: "Ag".to_string(),
                n: 50,
                r: 0.45,
            },
            crate::meta_analysis::GroupCorrelation {
                group_id: "Au".to_string(),
                n: 50,
                r: 0.30,
            },
            crate::meta_analysis::GroupCorrelation {
                group_id: "Pt".to_string(),
                n: 50,
                r: -0.15,
            },
        ];
    }

    let fixed = crate::meta_analysis::fixed_effects_meta(&groups);
    let random = crate::meta_analysis::random_effects_meta(&groups);

    eprintln!();
    eprintln!("  ╔════════════════════════════════════════════════════════════╗");
    eprintln!("  ║  Meta-Analysis Comparison: Fixed vs Random Effects         ║");
    eprintln!("  ╚════════════════════════════════════════════════════════════╝");

    crate::meta_analysis::print_summary(&fixed);
    crate::meta_analysis::print_summary(&random);

    let json = serde_json::json!({
        "fixed_effects": fixed,
        "random_effects": random,
    });
    std::fs::write("meta_analysis.json", serde_json::to_string_pretty(&json)?)?;
    eprintln!("\n  ✦ Meta-analysis results → meta_analysis.json");

    Ok(())
}

fn cmd_detect_paradox(data_path: Option<&PathBuf>, use_example: bool, use_bcc: bool) -> Result<()> {
    let data: Vec<crate::causal::GroupedPoint>;

    if let Some(path) = data_path {
        let content = std::fs::read_to_string(path)?;
        let mut points = Vec::new();
        for line in content.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            let parts: Vec<&str> = line.split(',').map(|s| s.trim()).collect();
            if parts.len() >= 3 {
                if let (Ok(x), Ok(y)) = (parts[1].parse::<f64>(), parts[2].parse::<f64>()) {
                    points.push(crate::causal::GroupedPoint {
                        group: parts[0].to_string(),
                        x,
                        y,
                    });
                }
            }
        }
        data = points;
    } else if use_bcc {
        data = crate::causal::generate_bcc_paradox_example();
    } else if use_example {
        data = crate::causal::generate_reversal_example();
    } else {
        data = crate::causal::generate_simpsons_example();
    }

    let result = crate::causal::detect_simpsons_paradox(&data);
    crate::causal::print_summary(&result);

    let json = serde_json::to_string_pretty(&result)?;
    std::fs::write("paradox_detection.json", &json)?;
    eprintln!("\n  ✦ Paradox detection results → paradox_detection.json");

    Ok(())
}

fn cmd_benchmark(path: &Path, do_manifold: bool, do_meta: bool, do_full: bool) -> Result<()> {
    eprintln!("  ✦ Loading benchmark database: {}", path.display());
    let entries = benchmark::load_auto(path)?;
    let summary = benchmark::summarize(&entries);
    benchmark::print_summary(&summary);

    if do_manifold || do_full {
        let props: Vec<String> = summary.properties.clone();
        let vectors = manifold::build_error_vectors(&entries, &props);
        if vectors.len() >= 3 {
            let analysis = manifold::analyze_manifold(&vectors);
            manifold::print_summary(&analysis);
            let json = serde_json::to_string_pretty(&analysis)?;
            std::fs::write("benchmark_manifold.json", &json)?;
            eprintln!("\n  ✦ Manifold analysis → benchmark_manifold.json");
        } else {
            eprintln!(
                "  ⚠ Not enough data for manifold analysis (need ≥3 material×potential groups)"
            );
        }
    }

    if do_meta || do_full {
        // Build per-material group correlations (reference vs predicted)
        use std::collections::HashMap;
        let mut by_material: HashMap<String, Vec<(f64, f64)>> = HashMap::new();
        for e in &entries {
            by_material
                .entry(e.material.clone())
                .or_default()
                .push((e.reference, e.predicted));
        }
        let mut groups = Vec::new();
        for (mat, pts) in &by_material {
            if pts.len() >= 3 {
                let xs: Vec<f64> = pts.iter().map(|(x, _)| *x).collect();
                let ys: Vec<f64> = pts.iter().map(|(_, y)| *y).collect();
                let r = stats::pearson_r(&xs, &ys);
                if r.is_finite() {
                    groups.push(meta_analysis::GroupCorrelation {
                        group_id: mat.clone(),
                        n: pts.len(),
                        r,
                    });
                }
            }
        }
        if groups.len() >= 2 {
            let fixed = meta_analysis::fixed_effects_meta(&groups);
            let random = meta_analysis::random_effects_meta(&groups);
            meta_analysis::print_summary(&fixed);
            meta_analysis::print_summary(&random);
            let json = serde_json::json!({"fixed_effects": fixed, "random_effects": random});
            std::fs::write("benchmark_meta.json", serde_json::to_string_pretty(&json)?)?;
            eprintln!("\n  ✦ Meta-analysis → benchmark_meta.json");
        } else {
            eprintln!(
                "  ⚠ Not enough groups for meta-analysis (need ≥2 materials with ≥3 points each)"
            );
        }
    }

    Ok(())
}

fn cmd_nist(
    index_path: &Path,
    element: Option<&str>,
    pair_style: Option<&str>,
    single_only: bool,
    scaffold: bool,
) -> Result<()> {
    eprintln!("  ✦ Loading NIST catalog: {}", index_path.display());
    let catalog = nist::NistCatalog::load(index_path)?;
    eprintln!("  ✦ Loaded {} potentials", catalog.len());

    // Scaffold mode: generate CSV to stdout and exit
    if scaffold {
        let props = &["C11", "C12", "C44"];
        if let Some(el) = element {
            let rows = nist::generate_scaffold(&catalog, el, props);
            if rows.is_empty() {
                anyhow::bail!("No single-element potentials found for {}", el);
            }
            eprintln!(
                "  ✦ Generating scaffold for {} ({} potentials × {} properties = {} rows)",
                el,
                rows.len() / props.len(),
                props.len(),
                rows.len()
            );
            nist::write_scaffold_csv(&rows)?;
        } else {
            // Scaffold for all benchmark metals
            let metals = [
                "Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb", "Fe", "Cr", "Mo", "W", "V", "Nb",
                "Ta",
            ];
            let mut all_rows = Vec::new();
            for &m in &metals {
                all_rows.extend(nist::generate_scaffold(&catalog, m, props));
            }
            if all_rows.is_empty() {
                anyhow::bail!("No single-element potentials found for any benchmark metal");
            }
            eprintln!(
                "  ✦ Generating scaffold for {} metals ({} rows)",
                metals.len(),
                all_rows.len()
            );
            nist::write_scaffold_csv(&all_rows)?;
        }
        return Ok(());
    }

    // Query mode: filter and display
    let mut results: Vec<&nist::NistPotential> = Vec::new();
    let filtered;

    if let Some(el) = element {
        if single_only {
            results = catalog.single_element(el);
        } else {
            results = catalog.by_element(el);
        }
        eprintln!(
            "  ✦ Filter: element={}{}",
            el,
            if single_only {
                " (single-element only)"
            } else {
                ""
            }
        );
    } else if let Some(ps) = pair_style {
        results = catalog.by_pair_style(ps);
        if single_only {
            results.retain(|p| p.is_single_element());
        }
        eprintln!(
            "  ✦ Filter: pair_style={}{}",
            ps,
            if single_only {
                " (single-element only)"
            } else {
                ""
            }
        );
    }

    if !results.is_empty() {
        filtered = true;
        nist::print_potentials(&results);
    } else if element.is_some() || pair_style.is_some() {
        filtered = true;
        eprintln!("  No potentials matched the filter.");
    } else {
        filtered = false;
    }

    // Always print summary when no filter, or after filter results
    if !filtered {
        let summary = catalog.summary();
        nist::print_summary(&summary);

        // Also show benchmark metal coverage
        let metals = [
            "Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb", "Fe", "Cr", "Mo", "W", "V", "Nb", "Ta",
        ];
        eprintln!();
        eprintln!("  Benchmark metal coverage (single-element potentials):");
        eprintln!("  {:4} {:>6} {:>6} {:>6}", "Metal", "Total", "EAM", "MEAM");
        eprintln!(
            "  {:4} {:>6} {:>6} {:>6}",
            "────", "──────", "──────", "──────"
        );
        let mut total_se = 0;
        let mut total_eam = 0;
        let mut total_meam = 0;
        for &m in &metals {
            let se = catalog.single_element(m).len();
            let eam = catalog.eam_for_element(m).len();
            let meam = catalog.meam_for_element(m).len();
            total_se += se;
            total_eam += eam;
            total_meam += meam;
            eprintln!("  {:4} {:>6} {:>6} {:>6}", m, se, eam, meam);
        }
        eprintln!(
            "  {:4} {:>6} {:>6} {:>6}",
            "────", "──────", "──────", "──────"
        );
        eprintln!(
            "  {:4} {:>6} {:>6} {:>6}",
            "SUM", total_se, total_eam, total_meam
        );
    }

    Ok(())
}

fn cmd_discover_agents(
    iterations: usize,
    elements: Option<&str>,
    ledger_dir: &Path,
) -> Result<()> {
    use agents::{
        causal_agent::CausalAgent,
        experiment_agent::{ExperimentAgent, ExperimentAgentConfig},
        lammps_agent::LammpsAgent,
        literature_agent::LiteratureAgent,
        manifold_agent::ManifoldAgent,
        null_model_agent::NullModelAgent,
        orchestrator::{CampaignConfig, Orchestrator},
        theorist_agent::TheoristAgent,
    };

    // Default: empty = use ALL available metals (8 FCC + 7 BCC = 15)
    // Previous default of 4 elements created degenerate 3×3 PCA matrices.
    let target_elements: Vec<String> = elements
        .map(|e| e.split(',').map(|s| s.trim().to_string()).collect())
        .unwrap_or_default();

    eprintln!("\n  ╔════════════════════════════════════════════════════════════╗");
    eprintln!("  ║  Multi-Agent Interatomic Potential Discovery System       ║");
    eprintln!("  ║  ⚠ Null model agent (ε) active — confirmation bias guard  ║");
    eprintln!("  ╚════════════════════════════════════════════════════════════╝\n");
    eprintln!("  Target elements: {:?}", target_elements);
    eprintln!("  Max iterations:  {}", iterations);
    eprintln!("  Ledger dir:      {}\n", ledger_dir.display());

    let config = CampaignConfig {
        ledger_dir: ledger_dir.to_path_buf(),
        max_iterations: iterations,
        elements: target_elements.clone(),
        nist_index: PathBuf::from("atlas/nist_ipr/index/master_index.json"),
    };

    let mut orchestrator = Orchestrator::new(&config)?;

    // Register agents — note: NullModelAgent (ε) runs AFTER ManifoldAgent (γ)
    // so it can compare real claims against random baselines.
    orchestrator.add_agent(Box::new(LammpsAgent::new(target_elements.clone())));
    orchestrator.add_agent(Box::new(LiteratureAgent::new()));
    orchestrator.add_agent(Box::new(ManifoldAgent::new()));
    orchestrator.add_agent(Box::new(NullModelAgent::new()));
    orchestrator.add_agent(Box::new(CausalAgent::new()));
    orchestrator.add_agent(Box::new(TheoristAgent::new()));
    orchestrator.add_agent(Box::new(ExperimentAgent::new(ExperimentAgentConfig {
        lammps_exe: "lmp".into(),
        work_dir: PathBuf::from("atlas-distill/lammps_runs/auto"),
        min_score: 0.3,
        max_per_iteration: 2,
        supercell: 3,
    })));

    let summary = orchestrator.run()?;

    // Final report
    eprintln!("\n  ════════════════════════════════════════════════════════════");
    eprintln!("  Discovery campaign complete.");
    eprintln!(
        "  {} records, {} claims, {} unique potentials across {} elements",
        summary.total_records,
        summary.total_claims,
        summary.unique_potentials,
        summary.unique_elements
    );
    eprintln!(
        "  Confirmed: {} | Refuted: {}",
        summary.confirmed_claims, summary.refuted_claims
    );
    eprintln!("  Ledger saved to: {}\n", ledger_dir.display());

    Ok(())
}
