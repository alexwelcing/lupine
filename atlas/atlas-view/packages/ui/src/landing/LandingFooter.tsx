export function LandingFooter() {
  const columnStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  };

  const headerStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono, monospace)',
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  };

  const linkStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    textDecoration: 'none',
    transition: 'color 0.2s',
  };

  return (
    <footer style={{
      padding: '60px 24px 32px 24px',
      background: 'linear-gradient(180deg, #06080d 0%, #020204 100%)',
      borderTop: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
      }}>
        {/* Top section: CTA */}
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#f8fafc',
            marginBottom: 8,
            letterSpacing: '-0.02em',
          }}>
            Ready to explore?
          </div>
          <p style={{
            fontSize: 15,
            color: 'rgba(255,255,255,0.4)',
            margin: '0 auto 24px',
            lineHeight: 1.6,
            maxWidth: 600,
          }}>
            Pick a simulation from the gallery above or drop your own data to begin.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#dropzone" style={{
              padding: '12px 28px',
              fontSize: 14,
              fontWeight: 600,
              color: 'white',
              background: 'linear-gradient(135deg, #0f62fe, #7c3aed)',
              borderRadius: 100,
              textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(15,98,254,0.3)',
            }}>
              Upload a File
            </a>
            <a href="#gallery" style={{
              padding: '12px 28px',
              fontSize: 14,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 100,
              textDecoration: 'none',
            }}>
              Browse Gallery
            </a>
          </div>
        </div>

        {/* Bottom section: Links & Brand */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 40,
          paddingTop: 40,
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 300 }}>
            <a href="https://lupine.science" style={{ display: 'flex', alignItems: 'center', opacity: 0.92, textDecoration: 'none', color: '#fff' }}>
              <img
                src="/brand/lupine-science-icon.png"
                alt="Lupine Science"
                style={{ width: 88, height: 88, borderRadius: 12, objectFit: 'contain', display: 'block' }}
              />
            </a>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
              The audit layer for the MLIP ecosystem and the low-rank retraining target that compounds out of it. Applied learning mechanics for atomistic ML.
            </p>
          </div>

          {/* Links */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40 }}>
            <div style={columnStyle}>
              <span style={headerStyle}>Audit layer</span>
              <a href="https://lupine.science/research" style={linkStyle} onMouseEnter={(e) => e.currentTarget.style.color = '#1edce0'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}>Research</a>
              <a href="https://lupine.science/lineage" style={linkStyle} onMouseEnter={(e) => e.currentTarget.style.color = '#1edce0'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}>Lineage</a>
              <a href="https://lupine.science/proof" style={linkStyle} onMouseEnter={(e) => e.currentTarget.style.color = '#1edce0'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}>Research Defense</a>
              <a href="/" style={linkStyle} onMouseEnter={(e) => e.currentTarget.style.color = '#1edce0'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}>LUPI</a>
            </div>
            <div style={columnStyle}>
              <span style={headerStyle}>Study routes</span>
              <a href="/scenes/1m-copper-lattice" style={linkStyle} onMouseEnter={(e) => e.currentTarget.style.color = '#1edce0'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}>1M Atom Scene</a>
              <a href="/study/organic-functional-groups" style={linkStyle} onMouseEnter={(e) => e.currentTarget.style.color = '#1edce0'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}>Functional Groups</a>
              <a href="/study/functional-group-examples" style={linkStyle} onMouseEnter={(e) => e.currentTarget.style.color = '#1edce0'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}>Group Examples</a>
              <a href="/study/organic-chemistry-3d-molecule-viewer" style={linkStyle} onMouseEnter={(e) => e.currentTarget.style.color = '#1edce0'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}>3D Ochem Viewer</a>
              <a href="/materials/omol25" style={linkStyle} onMouseEnter={(e) => e.currentTarget.style.color = '#1edce0'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}>OMol25 Geometry</a>
              <a href="/materials/omol25-molecule-geometry" style={linkStyle} onMouseEnter={(e) => e.currentTarget.style.color = '#1edce0'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}>OMol25 XYZ</a>
              <a href="/materials/million-atom-viewer" style={linkStyle} onMouseEnter={(e) => e.currentTarget.style.color = '#1edce0'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}>Million-Atom Viewer</a>
            </div>
            <div style={columnStyle}>
              <span style={headerStyle}>Engagement</span>
              <a href="https://lupine.science/pilots" style={linkStyle} onMouseEnter={(e) => e.currentTarget.style.color = '#1edce0'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}>Pilots</a>
              <a href="https://lupine.science/about" style={linkStyle} onMouseEnter={(e) => e.currentTarget.style.color = '#1edce0'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}>About</a>
              <a href="https://lupine.science/process" style={linkStyle} onMouseEnter={(e) => e.currentTarget.style.color = '#1edce0'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}>Operating Report</a>
              <a href="https://lupine.science/investor-relations" style={linkStyle} onMouseEnter={(e) => e.currentTarget.style.color = '#1edce0'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}>Investor Brief</a>
            </div>
            <div style={columnStyle}>
              <span style={headerStyle}>Open work</span>
              <a href="https://github.com/alexwelcing/lupine" target="_blank" rel="noopener noreferrer" style={linkStyle} onMouseEnter={(e) => e.currentTarget.style.color = '#1edce0'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}>GitHub</a>
              <a href="https://lupine.science/live" style={linkStyle} onMouseEnter={(e) => e.currentTarget.style.color = '#1edce0'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}>Live Lab</a>
              <a href="https://lupine.science/console" style={linkStyle} onMouseEnter={(e) => e.currentTarget.style.color = '#1edce0'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}>Console</a>
              <a href="/llms.txt" style={linkStyle} onMouseEnter={(e) => e.currentTarget.style.color = '#1edce0'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}>Agents</a>
              <a href="mailto:alexwelcing@gmail.com" style={linkStyle} onMouseEnter={(e) => e.currentTarget.style.color = '#1edce0'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}>Contact</a>
            </div>
          </div>
        </div>

        <div style={{
          marginTop: 40,
          paddingTop: 24,
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10, color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            &copy; {new Date().getFullYear()} LUPI by Lupine Science. Geometric error analysis for atomistic ML.
          </div>
          <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10, color: 'rgba(255, 255, 255, 0.4)' }}>
            Apache 2.0 Licensed
          </div>
        </div>
      </div>
    </footer>
  );
}
