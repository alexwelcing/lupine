//! Mean Square Displacement computation.
//!
//! MSD(t) = (1/N) Σᵢ |rᵢ(t) - rᵢ(0)|²
//!
//! Discovery target: exponent β in MSD ∝ t^β
//!   β = 1 → normal diffusion, D = MSD / 6t
//!   β < 1 → subdiffusion (confined, glassy)
//!   β > 1 → superdiffusion (ballistic, active)

use crate::ingest::trajectory::Frame;

/// Compute MSD over a frame sequence.
///
/// If `atom_type` is Some, only compute for atoms of that type.
/// Returns (timestep_delta, msd) pairs.
pub fn compute_msd(frames: &[Frame], atom_type: Option<i32>) -> Vec<(f64, f64)> {
    if frames.len() < 2 {
        return vec![];
    }

    let ref_frame = &frames[0];
    let n = ref_frame.natoms as usize;

    // Build index mask for the desired atom type
    let mask: Vec<bool> = if let Some(atype) = atom_type {
        ref_frame.types.iter().map(|t| *t == atype).collect()
    } else {
        vec![true; n]
    };

    let n_selected: usize = mask.iter().filter(|&&m| m).count();
    if n_selected == 0 {
        return vec![];
    }

    let mut result = Vec::with_capacity(frames.len());

    for frame in frames {
        if frame.natoms as usize != n {
            continue; // Skip frames with different atom count
        }

        let mut msd_sum = 0.0;

        for i in 0..n {
            if !mask[i] {
                continue;
            }

            let dx = frame.positions[i * 3] - ref_frame.positions[i * 3];
            let dy = frame.positions[i * 3 + 1] - ref_frame.positions[i * 3 + 1];
            let dz = frame.positions[i * 3 + 2] - ref_frame.positions[i * 3 + 2];

            msd_sum += dx * dx + dy * dy + dz * dz;
        }

        let msd = msd_sum / n_selected as f64;
        let dt = (frame.timestep - ref_frame.timestep) as f64;

        result.push((dt, msd));
    }

    result
}

/// Extract diffusion coefficient from MSD data.
///
/// D = lim(t→∞) MSD(t) / (2d·t) where d = dimensionality (3)
///
/// Uses the last half of the MSD to estimate the slope.
pub fn diffusion_coefficient(msd_data: &[(f64, f64)]) -> Option<f64> {
    if msd_data.len() < 4 {
        return None;
    }

    // Use the last half for the linear regime
    let half = msd_data.len() / 2;
    let late = &msd_data[half..];

    // Simple linear regression: MSD = 6D * t + b
    let n = late.len() as f64;
    let sum_t: f64 = late.iter().map(|(t, _)| t).sum();
    let sum_msd: f64 = late.iter().map(|(_, m)| m).sum();
    let sum_t2: f64 = late.iter().map(|(t, _)| t * t).sum();
    let sum_tm: f64 = late.iter().map(|(t, m)| t * m).sum();

    let denom = n * sum_t2 - sum_t * sum_t;
    if denom.abs() < 1e-30 {
        return None;
    }

    let slope = (n * sum_tm - sum_t * sum_msd) / denom;

    // D = slope / 6 (3D)
    Some(slope / 6.0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn make_frame(timestep: u64, positions: Vec<f64>) -> Frame {
        let n = positions.len() / 3;
        Frame {
            timestep,
            natoms: n as u32,
            box_bounds: [0.0, 10.0, 0.0, 10.0, 0.0, 10.0],
            positions,
            velocities: vec![],
            types: vec![1; n],
            properties: HashMap::new(),
        }
    }

    #[test]
    fn test_msd_stationary() {
        let frames = vec![
            make_frame(0, vec![1.0, 2.0, 3.0]),
            make_frame(100, vec![1.0, 2.0, 3.0]),
        ];
        let msd = compute_msd(&frames, None);
        assert_eq!(msd.len(), 2);
        assert!((msd[1].1).abs() < 1e-10); // No displacement → MSD = 0
    }

    #[test]
    fn test_msd_known_displacement() {
        let frames = vec![
            make_frame(0, vec![0.0, 0.0, 0.0]),
            make_frame(100, vec![1.0, 0.0, 0.0]), // displaced 1.0 in x
        ];
        let msd = compute_msd(&frames, None);
        assert!((msd[1].1 - 1.0).abs() < 1e-10); // MSD = 1.0
    }

    #[test]
    fn test_diffusion_coefficient_linear() {
        // Create perfectly linear MSD: MSD = 6 * D * t with D = 0.5
        // So MSD = 3.0 * t
        let msd_data: Vec<(f64, f64)> = (0..100)
            .map(|i| {
                let t = i as f64;
                (t, 3.0 * t) // D = 0.5
            })
            .collect();

        let d = diffusion_coefficient(&msd_data).unwrap();
        assert!((d - 0.5).abs() < 0.01, "Expected D ≈ 0.5, got {}", d);
    }
}
