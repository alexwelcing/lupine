/// CPK (Corey-Pauling-Koltun) element coloring and van der Waals radii.
/// Maps LAMMPS atom types to colors and radii for visualization.

/// Default atom colors by type index (RGBA, 0.0-1.0).
/// Type 1 = blue (often used for primary element), Type 2 = orange, etc.
pub const TYPE_COLORS: &[[f32; 4]] = &[
    [0.40, 0.60, 1.00, 1.0], // Type 1 — Steel Blue
    [1.00, 0.55, 0.15, 1.0], // Type 2 — Orange
    [0.30, 0.85, 0.45, 1.0], // Type 3 — Green
    [0.95, 0.30, 0.35, 1.0], // Type 4 — Red
    [0.70, 0.45, 0.90, 1.0], // Type 5 — Purple
    [1.00, 0.85, 0.25, 1.0], // Type 6 — Gold
    [0.35, 0.80, 0.85, 1.0], // Type 7 — Teal
    [0.90, 0.45, 0.70, 1.0], // Type 8 — Pink
    [0.55, 0.55, 0.55, 1.0], // Type 9 — Gray
    [0.85, 0.75, 0.60, 1.0], // Type 10 — Tan
];

/// Default atom radius by type index (Angstroms).
pub const TYPE_RADII: &[f32] = &[
    0.5, // Type 1
    0.6, // Type 2
    0.5, // Type 3
    0.4, // Type 4
    0.55, // Type 5
    0.65, // Type 6
    0.5, // Type 7
    0.45, // Type 8
    0.7, // Type 9
    0.5, // Type 10
];

/// Get color for an atom type (1-indexed, clamped to table size).
pub fn color_for_type(atom_type: i32) -> [f32; 4] {
    let idx = ((atom_type - 1).max(0) as usize) % TYPE_COLORS.len();
    TYPE_COLORS[idx]
}

/// Get radius for an atom type (1-indexed, clamped to table size).
pub fn radius_for_type(atom_type: i32) -> f32 {
    let idx = ((atom_type - 1).max(0) as usize) % TYPE_RADII.len();
    TYPE_RADII[idx]
}

/// Map velocity magnitude to color using blue-white-red diverging colormap.
/// Normalizes based on the velocity distribution in the current frame.
pub fn velocity_to_color(vmag: f32, all_velocities: &[f32]) -> [f32; 4] {
    if all_velocities.is_empty() {
        return [0.5, 0.5, 0.5, 1.0];
    }

    // Compute min/max for normalization
    let (min_v, max_v) = all_velocities.iter().fold((f32::MAX, f32::MIN), |(mn, mx), &v| {
        (mn.min(v), mx.max(v))
    });

    let range = (max_v - min_v).max(1e-6);
    let t = ((vmag - min_v) / range).clamp(0.0, 1.0);

    // Blue (slow) → White (median) → Red (fast)
    diverging_colormap(t)
}

/// Map a per-atom property to color using a viridis-like sequential colormap.
pub fn property_to_color(value: f32, all_values: &[f32]) -> [f32; 4] {
    if all_values.is_empty() {
        return [0.5, 0.5, 0.5, 1.0];
    }

    let (min_v, max_v) = all_values.iter().fold((f32::MAX, f32::MIN), |(mn, mx), &v| {
        (mn.min(v), mx.max(v))
    });

    let range = (max_v - min_v).max(1e-6);
    let t = ((value - min_v) / range).clamp(0.0, 1.0);

    // Viridis-inspired: purple → teal → yellow
    viridis_colormap(t)
}

/// Blue-white-red diverging colormap (good for velocities, signed quantities)
fn diverging_colormap(t: f32) -> [f32; 4] {
    let r: f32;
    let g: f32;
    let b: f32;

    if t < 0.5 {
        // Blue to white
        let s = t * 2.0;
        r = s;
        g = s;
        b = 1.0;
    } else {
        // White to red
        let s = (t - 0.5) * 2.0;
        r = 1.0;
        g = 1.0 - s;
        b = 1.0 - s;
    }

    [r, g, b, 1.0]
}

/// Viridis-inspired sequential colormap (good for energy, positive quantities)
fn viridis_colormap(t: f32) -> [f32; 4] {
    // Simplified viridis approximation
    let r = (0.267 + 0.329 * t + 2.758 * t * t - 4.579 * t * t * t + 2.225 * t * t * t * t).clamp(0.0, 1.0);
    let g = (0.004 + 1.415 * t - 0.884 * t * t + 0.317 * t * t * t).clamp(0.0, 1.0);
    let b = (0.329 + 1.439 * t - 2.089 * t * t + 1.011 * t * t * t).clamp(0.0, 1.0);

    [r, g, b, 1.0]
}
