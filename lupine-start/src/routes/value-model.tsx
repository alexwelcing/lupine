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

const data = valueModelData as ValueModelData

// Section IDs match the ScrollSection `id` props below; keep in sync.
const SECTIONS = [
  { id: 'sector-unlock', label: 'Sector unlock' },
  { id: 'capture', label: 'Capture %' },
  { id: 'dcf', label: 'DCF' },
  { id: 'sensitivity', label: 'Sensitivity' },
  { id: 'comps', label: 'Comps' },
  { id: 'returns', label: 'Returns' },
  { id: 'ask', label: 'Ask' },
] as const

export const Route = createFileRoute('/value-model')({
  component: ValueModelPage,
  head: () => ({
    meta: [
      { title: 'Value model — Lupine' },
      {
        name: 'description',
        content:
          'Animated longform analysis of the Lupine investment thesis: $151B/yr 2030 sector unlock across compute, travel, and bio. Bottom-up DCF, sensitivity heatmap, comp set, probability-weighted returns. Numbers regenerable from business-plan/value-model/*.csv.',
      },
    ],
  }),
})

function ValueModelPage() {
  const { scrollYProgress } = useScroll()

  return (
    <main className="relative flex-1 bg-[var(--surface)] text-[var(--on-surface)] overflow-x-hidden">
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#3b82f6] via-[#c4b5fd] to-[#4ecdc4] z-50 origin-left"
        style={{ scaleX: scrollYProgress }}
      />

      <Hero data={data} />

      {/* In-page anchor nav — sticky once you scroll past the hero. */}
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

      <ScrollSection id="sector-unlock" className="bg-[var(--surface-container-low)]">
        <SectionHeader
          eyebrow="01 / Sector value unlock"
          title={
            <>
              Three sectors gate on{' '}
              <em className="italic text-[var(--secondary)]">materials acceleration</em>.
            </>
          }
          lead={
            <>
              We size the opportunity bottom-up, not as a software-seat TAM. By
              2030 the annual economic value of accelerated materials
              qualification across compute, travel, and bio reaches{' '}
              <strong className="text-[var(--on-surface)]">
                ~${data.sector_unlock.total[4].toFixed(0)}B/yr
              </strong>
              , growing to{' '}
              <strong className="text-[var(--on-surface)]">
                ${data.sector_unlock.total[6].toFixed(0)}B/yr
              </strong>{' '}
              by FY32.
            </>
          }
        />
        <SectorUnlockChart data={data} />
        <FootnoteRow
          items={[
            {
              label: 'Compute',
              value: `$${data.sector_unlock.compute[4].toFixed(0)}B/yr 2030`,
              note: 'CHIPS Act, EUV resist, 2D channels, advanced packaging',
            },
            {
              label: 'Travel',
              value: `$${data.sector_unlock.travel[4].toFixed(0)}B/yr 2030`,
              note: 'IRA battery capex, solid-state, Si anode, eVTOL, AM qual',
            },
            {
              label: 'Bio',
              value: `$${data.sector_unlock.bio[4].toFixed(0)}B/yr 2030`,
              note: 'Cell-therapy scaffolds, drug delivery, LNP, synbio, ag',
            },
          ]}
        />
      </ScrollSection>

      <ScrollSection id="capture">
        <SectionHeader
          eyebrow="02 / Lupine attribution"
          title={
            <>
              Capture rate converges to{' '}
              <em className="italic text-[var(--secondary)]">2-3% mature</em>.
            </>
          }
          lead={
            <>
              Lupine isn't the entire opportunity — it is the engine that
              compresses the bottleneck. As penetration ramps from{' '}
              {data.lupine.penetration_pct[0]}% to {data.lupine.penetration_pct[6]}% of edge
              materials simulation, revenue scales with attributed unlock and
              capture rate settles in the band Synopsys / Cadence earn against
              semi design productivity.
            </>
          }
        />
        <CapturePctChart data={data} />
      </ScrollSection>

      <ScrollSection id="dcf" className="bg-[var(--surface-container-low)]">
        <SectionHeader
          eyebrow="03 / DCF intrinsic value"
          title={
            <>
              Base case{' '}
              <em className="italic text-[var(--secondary)]">
                ${data.dcf.scenarios.base.enterprise_value.toFixed(0)}M
              </em>{' '}
              vs ${data.round.post_money_usd_m}M proposed post.
            </>
          }
          lead={
            <>
              Mid-year discount, 7-year projection, Gordon-growth terminal.
              Bear/base/bull WACCs span {(data.dcf.scenarios.bull.wacc * 100).toFixed(1)}%–
              {(data.dcf.scenarios.bear.wacc * 100).toFixed(1)}%. Margin of safety vs
              proposed post in base case:{' '}
              <strong className="text-[var(--secondary)]">
                +
                {(
                  (data.dcf.scenarios.base.enterprise_value /
                    data.round.post_money_usd_m -
                    1) *
                  100
                ).toFixed(1)}
                %
              </strong>
              .
            </>
          }
        />
        <DcfScenarioChart data={data} />
      </ScrollSection>

      <ScrollSection id="sensitivity">
        <SectionHeader
          eyebrow="04 / Sensitivity"
          title={
            <>
              The asymmetry holds across the{' '}
              <em className="italic text-[var(--secondary)]">±2% WACC band</em>.
            </>
          }
          lead={
            <>
              Equity value at varying WACC × terminal growth on the base-case
              FCFs. Even the worst grid corner (highest WACC, lowest g) clears
              the proposed post-money. Center cell (highlighted) is the
              model's actual base case.
            </>
          }
        />
        <SensitivityHeatmap data={data} />
      </ScrollSection>

      <ScrollSection id="comps" className="bg-[var(--surface-container-low)]">
        <SectionHeader
          eyebrow="05 / Comparable companies"
          title={
            <>
              At the simulation comp median{' '}
              <em className="italic text-[var(--secondary)]">
                {data.comps.sim_median_ev_rev.toFixed(1)}x
              </em>
              , FY30 base ARR implies ~$
              {(data.lupine.revenue_total_m[4] * data.comps.sim_median_ev_rev).toFixed(0)}M EV.
            </>
          }
          lead={
            <>
              Lupine projects into the engineering-simulation cluster
              (Synopsys, Cadence, ANSYS, Altair, Veeva), not the AI-for-bio
              premium cluster. The cross-check on the DCF: at FY30 base ARR
              applied at sim median, implied EV = $
              {(data.lupine.revenue_total_m[4] * data.comps.sim_median_ev_rev).toFixed(0)}M, in
              the same neighborhood as the DCF base ($
              {data.dcf.scenarios.base.enterprise_value.toFixed(0)}M).
            </>
          }
        />
        <CompsScatter data={data} />
      </ScrollSection>

      <ScrollSection id="returns">
        <SectionHeader
          eyebrow="06 / Probability-weighted returns"
          title={
            <>
              Expected 5-year IRR{' '}
              <em className="italic text-[var(--secondary)]">
                {data.returns.weighted_irr_5y >= 0 ? '+' : ''}
                {(data.returns.weighted_irr_5y * 100).toFixed(1)}%
              </em>{' '}
              on the slice.
            </>
          }
          lead={
            <>
              50% probability of zero is conservative for a company already
              shipping product with peer-reviewed methodology IP. The upper
              tail (Moonshot + Asymmetric, 10% combined) is what funds the
              seed price; the EV math is dominated by it.
            </>
          }
        />
        <ReturnsWaterfall data={data} />
      </ScrollSection>

      <ScrollSection id="ask" className="bg-[var(--surface-container-low)]">
        <SectionHeader
          eyebrow="07 / Ask"
          title={
            <>
              Seed{' '}
              <em className="italic text-[var(--secondary)]">
                ${data.round.check_size_usd_m}M
              </em>{' '}
              at ${data.round.post_money_usd_m}M post, contingent on three
              milestones.
            </>
          }
          lead={
            <>
              Federal direct contract in flight by month 12. Two paid pilots
              converted by month 18. DFT engine alpha shipped by month 24. If
              two of three land, Series A on terms early FY28 at $300M+ post on
              revenue trajectory; if not, $1M SBIR Phase II is the contingency
              bridge.
            </>
          }
        />
        <div className="mt-6 grid md:grid-cols-3 gap-3">
          {[
            { mo: 12, what: 'Federal direct contract in flight' },
            { mo: 18, what: 'Two paid pilots converted to production' },
            { mo: 24, what: 'DFT engine alpha shipped + benchmark published' },
          ].map((m, i) => (
            <motion.div
              key={m.mo}
              className="rounded-md border border-[var(--outline-variant)] p-5 bg-[var(--surface-container)]"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-15% 0px' }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.12 }}
            >
              <div className="text-xs uppercase tracking-wider text-[var(--on-surface-variant-mid)] mb-2">
                Month {m.mo}
              </div>
              <div className="text-base text-[var(--on-surface)] font-medium">{m.what}</div>
            </motion.div>
          ))}
        </div>
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

function Hero({ data }: { data: ValueModelData }) {
  return (
    <section className="relative pt-[160px] pb-[120px] px-6 lg:px-12 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.10),transparent_60%)]" />
      <div className="container mx-auto max-w-7xl relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--tertiary)] mb-6">
            Value model · animated longform · {data.generated_on}
          </div>
          <h1 className="text-5xl lg:text-7xl mb-8 leading-[1.05] max-w-5xl">
            Materials acceleration is a{' '}
            <em className="italic text-[var(--secondary)]">$151B/yr</em>{' '}
            economic question. Lupine is the engine that compresses it.
          </h1>
          <p className="text-xl text-[var(--on-surface-variant)] max-w-3xl leading-relaxed font-light mb-8">
            Compute. Travel. Bio. Three sectors with documented procurement
            budgets, each gating on the same materials simulation bottleneck.
            This is the bottom-up valuation: re-derived from sector
            economics, computed in code, regenerable from the underlying CSVs.
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-3 font-mono text-sm text-[var(--on-surface-variant)]">
            <Kpi label="Mature unlock" value="$151B/yr" sub="2030 across 3 sectors" />
            <Kpi
              label="Base DCF EV"
              value={`$${data.dcf.scenarios.base.enterprise_value.toFixed(0)}M`}
              sub={`vs $${data.round.post_money_usd_m}M proposed post`}
            />
            <Kpi
              label="Weighted IRR"
              value={`${data.returns.weighted_irr_5y >= 0 ? '+' : ''}${(data.returns.weighted_irr_5y * 100).toFixed(1)}%`}
              sub="5-year hold"
            />
          </div>
        </motion.div>
      </div>
    </section>
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

function FootnoteRow({
  items,
}: {
  items: { label: string; value: string; note: string }[]
}) {
  return (
    <div className="grid md:grid-cols-3 gap-3 mt-6">
      {items.map((it, i) => (
        <motion.div
          key={it.label}
          className="rounded-md border border-[var(--outline-variant)] p-4 bg-[var(--surface-container)]"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{ duration: 0.45, delay: 0.05 + i * 0.1 }}
        >
          <div className="text-xs uppercase tracking-wider text-[var(--on-surface-variant-mid)] mb-1">
            {it.label}
          </div>
          <div className="text-2xl text-[var(--on-surface)] font-semibold mb-1">
            {it.value}
          </div>
          <div className="text-xs text-[var(--on-surface-variant)] font-mono">
            {it.note}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--on-surface-variant-mid)]">
        {label}
      </div>
      <div className="text-2xl text-[var(--on-surface)] font-semibold leading-tight">{value}</div>
      <div className="text-xs text-[var(--on-surface-variant-mid)]">{sub}</div>
    </div>
  )
}
