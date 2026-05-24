import { Link } from '@tanstack/react-router'

export default function Footer() {
  return (
    <footer className="py-12 mt-auto border-t border-[var(--outline-variant)]" style={{ background: 'var(--surface)' }}>
      <div className="container mx-auto px-6 lg:px-12 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start gap-10">
          
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-3 opacity-70 hover:opacity-100 transition-opacity no-underline">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="8" cy="8" r="2" fill="currentColor" />
              </svg>
              <span className="font-serif italic text-sm tracking-tight text-[var(--on-surface-variant)]">Lupine</span>
            </Link>
            <p className="text-xs text-[var(--on-surface-variant)] max-w-xs leading-relaxed opacity-60">
              The audit layer for the MLIP ecosystem — and the low-rank retraining target that compounds out of it. Applied learning mechanics for atomistic ML.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-10">
            <div className="flex flex-col gap-3">
              <span className="font-mono text-[var(--on-surface-variant)] opacity-40 text-[10px] uppercase tracking-[0.08em]">Audit layer</span>
              <Link to="/research" className="font-mono text-sm text-[var(--on-surface-variant)] uppercase tracking-[0.08em] hover:text-[var(--primary)] transition-colors no-underline">Research</Link>
              <Link to="/lineage" className="font-mono text-sm text-[var(--on-surface-variant)] uppercase tracking-[0.08em] hover:text-[var(--primary)] transition-colors no-underline">Lineage</Link>
              <Link to="/proof" className="font-mono text-sm text-[var(--on-surface-variant)] uppercase tracking-[0.08em] hover:text-[var(--primary)] transition-colors no-underline">Research Defense</Link>
              <Link to="/atlas-viewer" className="font-mono text-sm text-[var(--on-surface-variant)] uppercase tracking-[0.08em] hover:text-[var(--primary)] transition-colors no-underline">Atlas Viewer</Link>
            </div>
            <div className="flex flex-col gap-3">
              <span className="font-mono text-[var(--on-surface-variant)] opacity-40 text-[10px] uppercase tracking-[0.08em]">Engagement</span>
              <Link to="/pilots" className="font-mono text-sm text-[var(--on-surface-variant)] uppercase tracking-[0.08em] hover:text-[var(--primary)] transition-colors no-underline">Pilots</Link>
              <Link to="/about" className="font-mono text-sm text-[var(--on-surface-variant)] uppercase tracking-[0.08em] hover:text-[var(--primary)] transition-colors no-underline">About</Link>
              <Link to="/process" className="font-mono text-sm text-[var(--on-surface-variant)] uppercase tracking-[0.08em] hover:text-[var(--primary)] transition-colors no-underline">Operating Report</Link>
              <Link to="/investor-relations" className="font-mono text-sm text-[var(--on-surface-variant)] uppercase tracking-[0.08em] hover:text-[var(--primary)] transition-colors no-underline">Investor Brief</Link>
            </div>
            <div className="flex flex-col gap-3">
              <span className="font-mono text-[var(--on-surface-variant)] opacity-40 text-[10px] uppercase tracking-[0.08em]">Open work</span>
              <a href="https://github.com/alexwelcing/lupine" target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-[var(--on-surface-variant)] uppercase tracking-[0.08em] hover:text-[var(--primary)] transition-colors no-underline">GitHub</a>
              <Link to="/live" className="font-mono text-sm text-[var(--on-surface-variant)] uppercase tracking-[0.08em] hover:text-[var(--primary)] transition-colors no-underline">Live Lab</Link>
              <Link to="/console" className="font-mono text-sm text-[var(--on-surface-variant)] uppercase tracking-[0.08em] hover:text-[var(--primary)] transition-colors no-underline">Console</Link>
              <a href="mailto:alexwelcing@gmail.com" className="font-mono text-sm text-[var(--on-surface-variant)] uppercase tracking-[0.08em] hover:text-[var(--primary)] transition-colors no-underline">Contact</a>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--outline-variant)]/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="font-mono text-[10px] text-[var(--on-surface-variant)] uppercase tracking-[0.08em] opacity-50">
            &copy; {new Date().getFullYear()} Lupine. Geometric error analysis for atomistic ML.
          </div>
          <div className="font-mono text-[10px] text-[var(--on-surface-variant)] opacity-40">
            Apache 2.0 Licensed
          </div>
        </div>
      </div>
    </footer>
  )
}
