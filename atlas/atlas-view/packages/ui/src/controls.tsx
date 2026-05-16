/**
 * Plain, dependency-free UI controls.
 *
 * Drop-in replacements for the former `rive/` Animated* components — same
 * prop signatures and visual language (cyan active states, hover feedback),
 * but without the Rive runtime, keyframe-burst animations, ripple overlays,
 * or `clicked` transition state. The decorative GPU-unlock overlay and
 * micro-effects layer were removed entirely.
 */
import type { ReactNode, InputHTMLAttributes, ChangeEvent } from 'react';

// ─── Slider ────────────────────────────────────────────────────────────
interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function Slider({ value, min, max, step = 1, onChange, style, ...props }: SliderProps) {
  return (
    <div style={{ position: 'relative', width: '100%', height: 24, display: 'flex', alignItems: 'center' }}>
      <style>{`
        .plain-ui-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 8px; height: 16px; margin-top: -6px;
          background: #1edce0; border: none; border-radius: 0; cursor: pointer;
        }
        .plain-ui-slider::-moz-range-thumb {
          width: 8px; height: 16px;
          background: #1edce0; border: none; border-radius: 0; cursor: pointer;
        }
        .plain-ui-slider::-webkit-slider-runnable-track {
          width: 100%; height: 4px; cursor: pointer;
          background: #1e293b; border: 1px solid #334155; border-radius: 0;
        }
        .plain-ui-slider::-moz-range-track {
          width: 100%; height: 4px; cursor: pointer;
          background: #1e293b; border: 1px solid #334155; border-radius: 0;
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
          background: 'transparent',
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

export function ToolButton({ icon, label, active, onClick }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 14px',
        borderRadius: 0,
        border: active ? '1px solid #1edce0' : '1px solid rgba(255,255,255,0.1)',
        background: active ? 'rgba(30, 220, 224, 0.15)' : 'rgba(0,0,0,0.4)',
        color: active ? '#1edce0' : 'rgba(255,255,255,0.9)',
        cursor: 'pointer',
        transition: 'background 100ms ease-out, border-color 100ms ease-out',
        fontSize: 13,
        fontWeight: 600,
        flexShrink: 0,
        backdropFilter: 'blur(12px)',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
          e.currentTarget.style.border = '1px solid rgba(30, 220, 224, 0.5)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(0,0,0,0.4)';
          e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)';
        }
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      <span>{label}</span>
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
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 40, height: 32,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 600,
        color: active ? '#1edce0' : 'rgba(255,255,255,0.7)',
        background: active ? 'rgba(30, 220, 224, 0.15)' : 'rgba(0,0,0,0.4)',
        border: active ? '1px solid #1edce0' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: 0,
        cursor: 'pointer',
        backdropFilter: 'blur(12px)',
        transition: 'background 100ms ease-out, border-color 100ms ease-out',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
          e.currentTarget.style.border = '1px solid rgba(30, 220, 224, 0.5)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(0,0,0,0.4)';
          e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)';
        }
      }}
    >
      <span style={{ display: 'block' }}>{label}</span>
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

export function TransportButton({ onClick, title, icon, active = false, width = 32 }: TransportButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width, height: 32,
        color: active ? '#1edce0' : '#64748b',
        background: active ? 'rgba(30, 220, 224, 0.15)' : '#121418',
        border: '1px solid',
        borderColor: active ? '#1edce0' : '#334155',
        borderRadius: 0,
        cursor: 'pointer',
        transition: 'background 100ms ease-out, border-color 100ms ease-out, color 100ms ease-out',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.color = '#f8fafc';
          e.currentTarget.style.borderColor = 'rgba(30, 220, 224, 0.5)';
          e.currentTarget.style.background = '#1e293b';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.color = '#64748b';
          e.currentTarget.style.borderColor = '#334155';
          e.currentTarget.style.background = '#121418';
        }
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
    </button>
  );
}
