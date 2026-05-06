/**
 * Helpers that compose with `BondRenderPipeline` to make it usable from a
 * WebGPU rendering context. None of these allocate resources unless called
 * — `BondRenderPipeline` itself doesn't construct them so callers can
 * provide their own (e.g. share a cylinder mesh with another pipeline).
 *
 * Wire order (when integrating with a WebGPU render loop):
 *   1. createUnitCylinderBuffers(device, segments) → vertex + index buffers
 *   2. createElementPaletteBuffer(device, packData) → color OR material palette
 *   3. new BondRenderPipeline({ device, format, ...buffers, ... })
 *   4. pipeline.updateCamera/updateLighting/updateConfig per frame
 *   5. pipeline.encode(commandEncoder, renderPass) per frame
 */

export interface CylinderBuffers {
  vertex: GPUBuffer;
  index: GPUBuffer;
  indexCount: number;
}

/**
 * Build vertex + index GPU buffers for a unit cylinder. The vertex layout
 * matches what `bond_render.wgsl` expects: position(vec3) + normal(vec3) +
 * uv(vec2), interleaved, 8 floats per vertex = 32 bytes stride.
 *
 * The cylinder is y-aligned with radius=1 and height=1 (centered at origin,
 * y in [-0.5, 0.5]). The vertex shader scales it by per-bond radius (config)
 * and bond length (computed from atom positions).
 *
 * @param segments  Radial segments. 4 reads identical to higher counts at
 *                  typical MD scales; 3 is acceptable for very dense scenes.
 */
export function createUnitCylinderBuffers(device: GPUDevice, segments: number = 4): CylinderBuffers {
  const r = 1.0;
  const h = 1.0;
  const halfH = h * 0.5;

  // Side vertices: 2 rings (top, bottom) × segments+1 (close the ring).
  // Cap vertices: 1 center + segments+1 ring per cap, ×2 caps.
  const sideVertCount = (segments + 1) * 2;
  const capVertCount = (segments + 2) * 2;
  const totalVerts = sideVertCount + capVertCount;
  const verts = new Float32Array(totalVerts * 8);

  // ─── Side ─────────────────────────────────────────────────────────
  let v = 0;
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    const u = i / segments;
    // Top ring (y = +0.5)
    verts[v++] = x; verts[v++] = halfH; verts[v++] = z;
    verts[v++] = x; verts[v++] = 0;     verts[v++] = z;       // normal: outward radial
    verts[v++] = u; verts[v++] = 1;
    // Bottom ring (y = -0.5)
    verts[v++] = x; verts[v++] = -halfH; verts[v++] = z;
    verts[v++] = x; verts[v++] = 0;      verts[v++] = z;
    verts[v++] = u; verts[v++] = 0;
  }

  // ─── Caps ─────────────────────────────────────────────────────────
  // Top cap: center + ring at y = +0.5
  verts[v++] = 0; verts[v++] = halfH; verts[v++] = 0;
  verts[v++] = 0; verts[v++] = 1;     verts[v++] = 0;
  verts[v++] = 0.5; verts[v++] = 0.5;
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    verts[v++] = x; verts[v++] = halfH; verts[v++] = z;
    verts[v++] = 0; verts[v++] = 1;     verts[v++] = 0;
    verts[v++] = (Math.cos(theta) + 1) * 0.5; verts[v++] = (Math.sin(theta) + 1) * 0.5;
  }
  // Bottom cap: center + ring at y = -0.5
  verts[v++] = 0; verts[v++] = -halfH; verts[v++] = 0;
  verts[v++] = 0; verts[v++] = -1;     verts[v++] = 0;
  verts[v++] = 0.5; verts[v++] = 0.5;
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    verts[v++] = x; verts[v++] = -halfH; verts[v++] = z;
    verts[v++] = 0; verts[v++] = -1;     verts[v++] = 0;
    verts[v++] = (Math.cos(theta) + 1) * 0.5; verts[v++] = (Math.sin(theta) + 1) * 0.5;
  }

  // ─── Indices ──────────────────────────────────────────────────────
  // Side: triangles between consecutive ring slots.
  // Top cap: fan from center.
  // Bottom cap: fan from center (reversed winding).
  const sideTris = segments * 2;
  const capTris = segments * 2;
  const totalTris = sideTris + capTris;
  const indices = new Uint16Array(totalTris * 3);
  let i = 0;
  // Side
  for (let s = 0; s < segments; s++) {
    const top0 = s * 2;
    const bot0 = s * 2 + 1;
    const top1 = s * 2 + 2;
    const bot1 = s * 2 + 3;
    indices[i++] = top0; indices[i++] = bot0; indices[i++] = top1;
    indices[i++] = top1; indices[i++] = bot0; indices[i++] = bot1;
  }
  // Top cap
  const topCapBase = sideVertCount;
  for (let s = 0; s < segments; s++) {
    indices[i++] = topCapBase;
    indices[i++] = topCapBase + 1 + s;
    indices[i++] = topCapBase + 1 + s + 1;
  }
  // Bottom cap (winding reversed for back-face cull)
  const botCapBase = sideVertCount + (segments + 2);
  for (let s = 0; s < segments; s++) {
    indices[i++] = botCapBase;
    indices[i++] = botCapBase + 1 + s + 1;
    indices[i++] = botCapBase + 1 + s;
  }

  const vertex = device.createBuffer({
    size: verts.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    label: 'BondCylinder Vertex',
  });
  device.queue.writeBuffer(vertex, 0, verts as BufferSource);

  const index = device.createBuffer({
    size: indices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    label: 'BondCylinder Index',
  });
  device.queue.writeBuffer(index, 0, indices as BufferSource);

  return { vertex, index, indexCount: indices.length };
}

/**
 * Build a per-element palette storage buffer from a Float32Array of length
 * 256 × 4 (one vec4 per element). Used for both the color palette and the
 * material palette — `bond_render.wgsl` expects them as `array<vec4f>`.
 *
 * The caller owns the data shape; this just uploads to GPU.
 */
export function createElementPaletteBuffer(device: GPUDevice, data: Float32Array, label: string): GPUBuffer {
  const buffer = device.createBuffer({
    size: data.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    label,
  });
  device.queue.writeBuffer(buffer, 0, data as BufferSource);
  return buffer;
}

/**
 * Patch BondPipeline's indirect buffer instance count so the bond render
 * pipeline draws ONE half-cylinder instance per atom-pair detected (we
 * actually want 2 — one per half — but BondPipeline writes 1× count).
 *
 * Call once per frame after BondPipeline.computeBonds() but before
 * BondRenderPipeline.encode(). Two-line GPU compute pass would be cleaner
 * (multiply by 2 on-GPU), but the CPU-side patch is simpler for now.
 *
 * Reads instanceCount from indirect[1], multiplies by 2, writes back.
 * Requires the indirect buffer to have COPY_SRC + COPY_DST usage flags
 * (BondPipeline already sets these).
 */
export async function patchIndirectFor2xInstances(
  device: GPUDevice,
  indirectBuffer: GPUBuffer,
): Promise<void> {
  // Tiny staging buffer for the readback.
  const staging = device.createBuffer({
    size: 8,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });
  const copyEnc = device.createCommandEncoder({ label: 'IndirectInstanceCount Read' });
  copyEnc.copyBufferToBuffer(indirectBuffer, 4, staging, 0, 4);
  device.queue.submit([copyEnc.finish()]);
  await staging.mapAsync(GPUMapMode.READ);
  const count = new Uint32Array(staging.getMappedRange())[0];
  staging.unmap();
  staging.destroy();

  const doubled = new Uint32Array([count * 2]);
  device.queue.writeBuffer(indirectBuffer, 4, doubled);
}
