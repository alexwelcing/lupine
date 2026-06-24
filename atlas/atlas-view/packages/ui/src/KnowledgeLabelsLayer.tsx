/**
 * <KnowledgeLabelsLayer /> — Auto-generated semantic labels for gallery assets.
 *
 * Unlike user annotations, these labels are tied to a fixed 3D position
 * supplied by the loaded asset's metadata (e.g. sphere centroids and key
 * node positions from the Lupine Wiki sphere-grid export). They are always
 * billboarded toward the camera and use a small callout style that stays
 * readable against the molecular scene.
 */

import { Html, Text, Billboard } from '@react-three/drei';
import type { KnowledgeLabel } from './store';

export type KnowledgeLabelStyle = 'card' | 'glyph';

interface KnowledgeLabelsLayerProps {
  labels: KnowledgeLabel[];
  visibleKinds: Set<string>;
  style?: KnowledgeLabelStyle;
  /** Global toggle; labels are also filtered per-kind by visibleKinds. */
  visible?: boolean;
}

export function KnowledgeLabelsLayer({
  labels,
  visibleKinds,
  style = 'card',
  visible = true,
}: KnowledgeLabelsLayerProps) {
  if (!visible || labels.length === 0) return null;

  return (
    <group>
      {labels.map((label) => {
        if (!visibleKinds.has(label.kind)) return null;
        const pos = label.position;
        if (style === 'glyph') {
          return <GlyphLabel key={label.id} pos={pos} text={label.text} kind={label.kind} />;
        }
        return <CardLabel key={label.id} pos={pos} text={label.text} detail={label.detail} kind={label.kind} />;
      })}
    </group>
  );
}

function CardLabel({
  pos,
  text,
  detail,
  kind,
}: {
  pos: [number, number, number];
  text: string;
  detail?: string;
  kind: string;
}) {
  const tint = kind === 'sphere' ? '#8bd3ff' : kind === 'node' ? '#a0ffc8' : '#d8b4fe';
  return (
    <group position={pos}>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 1.6, 4]} />
        <meshBasicMaterial color={tint} transparent opacity={0.5} />
      </mesh>
      <Html
        position={[0, 1.7, 0]}
        center
        distanceFactor={10}
        occlude={false}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'rgba(10, 18, 32, 0.82)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: `1px solid ${tint}55`,
            borderRadius: 8,
            padding: '5px 9px',
            color: 'rgba(240, 248, 255, 0.96)',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.45)',
            userSelect: 'none',
          }}
        >
          <div>{text}</div>
          {detail && (
            <div style={{ fontSize: 10, fontWeight: 400, color: 'rgba(180, 205, 235, 0.8)', marginTop: 1 }}>
              {detail}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

function GlyphLabel({
  pos,
  text,
  kind,
}: {
  pos: [number, number, number];
  text: string;
  kind: string;
}) {
  const tint = kind === 'sphere' ? '#8bd3ff' : kind === 'node' ? '#a0ffc8' : '#d8b4fe';
  return (
    <Billboard position={[pos[0], pos[1] + 1.4, pos[2]]} follow>
      <Text
        fontSize={0.48}
        color={tint}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#0a1220"
        outlineOpacity={0.92}
      >
        {text}
      </Text>
    </Billboard>
  );
}
