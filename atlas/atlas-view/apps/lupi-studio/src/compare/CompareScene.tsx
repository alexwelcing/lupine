// The R3F scene contents for one pane: an InstancedMesh of atoms whose positions
// and colors are recomputed every frame from the shared clock, plus an additive
// "heat" halo that only lights up for strained (hot) atoms. Reused unchanged in
// every pane — the variant's decay schedule is the only thing that differs.

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Colormap } from "./colormaps";
import type { Lattice, Variant } from "./trajectory";
import { applyOrbit, timeNorm } from "./theaterState";

export function CameraRig() {
  const { camera } = useThree();
  useFrame(() => applyOrbit(camera));
  return null;
}

interface AtomFieldProps {
  lattice: Lattice;
  pos0: Float32Array;
  variant: Variant;
  colormap: Colormap;
}

export function AtomField({ lattice, pos0, variant, colormap }: AtomFieldProps) {
  const coreRef = useRef<THREE.InstancedMesh>(null);
  const haloRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const col = useMemo(() => new THREE.Color(), []);
  const { eq, radii, count, residualScale } = lattice;

  useFrame(() => {
    const core = coreRef.current;
    if (!core) return;
    const halo = haloRef.current;
    const factor = variant.decay(timeNorm()); // 1 -> floor
    const invScale = 1 / (residualScale || 1);

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const ex = eq[ix];
      const ey = eq[ix + 1];
      const ez = eq[ix + 2];
      const dx = pos0[ix] - ex;
      const dy = pos0[ix + 1] - ey;
      const dz = pos0[ix + 2] - ez;
      // current position = equilibrium + remaining displacement
      dummy.position.set(ex + dx * factor, ey + dy * factor, ez + dz * factor);
      const r = radii[i];
      dummy.scale.setScalar(r);
      dummy.updateMatrix();
      core.setMatrixAt(i, dummy.matrix);

      // residual magnitude, normalized [0,1] -> color
      const resid = Math.sqrt(dx * dx + dy * dy + dz * dz) * factor * invScale;
      const t = resid < 0 ? 0 : resid > 1 ? 1 : resid;
      const [cr, cg, cb] = colormap(t);
      col.setRGB(cr, cg, cb);
      core.setColorAt(i, col);

      if (halo) {
        dummy.scale.setScalar(r * (1.35 + 1.5 * t));
        dummy.updateMatrix();
        halo.setMatrixAt(i, dummy.matrix);
        // additive: scale brightness by heat so relaxed atoms add ~nothing
        col.setRGB(cr * t * t, cg * t * t, cb * t * t);
        halo.setColorAt(i, col);
      }
    }

    core.instanceMatrix.needsUpdate = true;
    if (core.instanceColor) core.instanceColor.needsUpdate = true;
    if (halo) {
      halo.instanceMatrix.needsUpdate = true;
      if (halo.instanceColor) halo.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh ref={haloRef} args={[undefined, undefined, count]} frustumCulled={false}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh ref={coreRef} args={[undefined, undefined, count]} frustumCulled={false} castShadow>
        <sphereGeometry args={[1, 24, 24]} />
        <meshStandardMaterial metalness={0.18} roughness={0.36} envMapIntensity={0.8} />
      </instancedMesh>
    </group>
  );
}
