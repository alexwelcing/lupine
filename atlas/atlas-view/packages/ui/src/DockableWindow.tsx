/**
 * DockableWindow — a draggable / resizable floating tool window.
 *
 * Replaces the fixed side-drawer for the Studio (Visuals) surface so the
 * advanced light rig + material lab live in a movable, collapsible pro
 * palette instead of a scrolling drawer. Zero dependencies: pointer events
 * only, no portals, no rAF — drag/resize state is local and cheap.
 *
 * - Drag by the title bar.
 * - Resize from the bottom-right grip.
 * - Collapse to a compact chip (re-expands in place).
 * - Close calls onClose.
 *
 * Bounds are clamped to the viewport so the window can't be lost off-screen.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface DockableWindowProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  initial?: { x?: number; y?: number; w?: number; h?: number };
  minW?: number;
  minH?: number;
}

const ACCENT = '#1edce0';

export function DockableWindow({
  title,
  onClose,
  children,
  initial,
  minW = 320,
  minH = 240,
}: DockableWindowProps) {
  const [pos, setPos] = useState(() => ({
    x: initial?.x ?? Math.max(16, window.innerWidth - (initial?.w ?? 380) - 24),
    y: initial?.y ?? 72,
  }));
  const [size, setSize] = useState(() => ({
    w: initial?.w ?? 380,
    h: initial?.h ?? Math.min(window.innerHeight - 120, 720),
  }));
  const [collapsed, setCollapsed] = useState(false);

  // Drag/resize use a ref-tracked gesture so React state updates stay cheap
  // (one setState per pointermove, no layout thrash).
  const gesture = useRef<
    | { kind: 'drag'; px: number; py: number; ox: number; oy: number }
    | { kind: 'resize'; px: number; py: number; ow: number; oh: number }
    | null
  >(null);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'drag') {
      const nx = g.ox + (e.clientX - g.px);
      const ny = g.oy + (e.clientY - g.py);
      setPos({
        x: Math.min(Math.max(0, nx), window.innerWidth - 80),
        y: Math.min(Math.max(0, ny), window.innerHeight - 40),
      });
    } else {
      setSize({
        w: Math.max(minW, g.ow + (e.clientX - g.px)),
        h: Math.max(minH, g.oh + (e.clientY - g.py)),
      });
    }
  }, [minW, minH]);

  const endGesture = useCallback(() => {
    gesture.current = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', endGesture);
  }, [onPointerMove]);

  useEffect(() => endGesture, [endGesture]);

  const startDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).dataset.noDrag) return;
    gesture.current = { kind: 'drag', px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endGesture);
  };

  const startResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    gesture.current = { kind: 'resize', px: e.clientX, py: e.clientY, ow: size.w, oh: size.h };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endGesture);
  };

  // ─── Collapsed chip ───
  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          position: 'absolute', left: pos.x, top: pos.y, zIndex: 200,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', background: '#0d1117',
          border: `1px solid ${ACCENT}`, borderRadius: 6,
          color: ACCENT, fontSize: 12, fontWeight: 700,
          fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.12em',
          textTransform: 'uppercase', cursor: 'pointer',
          boxShadow: `0 0 16px ${ACCENT}30`,
        }}
        title="Expand Studio"
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT }} />
        {title}
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'absolute', left: pos.x, top: pos.y,
        width: size.w, height: size.h, zIndex: 200,
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-surface, #0a0a0c)',
        border: '1px solid #1f2937',
        borderRadius: 8, overflow: 'hidden',
        boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
      }}
    >
      {/* Title bar — drag handle */}
      <div
        onPointerDown={startDrag}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 10px 8px 14px', background: '#121318',
          borderBottom: '1px solid #1f2937', cursor: 'grab', flexShrink: 0,
          userSelect: 'none', touchAction: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 4, height: 14, background: ACCENT }} />
          <span style={{
            fontSize: 12, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif',
            textTransform: 'uppercase', letterSpacing: '0.15em', color: '#e2e8f0',
          }}>{title}</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <WinBtn label="–" title="Collapse" onClick={() => setCollapsed(true)} />
          <WinBtn label="✕" title="Close" onClick={onClose} />
        </div>
      </div>

      {/* Content */}
      <div className="lupine-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {children}
      </div>

      {/* Resize grip */}
      <div
        onPointerDown={startResize}
        style={{
          position: 'absolute', right: 0, bottom: 0, width: 18, height: 18,
          cursor: 'nwse-resize', touchAction: 'none',
          background: `linear-gradient(135deg, transparent 50%, ${ACCENT}55 50%, ${ACCENT}99 100%)`,
        }}
        title="Resize"
      />
    </div>
  );
}

function WinBtn({ label, title, onClick }: { label: string; title: string; onClick: () => void }) {
  return (
    <button
      data-no-drag="1"
      onClick={onClick}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 22, height: 22, background: 'transparent',
        border: '1px solid #334155', borderRadius: 4, color: '#94a3b8',
        cursor: 'pointer', fontSize: 12, lineHeight: 1,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = ACCENT; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#334155'; }}
    >
      {label}
    </button>
  );
}
