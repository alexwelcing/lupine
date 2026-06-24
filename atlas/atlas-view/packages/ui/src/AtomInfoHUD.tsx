/**
 * <AtomInfoHUD /> - small anchored data card for clicked atoms.
 */

import { Html } from '@react-three/drei';
import type { Frame } from '@atlas/core/types';
import { getElementSpec } from '@atlas/core';
import { useStore, type KnowledgeLabel } from './store';

const MAX_PROPERTY_ROWS = 4;
const MAX_KNOWLEDGE_ROWS = 3;

interface AtomInfoHUDProps {
  frame: Frame;
  selectedAtoms: number[];
  activeProperty?: string;
  onDismissCard?: (atomIndex: number) => void;
}

export function AtomInfoHUD({
  frame,
  selectedAtoms,
  activeProperty,
  onDismissCard,
}: AtomInfoHUDProps) {
  const atomIndex = selectedAtoms[0];
  if (atomIndex == null || atomIndex < 0 || atomIndex >= frame.natoms) return null;

  const knowledgeLabels = useStore(s => s.knowledgeLabels);
  const x = frame.positions[atomIndex * 3];
  const y = frame.positions[atomIndex * 3 + 1];
  const z = frame.positions[atomIndex * 3 + 2];
  const type = frame.types[atomIndex];
  const id = frame.ids[atomIndex] ?? atomIndex;
  const spec = getElementSpec(type);
  const properties = getPropertyRows(frame, atomIndex, activeProperty);
  const knowledge = getKnowledgeRows(knowledgeLabels, frame, atomIndex);

  return (
    <Html
      position={[x, y + spec.displayRadius * 1.75 + 0.45, z]}
      center
      distanceFactor={11}
      style={{ pointerEvents: 'auto' }}
    >
      <div
        data-testid="atom-info-card"
        data-atom-index={atomIndex}
        style={{
          width: 192,
          color: 'rgba(231, 244, 255, 0.96)',
          background: 'linear-gradient(180deg, rgba(11, 18, 30, 0.92), rgba(4, 9, 17, 0.88))',
          border: '1px solid rgba(122, 211, 255, 0.34)',
          borderRadius: 8,
          boxShadow: '0 12px 34px rgba(0, 0, 0, 0.42), 0 0 0 1px rgba(255,255,255,0.05) inset',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          padding: '9px 10px 10px',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          fontSize: 11,
          lineHeight: 1.35,
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 32,
              height: 32,
              flex: '0 0 auto',
              borderRadius: 8,
              color: '#06111c',
              background: spec.color,
              fontWeight: 800,
              fontSize: 15,
              boxShadow: `0 0 18px ${spec.color}66`,
            }}
          >
            {spec.symbol}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontWeight: 750, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {spec.name}
              </div>
              {onDismissCard && (
                <button
                  type="button"
                  aria-label="Dismiss atom details"
                  onClick={() => onDismissCard(atomIndex)}
                  style={{
                    width: 20,
                    height: 20,
                    border: '1px solid rgba(174, 214, 255, 0.18)',
                    borderRadius: 6,
                    color: 'rgba(217, 234, 255, 0.68)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    cursor: 'pointer',
                    lineHeight: '16px',
                    padding: 0,
                  }}
                >
                  x
                </button>
              )}
            </div>
            <div style={{ color: 'rgba(165, 192, 219, 0.72)', fontSize: 10 }}>
              atom #{atomIndex} / id {id} / type {type}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 8,
            paddingTop: 7,
            borderTop: '1px solid rgba(122, 211, 255, 0.16)',
            display: 'grid',
            gap: 3,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            color: 'rgba(205, 225, 244, 0.9)',
          }}
        >
          <DetailRow label="role" value={spec.role} />
          <DetailRow label="xyz" value={`${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)} A`} />
          {properties.map(({ name, value }) => (
            <DetailRow key={name} label={name} value={formatPropertyValue(value)} strong={name === activeProperty} />
          ))}
          {knowledge.length > 0 && (
            <>
              <div style={{ height: 1, background: 'rgba(122, 211, 255, 0.12)', margin: '5px 0 3px' }} />
              {knowledge.map((row) => (
                <DetailRow key={row.label} label={row.label} value={row.value} strong />
              ))}
            </>
          )}
        </div>
      </div>
    </Html>
  );
}

function DetailRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
      <span style={{ color: strong ? '#7dd3fc' : 'rgba(148, 178, 207, 0.72)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </span>
      <span style={{ color: strong ? '#eef9ff' : 'rgba(225, 238, 252, 0.92)', textAlign: 'right', whiteSpace: 'nowrap' }}>
        {value}
      </span>
    </div>
  );
}

function getPropertyRows(frame: Frame, atomIndex: number, activeProperty?: string) {
  const rows: Array<{ name: string; value: number }> = [];
  const add = (name: string) => {
    const values = frame.properties.get(name);
    if (!values || values.length <= atomIndex) return;
    if (rows.some(row => row.name === name)) return;
    rows.push({ name, value: values[atomIndex] });
  };

  if (activeProperty) add(activeProperty);
  frame.properties.forEach((_values, name) => add(name));
  return rows.slice(0, MAX_PROPERTY_ROWS);
}

function getKnowledgeRows(labels: KnowledgeLabel[], frame: Frame, atomIndex: number): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  const sphereId = frame.properties.get('sphere_id')?.[atomIndex];
  const kind = frame.properties.get('kind')?.[atomIndex];
  const radius = frame.properties.get('radius')?.[atomIndex];

  if (typeof sphereId === 'number' || typeof sphereId === 'string') {
    const sphereLabel = labels.find(
      (l) =>
        l.kind === 'sphere' &&
        (l.sphereIndex === Number(sphereId) || l.sphereId === String(sphereId)),
    );
    if (sphereLabel) {
      rows.push({ label: 'sphere', value: sphereLabel.text });
    }
  }

  const nodeLabel = labels.find((l) => l.kind === 'node' && l.atomIndex === atomIndex);
  if (nodeLabel) {
    rows.push({ label: nodeLabel.nodeKind ?? 'node', value: nodeLabel.text });
  } else if (typeof kind === 'number' || typeof kind === 'string') {
    // Fall back to the raw kind column if we don't have a named node label.
    rows.push({ label: 'kind', value: String(kind) });
  }

  if (typeof radius === 'number') {
    rows.push({ label: 'radius', value: radius.toFixed(3) });
  }

  return rows.slice(0, MAX_KNOWLEDGE_ROWS);
}

function formatPropertyValue(value: number): string {
  if (!Number.isFinite(value)) return 'n/a';
  const abs = Math.abs(value);
  if (abs === 0) return '0';
  if (abs < 0.001 || abs >= 100000) return value.toExponential(2);
  if (abs < 1) return value.toFixed(4);
  return value.toFixed(3);
}
