/**
 * <KnowledgeLabelsLayer /> — Auto-generated semantic labels for gallery assets.
 *
 * Unlike user annotations, these labels are tied to a fixed 3D position
 * supplied by the loaded asset's metadata (e.g. sphere centroids and key
 * node positions from the Lupine Wiki sphere-grid export). They are always
 * billboarded toward the camera and use a small callout style that stays
 * readable against the molecular scene.
 */

import { useState } from 'react';
import { Html, Text, Billboard } from '@react-three/drei';
import { useStore, type KnowledgeLabel } from './store';

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
  const hoveredAtom = useStore((s) => s.hoveredAtom);
  const threshold = useStore((s) => s.knowledgeLabelThreshold);

  if (!visible || labels.length === 0) return null;

  const visibleLabels = labels.filter((label) => {
    if (!visibleKinds.has(label.kind)) return false;
    // Sphere labels always render; node labels respect the salience threshold.
    if (label.kind === 'sphere') return true;
    return (label.salience ?? 0) >= threshold;
  });

  const visibleIds = new Set(visibleLabels.map((l) => l.id));
  const hoveredLabel =
    hoveredAtom != null
      ? labels.find((l) => l.kind === 'node' && l.atomIndex === hoveredAtom && visibleKinds.has('node'))
      : undefined;
  const hoverLabelToRender =
    hoveredLabel && !visibleIds.has(hoveredLabel.id) ? hoveredLabel : undefined;

  return (
    <group>
      {visibleLabels.map((label) => {
        const pos = label.position;
        if (style === 'glyph') {
          return <GlyphLabel key={label.id} pos={pos} text={label.text} kind={label.kind} />;
        }
        return <CardLabel key={label.id} pos={pos} text={label.text} detail={label.detail} kind={label.kind} />;
      })}
      {hoverLabelToRender && (
        <CardLabel
          key={`${hoverLabelToRender.id}-hover`}
          pos={hoverLabelToRender.position}
          text={hoverLabelToRender.text}
          detail={hoverLabelToRender.detail}
          kind={hoverLabelToRender.kind}
        />
      )}
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
  const [hover, setHover] = useState(false);
  const tint = kind === 'sphere' ? '#8bd3ff' : kind === 'node' ? '#a0ffc8' : '#d8b4fe';
  const title = detail ? `${text}\n${detail}` : text;
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
        style={{ pointerEvents: 'auto' }}
      >
        <div
          title={title}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            maxWidth: hover ? 360 : 220,
            background: hover ? 'rgba(10, 18, 32, 0.94)' : 'rgba(10, 18, 32, 0.86)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: `1px solid ${tint}${hover ? '88' : '55'}`,
            borderRadius: 8,
            padding: '5px 9px',
            color: 'rgba(240, 248, 255, 0.96)',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.01em',
            whiteSpace: hover ? 'normal' : 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.45)',
            userSelect: 'none',
            transition: 'max-width 0.15s ease, background 0.15s ease',
            cursor: 'default',
          }}
        >
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</div>
          {detail && (
            <div
              title={detail}
              style={{
                fontSize: 10,
                fontWeight: 400,
                color: 'rgba(180, 205, 235, 0.8)',
                marginTop: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
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
