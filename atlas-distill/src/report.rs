//! Report generation — structured output for discoveries.

use crate::discovery::scan::Discovery;
use crate::observables::rdf;

/// Print a discovery to stdout with terminal formatting.
pub fn print_discovery(disc: &Discovery) {
    let r2_bar = r2_visual(disc.r_squared);
    let confidence = if disc.r_squared > 0.99 {
        "🟢 STRONG"
    } else if disc.r_squared > 0.95 {
        "🟡 GOOD"
    } else if disc.r_squared > 0.80 {
        "🔵 MODERATE"
    } else {
        "⚪ WEAK"
    };

    println!();
    println!("  ╔════════════════════════════════════════════════════════════╗");
    println!("  ║  {} vs {}", disc.x_label, disc.y_label);
    println!("  ╠════════════════════════════════════════════════════════════╣");
    println!("  ║  Model:    {}", disc.best_model);
    println!("  ║  Equation: {}", disc.equation);
    println!("  ║  R²:       {:.6}  {}", disc.r_squared, r2_bar);
    println!("  ║  RMS:      {:.6e}", disc.residual_rms);
    println!("  ║  N:        {}", disc.n_points);
    println!("  ║  Fit:      {}", confidence);

    if !disc.params.is_empty() {
        println!("  ║");
        println!("  ║  Parameters:");
        for (name, val) in disc.param_names.iter().zip(disc.params.iter()) {
            println!("  ║    {} = {:.6e}", name, val);
        }
    }

    if !disc.physical_note.is_empty() {
        println!("  ║");
        println!("  ║  ▸ {}", disc.physical_note);
    }

    println!("  ╚════════════════════════════════════════════════════════════╝");
}

/// Print RDF data summary.
pub fn print_rdf(rdf_data: &[(f64, f64)]) {
    println!();
    println!("  ╔════════════════════════════════════════════════════════════╗");
    println!("  ║  Radial Distribution Function");
    println!("  ╠════════════════════════════════════════════════════════════╣");
    println!("  ║  Bins: {}", rdf_data.len());

    let peaks = rdf::find_peaks(rdf_data, 1.2);
    if peaks.is_empty() {
        println!("  ║  No significant peaks found");
    } else {
        println!("  ║  Peaks:");
        for (i, (r, g)) in peaks.iter().enumerate() {
            let label = match i {
                0 => "1st neighbor",
                1 => "2nd neighbor",
                2 => "3rd neighbor",
                _ => "higher",
            };
            println!("  ║    r = {:.4} Å  g(r) = {:.3}  [{}]", r, g, label);
        }
    }

    // Print a simple ASCII g(r) plot
    println!("  ║");
    println!("  ║  g(r) profile:");

    let max_g = rdf_data
        .iter()
        .map(|(_, g)| *g)
        .fold(0.0f64, f64::max)
        .max(1.0);

    let plot_width = 40;
    let step = rdf_data.len() / 20; // Show ~20 rows
    let step = step.max(1);

    for i in (0..rdf_data.len()).step_by(step) {
        let (r, g) = rdf_data[i];
        let bar_len = ((g / max_g) * plot_width as f64) as usize;
        let bar: String = "█".repeat(bar_len);
        println!("  ║  {:6.2} │{}", r, bar);
    }

    println!("  ╚════════════════════════════════════════════════════════════╝");
}

/// Export all discoveries as JSON.
pub fn export_json(discoveries: &[Discovery]) -> String {
    serde_json::to_string_pretty(discoveries).unwrap_or_else(|_| "[]".to_string())
}

/// Export discoveries as markdown.
pub fn export_markdown(discoveries: &[Discovery]) -> String {
    let mut md = String::new();
    md.push_str("# Discovered Mathematical Relationships\n\n");

    for disc in discoveries {
        md.push_str(&format!("## {} vs {}\n\n", disc.x_label, disc.y_label));
        md.push_str(&format!("**Model:** {}\n\n", disc.best_model));
        md.push_str(&format!("$${}$$\n\n", disc.equation));
        md.push_str(&format!(
            "- R² = {:.6}\n- RMS = {:.4e}\n- N = {}\n",
            disc.r_squared, disc.residual_rms, disc.n_points
        ));

        if !disc.physical_note.is_empty() {
            md.push_str(&format!("\n> {}\n", disc.physical_note));
        }

        md.push_str("\n---\n\n");
    }

    md
}

fn r2_visual(r2: f64) -> String {
    let filled = (r2 * 20.0).round() as usize;
    let empty = 20 - filled.min(20);
    format!("[{}{}]", "█".repeat(filled), "░".repeat(empty))
}
