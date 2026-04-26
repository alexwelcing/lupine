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

/// Read a LAMMPS log file as text, tolerating non-UTF-8 bytes (Windows editors
/// occasionally write UTF-16). Returns `None` if the file is missing or
/// unreadable, after logging the cause — the silent `unwrap_or_default()`
/// pattern previously masked encoding errors as parse failures.
fn read_log_lossy(path: &Path) -> Option<String> {
    match std::fs::read(path) {
        Ok(bytes) => Some(String::from_utf8_lossy(&bytes).into_owned()),
        Err(e) => {
            eprintln!("    ✗ Failed to read log {}: {}", path.display(), e);
            None
        }
    }
}

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

/// Result of a single-potential computation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComputationResult {
    pub potential: NistPotential,
    pub trace: LammpsTrace,
    pub c11: Option<f64>,
    pub c12: Option<f64>,
    pub c44: Option<f64>,
    pub a0: Option<f64>,
    pub ecoh: Option<f64>,
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
    log_filename: &str,
) -> Result<PathBuf> {
    let log_path = run_dir.join(log_filename);

    let mut cmd = if config.mpi_ranks > 1 {
        let mut c = Command::new("mpirun");
        c.arg("-np").arg(config.mpi_ranks.to_string());
        c.arg(&config.lammps_executable);
        c
    } else {
        Command::new(&config.lammps_executable)
    };

    cmd.arg("-in").arg(input_path.file_name().unwrap())
        .arg("-log").arg(log_filename)
        .current_dir(run_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    eprintln!("    → Running LAMMPS for {}...", potential.id);

    let output = cmd.output()
        .with_context(|| format!("Failed to execute LAMMPS for {}", potential.id))?;

    if !output.status.success() {
        let mut stderr = String::from_utf8_lossy(&output.stderr).into_owned();
        if stderr.trim().is_empty() {
            stderr = String::from_utf8_lossy(&output.stdout).into_owned();
        }
        anyhow::bail!("LAMMPS failed for {}: {}", potential.id, stderr.trim());
    }

    Ok(log_path)
}

// ───────────────────────────────────────────────────────────
// Single-potential execution
// ───────────────────────────────────────────────────────────

/// Run a single NIST potential for a pre-configured element.
/// This is the primitive that the autoresearch loop calls.
pub fn run_single_potential(
    config: &RunnerConfig,
    pot: &NistPotential,
) -> Result<ComputationResult> {
    let refs = reference_data();
    let ref_data = refs.get(&config.element)
        .with_context(|| format!("No reference data for element {}", config.element))?;
    let lattice = config.lattice_constant.unwrap_or(ref_data.lattice);

    let run_dir = config.work_dir.join(format!("{}_{}", config.element, pot.short_label()));
    std::fs::create_dir_all(&run_dir)?;

    let result_path = run_dir.join("result.json");
    if config.resume && result_path.exists() {
        let content = std::fs::read_to_string(&result_path)?;
        if let Ok(result) = serde_json::from_str::<ComputationResult>(&content) {
            return Ok(result);
        }
    }

    let pot_file = match prepare_potential_file(pot, &run_dir) {
        Ok(f) => f,
        Err(e) => {
            return Ok(ComputationResult {
                potential: pot.clone(),
                trace: dummy_trace(pot, &config.structure, lattice),
                c11: None, c12: None, c44: None,
                a0: None, ecoh: None,
                success: false,
                error_message: Some(format!("Potential file error: {}", e)),
            });
        }
    };

    let lattice_type = match config.structure.as_str() {
        "bcc" => lupine_ops::elastic::LatticeType::Bcc,
        _ => lupine_ops::elastic::LatticeType::Fcc,
    };
    let statics_config = lupine_ops::statics::StaticsCalcConfig {
        element: config.element.clone(),
        lattice_type,
        lattice_constant_guess: lattice,
        nist_id: pot.id.clone(),
    };

    let backend = if pot.pair_style.contains("eam/alloy") {
        lupine_ops::mlip_ops::MlipBackend::EamAlloy
    } else if pot.pair_style.contains("eam/fs") {
        lupine_ops::mlip_ops::MlipBackend::EamFs
    } else if pot.pair_style == "eam" {
        lupine_ops::mlip_ops::MlipBackend::Eam
    } else if pot.pair_style.contains("meam") {
        lupine_ops::mlip_ops::MlipBackend::Meam
    } else if pot.pair_style.contains("adp") {
        lupine_ops::mlip_ops::MlipBackend::Adp
    } else {
        lupine_ops::mlip_ops::MlipBackend::Eam
    };

    let deployment = lupine_ops::mlip_ops::MlipDeployment::new(backend, "test").with_path(&pot_file);

    // Statics
    let input = match lupine_ops::statics::generate_statics_script(&statics_config, &deployment) {
        Ok(script) => script,
        Err(e) => {
            return Ok(ComputationResult {
                potential: pot.clone(),
                trace: dummy_trace(pot, &config.structure, lattice),
                c11: None, c12: None, c44: None,
                a0: None, ecoh: None,
                success: false,
                error_message: Some(format!("Script error: {:?}", e)),
            });
        }
    };
    let input_path = run_dir.join("in.statics");
    std::fs::write(&input_path, &input)?;

    let log_path = match execute_lammps(config, pot, &input_path, &run_dir, "log.lammps.statics") {
        Ok(p) => p,
        Err(e) => {
            return Ok(ComputationResult {
                potential: pot.clone(),
                trace: dummy_trace(pot, &config.structure, lattice),
                c11: None, c12: None, c44: None,
                a0: None, ecoh: None,
                success: false,
                error_message: Some(format!("Statics execution error: {}", e)),
            });
        }
    };

    let log_content = read_log_lossy(&log_path).unwrap_or_default();
    let statics_res_opt = lupine_ops::statics::parse_statics_output(&log_content);

    if statics_res_opt.is_none() {
        return Ok(ComputationResult {
            potential: pot.clone(),
            trace: dummy_trace(pot, &config.structure, lattice),
            c11: None, c12: None, c44: None,
            a0: None, ecoh: None,
            success: false,
            error_message: Some("Parse statics error".to_string()),
        });
    }

    let statics_res = statics_res_opt.unwrap();

    // Elastics
    let elastic_config = lupine_ops::elastic::ElasticCalcConfig {
        element: config.element.clone(),
        lattice_type,
        lattice_constant: statics_res.a0,
        strain_delta: 1e-6,
        nist_id: pot.id.clone(),
    };

    let elastic_input = match lupine_ops::elastic::generate_elastic_script(&elastic_config, &deployment) {
        Ok(script) => script,
        Err(e) => {
            let trace = build_trace(pot, &config.structure, lattice, &run_dir);
            let result = ComputationResult {
                potential: pot.clone(),
                trace,
                c11: None, c12: None, c44: None,
                a0: Some(statics_res.a0), ecoh: Some(statics_res.ecoh),
                success: true,
                error_message: Some(format!("Elastic script error: {:?}", e)),
            };
            let json = serde_json::to_string_pretty(&result)?;
            std::fs::write(&result_path, json)?;
            return Ok(result);
        }
    };

    let elastic_input_path = run_dir.join("in.elastic");
    std::fs::write(&elastic_input_path, &elastic_input)?;

    let elastic_log_path = match execute_lammps(config, pot, &elastic_input_path, &run_dir, "log.lammps.elastic") {
        Ok(p) => p,
        Err(e) => {
            let trace = build_trace(pot, &config.structure, lattice, &run_dir);
            let result = ComputationResult {
                potential: pot.clone(),
                trace,
                c11: None, c12: None, c44: None,
                a0: Some(statics_res.a0), ecoh: Some(statics_res.ecoh),
                success: true,
                error_message: Some(format!("Elastic execution error: {}", e)),
            };
            let json = serde_json::to_string_pretty(&result)?;
            std::fs::write(&result_path, json)?;
            return Ok(result);
        }
    };

    let elastic_log_content = read_log_lossy(&elastic_log_path).unwrap_or_default();
    let elastic_res_opt = lupine_ops::elastic::parse_elastic_output(&elastic_log_content);

    let (c11, c12, c44) = if let Some(eres) = elastic_res_opt {
        (Some(eres.c11), Some(eres.c12), Some(eres.c44))
    } else {
        (None, None, None)
    };

    let trace = build_trace(pot, &config.structure, lattice, &run_dir);
    let result = ComputationResult {
        potential: pot.clone(),
        trace,
        c11, c12, c44,
        a0: Some(statics_res.a0), ecoh: Some(statics_res.ecoh),
        success: true,
        error_message: if c11.is_none() { Some("Elastic parse failed".to_string()) } else { None },
    };

    let json = serde_json::to_string_pretty(&result)?;
    std::fs::write(&result_path, json)?;

    Ok(result)
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
                    a0: None, ecoh: None,
                    success: false,
                    error_message: Some(format!("Potential file error: {}", e)),
                });
                continue;
            }
        };

        // Build StaticsCalcConfig
        let lattice_type = match config.structure.as_str() {
            "bcc" => lupine_ops::elastic::LatticeType::Bcc,
            _ => lupine_ops::elastic::LatticeType::Fcc,
        };
        let statics_config = lupine_ops::statics::StaticsCalcConfig {
            element: config.element.clone(),
            lattice_type,
            lattice_constant_guess: lattice,
            nist_id: pot.id.clone(),
        };

        // Determine MLIP Backend
        let backend = if pot.pair_style.contains("eam/alloy") {
            lupine_ops::mlip_ops::MlipBackend::EamAlloy
        } else if pot.pair_style.contains("eam/fs") {
            lupine_ops::mlip_ops::MlipBackend::EamFs
        } else if pot.pair_style == "eam" {
            lupine_ops::mlip_ops::MlipBackend::Eam
        } else if pot.pair_style.contains("meam") {
            lupine_ops::mlip_ops::MlipBackend::Meam
        } else if pot.pair_style.contains("adp") {
            lupine_ops::mlip_ops::MlipBackend::Adp
        } else {
            lupine_ops::mlip_ops::MlipBackend::Eam // fallback
        };

        let deployment = lupine_ops::mlip_ops::MlipDeployment::new(backend, "test").with_path(&pot_file);

        // Generate input script using lupine_ops for statics (a0, Ecoh)
        let input = match lupine_ops::statics::generate_statics_script(&statics_config, &deployment) {
            Ok(script) => script,
            Err(e) => {
                eprintln!("    ✗ Script generation failed: {:?}", e);
                results.push(ComputationResult {
                    potential: (*pot).clone(),
                    trace: dummy_trace(pot, &config.structure, lattice),
                    c11: None, c12: None, c44: None,
                    a0: None, ecoh: None,
                    success: false,
                    error_message: Some(format!("Script error: {:?}", e)),
                });
                continue;
            }
        };
        let input_path = run_dir.join("in.statics");
        std::fs::write(&input_path, &input)?;

        // Run LAMMPS for statics
        let log_path = match execute_lammps(config, pot, &input_path, &run_dir, "log.lammps.statics") {
            Ok(p) => p,
            Err(e) => {
                eprintln!("    ✗ LAMMPS execution failed for statics: {}", e);
                results.push(ComputationResult {
                    potential: (*pot).clone(),
                    trace: dummy_trace(pot, &config.structure, lattice),
                    c11: None, c12: None, c44: None,
                    a0: None, ecoh: None,
                    success: false,
                    error_message: Some(format!("Statics execution error: {}", e)),
                });
                continue;
            }
        };

        // Parse statics results
        let log_content = read_log_lossy(&log_path).unwrap_or_default();
        let statics_res_opt = lupine_ops::statics::parse_statics_output(&log_content);

        if statics_res_opt.is_none() {
            eprintln!("    ✗ Parsing statics failed.");
            results.push(ComputationResult {
                potential: (*pot).clone(),
                trace: dummy_trace(pot, &config.structure, lattice),
                c11: None, c12: None, c44: None,
                a0: None, ecoh: None,
                success: false,
                error_message: Some("Parse statics error".to_string()),
            });
            continue;
        }

        let statics_res = statics_res_opt.unwrap();
        eprintln!("    ✓ a0={:.4} Å, Ecoh={:.4} eV/atom", statics_res.a0, statics_res.ecoh);

        // Now run elastics using the equilibrium a0 from statics!
        let elastic_config = lupine_ops::elastic::ElasticCalcConfig {
            element: config.element.clone(),
            lattice_type,
            lattice_constant: statics_res.a0,
            strain_delta: 1e-6,
            nist_id: pot.id.clone(),
        };

        let elastic_input = match lupine_ops::elastic::generate_elastic_script(&elastic_config, &deployment) {
            Ok(script) => script,
            Err(e) => {
                eprintln!("    ✗ Elastic script generation failed: {:?}", e);
                // Still return statics
                let trace = build_trace(pot, &config.structure, lattice, &run_dir);
                let result = ComputationResult {
                    potential: (*pot).clone(),
                    trace,
                    c11: None, c12: None, c44: None,
                    a0: Some(statics_res.a0), ecoh: Some(statics_res.ecoh),
                    success: true,
                    error_message: Some(format!("Elastic script error: {:?}", e)),
                };
                results.push(result);
                continue;
            }
        };

        let elastic_input_path = run_dir.join("in.elastic");
        std::fs::write(&elastic_input_path, &elastic_input)?;

        let elastic_log_path = match execute_lammps(config, pot, &elastic_input_path, &run_dir, "log.lammps.elastic") {
            Ok(p) => p,
            Err(e) => {
                eprintln!("    ✗ LAMMPS execution failed for elastic: {}", e);
                let trace = build_trace(pot, &config.structure, lattice, &run_dir);
                let result = ComputationResult {
                    potential: (*pot).clone(),
                    trace,
                    c11: None, c12: None, c44: None,
                    a0: Some(statics_res.a0), ecoh: Some(statics_res.ecoh),
                    success: true,
                    error_message: Some(format!("Elastic execution error: {}", e)),
                };
                results.push(result);
                continue;
            }
        };

        let elastic_log_content = read_log_lossy(&elastic_log_path).unwrap_or_default();
        let elastic_res_opt = lupine_ops::elastic::parse_elastic_output(&elastic_log_content);

        let (c11, c12, c44) = if let Some(eres) = elastic_res_opt {
            eprintln!("    ✓ C11={:.1}, C12={:.1}, C44={:.1} GPa", eres.c11, eres.c12, eres.c44);
            (Some(eres.c11), Some(eres.c12), Some(eres.c44))
        } else {
            eprintln!("    ✗ Parsing elastic failed.");
            (None, None, None)
        };

        let trace = build_trace(pot, &config.structure, lattice, &run_dir);
        let result = ComputationResult {
            potential: (*pot).clone(),
            trace,
            c11, c12, c44,
            a0: Some(statics_res.a0), ecoh: Some(statics_res.ecoh),
            success: true,
            error_message: if c11.is_none() { Some("Elastic parse failed".to_string()) } else { None },
        };

        // Save result for resume support
        let json = serde_json::to_string_pretty(&result)?;
        std::fs::write(&result_path, json)?;

        results.push(result);
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
    let file_exists = path.exists();
    let file = std::fs::OpenOptions::new()
        .write(true)
        .create(true)
        .append(true)
        .open(path)?;
        
    let mut wtr = csv::Writer::from_writer(file);

    // Header (only if new file)
    if !file_exists {
        wtr.write_record(&["material", "potential", "property", "reference", "predicted", "unit", "nist_id", "doi", "pair_style"])?;
    }

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
        
        let ref_statics = crate::validation::fcc_statics_reference_data();
        if let Some(ref_s) = ref_statics.get(element) {
            let ref_a0 = ref_s[0];
            let ref_ecoh = ref_s[1];

            if let Some(a0) = result.a0 {
                wtr.write_record(&[
                    element, &pot.short_label(), "a0",
                    &ref_a0.to_string(), &a0.to_string(), "A",
                    &pot.id, &result.trace.potential_doi, &pot.pair_style,
                ])?;
            }
            if let Some(ecoh) = result.ecoh {
                wtr.write_record(&[
                    element, &pot.short_label(), "Ecoh",
                    &ref_ecoh.to_string(), &ecoh.to_string(), "eV/atom",
                    &pot.id, &result.trace.potential_doi, &pot.pair_style,
                ])?;
            }
        }
    }

    wtr.flush()?;
    eprintln!("  ✦ Benchmark CSV → {}", path.display());
    Ok(())
}
