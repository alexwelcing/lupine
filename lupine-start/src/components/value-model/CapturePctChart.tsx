import { Group } from '@visx/group'
import { ParentSize } from '@visx/responsive'
import { scaleLinear } from '@visx/scale'
// (LinePath/Bar not needed — we draw paths manually for fine-grained
//  control over Framer Motion path-length animations.)
import { AxisBottom, AxisLeft, AxisRight } from '@visx/axis'
import { GridRows } from '@visx/grid'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import type { ValueModelData } from './types'

const margin = { top: 32, right: 60, bottom: 48, left: 60 }

interface InnerProps {
  years: number[]
  attributedUnlockM: number[]
  revenueM: number[]
  capturePct: number[]
  width: number
  height: number
}

function Inner({ years, attributedUnlockM, revenueM, capturePct, width, height }: InnerProps) {
  const innerW = Math.max(0, width - margin.left - margin.right)
  const innerH = Math.max(0, height - margin.top - margin.bottom)

  const xScale = scaleLinear<number>({
    domain: [years[0] - 0.5, years[years.length - 1] + 0.5],
    range: [0, innerW],
  })
  const maxLeft = Math.max(...attributedUnlockM)
  const yLeft = scaleLinear<number>({
    domain: [0, maxLeft * 1.1],
    range: [innerH, 0],
    nice: true,
  })
  const yRight = scaleLinear<number>({
    domain: [0, Math.max(...capturePct) * 1.2],
    range: [innerH, 0],
    nice: true,
  })

  // Build path strings for animation
  const unlockPath = years
    .map((y, i) => `${i === 0 ? 'M' : 'L'}${xScale(y)},${yLeft(attributedUnlockM[i])}`)
    .join(' ')
  const revenuePath = years
    .map((y, i) => `${i === 0 ? 'M' : 'L'}${xScale(y)},${yLeft(revenueM[i])}`)
    .join(' ')
  const capturePath = years
    .map((y, i) => `${i === 0 ? 'M' : 'L'}${xScale(y)},${yRight(capturePct[i])}`)
    .join(' ')

  return (
    <svg width={width} height={height}>
      <defs>
        <linearGradient id="unlock-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <Group left={margin.left} top={margin.top}>
        <GridRows
          scale={yLeft}
          width={innerW}
          stroke="rgba(148,163,184,0.10)"
          numTicks={5}
        />
        {/* Attributed unlock area (semi-transparent fill under the line) */}
        <motion.path
          d={`${unlockPath} L${xScale(years[years.length - 1])},${innerH} L${xScale(years[0])},${innerH} Z`}
          fill="url(#unlock-grad)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.0, delay: 0.6 }}
        />
        {/* Attributed unlock line */}
        <motion.path
          d={unlockPath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2.2}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: [0.22, 0.61, 0.36, 1] }}
        />
        {/* Lupine revenue line */}
        <motion.path
          d={revenuePath}
          fill="none"
          stroke="#4ecdc4"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeDasharray="4 3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: [0.22, 0.61, 0.36, 1], delay: 0.3 }}
        />
        {/* Capture % line on right axis */}
        <motion.path
          d={capturePath}
          fill="none"
          stroke="#c4b5fd"
          strokeWidth={1.8}
          strokeDasharray="2 5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, ease: [0.22, 0.61, 0.36, 1], delay: 0.5 }}
        />

        {/* Data points on revenue line */}
        {years.map((y, i) => (
          <motion.circle
            key={`pt-${i}`}
            cx={xScale(y)}
            cy={yLeft(revenueM[i])}
            r={3.5}
            fill="#4ecdc4"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 1.0 + i * 0.08 }}
          />
        ))}

        <AxisLeft
          scale={yLeft}
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
            fontFamily: 'var(--font-sans)',
          })}
        />
        <AxisRight
          left={innerW}
          scale={yRight}
          numTicks={5}
          stroke="rgba(196,181,253,0.4)"
          tickStroke="rgba(196,181,253,0.4)"
          tickFormat={(v) => `${v}%`}
          tickLabelProps={() => ({
            fill: 'rgba(196,181,253,0.7)',
            fontSize: 11,
            textAnchor: 'start',
            dx: 6,
            dy: 4,
            fontFamily: 'var(--font-sans)',
          })}
        />
        <AxisBottom
          top={innerH}
          scale={xScale}
          numTicks={years.length}
          tickValues={years}
          stroke="rgba(148,163,184,0.4)"
          tickStroke="rgba(148,163,184,0.4)"
          tickFormat={(v) => `FY${String(v).slice(-2)}`}
          tickLabelProps={() => ({
            fill: 'rgba(226,232,240,0.6)',
            fontSize: 11,
            textAnchor: 'middle',
            dy: 4,
            fontFamily: 'var(--font-sans)',
          })}
        />
      </Group>
    </svg>
  )
}

export function CapturePctChart({ data }: { data: ValueModelData }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20% 0px' })

  return (
    <div ref={ref} className="w-full">
      <div className="flex items-center gap-6 mb-4 flex-wrap text-sm text-[var(--on-surface-variant)]">
        <Legend color="#3b82f6" label="Lupine-attributed unlock ($M)" />
        <Legend color="#4ecdc4" label="Lupine revenue ($M)" dashed />
        <Legend color="#c4b5fd" label="Capture % (right axis)" dashed />
      </div>
      <div className="h-[360px] w-full">
        {inView && (
          <ParentSize>
            {({ width, height }) =>
              width > 0 && height > 0 ? (
                <Inner
                  years={data.years}
                  attributedUnlockM={data.lupine.attributed_unlock_m}
                  revenueM={data.lupine.revenue_total_m}
                  capturePct={data.lupine.capture_pct}
                  width={width}
                  height={height}
                />
              ) : null
            }
          </ParentSize>
        )}
      </div>
    </div>
  )
}

function Legend({ color, label, dashed = false }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="inline-block w-6 h-[2px]"
        style={{
          background: color,
          backgroundImage: dashed
            ? `repeating-linear-gradient(to right, ${color} 0 4px, transparent 4px 7px)`
            : undefined,
        }}
      />
      {label}
    </span>
  )
}
