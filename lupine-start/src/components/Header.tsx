import { Link } from '@tanstack/react-router'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-[var(--surface)]/90 backdrop-blur-md border-b border-[var(--outline-variant)]">
      <div className="container mx-auto px-6 lg:px-12 h-20 flex items-center justify-between max-w-7xl">
        <Link to="/" className="flex items-center gap-3 no-underline group">
          <div className="w-8 h-8 rounded-none bg-[var(--primary)] flex items-center justify-center shadow-sm transition-transform group-hover:scale-105">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="8" cy="8" r="6" stroke="#131313" strokeWidth="1.5" />
              <circle cx="8" cy="8" r="2" fill="#131313" />
            </svg>
          </div>
          <span className="font-serif italic text-xl font-semibold text-[var(--on-surface)] tracking-tight">Lupine</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className="font-mono text-xs font-semibold text-[var(--on-surface-variant)] uppercase tracking-widest no-underline transition-colors hover:text-[var(--primary)] activeProps={{ className: 'text-[var(--primary)]' }}">
            Thesis
          </Link>
          <Link to="/research" className="font-mono text-xs font-semibold text-[var(--on-surface-variant)] uppercase tracking-widest no-underline transition-colors hover:text-[var(--primary)] activeProps={{ className: 'text-[var(--primary)]' }}">
            Research
          </Link>
          <Link to="/live" className="font-mono text-xs font-semibold text-[var(--primary)] uppercase tracking-widest no-underline transition-colors relative flex items-center gap-2" activeProps={{ className: 'font-bold' }}>
            <span className="w-1.5 h-1.5 rounded-none bg-[var(--primary)] animate-[pulse-cyan_2s_infinite]"></span> Live Lab
          </Link>
          <Link to="/investor-relations" className="font-mono text-xs font-semibold text-[var(--on-surface-variant)] uppercase tracking-widest no-underline transition-colors hover:text-[var(--primary)] activeProps={{ className: 'text-[var(--primary)]' }}">
            Investor Relations
          </Link>
          <Link to="/proof" className="font-mono text-xs font-semibold text-[var(--on-surface-variant)] uppercase tracking-widest no-underline transition-colors hover:text-[var(--primary)] activeProps={{ className: 'text-[var(--primary)]' }}">
            Compliance
          </Link>
          <Link to="/about" className="font-mono text-xs font-bold text-[var(--secondary)] uppercase tracking-widest no-underline transition-colors hover:text-[var(--secondary)] relative after:absolute after:bottom-[-4px] after:left-0 after:w-full after:h-[2px] after:bg-[var(--secondary)] glow-secondary">
            About
          </Link>
        </nav>
      </div>
    </header>
  )
}
