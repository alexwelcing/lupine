import { createFileRoute } from '@tanstack/react-router'
import Header from '../components/Header'
import Footer from '../components/Footer'
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
import { PlatformValueChart } from '../components/value-model/PlatformValueChart'
import { PlatformCompsTable } from '../components/value-model/PlatformCompsTable'
import { CeilingScenarios } from '../components/value-model/CeilingScenarios'
import { QuantumUnlocks } from '../components/value-model/QuantumUnlocks'

const data = valueModelData as ValueModelData

// In-page anchor nav. IDs match ScrollSection ids below.
const SECTIONS = [
  { id: 'credo', label: 'What we believe' },
  { id: 'arc', label: '30-yr arc' },
  { id: 'stack', label: 'The stack' },
  { id: 'why-now', label: 'Why now' },
  { id: 'ceiling', label: 'The ceiling' },
  { id: 'math', label: 'The floor' },
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
    <div className="relative w-screen h-screen overflow-hidden bg-[var(--surface)] text-[var(--on-surface)]">
      <div className="absolute top-0 w-full z-50">
        <Header />
      </div>
      <main className="relative flex flex-row w-screen h-screen overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth z-10">

      <Hero />

      <nav
        aria-label="Section navigation"
        className="fixed bottom-6 left-6 z-30 border border-[var(--outline-variant)] bg-[var(--surface)]/90 backdrop-blur-md rounded-md"
      >
        <div className="container mx-auto max-w-7xl px-6 lg:px-12 flex gap-1 lg:gap-2 overflow-x-auto py-2 text-[10px] lg:text-[11px] font-mono uppercase tracking-[0.08em]">
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
          05 / The ceiling — McKinsey-style platform-tier valuation
          ============================================================ */}
      <ScrollSection id="ceiling">
        <SectionHeader
          eyebrow="05 / If we are right about the stack"
          title={
            <>
              The ceiling is{' '}
              <em className="italic text-[var(--secondary)]">
                ${(data.ceiling.weighted_ev_conditional_usd_b / 1000).toFixed(1)}T
              </em>{' '}
              conditional weighted EV.
            </>
          }
          lead={
            <>
              The math in section 06 prices Lupine as a software-of-record
              company on classical materials acceleration only. This section
              prices Lupine as the audit substrate for a{' '}
              <strong className="text-[var(--on-surface)]">
                ~$
                {(data.ceiling.quantum_total_addressable_usd_b / 1000).toFixed(0)}T/yr
              </strong>{' '}
              quantum-enabled materials economy at phase-5 maturity —{' '}
              {data.ceiling.quantum_aggregate_uplift_x.toFixed(0)}× the
              classical baseline. The two methodologies differ by an order
              of magnitude in addressable, an order of magnitude in capture
              rate, and{' '}
              <strong className="text-[var(--secondary)]">
                ~
                {Math.round(
                  (data.ceiling.weighted_ev_conditional_usd_b * 1000) /
                  data.dcf.scenarios.base.enterprise_value /
                  1000,
                ).toLocaleString()}
                ,000×
              </strong>{' '}
              in implied conditional EV — because they answer fundamentally
              different questions about what Lupine is.
            </>
          }
        />

        {/* Sub-block A: phase-4 addressable value */}
        <div className="mt-2">
          <div className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--tertiary)] mb-3">
            A · What's at stake when phase-4 lands
          </div>
          <PlatformValueChart data={data} />
          <Takeaway label="The denominator">
            ~$
            {(data.ceiling.phase4_addressable_total_usd_b / 1000).toFixed(1)}T
            of annual economic activity at phase-4 maturity (2045) — drugs
            $1.2T, semiconductors $800B, batteries $500B, ag/food $400B,
            catalysis $300B, polymers and aerospace $250B each, biopolymers
            and energy systems $180-200B. Sized bottom-up from McKinsey,
            BNEF, BCG, Frost & Sullivan, and direct industry numbers; held
            at the conservative midpoint of the $2-5T range these reports
            bracket.
          </Takeaway>
        </div>

        {/* Sub-block B: capture rates from real platform comps */}
        <div className="mt-12">
          <div className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--tertiary)] mb-3">
            B · What audit-substrate companies actually capture
          </div>
          <PlatformCompsTable data={data} />
          <Takeaway label="The capture-rate bracket">
            Modern platform infrastructure earns 0.05–0.30% of the ecosystem
            it serves (GitHub, Hugging Face, Cloudflare, Datadog, Snowflake,
            Shopify). Mature simulation/audit platforms earn 0.9–1.4% once
            they fully consolidate (Synopsys, Cadence). Lupine's ceiling
            scenarios anchor on these brackets, not on aspirational numbers.
          </Takeaway>
        </div>

        {/* Sub-block C: phase-5 quantum unlocks (the multiplier layer) */}
        <div className="mt-12">
          <div className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--tertiary)] mb-3">
            C · Phase-5 quantum unlocks (the multiplier layer)
          </div>
          <QuantumUnlocks data={data} />
          <Takeaway label="Why quantum changes the magnitude, not the speed" tone="positive">
            Phase-4 sized the addressable as $
            {(data.ceiling.phase4_addressable_total_usd_b / 1000).toFixed(0)}T
            of accelerated classical materials work. Phase-5 quantum unlocks
            don&apos;t just speed that up — they enable economic regimes
            classical chemistry could not produce: fault-tolerant quantum
            computing substrate, room-temperature superconductors,
            commercial fusion magnets, post-CMOS spintronics, single-molecule
            quantum sensing, quantum-limit photovoltaics. The aggregate uplift
            is{' '}
            <strong className="text-[var(--secondary)]">
              {data.ceiling.quantum_aggregate_uplift_x.toFixed(0)}×
            </strong>{' '}
            the classical baseline (~$
            {(data.ceiling.quantum_total_addressable_usd_b / 1000).toFixed(0)}T/yr
            addressable), and the audit substrate is structurally
            non-negotiable because quantum-classical hybrid simulations fail
            in ways classical methods cannot detect.
          </Takeaway>
        </div>

        {/* Sub-block D: outcome distribution */}
        <div className="mt-12">
          <div className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--tertiary)] mb-3">
            D · The conditional outcome distribution
          </div>
          <CeilingScenarios data={data} />
          <Takeaway label="What this number means" tone="positive">
            ${(data.ceiling.weighted_ev_conditional_usd_b / 1000).toFixed(2)}T
            (= ${data.ceiling.weighted_ev_conditional_usd_b.toFixed(0)}B) is
            the probability-weighted EV across the seven scenarios above,{' '}
            <em>conditional on execution</em>. Multiply by 50% (the
            unconditional probability the company doesn&apos;t fail outright,
            priced explicitly in the math floor) and you get a{' '}
            <strong className="text-[var(--on-surface)]">
              ~$
              {(data.ceiling.weighted_ev_conditional_usd_b / 1000 / 2).toFixed(2)}T
            </strong>{' '}
            unconditional ceiling. That is{' '}
            <strong className="text-[var(--secondary)]">
              ~{Math.round(
                (data.ceiling.weighted_ev_conditional_usd_b * 1000) /
                2 /
                data.dcf.scenarios.base.enterprise_value /
                1000,
              ).toLocaleString()}
              ,000×
            </strong>{' '}
            the math floor&apos;s $
            {data.dcf.scenarios.base.enterprise_value.toFixed(0)}M base DCF —
            four orders of magnitude. The math floor measures the wrong
            altitude.
          </Takeaway>
        </div>

      </ScrollSection>

      {/* ============================================================
          06 / The math — explicitly framed as the floor, not the ceiling
          ============================================================ */}
      <ScrollSection id="math" className="bg-[var(--surface-container-low)]">
        <SectionHeader
          eyebrow="06 / The math (the floor)"
          title={
            <>
              And the floor —{' '}
              <em className="italic text-[var(--secondary)]">
                the conservative cross-check
              </em>
              .
            </>
          }
          lead={
            <>
              The ceiling above prices Lupine as the audit substrate for a
              quantum-enabled materials economy. This section prices Lupine
              as if neither the quantum unlocks nor the platform position
              materialize — a respectable Synopsys / Cadence / Veeva-tier
              vertical software company on a 5-year horizon, classical
              materials only. Even under this strictly-conservative frame
              the DCF clears: $
              <strong className="text-[var(--on-surface)]">
                {baseEv.toFixed(0)}M intrinsic
              </strong>{' '}
              vs the ${proposedPost}M proposed post (
              <strong className="text-[var(--secondary)]">
                +{baseSafetyPct.toFixed(0)}%
              </strong>{' '}
              margin of safety),{' '}
              <strong className="text-[var(--secondary)]">
                +{(data.returns.weighted_irr_5y * 100).toFixed(0)}%
                probability-weighted IRR
              </strong>
              . The math clears on the floor; the upside is in section 05.
            </>
          }
        />

        <div className="mt-2">
          <div className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--tertiary)] mb-3">
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
          <div className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--tertiary)] mb-3">
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
          <div className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--tertiary)] mb-3">
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
          07 / Ask
          ============================================================ */}
      <ScrollSection id="ask">
        <SectionHeader
          eyebrow="07 / The ask"
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
            <div
              key={m.mo}
              className="rounded-md border border-[var(--outline-variant)] p-5 bg-[var(--surface-container)] flex flex-col gap-2"
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
            </div>
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

      <ScrollSection id="footer">
        <div className="h-full flex flex-col justify-end">
          <Footer />
        </div>
      </ScrollSection>
      </main>
    </div>
  )
}

function Hero() {
  return (
    <section 
      className="relative min-w-[100vw] h-screen shrink-0 snap-start snap-always border-r border-[var(--outline-variant)]"
    >
      {/* Ambient backdrop */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(107,138,175,0.06),transparent_60%)]"
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(107,138,175,0.03),transparent_55%)]"
        />
      </div>

      <div 
        className="absolute inset-0 overflow-y-auto overflow-x-hidden px-6 lg:px-12"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0px, black 120px, black calc(100% - 120px), transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0px, black 120px, black calc(100% - 120px), transparent 100%)'
        }}
      >
        <div className="container mx-auto max-w-7xl relative z-10 w-full min-h-full flex flex-col justify-center pt-32 pb-36 lg:flex-row lg:items-center gap-16 lg:gap-24">
          <div className="flex-1">
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--tertiary)] mb-6 flex items-center gap-4">
            <span className="w-8 h-px bg-[var(--tertiary)] opacity-50"></span>
            Lupine Materials Science
          </div>
          <h1 className="text-5xl lg:text-[5.5rem] mb-8 leading-[1.08] max-w-5xl font-serif tracking-tight text-[var(--on-surface)]">
            Step 1 of a real-world{' '}
            <em className="italic text-[var(--secondary)]">Replicator</em>.
          </h1>
          <p className="font-serif italic text-xl md:text-2xl leading-snug text-[var(--on-surface-variant-mid)] max-w-3xl mb-6">
            Matter is the last frontier of civilization-scale software. Beneath the foundation models lies a strict geometry: let <span className="font-sans italic font-medium">ℳ</span> be the manifold of published interatomic potentials. Across <span className="font-sans italic font-medium">ℳ</span>, the Fisher Information Matrix of any universal MLIP exhibits a hyper-ribbon—a hierarchy of eigenvalues spanning decades where predictions orthogonal to the stiffest principal components inevitably diverge.
          </p>
          <p className="font-serif italic text-xl md:text-2xl leading-snug text-[var(--on-surface-variant)] max-w-3xl mb-10">
            Lupine builds the{' '}
            <strong className="text-[var(--secondary)] font-normal">audit substrate</strong>{' '}
            that isolates those sloppy axes. We define the methodology that names exactly where atomistic predictions break, compressing the manifold's low-rank errors into closed-loop self-correction. The decade ahead is convergence.
          </p>

          <a
            href="#credo"
            className="inline-flex items-center gap-3 mb-12 group no-underline border border-[var(--outline-variant)] px-5 py-2.5 rounded-md hover:bg-[var(--surface-container-low)] transition-all"
          >
            <span className="text-sm text-[var(--on-surface-variant)] group-hover:text-[var(--on-surface)] transition-colors">
              Read the thesis
            </span>
            <span className="text-[var(--on-surface-variant-mid)] group-hover:text-[var(--on-surface)] transition-colors">
              →
            </span>
          </a>

          <PhaseTimeline />
        </div>

        {/* Visual offset: subtle geometric element */}
        <div className="hidden lg:flex w-[300px] h-[300px] opacity-20 select-none relative shrink-0 items-center justify-center">
          <div className="absolute inset-6 border border-[var(--outline-variant)] rounded-lg" />
          <div className="absolute top-1/4 bottom-1/4 left-1/2 w-px bg-[var(--outline-variant)]" />
          <div className="absolute left-1/4 right-1/4 top-1/2 h-px bg-[var(--outline-variant)]" />
          <div className="w-3 h-3 rounded-full bg-[var(--primary)] opacity-40" />
        </div>
      </div>
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
    <div
      className="rounded-md border border-[var(--outline-variant)] bg-[var(--surface-container)] p-5 flex flex-col gap-3"
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--secondary)]">
        {label}
      </div>
      <div className="text-sm font-mono text-[var(--on-surface)] leading-snug">
        {line}
      </div>
      <div className="text-sm text-[var(--on-surface-variant)] leading-relaxed">
        {note}
      </div>
    </div>
  )
}

function PhaseTimeline() {
  const phases = [
    { id: 1, label: 'Phase 1', years: '2025–2030', title: 'Trustworthy prediction', status: 'active' },
    { id: 2, label: 'Phase 2', years: '2028–2034', title: 'Generative matter', status: 'upcoming' },
    { id: 3, label: 'Phase 3', years: '2032–2042', title: 'Closed-loop autonomous synthesis', status: 'upcoming' },
    { id: 4, label: 'Phase 4', years: '2040–2055', title: 'Programmable matter', status: 'upcoming' },
    { id: 5, label: 'Phase 5', years: '2050–2080', title: 'Quantum-enabled materials economy', status: 'upcoming' },
  ]

  return (
    <div className="w-full mt-4 select-none relative pb-4">
      {/* Desktop Track */}
      <div className="hidden lg:block absolute top-[7px] left-0 right-0 h-px bg-[var(--outline-variant)] z-0" />
      {/* Mobile Track */}
      <div className="lg:hidden absolute top-0 bottom-0 left-[7px] w-px bg-[var(--outline-variant)] z-0" />
      
      <div className="flex flex-col lg:flex-row justify-between items-start gap-8 lg:gap-4 relative z-10">
        {phases.map((phase) => (
          <div key={phase.id} className="relative flex flex-row lg:flex-col items-start gap-4 lg:gap-3 lg:w-1/5 group cursor-default">
            {/* Node */}
            <div className="flex items-center gap-3 mt-[2px] lg:mt-0">
              <div 
                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all duration-500`}
                style={{
                  borderColor: phase.status === 'active' ? 'var(--primary)' : 'var(--outline-variant)',
                  backgroundColor: phase.status === 'active' ? 'var(--primary)' : 'var(--surface-container)',
                  boxShadow: phase.status === 'active' ? '0 0 16px rgba(107, 138, 175, 0.4)' : 'none'
                }}
              />
              <div className="hidden lg:block font-mono text-[10px] uppercase tracking-[0.2em] transition-colors" style={{ color: phase.status === 'active' ? 'var(--primary)' : 'var(--on-surface-variant-mid)' }}>
                {phase.years}
              </div>
            </div>
            
            {/* Content */}
            <div className="flex flex-col">
              <div className="lg:hidden font-mono text-[10px] uppercase tracking-[0.2em] mb-1 transition-colors" style={{ color: phase.status === 'active' ? 'var(--primary)' : 'var(--on-surface-variant-mid)' }}>
                {phase.years}
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--on-surface-variant)] mb-1 group-hover:text-[var(--on-surface)] transition-colors duration-300">
                {phase.label}
              </span>
              <span 
                className="font-serif italic text-base lg:text-lg leading-snug group-hover:text-[var(--primary)] transition-colors duration-300"
                style={{ color: phase.status === 'active' ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}
              >
                {phase.title}
              </span>
            </div>
          </div>
        ))}
      </div>
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
    <div className="mb-16 max-w-4xl relative">
      {/* Visual Offset: Geometric wireframe accent */}
      <div className="absolute -left-8 top-2 w-4 h-4 border-t-2 border-l-2 border-[var(--primary)] opacity-50 hidden lg:block" />
      <div className="absolute -left-8 bottom-2 w-4 h-4 border-b-2 border-l-2 border-[var(--primary)] opacity-50 hidden lg:block" />

      <div className="font-mono text-xl md:text-2xl uppercase tracking-[0.2em] text-[var(--tertiary)] mb-5">
        {eyebrow}
      </div>
      <h2 className="text-5xl md:text-6xl font-serif tracking-tight text-[var(--on-surface)] mb-5 mt-2">
        {title}
      </h2>
      <p className="font-serif italic text-2xl md:text-3xl leading-snug text-[var(--on-surface-variant-mid)] max-w-3xl">
        {lead}
      </p>
    </div>
  )
}
