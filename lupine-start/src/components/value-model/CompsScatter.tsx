import { Group } from '@visx/group'
import { ParentSize } from '@visx/responsive'
import { scaleLinear, scaleLog } from '@visx/scale'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { GridRows, GridColumns } from '@visx/grid'
import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import type { ValueModelData, CompRow } from './types'

const margin = { top: 32, right: 32, bottom: 56, left: 60 }

interface SeriesPoint {
  id: string
  label: string
  x: number // revenue growth %
  y: number // EV/Revenue
  size: number // revenue LTM ($M) for radius
  group: 'sim' | 'ai_bio' | 'other' | 'lupine'
  delay: number
}

const GROUP_COLORS: Record<SeriesPoint['group'], string> = {
  sim: '#3b82f6',
  ai_bio: '#c4b5fd',
  other: '#64748b',
  lupine: '#4ecdc4',
}

const sizeScale = (rev: number) => {
  if (!isFinite(rev) || rev <= 0) return 5
  return Math.max(5, Math.min(22, Math.sqrt(rev) * 0.6))
}

interface InnerProps {
  points: SeriesPoint[]
  width: number
  height: number
  simMedian: number
  inView: boolean
  titleId: string
}

function Inner({ points, width, height, simMedian, inView, titleId }: InnerProps) {
  const innerW = Math.max(0, width - margin.left - margin.right)
  const innerH = Math.max(0, height - margin.top - margin.bottom)

  const finitePts = points.filter((p) => isFinite(p.x) && isFinite(p.y) && p.y > 0)
  const xMax = Math.max(...finitePts.map((p) => p.x), 60)
  const xMin = Math.min(...finitePts.map((p) => p.x), 0)

  const xScale = scaleLinear<number>({
    domain: [Math.min(0, xMin) - 5, xMax + 10],
    range: [0, innerW],
    nice: true,
  })
  const yScale = scaleLog<number>({
    domain: [Math.max(1, Math.min(...finitePts.map((p) => p.y)) * 0.7), Math.max(...finitePts.map((p) => p.y)) * 1.2],
    range: [innerH, 0],
    base: 10,
  })

  const [hover, setHover] = useState<string | null>(null)

  return (
    <svg width={width} height={height} role="img" aria-labelledby={titleId}>
      <title id={titleId}>
        Bubble scatter: comparable companies plotted on revenue growth (x) vs
        EV / Revenue multiple (y, log scale). Bubble size = revenue LTM. Sim
        median reference line at {simMedian.toFixed(1)}x. Lupine&apos;s FY30
        base case projected on the cluster.
      </title>
      <Group left={margin.left} top={margin.top}>
        <GridRows
          scale={yScale}
          width={innerW}
          stroke="rgba(148,163,184,0.10)"
          numTicks={5}
        />
        <GridColumns
          scale={xScale}
          height={innerH}
          stroke="rgba(148,163,184,0.08)"
          numTicks={6}
        />

        {/* Sim median reference line */}
        <line
          x1={0}
          x2={innerW}
          y1={yScale(simMedian)}
          y2={yScale(simMedian)}
          stroke="#3b82f6"
          strokeOpacity={0.4}
          strokeDasharray="4 4"
        />
        <text
          x={innerW - 4}
          y={yScale(simMedian) - 6}
          textAnchor="end"
          fontSize={10}
          fill="rgba(59,130,246,0.7)"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          sim median {simMedian.toFixed(1)}x
        </text>

        {finitePts.map((p) => {
          // Always show labels for the named-comparable groups + Lupine.
          // Hover on "other" comps reveals their label.
          const showLabel =
            p.group === 'lupine' ||
            p.group === 'sim' ||
            p.group === 'ai_bio' ||
            hover === p.id
          const isHovered = hover === p.id
          return (
            <g
              key={p.id}
              onMouseEnter={() => setHover(p.id)}
              onMouseLeave={() => setHover(null)}
            >
              <motion.circle
                cx={xScale(p.x)}
                cy={yScale(p.y)}
                fill={GROUP_COLORS[p.group]}
                fillOpacity={
                  p.group === 'lupine' ? 0.95 : isHovered ? 0.95 : 0.65
                }
                stroke={p.group === 'lupine' ? '#0b1220' : 'transparent'}
                strokeWidth={p.group === 'lupine' ? 2 : 0}
                initial={{ r: 0, opacity: 0 }}
                animate={
                  inView
                    ? { r: sizeScale(p.size), opacity: 1 }
                    : { r: 0, opacity: 0 }
                }
                transition={{ duration: 0.5, delay: p.delay }}
              />
              {showLabel && (
                <motion.text
                  x={xScale(p.x) + sizeScale(p.size) + 6}
                  y={yScale(p.y) + 4}
                  fontSize={p.group === 'lupine' ? 12 : 10.5}
                  fill={
                    p.group === 'lupine'
                      ? '#4ecdc4'
                      : isHovered
                        ? '#e2e8f0'
                        : 'rgba(226,232,240,0.7)'
                  }
                  style={{
                    fontFamily: 'var(--font-sans)',
                    pointerEvents: 'none',
                  }}
                  fontWeight={p.group === 'lupine' || isHovered ? 600 : 500}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: inView ? 1 : 0 }}
                  transition={{ duration: 0.4, delay: p.delay + 0.2 }}
                >
                  {p.label}
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
          tickFormat={(v) => `${Number(v).toFixed(0)}x`}
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
          numTicks={6}
          stroke="rgba(148,163,184,0.4)"
          tickStroke="rgba(148,163,184,0.4)"
          tickFormat={(v) => `${v}%`}
          tickLabelProps={() => ({
            fill: 'rgba(226,232,240,0.6)',
            fontSize: 11,
            textAnchor: 'middle',
            dy: 4,
          })}
        />
        <text
          x={innerW / 2}
          y={innerH + 40}
          textAnchor="middle"
          fontSize={11}
          fill="rgba(226,232,240,0.55)"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          Revenue growth (%)
        </text>
        <text
          x={-margin.left + 8}
          y={innerH / 2}
          fontSize={11}
          fill="rgba(226,232,240,0.55)"
          textAnchor="middle"
          transform={`rotate(-90, ${-margin.left + 8}, ${innerH / 2})`}
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          EV / Revenue (log)
        </text>
      </Group>
    </svg>
  )
}

export function CompsScatter({ data }: { data: ValueModelData }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20% 0px' })

  const toPoint = (
    r: CompRow,
    group: SeriesPoint['group'],
    delay: number,
  ): SeriesPoint => ({
    id: r.id,
    label: r.company,
    x: r.rev_growth ?? NaN,
    y: r.ev_revenue ?? NaN,
    size: r.rev_ltm ?? 50,
    group,
    delay,
  })

  const points: SeriesPoint[] = [
    ...data.comps.sim_set.map((r, i) => toPoint(r, 'sim', 0.15 + i * 0.05)),
    ...data.comps.ai_bio_set.map((r, i) => toPoint(r, 'ai_bio', 0.4 + i * 0.05)),
    ...data.comps.others.slice(0, 6).map((r, i) => toPoint(r, 'other', 0.6 + i * 0.05)),
  ]

  // Project Lupine onto the scatter at FY30 base case.
  // Growth rate = FY28-FY32 CAGR (the "mature" rate comparable to public
  // company growth) instead of the spike YoY rate which is inflated by the
  // small starting base. This figure comes from analyze.py's derived field.
  const fy30Rev = data.lupine.revenue_total_m[4]
  const lupineGrowth = data.lupine.fy28_fy32_cagr_pct
  points.push({
    id: 'lupine',
    label: `Lupine FY30 base (${fy30Rev.toFixed(0)}M, ${lupineGrowth.toFixed(0)}% CAGR)`,
    x: lupineGrowth,
    y: data.comps.sim_median_ev_rev,
    size: fy30Rev,
    group: 'lupine',
    delay: 1.0,
  })

  return (
    <div ref={ref} className="w-full">
      <div className="flex items-center gap-6 mb-3 flex-wrap text-sm text-[var(--on-surface-variant)]">
        <Legend color={GROUP_COLORS.sim} label="Engineering simulation comps" />
        <Legend color={GROUP_COLORS.ai_bio} label="AI-for-science premium" />
        <Legend color={GROUP_COLORS.other} label="Other reference" />
        <Legend color={GROUP_COLORS.lupine} label="Lupine FY30 base (projected)" />
      </div>
      <div className="text-xs text-[var(--on-surface-variant-mid)] font-mono mb-3">
        Bubble size = revenue LTM. Y-axis log. Lupine growth axis = FY28→FY32
        CAGR ({data.lupine.fy28_fy32_cagr_pct.toFixed(0)}%) — the mature rate
        comparable to public-company growth.
      </div>
      <div className="h-[480px] w-full">
        <ParentSize>
          {({ width, height }) => (
            <Inner
              points={points}
              width={width || 800}
              height={height || 480}
              simMedian={data.comps.sim_median_ev_rev}
              inView={inView}
              titleId="comps-scatter-title"
            />
          )}
        </ParentSize>
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="inline-block w-3 h-3 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}
