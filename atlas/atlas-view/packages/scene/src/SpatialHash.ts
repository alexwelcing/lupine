/**
 * SpatialHash3D — O(1) atom lookup for raycasting and neighbor queries
 * 
 * Used for:
 * - Atom picking (hover/click in viewport)
 * - Bond detection (find neighbors within cutoff)
 * - Selection queries (box select, radius select)
 */

export class SpatialHash3D {
  private cells = new Map<string, number[]>();
  private cellSize: number;
  private positions: Float32Array = new Float32Array(0);

  constructor(cellSize: number = 3.0) {
    this.cellSize = cellSize;
  }

  /**
   * Build spatial hash from atom positions
   * Call whenever atom positions change (new frame)
   */
  build(positions: Float32Array, natoms: number) {
    this.cells.clear();
    this.positions = positions;

    for (let i = 0; i < natoms; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      const key = this.key(x, y, z);
      
      if (!this.cells.has(key)) {
        this.cells.set(key, []);
      }
      this.cells.get(key)!.push(i);
    }
  }

  /**
   * Query atoms within radius of point
   * Returns sorted by distance (closest first)
   */
  query(x: number, y: number, z: number, radius: number): Array<{ index: number; dist: number }> {
    const results: Array<{ index: number; dist: number }> = [];
    const rCell = Math.ceil(radius / this.cellSize);
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const cz = Math.floor(z / this.cellSize);

    // Check neighboring cells
    for (let dx = -rCell; dx <= rCell; dx++) {
      for (let dy = -rCell; dy <= rCell; dy++) {
        for (let dz = -rCell; dz <= rCell; dz++) {
          const key = `${cx + dx},${cy + dy},${cz + dz}`;
          const cell = this.cells.get(key);
          
          if (cell) {
            for (const idx of cell) {
              const px = this.positions[idx * 3];
              const py = this.positions[idx * 3 + 1];
              const pz = this.positions[idx * 3 + 2];
              
              const dx = px - x;
              const dy = py - y;
              const dz = pz - z;
              const distSq = dx * dx + dy * dy + dz * dz;
              
              if (distSq < radius * radius) {
                results.push({ index: idx, dist: Math.sqrt(distSq) });
              }
            }
          }
        }
      }
    }

    // Sort by distance
    return results.sort((a, b) => a.dist - b.dist);
  }

  /**
   * Find closest atom to point
   * Returns null if no atoms within maxRadius
   */
  closest(x: number, y: number, z: number, maxRadius: number = 10): { index: number; dist: number } | null {
    // Search in expanding spheres for efficiency
    let searchRadius = this.cellSize;
    
    while (searchRadius <= maxRadius) {
      const found = this.query(x, y, z, searchRadius);
      if (found.length > 0) {
        return found[0];
      }
      searchRadius *= 2;
    }
    
    return null;
  }

  /**
   * Get all atoms in cell containing point
   * Fast O(1) lookup for exact cell matches
   */
  getCell(x: number, y: number, z: number): number[] {
    const key = this.key(x, y, z);
    return this.cells.get(key) ?? [];
  }

  /**
   * Generate bond pairs based on distance cutoff
   * Returns array of [atom1, atom2] pairs
   */
  findBonds(maxBondLength: number, typeCutoffs?: Map<string, number>): Array<[number, number]> {
    const bonds: Array<[number, number]> = [];
    const visited = new Set<string>();
    const rCell = Math.ceil(maxBondLength / this.cellSize);

    // Iterate all cells
    for (const [key, atoms] of this.cells) {
      const [cx, cy, cz] = key.split(',').map(Number);

      for (const i of atoms) {
        const ix = this.positions[i * 3];
        const iy = this.positions[i * 3 + 1];
        const iz = this.positions[i * 3 + 2];

        // Check neighboring cells (including self)
        for (let dx = -rCell; dx <= rCell; dx++) {
          for (let dy = -rCell; dy <= rCell; dy++) {
            for (let dz = -rCell; dz <= rCell; dz++) {
              const nKey = `${cx + dx},${cy + dy},${cz + dz}`;
              const nCell = this.cells.get(nKey);
              if (!nCell) continue;

              for (const j of nCell) {
                if (i >= j) continue; // Avoid duplicates

                const pairKey = `${i}-${j}`;
                if (visited.has(pairKey)) continue;
                visited.add(pairKey);

                const jx = this.positions[j * 3];
                const jy = this.positions[j * 3 + 1];
                const jz = this.positions[j * 3 + 2];

                const dx = jx - ix;
                const dy = jy - iy;
                const dz = jz - iz;
                const distSq = dx * dx + dy * dy + dz * dz;

                // Use type-specific cutoff if provided
                let cutoff = maxBondLength;
                if (typeCutoffs) {
                  // Would need atom types passed in
                  // cutoff = typeCutoffs.get(`${typeI}-${typeJ}`) ?? maxBondLength;
                }

                if (distSq < cutoff * cutoff) {
                  bonds.push([i, j]);
                }
              }
            }
          }
        }
      }
    }

    return bonds;
  }

  /** Clear all data */
  clear() {
    this.cells.clear();
    this.positions = new Float32Array(0);
  }

  /** Get statistics */
  stats() {
    let totalAtoms = 0;
    let maxInCell = 0;
    
    for (const atoms of this.cells.values()) {
      totalAtoms += atoms.length;
      maxInCell = Math.max(maxInCell, atoms.length);
    }

    return {
      numCells: this.cells.size,
      totalAtoms,
      avgPerCell: totalAtoms / (this.cells.size || 1),
      maxInCell,
    };
  }

  private key(x: number, y: number, z: number): string {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)},${Math.floor(z / this.cellSize)}`;
  }
}
