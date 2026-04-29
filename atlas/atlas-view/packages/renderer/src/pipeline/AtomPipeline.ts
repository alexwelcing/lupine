/**
 * AtomPipeline — WebGPU rendering pipeline for impostor spheres
 * 
 * Orchestrates:
 *   1. Upload atom data to GPU storage buffers
 *   2. Compute pass: frustum culling + color mapping (culling.wgsl)
 *   3. Render pass: impostor sphere drawing (atom.wgsl)
 *   4. Read back visible atom count for UI stats
 */

import atomShaderSource from './shaders/atom.wgsl?raw';
import cullingShaderSource from './shaders/culling.wgsl?raw';

export interface AtomPipelineOptions {
  device: GPUDevice;
  format: GPUTextureFormat;
  maxAtoms: number;
  sampleCount?: number;
}

export interface FrameData {
  positions: Float32Array;   // [x0,y0,z0, x1,y1,z1, ...] length = natoms * 3
  types: Int32Array;         // [t0, t1, ...] length = natoms
  properties?: Float32Array; // optional per-atom scalar for color mapping
  natoms: number;
}

export interface CameraUniforms {
  view: Float32Array;        // mat4
  projection: Float32Array;  // mat4
  viewProj: Float32Array;    // mat4
  position: Float32Array;    // vec3
  near: number;
  far: number;
  width: number;
  height: number;
}

export interface RenderState {
  colorMode: number;    // 0=type, 1=property, 2=uniform
  colormapType: number; // 0=viridis, 1=inferno, 2=coolwarm
  propMin: number;
  propMax: number;
}

export class AtomPipeline {
  private device: GPUDevice;
  private format: GPUTextureFormat;
  private maxAtoms: number;
  private sampleCount: number;

  // Buffers
  private positionBuffer!: GPUBuffer;
  private typeBuffer!: GPUBuffer;
  private propertyBuffer!: GPUBuffer;
  private visiblePositionBuffer!: GPUBuffer;
  private visibleRadiiBuffer!: GPUBuffer;
  private visibleColorBuffer!: GPUBuffer;
  private indirectDrawBuffer!: GPUBuffer;
  private cameraUniformBuffer!: GPUBuffer;
  private lightingUniformBuffer!: GPUBuffer;
  private cullUniformBuffer!: GPUBuffer;

  // Pipelines
  private resetPipeline!: GPUComputePipeline;
  private cullPipeline!: GPUComputePipeline;
  private renderPipeline!: GPURenderPipeline;

  // Bind groups
  private cullBindGroup!: GPUBindGroup;
  private renderBindGroup0!: GPUBindGroup;
  private renderBindGroup1!: GPUBindGroup;

  // State
  private currentAtomCount = 0;

  constructor(opts: AtomPipelineOptions) {
    this.device = opts.device;
    this.format = opts.format;
    this.maxAtoms = opts.maxAtoms;
    this.sampleCount = opts.sampleCount ?? 1;

    this.createBuffers();
    this.createPipelines();
  }

  private createBuffers() {
    const n = this.maxAtoms;
    const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;

    // Input atom data
    this.positionBuffer = this.device.createBuffer({ size: n * 3 * 4, usage, label: 'positions' });
    this.typeBuffer = this.device.createBuffer({ size: n * 4, usage, label: 'types' });
    this.propertyBuffer = this.device.createBuffer({ size: n * 4, usage, label: 'properties' });

    // Culling output (visible atoms)
    this.visiblePositionBuffer = this.device.createBuffer({ size: n * 3 * 4, usage: GPUBufferUsage.STORAGE, label: 'vis-pos' });
    this.visibleRadiiBuffer = this.device.createBuffer({ size: n * 4, usage: GPUBufferUsage.STORAGE, label: 'vis-radii' });
    this.visibleColorBuffer = this.device.createBuffer({ size: n * 4 * 4, usage: GPUBufferUsage.STORAGE, label: 'vis-colors' });

    // Indirect draw buffer: [vertexCount, instanceCount, firstVertex, firstInstance]
    this.indirectDrawBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST,
      label: 'indirect-draw',
    });

    // Uniform buffers
    this.cameraUniformBuffer = this.device.createBuffer({
      size: 256, // mat4 * 3 + vec3 + 5 floats, padded to 256
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: 'camera-uniforms',
    });

    this.lightingUniformBuffer = this.device.createBuffer({
      size: 32, // direction(3) + intensity + ambient + specular + shininess + pad
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: 'lighting-uniforms',
    });

    this.cullUniformBuffer = this.device.createBuffer({
      size: 192, // mat4 + 6*vec4 + atomCount + colorMode + propMin/Max + colormapType + pad
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: 'cull-uniforms',
    });

    // Initialize default lighting
    const lightData = new Float32Array([
      0.5, 0.8, 0.6,   // direction (normalized)
      1.0,              // intensity
      0.25,             // ambient
      0.5,              // specular
      32.0,             // shininess
      0.0,              // pad
    ]);
    this.device.queue.writeBuffer(this.lightingUniformBuffer, 0, lightData);
  }

  private createPipelines() {
    // --- Compute: reset indirect draw args ---
    const resetModule = this.device.createShaderModule({
      code: cullingShaderSource,
      label: 'culling-shader',
    });

    this.resetPipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: { module: resetModule, entryPoint: 'reset_draw_args' },
      label: 'reset-pipeline',
    });

    // --- Compute: cull + color ---
    this.cullPipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: { module: resetModule, entryPoint: 'main' },
      label: 'cull-pipeline',
    });

    // --- Render: impostor spheres ---
    const atomModule = this.device.createShaderModule({
      code: atomShaderSource,
      label: 'atom-shader',
    });

    this.renderPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: atomModule,
        entryPoint: 'vs_main',
      },
      fragment: {
        module: atomModule,
        entryPoint: 'fs_main',
        targets: [{ format: this.format }],
      },
      primitive: {
        topology: 'triangle-strip',
        stripIndexFormat: 'uint32',
      },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: true,
        depthCompare: 'less',
      },
      multisample: { count: this.sampleCount },
      label: 'atom-render-pipeline',
    });

    // Build bind groups
    this.rebuildBindGroups();
  }

  private rebuildBindGroups() {
    // Cull bind group (group 0 in culling.wgsl)
    this.cullBindGroup = this.device.createBindGroup({
      layout: this.cullPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.cullUniformBuffer } },
        { binding: 1, resource: { buffer: this.positionBuffer } },
        { binding: 2, resource: { buffer: this.typeBuffer } },
        { binding: 3, resource: { buffer: this.propertyBuffer } },
        { binding: 4, resource: { buffer: this.visiblePositionBuffer } },
        { binding: 5, resource: { buffer: this.visibleRadiiBuffer } },
        { binding: 6, resource: { buffer: this.visibleColorBuffer } },
        { binding: 7, resource: { buffer: this.indirectDrawBuffer } },
      ],
      label: 'cull-bind-group',
    });

    // Render bind group 0 (camera + lighting)
    this.renderBindGroup0 = this.device.createBindGroup({
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.cameraUniformBuffer } },
        { binding: 1, resource: { buffer: this.lightingUniformBuffer } },
      ],
      label: 'render-bind-group-0',
    });

    // Render bind group 1 (per-atom data from cull output)
    this.renderBindGroup1 = this.device.createBindGroup({
      layout: this.renderPipeline.getBindGroupLayout(1),
      entries: [
        { binding: 0, resource: { buffer: this.visiblePositionBuffer } },
        { binding: 1, resource: { buffer: this.visibleRadiiBuffer } },
        { binding: 2, resource: { buffer: this.visibleColorBuffer } },
      ],
      label: 'render-bind-group-1',
    });
  }

  /** Upload a new frame of atom data to the GPU */
  uploadFrame(frame: FrameData) {
    this.currentAtomCount = frame.natoms;
    this.device.queue.writeBuffer(this.positionBuffer, 0, frame.positions as any);
    this.device.queue.writeBuffer(this.typeBuffer, 0, frame.types as any);
    if (frame.properties) {
      this.device.queue.writeBuffer(this.propertyBuffer, 0, frame.properties as any);
    }
  }

  /** Update camera uniforms */
  updateCamera(cam: CameraUniforms) {
    // Pack into a 256-byte buffer matching the Camera struct in atom.wgsl
    const data = new ArrayBuffer(256);
    const f = new Float32Array(data);
    f.set(cam.view, 0);           // offset 0:  mat4 view
    f.set(cam.projection, 16);    // offset 64: mat4 projection
    f.set(cam.viewProj, 32);      // offset 128: mat4 viewProj
    f.set(cam.position, 48);      // offset 192: vec3 position
    f[51] = cam.near;             // offset 204: near
    f[52] = cam.far;              // offset 208: far
    f[53] = cam.width;            // offset 212: width
    f[54] = cam.height;           // offset 216: height
    this.device.queue.writeBuffer(this.cameraUniformBuffer, 0, f as any);
  }

  /** Update culling uniforms (frustum planes, color mode, etc.) */
  updateCullUniforms(cam: CameraUniforms, state: RenderState) {
    const buffer = new ArrayBuffer(192);
    const floatData = new Float32Array(buffer);
    const uintData = new Uint32Array(buffer);

    // viewProj matrix
    floatData.set(cam.viewProj, 0);
    // Frustum planes (6 * vec4) — extracted from viewProj
    const planes = extractFrustumPlanes(cam.viewProj);
    for (let i = 0; i < 6; i++) {
      floatData.set(planes[i], 16 + i * 4);
    }
    // Remaining uniforms
    uintData[40] = this.currentAtomCount; // atomCount (u32)
    uintData[41] = state.colorMode;       // colorMode (u32)
    floatData[42] = state.propMin;        // propMin (f32)
    floatData[43] = state.propMax;        // propMax (f32)
    uintData[44] = state.colormapType;    // colormapType (u32)

    this.device.queue.writeBuffer(this.cullUniformBuffer, 0, buffer);
  }

  /**
   * Encode the full compute→render pass into a command encoder.
   * Call this once per frame.
   */
  encode(
    encoder: GPUCommandEncoder,
    renderTarget: GPURenderPassDescriptor,
  ) {
    // 1. Reset indirect draw args
    {
      const pass = encoder.beginComputePass({ label: 'reset-pass' });
      pass.setPipeline(this.resetPipeline);
      pass.setBindGroup(0, this.cullBindGroup);
      pass.dispatchWorkgroups(1);
      pass.end();
    }

    // 2. Cull + color compute
    if (this.currentAtomCount > 0) {
      const workgroups = Math.ceil(this.currentAtomCount / 256);
      const pass = encoder.beginComputePass({ label: 'cull-pass' });
      pass.setPipeline(this.cullPipeline);
      pass.setBindGroup(0, this.cullBindGroup);
      pass.dispatchWorkgroups(workgroups);
      pass.end();
    }

    // 3. Render impostor spheres
    {
      const pass = encoder.beginRenderPass(renderTarget);
      pass.setPipeline(this.renderPipeline);
      pass.setBindGroup(0, this.renderBindGroup0);
      pass.setBindGroup(1, this.renderBindGroup1);
      pass.drawIndirect(this.indirectDrawBuffer, 0);
      pass.end();
    }
  }

  /** Clean up GPU resources */
  destroy() {
    this.positionBuffer.destroy();
    this.typeBuffer.destroy();
    this.propertyBuffer.destroy();
    this.visiblePositionBuffer.destroy();
    this.visibleRadiiBuffer.destroy();
    this.visibleColorBuffer.destroy();
    this.indirectDrawBuffer.destroy();
    this.cameraUniformBuffer.destroy();
    this.lightingUniformBuffer.destroy();
    this.cullUniformBuffer.destroy();
  }
}

/** Extract 6 frustum planes from a view-projection matrix */
function extractFrustumPlanes(m: Float32Array): Float32Array[] {
  const planes: Float32Array[] = [];
  // Left, Right, Bottom, Top, Near, Far
  const rows = [
    [m[3]+m[0], m[7]+m[4], m[11]+m[8], m[15]+m[12]],  // left
    [m[3]-m[0], m[7]-m[4], m[11]-m[8], m[15]-m[12]],  // right
    [m[3]+m[1], m[7]+m[5], m[11]+m[9], m[15]+m[13]],  // bottom
    [m[3]-m[1], m[7]-m[5], m[11]-m[9], m[15]-m[13]],  // top
    [m[3]+m[2], m[7]+m[6], m[11]+m[10], m[15]+m[14]], // near
    [m[3]-m[2], m[7]-m[6], m[11]-m[10], m[15]-m[14]], // far
  ];
  for (const r of rows) {
    const len = Math.sqrt(r[0]*r[0] + r[1]*r[1] + r[2]*r[2]);
    planes.push(new Float32Array([r[0]/len, r[1]/len, r[2]/len, r[3]/len]));
  }
  return planes;
}

export async function initWebGPU(): Promise<{ device: GPUDevice; format: GPUTextureFormat } | null> {
  if (!(navigator as any).gpu) {
    console.warn('WebGPU not supported — falling back');
    return null;
  }
  const adapter = await (navigator as any).gpu.requestAdapter({
    powerPreference: 'high-performance',
  });
  if (!adapter) {
    console.warn('No WebGPU adapter found');
    return null;
  }
  const device = await adapter.requestDevice({
    requiredLimits: {
      maxStorageBufferBindingSize: 512 * 1024 * 1024, // 512MB for large systems
      maxBufferSize: 512 * 1024 * 1024,
    },
  });
  device.lost.then((info: any) => {
    console.error('WebGPU device lost:', info.message);
  });
  const format = (navigator as any).gpu.getPreferredCanvasFormat();
  return { device, format };
}
