import React from 'react';

// Import our vanilla CSS components generated via Atomic Understanding design system
import {
  SiteHero,
  SiteFeatureCard,
  SitePipeline,
  SiteCompetitiveTable,
  SiteResearchGrid,
  SitePitchTailwinds,
  SitePitchMarket
} from '@lupine/ui';

// Base layout styles
import './App.css';

export default function App() {
  const pipelineSteps = [
    {
      label: 'Extraction',
      description: 'Lupine sources rare-earth composites via autonomous drones.',
      nodeText: 'RX-1',
      gradientIndex: 1
    },
    {
      label: 'Purification',
      description: 'Quantum filtration removes structural impurities at the atomic level.',
      nodeText: 'PF-2',
      gradientIndex: 2
    },
    {
      label: 'Synthesis',
      description: 'Materials are subjected to extreme pressure and resonance.',
      nodeText: 'SY-3',
      gradientIndex: 3
    },
    {
      label: 'Distribution',
      description: 'Final hyper-solid outputs are packaged for aerospace integration.',
      nodeText: 'DT-4',
      gradientIndex: 4
    }
  ];

  const competitiveRows = [
    { feature: 'Energy Efficiency (J/mol)', legacyA: 'High', legacyB: 'Moderate', lupine: 'Super-low' },
    { feature: 'Thermal Threshold (K)', legacyA: '1,500K', legacyB: '2,200K', lupine: '4,500K' },
    { feature: 'Structural Redundancy', legacyA: false, legacyB: true, lupine: true },
    { feature: 'Orbital Real-time Sync', legacyA: false, legacyB: false, lupine: true }
  ];

  const tailwindsItems = [
    {
      id: 'ml',
      title: 'ML Potentials are proven',
      description: "MACE, NequIP, and Allegro have demonstrated near-DFT accuracy at classical MD speed. The science is settled — the tooling isn't.",
      color: 'indigo' as const
    },
    {
      id: 'webgpu',
      title: 'WebGPU is here',
      description: "Browser-native GPU compute unlocks scientific visualization without install barriers. We're the first to bring it to materials science.",
      color: 'violet' as const
    },
    {
      id: 'sov',
      title: 'Sovereignty demands',
      description: "Nations are realizing that computational materials infrastructure is strategic. VASP is Austrian-held. The world needs alternatives.",
      color: 'cyan' as const
    }
  ];

  const marketStats = [
    {
      id: 'tam',
      prefix: '$', value: '12', suffix: 'B',
      label: 'Simulation Software TAM', detail: 'Scientific computing & CAE by 2028',
      gradient: 'indigo' as const
    },
    {
      id: 'users',
      value: '300', suffix: 'K+',
      label: 'LAMMPS Researchers', detail: 'Active users worldwide',
      gradient: 'indigo' as const
    },
    {
      id: 'unified',
      prefix: '$', value: '0',
      label: 'Unified Platforms', detail: 'DFT + ML + MD in one system',
      gradient: 'indigo' as const
    },
    {
      id: 'speedup',
      value: '100', suffix: 'x',
      label: 'ML Speedup', detail: 'Near-DFT accuracy, MD speed',
      gradient: 'cyan' as const
    }
  ];

  return (
    <div className="lupine-app-wrapper">
      {/* 1. The Hero Section */}
      <SiteHero 
        label="Quantum Synthesis Division"
        headline={
          <>
            Forging the Future <br />
            <span style={{ color: 'var(--lupine-300)' }}>at the Atomic Level.</span>
          </>
        }
        subheadline="Harnessing high-resolution molecular engineering to redefine the boundaries of material science. We are the architects of the next industrial revolution."
        primaryAction={{ label: 'View Investment Prospectus' }}
        secondaryAction={{ label: 'Research Portal' }}
      />
      
      {/* 1.5. Paper Banner */}
      <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(37, 99, 235, 0.1)', borderBottom: '1px solid rgba(37, 99, 235, 0.2)', color: 'white', fontFamily: 'var(--font-sans)' }}>
        <span style={{ 
          background: 'var(--lupine-500)', 
          color: 'white', 
          padding: '2px 8px', 
          borderRadius: '4px', 
          fontSize: '0.75rem', 
          fontWeight: 'bold', 
          marginRight: '12px',
          textTransform: 'uppercase'
        }}>New</span>
        <strong style={{ color: 'var(--lupine-100)' }}>The Causal Geometry of Prediction Errors</strong> — Our latest preprint on interatomic potentials is now available. 
        <a href="/immi_paper.pdf" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--lupine-400)', marginLeft: '12px', textDecoration: 'none', fontWeight: 'bold' }}>
          Read the PDF &rarr;
        </a>
      </div>
      
      {/* 2. Features Grid */}
      <section className="lupine-section">
        <div className="lupine-container">
          <div className="lupine-features-grid">
            <SiteFeatureCard 
              icon="molecular"
              title="Quantum Synthesis"
              description="Harness sub-atomic interactions for macro-scale structural integrity."
            />
            <SiteFeatureCard 
              icon="grid"
              title="Lattice Validation"
              description="Ensure every bond is mathematically secured prior to distribution."
            />
            <SiteFeatureCard 
              icon="orb"
              title="Predictive Scaling"
              description="Machine learning predicts atomic decay before it manifests physically."
            />
            <SiteFeatureCard 
              icon="grid"
              title="Cinematic Flythroughs"
              description="Compose and export high-fidelity, keyframe-based camera paths through complex molecular systems."
            />
          </div>
        </div>
      </section>

      {/* 2.5 Flythrough Video Preview */}
      <section className="lupine-section" style={{ paddingTop: 0 }}>
        <div className="lupine-container" style={{ textAlign: 'center' }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
            background: '#06080d'
          }}>
            <video 
              src="https://storage.googleapis.com/shed-489901-atlas-artifacts/flythrough.mp4" 
              autoPlay 
              muted 
              loop 
              playsInline
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>
          <p style={{ marginTop: '1rem', color: 'var(--lupine-300)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', letterSpacing: '0.05em' }}>
            Powered by the new Cinematic Flythrough Sequencer
          </p>
        </div>
      </section>

      {/* 3. The Pipeline visualization */}
      <section className="lupine-section lupine-section--alt">
        <div className="lupine-container">
          <SitePipeline 
            label="Methodology"
            title="The Lupine Process"
            subtitle="From raw elements to indestructible compounds, visualized."
            steps={pipelineSteps}
          />
        </div>
      </section>

      {/* 4. Comparative analysis */}
      <section className="lupine-section">
        <div className="lupine-container">
          <SiteCompetitiveTable 
            label="Market Edge"
            title="Beyond Legacy Limits"
            rows={competitiveRows}
          />
        </div>
      </section>

      {/* 5. Stitch-Enhanced Research Intelligence Grid */}
      <section className="lupine-section lupine-section--alt">
        <div className="lupine-container">
          <SiteResearchGrid 
            label="Research Intelligence"
            title={
              <>
                Not just simulations. <br />
                Autonomous <span style={{ fontFamily: 'var(--font-serif)', background: 'linear-gradient(135deg,var(--lupine-400),var(--violet-300))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>discovery.</span>
              </>
            }
            subtitle="The Lupine Distill engine mines published MD research to extract, validate, and discover mathematical relationships — automating what takes researchers months."
          />
        </div>
      </section>

      {/* 6. Pitch Tailwinds */}
      <section className="lupine-section">
        <div className="lupine-container" style={{ maxWidth: '1000px' }}>
          <SitePitchTailwinds 
            label="Why Now"
            title="Three tailwinds converging"
            items={tailwindsItems}
          />
        </div>
      </section>

      {/* 7. Market Size Pitch */}
      <section className="lupine-section lupine-section--alt">
        <div className="lupine-container">
          <SitePitchMarket 
            label="The Market"
            title="A sovereign-scale opportunity"
            subtitle="Computational materials science underpins batteries, semiconductors, aerospace alloys, and nuclear materials. Every nation needs this stack."
            stats={marketStats}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="lupine-footer">
        <div className="lupine-container">
          <p>© 2024 Lupine Materials Science. Powered by glimPSE.</p>
        </div>
      </footer>
    </div>
  );
}
