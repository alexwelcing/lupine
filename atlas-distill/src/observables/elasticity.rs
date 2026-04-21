//! FCC Elastic Property Observables
//!
//! Deterministic functions for computing derived elastic properties
//! from cubic elastic constants (C11, C12, C44). Ported from the
//! Open Distillation Factory rust-core.
//!
//! These functions are the canonical transform layer for the
//! FCC elasticity benchmark vertical slice.

/// Bulk modulus for cubic systems (Voigt average).
///
/// K = (C11 + 2*C12) / 3
///
/// # Arguments
/// * `c11` - Elastic constant C11 in GPa
/// * `c12` - Elastic constant C12 in GPa
pub fn bulk_modulus_k(c11: f64, c12: f64) -> f64 {
    (c11 + 2.0 * c12) / 3.0
}

/// Shear modulus — Voigt-style cubic approximation.
///
/// G = (C11 - C12 + 3*C44) / 5
///
/// # Arguments
/// * `c11` - Elastic constant C11 in GPa
/// * `c12` - Elastic constant C12 in GPa
/// * `c44` - Elastic constant C44 in GPa
pub fn shear_modulus_g(c11: f64, c12: f64, c44: f64) -> f64 {
    (c11 - c12 + 3.0 * c44) / 5.0
}

/// Zener elastic anisotropy factor.
///
/// A = 2*C44 / (C11 - C12)
///
/// For isotropic materials A = 1.0. Deviation indicates
/// directional dependence of elastic properties.
pub fn anisotropy_a(c11: f64, c12: f64, c44: f64) -> f64 {
    (2.0 * c44) / (c11 - c12)
}

/// Relative error: (model - reference) / reference
///
/// Positive values indicate overprediction.
pub fn relative_error(model: f64, reference: f64) -> f64 {
    (model - reference) / reference
}

#[cfg(test)]
mod tests {
    use super::*;

    fn assert_close(a: f64, b: f64, eps: f64) {
        assert!(
            (a - b).abs() <= eps,
            "left={a}, right={b}, diff={}, eps={eps}",
            (a - b).abs()
        );
    }

    // Reference values: Al FCC (C11=108.2, C12=61.3, C44=28.5 GPa)
    #[test]
    fn al_bulk_modulus() {
        assert_close(bulk_modulus_k(108.2, 61.3), 76.933_333_333, 1e-9);
    }

    #[test]
    fn al_shear_modulus() {
        // G = (108.2 - 61.3 + 3*28.5) / 5 = (46.9 + 85.5) / 5 = 26.48
        assert_close(shear_modulus_g(108.2, 61.3, 28.5), 26.48, 1e-12);
    }

    #[test]
    fn al_anisotropy() {
        // A = 2*28.5 / (108.2 - 61.3) = 57.0 / 46.9 ≈ 1.2154
        assert_close(anisotropy_a(108.2, 61.3, 28.5), 1.215_351_812, 1e-9);
    }

    #[test]
    fn relative_error_positive() {
        assert_close(relative_error(102.0, 100.0), 0.02, 1e-12);
    }

    #[test]
    fn relative_error_negative() {
        assert_close(relative_error(98.0, 100.0), -0.02, 1e-12);
    }

    // Cross-validate against Cu data
    #[test]
    fn cu_bulk_modulus() {
        // Cu: C11=168.4, C12=121.4 → K = (168.4 + 2*121.4)/3 = 411.2/3 = 137.067
        assert_close(bulk_modulus_k(168.4, 121.4), 137.066_666_667, 1e-9);
    }
}
