/**
 * <AtomInfoHUD /> — Inline data card for selected atoms.
 *
 * Closes the click → information loop. Selecting an atom currently surfaces
 * a halo + camera dolly but no data; this component pins a small frosted
 * card next to each selected atom showing element, index, position, and
 * any per-atom property values (energy, force, screening, ...).
 *
 * For 2+ selections, the card on the second-and-later atoms also shows
 * the distance to the first selected atom — a free measurement readout
 * without leaving the picker workflow.
 *
 * Caps at 4 cards on screen at once (most users single-select; large
 * multi-selects via add-mode would clutter the viewport).
 */

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Frame } from '@atlas/core/types';
import { getElementSpec } from '@atlas/core';

const MAX_CARDS = 4;

interface AtomInfoHUDProps {
  frame: Frame;
  selectedAtoms: number[];
  /** Currently-active scalar property (energy/force/etc) — shown in the card
   *  if the frame carries it. The full property set is also enumerated. */
  activeProperty?: string;
  /** Click-handler so a user can dismiss a single card without un-selecting. */
  onDismissCard?: (atomIndex: number) => void;
  /** When set, shows a "Pin" button on the second-and-later cards that
   *  freezes the current measurement (distance/angle/dihedral) into the
   *  store. Without it the measurement only exists while the selection
   *  remains; pinning makes it permanent for figure capture. */
  onPinMeasurement?: (atomIndices: number[]) => void;
}

export function AtomInfoHUD({
  frame,
  selectedAtoms,
  activeProperty: _activeProperty,
  onDismissCard,
  onPinMeasurement,
}: AtomInfoHUDProps) {
  // Snapshot the first selection's position for distance readouts.
  const referencePos = useMemo(() => {
    if (selectedAtoms.length < 2) return null;
    const idx = selectedAtoms[0];
    if (idx < 0 || idx >= frame.natoms) return null;
    return new THREE.Vector3(
      frame.positions[idx * 3],
      frame.positions[idx * 3 + 1],
      frame.positions[idx * 3 + 2],
    );
  }, [selectedAtoms, frame.positions, frame.natoms]);

  const cards = selectedAtoms.slice(0, MAX_CARDS);
  if (cards.length === 0) return null;

  return (
    <group>
      {cards.map((atomIndex, i) => {
        if (atomIndex < 0 || atomIndex >= frame.natoms) return null;
        const x = frame.positions[atomIndex * 3];
        const y = frame.positions[atomIndex * 3 + 1];
        const z = frame.positions[atomIndex * 3 + 2];
        const t = frame.types[atomIndex];
        const spec = getElementSpec(t);

        // Per-atom property readout: collect every Float32Array in
        // frame.properties and read the value at this atom's index.
        const props: Array<{ name: string; value: number }> = [];
        if (frame.properties) {
          frame.properties.forEach((arr, name) => {
            if (arr.length > atomIndex) {
              props.push({ name, value: arr[atomIndex] });
            }
          });
        }
        // Limit to top 4 properties so the card stays readable.
        const propsToShow = props.slice(0, 4);

        // Pair distance to the first selected atom (skip on the first card).
        let distanceToRef: number | null = null;
        if (i > 0 && referencePos) {
          const dx = x - referencePos.x;
          const dy = y - referencePos.y;
          const dz = z - referencePos.z;
          distanceToRef = Math.sqrt(dx * dx + dy * dy + dz * dz);
        }

        return (
          <Html
            key={atomIndex}
            position={[x, y + spec.displayRadius * 1.2 + 0.4, z]}
            center
            distanceFactor={11}
            style={{ pointerEvents: 'auto' }}
          >
            <div
              style={{
                background: 'rgba(8, 14, 24, 0.86)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(126, 200, 255, 0.28)',
                borderRadius: 8,
                padding: '8px 10px 9px 10px',
                color: 'rgba(220, 235, 255, 0.95)',
                fontSize: 11,
                fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace',
                lineHeight: 1.45,
                whiteSpace: 'nowrap',
                userSelect: 'none',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(126, 200, 255, 0.08) inset',
                minWidth: 140,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: spec.color, letterSpacing: '0.02em' }}>
                  {spec.symbol}
                </span>
                <span style={{ color: 'rgba(180, 200, 220, 0.6)', fontSize: 10 }}>{spec.name}</span>
                {onDismissCard && (
                  <button
                    onClick={() => onDismissCard(atomIndex)}
                    style={{
                      background: 'transparent', border: 'none', color: 'rgba(160, 180, 200, 0.5)',
                      cursor: 'pointer', fontSize: 12, padding: 0, marginLeft: 4, lineHeight: 1,
                    }}
                    title="Deselect"
                  >×</button>
                )}
              </div>
              <div style={{ color: 'rgba(160, 200, 240, 0.7)', fontSize: 10, marginBottom: 5 }}>
                #{atomIndex} · {spec.role}
              </div>
              <div style={{ color: 'rgba(180, 200, 220, 0.85)', fontSize: 10 }}>
                ({x.toFixed(2)}, {y.toFixed(2)}, {z.toFixed(2)}) Å
              </div>
              {propsToShow.length > 0 && (
                <div style={{
                  marginTop: 6, paddingTop: 5,
                  borderTop: '1px solid rgba(126, 200, 255, 0.15)',
                  display: 'flex', flexDirection: 'column', gap: 1,
                }}>
                  {propsToShow.map(p => (
                    <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ color: 'rgba(160, 180, 200, 0.7)' }}>{p.name}</span>
                      <span style={{ color: 'rgba(220, 235, 255, 0.95)' }}>{formatPropertyValue(p.value)}</span>
                    </div>
                  ))}
                </div>
              )}
              {distanceToRef != null && (
                <div style={{
                  marginTop: 5, paddingTop: 5,
                  borderTop: '1px solid rgba(126, 200, 255, 0.15)',
                  color: 'rgba(180, 220, 255, 0.85)', fontSize: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                }}>
                  <span>→ #{selectedAtoms[0]}: <strong>{distanceToRef.toFixed(3)} Å</strong></span>
                  {onPinMeasurement && i === selectedAtoms.length - 1 && (
                    <button
                      onClick={() => onPinMeasurement(selectedAtoms.slice())}
                      style={{
                        background: 'rgba(126, 200, 255, 0.14)',
                        border: '1px solid rgba(126, 200, 255, 0.4)',
                        borderRadius: 4,
                        color: 'rgba(206, 232, 255, 0.95)',
                        padding: '2px 8px',
                        fontSize: 10,
                        fontFamily: 'ui-monospace, monospace',
                        cursor: 'pointer',
                      }}
                      title={`Pin this ${selectedAtoms.length === 2 ? 'distance' : selectedAtoms.length === 3 ? 'angle' : 'dihedral'}`}
                    >
                      📌 pin
                    </button>
                  )}
                </div>
              )}
            </div>
          </Html>
        );
      })}
      {selectedAtoms.length > MAX_CARDS && (
        <Html position={[0, 0, 0]} prepend>
          {/* Off-screen anchor so the overflow notice has a stable spot.
              In practice we render it at world origin; users with large
              multi-selects will scroll around and this serves as a
              "you have N more selected" reminder if it shows in frame. */}
          <div style={{
            background: 'rgba(8, 14, 24, 0.9)',
            color: 'rgba(220, 235, 255, 0.85)',
            fontSize: 10,
            padding: '4px 8px',
            border: '1px solid rgba(126, 200, 255, 0.28)',
            borderRadius: 4,
            fontFamily: 'ui-monospace, monospace',
          }}>
            +{selectedAtoms.length - MAX_CARDS} more selected
          </div>
        </Html>
      )}
    </group>
  );
}

/** Format scalar property values compactly. Small magnitudes get scientific
 *  notation, mid-range gets fixed-point, very small gets pinned to zero. */
function formatPropertyValue(v: number): string {
  if (!isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs === 0) return '0';
  if (abs < 1e-3 || abs >= 1e5) return v.toExponential(2);
  if (abs < 1) return v.toFixed(4);
  return v.toFixed(3);
}
