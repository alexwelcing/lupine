import { Group } from '@visx/group'
import { ParentSize } from '@visx/responsive'
import { scaleLinear } from '@visx/scale'
import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { interpolateRdYlBu } from 'd3-scale-chromatic'
import type { ValueModelData } from './types'

const margin = { top: 24, right: 24, bottom: 56, left: 64 }

interface InnerProps {
  waccAxis: number[]
  gAxis: number[]
  grid: number[][]
  width: number
  height: number
  baseWacc: number
  baseG: number
}

function Inner({ waccAxis, gAxis, grid, width, height, baseWacc, baseG }: InnerProps) {
  const innerW = Math.max(0, width - margin.left - margin.right)
  const innerH = Math.max(0, height - margin.top - margin.bottom)

  const cellW = innerW / gAxis.length
  const cellH = innerH / waccAxis.length

  const flat = grid.flat()
  const min = Math.min(...flat)
  const max = Math.max(...flat)
  const colorScale = scaleLinear<number>({
    domain: [min, (min + max) / 2, max],
    range: [0, 0.5, 1],
  })

  const [hover, setHover] = useState<{ i: number; j: number } | null>(null)

  return (
    <svg width={width} height={height}>
      <Group left={margin.left} top={margin.top}>
        {grid.map((row, i) =>
          row.map((v, j) => {
            const isCenter =
              Math.abs(waccAxis[i] - baseWacc) < 1e-9 && Math.abs(gAxis[j] - baseG) < 1e-9
            const isHover = hover && hover.i === i && hover.j === j
            const t = colorScale(v) ?? 0.5
            // d3-scale-chromatic interpolators take t in [0,1] and return rgb string
            // RdYlBu reversed so high = blue, low = red
            const color = interpolateRdYlBu(1 - t)
            return (
              <g
                key={`c-${i}-${j}`}
                onMouseEnter={() => setHover({ i, j })}
                onMouseLeave={() => setHover(null)}
              >
                <motion.rect
                  x={j * cellW}
                  y={i * cellH}
                  width={cellW}
                  height={cellH}
                  fill={color}
                  stroke={isCenter ? 'rgba(255,255,255,0.85)' : 'rgba(11,18,32,0.9)'}
                  strokeWidth={isCenter ? 2 : 1}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 0.92, scale: 1 }}
                  transition={{
                    duration: 0.4,
                    delay: 0.04 * (i * gAxis.length + j),
                  }}
                />
                <text
                  x={j * cellW + cellW / 2}
                  y={i * cellH + cellH / 2 + 4}
                  textAnchor="middle"
                  fontSize={Math.min(13, cellW / 5)}
                  fill={t > 0.5 ? '#0b1220' : '#f1f5f9'}
                  fontWeight={isCenter || isHover ? 700 : 500}
                  style={{ fontFamily: 'var(--font-sans)', pointerEvents: 'none' }}
                >
                  ${v.toFixed(0)}M
                </text>
              </g>
            )
          }),
        )}

        {/* row labels (WACC) */}
        {waccAxis.map((w, i) => (
          <text
            key={`wlbl-${i}`}
            x={-8}
            y={i * cellH + cellH / 2 + 4}
            textAnchor="end"
            fontSize={11}
            fill="rgba(226,232,240,0.7)"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            {(w * 100).toFixed(1)}%
          </text>
        ))}
        {/* col labels (terminal g) */}
        {gAxis.map((g, j) => (
          <text
            key={`glbl-${j}`}
            x={j * cellW + cellW / 2}
            y={innerH + 18}
            textAnchor="middle"
            fontSize={11}
            fill="rgba(226,232,240,0.7)"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            {(g * 100).toFixed(1)}%
          </text>
        ))}
        {/* axis titles */}
        <text
          x={-margin.left + 8}
          y={innerH / 2}
          fontSize={11}
          fill="rgba(226,232,240,0.55)"
          textAnchor="middle"
          transform={`rotate(-90, ${-margin.left + 8}, ${innerH / 2})`}
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          WACC
        </text>
        <text
          x={innerW / 2}
          y={innerH + 40}
          fontSize={11}
          fill="rgba(226,232,240,0.55)"
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          Terminal growth
        </text>
      </Group>
    </svg>
  )
}

export function SensitivityHeatmap({ data }: { data: ValueModelData }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20% 0px' })
  const baseWacc = data.dcf.wacc_inputs.wacc
  const baseG = data.dcf.wacc_inputs.g_base

  return (
    <div ref={ref} className="w-full">
      <div className="text-xs text-[var(--on-surface-variant-mid)] font-mono mb-3">
        Equity value ($M) at varying WACC × terminal growth (base-case FCFs).
        Center cell highlighted = model base case.
      </div>
      <div className="h-[420px] w-full">
        {inView && (
          <ParentSize>
            {({ width, height }) =>
              width > 0 && height > 0 ? (
                <Inner
                  waccAxis={data.dcf.sensitivity.wacc_axis}
                  gAxis={data.dcf.sensitivity.g_axis}
                  grid={data.dcf.sensitivity.grid}
                  width={width}
                  height={height}
                  baseWacc={baseWacc}
                  baseG={baseG}
                />
              ) : null
            }
          </ParentSize>
        )}
      </div>
    </div>
  )
}
