/**
 * DockableWindow - draggable / resizable / snap-to-edge floating tool window.
 *
 * Turns the fixed side-drawer into a pro, tactile palette:
 *  - drag the title bar
 *  - resize from the bottom-right grip
 *  - collapse to a compact chip
 *  - snap to screen edges and corners when released nearby
 *  - bounds clamping keeps the window always reachable
 *
 * Zero dependencies: pointer events only, no portals, no rAF.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { usePressSpring } from './hooks/usePressSpring';

interface DockableWindowProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  initial?: { x?: number; y?: number; w?: number; h?: number };
  minW?: number;
  minH?: number;
  snapDistance?: number;
}

const SNAP_DISTANCE = 24;

export function DockableWindow({
  title,
  subtitle,
  onClose,
  children,
  initial,
  minW = 320,
  minH = 240,
  snapDistance = SNAP_DISTANCE,
}: DockableWindowProps) {
  const initialY = initial?.y ?? 88;
  const initialH = initial?.h ?? Math.min(window.innerHeight - 140, 720);
  const maxInitialH = Math.max(minH, window.innerHeight - initialY - 72);

  const [pos, setPos] = useState(() => ({
    x: initial?.x ?? Math.max(16, window.innerWidth - (initial?.w ?? 380) - 24),
    y: initialY,
  }));
  const [size, setSize] = useState(() => ({
    w: Math.max(minW, initial?.w ?? 380),
    h: Math.max(minH, Math.min(initialH, maxInitialH)),
  }));
  const sizeRef = useRef(size);
  const [collapsed, setCollapsed] = useState(false);

  const gesture = useRef<
    | { kind: 'drag'; px: number; py: number; ox: number; oy: number }
    | { kind: 'resize'; px: number; py: number; ow: number; oh: number }
    | null
  >(null);

  const clampPos = useCallback((x: number, y: number, w: number, h: number) => ({
    x: Math.min(Math.max(0, x), Math.max(0, window.innerWidth - w)),
    y: Math.min(Math.max(0, y), Math.max(0, window.innerHeight - 40)),
  }), []);

  const clampSize = useCallback((w: number, h: number) => ({
    w: Math.max(minW, Math.min(w, window.innerWidth - 32)),
    h: Math.max(minH, Math.min(h, window.innerHeight - 80)),
  }), [minW, minH]);

  const snapPos = useCallback((x: number, y: number, w: number, h: number) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let nx = x;
    let ny = y;

    // Edge snap
    if (Math.abs(nx) < snapDistance) nx = 16;
    else if (Math.abs(nx + w - vw) < snapDistance) nx = vw - w - 16;

    if (Math.abs(ny) < snapDistance) ny = 88;
    else if (Math.abs(ny + h - vh) < snapDistance) ny = vh - h - 24;

    // Corner snap (only if near both edges)
    const nearLeft = Math.abs(x - 16) < snapDistance;
    const nearRight = Math.abs(x - (vw - w - 16)) < snapDistance;
    const nearTop = Math.abs(y - 88) < snapDistance;
    const nearBottom = Math.abs(y - (vh - h - 24)) < snapDistance;

    if (nearTop && nearLeft) { nx = 16; ny = 88; }
    else if (nearTop && nearRight) { nx = vw - w - 16; ny = 88; }
    else if (nearBottom && nearLeft) { nx = 16; ny = vh - h - 24; }
    else if (nearBottom && nearRight) { nx = vw - w - 16; ny = vh - h - 24; }

    return clampPos(nx, ny, w, h);
  }, [snapDistance, clampPos]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'drag') {
      const currentSize = sizeRef.current;
      const nx = g.ox + (e.clientX - g.px);
      const ny = g.oy + (e.clientY - g.py);
      setPos(clampPos(nx, ny, currentSize.w, currentSize.h));
    } else {
      const nextSize = clampSize(g.ow + (e.clientX - g.px), g.oh + (e.clientY - g.py));
      sizeRef.current = nextSize;
      setSize(nextSize);
      setPos(prev => clampPos(prev.x, prev.y, nextSize.w, nextSize.h));
    }
  }, [clampPos, clampSize]);

  const endGesture = useCallback(() => {
    const g = gesture.current;
    if (g?.kind === 'drag') {
      const currentSize = sizeRef.current;
      setPos(prev => snapPos(prev.x, prev.y, currentSize.w, currentSize.h));
    }
    gesture.current = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', endGesture);
  }, [onPointerMove, snapPos]);

  useEffect(() => () => endGesture(), [endGesture]);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  // Re-clamp on viewport resize so the window never drifts off-screen.
  useEffect(() => {
    const onResize = () => {
      setPos(prev => clampPos(prev.x, prev.y, size.w, size.h));
      setSize(prev => clampSize(prev.w, prev.h));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clampPos, clampSize, size.w, size.h]);

  const startDrag = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag="1"]')) return;
    gesture.current = { kind: 'drag', px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endGesture);
  };

  const startResize = (e: ReactPointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    gesture.current = { kind: 'resize', px: e.clientX, py: e.clientY, ow: size.w, oh: size.h };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endGesture);
  };

  // Collapsed chip
  if (collapsed) {
    return (
      <button
        type="button"
        aria-label={`Expand ${title} panel`}
        onClick={() => setCollapsed(false)}
        className="lupine-btn active"
        style={{
          position: 'absolute',
          left: pos.x,
          top: pos.y,
          zIndex: 200,
          gap: 8,
          padding: '8px 14px',
          fontSize: 12,
          letterSpacing: 0,
        }}
        title={`Expand ${title}`}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1edce0', boxShadow: '0 0 8px #1edce0' }} />
        {title}
      </button>
    );
  }

  return (
    <div
      className="lupine-glass"
      role="region"
      aria-label={`${title} tool panel`}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: 0,
        borderRadius: 12,
      }}
    >
      {/* Title bar - drag handle */}
      <div
        onPointerDown={startDrag}
        title={`Drag to move ${title}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '10px 12px 10px 14px',
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          cursor: 'grab',
          flexShrink: 0,
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ width: 4, height: 16, borderRadius: 2, background: 'linear-gradient(180deg, #1edce0, #0ea5e9)', boxShadow: '0 0 10px rgba(30,220,224,0.35)' }} />
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{
              fontSize: 12, fontWeight: 780,
              textTransform: 'uppercase', letterSpacing: 0, color: 'var(--text-primary)',
              lineHeight: 1.1,
            }}>{title}</span>
            {subtitle && (
              <span style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: 0 }}>
                {subtitle}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <WinBtn icon={<IconCollapse />} title="Collapse" onClick={() => setCollapsed(true)} />
          <WinBtn icon={<IconClose />} title="Close" onClick={onClose} />
        </div>
      </div>

      {/* Content */}
      <div className="lupine-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0, position: 'relative' }}>
        {children}
      </div>

      {/* Resize grip */}
      <div
        data-no-drag="1"
        aria-hidden="true"
        onPointerDown={startResize}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 20,
          height: 20,
          cursor: 'nwse-resize',
          touchAction: 'none',
          background: `linear-gradient(135deg, transparent 50%, rgba(30,220,224,0.35) 50%, rgba(30,220,224,0.75) 100%)`,
          borderTopLeftRadius: 8,
        }}
        title="Resize"
      />
    </div>
  );
}

function WinBtn({ icon, title, onClick }: { icon: ReactNode; title: string; onClick: () => void }) {
  const press = usePressSpring({ pressedScale: 0.88, sound: false });
  return (
    <button
      type="button"
      ref={press.ref}
      data-no-drag="1"
      onClick={onClick}
      onPointerDown={press.onPointerDown}
      onPointerUp={press.onPointerUp}
      onPointerLeave={press.onPointerLeave}
      onPointerCancel={press.onPointerCancel}
      aria-label={title}
      title={title}
      className="lupine-icon-btn"
      style={{ width: 26, height: 26 }}
    >
      {icon}
    </button>
  );
}

function IconClose() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function IconCollapse() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5 12h14" />
    </svg>
  );
}
