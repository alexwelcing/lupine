//! Hypothesis 3.1 — Functional Form Fingerprints
//!
//! Claim: Each pair_style family (EAM, MEAM, Tersoff) has a distinctive
//! error *signature* in (C11, C12, C44) space. This signature can be used
//! to classify unknown potentials by their functional form.
//!
//! Test: Train a leave-one-out nearest-neighbor classifier on error vectors,
//! measure classification accuracy. If accuracy > chance (1/K for K families),
//! the fingerprint hypothesis is supported.

use anyhow::Result;
use rusqlite::Connection;
use serde::Serialize;
use crate::db::query::{self, ErrorVector};

#[derive(Debug, Clone, Serialize)]
pub struct FingerprintResult {
    /// Number of potentials analyzed
    pub n_potentials: usize,
    /// Number of pair_style families
    pub n_families: usize,
    /// Leave-one-out classification accuracy
    pub loo_accuracy: f64,
    /// Chance-level accuracy (1/K)
    pub chance_accuracy: f64,
    /// Whether the hypothesis is supported (accuracy >> chance)
    pub supported: bool,
    /// Per-family centroid distances
    pub family_centroids: Vec<FamilyCentroid>,
    /// Misclassified potentials (interesting anomalies)
    pub misclassified: Vec<Misclassification>,
}

#[derive(Debug, Clone, Serialize)]
pub struct FamilyCentroid {
    pub pair_style: String,
    pub n_members: usize,
    pub centroid: Vec<f64>,
    pub spread: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct Misclassification {
    pub potential_label: String,
    pub true_family: String,
    pub predicted_family: String,
    pub distance_to_true: f64,
    pub distance_to_predicted: f64,
}

/// The canonical elastic-constant triple used for the fingerprint hypothesis.
/// Per the dissertation (§3.1), the fingerprint lives in (C11, C12, C44) error
/// space. Pinning the axes here prevents potentials with partial property
/// coverage from being silently dropped when the global property set spans
/// a0, E_coh, defect energies, etc.
const FINGERPRINT_PROPERTIES: &[&str] = &["C11", "C12", "C44"];

/// Run the fingerprint hypothesis test.
pub fn test_fingerprint(conn: &Connection, element: Option<&str>) -> Result<FingerprintResult> {
    let vectors = query::error_vectors_for_properties(
        conn, element, None, Some(FINGERPRINT_PROPERTIES),
    )?;

    if vectors.len() < 4 {
        anyhow::bail!("Need at least 4 potentials for fingerprint analysis, got {}", vectors.len());
    }

    // Group by pair_style
    let mut families: std::collections::HashMap<String, Vec<&ErrorVector>> = std::collections::HashMap::new();
    for v in &vectors {
        families.entry(v.pair_style.clone()).or_default().push(v);
    }

    // Remove singleton families (can't classify with n=1)
    families.retain(|_, members| members.len() >= 2);

    let n_families = families.len();
    if n_families < 2 {
        anyhow::bail!("Need at least 2 pair_style families with 2+ members, got {}", n_families);
    }

    // Compute centroids
    let mut centroids: Vec<FamilyCentroid> = Vec::new();
    for (ps, members) in &families {
        let dim = members[0].errors.len();
        let mut centroid = vec![0.0; dim];
        for m in members {
            for (i, e) in m.errors.iter().enumerate() {
                centroid[i] += e;
            }
        }
        let n = members.len() as f64;
        for c in &mut centroid {
            *c /= n;
        }

        // Compute spread (avg distance to centroid)
        let spread: f64 = members.iter()
            .map(|m| euclidean_dist(&m.errors, &centroid))
            .sum::<f64>() / n;

        centroids.push(FamilyCentroid {
            pair_style: ps.clone(),
            n_members: members.len(),
            centroid,
            spread,
        });
    }

    // Leave-one-out classification
    let mut correct = 0;
    let mut total = 0;
    let mut misclassified = Vec::new();

    let classifiable: Vec<&ErrorVector> = vectors.iter()
        .filter(|v| families.contains_key(&v.pair_style))
        .collect();

    for test_vec in &classifiable {
        // Compute centroid of each family *excluding* this vector
        let mut best_family = String::new();
        let mut best_dist = f64::MAX;
        let mut true_dist = f64::MAX;

        for (ps, members) in &families {
            let excluded: Vec<&&ErrorVector> = members.iter()
                .filter(|m| m.potential_id != test_vec.potential_id)
                .collect();

            if excluded.is_empty() {
                continue;
            }

            let dim = test_vec.errors.len();
            let mut centroid = vec![0.0; dim];
            for m in &excluded {
                for (i, e) in m.errors.iter().enumerate() {
                    centroid[i] += e;
                }
            }
            let n = excluded.len() as f64;
            for c in &mut centroid {
                *c /= n;
            }

            let dist = euclidean_dist(&test_vec.errors, &centroid);

            if ps == &test_vec.pair_style {
                true_dist = dist;
            }
            if dist < best_dist {
                best_dist = dist;
                best_family = ps.clone();
            }
        }

        if best_family == test_vec.pair_style {
            correct += 1;
        } else {
            misclassified.push(Misclassification {
                potential_label: test_vec.potential_label.clone(),
                true_family: test_vec.pair_style.clone(),
                predicted_family: best_family,
                distance_to_true: true_dist,
                distance_to_predicted: best_dist,
            });
        }
        total += 1;
    }

    let loo_accuracy = if total > 0 { correct as f64 / total as f64 } else { 0.0 };
    let chance = 1.0 / n_families as f64;

    Ok(FingerprintResult {
        n_potentials: total,
        n_families,
        loo_accuracy,
        chance_accuracy: chance,
        supported: loo_accuracy > chance * 1.5, // 50% above chance
        family_centroids: centroids,
        misclassified,
    })
}

fn euclidean_dist(a: &[f64], b: &[f64]) -> f64 {
    a.iter().zip(b.iter())
        .map(|(x, y)| (x - y).powi(2))
        .sum::<f64>()
        .sqrt()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::schema;

    #[test]
    fn test_euclidean_dist() {
        assert!((euclidean_dist(&[0.0, 0.0], &[3.0, 4.0]) - 5.0).abs() < 1e-10);
    }

    #[test]
    fn test_fingerprint_needs_data() {
        let conn = Connection::open_in_memory().unwrap();
        schema::initialize(&conn).unwrap();
        let result = test_fingerprint(&conn, None);
        assert!(result.is_err()); // Not enough data
    }
}
