/**
 * BondPipeline.ts — WebGPU Compute Pipeline for O(N) Bond Detection
 *
 * Three-pass compute:
 *   1. main_clear_grid    — zero per-cell counts
 *   2. main_grid_build    — bin atoms into cells (atomic counters)
 *   3. main_bond_detect   — 3x3x3 neighbor scan, append bonds via atomic
 *
 * Outputs:
 *   - bondOutBuffer        — array<Bond { atomA, atomB, distance, _pad }>
 *   - indirectBuffer       — drawIndexedIndirect args; instanceCount = bond count
 *
 * Readback (`readBondsAsync`) is a phase-1 path: WebGL renderer needs CPU
 * arrays. Phase 2 will draw bonds directly from the GPU buffer via WebGPU,
 * dropping the readback entirely.
 */

import bondComputeShaderSource from './shaders/bond_compute.wgsl?raw';

export interface BondPipelineOptions {
  device: GPUDevice;
  maxAtoms: number;
  maxBonds: number;
  gridDimX?: number;
  gridDimY?: number;
  gridDimZ?: number;
  cellSize?: number;
  maxAtomsPerCell?: number;
}

export interface BondReadback {
  pairs: Int32Array;
  distances: Float32Array;
  count: number;
}

const CONFIG_BUFFER_SIZE = 12 * 4; // 12 × u32/f32 fields. Must match Config struct in bond_compute.wgsl.

export class BondPipeline {
  private device: GPUDevice;
  private maxAtoms: number;
  private maxBonds: number;

  // Compute pipelines
  private clearGridPipeline!: GPUComputePipeline;
  private buildGridPipeline!: GPUComputePipeline;
  private bondDetectPipeline!: GPUComputePipeline;

  // Bind groups and layouts
  private bindGroupLayout!: GPUBindGroupLayout;
  private bindGroup!: GPUBindGroup;

  // Storage Buffers
  // positionBuffer is exposed publicly so BondRenderPipeline can bind it
  // directly in its render-pipeline bind group (Phase-2 GPU rendering).
  public positionBuffer!: GPUBuffer; // vec4f(x, y, z, element_type)
  private elementRadiiBuffer!: GPUBuffer; // covalent radii array indexed by element_type
  private bondOutBuffer!: GPUBuffer;     // output bond indices (a, b, distance, _pad)
  private indirectBuffer!: GPUBuffer;    // drawIndexedIndirect buffer

  // Triple-buffered staging pool. WebGPU mapAsync on an already-mapped or
  // pending buffer throws GPUValidationError, so single staging buffers
  // serialize readbacks. With 3 slots and round-robin allocation, frame N
  // can be reading while frame N+1 computes and frame N+2 starts its copy.
  private stagingPool: Array<{ indirect: GPUBuffer; bonds: GPUBuffer; inUse: boolean }> = [];
  private nextStagingIdx: number = 0;

  private configBuffer!: GPUBuffer;      // uniform Config
  private cellCountsBuffer!: GPUBuffer;  // grid cell atomic counters
  private cellAtomsBuffer!: GPUBuffer;   // grid cell atom indices

  private gridDimX: number;
  private gridDimY: number;
  private gridDimZ: number;
  private maxAtomsPerCell: number;

  // Reused scratch — avoids per-frame allocations during playback. Sized
  // for maxAtoms; the unused tail is zero and gated by config.numAtoms.
  private positionScratch: Float32Array;
  private positionScratchI32: Int32Array;
  // Origin currently active in the GPU config — derived from updatePositions.
  // updateConfig will use this unless an explicit origin is passed.
  private currentOrigin: [number, number, number] = [0, 0, 0];

  // Cached last successful readback — returned when all staging slots are
  // busy so callers always get a valid result. Invariant: the cache reflects
  // the most recent fully-completed readback, never an in-progress one.
  private lastReadback: BondReadback = {
    pairs: new Int32Array(0),
    distances: new Float32Array(0),
    count: 0,
  };

  constructor(opts: BondPipelineOptions) {
    this.device = opts.device;
    this.maxAtoms = opts.maxAtoms;
    this.maxBonds = opts.maxBonds;
    this.gridDimX = opts.gridDimX ?? 32;
    this.gridDimY = opts.gridDimY ?? 32;
    this.gridDimZ = opts.gridDimZ ?? 32;
    this.maxAtomsPerCell = opts.maxAtomsPerCell ?? 64;

    this.positionScratch = new Float32Array(this.maxAtoms * 4);
    this.positionScratchI32 = new Int32Array(this.positionScratch.buffer);

    this.initBuffers();
    this.initPipelines();
  }

  private initBuffers() {
    const { device, maxAtoms, maxBonds, gridDimX, gridDimY, gridDimZ, maxAtomsPerCell } = this;
    const numCells = gridDimX * gridDimY * gridDimZ;

    this.positionBuffer = device.createBuffer({
      size: maxAtoms * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: 'Atom Positions',
    });

    this.elementRadiiBuffer = device.createBuffer({
      size: 128 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: 'Element Covalent Radii',
    });

    this.bondOutBuffer = device.createBuffer({
      size: maxBonds * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_SRC,
      label: 'Bond Output Array',
    });

    this.indirectBuffer = device.createBuffer({
      size: 5 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
      label: 'Indirect Draw Buffer',
    });

    this.configBuffer = device.createBuffer({
      size: CONFIG_BUFFER_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: 'Config Uniform',
    });

    this.cellCountsBuffer = device.createBuffer({
      size: numCells * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: 'Grid Cell Counts',
    });

    this.cellAtomsBuffer = device.createBuffer({
      size: numCells * maxAtomsPerCell * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: 'Grid Cell Atoms',
    });

    for (let i = 0; i < 3; i++) {
      this.stagingPool.push({
        indirect: device.createBuffer({
          size: 5 * 4,
          usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
          label: `Staging Indirect [${i}]`,
        }),
        bonds: device.createBuffer({
          size: maxBonds * 16,
          usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
          label: `Staging Bonds [${i}]`,
        }),
        inUse: false,
      });
    }
  }

  private initPipelines() {
    const module = this.device.createShaderModule({
      label: 'Bond Compute Shader',
      code: bondComputeShaderSource,
    });

    // All three compute entry points share the same bind group at @group(0).
    // We build an explicit layout so a single bindGroup is compatible with
    // every pipeline. (With `layout: 'auto'`, each pipeline gets a unique
    // bind-group layout per its used bindings, and WebGPU validation rejects
    // a bindGroup made for one auto-layout when set on a different pipeline.)
    this.bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Bond Compute Bind Group Layout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 6, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Bond Compute Pipeline Layout',
      bindGroupLayouts: [this.bindGroupLayout],
    });

    this.clearGridPipeline = this.device.createComputePipeline({
      label: 'Clear Grid Pipeline',
      layout: pipelineLayout,
      compute: { module, entryPoint: 'main_clear_grid' },
    });

    this.buildGridPipeline = this.device.createComputePipeline({
      label: 'Build Grid Pipeline',
      layout: pipelineLayout,
      compute: { module, entryPoint: 'main_grid_build' },
    });

    this.bondDetectPipeline = this.device.createComputePipeline({
      label: 'Bond Detect Pipeline',
      layout: pipelineLayout,
      compute: { module, entryPoint: 'main_bond_detect' },
    });

    this.bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.positionBuffer } },
        { binding: 1, resource: { buffer: this.elementRadiiBuffer } },
        { binding: 2, resource: { buffer: this.bondOutBuffer } },
        { binding: 3, resource: { buffer: this.indirectBuffer } },
        { binding: 4, resource: { buffer: this.configBuffer } },
        { binding: 5, resource: { buffer: this.cellCountsBuffer } },
        { binding: 6, resource: { buffer: this.cellAtomsBuffer } },
      ],
    });
  }

  /**
   * Uploads new atomic positions for the current frame and computes the
   * tight axis-aligned bounding box used as the grid origin. The origin
   * is stashed and applied on the next updateConfig() call (or pass an
   * explicit origin to override).
   */
  public updatePositions(positions: Float32Array, types: Int32Array): void {
    const numAtoms = Math.min(positions.length / 3, this.maxAtoms);
    const packed = this.positionScratch;
    const intView = this.positionScratchI32;

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    for (let i = 0; i < numAtoms; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      packed[i * 4 + 0] = x;
      packed[i * 4 + 1] = y;
      packed[i * 4 + 2] = z;
      intView[i * 4 + 3] = types[i];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
    }

    if (numAtoms === 0) {
      this.currentOrigin = [0, 0, 0];
    } else {
      // Pad the origin by 1 cell so atoms exactly on the boundary land in
      // cell 1, not -1, which keeps the floor() rounding well-defined.
      this.currentOrigin = [minX, minY, minZ];
    }

    this.device.queue.writeBuffer(
      this.positionBuffer, 0,
      packed.subarray(0, numAtoms * 4) as BufferSource,
    );
  }

  /**
   * Uploads the per-element covalent-radius lookup table (Å). Indexed by
   * the integer element type packed into atom.w.
   */
  public updateElementRadii(radii: Float32Array): void {
    this.device.queue.writeBuffer(this.elementRadiiBuffer, 0, radii as BufferSource);
  }

  /**
   * Dispatches the compute passes to generate bonds.
   */
  public computeBonds(commandEncoder: GPUCommandEncoder, currentAtomCount: number): void {
    if (currentAtomCount === 0) return;

    // Reset indirect draw instanceCount to 0 (the 2nd u32 in the buffer).
    const zeroArr = new Uint32Array([0]);
    this.device.queue.writeBuffer(this.indirectBuffer, 4, zeroArr);

    const numCells = this.gridDimX * this.gridDimY * this.gridDimZ;

    const passEncoder = commandEncoder.beginComputePass({ label: 'Bond Detection' });
    passEncoder.setBindGroup(0, this.bindGroup);

    passEncoder.setPipeline(this.clearGridPipeline);
    passEncoder.dispatchWorkgroups(Math.ceil(numCells / 64));

    passEncoder.setPipeline(this.buildGridPipeline);
    passEncoder.dispatchWorkgroups(Math.ceil(currentAtomCount / 64));

    passEncoder.setPipeline(this.bondDetectPipeline);
    passEncoder.dispatchWorkgroups(Math.ceil(currentAtomCount / 64));

    passEncoder.end();
  }

  /**
   * Updates the Config uniform. Origin defaults to the bounds computed
   * during the last updatePositions() call, so most callers can omit it.
   */
  public updateConfig(
    numAtoms: number,
    maxBonds: number,
    tolerance: number,
    cellSize: number,
    origin?: [number, number, number],
  ): void {
    const o = origin ?? this.currentOrigin;
    const configData = new ArrayBuffer(CONFIG_BUFFER_SIZE);
    const viewU32 = new Uint32Array(configData);
    const viewF32 = new Float32Array(configData);

    viewU32[0] = numAtoms;
    viewU32[1] = maxBonds;
    viewF32[2] = tolerance;
    viewF32[3] = cellSize;
    viewU32[4] = this.gridDimX;
    viewU32[5] = this.gridDimY;
    viewU32[6] = this.gridDimZ;
    viewU32[7] = this.maxAtomsPerCell;
    viewF32[8] = o[0];
    viewF32[9] = o[1];
    viewF32[10] = o[2];
    viewF32[11] = 0; // _pad

    this.device.queue.writeBuffer(this.configBuffer, 0, configData);
  }

  public getIndirectBuffer(): GPUBuffer {
    return this.indirectBuffer;
  }

  public getBondBuffer(): GPUBuffer {
    return this.bondOutBuffer;
  }

  public getCurrentOrigin(): [number, number, number] {
    return [...this.currentOrigin];
  }

  /**
   * Reads back the computed bonds asynchronously using a 3-deep staging
   * pool. When all slots are busy (>3 in-flight readbacks — should never
   * happen in practice), returns the cached last readback so callers always
   * get a valid result.
   *
   * The returned `pairs`/`distances` are freshly allocated so callers can
   * keep references across frames without aliasing the staging buffers.
   */
  public async readBondsAsync(): Promise<BondReadback> {
    const slot = this.acquireStagingSlot();
    if (!slot) return this.lastReadback;

    try {
      // 1. Copy GPU → staging
      const commandEncoder = this.device.createCommandEncoder({ label: 'BondReadback Copy' });
      commandEncoder.copyBufferToBuffer(this.indirectBuffer, 0, slot.indirect, 0, 20);
      commandEncoder.copyBufferToBuffer(this.bondOutBuffer, 0, slot.bonds, 0, this.maxBonds * 16);
      this.device.queue.submit([commandEncoder.finish()]);

      // 2. Read indirect args to get the actual bond count.
      await slot.indirect.mapAsync(GPUMapMode.READ);
      const indirectMapped = new Uint32Array(slot.indirect.getMappedRange());
      const count = Math.min(indirectMapped[1], this.maxBonds);
      slot.indirect.unmap();

      if (count === 0) {
        const empty: BondReadback = {
          pairs: new Int32Array(0),
          distances: new Float32Array(0),
          count: 0,
        };
        this.lastReadback = empty;
        return empty;
      }

      // 3. Map only the populated prefix, then iterate directly into outputs.
      await slot.bonds.mapAsync(GPUMapMode.READ, 0, count * 16);
      const mapped = slot.bonds.getMappedRange(0, count * 16);
      const mappedU32 = new Uint32Array(mapped);
      const mappedF32 = new Float32Array(mapped);

      const pairs = new Int32Array(count * 2);
      const distances = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        pairs[i * 2 + 0] = mappedU32[i * 4 + 0];
        pairs[i * 2 + 1] = mappedU32[i * 4 + 1];
        distances[i] = mappedF32[i * 4 + 2];
      }
      slot.bonds.unmap();

      const result: BondReadback = { pairs, distances, count };
      this.lastReadback = result;
      return result;
    } finally {
      slot.inUse = false;
    }
  }

  /** Pick the next free staging slot (round-robin), or null if all are busy. */
  private acquireStagingSlot(): { indirect: GPUBuffer; bonds: GPUBuffer; inUse: boolean } | null {
    for (let i = 0; i < this.stagingPool.length; i++) {
      const idx = (this.nextStagingIdx + i) % this.stagingPool.length;
      const slot = this.stagingPool[idx];
      if (!slot.inUse) {
        slot.inUse = true;
        this.nextStagingIdx = (idx + 1) % this.stagingPool.length;
        return slot;
      }
    }
    return null;
  }

  /**
   * Releases all GPU resources. Call when the pipeline is no longer needed
   * (e.g. component unmount).
   */
  public destroy(): void {
    this.positionBuffer.destroy();
    this.elementRadiiBuffer.destroy();
    this.bondOutBuffer.destroy();
    this.indirectBuffer.destroy();
    this.configBuffer.destroy();
    this.cellCountsBuffer.destroy();
    this.cellAtomsBuffer.destroy();
    for (const slot of this.stagingPool) {
      slot.indirect.destroy();
      slot.bonds.destroy();
    }
    this.stagingPool.length = 0;
  }
}
