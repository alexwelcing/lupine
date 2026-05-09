import { createFileRoute } from '@tanstack/react-router'
import { motion, useScroll } from 'framer-motion'
import valueModelData from '../data/value-model.json'
import type { ValueModelData } from '../components/value-model/types'
import { ScrollSection } from '../components/value-model/ScrollSection'
import { SectorUnlockChart } from '../components/value-model/SectorUnlockChart'
import { CapturePctChart } from '../components/value-model/CapturePctChart'
import { DcfScenarioChart } from '../components/value-model/DcfScenarioChart'
import { SensitivityHeatmap } from '../components/value-model/SensitivityHeatmap'
import { CompsScatter } from '../components/value-model/CompsScatter'
import { ReturnsWaterfall } from '../components/value-model/ReturnsWaterfall'
import { Takeaway } from '../components/value-model/Takeaway'
import { HorizonChart } from '../components/value-model/HorizonChart'
import { StackDiagram } from '../components/value-model/StackDiagram'
import { Credo } from '../components/value-model/Credo'

const data = valueModelData as ValueModelData

// In-page anchor nav. IDs match ScrollSection ids below.
const SECTIONS = [
  { id: 'credo', label: 'What we believe' },
  { id: 'arc', label: '30-yr arc' },
  { id: 'stack', label: 'The stack' },
  { id: 'why-now', label: 'Why now' },
  { id: 'math', label: 'The math (floor)' },
  { id: 'ask', label: 'Ask' },
] as const

export const Route = createFileRoute('/')({
  component: HomePage,
  head: () => ({
    meta: [
      { title: 'Lupine Materials Science — the audit substrate for matter' },
      {
        name: 'description',
        content:
          'Step 1 of a real-world Replicator. Lupine builds the audit substrate for the matter stack: trustworthy atomistic prediction, then generative matter, then closed-loop synthesis, then programmable matter — a 30-year arc. Investor math is the floor; platform infrastructure is the ceiling.',
      },
      { property: 'og:title', content: 'Lupine — Step 1 of a real-world Replicator' },
      {
        property: 'og:description',
        content:
          'The audit substrate for atomistic ML. Foundation MLIPs cleared the science bar; the audit layer is what makes the next 30 years of generative matter, autonomous synthesis, and programmable matter trustworthy. We are step 1.',
      },
    ],
  }),
})

function HomePage() {
  const { scrollYProgress } = useScroll()

  // Pre-computed narrative numbers used in section headers + takeaways.
  const proposedPost = data.round.post_money_usd_m
  const checkSize = data.round.check_size_usd_m
  const ownership = data.round.ownership_pct
  const fy30Total = data.sector_unlock.total[4]
  const fy30Rev = data.lupine.revenue_total_m[4]
  const fy30Attributed = data.lupine.attributed_unlock_m[4]
  const fy30Capture = data.lupine.capture_pct[4]
  const baseEv = data.dcf.scenarios.base.enterprise_value
  const baseSafetyPct = (baseEv / proposedPost - 1) * 100
  const simMedian = data.comps.sim_median_ev_rev
  const compImpliedEv = fy30Rev * simMedian
  const sensGrid = data.dcf.sensitivity.grid
  const worstCorner = Math.min(...sensGrid.flat())
  const bestCorner = Math.max(...sensGrid.flat())
  const allClear = sensGrid.flat().every((v) => v > proposedPost)
  const outcomeContribs = data.returns.outcomes.map((o) => ({
    name: o.name,
    p: o.p,
    contrib: o.p * o.exit_m * ownership,
  }))
  const totalEv = data.returns.weighted_ev_on_slice_m
  const upperTail = outcomeContribs
    .filter((o) => o.name === 'Moonshot' || o.name === 'Asymmetric tail')
    .reduce((acc, o) => acc + o.contrib, 0)
  const upperTailPct = (upperTail / totalEv) * 100
  const upperTailProbPct =
    outcomeContribs
      .filter((o) => o.name === 'Moonshot' || o.name === 'Asymmetric tail')
      .reduce((acc, o) => acc + o.p, 0) * 100

  return (
    <main className="relative flex-1 bg-[var(--surface)] text-[var(--on-surface)] overflow-x-hidden">
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#3b82f6] via-[#c4b5fd] to-[#4ecdc4] z-50 origin-left"
        style={{ scaleX: scrollYProgress }}
      />

      <Hero />

      <nav
        aria-label="Section navigation"
        className="sticky top-16 z-30 border-y border-[var(--outline-variant)] bg-[var(--surface)]/90 backdrop-blur-md"
      >
        <div className="container mx-auto max-w-7xl px-6 lg:px-12 flex gap-1 lg:gap-2 overflow-x-auto py-2 text-[10px] lg:text-[11px] font-mono uppercase tracking-widest">
          {SECTIONS.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="whitespace-nowrap px-2 py-1 rounded text-[var(--on-surface-variant)] hover:text-[var(--secondary)] hover:bg-[var(--surface-container-low)] transition-colors no-underline"
            >
              <span className="text-[var(--on-surface-variant-mid)]">
                {String(i + 1).padStart(2, '0')}
              </span>{' '}
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      {/* ============================================================
          01 / Credo — the ideals that drive the rest of the document
          ============================================================ */}
      <ScrollSection id="credo">
        <SectionHeader
          eyebrow="01 / What we believe"
          title={
            <>
              The ideals that{' '}
              <em className="italic text-[var(--secondary)]">
                pull the work
              </em>
              .
            </>
          }
          lead={
            <>
              Before the arc, before the stack, before any math: the
              commitments that tell you what kind of company this is. None
              of them are negotiable. All of them are testable against what
              we actually ship.
            </>
          }
        />
        <Credo data={data} />
      </ScrollSection>

      {/* ============================================================
          02 / The 30-year arc — phases the world is moving through
          ============================================================ */}
      <ScrollSection id="arc" className="bg-[var(--surface-container-low)]">
        <SectionHeader
          eyebrow="02 / Where this is going"
          title={
            <>
              Step 1 of a{' '}
              <em className="italic text-[var(--secondary)]">
                real-world Replicator
              </em>
              .
            </>
          }
          lead={
            <>
              Matter is the last frontier of civilization-scale software.
              Foundation models for matter exist. Self-driving labs are
              shipping. Atomic-precision manufacturing is on a real research
              roadmap. The decade ahead is the convergence — a generation
              that can specify any molecule and have it manifest. Lupine
              builds the audit substrate that lets the higher layers of that
              stack be trusted with reality.
            </>
          }
        />
        <HorizonChart data={data} />
        <Takeaway label="Why phase 1 is the load-bearing one" tone="positive">
          Generative models for matter are roughly where AlphaFold-1 was in
          2018: clearly working, not yet trustworthy. Without a layer that
          names where atomistic predictions fail and feeds those failures
          back into the next generation, phase 2 stacks generative
          hallucination on top of unmeasured prediction error and the whole
          pipeline gets worse, not better. Lupine ships the methodology that
          makes phase 1 trustworthy — and the methodology compounds into
          training signal for every layer above it.
        </Takeaway>
      </ScrollSection>

      {/* ============================================================
          03 / The matter stack — Lupine's structural position
          ============================================================ */}
      <ScrollSection id="stack">
        <SectionHeader
          eyebrow="03 / Where this sits"
          title={
            <>
              We are the{' '}
              <em className="italic text-[var(--secondary)]">
                validation substrate
              </em>{' '}
              for the matter stack.
            </>
          }
          lead={
            <>
              The applications are visible. The generative models are
              fashionable. The compute primitives are 30 years old and
              improving. The audit layer in the middle — the one that catches
              when a foundation model proposes a structure that physics
              rejects, and that compresses the error into corrections — is
              structurally underweight in the current ecosystem. That is the
              layer Lupine ships.
            </>
          }
        />
        <StackDiagram data={data} />
        <Takeaway label="The structural bet" tone="positive">
          Every other layer of the stack has well-funded incumbents racing.
          Validation has none. The Lupine wager is that within 3-5 years the
          field realizes &quot;audit layer for atomistic ML&quot; is its own
          discipline — the way observability became its own discipline for
          software in the 2010s — and the team that ships the canonical
          open-core engine owns the ground floor.
        </Takeaway>
      </ScrollSection>

      {/* ============================================================
          04 / Why now — the convergence is happening this decade
          ============================================================ */}
      <ScrollSection id="why-now" className="bg-[var(--surface-container-low)]">
        <SectionHeader
          eyebrow="04 / Why this is the decade"
          title={
            <>
              Three curves are{' '}
              <em className="italic text-[var(--secondary)]">
                bending at the same time
              </em>
              .
            </>
          }
          lead={
            <>
              Foundation MLIPs cleared the science bar (sub-2 meV/atom on
              broad benchmarks, 2024). WebGPU made browser-native scientific
              compute real (2024-25). Sovereignty became a procurement
              requirement (CHIPS Act $447B fab capex announced through 2030;
              IRA $300B+ committed battery manufacturing). The audit layer
              becomes infrastructure now or never.
            </>
          }
        />
        <div className="grid lg:grid-cols-3 gap-3 mt-2">
          <Curve
            label="Atomistic ML"
            line="MACE → MatterSim → OMat24 → ?"
            note="Foundation MLIPs went from research curiosity to deployable infrastructure in 36 months. The next 36 will move them into production design loops."
          />
          <Curve
            label="Autonomous synthesis"
            line="A-Lab → MGI 2031 → self-driving everywhere"
            note="The Materials Genome Initiative's 20-year mandate (2011-2031) targets the closed-loop transition. We're 6 years from the deadline; the lab equipment exists."
          />
          <Curve
            label="Sovereignty mandate"
            line="CHIPS → IRA → MGI 2025 plan"
            note="$700B+ in announced US capex needs US/allied-licensed materials infrastructure. Vienna-held VASP cannot defensibly serve this buyer base."
          />
        </div>
      </ScrollSection>

      {/* ============================================================
          05 / The math — explicitly framed as the floor, not the ceiling
          ============================================================ */}
      <ScrollSection id="math">
        <SectionHeader
          eyebrow="05 / The math (the floor)"
          title={
            <>
              If you scale us as a 2010s software company,{' '}
              <em className="italic text-[var(--secondary)]">
                this is the conservative shape
              </em>
              .
            </>
          }
          lead={
            <>
              The math below treats Lupine like a vertical SaaS comp —
              Synopsys / Cadence / Veeva — and prices in only the revenue
              that flows from being the audit-and-compute substrate, not the
              upside from being the platform under generative matter or
              autonomous synthesis. Even on this floor, the DCF says{' '}
              <strong className="text-[var(--on-surface)]">
                ${baseEv.toFixed(0)}M intrinsic
              </strong>{' '}
              vs the ${proposedPost}M proposed post (
              <strong className="text-[var(--secondary)]">
                +{baseSafetyPct.toFixed(0)}%
              </strong>{' '}
              margin of safety) and{' '}
              <strong className="text-[var(--secondary)]">
                +{(data.returns.weighted_irr_5y * 100).toFixed(0)}% probability-weighted IRR
              </strong>
              . The ceiling is in the previous two sections.
            </>
          }
        />

        <div className="mt-2">
          <div className="font-mono text-xs uppercase tracking-widest text-[var(--tertiary)] mb-3">
            A · Sector unlock + Lupine attribution
          </div>
          <SectorUnlockChart data={data} />
          <CapturePctChart data={data} />
          <Takeaway label="The math chain in numbers">
            FY30 mid-ramp:{' '}
            <strong className="text-[var(--on-surface)]">${fy30Total.toFixed(0)}B</strong>{' '}
            of accelerated value across the three sectors. Lupine touches{' '}
            <strong className="text-[var(--on-surface)]">
              {data.lupine.penetration_pct[4].toFixed(1)}%
            </strong>{' '}
            of the edge, attributing{' '}
            <strong className="text-[var(--on-surface)]">
              ${(fy30Attributed / 1000).toFixed(1)}B
            </strong>{' '}
            of unlock; revenue ${fy30Rev.toFixed(0)}M ({fy30Capture.toFixed(1)}%
            capture, the Synopsys/Cadence band).
          </Takeaway>
        </div>

        <div className="mt-12">
          <div className="font-mono text-xs uppercase tracking-widest text-[var(--tertiary)] mb-3">
            B · DCF intrinsic + sensitivity
          </div>
          <DcfScenarioChart data={data} />
          <SensitivityHeatmap data={data} />
          <Takeaway
            label={allClear ? 'Every WACC × g cell clears the proposed post' : 'Some cells breach the post'}
            tone={allClear ? 'positive' : 'caution'}
          >
            Equity value across the 25-cell sensitivity grid spans{' '}
            <strong className="text-[var(--on-surface)]">${worstCorner.toFixed(0)}M</strong>{' '}
            (worst) to{' '}
            <strong className="text-[var(--on-surface)]">${bestCorner.toFixed(0)}M</strong>{' '}
            (best).{' '}
            {allClear &&
              `The worst case is still +${((worstCorner / proposedPost - 1) * 100).toFixed(0)}% over the $${proposedPost}M proposed post.`}
          </Takeaway>
        </div>

        <div className="mt-12">
          <div className="font-mono text-xs uppercase tracking-widest text-[var(--tertiary)] mb-3">
            C · Comp set cross-check + probability-weighted returns
          </div>
          <CompsScatter data={data} />
          <ReturnsWaterfall data={data} />
          <Takeaway label="Where the IRR comes from" tone="positive">
            At sim median {simMedian.toFixed(1)}x EV/Revenue, FY30 base ARR
            implies ${compImpliedEv.toFixed(0)}M EV — {(compImpliedEv / baseEv).toFixed(1)}×
            the DCF base. The Moonshot + Asymmetric tail outcomes (combined{' '}
            {upperTailProbPct.toFixed(0)}% probability) contribute{' '}
            {upperTailPct.toFixed(0)}% of the weighted EV; the 50% probability
            of zero is fully baked in.
          </Takeaway>
        </div>
      </ScrollSection>

      {/* ============================================================
          06 / Ask
          ============================================================ */}
      <ScrollSection id="ask" className="bg-[var(--surface-container-low)]">
        <SectionHeader
          eyebrow="06 / The ask"
          title={
            <>
              Seed{' '}
              <em className="italic text-[var(--secondary)]">
                ${checkSize}M
              </em>{' '}
              at ${proposedPost}M post — to ship the audit substrate.
            </>
          }
          lead={
            <>
              The capital funds the engineering and the methodology
              publications that make phase 1 trustworthy. The milestones are
              the markers that we&apos;re actually building toward the arc,
              not just the math.
            </>
          }
        />
        <div className="mt-6 grid md:grid-cols-3 gap-3">
          {[
            {
              mo: 12,
              what: 'Federal direct contract in flight',
              unlocks:
                'Non-dilutive runway + the credibility marker that lets us be cited as named tooling in DARPA / DOE / NSF proposals',
            },
            {
              mo: 18,
              what: 'Two paid pilots converted to production',
              unlocks:
                'First $750K-$1.5M ACV recurring + named industry references; signal that the audit layer is procurement-grade',
            },
            {
              mo: 24,
              what: 'DFT engine alpha + open benchmark published',
              unlocks:
                'Closes the unified DFT → ML → MD pipeline; the open benchmark becomes the canonical place to compare foundation MLIPs and the methodology paper compounds the IP',
            },
          ].map((m, i) => (
            <motion.div
              key={m.mo}
              className="rounded-md border border-[var(--outline-variant)] p-5 bg-[var(--surface-container)] flex flex-col gap-2"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-15% 0px' }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.12 }}
            >
              <div className="text-xs uppercase tracking-wider text-[var(--on-surface-variant-mid)]">
                Month {m.mo}
              </div>
              <div className="text-base text-[var(--on-surface)] font-medium">
                {m.what}
              </div>
              <div className="text-xs text-[var(--on-surface-variant)] leading-relaxed pt-1 border-t border-[var(--outline-variant)]/60">
                <span className="font-mono uppercase tracking-wider text-[var(--secondary)] text-[10px]">
                  Unlocks &nbsp;
                </span>
                {m.unlocks}
              </div>
            </motion.div>
          ))}
        </div>
        <Takeaway label="What this round is actually buying" tone="positive">
          The 24-month plan is to ship phase 1 — the audit substrate that
          phases 2-4 depend on — with peer-reviewed methodology, an open
          benchmark, and a federal-grade reference deployment. The math
          floor (${baseEv.toFixed(0)}M DCF intrinsic, +
          {(data.returns.weighted_irr_5y * 100).toFixed(0)}% weighted IRR) is
          what happens if Lupine becomes a respectable software-of-record
          company. The ceiling is what happens if it becomes infrastructure
          for the matter stack.
        </Takeaway>
      </ScrollSection>

      <footer className="px-6 lg:px-12 py-12 text-xs text-[var(--on-surface-variant-mid)] font-mono border-t border-[var(--outline-variant)]">
        <div className="container mx-auto max-w-7xl">
          Generated {data.generated_on}. Source of truth:{' '}
          <code>business-plan/value-model/*.csv</code>. Regenerate with{' '}
          <code>python3 business-plan/scripts/analyze.py</code>.
        </div>
      </footer>
    </main>
  )
}

function Hero() {
  return (
    <section className="relative pt-[160px] pb-[120px] px-6 lg:px-12 overflow-hidden">
      {/* Ambient backdrop: a slow-rotating lattice gradient evoking
          atomic structure, brand-tinted. */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(78,205,196,0.10),transparent_60%)]"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(196,181,253,0.08),transparent_55%)]"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="container mx-auto max-w-7xl relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--tertiary)] mb-6">
            Lupine Materials Science · audit substrate for the matter stack
          </div>
          <h1 className="text-5xl lg:text-7xl mb-8 leading-[1.02] max-w-5xl">
            Step 1 of a real-world{' '}
            <em className="italic text-[var(--secondary)]">Replicator</em>.
          </h1>
          <p className="text-xl text-[var(--on-surface-variant)] max-w-4xl leading-relaxed font-light mb-6">
            Matter is the last frontier of civilization-scale software.
            Foundation models for matter exist now. Self-driving labs are
            shipping. Atomic-precision manufacturing is on a real research
            roadmap. The decade ahead is the convergence — a generation that
            can specify any molecule and have it manifest.
          </p>
          <p className="text-xl text-[var(--on-surface)] max-w-4xl leading-relaxed font-light mb-10">
            Lupine builds the{' '}
            <strong className="text-[var(--secondary)]">audit substrate</strong>{' '}
            for that stack — the methodology that names where atomistic
            predictions fail, and compresses the failure into closed-loop
            self-correction. Without it, every layer above stacks
            hallucination on top of unmeasured error.{' '}
            <span className="text-[var(--on-surface-variant)]">
              We are step 1.
            </span>
          </p>

          {/* Bridge into the credo: tells the reader the next thing
              they will see is what we believe, before any math. */}
          <a
            href="#credo"
            className="inline-flex items-baseline gap-3 mb-12 group no-underline"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--tertiary)] group-hover:text-[var(--secondary)] transition-colors">
              Start with the ideals
            </span>
            <span className="text-[var(--tertiary)] group-hover:text-[var(--secondary)] transition-colors">
              ↓
            </span>
          </a>

          <div className="flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.2em]">
            <HorizonChip label="Phase 1 · 2025-2030" highlight>Trustworthy prediction</HorizonChip>
            <HorizonChip label="Phase 2 · 2028-2034">Generative matter</HorizonChip>
            <HorizonChip label="Phase 3 · 2032-2042">Closed-loop synthesis</HorizonChip>
            <HorizonChip label="Phase 4 · 2040-2055">Programmable matter</HorizonChip>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function Curve({
  label,
  line,
  note,
}: {
  label: string
  line: string
  note: string
}) {
  return (
    <motion.div
      className="rounded-md border border-[var(--outline-variant)] bg-[var(--surface-container)] p-5 flex flex-col gap-3"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-15% 0px' }}
      transition={{ duration: 0.5 }}
    >
      <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--secondary)]">
        {label}
      </div>
      <div className="text-sm font-mono text-[var(--on-surface)] leading-snug">
        {line}
      </div>
      <div className="text-sm text-[var(--on-surface-variant)] leading-relaxed">
        {note}
      </div>
    </motion.div>
  )
}

function HorizonChip({
  label,
  children,
  highlight = false,
}: {
  label: string
  children: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div
      className="rounded border px-3 py-2 flex flex-col gap-0.5"
      style={{
        borderColor: highlight ? '#4ecdc4' : 'var(--outline-variant)',
        background: highlight
          ? 'linear-gradient(135deg, rgba(78,205,196,0.16), rgba(78,205,196,0.04))'
          : 'var(--surface-container)',
      }}
    >
      <span
        style={{
          color: highlight ? '#4ecdc4' : 'var(--on-surface-variant-mid)',
        }}
      >
        {label}
      </span>
      <span className="text-[12px] tracking-normal normal-case font-sans text-[var(--on-surface)] font-medium">
        {children}
      </span>
    </div>
  )
}

function SectionHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string
  title: React.ReactNode
  lead: React.ReactNode
}) {
  return (
    <div className="mb-12 max-w-4xl">
      <div className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--tertiary)] mb-4">
        {eyebrow}
      </div>
      <h2 className="text-4xl lg:text-5xl mb-6 leading-[1.1] text-[var(--on-surface)]">
        {title}
      </h2>
      <p className="text-lg text-[var(--on-surface-variant)] leading-relaxed font-light">
        {lead}
      </p>
    </div>
  )
}
