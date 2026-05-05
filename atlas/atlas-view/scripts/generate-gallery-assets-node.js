/**
 * Node.js Batch Asset Generator
 *
 * Generates real snapshot images + GLB models for all gallery examples.
 *
 *   - Images: 2D canvas rendering of real atom positions using node-canvas
 *   - GLBs:   @gltf-transform/core (works reliably in Node.js)
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const { Document, NodeIO } = require('@gltf-transform/core');

const galleryData = require('../packages/ui/src/gallery-data.json');

const OUTPUT_DIR = path.resolve(__dirname, '../apps/web/public/gallery');
const PUBLIC_DIR = path.resolve(__dirname, '../apps/web/public');

const SNAPSHOT_WIDTH = 640;
const SNAPSHOT_HEIGHT = 280;
const MAX_ATOMS_RENDER = 20000; // Cap for performance

fs.mkdirSync(path.join(OUTPUT_DIR, 'snapshots'), { recursive: true });
fs.mkdirSync(path.join(OUTPUT_DIR, 'models'), { recursive: true });

// ─── Parse files ────────────────────────────────────────────────────────

function parseXYZ(content) {
  const lines = content.split('\n');
  const frames = [];
  const typeMap = new Map();
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) { i++; continue; }
    const natoms = parseInt(line);
    if (isNaN(natoms) || natoms <= 0) { i++; continue; }
    const comment = lines[i + 1]?.trim() || '';
    const positions = [];
    const types = [];
    let typeId = typeMap.size + 1;
    for (let j = 0; j < natoms; j++) {
      const parts = lines[i + 2 + j]?.trim().split(/\s+/);
      if (!parts || parts.length < 4) continue;
      const symbol = parts[0];
      const x = parseFloat(parts[1]);
      const y = parseFloat(parts[2]);
      const z = parseFloat(parts[3]);
      if (isNaN(x) || isNaN(y) || isNaN(z)) continue;
      positions.push(x, y, z);
      if (!typeMap.has(symbol)) typeMap.set(symbol, typeId++);
      types.push(typeMap.get(symbol));
    }
    frames.push({ natoms: positions.length / 3, positions, types, comment });
    i += 2 + natoms;
  }
  return { frames, atomTypes: Array.from(typeMap.keys()) };
}

function parseLammpsDump(content) {
  const lines = content.split('\n');
  const frames = [];
  let i = 0;
  while (i < lines.length) {
    if (!lines[i].includes('ITEM: TIMESTEP')) { i++; continue; }
    i += 2;
    if (!lines[i]?.includes('ITEM: NUMBER OF ATOMS')) { i++; continue; }
    const natoms = parseInt(lines[i + 1]);
    i += 2;
    while (i < lines.length && !lines[i].includes('ITEM: ATOMS')) i++;
    if (i >= lines.length) break;
    const atomLine = lines[i];
    const headers = atomLine.replace('ITEM: ATOMS', '').trim().split(/\s+/);
    const typeIdx = headers.indexOf('type');
    const xIdx = headers.indexOf('x');
    const yIdx = headers.indexOf('y');
    const zIdx = headers.indexOf('z');
    const xsIdx = headers.indexOf('xs');
    const ysIdx = headers.indexOf('ys');
    const zsIdx = headers.indexOf('zs');
    i++;
    const positions = [];
    const types = [];
    for (let j = 0; j < natoms && i < lines.length; j++, i++) {
      const parts = lines[i].trim().split(/\s+/);
      if (parts.length < 3) { j--; continue; }
      const t = parseInt(parts[typeIdx >= 0 ? typeIdx : 1]) || 1;
      let x, y, z;
      if (xIdx >= 0) {
        x = parseFloat(parts[xIdx]);
        y = parseFloat(parts[yIdx]);
        z = parseFloat(parts[zIdx]);
      } else if (xsIdx >= 0) {
        x = parseFloat(parts[xsIdx]);
        y = parseFloat(parts[ysIdx]);
        z = parseFloat(parts[zsIdx]);
      } else {
        x = parseFloat(parts[2]);
        y = parseFloat(parts[3]);
        z = parseFloat(parts[4]);
      }
      positions.push(x, y, z);
      types.push(t);
    }
    frames.push({ natoms: positions.length / 3, positions, types });
  }
  return { frames, atomTypes: [] };
}

function parseExtendedXYZ(content) {
  const lines = content.split('\n');
  const natoms = parseInt(lines[0].trim());
  const comment = lines[1].trim();
  const positions = [];
  const types = [];
  const typeMap = new Map();
  let typeId = 1;
  for (let i = 0; i < natoms; i++) {
    const parts = lines[2 + i]?.trim().split(/\s+/);
    if (!parts || parts.length < 4) continue;
    const symbol = parts[0];
    const x = parseFloat(parts[1]);
    const y = parseFloat(parts[2]);
    const z = parseFloat(parts[3]);
    if (isNaN(x) || isNaN(y) || isNaN(z)) continue;
    positions.push(x, y, z);
    if (!typeMap.has(symbol)) typeMap.set(symbol, typeId++);
    types.push(typeMap.get(symbol));
  }
  return {
    frames: [{ natoms: positions.length / 3, positions, types, comment }],
    atomTypes: Array.from(typeMap.keys()),
  };
}

// ─── Element colors (CPK) ───────────────────────────────────────────────

const ELEMENT_COLORS = {
  H: [1.0, 1.0, 1.0], He: [0.85, 1.0, 1.0],
  Li: [0.8, 0.5, 1.0], Be: [0.76, 1.0, 0.0], B: [1.0, 0.71, 0.71],
  C: [0.56, 0.56, 0.56], N: [0.19, 0.31, 0.97], O: [1.0, 0.05, 0.05],
  F: [0.56, 0.88, 0.31], Ne: [0.7, 0.89, 0.96],
  Na: [0.67, 0.36, 0.95], Mg: [0.54, 1.0, 0.0], Al: [0.75, 0.65, 0.65],
  Si: [0.94, 0.78, 0.63], P: [1.0, 0.5, 0.0], S: [1.0, 1.0, 0.19],
  Cl: [0.12, 0.94, 0.12], Ar: [0.5, 0.82, 0.89],
  K: [0.56, 0.25, 0.83], Ca: [0.24, 1.0, 0.0], Sc: [0.9, 0.9, 0.9],
  Ti: [0.75, 0.76, 0.78], V: [0.65, 0.65, 0.67], Cr: [0.54, 0.6, 0.78],
  Mn: [0.61, 0.48, 0.78], Fe: [0.88, 0.4, 0.2], Co: [0.94, 0.56, 0.63],
  Ni: [0.31, 0.82, 0.31], Cu: [0.78, 0.5, 0.2], Zn: [0.49, 0.5, 0.69],
  Ga: [0.76, 0.56, 0.56], Ge: [0.4, 0.56, 0.56], As: [0.74, 0.5, 0.89],
  Se: [1.0, 0.63, 0.0], Br: [0.65, 0.16, 0.16], Kr: [0.36, 0.72, 0.82],
  Rb: [0.44, 0.18, 0.69], Sr: [0.0, 1.0, 0.0], Y: [0.58, 1.0, 1.0],
  Zr: [0.58, 0.88, 0.88], Nb: [0.45, 0.76, 0.79], Mo: [0.33, 0.71, 0.71],
  Tc: [0.23, 0.62, 0.62], Ru: [0.14, 0.56, 0.56], Rh: [0.04, 0.49, 0.55],
  Pd: [0.0, 0.41, 0.52], Ag: [0.75, 0.75, 0.75], Cd: [1.0, 0.85, 0.56],
  In: [0.65, 0.46, 0.45], Sn: [0.4, 0.5, 0.5], Sb: [0.62, 0.39, 0.71],
  Te: [0.83, 0.48, 0.0], I: [0.58, 0.0, 0.58], Xe: [0.26, 0.62, 0.69],
  Cs: [0.34, 0.09, 0.56], Ba: [0.0, 0.79, 0.0], W: [0.13, 0.58, 0.58],
  Pt: [0.82, 0.82, 0.88], Au: [1.0, 0.82, 0.14], Hg: [0.72, 0.72, 0.82],
  Pb: [0.34, 0.35, 0.38], Bi: [0.62, 0.31, 0.71], Po: [0.67, 0.36, 0.0],
  U: [0.0, 0.56, 1.0],
};

function getElementColor(symbol) {
  const c = ELEMENT_COLORS[symbol] || [0.5, 0.5, 0.5];
  return `rgb(${Math.floor(c[0] * 255)}, ${Math.floor(c[1] * 255)}, ${Math.floor(c[2] * 255)})`;
}

function getTypeColor(typeId, typeSymbols) {
  if (typeSymbols && typeSymbols[typeId - 1]) {
    return getElementColor(typeSymbols[typeId - 1]);
  }
  const palette = ['#e8b4b8', '#a8d5ba', '#b8d4e3', '#f5e6a3', '#e8c4d9', '#c4e0c4', '#f0d9a8'];
  return palette[typeId % palette.length];
}

// ─── Snapshot renderer ──────────────────────────────────────────────────

function renderSnapshot(frame, typeSymbols, width, height) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0c0c10';
  ctx.fillRect(0, 0, width, height);

  if (!frame || frame.natoms === 0) return canvas;

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < frame.natoms; i++) {
    const x = frame.positions[i * 3];
    const y = frame.positions[i * 3 + 1];
    const z = frame.positions[i * 3 + 2];
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const rangeZ = maxZ - minZ || 1;
  const maxRange = Math.max(rangeX, rangeY, rangeZ);

  const scale = Math.min(width, height) / (maxRange * 1.5);
  const cx = width / 2;
  const cy = height / 2;

  const project = (x, y, z) => {
    const px = (x - (minX + maxX) / 2) * scale;
    const py = (y - (minY + maxY) / 2) * scale;
    const pz = (z - (minZ + maxZ) / 2) * scale;
    const isoX = (px - pz) * 0.707;
    const isoY = py * 0.816 + (px + pz) * 0.408;
    return { x: cx + isoX, y: cy - isoY };
  };

  // Subsample for very large systems
  const step = frame.natoms > MAX_ATOMS_RENDER ? Math.ceil(frame.natoms / MAX_ATOMS_RENDER) : 1;
  const atoms = [];
  for (let i = 0; i < frame.natoms; i += step) {
    atoms.push({
      i,
      x: frame.positions[i * 3],
      y: frame.positions[i * 3 + 1],
      z: frame.positions[i * 3 + 2],
      type: frame.types[i],
    });
  }
  atoms.sort((a, b) => (a.z + a.y) - (b.z + b.y));

  const atomRadius = Math.max(1.5, Math.min(4, 80 / Math.sqrt(atoms.length)));
  for (const atom of atoms) {
    const p = project(atom.x, atom.y, atom.z);
    const color = getTypeColor(atom.type, typeSymbols);
    const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, atomRadius * 3);
    glow.addColorStop(0, color.replace('rgb', 'rgba').replace(')', ', 0.15)'));
    glow.addColorStop(1, color.replace('rgb', 'rgba').replace(')', ', 0)'));
    ctx.fillStyle = glow;
    ctx.fillRect(p.x - atomRadius * 3, p.y - atomRadius * 3, atomRadius * 6, atomRadius * 6);
    ctx.beginPath();
    ctx.arc(p.x, p.y, atomRadius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // Bonds for small systems
  if (atoms.length < 5000) {
    const bondCutoff = 2.5;
    const bondCutoffSq = bondCutoff * bondCutoff;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < Math.min(atoms.length, 200); i++) {
      for (let j = i + 1; j < Math.min(atoms.length, 200); j++) {
        const dx = atoms[i].x - atoms[j].x;
        const dy = atoms[i].y - atoms[j].y;
        const dz = atoms[i].z - atoms[j].z;
        if (dx * dx + dy * dy + dz * dz < bondCutoffSq) {
          const p1 = project(atoms[i].x, atoms[i].y, atoms[i].z);
          const p2 = project(atoms[j].x, atoms[j].y, atoms[j].z);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }
  }

  return canvas;
}

// ─── GLB exporter ───────────────────────────────────────────────────────

async function exportGLB(frame, typeSymbols, outputPath) {
  const doc = new Document();
  const buffer = doc.createBuffer();

  // Group atoms by type
  const byType = new Map();
  for (let i = 0; i < frame.natoms; i++) {
    const t = frame.types[i];
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t).push(i);
  }

  const radius = Math.max(0.3, Math.min(1.0, 8 / Math.cbrt(Math.min(frame.natoms, MAX_ATOMS_RENDER))));

  // Create sphere geometry (icosahedron subdivision 1)
  const spherePositions = [];
  const sphereIndices = [];
  const t = (1.0 + Math.sqrt(5.0)) / 2.0;
  const verts = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ];
  const faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  for (const v of verts) {
    const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    spherePositions.push(v[0]/len, v[1]/len, v[2]/len);
  }
  for (const f of faces) {
    sphereIndices.push(f[0], f[1], f[2]);
  }

  const spherePosAccessor = doc.createAccessor()
    .setBuffer(buffer)
    .setType('VEC3')
    .setArray(new Float32Array(spherePositions));

  const sphereIndicesAccessor = doc.createAccessor()
    .setBuffer(buffer)
    .setType('SCALAR')
    .setArray(new Uint16Array(sphereIndices));

  const spherePrim = doc.createPrimitive()
    .setAttribute('POSITION', spherePosAccessor)
    .setIndices(sphereIndicesAccessor);

  const nodes = [];

  for (const [typeId, indices] of byType) {
    const colorStr = getTypeColor(typeId, typeSymbols);
    const rgb = colorStr.match(/\d+/g).map(Number);
    const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;

    // Subsample for very large systems
    const step = indices.length > MAX_ATOMS_RENDER ? Math.ceil(indices.length / MAX_ATOMS_RENDER) : 1;
    const usedIndices = [];
    for (let i = 0; i < indices.length; i += step) usedIndices.push(indices[i]);

    // For large systems, merge into a single mesh with transformed vertices
    // For smaller systems, use instanced nodes
    if (usedIndices.length > 1000) {
      // Merge approach: create one big mesh
      const mergedPositions = [];
      const mergedIndices = [];
      for (let j = 0; j < usedIndices.length; j++) {
        const idx = usedIndices[j];
        const ax = frame.positions[idx * 3];
        const ay = frame.positions[idx * 3 + 1];
        const az = frame.positions[idx * 3 + 2];
        const base = mergedPositions.length / 3;
        for (let k = 0; k < spherePositions.length; k += 3) {
          mergedPositions.push(
            spherePositions[k] * radius + ax,
            spherePositions[k + 1] * radius + ay,
            spherePositions[k + 2] * radius + az
          );
        }
        for (const f of faces) {
          mergedIndices.push(f[0] + base, f[1] + base, f[2] + base);
        }
      }
      const posAcc = doc.createAccessor().setBuffer(buffer).setType('VEC3').setArray(new Float32Array(mergedPositions));
      const idxAcc = doc.createAccessor().setBuffer(buffer).setType('SCALAR').setArray(new Uint32Array(mergedIndices));
      const prim = doc.createPrimitive().setAttribute('POSITION', posAcc).setIndices(idxAcc);
      const mat = doc.createMaterial()
        .setBaseColorFactor([r, g, b, 1.0])
        .setMetallicFactor(0.3)
        .setRoughnessFactor(0.5);
      prim.setMaterial(mat);
      const mesh = doc.createMesh().addPrimitive(prim);
      const node = doc.createNode().setMesh(mesh);
      nodes.push(node);
    } else {
      const mat = doc.createMaterial()
        .setBaseColorFactor([r, g, b, 1.0])
        .setMetallicFactor(0.3)
        .setRoughnessFactor(0.5);
      const mesh = doc.createMesh().addPrimitive(spherePrim.setMaterial(mat));
      for (const idx of usedIndices) {
        const x = frame.positions[idx * 3];
        const y = frame.positions[idx * 3 + 1];
        const z = frame.positions[idx * 3 + 2];
        const node = doc.createNode()
          .setMesh(mesh)
          .setTranslation([x, y, z])
          .setScale([radius, radius, radius]);
        nodes.push(node);
      }
    }
  }

  // Add bonds for small systems
  if (frame.natoms < 5000) {
    const bondCutoff = 2.5;
    const cutoffSq = bondCutoff * bondCutoff;
    const bondPositions = [];
    const bondIndices = [];
    const maxCheck = Math.min(frame.natoms, 300);
    for (let i = 0; i < maxCheck; i++) {
      const xi = frame.positions[i * 3];
      const yi = frame.positions[i * 3 + 1];
      const zi = frame.positions[i * 3 + 2];
      for (let j = i + 1; j < maxCheck; j++) {
        const dx = frame.positions[j * 3] - xi;
        const dy = frame.positions[j * 3 + 1] - yi;
        const dz = frame.positions[j * 3 + 2] - zi;
        if (dx * dx + dy * dy + dz * dz < cutoffSq && dx * dx + dy * dy + dz * dz > 0.01) {
          const ax = xi, ay = yi, az = zi;
          const bx = frame.positions[j * 3], by = frame.positions[j * 3 + 1], bz = frame.positions[j * 3 + 2];
          const length = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2 + (bz - az) ** 2);
          const mx = (ax + bx) / 2, my = (ay + by) / 2, mz = (az + bz) / 2;
          const dirX = (bx - ax) / length;
          const dirY = (by - ay) / length;
          const dirZ = (bz - az) / length;
          // Cylinder approximated as a thin box
          const base = bondPositions.length / 3;
          bondPositions.push(
            mx - dirY * 0.04, my + dirX * 0.04, mz,
            mx + dirY * 0.04, my - dirX * 0.04, mz,
            mx + dirX * length * 0.5, my + dirY * length * 0.5, mz + dirZ * length * 0.5,
            mx - dirX * length * 0.5, my - dirY * length * 0.5, mz - dirZ * length * 0.5,
          );
          bondIndices.push(base, base + 1, base + 2, base, base + 2, base + 3);
        }
      }
    }
    if (bondPositions.length > 0) {
      const posAcc = doc.createAccessor().setBuffer(buffer).setType('VEC3').setArray(new Float32Array(bondPositions));
      const idxAcc = doc.createAccessor().setBuffer(buffer).setType('SCALAR').setArray(new Uint16Array(bondIndices));
      const bondMat = doc.createMaterial()
        .setBaseColorFactor([0.4, 0.4, 0.4, 1.0])
        .setMetallicFactor(0.2)
        .setRoughnessFactor(0.6);
      const prim = doc.createPrimitive().setAttribute('POSITION', posAcc).setIndices(idxAcc).setMaterial(bondMat);
      const mesh = doc.createMesh().addPrimitive(prim);
      nodes.push(doc.createNode().setMesh(mesh));
    }
  }

  const scene = doc.createScene();
  for (const node of nodes) scene.addChild(node);
  doc.getRoot().setDefaultScene(scene);

  const io = new NodeIO();
  const glb = await io.writeBinary(doc);
  fs.writeFileSync(outputPath, Buffer.from(glb));
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  const examples = galleryData.filter(e => e.available && e.id !== 'lupine_brand_asset');
  console.log(`[batch] Processing ${examples.length} gallery examples...\n`);

  let completed = 0;
  let errors = 0;

  for (const example of examples) {
    const filePath = path.join(PUBLIC_DIR, example.file.replace(/^\/+/, ''));
    if (!fs.existsSync(filePath)) {
      console.log(`  ✗ ${example.id}: file not found`);
      errors++;
      continue;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      let result;
      const ext = path.extname(filePath).toLowerCase();

      if (ext === '.xyz') {
        result = parseXYZ(content);
      } else if (ext === '.lammpstrj') {
        const firstLine = content.split('\n')[0].trim();
        if (firstLine === 'ITEM: TIMESTEP') {
          result = parseLammpsDump(content);
        } else if (/^\d+$/.test(firstLine)) {
          result = parseExtendedXYZ(content);
        } else {
          throw new Error('Unknown lammpstrj format');
        }
      } else {
        throw new Error(`Unknown extension: ${ext}`);
      }

      if (result.frames.length === 0) {
        throw new Error('No frames found');
      }

      const frame = result.frames[0];

      // Generate snapshot
      const snapshotPath = path.join(OUTPUT_DIR, 'snapshots', `${example.id}.jpg`);
      const canvas = renderSnapshot(frame, result.atomTypes, SNAPSHOT_WIDTH, SNAPSHOT_HEIGHT);
      const buffer = canvas.toBuffer('image/jpeg', { quality: 0.92 });
      fs.writeFileSync(snapshotPath, buffer);

      // Generate GLB
      const glbPath = path.join(OUTPUT_DIR, 'models', `${example.id}.glb`);
      await exportGLB(frame, result.atomTypes, glbPath);

      completed++;
      console.log(`  ✓ ${example.id}: ${frame.natoms} atoms`);
    } catch (err) {
      errors++;
      console.log(`  ✗ ${example.id}: ${err.message}`);
    }
  }

  console.log(`\n[batch] Done: ${completed} succeeded, ${errors} failed`);
}

main().catch(err => {
  console.error('[batch] Fatal error:', err);
  process.exit(1);
});
