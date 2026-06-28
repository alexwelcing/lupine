//! Optimize a material property surrogate from an MLIP evaluation manifest.
//!
//! This command is the first Rust-only optimization layer.  It reads a JSON
//! manifest of evaluated configurations (composition / lattice parameter /
//! elastic constants), fits a low-order polynomial surrogate, and returns the
//! optimum configuration together with an uncertainty-aware recommendation.

use std::fs;
use std::path::PathBuf;

use anyhow::{bail, Context, Result};
use clap::{Args, ValueEnum};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Args)]
pub struct MlipOptimizeArgs {
    /// JSON manifest emitted by the orchestrator (or any file with the same schema).
    #[arg(long)]
    pub manifest: PathBuf,
    /// Property to optimize.
    #[arg(long, value_enum)]
    pub property: OptimizeProperty,
    /// Optimization mode.
    #[arg(long, value_enum, default_value_t = ObjectiveMode::Maximize)]
    pub mode: ObjectiveMode,
    /// Target value when --mode=match.
    #[arg(long)]
    pub target: Option<f64>,
    /// Lower bound on the design variable (default: min observed composition).
    #[arg(long)]
    pub lower: Option<f64>,
    /// Upper bound on the design variable (default: max observed composition).
    #[arg(long)]
    pub upper: Option<f64>,
    /// Polynomial degree of the surrogate (1 or 2).
    #[arg(long, default_value_t = 2)]
    pub degree: usize,
    /// Number of grid points used for the cheap surrogate search.
    #[arg(long, default_value_t = 1000)]
    pub grid: usize,
    /// Optional output path for the JSON recommendation.  Defaults to stdout.
    #[arg(long)]
    pub output: Option<PathBuf>,
}

#[derive(Debug, Copy, Clone, ValueEnum, Eq, PartialEq)]
pub enum OptimizeProperty {
    #[value(name = "bulk-modulus")]
    BulkModulus,
    #[value(name = "shear-modulus")]
    ShearModulus,
    #[value(name = "young-modulus")]
    YoungModulus,
    #[value(name = "c11")]
    C11,
    #[value(name = "c12")]
    C12,
    #[value(name = "c44")]
    C44,
}

#[derive(Debug, Copy, Clone, ValueEnum, Eq, PartialEq)]
pub enum ObjectiveMode {
    #[value(name = "maximize")]
    Maximize,
    #[value(name = "minimize")]
    Minimize,
    #[value(name = "match")]
    Match,
}

#[derive(Debug, Clone, Deserialize)]
struct Manifest {
    system: String,
    #[serde(default)]
    config: serde_json::Value,
    results: Vec<EvaluatedPoint>,
}

#[derive(Debug, Clone, Deserialize)]
struct EvaluatedPoint {
    label: String,
    #[serde(default)]
    composition: Option<f64>,
    #[serde(default)]
    c11: Option<f64>,
    #[serde(default)]
    c12: Option<f64>,
    #[serde(default)]
    c44: Option<f64>,
    #[serde(default)]
    status: Option<String>,
    #[serde(default)]
    error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
struct Recommendation {
    system: String,
    property: String,
    mode: String,
    target: Option<f64>,
    optimal_composition: f64,
    optimal_value: f64,
    confidence: String,
    nearest_observed: NearestObserved,
    surrogate_polynomial: Vec<f64>,
}

#[derive(Debug, Clone, Serialize)]
struct NearestObserved {
    label: String,
    composition: f64,
    value: f64,
}

impl OptimizeProperty {
    fn compute(&self, c11: f64, c12: f64, c44: f64) -> f64 {
        match self {
            OptimizeProperty::C11 => c11,
            OptimizeProperty::C12 => c12,
            OptimizeProperty::C44 => c44,
            OptimizeProperty::BulkModulus => (c11 + 2.0 * c12) / 3.0,
            OptimizeProperty::ShearModulus => (c11 - c12 + 3.0 * c44) / 5.0,
            OptimizeProperty::YoungModulus => {
                let b = (c11 + 2.0 * c12) / 3.0;
                let g = (c11 - c12 + 3.0 * c44) / 5.0;
                9.0 * b * g / (3.0 * b + g)
            }
        }
    }

    fn as_str(&self) -> &'static str {
        match self {
            OptimizeProperty::BulkModulus => "bulk-modulus",
            OptimizeProperty::ShearModulus => "shear-modulus",
            OptimizeProperty::YoungModulus => "young-modulus",
            OptimizeProperty::C11 => "c11",
            OptimizeProperty::C12 => "c12",
            OptimizeProperty::C44 => "c44",
        }
    }
}

impl ObjectiveMode {
    fn as_str(&self) -> &'static str {
        match self {
            ObjectiveMode::Maximize => "maximize",
            ObjectiveMode::Minimize => "minimize",
            ObjectiveMode::Match => "match",
        }
    }
}

/// Fit a polynomial of given degree to (x, y) data using ordinary least squares.
/// Returns coefficients from highest to lowest degree.
fn polyfit(x: &[f64], y: &[f64], degree: usize) -> Result<Vec<f64>> {
    if x.len() != y.len() {
        bail!("x and y must have the same length");
    }
    if x.len() <= degree {
        bail!(
            "need at least {} points to fit degree-{} polynomial",
            degree + 1,
            degree
        );
    }
    if degree == 0 {
        bail!("degree 0 is not supported");
    }

    // Build Vandermonde matrix A (rows = points, cols = degree+1).
    let n = x.len();
    let m = degree + 1;
    let mut ata = vec![vec![0.0; m]; m];
    let mut aty = vec![0.0; m];
    for i in 0..n {
        let mut row = vec![1.0; m];
        for j in 1..m {
            row[j] = row[j - 1] * x[i];
        }
        for j in 0..m {
            aty[j] += row[j] * y[i];
            for k in 0..m {
                ata[j][k] += row[j] * row[k];
            }
        }
    }

    // Solve the normal equations with Gaussian elimination (small system).
    let coeffs = solve_linear(ata, aty)?;
    // Return highest-degree first for easy evaluation.
    Ok(coeffs.into_iter().rev().collect())
}

fn solve_linear(mut a: Vec<Vec<f64>>, mut b: Vec<f64>) -> Result<Vec<f64>> {
    let n = b.len();
    for col in 0..n {
        // Partial pivoting.
        let mut pivot = col;
        for row in (col + 1)..n {
            if a[row][col].abs() > a[pivot][col].abs() {
                pivot = row;
            }
        }
        if a[pivot][col].abs() < 1e-15 {
            bail!("singular normal equations; data may be collinear");
        }
        a.swap(col, pivot);
        b.swap(col, pivot);

        for row in (col + 1)..n {
            let factor = a[row][col] / a[col][col];
            for k in col..n {
                a[row][k] -= factor * a[col][k];
            }
            b[row] -= factor * b[col];
        }
    }

    let mut x = vec![0.0; n];
    for i in (0..n).rev() {
        let mut sum = b[i];
        for j in (i + 1)..n {
            sum -= a[i][j] * x[j];
        }
        x[i] = sum / a[i][i];
    }
    Ok(x)
}

fn eval_poly(coeffs: &[f64], x: f64) -> f64 {
    // coeffs are highest-degree first.
    let mut y = 0.0;
    let mut power = 1.0;
    for c in coeffs.iter().rev() {
        y += c * power;
        power *= x;
    }
    y
}

fn nearest_observed(x: f64, points: &[(String, f64, f64)]) -> NearestObserved {
    let (label, comp, val) = points
        .iter()
        .min_by(|a, b| (a.1 - x).abs().partial_cmp(&(b.1 - x).abs()).unwrap())
        .cloned()
        .unwrap_or_else(|| (String::new(), x, 0.0));
    NearestObserved {
        label,
        composition: comp,
        value: val,
    }
}

pub fn run(args: &MlipOptimizeArgs) -> Result<()> {
    let manifest_text = fs::read_to_string(&args.manifest)
        .with_context(|| format!("reading manifest {}", args.manifest.display()))?;
    let manifest: Manifest = serde_json::from_str(&manifest_text)
        .with_context(|| format!("parsing manifest {}", args.manifest.display()))?;

    // Collect observed (composition, property) points.
    let mut points: Vec<(String, f64, f64)> = Vec::new();
    for r in &manifest.results {
        if r.status.as_deref() == Some("failed") || r.error.is_some() {
            continue;
        }
        let comp = r.composition.context(
            "manifest point is missing 'composition' field; the optimizer needs an explicit design variable",
        )?;
        let (c11, c12, c44) = match (r.c11, r.c12, r.c44) {
            (Some(a), Some(b), Some(c)) => (a, b, c),
            _ => continue,
        };
        let value = args.property.compute(c11, c12, c44);
        points.push((r.label.clone(), comp, value));
    }

    if points.len() < 2 {
        bail!("need at least two successful evaluated points to optimize");
    }

    points.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap());

    let xs: Vec<f64> = points.iter().map(|p| p.1).collect();
    let ys: Vec<f64> = points.iter().map(|p| p.2).collect();

    let lower = args.lower.unwrap_or(xs[0]);
    let upper = args.upper.unwrap_or(*xs.last().unwrap());
    if lower >= upper {
        bail!("upper bound must be greater than lower bound");
    }

    let degree = if args.degree > 2 { 2 } else { args.degree };
    let coeffs = polyfit(&xs, &ys, degree)?;

    // Search the surrogate on a fine grid.
    let mut best_x = lower;
    let mut best_obj = f64::NEG_INFINITY;
    for i in 0..=args.grid {
        let t = i as f64 / args.grid as f64;
        let x = lower + t * (upper - lower);
        let y = eval_poly(&coeffs, x);
        let obj = match args.mode {
            ObjectiveMode::Maximize => y,
            ObjectiveMode::Minimize => -y,
            ObjectiveMode::Match => {
                let target = args.target.context("--target is required for match mode")?;
                -((y - target).abs())
            }
        };
        if obj > best_obj {
            best_obj = obj;
            best_x = x;
        }
    }

    let optimal_value = eval_poly(&coeffs, best_x);

    // Confidence is a qualitative assessment based on extrapolation.
    let confidence = if best_x >= xs[0] && best_x <= *xs.last().unwrap() {
        if degree >= 2 {
            "interpolated, moderate"
        } else {
            "interpolated, low (linear surrogate)"
        }
    } else {
        "extrapolated, low"
    };

    let rec = Recommendation {
        system: manifest.system.clone(),
        property: args.property.as_str().to_string(),
        mode: args.mode.as_str().to_string(),
        target: args.target,
        optimal_composition: best_x,
        optimal_value,
        confidence: confidence.to_string(),
        nearest_observed: nearest_observed(best_x, &points),
        surrogate_polynomial: coeffs.clone(),
    };

    let json = serde_json::to_string_pretty(&rec)?;
    if let Some(out) = &args.output {
        fs::write(out, json)?;
        println!("Wrote recommendation to {}", out.display());
    } else {
        println!("{}", json);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_polyfit_quadratic() {
        let x = vec![0.0, 1.0, 2.0, 3.0, 4.0];
        let y: Vec<f64> = x.iter().map(|xi| 2.0 * xi * xi - 3.0 * xi + 7.0).collect();
        let c = polyfit(&x, &y, 2).unwrap();
        // c is highest-degree first.
        assert!((c[0] - 2.0).abs() < 1e-9);
        assert!((c[1] - -3.0).abs() < 1e-9);
        assert!((c[2] - 7.0).abs() < 1e-9);
    }

    #[test]
    fn test_bulk_modulus_property() {
        assert!(
            (OptimizeProperty::BulkModulus.compute(100.0, 60.0, 30.0) - (100.0 + 120.0) / 3.0)
                .abs()
                < 1e-9
        );
    }
}
