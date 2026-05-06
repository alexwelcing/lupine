// bond_render.wgsl
// WebGPU vertex + fragment shaders that draw bonds directly from the GPU
// data produced by bond_compute.wgsl. No CPU readback, no Three.js
// InstancedMesh — bonds_out flows straight from compute to render.
//
// Per render call, instance count = 2 * num_bonds (one half-cylinder per
// half-bond, atom A → midpoint and midpoint → atom B). The matrix that
// places each instance is computed in the vertex shader from the bond's
// atom positions, NOT pre-baked on the CPU.
//
// Inputs:
//   - vertex buffer: unit cylinder geometry (position, normal, uv) shared
//     across all instances. Three radial segments, 4 segments cap.
//   - storage buffer atoms[]:  vec4f(x, y, z, element_type as i32)
//   - storage buffer bonds[]:  Bond { atomA: u32, atomB: u32, distance: f32, _pad: f32 }
//   - storage buffer material_palette[]: vec4f per element (metalness,
//     roughness, anisotropy, subsurface)
//   - storage buffer color_palette[]: vec4f per element (rgb, _pad)
//   - uniform Camera { view, projection, viewProj, position, near, far }
//   - uniform Lighting { dir, intensity, ambient, specular, shininess }
//   - uniform BondRenderConfig { bond_radius: f32, opacity: f32 }

struct Camera {
  view: mat4x4f,
  projection: mat4x4f,
  viewProj: mat4x4f,
  position: vec3f,
  near: f32,
  far: f32,
}

struct Lighting {
  direction: vec3f,
  intensity: f32,
  ambient: f32,
  specular: f32,
  shininess: f32,
  _pad: f32,
}

struct BondRenderConfig {
  bondRadius: f32,
  opacity: f32,
  _pad0: f32,
  _pad1: f32,
}

struct Bond {
  atomA: u32,
  atomB: u32,
  distance: f32,
  _pad: f32,
}

@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var<uniform> lighting: Lighting;
@group(0) @binding(2) var<uniform> config: BondRenderConfig;
@group(0) @binding(3) var<storage, read> atoms: array<vec4f>;
@group(0) @binding(4) var<storage, read> bonds: array<Bond>;
@group(0) @binding(5) var<storage, read> color_palette: array<vec4f>;
@group(0) @binding(6) var<storage, read> material_palette: array<vec4f>;

struct VertexInput {
  @location(0) position: vec3f,   // unit cylinder vertex
  @location(1) normal: vec3f,
  @location(2) uv: vec2f,
}

struct VertexOutput {
  @builtin(position) clip_position: vec4f,
  @location(0) world_normal: vec3f,
  @location(1) world_position: vec3f,
  @location(2) bond_color: vec3f,
  @location(3) material: vec4f,   // metalness, roughness, anisotropy, subsurface
  @location(4) lerp_t: f32,        // 0 at the half's bottom end, 1 at the top — for color gradient
}

/** Build an orthonormal basis (u, v) perpendicular to n. Picks a stable
 *  reference axis to avoid gimbal-lock when n is near (0, 1, 0). */
fn perpendicular_basis(n: vec3f) -> mat3x3f {
  var up = vec3f(0.0, 1.0, 0.0);
  if (abs(n.y) > 0.999) { up = vec3f(1.0, 0.0, 0.0); }
  let u = normalize(cross(up, n));
  let v = cross(n, u);
  return mat3x3f(u, n, v); // columns: u, n, v
}

@vertex
fn vs_main(in: VertexInput, @builtin(instance_index) instance_idx: u32) -> VertexOutput {
  let is_top_half = (instance_idx & 1u) == 1u;
  let bond_idx = instance_idx >> 1u;

  let bond = bonds[bond_idx];
  let posA = atoms[bond.atomA].xyz;
  let posB = atoms[bond.atomB].xyz;

  let axis = posB - posA;
  let bondLen = length(axis);
  let halfLen = bondLen * 0.5;
  let n = axis / max(bondLen, 1e-6);

  // The half goes from one end to the midpoint. Origin at the half's center.
  var halfOrigin: vec3f;
  if (is_top_half) {
    halfOrigin = posA + axis * 0.75;
  } else {
    halfOrigin = posA + axis * 0.25;
  }

  // Build a basis aligned to the bond axis.
  let basis = perpendicular_basis(n);

  // Transform unit-cylinder vertex into world space:
  //   - x and z stay perpendicular (radial), scaled by bondRadius
  //   - y stretches along the bond axis (scaled by halfLen)
  let radial = vec3f(in.position.x * config.bondRadius, 0.0, in.position.z * config.bondRadius);
  let axial = n * (in.position.y * halfLen);
  let world_offset = basis * radial + axial;
  let world_pos = halfOrigin + world_offset;

  // Normal: cylinder side normal is radial; cap normals are axial. Trust
  // the input normal — basis-transform it.
  let world_normal = normalize(basis * vec3f(in.normal.x, in.normal.y, in.normal.z));

  // Color gradient: lerp_t goes 0 → 1 along the half (matches the WebGL
  // bond gradient pattern). For the bottom half it's atom A → midpoint;
  // for the top half it's midpoint → atom B.
  let lerp_t_local = in.position.y + 0.5;

  let elemA = bitcast<i32>(atoms[bond.atomA].w);
  let elemB = bitcast<i32>(atoms[bond.atomB].w);
  let colorA = color_palette[elemA].xyz;
  let colorB = color_palette[elemB].xyz;
  let colorMid = (colorA + colorB) * 0.5;

  var color: vec3f;
  if (is_top_half) {
    color = mix(colorMid, colorB, lerp_t_local);
  } else {
    color = mix(colorA, colorMid, lerp_t_local);
  }

  // Material — sample from the heavier-weighted atom of this half. For
  // the bottom half that's A; for the top half it's B. Could blend later.
  let elem = select(elemA, elemB, is_top_half);
  let mat = material_palette[elem];

  var out: VertexOutput;
  out.clip_position = camera.viewProj * vec4f(world_pos, 1.0);
  out.world_normal = world_normal;
  out.world_position = world_pos;
  out.bond_color = color;
  out.material = mat;
  out.lerp_t = lerp_t_local;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
  let metalness = in.material.x;
  let roughness = in.material.y;
  let anisotropy = in.material.z;
  let subsurface = in.material.w;

  let n = normalize(in.world_normal);
  let l = normalize(-lighting.direction);
  let v = normalize(camera.position - in.world_position);
  let h = normalize(l + v);

  let n_dot_l = max(dot(n, l), 0.0);
  let n_dot_h = max(dot(n, h), 0.0);

  // Spec power scales with 1-roughness; anisotropy compresses it along x.
  var spec_power = mix(10.0, 100.0, 1.0 - roughness);
  spec_power *= mix(1.0, 0.4, anisotropy * abs(n.x));
  let spec = pow(n_dot_h, spec_power) * mix(0.3, 1.5, metalness);

  // Subsurface lift on the shadow side, matching atom shader behavior.
  let wrap = max(n_dot_l * 0.5 + 0.5, 0.0);
  let lit = mix(n_dot_l, max(n_dot_l, wrap * 0.7), subsurface);

  let ambient = lighting.ambient + subsurface * (1.0 - lit) * 0.4;
  let diffuse_factor = mix(1.0, 0.4, metalness);
  let spec_tint = mix(vec3f(1.0), in.bond_color, metalness);

  let color = in.bond_color * (ambient + lit * 0.7 * diffuse_factor)
            + spec_tint * spec;

  return vec4f(color, config.opacity);
}
