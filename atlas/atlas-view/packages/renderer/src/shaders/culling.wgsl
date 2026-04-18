// ═══════════════════════════════════════════════════════════════════
// ATLAS View — GPU Culling & Color Mapping Compute Shader
//
// Runs as a compute pass BEFORE the render pass to:
//   1. Frustum-cull atoms against the camera (reject invisible atoms)
//   2. Map per-atom scalar properties to RGBA colors via colormaps
//   3. Build an indirect draw buffer (GPU-driven rendering)
//
// This eliminates CPU-side per-atom processing entirely.
// ═══════════════════════════════════════════════════════════════════

struct CullUniforms {
    viewProj:     mat4x4<f32>,
    frustumPlanes: array<vec4<f32>, 6>,  // 6 frustum planes (normal.xyz, distance.w)
    atomCount:    u32,
    colorMode:    u32,   // 0=type, 1=property, 2=uniform
    propMin:      f32,   // Min value for property color mapping
    propMax:      f32,   // Max value for property color mapping
    colormapType: u32,   // 0=viridis, 1=inferno, 2=coolwarm, 3=plasma
    _pad0:        u32,
    _pad1:        u32,
    _pad2:        u32,
};

// Indirect draw args: { vertexCount, instanceCount, firstVertex, firstInstance }
struct IndirectDraw {
    vertexCount:   atomic<u32>,
    instanceCount: atomic<u32>,
    firstVertex:   u32,
    firstInstance:  u32,
};

@group(0) @binding(0) var<uniform> uniforms: CullUniforms;

// Input: all atom positions [x0,y0,z0, x1,y1,z1, ...]
@group(0) @binding(1) var<storage, read> allPositions: array<f32>;

// Input: all atom types
@group(0) @binding(2) var<storage, read> allTypes: array<i32>;

// Input: property values for color mapping (one per atom)
@group(0) @binding(3) var<storage, read> propertyValues: array<f32>;

// Output: visible atom positions (packed for render pass)
@group(0) @binding(4) var<storage, read_write> visiblePositions: array<f32>;

// Output: visible atom radii
@group(0) @binding(5) var<storage, read_write> visibleRadii: array<f32>;

// Output: visible atom colors (vec4<f32>)
@group(0) @binding(6) var<storage, read_write> visibleColors: array<vec4<f32>>;

// Output: indirect draw buffer
@group(0) @binding(7) var<storage, read_write> drawArgs: IndirectDraw;

// ─── Colormap functions ─────────────────────────────────────────────

fn viridis(t: f32) -> vec3<f32> {
    // Attempt approximation of the viridis colormap
    let c0 = vec3<f32>(0.267, 0.004, 0.329);
    let c1 = vec3<f32>(0.282, 0.140, 0.458);
    let c2 = vec3<f32>(0.127, 0.566, 0.551);
    let c3 = vec3<f32>(0.993, 0.906, 0.144);
    if (t < 0.33) {
        return mix(c0, c1, t / 0.33);
    } else if (t < 0.66) {
        return mix(c1, c2, (t - 0.33) / 0.33);
    } else {
        return mix(c2, c3, (t - 0.66) / 0.34);
    }
}

fn inferno(t: f32) -> vec3<f32> {
    let c0 = vec3<f32>(0.001, 0.0, 0.014);
    let c1 = vec3<f32>(0.416, 0.065, 0.432);
    let c2 = vec3<f32>(0.891, 0.298, 0.159);
    let c3 = vec3<f32>(0.988, 0.998, 0.644);
    if (t < 0.33) {
        return mix(c0, c1, t / 0.33);
    } else if (t < 0.66) {
        return mix(c1, c2, (t - 0.33) / 0.33);
    } else {
        return mix(c2, c3, (t - 0.66) / 0.34);
    }
}

fn coolwarm(t: f32) -> vec3<f32> {
    let cold = vec3<f32>(0.230, 0.299, 0.754);
    let mid  = vec3<f32>(0.865, 0.865, 0.865);
    let warm = vec3<f32>(0.706, 0.016, 0.150);
    if (t < 0.5) {
        return mix(cold, mid, t * 2.0);
    } else {
        return mix(mid, warm, (t - 0.5) * 2.0);
    }
}

fn plasma(t: f32) -> vec3<f32> {
    let c0 = vec3<f32>(0.050, 0.030, 0.530);
    let c1 = vec3<f32>(0.494, 0.012, 0.658);
    let c2 = vec3<f32>(0.798, 0.280, 0.470);
    let c3 = vec3<f32>(0.940, 0.975, 0.131);
    if (t < 0.33) {
        return mix(c0, c1, t / 0.33);
    } else if (t < 0.66) {
        return mix(c1, c2, (t - 0.33) / 0.33);
    } else {
        return mix(c2, c3, (t - 0.66) / 0.34);
    }
}

fn neon_map(t: f32) -> vec3<f32> {
    let c0 = vec3<f32>(0.0, 1.0, 0.4);
    let c1 = vec3<f32>(0.0, 0.8, 1.0);
    let c2 = vec3<f32>(0.6, 0.0, 1.0);
    let c3 = vec3<f32>(1.0, 0.0, 0.6);
    if (t < 0.33) {
        return mix(c0, c1, t / 0.33);
    } else if (t < 0.66) {
        return mix(c1, c2, (t - 0.33) / 0.33);
    } else {
        return mix(c2, c3, (t - 0.66) / 0.34);
    }
}

fn sunset_map(t: f32) -> vec3<f32> {
    let c0 = vec3<f32>(0.12, 0.0, 0.30);
    let c1 = vec3<f32>(0.80, 0.15, 0.40);
    let c2 = vec3<f32>(1.0, 0.55, 0.15);
    let c3 = vec3<f32>(1.0, 0.92, 0.50);
    if (t < 0.33) {
        return mix(c0, c1, t / 0.33);
    } else if (t < 0.66) {
        return mix(c1, c2, (t - 0.33) / 0.33);
    } else {
        return mix(c2, c3, (t - 0.66) / 0.34);
    }
}

fn vaporwave_map(t: f32) -> vec3<f32> {
    let c0 = vec3<f32>(0.05, 0.85, 0.85);
    let c1 = vec3<f32>(0.55, 0.30, 0.95);
    let c2 = vec3<f32>(1.0, 0.40, 0.70);
    let c3 = vec3<f32>(1.0, 0.85, 0.40);
    if (t < 0.33) {
        return mix(c0, c1, t / 0.33);
    } else if (t < 0.66) {
        return mix(c1, c2, (t - 0.33) / 0.33);
    } else {
        return mix(c2, c3, (t - 0.66) / 0.34);
    }
}

// Sample any colormap by index
fn sampleColormap(cmapType: u32, t: f32) -> vec3<f32> {
    switch(cmapType) {
        case 0u: { return viridis(t); }
        case 1u: { return inferno(t); }
        case 2u: { return coolwarm(t); }
        case 3u: { return plasma(t); }
        case 4u: { return neon_map(t); }
        case 5u: { return sunset_map(t); }
        case 6u: { return vaporwave_map(t); }
        default: { return viridis(t); }
    }
}

fn typeColor(atomType: i32, cmapType: u32) -> vec3<f32> {
    // Map atom type to a position on the active colormap
    // Types 1-8 are distributed evenly across the palette range
    let maxType = 8.0;
    let t = clamp(f32(atomType - 1) / max(maxType - 1.0, 1.0), 0.0, 1.0);
    return sampleColormap(cmapType, t);
}

fn typeRadius(atomType: i32) -> f32 {
    // Default type → radius mapping (approximate covalent radii in Å)
    switch(atomType) {
        case 1: { return 1.28; }  // Cu
        case 2: { return 0.73; }  // O
        case 3: { return 1.60; }  // Zr
        case 4: { return 1.44; }  // Au
        default: { return 1.20; }
    }
}

// ─── Frustum culling ────────────────────────────────────────────────

fn isInsideFrustum(center: vec3<f32>, radius: f32) -> bool {
    for (var i = 0u; i < 6u; i++) {
        let plane = uniforms.frustumPlanes[i];
        let dist = dot(plane.xyz, center) + plane.w;
        if (dist < -radius) {
            return false;  // Sphere is completely outside this plane
        }
    }
    return true;
}

// ─── Main compute kernel ────────────────────────────────────────────

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let atomIndex = gid.x;
    if (atomIndex >= uniforms.atomCount) {
        return;
    }

    // Read atom position
    let px = allPositions[atomIndex * 3u + 0u];
    let py = allPositions[atomIndex * 3u + 1u];
    let pz = allPositions[atomIndex * 3u + 2u];
    let center = vec3<f32>(px, py, pz);

    // Get radius
    let atomType = allTypes[atomIndex];
    let radius = typeRadius(atomType);

    // Frustum cull
    if (!isInsideFrustum(center, radius)) {
        return;
    }

    // Atom is visible — append to output buffers
    let outIndex = atomicAdd(&drawArgs.instanceCount, 1u);

    // Write position
    visiblePositions[outIndex * 3u + 0u] = px;
    visiblePositions[outIndex * 3u + 1u] = py;
    visiblePositions[outIndex * 3u + 2u] = pz;

    // Write radius
    visibleRadii[outIndex] = radius;

    // Compute color
    var color: vec3<f32>;
    switch(uniforms.colorMode) {
        case 0u: {
            // Color by type — uses the active palette
            color = typeColor(atomType, uniforms.colormapType);
        }
        case 1u: {
            // Color by property value
            let val = propertyValues[atomIndex];
            let range = uniforms.propMax - uniforms.propMin;
            let t = clamp((val - uniforms.propMin) / max(range, 0.0001), 0.0, 1.0);
            color = sampleColormap(uniforms.colormapType, t);
        }
        default: {
            color = vec3<f32>(0.5, 0.7, 0.9);
        }
    }

    visibleColors[outIndex] = vec4<f32>(color, 1.0);
}

// ─── Reset indirect draw args (run before main pass) ────────────────

@compute @workgroup_size(1)
fn reset_draw_args() {
    atomicStore(&drawArgs.vertexCount, 4u);    // 4 vertices per quad
    atomicStore(&drawArgs.instanceCount, 0u);  // Reset — main pass fills this
    drawArgs.firstVertex = 0u;
    drawArgs.firstInstance = 0u;
}
