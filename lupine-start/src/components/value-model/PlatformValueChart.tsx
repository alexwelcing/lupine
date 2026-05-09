import { Group } from '@visx/group'
import { ParentSize } from '@visx/responsive'
import { scaleLinear, scaleOrdinal } from '@visx/scale'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import type { ValueModelData } from './types'

/**
 * Phase-4 addressable economic activity broken into sectors.
 * Animated horizontal stacked-bar treemap — each sector is a band whose
 * length encodes annual value in $B, brand-tinted by parent sector.
 *
 * Sectors stagger-reveal on scroll-in. The total ($4T+) is shown as a
 * giant figure in the corner; the bar provides the breakdown.
 */

const SECTOR_PALETTE = [
  '#4ecdc4', // Healthcare drugs
  '#7ee5dd', // Healthcare biopolymers
  '#3b82f6', // Compute
  '#5e9bf7', // Energy storage
  '#8ab4f9', // Aerospace
  '#c4b5fd', // Catalysis
  '#d3c8fc', // Ag-food
  '#9381e3', // Polymers/coatings
  '#7a6dd0', // Energy systems
]

const margin = { top: 20, right: 24, bottom: 32, left: 24 }

interface InnerProps {
  sectors: ValueModelData['ceiling']['phase4_sectors']
  total: number
  width: number
  height: number
  inView: boolean
  titleId: string
}

function Inner({ sectors, total, width, height, inView, titleId }: InnerProps) {
  const innerW = Math.max(0, width - margin.left - margin.right)
  const innerH = Math.max(0, height - margin.top - margin.bottom)

  // Sort largest to smallest so the bar reads as a hierarchy.
  const sorted = [...sectors].sort(
    (a, b) => b.annual_value_usd_b - a.annual_value_usd_b,
  )

  const xScale = scaleLinear<number>({
    domain: [0, total],
    range: [0, innerW],
  })

  const colorScale = scaleOrdinal<string>({
    domain: sorted.map((s) => s.id),
    range: SECTOR_PALETTE,
  })

  // Compute cumulative offsets so each band starts where the previous ended.
  let cum = 0
  const placed = sorted.map((s) => {
    const start = cum
    cum += s.annual_value_usd_b
    return { ...s, start, width: xScale(s.annual_value_usd_b) }
  })

  return (
    <svg width={width} height={height} role="img" aria-labelledby={titleId}>
      <title id={titleId}>
        Phase-4 addressable economic activity by sector at 2045 maturity:
        nine sectors totaling roughly $4 trillion per year. Drugs and clinical
        materials are the largest single bucket at $1.2T; semiconductors
        $800B; battery + energy $500B; ag/food $400B; catalysis $300B;
        aerospace and polymers $250B each; biopolymers $180B; energy systems
        $200B.
      </title>
      <Group left={margin.left} top={margin.top}>
        {placed.map((s, i) => {
          const x = xScale(s.start)
          const w = s.width
          const color = (colorScale(s.id) as string) ?? '#94a3b8'
          return (
            <g key={s.id}>
              <motion.rect
                x={x}
                y={0}
                height={innerH}
                fill={color}
                opacity={0.92}
                initial={{ width: 0, opacity: 0 }}
                animate={inView ? { width: w, opacity: 0.92 } : { width: 0, opacity: 0 }}
                transition={{
                  duration: 0.7,
                  delay: 0.05 + i * 0.07,
                  ease: [0.22, 0.61, 0.36, 1],
                }}
              />
              {/* Label inside the band if there's room */}
              {w > 90 && (
                <motion.text
                  x={x + 8}
                  y={20}
                  fontSize={11}
                  fill="rgba(11,18,32,0.85)"
                  fontWeight={600}
                  style={{ fontFamily: 'var(--font-sans)' }}
                  initial={{ opacity: 0 }}
                  animate={inView ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 + i * 0.07 }}
                >
                  {s.subsector.length > 38
                    ? s.subsector.slice(0, 36) + '…'
                    : s.subsector}
                </motion.text>
              )}
              {w > 90 && (
                <motion.text
                  x={x + 8}
                  y={innerH - 12}
                  fontSize={13}
                  fill="rgba(11,18,32,0.95)"
                  fontWeight={700}
                  style={{ fontFamily: 'var(--font-sans)' }}
                  initial={{ opacity: 0 }}
                  animate={inView ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.07 }}
                >
                  ${s.annual_value_usd_b}B
                </motion.text>
              )}
            </g>
          )
        })}
      </Group>
    </svg>
  )
}

export function PlatformValueChart({ data }: { data: ValueModelData }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })
  const c = data.ceiling

  return (
    <div ref={ref} className="w-full">
      {/* Headline figure */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-6 mb-6">
        <div className="flex-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--tertiary)] mb-2">
            Phase-4 addressable economic activity · 2045 maturity
          </div>
          <div className="text-6xl lg:text-7xl font-semibold leading-none">
            <span className="text-[var(--secondary)]">
              ${(c.phase4_addressable_total_usd_b / 1000).toFixed(1)}T
            </span>
            <span className="text-[var(--on-surface-variant)] text-2xl lg:text-3xl ml-3 font-light">
              / year
            </span>
          </div>
          <div className="text-sm text-[var(--on-surface-variant)] mt-3 max-w-xl">
            What it costs (or stops costing, or starts being worth) every year
            once programmable matter is real for narrow material classes —
            drugs, alloys, semis, polymers, food, energy.
          </div>
        </div>
      </div>

      {/* The bar */}
      <div className="h-[120px] w-full rounded-md overflow-hidden">
        <ParentSize>
          {({ width, height }) => (
            <Inner
              sectors={c.phase4_sectors}
              total={c.phase4_addressable_total_usd_b}
              width={width || 800}
              height={height || 120}
              inView={inView}
              titleId="platform-value-title"
            />
          )}
        </ParentSize>
      </div>

      {/* Sector legend grid for the bands too narrow to label inline */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-5 text-xs">
        {[...c.phase4_sectors]
          .sort((a, b) => b.annual_value_usd_b - a.annual_value_usd_b)
          .map((s, i) => (
            <div
              key={s.id}
              className="flex items-baseline gap-2 py-1 px-2 rounded bg-[var(--surface-container)]"
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ background: SECTOR_PALETTE[i] ?? '#94a3b8' }}
              />
              <span className="text-[var(--on-surface)] flex-1 truncate">
                {s.subsector}
              </span>
              <span className="font-mono text-[var(--on-surface-variant-mid)] tabular-nums flex-shrink-0">
                ${s.annual_value_usd_b}B
              </span>
            </div>
          ))}
      </div>
    </div>
  )
}
