//! Radial Distribution Function computation.
//!
//! g(r) = (V / N²) Σᵢ Σⱼ≠ᵢ δ(r - rᵢⱼ) / (4π r² Δr)
//!
//! Discovery targets: peak positions, coordination numbers, decay exponents.

use crate::ingest::trajectory::Frame;

/// Compute the RDF averaged over a set of frames.
///
/// Returns (r, g(r)) pairs.
pub fn compute_rdf(
    frames: &[Frame],
    n_bins: usize,
    r_max: Option<f64>,
) -> Vec<(f64, f64)> {
    if frames.is_empty() {
        return vec![];
    }

    let ref_frame = &frames[0];
    let lx = ref_frame.box_bounds[1] - ref_frame.box_bounds[0];
    let ly = ref_frame.box_bounds[3] - ref_frame.box_bounds[2];
    let lz = ref_frame.box_bounds[5] - ref_frame.box_bounds[4];

    let r_max = r_max.unwrap_or(lx.min(ly).min(lz) / 2.0);
    let dr = r_max / n_bins as f64;

    let mut histogram = vec![0.0f64; n_bins];
    let mut n_frames_counted = 0usize;

    for frame in frames {
        let n = frame.natoms as usize;
        if n < 2 {
            continue;
        }

        let box_l = [
            frame.box_bounds[1] - frame.box_bounds[0],
            frame.box_bounds[3] - frame.box_bounds[2],
            frame.box_bounds[5] - frame.box_bounds[4],
        ];

        for i in 0..n {
            for j in (i + 1)..n {
                let mut dx = frame.positions[i * 3] - frame.positions[j * 3];
                let mut dy = frame.positions[i * 3 + 1] - frame.positions[j * 3 + 1];
                let mut dz = frame.positions[i * 3 + 2] - frame.positions[j * 3 + 2];

                // Minimum image convention
                dx -= box_l[0] * (dx / box_l[0]).round();
                dy -= box_l[1] * (dy / box_l[1]).round();
                dz -= box_l[2] * (dz / box_l[2]).round();

                let r = (dx * dx + dy * dy + dz * dz).sqrt();

                if r < r_max {
                    let bin = (r / dr) as usize;
                    if bin < n_bins {
                        histogram[bin] += 2.0; // Count both i-j and j-i
                    }
                }
            }
        }

        n_frames_counted += 1;
    }

    if n_frames_counted == 0 {
        return vec![];
    }

    // Normalize
    let n_avg = frames.iter().map(|f| f.natoms as f64).sum::<f64>() / frames.len() as f64;
    let volume = lx * ly * lz;
    let rho = n_avg / volume;

    let mut result = Vec::with_capacity(n_bins);
    for bin in 0..n_bins {
        let r = (bin as f64 + 0.5) * dr;
        let shell_volume = 4.0 * std::f64::consts::PI * r * r * dr;
        let ideal_count = rho * shell_volume * n_avg;

        let g = if ideal_count > 0.0 {
            histogram[bin] / (n_frames_counted as f64 * ideal_count)
        } else {
            0.0
        };

        result.push((r, g));
    }

    result
}

/// Find peaks in g(r) — nearest neighbor distances.
pub fn find_peaks(rdf: &[(f64, f64)], min_height: f64) -> Vec<(f64, f64)> {
    let mut peaks = Vec::new();

    for i in 1..rdf.len().saturating_sub(1) {
        let (r, g) = rdf[i];
        if g > min_height && g > rdf[i - 1].1 && g > rdf[i + 1].1 {
            peaks.push((r, g));
        }
    }

    peaks
}

/// Compute coordination number by integrating g(r) up to the first minimum.
pub fn coordination_number(rdf: &[(f64, f64)], rho: f64) -> Option<f64> {
    // Find first peak
    let peaks = find_peaks(rdf, 1.5);
    if peaks.is_empty() {
        return None;
    }

    let first_peak_r = peaks[0].0;

    // Find first minimum after peak
    let peak_idx = rdf.iter().position(|(r, _)| *r >= first_peak_r)?;
    let mut min_idx = peak_idx;
    for i in peak_idx..rdf.len().saturating_sub(1) {
        if rdf[i].1 < rdf[i + 1].1 {
            min_idx = i;
            break;
        }
    }

    // Integrate 4πρ ∫₀^r_min r² g(r) dr
    let dr = if rdf.len() > 1 { rdf[1].0 - rdf[0].0 } else { return None };
    let mut cn = 0.0;
    for i in 0..=min_idx {
        let (r, g) = rdf[i];
        cn += 4.0 * std::f64::consts::PI * rho * r * r * g * dr;
    }

    Some(cn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ingest::trajectory::Frame;
    use std::collections::HashMap;

    fn make_random_frame(n: usize, box_size: f64) -> Frame {
        // Deterministic "random" positions for testing
        let mut positions = Vec::with_capacity(n * 3);
        for i in 0..n {
            let seed = i as f64;
            positions.push((seed * 7.13 + 0.5) % box_size);
            positions.push((seed * 11.37 + 1.3) % box_size);
            positions.push((seed * 3.71 + 2.1) % box_size);
        }

        Frame {
            timestep: 0,
            natoms: n as u32,
            box_bounds: [0.0, box_size, 0.0, box_size, 0.0, box_size],
            positions,
            velocities: vec![],
            types: vec![1; n],
            properties: HashMap::new(),
        }
    }

    #[test]
    fn test_rdf_produces_output() {
        let frame = make_random_frame(50, 10.0);
        let rdf = compute_rdf(&[frame], 100, None);
        assert!(!rdf.is_empty());
        // g(r) should approach 1.0 at large r for random positions
    }

    #[test]
    fn test_find_peaks() {
        let rdf = vec![
            (1.0, 0.5),
            (2.0, 2.0),
            (3.0, 1.5),
            (4.0, 0.8),
            (5.0, 1.2),
            (6.0, 0.9),
        ];
        let peaks = find_peaks(&rdf, 1.0);
        assert_eq!(peaks.len(), 2);
        assert!((peaks[0].0 - 2.0).abs() < 1e-10);
    }
}
