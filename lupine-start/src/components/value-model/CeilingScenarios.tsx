import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import type { CeilingScenario, ValueModelData } from './types'

/**
 * The ceiling outcome distribution: 5 conditional scenarios from "scaled
 * as a 2010s software company" to "Replicator default infrastructure",
 * each with addressable value, capture %, multiple, implied EV, and
 * conditional probability.
 *
 * Renders as 5 stacked cards from floor to civilizational; each card
 * scales its visual weight (a horizontal value bar inside the card) to
 * its implied EV. Probability badges visible on each card. Closing line
 * states the conditional weighted EV across the 5 cells, with the
 * caveat that the 50% Pr(zero) sits underneath this distribution and
 * is priced explicitly in the math floor section.
 */

const SCENARIO_TINTS: Record<string, string> = {
  floor: '#94a3b8', // slate
  'mid-platform': '#3b82f6', // blue
  'upper-platform': '#4ecdc4', // teal
  civilizational: '#c4b5fd', // lavender
  'asymmetric-tail': '#f472b6', // pink (the moonshot tail)
}

export function CeilingScenarios({ data }: { data: ValueModelData }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })

  const scenarios = data.ceiling.scenarios.filter((s) => s.probability > 0)
  const maxEv = Math.max(...scenarios.map((s) => s.implied_ev_usd_b))
  const conditional = data.ceiling.weighted_ev_conditional_usd_b

  return (
    <div ref={ref} className="w-full">
      <div className="flex flex-col gap-3">
        {scenarios.map((s, i) => (
          <ScenarioCard
            key={s.id}
            scenario={s}
            maxEv={maxEv}
            inView={inView}
            delay={0.1 + i * 0.12}
          />
        ))}
      </div>

      {/* Conditional weighted EV summary */}
      <motion.div
        className="mt-8 rounded-md border border-[var(--secondary)] bg-[linear-gradient(135deg,rgba(78,205,196,0.10),rgba(78,205,196,0.02))] px-6 py-5 flex flex-col lg:flex-row lg:items-baseline gap-3 lg:gap-6"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-10% 0px' }}
        transition={{ duration: 0.5, delay: 0.25 }}
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--secondary)] flex-shrink-0">
          Conditional weighted EV
        </div>
        <div className="text-3xl lg:text-4xl font-semibold text-[var(--on-surface)] leading-none">
          ${conditional.toFixed(0)}B
        </div>
        <div className="text-xs text-[var(--on-surface-variant)] leading-relaxed lg:max-w-2xl">
          Probability-weighted across the five scenarios above, conditional on
          execution clearing the wind-down case. The 50% probability of zero
          (the company fails / acqui-hires below preference) is priced
          explicitly in the math-floor returns waterfall. This figure is
          what the upside actually looks like.
        </div>
      </motion.div>
    </div>
  )
}

function ScenarioCard({
  scenario,
  maxEv,
  inView,
  delay,
}: {
  scenario: CeilingScenario
  maxEv: number
  inView: boolean
  delay: number
}) {
  const tint = SCENARIO_TINTS[scenario.id] ?? '#94a3b8'
  const evPct = (scenario.implied_ev_usd_b / maxEv) * 100
  // Format: small values $X.XB, medium $XB, large $X.XT
  const formatEv = (v: number) =>
    v >= 1000 ? `$${(v / 1000).toFixed(1)}T` : v >= 10 ? `$${v.toFixed(0)}B` : `$${v.toFixed(1)}B`

  return (
    <motion.div
      className="relative rounded-md border border-[var(--outline-variant)] bg-[var(--surface-container)] overflow-hidden"
      initial={{ opacity: 0, x: -16 }}
      animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {/* Background scale-bar */}
      <motion.div
        className="absolute inset-y-0 left-0"
        style={{
          background: `linear-gradient(90deg, ${tint}22 0%, ${tint}08 100%)`,
        }}
        initial={{ width: 0 }}
        animate={inView ? { width: `${evPct}%` } : { width: 0 }}
        transition={{ duration: 1.0, delay: delay + 0.1, ease: [0.22, 0.61, 0.36, 1] }}
      />

      <div className="relative flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6 px-5 py-4">
        {/* Probability + name */}
        <div className="flex items-center gap-3 lg:flex-1 min-w-0">
          <span
            className="font-mono text-[11px] uppercase tracking-[0.08em] px-2 py-1 rounded flex-shrink-0"
            style={{ background: tint, color: '#0b1220' }}
          >
            P {(scenario.probability * 100).toFixed(0)}%
          </span>
          <span className="text-base lg:text-lg font-medium text-[var(--on-surface)] truncate">
            {scenario.name}
          </span>
        </div>

        {/* Capture × multiple = revenue */}
        <div className="font-mono text-[11px] text-[var(--on-surface-variant-mid)] flex-shrink-0 lg:min-w-[280px] tabular-nums">
          {scenario.addressable_value_usd_b > 0 && (
            <>
              <span className="text-[var(--on-surface-variant)]">
                ${(scenario.addressable_value_usd_b / 1000).toFixed(1)}T
              </span>
              <span className="mx-1.5">×</span>
              <span className="text-[var(--on-surface-variant)]">
                {scenario.capture_rate_pct.toFixed(2)}%
              </span>
              <span className="mx-1.5">×</span>
              <span className="text-[var(--on-surface-variant)]">
                {scenario.multiple.toFixed(0)}x
              </span>
              <span className="mx-1.5">=</span>
            </>
          )}
        </div>

        {/* Implied EV */}
        <div className="flex-shrink-0 text-right">
          <div
            className="text-2xl lg:text-3xl font-semibold leading-none tabular-nums"
            style={{ color: tint }}
          >
            {formatEv(scenario.implied_ev_usd_b)}
          </div>
          <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--on-surface-variant-mid)] font-mono mt-1">
            implied EV at {scenario.year_horizon}-yr horizon
          </div>
        </div>
      </div>
    </motion.div>
  )
}
