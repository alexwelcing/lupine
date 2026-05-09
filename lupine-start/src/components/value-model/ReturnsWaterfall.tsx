import { Group } from '@visx/group'
import { ParentSize } from '@visx/responsive'
import { scaleBand, scaleLinear } from '@visx/scale'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { GridRows } from '@visx/grid'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import type { ValueModelData } from './types'

const margin = { top: 32, right: 24, bottom: 56, left: 64 }

interface InnerProps {
  outcomes: ValueModelData['returns']['outcomes']
  ownership: number
  weightedEv: number
  width: number
  height: number
  inView: boolean
  titleId: string
}

function Inner({
  outcomes,
  ownership,
  weightedEv,
  width,
  height,
  inView,
  titleId,
}: InnerProps) {
  const innerW = Math.max(0, width - margin.left - margin.right)
  const innerH = Math.max(0, height - margin.top - margin.bottom)

  const bars = outcomes.map((o) => ({
    name: o.name,
    contribution: o.p * o.exit_m * ownership, // $M contribution to EV
    p: o.p,
    exit_m: o.exit_m,
  }))
  bars.push({
    name: 'Weighted EV',
    contribution: weightedEv,
    p: 1,
    exit_m: weightedEv / ownership,
  })

  const xScale = scaleBand<string>({
    domain: bars.map((b) => b.name),
    range: [0, innerW],
    padding: 0.3,
  })
  const yMax = Math.max(...bars.map((b) => b.contribution))
  const yScale = scaleLinear<number>({
    domain: [0, yMax * 1.15],
    range: [innerH, 0],
    nice: true,
  })

  // running cumulative for the waterfall connector
  let running = 0
  const cumulative: number[] = []
  for (let i = 0; i < bars.length - 1; i++) {
    cumulative.push(running)
    running += bars[i].contribution
  }
  cumulative.push(0) // weighted EV bar starts from 0

  return (
    <svg width={width} height={height} role="img" aria-labelledby={titleId}>
      <title id={titleId}>
        Probability-weighted returns waterfall: each scenario contributes
        probability × exit value × ownership to the expected value of the
        seed slice. Five outcomes (Zero through Asymmetric tail) sum to the
        teal &quot;Weighted EV&quot; bar at right.
      </title>
      <Group left={margin.left} top={margin.top}>
        <GridRows scale={yScale} width={innerW} stroke="rgba(148,163,184,0.10)" numTicks={5} />

        {bars.map((b, i) => {
          const x = xScale(b.name) ?? 0
          const w = xScale.bandwidth()
          const isWeighted = i === bars.length - 1
          const top = isWeighted ? yScale(b.contribution) : yScale(b.contribution + cumulative[i])
          const bot = isWeighted ? yScale(0) : yScale(cumulative[i])
          const h = bot - top
          const fill = isWeighted ? '#4ecdc4' : b.contribution > 0 ? '#3b82f6' : '#94a3b8'
          return (
            <g key={`b-${b.name}`}>
              <motion.rect
                x={x}
                width={w}
                fill={fill}
                opacity={0.92}
                rx={2}
                initial={{ y: yScale(0), height: 0 }}
                animate={inView ? { y: top, height: h } : { y: yScale(0), height: 0 }}
                transition={{ duration: 0.5, delay: 0.12 * i }}
              />
              <motion.text
                x={x + w / 2}
                y={top - 8}
                textAnchor="middle"
                fontSize={11}
                fill="rgba(226,232,240,0.85)"
                fontWeight={600}
                style={{ fontFamily: 'var(--font-sans)' }}
                initial={{ opacity: 0, y: top }}
                animate={inView ? { opacity: 1, y: top - 8 } : { opacity: 0, y: top }}
                transition={{ duration: 0.4, delay: 0.12 * i + 0.4 }}
              >
                ${b.contribution.toFixed(1)}M
              </motion.text>
              {!isWeighted && (
                <motion.text
                  x={x + w / 2}
                  y={bot + 14}
                  textAnchor="middle"
                  fontSize={10}
                  fill="rgba(148,163,184,0.7)"
                  style={{ fontFamily: 'var(--font-sans)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: inView ? 1 : 0 }}
                  transition={{ duration: 0.4, delay: 0.12 * i + 0.5 }}
                >
                  P {(b.p * 100).toFixed(0)}% · Exit ${b.exit_m.toLocaleString()}M
                </motion.text>
              )}
            </g>
          )
        })}

        <AxisLeft
          scale={yScale}
          numTicks={5}
          stroke="rgba(148,163,184,0.4)"
          tickStroke="rgba(148,163,184,0.4)"
          tickFormat={(v) => `$${v}M`}
          tickLabelProps={() => ({
            fill: 'rgba(226,232,240,0.6)',
            fontSize: 11,
            textAnchor: 'end',
            dx: -4,
            dy: 4,
          })}
        />
        <AxisBottom
          top={innerH}
          scale={xScale}
          stroke="rgba(148,163,184,0.4)"
          tickStroke="rgba(148,163,184,0.4)"
          tickLabelProps={() => ({
            fill: 'rgba(226,232,240,0.7)',
            fontSize: 11,
            textAnchor: 'middle',
            dy: 4,
          })}
        />
      </Group>
    </svg>
  )
}

export function ReturnsWaterfall({ data }: { data: ValueModelData }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20% 0px' })

  const irrPct = data.returns.weighted_irr_5y * 100

  return (
    <div ref={ref} className="w-full">
      <div className="grid md:grid-cols-3 gap-3 mb-6">
        <Stat label="Check size" value={`$${data.round.check_size_usd_m}M`} />
        <Stat
          label="Implied ownership"
          value={`${(data.round.ownership_pct * 100).toFixed(2)}%`}
          sub={`at $${data.round.post_money_usd_m}M post`}
        />
        <Stat
          label="Weighted 5-yr IRR"
          value={`${irrPct >= 0 ? '+' : ''}${irrPct.toFixed(1)}%`}
          highlight
          sub={`EV on slice $${data.returns.weighted_ev_on_slice_m.toFixed(1)}M`}
        />
      </div>

      <div className="text-xs text-[var(--on-surface-variant-mid)] font-mono mb-3">
        Each scenario contributes P × Exit × ownership to the EV. The final
        teal bar = sum (the probability-weighted dollar value of the slice).
      </div>
      <div className="h-[420px] w-full">
        <ParentSize>
          {({ width, height }) => (
            <Inner
              outcomes={data.returns.outcomes}
              ownership={data.round.ownership_pct}
              weightedEv={data.returns.weighted_ev_on_slice_m}
              width={width || 800}
              height={height || 420}
              inView={inView}
              titleId="returns-waterfall-title"
            />
          )}
        </ParentSize>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string
  value: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-md border border-[var(--outline-variant)] p-4 ${
        highlight
          ? 'bg-gradient-to-br from-[rgba(78,205,196,0.10)] to-[rgba(59,130,246,0.06)]'
          : 'bg-[var(--surface-container-low)]'
      }`}
    >
      <div className="text-xs uppercase tracking-wider text-[var(--on-surface-variant-mid)] mb-1">
        {label}
      </div>
      <div
        className="text-3xl font-semibold"
        style={{ color: highlight ? '#4ecdc4' : 'var(--on-surface)' }}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-[var(--on-surface-variant)] mt-1 font-mono">{sub}</div>}
    </div>
  )
}
