//! Velocity Autocorrelation Function.
//!
//! Cv(t) = ⟨v(0)·v(t)⟩ / ⟨v(0)·v(0)⟩
//!
//! Discovery targets: diffusion (Green-Kubo), oscillation frequencies.

use crate::ingest::trajectory::Frame;

/// Compute VACF from a trajectory with velocity data.
///
/// Returns (timestep_delta, Cv) pairs, or None if no velocities.
pub fn compute_vacf(frames: &[Frame]) -> Option<Vec<(f64, f64)>> {
    if frames.len() < 2 {
        return None;
    }

    let ref_frame = &frames[0];
    if ref_frame.velocities.is_empty() {
        return None;
    }

    let n = ref_frame.natoms as usize;
    let n3 = n * 3;

    if ref_frame.velocities.len() != n3 {
        return None;
    }

    // Compute ⟨v(0)·v(0)⟩
    let v0_dot_v0: f64 = ref_frame.velocities.iter().map(|v| v * v).sum::<f64>() / n as f64;

    if v0_dot_v0.abs() < 1e-30 {
        return None;
    }

    let mut result = Vec::with_capacity(frames.len());

    for frame in frames {
        if frame.velocities.len() != n3 {
            continue;
        }

        // ⟨v(0)·v(t)⟩
        let dot: f64 = ref_frame
            .velocities
            .iter()
            .zip(frame.velocities.iter())
            .map(|(a, b)| a * b)
            .sum::<f64>()
            / n as f64;

        let cv = dot / v0_dot_v0;
        let dt = (frame.timestep - ref_frame.timestep) as f64;
        result.push((dt, cv));
    }

    Some(result)
}

/// Compute diffusion coefficient from VACF via Green-Kubo relation.
///
/// D = (1/3) ∫₀^∞ Cv(t) dt ≈ (1/3) Σ Cv(tₙ) · Δt
pub fn green_kubo_diffusion(vacf: &[(f64, f64)]) -> Option<f64> {
    if vacf.len() < 2 {
        return None;
    }

    let dt = vacf[1].0 - vacf[0].0;
    if dt <= 0.0 {
        return None;
    }

    // Trapezoidal integration until Cv crosses zero (or ends)
    let mut integral = 0.0;

    for i in 1..vacf.len() {
        let cv = vacf[i].1;
        let cv_prev = vacf[i - 1].1;

        if cv < 0.0 && cv_prev < 0.0 {
            break; // Stop after sustained negative correlation
        }

        integral += 0.5 * (cv + cv_prev) * dt;
    }

    // D = (1/3) * ⟨v(0)·v(0)⟩ * ∫ Cv(t) dt
    // But VACF is normalized: Cv(0) = 1, so we need the original ⟨v²⟩
    // For now return the normalized integral; the caller scales by ⟨v²⟩/3
    Some(integral / 3.0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_vacf_self_correlation() {
        let frame = Frame {
            timestep: 0,
            natoms: 2,
            box_bounds: [0.0, 10.0, 0.0, 10.0, 0.0, 10.0],
            positions: vec![0.0; 6],
            velocities: vec![1.0, 0.0, 0.0, 0.0, 1.0, 0.0],
            types: vec![1, 1],
            properties: HashMap::new(),
        };

        let vacf = compute_vacf(&[frame.clone(), frame]).unwrap();
        assert_eq!(vacf.len(), 2);
        assert!((vacf[0].1 - 1.0).abs() < 1e-10); // Cv(0) = 1
    }
}
