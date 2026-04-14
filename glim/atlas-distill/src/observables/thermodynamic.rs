//! Generic thermodynamic time series extraction and statistics.

use crate::ingest::thermo::ThermoRun;

/// Compute a running average of a column.
pub fn running_average(data: &[f64], window: usize) -> Vec<f64> {
    if data.len() < window || window == 0 {
        return data.to_vec();
    }

    let mut result = Vec::with_capacity(data.len());
    let mut sum: f64 = data[..window].iter().sum();
    let w = window as f64;

    for i in 0..data.len() {
        if i >= window {
            sum += data[i] - data[i - window];
        }
        let count = (i + 1).min(window);
        if i < window {
            result.push(data[..=i].iter().sum::<f64>() / count as f64);
        } else {
            result.push(sum / w);
        }
    }

    result
}

/// Detect equilibration point: the timestep after which the running average
/// stabilizes (within `tolerance` fraction of the final mean).
pub fn equilibration_step(data: &[f64], window: usize, tolerance: f64) -> usize {
    let avg = running_average(data, window);
    if avg.is_empty() {
        return 0;
    }

    // Final mean from last quarter
    let quarter = data.len() / 4;
    let tail = &data[data.len() - quarter.max(1)..];
    let final_mean: f64 = tail.iter().sum::<f64>() / tail.len() as f64;

    if final_mean.abs() < 1e-30 {
        return 0;
    }

    // Find first point where running average is within tolerance of final mean
    for (i, &a) in avg.iter().enumerate() {
        if ((a - final_mean) / final_mean).abs() < tolerance {
            return i;
        }
    }

    0
}

/// Extract any two columns from a thermo run as (x, y) pairs,
/// optionally skipping an equilibration period.
pub fn extract_pair(
    run: &ThermoRun,
    x_col: &str,
    y_col: &str,
    skip_equilibration: bool,
) -> Vec<(f64, f64)> {
    let pairs = match run.get_pair(x_col, y_col) {
        Some(p) => p,
        None => return vec![],
    };

    if !skip_equilibration || pairs.len() < 4 {
        return pairs;
    }

    // Skip initial equilibration
    let y_vals: Vec<f64> = pairs.iter().map(|(_, y)| *y).collect();
    let eq_idx = equilibration_step(&y_vals, pairs.len() / 10, 0.02);

    pairs[eq_idx..].to_vec()
}

/// Block average analysis for error estimation.
pub fn block_average(data: &[f64], n_blocks: usize) -> (f64, f64) {
    if data.is_empty() || n_blocks == 0 {
        return (0.0, 0.0);
    }

    let block_size = data.len() / n_blocks;
    if block_size == 0 {
        let mean = data.iter().sum::<f64>() / data.len() as f64;
        return (mean, 0.0);
    }

    let mut block_means = Vec::with_capacity(n_blocks);
    for b in 0..n_blocks {
        let start = b * block_size;
        let end = ((b + 1) * block_size).min(data.len());
        let block: &[f64] = &data[start..end];
        let mean: f64 = block.iter().sum::<f64>() / block.len() as f64;
        block_means.push(mean);
    }

    let grand_mean: f64 = block_means.iter().sum::<f64>() / block_means.len() as f64;
    let variance: f64 = block_means
        .iter()
        .map(|m| (m - grand_mean).powi(2))
        .sum::<f64>()
        / (block_means.len() - 1).max(1) as f64;

    let std_error = (variance / block_means.len() as f64).sqrt();
    (grand_mean, std_error)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_running_average() {
        let data = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let avg = running_average(&data, 3);
        assert_eq!(avg.len(), 5);
        assert!((avg[2] - 2.0).abs() < 1e-10); // (1+2+3)/3
        assert!((avg[3] - 3.0).abs() < 1e-10); // (2+3+4)/3
    }

    #[test]
    fn test_block_average() {
        let data: Vec<f64> = (0..100).map(|i| i as f64).collect();
        let (mean, _err) = block_average(&data, 10);
        assert!((mean - 49.5).abs() < 1.0);
    }
}
