import * as THREE from 'three';
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js';

const AR_EXPORT_DEBUG = (import.meta as any).env?.DEV;

// Pre-allocated objects for baking to avoid GC pauses
const _bakeMat4 = new THREE.Matrix4();
const _bakeMat3 = new THREE.Matrix3();
const _bakeCol = new THREE.Color();

// Scratch objects for the shared-mesh (instance → many cheap Xform) path.
const _instMat4 = new THREE.Matrix4();
const _instCol = new THREE.Color();

function toExportSafeMaterial(
  src: THREE.Material,
  paletteTexture?: THREE.Texture,
): THREE.MeshStandardMaterial {
  const anySrc = src as any;
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(1, 1, 1),
    vertexColors: !paletteTexture,
    transparent: anySrc.transparent === true,
    opacity: typeof anySrc.opacity === 'number' ? anySrc.opacity : 1.0,
    roughness: typeof anySrc.roughness === 'number' ? anySrc.roughness : 0.45,
    metalness: typeof anySrc.metalness === 'number' ? anySrc.metalness : 0.15,
    map: paletteTexture ?? anySrc.map ?? null,
    normalMap: anySrc.normalMap ?? null,
    roughnessMap: anySrc.roughnessMap ?? null,
    metalnessMap: anySrc.metalnessMap ?? null,
    emissiveMap: anySrc.emissiveMap ?? null,
    emissive: anySrc.emissive?.clone?.() ?? new THREE.Color(0, 0, 0),
    emissiveIntensity: typeof anySrc.emissiveIntensity === 'number' ? anySrc.emissiveIntensity : 1.0,
  });
  (mat as any).onBeforeCompile = undefined;
  return mat;
}

/**
 * Build a USDZ-safe MeshStandardMaterial whose flat color is a per-group RGB
 * (no vertex colors / no palette texture). All other surface params are carried
 * from the source InstancedMesh material so roughness/metalness/opacity match.
 */
function toExportSafeMaterialForColor(
  src: THREE.Material,
  color: THREE.Color,
): THREE.MeshStandardMaterial {
  const mat = toExportSafeMaterial(src);          // vertexColors:true, color white
  mat.vertexColors = false;                        // group color drives the surface
  mat.color.copy(color);
  return mat;
}

function buildPaletteFromColors(
  instanceColors: Float32Array,
  totalVerts: number,
  vPerInstance: number,
  instanceCount: number,
): { texture: THREE.Texture; uvs: Float32Array } {
  const uniqueMap = new Map<number, number>(); 
  const instancePaletteIndex = new Uint32Array(instanceCount);

  for (let i = 0; i < instanceCount; i++) {
    const off = i * 3;
    const r = instanceColors[off], g = instanceColors[off + 1], b = instanceColors[off + 2];
    const key = (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
    
    let idx = uniqueMap.get(key);
    if (idx === undefined) {
      idx = uniqueMap.size;
      uniqueMap.set(key, idx);
    }
    instancePaletteIndex[i] = idx;
  }

  const paletteSize = Math.max(uniqueMap.size, 1);
  const canvas = document.createElement('canvas');
  canvas.width = paletteSize;
  canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(paletteSize, 1);
  const data = imageData.data;
  
  for (const [key, idx] of uniqueMap) {
    const off = idx * 4;
    data[off] = (key >> 16) & 0xff;
    data[off + 1] = (key >> 8) & 0xff;
    data[off + 2] = key & 0xff;
    data[off + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.needsUpdate = true;

  const uvs = new Float32Array(totalVerts * 2);
  for (let i = 0; i < instanceCount; i++) {
    const u = (instancePaletteIndex[i] + 0.5) / paletteSize;
    const v = 0.5;
    const vBase = i * vPerInstance * 2;
    for (let vi = 0; vi < vPerInstance; vi++) {
      const off = vBase + vi * 2;
      uvs[off] = u;
      uvs[off + 1] = v;
    }
  }

  if (AR_EXPORT_DEBUG) {
    console.info('[AR export] palette texture', {
      uniqueColors: paletteSize,
      totalInstances: instanceCount
    });
  }

  return { texture, uvs };
}

function bakeInstancedMesh(im: THREE.InstancedMesh): THREE.Mesh {
  const baseGeom = im.geometry;
  const basePos = baseGeom.getAttribute('position') as THREE.BufferAttribute;
  const baseNorm = baseGeom.getAttribute('normal') as THREE.BufferAttribute | undefined;
  const baseIdx = baseGeom.getIndex();

  const vPerInstance = basePos.count;
  const iPerInstance = baseIdx ? baseIdx.count : 0;
  const N = im.count;

  const totalVerts = vPerInstance * N;
  const totalIdx = iPerInstance * N;

  const positions = new Float32Array(totalVerts * 3);
  const normals = baseNorm ? new Float32Array(totalVerts * 3) : null;
  const indices = baseIdx
    ? (totalVerts > 65535 ? new Uint32Array(totalIdx) : new Uint16Array(totalIdx))
    : null;

  const instanceColors = new Float32Array(N * 3);
  const hasInstanceColor = (im as any).instanceColor != null;
  const posArr = basePos.array;
  const normArr = baseNorm ? baseNorm.array : null;

  // Bond mesh applies per-instance radius taper inside its custom shader via the
  // `radiusBT` instanced attribute. The USDZ exporter strips shaders, so we have
  // to bake the same `mix(radiusBT.x, radiusBT.y, position.y + 0.5)` lateral
  // scaling into the vertex positions here — otherwise every bond exports as a
  // unit-radius cylinder.
  const radiusBTAttr = baseGeom.getAttribute('radiusBT') as THREE.InstancedBufferAttribute | undefined;
  const radiusBTArr = radiusBTAttr ? (radiusBTAttr.array as ArrayLike<number>) : null;

  for (let i = 0; i < N; i++) {
    im.getMatrixAt(i, _bakeMat4);
    if (hasInstanceColor) im.getColorAt(i, _bakeCol);
    else _bakeCol.setRGB(1, 1, 1);

    _bakeMat3.getNormalMatrix(_bakeMat4);

    const m = _bakeMat4.elements;
    const m00 = m[0], m01 = m[4], m02 = m[8], m03 = m[12];
    const m10 = m[1], m11 = m[5], m12 = m[9], m13 = m[13];
    const m20 = m[2], m21 = m[6], m22 = m[10], m23 = m[14];

    const n = _bakeMat3.elements;
    const n00 = n[0], n01 = n[3], n02 = n[6];
    const n10 = n[1], n11 = n[4], n12 = n[7];
    const n20 = n[2], n21 = n[5], n22 = n[8];

    const rB = radiusBTArr ? radiusBTArr[i * 2]     : 1;
    const rT = radiusBTArr ? radiusBTArr[i * 2 + 1] : 1;

    const vBase = i * vPerInstance;
    for (let v = 0; v < vPerInstance; v++) {
      const srcOff = v * 3;
      let x = posArr[srcOff];
      const y = posArr[srcOff + 1];
      let z = posArr[srcOff + 2];

      if (radiusBTArr) {
        const r = rB + (rT - rB) * (y + 0.5);
        x *= r;
        z *= r;
      }

      const dstOff = (vBase + v) * 3;
      positions[dstOff]     = m00 * x + m01 * y + m02 * z + m03;
      positions[dstOff + 1] = m10 * x + m11 * y + m12 * z + m13;
      positions[dstOff + 2] = m20 * x + m21 * y + m22 * z + m23;

      if (normals && normArr) {
        const nx = normArr[srcOff];
        const ny = normArr[srcOff + 1];
        const nz = normArr[srcOff + 2];

        let rx = n00 * nx + n01 * ny + n02 * nz;
        let ry = n10 * nx + n11 * ny + n12 * nz;
        let rz = n20 * nx + n21 * ny + n22 * nz;

        const len = 1.0 / Math.sqrt(rx * rx + ry * ry + rz * rz);
        normals[dstOff]     = rx * len;
        normals[dstOff + 1] = ry * len;
        normals[dstOff + 2] = rz * len;
      }
    }

    const cOff = i * 3;
    instanceColors[cOff]     = _bakeCol.r;
    instanceColors[cOff + 1] = _bakeCol.g;
    instanceColors[cOff + 2] = _bakeCol.b;

    if (indices && baseIdx) {
      const iBase = i * iPerInstance;
      for (let k = 0; k < iPerInstance; k++) {
        indices[iBase + k] = baseIdx.getX(k) + vBase;
      }
    }
  }

  const { texture: paletteTexture, uvs: paletteUVs } = buildPaletteFromColors(
    instanceColors, totalVerts, vPerInstance, N,
  );

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  if (normals) merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(paletteUVs, 2));
  
  if (indices) merged.setIndex(new THREE.BufferAttribute(indices, 1));
  if (!normals) merged.computeVertexNormals();

  const baseMat = (Array.isArray(im.material) ? im.material[0] : im.material) as THREE.Material;
  const exportMat = toExportSafeMaterial(baseMat, paletteTexture);

  if (AR_EXPORT_DEBUG) {
    const c0 = instanceColors.length >= 3 ? [instanceColors[0], instanceColors[1], instanceColors[2]] : ['n/a'];
    console.info('[AR export] baked instanced mesh', {
      name: im.name || '(unnamed)',
      instances: N,
      totalVerts,
      hasInstanceColor,
      sampleColor0: c0,
      materialType: baseMat.type,
      exportMaterialType: exportMat.type,
      hasPaletteTexture: true,
      paletteSize: (paletteTexture.image as HTMLCanvasElement).width,
    });
  }

  const mesh = new THREE.Mesh(merged, exportMat);
  mesh.name = (im.name || 'instanced') + '_baked';
  mesh.position.copy(im.position);
  mesh.quaternion.copy(im.quaternion);
  mesh.scale.copy(im.scale);
  mesh.visible = im.visible;
  return mesh;
}

/**
 * True when the InstancedMesh carries a `radiusBT` attribute — the live Bonds.tsx
 * convention where the geometry is a UNIT cylinder and the real lateral radius (and
 * any bottom→top taper) lives in the attribute, applied by the runtime shader, NOT
 * by the instance matrix or the geometry. Such meshes MUST be vertex-baked so the
 * radius is materialized into positions; the shared-geometry path would export the
 * unit (radius-1) cylinder regardless of radiusBT.
 *
 * The actual export bonds (ExportManager) pre-size the cylinder geometry
 * (`CylinderGeometry(bondRadius, bondRadius, …)`) and carry NO radiusBT, so they
 * still take the cheap shared path — only live-style meshes fall back to the bake.
 */
function hasRadiusBT(im: THREE.InstancedMesh): boolean {
  return im.geometry.getAttribute('radiusBT') != null;
}

/**
 * Expand an InstancedMesh into many cheap THREE.Mesh objects that all SHARE the
 * SAME base geometry instance (`im.geometry`, same `geometry.id`) and a SMALL set
 * of materials (one per unique instance color). Each mesh carries only its
 * composed local `matrix`.
 *
 * This is the size/speed win for USDZ: USDZExporter dedupes geometry by
 * `geometry.id` and materials by `material.uuid`, so the unit sphere is written
 * ONCE and every atom becomes a tiny Xform that references it (≈GLB size), rather
 * than the old bake which merged all N spheres into one unique mega-geometry that
 * dedup could never help.
 *
 * Transform parity with `bakeInstancedMesh`: USDZExporter's `buildHierarchy` is
 * recursive and writes each prim's LOCAL `object.matrix`, composing the parent
 * chain. The returned Group is identity and is added under `im.parent`, so each
 * child mesh's local `matrix` must be `im.matrix * instanceMatrix_i` (im's OWN
 * local transform, NOT `im.matrixWorld`) — then the exporter re-applies the
 * `im.parent` chain exactly once, matching the bake path's
 * `im.parent.world * im.localTRS * instanceMatrix`. Using `matrixWorld` here would
 * double-count `im.parent.world` whenever an ancestor carries a transform.
 */
function instanceToSharedMeshes(im: THREE.InstancedMesh): THREE.Group {
  const group = new THREE.Group();
  group.name = (im.name || 'instanced') + '_shared';
  // Identity group placed under im.parent; the exporter composes the parent chain,
  // so children carry only `im.matrix * instanceMatrix` as their local transform.
  group.matrixAutoUpdate = false;
  group.visible = im.visible;

  // Share the source geometry directly — DO NOT clone/bake. Matching geometry.id
  // across all meshes is precisely what makes the exporter emit one USD geometry.
  const sharedGeo = im.geometry;

  const baseMat = (Array.isArray(im.material) ? im.material[0] : im.material) as THREE.Material;
  const hasInstanceColor = (im as any).instanceColor != null;

  // One material per unique packed-RGB color (elements → usually < ~10).
  const matByColor = new Map<number, THREE.MeshStandardMaterial>();

  // im's OWN local transform (matches bakeInstancedMesh, which copies im.position/
  // quaternion/scale). NOT matrixWorld — the exporter re-applies im.parent's chain.
  const localBase = im.matrix;
  const N = im.count;

  for (let i = 0; i < N; i++) {
    if (hasInstanceColor) im.getColorAt(i, _instCol);
    else _instCol.setRGB(1, 1, 1);

    const colorKey =
      (Math.round(_instCol.r * 255) << 16) |
      (Math.round(_instCol.g * 255) << 8) |
      Math.round(_instCol.b * 255);

    let material = matByColor.get(colorKey);
    if (!material) {
      material = toExportSafeMaterialForColor(baseMat, _instCol);
      matByColor.set(colorKey, material);
    }

    const mesh = new THREE.Mesh(sharedGeo, material);
    mesh.matrixAutoUpdate = false;
    im.getMatrixAt(i, _instMat4);
    mesh.matrix.multiplyMatrices(localBase, _instMat4); // im-local transform of instance i
    mesh.matrixWorldNeedsUpdate = true;
    group.add(mesh);
  }

  if (AR_EXPORT_DEBUG) {
    console.info('[AR export] shared-geometry instanced mesh', {
      name: im.name || '(unnamed)',
      instances: N,
      sharedGeometryId: sharedGeo.id,
      uniqueColors: matByColor.size,
      hasInstanceColor,
      materialType: baseMat.type,
    });
  }

  return group;
}

export type InstancedSwap = {
  parent: THREE.Object3D;
  original: THREE.InstancedMesh;
  replacement: THREE.Object3D;
};

export function expandInstancedMeshes(root: THREE.Object3D): InstancedSwap[] {
  // Ensure every InstancedMesh's local `matrix` (and TRS) is current before we
  // read it to compose the replacement meshes' local transforms.
  root.updateMatrixWorld(true);

  const targets: THREE.InstancedMesh[] = [];
  root.traverse(obj => {
    if ((obj as any).isInstancedMesh && obj.parent && (obj as THREE.InstancedMesh).count > 0) {
      targets.push(obj as THREE.InstancedMesh);
    }
  });

  const swaps: InstancedSwap[] = [];
  for (const im of targets) {
    if (!im.parent) continue;

    // Spheres (dominant cost) and pre-sized bonds use the cheap shared-geometry
    // path. Only live-style meshes carrying a radiusBT attribute (unit cylinder +
    // shader-applied radius) fall back to the per-instance vertex bake, which
    // materializes that radius into positions (correctness over size).
    const replacement: THREE.Object3D = hasRadiusBT(im)
      ? bakeInstancedMesh(im)
      : instanceToSharedMeshes(im);

    swaps.push({ parent: im.parent, original: im, replacement });
    im.parent.add(replacement);
    im.parent.remove(im);
  }

  // Refresh world matrices so each replacement mesh's matrixWorld matches its
  // baked local matrix (the shared-mesh Group is identity, the baked Mesh uses
  // the InstancedMesh's own TRS).
  root.updateMatrixWorld(true);
  return swaps;
}

function disposeExportMaterial(mat: THREE.Material | THREE.Material[]) {
  const list = Array.isArray(mat) ? mat : [mat];
  for (const m of list) {
    const std = m as THREE.MeshStandardMaterial;
    if (std.map) std.map.dispose();
    std.dispose();
  }
}

export function restoreInstancedMeshes(swaps: InstancedSwap[]) {
  for (const swap of swaps) {
    swap.parent.add(swap.original);
    swap.parent.remove(swap.replacement);

    const replacement = swap.replacement;
    const sharedGeoId = swap.original.geometry.id;

    if ((replacement as THREE.Group).isGroup) {
      // Shared-geometry path: each child Mesh references im.geometry (do NOT
      // dispose it — the original InstancedMesh still uses it). Dispose only the
      // per-color export materials, deduped so each is freed once.
      const seenMats = new Set<THREE.Material>();
      (replacement as THREE.Group).children.forEach(child => {
        const mesh = child as THREE.Mesh;
        const m = mesh.material;
        (Array.isArray(m) ? m : [m]).forEach(mat => {
          if (!seenMats.has(mat)) {
            seenMats.add(mat);
            disposeExportMaterial(mat);
          }
        });
      });
    } else {
      // Per-instance bake path: replacement owns a unique merged geometry +
      // material. Dispose both (but never the shared source geometry).
      const mesh = replacement as THREE.Mesh;
      if (mesh.geometry && mesh.geometry.id !== sharedGeoId) {
        mesh.geometry.dispose();
      }
      disposeExportMaterial(mesh.material);
    }
  }
}

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

export function USDZExportHelper({ trigger, onComplete }: { trigger: boolean, onComplete: () => void }) {
  const { scene } = useThree();

  useEffect(() => {
    if (!trigger) return;

    let cancelled = false;
    const runExport = async () => {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      if (cancelled) return;

      const oldBackground = scene.background;
      scene.background = null;
      const swaps = expandInstancedMeshes(scene);

      try {
        const exporter = new USDZExporter();
        const arrayBuffer = await exporter.parseAsync(scene) as unknown as ArrayBuffer;

        if (AR_EXPORT_DEBUG) {
          console.info('[AR export] USDZ generated', {
            sizeBytes: arrayBuffer.byteLength,
            sizeMB: (arrayBuffer.byteLength / 1024 / 1024).toFixed(2),
          });
          const devBlob = new Blob([arrayBuffer], { type: 'model/vnd.usdz+zip' });
          const devUrl = URL.createObjectURL(devBlob);
          const devA = document.createElement('a');
          devA.href = devUrl;
          devA.download = 'atlas-molecule.usdz';
          devA.click();
          setTimeout(() => URL.revokeObjectURL(devUrl), 5000);
        }

        const blob = new Blob([arrayBuffer], { type: 'model/vnd.usdz+zip' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.rel = 'ar';
        a.style.position = 'absolute';
        a.style.opacity = '0';
        a.style.pointerEvents = 'none';

        const img = document.createElement('img');
        img.alt = 'AR';
        a.appendChild(img);
        document.body.appendChild(a);

        a.click();

        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 1000);

        await new Promise<void>(resolve => setTimeout(resolve, 350));
      } catch (e) {
        console.error("USDZ Export failed", e);
        alert("Failed to export AR model for Quick Look.");
      } finally {
        restoreInstancedMeshes(swaps);
        scene.background = oldBackground;
        onComplete();
      }
    };
    runExport();
    return () => { cancelled = true; };
  }, [trigger, scene, onComplete]);

  return null;
}
