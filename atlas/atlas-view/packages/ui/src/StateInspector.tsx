/**
 * StateInspector — dev-only HUD that proves state changes propagate.
 *
 * Sits in the top-right (r3f-perf is top-left) and shows the live values of
 * the parts of the store that should change pixels: postprocess preset +
 * intensity, bond settings, and which backend produced the most recent
 * bond detection. If the user picks "Cinematic" and the panel doesn't say
 * "cinematic" within a frame, something's broken in the wiring.
 */

import { useStore } from './store';
import { POSTPROCESS_PRESETS } from './postprocess/presets';

const STATUS_COLOR: Record<'idle' | 'ready' | 'unsupported', string> = {
  idle: '#94a3b8',
  ready: '#34d399',
  unsupported: '#f87171',
};

const SOURCE_COLOR: Record<'cpu' | 'gpu' | 'none', string> = {
  none: '#475569',
  cpu: '#fbbf24',
  gpu: '#34d399',
};

export function StateInspector() {
  const presetId = useStore(s => s.postprocessPreset);
  const intensity = useStore(s => s.postprocessIntensity);
  const colorScheme = useStore(s => s.colorScheme);
  const atomColorSource = useStore(s => s.atomColorSource);
  const showBonds = useStore(s => s.showBonds);
  const useGpuBonds = useStore(s => s.useGpuBonds);
  const gpuStatus = useStore(s => s.gpuBondsStatus);
  const bondSource = useStore(s => s.bondSource);
  const lastBondCount = useStore(s => s.lastBondCount);
  const bondColorMode = useStore(s => s.bondColorMode);
  const colorMode = useStore(s => s.colorMode);
  const playing = useStore(s => s.playing);
  const frame = useStore(s => s.frame);
  const file = useStore(s => s.file);

  const natoms = file?.trajectory?.frames?.[frame]?.natoms ?? 0;
  const totalFrames = file?.trajectory?.frames?.length ?? 0;
  const preset = POSTPROCESS_PRESETS[presetId];

  return (
    <div style={{
      position: 'fixed',
      top: 8,
      right: 8,
      zIndex: 10000,
      pointerEvents: 'none',
      fontFamily: 'var(--font-mono), Menlo, monospace',
      fontSize: 10,
      lineHeight: 1.4,
      color: '#e2e8f0',
      background: 'rgba(10, 10, 12, 0.85)',
      border: '1px solid #1f2937',
      padding: '8px 10px',
      minWidth: 220,
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
    }}>
      <div style={{
        fontSize: 9, letterSpacing: '0.1em', color: '#1edce0',
        fontWeight: 700, marginBottom: 6,
      }}>STATE</div>

      <Row label="LOOK" value={preset?.label ?? presetId}
        secondary={`×${intensity.toFixed(2)}`} />
      <Row label="COLOR" value={colorScheme} secondary={atomColorSource} />
      <Row label="PLAY"
        value={playing ? `▶ ${frame + 1}/${totalFrames}` : `▌ ${frame + 1}/${totalFrames}`}
        valueColor={playing ? '#34d399' : '#94a3b8'} />
      <Row label="ATOMS" value={natoms.toLocaleString()} secondary={colorMode} />

      <Divider />

      <Row label="BONDS" value={showBonds ? 'on' : 'off'}
        valueColor={showBonds ? '#34d399' : '#475569'}
        secondary={bondColorMode} />
      <Row label="BACKEND"
        value={bondSource}
        valueColor={SOURCE_COLOR[bondSource]}
        secondary={lastBondCount > 0 ? `${lastBondCount} bonds` : '—'} />
      <Row label="GPU"
        value={useGpuBonds ? gpuStatus : 'disabled'}
        valueColor={useGpuBonds ? STATUS_COLOR[gpuStatus] : '#475569'} />
    </div>
  );
}

function Row({
  label,
  value,
  secondary,
  valueColor,
}: {
  label: string;
  value: string;
  secondary?: string;
  valueColor?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span style={{
        color: '#64748b',
        fontSize: 9,
        letterSpacing: '0.06em',
        minWidth: 56,
      }}>{label}</span>
      <span style={{
        color: valueColor ?? '#f8fafc',
        fontWeight: 600,
        flex: 1,
      }}>{value}</span>
      {secondary && (
        <span style={{ color: '#475569', fontSize: 9 }}>{secondary}</span>
      )}
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: '1px solid #1f2937', margin: '6px 0' }} />;
}
