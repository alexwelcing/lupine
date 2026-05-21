import { useEffect, useRef, useState } from 'react'
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
  { id: 'coming-soon', label: 'Coming soon' },
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

      {/* ============================================================
          08 / Coming Soon
          ============================================================ */}
      <ScrollSection id="coming-soon" className="bg-[var(--surface-container-low)]">
        <SectionHeader
          eyebrow="08 / Project Distill"
          title={
            <>
              Manifold{' '}
              <em className="italic text-[var(--secondary)]">
                Distillation & Error Isolation
              </em>
              .
            </>
          }
          lead={
            <>
              Evaluating density functional theory residuals across universal MLIPs.
              By parameterizing the Fisher Information Matrix of any force-field engine,
              we locate and collapse the hyper-ribbon's stiffest error dimensions—enabling
              mechanically stable generative synthesis that bypasses functional-form decay.
            </>
          }
        />
        <div className="mt-6 grid md:grid-cols-2 gap-8 items-center">
          <div className="flex flex-col gap-5">
            <h4 className="font-serif text-2xl text-[var(--on-surface)] tracking-tight">
              Project Distill: Closed-Loop Matter Generation (Q3 2026)
            </h4>
            <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">
              Project Distill combines our <code>lupine-distill</code> predictive error filter with a 
              recursive self-governing Bayesian search loop. By analyzing the high-rank singular values 
              of multi-component atomic assemblies, the distiller isolates where classical neural 
              potentials diverge from density functional theory (DFT) reference states. 
              The system automates high-fidelity VASP and ORCA quantum verification sweeps for candidate 
              lattices, continuously refining the generative manifold under strict physical bounds.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <input
                type="email"
                placeholder="Enter academic email for embargo clearance"
                className="bg-[var(--surface-container)] border border-[var(--outline-variant)] rounded px-4 py-2.5 text-sm text-[var(--on-surface)] placeholder-[var(--on-surface-variant-mid)] focus:outline-none focus:border-[var(--secondary)] transition-colors min-w-[240px]"
                disabled
              />
              <button 
                className="bg-[var(--secondary)] hover:bg-[var(--secondary-container)] hover:text-[var(--on-secondary-container)] text-[var(--on-secondary)] font-medium text-sm px-5 py-2.5 rounded transition-all cursor-not-allowed opacity-80 whitespace-nowrap"
                disabled
              >
                Request Raw Manifolds
              </button>
            </div>
            <p className="text-[10px] font-mono text-[var(--on-surface-variant-mid)] uppercase tracking-wider">
              🔒 Embargo status active. Waitlist registration will release raw HDF5 dataset manifolds.
            </p>
          </div>
          <div className="w-full">
            <ComputationalReleaseGraphic />
          </div>
        </div>
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

function ComputationalReleaseGraphic() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loadingText, setLoadingText] = useState('CALIBRATING MANIFOLD METRICS...')
  const [entropy, setEntropy] = useState('0.874139')
  const [activeOutlier, setActiveOutlier] = useState<string>('Fe Outlier')

  // Dragging state using refs to avoid re-triggering useEffect
  const isDraggingRef = useRef(false)
  const previousMousePositionRef = useRef({ x: 0, y: 0 })
  const rotationAnglesRef = useRef({ x: 0.5, y: 0.5 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let width = (canvas.width = canvas.offsetWidth || 400)
    let height = (canvas.height = canvas.offsetHeight || 300)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = canvas.offsetWidth || 400
      height = canvas.height = canvas.offsetHeight || 300
    }
    window.addEventListener('resize', handleResize)

    let t = 0
    // Live scrolling loss data
    const lossHistory: number[] = Array.from({ length: 60 }, () => 0.4 + Math.random() * 0.1)

    // Generate hyper-ribbon manifold points (a helical ribbon)
    const points: { x: number; y: number; z: number; color: string }[] = []
    const ribLines: number[][] = []
    const numPoints = 100
    for (let i = 0; i < numPoints; i++) {
      const u = (i / numPoints) * Math.PI * 4 // Spine parameter
      const spineX = Math.sin(u) * 55
      const spineY = (u - Math.PI * 2) * 18
      const spineZ = Math.cos(u) * 55

      // Ribbon width directions
      const dx = Math.cos(u) * 20
      const dy = Math.sin(u * 2) * 4
      const dz = -Math.sin(u) * 20

      // Add spine nodes
      points.push({
        x: spineX + dx,
        y: spineY + dy,
        z: spineZ + dz,
        color: `hsla(${200 + (i * 1.8) % 70}, 85%, 65%, 0.7)`
      })
      points.push({
        x: spineX - dx,
        y: spineY - dy,
        z: spineZ - dz,
        color: `hsla(${240 + (i * 1.8) % 70}, 85%, 65%, 0.3)`
      })

      ribLines.push([2 * i, 2 * i + 1]) // connection line across ribbon
      if (i > 0) {
        ribLines.push([2 * (i - 1), 2 * i]) // side A connection
        ribLines.push([2 * (i - 1) + 1, 2 * i + 1]) // side B connection
      }
    }

    // Add 4 specific scientific outlier nodes with floating coordinates
    const outliers = [
      { x: 30, y: -25, z: 45, label: 'Fe Outlier', symbol: 'Fe', color: '#ff6b6b' },
      { x: -45, y: 10, z: -35, label: 'Cr Outlier', symbol: 'Cr', color: '#ffd23f' },
      { x: 15, y: 35, z: -50, label: 'Au Outlier', symbol: 'Au', color: '#f7b267' },
      { x: -20, y: -45, z: 20, label: 'Ni Outlier', symbol: 'Ni', color: '#4cc9f0' }
    ]

    const render = () => {
      ctx.clearRect(0, 0, width, height)
      t += 0.01

      // Auto rotation if not dragging
      if (!isDraggingRef.current) {
        rotationAnglesRef.current.y += 0.004
        rotationAnglesRef.current.x = 0.4 + Math.sin(t * 0.25) * 0.12
      }

      const cosX = Math.cos(rotationAnglesRef.current.x)
      const sinX = Math.sin(rotationAnglesRef.current.x)
      const cosY = Math.cos(rotationAnglesRef.current.y)
      const sinY = Math.sin(rotationAnglesRef.current.y)

      const project = (px: number, py: number, pz: number) => {
        // Rotate Y
        let x1 = px * cosY - pz * sinY
        let z1 = px * sinY + pz * cosY
        // Rotate X
        let y2 = py * cosX - z1 * sinX
        let z2 = py * sinX + z1 * cosX
        // Camera perspective
        const d = 260
        const scale = d / (d + z2)
        return {
          x: width / 2 + x1 * scale,
          y: height / 2 + y2 * scale,
          z: z2
        }
      }

      // Draw 3D grid axes in background
      const axisLength = 80
      const originProj = project(0, 0, 0)
      const axisX = project(axisLength, 0, 0)
      const axisY = project(0, -axisLength, 0) // inverted for visual alignment
      const axisZ = project(0, 0, axisLength)

      ctx.lineWidth = 0.8
      // X Axis (Red)
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)'
      ctx.beginPath()
      ctx.moveTo(originProj.x, originProj.y)
      ctx.lineTo(axisX.x, axisX.y)
      ctx.stroke()
      ctx.fillStyle = 'rgba(239, 68, 68, 0.6)'
      ctx.fillText('X (Stiffness)', axisX.x + 4, axisX.y + 2)

      // Y Axis (Green)
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)'
      ctx.beginPath()
      ctx.moveTo(originProj.x, originProj.y)
      ctx.lineTo(axisY.x, axisY.y)
      ctx.stroke()
      ctx.fillStyle = 'rgba(34, 197, 94, 0.6)'
      ctx.fillText('Y (Error Plume)', axisY.x - 24, axisY.y - 4)

      // Z Axis (Blue)
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)'
      ctx.beginPath()
      ctx.moveTo(originProj.x, originProj.y)
      ctx.lineTo(axisZ.x, axisZ.y)
      ctx.stroke()
      ctx.fillStyle = 'rgba(59, 130, 246, 0.6)'
      ctx.fillText('Z (Variance)', axisZ.x + 4, axisZ.y + 4)

      // 3D project ribbon points
      const projected = points.map((p) => project(p.x, p.y, p.z))

      // Render ribbon lines
      ctx.lineWidth = 1.0
      ribLines.forEach(([iA, iB]) => {
        const pA = projected[iA]
        const pB = projected[iB]
        const origA = points[iA]
        if (!pA || !pB || !origA) return

        const avgZ = (pA.z + pB.z) / 2
        const opacity = Math.max(0.08, Math.min(0.7, 1 - (avgZ + 100) / 220))
        ctx.strokeStyle = origA.color.replace('0.7', opacity.toString()).replace('0.3', (opacity * 0.4).toString())
        ctx.beginPath()
        ctx.moveTo(pA.x, pA.y)
        ctx.lineTo(pB.x, pB.y)
        ctx.stroke()
      })

      // Draw Outlier Nodes with 3D Error Plumes
      outliers.forEach((outlier) => {
        const pNode = project(outlier.x, outlier.y, outlier.z)
        const avgZ = pNode.z
        const opacity = Math.max(0.1, Math.min(0.9, 1 - (avgZ + 100) / 220))

        // Draw node
        ctx.beginPath()
        ctx.arc(pNode.x, pNode.y, 4, 0, Math.PI * 2)
        ctx.fillStyle = outlier.color
        ctx.fill()

        // Draw outer glowing ring
        ctx.beginPath()
        ctx.arc(pNode.x, pNode.y, 8 + Math.sin(t * 5) * 2, 0, Math.PI * 2)
        ctx.strokeStyle = `${outlier.color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`
        ctx.lineWidth = 0.8
        ctx.stroke()

        // Draw dotted line (projection to spine / origin)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
        ctx.setLineDash([2, 3])
        ctx.beginPath()
        ctx.moveTo(originProj.x, originProj.y)
        ctx.lineTo(pNode.x, pNode.y)
        ctx.stroke()
        ctx.setLineDash([])

        // Draw error vector plume (extending outwards)
        const plumeLength = 22 + Math.sin(t * 3) * 6
        const pPlume = project(outlier.x, outlier.y - plumeLength, outlier.z)
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)'
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(pNode.x, pNode.y)
        ctx.lineTo(pPlume.x, pPlume.y)
        ctx.stroke()

        // Draw label text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
        ctx.fillText(`[${outlier.symbol}]`, pNode.x + 8, pNode.y - 2)
      })

      // Draw floating background electronic density field
      ctx.fillStyle = 'rgba(107, 138, 175, 0.35)'
      for (let i = 0; i < 15; i++) {
        const theta = t * 1.1 + i * (Math.PI / 7)
        const r = 70 + Math.sin(t + i) * 12
        const px = width / 2 + Math.sin(theta) * r * Math.cos(rotationAnglesRef.current.y)
        const py = height / 2 + Math.cos(theta) * r * Math.sin(rotationAnglesRef.current.x)
        ctx.beginPath()
        ctx.arc(px, py, 1.2, 0, Math.PI * 2)
        ctx.fill()
      }

      // Draw mini scrolling loss telemetry chart in bottom right corner
      const chartWidth = 90
      const chartHeight = 45
      const chartX = width - chartWidth - 12
      const chartY = height - chartHeight - 55

      // Draw chart border & backdrop
      ctx.fillStyle = 'rgba(20, 24, 33, 0.75)'
      ctx.fillRect(chartX, chartY, chartWidth, chartHeight)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.lineWidth = 0.8
      ctx.strokeRect(chartX, chartY, chartWidth, chartHeight)

      // Scrolling logic
      if (Math.random() < 0.05) {
        lossHistory.shift()
        // exponential convergence with noise
        const targetVal = 0.08 + Math.random() * 0.04
        lossHistory.push(targetVal)
      }

      // Draw graph line
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.8)' // green
      ctx.lineWidth = 1.0
      ctx.beginPath()
      for (let i = 0; i < lossHistory.length; i++) {
        const lx = chartX + (i / (lossHistory.length - 1)) * chartWidth
        const ly = chartY + chartHeight - (lossHistory[i] * chartHeight * 0.85) - 2
        if (i === 0) ctx.moveTo(lx, ly)
        else ctx.lineTo(lx, ly)
      }
      ctx.stroke()

      // Graph Labels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.fillText('DISTILL LOSS', chartX + 4, chartY + 10)
      ctx.fillStyle = 'rgba(52, 211, 153, 0.9)'
      ctx.fillText(`ℒ: ${lossHistory[lossHistory.length - 1].toFixed(4)}`, chartX + 4, chartY + chartHeight - 4)

      animationId = requestAnimationFrame(render)
    }

    render()

    // Random scientific ticks
    const textInterval = setInterval(() => {
      const texts = [
        'MANIFOLD DENSITY HARMONIZATION RUNNING...',
        'HESSIAN MATRIX DETERMINANT CORRELATED',
        'PC1 DISPARITY ATTENUATED TO < 0.02%',
        'WILSONIAN EFFECTIVE CUTOFF RESOLVING...',
        'DFT REFERENCE TENSOR VALIDATED',
        'SIMPSON\'S PARADOX CONFOUND DISCHARGED',
        'ORTHOGONAL FORCE PLUME DECAY: SECURE',
      ]
      setLoadingText(texts[Math.floor(Math.random() * texts.length)])
      setEntropy((0.874139 - Math.random() * 0.005).toFixed(6))
      // Pick random active outlier for telemetry
      const oList = ['Fe Outlier', 'Cr Outlier', 'Au Outlier', 'Ni Outlier']
      setActiveOutlier(oList[Math.floor(Math.random() * oList.length)])
    }, 2000)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationId)
      clearInterval(textInterval)
    }
  }, [])

  // Drag interaction handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingRef.current = true
    previousMousePositionRef.current = {
      x: e.clientX,
      y: e.clientY
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    const deltaX = e.clientX - previousMousePositionRef.current.x
    const deltaY = e.clientY - previousMousePositionRef.current.y

    rotationAnglesRef.current.y += deltaX * 0.008
    rotationAnglesRef.current.x += deltaY * 0.008

    previousMousePositionRef.current = {
      x: e.clientX,
      y: e.clientY
    }
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0]
    if (!touch) return
    isDraggingRef.current = true
    previousMousePositionRef.current = {
      x: touch.clientX,
      y: touch.clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    const touch = e.touches[0]
    if (!touch) return
    const deltaX = touch.clientX - previousMousePositionRef.current.x
    const deltaY = touch.clientY - previousMousePositionRef.current.y

    rotationAnglesRef.current.y += deltaX * 0.008
    rotationAnglesRef.current.x += deltaY * 0.008

    previousMousePositionRef.current = {
      x: touch.clientX,
      y: touch.clientY
    }
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
      className="relative w-full h-[320px] bg-[var(--surface-container-low)] border border-[var(--outline-variant)] rounded-lg overflow-hidden flex flex-col justify-end p-4 font-mono text-[10px] select-none cursor-grab active:cursor-grabbing"
    >
      {/* Decorative lines & labels */}
      <div className="absolute top-3 left-4 right-4 flex justify-between text-[var(--on-surface-variant-mid)] pointer-events-none uppercase tracking-widest">
        <span>[MANIFOLD OBSERVATION PANEL // DISTILL v2]</span>
        <span className="text-[var(--tertiary)] animate-pulse">● INTERACTIVE SIM</span>
      </div>

      <div className="absolute top-12 left-4 flex flex-col gap-1 text-[9px] text-[var(--on-surface-variant)] pointer-events-none bg-[var(--surface-container)]/80 p-2.5 border border-[var(--outline-variant)] rounded backdrop-blur-sm">
        <div className="font-semibold text-[var(--secondary)] pb-1 border-b border-[var(--outline-variant)]/60 mb-1">TELEMETRY DECK</div>
        <div>SYS_ENTROPY: {entropy}</div>
        <div>STABILITY_G: 1.0000 (SECURE)</div>
        <div>ACTIVE_NODE: {activeOutlier}</div>
        <div>FIM_RANK: 18 / 120 AXES</div>
        <div>CUTOFF: Λ = 1.42 eV/Å</div>
      </div>

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Control panel bar */}
      <div className="relative z-10 w-full bg-[var(--surface-container)]/90 backdrop-blur-md border border-[var(--outline-variant)] rounded p-2.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--secondary)] animate-ping" />
          <span className="text-[var(--on-surface)] font-medium text-[9px] tracking-wider">{loadingText}</span>
        </div>
        <div className="text-[var(--on-surface-variant-mid)] font-semibold text-[8px] uppercase tracking-wider bg-[var(--surface)] px-2 py-0.5 rounded border border-[var(--outline-variant)]">
          VASP-DFT CORE v2.10.8
        </div>
      </div>
    </div>
  )
}
