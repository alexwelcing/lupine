import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'

export const Route = createFileRoute('/')({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: 'Lupine Materials Science — Open-Source Computational Materials Platform' },
      { name: 'description', content: 'Open-source materials science platform with 559 interatomic potentials, a WebGPU molecular viewer, and autonomous research intelligence. Built in Rust, Apache 2.0.' },
      { property: 'og:title', content: 'Lupine Materials Science' },
      { property: 'og:description', content: 'Open-source materials science platform. 559 potentials. WebGPU viewer. Autonomous research. Built in Rust.' },
      { property: 'og:url', content: 'https://lupine.science/' },
    ],
  }),
})

/* ─── Scroll Reveal ─── */
function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.unobserve(el) } },
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
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `all 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

/* ─── Hero ─── */
function HeroSection() {
  return (
    <section className="relative flex flex-col justify-center items-center text-center px-6 pt-32 pb-20 lg:pt-40 lg:pb-28">
      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 40%, rgba(59,130,246,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-[2] max-w-[780px]">
        <div
          className="text-xs font-semibold uppercase tracking-[0.25em] mb-6"
          style={{ color: 'var(--lupine-400)', animation: 'fade-up 0.8s 0.2s both' }}
        >
          Open-Source Materials Science
        </div>

        <h1
          className="font-serif font-normal leading-[1.12] mb-7"
          style={{
            fontSize: 'clamp(32px, 5vw, 64px)',
            color: 'var(--slate-100)',
            animation: 'fade-up 0.8s 0.4s both',
          }}
        >
          Discover <em className="italic text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, var(--lupine-400), var(--violet-300))' }}>New Materials</em>
          <br />Before They Exist
        </h1>

        <p
          className="font-light mx-auto mb-10 leading-relaxed"
          style={{
            fontSize: 17,
            color: 'var(--slate-400)',
            maxWidth: 560,
            animation: 'fade-up 0.8s 0.6s both',
          }}
        >
          559 interatomic potentials. 15 metals benchmarked. A WebGPU molecular viewer and an autonomous research engine — all in one Rust codebase, Apache 2.0 licensed.
        </p>

        <div className="flex gap-4 justify-center flex-wrap" style={{ animation: 'fade-up 0.8s 0.8s both' }}>
          <Link
            to="/research"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-semibold text-white no-underline transition-all duration-300 hover:-translate-y-0.5 border border-white/10"
            style={{ background: 'linear-gradient(135deg, var(--lupine-700), var(--lupine-600))' }}
          >
            Explore the Research
          </Link>
          <Link
            to="/live"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-semibold no-underline transition-all duration-300 hover:-translate-y-0.5"
            style={{
              color: 'var(--slate-200)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--slate-700)',
            }}
          >
            Live Lab
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ─── Evolution Feature (2nd primary) ─── */
function EvolutionFeature() {
  const stages = [
    { label: 'Organize', desc: 'Typed corpus of claims + literature, 7,940 records.' },
    { label: 'Harden', desc: 'Bootstrap, permutation, matched-n controls — kill artifacts.' },
    { label: 'Evaluate', desc: 'Strict hypothesis lifecycle with a Lean-readiness gate.' },
  ]

  return (
    <section className="relative px-6 py-20 lg:py-24">
      <div
        className="absolute inset-0 -z-[1] pointer-events-none opacity-60"
        style={{
          background:
            'radial-gradient(ellipse 50% 60% at 30% 50%, rgba(139,92,246,0.08), transparent 70%)',
        }}
      />
      <div className="max-w-[1100px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Left column — message */}
          <div className="lg:col-span-7">
            <Reveal>
              <div className="text-[11px] font-bold uppercase tracking-[0.3em] mb-4 text-[var(--violet-300)]">
                The Autonomous Research Engine
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <h2
                className="font-serif font-normal leading-[1.15] mb-6 text-[var(--slate-100)]"
                style={{ fontSize: 'clamp(28px, 3.5vw, 48px)' }}
              >
                The loop that{' '}
                <em
                  className="italic text-transparent bg-clip-text"
                  style={{
                    backgroundImage:
                      'linear-gradient(135deg, var(--lupine-400), var(--violet-300))',
                  }}
                >
                  caught itself.
                </em>
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p
                className="font-light leading-relaxed mb-4 text-[var(--slate-300)]"
                style={{ fontSize: 17, maxWidth: 580 }}
              >
                Five rounds, four days, and the system caught two of its own statistical artifacts
                using the same matched-n bootstrap method — once on a d-band-fullness claim, once
                on a MEAM-anomaly claim. Two different scientific domains, same self-correction
                operator. That is the harden stage doing its job repeatedly.
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <p
                className="font-light leading-relaxed mb-8 text-[var(--slate-400)]"
                style={{ fontSize: 15, maxWidth: 580 }}
              >
                Read the round-by-round trail of how the canonical hypotheses moved, why
                refutations always leave behind a narrower defensible claim, and how this projects
                to a 10⁷-record, thousand-round version under BigQuery + GCP.
              </p>
            </Reveal>
            <Reveal delay={0.4}>
              <div className="flex gap-4 flex-wrap">
                <Link
                  to="/evolution"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-semibold text-white no-underline transition-all duration-300 hover:-translate-y-0.5 border border-white/10"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--violet-600, #7c3aed), var(--lupine-600))',
                  }}
                >
                  Read the Evolution Report
                </Link>
                <Link
                  to="/process"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-semibold no-underline transition-all duration-300 hover:-translate-y-0.5"
                  style={{
                    color: 'var(--slate-200)',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--slate-700)',
                  }}
                >
                  Operating Report
                </Link>
              </div>
            </Reveal>
          </div>

          {/* Right column — three-stage visual */}
          <div className="lg:col-span-5">
            <Reveal delay={0.2}>
              <div
                className="rounded-2xl p-6 lg:p-7"
                style={{
                  background:
                    'linear-gradient(160deg, rgba(139,92,246,0.06), rgba(59,130,246,0.04))',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] mb-5 text-[var(--violet-300)]">
                  The three-stage cycle
                </div>
                <div className="space-y-4">
                  {stages.map((s, i) => (
                    <div
                      key={s.label}
                      className="flex items-start gap-4 pb-4"
                      style={{
                        borderBottom:
                          i < stages.length - 1
                            ? '1px solid rgba(255,255,255,0.05)'
                            : undefined,
                      }}
                    >
                      <div
                        className="font-serif font-bold text-2xl shrink-0 w-10 text-center"
                        style={{ color: 'var(--lupine-400)' }}
                      >
                        {i + 1}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[var(--slate-100)] mb-1">
                          {s.label}
                        </div>
                        <div className="text-[13px] leading-relaxed text-[var(--slate-400)]">
                          {s.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  className="mt-5 pt-5 text-center"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="font-serif text-3xl font-bold text-[var(--lupine-400)] leading-none mb-1">
                    2 / 2
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--slate-500)]">
                    Confounders caught · Same method · Two days
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── Stats Strip ─── */
function StatsStrip() {
  const stats = [
    { value: '559', label: 'Potentials' },
    { value: '15', label: 'Metals Benchmarked' },
    { value: '60+', label: 'Papers Analyzed' },
    { value: 'Apache 2.0', label: 'License' },
  ]

  return (
    <section className="px-6 pb-16">
      <div className="max-w-[1000px] mx-auto">
        <Reveal>
          <div
            className="rounded-2xl p-6 lg:p-8 flex flex-wrap items-center justify-center gap-8 lg:gap-14"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(139,92,246,0.04))',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {stats.map((s) => (
              <div key={s.label} className="text-center min-w-[100px]">
                <div className="font-serif text-2xl font-bold text-[var(--lupine-400)]">{s.value}</div>
                <div className="text-[11px] uppercase tracking-widest mt-1 text-[var(--slate-500)]">{s.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ─── What We Build ─── */
function WhatWeBuild() {
  const pillars = [
    {
      title: 'Potential Atlas',
      desc: '559 interatomic potentials from OpenKIM and NIST IPR. 15 metals benchmarked with 1,677 predictions analyzed.',
      accent: 'var(--lupine-500)',
    },
    {
      title: 'Distill Engine',
      desc: 'Autonomous research intelligence that extracts, validates, and discovers mathematical relationships from 60+ published papers.',
      accent: 'var(--violet-500)',
    },
    {
      title: 'Hyper-Ribbon Geometry',
      desc: 'Our discovery: universal potentials need only capture a small number of orthogonal error modes. Published and peer-reviewed.',
      accent: 'var(--accent-cyan)',
    },
  ]

  return (
    <section className="px-6 py-20 lg:py-28">
      <div className="max-w-[1000px] mx-auto">
        <Reveal>
          <div className="text-[11px] font-bold uppercase tracking-[0.3em] mb-4 text-[var(--lupine-400)]">What We Build</div>
        </Reveal>
        <Reveal>
          <h2 className="font-serif font-normal leading-[1.2] mb-5 text-[var(--slate-100)]" style={{ fontSize: 'clamp(26px, 3vw, 42px)' }}>
            From electrons to engineering.<br />One unified system.
          </h2>
        </Reveal>
        <Reveal>
          <p className="font-light text-base leading-relaxed mb-14 text-[var(--slate-400)]" style={{ maxWidth: 560 }}>
            Lupine replaces the fragmented materials science stack with a single, modern codebase written in Rust — memory-safe, GPU-accelerated, and with ML potentials as a first-class citizen.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.1}>
              <div
                className="rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderTop: `2px solid ${p.accent}`,
                }}
              >
                <h3 className="text-base font-semibold mb-3 text-[var(--slate-100)]">{p.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--slate-400)]">{p.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Why Lupine ─── */
function WhyLupine() {
  const rows = [
    ['WebGPU Visualization', '—', '—', 'Native'],
    ['Potential Database', '—', '—', '559 entries'],
    ['Research Intelligence', '—', '—', 'Automated'],
    ['Browser-based', '—', '—', 'Yes'],
    ['License', 'Commercial', 'GPL', 'Apache 2.0'],
    ['Language', 'Fortran', 'C++', 'Rust'],
  ]

  return (
    <section className="px-6 py-20 lg:py-28">
      <div className="max-w-[900px] mx-auto">
        <Reveal>
          <div className="text-[11px] font-bold uppercase tracking-[0.3em] mb-4 text-[var(--lupine-400)] text-center">Why Lupine</div>
          <h2 className="font-serif font-normal leading-[1.2] mb-12 text-[var(--slate-100)] text-center" style={{ fontSize: 'clamp(26px, 3vw, 42px)' }}>
            Compared to existing tools
          </h2>
        </Reveal>

        <Reveal>
          <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--slate-700)' }}>
            <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--slate-800)' }}>
                  {['Capability', 'VASP', 'LAMMPS', 'Lupine'].map((h, i) => (
                    <th
                      key={h}
                      className="text-left px-5 py-4 font-semibold text-[11px] uppercase tracking-widest border-b"
                      style={{
                        color: i === 3 ? 'var(--lupine-300)' : 'var(--slate-300)',
                        background: i === 3 ? 'rgba(59,130,246,0.1)' : undefined,
                        borderColor: 'var(--slate-700)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className="hover:bg-white/[0.02] transition-colors">
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className="px-5 py-3"
                        style={{
                          color: ci === 0 ? 'var(--slate-300)' : ci === 3 ? 'var(--lupine-300)' : 'var(--slate-500)',
                          fontWeight: ci === 0 || ci === 3 ? 500 : 400,
                          background: ci === 3 ? 'rgba(59,130,246,0.04)' : undefined,
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

/* ─── CTA ─── */
function CTASection() {
  return (
    <section className="relative text-center px-6 py-24 lg:py-32">
      <div
        className="absolute inset-0 -z-[1] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(59,130,246,0.08), transparent 70%)' }}
      />
      <div className="max-w-[600px] mx-auto">
        <Reveal>
          <h2 className="font-serif font-normal leading-[1.2] mb-5 text-[var(--slate-100)]" style={{ fontSize: 'clamp(28px, 3.5vw, 48px)' }}>
            Materials infrastructure<br />is the new frontier.
          </h2>
        </Reveal>
        <Reveal>
          <p className="font-light text-base leading-relaxed mb-10 text-[var(--slate-400)]">
            If you work in computational materials science, aerospace, energy storage, or deep tech investment — we should talk.
          </p>
        </Reveal>
        <Reveal>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="mailto:alexwelcing@gmail.com"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-semibold text-white no-underline transition-all duration-300 hover:-translate-y-0.5 border border-white/10"
              style={{ background: 'linear-gradient(135deg, var(--lupine-700), var(--lupine-600))' }}
            >
              Contact
            </a>
            <Link
              to="/research"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-semibold no-underline transition-all duration-300 hover:-translate-y-0.5"
              style={{
                color: 'var(--slate-200)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--slate-700)',
              }}
            >
              Read the Research
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ─── Main Landing Page ─── */
function LandingPage() {
  return (
    <div className="relative" style={{ color: 'var(--slate-200)' }}>
      <Header />
      <main>
        <HeroSection />
        <EvolutionFeature />
        <StatsStrip />
        <WhatWeBuild />
        <WhyLupine />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
