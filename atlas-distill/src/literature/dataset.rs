//! Build fittable datasets from extracted values and seed relationships.

use crate::literature::extract::ExtractedValue;
use crate::literature::seeds::SeedRelationship;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// A dataset assembled from literature values for fitting.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dataset {
    pub name: String,
    pub x_label: String,
    pub y_label: String,
    pub points: Vec<(f64, f64)>,
    pub sources: Vec<String>,
    pub domain: String,
    pub suggested_model: String,
}

/// Group extracted values by quantity, build datasets for fitting.
///
/// Strategy: for each quantity type, find associated condition values
/// (e.g., temperature) and create (condition, value) pairs.
pub fn build_datasets(values: &[ExtractedValue]) -> Vec<Dataset> {
    let mut datasets = Vec::new();

    // Group by quantity
    let mut by_quantity: HashMap<String, Vec<&ExtractedValue>> = HashMap::new();
    for val in values {
        by_quantity
            .entry(val.quantity.clone())
            .or_default()
            .push(val);
    }

    // For each quantity, try to pair with temperature or other conditions
    for (quantity, vals) in &by_quantity {
        // If values have temperature conditions, build quantity(T) dataset
        let with_temp: Vec<_> = vals
            .iter()
            .filter_map(|v| {
                v.conditions
                    .get("temperature_K")
                    .map(|&t| (t, v.value, v.paper_id.clone()))
            })
            .collect();

        if with_temp.len() >= 3 {
            datasets.push(Dataset {
                name: format!("{}_vs_temperature", quantity),
                x_label: "temperature_K".to_string(),
                y_label: quantity.clone(),
                points: with_temp.iter().map(|(t, v, _)| (*t, *v)).collect(),
                sources: with_temp.iter().map(|(_, _, id)| id.clone()).collect(),
                domain: domain_for_quantity(quantity),
                suggested_model: suggest_model(quantity, "temperature"),
            });
        }

        // If values have pressure conditions, build quantity(P) dataset
        let with_pressure: Vec<_> = vals
            .iter()
            .filter_map(|v| {
                v.conditions
                    .get("pressure_GPa")
                    .map(|&p| (p, v.value, v.paper_id.clone()))
            })
            .collect();

        if with_pressure.len() >= 3 {
            datasets.push(Dataset {
                name: format!("{}_vs_pressure", quantity),
                x_label: "pressure_GPa".to_string(),
                y_label: quantity.clone(),
                points: with_pressure.iter().map(|(p, v, _)| (*p, *v)).collect(),
                sources: with_pressure.iter().map(|(_, _, id)| id.clone()).collect(),
                domain: domain_for_quantity(quantity),
                suggested_model: suggest_model(quantity, "pressure"),
            });
        }

        // Create a dataset of all values for this quantity across papers
        // (indexed by paper number for cross-study comparison)
        if vals.len() >= 3 {
            let points: Vec<(f64, f64)> = vals
                .iter()
                .enumerate()
                .map(|(i, v)| (i as f64, v.value))
                .collect();
            let sources: Vec<String> = vals.iter().map(|v| v.paper_id.clone()).collect();

            datasets.push(Dataset {
                name: format!("{}_across_papers", quantity),
                x_label: "paper_index".to_string(),
                y_label: quantity.clone(),
                points,
                sources,
                domain: domain_for_quantity(quantity),
                suggested_model: "linear".to_string(), // check for trends
            });
        }
    }

    // Also check for cross-quantity correlations
    // e.g., system_size vs speedup, temperature vs diffusion, etc.
    if let (Some(sizes), Some(speedups)) =
        (by_quantity.get("system_size"), by_quantity.get("speedup"))
    {
        // Match papers
        let mut points = Vec::new();
        let mut sources = Vec::new();
        for size_val in sizes {
            for speed_val in speedups.iter() {
                if size_val.paper_id == speed_val.paper_id {
                    points.push((size_val.value, speed_val.value));
                    sources.push(size_val.paper_id.clone());
                }
            }
        }
        if points.len() >= 3 {
            datasets.push(Dataset {
                name: "system_size_vs_speedup".to_string(),
                x_label: "system_size_atoms".to_string(),
                y_label: "speedup_x".to_string(),
                points,
                sources,
                domain: "Performance".to_string(),
                suggested_model: "power_law".to_string(),
            });
        }
    }

    datasets
}

/// Build datasets from seed relationships (for verification).
pub fn datasets_from_seeds(seeds: &[SeedRelationship]) -> Vec<Dataset> {
    seeds
        .iter()
        .filter(|s| !s.data.is_empty())
        .map(|s| Dataset {
            name: s.name.replace(' ', "_").to_lowercase(),
            x_label: "x".to_string(),
            y_label: "y".to_string(),
            points: s.data.clone(),
            sources: vec![s.reference.clone()],
            domain: s.domain.clone(),
            suggested_model: s.testable_as.clone(),
        })
        .collect()
}

/// Print dataset summary.
pub fn print_datasets(datasets: &[Dataset]) {
    eprintln!("\n  ╔════════════════════════════════════════════════════════════╗");
    eprintln!(
        "  ║  Assembled Datasets ({})                          ",
        datasets.len()
    );
    eprintln!("  ╠════════════════════════════════════════════════════════════╣");

    for ds in datasets {
        eprintln!("  ║  {} ", ds.name);
        eprintln!(
            "  ║    {} vs {} | {} points | {} sources",
            ds.x_label,
            ds.y_label,
            ds.points.len(),
            ds.sources.len()
        );
        eprintln!(
            "  ║    Domain: {} | Suggested: {}",
            ds.domain, ds.suggested_model
        );
    }

    eprintln!("  ╚════════════════════════════════════════════════════════════╝");
}

fn domain_for_quantity(quantity: &str) -> String {
    match quantity {
        "diffusion_coefficient" | "viscosity" | "thermal_conductivity" => "Transport".to_string(),
        "activation_energy" => "Thermodynamics".to_string(),
        "youngs_modulus" | "bulk_modulus" | "shear_modulus" => "Mechanical".to_string(),
        "scaling_exponent" => "General".to_string(),
        "system_size" | "speedup" => "Performance".to_string(),
        "lattice_constant" | "melting_point" => "Structural".to_string(),
        _ => "General".to_string(),
    }
}

fn suggest_model(quantity: &str, condition: &str) -> String {
    match (quantity, condition) {
        ("diffusion_coefficient", "temperature") => "arrhenius".to_string(),
        ("viscosity", "temperature") => "arrhenius".to_string(),
        ("youngs_modulus", "temperature") => "linear".to_string(),
        ("thermal_conductivity", "temperature") => "power_law".to_string(),
        _ => "symbolic".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::literature::seeds;

    #[test]
    fn test_datasets_from_seeds() {
        let all = seeds::all_seeds();
        let datasets = datasets_from_seeds(&all);
        assert!(!datasets.is_empty());
        // All seed datasets should have points
        for ds in &datasets {
            assert!(!ds.points.is_empty());
        }
    }

    #[test]
    fn test_build_empty() {
        let datasets = build_datasets(&[]);
        assert!(datasets.is_empty());
    }
}
