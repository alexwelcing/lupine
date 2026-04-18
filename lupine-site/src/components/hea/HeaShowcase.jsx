import React from 'react';
import HeaButton from './HeaButton';
import HeaDataCard from './HeaDataCard';
import HeaList from './HeaList';
import HeaSlider from './HeaSlider';

export default function HeaShowcase() {
  const sampleComposition = [
    { element: 'Titanium (Ti)', value: 20.00, color: '#00f5d4' },
    { element: 'Nickel (Ni)', value: 20.00, color: '#bbc3ff' },
    { element: 'Cobalt (Co)', value: 20.00, color: '#ffc400' },
    { element: 'Chromium (Cr)', value: 20.00, color: '#3d5afe' },
    { element: 'Iron (Fe)', value: 20.00, color: '#d7fff3' }
  ];

  const sampleList = [
    'Primary Phase: FCC Matrix',
    'Secondary Phase: BCC Precipitates',
    'Lattice Parameter: 3.58Å',
    'Entropy Threshold: Optimal'
  ];

  return (
    <div style={{
      backgroundColor: '#131313', // Deep Obsidian Foundation
      padding: '80px 40px',
      color: '#e2e2e2',
      display: 'grid',
      gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)',
      gap: '40px',
      borderTop: '1px solid rgba(131, 148, 143, 0.15)', // Outline variant ghost line
      borderBottom: '1px solid rgba(131, 148, 143, 0.15)',
      marginTop: '60px'
    }}>
      {/* Left Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '60px' }}>
        <div>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '48px',
            margin: '0 0 16px',
            lineHeight: 1.1,
            color: '#fff'
          }}>
            High Entropy<br/>Density Array
          </h2>
          <p style={{
            fontFamily: '"JetBrains Mono", var(--font-sans)',
            fontSize: '14px',
            color: '#b9cac4',
            lineHeight: 1.6,
            maxWidth: '400px'
          }}>
            Monolithic UI parts defined by overlapping arrays, zero-radius cuts, and structural iridescence.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <HeaButton variant="primary" onClick={() => console.log('Initiate Synthesis')}>
            Initiate Synthesis
          </HeaButton>
          <HeaButton variant="ghost" onClick={() => console.log('Stabilize Lattice')}>
            Stabilize
          </HeaButton>
        </div>

        <div>
          <HeaSlider label="DENSITY VARIANCE" min={0} max={100} defaultValue={82.4} />
          <HeaSlider label="ATOMIC SUBSTITUTION RATE" min={0} max={10.0} defaultValue={3.14} />
        </div>
      </div>

      {/* Right Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        <HeaDataCard title="CoCrFeNiTi" composition={sampleComposition} />
        
        <div style={{ padding: '24px 0' }}>
            <h4 style={{ 
                fontFamily: 'var(--font-serif)', 
                fontSize: '18px', 
                color: '#bbc3ff',
                marginBottom: '16px',
                fontStyle: 'italic'
            }}>
                Topological Readout
            </h4>
            <HeaList items={sampleList} />
        </div>
      </div>
    </div>
  );
}
