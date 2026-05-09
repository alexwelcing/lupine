import { Group } from '@visx/group'
import { ParentSize } from '@visx/responsive'
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale'
import { BarStack } from '@visx/shape'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { GridRows } from '@visx/grid'
import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import type { ValueModelData } from './types'

interface SectorPoint {
  year: number
  Compute: number
  Travel: number
  Bio: number
}

const KEYS = ['Compute', 'Travel', 'Bio'] as const
type Key = (typeof KEYS)[number]

// Brand-aligned palette: tertiary (lavender) for compute, secondary (cyan) for
// travel, primary (blue) for bio. Surface-y, lab-grade, no fruit-loop colors.
const COLORS: Record<Key, string> = {
  Compute: '#c4b5fd',
  Travel: '#4ecdc4',
  Bio: '#3b82f6',
}

const margin = { top: 32, right: 24, bottom: 48, left: 60 }

interface InnerProps {
  data: SectorPoint[]
  width: number
  height: number
}

function Inner({ data, width, height }: InnerProps) {
  const innerW = Math.max(0, width - margin.left - margin.right)
  const innerH = Math.max(0, height - margin.top - margin.bottom)

  const xScale = scaleBand<number>({
    domain: data.map((d) => d.year),
    range: [0, innerW],
    padding: 0.32,
  })

  const yMax = Math.max(...data.map((d) => d.Compute + d.Travel + d.Bio))
  const yScale = scaleLinear<number>({
    domain: [0, yMax * 1.05],
    range: [innerH, 0],
    nice: true,
  })

  const colorScale = scaleOrdinal<Key, string>({
    domain: [...KEYS],
    range: KEYS.map((k) => COLORS[k]),
  })

  return (
    <svg width={width} height={height}>
      <Group left={margin.left} top={margin.top}>
        <GridRows
          scale={yScale}
          width={innerW}
          stroke="rgba(148,163,184,0.12)"
          numTicks={5}
        />
        <BarStack<SectorPoint, Key>
          data={data}
          keys={[...KEYS]}
          x={(d) => d.year}
          xScale={xScale}
          yScale={yScale}
          color={colorScale}
        >
          {(stacks) =>
            stacks.map((stack) =>
              stack.bars.map((bar) => (
                <motion.rect
                  key={`bar-${stack.key}-${bar.index}`}
                  x={bar.x}
                  width={bar.width}
                  fill={bar.color}
                  initial={{ y: innerH, height: 0, opacity: 0 }}
                  animate={{ y: bar.y, height: bar.height, opacity: 0.92 }}
                  transition={{
                    duration: 0.7,
                    delay: 0.05 * bar.index + (stack.key === 'Compute' ? 0 : stack.key === 'Travel' ? 0.1 : 0.2),
                    ease: [0.22, 0.61, 0.36, 1],
                  }}
                  rx={2}
                />
              )),
            )
          }
        </BarStack>
        <AxisLeft
          scale={yScale}
          numTicks={5}
          stroke="rgba(148,163,184,0.4)"
          tickStroke="rgba(148,163,184,0.4)"
          tickFormat={(v) => `$${v}B`}
          tickLabelProps={() => ({
            fill: 'rgba(226,232,240,0.6)',
            fontSize: 11,
            textAnchor: 'end',
            dx: -4,
            dy: 4,
            fontFamily: 'var(--font-sans)',
          })}
        />
        <AxisBottom
          top={innerH}
          scale={xScale}
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

export function SectorUnlockChart({ data }: { data: ValueModelData }) {
  const points: SectorPoint[] = data.years.map((y, i) => ({
    year: y,
    Compute: data.sector_unlock.compute[i],
    Travel: data.sector_unlock.travel[i],
    Bio: data.sector_unlock.bio[i],
  }))

  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20% 0px' })

  return (
    <div ref={ref} className="w-full">
      <div className="flex items-center gap-6 mb-4 flex-wrap">
        {KEYS.map((k) => (
          <div key={k} className="flex items-center gap-2 text-sm text-[var(--on-surface-variant)]">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: COLORS[k] }}
            />
            <span className="font-medium">{k}</span>
          </div>
        ))}
        <div className="ml-auto text-xs text-[var(--on-surface-variant-mid)] font-mono">
          $B/yr accelerated value
        </div>
      </div>
      <div className="h-[360px] w-full">
        {inView && (
          <ParentSize>
            {({ width, height }) =>
              width > 0 && height > 0 ? (
                <Inner data={points} width={width} height={height} />
              ) : null
            }
          </ParentSize>
        )}
      </div>
    </div>
  )
}
