/**
 * MeasurementPanel — Atom measurement and selection interface
 * 
 * Displays selected atoms, calculates distances/angles/dihedrals,
 * and maintains a history of measurements.
 * 
 * Fully integrated with @lupine/ui "Atomic Understanding" component library.
 */

import { useMemo, useState, useCallback } from 'react';
import { useStore } from '../store';
import type { Frame } from '@atlas/core/types';
import {
  QuantumSection,
  AtomicGlass,
} from '@lupine/ui';

// ─── Icons ────────────────────────────────────────────────────────────
const IconClose = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
);

const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

// ─── Measurement Types ────────────────────────────────────────────────
type MeasurementType = 'distance' | 'angle' | 'dihedral';

interface Measurement {
  id: string;
  type: MeasurementType;
  atoms: number[]; // Atom indices (1-based for display)
  value: number;
  unit: string;
  frame: number; // Frame number when measured
  timestamp: number;
}

interface AtomInfo {
  index: number; // 0-based
  id: number;    // From frame.ids or index+1
  type: number;
  x: number;
  y: number;
  z: number;
  properties: Record<string, number>;
}

// ─── Math Functions ───────────────────────────────────────────────────
function calculateDistance(a: AtomInfo, b: AtomInfo): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function calculateAngle(a: AtomInfo, b: AtomInfo, c: AtomInfo): number {
  // b is the vertex
  const ba = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const bc = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  
  const dot = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z;
  const magBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y + ba.z * ba.z);
  const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y + bc.z * bc.z);
  
  if (magBA === 0 || magBC === 0) return 0;
  const cosAngle = dot / (magBA * magBC);
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
}

function calculateDihedral(a: AtomInfo, b: AtomInfo, c: AtomInfo, d: AtomInfo): number {
  const cross = (u: any, v: any) => ({
    x: u.y * v.z - u.z * v.y,
    y: u.z * v.x - u.x * v.z,
    z: u.x * v.y - u.y * v.x
  });
  const dot = (u: any, v: any) => u.x * v.x + u.y * v.y + u.z * v.z;
  
  const b1 = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };  // B→A
  const b2 = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };  // B→C [FIXED]
  const b3 = { x: d.x - c.x, y: d.y - c.y, z: d.z - c.z };  // C→D [FIXED]
  
  const normalize = (v: any) => {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    return len > 0 ? { x: v.x / len, y: v.y / len, z: v.z / len } : v;
  };
  
  const n1 = normalize(cross(b1, b2));
  const n2 = normalize(cross(b2, b3));
  const m1 = cross(n1, normalize(b2));
  
  const x = dot(n1, n2);
  const y = dot(m1, n2);
  
  return Math.atan2(y, x) * (180 / Math.PI);
}

// ─── Helper: Get atom info from frame ────────────────────────────────
function getAtomInfo(frame: Frame, index: number): AtomInfo {
  const id = frame.ids?.[index] ?? index + 1;
  const type = frame.types[index];
  const x = frame.positions[index * 3];
  const y = frame.positions[index * 3 + 1];
  const z = frame.positions[index * 3 + 2];
  
  const properties: Record<string, number> = {};
  frame.properties?.forEach((values, name) => {
    properties[name] = values[index];
  });
  
  return { index, id, type, x, y, z, properties };
}

// ─── Component ───────────────────────────────────────────────────────
export function MeasurementPanel() {
  const {
    file,
    frame: frameIndex,
    selectedAtoms,
    setSelectedAtoms,
  } = useStore();

  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const currentFrame = file?.trajectory.frames[frameIndex];
  const typeLabels: Record<number, string> = { 1: 'Cu', 2: 'O', 3: 'Zr' };

  // Get selected atom info
  const selectedAtomInfo = useMemo(() => {
    if (!currentFrame) return [];
    return selectedAtoms.map((idx: number) => getAtomInfo(currentFrame, idx));
  }, [currentFrame, selectedAtoms]);

  // Calculate live measurement
  const liveMeasurement = useMemo(() => {
    if (selectedAtomInfo.length < 2) return null;

    if (selectedAtomInfo.length === 2) {
      const [a, b] = selectedAtomInfo;
      return {
        type: 'distance' as const,
        value: calculateDistance(a, b),
        unit: 'Å',
        description: `d(${a.id}-${b.id})`,
      };
    }

    if (selectedAtomInfo.length === 3) {
      const [a, b, c] = selectedAtomInfo;
      return {
        type: 'angle' as const,
        value: calculateAngle(a, b, c),
        unit: '°',
        description: `∠(${a.id}-${b.id}-${c.id})`,
      };
    }

    if (selectedAtomInfo.length >= 4) {
      const [a, b, c, d] = selectedAtomInfo;
      return {
        type: 'dihedral' as const,
        value: calculateDihedral(a, b, c, d),
        unit: '°',
        description: `φ(${a.id}-${b.id}-${c.id}-${d.id})`,
      };
    }

    return null;
  }, [selectedAtomInfo]);

  // Save current measurement to history
  const saveMeasurement = useCallback(() => {
    if (!liveMeasurement || selectedAtoms.length < 2) return;

    const measurement: Measurement = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: liveMeasurement.type,
      atoms: [...selectedAtoms],
      value: liveMeasurement.value,
      unit: liveMeasurement.unit,
      frame: frameIndex,
      timestamp: Date.now(),
    };

    setMeasurements(prev => [measurement, ...prev]);
  }, [liveMeasurement, selectedAtoms, frameIndex]);

  // Remove measurement from history
  const removeMeasurement = useCallback((id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
  }, []);

  // Clear all measurements
  const clearHistory = useCallback(() => {
    setMeasurements([]);
  }, []);

  // Export measurements to CSV
  const exportCSV = useCallback(() => {
    if (!currentFrame || measurements.length === 0) return;

    const headers = ['Type', 'Atoms', 'Value', 'Unit', 'Frame', 'Timestamp'];
    const rows = measurements.map(m => [
      m.type,
      m.atoms.map(a => (currentFrame.ids?.[a] ?? a + 1)).join('-'),
      m.value.toFixed(4),
      m.unit,
      m.frame + 1,
      new Date(m.timestamp).toISOString(),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `measurements-${file?.name ?? 'data'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [measurements, currentFrame, file?.name]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedAtoms([]);
  }, [setSelectedAtoms]);

  if (!currentFrame) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        background: 'var(--slate-900)',
        borderLeft: '1px solid var(--glass-border)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid var(--glass-border)',
          background: 'var(--glass-bg-2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--lupine-300)' }}>Measure</span>
          </div>
        </div>
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--slate-500)', fontSize: 12 }}>Load a file to start measuring</div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--slate-900)',
      borderLeft: '1px solid var(--glass-border)',
      boxShadow: '-8px 0 32px rgba(0,0,0,0.3), -2px 0 8px rgba(0,0,0,0.15)',
    }}>
      {/* ─── Header ─── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px',
        borderBottom: '1px solid var(--glass-border)',
        background: 'var(--glass-bg-2)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 3, height: 14, borderRadius: 2,
            background: 'linear-gradient(180deg, var(--lupine-400), var(--violet-500))',
          }} />
          <span style={{
            fontSize: 11, fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--lupine-300)',
          }}>
            Measure
          </span>
        </div>
        <button
          onClick={() => useStore.getState().setActivePanel(null)}
          className="lupine-glass lupine-glass--1 lupine-glass--interactive"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28,
            background: 'transparent', border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-xs)',
            color: 'var(--slate-500)', cursor: 'pointer',
          }}
        >
          <IconClose />
        </button>
      </div>

      <div className="lupine-scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          
          {/* Instructions */}
          <AtomicGlass level={1} flush style={{ padding: '12px', borderStyle: 'dashed' }}>
             <div style={{
              fontSize: 11, color: 'var(--slate-400)', lineHeight: 1.5,
            }}>
              Click atoms to measure. <strong style={{ color: 'var(--slate-200)' }}>2 atoms</strong> = distance, <strong style={{ color: 'var(--slate-200)' }}>3</strong> = angle, <strong style={{ color: 'var(--slate-200)' }}>4</strong> = dihedral. Press <strong style={{ color: 'var(--slate-200)' }}>Esc</strong> to clear.
            </div>
          </AtomicGlass>

          {/* Live Measurement */}
          {liveMeasurement && (
            <AtomicGlass level={2} style={{ textAlign: 'center', padding: '20px 16px', borderColor: 'rgba(85, 101, 212, 0.4)' }}>
              <div style={{ fontSize: 10, color: 'var(--slate-400)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                {liveMeasurement.type}
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--lupine-300)', fontFamily: 'var(--font-mono)' }}>
                {liveMeasurement.value.toFixed(3)}
                <span style={{ fontSize: 16, marginLeft: 6, color: 'var(--slate-400)', fontWeight: 400 }}>{liveMeasurement.unit}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--slate-400)', fontFamily: 'var(--font-mono)', marginTop: 8 }}>
                {liveMeasurement.description}
              </div>
              <button
                onClick={saveMeasurement}
                style={{
                  marginTop: 16,
                  padding: '8px 20px',
                  background: 'rgba(85, 101, 212, 0.15)',
                  border: '1px solid rgba(85, 101, 212, 0.4)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--lupine-300)',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: 'inset 0 0 12px rgba(85, 101, 212, 0.1)',
                }}
              >
                Save Result
              </button>
            </AtomicGlass>
          )}

          {/* Selection Info */}
          <QuantumSection label={`Picked Atoms (${selectedAtoms.length}/4)`} defaultOpen={true}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {selectedAtomInfo.length === 0 ? (
                <div style={{ fontSize: 11, color: 'var(--slate-500)', fontStyle: 'italic', padding: '4px 0' }}>No atoms selected yet</div>
              ) : (
                selectedAtomInfo.map((atom: AtomInfo, i: number) => (
                  <AtomicGlass key={atom.index} level={1} flush style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px',
                  }}>
                    <span style={{
                      width: 20, height: 20,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--glass-bg-2)', border: '1px solid var(--lupine-500)', borderRadius: '50%',
                      color: 'var(--lupine-300)', fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)'
                    }}>{i + 1}</span>
                    <span style={{ color: 'var(--slate-100)', fontWeight: 600, fontSize: 12 }}>{typeLabels[atom.type] ?? `Type ${atom.type}`}</span>
                    <span style={{ color: 'var(--slate-500)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>#{atom.id}</span>
                  </AtomicGlass>
                ))
              )}
            </div>
            {selectedAtoms.length > 0 && (
              <button
                onClick={clearSelection}
                style={{
                  marginTop: 10,
                  fontSize: 10, padding: '4px 10px',
                  fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                  background: 'transparent', border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--slate-400)', cursor: 'pointer',
                }}
              >
                Clear Selection
              </button>
            )}
          </QuantumSection>

          {/* History */}
          <QuantumSection 
            label={`Saved Measurements (${measurements.length})`} 
            defaultOpen={true}
            action={
              measurements.length > 0 && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={exportCSV} className="lupine-glass--interactive" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, background: 'var(--glass-bg-1)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', color: 'var(--slate-400)', cursor: 'pointer' }} title="Download CSV">
                    <IconDownload />
                  </button>
                  <button onClick={clearHistory} className="lupine-glass--interactive" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, background: 'var(--glass-bg-1)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', color: 'var(--slate-400)', cursor: 'pointer' }} title="Clear all">
                    <IconTrash />
                  </button>
                </div>
              )
            }
          >
            {measurements.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--slate-500)', fontStyle: 'italic', padding: '4px 0' }}>No saved measurements</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {measurements.map((m) => (
                  <AtomicGlass key={m.id} level={1} flush style={{ padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--lupine-400)', letterSpacing: '0.04em', fontWeight: 600 }}>{m.type}</span>
                      <button
                        onClick={() => removeMeasurement(m.id)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--slate-500)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <IconClose />
                      </button>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--slate-100)', marginTop: 4 }}>
                      {m.value.toFixed(3)} <span style={{ fontSize: 12, color: 'var(--slate-500)', fontWeight: 400 }}>{m.unit}</span>
                    </div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--slate-500)', marginTop: 4 }}>
                      ATOMS {m.atoms.map(a => currentFrame?.ids?.[a] ?? a + 1).join('-')} · FRAME {m.frame + 1}
                    </div>
                  </AtomicGlass>
                ))}
              </div>
            )}
          </QuantumSection>
          
        </div>
      </div>
    </div>
  );
}
