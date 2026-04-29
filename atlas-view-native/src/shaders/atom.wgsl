// ═══════════════════════════════════════════════════════════════════
// ATLAS View — Impostor Sphere Shader (WGSL)
//
// Renders atoms as screen-aligned quads with per-fragment sphere
// raycasting. Each atom is a single quad (2 triangles) expanded in
// the vertex shader, with the fragment shader computing:
//   - Sphere surface intersection (ray-sphere test)
//   - Correct depth buffer value (for proper occlusion)
//   - Surface normal (for Phong lighting)
//   - Material color (from per-atom data)
//
// 4 vertices per atom vs hundreds for tessellated mesh spheres.
// ═══════════════════════════════════════════════════════════════════

// ─── Uniforms ───────────────────────────────────────────────────────

struct Camera {
    view:       mat4x4<f32>,
    projection: mat4x4<f32>,
    viewProj:   mat4x4<f32>,
    position:   vec3<f32>,
    near:       f32,
    far:        f32,
    width:      f32,
    height:     f32,
    _pad:       f32,
};

struct Lighting {
    direction:  vec3<f32>,
    intensity:  f32,
    ambient:    f32,
    specular:   f32,
    shininess:  f32,
    _pad:       f32,
};

@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var<uniform> lighting: Lighting;

// ─── Per-atom data (storage buffers) ────────────────────────────────

// Atom positions: flat array [x0,y0,z0, x1,y1,z1, ...]
@group(1) @binding(0) var<storage, read> positions: array<f32>;

// Atom radii (one per atom)
@group(1) @binding(1) var<storage, read> radii: array<f32>;

// Atom colors (RGBA per atom)
@group(1) @binding(2) var<storage, read> colors: array<vec4<f32>>;

// ─── Vertex shader ──────────────────────────────────────────────────

struct VertexOutput {
    @builtin(position)  clipPos:    vec4<f32>,
    @location(0)        quadUV:     vec2<f32>,   // [-1,1] quad coords
    @location(1)        worldCenter: vec3<f32>,  // Atom center in world space
    @location(2)        viewCenter: vec3<f32>,   // Atom center in view space
    @location(3)        radius:     f32,         // Atom radius
    @location(4)        color:      vec4<f32>,   // Atom color
};

// Each atom renders as a quad (4 vertices, 2 triangles).
// vertex_index 0..3 maps to quad corners.
// instance_index is the atom index.
@vertex
fn vs_main(
    @builtin(vertex_index) vertexID: u32,
    @builtin(instance_index) atomID: u32,
) -> VertexOutput {
    var out: VertexOutput;

    // Read atom data
    let px = positions[atomID * 3u + 0u];
    let py = positions[atomID * 3u + 1u];
    let pz = positions[atomID * 3u + 2u];
    let center = vec3<f32>(px, py, pz);
    let r = radii[atomID];
    let col = colors[atomID];

    // Transform center to view space
    let viewPos = camera.view * vec4<f32>(center, 1.0);
    let viewCenter = viewPos.xyz;

    var quadCorners = array<vec2<f32>, 4>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>( 1.0, -1.0),
        vec2<f32>(-1.0,  1.0),
        vec2<f32>( 1.0,  1.0)
    );
    let corner = quadCorners[vertexID];

    // Expand quad in view space (screen-aligned)
    let expandedRadius = r * 1.2;
    let viewOffset = vec3<f32>(corner * expandedRadius, 0.0);
    let expandedViewPos = vec4<f32>(viewCenter + viewOffset, 1.0);

    out.clipPos = camera.projection * expandedViewPos;
    out.quadUV = corner;
    out.worldCenter = center;
    out.viewCenter = viewCenter;
    out.radius = r;
    out.color = col;

    return out;
}

// ─── Fragment shader ────────────────────────────────────────────────

struct FragOutput {
    @location(0) color: vec4<f32>,
    @builtin(frag_depth) depth: f32,
};

@fragment
fn fs_main(in: VertexOutput) -> FragOutput {
    var out: FragOutput;

    // ── Ray-sphere intersection ──
    let fragViewPos = in.viewCenter + vec3<f32>(in.quadUV * in.radius * 1.2, 0.0);
    let rayDir = normalize(fragViewPos);

    // Sphere center in view space
    let a = dot(rayDir, rayDir);
    let b = 2.0 * dot(rayDir, -in.viewCenter);
    let c = dot(in.viewCenter, in.viewCenter) - in.radius * in.radius;
    let discriminant = b * b - 4.0 * a * c;

    // Discard fragment if ray misses sphere
    if (discriminant < 0.0) {
        discard;
    }

    // Find nearest intersection
    let sqrtDisc = sqrt(discriminant);
    let t = (-b - sqrtDisc) / (2.0 * a);

    // Hit point and normal in view space
    let hitPoint = rayDir * t;
    let normal = normalize(hitPoint - in.viewCenter);

    // ── Compute correct depth ──
    let hitClip = camera.projection * vec4<f32>(hitPoint, 1.0);
    out.depth = hitClip.z / hitClip.w;

    // ─── High-Fidelity Atomic Glass Lighting ───
    let lightDirView = normalize((camera.view * vec4<f32>(lighting.direction, 0.0)).xyz);
    let viewDir = normalize(-hitPoint); // towards camera
    
    let NdotL = max(dot(normal, lightDirView), 0.0);
    
    // Core diffuse 
    let diffuse = NdotL * lighting.intensity;

    // Crisp Specular (Blinn-Phong) for glossy surface
    let halfDir = normalize(lightDirView + viewDir);
    let spec = pow(max(dot(normal, halfDir), 0.0), 128.0) * 0.8;

    // Strong Fresnel / Rim Light for 'Atomic UI' depth
    let fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);
    let rim = fresnel * 0.5;

    // Subsurface glow approximation (softer core)
    let baseColor = in.color.rgb;
    let ambient = baseColor * (lighting.ambient + 0.15 * (1.0 - NdotL));

    let lit = baseColor * diffuse + ambient + vec3<f32>(spec + rim);

    out.color = vec4<f32>(min(lit, vec3<f32>(1.0)), in.color.a);

    return out;
}
