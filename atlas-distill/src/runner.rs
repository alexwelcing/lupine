//! LAMMPS execution runner for NIST IPR potentials.
//!
//! This module bridges the NIST catalog (metadata + parameter files)
//! to actual LAMMPS simulations, producing computed benchmark entries
//! with full provenance traces.
//!
//! Architecture:
//!   1. Load NIST catalog → select single-element potentials for target metal
//!   2. Download parameter files → cache locally
//!   3. Generate LAMMPS input script for elastic constants (C11, C12, C44)
//!   4. Execute LAMMPS → capture log + output
//!   5. Parse log → extract elastic constants
//!   6. Write BenchmarkEntry with LammpsRun provenance
//!
//! Usage:
//!   atlas-distill run-nist --element Al --index atlas/nist_ipr/index/master_index.json
//!
//! The runner is designed to be resume-safe: if interrupted, re-running
//! skips already-completed potentials (checked via output log existence).

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

// use crate::manifold::BenchmarkEntry;  // reserved for future benchmark generation
use crate::nist::{NistCatalog, NistPotential};

// ───────────────────────────────────────────────────────────
// Configuration
// ───────────────────────────────────────────────────────────

/// Runtime configuration for a NIST-backed computation campaign.
#[derive(Debug, Clone)]
pub struct RunnerConfig {
    /// Path to NIST master_index.json
    pub nist_index: PathBuf,
    /// Target element (e.g., "Al", "Fe")
    pub element: String,
    /// Crystal structure: "fcc" or "bcc"
    pub structure: String,
    /// Lattice constant in Å (if None, use reference value)
    pub lattice_constant: Option<f64>,
    /// LAMMPS executable path (default: "lmp")
    pub lammps_executable: String,
    /// Working directory for simulations
    pub work_dir: PathBuf,
    /// Supercell size (NxNxN unit cells)
    pub supercell: usize,
    /// Number of MPI ranks (1 = serial)
    pub mpi_ranks: usize,
    /// Whether to skip already-completed runs
    pub resume: bool,
}

impl Default for RunnerConfig {
    fn default() -> Self {
        Self {
            nist_index: PathBuf::from("atlas/nist_ipr/index/master_index.json"),
            element: "Al".to_string(),
            structure: "fcc".to_string(),
            lattice_constant: None,
            lammps_executable: "lmp".to_string(),
            work_dir: PathBuf::from("atlas-distill/lammps_runs"),
            supercell: 3,
            mpi_ranks: 1,
            resume: true,
        }
    }
}

// ───────────────────────────────────────────────────────────
// Computation trace
// ───────────────────────────────────────────────────────────

/// SHA-256 hash of file contents (hex string).
pub type ContentHash = String;

/// Full provenance trace for a single LAMMPS execution.
/// Mirrors the Lean `LammpsRun` structure.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LammpsTrace {
    pub run_id: String,
    pub nist_potential_id: String,
    pub potential_doi: String,
    pub pair_style: String,
    pub lammps_version: String,
    pub input_script_hash: ContentHash,
    pub potential_file_hash: ContentHash,
    pub output_log_hash: ContentHash,
    pub crystal_structure: String,
    pub lattice_constant: f64,
    pub temperature: f64,
    pub properties: Vec<String>,
}

/// Result of a single-potential elastic constant computation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComputationResult {
    pub potential: NistPotential,
    pub trace: LammpsTrace,
    pub c11: Option<f64>,
    pub c12: Option<f64>,
    pub c44: Option<f64>,
    pub success: bool,
    pub error_message: Option<String>,
}

// ───────────────────────────────────────────────────────────
// Reference data
// ───────────────────────────────────────────────────────────

/// Experimental lattice constants (Å) and elastic constants (GPa)
/// for benchmark metals. Used as reference values.
pub fn reference_data() -> HashMap<String, MetalReference> {
    let mut m = HashMap::new();
    // FCC metals
    m.insert("Al".to_string(), MetalReference { lattice: 4.05,  c11: 108.2, c12: 61.3,  c44: 28.5,  structure: "fcc".to_string() });
    m.insert("Cu".to_string(), MetalReference { lattice: 3.615, c11: 168.4, c12: 121.4, c44: 75.4,  structure: "fcc".to_string() });
    m.insert("Ni".to_string(), MetalReference { lattice: 3.524, c11: 246.5, c12: 147.3, c44: 124.7, structure: "fcc".to_string() });
    m.insert("Ag".to_string(), MetalReference { lattice: 4.09,  c11: 124.0, c12: 93.4,  c44: 46.1,  structure: "fcc".to_string() });
    m.insert("Au".to_string(), MetalReference { lattice: 4.078, c11: 192.3, c12: 163.1, c44: 42.0,  structure: "fcc".to_string() });
    m.insert("Pt".to_string(), MetalReference { lattice: 3.924, c11: 346.7, c12: 250.7, c44: 76.5,  structure: "fcc".to_string() });
    m.insert("Pd".to_string(), MetalReference { lattice: 3.89,  c11: 227.1, c12: 176.1, c44: 71.7,  structure: "fcc".to_string() });
    m.insert("Pb".to_string(), MetalReference { lattice: 4.95,  c11: 49.5,  c12: 42.3,  c44: 14.9,  structure: "fcc".to_string() });
    // BCC metals
    m.insert("Fe".to_string(), MetalReference { lattice: 2.87,  c11: 230.0, c12: 135.0, c44: 117.0, structure: "bcc".to_string() });
    m.insert("Cr".to_string(), MetalReference { lattice: 2.88,  c11: 350.0, c12: 67.0,  c44: 100.8, structure: "bcc".to_string() });
    m.insert("Mo".to_string(), MetalReference { lattice: 3.147, c11: 440.0, c12: 172.0, c44: 106.0, structure: "bcc".to_string() });
    m.insert("W".to_string(),  MetalReference { lattice: 3.165, c11: 522.0, c12: 204.0, c44: 161.0, structure: "bcc".to_string() });
    m.insert("V".to_string(),  MetalReference { lattice: 3.03,  c11: 230.0, c12: 119.0, c44: 43.5,  structure: "bcc".to_string() });
    m.insert("Nb".to_string(), MetalReference { lattice: 3.3,   c11: 247.0, c12: 135.0, c44: 28.5,  structure: "bcc".to_string() });
    m.insert("Ta".to_string(), MetalReference { lattice: 3.31,  c11: 266.0, c12: 158.0, c44: 87.0,  structure: "bcc".to_string() });
    m
}

#[derive(Debug, Clone)]
pub struct MetalReference {
    pub lattice: f64,
    pub c11: f64,
    pub c12: f64,
    pub c44: f64,
    pub structure: String,
}

// ───────────────────────────────────────────────────────────
// Input script generation
// ───────────────────────────────────────────────────────────

/// Generate a LAMMPS input script for elastic constant calculation.
/// Uses the finite-difference stress approach: apply small strains,
/// measure stress response, compute Cij from linear relation.
pub fn generate_elastic_input(
    element: &str,
    structure: &str,
    lattice: f64,
    supercell: usize,
    pair_style: &str,
    potential_file: &str,
) -> String {
    let (lattice_cmd, create_atoms) = match structure {
        "fcc" => (
            format!("lattice fcc {}", lattice),
            "create_atoms 1 box".to_string(),
        ),
        "bcc" => (
            format!("lattice bcc {}", lattice),
            "create_atoms 1 box".to_string(),
        ),
        _ => (
            format!("lattice fcc {}", lattice),
            "create_atoms 1 box".to_string(),
        ),
    };

    // Build pair_coeff command based on pair_style
    let pair_coeff = if pair_style.contains("eam/alloy") || pair_style.contains("eam/fs") {
        format!("pair_coeff * * {} {}", potential_file, element)
    } else if pair_style == "eam" {
        format!("pair_coeff * * {} {}", potential_file, element)
    } else if pair_style.contains("meam") {
        format!("pair_coeff * * {} {} NULL", potential_file, element)
    } else {
        format!("pair_coeff * * {} {}", potential_file, element)
    };

    format!(r#"# LAMMPS input for elastic constants
# Generated by Open Distillation Factory
# Element: {element}, Structure: {structure}

units metal
atom_style atomic
boundary p p p

{lattice_cmd}
region box block 0 {sc} 0 {sc} 0 {sc}
create_box 1 box
{create_atoms}

mass 1 26.9815  # Al mass (amu) — TODO: look up per element

pair_style {pair_style}
{pair_coeff}

neighbor 0.3 bin
neigh_modify delay 0

# Minimize at zero temperature
minimize 1.0e-12 1.0e-12 10000 100000

# Set up for elastic constant calculation
reset_timestep 0
compute stress all pressure NULL virial
compute peatom all pe/atom

# Apply small strains and measure stress
# (Simplified approach — full elastic tensor requires 6 strain directions)
# For now, we output energy and pressure at equilibrium

thermo 1
thermo_style custom step temp press pe ke etotal lx ly lz pxx pyy pzz pxy pxz pyz

run 0

# Write final state
write_data final.data
"#,
        element = element,
        structure = structure,
        lattice_cmd = lattice_cmd,
        sc = supercell,
        create_atoms = create_atoms,
        pair_style = pair_style,
        pair_coeff = pair_coeff,
    )
}

// ───────────────────────────────────────────────────────────
// LAMMPS execution
// ───────────────────────────────────────────────────────────

/// Check if LAMMPS is available on the system.
pub fn lammps_available(executable: &str) -> bool {
    Command::new(executable)
        .arg("-h")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

/// Execute LAMMPS for a single potential.
/// Returns the path to the output log file.
pub fn execute_lammps(
    config: &RunnerConfig,
    potential: &NistPotential,
    input_path: &Path,
    run_dir: &Path,
) -> Result<PathBuf> {
    let log_path = run_dir.join("log.lammps");

    let mut cmd = if config.mpi_ranks > 1 {
        let mut c = Command::new("mpirun");
        c.arg("-np").arg(config.mpi_ranks.to_string());
        c.arg(&config.lammps_executable);
        c
    } else {
        Command::new(&config.lammps_executable)
    };

    cmd.arg("-in").arg(input_path)
        .arg("-log").arg(&log_path)
        .current_dir(run_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    eprintln!("    → Running LAMMPS for {}...", potential.id);

    let output = cmd.output()
        .with_context(|| format!("Failed to execute LAMMPS for {}", potential.id))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("LAMMPS failed for {}: {}", potential.id, stderr);
    }

    Ok(log_path)
}

// ───────────────────────────────────────────────────────────
// Output parsing (placeholder — full implementation needs thermo.rs)
// ───────────────────────────────────────────────────────────

/// Parse elastic constants from LAMMPS log.
/// This is a simplified placeholder; real implementation uses
/// the stress-strain finite difference method or LAMMPS elastic package.
pub fn parse_elastic_constants(log_path: &Path) -> Result<(f64, f64, f64)> {
    // TODO: Implement full elastic constant extraction.
    // For now, return placeholder values that indicate "needs implementation".
    //
    // The real implementation would:
    // 1. Read the thermo output from the log
    // 2. Apply 6 independent strain directions (εxx, εyy, εzz, εxy, εxz, εyz)
    // 3. Measure stress response for each
    // 4. Solve linear system: σ_i = C_ij · ε_j
    // 5. Extract C11, C12, C44 for cubic crystals
    //
    // LAMMPS has an `examples/ELASTIC` directory with scripts for this.

    let content = std::fs::read_to_string(log_path)
        .with_context(|| format!("Failed to read log: {}", log_path.display()))?;

    // Look for pressure values in the log
    let mut pxx: Option<f64> = None;
    let mut _pyy: Option<f64> = None;
    let mut _pzz: Option<f64> = None;

    for line in content.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 10 && parts[0].parse::<usize>().is_ok() {
            // This looks like a thermo output line
            // Try to find pxx, pyy, pzz columns
            // Format: Step Temp Press ... Pxx Pyy Pzz Pxy Pxz Pyz
            if let (Some(px), Some(_py), Some(_pz)) = (
                parts.get(parts.len().saturating_sub(6)).and_then(|s| s.parse::<f64>().ok()),
                parts.get(parts.len().saturating_sub(5)).and_then(|s| s.parse::<f64>().ok()),
                parts.get(parts.len().saturating_sub(4)).and_then(|s| s.parse::<f64>().ok()),
            ) {
                pxx = Some(px);
            }
        }
    }

    // For now, we can't compute elastic constants from just equilibrium pressure.
    // Return zeros with a clear indication this needs work.
    if pxx.is_some() {
        eprintln!("    ⚠ Equilibrium pressure found, but elastic constant extraction needs strain application");
    }

    anyhow::bail!("Elastic constant extraction not yet implemented. Needs LAMMPS ELASTIC package or manual strain application.")
}

// ───────────────────────────────────────────────────────────
// Campaign orchestration
// ───────────────────────────────────────────────────────────

/// Run a full computation campaign for one element.
/// Iterates over all single-element NIST potentials, runs LAMMPS,
/// and collects results.
pub fn run_campaign(config: &RunnerConfig) -> Result<Vec<ComputationResult>> {
    // Check LAMMPS availability
    if !lammps_available(&config.lammps_executable) {
        eprintln!("⚠ LAMMPS executable '{}' not found.", config.lammps_executable);
        eprintln!("  Please install LAMMPS: https://www.lammps.org/download.html");
        eprintln!("  Or set --lammps-exe to point to your LAMMPS binary.");
        anyhow::bail!("LAMMPS not available");
    }

    // Load NIST catalog
    let catalog = NistCatalog::load(&config.nist_index)
        .with_context(|| format!("Failed to load NIST catalog from {}", config.nist_index.display()))?;

    let potentials = catalog.single_element(&config.element);
    if potentials.is_empty() {
        anyhow::bail!("No single-element potentials found for {}", config.element);
    }

    eprintln!("  ✦ Campaign: {} single-element potentials for {}", potentials.len(), config.element);

    // Get reference data
    let refs = reference_data();
    let ref_data = refs.get(&config.element)
        .with_context(|| format!("No reference data for element {}", config.element))?;

    let lattice = config.lattice_constant.unwrap_or(ref_data.lattice);

    // Create work directory
    std::fs::create_dir_all(&config.work_dir)?;

    let mut results = Vec::new();

    for (i, pot) in potentials.iter().enumerate() {
        eprintln!("\n  [{}/{}] {}", i + 1, potentials.len(), pot.id);

        let run_dir = config.work_dir.join(format!("{}_{}", config.element, pot.short_label()));
        std::fs::create_dir_all(&run_dir)?;

        // Check if already completed (resume support)
        let result_path = run_dir.join("result.json");
        if config.resume && result_path.exists() {
            eprintln!("    → Skipping (already computed)");
            if let Ok(content) = std::fs::read_to_string(&result_path) {
                if let Ok(result) = serde_json::from_str::<ComputationResult>(&content) {
                    results.push(result);
                    continue;
                }
            }
        }

        // Download/get parameter file
        let pot_file = match prepare_potential_file(pot, &run_dir) {
            Ok(f) => f,
            Err(e) => {
                eprintln!("    ✗ Failed to prepare potential file: {}", e);
                results.push(ComputationResult {
                    potential: (*pot).clone(),
                    trace: dummy_trace(pot, &config.structure, lattice),
                    c11: None, c12: None, c44: None,
                    success: false,
                    error_message: Some(format!("Potential file error: {}", e)),
                });
                continue;
            }
        };

        // Generate input script
        let input = generate_elastic_input(
            &config.element,
            &config.structure,
            lattice,
            config.supercell,
            &pot.pair_style,
            &pot_file,
        );
        let input_path = run_dir.join("in.elastic");
        std::fs::write(&input_path, &input)?;

        // Run LAMMPS
        let log_path = match execute_lammps(config, pot, &input_path, &run_dir) {
            Ok(p) => p,
            Err(e) => {
                eprintln!("    ✗ LAMMPS execution failed: {}", e);
                results.push(ComputationResult {
                    potential: (*pot).clone(),
                    trace: dummy_trace(pot, &config.structure, lattice),
                    c11: None, c12: None, c44: None,
                    success: false,
                    error_message: Some(format!("Execution error: {}", e)),
                });
                continue;
            }
        };

        // Parse results
        match parse_elastic_constants(&log_path) {
            Ok((c11, c12, c44)) => {
                eprintln!("    ✓ C11={:.2} C12={:.2} C44={:.2} GPa", c11, c12, c44);

                let trace = build_trace(pot, &config.structure, lattice, &run_dir);
                let result = ComputationResult {
                    potential: (*pot).clone(),
                    trace,
                    c11: Some(c11),
                    c12: Some(c12),
                    c44: Some(c44),
                    success: true,
                    error_message: None,
                };

                // Save result for resume support
                let json = serde_json::to_string_pretty(&result)?;
                std::fs::write(&result_path, json)?;

                results.push(result);
            }
            Err(e) => {
                eprintln!("    ✗ Parsing failed: {}", e);
                results.push(ComputationResult {
                    potential: (*pot).clone(),
                    trace: dummy_trace(pot, &config.structure, lattice),
                    c11: None, c12: None, c44: None,
                    success: false,
                    error_message: Some(format!("Parse error: {}", e)),
                });
            }
        }
    }

    // Summary
    let success_count = results.iter().filter(|r| r.success).count();
    eprintln!("\n  ════════════════════════════════════════════════════════════");
    eprintln!("  Campaign complete: {}/{} successful", success_count, results.len());
    eprintln!("  ════════════════════════════════════════════════════════════");

    Ok(results)
}

// ───────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────

/// Download or copy the potential parameter file to the run directory.
fn prepare_potential_file(pot: &NistPotential, run_dir: &Path) -> Result<String> {
    if pot.artifacts.is_empty() {
        anyhow::bail!("No artifacts available for {}", pot.id);
    }

    let artifact = &pot.artifacts[0];
    let local_path = run_dir.join(&artifact.filename);

    if local_path.exists() {
        return Ok(artifact.filename.clone());
    }

    // Try to download from NIST
    eprintln!("    → Downloading {}...", artifact.filename);
    let response = ureq::get(&artifact.url)
        .call()
        .with_context(|| format!("Failed to download {}", artifact.url))?;

    let mut reader = response.into_reader();
    let mut file = std::fs::File::create(&local_path)
        .with_context(|| format!("Failed to create {}", local_path.display()))?;
    std::io::copy(&mut reader, &mut file)
        .with_context(|| format!("Failed to write {}", local_path.display()))?;

    Ok(artifact.filename.clone())
}

// Note: SHA-256 hashing requires `sha2 = "0.10"` and `hex = "0.4"` in Cargo.toml.
// Added here as a placeholder for when trace integrity hashing is implemented.
//
// fn hash_file(path: &Path) -> Result<String> {
//     use sha2::{Sha256, Digest};
//     use std::io::Read;
//     let mut file = std::fs::File::open(path)?;
//     let mut hasher = Sha256::new();
//     let mut buffer = [0u8; 8192];
//     loop {
//         let n = file.read(&mut buffer)?;
//         if n == 0 { break; }
//         hasher.update(&buffer[..n]);
//     }
//     Ok(hex::encode(hasher.finalize()))
// }

fn build_trace(pot: &NistPotential, structure: &str, lattice: f64, _run_dir: &Path) -> LammpsTrace {
    LammpsTrace {
        run_id: uuid(),
        nist_potential_id: pot.id.clone(),
        potential_doi: pot.primary_doi().unwrap_or("unknown").to_string(),
        pair_style: pot.pair_style.clone(),
        lammps_version: "unknown".to_string(), // Would parse from `lmp -h` output
        input_script_hash: "placeholder".to_string(),
        potential_file_hash: "placeholder".to_string(),
        output_log_hash: "placeholder".to_string(),
        crystal_structure: structure.to_string(),
        lattice_constant: lattice,
        temperature: 0.0, // 0K simulation
        properties: vec!["C11".to_string(), "C12".to_string(), "C44".to_string()],
    }
}

fn dummy_trace(pot: &NistPotential, structure: &str, lattice: f64) -> LammpsTrace {
    build_trace(pot, structure, lattice, Path::new("."))
}

fn uuid() -> String {
    format!("{:016x}", rand::random::<u64>())
}

// ───────────────────────────────────────────────────────────
// CSV export
// ───────────────────────────────────────────────────────────

/// Export computation results as a benchmark CSV.
/// This CSV can be loaded by `atlas-distill benchmark <path> --full`.
pub fn export_benchmark_csv(results: &[ComputationResult], element: &str, path: &Path) -> Result<()> {
    let mut wtr = csv::Writer::from_path(path)?;

    // Header
    wtr.write_record(&["material", "potential", "property", "reference", "predicted", "unit", "nist_id", "doi", "pair_style"])?;

    let refs = reference_data();
    let ref_data = refs.get(element).context("No reference data")?;

    for result in results {
        if !result.success {
            continue;
        }
        let pot = &result.potential;

        if let Some(c11) = result.c11 {
            wtr.write_record(&[
                element, &pot.short_label(), "C11",
                &ref_data.c11.to_string(), &c11.to_string(), "GPa",
                &pot.id, &result.trace.potential_doi, &pot.pair_style,
            ])?;
        }
        if let Some(c12) = result.c12 {
            wtr.write_record(&[
                element, &pot.short_label(), "C12",
                &ref_data.c12.to_string(), &c12.to_string(), "GPa",
                &pot.id, &result.trace.potential_doi, &pot.pair_style,
            ])?;
        }
        if let Some(c44) = result.c44 {
            wtr.write_record(&[
                element, &pot.short_label(), "C44",
                &ref_data.c44.to_string(), &c44.to_string(), "GPa",
                &pot.id, &result.trace.potential_doi, &pot.pair_style,
            ])?;
        }
    }

    wtr.flush()?;
    eprintln!("  ✦ Benchmark CSV → {}", path.display());
    Ok(())
}
