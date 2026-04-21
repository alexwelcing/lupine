import { QuantumSection } from '@lupine/ui';
import { IconChart } from './icons';
import { useStore } from '../../store';

export function RDFModule() {
  const { colorMode, colorProperty, setColorMode, setColorProperty, setColormap } = useStore();
  const isActive = colorMode === 'property' && colorProperty === 'rdf_local_density';

  return (
    <QuantumSection label="Radial Distribution Function" defaultOpen={true}>
      <div style={{ fontSize: 11, color: 'var(--slate-400)', marginBottom: 12, lineHeight: 1.5 }}>
        Compute RDF (g(r)) in real-time via WebGPU compute shaders.
      </div>
      <button
        onClick={() => {
          if (isActive) {
            setColorMode('type');
          } else {
            setColorMode('property');
            setColorProperty('rdf_local_density');
            setColormap('viridis');
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
        <IconChart /> {isActive ? 'Hide Local Density' : 'Compute RDF'}
      </button>
    </QuantumSection>
  );
}
