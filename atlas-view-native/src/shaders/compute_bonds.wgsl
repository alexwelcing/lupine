// compute_bonds.wgsl
// Maps topological bond indices to 3D line geometries (vertex positions & colors).

struct Bond {
    atom1: u32,
    atom2: u32,
}

@group(0) @binding(0) var<storage, read> positions: array<f32>;
@group(0) @binding(1) var<storage, read> colors: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> topology: array<Bond>;

@group(1) @binding(0) var<storage, read_write> out_line_positions: array<vec3<f32>>;
@group(1) @binding(1) var<storage, read_write> out_line_colors: array<vec4<f32>>;

@compute @workgroup_size(64)
fn cs_main(
    @builtin(global_invocation_id) global_id: vec3<u32>
) {
    let index = global_id.x;
    let total_bonds = arrayLength(&topology);

    if (index >= total_bonds) {
        return;
    }

    let bond = topology[index];
    let a1 = bond.atom1;
    let a2 = bond.atom2;

    // Fetch positions
    let p1 = vec3<f32>(positions[a1 * 3u], positions[a1 * 3u + 1u], positions[a1 * 3u + 2u]);
    let p2 = vec3<f32>(positions[a2 * 3u], positions[a2 * 3u + 1u], positions[a2 * 3u + 2u]);

    // Fetch colors
    let c1 = colors[a1];
    let c2 = colors[a2];

    // Out vertices (2 per line/bond)
    let out_idx = index * 2u;
    
    out_line_positions[out_idx] = p1;
    out_line_positions[out_idx + 1u] = p2;
    
    out_line_colors[out_idx] = c1;
    out_line_colors[out_idx + 1u] = c2;
}
