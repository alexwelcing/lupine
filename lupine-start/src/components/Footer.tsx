import { Link } from '@tanstack/react-router'

export default function Footer() {
  return (
    <footer className="bg-[var(--surface-container-lowest)] py-12 mt-auto border-t border-[var(--outline-variant)]">
      <div className="container mx-auto px-6 lg:px-12 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start gap-10">
          
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-3 opacity-70 hover:opacity-100 transition-opacity">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="8" cy="8" r="2" fill="currentColor" />
              </svg>
              <span className="font-serif italic text-sm font-semibold tracking-tight">Lupine Systems</span>
            </Link>
            <p className="text-xs text-[var(--on-surface-variant)] max-w-xs leading-relaxed opacity-60">
              Unified computational materials science. From quantum DFT to billion-atom MD in one Rust codebase.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-10">
            <div className="flex flex-col gap-3">
              <span className="mono-label text-[var(--on-surface-variant)] opacity-40 text-[10px]">Platform</span>
              <Link to="/" className="font-mono text-[11px] text-[var(--on-surface-variant)] uppercase tracking-widest hover:text-[var(--primary)] transition-colors">
                Thesis
              </Link>
              <Link to="/research" className="font-mono text-[11px] text-[var(--on-surface-variant)] uppercase tracking-widest hover:text-[var(--primary)] transition-colors">
                Manifesto
              </Link>
              <Link to="/live" className="font-mono text-[11px] text-[var(--on-surface-variant)] uppercase tracking-widest hover:text-[var(--primary)] transition-colors">
                Live Lab
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              <span className="mono-label text-[var(--on-surface-variant)] opacity-40 text-[10px]">Company</span>
              <Link to="/investor-relations" className="font-mono text-[11px] text-[var(--on-surface-variant)] uppercase tracking-widest hover:text-[var(--primary)] transition-colors">
                Investors
              </Link>
              <Link to="/proof" className="font-mono text-[11px] text-[var(--on-surface-variant)] uppercase tracking-widest hover:text-[var(--primary)] transition-colors">
                Compliance
              </Link>
              <Link to="/about" className="font-mono text-[11px] text-[var(--on-surface-variant)] uppercase tracking-widest hover:text-[var(--primary)] transition-colors">
                About
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              <span className="mono-label text-[var(--on-surface-variant)] opacity-40 text-[10px]">Connect</span>
              <a href="https://github.com/alexwelcing/lupine" target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] text-[var(--on-surface-variant)] uppercase tracking-widest hover:text-[var(--primary)] transition-colors">
                GitHub
              </a>
              <a href="https://glim-think-v1.aw-ab5.workers.dev/feed" target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] text-[var(--on-surface-variant)] uppercase tracking-widest hover:text-[var(--primary)] transition-colors">
                System Feed
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--outline-variant)]/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="font-mono text-[10px] text-[var(--on-surface-variant)] uppercase tracking-widest opacity-50">
            &copy; {new Date().getFullYear()} Texas Research Initiative. All rights reserved.
          </div>
          <div className="font-mono text-[10px] text-[var(--on-surface-variant)] opacity-40">
            Apache 2.0 Licensed
          </div>
        </div>
      </div>
    </footer>
  )
}
