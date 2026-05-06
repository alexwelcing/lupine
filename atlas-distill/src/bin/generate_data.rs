//! Synthetic data generator for atlas-distill testing.
//!
//! Generates physically realistic LAMMPS output files with known mathematical
//! relationships embedded. Each dataset tests a different discovery capability.

use std::fs;
use std::io::Write;
use std::path::Path;

fn main() {
    let out = Path::new("examples");
    fs::create_dir_all(out).unwrap();

    eprintln!("  ✦ Generating simulation datasets...\n");

    gen_arrhenius_diffusion(out);
    gen_power_law_hardening(out);
    gen_anomalous_diffusion_trajectory(out);
    gen_lj_equation_of_state(out);
    gen_shear_thinning(out);
    gen_thermal_expansion(out);
    gen_temperature_sweep_multi(out);
    gen_grain_growth_kinetics(out);
    gen_nucleation_barrier(out);

    eprintln!("\n  ✅ All datasets generated in examples/");
}

// ─── 1. Arrhenius Diffusion ──────────────────────────────────────────────────
// D = D₀ · exp(−Eₐ / kT)
// D₀ = 2.5e-3 Å²/fs, Eₐ = 0.35 eV
// 8 temperature runs from 300K to 1000K

fn gen_arrhenius_diffusion(out: &Path) {
    let d0 = 2.5e-3;
    let ea = 0.35; // eV
    let kb = 8.617333e-5; // eV/K

    let temperatures = [300.0, 400.0, 500.0, 600.0, 700.0, 800.0, 900.0, 1000.0];

    for &temp in &temperatures {
        let d = d0 * ((-ea / (kb * temp)) as f64).exp();
        let filename = format!("arrhenius_{}K.log", temp as i32);
        let mut f = fs::File::create(out.join(&filename)).unwrap();

        writeln!(f, "LAMMPS (2 Aug 2023)").unwrap();
        writeln!(f, "# LJ fluid diffusion at T = {} K", temp).unwrap();
        writeln!(f, "# Known: D = {:.6e} * exp(-0.35 eV / kT)", d0).unwrap();
        writeln!(f).unwrap();

        // Thermo output: Step, Temp, MSD (= 6Dt for 3D), PotEng, TotEng
        writeln!(f, "Step Temp v_msd PotEng TotEng Press").unwrap();

        let nsteps = 50;
        let dt = 0.001; // ps per step
        for i in 0..=nsteps {
            let step = i * 1000;
            let t = step as f64 * dt; // time in ps
            let msd = 6.0 * d * t; // MSD = 6Dt
            // Add realistic noise
            let noise = ((step as f64 * 0.0137).sin()) * 0.02 * msd.max(0.001);
            let temp_fluct = temp + ((step as f64 * 0.0031).sin()) * temp * 0.02;
            let pe = -3.2 + 0.001 * temp;
            let ke = 1.5 * kb * temp_fluct / 0.001; // rough reduced units
            let press = -0.5 + 0.003 * temp + ((step as f64 * 0.007).sin()) * 0.1;

            writeln!(
                f,
                "{} {:.4} {:.8} {:.6} {:.6} {:.6}",
                step,
                temp_fluct,
                msd + noise,
                pe,
                pe + ke,
                press
            )
            .unwrap();
        }
        writeln!(f, "Loop time of 45.2 on 8 procs for {} steps", nsteps * 1000).unwrap();

        eprintln!(
            "  ✦ {} — D = {:.4e}, expected Eₐ = 0.35 eV",
            filename, d
        );
    }

    // Also generate a summary CSV for the scan command
    let mut summary = fs::File::create(out.join("arrhenius_summary.csv")).unwrap();
    writeln!(summary, "# Temperature(K), Diffusion_coefficient").unwrap();
    for &temp in &temperatures {
        let d = d0 * (-ea / (kb * temp)).exp();
        writeln!(summary, "{}, {:.8e}", temp, d).unwrap();
    }
    eprintln!("  ✦ arrhenius_summary.csv — 8 points for direct fitting");
}

// ─── 2. Power-Law Hardening (Hollomon) ───────────────────────────────────────
// σ = K · ε^n  where K = 500 MPa, n = 0.35 (typical steel)
// Plus elastic regime: σ = E · ε for ε < 0.002

fn gen_power_law_hardening(out: &Path) {
    let e_modulus = 200_000.0; // MPa (Young's modulus)
    let k = 500.0; // MPa (strength coefficient)
    let n = 0.35; // hardening exponent
    let yield_strain = 0.002;

    let mut f = fs::File::create(out.join("stress_strain.log")).unwrap();
    writeln!(f, "LAMMPS (2 Aug 2023)").unwrap();
    writeln!(f, "# Uniaxial tension simulation").unwrap();
    writeln!(f, "# Known: σ = {} · ε^{} (Hollomon), E = {} MPa", k, n, e_modulus).unwrap();
    writeln!(f).unwrap();

    writeln!(f, "Step v_strain Pxx Temp Lx").unwrap();

    let nsteps = 200;
    let l0 = 100.0; // Initial box length
    for i in 0..=nsteps {
        let strain = i as f64 * 0.001; // 0 to 0.2
        let step = i * 500;

        let stress = if strain < yield_strain {
            e_modulus * strain
        } else {
            k * strain.powf(n)
        };

        let noise = ((step as f64 * 0.017).sin()) * stress * 0.01;
        let lx = l0 * (1.0 + strain);
        let temp = 300.0 + ((step as f64 * 0.003).sin()) * 5.0;

        writeln!(
            f,
            "{} {:.6} {:.4} {:.2} {:.6}",
            step,
            strain,
            stress + noise,
            temp,
            lx
        )
        .unwrap();
    }
    writeln!(f, "Loop time of 120.5 on 16 procs").unwrap();

    eprintln!("  ✦ stress_strain.log — K={}, n={}, E={}", k, n, e_modulus);
}

// ─── 3. Anomalous Diffusion Trajectory ───────────────────────────────────────
// MSD ∝ t^β with β = 0.72 (subdiffusion in porous medium)

fn gen_anomalous_diffusion_trajectory(out: &Path) {
    let beta = 0.72;
    let d_eff = 0.015; // effective diffusion prefactor
    let natoms = 100;
    let box_size = 20.0;

    let mut f = fs::File::create(out.join("anomalous_diffusion.dump")).unwrap();

    // Generate initial positions
    let mut positions: Vec<(f64, f64, f64)> = Vec::new();
    for i in 0..natoms {
        let seed = i as f64;
        let x = (seed * 7.13 + 0.5) % box_size;
        let y = (seed * 11.37 + 1.3) % box_size;
        let z = (seed * 3.71 + 2.1) % box_size;
        positions.push((x, y, z));
    }

    let nframes = 50;
    for frame in 0..nframes {
        let timestep = frame * 100;
        let t = timestep as f64;

        writeln!(f, "ITEM: TIMESTEP").unwrap();
        writeln!(f, "{}", timestep).unwrap();
        writeln!(f, "ITEM: NUMBER OF ATOMS").unwrap();
        writeln!(f, "{}", natoms).unwrap();
        writeln!(f, "ITEM: BOX BOUNDS pp pp pp").unwrap();
        writeln!(f, "0.0 {}", box_size).unwrap();
        writeln!(f, "0.0 {}", box_size).unwrap();
        writeln!(f, "0.0 {}", box_size).unwrap();
        writeln!(f, "ITEM: ATOMS id type xu yu zu").unwrap();

        for i in 0..natoms {
            let (x0, y0, z0) = positions[i];

            // Displacement follows MSD ∝ t^β
            // Each atom gets displacement ~ sqrt(2 * D_eff * t^β / 3) per dimension
            let msd_per_dim = if t > 0.0 {
                d_eff * t.powf(beta) / 3.0
            } else {
                0.0
            };

            let disp = msd_per_dim.sqrt();
            // Deterministic "random" displacement using seed
            let phi = (i as f64 * 2.718 + frame as f64 * 1.414) % 6.283;
            let theta = (i as f64 * 3.14 + frame as f64 * 0.577) % 3.14;

            let dx = disp * phi.cos() * theta.sin();
            let dy = disp * phi.sin() * theta.sin();
            let dz = disp * theta.cos();

            // Use unwrapped coordinates (xu, yu, zu) — no PBC wrapping
            let x = x0 + dx;
            let y = y0 + dy;
            let z = z0 + dz;

            writeln!(f, "{} 1 {:.6} {:.6} {:.6}", i + 1, x, y, z).unwrap();
        }
    }

    eprintln!("  ✦ anomalous_diffusion.dump — β={}, {} frames, {} atoms", beta, nframes, natoms);
}

// ─── 4. LJ Equation of State ────────────────────────────────────────────────
// P = ρkT + (2π/3)ρ² ∫ r g(r) du/dr r² dr ≈ ρkT(1 + B₂ρ + ...)
// Multiple density runs showing departure from ideal gas

fn gen_lj_equation_of_state(out: &Path) {
    let mut f = fs::File::create(out.join("lj_eos.log")).unwrap();
    writeln!(f, "LAMMPS (2 Aug 2023)").unwrap();
    writeln!(f, "# LJ equation of state: pressure vs density at T* = 1.5").unwrap();
    writeln!(f).unwrap();

    let t_star = 1.5; // Reduced temperature
    let b2 = -1.3; // Second virial coefficient at T* = 1.5 (approximate)

    writeln!(f, "Step Density Press Temp Volume PotEng TotEng").unwrap();

    let densities: Vec<f64> = (1..=25).map(|i| i as f64 * 0.04).collect(); // 0.04 to 1.0

    for (i, &rho) in densities.iter().enumerate() {
        let step = i * 10000;

        // Virial equation: P* = ρ*T*(1 + B₂*ρ* + B₃*ρ*²)
        let b3 = 0.3;
        let p = rho * t_star * (1.0 + b2 * rho + b3 * rho * rho);
        let volume = 1000.0 / rho;
        let pe = -rho * 4.0 * (rho.powf(3.0) - rho.powf(1.5)); // approximate LJ
        let ke = 1.5 * t_star;
        let noise = ((step as f64 * 0.0099).sin()) * p.abs() * 0.02;

        writeln!(
            f,
            "{} {:.6} {:.6} {:.4} {:.4} {:.6} {:.6}",
            step,
            rho,
            p + noise,
            t_star + ((step as f64 * 0.0019).sin()) * 0.03,
            volume,
            pe,
            pe + ke
        )
        .unwrap();
    }
    writeln!(f, "Loop time of 350.0 on 32 procs").unwrap();

    eprintln!("  ✦ lj_eos.log — virial EOS, T*={}, B₂={}", t_star, b2);
}

// ─── 5. Shear Thinning (Power Law Fluid) ─────────────────────────────────────
// η = K · γ̇^(n-1)   (Ostwald–de Waele)
// K = 100 Pa·s, n = 0.6 (shear thinning)

fn gen_shear_thinning(out: &Path) {
    let k = 100.0;
    let n = 0.6;

    let mut f = fs::File::create(out.join("shear_thinning.log")).unwrap();
    writeln!(f, "LAMMPS (2 Aug 2023)").unwrap();
    writeln!(f, "# NEMD shear viscosity measurement").unwrap();
    writeln!(f, "# Known: η = {} · γ̇^{} (Ostwald–de Waele)", k, n - 1.0).unwrap();
    writeln!(f).unwrap();

    writeln!(f, "Step v_shear_rate v_viscosity Temp Pxy Press").unwrap();

    let shear_rates: Vec<f64> = (1..=30)
        .map(|i| 10.0f64.powf(-4.0 + i as f64 * 0.2))
        .collect();

    for (i, &gamma_dot) in shear_rates.iter().enumerate() {
        let step = i * 5000;
        let viscosity = k * gamma_dot.powf(n - 1.0);
        let stress = viscosity * gamma_dot;
        let noise = ((step as f64 * 0.013).sin()) * viscosity * 0.03;
        let temp = 300.0 + ((step as f64 * 0.0051).sin()) * 3.0;

        writeln!(
            f,
            "{} {:.8e} {:.8e} {:.4} {:.6e} {:.4}",
            step,
            gamma_dot,
            viscosity + noise,
            temp,
            stress,
            1.0 + ((step as f64 * 0.0071).sin()) * 0.5
        )
        .unwrap();
    }
    writeln!(f, "Loop time of 890.0 on 64 procs").unwrap();

    // Also as CSV for direct fitting
    let mut csv = fs::File::create(out.join("shear_thinning.csv")).unwrap();
    writeln!(csv, "# shear_rate, viscosity").unwrap();
    for &gamma_dot in &shear_rates {
        let viscosity = k * gamma_dot.powf(n - 1.0);
        writeln!(csv, "{:.8e}, {:.8e}", gamma_dot, viscosity).unwrap();
    }

    eprintln!("  ✦ shear_thinning.log — K={}, n={}", k, n);
}

// ─── 6. Thermal Expansion ────────────────────────────────────────────────────
// ρ(T) = ρ₀ · (1 - α·(T - T₀))  linear approximation
// α = 3.5e-5 K⁻¹ (copper-like), ρ₀ = 8.96 g/cm³

fn gen_thermal_expansion(out: &Path) {
    let rho0 = 8.96;
    let alpha = 3.5e-5;
    let t0 = 300.0;

    let mut f = fs::File::create(out.join("thermal_expansion.log")).unwrap();
    writeln!(f, "LAMMPS (2 Aug 2023)").unwrap();
    writeln!(f, "# NPT thermal expansion simulation").unwrap();
    writeln!(f, "# Known: ρ(T) = {} · (1 - {} · (T - {}))", rho0, alpha, t0).unwrap();
    writeln!(f).unwrap();

    writeln!(f, "Step Temp Density Volume Press Lx Ly Lz").unwrap();

    let temps: Vec<f64> = (0..=35).map(|i| 300.0 + i as f64 * 30.0).collect(); // 300 to 1350 K

    for (i, &temp) in temps.iter().enumerate() {
        let step = i * 20000;
        let rho = rho0 * (1.0 - alpha * (temp - t0));
        let n_atoms = 4000.0;
        let mass_cu = 63.546; // g/mol
        let volume_ang3 = n_atoms * mass_cu / (rho * 6.022e23) * 1e24; // Å³
        let l = volume_ang3.powf(1.0 / 3.0);
        let noise = ((step as f64 * 0.0023).sin()) * rho * 0.001;
        let press_noise = ((step as f64 * 0.0037).sin()) * 5.0;

        writeln!(
            f,
            "{} {:.2} {:.6} {:.4} {:.4} {:.4} {:.4} {:.4}",
            step,
            temp,
            rho + noise,
            volume_ang3,
            press_noise,
            l,
            l,
            l
        )
        .unwrap();
    }
    writeln!(f, "Loop time of 2500.0 on 128 procs").unwrap();

    eprintln!("  ✦ thermal_expansion.log — α={:.1e}, ρ₀={}", alpha, rho0);
}

// ─── 7. Multi-File Temperature Sweep ─────────────────────────────────────────
// For the `scan` command: separate log files at each T

fn gen_temperature_sweep_multi(out: &Path) {
    let sweep_dir = out.join("temp_sweep");
    fs::create_dir_all(&sweep_dir).unwrap();

    let d0 = 1.2e-4;
    let ea = 0.42; // eV
    let kb = 8.617333e-5;

    let temperatures = [400.0, 500.0, 600.0, 700.0, 800.0, 900.0, 1000.0, 1100.0, 1200.0];

    for &temp in &temperatures {
        let d = d0 * ((-ea / (kb * temp)) as f64).exp();
        let filename = format!("run_{}K.log", temp as i32);
        let mut f = fs::File::create(sweep_dir.join(&filename)).unwrap();

        writeln!(f, "LAMMPS (2 Aug 2023)").unwrap();
        writeln!(f).unwrap();
        writeln!(f, "Step Temp v_diffusion PotEng TotEng Press").unwrap();

        // Each run has 100 steps with equilibrated diffusion
        for i in 0..=100 {
            let step = i * 1000;
            let temp_fluct = temp + ((step as f64 * 0.0031).sin()) * temp * 0.01;
            let d_fluct = d * (1.0 + ((step as f64 * 0.0043).sin()) * 0.05);
            let pe = -4.5 + 0.002 * temp;
            let ke = 1.5 * kb * temp_fluct / 0.001;

            writeln!(
                f,
                "{} {:.4} {:.8e} {:.6} {:.6} {:.4}",
                step,
                temp_fluct,
                d_fluct,
                pe,
                pe + ke,
                -1.0 + 0.005 * temp
            )
            .unwrap();
        }
        writeln!(f, "Loop time of 60.0 on 8 procs").unwrap();
    }

    eprintln!(
        "  ✦ temp_sweep/ — {} runs, Eₐ = {} eV",
        temperatures.len(),
        ea
    );
}

// ─── 8. Grain Growth Kinetics ────────────────────────────────────────────────
// d² - d₀² = K · t  (parabolic grain growth law)
// K = 2.5 nm²/ps

fn gen_grain_growth_kinetics(out: &Path) {
    let d0 = 5.0; // nm (initial grain diameter)
    let k_growth = 2.5; // nm²/ps

    let mut f = fs::File::create(out.join("grain_growth.log")).unwrap();
    writeln!(f, "LAMMPS (2 Aug 2023)").unwrap();
    writeln!(f, "# Grain growth simulation at 800 K").unwrap();
    writeln!(f, "# Known: d² - d₀² = K·t, K = {} nm²/ps", k_growth).unwrap();
    writeln!(f).unwrap();

    writeln!(f, "Step Temp v_grain_size v_num_grains PotEng").unwrap();

    let nsteps = 40;
    for i in 0..=nsteps {
        let step = i * 25000;
        let t = step as f64 * 0.001; // time in ps

        // d² = d₀² + K*t
        let d2 = d0 * d0 + k_growth * t;
        let d = d2.sqrt();

        // Number of grains ~ 1/d³ (volume argument)
        let n_grains = (1000.0 * d0.powi(3) / d.powi(3)).round().max(1.0);

        let noise = ((step as f64 * 0.0067).sin()) * d * 0.02;
        let pe = -3.8 + 0.001 * t;

        writeln!(
            f,
            "{} {:.2} {:.6} {:.0} {:.6}",
            step,
            800.0 + ((step as f64 * 0.0011).sin()) * 5.0,
            d + noise,
            n_grains,
            pe
        )
        .unwrap();
    }
    writeln!(f, "Loop time of 4500.0 on 256 procs").unwrap();

    eprintln!("  ✦ grain_growth.log — parabolic law, K={} nm²/ps", k_growth);
}

// ─── 9. Nucleation Barrier (CNT) ────────────────────────────────────────────
// ΔG(r) = -4/3·π·r³·Δgᵥ + 4π·r²·γ  (classical nucleation theory)
// Critical radius: r* = 2γ/Δgᵥ

fn gen_nucleation_barrier(out: &Path) {
    let gamma = 0.15; // J/m² (surface energy)
    let delta_gv = 0.08; // J/m³·nm⁻³ → using reduced units

    // Output as CSV: radius vs free energy
    let mut f = fs::File::create(out.join("nucleation_barrier.csv")).unwrap();
    writeln!(f, "# radius_nm, delta_G_reduced").unwrap();
    writeln!(f, "# Known: ΔG = -4/3·π·r³·{} + 4π·r²·{}", delta_gv, gamma).unwrap();
    writeln!(f, "# Critical radius r* = {:.4} nm", 2.0 * gamma / delta_gv).unwrap();

    for i in 1..=50 {
        let r = i as f64 * 0.1; // 0.1 to 5.0 nm
        let volume_term = -(4.0 / 3.0) * std::f64::consts::PI * r.powi(3) * delta_gv;
        let surface_term = 4.0 * std::f64::consts::PI * r.powi(2) * gamma;
        let dg = volume_term + surface_term;

        writeln!(f, "{:.2}, {:.6}", r, dg).unwrap();
    }

    eprintln!(
        "  ✦ nucleation_barrier.csv — CNT, γ={}, Δgᵥ={}, r*={:.2} nm",
        gamma,
        delta_gv,
        2.0 * gamma / delta_gv
    );
}
