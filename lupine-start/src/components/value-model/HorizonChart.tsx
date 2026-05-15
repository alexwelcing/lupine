import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import type { ArcPhase, ValueModelData } from './types'

/**
 * 30-year arc visualization. Four overlapping horizontal phase ribbons
 * spanning 2025-2055, with Lupine's role called out underneath each.
 * The phase ribbons stagger-reveal on scroll; "WE ARE HERE" pulses on
 * phase 1.
 *
 * Visually: a horizontal timeline (year axis 2025 → 2055) with each
 * phase rendered as a colored bar at a different y position to show
 * temporal overlap. Phase labels animate in left-to-right.
 */

const PHASE_COLORS: Record<number, string> = {
  1: '#4ecdc4', // cyan — current phase, Lupine highlighted
  2: '#3b82f6', // blue
  3: '#c4b5fd', // lavender
  4: '#f472b6', // pink — distant horizon
  5: '#fb923c', // amber — phase-5 quantum unlocks
}

const TIMELINE_START = 2025
const TIMELINE_END = 2080

export function HorizonChart({ data }: { data: ValueModelData }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })
  const phases = [...data.thirty_year_arc].sort((a, b) => a.phase - b.phase)

  const yearToPct = (year: number) =>
    ((year - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100

  // Decade tick labels (extended to phase-5 horizon 2080)
  const decades = [2025, 2030, 2035, 2040, 2045, 2050, 2055, 2060, 2065, 2070, 2075, 2080]

  return (
    <div ref={ref} className="w-full">
      {/* Year axis */}
      <div className="relative h-6 mb-1 select-none">
        {decades.map((y) => (
          <div
            key={y}
            className="absolute text-[10px] font-mono uppercase tracking-widest text-[var(--on-surface-variant-mid)]"
            style={{ left: `${yearToPct(y)}%`, transform: 'translateX(-50%)' }}
          >
            {y}
          </div>
        ))}
      </div>

      {/* Tick marks */}
      <div className="relative h-2 border-t border-[var(--outline-variant)]">
        {decades.map((y) => (
          <div
            key={y}
            className="absolute top-0 w-px h-2 bg-[var(--outline-variant)]"
            style={{ left: `${yearToPct(y)}%` }}
          />
        ))}
      </div>

      {/* Phase ribbons stacked vertically; each spans its temporal range */}
      <div className="relative mt-6 mb-4" style={{ minHeight: phases.length * 60 + 20 }}>
        {phases.map((p, i) => {
          const left = yearToPct(p.start_year)
          const right = 100 - yearToPct(p.end_year)
          const color = PHASE_COLORS[p.phase] ?? '#94a3b8'
          const isCurrent = p.phase === 1
          return (
            <motion.div
              key={p.id}
              className="absolute h-[44px] rounded-md flex items-center px-4"
              style={{
                left: `${left}%`,
                right: `${right}%`,
                top: i * 60,
                background: `linear-gradient(90deg, ${color}33 0%, ${color}1a 100%)`,
                borderLeft: `3px solid ${color}`,
              }}
              initial={{ opacity: 0, x: -20, scaleX: 0.92 }}
              animate={
                inView
                  ? { opacity: 1, x: 0, scaleX: 1 }
                  : { opacity: 0, x: -20, scaleX: 0.92 }
              }
              transition={{
                duration: 0.7,
                delay: 0.15 + i * 0.18,
                ease: [0.22, 0.61, 0.36, 1],
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="font-mono text-[10px] uppercase tracking-widest font-semibold"
                  style={{ color }}
                >
                  Phase {p.phase}
                </span>
                <span className="text-sm font-medium text-[var(--on-surface)] truncate">
                  {p.name}
                </span>
                <span className="font-mono text-[10px] text-[var(--on-surface-variant-mid)]">
                  {p.start_year}–{p.end_year}
                </span>
                {isCurrent && (
                  <motion.span
                    className="ml-2 font-mono text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-sm"
                    style={{
                      background: '#4ecdc4',
                      color: '#0b1220',
                    }}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={
                      inView
                        ? {
                            opacity: [1, 0.55, 1],
                            scale: [1, 1.05, 1],
                          }
                        : { opacity: 0, scale: 0.7 }
                    }
                    transition={{
                      opacity: { duration: 2.4, repeat: Infinity, repeatType: 'loop' },
                      scale: { duration: 2.4, repeat: Infinity, repeatType: 'loop' },
                    }}
                  >
                    We are here
                  </motion.span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Phase detail cards: capability + Lupine role + reference programs */}
      <div className="grid lg:grid-cols-2 gap-4 mt-12">
        {phases.map((p, i) => (
          <PhaseCard key={p.id} phase={p} inView={inView} index={i} />
        ))}
      </div>
    </div>
  )
}

function PhaseCard({
  phase,
  inView,
  index,
}: {
  phase: ArcPhase
  inView: boolean
  index: number
}) {
  const color = PHASE_COLORS[phase.phase] ?? '#94a3b8'
  const isCurrent = phase.phase === 1
  return (
    <motion.div
      className="rounded-md border bg-[var(--surface-container)] p-5 flex flex-col gap-3"
      style={{
        borderColor: isCurrent ? color : 'var(--outline-variant)',
        boxShadow: isCurrent ? `0 0 0 1px ${color}33` : 'none',
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, delay: 0.4 + index * 0.12 }}
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-3">
          <span
            className="font-mono text-[11px] uppercase tracking-widest font-bold"
            style={{ color }}
          >
            Phase {phase.phase}
          </span>
          <h3 className="text-xl text-[var(--on-surface)] font-semibold leading-tight">
            {phase.name}
          </h3>
        </div>
        <span className="font-mono text-[10px] text-[var(--on-surface-variant-mid)]">
          {phase.start_year}–{phase.end_year}
        </span>
      </div>

      <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">
        {phase.capability}
      </p>

      <div className="border-t border-[var(--outline-variant)]/60 pt-3">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--secondary)] mb-1">
          Lupine&apos;s role
        </div>
        <p className="text-sm text-[var(--on-surface)] leading-relaxed">
          {phase.lupine_role}
        </p>
      </div>

      <div className="border-t border-[var(--outline-variant)]/60 pt-3">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant-mid)] mb-1">
          Reference programs / artifacts
        </div>
        <p className="text-xs text-[var(--on-surface-variant)] font-mono leading-relaxed">
          {phase.reference_programs}
        </p>
      </div>
    </motion.div>
  )
}
