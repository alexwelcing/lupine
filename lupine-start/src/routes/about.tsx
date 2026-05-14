import { createFileRoute } from '@tanstack/react-router'
import { PageShell } from '../components/ui/PageShell'
export const Route = createFileRoute('/about')({
  component: About,
  head: () => ({
    meta: [
      { title: 'About — Lupine' },
      { name: 'description', content: 'Lupine is the audit layer for the MLIP ecosystem. Cross-potential geometric error analysis across ≈900 published interatomic potentials. After Transtrum, Sethna, Tadmor. Apache 2.0.' },
      { property: 'og:title', content: 'About — Lupine' },
      { property: 'og:description', content: 'The audit layer for atomistic ML. Cross-potential geometric error analysis. Apache 2.0.' },
      { property: 'og:url', content: 'https://lupine.science/about' },
    ],
  }),
})

const STACK_ITEMS = [
  {
    label: 'Rust + WASM',
    desc: 'Memory-safe, deterministic builds for the audit engine. A single static binary deploys cleanly into air-gapped environments — bit-identical from one build to the next.',
    accent: 'var(--primary)',
  },
  {
    label: 'WebGPU',
    desc: 'For inspection of the cross-potential error manifold, not for the MD hot path. Researchers explore eigenvalue spectra, MEAM-outlier loadings, and per-property residuals at interactive frame rates.',
    accent: 'var(--accent-cyan)',
  },
  {
    label: 'TanStack Start',
    desc: 'Type-safe SSR, file-based routing. The marketing site, the manifest browser, and the research console share a single codebase.',
    accent: 'var(--violet-500)',
  },
  {
    label: 'Cloudflare Workers',
    desc: 'Edge-deployed APIs on D1 for the public manifest ledger. Single-tenant VPC and air-gapped deployments are static-binary installs, no Workers dependency.',
    accent: 'var(--secondary)',
  },
]

const MILESTONES = [
  { date: 'Q1 2025', title: 'First cross-potential PCA', desc: 'Initial corpus, OpenKIM ingestion, hyper-ribbon classifier patterned on Transtrum, Machta & Sethna (2011).' },
  { date: 'Q2 2025', title: 'IMMI submission', desc: 'Cross-potential PCA error analysis preprint. 559-potential corpus.' },
  { date: 'Q3 2025', title: 'Atlas Viewer v1', desc: 'WebGPU exploration of the error manifold. Drag-and-drop LAMMPS trajectories alongside the audit, in-browser.' },
  { date: 'Q1 2026', title: 'Corpus expansion', desc: '953 potentials, 18 functional-form families, 7,940 benchmark records. Fingerprint significant at p<0.001 globally; ribbon survives orthogonalization.' },
  { date: 'Q2 2026', title: 'Harden stage in production', desc: 'Five-agent harden swarm deployed; caught two of its own statistical artifacts (one survived, one did not). Snapshot + de-dup rule shipped with every release.' },
]

function About() {
  return (
    <PageShell
      kicker="ABOUT LUPINE"
      title="Applied learning mechanics for atomistic ML."
      subtitle="Lupine measures where machine-learned interatomic potentials fail, and why, across the population of published potentials — and the cross-potential geometry that names the failure doubles as a low-rank retraining target. We do not train another foundation MLIP. We sit beside the integrators (LAMMPS, ASE, KIM) the customer already trusts, write a citable error budget, and hand the model team the modes that matter."
      maxWidth="5xl"
    >
      {/* Mission Statement */}
      <section className="mb-16">
        <div className="glass-panel p-8 md:p-12 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-[var(--primary)] opacity-[0.04] blur-[60px] rounded-full" />
          <div className="relative z-10">
            <h2 className="font-display tracking-tight text-4xl lg:text-5xl mb-12 leading-[1.05] text-[var(--on-surface)]">Why we exist</h2>
            
            <div className="mb-12 md:pl-8 border-l-4 border-[var(--primary-container)] py-2">
              <p className="font-serif italic text-2xl md:text-3xl lg:text-4xl text-[var(--on-surface)] leading-snug tracking-tight max-w-3xl">
                "The field has gotten very good at training universal potentials, and is still bad at telling the user when to trust one. That is the gap."
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 text-lg text-[var(--on-surface-variant)] leading-relaxed">
              <div>
                <p className="mb-6">
                  <span className="font-display text-4xl float-left mr-3 leading-none text-[var(--primary)] mt-1">U</span>niversal MLIPs have plateaued. UMA, MACE-MP, Orb, and SevenNet-Omni cluster at F1 ≈ 0.93 on Matbench Discovery. The leaderboard maintainers themselves note ~97k prototype overlap between sAlex and the WBM test set, and Deng et al. (<em className="font-serif text-[var(--on-surface)]">npj Comput. Mater.</em> 2024) showed that low test MAE does not prevent systematic PES softening at surfaces, defects, and migration barriers.
                </p>
              </div>
              <div>
                <p className="mb-6">
                  Lupine is the audit layer. Cross-potential PCA, FIM eigenvalue analysis, bootstrap CIs, and Simpson's-paradox detection across ≈900 published potentials — including the universal ones — interpreted through the sloppy-models geometric framework of Transtrum, Machta &amp; Sethna (2011) and the Bayesian-ensemble lineage of Frederiksen, Jacobsen, Brown &amp; Sethna (2004).
                </p>
                <p className="mb-6">
                  Read alongside Simon, Kunin, Atanasov et al. (arXiv:2604.21691, 2026) — <em className="font-serif text-[var(--on-surface)]">There Will Be a Scientific Theory of Deep Learning</em> — the same artifact is also a low-rank retraining target. The cross-potential ribbon is the empirical mark of a learnable system: the small number of error modes that any next fine-tune actually needs to capture.
                </p>
                <p>
                  We do not replace DFT, LAMMPS, or any MLIP. We measure where each MLIP is unsafe to extrapolate, write that out as a citable error budget, and hand the customer's model team the modes that matter. We are building the trust layer in the open, under Apache 2.0.
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
          <h2 className="font-display tracking-tight text-4xl lg:text-5xl mb-6 leading-[1.05] text-[var(--on-surface)]">The stack</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {STACK_ITEMS.map((item, i) => (
            <div
              key={item.label}
              className="glass-panel-elevated p-8 hover:-translate-y-0.5 transition-transform"
              style={{ borderTop: `2px solid ${item.accent}` }}
            >
              <div className="mono-label mb-3" style={{ color: item.accent }}>{item.label}</div>
              <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="mb-16">
        <div className="mb-8">
          <span className="mono-label text-[var(--primary)] tracking-[0.3em] block mb-3">RESEARCH TIMELINE</span>
          <h2 className="font-display tracking-tight text-4xl lg:text-5xl mb-6 leading-[1.05] text-[var(--on-surface)]">Milestones</h2>
        </div>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[18px] top-0 bottom-0 w-px bg-[var(--outline-variant)]" />
          <div className="space-y-8">
            {MILESTONES.map((m, i) => (
              <div
                key={m.date}
                className="flex gap-6 items-start"
              >
                <div className="relative z-10 flex-shrink-0 w-9 h-9 rounded-md border border-[var(--outline-variant)] bg-[var(--surface)] flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]" />
                </div>
                <div className="glass-panel p-6 flex-1">
                  <span className="mono-label text-[var(--primary)] text-[10px] tracking-widest block mb-1">{m.date}</span>
                  <h3 className="text-lg font-semibold text-[var(--on-surface)] mb-2 not-italic">{m.title}</h3>
                  <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">{m.desc}</p>
                </div>
              </div>
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
          <h2 className="font-display tracking-tight text-4xl lg:text-5xl mb-6 leading-[1.05] text-[var(--on-surface)]">Three paths in.</h2>
          <p className="text-[var(--on-surface-variant)] mb-8 max-w-lg mx-auto">
            Researchers go to the science. Industry teams pilot a wedge — solid-state electrolytes, Ni-base superalloys, catalysis. Investors find us in the footer.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="mailto:alexwelcing@gmail.com"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-md text-[14px] font-semibold text-white no-underline transition-all duration-300 hover:-translate-y-0.5 border border-white/10"
              style={{ background: 'linear-gradient(135deg, var(--lupine-700), var(--lupine-600))' }}
            >
              Contact
            </a>
            <a
              href="https://github.com/alexwelcing/lupine"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-md text-[14px] font-semibold no-underline transition-all duration-300 hover:-translate-y-0.5"
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
