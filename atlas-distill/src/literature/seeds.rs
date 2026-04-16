//! Canonical MD relationships from published literature.
//!
//! These are well-known mathematical relationships that serve as testable hypotheses.
//! The distiller can check whether extracted data confirms, extends, or departs from them.

use serde::{Deserialize, Serialize};

/// A canonical physical relationship from the literature.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeedRelationship {
    pub name: String,
    pub equation: String,
    pub domain: String,
    pub parameters: Vec<SeedParameter>,
    pub reference: String,
    pub testable_as: String,
    pub data: Vec<(f64, f64)>,
}

/// A parameter in a seed relationship with its known range.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeedParameter {
    pub name: String,
    pub typical_value: f64,
    pub unit: String,
    pub range: (f64, f64),
}

/// Generate all seed relationships.
pub fn all_seeds() -> Vec<SeedRelationship> {
    vec![
        lj_self_diffusion(),
        stokes_einstein(),
        polymer_rg_scaling(),
        arrhenius_viscosity(),
        eam_elastic_temperature(),
        grain_growth_parabolic(),
        thermal_conductivity_green_kubo(),
        msd_anomalous_diffusion(),
        reaxff_bond_order(),
        snap_linear_energy(),
        bird_equation_viscosity(),
        hertz_contact_force(),
        hall_petch(),
        vegard_law(),
        wiedemann_franz(),
    ]
}

/// LJ fluid self-diffusion: D* = A · T*^α
/// Meier et al., JCP 2004: D* ≈ 0.165 · T*^0.72 (at ρ* = 0.85)
fn lj_self_diffusion() -> SeedRelationship {
    let a = 0.165;
    let alpha = 0.72;

    // Generate data: T* from 0.7 to 3.0
    let data: Vec<(f64, f64)> = (7..=30)
        .map(|i| {
            let t_star = i as f64 * 0.1;
            (t_star, a * t_star.powf(alpha))
        })
        .collect();

    SeedRelationship {
        name: "LJ self-diffusion (Meier 2004)".to_string(),
        equation: "D* = 0.165 · T*^0.72".to_string(),
        domain: "Transport / LJ fluid".to_string(),
        parameters: vec![
            SeedParameter {
                name: "prefactor".to_string(),
                typical_value: 0.165,
                unit: "reduced".to_string(),
                range: (0.10, 0.25),
            },
            SeedParameter {
                name: "exponent".to_string(),
                typical_value: 0.72,
                unit: "dimensionless".to_string(),
                range: (0.5, 1.0),
            },
        ],
        reference: "Meier et al., J. Chem. Phys. 121, 3671 (2004)".to_string(),
        testable_as: "power_law".to_string(),
        data,
    }
}

/// Stokes-Einstein: D = kT / (6πηr)
fn stokes_einstein() -> SeedRelationship {
    let kb = 1.38e-23; // J/K
    let eta = 0.89e-3; // Pa·s (water at 298K)
    let r = 1.0e-10; // 1 Å

    let data: Vec<(f64, f64)> = (200..=400)
        .step_by(10)
        .map(|t| {
            let temp = t as f64;
            let d = kb * temp / (6.0 * std::f64::consts::PI * eta * r);
            (temp, d)
        })
        .collect();

    SeedRelationship {
        name: "Stokes-Einstein relation".to_string(),
        equation: "D = kT / (6πηr)".to_string(),
        domain: "Transport / continuum".to_string(),
        parameters: vec![
            SeedParameter {
                name: "viscosity_eta".to_string(),
                typical_value: 0.89e-3,
                unit: "Pa·s".to_string(),
                range: (1e-4, 1e-1),
            },
            SeedParameter {
                name: "particle_radius".to_string(),
                typical_value: 1.0e-10,
                unit: "m".to_string(),
                range: (1e-10, 1e-8),
            },
        ],
        reference: "Einstein, Ann. Phys. 17, 549 (1905)".to_string(),
        testable_as: "linear".to_string(),
        data,
    }
}

/// Polymer radius of gyration: Rg ∝ N^ν
/// Flory: ν = 3/5 = 0.6 (good solvent), ν = 1/2 (theta), ν = 1/3 (collapsed)
fn polymer_rg_scaling() -> SeedRelationship {
    let nu = 0.588; // SAW exponent (renormalization group)
    let a = 1.0; // monomer length (arbitrary units)

    let data: Vec<(f64, f64)> = (10..=500)
        .step_by(10)
        .map(|n| {
            let nn = n as f64;
            (nn, a * nn.powf(nu))
        })
        .collect();

    SeedRelationship {
        name: "Polymer Rg scaling (Flory)".to_string(),
        equation: "Rg = a · N^ν (ν = 0.588 for SAW)".to_string(),
        domain: "Polymers / soft matter".to_string(),
        parameters: vec![SeedParameter {
            name: "Flory_exponent_nu".to_string(),
            typical_value: 0.588,
            unit: "dimensionless".to_string(),
            range: (0.33, 1.0),
        }],
        reference: "de Gennes, Scaling Concepts in Polymer Physics (1979)".to_string(),
        testable_as: "power_law".to_string(),
        data,
    }
}

/// Arrhenius viscosity: η = η₀ · exp(Ea / kT)
fn arrhenius_viscosity() -> SeedRelationship {
    let eta0 = 0.01; // Pa·s
    let ea = 0.3; // eV
    let kb = 8.617333e-5; // eV/K

    let data: Vec<(f64, f64)> = (300..=1200)
        .step_by(50)
        .map(|t| {
            let temp = t as f64;
            let eta = eta0 * (ea / (kb * temp)).exp();
            (temp, eta)
        })
        .collect();

    SeedRelationship {
        name: "Arrhenius viscosity".to_string(),
        equation: "η = η₀ · exp(Ea / kT)".to_string(),
        domain: "Transport / glasses".to_string(),
        parameters: vec![
            SeedParameter {
                name: "prefactor_eta0".to_string(),
                typical_value: 0.01,
                unit: "Pa·s".to_string(),
                range: (1e-4, 1e2),
            },
            SeedParameter {
                name: "activation_energy_Ea".to_string(),
                typical_value: 0.3,
                unit: "eV".to_string(),
                range: (0.1, 2.0),
            },
        ],
        reference: "Arrhenius, Z. Phys. Chem. 4, 226 (1889)".to_string(),
        testable_as: "arrhenius".to_string(),
        data,
    }
}

/// EAM elastic constants temperature dependence: C(T) = C(0) · (1 - αT)
fn eam_elastic_temperature() -> SeedRelationship {
    let c0 = 170.0; // GPa (copper C₁₁)
    let alpha = 1.5e-4; // K⁻¹ (approximate)

    let data: Vec<(f64, f64)> = (0..=1000)
        .step_by(50)
        .map(|t| {
            let temp = t as f64;
            (temp, c0 * (1.0 - alpha * temp))
        })
        .collect();

    SeedRelationship {
        name: "EAM elastic constant vs T".to_string(),
        equation: "C₁₁(T) = C₁₁(0) · (1 - αT)".to_string(),
        domain: "Metals / mechanical".to_string(),
        parameters: vec![
            SeedParameter {
                name: "C11_0".to_string(),
                typical_value: 170.0,
                unit: "GPa".to_string(),
                range: (50.0, 500.0),
            },
            SeedParameter {
                name: "thermal_softening_alpha".to_string(),
                typical_value: 1.5e-4,
                unit: "K⁻¹".to_string(),
                range: (1e-5, 5e-4),
            },
        ],
        reference: "Various EAM literature".to_string(),
        testable_as: "linear".to_string(),
        data,
    }
}

/// Parabolic grain growth: d² = d₀² + Kt
fn grain_growth_parabolic() -> SeedRelationship {
    let d0 = 5.0; // nm
    let k = 2.0; // nm²/ns

    let data: Vec<(f64, f64)> = (0..=50)
        .map(|i| {
            let t = i as f64 * 0.5; // ns
            let d = (d0 * d0 + k * t).sqrt();
            (t, d)
        })
        .collect();

    SeedRelationship {
        name: "Parabolic grain growth".to_string(),
        equation: "d² - d₀² = K·t".to_string(),
        domain: "Metals / microstructure".to_string(),
        parameters: vec![SeedParameter {
            name: "growth_rate_K".to_string(),
            typical_value: 2.0,
            unit: "nm²/ns".to_string(),
            range: (0.1, 100.0),
        }],
        reference: "Burke & Turnbull, Prog. Met. Phys. 3, 220 (1952)".to_string(),
        testable_as: "power_law".to_string(),
        data,
    }
}

/// Green-Kubo thermal conductivity (integral of heat flux VACF)
fn thermal_conductivity_green_kubo() -> SeedRelationship {
    // κ ∝ V/(kT²) · ∫ ⟨J(0)·J(t)⟩ dt
    // For LJ fluid: κ* ∝ T*^0.75 approximately
    let data: Vec<(f64, f64)> = (5..=30)
        .map(|i| {
            let t = i as f64 * 0.1;
            (t, 8.0 * t.powf(0.75))
        })
        .collect();

    SeedRelationship {
        name: "LJ thermal conductivity scaling".to_string(),
        equation: "κ* ∝ T*^0.75".to_string(),
        domain: "Transport / LJ".to_string(),
        parameters: vec![SeedParameter {
            name: "exponent".to_string(),
            typical_value: 0.75,
            unit: "dimensionless".to_string(),
            range: (0.5, 1.0),
        }],
        reference: "Various LJ transport studies".to_string(),
        testable_as: "power_law".to_string(),
        data,
    }
}

/// MSD anomalous diffusion: MSD ∝ t^β
fn msd_anomalous_diffusion() -> SeedRelationship {
    SeedRelationship {
        name: "Anomalous diffusion".to_string(),
        equation: "MSD = K · t^β".to_string(),
        domain: "Transport / general".to_string(),
        parameters: vec![SeedParameter {
            name: "diffusion_exponent_beta".to_string(),
            typical_value: 1.0,
            unit: "dimensionless".to_string(),
            range: (0.0, 2.0),
        }],
        reference: "β=1 normal, β<1 sub, β>1 super".to_string(),
        testable_as: "power_law".to_string(),
        data: (1..=20)
            .map(|i| {
                let t = i as f64;
                (t, 0.5 * t.powf(1.0)) // normal diffusion baseline
            })
            .collect(),
    }
}

/// ReaxFF bond order: BO = exp(p · (r/r₀)^p2)
fn reaxff_bond_order() -> SeedRelationship {
    let p = -6.0;
    let r0 = 1.5; // Å
    let p2 = 2.0;

    let data: Vec<(f64, f64)> = (5..=30)
        .map(|i| {
            let r = i as f64 * 0.1;
            let bo = (p * (r / r0).powf(p2)).exp();
            (r, bo)
        })
        .collect();

    SeedRelationship {
        name: "ReaxFF bond order decay".to_string(),
        equation: "BO = exp(p · (r/r₀)^p₂)".to_string(),
        domain: "Reactive MD".to_string(),
        parameters: vec![
            SeedParameter { name: "p_bo".to_string(), typical_value: -6.0, unit: "dimensionless".to_string(), range: (-10.0, -1.0) },
            SeedParameter { name: "r0".to_string(), typical_value: 1.5, unit: "Å".to_string(), range: (1.0, 3.0) },
        ],
        reference: "van Duin et al., J. Phys. Chem. A 105, 9396 (2001)".to_string(),
        testable_as: "symbolic".to_string(),
        data,
    }
}

/// SNAP linear energy model: E = Σ βₖ · Bₖ
fn snap_linear_energy() -> SeedRelationship {
    SeedRelationship {
        name: "SNAP linear energy".to_string(),
        equation: "E = Σ βₖ · Bₖ (linear in bispectrum)".to_string(),
        domain: "MLIP / SNAP".to_string(),
        parameters: vec![],
        reference: "Thompson et al., J. Comput. Phys. 285, 316 (2015)".to_string(),
        testable_as: "linear".to_string(),
        data: Vec::new(), // needs per-atom bispectrum components
    }
}

/// Bird equation: gas viscosity η ∝ T^ω (ω ≈ 0.66-0.85)
fn bird_equation_viscosity() -> SeedRelationship {
    let omega = 0.74;
    let eta_ref = 1.7e-5; // Pa·s at T_ref
    let t_ref = 273.15; // K

    let data: Vec<(f64, f64)> = (200..=2000)
        .step_by(50)
        .map(|t| {
            let temp = t as f64;
            (temp, eta_ref * (temp / t_ref).powf(omega))
        })
        .collect();

    SeedRelationship {
        name: "Gas viscosity temperature scaling (Bird)".to_string(),
        equation: "η = η_ref · (T/T_ref)^ω".to_string(),
        domain: "Transport / gas".to_string(),
        parameters: vec![SeedParameter {
            name: "omega".to_string(),
            typical_value: 0.74,
            unit: "dimensionless".to_string(),
            range: (0.5, 1.0),
        }],
        reference: "Bird, Stewart & Lightfoot, Transport Phenomena".to_string(),
        testable_as: "power_law".to_string(),
        data,
    }
}

/// Hertz contact: F = (4/3) E* √R · δ^(3/2)
fn hertz_contact_force() -> SeedRelationship {
    let e_star = 100.0; // GPa effective
    let r: f64 = 5.0; // nm

    let data: Vec<(f64, f64)> = (1..=30)
        .map(|i| {
            let delta = i as f64 * 0.01; // nm indentation
            let f = (4.0 / 3.0) * e_star * r.sqrt() * delta.powf(1.5);
            (delta, f)
        })
        .collect();

    SeedRelationship {
        name: "Hertz contact mechanics".to_string(),
        equation: "F = (4/3)·E*·√R·δ^(3/2)".to_string(),
        domain: "Mechanics / nanoindentation".to_string(),
        parameters: vec![SeedParameter {
            name: "hertz_exponent".to_string(),
            typical_value: 1.5,
            unit: "dimensionless".to_string(),
            range: (1.0, 2.0),
        }],
        reference: "Hertz, J. reine angew. Math. 92, 156 (1882)".to_string(),
        testable_as: "power_law".to_string(),
        data,
    }
}

/// Hall-Petch: σ_y = σ_0 + k / √d
fn hall_petch() -> SeedRelationship {
    let sigma_0 = 25.0; // MPa (lattice friction)
    let k = 500.0; // MPa·nm^0.5

    let data: Vec<(f64, f64)> = (1..=50)
        .map(|i| {
            let d = i as f64; // nm grain size
            (d, sigma_0 + k / d.sqrt())
        })
        .collect();

    SeedRelationship {
        name: "Hall-Petch grain size strengthening".to_string(),
        equation: "σ_y = σ_0 + k·d^(-1/2)".to_string(),
        domain: "Metals / mechanical".to_string(),
        parameters: vec![
            SeedParameter { name: "sigma_0".to_string(), typical_value: 25.0, unit: "MPa".to_string(), range: (5.0, 200.0) },
            SeedParameter { name: "k_HP".to_string(), typical_value: 500.0, unit: "MPa·nm^0.5".to_string(), range: (100.0, 2000.0) },
        ],
        reference: "Hall, Proc. Phys. Soc. B 64, 747 (1951)".to_string(),
        testable_as: "power_law".to_string(),
        data,
    }
}

/// Vegard's law: a(x) = (1-x)·a₁ + x·a₂
fn vegard_law() -> SeedRelationship {
    let a1 = 3.615; // Å (Cu)
    let a2 = 4.050; // Å (Al)

    let data: Vec<(f64, f64)> = (0..=20)
        .map(|i| {
            let x = i as f64 * 0.05;
            (x, (1.0 - x) * a1 + x * a2)
        })
        .collect();

    SeedRelationship {
        name: "Vegard's law (alloy lattice constant)".to_string(),
        equation: "a(x) = (1-x)·a₁ + x·a₂".to_string(),
        domain: "Metals / alloys".to_string(),
        parameters: vec![],
        reference: "Vegard, Z. Phys. 5, 17 (1921)".to_string(),
        testable_as: "linear".to_string(),
        data,
    }
}

/// Wiedemann-Franz: κ/(σT) = L (Lorenz number)
fn wiedemann_franz() -> SeedRelationship {
    let l0 = 2.44e-8; // W·Ω/K² (ideal Lorenz number)
    let sigma_base = 5.9e7; // S/m (Cu at 300K)

    // κ = L · σ · T
    let data: Vec<(f64, f64)> = (100..=1000)
        .step_by(50)
        .map(|t| {
            let temp = t as f64;
            // σ decreases ~ 1/T for metals (simple model)
            let sigma = sigma_base * 300.0 / temp;
            let kappa = l0 * sigma * temp;
            (temp, kappa)
        })
        .collect();

    SeedRelationship {
        name: "Wiedemann-Franz law".to_string(),
        equation: "κ = L₀·σ·T".to_string(),
        domain: "Transport / metals".to_string(),
        parameters: vec![SeedParameter {
            name: "Lorenz_number".to_string(),
            typical_value: 2.44e-8,
            unit: "W·Ω/K²".to_string(),
            range: (2.0e-8, 3.0e-8),
        }],
        reference: "Wiedemann & Franz, Ann. Phys. 89, 497 (1853)".to_string(),
        testable_as: "linear".to_string(),
        data,
    }
}

/// Print a summary of all seed relationships to stderr.
pub fn print_seeds_summary() {
    let seeds = all_seeds();
    eprintln!("\n  ╔════════════════════════════════════════════════════════════╗");
    eprintln!("  ║  Canonical MD Relationships ({} seeds)              ", seeds.len());
    eprintln!("  ╠════════════════════════════════════════════════════════════╣");

    for seed in &seeds {
        eprintln!("  ║");
        eprintln!("  ║  {} ", seed.name);
        eprintln!("  ║    {} ", seed.equation);
        eprintln!("  ║    Domain: {}  |  Fit via: {}", seed.domain, seed.testable_as);
        eprintln!("  ║    Ref: {}", seed.reference);
        if !seed.data.is_empty() {
            eprintln!("  ║    Data: {} points", seed.data.len());
        }
    }

    eprintln!("  ║");
    eprintln!("  ╚════════════════════════════════════════════════════════════╝");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_all_seeds_have_names() {
        let seeds = all_seeds();
        assert!(seeds.len() >= 10);
        for seed in &seeds {
            assert!(!seed.name.is_empty());
            assert!(!seed.equation.is_empty());
            assert!(!seed.domain.is_empty());
        }
    }

    #[test]
    fn test_lj_diffusion_data() {
        let seed = lj_self_diffusion();
        assert!(!seed.data.is_empty());
        // D* should increase with T*
        let first = seed.data.first().unwrap().1;
        let last = seed.data.last().unwrap().1;
        assert!(last > first);
    }

    #[test]
    fn test_hall_petch_inverse_sqrt() {
        let seed = hall_petch();
        // Yield stress should decrease with grain size
        let small_grain = seed.data.first().unwrap().1; // d = 1 nm
        let large_grain = seed.data.last().unwrap().1;  // d = 50 nm
        assert!(small_grain > large_grain);
    }
}
