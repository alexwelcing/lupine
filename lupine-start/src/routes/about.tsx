import { createFileRoute, Link } from '@tanstack/react-router'
import { PageShell } from '../components/ui/PageShell'
import { motion } from 'framer-motion'

export const Route = createFileRoute('/about')({
  component: About,
  head: () => ({
    meta: [
      { title: 'About — Lupine Materials Science' },
      { name: 'description', content: 'Lupine is a unified computational materials science platform combining quantum DFT, ML potentials, and billion-atom MD in a single Rust codebase. Apache 2.0 licensed.' },
      { property: 'og:title', content: 'About — Lupine Materials Science' },
      { property: 'og:description', content: 'From electrons to engineering in one Rust codebase. Open-source. Apache 2.0.' },
      { property: 'og:url', content: 'https://lupine.science/about' },
    ],
  }),
})

const STACK_ITEMS = [
  {
    label: 'Rust + WASM',
    desc: 'Memory-safe, zero-cost abstractions for compute-heavy potential evaluation and binary asset parsing. Compiles to WASM for browser-native performance.',
    accent: 'var(--primary)',
  },
  {
    label: 'WebGPU',
    desc: 'GPU-accelerated rendering for 10M+ atom visualization at 60fps. Publication-quality SSAO, depth of field, and bloom — no install required.',
    accent: 'var(--accent-cyan)',
  },
  {
    label: 'TanStack Start',
    desc: 'Type-safe SSR, file-based routing, and React Query for real-time data. Server functions connect directly to edge APIs.',
    accent: 'var(--violet-500)',
  },
  {
    label: 'Cloudflare Workers',
    desc: 'Edge-deployed APIs on D1 databases. Sub-50ms latency globally. Powers the Live Lab telemetry and autonomous research pipeline.',
    accent: 'var(--secondary)',
  },
]

const MILESTONES = [
  { date: 'Q1 2025', title: 'Hypothesis Engine', desc: 'First autonomous hypothesis generation from OpenKIM benchmark data.' },
  { date: 'Q2 2025', title: 'Hyper-Ribbon Discovery', desc: 'Discovered that IP error manifolds are low-dimensional hyper-ribbons. Preprint published.' },
  { date: 'Q3 2025', title: 'Atlas Viewer v1', desc: 'WebGPU molecular viewer launched. First drag-and-drop LAMMPS visualization in browser.' },
  { date: 'Q1 2026', title: 'Corpus Expansion', desc: '953 potentials, 18 functional-form families, 7,940 benchmark records. Fingerprint hypothesis confirmed at p<0.001.' },
  { date: 'Q2 2026', title: 'GLIM-THINK Swarm', desc: 'Five-agent autonomous research swarm deployed with hourly public broadcasts.' },
]

function About() {
  return (
    <PageShell
      kicker="ABOUT LUPINE"
      title="Materials infrastructure for a sovereign future."
      subtitle="Lupine is a unified computational materials science platform. We combine quantum DFT, machine-learned interatomic potentials, and billion-atom molecular dynamics in a single Rust codebase — from electrons to engineering insights."
      maxWidth="5xl"
    >
      {/* Mission Statement */}
      <section className="mb-16">
        <div className="glass-panel p-8 md:p-12 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-[var(--primary)] opacity-[0.04] blur-[60px] rounded-full" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl mb-6 italic">Why we exist</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[var(--on-surface-variant)] leading-relaxed">
              <div>
                <p className="mb-4">
                  Materials science is stuck. Researchers juggle FORTRAN codes from the 1980s,
                  commercial black boxes that cost $50k/seat, and a fragmented ecosystem of
                  incompatible file formats. Every lab reinvents the same parsing, the same
                  visualization, the same benchmarking pipeline.
                </p>
                <p>
                  Meanwhile, machine-learned interatomic potentials (MLIPs) are transforming
                  what's computationally possible — but they exist as scattered papers with
                  no unified evaluation framework.
                </p>
              </div>
              <div>
                <p className="mb-4">
                  Lupine replaces this fragmented stack with a single, modern codebase written
                  in Rust — memory-safe, GPU-accelerated, and with ML potentials as a
                  first-class citizen. Everything from parsing LAMMPS dump files to running
                  billion-atom simulations to publishing interactive visualizations happens
                  in one unified system.
                </p>
                <p>
                  Every nation needs sovereign materials simulation infrastructure.
                  We're building it in the open, under Apache 2.0.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Stack */}
      <section className="mb-16">
        <div className="mb-8">
          <span className="mono-label text-[var(--secondary)] tracking-[0.3em] block mb-3">TECHNICAL FOUNDATION</span>
          <h2 className="text-3xl">The Stack</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {STACK_ITEMS.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass-panel-elevated p-8 hover:-translate-y-0.5 transition-transform"
              style={{ borderTop: `2px solid ${item.accent}` }}
            >
              <div className="mono-label mb-3" style={{ color: item.accent }}>{item.label}</div>
              <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="mb-16">
        <div className="mb-8">
          <span className="mono-label text-[var(--primary)] tracking-[0.3em] block mb-3">RESEARCH TIMELINE</span>
          <h2 className="text-3xl">Milestones</h2>
        </div>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[18px] top-0 bottom-0 w-px bg-[var(--outline-variant)]" />
          <div className="space-y-8">
            {MILESTONES.map((m, i) => (
              <motion.div
                key={m.date}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="flex gap-6 items-start"
              >
                <div className="relative z-10 flex-shrink-0 w-9 h-9 rounded-full border border-[var(--outline-variant)] bg-[var(--surface)] flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]" />
                </div>
                <div className="glass-panel p-6 flex-1">
                  <span className="mono-label text-[var(--primary)] text-[10px] tracking-widest block mb-1">{m.date}</span>
                  <h3 className="text-lg font-semibold text-[var(--on-surface)] mb-2 not-italic">{m.title}</h3>
                  <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">{m.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section>
        <div className="glass-panel-elevated p-8 md:p-12 text-center relative overflow-hidden">
          <div
            className="absolute inset-0 -z-[1] pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(59,130,246,0.06), transparent 70%)' }}
          />
          <h2 className="text-3xl mb-4">Let's build together.</h2>
          <p className="text-[var(--on-surface-variant)] mb-8 max-w-lg mx-auto">
            If you work in computational materials science, aerospace, energy storage,
            or deep tech — we should talk.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="mailto:alexwelcing@gmail.com"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-semibold text-white no-underline transition-all duration-300 hover:-translate-y-0.5 border border-white/10"
              style={{ background: 'linear-gradient(135deg, var(--lupine-700), var(--lupine-600))' }}
            >
              Contact
            </a>
            <a
              href="https://github.com/alexwelcing/lupine"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-semibold no-underline transition-all duration-300 hover:-translate-y-0.5"
              style={{
                color: 'var(--on-surface)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--outline-variant)',
              }}
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>
    </PageShell>
  )
}
