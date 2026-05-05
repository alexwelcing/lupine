export function LandingFooter() {
  return (
    <footer style={{
      padding: '60px 24px',
      background: 'linear-gradient(180deg, #06080d 0%, #020204 100%)',
      borderTop: '1px solid rgba(255,255,255,0.04)',
      textAlign: 'center',
    }}>
      <div style={{
        maxWidth: 600,
        margin: '0 auto',
      }}>
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
          margin: '0 0 24px',
          lineHeight: 1.6,
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
        <div style={{
          marginTop: 40,
          fontSize: 12,
          color: 'rgba(255,255,255,0.2)',
        }}>
          glimPSE — built with Lupine Science
        </div>
      </div>
    </footer>
  );
}
