/**
 * AnalysisPanel — GPU-Accelerated Structural Analysis Controls
 * 
 * Fully integrated with @lupine/ui "Atomic Understanding" component library.
 */

import { useStore } from '../store';
import { QuantumSection, AtomicGlass } from '@lupine/ui';

// ─── Icons ────────────────────────────────────────────────────────────
const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

import { 
  RDFModule, 
  MSDModule, 
  VoronoiModule, 
  PhononModule, 
  GlimMERModule, 
  GNNModule, 
  SloppyModelModule,
  BondAnalysisModule,
} from './analysis_modules';

export function AnalysisPanel() {
  const { setActivePanel } = useStore();

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--slate-900)',
      borderLeft: '1px solid var(--glass-border)',
      boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
    }}>
      {/* ─── Header ─── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px',
        borderBottom: '1px solid var(--glass-border)',
        background: 'var(--glass-bg-2)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 3, height: 14, borderRadius: 2,
            background: 'linear-gradient(180deg, var(--lupine-400), var(--violet-500))',
          }} />
          <span style={{
            fontSize: 11, fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--lupine-300)',
          }}>
            Analysis
          </span>
        </div>
        <button
          onClick={() => setActivePanel(null)}
          className="lupine-glass lupine-glass--1 lupine-glass--interactive"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28,
            background: 'transparent', border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-xs)',
            color: 'var(--slate-500)', cursor: 'pointer',
          }}
        >
          <IconClose />
        </button>
      </div>

      {/* ─── Content ─── */}
      <div className="lupine-scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          
          <RDFModule />
          <BondAnalysisModule />
          <MSDModule />
          <VoronoiModule />
          <PhononModule />
          <GlimMERModule />
          <GNNModule />
          <SloppyModelModule />

          {/* ─── Tip ─── */}
          <AtomicGlass level={1} flush style={{ marginTop: 12, padding: '12px', borderStyle: 'dashed' }}>
             <div style={{
              fontSize: 11, color: 'var(--slate-400)', lineHeight: 1.5,
            }}>
              These analysis kernels run as <strong style={{ color: 'var(--slate-200)' }}>WebGPU compute shaders</strong> directly on your local hardware, bypassing CPU bottlenecks.
            </div>
          </AtomicGlass>

        </div>
      </div>
    </div>
  );
}
