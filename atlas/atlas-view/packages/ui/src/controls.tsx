/**
 * Tactile, dependency-free UI controls.
 *
 * Drop-in replacements for the former `rive/` Animated* components — same
 * prop signatures and visual language (cyan active states, hover feedback),
 * but without the Rive runtime. Styled via the global tactile design system
 * so every button feels like a physical surface rather than a flat web link.
 */
import { useEffect, useState, type ReactNode, type InputHTMLAttributes, type ChangeEvent } from 'react';
import { usePressSpring } from './hooks/usePressSpring';

// ─── Slider ────────────────────────────────────────────────────────────
interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function Slider({ value, min, max, step = 1, onChange, style, ...props }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ position: 'relative', width: '100%', height: 24, display: 'flex', alignItems: 'center' }}>
      <style>{`
        .plain-ui-slider {
          -webkit-appearance: none; appearance: none;
          width: 100%; height: 4px;
          background: linear-gradient(90deg, #1edce0 ${pct}%, #1e293b ${pct}%);
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }
        .plain-ui-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 14px; height: 14px;
          background: #0f172a;
          border: 2px solid #1edce0;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 0 2px rgba(30,220,224,0.15), 0 2px 6px rgba(0,0,0,0.4);
          transition: transform 100ms var(--ease-spring), box-shadow 100ms var(--ease-out);
        }
        .plain-ui-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 0 0 4px rgba(30,220,224,0.12), 0 3px 10px rgba(30,220,224,0.25);
        }
        .plain-ui-slider::-webkit-slider-thumb:active {
          transform: scale(0.95);
        }
        .plain-ui-slider::-moz-range-thumb {
          width: 14px; height: 14px;
          background: #0f172a;
          border: 2px solid #1edce0;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 0 2px rgba(30,220,224,0.15), 0 2px 6px rgba(0,0,0,0.4);
        }
        .plain-ui-slider::-moz-range-track {
          width: 100%; height: 4px;
          background: #1e293b;
          border-radius: 2px;
        }
      `}</style>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        className="plain-ui-slider"
        style={{
          width: '100%',
          appearance: 'none',
          outline: 'none',
          position: 'relative',
          zIndex: 1,
          margin: 0,
          ...style,
        }}
        {...props}
      />
    </div>
  );
}

// ─── ToolButton ────────────────────────────────────────────────────────
interface ToolButtonProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

function useCompactControls() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return compact;
}

export function ToolButton({ icon, label, active, onClick }: ToolButtonProps) {
  const compact = useCompactControls();
  const press = usePressSpring();
  return (
    <button
      ref={press.ref}
      onClick={onClick}
      onPointerDown={press.onPointerDown}
      onPointerUp={press.onPointerUp}
      onPointerLeave={press.onPointerLeave}
      onPointerCancel={press.onPointerCancel}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`lupine-btn ${active ? 'active' : ''}`}
      style={{
        flexDirection: compact ? 'column' : 'row',
        gap: compact ? 5 : 10,
        width: '100%',
        minHeight: compact ? 58 : 48,
        minWidth: 0,
        padding: compact ? '8px 4px' : '0 16px',
        fontSize: compact ? 11 : 14,
        letterSpacing: 0,
        lineHeight: 1.1,
        flexShrink: 1,
        touchAction: 'manipulation',
      }}
    >
      <span style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: '#1edce0',
        opacity: active ? 1 : 0.85,
        filter: active ? 'drop-shadow(0 0 5px rgba(30,220,224,0.45))' : 'none',
      }}>
        {icon}
      </span>
      <span style={{
        minWidth: 0,
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: compact ? 'clip' : 'ellipsis',
        whiteSpace: compact ? 'normal' : 'nowrap',
        textAlign: 'center',
        overflowWrap: 'anywhere',
      }}>{label}</span>
    </button>
  );
}

// ─── CameraPresetButton ────────────────────────────────────────────────
interface CameraPresetButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  title: string;
}

export function CameraPresetButton({ label, active, onClick, title }: CameraPresetButtonProps) {
  const press = usePressSpring();
  return (
    <button
      ref={press.ref}
      onClick={onClick}
      onPointerDown={press.onPointerDown}
      onPointerUp={press.onPointerUp}
      onPointerLeave={press.onPointerLeave}
      onPointerCancel={press.onPointerCancel}
      title={title}
      aria-pressed={active}
      className={`lupine-btn compact icon-only ${active ? 'active' : ''}`}
      style={{
        width: 42,
        height: 34,
        fontSize: 11,
        fontWeight: 820,
        letterSpacing: 0,
        fontFamily: 'var(--font-mono)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {label}
    </button>
  );
}

// ─── TransportButton ───────────────────────────────────────────────────
interface TransportButtonProps {
  onClick: () => void;
  title: string;
  icon: ReactNode;
  active?: boolean;
  width?: number;
}

export function TransportButton({ onClick, title, icon, active = false, width = 34 }: TransportButtonProps) {
  const press = usePressSpring({ pressedScale: 0.9 });
  return (
    <button
      ref={press.ref}
      onClick={onClick}
      onPointerDown={press.onPointerDown}
      onPointerUp={press.onPointerUp}
      onPointerLeave={press.onPointerLeave}
      onPointerCancel={press.onPointerCancel}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`lupine-icon-btn ${active ? 'active' : ''}`}
      style={{
        width,
        height: 34,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
    </button>
  );
}
