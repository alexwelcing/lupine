import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { expandInstancedMeshes, restoreInstancedMeshes } from './USDZExportPipeline';

// Build the same unit cylinder + radiusBT setup used by Bonds.tsx so we can
// verify the baker applies the per-instance radius taper that the runtime
// shader normally handles.
function makeBondLikeMesh(rB: number, rT: number, length: number) {
  const geo = new THREE.CylinderGeometry(1, 1, 1, 5, 1);
  const radiusBT = new Float32Array([rB, rT]);
  geo.setAttribute('radiusBT', new THREE.InstancedBufferAttribute(radiusBT, 2));

  const mat = new THREE.MeshStandardMaterial();
  const mesh = new THREE.InstancedMesh(geo, mat, 1);
  mesh.name = 'bonds';

  // Stretch along Y by `length`; leave lateral axes unscaled — the radius
  // attribute is what controls cylinder thickness in the live shader.
  const m = new THREE.Matrix4().makeScale(1, length, 1);
  mesh.setMatrixAt(0, m);
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

describe('USDZExportPipeline — radiusBT baking', () => {
  it('preserves per-instance colors through the baked palette texture', () => {
    const scene = new THREE.Scene();
    const geo = new THREE.SphereGeometry(1, 6, 4);
    const mat = new THREE.MeshStandardMaterial();
    const mesh = new THREE.InstancedMesh(geo, mat, 2);
    mesh.setMatrixAt(0, new THREE.Matrix4().makeTranslation(-1, 0, 0));
    mesh.setMatrixAt(1, new THREE.Matrix4().makeTranslation(1, 0, 0));
    mesh.setColorAt(0, new THREE.Color(1, 0, 0));
    mesh.setColorAt(1, new THREE.Color(0, 0, 1));
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);

    const swaps = expandInstancedMeshes(scene);
    expect(swaps).toHaveLength(1);

    const baked = swaps[0].replacement;
    const bakedMat = baked.material as THREE.MeshStandardMaterial;
    const uv = baked.geometry.getAttribute('uv') as THREE.BufferAttribute;

    expect(uv.count).toBeGreaterThan(0);
    expect(bakedMat.map).toBeTruthy();
    expect((bakedMat.map?.image as HTMLCanvasElement).width).toBe(2);

    restoreInstancedMeshes(swaps);
  });

  it('scales lateral vertex positions by the per-instance radius', () => {
    const scene = new THREE.Scene();
    const mesh = makeBondLikeMesh(0.12, 0.12, 5);
    scene.add(mesh);

    const swaps = expandInstancedMeshes(scene);
    expect(swaps).toHaveLength(1);

    const baked = swaps[0].replacement;
    const positions = baked.geometry.getAttribute('position').array as Float32Array;

    // Sample lateral extent: the unit cylinder has vertices at radius=1 in the
    // X/Z plane, so after baking with rB=rT=0.12 every vertex should land at
    // |xz| ≤ 0.12 (and very close to 0.12 for the side ring vertices).
    let maxLateral = 0;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];
      const r = Math.hypot(x, z);
      if (r > maxLateral) maxLateral = r;
    }
    expect(maxLateral).toBeGreaterThan(0.10);
    expect(maxLateral).toBeLessThan(0.13);

    restoreInstancedMeshes(swaps);
  });

  it('tapers between rB at y=-0.5 and rT at y=+0.5', () => {
    const scene = new THREE.Scene();
    const mesh = makeBondLikeMesh(0.05, 0.20, 1);
    scene.add(mesh);

    const swaps = expandInstancedMeshes(scene);
    const positions = swaps[0].replacement.geometry.getAttribute('position').array as Float32Array;

    // Find the largest lateral radius near each cap.
    let bottomMax = 0;
    let topMax = 0;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      const r = Math.hypot(x, z);
      // Instance matrix scaled Y by `length=1`, so y stays in [-0.5, 0.5].
      if (y < -0.45 && r > bottomMax) bottomMax = r;
      if (y >  0.45 && r > topMax)    topMax = r;
    }
    expect(bottomMax).toBeCloseTo(0.05, 2);
    expect(topMax).toBeCloseTo(0.20, 2);

    restoreInstancedMeshes(swaps);
  });

  it('leaves geometry without radiusBT untouched (atoms case)', () => {
    const scene = new THREE.Scene();
    const sphereGeo = new THREE.SphereGeometry(1.5, 8, 6);
    const mat = new THREE.MeshStandardMaterial();
    const mesh = new THREE.InstancedMesh(sphereGeo, mat, 1);
    mesh.setMatrixAt(0, new THREE.Matrix4().identity());
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);

    const swaps = expandInstancedMeshes(scene);
    const positions = swaps[0].replacement.geometry.getAttribute('position').array as Float32Array;

    // Without radiusBT we should see vertices at the original sphere radius.
    let maxR = 0;
    for (let i = 0; i < positions.length; i += 3) {
      const r = Math.hypot(positions[i], positions[i + 1], positions[i + 2]);
      if (r > maxR) maxR = r;
    }
    expect(maxR).toBeCloseTo(1.5, 2);

    restoreInstancedMeshes(swaps);
  });
});
