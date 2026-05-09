import { Group } from '@visx/group'
import { ParentSize } from '@visx/responsive'
import { scaleBand, scaleLinear } from '@visx/scale'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { GridRows } from '@visx/grid'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import type { ValueModelData, Scenario } from './types'

const margin = { top: 32, right: 24, bottom: 48, left: 60 }
const SCEN_COLORS: Record<Scenario, string> = {
  bear: '#94a3b8', // slate
  base: '#3b82f6', // primary blue
  bull: '#4ecdc4', // secondary cyan
}

interface InnerProps {
  years: number[]
  scenarios: ValueModelData['dcf']['scenarios']
  width: number
  height: number
  inView: boolean
  titleId: string
}

function Inner({ years, scenarios, width, height, inView, titleId }: InnerProps) {
  const innerW = Math.max(0, width - margin.left - margin.right)
  const innerH = Math.max(0, height - margin.top - margin.bottom)

  const scenList: Scenario[] = ['bear', 'base', 'bull']

  // group bars per year × per scenario (3 bars per year)
  const x0 = scaleBand<number>({
    domain: years,
    range: [0, innerW],
    padding: 0.2,
  })
  const x1 = scaleBand<Scenario>({
    domain: scenList,
    range: [0, x0.bandwidth()],
    padding: 0.15,
  })

  const allFcfs = scenList.flatMap((s) => scenarios[s].fcfs)
  const min = Math.min(0, ...allFcfs)
  const max = Math.max(...allFcfs)
  const yScale = scaleLinear<number>({
    domain: [min * 1.1, max * 1.1],
    range: [innerH, 0],
    nice: true,
  })

  const zero = yScale(0)

  return (
    <svg width={width} height={height} role="img" aria-labelledby={titleId}>
      <title id={titleId}>
        Grouped-bar chart: free cash flow projection by year for bear, base,
        and bull scenarios from FY26 through FY32. Bars below the dashed zero
        line are negative (cash burn). Base case crosses break-even in FY28.
      </title>
      <Group left={margin.left} top={margin.top}>
        <GridRows
          scale={yScale}
          width={innerW}
          stroke="rgba(148,163,184,0.10)"
          numTicks={6}
        />
        {/* zero line */}
        <line
          x1={0}
          x2={innerW}
          y1={zero}
          y2={zero}
          stroke="rgba(148,163,184,0.45)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        {years.map((y, yi) => (
          <Group key={`yr-${y}`} left={x0(y) ?? 0}>
            {scenList.map((s, si) => {
              const fcf = scenarios[s].fcfs[yi]
              const top = yScale(Math.max(0, fcf))
              const bottom = yScale(Math.min(0, fcf))
              const h = bottom - top
              return (
                <motion.rect
                  key={`b-${s}-${yi}`}
                  x={x1(s) ?? 0}
                  width={x1.bandwidth()}
                  fill={SCEN_COLORS[s]}
                  rx={2}
                  initial={{ y: zero, height: 0, opacity: 0 }}
                  animate={
                    inView
                      ? { y: top, height: h, opacity: 0.92 }
                      : { y: zero, height: 0, opacity: 0 }
                  }
                  transition={{
                    duration: 0.6,
                    delay: 0.04 * yi + si * 0.08,
                    ease: [0.22, 0.61, 0.36, 1],
                  }}
                />
              )
            })}
          </Group>
        ))}

        <AxisLeft
          scale={yScale}
          numTicks={6}
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
          scale={x0}
          stroke="rgba(148,163,184,0.4)"
          tickStroke="rgba(148,163,184,0.4)"
          tickFormat={(v) => `FY${String(v).slice(-2)}`}
          tickLabelProps={() => ({
            fill: 'rgba(226,232,240,0.6)',
            fontSize: 11,
            textAnchor: 'middle',
            dy: 4,
          })}
        />
      </Group>
    </svg>
  )
}

export function DcfScenarioChart({ data }: { data: ValueModelData }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20% 0px' })

  const evCards: { scen: Scenario; label: string }[] = [
    { scen: 'bear', label: 'Bear' },
    { scen: 'base', label: 'Base' },
    { scen: 'bull', label: 'Bull' },
  ]

  return (
    <div ref={ref} className="w-full">
      <div className="flex items-center gap-6 mb-6 flex-wrap text-sm text-[var(--on-surface-variant)]">
        {evCards.map(({ scen, label }) => (
          <span key={scen} className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: SCEN_COLORS[scen] }}
            />
            <span className="font-medium">{label}</span>
            <span className="text-[var(--on-surface-variant-mid)] font-mono">
              WACC {(data.dcf.scenarios[scen].wacc * 100).toFixed(1)}% · g{' '}
              {(data.dcf.scenarios[scen].terminal_growth * 100).toFixed(1)}%
            </span>
          </span>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-6">
        {evCards.map(({ scen, label }) => {
          const r = data.dcf.scenarios[scen]
          return (
            <motion.div
              key={scen}
              className="rounded-md border border-[var(--outline-variant)] p-4 bg-[var(--surface-container-low)]"
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{
                duration: 0.5,
                delay: scen === 'bear' ? 0.05 : scen === 'base' ? 0.15 : 0.25,
              }}
            >
              <div className="text-xs uppercase tracking-wider text-[var(--on-surface-variant-mid)] mb-1">
                {label} EV
              </div>
              <div
                className="text-3xl font-semibold mb-1"
                style={{ color: SCEN_COLORS[scen] }}
              >
                ${r.enterprise_value.toFixed(1)}M
              </div>
              <div className="text-xs text-[var(--on-surface-variant)] font-mono">
                Σ PV FCF ${r.sum_pv_fcfs.toFixed(0)}M · TV ${r.pv_terminal.toFixed(0)}M
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="h-[340px] w-full">
        <ParentSize>
          {({ width, height }) => (
            <Inner
              years={data.years}
              scenarios={data.dcf.scenarios}
              width={width || 800}
              height={height || 340}
              inView={inView}
              titleId="dcf-scenario-title"
            />
          )}
        </ParentSize>
      </div>
    </div>
  )
}
