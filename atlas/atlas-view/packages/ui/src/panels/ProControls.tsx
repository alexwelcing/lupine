import React, { useRef, useState, useEffect } from 'react';

// ─── ScrubbableNumber ──────────────────────────────────────────────────
export interface ScrubbableNumberProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  fractionDigits?: number;
}

export function ScrubbableNumber({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  label,
  fractionDigits = 1,
}: ScrubbableNumberProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const startVal = useRef(value);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startX.current;
      
      // Modifiers
      let multiplier = 1;
      if (e.shiftKey) multiplier = 10;
      if (e.altKey) multiplier = 0.1;

      const sensitivity = 0.5; // pixels per step unit
      const delta = (dx / sensitivity) * step * multiplier;
      
      let newVal = startVal.current + delta;
      newVal = Math.max(min, Math.min(max, newVal));
      
      // Optional snapping to step (unless using alt)
      if (!e.altKey && step >= 1) {
        newVal = Math.round(newVal / step) * step;
      }

      onChange(newVal);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, min, max, step, onChange]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: isDragging ? '#1a1a24' : '#121318',
      border: `1px solid ${isDragging ? '#1edce0' : '#2a2b36'}`,
      padding: '4px 8px',
      cursor: 'ew-resize',
      userSelect: 'none',
      transition: 'all 0.1s',
      boxShadow: isDragging ? '0 0 8px rgba(30, 220, 224, 0.2)' : 'none',
    }}
    onMouseDown={(e) => {
      setIsDragging(true);
      startX.current = e.clientX;
      startVal.current = value;
    }}
    >
      {label && <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 500 }}>{label}</span>}
      <span style={{ 
        fontFamily: 'monospace', 
        fontSize: 13, 
        color: isDragging ? '#fff' : '#1edce0',
        fontWeight: isDragging ? 700 : 500,
      }}>
        {value.toFixed(fractionDigits)}
      </span>
    </div>
  );
}

// ─── TrackballPanner ──────────────────────────────────────────────────
export interface TrackballPannerProps {
  azimuth: number; // degrees
  elevation: number; // degrees
  onChange: (azimuth: number, elevation: number) => void;
  size?: number;
}

export function TrackballPanner({ azimuth, elevation, onChange, size = 120 }: TrackballPannerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const rectRef = useRef<DOMRect | null>(null);

  // Convert angles to x/y in the circle (simplified 2D projection)
  // Azimuth: -180 to 180 (x axis)
  // Elevation: -90 to 90 (y axis)
  const normalizedX = (azimuth + 180) / 360; // 0 to 1
  const normalizedY = (elevation + 90) / 180; // 0 to 1
  
  // To make it feel like a trackball, we'll map the circle bounds.
  // Actually a simple mapping for now: x maps to azimuth linearly, y to elevation linearly.
  // Center is Az=0, El=0.
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 10;

  // We map Az=-180..180 to -radius..radius
  const posX = cx + (azimuth / 180) * radius;
  // We map El=-90..90 to radius..-radius (invert Y)
  const posY = cy - (elevation / 90) * radius;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    rectRef.current = e.currentTarget.getBoundingClientRect();
    updateFromPointer(e.clientX, e.clientY);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !rectRef.current) return;
    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const updateFromPointer = (clientX: number, clientY: number) => {
    const rect = rectRef.current!;
    const x = clientX - rect.left - cx;
    const y = clientY - rect.top - cy;

    // Constrain to circle
    const dist = Math.sqrt(x*x + y*y);
    let clampedX = x;
    let clampedY = y;
    if (dist > radius) {
      clampedX = (x / dist) * radius;
      clampedY = (y / dist) * radius;
    }

    // Unmap
    let newAz = (clampedX / radius) * 180;
    let newEl = -(clampedY / radius) * 90;

    onChange(newAz, newEl);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div 
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'radial-gradient(circle at center, #1a1b26 0%, #0a0a0c 100%)',
          border: `1px solid ${isDragging ? '#1edce0' : '#2a2b36'}`,
          position: 'relative',
          cursor: 'crosshair',
          boxShadow: isDragging ? '0 0 16px rgba(30,220,224,0.15), inset 0 0 16px rgba(30,220,224,0.1)' : 'inset 0 0 8px rgba(0,0,0,0.5)',
          touchAction: 'none'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Crosshairs */}
        <div style={{ position: 'absolute', top: cy, left: 0, right: 0, height: 1, background: '#1f2937' }} />
        <div style={{ position: 'absolute', left: cx, top: 0, bottom: 0, width: 1, background: '#1f2937' }} />

        {/* Reticle */}
        <div style={{
          position: 'absolute',
          left: posX,
          top: posY,
          width: 8,
          height: 8,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: '#1edce0',
          boxShadow: '0 0 8px #1edce0',
          pointerEvents: 'none'
        }} />
      </div>
      
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>Azimuth</span>
          <span style={{ fontFamily: 'monospace', color: '#e2e8f0', fontSize: 13 }}>{azimuth.toFixed(1)}°</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>Elevation</span>
          <span style={{ fontFamily: 'monospace', color: '#e2e8f0', fontSize: 13 }}>{elevation.toFixed(1)}°</span>
        </div>
      </div>
    </div>
  );
}

// ─── RotaryKnob ────────────────────────────────────────────────────────
export interface RotaryKnobProps {
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
  size?: number;
  fractionDigits?: number;
}

export function RotaryKnob({ value, onChange, min, max, step = 0.01, label, size = 60, fractionDigits = 2 }: RotaryKnobProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startVal = useRef(value);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const dy = startY.current - e.clientY;
      const range = max - min;
      const sensitivity = 100; // pixels for full range
      let newVal = startVal.current + (dy / sensitivity) * range;
      newVal = Math.max(min, Math.min(max, newVal));
      if (!e.altKey) newVal = Math.round(newVal / step) * step;
      onChange(newVal);
    };
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, min, max, step, onChange]);

  const percent = (value - min) / (max - min);
  const angle = -135 + percent * 270; // -135 to 135 degrees

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: size, height: size, borderRadius: '50%',
          background: isDragging ? 'radial-gradient(circle at center, #1f2937 0%, #0f172a 100%)' : 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)',
          border: `1px solid ${isDragging ? '#1edce0' : '#334155'}`,
          position: 'relative', cursor: 'ns-resize',
          boxShadow: isDragging ? '0 0 12px rgba(30,220,224,0.3)' : 'inset 0 2px 4px rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.5)',
          touchAction: 'none'
        }}
        onMouseDown={(e) => {
          setIsDragging(true);
          startY.current = e.clientY;
          startVal.current = value;
        }}
      >
        {/* Indicator */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 4, height: size / 2 - 4,
          background: 'transparent',
          transformOrigin: '50% 0%',
          transform: `translate(-50%, 0%) rotate(${angle + 180}deg)`
        }}>
          <div style={{ width: 4, height: 8, background: isDragging ? '#1edce0' : '#94a3b8', borderRadius: 2, boxShadow: isDragging ? '0 0 8px #1edce0' : 'none' }} />
        </div>
        {/* Center cap */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', width: size * 0.5, height: size * 0.5,
          transform: 'translate(-50%, -50%)', borderRadius: '50%',
          background: 'linear-gradient(135deg, #334155, #0f172a)',
          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.1)'
        }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ fontFamily: 'monospace', color: isDragging ? '#1edce0' : '#e2e8f0', fontSize: 12, fontWeight: 600 }}>{value.toFixed(fractionDigits)}</span>
      </div>
    </div>
  );
}

// ─── ProColorSwatch ─────────────────────────────────────────────────────
export function ProColorSwatch({ color, onChange }: { color: string, onChange: (c: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const clickOut = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', clickOut);
    return () => window.removeEventListener('mousedown', clickOut);
  }, [isOpen]);

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 24, height: 24, borderRadius: 12, background: color,
          border: '2px solid #334155', cursor: 'pointer',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
          transition: 'all 0.1s'
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#1edce0'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
      />
      {isOpen && (
        <div ref={popoverRef} style={{
          position: 'absolute', top: 32, right: 0, zIndex: 100,
          background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.8)'
        }}>
          {/* Quick hex input as fallback for true color wheel */}
          <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Color</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input 
              type="color" 
              value={color} 
              onChange={e => onChange(e.target.value)} 
              style={{ width: 32, height: 32, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
            />
            <input
              type="text"
              value={color}
              onChange={e => onChange(e.target.value)}
              style={{ background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace', width: 70 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
