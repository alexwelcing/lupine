import React from 'react';

export default function VisualAssetsShowcase() {
  return (
    <div className="visual-assets-showcase" style={{
      backgroundColor: '#fef8f5', // "Uncoated paper" base surface
      color: '#2C2A28', // On-surface
      padding: '120px 8%',
      fontFamily: 'Inter, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Subtle risograph grain overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        opacity: 0.03, pointerEvents: 'none',
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")'
      }} />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 60%) minmax(0, 1fr)',
        gap: '64px',
        alignItems: 'center',
        position: 'relative',
        zIndex: 2,
        marginBottom: '120px'
      }}>
        {/* Left Column: Hero Frame */}
        <div style={{
          backgroundColor: '#f8f2ef', // surface-container-low shift
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}>
          {/* Topographic line motif hint in background */}
          <div style={{ position: 'absolute', top: -20, right: -20, width: 200, height: 200, opacity: 0.03, background: 'radial-gradient(circle, #475b9c 1px, transparent 1px) 0 0 / 10px 10px' }} />
          
          <img 
            src="/assets/lupine_molecule_sapphire.png" 
            alt="Sapphire Molecular Structure" 
            style={{ width: '100%', height: 'auto', display: 'block', mixBlendMode: 'multiply' }} 
          />
          <div style={{ 
            fontFamily: 'Space Grotesk, sans-serif', 
            fontSize: '11px', 
            textTransform: 'uppercase', 
            letterSpacing: '0.1em',
            marginTop: '16px',
            color: '#4c653d' // Sage secondary
          }}>
            Fig. 1 — Sapphire Molecular Structure (Al₂O₃)
          </div>
        </div>

        {/* Right Column: Editorial Text */}
        <div>
          <h2 style={{
            fontFamily: '"Newsreader", serif',
            fontStyle: 'italic',
            fontSize: 'clamp(32px, 4vw, 56px)',
            fontWeight: 400,
            lineHeight: 1.1,
            color: '#475b9c', // Bluebonnet
            marginBottom: '32px'
          }}>
            High-Fidelity WebGL Exploration. <br/>
            Absolute atomic precision exported directly to your journal.
          </h2>
          <p style={{
            fontSize: '18px',
            lineHeight: 1.7,
            color: '#4a4846',
            maxWidth: '500px',
            marginBottom: '40px'
          }}>
            Our custom visualization engine doesn't just render spheres and rods. It computes true ambient occlusion, real-time depth of field, and stunning post-processing pipelines perfectly tuned for scientific publishing.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* Tertiary stippled button */}
            <a href="#" style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: '14px',
              fontWeight: 600,
              color: '#475b9c',
              textDecoration: 'none',
              borderBottom: '2px dotted #475b9c',
              paddingBottom: '2px'
            }}>Read The Rendering Specs</a>
          </div>
        </div>
      </div>

      {/* Export Artifacts Grid */}
      <div style={{
        backgroundColor: '#f8f2ef', // Tonal shift
        padding: '64px',
        position: 'relative',
        zIndex: 2
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '48px'
        }}>
          <h3 style={{
            fontFamily: '"Newsreader", serif',
            fontSize: '32px',
            fontWeight: 400,
            color: '#2C2A28'
          }}>Export Artifacts</h3>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#725381' }}>// RAW EXTRACTIONS</span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '40px'
        }}>
          {/* Artifact Item */}
          <div>
            <div style={{ backgroundColor: '#ffffff', padding: '12px', marginBottom: '16px' }}>
              <img 
                src="/assets/lupine_lattice_crystal.png" 
                alt="Lattice Crystal Output" 
                style={{ width: '100%', height: 'auto', display: 'block', mixBlendMode: 'multiply' }} 
              />
            </div>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '13px', fontWeight: 600, color: '#475b9c', marginBottom: '4px' }}>Lattice Crystal (Geometric)</div>
            <div style={{ fontSize: '14px', color: '#4a4846', lineHeight: 1.5 }}>Raw output demonstrating ultra-precise depth sorting and soft bloom parameters at 300 DPI.</div>
          </div>
          
          {/* Artifact Placeholder 2 */}
          <div style={{ opacity: 0.6 }}>
            <div style={{ backgroundColor: '#ffffff', padding: '12px', marginBottom: '16px', height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '11px', color: '#a09d9b', letterSpacing: '0.1em' }}>PROCESSING AL_POLYCRYSTAL.JSON</span>
            </div>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '13px', fontWeight: 600, color: '#2C2A28', marginBottom: '4px' }}>Aluminium Polycrystal</div>
            <div style={{ fontSize: '14px', color: '#4a4846', lineHeight: 1.5 }}>Volumetric rendering simulation queued for compilation.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
