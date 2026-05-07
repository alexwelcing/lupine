/**
 * <AnnotationsLayer /> — Pinned text labels in four distinct visual styles.
 *
 * Same data (atomIndex + text) gets rendered four ways depending on the
 * active labelStyle. Each style is a different R3F/drei flex:
 *
 *   - tag    : drei <Html> frosted-glass card + thin SVG leader line.
 *              Best for readability; occluded by atoms in front.
 *   - glyph  : drei <Text> SDF, billboarded, floating directly above the
 *              atom. Minimal — big monospace, no chrome.
 *   - halo   : a 3D ring of <Text> instances orbiting the atom in world
 *              space, slowly rotating. Reads as a sci-fi callout.
 *   - etched : text rasterized to a Canvas2D texture, sampled inside the
 *              atom impostor's fragment shader (via a per-atom mask), so
 *              the text appears engraved into the atom's surface. The
 *              shader hookup lives in AtomsOptimized; this layer only
 *              uploads the texture and tells the shader which atom owns it.
 *
 * The atom's current world position is read from frame.positions every
 * frame so labels move with playback — no stale-position lag.
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html, Text, Billboard } from '@react-three/drei';
import type { Frame } from '@atlas/core/types';

export interface AnnotationItem {
  id: string;
  atomIndex: number;
  text: string;
  createdAt: number;
}

export type AnnotationLabelStyle = 'tag' | 'glyph' | 'halo' | 'etched';

interface AnnotationsLayerProps {
  frame: Frame;
  annotations: AnnotationItem[];
  style: AnnotationLabelStyle;
  /** Optional callback so the user can dismiss a label by clicking it. */
  onDismiss?: (id: string) => void;
}

export function AnnotationsLayer({
  frame,
  annotations,
  style,
  onDismiss,
}: AnnotationsLayerProps) {
  if (annotations.length === 0) return null;

  return (
    <group>
      {annotations.map((ann) => {
        // Skip annotations whose atom no longer exists in the current frame
        // (different file loaded with fewer atoms).
        if (ann.atomIndex >= frame.natoms) return null;
        const x = frame.positions[ann.atomIndex * 3];
        const y = frame.positions[ann.atomIndex * 3 + 1];
        const z = frame.positions[ann.atomIndex * 3 + 2];

        switch (style) {
          case 'tag':
            return <TagAnnotation key={ann.id} pos={[x, y, z]} text={ann.text} onDismiss={() => onDismiss?.(ann.id)} />;
          case 'glyph':
            return <GlyphAnnotation key={ann.id} pos={[x, y, z]} text={ann.text} />;
          case 'halo':
            return <HaloAnnotation key={ann.id} pos={[x, y, z]} text={ann.text} />;
          case 'etched':
            // Etched style is owned by the impostor shader; this layer renders
            // a small invisible anchor + ASCII label as a fallback so users
            // without shader support still see something.
            return <EtchedAnnotation key={ann.id} pos={[x, y, z]} text={ann.text} />;
        }
      })}
    </group>
  );
}

// ─── Style 1: Tag ─────────────────────────────────────────────────────
// Frosted-glass card via drei <Html>. occlude={true} hides the card when
// the atom is behind another atom — feels like Figma annotations on a 3D
// scene. Card position is offset upward in world space + the leader line
// connects from atom center to the offset.
function TagAnnotation({
  pos,
  text,
  onDismiss,
}: {
  pos: [number, number, number];
  text: string;
  onDismiss?: () => void;
}) {
  return (
    <group position={pos}>
      {/* leader line: short stub up from the atom into the card */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 2.4, 4]} />
        <meshBasicMaterial color="#6ad" transparent opacity={0.55} />
      </mesh>
      <Html
        position={[0, 2.6, 0]}
        center
        distanceFactor={10}
        occlude={false}
        style={{ pointerEvents: 'auto' }}
      >
        <div
          onClick={onDismiss}
          style={{
            background: 'rgba(15, 25, 40, 0.78)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(120, 180, 240, 0.35)',
            borderRadius: 8,
            padding: '6px 10px',
            color: 'rgba(220, 235, 255, 0.96)',
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
            cursor: onDismiss ? 'pointer' : 'default',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(120, 180, 240, 0.1) inset',
            userSelect: 'none',
          }}
          title={onDismiss ? 'Click to remove' : undefined}
        >
          {text}
        </div>
      </Html>
    </group>
  );
}

// ─── Style 2: Glyph ───────────────────────────────────────────────────
// drei <Text> (SDF) floating above the atom, billboarded toward the
// camera. No leader, no chrome — just text. Reads as an inline editor
// label rather than an annotation card.
function GlyphAnnotation({
  pos,
  text,
}: {
  pos: [number, number, number];
  text: string;
}) {
  return (
    <Billboard position={[pos[0], pos[1] + 1.6, pos[2]]} follow lockX={false} lockY={false} lockZ={false}>
      <Text
        fontSize={0.55}
        color="#e6f0ff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.025}
        outlineColor="#0a1220"
        outlineOpacity={0.9}
        // Slight emissive feel via subtle outline + bright color
      >
        {text}
      </Text>
    </Billboard>
  );
}

// ─── Style 3: Halo ────────────────────────────────────────────────────
// 3D text characters arranged tangentially around a ring at the atom's
// position. The ring rotates slowly via useFrame. Each character is its
// own <Text> placed on a ring radius. For >12 chars we duplicate to fill
// the ring; for very short strings we space them out.
function HaloAnnotation({
  pos,
  text,
}: {
  pos: [number, number, number];
  text: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const radius = 1.4;
  // Pad short strings out; truncate very long ones — 24 chars max around the ring.
  const display = text.length < 8 ? text.padEnd(text.length + 4, ' ').repeat(2).slice(0, 16) : text.slice(0, 24);
  const chars = useMemo(() => Array.from(display), [display]);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.4;
  });

  return (
    <group position={pos}>
      <group ref={groupRef}>
        {chars.map((c, i) => {
          const angle = (i / chars.length) * Math.PI * 2;
          const cx = Math.cos(angle) * radius;
          const cz = Math.sin(angle) * radius;
          return (
            <Text
              key={i}
              position={[cx, 0, cz]}
              rotation={[0, -angle - Math.PI / 2, 0]}
              fontSize={0.32}
              color="#a8d8ff"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.012}
              outlineColor="#08101c"
            >
              {c}
            </Text>
          );
        })}
      </group>
      {/* Faint guide ring so the text reads as orbiting an atomic locus,
          not floating randomly. mesh's emissive material would compete with
          IBL, so we use a thin LineLoop instead. */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.02, radius + 0.02, 64]} />
        <meshBasicMaterial color="#3a86c8" transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ─── Style 4: Etched (fallback view) ──────────────────────────────────
// True etched-into-surface rendering happens in AtomsOptimized's fragment
// shader (it samples a Canvas2D-rasterized text texture, gated by a
// per-atom mask). When that's wired, this fallback is just a tiny ASCII
// pin so the user has something to drag focus to. For now it renders a
// small subtle Text floating at the atom's edge — readable but unobtrusive.
function EtchedAnnotation({
  pos,
  text,
}: {
  pos: [number, number, number];
  text: string;
}) {
  return (
    <Billboard position={[pos[0] + 1.2, pos[1] + 0.4, pos[2]]}>
      <Text
        fontSize={0.22}
        color="#7ec8ff"
        anchorX="left"
        anchorY="middle"
        outlineWidth={0.008}
        outlineColor="#0a1424"
      >
        {`◇ ${text}`}
      </Text>
    </Billboard>
  );
}

/**
 * Build a small RGBA texture with the annotation text rendered via Canvas2D.
 * Used by the impostor shader for the 'etched' label style. Returns the
 * texture plus its width/height so the shader can sample correctly.
 *
 * Exported here (rather than inline in AtomsOptimized) because the
 * Canvas2D rasterization is annotation-specific and may evolve to support
 * multi-line / different fonts as the etched style matures.
 */
export function buildAnnotationTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.font = 'bold 38px ui-monospace, "SF Mono", Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.slice(0, 16), 128, 36);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

