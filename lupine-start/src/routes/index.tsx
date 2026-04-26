import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import { AtomicLogo } from '../components/legacy/AtomicLogo'
import { AtomCanvas } from '../components/legacy/AtomCanvas'
import { BootSequence } from '../components/legacy/BootSequence'
import { CustomCursor } from '../components/legacy/CustomCursor'
import { HUDOverlay } from '../components/legacy/HUDOverlay'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

/* ─── Scroll Reveal ─── */
function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: `all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

/* ─── Count Up ─── */
function CountUp({
  to,
  prefix = '',
  suffix = '',
  duration = 2000,
}: {
  to: number
  prefix?: string
  suffix?: string
  duration?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [value, setValue] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true)
          const start = performance.now()
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            const isInt = Number.isInteger(to)
            setValue(isInt ? Math.round(to * eased) : parseFloat((to * eased).toFixed(1)))
            if (progress < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
          observer.unobserve(el)
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [to, duration, started])

  return (
    <div ref={ref}>
      {prefix}{value}{suffix}
    </div>
  )
}

/* ─── Scramble Button ─── */
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function ScrambleButton({
  children,
  href,
  variant = 'primary',
  onClick,
}: {
  children: string
  href?: string
  variant?: 'primary' | 'secondary'
  onClick?: () => void
}) {
  const [text, setText] = useState(children)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleEnter = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    let iterations = 0
    intervalRef.current = setInterval(() => {
      setText(
        children
          .split('')
          .map((letter, index) => {
            if (index < iterations || letter === ' ') return children[index]
            return LETTERS[Math.floor(Math.random() * 26)]
          })
          .join('')
      )
      iterations += 0.5
      if (iterations >= children.length) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setText(children)
      }
    }, 30)
  }, [children])

  const handleLeave = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setText(children)
  }, [children])

  const baseClass =
    'inline-flex items-center gap-2 px-9 py-4 rounded-xl text-[15px] font-semibold no-underline transition-all duration-300'
  const variantClass =
    variant === 'primary'
      ? 'text-white border border-white/10 hover:-translate-y-0.5'
      : 'text-[var(--slate-200)] border border-[var(--slate-700)] hover:bg-white/[0.04] hover:border-[var(--slate-600)]'

  const style =
    variant === 'primary'
      ? { background: 'linear-gradient(135deg, var(--lupine-700), var(--lupine-600))' }
      : { background: 'rgba(255,255,255,0.04)' }

  const props = {
    className: `${baseClass} ${variantClass}`,
    style,
    onMouseEnter: handleEnter,
    onMouseLeave: handleLeave,
    onClick,
  }

  if (href?.startsWith('#')) {
    return (
      <a {...props} href={href}>
        {text}
      </a>
    )
  }

  if (href) {
    return (
      <Link {...props} to={href}>
        {text}
      </Link>
    )
  }

  return <button {...props}>{text}</button>
}

/* ─── Navigation ─── */
function LegacyNav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id: string) => {
    setMobileOpen(false)
    const el = document.querySelector(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  const navItems = [
    ['Problem', '#problem'],
    ['Platform', '#platform'],
    ['Product', '#product'],
    ['Research', '#research'],
    ['Market', '#market'],
  ]

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between transition-all duration-[400ms]"
      style={{
        padding: scrolled ? '14px 24px' : '20px 24px',
        background: scrolled ? 'rgba(10, 11, 18, 0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(91, 58, 140, 0.15)' : '1px solid transparent',
      }}
    >
      <a href="#" className="flex items-center gap-3.5 no-underline" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
        <AtomicLogo size={36} />
        <span className="font-semibold text-[15px] text-[var(--slate-100)] tracking-wide hidden sm:inline">Lupine Materials Science</span>
      </a>

      <div className="hidden md:flex items-center gap-8">
        {navItems.map(([label, id]) => (
          <button
            key={label}
            onClick={() => scrollTo(id)}
            className="text-[13px] font-medium uppercase tracking-widest text-[var(--slate-400)] hover:text-[var(--lupine-400)] transition-colors duration-300 bg-transparent border-none"
          >
            {label}
          </button>
        ))}
        <Link
          to="/research"
          className="text-[13px] font-semibold text-white px-6 py-2.5 rounded-lg border border-white/10 transition-all duration-300 hover:-translate-y-px no-underline"
          style={{ background: 'linear-gradient(135deg, var(--lupine-700), var(--violet-700))' }}
        >
          Explore
        </Link>
      </div>

      {/* Mobile hamburger */}
      <div className="md:hidden flex items-center gap-3">
        <Link
          to="/research"
          className="text-[11px] font-semibold text-white px-3 py-1.5 rounded border border-white/10 no-underline"
          style={{ background: 'linear-gradient(135deg, var(--lupine-700), var(--violet-700))' }}
        >
          Explore
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-8 h-8 flex items-center justify-center text-[var(--slate-100)]"
          aria-label="Toggle menu"
        >
          <div className="w-4 h-3 relative flex flex-col justify-between">
            <span className={`block w-full h-px bg-current transition-transform duration-300 ${mobileOpen ? 'rotate-45 translate-y-[5px]' : ''}`} />
            <span className={`block w-full h-px bg-current transition-opacity duration-300 ${mobileOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-full h-px bg-current transition-transform duration-300 ${mobileOpen ? '-rotate-45 -translate-y-[5px]' : ''}`} />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="absolute top-full left-0 right-0 p-6 flex flex-col gap-3 md:hidden"
          style={{ background: 'rgba(10, 11, 18, 0.96)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(91, 58, 140, 0.15)' }}
        >
          {navItems.map(([label, id]) => (
            <button
              key={label}
              onClick={() => scrollTo(id)}
              className="text-left text-[13px] font-medium uppercase tracking-widest text-[var(--slate-400)] hover:text-[var(--lupine-400)] transition-colors duration-300 bg-transparent border-none py-2"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </nav>
  )
}

/* ─── Hero ─── */
function HeroSection() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col justify-center items-center text-center overflow-hidden"
      style={{ padding: '120px 40px 80px' }}
    >
      {/* Radial glow behind hero */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 30%, rgba(46, 58, 135, 0.15) 0%, transparent 70%),
            radial-gradient(ellipse 60% 40% at 70% 60%, rgba(91, 58, 140, 0.1) 0%, transparent 60%),
            radial-gradient(ellipse 40% 30% at 30% 70%, rgba(78, 205, 196, 0.05) 0%, transparent 50%)
          `,
        }}
      />

      {/* Orbit rings */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 700,
          height: 700,
          opacity: 0.12,
        }}
      >
        <div
          className="absolute border border-[var(--lupine-500)] rounded-full"
          style={{
            top: '50%',
            left: '50%',
            width: 300,
            height: 300,
            transform: 'translate(-50%, -50%)',
            animation: 'orbit-spin 20s linear infinite',
          }}
        />
        <div
          className="absolute border border-[var(--lupine-500)] rounded-full"
          style={{
            top: '50%',
            left: '50%',
            width: 500,
            height: 200,
            transform: 'translate(-50%, -50%) rotate(60deg)',
            animation: 'orbit-spin 30s linear infinite reverse',
          }}
        />
        <div
          className="absolute border border-[var(--lupine-500)] rounded-full"
          style={{
            top: '50%',
            left: '50%',
            width: 600,
            height: 250,
            transform: 'translate(-50%, -50%) rotate(-30deg)',
            animation: 'orbit-spin 25s linear infinite',
          }}
        />
      </div>

      {/* Hero content */}
      <div className="relative z-[2] max-w-[900px]">
        <div className="mx-auto mb-10" style={{ width: 80, height: 80, animation: 'hero-logo-in 1.2s cubic-bezier(0.22, 1, 0.36, 1) both' }}>
          <AtomicLogo size={80} />
        </div>

        <div
          className="text-xs font-semibold uppercase tracking-[0.25em] mb-6"
          style={{ color: 'var(--lupine-400)', animation: 'fade-up 0.8s 0.3s both' }}
        >
          Lupine Materials Science
        </div>

        <h1
          className="font-serif font-normal leading-[1.15] mb-7"
          style={{
            fontSize: 'clamp(36px, 5.5vw, 72px)',
            color: 'var(--slate-100)',
            animation: 'fade-up 0.8s 0.5s both',
          }}
        >
          Discover <em className="italic text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, var(--lupine-400), var(--violet-300))' }}>New Materials</em>
          <br />
          Before They Exist
        </h1>

        <p
          className="font-light mx-auto mb-12 leading-relaxed"
          style={{
            fontSize: 18,
            color: 'var(--slate-400)',
            maxWidth: 620,
            animation: 'fade-up 0.8s 0.7s both',
          }}
        >
          The first platform to unify quantum DFT, molecular dynamics, and machine-learned potentials in a single Rust codebase. From electrons to engineering insights — in one command.
        </p>

        <div className="flex gap-4 justify-center" style={{ animation: 'fade-up 0.8s 0.9s both' }}>
          <ScrambleButton href="#contact">Request Investor Briefing</ScrambleButton>
          <ScrambleButton href="#product" variant="secondary">See the Product</ScrambleButton>
        </div>
      </div>

      {/* Iteration counter */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-[3] font-semibold uppercase tracking-[0.18em] text-[11px]"
        style={{
          bottom: 88,
          color: 'var(--lupine-400)',
          opacity: 0.5,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        MgLi Alloy — Permutation <span id="iter-num" className="inline-block min-w-[24px] text-right text-[var(--accent-cyan)]">#1</span>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ bottom: 40, opacity: 0.4, animation: 'pulse-soft 2s ease-in-out infinite' }}
      >
        <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--slate-500)' }}>
          Scroll
        </span>
        <div className="w-px h-12" style={{ background: 'linear-gradient(to bottom, var(--lupine-500), transparent)' }} />
      </div>
    </section>
  )
}

/* ─── Problem ─── */
function ProblemSection() {
  const cards = [
    {
      title: 'Commercially Locked',
      text: 'VASP — the gold-standard quantum solver — is proprietary and expensive. Entire research groups share a single license.',
      stat: '$4,500',
      statLabel: 'Per VASP Academic License',
    },
    {
      title: '30 Years Old',
      text: 'LAMMPS is brilliant but ancient — Fortran-era C++ patterns, no native ML support, GPU acceleration bolted on as an afterthought.',
      stat: '1995',
      statLabel: 'Year LAMMPS was first released',
    },
    {
      title: 'No Integration',
      text: 'The DFT to ML potential to production MD pipeline requires expertise in 4–6 separate packages, each with its own data model and community.',
      stat: '6+',
      statLabel: 'Tools in a typical workflow',
    },
  ]

  return (
    <section id="problem" className="relative" style={{ padding: '120px 40px' }}>
      <div
        className="absolute -inset-x-[100vw] inset-y-0 -z-[1]"
        style={{
          background: 'linear-gradient(180deg, rgba(10,11,18,0.7) 0%, rgba(15,17,25,0.85) 50%, rgba(10,11,18,0.7) 100%)',
        }}
      />

      <div className="max-w-[1200px] mx-auto">
        <Reveal>
          <div className="text-[11px] font-bold uppercase tracking-[0.3em] mb-4" style={{ color: 'var(--lupine-400)' }}>
            The Problem
          </div>
        </Reveal>
        <Reveal>
          <h2
            className="font-serif font-normal leading-[1.25] mb-5"
            style={{ fontSize: 'clamp(28px, 3.5vw, 48px)', color: 'var(--slate-100)' }}
          >
            Materials science runs on
            <br />a fractured toolchain
          </h2>
        </Reveal>
        <Reveal>
          <p className="font-light text-[17px] leading-relaxed mb-16" style={{ color: 'var(--slate-400)', maxWidth: 600 }}>
            Researchers stitch together 4–6 disconnected tools for a single workflow. File conversions lose metadata. Validation is manual. The pipeline is broken.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {cards.map((card, i) => (
            <Reveal key={card.title} delay={i * 0.1}>
              <div
                className="relative rounded-2xl p-10 overflow-hidden transition-all duration-[400ms] group"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  e.currentTarget.style.borderColor = 'rgba(91, 58, 140, 0.2)'
                  e.currentTarget.style.transform = 'translateY(-4px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-[400ms]"
                  style={{ background: 'linear-gradient(90deg, transparent, var(--lupine-600), transparent)' }}
                />
                <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--slate-100)' }}>
                  {card.title}
                </h3>
                <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--slate-400)' }}>
                  {card.text}
                </p>
                <div className="font-serif text-[28px] font-bold" style={{ color: 'var(--lupine-400)' }}>
                  {card.stat}
                </div>
                <div className="text-[11px] uppercase tracking-[0.15em] mt-1" style={{ color: 'var(--slate-500)' }}>
                  {card.statLabel}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Pipeline ─── */
function PipelineSection() {
  const steps = [
    { node: 'DFT', label: 'Quantum DFT', desc: 'VASP-compatible plane-wave PAW calculations', colors: ['rgba(46, 58, 135, 0.3)', 'rgba(46, 58, 135, 0.1)', 'rgba(46, 58, 135, 0.4)'] },
    { node: 'ML', label: 'ML Potentials', desc: 'Train MACE, NequIP, DeePMD from DFT data', colors: ['rgba(91, 58, 140, 0.3)', 'rgba(91, 58, 140, 0.1)', 'rgba(91, 58, 140, 0.4)'] },
    { node: 'MD', label: 'Molecular Dynamics', desc: 'LAMMPS-compatible, billion-atom simulations', colors: ['rgba(78, 205, 196, 0.2)', 'rgba(78, 205, 196, 0.05)', 'rgba(78, 205, 196, 0.3)'] },
    { node: 'D', label: 'Materials Discovery', desc: 'Properties at near-DFT accuracy, 1000× speed', colors: ['rgba(212, 168, 67, 0.2)', 'rgba(212, 168, 67, 0.05)', 'rgba(212, 168, 67, 0.3)'] },
  ]

  const tableRows = [
    ['Plane-wave DFT', 'Yes', '—', 'Yes', 'Yes'],
    ['Classical MD', '—', 'Yes', '—', 'Yes'],
    ['ML potentials (native)', '—', 'Plugin', '—', 'Yes, Core'],
    ['DFT / ML / MD pipeline', '—', '—', '—', 'Yes, one command'],
    ['Differentiable simulation', '—', '—', '—', 'Yes'],
    ['License', 'Commercial', 'GPL', 'GPL', 'Apache 2.0'],
    ['Language', 'Fortran', 'C++', 'Fortran', 'Rust'],
  ]

  return (
    <section id="platform" className="text-center" style={{ padding: '120px 40px' }}>
      <div className="max-w-[1200px] mx-auto">
        <Reveal>
          <div className="text-[11px] font-bold uppercase tracking-[0.3em] mb-4" style={{ color: 'var(--lupine-400)' }}>
            The Platform
          </div>
        </Reveal>
        <Reveal>
          <h2
            className="font-serif font-normal leading-[1.25] mb-5 mx-auto"
            style={{ fontSize: 'clamp(28px, 3.5vw, 48px)', color: 'var(--slate-100)' }}
          >
            From electrons to engineering.
            <br />
            One unified system.
          </h2>
        </Reveal>
        <Reveal>
          <p className="font-light text-[17px] leading-relaxed mb-12 mx-auto" style={{ color: 'var(--slate-400)', maxWidth: 600 }}>
            Lupine replaces the fragmented stack with a single, modern codebase written in Rust — memory-safe, GPU-accelerated, and with ML potentials as a first-class citizen.
          </p>
        </Reveal>

        <Reveal>
          <div className="flex flex-wrap items-center justify-center gap-0 mt-12">
            {steps.map((step, i) => (
              <div key={step.node} className="flex items-center">
                <div className="flex flex-col items-center gap-4 py-8 px-6 min-w-[200px]">
                  <div
                    className="w-20 h-20 rounded-[20px] flex items-center justify-center text-[13px] font-bold uppercase tracking-widest transition-transform duration-300 hover:scale-105"
                    style={{
                      color: 'var(--slate-200)',
                      background: `linear-gradient(135deg, ${step.colors[0]}, ${step.colors[1]})`,
                      border: `1px solid ${step.colors[2]}`,
                    }}
                  >
                    {step.node}
                  </div>
                  <div className="text-[13px] font-semibold tracking-wide" style={{ color: 'var(--slate-200)' }}>
                    {step.label}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--slate-500)', maxWidth: 160 }}>
                    {step.desc}
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className="text-lg px-2" style={{ color: 'var(--slate-600)' }}>
                    &rsaquo;
                  </div>
                )}
              </div>
            ))}
          </div>
        </Reveal>

        {/* Comparison table */}
        <Reveal>
          <div className="overflow-x-auto mt-20 rounded-2xl" style={{ border: '1px solid var(--slate-700)' }}>
            <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--slate-800)' }}>
                  {['Capability', 'VASP', 'LAMMPS', 'Quantum ESPRESSO', 'Lupine'].map((h, i) => (
                    <th
                      key={h}
                      className="text-left px-5 py-4 font-semibold text-[11px] uppercase tracking-widest border-b"
                      style={{
                        color: i === 4 ? 'var(--lupine-300)' : 'var(--slate-300)',
                        background: i === 4 ? 'rgba(46, 58, 135, 0.15)' : undefined,
                        borderColor: 'var(--slate-700)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, ri) => (
                  <tr key={ri} className="hover:bg-white/[0.02] transition-colors">
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className="px-5 py-3.5"
                        style={{
                          color: ci === 0 ? 'var(--slate-300)' : ci === 4 ? 'var(--lupine-200)' : 'var(--slate-400)',
                          fontWeight: ci === 0 || ci === 4 ? 500 : 400,
                          background: ci === 4 ? 'rgba(46, 58, 135, 0.06)' : undefined,
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </section>
  )
}


/* ─── Beachhead / Product ─── */
function BeachheadSection() {
  const atoms = Array.from({ length: 48 }, (_, i) => ({
    id: i,
    delay: `${Math.random() * 3}s`,
    opacity: 0.5 + Math.random() * 0.5,
  }))

  return (
    <section id="product" className="relative" style={{ padding: '120px 40px' }}>
      <div
        className="absolute -inset-x-[100vw] inset-y-0 -z-[1]"
        style={{
          background: 'linear-gradient(180deg, rgba(10,11,18,0.4) 0%, rgba(46, 58, 135, 0.1) 50%, rgba(10,11,18,0.4) 100%)',
        }}
      />

      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <Reveal>
          <div
            className="relative rounded-2xl overflow-hidden flex items-center justify-center"
            style={{
              background: 'var(--slate-800)',
              border: '1px solid var(--slate-700)',
              aspectRatio: '16 / 10',
            }}
          >
            <div
              className="absolute top-4 left-4 text-[10px] font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-md"
              style={{
                color: 'var(--accent-cyan)',
                background: 'rgba(78, 205, 196, 0.1)',
                border: '1px solid rgba(78, 205, 196, 0.2)',
              }}
            >
              &#9679; Live Product
            </div>
            <div className="text-center p-10">
              <div className="grid grid-cols-8 gap-1.5 max-w-[320px] mx-auto">
                {atoms.map((atom) => (
                  <div
                    key={atom.id}
                    className="w-full aspect-square rounded-full"
                    style={{
                      animation: `atom-pulse 3s ease-in-out infinite`,
                      animationDelay: atom.delay,
                      opacity: atom.opacity,
                      background:
                        atom.id % 3 === 0
                          ? 'radial-gradient(circle at 35% 35%, var(--accent-cyan), #1a7a74)'
                          : atom.id % 2 === 0
                            ? 'radial-gradient(circle at 35% 35%, var(--violet-300), var(--violet-700))'
                            : 'radial-gradient(circle at 35% 35%, var(--lupine-400), var(--lupine-700))',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.3em] mb-4" style={{ color: 'var(--lupine-400)' }}>
              Shipping Now
            </div>
            <h3 className="font-serif text-[32px] mb-4" style={{ color: 'var(--slate-100)' }}>
              Lupine <span style={{ color: 'var(--lupine-400)' }}>View</span>
            </h3>
            <p className="text-[15px] leading-relaxed mb-5" style={{ color: 'var(--slate-400)' }}>
              Our beachhead product: a WebGPU-powered molecular visualization platform. Drag a LAMMPS dump file into your browser — get publication-quality 3D in two seconds. No install. No license. No Python scripts.
            </p>
            <ul className="space-y-2.5 my-8">
              {[
                'WebGPU rendering — 10M+ atoms at 60fps',
                'Rust/WASM parsers — 10x faster than JavaScript',
                'SSAO, depth of field, bloom — publication quality',
                'URL sharing — send a link, not a file',
                'Free forever — replaces $$/yr OVITO Pro seats',
                'WebCodecs video export — hardware-accelerated',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm" style={{ color: 'var(--slate-300)' }}>
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--accent-cyan)' }} />
                  {item}
                </li>
              ))}
            </ul>
            <ScrambleButton href="#">Try Lupine View</ScrambleButton>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ─── Research Intelligence ─── */
function ResearchSection() {
  const laws = [
    { name: "Stokes-Einstein Diffusion", r2: "1.000" },
    { name: "Hall-Petch Grain Strengthening", r2: "0.997" },
    { name: "Flory Polymer Scaling", r2: "1.000" },
    { name: "Hertz Contact Mechanics", r2: "1.000" },
    { name: "Vegard's Law (Alloys)", r2: "1.000" },
  ]

  const corpus = [
    { count: 14, label: 'ReaxFF' },
    { count: 13, label: 'HPC' },
    { count: 12, label: 'MLIP' },
    { count: 10, label: 'GPU' },
    { count: 7, label: 'Polymers' },
    { count: 7, label: 'KOKKOS' },
  ]

  const pipeline = [
    { label: 'CORPUS', sub: '60 papers', accent: false },
    { label: 'FETCH', sub: 'CrossRef + arXiv', accent: false },
    { label: 'EXTRACT', sub: '15+ quantities', accent: false },
    { label: 'FIT', sub: '6 algorithms', accent: false },
    { label: 'DISCOVER', sub: 'New equations', accent: true },
  ]

  return (
    <section id="research" className="relative" style={{ padding: '120px 40px' }}>
      <div
        className="absolute -inset-x-[100vw] inset-y-0 -z-[1]"
        style={{
          background: 'linear-gradient(180deg, var(--slate-950) 0%, rgba(91,58,140,0.06) 50%, var(--slate-950) 100%)',
        }}
      />

      <div className="max-w-[1200px] mx-auto">
        <Reveal>
          <div className="text-[11px] font-bold uppercase tracking-[0.3em] mb-4" style={{ color: 'var(--lupine-400)' }}>
            Research Intelligence
          </div>
        </Reveal>
        <Reveal>
          <h2
            className="font-serif font-normal leading-[1.25] mb-5"
            style={{ fontSize: 'clamp(28px, 3.5vw, 48px)', color: 'var(--slate-100)' }}
          >
            Not just simulations.
            <br />
            Autonomous{' '}
            <em
              className="italic text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(135deg, var(--lupine-400), var(--violet-300))' }}
            >
              discovery
            </em>
            .
          </h2>
        </Reveal>
        <Reveal>
          <p className="font-light text-[17px] leading-relaxed mb-16" style={{ color: 'var(--slate-400)', maxWidth: 600 }}>
            The Lupine Distill engine mines published MD research to extract, validate, and discover mathematical relationships — automating what takes researchers months.
          </p>
        </Reveal>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {[
            { num: '60', label: 'Papers Analyzed', sub: '2025–2026 corpus' },
            { num: '15', label: 'Canonical Laws', sub: 'Recovered autonomously' },
            { num: '6', label: 'Fitting Algorithms', sub: 'Linear → Symbolic GP' },
            { num: '49', label: 'Tests Passing', sub: 'Fully verified', cyan: true },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 0.1}>
              <div
                className="rounded-2xl p-8 text-center transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(91, 58, 140, 0.25)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                }}
              >
                <div
                  className="font-serif text-[48px] font-bold"
                  style={{
                    backgroundImage: s.cyan
                      ? 'linear-gradient(135deg, var(--accent-cyan), #2a9d8f)'
                      : 'linear-gradient(135deg, var(--lupine-300), var(--violet-300))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {s.num}
                </div>
                <div className="text-[13px] font-medium mt-1" style={{ color: 'var(--slate-400)' }}>
                  {s.label}
                </div>
                <div className="text-[11px] mt-1" style={{ color: 'var(--slate-500)' }}>
                  {s.sub}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Two column: laws + corpus */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Reveal>
            <div className="rounded-2xl p-9" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] mb-4" style={{ color: 'var(--lupine-400)' }}>
                Canonical Laws Recovered
              </div>
              <p className="text-[13px] leading-relaxed mb-5" style={{ color: 'var(--slate-400)' }}>
                The Distill engine autonomously recovers known physical laws from generated data — validating the fitting pipeline with ground truth before applying it to unknown relationships.
              </p>
              <div className="flex flex-col gap-2">
                {laws.map((law) => (
                  <div
                    key={law.name}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg"
                    style={{ background: 'rgba(46,58,135,0.08)', borderLeft: '3px solid var(--lupine-500)' }}
                  >
                    <span className="text-xs font-semibold flex-1" style={{ color: 'var(--slate-200)' }}>
                      {law.name}
                    </span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded"
                      style={{ color: 'var(--accent-cyan)', background: 'rgba(78,205,196,0.1)' }}
                    >
                      R²={law.r2}
                    </span>
                  </div>
                ))}
                <div className="text-center text-[11px] py-1.5" style={{ color: 'var(--slate-500)' }}>
                  + 10 more canonical relationships
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div className="rounded-2xl p-9" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] mb-4" style={{ color: 'var(--lupine-400)' }}>
                Live Literature Corpus
              </div>
              <p className="text-[13px] leading-relaxed mb-5" style={{ color: 'var(--slate-400)' }}>
                We continuously ingest and analyze the latest MD research — across ReaxFF, MLIP, HPC, GPU acceleration, KOKKOS, and polymer science — to surface quantitative relationships.
              </p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {corpus.map((c, i) => (
                  <div
                    key={c.label}
                    className="rounded-lg p-2.5 text-center"
                    style={{
                      background: i < 3 ? 'rgba(46,58,135,0.12)' : 'rgba(91,58,140,0.12)',
                      border: `1px solid ${i < 3 ? 'rgba(85,101,212,0.2)' : 'rgba(139,107,196,0.2)'}`,
                    }}
                  >
                    <div className="text-lg font-bold" style={{ color: i < 3 ? 'var(--lupine-300)' : 'var(--violet-300)' }}>
                      {c.count}
                    </div>
                    <div className="text-[9px] mt-0.5" style={{ color: 'var(--slate-500)' }}>
                      {c.label}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-3.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <span className="text-2xl font-bold" style={{ color: 'var(--slate-100)' }}>38</span>
                  <span className="text-xs ml-1.5" style={{ color: 'var(--slate-500)' }}>abstracts fetched</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold" style={{ color: 'var(--slate-100)' }}>27</span>
                  <span className="text-xs ml-1.5" style={{ color: 'var(--slate-500)' }}>DOIs indexed</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Pipeline callout */}
        <Reveal>
          <div
            className="mt-12 rounded-2xl p-10 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(46,58,135,0.12), rgba(91,58,140,0.06))',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: 'var(--accent-cyan)' }}>
              The Discovery Pipeline
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {pipeline.map((p, i) => (
                <div key={p.label} className="flex items-center gap-2">
                  <div
                    className="rounded-xl px-5 py-3.5 text-center"
                    style={{
                      background: p.accent ? 'rgba(78,205,196,0.08)' : 'rgba(255,255,255,0.04)',
                      border: p.accent ? '1px solid rgba(78,205,196,0.2)' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div className="text-[11px] font-bold tracking-wider" style={{ color: p.accent ? 'var(--accent-cyan)' : 'var(--slate-200)' }}>
                      {p.label}
                    </div>
                    <div className="text-[9px] mt-0.5" style={{ color: 'var(--slate-500)' }}>
                      {p.sub}
                    </div>
                  </div>
                  {i < pipeline.length - 1 && (
                    <div className="text-base" style={{ color: 'var(--slate-600)' }}>&#8250;</div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[13px] leading-relaxed mt-5 mx-auto" style={{ color: 'var(--slate-400)', maxWidth: 600 }}>
              Written entirely in Rust. No Python. No notebooks.
              <br />
              From raw literature to mathematical discovery in a single binary.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ─── Market ─── */
function MarketSection() {
  const stats = [
    { to: 12, prefix: '$', suffix: 'B', label: 'Simulation Software TAM', detail: 'Scientific computing & CAE by 2028' },
    { to: 300, suffix: 'K+', label: 'LAMMPS Researchers', detail: 'Active users worldwide' },
    { label: 'Unified Platforms', detail: 'DFT + ML + MD in one system', custom: '$0' },
    { to: 100, suffix: 'x', label: 'ML Speedup', detail: 'Near-DFT accuracy, MD speed' },
  ]

  return (
    <section id="market" style={{ padding: '120px 40px' }}>
      <div className="max-w-[1200px] mx-auto">
        <Reveal>
          <div className="text-[11px] font-bold uppercase tracking-[0.3em] mb-4" style={{ color: 'var(--lupine-400)' }}>
            The Market
          </div>
        </Reveal>
        <Reveal>
          <h2
            className="font-serif font-normal leading-[1.25] mb-5"
            style={{ fontSize: 'clamp(28px, 3.5vw, 48px)', color: 'var(--slate-100)' }}
          >
            A sovereign-scale opportunity
          </h2>
        </Reveal>
        <Reveal>
          <p className="font-light text-[17px] leading-relaxed mb-12" style={{ color: 'var(--slate-400)', maxWidth: 600 }}>
            Computational materials science underpins batteries, semiconductors, aerospace alloys, and nuclear materials. Every nation needs this stack.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.1}>
              <div
                className="rounded-2xl p-9 text-center transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  e.currentTarget.style.borderColor = 'rgba(91, 58, 140, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
                }}
              >
                <div
                  className="font-serif text-[40px] font-bold mb-2"
                  style={{
                    backgroundImage: 'linear-gradient(135deg, var(--lupine-300), var(--violet-300))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {s.custom ? (
                    s.custom
                  ) : (
                    <CountUp to={s.to!} prefix={s.prefix} suffix={s.suffix} />
                  )}
                </div>
                <div className="text-[13px] font-medium" style={{ color: 'var(--slate-400)' }}>
                  {s.label}
                </div>
                <div className="text-[11px] mt-1.5" style={{ color: 'var(--slate-500)' }}>
                  {s.detail}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Why Now ─── */
function WhyNowSection() {
  const items = [
    {
      title: 'ML Potentials are proven',
      text: 'MACE, NequIP, and Allegro have demonstrated near-DFT accuracy at classical MD speed. The science is settled — the tooling isn\'t.',
      color: 'var(--lupine-700)',
    },
    {
      title: 'WebGPU is here',
      text: 'Browser-native GPU compute unlocks scientific visualization without install barriers. We\'re the first to bring it to materials science.',
      color: 'var(--violet-700)',
    },
    {
      title: 'Sovereignty demands',
      text: 'Nations are realizing that computational materials infrastructure is strategic. VASP is Austrian-held. The world needs alternatives.',
      color: 'var(--accent-cyan)',
    },
  ]

  return (
    <section style={{ padding: '120px 40px' }}>
      <div className="max-w-[800px] mx-auto text-center">
        <Reveal>
          <div className="text-[11px] font-bold uppercase tracking-[0.3em] mb-4" style={{ color: 'var(--lupine-400)' }}>
            Why Now
          </div>
        </Reveal>
        <Reveal>
          <h2
            className="font-serif font-normal leading-[1.25] mb-12"
            style={{ fontSize: 'clamp(28px, 3.5vw, 48px)', color: 'var(--slate-100)' }}
          >
            Three tailwinds converging
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          {items.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.1}>
              <div className="pt-6" style={{ borderTop: `2px solid ${item.color}` }}>
                <h4 className="text-[15px] mb-2" style={{ color: 'var(--slate-100)' }}>
                  {item.title}
                </h4>
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--slate-400)' }}>
                  {item.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Tech Credibility ─── */
function TechStrip() {
  const techs = [
    { name: 'Rust', sub: 'Memory-safe, zero-cost abstractions' },
    { name: 'WebGPU', sub: 'Native GPU compute in every browser' },
    { name: 'WASM', sub: 'Near-native speed, zero install' },
    { name: 'WGSL', sub: 'GPU shaders for the modern web' },
    { name: 'Apache 2.0', sub: 'Open core, no vendor lock-in' },
  ]

  return (
    <section style={{ padding: '64px 40px' }}>
      <div className="max-w-[1200px] mx-auto">
        <Reveal>
          <div className="text-center mb-9">
            <div className="text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: 'var(--lupine-400)' }}>
              Built On
            </div>
          </div>
        </Reveal>
        <Reveal>
          <div className="flex flex-wrap items-center justify-center gap-12">
            {techs.map((t, i) => (
              <div key={t.name} className="flex items-center gap-12">
                <div className="text-center">
                  <div className="text-xl font-extrabold tracking-wider" style={{ color: 'var(--slate-200)' }}>
                    {t.name}
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: 'var(--slate-500)' }}>
                    {t.sub}
                  </div>
                </div>
                {i < techs.length - 1 && (
                  <div className="w-px h-8 hidden lg:block" style={{ background: 'var(--slate-700)' }} />
                )}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ─── CTA ─── */
function CTASection() {
  return (
    <section
      id="contact"
      className="relative text-center"
      style={{ padding: '160px 40px' }}
    >
      <div
        className="absolute -inset-x-[100vw] inset-y-0 -z-[1]"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(46, 58, 135, 0.12), transparent 70%)',
        }}
      />

      <div className="max-w-[1200px] mx-auto">
        <Reveal>
          <h2
            className="font-serif font-normal leading-[1.25] mb-5"
            style={{ fontSize: 'clamp(32px, 4vw, 56px)', color: 'var(--slate-100)' }}
          >
            Materials infrastructure
            <br />
            is the new frontier.
          </h2>
        </Reveal>
        <Reveal>
          <p className="font-light text-[17px] leading-relaxed mb-10 mx-auto" style={{ color: 'var(--slate-400)', maxWidth: 500 }}>
            We are building the computational engine that will underpin the next generation of batteries, alloys, semiconductors, and advanced materials. If you invest in deep tech, we should talk.
          </p>
        </Reveal>
        <Reveal>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="mailto:founders@lupine.science"
              className="inline-flex items-center gap-2 px-9 py-4 rounded-xl text-[15px] font-semibold text-white no-underline transition-all duration-300 hover:-translate-y-0.5 border border-white/10"
              style={{ background: 'linear-gradient(135deg, var(--lupine-700), var(--lupine-600))' }}
            >
              founders@lupine.science
            </a>
            <ScrambleButton href="#" variant="secondary">
              Download One-Pager
            </ScrambleButton>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ─── Footer ─── */
function LegacyFooter() {
  const columns = [
    {
      title: 'Platform',
      links: ['Architecture', 'ML Potentials', 'WebGPU Compute', 'Why Rust'],
    },
    {
      title: 'Solutions',
      links: ['Solid-State Batteries', 'Aerospace Alloys', 'Defense & Gov'],
    },
    {
      title: 'Company',
      links: ['Vision', 'Sovereignty', 'Investors'],
    },
  ]

  return (
    <footer className="text-center" style={{ padding: '48px 40px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="max-w-[800px] mx-auto">
        <div className="flex flex-wrap justify-center gap-8 mb-10">
          {columns.map((col) => (
            <div key={col.title} className="text-left min-w-[140px]">
              <h4 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--slate-300)' }}>
                {col.title}
              </h4>
              {col.links.map((link) => (
                <a
                  key={link}
                  href="#"
                  className="block text-[13px] mb-2 no-underline transition-colors hover:text-[var(--lupine-400)]"
                  style={{ color: 'var(--slate-500)' }}
                >
                  {link}
                </a>
              ))}
            </div>
          ))}
        </div>
        <p className="text-xs tracking-wider" style={{ color: 'var(--slate-600)' }}>
          <span className="font-semibold" style={{ color: 'var(--slate-500)' }}>
            Lupine Materials Science
          </span>{' '}
          / 2026 / Building the infrastructure for materials discovery
        </p>
      </div>
    </footer>
  )
}

/* ─── Main Landing Page ─── */
function LandingPage() {
  return (
    <div className="relative" style={{ color: 'var(--slate-200)' }}>
      <BootSequence />
      <CustomCursor />

      {/* Fixed background layers */}
      <div style={{ position: 'fixed', inset: 0, background: 'var(--slate-950)', zIndex: -3 }} />
      <AtomCanvas />
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(10, 11, 18, 0.5)',
          zIndex: -1,
          pointerEvents: 'none',
        }}
      />

      <HUDOverlay />
      <LegacyNav />

      <main>
        <HeroSection />
        <ProblemSection />
        <PipelineSection />
        <BeachheadSection />
        <ResearchSection />
        <MarketSection />
        <WhyNowSection />
        <TechStrip />
        <CTASection />
      </main>

      <LegacyFooter />
    </div>
  )
}
