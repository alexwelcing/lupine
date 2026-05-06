/**
 * BondRenderPipeline — Phase-2 WebGPU bond rendering.
 *
 * Draws bonds directly from the GPU data produced by BondPipeline (compute).
 * Skips the CPU readback path entirely: bonds_out flows from compute →
 * vertex shader → fragment shader → screen, no Float32Array round-trip.
 *
 * Status: foundation. The pipeline class compiles and creates valid
 * resources. Wiring it into the live render loop requires a WebGPU
 * rendering context (THREE.WebGPURenderer or R3F's experimental WebGPU
 * mode) — see the integration notes at the bottom of this file.
 *
 * What this gives us when wired:
 *   - Eliminates the BondPipeline.readBondsAsync path entirely.
 *   - Eliminates the per-frame CPU matrix computation in Bonds.tsx
 *     (uploadBondMatrices). The vertex shader does it on GPU.
 *   - Removes the 1.7MB/frame instanceMatrix upload at 27k bonds.
 *   - Makes per-bond compute effects (stress fields, energy heatmaps,
 *     orientation overlays) trivial — they just become extra storage
 *     buffers the vertex/fragment shaders read.
 */

import bondRenderShaderSource from '../shaders/bond_render.wgsl?raw';

export interface BondRenderPipelineOptions {
  device: GPUDevice;
  format: GPUTextureFormat;
  /** GPUBuffer of vec4f atoms (x, y, z, element_type as float-bitcast int). */
  positionBuffer: GPUBuffer;
  /** GPUBuffer of Bond { atomA, atomB, distance, _pad } — owned by BondPipeline. */
  bondBuffer: GPUBuffer;
  /** Indirect draw args — owned by BondPipeline. instanceCount = num bonds. */
  indirectBuffer: GPUBuffer;
  /** vec4f per element: rgb + _pad. Same shape as the atom palette. */
  colorPaletteBuffer: GPUBuffer;
  /** vec4f per element: metalness, roughness, anisotropy, subsurface. */
  materialPaletteBuffer: GPUBuffer;
  /** Vertex buffer for the unit-cylinder mesh (position+normal+uv). */
  cylinderVertexBuffer: GPUBuffer;
  /** Index buffer for the cylinder. */
  cylinderIndexBuffer: GPUBuffer;
  /** Total indices in the cylinder mesh. */
  cylinderIndexCount: number;
  sampleCount?: number;
}

const CAMERA_BUFFER_SIZE = 256;     // mat4 * 3 (192) + vec3 (12) + 4 floats + pad → 256
const LIGHTING_BUFFER_SIZE = 32;    // vec3 + intensity + ambient + specular + shininess + pad
const CONFIG_BUFFER_SIZE = 16;      // bondRadius + opacity + 2 pad

export interface BondRenderConfig {
  /** Bond cylinder radius in world units. Default 0.12 Å. */
  bondRadius: number;
  /** Output alpha. 1.0 = opaque. */
  opacity: number;
}

export class BondRenderPipeline {
  private device: GPUDevice;
  private indirectBuffer: GPUBuffer;
  private cylinderVertexBuffer: GPUBuffer;
  private cylinderIndexBuffer: GPUBuffer;
  private cylinderIndexCount: number;

  private renderPipeline!: GPURenderPipeline;
  private bindGroup!: GPUBindGroup;

  private cameraBuffer!: GPUBuffer;
  private lightingBuffer!: GPUBuffer;
  private configBuffer!: GPUBuffer;

  constructor(opts: BondRenderPipelineOptions) {
    this.device = opts.device;
    this.indirectBuffer = opts.indirectBuffer;
    this.cylinderVertexBuffer = opts.cylinderVertexBuffer;
    this.cylinderIndexBuffer = opts.cylinderIndexBuffer;
    this.cylinderIndexCount = opts.cylinderIndexCount;

    this.cameraBuffer = this.device.createBuffer({
      size: CAMERA_BUFFER_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: 'BondRender Camera',
    });
    this.lightingBuffer = this.device.createBuffer({
      size: LIGHTING_BUFFER_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: 'BondRender Lighting',
    });
    this.configBuffer = this.device.createBuffer({
      size: CONFIG_BUFFER_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: 'BondRender Config',
    });

    this.initPipeline(opts);
  }

  private initPipeline(opts: BondRenderPipelineOptions) {
    const module = this.device.createShaderModule({
      label: 'Bond Render Shader',
      code: bondRenderShaderSource,
    });

    this.renderPipeline = this.device.createRenderPipeline({
      label: 'BondRender Pipeline',
      layout: 'auto',
      vertex: {
        module,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 8 * 4, // vec3 position + vec3 normal + vec2 uv = 8 floats
            attributes: [
              { shaderLocation: 0, offset: 0,    format: 'float32x3' }, // position
              { shaderLocation: 1, offset: 12,   format: 'float32x3' }, // normal
              { shaderLocation: 2, offset: 24,   format: 'float32x2' }, // uv
            ],
          },
        ],
      },
      fragment: {
        module,
        entryPoint: 'fs_main',
        targets: [{
          format: opts.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one',       dstFactor: 'one-minus-src-alpha', operation: 'add' },
          },
        }],
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'back',
      },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: true,
        depthCompare: 'less',
      },
      multisample: { count: opts.sampleCount ?? 1 },
    });

    this.bindGroup = this.device.createBindGroup({
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.cameraBuffer } },
        { binding: 1, resource: { buffer: this.lightingBuffer } },
        { binding: 2, resource: { buffer: this.configBuffer } },
        { binding: 3, resource: { buffer: opts.positionBuffer } },
        { binding: 4, resource: { buffer: opts.bondBuffer } },
        { binding: 5, resource: { buffer: opts.colorPaletteBuffer } },
        { binding: 6, resource: { buffer: opts.materialPaletteBuffer } },
      ],
      label: 'BondRender Bind Group',
    });
  }

  /** Update camera uniforms. Pack matches the Camera struct in the WGSL shader. */
  public updateCamera(opts: {
    view: Float32Array;
    projection: Float32Array;
    viewProj: Float32Array;
    position: [number, number, number];
    near: number;
    far: number;
  }): void {
    const data = new ArrayBuffer(CAMERA_BUFFER_SIZE);
    const f = new Float32Array(data);
    f.set(opts.view, 0);                  // mat4 view at offset 0
    f.set(opts.projection, 16);           // mat4 projection at offset 64
    f.set(opts.viewProj, 32);             // mat4 viewProj at offset 128
    f[48] = opts.position[0];             // vec3 position at offset 192
    f[49] = opts.position[1];
    f[50] = opts.position[2];
    f[51] = opts.near;                    // f32 near at offset 204
    f[52] = opts.far;                     // f32 far at offset 208
    this.device.queue.writeBuffer(this.cameraBuffer, 0, data);
  }

  /** Update lighting uniforms. */
  public updateLighting(opts: {
    direction: [number, number, number];
    intensity: number;
    ambient: number;
    specular: number;
    shininess: number;
  }): void {
    const data = new ArrayBuffer(LIGHTING_BUFFER_SIZE);
    const f = new Float32Array(data);
    f[0] = opts.direction[0];
    f[1] = opts.direction[1];
    f[2] = opts.direction[2];
    f[3] = opts.intensity;
    f[4] = opts.ambient;
    f[5] = opts.specular;
    f[6] = opts.shininess;
    f[7] = 0; // pad
    this.device.queue.writeBuffer(this.lightingBuffer, 0, data);
  }

  public updateConfig(cfg: BondRenderConfig): void {
    const data = new Float32Array([cfg.bondRadius, cfg.opacity, 0, 0]);
    this.device.queue.writeBuffer(this.configBuffer, 0, data);
  }

  /**
   * Encode a render pass that draws all current bonds. Pulls the instance
   * count from the indirect buffer (set by BondPipeline.computeBonds), so
   * the count auto-tracks the most recent bond detection without a CPU
   * round-trip.
   *
   * Each bond renders as TWO half-cylinder instances, so the indirect call
   * uses `drawIndexed(indexCount, instanceCount = 2 * bondCount, …)`. We
   * use drawIndexedIndirect for the count to live entirely on the GPU.
   *
   * NOTE: BondPipeline's indirect buffer encodes `instanceCount` = `num bonds`.
   * For Phase-2 we want `2 * num bonds` (one instance per half-cylinder).
   * Either patch BondPipeline to write 2× during compute, or do a tiny
   * compute pass here to multiply. The simpler path is the patch.
   */
  public encode(
    encoder: GPUCommandEncoder,
    renderPass: GPURenderPassDescriptor,
  ): void {
    const pass = encoder.beginRenderPass(renderPass);
    pass.setPipeline(this.renderPipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.cylinderVertexBuffer);
    pass.setIndexBuffer(this.cylinderIndexBuffer, 'uint16');
    pass.drawIndexedIndirect(this.indirectBuffer, 0);
    pass.end();
  }

  public destroy(): void {
    this.cameraBuffer.destroy();
    this.lightingBuffer.destroy();
    this.configBuffer.destroy();
    // Vertex/index/storage buffers are owned by the caller (BondPipeline,
    // unit-cylinder mesh provider) — don't destroy them here.
  }
}

// ─── Integration notes ──────────────────────────────────────────────────
//
// To wire this into the live render loop:
//
// 1. Acquire a WebGPU rendering context. Two paths:
//    a. THREE.WebGPURenderer (separate from WebGLRenderer; r3f 9.x has an
//       experimental opt-in via `gl={{ webgpu: true }}` or the
//       `WebGPURenderer` from `three/webgpu`).
//    b. A second canvas overlaying the existing WebGL canvas. Match the
//       projection matrix from the WebGL camera; sync clear/depth.
//
// 2. Build the unit-cylinder mesh once (positions, normals, uvs, indices)
//    and upload to a pair of GPUBuffers. Three.js `CylinderGeometry`
//    provides the data; convert to interleaved Float32 + Uint16.
//
// 3. Build/update the color and material palette GPUBuffers from the
//    existing `materials/` module — the same per-element profiles
//    AtomsOptimized samples in its WebGL palette texture, but laid out as
//    `array<vec4f>` instead of an RGBA8 palette texture.
//
// 4. Each render frame:
//      a. computeBonds via BondPipeline (this is unchanged from today).
//      b. updateCamera + updateLighting + updateConfig on this pipeline.
//      c. encode() into a render pass that targets the WebGPU canvas.
//      d. Submit. The GPU draws bonds without ever telling the CPU what
//         the bond count is.
//
// 5. Patch BondPipeline so that `indirectBuffer[1]` (instanceCount) is
//    written as `2 * num_bonds` instead of `num_bonds`, since each bond
//    is rendered as two half-cylinder instances. Alternative: expose a
//    second indirect buffer. Single-buffer-with-2x is simpler.
//
// Once wired, the existing `Bonds.tsx` `useGpuBonds` toggle becomes a
// gate: when on AND a WebGPU rendering context is available, the WebGL
// instanced mesh path is bypassed entirely.
