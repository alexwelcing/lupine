//! Molecular-feature adapter for complex systems (MOFs, zeolites, etc.).
//!
//! Converts an atomic structure into a finite-dimensional `DVector<f64>` that
//! can be fed directly into `UniversalFeedbackLoop`.  This is the bridge between
//! chemistry and the universal operator: any inner-product feature space works,
//! so the operator does not need to know that the features came from a molecule.

use nalgebra::DVector;
use std::collections::HashMap;

/// A single atom.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Atom {
    pub element: &'static str,
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl Atom {
    pub fn new(element: &'static str, x: f64, y: f64, z: f64) -> Self {
        Self { element, x, y, z }
    }

    pub fn position(&self) -> [f64; 3] {
        [self.x, self.y, self.z]
    }

    pub fn distance_sq(&self, other: &Atom, cell: &UnitCell) -> f64 {
        let mut dx = self.x - other.x;
        let mut dy = self.y - other.y;
        let mut dz = self.z - other.z;
        dx -= cell.lx * (dx / cell.lx).round();
        dy -= cell.ly * (dy / cell.ly).round();
        dz -= cell.lz * (dz / cell.lz).round();
        dx * dx + dy * dy + dz * dz
    }
}

/// Orthorhombic unit cell.
#[derive(Debug, Clone, Copy)]
pub struct UnitCell {
    pub lx: f64,
    pub ly: f64,
    pub lz: f64,
}

impl UnitCell {
    pub fn cubic(side: f64) -> Self {
        Self {
            lx: side,
            ly: side,
            lz: side,
        }
    }
}

/// A molecular structure.
#[derive(Debug, Clone)]
pub struct MolecularStructure {
    pub atoms: Vec<Atom>,
    pub cell: UnitCell,
}

impl MolecularStructure {
    pub fn new(atoms: Vec<Atom>, cell: UnitCell) -> Self {
        Self { atoms, cell }
    }
}

/// Feature extractor for molecular structures.
#[derive(Debug, Clone)]
pub struct MofFeatureExtractor {
    /// Ordered list of elements to one-hot encode.
    pub elements: Vec<&'static str>,
    /// Number of radial bins.
    pub n_radial_bins: usize,
    /// Maximum radial distance (Å).
    pub r_max: f64,
}

impl MofFeatureExtractor {
    /// Total feature dimension.
    pub fn output_dim(&self) -> usize {
        self.elements.len() + self.n_radial_bins
    }

    /// Convert a structure to a feature vector.
    ///
    /// Features:
    ///   - composition vector (fraction of each element type)
    ///   - radial distribution histogram (unnormalized counts per bin)
    pub fn featurize(&self, structure: &MolecularStructure) -> DVector<f64> {
        let mut features = vec![0.0; self.output_dim()];
        let n = structure.atoms.len() as f64;

        // Composition.
        let mut counts: HashMap<&str, usize> = HashMap::new();
        for atom in &structure.atoms {
            *counts.entry(atom.element).or_default() += 1;
        }
        for (i, el) in self.elements.iter().enumerate() {
            let c = counts.get(el).copied().unwrap_or(0) as f64;
            features[i] = c / n;
        }

        // Radial histogram.
        let dr = self.r_max / self.n_radial_bins as f64;
        for i in 0..structure.atoms.len() {
            for j in (i + 1)..structure.atoms.len() {
                let r = structure.atoms[i]
                    .distance_sq(&structure.atoms[j], &structure.cell)
                    .sqrt();
                if r < self.r_max {
                    let bin = (r / dr) as usize;
                    if bin < self.n_radial_bins {
                        features[self.elements.len() + bin] += 2.0;
                    }
                }
            }
        }

        DVector::from_vec(features)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::universal_feedback::{DirectionPolicy, TrainingRow, UniversalFeedbackLoop};
    use rand::Rng;

    fn random_mof(rng: &mut rand::rngs::ThreadRng, n_atoms: usize) -> MolecularStructure {
        let elements: Vec<&'static str> = vec!["C", "O", "Zn", "N", "H"];
        let side = 20.0;
        let atoms: Vec<Atom> = (0..n_atoms)
            .map(|_| {
                let el = elements[rng.gen_range(0..elements.len())];
                Atom::new(
                    el,
                    rng.gen_range(0.0..side),
                    rng.gen_range(0.0..side),
                    rng.gen_range(0.0..side),
                )
            })
            .collect();
        MolecularStructure::new(atoms, UnitCell::cubic(side))
    }

    /// Synthetic MOF benchmark.
    ///
    /// The "true" target property is the feature vector plus a low-rank
    /// correction that depends on the metal node class.  The universal operator
    /// learns the class-specific correction and drives test outliers to 0.
    #[test]
    fn test_mof_adapter_zero_outliers() {
        let mut rng = rand::thread_rng();
        let extractor = MofFeatureExtractor {
            elements: vec!["C", "O", "Zn", "N", "H"],
            n_radial_bins: 15,
            r_max: 10.0,
        };
        let dim = extractor.output_dim();

        // Two MOF classes: Zn-based and Cu-based metal nodes.
        let classes = vec!["Zn-MOF", "Cu-MOF"];
        let mut train_rows: Vec<TrainingRow> = Vec::new();
        let mut test_rows: Vec<TrainingRow> = Vec::new();

        for class in &classes {
            // Class-specific error directions.
            let mut d1 = DVector::zeros(dim);
            let mut d2 = DVector::zeros(dim);
            d1[0] = 1.0; // composition direction
            d1[dim - 1] = 0.5;
            d2[2] = 1.0; // Zn channel

            for _ in 0..80 {
                let structure = random_mof(&mut rng, 30);
                let raw = extractor.featurize(&structure);
                let a1 = rng.gen_range(0.5..1.5);
                let a2 = rng.gen_range(-0.3..0.3);
                let noise = DVector::from_fn(dim, |_i, _| rng.gen_range(-1e-3..1e-3));
                let target = &raw + a1 * &d1 + a2 * &d2 + &noise;
                train_rows.push(TrainingRow {
                    class: class.to_string(),
                    raw,
                    shift: DVector::zeros(dim),
                    target,
                });
            }

            for _ in 0..40 {
                let structure = random_mof(&mut rng, 30);
                let raw = extractor.featurize(&structure);
                let a1 = rng.gen_range(0.5..1.5);
                let a2 = rng.gen_range(-0.3..0.3);
                let noise = DVector::from_fn(dim, |_i, _| rng.gen_range(-1e-3..1e-3));
                let target = &raw + a1 * &d1 + a2 * &d2 + &noise;
                test_rows.push(TrainingRow {
                    class: class.to_string(),
                    raw,
                    shift: DVector::zeros(dim),
                    target,
                });
            }
        }

        let operator =
            UniversalFeedbackLoop::fit(&train_rows, DirectionPolicy::LearnedPca { rank: 2 });

        let mut outliers = 0;
        let mut max_residual: f64 = 0.0;
        for row in &test_rows {
            let r = operator.residual_norm(&row.class, &row.raw, &row.shift, &row.target);
            max_residual = max_residual.max(r);
            if r > 0.05 {
                outliers += 1;
            }
        }

        assert_eq!(
            outliers,
            0,
            "expected 0/{} MOF outliers, got {}. max residual = {}",
            test_rows.len(),
            outliers,
            max_residual
        );
    }

    #[test]
    fn test_mof_feature_dim() {
        let extractor = MofFeatureExtractor {
            elements: vec!["C", "O", "Zn"],
            n_radial_bins: 10,
            r_max: 5.0,
        };
        let structure = MolecularStructure::new(
            vec![
                Atom::new("C", 0.0, 0.0, 0.0),
                Atom::new("O", 1.0, 0.0, 0.0),
                Atom::new("Zn", 2.0, 0.0, 0.0),
            ],
            UnitCell::cubic(10.0),
        );
        let features = extractor.featurize(&structure);
        assert_eq!(features.len(), 13);
        assert!((features[0] - 1.0 / 3.0).abs() < 1e-12); // C fraction
        assert!((features[1] - 1.0 / 3.0).abs() < 1e-12); // O fraction
        assert!((features[2] - 1.0 / 3.0).abs() < 1e-12); // Zn fraction
    }
}
