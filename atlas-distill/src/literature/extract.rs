//! Numeric value extraction from scientific text using regex patterns.
//!
//! Extracts reported quantities (diffusion coefficients, activation energies,
//! elastic moduli, scaling exponents, temperatures, system sizes) from paper
//! abstracts and text.

use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// A single numeric value extracted from scientific text.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedValue {
    pub paper_id: String,
    pub quantity: String,
    pub value: f64,
    pub unit: String,
    pub conditions: HashMap<String, f64>,
    pub context: String,
}

/// All extraction patterns for MD-relevant quantities.
struct Patterns {
    diffusion: Regex,
    activation_energy: Regex,
    youngs_modulus: Regex,
    bulk_modulus: Regex,
    shear_modulus: Regex,
    scaling_exponent: Regex,
    temperature: Regex,
    pressure: Regex,
    system_size: Regex,
    timestep: Regex,
    density: Regex,
    viscosity: Regex,
    thermal_conductivity: Regex,
    surface_energy: Regex,
    lattice_constant: Regex,
    melting_point: Regex,
    speedup: Regex,
    r_squared: Regex,
    bond_energy: Regex,
    coordination_number: Regex,
}

impl Patterns {
    fn new() -> Self {
        Self {
            // D = 2.5 × 10⁻⁵ cm²/s, D = 1.2e-9 m²/s
            // After normalization: × → stays, ⁻ → -, ² → 2
            diffusion: Regex::new(
                r"(?i)(?:diffusion\s+coefficient|diffusivity|D)\s*(?:=|≈|~|is\s+)\s*([\d.]+)\s*[×xX*]\s*10[\-](\d+)\s*(cm2/s|m2/s|cm²/s|m²/s|Å2/ps|Å²/ps)"
            ).unwrap(),
            // Ea = 0.35 eV, activation energy of 0.5 eV
            activation_energy: Regex::new(
                r"(?i)(?:activation\s+energy|E[_a]|Ea)\s*(?:=|≈|~|of\s+|is\s+)\s*([\d.]+)\s*(eV|kJ/mol|kcal/mol|meV)"
            ).unwrap(),
            // E = 200 GPa, Young's modulus of 70 GPa
            youngs_modulus: Regex::new(
                r"(?i)(?:Young'?s?\s+modulus|elastic\s+modulus|E)\s*(?:=|≈|~|of\s+|is\s+)\s*([\d.]+)\s*(GPa|MPa|TPa)"
            ).unwrap(),
            // B = 160 GPa, bulk modulus
            bulk_modulus: Regex::new(
                r"(?i)(?:bulk\s+modulus|B[_0]?)\s*(?:=|≈|~|of\s+|is\s+)\s*([\d.]+)\s*(GPa|MPa)"
            ).unwrap(),
            // G = 80 GPa, shear modulus
            shear_modulus: Regex::new(
                r"(?i)(?:shear\s+modulus|G)\s*(?:=|≈|~|of\s+|is\s+)\s*([\d.]+)\s*(GPa|MPa)"
            ).unwrap(),
            // exponent = 0.72, β = 0.58, "with exponent β = 0.72"
            // Note: match "exponent" keyword alone OR β/α with = sign
            scaling_exponent: Regex::new(
                r"(?i)(?:exponent\s+(?:β|α|n|ν)\s*(?:=|≈|~|is\s+|of\s+)\s*|(?:exponent|β|α)\s*(?:=|≈|~|is\s+|of\s+)\s*)([\d.]+)"
            ).unwrap(),
            // T = 300 K, temperature of 1000 K, 300–1000 K
            temperature: Regex::new(
                r"(?i)(?:temperature|T)\s*(?:=|≈|~|of\s+|is\s+)\s*([\d.]+)\s*K"
            ).unwrap(),
            // P = 1.5 GPa, pressure of 10 GPa
            pressure: Regex::new(
                r"(?i)(?:pressure|P)\s*(?:=|≈|~|of\s+|is\s+)\s*([\d.]+)\s*(GPa|MPa|atm|bar)"
            ).unwrap(),
            // 4000 atoms, 10000 particles, 500 molecules
            system_size: Regex::new(
                r"([\d,]+)\s*(atoms|particles|molecules)"
            ).unwrap(),
            // 1 ns, 100 ps, 10 fs, 0.5 μs
            timestep: Regex::new(
                r"([\d.]+)\s*(ns|ps|fs|μs|microseconds?|nanoseconds?|picoseconds?|femtoseconds?)"
            ).unwrap(),
            // ρ = 8.96 g/cm³, density of 2.7 g/cm³
            density: Regex::new(
                r"(?i)(?:density|ρ)\s*(?:=|≈|~|of\s+|is\s+)\s*([\d.]+)\s*(g/cm³|kg/m³|atoms/Å³)"
            ).unwrap(),
            // η = 1.5 mPa·s, viscosity of 0.89 cP
            viscosity: Regex::new(
                r"(?i)(?:viscosity|η)\s*(?:=|≈|~|of\s+|is\s+)\s*([\d.]+)\s*(mPa·s|Pa·s|cP|poise)"
            ).unwrap(),
            // κ = 400 W/(m·K), thermal conductivity
            thermal_conductivity: Regex::new(
                r"(?i)(?:thermal\s+conductivity|κ|λ)\s*(?:=|≈|~|of\s+|is\s+)\s*([\d.]+)\s*(W/\(?m·?K\)?|W/mK)"
            ).unwrap(),
            // γ = 1.5 J/m², surface energy
            surface_energy: Regex::new(
                r"(?i)(?:surface\s+energy|γ|interfacial\s+energy)\s*(?:=|≈|~|of\s+|is\s+)\s*([\d.]+)\s*(J/m²|mJ/m²|eV/Å²)"
            ).unwrap(),
            // a = 3.615 Å, lattice constant/parameter
            lattice_constant: Regex::new(
                r"(?i)(?:lattice\s+(?:constant|parameter)|a[_0]?)\s*(?:=|≈|~|of\s+|is\s+)\s*([\d.]+)\s*(Å|nm|pm)"
            ).unwrap(),
            // Tm = 1358 K, melting point/temperature
            melting_point: Regex::new(
                r"(?i)(?:melting\s+(?:point|temperature)|T[_m]|Tm)\s*(?:=|≈|~|of\s+|is\s+)\s*([\d.]+)\s*K"
            ).unwrap(),
            // 11x speedup, speedup of 5.3x
            speedup: Regex::new(
                r"(?i)(?:speedup|speed-up|acceleration)\s*(?:of\s+|=\s+|:\s+)?([\d.]+)\s*[×x]"
            ).unwrap(),
            // R² = 0.99, R-squared of 0.95
            r_squared: Regex::new(
                r"(?i)(?:R²|R-?squared|R\^2|coefficient\s+of\s+determination)\s*(?:=|≈|~|of\s+|is\s+)\s*([\d.]+)"
            ).unwrap(),
            // bond energy of -3.5 eV, E_bond = -2.1 eV
            bond_energy: Regex::new(
                r"(?i)(?:bond\s+energy|binding\s+energy|cohesive\s+energy|E_(?:bond|coh|b))\s*(?:=|≈|~|of\s+|is\s+)\s*(-?[\d.]+)\s*(eV|eV/atom|kJ/mol)"
            ).unwrap(),
            // CN = 12, coordination number of 4
            coordination_number: Regex::new(
                r"(?i)(?:coordination\s+number|CN)\s*(?:=|≈|~|of\s+|is\s+)\s*([\d.]+)"
            ).unwrap(),
        }
    }
}

/// Normalize Unicode superscripts to ASCII for regex matching.
fn normalize_superscripts(text: &str) -> String {
    text.replace('⁰', "0")
        .replace('¹', "1")
        .replace('²', "2")
        .replace('³', "3")
        .replace('⁴', "4")
        .replace('⁵', "5")
        .replace('⁶', "6")
        .replace('⁷', "7")
        .replace('⁸', "8")
        .replace('⁹', "9")
        .replace('⁻', "-")
        .replace('⁺', "+")
}

/// Extract all numeric values from a piece of scientific text.
pub fn extract_values(paper_id: &str, text: &str) -> Vec<ExtractedValue> {
    let pat = Patterns::new();
    let mut values = Vec::new();

    // Normalize Unicode superscripts for matching
    let normalized = normalize_superscripts(text);
    let text_n = &normalized;

    // Diffusion coefficient
    for cap in pat.diffusion.captures_iter(text_n) {
        let mantissa: f64 = cap[1].parse().unwrap_or(0.0);
        let exp: i32 = cap[2].parse().unwrap_or(0);
        let val = mantissa * 10.0f64.powi(-exp);
        let context = extract_context(text_n, cap.get(0).unwrap().start());
        values.push(ExtractedValue {
            paper_id: paper_id.to_string(),
            quantity: "diffusion_coefficient".to_string(),
            value: val,
            unit: cap[3].to_string(),
            conditions: HashMap::new(),
            context,
        });
    }

    // Activation energy
    for cap in pat.activation_energy.captures_iter(text_n) {
        let val: f64 = cap[1].parse().unwrap_or(0.0);
        let unit = cap[2].to_string();
        let context = extract_context(text_n, cap.get(0).unwrap().start());
        values.push(ExtractedValue {
            paper_id: paper_id.to_string(),
            quantity: "activation_energy".to_string(),
            value: val,
            unit,
            conditions: HashMap::new(),
            context,
        });
    }

    // Young's modulus
    for cap in pat.youngs_modulus.captures_iter(text_n) {
        let val: f64 = cap[1].parse().unwrap_or(0.0);
        let unit = cap[2].to_string();
        let context = extract_context(text_n, cap.get(0).unwrap().start());
        values.push(ExtractedValue {
            paper_id: paper_id.to_string(),
            quantity: "youngs_modulus".to_string(),
            value: val,
            unit,
            conditions: HashMap::new(),
            context,
        });
    }

    // Bulk modulus
    for cap in pat.bulk_modulus.captures_iter(text_n) {
        let val: f64 = cap[1].parse().unwrap_or(0.0);
        let unit = cap[2].to_string();
        let context = extract_context(text_n, cap.get(0).unwrap().start());
        values.push(ExtractedValue {
            paper_id: paper_id.to_string(),
            quantity: "bulk_modulus".to_string(),
            value: val,
            unit,
            conditions: HashMap::new(),
            context,
        });
    }

    // Scaling exponent
    for cap in pat.scaling_exponent.captures_iter(text_n) {
        let val: f64 = cap[1].parse().unwrap_or(0.0);
        // Filter out obviously non-exponent values
        if val > 0.0 && val < 10.0 {
            let context = extract_context(text_n, cap.get(0).unwrap().start());
            values.push(ExtractedValue {
                paper_id: paper_id.to_string(),
                quantity: "scaling_exponent".to_string(),
                value: val,
                unit: "dimensionless".to_string(),
                conditions: HashMap::new(),
                context,
            });
        }
    }

    // Temperature
    for cap in pat.temperature.captures_iter(text_n) {
        let val: f64 = cap[1].parse().unwrap_or(0.0);
        if val > 0.0 && val < 50000.0 {
            let context = extract_context(text_n, cap.get(0).unwrap().start());
            values.push(ExtractedValue {
                paper_id: paper_id.to_string(),
                quantity: "temperature".to_string(),
                value: val,
                unit: "K".to_string(),
                conditions: HashMap::new(),
                context,
            });
        }
    }

    // System size
    for cap in pat.system_size.captures_iter(text_n) {
        let val_str = cap[1].replace(',', "");
        let val: f64 = val_str.parse().unwrap_or(0.0);
        if val > 0.0 {
            let context = extract_context(text_n, cap.get(0).unwrap().start());
            values.push(ExtractedValue {
                paper_id: paper_id.to_string(),
                quantity: "system_size".to_string(),
                value: val,
                unit: cap[2].to_string(),
                conditions: HashMap::new(),
                context,
            });
        }
    }

    // Speedup
    for cap in pat.speedup.captures_iter(text_n) {
        let val: f64 = cap[1].parse().unwrap_or(0.0);
        if val > 1.0 {
            let context = extract_context(text_n, cap.get(0).unwrap().start());
            values.push(ExtractedValue {
                paper_id: paper_id.to_string(),
                quantity: "speedup".to_string(),
                value: val,
                unit: "x".to_string(),
                conditions: HashMap::new(),
                context,
            });
        }
    }

    // Surface energy
    for cap in pat.surface_energy.captures_iter(text_n) {
        let val: f64 = cap[1].parse().unwrap_or(0.0);
        let unit = cap[2].to_string();
        let context = extract_context(text_n, cap.get(0).unwrap().start());
        values.push(ExtractedValue {
            paper_id: paper_id.to_string(),
            quantity: "surface_energy".to_string(),
            value: val,
            unit,
            conditions: HashMap::new(),
            context,
        });
    }

    // Melting point
    for cap in pat.melting_point.captures_iter(text_n) {
        let val: f64 = cap[1].parse().unwrap_or(0.0);
        if val > 100.0 {
            let context = extract_context(text_n, cap.get(0).unwrap().start());
            values.push(ExtractedValue {
                paper_id: paper_id.to_string(),
                quantity: "melting_point".to_string(),
                value: val,
                unit: "K".to_string(),
                conditions: HashMap::new(),
                context,
            });
        }
    }

    // Lattice constant
    for cap in pat.lattice_constant.captures_iter(text_n) {
        let val: f64 = cap[1].parse().unwrap_or(0.0);
        let unit = cap[2].to_string();
        let context = extract_context(text_n, cap.get(0).unwrap().start());
        values.push(ExtractedValue {
            paper_id: paper_id.to_string(),
            quantity: "lattice_constant".to_string(),
            value: val,
            unit,
            conditions: HashMap::new(),
            context,
        });
    }

    // Viscosity
    for cap in pat.viscosity.captures_iter(text_n) {
        let val: f64 = cap[1].parse().unwrap_or(0.0);
        let unit = cap[2].to_string();
        let context = extract_context(text_n, cap.get(0).unwrap().start());
        values.push(ExtractedValue {
            paper_id: paper_id.to_string(),
            quantity: "viscosity".to_string(),
            value: val,
            unit,
            conditions: HashMap::new(),
            context,
        });
    }

    // Thermal conductivity
    for cap in pat.thermal_conductivity.captures_iter(text_n) {
        let val: f64 = cap[1].parse().unwrap_or(0.0);
        let unit = cap[2].to_string();
        let context = extract_context(text_n, cap.get(0).unwrap().start());
        values.push(ExtractedValue {
            paper_id: paper_id.to_string(),
            quantity: "thermal_conductivity".to_string(),
            value: val,
            unit,
            conditions: HashMap::new(),
            context,
        });
    }

    values
}

/// Loose extraction patterns for abstract-level text.
///
/// Abstracts use informal numeric language: "623 K", "9.8 GPa", "11x",
/// "8,000 atoms" without formal prefixes like "temperature T = ...".
pub fn extract_values_loose(paper_id: &str, text: &str) -> Vec<ExtractedValue> {
    let normalized = normalize_superscripts(text);
    let text_n = &normalized;
    let mut values = Vec::new();

    // Bare temperature: any number followed by K (but not part of a word)
    let re_temp = Regex::new(r"(\d[\d,.]*)\s*K\b").unwrap();
    for cap in re_temp.captures_iter(text_n) {
        let val_str = cap[1].replace(',', "");
        if let Ok(val) = val_str.parse::<f64>() {
            if (77.0..=50000.0).contains(&val) {
                values.push(ExtractedValue {
                    paper_id: paper_id.to_string(),
                    quantity: "temperature".to_string(),
                    value: val,
                    unit: "K".to_string(),
                    conditions: HashMap::new(),
                    context: extract_context(text_n, cap.get(0).unwrap().start()),
                });
            }
        }
    }

    // Bare pressure: number followed by GPa or MPa
    let re_press = Regex::new(r"(\d[\d.]*)\s*(GPa|MPa)").unwrap();
    for cap in re_press.captures_iter(text_n) {
        if let Ok(val) = cap[1].parse::<f64>() {
            values.push(ExtractedValue {
                paper_id: paper_id.to_string(),
                quantity: "pressure".to_string(),
                value: val,
                unit: cap[2].to_string(),
                conditions: HashMap::new(),
                context: extract_context(text_n, cap.get(0).unwrap().start()),
            });
        }
    }

    // Bare energy: number followed by eV, meV, kcal/mol, kJ/mol
    let re_energy = Regex::new(r"(\d[\d.]*)\s*(eV|meV|kcal/mol|kJ/mol)").unwrap();
    for cap in re_energy.captures_iter(text_n) {
        if let Ok(val) = cap[1].parse::<f64>() {
            values.push(ExtractedValue {
                paper_id: paper_id.to_string(),
                quantity: "energy".to_string(),
                value: val,
                unit: cap[2].to_string(),
                conditions: HashMap::new(),
                context: extract_context(text_n, cap.get(0).unwrap().start()),
            });
        }
    }

    // Speedup multiplier: "Nx", "N×", "Nx speedup", "up to Nx"
    let re_speedup = Regex::new(r"(\d[\d.]*)\s*[×xX]\b").unwrap();
    for cap in re_speedup.captures_iter(text_n) {
        if let Ok(val) = cap[1].parse::<f64>() {
            if (1.1..=10000.0).contains(&val) {
                values.push(ExtractedValue {
                    paper_id: paper_id.to_string(),
                    quantity: "speedup".to_string(),
                    value: val,
                    unit: "x".to_string(),
                    conditions: HashMap::new(),
                    context: extract_context(text_n, cap.get(0).unwrap().start()),
                });
            }
        }
    }

    // System size: bare "N atoms/particles/molecules"
    let re_size = Regex::new(r"([\d,]+)\s*(atoms?|particles?|molecules?)").unwrap();
    for cap in re_size.captures_iter(text_n) {
        let val_str = cap[1].replace(',', "");
        if let Ok(val) = val_str.parse::<f64>() {
            if val >= 10.0 {
                values.push(ExtractedValue {
                    paper_id: paper_id.to_string(),
                    quantity: "system_size".to_string(),
                    value: val,
                    unit: "atoms".to_string(),
                    conditions: HashMap::new(),
                    context: extract_context(text_n, cap.get(0).unwrap().start()),
                });
            }
        }
    }

    // Percentage claims: "N%" or "N percent"
    let re_pct = Regex::new(r"(\d[\d.]*)\s*(?:%|percent)").unwrap();
    for cap in re_pct.captures_iter(text_n) {
        if let Ok(val) = cap[1].parse::<f64>() {
            if val > 0.0 && val <= 100.0 {
                values.push(ExtractedValue {
                    paper_id: paper_id.to_string(),
                    quantity: "percentage".to_string(),
                    value: val,
                    unit: "%".to_string(),
                    conditions: HashMap::new(),
                    context: extract_context(text_n, cap.get(0).unwrap().start()),
                });
            }
        }
    }

    // Time scales: "N ns/ps/fs/μs"
    let re_time = Regex::new(r"(\d[\d.]*)\s*(ns|ps|fs|μs)").unwrap();
    for cap in re_time.captures_iter(text_n) {
        if let Ok(val) = cap[1].parse::<f64>() {
            values.push(ExtractedValue {
                paper_id: paper_id.to_string(),
                quantity: "simulation_time".to_string(),
                value: val,
                unit: cap[2].to_string(),
                conditions: HashMap::new(),
                context: extract_context(text_n, cap.get(0).unwrap().start()),
            });
        }
    }

    // Length scales: "N nm/Å/pm"
    let re_len = Regex::new(r"(\d[\d.]*)\s*(nm|Å|pm)\b").unwrap();
    for cap in re_len.captures_iter(text_n) {
        if let Ok(val) = cap[1].parse::<f64>() {
            values.push(ExtractedValue {
                paper_id: paper_id.to_string(),
                quantity: "length".to_string(),
                value: val,
                unit: cap[2].to_string(),
                conditions: HashMap::new(),
                context: extract_context(text_n, cap.get(0).unwrap().start()),
            });
        }
    }

    // Deduplicate: prefer the first match for identical (quantity, value) pairs
    values.sort_by(|a, b| {
        a.quantity.cmp(&b.quantity).then(
            a.value
                .partial_cmp(&b.value)
                .unwrap_or(std::cmp::Ordering::Equal),
        )
    });
    values.dedup_by(|a, b| a.quantity == b.quantity && (a.value - b.value).abs() < 1e-10);

    values
}

/// Combine strict and loose extraction (deduplicated).
pub fn extract_all(paper_id: &str, text: &str) -> Vec<ExtractedValue> {
    let mut values = extract_values(paper_id, text);
    let loose = extract_values_loose(paper_id, text);

    // Add loose values that weren't already captured by strict patterns
    for lv in loose {
        let already = values
            .iter()
            .any(|v| v.quantity == lv.quantity && (v.value - lv.value).abs() < 1e-10);
        if !already {
            values.push(lv);
        }
    }

    values
}

/// Extract ~100 chars of context around a match position.
fn extract_context(text: &str, pos: usize) -> String {
    let start = pos.saturating_sub(50);
    let end = (pos + 100).min(text.len());
    // Find character boundaries
    let start = text[..=start]
        .rfind(char::is_whitespace)
        .map(|p| p + 1)
        .unwrap_or(start);
    let end = text[end..]
        .find(char::is_whitespace)
        .map(|p| p + end)
        .unwrap_or(end);
    text[start..end].to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_diffusion() {
        let text = "The self-diffusion coefficient D = 2.5 × 10⁻⁵ cm²/s was measured at 300 K.";
        let vals = extract_values("P01", text);
        let diff: Vec<_> = vals
            .iter()
            .filter(|v| v.quantity == "diffusion_coefficient")
            .collect();
        assert_eq!(diff.len(), 1);
        assert!((diff[0].value - 2.5e-5).abs() < 1e-10);
        // After normalization, ² → 2
        assert_eq!(diff[0].unit, "cm2/s");
    }

    #[test]
    fn test_extract_activation_energy() {
        let text = "We find an activation energy Ea = 0.35 eV for vacancy migration.";
        let vals = extract_values("P02", text);
        let ea: Vec<_> = vals
            .iter()
            .filter(|v| v.quantity == "activation_energy")
            .collect();
        assert_eq!(ea.len(), 1);
        assert!((ea[0].value - 0.35).abs() < 1e-10);
    }

    #[test]
    fn test_extract_system_size() {
        let text = "Simulations were performed with 4,000 atoms over 100 ns.";
        let vals = extract_values("P03", text);
        let size: Vec<_> = vals
            .iter()
            .filter(|v| v.quantity == "system_size")
            .collect();
        assert_eq!(size.len(), 1);
        assert!((size[0].value - 4000.0).abs() < 1e-10);
    }

    #[test]
    fn test_extract_scaling_exponent() {
        let text = "The exponent β = 0.72 indicates subdiffusion.";
        let vals = extract_values("P04", text);
        let exp: Vec<_> = vals
            .iter()
            .filter(|v| v.quantity == "scaling_exponent")
            .collect();
        assert!(!exp.is_empty(), "Expected scaling exponent, got {:?}", vals);
        assert!((exp[0].value - 0.72).abs() < 1e-10);
    }

    #[test]
    fn test_extract_speedup() {
        let text = "ML-MIX achieves a speedup of 11.3x compared to the full model.";
        let vals = extract_values("P05", text);
        let sp: Vec<_> = vals.iter().filter(|v| v.quantity == "speedup").collect();
        assert_eq!(sp.len(), 1);
        assert!((sp[0].value - 11.3).abs() < 1e-10);
    }

    #[test]
    fn test_extract_temperature() {
        let text = "Simulations at T = 300 K showed normal diffusion.";
        let vals = extract_values("P06", text);
        let temps: Vec<_> = vals
            .iter()
            .filter(|v| v.quantity == "temperature")
            .collect();
        assert!(!temps.is_empty());
        assert!((temps[0].value - 300.0).abs() < 1e-10);
    }
}
