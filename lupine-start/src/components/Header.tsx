import { Link } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import MobileNav from './MobileNav'
import ThemeToggle from './ThemeToggle'

const PRIMARY_NAV = [
  { to: '/', label: 'Home' },
  { to: '/research', label: 'Research' },
  { to: '/live', label: 'Live Lab', live: true },
  { to: '/about', label: 'About' },
] as const

const MORE_NAV = [
  { to: '/console', label: 'Research Console', desc: 'Tabular browser for the manifest ledger' },
  { to: '/slideshow', label: 'Slideshow', desc: 'Visual brief, 100+ stills' },
  { to: '/atlas-viewer', label: 'Atlas Viewer', desc: 'WebGPU exploration of the error manifold' },
  { to: '/proof', label: 'Research Defense', desc: 'Response to preprint critique' },
  { to: '/process', label: 'Operating Report', desc: 'Harden stage, run by run' },
  { to: '/investor-relations', label: 'Investor Brief', desc: 'Manifest, thesis, diligence answers' },
  { to: '/ops', label: 'Ops Dashboard', desc: 'Deployment telemetry' },
] as const

export default function Header() {
  const [moreOpen, setMoreOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-50 bg-[var(--surface)]/90 backdrop-blur-md border-b border-[var(--outline-variant)]">
      <div className="container mx-auto px-6 lg:px-12 h-16 flex items-center justify-between max-w-7xl">
        <Link to="/" className="flex items-center gap-3 no-underline group">
          <div className="w-7 h-7 rounded-sm bg-[var(--primary)] flex items-center justify-center transition-transform group-hover:scale-105">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="8" cy="8" r="6" stroke="#131313" strokeWidth="1.5" />
              <circle cx="8" cy="8" r="2" fill="#131313" />
            </svg>
          </div>
          <span className="font-serif italic text-lg font-semibold text-[var(--on-surface)] tracking-tight">Lupine</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-8">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`font-mono text-xs font-semibold uppercase tracking-widest no-underline transition-colors ${
                item.live
                  ? 'text-[var(--primary)] relative flex items-center gap-2'
                  : 'text-[var(--on-surface-variant)] hover:text-[var(--primary)]'
              }`}
            >
              {item.live && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-[pulse-cyan_2s_infinite]" />
              )}
              {item.label}
            </Link>
          ))}

          {/* More dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={`font-mono text-xs font-semibold uppercase tracking-widest transition-colors flex items-center gap-1.5 ${
                moreOpen ? 'text-[var(--primary)]' : 'text-[var(--on-surface-variant)] hover:text-[var(--primary)]'
              }`}
            >
              More
              <svg
                width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"
                className={`transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`}
              >
                <path d="M2 4l3 3 3-3" />
              </svg>
            </button>

            {moreOpen && (
              <div
                className="absolute right-0 top-full mt-3 w-64 bg-[var(--surface)] border border-[var(--outline-variant)] shadow-lg z-50 py-2"
                style={{ backdropFilter: 'blur(12px)' }}
              >
                {MORE_NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className="block px-5 py-3 no-underline hover:bg-[var(--surface-container-high)]/50 transition-colors group"
                  >
                    <span className="font-mono text-[11px] font-semibold text-[var(--on-surface)] uppercase tracking-widest group-hover:text-[var(--primary)] transition-colors">
                      {item.label}
                    </span>
                    <span className="block text-[11px] text-[var(--on-surface-variant-mid)] mt-0.5">
                      {item.desc}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="ml-2 pl-2 border-l border-[var(--outline-variant)]">
            <ThemeToggle />
          </div>
        </nav>

        <div className="flex items-center gap-3 md:hidden">
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  )
}
