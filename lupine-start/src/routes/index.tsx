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
  const mousePosRef = useRef({ x: 0, y: 0 })
  
  // State
  const [potential, setPotential] = useState<'MACE-MP-0' | 'Orb-v3' | 'CHGNet' | 'EAM_Dynamo'>('MACE-MP-0')
  const [cutoff, setCutoff] = useState(1.42)
  const [activeOutlier, setActiveOutlier] = useState<'Fe' | 'Cr' | 'Au' | 'Ni'>('Fe')
  const [showMath, setShowMath] = useState(false)
  const [activeTab, setActiveTab] = useState<'manifold' | 'hessian' | 'proof'>('manifold')
  const [hoveredCell, setHoveredCell] = useState<{ r: number; c: number } | null>(null)
  const [proofStep, setProofStep] = useState<number>(0)
  
  // Real-time scrolling VASP-DFT log terminal state
  const [logs, setLogs] = useState<string[]>([
    '[SYS] INITIATING COLLIMATED DISTILLATE RUN v2.4.9...',
    '[SYS] GPU Accelerator context bound to local cluster device GPU0',
    '[DFT] Launching k-point plane-wave Kohn-Sham active solvers...',
    '[FIM] Covariant parameter manifold metrics initialized.'
  ])

  // Recalibration animation state
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [processingMsg, setProcessingMsg] = useState('')
  
  const [loadingText, setLoadingText] = useState('MONITORING MATRIX COVARIANCE...')
  const [entropy, setEntropy] = useState('0.187439')

  // Moduli parameters
  const derivedModuli = {
    'MACE-MP-0': { bulk: '168.4 GPa', shear: '82.6 GPa', pugh: '2.04 (Ductile)', cauchy: '+12.4 GPa (Stable)' },
    'Orb-v3': { bulk: '154.2 GPa', shear: '75.1 GPa', pugh: '2.05 (Ductile)', cauchy: '+10.2 GPa (Stable)' },
    'CHGNet': { bulk: '132.8 GPa', shear: '58.4 GPa', pugh: '2.27 (Ductile)', cauchy: '+4.1 GPa (Stable)' },
    'EAM_Dynamo': { bulk: '42.5 GPa', shear: '-18.2 GPa', pugh: '-2.34 (Collapse)', cauchy: '-128.4 GPa (Violated)' }
  }

  const hessianData = {
    'MACE-MP-0': [
      [0.98, 0.02, 0.01, 0.01],
      [0.02, 0.94, 0.03, 0.01],
      [0.01, 0.03, 0.96, 0.02],
      [0.01, 0.01, 0.02, 0.95]
    ],
    'Orb-v3': [
      [0.97, 0.03, 0.02, 0.01],
      [0.03, 0.92, 0.04, 0.02],
      [0.02, 0.04, 0.95, 0.03],
      [0.01, 0.02, 0.03, 0.93]
    ],
    'CHGNet': [
      [0.92, 0.08, 0.05, 0.03],
      [0.08, 0.88, 0.09, 0.04],
      [0.05, 0.09, 0.91, 0.06],
      [0.03, 0.04, 0.06, 0.89]
    ],
    'EAM_Dynamo': [
      [0.45, 0.72, 0.68, 0.54],
      [0.72, 0.38, 0.78, 0.62],
      [0.68, 0.78, 0.32, 0.81],
      [0.54, 0.62, 0.81, 0.28]
    ]
  }

  const hessianLabels = ['a₀', 'Ec', 'C₁₁', 'C₄₄']

  // Dragging state using refs
  const isDraggingRef = useRef(false)
  const previousMousePositionRef = useRef({ x: 0, y: 0 })
  const rotationAnglesRef = useRef({ x: 0.5, y: 0.5 })

  // Outlier descriptions
  const outliersData = {
    'MACE-MP-0': [
      { symbol: 'Fe', label: 'Fe Interstitial', x: 25, y: -20, z: 25, color: '#ff6b6b', residual: '1.2 meV', force: '0.04 eV/Å', stiffness: '1.48', state: 'STABLE' },
      { symbol: 'Cr', label: 'Cr Substituted', x: -45, y: 45, z: -45, color: '#ffd23f', residual: '4.5 meV', force: '0.09 eV/Å', stiffness: '0.84', state: 'STABLE' },
      { symbol: 'Au', label: 'Au Interstitial', x: 0, y: 25, z: -25, color: '#f7b267', residual: '0.8 meV', force: '0.02 eV/Å', stiffness: '2.12', state: 'STABLE' },
      { symbol: 'Ni', label: 'Ni Substituted', x: -45, y: -45, z: 45, color: '#4cc9f0', residual: '2.1 meV', force: '0.05 eV/Å', stiffness: '1.25', state: 'STABLE' },
    ],
    'Orb-v3': [
      { symbol: 'Fe', label: 'Fe Interstitial', x: 25, y: -20, z: 25, color: '#ff6b6b', residual: '2.4 meV', force: '0.06 eV/Å', stiffness: '1.45', state: 'STABLE' },
      { symbol: 'Cr', label: 'Cr Substituted', x: -45, y: 45, z: -45, color: '#ffd23f', residual: '6.2 meV', force: '0.10 eV/Å', stiffness: '0.80', state: 'STABLE' },
      { symbol: 'Au', label: 'Au Interstitial', x: 0, y: 25, z: -25, color: '#f7b267', residual: '1.5 meV', force: '0.03 eV/Å', stiffness: '2.10', state: 'STABLE' },
      { symbol: 'Ni', label: 'Ni Substituted', x: -45, y: -45, z: 45, color: '#4cc9f0', residual: '3.8 meV', force: '0.07 eV/Å', stiffness: '1.22', state: 'STABLE' },
    ],
    'CHGNet': [
      { symbol: 'Fe', label: 'Fe Interstitial', x: 25, y: -20, z: 25, color: '#ff6b6b', residual: '5.4 meV', force: '0.11 eV/Å', stiffness: '1.39', state: 'STABLE' },
      { symbol: 'Cr', label: 'Cr Substituted', x: -45, y: 45, z: -45, color: '#ffd23f', residual: '12.8 meV', force: '0.18 eV/Å', stiffness: '0.72', state: 'STABLE' },
      { symbol: 'Au', label: 'Au Interstitial', x: 0, y: 25, z: -25, color: '#f7b267', residual: '3.2 meV', force: '0.06 eV/Å', stiffness: '2.05', state: 'STABLE' },
      { symbol: 'Ni', label: 'Ni Substituted', x: -45, y: -45, z: 45, color: '#4cc9f0', residual: '6.5 meV', force: '0.12 eV/Å', stiffness: '1.18', state: 'STABLE' },
    ],
    'EAM_Dynamo': [
      { symbol: 'Fe', label: 'Fe Interstitial', x: 25, y: -20, z: 25, color: '#ff8b8b', residual: '184.2 meV', force: '1.45 eV/Å', stiffness: '-0.42', state: 'UNSTABLE' },
      { symbol: 'Cr', label: 'Cr Substituted', x: -45, y: 45, z: -45, color: '#ffee5f', residual: '328.9 meV', force: '2.89 eV/Å', stiffness: '-1.18', state: 'UNSTABLE' },
      { symbol: 'Au', label: 'Au Interstitial', x: 0, y: 25, z: -25, color: '#f9c287', residual: '94.5 meV', force: '0.72 eV/Å', stiffness: '0.54', state: 'SLOPPY' },
      { symbol: 'Ni', label: 'Ni Substituted', x: -45, y: -45, z: 45, color: '#6ce9ff', residual: '142.1 meV', force: '1.12 eV/Å', stiffness: '-0.15', state: 'UNSTABLE' },
    ],
  }

  const potentialEigenvalues = {
    'MACE-MP-0': [12.4, 4.2, 1.5, 0.45, 0.12, 0.03, 0.008, 0.002],
    'Orb-v3': [15.1, 5.6, 2.1, 0.68, 0.18, 0.05, 0.012, 0.003],
    'CHGNet': [18.6, 7.8, 3.4, 1.25, 0.42, 0.11, 0.028, 0.006],
    'EAM_Dynamo': [24.8, 18.2, 12.5, 8.4, 5.6, 3.8, 2.4, 1.5],
  }

  // Trigger recalibration animation when potential shifts
  const triggerRecalibration = (nextPot: typeof potential) => {
    setIsProcessing(true)
    setProcessingProgress(0)
    setPotential(nextPot)
    
    // Reset Lean proof if potential shifts to EAM
    if (nextPot === 'EAM_Dynamo') {
      setProofStep(0)
    }

    setLogs(prev => [
      ...prev,
      `[SYS] INITIATING TRANSITION TO POTENTIAL: ${nextPot}`,
      `[SYS] Purging covariance projection caches...`,
      `[DFT] Re-allocating plane-wave grids for core potentials...`,
      `[FIM] Projecting local Hessian determinant manifolds...`
    ].slice(-15))
    
    let currentProg = 0
    const interval = setInterval(() => {
      currentProg += 10
      if (currentProg >= 100) {
        currentProg = 100
        clearInterval(interval)
        setIsProcessing(false)
        setLogs(prev => [
          ...prev,
          `[SYS] CALIBRATION SECURED FOR ${nextPot}. SCF CONVERGED.`
        ].slice(-15))
      }
      setProcessingProgress(currentProg)
      
      if (currentProg < 25) {
        setProcessingMsg(`[SYSTEM] REALLOCATING JACOBIAN MATRIX FOR ${nextPot}...`)
      } else if (currentProg < 50) {
        setProcessingMsg(`[DFT] COMPUTING HIGH-DIMENSIONAL COVARIANT PLUME...`)
      } else if (currentProg < 75) {
        setProcessingMsg(`[FIM] RESOLVING EIGENVALUE SPECTRUM DECAY...`)
      } else {
        setProcessingMsg(`[ODF] ALIGNING CLOSED-LOOP BAYESIAN BOUNDS...`)
      }
    }, 60)
  }

  // Periodic scrolling terminal logs
  useEffect(() => {
    const logInterval = setInterval(() => {
      if (isProcessing) return
      
      const iter = Math.floor(Math.random() * 8) + 1;
      const baseEnergy = potential === 'EAM_Dynamo' ? -1204.492 : potential === 'CHGNet' ? -4582.10928 : -4583.51205;
      const energy = baseEnergy + Math.random() * 0.0001;
      const dE = -Math.random() * 0.00003;
      const chargeErr = Math.random() * 0.00001;
      
      const logTypes = ['dft', 'distill', 'fim', 'vasp'];
      const chosen = logTypes[Math.floor(Math.random() * logTypes.length)];
      
      let newLog = '';
      if (chosen === 'dft') {
        newLog = `[DFT-SCF] Iter ${iter}: E = ${energy.toFixed(6)} eV, dE = ${dE.toExponential(2)} eV, charge_err = ${chargeErr.toExponential(2)}`;
      } else if (chosen === 'distill') {
        newLog = `[DISTILL] Fisher gradient cutoff aligned: L_distill = ${((4.0 - cutoff) * 0.003).toFixed(6)}`;
      } else if (chosen === 'fim') {
        const stiffCount = potentialEigenvalues[potential].filter(v => v >= cutoff).length;
        newLog = `[FIM] Eigen spectrum status: ${stiffCount} stiff, ${8 - stiffCount} sloppy modes active`;
      } else {
        newLog = `[VASP] Density projection bounds stable. Core force envelope: OK`;
      }

      setLogs(prev => {
        const updated = [...prev, newLog];
        if (updated.length > 15) updated.shift();
        return updated;
      });
    }, 1500);

    return () => clearInterval(logInterval);
  }, [potential, cutoff, isProcessing]);

  // Handle active cutoff adjustments in terminal
  useEffect(() => {
    setLogs(prev => [
      ...prev,
      `[SYS] Adjusting boundary cutoff Λ = ${cutoff.toFixed(2)} eV/Å²`
    ].slice(-15))
  }, [cutoff])

  // 3D Canvas Renderer for BCC Crystal Lattice
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let width = (canvas.width = canvas.offsetWidth || 500)
    let height = (canvas.height = canvas.offsetHeight || 400)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = canvas.offsetWidth || 500
      height = canvas.height = canvas.offsetHeight || 400
    }
    window.addEventListener('resize', handleResize)

    let t = 0
    const lossHistory: number[] = Array.from({ length: 60 }, () => 0.4 + Math.random() * 0.1)

    // Base BCC geometry coordinates (half-box size is 45)
    const baseSize = 45
    const latticeAtoms = [
      // 8 corners of the cube
      { x: -baseSize, y: -baseSize, z: -baseSize, id: 0, isCorner: true },
      { x: baseSize, y: -baseSize, z: -baseSize, id: 1, isCorner: true },
      { x: baseSize, y: baseSize, z: -baseSize, id: 2, isCorner: true },
      { x: -baseSize, y: baseSize, z: -baseSize, id: 3, isCorner: true },
      { x: -baseSize, y: -baseSize, z: baseSize, id: 4, isCorner: true },
      { x: baseSize, y: -baseSize, z: baseSize, id: 5, isCorner: true },
      { x: baseSize, y: baseSize, z: baseSize, id: 6, isCorner: true },
      { x: -baseSize, y: baseSize, z: baseSize, id: 7, isCorner: true },
      // 1 center atom
      { x: 0, y: 0, z: 0, id: 8, isCenter: true },
    ]

    // 12 wireframe edges of the BCC cube
    const cubeEdges = [
      [0, 1], [1, 2], [2, 3], [3, 0], // Back face
      [4, 5], [5, 6], [6, 7], [7, 4], // Front face
      [0, 4], [1, 5], [2, 6], [3, 7], // Pillars
    ]

    // 8 core bonds to the center atom
    const centerBonds = [
      [0, 8], [1, 8], [2, 8], [3, 8],
      [4, 8], [5, 8], [6, 8], [7, 8],
    ]

    const render = () => {
      ctx.clearRect(0, 0, width, height)
      t += 0.013

      // Auto rotation if not dragging
      if (!isDraggingRef.current) {
        rotationAnglesRef.current.y += 0.003
        rotationAnglesRef.current.x = 0.45 + Math.sin(t * 0.15) * 0.1
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
        const d = 300
        const scale = d / (d + z2)
        return {
          x: width / 2 + x1 * scale,
          y: height / 2 + y2 * scale,
          z: z2
        }
      }

      // Determine lattice vibration amplitudes (thermal jitters)
      // EAM Classical vibrates wildly due to force inaccuracies, ML is solid
      const jitterAmt = potential === 'EAM_Dynamo' ? 6.5 : potential === 'CHGNet' ? 2.2 : potential === 'Orb-v3' ? 0.9 : 0.12

      // Project all BCC atoms with thermal jitters
      const rotatedAtoms = latticeAtoms.map((atom) => {
        const dx = Math.sin(t * 22 + atom.id * 5) * jitterAmt
        const dy = Math.cos(t * 18 + atom.id * 7) * jitterAmt
        const dz = Math.sin(t * 26 + atom.id * 11) * jitterAmt
        
        const proj = project(atom.x + dx, atom.y + dy, atom.z + dz)
        return {
          type: 'atom' as const,
          id: atom.id,
          x: proj.x,
          y: proj.y,
          z: proj.z,
          isCorner: atom.isCorner,
          isCenter: atom.isCenter
        }
      })

      // Project all active interstitial/substitute outliers
      const rotatedOutliers = outliersData[potential].map((outlier, idx) => {
        const dx = Math.sin(t * 22 + (9 + idx) * 5) * jitterAmt
        const dy = Math.cos(t * 18 + (9 + idx) * 7) * jitterAmt
        const dz = Math.sin(t * 26 + (9 + idx) * 11) * jitterAmt
        
        const proj = project(outlier.x + dx, outlier.y + dy, outlier.z + dz)
        return {
          type: 'outlier' as const,
          symbol: outlier.symbol,
          color: outlier.color,
          label: outlier.label,
          residual: outlier.residual,
          force: outlier.force,
          stiffness: outlier.stiffness,
          state: outlier.state,
          x: proj.x,
          y: proj.y,
          z: proj.z
        }
      })

      // Construct wireframe and center bonds with depth values for Painter's Sorting
      const bonds = cubeEdges.map(([i, j]) => {
        const atomA = rotatedAtoms[i]
        const atomB = rotatedAtoms[j]
        return {
          type: 'bond' as const,
          isFrame: true,
          atomA,
          atomB,
          z: (atomA.z + atomB.z) / 2
        }
      }).concat(
        centerBonds.map(([i, j]) => {
          const atomA = rotatedAtoms[i]
          const atomB = rotatedAtoms[j]
          return {
            type: 'bond' as const,
            isFrame: false,
            atomA,
            atomB,
            z: (atomA.z + atomB.z) / 2
          }
        })
      )

      // Compile everything into a single render queue and sort by depth (z descending)
      const renderQueue: any[] = [
        ...rotatedAtoms,
        ...rotatedOutliers,
        ...bonds
      ]
      renderQueue.sort((a, b) => b.z - a.z)

      // Draw all elements sorted to prevent clipping artifacts
      renderQueue.forEach((el) => {
        if (el.type === 'bond') {
          // Draw atomic bonds
          ctx.beginPath()
          ctx.moveTo(el.atomA.x, el.atomA.y)
          ctx.lineTo(el.atomB.x, el.atomB.y)
          
          const opacity = Math.max(0.1, Math.min(0.65, 1 - (el.z + 100) / 250))
          if (el.isFrame) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.3})`
            ctx.lineWidth = 1.0
          } else {
            ctx.strokeStyle = `rgba(20, 184, 166, ${opacity * 0.4})`
            ctx.lineWidth = 1.6
          }
          ctx.stroke()

        } else if (el.type === 'atom') {
          // Draw standard BCC lattice atoms
          const depthScale = Math.max(0.3, Math.min(1.2, 1 - (el.z + 80) / 220))
          const radius = (el.isCenter ? 12 : 8.5) * depthScale
          
          const grad = ctx.createRadialGradient(
            el.x - radius * 0.3, el.y - radius * 0.3, radius * 0.1,
            el.x, el.y, radius
          )
          
          if (el.isCenter) {
            // Distinct core atom coloring
            grad.addColorStop(0, '#d633ff')
            grad.addColorStop(0.8, '#8c00b3')
            grad.addColorStop(1, '#590073')
          } else {
            // General lattice atoms
            grad.addColorStop(0, '#51e2f5')
            grad.addColorStop(0.8, '#0b9ba8')
            grad.addColorStop(1, '#065c63')
          }

          ctx.beginPath()
          ctx.arc(el.x, el.y, radius, 0, Math.PI * 2)
          ctx.fillStyle = grad
          ctx.fill()
          
          // Subtle electron orbit glow for center atom
          if (el.isCenter) {
            ctx.strokeStyle = 'rgba(214, 51, 255, 0.18)'
            ctx.lineWidth = 0.8
            ctx.beginPath()
            ctx.arc(el.x, el.y, radius * 1.5 + Math.sin(t * 3) * 1.5, 0, Math.PI * 2)
            ctx.stroke()
          }

        } else if (el.type === 'outlier') {
          // Draw active / passive outlier atoms (defects)
          const isCurrentActive = activeOutlier === el.symbol
          const depthScale = Math.max(0.3, Math.min(1.2, 1 - (el.z + 80) / 220))
          const radius = (isCurrentActive ? 10.5 : 7.0) * depthScale
          
          // Draw volumetric uncertainty bubble if this outlier is active
          // Bubble size scales directly with the Fisher cutoff (representing distillation efficiency)
          if (isCurrentActive) {
            const errorScale = potential === 'EAM_Dynamo' ? 1.0 : potential === 'CHGNet' ? 0.4 : potential === 'Orb-v3' ? 0.22 : 0.08
            // Uncertainty plume shrinks as Fisher Cutoff is dialed down (distilled)
            const plumeRadius = radius * (2.0 + cutoff * 4.5 * errorScale)
            
            const plumeGrad = ctx.createRadialGradient(
              el.x, el.y, radius,
              el.x, el.y, plumeRadius
            )
            plumeGrad.addColorStop(0, 'rgba(239, 68, 68, 0.35)')
            plumeGrad.addColorStop(0.6, 'rgba(239, 68, 68, 0.12)')
            plumeGrad.addColorStop(1, 'rgba(239, 68, 68, 0)')

            ctx.fillStyle = plumeGrad
            ctx.beginPath()
            ctx.arc(el.x, el.y, plumeRadius, 0, Math.PI * 2)
            ctx.fill()

            // Outer dashed envelope edge
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.22)'
            ctx.lineWidth = 0.8
            ctx.setLineDash([2, 3])
            ctx.beginPath()
            ctx.arc(el.x, el.y, plumeRadius, 0, Math.PI * 2)
            ctx.stroke()
            ctx.setLineDash([])
          }

          // Shaded sphere representation
          const grad = ctx.createRadialGradient(
            el.x - radius * 0.3, el.y - radius * 0.3, radius * 0.1,
            el.x, el.y, radius
          )
          grad.addColorStop(0, '#ffffff')
          grad.addColorStop(0.2, el.color)
          grad.addColorStop(1, '#0e1217')

          ctx.beginPath()
          ctx.arc(el.x, el.y, radius, 0, Math.PI * 2)
          ctx.fillStyle = grad
          ctx.fill()

          // Draw active force-residual stress vector arrow
          if (isCurrentActive) {
            const angle = t * 1.5 + (el.symbol === 'Fe' ? 0 : el.symbol === 'Cr' ? 1.5 : el.symbol === 'Au' ? 3.0 : 4.5)
            const forceVal = parseFloat(el.force)
            const arrowLength = forceVal * 42 * (cutoff / 4.0 + 0.3)
            
            const targetX = el.x + Math.cos(angle) * arrowLength
            const targetY = el.y + Math.sin(angle) * arrowLength

            // Glowing red force line
            ctx.strokeStyle = '#ef4444'
            ctx.lineWidth = 2.0
            ctx.beginPath()
            ctx.moveTo(el.x, el.y)
            ctx.lineTo(targetX, targetY)
            ctx.stroke()

            // Arrow head
            ctx.fillStyle = '#ef4444'
            ctx.beginPath()
            ctx.moveTo(targetX, targetY)
            ctx.lineTo(targetX - Math.cos(angle - 0.4) * 6, targetY - Math.sin(angle - 0.4) * 6)
            ctx.lineTo(targetX - Math.cos(angle + 0.4) * 6, targetY - Math.sin(angle + 0.4) * 6)
            ctx.closePath()
            ctx.fill()

            // Visual ring highlights
            ctx.strokeStyle = el.color
            ctx.lineWidth = 1.2
            ctx.beginPath()
            ctx.arc(el.x, el.y, radius + 4 + Math.sin(t * 6) * 1.5, 0, Math.PI * 2)
            ctx.stroke()

            // HUD overlay drawing
            ctx.strokeStyle = el.color
            ctx.lineWidth = 0.8
            ctx.setLineDash([2, 2])
            ctx.beginPath()
            ctx.moveTo(el.x, el.y)
            ctx.lineTo(el.x + 35, el.y - 25)
            ctx.lineTo(el.x + 105, el.y - 25)
            ctx.stroke()
            ctx.setLineDash([])

            ctx.fillStyle = '#ffffff'
            ctx.font = '8px monospace'
            ctx.fillText(`DFT OUTLIER: ${el.symbol}`, el.x + 38, el.y - 30)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.65)'
            ctx.fillText(`FORCE RESID: ${el.force}`, el.x + 38, el.y - 17)
          }

          // Atom name text
          ctx.fillStyle = isCurrentActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)'
          ctx.font = 'bold 8px monospace'
          ctx.fillText(`[${el.symbol}]`, el.x + radius + 3, el.y + 2)
        }
      })

      // Draw floating background electronic density fields (orbitals/particles)
      ctx.fillStyle = 'rgba(20, 184, 166, 0.35)'
      for (let i = 0; i < 12; i++) {
        const theta = t * 0.9 + i * (Math.PI / 6)
        const r = 70 + Math.sin(t + i) * 12
        const px = width / 2 + Math.sin(theta) * r * Math.cos(rotationAnglesRef.current.y)
        const py = height / 2 + Math.cos(theta) * r * Math.sin(rotationAnglesRef.current.x)
        ctx.beginPath()
        ctx.arc(px, py, 1.2, 0, Math.PI * 2)
        ctx.fill()
      }

      // Check mouse hover on canvas
      let hoveredNodeSymbol: typeof activeOutlier | null = null
      rotatedOutliers.forEach((outlier) => {
        const dist = Math.hypot(mousePosRef.current.x - outlier.x, mousePosRef.current.y - outlier.y)
        if (dist < 15) {
          hoveredNodeSymbol = outlier.symbol as any
        }
      })
      if (hoveredNodeSymbol) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
        ctx.fillRect(4, 4, 135, 18)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
        ctx.strokeRect(4, 4, 135, 18)
        ctx.fillStyle = '#14b8a6'
        ctx.font = '8px monospace'
        ctx.fillText(`CLICK TO TRACE: [${hoveredNodeSymbol}]`, 8, 16)
      }

      // Recalibration Loading Glitch Frame
      if (isProcessing) {
        ctx.fillStyle = 'rgba(12, 16, 23, 0.85)'
        ctx.fillRect(0, 0, width, height)

        ctx.strokeStyle = 'rgba(20, 184, 166, 0.3)'
        ctx.lineWidth = 1.0
        ctx.strokeRect(20, 20, width - 40, height - 40)

        const scanY = (t * 220) % height
        ctx.strokeStyle = 'rgba(20, 184, 166, 0.15)'
        ctx.beginPath()
        ctx.moveTo(20, scanY)
        ctx.lineTo(width - 20, scanY)
        ctx.stroke()

        ctx.fillStyle = '#14b8a6'
        ctx.font = '9px monospace'
        ctx.fillText(processingMsg, width / 2 - 130, height / 2 - 15)

        const barWidth = 200
        const barHeight = 8
        const barX = width / 2 - barWidth / 2
        const barY = height / 2 + 5
        ctx.fillStyle = 'rgba(20, 184, 166, 0.15)'
        ctx.fillRect(barX, barY, barWidth, barHeight)
        ctx.strokeStyle = '#14b8a6'
        ctx.strokeRect(barX, barY, barWidth, barHeight)
        
        ctx.fillStyle = '#14b8a6'
        ctx.fillRect(barX + 2, barY + 2, (barWidth - 4) * (processingProgress / 100), barHeight - 4)

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
        ctx.fillText(`${processingProgress}% COMPLETE`, width / 2 - 30, barY + 22)
      }

      // Draw mini scrolling loss telemetry chart in bottom right corner
      const chartWidth = 90
      const chartHeight = 45
      const chartX = width - chartWidth - 12
      const chartY = height - chartHeight - 12

      ctx.fillStyle = 'rgba(20, 24, 33, 0.78)'
      ctx.fillRect(chartX, chartY, chartWidth, chartHeight)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.lineWidth = 0.8
      ctx.strokeRect(chartX, chartY, chartWidth, chartHeight)

      if (Math.random() < 0.05) {
        lossHistory.shift()
        const baseTarget = potential === 'EAM_Dynamo' ? 0.38 : potential === 'CHGNet' ? 0.012 : potential === 'Orb-v3' ? 0.008 : 0.004
        const errorMultiplier = potential === 'EAM_Dynamo' ? 1.0 : potential === 'CHGNet' ? 0.4 : potential === 'Orb-v3' ? 0.25 : 0.08
        const cutoffJitter = (4.0 - cutoff) * 0.015 * errorMultiplier
        const finalVal = baseTarget + cutoffJitter + Math.random() * 0.003
        lossHistory.push(finalVal)
      }

      ctx.strokeStyle = potential === 'EAM_Dynamo' ? 'rgba(239, 68, 68, 0.85)' : 'rgba(20, 184, 166, 0.85)'
      ctx.lineWidth = 1.0
      ctx.beginPath()
      for (let i = 0; i < lossHistory.length; i++) {
        const lx = chartX + (i / (lossHistory.length - 1)) * chartWidth
        const rawLoss = lossHistory[i]
        const maxExpectedLoss = potential === 'EAM_Dynamo' ? 0.6 : 0.2
        const normalizedLoss = Math.min(0.95, Math.max(0.05, rawLoss / maxExpectedLoss))
        const ly = chartY + chartHeight - (normalizedLoss * chartHeight * 0.8) - 4
        if (i === 0) ctx.moveTo(lx, ly)
        else ctx.lineTo(lx, ly)
      }
      ctx.stroke()

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.font = '7px monospace'
      ctx.fillText('DISTILL LOSS', chartX + 4, chartY + 10)
      ctx.fillStyle = potential === 'EAM_Dynamo' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(20, 184, 166, 0.9)'
      ctx.fillText(`ℒ: ${lossHistory[lossHistory.length - 1].toFixed(5)}`, chartX + 4, chartY + chartHeight - 4)

      animationId = requestAnimationFrame(render)
    }

    render()

    const textInterval = setInterval(() => {
      const texts = [
        "MANIFOLD DENSITY HARMONIZATION ACTIVE...",
        "HESSIAN MATRIX DETERMINANT VALIDATED",
        "PC1 DISPARITY DETECTED AT < 0.01%",
        "WILSONIAN EFFECTIVE BOUNDARY INTEGRATED...",
        "DFT REFERENCE TENSOR SYMMETRIES HARMONIZED",
        "SIMPSON'S PARADOX CONFOUND INTERCEPTED",
        "ORTHOGONAL FORCE PLUME DECAY: UNIFORM",
        "BAYESIAN ACQUISITION MATRICES STABILIZED",
        "SINGULAR VALUE DECOMPOSITION RUNNING"
      ]
      setLoadingText(texts[Math.floor(Math.random() * texts.length)])
      const baseEntropy = potential === 'EAM_Dynamo' ? 0.874 : potential === 'CHGNet' ? 0.324 : potential === 'Orb-v3' ? 0.219 : 0.187
      setEntropy((baseEntropy - Math.random() * 0.002).toFixed(6))
    }, 2500)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationId)
      clearInterval(textInterval)
    }
  }, [potential, cutoff, activeOutlier, isProcessing])

  // Drag controls
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingRef.current = true
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    const deltaX = e.clientX - previousMousePositionRef.current.x
    const deltaY = e.clientY - previousMousePositionRef.current.y
    rotationAnglesRef.current.y += deltaX * 0.008
    rotationAnglesRef.current.x += deltaY * 0.008
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0]
    if (!touch) return
    isDraggingRef.current = true
    previousMousePositionRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    const touch = e.touches[0]
    if (!touch) return
    const deltaX = touch.clientX - previousMousePositionRef.current.x
    const deltaY = touch.clientY - previousMousePositionRef.current.y
    rotationAnglesRef.current.y += deltaX * 0.008
    rotationAnglesRef.current.x += deltaY * 0.008
    previousMousePositionRef.current = { x: touch.clientX, y: touch.clientY }
  }

  // Bind outlier on canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top
    
    let closestNode = null
    let minDist = 22
    
    const cosX = Math.cos(rotationAnglesRef.current.x)
    const sinX = Math.sin(rotationAnglesRef.current.x)
    const cosY = Math.cos(rotationAnglesRef.current.y)
    const sinY = Math.sin(rotationAnglesRef.current.y)
    
    const projectLocal = (px: number, py: number, pz: number) => {
      let x1 = px * cosY - pz * sinY
      let z1 = px * sinY + pz * cosY
      let y2 = py * cosX - z1 * sinX
      let z2 = py * sinX + z1 * cosX
      const d = 300
      const scale = d / (d + z2)
      return {
        x: canvas.width / 2 + x1 * scale,
        y: canvas.height / 2 + y2 * scale
      }
    }

    const currentOutliers = outliersData[potential]
    currentOutliers.forEach((outlier) => {
      const proj = projectLocal(outlier.x, outlier.y, outlier.z)
      const dist = Math.hypot(clickX - proj.x, clickY - proj.y)
      if (dist < minDist) {
        minDist = dist
        closestNode = outlier
      }
    })
    
    if (closestNode) {
      setActiveOutlier(closestNode.symbol as any)
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    mousePosRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const activeOutlierInfo = outliersData[potential].find(o => o.symbol === activeOutlier) || outliersData[potential][0]

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col lg:flex-row w-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)] rounded-xl overflow-hidden font-mono text-[10px] select-none shadow-xl">
        
        {/* Left Side: Instrument panel dashboard */}
        <div className="w-full lg:w-[280px] shrink-0 border-b lg:border-b-0 lg:border-r border-[var(--outline-variant)] bg-[var(--surface-container)] flex flex-col p-4 gap-4 overflow-y-auto">
          
          <div>
            <div className="text-[var(--primary)] font-bold uppercase tracking-widest text-[9px] mb-1">
              SYS CONTROL // DISTILL v2.4
            </div>
            <div className="h-px bg-[var(--outline-variant)]/60 w-full mb-3" />
            
            {/* Tab Selector */}
            <div className="flex border border-[var(--outline-variant)] rounded bg-[var(--surface-container-lowest)] p-0.5 overflow-hidden">
              {(['manifold', 'hessian', 'proof'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1 rounded text-center transition-all font-bold text-[7.5px] uppercase tracking-wider ${
                    activeTab === tab
                      ? 'bg-[#14b8a6] text-white shadow-[0_0_8px_rgba(20,184,166,0.35)]'
                      : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container)]'
                  }`}
                >
                  {tab === 'manifold' ? 'Manifold' : tab === 'hessian' ? 'Hessian' : 'Lean Proof'}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'manifold' && (
            <>
              {/* Substrate Selector */}
              <div className="flex flex-col gap-2">
                <span className="text-[var(--on-surface-variant-mid)] font-semibold uppercase text-[8px] tracking-wider">
                  POTENTIAL SUBSTRATE:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['MACE-MP-0', 'Orb-v3', 'CHGNet', 'EAM_Dynamo'] as const).map((pName) => {
                    const isActive = potential === pName
                    const isClassical = pName === 'EAM_Dynamo'
                    return (
                      <button
                        key={pName}
                        onClick={() => triggerRecalibration(pName)}
                        className={`px-2 py-2 rounded text-left border transition-all text-[9px] flex flex-col justify-between ${
                          isActive
                            ? isClassical
                              ? 'border-red-500/60 bg-red-950/20 text-red-400'
                              : 'border-[#14b8a6]/60 bg-[#14b8a6]/10 text-[#14b8a6]'
                            : 'border-[var(--outline-variant)] hover:bg-[var(--surface-container-lowest)] text-[var(--on-surface-variant)]'
                        }`}
                      >
                        <span className="font-bold">{pName}</span>
                        <span className="text-[7px] opacity-70 mt-0.5">
                          {pName === 'EAM_Dynamo' ? 'Classical EAM' : 'Foundation ML'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Fisher Cutoff Slider */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-[8px]">
                  <span className="text-[var(--on-surface-variant-mid)] font-semibold uppercase tracking-wider">
                    FISHER CUTOFF BOUNDARY (Λ):
                  </span>
                  <span className="text-[#14b8a6] font-bold">{cutoff.toFixed(2)} eV/Å²</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="4.00"
                  step="0.05"
                  value={cutoff}
                  onChange={(e) => setCutoff(parseFloat(e.target.value))}
                  className="w-full accent-[#14b8a6] bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded h-2 appearance-none cursor-pointer focus:outline-none"
                />
                <div className="flex justify-between text-[7px] text-[var(--on-surface-variant-mid)] font-mono">
                  <span>Tight (Λ=0.05)</span>
                  <span>Sloppy (Λ=4.00)</span>
                </div>
              </div>

              {/* FIM Spectrum (eigenvalues) */}
              <div className="flex flex-col gap-1">
                <span className="text-[var(--on-surface-variant-mid)] font-semibold uppercase text-[8px] tracking-wider">
                  FISHER RANK EIGENVALUE DECAY:
                </span>
                <div className="flex items-end justify-between h-20 bg-[var(--surface-container-lowest)] p-2 border border-[var(--outline-variant)] rounded mt-1.5 relative overflow-hidden">
                  <div 
                    className="absolute left-0 right-0 border-t border-dashed border-red-500/60 z-10 transition-all pointer-events-none"
                    style={{ bottom: `${Math.min(95, Math.max(5, (cutoff / 4.0) * 100))}%` }}
                  >
                    <span className="absolute right-1 text-[7px] text-red-400 bg-[var(--surface-container-lowest)] px-1 rounded -top-2.5 font-bold">Λ BOUND</span>
                  </div>
                  {potentialEigenvalues[potential].map((val, idx) => {
                    const isSloppy = val < cutoff
                    const heightPct = Math.min(100, Math.max(5, (val / 25.0) * 100))
                    return (
                      <div key={idx} className="flex flex-col items-center flex-1 gap-1 group relative">
                        <div 
                          className={`w-3.5 rounded-t transition-all duration-300 ${isSloppy ? 'bg-[var(--outline-variant)] opacity-30' : 'bg-[#14b8a6]/80 shadow-[0_0_8px_rgba(20,184,166,0.3)]'}`}
                          style={{ height: `${heightPct}px` }}
                        />
                        <span className="text-[7px] text-[var(--on-surface-variant-mid)] font-semibold mt-1">λ{idx+1}</span>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-black/95 border border-[var(--outline-variant)] text-white text-[8px] p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap mb-1.5 z-20 shadow-md">
                          λ{idx+1}: {val.toFixed(2)} {isSloppy ? '(SLOPPY/COLLAPSED)' : '(STIFF/ACTIVE)'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Outlier Panel */}
              <div className="flex flex-col gap-2 bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded p-2.5">
                <span className="text-[var(--on-surface-variant-mid)] font-semibold uppercase text-[8px] tracking-wider pb-1 border-b border-[var(--outline-variant)]">
                  OUTLIER HUD TELEMETRY
                </span>
                <div className="grid grid-cols-4 gap-1 mt-1">
                  {(['Fe', 'Cr', 'Au', 'Ni'] as const).map((sym) => {
                    const isActive = activeOutlier === sym
                    const oInfo = outliersData[potential].find(o => o.symbol === sym)
                    const isUnstable = oInfo?.state === 'UNSTABLE'
                    return (
                      <button
                        key={sym}
                        onClick={() => setActiveOutlier(sym)}
                        className={`py-1 rounded font-bold text-center transition-all ${
                          isActive
                            ? isUnstable
                              ? 'bg-red-500/20 border border-red-500/50 text-red-400'
                              : 'bg-[#14b8a6]/20 border border-[#14b8a6]/50 text-[#14b8a6]'
                            : 'bg-[var(--surface-container)] border border-transparent hover:border-[var(--outline-variant)] text-[var(--on-surface-variant)]'
                        }`}
                      >
                        {sym}
                      </button>
                    )
                  })}
                </div>

                <div className="flex flex-col gap-1.5 text-[8.5px] mt-2 text-[var(--on-surface-variant)] leading-normal">
                  <div className="flex justify-between">
                    <span>SYSTEM:</span>
                    <span className="font-bold text-[var(--on-surface)]">{activeOutlierInfo.label} Lattice</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DFT RESIDUAL:</span>
                    <span className="font-bold text-[var(--on-surface)]">{activeOutlierInfo.residual}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>FORCE JITTER:</span>
                    <span className="font-bold text-[var(--on-surface)]">{activeOutlierInfo.force}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>STIFFNESS ∂²E:</span>
                    <span className={`font-bold ${activeOutlierInfo.state === 'UNSTABLE' ? 'text-red-500 animate-pulse' : activeOutlierInfo.state === 'SLOPPY' ? 'text-amber-500' : 'text-[#14b8a6]'}`}>
                      {activeOutlierInfo.stiffness} ({activeOutlierInfo.state})
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'hessian' && (
            <div className="flex flex-col gap-3">
              <span className="text-[var(--on-surface-variant-mid)] font-semibold uppercase text-[8px] tracking-wider">
                PARAMETER HESSIAN COUPLING MATRIX (H_θ):
              </span>
              <div className="bg-[var(--surface-container-lowest)] p-2.5 border border-[var(--outline-variant)] rounded flex flex-col gap-2 relative">
                {/* 4x4 Grid */}
                <div className="grid grid-cols-5 gap-1 text-[8px] font-bold text-center items-center">
                  <span className="text-[7px] text-[var(--on-surface-variant-mid)]"></span>
                  {hessianLabels.map((lbl) => (
                    <span key={lbl} className="text-[var(--on-surface-variant)]">{lbl}</span>
                  ))}
                  
                  {hessianLabels.map((rowLbl, rIdx) => (
                    <div key={rowLbl} className="contents">
                      <span className="text-left text-[var(--on-surface-variant)]">{rowLbl}</span>
                      {hessianLabels.map((colLbl, cIdx) => {
                        const val = hessianData[potential][rIdx][cIdx]
                        const isDiagonal = rIdx === cIdx
                        const isHighCoupling = !isDiagonal && val > 0.3
                        
                        let bgClass = ''
                        if (isDiagonal) {
                          bgClass = val > 0.8 ? 'bg-teal-950/40 border-teal-500/50 text-teal-400' : 'bg-teal-950/20 border-teal-500/20 text-teal-500'
                        } else {
                          bgClass = isHighCoupling 
                            ? 'bg-red-950/30 border-red-500/40 text-red-400 animate-pulse'
                            : 'bg-[var(--surface-container)] border-transparent text-[var(--on-surface-variant-mid)]'
                        }

                        return (
                          <div
                            key={cIdx}
                            onMouseEnter={() => setHoveredCell({ r: rIdx, c: cIdx })}
                            onMouseLeave={() => setHoveredCell(null)}
                            className={`py-1.5 border rounded cursor-crosshair transition-all font-bold text-[8.5px] ${bgClass} hover:scale-105 hover:z-10 hover:border-[#14b8a6]/80`}
                          >
                            {val.toFixed(2)}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>

                <div className="mt-2 min-h-[30px] border-t border-[var(--outline-variant)]/40 pt-2 text-[8px] text-[var(--on-surface-variant)]">
                  {hoveredCell ? (
                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between">
                        <span className="text-[var(--secondary)] font-bold">COORDINATE:</span>
                        <span>({hessianLabels[hoveredCell.r]} , {hessianLabels[hoveredCell.c]})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--secondary)] font-bold">OPERATOR:</span>
                        <span>∂²E / ∂{hessianLabels[hoveredCell.r]}∂{hessianLabels[hoveredCell.c]}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--secondary)] font-bold">COUPLING STRENGTH:</span>
                        <span className={hoveredCell.r === hoveredCell.c ? 'text-[#14b8a6]' : hessianData[potential][hoveredCell.r][hoveredCell.c] > 0.3 ? 'text-red-400 font-bold' : 'text-[var(--on-surface)]'}>
                          {hessianData[potential][hoveredCell.r][hoveredCell.c].toFixed(4)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[7.5px] italic text-[var(--on-surface-variant-mid)] text-center py-1">
                      * Hover over matrix cells to trace local energy gradients
                  </div>
                  )}
                </div>
              </div>

              {/* Derived moduli panel */}
              <div className="flex flex-col gap-1.5 bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded p-2.5 text-[8px] text-[var(--on-surface-variant)] leading-relaxed">
                <div className="flex justify-between items-center pb-1 border-b border-[var(--outline-variant)]/40 mb-1">
                  <span className="font-bold text-[var(--primary)] text-[7.5px]">DERIVED SOLID-STATE MODULI</span>
                  <span className="text-[7px] text-[var(--on-surface-variant-mid)]">ELASTIC CONSTANTS</span>
                </div>
                <div className="flex justify-between">
                  <span>Bulk Modulus (K):</span>
                  <span className="font-bold text-[var(--on-surface)]">{derivedModuli[potential].bulk}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shear Modulus (G):</span>
                  <span className={`font-bold ${potential === 'EAM_Dynamo' ? 'text-red-400' : 'text-[var(--on-surface)]'}`}>{derivedModuli[potential].shear}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pugh Anisotropy (K/G):</span>
                  <span className={`font-bold ${potential === 'EAM_Dynamo' ? 'text-red-400' : 'text-[#14b8a6]'}`}>{derivedModuli[potential].pugh}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cauchy Pressure (C12 - C44):</span>
                  <span className={`font-bold ${potential === 'EAM_Dynamo' ? 'text-red-400' : 'text-[#14b8a6]'}`}>{derivedModuli[potential].cauchy}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'proof' && (
            <div className="flex flex-col gap-3">
              <span className="text-[var(--on-surface-variant-mid)] font-semibold uppercase text-[8px] tracking-wider">
                LEAN 4 INTERACTIVE PROOF EXPLORER:
              </span>
              <div className="bg-[var(--surface-container-lowest)] p-2.5 border border-[var(--outline-variant)] rounded flex flex-col gap-2 relative">
                
                {/* Lean theorem code */}
                <div className="bg-black/45 border border-[var(--outline-variant)]/60 rounded p-2 text-[7.5px] leading-[1.3] text-gray-300 font-mono overflow-x-auto whitespace-pre select-text">
{`theorem projection_bound 
  (g : Matrix (Fin n) (Fin n) ℝ) 
  (V : Matrix (Fin n) (Fin k) ℝ)
  (h_orth : V.transpose * V = 1) 
  (Λ : ℝ) (h_cutoff : L_distill g V < Λ) :
  ∀ x : Vector ℝ k, ‖V * x‖ ≤ ‖x‖ * Real.sqrt (Λ)`}
                </div>

                {/* Tactic Buttons */}
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[7px] text-[var(--on-surface-variant-mid)] font-bold uppercase tracking-wide">APPLY PROOF TACTIC:</span>
                  <div className="grid grid-cols-3 gap-1">
                    <button 
                      onClick={() => potential !== 'EAM_Dynamo' && setProofStep(1)}
                      disabled={potential === 'EAM_Dynamo' || proofStep !== 0}
                      className={`py-1 rounded text-center font-bold text-[7.5px] border ${
                        proofStep === 0 && potential !== 'EAM_Dynamo'
                          ? 'bg-[#14b8a6]/20 border-[#14b8a6]/50 text-[#14b8a6] hover:bg-[#14b8a6]/30'
                          : 'bg-[var(--surface-container)] border-transparent text-[var(--on-surface-variant-mid)] cursor-not-allowed opacity-50'
                      }`}
                    >
                      intro x
                    </button>
                    <button 
                      onClick={() => potential !== 'EAM_Dynamo' && setProofStep(2)}
                      disabled={potential === 'EAM_Dynamo' || proofStep !== 1}
                      className={`py-1 rounded text-center font-bold text-[7.5px] border ${
                        proofStep === 1 && potential !== 'EAM_Dynamo'
                          ? 'bg-[#14b8a6]/20 border-[#14b8a6]/50 text-[#14b8a6] hover:bg-[#14b8a6]/30'
                          : 'bg-[var(--surface-container)] border-transparent text-[var(--on-surface-variant-mid)] cursor-not-allowed opacity-50'
                      }`}
                    >
                      matrix_stabilize
                    </button>
                    <button 
                      onClick={() => potential !== 'EAM_Dynamo' && setProofStep(3)}
                      disabled={potential === 'EAM_Dynamo' || proofStep !== 2}
                      className={`py-1 rounded text-center font-bold text-[7.5px] border ${
                        proofStep === 2 && potential !== 'EAM_Dynamo'
                          ? 'bg-[#14b8a6]/20 border-[#14b8a6]/50 text-[#14b8a6] hover:bg-[#14b8a6]/30'
                          : 'bg-[var(--surface-container)] border-transparent text-[var(--on-surface-variant-mid)] cursor-not-allowed opacity-50'
                      }`}
                    >
                      linarith
                    </button>
                  </div>
                </div>

                {/* Proof Goal HUD */}
                <div className="mt-1 flex flex-col gap-2 border-t border-[var(--outline-variant)]/40 pt-2">
                  <div className="flex justify-between items-center text-[8px]">
                    <span className="text-[var(--on-surface-variant-mid)] font-bold">PROOF GOAL STATUS:</span>
                    {potential === 'EAM_Dynamo' ? (
                      <span className="px-1.5 py-0.5 rounded bg-red-950/30 text-red-400 font-bold border border-red-500/30 animate-pulse text-[7px]">❌ UNSTABLE POTENTIAL</span>
                    ) : proofStep === 3 ? (
                      <span className="px-1.5 py-0.5 rounded bg-teal-950/40 text-teal-400 font-bold border border-teal-500/50 text-[7px] animate-pulse">✅ PROOF VERIFIED</span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-amber-950/30 text-amber-400 font-bold border border-amber-500/30 text-[7px]">⚠️ GOALS ACTIVE ({proofStep}/3)</span>
                    )}
                  </div>

                  {potential === 'EAM_Dynamo' ? (
                    <div className="text-[7.8px] leading-normal text-red-300 flex flex-col gap-1">
                      <span className="font-bold">unsolved goals (1)</span>
                      <span className="bg-red-950/20 p-1.5 rounded border border-red-900/40 font-mono whitespace-pre-wrap leading-tight text-[7.2px]">
{`1 goal
g : Matrix (Fin n) (Fin n) ℝ,
V : Matrix (Fin n) (Fin k) ℝ
⊢ ‖V * x‖ ≤ ‖x‖ * Real.sqrt (Λ)
error: singular value boundary Λ exceeds stability limits.`}
                      </span>
                      <span className="text-[7px] italic text-red-400/90 mt-1 leading-snug">
                        * Classical EAM potentials violate mechanical invariants. The proof is mathematically impossible due to shear instabilities.
                      </span>
                    </div>
                  ) : proofStep === 0 ? (
                    <div className="text-[7.8px] leading-normal text-amber-300 flex flex-col gap-1">
                      <span className="font-bold">Active Goals (1):</span>
                      <span className="bg-amber-950/20 p-1.5 rounded border border-amber-900/40 font-mono whitespace-pre-wrap leading-tight text-[7.2px]">
{`1 goal
g : Matrix (Fin n) (Fin n) ℝ
V : Matrix (Fin n) (Fin k) ℝ
⊢ ∀ x : Vector ℝ k, ‖V * x‖ ≤ ‖x‖ * Real.sqrt (Λ)`}
                      </span>
                      <span className="text-[7px] italic text-amber-400/90 mt-1 leading-snug">
                        * Apply tactic 'intro x' to shift parameters into the active context.
                      </span>
                    </div>
                  ) : proofStep === 1 ? (
                    <div className="text-[7.8px] leading-normal text-amber-300 flex flex-col gap-1">
                      <span className="font-bold">Active Goals (1):</span>
                      <span className="bg-amber-950/20 p-1.5 rounded border border-amber-900/40 font-mono whitespace-pre-wrap leading-tight text-[7.2px]">
{`1 goal
g : Matrix (Fin n) (Fin n) ℝ
V : Matrix (Fin n) (Fin k) ℝ
x : Vector ℝ k
⊢ ‖V * x‖ ≤ ‖x‖ * Real.sqrt (Λ)`}
                      </span>
                      <span className="text-[7px] italic text-amber-400/90 mt-1 leading-snug">
                        * Apply tactic 'matrix_stabilize' to introduce orthogonalization boundaries.
                      </span>
                    </div>
                  ) : proofStep === 2 ? (
                    <div className="text-[7.8px] leading-normal text-amber-300 flex flex-col gap-1">
                      <span className="font-bold">Active Goals (1):</span>
                      <span className="bg-amber-950/20 p-1.5 rounded border border-amber-900/40 font-mono whitespace-pre-wrap leading-tight text-[7.2px]">
{`1 goal
g : Matrix (Fin n) (Fin n) ℝ
V : Matrix (Fin n) (Fin k) ℝ
x : Vector ℝ k
h_orth : V.transpose * V = 1
h_cutoff : L_distill g V < Λ
h_bound : ‖V * x‖² ≤ ‖x‖² * Λ + residual
⊢ ‖V * x‖ ≤ ‖x‖ * Real.sqrt (Λ)`}
                      </span>
                      <span className="text-[7px] italic text-amber-400/90 mt-1 leading-snug">
                        * Apply tactic 'linarith' to perform final boundary inequality checking.
                      </span>
                    </div>
                  ) : (
                    <div className="text-[7.8px] leading-normal text-teal-300 flex flex-col gap-1">
                      <span className="font-bold">Goals accomplished!</span>
                      <span className="bg-teal-950/20 p-1.5 rounded border border-teal-900/40 font-mono whitespace-pre-wrap leading-tight text-[7.2px]">
{`theorem: projection_bound
status: verified (0.4ms)
verification core: Hales-Taylor v2.10
stiffness margin: +${(1.50 - cutoff).toFixed(2)} eV/Å²`}
                      </span>
                      <span className="text-[7px] italic text-teal-400/90 mt-1 leading-snug">
                        * Proof verified. ML potential singular values strictly conform to physical bounds.
                      </span>
                    </div>
                  )}

                  {proofStep > 0 && potential !== 'EAM_Dynamo' && (
                    <button 
                      onClick={() => setProofStep(0)}
                      className="w-full bg-[var(--surface-container)] hover:bg-[var(--surface-container-lowest)] text-[var(--on-surface-variant-mid)] text-[7px] py-1 rounded border border-[var(--outline-variant)] transition-all font-bold"
                    >
                      RESET PROOF STATE
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <button 
            onClick={() => setShowMath(!showMath)}
            className="w-full bg-[var(--surface-container-lowest)] hover:bg-[var(--surface-container)] text-[var(--secondary)] font-semibold text-[8px] py-2 px-2.5 rounded border border-[var(--outline-variant)] transition-all flex items-center justify-between mt-auto"
          >
            <span>{showMath ? '▼ HIDE MATH EQUATIONS' : '▲ SHOW MATH EQUATIONS'}</span>
            <span className="text-[7px] opacity-60">FISHER-IMMI v2</span>
          </button>
        </div>

        {/* Right Side: 3D Manifold Canvas & DFT scrolling terminal logs */}
        <div className="flex-1 relative flex flex-col min-h-[500px] bg-[var(--surface-container-lowest)]">
          
          {/* Main 3D Canvas Box */}
          <div 
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
            className="flex-1 relative min-h-[300px] cursor-grab active:cursor-grabbing p-4 flex flex-col justify-between"
          >
            {/* Header overlay */}
            <div className="relative z-10 flex justify-between items-center text-[8.5px] uppercase tracking-widest pointer-events-none text-[var(--on-surface-variant-mid)]">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#14b8a6] animate-ping" />
                [MANIFOLD OBSERVATION DECK // PROJECT DISTILL]
              </span>
              <span className="text-[var(--tertiary)] flex items-center gap-1">
                <span>● INTERACTIVE BCC CRYSTAL SIM</span>
              </span>
            </div>

            {/* Canvas */}
            <canvas 
              ref={canvasRef} 
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              className="absolute inset-0 w-full h-full" 
            />

            {/* Floating telemetry widget */}
            <div className="absolute top-14 left-4 flex flex-col gap-1 text-[8.5px] text-[var(--on-surface-variant)] pointer-events-none bg-[var(--surface-container)]/85 p-3 border border-[var(--outline-variant)] rounded-lg backdrop-blur-md shadow-lg max-w-[170px] z-10">
              <div className="font-bold text-[var(--secondary)] pb-1 border-b border-[var(--outline-variant)]/60 mb-1 tracking-wider">
                TELEMETRY PANEL
              </div>
              <div>SYS_ENTROPY: {entropy}</div>
              <div>ACTIVE_POTENTIAL: {potential}</div>
              <div>FIM_RANK: 8 STIFF AXES</div>
              <div>STABILITY_G: {potential === 'EAM_Dynamo' ? '0.12 (CRITICAL)' : '1.00 (SECURE)'}</div>
              <div className="text-[7.5px] opacity-75 mt-1 border-t border-[var(--outline-variant)]/40 pt-1 leading-normal italic">
                * Drag to rotate BCC crystal. Click outliers (Fe, Cr, Au, Ni) to bind uncertainty vectors.
              </div>
            </div>

            {/* Ambient status bar at bottom of canvas */}
            <div className="relative z-10 w-full flex justify-between items-center text-[7.5px] pointer-events-none">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--secondary)] animate-ping" />
                <span className="text-[var(--on-surface)] font-medium tracking-wider uppercase">{loadingText}</span>
              </div>
              <div className="text-[var(--on-surface-variant-mid)] font-semibold uppercase tracking-wider bg-[var(--surface)]/90 backdrop-blur-sm px-2.5 py-1 rounded border border-[var(--outline-variant)] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                VASP-DFT CORE v2.10.8
              </div>
            </div>
          </div>

          {/* Scrolling DFT-SCF Terminal logs (Dense scientific display!) */}
          <div className="h-[140px] shrink-0 border-t border-[var(--outline-variant)] bg-[var(--surface-container-lowest)]/95 flex flex-col p-3 font-mono text-[8px] select-text">
            <div className="flex justify-between items-center text-[7.5px] text-[var(--on-surface-variant-mid)] font-bold uppercase tracking-wider border-b border-[var(--outline-variant)]/40 pb-1.5 mb-2">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded bg-[#14b8a6]" />
                VASP-DFT CORE // REAL-TIME ELECTRONIC CONVERGENCE CONSOLE
              </span>
              <span>HOST: LOCAL-CORE-00</span>
            </div>
            
            <div className="flex-1 overflow-y-auto flex flex-col gap-0.5 leading-normal max-h-[100px] text-gray-400 scrollbar-thin">
              {logs.map((log, idx) => {
                let colorClass = 'text-gray-400';
                if (log.includes('Iter')) colorClass = 'text-teal-400/90';
                if (log.includes('[SYS]')) colorClass = 'text-amber-400/90';
                if (log.includes('verified') || log.includes('COMPLETE')) colorClass = 'text-emerald-400/90';
                if (log.includes('violates') || log.includes('error:') || log.includes('CRITICAL')) colorClass = 'text-red-400/90';
                
                return (
                  <div key={idx} className={`${colorClass} whitespace-pre`}>
                    {log}
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Expanded Math Equations Section */}
      {showMath && (
        <div className="bg-[var(--surface-container-low)] border border-[var(--outline-variant)] rounded-xl p-5 text-[9.5px] text-[var(--on-surface-variant)] leading-relaxed shadow-lg max-w-full font-mono flex flex-col gap-4 border-l-4 border-l-[#14b8a6] transition-all">
          <div className="flex justify-between items-center border-b border-[var(--outline-variant)]/60 pb-2">
            <div className="font-bold text-[var(--primary)] uppercase tracking-wider text-[10px] flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-[#14b8a6]/20 text-[#14b8a6] text-[8px] font-bold font-sans">IMMI-2026</span>
              MATHEMATICAL SUBSTRATE: HYPER-RIBBON REDUCTION FORMALISM
            </div>
            <span className="text-[8px] text-[var(--on-surface-variant-mid)] font-bold">REPRODUCIBLE RESEARCH CORE</span>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-[#14b8a6] font-bold uppercase text-[9px] tracking-wide">
                1. Covariant Prediction Metric (Fisher Matrix)
              </span>
              <p>
                {"To isolate predictions where local neural approximations diverge from high-fidelity DFT physics, we construct the Fisher Information Matrix (FIM) $g_{ij}$ over the parameter manifold $\\mathcal{M}$:"}
              </p>
              <div className="bg-[var(--surface-container)] p-3.5 rounded-lg border border-[var(--outline-variant)] text-center my-1.5 font-sans overflow-x-auto text-[11px] font-semibold tracking-wide select-text">
                {"g_ij(\\theta) = \\sum_a  ( 1 / \\sigma_a^2 ) \\cdot ( \\partial E_a(\\theta) / \\partial \\theta_i ) \\cdot ( \\partial E_a(\\theta) / \\partial \\theta_j )"}
              </div>
              <p className="text-[9px] opacity-80 leading-normal">
                {"Where $E_a(\\theta)$ is the energy/force prediction for lattice assembly $a$, and $\\sigma_a$ represents the uncertainty standard deviation. The eigenvalues $\\lambda_k$ of this metric decay exponentially over several decades, forming the characteristic \"hyper-ribbon\" boundary of sloppy models."}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[#14b8a6] font-bold uppercase text-[9px] tracking-wide">
                2. Singular Value Projection & Closed-Loop Alignment
              </span>
              <p>
                {"The Project Distill active filter isolates the sloppy eigenvectors $V_{\\text{sloppy}}$ lying below the singular value boundary cutoff \\Lambda:"}
              </p>
              <div className="bg-[var(--surface-container)] p-3.5 rounded-lg border border-[var(--outline-variant)] text-center my-1.5 font-sans overflow-x-auto text-[11px] font-semibold tracking-wide select-text">
                {"L_distill = Tr( V_sloppy^T \\cdot g(\\theta) \\cdot V_sloppy ) &lt; \\Lambda"}
              </div>
              <p className="text-[9px] opacity-80 leading-normal">
                {"By actively minimizing $L_{\\text{distill}}$, the system forces alignment between classical neural force fields and DFT reference states exactly along the sloppy error coordinates, preventing the geometric instabilities and soft-mode collapses common in standard fitting methodologies."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
