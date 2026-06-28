//! Real alloy potential catalog and ingestion helpers.
//!
//! This module holds non-synthetic EAM/MEAM potentials and reference elastic
//! constants for binary alloys, with a first deep-dive focus on Mg-Li.  The
//! long-term goal is to replace surrogate alloy data with traceable LAMMPS
//! runs (e.g. from the GCP Cloud Run Jobs pipeline) and feed the resulting
//! residuals into the universal correction operator.
//!
//! References:
//!   * Y.-M. Kim, I.-H. Jung, and B.-J. Lee (2012), "Atomistic modeling of
//!     pure Li and Mg-Li system", Modelling Simul. Mater. Sci. Eng. 20, 035005.
//!     DOI: 10.1088/0965-0393/20/3/035005
//!   * I. S. Winter et al., Phys. Rev. Materials 1, 033606 (2017) — bcc Li-Mg
//!     elastic constants vs composition.
//!   * A. Mahata et al., Comput. Mater. Sci. 112 (2016) 371-381 — hcp Mg-Li.
//!   * W. A. Counts et al., Acta Mater. 57 (2009) 69-76 — bcc Mg-Li design.
//!   * D. Raabe et al., Mater. Sci. Eng. A 732 (2018) 327-334 — Mg-Li phases.

use std::collections::HashMap;

use nalgebra::{DVector, Matrix3xX, Vector3, SVD};

use crate::nist::{NistArtifact, NistPotential};
use crate::runner::{ComputationResult, LammpsTrace};

/// A real interatomic potential for an alloy system, with the same metadata
/// shape as a NIST IPR potential so it slots into the existing runner types.
#[derive(Debug, Clone)]
pub struct AlloyPotential {
    pub id: String,
    pub potid: String,
    pub pair_style: String,
    pub elements: Vec<String>,
    pub dois: Vec<String>,
    pub artifacts: Vec<NistArtifact>,
    pub source_url: String,
}

impl AlloyPotential {
    /// Convert to a `NistPotential` so it can be reused by the runner types.
    pub fn to_nist(&self) -> NistPotential {
        NistPotential {
            id: self.id.clone(),
            potid: self.potid.clone(),
            pair_style: self.pair_style.clone(),
            units: "metal".to_string(),
            atom_style: "atomic".to_string(),
            status: String::new(),
            elements: self.elements.clone(),
            symbols: self.elements.clone(),
            dois: self.dois.clone(),
            url: self.source_url.clone(),
            poturl: self.source_url.clone(),
            artifacts: self.artifacts.clone(),
            file_count: self.artifacts.len(),
        }
    }
}

/// Reference elastic constants [C11, C12, C44] in GPa for alloy
/// composition/structure labels.
pub fn alloy_reference_constants() -> HashMap<String, [f64; 3]> {
    let mut m = HashMap::new();
    // Winter et al. 2017 bcc Li-Mg solid solution (composition in at.% Mg).
    m.insert("Li-bcc".to_string(), [17.9, 13.2, 11.7]);
    m.insert("0Mg-bcc".to_string(), [17.9, 13.2, 11.7]);
    m.insert("50Mg-bcc".to_string(), [39.9, 18.8, 28.6]);
    m.insert("68.75Mg-bcc".to_string(), [39.8, 25.7, 34.3]);
    m.insert("75Mg-bcc".to_string(), [38.7, 27.3, 37.8]);
    m.insert("87.5Mg-bcc".to_string(), [36.5, 31.1, 29.8]);
    m.insert("93.75Mg-bcc".to_string(), [35.0, 32.8, 29.9]);
    m.insert("100Mg-bcc".to_string(), [34.0, 36.1, 28.4]);
    m.insert("Mg-bcc".to_string(), [34.0, 36.1, 28.4]);
    // Mahata et al. 2016 hcp Mg-Li.
    m.insert("MgLi-hcp".to_string(), [55.67, 33.36, 12.89]);
    // Experimental cubic elastic constants [C11, C12, C44] in GPa for pure elements.
    // Al: Simmons & Wang (1971) polycrystal/inverse averages, rounded.
    m.insert("Al-fcc".to_string(), [106.75, 60.41, 28.34]);
    // Cu: Simmons & Wang (1971) single-crystal values, rounded.
    m.insert("Cu-fcc".to_string(), [168.4, 121.4, 75.4]);
    // Intermediate Al-Cu fcc compositions: Vegard-rule baselines used to
    // anchor the composition sweep in the rank-k transferability tests.
    // They are not DFT or experimental references.
    m.insert("25Al-fcc".to_string(), [152.9875, 106.1525, 63.635]);
    m.insert("50Al-fcc".to_string(), [137.575, 90.905, 51.87]);
    m.insert("75Al-fcc".to_string(), [122.1625, 75.6575, 40.105]);
    m
}

/// Convert a `ComputationResult` into a 3-D vector of cubic elastic constants.
pub fn cubic_elastic_vector(result: &ComputationResult) -> Option<Vector3<f64>> {
    Some(Vector3::new(result.c11?, result.c12?, result.c44?))
}

/// Residual vector = computed − reference.
pub fn residual_vector(computed: Vector3<f64>, reference: Vector3<f64>) -> Vector3<f64> {
    computed - reference
}

/// Cosine of the principal angle between two 1-D residual subspaces.
pub fn cos_principal_angle(u: &Vector3<f64>, v: &Vector3<f64>) -> f64 {
    let denom = u.norm() * v.norm();
    if denom == 0.0 {
        return 0.0;
    }
    u.dot(v).abs() / denom
}

/// Sine of the principal angle between two 1-D residual subspaces.
pub fn sin_principal_angle(u: &Vector3<f64>, v: &Vector3<f64>) -> f64 {
    let c = cos_principal_angle(u, v);
    (1.0 - c * c).sqrt().max(0.0)
}

/// Relative cross-class transfer error when the source-class correction
/// (projection onto the source residual direction) is applied to the target
/// residual.  This equals `sin θ` up to numerical round-off.
pub fn cross_class_transfer_error(
    source_residual: &Vector3<f64>,
    target_residual: &Vector3<f64>,
) -> f64 {
    if source_residual.norm() == 0.0 || target_residual.norm() == 0.0 {
        return 0.0;
    }
    let proj =
        target_residual.dot(source_residual) / source_residual.norm_squared() * source_residual;
    (target_residual - proj).norm() / target_residual.norm()
}

/// Relative cross-class transfer error when the target residual is projected
/// onto the subspace spanned by multiple source residuals.  This is the
/// rank-k generalisation of `cross_class_transfer_error` and can reduce
/// errors even when no single source is well aligned with the target.
pub fn subspace_transfer_error(sources: &[Vector3<f64>], target_residual: &Vector3<f64>) -> f64 {
    if target_residual.norm() == 0.0 {
        return 0.0;
    }
    let nonzero: Vec<Vector3<f64>> = sources.iter().filter(|u| u.norm() > 0.0).copied().collect();
    if nonzero.is_empty() {
        return 1.0;
    }
    let a = Matrix3xX::from_columns(&nonzero);
    let svd = SVD::new(a.clone(), true, true);
    let x = svd
        .solve(target_residual, 1e-12)
        .unwrap_or_else(|_| DVector::zeros(nonzero.len()));
    let proj = &a * x;
    (target_residual - proj).norm() / target_residual.norm()
}

/// Leave-one-out rank-k transfer error for a set of residuals.
/// For each target, the source subspace is built from every other residual.
pub fn leave_one_out_subspace_error(residuals: &[Vector3<f64>]) -> Vec<f64> {
    residuals
        .iter()
        .enumerate()
        .map(|(i, target)| {
            let sources: Vec<Vector3<f64>> = residuals
                .iter()
                .enumerate()
                .filter(|(j, _)| *j != i)
                .map(|(_, v)| *v)
                .collect();
            subspace_transfer_error(&sources, target)
        })
        .collect()
}

/// Transferability matrix: `(source, target) -> (relative_error, sin_bound)`.
pub type TransferMatrix = HashMap<(String, String), (f64, f64)>;

pub fn transferability_matrix(
    computed: &HashMap<String, [f64; 3]>,
    references: &HashMap<String, [f64; 3]>,
) -> TransferMatrix {
    let mut out = HashMap::new();
    for (s_label, s_ref) in references {
        let Some(s_comp) = computed.get(s_label) else {
            continue;
        };
        let u = residual_vector(
            Vector3::new(s_comp[0], s_comp[1], s_comp[2]),
            Vector3::new(s_ref[0], s_ref[1], s_ref[2]),
        );
        if u.norm() == 0.0 {
            continue;
        }
        for (t_label, t_ref) in references {
            let Some(t_comp) = computed.get(t_label) else {
                continue;
            };
            let v = residual_vector(
                Vector3::new(t_comp[0], t_comp[1], t_comp[2]),
                Vector3::new(t_ref[0], t_ref[1], t_ref[2]),
            );
            if v.norm() == 0.0 {
                continue;
            }
            let err = cross_class_transfer_error(&u, &v);
            let sin = sin_principal_angle(&u, &v);
            out.insert((s_label.clone(), t_label.clone()), (err, sin));
        }
    }
    out
}

/// Liu et al. 1999 EAM/alloy potential for the Al-Cu binary.
pub fn alcu_liu1999_potential() -> AlloyPotential {
    AlloyPotential {
        id: "1999--Liu-X-Y--Al-Cu--LAMMPS--ipr1".to_string(),
        potid: "1999--Liu-X-Y-Liu-C-L-Borucki-L-J--Al-Cu".to_string(),
        pair_style: "eam/alloy".to_string(),
        elements: vec!["Al".to_string(), "Cu".to_string()],
        dois: vec!["10.1103/PhysRevB.60.3199".to_string()],
        source_url: "https://www.ctcms.nist.gov/potentials/entry/1999--Liu-X-Y-Liu-C-L-Borucki-L-J--Al-Cu".to_string(),
        artifacts: vec![
            NistArtifact {
                url: "https://www.ctcms.nist.gov/potentials/Download/1999--Liu-X-Y-Liu-C-L-Borucki-L-J--Al-Cu/2/al-cu-set.eam.alloy".to_string(),
                filename: "al-cu-set.eam.alloy".to_string(),
                label: "EAM/alloy setfl potential".to_string(),
            },
        ],
    }
}

/// Kim et al. 2012 2NN MEAM potential for pure Li and the Mg-Li binary.
pub fn mgli_kim2012_potential() -> AlloyPotential {
    AlloyPotential {
        id: "2012--Kim-Y-M--Mg-Li--LAMMPS--ipr1".to_string(),
        potid: "2012--Kim-Y-M-Jung-I-H-Lee-B-J--Mg-Li".to_string(),
        pair_style: "meam".to_string(),
        elements: vec!["Li".to_string(), "Mg".to_string()],
        dois: vec!["10.1088/0965-0393/20/3/035005".to_string()],
        source_url: "https://www.ctcms.nist.gov/potentials/entry/2012--Kim-Y-M-Jung-I-H-Lee-B-J--Mg-Li".to_string(),
        artifacts: vec![
            NistArtifact {
                url: "https://www.ctcms.nist.gov/potentials/Download/2012--Kim-Y-M-Jung-I-H-Lee-B-J--Mg-Li/1/library.meam".to_string(),
                filename: "library.meam".to_string(),
                label: "MEAM library".to_string(),
            },
            NistArtifact {
                url: "https://www.ctcms.nist.gov/potentials/Download/2012--Kim-Y-M-Jung-I-H-Lee-B-J--Mg-Li/1/LiMg.meam".to_string(),
                filename: "LiMg.meam".to_string(),
                label: "MEAM parameter file".to_string(),
            },
        ],
    }
}

/// Parse the cubic elastic constants produced by the LAMMPS `examples/ELASTIC`
/// script.  Returns [C11, C12, C44] in GPa by reading the printed
/// `Elastic Constant CXYall = ... GPa` lines and averaging them to cubic
/// symmetry (C11, C12, C44).
pub fn parse_elastic_example_log(log_text: &str) -> Option<[f64; 3]> {
    let mut vals: HashMap<String, f64> = HashMap::new();

    for line in log_text.lines() {
        let line = line.trim();
        // Match lines like: Elastic Constant C11all = 20.36258610402 GPa
        if let Some(rest) = line.strip_prefix("Elastic Constant C") {
            let parts: Vec<&str> = rest.split_whitespace().collect();
            if parts.len() >= 4 && parts[1] == "=" && parts[3] == "GPa" {
                let key = parts[0].to_string();
                if let Ok(v) = parts[2].parse::<f64>() {
                    vals.insert(key, v);
                }
            }
        }
    }

    let c11_all = vals.get("11all")?;
    let c22_all = vals.get("22all")?;
    let c33_all = vals.get("33all")?;
    let c12_all = vals.get("12all")?;
    let c13_all = vals.get("13all")?;
    let c23_all = vals.get("23all")?;
    let c44_all = vals.get("44all")?;
    let c55_all = vals.get("55all")?;
    let c66_all = vals.get("66all")?;

    Some([
        (c11_all + c22_all + c33_all) / 3.0,
        (c12_all + c13_all + c23_all) / 3.0,
        (c44_all + c55_all + c66_all) / 3.0,
    ])
}

/// Build a `ComputationResult` from a LAMMPS elastic log, tying it to a
/// specific alloy potential/composition/structure.
pub fn computation_from_elastic_log(
    potential: &AlloyPotential,
    composition: &str,
    structure: &str,
    log_text: &str,
    input_hash: &str,
) -> Option<ComputationResult> {
    let [c11, c12, c44] = parse_elastic_example_log(log_text)?;
    let nist = potential.to_nist();
    let trace = LammpsTrace {
        run_id: format!("{}-{}-{}", potential.potid, composition, structure),
        nist_potential_id: nist.id.clone(),
        potential_doi: nist.dois.first().cloned().unwrap_or_default(),
        pair_style: nist.pair_style.clone(),
        lammps_version: extract_lammps_version(log_text).unwrap_or_default(),
        input_script_hash: input_hash.to_string(),
        potential_file_hash: String::new(), // could be SHA-256 of library.meam + LiMg.meam
        output_log_hash: String::new(),     // could be SHA-256 of log_text
        crystal_structure: structure.to_string(),
        lattice_constant: 0.0,
        temperature: 0.0,
        properties: vec!["c11".to_string(), "c12".to_string(), "c44".to_string()],
    };

    Some(ComputationResult {
        potential: nist,
        trace,
        c11: Some(c11),
        c12: Some(c12),
        c44: Some(c44),
        a0: None,
        ecoh: None,
        success: true,
        error_message: None,
    })
}

fn extract_lammps_version(log_text: &str) -> Option<String> {
    for line in log_text.lines() {
        if line.contains("LAMMPS (") {
            let start = line.find("(")?;
            let end = line.find(")")?;
            return Some(line[start + 1..end].to_string());
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_reference_data_includes_mgli() {
        let refs = alloy_reference_constants();
        assert!(refs.contains_key("50Mg-bcc"));
        assert!(refs.contains_key("MgLi-hcp"));
    }

    #[test]
    fn test_mgli_potential_has_two_artifacts() {
        let pot = mgli_kim2012_potential();
        assert_eq!(pot.elements, vec!["Li", "Mg"]);
        assert_eq!(pot.artifacts.len(), 2);
        assert!(pot.to_nist().id.contains("Kim"));
    }

    #[test]
    fn test_alcu_potential_has_one_artifact() {
        let pot = alcu_liu1999_potential();
        assert_eq!(pot.elements, vec!["Al", "Cu"]);
        assert_eq!(pot.artifacts.len(), 1);
        assert_eq!(pot.pair_style, "eam/alloy");
        assert!(pot.to_nist().id.contains("Liu"));
    }

    #[test]
    fn test_parse_fixture_log() {
        let log = include_str!("../tests/fixtures/mgli_kim2012_bcc_50mg.txt");
        let [c11, c12, c44] = parse_elastic_example_log(log).expect("fixture log should parse");
        assert!(
            c11 > 0.0 && c12 > 0.0 && c44 > 0.0,
            "elastic constants must be positive"
        );
        // Cubic averages from the actual run (loose bounds to avoid brittle tests).
        assert!(
            (c11 - 28.85).abs() < 2.0,
            "C11 cubic average unexpected: {c11}"
        );
        assert!(
            (c12 - 15.29).abs() < 2.0,
            "C12 cubic average unexpected: {c12}"
        );
        assert!(
            (c44 - 24.01).abs() < 2.0,
            "C44 cubic average unexpected: {c44}"
        );
    }

    #[test]
    fn test_computation_from_fixture_log() {
        let log = include_str!("../tests/fixtures/mgli_kim2012_bcc_50mg.txt");
        let pot = mgli_kim2012_potential();
        let result = computation_from_elastic_log(&pot, "50Mg", "bcc", log, "fixture")
            .expect("fixture should produce a computation result");
        assert!(result.success);
        assert!(result.c11.unwrap() > 0.0);
        assert!(result.c12.unwrap() > 0.0);
        assert!(result.c44.unwrap() > 0.0);
        assert_eq!(result.trace.crystal_structure, "bcc");
        assert!(!result.trace.lammps_version.is_empty());
    }

    #[test]
    fn test_alcu_cloud_logs_parse_and_positive() {
        let names_and_logs = [
            (
                "Al",
                include_str!("../tests/fixtures/alcu_cloud/alcu_liu1999_fcc_Al.txt"),
            ),
            (
                "Cu",
                include_str!("../tests/fixtures/alcu_cloud/alcu_liu1999_fcc_Cu.txt"),
            ),
            (
                "25Al",
                include_str!("../tests/fixtures/alcu_cloud/alcu_liu1999_fcc_25Al.txt"),
            ),
            (
                "50Al",
                include_str!("../tests/fixtures/alcu_cloud/alcu_liu1999_fcc_50Al.txt"),
            ),
            (
                "75Al",
                include_str!("../tests/fixtures/alcu_cloud/alcu_liu1999_fcc_75Al.txt"),
            ),
        ];

        let pot = alcu_liu1999_potential();
        for (name, log) in names_and_logs {
            let [c11, c12, c44] = parse_elastic_example_log(log)
                .unwrap_or_else(|| panic!("{name} cloud log should parse"));
            assert!(
                c11 > 0.0 && c12 > 0.0 && c44 > 0.0,
                "{name} constants must be positive"
            );
            let result = computation_from_elastic_log(&pot, name, "fcc", log, "cloud")
                .unwrap_or_else(|| panic!("{name} cloud log should produce a result"));
            assert_eq!(result.trace.crystal_structure, "fcc");
            assert!(!result.trace.lammps_version.is_empty());
        }
    }

    #[test]
    fn test_transferability_matrix_satisfies_bound() {
        let refs = alloy_reference_constants();
        let mut computed: HashMap<String, [f64; 3]> = HashMap::new();

        let log50 = include_str!("../tests/fixtures/mgli_kim2012_bcc_50mg.txt");
        let [c11_50, c12_50, c44_50] =
            parse_elastic_example_log(log50).expect("50Mg fixture should parse");
        computed.insert("50Mg-bcc".to_string(), [c11_50, c12_50, c44_50]);

        let log75 = include_str!("../tests/fixtures/mgli_cloud/mgli_kim2012_bcc_75mg.txt");
        let [c11_75, c12_75, c44_75] =
            parse_elastic_example_log(log75).expect("75Mg fixture should parse");
        computed.insert("75Mg-bcc".to_string(), [c11_75, c12_75, c44_75]);

        let log100 = include_str!("../tests/fixtures/mgli_cloud/mgli_kim2012_bcc_100mg.txt");
        let [c11_100, c12_100, c44_100] =
            parse_elastic_example_log(log100).expect("100Mg fixture should parse");
        computed.insert("100Mg-bcc".to_string(), [c11_100, c12_100, c44_100]);

        let matrix = transferability_matrix(&computed, &refs);
        assert!(!matrix.is_empty(), "matrix should not be empty");

        for ((source, target), (err, bound)) in &matrix {
            assert!(
                *err <= *bound + 1e-9,
                "transfer error {err} exceeds principal-angle bound {bound} for {source}->{target}"
            );
        }
    }

    #[test]
    fn test_alcu_transferability_matrix_satisfies_bound() {
        let refs = alloy_reference_constants();
        let mut computed: HashMap<String, [f64; 3]> = HashMap::new();

        let log_al = include_str!("../tests/fixtures/alcu_cloud/alcu_liu1999_fcc_Al.txt");
        let [c11_al, c12_al, c44_al] =
            parse_elastic_example_log(log_al).expect("Al cloud log should parse");
        computed.insert("Al-fcc".to_string(), [c11_al, c12_al, c44_al]);

        let log_cu = include_str!("../tests/fixtures/alcu_cloud/alcu_liu1999_fcc_Cu.txt");
        let [c11_cu, c12_cu, c44_cu] =
            parse_elastic_example_log(log_cu).expect("Cu cloud log should parse");
        computed.insert("Cu-fcc".to_string(), [c11_cu, c12_cu, c44_cu]);

        let matrix = transferability_matrix(&computed, &refs);
        assert!(
            !matrix.is_empty(),
            "Al-Cu transferability matrix should not be empty"
        );

        for ((source, target), (err, bound)) in &matrix {
            assert!(
                *err <= *bound + 1e-9,
                "transfer error {err} exceeds principal-angle bound {bound} for {source}->{target}"
            );
        }
    }

    #[test]
    fn test_mgli_loocv_subspace_beat_single_source() {
        let refs = alloy_reference_constants();
        let mut computed: HashMap<String, [f64; 3]> = HashMap::new();

        let log50 = include_str!("../tests/fixtures/mgli_kim2012_bcc_50mg.txt");
        let [c11_50, c12_50, c44_50] = parse_elastic_example_log(log50).unwrap();
        computed.insert("50Mg-bcc".to_string(), [c11_50, c12_50, c44_50]);

        let log75 = include_str!("../tests/fixtures/mgli_cloud/mgli_kim2012_bcc_75mg.txt");
        let [c11_75, c12_75, c44_75] = parse_elastic_example_log(log75).unwrap();
        computed.insert("75Mg-bcc".to_string(), [c11_75, c12_75, c44_75]);

        let log100 = include_str!("../tests/fixtures/mgli_cloud/mgli_kim2012_bcc_100mg.txt");
        let [c11_100, c12_100, c44_100] = parse_elastic_example_log(log100).unwrap();
        computed.insert("100Mg-bcc".to_string(), [c11_100, c12_100, c44_100]);

        let labels = vec!["50Mg-bcc", "75Mg-bcc", "100Mg-bcc"];
        let residuals: Vec<Vector3<f64>> = labels
            .iter()
            .map(|lab| {
                let c = computed.get(*lab).unwrap();
                let r = refs.get(*lab).unwrap();
                residual_vector(
                    Vector3::new(c[0], c[1], c[2]),
                    Vector3::new(r[0], r[1], r[2]),
                )
            })
            .collect();

        let loocv = leave_one_out_subspace_error(&residuals);
        let avg_loocv: f64 = loocv.iter().sum::<f64>() / loocv.len() as f64;

        // Average single-source off-diagonal transfer error for comparison.
        let mut single_errs = Vec::new();
        for (i, u) in residuals.iter().enumerate() {
            for (j, v) in residuals.iter().enumerate() {
                if i != j {
                    single_errs.push(cross_class_transfer_error(u, v));
                }
            }
        }
        let avg_single: f64 = single_errs.iter().sum::<f64>() / single_errs.len() as f64;

        assert!(
            avg_loocv < avg_single,
            "rank-k LOOCV error {avg_loocv} should beat single-source average {avg_single}"
        );
    }

    #[test]
    fn test_alcu_intermediate_loocv_subspace_reduction() {
        let refs = alloy_reference_constants();
        let mut computed: HashMap<String, [f64; 3]> = HashMap::new();

        let inputs: Vec<(&str, &str)> = vec![
            (
                "Al-fcc",
                include_str!("../tests/fixtures/alcu_cloud/alcu_liu1999_fcc_Al.txt"),
            ),
            (
                "Cu-fcc",
                include_str!("../tests/fixtures/alcu_cloud/alcu_liu1999_fcc_Cu.txt"),
            ),
            (
                "25Al-fcc",
                include_str!("../tests/fixtures/alcu_cloud/alcu_liu1999_fcc_25Al.txt"),
            ),
            (
                "50Al-fcc",
                include_str!("../tests/fixtures/alcu_cloud/alcu_liu1999_fcc_50Al.txt"),
            ),
            (
                "75Al-fcc",
                include_str!("../tests/fixtures/alcu_cloud/alcu_liu1999_fcc_75Al.txt"),
            ),
        ];
        for (lab, log) in &inputs {
            let [c11, c12, c44] = parse_elastic_example_log(log).unwrap();
            computed.insert(lab.to_string(), [c11, c12, c44]);
        }

        let labels: Vec<String> = inputs.iter().map(|(lab, _)| lab.to_string()).collect();
        let residuals: Vec<Vector3<f64>> = labels
            .iter()
            .map(|lab| {
                let c = computed.get(lab).unwrap();
                let r = refs.get(lab).unwrap();
                residual_vector(
                    Vector3::new(c[0], c[1], c[2]),
                    Vector3::new(r[0], r[1], r[2]),
                )
            })
            .collect();

        let loocv = leave_one_out_subspace_error(&residuals);
        for (i, err) in loocv.iter().enumerate() {
            assert!(
                *err < 1e-6,
                "LOOCV relative error for {} is {err}, expected numerical zero",
                labels[i]
            );
        }

        // Explicitly check the Al and Cu weak points are now eliminated.
        assert!(loocv[0] < 1e-6, "Al LOOCV error should be numerical zero");
        assert!(loocv[1] < 1e-6, "Cu LOOCV error should be numerical zero");
    }
}
