/**
 * <SimulationCell /> — Wireframe box for periodic boundaries
 */

import { useMemo } from 'react';
import * as THREE from 'three';

interface SimulationCellProps {
  bounds: Float64Array; // [xlo, xhi, ylo, yhi, zlo, zhi]
  color?: string;
  opacity?: number;
}

export function SimulationCell({ bounds, color = '#1e2840', opacity = 0.4 }: SimulationCellProps) {
  const geometry = useMemo(() => {
    const [xlo, xhi, ylo, yhi, zlo, zhi] = bounds;
    const w = xhi - xlo, h = yhi - ylo, d = zhi - zlo;
    const cx = (xlo + xhi) / 2, cy = (ylo + yhi) / 2, cz = (zlo + zhi) / 2;
    const geo = new THREE.BoxGeometry(w, h, d);
    geo.translate(cx, cy, cz);
    return new THREE.EdgesGeometry(geo);
  }, [bounds]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  );
}
