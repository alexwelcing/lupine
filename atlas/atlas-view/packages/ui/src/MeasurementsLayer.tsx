/**
 * <MeasurementsLayer /> — Live measurement geometry between selected atoms.
 *
 * Reads selectedAtoms; renders different geometry depending on count:
 *   - 2 atoms: dashed line + midpoint Html with the distance in Å.
 *   - 3 atoms: A→B and B→C lines + a short arc at B + Html with the
 *     internal angle (degrees).
 *   - 4 atoms: as 3 atoms, plus a faint connector C→D and the dihedral
 *     angle (degrees) measured around the B–C axis.
 *
 * Updates every frame to track playback. No store mutation — purely
 * derived from the current selection. The user already gets a numeric
 * distance in AtomInfoHUD; this is the visual companion drawn directly
 * in the scene so it persists across camera moves and exports cleanly.
 */

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Frame } from '@atlas/core/types';

interface MeasurementsLayerProps {
  frame: Frame;
  selectedAtoms: number[];
}

export function MeasurementsLayer({ frame, selectedAtoms }: MeasurementsLayerProps) {
  // Resolve atom positions, dropping any selections that fell off
  // (different file loaded with fewer atoms, etc.).
  const positions = useMemo(() => {
    const out: THREE.Vector3[] = [];
    for (const idx of selectedAtoms) {
      if (idx < 0 || idx >= frame.natoms) continue;
      out.push(new THREE.Vector3(
        frame.positions[idx * 3],
        frame.positions[idx * 3 + 1],
        frame.positions[idx * 3 + 2],
      ));
    }
    return out;
  }, [frame.natoms, frame.positions, selectedAtoms]);

  if (positions.length < 2) return null;

  return (
    <group>
      {/* Distance segment (and the trunk for angle/dihedral). Always present
          when ≥2 atoms are selected. */}
      <DistanceLine a={positions[0]} b={positions[1]} />
      {positions.length >= 3 && (
        <>
          <DistanceLine a={positions[1]} b={positions[2]} secondary />
          <AngleArc a={positions[0]} b={positions[1]} c={positions[2]} />
        </>
      )}
      {positions.length >= 4 && (
        <>
          <DistanceLine a={positions[2]} b={positions[3]} secondary />
          <DihedralReadout
            a={positions[0]}
            b={positions[1]}
            c={positions[2]}
            d={positions[3]}
          />
        </>
      )}
    </group>
  );
}

// ─── Distance segment ────────────────────────────────────────────────
// Dashed line between two atom centers + midpoint label with the bond
// length in Ångströms. Dashed material distinguishes it from real bonds.
function DistanceLine({
  a,
  b,
  secondary = false,
}: {
  a: THREE.Vector3;
  b: THREE.Vector3;
  secondary?: boolean;
}) {
  const { geometry, midpoint, distance } = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    geo.computeBoundingSphere();
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const dist = a.distanceTo(b);
    return { geometry: geo, midpoint: mid, distance: dist };
  }, [a, b]);

  // LineDashedMaterial requires `geometry.computeLineDistances()` after
  // assignment; we lean on a ref + effect for that.
  const ref = (line: THREE.Line | null) => {
    if (line) line.computeLineDistances();
  };

  return (
    <group>
      <line ref={ref as any}>
        <primitive object={geometry} attach="geometry" />
        <lineDashedMaterial
          attach="material"
          color={secondary ? '#a8d4ff' : '#7ecfff'}
          dashSize={0.18}
          gapSize={0.12}
          transparent
          opacity={0.85}
          depthWrite={false}
          toneMapped={false}
        />
      </line>
      {!secondary && (
        <Html position={midpoint.toArray() as [number, number, number]} center distanceFactor={11}>
          <div style={measurementBadgeStyle}>
            {distance.toFixed(3)} Å
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Angle arc ───────────────────────────────────────────────────────
// Renders a small arc at vertex `b` spanning the angle ∠ABC, plus an Html
// label with the angle in degrees. Arc is a thin tube along the parametric
// curve so it reads cleanly in 3D regardless of camera angle.
function AngleArc({
  a,
  b,
  c,
}: {
  a: THREE.Vector3;
  b: THREE.Vector3;
  c: THREE.Vector3;
}) {
  const { points, label, labelPos } = useMemo(() => {
    const ba = new THREE.Vector3().subVectors(a, b).normalize();
    const bc = new THREE.Vector3().subVectors(c, b).normalize();
    const dot = THREE.MathUtils.clamp(ba.dot(bc), -1, 1);
    const angleRad = Math.acos(dot);
    const angleDeg = angleRad * (180 / Math.PI);

    // Arc radius scaled to the smaller leg so the arc never overshoots
    // an atom. 0.25× makes it sit visibly inside the ∠ABC corner.
    const r = Math.min(b.distanceTo(a), b.distanceTo(c)) * 0.25;

    // Build the arc by lerping between ba and bc on the unit sphere via
    // slerp on the rotation axis defined by their cross product.
    const axis = new THREE.Vector3().crossVectors(ba, bc);
    if (axis.lengthSq() < 1e-6) {
      // Degenerate (collinear) — no arc, no label.
      return { points: [] as THREE.Vector3[], label: '', labelPos: b };
    }
    axis.normalize();
    const SEGMENTS = 24;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      const q = new THREE.Quaternion().setFromAxisAngle(axis, angleRad * t);
      const dir = ba.clone().applyQuaternion(q).multiplyScalar(r);
      pts.push(new THREE.Vector3().addVectors(b, dir));
    }
    // Label placed on the arc's midpoint, slightly offset outward.
    const mid = pts[Math.floor(pts.length / 2)];
    const outward = new THREE.Vector3().subVectors(mid, b).normalize().multiplyScalar(0.25);
    const lp = new THREE.Vector3().addVectors(mid, outward);
    return { points: pts, label: angleDeg.toFixed(1) + '°', labelPos: lp };
  }, [a, b, c]);

  if (points.length === 0) return null;
  const geo = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <group>
      <line>
        <primitive object={geo} attach="geometry" />
        <lineBasicMaterial attach="material" color="#ffd86b" transparent opacity={0.9} depthWrite={false} toneMapped={false} />
      </line>
      <Html position={labelPos.toArray() as [number, number, number]} center distanceFactor={11}>
        <div style={{ ...measurementBadgeStyle, color: '#ffe9a8', borderColor: 'rgba(255, 216, 107, 0.35)' }}>
          {label}
        </div>
      </Html>
    </group>
  );
}

// ─── Dihedral readout ────────────────────────────────────────────────
// Text-only readout of the dihedral angle measured around the B–C axis,
// plus a small Html label placed at the geometric center of all four
// atoms. The dihedral itself is a value, not a geometry — we don't try
// to draw a 3D dihedral indicator (those read poorly without orientation
// context). The angle is the actionable scientific output.
function DihedralReadout({
  a,
  b,
  c,
  d,
}: {
  a: THREE.Vector3;
  b: THREE.Vector3;
  c: THREE.Vector3;
  d: THREE.Vector3;
}) {
  const { angleDeg, labelPos } = useMemo(() => {
    // Standard dihedral via cross products. Sign indicates handedness.
    const b1 = new THREE.Vector3().subVectors(b, a);
    const b2 = new THREE.Vector3().subVectors(c, b);
    const b3 = new THREE.Vector3().subVectors(d, c);
    const n1 = new THREE.Vector3().crossVectors(b1, b2);
    const n2 = new THREE.Vector3().crossVectors(b2, b3);
    const m1 = new THREE.Vector3().crossVectors(n1, b2.clone().normalize());
    const x = n1.dot(n2);
    const y = m1.dot(n2);
    const rad = Math.atan2(y, x);
    const deg = rad * (180 / Math.PI);
    const center = new THREE.Vector3().add(a).add(b).add(c).add(d).multiplyScalar(0.25);
    return { angleDeg: deg, labelPos: center };
  }, [a, b, c, d]);

  return (
    <Html position={labelPos.toArray() as [number, number, number]} center distanceFactor={11}>
      <div style={{ ...measurementBadgeStyle, color: '#d8b8ff', borderColor: 'rgba(180, 140, 240, 0.35)' }}>
        ϕ {angleDeg.toFixed(1)}°
      </div>
    </Html>
  );
}

// ─── Shared label style ──────────────────────────────────────────────
const measurementBadgeStyle: React.CSSProperties = {
  background: 'rgba(8, 14, 24, 0.85)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(126, 200, 255, 0.32)',
  borderRadius: 4,
  padding: '3px 7px',
  color: 'rgba(220, 235, 255, 0.95)',
  fontSize: 10.5,
  fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
  letterSpacing: '0.02em',
  userSelect: 'none',
};
