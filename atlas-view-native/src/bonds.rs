pub fn compute_bonds(positions: &[f32], types: &[i32], hidden_types: &std::collections::HashSet<i32>, cutoff: f32) -> (Vec<f32>, Vec<f32>) {
    let n = positions.len() / 3;
    let mut line_positions = Vec::new();
    let mut line_colors = Vec::new();
    
    if n == 0 { return (line_positions, line_colors); }
    
    // Cell list for O(N) bond computation
    let mut min_bound = [f32::MAX; 3];
    let mut max_bound = [f32::MIN; 3];
    for i in 0..n {
        for d in 0..3 {
            min_bound[d] = min_bound[d].min(positions[i * 3 + d]);
            max_bound[d] = max_bound[d].max(positions[i * 3 + d]);
        }
    }
    
    let cell_size = cutoff.max(0.1);
    let grid_size = [
        ((max_bound[0] - min_bound[0]) / cell_size).ceil().max(1.0) as usize,
        ((max_bound[1] - min_bound[1]) / cell_size).ceil().max(1.0) as usize,
        ((max_bound[2] - min_bound[2]) / cell_size).ceil().max(1.0) as usize,
    ];
    let mut cells: std::collections::HashMap<[usize; 3], Vec<usize>> = std::collections::HashMap::new();
    
    for i in 0..n {
        if hidden_types.contains(&types[i]) { continue; }
        
        // safe math: limit to grid bounds to prevent out of bounds panics
        let cx = (((positions[i * 3] - min_bound[0]) / cell_size) as usize).min(grid_size[0].saturating_sub(1));
        let cy = (((positions[i * 3 + 1] - min_bound[1]) / cell_size) as usize).min(grid_size[1].saturating_sub(1));
        let cz = (((positions[i * 3 + 2] - min_bound[2]) / cell_size) as usize).min(grid_size[2].saturating_sub(1));
        
        cells.entry([cx, cy, cz]).or_default().push(i);
    }
    
    let cutoff_sq = cutoff * cutoff;
    
    let get_color = |typ: i32| -> [f32; 4] {
        crate::coloring::color_for_type(typ)
    };
    
    for (&[cx, cy, cz], indices) in &cells {
        for &i in indices {
            let p1 = [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]];
            let c1 = get_color(types[i]);
            
            for dx in 0..=2 {
                for dy in 0..=2 {
                    for dz in 0..=2 {
                        let nx = cx.wrapping_add(dx).wrapping_sub(1);
                        let ny = cy.wrapping_add(dy).wrapping_sub(1);
                        let nz = cz.wrapping_add(dz).wrapping_sub(1);
                        
                        if let Some(neighbors) = cells.get(&[nx, ny, nz]) {
                            for &j in neighbors {
                                if j <= i { continue; } // no self, unique pairs
                                
                                let p2 = [positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]];
                                
                                let dist_sq = (p1[0] - p2[0]) * (p1[0] - p2[0]) +
                                              (p1[1] - p2[1]) * (p1[1] - p2[1]) +
                                              (p1[2] - p2[2]) * (p1[2] - p2[2]);
                                              
                                if dist_sq <= cutoff_sq {
                                    let c2 = get_color(types[j]);
                                    
                                    line_positions.extend_from_slice(&p1);
                                    line_colors.extend_from_slice(&c1);
                                    
                                    line_positions.extend_from_slice(&p2);
                                    line_colors.extend_from_slice(&c2);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    (line_positions, line_colors)
}
