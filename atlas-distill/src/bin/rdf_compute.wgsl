// Calculate pairwise distances efficiently on the GPU for RDF extraction

struct Array {
    data: array<f32>,
}

@group(0) @binding(0) var<storage, read>  particles: Array; // Structured as [x0,y0,z0, x1,y1,z1, ...]
@group(0) @binding(1) var<storage, read_write> distances: Array;

// Config: number of atoms
struct Config {
    num_particles: u32,
}
@group(0) @binding(2) var<uniform> config: Config;

@compute
@workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let thread_idx = global_id.x;
    let n = config.num_particles;
    
    // Total pairs = n * (n - 1) / 2
    // We linearly map thread_idx to a 2D (i, j) upper-triangular index
    
    // Very simplified indexing for demonstration: each thread handles 1 'i' particle
    // and loops through all 'j > i' to calculate distance.
    if (thread_idx >= n) {
        return;
    }
    
    let i = thread_idx;
    let start_idx = (i * (2 * n - i - 1)) / 2; // Flat index offset for upper triangle
    
    let px = particles.data[i * 3 + 0];
    let py = particles.data[i * 3 + 1];
    let pz = particles.data[i * 3 + 2];
    
    for (var j = i + 1u; j < n; j++) {
        let qx = particles.data[j * 3 + 0];
        let qy = particles.data[j * 3 + 1];
        let qz = particles.data[j * 3 + 2];
        
        let dx = px - qx;
        let dy = py - qy;
        let dz = pz - qz;
        
        // Exact 3D euclidean distance (unbounded by periodic conditions for this test)
        let dist = sqrt(dx*dx + dy*dy + dz*dz);
        
        // Write to output buffer
        let out_idx = start_idx + (j - i - 1);
        distances.data[out_idx] = dist;
    }
}
