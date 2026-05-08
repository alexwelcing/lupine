import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'

export const Route = createFileRoute('/')({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: 'Lupine — Geometric error analysis for machine-learned interatomic potentials' },
      { name: 'description', content: 'Lupine is the audit layer for the MLIP ecosystem. We measure where universal interatomic potentials fail, and why, using sloppy-models geometry across ≈900 published potentials and 7,940 benchmark records. Apache 2.0, Rust.' },
      { property: 'og:title', content: 'Lupine — the audit layer for the MLIP ecosystem' },
      { property: 'og:description', content: 'Cross-potential geometric error analysis across ≈900 published interatomic potentials. After Transtrum, Sethna, Tadmor.' },
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

      <div className="relative z-[2] max-w-[820px]">
        <div
          className="text-xs font-semibold uppercase tracking-[0.25em] mb-6"
          style={{ color: 'var(--lupine-400)', animation: 'fade-up 0.8s 0.2s both' }}
        >
          Geometric error analysis · MLIP audit layer
        </div>

        <h1
          className="font-serif font-normal leading-[1.12] mb-7"
          style={{
            fontSize: 'clamp(32px, 5vw, 64px)',
            color: 'var(--slate-100)',
            animation: 'fade-up 0.8s 0.4s both',
          }}
        >
          Universal MLIPs <em className="italic text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, var(--lupine-400), var(--violet-300))' }}>fail silently.</em>
          <br />We measure where, and why.
        </h1>

        <p
          className="font-light mx-auto mb-10 leading-relaxed"
          style={{
            fontSize: 17,
            color: 'var(--slate-400)',
            maxWidth: 620,
            animation: 'fade-up 0.8s 0.6s both',
          }}
        >
          UMA, MACE-MP, Orb-v3, and SevenNet-Omni cluster at F1 ≈ 0.93 on Matbench Discovery and still under-predict PES curvature at surfaces, defects, and migration barriers (Deng et al., <em>npj Comput. Mater.</em> 2024). Lupine is the audit layer that turns that quiet failure into a measured, citable error budget — and a low-dimensional retraining target. The geometry that names the failure is the geometry that fixes it.
        </p>

        <div className="flex gap-4 justify-center flex-wrap" style={{ animation: 'fade-up 0.8s 0.8s both' }}>
          <Link
            to="/research"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-semibold text-white no-underline transition-all duration-300 hover:-translate-y-0.5 border border-white/10"
            style={{ background: 'linear-gradient(135deg, var(--lupine-700), var(--lupine-600))' }}
          >
            Read the IMMI preprint
          </Link>
          <Link
            to="/pilots"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-semibold no-underline transition-all duration-300 hover:-translate-y-0.5"
            style={{
              color: 'var(--slate-200)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--slate-700)',
            }}
          >
            Pilot a wedge
          </Link>
          <a
            href="https://github.com/alexwelcing/lupine"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-semibold no-underline transition-all duration-300 hover:-translate-y-0.5"
            style={{
              color: 'var(--slate-200)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--slate-700)',
            }}
          >
            atlas-distill on GitHub
          </a>
        </div>

        <p
          className="mt-10 mx-auto text-[13px] italic leading-relaxed"
          style={{ color: 'var(--slate-500)', maxWidth: 620, animation: 'fade-up 0.8s 1s both' }}
        >
          "Hyper-ribbons are characterized by a geometric series of widths" — Transtrum, Machta &amp; Sethna, <em>Phys. Rev. E</em> 83, 036701 (2011). We apply that geometry to the population of published interatomic potentials. <Link to="/lineage" className="underline decoration-dotted underline-offset-4 hover:text-[var(--lupine-400)] transition-colors not-italic">See the full lineage →</Link>
        </p>
      </div>
    </section>
  )
}

/* ─── Evolution Feature (2nd primary) ─── */
function EvolutionFeature() {
  const stages = [
    { label: 'Organize', desc: 'Typed corpus of ≈900 potentials and 7,940 benchmark records, with snapshot date and de-duplication rule.' },
    { label: 'Harden', desc: 'Bootstrap, permutation, matched-n controls, Simpson\'s-paradox detection — kill artifacts before they cite.' },
    { label: 'Evaluate', desc: 'Strict hypothesis lifecycle with a Lean-readiness gate, after Frederiksen et al. 2004 and Wen et al. 2017.' },
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
                The harden stage
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
                Across five rounds and four days, the harden stage caught two of its own statistical artifacts using the same matched-n bootstrap method — once on a d-band-fullness claim, once on a MEAM-anomaly claim. Two different domains, same self-correction operator. The MEAM result survived: a participation ratio of 2.24 across 167 potentials, recovering the cross-potential anomaly Hale, Trautt &amp; Becker (2018) reported. The d-band claim did not. That is what the harden stage is for.
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <p
                className="font-light leading-relaxed mb-8 text-[var(--slate-400)]"
                style={{ fontSize: 15, maxWidth: 580 }}
              >
                Read the round-by-round trail of how each canonical hypothesis moved, why refutations always leave behind a narrower defensible claim, and how the same operator extends to a 10⁷-record, thousand-round version of the audit.
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
                  Read the round-by-round trail
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
                  Operating report
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
                  Organize · harden · evaluate
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
                    Confounders caught · same matched-n bootstrap · two days
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
    { value: '≈900', label: 'Potentials in manifest' },
    { value: '18', label: 'Functional-form families' },
    { value: '7,940', label: 'Benchmark records' },
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
      desc: '≈900 published interatomic potentials from OpenKIM, NIST IPR, ColabFit, and author-distributed MLIP releases (MACE-MP, MatterSim, Orb, CHGNet, GAP). Snapshot date and de-duplication rule shipped with every release.',
      accent: 'var(--lupine-500)',
    },
    {
      title: 'atlas-distill engine',
      desc: 'Cross-potential PCA, FIM eigenvalue analysis, bootstrap CIs, and Simpson\'s-paradox detection. Open source, Apache 2.0, written in Rust. Sits beside LAMMPS / ASE / KIM — does not replace them.',
      accent: 'var(--violet-500)',
    },
    {
      title: 'Hyper-ribbon geometry',
      desc: 'After Transtrum, Machta &amp; Sethna (2011) and Frederiksen, Jacobsen, Brown &amp; Sethna (2004). The empirical claim, restated for cross-potential errors: a small number of orthogonal modes account for most of the variance.',
      accent: 'var(--accent-cyan)',
    },
  ]

  return (
    <section className="px-6 py-20 lg:py-28">
      <div className="max-w-[1000px] mx-auto">
        <Reveal>
          <div className="text-[11px] font-bold uppercase tracking-[0.3em] mb-4 text-[var(--lupine-400)]">What we build</div>
        </Reveal>
        <Reveal>
          <h2 className="font-serif font-normal leading-[1.2] mb-5 text-[var(--slate-100)]" style={{ fontSize: 'clamp(26px, 3vw, 42px)' }}>
            A cross-potential view,<br />not another foundation model.
          </h2>
        </Reveal>
        <Reveal>
          <p className="font-light text-base leading-relaxed mb-14 text-[var(--slate-400)]" style={{ maxWidth: 600 }}>
            We do not train a competitor to UMA, Orb, MACE-MP, or SevenNet-Omni. We measure them — together with the long tail of EAM, MEAM, ReaxFF, GAP, NequIP, and DeePMD potentials they are quietly being asked to replace — and write a citable error budget against the customer's own benchmark.
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

/* ─── Audit + Accelerator ─── */
function AuditAccelerator() {
  const moves = [
    {
      label: 'Audit',
      title: 'Localize the failure mode.',
      body: 'Cross-potential PCA returns a participation ratio PR/m well below 1 across ≈900 potentials. The empirical signature of a hyper-ribbon — a low-dimensional ridge of dominant error directions — is the same low-effective-dimensionality signature that a maturing science of deep learning calls a "simple empirical law" of learning (Simon et al., 2026, §2.3, §2.5).',
      accent: 'var(--lupine-400)',
    },
    {
      label: 'Accelerator',
      title: 'Retrain only the modes that matter.',
      body: 'Once the dominant error directions are named, the customer\'s MLIP fine-tune does not have to re-learn everything. Saxe et al. (2014) showed that linear networks acquire singular modes in order of magnitude; Bordelon, Atanasov & Pehlevan (2025) showed that capturing the top modes faster gives improved scaling laws. The hyper-ribbon Lupine measures is the explicit, low-rank target that compresses retraining onto the modes that actually move test loss.',
      accent: 'var(--violet-300)',
    },
    {
      label: 'Compounding',
      title: 'The same data feeds both.',
      body: 'Every audit run adds rows to the manifest. Every manifest row sharpens the ribbon. Every sharper ribbon gives a tighter retraining target — fewer parameters, fewer DFT calls, fewer compute-hours per fine-tune. This is the Datadog-then-DataRobot arc, applied to the science of MLIPs.',
      accent: 'var(--accent-cyan)',
    },
  ]

  return (
    <section className="px-6 py-20 lg:py-28">
      <div className="max-w-[1100px] mx-auto">
        <Reveal>
          <div className="text-[11px] font-bold uppercase tracking-[0.3em] mb-4 text-[var(--lupine-400)]">Audit + accelerator</div>
        </Reveal>
        <Reveal>
          <h2 className="font-serif font-normal leading-[1.2] mb-5 text-[var(--slate-100)]" style={{ fontSize: 'clamp(26px, 3vw, 42px)' }}>
            Learning mechanics for atomistic ML.
          </h2>
        </Reveal>
        <Reveal>
          <p className="font-light text-base leading-relaxed mb-14 text-[var(--slate-400)]" style={{ maxWidth: 700 }}>
            Simon et al. (2026) — <em>There Will Be a Scientific Theory of Deep Learning</em> — name five lines of evidence for an emerging mechanics of learning: solvable settings, simplifying limits, simple empirical laws, hyperparameter disentanglement, and universal phenomena. The hyper-ribbon Lupine measures across published interatomic potentials is one specific instance of the third and fifth: a low-dimensional empirical regularity that recurs across very different systems. That makes the audit layer more than a measurement tool.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {moves.map((m, i) => (
            <Reveal key={m.label} delay={i * 0.08}>
              <div
                className="rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 h-full"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderTop: `2px solid ${m.accent}`,
                }}
              >
                <div className="text-[11px] font-bold uppercase tracking-[0.3em] mb-3" style={{ color: m.accent }}>
                  {m.label}
                </div>
                <h3 className="font-serif text-xl mb-3 text-[var(--slate-100)] italic">{m.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--slate-400)]">{m.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3}>
          <p className="mt-10 text-[13px] italic leading-relaxed text-center text-[var(--slate-500)]" style={{ maxWidth: 760, margin: '40px auto 0' }}>
            "Where mechanistic interpretability aims to be the biology of deep learning, learning mechanics should aspire to be its physics" — Simon et al. (2026). For atomistic ML specifically, that physics is what cross-potential geometry already looks like.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

/* ─── Why Lupine ─── */
function WhyLupine() {
  const rows = [
    ['Trains a new universal potential', 'Yes', 'Yes', 'No'],
    ['Replaces DFT or LAMMPS', 'No', 'No', 'No'],
    ['Cross-potential error manifold', '—', '—', '≈900 potentials'],
    ['Per-trajectory error budget', '—', '—', 'Yes'],
    ['Low-rank retraining target', '—', '—', 'Yes (PR/m < 0.9)'],
    ['Synthesizability claims', '—', '—', 'No (Cheetham & Seshadri 2024)'],
    ['License', 'Closed / Apache 2.0', 'Closed / Apache 2.0', 'Apache 2.0'],
  ]

  return (
    <section className="px-6 py-20 lg:py-28">
      <div className="max-w-[900px] mx-auto">
        <Reveal>
          <div className="text-[11px] font-bold uppercase tracking-[0.3em] mb-4 text-[var(--lupine-400)] text-center">Scope</div>
          <h2 className="font-serif font-normal leading-[1.2] mb-12 text-[var(--slate-100)] text-center" style={{ fontSize: 'clamp(26px, 3vw, 42px)' }}>
            What this is, and what it is not
          </h2>
        </Reveal>

        <Reveal>
          <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--slate-700)' }}>
            <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--slate-800)' }}>
                  {['Capability', 'Foundation MLIPs (UMA, Orb, MACE-MP)', 'Custom DFT-trained MLIPs', 'Lupine'].map((h, i) => (
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

        <Reveal delay={0.1}>
          <p className="mt-8 text-[13px] italic leading-relaxed text-center text-[var(--slate-500)]" style={{ maxWidth: 720, margin: '32px auto 0' }}>
            We do not replace DFT — DFT is the training signal. We do not replace LAMMPS, ASE, or KIM — these are integrators, and our analysis runs alongside them. "Stable on the convex hull" is not "synthesizable" (Cheetham &amp; Seshadri, <em>Chem. Mater.</em> 2024).
          </p>
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
      <div className="max-w-[640px] mx-auto">
        <Reveal>
          <h2 className="font-serif font-normal leading-[1.2] mb-5 text-[var(--slate-100)]" style={{ fontSize: 'clamp(28px, 3.5vw, 48px)' }}>
            Three paths in.
          </h2>
        </Reveal>
        <Reveal>
          <p className="font-light text-base leading-relaxed mb-10 text-[var(--slate-400)]">
            Researchers go to the science. Industry teams pilot a wedge. Investors find us in the footer.
          </p>
        </Reveal>
        <Reveal>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              to="/research"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-semibold text-white no-underline transition-all duration-300 hover:-translate-y-0.5 border border-white/10"
              style={{ background: 'linear-gradient(135deg, var(--lupine-700), var(--lupine-600))' }}
            >
              Read the preprint
            </Link>
            <a
              href="https://github.com/alexwelcing/lupine"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-semibold no-underline transition-all duration-300 hover:-translate-y-0.5"
              style={{
                color: 'var(--slate-200)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--slate-700)',
              }}
            >
              atlas-distill on GitHub
            </a>
            <a
              href="mailto:alexwelcing@gmail.com?subject=Lupine%20pilot"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-semibold no-underline transition-all duration-300 hover:-translate-y-0.5"
              style={{
                color: 'var(--slate-200)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--slate-700)',
              }}
            >
              Pilot with our team
            </a>
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
        <AuditAccelerator />
        <WhyLupine />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
