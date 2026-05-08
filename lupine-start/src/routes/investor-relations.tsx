import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Section } from '../components/ui/Section'
import { Card } from '../components/ui/Card'

export const Route = createFileRoute('/investor-relations')({
  component: InvestorRelationsPage,
  head: () => ({
    meta: [
      { title: 'Investor brief — Lupine' },
      { name: 'description', content: 'The audit layer for atomistic ML. Foundation MLIPs are saturating Matbench Discovery at F1 ≈ 0.93 while still failing silently on production trajectories. We measure where, and why, across ≈900 published potentials. Infrastructure, not another foundation model.' },
    ],
  }),
})

function InvestorRelationsPage() {
  return (
    <main className="relative flex-1 bg-[var(--surface)] overflow-hidden">

      {/* Hero Section */}
      <section className="relative pt-[160px] pb-[120px] px-6 lg:px-12 z-10">
        <div className="bg-noise absolute inset-0 z-0" />
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

            <motion.div
              className="lg:col-span-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <div className="mono-label text-[var(--tertiary)] mb-6 tracking-[0.3em]">INVESTOR BRIEF · MAY 2026</div>
              <h1 className="text-5xl lg:text-7xl mb-8 leading-[1.1] text-[var(--on-surface)]">
                The audit layer for <em className="italic text-[var(--primary)] glow-primary">atomistic ML.</em>
              </h1>
              <p className="text-[var(--on-surface-variant)] text-xl md:text-2xl mb-12 max-w-3xl leading-relaxed font-light">
                Foundation MLIPs are saturating Matbench Discovery at F1 ≈ 0.93 while still failing silently on production trajectories. We measure where, and why, across the population of published potentials. Infrastructure, not another foundation model.
              </p>

              <div className="flex gap-6 items-center flex-wrap">
                <Link
                  to="/research"
                  className="px-6 py-3 bg-[var(--primary)] text-[var(--on-primary)] font-display text-sm uppercase tracking-widest hover:opacity-90 transition-opacity no-underline"
                >
                  Read the preprint
                </Link>
                <a
                  href="mailto:alexwelcing@gmail.com?subject=Lupine%20data%20room%20request"
                  className="px-6 py-3 border border-[var(--primary)] text-[var(--primary)] font-display text-sm uppercase tracking-widest hover:bg-[var(--primary)] hover:text-[var(--on-primary)] transition-colors no-underline"
                >
                  Request the data room
                </a>
              </div>
            </motion.div>

            <motion.div
              className="lg:col-span-4 hidden lg:block"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              <div className="glass-panel-elevated p-8 relative overflow-hidden h-full min-h-[320px] flex flex-col justify-center">
                <div className="relative z-10">
                  <div className="mono-label text-[var(--secondary)] mb-6">MANIFEST · MAY 2026</div>
                  <div className="space-y-5">
                    <div className="flex justify-between items-baseline">
                      <span className="mono-label text-[var(--on-surface-variant)] text-[10px]">POTENTIALS AUDITED</span>
                      <span className="font-display text-2xl text-[var(--primary)] glow-primary">≈900</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="mono-label text-[var(--on-surface-variant)] text-[10px]">FUNCTIONAL FAMILIES</span>
                      <span className="font-display text-2xl text-[var(--secondary)]">18</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="mono-label text-[var(--on-surface-variant)] text-[10px]">BENCHMARK RECORDS</span>
                      <span className="font-display text-2xl text-[var(--tertiary)]">7,940</span>
                    </div>
                    <div className="flex justify-between items-baseline pt-4 border-t border-[var(--outline-variant)]">
                      <span className="mono-label text-[var(--on-surface-variant)] text-[10px]">LICENSE</span>
                      <span className="font-display text-base text-[var(--on-surface)]">Apache 2.0</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Thesis pull-quote */}
      <Section bg="light">
        <div className="max-w-4xl mx-auto text-center py-12">
          <span className="mono-label text-[var(--primary)] opacity-60 mb-12 block">Thesis</span>
          <blockquote className="text-3xl md:text-5xl font-serif leading-tight text-[var(--on-surface)] italic">
            "Every Orb, MACE, UMA, and SevenNet user has the same unanswered question: <span className="text-[var(--primary)] glow-primary">when do I trust this?</span> Lupine is the company that answers it."
          </blockquote>
          <div className="mt-16 w-24 h-px bg-gradient-to-r from-transparent via-[var(--outline-variant)] to-transparent mx-auto"></div>
        </div>
      </Section>

      {/* Why now */}
      <Section>
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div>
            <span className="mono-label text-[var(--secondary)] mb-4 block">Why now</span>
            <h2 className="text-4xl">A 12-month <span className="text-[var(--secondary)] italic glow-secondary">trust window</span></h2>
          </div>
          <div className="text-right mono-label text-[var(--on-surface-variant)] max-w-sm">
            Snapshot · May 2026. Eight foundation MLIPs in 18 months; nobody owns the audit layer.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card elevated className="relative overflow-hidden group">
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-[var(--primary)] opacity-10 blur-[40px] rounded-full group-hover:opacity-20 transition-all"></div>
            <div className="font-display text-4xl text-[var(--primary)] mb-2">0.93</div>
            <div className="mono-label text-[var(--on-surface-variant)] mb-6">Matbench F1 plateau</div>
            <p className="text-sm text-[var(--on-surface-variant)] font-light">Top eight foundation MLIPs cluster at F1 = 0.91–0.93. Maintainers themselves note ~97k prototype overlap (sAlex / WBM) — the leaderboard cannot decide the winner.</p>
          </Card>

          <Card elevated className="relative overflow-hidden group">
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-violet-500 opacity-10 blur-[40px] rounded-full group-hover:opacity-20 transition-all"></div>
            <div className="font-display text-4xl text-violet-400 mb-2">$650M+</div>
            <div className="mono-label text-[var(--on-surface-variant)] mb-6">2025 deep-tech capital</div>
            <p className="text-sm text-[var(--on-surface-variant)] font-light">Periodic Labs ($300M seed, a16z), CuspAI ($100M Series A, NEA / Temasek), Orbital Materials ($200M Series B, Radical) — none owns the trust layer.</p>
          </Card>

          <Card elevated className="relative overflow-hidden group">
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-[var(--secondary)] opacity-10 blur-[40px] rounded-full group-hover:opacity-20 transition-all"></div>
            <div className="font-display text-4xl text-[var(--secondary)] mb-2">2024</div>
            <div className="mono-label text-[var(--on-surface-variant)] mb-6">Softening published</div>
            <p className="text-sm text-[var(--on-surface-variant)] font-light">Deng et al., <em>npj Comput. Mater.</em>: universal MLIPs systematically under-predict PES curvature at surfaces, defects, ion-migration barriers. The accuracy/reliability gap is now the field's open problem.</p>
          </Card>

          <Card elevated className="relative overflow-hidden group">
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-[var(--primary)] opacity-10 blur-[40px] rounded-full group-hover:opacity-20 transition-all"></div>
            <div className="font-display text-4xl text-[var(--on-surface)] mb-2">≈900</div>
            <div className="mono-label text-[var(--on-surface-variant)] mb-6">Potentials in our manifest</div>
            <p className="text-sm text-[var(--on-surface-variant)] font-light">OpenKIM, NIST IPR, ColabFit, plus author-distributed MACE-MP, MatterSim, Orb, CHGNet, GAP — de-duplication rule and snapshot date shipped publicly.</p>
          </Card>
        </div>
      </Section>

      {/* TAM framing */}
      <Section bg="light">
        <div className="max-w-4xl mx-auto py-8">
          <span className="mono-label text-[var(--primary)] mb-4 block">Market framing</span>
          <h2 className="text-4xl mb-8">Infrastructure for the downstream</h2>
          <div className="space-y-6 text-lg text-[var(--on-surface-variant)] leading-relaxed">
            <p>
              Pure-play materials informatics is a $170M–$400M market today (MarketsandMarkets / Mordor / Grand View). That is not the prize. The prize is the trillion-dollar downstream — batteries, semiconductors, electrocatalysts, MOFs for direct air capture, rare-earth-free magnets, polymers — all of which now run on MLIP-driven simulation that nobody can quite vouch for.
            </p>
            <p>
              The analog is software observability. Datadog and Splunk did not write the applications they monitor; they wrote the layer that decides whether those applications are safe to run. As the MLIP ecosystem grows, the trust layer compounds in value. We do not have to clear the synthesis bar — the audit layer delivers value entirely upstream of the wet lab.
            </p>
            <p>
              That positioning matters. John Gregoire (Lila Sciences) is right that "there's zero problems we can ever solve in the real world with simulation alone." A trust layer for simulation does not pretend otherwise — it makes the simulation half of the loop honest.
            </p>
          </div>
        </div>
      </Section>

      {/* What we will not pretend */}
      <Section>
        <div className="max-w-4xl mx-auto py-8">
          <span className="mono-label text-[var(--primary)] mb-4 block">Diligence answers</span>
          <h2 className="text-4xl mb-12">What we will not pretend</h2>
          <div className="space-y-8 text-[var(--on-surface-variant)] text-lg leading-relaxed">
            <div>
              <p className="text-[var(--on-surface)] font-medium mb-2">We are not "AlphaFold for materials."</p>
              <p>That phrase died with the Cheetham &amp; Seshadri (2024) and Leeman et al. (2024) critiques of GNoME. It is a marker of unsophistication. We do not use it.</p>
            </div>
            <div>
              <p className="text-[var(--on-surface)] font-medium mb-2">We are not replacing DFT or LAMMPS.</p>
              <p>DFT is the training signal for every modern MLIP. LAMMPS is the integrator MLIPs run inside, via the KIM API and architecture-specific plugins (MACE, NequIP, Allegro, DeePMD). Anyone who claims to "replace" either tells you they have not used either.</p>
            </div>
            <div>
              <p className="text-[var(--on-surface)] font-medium mb-2">We do not solve the sim-to-lab gap.</p>
              <p>John Gregoire (Lila Sciences) is right: zero problems are solved by simulation alone. A trust layer for simulation makes the simulation half of the loop honest. The synthesis half is somebody else's company — Periodic Labs, CuspAI, A-Lab — and the audit layer is more valuable to those companies, not less.</p>
            </div>
            <div>
              <p className="text-[var(--on-surface)] font-medium mb-2">"Hyper-ribbon" is not our coinage.</p>
              <p>Transtrum, Machta &amp; Sethna introduced it in <em>Phys. Rev. E</em> 83, 036701 (2011). We cite it. Failing to cite would be embarrassing — Sethna and Tadmor are likely IMMI reviewers, and OpenKIM is the infrastructure our manifest sits on. The novelty we own is narrower and more durable: cross-potential PCA error-fingerprinting across the full population of published interatomic potentials.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Data Room Access */}
      <Section bg="light">
        <div className="max-w-4xl mx-auto">
          <div className="glass-panel-elevated p-12 md:p-20 relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-[var(--primary)] opacity-5 blur-[80px] rounded-full"></div>
            <div className="relative z-10 text-center">
              <svg className="w-12 h-12 mx-auto text-[var(--primary)] mb-8 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0110 0v4"></path>
              </svg>
              <h2 className="text-4xl italic mb-6">Data room — by request</h2>
              <p className="text-[var(--on-surface-variant)] mb-12 max-w-lg mx-auto leading-relaxed">
                Cap table, full benchmark manifest with snapshot date and de-duplication rule, current pilot scopes, and the cross-potential PCA results behind the IMMI submission. NDA on request.
              </p>
              <div className="flex flex-col md:flex-row gap-4 max-w-md mx-auto">
                <a
                  href="mailto:alexwelcing@gmail.com?subject=Lupine%20data%20room%20request"
                  className="flex-grow px-6 py-4 bg-[var(--primary)] text-[var(--on-primary)] font-display text-sm uppercase tracking-widest hover:opacity-90 transition-opacity text-center no-underline"
                >
                  alexwelcing@gmail.com
                </a>
              </div>

              <div className="mt-16 flex flex-wrap justify-center gap-8 items-center">
                <div className="flex items-center gap-2 mono-label text-[var(--on-surface-variant)] opacity-50">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> NDA on request
                </div>
                <div className="flex items-center gap-2 mono-label text-[var(--on-surface-variant)] opacity-50">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> ITAR-compatible deployment
                </div>
                <div className="flex items-center gap-2 mono-label text-[var(--on-surface-variant)] opacity-50">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0110 0v4"></path></svg> On-prem option
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </main>
  )
}
