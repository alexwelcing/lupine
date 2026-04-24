//! NIST potential file resolver.
//!
//! Maps NIST catalog entries to actual parameter file paths on disk
//! from the local NIST IPR mirror (`atlas/nist_ipr/files/`).
//!
//! The mirror layout is:
//! ```text
//! atlas/nist_ipr/files/
//! └── meam/
//!     └── 2012--Kim-Y-M--Ni-Al--LAMMPS--ipr1/
//!         ├── metadata.json
//!         ├── library.meam
//!         └── NiAl.meam
//! └── eam_alloy/
//!     └── 1999--Mishin-Y--Al--LAMMPS--ipr1/
//!         ├── metadata.json
//!         └── Al99.eam.alloy
//! ```

use crate::mlip_ops::{MlipBackend, MlipDeployment};
use serde::Deserialize;
use std::path::{Path, PathBuf};

/// A resolved NIST potential ready for LAMMPS deployment.
#[derive(Debug, Clone)]
pub struct ResolvedPotential {
    pub nist_id: String,
    pub pair_style: String,
    pub elements: Vec<String>,
    pub deployment: MlipDeployment,
    /// All parameter files on disk
    pub file_paths: Vec<PathBuf>,
}

/// Metadata stored alongside each potential's files.
#[derive(Debug, Deserialize)]
struct PotentialMetadata {
    #[serde(default)]
    files: Vec<FileEntry>,
}

#[derive(Debug, Deserialize)]
struct FileEntry {
    filename: String,
    #[serde(default)]
    url: String,
}

/// Map a NIST pair_style string to the directory name used in the mirror.
///
/// NIST pair_styles use `/` (e.g. "eam/alloy") but filesystem dirs use `_`.
fn pair_style_to_dir(pair_style: &str) -> String {
    pair_style.replace('/', "_")
}

/// Map a NIST pair_style to the corresponding `MlipBackend`.
fn pair_style_to_backend(pair_style: &str) -> Option<MlipBackend> {
    match pair_style {
        "eam/alloy" => Some(MlipBackend::EamAlloy),
        "eam/fs" => Some(MlipBackend::EamAlloy), // Same LAMMPS interface
        "eam" => Some(MlipBackend::EamAlloy),    // Single-file EAM
        "meam" => Some(MlipBackend::Meam),
        "meam/spline" => Some(MlipBackend::Meam),
        // These pair_styles exist in the mirror but need custom handling:
        // "tersoff", "sw", "adp", "bop", etc.
        // For now, we support the two families that cover ~77% of the catalog.
        _ => None,
    }
}

/// Resolve a NIST potential to a deployable `MlipDeployment`.
///
/// Given the mirror base directory and a potential's metadata, finds
/// the parameter files on disk and constructs the appropriate deployment.
///
/// # Arguments
/// * `mirror_base` - Path to `atlas/nist_ipr/files/`
/// * `nist_id` - Full implementation ID, e.g. "1999--Mishin-Y--Al--LAMMPS--ipr1"
/// * `pair_style` - LAMMPS pair_style, e.g. "eam/alloy"
/// * `elements` - Elements this potential covers
pub fn resolve_potential(
    mirror_base: &Path,
    nist_id: &str,
    pair_style: &str,
    elements: &[String],
) -> Option<ResolvedPotential> {
    let backend = pair_style_to_backend(pair_style)?;
    let style_dir = pair_style_to_dir(pair_style);
    let pot_dir = mirror_base.join(&style_dir).join(nist_id);

    if !pot_dir.exists() {
        return None;
    }

    // Find parameter files (everything except metadata.json)
    let mut param_files: Vec<PathBuf> = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&pot_dir) {
        for entry in entries.flatten() {
            let fname = entry.file_name().to_string_lossy().to_string();
            if fname != "metadata.json" {
                param_files.push(entry.path());
            }
        }
    }

    if param_files.is_empty() {
        return None;
    }

    // Sort for deterministic ordering
    param_files.sort();

    // Build the deployment based on backend type
    let deployment = match backend {
        MlipBackend::EamAlloy => {
            // EAM/alloy, EAM/fs, EAM: single parameter file
            let primary = param_files.first()?;
            MlipDeployment::new(MlipBackend::EamAlloy, nist_id).with_path(primary.to_string_lossy())
        }
        MlipBackend::Meam => {
            // MEAM requires two files: library.meam and a parameter file.
            // Convention: the file named "library.meam" is the auxiliary,
            // the other .meam file is the primary parameter file.
            let library_file = param_files.iter().find(|p| {
                p.file_name()
                    .map(|f| f.to_string_lossy().contains("library"))
                    .unwrap_or(false)
            });
            let param_file = param_files.iter().find(|p| {
                let fname = p
                    .file_name()
                    .map(|f| f.to_string_lossy().to_string())
                    .unwrap_or_default();
                fname.ends_with(".meam") && !fname.contains("library")
            });

            match (library_file, param_file) {
                (Some(lib), Some(param)) => MlipDeployment::new(MlipBackend::Meam, nist_id)
                    .with_path(param.to_string_lossy())
                    .with_auxiliary_path(lib.to_string_lossy()),
                _ => {
                    // Some MEAM potentials have non-standard naming.
                    // Fall back to first two .meam files.
                    let meam_files: Vec<&PathBuf> = param_files
                        .iter()
                        .filter(|p| p.extension().map(|e| e == "meam").unwrap_or(false))
                        .collect();
                    if meam_files.len() >= 2 {
                        MlipDeployment::new(MlipBackend::Meam, nist_id)
                            .with_path(meam_files[1].to_string_lossy())
                            .with_auxiliary_path(meam_files[0].to_string_lossy())
                    } else {
                        return None;
                    }
                }
            }
        }
        _ => return None,
    };

    Some(ResolvedPotential {
        nist_id: nist_id.to_string(),
        pair_style: pair_style.to_string(),
        elements: elements.to_vec(),
        deployment,
        file_paths: param_files,
    })
}

/// Scan the mirror directory and resolve all potentials for a given element.
///
/// Returns only potentials that:
/// 1. Have parameter files on disk
/// 2. Use a supported pair_style (EAM/MEAM families)
/// 3. Can be mapped to a valid `MlipDeployment`
pub fn resolve_all_for_element(
    mirror_base: &Path,
    index_entries: &[(String, String, Vec<String>)], // (nist_id, pair_style, elements)
    element: &str,
) -> Vec<ResolvedPotential> {
    index_entries
        .iter()
        .filter(|(_, _, elements)| elements.iter().any(|e| e == element))
        .filter_map(|(nist_id, pair_style, elements)| {
            resolve_potential(mirror_base, nist_id, pair_style, elements)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pair_style_to_dir() {
        assert_eq!(pair_style_to_dir("eam/alloy"), "eam_alloy");
        assert_eq!(pair_style_to_dir("meam"), "meam");
        assert_eq!(pair_style_to_dir("eam/fs"), "eam_fs");
        assert_eq!(pair_style_to_dir("hybrid/overlay"), "hybrid_overlay");
    }

    #[test]
    fn test_backend_mapping() {
        assert_eq!(
            pair_style_to_backend("eam/alloy"),
            Some(MlipBackend::EamAlloy)
        );
        assert_eq!(pair_style_to_backend("meam"), Some(MlipBackend::Meam));
        assert_eq!(pair_style_to_backend("tersoff"), None);
        assert_eq!(pair_style_to_backend("sw"), None);
    }
}
