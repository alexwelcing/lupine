import { QuantumSection, IsotopeChip } from '@lupine/ui';
import { IconChart } from './icons';
import { useStore } from '../../store';

export function PhononModule() {
  const { colorMode, colorProperty, setColorMode, setColorProperty, setColormap } = useStore();
  const isActive = colorMode === 'property' && colorProperty === 'pdos_amplitude';

  return (
    <QuantumSection 
      label="Phonon Spectrum & PDOS" 
      defaultOpen={true}
      accent="#bf5cf0"
      action={<IsotopeChip label="EXP" tag="BETA" />}
    >
      <div style={{ fontSize: 11, color: 'var(--slate-400)', marginBottom: 12, lineHeight: 1.5 }}>
        Compute Phonon Density of States (PDOS) at rest to benchmark potential stability and identify imaginary modes.
      </div>
      <button
        onClick={() => {
          if (isActive) {
            setColorMode('type');
          } else {
            setColorMode('property');
            setColorProperty('pdos_amplitude');
            setColormap('plasma');
          }
        }}
        style={{
          width: '100%', padding: '10px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', textTransform: 'uppercase',
          color: isActive ? 'var(--slate-900)' : 'white', 
          background: isActive ? 'var(--lupine-400)' : 'transparent',
          border: '1px solid var(--lupine-400)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        <IconChart /> {isActive ? 'Hide PDOS' : 'Compute PDOS'}
      </button>
    </QuantumSection>
  );
}
